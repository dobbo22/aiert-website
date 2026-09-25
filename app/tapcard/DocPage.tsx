import type { ReactNode } from "react";

// Shared shell for TapCard's policy/support pages (served at
// tapcard.aiert.co.uk/privacy and /support via proxy.ts). Body text stays
// full-strength (text-cloud) rather than a muted grey, for contrast.
export default function DocPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <a href="/support" className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard</span>
        </a>

        <h1 className="mt-8 text-3xl font-black tracking-tight text-cloud">{title}</h1>
        {updated && <p className="mt-2 text-sm text-cloud">Last updated: {updated} · AIERT Ltd</p>}

        <div className="mt-8 space-y-6 text-cloud leading-relaxed [&_a]:text-gold [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>

        <footer className="mt-12 border-t border-slate pt-6 text-sm text-cloud">
          <p>
            TapCard is made by AIERT Ltd, registered in England &amp; Wales, No. 16587000.{" "}
            <a href="/privacy" className="text-gold underline">Privacy</a> ·{" "}
            <a href="/support" className="text-gold underline">Support</a> ·{" "}
            <a href="mailto:enquiries@aiert.co.uk" className="text-gold underline">enquiries@aiert.co.uk</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
