import type { Metadata } from "next";
import DemoBuilder from "./DemoBuilder";

const TITLE = "See your TapCard built in seconds";
const DESCRIPTION = "Type your business name, website and email. Watch TapCard build your digital business card from your own website, then get a link that opens it ready-made in the app.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://tapcard.aiert.co.uk/demo" },
};

export default function DemoPage() {
  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-cloud">TapCard</span>
        </header>
        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">Try it with your business</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-cloud sm:text-5xl">{TITLE}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-cloud">{DESCRIPTION}</p>
        </section>
        <DemoBuilder />
        <footer className="mt-16 border-t border-slate pt-6 text-sm text-cloud">
          <a href="/business" className="text-gold underline">TapCard for Business</a> ·{" "}
          <a href="/promote" className="text-gold underline">TapCard Promote</a> ·{" "}
          <a href="/privacy" className="text-gold underline">Privacy policy</a> · AIERT Ltd
        </footer>
      </div>
    </main>
  );
}
