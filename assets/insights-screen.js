/* Taste Fingerprint, chart rendering, and export. */

function renderPatterns(fp){
  var grid = document.getElementById('patterns-grid');
  if(!grid) return;
  var themes  = (fp && fp.primary_themes)  || [];
  var formats = (fp && fp.format_breakdown) || {};
  var total   = (fp && fp.total_entries) || _allEntries.length || 0;
  var avgRat  = fp ? parseFloat(fp.overall_avg_rating || 0) : 0;

  if(!themes.length){
    grid.innerHTML = '<div style="padding:20px 0;color:var(--t-3);font-size:13px;line-height:1.6">Add entries and tag them to reveal patterns in your taste — your top themes, format preferences, and listening/reading habits will appear here.</div>';
    return;
  }

  var svgChart = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--p-light)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M6 20v-5M12 20v-9M18 20V6"/></svg>';
  var svgScale = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--p-light)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M8 21h8"/><path d="M4 8l4 9H4m0 0a4 4 0 008 0M12 8L8 17M12 8l4 9h4m0 0a4 4 0 01-8 0M12 8l4 9"/><line x1="4" y1="8" x2="20" y2="8"/></svg>';
  var svgBook  = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--p-light)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>';
  var svgLink  = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--p-light)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/></svg>';

  function makeCard(icon, title, text, stat, tag){
    var clickAttr = tag ? ' onclick="filterByTag(\''+escJs(tag)+'\')" title="See entries tagged '+escHtml(tag)+'"' : '';
    return '<div class="pat"'+clickAttr+'>'
      +'<div class="pat-emoji">'+icon+'</div>'
      +'<div class="pat-title">'+title+'</div>'
      +'<div class="pat-text">'+text+'</div>'
      +'<div class="pat-stat">'+stat+'</div>'
      +(tag?'<div class="pat-cta">\u2192 See all '+tag+' entries</div>':'')
      +'</div>';
  }

  var cards = [];
  var t0 = themes[0];

  /* Card 1: Top theme */
  if(t0){
    var freq = t0.frequency || 0;
    var avg0 = parseFloat(t0.avg_rating||0).toFixed(1);
    cards.push(makeCard(svgChart,
      'Your strongest signal: ' + escHtml(t0.tag),
      '"'+escHtml(t0.tag)+'" is your most prominent theme — it appears in '+freq+' entries with an average rating of '+avg0+'. This is the clearest lens through which you engage with content.',
      freq + ' entries \u00b7 ' + avg0 + ' avg rating',
      t0.tag
    ));
  }

  /* Card 2: Best-rated format */
  var fmtEntries = Object.keys(formats).filter(function(k){ return (formats[k].count||0) > 0; });
  if(fmtEntries.length >= 2){
    var best = fmtEntries.reduce(function(a,b){ return (parseFloat(formats[b].avg_rating||0) > parseFloat(formats[a].avg_rating||0)) ? b : a; });
    var fmtLabel = {show:'Shows',book:'Books',film:'Films',sports_match:'Matches',music:'Music'}[best] || best;
    var bestAvg = parseFloat(formats[best].avg_rating||0).toFixed(1);
    var bestCnt = formats[best].count;
    cards.push(makeCard(svgScale,
      fmtLabel + ' hit hardest for you',
      'Of all the formats you log, '+fmtLabel.toLowerCase()+' earn your highest average rating at '+bestAvg+'/10 across '+bestCnt+' entries. Your standards are clear — and '+fmtLabel.toLowerCase()+' consistently clear them.',
      bestAvg + ' avg across ' + bestCnt + ' ' + fmtLabel.toLowerCase(),
      null
    ));
  }

  /* Card 3: Theme depth — top 2 combined coverage */
  if(themes.length >= 2){
    var t1 = themes[1];
    var combined = (t0.frequency||0) + (t1.frequency||0);
    var pct = total > 0 ? Math.round((combined/total)*100) : 0;
    cards.push(makeCard(svgBook,
      'Consistent taste, not scattered',
      '"'+escHtml(t0.tag)+'" and "'+escHtml(t1.tag)+'" together cover '+pct+'% of your collection. Your taste is coherent — not scattered across genres, but anchored around a few strong aesthetic preferences.',
      combined + ' of ' + total + ' entries share your top 2 themes',
      t1.tag
    ));
  }

  /* Card 4: Rating floor / overall signal quality */
  if(avgRat > 0){
    var qualifier = avgRat >= 8.5 ? 'exceptionally high' : avgRat >= 7.5 ? 'above average' : 'broad-ranging';
    var insight = avgRat >= 8.0
      ? 'You set a high bar. Content that makes your collection has genuinely earned its place — this keeps your taste signal clean and your recommendations sharper.'
      : 'You log across a wide range of quality, capturing highlights and disappointments. This gives a more complete picture of your actual taste landscape.';
    cards.push(makeCard(svgLink,
      'Your collection floor is ' + qualifier,
      insight,
      avgRat.toFixed(1) + ' overall avg \u00b7 ' + total + ' entries',
      null
    ));
  }

  grid.innerHTML = cards.join('');
}

function exportInsights(){
  if(!_fp && !_allEntries.length){ showToast('No data to export yet'); return; }
  var lines = [
    'Narrative & Zeitgeist — Taste Insights',
    'Exported: ' + new Date().toLocaleDateString(),
    ''
  ];
  var total = (_fp && _fp.total_entries) || _allEntries.length || 0;
  var avg   = (_fp && _fp.overall_avg_rating) ? parseFloat(_fp.overall_avg_rating).toFixed(1) : '—';
  lines.push('OVERVIEW');
  lines.push('Total Entries: ' + total);
  lines.push('Average Rating: ' + avg);
  if(_fp && _fp.primary_themes && _fp.primary_themes.length){
    lines.push('');
    lines.push('TOP THEMES');
    _fp.primary_themes.slice(0,12).forEach(function(t, i){
      lines.push((i+1) + '. ' + t.tag
        + ' — ' + (t.frequency||0) + ' entries'
        + ', ' + parseFloat(t.avg_rating||0).toFixed(1) + ' avg rating');
    });
  }
  if(_fp && _fp.format_breakdown){
    var fmtNames = {show:'Shows', film:'Films', book:'Books', sports_match:'Matches', music:'Music'};
    lines.push('');
    lines.push('FORMAT BREAKDOWN');
    Object.keys(_fp.format_breakdown).forEach(function(k){
      var d = _fp.format_breakdown[k];
      if(!d || !d.count) return;
      lines.push((fmtNames[k]||k) + ': ' + d.count + ' entries, ' + parseFloat(d.avg_rating||0).toFixed(1) + ' avg rating');
    });
  }
  var text = lines.join('\n');
  var blob = new Blob([text], {type: 'text/plain'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url;
  a.download = 'narrative-zeitgeist-insights.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  showToast('Insights exported', '↓  ');
}

function topStyleTraits(weights){
  return Object.entries(weights).sort(function(a,b){return b[1]-a[1] || a[0].localeCompare(b[0]);})
    .slice(0,4).map(function(pair){return pair[0];}).join(', ');
}

async function renderStyleFingerprint(){
  var panel = document.getElementById('insights-style');
  var store = currentStyleStore();
  if(!store){panel.hidden = true;panel.replaceChildren();return;}
  var stillCurrent = function(){return isCurrentStyleStore(store);};
  var loaded = await journalData.run('insights-style',function(){return store.load();},stillCurrent,{
    loading:'Loading scent and wardrobe insights…',error:'Could not load scent and wardrobe insights.'
  });
  if(!loaded || !stillCurrent()) return;
  var scentProfile = _styleModel.scent(_loadFrags()).profile;
  var styleProfile = _styleModel.wardrobe(_loadWard()).profile;
  var scentCounts = scentProfile.statuses;
  var wardrobeCounts = styleProfile.statuses;
  function trait(label, weights){
    var names = topStyleTraits(weights);
    return names ? '<div><strong>'+label+'</strong> '+escHtml(names)+'</div>' : '';
  }
  panel.innerHTML = '<div class="ct">Scent &amp; Wardrobe Fingerprint</div><div class="style-fingerprint-grid">'
    + '<div><h3>Fragrances</h3><p>'+scentCounts.owned+' owned · '+scentCounts.wishlisted+' wishlisted · '+scentCounts.tried+' tried</p>'
    + trait('Recurring notes',scentProfile.notes) + trait('Common houses',scentProfile.houses) + '</div>'
    + '<div><h3>Wardrobe</h3><p>'+wardrobeCounts.owned+' owned · '+wardrobeCounts.wishlisted+' wishlisted</p>'
    + trait('Common categories',styleProfile.categories) + trait('Recurring styles',styleProfile.tags) + '</div></div>';
  panel.hidden = false;
}

function renderInsights(fp){
  renderStyleFingerprint();
  var sub     = document.getElementById('insights-ph-sub');
  var building= document.getElementById('fp-building');
  var fpList  = document.getElementById('fp-list');

  var total   = (fp && fp.total_entries) ? fp.total_entries : _allEntries.length;
  /* Update fp building progress bar */
  var progLabel = document.getElementById('fp-progress-label');
  var progFill  = document.querySelector('.fp-progress-fill');
  if(progLabel) progLabel.textContent = Math.min(total,10) + ' of 10 entries logged';
  if(progFill)  progFill.style.width = Math.min(100, Math.round((total/10)*100)) + '%';

  if(!fp || !(fp.primary_themes && fp.primary_themes.length)){
    if(building) building.classList.add('show');
    if(fpList)   fpList.style.display = 'none';
    /* Derive basic stats from raw _allEntries even without a computed fingerprint */
    var derivedAvg = '—';
    var derivedThemes = 0;
    var derivedTop = '—';
    if(_allEntries && _allEntries.length){
      var rated = _allEntries.filter(function(e){ return e.rating != null && !isNaN(parseFloat(e.rating)); });
      if(rated.length){
        var sum = rated.reduce(function(s,e){ return s + parseFloat(e.rating); }, 0);
        derivedAvg = (sum / rated.length).toFixed(1);
      }
      /* Count unique tags across entries */
      var tagSet = {};
      _allEntries.forEach(function(e){
        (e.tags||[]).forEach(function(t){ var n=(t.name||t||'').toLowerCase(); if(n) tagSet[n]=true; });
      });
      derivedThemes = Object.keys(tagSet).length;
      /* Top theme by frequency */
      var tagFreq = {};
      _allEntries.forEach(function(e){
        (e.tags||[]).forEach(function(t){ var n=(t.name||t||'').toLowerCase(); if(n) tagFreq[n]=(tagFreq[n]||0)+1; });
      });
      var topKeys = Object.keys(tagFreq).sort(function(a,b){ return tagFreq[b]-tagFreq[a]; });
      if(topKeys.length) derivedTop = topKeys[0];
    }
    var sc0=document.getElementById('sc-total'); if(sc0) sc0.textContent = total||'—';
    var sc1=document.getElementById('sc-avg');   if(sc1) sc1.textContent = derivedAvg;
    var sc2=document.getElementById('sc-themes');if(sc2) sc2.textContent = derivedThemes||'—';
    var sc3=document.getElementById('sc-top');   if(sc3){ sc3.textContent = derivedTop; sc3.style.fontSize='13px'; }
    if(sub) sub.textContent = 'Your taste fingerprint · ' + total + ' entr'+(total===1?'y':'ies')+' logged';
    renderPatterns(null);
    return;
  }
  if(building) building.classList.remove('show');
  if(fpList)   fpList.style.display = '';

  var avgRat  = fp.overall_avg_rating ? parseFloat(fp.overall_avg_rating).toFixed(1) : '—';
  var themes  = fp.primary_themes || [];
  var topTag  = themes[0] ? themes[0].tag : '—';

  /* sc-themes: always count unique tags from raw entries for consistency with the no-fp path */
  var _utSet = {};
  (_allEntries||[]).forEach(function(e){
    (e.tags||[]).forEach(function(t){ var n=(t.name||t||'').toLowerCase(); if(n) _utSet[n]=true; });
  });
  var uniqueThemeCount = Object.keys(_utSet).length || themes.length;

  var sc0=document.getElementById('sc-total'); if(sc0) sc0.textContent = total;
  var sc1=document.getElementById('sc-avg');   if(sc1) sc1.textContent = avgRat;
  var sc2=document.getElementById('sc-themes');if(sc2) sc2.textContent = uniqueThemeCount||'—';
  var sc3=document.getElementById('sc-top');   if(sc3){ sc3.textContent = topTag; sc3.style.fontSize='14px'; }
  if(sub) sub.textContent = 'Your taste fingerprint · Based on ' + total + ' entries';
  renderPatterns(fp);

  if(fpList){
    var maxW = themes[0] ? (themes[0].weight || 1) : 1;
    fpList.innerHTML = themes.slice(0,8).map(function(t){
      var pct   = Math.round(((t.weight||0) / maxW) * 100);
      var tag   = escHtml(t.tag);
      var label = tag.charAt(0).toUpperCase() + tag.slice(1);
      return '<div class=\"fp-item\" onclick=\"filterByTag(\'' + tag + '\')\" title=\"Filter by ' + tag + '\">'
        + '<div class=\"fp-row\"><span class=\"fp-label\">' + label + '</span>'
        + '<span class=\"fp-score\">' + parseFloat(t.avg_rating||0).toFixed(1) + ' avg \u00b7 ' + (t.frequency||0) + ' entries</span></div>'
        + '<div class=\"fp-bg\"><div class=\"fp-fill\" style=\"--w:' + pct + '%;width:' + pct + '%\"></div></div>'
        + '<div class=\"fp-item-hint\">\u2192 Filter Collection</div></div>';
    }).join('');
  }
  _applyFpToCharts(fp);
}

function _applyFpToCharts(fp){
  if(!fp) return;
  var formats = fp.format_breakdown || {};
  var themes  = fp.primary_themes  || [];
  if(_charts.fmt){
    var d = function(k){ return (formats[k] && formats[k].count) || 0; };
    _charts.fmt.data.datasets[0].data = [d('film'),d('show'),d('book'),d('sports_match'),d('music')];
    _charts.fmt.update();
  }
  if(_charts.gen && themes.length){
    var top6 = themes.slice(0,6).slice().reverse();
    _charts.gen.data.labels = top6.map(function(t){ return t.tag.charAt(0).toUpperCase()+t.tag.slice(1); });
    _charts.gen.data.datasets[0].data = top6.map(function(t){ return parseFloat(t.avg_rating||0); });
    _charts.gen.update();
  }
  if(_charts.radar && themes.length >= 3){
    /* Use the user's actual top-6 tags as axes — hardcoded dimensions never matched real data */
    var top6 = themes.slice(0,6);
    var maxW  = top6[0] ? (top6[0].weight||1) : 1;
    _charts.radar.data.labels = top6.map(function(t){
      var tag = t.tag || '';
      return tag.charAt(0).toUpperCase() + tag.slice(1);
    });
    _charts.radar.data.datasets[0].data = top6.map(function(t){
      return Math.round(((t.weight||0) / maxW) * 100);
    });
    _charts.radar.update();
  }
}

function loadTimelineData(){
  if(!currentUser || !_charts.timeline) return;
  var qmap = {};
  _allEntries.forEach(function(e){
    var r = parseFloat(e.rating);
    if(isNaN(r)) return;   /* skip unrated entries */
    if(!e.date_completed) return; /* skip entries without a real completion date —
                                     falling back to created_at would place retroactively
                                     logged content in today's quarter, distorting the trend */
    var d = new Date(e.date_completed);
    var q = d.getUTCFullYear() + ' Q' + (Math.floor(d.getUTCMonth()/3)+1);
    if(!qmap[q]) qmap[q] = [];
    qmap[q].push(r);
  });
  var labels = Object.keys(qmap).sort();
  /* Show/hide empty state */
  var emptyEl = document.getElementById('timeline-empty');
  var canvas  = document.getElementById('timelineChart');
  if(!labels.length){
    if(emptyEl) emptyEl.style.display = '';
    if(canvas)  canvas.style.display  = 'none';
    return;
  }
  if(emptyEl) emptyEl.style.display = 'none';
  if(canvas)  canvas.style.display  = '';
  var data   = labels.map(function(q){
    var arr = qmap[q];
    return arr.length ? parseFloat((arr.reduce(function(s,v){return s+v;},0)/arr.length).toFixed(2)) : null;
  });
  _charts.timeline.data.labels = labels;
  _charts.timeline.data.datasets[0].data = data;
  _charts.timeline.update();
}

/* ── Chart initialisation ── */
var chartsReady = false;
function initCharts(){
  if(typeof Chart === 'undefined') return;
  if(chartsReady) return;
  chartsReady = true;

  var radarCtx = document.getElementById('radarChart');
  if(radarCtx && !_charts.radar){
    _charts.radar = new Chart(radarCtx, {
      type:'radar',
      /* Labels seeded blank — replaced with user's actual top-6 tags by _applyFpToCharts */
      data:{ labels:['—','—','—','—','—','—'],
             datasets:[{label:'Your Taste',data:[0,0,0,0,0,0],
               backgroundColor:'rgba(74,173,186,0.15)',borderColor:'#4AADBA',
               pointBackgroundColor:'#4AADBA',pointRadius:3,borderWidth:2}] },
      options:{ responsive:true,maintainAspectRatio:true,
        scales:{ r:{ ticks:{display:false}, grid:{color:'rgba(0,0,0,0.08)'},
          pointLabels:{font:{size:11,family:'Inter'},color:'#7A96A4'},
          suggestedMin:0,suggestedMax:100 }},
        plugins:{legend:{display:false}} }
    });
  }
  var fmtCtx = document.getElementById('fmtChart');
  if(fmtCtx && !_charts.fmt){
    _charts.fmt = new Chart(fmtCtx, {
      type:'doughnut',
      data:{ labels:['Films','Shows','Books','Matches','Music'],
             datasets:[{data:[0,0,0,0,0],
               backgroundColor:['#C06060','#2E7D9E','#5A8A5F','#9B7D3A','#7A6BAE'],
               borderWidth:0,hoverOffset:6}] },
      options:{ responsive:true,maintainAspectRatio:true,cutout:'65%',
        plugins:{legend:{position:'bottom',labels:{font:{size:11,family:'Inter'},padding:12,boxWidth:10}}} }
    });
  }
  var genCtx = document.getElementById('genChart');
  if(genCtx && !_charts.gen){
    _charts.gen = new Chart(genCtx, {
      type:'bar',
      data:{ labels:[],datasets:[{label:'Avg Rating',data:[],
               backgroundColor:'rgba(74,173,186,0.7)',borderRadius:4,borderSkipped:false}] },
      options:{ responsive:true,maintainAspectRatio:true,indexAxis:'y',
        scales:{ x:{min:0,max:10,grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:10}}},
                 y:{grid:{display:false},ticks:{font:{size:11,family:'Inter'}}} },
        plugins:{legend:{display:false}} }
    });
  }
  var timeCtx = document.getElementById('timelineChart');
  if(timeCtx && !_charts.timeline){
    _charts.timeline = new Chart(timeCtx, {
      type:'line',
      data:{ labels:[],datasets:[{label:'Avg Rating',data:[],
               borderColor:'#4AADBA',backgroundColor:'rgba(74,173,186,0.08)',
               fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#4AADBA'}] },
      options:{ responsive:true,maintainAspectRatio:true,
        scales:{ y:{min:0,max:10,grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:11}}},
                 x:{grid:{display:false},ticks:{font:{size:11}}} },
        plugins:{legend:{display:false}} }
    });
  }
  /* _applyFpToCharts and loadTimelineData are called by the navigate handler, not here,
     to ensure they run exactly once per Insights visit. */
}
