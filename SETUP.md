# Growth setup

Growth is an Expo SDK 57 app for iPhone and web. The journal works locally; Strava and online food search use a small Cloudflare service.

## Run the journal

```sh
bun install --frozen-lockfile
bunx expo start --go
```

Use the existing Expo Go app for the lifting and diet interface. Press `w` for the browser. Weight, maxes, recent foods, food entries, and goals stay in SQLite on iPhone or IndexedDB in the browser. Each device/browser has its own journal. Clearing browser data or uninstalling the app can remove that journal; no cloud backup is included.

To run the exported web app and API together, without any API credentials:

```sh
bun run build:web
bun run api:migrate
bun run api:dev
```

Open `http://localhost:8787`. This serves the actual web export and the Worker from one origin. The connection screen will explain that setup is needed. No fabricated runs or food results are returned.

For Metro web development at `http://localhost:8081`, copy `.env.example` to `.env` and restart Metro. For phone testing, `localhost` is the phone itself: use the deployed HTTPS Worker origin for `EXPO_PUBLIC_API_URL`.

## 1. Create the service resources

The default host is Cloudflare Workers, D1, and Queues. Use your own Cloudflare account and check the account's current plan/usage limits before deployment.

```sh
bunx wrangler login
bunx wrangler d1 create growth-journal
bunx wrangler queues create growth-sync
bunx wrangler queues create growth-sync-failed
```

Replace the placeholder `database_id` in `server/wrangler.jsonc` with the D1 ID. Set `APP_ORIGIN` to your deployed origin, for example `https://growth-journal.YOUR-SUBDOMAIN.workers.dev`, without a trailing slash. Remove `DEV_CLIENT_ORIGIN` from production unless you actively need that local origin.

The web export is served by the same Worker. Do not change the app's web output to `server`: the API lives in `server/` and the Expo web output remains static.

## 2. Register Strava

Create an API application at [Strava API settings](https://www.strava.com/settings/api). Strava currently requires a subscription to create an application and initially allows the registering athlete in single-player mode. This app intentionally accepts only the athlete ID configured by its owner. See the [current getting-started guide](https://developers.strava.com/docs/getting-started/).

Set the Strava **Authorization Callback Domain** to your Worker hostname, without a scheme or path. The callback URL used by Growth is:

```text
https://YOUR-WORKER-HOST/api/strava/callback
```

Record the application's client ID, client secret, and your numerical athlete ID (visible in your Strava profile URL). Growth requests `activity:read` and `activity:read_all` so your private runs and activity webhooks are included. It does not request permission to create or edit activities.

## 3. Obtain a food API key

Request a free key through [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-signup/). Growth searches generic and branded foods and normalizes their nutrient and serving data. It does not use the severely limited shared `DEMO_KEY` in production.

## 4. Configure secrets

For local API work, copy `server/.dev.vars.example` to `server/.dev.vars` and fill in the values. This file is gitignored. For the deployed Worker, set each value through Wrangler's hidden prompt:

```sh
bunx wrangler secret put STRAVA_CLIENT_ID --config server/wrangler.jsonc
bunx wrangler secret put STRAVA_CLIENT_SECRET --config server/wrangler.jsonc
bunx wrangler secret put STRAVA_ATHLETE_ID --config server/wrangler.jsonc
bunx wrangler secret put USDA_API_KEY --config server/wrangler.jsonc
bunx wrangler secret put TOKEN_ENCRYPTION_KEY --config server/wrangler.jsonc
bunx wrangler secret put STRAVA_VERIFY_TOKEN --config server/wrangler.jsonc
bunx wrangler secret put WEBHOOK_PATH_SECRET --config server/wrangler.jsonc
```

Generate a separate random value for each of the last three secrets. `openssl rand -hex 32` produces the required format; `TOKEN_ENCRYPTION_KEY` must be exactly 64 hexadecimal characters. Keep these values privately. Changing the encryption key makes existing Strava tokens unreadable; disconnect existing connections before rotating it.

Never put provider secrets, refresh tokens, or the encryption key in an `EXPO_PUBLIC_` variable. The only public app configuration is the API origin.

## 5. Deploy and register the webhook

Build the web app with `EXPO_PUBLIC_API_URL` unset or empty so it uses its deployed origin. A local `.env` pointing at localhost must not be included in this build.

```sh
bun run build:web
bunx wrangler d1 migrations apply growth-journal --remote --config server/wrangler.jsonc
bunx wrangler deploy --config server/wrangler.jsonc
```

Register the Strava webhook after the Worker is live:

```sh
bun --env-file=server/.dev.vars scripts/register-strava-webhook.ts https://YOUR-WORKER-HOST
```

This script needs `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_VERIFY_TOKEN`, and `WEBHOOK_PATH_SECRET` in its environment. It checks for an existing subscription and reuses a matching callback instead of deleting anything. Strava permits one subscription per API application.

Store the subscription ID reported by the script:

```sh
bunx wrangler secret put STRAVA_SUBSCRIPTION_ID --config server/wrangler.jsonc
```

The webhook URL includes an unguessable path secret because Strava does not sign event POSTs. Growth also checks the subscription ID and athlete ID. Keep the full callback path private. Worker invocation logging is disabled to avoid recording that URL or OAuth query values; application error logs omit secrets.

Now open Running → Link Strava → Connect with Strava and authorize your account. The service imports every page of history, counts Run/TrailRun/VirtualRun activities, and displays incomplete totals while importing. Queue retries resume interrupted pages. A daily reconciliation catches missed activity edits or deletions. Disconnect removes Strava credentials, sessions, and cached runs, while leaving local journals untouched.

## 6. Test iPhone sign-in

The `growth://auth/strava` return link requires a development or production build. [Expo Go cannot test custom OAuth return schemes](https://docs.expo.dev/guides/authentication/).

Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS Worker in your EAS build environment, then:

```sh
bunx eas-cli login
bunx eas-cli build:configure
bunx eas-cli build --platform ios --profile development
bunx expo start --dev-client
```

The physical-device profile uses internal distribution and requires Apple signing and device registration. An unsigned simulator profile is also provided as `development-simulator`; it needs a Mac with full Xcode/iOS Simulator to run. No builds are submitted to the App Store automatically.

## Checks and live acceptance

```sh
bun run test
bun run lint
bun run typecheck
bun run build:web
bun run api:check
```

Automated tests use isolated local databases and mock Strava/USDA responses; they do not access your accounts. Validate the live integration after credentials are configured:

- Link, cancel, reconnect, and disconnect from both web and an iOS development build.
- Compare imported run count, distance, and weighted pace with your Strava activities; wait for the full import to finish first.
- Edit/delete a run in Strava and confirm the webhook updates Growth.
- Search a generic food and a branded food, adjust grams/servings, log meals, and revisit a past day after restarting.
- Verify that empty/unavailable nutrients show `—`, and that nutrition snapshots do not change when foods are fetched again.

Check Worker logs, `connections.sync_error`, and the `growth-sync-failed` queue if a sync stalls. The next daily reconciliation or Refresh runs resumes a pending import. Provider keys and a signed iOS development build are required for live acceptance; passing local tests alone does not verify those external connections.
