import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('evidence/expansion',{recursive:true});
const base=process.env.BASE_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({channel:'chromium',args:['--use-angle=metal']});
const results=[];
try {
  for(const [w,h] of [[1440,1000],[390,844],[320,568],[844,390],[568,320]]){
    const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<900,hasTouch:w<900,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);const link=page.getByRole('link',{name:'Periodic table',exact:true});
    assert.equal(await link.count(),1,'cells link to the periodic table');await link.click();
    await page.waitForFunction(()=>window.atomAtlas?.ready);
    assert.equal(await page.locator('[data-element]').count(),118);
    assert.ok(await page.locator('#table-scroll').evaluate(el=>el.scrollWidth>el.clientWidth) || w>1200);
    for(const [symbol,z] of [['H',1],['C',6],['Fe',26],['Au',79],['U',92],['Og',118]]){
      await page.locator('#element-search').fill(symbol);await page.keyboard.press('Enter');
      await page.waitForFunction(z=>window.atomAtlas.diagnostics().number===z,z);
      const d=await page.evaluate(()=>window.atomAtlas.diagnostics());
      assert.ok(d.webgl&&d.triangles>0);assert.doesNotMatch(d.gpu,/swiftshader|software/i);
      assert.equal(await page.locator('#atom-dialog').evaluate(el=>el.open),true);
      assert.match(await page.locator('#atom-counts').innerText(),new RegExp(`${z} protons`));
      assert.match(await page.locator('#atom-caveat').innerText(),/not.*literal.*trajector|not.*electron trajectories/i);
      assert.match(await page.locator('#isotope-note').innerText(),/isotope.*neutron|neutron.*isotope/i);
      const canvas=page.locator('#atom-viewport canvas');await canvas.focus();
      await page.keyboard.press('ArrowRight');await page.keyboard.press('+');
      const after=await page.evaluate(()=>window.atomAtlas.diagnostics());assert.notDeepEqual(after.camera,d.camera);
      if(['C','Au','Og'].includes(symbol))await page.screenshot({path:`evidence/expansion/atom-${symbol}-${w}.png`});
      await page.keyboard.press('Escape');assert.equal(await page.locator('#atom-dialog').evaluate(el=>el.open),false);
      results.push({w,h,symbol,render:d});
    }
    await page.locator('#element-search').fill('no such element');assert.equal(await page.locator('#search-results button').count(),0);assert.match(await page.locator('#search-status').innerText(),/no element/i);
    await page.locator('#element-search').fill('');
    // Every physical button, including the detached f-block, selects the matching atom.
    if(w===1440)for(let z=1;z<=118;z++){
      await page.locator(`[data-element="${z}"]`).click();
      assert.equal((await page.evaluate(()=>window.atomAtlas.diagnostics())).number,z);
      await page.keyboard.press('Escape');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`evidence/expansion/table-${w}.png`,fullPage:true});
    assert.deepEqual(errors,[]);await context.close();
  }
} finally {await fs.writeFile('evidence/expansion/atoms-browser.json',JSON.stringify(results,null,2));await browser.close();}
console.log(`${results.length} atom/viewport cases and all 118 buttons passed`);
