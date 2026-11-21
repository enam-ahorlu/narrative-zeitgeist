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
    create role service_role;
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
  await apply('migrations/006_discovery_feedback.sql');
  await apply('migrations/007_journal_workflows.sql');
  await apply('migrations/008_media_workflows.sql');
  await apply('migrations/009_quota_refund.sql');
  await apply('migrations/010_duplicate_guard.sql');
  await apply('migrations/011_dismissal_reason.sql');
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

  await t.test('entry and Watchlist commands preserve ownership, retries, and rollback', async () => {
    const id = '00000000-0000-4000-8000-000000000010';
    const alternate = '00000000-0000-4000-8000-000000000011';
    const journal = (entry, edit, title, tags, watch = null) => db.query(
      'select public.save_journal_entry($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as id',
      [entry,edit,title,'book',0,'test note',null,null,null,tags,watch]
    );
    const watch = async title => (await db.query(
      "select public.save_watchlist_pick($1,'book','openlibrary:test','[]',null,'{}') as id",[title]
    )).rows[0].id;

    await actAs('', 'anon');
    await assert.rejects(journal(id,false,'Unavailable',[]),denied);
    await actAs(a);
    const originalWatch = await watch('Queue Me');
    assert.equal(await watch('  queue me  '),originalWatch);
    await actAs(b);
    await assert.rejects(journal(id,false,'Cross account',[],originalWatch),{code:'P0002'});
    await assert.rejects(journal(entryA,true,'Cross account',[]),{code:'P0002'});
    await assert.rejects(db.query('select public.dismiss_watchlist_pick($1)',[originalWatch]),{code:'P0002'});

    await actAs(a);
    await assert.rejects(journal(id,false,'Invalid tag',['x'.repeat(81)],originalWatch),{code:'22001'});
    assert.equal((await db.query('select added_to_collection from public.watchlist where id=$1',[originalWatch])).rows[0].added_to_collection,false);
    assert.equal((await db.query('select id from public.entries where id=$1',[id])).rows.length,0);
    await journal(id,false,'Queue Me',['Mystery','mystery',' second '],originalWatch);
    await journal(id,false,'Retry should not overwrite',['different'],originalWatch);
    await assert.rejects(journal(alternate,false,'Duplicate move',[],originalWatch),{code:'P0002'});
    await assert.rejects(journal(id,true,'Bad edit',['x'.repeat(81)]),{code:'22001'});
    const saved = async () => (await db.query('select title,rating,tags from public.entries_with_tags where id=$1',[id])).rows[0];
    assert.equal((await saved()).title,'Queue Me');
    assert.equal(Number((await saved()).rating),0);
    assert.deepEqual((await saved()).tags.sort(),['mystery','second']);
    await db.query("select public.merge_journal_tags('second','mystery')");
    assert.deepEqual((await saved()).tags,['mystery']);
    assert.equal((await db.query("select name from public.tags where name='second'")).rows.length,0);
    await assert.rejects(db.query("select public.merge_journal_tags('missing','unused')"),{code:'P0002'});
    assert.equal((await db.query("select name from public.tags where name='unused'")).rows.length,0);
    await journal(id,true,'Successful edit',[]);
    assert.deepEqual((await saved()).tags,[]);
    const active = await watch('Queue Me');
    assert.notEqual(active,originalWatch);
    await db.query('select public.dismiss_watchlist_pick($1)',[active]);
    assert.equal((await db.query('select id from public.watchlist where id=$1',[active])).rows.length,0);
    assert.equal((await db.query("select title from public.discovery_feedback where title='Queue Me'")).rows.length,1);
  });

  await t.test('identified releases, repeat entries and Up Next stay separate and account scoped', async () => {
    const media = (title,format,id,details={}) => db.query(
      "select public.save_watchlist_media($1,$2,$3,'[]',null,'{}',$4) as id",
      [title,format,'fixture:'+id,{provider:'fixture',id,...details}]
    ).then(result=>result.rows[0].id);
    await actAs(a);
    const first = await media('Same title','film','original',{year:'1975'});
    const remake = await media('Same title','film','remake',{year:'2020'});
    assert.notEqual(first,remake);
    assert.equal(first,await media('Translated original','film','original'));
    const track = await media('Same title','music','track',{kind:'track'});
    await db.query("update public.watchlist set priority='up_next' where id=any($1::uuid[])",[[first,remake,track]]);
    await db.query('select public.save_up_next_order($1)',[[track,remake,first]]);
    assert.deepEqual((await db.query('select id from public.watchlist where id=any($1::uuid[]) order by queue_position',[[first,remake,track]])).rows.map(row=>row.id),[track,remake,first]);
    await assert.rejects(db.query('select public.save_up_next_order($1)',[[first,first,track]]),{code:'P0002'});
    const ids = ['00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000013'];
    for (const id of ids) {
      await db.query("select public.save_journal_media($1,false,'Same title','music',8,null,null,null,null,'{}',null,$2,$3)",[id,{provider:'fixture',id:'track',kind:'track'},id===ids[1]]);
    }
    assert.deepEqual((await db.query('select catalogue from public.entries_with_tags where id=any($1::uuid[])', [ids])).rows.map(row=>row.catalogue.kind),['track','track']);
    await db.query('select public.dismiss_watchlist_media($1)',[remake]);
    assert.deepEqual((await db.query('select catalogue_id from public.discovery_catalogue_feedback')).rows.map(row=>row.catalogue_id),['remake']);
    await actAs(b);
    assert.equal((await db.query('select * from public.discovery_catalogue_feedback')).rows.length,0);
    await assert.rejects(db.query('select public.save_up_next_order($1)',[[first,track]]),{code:'P0002'});
  });

  await t.test('a work already in the collection cannot be added twice unless it is a deliberate repeat', async () => {
    await actAs(a);
    const add = (id,title,format,catalogue=null,repeat=false) => db.query(
      "select public.save_journal_media($1,false,$2,$3,8,null,null,null,null,'{}',null,$4,$5)",[id,title,format,catalogue,repeat]);
    const uid = n => '00000000-0000-4000-8000-0000000001' + String(n).padStart(2,'0');
    await add(uid(1),'Dune','film',{provider:'tmdb',id:'1',year:'1984'});
    const duplicate = { code:'23505' };
    await assert.rejects(add(uid(2),'  DUNE ','film',null),duplicate);
    await assert.rejects(add(uid(3),'Dune','film',{provider:'tmdb',id:'1',year:'1984'}),duplicate);
    await add(uid(4),'Dune','film',{provider:'tmdb',id:'2',year:'2021'});
    await add(uid(5),'Dune','book');
    await add(uid(6),"Don't Look Up",'film');
    await assert.rejects(add(uid(7),'Dont look up!','film'),duplicate);
    await add(uid(8),'Blue','music',{provider:'fixture',id:'album-blue',kind:'album'});
    await add(uid(9),'Blue','music',{provider:'fixture',id:'track-blue',kind:'track'});
    await assert.rejects(add(uid(10),'Blue','music',{kind:'track'}),duplicate);
    await add(uid(11),'Dune','film',{provider:'tmdb',id:'1',year:'1984'},true);
    await add(uid(1),'Dune','film',{provider:'tmdb',id:'1',year:'1984'});
    assert.equal((await db.query("select count(*)::int n from public.entries where title='Dune' and format='film'")).rows[0].n,3);
    await actAs(b);
    await add(uid(12),'Dune','film',{provider:'tmdb',id:'1',year:'1984'});
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

  await t.test('quota refunds are server-only, never exceed what was used, and leave old windows alone', async () => {
    const refund = (user, count) => db.query('select public.refund_discovery_request($1, $2)', [user, count]);
    const used = async user => {
      await db.exec('reset role');
      const count = (await db.query('select request_count from nz_private.discovery_quota where user_id=$1', [user])).rows[0]?.request_count;
      await db.exec('set role service_role');
      return count;
    };
    await actAs(a);
    await assert.rejects(refund(a, 1), denied);
    await actAs('', 'anon');
    await assert.rejects(refund(a, 1), denied);

    await db.exec('reset role; delete from nz_private.discovery_quota');
    await actAs(a);
    for (let index = 0; index < 3; index++) await db.query('select public.reserve_discovery_request()');
    await db.exec('reset role; set role service_role');
    await refund(a, 1);
    assert.equal(await used(a), 2);
    await refund(a, 99);
    assert.equal(await used(a), undefined);
    await refund(a, 1);

    await db.exec('reset role');
    await actAs(a);
    for (let index = 0; index < 5; index++) await db.query('select public.reserve_discovery_request()');
    await db.exec("reset role; update nz_private.discovery_quota set window_started_at = now() - interval '61 minutes'; set role service_role");
    await refund(a, 2);
    assert.equal(await used(a), 5);
    await db.exec('reset role');
  });

  await t.test('style updates are private and deleting an Auth user cascades to their app data', async () => {
    await actAs(a);
    await db.query("insert into public.style_items values ($1,'fragrance','f1',$2)", [a, { name: 'Private fragrance' }]);
    await db.query("insert into public.watchlist (user_id,title,format) values ($1,'Saved Book','book')", [a]);
    await db.query("insert into public.discovery_feedback (title,format) values ('Dismissed Book','book')");
    await db.query("insert into public.discovery_feedback (title,format,reason) values ('Discarded Book','book','discarded')");
    assert.deepEqual((await db.query("select title,reason from public.discovery_feedback where title in ('Dismissed Book','Discarded Book') order by title")).rows.map(row=>row.reason),['discarded','not_for_me']);
    await assert.rejects(db.query("insert into public.discovery_feedback (title,format,reason) values ('Odd','book','hates')"));
    await assert.rejects(db.query("insert into public.style_items values ($1,'wardrobe','w1',$2)", [b, { name: 'Unowned' }]), denied);
    await actAs(b);
    assert.equal((await db.query('select * from public.discovery_feedback')).rows.length, 0);
    await assert.rejects(db.query("insert into public.discovery_feedback values ($1,'book','Wrong account')", [a]), denied);
    assert.deepEqual((await db.query('select * from public.style_items')).rows, []);
    assert.equal((await db.query("delete from public.style_items where item_id='f1' returning item_id")).rows.length, 0);
    await db.query("insert into public.style_items values ($1,'wardrobe','w1',$2)", [b, { name: 'Private wardrobe' }]);
    await db.exec('reset role');
    await db.query('delete from auth.users where id=$1', [a]);
    for (const table of ['entries','tags','watchlist','user_fingerprints','style_items','discovery_feedback','discovery_catalogue_feedback']) {
      assert.equal((await db.query('select * from public.' + table + ' where user_id=$1', [a])).rows.length, 0);
    }
    assert.equal((await db.query('select * from public.profiles where id=$1', [a])).rows.length, 0);
    assert.equal((await db.query('select * from public.entry_tags where entry_id=$1', [entryA])).rows.length, 0);
    assert.equal((await db.query('select * from nz_private.discovery_quota where user_id=$1', [a])).rows.length, 0);
    assert.equal((await db.query('select * from public.style_items where user_id=$1', [b])).rows.length, 1);
  });
});
