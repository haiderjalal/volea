-- Community, collision-safe court booking, and owner onboarding.
--
-- The public calendar is backed by `matches`, so matchmaking and direct
-- bookings share one source of truth. A trigger serialises writes per court and
-- rejects every overlap, including different start times.

-- ------------------------------------------------------------- account type
-- This flag is presentation state only. Ownership authorization continues to
-- come from clubs.owner_id, never editable auth user metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $fn$
begin
  insert into public.profiles (id, username, full_name, city, country, is_club_owner)
  values (
    new.id,
    coalesce(
      nullif(lower(new.raw_user_meta_data->>'username'), ''),
      'p' || substr(replace(new.id::text, '-', ''), 1, 12)
    ),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'Player'),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(new.raw_user_meta_data->>'country', ''),
    coalesce(new.raw_user_meta_data->>'account_type', '') = 'club_owner'
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  return new;
end $fn$;

-- ----------------------------------------------------------- direct booking
alter table public.matches
  add column if not exists booked_by uuid references public.profiles(id) on delete set null;

create index if not exists matches_court_window_idx
  on public.matches (court_id, starts_at, ends_at)
  where status <> 'cancelled';
create index if not exists matches_booked_by_idx
  on public.matches (booked_by, starts_at desc)
  where booked_by is not null;

-- Client date limits are convenience; these guards are the actual rule.
create or replace function public.validate_queue_date()
returns trigger language plpgsql set search_path = public, pg_temp as $fn$
begin
  if new.play_date < current_date then
    raise exception 'Pick today or a future date.' using errcode = '22023';
  end if;
  if new.play_date > current_date + 14 then
    raise exception 'Matchmaking opens 14 days ahead.' using errcode = '22023';
  end if;
  return new;
end $fn$;

drop trigger if exists queue_validate_date on public.queue_entries;
create trigger queue_validate_date
  before insert or update of play_date on public.queue_entries
  for each row execute function public.validate_queue_date();

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.queue_entries'::regclass
      and conname = 'queue_level_bounds'
  ) then
    alter table public.queue_entries add constraint queue_level_bounds
      check (min_level between 1.0 and 7.0 and max_level between 1.0 and 7.0);
  end if;
end $constraints$;

create or replace function public.prevent_overlapping_match()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $fn$
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  -- Serialise only this court. This closes the race between two bookings that
  -- both saw the slot as free before either insert committed.
  perform pg_advisory_xact_lock(hashtext(new.court_id::text));

  if exists (
    select 1
    from public.matches m
    where m.court_id = new.court_id
      and m.id <> new.id
      and m.status <> 'cancelled'
      and m.starts_at < new.ends_at
      and m.ends_at > new.starts_at
  ) then
    raise exception 'That court is already booked during this time.'
      using errcode = '23P01';
  end if;

  return new;
end $fn$;

drop trigger if exists matches_prevent_overlap on public.matches;
create trigger matches_prevent_overlap
  before insert or update of court_id, starts_at, ends_at, status on public.matches
  for each row execute function public.prevent_overlapping_match();

create or replace function public.book_court(
  p_court_id  uuid,
  p_play_date date,
  p_start_time time
)
returns public.matches
language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  v_me uuid := auth.uid();
  v_club public.clubs;
  v_match public.matches;
  v_starts timestamptz;
  v_ends timestamptz;
  v_duration constant interval := interval '90 minutes';
begin
  if v_me is null then
    raise exception 'Sign in to book a court.' using errcode = '28000';
  end if;

  select cl.* into v_club
  from public.courts c
  join public.clubs cl on cl.id = c.club_id
  where c.id = p_court_id and c.is_active and cl.status = 'active';

  if v_club.id is null then
    raise exception 'That court is not available.' using errcode = '22023';
  end if;
  if p_play_date > (now() at time zone v_club.timezone)::date + 60 then
    raise exception 'Bookings open 60 days ahead.' using errcode = '22023';
  end if;
  if p_start_time < v_club.opens_at
     or p_start_time + v_duration > v_club.closes_at then
    raise exception 'Pick a 90-minute slot inside the club opening hours.' using errcode = '22023';
  end if;

  v_starts := (p_play_date + p_start_time) at time zone v_club.timezone;
  v_ends := v_starts + v_duration;
  if v_starts <= now() + interval '5 minutes' then
    raise exception 'Pick a future time.' using errcode = '22023';
  end if;

  insert into public.matches
    (club_id, court_id, mode, starts_at, ends_at, origin,
     price_total_cents, currency, booked_by)
  values
    (v_club.id, p_court_id, 'doubles', v_starts, v_ends, 'direct',
     round(v_club.price_per_hour_cents * 1.5), v_club.currency, v_me)
  returning * into v_match;

  -- The organiser owns the booking and sees it in their match history. Direct
  -- bookings do not affect ratings until a complete roster exists.
  insert into public.match_players (match_id, player_id, team, rating_before)
  select v_match.id, p.id, 1, p.rating
  from public.profiles p where p.id = v_me;

  return v_match;
exception
  when exclusion_violation or unique_violation then
    raise exception 'That court was just booked by someone else.' using errcode = '23P01';
end $fn$;

create or replace function public.cancel_direct_booking(p_match_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $fn$
begin
  update public.matches m
     set status = 'cancelled'
   where m.id = p_match_id
     and m.origin = 'direct'
     and m.status = 'scheduled'
     and m.starts_at > now()
     and (
       m.booked_by = auth.uid()
       or exists (
         select 1 from public.clubs c
         where c.id = m.club_id and c.owner_id = auth.uid()
       )
     );

  if not found then
    raise exception 'This booking cannot be cancelled.' using errcode = '42501';
  end if;
end $fn$;

revoke all on function public.prevent_overlapping_match() from public, anon, authenticated;
revoke all on function public.book_court(uuid, date, time) from public, anon;
revoke all on function public.cancel_direct_booking(uuid) from public, anon;
grant execute on function public.book_court(uuid, date, time) to authenticated;
grant execute on function public.cancel_direct_booking(uuid) to authenticated;

-- ---------------------------------------------------------- community chat
create table if not exists public.community_messages (
  id         uuid primary key default gen_random_uuid(),
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint community_message_length
    check (char_length(btrim(body)) between 1 and 1000)
);

create index if not exists community_messages_recent_idx
  on public.community_messages (created_at desc);

alter table public.community_messages enable row level security;

drop policy if exists community_messages_read on public.community_messages;
create policy community_messages_read on public.community_messages for select
  to authenticated
  using (created_at >= now() - interval '7 days');

drop policy if exists community_messages_insert on public.community_messages;
create policy community_messages_insert on public.community_messages for insert
  to authenticated
  with check (sender_id = (select auth.uid()) and created_at >= now() - interval '1 minute');

grant select, insert on public.community_messages to authenticated;

-- Physical retention runs hourly when pg_cron is available. The insert trigger
-- is a second line of defence and also keeps local/dev databases tidy.
create or replace function public.prune_community_messages()
returns integer language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  v_deleted integer;
begin
  delete from public.community_messages
  where created_at < now() - interval '7 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end $fn$;

create or replace function public.prune_community_messages_on_write()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $fn$
begin
  perform public.prune_community_messages();
  return null;
end $fn$;

drop trigger if exists community_messages_prune on public.community_messages;
create trigger community_messages_prune
  after insert on public.community_messages
  for each statement execute function public.prune_community_messages_on_write();

revoke all on function public.prune_community_messages() from public, anon, authenticated;
revoke all on function public.prune_community_messages_on_write() from public, anon, authenticated;

do $cron_setup$
begin
  begin
    create extension if not exists pg_cron with schema pg_catalog;
  exception when others then
    raise notice 'cron: extension unavailable (%); write-trigger retention remains active', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job where jobname = 'volea-prune-community-messages';
    perform cron.schedule(
      'volea-prune-community-messages',
      '17 * * * *',
      $command$select public.prune_community_messages();$command$
    );
  end if;
exception when others then
  raise notice 'cron: schedule unavailable (%); write-trigger retention remains active', sqlerrm;
end $cron_setup$;

do $realtime$
begin
  alter publication supabase_realtime add table public.community_messages;
exception when others then
  raise notice 'realtime: community_messages not added (%)', sqlerrm;
end $realtime$;

-- Presence and the low-latency Broadcast path share one private channel. Only
-- a valid authenticated JWT may announce, send, or observe it. Realtime does
-- not persist these payloads in this table; community_messages is the durable
-- seven-day record.
drop policy if exists "volea community presence read" on realtime.messages;
drop policy if exists "volea community realtime read" on realtime.messages;
create policy "volea community realtime read"
on realtime.messages for select to authenticated
using (
  (select realtime.topic()) = 'community:lobby'
  and realtime.messages.extension in ('presence', 'broadcast')
);

drop policy if exists "volea community presence write" on realtime.messages;
drop policy if exists "volea community realtime write" on realtime.messages;
create policy "volea community realtime write"
on realtime.messages for insert to authenticated
with check (
  (select realtime.topic()) = 'community:lobby'
  and realtime.messages.extension in ('presence', 'broadcast')
);

-- Security hardening for existing definer helpers. Public is implicit in
-- Postgres, so grants to authenticated alone are not enough without this revoke.
revoke all on function public.is_match_player(uuid) from public, anon;
grant execute on function public.is_match_player(uuid) to authenticated;

comment on table public.community_messages is
  'Authenticated community lobby. Messages are visible for and deleted after seven days.';
comment on column public.matches.booked_by is
  'Organizer for a direct court reservation. Null for matchmade and tournament matches.';

-- ------------------------------------------------------- result concurrency
-- Lock the match before checking status so two owner tabs can never apply Elo
-- twice. A complete roster is required; a one-person direct court reservation
-- is a booking, not a rated match.
create or replace function public.report_match_result(
  p_match_id     uuid,
  p_winning_team smallint,
  p_score        jsonb default null
)
returns void language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  v_k    constant int := 32;
  v_me   uuid := auth.uid();
  v_match public.matches;
  v_r1   numeric;
  v_r2   numeric;
  v_exp1 numeric;
  v_d1   int;
  v_d2   int;
  v_t1   int;
  v_t2   int;
  v_each int;
begin
  select * into v_match
  from public.matches where id = p_match_id for update;

  if v_match.id is null then
    raise exception 'Match not found.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.clubs c
    where c.id = v_match.club_id and c.owner_id = v_me
  ) then
    raise exception 'Only the host club can record this result.' using errcode = '42501';
  end if;
  if v_match.status <> 'scheduled' then
    raise exception 'This match has already been settled.' using errcode = '22023';
  end if;
  if v_match.ends_at > now() then
    raise exception 'This match has not been played yet.' using errcode = '22023';
  end if;
  if p_winning_team not in (1, 2) then
    raise exception 'Winning team must be 1 or 2.' using errcode = '22023';
  end if;

  select count(*) filter (where team = 1), count(*) filter (where team = 2)
    into v_t1, v_t2
  from public.match_players where match_id = p_match_id;
  v_each := case when v_match.mode = 'singles' then 1 else 2 end;
  if v_t1 <> v_each or v_t2 <> v_each then
    raise exception 'A rated % match needs % player(s) on each team.', v_match.mode, v_each
      using errcode = '22023';
  end if;

  select avg(pr.rating) filter (where mp.team = 1),
         avg(pr.rating) filter (where mp.team = 2)
    into v_r1, v_r2
  from public.match_players mp
  join public.profiles pr on pr.id = mp.player_id
  where mp.match_id = p_match_id;

  v_exp1 := 1.0 / (1.0 + power(10.0, (v_r2 - v_r1) / 400.0));
  v_d1 := round(v_k * ((case when p_winning_team = 1 then 1 else 0 end) - v_exp1));
  v_d2 := -v_d1;

  update public.profiles p
     set rating = greatest(100, least(4000,
           p.rating + case when mp.team = 1 then v_d1 else v_d2 end)),
         matches_played = p.matches_played + 1,
         matches_won = p.matches_won + case when mp.team = p_winning_team then 1 else 0 end,
         updated_at = now()
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

revoke all on function public.report_match_result(uuid, smallint, jsonb) from public, anon;
grant execute on function public.report_match_result(uuid, smallint, jsonb) to authenticated;
