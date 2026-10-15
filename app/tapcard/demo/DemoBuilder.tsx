"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Link { kind: string; label: string; value: string }
interface Card {
  name: string; website: string; address: string; phone: string; links: Link[];
  facebookUrl: string; instagramUrl: string; twitterUrl: string; linkedInUrl: string; tiktokUrl: string; branchCount: number;
}

type Phase = "form" | "building" | "done";

// One row of the card, revealed in turn so the card visibly assembles itself.
interface Row { key: string; title: string; detail: string; color: string }

function rowsFor(card: Card): Row[] {
  const rows: Row[] = [];
  if (card.phone) rows.push({ key: "phone", title: "Call us", detail: card.phone, color: "#22C55E" });
  if (card.website) rows.push({ key: "web", title: "Website", detail: card.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), color: "#3B82F6" });
  if (card.address) rows.push({ key: "addr", title: "Find us", detail: card.address, color: "#F97316" });
  for (const l of card.links) rows.push({ key: `l-${l.kind}-${l.value}`, title: l.label, detail: l.kind === "hours" ? l.value : l.value.replace(/^https?:\/\/(www\.)?/, ""), color: l.kind === "hours" ? "#EAB308" : "#A855F7" });
  const socials: [string, string][] = [["Facebook", card.facebookUrl], ["Instagram", card.instagramUrl], ["X", card.twitterUrl], ["LinkedIn", card.linkedInUrl], ["TikTok", card.tiktokUrl]];
  for (const [n, u] of socials) if (u) rows.push({ key: `s-${n}`, title: n, detail: u.replace(/^https?:\/\/(www\.)?/, ""), color: "#EC4899" });
  return rows.slice(0, 9);
}

export default function DemoBuilder() {
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [emailed, setEmailed] = useState(true);
  const [shown, setShown] = useState(0);
  const [stage, setStage] = useState(0); // 0 blank, 1 name, 2 icon/pill, 3 rows, 4 qr
  const [qr, setQr] = useState("");
  const [typed, setTyped] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhase("building");
    setStage(0); setShown(0); setTyped("");
    try {
      const res = await fetch("/api/demo/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, website, email, consent, company: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPhase("form");
        setError(
          data.error === "rate_limited" ? "That's a lot of cards from one place today. Please try again tomorrow."
          : data.error === "email" ? "That email address doesn't look right."
          : data.error === "website" ? "That website address doesn't look right. Try something like yourbusiness.co.uk."
          : data.error === "consent" ? "Please tick the box so we can email your link."
          : "Something went wrong. Please try again.",
        );
        return;
      }
      const c = data.card as Card;
      setCard(c); setEmailed(data.emailed !== false);
      // The email carries /start/<token>; the on-page QR points at the same card.
      void QRCode.toDataURL(String(data.link ?? "https://tapcard.aiert.co.uk/"), { margin: 1, width: 200, color: { dark: "#111318", light: "#ffffff" } }).then(setQr);
      const rows = rowsFor(c);
      setStage(1);
      // Type the name in, then reveal the rest a step at a time.
      const full = c.name;
      full.split("").forEach((_, i) => later(i * 55, () => setTyped(full.slice(0, i + 1))));
      let t = full.length * 55 + 350;
      later(t, () => setStage(2));
      t += 700;
      later(t, () => setStage(3));
      rows.forEach((_, i) => later(t + (i + 1) * 650, () => setShown(i + 1)));
      t += (rows.length + 1) * 650 + 400;
      later(t, () => { setStage(4); setPhase("done"); });
    } catch {
      setPhase("form");
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  const rows = card ? rowsFor(card) : [];

  return (
    <section className="mt-10 grid items-start gap-10 md:grid-cols-2">
      <div>
        {phase === "form" || phase === "building" ? (
          <form onSubmit={submit} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
            <label className="block text-sm font-semibold text-cloud" htmlFor="biz">Business name</label>
            <input id="biz" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={phase === "building"}
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-[#111318]" placeholder="The Rose Garden" />
            <label className="mt-4 block text-sm font-semibold text-cloud" htmlFor="site">Website <span className="font-normal">(so we can build it from your own pages)</span></label>
            <input id="site" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} disabled={phase === "building"} inputMode="url"
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-[#111318]" placeholder="therosegardenflorists.co.uk" />
            <label className="mt-4 block text-sm font-semibold text-cloud" htmlFor="mail">Your email</label>
            <input id="mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} disabled={phase === "building"}
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-[#111318]" placeholder="you@yourbusiness.co.uk" />
            {/* Honeypot: hidden from people. */}
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} style={{ position: "absolute", left: "-9999px" }} name="company" />
            <label className="mt-4 flex items-start gap-3 text-sm text-cloud">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5" />
              <span>Email me my TapCard link. It's one email, not a mailing list. We keep your email and card details for 60 days. <a href="/privacy" className="text-gold underline">Privacy policy</a></span>
            </label>
            {error ? <p role="alert" className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">{error}</p> : null}
            <button type="submit" disabled={phase === "building" || !consent || name.trim().length < 2 || !email}
              className="btn-gold mt-5 w-full rounded-xl px-6 py-3 font-semibold disabled:opacity-50">
              {phase === "building" ? "Building your card…" : "Build my TapCard"}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
            <h2 className="text-2xl font-black text-cloud">{emailed ? "Your link is on its way" : "Your card is built"}</h2>
            <p className="mt-3 text-lg leading-relaxed text-cloud">
              {emailed
                ? <>We've emailed <strong>{email}</strong> a link. Open it on your phone, install TapCard, and your card is already built when you open the app.</>
                : <>We built your card but couldn't send the email just now. Please try again in a minute.</>}
            </p>
            {card && card.branchCount > 1 ? (
              <p className="mt-3 text-cloud">We found {card.branchCount} addresses on your website, so the app will ask which one this card is for.</p>
            ) : null}
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-cloud">
              <li>Open the email on your phone.</li>
              <li>Tap the link, then install TapCard (free).</li>
              <li>Open TapCard. Your card is there, ready to check and share.</li>
            </ol>
            <button onClick={() => { setPhase("form"); setCard(null); setStage(0); }} className="mt-5 text-gold underline">Try another business</button>
          </div>
        )}
      </div>

      {/* The phone: the card assembles itself as it is built. */}
      <div className="mx-auto w-full max-w-xs">
        <div className="rounded-[2.5rem] bg-black p-3 shadow-2xl ring-1 ring-white/20">
          <div className="min-h-[34rem] overflow-hidden rounded-[2rem] bg-[#111318] px-4 pb-6 pt-8 text-center text-white">
            {phase === "form" ? (
              <div className="flex h-[30rem] flex-col items-center justify-center text-white/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-16 w-16 rounded-2xl opacity-80" />
                <p className="mt-4 px-4 text-sm">Your card will build here.</p>
              </div>
            ) : phase === "building" && !card ? (
              <div className="flex h-[30rem] flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                <p className="mt-4 text-sm text-white/80">Reading your website…</p>
              </div>
            ) : (
              <div>
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-4xl transition-all duration-500" style={{ opacity: stage >= 2 ? 1 : 0, transform: stage >= 2 ? "scale(1)" : "scale(0.6)" }}>
                  <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" /></svg>
                </div>
                <h3 className="mt-4 min-h-[2rem] text-2xl font-bold">{typed}</h3>
                <span className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }}>Business</span>
                <ul className="mt-5 space-y-2 text-left">
                  {rows.slice(0, shown).map((r) => (
                    <li key={r.key} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2 [animation:fadein_0.5s_ease]">
                      <span className="h-8 w-8 flex-none rounded-full" style={{ background: r.color }} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{r.title}</span>
                        <span className="block truncate text-xs text-white/70">{r.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {stage >= 4 && qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="" className="mx-auto mt-5 h-32 w-32 rounded-xl bg-white p-2" />
                ) : null}
                {stage >= 4 ? <p className="mt-2 text-xs text-white/70">Anyone scans it and saves your card.</p> : null}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </section>
  );
}
