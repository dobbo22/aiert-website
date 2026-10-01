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

## Released / in review

- **iPhone 1.1 (10)** live on the App Store (app id 6816003159, bundle `com.mailbroom.tapcard`).
- **iPhone 1.2 (11)** submitted for review with six in-app purchases (below).
- **Android 1.2 (7)** built and tested in the emulator; Google Play listing still awaiting Google's approval.

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
- Android: `data/Entitlements.kt` (Play Billing 7.1.1), `ui/UnlockDialog.kt`.
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

## Email / Microsoft 365

- martin@mailbroom.app tenant (AIERT LTD) is on a **trial** → Microsoft blocks outbound
  (550 5.7.708) to all external domains. Converts to paid Business Standard on 4 Oct 2026.
- DNS for mailbroom.app (Vercel DNS) done: SPF, DKIM (selector1/2 CNAMEs, enabled in Defender), DMARC p=none.
- Once a plain Outlook email from martin@mailbroom.app reaches mcjdobson@btopenworld.com:
  `vercel env rm TAPCARD_INVITE_EMAIL_VIA production` + redeploy → invites go back via Outlook (Graph).

## To do next

1. When Apple approves iPhone 1.2: set TAPCARD_PAYWALL_LAUNCH, redeploy, merge TapCard2
   `claude/lifetime-unlock` → `main`, check "Founder #1" in the app and the count on Track invites.
   Update App Store privacy answers if not done.
2. When Google approves Android: signed bundle → Internal testing, create the six products
   in Play Console (Monetize → Products → In-app products), payments profile, Data safety
   (Device or other IDs; Purchase history), set TAPCARD_PLAY_LIVE=1, merge Android branch.
3. After 4 Oct: confirm Outlook sending works, switch invites back from Resend.
4. Optional: tracked link for a TapCard post on the MailBroom Facebook Page; "it's on Android"
   email to the waitlist when Play goes live.
