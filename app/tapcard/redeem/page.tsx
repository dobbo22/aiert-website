import type { Metadata } from "next";
import RedeemLookup from "./RedeemLookup";

export const metadata: Metadata = { title: "Redeem an offer", robots: { index: false, follow: false } };

// For a till or PC with no camera: staff type the 10-character code shown under the customer's QR code.
export default function RedeemPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-center text-white ring-1 ring-white/10">
        <RedeemLookup />
      </div>
    </main>
  );
}
