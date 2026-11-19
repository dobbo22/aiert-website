"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { helpFor } from "@/lib/guideLinks";
import type { GuideRole } from "@/lib/guideRoles";

/// The "? Help with this page" button in the header of the investor-relations admin and adviser portal: it opens the part of the
/// manual (for the reader's role) or the setup guide that explains the page they are on, including the News tab.
export default function PageHelp({ role }: { role: GuideRole }) {
  const path = usePathname();
  const tab = useSearchParams().get("tab");
  const t = helpFor(path, tab, role);
  return (
    <a href={t.href} target="_blank" rel="noopener noreferrer" title={t.label}
      className="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate hover:ring-mist">
      <span aria-hidden="true" className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-black text-black">?</span>{t.label}
    </a>
  );
}
