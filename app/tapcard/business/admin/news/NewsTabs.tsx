import Link from "next/link";

export interface NewsTab { id: string; label: string; badge?: number }

/// The tab bar of the headlines screens (company admin and adviser portal). Plain links: the tab is in the address (?tab=), so it can be
/// bookmarked and linked from emails and the manual. A badge shows how many things need someone.
export default function NewsTabs({ base, tabs, active }: { base: string; tabs: NewsTab[]; active: string }) {
  return (
    <nav aria-label="Headlines sections" className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <Link key={t.id} href={`${base}?tab=${t.id}`} aria-current={t.id === active ? "page" : undefined}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 ${t.id === active ? "bg-gold text-black ring-gold" : "bg-white/[0.06] text-cloud ring-white/15 hover:ring-white/40"}`}>
          {t.label}
          {t.badge ? <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${t.id === active ? "bg-black text-gold" : "bg-gold text-black"}`}>{t.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
