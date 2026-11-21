const assert = require('node:assert/strict');
const { test } = require('node:test');
const { create, productKey, matchesSaved, page } = require('../assets/style-recommendations');

const scents = [
  ['Bold','House A','Cedar','Amber','Moss','Warm, woody','Moderate','Winter'],
  ['Clear','House B','Lemon','Mint','Musk','Fresh, clean','Light','Summer'],
  ['Deep','House A','Cedar','Amber','Moss','Warm, woody','Moderate','Winter'],
  ['Bold','House C','Rose','Iris','Vanilla','Floral, sweet','Strong','Year-round']
];
const wardrobe = [
  ['Wool Jacket','Outerwear','Sample','tailored, minimalist','work, formal','Winter','Pair with trousers'],
  ['Straight Trousers','Bottoms','Sample','tailored, classic','work, formal','Winter','Pair with a jacket'],
  ['Kente Shirt','Tops','Sample','casual, graphic','weekend','Summer','Pair with denim']
];
const photos = { [productKey('Clear','House B')]:{url:'fixture'} };

test('scent profiles weight wishes below tried and rated items and enrich missing notes', () => {
  const model = create(scents,wardrobe,photos);
  const items = [
    {name:'Bold',house:'House A',status:'wishlisted'},
    {name:'Other scent',house:'Other house',status:'tried',notesTop:'Bergamot'},
    {name:'Favorite',house:'An artisan',rating:9,status:'Owned',notesBase:'Frankincense'}
  ];
  const { profile, picks } = model.scent(items);
  assert.deepEqual(profile.statuses,{owned:1,wishlisted:1,tried:1});
  assert.equal(profile.notes.cedar,0.1);
  assert.equal(profile.notes.bergamot,0.5);
  assert.equal(profile.notes.frankincense,0.9);
  assert.equal(picks[0].name,'Deep');
  assert.ok(picks.some(pick=>pick.name==='Bold' && pick.house==='House C'));
  assert.ok(!picks.some(pick=>pick.name==='Bold' && pick.house==='House A'));
  assert.ok(picks[0].reasons.some(reason=>reason.includes('cedar')));
  assert.equal(model.scent(items).picks,picks);
  const edited = items.map(item=>item.name==='Other scent' ? {...item,notesTop:'Orange'} : item);
  assert.equal(model.scent(edited).profile.notes.bergamot,undefined);
  assert.equal(model.scent(edited).profile.notes.orange,0.5);
});

test('cold scent picks lead with a photographed item and legacies without a house exclude the saved name', () => {
  const model = create(scents,wardrobe,photos);
  assert.equal(model.scent([]).picks[0].name,'Clear');
  assert.ok(!model.scent([{name:'Bold'}]).picks.some(pick=>pick.name==='Bold'));
  assert.ok(matchesSaved('fragrance',{name:' Éclair ',house:''},{name:'Eclair',house:'House A'}));
  assert.ok(!matchesSaved('fragrance',{name:'Éclair',house:'House B'},{name:'Eclair',house:'House A'}));
});

test('wardrobe ranking uses saved tags and occasions and excludes normalized matches', () => {
  const model = create(scents,wardrobe);
  assert.match(model.wardrobe([]).picks[0].reasons[0],/catalogue/);
  const {profile,picks} = model.wardrobe([
    {name:'  Wool Jacket  ',category:'Outerwear',status:'Wishlisted',tags:['Tailored'],occasion:'Work, Everyday',season:'Winter'}
  ]);
  assert.equal(profile.tags.tailored,1);
  assert.equal(profile.statuses.wishlisted,1);
  assert.deepEqual(picks.map(pick=>pick.name),['Straight Trousers','Kente Shirt']);
  assert.ok(picks[0].reasons.some(reason=>reason.includes('tailored')));
  assert.ok(picks[0].score>picks[1].score);
});

test('catalogue paging wraps without repeating a pick in a short list', () => {
  assert.deepEqual(page(['A','B','C'],2,25),['C','A','B']);
  assert.deepEqual(page(['A','B','C'],4,2),['B','C']);
  assert.deepEqual(page([],1,2),[]);
});

test('catalogue search accepts brand and product together and common category spellings', () => {
  const { matchesQuery } = require('../assets/style-recommendations');
  assert.ok(matchesQuery('dr martens adrian footwear',['Adrian Tassel Loafers','Dr. Martens','Shoes']));
  assert.ok(matchesQuery('cartier jewellery',['Trinity Ring','Cartier','Jewelry']));
  assert.equal(matchesQuery('cartier loafers',['Trinity Ring','Cartier','Jewelry']),false);
});
