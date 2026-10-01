"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_CAMPAIGN,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE,
  type InviteChannel,
  personalise,
  whatsappNumber,
} from "@/lib/inviteTemplates";
import { parseVcards } from "@/lib/vcardImport";

export type SenderContact = {
  id: number;
  name: string;
  first_name: string;
  email: string;
  phone: string;
  company: string;
  do_not_contact: boolean;
  channels: string[];
  last_sent_at: string | null;
  clicked: boolean;
};

type Filter = "all" | "not-invited" | "has-email" | "has-mobile" | "clicked";
type Draft = { email?: string; whatsapp?: string };

const IMPORT_CHUNK = 500;
const EMAIL_GAP_MS = 600; // stays under Resend's default 2 requests/second

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function InviteSender({ contacts }: { contacts: SenderContact[] }) {
  const router = useRouter();

  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN);
  const [subject, setSubject] = useState(DEFAULT_EMAIL_SUBJECT);
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("not-invited");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [previewChannel, setPreviewChannel] = useState<"email" | "whatsapp">("email");
  const [allowRepeat, setAllowRepeat] = useState(false);

  const [waQueue, setWaQueue] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q && ![c.name, c.email, c.phone, c.company].some((v) => v.toLowerCase().includes(q))) return false;
      switch (filter) {
        case "not-invited":
          return c.channels.length === 0 && !c.do_not_contact;
        case "has-email":
          return !!c.email;
        case "has-mobile":
          return !!whatsappNumber(c.phone);
        case "clicked":
          return c.clicked;
        default:
          return true;
      }
    });
  }, [contacts, search, filter]);

  const focused = focusedId != null ? byId.get(focusedId) ?? null : null;
  const selectedContacts = [...selected].map((id) => byId.get(id)).filter((c): c is SenderContact => !!c);
  const selectedWithEmail = selectedContacts.filter((c) => c.email && !c.do_not_contact);
  const selectedWithMobile = selectedContacts.filter((c) => whatsappNumber(c.phone) && !c.do_not_contact);

  function messageFor(contact: SenderContact, channel: "email" | "whatsapp"): string {
    const draft = drafts[contact.id]?.[channel];
    if (draft != null) return draft;
    // {link} stays as a placeholder — the server swaps in this person's tracked link.
    return personalise(channel === "email" ? emailTemplate : waTemplate, contact, "{link}");
  }

  async function postSend(contact: SenderContact, channel: InviteChannel) {
    const res = await fetch("/api/admin/invites/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: contact.id,
        channel,
        campaign,
        subject,
        message: messageFor(contact, channel === "email" ? "email" : "whatsapp"),
        allowRepeat,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, ...json } as { ok: boolean; error?: string; skipped?: boolean; waUrl?: string; link?: string; text?: string };
  }

  async function importFile(file: File) {
    setBusy(true);
    setStatus({ text: `Reading ${file.name}…` });
    try {
      const parsed = parseVcards(await file.text());
      if (parsed.length === 0) {
        setStatus({ text: "No contacts with an email or phone number found in that file.", error: true });
        return;
      }
      let done = 0;
      for (let i = 0; i < parsed.length; i += IMPORT_CHUNK) {
        const res = await fetch("/api/admin/invites/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts: parsed.slice(i, i + IMPORT_CHUNK) }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Import failed (${res.status})`);
        done += (await res.json()).imported ?? 0;
        setStatus({ text: `Imported ${done} of ${parsed.length}…` });
      }
      setStatus({ text: `Imported ${done} contacts.` });
      router.refresh();
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : "Import failed", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function sendEmails(list: SenderContact[]) {
    setBusy(true);
    let sent = 0;
    let skipped = 0;
    const failures: string[] = [];
    for (const [i, contact] of list.entries()) {
      setStatus({ text: `Emailing ${i + 1} of ${list.length}: ${contact.name}…` });
      const result = await postSend(contact, "email");
      if (result.ok) sent++;
      else if (result.skipped) skipped++;
      else failures.push(`${contact.name}: ${result.error}`);
      if (i < list.length - 1) await sleep(EMAIL_GAP_MS);
    }
    setBusy(false);
    setStatus({
      text: [`Sent ${sent} email${sent === 1 ? "" : "s"}.`, skipped ? `${skipped} skipped (already invited).` : "", ...failures].filter(Boolean).join(" "),
      error: failures.length > 0,
    });
    setSelected(new Set());
    router.refresh();
  }

  // WhatsApp can't be sent by a server from a personal account, so each one
  // opens WhatsApp with the message filled in. The window is opened inside
  // the click itself (before the fetch) so the browser doesn't block it.
  async function openWhatsApp(contact: SenderContact) {
    const win = window.open("about:blank", "_blank");
    const result = await postSend(contact, "whatsapp");
    if (result.ok && result.waUrl) {
      if (win) win.location.href = result.waUrl;
      else window.location.href = result.waUrl;
      setStatus({ text: `WhatsApp opened for ${contact.name}. Press Send in WhatsApp.` });
      return true;
    }
    win?.close();
    setStatus({
      text: result.skipped ? `${contact.name} already has a WhatsApp invite for "${campaign}". Tick "Allow repeat sends" to send again.` : `${contact.name}: ${result.error}`,
      error: true,
    });
    return result.skipped ?? false;
  }

  async function copyLink(contact: SenderContact) {
    const result = await postSend(contact, "link");
    if (result.ok && result.text) {
      await navigator.clipboard.writeText(result.text);
      setStatus({ text: `Message with ${contact.name}'s tracked link copied. Paste it anywhere (SMS, LinkedIn…).` });
      router.refresh();
    } else {
      setStatus({ text: result.skipped ? "Already sent a copied link for this campaign." : `${contact.name}: ${result.error}`, error: true });
    }
  }

  async function updateContact(contact: SenderContact, body: object) {
    await fetch("/api/admin/invites/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact.id, ...body }),
    });
    router.refresh();
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const queueHead = waQueue.length ? byId.get(waQueue[0]) : undefined;

  return (
    <div className="invite-sender">
      <section className="social-compose invite-setup">
        <div className="invite-setup-row">
          <label className="invite-field">
            <span>Import iCloud contacts (.vcf)</span>
            <input
              type="file"
              accept=".vcf,text/vcard,text/x-vcard"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importFile(file);
                e.target.value = "";
              }}
            />
            <small>
              iCloud.com → Contacts → select all (⌘A) → ⚙︎ → Export vCard. Re-import any time;
              existing people are updated, not duplicated.
            </small>
          </label>
          <label className="invite-field">
            <span>Campaign name</span>
            <input value={campaign} onChange={(e) => setCampaign(e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase())} maxLength={30} />
            <small>Shows up in App Store Connect as {`${campaign}-email`}, {`${campaign}-whatsapp`}…</small>
          </label>
        </div>

        <div className="invite-templates">
          <div>
            <label className="invite-field">
              <span>Email subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="invite-field">
              <span>Email message</span>
              <textarea rows={12} value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)} />
            </label>
          </div>
          <label className="invite-field">
            <span>WhatsApp message</span>
            <textarea rows={12} value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} />
          </label>
        </div>
      </section>

      {status && <p className={status.error ? "social-compose-error" : "social-compose-success"}>{status.text}</p>}

      {queueHead && (
        <div className="invite-queue">
          <span>
            WhatsApp {waQueue.length} to go. Next: <strong>{queueHead.name}</strong>
          </span>
          <button
            className="social-post-btn invite-wa-btn"
            disabled={busy}
            onClick={async () => {
              if (await openWhatsApp(queueHead)) setWaQueue((q) => q.slice(1));
            }}
          >
            Open WhatsApp for {queueHead.first_name || queueHead.name}
          </button>
          <button className="invite-link-btn" onClick={() => setWaQueue((q) => q.slice(1))}>
            Skip
          </button>
          <button className="invite-link-btn" onClick={() => { setWaQueue([]); router.refresh(); }}>
            Stop
          </button>
        </div>
      )}

      <div className="invite-columns">
        <section className="invite-list">
          <div className="invite-list-tools">
            <input placeholder="Search name, email, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="not-invited">Not invited yet</option>
              <option value="all">Everyone</option>
              <option value="has-email">Has email</option>
              <option value="has-mobile">Has mobile</option>
              <option value="clicked">Clicked</option>
            </select>
          </div>
          <div className="invite-list-tools">
            <button className="invite-link-btn" onClick={() => setSelected(new Set(visible.filter((c) => !c.do_not_contact).map((c) => c.id)))}>
              Select all {visible.length}
            </button>
            <button className="invite-link-btn" onClick={() => setSelected(new Set())}>
              Clear
            </button>
            <label className="invite-check">
              <input type="checkbox" checked={allowRepeat} onChange={(e) => setAllowRepeat(e.target.checked)} /> Allow repeat sends
            </label>
          </div>

          {selected.size > 0 && (
            <div className="invite-bulk">
              <span>{selected.size} selected</span>
              <button
                className="social-post-btn"
                disabled={busy || selectedWithEmail.length === 0}
                onClick={() => {
                  if (confirm(`Send the email to ${selectedWithEmail.length} people now?`)) sendEmails(selectedWithEmail);
                }}
              >
                Email {selectedWithEmail.length}
              </button>
              <button
                className="social-post-btn invite-wa-btn"
                disabled={busy || selectedWithMobile.length === 0}
                onClick={() => setWaQueue(selectedWithMobile.map((c) => c.id))}
              >
                WhatsApp {selectedWithMobile.length} one by one
              </button>
            </div>
          )}

          {contacts.length === 0 ? (
            <p className="social-empty">No contacts yet. Import your iCloud export above.</p>
          ) : (
            <ul className="invite-rows">
              {visible.slice(0, 500).map((c) => (
                <li key={c.id} className={`invite-row ${focusedId === c.id ? "invite-row-focused" : ""} ${c.do_not_contact ? "invite-row-dnc" : ""}`}>
                  <input type="checkbox" checked={selected.has(c.id)} disabled={c.do_not_contact} onChange={() => toggle(c.id)} />
                  <button className="invite-row-main" onClick={() => setFocusedId(c.id)}>
                    <span className="invite-row-name">{c.name}</span>
                    <span className="invite-row-sub">{[c.company, c.email || c.phone].filter(Boolean).join(" · ")}</span>
                  </button>
                  <span className="invite-badges">
                    {c.do_not_contact && <span className="invite-badge invite-badge-dnc">Do not contact</span>}
                    {c.channels.map((ch) => (
                      <span key={ch} className="invite-badge">{ch === "link" ? "copied" : ch}</span>
                    ))}
                    {c.clicked && <span className="invite-badge invite-badge-clicked">clicked</span>}
                  </span>
                </li>
              ))}
              {visible.length > 500 && <li className="social-empty">Showing 500 of {visible.length}. Search to narrow down.</li>}
            </ul>
          )}
        </section>

        <section className="invite-preview social-compose">
          {!focused ? (
            <p className="social-empty">Click a name to preview and edit their message.</p>
          ) : (
            <>
              <h3>{focused.name}</h3>
              <p className="invite-row-sub">
                {[focused.company, focused.email, focused.phone].filter(Boolean).join(" · ") || "No details"}
              </p>
              <div className="social-tabs invite-preview-tabs">
                {(["email", "whatsapp"] as const).map((ch) => (
                  <button key={ch} className={`social-tab ${previewChannel === ch ? "social-tab-active" : ""}`} onClick={() => setPreviewChannel(ch)}>
                    {ch === "email" ? "Email" : "WhatsApp"}
                  </button>
                ))}
              </div>
              {previewChannel === "email" && <p className="invite-subject">Subject: {personalise(subject, focused, "{link}")}</p>}
              <textarea
                rows={14}
                value={messageFor(focused, previewChannel)}
                onChange={(e) => setDrafts((d) => ({ ...d, [focused.id]: { ...d[focused.id], [previewChannel]: e.target.value } }))}
              />
              <small>Edits here are just for {focused.first_name || focused.name}. {"{link}"} becomes their tracked link.</small>
              <div className="invite-actions">
                {previewChannel === "email" ? (
                  <button
                    className="social-post-btn"
                    disabled={busy || !focused.email || focused.do_not_contact}
                    onClick={() => sendEmails([focused])}
                  >
                    {focused.email ? "Send email" : "No email address"}
                  </button>
                ) : (
                  <button
                    className="social-post-btn invite-wa-btn"
                    disabled={busy || !whatsappNumber(focused.phone) || focused.do_not_contact}
                    onClick={async () => {
                      await openWhatsApp(focused);
                      router.refresh();
                    }}
                  >
                    {whatsappNumber(focused.phone) ? "Open in WhatsApp" : "No mobile number"}
                  </button>
                )}
                <button className="invite-link-btn" disabled={busy || focused.do_not_contact} onClick={() => copyLink(focused)}>
                  Copy message with link
                </button>
                {drafts[focused.id] && (
                  <button className="invite-link-btn" onClick={() => setDrafts((d) => ({ ...d, [focused.id]: {} }))}>
                    Reset to template
                  </button>
                )}
              </div>
              <div className="invite-actions invite-actions-minor">
                <label className="invite-check">
                  <input
                    type="checkbox"
                    checked={focused.do_not_contact}
                    onChange={(e) => updateContact(focused, { doNotContact: e.target.checked })}
                  />{" "}
                  Do not contact
                </label>
                <button
                  className="invite-link-btn"
                  onClick={() => {
                    if (confirm(`Delete ${focused.name} and their invite history?`)) {
                      setFocusedId(null);
                      updateContact(focused, { action: "delete" });
                    }
                  }}
                >
                  Delete contact
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
