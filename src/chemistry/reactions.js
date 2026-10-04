import records from './reaction-records.json' with {type:'json'};
import {validateReaction} from './balance.js';
export const reactions=Object.freeze(records.map(r=>{
  if(!validateReaction(r).balanced)throw new Error('Invalid curated equation: '+r.id);
  return Object.freeze({...r,reactants:Object.freeze(r.reactants.map(Object.freeze)),products:Object.freeze(r.products.map(Object.freeze))});
}));
// Species identity matters: Cl is NOT Cl2, and ions are NOT neutral atoms.
export function findReactions(formulas) {
  const key=[...formulas].sort().join('|');
  return reactions.filter(r=>r.reactants.map(s=>s.formula).sort().join('|')===key);
}
export function equationText(reaction) {
  const side=species=>species.map(s=>(s.coefficient===1?'':s.coefficient+' ')+s.formula+(s.phase?` (${s.phase})`:'')).join(' + ');
  return side(reaction.reactants)+' → '+side(reaction.products);
}
