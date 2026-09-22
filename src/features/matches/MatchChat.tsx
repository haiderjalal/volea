"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Card } from "@/components/ui";
import { cn } from "@/lib/format";

export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  full_name: string;
  avatar_url: string | null;
  team: 1 | 2;
}

const MAX_LENGTH = 1000;

function clock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function MatchChat({
  matchId,
  meId,
  participants,
  initial,
}: {
  matchId: string;
  meId: string;
  participants: ChatParticipant[];
  initial: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const byId = new Map(participants.map((p) => [p.id, p]));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-chat:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          // We append our own sends immediately, so drop the echo.
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("match_messages")
      .insert({ match_id: matchId, sender_id: meId, body })
      .select()
      .single();

    if (insertError) {
      console.error("send message failed", { message: insertError.message });
      setError("That did not send. Try again.");
      setSending(false);
      return;
    }

    setDraft("");
    setSending(false);
    // Append now rather than waiting for the realtime round trip; the echo is
    // deduped above. A chat that lags behind your own typing feels broken.
    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data as ChatMessage],
    );
  }

  return (
    <Card className="flex max-h-[32rem] flex-col p-0">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-bone-600">
            No messages yet. Agree a warm-up time, or who is bringing the balls.
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === meId;
            const who = byId.get(m.sender_id);
            const prev = messages[i - 1];
            const grouped = prev?.sender_id === m.sender_id;

            return (
              <div
                key={m.id}
                className={cn("flex items-end gap-2.5", mine && "flex-row-reverse")}
              >
                <span className={cn("w-8 shrink-0", grouped && "opacity-0")}>
                  {!grouped ? (
                    <Avatar
                      name={who?.full_name ?? "Player"}
                      src={who?.avatar_url}
                      size={32}
                    />
                  ) : null}
                </span>

                <div className={cn("max-w-[75%]", mine && "text-right")}>
                  {!grouped ? (
                    <p className="mb-1.5 px-1 text-[0.6rem] tracking-[0.14em] text-bone-600 uppercase">
                      {mine ? "You" : (who?.full_name ?? "Player")}
                      {who ? ` · Team ${who.team}` : ""}
                    </p>
                  ) : null}
                  <p
                    className={cn(
                      "inline-block rounded-sm px-3.5 py-2.5 text-left text-sm leading-relaxed wrap-anywhere",
                      mine
                        ? "bg-gold-500/15 text-bone-100 ring-1 ring-gold-500/25 ring-inset"
                        : "bg-ink-800 text-bone-200",
                    )}
                  >
                    {m.body}
                  </p>
                  <time
                    dateTime={m.created_at}
                    className="mt-1 block px-1 text-[0.6rem] text-bone-600 tabular-nums"
                  >
                    {clock(m.created_at)}
                  </time>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-ink-700/70 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Message your group"
          aria-label="Message your group"
          maxLength={MAX_LENGTH}
          className="h-11 flex-1 rounded-sm bg-transparent px-3 text-sm text-bone-100 placeholder:text-bone-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Send message"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 transition-opacity duration-300 disabled:opacity-30"
        >
          <SendHorizonal size={16} aria-hidden="true" />
        </button>
      </form>

      {error ? (
        <p role="alert" className="px-4 pb-3 text-xs text-flag-red">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
