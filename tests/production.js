import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root=path.resolve('dist');
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!pathname.startsWith('/cell-atlas/')){res.writeHead(404);res.end();return;}
    const relative=pathname.slice('/cell-atlas/'.length)||'index.html';
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal']});
const report={errors:[]};
try {
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 page.on('pageerror',e=>report.errors.push(e.message));
 const response=await page.goto(`http://127.0.0.1:${server.address().port}/cell-atlas/`);
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.cellAtlas?.ready);
 report.render=await page.evaluate(()=>window.cellAtlas.diagnostics());
 assert.equal(report.render.webgl,true);
 assert.deepEqual(report.errors,[]);
 await page.screenshot({path:'evidence/production-mobile.png'});
 report.status='passed';report.subpath='/cell-atlas/';
 console.log(JSON.stringify(report,null,2));
}finally{await fs.writeFile('evidence/production-results.json',JSON.stringify(report,null,2));await browser.close();server.close();}
