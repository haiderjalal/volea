"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  notice?: string;
}

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

const signUpSchema = credentials.extend({
  full_name: z.string().trim().min(2, "Tell us your name."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: letters, numbers and underscores."),
  city: z.string().trim().min(2, "We match players city by city, so we need yours."),
});

function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form.";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That email and password do not match an account." };

  const next = String(formData.get("next") || "/play");
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { email, password, full_name, username, city } = parsed.data;
  const supabase = await createClient();

  // Usernames are public identity — reject duplicates before creating the auth user.
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (taken) return { error: "That username is taken. Try another." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, username, city },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      error: error.message.includes("already registered")
        ? "That email already has an account. Sign in instead."
        : "We could not create your account. Try again.",
    };
  }

  // Supabase returns no session when email confirmation is switched on.
  if (!data.session) {
    return { notice: `Almost there — confirm your email at ${email}, then sign in.` };
  }

  revalidatePath("/", "layout");
  redirect("/play");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
