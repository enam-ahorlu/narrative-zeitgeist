const mediaIdentity = (() => {
  const text = (value, max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
  function titleKey(value) {
    return text(value,300).normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'')
      .replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  }

  function metadata(item) {
    const source = item.catalogue || item.catalog || item;
    const legacy = typeof item.external_id === 'string' ? item.external_id.match(/^([a-z][a-z0-9_-]{0,39}):(.+)$/i) : null;
    const provider = text(source.provider || legacy?.[1],40).toLowerCase();
    const id = text((source.provider ? source.id : null) || legacy?.[2],200);
    const year = /^\d{4}$/.test(String(source.year)) ? String(source.year) : '';
    const creator = text(source.creator,180);
    const kind = source.kind === 'track' ? 'track' : source.kind === 'album' ? 'album' : '';
    return {
      ...(provider && id ? {provider,id} : {}), ...(year ? {year} : {}),
      ...(creator ? {creator} : {}), ...(kind ? {kind} : {})
    };
  }

  function part(item) {
    return item.format === 'music' && metadata(item).kind === 'track' ? 'track' :
      item.format === 'music' ? 'album' : '';
  }

  function sameWork(a,b) {
    if (a.format !== b.format || part(a) !== part(b)) return false;
    const left = metadata(a);
    const right = metadata(b);
    if (left.provider && left.provider === right.provider) return left.id === right.id;
    if (titleKey(a.title) !== titleKey(b.title)) return false;
    if (left.year && right.year && left.year !== right.year) return false;
    return !(left.creator && right.creator && titleKey(left.creator) !== titleKey(right.creator));
  }

  function textKey(item) {
    return JSON.stringify([item.format,part(item),titleKey(item.title)]);
  }

  function catalogueKey(item) {
    const {provider,id} = metadata(item);
    return provider && id ? JSON.stringify([item.format,part(item),provider,id]) : null;
  }

  return { metadata, part, sameWork, titleKey, textKey, catalogueKey };
})();
if (typeof module !== 'undefined') module.exports = mediaIdentity;
