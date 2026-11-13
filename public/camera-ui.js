import { icon } from './ui.js';

let cameraSequence=0;

/** The same small camera drawer in the game and the world builder. */
export function mountCameraControls(container,renderer,{editor=false,canInteract=()=>true,onAction=()=>{}}={}){
  const root=document.createElement('div');root.className='farm-camera'+(editor?' editor-camera':'');
  const panelId='farm-camera-'+(++cameraSequence);
  const control=(action,label,symbol,extra='')=>`<button type="button" data-camera="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(symbol)}</button>`;
  root.innerHTML=`<button type="button" class="camera-toggle" aria-label="Camera controls" aria-expanded="false" aria-controls="${panelId}">${icon('camera')}<span>Camera</span></button><div id="${panelId}" class="camera-panel" hidden><div class="camera-heading"><strong>Look around</strong>${control('close','Close camera controls','close')}</div><div class="camera-tools"><div class="camera-pan"><span></span>${control('up','Pan camera up','up')}<span></span>${control('left','Pan camera left','left')}${control('fit','View whole farm','expand')}${control('right','Pan camera right','right')}<span></span>${control('down','Pan camera down','down')}<span></span></div><div class="camera-orbit">${control('orbit-left','Rotate camera left','rotate-left')}${control('orbit-right','Rotate camera right','rotate-right')}${control('tilt-up','Raise camera angle','tilt-up')}${control('tilt-down','Lower camera angle','tilt-down')}<small>360° view</small></div></div><div class="camera-footer"><button type="button" data-camera="follow" aria-label="${editor?'Focus player start':'Follow farmer'}" title="${editor?'Player start':'Follow farmer'}">${icon(editor?'spawn':'target')}<span>${editor?'Player start':'Follow farmer'}</span></button>${control('reset','Reset camera view','home')}</div><small class="camera-hint">Right-drag to orbit · Shift-drag to pan</small></div>`;
  container.append(root);const panel=root.querySelector('.camera-panel'),toggle=root.querySelector('.camera-toggle');
  let repeat=null,delay=null;const stop=()=>{clearInterval(repeat);clearTimeout(delay);repeat=delay=null;};
  const setOpen=value=>{panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));if(!value)stop();};
  const act=(name,factor=1)=>{
    if(name==='close'){setOpen(false);return;}
    if(!canInteract())return;onAction();
    if(name==='left')renderer.pan(60*factor,0);if(name==='right')renderer.pan(-60*factor,0);
    if(name==='up')renderer.pan(0,60*factor);if(name==='down')renderer.pan(0,-60*factor);
    if(name==='orbit-left')renderer.rotate(-Math.PI/9*factor);if(name==='orbit-right')renderer.rotate(Math.PI/9*factor);
    if(name==='tilt-up')renderer.tilt?.(.12*factor);if(name==='tilt-down')renderer.tilt?.(-.12*factor);
    if(name==='fit')renderer.fit?.();if(name==='follow')renderer.followPlayer?.();if(name==='reset')renderer.resetCamera?.();
    sync();
  };
  const sync=()=>{const state=renderer.getCameraState?.();const follow=root.querySelector('[data-camera="follow"]');if(state)follow.classList.toggle('following',!!state.follow);};
  toggle.addEventListener('click',()=>{setOpen(panel.hidden);sync();});
  root.addEventListener('click',e=>{const b=e.target.closest('[data-camera]');if(b&&e.detail===0)act(b.dataset.camera);});
  root.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-camera]');if(!b||e.button!==0)return;e.preventDefault();stop();act(b.dataset.camera);if(['left','right','up','down','orbit-left','orbit-right','tilt-up','tilt-down'].includes(b.dataset.camera)){try{b.setPointerCapture(e.pointerId);}catch{}delay=setTimeout(()=>{repeat=setInterval(()=>act(b.dataset.camera,.22),40);},280);}});
  for(const event of['pointerup','pointercancel','lostpointercapture'])root.addEventListener(event,stop);
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();e.stopPropagation();setOpen(false);toggle.focus();}});
  const blur=()=>stop();window.addEventListener('blur',blur);
  return{root,sync,close:()=>setOpen(false),destroy(){stop();window.removeEventListener('blur',blur);root.remove();}};
}
