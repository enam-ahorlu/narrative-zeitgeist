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
    + '<button class="btn btn-g btn-sm" onclick="startDiscoveryComparison(false)">Compare with the original recommender</button></div>';
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
  var run = {pending:true};
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

function revealDiscoveryComparison(button){
  if(!_discCompare?.lists) return;
  var checks = ['would try', 'already known', 'clear reason'];
  var preference = document.querySelector('input[name="disc-preferred-set"]:checked')?.value;
  var preferred = preference === 'tie' ? 'No overall preference' : (preference === '0' || preference === '1')
    ? 'Your preference: ' + _discCompare.lists[Number(preference)].method : 'No overall preference recorded';
  document.getElementById('disc-compare-summary').innerHTML = _discCompare.lists.map(function(list, index){
    var panel = document.querySelector('[data-compare-list="' + index + '"]');
    var heading = 'Set ' + ['A','B'][index] + ' · ' + list.method;
    panel.querySelector('h3').textContent = heading;
    var summary = checks.map(function(label, metric){
      return panel.querySelectorAll('[data-compare-metric="' + metric + '"]:checked').length + '/' + list.picks.length + ' ' + label;
    }).join(' · ');
    var novel = Array.from(panel.querySelectorAll('.disc-compare-item')).filter(function(item){
      return item.querySelector('[data-compare-metric="0"]').checked &&
        !item.querySelector('[data-compare-metric="1"]').checked;
    }).length;
    return '<p>' + heading + ' · ' + summary + ' · ' + novel + ' new to you and would try</p>';
  }).join('') + '<p>'+escHtml(preferred)+'. Results reflect this batch.</p>';
  document.querySelectorAll('[data-compare-metric],input[name="disc-preferred-set"]').forEach(function(input){input.disabled = true;});
  button.textContent = 'Compare again';
  button.onclick = function(){_discCompare = null; showComparisonChoices();};
}
