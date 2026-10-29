"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Phones from "@/app/tapcard/demo/Phones";
import { rowsFor, type Card } from "@/app/tapcard/demo/DemoBuilder";
import { DEMO_KINDS } from "@/app/tapcard/demo/demoOffers";
import { PROMOTE_NOTE, PROMOTE_NOTE_TITLE } from "@/app/tapcard/promoteNote";

interface Hit { id: string; name: string; address: string; type: string; lat?: number; lng?: number; website?: string; phone?: string }
interface Built { card: Card; token: string; link: string; brandColor: string | null; rating: { rating: number; count: number } | null }

// Apple Maps search in the browser (MapKit JS): the same data the iPhone app gets from MapKit, including each place's phone and website, which the
// server-side Apple API does not give. Any failure returns null and the page falls back to the server search.
interface MkPlace { name?: string; formattedAddress?: string; telephone?: string; urls?: string[]; pointOfInterestCategory?: string; coordinate?: { latitude: number; longitude: number } }
interface MkGlobal {
  init(o: { authorizationCallback: (done: (t: string) => void) => void; language?: string }): void;
  Search: new (o: Record<string, unknown>) => { search(q: string, cb: (err: unknown, data?: { places?: MkPlace[] }) => void): void };
  CoordinateRegion: new (c: unknown, s: unknown) => unknown;
  Coordinate: new (lat: number, lng: number) => unknown;
  CoordinateSpan: new (a: number, b: number) => unknown;
}
let mapkitReady: Promise<MkGlobal | null> | null = null;
function loadMapKit(): Promise<MkGlobal | null> {
  if (!mapkitReady) {
    mapkitReady = new Promise((resolve) => {
      const w = window as unknown as { mapkit?: MkGlobal };
      const start = () => {
        try {
          w.mapkit!.init({
            authorizationCallback: (done) => { void fetch("/api/admin/tapcard/mapkit-token").then((r) => r.json()).then((j: { token?: string }) => { if (j.token) done(j.token); }).catch(() => {}); },
            language: "en-GB",
          });
          resolve(w.mapkit!);
        } catch { resolve(null); }
      };
      if (w.mapkit) { start(); return; }
      const s = document.createElement("script");
      s.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
      s.crossOrigin = "anonymous";
      s.onload = start;
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }
  return mapkitReady;
}
// Apple often lists a business's Facebook page or a directory as its "website": that is not its site, and its logo is not the business's.
const NOT_A_SITE = /(^|\.)(facebook|fb|instagram|twitter|x|tiktok|linkedin|youtube|linktr|linktree|tripadvisor|yell|ubereats|deliveroo|justeat|opentable|google|booksy|treatwell|fresha)\.[a-z.]+$|^(fb\.me|g\.page)$/i;
async function mapkitSearch(q: string): Promise<Hit[] | null> {
  const mk = await loadMapKit();
  if (!mk) return null;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 7000);
    try {
      const search = new mk.Search({
        getsUserLocation: false, includeAddresses: false, includeQueries: false, includePointsOfInterest: true,
        region: new mk.CoordinateRegion(new mk.Coordinate(54.0, -2.5), new mk.CoordinateSpan(11, 11)),
      });
      search.search(q, (err, data) => {
        clearTimeout(timer);
        if (err || !data?.places?.length) { resolve(null); return; }
        resolve(data.places.slice(0, 6).flatMap((p): Hit[] => {
          if (!p.name) return [];
          const site = (p.urls ?? []).find((u) => { try { return !NOT_A_SITE.test(new URL(u).hostname); } catch { return false; } }) ?? "";
          const c = p.coordinate;
          return [{
            id: `mk:${c ? `${c.latitude},${c.longitude}` : ""}|${p.name}`, name: p.name, address: (p.formattedAddress ?? "").replace(/, United Kingdom$/i, ""),
            type: (p.pointOfInterestCategory ?? "").replace(/^MKPOICategory/, ""), lat: c?.latitude, lng: c?.longitude, website: site, phone: p.telephone ?? "",
          }];
        }));
      });
    } catch { clearTimeout(timer); resolve(null); }
  });
}

// A guess at the business type from the listing's category, so the offer examples suit the shop. Changeable.
function guessKind(type: string): string {
  const t = type.toLowerCase();
  const map: [RegExp, string][] = [
    [/cafe|coffee/, "Coffee shop"], [/restaurant|food|dining/, "Restaurant"], [/pub|bar|brewery/, "Pub or bar"], [/takeaway|fast/, "Takeaway"],
    [/bakery|deli/, "Bakery or deli"], [/hotel|inn|b&b|lodging/, "Hotel or B&B"], [/florist/, "Florist"], [/clothing|gift|boutique/, "Clothing or gift shop"],
    [/butcher|greengrocer|farm/, "Butcher, greengrocer or farm shop"], [/dry clean|laundry/, "Dry cleaner or laundry"], [/hair|barber/, "Hairdresser or barber"],
    [/beauty|nail|spa|salon/, "Beauty, nails or spa"], [/gym|fitness/, "Gym or fitness studio"], [/clinic|dentist|physio|doctor/, "Clinic or studio"], [/shop|store|retail/, "Other shop"],
  ];
  return map.find(([re]) => re.test(t))?.[1] ?? "Something else";
}

export default function WalkIn() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState<Built | null>(null);
  const [kind, setKind] = useState("Something else");
  const [tab, setTab] = useState<"owner" | "customer" | "demo">("owner");
  const [qr, setQr] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [full, setFull] = useState(false);
  const [touch, setTouch] = useState<{ x: number; y: number } | null>(null);
  // Full screen is sized from the visible screen in pixels (not CSS viewport units, which iOS gets wrong behind its toolbars and in a web app),
  // follows a rotation, and stops the page behind from scrolling.
  const [vh, setVh] = useState(0);
  useEffect(() => {
    if (!full) return;
    const set = () => setVh(Math.round(window.visualViewport?.height ?? window.innerHeight));
    set();
    window.visualViewport?.addEventListener("resize", set);
    window.addEventListener("resize", set);
    window.addEventListener("orientationchange", set);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.visualViewport?.removeEventListener("resize", set);
      window.removeEventListener("resize", set);
      window.removeEventListener("orientationchange", set);
      document.body.style.overflow = before;
    };
  }, [full]);

  useEffect(() => {
    if (!built) { setQr(""); return; }
    let live = true;
    QRCode.toDataURL(built.link, { margin: 4, width: 1100, errorCorrectionLevel: "L", color: { dark: "#000000", light: "#ffffff" } }).then((u) => { if (live) setQr(u); }).catch(() => {});
    return () => { live = false; };
  }, [built]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setSearching(true); setNote(null); setHits([]);
    const apple = await mapkitSearch(q.trim()).catch(() => null);
    if (apple?.length) { setHits(apple); setSearching(false); return; }
    const res = await fetch(`/api/admin/tapcard/walkin?q=${encodeURIComponent(q.trim())}`).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { hits?: Hit[]; error?: string } | null;
    setSearching(false);
    if (!res?.ok) { setNote({ text: data?.error ?? "Couldn't search. Try again.", ok: false }); return; }
    setHits(data?.hits ?? []);
    if (!data?.hits?.length) setNote({ text: "Nothing found. Try the name and the town.", ok: false });
  }

  async function build(h: Hit) {
    setBuilding(true); setNote(null); setBuilt(null);
    const res = await fetch("/api/admin/tapcard/walkin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: h.name, address: h.address, lat: h.lat, lng: h.lng, website: h.website, phone: h.phone }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as (Built & { error?: string }) | null;
    setBuilding(false);
    if (!res?.ok || !data?.card) { setNote({ text: data?.error ?? "Couldn't build the card. Try again.", ok: false }); return; }
    setBuilt({ card: data.card, token: data.token, link: data.link, brandColor: data.brandColor ?? null, rating: data.rating ?? null });
    setKind(guessKind(h.type));
    setTab("owner"); setHits([]); setEmail("");
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!built) return;
    setSending(true); setNote(null);
    const res = await fetch("/api/admin/tapcard/walkin", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: built.token, email }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    setSending(false);
    setNote(res?.ok ? { text: `Sent to ${email}. They open it on their phone, install TapCard and the card is ready.`, ok: true } : { text: data?.error ?? "Couldn't send. Try again.", ok: false });
  }

  const rows = built ? rowsFor(built.card) : [];
  const field = "w-full rounded-xl bg-white px-4 py-3 text-[#111318]";
  return (
    <div className="space-y-6">
      <form onSubmit={search} className="rounded-2xl bg-charcoal p-5 ring-1 ring-white/10">
        <label htmlFor="wq" className="block text-sm font-semibold text-cloud">Business name and town</label>
        <div className="mt-1 flex gap-2">
          <input id="wq" value={q} onChange={(e) => setQ(e.target.value)} className={field} placeholder="The Coffee Shop, Dunmow" autoComplete="off" />
          <button type="submit" disabled={searching || q.trim().length < 2} className="btn-gold rounded-xl px-5 py-3 font-semibold disabled:opacity-50">{searching ? "…" : "Find"}</button>
        </div>
        {hits.length > 0 && (
          <ul className="mt-3 space-y-2">
            {hits.slice(0, 8).map((h) => (
              <li key={h.id || h.name + h.address}>
                <button type="button" onClick={() => void build(h)} disabled={building} className="w-full rounded-xl bg-white/90 px-4 py-3 text-left text-[#111318] disabled:opacity-50">
                  <span className="block font-semibold">{h.name}</span>
                  <span className="block text-sm">{[h.type, h.address].filter(Boolean).join(" • ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {building && <p className="mt-3 text-cloud">Building the card from their listing and website…</p>}
        {note && !built && <p role="alert" className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${note.ok ? "bg-teal text-black" : "bg-red-600 text-white"}`}>{note.text}</p>}
      </form>

      {built && (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div className="rounded-2xl bg-charcoal p-5 ring-1 ring-gold/40">
              <h2 className="text-xl font-black text-cloud">{built.card.name}</h2>
              <p className="mt-1 text-cloud">Ask the owner to scan this with their phone camera. They install the free app and their card is already built.</p>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code that starts this business's TapCard" className="mt-4 aspect-square w-full max-w-[30rem] rounded-xl bg-white" />
              ) : <p className="mt-4 text-cloud">Making the QR code…</p>}
              <p className="mt-2 text-sm text-cloud">Screen brightness up, about 20 to 30 cm away. The link works for 30 days and can be opened more than once.</p>
              <div className="mt-4 rounded-xl bg-white/10 p-3 text-cloud">
                <p className="font-semibold">{PROMOTE_NOTE_TITLE}</p>
                <p className="mt-1 text-sm">{PROMOTE_NOTE}</p>
              </div>
              <form onSubmit={sendEmail} className="mt-5">
                <label htmlFor="we" className="block text-sm font-semibold text-cloud">Or email them the link</label>
                <div className="mt-1 flex gap-2">
                  <input id="we" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="owner@theirbusiness.co.uk" />
                  <button type="submit" disabled={sending || !email} className="btn-gold rounded-xl px-5 py-3 font-semibold disabled:opacity-50">{sending ? "…" : "Send"}</button>
                </div>
                <p className="mt-2 text-xs text-cloud">Only sends the link they asked for. Their address is not added to any list.</p>
              </form>
              {note && <p role="alert" className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${note.ok ? "bg-teal text-black" : "bg-red-600 text-white"}`}>{note.text}</p>}
              <label className="mt-5 block text-sm font-semibold text-cloud" htmlFor="wk">Type of business <span className="font-normal">(so the example offers suit them)</span></label>
              <select id="wk" value={kind} onChange={(e) => setKind(e.target.value)} className={`mt-1 ${field}`}>
                {DEMO_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button type="button" onClick={() => { setBuilt(null); setQ(""); setNote(null); }} className="mt-5 text-gold underline">Another business</button>
            </div>

            {/* The same element in both modes, so the story keeps its place when going full screen: on a phone it fills the screen and a swipe
                left or right switches between the owner and the customer. */}
            <div
              className={full ? "fixed left-0 right-0 top-0 z-50 overflow-y-auto overflow-x-hidden bg-[#0b0d12] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]" : "min-w-0"}
              style={full && vh ? ({ height: `${vh}px`, "--vh": `${vh}px` } as React.CSSProperties) : undefined}
              onTouchStart={full ? (e) => setTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY }) : undefined}
              onTouchEnd={full ? (e) => {
                if (!touch) return;
                const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
                setTouch(null);
                if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) {
                  const order = ["owner", "customer", "demo"] as const;
                  setTab(order[Math.max(0, Math.min(order.length - 1, order.indexOf(tab) + (dx < 0 ? 1 : -1)))]);
                }
              } : undefined}
            >
              <div className={`flex flex-wrap items-center gap-2 ${full ? "mb-2" : "mb-4"}`}>
                <div role="tablist" className="flex gap-2">
                  {([["owner", "Owner"], ["customer", "Customer"], ["demo", "Demo"]] as const).map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)}
                      className={`rounded-xl px-3 py-2 text-sm font-bold sm:px-5 sm:text-lg ${tab === id ? "btn-gold" : "bg-white/10 text-cloud"}`}>{label}</button>
                  ))}
                </div>
                <button type="button" onClick={() => setFull((v) => !v)} aria-label={full ? "Close full screen" : "Full screen"} className="ml-auto whitespace-nowrap rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-cloud sm:px-4 sm:text-lg">
                  {full ? "✕" : "Full screen"}
                </button>
              </div>
              
              <Phones
                name={built.card.name} website={built.card.website} kind={kind} built stage={4} typed={built.card.name}
                rows={rows.filter((r) => !r.social)} socials={rows.filter((r) => r.social)} buildSpinner={false} idleText="" view={tab === "demo" ? "both" : tab} fill={full} customerStartsWithCard={tab !== "demo"} showControls={tab === "demo"} showQr qrLink={built.link} brandColor={built.brandColor} rating={built.rating}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
