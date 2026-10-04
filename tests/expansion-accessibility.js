import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('evidence/expansion',{recursive:true});
const base=process.env.BASE_URL||'http://127.0.0.1:4175';
const browser=await chromium.launch({channel:'chromium',args:['--use-angle=metal']});
const results=[];
try {
  for(const [width,height] of [[320,568],[390,844],[568,320],[1024,768]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<900,reducedMotion:'reduce'});
    await page.goto(base+'/atoms.html');await page.waitForFunction(()=>window.atomAtlas?.ready);
    const small=await page.locator('[data-element]').evaluateAll(bs=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44;}).map(b=>b.dataset.element));assert.deepEqual(small,[]);
    await page.locator('[data-element="1"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.element),'2');
    await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.dataset.element),'10');
    await page.keyboard.press('Enter');assert.equal(await page.locator('#atom-name').innerText(),'Neon');
    assert.match(await page.locator('#atom-status').innerText(),/not to scale/,'model warning is adjacent to the canvas');
    await page.locator('#atom-caveat').scrollIntoViewIfNeeded();
    const close=await page.locator('#atom-close').boundingBox(),dialog=await page.locator('#atom-dialog').boundingBox();
    assert.ok(close.y>=dialog.y&&close.y+close.height<=dialog.y+dialog.height,'close remains in view after scrolling notes');
    await page.keyboard.press('Escape');await page.waitForTimeout(40);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.element),'10','focus restored to exact table opener');
    await page.locator('#element-search').fill(' gold ');await page.keyboard.press('Enter');assert.equal(await page.locator('#atom-name').innerText(),'Gold');await page.keyboard.press('Escape');
    await page.locator('#element-search').fill('103');await page.keyboard.press('Enter');assert.match(await page.locator('#configuration-note').innerText(),/NIST.*7p/);await page.keyboard.press('Escape');
    await page.locator('#element-search').fill('<script>');assert.equal(await page.locator('#search-results button').count(),0);await page.locator('#element-search').fill('');
    const last=page.locator('[data-element="118"]');await last.scrollIntoViewIfNeeded();await last.click();assert.equal(await page.locator('#atom-name').innerText(),'Oganesson');await page.keyboard.press('Escape');
    await page.locator('[data-element="103"]').scrollIntoViewIfNeeded();await page.locator('[data-element="103"]').click();assert.equal(await page.locator('#atom-name').innerText(),'Lawrencium');await page.keyboard.press('Escape');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    results.push({width,height,status:'passed',targets:'>=44px',keyboard:true,scrolling:true,focusRestoration:true});await page.close();
  }
}finally{await fs.writeFile('evidence/expansion/accessibility.json',JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results,null,2));
