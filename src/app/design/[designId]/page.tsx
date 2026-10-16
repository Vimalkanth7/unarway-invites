import { notFound } from "next/navigation";
import { DesignWorkspace } from "@/components/design/DesignWorkspace";
import { loadTemplateBundle } from "@/lib/templates/loader";
import { siteConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { COUPLE_PHOTOS_BUCKET, isStoragePhotoPath } from "@/lib/supabase/storage";
import type { DesignConfig } from "@/types/template";
import type { InvitationRow } from "@/types/invitation";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

export default async function DesignPage({
  params,
  searchParams,
}: {
  params: Promise<{ designId: string }>;
  searchParams: Promise<{ invitation?: string }>;
}) {
  const { designId } = await params;
  const { invitation: requestedInvitationId = null } = await searchParams;
  const bundle = await loadTemplateBundle(designId);
  if (!bundle) notFound();

  const price = bundle.meta.priceInInr ?? siteConfig.defaultPriceInInr;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialConfig: DesignConfig = bundle.defaults;
  let initialInvitationId: string | null = null;
  let initialStatus: InvitationRow["status"] = "draft";
  let initialShortId: string | null = null;
  let initialPaidAt: string | null = null;
  const initialPhotoPaths: Record<string, string> = {};

  if (user && requestedInvitationId) {
    const { data, error } = await supabase
      .from("invitations")
      .select("id, design_id, config, status, short_id, paid_at")
      .eq("id", requestedInvitationId)
      .eq("user_id", user.id)
      .maybeSingle<Pick<InvitationRow, "id" | "design_id" | "config" | "status" | "short_id" | "paid_at">>();

    if (error) {
      // Query genuinely failed (not just "no row") -- never silently fall
      // back to defaults without a trace of why.
      console.error("Failed to load invitation for resume:", error);
    } else if (data && data.design_id === designId) {
      initialInvitationId = data.id;
      initialStatus = data.status;
      initialShortId = data.short_id;
      initialPaidAt = data.paid_at;
      // Merge over defaults, not just the saved row, so a schema key added
      // after this draft was created (or simply absent from an old row)
      // falls back to its default instead of silently becoming undefined.
      const resolvedConfig: DesignConfig = { ...bundle.defaults, ...data.config };

      for (const field of bundle.schema) {
        if (field.type !== "photo") continue;
        const value = resolvedConfig[field.key];
        if (!value || !isStoragePhotoPath(value)) continue;

        initialPhotoPaths[field.key] = value;
        const { data: signed } = await supabase.storage
          .from(COUPLE_PHOTOS_BUCKET)
          .createSignedUrl(value, SIGNED_URL_EXPIRY_SECONDS);
        if (signed) resolvedConfig[field.key] = signed.signedUrl;
      }

      initialConfig = resolvedConfig;
    } else if (data) {
      console.error(
        `Invitation ${requestedInvitationId} belongs to design "${data.design_id}", not "${designId}"`
      );
    }
  }

  // A draft was requested by id but never ended up loaded (query error, RLS
  // denial, wrong design, or genuinely missing) -- the client needs to know
  // this explicitly so it can refuse to autosave into a brand-new duplicate.
  const loadFailed = Boolean(user && requestedInvitationId && !initialInvitationId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{bundle.meta.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">Edit and preview for free.</p>
      </div>
      <DesignWorkspace
        bundle={bundle}
        price={price}
        userId={user?.id ?? null}
        initialInvitationId={initialInvitationId}
        initialStatus={initialStatus}
        initialShortId={initialShortId}
        initialPaidAt={initialPaidAt}
        initialConfig={initialConfig}
        initialPhotoPaths={initialPhotoPaths}
        loadFailed={loadFailed}
      />
    </div>
  );
}
