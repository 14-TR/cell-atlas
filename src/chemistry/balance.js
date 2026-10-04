import {parseFormula} from './formula.js';
export function sideTotals(species) {
  if(!Array.isArray(species)||!species.length)throw new Error('An equation needs species on both sides.');
  const atoms={};let charge=0;
  for(const item of species) {
    if(!Number.isInteger(item.coefficient)||item.coefficient<1||item.coefficient>100)throw new Error('Invalid stoichiometric coefficient.');
    const parsed=parseFormula(item.formula);charge+=parsed.charge*item.coefficient;
    for(const [symbol,count] of Object.entries(parsed.atoms))atoms[symbol]=(atoms[symbol]||0)+count*item.coefficient;
  }
  return {atoms,charge};
}
export function validateReaction(reaction) {
  const left=sideTotals(reaction.reactants),right=sideTotals(reaction.products);
  const symbols=[...new Set([...Object.keys(left.atoms),...Object.keys(right.atoms)])].sort();
  return {balanced:left.charge===right.charge&&symbols.every(s=>left.atoms[s]===right.atoms[s]),left,right,symbols};
}
export function calculateYield(reaction,quantities) {
  if(!validateReaction(reaction).balanced)throw new Error('Unbalanced equation.');
  if(!Array.isArray(quantities)||quantities.length!==reaction.reactants.length||quantities.some(q=>!Number.isFinite(q)||q<0||q>100))throw new Error('Use finite virtual mol amounts from 0 to 100 for every reactant.');
  const ratios=quantities.map((q,i)=>q/reaction.reactants[i].coefficient);
  const extent=Math.min(...ratios);
  const clean=value=>Math.abs(value)<1e-10?0:Number(value.toPrecision(12));
  return {extent,produced:reaction.products.map(s=>clean(s.coefficient*extent)),remaining:quantities.map((q,i)=>clean(q-reaction.reactants[i].coefficient*extent)),limiting:ratios.flatMap((r,i)=>Math.abs(r-extent)<1e-10?[i]:[])};
}
