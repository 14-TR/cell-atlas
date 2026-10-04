import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const V=(x,y,z)=>new THREE.Vector3(x,y,z), TAU=Math.PI*2;

// Independent generators keep the original three specimens byte-preserved.
export function createSpecializedCell(definition,quality='balanced') {
  const root=new THREE.Group(),groups=new Map(),materials=[],batches=new Map();
  const detail=quality==='low'?1:quality==='high'?2:1.5;
  for(const s of definition.structures){const g=new THREE.Group();g.name=s.id;g.userData.id=s.id;groups.set(s.id,g);root.add(g);}
  function material(id,options={}) {
    const m=new THREE.MeshStandardMaterial({color:definition.structures.find(s=>s.id===id).color,roughness:.5,metalness:.06,side:THREE.DoubleSide,...options});
    m.name=id;materials.push(m);return m;
  }
  function add(id,geometry,mat) {
    const key=id+mat.uuid;
    if(!batches.has(key))batches.set(key,{id,mat,geos:[]});
    batches.get(key).geos.push(geometry);
  }
  function surface(fn,nu=64,nv=32){
    const positions=[],indices=[];
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)positions.push(...fn(i/nu,j/nv).toArray());
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function tube(id,points,radius,mat,closed=false){add(id,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed),Math.round(64*detail),radius,8,closed),mat);}
  function beads(id,points,mat,radius=.07){
    const mesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(radius,1),mat,points.length),m=new THREE.Matrix4();
    points.forEach((p,i)=>mesh.setMatrixAt(i,m.makeTranslation(...p.toArray())));mesh.userData.id=id;groups.get(id).add(mesh);
  }
  function focus(id,point,distance){groups.get(id).userData.focus={point:V(...point),distance};}
  const api={add,surface,tube,beads,material,focus};
  if(definition.id==='bacterium')buildBacterium(api);
  if(definition.id==='neuron')buildNeuron(api);
  if(definition.id==='red-blood-cell')buildRedCell(api);
  for(const {id,mat,geos} of batches.values()){
    const mesh=new THREE.Mesh(mergeGeometries(geos,false),mat);mesh.userData.id=id;groups.get(id).add(mesh);geos.forEach(g=>g.dispose());
  }
  return {root,groups,materials,manifest:{modelId:definition.id,seed:definition.seed},dispose(){
    root.traverse(o=>{if(o.isInstancedMesh)o.dispose();o.geometry?.dispose();});materials.forEach(m=>m.dispose());
  }};
}
function buildRedCell({add,surface,tube,beads,material,focus}) {
  const disc=(u,v,scale=1)=>{const a=u*TAU,t=v*Math.PI,r=5*Math.sin(t);return V(r*Math.cos(a),r*Math.sin(a),Math.cos(t)*(.55+2.5*Math.sin(t)**2)).multiplyScalar(scale);};
  add('membrane',surface((u,v)=>disc(.075+u*.85,v),100,64),material('membrane',{color:'#ad4e60',roughness:.42}));
  add('membrane',surface((u,v)=>disc(-.075+u*.15,v),24,64),material('membrane',{transparent:true,opacity:.16,depthWrite:false,roughness:.42}));
  focus('membrane',[0,0,0],19);
  const skeleton=material('cytoskeleton',{transparent:true,opacity:.45,depthWrite:false});
  // A uniform shrink protrudes through the concave center: thin depth separately.
  const innerDisc=(u,v)=>disc(u,v).multiply(V(.985,.985,.92));
  for(let k=0;k<18;k++)tube('cytoskeleton',Array.from({length:65},(_,i)=>innerDisc(k/18,i/64)),.018,skeleton);
  for(let k=1;k<14;k++)tube('cytoskeleton',Array.from({length:80},(_,i)=>innerDisc(i/80,k/14)),.018,skeleton,true);
  focus('cytoskeleton',[0,0,0],18);
  const clusters=[];
  for(let i=0;i<160;i++){
    const a=i*2.399963,r=4.65*Math.sqrt((i+.5)/160),z=Math.sin(i*3.7)*.3;
    for(const [dx,dy,dz] of [[-.065,0,0],[.065,0,0],[0,.07,.06],[0,-.07,-.06]])clusters.push(V(r*Math.cos(a)+dx,r*Math.sin(a)+dy,z+dz));
  }
  beads('hemoglobin',clusters,material('hemoglobin'),.075);focus('hemoglobin',[1.5,1,.2],7);
}
function buildNeuron({add,surface,tube,beads,material,focus}) {
  const soma=V(-2,0,0);
  const shell=(u,v,r)=>{const a=u*TAU,t=.95+v*(Math.PI-.95);return V(r*Math.sin(t)*Math.cos(a),r*Math.sin(t)*Math.sin(a),r*Math.cos(t)).add(soma);};
  add('membrane',surface((u,v)=>shell(u,v,1.8)),material('membrane',{transparent:true,opacity:.27,depthWrite:false}));
  tube('membrane',Array.from({length:64},(_,i)=>shell(i/64,0,1.8)),.035,material('membrane'),true);focus('membrane',[-2,0,0],8);
  add('nucleus',surface((u,v)=>shell(u,v,.9)),material('nucleus'));
  beads('nucleus',[soma.clone().add(V(0,0,.25))],material('nucleus',{color:'#e4b7c7'}),.3);focus('nucleus',[-2,0,0],4.5);
  const dendrite=material('dendrites');
  for(const [x,y,z] of [[-6.4,0,.2],[-5.5,3.3,-.3],[-3.2,4,.2],[-5.1,-3.3,-.1],[-2.7,-4,.3]]){
    const tip=V(x,y,z),mid=soma.clone().lerp(tip,.6);
    tube('dendrites',[soma,mid,tip],.14,dendrite);
    for(const s of [-1,1])tube('dendrites',[mid,tip,tip.clone().add(V(-.9,s*.85,s*.4))],.065,dendrite);
  }
  focus('dendrites',[-4.5,0,0],15);
  const axon=material('axon');tube('axon',[V(-.7,0,0),V(.4,-.55,0),V(2.5,-.7,.2),V(5.5,-.2,0)],.16,axon);focus('axon',[2.6,-.5,0],10);
  const endings=material('terminals'),tips=[];
  for(let k=0;k<4;k++){const tip=V(7.2+(k%2)*.3,-1.7+k*1.15,(k%2)*.5);tube('terminals',[V(5.4,-.22,0),V(6.1,-.5+k*.45,0),tip],.065,endings);tips.push(tip);}
  beads('terminals',tips,endings,.21);focus('terminals',[6.5,0,0],6);
  const nissl=material('nissl'),bound=[];
  for(let k=0;k<6;k++){
    const x=-2+(k%2?1:-1)*1.15,y=-.9+Math.floor(k/2)*.7;
    add('nissl',new THREE.SphereGeometry(1,20,12).scale(.3,.17,.45).translate(x,y,0),nissl);
    for(let j=0;j<12;j++)bound.push(V(x+.24*Math.sin(j),y+.15,.35*Math.cos(j)));
  }
  beads('nissl',bound,material('nissl',{color:'#d2c3bd'}),.036);focus('nissl',[-2,0,0],7);
  const mito=material('mitochondria');
  for(const [x,y,z,s] of [[-2,1.28,.1,1],[-2,-1.3,.15,1],[2.8,-.68,.2,.5]])add('mitochondria',new THREE.SphereGeometry(1,24,12).scale(.4*s,.17*s,.17*s).translate(x,y,z),mito);
  focus('mitochondria',[-2,1.28,.1],4);
}
function buildBacterium({add,surface,tube,beads,material,focus}){
  const outline=(u,v,scale)=>{
    const t=Math.PI*v,x=3*Math.cos(t)+2*Math.cos(t),r=2*Math.min(1,Math.sin(t)*1.65),a=.7+u*(TAU-1.4);
    return V(x,r*Math.sin(a),r*Math.cos(a)).multiplyScalar(scale);
  };
  for(const [id,scale,opacity] of [['membrane',.84,.19],['cell-wall',.93,.16],['outer-membrane',1,.18]]){
    const mat=material(id,{transparent:true,opacity,depthWrite:false}),rim=material(id);
    add(id,surface((u,v)=>outline(u,v,scale)),mat);
    for(const u of [0,1])tube(id,Array.from({length:65},(_,j)=>outline(u,j/64,scale)),.035,rim);
    if(id==='cell-wall')for(let k=1;k<12;k++)tube(id,Array.from({length:50},(_,j)=>outline(j/49,k/12,scale)),.014,rim);
    focus(id,[0,0,0],18);
  }
  const dna=material('nucleoid');
  const path=Array.from({length:161},(_,i)=>{const t=i/161*TAU;return V(3.1*Math.cos(t),.72*Math.sin(t*7),.64*Math.sin(t*9));});
  tube('nucleoid',path,.066,dna,true);focus('nucleoid',[0,0,0],11);
  const particles=Array.from({length:180},(_,i)=>{const a=i*2.399963,r=.85+.32*(i%7)/7;return V(-3.3+6.6*(i+.5)/180,r*Math.sin(a),r*Math.cos(a));});
  const ribo=material('ribosomes');beads('ribosomes',particles,ribo,.075);beads('ribosomes',particles.map(p=>p.clone().add(V(.07,.03,0))),ribo,.05);focus('ribosomes',[2,0,0],7);
  const flag=material('flagella');
  for(let k=0;k<5;k++){
    const start=outline(k/4,.25+k*.12,1),direction=V(k%2?1:-1,k%2?-.8:.8,-.1).normalize();
    const pts=Array.from({length:81},(_,i)=>{const t=i/80;return start.clone().addScaledVector(direction,t*4).add(V(0,Math.sin(t*TAU*2.4)*.27*t,Math.cos(t*TAU*2.4)*.3*t));});
    tube('flagella',pts,.035,flag);
  }
  focus('flagella',[0,0,0],22);
}
