import type { Metadata } from "next";
import Link from "next/link";

// Shown when a card link leads nowhere: a mistyped link, or a card its owner or company has removed. A scanned QR code for a removed
// card used to land on the plain "404 This page could not be found" page.
export const metadata: Metadata = {
  title: "This card isn't available",
  robots: { index: false, follow: false },
};

export default function CardNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e14] px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-[#111318] text-center shadow-xl ring-1 ring-white/10">
        <div className="h-24 bg-gradient-to-br from-[#1e2a5a] to-[#4b2a7b]" />
        <div className="px-6 pb-8">
          <div className="-mt-9 mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white/15 text-3xl font-bold text-white ring-4 ring-[#111318]" aria-hidden="true">
            ?
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">This card isn&apos;t available</h1>
          <p className="mt-3 text-white">
            The link may have been typed wrongly, or the person or company has removed this card. If you were given it in person, ask them for a new QR code or link.
          </p>
          <Link href="/" className="mt-6 inline-block w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318]">
            About TapCard
          </Link>
        </div>
      </div>
    </main>
  );
}
