import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser = await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal']});
const report=[];
try {
  for(const [width,height] of [[320,568],[390,844],[844,390],[1024,768]]) {
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1.5,isMobile:width<900,hasTouch:true,reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:4175');
    await page.waitForFunction(()=>window.cellAtlas?.ready);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} has no horizontal overflow`);
    const undersized=await page.locator('button:visible').evaluateAll(buttons=>buttons.map(b=>({name:b.getAttribute('aria-label')||b.textContent.trim(),r:b.getBoundingClientRect()})).filter(b=>b.r.width<44||b.r.height<44).map(b=>({name:b.name,width:b.r.width,height:b.r.height})));
    assert.deepEqual(undersized,[],`${width}: all visible buttons have 44px targets`);
    assert.equal(await page.evaluate(()=>document.getElementById('app').offsetHeight <= innerHeight),true,`${width}: app fits dynamic viewport height`);
    const before=await page.evaluate(()=>window.cellAtlas.diagnostics().camera);
    const frame=await page.locator('canvas').boundingBox();
    const horizontalSpan=2*Math.tan(39*Math.PI/360)*Math.hypot(...before)*frame.width/frame.height;
    assert.ok(horizontalSpan>=15.4,`${width}: complete 14.4-unit cell has a framing margin`);
    const canvas=page.locator('canvas');
    await canvas.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(120);
    const after=await page.evaluate(()=>window.cellAtlas.diagnostics().camera);
    assert.notDeepEqual(after,before,'keyboard orbit moves the actual camera');
    await page.getByRole('button',{name:'Field notes & references'}).click();
    assert.ok(await page.locator('#detail-sources a').count()>0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#details-dialog').isVisible(),false);
    await page.screenshot({path:`evidence/responsive-${width}x${height}.png`});
    report.push({width,height,targets:'>=44px',overflow:false,keyboardOrbit:true,fieldNotes:true});
    await page.close();
  }
  console.log(JSON.stringify(report,null,2));
} finally {await fs.writeFile('evidence/responsive-results.json',JSON.stringify(report,null,2));await browser.close();}
