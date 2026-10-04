import {parseFormula} from './formula.js';
import {sideTotals,validateReaction} from './balance.js';
export const atomColors={H:'#e5eee8',C:'#91a6b7',O:'#eb806b',N:'#7caef5',Cl:'#a4d477',Na:'#ba9df0',S:'#e6ce75',Ca:'#84c9b9',K:'#cf9ee0',Mg:'#92cfa3',Cu:'#d9956c',Zn:'#9dbbc1',Ag:'#d8dce5',Ba:'#c0b482',Pb:'#a3a5d4',I:'#b895cd'};
export const colorFor=symbol=>atomColors[symbol]||'#c2cbb7';
const atom=(symbol,position,extra={})=>({symbol,position,...extra});
const geometrySource='https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity';
export function compoundScene(composition,record) {
  const base={kind:'composition',atoms:[],bonds:[],labels:[],total:Object.values(composition).reduce((a,b)=>a+b,0)};
  if(record?.view==='nacl-lattice') {
    for(let x=0;x<4;x++)for(let y=0;y<4;y++)for(let z=0;z<4;z++) {
      const sodium=(x+y+z)%2===0;
      base.atoms.push(atom(sodium?'Na':'Cl',[(x-1.5)*.92,(y-1.5)*.92,(z-1.5)*.92],{grid:[x,y,z],charge:sodium?1:-1}));
    }
    return {...base,kind:'lattice',caption:'NaCl · ionic lattice fragment. 32 Na+ and 32 Cl− ions repeat the 1:1 ratio; they are not 32 discrete molecules. Interior ions have six opposite-charge neighbors. Sizes and spacing are illustrative.',source:'https://openstax.org/books/chemistry-2e/pages/10-6-lattice-structures-in-crystalline-solids'};
  }
  const molecule=(atoms,bonds,caption)=>({...base,kind:'molecule',atoms,bonds,caption,source:geometrySource});
  if(record?.view==='water') {
    const angle=52.25*Math.PI/180;
    return molecule([atom('O',[0,0,0]),atom('H',[1.5*Math.sin(angle),1.5*Math.cos(angle),0]),atom('H',[-1.5*Math.sin(angle),1.5*Math.cos(angle),0])],[[0,1,1],[0,2,1]],'Water · bent H₂O molecule, about 104.5°. The bond directions are grounded; lengths, colors and atom sizes are illustrative.');
  }
  if(record?.view==='carbon-dioxide')return molecule([atom('C',[0,0,0]),atom('O',[-1.6,0,0]),atom('O',[1.6,0,0])],[[0,1,2],[0,2,2]],'Carbon dioxide · linear O=C=O molecule. Double bonds are indicated; distances and sizes are illustrative.');
  if(record?.view==='methane')return molecule([atom('C',[0,0,0]),...[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(p=>atom('H',p.map(v=>v*.9)))],[[0,1,1],[0,2,1],[0,3,1],[0,4,1]],'Methane · tetrahedral CH₄ molecule. Four C–H bond directions, not a flat cross. Illustrative dimensions.');
  if(record?.view==='ammonia') {
    const c=Math.cos(107*Math.PI/180),h=1.3*Math.sqrt((c+.5)/(1-c));
    return molecule([atom('N',[0,.4,0]),...Array.from({length:3},(_,i)=>atom('H',[1.3*Math.cos(i*2*Math.PI/3),.4-h,1.3*Math.sin(i*2*Math.PI/3)]))],[[0,1,1],[0,2,1],[0,3,1]],'Ammonia · trigonal-pyramidal NH₃ molecule. Illustrative H–N–H angles are slightly smaller than tetrahedral 109.5°. The lone pair is not an atom and is not drawn.');
  }
  const symbols=Object.entries(composition).flatMap(([s,n])=>Array(Math.min(n,72)).fill(s)).slice(0,72);
  const width=Math.ceil(Math.sqrt(symbols.length));
  base.atoms=symbols.map((symbol,i)=>atom(symbol,[((i%width)-(width-1)/2)*.68,(Math.floor(i/width)-(Math.ceil(symbols.length/width)-1)/2)*.68,Math.sin(i*2.4)*.2]));
  return {...base,caption:`Composition only · ${symbols.length<base.total?`showing ${symbols.length} of ${base.total} atoms`:`${base.total} atoms in the formula`}. Spacing is an inventory layout, not molecular geometry. No bonds, stability or unique identity are inferred.`};
}
function sideLayout(species,offset) {
  const atoms=[],labels=[];let group=0;
  const groups=species.reduce((sum,s)=>sum+s.coefficient,0),columns=Math.ceil(Math.sqrt(groups));
  species.forEach(s=>{
    const composition=parseFormula(s.formula).atoms;
    for(let unit=0;unit<s.coefficient;unit++,group++){
      const origin=[offset+(group%columns-(columns-1)/2)*1.65,(Math.floor(group/columns)-(Math.ceil(groups/columns)-1)/2)*1.55,0];
      const symbols=Object.entries(composition).flatMap(([symbol,n])=>Array(n).fill(symbol));
      symbols.forEach((symbol,i)=>{
        const angle=i*2.39996323,radius=.17*Math.sqrt(i);
        atoms.push(atom(symbol,[origin[0]+Math.cos(angle)*radius,origin[1]+Math.sin(angle)*radius,Math.sin(i*1.7)*.1]));
      });
      labels.push({text:s.formula,position:[origin[0],origin[1]-.68,0]});
    }
  });
  return {atoms,labels};
}
export function reactionScene(reaction,active=true) {
  if(!validateReaction(reaction).balanced)throw new Error('Cannot animate an unbalanced reaction.');
  const left=sideLayout(reaction.reactants,-2.2),right=sideLayout(reaction.products,2.2),pool=new Map();
  for(const a of right.atoms){if(!pool.has(a.symbol))pool.set(a.symbol,[]);pool.get(a.symbol).push(a);}
  const atoms=left.atoms.map((a,i)=>{const target=pool.get(a.symbol).shift();return {...a,id:i,target:target.position,targetSymbol:target.symbol};});
  return {kind:'reaction',atoms,bonds:[],labels:[...left.labels.map(l=>({...l,side:'reactant'})),...right.labels.map(l=>({...l,side:'product'}))],inventory:sideTotals(reaction.reactants).atoms,active,caption:active?'One balanced equation packet: reactant inventories (left) rearrange into product inventories (right). Formula labels are bookkeeping groups, NOT asserted molecular shapes. Virtual mol totals and leftovers are listed separately; paths are not reaction mechanisms.':'Zero possible conversion: a required reactant is absent. Atom inventories remain on the reactant side. No products are formed in the calculation.'};
}
