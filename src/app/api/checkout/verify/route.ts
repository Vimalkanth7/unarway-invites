import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { getOrderByRazorpayId, markOrderPaid } from "@/lib/payments/orders";

interface VerifyBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as VerifyBody | null;
  const orderId = body?.razorpay_order_id;
  const paymentId = body?.razorpay_payment_id;
  const signature = body?.razorpay_signature;
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const order = await getOrderByRazorpayId(orderId);
  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // The browser's own claim of success proves nothing; only this signature
  // (HMAC of order_id + "|" + payment_id with our key secret) does.
  if (!verifyPaymentSignature({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: signature })) {
    console.error("Payment signature mismatch for order", orderId);
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  try {
    const result = await markOrderPaid(orderId, paymentId);
    if (!result) {
      return NextResponse.json({ error: "Order could not be marked paid" }, { status: 409 });
    }
    return NextResponse.json({ status: "paid", invitationId: result.invitationId });
  } catch (err) {
    console.error("verify payment failed:", err);
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }
}
