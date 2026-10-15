import { notFound } from "next/navigation";
import { PreviewFrame } from "@/components/preview/PreviewFrame";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { COUPLE_PHOTOS_BUCKET, isStoragePhotoPath } from "@/lib/supabase/storage";
import { isInvitationExpired } from "@/lib/payments/orders";
import { loadTemplateBundle } from "@/lib/templates/loader";
import { siteConfig } from "@/lib/config";
import type { DesignConfig } from "@/types/template";
import type { InvitationRow } from "@/types/invitation";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

type HostedInvitation = Pick<InvitationRow, "design_id" | "config" | "status" | "paid_at">;

export default async function HostedInvitationPage({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;

  // No visitor session exists on this public page -- looking an invitation
  // up by its short_id across all users has to bypass RLS deliberately.
  const supabase = createSupabaseServiceRoleClient();
  const { data: invitation } = await supabase
    .from("invitations")
    .select("design_id, config, status, paid_at")
    .eq("short_id", shortId)
    .maybeSingle<HostedInvitation>();

  if (!invitation || invitation.status !== "paid") notFound();

  if (isInvitationExpired(invitation, siteConfig.hostedLinkExpiryMonths)) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">This link has expired</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Invitations stay live for {siteConfig.hostedLinkExpiryMonths} months after payment.
        </p>
      </div>
    );
  }

  const bundle = await loadTemplateBundle(invitation.design_id);
  if (!bundle) notFound();

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
