// Pipe a decrypted application export into a fresh, in-memory PostgreSQL database.
// Only table counts leave this process. Auth credentials are outside the application export.
const {readFile} = require('node:fs/promises');
const {PGlite} = require('@electric-sql/pglite');
const {uuid_ossp} = require('@electric-sql/pglite/contrib/uuid_ossp');
const {historical,numbered} = require('./migration-files');
const {TABLES} = require('./export-data');

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const checksum = process.env.NZ_BACKUP_SHA256;
  if (checksum && require('node:crypto').createHash('sha256').update(bytes).digest('hex') !== checksum) throw new Error('Backup checksum mismatch');
  const snapshot = JSON.parse(bytes.toString('utf8'));
  const tables = snapshot.tables;
  const inventory = process.argv.includes('--before-014') ? TABLES.filter(name=>name !== 'discovery_comparisons') : TABLES;
  if (!tables || Object.keys(tables).length !== inventory.length || !inventory.every(name=>Array.isArray(tables[name]))) {
    throw new Error('Unexpected backup inventory');
  }
  const db = await PGlite.create({extensions:{uuid_ossp}});
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      grant usage on schema auth to authenticated,anon;`);
    for (const migration of [...historical,...numbered]) await db.exec(await readFile(migration,'utf8'));
    await db.transaction(async tx=>{
      // Supply only the external Auth IDs needed by foreign keys in this disposable database.
      await tx.exec('alter table auth.users disable trigger on_auth_user_created');
      const owners = new Set([...tables.profiles.map(row=>row.id),...inventory.flatMap(name=>tables[name].map(row=>row.user_id).filter(Boolean))]);
      for (const owner of owners) await tx.query('insert into auth.users(id) values ($1)',[owner]);
      await tx.exec('alter table auth.users enable trigger on_auth_user_created');
      for (const name of inventory) {
        const source = 'select * from jsonb_populate_recordset(null::public.'+name+',$1::jsonb)';
        const params = [JSON.stringify(tables[name])];
        await tx.query('insert into public.'+name+' '+source,params);
        const difference = await tx.query('select exists ((select * from public.'+name+' except all '+source+') union all ('+source+' except all select * from public.'+name+')) as differs',params);
        if (difference.rows[0].differs) throw new Error('Restored rows differ');
      }
    });
    console.log('Restored and compared every row in '+inventory.length+' application tables. Foreign keys passed.');
  } finally {
    await db.close();
  }
}

main().catch(()=>{console.error('Restore rehearsal failed. Check export format, migration inventory and constraints.');process.exitCode=1;});
