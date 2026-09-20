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
