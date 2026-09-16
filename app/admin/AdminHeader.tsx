"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./mailbroom/LogoutButton";

const SECTIONS = [
  { href: "/admin/social", label: "Social" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/mailbroom", label: "Reviewers" },
];

export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="nav-glass sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/admin/social" className="flex items-center gap-3">
          <img
            src="/mailbroom-icon.png"
            alt="MailBroom"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg"
          />
          <span className="font-bold text-lg tracking-tight text-cloud">
            MailBroom <span className="text-mist font-medium">Admin</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {SECTIONS.map((section) => {
            const active = pathname.startsWith(section.href);
            return (
              <Link
                key={section.href}
                href={section.href}
                className={`admin-nav-link ${active ? "admin-nav-link-active" : ""}`}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>

        <LogoutButton />
      </div>
    </header>
  );
}
