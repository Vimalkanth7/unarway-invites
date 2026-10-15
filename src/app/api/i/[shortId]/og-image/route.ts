import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { COUPLE_PHOTOS_BUCKET, isStoragePhotoPath } from "@/lib/supabase/storage";
import { resolveTemplateAssetPath, loadTemplateBundle } from "@/lib/templates/loader";
import { isInvitationExpired } from "@/lib/payments/orders";
import { siteConfig } from "@/lib/config";
import type { DesignConfig } from "@/types/template";
import type { InvitationRow } from "@/types/invitation";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

type HostedInvitation = Pick<InvitationRow, "design_id" | "config" | "status" | "paid_at">;

// Every response from this route carries this -- it's a personal invitation
// photo, never something search engines should index.
const ROBOTS_HEADER = { "x-robots-tag": "noindex" };

function notFound(): NextResponse {
  return new NextResponse("Not found", { status: 404, headers: ROBOTS_HEADER });
}

/**
 * Public, no-auth image for social previews -- keyed by the invitation's
 * already-public short_id, never the private Storage path, so sharing this
 * URL can't leak where the real photo object lives. Gated the same way the
 * hosted page itself is: paid and not expired, or nothing.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = await params;

  const supabase = createSupabaseServiceRoleClient();
  const { data: invitation } = await supabase
    .from("invitations")
    .select("design_id, config, status, paid_at")
    .eq("short_id", shortId)
    .maybeSingle<HostedInvitation>();

  if (!invitation || invitation.status !== "paid") return notFound();
  if (isInvitationExpired(invitation, siteConfig.hostedLinkExpiryMonths)) return notFound();

  const bundle = await loadTemplateBundle(invitation.design_id);
  if (!bundle) return notFound();

  const config: DesignConfig = invitation.config;
  const imageField = bundle.meta.share?.imageField;
  const photoValue = imageField ? config[imageField] : undefined;

  if (photoValue && isStoragePhotoPath(photoValue)) {
    const { data, error } = await supabase.storage.from(COUPLE_PHOTOS_BUCKET).download(photoValue);
    if (error || !data) return notFound();
    return new NextResponse(Buffer.from(await data.arrayBuffer()), {
      headers: {
        "content-type": data.type || "image/jpeg",
        "cache-control": "public, max-age=3600",
        ...ROBOTS_HEADER,
      },
    });
  }

  // No custom photo -- fall back to the template's own static preview image.
  if (!bundle.meta.previewImage) return notFound();
  const segments = bundle.meta.previewImage.replace(/^assets\//, "").split("/");
  const assetPath = resolveTemplateAssetPath(bundle.meta.id, segments);
  if (!assetPath) return notFound();

  try {
    const bytes = await fs.readFile(assetPath);
    const contentType = CONTENT_TYPES[path.extname(assetPath).toLowerCase()] ?? "image/jpeg";
    return new NextResponse(bytes, {
      headers: { "content-type": contentType, "cache-control": "public, max-age=3600", ...ROBOTS_HEADER },
    });
  } catch {
    return notFound();
  }
}
