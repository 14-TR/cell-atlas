import * as THREE from 'three';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const signedPower = (n, power) => Math.sign(n) * Math.abs(n) ** power;

// All dimensions below are illustration coordinates, never physical units.
export const plantLayout = {
  nucleus: [-4.85, .8, .4], assemblyScale: .42,
  vacuole: { center: [1.4, 0, -.4], radii: [3.6, 3.6, 3], power: .55 },
  mitochondria: [[-5.5,-2.7,1.2,.6,.3],[-2.5,4.2,1.4,.55,.1],[3.3,4.3,.6,.6,-.1],[5.8,.3,1,.62,1.2],[3.5,-4.4,.5,.58,.1],[-2.1,-4.1,1,.55,-.3]],
  chloroplasts: [[-5.5,3.2,.3,.85,-.3],[-4.7,-3.9,-.1,.88,.2],[5.6,2.75,.3,.83,1.1],[5.7,-2.6,.4,.85,-1.1],[.3,4.2,.3,.72,0],[.6,-4.2,.2,.72,0]],
  golgiSites: [[-1.9,3.9,1.8],[3.3,-3.9,1.7]], golgiScale: .4,
  peroxisomes: [[-4,3.7,1.3],[4.5,3.6,1.1],[4.7,-3.6,1.4]],
  endosomes: [[-3,-3.5,1.8],[5.7,-1,1.6],[-2.5,3.1,2]],
};

export function roundedPoint(u, v, radii, power = .36, opening = 1.24) {
  const a = u * TAU, t = opening + v * (Math.PI - opening);
  return V(radii[0] * signedPower(Math.sin(t) * Math.cos(a), power), radii[1] * signedPower(Math.sin(t) * Math.sin(a), power), radii[2] * signedPower(Math.cos(t), power));
}
export function inVacuole(p, layout, margin = 1) {
  const { center, radii, power } = layout.vacuole;
  return [p.x,p.y,p.z].reduce((sum,n,i) => sum + Math.abs((n-center[i])/(radii[i]*margin)) ** (2/power), 0) < 1;
}
export function inPlant(p) {
  return (Math.abs(p.x/6.65)**(2/.36) + Math.abs(p.y/4.8)**(2/.36) + Math.abs(p.z/3.9)**(2/.36)) < 1;
}

export function buildPlant({ add, tube, beads, material, surface, detail }) {
  const layout = plantLayout;
  const wall = material('cellWall', '#9da775', { transparent: true, opacity: .22, depthWrite: false, roughness: .8 });
  const edge = material('wallEdge', '#bfbe83', { roughness: .8 });
  const fibers = material('wallFibers', '#bac494', { transparent: true, opacity: .48, roughness: .9 });
  const membrane = material('membrane', '#799da8', { transparent: true, opacity: .12, depthWrite: false, roughness: .3 });
  const membraneRim = material('membraneRim', '#9ab9bc', { transparent: true, opacity: .7 });
  const dimensions = [7.2,5.25,4.4];
  const point = (u,v,scale=1) => roundedPoint(u,v,dimensions).multiplyScalar(scale);
  for (const scale of [1,.976]) {
    add('cell-wall', surface((u,v)=>point(u,v,scale), 120,60), wall);
    tube('cell-wall', Array.from({length:120},(_,i)=>point(i/120,0,scale)), .05, edge, true, 180);
  }
  // Crossed microfibril-like paths are wall texture, not molecular cellulose.
  for (let k=0;k<32;k++) {
    const pts = Array.from({length:65},(_,i)=>point(k/32 + (i/64-.5)*.075, i/64*.91, .993));
    tube('cell-wall',pts,.025,fibers,false,70);
  }
  for(let k=1;k<13;k++) tube('cell-wall',Array.from({length:100},(_,i)=>point(i/100,k/14,.991)),.024,fibers,true,120);
  add('membrane',surface((u,v)=>point(u,v,.945),120,60),membrane);
  for(const scale of [.945,.937]) tube('membrane',Array.from({length:120},(_,i)=>point(i/120,0,scale)),.026,membraneRim,true,180);
  buildVacuole({ add,tube,beads,material,surface }, layout);
  const outer = material('chloroplastOuter','#6c9d5d'), inner = material('chloroplastInner','#95bd6d');
  const thylakoid = material('thylakoids','#447653'), lamella = material('stromaLamellae','#79a774');
  for(const [x,y,z,scale,rot] of layout.chloroplasts) {
    const transform = new THREE.Matrix4().compose(V(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(.25,.12,rot)),V(scale,scale,scale));
    const cp = (u,v,s=1) => roundedPoint(u,v,[1.38,.72,.49],1,.99).multiplyScalar(s);
    for(const [s,mat] of [[1,outer],[.91,inner]]) {
      add('chloroplasts',surface((u,v)=>cp(u,v,s),Math.round(54*detail),24),mat,transform);
      tube('chloroplasts',Array.from({length:65},(_,i)=>cp(i/64,0,s).applyMatrix4(transform)),.025*scale,mat,true,85);
    }
    // Stacks of flattened closed discs, joined laterally by lamellae.
    for(const gx of [-.73,0,.73]) for(let k=0;k<5;k++) {
      const disc=new THREE.CylinderGeometry(.29,.29,.045,24);
      disc.translate(gx, -.24+k*.095, .06*Math.sin(gx*4));
      add('chloroplasts',disc,thylakoid,transform);
    }
    for(const k of [0,2,4]) {
      const sheet=surface((u,v)=>V(-.73+u*1.46,-.24+k*.095+.025*Math.sin(u*TAU),(v-.5)*.2),30,4);
      add('chloroplasts',sheet,lamella,transform);
    }
  }
  buildPlantCortex({tube,material});
  return {
    focuses: { 'cell-wall': [V(0,0,0),22], membrane: [V(0,0,0),21], vacuole:[V(...layout.vacuole.center),13], chloroplasts:[V(...layout.chloroplasts[2].slice(0,3)),5.5] },
    manifest: { chloroplasts:layout.chloroplasts.length, chloroplastEnvelopeMembranes:2, vacuoleMembranes:1, wallComposition:'cellulose, hemicelluloses, pectins and proteins', golgiArrangement:'discrete stacks' },
  };
}
function buildVacuole({add,tube,beads,material,surface}, layout) {
  const {center,radii,power}=layout.vacuole;
  const p=(u,v)=>roundedPoint(u,v,radii,power,1.0).add(V(...center));
  const tonoplast=material('tonoplast','#7da7b8',{transparent:true,opacity:.23,depthWrite:false,roughness:.25});
  const edge=material('tonoplastEdge','#9bc8cc',{transparent:true,opacity:.7});
  add('vacuole',surface(p,100,55),tonoplast);
  tube('vacuole',Array.from({length:100},(_,i)=>p(i/100,0)),.035,edge,true,150);
}
export const fungalLayout = {
  nucleus: [-3,1.9,.3], assemblyScale:.46,
  vacuole: {center:[-.6,-1.25,-.3],radii:[2.05,1.8,1.8],power:1},
  mitochondria: [[1.3,1.2,.5,.57,1.1],[-4.1,-1.7,.8,.55,1],[-.5,3.2,.3,.57,.1],[-2.2,-3.3,.4,.55,-.2],[.6,-2.65,.85,.44,.8],[4.6,.1,.2,.5,.1]],
  golgiSites:[[-3,-2.5,1],[-.5,2.5,.8],[.95,1.4,.5],[1.2,-.4,.9],[-3.8,.1,1.4],[4.6,-.25,.1]],golgiScale:.38,
  peroxisomes:[[-3.7,2.4,.6],[.1,-3.1,.8],[1.3,.1,1.6]],
  endosomes:[[-3.4,-1.4,1.7],[-1.3,2.8,1.5],[4.3,-.8,.5]],
};
const yeastProfile = new THREE.CatmullRomCurve3([
  [-5.7,0],[-5.5,1.35],[-4.5,3],[-2.7,4.05],[-.6,4.1],[1.15,3.1],
  [2.3,1.6],[2.85,.86],[3.35,1.2],[4.6,1.72],[5.8,.88],[6,0],
].map(([x,r])=>V(x,r,0)),false,'centripetal');
function yeastPoint(u,v,scale=1) {
  const p=yeastProfile.getPoint(v), a=.95+u*(TAU-1.9);
  return V(p.x,p.y*Math.sin(a),p.y*Math.cos(a)*.78).multiplyScalar(scale);
}
// A sampled axial radius also keeps particles inside the asymmetric bud outline.
const yeastRadii=Array.from({length:501},(_,i)=>yeastProfile.getPoint(i/500));
export function inYeast(p) {
  const x=p.x/.94;
  const i=yeastRadii.findIndex(q=>q.x>=x);
  if(i<1)return false;
  const a=yeastRadii[i-1],b=yeastRadii[i],r=THREE.MathUtils.lerp(a.y,b.y,(x-a.x)/(b.x-a.x))*.92;
  return (p.y/r)**2+(p.z/(r*.78))**2<1;
}
export function buildFungal({add,tube,beads,material,surface}) {
  const wall=material('yeastWall','#b59c79',{transparent:true,opacity:.24,depthWrite:false,roughness:.8});
  const wallEdge=material('wallEdge','#d0b589');
  const fibers=material('wallFibers','#bfaa84',{transparent:true,opacity:.36});
  const membrane=material('membrane','#799da8',{transparent:true,opacity:.14,depthWrite:false});
  const membraneEdge=material('membraneRim','#9ab9bc',{transparent:true,opacity:.65});
  for(const scale of [1,.972]) {
    add('cell-wall',surface((u,v)=>yeastPoint(u,v,scale),90,130),wall);
    for(const u of [0,1]) tube('cell-wall',Array.from({length:150},(_,i)=>yeastPoint(u,i/149,scale)),.04,wallEdge,false,180);
  }
  for(let k=1;k<30;k++) tube('cell-wall',Array.from({length:80},(_,i)=>yeastPoint(i/79,k/30,.99)),.02,fibers,false,100);
  for(let k=0;k<20;k++) tube('cell-wall',Array.from({length:100},(_,i)=>yeastPoint(k/20,i/99,.995)),.018,fibers,false,120);
  add('membrane',surface((u,v)=>yeastPoint(u,v,.94),90,130),membrane);
  for(const u of [0,1]) for(const scale of [.94,.933]) tube('membrane',Array.from({length:150},(_,i)=>yeastPoint(u,i/149,scale)),.026,membraneEdge,false,180);
  buildVacuole({add,tube,beads,material,surface},fungalLayout);
  const cargo=material('vacuoleCargo','#95a5a1');
  beads('vacuole',Array.from({length:25},(_,i)=>({p:V(-.8+.55*Math.sin(i*2.4),-1.8+.4*Math.cos(i*1.7),-.5+.35*Math.sin(i)),r:.06+(i%4)*.018})),cargo);
  const chitin=material('chitinRings','#e1c89b');
  const ring=new THREE.TorusGeometry(.89,.055,8,64);ring.rotateY(Math.PI/2);ring.scale(1,1,.78);ring.translate(2.85,0,0);add('bud-neck',ring,chitin);
  for(const [u,v] of [[.065,.27],[.16,.19],[.88,.32]]) {
    const center=yeastPoint(u,v,1.007),a=.95+u*(TAU-1.9);
    const normal=V(0,Math.sin(a),Math.cos(a)/.78).normalize();
    const transform=new THREE.Matrix4().compose(center,new THREE.Quaternion().setFromUnitVectors(V(0,0,1),normal),V(1,1,1));
    add('bud-neck',new THREE.TorusGeometry(.3,.045,8,36),chitin,transform);
  }
  const cortex=material('yeastCortex','#789993',{transparent:true,opacity:.4});
  for(let i=0;i<15;i++) tube('cytoskeleton',Array.from({length:90},(_,j)=>yeastPoint(i/15,j/89,.88)),.022,cortex,false,125);
  return {focuses:{'cell-wall':[V(0,0,0),20],membrane:[V(0,0,0),20],vacuole:[V(...fungalLayout.vacuole.center),8],'bud-neck':[V(2.85,0,0),7]},
    manifest:{chloroplasts:0,vacuoleMembranes:1,wallComposition:'beta-glucans, mannoproteins and chitin',golgiArrangement:'dispersed unstacked cisternae',budConnection:'open'}};
}
function buildPlantCortex({tube,material}) {
  const mat=material('plantCortex','#7b9695',{transparent:true,opacity:.38});
  for(let k=0;k<22;k++) tube('cytoskeleton',Array.from({length:80},(_,i)=>roundedPoint(i/80,k/25,[6.6,4.75,3.9])),.022,mat,true,110);
}
