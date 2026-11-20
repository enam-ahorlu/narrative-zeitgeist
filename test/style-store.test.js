const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createStyleStore, readLegacyStyle } = require('../assets/style-store');

function fixture({rows = [], read, mutate} = {}) {
  const calls = [];
  const client = {from(table) {
    assert.equal(table,'style_items');
    const filters = {};
    let deleting = false;
    return {
      select(){return this;},
      eq(key,value){filters[key]=value;return this;},
      order(){return this;},
      range(start,end){
        calls.push({type:'read',owner:filters.user_id,start});
        return read ? read() : Promise.resolve({data:rows.filter(row=>row.user_id===filters.user_id).slice(start,end+1)});
      },
      upsert(value,options){
        calls.push({type:'upsert',value,options});
        if (options.ignoreDuplicates) return {select() { return mutate(value, options); }};
        return mutate ? mutate(value,options) : Promise.resolve({});
      },
      delete(){deleting = true;return this;},
      then(resolve){
        assert.ok(deleting);
        calls.push({type:'delete',filters:{...filters}});
        return resolve({});
      }
    };
  }};
  return {client,calls};
}

test('style store shares reads and abandons stale results on sign-out', async () => {
  let release;
  const {client,calls} = fixture({read:()=>new Promise(resolve=>{release=resolve;})});
  const first = createStyleStore(client,'first');
  const loading = first.load();
  assert.equal(first.load(),loading);
  first.dispose();
  release({data:[{kind:'fragrance',item_id:'private-id',details:{name:'Private'}}]});
  assert.equal(await loading,false);
  assert.equal(first.items('fragrance').length,0);
  assert.deepEqual(calls,[{type:'read',owner:'first',start:0}]);
});

test('successful saves normalize legacy fields and failed and late writes leave the snapshot alone', async () => {
  let resolveWrite;
  const {client,calls} = fixture({mutate:()=>new Promise(resolve=>{resolveWrite=resolve;})});
  const store = createStyleStore(client,'owner',()=>100);
  await store.load();
  let write = store.change('fragrance',{id:'sample',name:'Test',status:'Owned',tags:['warm',1]},false);
  await Promise.resolve();
  assert.equal(await store.change('fragrance',{id:'other',name:'Other'},false),false);
  resolveWrite({});
  assert.equal(await write,true);
  assert.equal(store.items('fragrance')[0].status,'owned');
  assert.deepEqual(store.items('fragrance')[0].tags,['warm']);
  assert.equal(calls[1].value.user_id,'owner');

  write = store.change('fragrance',{id:'sample',name:'Unconfirmed'},false);
  await Promise.resolve();
  resolveWrite({error:new Error('fixture failure')});
  await assert.rejects(write,/fixture failure/);
  assert.equal(store.items('fragrance')[0].name,'Test');
  assert.equal(await store.change('fragrance',{id:'sample'},true),true);
  assert.deepEqual(calls.at(-1).filters,{user_id:'owner',kind:'fragrance',item_id:'sample'});

  write = store.change('fragrance',{id:'late',name:'Late'},false);
  await Promise.resolve();
  store.dispose();
  resolveWrite({});
  assert.equal(await write,false);
  assert.equal(store.items('fragrance').length,0);
});

test('legacy imports preserve a duplicate already saved by another tab', async () => {
  const rows = [];
  const {client,calls} = fixture({rows,mutate:()=>Promise.resolve({data:[]})});
  const store = createStyleStore(client,'owner');
  await store.load();
  rows.push({user_id:'owner',kind:'wardrobe',item_id:'existing',details:{name:'Edited on server',status:'wishlisted'}});
  assert.ok(await store.importItems('wardrobe',[{id:'existing',name:'Old browser copy'}]));
  assert.equal(store.items('wardrobe')[0].name,'Edited on server');
  assert.equal(store.items('wardrobe')[0].status,'Wishlisted');
  assert.equal(calls.find(call=>call.type==='upsert').options.ignoreDuplicates,true);
  await assert.rejects(store.importItems('wardrobe',[{id:'invalid id',name:'Invalid'}]),/Invalid style item ID/);
});

test('legacy browser import reads the source data and comparison value together', () => {
  const raw = '[{"id":"saved","name":"Bottle"}]';
  const storage = {getItem:()=>raw};
  const source = readLegacyStyle(storage,'fragrance');
  assert.equal(source.raw,raw);
  assert.equal(source.key,'nz_fragrances');
  assert.deepEqual(source.items,[{id:'saved',name:'Bottle'}]);
  assert.deepEqual(readLegacyStyle({getItem:()=>'bad json'},'fragrance').items,[]);
});
