"use client";

import { useRouter, useSearchParams } from "next/navigation";

/// On a company's page: jump to another company (keeping the tab), or step to the previous or next one. For firms with many clients.
export default function ClientSwitcher({ current, companies }: { current: string; companies: { orgId: string; name: string; badge?: number }[] }) {
  const router = useRouter();
  const tab = useSearchParams().get("tab");
  const i = companies.findIndex((c) => c.orgId === current);
  const go = (orgId: string) => router.push(`/business/adviser/${orgId}${tab ? `?tab=${tab}` : ""}`);
  const btn = "rounded-xl px-3 py-2 text-sm font-semibold text-cloud ring-1 ring-slate disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Switch company">
      <a href="/business/adviser" className="text-gold underline">← All companies</a>
      <span className="flex-1" />
      <button type="button" className={btn} disabled={i <= 0} onClick={() => go(companies[i - 1].orgId)} aria-label="Previous company">‹</button>
      <select aria-label="Company" value={current} onChange={(e) => go(e.target.value)} className="max-w-[22rem] rounded-lg bg-white px-3 py-2 text-[#111318]">
        {companies.map((c) => <option key={c.orgId} value={c.orgId}>{c.badge ? `${c.name} · ${c.badge} to approve` : c.name}</option>)}
      </select>
      <button type="button" className={btn} disabled={i < 0 || i >= companies.length - 1} onClick={() => go(companies[i + 1].orgId)} aria-label="Next company">›</button>
    </div>
  );
}
