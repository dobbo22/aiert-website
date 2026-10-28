"use client";

import { useState } from "react";
import type { BizOrg } from "@/lib/tapcardBiz";
import { LOCKABLE_FIELDS } from "@/lib/tapcardBizFields";

const FIELD_LABELS: Record<(typeof LOCKABLE_FIELDS)[number], string> = {
  title: "Job title",
  company: "Company name",
  phone: "Phone",
  website: "Website",
  address: "Address",
  linkedinURL: "LinkedIn",
  twitterURL: "X (Twitter)",
  instagramURL: "Instagram",
  facebookURL: "Facebook",
  tiktokURL: "TikTok",
  whatsAppURL: "WhatsApp",
};

export default function TemplateForm({ org }: { org: BizOrg }) {
  const [name, setName] = useState(org.name);
  const [website, setWebsite] = useState(org.website);
  const [brandColor, setBrandColor] = useState(org.brand_color);
  const [linkedInURL, setLinkedInURL] = useState(org.linkedin_url);
  const [twitterURL, setTwitterURL] = useState(org.twitter_url);
  const [instagramURL, setInstagramURL] = useState(org.instagram_url);
  const [facebookURL, setFacebookURL] = useState(org.facebook_url);
  const [tiktokURL, setTiktokURL] = useState(org.tiktok_url);
  const [whatsAppURL, setWhatsAppURL] = useState(org.whatsapp_url);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set(org.locked_fields));
  const [allowsPersonalCards, setAllowsPersonalCards] = useState(org.allows_personal_cards);
  const [logoURL, setLogoURL] = useState(org.logo_url);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  // "Find your business": the same lookup the apps use to build a card. A typed name becomes a short list of real businesses; tapping
  // one fills in the name, website, brand colour and social links, and fetches the logo.
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; address: string; website: string; phone: string; type: string; hours: string }[]>([]);
  const [finding, setFinding] = useState(false);
  const [findNote, setFindNote] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>([]);

  async function search() {
    const q = query.trim();
    if (q.length < 3) return;
    setFinding(true); setFindNote(null); setHits([]); setFound([]);
    try {
      const res = await fetch(`/api/tapcard/business-search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.hits) ? data.hits : [];
      setHits(list);
      if (!list.length) setFindNote("No business found. Try the name with the town, or type your website below and tap Fetch from my website.");
    } catch {
      setFindNote("Something went wrong. Try again, or type your website below.");
    } finally { setFinding(false); }
    setSaved(false);
  }

  async function fillFrom(site: string, hit?: { name: string; address: string; phone: string; hours: string }) {
    setFinding(true); setFindNote(null);
    const summary: string[] = [];
    try {
      const res = await fetch("/api/tapcard/biz/find", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: site, address: hit?.address ?? "", name: hit?.name ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFindNote(data.error ?? "Couldn't read that website."); return; }
      const d = data.details ?? {};
      if (data.brandColor) { setBrandColor(data.brandColor); summary.push("brand colour"); }
      if (d.linkedin) { setLinkedInURL(d.linkedin); summary.push("LinkedIn"); }
      if (d.twitter) { setTwitterURL(d.twitter); summary.push("X"); }
      if (d.instagram) { setInstagramURL(d.instagram); summary.push("Instagram"); }
      if (d.facebook) { setFacebookURL(d.facebook); summary.push("Facebook"); }
      if (d.tiktok) { setTiktokURL(d.tiktok); summary.push("TikTok"); }
      // The rest is shown, not stored here: it belongs on each location's card (the apps fill it in the same way there).
      const rest: string[] = [];
      const phone = hit?.phone || d.phone; if (phone) rest.push(`phone ${phone}`);
      const address = hit?.address || d.address; if (address) rest.push(`address ${address}`);
      if (d.email) rest.push(`email ${d.email}`);
      if (hit?.hours) rest.push(`opening hours ${hit.hours}`);
      for (const l of (data.links ?? []) as { label: string; value: string }[]) rest.push(`${l.label}: ${l.value}`);
      setFound([...(summary.length ? [`Filled in: ${summary.join(", ")}.`] : []), ...(rest.length ? [`Also found for your location cards: ${rest.join("; ")}.`] : [])]);
      if (!summary.length && !rest.length) setFindNote("Nothing more was found on that website. You can type the details below.");
      await changeLogo(fetch("/api/tapcard/biz/logo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ website: site }) }));
    } catch {
      setFindNote("Something went wrong. Try again, or type the details below.");
    } finally { setFinding(false); setSaved(false); }
  }

  async function pick(hit: { name: string; address: string; website: string; phone: string; hours: string }) {
    setName(hit.name);
    setHits([]);
    if (hit.website) { setWebsite(hit.website); await fillFrom(hit.website, hit); }
    else setFindNote("That business has no website listed. Type it below and tap Fetch from my website.");
  }

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleLock(field: string) {
    setLockedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
    setSaved(false);
  }

  // The logo saves straight away through its own route (not "Save template").
  async function changeLogo(request: Promise<Response>) {
    setLogoBusy(true);
    setLogoError(null);
    try {
      const res = await request;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setLogoError(data.error ?? "Something went wrong — try again.");
      else setLogoURL(data.url ?? null);
    } catch {
      setLogoError("Something went wrong — try again.");
    } finally {
      setLogoBusy(false);
    }
  }

  function uploadLogo(file: File) {
    const form = new FormData();
    form.append("logo", file);
    return changeLogo(fetch("/api/tapcard/biz/logo", { method: "POST", body: form }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/tapcard/biz/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        website,
        brandColor,
        linkedInURL,
        twitterURL,
        instagramURL,
        facebookURL,
        tiktokURL,
        whatsAppURL,
        lockedFields: Array.from(lockedFields),
        allowsPersonalCards,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Find your business</h2>
        <p className="mt-1 text-sm text-mist">
          Type your business name and town, then tap it in the list. We fill in the details below for you: name, website, brand colour,
          logo and social profiles, read from Google and your website. Check them, then save.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }}
            placeholder={org.name ? `${org.name} and your town` : "Your business name and town"}
            className="min-w-0 flex-1 rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate"
          />
          <button type="button" onClick={() => void search()} disabled={finding || query.trim().length < 3}
            className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
            {finding ? "Searching…" : "Find business"}
          </button>
        </div>
        {hits.length > 0 && (
          <ul className="mt-3 space-y-2">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => void pick(h)}
                  className="w-full rounded-xl bg-slate/40 px-4 py-3 text-left text-cloud ring-1 ring-slate hover:ring-gold">
                  <span className="font-semibold">{h.name}</span>
                  <span className="block text-sm text-mist">{[h.type, h.address].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {findNote && <p className="mt-3 text-sm text-gold">{findNote}</p>}
        {found.map((line, i) => <p key={i} className="mt-3 text-sm text-cloud">{line}</p>)}
        <button type="button" onClick={() => website.trim() && void fillFrom(website.trim())} disabled={finding || !website.trim()}
          className="mt-4 text-sm font-semibold text-gold underline disabled:opacity-60">
          Not listed? Fetch from my website instead
        </button>
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Company details</h2>
        <p className="mt-1 text-sm text-mist">
          These fill in every employee&apos;s card automatically, and are locked by default below.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Company name" value={name} onChange={setName} />
          <Field label="Website" value={website} onChange={setWebsite} placeholder="company.com" />
          <Field label="Brand colour" value={brandColor} onChange={setBrandColor} placeholder="#1a73e8" />
        </div>
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Company logo</h2>
        <p className="mt-1 text-sm text-mist">
          Shown on every employee&apos;s card and Wallet pass. The logo from your website&apos;s header usually works
          best — a PNG with a transparent background.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-56 items-center justify-center rounded-xl bg-white p-3">
            {logoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoURL} alt="Company logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-sm text-slate">No logo yet</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className={`btn-gold cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold ${logoBusy ? "opacity-60" : ""}`}>
              Upload logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={logoBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadLogo(file);
                }}
              />
            </label>
            <button
              type="button"
              disabled={logoBusy}
              onClick={() => changeLogo(fetch("/api/tapcard/biz/logo", { method: "POST" }))}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate"
            >
              Use logo from website
            </button>
            {logoURL && (
              <button
                type="button"
                disabled={logoBusy}
                onClick={() => changeLogo(fetch("/api/tapcard/biz/logo", { method: "DELETE" }))}
                className="rounded-xl px-4 py-2 text-sm text-mist underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {logoBusy && <p className="mt-3 text-sm text-mist">Working…</p>}
        {logoError && <p className="mt-3 text-sm text-gold">{logoError}</p>}
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Company social links</h2>
        <p className="mt-1 text-sm text-mist">Shown on every employee&apos;s card instead of a personal profile.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="LinkedIn" value={linkedInURL} onChange={setLinkedInURL} />
          <Field label="X (Twitter)" value={twitterURL} onChange={setTwitterURL} />
          <Field label="Instagram" value={instagramURL} onChange={setInstagramURL} />
          <Field label="Facebook" value={facebookURL} onChange={setFacebookURL} />
          <Field label="TikTok" value={tiktokURL} onChange={setTiktokURL} />
          <Field label="WhatsApp" value={whatsAppURL} onChange={setWhatsAppURL} />
        </div>
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">What employees can edit</h2>
        <p className="mt-1 text-sm text-mist">
          Ticked fields are locked to the company&apos;s value above — employees can&apos;t change them. Name is always
          editable.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {LOCKABLE_FIELDS.map((field) => (
            <label key={field} className="flex items-center gap-2 text-cloud">
              <input type="checkbox" checked={lockedFields.has(field)} onChange={() => toggleLock(field)} />
              {FIELD_LABELS[field]} is locked
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Personal cards</h2>
        <label className="mt-3 flex items-center gap-2 text-cloud">
          <input
            type="checkbox"
            checked={allowsPersonalCards}
            onChange={(e) => setAllowsPersonalCards(e.target.checked)}
          />
          Let employees add a second, personal card alongside their company one
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="btn-gold rounded-xl px-6 py-3 font-semibold">
          {saving ? "Saving…" : "Save template"}
        </button>
        {saved && <span className="text-teal">Saved.</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-mist">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate placeholder:text-mist"
      />
    </label>
  );
}
