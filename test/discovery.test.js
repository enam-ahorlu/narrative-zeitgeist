const assert = require('node:assert/strict');
const { test } = require('node:test');
const { selectAnchors } = require('../lib/grounded-discovery');
const discover = require('../api/discover');

const userId = '00000000-0000-4000-8000-000000000001';
const seedId = '00000000-0000-4000-8000-000000000002';

test('favorites are selected per format and a requested seed may have any rating', () => {
  const library = Array.from({ length: 600 }, (_, index) => ({
    id: 'music-' + index, title: 'Album ' + index, format: 'music', rating: 8
  }));
  library.push({ id: seedId, title: 'Book favorite', format: 'book', rating: 10 });
  const anchors = selectAnchors(library);
  assert.equal(anchors.filter(a => a.format === 'music').length, 3);
  assert.equal(anchors.filter(a => a.format === 'book').length, 1);
  assert.deepEqual(selectAnchors(library, 'music-1').map(a => a.title), ['Album 1']);
  assert.deepEqual(selectAnchors(library, null, 'book').map(a => a.title), ['Book favorite']);
  assert.deepEqual(selectAnchors([{ id: seedId, title: 'Low rated seed', format: 'book', rating: 3 }], seedId).map(a=>a.title), ['Low rated seed']);
});

test('authenticated Discovery excludes all history pages and requires verified, correctly sourced suggestions', async t => {
  Object.assign(process.env, {
    SUPABASE_URL:'https://fixture.example.test',
    SUPABASE_ANON_KEY:'sb_publishable_fixture',
    ANTHROPIC_API_KEY:'synthetic'
  });
  const history = [
    { id:seedId, title:'Original Favorite',format:'book',rating:9,tags:['epistolary'],date_completed:'2025-05-01' },
    ...Array.from({ length:499 }, (_, i) => ({
      id:String(i),title:'Previous music ' + i,format:'music',rating:5
    })),
    { id:'older', title:'Old Read',format:'book',rating:3,notes:'Private text should stay on server' }
  ];
  let prompt;
  const queried = [];
  let quotaCalls = 0;
  const item = (title, anchor = 'A1') => ({
    title, format:'book', creator:'Test Author', anchor, connection:'Comparable use of letters.'
  });
  t.mock.method(globalThis,'fetch',async (address, options) => {
    const url = new URL(address);
    if (url.pathname === '/auth/v1/user') return Response.json({id:userId});
    if (url.pathname === '/rest/v1/rpc/reserve_discovery_request') { quotaCalls++; return Response.json(0); }
    if (url.pathname.startsWith('/rest/v1/')) {
      assert.equal(url.searchParams.get('user_id'), 'eq.' + userId);
      const offset = Number(url.searchParams.get('offset'));
      if (url.pathname.endsWith('/entries_with_tags')) return Response.json(history.slice(offset, offset + 500));
      if (url.pathname.endsWith('/watchlist')) return Response.json(offset ? [] : [{title:'Already Saved',format:'book'}]);
      return Response.json(offset ? [] : [{title:'Déjà Vu',format:'book'}]);
    }
    if (url.hostname === 'api.anthropic.com') {
      prompt = JSON.parse(options.body).messages[0].content;
      return Response.json({content:[{type:'text',text:JSON.stringify([
        item('Old Read'), item('Already Saved'), item('Deja Vu'), item('Nonexistent'),
        item('Catalogue Match','Made-up anchor'), item('Catalogue Match'),
        {...item('Wrong Author'),creator:'Wrong person'}
      ])}]});
    }
    if (url.hostname === 'openlibrary.org') {
      const query = url.searchParams.get('q');
      queried.push(query);
      const match = query.startsWith('Catalogue Match') || query.startsWith('Wrong Author');
      return Response.json({docs:match ? [{
        key:'/works/synthetic', title:query.startsWith('Wrong Author')?'Wrong Author':'Catalogue Match',
        author_name:['Test Author'], first_publish_year:2022
      }] : []});
    }
    throw new Error('Unexpected upstream call');
  });
  async function invoke(id) {
    const output = {};
    await discover({method:'POST', headers:{authorization:'Bearer synthetic'}, body:{
      strategy:'grounded', tab:'because-loved',seedId:id
    }}, {setHeader(){},status(code){output.status=code;return this;},json(value){output.body=value;}});
    return output;
  }
  assert.equal((await invoke(userId)).status,404);
  assert.equal(quotaCalls,0);
  const result = await invoke(seedId);
  assert.equal(result.status,200);
  assert.deepEqual(result.body.recommendations.map(rec=>rec.title),['Catalogue Match']);
  assert.equal(result.body.recommendations[0].anchor.title,'Original Favorite');
  assert.deepEqual(result.body.recommendations[0].catalog,{provider:'openlibrary',id:'/works/synthetic'});
  assert.equal(result.body.recommendations[0].match_score,undefined);
  assert.match(prompt,/Original Favorite/);
  assert.match(prompt,/2025-05-01/);
  assert.doesNotMatch(prompt,/Old Read|Private text/);
  assert.ok(queried.every(q=>!q.startsWith('Old Read') && !q.startsWith('Deja Vu') && !q.startsWith('Already Saved')));
});
