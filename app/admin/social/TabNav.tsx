"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/social", label: "Overview", exact: true },
  { href: "/admin/social/facebook", label: "Facebook" },
  { href: "/admin/social/instagram", label: "Instagram" },
  { href: "/admin/social/threads", label: "Threads" },
  { href: "/admin/social/linkedin", label: "LinkedIn", badge: "Soon" },
  { href: "/admin/social/reddit", label: "Reddit" },
  { href: "/admin/social/links", label: "Links & Invites" },
  { href: "/admin/social/walk-in", label: "Walk-in demo" },
  { href: "/admin/social/demo", label: "Demo leads" },
  { href: "/admin/social/funnel", label: "Setup funnel" },
  { href: "/admin/social/moderation", label: "Moderation" },
  { href: "/admin/social/verifications", label: "Verifications" },
  { href: "/admin/social/companies", label: "Companies" },
];

export default function TabNav() {
  const pathname = usePathname();
  // On a phone only the current page shows, with a Pages button that opens the rest.
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const current = TABS.find((t) => (t.exact ? pathname === t.href : pathname.startsWith(t.href))) ?? TABS[0];

  return (
    <>
      <button type="button" className="social-tabs-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{current.label}</span>
        <span aria-hidden="true">{open ? "▲" : "▼ Pages"}</span>
      </button>
      <nav className={`social-tabs ${open ? "social-tabs-open" : ""}`}>
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`social-tab ${active ? "social-tab-active" : ""}`}
            >
              {tab.label}
              {tab.badge && <span className="social-tab-badge">{tab.badge}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
