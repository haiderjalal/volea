import type { ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Hourly price squeezed into a map pin: 6000 -> "6k", 8500 -> "8.5k".
 * PKR rates run to five digits, which will not fit where a two-digit
 * euro price did.
 */
export function priceBadge(cents: number): string {
  if (cents <= 0) return "•";
  const units = cents / 100;
  if (units < 1000) return String(Math.round(units));
  const thousands = units / 1000;
  return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}k`;
}

/** `"20:30:00"` → `"8:30 PM"`. */
export function formatClock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatSlot(startsAt: string, timeZone = "Asia/Karachi"): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(startsAt));
}

export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

/** The plain-English half of padel's 1.0–7.0 ladder. */
export function levelLabel(level: number): string {
  if (level <= 2.0) return "Starter";
  if (level <= 3.0) return "Improver";
  if (level <= 4.0) return "Intermediate";
  if (level <= 5.0) return "Advanced";
  if (level <= 6.0) return "Competitor";
  return "Pro";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Great-circle distance in km. Used to sort clubs by "near me". */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function scoreLine(score: number[][] | null): string {
  if (!score?.length) return "—";
  return score.map(([a, b]) => `${a}-${b}`).join("  ");
}
