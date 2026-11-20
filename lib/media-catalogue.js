const TMDB_KEY   = process.env.TMDB_API_KEY;
const GBOOKS_KEY = process.env.GOOGLE_BOOKS_API_KEY || process.env.BOOKS_API;

// ── Helpers ──────────────────────────────────────────────────────────────────

/* Wraps fetch() with a 5-second abort timeout so slow third-party APIs
   don't stall the Vercel function up to its hard limit. */
async function fetchWithTimeout(url, timeoutMs = 5000) {
  const response = await fetch(url, {signal: AbortSignal.timeout(timeoutMs)});
  if(!response.ok) throw new Error('Catalogue provider returned ' + response.status);
  return response;
}

async function fetchFilms(q) {
  if (!TMDB_KEY) return [];
  const r = await fetchWithTimeout(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`);
  const d = await r.json();
  return (d.results || []).slice(0, 4).map(m => ({
    provider: "tmdb",
    id: String(m.id), _type: 'film',
    title: m.title || '',
    year:  m.release_date ? m.release_date.slice(0, 4) : '',
    poster_url:  m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : null,
    description: m.overview   ? m.overview.slice(0, 80) : ''
  }));
}

async function fetchShows(q) {
  if (!TMDB_KEY) return [];
  const r = await fetchWithTimeout(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`);
  const d = await r.json();
  return (d.results || []).slice(0, 4).map(s => ({
    provider: "tmdb",
    id: String(s.id), _type: 'show',
    title: s.name || '',
    year:  s.first_air_date ? s.first_air_date.slice(0, 4) : '',
    poster_url:  s.poster_path ? `https://image.tmdb.org/t/p/w200${s.poster_path}` : null,
    description: s.overview   ? s.overview.slice(0, 80) : ''
  }));
}

async function fetchBooksOpenLibrary(q) {
  const r = await fetchWithTimeout(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,cover_i&limit=4`);
  const d = await r.json();
  return (d.docs || []).slice(0, 4).map(b => ({
    provider: 'openlibrary',
    creator: b.author_name?.[0] || '',
    id: b.key || '', _type: 'book',
    title: b.title || '',
    year:  b.first_publish_year ? String(b.first_publish_year) : '',
    poster_url:  b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
    description: b.author_name ? `by ${b.author_name[0]}` : ''
  }));
}

async function fetchBooks(q, {fallback = true} = {}) {
  if (GBOOKS_KEY) {
    try {
      const r = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&key=${GBOOKS_KEY}&maxResults=4&printType=books`);
      const d = await r.json();
      const items = (d.items || []).slice(0, 4).map(b => {
        const info = b.volumeInfo || {};
        const img  = info.imageLinks || {};
        const raw  = img.thumbnail || img.smallThumbnail || null;
        return {
          provider: 'googlebooks',
          creator: info.authors?.[0] || '',
          id: b.id || '', _type: 'book',
          title: info.title || '',
          year:  info.publishedDate ? info.publishedDate.slice(0, 4) : '',
          poster_url:  raw ? raw.replace('http://', 'https://').replace('&zoom=1', '&zoom=2') : null,
          description: info.authors ? `by ${info.authors[0]}` : ''
        };
      });
      // Fall back to Open Library if Google Books returned nothing useful
      if (items.length > 0) return items;
    } catch (_) { /* fall through to Open Library */ }
  }
  return fallback ? fetchBooksOpenLibrary(q) : [];
}

async function fetchMusic(q) {
  const r = await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=4`);
  const d = await r.json();
  return (d.results || []).slice(0, 4).map(a => ({
    provider: 'itunes',
    creator: a.artistName || '',
    id: String(a.collectionId || ''), _type: 'music',
    title: a.collectionName || a.trackName || '',
    year:  a.releaseDate ? a.releaseDate.slice(0, 4) : '',
    poster_url:  a.artworkUrl100 ? a.artworkUrl100.replace('100x100bb', '300x300bb') : null,
    description: a.artistName || ''
  }));
}

async function fetchMatch(q) {
  const r = await fetchWithTimeout(`https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(q)}`);
  const d = await r.json();
  return (d.event || []).slice(0, 4).map(e => ({
    provider: 'thesportsdb',
    id: e.idEvent || '', _type: 'match',
    title: e.strEvent || `${e.strHomeTeam || ''} vs ${e.strAwayTeam || ''}`,
    year:  e.dateEvent ? e.dateEvent.slice(0, 4) : '',
    poster_url:  e.strThumb || e.strBanner || null,
    description: [e.strLeague, e.dateEvent].filter(Boolean).join(' · ')
  }));
}


const searchMedia = {film:fetchFilms, show:fetchShows, book:fetchBooks, music:fetchMusic, sports_match:fetchMatch};
module.exports = { searchMedia, fetchWithTimeout, fetchBooksOpenLibrary };
