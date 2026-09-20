# Volea — brand

## Name

**Volea** — Spanish for *volley*. Padel was born in Acapulco and raised in Spain;
the sport's vocabulary is Spanish (*bandeja*, *víbora*, *punto de oro*), so a
Spanish name reads native to players rather than invented by a startup.

Five letters, two syllables, vo-LAY-uh. Says the sport without saying "padel", so
the name still fits if the product ever covers pickleball or tennis.

## Tagline

> **Find your fourth.**

Padel is played 2v2. The universal pain is being one player short — 47% of players
name finding partners as their number one obstacle. "Find your fourth" is
insider shorthand: if you play, you have lived it. It states the product's entire
job in three words.

Supporting line: *Tell Volea when you are free. It finds three players at your
level and books the court.*

## Logo

A padel racket face — solid, rounded, teardrop toward the handle, with the
signature perforations — and the **V** of Volea cut clean out of it. A ball sits
off the top-right corner, mid-volley.

The mark works down to 16px because the V holds its shape when the perforations
disappear. Files: `public/brand/logomark.svg`, component `src/components/Logo.tsx`.

## Colour

Dark-only, on purpose: padel is a floodlit after-work sport, played on glass
courts at night. A light theme would fight the product's own atmosphere.

| Token | Hex | Use |
| --- | --- | --- |
| `court-950` | `#060C0E` | Page background |
| `court-850` | `#0E191C` | Cards, surfaces |
| `court-700` | `#1C2F34` | Borders |
| `ball-500` | `#D7FF3E` | Primary action, winners, level numbers |
| `teal-500` | `#14C79C` | Secondary, map pins, live states |
| `chalk-100` | `#F2F7F5` | Primary text |
| `chalk-500` | `#8AA5A2` | Secondary text |

`ball` is the padel ball's yellow-green. `teal` is the court surface. `chalk` is
the line paint. The page carries two soft radial gradients from the top corners —
floodlights bleeding onto the court.

**Never hardcode a hex in a component.** Everything is a Tailwind theme token
defined in `src/app/globals.css`.

## Type

**Inter**, via `next/font`. Headings are extrabold with tight tracking
(`-0.02em`); body is regular at comfortable line height. Numbers use
`tabular-nums` everywhere — scores, ratings, ranks and revenue must not jitter.

## Voice

Plain, confident, a little dry. Short sentences. Speak like a good club manager,
not a marketing deck.

- "Find your fourth." — not "Revolutionising padel socialisation."
- "Give us at least 90 minutes — that is one padel slot." — explain the *why*.
- "That is on us, not you." — own failures.
- "You are first in tonight's queue." — never let a waiting screen feel dead.

Avoid exclamation marks, "seamless", "effortless", and any claim the product has
not earned.
