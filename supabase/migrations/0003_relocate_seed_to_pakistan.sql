-- Relocate the demo estate from Dubai to Islamabad / Rawalpindi and make PKR
-- the default currency for new rows.
--
-- Safe on a fresh database: the delete simply matches nothing.
-- Run supabase/seed.sql afterwards to insert the new clubs.

alter table public.clubs       alter column currency set default 'PKR';
alter table public.matches     alter column currency set default 'PKR';
alter table public.tournaments alter column currency set default 'PKR';

-- Retire the original demo venues. Their courts cascade away with them.
--
-- matches.club_id is ON DELETE RESTRICT, so this deliberately fails if anyone
-- has actually booked one of these courts: demo data is disposable, a real
-- booking is not, and it should never disappear quietly.
delete from public.clubs
where slug in (
  'dune-padel-club',
  'marina-glass-courts',
  'jumeirah-padel-house',
  'desert-smash-arena',
  'creek-padel-yard',
  'silicon-oasis-padel'
);

-- Re-assert the realtime publication. It is the one piece of setup that cannot
-- be checked over the REST API, so make it self-healing rather than assumed.
do $realtime$
begin
  alter publication supabase_realtime add table public.queue_entries;
exception when duplicate_object then null;
end $realtime$;

do $realtime$
begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null;
end $realtime$;
