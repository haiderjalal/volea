import Link from "next/link";
import { Building2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPlayerMatches } from "@/features/matches/queries";
import { PlayerProfile } from "@/features/profile/PlayerProfile";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { signOut } from "@/app/auth/actions";
import { Button, Card } from "@/components/ui";
import type { LeaderboardRow, Profile } from "@/lib/types";

export const metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default async function MePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, matches] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    getPlayerMatches(supabase, user.id),
  ]);

  if (!profile) {
    return (
      <Card className="p-6">
        <p className="text-sm text-bone-400">
          We could not load your profile. Try signing out and back in.
        </p>
        <form action={signOut} className="mt-4">
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </Card>
    );
  }

  const { data: rank } = await supabase
    .from("leaderboard")
    .select("city_rank")
    .eq("id", user.id)
    .maybeSingle<Pick<LeaderboardRow, "city_rank">>();

  return (
    <div className="mx-auto max-w-2xl">
      <PlayerProfile profile={profile} matches={matches} cityRank={rank?.city_rank}>
        <div className="flex flex-wrap gap-2">
          <ProfileForm profile={profile} />
          <Link href={profile.is_club_owner ? "/club" : "/club/new"}>
            <Button variant="outline" size="sm">
              <Building2 size={14} aria-hidden="true" />
              {profile.is_club_owner ? "My club" : "Register a club"}
            </Button>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut size={14} aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </div>
      </PlayerProfile>
    </div>
  );
}
