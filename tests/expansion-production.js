import http from 'node:http';
import fs from 'node:fs/promises';
await fs.mkdir('evidence/expansion',{recursive:true});
import path from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=path.resolve('dist'),results={errors:[],assets:[],models:[],atoms:[]};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/cell-atlas/')){res.writeHead(404);res.end();return;}
    const file=path.resolve(root,decodeURIComponent(url.pathname.slice('/cell-atlas/'.length)||'index.html'));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
    res.end(await fs.readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chromium',args:['--use-angle=metal']});
const base=`http://127.0.0.1:${server.address().port}/cell-atlas/`;
try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  page.on('pageerror',e=>results.errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base))results.assets.push({url:new URL(r.url()).pathname,status:r.status()});});
  await page.goto(base);await page.waitForFunction(()=>window.cellAtlas?.ready);
  for(const id of ['bacterium','neuron','red-blood-cell','mammalian','plant','fungal']){
    await page.locator('#cell-model').selectOption(id);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const d=await page.evaluate(()=>window.cellAtlas.diagnostics());assert.ok(d.webgl&&d.triangles>0);assert.equal(d.modelId,id);results.models.push({id,render:d});
  }
  await page.getByRole('link',{name:'Periodic table',exact:true}).click();assert.equal(page.url(),base+'atoms.html');await page.waitForFunction(()=>window.atomAtlas?.ready);
  assert.equal(await page.locator('[data-element]').count(),118);
  for(const z of [1,6,26,79,92,118]){
    await page.locator('#element-search').fill(String(z));await page.keyboard.press('Enter');
    const d=await page.evaluate(()=>window.atomAtlas.diagnostics());assert.ok(d.webgl&&d.triangles>0);assert.equal(d.number,z);results.atoms.push(d);await page.keyboard.press('Escape');
  }
  await page.screenshot({path:'evidence/expansion/production-table.png'});
  await page.getByRole('link',{name:'Cells',exact:true}).click();assert.equal(page.url(),base);await page.waitForFunction(()=>window.cellAtlas?.ready);
  await page.goto(base+'atoms.html?webgl=off');await page.locator('#element-search').fill('Og');await page.keyboard.press('Enter');assert.equal((await page.evaluate(()=>window.atomAtlas.diagnostics())).webgl,false);assert.equal(await page.locator('#atom-name').innerText(),'Oganesson');
  assert.deepEqual(results.errors,[]);assert.ok(results.assets.every(a=>a.status===200));results.status='passed';
}finally{await fs.writeFile('evidence/expansion/production.json',JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
console.log('Production /cell-atlas/ subpath: six cells, 118 buttons, six atom renders, navigation and fallback passed');
