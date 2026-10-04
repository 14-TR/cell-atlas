import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createAtom} from './atom.js';

// One renderer per page, one disposable specimen per open dialog.
export function createAtomViewer(viewport, status, rotationButton) {
  let renderer, scene, camera, controls, atom, number, frame;
  let webgl = false, opened = false, failed = false, rotating = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  function rotate(value) {
    rotating = value;
    if (controls) controls.autoRotate = value;
    rotationButton.setAttribute('aria-pressed', String(value));
    rotationButton.textContent = value ? 'Pause rotation' : 'Rotate atom';
  }
  function clear() {
    cancelAnimationFrame(frame);
    if (atom) {scene.remove(atom.root); atom.dispose(); atom = null;}
    renderer?.renderLists.dispose();
    if (webgl) renderer.render(scene, camera);
  }
  function fallback() {
    failed = true; webgl = false;
    clear(); controls?.dispose(); renderer?.dispose();
    if (renderer) renderer.domElement.hidden = true;
    status.textContent = 'Reading mode — 3D unavailable. Element, isotope and shell data remain available. Reload to retry graphics.';
    viewport.classList.add('atom-reading-mode');
    document.querySelectorAll('[data-atom-control]').forEach(el => {el.disabled = true;});
  }
  function init() {
    if (new URLSearchParams(location.search).get('webgl') === 'off') {fallback(); return;}
    try {
      renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      viewport.append(renderer.domElement);
      renderer.domElement.tabIndex = 0;
      renderer.domElement.addEventListener('webglcontextlost', e => {e.preventDefault(); fallback();});
      renderer.domElement.addEventListener('keydown', keyboard);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, 1, .1, 200);
      scene.add(new THREE.HemisphereLight('#e7f3ed', '#253845', 2.5));
      const key = new THREE.DirectionalLight('#ffe7c5', 3.2);key.position.set(-4, 6, 9);scene.add(key);
      const fill = new THREE.DirectionalLight('#9cb9df', 2);fill.position.set(5, -2, 3);scene.add(fill);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;controls.dampingFactor = .09;
      controls.minDistance = 3;controls.maxDistance = 80;
      controls.autoRotateSpeed = .45;controls.enablePan = false;
      controls.touches.ONE = THREE.TOUCH.ROTATE;controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
      controls.addEventListener('start', () => rotate(false));
      webgl = true;resize();
      status.textContent = 'Shell model, not to scale. Rings are not electron trajectories. Drag to orbit · pinch or scroll to zoom. Keyboard: arrows, + / −, Home.';
    } catch {fallback();}
  }
  function resize() {
    if (!webgl) return;
    const w = viewport.clientWidth, h = viewport.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;camera.updateProjectionMatrix();renderer.setSize(w, h);
  }
  function reset() {
    if (!webgl || !atom) return;
    // Flush damping before explicit framing, including after a previous atom.
    controls.enableDamping = false;controls.update();controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    const distance = (atom.radius + .45) / Math.sin(THREE.MathUtils.degToRad(20)) * Math.max(1, 1 / camera.aspect);
    camera.position.set(.1 * distance, .08 * distance, distance);
    controls.update();
  }
  function zoom(factor) {
    if (!webgl) return;
    rotate(false);
    const offset = camera.position.clone().sub(controls.target);
    camera.position.copy(controls.target).add(offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance)));
    controls.update();
  }
  function keyboard(e) {
    if (!webgl || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key)) return;
    e.preventDefault();rotate(false);
    if (e.key === 'Home') {reset(); return;}
    if (['+','='].includes(e.key)) {zoom(.9); return;}
    if (e.key === '-') {zoom(1.1); return;}
    const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if (e.key === 'ArrowLeft') s.theta -= .12;
    if (e.key === 'ArrowRight') s.theta += .12;
    if (e.key === 'ArrowUp') s.phi -= .12;
    if (e.key === 'ArrowDown') s.phi += .12;
    s.makeSafe();camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();
  }
  function animate() {
    if (!opened || !webgl) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden) return;
    controls.update(1 / 60);renderer.render(scene, camera);
  }
  return {
    open(element) {
      number = element.number;opened = true;
      if (!renderer && !failed) init();
      clear();
      if (!webgl) return;
      atom = createAtom(element);scene.add(atom.root);
      renderer.domElement.setAttribute('aria-label', `3D shell model of ${element.name}. Arrow keys orbit, plus and minus zoom, Home resets.`);
      resize();rotate(!reduced);reset();animate();
    },
    close() {opened = false;rotate(false);clear();},
    rotate() {rotate(!rotating);}, zoom, reset,
    diagnostics() {
      let gpu = 'unavailable';
      if (webgl) {const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);}
      return {number, webgl, opened, rotating, gpu, camera:camera?.position.toArray(), geometries:renderer?.info.memory.geometries || 0, triangles:renderer?.info.render.triangles || 0, calls:renderer?.info.render.calls || 0};
    },
  };
}
