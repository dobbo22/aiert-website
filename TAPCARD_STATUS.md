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
- **Android 1.2 (8)** (Billing 8.0.0) built and tested in the emulator; Google Play listing still awaiting Google's approval.
  Branch also has the Play Console recommendation fixes (no deprecated bar colours, no portrait
  lock, downsampled bitmaps, card centred in landscape). The remaining "deprecated edge-to-edge
  APIs" warning comes from AndroidX's own enableEdgeToEdge() and can be ignored.
  **Don't accept Android Studio's AGP/Kotlin/"Daemon toolchain" upgrade prompts** before release —
  the newer AGP turns the old `android {}` / `kotlinOptions` build DSL into errors (repo pins
  AGP 9.2.1, Kotlin 2.2.10, Gradle 9.4.1). Migrating the build files is a post-release tidy-up.

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

## "Back at the Mac" runbook (added 9 Oct 2026)

If Martin says **"back at Mac in VS Code, run everything"**, do the steps below in order,
without asking again for anything already decided here. Stop and ask only where a step says so.

Work waiting to be built and tested. It was **merged into `main` on 9 Oct 2026** in both app repos
(Martin approved) but has **never been compiled or run**, because it was written in a cloud session
with no Xcode or Android SDK:

| Repo | Branch | What it is |
|---|---|---|
| TapCard2 (iPhone) | `claude/promo-no-thanks` | "No thanks" on the MailBroom/PowerSearch promos hides them for good (`CrossPromoCard.swift`). The ✕ still hides for 24h. |
| TapCard2 (iPhone) | `claude/print-qr-sign` | "Print QR sign" on the share screen (`PrintSignView.swift`, `CardDisplayView.swift`). |
| TapCardAndroid | `claude/promo-no-thanks` | Same "No thanks" (`ui/Promos.kt`, `data/CardStore.kt`). |
| TapCardAndroid | `claude/print-qr-sign` | Same print sign (`ui/PrintSign.kt`, `ui/CardsScreen.kt`, adds `androidx.print:print:1.0.0`). |

The branches merged cleanly. Expect compile errors on first build and fix them on `main`.
The website side (landing page at tapcard.aiert.co.uk, store badges on aiert.co.uk) is already live.

Why: people tapped the MailBroom/PowerSearch promos, saw those apps' in-app purchases on the
App Store page and thought TapCard itself had a paywall. The print sign is a poster for a
reception desk, till or window. A scan opens the card itself, so a public sign should use a
**separate card** with only the details wanted. The sheet has a "Make a separate card" button.

### Steps

1. `git pull origin main` in both app repos (the branches are already merged) and build.
   - iPhone: `xcodebuild -scheme TapCard -destination 'generic/platform=iOS Simulator' build`,
     then run in the simulator. Check the promo "No thanks" and Print QR sign (preview, switches,
     Print, Save as PDF, "Make a separate card").
   - Android: `./gradlew assembleDebug`, then run in the emulator and check the same things.
   - Fix any compile errors. They are expected: none of this has been built.
2. **Ask Martin:** should the promo ✕ also hide for good? (Currently ✕ = 24 hours, "No thanks" = forever.)
3. (Done: branches are merged into `main`. After any build fixes, commit and push them to `main`.)
4. Bump build numbers by one.
   - iPhone is **2.0 (12)** in `TapCard.xcodeproj/project.pbxproj`. **Do not run `xcodegen`:**
     `project.yml` is stale (1.1 / 9), so regenerating would reset the version and drop hand edits.
     `PrintSignView.swift` was added to the `.pbxproj` by hand. If Xcode shows it missing, add it
     to the Views group in Xcode.
   - Android is **1.3.1 (versionCode 13)** in `app/build.gradle.kts`.
5. Build for the stores.
   - iPhone: archive and export with `AppStore/ExportOptions.plist`, signing with the App Store
     Connect API key (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_FILEPATH` in the environment). Upload to TestFlight.
     `AppStore/asc/build.js` has the old 1.0 version id hard-coded, so update it before using it.
   - Android: `./gradlew bundleRelease` (signs with `keystore.properties`), then upload the AAB to
     the **internal** track using `play/api/play.js` and the publisher service account.
     `play/api/play-upload.js` points at `TapCard-1.0-1.aab`, so update it first.
   - If the App Store Connect / Play Console MCP connections are available in the session, prefer them.
6. **Do not submit for App Review or promote to production** without Martin saying so. Stop at
   TestFlight and the internal track, tell him the build numbers, and ask.

### Mac must stay awake and unlocked-enough for this
Sleep off and plugged in. Keychain not set to lock, and `codesign` set to "Always Allow". Run in
tmux with `caffeinate -dimsu`. Never ask for or store Martin's login password: it cannot be typed
at the lock screen and must not go in a `.env`.

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
