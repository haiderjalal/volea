import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPlayerMatches } from "@/features/matches/queries";
import { PlayerProfile } from "@/features/profile/PlayerProfile";
import { levelLabel } from "@/lib/format";
import type { LeaderboardRow, Profile } from "@/lib/types";

async function loadProfile(username: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .maybeSingle<Profile>();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) return { title: "Player not found" };

  return {
    title: `${profile.full_name} (@${profile.username})`,
    description: `${profile.full_name} plays padel at level ${profile.level.toFixed(1)} — ${levelLabel(
      profile.level,
    )}${profile.city ? ` in ${profile.city}` : ""}. ${profile.matches_won} of ${
      profile.matches_played
    } matches won on Volea.`,
    alternates: { canonical: `/players/${profile.username}` },
    openGraph: {
      title: `${profile.full_name} on Volea`,
      description: `Level ${profile.level.toFixed(1)} padel player${
        profile.city ? ` in ${profile.city}` : ""
      }.`,
    },
  };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) notFound();

  const supabase = await createClient();
  const [matches, { data: rank }] = await Promise.all([
    getPlayerMatches(supabase, profile.id),
    supabase
      .from("leaderboard")
      .select("city_rank")
      .eq("id", profile.id)
      .maybeSingle<Pick<LeaderboardRow, "city_rank">>(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PlayerProfile profile={profile} matches={matches} cityRank={rank?.city_rank} />
    </div>
  );
}
