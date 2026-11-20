function publicConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!isPublicKey(key)) return null;
  try {
    const address = new URL(url);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(address.hostname);
    if (address.protocol !== 'https:' && !(local && address.protocol === 'http:')) return null;
    if (address.username || address.password || address.search || address.hash) return null;
    return { url: address.href.replace(/\/$/, ''), key };
  } catch {
    return null;
  }
}

function isPublicKey(key) {
  if (key?.startsWith('sb_publishable_')) return true;
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon';
  } catch {
    return false;
  }
}

async function authContext(req) {
  const authorization = req.headers?.authorization;
  if (typeof authorization !== 'string' || !/^Bearer [\w.-]+$/i.test(authorization)) {
    return { status: 401, error: 'Sign in to continue.' };
  }

  const config = publicConfig();
  if (!config) return { status: 503, error: 'Authentication is unavailable.' };
  const headers = { apikey: config.key, Authorization: authorization };

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
    return { url: config.url, headers, userId: user.id };
  } catch {
    return { status: 503, error: 'Authentication is unavailable. Try again shortly.' };
  }
}

module.exports = { publicConfig, authContext };
