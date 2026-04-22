// api/discover.js — Vercel serverless function
// Calls Claude API with the user's taste fingerprint and returns personalised recommendations.
// Set ANTHROPIC_API_KEY in Vercel → Project Settings → Environment Variables.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel → Project Settings → Environment Variables.'
    });
  }

  const { fingerprint, entryTitles = [], tab = 'for-you' } = req.body || {};

  if (!fingerprint || !Array.isArray(fingerprint.primary_themes)) {
    return res.status(400).json({ error: 'A valid taste fingerprint is required.' });
  }
  if ((fingerprint.total_entries || 0) < 3) {
    return res.status(400).json({ error: 'Add at least 3 entries with tags to unlock Discovery.' });
  }

  const prompt = buildPrompt(fingerprint, entryTitles, tab);

  let claudeRes;
  try {
    claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  } catch (e) {
    return res.status(500).json({ error: 'Could not reach Claude API: ' + e.message });
  }

  if (!claudeRes.ok) {
    let errMsg = `Claude API error ${claudeRes.status}`;
    try { const d = await claudeRes.json(); errMsg = d.error?.message || errMsg; } catch (_) {}
    return res.status(500).json({ error: errMsg });
  }

  const claudeData = await claudeRes.json();
  const text = (claudeData.content?.[0]?.text) || '';

  // Extract the JSON array from Claude's response
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)\s*```/) ||
    text.match(/```\s*(\[[\s\S]*?\])\s*```/) ||
    text.match(/(\[[\s\S]*\])/);

  if (!jsonMatch) {
    console.error('No JSON found in Claude response:', text.slice(0, 400));
    return res.status(500).json({ error: 'Could not parse recommendations from Claude.' });
  }

  let recommendations;
  try {
    recommendations = JSON.parse(jsonMatch[1]);
  } catch (e) {
    return res.status(500).json({ error: 'Malformed JSON from Claude: ' + e.message });
  }

  return res.status(200).json({ recommendations });
};

/* ── Prompt builder ── */
function buildPrompt(fp, entryTitles, tab) {
  const themes = (fp.primary_themes || []).slice(0, 10);
  const formats = fp.format_breakdown || {};

  const themeLines = themes.map(t =>
    `  • "${t.tag}": avg rating ${t.avg_rating}, in ${t.frequency} entries, weight ${(t.weight * 100).toFixed(0)}/100`
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
    const topTheme = themes[0]?.tag || 'their top theme';
    tabInstruction = `\nFOCUS: Works that directly connect to the user's dominant taste signal: "${topTheme}". Every recommendation should trace back to why this theme resonates with them.`;
  }

  return `You are a taste-aware recommendation engine for Narrative & Zeitgeist, a personal entertainment curator app.

The user has logged ${fp.total_entries} entries (avg rating: ${fp.overall_avg_rating}). Generate 12 highly personalised recommendations using their taste fingerprint below.

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

format must be one of: show, book, sports_match, music
reasons must be an array of exactly 3 strings, each citing a specific data point from their fingerprint.`;
}
