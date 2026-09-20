import { Card } from "@/components/ui";
import { formatClock, formatMoney } from "@/lib/format";
import type { ClubStats } from "@/lib/types";

/**
 * When the courts are actually busy. The whole point for an owner is to see the
 * dead hours, so every hour the club is open is drawn — not just the booked ones.
 */
export function PeakHours({
  stats,
  opensAt,
  closesAt,
}: {
  stats: ClubStats;
  opensAt: string;
  closesAt: string;
}) {
  const open = Number(opensAt.slice(0, 2));
  const close = Number(closesAt.slice(0, 2));
  const byHour = new Map(stats.peak_hours.map((h) => [h.hour, h.matches]));
  const hours = Array.from({ length: Math.max(1, close - open) }, (_, i) => open + i);
  const peak = Math.max(1, ...stats.peak_hours.map((h) => h.matches));

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-chalk-200">When your courts are busy</h3>
      <p className="mt-0.5 text-xs text-chalk-600">
        Matches per hour over the period. Flat bars are the hours worth discounting.
      </p>

      <div className="mt-4 flex h-32 items-end gap-[3px]" role="img"
           aria-label={`Busiest hour: ${
             stats.peak_hours.length
               ? formatClock(`${String(stats.peak_hours.reduce((a, b) => (b.matches > a.matches ? b : a)).hour).padStart(2, "0")}:00`)
               : "no data yet"
           }`}>
        {hours.map((h) => {
          const count = byHour.get(h) ?? 0;
          return (
            <div key={h} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t ${count > 0 ? "bg-teal-500" : "bg-court-800"}`}
                style={{ height: `${Math.max(3, (count / peak) * 100)}%` }}
                title={`${formatClock(`${String(h).padStart(2, "0")}:00`)} — ${count} match${count === 1 ? "" : "es"}`}
              />
              {h % 3 === 0 ? (
                <span className="text-[9px] text-chalk-600 tabular-nums">{h}</span>
              ) : (
                <span className="text-[9px] text-transparent">.</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function RevenueTrend({ stats }: { stats: ClubStats }) {
  const days = stats.daily;
  if (days.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-chalk-200">Revenue</h3>
        <p className="mt-3 text-sm text-chalk-600">
          No bookings in this period yet. Revenue is counted from the court price at the
          moment a match is booked.
        </p>
      </Card>
    );
  }

  const max = Math.max(...days.map((d) => d.revenue_cents), 1);
  const points = days
    .map((d, i) => {
      const x = days.length === 1 ? 0 : (i / (days.length - 1)) * 100;
      const y = 100 - (d.revenue_cents / max) * 92;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-chalk-200">Revenue by day</h3>
      <p className="mt-0.5 text-xs text-chalk-600">
        Peak day {formatMoney(max, stats.currency)}
      </p>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="mt-3 h-24 w-full"
        role="img"
        aria-label={`Daily revenue across ${days.length} days, peaking at ${formatMoney(max, stats.currency)}`}
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-ball-500)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </Card>
  );
}
