const assert = require('node:assert/strict');
const { existsSync, readdirSync, readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext, Script } = require('node:vm');

const html = readFileSync('index.html', 'utf8');
const canonical = text => text.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

function checkCatalogue(file, variable, length, keyColumns, minCount) {
  assert.ok(html.includes('src="/' + file + '"'));
  const context = {};
  runInNewContext(readFileSync(file, 'utf8'), context);
  const rows = context[variable];
  const keys = new Set();
  assert.ok(rows.length >= minCount);
  for (const row of rows) {
    assert.equal(row.length, length);
    assert.ok(row.every(item => typeof item === 'string'));
    const key = keyColumns.map(index => canonical(row[index])).join('|');
    assert.ok(!keys.has(key), 'duplicate catalogue item ' + row[0]);
    keys.add(key);
  }
  return rows;
}

function optionValues(id) {
  const select = html.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'))[1];
  return new Set([...select.matchAll(/<option value="([^"]+)"/g)].map(m => m[1]));
}

test('expanded catalogues are distinct and compatible with form pickers', () => {
  const fragrance = checkCatalogue('catalogues/fragrances.js', 'FRAG_DB', 8, [0, 1], 290);
  const wardrobe = checkCatalogue('catalogues/wardrobe.js', 'WARD_STYLE_DB', 7, [0], 90);
  const projection = optionValues('frag-proj');
  const scentSeason = optionValues('frag-season');
  const category = optionValues('ward-cat');
  const styleSeason = optionValues('ward-season');
  for (const row of fragrance) {
    assert.ok(row[0] && row[1] && row[5]);
    assert.ok(projection.has(row[6]), row[0] + ': ' + row[6]);
    assert.ok(scentSeason.has(row[7]), row[0] + ': ' + row[7]);
  }
  for (const row of wardrobe) {
    assert.ok(row[0] && row[6]);
    assert.ok(category.has(row[1]), row[0] + ': ' + row[1]);
    assert.ok(styleSeason.has(row[5]), row[0] + ': ' + row[5]);
  }
});

test('catalogue photos match named products and include source and reuse credits', () => {
  const read = (file, expression) => runInNewContext(readFileSync(file,'utf8') + '\n' + expression);
  const { productKey } = require('../assets/style-recommendations');
  const { scents, scentPhotos } = read('catalogues/fragrances.js','({scents:FRAG_DB,scentPhotos:FRAGRANCE_PHOTOS})');
  const { products, wardrobePhotos, productLinks } = read('catalogues/wardrobe.js',
    '({products:WARD_PRODUCTS,wardrobePhotos:WARDROBE_PHOTOS,productLinks:WARD_PRODUCT_LINKS})');
  assert.ok(products.length >= 120);
  const categories = new Set(products.map(row=>row[1]));
  for (const category of ['Tops','Bottoms','Dresses','Knitwear','Outerwear','Tailoring','Shoes','Bags','Jewelry','Accessories']) {
    assert.ok(categories.has(category),category);
  }
  assert.ok(products.filter(([name])=>/loafer/i.test(name)).length >= 5);
  assert.ok(products.every(([name,,brand])=>name && brand));
  const wardrobeKeys = products.map(([name,,brand])=>productKey(name,brand));
  for (const category of categories) {
    assert.ok(products.some(([name,type,brand])=>type === category && wardrobePhotos[productKey(name,brand)]),category);
  }
  for (const [photos,keys,min] of [[scentPhotos,scents.map(([name,house])=>productKey(name,house)),32],
    [wardrobePhotos,wardrobeKeys,40]]) {
    assert.ok(Object.keys(photos).length >= min);
    for (const [key,photo] of Object.entries(photos)) {
      assert.ok(keys.includes(key),key);
      assert.match(photo.source,/^https:\/\/(commons\.wikimedia\.org\/wiki\/File:|risdmuseum\.org\/art-design\/collection\/)/);
      assert.match(photo.license,/^https:\/\/creativecommons\.org\//);
      assert.ok(photo.credit);
      if (photo.url.startsWith('/')) assert.ok(existsSync(photo.url.slice(1)),photo.url);
      else assert.match(photo.url,/^https:\/\/upload\.wikimedia\.org\//);
    }
  }
  const bundledPhotos = [...Object.values(scentPhotos),...Object.values(wardrobePhotos)]
    .map(photo=>photo.url)
    .filter(url=>url.startsWith('/catalogues/photos/'))
    .map(url=>url.split('/').at(-1))
    .sort();
  assert.deepEqual(bundledPhotos,readdirSync('catalogues/photos').sort());
  for (const [key,url] of Object.entries(productLinks)) {
    assert.ok(wardrobeKeys.includes(key),key);
    assert.equal(new URL(url).protocol,'https:');
  }
});

test('inline application script parses', () => {
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Script(source));
});
