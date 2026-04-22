// api/ratings.js — OMDb external ratings lookup
// Returns IMDb, Rotten Tomatoes, and Metacritic scores for a film or show.
// Requires OMDB_API_KEY environment variable (free at omdbapi.com).

const OMDB_KEY = process.env.OMDB_API_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { title } = req.query;
  if (!title)    return res.json({});
  if (!OMDB_KEY) return res.json({});

  try {
    const url  = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_KEY}`;
    const r    = await fetch(url);
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
    console.error('ratings error:', err.message);
    res.json({});
  }
};
