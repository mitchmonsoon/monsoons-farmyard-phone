// Pointer capture keeps a two-finger zoom continuous over the farm. A pinch
// never turns into a movement tap when either finger is lifted.
export function bindFarmPointerControls(view,{canInteract,getZoom,setZoomLevel,onTap,onGestureStart,onGestureEnd,onInteract,onPan,onRotate,onTilt}){
  const points=new Map();let pinching=false,startDistance=0,startZoom=1,lastGesture=null;
  const listeners=[];
  const listen=(name,fn)=>{view.addEventListener(name,fn,{passive:false});listeners.push([name,fn]);};
  const distance=()=>{const [a,b]=[...points.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;};
  const gesture=()=>{const [a,b]=[...points.values()];return a&&b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,angle:Math.atan2(b.y-a.y,b.x-a.x)}:null;};
  const beginPinch=()=>{pinching=true;startDistance=Math.max(8,distance());startZoom=getZoom();lastGesture=gesture();onGestureStart?.();};
  const isCameraGestureActive=()=>pinching||[...points.values()].some(point=>point.mode!=='tap');
  const release=id=>{try{if(view.hasPointerCapture?.(id))view.releasePointerCapture(id);}catch{}};
  function reset(){const wasCamera=isCameraGestureActive(),ids=[...points.keys()];points.clear();pinching=false;startDistance=0;lastGesture=null;ids.forEach(release);if(wasCamera)onGestureEnd?.();}
  listen('pointerdown',event=>{
    if(!canInteract()||![0,1,2].includes(event.button))return;
    event.preventDefault();onInteract?.();
    const mode=event.button===2?'orbit':event.button===1||event.shiftKey?'pan':'tap';
    points.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,mode});
    try{view.setPointerCapture(event.pointerId);}catch{}
    if(points.size===2)beginPinch();else if(mode!=='tap')onGestureStart?.();
  });
  listen('pointermove',event=>{
    const point=points.get(event.pointerId);if(!point)return;
    if(!canInteract()){reset();return;}
    const dx=event.clientX-point.x,dy=event.clientY-point.y;
    point.x=event.clientX;point.y=event.clientY;
    if(points.size>=2){
      event.preventDefault();if(!pinching)beginPinch();setZoomLevel(startZoom*distance()/startDistance);
      const next=gesture();if(next&&lastGesture){const px=next.x-lastGesture.x,py=next.y-lastGesture.y;if(Math.hypot(px,py)>.05)onPan?.(px,py);const angle=Math.atan2(Math.sin(next.angle-lastGesture.angle),Math.cos(next.angle-lastGesture.angle));if(Math.abs(angle)>.001)onRotate?.(angle);}
      lastGesture=next;
    }else if(!pinching&&point.mode==='pan'){event.preventDefault();onPan?.(dx,dy);}
    else if(!pinching&&point.mode==='orbit'){event.preventDefault();onRotate?.(-dx*.008);onTilt?.(dy*.005);}
  });
  function finish(event,cancelled=false){
    const point=points.get(event.pointerId);if(!point)return;
    const wasPinch=pinching,wasCamera=isCameraGestureActive();
    points.delete(event.pointerId);release(event.pointerId);
    if(points.size>=2){startDistance=Math.max(8,distance());startZoom=getZoom();lastGesture=gesture();}
    if(!points.size){pinching=false;startDistance=0;lastGesture=null;}
    if(wasCamera&&!isCameraGestureActive())onGestureEnd?.();
    if(!cancelled&&!wasPinch&&point.mode==='tap'&&canInteract()&&Math.hypot(point.startX-event.clientX,point.startY-event.clientY)<15)
      onTap?.(event.clientX,event.clientY);
  }
  listen('pointerup',event=>finish(event));
  listen('pointercancel',event=>finish(event,true));
  listen('lostpointercapture',event=>finish(event,true));
  view.style.touchAction='none';
  return{reset,isCameraGestureActive,destroy(){reset();for(const[name,fn]of listeners)view.removeEventListener(name,fn);}};
}
