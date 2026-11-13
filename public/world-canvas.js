import { FarmCanvasRenderer } from './canvas-renderer.js';
import { drawFarmIcon } from './pad-icons.js';
import { CATALOG, portsFor } from './world-schema.js';
import { drawDairy } from './livestock-canvas.js';
import { STATUS_STYLE, goodsForView, recipeForView, outputForView, parcelForView, parcelOpen, parcelPadForView, nodeOpen, stockCount, selectedObjects, ghostObjects, nodeStatusMap } from './world-visuals.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rad=d=>(d||0)*Math.PI/180;
const PAD_TYPES=['basket','boots','helper','farmupgrade'];

// The same illustrated farm art, with a camera and scenery driven by a world file.
export class WorldCanvasRenderer extends FarmCanvasRenderer {
  constructor(container,{world,mode='editor'}) {
    super(container,{state:{player:{...world.start,bag:[]},market:{stock:{}},machines:{mill:{working:false}}}});
    this.world=world;this.mode=mode;this.cameraCentre={x:.5,y:.55};this.follow=mode==='game';this.selection=null;this.ghost=null;this.routesVisible=mode==='editor';this.localNode=null;
    this.canvas.setAttribute('aria-label',mode==='editor'?'Farm world canvas. Place and move farm objects.':'Your custom farm. Click to walk.');
    this.setWorld(world);this.resetCamera();
  }
  resize(){
    this.width=Math.max(1,this.container.clientWidth);this.height=Math.max(1,this.container.clientHeight);this.dpr=Math.min(window.devicePixelRatio||1,1.5);
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
    const compact=this.width<700||(this.height<520&&this.width<1100),portrait=this.width<this.height*.85;
    this.baseScale=this.mode==='game'&&compact?Math.max(4,this.height/(portrait?50:24)):Math.max(4,Math.min(this.width/48,this.height/34));this.scale=this.baseScale*(this.zoom||1);this.hitRects=[];this.cacheLighting();
  }
  setWorld(world){this.world=world;this.nodeMap=new Map(world.nodes.map(n=>[n.id,n]));this.goodCatalog=goodsForView(world);this.parcelStates=new Map();this.nodeReveals=new Map();this.previewByNode=new Map();for(const n of world.nodes)if(n.type==='field'||n.type==='orchard')this.previewByNode.set(n.id,this.previewCrops(n));if(this.cropSeedCache?.size>6000)this.cropSeedCache.clear();}
  setSelection(id){this.selection=id;}
  setGhost(node){this.ghost=node;}
  setRoutesVisible(v){this.routesVisible=Boolean(v);}
  getZoom(){return this.zoom;}
  setZoomLevel(n){if(Number.isFinite(n))this.zoom=clamp(n,.06,5);this.scale=this.baseScale*this.zoom;this.hitRects=[];return this.zoom;}
  setZoom(delta){return this.setZoomLevel(this.zoom*Math.pow(1.16,Number(delta)||0));}
  fit(){
    this.focus={x:0,z:0};this.follow=false;this.resize();const w=this.world.width,d=this.world.depth,a=this.angle;
    const spanX=Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*d,spanY=(Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*d)*Math.sin(this.elevation);
    this.setZoomLevel(Math.min(this.width/(spanX+7),this.height*2*Math.min(this.cameraCentre.y,1-this.cameraCentre.y)/(spanY+8))/this.baseScale);return this.getCameraState();
  }
  resetCamera(){this.angle=Math.atan2(.6,.8);this.elevation=Math.asin(.55);if(this.mode==='editor')return this.fit();this.resize();this.setZoomLevel(1.1);return this.followPlayer();}
  followPlayer(){if(this.mode!=='editor')return super.followPlayer();this.focus={...this.world.start};this.follow=true;this.hitRects=[];return this.getCameraState();}
  project(x,z,y=0){
    if(this.localNode){const n=this.localNode,a=rad(n.rotation),dx=x-(n.originX||0),dz=z-(n.originZ||0);x=n.x+dx*Math.cos(a)-dz*Math.sin(a);z=n.z+dx*Math.sin(a)+dz*Math.cos(a);}
    return super.project(x,z,y);
  }
  withNode(node,fn,originX=0,originZ=0){const previous=this.localNode;this.localNode={...node,originX,originZ};try{fn();}finally{this.localNode=previous;}}
  previewCrops(n){
    const crops=[],a=rad(n.rotation),step=n.type==='orchard'?2.4:1.1,margin=n.type==='orchard'?1.1:.65;
    for(let x=-n.width/2+margin;x<n.width/2-.3;x+=step)for(let z=-n.depth/2+margin;z<n.depth/2-.3;z+=step)crops.push({id:n.id+'-'+x+'-'+z,nodeId:n.id,x:n.x+x*Math.cos(a)-z*Math.sin(a),z:n.z+x*Math.sin(a)+z*Math.cos(a),type:outputForView(this.world,n)||'wheat',growth:1});
    return crops;
  }
  render(dt=.016,state=null){
    dt=clamp(Number(dt)||0,0,.05);this.time+=dt;this.scale=this.baseScale*this.zoom;this.hitRects=[];
    if(state)this.game.state={...state,market:{stock:{}},machines:{mill:{working:false}}};
    const c=this.ctx,w=this.world;this.padStateById=new Map((state?.pads||[]).map(p=>[p.id,p]));
    if(this.follow&&state?.player){const p=state.player,t=1-Math.exp(-dt*5);this.focus.x+=(p.x-this.focus.x)*t;this.focus.z+=(p.z-this.focus.z)*t;}
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.lineJoin='round';c.lineCap='round';
    this.drawBackground();
    this.box(0,0,w.width,w.depth,.9,'#a1c972','#6f9148','#5c8040',-.88);
    this.ground(0,0,w.width,w.depth,'#a9d17b','#c3df96',.02);this.ground(0,0,Math.max(1,w.width-.7),Math.max(1,w.depth-.7),'#8cbd62',null,.04);this.grassTexture(w.width,w.depth);
    this.drawParcels(state);
    for(const n of w.nodes){
      if(!nodeOpen(w,n,state,this.mode))continue;
      if(n.type==='path')this.withNode(n,()=>{this.ground(0,0,n.width+.1,n.depth+.1,'#bca37255',null,.06);this.ground(0,0,n.width,n.depth,'#e8cf9c',null,.075);});
      if(n.type==='field')this.withNode(n,()=>this.fieldBed(0,0,n.width,n.depth));
      if(n.type==='orchard')this.withNode(n,()=>this.ground(0,0,n.width,n.depth,'#78a94e','#bbcc77',.08));
    }
    if(this.mode==='editor'&&this.zoom>.5){c.save();c.globalAlpha=.14;for(let x=-w.width/2;x<=w.width/2;x+=2)this.line(this.project(x,-w.depth/2,.1),this.project(x,w.depth/2,.1),'#476c49',.7);for(let z=-w.depth/2;z<=w.depth/2;z+=2)this.line(this.project(-w.width/2,z,.1),this.project(w.width/2,z,.1),'#476c49',.7);c.restore();}
    if(this.routesVisible)this.drawRoutes(state);
    const basis=this.cameraBasis(),draw=[],depth=(x,z)=>x*basis.s+z*basis.c,add=(x,z,fn)=>draw.push({depth:depth(x,z),fn});
    for(const n of w.nodes){
      const ns=state?.nodes?.[n.id],parcel=parcelForView(w,n),unlocked=nodeOpen(w,n,state,this.mode);
      const reveal=this.nodeReveals.get(n.id)||{open:unlocked,at:-100};if(!reveal.open&&unlocked)reveal.at=this.time;reveal.open=unlocked;this.nodeReveals.set(n.id,reveal);
      if(parcel&&!parcelOpen(parcel,state,this.mode))continue;
      if(['field','orchard'].includes(n.type)){
        if(!state&&unlocked){const crops=this.previewByNode.get(n.id)||[];for(let i=0;i<crops.length;i++){const p=crops[i];if(this.visible(p.x,p.z,1.4,p.type==='apple'?3:1.3))add(p.x,p.z,()=>this.crop(p,i));}}
      }else if(n.type!=='path')add(n.x,n.z,()=>this.drawRevealedNode(n,ns,unlocked,reveal.at));
      if(!unlocked&&!PAD_TYPES.includes(n.type))add(n.x,n.z,()=>this.withNode(n,()=>this.blueprint(0,0,n.width,n.depth,'')));
      if(unlocked&&ns){const ports=portsFor(n),good=n.type==='barn'?Object.keys(ns.stock||{}).find(g=>ns.stock[g]>0):outputForView(w,n);if((recipeForView(w,n)||n.type==='barn')&&stockCount(ns.stock)>0)add(ports.output.x,ports.output.z,()=>{const at=this.project(ports.output.x,ports.output.z,.3);this.goods(at.x,at.y,good||'wheat',Math.min(stockCount(ns.stock),5),this.scale/23);});}
    }
    if(state)for(let i=0;i<(state.crops||[]).length;i++){const crop=state.crops[i],node=this.nodeMap.get(crop.nodeId);if(crop.unlocked===false||node&&!nodeOpen(w,node,state,this.mode)||!this.visible(crop.x,crop.z,1.4,(this.goodCatalog[crop.type]?.model||crop.type)==='apple'?3:1.3))continue;add(crop.x,crop.z,()=>this.crop(crop,i));}
    if(this.mode==='editor')add(w.start.x,w.start.z,()=>{this.person({...w.start,bag:[],moving:false},'player');this.badge(w.start.x,w.start.z,'farmhand','START',{y:2.9,small:true,fill:'#f6f2d5'});});
    if(state){
      for(const [i,p]of(state.customers||[]).entries())add(p.x,p.z,()=>{this.person(p,'customer',i);if(p.mood==='angry'||p.mood==='impatient')this.badge(p.x,p.z,'customer',p.mood==='angry'?'!':'…',{small:true,y:3.5,fill:p.mood==='angry'?'#ffb8a4':'#fff0b2',border:p.mood==='angry'?'#d15135':'#d4a22e'});});
      for(const [i,p]of(state.workers||[]).entries())add(p.x,p.z,()=>this.person(p,'runner',i));
      if(state.player)add(state.player.x,state.player.z,()=>this.person(state.player,'player'));
    }
    draw.sort((a,b)=>a.depth-b.depth).forEach(o=>o.fn());
    for(const n of w.nodes)this.drawPorts(n,state?.nodes?.[n.id],state);
    this.drawParcelPads(state);if(state?.showStatus!==false)this.drawStatuses(state);
    for(const selected of selectedObjects(w,this.selection))this.outlineNode(selected,'#fff9c8',3);
    for(const ghost of ghostObjects(this.ghost)){c.save();c.globalAlpha=.65;this.outlineNode(ghost,'#fff6a8',2,'#f9e89640');c.restore();}
    if(this.mode==='editor'&&this.selection==='start')this.ring(w.start.x,w.start.z,1.1,'#fff4a6',3);
    this.drawEffects(dt);this.drawFinish();
  }
  drawParcels(state){
    const c=this.ctx;
    for(const parcel of this.world.parcels||[]){
      const open=parcelOpen(parcel,state,this.mode),prior=this.parcelStates.get(parcel.id)||{open,at:-100};if(open&&!prior.open)prior.at=this.time;prior.open=open;this.parcelStates.set(parcel.id,prior);
      const fade=1-clamp((this.time-prior.at)/1.1,0,1);
      c.save();if(this.mode==='editor'||!open||fade>0){c.globalAlpha=this.mode==='editor'?.1:open?fade*.76:.76;this.ground(parcel.x,parcel.z,parcel.width-.08,parcel.depth-.08,'#728b6d',null,.085);}
      c.globalAlpha=this.mode==='editor'?.55:open?.25:.8;c.setLineDash([8,6]);this.outlineNode({...parcel,rotation:0},open?'#d1df9c':'#f3e4a6',1.3);c.setLineDash([]);c.restore();
    }
  }
  drawParcelPads(state){
    for(const parcel of this.world.parcels||[]){
      if(parcel.unlocked||this.mode!=='editor'&&parcelOpen(parcel,state,this.mode))continue;
      const actual=this.padStateById.get('parcel-'+parcel.id),at=actual||parcelPadForView(this.world,parcel),available=this.mode==='editor'||actual?.available===true,price=actual?.price??parcel.cost??0;
      const old=this.game.state.coins;this.game.state.coins=state?.coins??99999;
      const active=Boolean(actual?.id&&state?.activePad===actual.id);
      this.purchasePad({id:'parcel',x:at.x,z:at.z,price,available,active,progress:active?state?.padProgress||0:0});this.game.state.coins=old;
      this.badge(at.x,at.z,'parcel',price,{gold:available,coin:true,lock:!available,y:1,small:this.zoom<.8,fill:available?'#fff9cc':'#e6d7ab',border:available?'#e9ab17':'#bda36c'});
    }
  }
  drawStatuses(state){
    if(this.mode!=='game'||this.zoom<.42)return;
    const c=this.ctx;
    for(const [id,status]of nodeStatusMap(state)){
      const node=this.nodeMap.get(id),style=STATUS_STYLE[status.status];if(!node||!style||!nodeOpen(this.world,node,state,this.mode)||!this.visible(node.x,node.z,2,6))continue;
      const at=this.project(node.x,node.z,node.type==='barn'?5:node.type==='field'?1.65:node.type==='dairy'?3.75:4.0),size=clamp(this.scale*.9,18,28);
      c.save();c.fillStyle=style.fill;c.strokeStyle=style.border;c.lineWidth=1.5;c.beginPath();c.roundRect(at.x-size*.56,at.y-size*.46,size*1.12,size*.92,size*.24);c.fill();c.stroke();drawFarmIcon(c,style.icon,at.x,at.y,size*.65,style.ink);
      if(status.status==='working'){c.fillStyle=style.border;c.fillRect(at.x-size*.39,at.y+size*.39,size*.78,2);c.fillStyle=style.ink;c.fillRect(at.x-size*.39,at.y+size*.39,size*.78*clamp(status.progress||0,0,1),2);}
      c.restore();
    }
  }
  drawRevealedNode(n,ns,open,revealedAt){
    const q=clamp((this.time-revealedAt)/.75,0,1);if(q>=1){this.drawNode(n,ns,open);return;}
    const p=this.project(n.x,n.z),c=this.ctx,scale=.15+.85*(1-Math.pow(1-q,3));c.save();c.translate(p.x,p.y);c.scale(1,scale);c.translate(-p.x,-p.y);this.drawNode(n,ns,open);c.restore();
  }
  drawWorkshop(node,state){
    const output=outputForView(this.world,node),product=this.goodCatalog[output]||{},kind=product.model||output,c=this.ctx;
    this.withNode(node,()=>{
      const sx=node.width/5,sz=node.depth/4;this.building(0,0,node.width*.88,node.depth*.8,2.25,'#efdbad',kind==='juice'?'#6e9565':['cheese','butter'].includes(kind)?'#559783':'#bd7952','workshop');
      const front=node.depth*.42;
      if(kind==='bread'){
        this.box(-.8*sx,front,1.55*sx,.62*sz,1.3,'#c18c5a','#aa6944','#80503a',.02);const at=this.project(-.8*sx,front+.33*sz,.68);this.ellipse(at,this.scale*.48,this.scale*.31,'#684630');this.ellipse({x:at.x,y:at.y+this.scale*.08},this.scale*.34,this.scale*.14,state?.working?'#ffc56c':'#c18e55');
        this.box(-1.3*sx,-.5*sz,.6,.6,1.45,'#d5ac7b','#a77352','#8c624b',2.8);
        if(state?.working){c.save();for(let i=0;i<3;i++){const phase=(this.time*.42+i*.33)%1,p=this.project(-1.3*sx+Math.sin(phase*3)*.16,-.5*sz,4.15+phase*1.05);c.globalAlpha=(1-phase)*.35;this.ellipse(p,this.scale*(.17+phase*.12),this.scale*(.13+phase*.10),'#fff5db');}c.restore();}
      }else if(kind==='juice'){
        for(const x of[-1.4,-.2])this.box(x*sx,front,.14,.2,1.65,'#d0aa6b','#a77a47','#805b36');this.box(-.8*sx,front,1.5,.3,.18,'#deb77c','#ad804b','#7f613e',1.6);this.box(-.8*sx,front,1.1,.6,.6,'#c29251','#a87a44','#8e683b',.03);const y=1.0+(state?.working?Math.sin(this.time*3.5)*.12:0);this.box(-.8*sx,front,.9,.55,.10,'#b0b194','#7c8b72','#66735b',y);
      }else{
        const at=this.project(-.8*sx,front,.6),k=this.scale;this.ellipse({x:at.x,y:at.y+k*.28},k*.6,k*.25,kind==='butter'?'#a77e49':'#8ba490');c.fillStyle=kind==='butter'?'#bc965e':'#adc5ae';c.fillRect(at.x-k*.6,at.y-k*.22,k*1.2,k*.48);this.ellipse({x:at.x,y:at.y-k*.22},k*.6,k*.23,kind==='butter'?'#dcc08b':'#f0e9cf');
        const movement=state?.working?Math.sin(this.time*3.5)*.13:0;this.line(this.project(-.8*sx,front,.8),this.project(-.8*sx,front,1.6+movement),'#85643d',Math.max(1,k*.06));
      }
      const p=this.project(node.width*.28,front+.3,.25);this.goods(p.x,p.y,output||'flour',1,this.scale/18);
      const sign=this.project(.1,front*.5,3.2);c.save();c.fillStyle='#fff0c8';c.strokeStyle='#d4b176';c.lineWidth=1;c.beginPath();c.roundRect(sign.x-this.scale*.38,sign.y-this.scale*.30,this.scale*.76,this.scale*.60,this.scale*.12);c.fill();c.stroke();drawFarmIcon(c,['bread','cheese','butter','juice'].includes(kind)?kind:'workshop',sign.x,sign.y,this.scale*.47,'#5c7653');c.restore();
    });
  }
  outlineNode(n,color,width=2,fill=null){this.withNode(n,()=>{const p=[[-n.width/2,-n.depth/2],[n.width/2,-n.depth/2],[n.width/2,n.depth/2],[-n.width/2,n.depth/2]].map(([x,z])=>this.project(x,z,.15));this.poly(p,fill,color,width);});}
  drawNode(n,ns,unlocked){
    if(!unlocked)return;
    if(n.type==='tree'){this.tree(n.x,n.z,Math.max(.5,n.width/2));return;}
    if(n.type==='pond'){this.withNode(n,()=>this.pond(0,0,n.width,n.depth));return;}
    if(n.type==='fence'){this.withNode(n,()=>this.fence(-n.width/2,0,n.width/2,0));return;}
    if(n.type==='market'){this.game.state.market={stock:ns?.stock||{}};this.withNode(n,()=>this.market(),0,7);return;}
    if(n.type==='dairy'){drawDairy(this,n,ns);return;}
    if(n.type==='workshop'){this.drawWorkshop(n,ns);return;}
    if(['barn','coop','mill'].includes(n.type)){
      this.withNode(n,()=>{this.building(0,0,n.width,n.depth,n.type==='barn'?3:2.3,n.type==='barn'?'#d88458':n.type==='coop'?'#ebc47e':'#72a895',n.type==='mill'?'#d5a064':'#cf7454',n.type);if(n.type==='mill'){this.game.state.machines.mill.working=ns?.working;this.wheel(n.width/2+.25,.3,1.25);}if(n.type==='coop')for(let i=0;i<3;i++)this.chicken(-n.width/2+.6+i+Math.sin(this.time*.37+i)*.17,.3+n.depth/2+Math.cos(this.time*.45+i)*.14,i);});
    }
  }
  drawPorts(n,ns,state){
    const ports=portsFor(n),parcel=parcelForView(this.world,n),unlocked=nodeOpen(this.world,n,state,this.mode),recipe=recipeForView(this.world,n),good=outputForView(this.world,n);
    if(parcel&&!parcelOpen(parcel,state,this.mode))return;
    const actual=this.padStateById?.get(n.id),done=actual?((actual.maxLevel>0&&actual.level>=actual.maxLevel)||(!actual.repeatable&&actual.kind!=='upgrade'&&actual.unlocked)):unlocked&&!PAD_TYPES.includes(n.type);
    const needsPad=(n.cost>0||PAD_TYPES.includes(n.type))&&(this.mode==='editor'||!done);
    if(needsPad){
      const at=ports.pad,price=actual?.price??n.cost,available=this.mode==='editor'||(actual?actual.available:!unlocked||PAD_TYPES.includes(n.type)),p={id:CATALOG[n.type]?.icon||n.type,x:at.x,z:at.z,price,available,unlocked:false,active:state?.activePad===n.id,progress:state?.activePad===n.id?state.padProgress:0};
      const old=this.game.state.coins;this.game.state.coins=state?.coins??99999;this.purchasePad(p);this.game.state.coins=old;
      this.badge(at.x,at.z,CATALOG[n.type]?.icon||n.type,price,{gold:available,coin:true,lock:!available,y:.95,small:this.zoom<.8,fill:available?'#fff9cc':'#e6d7ab',border:available?'#e9ab17':'#bda36c'});
    }
    if(!unlocked)return;
    if(n.type==='market'){
      this.interaction(ports.input.x,ports.input.z,1.8,1.6,'#bad48a');this.badge(ports.input.x,ports.input.z,'sell','SELL',{small:true,y:.75});
    }else if(recipe||n.type==='barn'){
      this.interaction(ports.input.x,ports.input.z,1.4,1.4,'#e1c775');this.interaction(ports.output.x,ports.output.z,1.4,1.4,'#b8d490');
      const feed=Object.keys(recipe?.inputs||{})[0]||'wheat';
      this.badge(ports.input.x,ports.input.z,n.type==='barn'?'box-in':Object.keys(recipe?.inputs||{}).length>1?'feed':this.goodCatalog[feed]?.model||feed,n.type==='barn'?'IN':ns?stockCount(ns.inputs)||ns.feed||0:'',{small:true,y:.75});this.badge(ports.output.x,ports.output.z,n.type==='barn'?'box-out':this.goodCatalog[good]?.model||good,ns?stockCount(ns.stock):'',{small:true,y:.75});
    }
  }
  drawRoutes(state){
    const c=this.ctx;
    for(const link of this.world.links){const a=this.nodeMap.get(link.from),b=this.nodeMap.get(link.to);if(!a||!b||this.mode==='game'&&(!nodeOpen(this.world,a,state,this.mode)||!nodeOpen(this.world,b,state,this.mode)))continue;
      const ap=portsFor(a).output,bp=portsFor(b).input,p=this.project(ap.x,ap.z,.18),q=this.project(bp.x,bp.z,.18),selected=this.selection===link.id;
      c.save();c.strokeStyle=selected?'#ffda5c':'#247b6e';c.lineWidth=selected?3:2;c.setLineDash([7,5]);c.lineDashOffset=-this.time*12;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();c.setLineDash([]);
      const t=.57,at={x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t},ang=Math.atan2(q.y-p.y,q.x-p.x);c.translate(at.x,at.y);c.rotate(ang);this.poly([{x:7,y:0},{x:-5,y:-5},{x:-5,y:5}],selected?'#ffe48b':'#247b6e');c.restore();
      if(this.mode==='editor'){const mp=this.project((ap.x+bp.x)/2,(ap.z+bp.z)/2,.2);c.save();c.fillStyle='#f6f7dd';c.beginPath();c.arc(mp.x,mp.y,11,0,Math.PI*2);c.fill();drawFarmIcon(c,'runner',mp.x,mp.y,14,'#256251');c.restore();}
    }
  }
}
