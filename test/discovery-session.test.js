const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createDiscoverySession } = require('../assets/discovery-session');

const film = {title:'Arrival',format:'film'};
const book = {title:'The Dispossessed',format:'book'};
const view = {tab:'for-you',focus:null,seedId:null};

test('Discovery reuses the request and keeps separate view caches until expiry', async () => {
  let currentTime = 100;
  const session = createDiscoverySession({now:()=>currentTime,ttl:20});
  let release;
  const started = session.load('all',view,()=>new Promise(resolve=>{release=resolve;}));
  const switchedBack = session.load('all',view,()=>assert.fail('made a duplicate request'));
  assert.equal(started,switchedBack);
  await session.load('films',{...view,focus:'film'},()=>[film]);
  release([film,book]);
  assert.deepEqual(await switchedBack,[film,book]);
  assert.deepEqual(session.read('films'),[film]);
  assert.deepEqual(session.read('all'),[film,book]);
  currentTime += 20;
  assert.equal(session.read('all'),null);
});

test('refresh remembers shown picks, and saves and dismissals remove picks across all views', async () => {
  const session = createDiscoverySession();
  await session.load('all',view,()=>[film,book]);
  session.shown([film,book],null);
  await session.load('films',{...view,focus:'film'},()=>[film]);
  session.remove({...film,title:' ARRIVAL '});
  assert.deepEqual(session.read('all'),[book]);
  assert.deepEqual(session.read('films'),[]);
  await session.load('all',{...view,force:true},input=>{
    assert.equal(input.round,1);
    assert.deepEqual(input.recent,[{...film,seed:null},{...book,seed:null}]);
    return [film];
  });
  assert.deepEqual(session.read('all'),[]);
});

test('invalidated requests cannot repopulate the cache or replace a newer result', async () => {
  const session = createDiscoverySession();
  let release;
  const outdated = session.load('all',view,()=>new Promise(resolve=>{release=resolve;}));
  session.invalidate();
  await session.load('all',view,()=>[book]);
  release([film]);
  await outdated;
  assert.deepEqual(session.read('all'),[book]);
});
