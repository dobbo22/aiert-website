---
name: content-audit
description: Audit already-published MailBroom pages (business.mailbroom.app and ios.mailbroom.app) against the actual product code — pricing, architecture claims, sourced figures, internal links, and structured data — to catch drift or unverified claims before they mislead a buyer or an AI crawler. Use periodically, after adding new pages, or whenever content may have been written from an external report rather than the codebase itself.
---

# Auditing published MailBroom content

This project has a repeated failure mode worth guarding against: marketing copy pasted from third-party AI-generated reports has, more than once, contained fabricated statistics, non-existent page URLs, and false product claims (e.g. claiming "on-device processing" for MailBroom for Business, which actually runs on a cloud Microsoft Graph API backend). This skill formalizes the manual cross-check that caught those — run it whenever content might have drifted from ground truth, not just when asked to "review."

## What "ground truth" means here

Never trust a claim because it reads confidently or because a page already states it — verify it against the actual source:

| Claim type | Verify against |
|---|---|
| Pricing / seat bands | `lib/currency.ts` (`BANDS` — the real, current per-seat-band monthly prices) |
| Trial length / terms | `app/mailbroom/webapp/trial/page.tsx` (read the actual copy, don't assume) |
| Architecture (cloud vs on-device) | `app/mailbroom/webapp/privacy/page.tsx` — Business explicitly states it "necessarily has a backend, since it connects... via the Microsoft Graph API"; only the separate iOS app is on-device. Never let a Business page claim on-device processing. |
| CO₂ / sustainability figures | `app/mailbroom/webapp/roi/RoiCalculator.tsx` (`CO2_KG_PER_GB`) and `app/mailbroom/webapp/page.tsx` (`co2Kg` calculation) — one consistent factor across the whole site, not a different number per page |
| Feature existence (e.g. "reporting dashboard", "API", "PowerShell automation") | The actual feature set described in `app/mailbroom/webapp/guide/page.tsx` — if a claimed feature isn't described there, treat it as unconfirmed and do not publish it |
| Company/legal facts | Footer text already used consistently across pages (AIERT Ltd, company number) — check it matches, don't re-derive it |

If a page claims something not traceable to one of these (or an equivalent real source), flag it — don't assume it's fine because it "sounds right."

## Checks to run

1. **Dead links**: every internal `href` across `app/mailbroom/**/*.tsx` and `app/llms.txt/route.ts` must resolve to a real route. Cross-check against `app/sitemap.ts` and the actual `app/mailbroom/**/page.tsx` file tree — a link to a page that was proposed but never built is the single most common failure mode seen in this project so far.
2. **Orphaned pages**: every route in `app/sitemap.ts` should be linked from at least one other page's body or footer — an unlinked page is harder for crawlers to discover even though it's in the sitemap.
3. **llms.txt drift**: `app/llms.txt/route.ts`'s link list should match what's actually live — no page listed there that isn't in `app/sitemap.ts`, and no significant published page missing from it.
4. **Numeric consistency**: pricing, trial length, CO₂ factor, and any other figure that appears on more than one page must be identical everywhere it appears — grep for the figure across all pages rather than checking one page in isolation.
5. **Architecture claims**: grep for "on-device", "never sends data", "local processing" etc. across `app/mailbroom/webapp/**` (Business) — any match is a bug, since Business is cloud-backed. These claims are only ever true on the `app/mailbroom/**` (non-webapp, iOS) pages.
6. **Structured data presence**: every answer-page-style page should have both `TechArticle` and `FAQPage` JSON-LD (per the `answer-page` skill's pattern) — flag any that are missing one.
7. **Fabricated social proof**: grep for "case stud", "testimonial", specific customer names, or invented statistics ("X% in Y months") not traceable to real data — these must never be published without the user explicitly supplying real figures.
8. **Duplicate/competing content**: two pages targeting near-identical buyer questions (per the `answer-page` skill's Step 0 dedupe check) split search relevance instead of reinforcing it — flag near-duplicate FAQ questions across pages.

## Output format

Report findings as a flat list, most-severe first (dead links and false claims before stylistic issues), each with:
- File and line (or page URL)
- What's wrong
- What the ground-truth source actually says
- Suggested fix (correct the copy, remove the claim, or ask the user for real data if the claim could be true but is unverified)

Don't silently fix everything — dead links and obviously stale figures can be corrected directly, but anything that reads like it needs real customer/business input (pricing changes, new claims, case studies) should be flagged for the user to confirm, not invented to fill the gap.
