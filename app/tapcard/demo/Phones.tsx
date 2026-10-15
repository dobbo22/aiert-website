"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import ContactIcon from "../ContactIcon";
import type { Row } from "./DemoBuilder";

// Two phones: the business (left) and Alex Morgan, an anonymous customer (right). The screens scroll inside a fixed-size
// phone. After the card is built, buttons play the story: share the card, send an offer, use the offer.

const OFFER_DEFAULT = "10% off your first order";

type AView = "card" | "qr" | "saved" | "offerForm" | "offerLive" | "staff" | "used";
type BView = "idle" | "scanning" | "received" | "saved" | "follow" | "contacts" | "push" | "offer" | "claimed" | "used";

function Phone({ label, children, overlay }: { label: string; children: React.ReactNode; overlay?: React.ReactNode }) {
  return (
    <div className="w-full max-w-[17rem]">
      <p className="mb-2 text-center text-sm font-semibold text-cloud">{label}</p>
      <div className="rounded-[2.2rem] bg-black p-2.5 shadow-2xl ring-1 ring-white/20">
        {/* Fixed height: the screen scrolls, it never grows. A tapped link opens over the screen, like an in-app browser. */}
        <div className="relative h-[34rem] overflow-hidden rounded-[1.8rem] bg-[#111318] text-white">
          <div className="h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
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

function CardFace({ name, typed, stage, rows, socials, interactive, domain, onOpen }: {
  name: string; typed: string; stage: number; rows: Row[]; socials: Row[]; interactive: boolean; domain: string; onOpen: (r: Row) => void;
}) {
  // A tap opens inside the phone; a modified click (new tab) still goes to the real page.
  const tap = (r: Row) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    onOpen(r);
  };
  const [logoFailed, setLogoFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const d = encodeURIComponent(domain);
  return (
    <div className="pb-6 text-center">
      <div className="flex h-20 items-center justify-center bg-gradient-to-br from-[#2b2f77] to-[#111318] px-6">
        {domain && !logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/logo?domain=${d}`} alt="" onError={() => setLogoFailed(true)} className="max-h-14 max-w-full rounded-md object-contain [animation:fadein_0.6s_ease]" />
        ) : null}
      </div>
      <div className="px-4">
      <div className="-mt-8 mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#1c1f27] ring-4 ring-[#111318] transition-all duration-500" style={{ opacity: stage >= 2 ? 1 : 0, transform: stage >= 2 ? "scale(1)" : "scale(0.6)" }}>
        {domain && !iconFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/favicon?domain=${d}`} alt="" onError={() => setIconFailed(true)} className="h-12 w-12 object-contain" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6" /></svg>
        )}
      </div>
      <h3 className="mt-3 min-h-[1.75rem] text-xl font-bold">{typed || name}</h3>
      <span className="mt-1 inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-opacity duration-500" style={{ opacity: stage >= 2 ? 1 : 0 }}>Business</span>
      <ul className="mt-4 space-y-2 text-left">
        {rows.map((r) => {
          const inner = (
            <>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full" style={{ background: r.color }}><ContactIcon name={r.icon} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{r.title}</span>
                <span className="block truncate text-xs text-white/70">{r.detail}</span>
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
function InPhoneBrowser({ row, name, onClose }: { row: Row; name: string; onClose: () => void }) {
  const isCall = !!row.href?.startsWith("tel:");
  const url = row.href && !isCall ? row.href : "";
  const [frameable, setFrameable] = useState<boolean | null>(null);
  useEffect(() => {
    if (!url || !/^https:\/\//i.test(url)) return;
    let cancelled = false;
    fetch(`/api/demo/frameable?url=${encodeURIComponent(url)}`).then((r) => r.json()).then((d) => { if (!cancelled) setFrameable(d.frameable === true); }).catch(() => { if (!cancelled) setFrameable(false); });
    return () => { cancelled = true; };
  }, [url]);
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const checking = !isCall && !!url && /^https:\/\//i.test(url) && frameable === null;
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
        ) : checking ? (
          <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-black/60" /></div>
        ) : frameable ? (
          <iframe src={url} title={row.title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="no-referrer" className="h-full w-full border-0 bg-white" />
        ) : (
          <div className="flex h-full flex-col items-center overflow-y-auto px-5 pt-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: row.color }}><ContactIcon name={row.icon} large /></span>
            <p className="mt-4 text-lg font-bold">{social ? row.title : row.title}</p>
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

function AppBar({ title }: { title: string }) {
  return <div className="sticky top-0 z-10 bg-[#111318]/95 px-4 pb-2 pt-4 text-center text-sm font-semibold backdrop-blur">{title}</div>;
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

export default function Phones({ name, website, built, stage, typed, rows, socials, buildSpinner, idleText }: {
  name: string; website: string; built: boolean; stage: number; typed: string; rows: Row[]; socials: Row[]; buildSpinner: boolean; idleText: string;
}) {
  const domain = domainOf(website);
  const [browseA, setBrowseA] = useState<Row | null>(null);
  const [browseB, setBrowseB] = useState<Row | null>(null);
  const openA = (r: Row) => setBrowseA(r);
  const openB = (r: Row) => setBrowseB(r);
  const [aView, setAView] = useState<AView>("card");
  const [bView, setBView] = useState<BView>("idle");
  const [reached, setReached] = useState(1); // the furthest step whose button is showing: 1 share, 2 offer, 3 use
  const revealed = built ? reached : 0;
  const [running, setRunning] = useState(false);
  const [offer, setOffer] = useState(OFFER_DEFAULT);
  const [typedOffer, setTypedOffer] = useState("");
  const [pin, setPin] = useState("");
  const [code] = useState(() => Array.from({ length: 10 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join(""));
  const [codeQr, setCodeQr] = useState("");
  const [cardQr, setCardQr] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    void QRCode.toDataURL("https://tapcard.aiert.co.uk/demo", { margin: 1, width: 200, color: { dark: "#111318", light: "#ffffff" } }).then(setCardQr);
    void QRCode.toDataURL(`https://tapcard.aiert.co.uk/o/${code}`, { margin: 1, width: 200, color: { dark: "#111318", light: "#ffffff" } }).then(setCodeQr);
  }, [code]);

  // Plays a list of [delay in ms, action], then re-enables the buttons.
  function play(script: [number, () => void][], then?: () => void) {
    timers.current.forEach(clearTimeout); timers.current = [];
    setRunning(true);
    let t = 0;
    for (const [d, fn] of script) { t += d; timers.current.push(setTimeout(fn, t)); }
    timers.current.push(setTimeout(() => { setRunning(false); then?.(); }, t + 200));
  }
  const typeInto = (text: string, set: (s: string) => void): [number, () => void][] =>
    text.split("").map((_, i) => [i === 0 ? 300 : 45, () => set(text.slice(0, i + 1))] as [number, () => void]);

  const share = () => play([
    [200, () => { setBView("idle"); setAView("qr"); }],
    [1200, () => setBView("scanning")],
    [2200, () => setBView("received")],
    [1800, () => setBView("saved")],
    [1400, () => setBView("follow")],
    [1800, () => { setBView("contacts"); setAView("saved"); }],
  ], () => setReached((r) => Math.max(r, 2)));

  const sendOffer = () => { setTypedOffer(""); setPin("");
    play([
      [200, () => { setAView("offerForm"); }],
      ...typeInto(offer, setTypedOffer),
      [700, () => setPin("4321")],
      [1100, () => setAView("offerLive")],
      [900, () => setBView("push")],
      [2600, () => setBView("offer")],
    ], () => setReached((r) => Math.max(r, 3)));
  };

  const useOffer = () => play([
    [200, () => setBView("offer")],
    [1200, () => setBView("claimed")],
    [2200, () => setAView("staff")],
    [1000, () => setPin("")],
    [900, () => setPin("4")], [250, () => setPin("43")], [250, () => setPin("432")], [250, () => setPin("4321")],
    [900, () => { setAView("used"); setBView("used"); }],
    [2500, () => setAView("offerLive")],
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
              <p className="mt-3 text-sm font-semibold">Scan to get my card</p>
              <p className="mt-1 text-xs text-white/70">Anyone with a camera can scan it. They don&apos;t need the app.</p>
            </div>
          </div>
        );
      case "saved":
        return (
          <div>
            <AppBar title="My Cards" />
            <Toast><strong>Alex Morgan</strong> saved your card and sent you theirs.</Toast>
            <Toast>1 follower now gets your offers and news.</Toast>
            <CardFace name={name} typed={name} stage={4} rows={rows} socials={socials} interactive domain={domain} onOpen={openA} />
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
            <AppBar title="My Cards" />
            <Toast><strong>Offer live:</strong> {offer}. 1 follower notified.</Toast>
            <CardFace name={name} typed={name} stage={4} rows={rows} socials={socials} interactive domain={domain} onOpen={openA} />
          </div>
        );
      case "staff":
        return (
          <div>
            <AppBar title="Staff: scan a customer's code" />
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
            <AppBar title="My Cards" />
            <CardFace name={name} typed={typed} stage={stage} rows={rows} socials={socials} interactive={stage >= 4} domain={domain} onOpen={openA} />
          </div>
        );
    }
  };

  const showPhoneB = () => {
    const received = (extra?: React.ReactNode) => (
      <div>
        <AppBar title="Card received" />
        {extra}
        <CardFace name={name} typed={name} stage={4} rows={rows} socials={socials} interactive domain={domain} onOpen={openB} />
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
            <p className="text-center text-xs text-white/70">Just save {name.split(" ")[0]}</p>
          </div>,
        );
      case "saved":
        return received(<Toast>Saved, and your card is on its way to {name.split(" ")[0]}.</Toast>);
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
            <AppBar title="Contacts" />
            <div className="mx-3 mt-2 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold">{name.slice(0, 1)}</span>
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
            <CardFace name={name} typed={name} stage={4} rows={rows} socials={socials} interactive domain={domain} onOpen={openB} />
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

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-6">
        <Phone label="Your business" overlay={browseA ? <InPhoneBrowser row={browseA} name={name} onClose={() => setBrowseA(null)} /> : null}>{showPhoneA()}</Phone>
        <Phone label="Alex Morgan, a customer" overlay={browseB ? <InPhoneBrowser row={browseB} name={name} onClose={() => setBrowseB(null)} /> : null}>{showPhoneB()}</Phone>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {revealed >= 1 && built ? <button disabled={running} onClick={share} className="btn-gold rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50">1. Share my card</button> : null}
        {revealed >= 2 ? <button disabled={running} onClick={sendOffer} className="btn-gold rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50">2. Send an offer</button> : null}
        {revealed >= 3 ? <button disabled={running} onClick={useOffer} className="btn-gold rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50">3. Use the offer</button> : null}
        {built ? <button onClick={() => window.location.reload()} className="rounded-xl px-5 py-3 text-sm font-semibold text-gold underline">Set up again</button> : null}
      </div>
      {revealed >= 2 && built ? (
        <div className="mx-auto mt-4 flex max-w-sm items-center gap-2">
          <label htmlFor="offer-text" className="text-sm text-cloud">Offer:</label>
          <input id="offer-text" value={offer} maxLength={60} onChange={(e) => setOffer(e.target.value)} className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm text-[#111318]" />
        </div>
      ) : null}
      <style>{`
        @keyframes scan { 0% { top: 8px; } 50% { top: calc(100% - 10px); } 100% { top: 8px; } }
        @keyframes slidedown { from { opacity: 0; transform: translateY(-24px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
