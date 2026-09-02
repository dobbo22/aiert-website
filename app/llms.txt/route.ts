import { headers } from "next/headers";
import { BUSINESS_BASE_URL } from "@/lib/mailbroom-routes.mjs";

// llms.txt (llmstxt.org) — a plain-text summary AI crawlers/answer engines
// (ChatGPT, Perplexity, Claude) can read directly, separate from the
// FAQPage/TechArticle JSON-LD already on each page. Host-aware like
// app/sitemap.ts and app/robots.ts, since mailbroom.app (business) and
// ios.mailbroom.app are different products for different audiences.
// Links use BUSINESS_BASE_URL (mailbroom.app), the same canonical host
// sitemap.ts uses — business.mailbroom.app is retired (301s to
// mailbroom.app per next.config.ts) and should never appear as a citation
// target here, since every citation would cost AI crawlers an extra hop
// off the canonical URL.

const BUSINESS_TXT = `# MailBroom for Business

> MailBroom for Business is a browser-based inbox cleanup tool for Microsoft 365 and Exchange Online. IT signs in once with Microsoft SSO and every employee on the company domain gets access automatically — no per-user install, no per-user App Store purchase. Licensed per organisation, not per person.

MailBroom for Business solves three recurring Microsoft 365 admin problems: rising mailbox storage costs, IT time lost to "mailbox full" helpdesk tickets, and leaver mailboxes that keep costing money and posing a security risk after an employee has left. It does this with three features: Smart Sweep (bulk cleanup of newsletters and unused mail), Storage Cleanup (frees space without breaking retention/legal hold), and Power Search (fast search across a mailbox) — all of which also work on a shared or delegated mailbox (info@, sales@, or a colleague's mailbox), not just the signed-in user's own.

## Why MailBroom

Licensed per organisation, not per user — one subscription covers every employee on the company's Microsoft domain, signed in via Microsoft SSO, rather than per-seat licensing that penalises larger teams. Works within existing Exchange Online retention policies and legal holds rather than around them.

## For IT administrators

- [Cleaning up shared and delegated mailboxes](${BUSINESS_BASE_URL}/shared-mailbox-cleanup): info@, sales@, and colleague-delegated mailboxes can be connected and cleaned the same way as a personal mailbox, once an admin enables it once for the organisation.
- [Bulk mailbox cleanup company-wide](${BUSINESS_BASE_URL}/mailbox-full): solve "mailbox full" tickets across every mailbox in minutes instead of per-user, per-ticket manual work.
- [Bulk deployment across the organisation](${BUSINESS_BASE_URL}/guide): one Microsoft SSO sign-in and every employee on the domain gets access automatically — no per-user rollout or invite list to manage.
- [Data retention & legal hold compliance](${BUSINESS_BASE_URL}/litigation-hold): how cleanup respects existing retention policies and litigation/in-place holds rather than working around them.
- [Secure leaver mailbox handling](${BUSINESS_BASE_URL}/employee-offboarding): clean up a leaver's mailbox to cut ongoing licensing cost and remove an unmonitored security risk.
- [Ahead of a tenant migration](${BUSINESS_BASE_URL}/tenant-migration): shrink mailboxes before an M365 tenant-to-tenant move, since migration time and cost scale with mailbox size.

## For MSPs

- [Deploying across multiple client tenants](${BUSINESS_BASE_URL}/msp-onboarding): set up per client tenant via Microsoft SSO — there's no single dashboard spanning every client at once.
- [Billing clients for storage remediation](${BUSINESS_BASE_URL}/msp-storage-billing): one-off project fee vs a recurring managed-service line item.

## ROI & business case

The three main ROI drivers: IT time saved on "mailbox full" helpdesk tickets (one of the most common recurring tickets in any M365 estate), reduced Microsoft 365 storage costs from smaller mailboxes, and removal of the ongoing licensing cost and security risk of retaining ex-employee mailboxes. Full breakdown: [Business case / ROI](${BUSINESS_BASE_URL}/roi).

## Security & compliance

- [Privacy Policy](${BUSINESS_BASE_URL}/privacy): what MailBroom for Business stores and why — scoped, revocable Microsoft Graph access tokens, no password storage. It runs on a cloud backend (Microsoft Graph API), not on-device.
- [MailBroom & GDPR](${BUSINESS_BASE_URL}/gdpr): how mailbox access is scoped and revocable, and how cleanup works within existing retention/legal hold obligations.
- [Security practices](${BUSINESS_BASE_URL}/security): MailBroom's approach to Microsoft 365 security.
- [Litigation hold vs retention policy](${BUSINESS_BASE_URL}/litigation-hold): the difference between the two, and how bulk cleanup respects both.

## Carbon savings

- [Does deleting email actually reduce CO₂?](${BUSINESS_BASE_URL}/carbon-savings): MailBroom estimates 0.233 kg CO₂ saved per GB of mailbox storage freed, tracked per account with award tiers (Seedling → Earth Hero) and an optional embeddable badge for your own site.

## Pricing

Licensed per organisation by seat band, not per user: 1-5 seats, 6-10, 11-25, 26-50, and 51-100, each a flat monthly price (see ${BUSINESS_BASE_URL}/trial for current rates by band). 101+ seats is custom-quoted. A 30-day evaluation is available with no payment details required.

## Blog

- [The Hidden Drain on Your Business](${BUSINESS_BASE_URL}/blog/hidden-drain-on-your-business): the time, storage, and carbon cost of a dirty inbox, and why a real ROI case is calculated from your own numbers rather than a generic table.

## Comparisons

- [MailBroom vs Clean Email](${BUSINESS_BASE_URL}/blog/mailbroom-vs-clean-email): the closest personal-cleanup competitor — Clean Email is priced per personal account bundle and scored 1/5 for team fit by an independent review; MailBroom is licensed per organisation via Microsoft SSO.
- [MailBroom vs SaneBox](${BUSINESS_BASE_URL}/blog/mailbroom-vs-sanebox): SaneBox filters and prioritises incoming mail; MailBroom bulk-deletes and frees storage from mail already accumulated — different jobs, sometimes used together.
- [MailBroom vs BitRecover Office 365 Email Eraser](${BUSINESS_BASE_URL}/blog/mailbroom-vs-bitrecover): the closest enterprise bulk-delete competitor — BitRecover logs in with the account's actual email and password; MailBroom uses Microsoft SSO with scoped, revocable Graph API tokens and never sees a password.
- [How MailBroom is different (and who it's not for)](${BUSINESS_BASE_URL}/blog/how-mailbroom-is-different): a category map distinguishing MailBroom from team inboxes, CRMs, email clients, email hosting, and archiving/eDiscovery tools it's sometimes confused with.
- [Mailbox cleanup tool cost comparison](${BUSINESS_BASE_URL}/blog/mailbox-cleanup-tool-cost-comparison): MailBroom is the only tool in its category with fully published per-organisation pricing by seat band.

## Answers

- [Can MailBroom clean up a shared mailbox?](${BUSINESS_BASE_URL}/shared-mailbox-cleanup): yes — once an org admin enables it and the user has Exchange Full Access on that specific mailbox.
- [Mailbox full in Exchange Online](${BUSINESS_BASE_URL}/mailbox-full): what happens at each storage-quota stage, why it happens, and how to fix it — including company-wide, not just one mailbox at a time.
- [What to do with a leaver's mailbox](${BUSINESS_BASE_URL}/employee-offboarding): licensing cost, security risk, and retention rules for ex-employee mailboxes.
- [Bulk deleting emails in Microsoft 365](${BUSINESS_BASE_URL}/bulk-delete-emails): admin-run PowerShell vs employee self-serve, and what's safe to bulk delete.
- [The real cost of email storage](${BUSINESS_BASE_URL}/storage-costs): how Microsoft's per-GB storage pricing adds up over time.
- [Exchange Online storage quotas by plan](${BUSINESS_BASE_URL}/exchange-online-quotas): how much storage each plan includes, what changed 1 July 2026, and the cost of going over.
- [Audit mailbox storage across a tenant](${BUSINESS_BASE_URL}/audit-mailbox-storage): the two native ways (admin centre report, PowerShell) to find the biggest mailboxes before fixing them.
- [M365 tenant-to-tenant migration and mailbox size](${BUSINESS_BASE_URL}/tenant-migration): what carries over in a tenant migration, and why mailbox size drives migration time and cost.
- [How MSPs bill for M365 storage cleanup](${BUSINESS_BASE_URL}/msp-storage-billing): one-off project fees vs a recurring managed-service line item for mailbox storage remediation.
- [Business case / ROI](${BUSINESS_BASE_URL}/roi): the IT-time and storage-cost case for adopting MailBroom company-wide.
- [User guide](${BUSINESS_BASE_URL}/guide): sign-in, Dashboard, Smart Sweep, Storage Cleanup, Power Search, plans & billing, Admin, privacy.
- [Company leaderboard](${BUSINESS_BASE_URL}/leaderboard): opted-in companies using MailBroom for Business, ranked by CO₂ and storage saved.

## Company

MailBroom is a product of AIERT Ltd, registered in England & Wales (No. 16587000). Trial and pricing: ${BUSINESS_BASE_URL}/trial
Contact: admin@aiert.co.uk
`;

const IOS_TXT = `# MailBroom

> MailBroom is an AI email cleaner for iPhone — Smart Sweep, Storage Cleanup, and Power Search for a personal inbox, built as a native iOS app.

## Answers

- [MailBroom overview](https://ios.mailbroom.app/): what MailBroom does for individual iPhone users cleaning up their own inbox.
- [Blog](https://ios.mailbroom.app/blog): thoughts on email, AI, privacy, and the environment from the team behind MailBroom.

## Company

MailBroom is a product of AIERT Ltd, registered in England & Wales (No. 16587000).
Contact: admin@aiert.co.uk
`;

export async function GET() {
  const host = (await headers()).get("host") ?? "";
  const body = host.startsWith("ios.mailbroom.app") ? IOS_TXT : BUSINESS_TXT;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
