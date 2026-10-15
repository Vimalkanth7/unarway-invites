import { redirect } from "next/navigation";

/** Checkout happens inline on the design page via the Razorpay Checkout overlay now. */
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ designId: string }>;
}) {
  const { designId } = await params;
  redirect(`/design/${designId}`);
}
