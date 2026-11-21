const test = require('node:test');
const assert = require('node:assert/strict');
const taste = require('../shared/taste-insights');

const entry = (title, format, rating, tags = [], date = null, catalogue = null) =>
  ({title, format, rating, tags, date_completed:date, catalogue});

test('empty and tiny libraries do not break the overview', () => {
  const empty = taste.summarize([]);
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.highlights, []);
  assert.equal(empty.avg, null);
  assert.doesNotThrow(() => taste.summarize([entry('Only', 'film', null)]));
  assert.equal(taste.summarize(null).total, 0);
});

test('format mix, rating spread and extremes summarise the whole collection, not just tags', () => {
  const entries = [
    entry('A', 'film', 9), entry('B', 'film', 8.5), entry('C', 'book', 6), entry('D', 'book', 7),
    entry('E', 'show', 10), entry('F', 'music', null)
  ];
  const summary = taste.summarize(entries);
  assert.deepEqual(summary.formats.map(item => [item.format, item.count]), [['book', 2], ['film', 2], ['music', 1], ['show', 1]]);
  assert.equal(summary.formats.find(item => item.format === 'film').avg, 8.8);
  assert.equal(summary.formats.find(item => item.format === 'music').avg, null);
  assert.deepEqual(summary.spread.map(band => band.count), [0, 1, 1, 1, 2]);
  assert.deepEqual(summary.extremes.high.map(item => item.title), ['E', 'A', 'B']);
  assert.deepEqual(summary.extremes.low.map(item => item.title), ['C', 'D']);
  assert.ok(summary.highlights.some(line => /books|films/.test(line) && /highest/.test(line)));
});

test('quarters, drift and eras use real dates and years only', () => {
  const entries = [
    entry('1', 'film', 6, [], '2025-01-10'), entry('2', 'film', 6, [], '2025-02-10'), entry('3', 'film', 7, [], '2025-05-10'),
    entry('4', 'book', 8, [], '2025-08-10'), entry('5', 'book', 9, [], '2025-11-10'), entry('6', 'film', 9, [], '2026-01-10'),
    entry('7', 'film', 9, [], '2026-02-10'), entry('8', 'show', 9, [], '2026-03-10'), entry('9', 'show', 9, [], '2026-04-10'),
    entry('undated', 'film', 1)
  ];
  const summary = taste.summarize(entries);
  assert.equal(summary.datedCount, 9);
  assert.deepEqual(summary.quarters.map(q => [q.label, q.total]), [['2025 Q1', 2], ['2025 Q2', 1], ['2025 Q3', 1], ['2025 Q4', 1], ['2026 Q1', 3], ['2026 Q2', 1]]);
  assert.equal(summary.drift.direction, 'rising');
  assert.equal(summary.drift.early, 6.3);
  assert.equal(summary.drift.recent, 9);
  const eras = taste.decades([1990, 1994, 1999, 2010, 2011].map(year => entry('x' + year, 'film', 8, [], null, {year:String(year)})));
  assert.deepEqual(eras.bins.map(bin => [bin.label, bin.count]), [['1990s', 3], ['2010s', 2]]);
  assert.equal(eras.withYear, 5);
});

test('cross-format tags and tag pairs are found, case-insensitively', () => {
  const entries = [
    entry('A', 'film', 9, ['Mystery', 'noir']), entry('B', 'book', 8, [{name:'mystery'}, {name:'Noir'}]),
    entry('C', 'show', 7, ['mystery']), entry('D', 'film', 9, ['heist'])
  ];
  const summary = taste.summarize(entries);
  assert.deepEqual(summary.bridges.map(item => [item.tag, item.formats]), [['mystery', ['book', 'film', 'show']], ['noir', ['book', 'film']]]);
  assert.deepEqual(summary.pairs, [{tags:['mystery', 'noir'], count:2}]);
});

test('highlights are plain sentences without dashes', () => {
  const entries = Array.from({length:12}, (_, index) => entry('T' + index, index % 2 ? 'film' : 'book', 8 + (index % 3) * 0.5, ['mystery'], '2025-' + String((index % 12) + 1).padStart(2, '0') + '-05'));
  const lines = taste.summarize(entries).highlights;
  assert.ok(lines.length >= 3);
  for (const line of lines) assert.doesNotMatch(line, /[—–]/);
});
