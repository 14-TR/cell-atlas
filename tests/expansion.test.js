import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHash} from 'node:crypto';
import { cellModels } from '../src/models.js';
import { createCell } from '../src/cell.js';

function inspect(modelId) {
  const model=cellModels[modelId];
  assert.ok(model, `${modelId} is selectable`);
  const cell=createCell({modelId,quality:'low'});
  assert.deepEqual([...cell.groups.keys()],model.structures.map(s=>s.id));
  for(const [id,g] of cell.groups) {
    assert.ok(g.children.length && g.userData.focus.distance>0,id);
    g.traverse(o=>{for(const a of [o.geometry?.attributes.position,o.geometry?.attributes.normal,o.instanceMatrix].filter(Boolean))assert.ok(a.array.every(Number.isFinite),id);});
  }
  return cell;
}
for(const modelId of ['bacterium','neuron','red-blood-cell'])for(const quality of ['low','balanced','high'])test(`${modelId}/${quality}: finite deterministic meshes release every owned resource`,()=>{
  const a=createCell({modelId,quality}),b=createCell({modelId,quality});
  const fingerprint=cell=>{const h=createHash('sha256');cell.root.traverse(o=>{for(const attr of [o.geometry?.attributes.position,o.geometry?.attributes.normal,o.geometry?.index,o.instanceMatrix].filter(Boolean)){assert.ok(attr.array.every(Number.isFinite));h.update(Buffer.from(attr.array.buffer));}});return h.digest('hex');};
  assert.equal(fingerprint(a),fingerprint(b));b.dispose();
  const expected=new Set(),released=new Set();
  a.root.traverse(o=>{for(const r of [o.isInstancedMesh?o:null,o.geometry,o.material].filter(Boolean)){expected.add(r);r.addEventListener('dispose',()=>released.add(r));}});
  a.dispose();assert.equal(released.size,expected.size);
});

test('specialized specimens give labels distinct anatomical anchors',()=>{
  for(const id of ['bacterium','neuron','red-blood-cell']){
    const labels=cellModels[id].labels;
    assert.ok(labels.every(l=>l.point?.length===3),`${id}: explicit label anchors`);
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(new THREE.Vector3(...labels[i].point).distanceTo(new THREE.Vector3(...labels[j].point))>2);
  }
});
test('red-cell skeleton lies beneath its biconcave membrane',()=>{
  const c=createCell({modelId:'red-blood-cell',quality:'low'});
  try {let outside=0;
    c.groups.get('cytoskeleton').traverse(o=>{if(!o.geometry)return;const p=o.geometry.attributes.position;
      for(let i=0;i<p.count;i++){const r2=p.getX(i)**2+p.getY(i)**2,maxZ=Math.sqrt(Math.max(0,1-r2/25))*(.55+.1*r2);if(r2>25||Math.abs(p.getZ(i))>maxZ+.002)outside++;}
    });assert.equal(outside,0,'membrane skeleton must not protrude through the dimple');
  } finally {c.dispose();}
});
test('red-cell membrane has an opaque biconcave surface and a small transparent display sector',()=>{
  const c=createCell({modelId:'red-blood-cell',quality:'low'});
  try {
    const meshes=c.groups.get('membrane').children;
    assert.ok(meshes.some(m=>!m.material.transparent),'opaque surface makes the depression readable');
    assert.ok(meshes.some(m=>m.material.transparent),'display sector exposes hemoglobin without a central hole');
  } finally {c.dispose();}
});
test('mature human erythrocyte is biconcave with no nucleus or protein-synthesis organelles',()=>{
  assert.ok(cellModels['red-blood-cell'],'RBC registry entry exists');
  const c=inspect('red-blood-cell');
  try {
    assert.deepEqual([...c.groups.keys()],['membrane','hemoglobin','cytoskeleton']);
    assert.match(cellModels['red-blood-cell'].cellType,/mature human/);
    const positions=c.groups.get('membrane').children[0].geometry.attributes.position;
    let center=0,shoulder=0,nearCenter=0;
    for(let i=0;i<positions.count;i++){
      const r=Math.hypot(positions.getX(i),positions.getY(i)),z=Math.abs(positions.getZ(i));
      if(r<.1){center=Math.max(center,z);nearCenter++;}if(r>2&&r<4.5)shoulder=Math.max(shoulder,z);
    }
    assert.ok(nearCenter>0&&center>.1,'disc is not a torus with a central hole');
    assert.ok(shoulder>center*1.5,'both surfaces are depressed at the center');
    assert.match(cellModels['red-blood-cell'].accuracy,/no nucleus.*mitochondria.*ribosomes/i);
  } finally {c.dispose();}
});
test('multipolar neuron has branched dendrites and one continuous unmyelinated axon',()=>{
  assert.ok(cellModels.neuron,'neuron registry entry exists');
  const c=inspect('neuron');
  try {
    for(const id of ['nucleus','dendrites','axon','terminals','nissl','mitochondria','membrane'])assert.ok(c.groups.has(id),id);
    assert.equal(c.groups.has('cell-wall'),false);
    const dendrites=new THREE.Box3().setFromObject(c.groups.get('dendrites'));
    const axon=new THREE.Box3().setFromObject(c.groups.get('axon'));
    assert.ok(dendrites.min.x < -6 && dendrites.max.y>3 && dendrites.min.y < -3);
    assert.ok(axon.min.x < 0 && axon.max.x>5,'axon extends from soma to terminal tree');
    assert.match(cellModels.neuron.disclaimer,/unmyelinated.*shortened/i);
  } finally {c.dispose();}
});

test('E. coli is a rod-shaped prokaryote with three distinct envelope layers and no nucleus',()=>{
  assert.ok(cellModels.bacterium,'bacterium registry entry exists');
  assert.match(cellModels.bacterium.cellType,/Escherichia coli/);
  const c=inspect('bacterium');
  try {
    assert.deepEqual([...c.groups.keys()],['nucleoid','ribosomes','membrane','cell-wall','outer-membrane','flagella']);
    for(const id of ['nucleus','mitochondria','golgi'])assert.equal(c.groups.has(id),false);
    const outer=new THREE.Box3().setFromObject(c.groups.get('outer-membrane'));
    const wall=new THREE.Box3().setFromObject(c.groups.get('cell-wall'));
    const inner=new THREE.Box3().setFromObject(c.groups.get('membrane'));
    assert.ok(outer.containsBox(wall)&&wall.containsBox(inner));
    assert.ok(inner.max.x-inner.min.x > 2*(inner.max.y-inner.min.y),'rod, not relabeled mammalian sphere');
    assert.match(cellModels.bacterium.disclaimer,/strain|motile/i);
  } finally {c.dispose();}
});
