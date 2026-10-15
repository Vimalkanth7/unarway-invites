import type { DesignConfig } from "@/types/template";

export type InvitationStatus = "draft" | "paid";

export interface InvitationRow {
  id: string;
  user_id: string;
  design_id: string;
  title: string;
  config: DesignConfig;
  short_id: string;
  status: InvitationStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = "created" | "paid" | "failed";

export interface OrderRow {
  id: string;
  invitation_id: string;
  user_id: string;
  amount: number;
  currency: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: OrderStatus;
  created_at: string;
}
