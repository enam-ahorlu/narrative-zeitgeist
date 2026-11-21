/* Blind recommendation comparisons and their feedback controls. */

function compareDiscovery(){
  if(!currentUser) return;
  openModal('disc-compare');
  if(_discCompare) return;
  showComparisonChoices();
}

function showComparisonChoices(){
  var body = document.getElementById('disc-compare-body');
  body.innerHTML = '<p>Compare anonymous picks before seeing which method made them. Each comparison may use two Discovery requests.</p>'
    + '<div class="style-quick-actions">'
    + '<button class="btn btn-p btn-sm" onclick="startDiscoveryComparison(true)">Test the low-rating signal</button>'
    + '<button class="btn btn-g btn-sm" onclick="startDiscoveryComparison(false)">Compare with the original recommender</button>'
    + '<button class="btn btn-g btn-sm" onclick="showComparisonHistory()">Past comparisons</button></div>';
}

async function startDiscoveryComparison(testSignal){
  if(!currentUser || _discCompare?.pending) return;
  var body = document.getElementById('disc-compare-body');
  openModal('disc-compare');
  if(_discCompare?.lists) return;
  if(!testSignal && _allEntries.length < 3){
    showComparisonChoices();
    var message = document.createElement('p');
    message.textContent = 'Log at least three entries to compare the original and updated recommenders.';
    body.prepend(message);
    return;
  }
  var userId = currentUser.id;
  var run = {id:crypto.randomUUID(),pending:true};
  _discCompare = run;
  body.textContent = 'Building two anonymous sets from your collection…';
  try {
    if(testSignal){
      var pair = await fetchDiscovery(userId,{strategy:'compare-low-ratings'});
      if(currentUser?.id !== userId || _discCompare !== run) return;
      run.lists = [
        {method:'Favorites only',picks:pair.without},
        {method:'Favorites and low ratings',picks:pair.with}
      ];
    } else {
      await refreshFingerprint();
      if(currentUser?.id !== userId || _discCompare !== run) return;
      var titles = _allEntries.map(function(entry){return entry.title;}).concat(_wlItems.map(function(entry){return entry.title;}));
      var outcomes = await Promise.all([
        fetchDiscovery(userId, {strategy:'baseline', tab:'for-you', fingerprint:_fp, entryTitles:titles.slice(0,100)}),
        fetchDiscovery(userId, {strategy:'grounded', tab:'for-you'})
      ]);
      if(currentUser?.id !== userId || _discCompare !== run) return;
      var count = Math.min(5, outcomes[0].length, outcomes[1].length);
      run.lists = [
        {method:'Original', picks:outcomes[0].slice(0,count)},
        {method:'Updated', picks:outcomes[1].slice(0,count)}
      ];
    }
    if(crypto.getRandomValues(new Uint8Array(1))[0] % 2) run.lists.reverse();
    renderDiscoveryComparison(run.lists, body);
  } catch(e) {
    if(_discCompare === run){
      var message = document.createElement('p');
      message.textContent = e.message;
      var back = document.createElement('button');
      back.className = 'btn btn-g btn-sm';
      back.textContent = 'Back to comparison choices';
      back.onclick = function(){_discCompare = null; showComparisonChoices();};
      body.replaceChildren(message,back);
    }
  } finally {
    run.pending = false;
  }
}

function renderDiscoveryComparison(lists, body){
  var checks = ['Would try it', 'Already know it', 'I can see why it fits'];
  body.innerHTML = '<p>Mark any statements that apply to each pick. Reveal the methods when you finish.</p>'
    + '<div class="disc-compare-grid">' + lists.map(function(list, index){
      return '<section data-compare-list="' + index + '"><h3>Set ' + ['A','B'][index] + '</h3>'
        + list.picks.map(function(pick){
          return '<div class="disc-compare-item"><strong>' + escHtml(pick.title) + '</strong>'
            + '<div>' + escHtml(FMT_LABEL[pick.format] || pick.format) + '</div>'
            + '<p>' + escHtml((pick.reasons || [])[0]) + '</p>'
            + checks.map(function(label, check){
              return '<label><input type="checkbox" data-compare-metric="' + check + '"> ' + label + '</label>';
            }).join('') + '</div>';
        }).join('') + '</section>';
    }).join('') + '</div>'
    + '<fieldset id="disc-compare-preference"><legend>Which set would you explore first?</legend>'
    + '<label><input type="radio" name="disc-preferred-set" value="0"> Set A</label> '
    + '<label><input type="radio" name="disc-preferred-set" value="1"> Set B</label> '
    + '<label><input type="radio" name="disc-preferred-set" value="tie"> No preference</label></fieldset>'
    + '<button class="btn btn-p btn-sm" onclick="revealDiscoveryComparison(this)">Reveal results</button>'
    + '<div id="disc-compare-summary" role="status"></div>';
}

async function revealDiscoveryComparison(button){
  var run = _discCompare;
  var owner = currentUser?.id;
  if(!owner || !run?.lists || button.disabled) return;
  button.disabled = true;
  var choice = document.querySelector('input[name="disc-preferred-set"]:checked')?.value;
  var preference = ({'0':'A','1':'B',tie:'tie'})[choice] || null;
  var sets = run.lists.map(function(list,index){
    var items = document.querySelectorAll('[data-compare-list="'+index+'"] .disc-compare-item');
    return {method:list.method, picks:list.picks.map(function(pick,i){
      var checks = items[i].querySelectorAll('input');
      return {title:pick.title, format:pick.format, catalogue:mediaIdentity.metadata(pick),
        wouldTry:checks[0].checked, known:checks[1].checked, fits:checks[2].checked};
    })};
  });
  // Freeze the blind choices across retries, including an ambiguous network response.
  document.querySelectorAll('[data-compare-metric],input[name="disc-preferred-set"]').forEach(function(input){input.disabled = true;});
  var summary = document.getElementById('disc-compare-summary');
  try {
    var result = await SUPA.from('discovery_comparisons').upsert({user_id:owner,id:run.id,preference,sets},
      {onConflict:'user_id,id',ignoreDuplicates:true});
    if(result.error) throw result.error;
  } catch {
    if(currentUser?.id === owner && _discCompare === run){
      summary.textContent = 'Could not confirm the save. Your choices are ready to retry.';
      button.disabled = false;
      button.textContent = 'Retry saving results';
    }
    return;
  }
  if(currentUser?.id !== owner || _discCompare !== run) return;
  summary.replaceChildren();
  sets.forEach(function(set,index){
    var heading = 'Set '+['A','B'][index]+' · '+set.method;
    document.querySelector('[data-compare-list="'+index+'"] h3').textContent = heading;
    var p = document.createElement('p');
    p.textContent = heading+' · '+comparisonCounts(set.picks);
    summary.append(p);
  });
  var message = document.createElement('p');
  message.textContent = (choice === '0' || choice === '1') ? 'Your preference: '+sets[Number(choice)].method : 'No overall preference recorded';
  summary.append(message);
  button.disabled = false;
  button.textContent = 'Compare again';
  button.onclick = function(){_discCompare = null; showComparisonChoices();};
}

function comparisonCounts(picks){
  var count = function(check){return picks.filter(check).length+'/'+picks.length;};
  return count(p=>p.wouldTry)+' would try · '+count(p=>p.known)+' already known · '
    +count(p=>p.fits)+' clear reason · '+count(p=>p.wouldTry && !p.known)+' new to you and would try';
}

function comparisonOutcomes(rows,entries,sameWork = mediaIdentity.sameWork){
  var methods = new Map();
  for(var row of rows){
    row.sets.forEach(function(set,index){
      var totals = methods.get(set.method) || {picks:[],logged:0,preferred:0,batches:0};
      totals.batches++;
      if(row.preference === ['A','B'][index]) totals.preferred++;
      totals.picks.push(...set.picks);
      totals.logged += set.picks.filter(pick=>entries.some(entry=>
        Date.parse(entry.created_at) >= Date.parse(row.created_at) && sameWork(entry,pick))).length;
      methods.set(set.method,totals);
    });
  }
  return methods;
}

async function showComparisonHistory(){
  var owner = currentUser?.id;
  if(!owner) return;
  var body = document.getElementById('disc-compare-body');
  var panel = document.createElement('section');
  var back = document.createElement('button');
  back.textContent = 'Back to comparisons';
  back.className = 'btn btn-g btn-sm';
  back.onclick = showComparisonChoices;
  body.replaceChildren(back,panel);
  panel.textContent = 'Loading past comparisons…';
  try {
    var [results,loaded] = await Promise.all([
      SUPA.from('discovery_comparisons').select('sets,preference,created_at')
        .eq('user_id',owner).order('created_at',{ascending:false}).limit(30),
      loadEntries()
    ]);
    if(currentUser?.id !== owner || !panel.isConnected) return;
    if(results.error || !loaded) throw new Error('History unavailable');
    var rows = results.data;
    panel.textContent = rows.length ? 'Latest '+rows.length+' completed comparisons' : 'No completed comparisons yet.';
    var methods = comparisonOutcomes(rows,_allEntries);
    for(var [method,totals] of methods){
      var line = document.createElement('p');
      line.textContent = method+' · preferred in '+totals.preferred+'/'+totals.batches+' batches · '
        +comparisonCounts(totals.picks)+' · '+totals.logged+'/'+totals.picks.length+' picks logged after comparison';
      panel.append(line);
    }
  } catch {
    if(currentUser?.id === owner && panel.isConnected) panel.textContent = 'Could not load comparison history. Go back and retry.';
  }
}

if (typeof module !== 'undefined') module.exports = {comparisonOutcomes};
