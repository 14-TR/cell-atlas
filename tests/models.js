import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { createCell } from '../src/cell.js';
const base = process.env.BASE_URL || 'http://127.0.0.1:4175';
await fs.mkdir('evidence',{recursive:true});
const browser = await chromium.launch({channel:'chromium',args:['--use-angle=metal']});
const evidence={url:base,tests:[],errors:[]};
try {
  for(const [mode,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
    const context=await browser.newContext({viewport:{width,height},hasTouch:mode==='mobile',isMobile:mode==='mobile',reducedMotion:'reduce'});
    const page=await context.newPage();
    page.on('pageerror',e=>evidence.errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')evidence.errors.push(m.text());});
    await page.goto(base);await page.waitForFunction(()=>window.cellAtlas?.ready);
    const picker=page.getByRole('combobox',{name:'Cell model',exact:true});
    assert.equal(await picker.count(),1,'an always-available accessible model selector exists');
    for(const [id,count,selected,caption] of [['plant',14,'chloroplasts','PLANT CELL'],['fungal',14,'vacuole','FUNGAL CELL'],['mammalian',12,'nucleus','MAMMALIAN CELL']]) {
      await page.locator('#isolate-button').click();
      await page.locator('#clipping').fill('80');
      await picker.selectOption(id);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const d=await page.evaluate(()=>window.cellAtlas.diagnostics());
      assert.equal(d.webgl,true);
      assert.equal(d.modelId,id);assert.equal(d.manifest.modelId,id);
      assert.equal(d.selected,selected);assert.equal(d.isolated,false);assert.equal(d.clipping,0);
      assert.deepEqual(d.target,[0,0,0]);assert.equal(d.transitioning,false);
      assert.equal(d.visibleIds.length,count);assert.equal(d.rotating,false);
      assert.equal(await page.locator('#structure-list button').count(),count);
      assert.equal(await page.locator('#model-caption').textContent(),caption);
      assert.equal(await page.locator('.scene-label').count(),3,'no leaked/stale labels');
      if(id==='plant') {
        const box=await page.locator('canvas').boundingBox();
        const camera=new THREE.PerspectiveCamera(39,box.width/box.height,.1,100);
        camera.position.fromArray(d.camera);camera.lookAt(new THREE.Vector3(...d.target));camera.updateMatrixWorld();
        const specimen=createCell({modelId:id,quality:'low'});
        let maxX=0,maxY=0;
        specimen.groups.get('cell-wall').traverse(o=>{
          if(!o.geometry)return;
          const pos=o.geometry.attributes.position;
          for(let i=0;i<pos.count;i++) {
            const p=new THREE.Vector3().fromBufferAttribute(pos,i).project(camera);
            maxX=Math.max(maxX,Math.abs(p.x));maxY=Math.max(maxY,Math.abs(p.y));
          }
        });
        specimen.dispose();
        assert.ok(maxX<.94 && maxY<.94,`plant overview fits inside model viewport: ${maxX}, ${maxY}`);
      }
      await page.locator('#sources-open').click();
      assert.match(await page.locator('#model-disclaimer').textContent(),id==='fungal'?/Saccharomyces cerevisiae/:id==='plant'?/photosynthetic plant/:/mammalian/);
      await page.keyboard.press('Escape');
      await page.screenshot({path:`evidence/${mode}-${id}.png`});
      evidence.tests.push({mode,id,status:'passed',render:d});
    }
    await context.close();
  }
  assert.deepEqual(evidence.errors,[]);
  console.log(JSON.stringify(evidence,null,2));
} finally {await fs.writeFile('evidence/model-results.json',JSON.stringify(evidence,null,2));await browser.close();}
