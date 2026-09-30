import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({channel:'chromium',args:['--use-angle=metal']});
await fs.mkdir('evidence',{recursive:true});
const report={url:base,tests:[],errors:[]};
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const diag=page=>page.evaluate(()=>window.cellAtlas.diagnostics());
async function pick(page,id) {
  if(await page.locator('#structures-open').isVisible())await page.locator('#structures-open').click();
  await page.locator(`[data-structure="${id}"]`).click();await settle(page);
}
async function ready(page,url=base) {await page.goto(url);await page.waitForFunction(()=>window.cellAtlas?.ready);await settle(page);}
const names={mammalian:['nucleus','nucleolus','rough-er','smooth-er','golgi','mitochondria','lysosomes','peroxisomes','endosomes','ribosomes','cytoskeleton','membrane'],plant:['nucleus','nucleolus','rough-er','smooth-er','golgi','mitochondria','chloroplasts','vacuole','cell-wall','peroxisomes','endosomes','ribosomes','cytoskeleton','membrane'],fungal:['nucleus','nucleolus','rough-er','smooth-er','golgi','mitochondria','vacuole','cell-wall','bud-neck','peroxisomes','endosomes','ribosomes','cytoskeleton','membrane']};
try {
  // Context loss must not leave stale selection/isolation UI in reading mode.
  const lost=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  lost.on('pageerror',e=>report.errors.push(e.message));
  await ready(lost);await lost.locator('#cell-model').selectOption('plant');await lost.locator('#isolate-button').click();
  await lost.evaluate(()=>document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await lost.waitForFunction(()=>!window.cellAtlas.diagnostics().webgl);
  await lost.locator('#cell-model').selectOption('fungal');
  assert.equal(await lost.locator('#isolate-button').getAttribute('aria-pressed'),'false','fallback does not retain old pressed state');
  assert.equal(await lost.locator('.scene-label').count(),0);
  assert.equal((await diag(lost)).manifest,undefined,'disposed model is not reported as current');
  await lost.locator('#next-structure').click();await lost.locator('#details-open').click();
  assert.match(await lost.locator('#detail-description').textContent(),/beta-glucans/);
  await lost.keyboard.press('Escape');await lost.close();
  report.tests.push({test:'context loss then model switch retains sourced reading mode',status:'passed'});

  for(const [width,height] of [[1440,1000],[390,844],[320,568],[568,320],[844,390]]) {
    const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<900,deviceScaleFactor:1.5,reducedMotion:'reduce'});
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    await ready(page);
    for(const modelId of ['plant','fungal','mammalian']) {
      await page.locator('#cell-model').selectOption(modelId);await settle(page);
      assert.equal((await diag(page)).webgl,true);
      const list=await page.locator('[data-structure]').evaluateAll(items=>items.map(i=>i.dataset.structure));
      assert.deepEqual(list,names[modelId]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const frame=await page.locator('canvas').boundingBox();assert.ok(frame.height>=180);
      await pick(page,'nucleus');await page.locator('#isolate-button').click();
      assert.deepEqual((await diag(page)).visibleIds,['nucleus','nucleolus']);
      // Every structure is keyboard-navigable, focused, and revealed from clipping.
      for(const expected of [...names[modelId].slice(1),'nucleus']) {
        await page.locator('#clipping').fill('100');
        await page.locator('#next-structure').focus();await page.keyboard.press('Enter');
        const d=await diag(page);
        assert.equal(d.selected,expected);assert.equal(d.clipping,0);assert.equal(d.isolated,true);
        assert.ok(d.visibleIds.includes(expected));
        assert.ok(d.target.every((n,i)=>Math.abs(n-d.focusPoint[i])<1e-8),`${width}x${height}/${modelId}/${expected} target=${d.target}, focus=${d.focusPoint}`);
        const obscured=await page.locator('#cell-model,#next-structure,#previous-structure,#focus-button,#isolate-button,#details-open,#clipping').evaluateAll(elements=>elements.filter(el=>{
          const r=el.getBoundingClientRect();return r.width<44||r.height<44||r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth||!el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
        }).map(el=>el.id));
        assert.deepEqual(obscured,[],`${width}x${height}/${modelId}/${expected} controls fit`);
      }
      await page.locator('#previous-structure').click();assert.equal((await diag(page)).selected,'membrane');
      await page.locator('#reset-button').click();
      await page.locator('#settings-open').click();
      await page.locator('#membrane-toggle').uncheck();
      assert.equal(await page.locator('#wall-setting').isVisible(),modelId!=='mammalian');
      if(modelId!=='mammalian')await page.locator('#wall-toggle').uncheck();
      await page.locator('#labels-toggle').uncheck();
      for(const quality of ['low','high','balanced']) {
        await page.locator('#quality').selectOption(quality);await settle(page);
        const d=await diag(page);assert.equal(d.manifest.modelId,modelId);assert.equal(d.quality,quality);
        assert.ok(!d.visibleIds.includes('membrane'));assert.ok(!d.visibleIds.includes('cell-wall'));
        assert.equal(await page.locator('.scene-label:visible').count(),0);assert.ok(d.triangles>10000);
      }
      await page.keyboard.press('Escape');
      await pick(page,modelId==='mammalian'?'membrane':'cell-wall');
      assert.ok((await diag(page)).visibleIds.includes(modelId==='mammalian'?'membrane':'cell-wall'));
      await page.locator('#reset-button').click();assert.equal((await diag(page)).visibleIds.length,names[modelId].length);
      await page.locator('#settings-open').click();await page.locator('#labels-toggle').check();await page.keyboard.press('Escape');
      await page.locator('canvas').focus();
      const before=(await diag(page)).camera;await page.keyboard.press('ArrowRight');await page.keyboard.press('+');await settle(page);
      assert.notDeepEqual((await diag(page)).camera,before);
      await page.keyboard.press('Home');await settle(page);assert.deepEqual((await diag(page)).target,[0,0,0]);
      await page.locator('#clipping').focus();await page.keyboard.press('End');assert.equal((await diag(page)).clipping,100);
      await page.locator('#focus-button').click();assert.equal((await diag(page)).clipping,0);
      await page.locator('#reset-button').click();
      if(width===390) {
        const cdp=await page.context().newCDPSession(page),cx=frame.x+frame.width/2,cy=frame.y+frame.height/2;
        for(const [name,start,end] of [
          ['orbit',[{x:cx,y:cy,id:1}],[{x:cx+45,y:cy-20,id:1}]],
          ['pinch',[{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}],[{x:cx-60,y:cy,id:1},{x:cx+60,y:cy,id:2}]],
          ['pan',[{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}],[{x:cx-10,y:cy+30,id:1},{x:cx+50,y:cy+30,id:2}]],
        ]) {
          const before=(await diag(page)).camera;
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:start});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:end});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
          assert.notDeepEqual((await diag(page)).camera,before,`${modelId} touch ${name}`);
        }
        await page.locator('#reset-button').click();await page.waitForTimeout(500);
        const initial=(await diag(page)).selected;
        let selected=initial;
        for(const [u,v] of [[.72,.7],[.75,.55],[.62,.34],[.3,.7],[.5,.5],[.28,.36],[.65,.65]]) {
          await page.touchscreen.tap(frame.x+frame.width*u,frame.y+frame.height*v);
          selected=(await diag(page)).selected;if(selected!==initial)break;
        }
        assert.notEqual(selected,initial,`${modelId} actual touch selects rendered structure`);
        const slider=await page.locator('#clipping').boundingBox();
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:slider.x+14,y:slider.y+22,id:1}]});
        for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:slider.x+14+(slider.width-28)*.7*i/6,y:slider.y+22,id:1}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert.ok((await diag(page)).clipping>=60);await page.locator('[data-depth="0"]').click();
      }
      await page.locator('#reset-button').click();await settle(page);
      await page.screenshot({path:`evidence/model-${modelId}-${width}x${height}.png`});
      report.tests.push({test:`${width}x${height}/${modelId}: all selections, isolation, focus, section, quality, labels, keyboard${width===390?', touch orbit/pinch/pan/tap/slider':''}`,status:'passed',render:await diag(page)});
    }
    await page.close();
  }
  for(const failure of ['off','initialization']) {
    const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
    if(failure==='initialization')await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    await ready(page,base+(failure==='off'?'/?webgl=off':''));
    for(const id of ['plant','fungal','mammalian']) {
      await page.locator('#cell-model').selectOption(id);assert.equal((await diag(page)).webgl,false);
      assert.equal(await page.locator('#section-control').isVisible(),false);
      for(const part of names[id]) {
        await pick(page,part);await page.locator('#details-open').click();
        assert.ok(await page.locator('#detail-sources a').count());
        assert.ok((await page.locator('#detail-description').textContent()).length>80);
        await page.keyboard.press('Escape');
      }
    }
    await page.screenshot({path:`evidence/model-fallback-${failure}.png`});await context.close();
    report.tests.push({test:`${failure}: all models and all sourced field notes remain accessible without WebGL`,status:'passed'});
  }
  const animated=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  await ready(animated);await animated.locator('#next-structure').click();
  await animated.locator('#cell-model').selectOption('plant');await animated.locator('#next-structure').click();
  await animated.locator('#cell-model').selectOption('fungal');await animated.waitForTimeout(1100);
  assert.equal((await diag(animated)).selected,'vacuole');assert.deepEqual((await diag(animated)).target,[0,0,0]);
  assert.equal((await diag(animated)).transitioning,false);assert.equal((await diag(animated)).rotating,false);
  const memory=[];
  for(let i=0;i<6;i++)for(const id of ['plant','fungal','mammalian']) {
    await animated.locator('#cell-model').selectOption(id);await settle(animated);
    memory.push({id,geometries:(await diag(animated)).geometries,labels:await animated.locator('.scene-label').count()});
  }
  for(const id of ['plant','fungal','mammalian']) {
    const observations=memory.filter(x=>x.id===id);
    assert.ok(observations.every(x=>x.geometries===observations[0].geometries && x.labels===3));
  }
  report.tests.push({test:'rapid animated switching and repeated GPU resource replacement',status:'passed',memory});await animated.close();
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
} finally {await fs.writeFile('evidence/model-interaction-results.json',JSON.stringify(report,null,2));await browser.close();}
