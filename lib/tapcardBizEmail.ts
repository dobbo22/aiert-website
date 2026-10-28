import { Resend } from "resend";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";
import { isFreeMailDomain } from "@/lib/tapcardDomain";

// TapCard for Business's own small set of transactional emails — magic
// links. (Employee invites go from the admin's own email — see
// lib/tapcardBizInvite.ts.) Deliberately separate from
// lib/inviteEmail.ts, which is built around the personal-card invite
// flow's rich card-preview image; these are plain, short, and don't need
// any of that machinery. Reuses the same Resend/from-address wiring
// (lib/inviteEmailRoute.ts) rather than inventing new sender config.

// No BCC to the sender (unlike the personal invites): every one of these
// carries a single-use sign-in or claim link, which shouldn't be copied
// into anyone else's mailbox — and when the recipient is the sender
// address itself, a BCC just delivers the same email twice.
export async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  const route = inviteEmailRoute();
  if (route.viaResend) {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: route.from,
      to,
      replyTo: route.replyTo,
      subject,
      text,
      html,
    });
    if (error) throw new Error(error.message ?? "Email send failed");
    return;
  }
  // Graph (M365) send path, same function the personal-invite send route
  // uses in its non-Resend branch.
  const { sendMailbroomEmail } = await import("@/lib/mailbroomGraphMail");
  await sendMailbroomEmail({ to, subject, bodyHtml: html, signatureHtml: "" });
}

export async function sendBizLoginEmail(email: string, link: string): Promise<void> {
  const html = `
    <p>Tap the link below to sign in to your TapCard for Business admin:</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link works once and expires in 15 minutes.</p>
  `;
  await send(email, "Sign in to TapCard for Business", html, `Sign in: ${link}\n\nThis link works once and expires in 15 minutes.`);
}

export async function sendBizAdminInviteEmail(email: string, company: string, addedBy: string, link: string): Promise<void> {
  const name = company.replace(/</g, "&lt;");
  const html = `
    <p><strong>${addedBy.replace(/</g, "&lt;")}</strong> has made you an admin of <strong>${name}</strong> on TapCard for Business.</p>
    <p>Tap the link below to sign in. From then on you can sign in at tapcard.aiert.co.uk/business/admin with this email address.</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link works once and expires in 15 minutes. If you weren't expecting it, ignore this email and no access is given.</p>
    <p><strong>What an admin can do:</strong></p>
    <ul>
      <li><strong>Card template:</strong> find the business to fill in the logo, colour and social links, and see each shop's card as a phone screen.</li>
      <li><strong>Locations:</strong> add shops, edit their details, and create each manager's invite link.</li>
      <li><strong>Employees:</strong> invite staff cards and choose who may post offers and news.</li>
      <li><strong>Offers &amp; numbers:</strong> post offers and news for any shop, and see views, saves, followers and claims.</li>
      <li><strong>QR sign:</strong> print a window or till sign with each shop's QR code.</li>
    </ul>
    <p>The full <a href="https://tapcard.aiert.co.uk/business/guide">Admin guide</a> explains each step. Reply to this email if you need help.</p>
  `;
  await send(email, `You are now an admin of ${company} on TapCard for Business`, html,
    `${addedBy} has made you an admin of ${company} on TapCard for Business.\n\nSign in: ${link}\n\nThis link works once and expires in 15 minutes. If you weren't expecting it, ignore this email and no access is given.\n\nWhat an admin can do: Card template (find the business, see each shop's card), Locations (add shops, create manager links), Employees (invite staff, choose who may post offers), Offers & numbers (post offers and news, see results), QR sign (print each shop's sign). Full guide: https://tapcard.aiert.co.uk/business/guide`);
}

export async function sendBizTrialReminderEmail(email: string, company: string, endsOn: string): Promise<void> {
  const link = "https://tapcard.aiert.co.uk/business/admin/billing";
  const html = `
    <p>Your free TapCard for Business trial for <strong>${company.replace(/</g, "&lt;")}</strong> ends on <strong>${endsOn}</strong>.</p>
    <p>After that, invites stop and your company cards are no longer covered for Promote (special offers and news). To keep everything working, choose a plan:</p>
    <p><a href="${link}">${link}</a></p>
    <p>TapCard for Business is £42 a year per location for 2 to 4 locations (less each from 5 locations), with up to 10 staff cards per location and Promote included. If you're not going to carry on, there's nothing to do.</p>
  `;
  await send(email, `Your TapCard for Business trial ends on ${endsOn}`, html,
    `Your free TapCard for Business trial for ${company} ends on ${endsOn}.\n\nAfter that, invites stop and your company cards are no longer covered for Promote. To keep everything working, choose a plan: ${link}\n\nTapCard for Business is £42 a year per location for 2 to 4 locations (less each from 5 locations), with up to 10 staff cards per location and Promote included. If you're not going to carry on, there's nothing to do.`);
}

const ORIGIN = "https://tapcard.aiert.co.uk";
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface WelcomeSteps { title: string; body: string }

/// The full welcome and how-to-use email for a new TapCard for Business admin: sent once when a company starts its free trial and once
/// when a paid plan starts. It repeats the essentials of the Admin Guide (tapcard.aiert.co.uk/business/guide), so keep the two in step.
export async function sendBizWelcomeEmail(email: string, company: string, opts: BizWelcomeOpts): Promise<void> {
  const m = buildBizWelcomeEmail(email, company, opts);
  await send(email, m.subject, m.html, m.text);
}

export type BizWelcomeOpts = ({ kind: "trial"; endsOn: string } | { kind: "paid"; locations: number }) & { name?: string };

export function buildBizWelcomeEmail(email: string, company: string, opts: BizWelcomeOpts): { subject: string; html: string; text: string } {
  // Addressed by the first name they gave (never guessed from the email address).
  const first = (opts.name ?? "").trim().split(/\s+/)[0]?.slice(0, 40) ?? "";
  const hello = first ? `Hi ${esc(first)},` : "Hello,";
  const helloText = first ? `Hi ${first},` : "Hello,";
  const mailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const ownDomain = !!mailDomain && !isFreeMailDomain(mailDomain);
  const name = esc(company || "your company");
  const admin = `${ORIGIN}/business/admin`;
  const guide = `${ORIGIN}/business/guide`;
  const billing = `${ORIGIN}/business/admin/billing`;

  const intro = opts.kind === "trial"
    ? `Your free trial for <strong>${name}</strong> is running until <strong>${esc(opts.endsOn)}</strong>. The trial is one card, so you can try the card template, the sign-in and the app on yourself first. Steps 3 and 4 below (your team and several shops) start when you choose a plan.`
    : `Your TapCard for Business plan for <strong>${name}</strong> is active, for <strong>${opts.locations} locations</strong>. Each location includes its own card and up to 10 staff cards, and special offers and news (Promote) are included on every location.`;
  const introText = opts.kind === "trial"
    ? `Your free trial for ${company} is running until ${opts.endsOn}. The trial is one card, so you can try the card template, the sign-in and the app on yourself first. Steps 3 and 4 below (your team and several shops) start when you choose a plan.`
    : `Your TapCard for Business plan for ${company} is active, for ${opts.locations} locations. Each location includes its own card and up to 10 staff cards, and special offers and news (Promote) are included on every location.`;

  const steps: WelcomeSteps[] = [
    { title: "Sign in to your admin",
      body: `Go to <a href="${admin}">${admin}</a> and enter <strong>${esc(email)}</strong>. We email you a sign-in link (there is no password). Each link works once and lasts 15 minutes; ask for a new one any time.` },
    { title: "Design your company card",
      body: `On the <strong>Card template</strong> tab add your logo, website and company social links, and choose which details staff may not change. Every staff card starts from this template.` },
    { title: "Invite your team",
      body: `On the <strong>Employees</strong> tab upload a spreadsheet (name, email, job title as a CSV) or a contacts file (.vcf). You get one link per person to send from your own email. Each person installs the free TapCard app (iPhone or Android), taps their link and their card is ready to share. The list is read on your computer only and is never uploaded or kept.` },
    { title: "Mark your shops and choose who can post",
      body: `In the Active cards list tick <strong>This card is a shop / location</strong> on each shop's card. Under <strong>Can post offers and news for</strong> tick the shop or shops each manager may post for. People with no ticks can't post. You can always post for any shop yourself from the web.` },
    { title: "Send your first offer or news",
      body: `A shop can post a special offer (with an end date, a number of claims and a 4 to 6 digit <strong>staff PIN</strong>) and short news. A shop has one live offer at a time. Customers see them when they follow the shop in the TapCard app. Tell your staff the PIN.` },
    { title: "Confirm a customer's code at the till",
      body: `The customer shows a one-off QR code. Any member of staff scans it with an ordinary phone camera, types the staff PIN and taps <strong>Mark as used</strong>. On a till or computer, go to <a href="${ORIGIN}/redeem">${ORIGIN}/redeem</a> and type the code under the QR. No app or login is needed to confirm a code.` },
    { title: "Check how it is going",
      body: `The <strong>Offers &amp; numbers</strong> tab shows, for each location, views, scans, saves, followers, and how many people claimed and used each offer. You can download it as a spreadsheet.` },
  ];

  // What matters for verification depends on the address they signed up with. The HTML and the plain text are built separately, so an
  // address with markup in it can never become markup in the email.
  const verifyHtml = `<p><strong>Verified business.</strong> ${
    ownDomain
      ? `You signed up with ${esc(email)}, which is on your own domain (${esc(mailDomain)}). Set the <strong>Website</strong> on your Card template to ${esc(mailDomain)} and, once your first sign-in link has been used, your company cards are marked verified automatically (the company's plan must be active). Verified cards can post offers and news.`
      : `You signed up with ${esc(email)}, a shared mailbox, so your cards are not verified automatically. Each card can still be verified one at a time, by an emailed code or a proof on your website. To have all your company cards verified at once, add an admin whose email is on your website's own domain (for example you@yourcompany.com) on the <strong>Admins</strong> tab.`
  }</p>`;
  const verifyText = `Verified business. ${
    ownDomain
      ? `You signed up with ${email}, which is on your own domain (${mailDomain}). Set the Website on your Card template to ${mailDomain} and, once your first sign-in link has been used, your company cards are marked verified automatically (the company's plan must be active). Verified cards can post offers and news.`
      : `You signed up with ${email}, a shared mailbox, so your cards are not verified automatically. Each card can still be verified one at a time, by an emailed code or a proof on your website. To have all your company cards verified at once, add an admin whose email is on your website's own domain (for example you@yourcompany.com) on the Admins tab.`
  }`;

  const trialHtml = opts.kind === "trial"
    ? `<p><strong>Ready for the whole business?</strong> TapCard for Business starts at two locations: £42 a year per location for 2 to 4 locations (£34 each for 5 to 19, £27 each from 20), each with up to 10 staff cards and Promote included. Choose a plan any time on the <a href="${billing}">Billing tab</a>. We'll email you a few days before the trial ends, and if you don't carry on there is nothing to do.</p>`
    : `<p><strong>Your plan.</strong> You can change the number of locations or update your card on the <a href="${billing}">Billing tab</a>. Changes are pro-rated.</p>`;
  const trialText = opts.kind === "trial"
    ? `Ready for the whole business? TapCard for Business starts at two locations: £42 a year per location for 2 to 4 locations (£34 each for 5 to 19, £27 each from 20), each with up to 10 staff cards and Promote included. Choose a plan any time on the Billing tab: ${billing}. We'll email you a few days before the trial ends, and if you don't carry on there is nothing to do.`
    : `Your plan. You can change the number of locations or update your card on the Billing tab: ${billing}. Changes are pro-rated.`;

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:600px">
      <p style="font-size:18px"><strong>Welcome to TapCard for Business</strong></p>
      <p>${hello}</p>
      <p>Thank you for choosing TapCard for ${name}. ${intro}</p>
      <p>This is everything you need to get going. It is also in the full <a href="${guide}">Admin Guide</a>, which has pictures and answers to common questions.</p>
      <p>Your admin area: <a href="${admin}">${admin}</a> (sign in with ${esc(email)})</p>
      <h3 style="margin:22px 0 6px">Getting started</h3>
      <ol style="padding-left:20px">
        ${steps.map((st) => `<li style="margin-bottom:10px"><strong>${st.title}.</strong> ${st.body}</li>`).join("\n")}
      </ol>
      ${verifyHtml}
      <p><strong>What your customers need.</strong> Customers scan your QR code or tap your link to save your card with no app. To get offers and news they install the free TapCard app and follow your shop. You can print a window or till sign (QR sign, business cards) from the app.</p>
      ${trialHtml}
      <p><strong>Need a hand?</strong> Just reply to this email and a person will answer. The <a href="${guide}">Admin Guide</a> covers setup, staff changes, offers and billing.</p>
      <p>Best wishes,<br>The TapCard team at AIERT Ltd</p>
    </div>`;

  const text = [
    "Welcome to TapCard for Business",
    "",
    helloText,
    "",
    `Thank you for choosing TapCard for ${company || "your company"}. ${introText}`,
    "",
    `Your admin area: ${admin} (sign in with ${email})`,
    `Full Admin Guide: ${guide}`,
    "",
    "GETTING STARTED",
    ...steps.map((st, i) => `${i + 1}. ${st.title}. ${st.body.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&")}`),
    "",
    verifyText,
    "",
    "What your customers need. Customers scan your QR code or tap your link to save your card with no app. To get offers and news they install the free TapCard app and follow your shop. You can print a window or till sign (QR sign, business cards) from the app.",
    "",
    trialText,
    "",
    "Need a hand? Just reply to this email and a person will answer.",
    "",
    "Best wishes,",
    "The TapCard team at AIERT Ltd",
  ].join("\n");

  return { subject: `Welcome to TapCard for Business: how to get started with ${company || "your company"}`, html, text };
}
