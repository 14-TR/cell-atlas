import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {serve,hash} from './chemistry-harness.js';
import {compounds,coverage} from '../src/chemistry/catalog.js';
import {elements} from '../src/elements.js';
import {reactions} from '../src/chemistry/reactions.js';
import {sourceManifest} from '../scripts/chemistry-identity.js';
await fs.mkdir('evidence/chemistry',{recursive:true});
const output=process.env.CHEMISTRY_EVIDENCE?path.resolve(process.env.CHEMISTRY_EVIDENCE):await fs.mkdtemp(path.resolve('evidence/chemistry/browser-'));
await fs.mkdir(output,{recursive:true});
assert.deepEqual(await fs.readdir(output),[],'Use a fresh evidence directory; prior receipts are immutable.');
const server=await serve();
const browser=await chromium.launch({channel:'chromium',args:['--use-angle=metal']});
const receipt={base:server.base,...await sourceManifest(),checks:[],errors:[]};
const newPage=async options=>{const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,...options});page.on('pageerror',e=>receipt.errors.push(e.message));return page;};
const diagnostics=page=>page.evaluate(()=>window.chemistryLab?.diagnostics());
const cases={
  async labelReadability() {
    const page=await newPage();await page.goto(server.base+'chemistry.html');await page.locator('#reaction-tab').click();await page.locator('#reaction-choice').selectOption('water');await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
    assert.ok((await diagnostics(page)).minimumLabelPixels>=12,'reaction formula glyphs must be legible on a phone');
    assert.equal(await page.locator('#scene-reset').evaluate(e=>e.scrollWidth>e.clientWidth),false,'Reset control text is not clipped');
    await page.screenshot({path:path.join(output,'readable-reaction.png')});receipt.checks.push({name:'label-readability',minimumLabelPixels:(await diagnostics(page)).minimumLabelPixels});await page.close();
  },
  async edgeStates() {
    const page=await newPage();await page.goto(server.base+'chemistry.html');await page.locator('#reaction-tab').click();
    await page.locator('[data-amount="0"]').fill('-1');await page.locator('[data-amount="0"]').press('Tab');
    assert.match(await page.locator('#reaction-message').innerText(),/0 to 100/);assert.equal(await page.locator('#reaction-results').count(),0);
    await page.locator('#builder-tab').click();await page.locator('#reaction-tab').click();
    assert.equal((await diagnostics(page)).atomCount,0,'invalid amounts cannot revive a stale reaction');
    await page.locator('#reaction-choice').selectOption('water');await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
    assert.ok((await diagnostics(page)).minimumLabelPixels>=12,'reaction formula glyphs must be legible on a phone');
    await page.locator('[data-amount="0"]').fill('0');await page.locator('[data-amount="0"]').press('Tab');await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
    const stopped=await diagnostics(page);await page.waitForTimeout(200);assert.deepEqual((await diagnostics(page)).positions,stopped.positions);
    assert.match(await page.locator('#reaction-results').innerText(),/0 virtual mol H2O/);
    await page.locator('#builder-tab').click();await page.locator('#formula-input').fill('C2H6O');await page.locator('#formula-form button').click();assert.equal((await diagnostics(page)).bonds,0);
    await page.locator('#formula-input').fill('H0');await page.locator('#formula-form button').click();assert.match(await page.locator('#builder-message').innerText(),/valid element/);
    receipt.checks.push({name:'edge-states'});await page.close();
  },
  async lookup() {
    const page=await newPage();const network=[];page.on('response',r=>{if(r.url().includes('pubchem.ncbi.nlm.nih.gov/rest/pug/'))network.push({url:r.url(),status:r.status()});});
    await page.goto(server.base+'chemistry.html');await page.locator('#formula-input').fill('C4H8O');await page.locator('#formula-form button').click();
    await page.locator('#lookup').click();
    await page.waitForFunction(()=>document.querySelector('#lookup-status').textContent.includes('exact-formula records'),undefined,{timeout:15000});
    assert.ok(await page.locator('#lookup-results a').count()>1);
    assert.match(await page.locator('#lookup-status').innerText(),/not exhaustive/);
    assert.equal((await diagnostics(page)).kind,'composition');
    await page.screenshot({path:path.join(output,'live-lookup.png'),fullPage:true});
    const live={network,status:await page.locator('#lookup-status').innerText(),links:await page.locator('#lookup-results a').evaluateAll(nodes=>nodes.map(n=>({name:n.textContent,url:n.href})))};
    await fs.writeFile(path.join(output,'live-lookup.json'),JSON.stringify(live,null,2));
    await page.locator('[data-preset="H2O"]').click();await page.context().setOffline(true);await page.locator('#lookup').click();
    await page.waitForFunction(()=>document.querySelector('#lookup-status').textContent.includes('unavailable'),undefined,{timeout:12000});
    assert.match(await page.locator('#match-summary').innerText(),/Water/);assert.match(await page.locator('#pubchem-search').getAttribute('href'),/H2O/);
    await page.locator('[data-preset="NaCl"]').click();assert.match(await page.locator('#match-summary').innerText(),/Sodium chloride/);
    receipt.checks.push({name:'lookup',liveRecords:live.links.length,network,offlineFailureHandled:true});await page.close();
  },
  async navigationTouch() {
    for(const [width,height] of [[320,568],[390,844],[568,320],[844,390]]) {
      const page=await newPage({viewport:{width,height}});await page.goto(server.base);
      const link=page.getByRole('link',{name:'Chemistry Lab',exact:true});assert.equal(await link.count(),1);
      await link.click();await page.waitForURL('**/chemistry.html');
      await page.locator('.lab-header a').filter({hasText:'Elements'}).click();await page.waitForURL('**/atoms.html');
      await page.getByRole('link',{name:'Chemistry',exact:true}).click();await page.waitForURL('**/chemistry.html');
      await page.locator('.lab-header a').filter({hasText:'Cells'}).click();await page.waitForURL(server.base);
      await page.getByRole('link',{name:'Chemistry Lab',exact:true}).click();await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
      if((await diagnostics(page)).playing)await page.locator('#scene-play').click();await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
      const canvas=page.locator('#chemistry-viewport canvas'),box=await canvas.boundingBox();const session=await page.context().newCDPSession(page);
      const before=await diagnostics(page);const cx=box.x+box.width/2,cy=Math.max(25,Math.min(height-60,box.y+box.height/2));
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx-35,y:cy}]});
      for(let i=1;i<=5;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx-35+i*14,y:cy+10}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const orbit=await diagnostics(page);assert.notDeepEqual(orbit.camera,before.camera);
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx-25,y:cy},{id:2,x:cx+25,y:cy}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx-60,y:cy},{id:2,x:cx+60,y:cy}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const pinch=await diagnostics(page);assert.ok(Math.abs(Math.hypot(...pinch.camera)-Math.hypot(...orbit.camera))>.1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(output,`touch-${width}.png`)});receipt.checks.push({name:'navigation-touch',width,height,orbit:true,pinch:true});await page.close();
    }
  },
  async gpu() {
    for(const [width,height] of [[320,568],[390,844],[568,320],[844,390],[1280,900]]) {
      const page=await newPage({viewport:{width,height}});await page.goto(server.base+'chemistry.html');
      await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>window.chemistryLab?.diagnostics().webgl,undefined,{timeout:4000});
      let state=await diagnostics(page);assert.ok(state.triangles>0);assert.match(state.gpu,/Apple|Metal/i);assert.equal(state.kind,'lattice');assert.equal(state.atomCount,64);
      await page.screenshot({path:path.join(output,`lattice-${width}.png`)});
      await page.locator('[data-preset="H2O"]').click();await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
      assert.equal((await diagnostics(page)).kind,'molecule');assert.equal((await diagnostics(page)).bonds,2);
      await page.screenshot({path:path.join(output,`water-${width}.png`)});
      await page.locator('#reaction-tab').click();await page.locator('#reaction-choice').selectOption('water');await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
      await page.locator('#scene-reset').click();state=await diagnostics(page);
      const a=await page.locator('#chemistry-viewport').screenshot({path:path.join(output,`motion-${width}-a.png`)});
      await page.waitForTimeout(600);const after=await diagnostics(page);
      const b=await page.locator('#chemistry-viewport').screenshot({path:path.join(output,`motion-${width}-b.png`)});
      assert.notDeepEqual(after.positions,state.positions);assert.deepEqual(after.camera,state.camera);assert.notEqual(hash(a),hash(b));
      await page.locator('#scene-play').click();const paused=await diagnostics(page);
      const p0=await page.locator('#chemistry-viewport').screenshot({path:path.join(output,`pause-${width}-a.png`)});await page.waitForTimeout(250);const p1=await page.locator('#chemistry-viewport').screenshot({path:path.join(output,`pause-${width}-b.png`)});
      const difference=await page.evaluate(async images=>{
        const pixels=await Promise.all(images.map(async data=>{const bitmap=await createImageBitmap(await (await fetch('data:image/png;base64,'+data)).blob());const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);return {width:c.width,height:c.height,bytes:ctx.getImageData(0,0,c.width,c.height).data};}));
        let changed=0,max=0;for(let i=0;i<pixels[0].bytes.length;i+=4){let delta=0;for(let k=0;k<4;k++)delta=Math.max(delta,Math.abs(pixels[0].bytes[i+k]-pixels[1].bytes[i+k]));if(delta)changed++;max=Math.max(max,delta);}return {changed,max,dimensions:pixels.map(p=>[p.width,p.height])};
      },[p0.toString('base64'),p1.toString('base64')]);
      await fs.writeFile(path.join(output,`pause-${width}.json`),JSON.stringify({before:paused,after:await diagnostics(page),difference},null,2));
      assert.deepEqual((await diagnostics(page)).positions,paused.positions);assert.equal(hash(p0),hash(p1));
      const camera=(await diagnostics(page)).camera;await page.locator('#scene-right').click();assert.notDeepEqual((await diagnostics(page)).camera,camera);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      receipt.checks.push({name:'gpu',width,height,gpu:after.gpu,triangles:after.triangles,timeDelta:after.time-state.time,pausedPixelsEqual:hash(p0)===hash(p1)});
      await page.close();
    }
    const page=await newPage();await page.goto(server.base+'chemistry.html');await page.locator('#reaction-tab').click();
    for(const r of reactions) {
      await page.locator('#reaction-choice').selectOption(r.id);await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
      const before=await diagnostics(page);
      // Wait for observed simulation progress, not a fixed wall-clock sleep:
      // real Metal rendering can be scheduled behind another GPU test process.
      try{await page.waitForFunction(t=>window.chemistryLab.diagnostics().time>t+.04,before.time,{timeout:5000});}
      catch(error){await fs.appendFile(path.join(output,'gpu-motion-diagnostics.jsonl'),JSON.stringify({id:r.id,before,after:await diagnostics(page),error:error.message})+'\n');throw error;}
      const after=await diagnostics(page);
      await fs.appendFile(path.join(output,'gpu-motion-diagnostics.jsonl'),JSON.stringify({id:r.id,before,after})+'\n');
      assert.equal(after.kind,'reaction');assert.ok(after.triangles>0);assert.notDeepEqual(after.positions,before.positions,r.id);
      await fs.appendFile(path.join(output,'gpu-reactions.jsonl'),JSON.stringify({id:r.id,atomCount:after.atomCount,timeDelta:after.time-before.time,gpu:after.gpu})+'\n');
    }
    const records=(await fs.readFile(path.join(output,'gpu-reactions.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(records.length,reactions.length);assert.equal(new Set(records.map(r=>r.id)).size,reactions.length);
    receipt.checks.push({name:'all-reaction-gpu',count:records.length});await page.close();
  },
  async lifecycle() {
    const page=await newPage({reducedMotion:'reduce'});await page.goto(server.base+'chemistry.html');await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>window.chemistryLab?.diagnostics().webgl,undefined,{timeout:4000});
    let state=await diagnostics(page);assert.equal(state.playing,false);await page.waitForTimeout(150);assert.equal((await diagnostics(page)).time,state.time);
    await page.locator('#scene-play').click();await page.waitForTimeout(150);assert.ok((await diagnostics(page)).time>state.time);
    await page.evaluate(()=>{window.motionChanges=[];window.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');window.motionQuery.addEventListener('change',e=>window.motionChanges.push(e.matches));});
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>window.motionChanges.includes(false));
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.motionChanges.includes(true));assert.equal((await diagnostics(page)).playing,false);
    await page.locator('#scene-play').click();await page.locator('#builder-search').scrollIntoViewIfNeeded();
    // Scrolling completes before the asynchronous IntersectionObserver callback.
    // Observe offscreen cancellation before sampling; a fixed delay races Metal RAF.
    await page.waitForFunction(()=>{const d=window.chemistryLab?.diagnostics();return d?.webgl===true&&d.visible===false&&d.pendingFrame===false;},undefined,{timeout:5000});
    state=await diagnostics(page);assert.equal(state.playing,true,'offscreen stability must not rely on pausing');
    await page.waitForTimeout(150);const offscreen=await diagnostics(page);
    await fs.writeFile(path.join(output,'offscreen-stability.json'),JSON.stringify({before:state,after:offscreen},null,2));
    assert.equal(offscreen.time,state.time);assert.equal(offscreen.pendingFrame,false);assert.equal(offscreen.visible,false);
    await page.locator('#chemistry-viewport').scrollIntoViewIfNeeded();
    for(let i=0;i<5;i++) {await page.locator('#reading-toggle').click();assert.equal((await diagnostics(page)).webgl,false);assert.equal((await diagnostics(page)).geometries,0);await page.locator('#reading-toggle').click();assert.equal((await diagnostics(page)).webgl,true);}
    await page.evaluate(()=>document.querySelector('#chemistry-viewport canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(()=>window.chemistryLab.diagnostics().webgl===false);
    assert.match(await page.locator('#scene-status').innerText(),/Reading mode/);assert.match(await page.locator('#match-summary').innerText(),/Sodium chloride/);
    await page.screenshot({path:path.join(output,'context-loss.png')});
    receipt.checks.push({name:'lifecycle',restarts:5,contextLoss:true});await page.close();
    const fallback=await newPage();await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});await fallback.goto(server.base+'chemistry.html');assert.match(await fallback.locator('#scene-status').innerText(),/Reading mode/);await fallback.close();
  },
  async reactions() {
    const page=await newPage();await page.goto(server.base+'chemistry.html');
    await page.locator('#reaction-tab').click();await page.waitForSelector('#reaction-choice',{timeout:3000});
    assert.equal(await page.locator('#reaction-choice option').count(),reactions.length);
    await page.locator('#reactant-a').selectOption('Na');await page.locator('#reactant-b').selectOption('Cl2');await page.locator('#find-reaction').click();
    assert.match(await page.locator('#reaction-equation').innerText(),/2 Na.*Cl2.*2 NaCl/);
    await page.locator('[data-amount="0"]').fill('5');await page.locator('[data-amount="0"]').press('Tab');
    assert.match(await page.locator('#reaction-results').innerText(),/3 virtual mol Na remaining/);
    assert.match(await page.locator('#reaction-results').innerText(),/2 virtual mol NaCl/);
    for(const r of reactions) {
      await page.locator('#reaction-choice').selectOption(r.id);
      assert.match(await page.locator('#conservation').innerText(),/Atoms and charge conserved/);
      assert.equal(await page.locator('#reaction-source').getAttribute('href'),r.sourceUrl);
      await fs.appendFile(path.join(output,'reactions.jsonl'),JSON.stringify({id:r.id})+'\n');
    }
    await page.locator('#reaction-choice').selectOption('water');
    await page.locator('[data-amount="0"]').fill('3');await page.locator('[data-amount="0"]').press('Tab');
    await page.locator('[data-amount="1"]').fill('2');await page.locator('[data-amount="1"]').press('Tab');
    assert.match(await page.locator('#reaction-results').innerText(),/0.5 virtual mol O2 remaining/);
    await page.locator('#reactant-a').selectOption('Na');await page.locator('#reactant-b').selectOption('H2');await page.locator('#find-reaction').click();
    assert.match(await page.locator('#reaction-message').innerText(),/No supported reaction/);
    assert.equal(await page.locator('#reaction-results').count(),0,'stale products are removed');
    const records=(await fs.readFile(path.join(output,'reactions.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(records.length,reactions.length);assert.equal(new Set(records.map(r=>r.id)).size,reactions.length);
    receipt.checks.push({name:'reactions',count:records.length});await page.close();
  },
  async builder() {
    const page=await newPage();const response=await page.goto(server.base+'chemistry.html');
    assert.equal(response.status(),200,'chemistry production entry exists');
    receipt.entrySHA256=hash(await response.body());
    assert.equal(receipt.entrySHA256,hash(await fs.readFile('dist/chemistry.html')));
    await page.waitForSelector('#element-options button');
    assert.equal(await page.locator('#element-options button').count(),118);
    await page.locator('[data-preset="NaCl"]').click();
    assert.match(await page.locator('#match-summary').innerText(),/Sodium chloride/);
    await page.locator('[data-preset="H2O"]').click();
    assert.match(await page.locator('#match-summary').innerText(),/Water/);
    await page.locator('#formula-input').fill('H4O2');await page.locator('#formula-form button').click();
    assert.match(await page.locator('#match-summary').innerText(),/No verified offline match/);
    await page.locator('#formula-input').fill('C2H6O');await page.locator('#formula-form button').click();
    assert.match(await page.locator('#match-summary').innerText(),/2 catalog candidates/);
    assert.equal(await page.locator('#matches button').count(),2);
    const tested=[];
    for (const c of compounds) {
      await page.locator('#catalog').selectOption(c.id);
      assert.ok((await page.locator('#matches').innerText()).includes(c.name),c.name);
      tested.push(c.id);await fs.appendFile(path.join(output,'catalog.jsonl'),JSON.stringify({id:c.id})+'\n');
    }
    assert.equal(new Set(tested).size,coverage.compounds);
    for(const e of elements) {
      await page.locator('#clear-composition').click();await page.locator('#builder-search').fill(e.symbol);
      await page.locator(`[data-element="${e.symbol}"]`).click();
      assert.equal(await page.locator(`[data-count="${e.symbol}"]`).inputValue(),'1');
      await fs.appendFile(path.join(output,'elements.jsonl'),JSON.stringify({number:e.number,symbol:e.symbol,count:1})+'\n');
    }
    await page.locator('#builder-search').fill('');
    await page.locator('[data-preset="H2O"]').click();
    await page.locator('[data-count="H"]').fill('-1');await page.locator('[data-count="H"]').press('Tab');
    assert.match(await page.locator('#builder-message').innerText(),/0 to 99/);
    await page.screenshot({path:path.join(output,'builder-390.png'),fullPage:true});
    const collected=JSON.parse('['+(await fs.readFile(path.join(output,'elements.jsonl'),'utf8')).trim().split('\n').join(',')+']');
    assert.equal(collected.length,118);assert.equal(new Set(collected.map(e=>e.symbol)).size,118);
    assert.equal((await fs.readFile(path.join(output,'catalog.jsonl'),'utf8')).trim().split('\n').length,compounds.length);
    receipt.checks.push({name:'builder',compounds:tested.length,elements:collected.length});await page.close();
  },
};
try {
  for(const name of (process.argv.slice(2).length?process.argv.slice(2):Object.keys(cases))) {assert.ok(cases[name],name);await cases[name]();console.log('PASS',name);}
  assert.deepEqual(receipt.errors,[]);
}catch(error){receipt.failure=error.stack;console.error(error);process.exitCode=1;}
finally{await browser.close();await server.close();await fs.writeFile(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2));console.log(output);}
