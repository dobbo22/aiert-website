"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_CAMPAIGN,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE,
  type InviteChannel,
  PERSONAL_NOTE_MARKER,
  personalise,
  whatsappNumber,
} from "@/lib/inviteTemplates";
import { DAILY_EMAIL_LIMIT, INVITE_EMAIL_FROM_DISPLAY, inviteEmailHtml } from "@/lib/inviteEmail";
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
type Draft = { email?: string; whatsapp?: string; subject?: string };

const IMPORT_CHUNK = 500;
// Stand-ins for the person's real links in the email preview — the server
// creates the actual tracked links when it sends.
const PREVIEW_LINK = "https://tapcard.aiert.co.uk/i/xxxxxxxx";
const PREVIEW_SHARE_LINK = "https://tapcard.aiert.co.uk/p/xxxxxxxx";
const PREVIEW_ANDROID_LINK = "https://tapcard.aiert.co.uk/w/xxxxxxxx";

export default function InviteSender({ contacts, emailsSentToday }: { contacts: SenderContact[]; emailsSentToday: number }) {
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
  // Emails are never sent in bulk: ticked people go into this queue and each
  // one is shown (as the email will look) for checking and personalising
  // before Send. At most DAILY_EMAIL_LIMIT a day (UK time), enforced by the
  // server too.
  const [emailQueue, setEmailQueue] = useState<number[]>([]);
  const [emailsToday, setEmailsToday] = useState(emailsSentToday);
  const [emailView, setEmailView] = useState<"preview" | "edit">("preview");
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
    return personalise(channel === "email" ? emailTemplate : waTemplate, contact, "{link}", "{shareLink}", "{androidLink}");
  }

  /// The email still has the "[personalise here…]" line in it.
  function needsPersonalNote(contact: SenderContact): boolean {
    return PERSONAL_NOTE_MARKER.test(messageFor(contact, "email"));
  }

  function subjectFor(contact: SenderContact): string {
    return drafts[contact.id]?.subject ?? personalise(subject, contact, "{link}", "{shareLink}");
  }

  function previewHtml(contact: SenderContact): string {
    let text = messageFor(contact, "email");
    if (!text.includes("{link}")) text += "\n\n{link}"; // as the server does
    return inviteEmailHtml({
      text: text
        .replaceAll("{shareLink}", PREVIEW_SHARE_LINK)
        .replaceAll("{androidLink}", PREVIEW_ANDROID_LINK)
        .replaceAll("{link}", PREVIEW_LINK),
      link: PREVIEW_LINK,
      passOnLink: PREVIEW_SHARE_LINK,
      androidLink: PREVIEW_ANDROID_LINK,
      unsubscribeUrl: "#",
    });
  }

  async function postSend(contact: SenderContact, channel: InviteChannel) {
    const res = await fetch("/api/admin/invites/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: contact.id,
        channel,
        campaign,
        subject: subjectFor(contact),
        message: messageFor(contact, channel === "email" ? "email" : "whatsapp"),
        allowRepeat,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, ...json } as {
      ok: boolean;
      error?: string;
      skipped?: boolean;
      limitReached?: boolean;
      waUrl?: string;
      link?: string;
      text?: string;
    };
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

  function startEmailQueue(list: SenderContact[]) {
    const room = Math.max(0, DAILY_EMAIL_LIMIT - emailsToday);
    const ids = list.slice(0, room).map((c) => c.id);
    setEmailQueue(ids);
    if (ids.length) {
      setFocusedId(ids[0]);
      setPreviewChannel("email");
      setEmailView("preview");
    }
    setStatus(
      list.length > room
        ? { text: `Only ${room} more email${room === 1 ? "" : "s"} allowed today, so ${room} queued. Send the rest tomorrow.`, error: room === 0 }
        : { text: `${ids.length} email${ids.length === 1 ? "" : "s"} queued. Check each one, then press Send.` },
    );
  }

  function advanceEmailQueue(fromId: number) {
    const next = emailQueue.filter((id) => id !== fromId);
    setEmailQueue(next);
    if (next.length) {
      setFocusedId(next[0]);
      setEmailView("preview");
    } else {
      router.refresh();
    }
  }

  async function sendOneEmail(contact: SenderContact) {
    setBusy(true);
    const result = await postSend(contact, "email");
    setBusy(false);
    if (result.ok) {
      setEmailsToday((n) => n + 1);
      setStatus({ text: `Sent to ${contact.name}.` });
      advanceEmailQueue(contact.id);
    } else if (result.skipped) {
      setStatus({ text: `${contact.name} was already emailed for "${campaign}". Skipped.` });
      advanceEmailQueue(contact.id);
    } else {
      if (result.limitReached) setEmailQueue([]);
      setStatus({ text: `${contact.name}: ${result.error}`, error: true });
    }
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
  const emailHead = emailQueue.length ? byId.get(emailQueue[0]) : undefined;

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

      <p className="invite-quota">
        Emails today: <strong>{emailsToday}</strong> of {DAILY_EMAIL_LIMIT}, from {INVITE_EMAIL_FROM_DISPLAY} (UK day)
      </p>

      {emailHead && (
        <div className="invite-queue invite-queue-email">
          <span>
            Email {emailQueue.length} to go. Checking: <strong>{emailHead.name}</strong>, shown on the right.
          </span>
          <button className="invite-link-btn" onClick={() => advanceEmailQueue(emailHead.id)}>
            Skip
          </button>
          <button className="invite-link-btn" onClick={() => { setEmailQueue([]); router.refresh(); }}>
            Stop
          </button>
        </div>
      )}

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
                disabled={busy || selectedWithEmail.length === 0 || emailsToday >= DAILY_EMAIL_LIMIT}
                onClick={() => startEmailQueue(selectedWithEmail)}
              >
                Review &amp; email {Math.min(selectedWithEmail.length, Math.max(0, DAILY_EMAIL_LIMIT - emailsToday))} one by one
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
              {previewChannel === "email" ? (
                <div className="invite-mail">
                  <div className="invite-mail-head">
                    <div><span>From</span>{INVITE_EMAIL_FROM_DISPLAY}</div>
                    <div><span>To</span>{focused.name} &lt;{focused.email || "no email address"}&gt;</div>
                    <div className="invite-mail-subject">
                      <span>Subject</span>
                      <input
                        value={subjectFor(focused)}
                        onChange={(e) => setDrafts((d) => ({ ...d, [focused.id]: { ...d[focused.id], subject: e.target.value } }))}
                      />
                    </div>
                  </div>
                  <div className="social-tabs invite-mail-tabs">
                    <button className={`social-tab ${emailView === "preview" ? "social-tab-active" : ""}`} onClick={() => setEmailView("preview")}>
                      Preview
                    </button>
                    <button className={`social-tab ${emailView === "edit" ? "social-tab-active" : ""}`} onClick={() => setEmailView("edit")}>
                      Edit message
                    </button>
                  </div>
                  {emailView === "preview" ? (
                    <iframe className="invite-mail-body" title="Email preview" sandbox="" srcDoc={previewHtml(focused)} />
                  ) : (
                    <textarea
                      rows={14}
                      value={messageFor(focused, "email")}
                      onChange={(e) => setDrafts((d) => ({ ...d, [focused.id]: { ...d[focused.id], email: e.target.value } }))}
                    />
                  )}
                </div>
              ) : (
                <textarea
                  rows={14}
                  value={messageFor(focused, "whatsapp")}
                  onChange={(e) => setDrafts((d) => ({ ...d, [focused.id]: { ...d[focused.id], whatsapp: e.target.value } }))}
                />
              )}
              {previewChannel === "email" && needsPersonalNote(focused) && (
                <p className="social-compose-error">
                  Click <strong>Edit message</strong> and replace the highlighted [personalise here…] bit with a line
                  about how you know {focused.first_name || focused.name} (or delete it). Send unlocks once it&apos;s gone.
                </p>
              )}
              <small>
                Changes here are just for {focused.first_name || focused.name}. {"{link}"} becomes their tracked link and{" "}
                {"{shareLink}"} their pass-it-on link, {"{androidLink}"} their &quot;tell me when it&apos;s on Android&quot; link{previewChannel === "email" ? " (shown as xxxxxxxx in the preview)" : ""}.
              </small>
              <div className="invite-actions">
                {previewChannel === "email" ? (
                  <button
                    className="social-post-btn"
                    disabled={busy || !focused.email || focused.do_not_contact || emailsToday >= DAILY_EMAIL_LIMIT || needsPersonalNote(focused)}
                    onClick={() => sendOneEmail(focused)}
                  >
                    {!focused.email
                      ? "No email address"
                      : emailsToday >= DAILY_EMAIL_LIMIT
                        ? "Daily limit reached"
                        : needsPersonalNote(focused)
                          ? "Personalise first"
                          : busy
                            ? "Sending…"
                            : "Send this email"}
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
