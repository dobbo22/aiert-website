"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/business/admin", label: "Overview" },
  { href: "/business/admin/template", label: "Card template" },
  { href: "/business/admin/employees", label: "Employees" },
  { href: "/business/admin/billing", label: "Billing" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-6 flex gap-2 border-b border-slate pb-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              active ? "bg-charcoal text-gold" : "text-cloud hover:text-gold"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
