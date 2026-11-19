import type { GuideRole } from "@/lib/tapcardGuideRole";

export const ROLE_INFO: Record<GuideRole, { label: string; who: string; summary: string }> = {
  "company-senior": { label: "Company: senior admin", who: "For example the CEO, CFO or company secretary.", summary: "Posts regulatory and general headlines, approves others' drafts, and controls who can do what, including advisers." },
  "company-general": { label: "Company: general admin", who: "For example the IR manager or a communications colleague.", summary: "Writes general headlines, manages groups and looks after cards and QR codes. Regulatory headlines go to a senior admin." },
  "adviser-senior": { label: "Adviser: senior staff", who: "A senior member of an IR firm or broker.", summary: "Works for the companies that approved the firm, signs the firm up and pays, and may handle regulatory news where a company allows it." },
  "adviser-general": { label: "Adviser: general staff", who: "Other staff at an IR firm or broker.", summary: "Writes general headlines and manages groups for approved companies. Regulatory news is for senior staff." },
  shareholder: { label: "Shareholder", who: "Someone who follows a company on TapCard.", summary: "Scans a code, chooses what to share, and gets the company's headlines on their phone." },
};
