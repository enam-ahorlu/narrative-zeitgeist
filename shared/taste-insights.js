/* global mediaIdentity */
/* Taste overview computed from the logged entries: formats, rating habits, pace and drift over time,
   tags that cut across formats, tag pairs, release decades, highs and lows, repeats.
   Pure functions, no DOM, so the same code runs in the browser and in tests. */
const tasteInsights = (() => {
  const FORMAT_NAMES = {film:'films', show:'shows', book:'books', sports_match:'matches', music:'music'};
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const round1 = value => value === null ? null : Math.round(value * 10) / 10;
  const ratingOf = entry => {
    const value = Number(entry.rating);
    return entry.rating !== null && entry.rating !== undefined && entry.rating !== '' && Number.isFinite(value) ? value : null;
  };
  const tagsOf = entry => [...new Set((entry.tags || []).map(tag => String(tag?.name ?? tag ?? '').trim().toLowerCase()).filter(Boolean))].sort();
  const dateOf = entry => {
    const match = typeof entry.date_completed === 'string' ? entry.date_completed.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
    return match ? {year:Number(match[1]), month:Number(match[2]), key:match[1] + match[2] + match[3]} : null;
  };
  const quarterOf = date => date.year + ' Q' + (Math.floor((date.month - 1) / 3) + 1);

  function formatMix(entries) {
    const groups = new Map();
    for (const entry of entries) {
      if (!groups.has(entry.format)) groups.set(entry.format, []);
      groups.get(entry.format).push(entry);
    }
    return [...groups].map(([format, items]) => {
      const ratings = items.map(ratingOf).filter(value => value !== null);
      return {format, count:items.length, share:items.length / entries.length, avg:round1(mean(ratings)), rated:ratings.length};
    }).sort((a, b) => b.count - a.count || a.format.localeCompare(b.format));
  }

  function ratingSpread(entries) {
    const bands = [
      {key:'low', label:'Under 5', test: value => value < 5},
      {key:'mid', label:'5 to 6.9', test: value => value >= 5 && value < 7},
      {key:'good', label:'7 to 7.9', test: value => value >= 7 && value < 8},
      {key:'great', label:'8 to 8.9', test: value => value >= 8 && value < 9},
      {key:'top', label:'9 and above', test: value => value >= 9}
    ].map(band => ({...band, count:0}));
    for (const entry of entries) {
      const value = ratingOf(entry);
      if (value !== null) bands.find(band => band.test(value)).count++;
    }
    return bands.map(({test, ...band}) => band);
  }

  function quarters(entries, limit = 8) {
    const byQuarter = new Map();
    for (const entry of entries) {
      const date = dateOf(entry);
      if (!date) continue;
      const label = quarterOf(date);
      if (!byQuarter.has(label)) byQuarter.set(label, {label, total:0, byFormat:{}});
      const bucket = byQuarter.get(label);
      bucket.total++;
      bucket.byFormat[entry.format] = (bucket.byFormat[entry.format] || 0) + 1;
    }
    return [...byQuarter.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(-limit);
  }

  function drift(entries) {
    const dated = entries.map(entry => ({date:dateOf(entry), rating:ratingOf(entry)}))
      .filter(item => item.date && item.rating !== null).sort((a, b) => a.date.key.localeCompare(b.date.key));
    if (dated.length < 9) return null;
    const third = Math.floor(dated.length / 3);
    const early = round1(mean(dated.slice(0, third).map(item => item.rating)));
    const recent = round1(mean(dated.slice(-third).map(item => item.rating)));
    const change = round1(recent - early);
    return {early, recent, change, direction: change >= 0.4 ? 'rising' : change <= -0.4 ? 'falling' : 'steady'};
  }

  function bridgeTags(entries, limit = 6) {
    const stats = new Map();
    for (const entry of entries) {
      for (const tag of tagsOf(entry)) {
        if (!stats.has(tag)) stats.set(tag, {tag, count:0, formats:new Set()});
        const stat = stats.get(tag);
        stat.count++;
        stat.formats.add(entry.format);
      }
    }
    return [...stats.values()].filter(stat => stat.formats.size >= 2)
      .sort((a, b) => b.formats.size - a.formats.size || b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, limit).map(stat => ({tag:stat.tag, count:stat.count, formats:[...stat.formats].sort()}));
  }

  function tagPairs(entries, limit = 5) {
    const counts = new Map();
    for (const entry of entries) {
      const tags = tagsOf(entry);
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const key = tags[i] + '\u0000' + tags[j];
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
    }
    return [...counts].filter(([, count]) => count >= 2)
      .map(([key, count]) => ({tags:key.split('\u0000'), count}))
      .sort((a, b) => b.count - a.count || a.tags.join().localeCompare(b.tags.join())).slice(0, limit);
  }

  function decades(entries) {
    const counts = new Map();
    let withYear = 0;
    for (const entry of entries) {
      const year = String(entry.catalogue?.year ?? '');
      if (!/^\d{4}$/.test(year)) continue;
      withYear++;
      const decade = Math.floor(Number(year) / 10) * 10;
      counts.set(decade, (counts.get(decade) || 0) + 1);
    }
    return {withYear, bins:[...counts].map(([decade, count]) => ({label:decade + 's', decade, count})).sort((a, b) => a.decade - b.decade)};
  }

  function extremes(entries) {
    const rated = entries.filter(entry => ratingOf(entry) !== null);
    const newest = (a, b) => String(b.date_completed || b.created_at || '').localeCompare(String(a.date_completed || a.created_at || ''));
    const pick = item => ({title:item.title, format:item.format, rating:ratingOf(item)});
    const high = rated.slice().sort((a, b) => ratingOf(b) - ratingOf(a) || newest(a, b)).slice(0, 3).map(pick);
    const low = rated.slice().sort((a, b) => ratingOf(a) - ratingOf(b) || newest(a, b)).slice(0, 3).map(pick);
    const spread = rated.length ? Math.max(...rated.map(ratingOf)) - Math.min(...rated.map(ratingOf)) : 0;
    return spread > 0 ? {high, low: low.filter(item => !high.some(other => other.title === item.title && other.format === item.format))} : {high:[], low:[]};
  }

  function repeats(entries) {
    const keys = new Map();
    for (const entry of entries) {
      const key = typeof mediaIdentity !== 'undefined' ? (mediaIdentity.catalogueKey(entry) || mediaIdentity.textKey(entry))
        : JSON.stringify([entry.format, String(entry.title).trim().toLowerCase()]);
      keys.set(key, (keys.get(key) || 0) + 1);
    }
    return [...keys.values()].filter(count => count > 1).length;
  }

  function summarize(entries) {
    const list = Array.isArray(entries) ? entries : [];
    const ratings = list.map(ratingOf).filter(value => value !== null);
    const summary = {
      total:list.length, rated:ratings.length, avg:round1(mean(ratings)),
      formats:formatMix(list), spread:ratingSpread(list), quarters:quarters(list),
      datedCount:list.filter(entry => dateOf(entry)).length, drift:drift(list),
      bridges:bridgeTags(list), pairs:tagPairs(list), decades:decades(list),
      extremes:extremes(list), repeatedWorks:repeats(list)
    };
    summary.highlights = highlights(summary);
    return summary;
  }

  function list(items) {
    return items.length < 3 ? items.join(' and ') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  function highlights(summary) {
    const lines = [];
    const name = format => FORMAT_NAMES[format] || format;
    const percent = value => Math.round(value * 100);
    const top = summary.formats[0];
    if (top && summary.formats.length > 1) {
      lines.push('Most of what you log is ' + name(top.format) + ': ' + top.count + ' of ' + summary.total + ' entries (' + percent(top.share) + '%).');
    }
    const ratedFormats = summary.formats.filter(item => item.rated >= 2 && item.avg !== null);
    if (ratedFormats.length >= 2) {
      const best = ratedFormats.reduce((a, b) => b.avg > a.avg ? b : a);
      const worst = ratedFormats.reduce((a, b) => b.avg < a.avg ? b : a);
      if (best.avg - worst.avg >= 0.3) {
        lines.push('You rate ' + name(best.format) + ' highest (' + best.avg.toFixed(1) + ' on average) and ' + name(worst.format) + ' lowest (' + worst.avg.toFixed(1) + ').');
      }
    }
    if (summary.rated >= 5) {
      const high = summary.spread.filter(band => band.key === 'great' || band.key === 'top').reduce((sum, band) => sum + band.count, 0);
      const low = summary.spread.filter(band => band.key === 'low' || band.key === 'mid').reduce((sum, band) => sum + band.count, 0);
      if (high / summary.rated >= 0.6) lines.push(percent(high / summary.rated) + '% of your ratings are 8 or higher, so a 7 is a lukewarm score for you.');
      else if (low / summary.rated >= 0.4) lines.push(percent(low / summary.rated) + '% of your ratings are below 7, so you are selective about what earns a high score.');
    }
    if (summary.drift) {
      const {direction, early, recent} = summary.drift;
      if (direction !== 'steady') lines.push('Your ratings have been ' + direction + ': ' + early.toFixed(1) + ' early on against ' + recent.toFixed(1) + ' lately.');
      else lines.push('Your ratings have stayed steady over time, around ' + recent.toFixed(1) + '.');
    }
    const bridge = summary.bridges[0];
    if (bridge) lines.push('"' + bridge.tag + '" runs through ' + list(bridge.formats.map(name)) + ', so it is a taste that crosses formats.');
    const era = summary.decades;
    if (era.withYear >= 5 && era.bins.length) {
      const peak = era.bins.reduce((a, b) => b.count > a.count ? b : a);
      lines.push('Among entries with a release year, the ' + peak.label + ' are your most common era (' + peak.count + ' of ' + era.withYear + ').');
    }
    if (summary.repeatedWorks) lines.push('You have logged ' + summary.repeatedWorks + ' work' + (summary.repeatedWorks === 1 ? '' : 's') + ' more than once.');
    return lines;
  }

  return {summarize, highlights, formatMix, ratingSpread, quarters, drift, bridgeTags, tagPairs, decades, extremes, repeats, FORMAT_NAMES};
})();
if (typeof module !== 'undefined') module.exports = tasteInsights;
