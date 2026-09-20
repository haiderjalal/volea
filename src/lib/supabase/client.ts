import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client, pinned to the `volea` schema.
 * The schema must be listed under Project Settings → API → Exposed schemas.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "volea" } },
  );
}
