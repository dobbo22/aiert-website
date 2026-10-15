"use client";

import { useEffect, useRef, useState } from "react";
import ContactIcon, { type ContactIconName } from "../ContactIcon";
import Phones from "./Phones";
import { DEMO_KINDS } from "./demoOffers";

interface Link { kind: string; label: string; value: string }
interface Card {
  name: string; website: string; address: string; phone: string; links: Link[];
  facebookUrl: string; instagramUrl: string; twitterUrl: string; linkedInUrl: string; tiktokUrl: string; branchCount: number;
}

type Phase = "form" | "building" | "choose" | "done";

// One row of the card, revealed in turn so the card visibly assembles itself.
export interface Row { key: string; id: string; title: string; detail: string; color: string; icon: ContactIconName; href?: string; social?: boolean }

// Common slips in the part after the @, offered back as a one-tap fix.
const EMAIL_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.con": "gmail.com", "gmail.co": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmail.con": "hotmail.com", "hotmai.com": "hotmail.com", "hotmal.com": "hotmail.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com", "outlok.com": "outlook.com", "outlook.con": "outlook.com",
  "icloud.con": "icloud.com", "iclould.com": "icloud.com", "btopenworld.con": "btopenworld.com", "btinternet.con": "btinternet.com",
  "gmail.cm": "gmail.com", "hotmail.co": "hotmail.com", "yahoo.co": "yahoo.com",
};
function emailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  let fixed = EMAIL_FIXES[domain];
  if (!fixed && /\.cco\.uk$|\.co\.ukk$|\.couk$/.test(domain)) fixed = domain.replace(/\.cco\.uk$|\.co\.ukk$|\.couk$/, ".co.uk");
  return fixed ? `${email.slice(0, at)}@${fixed}` : null;
}

const webUrl = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
const ICONS: Record<string, ContactIconName> = {
  shop: "bag", order: "bag", menu: "menu", hours: "clock", google_review: "star", tripadvisor: "star", reviews: "star",
  book_table: "calendar", book_room: "calendar", appointment: "calendar", custom: "link",
};

function rowsFor(card: Card): Row[] {
  const rows: Row[] = [];
  if (card.phone) rows.push({ key: "phone", id: "phone", title: "Call us", detail: card.phone, color: "#22C55E", icon: "phone", href: `tel:${card.phone.replace(/\s+/g, "")}` });
  if (card.website) rows.push({ key: "web", id: "website", title: "Visit our site", detail: card.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), color: "#3B82F6", icon: "globe", href: webUrl(card.website) });
  if (card.address) rows.push({ key: "addr", id: "address", title: "Find us", detail: card.address, color: "#F97316", icon: "mapPin", href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address)}` });
  for (const l of card.links) rows.push({
    key: `l-${l.kind}-${l.value}`, id: `link:${l.kind}`, title: l.label,
    detail: l.kind === "hours" ? l.value : l.value.replace(/^https?:\/\/(www\.)?/, ""),
    color: l.kind === "hours" ? "#EAB308" : "#A855F7", icon: ICONS[l.kind] ?? "link",
    href: l.kind === "hours" ? undefined : webUrl(l.value),
  });
  const socials: [string, string, string, ContactIconName, string][] = [
    ["LinkedIn", "linkedin", card.linkedInUrl, "linkedin", "#0A66C2"],
    ["X", "twitter", card.twitterUrl, "x", "#000000"],
    ["Instagram", "instagram", card.instagramUrl, "instagram", "linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)"],
    ["Facebook", "facebook", card.facebookUrl, "facebook", "#0866FF"],
    ["TikTok", "tiktok", card.tiktokUrl, "tiktok", "#000000"],
  ];
  for (const [n, id, u, icon, bg] of socials) if (u) rows.push({ key: `s-${n}`, id: `social:${id}`, title: n, detail: u.replace(/^https?:\/\/(www\.)?/, ""), color: bg, icon, href: webUrl(u), social: true });
  return rows.slice(0, 12);
}

export default function DemoBuilder() {
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [kind, setKind] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [address, setAddress] = useState("");
  const [branches, setBranches] = useState<{ name: string; address: string; phone: string; hours: string }[] | null>(null);
  const [trap, setTrap] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [siteFix, setSiteFix] = useState<string | null>(null);
  const [siteBad, setSiteBad] = useState(false);
  const [card, setCard] = useState<Card | null>(null);
  const [emailed, setEmailed] = useState(true);
  const [shown, setShown] = useState(0);
  const [stage, setStage] = useState(0); // 0 blank, 1 name, 2 icon/pill, 3 rows, 4 qr
  const [typed, setTyped] = useState("");
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [extras, setExtras] = useState<{ label: string; value: string }[]>([{ label: "", value: "" }, { label: "", value: "" }]);
  const [sending, setSending] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };

  async function submit(e: React.FormEvent, chosen?: string) {
    e.preventDefault();
    setError(null);
    setSiteBad(false); setSiteFix(null);
    setBranches(null);
    setPhase("building");
    setStage(0); setShown(0); setTyped("");
    try {
      const res = await fetch("/api/demo/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, website, email, consent, company: trap, address: chosen ?? address, preview: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "website_unreachable") { setSiteBad(true); setSiteFix(typeof data.suggestion === "string" ? data.suggestion : null); }
        setPhase("form");
        setError(
          data.error === "rate_limited" ? "That’s a lot of cards from one place today. Please try again tomorrow."
          : data.error === "website_unreachable" ? "We couldn’t find that website. Please check the spelling."
          : data.error === "email" ? "That email address doesn't look right."
          : data.error === "website" ? "That website address doesn't look right. Try something like yourbusiness.co.uk."
          : data.error === "consent" ? "Please tick the box so we can email your link."
          : "Something went wrong. Please try again.",
        );
        return;
      }
      if (data.needsBranch) {
        // The website lists several addresses: ask which is theirs, then build with that one.
        setBranches(data.branches);
        setPhase("form");
        return;
      }
      const c = data.card as Card;
      setCard(c);
      setKeep(new Set(rowsFor(c).map((r) => r.id)));
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
      later(t, () => { setStage(4); setPhase("choose"); });
    } catch {
      setPhase("form");
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  async function send() {
    if (!card) return;
    setSending(true); setError(null);
    try {
      const res = await fetch("/api/demo/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, website, email, consent, company: trap, address: card.address || address,
          keep: [...keep], kind, extra: extras.filter((e) => e.label.trim() && e.value.trim()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error === "rate_limited" ? "That’s a lot of cards from one place today. Please try again tomorrow." : data.error === "extra" ? "Extra links need to start with https://" : "Something went wrong. Please try again.");
        return;
      }
      setEmailed(data.emailed !== false);
      setPhase("done");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const allRows = card ? rowsFor(card) : [];
  const extraRows: Row[] = extras.filter((e) => e.label.trim() && /^https:\/\//i.test(e.value.trim())).map((e, i) => ({
    key: `x-${i}`, id: `extra:${i}`, title: e.label.trim(), detail: e.value.trim().replace(/^https?:\/\/(www\.)?/, ""), color: "#A855F7", icon: "link", href: e.value.trim(),
  }));
  // While choosing, the card on the phone shows only what is ticked, plus the visitor's own links.
  const rows = phase === "choose" || phase === "done" ? [...allRows.filter((r) => keep.has(r.id)), ...extraRows] : allRows;
  const settled = phase === "choose" || phase === "done";
  const visibleRows = settled ? rows : rows.slice(0, shown);
  const phoneRows = visibleRows.filter((r) => !r.social);
  const phoneSocials = visibleRows.filter((r) => r.social);

  return (
    <section className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div>
        {phase === "form" || phase === "building" ? (
          <form onSubmit={submit} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
            <label className="block text-sm font-semibold text-cloud" htmlFor="biz">Business name</label>
            <input id="biz" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={phase === "building"}
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-[#111318]" placeholder="The Coffee Shop" />
            <label className="mt-4 block text-sm font-semibold text-cloud" htmlFor="kind">Type of business <span className="font-normal">(so the examples suit you)</span></label>
            <select id="kind" required value={kind} onChange={(e) => setKind(e.target.value)} disabled={phase === "building"}
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-[#111318]">
              <option value="" disabled>Choose…</option>
              {DEMO_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <label className="mt-4 block text-sm font-semibold text-cloud" htmlFor="site">Website <span className="font-normal">(so we can build it from your own pages)</span></label>
            <input id="site" value={website} onChange={(e) => { setWebsite(e.target.value); setSiteBad(false); setSiteFix(null); }} maxLength={200} disabled={phase === "building"} inputMode="url"
              className={`mt-1 w-full rounded-xl bg-white px-4 py-3 text-[#111318] ${siteBad ? "ring-4 ring-red-500" : ""}`} placeholder="coffeeshop.website" aria-invalid={siteBad} />
            {siteBad ? (
              <div role="alert" className="mt-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">
                We couldn&apos;t find that website. Please check the spelling.
                {siteFix ? (
                  <button type="button" onClick={() => { setWebsite(siteFix); setSiteBad(false); setSiteFix(null); setError(null); }} className="mt-2 block rounded-lg bg-white px-3 py-2 text-[#111318]">
                    Did you mean <strong>{siteFix}</strong>? Use it
                  </button>
                ) : null}
              </div>
            ) : null}
            <label className="mt-4 block text-sm font-semibold text-cloud" htmlFor="addr">Address or postcode <span className="font-normal">(optional, for a business with several shops)</span></label>
            <input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} disabled={phase === "building"}
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-[#111318]" placeholder="AB1 2CD" />
            <label className="mt-4 block text-sm font-semibold text-cloud" htmlFor="mail">Your email</label>
            <input id="mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} disabled={phase === "building"}
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-[#111318]" placeholder="you@yourbusiness.co.uk" />
            {emailFix(email) ? (
              <button type="button" onClick={() => setEmail(emailFix(email) ?? email)} className="mt-2 block rounded-lg bg-white/15 px-3 py-2 text-left text-sm text-cloud">
                Did you mean <strong>{emailFix(email)}</strong>? Use it
              </button>
            ) : null}
            {/* Honeypot: hidden from people. */}
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} style={{ position: "absolute", left: "-9999px" }} name="company" />
            <label className="mt-4 flex items-start gap-3 text-sm text-cloud">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5" />
              <span>Email me my TapCard link. It&apos;s one email, not a mailing list. We&apos;ll note whether you open the link and install TapCard, so we can help if you get stuck. We keep your email and card details for 60 days. <a href="/privacy" className="text-gold underline">Privacy policy</a></span>
            </label>
            {branches ? (
              <div className="mt-4 rounded-xl bg-white/10 p-4 ring-1 ring-gold/40">
                <p className="font-semibold text-cloud">We found {branches.length} addresses on your website. Which one is this card for?</p>
                <div className="mt-3 flex flex-col gap-2">
                  {branches.map((b) => (
                    <button key={b.address || b.name} type="button"
                      onClick={(e) => { setAddress(b.address || b.name); void submit(e as unknown as React.FormEvent, b.address || b.name); }}
                      className="rounded-xl bg-white px-4 py-3 text-left text-[#111318]">
                      <span className="block font-semibold">{b.name}</span>
                      {b.address ? <span className="block text-sm">{b.address}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {error && !siteBad ? <p role="alert" className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">{error}</p> : null}
            <button type="submit" disabled={phase === "building" || !consent || name.trim().length < 2 || !email || !kind}
              className="btn-gold mt-5 w-full rounded-xl px-6 py-3 font-semibold disabled:opacity-50">
              {phase === "building" ? "Building your card…" : "Build my TapCard"}
            </button>
          </form>
        ) : phase === "choose" ? (
          <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
            <h2 className="text-2xl font-black text-cloud">Your card is built. Make it yours.</h2>
            <p className="mt-2 text-cloud">Untick anything you don&apos;t want. The phone updates as you go.</p>
            <ul className="mt-4 space-y-2">
              {allRows.map((r) => (
                <li key={r.key}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-cloud">
                    <input type="checkbox" className="h-5 w-5 flex-none" checked={keep.has(r.id)}
                      onChange={(e) => setKeep((prev) => { const n = new Set(prev); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })} />
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ background: r.color }}>
                      <ContactIcon name={r.icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{r.title}</span>
                      <span className="block truncate text-sm">{r.detail}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-5 font-semibold text-cloud">Add your own links <span className="font-normal">(optional)</span></p>
            {extras.map((e, i) => (
              <div key={i} className="mt-2 grid grid-cols-5 gap-2">
                <input aria-label={`Link ${i + 1} name`} value={e.label} maxLength={40} placeholder="Book a table"
                  onChange={(ev) => setExtras((p) => p.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))}
                  className="col-span-2 rounded-xl bg-white px-3 py-2 text-[#111318]" />
                <input aria-label={`Link ${i + 1} address`} value={e.value} maxLength={300} placeholder="https://…" inputMode="url"
                  onChange={(ev) => setExtras((p) => p.map((x, j) => (j === i ? { ...x, value: ev.target.value } : x)))}
                  className="col-span-3 rounded-xl bg-white px-3 py-2 text-[#111318]" />
              </div>
            ))}
            {error ? <p role="alert" className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">{error}</p> : null}
            <button onClick={() => void send()} disabled={sending} className="btn-gold mt-5 w-full rounded-xl px-6 py-3 font-semibold disabled:opacity-50">
              {sending ? "Sending…" : "Email me my card"}
            </button>
            <p className="mt-2 text-xs text-cloud">We&apos;ll email {email}. Nothing is sent until you press the button.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
            <h2 className="text-2xl font-black text-cloud">{emailed ? "Your link is on its way" : "Your card is built"}</h2>
            <p className="mt-3 text-lg leading-relaxed text-cloud">
              {emailed
                ? <>We&apos;ve emailed <strong>{email}</strong> a link. Open it on your phone, install TapCard, and your card is already built when you open the app.</>
                : <>We built your card but couldn&apos;t send the email just now. Please try again in a minute.</>}
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

      {/* Two phones: the business and a customer. The card assembles itself, then the buttons play the story. */}
      <div className="min-w-0">
        <Phones
          name={card?.name ?? name}
          website={card?.website ?? website}
          kind={kind}
          built={settled}
          stage={stage}
          typed={typed}
          rows={phoneRows}
          socials={phoneSocials}
          buildSpinner={phase === "building" && !card}
          idleText={phase === "building" ? "Reading your website…" : "Your card will build here."}
        />
      </div>
      <style>{`@keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </section>
  );
}
