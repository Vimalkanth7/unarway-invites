import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import type { InvitationRow, OrderRow } from "@/types/invitation";

/**
 * Domain logic for turning an invitation into a paid one. Lives separately
 * from razorpay.ts (the gateway) because this part -- what a "paid order"
 * means for our own tables -- stays the same if the gateway is ever swapped.
 * Every write here uses the service-role client: order creation and payment
 * confirmation are security-sensitive and must not depend on the caller's
 * own session (the webhook has none at all).
 */

export async function createPendingOrder(params: {
  invitationId: string;
  userId: string;
  amountPaise: number;
  currency: string;
}): Promise<Pick<OrderRow, "id" | "razorpay_order_id">> {
  const razorpayOrder = await createRazorpayOrder({
    amountPaise: params.amountPaise,
    currency: params.currency,
    receipt: params.invitationId,
    notes: { invitation_id: params.invitationId, user_id: params.userId },
  });

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      invitation_id: params.invitationId,
      user_id: params.userId,
      amount: params.amountPaise,
      currency: params.currency,
      razorpay_order_id: razorpayOrder.id,
    })
    .select("id, razorpay_order_id")
    .single();
  if (error || !data) throw error ?? new Error("Could not create order row");

  return data;
}

/**
 * Marks the order (and its invitation) paid. Idempotent: the conditional
 * update only ever transitions a 'created' order to 'paid', so whichever of
 * the verify route or the webhook arrives first does the real write and the
 * other safely no-ops into the same success result.
 */
export async function markOrderPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<{ invitationId: string } | null> {
  const supabase = createSupabaseServiceRoleClient();

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ razorpay_payment_id: razorpayPaymentId, status: "paid" })
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("status", "created")
    .select("invitation_id")
    .maybeSingle<Pick<OrderRow, "invitation_id">>();
  if (error) throw error;

  if (updated) {
    const { error: invitationError } = await supabase
      .from("invitations")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", updated.invitation_id);
    if (invitationError) throw invitationError;
    return { invitationId: updated.invitation_id };
  }

  // Not a fresh transition -- check whether this is a retry of an already-paid order.
  const { data: existing, error: existingError } = await supabase
    .from("orders")
    .select("invitation_id, status")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle<Pick<OrderRow, "invitation_id" | "status">>();
  if (existingError) throw existingError;
  if (existing?.status === "paid") return { invitationId: existing.invitation_id };
  return null;
}

export async function getOrderByRazorpayId(
  razorpayOrderId: string
): Promise<Pick<OrderRow, "id" | "invitation_id" | "user_id" | "status"> | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("orders")
    .select("id, invitation_id, user_id, status")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle<Pick<OrderRow, "id" | "invitation_id" | "user_id" | "status">>();
  return data ?? null;
}

export function isInvitationExpired(
  invitation: Pick<InvitationRow, "paid_at">,
  expiryMonths: number
): boolean {
  if (!invitation.paid_at) return false;
  const expiry = new Date(invitation.paid_at);
  expiry.setMonth(expiry.getMonth() + expiryMonths);
  return Date.now() > expiry.getTime();
}
