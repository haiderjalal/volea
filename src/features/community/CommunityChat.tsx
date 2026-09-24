"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, SendHorizonal, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Avatar, Badge, Card } from "@/components/ui";
import { cn } from "@/lib/format";
import type { CommunityMessage, Profile } from "@/lib/types";

type Person = Pick<Profile, "id" | "username" | "full_name" | "avatar_url" | "city">;
type PresencePayload = Person & { online_at: string };

const MAX_LENGTH = 1000;

function timeLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat("en-GB", {
    ...(sameDay ? {} : { day: "numeric", month: "short" }),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function CommunityChat({
  me,
  initial,
}: {
  me: Person;
  initial: CommunityMessage[];
}) {
  const [messages, setMessages] = useState(initial);
  const [online, setOnline] = useState<Person[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const people = useMemo(() => {
    const map = new Map<string, Person>();
    for (const message of messages) {
      if (message.sender) map.set(message.sender.id, message.sender);
    }
    for (const person of online) map.set(person.id, person);
    map.set(me.id, me);
    return map;
  }, [me, messages, online]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("community:lobby", {
      config: { private: true, presence: { key: me.id } },
    });
    channelRef.current = channel;

    async function hydrate(row: CommunityMessage) {
      const known = people.get(row.sender_id);
      if (known) {
        setMessages((prev) =>
          prev.some((m) => m.id === row.id) ? prev : [...prev, { ...row, sender: known }],
        );
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, city")
        .eq("id", row.sender_id)
        .maybeSingle<Person>();
      setMessages((prev) =>
        prev.some((m) => m.id === row.id)
          ? prev
          : [...prev, { ...row, sender: data ?? undefined }],
      );
    }

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePayload>();
        const unique = new Map<string, Person>();
        for (const entries of Object.values(state)) {
          for (const entry of entries) {
            unique.set(entry.id, {
              id: entry.id,
              username: entry.username,
              full_name: entry.full_name,
              avatar_url: entry.avatar_url,
              city: entry.city,
            });
          }
        }
        setOnline([...unique.values()].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      })
      .on(
        "broadcast",
        { event: "message" },
        (payload) => {
          const row = payload.payload as CommunityMessage;
          setMessages((prev) => (prev.some((message) => message.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        (payload) => void hydrate(payload.new as CommunityMessage),
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ ...me, online_at: new Date().toISOString() });
        }
      });

    return () => {
      channelRef.current = null;
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
    // `people` intentionally stays out: reconnecting the channel for every new
    // message would be slower and would make presence flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    const optimisticId = `pending-${crypto.randomUUID()}`;
    const optimistic: CommunityMessage = {
      id: optimisticId,
      sender_id: me.id,
      body,
      created_at: new Date().toISOString(),
      sender: me,
    };
    setDraft("");
    setSending(true);
    setError(null);
    setMessages((prev) => [...prev, optimistic]);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("community_messages")
      .insert({ sender_id: me.id, body })
      .select("*, sender:profiles(id, username, full_name, avatar_url, city)")
      .single<CommunityMessage>();

    setSending(false);
    if (insertError || !data) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(body);
      setError("Your message did not send. Try again.");
      return;
    }

    // Broadcast is the fast path for everyone currently connected. Postgres
    // Changes remains subscribed as a durable fallback and dedupes by id.
    void channelRef.current?.send({ type: "broadcast", event: "message", payload: data });

    setMessages((prev) => {
      const withoutEcho = prev.filter((m) => m.id !== optimisticId && m.id !== data.id);
      return [...withoutEcho, data];
    });
  }

  return (
    <div className="grid min-h-[34rem] gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <Card className="flex min-h-[34rem] flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-ink-700/70 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-bone-500">
            <Circle size={8} className="fill-court-400 text-court-400" aria-hidden="true" />
            Live community
          </div>
          <Badge tone="court">{online.length} online</Badge>
        </div>

        <div className="h-[55vh] min-h-[24rem] flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Users size={30} className="text-gold-600/70" aria-hidden="true" />
              <p className="mt-4 font-display text-2xl font-light text-bone-100">
                Start the conversation
              </p>
              <p className="mt-2 max-w-sm text-sm text-bone-600">
                Find a fourth, share a last-minute court, or welcome somebody new.
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const mine = message.sender_id === me.id;
              const sender = message.sender ?? people.get(message.sender_id);
              const grouped = messages[index - 1]?.sender_id === message.sender_id;
              const pending = message.id.startsWith("pending-");

              return (
                <div
                  key={message.id}
                  className={cn("flex items-end gap-2.5", mine && "flex-row-reverse", pending && "opacity-60")}
                >
                  <span className={cn("w-8 shrink-0", grouped && "opacity-0")}>
                    {!grouped ? (
                      <Avatar name={sender?.full_name ?? "Player"} src={sender?.avatar_url} size={32} />
                    ) : null}
                  </span>
                  <div className={cn("max-w-[78%]", mine && "text-right")}>
                    {!grouped ? (
                      <p className="mb-1.5 px-1 text-[0.6rem] tracking-[0.14em] text-bone-600 uppercase">
                        {mine ? "You" : sender?.full_name ?? "Player"}
                        {sender?.city ? ` · ${sender.city}` : ""}
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
                      {message.body}
                    </p>
                    <time className="mt-1 block px-1 text-[0.6rem] text-bone-600 tabular-nums">
                      {pending ? "Sending…" : timeLabel(message.created_at)}
                    </time>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="border-t border-ink-700/70 p-3">
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
              placeholder="Message everyone"
              aria-label="Message the community"
              maxLength={MAX_LENGTH}
              className="h-11 flex-1 rounded-sm bg-transparent px-3 text-sm text-bone-100 placeholder:text-bone-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Send message"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 transition-opacity disabled:opacity-30"
            >
              <SendHorizonal size={16} aria-hidden="true" />
            </button>
          </div>
          {error ? <p className="px-3 pt-2 text-xs text-flag-red">{error}</p> : null}
        </form>
      </Card>

      <aside className="space-y-3">
        <Card className="p-4">
          <p className="flex items-center gap-2 text-[0.65rem] font-medium tracking-[0.16em] text-bone-500 uppercase">
            <Users size={14} aria-hidden="true" />
            Online now
          </p>
          <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">
            {online.map((person) => (
              <li key={person.id} className="flex items-center gap-2.5">
                <span className="relative">
                  <Avatar name={person.full_name} src={person.avatar_url} size={30} />
                  <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-ink-850 bg-court-400" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-bone-300">
                    {person.id === me.id ? "You" : person.full_name}
                  </span>
                  {person.city ? <span className="block truncate text-[0.65rem] text-bone-600">{person.city}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <p className="flex gap-2 px-1 text-xs leading-relaxed text-bone-600">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Messages disappear automatically after seven days.
        </p>
      </aside>
    </div>
  );
}
