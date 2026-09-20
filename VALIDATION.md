# Validation — September 20, 2026

- 33 automated tests pass (181 assertions): local dates and periods, weight updates, max ordering, nutrition conversions and snapshots, SQLite schema migrations, IndexedDB persistence, OAuth state and cancellation, device-bound session exchange, token rotation, paginated imports, duplicate and updated webhooks, deletion, revocation, and rate-limit retries.
- ESLint and TypeScript checks pass for the app and Worker.
- Expo web export and iOS JavaScript/Hermes bundle export pass.
- Cloudflare Worker packaging passes with `wrangler deploy --dry-run`; all three D1 migrations apply locally.
- Browser checks cover navigation, weight and max logging/deletion, food search, fractional portions, gram edits, daily totals, optional goals, date navigation, persistence after reload, empty histories, responsive layouts, and modal focus wrapping/Escape dismissal.
- A real USDA search and food-detail lookup succeeded through the local Worker using USDA's public demo key. The temporary key was removed after testing. Journals contain no seeded weight, max, or meal records.

Live Strava authorization/imports/webhook delivery require the owner's provider credentials and a deployed Worker. The iOS OAuth return flow and native keyboard/layout checks still require a signed development build on an iPhone or a full Xcode simulator installation. The iOS bundle check does not replace native runtime testing. Follow [SETUP.md](./SETUP.md) for activation and the live acceptance checklist.

## Account utility acceptance

- Added tests cover legacy journal migration, persisted profile/preferences, US/metric conversions, meal/run streaks across gaps and calendar boundaries, verified registration, wrong/expired/replayed/parallel codes, both-inbox email confirmation, cancellation, password change/recovery, session revocation, profile validation, blocked origins, body limits, and mail-provider failures. All account emails in tests are mocked.
- The local Cloudflare runtime executed a deliberately invalid login and returned the expected 401, verifying scrypt works in workerd. No real account was created by this check.
- Browser checks at mobile width verified the fourth Account tab, supplied account/fire PNGs, light-theme application and persistence after reload, metric conversion of existing weight/lift displays, metric profile field labels, and Account sheet dismissal after a direct reload. Original dark appearance and US units were restored after checking.
- Final web export, iOS/Hermes bundle export, lint, TypeScript, and Worker packaging pass. Native bundle export is not an iPhone runtime test.
- Live registration/recovery/email-change delivery remains untested because `RESEND_API_KEY` and a verified `EMAIL_FROM` are not configured. No account or provider secrets were fabricated. Activate these using [SETUP.md](./SETUP.md) and complete the two-inbox and native acceptance checks before release.
