"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { joinQueue, type QueueState } from "@/app/play/actions";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import type { Club } from "@/lib/types";

const SPREADS = [
  { value: "0.5", label: "Very close (±0.5)" },
  { value: "1", label: "Similar level (±1.0)" },
  { value: "2", label: "Relaxed (±2.0)" },
  { value: "6", label: "Anyone" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Looking for players…" : "Find me a game"}
      {!pending && <Sparkles size={17} aria-hidden="true" />}
    </Button>
  );
}

export function QueueForm({
  clubs,
  level,
  defaultClubId,
}: {
  clubs: Pick<Club, "id" | "name" | "city">[];
  level: number;
  defaultClubId?: string;
}) {
  const [state, formAction] = useActionState<QueueState, FormData>(joinQueue, {});
  const [mode, setMode] = useState<"doubles" | "singles">("doubles");

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 14);

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-bone-300">Format</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["doubles", "singles"] as const).map((m) => (
              <label
                key={m}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold capitalize transition-colors ${
                  mode === m
                    ? "border-court-500 bg-court-500/10 text-court-400"
                    : "border-ink-700 text-bone-500 hover:border-ink-600"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="sr-only"
                />
                {m}
                <span className="mt-0.5 block text-xs font-normal text-bone-600">
                  {m === "doubles" ? "4 players" : "2 players"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Which day">
          <Input
            type="date"
            name="play_date"
            required
            defaultValue={iso(today)}
            min={iso(today)}
            max={iso(maxDate)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Free from">
            <Input type="time" name="window_start" required defaultValue="20:00" step={900} />
          </Field>
          <Field label="Until">
            <Input type="time" name="window_end" required defaultValue="23:00" step={900} />
          </Field>
        </div>
        <p className="-mt-1 text-xs text-bone-600">
          Give us at least 90 minutes — that is one padel slot. A wider window matches faster.
        </p>

        <Field label="Where" hint="Leave it on “Any court” and Volea picks a free one for you.">
          <Select name="club_id" defaultValue={defaultClubId ?? ""}>
            <option value="">Any court near me</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.city}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Opponent level">
          <Select name="spread" defaultValue="1">
            {SPREADS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>

        <p className="flex items-center gap-2 text-xs text-bone-600">
          You play at
          <Badge tone="gold">{level.toFixed(1)}</Badge>
        </p>

        {state.error ? (
          <p role="alert" className="rounded-xl bg-flag-red/10 p-3 text-sm text-flag-red">
            {state.error}
          </p>
        ) : null}

        <Submit />
      </form>
    </Card>
  );
}
