import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Avatar, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Courts" },
  { href: "/play", label: "Play" },
  { href: "/matches", label: "Matches" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export async function TopBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Pick<Profile, "full_name" | "avatar_url" | "is_club_owner"> | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, is_club_owner")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-court-700/70 bg-court-950/85 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label="Volea home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-chalk-300 transition-colors hover:bg-court-850 hover:text-chalk-100"
            >
              {l.label}
            </Link>
          ))}
          {profile?.is_club_owner ? (
            <Link
              href="/club"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-teal-400 transition-colors hover:bg-court-850"
            >
              My club
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {user && profile ? (
            <Link href="/me" aria-label="Your profile">
              <Avatar name={profile.full_name} src={profile.avatar_url} size={34} />
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
