import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn, initials, levelLabel } from "@/lib/format";

/* ------------------------------------------------------------------ Button */
const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-ball-500 text-court-950 hover:bg-ball-400",
        teal: "bg-teal-500 text-court-950 hover:bg-teal-400",
        outline:
          "border border-court-600 text-chalk-100 hover:bg-court-800 hover:border-court-600",
        ghost: "text-chalk-300 hover:bg-court-850 hover:text-chalk-100",
        danger: "bg-flag-red/15 text-flag-red hover:bg-flag-red/25",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof button>) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}

export const buttonClass = button;

/* -------------------------------------------------------------------- Card */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border border-court-700/70 bg-court-850/70 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------- Badge */
const badge = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-court-800 text-chalk-300",
        ball: "bg-ball-500/15 text-ball-400",
        teal: "bg-teal-500/15 text-teal-400",
        red: "bg-flag-red/15 text-flag-red",
        amber: "bg-flag-amber/15 text-flag-amber",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

/* ------------------------------------------------------------------- Input */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-court-700 bg-court-900 px-3.5 text-sm text-chalk-100",
        "placeholder:text-chalk-600 focus:border-teal-500 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-court-700 bg-court-900 px-3 text-sm text-chalk-100",
        "focus:border-teal-500 focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-chalk-300">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-flag-red">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-chalk-600">{hint}</span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ Avatar */
export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-600/25 font-semibold text-teal-400 ring-1 ring-court-700",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars are arbitrary remote URLs
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/* ------------------------------------------------------------- Level chip */
export function LevelChip({ level, className }: { level: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-court-800 px-2.5 py-0.5 text-xs",
        className,
      )}
      title={`Padel level ${level.toFixed(1)} — ${levelLabel(level)}`}
    >
      <span className="font-bold text-ball-400">{level.toFixed(1)}</span>
      <span className="text-chalk-500">{levelLabel(level)}</span>
    </span>
  );
}

/* -------------------------------------------------------------------- Misc */
export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium tracking-wide text-chalk-600 uppercase">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-chalk-100 tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-chalk-500">{sub}</p> : null}
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-chalk-600">{icon}</div> : null}
      <h3 className="text-base font-semibold text-chalk-100">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-chalk-500">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-chalk-500 uppercase">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-court-800", className)} />;
}
