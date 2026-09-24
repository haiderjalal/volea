"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, Clock, LockKeyhole } from "lucide-react";
import { bookCourt, type BookingState } from "@/app/clubs/actions";
import { Badge, Button, Card } from "@/components/ui";
import { cn, formatClock } from "@/lib/format";
import type { CalendarBooking, Court } from "@/lib/types";

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function dayLabel(date: string): { day: string; date: string } {
  const value = new Date(`${date}T12:00:00Z`);
  return {
    day: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(value),
    date: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(value),
  };
}

function minuteValue(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeValue(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function localParts(iso: string, timeZone: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function CourtCalendar({
  courts,
  bookings,
  opensAt,
  closesAt,
  timeZone,
  startDate,
  clubSlug,
  signedIn,
  ownerView = false,
}: {
  courts: Court[];
  bookings: CalendarBooking[];
  opensAt: string;
  closesAt: string;
  timeZone: string;
  startDate: string;
  clubSlug: string;
  signedIn: boolean;
  ownerView?: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState<BookingState, FormData>(bookCourt, {});
  const [selectedDay, setSelectedDay] = useState(startDate);
  const [selected, setSelected] = useState<{ court: Court; time: string } | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startDate, index)), [startDate]);
  const slots = useMemo(() => {
    const output: string[] = [];
    const close = minuteValue(closesAt);
    for (let minute = minuteValue(opensAt); minute + 90 <= close; minute += 90) {
      output.push(timeValue(minute));
    }
    return output;
  }, [closesAt, opensAt]);
  const now = localParts(new Date().toISOString(), timeZone);

  useEffect(() => {
    if (state.booked) {
      router.refresh();
    }
  }, [router, state.booked]);

  function bookingAt(courtId: string, time: string): CalendarBooking | undefined {
    const start = minuteValue(time);
    const end = start + 90;
    return bookings.find((booking) => {
      if (booking.court_id !== courtId || booking.status === "cancelled") return false;
      const localStart = localParts(booking.starts_at, timeZone);
      const localEnd = localParts(booking.ends_at, timeZone);
      return localStart.date === selectedDay && localStart.minutes < end && localEnd.minutes > start;
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Booking date">
        {days.map((day) => {
          const label = dayLabel(day);
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={selectedDay === day}
              onClick={() => {
                setSelectedDay(day);
                setSelected(null);
              }}
              className={cn(
                "rounded-sm border px-1 py-2 text-center transition-colors",
                selectedDay === day
                  ? "border-gold-500/50 bg-gold-500/10 text-gold-200"
                  : "border-ink-700 text-bone-500 hover:border-ink-600",
              )}
            >
              <span className="block text-[0.58rem] font-medium tracking-wider uppercase">{label.day}</span>
              <span className="mt-0.5 block text-[0.65rem] sm:text-xs">{label.date}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {courts.map((court) => (
          <Card key={court.id} className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-bone-200">{court.name}</h3>
              {court.indoor ? <Badge>Indoor</Badge> : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {slots.map((time) => {
                const booking = bookingAt(court.id, time);
                const past = selectedDay < now.date || (selectedDay === now.date && minuteValue(time) <= now.minutes + 5);
                const chosen = selected?.court.id === court.id && selected.time === time;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={Boolean(booking) || past || ownerView}
                    onClick={() => setSelected({ court, time })}
                    className={cn(
                      "min-h-14 rounded-sm border px-2 py-2 text-left transition-colors",
                      booking
                        ? "cursor-not-allowed border-ink-700/70 bg-ink-900/70"
                        : past || ownerView
                          ? "cursor-default border-ink-700/40 opacity-45"
                          : chosen
                            ? "border-gold-500 bg-gold-500/10"
                            : "border-ink-700 hover:border-court-400/60 hover:bg-court-500/5",
                    )}
                  >
                    <span className="flex items-center gap-1 text-xs font-medium text-bone-300">
                      <Clock size={11} aria-hidden="true" />
                      {formatClock(`${time}:00`)}
                    </span>
                    <span className="mt-1 block truncate text-[0.62rem] text-bone-600">
                      {booking
                        ? ownerView && booking.player_names?.length
                          ? booking.player_names.join(", ")
                          : booking.origin === "queue"
                            ? "Matchmade game"
                            : "Booked"
                        : past
                          ? "Unavailable"
                          : ownerView
                            ? "Available"
                            : "Book 90 min"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {!ownerView && selected ? (
        signedIn ? (
          <Card className="sticky bottom-24 z-20 border-gold-500/30 p-4 md:bottom-4">
            <form action={action} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="court_id" value={selected.court.id} />
              <input type="hidden" name="play_date" value={selectedDay} />
              <input type="hidden" name="start_time" value={selected.time} />
              <input type="hidden" name="club_slug" value={clubSlug} />
              <CalendarCheck size={18} className="text-court-300" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm text-bone-300">
                {selected.court.name} · {dayLabel(selectedDay).date} · {formatClock(`${selected.time}:00`)}
              </p>
              <Button type="submit" size="sm">Confirm booking</Button>
            </form>
            {state.error ? <p className="mt-3 text-xs text-flag-red">{state.error}</p> : null}
          </Card>
        ) : (
          <Card className="flex items-center gap-3 border-gold-500/30 p-4">
            <LockKeyhole size={17} className="text-gold-300" aria-hidden="true" />
            <p className="flex-1 text-sm text-bone-400">Sign in to reserve this slot.</p>
            <Link href={`/login?next=${encodeURIComponent(`/clubs/${clubSlug}`)}`}>
              <Button size="sm">Sign in</Button>
            </Link>
          </Card>
        )
      ) : null}
    </div>
  );
}
