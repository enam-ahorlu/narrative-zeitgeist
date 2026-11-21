/* Starter tag catalogue and format-aware lookup rules. */
const journalTags = (() => {
  const sportsTags = [
      'final','semifinal','quarterfinal','derby','rivalry','upset',
      'comeback','dominant performance','title decider','group stage',
      'knockout stage','playoff','championship','league match','cup tie',
      'el clasico','local derby','international','friendly',
      'individual sport','team sport','combat sport','endurance',
      'record-breaking','hat trick','shutout','overtime','penalty shootout',
      'tactics','pressing','possession','counter-attack','set piece',
      'relegation battle','title race','historic','iconic',
      'football','soccer','basketball','tennis','cricket',
      'rugby','american football','baseball','golf','formula 1',
      'athletics','swimming','cycling','boxing','mma','wrestling',
      'olympic','world cup','champions league','grand slam'
  ];

  const musicGenreTags = [
      'hip-hop','rap','trap','drill','boom bap','conscious rap',
      'r&b','neo soul','soul','funk','gospel','blues',
      'pop','indie pop','synth-pop','electropop','k-pop','j-pop',
      'rock','indie rock','alternative','grunge','punk','post-punk',
      'metal','heavy metal','death metal','black metal','doom metal',
      'jazz','bebop','free jazz','fusion jazz','smooth jazz','big band',
      'classical','orchestral','chamber music','opera','choral',
      'electronic','house','techno','ambient','drone','edm',
      'drum & bass','jungle','garage','grime','dubstep',
      'folk','singer-songwriter','country','americana','bluegrass',
      'reggae','dancehall','afrobeats','afropop','highlife','amapiano',
      'latin','salsa','bossa nova','cumbia','reggaeton',
      'world music','experimental','noise','lo-fi','vaporwave'
  ];

  const entryTagPresets = [
      /* ── Narrative Themes & Storytelling ── */
      'antihero','moral complexity','character-driven','world-building',
      'ensemble cast','slow burn','twist ending','political drama','psychological',
      'redemption','identity','power & corruption','survival','love & loss',
      'family','betrayal','justice','grief','trauma','isolation',
      'coming-of-age','satire','dark comedy','based on true events',
      'unreliable narrator','nonlinear narrative','dual timeline','epistolary',
      'mythology','folklore','magical realism','dystopia','utopia',
      'revenge','obsession','forbidden love','second chances','found family',
      'class struggle','race & identity','gender & sexuality','religion & faith',
      'war & conflict','colonialism','immigration','addiction',
      'memory & nostalgia','time','death & dying','rebirth','legacy',

      /* ── Vibes & Atmosphere ── */
      'atmospheric','cinematic','lyrical','immersive','meditative',
      'dark & gritty','cozy','melancholic','euphoric','tense',
      'haunting','hopeful','bleak','whimsical','surreal',
      'minimalist','maximalist','dreamlike','unsettling','warm',
      'cold & clinical','chaotic','quiet','intense','playful',

      /* ── Emotional Responses ── */
      'made me cry','made me think','felt seen','disturbing',
      'laugh-out-loud','cathartic','inspiring','infuriating','heartwarming',
      'devastating','uplifting','comforting','challenging','nostalgic',
      'exhilarating','anxious','hopeful','bitter','bittersweet',

      /* ── Film Genres ── */
      'action','adventure','thriller','horror','psychological horror',
      'slasher','crime','film noir','heist','spy','neo-noir',
      'drama','romance','rom-com','comedy','animation','documentary',
      'biopic','historical','period piece','war film','western',
      'sci-fi','fantasy','superhero','martial arts','body horror',
      'found footage','mockumentary','arthouse','experimental',

      /* ── TV Show Genres ── */
      'prestige drama','limited series','procedural','legal drama',
      'medical drama','police procedural','true crime','docuseries',
      'reality tv','talk show','sitcom','animated series',
      'soap opera','mini-series','anthology','telenovela',

      /* ── Book Genres ── */
      'literary fiction','contemporary fiction','historical fiction',
      'short stories','novella','poetry','essay collection',
      'memoir','autobiography','biography','narrative nonfiction',
      'self-help','philosophy','psychology','sociology','economics',
      'science','nature writing','travel writing','food writing',
      'graphic novel','manga','young adult','middle grade','children',
      'hard sci-fi','space opera','cli-fi','weird fiction',
      'gothic','horror fiction','cozy mystery','police procedural fiction',
      'legal thriller','medical thriller','techno-thriller',
      'romance fiction','paranormal romance','epic fantasy',
      'urban fantasy','high fantasy','low fantasy','grimdark',

      /* ── Quality & Craft ── */
      'masterpiece','underrated','overrated','cult classic','hidden gem',
      'awards bait','crowd pleaser','slow starter','strong finish',
      'great performances','weak ending','uneven','consistent',
      'visually stunning','great soundtrack','poor pacing','tight writing',
      'quotable','re-watchable','re-readable','long but worth it',

      /* Regional traditions, formats and more specific themes */
      'diaspora','postcolonial','oral history','coming home','environmental justice',
      'intergenerational','workplace drama','quiet horror','speculative fiction',
      'african cinema','nollywood','ghallywood','korean cinema','slow cinema',
      'afrofuturism','solarpunk','translated fiction','microhistory','reportage',
      'afro-jazz','hiplife','azonto','gqom','fuji','soukous','morna','mbalax',
      'trip-hop','post-rock','dream pop','minimal techno','field recording',
      'women’s football','afcon','paralympics','esports','rugby sevens','photo finish'
    ];

  const tagFormatAliases = {
    film:'film', films:'film', movie:'film', movies:'film', cinema:'film',
    show:'show', shows:'show', tv:'show', television:'show', series:'show',
    book:'book', books:'book', reading:'book', literature:'book',
    music:'music', album:'music', albums:'music', song:'music', songs:'music',
    sport:'sports_match', sports:'sports_match', match:'sports_match', matches:'sports_match'
  };

  const tagScopes = {
    'film show book':'mystery|cliffhanger|espionage|whodunit|locked-room mystery|political thriller|investigation|moral complexity|slow burn|thriller|crime|drama|horror|sci-fi|fantasy|romance|adventure|world-building|character-driven|antihero|twist ending|unreliable narrator|nonlinear narrative|dual timeline|magical realism|dystopia|utopia|found family|revenge|obsession|forbidden love|ensemble cast|political drama|comedy|historical|period piece|western|psychological horror|legal drama|medical drama|police procedural|true crime|anthology|rom-com|superhero|body horror|satire|dark comedy|based on true events|strong finish|slow starter|weak ending|tight writing|poor pacing|speculative fiction|quiet horror|afrofuturism|solarpunk',
    'film show':'action|heist|spy|animation|documentary|biopic|mockumentary|visually stunning|great soundtrack|great performances|re-watchable|found footage|martial arts|slasher|neo-noir|documentary series|cult classic',
    'film':'film noir|war film|arthouse|african cinema|nollywood|ghallywood|korean cinema|slow cinema',
    'show':'prestige drama|limited series|procedural|docuseries|reality tv|talk show|sitcom|animated series|soap opera|mini-series|telenovela|bottle episode|season finale|serialized',
    'book':'literary fiction|contemporary fiction|historical fiction|short stories|novella|poetry|essay collection|memoir|autobiography|biography|narrative nonfiction|self-help|philosophy|psychology|sociology|economics|science|nature writing|travel writing|food writing|graphic novel|manga|young adult|middle grade|children|hard sci-fi|space opera|cli-fi|weird fiction|gothic|horror fiction|cozy mystery|police procedural fiction|legal thriller|medical thriller|techno-thriller|romance fiction|paranormal romance|epic fantasy|urban fantasy|high fantasy|low fantasy|grimdark|epistolary|re-readable|translated fiction|microhistory|reportage|unreliable narration',
    'film show music':'experimental|cinematic',
    'film show sports_match':'comeback|rivalry|record-breaking|underdog',
    'music':'live album|concept album|instrumental|acoustic|sampling|storytelling rap|alté|afro-jazz|hiplife|azonto|gqom|fuji|soukous|morna|mbalax|trip-hop|post-rock|dream pop|minimal techno|field recording',
    'sports_match':'women’s football|afcon|paralympics|esports|rugby sevens|photo finish|extra time|clean sheet|counter-pressing'
  };
  function normalize(value){
    return value.trim().toLowerCase().replace(/\bcliff[ -]+hanger\b/g,'cliffhanger').replace(/\bhip[ -]+hop\b/g,'hip-hop');
  }
  const entryTagScope = new Map();
  Object.keys(tagScopes).forEach(function(scope){
    tagScopes[scope].split('|').forEach(function(tag){entryTagScope.set(tag, scope.split(' '));});
  });

  musicGenreTags.forEach(function(tag){
    if(!entryTagScope.has(tag) && !['iconic','historic'].includes(tag)) entryTagScope.set(tag,['music']);
  });
  sportsTags.forEach(function(tag){
    if(!entryTagScope.has(tag) && !['iconic','historic'].includes(tag)) entryTagScope.set(tag,['sports_match']);
  });

  const presets = Object.freeze(entryTagPresets.concat(musicGenreTags, sportsTags, Array.from(entryTagScope.keys())));
  function search(value) {
    const query = normalize(value);
    const parts = query.split(/\s+/);
    const format = Object.hasOwn(tagFormatAliases, parts[0]) ? tagFormatAliases[parts.shift()] : null;
    const terms = format ? parts.join(' ') : query;
    return {
      format,
      matches(tag) {
        const key = normalize(tag);
        const scope = entryTagScope.get(key);
        return key.includes(terms) && (!format || !scope || scope.includes(format));
      }
    };
  }
  /* Genre or trope classification for taste summaries. A genre says what kind of thing it is (per format);
     a trope is a theme, device or mood. Anything else returns null. */
  const genreSets = {
    film:new Set(['action','adventure','thriller','horror','psychological horror','slasher','crime','film noir','heist','spy','neo-noir','drama','romance','rom-com','comedy','animation','documentary','biopic','historical','period piece','war film','western','sci-fi','fantasy','superhero','martial arts','body horror','found footage','mockumentary','arthouse','experimental','mystery','political thriller','african cinema','nollywood','ghallywood','korean cinema','slow cinema']),
    show:new Set(['prestige drama','limited series','procedural','legal drama','medical drama','police procedural','true crime','docuseries','reality tv','talk show','sitcom','animated series','soap opera','mini-series','anthology','telenovela','drama','comedy','crime','thriller','horror','sci-fi','fantasy','romance','animation','documentary','mystery','spy','workplace drama']),
    book:new Set(['literary fiction','contemporary fiction','historical fiction','short stories','novella','poetry','essay collection','memoir','autobiography','biography','narrative nonfiction','self-help','philosophy','psychology','sociology','economics','science','nature writing','travel writing','food writing','graphic novel','manga','young adult','middle grade','children','hard sci-fi','space opera','cli-fi','weird fiction','gothic','horror fiction','cozy mystery','police procedural fiction','legal thriller','medical thriller','techno-thriller','romance fiction','paranormal romance','epic fantasy','urban fantasy','high fantasy','low fantasy','grimdark','sci-fi','fantasy','mystery','thriller','crime','horror','romance','translated fiction','speculative fiction','afrofuturism','solarpunk']),
    music:new Set(musicGenreTags),
    sports_match:new Set(sportsTags)
  };
  const tropeSet = new Set(entryTagPresets.slice(0, entryTagPresets.indexOf('atmospheric')).concat(['diaspora','postcolonial','oral history','coming home','environmental justice','intergenerational','quiet horror','afrofuturism','solarpunk','microhistory','reportage',
    'atmospheric','cinematic','lyrical','immersive','meditative','dark & gritty','cozy','melancholic','euphoric','tense','haunting','hopeful','bleak','whimsical','surreal','dreamlike','unsettling','warm','cold & clinical','chaotic','quiet','intense','playful',
    'mystery','cliffhanger','espionage','whodunit','locked-room mystery','investigation','bottle episode','season finale','serialized','underdog']));
  function groupOf(tag, format) {
    const key = normalize(String(tag));
    if (genreSets[format] && genreSets[format].has(key)) return 'genre';
    if (tropeSet.has(key)) return 'trope';
    return null;
  }
  return { normalize, presets, search, groupOf };
})();

if (typeof module !== 'undefined') module.exports = journalTags;
