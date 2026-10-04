import {$,make} from './dom.js';
import {reactions,findReactions,equationText} from './reactions.js';
import {validateReaction,calculateYield} from './balance.js';
export function initializeReactions(onScene) {
  let reaction=null,quantities=[];
  const root=$('reaction-controls');
  const library=make('select',undefined,{id:'reaction-choice'});
  for(const r of reactions)library.append(make('option',`${r.name} · ${r.category}`,{value:r.id}));
  root.append(make('label','Browse all supported equations',{for:'reaction-choice'}),library);
  const pickers=make('div',undefined,{class:'reaction-filter'});
  const formulas=[...new Set(reactions.flatMap(r=>r.reactants.map(s=>s.formula)))].sort();
  for(const [id,label] of [['reactant-a','First reactant'],['reactant-b','Second (or none)']]) {
    const wrap=make('div'),select=make('select',undefined,{id});
    if(id==='reactant-b')select.append(make('option','None · decomposition',{value:''}));
    for(const f of formulas)select.append(make('option',f,{value:f}));
    wrap.append(make('label',label,{for:id}),select);pickers.append(wrap);
  }
  const find=make('button','Find a supported equation',{id:'find-reaction'});
  root.append(pickers,make('p','Reactant forms matter: Na is metal; Cl2, H2 and O2 are diatomic molecules. Choosing atoms in the builder is a different activity.',{class:'micro'}),find,make('p','',{id:'reaction-message',role:'status'}),make('div',undefined,{id:'reaction-detail'}));
  function updateResults() {
    $('reaction-results')?.remove();$('reaction-message').textContent='';
    try {
      quantities=Array.from(root.querySelectorAll('[data-amount]'),input=>input.value===''?NaN:Number(input.value));
      const result=calculateYield(reaction,quantities),view=make('article',undefined,{id:'reaction-results',class:'reaction-result'});
      view.append(make('h3',result.extent===0?'No conversion: a required reactant is absent.':'Ideal stoichiometric limit'));
      const limiting=result.limiting.map(i=>reaction.reactants[i].formula).join(' and ');
      view.append(make('p',`${result.limiting.length===reaction.reactants.length?'Co-limiting':'Limiting reactant'}: ${limiting}.`));
      const columns=make('div',undefined,{class:'result-columns'}),products=make('div'),leftovers=make('div');
      products.append(make('h4','Supported products'));leftovers.append(make('h4','Reactants left over'));
      const pList=make('ul'),lList=make('ul');
      reaction.products.forEach((s,i)=>pList.append(make('li',`${result.produced[i]} virtual mol ${s.formula}`)));
      reaction.reactants.forEach((s,i)=>lList.append(make('li',`${result.remaining[i]} virtual mol ${s.formula} remaining`)));
      products.append(pList);leftovers.append(lList);columns.append(products,leftovers);view.append(columns,make('p','Theoretical amounts only: complete conversion of the limiting reactant is assumed. Actual yield, equilibrium and conditions are not simulated.',{class:'micro'}));
      $('reaction-detail').append(view);onScene({reaction,quantities:[...quantities],result});
    }catch(error){$('reaction-message').textContent=error.message;onScene(null);}
  }
  function select(record) {
    reaction=record;library.value=record.id;$('reactant-a').value=record.reactants[0].formula;$('reactant-b').value=record.reactants[1]?.formula||'';
    $('reaction-message').textContent='';const detail=$('reaction-detail');detail.replaceChildren();
    detail.append(make('h3',record.name),make('p',equationText(record),{id:'reaction-equation',class:'equation'}),make('p',record.note,{class:'reaction-note'}));
    const source=make('a',`Equation source · ${record.sourceId} ↗`,{id:'reaction-source',class:'reaction-source',href:record.sourceUrl,target:'_blank',rel:'noopener noreferrer'});detail.append(source);
    const amounts=make('div',undefined,{class:'amounts'});detail.append(make('p','Virtual mol amounts · 0–100. These are screen-only quantities, not experimental instructions.',{class:'micro'}));
    record.reactants.forEach((s,i)=>{
      const id='amount-'+i,label=make('label',`${s.formula} (virtual mol)`,{for:id}),input=make('input',undefined,{id,type:'number',min:'0',max:'100',step:'any',inputmode:'decimal','data-amount':i});
      input.value=s.coefficient;input.addEventListener('change',updateResults);label.append(input);amounts.append(label);
    });detail.append(amounts);
    const conservation=validateReaction(record),details=make('details',undefined,{id:'conservation'});
    details.append(make('summary','Atoms and charge conserved · inspect counts'));
    const table=make('table',undefined,{class:'balance-table'}),head=make('tr');
    for(const heading of ['Per balanced equation','Reactants','Products'])head.append(make('th',heading));table.append(head);
    for(const symbol of [...conservation.symbols,'Net charge']){const row=make('tr');row.append(make('th',symbol));for(const side of [conservation.left,conservation.right])row.append(make('td',symbol==='Net charge'?side.charge:side.atoms[symbol]));table.append(row);}details.append(table);detail.append(details);
    updateResults();
  }
  library.addEventListener('change',()=>select(reactions.find(r=>r.id===library.value)));
  find.addEventListener('click',()=>{
    const candidates=findReactions([$('reactant-a').value,$('reactant-b').value].filter(Boolean));
    if(candidates.length===1)select(candidates[0]);
    else {$('reaction-detail').replaceChildren();reaction=null;onScene(null);$('reaction-message').textContent=candidates.length?'Several supported equations share these reactants; choose a named equation in the library.':'No supported reaction for these reactants in this finite library. No products are predicted.';}
  });
  select(reactions[0]);
  return {current:()=>{
    if(!reaction)return null;
    try{return {reaction,quantities,result:calculateYield(reaction,quantities)};}catch{return null;}
  }};
}
