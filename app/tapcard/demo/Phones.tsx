"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import ContactIcon from "../ContactIcon";
import type { Row } from "./DemoBuilder";
import { offersFor } from "./demoOffers";

// Two phones: the business (left) and Alex Morgan, an anonymous customer (right). The screens scroll inside a fixed-size
// phone. After the card is built, buttons play the story: share the card, send an offer, use the offer.


type AView = "card" | "qr" | "saved" | "offerForm" | "offerLive" | "staff" | "used";
type BView = "idle" | "scanning" | "received" | "saved" | "follow" | "contacts" | "push" | "offer" | "claimed" | "used";

function TabBar({ active }: { active: "cards" | "contacts" }) {
  const tab = (id: "cards" | "contacts", text: string, icon: React.ReactNode) => (
    <span className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold ${active === id ? "bg-white/15 text-blue-300" : "text-white/70"}`}>{icon}{text}</span>
  );
  return (
    <div className="absolute inset-x-3 bottom-3 z-10 flex gap-1 rounded-2xl bg-[#1c1f27]/95 p-1 shadow-lg ring-1 ring-white/10 backdrop-blur">
      {tab("cards", "My Cards", <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" /></svg>)}
      {tab("contacts", "Contacts", <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>)}
    </div>
  );
}

function Phone({ label, children, overlay, tab }: { label: string; children: React.ReactNode; overlay?: React.ReactNode; tab?: "cards" | "contacts" }) {
  return (
    <div className="w-full max-w-[17rem]">
      <p className="mb-2 text-center text-sm font-semibold text-cloud">{label}</p>
      <div className="rounded-[2.2rem] bg-black p-2.5 shadow-2xl ring-1 ring-white/20">
        {/* Fixed height: the screen scrolls, it never grows. A tapped link opens over the screen, like an in-app browser. */}
        <div className="relative h-[34rem] overflow-hidden rounded-[1.8rem] bg-[#111318] text-white">
          <div className={`h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${tab ? "pb-20" : ""}`}>{children}</div>
          {tab ? <TabBar active={tab} /> : null}
          {overlay}
        </div>
      </div>
    </div>
  );
}

// The business's own banner logo and favicon, from its website (same endpoints the app and card page use).
function domainOf(website: string): string {
  try { return new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function CardFace({ name, kind, typed, stage, rows, socials, interactive, domain, onOpen }: {
  name: string; kind: string; typed: string; stage: number; rows: Row[]; socials: Row[]; interactive: boolean; domain: string; onOpen: (r: Row) => void;
}) {
  // A tap opens inside the phone; a modified click (new tab) still goes to the real page.
  const tap = (r: Row) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    onOpen(r);
  };
  const [logoFailed, setLogoFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const d = encodeURIComponent(domain);
  return (
    <div className="pb-6 text-center">
      <div className="flex h-28 items-start justify-center bg-gradient-to-br from-[#2b2f77] to-[#111318] px-6 pt-3">
        {domain && !logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/logo?domain=${d}`} alt="" onLoad={() => setLogoLoaded(true)} onError={() => setLogoFailed(true)} className={`max-w-full rounded-md object-contain [animation:fadein_0.6s_ease] ${logoLoaded ? "max-h-20" : "max-h-14"}`} />
        ) : null}
      </div>
      <div className="px-4">
      {/* One brand mark only: the banner logo when the site has one; otherwise the round favicon avatar (or a shop icon). */}
      {!logoLoaded ? (
        <div className="-mt-7 mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#1c1f27] ring-4 ring-[#111318] transition-all duration-500" style={{ opacity: stage >= 2 ? 1 : 0, transform: stage >= 2 ? "scale(1)" : "scale(0.6)" }}>
          {domain && !iconFailed ? (
            // A favicon of 16 or 32 pixels (often a website builder's default) looks poor and may not be theirs: use the shop icon instead.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/favicon?domain=${d}`} alt=""
              onLoad={(e) => { if (e.currentTarget.naturalWidth > 0 && e.currentTarget.naturalWidth <= 32) setIconFailed(true); }}
              onError={() => setIconFailed(true)} className="h-12 w-12 object-contain"
            />
          ) : (
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" /></svg>
          )}
        </div>
      ) : null}
      <h3 className={`${logoLoaded ? "mt-4" : "mt-3"} min-h-[1.75rem] text-xl font-bold`}>{typed || name}</h3>
      <span className="mt-1 inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }}>{kind || "Business"}</span>
      <ul className="mt-4 space-y-2 text-left">
        {rows.map((r) => {
          const inner = (
            <>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full" style={{ background: r.color }}><ContactIcon name={r.icon} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{r.title}</span>
                {r.linkOnly ? null : <span className="block truncate text-xs text-white/70">{r.detail}</span>}
              </span>
            </>
          );
          const cls = "flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2 [animation:fadein_0.5s_ease]";
          return (
            <li key={r.key}>
              {r.href && interactive ? <a href={r.href} onClick={tap(r)} target="_blank" rel="noopener noreferrer" className={`${cls} transition hover:bg-white/20`}>{inner}</a> : <div className={cls}>{inner}</div>}
            </li>
          );
        })}
      </ul>
      {socials.length > 0 ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider">Tap an icon to follow</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            {socials.map((r) => (
              <a key={r.key} href={interactive ? r.href : undefined} onClick={interactive ? tap(r) : undefined} target="_blank" rel="noopener noreferrer" aria-label={r.title} title={r.title}
                className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-white/15 [animation:fadein_0.5s_ease]" style={{ background: r.color }}>
                <ContactIcon name={r.icon} large />
              </a>
            ))}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

// A tapped link, opened over the phone's screen. Pages that allow it are shown for real; the rest (Facebook, Instagram,
// X, Maps refuse to be framed) get a preview page, so it never shows a blank box.
function InPhoneBrowser({ row, name, website, onClose }: { row: Row; name: string; website: string; onClose: () => void }) {
  const isCall = !!row.href?.startsWith("tel:");
  const url = row.href && !isCall ? row.href : "";
  const hostOf = (u: string) => { try { return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
  const host = hostOf(url);
  // The business's own pages are shown as a snapshot inside the screen; Facebook, Instagram, X and Maps can't be, so
  // those get a preview page.
  const ownPage = !!url && /^https:\/\//i.test(url) && !!host && host === hostOf(website) && !row.social;
  const [loaded, setLoaded] = useState(false);
  const social = !!row.social;
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#f2f3f5] text-[#111318] [animation:fadein_0.25s_ease]">
      <div className="flex items-center gap-2 bg-white px-3 py-2 text-xs shadow">
        <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e5e7eb] text-sm font-bold">✕</button>
        <span className="min-w-0 flex-1 truncate rounded-full bg-[#eef0f3] px-3 py-1.5 text-center font-medium">{isCall ? "Phone" : `🔒 ${host || row.title}`}</span>
        {url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open in a new tab" className="px-1 text-sm">↗</a> : <span className="w-4" />}
      </div>
      <div className="relative min-h-0 flex-1">
        {isCall ? (
          <div className="flex h-full flex-col items-center justify-center bg-[#111318] px-6 text-center text-white">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500"><ContactIcon name="phone" large /></span>
            <p className="mt-4 text-xl font-bold">{name}</p>
            <p className="text-sm text-white/70">{row.detail}</p>
            <p className="mt-6 text-sm text-white/70">Calling…</p>
          </div>
        ) : ownPage ? (
          <>
            {!loaded ? <div className="absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-black/60" /></div> : null}
            <iframe
              src={`/api/demo/page?url=${encodeURIComponent(url)}&site=${encodeURIComponent(website)}`}
              title={row.title} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer"
              onLoad={() => setLoaded(true)} className="h-full w-full border-0 bg-white"
            />
          </>
        ) : (
          <div className="flex h-full flex-col items-center overflow-y-auto px-5 pt-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: row.color }}><ContactIcon name={row.icon} large /></span>
            <p className="mt-4 text-lg font-bold">{row.title}</p>
            <p className="text-sm font-semibold">{name}</p>
            <p className="mt-1 max-w-full truncate text-xs text-[#555]">{row.detail}</p>
            {social ? <div className="mt-4 rounded-full bg-[#0866FF] px-8 py-2 text-sm font-semibold text-white">Follow</div> : null}
            {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="mt-5 rounded-xl bg-[#111318] px-5 py-2 text-sm font-semibold text-white">Open it for real ↗</a> : null}
            <p className="mt-4 text-[11px] leading-snug text-[#666]">{social ? "In the app this opens the profile, ready to follow." : "In the app this opens the page."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AppBar({ title, buttons = false }: { title: string; buttons?: boolean }) {
  const circle = (d: string) => (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  );
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-[#111318]/95 px-3 pb-2 pt-4 text-center backdrop-blur">
      {buttons ? circle("M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10") : <span className="w-8" />}
      <span className="min-w-0 flex-1 truncate px-2 text-sm font-semibold">{title}</span>
      {buttons ? circle("M5 12h.01M12 12h.01M19 12h.01") : <span className="w-8" />}
    </div>
  );
}

// The buttons under the card in the app: share, then (once Promote is set up) the offer panel.
function CardActions({ onShare, onOffer, offerReady, offerLive, disabled }: { onShare: () => void; onOffer: () => void; offerReady: boolean; offerLive: boolean; disabled: boolean }) {
  return (
    <div className="space-y-3 px-4 pb-4">
      <button type="button" disabled={disabled} onClick={onShare} className="w-full rounded-2xl bg-blue-500 py-3 text-sm font-semibold disabled:opacity-60">▦ Share my card</button>
      <p className="text-center text-xs font-semibold text-blue-300">No signal? Offline QR</p>
      <div className="rounded-2xl bg-white/10 p-3 text-left">
        <p className="text-sm font-semibold">Promote your business</p>
        <p className="mt-1 text-xs text-white/70">{offerLive ? "Your offer is live. Everyone who follows you was notified." : "Offer your customers a discount. They claim it from your card and get a one-off QR code to show your staff."}</p>
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={disabled || !offerReady} onClick={onOffer} className="flex-1 rounded-xl bg-white/15 py-2 text-xs font-semibold disabled:opacity-50">Create an offer</button>
          <span className="flex-1 rounded-xl bg-white/15 py-2 text-center text-xs font-semibold opacity-60">Post news</span>
        </div>
      </div>
    </div>
  );
}

function Toast({ children }: { children: React.ReactNode }) {
  return <div className="mx-3 mt-2 rounded-2xl bg-white/15 px-3 py-2 text-left text-xs [animation:fadein_0.4s_ease]">{children}</div>;
}

function Tick({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex h-full min-h-[30rem] flex-col items-center justify-center bg-green-600 px-6 text-center" role="status">
      <svg viewBox="0 0 24 24" className="h-28 w-28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" /></svg>
      <p className="mt-3 text-xl font-bold">{label}</p>
      {sub ? <p className="mt-1 text-sm">{sub}</p> : null}
    </div>
  );
}

export default function Phones({ name, website, kind, built, stage, typed, rows, socials, buildSpinner, idleText }: {
  name: string; website: string; kind: string; built: boolean; stage: number; typed: string; rows: Row[]; socials: Row[]; buildSpinner: boolean; idleText: string;
}) {
  const domain = domainOf(website);
  const [caption, setCaption] = useState<{ step: number; text: string } | null>(null);
  const [hint, setHint] = useState<{ step: number; text: string } | null>(null);
  const [browseA, setBrowseA] = useState<Row | null>(null);
  const [browseB, setBrowseB] = useState<Row | null>(null);
  const openA = (r: Row) => setBrowseA(r);
  const openB = (r: Row) => setBrowseB(r);
  const [aView, setAView] = useState<AView>("card");
  const [bView, setBView] = useState<BView>("idle");
  const [reached, setReached] = useState(1); // the furthest step whose button is showing: 1 share, 2 offer, 3 use
  const revealed = built ? reached : 0;
  const [running, setRunning] = useState(false);
  const suggestions = offersFor(kind);
  const [offerOverride, setOffer] = useState<string | null>(null);
  const offer = offerOverride ?? suggestions[0];
  const [typedOffer, setTypedOffer] = useState("");
  const [pin, setPin] = useState("");
  const [code] = useState(() => Array.from({ length: 10 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join(""));
  const [codeQr, setCodeQr] = useState("");
  const [cardQr, setCardQr] = useState("");

  useEffect(() => {
    void QRCode.toDataURL("https://tapcard.aiert.co.uk/demo", { margin: 1, width: 200, color: { dark: "#111318", light: "#ffffff" } }).then(setCardQr);
    void QRCode.toDataURL(`https://tapcard.aiert.co.uk/o/${code}`, { margin: 1, width: 200, color: { dark: "#111318", light: "#ffffff" } }).then(setCodeQr);
  }, [code]);

  // A story is a list of scenes. By default it is a click-through: each scene with text settles for a moment, then Next lights
  // up (green) and waits to be pressed. With Auto-play on, the scene instead moves on by itself after enough time to read it
  // (about 3 seconds plus 55 ms a letter). A scene without text is a quick animation step (typing).
  const runRef = useRef(0);
  const autoRef = useRef(false);
  const skipRef = useRef(false);
  const [auto, setAutoState] = useState(false);
  const [ready, setReady] = useState(false);
  const [scene, setScene] = useState<{ i: number; n: number } | null>(null);
  type Scene = { run: () => void; step?: number; text?: string; hold?: number; settle?: number };
  const setAuto = (v: boolean) => { autoRef.current = v; setAutoState(v); };
  useEffect(() => () => { runRef.current += 1; }, []);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function runScenes(scenes: Scene[], then?: () => void) {
    const id = ++runRef.current;
    setRunning(true);
    setReady(false);
    const textScenes = scenes.filter((x) => x.text).length;
    let shown = 0;
    for (const sc of scenes) {
      if (runRef.current !== id) return;
      sc.run();
      if (!sc.text) { await sleep(sc.hold ?? 80); continue; }
      shown += 1;
      setCaption({ step: sc.step ?? 0, text: sc.text });
      setScene({ i: shown, n: textScenes });
      setReady(false);
      skipRef.current = false;
      // The screen settles (an animation finishes, a person has a moment to look), then it is ready for Next.
      const settle = sc.settle ?? 1100;
      for (let t = 0; t < settle; t += 50) { await sleep(50); if (runRef.current !== id) return; if (skipRef.current) break; }
      setReady(true);
      let left = Math.max(1500, (sc.hold ?? Math.max(4500, 3000 + sc.text.length * 55)) - settle);
      while (!skipRef.current) {
        await sleep(50);
        if (runRef.current !== id) return;
        if (autoRef.current) { left -= 50; if (left <= 0) break; }
      }
      setReady(false);
    }
    if (runRef.current === id) { setRunning(false); setScene(null); setReady(false); then?.(); }
  }

  const share = () => runScenes([
    { run: () => { setBView("idle"); setAView("qr"); }, step: 1, text: "Your card has its own QR code. Customers scan it from your phone, or from a printed TapCard sign in your shop window or on your reception desk. They need TapCard (free) on their phone, and it arrives instantly." },
    { run: () => setBView("scanning"), settle: 2300, step: 1, text: `Alex Morgan, a ${kind ? kind.toLowerCase() : "business"} customer with TapCard installed, scans your QR code…` },
    { run: () => setBView("received"), step: 1, text: "It's instant. Alex sees your card at once, with your links ready to tap, and chooses Save & send my card." },
    { run: () => setBView("saved"), step: 1, text: "Alex's own card is sent back to you, so you each have the other's details." },
    { run: () => setBView("follow"), step: 1, text: "Alex is asked once: do you want offers and news from this business? You can't send anyone offers unless they say yes." },
    { run: () => { setBView("contacts"); setAView("saved"); }, step: 1, text: "Alex now follows you. Your phone shows the new follower. Next: send them an offer." },
  ], () => setReached((r) => Math.max(r, 2)));

  const sendOffer = () => {
    setTypedOffer(""); setPin("");
    const typing: Scene[] = offer.split("").map((_, i) => ({ run: () => setTypedOffer(offer.slice(0, i + 1)) }));
    void runScenes([
      { run: () => setAView("offerForm"), step: 2, text: `You write the offer (for a ${kind ? kind.toLowerCase() : "business"}, something like this), choose how long it lasts and set a PIN for your staff. It takes seconds.`, hold: 2500 },
      ...typing,
      { run: () => setPin("4321"), hold: 900 },
      { run: () => setAView("offerLive"), step: 2, text: "One tap posts it. Everyone who follows you is notified. Only people who said yes." },
      { run: () => setBView("push"), settle: 1500, step: 2, text: "Alex's phone buzzes with your offer, even with TapCard closed." },
      { run: () => setBView("offer"), step: 2, text: "Alex opens it and can claim a one-off code. Next: see it being used." },
    ], () => setReached((r) => Math.max(r, 3)));
  };

  const useOffer = () => runScenes([
    { run: () => setBView("offer"), step: 3, text: "Alex taps Claim this offer…", hold: 3500 },
    { run: () => setBView("claimed"), step: 3, text: "…and gets their own one-off QR code to show in your shop." },
    { run: () => { setAView("staff"); setPin(""); }, step: 3, text: "Your staff scan it. The screen checks the offer is valid and asks for your PIN.", hold: 5000 },
    { run: () => setPin("4"), hold: 450 }, { run: () => setPin("43"), hold: 450 }, { run: () => setPin("432"), hold: 450 }, { run: () => setPin("4321"), hold: 900 },
    { run: () => { setAView("used"); setBView("used"); }, step: 3, text: "A big tick for your staff, and Alex's phone shows the offer as used. It can't be used twice." },
    { run: () => setAView("offerLive"), step: 3, text: "That's the whole journey. Press Set up again to try your own business." },
  ]);

  const showPhoneA = () => {
    if (!built && stage < 1) {
      return (
        <div className="flex min-h-[30rem] flex-col items-center justify-center px-6 text-center text-white/80">
          {buildSpinner ? <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" /> : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="h-16 w-16 rounded-2xl opacity-80" />
          )}
          <p className="mt-4 text-sm">{idleText}</p>
        </div>
      );
    }
    switch (aView) {
      case "qr":
        return (
          <div>
            <AppBar title="Share my card" />
            <div className="px-4 pt-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {cardQr ? <img src={cardQr} alt="" className="mx-auto h-44 w-44 rounded-2xl bg-white p-3" /> : null}
              <p className="mt-3 text-sm font-semibold">Scan to get my card and offers</p>
              <p className="mt-2 text-xs leading-snug text-white/80">Customers scan this from your phone, or from a printed TapCard sign in your shop window or on your reception desk.</p>
              <p className="mt-2 text-xs leading-snug text-white/80">They need TapCard on their phone (it&apos;s free). Scanning is instant: your card and offers land straight in their app.</p>
            </div>
          </div>
        );
      case "saved":
        return (
          <div>
            <AppBar title={name} buttons />
            <Toast><strong>Alex Morgan</strong> saved your card and sent you theirs.</Toast>
            <Toast>1 follower now gets your offers and news.</Toast>
            <CardFace name={name} kind={kind} typed={name} stage={4} rows={rows} socials={socials} interactive domain={domain} onOpen={openA} />
            <CardActions onShare={share} onOffer={sendOffer} offerReady={revealed >= 2} offerLive={false} disabled={running} />
          </div>
        );
      case "offerForm":
        return (
          <div>
            <AppBar title="New offer" />
            <div className="space-y-3 px-4 pt-3 text-left text-sm">
              <div><p className="text-xs text-white/70">1. What are you offering?</p><div className="mt-1 min-h-[2.5rem] rounded-xl bg-white/10 px-3 py-2">{typedOffer}<span className="animate-pulse">|</span></div></div>
              <div><p className="text-xs text-white/70">2. How long does it last?</p><div className="mt-1 flex gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#111318]">1 week</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">1 month</span></div></div>
              <div><p className="text-xs text-white/70">3. Staff PIN</p><div className="mt-1 rounded-xl bg-white/10 px-3 py-2 tracking-widest">{pin ? "••••" : ""}</div></div>
              <div className="rounded-xl bg-white py-2 text-center font-semibold text-[#111318]">Post offer</div>
            </div>
          </div>
        );
      case "offerLive":
        return (
          <div>
            <AppBar title={name} buttons />
            <Toast><strong>Offer live:</strong> {offer}. 1 follower notified.</Toast>
            <CardFace name={name} kind={kind} typed={name} stage={4} rows={rows} socials={socials} interactive domain={domain} onOpen={openA} />
            <CardActions onShare={share} onOffer={sendOffer} offerReady={revealed >= 2} offerLive={true} disabled={running} />
          </div>
        );
      case "staff":
        return (
          <div>
            <AppBar title="Staff check" />
            <div className="px-4 pt-4 text-center">
              <p className="rounded-xl bg-green-600 px-4 py-3 font-semibold">Valid offer</p>
              <p className="mt-2 text-xs text-white/80">{offer}</p>
              <p className="mt-5 text-left text-xs text-white/70">Staff PIN</p>
              <div className="mt-1 rounded-xl bg-white py-3 text-2xl tracking-[0.4em] text-[#111318]">{"•".repeat(pin.length) || " "}</div>
              <div className="mt-3 rounded-xl bg-white py-2 font-semibold text-[#111318]">Mark as used</div>
            </div>
          </div>
        );
      case "used":
        return <Tick label="Marked as used" sub="You can close this page." />;
      default:
        return (
          <div>
            <AppBar title={name} buttons />
            <CardFace name={name} kind={kind} typed={typed} stage={stage} rows={rows} socials={socials} interactive={stage >= 4} domain={domain} onOpen={openA} />
            {built ? <CardActions onShare={share} onOffer={sendOffer} offerReady={revealed >= 2} offerLive={false} disabled={running} /> : null}
          </div>
        );
    }
  };

  const showPhoneB = () => {
    const received = (extra?: React.ReactNode) => (
      <div>
        <AppBar title="Card received" />
        {extra}
        <CardFace name={name} kind={kind} typed={name} stage={4} rows={rows} socials={socials} interactive domain={domain} onOpen={openB} />
      </div>
    );
    switch (bView) {
      case "scanning":
        return (
          <div className="flex min-h-[30rem] flex-col items-center justify-center bg-black">
            <div className="relative h-52 w-52 rounded-3xl border-2 border-white/80">
              <div className="absolute inset-x-2 h-0.5 bg-green-400 [animation:scan_1.4s_ease-in-out_infinite]" />
            </div>
            <p className="mt-4 text-sm text-white/80">Point at a TapCard QR code</p>
          </div>
        );
      case "received":
        return received(
          <div className="space-y-2 px-4 pt-2">
            <div className="rounded-xl bg-blue-500 py-2 text-center text-sm font-semibold">Save &amp; send my card</div>
            <p className="text-center text-xs text-white/70">Just save {name}</p>
          </div>,
        );
      case "saved":
        return received(<Toast>Saved, and your card is on its way to {name}.</Toast>);
      case "follow":
        return (
          <div className="relative">
            {received()}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-5">
              <div className="w-full rounded-2xl bg-[#2a2d36] p-4 text-center [animation:fadein_0.3s_ease]">
                <p className="font-semibold">Get discounts, special offers and news from {name}?</p>
                <p className="mt-2 text-xs text-white/70">You choose. You can switch it off any time.</p>
                <div className="mt-3 rounded-xl bg-blue-500 py-2 text-sm font-semibold">Yes</div>
                <p className="mt-2 text-xs text-white/70">No thanks</p>
              </div>
            </div>
          </div>
        );
      case "contacts":
        return (
          <div>
            <AppBar title="Contacts" buttons />
            <div className="mx-3 mt-2 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold">{name.replace(/^the\s+/i, "").slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{name}</span><span className="block text-xs text-white/70">Business · offers on</span></span>
              <span aria-hidden="true">🔔</span>
            </div>
          </div>
        );
      case "push":
        return (
          <div className="min-h-[30rem] bg-gradient-to-b from-[#1b2540] to-[#0b0d12] px-3 pt-10 text-center">
            <p className="text-5xl font-light">9:41</p>
            <div className="mt-8 rounded-2xl bg-white/20 px-3 py-3 text-left backdrop-blur [animation:slidedown_0.5s_ease]">
              <p className="text-[10px] uppercase tracking-wider text-white/70">TapCard · now</p>
              <p className="text-sm font-semibold">{name}</p>
              <p className="text-sm">{offer}</p>
            </div>
          </div>
        );
      case "offer":
        return (
          <div>
            <AppBar title={name} />
            <div className="mx-3 mt-2 rounded-2xl bg-white/10 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Special offer</p>
              <p className="mt-1 text-lg font-bold">{offer}</p>
              <p className="text-xs text-white/70">Ends in 7 days</p>
              <div className="mt-3 rounded-xl bg-blue-500 py-2 text-sm font-semibold">Claim this offer</div>
            </div>
            <CardFace name={name} kind={kind} typed={name} stage={4} rows={rows} socials={socials} interactive domain={domain} onOpen={openB} />
          </div>
        );
      case "claimed":
        return (
          <div>
            <AppBar title={name} />
            <div className="mx-3 mt-2 rounded-2xl bg-white/10 p-3 text-center">
              <p className="text-lg font-bold">{offer}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {codeQr ? <img src={codeQr} alt="" className="mx-auto mt-3 h-40 w-40 rounded-xl bg-white p-2" /> : null}
              <p className="mt-2 text-xs">Show this to staff. It works once.</p>
              <p className="font-mono text-xs">{code}</p>
            </div>
          </div>
        );
      case "used":
        return <Tick label="Offer used" sub="Enjoy!" />;
      default:
        return (
          <div className="flex min-h-[30rem] flex-col items-center justify-center px-6 text-center">
            <p className="text-xs uppercase tracking-wider text-white/60">Alex Morgan&apos;s phone</p>
            <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" /></svg>
            </div>
            <p className="mt-4 text-sm text-white/80">No cards yet. Scan a TapCard to save it.</p>
          </div>
        );
    }
  };

  const HINTS: Record<number, string> = {
    1: "Share my card: your customer scans your QR code, saves your card, and says yes to hearing about your offers.",
    2: `Send an offer: you type an offer (for example "${suggestions[0]}"), press post, and the customer's phone gets a notification.`,
    3: "Use the offer: the customer claims a one-off QR code, your staff scan it and enter the PIN, and it's marked as used.",
    0: "Set up again: reloads this page so you can build another card.",
  };
  const bind = (n: number) => ({
    onMouseEnter: () => setHint({ step: n, text: HINTS[n] }),
    onMouseLeave: () => setHint(null),
    onFocus: () => setHint({ step: n, text: HINTS[n] }),
    onBlur: () => setHint(null),
  });
  const shownText = hint ?? caption ?? (built
    ? { step: 0, text: "Your card is built. Press 1 to see how people get it, then press Next when it turns green. Tap anything on the phones to try the links." }
    : null);

  return (
    <div>
      <div className="mx-auto mb-6 max-w-2xl rounded-2xl bg-charcoal px-5 py-4 text-left shadow-lg ring-2 ring-gold/60" aria-live="polite">
        {/* Fixed height so the buttons below never move, whatever the text length. */}
        <div className="flex h-[8.5rem] items-start gap-4 overflow-hidden">
          {shownText ? (
            <>
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gold text-xl font-black text-[#111318]">{shownText.step || "✓"}</span>
              <p className="text-xl font-semibold leading-snug text-white">{shownText.text}</p>
            </>
          ) : (
            <p className="text-xl font-semibold leading-snug text-white">Fill in the form and we&apos;ll build your card from your website. Then buttons here show what happens when a customer scans it and when you send an offer.</p>
          )}
        </div>
        {/* One row, always the same buttons in the same places. */}
        <div className={`mt-3 flex flex-wrap items-center gap-2 border-t border-white/15 pt-3 ${built ? "" : "invisible"}`}>
          <button onClick={share} disabled={running || revealed < 1} {...bind(1)} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40">1. Share my card</button>
          <button onClick={sendOffer} disabled={running || revealed < 2} {...bind(2)} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40">2. Send an offer</button>
          <button onClick={useOffer} disabled={running || revealed < 3} {...bind(3)} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40">3. Use the offer</button>
          <button
            type="button"
            onClick={() => { skipRef.current = true; }}
            disabled={!running || !ready}
            className={`ml-auto rounded-xl px-5 py-2 text-sm font-bold transition ${running && ready ? "animate-pulse bg-green-500 text-white ring-2 ring-green-300" : "bg-white/10 text-white/50"}`}
          >
            Next ›
          </button>
        </div>
        <div className={`mt-2 flex flex-wrap items-center gap-4 text-sm text-white/90 ${built ? "" : "invisible"}`}>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Auto-play
          </label>
          <span className="min-w-[8rem]">{running && scene ? `Scene ${scene.i} of ${scene.n}` : ""}</span>
          <button onClick={() => window.location.reload()} {...bind(0)} className="ml-auto rounded-xl px-2 py-1 font-semibold text-gold underline">Set up again</button>
        </div>
        {/* Reserved space, so nothing shifts when it fills in. */}
        <div className={`mt-3 min-h-[5.5rem] border-t border-white/15 pt-3 ${built ? "" : "invisible"}`}>
          <div className="flex items-center gap-2">
            <label htmlFor="offer-text" className="text-sm font-semibold text-white">Offer:</label>
            <input id="offer-text" value={offer} maxLength={60} disabled={running || revealed < 2} onChange={(e) => setOffer(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm text-[#111318] disabled:opacity-50" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((o) => (
              <button key={o} type="button" disabled={running || revealed < 2} onClick={() => setOffer(o)} className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 ${o === offer ? "bg-gold text-[#111318]" : "bg-white/10 text-white"}`}>{o}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        <Phone label="Your business" tab={built && ["card", "saved", "offerLive"].includes(aView) ? "cards" : undefined} overlay={browseA ? <InPhoneBrowser row={browseA} name={name} website={website} onClose={() => setBrowseA(null)} /> : null}>{showPhoneA()}</Phone>
        <Phone label="Alex Morgan, a customer" tab={bView === "contacts" ? "contacts" : undefined} overlay={browseB ? <InPhoneBrowser row={browseB} name={name} website={website} onClose={() => setBrowseB(null)} /> : null}>{showPhoneB()}</Phone>
      </div>
      <style>{`
        @keyframes scan { 0% { top: 8px; } 50% { top: calc(100% - 10px); } 100% { top: 8px; } }
        @keyframes slidedown { from { opacity: 0; transform: translateY(-24px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
