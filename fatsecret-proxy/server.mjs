import { createServer } from 'node:http';

const required = ['FATSECRET_CLIENT_ID', 'FATSECRET_CLIENT_SECRET', 'PROXY_SHARED_SECRET'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

let token = null;

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (token && token.expiresAt > now + 60) return token.value;
  const credentials = Buffer.from(
    `${process.env.FATSECRET_CLIENT_ID}:${process.env.FATSECRET_CLIENT_SECRET}`,
  ).toString('base64');
  const response = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'basic' }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw new Error('FatSecret authentication failed');
  token = {
    value: body.access_token,
    expiresAt: now + Math.max(60, Number(body.expires_in) || 3600),
  };
  return token.value;
}

function authorized(request) {
  return request.headers.authorization === `Bearer ${process.env.PROXY_SHARED_SECRET}`;
}

function json(response, status, body) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

async function fatSecret(path, searchParams) {
  const request = async (refresh = false) => {
    if (refresh) token = null;
    const url = new URL(`https://platform.fatsecret.com${path}`);
    for (const [key, value] of searchParams) url.searchParams.set(key, value);
    url.searchParams.set('format', 'json');
    return fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${await accessToken()}` },
      signal: AbortSignal.timeout(15_000),
    });
  };
  let response = await request();
  if (response.status === 401) response = await request(true);
  return response;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://proxy.internal');
    if (request.method !== 'GET' || !authorized(request))
      return json(response, 401, { error: 'Unauthorized' });
    if (url.pathname === '/health') return json(response, 200, { ok: true });

    let upstreamPath;
    if (url.pathname === '/rest/foods/search/v1') {
      const query = url.searchParams.get('search_expression')?.trim() ?? '';
      const page = Number(url.searchParams.get('page_number') ?? 0);
      const max = Number(url.searchParams.get('max_results') ?? 10);
      if (query.length < 2 || query.length > 120 || !Number.isInteger(page) || page < 0)
        return json(response, 400, { error: 'Invalid search request' });
      if (!Number.isInteger(max) || max < 1 || max > 50)
        return json(response, 400, { error: 'Invalid result limit' });
      upstreamPath = url.pathname;
    } else if (url.pathname === '/rest/food/v2') {
      if (!/^\d+$/.test(url.searchParams.get('food_id') ?? ''))
        return json(response, 400, { error: 'Invalid food ID' });
      upstreamPath = url.pathname;
    } else {
      return json(response, 404, { error: 'Not found' });
    }

    const upstream = await fatSecret(upstreamPath, url.searchParams);
    response.writeHead(upstream.status, {
      'Cache-Control': 'no-store',
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    json(response, 502, { error: 'Upstream request failed' });
  }
});

server.listen(Number(process.env.PORT) || 8080, '0.0.0.0');
