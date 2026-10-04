// Build from actual retrieval receipts; never populate missing or charged queries.
import fs from 'node:fs';
import {compositionKey,parseFormula} from '../src/chemistry/formula.js';
const retrieved = JSON.parse(fs.readFileSync('evidence/chemistry/retrieved-compounds.json'));
const conventional = {'sodium-chloride':'NaCl','potassium-chloride':'KCl','magnesium-chloride':'MgCl2','ammonium-chloride':'NH4Cl','sodium-bromide':'NaBr','potassium-bromide':'KBr','sodium-iodide':'NaI','potassium-iodide':'KI','sodium-nitrate':'NaNO3','calcium-nitrate':'Ca(NO3)2','copperii-sulfate':'CuSO4','zinc-sulfate':'ZnSO4','magnesium-sulfate':'MgSO4','sodium-sulfate':'Na2SO4','potassium-sulfate':'K2SO4','barium-sulfate':'BaSO4','sodium-carbonate':'Na2CO3','sodium-bicarbonate':'NaHCO3','calcium-carbonate':'CaCO3','magnesium-carbonate':'MgCO3','potassium-carbonate':'K2CO3','calcium-phosphate':'Ca3(PO4)2','sodium-fluoride':'NaF','ironiii-chloride':'FeCl3','ironii-sulfate':'FeSO4','leadii-iodide':'PbI2','leadii-nitrate':'Pb(NO3)2','silicon-dioxide':'SiO2','zinc-oxide':'ZnO','titanium-dioxide':'TiO2','sulfur-dioxide':'SO2','sulfur-trioxide':'SO3','hydrogen-chloride':'HCl','sulfuric-acid':'H2SO4','phosphoric-acid':'H3PO4','carbonic-acid':'H2CO3','hydrogen-bromide':'HBr','sodium-hydroxide':'NaOH','potassium-hydroxide':'KOH','calcium-hydroxide':'Ca(OH)2','magnesium-hydroxide':'Mg(OH)2','barium-hydroxide':'Ba(OH)2','ammonia':'NH3'};
const omitted = [], records = [];
for (const row of retrieved) {
  try {
    if (parseFormula(row.formula).charge !== 0) throw new Error('Name query returned a charged record, not intended neutral compound');
    const formula=conventional[row.id] || row.formula;
    if (compositionKey(formula)!==compositionKey(row.formula)) throw new Error('Conventional formula mismatch');
    records.push({...row,formula,view:({962:'water',5234:'nacl-lattice',280:'carbon-dioxide',297:'methane',222:'ammonia'})[row.cid] || 'composition'});
  } catch(error) {omitted.push({...row,reason:error.message});}
}
fs.writeFileSync('src/chemistry/compound-records.json',JSON.stringify(records,null,2)+'\n');
fs.writeFileSync('evidence/chemistry/catalog-exclusions.json',JSON.stringify(omitted,null,2)+'\n');
console.log(JSON.stringify({included:records.length,excluded:omitted.map(r=>r.id)},null,2));
