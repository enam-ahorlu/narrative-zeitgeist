const assert = require('node:assert/strict');
const { test } = require('node:test');
const { escHtml, escJs, cssUrl } = require('../assets/html-escape');

const hostile = [
  "x'); alert(1);//",
  '"><img src=x onerror=alert(1)>',
  "back\\slash'quote",
  'line\nbreak\rreturn',
  "</script><script>alert(1)</script>",
  "plain title",
  "O'Brien & \"Sons\""
];

const decodeAttribute = value => value.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

test('escHtml neutralises markup and quotes', () => {
  assert.equal(escHtml('<b a="1">&</b>'), '&lt;b a=&quot;1&quot;&gt;&amp;&lt;/b&gt;');
  assert.equal(escHtml(null), '');
  assert.equal(escHtml(0), '');
});

test('escJs survives an HTML attribute and a JS string and reads back unchanged', () => {
  for (const value of hostile) {
    const attribute = escJs(value);
    assert.ok(!/["<>]/.test(attribute), 'nothing can end the attribute or open a tag: ' + attribute);
    // The browser decodes the attribute, then the JS parser reads the string literal.
    const evaluated = new Function('return \'' + decodeAttribute(attribute) + '\'')();
    assert.equal(evaluated, value);
  }
  assert.equal(escJs(undefined), '');
});

test('cssUrl allows http(s) and site paths and rejects everything else', () => {
  assert.equal(cssUrl('https://image.tmdb.org/t/p/w500/a.jpg'), 'url("https://image.tmdb.org/t/p/w500/a.jpg")');
  assert.equal(cssUrl('/catalogues/photos/a.webp'), 'url("/catalogues/photos/a.webp")');
  assert.equal(cssUrl('https://a.test/x");background:red;("'), 'url("https://a.test/x%22);background:red;(%22")');
  for (const value of ['javascript:alert(1)', 'data:text/html,x', '//evil.test/x', '', null, undefined, 'ftp://x.test/a']) {
    assert.equal(cssUrl(value), 'none');
  }
  assert.ok(!/\s|\n/.test(cssUrl('https://a.test/with space\nnewline').slice(5, -2)));
});
