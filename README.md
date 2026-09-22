# Growth

A personal fitness journal for iPhone and web, built with Expo SDK 57, React Native, and TypeScript.

- **Lifting:** dated weigh-ins, an interactive weight chart, and current lifting maxes with editable history.
- **Running:** Strava authorization, automatic run imports, date-range summaries, run details, and mile splits.
- **Diet:** daily meal journals, USDA food search, portion scaling, nutrition snapshots, and optional goals.
- **Account:** profile/body details, verified email/password accounts, cross-device journal sync, daily activity streaks, light/dark/system appearance, US/metric units, default chart period, and a preferred starting page.

The interface defaults to dark charcoal with blue accents, with light and system appearance options. Journals start empty and remain available locally in SQLite on iPhone and IndexedDB on web. Signing in synchronizes journal data and preferences through the account's cloud record.

## Start

```sh
bun install --frozen-lockfile
bunx expo start --go
```

The local journal needs no account. Strava, online food search, account verification, and cross-device sync require the Cloudflare service and the relevant provider credentials. Account verification uses Resend. Follow [SETUP.md](./SETUP.md) for local API development, deployment, Strava/USDA configuration, and iOS development builds.

See [docs/DATABASE.md](./docs/DATABASE.md) for the current D1 relationship chart, table reference, migration policy, and expansion path.

## Project structure

| Directory        | Purpose                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `src/app`        | Four tab pages and shared logging/detail sheets                             |
| `src/components` | Shared UI, chart, date controls, platform navigation                        |
| `src/domain`     | Types, date logic, nutrition calculations, journal validation               |
| `src/data`       | SQLite/IndexedDB adapters, serialized local writes, and sync metadata       |
| `src/services`   | API clients, journal synchronization, and secure platform-specific sessions |
| `server`         | Cloudflare Worker, D1 migrations, OAuth, queue sync, USDA proxy             |
| `tests`          | Domain, persistence, and integration tests using isolated data              |

```sh
bun run test
bun run lint
bun run typecheck
bun run build:web
bun run api:check
```

Local tests mock external providers. Live Strava/USDA acceptance and iOS OAuth must be completed with configured credentials and a development build as described in the setup guide.
