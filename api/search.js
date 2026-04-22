// api/search.js — content search proxy
// Routes by type to TMDB (film/show), Open Library (book),
// MusicBrainz (music). API keys stay server-side as Vercel env vars.

const TMDB_KEY = process.env.TMDB_API_KEY;
const RAWG_KEY = process.env.RAWG_API_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { q, type } = req.query;
  if (!q || q.length < 2) return res.json([]);

  try {
    let results = [];

    if (type === 'film') {
      if (!TMDB_KEY) return res.json([]);
      const r = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`
      );
      const data = await r.json();
      results = (data.results || []).slice(0, 7).map(m => ({
        id:          String(m.id),
        title:       m.title || '',
        year:        m.release_date ? m.release_date.slice(0, 4) : '',
        poster_url:  m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
        description: m.overview ? m.overview.slice(0, 80) : ''
      }));

    } else if (type === 'show') {
      if (!TMDB_KEY) return res.json([]);
      const r = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`
      );
      const data = await r.json();
      results = (data.results || []).slice(0, 7).map(s => ({
        id:          String(s.id),
        title:       s.name || '',
        year:        s.first_air_date ? s.first_air_date.slice(0, 4) : '',
        poster_url:  s.poster_path ? `https://image.tmdb.org/t/p/w200${s.poster_path}` : null,
        description: s.overview ? s.overview.slice(0, 80) : ''
      }));

    } else if (type === 'book') {
      const r = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,cover_i&limit=7`
      );
      const data = await r.json();
      results = (data.docs || []).slice(0, 7).map(b => ({
        id:          b.key || '',
        title:       b.title || '',
        year:        b.first_publish_year ? String(b.first_publish_year) : '',
        poster_url:  b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
        description: b.author_name ? `by ${b.author_name[0]}` : ''
      }));

    } else if (type === 'music') {
      const r = await fetch(
        `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(q)}&fmt=json&limit=7`,
        { headers: { 'User-Agent': 'NarrativeZeitgeist/1.0 (personal app)' } }
      );
      const data = await r.json();
      results = (data.releases || []).slice(0, 7).map(rel => ({
        id:          rel.id || '',
        title:       rel.title || '',
        year:        rel.date ? rel.date.slice(0, 4) : '',
        poster_url:  null,
        description: rel['artist-credit']
          ? rel['artist-credit'].map(a => a.name || a.artist?.name || '').join('')
          : ''
      }));

    } else if (type === 'game') {
      if (!RAWG_KEY) return res.json([]);
      const r = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(q)}&page_size=7`
      );
      const data = await r.json();
      results = (data.results || []).slice(0, 7).map(g => ({
        id:          String(g.id),
        title:       g.name || '',
        year:        g.released ? g.released.slice(0, 4) : '',
        poster_url:  g.background_image || null,
        description: g.genres ? g.genres.map(x => x.name).join(', ') : ''
      }));
    }

    res.json(results);

  } catch (err) {
    console.error('search error:', err);
    res.status(500).json([]);
  }
};
