-- Volea demo seed — fictional clubs, real geography (Dubai).
-- Safe to re-run: every insert is keyed on slug / (club, court name).

insert into volea.clubs
  (name, slug, description, address, city, country, lat, lng, timezone,
   phone, price_per_hour_cents, currency, opens_at, closes_at, amenities, status)
values
  ('Dune Padel Club', 'dune-padel-club',
   'Four panoramic courts under shade sails, ten minutes from Downtown.',
   'Al Quoz Industrial 3', 'Dubai', 'AE', 25.1417, 55.2336, 'Asia/Dubai',
   '+971 4 000 0001', 15000, 'AED', '06:00', '23:59',
   array['Floodlights','Pro shop','Showers','Cafe'], 'active'),

  ('Marina Glass Courts', 'marina-glass-courts',
   'Rooftop panoramic courts overlooking the Marina skyline.',
   'Dubai Marina Walk', 'Dubai', 'AE', 25.0805, 55.1403, 'Asia/Dubai',
   '+971 4 000 0002', 22000, 'AED', '07:00', '23:59',
   array['Rooftop','Floodlights','Coaching','Parking'], 'active'),

  ('Jumeirah Padel House', 'jumeirah-padel-house',
   'Two indoor climate-controlled courts. Play through August.',
   'Jumeirah Beach Road', 'Dubai', 'AE', 25.2048, 55.2417, 'Asia/Dubai',
   '+971 4 000 0003', 19000, 'AED', '06:00', '23:00',
   array['Indoor','Air conditioned','Showers'], 'active'),

  ('Desert Smash Arena', 'desert-smash-arena',
   'Six courts, the largest padel venue in Al Barsha.',
   'Al Barsha South', 'Dubai', 'AE', 25.1107, 55.1997, 'Asia/Dubai',
   '+971 4 000 0004', 13000, 'AED', '06:00', '23:59',
   array['Floodlights','Racket hire','Cafe','Parking'], 'active'),

  ('Creek Padel Yard', 'creek-padel-yard',
   'Waterfront courts with a view of the Creek Tower.',
   'Dubai Creek Harbour', 'Dubai', 'AE', 25.1972, 55.3467, 'Asia/Dubai',
   '+971 4 000 0005', 17500, 'AED', '07:00', '23:30',
   array['Waterfront','Floodlights','Cafe'], 'active'),

  ('Silicon Oasis Padel', 'silicon-oasis-padel',
   'Community club with the friendliest Tuesday-night mixers in town.',
   'Dubai Silicon Oasis', 'Dubai', 'AE', 25.1213, 55.3773, 'Asia/Dubai',
   '+971 4 000 0006', 11000, 'AED', '06:00', '23:59',
   array['Floodlights','Racket hire','Mixers'], 'active')
on conflict (slug) do nothing;

-- Courts per club
insert into volea.courts (club_id, name, indoor, surface)
select c.id, v.name, v.indoor, 'artificial grass'
from volea.clubs c
join (values
  ('dune-padel-club',      'Court 1', false), ('dune-padel-club',      'Court 2', false),
  ('dune-padel-club',      'Court 3', false), ('dune-padel-club',      'Court 4', false),
  ('marina-glass-courts',  'Sky 1',   false), ('marina-glass-courts',  'Sky 2',   false),
  ('jumeirah-padel-house', 'Indoor A', true), ('jumeirah-padel-house', 'Indoor B', true),
  ('desert-smash-arena',   'Court 1', false), ('desert-smash-arena',   'Court 2', false),
  ('desert-smash-arena',   'Court 3', false), ('desert-smash-arena',   'Court 4', false),
  ('desert-smash-arena',   'Court 5', false), ('desert-smash-arena',   'Court 6', false),
  ('creek-padel-yard',     'Marina 1', false), ('creek-padel-yard',    'Marina 2', false),
  ('creek-padel-yard',     'Marina 3', false),
  ('silicon-oasis-padel',  'Court A', false), ('silicon-oasis-padel',  'Court B', false),
  ('silicon-oasis-padel',  'Court C', false)
) as v(slug, name, indoor) on v.slug = c.slug
on conflict (club_id, name) do nothing;
