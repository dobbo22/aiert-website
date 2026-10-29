"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Phones from "@/app/tapcard/demo/Phones";
import { rowsFor, type Card } from "@/app/tapcard/demo/DemoBuilder";
import { DEMO_KINDS } from "@/app/tapcard/demo/demoOffers";

interface Hit { id: string; name: string; address: string; type: string; lat?: number; lng?: number }
interface Built { card: Card; token: string; link: string }

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
    const res = await fetch(`/api/admin/tapcard/walkin?q=${encodeURIComponent(q.trim())}`).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { hits?: Hit[]; error?: string } | null;
    setSearching(false);
    if (!res?.ok) { setNote({ text: data?.error ?? "Couldn't search. Try again.", ok: false }); return; }
    setHits(data?.hits ?? []);
    if (!data?.hits?.length) setNote({ text: "Nothing found. Try the name and the town.", ok: false });
  }

  async function build(h: Hit) {
    setBuilding(true); setNote(null); setBuilt(null);
    const res = await fetch("/api/admin/tapcard/walkin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: h.name, address: h.address, lat: h.lat, lng: h.lng }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as (Built & { error?: string }) | null;
    setBuilding(false);
    if (!res?.ok || !data?.card) { setNote({ text: data?.error ?? "Couldn't build the card. Try again.", ok: false }); return; }
    setBuilt({ card: data.card, token: data.token, link: data.link });
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
              className={full ? "fixed inset-0 z-50 overflow-y-auto bg-[#0b0d12] p-3" : "min-w-0"}
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
              <div className="mb-4 flex items-center gap-2">
                <div role="tablist" className="flex gap-2">
                  {([["owner", "Owner"], ["customer", "Customer"], ["demo", "Demo"]] as const).map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)}
                      className={`rounded-xl px-5 py-2 text-lg font-bold ${tab === id ? "btn-gold" : "bg-white/10 text-cloud"}`}>{label}</button>
                  ))}
                </div>
                <button type="button" onClick={() => setFull((v) => !v)} className="ml-auto rounded-xl bg-white/10 px-4 py-2 text-lg font-bold text-cloud">
                  {full ? "Close ✕" : "Full screen"}
                </button>
              </div>
              {full && <p className="mb-3 text-center text-sm text-cloud">Swipe left or right to switch between Owner, Customer and Demo.</p>}
              <Phones
                name={built.card.name} website={built.card.website} kind={kind} built stage={4} typed={built.card.name}
                rows={rows.filter((r) => !r.social)} socials={rows.filter((r) => r.social)} buildSpinner={false} idleText="" view={tab === "demo" ? "both" : tab} fill={full} customerStartsWithCard={tab !== "demo"} showControls={tab === "demo"}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
