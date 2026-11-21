/* Collection rendering, filters, and detail views. */

function _entryDateStr(e){
  var d = e.date_completed ? new Date(e.date_completed) : new Date(e.created_at);
  return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

function catalogueContext(item){
  var details = mediaIdentity.metadata(item);
  var label = [details.creator,details.year].filter(Boolean).join(' · ');
  return label ? '<span class="catalogue-context"> '+escHtml(label)+'</span>' : '';
}

/* Fragrances and wardrobe items appear in the collection as ordinary rows. This adapts a Style & Scent record to the
   entry shape the list, filters, sorting and paging already understand; clicking it opens its own form. */
function styleAsEntry(kind, item){
  var fragrance = kind === 'fragrance';
  var rating = Number(item.rating);
  var status = String(item.status || '');
  var tags = (item.tags || []).slice();
  if(status && tags.map(String).map(function(t){return t.toLowerCase();}).indexOf(status.toLowerCase()) < 0) tags.unshift(status.toLowerCase());
  var created = item.created ? new Date(item.created).toISOString() : '';
  return {
    id:'style:'+kind+':'+item.id, _style:{kind:kind, id:item.id, details:item}, format:kind,
    title:item.name || (fragrance ? 'Fragrance' : 'Wardrobe item'),
    rating:rating > 0 ? rating : null, tags:tags, created_at:created, date_completed:null,
    poster_url:safeStylePhoto(item.photoUrl || '') || styleCataloguePhoto(kind, item) || '',
    catalogue:null, _maker:fragrance ? item.house : item.brand
  };
}

/* Only items marked as owned belong in the collection; wishlisted ones live in the watchlist. */
function isOwnedStyle(item){ return String(item.status || '').toLowerCase() === 'owned'; }

function collectionSource(media = _allEntries, fragrances = _loadFrags(), wardrobe = _loadWard()){
  var rows = fragrances.filter(isOwnedStyle).map(item=>styleAsEntry('fragrance',item))
    .concat(wardrobe.filter(isOwnedStyle).map(item=>styleAsEntry('wardrobe',item)));
  if(!rows.length) return media;
  var key = function(e){ return String(e.created_at || ''); };
  return media.concat(rows).map(function(e, i){ return {e:e, i:i}; })
    .sort(function(a, b){ return key(b.e).localeCompare(key(a.e)) || a.i - b.i; })
    .map(function(x){ return x.e; });
}

var collectionOpener = null;

function openCollectionEntry(entry){
  var modal = entry._style ? entry._style.kind : 'detail';
  collectionOpener = {id:entry.id, modal:modal};
  if(modal === 'detail') openDetailModal(entry);
  else if(modal === 'fragrance') openFragranceModal(entry._style.id);
  else openWardrobeModal(entry._style.id);
  document.querySelector('#m-'+modal+' .modal-x')?.focus();
}

function restoreCollectionFocus(modal){
  if(!collectionOpener || collectionOpener.modal !== modal) return;
  var id = collectionOpener.id;
  collectionOpener = null;
  if(!currentUser || !document.getElementById('s-collection').classList.contains('active')) return;
  var row = document.querySelector('#s-collection [data-id="'+CSS.escape(id)+'"] .entry-title-button');
  (row || document.getElementById('col-search-inp')).focus();
}

function ratingCell(e){
  var rVal = parseFloat(e.rating);
  if(!Number.isFinite(rVal)) return '<span style="color:var(--t-3)">—</span>';
  var rdCls = rVal >= 9 ? 'rd-hi' : rVal >= 7.5 ? 'rd-mid' : 'rd-lo';
  return '<div class="rating"><div class="rd '+rdCls+'"></div>'+rVal+'</div>';
}

function renderEntriesTable(entries){
  var tbody = document.querySelector('#s-collection .tbl-wrap tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  entries.forEach(function(e, i){
    var grad  = e.cover_color || 'linear-gradient(135deg,#1B5E76,#4AADBA)';
    var rVal  = parseFloat(e.rating);
    var rdCls = rVal >= 9 ? 'rd-hi' : rVal >= 7.5 ? 'rd-mid' : 'rd-lo';
    var fmt   = mediaIdentity.part(e) === 'track' ? 'Track' : FMT_LABEL[e.format] || e.format;
    var badge = FMT_BADGE[e.format] || 'b-show';
    var tags  = Array.isArray(e.tags) ? e.tags : [];
    var tagHtml = tags.slice(0,2).map(function(t){ return '<span class="tag">'+escHtml(t)+'</span>'; }).join('') +
      (tags.length > 2 ? '<span class="tag-more">+'+(tags.length-2)+'</span>' : '');
    var delay = i < 5 ? ' anim-delay-'+(i+1) : '';
    var tr = document.createElement('tr');
    tr.className = 'anim-fadeup' + delay;
    tr.dataset.id = e.id;
    tr.onclick = function(){ openCollectionEntry(e); };
    tr.innerHTML =
      '<td class="tc-title">'+(e.poster_url?'<img class="entry-thumb" src="'+escHtml(e.poster_url)+'" alt="">':'<span class="entry-cover-dot" style="background:'+escHtml(grad)+'"></span>')+ '<button type="button" class="entry-title-button">'+escHtml(e.title)+'</button>'+(e._maker?'<span class="catalogue-context"> '+escHtml(e._maker)+'</span>':catalogueContext(e))+'</td>'+
      '<td><span class="badge '+badge+'">'+fmt+'</span></td>'+
      '<td>'+ratingCell(e)+'</td>'+
      '<td style="color:var(--t-3);font-size:12px">'+_entryDateStr(e)+'</td>'+
      '<td class="col-tags"><div class="tags-cell">'+tagHtml+'</div></td>'+
      '<td style="text-align:right;color:var(--t-3)">›</td>';
    tbody.appendChild(tr);
  });
}

function renderEntriesGrid(entries){
  var grid = document.getElementById('cg-grid');
  if(!grid) return;
  grid.innerHTML = '';
  entries.forEach(function(e){
    var grad  = e.cover_color || 'linear-gradient(135deg,#1B5E76,#4AADBA)';
    var rVal  = parseFloat(e.rating);
    var fmt   = mediaIdentity.part(e) === 'track' ? 'Track' : FMT_LABEL[e.format] || e.format;
    var badge = FMT_BADGE[e.format] || 'b-show';
    var tags  = Array.isArray(e.tags) ? e.tags : [];
    var cardTagHtml = tags.slice(0,2).map(function(t){ return '<span class="tag">'+escHtml(t)+'</span>'; }).join('');
    var card = document.createElement('div');
    card.className = 'cg-card anim-fadeup';
    card.dataset.id = e.id;
    card.onclick = function(){ openCollectionEntry(e); };
    card.innerHTML =
      (e.poster_url?'<img class="cg-poster" src="'+escHtml(e.poster_url)+'" alt="">':"<div class='cg-card-strip' style='background:"+escHtml(grad)+"'></div>")+
      '<span class="badge '+badge+'">'+fmt+'</span>'+
      '<div class="cg-title"><button type="button" class="entry-title-button">'+escHtml(e.title)+'</button>'+(e._maker?'<span class="catalogue-context"> '+escHtml(e._maker)+'</span>':catalogueContext(e))+'</div>'+
      '<div class="cg-tags">'+cardTagHtml+'</div>'+
      '<div class="cg-bottom"><div class="cg-rating">'+(Number.isFinite(rVal) ? rVal : '—')+'</div><div class="cg-date">'+_entryDateStr(e)+'</div></div>';
    grid.appendChild(card);
  });
}

function updateCollectionStats(entries){
  var total  = entries.length;
  var ratings = entries.map(function(e){ return parseFloat(e.rating); }).filter(Number.isFinite);
  var avg = ratings.length ? (ratings.reduce(function(sum,value){return sum+value;},0)/ratings.length).toFixed(1) : '—';
  var counts = Object.fromEntries(Object.keys(journalView.formats).map(function(format){return [format,0];}));
  entries.forEach(function(e){ counts[e.format]++; });
  /* update strip stats by ID — robust to any order */
  var _sv = function(id, val){ var el=document.getElementById(id); if(el) el.textContent=val; };
  _sv('sv-total', total); _sv('sv-avg', avg);
  _sv('sv-films', counts.film);
  _sv('sv-fragrance', counts.fragrance); _sv('sv-wardrobe', counts.wardrobe);
  _sv('sv-shows', counts.show); _sv('sv-books', counts.book);
  _sv('sv-matches', counts.sports_match); _sv('sv-music', counts.music);
  var phSub = document.getElementById('col-ph-sub');
  if(phSub) phSub.textContent = total + ' entr'+(total===1?'y':'ies')+(_entriesReady && _styleStore?.ready ? '' : ' loaded');
  var allTags = new Set();
  entries.forEach(function(e){ (e.tags||[]).forEach(function(t){ allTags.add(t); }); });
  var sbStats = document.getElementById('sb-stats');
  if(sbStats) sbStats.textContent = total + ' entries · ' + allTags.size + ' themes';
  var wc = document.getElementById('welcome-card');
  if(wc) wc.style.display = total === 0 && _entriesReady && _styleStore?.ready ? '' : 'none';
}

/* ── Open detail modal populated with real entry data ── */
function openDetailModal(entry){
  currentEntry = entry;
  var rVal  = parseFloat(entry.rating);
  var rdCls = rVal >= 9 ? 'rd-hi' : rVal >= 7.5 ? 'rd-mid' : 'rd-lo';
  var fmt   = mediaIdentity.part(entry) === 'track' ? 'Track' : FMT_LABEL[entry.format] || entry.format;
  var badge = FMT_BADGE[entry.format] || 'b-show';
  var grad  = entry.cover_color || 'linear-gradient(135deg,#1B5E76,#4AADBA)';
  var initials = entry.title.split(/\s+/).slice(0,3).map(function(w){ return w[0]||''; }).join('').toUpperCase().slice(0,4);
  var tags  = Array.isArray(entry.tags) ? entry.tags : [];

  document.querySelector('#m-detail .modal-title').textContent = entry.title;

  var heroInfo = document.getElementById('detail-hero-info');
  if(heroInfo) heroInfo.innerHTML =
    '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">'+
      '<span class="badge '+badge+'">'+fmt+'</span>'+
      '<span style="font-size:12px;color:var(--t-3)">Completed '+_entryDateStr(entry)+'</span>'+
    '</div>'+
    '<div class="rating" style="font-size:36px;margin-bottom:5px">'+
      '<div class="rd '+rdCls+'" style="width:10px;height:10px"></div>'+rVal+
    '</div>'+
    '<div style="font-size:11px;color:var(--t-3)">Your rating</div>'+
    '<div id="ext-ratings"></div>';

  var dc = document.getElementById('detail-cover');
  if(dc){
    if(entry.poster_url){
      dc.style.backgroundImage=cssUrl(entry.poster_url);
      dc.style.backgroundSize='cover';
      dc.style.backgroundPosition='center';
      dc.style.background='';
      dc.textContent='';
    } else {
      dc.style.backgroundImage='';
      dc.style.background=grad;
      dc.textContent=initials;
    }
  }

  var ts = document.getElementById('detail-tags-section');
  if(ts) ts.innerHTML =
    '<div style="font-size:10.5px;font-weight:600;letter-spacing:.05em;color:var(--t-2);margin-bottom:6px">TAGS</div>'+
    '<div style="display:flex;gap:5px;flex-wrap:wrap">'+
      (tags.length ? tags.map(function(t){ return '<span class="tag tag-link" onclick="filterByTag(\''+escJs(t)+'\')">'+escHtml(t)+'</span>'; }).join('') : '<span style="font-size:12px;color:var(--t-3)">No tags added</span>')+
    '</div>'+
    '<div class="tag-hint">Tap a tag to see all entries with that theme →</div>';

  var ns = document.getElementById('detail-notes-section');
  if(ns) ns.innerHTML =
    '<div style="font-size:10.5px;font-weight:600;letter-spacing:.05em;color:var(--t-2);margin-bottom:6px">NOTES</div>'+
    '<div style="font-size:13px;color:var(--t-2);line-height:1.65;padding:12px;background:var(--n-bg);border-radius:var(--r-sm)">'+
      (entry.notes ? escHtml(entry.notes) : '<em style="opacity:.5">No notes for this entry.</em>')+
    '</div>';

  openModal('detail');
  _renderDetailInfluence(entry);
  _renderRelatedEntries(entry);

  /* Fetch external ratings (OMDb) for films and shows */
  var _extEl = document.getElementById('ext-ratings');
  if(_extEl) _extEl.innerHTML = '';
  if(entry.format === 'film' || entry.format === 'show'){
    accountToken(currentUser && currentUser.id)
      .then(function(token){
        return fetch('/api/ratings?title='+encodeURIComponent(entry.title),{headers:{Authorization:'Bearer '+token}});
      })
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(currentEntry !== entry || !document.getElementById('m-detail').classList.contains('open')) return;
        if(!d || (!d.imdb && !d.rt && !d.metacritic)) return;
        var el = document.getElementById('ext-ratings');
        if(!el) return;
        var html = '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">';
        if(d.imdb)       html += '<span class="ext-rb"><span class="ext-rb-src">IMDb</span>'+escHtml(d.imdb)+'</span>';
        if(d.rt)         html += '<span class="ext-rb"><span class="ext-rb-src">RT</span>'+escHtml(d.rt)+'</span>';
        if(d.metacritic) html += '<span class="ext-rb"><span class="ext-rb-src">MC</span>'+escHtml(d.metacritic)+'</span>';
        html += '</div>';
        el.innerHTML = html;
      })
      .catch(function(){});
  }
}

/* ── Render live Taste Influence in detail modal ── */
function _renderDetailInfluence(entry){
  var el=document.querySelector('.detail-influence');
  if(!el)return;
  var tags=Array.isArray(entry.tags)?entry.tags:[];
  if(!tags.length||!_fp||!(_fp.primary_themes||[]).length){
    el.innerHTML='<div class="di-label">Taste Influence</div>'+
      '<div class="di-text">'+(tags.length?'Fingerprint not yet computed.':'Add tags to see this entry\'s influence on your taste fingerprint.')+'</div>';
    return;
  }
  var themes=(_fp.primary_themes||[]).slice(0,20);
  var matched=themes.filter(function(t){
    return tags.some(function(tag){return tag.toLowerCase()===t.tag.toLowerCase();});
  }).slice(0,3);
  if(!matched.length){
    el.innerHTML='<div class="di-label">Taste Influence</div>'+
      '<div class="di-text">This entry\'s tags don\'t overlap with your current top themes — log more similar entries to build impact.</div>';
    return;
  }
  var topTheme=matched[0].tag;
  var ratingVal=parseFloat(entry.rating)||0;
  var similar=(_allEntries||[]).filter(function(e){
    return e.id!==entry.id&&(e.tags||[]).some(function(t){return t.toLowerCase()===topTheme.toLowerCase();});
  });
  var rank=similar.filter(function(e){return parseFloat(e.rating)>ratingVal;}).length+1;
  var total=similar.length+1;
  var impact=matched.length>=2?'high':ratingVal>=8.5?'high':ratingVal>=7?'medium':'low';
  var themeNames=matched.map(function(t){return '<strong>'+escHtml(t.tag)+'</strong>';});
  var themeStr=themeNames.length===1?themeNames[0]:themeNames.length===2?themeNames[0]+' and '+themeNames[1]:themeNames[0]+', '+themeNames[1]+' and '+themeNames[2];
  el.innerHTML='<div class="di-label">Taste Influence</div>'+
    '<div class="di-text">This entry contributes to your '+themeStr+' fingerprint score'+(matched.length>1?'s':'')+'. Weighted impact: <strong>'+impact+'</strong>'+(total>1?' — ranked '+rank+' of '+total+' in this theme.':'.')+'</div>';
}

/* ── Render live Related Entries in detail modal ── */
function _renderRelatedEntries(entry){
  var container=document.querySelector('.detail-related');
  if(!container)return;
  var tags=Array.isArray(entry.tags)?entry.tags:[];
  var others=(_allEntries||[]).filter(function(e){return e.id!==entry.id;});
  if(!tags.length||!others.length){
    container.innerHTML='<div class="detail-rel-label">From your collection — similar taste</div>'+
      '<div style="font-size:12.5px;color:var(--t-3);padding:8px 0">'+(others.length?'Add tags to find similar entries.':'No other entries in your collection yet.')+'</div>';
    return;
  }
  var scored=others.map(function(e){
    var eTags=(e.tags||[]).map(function(t){return t.toLowerCase();});
    var shared=tags.filter(function(t){return eTags.indexOf(t.toLowerCase())>=0;});
    return{entry:e,shared:shared,score:shared.length};
  }).filter(function(r){return r.score>0;})
    .sort(function(a,b){return b.score-a.score||parseFloat(b.entry.rating)-parseFloat(a.entry.rating);})
    .slice(0,3);
  if(!scored.length){
    container.innerHTML='<div class="detail-rel-label">From your collection — similar taste</div>'+
      '<div style="font-size:12.5px;color:var(--t-3);padding:8px 0">No other entries share these tags yet.</div>';
    return;
  }
  var itemsHtml=scored.map(function(r){
    var e=r.entry;
    var grad=e.cover_color||'linear-gradient(135deg,#1B5E76,#4AADBA)';
    var initials=e.title.split(/\s+/).slice(0,3).map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,4);
    var thumbHtml=e.poster_url
      ?'<div class="detail-rel-thumb" style="background-image:'+escHtml(cssUrl(e.poster_url))+';background-size:cover;background-position:center"></div>'
      :'<div class="detail-rel-thumb" style="background:'+escHtml(grad)+'">'+escHtml(initials)+'</div>';
    var sharedStr=r.shared.slice(0,3).map(function(t){return escHtml(t);}).join(' · ');
    var rVal=parseFloat(e.rating)||0;
    return'<div class="detail-rel-item" onclick="_openRelatedEntry(\''+escJs(e.id)+'\')" style="cursor:pointer">'+
      thumbHtml+
      '<div class="detail-rel-info">'+
        '<div class="detail-rel-title">'+escHtml(e.title)+'</div>'+
        '<div class="detail-rel-shared">Shares: '+sharedStr+'</div>'+
      '</div>'+
      '<div class="detail-rel-rating">'+rVal+'</div>'+
    '</div>';
  }).join('');
  container.innerHTML='<div class="detail-rel-label">From your collection — similar taste</div>'+
    '<div class="detail-rel-items">'+itemsHtml+'</div>';
}

/* Navigate to a related entry without closing the modal — just replaces modal contents */
function _openRelatedEntry(id){
  var e=(_allEntries||[]).find(function(x){return String(x.id)===String(id);});
  if(e)openDetailModal(e);
}

/* ── Card grid / table view toggle ── */
var _collectionPage = 1;
var COLLECTION_PAGE_SIZE = 10;
var collectionView='table';
function toggleCollectionView(){
  collectionView=collectionView==='table'?'grid':'table';
  var tbl=document.querySelector('.tbl-wrap');
  var grid=document.getElementById('cg-grid');
  var icon=document.getElementById('view-icon');
  if(collectionView==='grid'){
    tbl.style.display='none';grid.style.display='grid';
    icon.innerHTML='<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>';
  } else {
    tbl.style.display='';grid.style.display='none';
    icon.innerHTML='<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18"/>';
  }
  renderCollectionPage();
}

/* ── Collection filter engine (C1–C5) ── */
var colFilter = journalView.defaultFilters();
var _colSortVal = 'date_desc';

function applyCollectionFilter(){
  _collectionPage = 1;
  renderCollectionPage();
}

function refreshCollection(){
  var source = collectionSource();
  updateCollectionStats(source);
  renderColTagPills(source);
  renderCollectionPage(source);
}

function renderCollectionPage(source){
  var view = journalView.collectionPage(source || collectionSource(),colFilter,_colSortVal,_collectionPage,COLLECTION_PAGE_SIZE);
  _collectionPage = view.page;
  renderEntriesTable(collectionView === 'table' ? view.visible : []);
  renderEntriesGrid(collectionView === 'grid' ? view.visible : []);
  updateColPagination(view.count,view.start,view.visible.length,view.pages);
  updateColChips();
  updateColFilterBtn();
}

function colSort(value){
  _colSortVal = value;
  document.getElementById('col-sort-sel').value = value;
  applyCollectionFilter();
}

/* ── Individual filter setters ── */
function colSearch(val){colFilter.search=val.trim();applyCollectionFilter();}

/* ── Render tag filter pills from real entry tags ── */
function renderColTagPills(entries){
  var container=document.getElementById('col-tag-pills');
  if(!container)return;
  // Collect tag frequency from entries
  var freq=Object.create(null);
  (entries||[]).forEach(function(e){
    (e.tags||[]).forEach(function(t){
      var tag=(t.name||t||'').toLowerCase();
      if(tag)freq[tag]=(freq[tag]||0)+1;
    });
  });
  var tags=Object.keys(freq).sort(function(a,b){return freq[b]-freq[a];}).slice(0,30);
  if(!tags.length){
    container.innerHTML='<span style="font-size:11.5px;color:var(--t-3)">No tags yet</span>';
    return;
  }
  container.innerHTML=tags.map(function(tag){
    var active=colFilter.tags.indexOf(tag)>=0;
    var safeTag=escHtml(tag);
    return '<span class="col-tag-pill'+(active?' active':'')+'" data-tag="'+safeTag+'" onclick="toggleTagFilter(this,this.dataset.tag)">#'+safeTag+'</span>';
  }).join('');
}
function setColPill(el){
  el.closest('.pills').querySelectorAll('.pill').forEach(function(p){p.classList.remove('active')});
  el.classList.add('active');
  colFilter.format=el.textContent.trim();
  var _scr=document.getElementById('s-collection');
  applyCollectionFilter();
}
function toggleTagFilter(el,tag){
  el.classList.toggle('active');
  var idx=colFilter.tags.indexOf(tag);
  if(idx>=0)colFilter.tags.splice(idx,1);else colFilter.tags.push(tag);
  applyCollectionFilter();
}
function colUpdateRating(){
  colFilter.ratingMin=parseFloat(document.getElementById('col-rmin').value)||0;
  colFilter.ratingMax=Number(document.getElementById('col-rmax').value);
  applyCollectionFilter();
}
function colUpdateDate(){
  var yf=document.getElementById('col-yfrom').value;
  var yt=document.getElementById('col-yto').value;
  colFilter.yearFrom=yf?parseInt(yf):0;
  colFilter.yearTo=yt?parseInt(yt):9999;
  applyCollectionFilter();
}
function clearColFilters(){
  colFilter=journalView.defaultFilters();
  document.getElementById('col-search-inp').value='';
  document.getElementById('col-rmin').value=0;
  document.getElementById('col-rmax').value=10;
  document.getElementById('col-yfrom').value='';
  document.getElementById('col-yto').value='';
  document.querySelectorAll('.col-tag-pill.active').forEach(function(p){p.classList.remove('active')});
  document.querySelectorAll('#s-collection .pills .pill').forEach(function(p){p.classList.remove('active')});
  document.querySelector('#s-collection .pills .pill').classList.add('active');
  var _ss=document.getElementById('s-collection');if(_ss)_ss.classList.remove('col-ss-mode');
  applyCollectionFilter();
}

/* ── Filter panel toggle ── */
function toggleFilterPanel(){
  var panel=document.getElementById('col-adv-panel');
  panel.classList.toggle('open');
}

/* ── Active filter chips (shows what's currently on) ── */
function updateColChips(){
  var bar=document.getElementById('col-chips');
  var chips=[];
  if(colFilter.search)chips.push({type:'search', label:'Search: "'+colFilter.search+'"'});
  if(colFilter.format!=='All')chips.push({type:'format', label:'Format: '+colFilter.format});
  if(colFilter.ratingMin>0||colFilter.ratingMax<10)chips.push({type:'rating', label:'Rating: '+colFilter.ratingMin+'–'+colFilter.ratingMax});
  if(colFilter.yearFrom||colFilter.yearTo<9999)chips.push({type:'year', label:'Year: '+(colFilter.yearFrom||'any')+'–'+(colFilter.yearTo<9999?colFilter.yearTo:'any')});
  colFilter.tags.forEach(function(tag){chips.push({type:'tag', tag:tag, label:'#'+tag});});

  if(!chips.length){bar.classList.remove('visible');bar.innerHTML='';return;}
  bar.classList.add('visible');
  bar.innerHTML='<span style="font-size:11px;color:var(--t-3)">Filtered by:</span>'+
    chips.map(function(c){
      /* Use data attributes instead of serialized closures — avoids scope loss */
      var extra = c.type === 'tag' ? ' data-chip-type="tag" data-chip-tag="'+escHtml(c.tag)+'"' : ' data-chip-type="'+c.type+'"';
      return '<span class="col-chip"><span>'+escHtml(c.label)+'</span><span class="col-chip-x"'+extra+' onclick="clearColChip(this)">×</span></span>';
    }).join('')+
    '<span class="col-chips-clear" onclick="clearColFilters()">Clear all</span>';
}

/* ── Clear a single active filter chip (called from data-chip-type onclick) ── */
function clearColChip(el){
  var t = el.dataset.chipType;
  if(t === 'search'){
    colFilter.search = '';
    var si = document.getElementById('col-search-inp'); if(si) si.value = '';
  } else if(t === 'format'){
    colFilter.format = 'All';
    document.querySelectorAll('#s-collection .pills .pill').forEach(function(p){ p.classList.remove('active'); });
    var first = document.querySelector('#s-collection .pills .pill'); if(first) first.classList.add('active');
    var _ss2=document.getElementById('s-collection');if(_ss2)_ss2.classList.remove('col-ss-mode');
  } else if(t === 'rating'){
    colFilter.ratingMin = 0; colFilter.ratingMax = 10;
    var rmin = document.getElementById('col-rmin'); if(rmin) rmin.value = 0;
    var rmax = document.getElementById('col-rmax'); if(rmax) rmax.value = 10;
  } else if(t === 'year'){
    colFilter.yearFrom = 0; colFilter.yearTo = 9999;
    var yf = document.getElementById('col-yfrom'); if(yf) yf.value = '';
    var yt = document.getElementById('col-yto');   if(yt) yt.value = '';
  } else if(t === 'tag'){
    var tag = el.dataset.chipTag || '';
    var idx = colFilter.tags.indexOf(tag);
    if(idx >= 0) colFilter.tags.splice(idx, 1);
    document.querySelectorAll('.col-tag-pill').forEach(function(p){
      if(p.dataset.tag === tag) p.classList.remove('active');
    });
  }
  applyCollectionFilter();
}

/* ── Pagination bar update ── */
function changeCollectionPage(delta){
  _collectionPage += delta;
  renderCollectionPage();
}

function updateColPagination(count,start,length,pages){
  var info = document.getElementById('col-pag-info');
  var nav = document.getElementById('col-page-nav');
  var filtered = journalView.hasFilters(colFilter);
  info.textContent = count ? 'Showing ' + (start+1) + '–' + (start+length) + ' of ' + count + (filtered ? ' matching entries' : ' entries')
    : filtered ? 'No matching entries' : 'No entries yet';
  nav.hidden = pages < 2;
  document.getElementById('col-page-number').textContent = _collectionPage + ' / ' + pages;
  document.getElementById('col-page-prev').disabled = _collectionPage <= 1;
  document.getElementById('col-page-next').disabled = _collectionPage >= pages;
  var filterCount = document.getElementById('col-filter-count');
  if(filterCount) filterCount.textContent = filtered ? count+' results' : '';
}

/* ── Filter button indicator dot ── */
function updateColFilterBtn(){
  var btn=document.getElementById('col-filter-btn');
  if(!btn)return;
  btn.classList.toggle('col-filter-on',journalView.hasFilters(colFilter));
}
