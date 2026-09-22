-- Volea — patch 0004: club-recorded results + match chat.
-- Paste into the Supabase SQL Editor and run once.
-- NOT atomic: if it errors, read the error before re-running.

-- Two changes:
--   1. Only the host club records a result. Players no longer score themselves.
--   2. Matched players get a private thread for the match.

-- ------------------------------------------------------------ result reporting
-- Previously any player in the match could report it, which means a player could
-- declare their own win. The club that hosted the match is the only neutral
-- party, so reporting moves to them.
--
-- Also refuses a result before the match has actually finished. That guard lives
-- here rather than only in the UI, because a hidden button is not a rule.
create or replace function public.report_match_result(
  p_match_id     uuid,
  p_winning_team smallint,
  p_score        jsonb default null
)
returns void language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  v_k    constant int := 32;
  v_me   uuid := auth.uid();
  v_r1   numeric;
  v_r2   numeric;
  v_exp1 numeric;
  v_d1   int;
  v_d2   int;
begin
  if not exists (
    select 1
    from public.matches m
    join public.clubs c on c.id = m.club_id
    where m.id = p_match_id and c.owner_id = v_me
  ) then
    raise exception 'Only the host club can record this result.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.matches where id = p_match_id and status = 'scheduled') then
    raise exception 'This match has already been settled.' using errcode = '22023';
  end if;

  if exists (select 1 from public.matches where id = p_match_id and ends_at > now()) then
    raise exception 'This match has not been played yet.' using errcode = '22023';
  end if;

  if p_winning_team not in (1, 2) then
    raise exception 'Winning team must be 1 or 2.' using errcode = '22023';
  end if;

  select avg(pr.rating) filter (where mp.team = 1),
         avg(pr.rating) filter (where mp.team = 2)
    into v_r1, v_r2
  from public.match_players mp
  join public.profiles pr on pr.id = mp.player_id
  where mp.match_id = p_match_id;

  v_exp1 := 1.0 / (1.0 + power(10.0, (v_r2 - v_r1) / 400.0));
  v_d1   := round(v_k * ((case when p_winning_team = 1 then 1 else 0 end) - v_exp1));
  v_d2   := -v_d1;

  update public.profiles p
     set rating         = greatest(100, least(4000, p.rating + case when mp.team = 1 then v_d1 else v_d2 end)),
         matches_played = p.matches_played + 1,
         matches_won    = p.matches_won + case when mp.team = p_winning_team then 1 else 0 end,
         updated_at     = now()
  from public.match_players mp
  where mp.match_id = p_match_id and mp.player_id = p.id;

  update public.match_players mp
     set rating_after = pr.rating
  from public.profiles pr
  where mp.match_id = p_match_id and pr.id = mp.player_id;

  update public.matches
     set status = 'completed', winning_team = p_winning_team, score = p_score,
         reported_by = v_me, completed_at = now()
   where id = p_match_id;
end $fn$;

-- ------------------------------------------------------------------- match chat
create table if not exists public.match_messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint message_length check (char_length(btrim(body)) between 1 and 1000)
);
create index if not exists match_messages_thread_idx
  on public.match_messages (match_id, created_at);

comment on table public.match_messages is
  'Private thread per match. Membership is the only key — there is no other way in.';

-- Membership test, extracted so both policies read plainly and Postgres can
-- cache the plan. security definer because the caller may not see match_players
-- rows for a match they are checking.
create or replace function public.is_match_player(p_match_id uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from public.match_players
    where match_id = p_match_id and player_id = auth.uid()
  );
$fn$;

alter table public.match_messages enable row level security;

drop policy if exists match_messages_read on public.match_messages;
create policy match_messages_read on public.match_messages for select
  using (public.is_match_player(match_id));

drop policy if exists match_messages_insert on public.match_messages;
create policy match_messages_insert on public.match_messages for insert
  with check (sender_id = auth.uid() and public.is_match_player(match_id));

-- No update or delete policy: a thread is a record of what was said. Editing
-- history in a chat four people rely on to agree a time is worse than a typo.

grant select, insert on public.match_messages to authenticated;
grant execute on function public.is_match_player(uuid) to authenticated;

do $realtime$
begin
  alter publication supabase_realtime add table public.match_messages;
exception when others then
  raise notice 'realtime: match_messages not added (%)', sqlerrm;
end $realtime$;

-- ============================ claim the demo clubs ============================
-- Results can now ONLY be recorded by a club owner, and the seeded clubs have
-- owner_id = NULL, so nobody could score a match played at one.
-- Put your email in and run this to claim them all for your account.

update public.clubs
   set owner_id = (select id from auth.users where email = 'YOUR_EMAIL_HERE')
 where owner_id is null;

update public.profiles set is_club_owner = true
 where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');

select (select count(*) from public.clubs where owner_id is null) as unclaimed_clubs;
