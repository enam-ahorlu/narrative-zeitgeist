// api/search.js — content search proxy
// Film/Show → TMDB  |  Book → Google Books (fallback: Open Library)
// Music → iTunes    |  Match → TheSportsDB

const TMDB_KEY        = process.env.TMDB_API_KEY;
const RAWG_KEY        = process.env.RAWG_API_KEY;
const GBOOKS_KEY      = process.env.GOOGLE_BOOKS_API_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { q, type } = req.query;
  if (!q || q.length < 2) return res.json([]);

  try {
    let results = [];

    // ── Films ────────────────────────────────────────────────────────────────
    if (type === 'film') {
      if (!TMDB_KEY) return res.json([]);
      const r    = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`);
      const data = await r.json();
      results = (data.results || []).slice(0, 7).map(m => ({
        id:          String(m.id),
        title:       m.title || '',
        year:        m.release_date ? m.release_date.slice(0, 4) : '',
        poster_url:  m.poster_path  ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
        description: m.overview     ? m.overview.slice(0, 80) : ''
      }));

    // ── TV Shows ─────────────────────────────────────────────────────────────
    } else if (type === 'show') {
      if (!TMDB_KEY) return res.json([]);
      const r    = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`);
      const data = await r.json();
      results = (data.results || []).slice(0, 7).map(s => ({
        id:          String(s.id),
        title:       s.name || '',
        year:        s.first_air_date ? s.first_air_date.slice(0, 4) : '',
        poster_url:  s.poster_path    ? `https://image.tmdb.org/t/p/w200${s.poster_path}` : null,
        description: s.overview       ? s.overview.slice(0, 80) : ''
      }));

    // ── Books — Google Books preferred, Open Library fallback ────────────────
    } else if (type === 'book') {
      if (GBOOKS_KEY) {
        const r    = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&key=${GBOOKS_KEY}&maxResults=7&printType=books`);
        const data = await r.json();
        results = (data.items || []).slice(0, 7).map(b => {
          const info = b.volumeInfo || {};
          const img  = info.imageLinks || {};
          const raw  = img.thumbnail || img.smallThumbnail || null;
          return {
            id:          b.id || '',
            title:       info.title || '',
            year:        info.publishedDate ? info.publishedDate.slice(0, 4) : '',
            poster_url:  raw ? raw.replace('http://', 'https://').replace('&zoom=1', '&zoom=2') : null,
            description: info.authors ? `by ${info.authors[0]}` : ''
          };
        });
      } else {
        // Open Library fallback
        const r    = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,cover_i&limit=7`);
        const data = await r.json();
        results = (data.docs || []).slice(0, 7).map(b => ({
          id:          b.key || '',
          title:       b.title || '',
          year:        b.first_publish_year ? String(b.first_publish_year) : '',
          poster_url:  b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
          description: b.author_name ? `by ${b.author_name[0]}` : ''
        }));
      }

    // ── Music — iTunes Search (no key, album art included) ───────────────────
    } else if (type === 'music') {
      const r    = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=7`);
      const data = await r.json();
      results = (data.results || []).slice(0, 7).map(a => ({
        id:          String(a.collectionId || a.trackId || Math.random()),
        title:       a.collectionName || a.trackName || '',
        year:        a.releaseDate    ? a.releaseDate.slice(0, 4) : '',
        poster_url:  a.artworkUrl100  ? a.artworkUrl100.replace('100x100bb', '300x300bb') : null,
        description: a.artistName    || ''
      }));

    // ── Sports Matches — TheSportsDB ─────────────────────────────────────────
    } else if (type === 'match') {
      const r    = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(q)}`);
      const data = await r.json();
      results = (data.event || []).slice(0, 7).map(e => ({
        id:          e.idEvent || '',
        title:       e.strEvent || `${e.strHomeTeam || ''} vs ${e.strAwayTeam || ''}`,
        year:        e.dateEvent  ? e.dateEvent.slice(0, 4) : '',
        poster_url:  e.strThumb  || e.strBanner || null,
        description: [e.strLeague, e.dateEvent].filter(Boolean).join(' · ')
      }));

    // ── Games — RAWG ─────────────────────────────────────────────────────────
    } else if (type === 'game') {
      if (!RAWG_KEY) return res.json([]);
      const r    = await fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(q)}&page_size=7`);
      const data = await r.json();
      results = (data.results || []).slice(0, 7).map(g => ({
        id:          String(g.id),
        title:       g.name || '',
        year:        g.released        ? g.released.slice(0, 4) : '',
        poster_url:  g.background_image || null,
        description: g.genres          ? g.genres.map(x => x.name).join(', ') : ''
      }));
    }

    res.json(results);

  } catch (err) {
    console.error('search error:', err.message);
    res.status(500).json([]);
  }
};
