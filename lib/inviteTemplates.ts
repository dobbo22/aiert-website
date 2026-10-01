// Message templates and personalisation for TapCard invites. No server
// imports, so the admin page can show each contact's message exactly as it
// will be sent (lib/tapcardInvites.ts re-exports these for server code).

export type InviteChannel = "email" | "whatsapp" | "link";
export const INVITE_CHANNELS: InviteChannel[] = ["email", "whatsapp", "link"];

export const DEFAULT_CAMPAIGN = "tapcard-launch";

export const DEFAULT_EMAIL_SUBJECT = "Your free gift: TapCard (for iPhone)";

/// Public "how it works" page linked from the email (same for everyone).
export const HOW_IT_WORKS_URL = "https://tapcard.aiert.co.uk/how-it-works";

/// Left in the email template for Martin to replace with a line about how
/// he knows each person. Send is blocked while it's still there.
export const PERSONAL_NOTE_MARKER = /\[personali[sz]e here[^\]]*\]/i;

// Email formatting: a blank line starts a new paragraph, lines starting
// "- " are bullets, **bold**, and [label](url) links. The {link} and
// {androidLink} links are drawn as buttons (see lib/inviteEmail.ts).
export const DEFAULT_EMAIL_TEMPLATE = `Hi {firstName},

This is Martin Dobson — [personalise here: e.g. we worked together at BT]. I'm writing from my work email (martin@mailbroom.app) in case you only have my old BT address.

Have you ever been in a situation where someone asked for your business card, and you didn't have one with you or had run out?

I've built a free app called TapCard to solve exactly that. It keeps your business card on your phone, ready to share instantly with a QR code or a link. When you swap details, their info saves straight into your contacts — no typing, no running out of cards.

What makes it even better:
- **Tap to call** — once someone has your TapCard, they can tap your number to call you direct.
- **All your links in one place** — your website and social media profiles are right there on the card, so people can tap straight through to your site, LinkedIn, X, Instagram, or wherever you want them to find you.
- **No app needed for them** — they just tap your link or scan your QR code, and your details save to their phone.

See exactly how it works: [How TapCard works]({howItWorksLink})

If you have an iPhone, you can use it today: [Get TapCard free]({link})

On Android? We're not on the Google Play Store just yet. Tap the link below and I'll let you know the moment it's ready for you: [Tell me when TapCard is on Android]({androidLink})

Always be prepared.

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
  androidLink = "",
): string {
  return template
    .replaceAll("{howItWorksLink}", HOW_IT_WORKS_URL)
    .replaceAll("{androidLink}", androidLink)
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
