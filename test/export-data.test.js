const assert = require('node:assert/strict');
const { test } = require('node:test');
const { exportTables, TABLES } = require('../scripts/export-data');

test('export pages through every table and sends the secret only as request headers', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const table = url.match(/rest\/v1\/([a-z_]+)\?/)[1];
    const from = Number(options.headers.Range.split('-')[0]);
    const count = table === 'entries' ? (from === 0 ? 1000 : 3) : 1;
    return Response.json(Array.from({ length: count }, (_, index) => ({ table, index: from + index })));
  };
  const data = await exportTables({ url: 'https://project.supabase.co', secret: 'sb_secret_synthetic', fetchImpl });
  assert.deepEqual(Object.keys(data), TABLES);
  assert.equal(data.entries.length, 1003);
  assert.equal(data.tags.length, 1);
  assert.ok(calls.every(call => call.options.headers.apikey === 'sb_secret_synthetic'));
  assert.ok(calls.every(call => call.options.headers.Authorization === undefined));
  assert.ok(calls.every(call => !call.url.includes('sb_secret')));

  const legacy = [];
  await exportTables({ url: 'https://project.supabase.co', secret: 'legacy.jwt.value',
    fetchImpl: async (url, options) => { legacy.push(options); return Response.json([]); } });
  assert.ok(legacy.every(options => options.headers.Authorization === 'Bearer legacy.jwt.value'));
});

test('export fails loudly instead of writing a partial copy', async () => {
  await assert.rejects(exportTables({ url: 'https://project.supabase.co', secret: 'sb_secret_x',
    fetchImpl: async () => new Response('no', { status: 500 }) }), /entries|profiles failed with status 500/);
});
