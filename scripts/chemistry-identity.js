import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function sourceManifest(root=process.cwd()) {
  const files=[];
  async function walk(relative) {
    const stat=await fs.stat(path.join(root,relative));
    if(stat.isDirectory())for(const name of await fs.readdir(path.join(root,relative)))await walk(path.posix.join(relative,name));
    else files.push(relative);
  }
  for(const name of ['src','tests','scripts','public','.github','index.html','atoms.html','chemistry.html','package.json','package-lock.json','vite.config.js','CHEMISTRY-SOURCES.md']) {
    try{await walk(name);}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  const rows=[];for(const name of files.sort())rows.push({path:name,sha256:sha256(await fs.readFile(path.join(root,name)))});
  const text=rows.map(r=>`${r.sha256}  ${r.path}\n`).join('');
  return {sourceIdentity:sha256(text),files:rows};
}
