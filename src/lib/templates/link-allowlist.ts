/**
 * Shared by the editor's validation (validate.ts, for a "url"-type list
 * item such as a map link) and the parent-mediated unarway:open handler
 * (PreviewFrame.tsx) that opens links on behalf of a sandboxed template --
 * one allowlist so the two checks can never drift apart.
 */
export const ALLOWED_LINK_HOSTS = new Set([
  "wa.me",
  "api.whatsapp.com",
  "maps.app.goo.gl",
  "www.google.com",
  "maps.google.com",
]);

/** Indian mobile numbers only: 10 digits, starting 6-9. */
export const TEL_HREF_PATTERN = /^tel:\+91[6-9]\d{9}$/;

export function isAllowedHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_LINK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
