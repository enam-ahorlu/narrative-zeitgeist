/* Per-account, in-memory coordination for media recommendation batches. */
function createDiscoverySession({ now = Date.now, ttl = 30 * 60 * 1000, limit = 16 } = {}) {
  const batches = new Map();
  const pending = new Map();
  const rounds = new Map();
  const removed = new Set();
  let recent = [];

  function pickKey(item) {
    return JSON.stringify([item.format, item.title.trim().toLowerCase()]);
  }

  function read(key) {
    const batch = batches.get(key);
    if (!batch) return null;
    batches.delete(key);
    if (now() - batch.time >= ttl) return null;
    batches.set(key, batch);
    return batch.picks;
  }

  function load(key, { force, tab, focus, seedId }, fetchBatch) {
    if (pending.has(key)) return pending.get(key);
    const round = (rounds.get(key) || 0) + Number(Boolean(force));
    rounds.delete(key);
    rounds.set(key, round);
    if (rounds.size > limit) rounds.delete(rounds.keys().next().value);

    const previous = recent.filter(item =>
      (!focus || item.format === focus) && (tab !== 'because-loved' || item.seed === seedId)
    ).slice(0, 48);
    const promise = Promise.resolve().then(() => fetchBatch({ tab, focus, seedId, recent:previous, round }))
      .then(picks => {
        const visible = picks.filter(item => !removed.has(pickKey(item)));
        if (pending.get(key) === promise) {
          batches.delete(key);
          batches.set(key, { time:now(), picks:visible });
          if (batches.size > limit) batches.delete(batches.keys().next().value);
        }
        return visible;
      }).finally(() => {
        if (pending.get(key) === promise) pending.delete(key);
      });
    pending.set(key, promise);
    return promise;
  }

  function shown(picks, seed) {
    const seen = new Set();
    const displayed = picks.map(({ title, format }) => ({ title, format, seed }));
    recent = displayed.concat(recent).filter(item => {
      const key = JSON.stringify([pickKey(item),item.seed]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 120);
  }

  function remove(item) {
    const key = pickKey(item);
    removed.add(key);
    for (const batch of batches.values()) {
      batch.picks = batch.picks.filter(pick => pickKey(pick) !== key);
    }
  }

  function invalidate() {
    batches.clear();
    pending.clear();
  }

  return { read, load, shown, remove, invalidate };
}

if (typeof module !== 'undefined') module.exports = { createDiscoverySession };
