"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { QueueEntry } from "@/lib/types";

export interface QueueState {
  error?: string;
  entry?: QueueEntry;
}

const joinSchema = z
  .object({
    play_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    window_start: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
    window_end: z.string().regex(/^\d{2}:\d{2}$/, "Pick an end time."),
    mode: z.enum(["doubles", "singles"]),
    club_id: z.string().uuid().or(z.literal("")).optional(),
    spread: z.coerce.number().min(0).max(6),
  })
  .refine((v) => v.window_end > v.window_start, {
    message: "Your window must end after it starts.",
    path: ["window_end"],
  });

export async function joinQueue(
  _prev: QueueState,
  formData: FormData,
): Promise<QueueState> {
  const parsed = joinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { play_date, window_start, window_end, mode, club_id, spread } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to join the queue." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("level")
    .eq("id", user.id)
    .maybeSingle();

  const level = profile?.level ?? 2.0;
  // spread of 6 means "anyone" — the full 1.0–7.0 ladder
  const min = spread >= 6 ? 1.0 : Math.max(1.0, level - spread);
  const max = spread >= 6 ? 7.0 : Math.min(7.0, level + spread);

  const queueParams = {
    p_play_date: play_date,
    p_window_start: `${window_start}:00`,
    p_window_end: `${window_end}:00`,
    p_mode: mode,
    p_club_id: club_id || null,
    p_min_level: min,
    p_max_level: max,
  };
  let { data, error } = await supabase.rpc("join_queue", queueParams);

  // The overlap trigger may settle a simultaneous booking between the
  // availability check and insert. Retrying the whole atomic RPC once lets the
  // matcher choose the next free court without exposing the race to the user.
  if (error?.code === "23P01") {
    ({ data, error } = await supabase.rpc("join_queue", queueParams));
  }

  if (error) {
    // Postgres raises our own friendly messages with these SQLSTATEs.
    if (error.code === "22023" || error.code === "28000") return { error: error.message };
    if (error.code === "23505") {
      return { error: "You are already in the queue for that day." };
    }
    console.error("join_queue failed", { code: error.code, message: error.message });
    return { error: "We could not add you to the queue. Please try again." };
  }

  revalidatePath("/play");
  revalidatePath("/matches");
  return { entry: data as QueueEntry };
}

export async function leaveQueue(entryId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_queue", { p_entry_id: entryId });
  if (error) console.error("leave_queue failed", { message: error.message });
  revalidatePath("/play");
}
