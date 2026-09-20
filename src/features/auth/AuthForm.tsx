"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";
import { Button, Field, Input } from "@/components/ui";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "One moment…" : label}
    </Button>
  );
}

export function AuthForm({ mode, next }: { mode: "signin" | "signup"; next?: string }) {
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {mode === "signup" ? (
        <>
          <Field label="Your name">
            <Input name="full_name" autoComplete="name" required placeholder="Haider Jalal" />
          </Field>
          <Field label="Username" hint="How other players will find you.">
            <Input
              name="username"
              autoComplete="username"
              required
              pattern="[a-zA-Z0-9_]{3,20}"
              placeholder="haider"
            />
          </Field>
          <Field label="City" hint="Volea matches players within the same city.">
            <Input name="city" autoComplete="address-level2" required placeholder="Dubai" />
          </Field>
        </>
      ) : null}

      <Field label="Email">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
        <Input
          type="password"
          name="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={8}
        />
      </Field>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-flag-red/10 p-3 text-sm text-flag-red">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p role="status" className="rounded-xl bg-teal-500/10 p-3 text-sm text-teal-400">
          {state.notice}
        </p>
      ) : null}

      <Submit label={mode === "signin" ? "Sign in" : "Create profile"} />
    </form>
  );
}
