export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SYNC_QUEUE: Queue<SyncJob>;
  APP_ORIGIN: string;
  DEV_CLIENT_ORIGIN?: string;
  STRAVA_CLIENT_ID?: string;
  STRAVA_CLIENT_SECRET?: string;
  STRAVA_SUBSCRIPTION_ID?: string;
  STRAVA_VERIFY_TOKEN?: string;
  WEBHOOK_PATH_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  /** Optional override; Open Food Facts asks clients to identify requests. */
  OPEN_FOOD_FACTS_USER_AGENT?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}
export interface ConnectionRow {
  athlete_id: string;
  account_id: string | null;
  name: string;
  access_cipher: string;
  refresh_cipher: string;
  expires_at: number;
  scopes: string;
  status: string;
  generation: string;
  sync_complete: number;
  sync_cursor: number;
  sync_before: number;
  last_sync: string | null;
  sync_error: string | null;
  refresh_lock_until: number;
  linked_at: number;
}
export type SyncJob =
  | { kind: 'import'; athleteId: string; generation: string; page: number; before: number }
  | {
      kind: 'event';
      athleteId: string;
      generation: string;
      eventKey: string;
      objectId: string;
      objectType: string;
      aspect: string;
      authorized?: string;
      eventTime: number;
    };
export class ServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
    public retryAfter = 60,
  ) {
    super(message);
  }
}
export const now = () => Math.floor(Date.now() / 1000);
export const json = (value: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
export function configured(env: Env): boolean {
  return !!(env.STRAVA_CLIENT_ID && env.STRAVA_CLIENT_SECRET && env.TOKEN_ENCRYPTION_KEY);
}
