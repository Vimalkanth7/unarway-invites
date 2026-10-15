import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadTemplateBundle } from "@/lib/templates/loader";
import { siteConfig } from "@/lib/config";
import { getRazorpayKeyId } from "@/lib/payments/razorpay";
import { createPendingOrder } from "@/lib/payments/orders";
import type { InvitationRow } from "@/types/invitation";

type InvitationForOrder = Pick<InvitationRow, "id" | "design_id" | "status">;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { invitationId?: string } | null;
  const invitationId = body?.invitationId;
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, design_id, status")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .maybeSingle<InvitationForOrder>();
  if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.status === "paid") {
    return NextResponse.json({ error: "This invitation is already paid for" }, { status: 409 });
  }

  const bundle = await loadTemplateBundle(invitation.design_id);
  if (!bundle) return NextResponse.json({ error: "Design not found" }, { status: 404 });

  // The price never comes from the client -- only from the design's own
  // meta.json (or the site default), looked up server-side right here.
  const priceInInr = bundle.meta.priceInInr ?? siteConfig.defaultPriceInInr;
  const amountPaise = Math.round(priceInInr * 100);

  try {
    const order = await createPendingOrder({
      invitationId: invitation.id,
      userId: user.id,
      amountPaise,
      currency: "INR",
    });
    return NextResponse.json({
      orderId: order.razorpay_order_id,
      amount: amountPaise,
      currency: "INR",
      keyId: getRazorpayKeyId(),
    });
  } catch (err) {
    console.error("create-order failed:", err);
    return NextResponse.json({ error: "Could not create order" }, { status: 502 });
  }
}
