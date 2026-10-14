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

export interface PreviewReadyMessage {
  type: typeof PREVIEW_READY_MESSAGE;
}

export interface PreviewConfigMessage {
  type: typeof PREVIEW_CONFIG_MESSAGE;
  payload: Record<string, string>;
}
