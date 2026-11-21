/* Journal entry form and title search. */

function resetEntryForm(){
  ['add-title','add-notes','add-date','add-year','tp-search-inp','sport-select'].forEach(function(id){
    var field = document.getElementById(id);
    if(field) field.value = field.tagName === 'SELECT' ? field.options[0].value : '';
  });
  var format = document.getElementById('add-format');
  format.selectedIndex = 0;
  updateSportField(format);
  document.getElementById('add-rating').value = 8;
  updateRatingRef(8);
  clearPoster();
  setEntryCatalogue(null);
  _closeSearchDrop();
  var swatch = document.querySelector('.cover-swatch');
  setCover(swatch, swatch.style.background);
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
  var watchlistId = _wlMoveId;
  var recommendation = _discAddRec;

  button.disabled = true;
  button.textContent = editing ? 'Updating…' : 'Saving…';
  try {
    var result = await SUPA.rpc('save_journal_media',{
      p_entry_id:entryId, p_edit:editing, p_title:title, p_format:format,
      p_rating:Number(document.getElementById('add-rating').value),
      p_notes:document.getElementById('add-notes').value.trim() || null,
      p_cover_color:currentCover, p_date_completed:document.getElementById('add-date').value || null,
      p_poster_url:_posterUrl || null,
      p_tags:Array.from(document.querySelectorAll('#tag-picker .tp.sel'),function(tag){return tag.textContent.trim();}),
      p_watchlist_id:watchlistId, p_catalogue:_entryCatalogue
    });
    if(currentUser?.id !== owner) return;
    if(result.error || result.data !== entryId){
      showToast(result.error?.code === 'P0002' ? result.error.message : 'Could not save the entry. Your form is ready to retry.', '⚠');
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
  var rVal   = Number(currentEntry.rating ?? 8);

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

  updateSportField(fmtSel);

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
  updateSportField(select);
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
  fetch('/api/search?q='+encodeURIComponent(q)+'&type='+type,{signal:request.signal})
    .then(function(response){
      if(!response.ok) throw new Error('Search failed');
      return response.json();
    })
    .then(function(list){
      if(_csRequest !== request) return;
      _csResults = Array.isArray(list) ? list : [];
      var isAll = (type === 'all');
      var manualRow = '<div class="cs-item cs-manual-row" onclick="_closeSearchDrop()">'
        +'<div class="cs-poster-ph" style="font-size:14px">✏️</div>'
        +'<div class="cs-info"><div class="cs-title-txt">Add "'+escHtml(q)+'" manually</div>'
        +'<div class="cs-meta-txt">Fill in the details yourself below</div></div></div>';
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
          : '<div class="cs-poster-ph">'+fmtIcon+'</div>';
        var typeLabel = isAll && r._type ? '<span style="font-size:10px;font-weight:600;color:var(--p-rich);margin-right:4px">'+formatLabel+'</span>' : '';
        var meta = (r.year||'') + (r.description ? (r.year?' · ':'')+r.description.slice(0,55):'');
        return '<div class="cs-item" onclick="_pickSearchResult('+i+')">'
          +posterHtml
          +'<div class="cs-info">'
            +'<div class="cs-title-txt">'+typeLabel+escHtml(r.title)+'</div>'
            +'<div class="cs-meta-txt">'+escHtml(meta)+'</div>'
          +'</div></div>';
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
    updateSportField(formatSelect);
  }
  setEntryCatalogue(r);
  _closeSearchDrop();
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
