import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function serve() {
  const root=path.resolve('dist');
  const server=http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');
      if(!url.pathname.startsWith('/cell-atlas/')){res.writeHead(404);res.end();return;}
      const file=path.resolve(root,decodeURIComponent(url.pathname.slice(12)||'index.html'));
      if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
      res.end(await fs.readFile(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {base:`http://127.0.0.1:${server.address().port}/cell-atlas/`,close:()=>new Promise(resolve=>server.close(resolve))};
}
