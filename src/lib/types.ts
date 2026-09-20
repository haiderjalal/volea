export type PlayMode = "doubles" | "singles";
export type CourtSide = "left" | "right" | "both";
export type QueueStatus = "waiting" | "matched" | "expired" | "cancelled";
export type MatchStatus = "scheduled" | "completed" | "cancelled";
export type MatchOrigin = "queue" | "direct" | "tournament";
export type ClubStatus = "pending" | "active" | "inactive";
export type TourneyStatus =
  | "draft"
  | "open"
  | "locked"
  | "live"
  | "completed"
  | "cancelled";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  preferred_side: CourtSide;
  rating: number;
  /** Derived 1.0–7.0 padel level. Read-only — it follows `rating`. */
  level: number;
  matches_played: number;
  matches_won: number;
  is_club_owner: boolean;
  created_at: string;
}

export interface Club {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string;
  country: string | null;
  lat: number;
  lng: number;
  timezone: string;
  phone: string | null;
  email: string | null;
  image_url: string | null;
  price_per_hour_cents: number;
  currency: string;
  opens_at: string;
  closes_at: string;
  amenities: string[];
  status: ClubStatus;
}

export interface Court {
  id: string;
  club_id: string;
  name: string;
  indoor: boolean;
  surface: string;
  is_active: boolean;
}

export interface QueueEntry {
  id: string;
  player_id: string;
  play_date: string;
  window_start: string;
  window_end: string;
  mode: PlayMode;
  club_id: string | null;
  city: string | null;
  min_level: number;
  max_level: number;
  status: QueueStatus;
  match_id: string | null;
  created_at: string;
}

export interface MatchPlayer {
  match_id: string;
  player_id: string;
  team: 1 | 2;
  rating_before: number | null;
  rating_after: number | null;
  profile?: Profile;
}

export interface Match {
  id: string;
  club_id: string;
  court_id: string;
  mode: PlayMode;
  starts_at: string;
  ends_at: string;
  status: MatchStatus;
  origin: MatchOrigin;
  price_total_cents: number;
  currency: string;
  winning_team: 1 | 2 | null;
  /** Sets as `[[6,4],[6,3]]`. */
  score: number[][] | null;
  completed_at: string | null;
  club?: Pick<Club, "id" | "name" | "slug" | "city" | "timezone">;
  court?: Pick<Court, "id" | "name" | "indoor">;
  players?: MatchPlayer[];
}

export interface Tournament {
  id: string;
  club_id: string;
  name: string;
  slug: string;
  description: string | null;
  mode: PlayMode;
  size: number;
  entry_fee_cents: number;
  currency: string;
  starts_at: string;
  registration_closes_at: string;
  status: TourneyStatus;
  champion_team_id: string | null;
  club?: Pick<Club, "id" | "name" | "slug" | "city">;
  teams?: TournamentTeam[];
}

export interface TournamentTeam {
  id: string;
  tournament_id: string;
  name: string;
  player1_id: string;
  player2_id: string | null;
  seed: number | null;
  player1?: Pick<Profile, "id" | "username" | "full_name" | "avatar_url" | "level">;
  player2?: Pick<Profile, "id" | "username" | "full_name" | "avatar_url" | "level"> | null;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  slot: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_team_id: string | null;
  score: number[][] | null;
  scheduled_at: string | null;
}

export interface LeaderboardRow {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  rating: number;
  level: number;
  matches_played: number;
  matches_won: number;
  win_pct: number;
  city_rank: number;
  global_rank: number;
}

/** Shape returned by `volea.club_stats(club_id, days)`. */
export interface ClubStats {
  currency: string;
  courts: number;
  matches: number;
  completed: number;
  revenue_cents: number;
  hours_played: number;
  unique_players: number;
  repeat_players: number;
  occupancy_pct: number;
  peak_hours: { hour: number; matches: number }[];
  daily: { day: string; matches: number; revenue_cents: number }[];
  top_players: {
    username: string;
    full_name: string;
    avatar_url: string | null;
    level: number;
    plays: number;
    last_seen: string;
  }[];
}
