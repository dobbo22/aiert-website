// Which part of the investor-relations manual or setup guide explains the page someone is on (the "Help with this page" link).
// Pure, so it can be tested. Anchors are the ids in app/tapcard/business/investor-guide/{RoleManuals.tsx,page.tsx,setup/page.tsx}.
import type { GuideRole } from "@/lib/tapcardGuideRole";

export interface HelpTarget { href: string; label: string }
const GUIDE = "/business/investor-guide";

// Tasks that exist only for senior roles: a general admin or adviser is pointed at the closest thing they can use.
const GENERAL_FALLBACK: Record<string, string> = { "post-regulatory": "regulatory-general", approve: "not-allowed", seniors: "not-allowed", advisers: "not-allowed", withdraw: "not-allowed", audit: "not-allowed", "take-over-billing": "not-allowed" };
const ADVISER_MAP: Record<string, string> = { "post-general": "post-adviser", "post-regulatory": "post-adviser", approve: "post-adviser", groups: "groups-adviser" };

/// The address of one task in the manual, for the given role (falling back to the nearest task that role can use).
export function manualHref(role: GuideRole, anchor: string): string { return manual(role, anchor, "").href; }

function manual(role: GuideRole, anchor: string, label: string): HelpTarget {
  let a = anchor;
  if (role === "company-general" && GENERAL_FALLBACK[a]) a = GENERAL_FALLBACK[a];
  if ((role === "adviser-senior" || role === "adviser-general") && ADVISER_MAP[a]) a = ADVISER_MAP[a];
  if (role === "adviser-general" && a === "ask") a = "signin"; // only senior staff ask companies for access
  return { href: `${GUIDE}?as=${role}${a ? `#${a}` : "#manual"}`, label };
}
const setup = (anchor: string, label: string): HelpTarget => ({ href: `${GUIDE}/setup#${anchor}`, label });

/// `path` is the page address without the host (either /business/admin/... or /tapcard/business/admin/...), `tab` the News tab if any.
export function helpFor(path: string, tab: string | null, role: GuideRole): HelpTarget {
  const p = path.replace(/^\/tapcard/, "").replace(/\/+$/, "");
  if (p.startsWith("/business/adviser")) {
    if (p === "/business/adviser") return manual(role, "ask", "Help with the adviser portal");
    if (tab === "audiences") return manual(role, "groups", "Help with groups");
    if (tab === "approvals") return manual(role, "post-regulatory", "Help with approvals");
    return manual(role, "post-general", "Help with posting a headline");
  }
  if (p === "/business/admin/setup") return setup("steps", "Help with the guided setup");
  if (p === "/business/admin/news") {
    switch (tab) {
      case "audiences": return manual(role, "groups", "Help with groups");
      case "approvals": return manual(role, "approve", "Help with approvals");
      case "people": return manual(role, "seniors", "Help with who can post, and advisers");
      case "audit": return manual(role, "audit", "Help with the audit trail");
      default: return manual(role, "post-regulatory", "Help with posting a headline");
    }
  }
  if (p === "/business/admin/followers" || p === "/business/admin/insights") return manual(role, "followers", "Help with followers and numbers");
  if (p === "/business/admin/cards") return manual(role, "cards", "Help with cards, QR codes and events");
  if (p === "/business/admin/billing") return setup("who-pays", "Help with billing and who pays");
  if (p === "/business/admin/admins" || p === "/business/admin/settings") return setup("roles", "Help with admins and roles");
  if (p === "/business/admin") return setup("steps", "Help with getting started");
  return manual(role, "", "Help");
}
