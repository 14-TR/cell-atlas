import records from './element-records.json' with {type:'json'};
export const elementSources={
  pubchem:'https://pubchem.ncbi.nlm.nih.gov/periodic-table/',
  configurations:'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON',
  nist:'https://physics.nist.gov/PhysRefData/ASD/ionEnergy.html',
  isotopes:'https://physics.nist.gov/PhysRefData/Compositions/index.html',
  iupac:'https://iupac.org/wp-content/uploads/2022/05/IUPAC_Periodic_Table-04May22.pdf',
};
// Expand the source configurations, not a naive sequential 2n² filling rule.
const bySymbol=new Map();
export const elements=records.map(record=>{
  const core=record.configuration.match(/^\[([A-Za-z]+)\]/)?.[1];
  const shells=core ? [...bySymbol.get(core).shells] : [];
  for(const match of record.configuration.matchAll(/([1-7])[spdf](\d+)/g)){
    const n=Number(match[1])-1;shells[n]=(shells[n]||0)+Number(match[2]);
  }
  for(let n=0;n<shells.length;n++)shells[n]??=0;
  const z=record.number, period=z<=2?1:z<=10?2:z<=18?3:z<=36?4:z<=54?5:z<=86?6:7;
  let row=period,column;
  if(z>=57&&z<=71){row=9;column=z-54;}
  else if(z>=89&&z<=103){row=10;column=z-86;}
  else {
    const start=[0,1,3,11,19,37,55,87][period];
    column=z-start+1;
    if(period===1&&z===2)column=18;
    if((period===2||period===3)&&column>2)column+=10;
    if(period>=6&&column>2)column-=14;
  }
  const e=Object.freeze({...record,period,row,column,shells:Object.freeze(shells),
    neutrons:record.massNumber-z,predicted:z>=104,
    source:z===103?elementSources.nist:elementSources.configurations,
    isotopeSource:z===117?elementSources.iupac:elementSources.isotopes,
    url:`https://pubchem.ncbi.nlm.nih.gov/element/${z}`,
  });
  bySymbol.set(e.symbol,e);return e;
});
Object.freeze(elements);
