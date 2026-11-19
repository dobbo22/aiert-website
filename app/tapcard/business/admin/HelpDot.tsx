import { manualHref } from "@/lib/guideLinks";
import type { GuideRole } from "@/lib/guideRoles";

/// A small "?" beside a heading that opens the part of the manual explaining it, for the reader's role. For the setup guide pass `setupAnchor`.
export default function HelpDot({ anchor, setupAnchor, role = "company-senior", label }: { anchor?: string; setupAnchor?: string; role?: GuideRole; label: string }) {
  const href = setupAnchor ? `/business/investor-guide/setup#${setupAnchor}` : manualHref(role, anchor ?? "");
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={label} aria-label={label}
      className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold align-middle text-xs font-black text-black no-underline">?</a>
  );
}
