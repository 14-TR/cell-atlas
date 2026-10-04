"""Curate equation facts from retrieved MathML; validate every transcription against its exact source fragment."""
from pathlib import Path
import re, html, json, hashlib
root=Path(__file__).resolve().parents[1]; folder=root/'tests/fixtures/chemistry-sources'
pages={'a':'4-1-writing-and-balancing-chemical-equations','b':'4-2-classifying-chemical-reactions','e':'4-exercises','y':'4-4-reaction-yields','h':'5-3-enthalpy'}
# Coefficients and species are literal curated transcriptions, not inferred product predictions.
specs=[
('salt','Sodium + chlorine','combination','b',22,'2 Na(s) + Cl2(g) -> 2 NaCl(s)'),
('water','Hydrogen + oxygen','combination','h',7,'2 H2(g) + O2(g) -> 2 H2O(l)'),
('ammonia','Nitrogen + hydrogen','combination','a',48,'N2 + 3 H2 -> 2 NH3'),
('hydrogen-chloride','Hydrogen + chlorine','combination','b',26,'H2(g) + Cl2(g) -> 2 HCl(g)'),
('magnesium-chloride','Magnesium + chlorine','combination','e',33,'Mg(s) + Cl2(g) -> MgCl2(s)'),
('methane-oxidation','Methane oxidation','oxidation','a',2,'CH4 + 2 O2 -> CO2 + 2 H2O'),
('ethane-oxidation','Ethane oxidation','oxidation','a',46,'2 C2H6 + 7 O2 -> 6 H2O + 4 CO2'),
('ethene-oxidation','Ethene oxidation','oxidation','b',44,'C2H4(g) + 3 O2(g) -> 2 CO2(g) + 2 H2O(l)'),
('peroxide','Hydrogen peroxide decomposition','decomposition','b',42,'2 H2O2(aq) -> 2 H2O(l) + O2(g)'),
('limestone','Calcium carbonate decomposition','decomposition','a',50,'CaCO3(s) -> CaO(s) + CO2(g)'),
('zinc-carbonate','Zinc carbonate decomposition','decomposition','b',40,'ZnCO3(s) -> ZnO(s) + CO2(g)'),
('water-split','Water decomposition','decomposition','a',20,'2 H2O -> 2 H2 + O2'),
('silver-chloride','Silver chloride precipitation','precipitation','e',110,'AgNO3(aq) + NaCl(aq) -> AgCl(s) + NaNO3(aq)'),
('lead-iodide','Lead iodide precipitation','precipitation','b',0,'2 KI(aq) + Pb(NO3)2(aq) -> PbI2(s) + 2 KNO3(aq)'),
('barium-sulfate','Barium sulfate precipitation','precipitation','b',43,'BaCl2(aq) + K2SO4(aq) -> BaSO4(s) + 2 KCl(aq)'),
('calcium-silver','Calcium chloride + silver nitrate','precipitation','a',51,'CaCl2(aq) + 2 AgNO3(aq) -> Ca(NO3)2(aq) + 2 AgCl(s)'),
('silver-ionic','Silver chloride · net ionic','precipitation','a',56,'Cl-(aq) + Ag+(aq) -> AgCl(s)'),
('neutral-ionic','Neutralization · net ionic','acid-base','e',23,'H+(aq) + OH-(aq) -> H2O(l)'),
('hydronium','Hydronium + hydroxide','acid-base','b',18,'H3O+(aq) + OH-(aq) -> 2 H2O(l)'),
('magnesium-neutral','Magnesium hydroxide + acid','acid-base','b',14,'Mg(OH)2(s) + 2 HCl(aq) -> MgCl2(aq) + 2 H2O(l)'),
('barium-neutral','Barium hydroxide + acid','acid-base','b',17,'Ba(OH)2(aq) + 2 HNO3(aq) -> Ba(NO3)2(aq) + 2 H2O(l)'),
('calcium-neutral','Calcium hydroxide + acid','acid-base','e',119,'Ca(OH)2(aq) + 2 HCl(aq) -> CaCl2(aq) + 2 H2O(l)'),
('sulfuric-neutral','Sulfuric acid + potassium hydroxide','acid-base','e',117,'H2SO4(aq) + 2 KOH(aq) -> K2SO4(aq) + 2 H2O(l)'),
('carbon-dioxide-base','Carbon dioxide + sodium hydroxide','acid-base','a',58,'CO2(aq) + 2 NaOH(aq) -> Na2CO3(aq) + H2O(l)'),
('bicarbonate','Bicarbonate + acid','acid-base','e',113,'NaHCO3(aq) + HCl(aq) -> NaCl(aq) + CO2(g) + H2O(l)'),
('zinc-acid','Zinc + hydrochloric acid','displacement','b',38,'Zn(s) + 2 HCl(aq) -> ZnCl2(aq) + H2(g)'),
('copper-silver','Copper + silver nitrate','displacement','b',39,'Cu(s) + 2 AgNO3(aq) -> Cu(NO3)2(aq) + 2 Ag(s)'),
('zinc-copper','Zinc + copper sulfate','displacement','y',12,'CuSO4(aq) + Zn(s) -> Cu(s) + ZnSO4(aq)'),
('magnesium-nickel','Magnesium + nickel chloride','displacement','e',37,'Mg(s) + NiCl2(aq) -> MgCl2(aq) + Ni(s)'),
('zinc-sulfuric','Zinc + sulfuric acid','displacement','e',40,'Zn(s) + H2SO4(aq) -> ZnSO4(aq) + H2(g)'),
]
def normalized(text):
    return re.sub(r'\s+','',text).replace('⟶','->').replace('−','-').replace('Δ','')
def species(side):
    out=[]
    for term in side.split(' + '):
        match=re.fullmatch(r'(?:(\d+) )?([A-Za-z0-9()\[\]^+-]+?)(?:\((aq|s|l|g)\))?',term)
        if not match: raise ValueError(term)
        coefficient,formula,phase=match.groups()
        out.append({'formula':formula,'coefficient':int(coefficient or 1),'phase':phase or ''})
    return out
records=[];provenance=[]
for id,name,category,page,index,equation in specs:
    file=folder/(pages[page]+'.html'); data=file.read_bytes(); raw=re.findall(r'<math\b.*?</math>',data.decode(),re.S)[index]
    text=html.unescape(re.sub('<[^>]+>','',raw)).strip()
    assert normalized(equation) in normalized(text), (id,equation,text)
    left,right=equation.split(' -> ')
    record={'id':id,'name':name,'category':category,'reactants':species(left),'products':species(right),'sourceId':'openstax-'+pages[page]+'-math-'+str(index),'sourceUrl':'https://openstax.org/books/chemistry-2e/pages/'+pages[page]}
    if id=='salt': record['note']='Na is sodium metal, not a sodium ion. Elemental chlorine is Cl2, a diatomic molecule—not isolated Cl. The product is an extended Na+/Cl− ionic solid, not a discrete NaCl molecule.'
    elif id=='water':record['note']='Hydrogen and oxygen reactants are the diatomic molecules H2 and O2, not separate H and O atoms. The animation shows only atom accounting, not an actual reaction mechanism.'
    elif category=='precipitation':record['note']='Solid product formation is represented by (s). Dissolved ionic compounds are formula-unit bookkeeping here, not intact molecules in solution.'
    elif id=='ammonia':record['note']='This is the balanced synthesis stoichiometry, not a claim of complete conversion or spontaneous reaction. Real ammonia formation is equilibrium- and condition-dependent.'
    elif category=='decomposition':record['note']='Decomposition requires suitable conditions or an energy input. The equation does not mean the substance falls apart by itself.'
    else:record['note']='States: (s) solid, (l) liquid, (g) gas, (aq) dissolved in water. Formulas group atom inventories; ions and solids are not asserted to be discrete molecules.'
    records.append(record);provenance.append({'id':id,'fixture':file.name,'sha256':hashlib.sha256(data).hexdigest(),'mathIndex':index,'mathSHA256':hashlib.sha256(raw.encode()).hexdigest(),'sourceText':text,'equation':equation,'reactants':record['reactants'],'products':record['products']})
(root/'src/chemistry/reaction-records.json').write_text(json.dumps(records,indent=2)+'\n')
(folder/'reaction-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
print('Verified source transcriptions:',len(records))
