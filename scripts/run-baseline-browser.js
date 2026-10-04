import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),run=path.join(root,'evidence/expansion/baseline-run');
fs.mkdirSync(path.join(run,'evidence'),{recursive:true});
if(!fs.existsSync(path.join(run,'dist')))fs.symlinkSync(path.join(root,'dist'),path.join(run,'dist'));
const results=[];
for(const script of ['smoke.js','models.js','model-interactions.js','responsive.js','gestures.js','usability.js','production.js']){
  const result=spawnSync(process.execPath,[path.join(root,'tests',script)],{cwd:run,env:{...process.env,BASE_URL:process.env.BASE_URL||'http://127.0.0.1:4175'},encoding:'utf8',timeout:300000});
  fs.writeFileSync(path.join(run,script+'.txt'),result.stdout+'\n'+result.stderr);
  results.push({script,status:result.status,error:result.error?.message});console.log(script,result.status,result.error?.message||'');
  fs.writeFileSync(path.join(run,'results.json'),JSON.stringify(results,null,2));
  if(result.status!==0){console.error(result.stdout,result.stderr);process.exitCode=1;}
}
