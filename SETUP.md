# Growth setup

Growth is an Expo SDK 57 app for iPhone and web. The journal works locally; Strava and online food search use a small Cloudflare service.

## Run the journal

```sh
bun install --frozen-lockfile
bunx expo start --go
```

Use the existing Expo Go app for the lifting and diet interface. Press `w` for the browser. Weight, maxes, recent foods, food entries, and goals stay in SQLite on iPhone or IndexedDB in the browser. Before sign-in, each device/browser has its own journal. Once a user signs in, Growth synchronizes the journal through the configured Worker and D1 database.

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

Create one API application at [Strava API settings](https://www.strava.com/settings/api). Its client credentials configure the Growth service; each signed-in Growth user then authorizes and links their own Strava account. Strava currently requires a subscription to create an application and initially allows the registering athlete in single-player mode. Request expanded access from Strava before inviting more athletes than the application's current limit. See the [current getting-started guide](https://developers.strava.com/docs/getting-started/).

Set the Strava **Authorization Callback Domain** to your Worker hostname, without a scheme or path. The callback URL used by Growth is:

```text
https://YOUR-WORKER-HOST/api/strava/callback
```

Record the application's client ID and client secret. Growth requests `activity:read` and `activity:read_all` so each user's private runs and activity webhooks are included. It does not request permission to create or edit activities. Provider tokens are encrypted and stored per Growth account; signing out does not disconnect Strava, so the connection and imported runs remain available when that Growth account signs in on another device.

## 3. Obtain a food API key

Request a free key through [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-signup/). Growth searches generic and branded foods and normalizes their nutrient and serving data. It does not use the severely limited shared `DEMO_KEY` in production.

## 4. Configure secrets

For local API work, copy `server/.dev.vars.example` to `server/.dev.vars` and fill in the values. This file is gitignored. For the deployed Worker, set each value through Wrangler's hidden prompt:

```sh
bunx wrangler secret put STRAVA_CLIENT_ID --config server/wrangler.jsonc
bunx wrangler secret put STRAVA_CLIENT_SECRET --config server/wrangler.jsonc
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

The webhook URL includes an unguessable path secret because Strava does not sign event POSTs. Growth checks the subscription ID and routes each event to the Growth account linked to its Strava athlete ID. Keep the full callback path private. Worker invocation logging is disabled to avoid recording that URL or OAuth query values; application error logs omit secrets.

Sign in to a Growth account, then open Running → Link Strava → Connect with Strava and authorize that user's Strava account. The service imports every page of history, counts Run/TrailRun/VirtualRun activities, and displays incomplete totals while importing. Queue retries resume interrupted pages. A daily reconciliation catches missed activity edits or deletions. The link persists through Growth logout and across devices. It is removed only when the user chooses Disconnect or revokes Growth in Strava. Disconnect removes that account's Strava credentials and cached runs while leaving its journal untouched.

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

## Growth accounts and verification emails

The fourth tab, **Account**, provides the profile, activity streak, appearance, preferences, and cross-device journal status. Email/password accounts use the existing Worker and D1 migrations. They remain separate from Strava authorization.

On the first account sign-in on a device that has never synced, Growth imports that device's current journal into the account. After that, meals, saved foods, weights, lifts, goals, profile details, appearance, and preferences follow the account between devices. Changes sync after a local edit, when the app becomes active, and on a periodic check. Versioned writes and a three-way merge preserve independent edits made by two devices. Offline edits stay on the device and upload when connectivity returns. Signing out clears that account's cached journal from the device.

The existing Strava integration is still configured for one owner athlete at the service level. Its runs are stored by Strava athlete rather than inside the new account journal. Supporting a separate Strava connection for every Growth account requires a later multi-user Strava migration and approval for the Strava app.

To activate real account email delivery:

1. Set up a verified sender/domain in [Resend](https://resend.com/docs/dashboard/domains/introduction). Set `EMAIL_FROM` to a verified sender such as `Growth <accounts@your-domain.example>`.
2. Add `RESEND_API_KEY` and `EMAIL_FROM` to the gitignored `server/.dev.vars` for local development. For production, use the commands below. Do not put either value in an `EXPO_PUBLIC_` variable.
3. Apply all D1 migrations, rebuild the web app, and deploy the Worker using the existing deployment steps. Use an HTTPS `APP_ORIGIN` in production so account cookies are marked Secure. Password hashing uses Node-compatible scrypt in Workers; allow enough Worker CPU time for password operations on your chosen plan.

```sh
bunx wrangler secret put RESEND_API_KEY --config server/wrangler.jsonc
bunx wrangler secret put EMAIL_FROM --config server/wrangler.jsonc
bun run api:migrate
# On the deployed database, run the --remote migration command in section 5.
```

Registration sends an expiring six-digit code before creating an account. Email changes require the current password and separate codes sent to the existing and proposed email addresses. Both must be verified while signed in to that account. Cancelling an email change invalidates its pending verification. Password changes require the current password; recovery sends a one-time code to the registered email. Codes expire after 10 minutes with at most five attempts. Password/email changes invalidate other sessions and outstanding challenges. Native sessions use SecureStore; browsers use a separate HttpOnly account cookie. Passwords use salted scrypt hashes, and session tokens and verification codes are hashed before storage.

There is no development bypass or code shown in the app: if email credentials are missing or delivery fails, the request reports an error and the account email is not changed. Automated tests mock Resend and use isolated databases; they do not send real mail.

Additional live acceptance with two inboxes you control:

- Register, receive the code, verify it, sign out, and sign back in on web and iPhone.
- On device A, log a meal and weight while signed in. Sign in to the same account on device B and verify both appear. Make a different edit on each device, then bring both online and verify both edits remain.
- Make an offline edit, restart, reconnect, and confirm the Account tab changes from a local/offline state to a current sync time.
- Sign out and verify the previous account's cached journal is no longer visible. Sign in again and verify it downloads from the account.
- Change email and verify that the old email remains active until both inbox codes succeed. Try an incorrect/expired code and cancel a change.
- Change/recover the password and verify a second session is signed out.
- Switch light/dark/system appearance, change the device's system theme, and restart the app.
- Switch US/metric units and inspect weights, lift records, run distance/pace/elevation, and the provider's corresponding split data.
- Verify the streak with meals only, runs only, combined days, a missed day, and a local midnight rollover. A meal entry qualifies; running days use Strava's recorded local date. Future dates are excluded, and a streak ending yesterday stays active during today. Run imports can increase the streak as history arrives.

Changing `userInterfaceStyle` from dark to automatic requires a new native binary for already-installed development/production builds. Expo Go can be used for the shared UI; real Strava OAuth continues to require the configured development build.
