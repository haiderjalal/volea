import { cn } from "@/lib/format";

/**
 * The Volea mark: a padel racket face with the V cut out of it, ball mid-volley.
 * Struck in gold rather than drawn in colour — it should read like an emblem
 * pressed into the page, not an app icon.
 */
export function Logomark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Volea"
    >
      <defs>
        <linearGradient id="vmGold" x1="12" y1="4" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EFE0BD" />
          <stop offset="0.45" stopColor="#C09F63" />
          <stop offset="0.7" stopColor="#F7EED8" />
          <stop offset="1" stopColor="#A2844C" />
        </linearGradient>
      </defs>
      <path
        fill="url(#vmGold)"
        d="M32 3c15 0 25 10.5 25 24 0 11.6-7.4 20.4-17.9 23.2L36.6 59a4.8 4.8 0 0 1-9.2 0l-2.5-8.8C14.4 47.4 7 38.6 7 27 7 13.5 17 3 32 3Z"
      />
      <path fill="#06080A" d="M20.4 15h7.1l4.5 15.1L36.5 15h7.1L35.6 40h-7.2L20.4 15Z" />
      <circle cx="32" cy="45.5" r="2.05" fill="#06080A" opacity=".5" />
      <circle cx="23.6" cy="44" r="1.7" fill="#06080A" opacity=".3" />
      <circle cx="40.4" cy="44" r="1.7" fill="#06080A" opacity=".3" />
      <circle cx="49.5" cy="13.5" r="6.5" fill="#0F1315" stroke="url(#vmGold)" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2.5", className)}>
      <Logomark size={size} className="translate-y-[3px]" />
      <span
        className="font-display text-[1.4rem] leading-none font-normal text-bone-100"
        style={{ letterSpacing: "0.14em" }}
      >
        VOLEA
      </span>
    </span>
  );
}
