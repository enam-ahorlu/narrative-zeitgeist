/* Journal entry form and title search. */

function resetEntryForm(){
  ['add-title','add-notes','add-date','add-year','tp-search-inp'].forEach(function(id){
    var field = document.getElementById(id);
    if(field) field.value = field.tagName === 'SELECT' ? field.options[0].value : '';
  });
  var format = document.getElementById('add-format');
  format.selectedIndex = 0;
  document.getElementById('add-rating').value = '';
  updateRatingRef('');
  clearPoster();
  setEntryCatalogue(null);
  _closeSearchDrop();
  var swatch = document.querySelector('.cover-swatch');
  setCover(swatch, swatch.style.background);
}

/* The same work already in the collection, or null. Log again bypasses this on purpose. */
function existingCollectionEntry(candidate){
  return _allEntries.find(function(entry){return mediaIdentity.sameWork(entry,candidate);}) || null;
}

async function saveEntry(){
  var owner = currentUser?.id;
  var button = document.getElementById('add-save-btn');
  if(!owner || button.disabled) return;
  var editing = editMode;
  var entryId = editing ? currentEntry?.id : _entryDraftId;
  if(!entryId) return;
  var title = document.getElementById('add-title').value.trim();
  if(!title){showToast('Please enter a title');return;}
  var format = journalView.formatKey(document.getElementById('add-format').value);
  if(!format){showToast('Please select a format');return;}
  var rating = document.getElementById('add-rating');
  if(!rating.reportValidity()) return;
  var watchlistId = _wlMoveId;
  var recommendation = _discAddRec;
  if(!editing && !_entryRepeat){
    var existing = existingCollectionEntry({title:title,format:format,catalogue:_entryCatalogue});
    if(existing){
      showToast('"'+existing.title+'" is already in your collection. Open it and choose Log again to record another time.','⚠');
      return;
    }
  }

  button.disabled = true;
  button.textContent = editing ? 'Updating…' : 'Saving…';
  try {
    var result = await SUPA.rpc('save_journal_media',{
      p_entry_id:entryId, p_edit:editing, p_title:title, p_format:format,
      p_rating:rating.value === '' ? null : rating.valueAsNumber,
      p_notes:document.getElementById('add-notes').value.trim() || null,
      p_cover_color:currentCover, p_date_completed:document.getElementById('add-date').value || null,
      p_poster_url:_posterUrl || null,
      p_tags:Array.from(document.querySelectorAll('#tag-picker .tp.sel'),function(tag){return tag.textContent.trim();}),
      p_watchlist_id:watchlistId, p_catalogue:_entryCatalogue, p_repeat:_entryRepeat
    });
    if(currentUser?.id !== owner) return;
    if(result.error || result.data !== entryId){
      showToast(result.error?.code === 'P0002' ? result.error.message
        : result.error?.code === '23505' ? 'This is already in your collection. Open it and choose Log again to record another time.'
        : 'Could not save the entry. Your form is ready to retry.', '⚠');
      return;
    }
    button.disabled = false;
    closeModal('add');
    showToast(editing ? 'Entry updated' : watchlistId ? 'Moved to Collection' : 'Entry saved to your collection');
    if(recommendation) removeDiscoveryPick(recommendation);
    if(watchlistId) removeWatchlistRow(watchlistId);
    refreshJournal(Boolean(recommendation));
  } catch {
    if(currentUser?.id === owner) showToast('Could not confirm the save. Retry this form to check.', '⚠');
  } finally {
    button.disabled = false;
    button.textContent = editMode ? 'Update Entry' : 'Save Entry';
  }
}

/* ── Open Add modal pre-filled for editing (E1) ── */
function openEditModal(){
  if(!currentEntry){ showToast('No entry selected'); return; }
  resetEntryForm();
  editMode=true;

  /* Use currentEntry directly — no DOM scraping */
  var title  = currentEntry.title  || '';
  var format = currentEntry.format || 'show';
  var rVal   = currentEntry.rating ?? '';

  /* Update modal heading + button */
  document.getElementById('add-modal-title').textContent='Edit Entry';
  document.getElementById('add-save-btn').textContent='Update Entry';

  /* Pre-fill title */
  var titleInp=document.getElementById('add-title');
  if(titleInp) titleInp.value=title;

  /* Pre-fill format — match DB value to dropdown option */
  var fmtSel = document.getElementById('add-format');
  fmtSel.value = mediaIdentity.part(currentEntry) === 'track' ? 'Track' : FMT_LABEL[format] || 'Show';
  setEntryCatalogue(currentEntry);


  /* Pre-fill rating */
  var ratingInp=document.getElementById('add-rating');
  if(ratingInp){ratingInp.value=rVal;updateRatingRef(rVal);}

  /* Pre-fill notes from currentEntry */
  var notesInp=document.getElementById('add-notes');
  if(notesInp) notesInp.value = (currentEntry && currentEntry.notes) ? currentEntry.notes : '';
  /* Pre-fill date from currentEntry */
  var dateInp=document.getElementById('add-date');
  if(dateInp && currentEntry && currentEntry.date_completed) dateInp.value = currentEntry.date_completed.slice(0,10);
  /* Pre-fill poster from currentEntry */
  applyEntryPoster(currentEntry.poster_url,title,mediaIdentity.metadata(currentEntry).year);

  /* Load picker with user's real tags, pre-selecting this entry's tags */
  var detailTags = currentEntry && Array.isArray(currentEntry.tags)
    ? currentEntry.tags.map(function(t){ return (t.name || t || '').toLowerCase(); })
    : [];
  loadTagPicker(detailTags);

  /* Pre-select the cover swatch that matches the entry's current cover */
  var detailCoverEl=document.getElementById('detail-cover');
  var entryGrad=detailCoverEl?detailCoverEl.style.background:'';
  if(entryGrad){
    currentCover=entryGrad;
    var matched=false;
    document.querySelectorAll('.cover-swatch').forEach(function(s){
      var match=(s.style.background===entryGrad);
      s.classList.toggle('active',match);
      if(match)matched=true;
    });
    if(!matched)document.querySelector('.cover-swatch').classList.add('active');
    var prev=document.getElementById('cover-preview');
    if(prev)prev.style.background=entryGrad;
  }

  closeModal('detail');
  openModal('add');
}

var _posterUrl  = null;
var _entryCatalogue = null;
var _csTimer    = null;
var _csResults  = [];
var _csRequest = null;
var _FMT_ICONS  = {Film:'🎬', Show:'📺', Book:'📚', Music:'🎵', Match:'⚽'};

function setEntryCatalogue(item){
  var catalogue = item ? mediaIdentity.metadata(item) : {};
  if(document.getElementById('add-format').value === 'Track') catalogue.kind = 'track';
  _entryCatalogue = Object.keys(catalogue).length ? catalogue : null;
  var label = document.getElementById('add-source');
  var detail = [catalogue.creator,catalogue.year,catalogue.provider].filter(Boolean).join(' · ');
  label.textContent = detail;
  label.hidden = !detail;
}

function changeEntryFormat(select){
  setEntryCatalogue(null);
  if(document.getElementById('cs-drop').classList.contains('open') || _csTimer){
    onTitleInput(document.getElementById('add-title').value);
  }
}

function onTitleInput(value){
  clearPoster();
  setEntryCatalogue(null);
  _closeSearchDrop();
  var query = value.trim();
  if(query.length < 2) return;
  _csTimer = setTimeout(function(){
    _csTimer = null;
    _doContentSearch(query);
  },380);
}

function _doContentSearch(q){
  var fmtVal = document.getElementById('add-format').value;
  var format = journalView.formatKey(fmtVal);
  var type = fmtVal === 'Track' ? 'track' : journalView.formats[format]?.search || 'all';
  var request = new AbortController();
  _csRequest = request;
  var drop = document.getElementById('cs-drop');
  if(!drop) return;
  drop.innerHTML = '<div class="cs-searching">Searching…</div>';
  drop.classList.add('open');
  var searchUser = currentUser;
  accountToken(searchUser && searchUser.id)
    .then(function(token){
      return fetch('/api/search?q='+encodeURIComponent(q)+'&type='+type,{signal:request.signal,headers:{Authorization:'Bearer '+token}});
    })
    .then(function(response){
      if(!response.ok) throw new Error('Search failed');
      return response.json();
    })
    .then(function(list){
      if(_csRequest !== request) return;
      _csResults = Array.isArray(list) ? list : [];
      var isAll = (type === 'all');
      var manualRow = '<button type="button" class="cs-item cs-manual-row" onclick="finishTitleSearch()">'
        +'<span class="cs-poster-ph" style="font-size:14px">✏️</span>'
        +'<span class="cs-info"><span class="cs-title-txt">Add "'+escHtml(q)+'" manually</span>'
        +'<span class="cs-meta-txt">Fill in the details yourself below</span></span></button>';
      if(!_csResults.length){
        drop.innerHTML = '<div class="cs-searching">No results found in any database</div>'+manualRow;
        return;
      }
      var icon = _FMT_ICONS[fmtVal] || '🔍';
      drop.innerHTML = _csResults.map(function(r, i){
        var formatLabel = r._type === 'track' ? 'Track' : FMT_LABEL[journalView.formatKey(r._type)] || '';
        var fmtIcon = _FMT_ICONS[formatLabel] || icon;
        var posterHtml = r.poster_url
          ? '<img class="cs-poster" src="'+escHtml(r.poster_url)+'" alt="">'
          : '<span class="cs-poster-ph">'+fmtIcon+'</span>';
        var typeLabel = isAll && r._type ? '<span style="font-size:10px;font-weight:600;color:var(--p-rich);margin-right:4px">'+formatLabel+'</span>' : '';
        var meta = (r.year||'') + (r.description ? (r.year?' · ':'')+r.description.slice(0,55):'');
        return '<button type="button" class="cs-item" onclick="_pickSearchResult('+i+')">'
          +posterHtml
          +'<span class="cs-info">'
            +'<span class="cs-title-txt">'+typeLabel+escHtml(r.title)+'</span>'
            +'<span class="cs-meta-txt">'+escHtml(meta)+'</span>'
          +'</span></button>';
      }).join('') + '<div class="cs-divider"></div>' + manualRow;
    })
    .catch(function(){
      if(_csRequest === request) drop.textContent = 'Search unavailable. You can enter the title manually.';
    })
    .finally(function(){
      if(_csRequest === request) _csRequest = null;
    });
}

function _pickSearchResult(idx){
  var r = _csResults[idx];
  if(!r) return;
  /* Set title */
  var titleInp = document.getElementById('add-title');
  if(titleInp) titleInp.value = r.title;
  /* Auto-set format from result type */
  var formatLabel = r._type === 'track' ? 'Track' : FMT_LABEL[journalView.formatKey(r._type)];
  if(formatLabel){
    var formatSelect = document.getElementById('add-format');
    formatSelect.value = formatLabel;
  }
  setEntryCatalogue(r);
  finishTitleSearch();
  applyEntryPoster(r.poster_url,r.title,r.year);
}

function applyEntryPoster(url,title,year){
  clearPoster();
  if(!url) return;
  _posterUrl = url;
  document.getElementById('cover-poster-img').src = url;
  document.getElementById('cover-poster-title').textContent = title || '';
  document.getElementById('cover-poster-year').textContent = year || '';
  document.getElementById('cover-poster-wrap').classList.add('visible');
}

function clearPoster(){
  _posterUrl = null;
  var cpw = document.getElementById('cover-poster-wrap');
  if(cpw) cpw.classList.remove('visible');
}

function finishTitleSearch(){
  _closeSearchDrop();
  document.getElementById('add-title').focus();
}

document.addEventListener('keydown',function(event){
  var drop = document.getElementById('cs-drop');
  var input = document.getElementById('add-title');
  if(!drop.classList.contains('open') || (event.target !== input && !drop.contains(event.target))) return;
  var results = Array.from(drop.querySelectorAll('button'));
  if(event.key === 'Escape'){
    event.preventDefault();
    event.stopImmediatePropagation();
    finishTitleSearch();
  } else if(results.length && ['ArrowDown','ArrowUp'].includes(event.key)){
    event.preventDefault();
    var index = results.indexOf(event.target);
    var next = event.key === 'ArrowDown' ? index+1 : (index < 0 ? results.length-1 : index-1);
    results[(next+results.length)%results.length].focus();
  }
},true);

function _closeSearchDrop(){
  clearTimeout(_csTimer);
  _csTimer = null;
  _csRequest?.abort();
  _csRequest = null;
  _csResults = [];
  var drop = document.getElementById('cs-drop');
  if(drop){ drop.innerHTML=''; drop.classList.remove('open'); }
}

/* Close search dropdown on outside click */
document.addEventListener('click', function(e){
  var drop = document.getElementById('cs-drop');
  var inp  = document.getElementById('add-title');
  if(drop && !drop.contains(e.target) && e.target !== inp){
    drop.classList.remove('open');
  }
});
