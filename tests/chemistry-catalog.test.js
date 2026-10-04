import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {parseFormula,compositionKey} from '../src/chemistry/formula.js';
const data = await import('../src/chemistry/catalog.js').catch(()=>null);
test('offline catalog consists of individually retrieved neutral PubChem records, not invented breadth', () => {
  assert.ok(data,'catalog exists');assert.ok(data.compounds.length >= 80);
  assert.equal(new Set(data.compounds.map(c=>c.id)).size,data.compounds.length);
  assert.equal(new Set(data.compounds.map(c=>c.cid)).size,data.compounds.length);
  for (const c of data.compounds) {
    const bytes=fs.readFileSync(new URL('./fixtures/chemistry-sources/'+c.fixture,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),c.fixtureSHA256);
    const p=JSON.parse(bytes).PropertyTable.Properties.find(r=>r.CID===c.cid);
    assert.equal(compositionKey(p.MolecularFormula),compositionKey(c.formula));
    assert.equal(parseFormula(c.formula).charge,0);
    assert.match(c.sourceUrl,new RegExp('/compound/'+c.cid+'$'));
  }
  for(const category of ['salt','oxide','acid','base','organic']) assert.ok(data.compounds.some(c=>c.category===category));
});
test('exact matching never ratio-reduces or invents a unique formula isomer', () => {
  assert.ok(data);assert.equal(data.matchComposition({H:2,O:1}).candidates[0].cid,962);
  assert.equal(data.matchComposition({Na:1,Cl:1}).candidates[0].cid,5234);
  assert.equal(data.matchComposition({H:4,O:2}).status,'unsupported');
  assert.equal(data.matchComposition({Og:1,H:2}).status,'unsupported');
  assert.equal(data.matchComposition({}).status,'empty');
  const alcohol=data.matchComposition({C:2,H:6,O:1});
  assert.equal(alcohol.status,'ambiguous');assert.deepEqual(alcohol.candidates.map(c=>c.cid).sort((a,b)=>a-b),[702,8254]);
});
test('NaCl is an ionic lattice, water is a grounded bent molecule, other structures are not invented', () => {
  assert.ok(data);
  assert.equal(data.compounds.find(c=>c.cid===5234).view,'nacl-lattice');
  assert.equal(data.compounds.find(c=>c.cid===962).view,'water');
  assert.equal(data.compounds.find(c=>c.cid===702).view,'composition');
});
