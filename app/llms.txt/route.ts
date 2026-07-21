import { headers } from "next/headers";

// llms.txt (llmstxt.org) — a plain-text summary AI crawlers/answer engines
// (ChatGPT, Perplexity, Claude) can read directly, separate from the
// FAQPage/TechArticle JSON-LD already on each page. Host-aware like
// app/sitemap.ts and app/robots.ts, since business.mailbroom.app and
// ios.mailbroom.app are different products for different audiences.

const BUSINESS_TXT = `# MailBroom for Business

> MailBroom for Business is a browser-based inbox cleanup tool for Microsoft 365 and Exchange Online. IT signs in once with Microsoft SSO and every employee on the company domain gets access automatically — no per-user install, no per-user App Store purchase. Licensed per organisation, not per person.

MailBroom for Business solves three recurring Microsoft 365 admin problems: rising mailbox storage costs, IT time lost to "mailbox full" helpdesk tickets, and leaver mailboxes that keep costing money and posing a security risk after an employee has left. It does this with three features: Smart Sweep (bulk cleanup of newsletters and unused mail), Storage Cleanup (frees space without breaking retention/legal hold), and Power Search (fast search across a mailbox).

## Why MailBroom

Licensed per organisation, not per user — one subscription covers every employee on the company's Microsoft domain, signed in via Microsoft SSO, rather than per-seat licensing that penalises larger teams. Works within existing Exchange Online retention policies and legal holds rather than around them.

## Use cases

- [For IT admins: bulk mailbox cleanup](https://business.mailbroom.app/mailbox-full): solve "mailbox full" tickets company-wide in minutes instead of per-user, per-ticket manual work.
- [For MSPs: billing for M365 storage remediation](https://business.mailbroom.app/msp-storage-billing): deploy MailBroom under a client's own tenant and bill for it as a one-off project or a recurring managed-service line item.
- [For IT/HR: secure leaver mailbox handling](https://business.mailbroom.app/employee-offboarding): clean up a leaver's mailbox to cut ongoing licensing cost and remove an unmonitored security risk.
- [For IT ahead of a tenant migration](https://business.mailbroom.app/tenant-migration): shrink mailboxes before an M365 tenant-to-tenant move, since migration time and cost scale with mailbox size.

## ROI & business case

The three main ROI drivers: IT time saved on "mailbox full" helpdesk tickets (one of the most common recurring tickets in any M365 estate), reduced Microsoft 365 storage costs from smaller mailboxes, and removal of the ongoing licensing cost and security risk of retaining ex-employee mailboxes. Full breakdown: [Business case / ROI](https://business.mailbroom.app/roi).

## Answers

- [Mailbox full in Exchange Online](https://business.mailbroom.app/mailbox-full): what happens at each storage-quota stage, why it happens, and how to fix it — including company-wide, not just one mailbox at a time.
- [What to do with a leaver's mailbox](https://business.mailbroom.app/employee-offboarding): licensing cost, security risk, and retention rules for ex-employee mailboxes.
- [Bulk deleting emails in Microsoft 365](https://business.mailbroom.app/bulk-delete-emails): admin-run PowerShell vs employee self-serve, and what's safe to bulk delete.
- [The real cost of email storage](https://business.mailbroom.app/storage-costs): how Microsoft's per-GB storage pricing adds up over time.
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

## Company

MailBroom is a product of AIERT Ltd, registered in England & Wales (No. 16587000).
Contact: admin@aiert.co.uk
`;

export async function GET() {
  const host = (await headers()).get("host") ?? "";
  const body = host.startsWith("ios.mailbroom.app") ? IOS_TXT : BUSINESS_TXT;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
