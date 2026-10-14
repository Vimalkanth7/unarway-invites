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
  created_at: string;
  updated_at: string;
}
