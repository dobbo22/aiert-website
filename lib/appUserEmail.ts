// "Finish your TapCard" email for people who made a card in the app but have not done much with it.
// Personalised from what is actually missing on their card; shows the app's screenshots. Pure: builds subject, HTML and text only.
// Wording rule: never "free app", never an unqualified "no app needed".

export type GapKey = "photo" | "title" | "phone" | "website" | "address" | "linkedin" | "social" | "whatsapp" | "links";

// Each fix points at the guide step that shows how (the guide gives every step an id made from its title).
export const GUIDE_STEPS = {
  fill: "Fill in what your card is missing",
  links: "Bookings, shop and more for your business",
  share: "Share your card",
  back: "Get their details back",
} as const;
export const stepId = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const FIXES: Record<GapKey, { personal: boolean; title: string; why: string; how: keyof typeof GUIDE_STEPS }> = {
  website: { personal: true, title: "Add your website", why: "TapCard reads it and suggests your logo, colours and links for you.", how: "fill" },
  photo: { personal: true, title: "Add a photo or logo", why: "People remember a face or a logo, and it fills your Apple Wallet or Google Wallet card.", how: "fill" },
  links: { personal: false, title: "Add a link people want", why: "A booking page, price list or portfolio is one tap from your card.", how: "links" },
  linkedin: { personal: true, title: "Add your LinkedIn", why: "It's the first thing most people look for after meeting you.", how: "fill" },
  address: { personal: true, title: "Add your address", why: "You get a Get directions button, and people nearby can find you on the map.", how: "fill" },
  whatsapp: { personal: true, title: "Add WhatsApp", why: "Contacts can message you in one tap.", how: "fill" },
  social: { personal: true, title: "Add Instagram or Facebook", why: "If you use them for work, they're one tap from your card.", how: "fill" },
  title: { personal: true, title: "Add your job title", why: "People remember what you do, not just who you are.", how: "fill" },
  phone: { personal: true, title: "Add your phone number", why: "Call and Save Contact buttons only appear when there's a number.", how: "fill" },
};
// What matters most first. Brand colour is cosmetic, so it is never listed.
const PRIORITY: GapKey[] = ["website", "photo", "links", "linkedin", "address", "whatsapp", "social", "title", "phone"];

export type EmailInput = {
  firstName: string; // "" when unknown
  business: string;
  personal: boolean;
  missing: GapKey[];
  sentTo: number; // how many people the card has been sent to so far
  imageBase: string; // where the screenshots are hosted, no trailing slash
  guideUrl: string;
  replyTo: string;
  unsubscribeUrl?: string; // one-click opt-out page; when absent the footer only asks for a reply
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function topFixes(missing: GapKey[], personal: boolean, n = 3): GapKey[] {
  return PRIORITY.filter((k) => missing.includes(k) && (!personal || FIXES[k].personal)).slice(0, n);
}

export function buildEmail(i: EmailInput): { subject: string; html: string; text: string } {
  const fixes = topFixes(i.missing, i.personal);
  const step = (k: keyof typeof GUIDE_STEPS) => `${i.guideUrl}#${stepId(GUIDE_STEPS[k])}`;
  const hi = i.firstName ? `Hi ${i.firstName},` : "Hi,";
  // Deliberately generic: it must not read as though we looked at their card or their data.
  const words = ["no things", "Here is one small thing that would", "Here are two small things that would", "Here are three small things that would"];
  const subject = fixes.length
    ? `${i.firstName ? i.firstName + ", " : ""}${fixes.length} quick thing${fixes.length === 1 ? "" : "s"} to get more from your TapCard`
    : `${i.firstName ? i.firstName + ", " : ""}get more from your TapCard`;
  const opener = fixes.length
    ? `Thanks for downloading TapCard. ${words[fixes.length]} make it work much harder for you:`
    : "Thanks for downloading TapCard. The next step is getting your card in front of people.";
  const shareAsk = "A card only starts to pay off once it's shared. This week, send yours to three people.";

  const fixText = fixes.map((k) => `${FIXES[k].title}: ${FIXES[k].why} How: ${step(FIXES[k].how)}`);
  const blocks: { title: string; body: string; img: string; alt: string }[] = [
    { title: "A complete card", body: "Call, email, website, directions, booking, opening hours and links, all on one card. For a business, TapCard can read your website and suggest the links and colours.", img: "business-links.jpg", alt: "A finished TapCard with call, email, directions and links" },
    { title: "Share it in a tap", body: "Show your QR code, or use Share, Send (text, WhatsApp or email) or Print. Add it to Apple Wallet or Google Wallet. No signal? The offline QR still works. People can view and save your card without installing anything.", img: "qr-branded.jpg", alt: "The share screen with QR code, Share, Send, Print and Wallet" },
    { title: "Keep everyone you meet", body: "Cards you receive land in Contacts, sorted by card, company or who's nearby. Add notes, categories and reminders, and scan a paper business card to add it.", img: "contacts.jpg", alt: "The Contacts list grouped by card" },
    { title: "Fill in the gaps", body: "Add notes about where you met, and find missing details in your emails with Enhance (it uses our PowerSearch app).", img: "enhance.jpg", alt: "A contact with notes and Enhance this contact" },
  ];

  const cta = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;background:#fbbf24;color:#1a1530;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:10px;font-size:16px">${esc(label)}</a>`;
  const h2 = (t: string) => `<h2 style="font-size:20px;margin:30px 0 8px;color:#1a1530">${esc(t)}</h2>`;
  const p = (t: string) => `<p style="font-size:16px;line-height:1.55;margin:0 0 12px;color:#2b2b3a">${t}</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f3f1fa;font-family:-apple-system,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#1a1530;padding:22px 28px"><span style="color:#fff;font-size:22px;font-weight:700">TapCard</span><span style="color:#a9a4c9;font-size:14px"> &nbsp;by AIERT</span></td></tr>
<tr><td style="padding:28px">
${p(esc(hi))}
${p(esc(opener))}
${fixes.length ? `<ol style="margin:0 0 16px;padding-left:22px">${fixes.map((k) => `<li style="font-size:16px;line-height:1.5;margin-bottom:10px;color:#2b2b3a"><strong>${esc(FIXES[k].title)}.</strong> ${esc(FIXES[k].why)} <a href="${esc(step(FIXES[k].how))}" style="color:#5b3fd0;font-weight:600;white-space:nowrap">Show me how &rarr;</a></li>`).join("")}</ol>` : ""}
${p("Open TapCard, tap your card and choose <strong>Edit</strong>. It takes about two minutes.")}
<p style="margin:18px 0 26px">${cta(i.guideUrl, "See how, step by step")}</p>

${h2("What your card can do now")}
${blocks.map((b) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0"><tr>
<td width="210" valign="top"><img src="${esc(i.imageBase)}/${b.img}" width="190" alt="${esc(b.alt)}" style="display:block;border-radius:14px;border:1px solid #e5e2f3"></td>
<td valign="top" style="padding-left:14px"><p style="margin:0 0 6px;font-size:17px;font-weight:700;color:#1a1530">${esc(b.title)}</p><p style="margin:0;font-size:15px;line-height:1.5;color:#2b2b3a">${esc(b.body)}</p></td></tr></table>`).join("")}

${h2("Share it with the people you meet")}
${p(`${esc(shareAsk)} <a href="${esc(step("share"))}" style="color:#5b3fd0;font-weight:600">Show me how &rarr;</a>`)}
${p(`When someone saves your card, TapCard asks them to send theirs back, so you end up with their details too. And anyone without the app can leave their details on your card's web page. <a href="${esc(step("back"))}" style="color:#5b3fd0;font-weight:600">Show me how &rarr;</a>`)}
${p("You can keep up to <strong>three cards on one phone</strong>, for example your own and one for each business you run. If you'd like cards for your whole team, reply and I'll show you TapCard for Business.")}
${p("Sharing is free for life for the first 1,000 people on each store, and those places are still open.")}

<p style="margin:22px 0">${cta(i.guideUrl, "Finish your card")}</p>
${p(`Stuck, or not sure what to add? Reply to this email with your website and I'll help you set it up. ${esc(i.replyTo)}`)}
${p("Martin Dobson<br>AIERT Ltd")}
<p style="font-size:12px;color:#7a7794;margin-top:26px;line-height:1.5">You're getting this because you made a TapCard. If you'd rather not hear from me again, ${i.unsubscribeUrl ? `<a href="${esc(i.unsubscribeUrl)}" style="color:#7a7794">unsubscribe here</a> or reply` : "reply"} with the word stop and I won't email you.</p>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    hi, "", opener, "", ...fixText.map((t, n) => `${n + 1}. ${t}`), fixes.length ? "" : "",
    "Open TapCard, tap your card and choose Edit. It takes about two minutes.", `Step by step: ${i.guideUrl}`, "",
    "What your card can do now", ...blocks.map((b) => `- ${b.title}: ${b.body}`), "",
    "Share it with the people you meet", `${shareAsk} How: ${step("share")}`,
    `When someone saves your card, TapCard asks them to send theirs back, so you end up with their details too. Anyone without the app can leave their details on your card's web page. How: ${step("back")}`,
    "You can keep up to three cards on one phone, for example your own and one for each business you run. If you'd like cards for your whole team, reply and I'll show you TapCard for Business.",
    "Sharing is free for life for the first 1,000 people on each store, and those places are still open.", "",
    `Stuck? Reply with your website and I'll help you set it up. ${i.replyTo}`, "", "Martin Dobson", "AIERT Ltd", "",
    `You're getting this because you made a TapCard. If you'd rather not hear from me again, ${i.unsubscribeUrl ? `unsubscribe here: ${i.unsubscribeUrl} or reply` : "reply"} with the word stop and I won't email you.`,
  ].join("\n");

  return { subject, html, text };
}
