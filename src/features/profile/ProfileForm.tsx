"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
import { updateProfile, type ProfileState } from "@/app/me/actions";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import type { Profile } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ProfileState, FormData>(updateProfile, {});

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil size={14} aria-hidden="true" />
        Edit profile
      </Button>
    );
  }

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <Field label="Your name">
          <Input name="full_name" required defaultValue={profile.full_name} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <Input name="city" required defaultValue={profile.city ?? ""} />
          </Field>
          <Field label="Country">
            <Input name="country" defaultValue={profile.country ?? ""} placeholder="PK" />
          </Field>
        </div>

        <Field
          label="Preferred side"
          hint="Padel is played in pairs — most players have a side they own."
        >
          <Select name="preferred_side" defaultValue={profile.preferred_side}>
            <option value="both">Either side</option>
            <option value="right">Right (forehand side)</option>
            <option value="left">Left (backhand side)</option>
          </Select>
        </Field>

        <Field label="Bio" hint="Optional. Max 280 characters.">
          <Input name="bio" defaultValue={profile.bio ?? ""} maxLength={280} />
        </Field>

        <Field label="Avatar URL" hint="Optional link to a photo.">
          <Input
            name="avatar_url"
            type="url"
            defaultValue={profile.avatar_url ?? ""}
            placeholder="https://…"
          />
        </Field>

        {state.error ? (
          <p role="alert" className="rounded-xl bg-flag-red/10 p-3 text-sm text-flag-red">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p role="status" className="rounded-xl bg-teal-500/10 p-3 text-sm text-teal-400">
            Saved.
          </p>
        ) : null}

        <div className="flex gap-2">
          <Submit />
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </form>
    </Card>
  );
}
