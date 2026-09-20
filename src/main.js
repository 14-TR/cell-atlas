import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCell } from './cell.js';
import { structures, sources, model } from './data.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { selected: 'nucleus', isolated: false, membrane: true, labels: true, clipping: 0, quality: 'balanced', rotating: !reduced };
let renderer, scene, camera, controls, cell, tween, ready = false, webgl = false;
let clippingPlane = new THREE.Plane(new THREE.Vector3(0,0,-1), 9);
const labels = [], pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
let startPointer, lastTime = 0;

function announce(text) { $('announcer').textContent = text; }
function referenceLinks(urls) {
  return urls.map(url => {
    const title = Object.values(sources).find(s => s.url === url)?.title || 'NCBI Bookshelf';
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
  }).join('');
}
$('model-disclaimer').textContent = model.disclaimer;
$('source-links').innerHTML = referenceLinks(Object.values(sources).map(s => s.url));
$('structure-list').innerHTML = structures.map((s,i) => `<button data-structure="${s.id}" aria-pressed="false"><span class="color-dot" style="background:${s.color}"></span><span>${s.name}</span></button>`).join('');

function select(id, { frame = false } = {}) {
  const item = structures.find(x => x.id === id);
  if (!item) return;
  state.selected = id;
  $('selected-name').textContent = item.name;
  $('selected-eyebrow').textContent = item.eyebrow;
  $('selected-index').textContent = `${String(structures.indexOf(item) + 1).padStart(2,'0')} / ${structures.length}`;
  $('selected-dot').style.background = item.color;
  $('selected-function').textContent = item.function;
  $('selected-description').textContent = item.description;
  $('detail-name').textContent = item.name;
  $('detail-description').textContent = item.description;
  $('detail-look').textContent = item.detail;
  $('detail-sources').innerHTML = referenceLinks(item.sources);
  document.querySelectorAll('[data-structure]').forEach(button => button.setAttribute('aria-pressed', button.dataset.structure === id));
  applyVisibility();
  $('structure-panel').classList.remove('open');
  $('structures-open').setAttribute('aria-expanded', 'false');
  if (frame) focus();
  announce(`${item.name} selected. ${item.function}.`);
}
function applyVisibility() {
  if (!cell) return;
  for (const [id, group] of cell.groups) {
    const nucleusContext = state.selected === 'nucleus' && id === 'nucleolus';
    group.visible = (!state.isolated || id === state.selected || nucleusContext) && (id !== 'membrane' || state.membrane);
    group.traverse(o => {
      if (o.material && !o.material.transparent) {
        o.material.emissive.set(id === state.selected ? '#283529' : '#000000');
        o.material.emissiveIntensity = id === state.selected ? .16 : 0;
      }
    });
  }
  $('isolate-button').setAttribute('aria-pressed', state.isolated);
}
function updateRotation() {
  if (controls) controls.autoRotate = state.rotating;
  $('rotate-button').setAttribute('aria-label', state.rotating ? 'Pause rotation' : 'Resume rotation');
  $('rotate-button').setAttribute('aria-pressed', state.rotating);
  $('rotate-button').innerHTML = `<span aria-hidden="true">${state.rotating ? 'Ⅱ' : '▷'}</span>`;
}
function resetCamera(animated = true) {
  if (!camera) return;
  const aspect = viewport.clientWidth / viewport.clientHeight;
  const distance = Math.max(18.6, 22.5 / aspect);
  const position = new THREE.Vector3(3.2, 2.8, distance);
  moveCamera(position, new THREE.Vector3(0,0,0), animated);
}
function moveCamera(position, target, animated = true) {
  if (!controls) return;
  if (animated && !reduced) tween = { start: performance.now(), from: camera.position.clone(), to: position, fromTarget: controls.target.clone(), toTarget: target };
  else { tween = null; camera.position.copy(position); controls.target.copy(target); controls.update(); }
}
function focus() {
  if (!cell || !webgl) return;
  // A deliberate selection/focus must never land on an invisible section.
  setClipping(0);
  if (state.selected === 'membrane') {
    state.membrane = true; $('membrane-toggle').checked = true;
  }
  applyVisibility();
  state.rotating = false; updateRotation();
  const { point, distance } = cell.groups.get(state.selected).userData.focus;
  const direction = new THREE.Vector3(.15,.12,1).normalize();
  moveCamera(point.clone().addScaledVector(direction, distance * Math.max(1, .85 / camera.aspect)), point.clone());
  announce(`${structures.find(s => s.id === state.selected).name} centered.`);
}
function reset() {
  state.isolated = false; state.membrane = true;
  setClipping(0); $('membrane-toggle').checked = true;
  applyVisibility(); resetCamera(); announce('Cell view reset. All structures visible.');
}
function openDialog(id) { $(id).showModal(); }
$('sources-open').addEventListener('click', () => openDialog('sources-dialog'));
$('details-open').addEventListener('click', () => openDialog('details-dialog'));
$('settings-open').addEventListener('click', () => openDialog('settings-dialog'));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } }));
$('structure-list').addEventListener('click', e => {
  const button = e.target.closest('[data-structure]');
  if (!button) return;
  select(button.dataset.structure, { frame: true });
  if ($('structures-open').offsetParent) $('structures-open').focus();
});
function stepStructure(direction) {
  const index = structures.findIndex(s => s.id === state.selected);
  select(structures[(index + direction + structures.length) % structures.length].id, { frame: true });
}
$('previous-structure').addEventListener('click', () => stepStructure(-1));
$('next-structure').addEventListener('click', () => stepStructure(1));
function toggleStructures(show) { $('structure-panel').classList.toggle('open', show); $('structures-open').setAttribute('aria-expanded', String(show)); if (show) $('structure-list').querySelector('[aria-pressed=true]').focus(); }
$('structures-open').setAttribute('aria-controls','structure-panel');
$('structures-open').setAttribute('aria-expanded','false');
$('structures-open').addEventListener('click', () => toggleStructures(!$('structure-panel').classList.contains('open')));
$('structures-close').addEventListener('click', () => { toggleStructures(false); $('structures-open').focus(); });
$('fallback-browse').addEventListener('click', () => toggleStructures(true));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') toggleStructures(false);
});
$('focus-button').addEventListener('click', focus);
$('isolate-button').addEventListener('click', () => { state.isolated = !state.isolated; if (state.isolated) focus(); applyVisibility(); announce(state.isolated ? 'Selected structure isolated. Next and previous keep isolation on.' : 'All structures restored.'); });
$('reset-button').addEventListener('click', reset);
$('rotate-button').addEventListener('click', () => { state.rotating = !state.rotating; updateRotation(); });
function setClipping(value) {
  state.clipping = Number(value);
  clippingPlane.constant = state.clipping === 0 ? 9 : 6 - state.clipping * .115;
  $('clipping').value = state.clipping;
  $('clipping-value').value = `${state.clipping}%`;
  $('clipping').setAttribute('aria-valuetext', state.clipping ? `${state.clipping}% section depth` : 'Off — no section plane');
  $('section-hint').textContent = state.clipping ? 'Section may hide parts · Focus reveals selection' : 'Open cut faces · select a structure to reveal it';
}
$('clipping').addEventListener('input', e => setClipping(e.target.value));
document.querySelectorAll('[data-depth]').forEach(button => button.addEventListener('click', () => setClipping(button.dataset.depth)));
$('membrane-toggle').addEventListener('change', e => { state.membrane = e.target.checked; applyVisibility(); });
$('labels-toggle').addEventListener('change', e => { state.labels = e.target.checked; });
$('quality').addEventListener('change', e => {
  state.quality = e.target.value;
  if (!renderer) return;
  scene.remove(cell.root); cell.dispose();
  cell = createCell({ quality: state.quality }); scene.add(cell.root); applyVisibility();
  resize(); announce(`Rendering quality: ${state.quality}.`);
});
select('nucleus'); updateRotation();

function resize() {
  if (!renderer) return;
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, state.quality === 'low' ? 1 : state.quality === 'high' ? 1.75 : 1.5));
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
function fallback(message) {
  webgl = false; ready = true;
  $('section-control').hidden = true;
  labels.forEach(label => { label.el.hidden = true; });
  $('app').classList.add('reading-mode');
  $('loading').hidden = true; $('fallback').hidden = false;
  if (renderer) renderer.domElement.hidden = true;
  $('render-status').textContent = 'READING MODE';
  ['focus-button','isolate-button','rotate-button','reset-button','settings-open'].forEach(id => { $(id).disabled = true; $(id).style.opacity = '.4'; });
  announce(message || '3D unavailable. All structure descriptions and sources remain accessible.');
}
function init() {
  if (new URLSearchParams(location.search).get('webgl') === 'off') { fallback(); return; }
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000,0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
    renderer.clippingPlanes = [clippingPlane]; renderer.localClippingEnabled = true;
    renderer.domElement.setAttribute('aria-label', '3D cell. Drag to rotate; pinch or scroll to zoom. Use the structure index for keyboard selection.');
    renderer.domElement.tabIndex = 0; viewport.appendChild(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); fallback('The graphics context was lost. Structure reading mode is available; reload to retry.'); });
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(39,1,.1,100);
    scene.add(new THREE.HemisphereLight('#d3e7e2','#253e34',2.4));
    const key = new THREE.DirectionalLight('#fff0d9',3.5); key.position.set(-4,8,12); scene.add(key);
    const fill = new THREE.DirectionalLight('#a1cdd3',1.6); fill.position.set(8,-1,4); scene.add(fill);
    const rim = new THREE.DirectionalLight('#c4c0dc',2); rim.position.set(-3,4,-8); scene.add(rim);
    cell = createCell({ quality: state.quality }); scene.add(cell.root);
    controls = new OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .07; controls.minDistance = 2; controls.maxDistance = 45;
    controls.autoRotateSpeed = .28; controls.enablePan = true; controls.screenSpacePanning = true;
    controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.addEventListener('start', () => { tween = null; state.rotating = false; updateRotation(); });
    controls.addEventListener('change', () => {});
    renderer.domElement.addEventListener('pointerdown', e => { startPointer = { x:e.clientX, y:e.clientY, time:performance.now() }; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (!startPointer || Math.hypot(e.clientX-startPointer.x,e.clientY-startPointer.y)>7 || performance.now()-startPointer.time>500) return;
      const r = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
      raycaster.setFromCamera(pointer,camera);
      const objects = [...cell.groups.values()].filter(g=>g.visible && g.name !== 'membrane' && g.name !== 'cytoskeleton' && g.name !== 'ribosomes');
      const hit = raycaster.intersectObjects(objects,true).find(h=>clippingPlane.distanceToPoint(h.point)>=0);
      if (hit) select(hit.object.userData.id);
    });
    renderer.domElement.addEventListener('keydown', e => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key)) e.preventDefault();
      if (e.key==='Home') reset();
      const offset = camera.position.clone().sub(controls.target);
      if (e.key==='+' || e.key==='=') camera.position.copy(controls.target).add(offset.multiplyScalar(.9));
      if (e.key==='-') camera.position.copy(controls.target).add(offset.multiplyScalar(1.1));
      if (e.key.startsWith('Arrow')) {
        const s = new THREE.Spherical().setFromVector3(offset);
        if (e.key==='ArrowLeft') s.theta-=.08;
        if (e.key==='ArrowRight') s.theta+=.08;
        if (e.key==='ArrowUp') s.phi=Math.max(.05,s.phi-.08);
        if (e.key==='ArrowDown') s.phi=Math.min(Math.PI-.05,s.phi+.08);
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
      }
      state.rotating=false; updateRotation(); controls.update();
    });
    for (const [id, text, point] of [ ['nucleus','Nucleus',[-2.2,2.9,1]], ['golgi','Golgi',[3.6,3.2,1.6]], ['mitochondria','Mitochondrion',[4.4,-1.5,2.7]] ]) {
      const el=document.createElement('span'); el.className='scene-label'; el.textContent=text; viewport.appendChild(el); labels.push({id,el,point:new THREE.Vector3(...point)});
    }
    resize(); resetCamera(false); updateRotation(); applyVisibility();
    new ResizeObserver(() => { resize(); }).observe(viewport);
    window.addEventListener('orientationchange', () => { setTimeout(() => { resize(); resetCamera(false); },150); });
    $('loading').hidden = true; webgl = true; ready = true;
    animate(performance.now());
  } catch (error) { fallback(); window.cellAtlasError = String(error); }
}
function animate(time) {
  requestAnimationFrame(animate);
  if (!webgl || document.hidden) return;
  const delta = Math.min((time-lastTime)/1000,.05); lastTime = time;
  if (tween) {
    const t=Math.min((time-tween.start)/850,1), smooth=t*t*(3-2*t);
    camera.position.lerpVectors(tween.from,tween.to,smooth); controls.target.lerpVectors(tween.fromTarget,tween.toTarget,smooth);
    if(t===1)tween=null;
  }
  controls.update(delta);
  renderer.render(scene,camera);
  for (const label of labels) {
    const p=label.point.clone().project(camera);
    const visible=state.labels&&!state.isolated&&cell.groups.get(label.id).visible&&clippingPlane.distanceToPoint(label.point)>=0&&p.z<1&&Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&camera.position.distanceTo(controls.target)>11;
    label.el.hidden=!visible;
    if(visible){label.el.style.left=`${(p.x*.5+.5)*viewport.clientWidth}px`;label.el.style.top=`${(-p.y*.5+.5)*viewport.clientHeight}px`;}
  }
}
window.cellAtlas = {
  get ready(){return ready;},
  diagnostics(){
    let gpu='unavailable';
    if(renderer&&webgl){const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}
    return { ...state, webgl, gpu, dpr:renderer?.getPixelRatio()||0, triangles:renderer?.info.render.triangles||0, calls:renderer?.info.render.calls||0, manifest:cell?.manifest, camera:camera?.position.toArray(), target:controls?.target.toArray(), focusPoint:cell?.groups.get(state.selected).userData.focus.point.toArray(), clippingConstant:clippingPlane.constant, transitioning:!!tween, visibleIds:cell ? [...cell.groups].filter(([,g])=>g.visible).map(([id])=>id) : [] };
  },
};
requestAnimationFrame(init);
