import test from 'node:test';
import assert from 'node:assert/strict';
import {compounds} from '../src/chemistry/catalog.js';
import {reactions} from '../src/chemistry/reactions.js';
const scene=await import('../src/chemistry/scene-model.js').catch(()=>null);
test('water geometry and salt lattice have different grounded representations',()=>{
  assert.ok(scene,'scene model exists');
  const water=scene.compoundScene({H:2,O:1},compounds.find(c=>c.cid===962));
  assert.equal(water.kind,'molecule');assert.equal(water.atoms.length,3);assert.equal(water.bonds.length,2);
  const [o,a,b]=water.atoms.map(a=>a.position),u=a.map((v,i)=>v-o[i]),v=b.map((v,i)=>v-o[i]);
  const dot=u.reduce((s,x,i)=>s+x*v[i],0),norm=x=>Math.hypot(...x);
  assert.ok(Math.abs(Math.acos(dot/(norm(u)*norm(v)))*180/Math.PI-104.5)<.001);
  const salt=scene.compoundScene({Na:1,Cl:1},compounds.find(c=>c.cid===5234));
  assert.equal(salt.kind,'lattice');assert.equal(salt.bonds.length,0);
  assert.equal(salt.atoms.filter(a=>a.symbol==='Na').length,32);assert.equal(salt.atoms.filter(a=>a.symbol==='Cl').length,32);
  assert.equal(salt.atoms.filter(a=>a.charge===1).length,32);
  const center=salt.atoms.find(a=>a.grid.join(',')==='1,1,1');
  const neighbors=salt.atoms.filter(a=>a.grid.reduce((s,n,i)=>s+Math.abs(n-center.grid[i]),0)===1);
  assert.equal(neighbors.length,6);assert.ok(neighbors.every(a=>a.symbol!==center.symbol));
});
test('unavailable structure and isomer ambiguity never get invented bonds; large compositions are labeled',()=>{
  assert.ok(scene);
  for(const record of [null,compounds.find(c=>c.cid===702)]) {
    const model=scene.compoundScene({C:2,H:6,O:1},record);assert.equal(model.kind,'composition');assert.equal(model.bonds.length,0);assert.equal(model.atoms.length,9);
  }
  const large=scene.compoundScene({H:99,C:99});assert.equal(large.total,198);assert.equal(large.atoms.length,72);assert.match(large.caption,/72 of 198/);
});
test('every reaction rearrangement preserves each atom identity and element, without asserted molecular bonds',()=>{
  assert.ok(scene);
  for(const r of reactions) {
    const model=scene.reactionScene(r);assert.equal(model.kind,'reaction');assert.equal(model.bonds.length,0);
    const counts={};for(const a of model.atoms){assert.equal(a.symbol,a.targetSymbol);counts[a.symbol]=(counts[a.symbol]||0)+1;assert.equal(a.position.length,3);assert.equal(a.target.length,3);}
    assert.deepEqual(counts,model.inventory,r.id);
  }
  const water=scene.reactionScene(reactions.find(r=>r.id==='water'));assert.deepEqual(water.inventory,{H:4,O:2});
});
