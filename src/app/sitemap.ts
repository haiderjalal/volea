import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/tournaments`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/leaderboard`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/signup`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const supabase = await createClient();
    const [{ data: clubs }, { data: tournaments }] = await Promise.all([
      supabase.from("clubs").select("slug").eq("status", "active"),
      supabase.from("tournaments").select("slug, status").neq("status", "draft"),
    ]);

    return [
      ...statics,
      ...(clubs ?? []).map((c) => ({
        url: `${SITE}/clubs/${c.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...(tournaments ?? []).map((t) => ({
        url: `${SITE}/tournaments/${t.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // A sitemap is never worth failing a build over.
    return statics;
  }
}
