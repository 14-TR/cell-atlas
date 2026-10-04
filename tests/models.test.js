import test from 'node:test';
import assert from 'node:assert/strict';

const registry = () => import('../src/models.js').catch(() => ({}));

test('model registry keeps mammalian defaults and scopes plant and budding yeast biology', async () => {
  const { cellModels, getCellModel } = await registry();
  assert.ok(cellModels, 'a cell-model registry exists');
  assert.deepEqual(Object.keys(cellModels).slice(0, 3), ['mammalian', 'plant', 'fungal']);
  const { model, structures } = await import('../src/data.js');
  assert.equal(getCellModel().cellType, model.cellType);
  assert.equal(getCellModel().structures, structures, 'original mammalian field notes remain intact');
  assert.throws(() => getCellModel('unknown'), /Unknown cell model/);
  for (const [id, entry] of Object.entries(cellModels)) {
    assert.equal(entry.id, id);
    assert.equal(entry.measuredReconstruction, false);
    assert.equal(entry.exactScale, false);
    assert.match(entry.disclaimer, /false colors.*illustrative.*exaggerated/i);
    assert.equal(new Set(entry.structures.map(s => s.id)).size, entry.structures.length);
    assert.ok(entry.structures.some(s => s.id === entry.defaultSelection));
    for (const s of entry.structures) {
      assert.ok(s.description.length > 80, `${id}/${s.id} has field notes`);
      assert.ok(s.sources.length && s.sources.every(url => url.startsWith('https://')), `${id}/${s.id} has sources`);
    }
    for (const label of entry.labels) assert.ok(entry.structures.some(s => s.id === label.id));
  }
  const plant = getCellModel('plant'), fungal = getCellModel('fungal');
  const part = (m, id) => m.structures.find(s => s.id === id);
  assert.match(plant.cellType, /photosynthetic plant/);
  assert.match(plant.disclaimer, /not all plant cells.*chloroplast/i);
  assert.equal(part(plant, 'chloroplasts').membranes, 2);
  assert.match(part(plant, 'chloroplasts').description, /thylakoid.*grana.*stroma/i);
  assert.match(part(plant, 'cell-wall').description, /cellulose.*hemicellulose.*pectin/i);
  assert.match(part(plant, 'vacuole').description, /tonoplast.*turgor/i);
  assert.match(fungal.cellType, /Saccharomyces cerevisiae/);
  assert.match(fungal.disclaimer, /not.*all fungi/i);
  assert.match(part(fungal, 'cell-wall').description, /glucan.*mannoprotein.*chitin/i);
  assert.match(part(fungal, 'golgi').description, /unstacked.*cisternae/i);
  assert.match(part(fungal, 'vacuole').description, /lysosome/i);
  assert.match(part(fungal, 'bud-neck').description, /chitin.*scar/i);
  assert.equal(part(fungal, 'chloroplasts'), undefined);
  for (const m of [plant, fungal]) {
    assert.equal(part(m, 'lysosomes'), undefined, 'lytic vacuole replaces animal-style lysosomes');
    assert.equal(part(m, 'vacuole').membranes, 1);
    assert.doesNotMatch(part(m, 'cytoskeleton').description, /intermediate filaments/);
    assert.doesNotMatch(part(m, 'peroxisomes').description, /mammalian/);
    assert.match(part(m, 'endosomes').description, /vacuole/);
  }
});
