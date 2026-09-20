import Link from "next/link";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Badge, Card, EmptyState, LevelChip } from "@/components/ui";
import { cn } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/types";

export const metadata = {
  title: "Leaderboard",
  description: "Regional padel rankings. Every result you report moves your level.",
  alternates: { canonical: "/leaderboard" },
};

const MEDALS = ["text-ball-400", "text-chalk-300", "text-flag-amber"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;
  const supabase = await createClient();

  const [{ data: cityRows }, { data: rows }] = await Promise.all([
    supabase.from("clubs").select("city").eq("status", "active"),
    (city
      ? supabase.from("leaderboard").select("*").ilike("city", city).order("city_rank")
      : supabase.from("leaderboard").select("*").order("global_rank")
    )
      .limit(100)
      .returns<LeaderboardRow[]>(),
  ]);

  const cities = [...new Set((cityRows ?? []).map((r) => r.city as string))].sort();
  const players = rows ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-chalk-100">
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-chalk-500">
          Ranked by rating, which moves every time a result is reported.
        </p>
      </header>

      <nav aria-label="Filter by city" className="flex flex-wrap gap-2">
        <Link
          href="/leaderboard"
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            !city
              ? "bg-ball-500 text-court-950"
              : "border border-court-700 text-chalk-400 hover:border-court-600",
          )}
        >
          Global
        </Link>
        {cities.map((c) => (
          <Link
            key={c}
            href={`/leaderboard?city=${encodeURIComponent(c)}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              city?.toLowerCase() === c.toLowerCase()
                ? "bg-ball-500 text-court-950"
                : "border border-court-700 text-chalk-400 hover:border-court-600",
            )}
          >
            {c}
          </Link>
        ))}
      </nav>

      {players.length === 0 ? (
        <EmptyState
          icon={<Trophy size={28} />}
          title="No ranked players yet"
          body="Rankings appear once players start reporting match results."
        />
      ) : (
        <Card className="divide-y divide-court-700/60 p-0">
          <ol>
            {players.map((p, i) => {
              const rank = city ? p.city_rank : p.global_rank;
              return (
                <li key={p.id}>
                  <Link
                    href={`/players/${p.username}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-court-800/50"
                  >
                    <span
                      className={cn(
                        "w-7 shrink-0 text-center text-sm font-bold tabular-nums",
                        i < 3 ? MEDALS[i] : "text-chalk-600",
                      )}
                    >
                      {rank}
                    </span>
                    <Avatar name={p.full_name} src={p.avatar_url} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-chalk-100">
                        {p.full_name}
                      </span>
                      <span className="block truncate text-xs text-chalk-600">
                        @{p.username}
                        {p.city ? ` · ${p.city}` : ""}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-xs text-chalk-600">
                        {p.matches_won}/{p.matches_played} won
                      </span>
                      <span className="block text-xs text-chalk-500">{p.win_pct}%</span>
                    </span>
                    <LevelChip level={p.level} className="shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <p className="text-center text-xs text-chalk-600">
        Levels follow the 1.0–7.0 padel ladder.{" "}
        <Badge tone="ball">2.0</Badge> is where everyone starts.
      </p>
    </div>
  );
}
