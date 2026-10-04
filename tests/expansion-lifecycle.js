import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('evidence/expansion',{recursive:true});
const base=process.env.BASE_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({channel:'chromium',args:['--use-angle=metal']});
const evidence={errors:[],checks:[]};
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
try {
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  page.on('pageerror',e=>evidence.errors.push(e.message));
  await page.goto(`${base}/atoms.html`);
  await page.locator('[data-element="6"]').click();
  await page.evaluate(()=>{document.querySelector('#atom-dialog').close();document.querySelector('[data-element="79"]').click();});
  await frames(page);
  const reopened=await page.evaluate(()=>window.atomAtlas.diagnostics());
  assert.ok(reopened.opened&&reopened.triangles>0,`queued close event must not dispose reopened atom: ${JSON.stringify(reopened)}`);
  evidence.checks.push({name:'rapid-close-reopen',render:reopened});
  await page.keyboard.press('Escape');await frames(page);
  for(let cycle=0;cycle<8;cycle++)for(const z of [1,6,26,79,92,118]){
    await page.locator('#element-search').fill(String(z));await page.keyboard.press('Enter');await frames(page);
    const d=await page.evaluate(()=>window.atomAtlas.diagnostics());assert.ok(d.triangles>0);assert.ok(d.geometries<=10);
    await page.locator('#atom-close').click();await frames(page);
    assert.equal((await page.evaluate(()=>window.atomAtlas.diagnostics())).geometries,0,'closed atom frees all geometry');
  }
  evidence.checks.push({name:'48-open-dispose-cycles',status:'passed'});
  await page.locator('#element-search').fill('Au');await page.keyboard.press('Enter');await frames(page);
  const canvas=page.locator('#atom-viewport canvas'),box=await canvas.boundingBox(),cdp=await page.context().newCDPSession(page);
  const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:2,radiusY:2,force:1}))});
  const before=await page.evaluate(()=>window.atomAtlas.diagnostics());
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await touch('touchStart',[[x-30,y,1]]);
  for(let i=1;i<=8;i++)await touch('touchMove',[[x-30+i*8,y+i*2,1]]);
  await touch('touchEnd',[]);await frames(page);
  const orbit=await page.evaluate(()=>window.atomAtlas.diagnostics());assert.notDeepEqual(orbit.camera,before.camera);
  await touch('touchStart',[[x-30,y,1],[x+30,y,2]]);
  for(let i=1;i<=8;i++)await touch('touchMove',[[x-30-i*4,y,1],[x+30+i*4,y,2]]);
  await touch('touchEnd',[]);await frames(page);
  const pinch=await page.evaluate(()=>window.atomAtlas.diagnostics());
  assert.ok(Math.hypot(...pinch.camera)<Math.hypot(...orbit.camera)*.9,'real touch pinch zooms');
  evidence.checks.push({name:'CDP-touch-orbit-pinch',before,orbit,pinch});
  await page.screenshot({path:'evidence/expansion/atom-touch.png'});
  await page.evaluate(()=>document.querySelector('#atom-viewport canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction(()=>!window.atomAtlas.diagnostics().webgl);
  assert.match(await page.locator('#atom-status').innerText(),/Reading mode/);
  await page.keyboard.press('Escape');await frames(page);
  await page.locator('#element-search').fill('118');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#atom-name').innerText(),'Oganesson');
  evidence.checks.push({name:'context-loss-readable-and-switchable',status:'passed'});
  for(const path of ['/atoms.html?webgl=off','/?webgl=off']){
    await page.goto(base+path);
    if(path.startsWith('/atoms')){
      await page.locator('#element-search').fill('Fe');await page.keyboard.press('Enter');
      assert.match(await page.locator('#atom-status').innerText(),/Reading mode/);assert.match(await page.locator('#atom-counts').innerText(),/26 protons/);
      assert.equal(await page.locator('#atom-rotate').isDisabled(),true);
      await page.screenshot({path:'evidence/expansion/atom-reading.png'});
    }else for(const id of ['bacterium','neuron','red-blood-cell','plant','fungal','mammalian']){
      await page.locator('#cell-model').selectOption(id);assert.equal((await page.evaluate(()=>window.cellAtlas.diagnostics())).modelId,id);assert.ok(await page.locator('#selected-description').textContent());
    }
    evidence.checks.push({name:path,status:'passed'});
  }
  await page.goto(base);await page.waitForFunction(()=>window.cellAtlas?.ready);
  const memory={};
  for(let cycle=0;cycle<4;cycle++)for(const id of ['bacterium','neuron','red-blood-cell','plant','fungal','mammalian']){
    await page.locator('#cell-model').selectOption(id);await frames(page);const d=await page.evaluate(()=>window.cellAtlas.diagnostics());
    if(memory[id])assert.equal(d.geometries,memory[id],`${id} has stable GPU geometry count`);memory[id]=d.geometries;
  }
  evidence.checks.push({name:'24-cell-switches-stable-memory',memory});
  assert.deepEqual(evidence.errors,[]);
}finally{await fs.writeFile('evidence/expansion/lifecycle.json',JSON.stringify(evidence,null,2));await browser.close();}
console.log(JSON.stringify(evidence,null,2));
