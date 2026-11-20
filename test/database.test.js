const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { test } = require('node:test');
const { PGlite } = require('@electric-sql/pglite');
const { uuid_ossp } = require('@electric-sql/pglite/contrib/uuid_ossp');

const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const entryA = '00000000-0000-4000-8000-000000000003';
const entryB = '00000000-0000-4000-8000-000000000004';
const tagA = '00000000-0000-4000-8000-000000000005';
const tagB = '00000000-0000-4000-8000-000000000006';

test('migrations protect journal data, enforce quota and cascade account removal', async (t) => {
  const db = await PGlite.create({ extensions: { uuid_ossp } });
  t.after(() => db.close());

  // The embedded PostgreSQL engine uses a minimal stand-in for Supabase Auth.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const apply = async file => db.exec(await readFile(file, 'utf8'));
  await apply('supabase_schema.sql');
  await apply('supabase_migration.sql');
  await apply('supabase_migration_fix.sql');
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    insert into auth.users (id,email) values ('${a}','a@example.test'), ('${b}','b@example.test');
    insert into public.entries (id,user_id,title,format,rating) values
      ('${entryA}','${a}','Private journal A','film',9), ('${entryB}','${b}','Private journal B','book',8);
    insert into public.tags (id,user_id,name) values ('${tagA}','${a}','own-theme'), ('${tagB}','${b}','private-theme');
    insert into public.entry_tags (entry_id,tag_id) values ('${entryA}','${tagA}'), ('${entryA}','${tagB}');
    select public.compute_fingerprint('${a}');
  `);
  await apply('migrations/003_account_isolation.sql');
  await apply('migrations/004_discovery_quota.sql');
  await apply('migrations/005_style_items.sql');
  const newUser = '00000000-0000-4000-8000-000000000009';
  await db.query("insert into auth.users (id,email) values ($1,'new@example.test')", [newUser]);
  assert.equal((await db.query('select id from public.profiles where id=$1', [newUser])).rows[0].id, newUser);

  const actAs = async (user, role = 'authenticated') => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    await db.exec('set role ' + role);
  };
  const denied = { code: '42501' };

  await t.test('each user gets their own rows and fingerprints', async () => {
    await actAs('', 'anon');
    await assert.rejects(db.query('select * from public.entries_with_tags'), denied);
    await assert.rejects(db.query('select public.compute_fingerprint($1)', [a]), denied);
    await actAs(a);
    const entriesA = await db.query('select title,tags from public.entries_with_tags');
    assert.deepEqual(entriesA.rows, [{ title: 'Private journal A', tags: ['own-theme'] }]);
    const cached = await db.query('select fingerprint_json from public.user_fingerprints');
    assert.equal(cached.rows.length, 0, 'obsolete cached fingerprints with invalid tag links are removed');
    const profile = await db.query('select public.compute_fingerprint($1) as profile', [a]);
    assert.equal(profile.rows[0].profile.total_entries, 1);
    assert.deepEqual(profile.rows[0].profile.primary_themes.map(theme => theme.tag), ['own-theme']);
    await assert.rejects(db.query('delete from public.user_fingerprints where user_id=$1', [a]), denied);
    await assert.rejects(db.query('select public.compute_fingerprint($1)', [b]), denied);
    await assert.rejects(db.query('select public.compute_fingerprint(null)'), denied);
    await assert.rejects(db.query('insert into public.entry_tags values ($1,$2)', [entryB, tagA]), denied);
    await actAs(b);
    await assert.rejects(db.query('insert into public.entry_tags values ($1,$2)', [entryB, tagA]), denied);
    await db.query('insert into public.entry_tags values ($1,$2)', [entryB, tagB]);
    const entriesB = await db.query('select title,tags from public.entries_with_tags');
    assert.deepEqual(entriesB.rows, [{ title: 'Private journal B', tags: ['private-theme'] }]);
    assert.equal((await db.query('select public.compute_fingerprint($1) as profile', [b])).rows[0].profile.total_entries, 1);
  });

  await t.test('quota is per account, includes a retry interval, and resets after an hour', async () => {
    await actAs('', 'anon');
    await assert.rejects(db.query('select public.reserve_discovery_request()'), denied);
    await actAs(a);
    const quota = async () => (await db.query('select public.reserve_discovery_request() as wait')).rows[0].wait;
    const limits = await Promise.all(Array.from({ length: 16 }, quota));
    assert.equal(limits.filter(value => value === 0).length, 12);
    assert.ok(limits.filter(value => value > 0).every(value => value <= 3600));
    await assert.rejects(db.query('select * from nz_private.discovery_quota'), denied);
    await actAs(b);
    assert.equal(await quota(), 0);
    await db.exec("reset role; update nz_private.discovery_quota set window_started_at = now() - interval '61 minutes'");
    await actAs(a);
    assert.equal(await quota(), 0);
  });

  await t.test('style updates are private and deleting an Auth user cascades to their app data', async () => {
    await actAs(a);
    await db.query("insert into public.style_items values ($1,'fragrance','f1',$2)", [a, { name: 'Private fragrance' }]);
    await db.query("insert into public.watchlist (user_id,title,format) values ($1,'Saved Book','book')", [a]);
    await assert.rejects(db.query("insert into public.style_items values ($1,'wardrobe','w1',$2)", [b, { name: 'Unowned' }]), denied);
    await actAs(b);
    assert.deepEqual((await db.query('select * from public.style_items')).rows, []);
    assert.equal((await db.query("delete from public.style_items where item_id='f1' returning item_id")).rows.length, 0);
    await db.query("insert into public.style_items values ($1,'wardrobe','w1',$2)", [b, { name: 'Private wardrobe' }]);
    await db.exec('reset role');
    await db.query('delete from auth.users where id=$1', [a]);
    for (const table of ['entries','tags','watchlist','user_fingerprints','style_items']) {
      assert.equal((await db.query('select * from public.' + table + ' where user_id=$1', [a])).rows.length, 0);
    }
    assert.equal((await db.query('select * from public.profiles where id=$1', [a])).rows.length, 0);
    assert.equal((await db.query('select * from public.entry_tags where entry_id=$1', [entryA])).rows.length, 0);
    assert.equal((await db.query('select * from nz_private.discovery_quota where user_id=$1', [a])).rows.length, 0);
    assert.equal((await db.query('select * from public.style_items where user_id=$1', [b])).rows.length, 1);
  });
});
