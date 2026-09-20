"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface ResultState {
  error?: string;
  ok?: boolean;
}

const setScore = z
  .string()
  .trim()
  .regex(/^\d{1,2}-\d{1,2}$/, "Write each set like 6-4.");

const schema = z.object({
  match_id: z.string().uuid(),
  winning_team: z.coerce.number().int().min(1).max(2),
  sets: z.string().trim().min(3),
});

/** Parses "6-4, 6-3" into [[6,4],[6,3]]. */
function parseSets(raw: string): number[][] | null {
  const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0 || parts.length > 5) return null;
  const sets: number[][] = [];
  for (const part of parts) {
    if (!setScore.safeParse(part).success) return null;
    const [a, b] = part.split("-").map(Number);
    sets.push([a, b]);
  }
  return sets;
}

export async function reportResult(
  _prev: ResultState,
  formData: FormData,
): Promise<ResultState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick a winner and enter the score." };

  const sets = parseSets(parsed.data.sets);
  if (!sets) return { error: "Write the score as sets, like “6-4, 6-3”." };

  // The winning team must actually have won more sets than it lost.
  const won = sets.filter(([a, b]) => (parsed.data.winning_team === 1 ? a > b : b > a)).length;
  if (won * 2 <= sets.length) {
    return { error: "That score does not add up to a win for the team you picked." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_match_result", {
    p_match_id: parsed.data.match_id,
    p_winning_team: parsed.data.winning_team,
    p_score: sets,
  });

  if (error) {
    if (error.code === "22023" || error.code === "42501") return { error: error.message };
    console.error("report_match_result failed", { message: error.message });
    return { error: "We could not save that result. Please try again." };
  }

  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  revalidatePath("/me");
  return { ok: true };
}
