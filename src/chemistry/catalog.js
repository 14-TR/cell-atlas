import records from './compound-records.json' with {type:'json'};
import {compositionKey} from './formula.js';
export const compounds = Object.freeze(records.map(Object.freeze));
const index = new Map();
for (const compound of compounds) {
  const key=compositionKey(compound.formula);
  if (!index.has(key)) index.set(key,[]);
  index.get(key).push(compound);
}
export function matchComposition(atoms) {
  if (!Object.values(atoms).some(Boolean)) return {status:'empty',candidates:[]};
  const candidates = index.get(compositionKey({atoms,charge:0})) || [];
  return {status:candidates.length > 1 ? 'ambiguous' : candidates.length ? 'matched' : 'unsupported',candidates};
}
export const coverage = Object.freeze({compounds:compounds.length,formulas:index.size,elements:118});
