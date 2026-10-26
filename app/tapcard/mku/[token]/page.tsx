import type { Metadata } from "next";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

// "Not interested? Unsubscribe" from the restaurant / cafe mailshot. A button (POST), not an automatic unsubscribe on page load,
// because link scanners in company mail systems open every link.
export default async function MkUnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111318] p-8 text-center text-white ring-1 ring-white/10">
        {done ? (
          <>
            <h1 className="text-xl font-bold">Done</h1>
            <p className="mt-3 text-white/80">You won&apos;t get any more emails from Martin at Aiert.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Stop these emails?</h1>
            <p className="mt-3 text-white/80">Martin at Aiert won&apos;t send you any more emails about TapCard.</p>
            <form method="post" action={`/api/mk-unsub/${token}`}>
              <button type="submit" className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-semibold text-[#111318]">Yes, stop them</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
