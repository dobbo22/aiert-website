"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_CAMPAIGN,
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_SOCIAL_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE,
  type InviteChannel,
  PERSONAL_NOTE_MARKER,
  PERSONAL_NOTE_PRESETS,
  type SocialChannel,
  applyPersonalNote,
  personalise,
  whatsappNumber,
} from "@/lib/inviteTemplates";
import { inviteEmailHtml } from "@/lib/inviteEmail";
import { parseLinkedinConnections } from "@/lib/linkedinImport";
import { parseVcards } from "@/lib/vcardImport";

export type SenderContact = {
  id: number;
  name: string;
  first_name: string;
  email: string;
  phone: string;
  company: string;
  linkedin_url: string;
  facebook_url: string;
  title: string;
  website: string;
  x_url: string;
  instagram_url: string;
  photo_url: string;
  do_not_contact: boolean;
  channels: string[];
  bounced: boolean;
  last_sent_at: string | null;
  clicked: boolean;
};

type Filter = "all" | "not-invited" | "has-email" | "has-mobile" | "has-linkedin" | "has-facebook" | "clicked";
/// Which template a channel's message comes from: LinkedIn and Messenger share one.
type MessageKind = "email" | "whatsapp" | "social";
type Draft = { email?: string; whatsapp?: string; social?: string; subject?: string };
type PreviewChannel = "email" | "whatsapp" | SocialChannel;

const SOCIAL_LABEL: Record<SocialChannel, string> = { linkedin: "LinkedIn", messenger: "Messenger" };

function kindFor(channel: InviteChannel): MessageKind {
  if (channel === "email") return "email";
  return channel === "linkedin" || channel === "messenger" ? "social" : "whatsapp";
}

/// Copies text that's still being fetched. The copy has to start inside the
/// click (Safari refuses otherwise), so the clipboard is handed a promise.
async function copyWhenReady(text: Promise<string | null>): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const blob = text.then((t) => {
        if (t == null) throw new Error("nothing to copy");
        return new Blob([t], { type: "text/plain" });
      });
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return true;
    }
  } catch {
    // fall through to writeText
  }
  const t = await text;
  if (t == null) return false;
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    return false;
  }
}

const IMPORT_CHUNK = 500;
// Stand-ins for the person's real links in the email preview — the server
// creates the actual tracked links when it sends.
const PREVIEW_LINK = "https://tapcard.aiert.co.uk/i/xxxxxxxx";
const PREVIEW_SHARE_LINK = "https://tapcard.aiert.co.uk/p/xxxxxxxx";
const PREVIEW_ANDROID_LINK = "https://tapcard.aiert.co.uk/w/xxxxxxxx";

export default function InviteSender({
  contacts,
  emailsSentToday,
  emailFrom,
  emailFromAddress,
  freeOffer,
  offerSubject,
}: {
  contacts: SenderContact[];
  emailsSentToday: number;
  /// Who invite emails currently come from (Outlook or Resend — lib/inviteEmailRoute.ts).
  emailFrom: string;
  emailFromAddress: string;
  /// The live {freeOffer} line (lib/tapcardFounders.ts); the server fills in
  /// a fresh one when it sends.
  freeOffer: string;
  offerSubject: string;
}) {
  const router = useRouter();

  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN);
  const [subject, setSubject] = useState(DEFAULT_EMAIL_SUBJECT);
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);
  const [socialTemplate, setSocialTemplate] = useState(DEFAULT_SOCIAL_TEMPLATE);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  // "How you know them" per person: a preset id, or "custom" (typed straight
  // into the message, over the [personalise here…] marker).
  const [notes, setNotes] = useState<Record<number, { choice: string; text: string }>>({});
  const messageRef = useRef<HTMLTextAreaElement>(null);
  // Bumped to open the message editor with the marker selected, ready to type over.
  const [selectMarker, setSelectMarker] = useState(0);
  useEffect(() => {
    if (!selectMarker) return;
    const el = messageRef.current;
    if (!el) return;
    el.focus();
    const m = el.value.match(PERSONAL_NOTE_MARKER);
    if (m?.index != null) {
      el.setSelectionRange(m.index, m.index + m[0].length);
      // Bring the selection into view on long messages.
      el.scrollTop = Math.max(0, (el.value.slice(0, m.index).split("\n").length - 3) * 20);
    }
  }, [selectMarker]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("not-invited");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>("email");
  const [allowRepeat, setAllowRepeat] = useState(false);

  const [waQueue, setWaQueue] = useState<number[]>([]);
  // LinkedIn / Messenger: like the email queue, each person is shown in the
  // preview panel to personalise, then "Copy & open" moves to the next.
  const [socialQueue, setSocialQueue] = useState<{ channel: SocialChannel; ids: number[] } | null>(null);
  const [uncopied, setUncopied] = useState<string | null>(null);
  const [profileInput, setProfileInput] = useState<{ id: number; value: string } | null>(null);
  // A corrected "To" address being typed; saved to the contact on Save or Send.
  const [emailInput, setEmailInput] = useState<{ id: number; value: string } | null>(null);
  // Same for the WhatsApp mobile number.
  const [phoneInput, setPhoneInput] = useState<{ id: number; value: string } | null>(null);
  const [cardVersion, setCardVersion] = useState(0);
  // Emails are never sent in bulk: ticked people go into this queue and each
  // one is shown (as the email will look) for checking and personalising
  // before Send.
  const [emailQueue, setEmailQueue] = useState<number[]>([]);
  const [emailsToday, setEmailsToday] = useState(emailsSentToday);
  const [emailView, setEmailView] = useState<"preview" | "edit">("preview");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q && ![c.name, c.email, c.phone, c.company, c.linkedin_url, c.facebook_url].some((v) => v.toLowerCase().includes(q))) return false;
      switch (filter) {
        case "not-invited":
          return c.channels.length === 0 && !c.do_not_contact;
        case "has-email":
          return !!c.email;
        case "has-mobile":
          return !!whatsappNumber(c.phone);
        case "has-linkedin":
          return !!c.linkedin_url;
        case "has-facebook":
          return !!c.facebook_url;
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
  const selectedReachable = selectedContacts.filter((c) => !c.do_not_contact);

  function noteText(contact: SenderContact): string | null {
    const note = notes[contact.id];
    if (!note) return null;
    if (note.choice === "custom") return null;
    return PERSONAL_NOTE_PRESETS.find((p) => p.id === note.choice)?.text ?? null;
  }

  function messageFor(contact: SenderContact, kind: MessageKind): string {
    const draft = drafts[contact.id]?.[kind];
    // {link} stays as a placeholder — the server swaps in this person's tracked link.
    const text =
      draft ??
      personalise(kind === "email" ? emailTemplate : kind === "social" ? socialTemplate : waTemplate, contact, "{link}", "{shareLink}", "{androidLink}")
        .replaceAll("{fromEmail}", emailFromAddress)
        .replaceAll("{freeOffer}", freeOffer);
    const note = noteText(contact);
    return note == null ? text : applyPersonalNote(text, note);
  }

  function chooseNote(contact: SenderContact, choice: string, text = notes[contact.id]?.text ?? "") {
    const d = drafts[contact.id];
    // A hand-edited message no longer has the marker for the note to fill,
    // so picking a different note starts again from the template.
    const edited = [d?.email, d?.social, d?.whatsapp].some((t) => t != null && !PERSONAL_NOTE_MARKER.test(t));
    if (edited && notes[contact.id]?.choice !== choice) {
      if (!confirm("Use this note instead of your edited message? Your edits to the message will be lost.")) return;
      setDrafts((all) => ({ ...all, [contact.id]: { ...all[contact.id], email: undefined, social: undefined, whatsapp: undefined } }));
    }
    setNotes((n) => ({ ...n, [contact.id]: { choice, text } }));
    if (choice === "custom") {
      setEmailView("edit");
      setSelectMarker((t) => t + 1);
    }
  }

  function notePicker(contact: SenderContact) {
    const note = notes[contact.id];
    return (
      <div className="invite-profile">
        <span>How you know them</span>
        <select value={note?.choice ?? ""} onChange={(e) => chooseNote(contact, e.target.value)}>
          <option value="" disabled>
            Choose…
          </option>
          {PERSONAL_NOTE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="custom">Type my own…</option>
        </select>
        {note?.choice === "custom" && (
          <small>
            Type over the selected [personalise here…] in the message.{" "}
            <button className="invite-link-btn" onClick={() => { setEmailView("edit"); setSelectMarker((t) => t + 1); }}>
              Show me
            </button>
          </small>
        )}
      </div>
    );
  }

  /// The message still has the "[personalise here…]" line in it.
  function needsPersonalNote(contact: SenderContact, kind: MessageKind = "email"): boolean {
    return PERSONAL_NOTE_MARKER.test(messageFor(contact, kind));
  }

  function subjectFor(contact: SenderContact): string {
    return drafts[contact.id]?.subject ?? personalise(subject.replaceAll("{offerSubject}", offerSubject), contact, "{link}", "{shareLink}");
  }

  // Shown in an iframe sandboxed with allow-same-origin (still no scripts)
  // so the card picture loads with the admin login.
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
      // ?v= changes after "Edit details" is saved, so the picture redraws.
      cardImageUrl: `/api/admin/invites/card-preview/${contact.id}?v=${cardVersion}`,
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
        message: messageFor(contact, kindFor(channel)),
        allowRepeat,
      }),
    });
    // A timeout or crash can come back as an HTML page rather than JSON.
    const json = await res.json().catch(() => ({}));
    if (!res.ok && !json.error) json.error = `the server didn't answer properly (HTTP ${res.status}). Check Track invites before sending again`;
    return { ok: res.ok, ...json } as {
      ok: boolean;
      error?: string;
      skipped?: boolean;
      waUrl?: string;
      openUrl?: string;
      link?: string;
      text?: string;
    };
  }

  async function importFile(file: File) {
    setBusy(true);
    setStatus({ text: `Reading ${file.name}…` });
    try {
      const text = await file.text();
      const parsed = /\.csv$/i.test(file.name) ? parseLinkedinConnections(text) : parseVcards(text);
      if (parsed.length === 0) {
        setStatus({ text: "No contacts with an email, phone number or profile link found in that file.", error: true });
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
    const ids = list.map((c) => c.id);
    setEmailQueue(ids);
    if (ids.length) {
      setFocusedId(ids[0]);
      setPreviewChannel("email");
      setEmailView("preview");
    }
    setStatus({ text: `${ids.length} email${ids.length === 1 ? "" : "s"} queued. Check each one, then press Send.` });
  }

  /// After a send: untick them, forget their edits, and (unless a queue
  /// moves on to the next person) clear the preview and refresh the list,
  /// so they drop out of "Not invited yet".
  function finishContact(id: number, keepFocus = false) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const without = <T,>(all: Record<number, T>) => {
      const next = { ...all };
      delete next[id];
      return next;
    };
    setDrafts(without);
    setNotes(without);
    setEmailInput(null);
    setPhoneInput(null);
    if (!keepFocus) setFocusedId((f) => (f === id ? null : f));
    router.refresh();
  }

  function advanceEmailQueue(fromId: number) {
    const next = emailQueue.filter((id) => id !== fromId);
    setEmailQueue(next);
    if (next.length) {
      setFocusedId(next[0]);
      setEmailView("preview");
    } else {
      setFocusedId(null);
      router.refresh();
    }
  }

  /// Saves a corrected email address to the contact. Returns false if it
  /// was rejected (the message is shown).
  async function saveEmail(contact: SenderContact, value: string): Promise<boolean> {
    const res = await fetch("/api/admin/invites/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact.id, email: value }),
    });
    if (!res.ok) {
      setStatus({ text: (await res.json().catch(() => ({}))).error ?? "Couldn't save that address", error: true });
      return false;
    }
    setEmailInput(null);
    router.refresh();
    return true;
  }

  /// Saves a corrected mobile number. Returns false if it was rejected.
  async function savePhone(contact: SenderContact, value: string): Promise<boolean> {
    const res = await fetch("/api/admin/invites/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact.id, phone: value }),
    });
    if (!res.ok) {
      setStatus({ text: (await res.json().catch(() => ({}))).error ?? "Couldn't save that number", error: true });
      return false;
    }
    setPhoneInput(null);
    router.refresh();
    return true;
  }

  const pendingPhone = (contact: SenderContact) =>
    phoneInput?.id === contact.id && phoneInput.value.trim() !== contact.phone ? phoneInput.value.trim() : null;
  const phoneFor = (contact: SenderContact) => pendingPhone(contact) ?? contact.phone;

  const pendingEmail = (contact: SenderContact) =>
    emailInput?.id === contact.id && emailInput.value.trim() !== contact.email ? emailInput.value.trim() : null;

  async function sendOneEmail(contact: SenderContact) {
    setBusy(true);
    const corrected = pendingEmail(contact);
    if (corrected != null && !(await saveEmail(contact, corrected))) {
      setBusy(false);
      return;
    }
    const result = await postSend(contact, "email");
    setBusy(false);
    if (result.ok) {
      setEmailsToday((n) => n + 1);
      setStatus({ text: `Sent to ${contact.name}${corrected ? ` at ${corrected}` : ""}.` });
      finishContact(contact.id);
      advanceEmailQueue(contact.id);
    } else if (result.skipped) {
      setStatus({ text: `${contact.name} was already emailed for "${campaign}". Skipped.` });
      advanceEmailQueue(contact.id);
    } else {
      setStatus({ text: `${contact.name}: ${result.error}`, error: true });
    }
  }

  // WhatsApp can't be sent by a server from a personal account, so each one
  // opens WhatsApp with the message filled in. The window is opened inside
  // the click itself (before the fetch) so the browser doesn't block it.
  async function openWhatsApp(contact: SenderContact) {
    const win = window.open("about:blank", "_blank");
    const corrected = pendingPhone(contact);
    if (corrected != null && !(await savePhone(contact, corrected))) {
      win?.close();
      return false;
    }
    const result = await postSend(contact, "whatsapp");
    if (result.ok && result.waUrl) {
      if (win) win.location.href = result.waUrl;
      else window.location.href = result.waUrl;
      setStatus({ text: `WhatsApp opened for ${contact.name}. Press Send in WhatsApp.` });
      finishContact(contact.id);
      return true;
    }
    win?.close();
    setStatus({
      text: result.skipped ? `${contact.name} already has a WhatsApp invite for "${campaign}". Tick "Allow repeat sends" to send again.` : `${contact.name}: ${result.error}`,
      error: true,
    });
    return result.skipped ?? false;
  }

  function startSocialQueue(channel: SocialChannel, list: SenderContact[]) {
    const ids = list.map((c) => c.id);
    setSocialQueue(ids.length ? { channel, ids } : null);
    if (ids.length) {
      setFocusedId(ids[0]);
      setPreviewChannel(channel);
    }
    setStatus({ text: `${ids.length} queued for ${SOCIAL_LABEL[channel]}. Personalise each one, then Copy & open.` });
  }

  function advanceSocialQueue(fromId: number) {
    if (!socialQueue) return;
    const ids = socialQueue.ids.filter((id) => id !== fromId);
    setSocialQueue(ids.length ? { ...socialQueue, ids } : null);
    if (ids.length) setFocusedId(ids[0]);
    else router.refresh();
  }

  // LinkedIn / Messenger: no way to send from a personal account, so the
  // message (with its new tracked link) is copied and their profile or
  // chat opened. Window and clipboard are both started inside the click.
  function openSocial(contact: SenderContact, channel: SocialChannel) {
    const win = window.open("about:blank", "_blank");
    const result = postSend(contact, channel);
    const copied = copyWhenReady(result.then((r) => (r.ok && r.text ? r.text : null)));
    setUncopied(null);
    setBusy(true);
    (async () => {
      const r = await result;
      setBusy(false);
      if (!r.ok || !r.openUrl) {
        win?.close();
        setStatus({
          text: r.skipped
            ? `${contact.name} already has a ${SOCIAL_LABEL[channel]} invite for "${campaign}". Tick "Allow repeat sends" to send again.`
            : `${contact.name}: ${r.error}`,
          error: true,
        });
        if (r.skipped) advanceSocialQueue(contact.id);
        return;
      }
      if (win) win.location.href = r.openUrl;
      if (!win) window.open(r.openUrl, "_blank");
      if (await copied) {
        setStatus({ text: `Message for ${contact.name} copied. Paste it into ${SOCIAL_LABEL[channel]} and press Send.` });
        finishContact(contact.id);
        advanceSocialQueue(contact.id);
      } else {
        // Keep them on screen so the message can be copied from the box;
        // Skip in the queue bar moves on.
        setUncopied(r.text ?? "");
        setStatus({ text: "Couldn't copy automatically: copy the message from the box below.", error: true });
      }
    })();
  }

  async function saveProfile(contact: SenderContact, channel: SocialChannel, value: string) {
    const res = await fetch("/api/admin/invites/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact.id, [channel === "linkedin" ? "linkedinUrl" : "facebookUrl"]: value }),
    });
    if (!res.ok) {
      setStatus({ text: (await res.json().catch(() => ({}))).error ?? "Couldn't save that link", error: true });
      return;
    }
    setProfileInput(null);
    setStatus({ text: `Saved ${contact.name}'s ${channel === "linkedin" ? "LinkedIn" : "Facebook"} link.` });
    router.refresh();
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

  // WhatsApp one by one: like email, each person is shown on the right to
  // personalise, then "Open in WhatsApp" moves on to the next.
  function startWaQueue(list: SenderContact[]) {
    const ids = list.map((c) => c.id);
    setWaQueue(ids);
    if (ids.length) {
      setFocusedId(ids[0]);
      setPreviewChannel("whatsapp");
    }
    setStatus({ text: `${ids.length} queued for WhatsApp. Personalise each one, then Open in WhatsApp.` });
  }

  function advanceWaQueue(fromId: number) {
    const next = waQueue.filter((id) => id !== fromId);
    setWaQueue(next);
    if (next.length) setFocusedId(next[0]);
  }
  const emailHead = emailQueue.length ? byId.get(emailQueue[0]) : undefined;
  const socialHead = socialQueue ? byId.get(socialQueue.ids[0]) : undefined;

  return (
    <div className="invite-sender">
      <section className="social-compose invite-setup">
        <div className="invite-setup-row">
          <label className="invite-field">
            <span>Import contacts (iCloud .vcf or LinkedIn .csv)</span>
            <input
              type="file"
              accept=".vcf,text/vcard,text/x-vcard,.csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importFile(file);
                e.target.value = "";
              }}
            />
            <small>
              iCloud.com → Contacts → select all (⌘A) → ⚙︎ → Export vCard. LinkedIn → Settings → Data
              privacy → Get a copy of your data → Connections, then import Connections.csv (matched to your
              contacts by name). Re-import any time; existing people are updated, not duplicated.
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
          <label className="invite-field">
            <span>LinkedIn / Messenger message</span>
            <textarea rows={12} value={socialTemplate} onChange={(e) => setSocialTemplate(e.target.value)} />
          </label>
        </div>
      </section>

      {status && <p className={status.error ? "social-compose-error" : "social-compose-success"}>{status.text}</p>}

      <p className="invite-quota">
        Emails today: <strong>{emailsToday}</strong>, from {emailFrom} (UK day)
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

      {socialQueue && socialHead && (
        <div className="invite-queue invite-queue-email">
          <span>
            {SOCIAL_LABEL[socialQueue.channel]} {socialQueue.ids.length} to go. Now: <strong>{socialHead.name}</strong>, shown on the right.
          </span>
          <button className="invite-link-btn" onClick={() => advanceSocialQueue(socialHead.id)}>
            Skip
          </button>
          <button className="invite-link-btn" onClick={() => { setSocialQueue(null); router.refresh(); }}>
            Stop
          </button>
        </div>
      )}

      {queueHead && (
        <div className="invite-queue">
          <span>
            WhatsApp {waQueue.length} to go. Now: <strong>{queueHead.name}</strong>, shown on the right.
          </span>
          <button className="invite-link-btn" onClick={() => advanceWaQueue(queueHead.id)}>
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
              <option value="has-linkedin">Has LinkedIn</option>
              <option value="has-facebook">Has Facebook</option>
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
                onClick={() => startEmailQueue(selectedWithEmail)}
              >
                Review &amp; email {selectedWithEmail.length} one by one
              </button>
              <button
                className="social-post-btn invite-wa-btn"
                disabled={busy || selectedWithMobile.length === 0}
                onClick={() => startWaQueue(selectedWithMobile)}
              >
                WhatsApp {selectedWithMobile.length} one by one
              </button>
              {(["linkedin", "messenger"] as const).map((ch) => (
                <button
                  key={ch}
                  className="social-post-btn invite-social-btn"
                  disabled={busy || selectedReachable.length === 0}
                  onClick={() => startSocialQueue(ch, selectedReachable)}
                >
                  {SOCIAL_LABEL[ch]} {selectedReachable.length} one by one
                </button>
              ))}
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
                    {c.website && <span className="invite-badge">site</span>}
                    {c.do_not_contact && <span className="invite-badge invite-badge-dnc">Do not contact</span>}
                    {c.channels.map((ch) => (
                      <span key={ch} className="invite-badge">{ch === "link" ? "copied" : ch}</span>
                    ))}
                    {c.bounced && !c.channels.includes("email") && <span className="invite-badge invite-badge-dnc">bounced</span>}
                    {c.clicked && <span className="invite-badge invite-badge-clicked">clicked</span>}
                  </span>
                  {focusedId === c.id && (
                    <ContactDetailsForm
                      key={c.id}
                      contact={c}
                      onSaved={(name) => {
                        setEmailInput(null);
                        setPhoneInput(null);
                        setCardVersion((v) => v + 1);
                        setStatus({ text: `Saved ${name}'s details.` });
                        router.refresh();
                      }}
                      onError={(text) => setStatus({ text, error: true })}
                    />
                  )}
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
                {(["email", "whatsapp", "linkedin", "messenger"] as const).map((ch) => (
                  <button key={ch} className={`social-tab ${previewChannel === ch ? "social-tab-active" : ""}`} onClick={() => setPreviewChannel(ch)}>
                    {ch === "email" ? "Email" : ch === "whatsapp" ? "WhatsApp" : SOCIAL_LABEL[ch]}
                  </button>
                ))}
              </div>
              {previewChannel === "email" ? (
                <div className="invite-mail">
                  <div className="invite-mail-head">
                    <div><span>From</span>{emailFrom}</div>
                    <div className="invite-mail-subject">
                      <span>To</span>
                      <input
                        type="email"
                        placeholder="No email address: type one"
                        value={emailInput?.id === focused.id ? emailInput.value : focused.email}
                        onChange={(e) => setEmailInput({ id: focused.id, value: e.target.value })}
                      />
                      {pendingEmail(focused) != null && (
                        <button
                          className="invite-link-btn"
                          onClick={async () => {
                            if (await saveEmail(focused, pendingEmail(focused)!)) setStatus({ text: `Saved ${focused.name}'s email address.` });
                          }}
                        >
                          Save
                        </button>
                      )}
                    </div>
                    <div className="invite-mail-subject">
                      <span>Subject</span>
                      <input
                        value={subjectFor(focused)}
                        onChange={(e) => setDrafts((d) => ({ ...d, [focused.id]: { ...d[focused.id], subject: e.target.value } }))}
                      />
                    </div>
                  </div>
                  {notePicker(focused)}
                  <div className="social-tabs invite-mail-tabs">
                    <button className={`social-tab ${emailView === "preview" ? "social-tab-active" : ""}`} onClick={() => setEmailView("preview")}>
                      Preview
                    </button>
                    <button className={`social-tab ${emailView === "edit" ? "social-tab-active" : ""}`} onClick={() => setEmailView("edit")}>
                      Edit message
                    </button>
                  </div>
                  {emailView === "preview" ? (
                    <iframe className="invite-mail-body" title="Email preview" sandbox="allow-same-origin" srcDoc={previewHtml(focused)} />
                  ) : (
                    <textarea
                      ref={messageRef}
                      rows={14}
                      value={messageFor(focused, "email")}
                      onChange={(e) => setDrafts((d) => ({ ...d, [focused.id]: { ...d[focused.id], email: e.target.value } }))}
                    />
                  )}
                </div>
              ) : previewChannel === "whatsapp" ? (
                <>
                  <div className="invite-profile">
                    <span>Mobile</span>
                    <input
                      type="tel"
                      placeholder="e.g. 07700 900123 or +44 7700 900123"
                      value={phoneInput?.id === focused.id ? phoneInput.value : focused.phone}
                      onChange={(e) => setPhoneInput({ id: focused.id, value: e.target.value })}
                    />
                    {pendingPhone(focused) != null && (
                      <button
                        className="invite-link-btn"
                        onClick={async () => {
                          if (await savePhone(focused, pendingPhone(focused)!)) setStatus({ text: `Saved ${focused.name}'s mobile number.` });
                        }}
                      >
                        Save
                      </button>
                    )}
                    <small>
                      {whatsappNumber(phoneFor(focused))
                        ? `WhatsApp: +${whatsappNumber(phoneFor(focused))} (numbers without a country code are taken as UK)`
                        : "Not a usable mobile number yet."}
                    </small>
                  </div>
                  {notePicker(focused)}
                  <textarea
                    ref={messageRef}
                    rows={14}
                    value={messageFor(focused, "whatsapp")}
                    onChange={(e) => setDrafts((d) => ({ ...d, [focused.id]: { ...d[focused.id], whatsapp: e.target.value } }))}
                  />
                  <small>WhatsApp shows a preview of their link with a picture of their own TapCard.</small>
                </>
              ) : (
                <>
                  {(() => {
                    const ch = previewChannel;
                    const saved = ch === "linkedin" ? focused.linkedin_url : focused.facebook_url;
                    const editing = profileInput?.id === focused.id ? profileInput.value : null;
                    return (
                      <div className="invite-profile">
                        <span>{ch === "linkedin" ? "LinkedIn profile" : "Facebook profile"}</span>
                        <input
                          placeholder={ch === "linkedin" ? "https://www.linkedin.com/in/…" : "https://www.facebook.com/…"}
                          value={editing ?? saved}
                          onChange={(e) => setProfileInput({ id: focused.id, value: e.target.value })}
                        />
                        {editing != null && editing !== saved && (
                          <button className="invite-link-btn" onClick={() => saveProfile(focused, ch, editing)}>
                            Save
                          </button>
                        )}
                        {!saved && <small>Not known, so Copy &amp; open searches {ch === "linkedin" ? "LinkedIn" : "Facebook"} for their name.</small>}
                      </div>
                    );
                  })()}
                  {notePicker(focused)}
                  <textarea
                    ref={messageRef}
                    rows={14}
                    value={messageFor(focused, "social")}
                    onChange={(e) => setDrafts((d) => ({ ...d, [focused.id]: { ...d[focused.id], social: e.target.value } }))}
                  />
                </>
              )}
              {needsPersonalNote(focused, kindFor(previewChannel)) && (
                <p className="social-compose-error">
                  Choose <strong>How you know them</strong> for {focused.first_name || focused.name} (or edit the
                  [personalise here…] bit yourself).{previewChannel === "email" ? " Send" : previewChannel === "whatsapp" ? " Open in WhatsApp" : " Copy & open"} unlocks once it&apos;s filled in.
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
                    disabled={busy || !(pendingEmail(focused) ?? focused.email) || focused.do_not_contact || needsPersonalNote(focused)}
                    onClick={() => sendOneEmail(focused)}
                  >
                    {!(pendingEmail(focused) ?? focused.email)
                      ? "No email address"
                      : needsPersonalNote(focused)
                          ? "Personalise first"
                          : busy
                            ? "Sending…"
                            : pendingEmail(focused)
                              ? "Save address & send"
                              : "Send this email"}
                  </button>
                ) : previewChannel === "linkedin" || previewChannel === "messenger" ? (
                  <button
                    className="social-post-btn invite-social-btn"
                    disabled={busy || focused.do_not_contact || needsPersonalNote(focused, "social")}
                    onClick={() => openSocial(focused, previewChannel as SocialChannel)}
                  >
                    {needsPersonalNote(focused, "social") ? "Personalise first" : `Copy & open ${SOCIAL_LABEL[previewChannel]}`}
                  </button>
                ) : (
                  <button
                    className="social-post-btn invite-wa-btn"
                    disabled={busy || !whatsappNumber(phoneFor(focused)) || focused.do_not_contact || needsPersonalNote(focused, "whatsapp")}
                    onClick={async () => {
                      if (await openWhatsApp(focused)) advanceWaQueue(focused.id);
                      router.refresh();
                    }}
                  >
                    {!whatsappNumber(phoneFor(focused))
                      ? "No mobile number"
                      : needsPersonalNote(focused, "whatsapp")
                        ? "Personalise first"
                        : pendingPhone(focused)
                          ? "Save number & open WhatsApp"
                          : "Open in WhatsApp"}
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
              {uncopied != null && (
                <textarea className="invite-uncopied" rows={6} readOnly value={uncopied} onFocus={(e) => e.target.select()} />
              )}
              <div className="invite-actions invite-actions-minor">
                {focused.channels.includes("email") && (
                  <button
                    className="invite-link-btn"
                    onClick={() => {
                      if (confirm(`Mark the email to ${focused.name} as bounced? They'll show as not invited, so you can fix the address and send again.`)) {
                        updateContact(focused, { action: "email-bounced" });
                        setEmailsToday((n) => Math.max(0, n - 1));
                        setStatus({ text: `${focused.name}'s email marked as bounced.` });
                      }
                    }}
                  >
                    Email bounced
                  </button>
                )}
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

/// Inline under the clicked contact: their details as their card will show
/// them. A company website gives the card its logo and "Visit my site" row;
/// social links add the "Follow me" icons. Saved values beat a re-import.
function ContactDetailsForm({
  contact,
  onSaved,
  onError,
}: {
  contact: SenderContact;
  onSaved: (name: string) => void;
  onError: (message: string) => void;
}) {
  const fromContact = {
    name: contact.name,
    firstName: contact.first_name,
    title: contact.title ?? "",
    company: contact.company,
    website: contact.website ?? "",
    email: contact.email,
    phone: contact.phone,
    linkedinUrl: contact.linkedin_url,
    facebookUrl: contact.facebook_url,
    xUrl: contact.x_url ?? "",
    instagramUrl: contact.instagram_url ?? "",
  };
  // What's saved: the contact as loaded, then whatever the server confirms
  // (so the form never jumps back to old values while the list refreshes).
  const [saved, setSaved] = useState(fromContact);
  const [d, setD] = useState(fromContact);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const changed = JSON.stringify(d) !== JSON.stringify(saved);
  const [photoUrl, setPhotoUrl] = useState(contact.photo_url);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  async function uploadPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      setNote({ text: "That's not an image file", error: true });
      return;
    }
    setUploadingPhoto(true);
    setNote(null);
    const form = new FormData();
    form.set("id", String(contact.id));
    form.set("photo", file);
    const res = await fetch("/api/admin/invites/contact/photo", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setUploadingPhoto(false);
    if (res.ok && json.url) {
      setPhotoUrl(json.url);
      setNote({ text: "Photo saved ✓ — their card picture now uses it." });
      onSaved(contact.name); // bumps the preview's cache-busting ?v= so the new photo shows
    } else {
      const text = json.error ?? `Couldn't upload photo (HTTP ${res.status})`;
      setNote({ text, error: true });
      onError(text);
    }
  }

  async function removePhoto() {
    setUploadingPhoto(true);
    const res = await fetch(`/api/admin/invites/contact/photo?id=${contact.id}`, { method: "DELETE" });
    setUploadingPhoto(false);
    if (res.ok) {
      setPhotoUrl("");
      setNote({ text: "Photo removed — back to the logo/initials." });
      onSaved(contact.name);
    }
  }
  const field = (key: keyof typeof d, label: string, placeholder = "", type = "text") => (
    <label className="invite-details-field">
      <span>{label}</span>
      <input type={type} value={d[key]} placeholder={placeholder} onChange={(e) => setD({ ...d, [key]: e.target.value })} />
    </label>
  );

  async function save() {
    setSaving(true);
    setNote(null);
    const res = await fetch("/api/admin/invites/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact.id, action: "details", details: d }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok && json.details) {
      // The server tidies some values (website → https://domain, @handle → link).
      const clean = { ...d, ...json.details };
      setSaved(clean);
      setD(clean);
      setNote({ text: "Saved ✓ — their card picture now uses these details." });
      onSaved(clean.name);
    } else {
      const text = json.error ?? `Couldn't save (HTTP ${res.status})`;
      setNote({ text, error: true });
      onError(text);
    }
  }

  return (
    <div className="invite-details">
      <div
        className={`invite-photo-drop${dragOver ? " invite-photo-drop-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) setCropFile(file);
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="invite-photo-thumb" />
        ) : (
          <div className="invite-photo-placeholder">{(d.firstName || d.name || "?").slice(0, 1).toUpperCase()}</div>
        )}
        <div className="invite-photo-hint">
          <span>{uploadingPhoto ? "Uploading…" : "Drag a photo here (e.g. from LinkedIn) to use as their card picture"}</span>
          <label className="invite-photo-browse">
            Choose file…
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCropFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {photoUrl && (
            <button type="button" className="invite-link-btn" onClick={removePhoto} disabled={uploadingPhoto}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      {field("firstName", "First name")}
      {field("name", "Full name")}
      {field("title", "Job title", "e.g. Head of Sales")}
      {field("company", "Company")}
      {field("website", "Website", "e.g. acme.co.uk — gives their card the company logo")}
      {field("email", "Email", "", "email")}
      {field("phone", "Mobile", "", "tel")}
      {field("linkedinUrl", "LinkedIn", "linkedin.com/in/…")}
      {field("xUrl", "X", "@handle")}
      {field("instagramUrl", "Instagram", "@handle")}
      {field("facebookUrl", "Facebook", "facebook.com/…")}
      <div className="invite-details-actions">
        <button className="social-post-btn" disabled={!changed || saving} onClick={save}>
          {saving ? "Saving…" : "Save details"}
        </button>
        {changed && (
          <button className="invite-link-btn" onClick={() => setD(saved)}>
            Undo changes
          </button>
        )}
        {note && <span className={note.error ? "invite-details-error" : "invite-details-ok"}>{note.text}</span>}
        {changed && !saving && <span className="invite-details-unsaved">Not saved yet</span>}
      </div>
      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={(blob) => {
            setCropFile(null);
            uploadPhoto(new File([blob], "photo.jpg", { type: "image/jpeg" }));
          }}
        />
      )}
    </div>
  );
}

const CROP_SIZE = 320;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/// Reposition/zoom a dropped photo into a circle before it's uploaded —
/// same idea as macOS's own contact-photo picker. Pans and zooms an <img>
/// with CSS transforms, then replays the identical transform on a canvas
/// (object-fit: cover base placement + translate(pan) scale(zoom), same
/// transform-origin: center) to produce the uploaded file.
function PhotoCropModal({ file, onCancel, onConfirm }: { file: File; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /// How far the image can be panned at the current zoom before a gap
  /// would show at the edge of the circle (half the overflow each side).
  const maxPan = (CROP_SIZE * (zoom - 1)) / 2;
  const clampPan = (p: { x: number; y: number }, limit: number) => ({
    x: Math.max(-limit, Math.min(limit, p.x)),
    y: Math.max(-limit, Math.min(limit, p.y)),
  });

  function setZoomClamped(z: number) {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    setZoom(next);
    setPan((p) => clampPan(p, (CROP_SIZE * (next - 1)) / 2));
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const { startX, startY, panX, panY } = dragRef.current;
    setPan(clampPan({ x: panX + (e.clientX - startX), y: panY + (e.clientY - startY) }, maxPan));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  async function confirm() {
    if (!src || !natural) return;
    setSaving(true);
    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.src = src;
    await img.decode();
    // Base placement: object-fit: cover into the CROP_SIZE box.
    const coverScale = Math.max(CROP_SIZE / natural.w, CROP_SIZE / natural.h);
    const drawW = natural.w * coverScale;
    const drawH = natural.h * coverScale;
    const drawX = (CROP_SIZE - drawW) / 2;
    const drawY = (CROP_SIZE - drawH) / 2;
    const center = CROP_SIZE / 2;
    ctx.save();
    // Matches the CSS: translate(pan) scale(zoom), transform-origin center.
    ctx.translate(pan.x, pan.y);
    ctx.translate(center, center);
    ctx.scale(zoom, zoom);
    ctx.translate(-center, -center);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="invite-crop-overlay" onClick={onCancel}>
      <div className="invite-crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invite-crop-title">Reposition photo</div>
        <div
          className="invite-crop-frame"
          style={{ width: CROP_SIZE, height: CROP_SIZE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                pointerEvents: "none",
              }}
            />
          )}
          <div className="invite-crop-mask" />
        </div>
        <div className="invite-crop-zoom">
          <button type="button" className="invite-link-btn" onClick={() => setZoomClamped(zoom - 0.2)} disabled={zoom <= MIN_ZOOM}>
            −
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
          />
          <button type="button" className="invite-link-btn" onClick={() => setZoomClamped(zoom + 0.2)} disabled={zoom >= MAX_ZOOM}>
            +
          </button>
        </div>
        <div className="invite-crop-actions">
          <button type="button" className="invite-link-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="social-post-btn" onClick={confirm} disabled={!natural || saving}>
            {saving ? "Saving…" : "Use this photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
