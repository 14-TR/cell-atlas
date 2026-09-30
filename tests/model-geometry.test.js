import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createCell } from '../src/cell.js';
import { plantLayout, fungalLayout } from '../src/walled-cell.js';

test('walled-cell organelles stay outside the vacuole lumen', () => {
  for(const [modelId,layout] of [['plant',plantLayout],['fungal',fungalLayout]]) {
    const cell=createCell({modelId,quality:'low'}), conflicts={};
    const {center,radii,power}=layout.vacuole;
    // Independent superellipsoid containment equation, not the sampler helper.
    const inside=p=>p.toArray().reduce((s,n,i)=>s+Math.pow(Math.abs((n-center[i])/radii[i]),2/power),0)<.999;
    for(const id of ['nucleus','nucleolus','rough-er','smooth-er','golgi','mitochondria','chloroplasts','peroxisomes','endosomes','ribosomes']) {
      let count=0;
      cell.groups.get(id)?.traverse(o=>{
        if(!o.geometry)return;
        if(o.isInstancedMesh) {
          const matrix=new THREE.Matrix4();
          for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);if(inside(new THREE.Vector3().setFromMatrixPosition(matrix)))count++;}
        } else {
          const pos=o.geometry.attributes.position;
          for(let i=0;i<pos.count;i++)if(inside(new THREE.Vector3().fromBufferAttribute(pos,i)))count++;
        }
      });
      if(count)conflicts[id]=count;
    }
    cell.dispose();
    assert.deepEqual(conflicts,{},`${modelId} organelles must be in cytoplasm, not the vacuole lumen`);
  }
});

for(const modelId of ['mammalian','plant','fungal']) for(const quality of ['low','balanced','high']) {
  test(`${modelId}/${quality}: deterministic finite geometry and complete selectable groups`, () => {
    const a=createCell({modelId,quality}),b=createCell({modelId,quality});
    try {
      assert.equal(fingerprint(a),fingerprint(b));
      assert.equal(a.groups.size,modelId==='mammalian'?12:14);
      for(const [id,g] of a.groups) {
        assert.ok(g.children.length && g.userData.focus.distance>0,id);
        g.traverse(o=>{
          if(!o.geometry)return;
          for(const attribute of [o.geometry.attributes.position,o.geometry.attributes.normal,o.instanceMatrix].filter(Boolean)) {
            assert.ok(attribute.array.every(Number.isFinite),`${id}: all generated positions/normals/transforms are finite`);
          }
        });
      }
    } finally {a.dispose();b.dispose();}
  });
}

test('new model organelles fit within the enclosing plasma membrane', () => {
  for(const modelId of ['plant','fungal']) {
    const cell=createCell({modelId,quality:'low'}),rows=new Map(),outside={};
    if(modelId==='fungal') {
      const p=cell.groups.get('membrane').children.find(o=>o.material.name==='membrane').geometry.attributes.position;
      for(let i=0;i<p.count;i++)rows.set(p.getX(i),Math.max(rows.get(p.getX(i))||0,Math.abs(p.getY(i))));
    }
    const profile=[...rows].sort((a,b)=>a[0]-b[0]);
    const containment=p=>{
      if(modelId==='plant')return (Math.abs(p.x/(7.2*.945))**(2/.36)+Math.abs(p.y/(5.25*.945))**(2/.36)+Math.abs(p.z/(4.4*.945))**(2/.36));
      const i=profile.findIndex(r=>r[0]>=p.x);if(i<1)return Infinity;
      const [x,r]=profile[i-1],[xx,s]=profile[i],radius=THREE.MathUtils.lerp(r,s,(p.x-x)/(xx-x));
      return(p.y/radius)**2+(p.z/(radius*.78))**2;
    };
    for(const [id,group] of cell.groups) {
      if(['membrane','cell-wall','bud-neck','cytoskeleton','ribosomes','vacuole'].includes(id))continue;
      let count=0;
      group.traverse(o=>{
        if(!o.geometry)return;
        if(o.isInstancedMesh){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);if(containment(new THREE.Vector3().setFromMatrixPosition(m))>1.01)count++;}}
        else {const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)if(containment(new THREE.Vector3().fromBufferAttribute(p,i))>1.01)count++;}
      });
      if(count)outside[id]=count;
    }
    cell.dispose();assert.deepEqual(outside,{},`${modelId} organelles belong inside the cell`);
  }
});

function fingerprint(cell) {
  const hash = createHash('sha256');
  cell.root.traverse(o => {
    if (!o.geometry) return;
    hash.update(o.material.name);
    for (const a of [o.geometry.attributes.position, o.geometry.index, o.instanceMatrix].filter(Boolean)) hash.update(Buffer.from(a.array.buffer));
  });
  return hash.digest('hex');
}
const materials = (cell, id) => cell.groups.get(id)?.children.map(o => o.material.name) || [];

test('disposing a specimen releases instance buffers as well as geometry and materials', () => {
  const cell = createCell({modelId:'plant',quality:'low'});
  const expected=new Set(), released=new Set();
  cell.root.traverse(o=>{
    for(const resource of [o.isInstancedMesh ? o : null,o.geometry].filter(Boolean)) {
      expected.add(resource);resource.addEventListener('dispose',()=>released.add(resource));
    }
  });
  for(const mat of cell.materials){expected.add(mat);mat.addEventListener('dispose',()=>released.add(mat));}
  cell.dispose();
  assert.equal(released.size,expected.size,'every GPU-owned resource is disposed during model replacement');
});

test('chloroplast grana expose layered discs rather than end-on dots in the front cutaway', () => {
  const cell=createCell({modelId:'plant',quality:'low'});
  try {
    const geo=cell.groups.get('chloroplasts').children.find(o=>o.material.name==='thylakoids').geometry;
    const verticesPerDisc=148; // Three.js 24-segment closed cylinder, independently checked.
    const a=new THREE.Vector3().fromBufferAttribute(geo.attributes.position,0);
    const b=new THREE.Vector3().fromBufferAttribute(geo.attributes.position,verticesPerDisc);
    assert.ok(Math.abs(b.y-a.y)>Math.abs(b.z-a.z),'stack separation is visible vertically in the front cutaway');
  } finally {cell.dispose();}
});

test('mammalian geometry remains byte-identical to the original low-quality specimen', () => {
  const cell = createCell({ quality: 'low' });
  try { assert.equal(fingerprint(cell), '1212927358e4c65fa8e8f182be428dfb31c1dae91226bb6a95232d9451da6d21'); }
  finally { cell.dispose(); }
});

test('plant geometry has an outer wall, central tonoplast and distinct chloroplast membrane systems', () => {
  const cell = createCell({ modelId: 'plant', quality: 'low' });
  try {
    assert.equal(cell.groups.size, 14, 'plant has its own structure set');
    assert.equal(cell.groups.has('lysosomes'), false);
    for (const name of ['chloroplastOuter', 'chloroplastInner', 'thylakoids', 'stromaLamellae']) assert.ok(materials(cell, 'chloroplasts').includes(name), name);
    assert.ok(materials(cell, 'vacuole').includes('tonoplast'));
    assert.ok(materials(cell, 'cell-wall').includes('wallFibers'));
    const wall = new THREE.Box3().setFromObject(cell.groups.get('cell-wall'));
    const membrane = new THREE.Box3().setFromObject(cell.groups.get('membrane'));
    assert.ok(wall.containsBox(membrane), 'extracellular wall encloses plasma membrane');
    const nucleus = new THREE.Box3().setFromObject(cell.groups.get('nucleus'));
    const vac = new THREE.Box3().setFromObject(cell.groups.get('vacuole'));
    assert.ok(nucleus.max.x < vac.min.x, 'nucleus is in peripheral cytoplasm, not inside vacuole');
    assert.equal(cell.manifest.modelId, 'plant');
    assert.ok(cell.manifest.chloroplasts > 1);
    assert.equal(cell.manifest.chloroplastEnvelopeMembranes, 2);
    assert.equal(cell.manifest.vacuoleMembranes, 1);
    assert.equal(cell.manifest.golgiArrangement, 'discrete stacks');
    for (const [id, group] of cell.groups) {
      assert.ok(group.children.length, id);
      assert.ok(group.userData.focus.point.toArray().every(Number.isFinite), `${id} focus`);
    }
  } finally { cell.dispose(); }
});

test('budding yeast has a continuous mother-bud envelope and dispersed Golgi, not plant anatomy', () => {
  const cell = createCell({ modelId: 'fungal', quality: 'low' });
  try {
    assert.equal(cell.groups.size, 14);
    assert.ok(materials(cell, 'cell-wall').includes('yeastWall'), 'fungal wall geometry exists');
    assert.ok(materials(cell, 'bud-neck').includes('chitinRings'));
    assert.ok(materials(cell, 'vacuole').includes('tonoplast'));
    assert.equal(cell.groups.has('chloroplasts'), false);
    assert.equal(cell.groups.has('lysosomes'), false);
    const membrane = cell.groups.get('membrane').children.find(o => o.material.name === 'membrane');
    const positions = membrane.geometry.attributes.position;
    const neck = [], bud = [];
    for (let i=0;i<positions.count;i++) {
      const x=positions.getX(i), y=Math.abs(positions.getY(i));
      if(x>2.6 && x<2.9) neck.push(y);
      if(x>4.1 && x<4.7) bud.push(y);
    }
    assert.ok(neck.length && bud.length, 'one membrane mesh spans the connection and bud');
    assert.ok(Math.max(...neck)<Math.max(...bud), 'the bud has a narrower neck, not an overlapping sphere');
    const golgi = new THREE.Box3().setFromObject(cell.groups.get('golgi'));
    assert.ok(golgi.min.x < -3 && golgi.max.x > 4, 'single cisternae are dispersed across mother and bud');
    assert.equal(cell.manifest.golgiArrangement, 'dispersed unstacked cisternae');
    assert.equal(cell.manifest.vacuoleMembranes, 1);
    assert.equal(cell.manifest.chloroplasts, 0);
    assert.equal(cell.manifest.budConnection, 'open');
    for (const [id,group] of cell.groups) assert.ok(group.children.length && group.userData.focus, id);
  } finally { cell.dispose(); }
});
