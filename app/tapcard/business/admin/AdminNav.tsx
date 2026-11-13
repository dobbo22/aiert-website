"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MANAGER_TABS = ["/business/admin", "/business/admin/qr-sign", "/business/admin/employees", "/business/admin/promote"];
const TABS = [
  { href: "/business/admin", label: "Overview" },
  { href: "/business/admin/template", label: "Card template" },
  { href: "/business/admin/locations", label: "Locations" },
  { href: "/business/admin/qr-sign", label: "QR sign" },
  { href: "/business/admin/employees", label: "Employees" },
  { href: "/business/admin/promote", label: "Offers & numbers" },
  { href: "/business/admin/followers", label: "Followers" },
  { href: "/business/admin/admins", label: "Admins" },
  { href: "/business/admin/billing", label: "Billing" },
];

// A listed company (investor relations) has no shops or staff: its tabs are the numbers, who shared, posting a headline, and its cards.
const LISTED_TABS = [
  { href: "/business/admin", label: "Overview" },
  { href: "/business/admin/followers", label: "Followers" },
  { href: "/business/admin/news", label: "Post news" },
  { href: "/business/admin/cards", label: "Cards & QR" },
  { href: "/business/admin/employees", label: "People" },
  { href: "/business/admin/admins", label: "Admins" },
  { href: "/business/admin/billing", label: "Billing" },
];

export default function AdminNav({ role = "admin", listed = false, current }: { role?: "admin" | "manager"; listed?: boolean; current?: string }) {
  const livePath = usePathname();
  const pathname = current ?? livePath;
  const tabs = (listed ? LISTED_TABS : TABS).filter((t) => role === "admin" || MANAGER_TABS.includes(t.href));
  // The Overview tab is only active on its own page; every other tab is active on its page and anything beneath it.
  const isActive = (href: string) => (href === "/business/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  return (
    <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              active ? "bg-gold text-black shadow" : "bg-white/10 text-cloud ring-1 ring-white/15 hover:bg-white/20 hover:text-gold"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
