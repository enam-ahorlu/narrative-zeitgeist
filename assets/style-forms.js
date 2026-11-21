/* Style & Scent form controllers and catalogue autocomplete. */

function setStyleTags(prefix, tags){
  var picker = document.getElementById(prefix+'-tag-picker');
  picker.querySelectorAll('[data-saved-tag]').forEach(function(tag){tag.remove();});
  var pending = new Map(tags.map(function(tag){return [tag.trim().toLowerCase(),tag];}));
  picker.querySelectorAll('.tp').forEach(function(button){
    var key = button.textContent.trim().toLowerCase();
    button.classList.toggle('sel',pending.delete(key));
  });
  pending.forEach(function(tag){
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'tp sel';
    button.dataset.savedTag = '';
    button.textContent = tag;
    button.onclick = function(){button.classList.toggle('sel');};
    picker.appendChild(button);
  });
}

function setStyleChoice(id, value){
  var select = document.getElementById(id);
  Array.from(select.querySelectorAll('[data-saved-choice]')).forEach(function(option){option.remove();});
  if(value && !Array.from(select.options).some(function(option){return option.value === value;})){
    var option = new Option(value,value);
    option.dataset.savedChoice = '';
    select.add(option);
  }
  select.value = value;
}

function openFragranceModal(id){
  _fragDraftId = crypto.randomUUID();
  _fragEditId = id || null;
  var modal = document.getElementById('m-fragrance');
  if(!modal) return;
  /* Reset fields */
  var fields = {
    'frag-name':'','frag-house':'','frag-char':'',
    'frag-occasion':'','frag-top':'','frag-mid':'','frag-base':'','frag-review':'','frag-photo':''
  };
  Object.keys(fields).forEach(function(k){ var el=document.getElementById(k); if(el) el.value=fields[k]; });
  var sel = document.getElementById('frag-status'); if(sel) sel.value='owned';
  var proj = document.getElementById('frag-proj'); if(proj) proj.value='Moderate';
  var seas = document.getElementById('frag-season'); if(seas) seas.value='Year-round';
  var rat = document.getElementById('frag-rating'); if(rat) rat.value=0;
  var rv = document.getElementById('frag-rv'); if(rv) rv.textContent='—';
  var drop = document.getElementById('frag-cs-drop'); if(drop){ drop.innerHTML=''; drop.classList.remove('open'); }
  setStyleTags('frag',[]);
  var ftpInp=document.getElementById('frag-tp-search'); if(ftpInp){ ftpInp.value=''; fragTagSearch(''); }
  /* Edit mode */
  var delBtn  = document.getElementById('frag-del-btn');
  var saveBtn = document.getElementById('frag-save-btn');
  var titleEl = document.getElementById('frag-modal-title');
  if(_fragEditId){
    var f = _loadFrags().find(function(x){ return x.id===_fragEditId; });
    if(f){
      var set = function(id, val){ var el=document.getElementById(id); if(el) el.value=val||''; };
      set('frag-name',f.name); set('frag-house',f.house); set('frag-char',f.character);
      set('frag-occasion',f.occasion); set('frag-top',f.notesTop); set('frag-mid',f.notesMid);
      set('frag-base',f.notesBase); set('frag-review',f.review); set('frag-photo',f.photoUrl);
      setStyleTags('frag',f.tags || []);
      var stEl=document.getElementById('frag-status'); if(stEl) stEl.value=f.status||'owned';
      var prEl=document.getElementById('frag-proj'); if(prEl) prEl.value=f.projection||'Moderate';
      var seEl=document.getElementById('frag-season'); if(seEl) seEl.value=f.season||'Year-round';
      var raEl=document.getElementById('frag-rating'); if(raEl) raEl.value=f.rating||0;
      var rvEl=document.getElementById('frag-rv'); if(rvEl) rvEl.textContent=f.rating>0?parseFloat(f.rating).toFixed(1):'—';
    }
    if(titleEl) titleEl.textContent='Edit Fragrance';
    if(saveBtn) saveBtn.textContent='Update Fragrance';
    if(delBtn)  delBtn.style.display='inline-flex';
  } else {
    if(titleEl) titleEl.textContent='Add Fragrance';
    if(saveBtn) saveBtn.textContent='Save Fragrance';
    if(delBtn)  delBtn.style.display='none';
  }
  modal.classList.add('open');
}

function closeFragranceModal(){
  var drop=document.getElementById('frag-cs-drop'); if(drop){ drop.innerHTML=''; drop.classList.remove('open'); }
  var m=document.getElementById('m-fragrance'); if(m) m.classList.remove('open');
}

async function saveFragrance(){
  var name = (document.getElementById('frag-name').value||'').trim();
  if(!name){ showToast('Please enter a fragrance name'); return; }
  var rawPhoto = document.getElementById('frag-photo').value.trim();
  var photoUrl = safeFragrancePhoto(rawPhoto);
  if(rawPhoto && !photoUrl){showToast('Use an HTTPS image URL.');return;}
  var rVal = parseFloat(document.getElementById('frag-rating').value)||0;
  var draftId = _fragDraftId;
  var selectedFragTags = Array.from(document.querySelectorAll('#frag-tag-picker .tp.sel')).map(function(t){ return t.textContent.trim(); });
  var f = {
    id: _fragEditId || draftId,
    name: name,
    house:     ((document.getElementById('frag-house')||{}).value||'').trim(),
    status:    (document.getElementById('frag-status')||{}).value||'owned',
    character: ((document.getElementById('frag-char')||{}).value||'').trim(),
    projection:(document.getElementById('frag-proj')||{}).value||'Moderate',
    season:    (document.getElementById('frag-season')||{}).value||'Year-round',
    occasion:  ((document.getElementById('frag-occasion')||{}).value||'').trim(),
    notesTop:  ((document.getElementById('frag-top')||{}).value||'').trim(),
    notesMid:  ((document.getElementById('frag-mid')||{}).value||'').trim(),
    notesBase: ((document.getElementById('frag-base')||{}).value||'').trim(),
    rating: rVal,
    photoUrl: photoUrl,
    review: ((document.getElementById('frag-review')||{}).value||'').trim(),
    tags: selectedFragTags,
    created: Date.now()
  };
  var existing = _loadFrags().find(function(item){return item.id === f.id;});
  if(existing) f.created = existing.created;
  if(!await changeStyleItem('fragrance', f, false)) return;
  if(_fragDraftId === draftId) closeFragranceModal();
  loadFragrances();
  showToast(existing ? 'Fragrance updated' : 'Fragrance added');
}

async function deleteFragrance(){
  if(!_fragEditId || currentStyleStore()?.busy) return;
  if(!confirm('Remove this fragrance from your wardrobe?')) return;
  if(!await changeStyleItem('fragrance', {id:_fragEditId}, true)) return;
  closeFragranceModal();
  loadFragrances();
  showToast('Fragrance removed');
}

function openWardrobeModal(id){
  _wardDraftId = crypto.randomUUID();
  clearCatalogueResults('ward');
  _wardEditId = id || null;
  var modal = document.getElementById('m-wardrobe');
  if(!modal) return;
  /* Reset */
  ['ward-name','ward-brand','ward-fabric','ward-pairing'].forEach(function(k){ var el=document.getElementById(k); if(el) el.value=''; });
  ['ward-color-name'].forEach(function(k){ var el=document.getElementById(k); if(el) el.value=''; });
  var cat=document.getElementById('ward-cat'); if(cat) cat.value='Tops';
  var sea=document.getElementById('ward-season'); if(sea) sea.value='Year-round';
  setStyleChoice('ward-occasion','Everyday');
  var sta=document.getElementById('ward-status'); if(sta) sta.value='Owned';
  _wardColor='#1B5E76';
  var cp=document.getElementById('ward-color-picker'); if(cp) cp.value='#1B5E76';
  document.querySelectorAll('#ward-palette .pal-sw').forEach(function(s){ s.classList.remove('active'); });
  setStyleTags('ward',[]);
  var wtpInp=document.getElementById('ward-tp-search'); if(wtpInp){ wtpInp.value=''; wardTagSearch(''); }
  /* Edit mode */
  var delBtn  = document.getElementById('ward-del-btn');
  var saveBtn = document.getElementById('ward-save-btn');
  var titleEl = document.getElementById('ward-modal-title');
  if(_wardEditId){
    var w=_loadWard().find(function(x){ return x.id===_wardEditId; });
    if(w){
      var set=function(id,val){ var el=document.getElementById(id); if(el) el.value=val||''; };
      set('ward-name',w.name); set('ward-brand',w.brand); set('ward-fabric',w.fabric);
      set('ward-pairing',w.pairing); set('ward-color-name',w.colorName);
      var catEl=document.getElementById('ward-cat'); if(catEl) catEl.value=w.category||'Tops';
      var seaEl=document.getElementById('ward-season'); if(seaEl) seaEl.value=w.season||'Year-round';
      setStyleChoice('ward-occasion',w.occasion || 'Everyday');
      var staEl=document.getElementById('ward-status'); if(staEl) staEl.value=w.status||'Owned';
      _wardColor=w.color||'#1B5E76';
      var cpEl=document.getElementById('ward-color-picker'); if(cpEl) cpEl.value=_wardColor;
      /* Highlight matching palette swatch */
      document.querySelectorAll('#ward-palette .pal-sw').forEach(function(s){
        if(s.dataset.color===_wardColor) s.classList.add('active');
      });
      setStyleTags('ward',w.tags || []);
    }
    if(titleEl) titleEl.textContent='Edit Item';
    if(saveBtn) saveBtn.textContent='Update Item';
    if(delBtn)  delBtn.style.display='inline-flex';
  } else {
    if(titleEl) titleEl.textContent='Add Wardrobe Item';
    if(saveBtn) saveBtn.textContent='Save Item';
    if(delBtn)  delBtn.style.display='none';
  }
  modal.classList.add('open');
}

function closeWardrobeModal(){
  clearCatalogueResults('ward');
  var m=document.getElementById('m-wardrobe'); if(m) m.classList.remove('open');
}

async function saveWardrobeItem(){
  var name=(document.getElementById('ward-name').value||'').trim();
  if(!name){ showToast('Please enter an item name'); return; }
  var draftId = _wardDraftId;
  var selectedWardTags=Array.from(document.querySelectorAll('#ward-tag-picker .tp.sel')).map(function(t){ return t.textContent.trim(); });
  var w={
    id: _wardEditId || draftId,
    name: name,
    brand:     ((document.getElementById('ward-brand')||{}).value||'').trim(),
    category:  (document.getElementById('ward-cat')||{}).value||'Tops',
    color:     _wardColor,
    colorName: ((document.getElementById('ward-color-name')||{}).value||'').trim(),
    fabric:    ((document.getElementById('ward-fabric')||{}).value||'').trim(),
    season:    (document.getElementById('ward-season')||{}).value||'Year-round',
    occasion:  (document.getElementById('ward-occasion')||{}).value||'Everyday',
    status:    (document.getElementById('ward-status')||{}).value||'Owned',
    pairing:   ((document.getElementById('ward-pairing')||{}).value||'').trim(),
    tags: selectedWardTags,
    created: Date.now()
  };
  var existing = _loadWard().find(function(item){return item.id === w.id;});
  if(existing) w.created = existing.created;
  if(!await changeStyleItem('wardrobe', w, false)) return;
  if(_wardDraftId === draftId) closeWardrobeModal();
  loadWardrobe();
  showToast(existing ? 'Item updated' : 'Item added to your wardrobe');
}

async function deleteWardrobeItem(){
  if(!_wardEditId || currentStyleStore()?.busy) return;
  if(!confirm('Remove this item from your wardrobe?')) return;
  if(!await changeStyleItem('wardrobe', {id:_wardEditId}, true)) return;
  closeWardrobeModal();
  loadWardrobe();
  showToast('Item removed');
}

function addFragFromDiscover(button){
  var rec = JSON.parse(button.dataset.frag);
  var detail = styleRecommendationDetails('fragrance',rec);
  openFragranceModal();
  document.getElementById('frag-name').value = detail.name;
  document.getElementById('frag-house').value = detail.house;
  document.getElementById('frag-char').value = detail.character;
  document.getElementById('frag-proj').value = detail.projection;
  document.getElementById('frag-season').value = detail.season;
  document.getElementById('frag-top').value = detail.notesTop;
  document.getElementById('frag-mid').value = detail.notesMid;
  document.getElementById('frag-base').value = detail.notesBase;
}

function addWardFromDiscover(button){
  var rec = JSON.parse(button.dataset.ward);
  var detail = styleRecommendationDetails('wardrobe',rec);
  openWardrobeModal();
  document.getElementById('ward-name').value = detail.name;
  document.getElementById('ward-brand').value = detail.brand;
  document.getElementById('ward-cat').value = detail.category;
  document.getElementById('ward-season').value = detail.season;
  document.getElementById('ward-pairing').value = detail.pairing;
  setStyleChoice('ward-occasion',detail.occasion || 'Everyday');
  setStyleTags('ward',detail.tags);
}

/* ── Catalogue autocomplete ── */
function clearCatalogueResults(prefix){
  var drop = document.getElementById(prefix + '-cs-drop');
  drop.replaceChildren();
  drop.classList.remove('open');
}

function renderCatalogueResults(prefix, value, rows, select){
  clearCatalogueResults(prefix);
  var query = styleRecommendations.catalogueText(value);
  if(query.length < 2) return;
  var drop = document.getElementById(prefix + '-cs-drop');
  var candidates = rows.filter(function(row){
    return row.slice(0,3).some(function(field){return styleRecommendations.catalogueText(field).includes(query);});
  }).sort(function(a,b){
    return Number(styleRecommendations.catalogueText(b[0]).startsWith(query)) - Number(styleRecommendations.catalogueText(a[0]).startsWith(query));
  });
  candidates.slice(0,8).forEach(function(row){
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'cs-item';
    button.style.width = '100%';
    button.style.textAlign = 'left';
    button.style.color = 'inherit';
    button.style.border = 'none';
    button.style.font = 'inherit';
    button.innerHTML = '<div class="cs-info"><div class="cs-title-txt">' + escHtml(row[0]) +
      '</div><div class="cs-meta-txt">' + escHtml([row[1],row[2]].filter(Boolean).join(' · ')) + '</div></div>';
    button.addEventListener('click', function(){select(row); clearCatalogueResults(prefix);});
    drop.appendChild(button);
  });
  drop.classList.toggle('open', candidates.length > 0);
}

function onFragNameInput(value){
  renderCatalogueResults('frag', value, FRAG_DB, function(row){
    var fields = ['frag-name','frag-house','frag-top','frag-mid','frag-base','frag-char','frag-proj','frag-season'];
    fields.forEach(function(id, index){document.getElementById(id).value = row[index];});
  });
}

function onWardNameInput(value){
  renderCatalogueResults('ward', value, WARD_STYLE_DB, function(row){
    document.getElementById('ward-name').value = row[0];
    document.getElementById('ward-cat').value = row[1];
    document.getElementById('ward-brand').value = row[2];
    document.getElementById('ward-season').value = row[5];
    document.getElementById('ward-pairing').value = row[6];
  });
}

document.addEventListener('click', function(e){
  ['frag','ward'].forEach(function(prefix){
    var drop = document.getElementById(prefix + '-cs-drop');
    if(!drop.contains(e.target) && e.target.id !== prefix + '-name') clearCatalogueResults(prefix);
  });
});
