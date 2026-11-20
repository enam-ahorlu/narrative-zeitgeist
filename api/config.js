const { publicConfig } = require('../lib/supabase-server');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store');
  const config = publicConfig();
  if (!config) return res.status(503).json({ error: 'Sign-in configuration is unavailable.' });
  return res.status(200).json(config);
};
