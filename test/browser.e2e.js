const assert = require('node:assert/strict');
const { readFile, readdir } = require('node:fs/promises');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { chromium } = require('playwright-core');

const origin = 'http://localhost:8976';
const users = ['a', 'b'].map((name, index) => ({
  id: '00000000-0000-4000-8000-00000000000' + (index + 1),
  email: name + '@example.test',
  user_metadata: { display_name: 'Account ' + name },
  app_metadata: { provider: 'email' },
  role: 'authenticated',
  aud: 'authenticated'
}));
const entries = users.flatMap((user, index) => Array.from({ length: index ? 1 : 3 }, (_, position) => ({
  id: randomUUID(), user_id: user.id, title: (index ? 'Journal B ' : 'Journal A ') + (position + 1),
  format: 'book', rating: 8 + position / 2, tags: ['afrofuturism'], date_completed: '2026-08-01',
  created_at: '2026-09-01'
})));
entries.push(...Array.from({length:9},(_,index)=>({
  id:randomUUID(),user_id:users[0].id,title:'Older fixture '+index,format:index===8?'sports_match':'film',
  rating:index===8?0:7,tags:['first','second','third-only'],created_at:'2026-01-01'
})));
const journalDrafts = [];
let failJournalSave = true;
let failCollectionLoad = true;
let failStyleLoad = true;
const watchlist = [];
const dismissals = [];
const styleItems = [];
const resetRecipients = [];
const stylesCreated = [];
const discoveryInputs = [];
const passwordUpdates = [];
let discoveryRequests = 0;
let deleteRequests = 0;
let failDelete = true;
let failLogout = false;
let failImport = true;
let limitDiscovery = true;

const fixtures = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/assets/discovery-comparison.js': ['assets/discovery-comparison.js', 'text/javascript; charset=utf-8'],
  '/assets/discovery-session.js': ['assets/discovery-session.js', 'text/javascript; charset=utf-8'],
  '/assets/style-store.js': ['assets/style-store.js', 'text/javascript; charset=utf-8'],
  '/assets/style-recommendations.js': ['assets/style-recommendations.js', 'text/javascript; charset=utf-8'],
  '/assets/media-identity.js': ['assets/media-identity.js', 'text/javascript; charset=utf-8'],
  '/assets/entry-form.js': ['assets/entry-form.js', 'text/javascript; charset=utf-8'],
  '/assets/style-forms.js': ['assets/style-forms.js', 'text/javascript; charset=utf-8'],
  '/assets/collection-screen.js': ['assets/collection-screen.js', 'text/javascript; charset=utf-8'],
  '/assets/watchlist-screen.js': ['assets/watchlist-screen.js', 'text/javascript; charset=utf-8'],
  '/assets/insights-screen.js': ['assets/insights-screen.js', 'text/javascript; charset=utf-8'],
  '/assets/journal-data.js': ['assets/journal-data.js', 'text/javascript; charset=utf-8'],
  '/assets/journal-view.js': ['assets/journal-view.js', 'text/javascript; charset=utf-8'],
  '/supabase.js': ['supabase.js', 'text/javascript; charset=utf-8'],
  '/catalogues/fragrances.js': ['catalogues/fragrances.js', 'text/javascript; charset=utf-8'],
  '/catalogues/tags.js': ['catalogues/tags.js', 'text/javascript; charset=utf-8'],
  '/catalogues/wardrobe.js': ['catalogues/wardrobe.js', 'text/javascript; charset=utf-8']
};

function jwt(user) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: user.id, role: user.role, exp }) + '.c3ludGhldGlj';
}

function session(user) {
  return { access_token: jwt(user), refresh_token: 'synthetic-refresh', token_type: 'bearer',
    expires_in: 3600, user };
}

function createMocks(assets) {
  return async function respond(route) {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const send = (json, status = 200) => route.fulfill({ status, json });
    if (url.hostname === 'upload.wikimedia.org' || url.hostname === 'user-photo.example.test') {
      return route.fulfill({ contentType:'image/gif', body:Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64') });
    }
    if (url.origin !== origin) return route.abort();
    if (assets[path]) return route.fulfill(assets[path]);
    if (path === '/api/config') return send({ url: origin, key: 'sb_publishable_synthetic' });
    if (path === '/favicon.ico') return route.fulfill({ status: 204 });
    if (path === '/api/search' && url.searchParams.get('type') === 'track') return send([{
      id:'12345',provider:'itunes',_type:'track',kind:'track',creator:'Fixture Artist',year:'2012',
      title:'Fixture Track',description:'Fixture Artist'
    }]);
    if (path === '/api/search' || path === '/api/ratings') return send([]);
    if (path === '/auth/v1/token' && method === 'POST') {
      const input = request.postDataJSON();
      const user = users.find(candidate => candidate.email === input.email);
      return user && input.password === 'test-password'
        ? send(session(user))
        : send({ message: 'Invalid login credentials' }, 400);
    }
    if (path === '/auth/v1/recover') {
      resetRecipients.push(request.postDataJSON().email);
      return send({});
    }
    if (path === '/auth/v1/signup') {
      return send({ ...users[0], email: request.postDataJSON().email });
    }
    if (path === '/auth/v1/logout') {
      if (failLogout) return send({ message: 'Synthetic sign-out network failure' }, 500);
      return route.fulfill({ status: 204 });
    }

    const authorization = request.headers().authorization || '';
    const user = users.find(candidate => authorization === 'Bearer ' + jwt(candidate))
      || users.find(candidate => {
        try { return JSON.parse(Buffer.from(authorization.split('.')[1], 'base64url')).sub === candidate.id; }
        catch { return false; }
      });
    if (!user) return send({ message: 'No test session' }, 401);
    const matchesUser = row => row.user_id === user.id;
    const body = request.postData() ? request.postDataJSON() : null;
    if (path === '/auth/v1/user') {
      if (method === 'PUT') passwordUpdates.push({ userId: user.id, password: body.password });
      return send(user);
    }

    if (path === '/api/delete-account') {
      deleteRequests++;
      if (failDelete) return send({ error: 'Account deletion could not be confirmed.' }, 502);
      return send({ deleted: true });
    }
    if (path === '/api/discover') {
      discoveryRequests++;
      discoveryInputs.push(body);
      if (limitDiscovery) return send({ error: 'Discovery limit reached. Try again later.' }, 429);
      if (body.strategy === 'compare-low-ratings') return send({comparison:{
        without:[{title:'Favorite-based fixture',format:'book',reasons:['Shared setting']}],
        with:[{title:'Signal-based fixture',format:'book',reasons:['Shared narrative technique']}]
      }});
      if (body.strategy === 'baseline') {
        if (!body.entryTitles.includes('Journal A 1')) return send({ error: 'Missing journal data' }, 400);
        return send({ recommendations: [{
          title:'Original synthetic book',format:'book',reasons:['Original reason']
        }] });
      }
      if (body.strategy !== 'grounded') return send({ error:'Grounded strategy required' }, 400);
      if (body.tab === 'because-loved') {
        const seed = entries.find(entry => entry.id === body.seedId && matchesUser(entry));
        if (!seed) return send({ error:'Unknown selected entry' }, 404);
        return send({ recommendations: [{
          title:'Seeded synthetic book',format:'book',reasons:['Seeded reason'],
          anchor:{title:seed.title,rating:seed.rating},match_hook:'Because you logged ' + seed.title,
          catalog:{provider:'openlibrary',id:'/works/fixture'}
        }] });
      }
      return send({ recommendations: [{
        title: body.recent?.some(item => item.title === 'Synthetic discovery book') ? 'Fresh synthetic book' : 'Synthetic discovery book',
        format: 'book', affinity:{label:'Close match',sharedTags:['afrofuturism','mystery']},
        reasons: ['Theme match', 'Format match', 'Rating match'], tags: ['afrofuturism'],
        meta: 'Book', cover_color: null, catalog:{provider:'openlibrary',id:body.recent?.some(item => item.title === 'Synthetic discovery book') ? '/works/fresh' : '/works/fixture2'}
      }] });
    }
    if (path === '/rest/v1/entries_with_tags') {
      if(failCollectionLoad) return send({message:'Synthetic collection failure'},503);
      return send(entries.filter(matchesUser).sort((left,right)=>right.created_at.localeCompare(left.created_at)));
    }
    if (path === '/rest/v1/rpc/save_journal_media') {
      journalDrafts.push(body.p_entry_id);
      if (failJournalSave) return send({message:'Synthetic transaction failure'},503);
      const item = { title:body.p_title, format:body.p_format, rating:body.p_rating,
        notes:body.p_notes, catalogue:body.p_catalogue, tags:body.p_tags, user_id:user.id, id:body.p_entry_id, created_at:'2026-10-01' };
      const existing = entries.find(entry=>matchesUser(entry) && entry.id===item.id);
      if(existing) Object.assign(existing,item);
      else entries.push(item);
      if(body.p_watchlist_id){
        const saved = watchlist.find(row=>matchesUser(row) && row.id===body.p_watchlist_id);
        assert.ok(saved);
        saved.added_to_collection = true;
      }
      return send(item.id);
    }
    if (path === '/rest/v1/rpc/save_up_next_order') {
      body.p_ids.forEach((id,index)=>{
        watchlist.find(row=>matchesUser(row) && row.id === id).queue_position = index+1;
      });
      return route.fulfill({status:204});
    }
    if (path === '/rest/v1/rpc/save_watchlist_media') {
      const row = {user_id:user.id,title:body.p_title,format:body.p_format,tags:body.p_tags,
        id:randomUUID(),priority:'maybe',saved_at:'2026-10-01',added_to_collection:false};
      watchlist.push(row);
      return send(row.id);
    }
    if (path === '/rest/v1/tags') return send([]);
    if (['/rest/v1/discovery_feedback','/rest/v1/discovery_catalogue_feedback'].includes(path) && method === 'POST') {
      dismissals.push(body);
      return route.fulfill({ status:201 });
    }
    if (path === '/rest/v1/watchlist') {
      if (method === 'GET') return send(watchlist.filter(row=>matchesUser(row) && !row.added_to_collection));
      if (method === 'PATCH') {
        const row = watchlist.find(entry => matchesUser(entry) && 'eq.' + entry.id === url.searchParams.get('id'));
        assert.equal(url.searchParams.get('user_id'), 'eq.' + user.id);
        if (!row) return send({ message: 'Watchlist item missing' },404);
        row.priority = body.priority;
        return send({id:row.id});
      }
      if (method === 'POST') {
        const row = { ...body, id: randomUUID(), saved_at: '2026-10-01' };
        watchlist.push(row);
        return route.fulfill({ status: 201 });
      }
    }
    const profile = { total_entries: entries.filter(matchesUser).length, primary_themes: [
      { tag: 'afrofuturism', avg_rating: 9, frequency: 2, weight: 9 }
    ], format_breakdown: { book: { count: 3, avg_rating: 9 } }, overall_avg_rating: 9 };
    if (path === '/rest/v1/rpc/compute_fingerprint') return send(profile);
    if (path === '/rest/v1/user_fingerprints') return send({ fingerprint_json: profile });
    if (path === '/rest/v1/style_items') {
      if (method === 'GET') return failStyleLoad ? send({message:'Synthetic style load failure'},503) : send(styleItems.filter(matchesUser));
      if (method === 'DELETE') {
        const id = url.searchParams.get('item_id').slice(3);
        const index = styleItems.findIndex(row => matchesUser(row) && row.item_id === id);
        if (index >= 0) styleItems.splice(index, 1);
        return route.fulfill({ status: 204 });
      }
      const batch = Array.isArray(body) ? body : [body];
      if (failImport && batch.some(row => row.item_id === 'legacy-f1')) {
        return send({ message: 'Synthetic import failure' }, 503);
      }
      const inserted = [];
      for (const row of batch) {
        const index = styleItems.findIndex(other => matchesUser(other) && other.item_id === row.item_id);
        if (index >= 0 && !request.headers().prefer.includes('ignore-duplicates')) styleItems[index] = row;
        if (index < 0) {
          styleItems.push(row);
          stylesCreated.push(row.item_id);
          inserted.push({ item_id: row.item_id });
        }
      }
      return Array.isArray(body) ? send(inserted, 201) : route.fulfill({ status: 201 });
    }
    return send({ message: 'Unhandled test request ' + method + ' ' + path }, 404);
  };
}

test('browser covers regular signed-in, recommendation and Style & Scent flows', { timeout: 90000 }, async t => {
  const browser = await chromium.launch({
    channel: process.env.NZ_BROWSER_CHANNEL || 'chrome',
    executablePath: process.env.NZ_BROWSER_EXECUTABLE || undefined,
    headless: true
  });
  t.after(() => browser.close());
  const photos = await readdir('catalogues/photos');
  const photoFixtures = Object.fromEntries(photos.map(file => [
    '/catalogues/photos/' + file, ['catalogues/photos/' + file, 'image/webp']
  ]));
  const assets = Object.fromEntries(await Promise.all(Object.entries({...fixtures, ...photoFixtures}).map(async ([url, [file, contentType]]) =>
    [url, { body: await readFile(file), contentType }])));

  async function openContext(options = {}) {
    const context = await browser.newContext(options);
    await context.route('**/*', createMocks(assets));
    return context;
  }

  const context = await openContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(() => {
    if (localStorage.getItem('test-initialized')) return;
    localStorage.setItem('test-initialized', '1');
    localStorage.setItem('nz_fragrances', JSON.stringify([
      { id: 'legacy-f1', name: 'Browser-only sample', house: 'Fixture', status: 'owned', rating: 8 }
    ]));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  async function verifyPhoto(target, locator) {
    await locator.scrollIntoViewIfNeeded();
    const image = await locator.elementHandle();
    try {
      await target.waitForFunction(img => img.complete && img.naturalWidth > 0,image,{timeout:12000});
    } finally {
      await image.dispose();
    }
  }

  const signIn = async (target, email, password = 'test-password') => {
    await target.locator('#auth-email-inp').fill(email);
    await target.locator('#auth-pass-inp').fill(password);
    await target.locator('#auth-submit-btn').click();
  };
  const visit = async screen => {
    await page.locator('.ni[data-screen="' + screen + '"]').click();
    await page.locator('#s-' + screen + '.active').waitFor();
  };

  await page.goto(origin);
  await page.getByRole('link', { name: 'Create one' }).click();
  await page.locator('#auth-email-inp').fill('new@example.test');
  await page.locator('#auth-pass-inp').fill('test-password');
  await page.locator('#auth-submit-btn').click();
  await page.getByText('Check your email to confirm', { exact: false }).waitFor();
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  assert.ok(await page.locator('#auth-email-inp').isVisible());
  assert.ok(await page.locator('#auth-pass-inp').isHidden());
  await page.locator('#auth-email-inp').fill('a@example.test');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await page.getByText('a reset link will be sent', { exact: false }).waitFor();
  assert.deepEqual(resetRecipients, ['a@example.test']);
  await page.getByRole('link', { name: 'Back to sign in' }).click();
  await signIn(page, users[0].email, 'invalid-password');
  await page.getByText('Incorrect email or password', { exact: false }).waitFor();
  await signIn(page, users[0].email);
  const loadError = page.locator('#collection-request-status');
  await loadError.getByText('Could not load your collection.').waitFor();
  failCollectionLoad = false;
  await loadError.getByRole('button',{name:'Retry'}).click();
  await page.locator('#s-collection').getByText('Journal A 1', { exact: true }).first().waitFor();
  assert.equal(await page.getByText('Journal B 1', { exact: true }).count(), 0);
  const tableRows = page.locator('#s-collection tbody tr');
  const pageStatus = page.locator('#col-pag-info');
  await pageStatus.getByText('Showing 1–10 of 12 entries').waitFor();
  assert.equal(await tableRows.count(),10);
  assert.equal(await page.locator('#cg-grid .cg-card').count(),0);
  await page.getByRole('button',{name:'Next page'}).click();
  assert.equal(await tableRows.count(),2);
  await page.getByRole('button',{name:'Previous page'}).click();
  await page.locator('#col-search-inp').fill('third-only');
  assert.equal(await tableRows.count(),9);
  await page.locator('#col-search-inp').clear();
  await page.locator('#s-collection .pills').getByText('Matches',{exact:true}).click();
  assert.equal(await tableRows.count(),1);
  await tableRows.getByText('Older fixture 8').waitFor();
  await page.locator('#s-collection .pills').getByText('All',{exact:true}).click();
  await page.locator('#s-collection .ph-actions button[onclick*="openModal"]').first().click();
  const tagSearch = page.locator('#tp-search-inp');
  const tag = label => page.locator('#tag-picker').getByRole('button',{name:label,exact:true});
  await tagSearch.fill('music');
  assert.ok(await tag('rap').isVisible());
  assert.ok(await tag('iconic').isVisible());
  assert.equal(await tag('mystery').count(),0);
  await tag('rap').click();
  await tagSearch.fill('movies');
  assert.ok(await tag('mystery').isVisible());
  assert.ok(await tag('espionage').isVisible());
  assert.equal(await tag('rap').count(),0);
  await tagSearch.fill('books cliff hanger');
  assert.ok(await tag('cliffhanger').isVisible());
  await tagSearch.fill('sports');
  assert.ok(await tag('iconic').isVisible());
  assert.ok(await tag('extra time').isVisible());
  await tagSearch.clear();
  assert.equal(await tag('rap').getAttribute('aria-pressed'),'true');
  await tag('rap').click();
  await page.locator('#add-notes').fill('Notes unique to this entry');
  await page.locator('#add-title').fill('Synthetic new journal entry');
  await page.locator('#add-format').selectOption('Book');
  await page.locator('#add-save-btn').click();
  await page.getByText('Could not save the entry.',{exact:false}).waitFor();
  assert.equal(await page.locator('#add-notes').inputValue(),'Notes unique to this entry');
  failJournalSave = false;
  await page.locator('#add-save-btn').click();
  await page.locator('#s-collection').getByText('Synthetic new journal entry', { exact: true }).first().waitFor();

  await page.locator('#s-collection .ph-actions button[onclick*="openModal"]').first().click();
  assert.equal(journalDrafts[0],journalDrafts[1]);
  assert.equal(await page.locator('#add-notes').inputValue(),'');
  assert.equal(await page.locator('#add-title').inputValue(),'');
  await page.locator('#m-add').getByRole('button',{name:'Cancel'}).click();
  await page.locator('#s-collection .tbl-wrap').getByText('Synthetic new journal entry',{exact:true}).click();
  await page.locator('#m-detail').getByRole('button',{name:'Edit',exact:false}).click();
  assert.equal(await page.locator('#add-notes').inputValue(),'Notes unique to this entry');
  await page.keyboard.press('Escape');
  await page.locator('#m-add').waitFor({state:'hidden'});
  await page.locator('#s-collection .ph-actions button[onclick*="openModal"]').first().click();
  assert.equal(await page.locator('#add-modal-title').textContent(),'Add Entry');
  assert.equal(await page.locator('#add-notes').inputValue(),'');
  await page.locator('#m-add').getByRole('button',{name:'Cancel'}).click();

  await page.locator('#s-collection .ph-actions button[onclick*="openModal"]').first().click();
  await page.locator('#add-format').selectOption('Track');
  await page.locator('#add-title').fill('Fixture Track');
  await page.locator('#cs-drop').getByText('Fixture Track',{exact:true}).click();
  await page.locator('#add-source').getByText('Fixture Artist',{exact:false}).waitFor();
  await page.locator('#add-notes').fill('First listen');
  await page.locator('#add-save-btn').click();
  await tableRows.getByText(/^Fixture Track/).click();
  await page.locator('#m-detail').getByRole('button',{name:'Log again'}).click();
  assert.equal(await page.locator('#add-format').inputValue(),'Track');
  assert.equal(await page.locator('#add-notes').inputValue(),'');
  await page.locator('#add-save-btn').click();
  await page.waitForFunction(() => document.querySelectorAll('#s-collection tbody tr .tc-title')
    && Array.from(document.querySelectorAll('#s-collection tbody tr .tc-title')).filter(row=>row.textContent.startsWith('Fixture Track')).length === 2);
  assert.deepEqual(entries.filter(entry=>entry.title==='Fixture Track').map(entry=>entry.catalogue.id),['12345','12345']);

  await visit('designsystem');
  const appearance = page.locator('#s-designsystem');
  const preview = appearance.locator('.appearance-preview');
  const padding = await preview.evaluate(element => getComputedStyle(element).padding);
  const accent = await preview.locator('.btn-glass').evaluate(element => getComputedStyle(element).borderColor);
  await appearance.getByRole('button',{name:'Forest',exact:true}).click();
  await appearance.getByRole('button',{name:'Lavender',exact:true}).click();
  await appearance.getByRole('button',{name:'Compact',exact:true}).click();
  assert.notEqual(await preview.evaluate(element => getComputedStyle(element).padding),padding);
  assert.notEqual(await preview.locator('.btn-glass').evaluate(element => getComputedStyle(element).borderColor),accent);
  await visit('settings');
  await page.getByRole('switch',{name:'Dark mode'}).click();
  await page.reload();
  await page.locator('#s-settings.active').waitFor();
  assert.equal(await page.getByRole('switch',{name:'Dark mode'}).getAttribute('aria-checked'),'true');
  assert.equal(await page.locator('#density-select').inputValue(),'compact');
  assert.equal(await page.locator('#s-settings [data-palette="#2A5A3A"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#s-settings [data-accent="#9B94C0"]').getAttribute('aria-pressed'),'true');

  await visit('discover');
  await page.getByText('Discovery limit reached', { exact: false }).waitFor();
  limitDiscovery = false;
  await page.locator('#discover-request-status').getByRole('button', { name: 'Retry',exact:true }).click();
  await page.locator('#disc-hero-wrap').getByText('Synthetic discovery book').waitFor();
  await page.locator('#disc-hero-wrap').getByText('Close match',{exact:true}).waitFor();
  const scentRetry = page.locator('#discover-style-request-status');
  await scentRetry.getByText('Could not load scent and wardrobe picks.').waitFor();
  const mediaRequestsBeforeStyleRetry = discoveryRequests;
  failStyleLoad = false;
  await scentRetry.getByRole('button',{name:'Retry',exact:true}).click();
  await page.locator('#disc-style-picks').getByRole('heading',{name:'Fragrance picks'}).waitFor();
  assert.equal(discoveryRequests,mediaRequestsBeforeStyleRetry);

  await page.locator('#disc-hero-wrap').getByRole('button', { name: '+ Watchlist' }).click();
  await visit('watchlist');
  await page.locator('#wl-list').getByText('Synthetic discovery book').waitFor();
  assert.equal(discoveryRequests, 2);
  watchlist.push({id:randomUUID(),user_id:users[0].id,title:'Queued film',format:'film',priority:'up_next',saved_at:'2026-09-01',added_to_collection:false});
  await visit('collection');
  await visit('watchlist');
  const priority = page.getByRole('combobox',{name:'Priority for Synthetic discovery book'});
  await priority.selectOption('up_next');
  await page.getByText('Moved to Up Next',{exact:false}).waitFor();
  await page.locator('.wl-stab').getByText('Up Next',{exact:true}).click();
  await page.locator('#wl-list').getByText('Synthetic discovery book').waitFor();
  assert.equal(watchlist[0].priority,'up_next');
  await page.getByRole('button',{name:'Move Synthetic discovery book earlier'}).click();
  await page.getByText('Up Next order saved').waitFor();
  assert.equal(await page.locator('#wl-list .wl-title').first().textContent(),'Synthetic discovery book');
  assert.equal(watchlist[0].queue_position,1);
  await page.getByRole('combobox',{name:'Priority for Queued film'}).selectOption('maybe');
  await page.locator('#wl-list .wl-title').getByText('Queued film').waitFor({state:'hidden'});
  await priority.selectOption('maybe');
  await page.getByText('No Up Next items yet.',{exact:false}).waitFor();
  await page.locator('.wl-stab').getByText('Maybe',{exact:true}).click();
  assert.equal(await priority.inputValue(),'maybe');
  await visit('discover');
  await page.getByRole('button',{name:'Get a fresh batch'}).click();
  await page.locator('#disc-hero-wrap').getByText('Fresh synthetic book').waitFor();
  assert.ok(discoveryInputs.at(-1).recent.some(item => item.title === 'Synthetic discovery book'));
  await visit('watchlist');
  const savedRow = page.locator('#wl-list .wl-item').filter({hasText:'Synthetic discovery book'});
  await savedRow.getByRole('button',{name:'Move to Collection'}).click();
  assert.equal(await page.locator('#add-title').inputValue(),'Synthetic discovery book');
  await page.locator('#add-save-btn').click();
  await page.getByText('Moved to Collection',{exact:false}).waitFor();
  assert.equal(await savedRow.count(),0);
  assert.equal(watchlist[0].added_to_collection,true);
  await visit('collection');
  await page.locator('#s-collection .tbl-wrap').getByText('Synthetic discovery book',{exact:true}).waitFor();
  await page.locator('#s-collection .tbl-wrap').getByText('Journal A 1', {exact:true}).click();
  await page.locator('#m-detail').getByRole('button', {name:'More like this'}).click();
  await page.locator('#disc-hero-wrap').getByText('Seeded synthetic book').waitFor();
  await page.locator('#disc-hero-wrap').getByText('Because you logged Journal A 1', {exact:false}).waitFor();
  await page.locator('#disc-hero-wrap').getByRole('button', {name:'Not for me'}).click();
  await page.getByText('Dismissed from future recommendations.', {exact:false}).waitFor();
  assert.equal(dismissals[0].title, 'Seeded synthetic book');
  await page.getByRole('button',{name:'Clear starting entry'}).click();
  assert.equal(await page.locator('#disc-seed-entry').inputValue(),'');
  await page.getByText('Choose a work to get recommendations connected to it.').waitFor();
  assert.ok(await page.getByRole('button',{name:'Refresh picks'}).isDisabled());
  const forYou = page.locator('.disc-tabs').getByText('For You',{exact:true});
  const hiddenGems = page.locator('.disc-tabs').getByText('Hidden Gems',{exact:true});
  await forYou.click();
  await page.locator('#disc-hero-wrap').getByText('Fresh synthetic book').waitFor();
  await hiddenGems.click();
  await page.locator('#disc-hero-wrap').getByText('Fresh synthetic book').waitFor();
  const requestsBeforeReturn = discoveryRequests;
  await forYou.click();
  await page.locator('#disc-hero-wrap').getByText('Fresh synthetic book').waitFor();
  assert.equal(discoveryRequests,requestsBeforeReturn);
  await page.getByRole('button', {name:'Compare picks'}).click();
  const comparison = page.locator('#m-disc-compare');
  await comparison.getByRole('button',{name:'Compare with the original recommender'}).click();
  await comparison.getByRole('heading', {name:'Set A',exact:true}).waitFor();
  await comparison.getByRole('heading', {name:'Set B',exact:true}).waitFor();
  await comparison.getByLabel('Would try it').first().check();
  await comparison.getByRole('button', {name:'Reveal results'}).click();
  await comparison.getByRole('heading', {name:/Updated/}).waitFor();
  await comparison.getByRole('heading', {name:/Original/}).waitFor();
  await comparison.getByRole('button',{name:'Compare again'}).click();
  await comparison.getByRole('button',{name:'Test the low-rating signal'}).click();
  await comparison.getByText('Signal-based fixture').waitFor();
  assert.equal(await comparison.getByRole('heading',{name:/Favorites/}).count(),0);
  await comparison.getByRole('radio',{name:'Set A'}).check();
  await comparison.getByRole('button',{name:'Reveal results'}).click();
  await comparison.getByRole('heading',{name:/Favorites and low ratings/}).waitFor();
  await comparison.getByText('Your preference:',{exact:false}).waitFor();

  await comparison.getByRole('button', {name:'Close comparison'}).click();

  await visit('fragrances');
  await page.getByText('No fragrances yet', { exact: true }).waitFor();
  assert.equal(stylesCreated.length, 0);
  await page.getByRole('button', { name: 'Import browser fragrances' }).click();
  await page.getByText('Import failed. The original data was kept.', { exact: false }).waitFor();
  assert.ok(await page.evaluate(() => localStorage.getItem('nz_fragrances')));
  failImport = false;
  await page.getByRole('button', { name: 'Import browser fragrances' }).click();
  await page.locator('#frag-grid').getByText('Browser-only sample').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('nz_fragrances')), null);

  await page.locator('#s-fragrances .ph-actions').getByRole('button', { name: 'Add Fragrance' }).click();
  await page.locator('#frag-name').fill('orpheon');
  await page.locator('#frag-cs-drop').getByRole('button', { name: /Orphéon EDP/ }).click();
  assert.equal(await page.locator('#frag-house').inputValue(), 'Diptyque');
  await page.locator('#frag-save-btn').click();
  await page.locator('#frag-grid').getByText('Orphéon EDP').waitFor();

  await page.locator('#s-fragrances .ph-actions').getByRole('button', { name: 'Wardrobe', exact: true }).click();
  await page.locator('#s-wardrobe .ph-actions').getByRole('button', { name: 'Add Item' }).click();
  await page.locator('#ward-name').fill('Tropical Wool');
  await page.locator('#ward-cs-drop').getByRole('button', { name: /Tropical Wool Suit/ }).click();
  assert.equal(await page.locator('#ward-cat').inputValue(), 'Tailoring');
  await page.locator('#ward-photo').fill('https://user-photo.example.test/suit.webp');
  await page.locator('#ward-save-btn').click();
  await page.locator('#ward-grid').getByRole('img',{name:'Tropical Wool Suit',exact:true}).waitFor();
  await page.locator('#ward-grid').getByText('Tropical Wool Suit').click();
  assert.equal(await page.locator('#ward-photo').inputValue(),'https://user-photo.example.test/suit.webp');
  await page.locator('#ward-name').fill('A’s Tropical Wool Suit');
  await page.locator('#ward-save-btn').click();
  await page.locator('#ward-grid').getByText('A’s Tropical Wool Suit').waitFor();

  const otherDevice = await openContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const phone = await otherDevice.newPage();
  phone.setDefaultTimeout(12000);
  phone.on('pageerror', error => errors.push(error.message));
  await phone.goto(origin + '/#wardrobe');
  await signIn(phone, users[0].email);
  await phone.locator('#ward-grid').getByRole('img',{name:'A’s Tropical Wool Suit'}).waitFor();
  await phone.locator('#mni-settings').click();
  await phone.evaluate(() => { document.getElementById('auth-email-inp').value = 'unrelated@example.test'; });
  await phone.locator('#settings-password-btn').click();
  await phone.getByText('a reset link will be sent', { exact: false }).waitFor();
  assert.deepEqual(resetRecipients, ['a@example.test', 'a@example.test']);

  // Narrow phone control bounds supplement touch actions, which can auto-scroll.
  async function fitsPhone(locator,label){
    await locator.waitFor();
    const bounds = await locator.evaluate(element=>{
      const box = element.getBoundingClientRect();
      return {left:box.left,right:box.right,width:innerWidth,viewport:document.documentElement.clientWidth};
    });
    assert.ok(bounds.left >= -1 && bounds.right <= bounds.viewport+1, label+' exceeds phone width: '+JSON.stringify(bounds));
  }
  await phone.setViewportSize({width:320,height:640});
  await phone.locator('#mni-discover').tap();
  await fitsPhone(phone.locator('#disc-sort-sel'),'Discover order');
  await fitsPhone(phone.locator('.disc-format-pills').getByText('Style',{exact:false}),'Discover Style pill');
  const phoneCompare = phone.locator('#m-disc-compare');
  await phone.getByRole('button',{name:'Compare picks'}).tap();
  await phoneCompare.getByRole('button',{name:'Test the low-rating signal'}).tap();
  await phoneCompare.getByRole('heading',{name:'Set A',exact:true}).waitFor();
  await phoneCompare.getByRole('radio',{name:'Set A'}).check();
  await phoneCompare.getByRole('button',{name:'Reveal results'}).tap();
  await phoneCompare.getByText('Your preference:',{exact:false}).waitFor();
  await phoneCompare.getByRole('button',{name:'Close comparison'}).tap();
  await phone.locator('#dtab-because').tap();
  await phone.locator('#disc-seed-entry').selectOption(entries.find(entry=>entry.title==='Journal A 1').id);
  await phone.locator('#disc-hero-wrap').getByText('Seeded synthetic book').waitFor();
  await fitsPhone(phone.locator('#disc-seed-clear'),'Clear starting entry');
  await phone.locator('#disc-seed-clear').tap();
  assert.equal(await phone.locator('#disc-seed-entry').inputValue(),'');


  await phone.locator('#mni-add').tap();
  await phone.locator('#add-format').selectOption('Track');
  await phone.locator('#add-title').fill('Fixture Track');
  await phone.locator('#cs-drop').getByText('Fixture Track',{exact:true}).tap();
  await phone.locator('#tp-search-inp').fill('music rap');
  const phoneTag = phone.locator('#tag-picker').getByRole('button',{name:'rap',exact:true});
  await phoneTag.tap();
  assert.equal(await phoneTag.getAttribute('aria-pressed'),'true');
  await phone.locator('#add-notes').fill('Logged from a phone');
  await phone.locator('#add-save-btn').tap();
  await phone.locator('#m-add').waitFor({state:'hidden'});
  assert.ok(entries.some(entry=>entry.notes==='Logged from a phone' && entry.catalogue?.kind==='track'));

  watchlist.push(...['Mobile first film','Mobile second book'].map((title,index)=>({
    id:randomUUID(),user_id:users[0].id,title,format:index?'book':'film',priority:'up_next',
    saved_at:'2026-09-01',queue_position:index+1,added_to_collection:false
  })));
  await phone.locator('#mni-watchlist').tap();
  await phone.locator('.wl-stab').getByText('Up Next',{exact:true}).tap();
  const move = phone.getByRole('button',{name:'Move Mobile second book earlier'});
  await fitsPhone(move,'Up Next reorder button');
  await move.tap();
  await phone.getByText('Up Next order saved').waitFor();
  assert.equal(await phone.locator('#wl-list .wl-title').first().textContent(),'Mobile second book');

  await phone.locator('#mni-style').tap();
  const addScent = phone.locator('#s-fragrances .ph-actions').getByRole('button',{name:'Add Fragrance'});
  await fitsPhone(addScent,'Add Fragrance');
  await addScent.tap();
  await phone.locator('#frag-name').fill('CK One');
  await phone.locator('#frag-cs-drop').getByRole('button',{name:/CK One/}).first().tap();
  await phone.locator('#frag-status').selectOption('tried');
  await phone.locator('#frag-save-btn').tap();
  await phone.locator('#frag-grid').getByText('CK One',{exact:true}).waitFor();
  await phone.locator('#mni-insights').tap();
  await phone.locator('#insights-style').getByText(/1 tried/).waitFor();
  await phone.locator('#mni-style').tap();
  await phone.locator('#s-fragrances .ph-actions').getByRole('button',{name:'Wardrobe',exact:true}).tap();
  const browseStyle = phone.getByRole('button',{name:'Browse style'});
  await fitsPhone(browseStyle,'Browse style');
  await browseStyle.tap();
  const phoneCategory = phone.locator('#disc-style-category');
  await fitsPhone(phoneCategory,'Style category');
  await phoneCategory.selectOption('Jewelry');
  await verifyPhoto(phone,phone.locator('#disc-content').getByRole('img',{name:'Tutti Frutti Bracelet',exact:true}));

  await phone.locator('#mni-settings').tap();
  await phone.getByRole('button',{name:'Open Design System'}).tap();
  assert.ok(await phone.locator('#s-designsystem').isVisible());
  await phone.locator('#s-designsystem').getByRole('button',{name:'Compact',exact:true}).tap();
  assert.equal(await phone.locator('body').getAttribute('data-density'),'compact');
  await phone.locator('#mobile-back-btn').tap();
  assert.ok(await phone.locator('#s-settings.active').isVisible());


  await page.locator('.user-chip').click();
  await page.locator('#auth-submit-btn').waitFor();
  assert.equal(await page.locator('#frag-grid .frag-card').count(), 0);
  assert.equal(await page.locator('#col-ss-section').getByText('A’s Tropical Wool Suit').count(), 0);
  failStyleLoad = true;
  await signIn(page, users[1].email);
  const wardrobeRetry = page.locator('#wardrobe-request-status');
  await wardrobeRetry.getByText('Could not load your saved items.').waitFor();
  assert.ok(await page.locator('#ward-empty').isHidden());
  failStyleLoad = false;
  await wardrobeRetry.getByRole('button',{name:'Retry',exact:true}).click();
  await page.getByText('No wardrobe items yet', { exact: true }).waitFor();
  assert.equal(await page.getByText('A’s Tropical Wool Suit').count(), 0);
  await visit('fragrances');
  await page.getByRole('button', { name: 'Add 7 sample fragrances' }).click();
  await page.waitForFunction(() => document.querySelectorAll('#frag-grid .frag-card').length === 7);
  for (let index = 0; index < 7; index++) {
    await page.locator('#frag-grid .frag-card').first().click();
    await page.locator('#frag-del-btn').click();
    await page.waitForFunction(count => document.querySelectorAll('#frag-grid .frag-card').length === count, 6 - index);
  }
  await page.reload();
  await page.getByText('No fragrances yet', { exact: true }).waitFor();
  assert.equal(styleItems.filter(row => row.user_id === users[1].id).length, 0);

  await visit('discover');
  const combined = page.locator('#disc-style-picks');
  await combined.getByRole('heading',{name:'Fragrance picks'}).waitFor();
  await combined.getByRole('heading',{name:'Wardrobe picks'}).waitFor();
  await verifyPhoto(page,combined.getByRole('img',{name:'Dior Sauvage Eau de Toilette packaging'}));
  const sauvageCard = combined.getByRole('article').filter({hasText:'Sauvage EDT'});
  assert.match(await sauvageCard.getByRole('link',{name:'Product page'}).getAttribute('href'),/^https:\/\/www\.dior\.com\//);
  await verifyPhoto(page,combined.getByRole('img',{name:'Eau Sauvage bottle'}));
  await verifyPhoto(page,combined.getByRole('img',{name:'1461 Made in England Oxblood Shoes',exact:true}));
  const coloniaCard = combined.locator('article').filter({hasText:'Colonia'});
  await coloniaCard.getByRole('button',{name:'Details'}).click();
  assert.equal(await page.locator('#frag-name').inputValue(),'Colonia');
  assert.ok(await page.locator('#s-discover.active').isVisible());
  await page.locator('#m-fragrance').getByRole('button',{name:'Cancel'}).click();
  await combined.getByRole('button',{name:'Wishlist · Colonia'}).click();
  await page.getByText('Colonia saved as wishlisted',{exact:false}).waitFor();
  await combined.locator('[data-kind="wardrobe"] [data-status="Owned"]').first().click();
  await page.getByText('saved as owned',{exact:false}).waitFor();
  await visit('insights');
  await page.locator('#insights-style').getByText('0 owned · 1 wishlisted · 0 tried').waitFor();
  await page.locator('#insights-style').getByText('1 owned · 0 wishlisted',{exact:true}).waitFor();
  await visit('fragrances');
  await page.locator('#frag-grid').getByRole('img',{name:'Colonia bottle'}).waitFor();
  await visit('discover');
  await page.locator('.disc-format-pills').getByText('Fragrances', { exact: false }).click();
  await page.locator('#disc-search-inp').fill('calvin klein euphoria men');
  const euphoria = page.locator('#disc-search-res .disc-result-item').filter({hasText:'Euphoria Men'});
  const euphoriaImage = euphoria.getByRole('img',{name:'Euphoria Men bottle',exact:true});
  assert.equal(await euphoriaImage.getAttribute('src'),'/catalogues/photos/euphoria-men.webp');
  await verifyPhoto(page,euphoriaImage);
  await page.locator('#disc-search-inp').fill('khamrah qahwa');
  await page.locator('#disc-search-res').getByText('Khamrah Qahwa', { exact: true }).waitFor();
  await page.locator('#disc-search-inp').press('Escape');
  await page.locator('#disc-search-res').waitFor({ state: 'hidden' });
  await page.locator('.disc-format-pills').getByText('Style', { exact: false }).click();
  await page.locator('#disc-style-category').selectOption('Shoes');
  await page.locator('#disc-search-inp').fill('jordan crimson tint');
  const jordanImage = page.locator('#disc-search-res').getByRole('img',{name:'Air Jordan 1 Mid SE Crimson Tint',exact:true});
  assert.equal(await jordanImage.getAttribute('src'),'/catalogues/photos/air-jordan-crimson.webp');
  await verifyPhoto(page,jordanImage);
  await page.locator('#disc-search-inp').fill('dr martens adrian');
  const loafer = page.locator('#disc-search-res .disc-result-item').filter({hasText:'Adrian Smooth Leather Tassel Loafers'});
  await loafer.getByRole('link',{name:'Product page'}).waitFor();
  await loafer.getByRole('button',{name:'Details'}).click();
  assert.equal(await page.locator('#ward-brand').inputValue(),'Dr. Martens');
  assert.equal(await page.locator('#ward-cat').inputValue(),'Shoes');
  await page.locator('#m-wardrobe').getByRole('button',{name:'Cancel'}).click();
  await page.locator('#disc-search-inp').fill('loafer');
  await page.locator('#disc-search-res').getByText('Larson Weejuns Penny Loafers',{exact:true}).waitFor();
  await page.locator('#disc-style-category').selectOption('Jewelry');
  await page.locator('#disc-search-inp').fill('cartier');
  const bracelet = page.locator('#disc-search-res .disc-result-item').filter({hasText:'Tutti Frutti Bracelet'});
  await verifyPhoto(page,bracelet.getByRole('img',{name:'Tutti Frutti Bracelet'}));
  await bracelet.getByRole('button',{name:'Wishlist · Tutti Frutti Bracelet'}).click();
  await visit('wardrobe');
  await page.locator('#s-wardrobe .pills').getByText('Jewelry',{exact:true}).click();
  await verifyPhoto(page,page.locator('#ward-grid').getByRole('img',{name:'Tutti Frutti Bracelet'}));

  await visit('settings');
  await page.locator('#delete-account-btn').click();
  await page.getByText('Account deletion could not be confirmed.', { exact: false }).waitFor();
  assert.ok(await page.locator('#s-settings').isVisible());
  failDelete = false;
  failLogout = true;
  await page.locator('#delete-account-btn').click();
  await page.getByText('Account and saved data deleted.', { exact: false }).waitFor();
  assert.ok(await page.locator('#auth-submit-btn').isVisible());
  await page.reload();
  await page.waitForFunction(() => window.SUPA !== null);
  assert.equal(await page.evaluate(async () => (await SUPA.auth.getSession()).data.session), null);
  assert.ok(await page.locator('#app').isHidden());
  assert.equal(deleteRequests, 2);

  const recovery = await (await openContext()).newPage();
  recovery.setDefaultTimeout(12000);
  recovery.on('pageerror', error => errors.push(error.message));
  const hash = new URLSearchParams({
    type: 'recovery', access_token: jwt(users[0]), refresh_token: 'synthetic-recovery-refresh',
    token_type: 'bearer', expires_in: '3600'
  });
  await recovery.goto(origin + '/#' + hash);
  await recovery.locator('#newpass-inp').fill('new-test-password');
  await recovery.locator('#newpass-confirm-inp').fill('new-test-password');
  await recovery.locator('#newpass-save-btn').click();
  await recovery.getByText('Password updated successfully', { exact: false }).waitFor();
  assert.deepEqual(passwordUpdates, [{ userId: users[0].id, password: 'new-test-password' }]);
  assert.deepEqual(errors, []);
});
