// Message templates and personalisation for TapCard invites. No server
// imports, so the admin page can show each contact's message exactly as it
// will be sent (lib/tapcardInvites.ts re-exports these for server code).

export type InviteChannel = "email" | "whatsapp" | "linkedin" | "messenger" | "link";
export const INVITE_CHANNELS: InviteChannel[] = ["email", "whatsapp", "linkedin", "messenger", "link"];

/// LinkedIn and Facebook don't let apps send messages from a personal
/// account, so these work like WhatsApp: the message (with its tracked
/// link) is copied and their profile or chat opens, ready to paste.
export type SocialChannel = "linkedin" | "messenger";
export const SOCIAL_CHANNELS: SocialChannel[] = ["linkedin", "messenger"];

export const DEFAULT_CAMPAIGN = "tapcard-launch";

/// {offerSubject} is filled in live: "Free founder place: TapCard for iPhone
/// (673 left)", or the price once the free places have gone.
export const DEFAULT_EMAIL_SUBJECT = "{offerSubject}";

/// Public "how it works" page linked from the email (same for everyone).
export const HOW_IT_WORKS_URL = "https://tapcard.aiert.co.uk/how-it-works";

/// Left in the email template for Martin to replace with a line about how
/// he knows each person. Send is blocked while it's still there.
export const PERSONAL_NOTE_MARKER = /\[personali[sz]e here[^\]]*\]/i;

/// Ready-made lines for the personal note (the Send tab's "How you know
/// them" menu). "" means leave the note out altogether.
export const PERSONAL_NOTE_PRESETS: { id: string; label: string; text: string }[] = [
  { id: "none", label: "Don't add anything", text: "" },
  { id: "westhouse", label: "Head of Trading at Westhouse", text: "we were in contact when I was Head of Trading at Westhouse" },
  { id: "natwest", label: "Head of Trading at NatWest", text: "we were in contact when I was Head of Trading at NatWest" },
];

/// Puts a personal note in place of "[personalise here…]". An empty note
/// removes the marker together with the " — " before it.
export function applyPersonalNote(message: string, note: string): string {
  if (!note.trim()) return message.replace(/\s*—\s*\[personali[sz]e here[^\]]*\]|\s*\[personali[sz]e here[^\]]*\]/i, "");
  return message.replace(PERSONAL_NOTE_MARKER, note.trim());
}

// Email formatting: a blank line starts a new paragraph, lines starting
// "- " are bullets, **bold**, and [label](url) links. The {link} and
// {androidLink} links are drawn as buttons, and a paragraph that is just
// {cardImage} becomes the example card picture (see lib/inviteEmail.ts).
export const DEFAULT_EMAIL_TEMPLATE = `Hi {firstName},

This is Martin Dobson — [personalise here: e.g. we worked together at BT]. I'm getting in touch from my business email ({fromEmail}) because I've started my own company, AIERT, making apps that take the hassle out of everyday work, and you're one of the first people I wanted to share the newest one with.

Have you ever been in a situation where someone asked for your business card, and you didn't have one with you or had run out?

I've built an app called TapCard to solve exactly that. It keeps your business card on your phone in the TapCard app, and also in your Apple Wallet for easy access. Share it instantly with a QR code or a link, and when you swap details, their info saves straight into your contacts — no typing, no running out of cards.

Here's what your TapCard could look like:

{cardImage}

What makes it even better:
- **Tap to call** — once someone has your TapCard, they can tap your number to call you direct.
- **All your links in one place** — your website and social media profiles are right there on the card, so people can tap straight through to your site, LinkedIn, X, Instagram, or wherever you want them to find you.
- **No app needed for them** — they just tap your link or scan your QR code, and your details save to their phone.

See exactly how it works: [How TapCard works]({howItWorksLink})

{freeOffer}

If you have an iPhone, you can use it today: [Get TapCard free]({link})

On Android? We're not on the Google Play Store just yet. Tap the link below and I'll let you know the moment it's ready for you: [Tell me when TapCard is on Android]({androidLink})

Always be prepared.

Best wishes,
Martin

P.S. Drowning in old email? My other apps can help: [MailBroom](https://tapcard.aiert.co.uk/go/tapcard-web-invite-mailbroom) clears out years of clutter in bulk, and [PowerSearch](https://tapcard.aiert.co.uk/go/tapcard-web-invite-powersearch) finds that one email you need across all your accounts at once.`;

// LinkedIn / Messenger: plain text (no formatting in either), shorter, and
// no "writing from my work email" line — it's coming from Martin's own
// profile, to people he's already connected to.
export const DEFAULT_SOCIAL_TEMPLATE = `Hi {firstName}, Martin Dobson here — [personalise here: e.g. great to see the new role].

Have you ever been asked for your business card and not had one with you, or run out?

I've built a free app called TapCard to solve exactly that. Your business card lives on your phone, ready to share instantly with a QR code or a link. When you swap details, their info saves straight into your contacts — no typing, no running out of cards.

• Tap to call — once someone has your TapCard, they can tap your number to call you direct
• All your links in one place — your website, LinkedIn, X, Instagram, right there on the card
• No app needed for them — they just tap your link or scan your QR code

How it works: {howItWorksLink}

{freeOffer}

iPhone: {link}

On Android? It's not on Google Play just yet. Tap here and I'll tell you the moment it is: {androidLink}

Always be prepared.
Martin`;

// WhatsApp: the same message as the email, in WhatsApp's own formatting
// (*bold*). WhatsApp previews the first link, so {link} comes first: its
// preview shows a picture of their own card (see app/tapcard/get/[token]).
export const DEFAULT_WHATSAPP_TEMPLATE = `Hi {firstName}, it's Martin Dobson — [personalise here: e.g. we worked together at BT].

Have you ever been asked for your business card and not had one with you, or run out? 📇

I've built an app called *TapCard* to solve exactly that. It keeps your business card on your phone, and in your Apple Wallet, ready to share with a QR code or a link. When you swap details, their info saves straight into your contacts — no typing, no running out of cards.

• *Tap to call* — once someone has your TapCard, they can tap your number to call you direct
• *All your links in one place* — your website, LinkedIn, X, Instagram, right there on the card
• *No app needed for them* — they just tap your link or scan your QR code

{freeOffer}

📱 *iPhone — get it free:* {link}

👀 See how it works: {howItWorksLink}

🤖 On Android? Tap here and I'll tell you the moment it's ready: {androidLink}

Always be prepared!
Martin`;

/// The name to greet them by: just the first word, since contact cards often
/// keep middle names or initials in the first-name field ("Martin CJ").
export function firstNameOf(contact: { name?: string | null; first_name?: string | null }): string {
  return (contact.first_name || contact.name || "").trim().split(/\s+/)[0] || "";
}

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
    .replaceAll("{firstName}", firstNameOf(contact) || "there")
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

/// https://www.linkedin.com/in/<slug>, or "" if it isn't a LinkedIn profile.
export function normaliseLinkedinUrl(raw: string): string {
  const m = raw.trim().match(/linkedin\.com\/(in|pub)\/([^/?#\s]+)/i);
  return m ? `https://www.linkedin.com/in/${decodeURIComponent(m[2]).toLowerCase()}` : "";
}

/// https://www.facebook.com/<username or profile.php?id=…>, or "".
export function normaliseFacebookUrl(raw: string): string {
  const v = raw.trim();
  const id = v.match(/facebook\.com\/profile\.php\?(?:[^#\s]*&)?id=(\d+)/i);
  if (id) return `https://www.facebook.com/profile.php?id=${id[1]}`;
  const m = v.match(/(?:facebook|fb)\.com\/([A-Za-z0-9.]+)\/?(?:[?#]|$)/i);
  return m && !/^(profile\.php|people|pages|groups|search)$/i.test(m[1]) ? `https://www.facebook.com/${m[1]}` : "";
}

/// Where "Copy & open" goes: their LinkedIn profile or Messenger chat when
/// we know it, otherwise a people search for their name.
export function socialOpenUrl(
  channel: SocialChannel,
  contact: { name: string; company: string; linkedin_url: string; facebook_url: string },
): string {
  if (channel === "linkedin") {
    if (contact.linkedin_url) return contact.linkedin_url;
    const q = [contact.name, contact.company].filter(Boolean).join(" ");
    return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`;
  }
  const username = contact.facebook_url.match(/facebook\.com\/([A-Za-z0-9.]+)$/)?.[1];
  if (username) return `https://m.me/${username}`;
  if (contact.facebook_url) return contact.facebook_url;
  return `https://www.facebook.com/search/people/?q=${encodeURIComponent(contact.name)}`;
}
