import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const data=()=>import('../src/elements.js').catch(()=>({}));
test('source snapshots are immutable and every configuration matches its cited source',async()=>{
  const {elements}=await data();
  for(const [file,hash] of Object.entries({
    'pubchem.json':'ff0f75976583b8a6493b18d0b42e83e1b68bd6e112b45d33578d98494ed5d321',
    'nist-isotopes.html':'c1c2ebcb89b725d90c1a67f391d80f2aa33ccc9cc74fd3019b1819a4786ad542',
    'nist-lr.csv':'3e52271bfd428f416ad48bbc8128e8bb58dca93561ad1e22d9a06f93051a7b13',
  }))assert.equal(createHash('sha256').update(readFileSync(new URL(`./fixtures/element-sources/${file}`,import.meta.url))).digest('hex'),hash,file);
  const source=JSON.parse(readFileSync(new URL('./fixtures/element-sources/pubchem.json',import.meta.url)));
  for(const e of elements){
    const row=source.Table.Row[e.number-1].Cell;
    assert.equal(e.symbol,row[1]);assert.equal(e.name,row[2]);
    assert.equal(e.configuration,e.number===103?'[Rn]5f14 7s2 7p1':row[5],e.symbol);
  }
  const rows={
    1:'H - - - - - - - - - - - - - - - - He',
    2:'Li Be - - - - - - - - - - B C N O F Ne',
    3:'Na Mg - - - - - - - - - - Al Si P S Cl Ar',
    4:'K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr',
    5:'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe',
    6:'Cs Ba - Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn',
    7:'Fr Ra - Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og',
    9:'- - La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu -',
    10:'- - Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr -',
  };
  for(const e of elements)assert.equal(rows[e.row].split(' ')[e.column-1],e.symbol,`${e.symbol} canonical table position`);
});

test('all 118 neutral atoms have sourced configurations, integer isotope counts and unique table positions',async()=>{
  const {elements}=await data();assert.ok(elements,'element dataset exists');assert.equal(elements.length,118);
  const fixture=name=>readFileSync(new URL(`./fixtures/element-sources/${name}`,import.meta.url));
  for(const [name,hash] of Object.entries({'pubchem.json':'ff0f75976583b8a6493b18d0b42e83e1b68bd6e112b45d33578d98494ed5d321','nist-isotopes.html':'c1c2ebcb89b725d90c1a67f391d80f2aa33ccc9cc74fd3019b1819a4786ad542','nist-lr.csv':'3e52271bfd428f416ad48bbc8128e8bb58dca93561ad1e22d9a06f93051a7b13'}))assert.equal(createHash('sha256').update(fixture(name)).digest('hex'),hash,`immutable source: ${name}`);
  const source=JSON.parse(fixture('pubchem.json')).Table;
  for(const [i,row] of source.Row.entries()) {
    assert.deepEqual([elements[i].number,elements[i].symbol,elements[i].name],[Number(row.Cell[0]),row.Cell[1],row.Cell[2]]);
    if(i!==102)assert.equal(elements[i].configuration,row.Cell[5]);
  }
  assert.match(fixture('nist-lr.csv').toString(),/\[Rn\]\.5f14\.7s2\.7p/);
  const isotopeText=fixture('nist-isotopes.html').toString();
  for(const e of elements.filter(e=>e.number!==117))assert.ok(new RegExp(String.raw`Atomic Number = ${e.number}\s+Atomic Symbol = \w+\s+Mass Number = ${e.massNumber}\s`).test(isotopeText),`${e.symbol} isotope occurs in independent NIST snapshot`);
  const rowSymbols=[['H',...Array(16).fill(null),'He'],['Li','Be',...Array(10).fill(null),'B','C','N','O','F','Ne'],['Na','Mg',...Array(10).fill(null),'Al','Si','P','S','Cl','Ar'], 'K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr'.split(' '),'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe'.split(' '), ['Cs','Ba',null,...'Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn'.split(' ')], ['Fr','Ra',null,...'Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ')],[],[null,null,...'La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu'.split(' ')],[null,null,...'Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr'.split(' ')]];
  for(const e of elements)assert.equal(rowSymbols[e.row-1][e.column-1],e.symbol,`${e.symbol} table position`);
  assert.deepEqual(elements.map(e=>e.number),Array.from({length:118},(_,i)=>i+1));
  assert.equal(new Set(elements.map(e=>e.symbol)).size,118);
  assert.equal(new Set(elements.map(e=>`${e.row},${e.column}`)).size,118);
  for(const e of elements){
    assert.equal(e.shells.reduce((a,b)=>a+b,0),e.number,e.symbol);
    assert.ok(e.shells.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=2*(i+1)**2));
    assert.ok(Number.isInteger(e.massNumber)&&e.massNumber>=e.number);
    assert.equal(e.neutrons,e.massNumber-e.number);
    assert.ok(e.source.startsWith('https://')&&e.isotopeSource.startsWith('https://'));
    assert.ok(e.period>=1&&e.period<=7&&e.column>=1&&e.column<=18&&e.row<=10);
  }
  // Literal independent expectations, including known non-Aufbau configurations.
  for(const [z,shells] of [[1,[1]],[6,[2,4]],[24,[2,8,13,1]],[26,[2,8,14,2]],[29,[2,8,18,1]],[41,[2,8,18,12,1]],[42,[2,8,18,13,1]],[44,[2,8,18,15,1]],[45,[2,8,18,16,1]],[46,[2,8,18,18]],[47,[2,8,18,18,1]],[57,[2,8,18,18,9,2]],[58,[2,8,18,19,9,2]],[64,[2,8,18,25,9,2]],[78,[2,8,18,32,17,1]],[79,[2,8,18,32,18,1]],[92,[2,8,18,32,21,9,2]],[96,[2,8,18,32,25,9,2]],[103,[2,8,18,32,32,8,3]],[118,[2,8,18,32,32,18,8]]])assert.deepEqual(elements[z-1].shells,shells,`Z=${z}`);
  for(const [z,row,column] of [[1,1,1],[2,1,18],[6,2,14],[26,4,8],[57,9,3],[71,9,17],[72,6,4],[79,6,11],[89,10,3],[92,10,6],[103,10,17],[104,7,4],[118,7,18]])assert.deepEqual([elements[z-1].row,elements[z-1].column],[row,column]);
  for(const [z,a] of [[1,1],[6,12],[26,56],[79,197],[92,238],[118,294]])assert.equal(elements[z-1].massNumber,a);
  assert.equal(elements[117].predicted,true);
});
