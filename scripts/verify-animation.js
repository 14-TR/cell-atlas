// Re-run the unchanged browser suites without overwriting historical receipts.
// Own an ephemeral loopback listener and verify built entry identities first.
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root = path.resolve(import.meta.dirname,'..'), dist = path.join(root,'dist');
const output = path.join(root,'evidence/animation');await fs.mkdir(output,{recursive:true});
const run = await fs.mkdtemp(path.join(output,'regressions-'));
await fs.mkdir(path.join(run,'evidence'));await fs.symlink(dist,path.join(run,'dist'));
const server = http.createServer(async (req,res) => {
  try {
    const file = path.resolve(dist, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(dist + path.sep)) {res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const hash = data => createHash('sha256').update(data).digest('hex');
const receipt = {base,run,entries:[],tests:[]};
try {
  for (const name of ['index.html','atoms.html']) {
    const expected = hash(await fs.readFile(path.join(dist,name)));
    const actual = hash(Buffer.from(await (await fetch(`${base}/${name}`)).arrayBuffer()));
    assert.equal(actual,expected);receipt.entries.push({name,sha256:actual});
  }
  const scripts = ['expansion-atoms.js','expansion-lifecycle.js','expansion-accessibility.js','expansion-production.js','expansion-cells.js',
    'smoke.js','models.js','model-interactions.js','responsive.js','gestures.js','usability.js','production.js'];
  const requested = process.argv.slice(2);
  assert.ok(requested.every(name => scripts.includes(name)), 'only registered regression suites are accepted');
  for (const script of (requested.length ? requested : scripts)) {
    const result = await new Promise(resolve => {
      const child = spawn(process.execPath,[path.join(root,'tests',script)],{cwd:run,env:{...process.env,BASE_URL:base},timeout:300000});
      let stdout = '',stderr = '';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
      child.on('error',error => resolve({code:null,error:error.message,stdout,stderr}));
      child.on('close',(code,signal) => resolve({code,signal,stdout,stderr}));
    });
    await fs.writeFile(path.join(run,script+'.txt'),result.stdout+'\n'+result.stderr);
    receipt.tests.push({script,code:result.code,signal:result.signal,error:result.error});
    await fs.writeFile(path.join(run,'results.json'),JSON.stringify(receipt,null,2));
    console.log(`${script}: ${result.code}`);
    if (result.code !== 0) {console.error(result.stdout,result.stderr);process.exitCode = 1;}
  }
} finally {
  await new Promise(resolve=>server.close(resolve));
  receipt.serverClosed = true;
  await fs.writeFile(path.join(run,'results.json'),JSON.stringify(receipt,null,2));
  console.log(`Regression receipts: ${run}`);
}
