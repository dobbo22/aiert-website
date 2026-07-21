---
name: keyword-research
description: Decide what MailBroom answer-page to write next — classifies candidate buyer questions by funnel stage (bottom/mid/top-of-funnel, brand/comparison), checks them against pages that already exist, and outputs a structured brief. Use before answer-page, whenever the next content topic isn't already decided.
---

# Keyword research for MailBroom content

This skill answers "what should the next page be about?" — a different question from **answer-page**, which answers "how do I build the page once the topic is picked." Run this first when the topic isn't already decided; go straight to **answer-page** when it is.

## Funnel classification

Classify every candidate question into exactly one bucket. MailBroom for Business sells to two buyer types — IT admins/decision-makers at a single company, and MSPs managing multiple client tenants — so tag the buyer alongside the funnel stage.

| Stage | Signal | Existing example |
|---|---|---|
| **Bottom-of-funnel** | Buyer has the problem right now, close to a trial | `/mailbox-full`, `/employee-offboarding`, `/bulk-delete-emails` |
| **Mid-funnel** | Researching how to solve a category of problem, not yet comparing tools | `/audit-mailbox-storage`, `/exchange-online-quotas`, `/tenant-migration` |
| **Top-of-funnel** | Broad education, may not know a tool like this exists yet | `/storage-costs`, `/carbon-savings` |
| **Brand/comparison** | Evaluating MailBroom specifically, or vs. an alternative | `/roi`, `/guide` — no head-to-head competitor comparison page exists yet |

Bottom-of-funnel pages should dominate new output — they convert. Top-of-funnel and brand/comparison pages are worth writing occasionally, not as the default.

## Step 1 — check what's already covered

Never propose a topic without doing this first — it's the same check **answer-page**'s Step 0 requires, done here so a wasted brief never reaches that stage:

1. Read `app/sitemap.ts` for the full list of published pages.
2. For each `app/mailbroom/webapp/*/page.tsx`, skim its `faqs` array questions, not just the page title — coverage often exists as an FAQ entry on a page whose title doesn't obviously suggest it.
3. Drop any candidate that's a near-duplicate of existing coverage. Note it as "already covered by `/slug`" instead of silently discarding it — that's useful signal for whether an existing page's FAQ array should be extended instead.

## Step 2 — source real buyer questions

Prioritize sources that reflect what a real buyer actually typed or asked, over guessing:

- **Existing FAQ answers that raise a follow-up question** they don't fully resolve — the strongest source, since it's a gap in content you already know gets read.
- **Support/sales questions** the user has actually been asked (ask the user directly if none are on hand — don't invent them).
- **The MSP vs. single-company split** — for every bottom/mid-funnel topic already covered from one buyer's angle, check whether the other buyer type has an unaddressed variant (e.g. `/employee-offboarding` covers one company's leaver; is there an MSP-managing-many-clients angle not yet covered?).
- **Google's own "People Also Ask" and autocomplete** for a candidate query, if you can check them — real query phrasing beats invented phrasing.

Do not invent statistics, survey data, or "X% of IT admins" claims to justify a topic — see **content-audit**'s ground-truth rule. A topic is justified by being a real, specific, answerable question, not by a fabricated stat about its popularity.

## Output format

A structured brief per candidate:

```
Question: <the exact buyer question, phrased as they'd ask it>
Funnel stage: <bottom | mid | top | brand-comparison>
Buyer: <single-company IT admin | MSP | both>
Coverage check: <"new" | "already covered by /slug — extend instead">
Why this question: <one sentence — what makes it real, not guessed>
Suggested slug: <kebab-case, matching the existing url-structure pattern>
```

Produce 3-5 candidates per request, not a single pick — let the user choose, per **answer-page**'s own framing ("the buyer question must be specific and searchable").

## After a topic is picked

Hand off to **answer-page** to actually build the page. This skill's job ends at the brief.
