function publicConfig() {
  const deployment = process.env.VERCEL_ENV;
  if (process.env.VERCEL === '1' && !deployment) return null;
  const preview = deployment === 'preview';
  const url = preview ? process.env.PREVIEW_SUPABASE_URL : process.env.SUPABASE_URL;
  const key = preview ? process.env.PREVIEW_SUPABASE_ANON_KEY
    : process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!isPublicKey(key)) return null;
  try {
    const address = new URL(url);
    if (preview && process.env.SUPABASE_URL && address.origin === new URL(process.env.SUPABASE_URL).origin) return null;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(address.hostname);
    if (address.protocol !== 'https:' && !(local && address.protocol === 'http:')) return null;
    if (address.username || address.password || address.search || address.hash) return null;
    return { url: address.href.replace(/\/$/, ''), key };
  } catch {
    return null;
  }
}

function adminKey() {
  return process.env.VERCEL_ENV === 'preview' ? process.env.PREVIEW_SUPABASE_SECRET_KEY
    : process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function isPublicKey(key) {
  if (key?.startsWith('sb_publishable_')) return true;
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon';
  } catch {
    return false;
  }
}

const verified = new Map();
const VERIFIED_LIMIT = 500;

// cacheMs lets high-frequency endpoints (search as you type) skip the Auth round trip
// for a few seconds. Sensitive endpoints omit it and verify every request.
async function authContext(req, { cacheMs = 0 } = {}) {
  const authorization = req.headers?.authorization;
  if (typeof authorization !== 'string' || !/^Bearer [\w.-]+$/i.test(authorization)) {
    return { status: 401, error: 'Sign in to continue.' };
  }

  const config = publicConfig();
  if (!config) return { status: 503, error: 'Authentication is unavailable.' };
  const headers = { apikey: config.key, Authorization: authorization };
  const cached = cacheMs > 0 ? verified.get(config.url + authorization) : null;
  if (cached && cached.expires > Date.now()) return { url: config.url, headers, userId: cached.userId };

  try {
    const response = await fetch(config.url + '/auth/v1/user', {
      headers, signal: AbortSignal.timeout(8000)
    });
    if ([401, 403, 404].includes(response.status)) {
      return { status: 401, error: 'Your session has expired. Sign in again.' };
    }
    if (!response.ok) throw new Error('Auth request failed');
    const user = await response.json();
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user?.id || '')) {
      throw new Error('Invalid Auth response');
    }
    if (cacheMs > 0) {
      if (verified.size >= VERIFIED_LIMIT) verified.delete(verified.keys().next().value);
      verified.set(config.url + authorization, { userId: user.id, expires: Date.now() + cacheMs });
    }
    return { url: config.url, headers, userId: user.id };
  } catch {
    return { status: 503, error: 'Authentication is unavailable. Try again shortly.' };
  }
}

// Give Discovery quota back when the model provider failed. Server-only, best effort:
// without a server key (for example in Preview) the slot simply stays used.
async function refundDiscoveryRequests(auth, count) {
  const secret = adminKey();
  if (!secret || !auth?.userId || !(count > 0)) return;
  const headers = { apikey: secret, 'Content-Type': 'application/json' };
  if (!secret.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + secret;
  try {
    await fetch(auth.url + '/rest/v1/rpc/refund_discovery_request', {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_user_id: auth.userId, p_count: count }),
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    // The refund is a courtesy. A failure here must not change the response.
  }
}

module.exports = { publicConfig, authContext, adminKey, refundDiscoveryRequests };
