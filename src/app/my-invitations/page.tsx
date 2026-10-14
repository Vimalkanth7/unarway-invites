import Link from "next/link";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { InvitationsList } from "@/components/invitations/InvitationsList";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTemplateBundle } from "@/lib/templates/loader";
import type { InvitationRow } from "@/types/invitation";

type InvitationListRow = Pick<InvitationRow, "id" | "design_id" | "title" | "status" | "updated_at">;

export default async function MyInvitationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-2xl font-semibold">My invitations</h1>
        <p className="mt-3 text-neutral-600">
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to see your saved invitations.
        </p>
      </div>
    );
  }

  const { data } = await supabase
    .from("invitations")
    .select("id, design_id, title, status, updated_at")
    .order("updated_at", { ascending: false })
    .returns<InvitationListRow[]>();

  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <PlaceholderPage
        title="My invitations"
        description="You haven't started an invitation yet. Pick a design to get going."
      />
    );
  }

  const designTitles = Object.fromEntries(
    await Promise.all(
      [...new Set(rows.map((row) => row.design_id))].map(async (designId) => {
        const bundle = await loadTemplateBundle(designId);
        return [designId, bundle?.meta.title ?? designId] as const;
      })
    )
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-2xl font-semibold">My invitations</h1>
      <InvitationsList invitations={rows} designTitles={designTitles} />
    </div>
  );
}
