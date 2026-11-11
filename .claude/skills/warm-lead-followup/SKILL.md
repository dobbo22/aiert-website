---
name: warm-lead-followup
description: Turn new LinkedIn warm leads (people who reacted to or commented on the AIERT/TapCard page) into a short, honest list of who to approach and a connection note and follow-up for each. Use when Martin asks who engaged, who to connect with, or for follow-ups to LinkedIn leads.
---

# Warm-lead follow-up

LinkedIn's API has no connection requests or messages for us, so Martin approaches people himself. This skill prepares that, it never contacts anyone.

## Where the data is
- Admin page `/admin/social/linkedin` (top): leads, status (new / contacted / ignore), connection note, mentions. Code: `lib/linkedinEngagement.ts`, tables `linkedin_people`, `linkedin_engagement`, `linkedin_mentions`.
- Read the tables read-only (neonctl `backup_reader`, see the live-database memory note; never print the connection string). The daily cron runs about 07:30; Martin can press Scan now (limited to every 30 minutes, LinkedIn allows about 100 calls a day).
- Personal-profile posts cannot be seen by the API, and a mention does not say who made it.

## Steps
1. List leads with status `new`, newest and highest score first (a comment counts 3, a reaction 1).
2. Triage each from the headline and what they did. Mark as probably irrelevant: competitors or tool vendors (for example founders building a similar "operating system for small businesses"), sales people fishing for a freebie, recruiters, and people with no headline. Say why in one line each. Martin decides.
3. For the keepers, write per person:
   - one line on who they are and what they did (quote a comment if they wrote one);
   - the connection note (about 200 characters, thanks for the specific thing they did, one line on TapCard, no link, no pitch);
   - a follow-up for AFTER they accept: two or three sentences, a question about their business, the 3-month Promote trial only if they run a local business.
4. Hospitality, retail and local-service owners go first: they are the customers. Everyone else is for reach, not selling.
5. Give Martin the list. When he says who he has contacted or rejected, tell him to press Mark contacted or Not relevant on the page (the page is the record; you cannot write to the production database).

## Rules
- Wording: never "free app"; say the first 3 months of Promote are free, then £49.99 a year or £9.99 a month. Never "no app needed" without the caveat.
- Be honest in notes: thank them for what they actually did, never imply we know more about them.
- Comment on other people's posts (page tool, one per post, five a day, no links) is a separate tool on the same page.
