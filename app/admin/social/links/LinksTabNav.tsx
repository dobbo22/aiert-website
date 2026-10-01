"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/social/links", label: "Send invites", exact: true },
  { href: "/admin/social/links/track", label: "Track invites" },
  { href: "/admin/social/links/clicks", label: "Link clicks" },
];

export default function LinksTabNav() {
  const pathname = usePathname();
  return (
    <nav className="social-tabs invite-subtabs">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`social-tab ${active ? "social-tab-active" : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
