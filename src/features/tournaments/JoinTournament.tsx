"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinTournament, type TournamentState } from "@/app/tournaments/actions";
import { Button, Card, Field, Input } from "@/components/ui";
import type { PlayMode } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Entering…" : "Enter the draw"}
    </Button>
  );
}

export function JoinTournament({
  tournamentId,
  mode,
}: {
  tournamentId: string;
  mode: PlayMode;
}) {
  const [state, formAction] = useActionState<TournamentState, FormData>(
    joinTournament,
    {},
  );

  if (state.ok) {
    return (
      <Card className="border-teal-500/40 bg-teal-500/5 p-5 text-center">
        <p className="text-sm font-semibold text-teal-400">You are in the draw.</p>
        <p className="mt-1 text-sm text-chalk-500">
          The bracket is seeded by level once entries close.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-chalk-100">Enter this tournament</h2>
      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <input type="hidden" name="mode" value={mode} />

        <Field label="Team name">
          <Input name="team_name" required maxLength={40} placeholder="Los Bandejas" />
        </Field>

        {mode === "doubles" ? (
          <Field
            label="Partner's username"
            hint="They need a Volea profile. Ask them for their @username."
          >
            <Input name="partner_username" required placeholder="@partner" />
          </Field>
        ) : null}

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
