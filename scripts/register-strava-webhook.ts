const origin = process.argv[2]?.replace(/\/$/, '');
const required = [
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET',
  'STRAVA_VERIFY_TOKEN',
  'WEBHOOK_PATH_SECRET',
] as const;
if (!origin || !origin.startsWith('https://') || required.some((key) => !process.env[key])) {
  throw new Error(
    'Provide the HTTPS Worker origin and all four Strava webhook environment variables. See SETUP.md.',
  );
}
const callback = `${origin}/api/strava/webhook/${process.env.WEBHOOK_PATH_SECRET}`;
const auth = {
  client_id: process.env.STRAVA_CLIENT_ID!,
  client_secret: process.env.STRAVA_CLIENT_SECRET!,
};
const existingResponse = await fetch(
  `https://www.strava.com/api/v3/push_subscriptions?${new URLSearchParams(auth)}`,
);
if (!existingResponse.ok)
  throw new Error(`Strava subscription lookup failed (${existingResponse.status}).`);
const existing = (await existingResponse.json()) as { id: number; callback_url: string }[];
if (existing.length) {
  const match = existing.find((subscription) => subscription.callback_url === callback);
  if (!match)
    throw new Error(
      'This Strava application already has another webhook subscription. Nothing was changed. Review that subscription before continuing.',
    );
  console.log(`Existing subscription ID: ${match.id}. Set STRAVA_SUBSCRIPTION_ID to this value.`);
} else {
  const response = await fetch('https://www.strava.com/api/v3/push_subscriptions', {
    method: 'POST',
    body: new URLSearchParams({
      ...auth,
      callback_url: callback,
      verify_token: process.env.STRAVA_VERIFY_TOKEN!,
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(
      `Strava webhook registration failed (${response.status}): ${detail || 'no response details'}`,
    );
  }
  const result = (await response.json()) as { id: number };
  console.log(`Created subscription ID: ${result.id}. Set STRAVA_SUBSCRIPTION_ID to this value.`);
}
export {};
