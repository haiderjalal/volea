/**
 * The site's absolute origin — for metadataBase, canonical URLs, the sitemap
 * and auth redirects.
 *
 * Resolved once, here, because an unset-vs-empty env var is a trap: Next inlines
 * `process.env.NEXT_PUBLIC_*` at build time, so a variable that exists but has
 * no value arrives as `""`, which `??` happily passes through to `new URL("")`
 * and fails the build.
 */

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function normalize(host: string): string | undefined {
  // Vercel exposes bare hostnames ("volea.vercel.app"), not full URLs.
  const withProtocol = /^https?:\/\//i.test(host) ? host : `https://${host}`;
  try {
    const url = new URL(withProtocol);
    return url.origin;
  } catch {
    return undefined;
  }
}

function resolveSiteUrl(): string {
  const candidates = firstNonEmpty(
    process.env.NEXT_PUBLIC_SITE_URL,
    // Stable production domain — survives every redeploy, so canonical URLs and
    // auth redirects stay put.
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    // Per-deployment URL. Changes every push, so it is a preview-only fallback.
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
  );

  return (candidates && normalize(candidates)) ?? "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

/** Absolute URL for a path, e.g. `absoluteUrl("/auth/callback")`. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
