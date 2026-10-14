import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ designId: string }>;
}) {
  const { designId } = await params;
  return (
    <PlaceholderPage
      title={`Checkout: ${designId}`}
      description="Razorpay test-mode checkout lands in Phase 6."
    />
  );
}
