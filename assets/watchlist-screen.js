/* Watchlist rows, filters, and their visual states. */

var _watchlistSort = 'date';
var _queueSaving = false;
function wlSort(value){
  _watchlistSort = value;
  renderWatchlist();
}

/* Wishlisted fragrances and wardrobe items live in the Style & Scent store. The watchlist shows them in their own
   sections (read from the same records, never copied), on the All tab only since they have no Up Next or Maybe priority. */
function _wlStyleWishes(){
  var wished = function(item){ return String(item.status || '').toLowerCase() === 'wishlisted'; };
  return {frags:_loadFrags().filter(wished), wards:_loadWard().filter(wished)};
}

function _wlStyleRow(kind, item){
  var fragrance = kind === 'fragrance';
  var name = item.name || (fragrance ? 'Fragrance' : 'Wardrobe item');
  var maker = fragrance ? item.house : item.brand;
  var photo = safeStylePhoto(item.photoUrl || '') || styleCataloguePhoto(kind, item)?.url || '';
  var initials = name.split(' ').slice(0,2).map(function(w){ return w[0]; }).join('');
  var thumb = photo ? '<img src="'+escHtml(photo)+'" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:contain" onerror="this.remove()">'
    : '<span style="font-size:14px;color:var(--t-3);font-family:\'Cormorant Garamond\',serif">'+escHtml(initials)+'</span>';
  var detail = fragrance ? [item.character, item.season].filter(Boolean).join(' · ') : [item.category, item.season].filter(Boolean).join(' · ');
  return '<div class="wl-item anim-fadeup" data-wl-style="'+kind+'" data-style-id="'+escHtml(item.id)+'">'
    + '<div class="wl-thumb" style="position:relative;overflow:hidden;background:var(--p-ghost)">'+thumb+'</div>'
    + '<div class="wl-info"><div class="wl-title">'+escHtml(name)+'</div>'
    + '<div class="wl-meta">'+escHtml([maker, detail].filter(Boolean).join(' · ') || (fragrance ? 'Fragrance' : 'Wardrobe'))+'</div></div>'
    + '<div class="wl-actions">'
    + '<button class="btn btn-p btn-sm" style="white-space:nowrap" onclick="wlStyleOwn(this)">Mark as owned</button>'
    + '<button class="btn btn-ghost btn-sm" onclick="wlStyleOpen(this)">Open</button></div></div>';
}

function _wlStyleHTML(wishes, hasAbove){
  var html = '';
  if(wishes.frags.length) html += '<div class="wl-section"'+(hasAbove ? ' style="margin-top:18px"' : '')+'>FRAGRANCES</div>' + wishes.frags.map(function(f){return _wlStyleRow('fragrance', f);}).join('');
  if(wishes.wards.length) html += '<div class="wl-section"'+(hasAbove || wishes.frags.length ? ' style="margin-top:18px"' : '')+'>WARDROBE</div>' + wishes.wards.map(function(w){return _wlStyleRow('wardrobe', w);}).join('');
  return html;
}

async function wlStyleOwn(btn){
  var row = btn.closest('[data-wl-style]');
  var kind = row.dataset.wlStyle, id = row.dataset.styleId;
  var item = (kind === 'fragrance' ? _loadFrags() : _loadWard()).find(function(x){ return x.id === id; });
  if(!item) return;
  var changed = await changeStyleItem(kind, Object.assign({}, item, {status: kind === 'fragrance' ? 'owned' : 'Owned'}), false);
  if(changed){ showToast((item.name || 'Item') + ' moved to your collection as owned', '✓'); renderWatchlist(); }
  else showToast('That change was not saved. Try again in a moment.', '⚠');
}

function wlStyleOpen(btn){
  var row = btn.closest('[data-wl-style]');
  if(row.dataset.wlStyle === 'fragrance') openFragranceModal(row.dataset.styleId); else openWardrobeModal(row.dataset.styleId);
}

function renderWatchlist(){
  var items = journalView.watchlistView(_wlItems,_wlTab,_watchlistSort);
  var wishes = _wlTab === 'all' ? _wlStyleWishes() : {frags:[], wards:[]};
  var styleCount = wishes.frags.length + wishes.wards.length;

  var listEl  = document.getElementById('wl-list');
  var emptyEl = document.getElementById('wl-empty');
  var phSub   = document.getElementById('wl-ph-sub');
  var badge   = document.getElementById('wl-count-badge');
  var allWishes = _wlStyleWishes();
  var total   = _wlItems.length + allWishes.frags.length + allWishes.wards.length;

  if(phSub)  phSub.textContent  = total + (total === 1 ? ' saved item' : ' saved items');
  if(badge)  badge.textContent  = total > 0 ? total : '';

  /* Always reset select-all state on re-render so button label stays accurate */
  _wlAllSelected = false;
  var selBtn = document.getElementById('wl-sel-all-btn');
  if(selBtn) selBtn.textContent = 'Select All';

  if(!listEl) return;

  if(items.length === 0 && styleCount > 0){
    if(emptyEl) emptyEl.style.display = 'none';
    listEl.innerHTML = _wlStyleHTML(wishes, false);
    return;
  }
  if(items.length === 0){
    if(_wlItems.length === 0){
      /* Watchlist is genuinely empty — show the full onboarding empty state */
      listEl.innerHTML = '';
      if(emptyEl) emptyEl.style.display = '';
    } else {
      /* Items exist but none match the current tab filter */
      if(emptyEl) emptyEl.style.display = 'none';
      var tabLabel = _wlTab === 'up_next' ? 'Up Next' : _wlTab === 'maybe' ? 'Maybe' : 'All';
      listEl.innerHTML = '<div style="text-align:center;padding:48px 16px;color:var(--t-3);font-size:13px">'
        + 'No <strong>' + tabLabel + '</strong> items yet.'
        + '<br><span style="font-size:12px;opacity:.7;margin-top:4px;display:block">Switch to <em>All</em> or change an item\'s priority.</span>'
        + '</div>';
    }
    return;
  }
  if(emptyEl) emptyEl.style.display = 'none';

  /* Group by format */
  var groups = {};
  var groupOrder = [];
  items.forEach(function(it){
    var f = _wlTab === 'up_next' && _watchlistSort === 'queue' ? 'queue' : it.format || 'show';
    if(!groups[f]){ groups[f] = []; groupOrder.push(f); }
    groups[f].push(it);
  });

  var html = '';
  groupOrder.forEach(function(fmt, gi){
    html += '<div class="wl-section"' + (gi > 0 ? ' style="margin-top:18px"' : '') + '>'
          + (fmt === 'queue' ? 'UP NEXT ORDER' : (journalView.formats[fmt]?.plural || fmt).toUpperCase()) + '</div>';
    groups[fmt].forEach(function(it, idx){
      var bg      = it.cover_color || 'linear-gradient(135deg,#1B5E76,#4AADBA)';
      var initials = it.title.split(' ').slice(0,2).map(function(w){ return w[0]; }).join('');
      var poster = mediaPosterImage(it);
      var priCls  = journalView.watchlistPriority(it) === 'up_next' ? 'p-next' : 'p-maybe';
      var tags    = (it.tags || []).map(function(t){ return '<span class="tag">'+escHtml(t)+'</span>'; }).join('');
      var savedAgo = _timeAgo(it.saved_at);
      var delay   = idx < 5 ? ' anim-delay-' + idx : '';
      html += '<div class="wl-item anim-fadeup'+delay+'" data-wl-id="'+it.id+'">'
        + '<input type="checkbox" style="accent-color:var(--p-rich);flex-shrink:0">'
        + '<div class="wl-thumb" style="position:relative;overflow:hidden;background:'+escHtml(bg)+'">'
        +   '<span style="font-size:14px;color:rgba(255,255,255,.25);font-family:\'Cormorant Garamond\',serif">'+escHtml(initials)+'</span>'+poster
        + '</div>'
        + '<div class="wl-info">'
        +   '<div class="wl-title">'+escHtml(it.title)+catalogueContext(it)+'</div>'
        +   '<div class="wl-meta">'+(mediaIdentity.part(it)==='track'?'Track':FMT_LABEL[it.format]||it.format)+' · Added '+savedAgo+'</div>'
        +   '<div class="wl-tags">'+tags+'</div>'
        + '</div>'
        + '<select class="wl-priority '+priCls+'" aria-label="Priority for '+escHtml(it.title)+'" onchange="setWatchlistPriority(this)">'
        + '<option value="maybe"'+(journalView.watchlistPriority(it) !== 'up_next' ? ' selected' : '')+'>Maybe</option>'
        + '<option value="up_next"'+(journalView.watchlistPriority(it) === 'up_next' ? ' selected' : '')+'>Up Next</option></select>'
        + (fmt === 'queue' ? '<div class="wl-order-controls">'
          + '<button class="btn btn-g btn-sm" title="Move earlier" aria-label="Move '+escHtml(it.title)+' earlier" '+(idx === 0 || _queueSaving ? 'disabled ' : '')+'onclick="moveUpNext(this,-1)">↑</button>'
          + '<button class="btn btn-g btn-sm" title="Move later" aria-label="Move '+escHtml(it.title)+' later" '+(idx === items.length-1 || _queueSaving ? 'disabled ' : '')+'onclick="moveUpNext(this,1)">↓</button></div>' : '')
        + '<div class="wl-actions">'
        +   '<button class="btn btn-p btn-sm" style="white-space:nowrap" onclick="wlMoveToCollection(\''+it.id+'\')">Move to Collection</button>'
        +   '<button class="btn btn-ghost btn-sm wl-remove-btn" onclick="startWlRemove(this)">Remove</button>'
        +   '<div class="wl-remove-confirm"><span>Remove?</span>'
        +     '<button class="btn btn-g btn-sm" onclick="cancelWlRemove(this)">Cancel</button>'
        +     '<button class="btn btn-ghost btn-sm btn-danger" onclick="confirmWlRemove(this)">Yes, remove</button>'
        +   '</div>'
        +   '<button class="btn btn-ghost wl-pass-btn" onclick="passWlItem(this)" title="Not for me">✕</button>'
        + '</div>'
        + '</div>';
    });
  });
  listEl.innerHTML = html + _wlStyleHTML(wishes, true);
}

function _timeAgo(iso){
  var diff = Date.now() - new Date(iso).getTime();
  var mins = Math.floor(diff / 60000);
  if(mins < 1)   return 'just now';
  if(mins < 60)  return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if(hrs < 24)   return hrs + 'h ago';
  var days = Math.floor(hrs / 24);
  if(days === 1) return 'yesterday';
  if(days < 30)  return days + ' days ago';
  var mos = Math.floor(days / 30);
  return mos + (mos === 1 ? ' month ago' : ' months ago');
}

function setWlTab(el){
  document.querySelectorAll('.wl-stab').forEach(function(t){ t.classList.remove('active'); });
  el.classList.add('active');
  _wlTab = el.dataset.priority;
  var select = document.getElementById('wl-sort-sel');
  select.querySelector('[value="queue"]').hidden = _wlTab !== 'up_next';
  _watchlistSort = _wlTab === 'up_next' ? 'queue' : 'date';
  select.value = _watchlistSort;
  renderWatchlist();
}

function startWlRemove(btn){
  var actions = btn.closest('.wl-actions');
  btn.style.display = 'none';
  var confirmEl = actions.querySelector('.wl-remove-confirm');
  if(confirmEl) confirmEl.classList.add('open');
}
function cancelWlRemove(btn){
  var actions   = btn.closest('.wl-actions');
  var confirmEl = actions.querySelector('.wl-remove-confirm');
  if(confirmEl) confirmEl.classList.remove('open');
  var removeBtn = actions.querySelector('.wl-remove-btn');
  if(removeBtn) removeBtn.style.display = '';
}

function _animateRemove(el, cb){
  el.style.transition = 'opacity .3s, transform .3s';
  el.style.opacity    = '0';
  el.style.transform  = 'translateX(-14px)';
  setTimeout(cb, 320);
}
