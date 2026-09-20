# Growth

A personal fitness journal for iPhone and web, built with Expo SDK 57, React Native, and TypeScript.

- **Lifting:** dated weigh-ins, an interactive weight chart, and current lifting maxes with editable history.
- **Running:** Strava authorization, automatic run imports, date-range summaries, run details, and mile splits.
- **Diet:** daily meal journals, USDA food search, portion scaling, nutrition snapshots, and optional goals.

The interface uses a dark charcoal theme with blue accents. Journals start empty. Local records stay in SQLite on iPhone and IndexedDB on web; phone and browser journals do not sync.

## Start

```sh
bun install --frozen-lockfile
bunx expo start --go
```

The local journal needs no account. Strava and online food search require the Cloudflare service and provider credentials. Follow [SETUP.md](./SETUP.md) for local API development, deployment, Strava/USDA configuration, and iOS development builds.

## Project structure

| Directory | Purpose |
| --- | --- |
| `src/app` | Three tab pages and shared logging/detail sheets |
| `src/components` | Shared UI, chart, date controls, platform navigation |
| `src/domain` | Types, date logic, nutrition calculations, journal validation |
| `src/data` | SQLite/IndexedDB adapters and serialized local writes |
| `src/services` | API client and secure platform-specific Strava sessions |
| `server` | Cloudflare Worker, D1 migrations, OAuth, queue sync, USDA proxy |
| `tests` | Domain, persistence, and integration tests using isolated data |

```sh
bun run test
bun run lint
bun run typecheck
bun run build:web
bun run api:check
```

Local tests mock external providers. Live Strava/USDA acceptance and iOS OAuth must be completed with configured credentials and a development build as described in the setup guide.
