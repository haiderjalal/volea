import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MatchCard, MATCH_SELECT } from "@/features/matches/MatchCard";
import {
  MatchChat,
  type ChatMessage,
  type ChatParticipant,
} from "@/features/matches/MatchChat";
import { Card, SectionHeading } from "@/components/ui";
import type { Match } from "@/lib/types";

export const metadata = {
  title: "Match",
  robots: { index: false, follow: false },
};

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: match }, { data: auth }] = await Promise.all([
    supabase.from("matches").select(MATCH_SELECT).eq("id", id).maybeSingle<Match>(),
    supabase.auth.getUser(),
  ]);

  if (!match) notFound();

  const meId = auth?.user?.id ?? null;
  const players = match.players ?? [];
  const amPlaying = Boolean(meId && players.some((p) => p.player_id === meId));

  // RLS would refuse this anyway; skipping the query for non-players just
  // avoids a pointless round trip.
  let messages: ChatMessage[] = [];
  if (amPlaying) {
    const { data } = await supabase
      .from("match_messages")
      .select("*")
      .eq("match_id", id)
      .order("created_at")
      .limit(200)
      .returns<ChatMessage[]>();
    messages = data ?? [];
  }

  const participants: ChatParticipant[] = players.map((p) => ({
    id: p.player_id,
    full_name: p.profile?.full_name ?? "Player",
    avatar_url: p.profile?.avatar_url ?? null,
    team: p.team,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs text-bone-600">
        <Link href="/matches" className="hover:text-bone-300">
          Matches
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-bone-400">{match.club?.name ?? "Match"}</span>
      </nav>

      <MatchCard match={match} />

      {amPlaying && meId ? (
        <section>
          <SectionHeading title="Group chat" />
          <MatchChat
            matchId={match.id}
            meId={meId}
            participants={participants}
            initial={messages}
          />
        </section>
      ) : (
        <Card className="flex items-center gap-3 p-5">
          <MessageSquare size={17} className="shrink-0 text-bone-600" aria-hidden="true" />
          <p className="text-sm text-bone-500">
            The group chat is private to the four players in this match.
          </p>
        </Card>
      )}

      {match.status === "scheduled" ? (
        <p className="text-center text-xs text-bone-600">
          The host club records the result once the match has been played.
        </p>
      ) : null}
    </div>
  );
}
