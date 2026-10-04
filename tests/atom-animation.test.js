import test from 'node:test';
import assert from 'node:assert/strict';
import {createAtom} from '../src/atom.js';
import {elements} from '../src/elements.js';

const matrices = (atom, name) => Array.from(atom.root.getObjectByName(name).instanceMatrix.array);
const centers = values => Array.from({length:values.length / 16}, (_, i) => values.slice(i * 16 + 12, i * 16 + 15));

test('teaching animation moves electron markers on guides, with bounded clustered nucleon motion and an unchanged root', () => {
  const atom = createAtom(elements[5]); // Carbon-12: two inner + four outer electrons.
  assert.equal(typeof atom.update, 'function', 'atom accepts an explicit illustration time');
  const before = Object.fromEntries(['electrons','protons','neutrons'].map(name => [name,matrices(atom,name)]));
  atom.update(1);
  for (const name of Object.keys(before)) assert.notDeepEqual(matrices(atom,name), before[name], name);
  centers(matrices(atom,'electrons')).forEach((p,i) => assert.ok(Math.abs(Math.hypot(...p) - (i < 2 ? 2 : 2.7)) < 1e-5));
  for (const name of ['protons','neutrons']) {
    const previous = centers(before[name]);
    centers(matrices(atom,name)).forEach((p,i) => {
      assert.ok(Math.hypot(...p) < .65, 'nucleons remain in the carbon nucleus, not on electron shells');
      assert.ok(Math.hypot(...p.map((v,j) => v - previous[i][j])) < .09, 'motion is gentle');
    });
  }
  assert.deepEqual(atom.root.position.toArray(), [0,0,0]);
  assert.deepEqual(atom.root.rotation.toArray().slice(0,3), [0,0,0]);
  const frozen = matrices(atom,'electrons');atom.update(1);
  assert.deepEqual(matrices(atom,'electrons'), frozen, 'same time is an exact hold, not an incremental integrator');
  atom.update(0);assert.deepEqual(matrices(atom,'electrons'), before.electrons);
  atom.dispose();
});

test('all 118 teaching atoms keep the cloud secondary, with independent particle and nucleus display controls', () => {
  for (const element of elements) {
    const atom = createAtom(element), cloud = atom.root.getObjectByName('probability-cloud');
    assert.ok(cloud?.isPoints, 'optional qualitative cloud is a real point volume');
    assert.equal(cloud.visible, false, 'teaching particles are the default, not a cloud-first scene');
    const electrons = atom.root.getObjectByName('electrons');
    assert.equal(electrons.visible, true);
    assert.ok(cloud.geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(cloud.geometry.attributes.position.count <= 2000, 'bounded point budget even for Og');
    atom.setDisplay({cloud:true, particles:false, nucleus:true});
    assert.equal(cloud.visible,true);assert.equal(electrons.visible,false);
    for (const name of ['protons','neutrons']) {
      const mesh = atom.root.getObjectByName(name);
      assert.equal(mesh.visible,false);assert.ok(mesh.scale.x > 1);
    }
    const cameraIndependent = matrices(atom, 'electrons');
    atom.setDisplay({cloud:false,particles:true,nucleus:false});
    assert.deepEqual(matrices(atom,'electrons'),cameraIndependent);
    for (const time of [0, .25, 1, 5, 30]) {
      atom.update(time);
      for (const name of ['electrons','protons','neutrons']) {
        assert.ok(matrices(atom,name).every(Number.isFinite));
        const bound = name === 'electrons' ? atom.radius + .01 : 1.35;
        centers(matrices(atom,name)).forEach(p => assert.ok(Math.hypot(...p) <= bound, `${element.symbol} ${name} stay bounded`));
      }
    }
    const frozen = matrices(atom,'electrons'), glow = cloud.material.uniforms.time.value;
    atom.update(30);assert.deepEqual(matrices(atom,'electrons'),frozen);assert.equal(cloud.material.uniforms.time.value,glow);
    atom.update(NaN);atom.update(-1);assert.deepEqual(matrices(atom,'electrons'),frozen);
    let disposed = 0;cloud.geometry.addEventListener('dispose', () => disposed++);cloud.material.addEventListener('dispose', () => disposed++);
    atom.dispose();atom.dispose();atom.update(31);atom.setDisplay({cloud:true});
    assert.equal(disposed,2,'cloud released exactly once');assert.deepEqual(matrices(atom,'electrons'),frozen,'disposed animation is inert');
  }
});
