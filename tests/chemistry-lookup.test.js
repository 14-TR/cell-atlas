import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const online=await import('../src/chemistry/lookup.js').catch(()=>null);
const response=(value,status=200)=>({ok:status>=200&&status<300,status,json:async()=>value});
test('PubChem formula lookup verifies returned formulas and never infers a unique structure',async()=>{
  assert.ok(online,'optional lookup exists');
  const ethanol=JSON.parse(fs.readFileSync(new URL('./fixtures/chemistry-sources/ethanol.json',import.meta.url))).PropertyTable.Properties[0];
  const ether=JSON.parse(fs.readFileSync(new URL('./fixtures/chemistry-sources/dimethyl-ether.json',import.meta.url))).PropertyTable.Properties[0];
  let calls=0;
  const result=await online.lookupFormula('C2H6O',{fetcher:async()=>++calls===1?response({IdentifierList:{CID:[702,8254,962]}}):response({PropertyTable:{Properties:[ethanol,ether,{CID:962,MolecularFormula:'H2O',IUPACName:'water'}]}})});
  assert.equal(result.status,'found');assert.deepEqual(result.candidates.map(c=>c.cid),[702,8254]);assert.equal(result.uniqueStructure,false);assert.equal(calls,2);
});
test('unavailable, no-result, malformed, timeout and cancellation never replace offline facts',async()=>{
  assert.ok(online);
  for(const fetcher of [async()=>{throw new TypeError('Failed to fetch');},async()=>response({},503),async()=>response({IdentifierList:{CID:['not-an-id']}})])assert.equal((await online.lookupFormula('H2O',{fetcher})).status,'unavailable');
  assert.equal((await online.lookupFormula('OgH2',{fetcher:async()=>response({},404)})).status,'not-found');
  const start=performance.now();const timeout=await online.lookupFormula('H2O',{timeout:30,fetcher:async()=>new Promise(()=>{})});assert.equal(timeout.status,'unavailable');assert.ok(performance.now()-start<1000);
  const controller=new AbortController();controller.abort();assert.equal((await online.lookupFormula('H2O',{signal:controller.signal})).status,'cancelled');
});
