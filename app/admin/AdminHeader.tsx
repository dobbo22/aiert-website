"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./mailbroom/LogoutButton";

const SECTIONS = [
  { href: "/admin/social", label: "Social" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/outreach", label: "Outreach" },
  { href: "/admin/mailbroom", label: "Reviewers" },
];

// The Social pages that run TapCard (not MailBroom's own posting) carry the TapCard name and icon.
const TAPCARD_PAGES = ["/admin/social/walk-in", "/admin/social/demo", "/admin/social/funnel", "/admin/social/companies", "/admin/social/moderation", "/admin/social/verifications", "/admin/social/grants"];

export default function AdminHeader() {
  const pathname = usePathname();
  const tapcard = TAPCARD_PAGES.some((p) => pathname.startsWith(p));
  // On a phone the sections and Log out sit behind a menu button, so the page is not crowded.
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="nav-glass sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between gap-4">
        <Link href="/admin/social" className="flex items-center gap-3">
          <img
            src={tapcard ? "/tapcard-icon.png" : "/mailbroom-icon.png"}
            alt={tapcard ? "TapCard" : "MailBroom"}
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg"
          />
          <span className="font-bold text-lg tracking-tight text-cloud">
            {tapcard ? "TapCard" : "MailBroom"} <span className="text-mist font-medium">Admin</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
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

        <div className="hidden md:block">
          <LogoutButton />
        </div>

        <button
          type="button"
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-slate text-cloud"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate px-6 pb-4">
          <nav className="flex flex-col py-2">
            {SECTIONS.map((section) => {
              const active = pathname.startsWith(section.href);
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className={`rounded-lg px-3 py-3 text-lg font-semibold ${active ? "bg-white/10 text-gold" : "text-cloud"}`}
                >
                  {section.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 pt-2"><LogoutButton /></div>
        </div>
      )}
    </header>
  );
}
