"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface TournamentState {
  error?: string;
  ok?: boolean;
}

const joinSchema = z.object({
  tournament_id: z.string().uuid(),
  team_name: z.string().trim().min(2, "Give your team a name.").max(40),
  partner_username: z.string().trim().optional().or(z.literal("")),
  mode: z.enum(["doubles", "singles"]),
});

export async function joinTournament(
  _prev: TournamentState,
  formData: FormData,
): Promise<TournamentState> {
  const parsed = joinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { tournament_id, team_name, partner_username, mode } = parsed.data;
  const supabase = await createClient();

  let partnerId: string | null = null;
  if (mode === "doubles") {
    if (!partner_username) return { error: "Doubles needs a partner's username." };
    const { data: partner } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", partner_username.replace(/^@/, ""))
      .maybeSingle();
    if (!partner) return { error: `No player found with the username “${partner_username}”.` };
    partnerId = partner.id as string;
  }

  const { error } = await supabase.rpc("join_tournament", {
    p_tournament_id: tournament_id,
    p_team_name: team_name,
    p_partner_id: partnerId,
  });

  if (error) {
    if (error.code === "22023" || error.code === "28000") return { error: error.message };
    if (error.code === "23505") return { error: "You are already entered in this tournament." };
    console.error("join_tournament failed", { message: error.message });
    return { error: "We could not enter your team. Please try again." };
  }

  revalidatePath("/tournaments");
  return { ok: true };
}

export async function drawBracket(tournamentId: string, slug: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("generate_bracket", {
    p_tournament_id: tournamentId,
  });
  if (error) console.error("generate_bracket failed", { message: error.message });
  revalidatePath(`/tournaments/${slug}`);
}

export async function advanceTeam(
  tournamentMatchId: string,
  winnerTeamId: string,
  slug: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_tournament_result", {
    p_tournament_match_id: tournamentMatchId,
    p_winner_team_id: winnerTeamId,
  });
  if (error) console.error("report_tournament_result failed", { message: error.message });
  revalidatePath(`/tournaments/${slug}`);
}
