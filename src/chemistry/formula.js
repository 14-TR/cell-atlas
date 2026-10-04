import {elements} from '../elements.js';
const symbols = new Set(elements.map(e => e.symbol));
export const MAX_ATOMS = 240, MAX_PER_ELEMENT = 99;
const fail = () => {throw new Error('Use valid element symbols, positive integer subscripts and matched groups. Charges use ^2- or +/−; hydrate separator is ·.');};
function merge(into, part, factor = 1) {
  for (const [symbol,count] of Object.entries(part)) {
    into[symbol] = (into[symbol] || 0) + count * factor;
    if (!Number.isSafeInteger(into[symbol]) || into[symbol] > 10000) fail();
  }
}
// Strict grammar: no partial parsing, decimal counts, leading coefficients or ratio reduction.
export function parseFormula(text) {
  if (typeof text !== 'string' || !text.length || text.length > 256) fail();
  let charge = 0;
  const ion = text.match(/(?:\^([1-9]\d*))?([+-])$/);
  if (ion) {charge = Number(ion[1] || 1) * (ion[2] === '+' ? 1 : -1);text = text.slice(0,-ion[0].length);}
  if (Math.abs(charge) > 99) fail();
  const atoms = {};
  for (const [componentIndex,component] of text.split('·').entries()) {
    let position = 0;
    function number() {
      const digits = component.slice(position).match(/^\d+/)?.[0];
      if (!digits) return 1;
      if (digits[0] === '0' || Number(digits) > 10000) fail();
      position += digits.length;return Number(digits);
    }
    const factor = componentIndex ? number() : 1;
    function group(close = '', depth = 0) {
      if (depth > 8) fail();
      const result = {};let terms = 0;
      while (position < component.length && component[position] !== close) {
        const char = component[position];
        if (char === '(' || char === '[') {
          position++;const child = group(char === '(' ? ')' : ']',depth+1);
          merge(result,child,number());
        } else {
          const symbol = component.slice(position).match(/^[A-Z][a-z]?/)?.[0];
          if (!symbols.has(symbol)) fail();
          position += symbol.length;merge(result,{[symbol]:number()});
        }
        terms++;
      }
      if (!terms || (close && component[position++] !== close)) fail();
      return result;
    }
    merge(atoms,group(),factor);
    if (position !== component.length) fail();
  }
  return {atoms,charge};
}
export function compositionKey(value) {
  const {atoms,charge = 0} = typeof value === 'string' ? parseFormula(value) : value;
  return Object.keys(atoms).filter(s=>atoms[s]).sort().map(s=>`${s}:${atoms[s]}`).join('|') + `;q=${charge}`;
}
export function formatFormula(atoms) {
  const keys = Object.keys(atoms).filter(s=>atoms[s]).sort();
  if (keys.includes('C')) {
    keys.splice(keys.indexOf('C'),1);if (keys.includes('H')) keys.splice(keys.indexOf('H'),1);
    keys.unshift(...(atoms.H ? ['C','H'] : ['C']));
  }
  return keys.map(s => s + (atoms[s] === 1 ? '' : atoms[s])).join('');
}
export function setAtomCount(atoms,symbol,count) {
  if (!symbols.has(symbol) || !Number.isInteger(count) || count < 0 || count > MAX_PER_ELEMENT) throw new Error('Choose a whole count from 0 to 99.');
  const next = {...atoms,[symbol]:count};
  if (!count) delete next[symbol];
  if (Object.values(next).some(n=>!Number.isInteger(n)||n<0||n>MAX_PER_ELEMENT) || Object.values(next).reduce((a,b)=>a+b,0) > MAX_ATOMS) throw new Error('The builder is limited to 240 atoms in total.');
  return next;
}
