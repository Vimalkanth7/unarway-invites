import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default async function DesignPage({
  params,
}: {
  params: Promise<{ designId: string }>;
}) {
  const { designId } = await params;
  return (
    <PlaceholderPage
      title={`Design: ${designId}`}
      description="The live preview and edit panel land in Phase 2-4."
    />
  );
}
