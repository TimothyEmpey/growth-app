# Validation — September 20, 2026

- 20 automated tests pass (93 assertions): local dates and periods, weight updates, max ordering, nutrition conversions and snapshots, SQLite schema migrations, IndexedDB persistence, OAuth state and cancellation, device-bound session exchange, token rotation, paginated imports, duplicate and updated webhooks, deletion, revocation, and rate-limit retries.
- ESLint and TypeScript checks pass for the app and Worker.
- Expo web export and iOS JavaScript/Hermes bundle export pass.
- Cloudflare Worker packaging passes with `wrangler deploy --dry-run`; both D1 migrations apply locally.
- Browser checks cover navigation, weight and max logging/deletion, food search, fractional portions, gram edits, daily totals, optional goals, date navigation, persistence after reload, empty histories, responsive layouts, and modal focus wrapping/Escape dismissal.
- A real USDA search and food-detail lookup succeeded through the local Worker using USDA's public demo key. The temporary key was removed after testing. Journals contain no seeded weight, max, or meal records.

Live Strava authorization/imports/webhook delivery require the owner's provider credentials and a deployed Worker. The iOS OAuth return flow and native keyboard/layout checks still require a signed development build on an iPhone or a full Xcode simulator installation. The iOS bundle check does not replace native runtime testing. Follow [SETUP.md](./SETUP.md) for activation and the live acceptance checklist.
