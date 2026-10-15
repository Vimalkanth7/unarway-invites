import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { COUPLE_PHOTOS_BUCKET, isStoragePhotoPath } from "@/lib/supabase/storage";
import { isInvitationExpired } from "@/lib/payments/orders";
import { loadTemplateBundle } from "@/lib/templates/loader";
import { siteConfig } from "@/lib/config";
import type { DesignConfig, TemplateBundle } from "@/types/template";
import type { InvitationRow } from "@/types/invitation";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

type HostedInvitation = Pick<InvitationRow, "design_id" | "config" | "status" | "paid_at">;

/**
 * Shared by generateMetadata and the page component (React dedupes calls
 * with identical arguments within one request) so a visit only looks the
 * invitation up once. Never returns details for anything that isn't a paid,
 * non-expired invitation -- unpaid drafts must never leak through here.
 */
const getHostedInvitation = cache(async (shortId: string) => {
  const supabase = createSupabaseServiceRoleClient();
  const { data: invitation } = await supabase
    .from("invitations")
    .select("design_id, config, status, paid_at")
    .eq("short_id", shortId)
    .maybeSingle<HostedInvitation>();

  if (!invitation || invitation.status !== "paid") return null;

  const expired = isInvitationExpired(invitation, siteConfig.hostedLinkExpiryMonths);
  const bundle = await loadTemplateBundle(invitation.design_id);
  if (!bundle) return null;

  return { invitation, expired, bundle };
});

function formatShareDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function buildShareCopy(invitation: HostedInvitation, bundle: TemplateBundle): { title: string; description: string } {
  const config = invitation.config;
  const share = bundle.meta.share;

  const title =
    share && share.titleFields.length > 0
      ? share.titleFields.map((key) => config[key]).filter(Boolean).join(share.titleJoiner ?? " & ") ||
        bundle.meta.title
      : bundle.meta.title;

  const dateText = share?.dateField ? formatShareDate(config[share.dateField] ?? "") : null;
  const locationText = share?.locationField ? config[share.locationField] : null;
  const description = [dateText, locationText].filter(Boolean).join(" · ") || `An invitation from ${siteConfig.name}.`;

  return { title, description };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shortId: string }>;
}): Promise<Metadata> {
  const { shortId } = await params;
  // Hosted invitations are personal and link-shared, not for search engines
  // -- this applies regardless of whether the lookup below succeeds.
  const robots = { index: false, follow: false };

  const data = await getHostedInvitation(shortId);
  if (!data || data.expired) return { title: "Invitation", robots };

  const { title, description } = buildShareCopy(data.invitation, data.bundle);

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${proto}://${host}/api/i/${shortId}/og-image`;

  return {
    title,
    description,
    robots,
    openGraph: { title, description, images: [imageUrl], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default async function HostedInvitationPage({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;
  const data = await getHostedInvitation(shortId);
  if (!data) notFound();

  if (data.expired) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">This link has expired</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Invitations stay live for {siteConfig.hostedLinkExpiryMonths} months after payment.
        </p>
      </div>
    );
  }

  const { invitation, bundle } = data;
  const supabase = createSupabaseServiceRoleClient();
  const resolvedConfig: DesignConfig = { ...invitation.config };
  for (const field of bundle.schema) {
    if (field.type !== "photo") continue;
    const value = resolvedConfig[field.key];
    if (!value || !isStoragePhotoPath(value)) continue;

    const { data: signed } = await supabase.storage
      .from(COUPLE_PHOTOS_BUCKET)
      .createSignedUrl(value, SIGNED_URL_EXPIRY_SECONDS);
    if (signed) resolvedConfig[field.key] = signed.signedUrl;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PreviewFrame designId={bundle.meta.id} config={resolvedConfig} watermark={false} />
    </div>
  );
}
