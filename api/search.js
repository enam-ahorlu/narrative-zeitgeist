// api/search.js — content search proxy
// Film/Show → TMDB  |  Book → Google Books (fallback: Open Library)
// Music → iTunes    |  Match → TheSportsDB  |  all → parallel across all

const { searchMedia, fetchWithTimeout } = require('../lib/media-catalogue');
const { authContext, allowCatalogueRequest } = require('../lib/supabase-server');
const { film:fetchFilms, show:fetchShows, book:fetchBooks, music:fetchMusic, sports_match:fetchMatch } = searchMedia;
const RAWG_KEY = process.env.RAWG_API_KEY;

// ── Main handler ─────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const auth = await authContext(req, { cacheMs: 30000 });
  if (!auth.userId) return res.status(auth.status).json({ error: auth.error });
  const { q, type } = req.query || {};
  if (typeof q !== 'string' || q.trim().length < 2 || q.length > 300) return res.json([]);

  if (!await allowCatalogueRequest(auth,'search',res)) return;
  try {
    let results = [];

    if (type === 'film') {
      results = await fetchFilms(q);

    } else if (type === 'show') {
      results = await fetchShows(q);

    } else if (type === 'book') {
      results = await fetchBooks(q);

    } else if (type === 'music' || type === 'track') {
      results = await fetchMusic(q,{kind:type === 'track' ? 'track' : 'album'});

    } else if (type === 'match') {
      results = await fetchMatch(q);

    } else if (type === 'game') {
      if (!RAWG_KEY) return res.json([]);
      const r = await fetchWithTimeout(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(q)}&page_size=4`);
      const d = await r.json();
      results = (d.results || []).slice(0, 4).map(g => ({
        id: String(g.id), _type: 'game',
        title: g.name || '',
        year:  g.released ? g.released.slice(0, 4) : '',
        poster_url:  g.background_image || null,
        description: g.genres ? g.genres.map(x => x.name).join(', ') : ''
      }));

    } else if (type === 'all') {
      // ── Search everything in parallel, top 3 per category ─────────────────
      const settled = await Promise.allSettled([
        fetchFilms(q), fetchShows(q), fetchBooks(q), fetchMusic(q), fetchMatch(q)
      ]);
      // Interleave: up to 3 from each, round-robin so no category dominates
      const buckets = settled.map(r => r.status === 'fulfilled' ? r.value.slice(0, 3) : []);
      const maxLen  = Math.max(...buckets.map(b => b.length));
      for (let i = 0; i < maxLen; i++) {
        for (const bucket of buckets) {
          if (bucket[i]) results.push(bucket[i]);
        }
      }
      results = results.slice(0, 12);
    }

    res.json(results);

  } catch (err) {
    console.error('search error:', err.message);
    res.status(500).json([]);
  }
};
