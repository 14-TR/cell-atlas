import test from 'node:test';
import assert from 'node:assert/strict';

test('a sourced generalized mammalian interphase atlas declares its limits', async () => {
  const { structures, model } = await import('../src/data.js').catch(() => ({ structures: [], model: {} }));
  assert.equal(model.cellType, 'generalized mammalian interphase cell');
  assert.equal(model.measuredReconstruction, false);
  assert.equal(model.exactScale, false);
  assert.match(model.disclaimer, /false colors/i);
  assert.match(model.disclaimer, /illustrative/i);
  assert.match(model.disclaimer, /exaggerated/i);
  assert.equal(structures.length, 12);
  assert.equal(new Set(structures.map(x => x.id)).size, 12);
  for (const item of structures) {
    assert.ok(item.description.length > 80, item.id);
    assert.ok(item.sources.every(url => url.startsWith('https://www.ncbi.nlm.nih.gov/books/')));
    assert.ok(item.sources.length);
  }
});
