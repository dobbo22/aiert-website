import type { Metadata } from "next";
import { codeStatus } from "@/lib/tapcardOffers";
import RedeemForm from "./RedeemForm";

export const metadata: Metadata = { title: "Offer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  used: "Already used",
  expired: "This offer has ended",
  replaced: "This offer has been replaced",
  unknown: "Code not recognised",
};

// What the business sees when it scans a customer's offer QR code.
export default async function OfferCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = await codeStatus(code.toUpperCase());
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-center text-white ring-1 ring-white/10">
        {s.cardName ? <p className="text-sm text-white/80">{s.cardName}</p> : null}
        {s.offerText ? <h1 className="mt-2 text-xl font-bold">{s.offerText}</h1> : null}
        {s.state === "valid" ? (
          <RedeemForm code={code.toUpperCase()} />
        ) : (
          <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 font-semibold">
            {MESSAGES[s.state]}
            {s.state === "used" && s.redeemedAt ? ` on ${new Date(s.redeemedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}` : ""}
          </p>
        )}
      </div>
    </main>
  );
}
