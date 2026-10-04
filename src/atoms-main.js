import './atoms.css';
import {elements} from './elements.js';
import {createAtomViewer} from './atom-viewer.js';

const $ = id => document.getElementById(id);
const table = $('periodic-table'), dialog = $('atom-dialog');
const families = {
  'Nonmetal':'#b9d5bb', 'Noble gas':'#b5b8d9', 'Alkali metal':'#dda68d',
  'Alkaline earth metal':'#d6c796', 'Metalloid':'#a2c8bd', 'Halogen':'#a3c8d5',
  'Transition metal':'#c4ac8c', 'Post-transition metal':'#b5c2ad',
  'Lanthanide':'#b8a7cf', 'Actinide':'#cca9b8',
};
const viewer = createAtomViewer($('atom-viewport'), $('atom-status'), $('atom-rotate'), $('atom-animation'));
let opener, matches = elements;
function text(tag, value, className) {
  const el = document.createElement(tag);el.textContent = value;
  if (className) el.className = className;
  return el;
}
for (let column = 1; column <= 18; column++) {
  const heading = text('span', String(column), 'group-number');
  heading.style.gridColumn = column;heading.style.gridRow = 1;table.append(heading);
}
for (const e of elements) {
  const button = document.createElement('button');
  button.type = 'button';button.dataset.element = e.number;
  button.setAttribute('aria-label', `${e.number}. ${e.name}, ${e.symbol}. Open 3D atom`);
  button.style.gridColumn = e.column;button.style.gridRow = e.row + 1;
  button.style.setProperty('--family', families[e.family] || '#c7d5bb');
  button.append(text('span', String(e.number), 'element-number'), text('strong', e.symbol), text('span', e.name, 'element-name'));
  table.append(button);
}
for (const [row, label] of [[7,'57–71 ↓'],[8,'89–103 ↓']]) {
  const placeholder = text('span', label, 'series-placeholder');
  placeholder.style.gridColumn = 3;placeholder.style.gridRow = row;table.append(placeholder);
}
for (const [row, label] of [[10,'Lanthanides'],[11,'Actinides']]) {
  const caption = text('span', label, 'series-caption');caption.style.gridColumn = '1 / 3';caption.style.gridRow = row;table.append(caption);
}
for (const [name, color] of Object.entries(families)) {
  const item = text('span', name);item.style.setProperty('--family', color);$('family-key').append(item);
}
function open(e, trigger) {
  opener = trigger;
  $('atom-family').textContent = `ATOMIC NUMBER ${e.number} / ${e.family.toUpperCase()} / PERIOD ${e.period}`;
  $('atom-name').textContent = e.name;
  $('atom-symbol').textContent = e.symbol;
  $('atom-counts').textContent = `${e.number} protons · ${e.number} electrons · ${e.neutrons} neutrons`;
  $('atom-isotope').textContent = `${e.name}-${e.massNumber} (${e.symbol}-${e.massNumber})`;
  $('isotope-note').textContent = `Neutrons = isotope mass number ${e.massNumber} − atomic number ${e.number}. Other isotopes have different neutron counts. This is not a rounded average atomic weight. Choice: ${e.isotopeBasis}.${e.isotopeEstimated ? ' NIST marks this isotope’s mass as estimated.' : ''}`;
  $('shell-list').replaceChildren(...e.shells.map((count, i) => text('li', `n=${i + 1}: ${count}`)));
  $('atom-configuration').textContent = e.configuration;
  $('configuration-note').textContent = e.predicted ? 'Superheavy-atom configuration is theoretical / predicted; not a measured picture of this atom.' : e.number === 103 ? 'NIST ground configuration (7p electron); differs from the older PubChem/LANL 6d listing.' : 'Ground-state neutral atom. Shell totals are grouped from this configuration, including exceptions to simple filling rules.';
  $('element-source').href = e.url;$('isotope-source').href = e.isotopeSource;
  document.querySelectorAll('[data-element]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.element) === e.number)));
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  viewer.open(e);
  $('atom-close').focus({preventScroll:true});
}
function close() {dialog.close();}
$('atom-close').addEventListener('click', close);
dialog.addEventListener('close', () => {
  // Native close events are queued: an atom may already have reopened.
  if (dialog.open) return;
  viewer.close();opener?.focus({preventScroll:true});
});
dialog.addEventListener('click', e => {
  if (e.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) close();
});
table.addEventListener('click', event => {
  const button = event.target.closest('[data-element]');
  if (button) open(elements[Number(button.dataset.element) - 1], button);
});
table.addEventListener('keydown', event => {
  const button = event.target.closest('[data-element]');
  if (!button || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
  const e = elements[Number(button.dataset.element) - 1];
  let candidates;
  if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) candidates = elements.filter(x => x.row === e.row).sort((a,b) => a.column - b.column);
  else candidates = elements.filter(x => x.column === e.column).sort((a,b) => a.row - b.row);
  const index = candidates.indexOf(e);
  const next = event.key === 'Home' ? candidates[0] : event.key === 'End' ? candidates.at(-1) : candidates[index + (['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1)];
  event.preventDefault();
  if (next) table.querySelector(`[data-element="${next.number}"]`).focus();
});
function search() {
  const query = $('element-search').value.trim().toLowerCase();
  matches = elements.filter(e => !query || String(e.number) === query || e.symbol.toLowerCase() === query || e.name.toLowerCase().includes(query));
  matches.sort((a,b) => Number(b.symbol.toLowerCase() === query) - Number(a.symbol.toLowerCase() === query));
  $('search-status').textContent = !query ? '118 elements. Search, or explore the table below.' : matches.length ? `${matches.length} matching element${matches.length === 1 ? '' : 's'}. Enter opens the first result.` : 'No elements match. Try a name, symbol or atomic number.';
  $('search-results').replaceChildren(...(query ? matches : []).map(e => {
    const button = text('button', `${e.number} · ${e.symbol} · ${e.name}`);button.type = 'button';
    button.addEventListener('click', () => open(e, button));return button;
  }));
}
$('element-search').addEventListener('input', search);
$('element-search-form').addEventListener('submit', event => {event.preventDefault();if (matches.length) open(matches[0], $('element-search'));});
$('atom-rotate').addEventListener('click', () => viewer.rotate());
$('atom-animation').addEventListener('click', () => viewer.motion());
for (const key of ['cloud','particles','nucleus']) {
  $(`atom-${key}`).addEventListener('click', event => {
    const value = viewer.display(key);
    if (value !== undefined) event.currentTarget.setAttribute('aria-pressed', String(value));
  });
}
$('atom-reset').addEventListener('click', () => viewer.reset());
$('atom-zoom-in').addEventListener('click', () => viewer.zoom(.85));
$('atom-zoom-out').addEventListener('click', () => viewer.zoom(1.18));
window.atomAtlas = {ready:true, diagnostics:() => viewer.diagnostics()};
