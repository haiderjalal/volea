-- Volea — patch for a database seeded before 2026-09-20 (Dubai demo data).
-- Paste into the Supabase SQL Editor and run once.
--
-- Composition: migrations/0003_relocate_seed_to_pakistan.sql + seed.sql
-- NOT atomic - if it errors, read the error before re-running.
-- A fresh database should use supabase/setup.sql instead.

-- ============================ relocate ============================

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
--
-- Catches everything, not just duplicate_object: realtime is an enhancement,
-- and a publication that cannot be altered (ownership, a renamed publication)
-- must never abort the migration carrying the data changes.
do $realtime$
begin
  alter publication supabase_realtime add table public.queue_entries;
exception when others then
  raise notice 'realtime: queue_entries not added (%)', sqlerrm;
end $realtime$;

do $realtime$
begin
  alter publication supabase_realtime add table public.matches;
exception when others then
  raise notice 'realtime: matches not added (%)', sqlerrm;
end $realtime$;

-- ============================ new demo clubs ============================

-- Volea demo seed — fictional clubs, real geography (Islamabad / Rawalpindi).
-- Club names are invented so nothing impersonates a real business; the sectors,
-- schemes and coordinates are genuine.
-- Safe to re-run: every insert is keyed on slug / (club, court name).

insert into public.clubs
  (name, slug, description, address, city, country, lat, lng, timezone,
   phone, price_per_hour_cents, currency, opens_at, closes_at, amenities, status)
values
  -- ---------------------------------------------------------------- Islamabad
  ('Margalla Padel Club', 'margalla-padel-club',
   'Four panoramic courts under the Margalla hills, floodlit until midnight.',
   'F-7 Markaz', 'Islamabad', 'PK', 33.7180, 73.0560, 'Asia/Karachi',
   '+92 51 000 0001', 850000, 'PKR', '06:00', '23:59',
   array['Floodlights','Pro shop','Showers','Cafe'], 'active'),

  ('Kohsar Padel Courts', 'kohsar-padel-courts',
   'Two courts tucked behind Super Market. The 7am crowd is serious.',
   'F-6/3 Super Market', 'Islamabad', 'PK', 33.7294, 73.0797, 'Asia/Karachi',
   '+92 51 000 0002', 900000, 'PKR', '06:00', '23:00',
   array['Floodlights','Coaching','Parking'], 'active'),

  ('Blue Area Padel Deck', 'blue-area-padel-deck',
   'Rooftop courts over Jinnah Avenue. Indoor, so the monsoon is somebody else''s problem.',
   'Jinnah Avenue, Blue Area', 'Islamabad', 'PK', 33.7100, 73.0600, 'Asia/Karachi',
   '+92 51 000 0003', 1000000, 'PKR', '07:00', '23:59',
   array['Indoor','Rooftop','Air conditioned','Cafe'], 'active'),

  ('E-11 Padel Park', 'e11-padel-park',
   'Community club on the western edge. Cheapest peak-hour rate in the sector.',
   'E-11/2', 'Islamabad', 'PK', 33.7010, 72.9720, 'Asia/Karachi',
   '+92 51 000 0004', 650000, 'PKR', '06:00', '23:59',
   array['Floodlights','Racket hire','Parking'], 'active'),

  ('G-13 Padel Courts', 'g13-padel-courts',
   'Three courts beside the service road. Friendly Sunday mixers.',
   'G-13/1', 'Islamabad', 'PK', 33.6470, 72.9310, 'Asia/Karachi',
   '+92 51 000 0005', 600000, 'PKR', '06:00', '23:30',
   array['Floodlights','Racket hire','Mixers'], 'active'),

  -- --------------------------------------------------------------- Rawalpindi
  ('Bahria Padel Arena', 'bahria-padel-arena',
   'Six courts, the largest padel venue in the twin cities.',
   'Bahria Town Phase 4', 'Rawalpindi', 'PK', 33.5227, 73.0960, 'Asia/Karachi',
   '+92 51 000 0006', 780000, 'PKR', '06:00', '23:59',
   array['Floodlights','Pro shop','Showers','Cafe','Parking'], 'active'),

  ('Chaklala Padel Club', 'chaklala-padel-club',
   'Two floodlit courts off the Scheme 3 main road.',
   'Chaklala Scheme 3', 'Rawalpindi', 'PK', 33.5860, 73.0980, 'Asia/Karachi',
   '+92 51 000 0007', 620000, 'PKR', '06:00', '23:30',
   array['Floodlights','Racket hire'], 'active'),

  ('Askari Padel Courts', 'askari-padel-courts',
   'Three courts off Airport Road, ten minutes from the motorway.',
   'Askari 14', 'Rawalpindi', 'PK', 33.5730, 73.1250, 'Asia/Karachi',
   '+92 51 000 0008', 720000, 'PKR', '06:00', '23:59',
   array['Floodlights','Coaching','Cafe','Parking'], 'active')
on conflict (slug) do nothing;

-- Courts per club
insert into public.courts (club_id, name, indoor, surface)
select c.id, v.name, v.indoor, 'artificial grass'
from public.clubs c
join (values
  ('margalla-padel-club',  'Court 1', false), ('margalla-padel-club',  'Court 2', false),
  ('margalla-padel-club',  'Court 3', false), ('margalla-padel-club',  'Court 4', false),
  ('kohsar-padel-courts',  'Court 1', false), ('kohsar-padel-courts',  'Court 2', false),
  ('blue-area-padel-deck', 'Deck A',   true), ('blue-area-padel-deck', 'Deck B',   true),
  ('e11-padel-park',       'Court 1', false), ('e11-padel-park',       'Court 2', false),
  ('e11-padel-park',       'Court 3', false),
  ('g13-padel-courts',     'Court 1', false), ('g13-padel-courts',     'Court 2', false),
  ('g13-padel-courts',     'Court 3', false),
  ('bahria-padel-arena',   'Court 1', false), ('bahria-padel-arena',   'Court 2', false),
  ('bahria-padel-arena',   'Court 3', false), ('bahria-padel-arena',   'Court 4', false),
  ('bahria-padel-arena',   'Court 5', false), ('bahria-padel-arena',   'Court 6', false),
  ('chaklala-padel-club',  'Court 1', false), ('chaklala-padel-club',  'Court 2', false),
  ('askari-padel-courts',  'Court 1', false), ('askari-padel-courts',  'Court 2', false),
  ('askari-padel-courts',  'Court 3', false)
) as v(slug, name, indoor) on v.slug = c.slug
on conflict (club_id, name) do nothing;

-- Report what actually landed. A seed that quietly inserts nothing looks
-- identical to a seed that was never run, and the app just says "no clubs".
select
  (select count(*) from public.clubs)  as clubs,
  (select count(*) from public.courts) as courts;
