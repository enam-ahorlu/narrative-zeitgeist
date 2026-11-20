// api/discover.js — Vercel serverless function
// Calls Claude API with the user's taste fingerprint and returns personalised recommendations.
// Set ANTHROPIC_API_KEY in Vercel → Project Settings → Environment Variables.

const { authContext } = require('../lib/supabase-server');
const { loadHistory, selectAnchors, makePrompt, verifyRecommendations } = require('../lib/grounded-discovery');

const FORMATS = ['film', 'show', 'book', 'sports_match', 'music'];
const TABS = ['for-you', 'hidden', 'trending', 'because-loved'];
const SAFE_GRADIENT = /^linear-gradient\(\s*\d{1,3}deg\s*,\s*#[a-f\d]{6}\s*,\s*#[a-f\d]{6}\s*\)$/i;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store');

  const auth = await authContext(req);
  if (!auth.userId) return res.status(auth.status).json({ error: auth.error });

  const grounded = req.body?.strategy === 'grounded';
  const input = grounded ? await groundedInput(auth, req.body) : normalizeInput(req.body);
  if (input?.error) return res.status(input.status).json({ error: input.error });
  if (!input) return res.status(400).json({ error: 'A valid taste fingerprint with at least 3 entries is required.' });
  const { fingerprint, entryTitles, tab, becauseTitle, anchors, known } = input;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Discovery is unavailable.' });

  let retryAfter;
  try {
    const quota = await fetch(auth.url + '/rest/v1/rpc/reserve_discovery_request', {
      method: 'POST',
      headers: { ...auth.headers, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(8000)
    });
    if (!quota.ok) throw new Error('Quota request failed');
    retryAfter = await quota.json();
    if (!Number.isInteger(retryAfter) || retryAfter < 0) throw new Error('Invalid quota response');
  } catch {
    return res.status(503).json({ error: 'Discovery is temporarily unavailable. Try again shortly.' });
  }

  if (retryAfter > 0) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Discovery limit reached. Try again in about ' + Math.ceil(retryAfter / 60) + ' minute(s).' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: grounded ? 3500 : 8192,
        messages: [{ role: 'user', content: grounded ? makePrompt(anchors, tab) : buildPrompt(fingerprint, entryTitles, tab, becauseTitle) }]
      }),
      signal: AbortSignal.timeout(grounded ? 24000 : 40000)
    });
    if (!response.ok) {
      console.error('Anthropic Discovery returned status', response.status);
      throw new Error('Provider request failed');
    }

    const result = await response.json();
    const text = (result.content || []).find(block => block.type === 'text')?.text || '';
    const payload = text.match(/\x60\x60\x60(?:json)?\s*([\s\S]*?)\x60\x60\x60/i)?.[1]
      || text.match(/(\[[\s\S]*\])/)?.[1];
    const parsed = JSON.parse(payload);
    const recommendations = grounded
      ? await verifyRecommendations(parsed, anchors, known, tab)
      : normalizeRecommendations(parsed, entryTitles);
    if (grounded && !recommendations.length) {
      return res.status(422).json({ error: 'No unseen catalogue matches could be verified this time. Try again or choose another favorite.' });
    }
    if (!recommendations.length) throw new Error('No usable recommendations');
    return res.status(200).json({ recommendations });
  } catch {
    return res.status(502).json({ error: 'Discovery could not generate recommendations. Try again shortly.' });
  }
};

async function groundedInput(auth, body) {
  const tab = TABS.includes(body.tab) ? body.tab : 'for-you';
  const seedId = body.seedId;
  if (tab === 'because-loved' && (typeof seedId !== 'string' || !/^[0-9a-f-]{36}$/i.test(seedId))) {
    return { status:400, error:'Choose an entry from your collection first.' };
  }
  try {
    const history = await loadHistory(auth);
    const focus = FORMATS.includes(body.focus) ? body.focus : null;
    const anchors = selectAnchors(history.entries, tab === 'because-loved' ? seedId : null, focus);
    if (!anchors.length && tab === 'because-loved') return { status:404, error:'That entry is no longer in your collection.' };
    if (!anchors.length) return { status:422, error:'Rate something at least 7 out of 10 in this format, or pick any logged work in More Like This.' };
    return { tab, anchors, known:history.known };
  } catch {
    return { status:503, error:'Discovery could not read your saved collection. Try again shortly.' };
  }
}

function boundedStrings(value, count, length) {
  return Array.isArray(value)
    ? value.slice(0, count).filter(item => typeof item === 'string' && item.trim())
      .map(item => item.trim().slice(0, length))
    : [];
}

function normalizeInput(body) {
  const raw = body?.fingerprint;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const entryTitles = boundedStrings(body.entryTitles, 100, 200);
  const total = boundedNumber(raw.total_entries, 100000);
  if (Math.max(total, entryTitles.length) < 3) return null;

  const primaryThemes = (Array.isArray(raw.primary_themes) ? raw.primary_themes : [])
    .slice(0, 10).filter(theme => typeof theme?.tag === 'string' && theme.tag.trim())
    .map(theme => ({
      tag: theme.tag.trim().slice(0, 100),
      avg_rating: boundedNumber(theme.avg_rating, 10),
      frequency: boundedNumber(theme.frequency, 100000),
      weight: boundedNumber(theme.weight, 10)
    }));
  const formatBreakdown = {};
  for (const format of FORMATS) {
    const stats = raw.format_breakdown?.[format];
    if (stats && typeof stats === 'object') {
      formatBreakdown[format] = {
        count: boundedNumber(stats.count, 100000),
        avg_rating: boundedNumber(stats.avg_rating, 10)
      };
    }
  }

  return {
    fingerprint: {
      total_entries: total,
      overall_avg_rating: boundedNumber(raw.overall_avg_rating, 10),
      primary_themes: primaryThemes,
      format_breakdown: formatBreakdown
    },
    entryTitles,
    tab: TABS.includes(body.tab) ? body.tab : 'for-you',
    becauseTitle: typeof body.becauseTitle === 'string' ? body.becauseTitle.trim().slice(0, 200) : null
  };
}

function boundedNumber(value, max) {
  if (typeof value !== 'number' && typeof value !== 'string') return 0;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(0, number)) : 0;
}

function normalizeRecommendations(value, entryTitles) {
  if (!Array.isArray(value)) return [];
  const seen = new Set(entryTitles.map(title => title.toLowerCase()));
  const recommendations = [];
  for (const item of value.slice(0, 24)) {
    if (typeof item?.title !== 'string' || !FORMATS.includes(item.format)) continue;
    const title = item.title.trim().slice(0, 200);
    const key = title.toLowerCase();
    if (!key || seen.has(key)) continue;
    const reasons = boundedStrings(item.reasons, 3, 300);
    if (reasons.length !== 3) continue;
    seen.add(key);
    recommendations.push({
      title,
      format: item.format,
      match_score: Math.round(boundedNumber(item.match_score, 99)),
      match_hook: typeof item.match_hook === 'string' ? item.match_hook.slice(0, 250) : '',
      reasons,
      tags: boundedStrings(item.tags, 8, 70),
      cover_color: typeof item.cover_color === 'string' && SAFE_GRADIENT.test(item.cover_color)
        ? item.cover_color : null,
      meta: typeof item.meta === 'string' ? item.meta.slice(0, 250) : ''
    });
  }
  return recommendations.slice(0, 12);
}

/* ── Prompt builder ── */
function buildPrompt(fp, entryTitles, tab, becauseTitle) {
  const themes  = (fp.primary_themes || []).slice(0, 10);
  const formats = fp.format_breakdown || {};
  const totalEntries = fp.total_entries || entryTitles.length || 0;
  const avgRating    = fp.overall_avg_rating != null ? parseFloat(fp.overall_avg_rating).toFixed(1) : 'varied';

  const themeLines = themes.map(t =>
    `  • "${t.tag}": avg rating ${t.avg_rating}, in ${t.frequency} entries, weight ${(t.weight * 10).toFixed(0)}/100`
  ).join('\n');

  const formatLines = Object.entries(formats)
    .map(([fmt, d]) => `  • ${fmt}: ${d.count} entries, avg rating ${d.avg_rating}`)
    .join('\n');

  // Proportion guide
  const totalFmt = Object.values(formats).reduce((s, d) => s + (d.count || 0), 0);
  const proportionGuide = totalFmt > 0
    ? 'Aim for roughly: ' + Object.entries(formats)
        .map(([fmt, d]) => `${d.count} ${fmt}s → ~${Math.max(1, Math.round((d.count / totalFmt) * 12))} recs`)
        .join(', ')
    : '';

  const excludeBlock = entryTitles.length
    ? `\nDO NOT recommend any of these (already in their collection):\n${entryTitles.slice(0, 40).map(t => `  - ${t}`).join('\n')}\n`
    : '';

  let tabInstruction = '';
  if (tab === 'hidden') {
    tabInstruction = '\nFOCUS: Hidden Gems only — cult classics, critically loved but underappreciated works. Avoid anything with massive mainstream awareness. Prioritise depth over fame.';
  } else if (tab === 'trending') {
    tabInstruction = '\nFOCUS: Trending in their genres — recent works (2022–2026) gaining momentum in quality taste circles. Mix proven new releases with emerging titles.';
  } else if (tab === 'because-loved') {
    const topSignal = becauseTitle || themes[0]?.tag || 'their top-rated entry';
    tabInstruction = `\nFOCUS: Works that directly connect to the user's top-rated entry: "${topSignal}". Every recommendation should trace back to why fans of "${topSignal}" would love it — same tone, themes, creators, or cultural moment.`;
  }

  return `You are a taste-aware recommendation engine for Narrative & Zeitgeist, a personal entertainment curator app.

The user has logged ${totalEntries} entries (avg rating: ${avgRating}). Generate 12 highly personalised recommendations using their taste fingerprint below.

TOP THEMES (weighted by frequency × avg rating):
${themeLines}

FORMAT BREAKDOWN:
${formatLines}
${proportionGuide ? '\n' + proportionGuide : ''}
${excludeBlock}${tabInstruction}

Instructions:
- Recommend real, specific titles. Be bold — don't default to the most famous options unless they genuinely fit.
- Tie each recommendation directly to data points in their fingerprint.
- Match score (70–99): be honest. Not everything should be 95+.
- Spread across formats proportionally. If they read, recommend books. If they log music, include music.
- cover_color: a CSS gradient that fits the aesthetic of the work.

Return ONLY a JSON array, no other text:
\`\`\`json
[
  {
    "title": "Succession",
    "format": "show",
    "match_score": 97,
    "match_hook": "Because you love antihero + political drama",
    "reasons": [
      "Antihero ensemble: your #1 weighted theme across all entries",
      "Political power dynamics — your 2nd highest theme at 9.0 avg rating",
      "Moral complexity arc: characters rationalise their own corruption across 4 seasons"
    ],
    "tags": ["antihero", "political drama", "moral complexity", "character-driven"],
    "cover_color": "linear-gradient(135deg,#1B5E76,#4AADBA)",
    "meta": "Show · HBO · 2018–2023"
  }
]
\`\`\`

format must be one of: film, show, book, sports_match, music
reasons must be an array of exactly 3 strings, each citing a specific data point from their fingerprint.`;
}
