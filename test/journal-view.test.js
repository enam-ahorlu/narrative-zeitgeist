const assert = require('node:assert/strict');
const { test } = require('node:test');
const { formatKey, collectionPage, defaultFilters, watchlistView } = require('../assets/journal-view');
const { presets, search } = require('../catalogues/tags');

test('journal uses the same format labels for search, entry forms, and browsing', () => {
  for (const label of ['Match', 'Matches', 'match', 'sports_match']) assert.equal(formatKey(label), 'sports_match');
  assert.equal(formatKey('All'), null);
  assert.equal(formatKey('Fragrances'), 'fragrance');
  assert.equal(formatKey('Wardrobe'), 'wardrobe');
});

test('collection filters complete data before sorting, clamping and paginating', () => {
  const entries = [
    { title:'Zulu', format:'book', rating:null, tags:['one','two','third'], created_at:'2025-01-01' },
    { title:'Alpha', format:'sports_match', rating:0, catalogue:{year:'1994'}, tags:['third'], date_completed:'2026-01-01', created_at:'2025-01-01' },
    { title:'Bravo', format:'book', rating:9, tags:['third-person'], created_at:'2024-01-01' }
  ];
  const filters = defaultFilters();
  const project = (extra, sort = 'title_asc', page = 10) => collectionPage(entries,{...filters,...extra},sort,page,1);
  const result = project({ search:'THIRD' });
  assert.equal(result.page,3);
  assert.equal(result.count,3);
  assert.equal(result.start,2);
  assert.deepEqual(result.visible,[entries[0]]);
  assert.equal(project({ tags:['third'] }).count,2);
  assert.deepEqual(project({ratingMax:0}).visible,[entries[1]]);
  assert.equal(project({yearFrom:1994,yearTo:1994}).count,1);
  assert.deepEqual(project({ format:'Matches', ratingMax:0, yearTo:2024 }).visible,[entries[1]]);
  assert.equal(project({ format:'Matches',yearFrom:2025 }).count,0);
  assert.deepEqual(project({},'rating_desc',1).visible,[entries[2]]);
  assert.deepEqual(entries.map(entry=>entry.title),['Zulu','Alpha','Bravo']);
});

test('legacy Watchlist items without priority appear in Maybe and sorting leaves source order intact', () => {
  const items = [
    { title:'Zebra', priority:null },
    { title:'Aurora', priority:'maybe' },
    { title:'Caravan', priority:'up_next' }
  ];
  assert.deepEqual(watchlistView(items,'maybe','alpha'),[items[1],items[0]]);
  assert.deepEqual(watchlistView(items,'up_next','date'),[items[2]]);
  assert.equal(items[0].title,'Zebra');
});

test('tag taxonomy retains shared, exclusive, universal, and saved personal tags', () => {
  const music = search('music');
  assert.equal(music.format,'music');
  assert.ok(music.matches('rap'));
  assert.ok(music.matches('iconic'));
  assert.ok(music.matches('my custom tag'));
  assert.ok(!music.matches('espionage'));
  assert.ok(search('movies').matches('mystery'));
  assert.ok(search('books cliff hanger').matches('cliffhanger'));
  assert.ok(search('albums hip hop').matches('hip-hop'));
  assert.ok(search('').matches('espionage'));
  for (const tag of ['mystery','rap','iconic','extra time']) assert.ok(presets.includes(tag));
});
