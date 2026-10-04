import * as THREE from 'three';

// Teaching animation, not a dynamics solver: these paths are not real trajectories.
export function createAtom(element) {
  const root = new THREE.Group();
  const protonPositions = [], neutronPositions = [], electronPositions = [];
  const electronPaths = [];
  const nucleusRadius = .2 + Math.cbrt(element.massNumber) * .16;
  const matrix = new THREE.Matrix4();
  function particles(name, positions, color, radius) {
    const geometry = new THREE.SphereGeometry(radius, 14, 10);
    const material = new THREE.MeshStandardMaterial({color, roughness:.38, metalness:.08, emissive:color, emissiveIntensity:name === 'electrons' ? .65 : .12});
    const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
    mesh.name = name;
    positions.forEach((p, i) => mesh.setMatrixAt(i, matrix.makeTranslation(...p.toArray())));
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(mesh);
    return mesh;
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
  const protons = particles('protons', protonPositions, '#ff9166', .18);
  const neutrons = particles('neutrons', neutronPositions, '#91b7ff', .18);
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
    for (let i = 0; i < count; i++) {
      const phase = (i / count + shell * .07) * Math.PI * 2;
      electronPaths.push({radius, rotation, phase, speed:(shell % 2 ? -1 : 1) * (.65 / (1 + shell * .18))});
      electronPositions.push(point(phase));
    }
  });
  const electrons = particles('electrons', electronPositions, '#7ff7e2', .13);
  // Original qualitative haze: soft spherical samples, NOT |psi|², orbital
  // occupations, or a solved multi-electron wavefunction. Clear the enlarged
  // nucleus for teaching legibility. It is optional and off by default.
  const cloudPositions = [];
  let seed = element.number;
  const random = () => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;return seed / 4294967296;};
  element.shells.forEach((_, shell) => {
    for (let i = 0; i < 240; i++) {
      const y = 2 * random() - 1, angle = random() * Math.PI * 2;
      const r = nucleusRadius + .3 + (1.6 + shell * .7 - nucleusRadius) * Math.pow(random(), .65);
      const radial = Math.sqrt(1 - y * y);
      cloudPositions.push(r * radial * Math.cos(angle), r * y, r * radial * Math.sin(angle));
    }
  });
  const cloudGeometry = new THREE.BufferGeometry();
  cloudGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cloudPositions, 3));
  const cloud = new THREE.Points(cloudGeometry, new THREE.ShaderMaterial({
    uniforms:{time:{value:0}}, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:`
      void main() {
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
        gl_PointSize = clamp(220.0 / -p.z, 2.0, 48.0);
      }`,
    fragmentShader:`
      uniform float time;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float glow = exp(-5.0 * d * d) * (1.0 - d);
        gl_FragColor = vec4(0.25, 0.75, 0.85, glow * (0.085 + 0.01 * sin(time * 1.2)));
      }`,
  }));
  cloud.name = 'probability-cloud';cloud.visible = false;root.add(cloud);
  let disposed = false;
  const display = {cloud:false, particles:true, nucleus:false};
  function setDisplay(options) {
    if (disposed) return;
    for (const key of Object.keys(display)) if (typeof options[key] === 'boolean') display[key] = options[key];
    cloud.visible = display.cloud;
    for (const mesh of [protons, neutrons, electrons]) mesh.visible = display.particles;
    // Enlarge in place, never move nucleons onto an electron guide.
    const scale = display.nucleus ? Math.min(1.65, 1.62 / (nucleusRadius + .04)) : 1;
    protons.scale.setScalar(scale);neutrons.scale.setScalar(scale);
  }
  const position = new THREE.Vector3();
  function update(time) {
    if (disposed || !Number.isFinite(time) || time < 0) return;
    cloud.material.uniforms.time.value = time;
    electronPaths.forEach(({radius, rotation, phase, speed}, i) => {
      const angle = phase + time * speed;
      position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0).applyEuler(rotation);
      electrons.setMatrixAt(i, matrix.makeTranslation(position.x, position.y, position.z));
    });
    for (const [mesh, rest, offset] of [[protons, protonPositions, 0], [neutrons, neutronPositions, 1.7]]) {
      rest.forEach((p, i) => {
        const phase = i * 2.4 + offset;
        // Tiny local displacement, never a nucleon orbit or emitted particle.
        position.set(
          p.x + .02 * Math.sin(time * 1.3 + phase),
          p.y + .02 * Math.sin(time * 1.1 + phase * 1.3),
          p.z + .02 * Math.sin(time * 1.5 + phase * .7),
        );
        mesh.setMatrixAt(i, matrix.makeTranslation(position.x, position.y, position.z));
      });
    }
    for (const mesh of [protons, neutrons, electrons]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }
  update(0);
  return {root, update, setDisplay, radius:2 + (element.shells.length - 1) * .7, dispose() {
    if (disposed) return;
    disposed = true;
    root.traverse(o => {if (o.isInstancedMesh) o.dispose(); o.geometry?.dispose(); o.material?.dispose();});
  }};
}
