import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { INVITATION_DOWNLOADS_BUCKET } from "@/lib/supabase/storage";
import { loadTemplateBundle } from "@/lib/templates/loader";
import { buildInvitationZip } from "@/lib/zip/build";
import { isInvitationExpired } from "@/lib/payments/orders";
import { siteConfig } from "@/lib/config";
import type { InvitationRow } from "@/types/invitation";

const SIGNED_URL_EXPIRY_SECONDS = 300;

type InvitationForDownload = Pick<
  InvitationRow,
  "id" | "design_id" | "title" | "config" | "status" | "paid_at"
>;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, design_id, title, config, status, paid_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<InvitationForDownload>();
  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  // Re-checked live, not trusted from anything the browser sent.
  if (invitation.status !== "paid") {
    return NextResponse.json({ error: "This invitation hasn't been paid for" }, { status: 403 });
  }
  if (isInvitationExpired(invitation, siteConfig.hostedLinkExpiryMonths)) {
    return NextResponse.json({ error: "This invitation's download has expired" }, { status: 403 });
  }

  const bundle = await loadTemplateBundle(invitation.design_id);
  if (!bundle) return NextResponse.json({ error: "Design not found" }, { status: 404 });

  try {
    const zipBuffer = await buildInvitationZip(bundle, invitation.config);

    const serviceSupabase = createSupabaseServiceRoleClient();
    const objectPath = `${user.id}/${invitation.id}.zip`;
    const { error: uploadError } = await serviceSupabase.storage
      .from(INVITATION_DOWNLOADS_BUCKET)
      .upload(objectPath, zipBuffer, { upsert: true, contentType: "application/zip" });
    if (uploadError) throw uploadError;

    const filename = `${invitation.title.replace(/[^a-z0-9-]+/gi, "-") || "invitation"}.zip`;
    const { data: signed, error: signError } = await serviceSupabase.storage
      .from(INVITATION_DOWNLOADS_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRY_SECONDS, { download: filename });
    if (signError || !signed) throw signError ?? new Error("Could not sign download URL");

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err) {
    console.error("download build failed:", err);
    return NextResponse.json({ error: "Could not build download" }, { status: 500 });
  }
}
