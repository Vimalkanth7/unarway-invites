import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default async function HostedInvitationPage({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;
  return (
    <PlaceholderPage
      title="Invitation"
      description={`Hosted invitation "${shortId}" will render here once Phase 5-6 land.`}
    />
  );
}
