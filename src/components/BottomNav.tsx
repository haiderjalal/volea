"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Swords, CalendarDays, Trophy, User } from "lucide-react";
import { cn } from "@/lib/format";

const ITEMS = [
  { href: "/", label: "Courts", icon: MapPin },
  { href: "/play", label: "Play", icon: Swords },
  { href: "/matches", label: "Matches", icon: CalendarDays },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/me", label: "Me", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-court-700/80 bg-court-950/90 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium transition-colors",
                  active ? "text-ball-400" : "text-chalk-600 hover:text-chalk-300",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
