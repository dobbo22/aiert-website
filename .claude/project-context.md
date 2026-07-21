# Project Context

> Read by the marketing/SEO skills in `.claude/skills/` (geo, schema, sitemap, robots, canonical, etc.) to give MailBroom-specific output instead of generic advice.

**Last updated**: 2026-07-21

---

## Project Overview

| Field | Content |
|-------|---------|
| **Industry** | B2B SaaS — Microsoft 365 / Exchange Online IT tooling |
| **Website** | https://business.mailbroom.app (B2B), https://ios.mailbroom.app (consumer iOS), https://aiert.co.uk (parent company site — ShareQuest fintech + MailBroom links only, no longer hosts MailBroom content directly) |
| **Stage** | Growth — live paying customers, active outreach via a separate tool (Intellireach) |
| **Core product** | Browser-based inbox cleanup (Smart Sweep, Storage Cleanup, Power Search) for Microsoft 365 mailboxes, licensed per organisation via Microsoft SSO |
| **Company** | AIERT Ltd, registered in England & Wales, No. 16587000 |

**Product form**:
- **Platforms**: Web app (business.mailbroom.app, connects via Microsoft Graph API — cloud backend, NOT on-device) + separate native iOS app (ios.mailbroom.app, on-device Apple Intelligence for sender risk analysis) — two distinct products, do not conflate their architectures in copy.
- **Entry points**: "Start a Trial" (30-day evaluation, no card required) → `/trial`.

---

## 1. Product Overview

**One-line description**: A browser-based tool that lets every employee in a company clear their own bloated Microsoft 365 mailbox in a couple of clicks, licensed once per organisation rather than per user.

**Category**: Microsoft 365 / Exchange Online mailbox management SaaS
**Business model**: B2B SaaS, per-organisation seat-band subscription
**Pricing**: Flat monthly price by seat band (real, from `lib/currency.ts`): 1-5 seats £25, 6-10 £45, 11-25 £105, 26-50 £200, 51-100 £350 (GBP; USD/EUR equivalents auto-detected by IP). 101+ seats custom-quoted via sales.

**Core product lines**:

| Product | Description |
|---------|--------------|
| MailBroom for Business | Web app for company-wide M365 mailbox cleanup — Smart Sweep, Storage Cleanup, Power Search. Licensed per org via Microsoft SSO. |
| MailBroom (iOS) | Separate native iOS app for an individual's own personal inbox. On-device Apple Intelligence for sender risk analysis. Different product, different subdomain. |

**Differentiation**:
- Licensed per organisation, not per user — one subscription, everyone on the domain gets access automatically via Microsoft SSO.
- Works within existing Exchange Online retention policies and legal/litigation holds, not around them.
- Real, sourced ROI figures (IT ticket cost, storage overage pricing, CO₂ per GB) rather than vague savings claims — see `/roi`.

---

## 4. Target Audience / ICP

**Primary ICP**:
- **Who**: IT admins/managers at UK SMBs (11-100 employees) responsible for Microsoft 365 administration.
- **Jobs to be done**: Stop recurring "mailbox full" helpdesk tickets; reduce M365 storage overage cost; clean up leaver mailboxes without breaking retention/compliance.
- **Pain points**: Manual per-mailbox cleanup doesn't scale; storage costs creep upward; ex-employee mailboxes sit around as unmonitored cost + security risk.
- **Buying triggers**: A storage-overage bill, a wave of "mailbox full" tickets, an upcoming M365 tenant migration, an employee offboarding backlog.

**Secondary ICP**: UK Managed Service Providers (MSPs) — same product, but they deploy it across client tenants (one tenant at a time, no unified cross-tenant dashboard exists) and can bill clients for it as a project fee or recurring line item. See `/msp-onboarding` and `/msp-storage-billing`.

**Language / locale**: en-GB. Prices shown in GBP/USD/EUR by IP-detected country.

---

## 5. Existing Website

- **URL**: business.mailbroom.app (B2B webapp marketing), ios.mailbroom.app (iOS consumer)
- **Tech stack**: Next.js 16 App Router, deployed on Vercel
- **Current state**: Actively expanding — recently split off `aiert.co.uk/mailbroom/*` onto these dedicated subdomains (301 redirects preserve old links and query-string attribution tokens)

**URL hierarchy** (business.mailbroom.app):

| Path | Purpose |
|------|---------|
| / | Homepage / pricing |
| /trial | Sign-up (30-day eval) |
| /roi, /storage-costs, /carbon-savings | Business case / ROI content |
| /mailbox-full, /bulk-delete-emails, /employee-offboarding, /tenant-migration, /exchange-online-quotas | Answer-shaped SEO/AEO pages targeting specific buyer questions |
| /msp-onboarding, /msp-storage-billing | MSP-specific content |
| /gdpr, /litigation-hold, /security, /privacy | Compliance/trust content |
| /guide | Full feature reference |

**Subdomains**: business.mailbroom.app (B2B) and ios.mailbroom.app (iOS) are separate products — never mix their claims (e.g. "on-device" only applies to iOS, never to Business, which runs on Microsoft Graph API).

---

## 6. Keywords

| Type | Examples |
|------|----------|
| **Primary** | Microsoft 365 mailbox cleanup, Exchange Online storage, mailbox full, bulk delete emails |
| **Secondary** | leaver mailbox offboarding, M365 tenant migration, MSP storage billing, litigation hold |
| **Long-tail** | "why is my mailbox full", "how much storage does Microsoft 365 give", "how do MSPs bill for storage cleanup" |
| **Target intent** | Mostly commercial/transactional — buyers already aware of the problem, searching for a fix |

---

## 8. Brand & Voice

- **Voice**: Direct and concrete — cites a real number, mechanism, or Microsoft-documented behaviour, not a vague benefit.
- **Tone**: No hype language ("game-changing," "revolutionary," "seamless," "unlock," "supercharge"). Short sentences, no corporate "we're excited to announce" framing.
- **Avoid**: Any claim not traceable to this codebase's actual features or sourced data (see `/roi`'s Sources section for the model). Never claim "on-device processing" for the Business product — it has a cloud backend.
- **Preferred terms**: "mailbox" not "inbox" when referring to the M365 object; "seat band" not "tier" for pricing.

---

## 13. Optimization Priorities

| Priority | SEO | GEO (AI search) | Content |
|----------|-----|------------------|---------|
| **P0** | Keep sitemap/robots per-subdomain in sync as pages are added | Keep `llms.txt` in sync with real, published pages only — no dead links | New answer-pages target specific buyer questions, one per page, checked against existing FAQs for duplicates first |
| **P1** | FAQPage + TechArticle JSON-LD on every new page (already the established pattern, see `.claude/skills/answer-page`) | — | MSP-specific and IT-admin-specific content in parallel, equal depth |
| **P2** | Internal cross-links between related answer pages (avoid orphaned pages) | — | — |
