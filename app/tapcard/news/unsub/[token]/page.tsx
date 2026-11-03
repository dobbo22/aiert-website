import type { Metadata } from "next";
import { unsubscribeNews } from "@/lib/tapcardNews";

export const metadata: Metadata = { title: "TapCard news", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function UnsubscribeNews({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await unsubscribeNews(token).catch(() => false);
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">{ok ? "You're unsubscribed" : "That link didn't work"}</h1>
      <p className="mt-4">{ok ? "We won't send you TapCard news by email." : "It may have been mistyped. Email enquiries@aiert.co.uk and we'll remove you by hand."}</p>
    </main>
  );
}
