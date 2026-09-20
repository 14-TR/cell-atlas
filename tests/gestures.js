import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal']});
const evidence={};
try {
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4175'); await page.waitForFunction(()=>window.cellAtlas?.ready);
  const canvas=page.locator('canvas'), box=await canvas.boundingBox(), cdp=await page.context().newCDPSession(page);
  const cx=box.x+box.width/2, cy=box.y+box.height/2;
  const position=()=>page.evaluate(()=>window.cellAtlas.diagnostics().camera);
  const gesture=async (start,end)=>{
    const before=await position();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:start});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:end});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(250);
    const after=await position();assert.notDeepEqual(after,before);return {before,after};
  };
  evidence.touchOrbit=await gesture([{x:cx,y:cy,id:1}],[{x:cx+45,y:cy-20,id:1}]);
  evidence.pinchZoom=await gesture([{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}],[{x:cx-60,y:cy,id:1},{x:cx+60,y:cy,id:2}]);
  evidence.twoFingerPan=await gesture([{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}],[{x:cx-10,y:cy+30,id:1},{x:cx+50,y:cy+30,id:2}]);
  await page.getByRole('button',{name:'Whole cell — reset view',exact:true}).click();
  await page.waitForTimeout(100);
  for(const [u,v] of [[.72,.7],[.75,.55],[.62,.34],[.3,.7],[.5,.5]]) {
    await page.touchscreen.tap(box.x+box.width*u,box.y+box.height*v);
    const selected=await page.evaluate(()=>window.cellAtlas.diagnostics().selected);
    if(selected!=='nucleus'){evidence.tapSelection=selected;break;}
  }
  assert.ok(evidence.tapSelection,'tapping the real rendered cell selects a structure');
  await page.getByRole('button',{name:'Resume rotation',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.cellAtlas.diagnostics().rotating),true);
  await page.getByRole('button',{name:'Pause rotation',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.cellAtlas.diagnostics().rotating),false);
  evidence.rotationControl=true;
  await page.getByRole('button',{name:'View settings',exact:true}).click();
  await page.locator('#labels-toggle').uncheck();
  await page.getByRole('button',{name:'Close view settings'}).click();
  assert.equal(await page.locator('.scene-label:visible').count(),0);
  evidence.labelToggle=true;
  await page.getByRole('button',{name:'Structures',exact:true}).click();
  await page.screenshot({path:'evidence/mobile-structure-index.png'});
  console.log(JSON.stringify(evidence,null,2));
} finally {await fs.writeFile('evidence/gesture-results.json',JSON.stringify(evidence,null,2));await browser.close();}
