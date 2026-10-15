# TapCard — where things stand (handover, 1 Oct 2026)

Martin's notes for picking up TapCard work in Claude Code. Read this first,
then check `git log` in each repo for anything newer.

## Repos and where they live on the Mac

| What | GitHub | Mac folder | Branch to work on |
|---|---|---|---|
| Website + backend (Next.js 16 on Vercel, Neon Postgres) | dobbo22/aiert-website | `~/Desktop/ShareQuest/STA/aiert-website` | `main` (Vercel auto-deploys on push) |
| iPhone app (SwiftUI, iOS 17+) | dobbo22/TapCard2 | `~/Desktop/TapCard` | `claude/lifetime-unlock` → merge to `main` once 1.2 is approved |
| Android app (Kotlin/Compose) | dobbo22/TapCardAndroid | `~/AndroidStudioProjects/TapCardAndroid` | `claude/lifetime-unlock` → merge to `main` once released |

The tapcard.aiert.co.uk host is served by aiert-website: `proxy.ts` rewrites
`/x` → `app/tapcard/x` and `/api/x` → `app/api/tapcard/x`.

## Released (updated 12 Oct 2026)

All four are LIVE as of 12 Oct 2026: TapCard iPhone 2.2, TapCard Android 1.3.7 (22), PowerSearch iPhone 1.3 and
PowerSearch Android 1.3 (4). 2.2 / 1.3.7 added My details (notes, photo, extra phones/emails, synced to the phone contact),
Withdrawn marking, tappable extra rows on a received card, categories/#tags, offline QR, scan-to-add, in-app help +
welcome/what's-new cards, and store-button + No thanks promo cards (no X). Store text/screenshots: `AppStore/listing-2.2.md`.
12 Oct follow-up fix: scanned/incoming card screen now shows Save/send ABOVE the card (it was pushed off-screen on the Note 10). Android 1.3.8 (23) and iPhone 2.3 (21) submitted 12 Oct (the API now sends TapCard Play changes for review automatically). Google Sign-In on the Play build needed the Play app-signing SHA-1 registered as an Android OAuth client (done 12 Oct).
Google earlier rejected 1.3.6 for the Data safety form (Approximate location); fixed 11 Oct.
- Android release helper: `play/api/release-prod.js <code> <name> <notesFile> [listing.json shotsDir]` sets production to an
  already-uploaded version code (don't re-upload: "version code already used").
- iPhone release helper: `AppStore/asc/release-ios.js <appId> <version> <build> <meta.json> [shotsDir]` creates the version,
  sets text/screenshots, attaches the build and submits.
- Debug demo mode (fictional card + contacts) for screenshots: iPhone launch args `-demo -demoScreen contacts|contact|offline|help`
  (`-screenshotShare`, `-demoPromos`); Android `adb shell am start ... --ez demo true`. Debug builds only.
- **Don't accept Android Studio's AGP/Kotlin/"Daemon toolchain" upgrade prompts** before release (repo pins AGP 9.2.1,
  Kotlin 2.2.10, Gradle 9.4.1); migrating the build files is a post-release tidy-up.
- PowerSearch (separate repos, on GitHub: dobbo22/PowerSearch, dobbo22/PowerSearchAndroid): 1.3 live on both; adds the Help
  screens and visual-guide link.
- Handout page `www.aiert.co.uk/get-app`: pick iPhone/Android and an app, shows a big store QR code.
- Website guides: `tapcard.aiert.co.uk/guide`, `aiert.co.uk/powersearch#guide`, FAQ on the TapCard support page.

## Founder places + lifetime unlock (new in 1.2)

- First **1,000** people (iPhone + Android combined) are founders: sharing free for life.
- After that, sharing a card for the first time needs a one-off non-consumable unlock.
  Products (same IDs on App Store and Play):

  | Product ID | Price | From person |
  |---|---|---|
  | com.mailbroom.tapcard.lifetime1 | £0.99 | 1,001 |
  | com.mailbroom.tapcard.lifetime2 | £1.99 | 2,001 |
  | com.mailbroom.tapcard.lifetime3 | £2.99 | 3,001 |
  | com.mailbroom.tapcard.lifetime4 | £3.99 | 4,001 |
  | com.mailbroom.tapcard.lifetime5 | £4.99 | 5,001 |
  | com.mailbroom.tapcard.lifetime6 | £9.99 | 10,001 |

- Server: `lib/tapcardFounders.ts`, `app/api/tapcard/entitlement/route.ts`
  (POST from the apps on launch; GET = public free places left).
  - iPhone sends Apple's signed AppTransaction JWS (verified against Apple Root CA G3 fingerprint).
  - Android sends a random install id (backed-up prefs); max 5 new claims per IP per day.
  - Each person keeps the price current when first counted.
- iPhone: `TapCard/Services/EntitlementService.swift`, `TapCard/Views/UnlockView.swift`;
  debug launch arg `-showUnlock` shows the unlock screen (scheme has a synced `TapCard.storekit`).
- Android: `data/Entitlements.kt` (Play Billing 8.0.0), `ui/UnlockDialog.kt`.
- Unknown status (offline, Xcode build) never blocks sharing; already-shared cards keep working.
- Track invites page shows founder places left.

## Vercel environment variables (Production)

| Variable | Value / purpose |
|---|---|
| TAPCARD_APPSTORE_PROVIDER_TOKEN | 128647066 (App Store campaign links `pt=`) |
| TAPCARD_INVITE_EMAIL_VIA | `resend` — invites go from martin@aiert.co.uk via Resend while Microsoft blocks the M365 tenant |
| TAPCARD_SANDBOX_FREE_PLACES | 0 — TestFlight/App Review/debug builds see the unlock screen; real users unaffected |
| TAPCARD_PAYWALL_LAUNCH | **not set yet** — set to 1.2's release date (e.g. 2026-10-03) so earlier downloads stay founders |
| TAPCARD_PLAY_LIVE | **not set yet** — set to 1 once Google approves, so Android invite clicks go to Play |
| RESEND_WEBHOOK_SECRET | optional — enables delivered/bounced on Track invites for Resend sends |

Add with: `printf 'VALUE' | vercel env add NAME production`, then
`vercel ls --prod` and `vercel redeploy <top URL> --target production`.
Never `vercel --prod` from the Mac folder (it has personal files in it).

## Invite system (aiert.co.uk/admin/social/links)

- Tabs: **Send invites** (default), **Track invites**, **Link clicks**.
- Contacts: import iCloud .vcf or LinkedIn Connections.csv (matched by profile/unique name).
- Channels: Email (one at a time, reviewed, no daily limit), WhatsApp, LinkedIn, Messenger, copied link.
- Email template (`lib/inviteTemplates.ts`): subject `{offerSubject}` (live "Free founder place … (N left)"),
  "How you know them" dropdown (none / Westhouse / NatWest / type my own → selects the
  [personalise here…] marker in the editor), `{freeOffer}` live line, personalised card picture
  (`lib/inviteCardImage.tsx`, company logo for business domains), P.S. MailBroom/PowerSearch tracked links.
- Tracked links: `/i/<token>` (own), `/p/<token>` (pass-it-on), `/w/<token>` (Android waitlist),
  `/how-it-works`, `/android-waitlist`.
- Track invites: per medium, forwards, top spreaders, clicks vs installs, Android waitlist,
  founder places, every invite with **Reset**; Send tab has **Email bounced**.
- WhatsApp message mirrors the email (`DEFAULT_WHATSAPP_TEMPLATE`); its first link's preview
  (`app/tapcard/get/[token]` metadata) shows the recipient's own card picture.
- Clicking a contact opens an inline **details form** (name, job title, company, website,
  email, mobile, LinkedIn/X/Instagram/Facebook) → feeds the card picture (logo from website,
  "Title · Company", Follow-me icons). `details_edited`/`email_edited`/`phone_edited` keep
  edits over re-imports. To/Mobile can also be corrected in the Email/WhatsApp tabs.

## Email / Microsoft 365

- martin@mailbroom.app tenant (AIERT LTD) is on a **trial** → Microsoft blocks outbound
  (550 5.7.708) to all external domains. Converts to paid Business Standard on 4 Oct 2026.
- DNS for mailbroom.app (Vercel DNS) done: SPF, DKIM (selector1/2 CNAMEs, enabled in Defender), DMARC p=none.
- Once a plain Outlook email from martin@mailbroom.app reaches mcjdobson@btopenworld.com:
  `vercel env rm TAPCARD_INVITE_EMAIL_VIA production` + redeploy → invites go back via Outlook (Graph).

## "Back at the Mac" runbook

Done on 9-11 Oct 2026 (builds fixed, tested on simulators, released as above). Removed.

12 Oct testing round: PowerSearch Android 1.4.1 (7) set as production (fixes has:pdf/has:image/has:document, which never matched IMAP mail;
one-time in-place refresh of older stored headers via HeaderStore.attachmentScan). TapCard pages now have their own icon layout; invalid
JSON to the API returns 400 not 500. Demo cards for Sam Patel and Alex Morgan are live on the server (delete via their edit tokens if wanted).

13 Oct follow-up: PowerSearch iPhone 1.4 (16) was withdrawn from review and replaced by **1.4 (17)** (resubmitted, waiting for review) after a
watchdog crash on a large mailbox: HeaderStore decoded the whole JSON on every load()/headerCount() (now cached in memory, warmed off the main
thread), and a sync cut off by iOS suspension is now abandoned and restarted on return (AccountsViewModel.abandonInterruptedSyncs). The same
weakness exists in live 1.3 for very large accounts. Device log tip: `idevicesyslog -u <udid>` works over USB; crash reports are in
`idevicecrashreport -e -k <dir>` under Retired/.

## To do next

1. Set `TAPCARD_PAYWALL_LAUNCH` / `TAPCARD_PLAY_LIVE` if not set yet (see table above) and confirm the Resend-to-Outlook switch.
2. Optional: tracked link for a TapCard post on the MailBroom Facebook Page; "it's on Android" email to the waitlist.
3. Android store screenshots are in; a real screen-recording demo video would replace the slideshow on the landing page.

## 13 Oct 2026 (later): features added and submitted
Submitted: TapCard iPhone 2.3 (35), TapCard Android 1.3.21 (36), PowerSearch iPhone 1.4 (24), PowerSearch Android 1.4.6 (12).
New in these builds:
- Business cards (every card except "Personal") get Bookings & links rows: book a table/room/appointment, menu, order, shop, hours,
  reviews, custom rows, plus "Start from my type of business". Server: `lib/tapcardLinks.ts`, `tapcard_cards.links` (JSON text).
- Received and phone-picked contacts render as a proper TapCard; my added details are promoted into the normal tiles
  (call, email, site, directions, socials, job title in the header) with a small "A" badge and an x to remove. Long emails show the domain.
- Add from phone contacts is one at a time, uses the contact photo, offers to merge duplicates, opens the contact page.
- Enhance: TapCard row opens `powersearch://details?...`; PowerSearch reads signatures of up to 3 recent emails per address (9 total),
  on device only, hands ticked items back via `tapcard://details?ref=r:<id>|i:<id>&...` (`cancel=1` on Close). Needs PowerSearch (paid after 7 days).
- PowerSearch trial status is shared to TapCard: iPhone keychain group `ATMHQQQQ5S.com.mailbroom.shared` (entitlement in both apps);
  Android content provider `mailbroom.app.access`.
- "Report a problem with this card" with explanation (iPhone + Android).
- Helper scripts in /tmp are not kept: cancel-a-review = PATCH /v1/reviewSubmissions/<id> {canceled:true}; then `release-ios.js` re-attaches the build and submits.
- Each resubmission puts the iPhone build back in Apple's queue; batch changes before submitting.
- Website: guide (8 steps with pictures), FAQ, how-it-works and PowerSearch page updated.

## 13 Oct 2026 (evening): offers, notifications, restaurants — SUBMITTED TO PRODUCTION
**Release state (13 Oct late):** iPhone 2.5 (41) submitted to Apple for review (2.4 was pulled from review and renamed 2.5; it carries the 2.4 notes too). Android 1.3.23 (42) set as the production release (Play review). Website pages (guide, how-it-works, support), guide pictures and the restaurant demo video are LIVE. Before approval the public site describes offers the store apps don't have yet. The restaurant email must not be sent until both apps are live. Promote panel (offers + news on My Cards, friendly forms) is in 2.5 (41) / 1.3.23 (42); builds 39/40 had it under Edit card, Special offer.
- **Special offers**: `lib/tapcardOffers.ts`; `/api/tapcard/cards/[id]/offer` (PUT/DELETE with edit token), `/offer/claim`, `/api/tapcard/offer-code/[code]` (status, redeem with staff PIN), staff page `/o/<code>`. Apps: Special offer screen (card editor), Claim + one-off QR on a received card.
- **Announcements**: `/api/tapcard/cards/[id]/announcement` (one per 6 hours, 140 chars); included in the public card JSON.
- **Follow / notifications (local only)**: per business, off until switched on; types: new offers, ending soon, menu/hours/detail changes, announcements; max 2 a week per business; Mute action. iPhone `Services/UpdateNotifier.swift` (BGAppRefresh + local notifications); Android `data/UpdateNotifier.kt` (WorkManager every 3h). Followers are counted anonymously (see 14 Oct night section). Real push (APNs/FCM) NOT built: needs an Apple push key + Firebase project + privacy policy/data-safety updates.
- **Saved cards follow every change** the owner makes (website, address, links, socials, name), refreshed on the Contacts tab and when a card page opens.
- **Card-name-only cards** (restaurants): Save works with just a business name; name = company.
- **Link kinds** `tripadvisor`, `google_review`; **"Found on your website"** suggestions: `lib/siteLinks.ts` + `/api/tapcard/site-links?website=` (static HTML only; JS-only sites return little).
- **QR codes** carry the TapCard icon + "TapCard from AIERT" (error correction H): apps (share, print sign, offer, offline vCard at M) and `/get-app`.
- **Restaurant mailshot**: relationship `restaurant`; CSV import (name,email,phone,website,address,booking,menu); per-restaurant card picture (`/api/invite-card/<token>`, logo from website); email now has an offers box. Tracked like other mailshots (clicks app/how/video, delivered/bounced, unsubscribe; no opens). Do NOT send until the apps are released.
- **Demo assets**: fictional "The Olive Table" card (live on server), demo booking page `/demo/olive-table/book`, video `TapCard/AppStore/tapcard-restaurant-demo.mp4` (also `public/tapcard-guide/restaurant-demo.mp4`), guide pictures in `public/tapcard-guide/`.
- Website copy, pictures and video were pushed 13 Oct. Untracked stray files in this folder (Discord.dmg, PDFs, etc.) must never be committed.

## 14 Oct 2026: Promote subscription (replaces 2.5 / 1.3.23 in review)
- Subscription **TapCard Promote**: yearly £49.99 (`com.mailbroom.tapcard.promote.year`) and monthly £9.99 (`...promote.month`), both with a 3-month free trial; the later plan is to raise new-subscriber yearly to £99.99 with a price change (existing subscribers keep £49.99). Apple: group "TapCard Promote" (id 22474446), priced in all 175 territories from the GBP price, trial in every territory, state READY_TO_SUBMIT. Google Play: subscription `promote`, base plans `year`/`month`, offer `trial3m` (UK only so far; script `play/api/promote-sub.js`).
- App rules: an active Promote subscription/trial unlocks posting offers and news AND sharing your own card; founder places are counted at first share, not install. The paywall is enforced on the phone only; no server-side receipt check yet.
- 2.5 (offers, free) was PULLED from review so the first subscription group can ship with a new version: iPhone **2.6 (42)** prepared in App Store Connect, NOT yet submitted: Martin must add the two subscriptions to the version page (In-App Purchases and Subscriptions) and submit; Apple's API cannot attach the first subscriptions. Android production release is now **1.3.24 (43)** (replaced 1.3.23). TestFlight 2.6 (42) and Play internal 1.3.24 (43) are the test builds.
- Still to build: server-side entitlement check (App Store Server Notifications / Play RTDN), the 250 restaurant offer codes (Apple offer codes + Google promo codes) and the email link, restaurant email stays unsent until the apps are live.

## 14 Oct 2026 (later): server check, status line, restaurant codes — TEST BUILDS iPhone 3.0 (1) / Android 1.4.0 (44)
- **Server-side Promote check**: `lib/tapcardPromote.ts`, `POST /api/tapcard/cards/[id]/promote` (edit token; iPhone sends Apple's signed transaction, Android the Play purchase token; table `tapcard_promote` stores the end date). Offers and news return 402 without it **only when env `TAPCARD_PROMOTE_ENFORCE=1`** (off: turn on once the apps that send the proof are live). Android check needs the Play service account to have "View financial data, orders…" permission (currently 401); the key is in Vercel env `GOOGLE_PLAY_SA_JSON`.
- **Apps**: Promote status line ("free trial until…", "Promote is active") with Manage subscription (iPhone `AppStore.showManageSubscriptions`; Android Play subscriptions page); both send the proof to the server on load and before posting.
- **Restaurant free months**: Apple offer "Restaurant 6 months free" created on the yearly subscription (UK) but **one-time codes can only be generated once the subscriptions are approved** (max expiry 6 months ahead). Codes (Apple + Google Play promo codes) are imported at Mailshot → "Restaurant free-months codes" (`lib/promoCodes.ts`, table `tapcard_promo_codes`); each restaurant's email gets its own iPhone and Android redeem links. Restaurant email now says Promote is free for 3 months then £49.99/year (or £9.99/month); the codes box says 6 months.
- Release plan: pull 2.6 (waiting) and submit **3.0 build 1**; the subscriptions must be re-added to the draft submission in App Store Connect (subscription pages → Add for Review). Android: switch production from 1.3.24 to 1.4.0 (44).

## 14 Oct 2026 (evening): groups use TapCard for Business, not a second subscription
- Decision: a restaurant group is a TapCard for Business company (Stripe seat bands, web admin). New admin tab **Offers & numbers** (`/business/admin/promote`): per-location card views, QR scans, saves, offers claimed/used, news, post/withdraw offers and news from the web, CSV (`/api/tapcard/biz/promote`). Company cards are covered for Promote while the company's billing is `active` (`promoteStatus` returns `company: true`), so the phone shows no paywall for them. No group in-app subscription was created in the stores.
- One in-app Promote subscription covers ONE card (`tapcard_promote.original_id`); a second card is refused (409 `on_another_card`) unless it is moved, at most once every 30 days. Server limits also exist for group product ids (`promotegroup`, `promote_group`, 5 cards) but those products are NOT created. Apps (next version) show "Promote is on another card" with Move / Email us.
- Not yet released: the company-card and move/limit UI is in the repos only; the current stores builds (iPhone 3.0 (1), Android 1.4.0) don't have it.

## 14 Oct 2026 (night): follow prompt, follower count, call label, hours — in iPhone 3.0 (3) / Android 1.4.0 (46), in review
- **Follow prompt**: a business card in Contacts shows "Get offers and news from X?" above the card when not following and not yet asked (`FollowPrefs.asked`). Yes sets follow on (never automatic); Not now keeps it off. Offers/news banners also sit above the card. iPhone `FollowPrompt` in `Views/OfferViews.swift`, Android `ui/OfferUi.kt`.
- **Follower count** (count only): table `tapcard_followers (card_id, follower_hash)`; `POST /api/tapcard/cards/[id]/follow {follower, follow}` where follower is the per-install id (`DeviceIdentity.groupID` / `CardStore.groupingId`), hashed server-side. Apps report on opt-in/opt-out/mute and re-send current follows at launch. Shown in card stats (`followers` in `/stats`), "Offers & numbers" ("Following" total + per location) and the CSV. Privacy page updated. No list of people exists.
- **Phone label**: `callActionLabel`: Call me (no business links) / Call us / Call to book (menu or hours but no booking link). Web card page, iPhone `BusinessCard.callActionLabel`, Android `BusinessCard.callActionLabel`.
- **Opening hours finder**: `lib/siteLinks.ts` reads schema.org `openingHoursSpecification` from JSON-LD on the homepage (+ up to 2 same-site branch/contact pages); with the card's address (apps send `address=`), the branch with the same UK postcode is used; with no postcode only one unambiguous set is suggested. Not seen working on a real chain site yet (tested with a hand-made two-branch page).
- Chains: one card per branch under a TapCard for Business company (company billing covers Promote).
- Release state: iPhone 3.0 build 3 WAITING_FOR_REVIEW (builds 1 and 2 pulled); Android 1.4.0 (46) in Google review (needs Publish). After approval: set `TAPCARD_PROMOTE_ENFORCE=1`, generate 250 Apple codes, import Play codes, then the restaurant email.
- **Company card removal (15 Oct)**: removing a card in the admin now records it in `tapcard_removed_cards`; `GET /api/cards/<id>` answers 410 (not 404) for it and `POST /api/cards` refuses to re-create it (410). Apps check company cards on foreground (`dropCardsRemovedByCompany`): the card is removed from the phone, or, for the first two cards (Business/Personal), detached from the company and kept as an ordinary card. Before this, a removed card stayed on the phone and could be re-created by the next edit.

## Parked for later (15 Oct 2026)
- **Tripadvisor review links**: code is live (`lib/reviewLookup.ts`); needs `TRIPADVISOR_API_KEY` (Tripadvisor Content API, free tier) in Vercel (Sensitive, Production), then redeploy. Google works (`GOOGLE_PLACES_API_KEY`, Places API (New) enabled).
- **Welcome gift for followers**: offer claimable only by followers (check `tapcard_followers`), option in the Promote box, promised in the follow pop-up's "Are you sure?" step.
- **Location setup in TapCard for Business**: website/address/phone per location in the invite rows (carried in the signed invite link), a "restaurant group" template preset with those fields unlocked, then a brands layer (needs app changes).
- **Follower reach tiers** (250/500) and quoting real follower counts in the restaurant email.

## 15 Oct 2026: business free trial is 30 days
- `TRIAL_DAYS = 30` (`lib/tapcardBizBilling.ts`). Trial sign-up stores `current_period_end`; older trials fall back to created_at + 30 days (`trialEndsAt`). `isOrgActive` (billing active and trial not ended) now drives invites, Promote company cover and the admin pages; a paid band is unaffected. Admin shows "Trial ended" and the Billing tab shows "Trial ends <date>".
- Reminder: daily cron `/api/cron/biz-trial-reminders` (vercel.json, 08:00) emails the company's admins once, 3 days before the trial ends (`trial_reminded_at`).
- Decided: Promote company cover for a trial company ends with the trial. Still to decide: per-location price for restaurant groups (bands are £20/£40/£70/£120 a year per 10/25/50/100 people, which undercuts single-card Promote at £49.99).

## 15 Oct 2026: company cards post offers only when the admin ticks them
- `tapcard_cards.org_can_post` (default false); `cardMayPost` in `lib/tapcardBiz.ts`. Offer and announcement PUT/DELETE return 403 `{code:"admin_only"}` for a company card that isn't ticked; cards with no company (a single business) can always post. The admin ticks "Can post offers" per card on the Employees tab (`PostToggle`, `PUT /api/tapcard/biz/cards/[id]/post`) and can always post for any location from "Offers & numbers" (admin session, not affected). `GET /cards/[id]/promote` now also returns `canPost`.
- Confirming a customer's code is web-only and needs no app or login: the QR opens `tapcard.aiert.co.uk/o/<code>` (any phone camera) where staff enter the offer's staff PIN and tap Mark as used; tills type the code at `/redeem`. Documented in the Business guide (new section) and the TapCard guide (step 6).
- **Superseded (same day): "Can post for".** The admin marks shop cards ("This card is a shop / location" -> `card_kind='business'`) and ticks, per card, which shops its owner may post for (`org_posts_for`; `posterMayPostFor`, `postTargetsFor` in `lib/tapcardBiz.ts`; `authorizePoster` in `lib/tapcardPost.ts`). A staff phone posts with ITS OWN edit token plus header `X-TapCard-Poster: <its card id>` to `/api/tapcard/cards/<shop id>/offer|announcement`; a shop's own phone posts for itself only if it is in its own list (or the legacy `org_can_post`). `GET /cards/<id>/promote` returns `postsFor: [{id,name}]`.
- **One live offer per shop**: `tapcard_offers.posted_by` (card id, or "admin" for web admin posts). `offerLock`: the poster can change or withdraw it that UK calendar day (409 `offer_locked` for anyone else); the next day anyone allowed can replace it; the web admin always can. News keeps its 6-hour gap.
- Apps still need (next build): hide the Promote composer on a company card with an empty `postsFor`, and for a staff card show "Post for: <shop>" and send `X-TapCard-Poster`. Until then staff can only post from the web admin or from the shop's own phone.
