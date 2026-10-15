import { NextResponse } from "next/server";
import { isWebhookSecretConfigured, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { markOrderPaid } from "@/lib/payments/orders";

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity?: { id: string; order_id: string };
    };
  };
}

export async function POST(request: Request) {
  if (!isWebhookSecretConfigured()) {
    console.error("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Signature is computed over the exact raw bytes Razorpay sent, so this
  // must be read as text before any JSON parsing.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    console.error("Razorpay webhook signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload.payment?.entity;
    if (payment) {
      try {
        await markOrderPaid(payment.order_id, payment.id);
      } catch (err) {
        console.error("webhook markOrderPaid failed:", err);
        return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
