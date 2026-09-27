# Growth App Store submission packet

This document prepares the information that can be completed before Apple Developer Program access is active. Verify every statement against the release build and production service before submitting it to Apple.

## Current release configuration

- App name: Growth
- Version: 1.0.0
- Bundle ID: `com.timempey.growth`
- Expo owner: `empey`
- EAS project ID: `f13d7bc4-9adc-41c6-a747-9028cc143770`
- Primary category: Health & Fitness
- Price: Free
- Platforms for the first release: iPhone
- Privacy policy URL after deployment: `https://growth-journal.tlegeneral.workers.dev/privacy`
- Support URL after deployment: `https://growth-journal.tlegeneral.workers.dev/support`
- Copyright: `2026 TimothyEmpey`
- Export compliance: the app declares that it uses no non-exempt encryption. Confirm this remains accurate before every release.

## Information still requiring the owner

Do not submit until these are supplied and verified:

- Active Apple Developer Program membership and accepted agreements
- App Store Connect app record and final availability regions
- App Review contact name, phone number, and email address
- Any legally required public address or trader information
- A dedicated, non-expiring reviewer account and password
- Confirmation that `tlegeneral@proton.me` is the intended public support and privacy contact
- Final app name availability; choose a distinct subtitle or alternate name if App Store Connect rejects `Growth`

## Metadata draft

### Name

Growth

### Subtitle

Lifting, runs & nutrition

### Promotional text

Track strength, miles, meals, nutrition, and daily consistency in one focused personal journal.

### Description

Growth brings your lifting, running, nutrition, and body-weight history together in one focused journal.

Record weigh-ins and see your progress over time. Keep dated personal records for every lift, including complete history when a newer performance replaces the current one.

Connect a personal Strava account to import running, trail-running, virtual-running, and hiking activities. Review distance, moving time, pace, elevation, heart rate, and splits when available.

Build a daily food journal for breakfast, lunch, dinner, and snacks. Search FatSecret, scan barcodes through Open Food Facts, adjust servings and quantities, and review calories, protein, carbohydrates, and fat. Saved nutrition snapshots keep past journal entries stable.

Growth also includes optional nutrition goals, activity streaks, unit preferences, appearance themes, and cross-device synchronization through a verified Growth account. The core lifting and diet journal can be used locally without creating an account.

Growth is a personal fitness journal and does not provide medical diagnosis or individualized medical advice.

### Keywords

fitness,journal,lifting,running,Strava,nutrition,macros,weight,workout,food

### Category and rating

- Primary category: Health & Fitness
- Secondary category: leave blank unless a clear second category is justified
- Expected age rating: complete Apple’s questionnaire factually; the current app contains no violence, gambling, sexual content, unrestricted web browsing, or user-to-user communication
- Regulated Medical Device status: expected to be “not a regulated medical device”; confirm based on the final product and marketing claims

## App Privacy worksheet

Select **Yes, data is collected** because signed-in journals and connected runs are transmitted off-device. The following is the expected disclosure for the current release. Re-evaluate it if analytics, advertising, crash reporting, payments, HealthKit, or another SDK is added.

| Apple data type    | Examples in Growth                                                                                              | Linked to identity                 | Tracking | Purpose                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------- | ------------------------------------- |
| Name               | Account/profile name                                                                                            | Yes when signed in                 | No       | App functionality                     |
| Email Address      | Login and verification email                                                                                    | Yes                                | No       | App functionality, account management |
| User ID            | Growth account ID and Strava athlete association                                                                | Yes                                | No       | App functionality, security           |
| Health             | Height, body weight, nutrition, meals, dietary goals                                                            | Yes when synchronized              | No       | App functionality                     |
| Fitness            | Runs, pace, heart rate, lifting records, exercise history                                                       | Yes when synchronized or connected | No       | App functionality                     |
| Other User Content | Custom exercise names and journal content, if Apple’s questionnaire does not classify them under Health/Fitness | Yes when synchronized              | No       | App functionality                     |

Current code does not use data for third-party advertising, developer advertising, cross-app tracking, or data-broker sharing. Typed food search terms are sent to FatSecret; barcode identifiers are sent to Open Food Facts. Resend receives email addresses and verification-message content. Cloudflare processes and stores account/service data. Strava provides connected activity data after explicit authorization.

## App Review notes draft

Growth is a personal fitness journal with four tabs: Lifting, Running, Diet, and Account.

The lifting and diet journal can be used without signing in. Sign-in enables cross-device journal synchronization. The supplied reviewer account contains representative journal data and imported run history so the Running experience can be reviewed without authorizing the reviewer’s personal Strava account.

Reviewer path:

1. Sign in from Account using the credentials supplied in App Review Information.
2. Open Lifting to inspect weight history and dated lifting records.
3. Open Running to inspect imported runs, summaries, and run details.
4. Open Diet to inspect daily meal entries, nutrition totals, goals, and food search.
5. Open Account to inspect profile, preferences, themes, synchronization status, Privacy policy, and Support.
6. Account deletion is available at Account → Edit profile → Delete account. It requires the current password and permanently deletes the account, synchronized journal, sessions, Strava connection, and cached imported runs.
7. Strava can be disconnected from Running → Link Strava. Disconnecting removes cached runs from Growth but does not delete activities from Strava.

Production API: `https://growth-journal.tlegeneral.workers.dev`

Add any temporary review-specific service conditions here before submission. Never place production provider secrets or private encryption keys in review notes.

## Screenshot plan

Capture screenshots from the signed production or TestFlight build on a supported large iPhone size. Use real-looking reviewer fixtures without personal information.

1. Lifting overview with populated weight chart and current maxes
2. Weight history or a lifting-record history sheet
3. Running overview with totals and several imported runs
4. Run details with pace, elevation, heart rate, and splits
5. Diet daily nutrition summary with populated meals
6. Food details or food search with serving controls
7. Account page showing activity streak and personalization
8. Appearance or preferences page showing customization

Use one consistent theme and status-bar treatment. Avoid empty states, debug UI, real email addresses, or provider credentials in product-page screenshots.

## TestFlight and release checklist

### Can be completed before Apple approval

- [x] Stable privacy and support routes exist in the app and web export
- [x] In-app links expose Privacy policy and Support from Account
- [x] In-app account deletion exists and revokes the connected Strava grant
- [x] Bundle ID, app scheme, icon, version, and EAS project are configured
- [x] Production builds auto-increment the build number
- [x] `ITSAppUsesNonExemptEncryption` is generated as false through Expo configuration
- [ ] Deploy the privacy and support routes before entering their URLs in App Store Connect
- [ ] Confirm the public support email and add any legally required address or phone information
- [ ] Create polished, non-personal screenshot fixture data
- [ ] Obtain sufficient Strava athlete capacity and complete Strava branding review before broad public release

### Requires Apple Developer access

- [ ] Confirm the paid membership is active and accept current agreements
- [ ] Create the App Store Connect record for `com.timempey.growth`
- [ ] Complete category, age rating, regulated-device, content-rights, DSA, pricing, and availability questions
- [ ] Publish the App Privacy answers and privacy-policy URL
- [ ] Add description, keywords, subtitle, screenshots, support URL, copyright, and review contact
- [ ] Create Apple distribution credentials through EAS
- [ ] Build the production iOS binary with the production API environment
- [ ] Upload the build to App Store Connect and complete export-compliance processing
- [ ] Add internal TestFlight testers, then submit for external beta review if external testing is desired
- [ ] Provide the non-expiring reviewer account and final review notes

### Production acceptance before App Review

- [ ] Register, verify, sign out, and sign back in on a physical iPhone using real email delivery
- [ ] Recover a password and complete an email change with two inboxes
- [ ] Link, cancel, refresh, reconnect, and disconnect Strava through the native OAuth return flow
- [ ] Compare imported run totals and details with the source Strava account
- [ ] Search generic and branded foods and revisit saved meals after restarting
- [ ] Verify offline edits, cross-device merge, and synchronization recovery
- [ ] Delete a dedicated test account and verify account, journal, sessions, connection, and runs are gone
- [ ] Test keyboard handling, sheets, gestures, themes, safe areas, accessibility labels, and Dynamic Type on-device
- [ ] Verify the live privacy and support URLs, backend health, remote migrations, queues, webhook, and email sender
- [ ] Run tests, lint, typecheck, Expo Doctor, production web export, iOS export, and Worker dry-run from the release commit

## Public-launch constraints outside Apple

The first public release also depends on the external services Growth uses:

- Strava must permit enough connected athletes for the intended rollout. Its athlete capacity is separate from API rate limits.
- Strava connection UI and attribution must follow current Strava brand guidelines.
- Strava credentials/webhook, FatSecret client credentials, token-encryption key, Resend sender, and Cloudflare resources must remain configured. Open Food Facts does not require an API key for barcode read requests.
- Include `Powered by fatsecret nutrition API (www.fatsecret.com)` in the App Store description as required by FatSecret's attribution policy.
- Remove `DEV_CLIENT_ORIGIN` from production Cloudflare configuration when local native development no longer needs production CORS access.
