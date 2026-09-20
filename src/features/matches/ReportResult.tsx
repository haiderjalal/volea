"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { reportResult, type ResultState } from "@/app/matches/actions";
import { Button, Field, Input } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save result"}
    </Button>
  );
}

export function ReportResult({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState<1 | 2>(1);
  const [state, formAction] = useActionState<ResultState, FormData>(
    async (prev, fd) => {
      const next = await reportResult(prev, fd);
      if (next.ok) {
        setOpen(false);
        router.refresh();
      }
      return next;
    },
    {},
  );

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ClipboardCheck size={14} aria-hidden="true" />
        Report result
      </Button>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-3 pt-1">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="winning_team" value={team} />

      <fieldset>
        <legend className="text-sm font-medium text-bone-300">Who won?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([1, 2] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTeam(t)}
              aria-pressed={team === t}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                team === t
                  ? "border-gold-500 bg-gold-500/10 text-gold-300"
                  : "border-ink-700 text-bone-500 hover:border-ink-600"
              }`}
            >
              Team {t}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Score" hint="Set by set, from Team 1's side. For example 6-4, 6-3.">
        <Input name="sets" required placeholder="6-4, 6-3" />
      </Field>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-flag-red/10 p-2.5 text-sm text-flag-red">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Submit />
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
