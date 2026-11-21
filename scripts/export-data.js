// Writes a JSON copy of the app's tables to backups/, which git ignores.
// Run it before applying a migration:
//   SUPABASE_URL=https://<project>.supabase.co SUPABASE_SECRET_KEY=<secret key> npm run export:data
// The secret key is read from the environment only. It is never printed or written.
// The file holds real journal data. Keep it out of the repository and out of shared folders.

const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

// Each table with its primary key, so paging is stable.
const KEYS = {
  profiles: 'id', entries: 'id', tags: 'id', entry_tags: 'entry_id,tag_id', watchlist: 'id',
  user_fingerprints: 'user_id', style_items: 'user_id,kind,item_id',
  discovery_feedback: 'user_id,format,title',
  discovery_catalogue_feedback: 'user_id,format,provider,catalogue_id',
  style_dismissals: 'user_id,kind,item_key', discovery_comparisons: 'user_id,id'
};
const TABLES = Object.keys(KEYS);
const PAGE = 1000;

async function exportTables({ url, secret, fetchImpl = fetch, before014 = false }) {
  const headers = { apikey: secret };
  // The legacy service-role key is a JWT that is also sent as a bearer token.
  if (!secret.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + secret;
  const data = {};
  for (const table of TABLES) {
    const rows = [];
    let missing = false;
    for (let from = 0; ; from += PAGE) {
      const response = await fetchImpl(`${url}/rest/v1/${table}?select=*&order=${KEYS[table]}`, {
        headers: { ...headers, Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
        signal: AbortSignal.timeout(30000)
      });
      if (before014 && table === 'discovery_comparisons' && from === 0 && response.status === 404) {
        const error = await response.json();
        if (error.code === 'PGRST205' || error.code === '42P01') { missing = true; break; }
      }
      if (!response.ok) throw new Error(`Export of ${table} failed with status ${response.status}`);
      const page = await response.json();
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    if (!missing) data[table] = rows;
  }
  return data;
}

function isIgnored(directory) {
  try {
    execFileSync('git', ['check-ignore', '-q', directory], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !secret) {
    throw new Error('Set SUPABASE_URL (https://<project>.supabase.co) and SUPABASE_SECRET_KEY.');
  }
  const directory = path.join(__dirname, '..', 'backups');
  if (!isIgnored('backups/')) throw new Error('backups/ is not ignored by git. Refusing to write data there.');
  const data = await exportTables({ url, secret, before014:process.argv.includes('--before-014') });
  if (!data.discovery_comparisons) console.log('Pre-014 schema: comparison table absent.');
  mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(directory, `narrative-zeitgeist-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), project: url, tables: data }, null, 2), { mode: 0o600 });
  console.log('Wrote', file);
  for (const [table, rows] of Object.entries(data)) console.log(`${table}: ${rows.length} rows`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { exportTables, TABLES };
