const assert = require('node:assert/strict');
const { test } = require('node:test');
const discover = require('../api/discover');
const removeAccount = require('../api/delete-account');
const getConfig = require('../api/config');
const search = require('../api/search');
const ratings = require('../api/ratings');

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
  let timedOut = false;
  const item = { title: 'New book', format: 'book', match_score: 95,
    reasons: ['reason one', 'reason two', 'reason three'], cover_color: 'unrecognized color' };
  let content = JSON.stringify([item, item, { ...item, title: 'Existing title' }]);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId }, { status: authStatus });
    if (url.endsWith('/reserve_discovery_request')) return Response.json(retry, { status: quotaStatus });
    if (timedOut) throw new DOMException('Synthetic timeout', 'TimeoutError');
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
  timedOut = true;
  const timeout = await invoke(discover, { headers, body });
  assert.equal(timeout.status, 504);
  assert.match(timeout.body.error, /took too long/);
});

test('Discovery returns quota only for provider failures and reads its model from the environment', async (t) => {
  process.env.ANTHROPIC_API_KEY = 'synthetic-anthropic';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-server-only';
  const calls = [];
  let providerStatus = 200;
  let content = 'not json';
  const item = { title: 'New book', format: 'book', match_score: 95,
    reasons: ['reason one', 'reason two', 'reason three'], cover_color: 'unrecognized color' };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId });
    if (url.endsWith('/reserve_discovery_request')) return Response.json(0);
    if (url.endsWith('/refund_discovery_request')) return Response.json(null);
    return Response.json({ content: [{ type: 'text', text: content }] }, { status: providerStatus });
  });
  const headers = { authorization: token };
  const refunds = () => calls.filter(call => call.url.endsWith('/refund_discovery_request'));
  const provider = () => calls.filter(call => call.url === 'https://api.anthropic.com/v1/messages');

  providerStatus = 529;
  assert.equal((await invoke(discover, { headers, body })).status, 502);
  assert.equal(refunds().length, 1);
  assert.deepEqual(JSON.parse(refunds()[0].options.body), { p_user_id: userId, p_count: 1 });
  assert.equal(refunds()[0].options.headers.apikey, process.env.SUPABASE_SERVICE_ROLE_KEY);

  providerStatus = 200;
  assert.equal((await invoke(discover, { headers, body })).status, 502);
  assert.equal(refunds().length, 1, 'a model answer that cannot be used was still paid for');

  content = JSON.stringify([item]);
  assert.equal((await invoke(discover, { headers, body })).status, 200);
  assert.equal(refunds().length, 1);

  assert.equal(JSON.parse(provider()[0].options.body).model, 'claude-sonnet-4-6');
  process.env.DISCOVERY_MODEL = 'claude-test-model';
  delete require.cache[require.resolve('../api/discover')];
  const configured = require('../api/discover');
  await invoke(configured, { headers, body });
  assert.equal(JSON.parse(provider().at(-1).options.body).model, 'claude-test-model');
  process.env.DISCOVERY_MODEL = 'bad model; drop table';
  delete require.cache[require.resolve('../api/discover')];
  await invoke(require('../api/discover'), { headers, body });
  assert.equal(JSON.parse(provider().at(-1).options.body).model, 'claude-sonnet-4-6');
  delete process.env.DISCOVERY_MODEL;
  delete require.cache[require.resolve('../api/discover')];
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

test('Preview fails closed without its own Supabase settings', async t => {
  const env = process.env;
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected credential use'); });
  const { publicConfig, adminKey } = require('../lib/supabase-server');
  const original = {...env};
  try {
    env.VERCEL_ENV = 'preview';
    env.SUPABASE_URL = 'https://prod.example.test';
    env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_prod';
    env.SUPABASE_SECRET_KEY = 'sb_secret_prod';
    assert.equal(publicConfig(), null);
    assert.equal(adminKey(), undefined);
    env.PREVIEW_SUPABASE_URL = env.SUPABASE_URL;
    env.PREVIEW_SUPABASE_ANON_KEY = 'sb_publishable_stage';
    assert.equal(publicConfig(), null);
    env.PREVIEW_SUPABASE_URL = 'https://stage.example.test';
    env.PREVIEW_SUPABASE_SECRET_KEY = 'sb_secret_stage';
    assert.deepEqual(publicConfig(), {url:env.PREVIEW_SUPABASE_URL,key:'sb_publishable_stage'});
    assert.equal(adminKey(), 'sb_secret_stage');
  } finally {
    for (const name of ['VERCEL_ENV','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY',
      'PREVIEW_SUPABASE_URL','PREVIEW_SUPABASE_ANON_KEY','PREVIEW_SUPABASE_SECRET_KEY']) {
      if (original[name] === undefined) delete env[name];
      else env[name] = original[name];
    }
  }
});

test('search and ratings require a signed-in session and are not open to other origins', async t => {
  process.env.SUPABASE_URL = 'https://supabase.example.test';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic';
  const calls = [];
  let authCalls = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    calls.push(url);
    if (url.endsWith('/auth/v1/user')) { authCalls++; return Response.json({ id: userId }); }
    return Response.json([]);
  });
  const headers = { authorization: 'Bearer search-session' };
  for (const handler of [search, ratings]) {
    const anonymous = await invoke(handler, { method: 'GET', query: { q: 'dune', title: 'Dune' } });
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.headers['Access-Control-Allow-Origin'], undefined);
    assert.equal((await invoke(handler, { method: 'POST', headers, query: {} })).status, 405);
  }
  assert.equal(calls.length, 0);

  assert.deepEqual((await invoke(search, { method: 'GET', headers, query: { q: 'x'.repeat(301), type: 'film' } })).body, []);
  assert.deepEqual((await invoke(ratings, { method: 'GET', headers, query: { title: 'x'.repeat(301) } })).body, {});
  assert.equal(authCalls, 1, 'repeat checks of one token reuse the short verification cache');
  assert.equal(calls.some(url => /omdbapi|themoviedb/.test(url)), false);
});
