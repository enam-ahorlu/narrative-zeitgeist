/* Shared media-format labels and pure projections of the loaded journal. */
const journalView = (() => {
  const formats = Object.freeze({
    film: { label:'Film', plural:'Films', search:'film', badge:'b-film' },
    show: { label:'Show', plural:'Shows', search:'show', badge:'b-show' },
    book: { label:'Book', plural:'Books', search:'book', badge:'b-book' },
    sports_match: { label:'Match', plural:'Matches', search:'match', badge:'b-match' },
    music: { label:'Music', plural:'Music', search:'music', badge:'b-music' }
  });

  const aliases = new Map(Object.entries(formats).flatMap(([key, format]) =>
    [key, format.label, format.plural, format.search].map(name => [name.toLowerCase(), key])));

  function formatKey(value) {
    return aliases.get(String(value ?? '').toLowerCase()) ?? null;
  }

  function defaultFilters() {
    return { search:'', format:'All', tags:[], ratingMin:0, ratingMax:10, yearFrom:0, yearTo:9999 };
  }

  function hasFilters(filters) {
    return Boolean(filters.search || filters.format !== 'All' || filters.tags.length ||
      filters.ratingMin > 0 || filters.ratingMax < 10 || filters.yearFrom || filters.yearTo < 9999);
  }

  function collectionPage(entries, filters, sort, requestedPage, pageSize) {
    const query = filters.search.trim().toLowerCase();
    const format = formatKey(filters.format);
    const dateFilter = filters.yearFrom || filters.yearTo < 9999;
    const matches = entries.filter(entry => {
      if (format && entry.format !== format) return false;
      const rating = Number(entry.rating);
      if (rating < filters.ratingMin || rating > filters.ratingMax) return false;
      if (query || filters.tags.length) {
        const tags = (entry.tags ?? []).map(tag => tag.toLowerCase());
        if (!filters.tags.every(tag => tags.includes(tag))) return false;
        if (query && !entry.title.toLowerCase().includes(query) && !tags.some(tag => tag.includes(query))) return false;
      }
      if (!dateFilter) return true;
      const year = Number((entry.date_completed || entry.created_at || '').slice(0, 4));
      return year > 0 && year >= filters.yearFrom && year <= filters.yearTo;
    });
    // The default order comes from the journal query, which breaks date ties by ID.
    if (sort === 'rating_desc') matches.sort((a,b) => Number(b.rating) - Number(a.rating));
    if (sort === 'title_asc') matches.sort((a,b) => a.title.localeCompare(b.title));
    const pages = Math.max(1, Math.ceil(matches.length / pageSize));
    const page = Math.min(pages, Math.max(1, requestedPage));
    const start = (page - 1) * pageSize;
    return { page, pages, start, count:matches.length, visible:matches.slice(start, start + pageSize) };
  }

  function watchlistPriority(item) {
    return item.priority === 'up_next' ? 'up_next' : 'maybe';
  }

  function watchlistView(items, priority, sort) {
    const result = items.filter(item => priority === 'all' || watchlistPriority(item) === priority);
    if (sort === 'alpha') result.sort((a,b) => a.title.localeCompare(b.title));
    if (sort === 'match') result.sort((a,b) => (Number(b.match_score) || 0) - (Number(a.match_score) || 0));
    return result;
  }

  return { formats, formatKey, defaultFilters, hasFilters, collectionPage, watchlistPriority, watchlistView };
})();

if (typeof module !== 'undefined') module.exports = journalView;
