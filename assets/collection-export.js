/* The browser export includes the same owned records as the Collection screen. */
function collectionExportRecord(entry) {
  if (entry._style) {
    const details = entry._style.details;
    return {
      id: entry.id, format: entry.format, title: entry.title, rating: entry.rating,
      tags: details.tags, date_added: entry.created_at, review: details.review || '',
      style: { id: entry._style.id, ...details }
    };
  }
  const { user_id, ...record } = entry;
  return { ...record, year: record.catalogue?.year ?? null,
    review: record.notes ?? '', date_added: record.created_at };
}

function collectionCsv(records) {
  const columns = [
    ['Title','title'], ['Format','format'], ['Year','year'], ['Rating','rating'],
    ['Review','review'], ['Tags','tags'], ['Date Added','date_added'], ['Date Completed','date_completed'],
    ['Entry ID','id'], ['Catalogue','catalogue'], ['Cover','cover_color'], ['Poster','poster_url'],
    ['Last Updated','updated_at'], ['Style Details','style']
  ];
  function cell(value) {
    let text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  const rows = [columns.map(([label]) => label), ...records.map(record => columns.map(([,key]) => record[key]))];
  return rows.map(row => row.map(cell).join(',')).join('\r\n');
}

async function exportCollection(format) {
  const store = currentStyleStore();
  if (!store) return;
  try {
    const current = () => isCurrentStyleStore(store);
    const [media, styles] = await Promise.all([
      journalData.readEntries(SUPA,store.owner,current), store.readSnapshot()
    ]);
    if (!isCurrentStyleStore(store)) return;
    if (!media || !styles) throw new Error('Incomplete collection');
    const records = collectionSource(media,styles.fragrance,styles.wardrobe).map(collectionExportRecord);
    if (!records.length) return showToast('No entries to export');
    const json = format === 'json';
    const contents = json ? JSON.stringify({version:'2', exported:new Date().toISOString(), entries:records}, null, 2) : collectionCsv(records);
    const url = URL.createObjectURL(new Blob([contents], {type:json ? 'application/json' : 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'narrative-zeitgeist-export.' + format;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(records.length + (records.length === 1 ? ' entry exported' : ' entries exported'));
  } catch {
    if (isCurrentStyleStore(store)) showToast('Could not load the full collection for export. Please retry.', '⚠');
  }
}
