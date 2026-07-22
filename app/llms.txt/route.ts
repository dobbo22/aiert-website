import { headers } from "next/headers";

// llms.txt (llmstxt.org) — a plain-text summary AI crawlers/answer engines
// (ChatGPT, Perplexity, Claude) can read directly, separate from the
// FAQPage/TechArticle JSON-LD already on each page. Host-aware like
// app/sitemap.ts and app/robots.ts, since business.mailbroom.app and
// ios.mailbroom.app are different products for different audiences.

const BUSINESS_TXT = `# MailBroom for Business

> MailBroom for Business is a browser-based inbox cleanup tool for Microsoft 365 and Exchange Online. IT signs in once with Microsoft SSO and every employee on the company domain gets access automatically — no per-user install, no per-user App Store purchase. Licensed per organisation, not per person.

MailBroom for Business solves three recurring Microsoft 365 admin problems: rising mailbox storage costs, IT time lost to "mailbox full" helpdesk tickets, and leaver mailboxes that keep costing money and posing a security risk after an employee has left. It does this with three features: Smart Sweep (bulk cleanup of newsletters and unused mail), Storage Cleanup (frees space without breaking retention/legal hold), and Power Search (fast search across a mailbox) — all of which also work on a shared or delegated mailbox (info@, sales@, or a colleague's mailbox), not just the signed-in user's own.

## Why MailBroom

Licensed per organisation, not per user — one subscription covers every employee on the company's Microsoft domain, signed in via Microsoft SSO, rather than per-seat licensing that penalises larger teams. Works within existing Exchange Online retention policies and legal holds rather than around them.

## For IT administrators

- [Cleaning up shared and delegated mailboxes](https://business.mailbroom.app/shared-mailbox-cleanup): info@, sales@, and colleague-delegated mailboxes can be connected and cleaned the same way as a personal mailbox, once an admin enables it once for the organisation.
- [Bulk mailbox cleanup company-wide](https://business.mailbroom.app/mailbox-full): solve "mailbox full" tickets across every mailbox in minutes instead of per-user, per-ticket manual work.
- [Bulk deployment across the organisation](https://business.mailbroom.app/guide): one Microsoft SSO sign-in and every employee on the domain gets access automatically — no per-user rollout or invite list to manage.
- [Data retention & legal hold compliance](https://business.mailbroom.app/litigation-hold): how cleanup respects existing retention policies and litigation/in-place holds rather than working around them.
- [Secure leaver mailbox handling](https://business.mailbroom.app/employee-offboarding): clean up a leaver's mailbox to cut ongoing licensing cost and remove an unmonitored security risk.
- [Ahead of a tenant migration](https://business.mailbroom.app/tenant-migration): shrink mailboxes before an M365 tenant-to-tenant move, since migration time and cost scale with mailbox size.

## For MSPs

- [Deploying across multiple client tenants](https://business.mailbroom.app/msp-onboarding): set up per client tenant via Microsoft SSO — there's no single dashboard spanning every client at once.
- [Billing clients for storage remediation](https://business.mailbroom.app/msp-storage-billing): one-off project fee vs a recurring managed-service line item.

## ROI & business case

The three main ROI drivers: IT time saved on "mailbox full" helpdesk tickets (one of the most common recurring tickets in any M365 estate), reduced Microsoft 365 storage costs from smaller mailboxes, and removal of the ongoing licensing cost and security risk of retaining ex-employee mailboxes. Full breakdown: [Business case / ROI](https://business.mailbroom.app/roi).

## Security & compliance

- [Privacy Policy](https://business.mailbroom.app/privacy): what MailBroom for Business stores and why — scoped, revocable Microsoft Graph access tokens, no password storage. It runs on a cloud backend (Microsoft Graph API), not on-device.
- [MailBroom & GDPR](https://business.mailbroom.app/gdpr): how mailbox access is scoped and revocable, and how cleanup works within existing retention/legal hold obligations.
- [Security practices](https://business.mailbroom.app/security): MailBroom's approach to Microsoft 365 security.
- [Litigation hold vs retention policy](https://business.mailbroom.app/litigation-hold): the difference between the two, and how bulk cleanup respects both.

## Carbon savings

- [Does deleting email actually reduce CO₂?](https://business.mailbroom.app/carbon-savings): MailBroom estimates 0.233 kg CO₂ saved per GB of mailbox storage freed, tracked per account with award tiers (Seedling → Earth Hero) and an optional embeddable badge for your own site.

## Pricing

Licensed per organisation by seat band, not per user: 1-5 seats, 6-10, 11-25, 26-50, and 51-100, each a flat monthly price (see https://business.mailbroom.app/trial for current rates by band). 101+ seats is custom-quoted. A 30-day evaluation is available with no payment details required.

## Comparisons

- [MailBroom vs Clean Email](https://business.mailbroom.app/blog/mailbroom-vs-clean-email): the closest personal-cleanup competitor — Clean Email is priced per personal account bundle and scored 1/5 for team fit by an independent review; MailBroom is licensed per organisation via Microsoft SSO.
- [MailBroom vs SaneBox](https://business.mailbroom.app/blog/mailbroom-vs-sanebox): SaneBox filters and prioritises incoming mail; MailBroom bulk-deletes and frees storage from mail already accumulated — different jobs, sometimes used together.
- [MailBroom vs BitRecover Office 365 Email Eraser](https://business.mailbroom.app/blog/mailbroom-vs-bitrecover): the closest enterprise bulk-delete competitor — BitRecover logs in with the account's actual email and password; MailBroom uses Microsoft SSO with scoped, revocable Graph API tokens and never sees a password.
- [How MailBroom is different (and who it's not for)](https://business.mailbroom.app/blog/how-mailbroom-is-different): a category map distinguishing MailBroom from team inboxes, CRMs, email clients, email hosting, and archiving/eDiscovery tools it's sometimes confused with.
- [Mailbox cleanup tool cost comparison](https://business.mailbroom.app/blog/mailbox-cleanup-tool-cost-comparison): MailBroom is the only tool in its category with fully published per-organisation pricing by seat band.

## Answers

- [Can MailBroom clean up a shared mailbox?](https://business.mailbroom.app/shared-mailbox-cleanup): yes — once an org admin enables it and the user has Exchange Full Access on that specific mailbox.
- [Mailbox full in Exchange Online](https://business.mailbroom.app/mailbox-full): what happens at each storage-quota stage, why it happens, and how to fix it — including company-wide, not just one mailbox at a time.
- [What to do with a leaver's mailbox](https://business.mailbroom.app/employee-offboarding): licensing cost, security risk, and retention rules for ex-employee mailboxes.
- [Bulk deleting emails in Microsoft 365](https://business.mailbroom.app/bulk-delete-emails): admin-run PowerShell vs employee self-serve, and what's safe to bulk delete.
- [The real cost of email storage](https://business.mailbroom.app/storage-costs): how Microsoft's per-GB storage pricing adds up over time.
- [Exchange Online storage quotas by plan](https://business.mailbroom.app/exchange-online-quotas): how much storage each plan includes, what changed 1 July 2026, and the cost of going over.
- [Audit mailbox storage across a tenant](https://business.mailbroom.app/audit-mailbox-storage): the two native ways (admin centre report, PowerShell) to find the biggest mailboxes before fixing them.
- [M365 tenant-to-tenant migration and mailbox size](https://business.mailbroom.app/tenant-migration): what carries over in a tenant migration, and why mailbox size drives migration time and cost.
- [How MSPs bill for M365 storage cleanup](https://business.mailbroom.app/msp-storage-billing): one-off project fees vs a recurring managed-service line item for mailbox storage remediation.
- [Business case / ROI](https://business.mailbroom.app/roi): the IT-time and storage-cost case for adopting MailBroom company-wide.
- [User guide](https://business.mailbroom.app/guide): sign-in, Dashboard, Smart Sweep, Storage Cleanup, Power Search, plans & billing, Admin, privacy.

## Company

MailBroom is a product of AIERT Ltd, registered in England & Wales (No. 16587000). Trial and pricing: https://business.mailbroom.app/trial
Contact: admin@aiert.co.uk
`;

const IOS_TXT = `# MailBroom

> MailBroom is an AI email cleaner for iPhone — Smart Sweep, Storage Cleanup, and Power Search for a personal inbox, built as a native iOS app.

## Answers

- [MailBroom overview](https://ios.mailbroom.app/): what MailBroom does for individual iPhone users cleaning up their own inbox.
- [Leaderboard](https://ios.mailbroom.app/leaderboard): users ranked by inbox cleanup activity.
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
