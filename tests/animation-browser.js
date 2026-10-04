import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';

const output = path.resolve(process.env.ANIMATION_EVIDENCE || 'evidence/animation');
await fs.mkdir(output, {recursive:true});
const root = path.resolve('dist');
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/cell-atlas/')) {res.writeHead(404);res.end();return;}
    const file = path.resolve(root, decodeURIComponent(url.pathname.slice('/cell-atlas/'.length) || 'index.html'));
    if (!file.startsWith(root + path.sep)) {res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/cell-atlas/`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const entry = await fs.readFile(path.join(root,'atoms.html'));
assert.equal(hash(Buffer.from(await (await fetch(base + 'atoms.html')).arrayBuffer())), hash(entry), 'owned loopback serves the exact built entry');
const browser = await chromium.launch({channel:'chromium',args:['--use-angle=metal']});
const receipt = {base,entrySHA256:hash(entry),checks:[],errors:[],consoleErrors:[]};
const diagnostics = page => page.evaluate(() => window.atomAtlas.diagnostics());
// OrbitControls re-expresses coordinates through spherical arithmetic: ignore
// machine-epsilon roundoff, not camera motion. Paused pixels must still match.
const stillCamera = (after,before) => after.forEach((v,i) => assert.ok(Math.abs(v-before[i]) < 1e-10));
const pixelDifference = (page,a,b) => page.evaluate(async images => {
  const decoded = await Promise.all(images.map(async data => {
    const image = await createImageBitmap(await (await fetch('data:image/png;base64,'+data)).blob());
    const canvas = document.createElement('canvas');canvas.width = image.width;canvas.height = image.height;
    const context = canvas.getContext('2d');context.drawImage(image,0,0);image.close();
    return {width:canvas.width,height:canvas.height,pixels:context.getImageData(0,0,canvas.width,canvas.height).data};
  }));
  const [first,second] = decoded;
  if (first.width !== second.width || first.height !== second.height) throw new Error('capture dimensions changed');
  let changed = 0, maximum = 0;
  for (let i=0;i<first.pixels.length;i+=4) {
    let delta = 0;for(let j=0;j<4;j++) delta = Math.max(delta,Math.abs(first.pixels[i+j]-second.pixels[i+j]));
    if (delta) changed++;maximum = Math.max(maximum,delta);
  }
  return {changed,maximum,pixels:first.width*first.height};
}, [a.toString('base64'),b.toString('base64')]);
const heldPixels = difference => {
  // Metal/mobile compositing can change a few edge pixels by one 8-bit step.
  // Instance positions/time remain EXACT; visible movement is not tolerated.
  assert.ok(difference.changed <= 8 && difference.maximum <= 1, JSON.stringify(difference));
};
const open = async (page, symbol='C') => {
  await page.locator('#element-search').fill(symbol);await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.atomAtlas?.diagnostics().triangles > 0);
};
const newPage = async options => {
  const page = await browser.newPage(options);
  page.on('pageerror', e => receipt.errors.push(e.message));
  page.on('console', m => {if (m.type() === 'error') receipt.consoleErrors.push(m.text());});
  await page.goto(base + 'atoms.html');return page;
};
const cases = {
  async allElements() {
    const page = await newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const results = [];
    const records = path.join(output,'all-elements.jsonl');await fs.writeFile(records,'');
    for (let z=1;z<=118;z++) {
      await open(page,String(z));
      const before = await diagnostics(page);
      await page.waitForFunction(previous => {
        const d = window.atomAtlas.diagnostics();
        return d.time > previous.time + .025 && JSON.stringify(d.particles.electrons) !== JSON.stringify(previous.particles.electrons);
      }, before);
      const after = await diagnostics(page);
      assert.equal(after.number,z);assert.ok(after.webgl && after.triangles > 0);
      stillCamera(after.camera,before.camera);assert.equal(after.display.cloud,false);
      if ([1,6,26,79,92,118].includes(z)) await page.screenshot({path:path.join(output,`teaching-mobile-${z}.png`)});
      await page.locator('#atom-close').click();await page.waitForFunction(() => !window.atomAtlas.diagnostics().opened);
      assert.equal((await diagnostics(page)).geometries,0);
      const result = {number:z,timeDelta:after.time-before.time,gpu:after.gpu,geometries:after.geometries,triangles:after.triangles};
      results.push(result);await fs.appendFile(records,JSON.stringify(result)+'\n');
    }
    assert.equal(new Set(results.map(r=>r.number)).size,118);
    assert.equal((await fs.readFile(records,'utf8')).trim().split('\n').map(JSON.parse).length,118);
    receipt.checks.push({name:'all-elements-animated-mobile',results});await page.close();
  },
  async lifecycle() {
    const page = await newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    await open(page,'Fe');
    const stopped = await diagnostics(page);assert.equal(stopped.animating,false);assert.equal(stopped.rotating,false);
    await page.waitForTimeout(250);assert.deepEqual((await diagnostics(page)).particles,stopped.particles);
    await page.locator('#atom-animation').click();await page.waitForTimeout(180);
    assert.notDeepEqual((await diagnostics(page)).particles,stopped.particles,'reduced-motion user can explicitly opt in');
    await page.evaluate(() => {window.motionEvents = [];window.motionProbe = matchMedia('(prefers-reduced-motion: reduce)');window.motionProbe.addEventListener('change', e => window.motionEvents.push(e.matches));});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(() => window.motionEvents.includes(false));
    await page.locator('#atom-rotate').click();
    await page.waitForFunction(before => Math.abs(window.atomAtlas.diagnostics().camera[0] - before[0]) > .001,stopped.camera);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => window.motionEvents.includes(true));
    const preferenceStop = await diagnostics(page);
    receipt.motionPreferenceEvents = await page.evaluate(() => window.motionEvents);
    assert.equal(preferenceStop.animating,false,'new reduced-motion preference stops existing animation');
    assert.equal(preferenceStop.rotating,false);
    await page.waitForTimeout(250);
    stillCamera((await diagnostics(page)).camera,preferenceStop.camera);
    assert.deepEqual((await diagnostics(page)).particles,preferenceStop.particles);
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(80);
    assert.equal((await diagnostics(page)).animating,false,'clearing preference is not consent to restart');
    await page.locator('#atom-animation').click();await page.locator('#atom-cloud').click();
    await page.locator('#atom-caveat').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.atomAtlas.diagnostics().visible === false);
    const offscreen = await diagnostics(page);await page.waitForTimeout(250);
    const stillOffscreen = await diagnostics(page);
    assert.equal(stillOffscreen.time,offscreen.time);assert.equal(stillOffscreen.renderFrames,offscreen.renderFrames);
    assert.equal(stillOffscreen.pendingFrame,false,'offscreen has no scheduled animation loop');
    await page.locator('#atom-viewport').scrollIntoViewIfNeeded();
    await page.waitForFunction(t => window.atomAtlas.diagnostics().time > t,offscreen.time);
    // Synthetic visibility signal tests the page-handler contract; real scrolling above tests IntersectionObserver.
    await page.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    const hidden = await diagnostics(page);await page.waitForTimeout(200);
    assert.equal((await diagnostics(page)).time,hidden.time);assert.equal((await diagnostics(page)).pendingFrame,false);
    await page.evaluate(() => {delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForFunction(t => window.atomAtlas.diagnostics().time > t,hidden.time);
    assert.ok((await diagnostics(page)).time - hidden.time < .15,'resume has no hidden-time catch-up');
    await page.locator('#atom-close').click();await page.waitForFunction(() => !window.atomAtlas.diagnostics().opened);
    const closed = await diagnostics(page);await page.waitForTimeout(180);
    assert.equal(closed.geometries,0);assert.equal(closed.pendingFrame,false);
    assert.equal((await diagnostics(page)).renderFrames,closed.renderFrames);
    const cycles = [];
    for (let i=0;i<12;i++) {
      await open(page,['H','C','Fe','Au','U','Og'][i%6]);await page.waitForTimeout(70);
      const d = await diagnostics(page);assert.ok(d.geometries <= 11 && d.triangles > 0);assert.equal(d.display.cloud,true);
      await page.locator('#atom-close').click();await page.waitForFunction(() => !window.atomAtlas.diagnostics().opened);
      const disposed = await diagnostics(page);assert.equal(disposed.geometries,0);assert.equal(disposed.pendingFrame,false);
      cycles.push({number:d.number,geometries:d.geometries,closedGeometries:disposed.geometries});
    }
    await open(page,'C');
    await page.evaluate(() => {document.querySelector('#atom-dialog').close();document.querySelector('[data-element="79"]').click();});
    await page.waitForTimeout(100);assert.ok((await diagnostics(page)).triangles > 0);assert.equal((await diagnostics(page)).opened,true);
    await page.evaluate(() => document.querySelector('#atom-viewport canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(() => !window.atomAtlas.diagnostics().webgl);
    const lost = await diagnostics(page);assert.equal(lost.animating,false);assert.equal(lost.rotating,false);assert.equal(lost.pendingFrame,false);assert.equal(lost.geometries,0);
    assert.equal(await page.locator('[data-atom-control]:not(:disabled)').count(),0);
    await page.locator('#atom-close').click();
    await page.locator('#element-search').fill('Og');await page.keyboard.press('Enter');
    assert.equal(await page.locator('#atom-name').innerText(),'Oganesson');
    assert.match(await page.locator('#atom-status').innerText(),/Reading mode/);
    await page.screenshot({path:path.join(output,'context-loss-reading.png')});
    receipt.checks.push({name:'lifecycle',stopped,preferenceStop,offscreen,hidden,closed,cycles,lost});await page.close();
  },
  async layers() {
    for (const width of [390,320,1440]) {
      const page = await newPage({viewport:{width,height:width === 1440 ? 1000 : 844},hasTouch:width < 700,isMobile:width < 700,reducedMotion:'reduce'});
      await open(page,'Au');
      assert.equal(await page.locator('#atom-cloud').count(),1, 'optional cloud control exists');
      assert.equal(await page.locator('#atom-cloud').getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('#atom-particles').getAttribute('aria-pressed'),'true');
      const canvas = page.locator('#atom-viewport canvas');
      const original = hash(await canvas.screenshot());
      const key = await page.locator('.particle-key').boundingBox(), box = await canvas.boundingBox();
      assert.ok(key.y >= box.y + box.height && key.y - (box.y + box.height) < 35, 'particle legend stays immediately below canvas, including phones');
      assert.ok(key.y + key.height < 844 || width === 1440);
      for (const id of ['atom-animation','atom-cloud','atom-particles','atom-nucleus']) {
        const button = await page.locator('#'+id).boundingBox();assert.ok(button.width >= 44 && button.height >= 44);
      }
      await page.locator('#atom-cloud').click();
      const hybrid = hash(await canvas.screenshot());assert.notEqual(hybrid,original,'cloud really renders');
      assert.equal((await diagnostics(page)).display.cloud,true);
      await page.screenshot({path:path.join(output,`hybrid-${width}.png`)});
      await page.locator('#atom-particles').click();assert.notEqual(hash(await canvas.screenshot()),hybrid,'particle toggle changes GPU output');
      await page.locator('#atom-particles').click();await page.locator('#atom-cloud').click();
      const before = await diagnostics(page);await page.locator('#atom-nucleus').click();
      const after = await diagnostics(page);stillCamera(after.camera,before.camera);assert.deepEqual(after.particles,before.particles);
      assert.equal(after.display.nucleus,true);assert.notEqual(hash(await canvas.screenshot()),original,'emphasis visibly enlarges nucleus without moving electron shells');
      await page.screenshot({path:path.join(output,`nucleus-${width}.png`)});
      await page.locator('#atom-nucleus').click();
      assert.match(await page.locator('#atom-caveat').innerText(),/qualitative.*not.*wavefunction/i);
      assert.match(await page.locator('#atom-status').innerText(),/not literal.*trajector/i);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      receipt.checks.push({name:'layers',width,before,after,original,hybrid});await page.close();
    }
  },
  async motion() {
    for (const width of [1440,390]) {
    const page = await newPage({viewport:{width,height:width === 1440 ? 1000 : 844},hasTouch:width === 390,isMobile:width === 390});await open(page);
    const before = await diagnostics(page);
    assert.equal(before.animating, true, 'teaching particles animate by default');
    assert.equal(before.rotating, false, 'particle motion does not rely on default camera rotation');
    assert.doesNotMatch(before.gpu, /swiftshader|software/i);
    const canvas = page.locator('#atom-viewport canvas');
    const image1 = await canvas.screenshot({path:path.join(output,`motion-${width}-t0.png`)});
    await page.waitForTimeout(700);const after = await diagnostics(page);
    const image2 = await canvas.screenshot({path:path.join(output,`motion-${width}-t1.png`)});
    stillCamera(after.camera, before.camera);
    for (const name of ['electrons','protons','neutrons']) assert.notDeepEqual(after.particles[name], before.particles[name], `${name} really move`);
    assert.notEqual(hash(image1),hash(image2),'rendered appearance changes at a fixed camera');
    const motionPixels = await pixelDifference(page,image1,image2);
    assert.ok(motionPixels.changed > 100 && motionPixels.maximum > 10,'substantial marker movement, not compositor noise');
    await page.locator('#atom-animation').click();
    assert.equal(await page.locator('#atom-animation').getAttribute('aria-pressed'), 'false');
    const held = await diagnostics(page), imageHeld = await canvas.screenshot({path:path.join(output,`paused-${width}-t0.png`)});
    await page.waitForTimeout(600);
    assert.deepEqual((await diagnostics(page)).particles, held.particles, 'pause holds actual instance positions');
    assert.equal((await diagnostics(page)).time, held.time);
    const imageLater = await canvas.screenshot({path:path.join(output,`paused-${width}-t1.png`)});
    const pausePixels = await pixelDifference(page,imageHeld,imageLater);
    await fs.writeFile(path.join(output,`pause-${width}.json`), JSON.stringify({held,later:await diagnostics(page),pausePixels,layout:await canvas.evaluate(el => ({canvas:el.getBoundingClientRect().toJSON(),scroll:document.querySelector('#atom-dialog').scrollTop,active:document.activeElement.id,focus:el.matches(':focus-visible')}))},null,2));
    heldPixels(pausePixels);
    await page.locator('#atom-rotate').click();await page.waitForTimeout(300);
    const rotated = await diagnostics(page);
    assert.notDeepEqual(rotated.camera, held.camera);
    assert.deepEqual(rotated.particles, held.particles, 'camera rotation does not unpause particles');
    await page.locator('#atom-rotate').click();await page.locator('#atom-reset').click();
    await page.locator('#atom-animation').click();await page.waitForTimeout(200);
    assert.ok((await diagnostics(page)).time > held.time);
    receipt.checks.push({name:'motion',width,before,after,held,rotated,motionPixels,pausePixels,imageHashes:[hash(image1),hash(image2)]});
    await page.screenshot({path:path.join(output,`teaching-motion-${width}.png`)});
    await page.locator('#atom-cloud').click();await page.locator('#atom-particles').click();
    const cloud1 = hash(await canvas.screenshot());await page.waitForTimeout(600);
    assert.notEqual(hash(await canvas.screenshot()),cloud1,'cloud glow varies at a fixed camera with particles hidden');
    await page.locator('#atom-animation').click();
    const cloudHeld = await canvas.screenshot();await page.waitForTimeout(300);
    heldPixels(await pixelDifference(page,cloudHeld,await canvas.screenshot()));
    await page.locator('#atom-close').click();await page.waitForFunction(() => !window.atomAtlas.diagnostics().opened);
    // The deliberate pause and display choices persist across element changes.
    await page.locator('#element-search').fill('Ne');await page.keyboard.press('Enter');
    assert.equal((await diagnostics(page)).animating,false);
    assert.equal((await diagnostics(page)).display.cloud,true);
    assert.equal((await diagnostics(page)).display.particles,false);
    await page.close();
    }
  },
};
try {
  for (const name of (process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(cases))) await cases[name]();
  assert.deepEqual(receipt.errors,[]);assert.deepEqual(receipt.consoleErrors,[]);
  receipt.status = 'passed';
} catch (error) {receipt.status = 'failed';receipt.failure = error.stack;throw error;}
finally {
  await fs.writeFile(path.join(output,`browser-${process.argv.slice(2).join('-') || 'all'}.json`), JSON.stringify(receipt,null,2));
  await browser.close();await new Promise(resolve => server.close(resolve));
}
console.log(`Animation GPU browser: ${receipt.checks.length} checks passed`);
