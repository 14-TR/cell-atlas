import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const module=await import('../src/chemistry/reactions.js').catch(()=>null);
const balance=await import('../src/chemistry/balance.js').catch(()=>null);
test('mandatory reactants retain physical species: sodium metal and diatomic chlorine; molecular hydrogen and oxygen',()=>{
  assert.ok(module,'reaction library exists');
  const salt=module.reactions.find(r=>r.id==='salt');
  assert.deepEqual(salt.reactants.map(s=>[s.formula,s.coefficient]),[['Na',2],['Cl2',1]]);
  assert.deepEqual(salt.products.map(s=>[s.formula,s.coefficient]),[['NaCl',2]]);
  assert.deepEqual(module.reactions.find(r=>r.id==='water').reactants.map(s=>[s.formula,s.coefficient]),[['H2',2],['O2',1]]);
  assert.equal(module.findReactions(['Na','Cl']).length,0);
  assert.equal(module.findReactions(['Na','Cl2'])[0].id,'salt');
});
test('all curated reactions have source-bound atom and charge conservation, including a real charged equation',()=>{
  assert.ok(module);assert.ok(balance);assert.ok(module.reactions.length>=24);
  const sources=JSON.parse(fs.readFileSync(new URL('./fixtures/chemistry-sources/reaction-provenance.json',import.meta.url)));
  assert.equal(new Set(module.reactions.map(r=>r.id)).size,module.reactions.length);
  for(const r of module.reactions) {
    const validation=balance.validateReaction(r);assert.equal(validation.balanced,true,r.id);
    const reference=sources.find(s=>s.id===r.id);assert.ok(reference,r.id);
    const bytes=fs.readFileSync(new URL('./fixtures/chemistry-sources/'+reference.fixture,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),reference.sha256);
    const math=[...bytes.toString().matchAll(/<math\b[\s\S]*?<\/math>/g)][reference.mathIndex][0];
    assert.equal(createHash('sha256').update(math).digest('hex'),reference.mathSHA256);
    assert.equal(math.replace(/<[^>]+>/g,'').trim(),reference.sourceText);
    const normalized=text=>text.replace(/\s+/g,'').replace(/[⟶→]/g,'->').replace(/−/g,'-').replace(/Δ/g,'');
    assert.ok(normalized(reference.sourceText).includes(normalized(module.equationText(r))),r.id+' exact equation source');
    // The source carries the factual equation, not merely a generic chemistry homepage.
    assert.ok(reference.sourceText.length>10);assert.match(r.sourceUrl,/openstax.org\/books\/chemistry-2e\/pages\//);
    assert.deepEqual(r.reactants,reference.reactants);assert.deepEqual(r.products,reference.products);
  }
  for(const type of ['combination','acid-base','precipitation','displacement','decomposition','oxidation']) assert.ok(module.reactions.some(r=>r.category===type),type);
  assert.equal(balance.validateReaction({reactants:[{formula:'Na',coefficient:1}],products:[{formula:'Na+',coefficient:1}]}).balanced,false,'atom conservation alone is insufficient');
  assert.equal(balance.validateReaction({reactants:[{formula:'H2',coefficient:1},{formula:'O2',coefficient:1}],products:[{formula:'H2O',coefficient:1}]}).balanced,false);
});
test('limiting reagent and excess use continuous virtual mol amounts with independent literal oracles',()=>{
  assert.ok(balance);assert.ok(module);
  const salt=module.reactions.find(r=>r.id==='salt'),water=module.reactions.find(r=>r.id==='water');
  const a=balance.calculateYield(salt,[5,1]);assert.equal(a.extent,1);assert.deepEqual(a.produced,[2]);assert.deepEqual(a.remaining,[3,0]);assert.deepEqual(a.limiting,[1]);
  const b=balance.calculateYield(water,[3,2]);assert.equal(b.extent,1.5);assert.deepEqual(b.produced,[3]);assert.deepEqual(b.remaining,[0,.5]);assert.deepEqual(b.limiting,[0]);
  assert.deepEqual(balance.calculateYield(water,[2,1]).limiting,[0,1]);
  assert.deepEqual(balance.calculateYield(water,[0,1]).produced,[0]);
  for(const q of [[-1,2],[1.2,Infinity],[101,1],[1],[NaN,1]])assert.throws(()=>balance.calculateYield(water,q));
});
