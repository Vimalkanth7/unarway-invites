"use client";

import { useState } from "react";

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: unknown) => void) => void;
}

interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay checkout")));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

type PayState = "idle" | "paying" | "success" | "failed" | "cancelled";

export function PayButton({
  price,
  getInvitationId,
  onPaid,
}: {
  price: number;
  getInvitationId: () => Promise<string>;
  onPaid: () => void;
}) {
  const [state, setState] = useState<PayState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function verifyPayment(response: RazorpayPaymentResponse) {
    try {
      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(response),
      });
      const result = (await res.json()) as { status?: string; error?: string };
      if (!res.ok || result.status !== "paid") throw new Error(result.error ?? "Could not verify payment");
      setState("success");
      onPaid();
    } catch (err) {
      console.error("Payment verification failed:", err);
      setState("failed");
      setMessage(err instanceof Error ? err.message : "Could not verify your payment.");
    }
  }

  async function startPayment() {
    setState("paying");
    setMessage(null);
    try {
      const invitationId = await getInvitationId();

      const orderRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const order = (await orderRes.json()) as Partial<CreateOrderResponse> & { error?: string };
      if (!orderRes.ok || !order.orderId || !order.keyId || !order.amount || !order.currency) {
        throw new Error(order.error ?? "Could not start checkout");
      }

      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error("Razorpay checkout did not load");

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Unarway Invites",
        handler: (response) => {
          void verifyPayment(response);
        },
        modal: {
          ondismiss: () => {
            setState((current) => (current === "paying" ? "cancelled" : current));
          },
        },
      });
      checkout.on("payment.failed", (response: unknown) => {
        console.error("Razorpay payment failed:", response);
        setState("failed");
        setMessage("The payment didn't go through.");
      });
      checkout.open();
    } catch (err) {
      console.error("Checkout failed to start:", err);
      setState("failed");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={startPayment}
        disabled={state === "paying"}
        className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {state === "paying" ? "Processing…" : `Pay ₹${price} to download`}
      </button>
      {state === "cancelled" && <p className="text-xs text-neutral-500">Payment cancelled.</p>}
      {state === "failed" && (
        <p className="text-xs text-red-600">{message ?? "Payment failed."} Try again.</p>
      )}
    </div>
  );
}
