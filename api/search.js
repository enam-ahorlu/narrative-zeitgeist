// api/search.js — content search proxy
// Film/Show → TMDB  |  Book → Google Books (fallback: Open Library)
// Music → iTunes    |  Match → TheSportsDB  |  all → parallel across all

const TMDB_KEY   = process.env.TMDB_API_KEY;
const RAWG_KEY   = process.env.RAWG_API_KEY;
const GBOOKS_KEY = process.env.GOOGLE_BOOKS_API_KEY;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchFilms(q) {
  if (!TMDB_KEY) return [];
  const r = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`);
  const d = await r.json();
  return (d.results || []).slice(0, 4).map(m => ({
    id: String(m.id), _type: 'film',
    title: m.title || '',
    year:  m.release_date ? m.release_date.slice(0, 4) : '',
    poster_url:  m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
    description: m.overview   ? m.overview.slice(0, 80) : ''
  }));
}

async function fetchShows(q) {
  if (!TMDB_KEY) return [];
  const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`);
  const d = await r.json();
  return (d.results || []).slice(0, 4).map(s => ({
    id: String(s.id), _type: 'show',
    title: s.name || '',
    year:  s.first_air_date ? s.first_air_date.slice(0, 4) : '',
    poster_url:  s.poster_path ? `https://image.tmdb.org/t/p/w200${s.poster_path}` : null,
    description: s.overview   ? s.overview.slice(0, 80) : ''
  }));
}

async function fetchBooks(q) {
  if (GBOOKS_KEY) {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&key=${GBOOKS_KEY}&maxResults=4&printType=books`);
    const d = await r.json();
    return (d.items || []).slice(0, 4).map(b => {
      const info = b.volumeInfo || {};
      const img  = info.imageLinks || {};
      const raw  = img.thumbnail || img.smallThumbnail || null;
      return {
        id: b.id || '', _type: 'book',
        title: info.title || '',
        year:  info.publishedDate ? info.publishedDate.slice(0, 4) : '',
        poster_url:  raw ? raw.replace('http://', 'https://').replace('&zoom=1', '&zoom=2') : null,
        description: info.authors ? `by ${info.authors[0]}` : ''
      };
    });
  } else {
    const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,cover_i&limit=4`);
    const d = await r.json();
    return (d.docs || []).slice(0, 4).map(b => ({
      id: b.key || '', _type: 'book',
      title: b.title || '',
      year:  b.first_publish_year ? String(b.first_publish_year) : '',
      poster_url:  b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
      description: b.author_name ? `by ${b.author_name[0]}` : ''
    }));
  }
}

async function fetchMusic(q) {
  const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=4`);
  const d = await r.json();
  return (d.results || []).slice(0, 4).map(a => ({
    id: String(a.collectionId || a.trackId || Math.random()), _type: 'music',
    title: a.collectionName || a.trackName || '',
    year:  a.releaseDate ? a.releaseDate.slice(0, 4) : '',
    poster_url:  a.artworkUrl100 ? a.artworkUrl100.replace('100x100bb', '300x300bb') : null,
    description: a.artistName || ''
  }));
}

async function fetchMatch(q) {
  const r = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(q)}`);
  const d = await r.json();
  return (d.event || []).slice(0, 4).map(e => ({
    id: e.idEvent || '', _type: 'match',
    title: e.strEvent || `${e.strHomeTeam || ''} vs ${e.strAwayTeam || ''}`,
    year:  e.dateEvent ? e.dateEvent.slice(0, 4) : '',
    poster_url:  e.strThumb || e.strBanner || null,
    description: [e.strLeague, e.dateEvent].filter(Boolean).join(' · ')
  }));
}

// ── Main handler ─────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { q, type } = req.query;
  if (!q || q.length < 2) return res.json([]);

  try {
    let results = [];

    if (type === 'film') {
      results = await fetchFilms(q);

    } else if (type === 'show') {
      results = await fetchShows(q);

    } else if (type === 'book') {
      results = await fetchBooks(q);

    } else if (type === 'music') {
      results = await fetchMusic(q);

    } else if (type === 'match') {
      results = await fetchMatch(q);

    } else if (type === 'game') {
      if (!RAWG_KEY) return res.json([]);
      const r = await fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(q)}&page_size=4`);
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
