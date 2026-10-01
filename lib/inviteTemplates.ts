// Message templates and personalisation for TapCard invites. No server
// imports, so the admin page can show each contact's message exactly as it
// will be sent (lib/tapcardInvites.ts re-exports these for server code).

export type InviteChannel = "email" | "whatsapp" | "link";
export const INVITE_CHANNELS: InviteChannel[] = ["email", "whatsapp", "link"];

export const DEFAULT_CAMPAIGN = "tapcard-launch";

export const DEFAULT_EMAIL_SUBJECT = "A free gift for you, {firstName}: TapCard";

export const DEFAULT_EMAIL_TEMPLATE = `Hi {firstName},

I've got a free gift for you: TapCard, the business card swapper.

Your business card lives on your phone, ready to share with a QR code or a link. When you swap with someone, their card saves straight into your contacts, so there's no more running out of cards or typing in details.

Always be prepared.

Get it free here: {link}

Know someone who'd like it too? Pass it on: {shareLink}

Best wishes,
Martin`;

export const DEFAULT_WHATSAPP_TEMPLATE = `Hi {firstName}, a free gift for you: TapCard, the business card swapper 📇

Your business card is always on your phone, and you can swap cards with anyone in one tap. Always be prepared!

Free download: {link}

Know someone who'd like it? Pass it on: {shareLink}`;

export function personalise(
  template: string,
  contact: { name: string; first_name: string; company: string },
  link: string,
  shareLink = "",
): string {
  return template
    .replaceAll("{firstName}", contact.first_name || contact.name.split(/\s+/)[0] || "there")
    .replaceAll("{name}", contact.name || "there")
    .replaceAll("{company}", contact.company || "")
    .replaceAll("{shareLink}", shareLink)
    .replaceAll("{link}", link);
}

/// WhatsApp needs the number in international format, digits only. Numbers
/// stored without a country code are assumed to be UK ones.
export function whatsappNumber(phone: string): string | null {
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  return digits.length >= 10 ? digits : null;
}
