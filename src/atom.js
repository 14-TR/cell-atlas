import * as THREE from 'three';

// An educational shell-count model. Markers do not trace electron trajectories.
export function createAtom(element) {
  const root = new THREE.Group();
  const protonPositions = [], neutronPositions = [], electronPositions = [];
  const nucleusRadius = .2 + Math.cbrt(element.massNumber) * .16;
  const matrix = new THREE.Matrix4();
  function particles(name, positions, color, radius) {
    const geometry = new THREE.SphereGeometry(radius, 14, 10);
    const material = new THREE.MeshStandardMaterial({color, roughness:.43, metalness:.08});
    const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
    mesh.name = name;
    positions.forEach((p, i) => mesh.setMatrixAt(i, matrix.makeTranslation(...p.toArray())));
    root.add(mesh);
  }
  for (let i = 0; i < element.massNumber; i++) {
    const y = 1 - 2 * (i + .5) / element.massNumber;
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const radial = Math.sqrt(1 - y * y);
    const r = nucleusRadius * Math.cbrt(.15 + .85 * ((i * .61803398875) % 1));
    const p = new THREE.Vector3(radial * Math.cos(angle), y, radial * Math.sin(angle)).multiplyScalar(r);
    // Interleave both particle kinds throughout the illustrative nucleus.
    const isProton = Math.floor((i + 1) * element.number / element.massNumber) > Math.floor(i * element.number / element.massNumber);
    (isProton ? protonPositions : neutronPositions).push(p);
  }
  particles('protons', protonPositions, '#da997d', .18);
  particles('neutrons', neutronPositions, '#b0bbc8', .18);
  element.shells.forEach((count, shell) => {
    const radius = 2 + shell * .7;
    const rotation = new THREE.Euler(.25 + shell * .19, shell % 2 ? -.35 : .35, shell * .13);
    const point = angle => new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0).applyEuler(rotation);
    const guide = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(Array.from({length:128}, (_, i) => point(i / 128 * Math.PI * 2))),
      new THREE.LineBasicMaterial({color:'#91b4ae', transparent:true, opacity:.5}),
    );
    guide.name = `shell-${shell + 1}`;
    root.add(guide);
    for (let i = 0; i < count; i++) electronPositions.push(point((i / count + shell * .07) * Math.PI * 2));
  });
  particles('electrons', electronPositions, '#b9e3d6', .115);
  let disposed = false;
  return {root, radius:2 + (element.shells.length - 1) * .7, dispose() {
    if (disposed) return;
    disposed = true;
    root.traverse(o => {if (o.isInstancedMesh) o.dispose(); o.geometry?.dispose(); o.material?.dispose();});
  }};
}
