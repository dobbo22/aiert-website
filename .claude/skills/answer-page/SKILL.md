---
name: answer-page
description: Write a new answer-shaped MailBroom content page (a "how do I fix X" / "what happens when Y" page under app/mailbroom/webapp/) in the site's established SEO/AEO pattern — proper metadata, FAQPage + TechArticle JSON-LD, direct-answer FAQ format. Use when adding a new page targeting a specific buyer question.
---

# Writing an answer-page

Reference implementation: `app/mailbroom/webapp/mailbox-full/page.tsx`. Read it before writing a new one — this skill describes the pattern it follows, not a substitute for looking at it.

## When to use this

The buyer question must be specific and searchable — something a real IT admin or business owner would type into Google or ask ChatGPT/Perplexity. "Mailbox full in Exchange Online" is answer-shaped. "Email tips" is not. If you can't state the target question as a single sentence someone would actually ask, this isn't the right page to write yet.

Before writing, check `app/sitemap.ts` and the existing pages under `app/mailbroom/webapp/` to confirm the question isn't already covered — extend an existing page rather than creating a near-duplicate.

## Required structure

1. **`export const metadata`** (Next.js Metadata API, not a client component — no `"use client"` at the top of the file):
   - `title`: under ~60 chars, format `"{Question, front-loaded} | AIERT Ltd"`
   - `description`: under ~160 chars, states the answer's shape, not just the topic
   - `keywords`: 5-8 real search phrases a buyer would type, not just brand terms
   - `metadataBase: new URL("https://aiert.co.uk")`
   - `openGraph`: title/description (can be shorter/punchier than the meta ones), `url` (full path), `siteName: "AIERT Ltd"`, `locale: "en_GB"`, `type: "website"`

2. **JSON-LD structured data**, as plain objects rendered via `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }} />` inside the returned JSX (not in `<head>` — Next.js App Router pages render these inline):
   - A `TechArticle` object: `headline`, `description`, `url`, `publisher: { "@type": "Organization", name: "AIERT Ltd", url: "https://aiert.co.uk" }`
   - A `FAQPage` object built from a `faqs` array (see below) — `mainEntity` maps each `{q, a}` to `{ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }`

3. **A `faqs` array** of 4-6 `{ q, a }` pairs, defined as a module-level const before the component. Each answer must be substantive (2-4 sentences) and directly answer the question — no hedging, no "it depends" without immediately saying what it depends on. These get consumed twice: once for the FAQPage JSON-LD, once for the rendered `<details>` accordion in the FAQ section.

## Page sections (in order)

Reuse the exact class names below — they're real classes defined in `app/globals.css`, not one-offs:

1. **Nav** — sticky, `nav-glass`, logo + `AIERT Ltd` wordmark linking to `/mailbroom/webapp`, 2-3 contextual links (not the full site nav — just what's relevant to this page's topic), a `btn-gold` "Start a Trial" CTA linking to `/mailbroom/webapp/trial`.
2. **Hero** — `badge-live` pill for context (e.g. product/platform tag), an `<h1>` with the question restated as a headline (use `gold-text` on the key phrase), one paragraph directly previewing the answer.
3. **2-4 content sections**, alternating `section-dark` and plain background, each built from `card-glass` cards. Structure varies by topic, but every section needs a clear `<h2>`, and each card needs its own `<h3>`. Write for someone skimming — short paragraphs, concrete specifics (numbers, named product features, real mechanisms), not marketing fluff.
4. **FAQ section** — `<details>`/`<summary>` accordion rendering the `faqs` array, matching the exact JSX pattern in `mailbox-full/page.tsx`.
5. **CTA section** — headline with `gold-text` on the key phrase, one paragraph, two buttons: `btn-gold` primary (usually `/mailbroom/webapp/trial`), `btn-outline` secondary (usually a related content page — `/storage-costs`, `/roi`, etc.).
6. **Footer** — reuse `footer-wrap`/`footer-divider` structure verbatim from an existing page, including the Companies House registration line.

## After writing

- Add the new route to `WEBAPP_ROUTES` in `app/sitemap.ts` with a `priority` reflecting how close it is to purchase intent (problem/fix pages ~0.7, deep feature pages ~0.5-0.6) and `changeFrequency: "monthly"`.
- Link the new page from at least one existing page's footer or body copy — an orphaned page (nothing else links to it) is harder for crawlers to discover even if it's in the sitemap.
- Run `npx tsc --noEmit` before considering it done.
