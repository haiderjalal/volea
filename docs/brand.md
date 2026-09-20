# Volea — brand

## Name

**Volea** — Spanish for *volley*. Padel was born in Acapulco and raised in Spain;
the sport's vocabulary is Spanish (*bandeja*, *víbora*, *punto de oro*), so a
Spanish name reads native to players rather than invented by a startup.

Five letters, two syllables, vo-LAY-uh. Set as `VOLEA` in the display serif with
0.14em tracking — a wordmark, not a logotype.

## Tagline

> **Find your fourth.**

Padel is played 2v2. The universal pain is being one player short — 47% of
players name finding partners as their number one obstacle. Three words that
state the product's entire job, and that only a player fully understands.

## The idea

Quiet luxury, not loud. The restraint *is* the positioning: one metal, one
accent, near-black, and a great deal of space. Nothing glows, nothing bounces,
nothing is rounded into a consumer-app pill. A member should feel the interface
was art-directed, not assembled.

## Logo

A padel racket face — solid, rounded, teardrop toward the handle, with the
signature perforations — and the **V** of Volea cut clean out of it. A ball sits
off the top-right corner, mid-volley, drawn as a gold ring rather than filled.

Struck in a gold gradient so it reads as an emblem pressed into the page. The
mark survives to 16px because the V holds once the perforations vanish.

Files: `public/brand/logomark.svg`, component `src/components/Logo.tsx`.

## Colour

Dark-only, on purpose: padel is a floodlit after-work sport played on glass
courts at night. A light theme would fight the product's own atmosphere.

| Token | Hex | Use |
| --- | --- | --- |
| `ink-950` | `#06080A` | Page. Warm near-black — cold greys read cheap |
| `ink-850` | `#0F1315` | Cards, surfaces |
| `ink-700` | `#202729` | Hairline borders |
| `gold-300` | `#E2CD9D` | Numerals, levels, prices, winners |
| `gold-500` | `#C09F63` | Primary action, the single metal |
| `court-500` | `#22735D` | Deep bottle green. Live states, map, secondary |
| `bone-100` | `#F4F1EA` | Primary text. Never pure white — it glares on black |
| `bone-500` | `#857F75` | Secondary text |

One metal only. Gold carries every moment that matters — a price, a level, a
win, a call to action — and nothing else is allowed to compete with it.

Signals (`flag-red`, `flag-amber`) are deliberately desaturated so an error sits
*inside* the palette rather than screaming on top of it.

Two fixed radial gradients light the page from opposite corners — warm from
above, court-green from below — under a 3.5%-opacity film grain. The grain is
what stops a flat dark UI reading as plastic.

**Never hardcode a hex in a component.** Everything is a Tailwind theme token in
`src/app/globals.css`.

## Type

**Cormorant Garamond** for display, light weights only — at large sizes the high
stroke contrast is the entire point. Headlines are set large and airy; the
italic is reserved for the one word in a line that should land (*fourth*).

**Inter** for everything a user has to read quickly or act on: body copy, labels,
controls, data.

Two rules that carry most of the character:

- **Wide tracking on small caps.** Eyebrows at `0.26em`, buttons at `0.12em`,
  labels at `0.16em`. Uppercase with generous tracking is the house style of
  every luxury maison and it stops short labels looking flimsy in whitespace.
- **`tabular-nums` everywhere numbers appear** — scores, ratings, ranks, money,
  countdowns. Figures must never jitter as they update.

## Motion

Motion is decoration, never information. Every page renders complete and correct
with JavaScript disabled and with animation stripped.

| Class | Use |
| --- | --- |
| `.rise` | Above-the-fold entrance, staggered with `--d` |
| `.reveal` | Below-the-fold, via `<Reveal>` and IntersectionObserver |
| `.sheen` | Slow specular sweep across gold on hover |
| `.lift` | Card raises 3px, border warms to gold |
| `.drift` | Slow idle float |

Easing is a single custom curve, `--ease-luxe` `cubic-bezier(0.22, 1, 0.36, 1)` —
fast out, long settle. Durations are slow by app standards (0.8–0.9s on
entrances) because haste reads as cheap.

`prefers-reduced-motion: reduce` collapses every duration to 0.01ms and forces
`.reveal` visible. No CSS-only dependency on motion, anywhere.

No animation library: the whole system is CSS plus one IntersectionObserver. On
a phone on Pakistani mobile data, the fastest interface is also the most
expensive-feeling one.

## Voice

Plain, confident, a little dry. Short sentences. Speak like a good club manager,
not a marketing deck.

- "Find your fourth." — not "Revolutionising padel socialisation."
- "Give us at least 90 minutes — that is one padel slot." — explain the *why*.
- "That is on us, not you." — own failures.
- "You are first in tonight's queue." — never let a waiting screen feel dead.

Avoid exclamation marks, "seamless", "effortless", and any claim the product has
not earned.
