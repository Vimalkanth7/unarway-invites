export const COUPLE_PHOTOS_BUCKET = "couple-photos";
export const INVITATION_DOWNLOADS_BUCKET = "invitation-downloads";

/**
 * Photo field values are either a data: URL (freshly chosen, not yet
 * uploaded), a sample asset path baked into the template (e.g.
 * "assets/couple.jpg"), an http(s) URL (a signed Storage URL resolved for
 * display), or a Storage object path. This is true only for that last case.
 */
export function isStoragePhotoPath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith("data:") &&
    !value.startsWith("http:") &&
    !value.startsWith("https:") &&
    !value.startsWith("assets/")
  );
}
