"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { createTournament, type ClubState } from "@/app/club/actions";
import { Button, Card, Field, Input, Select } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create tournament"}
    </Button>
  );
}

export function NewTournament({
  clubId,
  currency,
}: {
  clubId: string;
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ClubState, FormData>(
    async (prev, fd) => {
      const next = await createTournament(prev, fd);
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
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Trophy size={14} aria-hidden="true" />
        Host a tournament
      </Button>
    );
  }

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="club_id" value={clubId} />

        <Field label="Name">
          <Input name="name" required maxLength={80} placeholder="Thursday Night Knockout" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Bracket size">
            <Select name="size" defaultValue="8">
              <option value="4">4 teams</option>
              <option value="8">8 teams</option>
              <option value="16">16 teams</option>
              <option value="32">32 teams</option>
            </Select>
          </Field>
          <Field label="Format">
            <Select name="mode" defaultValue="doubles">
              <option value="doubles">Doubles</option>
              <option value="singles">Singles</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Registration closes">
            <Input type="datetime-local" name="registration_closes_at" required />
          </Field>
          <Field label="First match">
            <Input type="datetime-local" name="starts_at" required />
          </Field>
        </div>

        <Field label={`Entry fee per team (${currency})`} hint="Use 0 for a free event.">
          <Input type="number" name="entry_fee" min={0} step="1" defaultValue={0} required />
        </Field>

        <Field label="Description" hint="Optional. Format, prizes, ball type.">
          <Input name="description" maxLength={400} />
        </Field>

        {state.error ? (
          <p role="alert" className="rounded-xl bg-flag-red/10 p-3 text-sm text-flag-red">
            {state.error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Submit />
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
