import type { Metadata } from "next";
import ReportForm from "./ReportForm";

export const metadata: Metadata = { title: "Report a TapCard", robots: { index: false, follow: false } };

// tapcard.aiert.co.uk/report?card=<id>: the form behind "Report this card" in the apps and on card pages.
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ card?: string }> }) {
  const { card = "" } = await searchParams;
  const id = /^[A-Za-z0-9_-]{16,40}$/.test(card) ? card : "";
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-[#111318] p-8 text-white ring-1 ring-white/10">
        <h1 className="text-xl font-bold">Report a TapCard</h1>
        {id ? <ReportForm card={id} /> : <p className="mt-4">Open this page from a card&apos;s Report link.</p>}
      </div>
    </main>
  );
}
