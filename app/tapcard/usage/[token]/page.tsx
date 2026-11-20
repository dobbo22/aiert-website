import { notFound } from "next/navigation";
import { usageForToken } from "@/lib/tapcardUsage";
import UsageView from "../../business/admin/usage/UsageView";

export const dynamic = "force-dynamic";
export const metadata = { title: "TapCard usage", robots: { index: false, follow: false } };

// A read-only usage report for a company, opened from a link the company made. Counts only; the company can revoke the link at any time.
export default async function UsageLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await usageForToken(token).catch(() => null);
  if (!r) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wider text-teal">TapCard for Business: usage</p>
      <h1 className="mt-1 text-3xl font-black text-cloud">{r.company}</h1>
      <div className="mt-6"><UsageView r={r} /></div>
      <p className="mt-8 text-sm text-cloud">
        This page is read-only. <a className="text-gold underline" href={`/api/usage/${token}?format=csv`}>Download as CSV</a> ·{" "}
        <a className="text-gold underline" href={`/api/usage/${token}`}>As JSON</a>
      </p>
    </main>
  );
}
