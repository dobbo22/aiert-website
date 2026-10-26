"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/marketing", label: "Search & signups", exact: true },
  { href: "/admin/marketing/restaurants", label: "Restaurants & cafes" },
];

/// The tabs under the Marketing heading: MailBroom search and signups, and the restaurant / cafe mailshot with its results.
export default function MarketingTabs() {
  const pathname = usePathname();
  return (
    <nav className="social-tabs" style={{ marginBottom: "1.25rem" }}>
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`social-tab ${active ? "social-tab-active" : ""}`}>{t.label}</Link>
        );
      })}
    </nav>
  );
}
