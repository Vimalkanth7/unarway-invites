/**
 * postMessage contract between the parent app and a template running inside
 * a sandbox="allow-scripts" iframe (opaque origin, so targetOrigin must be
 * "*" — there is no other way to address it). Template-side bootstrap
 * scripts are plain JS outside this build and must match these literals by
 * hand; see templates/sample-card/template/index.html for the reference
 * implementation.
 */
export const PREVIEW_READY_MESSAGE = "unarway:ready";
export const PREVIEW_CONFIG_MESSAGE = "unarway:config";
/**
 * A template can't open a wa.me / tel: / maps link itself -- the sandbox has
 * no allow-popups, so a plain <a target="_blank"> click is silently blocked.
 * It asks the parent to do it instead; the parent validates href against
 * ALLOWED_LINK_HOSTS / TEL_HREF_PATTERN (see link-allowlist.ts) before
 * acting on it. Never add allow-same-origin/allow-popups to the iframe as an
 * alternative fix -- that would also hand the opaque-origin isolation back.
 */
export const PREVIEW_OPEN_MESSAGE = "unarway:open";

export interface PreviewReadyMessage {
  type: typeof PREVIEW_READY_MESSAGE;
}

export interface PreviewConfigMessage {
  type: typeof PREVIEW_CONFIG_MESSAGE;
  payload: Record<string, string>;
}

export interface PreviewOpenMessage {
  type: typeof PREVIEW_OPEN_MESSAGE;
  href: string;
}
