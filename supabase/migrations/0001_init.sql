-- Volea — padel matchmaking platform
-- Everything lives in `public` — this project hosts Volea and nothing else.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
create type public.play_mode      as enum ('doubles','singles');
create type public.court_side     as enum ('left','right','both');
create type public.queue_status   as enum ('waiting','matched','expired','cancelled');
create type public.match_status   as enum ('scheduled','completed','cancelled');
create type public.match_origin   as enum ('queue','direct','tournament');
create type public.club_status    as enum ('pending','active','inactive');
create type public.tourney_status as enum ('draft','open','locked','live','completed','cancelled');

-- Padel's 1.0-7.0 ladder, derived from a hidden Elo so it self-corrects on results.
-- 800 -> 1.0 (first session), 1000 -> 2.0 (new player default), 2300+ -> 7.0 (pro).
create or replace function public.rating_to_level(p_rating int)
returns numeric language sql immutable
set search_path = pg_catalog, pg_temp as $fn$
  select round(least(7.0, greatest(1.0, 1.0 + (p_rating - 800)::numeric / 250)) * 2) / 2;
$fn$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text not null,
  full_name      text not null,
  avatar_url     text,
  bio            text,
  city           text,
  country        text,
  lat            double precision,
  lng            double precision,
  preferred_side public.court_side not null default 'both',
  rating         int not null default 1000 check (rating between 100 and 4000),
  level          numeric(2,1) generated always as (public.rating_to_level(rating)) stored,
  matches_played int not null default 0,
  matches_won    int not null default 0,
  is_club_owner  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);
create unique index profiles_username_key on public.profiles (lower(username));
create index profiles_city_rating_idx on public.profiles (lower(city), rating desc);

-- ---------------------------------------------------------------- clubs & courts
create table public.clubs (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               uuid references auth.users(id) on delete set null,
  name                   text not null,
  slug                   text not null unique,
  description            text,
  address                text,
  city                   text not null,
  country                text,
  lat                    double precision not null,
  lng                    double precision not null,
  timezone               text not null default 'UTC',
  phone                  text,
  email                  text,
  image_url              text,
  price_per_hour_cents   int not null default 0 check (price_per_hour_cents >= 0),
  currency               text not null default 'USD',
  opens_at               time not null default '07:00',
  closes_at              time not null default '23:00',
  amenities              text[] not null default '{}',
  status                 public.club_status not null default 'active',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index clubs_city_idx  on public.clubs (lower(city)) where status = 'active';
create index clubs_owner_idx on public.clubs (owner_id);

create table public.courts (
  id        uuid primary key default gen_random_uuid(),
  club_id   uuid not null references public.clubs(id) on delete cascade,
  name      text not null,
  indoor    boolean not null default false,
  surface   text not null default 'artificial grass',
  is_active boolean not null default true,
  unique (club_id, name)
);
create index courts_club_idx on public.courts (club_id) where is_active;

-- ---------------------------------------------------------------- matches
create table public.matches (
  id                uuid primary key default gen_random_uuid(),
  club_id           uuid not null references public.clubs(id) on delete restrict,
  court_id          uuid not null references public.courts(id) on delete restrict,
  mode              public.play_mode not null default 'doubles',
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  status            public.match_status not null default 'scheduled',
  origin            public.match_origin not null default 'queue',
  price_total_cents int not null default 0,
  currency          text not null default 'USD',
  winning_team      smallint check (winning_team in (1,2)),
  score             jsonb,
  reported_by       uuid references public.profiles(id) on delete set null,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  constraint match_window check (ends_at > starts_at)
);
-- One booking per court per slot. Guarantees we never double-book an owner's court.
create unique index matches_court_slot_key on public.matches (court_id, starts_at)
  where status <> 'cancelled';
create index matches_club_time_idx on public.matches (club_id, starts_at desc);

create table public.match_players (
  match_id      uuid not null references public.matches(id) on delete cascade,
  player_id     uuid not null references public.profiles(id) on delete cascade,
  team          smallint not null check (team in (1,2)),
  rating_before int,
  rating_after  int,
  primary key (match_id, player_id)
);
create index match_players_player_idx on public.match_players (player_id);

-- ---------------------------------------------------------------- matchmaking queue
create table public.queue_entries (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.profiles(id) on delete cascade,
  play_date    date not null,
  window_start time not null,
  window_end   time not null,
  mode         public.play_mode not null default 'doubles',
  club_id      uuid references public.clubs(id) on delete cascade, -- null = surprise me
  city         text,
  min_level    numeric(2,1) not null default 1.0,
  max_level    numeric(2,1) not null default 7.0,
  status       public.queue_status not null default 'waiting',
  match_id     uuid references public.matches(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint queue_window check (window_end > window_start),
  constraint queue_level_range check (max_level >= min_level)
);
-- A player can only sit in one live queue per day.
create unique index queue_one_waiting_per_day on public.queue_entries (player_id, play_date)
  where status = 'waiting';
create index queue_search_idx on public.queue_entries (play_date, mode, status);

-- ---------------------------------------------------------------- tournaments
create table public.tournaments (
  id                     uuid primary key default gen_random_uuid(),
  club_id                uuid not null references public.clubs(id) on delete cascade,
  name                   text not null,
  slug                   text not null unique,
  description            text,
  mode                   public.play_mode not null default 'doubles',
  size                   int not null check (size in (4,8,16,32)),
  entry_fee_cents        int not null default 0,
  currency               text not null default 'USD',
  starts_at              timestamptz not null,
  registration_closes_at timestamptz not null,
  status                 public.tourney_status not null default 'open',
  champion_team_id       uuid,
  created_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now()
);
create index tournaments_status_idx on public.tournaments (status, starts_at);

create table public.tournament_teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null,
  player1_id    uuid not null references public.profiles(id) on delete cascade,
  player2_id    uuid references public.profiles(id) on delete cascade,
  seed          int,
  created_at    timestamptz not null default now(),
  unique (tournament_id, player1_id)
);
alter table public.tournaments
  add constraint tournaments_champion_fk
  foreign key (champion_team_id) references public.tournament_teams(id) on delete set null;

create table public.tournament_matches (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.tournaments(id) on delete cascade,
  round          int not null,
  slot           int not null,
  team1_id       uuid references public.tournament_teams(id) on delete set null,
  team2_id       uuid references public.tournament_teams(id) on delete set null,
  winner_team_id uuid references public.tournament_teams(id) on delete set null,
  match_id       uuid references public.matches(id) on delete set null,
  score          jsonb,
  scheduled_at   timestamptz,
  unique (tournament_id, round, slot)
);
create index tmatches_tournament_idx on public.tournament_matches (tournament_id, round, slot);

comment on table public.queue_entries is 'A player advertising a time window. The matcher pairs overlapping windows into a match and assigns a free court.';
comment on table public.matches is 'A booked court slot with its players. price_total_cents is a snapshot of club pricing so later repricing never rewrites revenue history.';
comment on column public.profiles.level is 'Derived 1.0-7.0 padel level. Never write directly — it follows `rating`.';
