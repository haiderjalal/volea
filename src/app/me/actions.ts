"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ProfileState {
  error?: string;
  ok?: boolean;
}

const schema = z.object({
  full_name: z.string().trim().min(2, "Tell us your name."),
  city: z.string().trim().min(2, "We match players city by city."),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  bio: z.string().trim().max(280, "Keep it under 280 characters.").optional().or(z.literal("")),
  preferred_side: z.enum(["left", "right", "both"]),
  avatar_url: z.string().trim().url("That is not a valid URL.").optional().or(z.literal("")),
});

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to update your profile." };

  const { full_name, city, country, bio, preferred_side, avatar_url } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      city,
      country: country || null,
      bio: bio || null,
      preferred_side,
      avatar_url: avatar_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("updateProfile failed", { message: error.message });
    return { error: "We could not save your profile. Please try again." };
  }

  revalidatePath("/me");
  revalidatePath("/leaderboard");
  return { ok: true };
}
