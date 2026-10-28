"use client";

import { useState } from "react";
import LinkQr from "../LinkQr";
import { parseVcards } from "@/lib/vcardImport";

type Person = { name: string; email: string; title: string };
type Invite = Person & { link: string };

// Flat CSV: name,email,title (our own format, so no heavier parser).
function parseCsv(text: string): Person[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows = lines.map((line) => line.split(",").map((c) => c.trim()));
  // Skip a header row if the first row's second cell isn't an email.
  const start = rows[0]?.[1]?.includes("@") ? 0 : 1;
  return rows
    .slice(start)
    .map(([name, email, title]) => ({ name: name ?? "", email: email ?? "", title: title ?? "" }))
    .filter((p) => p.email.includes("@"));
}

// Outlook/M365, Google and iCloud "Export contacts" all produce one .vcf.
function parseVcf(text: string): Person[] {
  return parseVcards(text)
    .filter((c) => c.email)
    .map((c) => ({ name: c.name, email: c.email, title: c.title || "" }));
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// ---- Typing people in: the email is worked out from the name, in the company's own format.
// The format starts as first.last and is learned from the first email the admin types or corrects.
type Pattern = "first.last" | "firstlast" | "first_last" | "first-last" | "f.last" | "flast" | "first.l" | "firstl" | "first" | "last";
const PATTERNS: Pattern[] = ["first.last", "firstlast", "first_last", "first-last", "f.last", "flast", "first.l", "firstl", "first", "last"];

function nameParts(name: string): { first: string; last: string } | null {
  const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z\s'-]/g, "").replace(/['\u2019]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  return { first: words[0], last: words.length > 1 ? words[words.length - 1] : "" };
}

function localPart(name: string, pattern: Pattern): string {
  const p = nameParts(name);
  if (!p) return "";
  const { first, last } = p;
  if (!last) return first;
  switch (pattern) {
    case "first.last": return `${first}.${last}`;
    case "firstlast": return `${first}${last}`;
    case "first_last": return `${first}_${last}`;
    case "first-last": return `${first}-${last}`;
    case "f.last": return `${first[0]}.${last}`;
    case "flast": return `${first[0]}${last}`;
    case "first.l": return `${first}.${last[0]}`;
    case "firstl": return `${first}${last[0]}`;
    case "first": return first;
    case "last": return last;
  }
}

function learnPattern(name: string, email: string): Pattern | null {
  const local = email.split("@")[0]?.toLowerCase();
  if (!local || !nameParts(name)?.last) return null;
  return PATTERNS.find((pt) => localPart(name, pt) === local) ?? null;
}

/// The admin's staff file is read here, in their browser, and never
/// uploaded or kept by TapCard: only name/email/title go to
/// /api/tapcard/biz/invites to be signed into links, which come straight
/// back and are sent from the admin's own email (lib/tapcardBizInvite.ts).
type Row = Person & { key: number; emailEdited: boolean };
let rowKey = 1;
const newRow = (): Row => ({ key: rowKey++, name: "", email: "", title: "", emailEdited: false });

export interface ShopChoice { id: string; label: string }

/// `shops`: the shops these staff can belong to. A manager's list is their own shops (one is always chosen); an admin may leave it on "No shop".
export default function InvitePeople({ billingActive, orgName, domain, shops = [], shopRequired = false }: { billingActive: boolean; orgName: string; domain: string; shops?: ShopChoice[]; shopRequired?: boolean }) {
  const [shopId, setShopId] = useState(shopRequired ? shops[0]?.id ?? "" : "");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [pattern, setPattern] = useState<Pattern>("first.last");
  const [learned, setLearned] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [imported, setImported] = useState<Person[]>([]);
  const typed = rows.filter((r) => r.name.trim() && r.email.includes("@"));
  const people: Person[] = [...typed.map(({ name, email, title }) => ({ name, email, title })), ...imported];
  const [fileName, setFileName] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const subject = `Your ${orgName} TapCard`;
  const message = (i: Invite) =>
    `Hi ${i.name.split(" ")[0] || "there"},\n\nYour ${orgName} business card is ready on TapCard.\n\n` +
    `1. Install TapCard from the App Store or Google Play.\n2. Tap this link on your phone to set up your card:\n${i.link}\n\n` +
    `The link works once and expires in 30 days.`;

  function autoEmail(name: string, pt: Pattern): string {
    const local = localPart(name, pt);
    return local && domain ? `${local}@${domain}` : "";
  }

  function setName(key: number, name: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, name, email: r.emailEdited ? r.email : autoEmail(name, pattern) } : r)));
  }

  function setEmail(key: number, email: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, email, emailEdited: true } : r)));
  }

  // The first time a typed email matches a known format for that name, use that format for everyone after.
  function learnFrom(row: Row) {
    if (learned) return;
    const found = learnPattern(row.name, row.email);
    if (!found) return;
    setPattern(found);
    setLearned(true);
    setRows((rs) => rs.map((r) => (r.key !== row.key && !r.emailEdited ? { ...r, email: autoEmail(r.name, found) } : r)));
  }

  function setTitle(key: number, title: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, title } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setImported(file.name.toLowerCase().endsWith(".vcf") ? parseVcf(text) : parseCsv(text));
    setInvites([]);
    setError(null);
  }

  async function createLinks() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/tapcard/biz/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ people, locationId: shopId || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't create the links — try again.");
        return;
      }
      setInvites(people.map((p, i) => ({ ...p, link: data.invites[i].link })));
      setRows([newRow()]);
      setImported([]);
      setFileName(null);
    } catch {
      setError("Couldn't create the links — try again.");
    } finally {
      setWorking(false);
    }
  }

  function downloadMailMerge() {
    const rows = [["name", "email", "title", "link", "subject", "message"], ...invites.map((i) => [i.name, i.email, i.title, i.link, subject, message(i)])];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "tapcard-invites.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyLink(invite: Invite) {
    await navigator.clipboard.writeText(invite.link).catch(() => {});
    setCopied(invite.email);
  }

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Invite people</h2>
      {shops.length > 0 && (
        <label className="mb-4 flex flex-wrap items-center gap-3 text-cloud">
          <span className="text-sm text-mist">These staff work at</span>
          <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate">
            {!shopRequired && <option value="">No particular shop</option>}
            {shops.map((sh) => <option key={sh.id} value={sh.id}>{sh.label}</option>)}
          </select>
        </label>
      )}
      <p className="mt-1 text-sm text-mist">
        Type each person&apos;s name and we fill in the email{domain ? ` (@${domain})` : ""}. Change the first one if your company
        uses a different format, for example j.smith, and the rest follow it. You get one invite link per person to send from
        your own email. Nothing you type here is stored by TapCard.
      </p>

      {!billingActive && (
        <p className="mt-3 rounded-xl bg-slate/40 px-4 py-3 text-gold">
          Billing isn&apos;t active yet, so invites can&apos;t be created right now.
        </p>
      )}

      <div className="mt-4 space-y-2">
        <div className="hidden grid-cols-[1.2fr_1.5fr_1fr] gap-2 text-xs text-mist sm:grid">
          <span>Name</span><span>Email</span><span>Job title (optional)</span>
        </div>
        {rows.map((r, idx) => (
          <div key={r.key} className="grid gap-2 sm:grid-cols-[1.2fr_1.5fr_1fr]">
            <input
              value={r.name} onChange={(e) => setName(r.key, e.target.value)} disabled={!billingActive}
              placeholder="First and last name" aria-label="Name" autoFocus={idx === rows.length - 1 && idx > 0}
              className="rounded-xl bg-slate/40 px-3 py-2 text-cloud"
            />
            <input
              value={r.email} onChange={(e) => setEmail(r.key, e.target.value)} onBlur={() => learnFrom(r)} disabled={!billingActive}
              placeholder={domain ? `name@${domain}` : "name@company.com"} aria-label="Email" type="email"
              className="rounded-xl bg-slate/40 px-3 py-2 text-cloud"
            />
            <input
              value={r.title} onChange={(e) => setTitle(r.key, e.target.value)} disabled={!billingActive}
              placeholder="e.g. Manager" aria-label="Job title"
              onKeyDown={(e) => { if (e.key === "Enter" && idx === rows.length - 1 && r.name.trim()) { e.preventDefault(); addRow(); } }}
              className="rounded-xl bg-slate/40 px-3 py-2 text-cloud"
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button type="button" onClick={addRow} disabled={!billingActive} className="text-gold underline">+ Add another person</button>
          {learned && <span className="text-sm text-mist">Using your format: {localPart("Jane Smith", pattern)}@{domain}</span>}
        </div>
      </div>

      <div className="mt-4">
        <button type="button" onClick={() => setShowImport(!showImport)} className="text-sm text-mist underline">
          {showImport ? "Hide list import" : "Have a staff list instead? Import a .vcf or CSV"}
        </button>
        {showImport && (
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <input type="file" accept=".csv,.vcf,text/csv,text/vcard" onChange={handleFile} disabled={!billingActive} className="text-cloud" />
            {fileName && <span className="text-sm text-mist">{fileName}: {imported.length} {imported.length === 1 ? "person" : "people"} added</span>}
            <span className="text-sm text-mist">CSV columns: name, email, title. Read on this computer only.</span>
          </div>
        )}
      </div>

      {people.length > 0 && invites.length === 0 && (
        <button type="button" onClick={createLinks} disabled={working || !billingActive} className="btn-gold mt-4 rounded-xl px-6 py-3 font-semibold">
          {working ? "Creating links…" : `Create ${people.length} invite ${people.length === 1 ? "link" : "links"}`}
        </button>
      )}
      {error && <p className="mt-3 text-gold">{error}</p>}

      {invites.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={downloadMailMerge} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold">
              Download for mail merge (CSV)
            </button>
            <span className="text-sm text-mist">Each link works once and expires in 30 days. Not saved — download or send them now.</span>
          </div>
          <table className="mt-4 w-full text-left text-sm text-cloud">
            <thead>
              <tr className="border-b border-slate text-mist">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.link} className="border-b border-slate/50">
                  <td className="py-2 pr-4">{i.name}</td>
                  <td className="py-2 pr-4">{i.email}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => copyLink(i)} className="text-gold underline">
                      {copied === i.email ? "Copied" : "Copy link"}
                    </button>
                    <a
                      href={`mailto:${encodeURIComponent(i.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message(i))}`}
                      className="ml-4 text-gold underline"
                    >
                      Email
                    </a>
                    <span className="ml-4 align-top"><LinkQr link={i.link} /></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
