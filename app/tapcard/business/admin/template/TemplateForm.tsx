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
