import {parseFormula,compositionKey,formatFormula} from './formula.js';
const endpoint='https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/';
export const LOOKUP_LIMIT=12;
export async function lookupFormula(formula,{fetcher=fetch,signal,timeout=10000}={}) {
  const aborter=new AbortController(),cancel=()=>aborter.abort();
  let timer,abortListener;
  try {
    if(signal?.aborted)return {status:'cancelled',candidates:[]};
    signal?.addEventListener('abort',cancel,{once:true});
    const parsed=parseFormula(formula);if(parsed.charge)throw new Error('Neutral formulas only.');
    const key=compositionKey(parsed),query=formatFormula(parsed.atoms);
    const deadline=new Promise((_,reject)=>{
      abortListener=()=>reject(new Error(signal?.aborted?'Cancelled':'Lookup timed out.'));
      aborter.signal.addEventListener('abort',abortListener,{once:true});
      timer=setTimeout(cancel,timeout);
    });
    async function request(url) {
      const response=await fetcher(url,{signal:aborter.signal,credentials:'omit',mode:'cors',headers:{Accept:'application/json'}});
      if(response.status===404)return null;
      if(!response.ok)throw new Error(`PubChem returned HTTP ${response.status}.`);
      return response.json();
    }
    const operation=(async()=>{
      const search=await request(endpoint+'fastformula/'+encodeURIComponent(query)+`/cids/JSON?MaxRecords=${LOOKUP_LIMIT}`);
      if(!search)return {status:'not-found',candidates:[]};
      const list=search.IdentifierList?.CID;
      if(!Array.isArray(list)||list.some(id=>!Number.isSafeInteger(id)||id<1))throw new Error('Unexpected PubChem response.');
      const ids=[...new Set(list)].slice(0,LOOKUP_LIMIT);
      if(!ids.length)return {status:'not-found',candidates:[]};
      const properties=await request(endpoint+'cid/'+ids.join(',')+'/property/MolecularFormula,IUPACName/JSON');
      const rows=properties?.PropertyTable?.Properties;
      if(!Array.isArray(rows))throw new Error('Formula verification unavailable.');
      const candidates=[];
      for(const row of rows) {
        if(!ids.includes(row.CID)||candidates.some(c=>c.cid===row.CID)||typeof row.IUPACName!=='string')continue;
        try {if(compositionKey(row.MolecularFormula)!==key)continue;}catch{continue;}
        candidates.push({cid:row.CID,name:row.IUPACName.slice(0,180),formula:row.MolecularFormula,sourceUrl:'https://pubchem.ncbi.nlm.nih.gov/compound/'+row.CID});
      }
      return {status:candidates.length?'found':'not-found',candidates,uniqueStructure:false,exhaustive:false,limit:LOOKUP_LIMIT};
    })();
    return await Promise.race([operation,deadline]);
  }catch(error){return {status:signal?.aborted?'cancelled':'unavailable',candidates:[],message:error.message};}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);if(abortListener)aborter.signal.removeEventListener('abort',abortListener);}
}
