const assert = require('node:assert/strict');
const { test } = require('node:test');
const discover = require('../api/discover');
const removeAccount = require('../api/delete-account');
const getConfig = require('../api/config');

const userId = '00000000-0000-4000-8000-000000000001';
const body = { fingerprint: { total_entries: 3 }, entryTitles: ['Existing title'] };
const token = 'Bearer synthetic-session';

async function invoke(handler, options = {}) {
  const request = { method: 'POST', headers: {}, ...options };
  const result = { headers: {} };
  const response = {
    setHeader(name, value) { result.headers[name] = value; },
    status(code) { result.status = code; return this; },
    json(value) { result.body = value; return this; }
  };
  await handler(request, response);
  return result;
}

test('public runtime config exposes a publishable key and rejects an admin key', async () => {
  process.env.SUPABASE_URL = 'https://supabase.example.test';
  process.env.SUPABASE_ANON_KEY = 'sb_secret_synthetic';
  assert.equal((await invoke(getConfig, { method: 'GET' })).status, 503);
  process.env.SUPABASE_ANON_KEY = 'sb_publishable_synthetic';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-server-only';
  const config = await invoke(getConfig, { method: 'GET' });
  assert.deepEqual(config.body, { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY });
});

test('Discovery requires auth, validates inputs, enforces quota and sanitizes provider output', async (t) => {
  process.env.ANTHROPIC_API_KEY = 'synthetic-anthropic';
  const calls = [];
  let authStatus = 200;
  let quotaStatus = 200;
  let retry = 0;
  let providerStatus = 200;
  const item = { title: 'New book', format: 'book', match_score: 95,
    reasons: ['reason one', 'reason two', 'reason three'], cover_color: 'unrecognized color' };
  let content = JSON.stringify([item, item, { ...item, title: 'Existing title' }]);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId }, { status: authStatus });
    if (url.endsWith('/reserve_discovery_request')) return Response.json(retry, { status: quotaStatus });
    return Response.json({ content: [{ type: 'text', text: content }] }, { status: providerStatus });
  });

  assert.equal((await invoke(discover, { body })).status, 401);
  assert.equal(calls.length, 0);
  const headers = { authorization: token };
  authStatus = 403;
  assert.equal((await invoke(discover, { headers, body })).status, 401);
  assert.equal(calls.length, 1);
  authStatus = 200;
  assert.equal((await invoke(discover, { headers, body: { fingerprint: [] } })).status, 400);
  assert.equal(calls.length, 2);

  quotaStatus = 503;
  assert.equal((await invoke(discover, { headers, body })).status, 503);
  assert.equal(calls.length, 4);
  quotaStatus = 200;
  retry = 77;
  const limited = await invoke(discover, { headers, body });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers['Retry-After'], '77');
  assert.equal(calls.length, 6);
  retry = 0;
  const ok = await invoke(discover, { headers, body });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.recommendations.map(rec => [rec.title, rec.cover_color]), [['New book', null]]);
  assert.equal(calls[6].options.headers.Authorization, token);
  assert.equal(calls[7].options.headers.Authorization, token);
  assert.equal(calls[8].url, 'https://api.anthropic.com/v1/messages');
  assert.ok(JSON.parse(calls[8].options.body).messages[0].content.includes('Existing title'));

  providerStatus = 429;
  assert.equal((await invoke(discover, { headers, body })).status, 502);
  providerStatus = 200;
  content = 'Invalid provider response';
  assert.equal((await invoke(discover, { headers, body })).status, 502);
});

test('account removal targets the verified user and requires upstream success', async (t) => {
  const calls = [];
  let failed = true;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId });
    return Response.json({}, { status: failed ? 500 : 200 });
  });

  assert.equal((await invoke(removeAccount)).status, 401);
  assert.equal(calls.length, 0);
  const request = { headers: { authorization: token }, body: { userId: 'untrusted client value' } };
  assert.equal((await invoke(removeAccount, request)).status, 502);
  failed = false;
  assert.deepEqual((await invoke(removeAccount, request)).body, { deleted: true });
  assert.ok(calls[3].url.endsWith('/admin/users/' + userId));
  assert.equal(calls[3].options.method, 'DELETE');
  assert.equal(calls[3].options.headers.apikey, process.env.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(calls[3].options.headers.Authorization, 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(JSON.parse(calls[3].options.body).should_soft_delete, false);
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_synthetic';
  assert.equal((await invoke(removeAccount, request)).status, 200);
  assert.equal(calls[5].options.headers.apikey, 'sb_secret_synthetic');
  assert.equal(calls[5].options.headers.Authorization, undefined);
});
