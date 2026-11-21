/* Account-scoped Style & Scent persistence. The caller owns prompts and rendering. */
const EMPTY_STYLE_ITEMS = Object.freeze([]);
const STYLE_BROWSER_KEYS = Object.freeze({fragrance:'nz_fragrances',wardrobe:'nz_wardrobe'});
const STYLE_ITEM_FIELDS = {
  fragrance:['name','house','photoUrl','status','character','projection','season','occasion','notesTop','notesMid','notesBase','review'],
  wardrobe:['name','brand','photoUrl','category','color','colorName','fabric','season','occasion','status','pairing']
};

function createStyleStore(client, owner, now = Date.now) {
  const pageSize = 500;
  let items = {fragrance:EMPTY_STYLE_ITEMS,wardrobe:EMPTY_STYLE_ITEMS};
  let reading = null;
  let loaded = false;
  let dismissed = {fragrance:new Set(),wardrobe:new Set()};
  let dismissalsLoaded = false;
  let writing = false;
  let disposed = false;

  function normalize(kind, item) {
    const fields = Object.fromEntries(STYLE_ITEM_FIELDS[kind].map(field =>
      [field,typeof item[field] === 'string' ? item[field] : '']));
    const status = fields.status.trim().toLowerCase();
    if (kind === 'fragrance') {
      fields.status = ['owned','wishlisted','tried'].includes(status) ? status : fields.status || 'owned';
      fields.rating = Number.isFinite(item.rating) ? item.rating : 0;
    } else {
      fields.status = status === 'wishlisted' ? 'Wishlisted' : (!status || status === 'owned') ? 'Owned' : fields.status;
    }
    fields.tags = Array.isArray(item.tags) ? item.tags.filter(tag=>typeof tag === 'string') : [];
    fields.created = Number.isFinite(item.created) ? item.created : now();
    return fields;
  }

  function rowFor(kind, item) {
    if (typeof item?.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id)) {
      throw new Error('Invalid style item ID');
    }
    return {user_id:owner,kind,item_id:item.id,details:normalize(kind,item)};
  }

  async function readSnapshot() {
    const next = {fragrance:[],wardrobe:[]};
    for (let offset=0; ; offset+=pageSize) {
      const response = await client.from('style_items').select('kind,item_id,details')
        .eq('user_id',owner).order('kind').order('item_id').range(offset,offset+pageSize-1);
      if (disposed) return false;
      if (response.error) throw response.error;
      for (const {kind,item_id,details} of response.data) {
        next[kind].push({...details,...normalize(kind,details),id:item_id});
      }
      if (response.data.length < pageSize) break;
    }
    for (const rows of Object.values(next)) rows.sort((a,b)=>b.created-a.created);
    return next;
  }

  async function readAll() {
    const next = await readSnapshot();
    if (!next || disposed) return false;
    items = next;
    loaded = true;
    return true;
  }

  function load() {
    if (disposed || loaded) return Promise.resolve(!disposed);
    if (!reading) {
      reading = readAll().finally(()=>{reading=null;});
    }
    return reading;
  }

  function update(kind, incoming, removedId) {
    const ids = new Set(incoming.map(item=>item.id));
    items[kind] = incoming.concat(items[kind].filter(item=>item.id !== removedId && !ids.has(item.id)))
      .sort((a,b)=>b.created-a.created);
  }

  async function write(operation) {
    if (disposed || writing) return false;
    writing = true;
    try {
      if (!await load() || disposed) return false;
      return await operation();
    } finally {
      writing = false;
    }
  }

  function change(kind, item, remove) {
    return write(async ()=>{
      const table = client.from('style_items');
      const row = remove ? null : rowFor(kind,item);
      const response = remove
        ? await table.delete().eq('user_id',owner).eq('kind',kind).eq('item_id',item.id)
        : await table.upsert(row,{onConflict:'user_id,kind,item_id'});
      if (disposed) return false;
      if (response.error) throw response.error;
      update(kind,row ? [{...row.details,id:row.item_id}] : [],item.id);
      return true;
    });
  }

  function importItems(kind, imported) {
    if (!imported.length) return Promise.resolve(false);
    return write(async ()=>{
      const rows = imported.map(item=>rowFor(kind,item));
      const response = await client.from('style_items').upsert(rows,{
        onConflict:'user_id,kind,item_id',ignoreDuplicates:true
      }).select('item_id');
      if (disposed) return false;
      if (response.error) throw response.error;
      const inserted = new Set(response.data.map(row=>row.item_id));
      const known = new Set(items[kind].map(item=>item.id));
      // A duplicate from another tab can be missing from this tab's snapshot.
      if (rows.some(row=>!inserted.has(row.item_id) && !known.has(row.item_id))) {
        return readAll();
      }
      const importedRows = new Map(rows.filter(row=>inserted.has(row.item_id))
        .map(row=>[row.item_id,{...row.details,id:row.item_id}]));
      update(kind,Array.from(importedRows.values()));
      return true;
    });
  }

  /* Dismissed Discover picks. Kept apart from the saved items so a failure here never blocks the rest. */
  async function loadDismissals() {
    if (disposed || dismissalsLoaded) return dismissalsLoaded;
    const response = await client.from('style_dismissals').select('kind,item_key').eq('user_id',owner);
    if (disposed || response.error) return false;
    const next = {fragrance:new Set(),wardrobe:new Set()};
    for (const {kind,item_key} of response.data || []) if (next[kind]) next[kind].add(item_key);
    dismissed = next;
    dismissalsLoaded = true;
    return true;
  }

  async function dismiss(kind, key, reason) {
    if (disposed || !dismissed[kind] || !key) return false;
    const response = await client.from('style_dismissals').upsert(
      {user_id:owner,kind,item_key:key,reason:reason === 'discarded' ? 'discarded' : 'not_for_me'},
      {onConflict:'user_id,kind,item_key',ignoreDuplicates:true});
    if (disposed || response.error) return false;
    dismissed[kind].add(key);
    return true;
  }

  return {
    owner,
    readSnapshot,
    isDismissed(kind, key) { return Boolean(dismissed[kind]?.has(key)); },
    loadDismissals,
    dismiss,
    get ready() { return loaded && !disposed; },
    get busy() { return writing; },
    items(kind) { return items[kind]; },
    load,
    change,
    importItems,
    dispose() {
      disposed = true;
      items = {fragrance:EMPTY_STYLE_ITEMS,wardrobe:EMPTY_STYLE_ITEMS};
    }
  };
}

function readLegacyStyle(storage, kind) {
  const key = STYLE_BROWSER_KEYS[kind];
  try {
    const raw = storage.getItem(key);
    const items = JSON.parse(raw || '[]');
    return { key,raw,items:Array.isArray(items) ? items : EMPTY_STYLE_ITEMS };
  } catch {
    return { key,raw:null,items:EMPTY_STYLE_ITEMS };
  }
}

if (typeof module !== 'undefined') module.exports = { createStyleStore, readLegacyStyle };
