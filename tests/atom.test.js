import test from 'node:test';
import assert from 'node:assert/strict';
import {elements} from '../src/elements.js';
const module=()=>import('../src/atom.js').catch(()=>({}));
test('every atom builds the correct number of electron and nucleon instances and releases GPU resources',async()=>{
  const {createAtom}=await module();assert.equal(typeof createAtom,'function','atom geometry generator exists');
  for(const e of elements){
    const atom=createAtom(e),counts={};
    const expected=new Set(),disposed=new Set();
    atom.root.traverse(o=>{
      if(o.isInstancedMesh)counts[o.name]=o.count;
      for(const r of [o.isInstancedMesh?o:null,o.geometry,...(o.material?[o.material]:[])].filter(Boolean)){
        expected.add(r);r.addEventListener('dispose',()=>disposed.add(r));
      }
      for(const a of [o.geometry?.attributes.position,o.instanceMatrix].filter(Boolean))assert.ok(a.array.every(Number.isFinite));
    });
    assert.deepEqual(counts,{protons:e.number,neutrons:e.neutrons,electrons:e.number},e.symbol);
    assert.equal(atom.root.children.filter(o=>o.name.startsWith('shell-')).length,e.shells.length);
    atom.dispose();assert.equal(disposed.size,expected.size,e.symbol);
  }
});
