/**
 * Global, non-secret business config. meta.json per design may override
 * priceInInr; everything else here applies to every design.
 */
export const siteConfig = {
  name: "Unarway Invites",
  defaultPriceInInr: 599,
  hostedLinkExpiryMonths: 12,
  /** ZIP download stays off (hosted link is the deliverable) until this flips. */
  enableZipDownload: false,
} as const;

/**
 * The public site origin (no trailing slash), used for absolute URLs like
 * sitemap.xml entries. Falls back to localhost for local dev, but NOT on
 * Vercel's production deployment -- a missing NEXT_PUBLIC_SITE_URL there
 * must fail the build loudly instead of silently shipping a sitemap full of
 * http://localhost:3000 links to real search engines.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (url) return url;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Required in production (Vercel) -- no localhost fallback allowed here."
    );
  }
  return "http://localhost:3000";
}
