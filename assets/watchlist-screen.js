/* Watchlist rows, filters, and their visual states. */

var _watchlistSort = 'date';
var _queueSaving = false;
function wlSort(value){
  _watchlistSort = value;
  renderWatchlist();
}

function renderWatchlist(){
  var items = journalView.watchlistView(_wlItems,_wlTab,_watchlistSort);

  var listEl  = document.getElementById('wl-list');
  var emptyEl = document.getElementById('wl-empty');
  var phSub   = document.getElementById('wl-ph-sub');
  var badge   = document.getElementById('wl-count-badge');
  var total   = _wlItems.length;

  if(phSub)  phSub.textContent  = total + (total === 1 ? ' saved item' : ' saved items');
  if(badge)  badge.textContent  = total > 0 ? total : '';

  /* Always reset select-all state on re-render so button label stays accurate */
  _wlAllSelected = false;
  var selBtn = document.getElementById('wl-sel-all-btn');
  if(selBtn) selBtn.textContent = 'Select All';

  if(!listEl) return;

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
      var score   = it.match_score ? Math.round(it.match_score) + '%' : '—';
      var priCls  = journalView.watchlistPriority(it) === 'up_next' ? 'p-next' : 'p-maybe';
      var tags    = (it.tags || []).map(function(t){ return '<span class="tag">'+escHtml(t)+'</span>'; }).join('');
      var savedAgo = _timeAgo(it.saved_at);
      var delay   = idx < 5 ? ' anim-delay-' + idx : '';
      html += '<div class="wl-item anim-fadeup'+delay+'" data-wl-id="'+it.id+'">'
        + '<input type="checkbox" style="accent-color:var(--p-rich);flex-shrink:0">'
        + '<div class="wl-thumb" style="background:'+escHtml(bg)+'">'
        +   '<span style="font-size:14px;color:rgba(255,255,255,.25);font-family:\'Cormorant Garamond\',serif">'+escHtml(initials)+'</span>'
        + '</div>'
        + '<div class="wl-info">'
        +   '<div class="wl-title">'+escHtml(it.title)+catalogueContext(it)+'</div>'
        +   '<div class="wl-meta">'+(mediaIdentity.part(it)==='track'?'Track':FMT_LABEL[it.format]||it.format)+' · Added '+savedAgo+'</div>'
        +   '<div class="wl-tags">'+tags+'</div>'
        + '</div>'
        + '<select class="wl-priority '+priCls+'" aria-label="Priority for '+escHtml(it.title)+'" onchange="setWatchlistPriority(this)">'
        + '<option value="maybe"'+(journalView.watchlistPriority(it) !== 'up_next' ? ' selected' : '')+'>Maybe</option>'
        + '<option value="up_next"'+(journalView.watchlistPriority(it) === 'up_next' ? ' selected' : '')+'>Up Next</option></select>'
        + '<div class="wl-match">'+score+'</div>'
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
  listEl.innerHTML = html;
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
