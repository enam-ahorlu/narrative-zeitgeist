// This order is used for both a new installation and the database tests.
const { readdirSync } = require('node:fs');
const path = require('node:path');
const historical = ['supabase_schema.sql', 'supabase_migration.sql', 'supabase_migration_fix.sql'];
const numbered = readdirSync(path.join(__dirname, '..', 'migrations'))
  .filter(name => /^\d{3}_.*\.sql$/.test(name)).sort().map(name => 'migrations/' + name);
if (require.main === module) console.log([...historical, ...numbered].join('\n'));
module.exports = {historical, numbered};
