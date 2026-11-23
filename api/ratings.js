// api/ratings.js — OMDb external ratings lookup
// Returns IMDb, Rotten Tomatoes, and Metacritic scores for a film or show.
// Requires OMDB_API_KEY environment variable (free at omdbapi.com).

const { fetchWithTimeout } = require('../lib/media-catalogue');
const { authContext, allowCatalogueRequest } = require('../lib/supabase-server');


module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const auth = await authContext(req, { cacheMs: 30000 });
  if (!auth.userId) return res.status(auth.status).json({ error: auth.error });
  const { title, type, year, provider, id } = req.query || {};
  if (typeof title !== 'string' || !title.trim() || title.length > 300) return res.json({});
  const apiKey = process.env.OMDB_API_KEY || process.env.OMDb_API;
  if (!apiKey) return res.json({});
  if (!await allowCatalogueRequest(auth,'ratings',res)) return;

  try {
    const params = new URLSearchParams({apikey:apiKey});
    let imdbId = provider === 'imdb' ? id : null;
    if (provider === 'tmdb' && /^\d{1,12}$/.test(id) && ['movie','series'].includes(type) && process.env.TMDB_API_KEY) {
      const kind = type === 'series' ? 'tv' : 'movie';
      const ids = await fetchWithTimeout('https://api.themoviedb.org/3/'+kind+'/'+id+'/external_ids?api_key='+encodeURIComponent(process.env.TMDB_API_KEY));
      imdbId = (await ids.json()).imdb_id;
    }
    if (/^tt\d{7,12}$/.test(imdbId)) params.set('i',imdbId);
    else {
      params.set('t',title.trim());
      if (/^\d{4}$/.test(year)) params.set('y',year);
      if (['movie','series'].includes(type)) params.set('type',type);
    }
    const r = await fetchWithTimeout('https://www.omdbapi.com/?'+params);
    const data = await r.json();

    if (data.Response === 'False') return res.json({});

    const result = {};

    if (data.imdbRating && data.imdbRating !== 'N/A') {
      result.imdb = data.imdbRating + '/10';
    }
    if (data.imdbVotes && data.imdbVotes !== 'N/A') {
      result.imdbVotes = data.imdbVotes;
    }

    const ratings = data.Ratings || [];
    const rt = ratings.find(x => x.Source === 'Rotten Tomatoes');
    if (rt) result.rt = rt.Value;

    const mc = ratings.find(x => x.Source === 'Metacritic');
    if (mc) result.metacritic = mc.Value;

    res.json(result);

  } catch (err) {
    console.error('External ratings unavailable');
    res.json({});
  }
};
