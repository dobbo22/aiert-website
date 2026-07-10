"use client";

import { useState } from "react";
import SendInviteButton from "./SendInviteButton";
import EmailEditor from "./EmailEditor";
import PhoneEditor from "./PhoneEditor";
import WhatsAppToggle from "./WhatsAppToggle";
import { guestFirstNames } from "@/lib/names";

function RemindBothButton({
  code,
  email,
  phones,
  names,
  name,
  siteUrl,
}: {
  code: string;
  email: string;
  phones: string[];
  names: string[];
  name: string;
  siteUrl: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleClick() {
    setState("sending");
    phones.forEach((p, idx) => {
      window.open(buildWhatsAppShareUrl(names[idx] ?? names[0] ?? name, code, p, siteUrl, true), "_blank");
    });
    try {
      const res = await fetch("/api/admin/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error("Failed");
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <button type="button" className="admin-whatsapp-share admin-remind-both" onClick={handleClick} disabled={state === "sending"}>
      {state === "sending"
        ? "Sending…"
        : state === "sent"
          ? "Reminder Sent (Email + WhatsApp) ✓"
          : state === "error"
            ? "Email failed — retry"
            : `Send Reminder — Both Channels (${email})`}
    </button>
  );
}

type MenuChoice = {
  name: string;
  choice: "" | "meat" | "fish" | "vegetarian";
  notes: string;
};

type Props = {
  code: string;
  name: string;
  viewCount: number;
  lastViewedAt: string | null;
  rsvpStatus: "accepted" | "declined" | null;
  guestCount: number | null;
  dietaryNotes: string | null;
  menuChoices: MenuChoice[] | null;
  message: string | null;
  initialEmail: string | null;
  initialPhone: string | null;
  inviteSentAt: string | null;
  inviteOpenedAt: string | null;
  inviteOpenCount: number;
  whatsappSent: boolean;
  siteUrl: string;
  needsFollowUp: boolean;
};

function parsePhones(phone: string | null): string[] {
  if (!phone) return [];
  return phone
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function normalizePhoneForWhatsApp(phone: string): string {
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) {
    digits = "44" + digits.slice(1); // assume UK local format
  }
  return digits;
}

function buildWhatsAppShareUrl(
  recipientName: string,
  code: string,
  phone: string,
  siteUrl: string,
  isReminder: boolean
): string {
  const inviteUrl = `${siteUrl}/invite/${code}`;
  const message = isReminder
    ? `Hi ${recipientName} — just a gentle reminder to RSVP for Martin & Karen's 25th Wedding Anniversary Dinner! Could you let us know by 25th July? ${inviteUrl}`
    : `Hi ${recipientName} — you're invited to Martin & Karen's 25th Wedding Anniversary Dinner! ${inviteUrl}`;
  const digits = normalizePhoneForWhatsApp(phone);
  return digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export default function InviteeRow({
  code,
  name,
  viewCount,
  lastViewedAt,
  rsvpStatus,
  guestCount,
  dietaryNotes,
  menuChoices,
  message,
  initialEmail,
  initialPhone,
  inviteSentAt,
  inviteOpenedAt,
  inviteOpenCount,
  whatsappSent,
  siteUrl,
  needsFollowUp,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [whatsappConfirmed, setWhatsappConfirmed] = useState(whatsappSent);

  const phones = parsePhones(phone);
  const names = guestFirstNames(name);
  const ghosted = !!inviteSentAt && !needsFollowUp;
  const isReminder = viewCount > 0 && !rsvpStatus;

  return (
    <tr>
      <td>{name}</td>
      <td className="admin-code">{code}</td>
      <td>
        <SendInviteButton
          code={code}
          hasEmail={!!email}
          alreadySent={!!inviteSentAt}
          accepted={rsvpStatus === "accepted"}
          whatsappConfirmed={whatsappConfirmed}
          isReminder={isReminder}
        />
      </td>
      <td>
        <div className={`admin-whatsapp-cell ${ghosted ? "admin-whatsapp-ghosted" : ""}`}>
          {needsFollowUp && <span className="admin-followup-badge">⚠ Needs WhatsApp follow-up</span>}
          {isReminder && !!email && phones.length > 0 && (
            <RemindBothButton code={code} email={email} phones={phones} names={names} name={name} siteUrl={siteUrl} />
          )}
          {phones.length === 0 ? (
            <a
              href={buildWhatsAppShareUrl(names[0] ?? name, code, "", siteUrl, isReminder)}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-whatsapp-share"
            >
              {isReminder ? "Send Reminder via WhatsApp" : "Share via WhatsApp"}
            </a>
          ) : (
            phones.map((p, idx) => (
              <a
                key={idx}
                href={buildWhatsAppShareUrl(names[idx] ?? names[0] ?? name, code, p, siteUrl, isReminder)}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-whatsapp-share"
              >
                {phones.length > 1
                  ? `${isReminder ? "Remind" : "WhatsApp"} ${names[idx] ?? `#${idx + 1}`}`
                  : isReminder
                    ? "Send Reminder via WhatsApp"
                    : "Share via WhatsApp"}
              </a>
            ))
          )}
          <WhatsAppToggle code={code} sent={whatsappConfirmed} onChange={setWhatsappConfirmed} />
        </div>
      </td>
      <td>{inviteSentAt ? new Date(inviteSentAt).toLocaleString("en-GB") : "—"}</td>
      <td>
        {inviteOpenedAt ? `${new Date(inviteOpenedAt).toLocaleString("en-GB")} (${inviteOpenCount}x)` : "—"}
      </td>
      <td>{viewCount}</td>
      <td>{lastViewedAt ? new Date(lastViewedAt).toLocaleString("en-GB") : "—"}</td>
      <td>
        {rsvpStatus === "accepted" && "✅ Accepted"}
        {rsvpStatus === "declined" && "❌ Declined"}
        {!rsvpStatus && "—"}
      </td>
      <td>
        <EmailEditor code={code} initialEmail={email} onSaved={(v) => setEmail(v || null)} />
      </td>
      <td>
        <PhoneEditor code={code} initialPhone={phone} onSaved={(v) => setPhone(v || null)} />
      </td>
      <td>{guestCount ?? "—"}</td>
      <td>{dietaryNotes || "—"}</td>
      <td>
        {menuChoices && menuChoices.length
          ? menuChoices.map((m, idx) => (
              <div key={idx}>
                {m.name}: {m.choice || "—"}
                {m.notes ? ` (${m.notes})` : ""}
              </div>
            ))
          : "—"}
      </td>
      <td>{message || "—"}</td>
    </tr>
  );
}
