import test from 'node:test';
import assert from 'node:assert/strict';
const formula = await import('../src/chemistry/formula.js').catch(() => null);
test('formula parser reads a literal water composition without reducing counts', () => {
  assert.ok(formula, 'chemistry formula module exists');
  assert.deepEqual(formula.parseFormula('H2O'), {atoms:{H:2,O:1},charge:0});
  assert.deepEqual(formula.parseFormula('H4O2'), {atoms:{H:4,O:2},charge:0});
});
test('nested groups, hydrate components and explicit charges preserve literal stoichiometry', () => {
  assert.deepEqual(formula.parseFormula('Al2(SO4)3'), {atoms:{Al:2,S:3,O:12},charge:0});
  assert.deepEqual(formula.parseFormula('K4[Fe(CN)6]'), {atoms:{K:4,Fe:1,C:6,N:6},charge:0});
  assert.deepEqual(formula.parseFormula('CuSO4·5H2O'), {atoms:{Cu:1,S:1,O:9,H:10},charge:0});
  assert.deepEqual(formula.parseFormula('SO4^2-'), {atoms:{S:1,O:4},charge:-2});
  assert.deepEqual(formula.parseFormula('H+'), {atoms:{H:1},charge:1});
});
test('invalid or unbounded formula syntax is rejected instead of partially parsed', () => {
  for (const value of ['', 'h2o','Xx2','H0','H01','2H2','H-2','(OH','Ca()2','H2)O','H 2O','H2O garbage','H1.5O','Na+Cl','H999999999','((((((((((((((H))))))))))))))']) {
    assert.throws(() => formula.parseFormula(value), undefined, value);
  }
});
test('composition key is exact, order independent and charge aware; builder counts are bounded', () => {
  assert.equal(formula.compositionKey('OH2'), 'H:2|O:1;q=0');
  assert.notEqual(formula.compositionKey('H2O'), formula.compositionKey('H4O2'));
  assert.notEqual(formula.compositionKey('Na'), formula.compositionKey('Na+'));
  assert.equal(formula.formatFormula({Na:1,Cl:1}), 'ClNa');
  assert.equal(formula.formatFormula({C:2,H:6,O:1}), 'C2H6O');
  assert.deepEqual(formula.setAtomCount({H:2},'H',0), {});
  for (const count of [-1,100,1.2,NaN,Infinity]) assert.throws(() => formula.setAtomCount({},'H',count));
  assert.throws(() => formula.setAtomCount({H:99,C:99},'O',99));
});
