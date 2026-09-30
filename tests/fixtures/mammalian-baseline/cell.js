import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { structures, model } from './data.js';

export function seededRandom(seed = model.seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

function surface(fn, nu = 48, nv = 20, keep) {
  const p = [], uv = [], indices = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const v = fn(i / nu, j / nv); p.push(v.x, v.y, v.z); uv.push(i / nu, j / nv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    if (keep && !keep((i + .5) / nu, (j + .5) / nv)) continue;
    const a = j * (nu + 1) + i, b = a + nu + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}

export function createCell({ quality = 'balanced' } = {}) {
  const rng = seededRandom(), root = new THREE.Group(), groups = new Map(), batches = new Map();
  const detail = quality === 'low' ? .65 : quality === 'high' ? 1.3 : 1;
  const mats = {}, allMaterials = [];
  const material = (key, color, opts = {}) => {
    if (!mats[key]) {
      mats[key] = new THREE.MeshStandardMaterial({ color, roughness: .53, metalness: .08, side: THREE.DoubleSide, ...opts });
      mats[key].name = key;
      mats[key].onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 vOrganicPosition;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOrganicPosition = position;');
        shader.fragmentShader = 'varying vec3 vOrganicPosition;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat grain = sin(vOrganicPosition.x * 72.0) * sin(vOrganicPosition.y * 67.0) * sin(vOrganicPosition.z * 81.0);\ndiffuseColor.rgb *= 0.93 + grain * 0.07;');
      };
      allMaterials.push(mats[key]);
    }
    return mats[key];
  };
  for (const item of structures) {
    const g = new THREE.Group(); g.name = item.id; g.userData.id = item.id; groups.set(item.id, g); root.add(g);
  }
  function add(id, geo, mat, transform) {
    if (transform) geo.applyMatrix4(transform);
    const key = id + ':' + mat.uuid;
    if (!batches.has(key)) batches.set(key, { id, mat, geos: [] });
    batches.get(key).geos.push(geo);
  }
  function tube(id, points, radius, mat, closed = false, segments = 60) {
    const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
    add(id, new THREE.TubeGeometry(curve, Math.max(12, Math.round(segments * detail)), radius, 6, closed), mat);
  }
  const dummy = new THREE.Object3D();
  function beads(id, positions, mat, geometry = new THREE.IcosahedronGeometry(1, 1)) {
    const mesh = new THREE.InstancedMesh(geometry, mat, positions.length);
    positions.forEach((b, i) => {
      dummy.position.copy(b.p); dummy.scale.setScalar(b.r || .06);
      if (b.scale) dummy.scale.multiply(b.scale);
      dummy.rotation.set(b.rot || 0, i * 2.4, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.userData.id = id; groups.get(id).add(mesh); return mesh;
  }
  const nuc = V(-1.45, .9, .4), nr = 2.07;
  const purple = material('nucleus', '#a28cbb', { roughness: .66 });
  const nuclearInner = material('nuclearInner', '#66577f');
  const poresMat = material('pores', '#d7c5df', { metalness: .18, roughness: .4 });
  const nuclearRim = material('nuclearRim', '#ccb6db');
  // Nuclear pores are true openings in both envelope surfaces, not dots on a solid sphere.
  const poreDirs = [];
  for (let i = 0; i < 66; i++) {
    const z = 1 - 2 * (i + .5) / 66, a = i * 2.399963;
    const n = V(Math.sqrt(1 - z * z) * Math.cos(a), Math.sqrt(1 - z * z) * Math.sin(a), z);
    if (n.z < .52) poreDirs.push(n);
  }
  function nuclearPoint(u, v, r) {
    const a = u * TAU, theta = .99 + v * (Math.PI - .99);
    const n = V(Math.sin(theta) * Math.cos(a), Math.sin(theta) * Math.sin(a), Math.cos(theta));
    return n.multiplyScalar(r).add(nuc);
  }
  const poreKeep = (u, v) => {
    const n = nuclearPoint(u, v, 1).sub(nuc);
    return !poreDirs.some(dir => dir.dot(n) > .9963);
  };
  for (const [r, mat] of [[nr, purple], [nr - .13, nuclearInner]]) {
    add('nucleus', surface((u, v) => nuclearPoint(u, v, r), 150, 85, poreKeep), mat);
    tube('nucleus', Array.from({ length: 81 }, (_, i) => nuclearPoint(i / 80, 0, r)), .034, nuclearRim, true, 120);
  }
  const poreBeads = [];
  for (const n of poreDirs) {
    const center = n.clone().multiplyScalar(nr - .065).add(nuc);
    const quat = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n);
    const matrix = new THREE.Matrix4().compose(center, quat, V(1, 1, 1));
    add('nucleus', new THREE.TorusGeometry(.157, .038, 6, 16), poresMat, matrix);
    for (let j = 0; j < 8; j++) {
      const p = V(Math.cos(j * TAU / 8) * .17, Math.sin(j * TAU / 8) * .17, .05).applyQuaternion(quat).add(center);
      poreBeads.push({ p, r: .046 });
    }
  }
  beads('nucleus', poreBeads, poresMat);
  const chromatin = material('chromatin', '#d0b5d3', { roughness: .9 });
  const chromatinDark = material('chromatinDark', '#8c6d9b', { roughness: .9 });
  for (let k = 0; k < 25; k++) {
    const points = [];
    const phase = rng() * TAU;
    for (let j = 0; j < 44; j++) {
      const t = j / 43 * TAU * 1.3, rad = .7 + .77 * rng();
      points.push(V(Math.sin(t * 1.31 + phase) * rad, Math.cos(t * 1.07 + phase * .7) * rad, Math.sin(t * .83 + phase * 1.4) * rad * .72).add(nuc));
    }
    tube('nucleus', points, k % 3 ? .024 : .04, k % 3 ? chromatin : chromatinDark, false, 160);
  }
  const nucleolus = material('nucleolus', '#d8a0b9', { roughness: .8 });
  const nlc = nuc.clone().add(V(.12, -.02, .4));
  add('nucleolus', surface((u, v) => {
    const a = u * TAU, t = v * Math.PI, r = .66 * (1 + .09 * Math.sin(a * 5) * Math.sin(t * 4));
    return V(Math.sin(t) * Math.cos(a) * r, Math.cos(t) * r * .85, Math.sin(t) * Math.sin(a) * r).add(nlc);
  }, 44, 24), nucleolus);
  beads('nucleolus', Array.from({ length: 120 }, () => {
    const a = rng() * TAU, z = rng() * 2 - 1, r = .64;
    return { p: V(Math.sqrt(1 - z * z) * Math.cos(a) * r, z * r * .85, Math.sqrt(1 - z * z) * Math.sin(a) * r).add(nlc), r: .035 };
  }), material('nucleolus-grains', '#e6bcd0'));

  // Paired corrugated cisternal surfaces, rounded margins and bound ribosomes.
  const erMat = material('er', '#7987b6'), erEdge = material('erEdge', '#b2b4d9');
  const bound = [];
  function erPoint(u, v, layer, side = 0) {
    const a = -.1 + u * Math.PI * 1.61, r = 2.16 + v * (1.7 + .35 * Math.sin(a * 4) + .15 * Math.cos(a * 7));
    return V(nuc.x + Math.cos(a) * r, nuc.y - .55 - layer * .37 + .25 * Math.sin(a * 3 + v * 4) + .07 * Math.sin(a * 9) * v + v * .16 + side, nuc.z + Math.sin(a) * r * .79 - .18);
  }
  for (let layer = 0; layer < 5; layer++) {
    for (const side of [-.042, .042]) add('rough-er', surface((u, v) => erPoint(u, v, layer, side), 78, 18), erMat);
    for (const v of [0, 1]) tube('rough-er', Array.from({ length: 70 }, (_, i) => erPoint(i / 69, v, layer)), .048, erEdge, false, 100);
    for (let i = 0; i < 180; i++) bound.push({ p: erPoint(rng(), .04 + rng() * .95, layer, .09), r: .045 + rng() * .016 });
  }
  tube('rough-er', [nuc.clone().add(V(-nr, 0, 0)), nuc.clone().add(V(-2.15, -.1, 0)), erPoint(Math.PI / (Math.PI * 1.61), 0, 0)], .14, erMat, false, 24);
  for (let layer = 0; layer < 4; layer++) {
    tube('rough-er', [erPoint(.64,0,layer), erPoint(.64,.07,layer).lerp(erPoint(.64,.07,layer+1),.5), erPoint(.64,0,layer+1)], .11, erMat, false, 16);
  }
  beads('rough-er', bound, material('boundRibo', '#e1c9b7'));
  // Reconnecting branches with shared endpoints; a bridge joins the rough ER.
  const serMat = material('smoothER', '#68aaa4'), serHi = material('smoothERHi', '#9ac8bc');
  const serNodes = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) serNodes.push(V(1.4 + i * .56 + .17 * Math.sin(j), -1.4 + j * .43 + .16 * Math.sin(i), -1.7 + .35 * Math.sin(i + j)));
  for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) {
    const p = serNodes[i * 5 + j];
    for (const q of [i < 5 ? serNodes[(i + 1) * 5 + j] : null, j < 4 ? serNodes[i * 5 + j + 1] : null]) {
      if (!q) continue;
      tube('smooth-er', [p, p.clone().lerp(q, .5).add(V(.08, .04, .17)), q], .075, (i + j) % 3 ? serMat : serHi, false, 15);
    }
  }
  tube('smooth-er', [erPoint(.98, 1, 1), V(1, -.8, -2.4), serNodes[0]], .1, serMat);
  for (let i = 0; i < 8; i++) tube('smooth-er', [serNodes[i * 3], V(2.4 + rng() * 2, .7 + rng(), -1 + rng()), V(2 + rng() * 2, 1.6, -1 + rng())], .073, serMat);

  // Curved Golgi cisternae with a narrow lumen and swollen rims.
  const golgi = material('golgi', '#c99c60'), golgiRim = material('golgiRim', '#edc891');
  const gc = V(2.4, 1.4, 1.2);
  function golgiPoint(u, v, layer, side = 0) {
    const a = -.95 + u * 1.9, width = .28 + v * .62, span = 1 - Math.abs(layer - 2.5) * .06;
    return V(gc.x + Math.sin(a) * 1.78 * span, gc.y + layer * .25 + .36 * (1 - Math.cos(a)) + side + .035 * Math.sin(u * 15 + v * 5), gc.z + Math.cos(a) * width * span);
  }
  for (let k = 0; k < 6; k++) {
    for (const side of [-.036, .036]) add('golgi', surface((u, v) => golgiPoint(u, v, k, side), 54, 14), golgi);
    for (const v of [0, 1]) tube('golgi', Array.from({ length: 40 }, (_, i) => golgiPoint(i / 39, v, k)), .065, golgiRim);
    for (const u of [0, 1]) tube('golgi', [golgiPoint(u, 0, k), golgiPoint(u, .5, k), golgiPoint(u, 1, k)], .065, golgiRim);
  }
  const buds = [];
  for (let i = 0; i < 26; i++) {
    const p = V(gc.x + (i % 2 ? 1 : -1) * (1.52 + rng() * .58), gc.y + rng() * 1.9, gc.z + .25 + rng() * .9);
    buds.push({ p, r: .10 + rng() * .10 });
    if (i < 6) tube('golgi', [golgiPoint(i % 2, .5, i), p], .05, golgi);
  }
  beads('golgi', buds, golgiRim, new THREE.SphereGeometry(1, 14, 10));

  const mitoOuter = material('mitoOuter', '#c97861'), mitoInner = material('mitoInner', '#b78251');
  const cristaeMat = material('cristae', '#e9b77c'), mitoEdge = material('mitoEdge', '#ecae89');
  const mitoPositions = [
    [3.6,-1.55,2.6,1.08,.3], [-3.6,-1.6,2.8,.95,-.7], [0,-3,2.1,.98,.1], [4.6,.7,-.1,.88,1.1],
    [-4.5,2.1,.1,.9,-.7], [1.2,3.5,.1,.86,.4], [-.8,-3.5,-.9,1.05,.2], [3.1,-2.8,-1.7,.92,-.4],
    [-4.3,-2,-1.4,.88,.5], [3,2.3,-2.5,.82,-.6], [-1,2.7,-2.7,.86,.3], [5.2,-1.1,-1.7,.75,1.2],
    [-5.4,.1,.4,.82,1], [1.25,-1.3,3.6,.7,-.55],
  ];
  mitoPositions.forEach(([x,y,z,s,rot], idx) => {
    const trans = new THREE.Matrix4().compose(V(x,y,z), new THREE.Quaternion().setFromEuler(new THREE.Euler(.15 + idx * .06, -.18, rot)), V(s,s,s));
    function mp(u, v, inner = false) {
      const theta = .04 + v * (Math.PI - .08), a = 2.67 + u * 4.04;
      const length = inner ? 1.2 : 1.3, rad = inner ? .425 : .52;
      const xx = Math.cos(theta) * length;
      return V(xx, Math.sin(theta) * Math.cos(a) * rad + .12 * xx * xx, Math.sin(theta) * Math.sin(a) * rad);
    }
    add('mitochondria', surface((u,v) => mp(u,v), 30, 30), mitoOuter, trans);
    add('mitochondria', surface((u,v) => mp(u,v,true), 30, 30), mitoInner, trans);
    for (const u of [0,1]) {
      const points = Array.from({ length: 35 }, (_, j) => mp(u,j/34).applyMatrix4(trans));
      tube('mitochondria', points, .022 * s, mitoEdge);
    }
    for (let fold = 0; fold < 10; fold++) {
      const xx = -.98 + fold * .21, rr = .425 * Math.sqrt(1 - (xx / 1.2) ** 2);
      const g = surface((u,v) => {
        const a = 2.67 + u * 4.04, r = rr * (.15 + v * .85);
        return V(xx + .055 * Math.sin(a * 3) * v, r * Math.cos(a) + .12 * xx * xx, r * Math.sin(a));
      }, 24, 5);
      add('mitochondria', g, cristaeMat, trans);
    }
  });

  const vesicles = [
    ['lysosomes', '#9ba66c', [[-2.4,-3,1.1], [4,1.4,2.5], [-4,1.3,2.2], [1,-2.5,-2.8]], .41],
    ['peroxisomes', '#c6b580', [[-3.4,3,.1], [4,-.3,2.7], [.1,3.6,1], [-3,-3.1,-1.9], [1.7,-3.7,.1]], .28],
    ['endosomes', '#7aa7c1', [[3.7,2.8,1.2], [-4.9,-.7,1.9], [.4,-3.3,3], [5,.4,1.4]], .42],
  ];
  for (const [id, color, locations, radius] of vesicles) {
    const shell = material(id, color, { transparent: true, opacity: .47, depthWrite: false, roughness: .24 });
    const cargo = material(id + 'cargo', color);
    const interior = [];
    for (const location of locations) {
      const center = V(...location);
      const geo = new THREE.SphereGeometry(radius, 24, 16); geo.translate(...location); add(id, geo, shell);
      for (let j = 0; j < (id === 'endosomes' ? 8 : 16); j++) {
        const p = V((rng() - .5) * radius, (rng() - .5) * radius, (rng() - .5) * radius).add(center);
        interior.push({ p, r: id === 'endosomes' ? .08 : .045 + rng() * .035 });
      }
    }
    beads(id, interior, cargo, new THREE.IcosahedronGeometry(1, 1));
  }

  const free = [];
  for (let i = 0; i < 1000; i++) {
    const p = V((rng() - .5) * 12.7, (rng() - .5) * 9, (rng() - .5) * 8);
    if ((p.x / 6.8) ** 2 + (p.y / 4.8) ** 2 + (p.z / 4.6) ** 2 > .86 || p.distanceTo(nuc) < 2.35) { i--; continue; }
    free.push({ p, r: .026 + rng() * .019, scale: V(1.3, .85, 1) });
  }
  const freeMat = material('freeRibo', '#d8c4a6', { roughness: .9 });
  beads('ribosomes', free, freeMat, new THREE.IcosahedronGeometry(1, 0));
  beads('ribosomes', free.map(b => ({ p: b.p.clone().add(V(.026,.023,0)), r: b.r * .7 })), freeMat, new THREE.IcosahedronGeometry(1, 0));

  const cytoMat = material('cyto', '#537b7d', { transparent: true, opacity: .36, roughness: .8 });
  const actinMat = material('actin', '#688889', { transparent: true, opacity: .24 });
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU;
    const points = [V(.6,-1,-1), V(2.9 * Math.cos(a), 2.2 * Math.sin(a), -2.2), V(5.3 * Math.cos(a), 3.7 * Math.sin(a), -1.4), V(6.3 * Math.cos(a), 4.2 * Math.sin(a), .2)];
    tube('cytoskeleton', points, i % 3 ? .024 : .033, cytoMat, false, 70);
  }
  for (let k = 0; k < 42; k++) {
    const phase = rng() * TAU, theta0 = 1.32 + rng() * 1.35;
    const pts = Array.from({ length: 30 }, (_, j) => {
      const t = j / 29, a = phase + t * (k % 2 ? 1.7 : .6);
      const theta = Math.min(3.04, Math.max(1.26, theta0 + (t - .5) * (k % 2 ? .3 : 1.3) + .07 * Math.sin(t * 8 + phase)));
      return V(7 * Math.sin(theta) * Math.cos(a), 5.1 * Math.sin(theta) * Math.sin(a), 4.7 * Math.cos(theta));
    });
    tube('cytoskeleton', pts, .016, actinMat, false, 45);
  }

  // An open ellipsoid makes the view readable; paired rims imply a bilayer, not exact scale.
  const membraneMat = material('membrane', '#799da8', { transparent: true, opacity: .14, depthWrite: false, roughness: .3, metalness: .16 });
  const membraneRim = material('membraneRim', '#9ab9bc', { transparent: true, opacity: .63, roughness: .4 });
  function membranePoint(u,v,scale=1) {
    const a = u * TAU, t = 1.24 + v * (Math.PI - 1.24), wave = 1 + .018 * Math.sin(a * 5) * Math.sin(t * 4);
    return V(7.2 * Math.sin(t) * Math.cos(a), 5.25 * Math.sin(t) * Math.sin(a), 4.9 * Math.cos(t)).multiplyScalar(scale * wave);
  }
  add('membrane', surface((u,v)=>membranePoint(u,v), 120, 60), membraneMat);
  for (const scale of [1,.988]) tube('membrane', Array.from({length:120}, (_,i)=>membranePoint(i/120,0,scale)), .026, membraneRim, true, 180);
  const proteins = [];
  for (let i = 0; i < 220; i++) proteins.push({ p: membranePoint(rng(),rng()*.8), r: .035 + rng() * .022, scale: V(.8,1.5,.8) });
  beads('membrane', proteins, membraneRim);

  for (const { id, mat, geos } of batches.values()) {
    const merged = mergeGeometries(geos, false);
    const mesh = new THREE.Mesh(merged, mat); mesh.userData.id = id; groups.get(id).add(mesh);
    for (const geo of geos) geo.dispose();
  }
  const focuses = {
    nucleus: [nuc, 6.8], nucleolus: [nlc, 3.5], 'rough-er': [V(-1.9,-.2,.5),9],
    'smooth-er': [V(2.8,-.2,-1.2),6], golgi: [gc.clone().add(V(0,.6,.5)),5.8],
    mitochondria: [V(3.6,-1.55,2.6),4.9], lysosomes: [V(4,1.4,2.5),3.2],
    peroxisomes: [V(-3.4,3,.1),3], endosomes: [V(3.7,2.8,1.2),3.1],
    ribosomes: [V(1,-1,2),8], cytoskeleton: [V(0,0,0),19], membrane: [V(0,0,0),20],
  };
  for (const [id, [point, distance]] of Object.entries(focuses)) groups.get(id).userData.focus = { point, distance };
  const manifest = {
    nuclearMembranes: 2, mitochondrialMembranes: 2, poreSymmetry: 8,
    chromatin: 'interphase fibers', golgiRibosomes: 0, plantOrganelles: 0,
    mitochondria: mitoPositions.length, boundRibosomes: bound.length, freeRibosomes: free.length,
    nuclearPores: poreDirs.length, roughERConnected: true, smoothERConnected: true, corticalTopology: 'irregular mesh', seed: model.seed,
  };
  return { root, groups, materials: allMaterials, manifest, dispose() {
    root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); allMaterials.forEach(m => m.dispose());
  } };
}
