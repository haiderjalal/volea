import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CommunityChat } from "@/features/community/CommunityChat";
import { Card } from "@/components/ui";
import type { CommunityMessage, Profile } from "@/lib/types";

export const metadata = {
  title: "Community chat",
  description: "Talk with padel players across the Volea community in real time.",
  robots: { index: false, follow: false },
};

export default async function CommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: rows, error }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, city")
      .eq("id", user.id)
      .single<Pick<Profile, "id" | "username" | "full_name" | "avatar_url" | "city">>(),
    supabase
      .from("community_messages")
      .select("*, sender:profiles(id, username, full_name, avatar_url, city)")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<CommunityMessage[]>(),
  ]);

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="eyebrow">The clubhouse</p>
        <h1 className="mt-4 font-display text-4xl font-light text-bone-100 sm:text-5xl">
          Community chat
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone-500">
          One room for every player—find a partner, share an open slot, or talk padel.
        </p>
      </header>

      {error ? (
        <Card className="flex items-center gap-3 border-flag-red/30 p-5">
          <MessageCircle size={18} className="text-flag-red" aria-hidden="true" />
          <p className="text-sm text-bone-400">
            Community chat is not available until the latest database migration is applied.
          </p>
        </Card>
      ) : (
        <CommunityChat me={profile} initial={[...(rows ?? [])].reverse()} />
      )}
    </div>
  );
}
