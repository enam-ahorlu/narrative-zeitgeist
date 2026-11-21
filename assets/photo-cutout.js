/* Removes a plain studio background from catalogue photos so they sit on the page instead of in a box.
   The pixel work is a pure function (testable); the browser wrapper only handles images the canvas can read. */
const photoCutout = (() => {
  const MAX_SIDE = 420;
  const TOLERANCE = 40;
  const distance = (data, index, color) => Math.hypot(data[index] - color[0], data[index + 1] - color[1], data[index + 2] - color[2]);
  const median = values => values.slice().sort((a, b) => a - b)[values.length >> 1];

  /* image: {data: RGBA array, width, height}. Returns {status, data?, removed}. status is
     'cutout' (data holds the new pixels), 'native' (already transparent) or 'skip' with a reason. */
  function cutout(image) {
    const {width, height} = image;
    const source = image.data;
    if (width < 8 || height < 8) return {status:'skip', reason:'small', removed:0};
    const ring = [];
    for (let x = 0; x < width; x++) { ring.push(x, (height - 1) * width + x); }
    for (let y = 1; y < height - 1; y++) { ring.push(y * width, y * width + width - 1); }
    let transparentRing = 0;
    for (const pixel of ring) if (source[pixel * 4 + 3] < 200) transparentRing++;
    if (transparentRing / ring.length > 0.5) return {status:'native', removed:1};
    const color = [0, 1, 2].map(channel => median(ring.map(pixel => source[pixel * 4 + channel])));
    const close = ring.filter(pixel => distance(source, pixel * 4, color) <= TOLERANCE);
    if (close.length / ring.length < 0.85) return {status:'skip', reason:'busy-background', removed:0};

    const background = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0, tail = 0;
    for (const pixel of close) { if (!background[pixel]) { background[pixel] = 1; queue[tail++] = pixel; } }
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const neighbours = [x > 0 ? pixel - 1 : -1, x < width - 1 ? pixel + 1 : -1, pixel >= width ? pixel - width : -1, pixel < width * (height - 1) ? pixel + width : -1];
      for (const next of neighbours) {
        if (next >= 0 && !background[next] && distance(source, next * 4, color) <= TOLERANCE) {
          background[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    const removed = tail / (width * height);
    if (removed < 0.03) return {status:'skip', reason:'nothing-to-remove', removed};
    if (removed > 0.96) return {status:'skip', reason:'subject-lost', removed};

    /* Soft edge: average the hard mask over a 3x3 window, then take the background colour back out of edge pixels. */
    const out = new Uint8ClampedArray(source.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = y * width + x;
        let covered = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) { covered++; count++; continue; }
            covered += background[ny * width + nx] ? 0 : 1;
            count++;
          }
        }
        const alpha = background[pixel] ? 0 : covered / count;
        const at = pixel * 4;
        if (alpha === 0) continue;
        for (let channel = 0; channel < 3; channel++) {
          const value = alpha < 1 ? (source[at + channel] - color[channel] * (1 - alpha)) / alpha : source[at + channel];
          out[at + channel] = value;
        }
        out[at + 3] = Math.round(alpha * (source[at + 3] / 255) * 255);
      }
    }
    return {status:'cutout', data:out, removed};
  }

  const cache = new Map();
  /* Browser: replace a loaded photo with its cut-out version, or mark it as 'skip' so CSS can frame it instead. */
  function apply(img) {
    if (img.dataset.cutout) return;
    const original = img.currentSrc || img.src;
    if (cache.has(original)) {
      const hit = cache.get(original);
      img.dataset.cutout = hit ? 'done' : 'skip';
      if (hit) img.src = hit;
      return;
    }
    try {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const context = canvas.getContext('2d', {willReadFrequently:true});
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height); /* throws for cross-origin photos */
      const result = cutout(pixels);
      if (result.status === 'cutout') {
        context.putImageData(new ImageData(result.data, canvas.width, canvas.height), 0, 0);
        const url = canvas.toDataURL('image/png');
        cache.set(original, url);
        img.dataset.cutout = 'done';
        img.src = url;
      } else {
        cache.set(original, result.status === 'native' ? original : null);
        img.dataset.cutout = result.status === 'native' ? 'done' : 'skip';
      }
    } catch {
      cache.set(original, null);
      img.dataset.cutout = 'skip';
    }
  }

  return {cutout, apply};
})();
if (typeof module !== 'undefined') module.exports = photoCutout;
