import './style.css';
import {elements} from '../elements.js';
import {parseFormula,formatFormula,setAtomCount} from './formula.js';
import {compounds,coverage,matchComposition} from './catalog.js';
import {$,make} from './dom.js';
import {initializeReactions} from './reaction-controller.js';
import {reactions} from './reactions.js';
import {compoundScene,reactionScene} from './scene-model.js';
import {initializeObservation} from './observation-controller.js';
import {lookupFormula} from './lookup.js';
let lookupRequest=null,lookupGeneration=0;
const observation=initializeObservation();
window.chemistryLab={diagnostics:()=>observation.diagnostics()};
let mode='builder';
let atoms={},selected=null;
$('coverage').textContent=`${coverage.elements} elements · ${coverage.compounds} sourced compounds · ${coverage.formulas} exact formulas · works without a lookup`;
$('coverage-detail').textContent=`Offline composition coverage: ${coverage.compounds} compound records across ${coverage.formulas} distinct formulas. All ${coverage.elements} elements are selectable, but most combinations are not verified here.`;
for(const category of ['salt','oxide','acid','base','organic']) {
  const group=make('optgroup',undefined,{label:category});
  for(const c of compounds.filter(c=>c.category===category)) group.append(make('option',`${c.name} · ${c.formula}`,{value:c.id}));
  $('catalog').append(group);
}
function changeCount(symbol,count) {
  try {atoms=setAtomCount(atoms,symbol,count);$('builder-message').textContent='';refresh();}
  catch(error){$('builder-message').textContent=error.message;renderCounts();}
}
function renderElements() {
  const query=$('builder-search').value.trim().toLowerCase();
  const matches=elements.filter(e=>!query||e.symbol.toLowerCase()===query||String(e.number)===query||e.name.toLowerCase().includes(query));
  $('element-options').replaceChildren();
  for(const e of matches) {
    const button=make('button',e.symbol,{'data-element':e.symbol,'aria-label':`Add ${e.name} (${e.symbol})`});
    button.append(make('small',`${e.number} · ${e.name.slice(0,9)}`));
    button.addEventListener('click',()=>changeCount(e.symbol,(atoms[e.symbol]||0)+1));$('element-options').append(button);
  }
  $('element-status').textContent=`${matches.length} of ${elements.length} elements. Tap to add one atom.`;
}
function renderCounts() {
  $('composition-counts').replaceChildren();
  for(const [symbol,count] of Object.entries(atoms)) {
    const row=make('div',undefined,{class:'count-row'}),id='count-'+symbol;
    const input=make('input',undefined,{type:'number',min:'0',max:'99',step:'1',inputmode:'numeric',id,'data-count':symbol});input.value=count;
    input.addEventListener('change',()=>changeCount(symbol,input.value===''?NaN:Number(input.value)));
    const minus=make('button','−',{'aria-label':`Remove one ${symbol}`}),plus=make('button','+',{'aria-label':`Add one ${symbol}`});
    minus.addEventListener('click',()=>changeCount(symbol,count-1));plus.addEventListener('click',()=>changeCount(symbol,count+1));
    row.append(make('label',symbol,{for:id}),minus,input,plus);$('composition-counts').append(row);
  }
  if(!Object.keys(atoms).length)$('composition-counts').textContent='No atoms selected yet.';
}
function showSelection(record) {
  selected=record;
  if(mode==='builder')observation.show(compoundScene(atoms,record));
}
function refresh() {
  lookupRequest?.abort();lookupRequest=null;lookupGeneration++;
  renderCounts();selected=null;
  const formula=formatFormula(atoms),match=matchComposition(atoms);
  $('composition-formula').textContent=formula||'An empty workbench';
  $('matches').replaceChildren();$('lookup-status').textContent='';$('lookup-results').replaceChildren();
  $('lookup').disabled=!formula;$('pubchem-search').href='https://pubchem.ncbi.nlm.nih.gov/#query='+encodeURIComponent(formula);
  $('pubchem-search').hidden=!formula;
  $('match-summary').textContent=match.status==='empty'?'Add elements or choose a preset.':match.status==='unsupported'?'No verified offline match. This composition is unsupported here—not proof that a substance cannot exist.':match.status==='ambiguous'?`${match.candidates.length} catalog candidates share this formula. Isomers may differ; choose a named record to inspect. No unique structure is selected.`:`${match.candidates[0].name} — 1 verified catalog candidate. This is an identity/formula match, not a synthesis prediction.`;
  for(const c of match.candidates) {
    const item=make('div'),button=make('button',`${c.name} · ${c.formula}`);
    button.addEventListener('click',()=>showSelection(c));
    item.append(button,make('a',`PubChem CID ${c.cid} ↗`,{href:c.sourceUrl,target:'_blank',rel:'noopener noreferrer'}));$('matches').append(item);
  }
  showSelection(match.candidates.length===1?match.candidates[0]:null);
}
function useFormula(text) {
  try {
    const parsed=parseFormula(text.trim());if(parsed.charge)throw new Error('The builder accepts neutral compositions; charged species belong to sourced reactions.');
    let next={};for(const [symbol,count] of Object.entries(parsed.atoms))next=setAtomCount(next,symbol,count);
    atoms=next;$('builder-message').textContent='';refresh();
  }catch(error){$('builder-message').textContent=error.message;}
}
$('lookup').addEventListener('click',async()=>{
  lookupRequest?.abort();lookupRequest=new AbortController();const generation=++lookupGeneration;
  $('lookup').disabled=true;$('lookup-results').replaceChildren();$('lookup-status').textContent='Checking PubChem exact formula records… (10 second limit)';
  const result=await lookupFormula(formatFormula(atoms),{signal:lookupRequest.signal});
  if(generation!==lookupGeneration)return;
  $('lookup').disabled=false;
  if(result.status==='found'){
    $('lookup-status').textContent=`${result.candidates.length} verified exact-formula records returned (up to ${result.limit}; not exhaustive). Isomers, stereoisomers or other records may share a formula. No unique structure is inferred.`;
    for(const c of result.candidates)$('lookup-results').append(make('a',`${c.name} · ${c.formula} · CID ${c.cid} ↗`,{href:c.sourceUrl,target:'_blank',rel:'noopener noreferrer'}));
  }else if(result.status==='not-found')$('lookup-status').textContent='No verified exact-formula records returned. This does not prove the composition is impossible. Try the source search link.';
  else if(result.status!=='cancelled')$('lookup-status').textContent=`PubChem lookup unavailable. ${result.message||'The network request failed.'} Offline results are unchanged. Try again or open the source search link.`;
});
window.addEventListener('pagehide',()=>lookupRequest?.abort());
$('builder-search').addEventListener('input',renderElements);
$('formula-form').addEventListener('submit',event=>{event.preventDefault();useFormula($('formula-input').value);});
$('catalog').addEventListener('change',()=>{const c=compounds.find(c=>c.id===$('catalog').value);if(c)useFormula(c.formula);});
for(const preset of document.querySelectorAll('[data-preset]'))preset.addEventListener('click',()=>useFormula(preset.dataset.preset));
$('clear-composition').addEventListener('click',()=>{atoms={};refresh();});
function showReaction(value) {
  if(mode!=='reaction')return;
  observation.show(value?reactionScene(value.reaction,value.result.extent>0):{kind:'composition',atoms:[],bonds:[],labels:[],caption:'Unsupported or invalid reaction input. No products are predicted.'});
}
const reactionControls=initializeReactions(showReaction);
for(const target of ['builder','reaction'])$(target+'-tab').addEventListener('click',()=>{
  mode=target;
  for(const name of ['builder','reaction']){$(name+'-panel').hidden=name!==mode;$(name+'-tab').setAttribute('aria-pressed',String(name===mode));}
  if(mode==='reaction')showReaction(reactionControls.current());else showSelection(selected);
});
$('coverage').textContent+=` · ${reactions.length} supported reactions`;
$('coverage-detail').textContent+=` Reaction coverage: ${reactions.length} curated balanced equations.`;
renderElements();useFormula('NaCl');
