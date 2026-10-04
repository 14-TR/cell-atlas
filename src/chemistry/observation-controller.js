import {$,make} from './dom.js';
import {ChemistryViewer} from './viewer.js';
import {colorFor} from './scene-model.js';
export function initializeObservation() {
  let viewer=null,model=null,reading=false,disposed=false;
  const controls=['scene-play','scene-reset','scene-left','scene-right','scene-in','scene-out'];
  const state=value=>{$('scene-play').textContent=value.playing?'Pause':'Play';$('scene-play').setAttribute('aria-pressed',String(Boolean(value.playing)));};
  function fallback(reason) {
    viewer?.dispose();viewer=null;reading=true;controls.forEach(id=>$(id).disabled=true);
    $('chemistry-viewport').replaceChildren(make('p','Reading mode · the complete composition and reaction calculations remain available.'));
    $('scene-status').textContent=`Reading mode. ${reason}`;$('reading-toggle').textContent='Retry 3D';$('reading-toggle').setAttribute('aria-pressed','true');state({playing:false});
  }
  function start() {
    if(disposed||reading||viewer)return;
    try{viewer=new ChemistryViewer($('chemistry-viewport'),{onState:state,onLost:()=>fallback('Graphics context was lost. You can retry when ready.')});
      controls.forEach(id=>$(id).disabled=false);$('reading-toggle').textContent='Use reading mode';$('reading-toggle').setAttribute('aria-pressed','false');
      $('scene-status').textContent='3D teaching illustration · drag or use the camera buttons.';if(model)viewer.setModel(model);
    }catch{fallback('WebGL could not start. No scientific information depends on the canvas.');}
  }
  function show(next) {
    model=next;$('scene-kind').textContent=({lattice:'Ionic lattice',molecule:'Grounded molecule',composition:'Composition only',reaction:'Atom rearrangement'})[model.kind];
    $('scene-caption').replaceChildren(make('span',model.caption));
    if(model.source)$('scene-caption').append(' ',make('a','Geometry source ↗',{href:model.source,target:'_blank',rel:'noopener noreferrer'}));
    $('atom-legend').replaceChildren();
    for(const symbol of [...new Set(model.atoms.map(a=>a.symbol))]){const item=make('span',symbol+(model.kind==='lattice'?(symbol==='Na'?'⁺':'⁻'):'')),dot=make('i',undefined,{'aria-hidden':'true'});dot.style.background=colorFor(symbol);item.prepend(dot);$('atom-legend').append(item);}
    if(viewer)viewer.setModel(model);else start();
  }
  $('scene-play').addEventListener('click',()=>viewer?.setPlaying(!viewer.playing));$('scene-reset').addEventListener('click',()=>viewer?.reset());
  $('scene-left').addEventListener('click',()=>viewer?.rotate(-1));$('scene-right').addEventListener('click',()=>viewer?.rotate(1));
  $('scene-in').addEventListener('click',()=>viewer?.zoom(.83));$('scene-out').addEventListener('click',()=>viewer?.zoom(1.2));
  $('reading-toggle').addEventListener('click',()=>{if(reading){reading=false;start();}else fallback('3D is switched off by choice.');});
  window.addEventListener('pagehide',()=>{viewer?.dispose();viewer=null;},{passive:true});
  window.addEventListener('pageshow',()=>{if(model&&!reading)start();},{passive:true});
  return {show,diagnostics:()=>viewer?.diagnostics()||{webgl:false,geometries:0,pendingFrame:false,playing:false,kind:model?.kind},dispose:()=>{disposed=true;viewer?.dispose();viewer=null;}};
}
