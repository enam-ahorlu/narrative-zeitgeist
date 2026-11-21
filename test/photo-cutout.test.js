const test = require('node:test');
const assert = require('node:assert/strict');
const photoCutout = require('../assets/photo-cutout');

function image(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b] = paint(x, y);
    data.set([r, g, b, 255], (y * width + x) * 4);
  }
  return {data, width, height};
}

test('plain background around a subject is removed and the subject kept', () => {
  const photo = image(40, 40, (x, y) => x >= 12 && x < 28 && y >= 12 && y < 28 ? [200, 30, 30] : [250, 250, 250]);
  const result = photoCutout.cutout(photo);
  assert.equal(result.status, 'cutout');
  assert.equal(result.data[(2 * 40 + 2) * 4 + 3], 0);
  assert.equal(result.data[(20 * 40 + 20) * 4 + 3], 255);
});

test('busy backgrounds are left alone', () => {
  const photo = image(40, 40, (x, y) => (x * 7 + y * 13) % 2 ? [20, 20, 20] : [240, 240, 240]);
  assert.equal(photoCutout.cutout(photo).status, 'skip');
});

test('photos with nothing to remove or tiny sizes are skipped', () => {
  assert.equal(photoCutout.cutout(image(40, 40, () => [255, 255, 255])).status, 'skip');
  assert.equal(photoCutout.cutout(image(4, 4, () => [0, 0, 0])).status, 'skip');
});
