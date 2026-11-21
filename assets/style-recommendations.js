/* Catalogue matching and profile summaries shared by Discover and Insights. */
const styleRecommendations = (() => {
  function catalogueText(value) {
    return String(value || '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’']/g,'').trim();
  }

  function productKey(name, maker) {
    return catalogueText(name) + '|' + catalogueText(maker);
  }

  function matchesQuery(query, fields) {
    const search = catalogueText(query).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const haystack = catalogueText(fields.join(' ')).replace(/[^\p{L}\p{N}]+/gu,' ');
    return search.split(' ').every(term => haystack.includes(
      term === 'footwear' ? 'shoes' : term === 'jewellery' ? 'jewelry' : term
    ));
  }

  function matchesSaved(kind, item, candidate) {
    return catalogueText(item.name) === catalogueText(candidate.name) &&
      (kind !== 'fragrance' || !item.house || catalogueText(item.house) === catalogueText(candidate.house));
  }

  const lower = value => (value || '').toLowerCase();
  const delimit = (value, delimiter) => lower(value).split(delimiter).map(part => part.trim()).filter(Boolean);
  const words = value => delimit(value, /[,\s]+/).filter(word => word.length > 2);
  const notes = (top, mid, base) => delimit([top,mid,base].join(','), ',').filter(note => note.length > 2);
  const weights = () => Object.create(null);

  function addWeights(bucket, values, weight = 1) {
    for (const value of values) if (value) bucket[value] = (bucket[value] || 0) + weight;
  }

  function summarize(bucket) {
    let max = 0;
    let top;
    for (const [name, weight] of Object.entries(bucket)) {
      if (weight > max) {
        max = weight;
        top = name;
      }
    }
    return { max:max || 1, top };
  }

  function statusCounts(items) {
    const counts = { owned:0, wishlisted:0, tried:0 };
    for (const item of items) {
      const status = lower(item.status || 'owned');
      if (Object.hasOwn(counts,status)) counts[status]++;
    }
    return counts;
  }

  function scentProfile(items, byIdentity, byName) {
    const profile = {
      count:items.length, saved:new Set(), seasons:weights(), projections:weights(),
      characters:weights(), houses:weights(), notes:weights(), statuses:statusCounts(items)
    };
    for (const item of items) {
      const key = productKey(item.name,item.house);
      profile.saved.add(key);
      const rating = Number.parseFloat(item.rating);
      const weight = rating > 0 ? rating / 10 : lower(item.status) === 'wishlisted' ? 0.25 : 0.5;
      addWeights(profile.seasons,delimit(item.season,'/'),weight);
      addWeights(profile.projections,[lower(item.projection)],weight);
      addWeights(profile.houses,[lower(item.house).trim()],weight);
      addWeights(profile.characters,words(item.character),weight);
      addWeights(profile.notes,notes(item.notesTop,item.notesMid,item.notesBase),weight);

      const catalogueMatch = item.house ? byIdentity.get(key) : byName.get(catalogueText(item.name));
      if (catalogueMatch && ![item.notesTop,item.notesMid,item.notesBase].some(Boolean)) {
        addWeights(profile.notes,catalogueMatch.notes,weight * 0.4);
        addWeights(profile.characters,catalogueMatch.words,weight * 0.4);
      }
    }
    return profile;
  }

  function wardrobeProfile(items) {
    const profile = {
      count:items.length, saved:new Set(), categories:weights(), occasions:weights(),
      seasons:weights(), tags:weights(), statuses:statusCounts(items)
    };
    for (const item of items) {
      profile.saved.add(catalogueText(item.name));
      addWeights(profile.categories,[lower(item.category)]);
      addWeights(profile.occasions,delimit(item.occasion,','));
      addWeights(profile.seasons,[lower(item.season)]);
      addWeights(profile.tags,(item.tags || []).map(lower));
    }
    return profile;
  }

  function overlap(values, bucket) {
    const hits = values.filter(value => bucket[value]);
    return {hits, total:hits.reduce((sum,value)=>sum+bucket[value],0)};
  }

  function maxMatch(values, bucket) {
    return values.reduce((max,value)=>Math.max(max,bucket[value] || 0),0);
  }

  function normalized(score) {
    return Math.min(97,Math.max(55,Math.round(55 + score / 100 * 42)));
  }

  function rankScents(catalogue, profile) {
    const character = summarize(profile.characters);
    const notes = summarize(profile.notes);
    const season = summarize(profile.seasons);
    const projection = summarize(profile.projections);
    const house = summarize(profile.houses);

    const picks = [];
    for (const scent of catalogue) {
      if (profile.saved.has(scent.key) || profile.saved.has(scent.nameKey + '|')) continue;
      const reasons = [];
      const characterMatch = overlap(scent.words,profile.characters);
      const noteMatch = overlap(scent.notes,profile.notes);
      let score = scent.words.length ? Math.min(characterMatch.total / (character.max * scent.words.length) * 35,35) : 0;
      if (characterMatch.hits.length) reasons.push('Character aligns: ' + characterMatch.hits.slice(0,2).join(', '));
      if (scent.notes.length) score += Math.min(noteMatch.total / (notes.max * scent.notes.length) * 30,30);
      if (noteMatch.hits.length) reasons.push('Shares notes in your collection: ' + noteMatch.hits.slice(0,3).join(', '));

      const seasonalMatch = Math.max(maxMatch(scent.seasons,profile.seasons),scent.seasonLabel.includes('year-round') ? season.max * 0.5 : 0);
      score += Math.min(seasonalMatch / season.max * 15,15);
      if (season.top && scent.seasonLabel.includes(season.top.split('/')[0])) reasons.push('Matches a season in your collection');
      score += Math.min((profile.projections[scent.projectionKey] || 0) / projection.max * 10,10);
      if (profile.houses[scent.houseKey]) {
        score += Math.min(profile.houses[scent.houseKey] / house.max * 10,10);
        reasons.push('You saved a fragrance by ' + scent.item.house);
      }
      picks.push({ ...scent.item, score:normalized(score), reasons:reasons.length ? reasons : ['Explore this scent from the catalogue'] });
    }
    return picks.sort((a,b) => profile.count ? b.score - a.score : Number(b.hasPhoto) - Number(a.hasPhoto));
  }

  function rankWardrobe(catalogue, profile) {
    const tags = summarize(profile.tags);
    const occasion = summarize(profile.occasions);
    const season = summarize(profile.seasons);
    const tagNames = Object.keys(profile.tags);
    const occasionNames = Object.keys(profile.occasions);
    const seasonNames = Object.keys(profile.seasons);

    const picks = [];
    for (const garment of catalogue) {
      if (profile.saved.has(garment.key)) continue;
      const reasons = [];
      const tagMatch = overlap(tagNames.filter(tag=>garment.style.includes(tag)),profile.tags);
      let score = tagMatch.total ? Math.min(tagMatch.total / tags.max * 40,40) : 8;
      if (tagMatch.hits.length) reasons.push('Fits your style: ' + tagMatch.hits.slice(0,2).join(', '));
      const occasionMatch = maxMatch(occasionNames.filter(name=>garment.occasions.includes(name)),profile.occasions);
      score += Math.min(occasionMatch / occasion.max * 25,25);
      if (occasion.top && garment.occasions.includes(occasion.top)) reasons.push('Matches your ' + occasion.top + ' wardrobe');
      const categoryRatio = (profile.categories[garment.category] || 0) / (profile.count || 1);
      score += categoryRatio < 0.1 ? 20 : categoryRatio < 0.2 ? 12 : categoryRatio < 0.3 ? 6 : 2;
      if (categoryRatio < 0.1 && profile.count > 3) reasons.push('Fills a wardrobe gap: ' + garment.item.category);
      const seasonalMatch = maxMatch(seasonNames.filter(name=>garment.season.includes(name.split('/')[0])),profile.seasons);
      const seasonBonus = garment.season.includes('year-round') ? season.max * 0.7 : 0;
      score += Math.min(Math.max(seasonalMatch,seasonBonus) / season.max * 15,15);
      picks.push({ ...garment.item, score:normalized(score), reasons:reasons.length ? reasons : [profile.count ?
        'Complements your existing wardrobe style' : 'Explore this piece from the catalogue'] });
    }
    return picks.sort((a,b)=>profile.count ? b.score-a.score || Number(b.hasPhoto)-Number(a.hasPhoto) : Number(b.hasPhoto)-Number(a.hasPhoto) || b.score-a.score);
  }

  function create(fragranceRows, wardrobeRows, photos = {}, wardrobePhotos = {}) {
    const fragrances = fragranceRows.map(([name,house,top,mid,base,character,projection,season]) => {
      const key = productKey(name,house);
      return {
        key, nameKey:catalogueText(name), notes:notes(top,mid,base), words:words(character),
        seasons:delimit(season,'/'), seasonLabel:lower(season), projectionKey:lower(projection), houseKey:lower(house),
        item:{name,house,top,mid,base,character,projection,season,hasPhoto:Object.hasOwn(photos,key)}
      };
    });
    const wardrobe = wardrobeRows.map(([name,category,brand,style,occasions,season,description]) => ({
      key:catalogueText(name), style:lower(style), occasions:lower(occasions), season:lower(season), category:lower(category),
      item:{name,category,brand,style,occasions,season,description,hasPhoto:Object.hasOwn(wardrobePhotos,productKey(name,brand))}
    }));
    const byIdentity = new Map();
    const byName = new Map();
    for (const scent of fragrances) {
      if (!byIdentity.has(scent.key)) byIdentity.set(scent.key,scent);
      if (!byName.has(scent.nameKey)) byName.set(scent.nameKey,scent);
    }
    const scentSnapshots = new WeakMap();
    const wardrobeSnapshots = new WeakMap();

    function snapshot(cache, items, buildProfile, rank) {
      if (!cache.has(items)) {
        const profile = buildProfile(items);
        let picks;
        cache.set(items,{
          profile,
          get picks() { return picks ??= rank(profile); }
        });
      }
      return cache.get(items);
    }

    return {
      scent(items) {
        return snapshot(scentSnapshots,items,items=>scentProfile(items,byIdentity,byName),profile=>rankScents(fragrances,profile));
      },
      wardrobe(items) {
        return snapshot(wardrobeSnapshots,items,wardrobeProfile,profile=>rankWardrobe(wardrobe,profile));
      }
    };
  }

  function page(picks, offset, size) {
    if (!picks.length) return [];
    const start = offset % picks.length;
    const count = Math.min(size,picks.length);
    return picks.slice(start,start+count).concat(picks.slice(0,Math.max(0,start+count-picks.length)));
  }

  return { create, catalogueText, productKey, matchesQuery, matchesSaved, page };
})();

if (typeof module !== 'undefined') module.exports = styleRecommendations;
