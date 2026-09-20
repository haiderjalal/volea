"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Radar, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { leaveQueue } from "@/app/play/actions";
import { Badge, Button, Card } from "@/components/ui";
import { formatClock, formatDay } from "@/lib/format";
import type { QueueEntry } from "@/lib/types";

export function WaitingRoom({
  entry,
  clubName,
  othersWaiting,
}: {
  entry: QueueEntry;
  clubName: string | null;
  othersWaiting: number;
}) {
  const router = useRouter();
  const [leaving, startLeaving] = useTransition();
  const [elapsed, setElapsed] = useState(0);

  // The moment the matcher claims this row, the server data is stale — refresh.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`queue:${entry.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "queue_entries",
          filter: `id=eq.${entry.id}`,
        },
        (payload) => {
          if ((payload.new as QueueEntry).status === "matched") router.refresh();
        },
      )
      .subscribe();

    // Realtime can drop on flaky mobile connections; a slow poll is the safety net.
    const poll = setInterval(() => router.refresh(), 20_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [entry.id, router]);

  useEffect(() => {
    const started = new Date(entry.created_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [entry.created_at]);

  const mins = Math.floor(elapsed / 60);
  const needed = entry.mode === "doubles" ? 3 : 1;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-court-500/25" />
          <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-court-500/15 text-court-400">
            <Radar size={28} aria-hidden="true" />
          </span>
        </span>

        <h2 className="mt-6 font-display text-3xl font-light text-bone-100">Looking for your game</h2>
        <p className="mt-1.5 max-w-xs text-sm text-bone-500">
          We need {needed} more player{needed === 1 ? "" : "s"} free between{" "}
          {formatClock(entry.window_start)} and {formatClock(entry.window_end)}.
        </p>

        <p aria-live="polite" className="mt-4 text-xs text-bone-600 tabular-nums">
          Searching for {mins > 0 ? `${mins}m ` : ""}
          {elapsed % 60}s
        </p>

        <dl className="mt-6 grid w-full max-w-xs grid-cols-2 gap-2 text-left">
          <div className="rounded-xl bg-ink-900 p-3">
            <dt className="text-xs text-bone-600">Day</dt>
            <dd className="mt-0.5 text-sm font-medium text-bone-200">
              {formatDay(entry.play_date)}
            </dd>
          </div>
          <div className="rounded-xl bg-ink-900 p-3">
            <dt className="text-xs text-bone-600">Court</dt>
            <dd className="mt-0.5 text-sm font-medium text-bone-200">
              {clubName ?? "Any near you"}
            </dd>
          </div>
        </dl>

        {othersWaiting > 1 ? (
          <Badge tone="court" className="mt-4">
            <Users size={12} aria-hidden="true" />
            {othersWaiting - 1} other player{othersWaiting - 1 === 1 ? "" : "s"} searching
            today
          </Badge>
        ) : (
          <p className="mt-4 max-w-xs text-xs text-bone-600">
            You are first in tonight&apos;s queue. We will hold your spot and match you the
            moment someone else joins.
          </p>
        )}

        <Button
          variant="ghost"
          className="mt-6"
          disabled={leaving}
          onClick={() => startLeaving(() => void leaveQueue(entry.id))}
        >
          <X size={15} aria-hidden="true" />
          {leaving ? "Leaving…" : "Leave the queue"}
        </Button>
      </div>
    </Card>
  );
}
