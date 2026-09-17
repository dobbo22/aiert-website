"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/social", label: "Overview", exact: true },
  { href: "/admin/social/facebook", label: "Facebook" },
  { href: "/admin/social/instagram", label: "Instagram" },
  { href: "/admin/social/threads", label: "Threads" },
  { href: "/admin/social/linkedin", label: "LinkedIn", badge: "Soon" },
  { href: "/admin/social/links", label: "Link Clicks" },
];

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="social-tabs">
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
  );
}
