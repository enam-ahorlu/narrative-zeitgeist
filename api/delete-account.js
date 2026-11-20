const { authContext } = require('../lib/supabase-server');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store');

  const auth = await authContext(req);
  if (!auth.userId) return res.status(auth.status).json({ error: auth.error });

  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return res.status(503).json({ error: 'Account deletion is unavailable.' });

  try {
    const headers = { apikey: secret, 'Content-Type': 'application/json' };
    // The legacy service-role JWT is also used as a bearer token.
    if (!secret.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + secret;
    const response = await fetch(auth.url + '/auth/v1/admin/users/' + auth.userId, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ should_soft_delete: false }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      console.error('Supabase account deletion returned status', response.status);
      return res.status(502).json({ error: 'Account deletion could not be confirmed. Try again or contact support.' });
    }
    return res.status(200).json({ deleted: true });
  } catch {
    return res.status(502).json({ error: 'Account deletion could not be confirmed. Try again or contact support.' });
  }
};
