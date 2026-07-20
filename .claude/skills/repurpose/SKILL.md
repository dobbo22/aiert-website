---
name: repurpose
description: Turn an already-published MailBroom answer-page into a LinkedIn post and a short prospect email, reusing the page's actual content and voice instead of writing generic distribution copy from scratch. Use right after publishing a new answer-page, or on request for any existing one.
---

# Repurposing a published page

## Input needed

The path to an already-published page under `app/mailbroom/webapp/` (e.g. `app/mailbroom/webapp/employee-offboarding/page.tsx`). Read the whole file first — the hero paragraph, every section heading, and the full `faqs` array. Don't work from a summary or from memory of the topic; the specific numbers and mechanisms in that page are what make the repurposed copy worth reading instead of generic.

## Voice constraints (both outputs)

Match the page's own voice, not generic marketing copy:
- Direct and concrete — cites a real number, stage, or mechanism from the page, not a vague benefit ("saves time" is not enough; "639 hours per 50 employees" is)
- Never uses hype language — no "game-changing," "revolutionary," "seamless," "unlock," "supercharge"
- Short sentences. No corporate "we're excited to announce" framing.

## Output 1 — LinkedIn post

- 80–150 words, first person as Martin Dobson (founder), not third-person "AIERT Ltd announces..."
- Opens with the same pain point as the page's `<h1>` — restate it as a hook, don't soften it into a question if the page states it directly
- Includes exactly one concrete detail pulled from the page's content sections (a number, a named mechanism, a specific stage) as proof this isn't a generic post
- Ends with the page's full URL as the only link
- At most one CTA, at most 2–3 hashtags only if genuinely relevant (no hashtag stuffing)

## Output 2 — Prospect email

- Subject line: phrase it as the page's core FAQ question (the first item in its `faqs` array), not a company-name-first subject
- 100–150 word body, same voice constraints as above
- One link to the page itself, one link to `/mailbroom/webapp/trial`
- Closes with a real signoff — "Martin Dobson, Founder, MailBroom" — not "The AIERT Team" or similar

## Output format

Produce both as plain text, ready to paste directly into LinkedIn or an email client — LinkedIn post first, then the email (subject line, then body). No markdown headers or extra commentary mixed into the actual copy; keep any notes to the user clearly separated before or after the two blocks.
