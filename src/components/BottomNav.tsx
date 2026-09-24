"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Swords, CalendarDays, Trophy, User, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/format";

const ITEMS = [
  { href: "/", label: "Courts", icon: MapPin },
  { href: "/play", label: "Play", icon: Swords },
  { href: "/matches", label: "Matches", icon: CalendarDays },
  { href: "/community", label: "Chat", icon: MessagesSquare },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/me", label: "Me", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700/70 bg-ink-950/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-6">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="relative">
              {/* Lit edge above the active tab rather than a filled pill. */}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent"
                />
              ) : null}
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 text-[0.58rem] font-medium tracking-[0.14em] uppercase transition-colors duration-300",
                  active ? "text-gold-300" : "text-bone-600 hover:text-bone-400",
                )}
              >
                <Icon size={19} strokeWidth={active ? 1.9 : 1.5} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
