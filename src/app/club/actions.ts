"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ClubState {
  error?: string;
  ok?: boolean;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

const clubSchema = z.object({
  name: z.string().trim().min(3, "Give the club a name.").max(80),
  city: z.string().trim().min(2, "Which city is it in?"),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  address: z.string().trim().max(160).optional().or(z.literal("")),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  timezone: z.string().trim().min(3),
  price_per_hour: z.coerce.number().min(0).max(10000),
  currency: z.string().trim().length(3).toUpperCase(),
  opens_at: z.string().regex(/^\d{2}:\d{2}$/),
  closes_at: z.string().regex(/^\d{2}:\d{2}$/),
  court_count: z.coerce.number().int().min(1).max(30),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  description: z.string().trim().max(400).optional().or(z.literal("")),
});

export async function registerClub(
  _prev: ClubState,
  formData: FormData,
): Promise<ClubState> {
  const parsed = clubSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const v = parsed.data;

  if (v.closes_at <= v.opens_at) {
    return { error: "Closing time must be after opening time." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to register a club." };

  // Slugs are public URLs and must be unique — suffix on collision.
  const base = slugify(v.name);
  let slug = base;
  for (let i = 2; i < 12; i++) {
    const { data: clash } = await supabase
      .from("clubs")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  const { data: club, error } = await supabase
    .from("clubs")
    .insert({
      owner_id: user.id,
      name: v.name,
      slug,
      description: v.description || null,
      address: v.address || null,
      city: v.city,
      country: v.country || null,
      lat: v.lat,
      lng: v.lng,
      timezone: v.timezone,
      phone: v.phone || null,
      price_per_hour_cents: Math.round(v.price_per_hour * 100),
      currency: v.currency,
      opens_at: v.opens_at,
      closes_at: v.closes_at,
      status: "active",
    })
    .select("id, slug")
    .single();

  if (error || !club) {
    console.error("registerClub failed", { message: error?.message });
    return { error: "We could not register the club. Please try again." };
  }

  const courts = Array.from({ length: v.court_count }, (_, i) => ({
    club_id: club.id as string,
    name: `Court ${i + 1}`,
  }));
  const { error: courtError } = await supabase.from("courts").insert(courts);
  if (courtError) {
    console.error("court creation failed", { message: courtError.message });
  }

  await supabase.from("profiles").update({ is_club_owner: true }).eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/club");
}

const tournamentSchema = z.object({
  club_id: z.string().uuid(),
  name: z.string().trim().min(3, "Name the tournament.").max(80),
  size: z.coerce.number().int().refine((n) => [4, 8, 16, 32].includes(n), "Pick a bracket size."),
  mode: z.enum(["doubles", "singles"]),
  entry_fee: z.coerce.number().min(0).max(100000),
  starts_at: z.string().min(10, "When does it start?"),
  registration_closes_at: z.string().min(10, "When does registration close?"),
  description: z.string().trim().max(400).optional().or(z.literal("")),
});

export async function createTournament(
  _prev: ClubState,
  formData: FormData,
): Promise<ClubState> {
  const parsed = tournamentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const v = parsed.data;

  if (new Date(v.registration_closes_at) > new Date(v.starts_at)) {
    return { error: "Registration has to close before the tournament starts." };
  }

  const supabase = await createClient();
  const { data: club } = await supabase
    .from("clubs")
    .select("currency, slug")
    .eq("id", v.club_id)
    .maybeSingle();

  const base = slugify(v.name);
  let slug = base;
  for (let i = 2; i < 12; i++) {
    const { data: clash } = await supabase
      .from("tournaments")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  const { error } = await supabase.from("tournaments").insert({
    club_id: v.club_id,
    name: v.name,
    slug,
    description: v.description || null,
    mode: v.mode,
    size: v.size,
    entry_fee_cents: Math.round(v.entry_fee * 100),
    currency: (club?.currency as string) ?? "AED",
    starts_at: new Date(v.starts_at).toISOString(),
    registration_closes_at: new Date(v.registration_closes_at).toISOString(),
    status: "open",
  });

  if (error) {
    console.error("createTournament failed", { message: error.message });
    return { error: "We could not create the tournament. Please try again." };
  }

  revalidatePath("/club");
  revalidatePath("/tournaments");
  return { ok: true };
}
