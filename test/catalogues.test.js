const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
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

test('inline application script parses', () => {
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Script(source));
});
