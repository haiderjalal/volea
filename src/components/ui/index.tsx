import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn, initials, levelLabel } from "@/lib/format";

/* ------------------------------------------------------------------ Button */
/* Uppercase with wide tracking: the house style of every luxury maison, and it
   keeps short labels from looking flimsy against so much whitespace. */
const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium uppercase tracking-[0.12em] transition-all duration-300 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "sheen bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 shadow-[0_10px_30px_-18px_rgb(192_159_99/0.9)] hover:from-gold-200 hover:to-gold-400",
        court:
          "bg-court-500 text-bone-100 hover:bg-court-400 hover:text-ink-950",
        outline:
          "border border-ink-600 text-bone-200 hover:border-gold-500/60 hover:text-gold-200",
        ghost: "text-bone-400 hover:text-gold-200",
        danger: "border border-flag-red/30 text-flag-red hover:bg-flag-red/10",
      },
      size: {
        sm: "h-9 px-4 text-[0.68rem]",
        md: "h-11 px-6 text-[0.72rem]",
        lg: "h-13 px-8 text-[0.78rem]",
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
        "rounded-card border border-ink-700/80 bg-ink-850/60 backdrop-blur-sm",
        // hairline highlight along the top edge, as if light catches the lip
        "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.035)]",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------- Badge */
const badge = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.14em]",
  {
    variants: {
      tone: {
        neutral: "bg-ink-800 text-bone-400",
        gold: "bg-gold-500/12 text-gold-300 ring-1 ring-gold-500/25 ring-inset",
        court: "bg-court-500/15 text-court-300 ring-1 ring-court-400/25 ring-inset",
        red: "bg-flag-red/12 text-flag-red",
        amber: "bg-flag-amber/12 text-flag-amber",
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
const fieldBase =
  "h-12 w-full rounded-sm border border-ink-700 bg-ink-900/70 px-4 text-sm text-bone-100 transition-colors duration-300 focus:border-gold-500/70 focus:outline-none focus:ring-0";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(fieldBase, "placeholder:text-bone-600", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "px-3.5", className)} {...props} />;
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
    <label className="block space-y-2">
      <span className="text-[0.68rem] font-medium tracking-[0.16em] text-bone-400 uppercase">
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-xs text-flag-red">{error}</span>
      ) : hint ? (
        <span className="block text-xs leading-relaxed text-bone-600">{hint}</span>
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
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-800 font-display text-gold-300 ring-1 ring-gold-500/25",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
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

/* -------------------------------------------------------------- Level chip */
export function LevelChip({ level, className }: { level: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5", className)}
      title={`Padel level ${level.toFixed(1)} — ${levelLabel(level)}`}
    >
      <span className="font-display text-base leading-none font-medium text-gold-300 tabular-nums">
        {level.toFixed(1)}
      </span>
      <span className="text-[0.6rem] tracking-[0.14em] text-bone-500 uppercase">
        {levelLabel(level)}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------- Stat */
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
    <Card className="lift p-5">
      <p className="text-[0.6rem] font-medium tracking-[0.18em] text-bone-600 uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl leading-none font-light text-bone-100 tabular-nums">
        {value}
      </p>
      {sub ? <p className="mt-2 text-xs text-bone-500">{sub}</p> : null}
    </Card>
  );
}

/* -------------------------------------------------------------------- Misc */
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
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-gold-600/70">{icon}</div> : null}
      <h3 className="font-display text-2xl font-light text-bone-100">{title}</h3>
      <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-bone-500">{body}</p>
      {action ? <div className="mt-7">{action}</div> : null}
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
    <div className="mb-5 flex items-center justify-between gap-6">
      <h2 className="shrink-0 text-[0.68rem] font-medium tracking-[0.22em] text-bone-500 uppercase">
        {title}
      </h2>
      <span className="hairline hidden flex-1 sm:block" aria-hidden="true" />
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-ink-800", className)} />;
}
