import "server-only";
import crypto from "node:crypto";

/**
 * The only module that knows about Razorpay specifically -- order creation
 * is a couple of REST calls and signature checks are plain HMAC, so there's
 * no SDK dependency. Swapping payment gateways later means replacing this
 * file, not touching callers.
 */

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getRazorpayKeyId(): string {
  return required("RAZORPAY_KEY_ID", process.env.RAZORPAY_KEY_ID);
}

function getRazorpayKeySecret(): string {
  return required("RAZORPAY_KEY_SECRET", process.env.RAZORPAY_KEY_SECRET);
}

/** Unset until the webhook is configured in the Razorpay dashboard. */
function getRazorpayWebhookSecret(): string | undefined {
  return process.env.RAZORPAY_WEBHOOK_SECRET;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${getRazorpayKeyId()}:${getRazorpayKeySecret()}`).toString("base64");

  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
      payment_capture: 1,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Razorpay order creation failed (${response.status}): ${body}`);
  }

  return (await response.json()) as RazorpayOrder;
}

function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Checkout's success handler returns these three fields; this is what proves the payment is real. */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const expected = hmacHex(
    getRazorpayKeySecret(),
    `${params.razorpayOrderId}|${params.razorpayPaymentId}`
  );
  return timingSafeEqualHex(expected, params.razorpaySignature);
}

/**
 * Webhook signature is HMAC-SHA256 of the *raw* request body using the
 * separate webhook secret configured in the Razorpay dashboard. Returns
 * false (never throws) if the secret isn't configured yet.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = getRazorpayWebhookSecret();
  if (!secret) return false;
  return timingSafeEqualHex(hmacHex(secret, rawBody), signature);
}

export function isWebhookSecretConfigured(): boolean {
  return Boolean(getRazorpayWebhookSecret());
}
