import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('evidence/expansion',{recursive:true});
const base=process.env.BASE_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({channel:'chromium',args:['--use-angle=metal']});
const results=[];
try {
  for(const [w,h] of [[1440,1000],[390,844],[320,568],[844,390],[568,320]]) {
    const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<900,hasTouch:w<900,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.waitForFunction(()=>window.cellAtlas?.ready);
    for(const id of ['bacterium','neuron','red-blood-cell','mammalian','plant','fungal']) {
      await page.locator('#cell-model').selectOption(id);
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      const d=await page.evaluate(()=>window.cellAtlas.diagnostics());
      assert.ok(d.webgl&&d.triangles>0);assert.equal(d.modelId,id);
      if(id==='red-blood-cell')assert.ok(d.camera[0]/d.camera[2]>.35,'default oblique view reveals both rim and depression');
      if(id==='neuron') {
        const {createCell}=await import('../src/cell.js'), THREE=await import('three');
        const box=await page.locator('canvas').boundingBox(),camera=new THREE.PerspectiveCamera(39,box.width/box.height,.1,100);
        camera.position.fromArray(d.camera);camera.lookAt(0,0,0);camera.updateMatrixWorld();
        const specimen=createCell({modelId:id,quality:'low'});let extent=0;
        specimen.root.traverse(o=>{if(o.geometry&&!o.isInstancedMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const q=new THREE.Vector3().fromBufferAttribute(p,i).project(camera);extent=Math.max(extent,Math.abs(q.x),Math.abs(q.y));}}});
        specimen.dispose();assert.ok(extent<.94,`neuron fits viewport: ${extent}`);
      }
      assert.equal(d.visibleIds.length,await page.locator('[data-structure]').count());
      if(['bacterium','neuron','red-blood-cell'].includes(id)&&[1440,390].includes(w))await page.screenshot({path:`evidence/expansion/overview-${id}-${w}.png`});
      const parts=await page.locator('[data-structure]').evaluateAll(bs=>bs.map(b=>b.dataset.structure));
      for(const part of parts) {
        if(await page.locator('#structures-open').isVisible())await page.locator('#structures-open').click();
        await page.locator(`[data-structure="${part}"]`).click();
        assert.equal((await page.evaluate(()=>window.cellAtlas.diagnostics())).selected,part);
        await page.locator('#isolate-button').click();await page.locator('#reset-button').click();
      }
      await page.locator('#sources-open').click();
      if(['bacterium','red-blood-cell'].includes(id))assert.doesNotMatch(await page.locator('#sources-dialog').innerText(),/Paired nuclear membranes/);
      await page.keyboard.press('Escape');
      if(['bacterium','neuron','red-blood-cell'].includes(id))await page.screenshot({path:`evidence/expansion/cell-${id}-${w}.png`});
      results.push({w,h,id,render:d});
    }
    assert.deepEqual(errors,[]);await context.close();
  }
} finally {await fs.writeFile('evidence/expansion/cells-browser.json',JSON.stringify(results,null,2));await browser.close();}
console.log(`${results.length} cell/viewport cases passed`);
