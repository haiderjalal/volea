"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface BookingState {
  error?: string;
  booked?: boolean;
}

const bookingSchema = z.object({
  court_id: z.string().uuid(),
  play_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  club_slug: z.string().regex(/^[a-z0-9-]+$/),
});

export async function bookCourt(
  _previous: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose a valid court and time." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to book this court." };

  const { error } = await supabase.rpc("book_court", {
    p_court_id: parsed.data.court_id,
    p_play_date: parsed.data.play_date,
    p_start_time: `${parsed.data.start_time}:00`,
  });

  if (error) {
    if (["22023", "23P01", "28000"].includes(error.code)) {
      return { error: error.message };
    }
    console.error("book_court failed", { code: error.code, message: error.message });
    return { error: "We could not book that court. Please try again." };
  }

  revalidatePath(`/clubs/${parsed.data.club_slug}`);
  revalidatePath("/club");
  revalidatePath("/matches");
  return { booked: true };
}

export async function cancelDirectBooking(matchId: string, clubSlug: string): Promise<void> {
  const parsed = z.string().uuid().safeParse(matchId);
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_direct_booking", { p_match_id: parsed.data });
  if (error) console.error("cancel_direct_booking failed", { message: error.message });
  revalidatePath(`/clubs/${clubSlug}`);
  revalidatePath("/club");
  revalidatePath("/matches");
}
