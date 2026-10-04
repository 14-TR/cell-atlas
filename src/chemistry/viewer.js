import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {colorFor} from './scene-model.js';
// Owns only GPU resources and motion. Scientific layouts are in scene-model.js.
export class ChemistryViewer {
  constructor(container,{onState=()=>{},onLost=()=>{}}={}) {
    this.container=container;this.onState=onState;this.onLost=onLost;this.disposed=false;
    this.time=0;this.frames=0;this.frame=0;this.last=0;this.visible=false;this.meshes=[];this.sprites=[];this.model=null;
    this.preference=matchMedia('(prefers-reduced-motion: reduce)');this.playing=!this.preference.matches;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setClearColor(0x111e1a,0);container.replaceChildren(this.renderer.domElement);
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(42,1,.1,150);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=false;this.controls.enablePan=false;this.controls.minDistance=2;this.controls.maxDistance=70;
    this.scene.add(new THREE.HemisphereLight(0xf1fff0,0x243340,2.6));const light=new THREE.DirectionalLight(0xffe8c8,3.1);light.position.set(4,6,7);this.scene.add(light);
    const rim=new THREE.DirectionalLight(0x81bcb0,2);rim.position.set(-5,-2,-4);this.scene.add(rim);
    this.root=new THREE.Group();this.scene.add(this.root);
    this.change=()=>this.draw();this.controls.addEventListener('change',this.change);
    this.lost=event=>{event.preventDefault();if(this.disposed)return;this.dispose();this.onLost();};this.renderer.domElement.addEventListener('webglcontextlost',this.lost);
    this.motion=event=>{if(event.matches)this.setPlaying(false);};this.preference.addEventListener('change',this.motion);
    this.visibility=()=>{this.last=0;this.schedule();};document.addEventListener('visibilitychange',this.visibility);
    this.intersection=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.last=0;this.schedule();},{threshold:0});this.intersection.observe(container);
    this.resize=new ResizeObserver(()=>{this.size();this.draw();});this.resize.observe(container);this.size();
  }
  size() {
    if(this.disposed)return;
    const width=Math.max(1,this.container.clientWidth),height=Math.max(1,this.container.clientHeight);
    this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
    if(this.model)this.fit();
  }
  clearModel() {
    const geometries=new Set(),materials=new Set(),textures=new Set();
    this.root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const m of [object.material].flat()){materials.add(m);if(m.map)textures.add(m.map);}});
    textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());this.root.clear();this.meshes=[];this.sprites=[];
    this.renderer.renderLists.dispose();
  }
  setModel(model) {
    if(this.disposed)return;this.clearModel();this.model=model;this.time=0;this.last=0;this.root.rotation.set(0,0,0);
    const sphere=new THREE.SphereGeometry(1,20,14),materials=new Map();
    const material=symbol=>{if(!materials.has(symbol))materials.set(symbol,new THREE.MeshStandardMaterial({color:colorFor(symbol),roughness:.32,metalness:.12}));return materials.get(symbol);};
    for(const a of model.atoms) {
      const mesh=new THREE.Mesh(sphere,material(a.symbol));
      const radius=model.kind==='reaction'?.23:model.kind==='composition'?.23:a.symbol==='H'?.27:a.symbol==='Na'?.26:.36;
      mesh.scale.setScalar(radius);mesh.position.fromArray(a.position);this.root.add(mesh);this.meshes.push(mesh);
    }
    if(!model.atoms.length)sphere.dispose();
    if(model.bonds.length) {
      const geometry=new THREE.CylinderGeometry(.065,.065,1,12),mat=new THREE.MeshStandardMaterial({color:0x9aaa9a,roughness:.55});
      for(const [a,b,order] of model.bonds)for(let i=0;i<order;i++) {
        const start=new THREE.Vector3(...model.atoms[a].position),end=new THREE.Vector3(...model.atoms[b].position),direction=end.clone().sub(start);
        const bond=new THREE.Mesh(geometry,mat);bond.position.copy(start).add(end).multiplyScalar(.5);bond.position.z+=(i-(order-1)/2)*.17;
        bond.scale.y=direction.length();bond.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());this.root.add(bond);
      }
    }
    for(const label of model.labels||[]) {
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const context=canvas.getContext('2d');if(!context)continue;
      context.font='40px Arial';context.textAlign='center';context.textBaseline='middle';context.fillStyle=label.side==='product'?'#c5e4a8':'#c9d6df';context.fillText(label.text,128,32);
      const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
      sprite.position.fromArray(label.position);sprite.scale.set(1.45,.36,1);this.root.add(sprite);this.sprites.push(sprite);
    }
    const points=model.atoms.flatMap(a=>[a.position,...(a.target?[a.target]:[])]).concat((model.labels||[]).map(l=>l.position));
    this.bounds=new THREE.Box3();for(const p of points)this.bounds.expandByPoint(new THREE.Vector3(...p));
    if(this.bounds.isEmpty())this.bounds.set(new THREE.Vector3(-1,-1,-1),new THREE.Vector3(1,1,1));
    this.root.position.copy(this.bounds.getCenter(new THREE.Vector3())).multiplyScalar(-1);this.fit();this.draw();this.schedule();this.onState(this.diagnostics());
  }
  fit() {
    if(!this.bounds)return;const size=this.bounds.getSize(new THREE.Vector3());
    const distance=Math.max(3,(Math.max((size.x+1)/this.camera.aspect,size.y+1)/2)/Math.tan(21*Math.PI/180)+size.z)*1.2;
    this.camera.position.copy(this.model.kind==='lattice'?new THREE.Vector3(.6,.4,1).normalize().multiplyScalar(distance):new THREE.Vector3(0,0,distance));
    this.controls.target.set(0,0,0);this.controls.update();this.camera.updateProjectionMatrix();
  }
  draw() {
    if(this.disposed)return;
    this.camera.updateMatrixWorld();this.root.updateMatrixWorld(true);
    for(const sprite of this.sprites) {
      const depth=-sprite.getWorldPosition(new THREE.Vector3()).applyMatrix4(this.camera.matrixWorldInverse).z;
      const height=24/Math.max(1,this.container.clientHeight)*2*depth*Math.tan(21*Math.PI/180);
      sprite.scale.set(height*4,height,1);
    }
    this.renderer.render(this.scene,this.camera);this.frames++;
  }
  schedule() {
    if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;
    if(!this.disposed&&this.visible&&!document.hidden&&this.playing&&this.model?.atoms.length&&this.model.active!==false)this.frame=requestAnimationFrame(now=>this.tick(now));
  }
  tick(now) {
    this.frame=0;if(this.disposed)return;
    const delta=this.last?Math.min((now-this.last)/1000,.05):.016;this.last=now;this.time+=delta;
    if(this.model.kind==='reaction') {
      const phase=this.time%6,linear=Math.min(1,phase/3.6),t=linear*linear*(3-2*linear);
      this.meshes.forEach((mesh,i)=>{const a=this.model.atoms[i];mesh.position.set(...a.position.map((v,axis)=>v+(a.target[axis]-v)*t+(axis===2?Math.sin(t*Math.PI)*Math.sin(i*1.8)*.5:0)));});
    }else this.root.rotation.y=this.time*.16;
    this.draw();this.schedule();
  }
  setPlaying(value) {if(this.disposed)return;this.playing=Boolean(value);this.last=0;this.schedule();this.onState(this.diagnostics());}
  reset() {if(this.disposed)return;this.time=0;this.last=0;this.root.rotation.set(0,0,0);this.meshes.forEach((m,i)=>m.position.fromArray(this.model.atoms[i].position));this.fit();this.draw();this.onState(this.diagnostics());}
  rotate(direction) {if(this.disposed)return;this.camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),direction*.2);this.controls.update();this.draw();}
  zoom(factor) {if(this.disposed)return;this.camera.position.multiplyScalar(factor);this.controls.update();this.draw();}
  diagnostics() {
    if(this.disposed)return {webgl:false,geometries:0,pendingFrame:false,playing:false,time:this.time,frames:this.frames};
    const gl=this.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
    const glyphHeights=this.sprites.map(sprite=>{
      const center=sprite.getWorldPosition(new THREE.Vector3()),up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion).multiplyScalar(sprite.scale.y/2);
      const top=center.clone().add(up).project(this.camera),bottom=center.clone().sub(up).project(this.camera);
      return Math.abs(top.y-bottom.y)*this.container.clientHeight/2*40/64;
    });
    return {webgl:true,gpu:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),kind:this.model?.kind,playing:this.playing,time:this.time,frames:this.frames,visible:this.visible,pendingFrame:Boolean(this.frame),geometries:this.renderer.info.memory.geometries,triangles:this.renderer.info.render.triangles,atomCount:this.meshes.length,bonds:this.model?.bonds.length,minimumLabelPixels:glyphHeights.length?Math.min(...glyphHeights):0,positions:this.meshes.map(m=>m.position.toArray()),camera:this.camera.position.toArray()};
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;
    this.intersection.disconnect();this.resize.disconnect();document.removeEventListener('visibilitychange',this.visibility);this.preference.removeEventListener('change',this.motion);
    this.controls.removeEventListener('change',this.change);this.controls.dispose();this.renderer.domElement.removeEventListener('webglcontextlost',this.lost);
    this.clearModel();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();
  }
}
