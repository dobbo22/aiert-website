// Types and labels for the scheduled-post queue that are safe to import in the browser (no database or API code).
import type { PollInput } from "./linkedinPoll";

export type Target = "linkedin_page" | "linkedin_person" | "facebook";
export const TARGETS: Target[] = ["linkedin_page", "linkedin_person", "facebook"];
export const TARGET_LABEL: Record<Target, string> = { linkedin_page: "LinkedIn: AIERT LTD page", linkedin_person: "LinkedIn: Martin personally", facebook: "Facebook: TapCard Page" };

export type QueueRow = {
  id: number;
  run_at: string;
  status: "pending" | "sending" | "sent" | "partial" | "failed" | "cancelled";
  targets: Target[];
  kind: "post" | "poll" | "document";
  body: string;
  media_url: string | null;
  media_name: string | null;
  poll: PollInput | null;
  results: Record<string, { ok: boolean; url?: string; error?: string }> | null;
};
