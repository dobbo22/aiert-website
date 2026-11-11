---
name: pub-pitch
description: Pitch TapCard to a pub, restaurant, cafe or group that Martin has met or found: build a live sample card with their own details, take phone screenshots, write the email as an Outlook draft, then clean up. Use when Martin names a venue or contact to pitch, or asks to follow up a pitch.
---

# TapCard pitch to a venue

The point of each pitch email is that the recipient sees THEIR OWN card (logo, hours, an offer), not the Olive Table demo. Martin sends; you never send the email yourself.

## Rules (from Martin)
- Lead with followers: the QR code in the venue creates followers, and followers need the TapCard app to get news and offers (without it they can only view and save the contact). Never say "free app". Never say "no app needed" without saying what they can't do.
- Pricing, accurately: Promote is free for the first 3 months, then £49.99 a year or £9.99 a month. Groups: TapCard for Business, per location a year plus VAT, UK only (£42 for 2-4, £34 for 5-19, £27 for 20-100). Check `TAPCARD_STATUS.md` before quoting, prices change.
- Never use one prospect's branding or name in another's email (neighbours especially).
- Emails carry no tracking (plain tapcard.aiert.co.uk links). Tracked sends belong to the Marketing mailshot system, not here.
- Pitches go out from Martin's own mailbox (Outlook for martin@aiert.co.uk; the btopenworld address if Outlook's Outbox is stuck). Do not mail from the M365 mailbroom.app tenant.
- Never reuse a card id after its web link has been sent to a prospect.
- Simulator only for UI work, never UI tests on Martin's real phone (they wiped his real cards once).

## Recipe
1. Get: venue name, contact name and role, their address/website, whether it is a single site or a group, whether approval above the contact is needed. Check memory for earlier contact with them before writing.
2. Create the sample card: `POST /api/cards` with a random Bearer edit token (the response gives the id). Use their real name, address, hours and website so it looks like theirs.
3. Give it Promote for 14 days: Martin runs a `tapcard_promote_grants` insert in Neon (you have read-only access only; give him the exact SQL).
4. Add one realistic offer and one news item: `PUT /api/tapcard/cards/<id>/offer` and `/announcement` with the token.
5. Screenshots: iPhone simulator debug build with launch args (`-demo`, `-demoRestaurant <id> <token>`, `-demoScreen offer <id> [-claim]`, `-noFollowPopup`, `-skipPaywall`), then `xcrun simctl io <sim> screenshot`, resize with `sips`. Debug seed flags that hold real business names must never be committed.
6. Write the email: short, plain, their card as the hero, a link to the live sample web card, the follower point, the 3 months, one clear next step. Group venues: pitch TapCard for Business per location.
7. Build it as an Outlook draft (a `.eml` with `X-Unsent: 1` and inline cid images, opened with `open -a "Microsoft Outlook"`, or an AppleScript draft). Leave To blank if the address is unconfirmed. Tell Martin what to check, then stop.
8. Log the pitch in memory: who, when, which card id, follow-up date (about a week).
9. After the pitch is done or the lead is dead, clean up: `DELETE /api/cards/<id>` with the token, then give Martin the SQL for leftovers in `tapcard_offer_claims` (by offer_id), `tapcard_offers`, `tapcard_announcements`, `tapcard_followers`, `tapcard_card_installs`, `tapcard_push_prefs`, `tapcard_promote_grants` (by card_id). Verify with a read-only count of 0.

## Replies and follow-ups
Check martin@aiert.co.uk via the read-only Graph mailbox (see the aiert-mailbox memory note) and the btopenworld mailbox narrowly by sender or subject (it holds personal mail: never list it broadly). Follow-up drafts are created as unsent replies, never sent.
