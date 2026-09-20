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
  { href: "/leaderboard", label: "Rankings" },
];

export async function TopBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Pick<Profile, "full_name" | "avatar_url" | "is_club_owner" | "level"> | null =
    null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, is_club_owner, level")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-6xl items-center gap-8 px-5 sm:px-6">
        <Link href="/" aria-label="Volea home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="relative text-[0.7rem] font-medium tracking-[0.16em] text-bone-400 uppercase transition-colors duration-300 hover:text-gold-200"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 md:ml-0">
          {profile?.is_club_owner ? (
            <Link
              href="/club"
              className="hidden text-[0.7rem] font-medium tracking-[0.16em] text-court-300 uppercase transition-colors duration-300 hover:text-court-400 md:block"
            >
              My club
            </Link>
          ) : null}

          {user && profile ? (
            <Link
              href="/me"
              aria-label="Your profile"
              className="flex items-center gap-2.5 transition-opacity duration-300 hover:opacity-80"
            >
              <span className="hidden text-right sm:block">
                <span className="block font-display text-sm leading-tight text-gold-300 tabular-nums">
                  {profile.level.toFixed(1)}
                </span>
                <span className="block text-[0.55rem] tracking-[0.16em] text-bone-600 uppercase">
                  Level
                </span>
              </span>
              <Avatar name={profile.full_name} src={profile.avatar_url} size={36} />
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
