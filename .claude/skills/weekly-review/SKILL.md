---
name: weekly-review
description: Weekly growth review for TapCard: pull LinkedIn, Facebook, email campaign, app and website numbers into one short report with what changed and what to do next. Use when Martin asks how marketing is going, for a weekly review, or around the planned check dates for a campaign.
---

# Weekly growth review

Short and comparative. Every number is "this week vs last week", with one sentence on what it means and a maximum of three actions. Do not pad.

## Sources (all read-only; never print secrets; never `vercel env pull`)
- **Live app data**: neonctl read-only `backup_reader` on the invites database (see the live-database memory note). New cards in the period, cards with a website/links/photo/LinkedIn added, `tapcard_card_recipients` (cards sent on), `tapcard_followers`, offers and news posted, funnel steps. Compare the campaign groups below.
- **Email campaigns**: `app_user_email_log` (campaign `finish-your-card-2026-11` = 24 company-domain users sent 2026-11-09, `finish-your-card-2026-11-private` = 75 private-address users sent 2026-11-10). For each recipient group: how many changed their card since the send (compare the card to its state at the send: missing items in `missingOf`, `lib/appUserCampaign.ts`), sent it to anyone, gained followers. Bounces and complaints are only visible in the Resend dashboard (resend.com/emails): ask Martin to read the numbers off it. Replies: read martin@aiert.co.uk via the Graph mailbox (inbox and junk) from the aiert-mailbox memory note.
- **LinkedIn**: the admin LinkedIn tab (`/admin/social/linkedin`) or `lib/linkedinStats.ts`: page overview (followers, demographics), per-post impressions/reactions/comments, new warm leads, mentions. Note the Development Tier call limit (about 100 a day): do not rescan repeatedly.
- **Facebook**: Page insights via Graph API (reach, engagements, follows, page views) with the Page token from the facebook memory note.
- **Website/search**: `https://www.aiert.co.uk/admin/social/numbers` (needs Martin's admin login: ask him for the figures if you cannot read it), tracked link clicks by source, and the Search Console tools (`mcp__gsc__*`) for tapcard.aiert.co.uk.
- **Mailshot** (restaurants): `/admin/marketing/restaurants` results, if a batch went out.

## Output
1. Headline: one sentence on whether growth is moving.
2. A small table: metric, this week, last week, change (LinkedIn followers and impressions, Facebook reach, new TapCard cards, cards sent on, followers gained, email replies/bounces, link clicks by source, new warm leads).
3. What worked and what did not, with the evidence.
4. At most three actions, each concrete (for example "follow up the 62 private-address recipients who changed nothing, draft ready").
5. Open items carried forward (pending approvals, tokens expiring: LinkedIn token about 2027-01-08, review dates).

Then update ONE memory note (`project_weekly_snapshot`) with this week's key numbers so next week's comparison has a baseline. Do not create a new note each week.
