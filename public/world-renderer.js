import * as THREE from './vendor/three.module.js';
import { C, material, box, sphere, cylinder, group, plate, tree, fence, barn, market, coop, mill, dairy, workshop, blueprint, floorPad, zone, iconBadge, person, crateGoods, bakeStaticParts } from './art.js';
import { FarmRenderer } from './renderer.js';
import { WorldCanvasRenderer } from './world-canvas.js';
import { CATALOG, portsFor, rotatePoint } from './world-schema.js';
import { STATUS_STYLE, goodsForView, recipeForView, outputForView, parcelForView, parcelOpen, parcelPadForView, nodeOpen, stockCount, selectedObjects, ghostObjects, nodeStatusMap } from './world-visuals.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const temp=new THREE.Object3D(),tempColor=new THREE.Color();
const CAMERA_ANGLE=Math.atan2(24,30),CAMERA_ELEVATION=Math.atan2(65,60),CAMERA_DISTANCE=Math.hypot(60,65);
const PAD_TYPES=['basket','boots','helper','farmupgrade'];

function previewCrops(world){
  const out=[];
  for(const n of world.nodes){if(!['field','orchard'].includes(n.type))continue;const step=n.type==='orchard'?2.4:1.1;
    for(let x=-n.width/2+.7;x<n.width/2-.3;x+=step)for(let z=-n.depth/2+.7;z<n.depth/2-.3;z+=step){const p=rotatePoint(n,x,z);out.push({id:n.id+'-'+x+'-'+z,nodeId:n.id,...p,type:outputForView(world,n)||'wheat',growth:1,unlocked:true});}
  }
  return out;
}

class World3DRenderer {
  constructor(container,{world,mode='editor'}){
    this.container=container;this.definition=world;this.mode=mode;this.zoom=1;this.follow=mode==='game';this.angle=CAMERA_ANGLE;this.elevation=CAMERA_ELEVATION;this.focus=new THREE.Vector3();this.elapsed=0;this.characters=new Map();this.effects=[];this.padViews=new Map();this.parcelViews=new Map();this.nodeViews=new Map();this.selection=null;this.ghost=null;this.routesVisible=mode==='editor';
    this.game={state:{player:{...world.start,bag:[]}}};
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xadd1c0);
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.07;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.canvas=this.renderer.domElement;this.canvas.tabIndex=0;this.canvas.style.cssText='display:block;width:100%;height:100%;outline:none;touch-action:none;';this.canvas.setAttribute('aria-label',mode==='editor'?'Farm world canvas. Place and move farm objects.':'Your custom farm. Click to walk.');container.appendChild(this.canvas);
    this.camera=new THREE.OrthographicCamera(-32,32,24,-24,.1,300);this.cameraOffset=new THREE.Vector3();
    this.scene.add(new THREE.HemisphereLight(0xfff0cd,0x5d816b,1.65));this.scene.add(new THREE.AmbientLight(0xffeac7,.18));
    const sun=new THREE.DirectionalLight(0xffe7bc,3.0);sun.position.set(-30,60,25);sun.castShadow=true;const shadowSize=(window.innerWidth||1280)<760?1024:2048;sun.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(sun.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:170});sun.shadow.normalBias=.04;sun.shadow.bias=-.00012;sun.shadow.radius=3;this.scene.add(sun);this.sun=sun;
    const fill=new THREE.DirectionalLight(0xb3d8ed,.65);fill.position.set(30,20,-25);this.scene.add(fill);
    this.world=new THREE.Group();this.scene.add(this.world);this.raycaster=new THREE.Raycaster();this.groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.selectionGroup=new THREE.Group();this.world.add(this.selectionGroup);
    this.setWorld(world);this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resetCamera();
  }
  disposeDetached(root){
    if(!root)return;const geo=new Set(),mat=new Set();this.scene.traverse(o=>{if(o.geometry)geo.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))mat.add(m);});
    const disposedG=new Set(),disposedM=new Set();root.traverse(o=>{if(o.geometry&&!o.geometry.userData.farmShared&&!geo.has(o.geometry)&&!disposedG.has(o.geometry)){o.geometry.dispose();disposedG.add(o.geometry);}for(const m of(o.material?(Array.isArray(o.material)?o.material:[o.material]):[]))if(!m.userData.farmShared&&!mat.has(m)&&!disposedM.has(m)){m.map?.dispose();m.dispose();disposedM.add(m);}});
  }
  setWorld(world){
    this.definition=world;this.goods=goodsForView(world);for(const view of this.characters.values())view.signature=null;const old=this.staticRoot;this.staticRoot=new THREE.Group();this.world.add(this.staticRoot);if(old)this.world.remove(old);this.nodeViews.clear();this.padViews.clear();this.parcelViews.clear();
    const extent=Math.max(30,Math.max(world.width,world.depth)*.72+5);Object.assign(this.sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});this.sun.shadow.camera.updateProjectionMatrix();
    box(this.staticRoot,world.width,.9,world.depth,0x7c9f55,0,-.48,0);plate(this.staticRoot,world.width,world.depth,C.grassLight,0,0,.015,.8);
    if(this.mode==='editor'){const grid=new THREE.GridHelper(Math.max(world.width,world.depth),Math.ceil(Math.max(world.width,world.depth)/2),0x5e8e52,0x689457);grid.position.y=.035;grid.material.transparent=true;grid.material.opacity=.16;this.staticRoot.add(grid);}
    for(const parcel of world.parcels||[])this.createParcel(parcel);
    for(const n of world.nodes)this.createNode(n);
    this.makeRoutes();this.makeCrops(previewCrops(world));this.lastStateCrops=null;this.updateSelection();this.disposeDetached(old);
  }
  createParcel(parcel){
    const g=group(this.staticRoot,parcel.x,0,parcel.z);g.userData.nodeId='parcel:'+parcel.id;
    const cover=plate(g,parcel.width-.08,parcel.depth-.08,new THREE.MeshStandardMaterial({color:0x738d6d,transparent:true,opacity:.76,roughness:1,depthWrite:false}),0,0,.082,.25);
    const points=[[-parcel.width/2,-parcel.depth/2],[parcel.width/2,-parcel.depth/2],[parcel.width/2,parcel.depth/2],[-parcel.width/2,parcel.depth/2]].map(([x,z])=>new THREE.Vector3(x,.10,z));
    const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0xf5e5a0,dashSize:1,gapSize:.65,transparent:true,opacity:.6}));border.computeLineDistances();g.add(border);
    const at=parcelPadForView(this.definition,parcel),pad=parcel.unlocked?null:floorPad(this.staticRoot,{...at,id:'parcel',price:parcel.cost||0});
    if(pad)this.padViews.set('parcel-'+parcel.id,pad);
    this.parcelViews.set(parcel.id,{parcel,g,cover,border,pad,open:null,revealAt:-100});
  }
  createNode(n){
    const holder=group(this.staticRoot,n.x,0,n.z);holder.rotation.y=-(n.rotation||0)*Math.PI/180;holder.userData.nodeId=n.id;
    const content=group(holder),recipe=recipeForView(this.definition,n),output=outputForView(this.definition,n);
    const v={holder,content,n,model:null,ghost:null,ports:[],pad:null,recipe,output,open:null,revealAt:-100};this.nodeViews.set(n.id,v);
    if(n.type==='path')plate(content,n.width,n.depth,C.sand,0,0,.055,.35);
    else if(n.type==='field'||n.type==='orchard'){
      plate(content,n.width,n.depth,n.type==='field'?0x8f6744:0x80ae5d,0,0,.055,.2);
      if(n.type==='field')for(let z=-n.depth/2+.45;z<n.depth/2;z+=1.1)plate(content,n.width-.15,.6,0xa47b4c,0,z,.062,.1);
      for(const z of[-n.depth/2,n.depth/2])box(content,n.width,.14,.12,0xc6a06b,0,.13,z);
      for(const x of[-n.width/2,n.width/2])box(content,.12,.14,n.depth,0xc6a06b,x,.13,0);
    }else if(n.type==='tree')tree(content,0,0,Math.max(.6,n.width/2));
    else if(n.type==='fence')fence(content,-n.width/2,0,n.width/2,0);
    else if(n.type==='pond'){
      const rim=cylinder(content,1,1,.15,0xb8b886,0,.07,0,28);rim.scale.set(n.width/2,1,n.depth/2);
      const water=cylinder(content,1,1,.04,0x56aebc,0,.17,0,32);water.scale.set(n.width*.45,1,n.depth*.44);water.material=water.material.clone();water.material.userData.farmShared=false;water.material.roughness=.22;water.material.metalness=.04;
      v.ripples=[];for(let i=0;i<3;i++){const ripple=new THREE.Mesh(new THREE.RingGeometry(.34+i*.36,.36+i*.36,28),new THREE.MeshBasicMaterial({color:0xd1f1dc,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));ripple.rotation.x=-Math.PI/2;ripple.position.y=.199;content.add(ripple);v.ripples.push(ripple);}
      for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(content,.32,0xa9b495,Math.cos(a)*n.width*.47,.2,Math.sin(a)*n.depth*.46,1.3,.7,1);}
      const duck=group(content);sphere(duck,.25,0xffe9ad,0,.36,0,1,.8,1.4);sphere(duck,.15,0xfff0c8,0,.57,.2);box(duck,.15,.07,.22,0xe4a14a,0,.53,.39);for(const x of[-.095,.095])sphere(duck,.018,0x364635,x,.61,.31);bakeStaticParts(duck);v.duck=duck;
    }else if(['barn','market','coop','mill','dairy','workshop'].includes(n.type)){
      let model;if(n.type==='barn'){model=barn(content);model.position.set(0,0,0);model.scale.set(n.width/6,1,n.depth/3.6);}
      if(n.type==='market'){model=market(content);model.position.set(0,0,0);model.scale.set(n.width/5.4,1,n.depth/2.4);}
      if(n.type==='coop'){const built=coop(content);model=built.g;model.position.set(0,0,0);model.scale.set(n.width/4.5,1,n.depth/3.5);v.hens=built.hens;for(const h of v.hens)h.userData.home=h.position.clone();}
      if(n.type==='mill'){const built=mill(content);model=built.g;model.position.set(0,0,0);model.scale.set(n.width/4.5,1,n.depth/3.5);v.wheel=built.wheel;}
      if(n.type==='dairy'){const built=dairy(content);model=built.g;model.scale.set(n.width/6,1,n.depth/5);v.cows=built.cows;for(const cow of v.cows){cow.userData.home=cow.position.clone();cow.userData.homeAngle=cow.rotation.y;}}
      if(n.type==='workshop'){const built=workshop(content,output,this.goods[output]);model=built.g;model.scale.set(n.width/5,1,n.depth/4);v.craft=built;}
      v.model=model;
    }
    if(n.cost>0&&!PAD_TYPES.includes(n.type)){v.ghost=blueprint(holder,0,0,n.width,n.depth,'');v.ghost.visible=false;}
    const p=portsFor(n);
    if(n.cost>0||PAD_TYPES.includes(n.type)){v.pad=floorPad(this.staticRoot,{x:p.pad.x,z:p.pad.z,id:CATALOG[n.type].icon,price:n.cost});this.padViews.set(n.id,v.pad);}
    if(n.type==='market'||n.type==='barn'||recipe){
      const feed=Object.keys(recipe?.inputs||{})[0]||'wheat',inputIcon=n.type==='market'?'sell':n.type==='barn'?'box-in':Object.keys(recipe?.inputs||{}).length>1?'feed':this.goods[feed]?.model||feed;
      const input=zone(this.staticRoot,p.input.x,p.input.z,n.type==='market'?'SELL':'',n.type==='market'?0xaed388:0xe1c776,inputIcon);v.ports.push(input);
      if(n.type==='barn'||recipe){const out=zone(this.staticRoot,p.output.x,p.output.z,'',0xb5d88a,n.type==='barn'?'box-out':this.goods[output]?.model||output);v.ports.push(out);v.outputPile=group(this.staticRoot,p.output.x-.25,.17,p.output.z);}
      if(n.type!=='market'){v.status=iconBadge('working','',1.0,.72,{compact:true});v.status.position.set(n.x,n.type==='barn'?5.3:n.type==='dairy'?3.8:4.2,n.z);v.status.visible=false;this.staticRoot.add(v.status);}
    }
    if(!v.status&&['field','orchard','market'].includes(n.type)){v.status=iconBadge('working','',1.0,.72,{compact:true});v.status.position.set(n.x,n.type==='field'?1.65:3.7,n.z);v.status.visible=false;this.staticRoot.add(v.status);}
  }
  makeRoutes(){
    this.routes=new THREE.Group();this.routes.visible=this.routesVisible;this.staticRoot.add(this.routes);
    for(const l of this.definition.links){const a=this.definition.nodes.find(n=>n.id===l.from),b=this.definition.nodes.find(n=>n.id===l.to);if(!a||!b)continue;const p=portsFor(a).output,q=portsFor(b).input;
      const points=[new THREE.Vector3(p.x,.22,p.z),new THREE.Vector3(q.x,.22,q.z)],geo=new THREE.BufferGeometry().setFromPoints(points),line=new THREE.Line(geo,new THREE.LineDashedMaterial({color:l.id===this.selection?0xffd44d:0x2e8979,dashSize:.7,gapSize:.5,transparent:true,opacity:.9}));line.computeLineDistances();line.userData.routeId=l.id;this.routes.add(line);
      const dir=new THREE.Vector3(q.x-p.x,0,q.z-p.z).normalize(),mid=points[0].clone().lerp(points[1],.58),arrow=new THREE.ArrowHelper(dir,mid,1.5,0x2c7c6c,.65,.45);this.routes.add(arrow);
    }
  }
  makeCrops(crops){
    const old=this.cropRoot;if(old)this.world.remove(old);this.cropRoot=new THREE.Group();this.world.add(this.cropRoot);this.cropData=crops;this.appleViews=new Map();this.orchardGroups=new Map();
    const wheat=crops.filter(c=>this.goods[c.type]?.model!=='apple'&&c.type!=='apple');this.wheat=wheat;const count=Math.max(1,wheat.length*3);
    this.stalks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.034,.84,5),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.82}),count);
    this.heads=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,6),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.58}),count);
    this.leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(.12,.4),new THREE.MeshStandardMaterial({color:0xcab14c,roughness:.85,side:THREE.DoubleSide}),count);
    for(const m of[this.stalks,this.heads,this.leaves]){m.count=wheat.length*3;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;this.cropRoot.add(m);}this.stalks.receiveShadow=true;this.heads.castShadow=true;
    this.appleData=crops.filter(c=>this.goods[c.type]?.model==='apple'||c.type==='apple');
    this.appleFruit=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshStandardMaterial({color:0xdf5034,roughness:.34}),Math.max(1,this.appleData.length*6));this.appleFruit.count=this.appleData.length*6;this.appleFruit.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.appleFruit.frustumCulled=false;this.cropRoot.add(this.appleFruit);
    for(const p of this.appleData){if(!this.orchardGroups.has(p.nodeId)){const orchard=group(this.cropRoot);this.orchardGroups.set(p.nodeId,orchard);}tree(this.orchardGroups.get(p.nodeId),p.x,p.z,.72);}
    for(const orchard of this.orchardGroups.values())bakeStaticParts(orchard);
    this.disposeDetached(old);
  }
  updateCrops(state){
    const crops=state?.crops||this.cropData;if(state&&state.crops!==this.lastStateCrops){this.makeCrops(crops);this.lastStateCrops=state.crops;}
    for(let i=0;i<this.wheat.length;i++){const p=this.wheat[i],node=this.nodeViews.get(p.nodeId)?.n,active=p.unlocked!==false&&(!node||nodeOpen(this.definition,node,state,this.mode)),g=active?Math.max(.06,p.growth):0,grain=p.type==='grain'||this.goods[p.type]?.model==='grain';
      for(let j=0;j<3;j++){const a=j*2.1,x=p.x+Math.cos(a)*.24,z=p.z+Math.sin(a)*.24,lean=(Math.sin(this.elapsed*1.5+p.x*.3+p.z*.2)*.055+Math.sin(this.elapsed*2+i+j)*.018)*g,stretch=.9+(i*7+j*3)%11*.025;
        temp.position.set(x,.08+.42*g*stretch,z);temp.rotation.set(lean,a,lean*.7);temp.scale.set(g,g*stretch,g);temp.updateMatrix();this.stalks.setMatrixAt(i*3+j,temp.matrix);tempColor.setHex(p.growth>.72?0xc4a345:0x77a64a);this.stalks.setColorAt(i*3+j,tempColor);
        temp.position.set(x+lean*.8,.1+.85*g*stretch,z);temp.rotation.set(.1,a,lean*2.4);temp.scale.set((grain?.085:.112)*g,(grain?.29:.24)*g,.092*g);temp.updateMatrix();this.heads.setMatrixAt(i*3+j,temp.matrix);tempColor.set(p.growth>.82?(this.goods[p.type]?.color||(j%3?0xf0c54c:0xffda69)):p.growth>.5?0xc8bc55:0x86b253);this.heads.setColorAt(i*3+j,tempColor);
        temp.position.set(x,.12+.5*g*stretch,z);temp.rotation.set(.2,a,.65);temp.scale.set(g,g,g);temp.updateMatrix();this.leaves.setMatrixAt(i*3+j,temp.matrix);
      }}
    for(const m of[this.stalks,this.heads,this.leaves]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
    for(const[id,view]of this.orchardGroups){const node=this.nodeViews.get(id)?.n;view.visible=!node||nodeOpen(this.definition,node,state,this.mode);}
    for(let i=0;i<this.appleData.length;i++){const p=this.appleData[i],node=this.nodeViews.get(p.nodeId)?.n,active=p.unlocked!==false&&(!node||nodeOpen(this.definition,node,state,this.mode)),g=active?Math.max(.01,p.growth):0;
      for(let j=0;j<6;j++){const a=j*Math.PI/3;temp.position.set(p.x+Math.sin(a)*.72*.7,(1.75+(j%2)*.3)*.72,p.z+Math.cos(a)*.72*.7);temp.rotation.set(0,a,0);temp.scale.setScalar(g*.72);temp.updateMatrix();this.appleFruit.setMatrixAt(i*6+j,temp.matrix);}}
    this.appleFruit.instanceMatrix.needsUpdate=true;
  }
  setSelection(id){this.selection=id;this.updateSelection();if(this.routes)this.routes.traverse(o=>{if(o.userData.routeId)o.material.color.setHex(o.userData.routeId===id?0xffd44d:0x2e8979);});}
  setGhost(n){this.ghost=n;this.updateSelection();}
  updateSelection(){
    if(!this.selectionGroup)return;const old=this.selectionGroup;this.selectionGroup=new THREE.Group();this.world.add(this.selectionGroup);this.world.remove(old);
    const ghosts=ghostObjects(this.ghost),selected=selectedObjects(this.definition,this.selection);
    for(const n of[...selected,...ghosts]){const corners=[[-n.width/2,-n.depth/2],[n.width/2,-n.depth/2],[n.width/2,n.depth/2],[-n.width/2,n.depth/2]].map(([x,z])=>rotatePoint(n,x,z));const geometry=new THREE.BufferGeometry().setFromPoints(corners.map(p=>new THREE.Vector3(p.x,.23,p.z)));this.selectionGroup.add(new THREE.LineLoop(geometry,new THREE.LineBasicMaterial({color:0xfff5a2,depthTest:false})));if(ghosts.includes(n)){const fill=plate(this.selectionGroup,n.width,n.depth,0xffdc61,n.x,n.z,.12,.1,{transparent:true,opacity:.25,depthWrite:false});fill.rotation.z=-(n.rotation||0)*Math.PI/180;}}
    this.disposeDetached(old);
  }
  setRoutesVisible(v){this.routesVisible=Boolean(v);if(this.routes)this.routes.visible=this.routesVisible;}
  updatePurchasePad(view,actual,fallback,state){
    if(!view)return;
    const price=actual?.price??fallback.cost??0,x=actual?.x??fallback.x??0,z=actual?.z??fallback.z??0;
    const available=this.mode==='editor'||(actual?actual.available:true),disabled=!available,pulse=.5+.5*Math.sin(this.elapsed*2.4+x),afford=available&&(this.mode==='editor'||(state?.coins||0)>=price);
    view.g.position.set(x,.01,z);
    view.label.userData.setText(String(price),{locked:disabled,fill:disabled?'#d9c495':afford?'#ffe778':'#ffe598',color:disabled?'#8c7953':'#654006',border:disabled?'#b49a61':afford?'#fff4ac':'#f5ac12'});view.label.position.y=1+(afford?Math.sin(this.elapsed*2+x)*.055:0);
    view.base.material.color.setHex(disabled?0xaa9054:afford?0xffbf12:0xf5b91d);view.base.material.emissiveIntensity=disabled?0:afford?.22+pulse*.13:.10;view.edge.material.color.setHex(disabled?0x86723d:0xce8007);view.rim.material.color.setHex(disabled?0xd7c286:0xfffaac);
    view.sheen.visible=!disabled;view.sheen.position.x=Math.sin(this.elapsed*.85+x)*.88;view.glow.material.opacity=disabled?.035:afford?.2+pulse*.12:.08;
    view.glints.forEach((g,i)=>{const phase=(this.elapsed*.46+i*.34+x*.07+100)%1;g.visible=!disabled&&(afford||i===0);g.position.set(Math.sin(i*2.2+x)*1.02,.18+phase*.85,Math.cos(i*2.2+x)*1.02);g.scale.setScalar(Math.max(.05,Math.sin(Math.PI*phase))*(afford?1.05:.7));g.rotation.y=this.elapsed+i;g.material.opacity=Math.max(0,Math.sin(Math.PI*phase))*.85;});
    const active=Boolean(actual?.id&&state?.activePad===actual.id),progress=active?clamp(state?.padProgress||0,0,1):0;view.fill.geometry.setDrawRange(0,Math.floor(progress*48)*6);view.progressTrack.visible=active;view.progressBar.visible=active&&progress>0;view.progressBar.scale.x=progress;
  }
  updateParcels(state,pads){
    for(const [id,v]of this.parcelViews){
      const open=parcelOpen(v.parcel,state,this.mode);
      if(open&&v.open===false)v.revealAt=this.elapsed;
      v.open=open;const reveal=clamp((this.elapsed-v.revealAt)/1.1,0,1);
      v.cover.visible=this.mode==='editor'||!open||reveal<1;
      v.cover.material.opacity=this.mode==='editor'?.10:open?(1-reveal)*.76:.76;
      v.border.material.opacity=this.mode==='editor'?.45:open?.18:.75;
      if(v.pad){v.pad.g.visible=this.mode==='editor'||!open;if(v.pad.g.visible)this.updatePurchasePad(v.pad,pads.get('parcel-'+id),{...parcelPadForView(this.definition,v.parcel),cost:v.parcel.cost},state);}
    }
  }
  render(dt=.016,state=null){
    dt=clamp(Number(dt)||0,0,.05);this.elapsed+=dt;if(state)this.game.state=state;else this.game.state={player:{...this.definition.start,bag:[]}};
    const pads=new Map((state?.pads||[]).map(p=>[p.id,p])),statuses=nodeStatusMap(state);
    this.updateParcels(state,pads);this.updateCrops(state);
    for(const [id,v]of this.nodeViews){
      const n=v.n,ns=state?.nodes?.[id],parcel=parcelForView(this.definition,n),landOpen=!parcel||parcelOpen(parcel,state,this.mode),open=nodeOpen(this.definition,n,state,this.mode);
      if(open&&v.open===false)v.revealAt=this.elapsed;v.open=open;
      v.holder.visible=landOpen;v.content.visible=open;if(v.model)v.model.visible=open;if(v.ghost)v.ghost.visible=!open&&landOpen;
      const reveal=clamp((this.elapsed-v.revealAt)/.75,0,1);v.content.scale.y=open?.15+.85*(1-Math.pow(1-reveal,3)):1;
      v.ports.forEach(port=>port.g.visible=open);
      if(v.ports.length&&ns){v.ports[0].label.userData.setText(n.type==='market'?'SELL':n.type==='barn'?'IN':String(stockCount(ns.inputs)||ns.feed||0));if(v.ports[1])v.ports[1].label.userData.setText(String(stockCount(ns.stock)));}
      if(v.wheel)v.wheel.rotation.z-=dt*(ns?.working?2:.12);
      if(v.duck){v.duck.position.x=Math.sin(this.elapsed*.5)*n.width*.12;v.duck.position.z=Math.cos(this.elapsed*.5)*n.depth*.06;v.duck.rotation.y=this.elapsed*.2;}
      if(v.ripples)for(let i=0;i<v.ripples.length;i++){const phase=(this.elapsed*.18+i*.33)%1;v.ripples[i].scale.setScalar(.7+phase*.6);v.ripples[i].material.opacity=.35*(1-phase);}
      const feeding=this.elapsed-(v.feedAt??-10)<1.4;
      if(v.hens&&open)for(let i=0;i<v.hens.length;i++){
        const h=v.hens[i],home=h.userData.home,pace=Math.sin(this.elapsed*.48+i*2),walk=Math.abs(pace)>.64;
        h.position.x=home.x+Math.sin(this.elapsed*.37+i*1.7)*.17;h.position.z=home.z+Math.cos(this.elapsed*.45+i*1.2)*.14;
        h.position.y=home.y+(walk?Math.abs(Math.sin(this.elapsed*10+i))*.018:0);h.rotation.y=Math.sin(this.elapsed*.52+i*2)*.9;h.rotation.x=(feeding?.16:0)+Math.max(0,Math.sin(this.elapsed*(feeding?5:2.3)+i*1.8))*.16;
      }
      if(v.cows&&open)for(let i=0;i<v.cows.length;i++){
        const cow=v.cows[i],phase=cow.userData.cowPhase||i,{head,tail,legs,home,homeAngle}=cow.userData;
        cow.position.x=home.x+Math.sin(this.elapsed*.22+phase)*.09;cow.position.z=home.z+Math.cos(this.elapsed*.2+phase)*.18;cow.rotation.y=homeAngle+Math.sin(this.elapsed*.19+phase)*.10;
        if(head){head.rotation.z=Math.sin(this.elapsed*.9+phase)*.055-(feeding?.24:ns?.working?.12:0);head.rotation.y=Math.sin(this.elapsed*.55+phase)*.07;}if(tail)tail.rotation.x=Math.sin(this.elapsed*2.1+phase)*.36;if(legs)legs.forEach((leg,j)=>{leg.rotation.z=Math.sin(this.elapsed*2.2+phase+j*Math.PI)*.035;});
      }
      if(v.craft){const craft=v.craft,working=ns?.working===true;
        if(craft.kind==='juice'||craft.kind==='butter')craft.moving.position.y=.92+(working?Math.sin(this.elapsed*3.5)*.13:0);
        else if(craft.kind==='bread')craft.moving.scale.setScalar(working?1+Math.sin(this.elapsed*8)*.07:.8);
        else if(working)craft.moving.rotation.y+=dt*1.9;
        for(let i=0;i<craft.smoke.length;i++){const puff=craft.smoke[i],phase=(this.elapsed*.42+i*.33)%1;puff.visible=working;puff.position.set(-1.35+Math.sin(phase*3)*.17,4.2+phase*1.15,-.5);puff.scale.setScalar(.6+phase*.8);puff.material.opacity=(1-phase)*.32;}
      }
      if(v.outputPile){
        const good=n.type==='barn'?Object.keys(ns?.stock||{}).find(g=>ns.stock[g]>0)||'wheat':v.output,count=n.type==='barn'?stockCount(ns?.stock):Number(ns?.stock)||0;
        v.outputPile.visible=open;FarmRenderer.prototype.updatePile.call(this,v.outputPile,good,open?count:0);
      }
      if(v.status){const status=statuses.get(id),style=STATUS_STYLE[status?.status];v.status.visible=state?.showStatus!==false&&this.mode==='game'&&open&&!!style&&this.zoom>.42;
        if(v.status.visible)v.status.userData.setText('',{compact:true,icon:style.icon,fill:style.fill,color:style.ink,border:style.border,progress:status.status==='working'?Math.round(clamp(status.progress||0,0,1)*20)/20:undefined});
      }
      if(v.pad){
        const actual=pads.get(id),done=this.mode!=='editor'&&(actual?((actual.maxLevel>0&&actual.level>=actual.maxLevel)||(!actual.repeatable&&actual.kind!=='upgrade'&&actual.unlocked)):open&&!PAD_TYPES.includes(n.type));v.pad.g.visible=landOpen&&!done;
        if(v.pad.g.visible)this.updatePurchasePad(v.pad,actual,{...portsFor(n).pad,cost:n.cost},state);
      }
    }
    const seen=new Set(),add=(id,p,kind)=>{seen.add(id);FarmRenderer.prototype.updateCharacter.call(this,id,p,kind);};
    if(state){add('player',state.player,'player');for(const p of state.workers||[])add('worker-'+p.id,p,'runner');for(const p of state.customers||[])add('customer-'+p.id,p,'customer');}
    else add('start',{...this.definition.start,bag:[],angle:-.8},'player');
    for(const [id,v]of this.characters)if(!seen.has(id)){this.world.remove(v.root);this.characters.delete(id);this.disposeDetached(v.root);}
    if(this.follow&&state?.player){const p=state.player,lerp=1-Math.exp(-dt*5);this.focus.x+=(p.x-this.focus.x)*lerp;this.focus.z+=(p.z-this.focus.z)*lerp;}
    FarmRenderer.prototype.updateEffects.call(this,dt);this.updateCamera();this.renderer.render(this.scene,this.camera);
  }
  effect(e){
    FarmRenderer.prototype.effect.call(this,e);
    if(e?.type==='deposit')for(const v of this.nodeViews.values())if(v.hens||v.cows){const p=portsFor(v.n).input;if(Math.hypot((e.x??0)-p.x,(e.z??0)-p.z)<1.4)v.feedAt=this.elapsed;}
  }
  cameraSpan(width,height){const compact=width<700||(height<520&&width<1100);return this.mode==='game'&&compact?(width<height*.85?36:21):38;}
  resize(){const r=this.container.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.renderer.setSize(this.width,this.height,false);const h=this.cameraSpan(this.width,this.height)/this.zoom,aspect=this.width/this.height;Object.assign(this.camera,{left:-h*aspect/2,right:h*aspect/2,top:h/2,bottom:-h/2});this.camera.updateProjectionMatrix();this.updateCamera();}
  updateCamera(){const horizontal=Math.cos(this.elevation)*CAMERA_DISTANCE;this.cameraOffset.set(Math.sin(this.angle)*horizontal,Math.sin(this.elevation)*CAMERA_DISTANCE,Math.cos(this.angle)*horizontal);this.camera.position.copy(this.focus).add(this.cameraOffset);this.camera.lookAt(this.focus);this.camera.updateMatrixWorld();}
  fit(){this.focus.set(0,0,0);this.follow=false;const r=this.container.getBoundingClientRect(),h=this.cameraSpan(r.width,r.height),a=this.angle,spanX=Math.abs(Math.cos(a))*this.definition.width+Math.abs(Math.sin(a))*this.definition.depth,spanY=(Math.abs(Math.sin(a))*this.definition.width+Math.abs(Math.cos(a))*this.definition.depth)*Math.sin(this.elevation);this.zoom=clamp(Math.min(h/(spanY+10),h*(r.width/Math.max(1,r.height))/(spanX+10)),.06,5);this.resize();return this.getCameraState();}
  getZoom(){return this.zoom;}
  setZoomLevel(n){if(Number.isFinite(n))this.zoom=clamp(n,.06,5);this.resize();return this.zoom;}
  setZoom(d){return this.setZoomLevel(this.zoom*Math.pow(1.16,Number(d)||0));}
  getCameraState(){return{follow:this.follow,angle:this.angle,elevation:this.elevation,zoom:this.zoom,focus:{x:this.focus.x,z:this.focus.z}};}
  rotate(delta){if(Number.isFinite(delta))this.angle=(this.angle+delta)%(Math.PI*2);this.updateCamera();return this.getCameraState();}
  tilt(delta){if(Number.isFinite(delta))this.elevation=clamp(this.elevation+delta,Math.PI*25/180,Math.PI*72/180);this.updateCamera();return this.getCameraState();}
  pan(dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy)||(!dx&&!dy))return this.getCameraState();const units=(this.camera.top-this.camera.bottom)/Math.max(1,this.height),c=Math.cos(this.angle),s=Math.sin(this.angle),down=dy/Math.sin(this.elevation);this.focus.x-=units*(dx*c+down*s);this.focus.z-=units*(-dx*s+down*c);this.follow=false;this.updateCamera();return this.getCameraState();}
  followPlayer(){const p=this.mode==='editor'?this.definition.start:this.game.state.player||this.definition.start;this.focus.set(p.x,0,p.z);this.follow=true;this.updateCamera();return this.getCameraState();}
  resetCamera(){this.angle=CAMERA_ANGLE;this.elevation=CAMERA_ELEVATION;if(this.mode==='editor')return this.fit();this.setZoomLevel(1.1);return this.followPlayer();}
  direction(dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy))return{x:0,z:0};const length=Math.min(1,Math.hypot(dx,dy)),c=Math.cos(this.angle),s=Math.sin(this.angle),down=dy/Math.sin(this.elevation),x=dx*c+down*s,z=-dx*s+down*c,n=Math.hypot(x,z)||1;return{x:x/n*length,z:z/n*length};}
  pointToWorld(clientX,clientY){const r=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),this.camera);const p=new THREE.Vector3();return this.raycaster.ray.intersectPlane(this.groundPlane,p)?{x:p.x,z:p.z}:null;}
  pickNode(clientX,clientY){const r=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),this.camera);for(const hit of this.raycaster.intersectObject(this.staticRoot,true)){let p=hit.object;while(p){if(p.userData.nodeId)return p.userData.nodeId;p=p.parent;}}return null;}
  destroy(){this.observer?.disconnect();const old=this.world;this.scene.remove(old);this.disposeDetached(old);this.renderer.dispose();this.canvas.remove();this.characters.clear();this.effects=[];}
}

export class WorldRenderer {
  constructor(container,options){
    const forced=new URLSearchParams(location.search).get('view')==='2d';
    try{if(forced)throw new Error('Illustrated mode');this.view=new World3DRenderer(container,options);this.kind='3d';}
    catch(error){container.replaceChildren();this.view=new WorldCanvasRenderer(container,options);this.kind='illustrated';console.info('Farmyard Workshop uses the illustrated compatibility view.');}
    this.canvas=this.view.canvas;
  }
  setWorld(w){this.view.setWorld(w);}
  setSelection(id){this.view.setSelection(id);}
  setGhost(n){this.view.setGhost(n);}
  setRoutesVisible(v){this.view.setRoutesVisible(v);}
  render(dt,state){this.view.render(dt,state);}
  effect(e){this.view.effect(e);}
  resize(){this.view.resize();}
  getZoom(){return this.view.getZoom();}
  setZoom(d){return this.view.setZoom(d);}
  setZoomLevel(n){return this.view.setZoomLevel(n);}
  fit(){return this.view.fit();}
  pan(x,y){return this.view.pan(x,y);}
  rotate(d){return this.view.rotate(d);}
  tilt(d){return this.view.tilt(d);}
  followPlayer(){return this.view.followPlayer();}
  resetCamera(){return this.view.resetCamera();}
  getCameraState(){return this.view.getCameraState();}
  direction(x,y){return this.view.direction(x,y);}
  pointToWorld(x,y){return this.view.pointToWorld(x,y);}
  pickNode(x,y){return this.view.pickNode?.(x,y)||null;}
  destroy(){this.view.destroy();}
}
