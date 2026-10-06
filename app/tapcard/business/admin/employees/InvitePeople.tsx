"use client";

import { useState } from "react";
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

/// The admin's staff file is read here, in their browser, and never
/// uploaded or kept by TapCard: only name/email/title go to
/// /api/tapcard/biz/invites to be signed into links, which come straight
/// back and are sent from the admin's own email (lib/tapcardBizInvite.ts).
export default function InvitePeople({ billingActive, orgName }: { billingActive: boolean; orgName: string }) {
  const [people, setPeople] = useState<Person[]>([]);
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setPeople(file.name.toLowerCase().endsWith(".vcf") ? parseVcf(text) : parseCsv(text));
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
        body: JSON.stringify({ people }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't create the links — try again.");
        return;
      }
      setInvites(people.map((p, i) => ({ ...p, link: data.invites[i].link })));
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
      <p className="mt-1 text-sm text-mist">
        Choose your staff list — a vCard (.vcf) exported from Outlook/M365, Google or iCloud, or a CSV with columns name,
        email, title. It&apos;s read on this computer only: TapCard never uploads or keeps your staff list. You get one
        invite link per person to send from your own email.
      </p>

      {!billingActive && (
        <p className="mt-3 rounded-xl bg-slate/40 px-4 py-3 text-gold">
          Billing isn&apos;t active yet, so invites can&apos;t be created right now.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <input type="file" accept=".csv,.vcf,text/csv,text/vcard" onChange={handleFile} disabled={!billingActive} className="text-cloud" />
        {fileName && (
          <span className="text-sm text-mist">
            {fileName} — {people.length} {people.length === 1 ? "person" : "people"} with an email address
          </span>
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
