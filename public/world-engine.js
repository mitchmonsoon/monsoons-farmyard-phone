import {CATALOG, GOODS, normalizeWorld, portsFor, rotatePoint, nodeBounds, canLink, worldFingerprint,goodsFor,recipesFor,recipeFor,producedGood,acceptsGoods,parcelForNode,parcelPad} from './world-schema.js';

const LIMIT=1_000_000_000,MONEY_LIMIT=Number.MAX_SAFE_INTEGER,GOODS_KEYS=Object.keys(GOODS);
const bounded=(v,fallback=0,min=0,max=LIMIT)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
const whole=(v,fallback=0,min=0,max=LIMIT)=>Math.floor(bounded(v,fallback,min,max));
const money=(v,fallback=0)=>whole(v,fallback,0,MONEY_LIMIT);
const bag=(value,capacity,keys=GOODS_KEYS)=>Array.isArray(value)?value.filter(v=>keys.includes(v)).slice(0,capacity):[];
const counts=(value,keys=GOODS_KEYS)=>Object.fromEntries(keys.map(k=>[k,whole(value?.[k],0,0,100000)]));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const contained=(p,b)=>p.x>b.x0&&p.x<b.x1&&p.z>b.z0&&p.z<b.z1;
const legacyFeed=(n,r)=>['coop','dairy','mill'].includes(n.type)&&r&&Object.keys(r.inputs).length===1;
const UPGRADE_TYPES=['basket','boots','farmupgrade'];
const PAD_SETTLE=.55,PAD_FILL=1.35,PAD_INSIDE=.8;
const FARM_CLIENTS=Object.freeze([
  {id:'betty',name:'Betty’s Café'},{id:'village',name:'Village Shop'},{id:'bakery',name:'Little Bakery'},
  {id:'school',name:'School Kitchen'},{id:'market',name:'Market Trader'},{id:'farmbox',name:'Farm Box Club'}
]);
const urgencySeconds=(settings,type)=>type==='urgent'?settings.urgentSeconds:type==='standard'?settings.standardSeconds:settings.relaxedSeconds;
const BOARD_NAMES=['Betty’s Café catering','Little Bakery weekend order','Village fête organisers','School Kitchen special','Farm Box subscribers','Harvest market collection'];
const PRESSURE_MULTIPLIER={gentle:1.6,normal:1,busy:.82};



function cropLayout(world){
  const result=[];
  for(const n of world.nodes){
    if(!['field','orchard'].includes(n.type))continue;
    const step=n.type==='orchard'?2.3:1.1;
    const cols=Math.max(1,Math.min(n.type==='orchard'?8:16,Math.floor((n.width-.7)/step))),rows=Math.max(1,Math.min(n.type==='orchard'?8:16,Math.floor((n.depth-.7)/step)));
    for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){
      if(result.length>=3000)break;
      const p=rotatePoint(n,(x-(cols-1)/2)*step,(z-(rows-1)/2)*step);
      result.push({id:`${n.id}:${x}:${z}`,nodeId:n.id,...p,type:producedGood(world,n),growth:1,unlocked:false});
    }
  }
  return result;
}

/** Configurable simulation. World blueprints never contain a player's progress. */
export class WorldGame {
  constructor(definition,saved=null){
    this.world=normalizeWorld(definition);this.goods=goodsFor(this.world);this.goodKeys=Object.keys(this.goods);this.recipes=recipesFor(this.world);this.fingerprint=worldFingerprint(this.world);
    if(typeof saved==='string'){try{saved=JSON.parse(saved);}catch{saved=null;}}
    if(saved?.state)saved=saved.state;
    if(!saved||typeof saved!=='object'||Array.isArray(saved)||saved.worldId!==this.world.id)saved={};
    const restoredPosition=Number.isFinite(saved.player?.x)&&Number.isFinite(saved.player?.z);
    this.reconciled=!!saved.worldFingerprint&&saved.worldFingerprint!==this.fingerprint;
    this.definitions=new Map(this.world.nodes.map(n=>[n.id,n]));this.parcelDefinitions=new Map(this.world.parcels.map(p=>[p.id,p]));
    const parcels=Object.fromEntries(this.world.parcels.map(p=>[p.id,p.unlocked||p.cost===0&&!p.requires.length||saved.parcels?.[p.id]===true]));
    // Transfer already-earned balances, including a market removed in a saved
    // blueprint edit. New snapshots keep the old cash keys at zero, so loading
    // the migrated snapshot cannot credit the same money again.
    const pendingCash=Object.entries(saved.nodes||{}).reduce((sum,[id,node])=>node?.type==='market'||!node?.type&&this.definitions.get(id)?.type==='market'?Math.min(MONEY_LIMIT,sum+whole(node?.cash)):sum,0);
    this.ports=new Map(this.world.nodes.map(n=>[n.id,portsFor(n)]));
    this._events=[];this._cellCache=new Map();this._runtime=new Map();this._saleTimers=new Map();
    this._timers={harvest:0,transfer:0};this._padLatch=null;this._padHold=0;this._padPosition=null;this._movementIntent=false;this._padReloadLatch=false;
    this._serial=whole(saved.customerSerial);this._orderSerial=whole(saved.orderSerial);this._mixedOrderDue=saved.mixedOrderDue===true;this._fullNotice=false;
    this._savedWorkers=new Map(Array.isArray(saved.workers)?saved.workers.filter(w=>w&&typeof w.id==='string').map(w=>[w.id,w]):[]);
    const nodes=Object.create(null);
    for(const n of this.world.nodes){
      const old=saved.nodes?.[n.id],valid=old&&(!old.type||old.type===n.type)?old:null,recipe=recipeFor(this.world,n),parcel=parcelForNode(this.world,n);
      const upgrade=UPGRADE_TYPES.includes(n.type),landOpen=!parcel||parcels[parcel.id],unlocked=landOpen&&(upgrade||n.cost===0&&!n.requires.length||valid?.unlocked===true);
      const inputs=counts(valid?.inputs,this.goodKeys);if(recipe&&!valid?.inputs&&legacyFeed(n,recipe))inputs[recipe.input]=whole(valid?.feed,0,0,24);
      nodes[n.id]={id:n.id,type:n.type,unlocked,level:upgrade?whole(valid?.level,0,0,n.type==='basket'?3:n.type==='boots'?2:LIMIT):valid?.level>0||valid?.unlocked?1:unlocked?1:0,
        feed:unlocked?legacyFeed(n,recipe)?whole(valid?.feed,inputs[recipe?.input]||0,0,24):Object.values(inputs).reduce((a,b)=>a+b,0):0,inputs,
        stock:['market','barn'].includes(n.type)?counts(valid?.stock,this.goodKeys):whole(valid?.stock,0,0,32),
        progress:unlocked?bounded(valid?.progress,0,0,.999999):0,working:unlocked&&!!recipe&&valid?.working===true,
        reserves:n.type==='barn'?counts(valid?.reserves||n.reserves,this.goodKeys):{},cash:0,sold:whole(valid?.sold),produced:whole(valid?.produced),received:whole(valid?.received)};
    }
    const met=ids=>ids.every(id=>nodes[id]?.level>0||parcels[id]===true);
    for(let pass=0;pass<this.world.nodes.length+this.world.parcels.length;pass++){
      let changed=false;
      for(const p of this.world.parcels)if(!parcels[p.id]&&p.cost===0&&met(p.requires)){parcels[p.id]=true;changed=true;}
      for(const n of this.world.nodes){const p=parcelForNode(this.world,n);if(!nodes[n.id].unlocked&&n.cost===0&&(!p||parcels[p.id])&&met(n.requires)){nodes[n.id].unlocked=true;nodes[n.id].level=1;changed=true;}}
      if(!changed)break;
    }
    const capacity=Math.min(100,this.world.settings.capacity+this.world.nodes.filter(n=>n.type==='basket').reduce((sum,n)=>sum+nodes[n.id].level*8,0));
    const speed=Math.min(12,this.world.settings.moveSpeed+this.world.nodes.filter(n=>n.type==='boots').reduce((sum,n)=>sum+nodes[n.id].level*.7,0));
    const crops=cropLayout(this.world),oldCrops=new Map(Array.isArray(saved.crops)?saved.crops.filter(c=>c&&typeof c.id==='string').map(c=>[c.id,c]):[]);
    for(const crop of crops){crop.growth=bounded(oldCrops.get(crop.id)?.growth,1,0,1);crop.unlocked=nodes[crop.nodeId].unlocked;}
    this.state={version:1,worldId:this.world.id,worldFingerprint:this.fingerprint,time:bounded(saved.time),coins:Math.min(MONEY_LIMIT,money(saved.coins,this.world.settings.startingCoins)+pendingCash),earned:money(saved.earned),sold:whole(saved.sold),harvested:whole(saved.harvested),delivered:whole(saved.delivered),collected:Math.min(MONEY_LIMIT,money(saved.collected)+pendingCash),
      player:{x:bounded(saved.player?.x,this.world.start.x,-this.world.width/2+.4,this.world.width/2-.4),z:bounded(saved.player?.z,this.world.start.z,-this.world.depth/2+.4,this.world.depth/2-.4),angle:bounded(saved.player?.angle,0,-Math.PI*2,Math.PI*2),moving:false,bag:bag(saved.player?.bag,capacity,this.goodKeys),capacity,speed},
      nodes,parcels,crops,workers:[],customers:[],stats:counts(saved.stats,this.goodKeys),soldGoods:counts(saved.soldGoods,this.goodKeys),claimedMilestones:Array.isArray(saved.claimedMilestones)?saved.claimedMilestones.filter(id=>this.world.milestones.some(m=>m.id===id)):[],milestoneRewards:money(saved.milestoneRewards),nodeStatuses:[],
      farmLevel:1+this.world.nodes.filter(n=>n.type==='farmupgrade').reduce((sum,n)=>sum+nodes[n.id].level,0),ordersCompleted:whole(saved.ordersCompleted),mixedOrdersCompleted:whole(saved.mixedOrdersCompleted),orderBonuses:money(saved.orderBonuses),
      reputation:whole(saved.reputation,70,0,100),ordersFailed:whole(saved.ordersFailed),lateFines:money(saved.lateFines),
      customerRelations:Object.fromEntries(FARM_CLIENTS.map(p=>[p.id,{served:whole(saved.customerRelations?.[p.id]?.served),missed:whole(saved.customerRelations?.[p.id]?.missed)}])),
      nextRushAt:whole(saved.nextRushAt,Math.max(this.world.settings.rushEvery||10,(Math.floor(whole(saved.ordersCompleted)/(this.world.settings.rushEvery||10))+1)*(this.world.settings.rushEvery||10)),1,LIMIT),
      rushUntil:bounded(saved.rushUntil,0,0,LIMIT),rushCount:whole(saved.rushCount),
      boardOffers:Array.isArray(saved.boardOffers)?saved.boardOffers.slice(0,12).filter(o=>o&&/^board-\d+$/.test(o.id)&&o.items&&['offered','active','done','failed','declined','expired'].includes(o.status)).map(o=>({...o,items:Object.fromEntries(Object.entries(o.items).filter(([g,n])=>this.goodKeys.includes(g)&&Number.isInteger(n)&&n>=1&&n<=50)),reward:money(o.reward),fine:money(o.fine),startedAt:Number.isFinite(o.startedAt)?bounded(o.startedAt):null,deadline:Number.isFinite(o.deadline)?bounded(o.deadline):null,expiresAt:bounded(o.expiresAt,0)})).filter(o=>Object.keys(o.items).length):[],
      boardSerial:whole(saved.boardSerial),boardNextAt:bounded(saved.boardNextAt,0),boardServed:whole(saved.boardServed),
      helperFocus:typeof saved.helperFocus==='string'&&this.goodKeys.includes(saved.helperFocus)?saved.helperFocus:'',helperFocusUntil:bounded(saved.helperFocusUntil,0),
      activePad:null,padProgress:0,padHoldProgress:0,padPhase:null};
    this._solid=this.world.nodes.filter(n=>CATALOG[n.type].solid).map(n=>({id:n.id,bounds:nodeBounds(n,n.type==='fence'?.28:.32)}));
    if(!this.isWalkable(this.state.player.x,this.state.player.z)){const p=this.nearestWalkable(this.world.start);if(p)Object.assign(this.state.player,p);}
    this._syncWorkers();this._restoreCustomers(saved);this._seedBoard();this._checkMilestones();this._updateObjective();this.state.nodeStatuses=this.getNodeStatuses();
    // A saved position inside a purchase square must never restart spending.
    if(restoredPosition){const p=this.state.player,occupied=this.getPads().find(pad=>Math.abs(p.x-pad.x)<PAD_INSIDE&&Math.abs(p.z-pad.z)<PAD_INSIDE);if(occupied){this._padLatch=occupied.id;this._padReloadLatch=true;this.state.activePad=occupied.id;this.state.padPhase='reenter';}}
  }

  getPads(){
    const out=[];
    for(const n of this.world.nodes){
      const s=this.state.nodes[n.id],upgrade=UPGRADE_TYPES.includes(n.type),repeatable=n.type==='farmupgrade';
      if(!upgrade&&n.cost<=0)continue;
      const maxLevel=n.type==='basket'?3:n.type==='boots'?2:repeatable?0:1,level=upgrade?s.level:+s.unlocked;
      const parcel=parcelForNode(this.world,n),requirements=[...n.requires,...(parcel&&!this.state.parcels[parcel.id]?[parcel.id]:[])],missing=requirements.filter(id=>!this._requirementsMet([id])),blocked=missing.length>0;
      const requirementText=blocked?`First unlock ${missing.map(id=>this.definitions.get(id)?.name||this.parcelDefinitions.get(id)?.name||'the required item').join(' and ')}.`:'';
      const description=n.type==='basket'?'Carry 8 more goods.':n.type==='boots'?'Walk a little faster.':repeatable?'Raise your farm rank and the bonus on future customer orders.':n.type==='helper'?'Hire the helpers assigned to this pad’s delivery routes.':n.type==='dairy'?'Feed 1 hay. Collect 2 milk after 4.5 seconds.':n.type==='coop'?'Feed 1 hay. Collect 2 eggs after 3.5 seconds.':`Open ${n.name.toLowerCase()}.`;
      out.push({id:n.id,nodeId:n.id,type:n.type,icon:CATALOG[n.type].icon,...this.ports.get(n.id).pad,label:n.name,description,
        kind:upgrade?'upgrade':n.type==='helper'?'helper':'unlock',price:Math.min(100000000,Math.round(n.cost*(repeatable?1+level*.65+Math.pow(level,1.25)*.08:Math.pow(1.7,upgrade?Math.min(level,100):0)))),level,maxLevel,repeatable,blocked,requirementText,lockedReason:requirementText,
        unlocked:level>0,available:!blocked&&(repeatable||level<maxLevel),progress:this.state.activePad===n.id?this.state.padProgress:0});
    }
    for(const parcel of this.world.parcels){if(parcel.unlocked||parcel.cost===0&&!parcel.requires.length)continue;const unlocked=this.state.parcels[parcel.id],missing=parcel.requires.filter(id=>!this._requirementsMet([id])),requirementText=missing.length?`First unlock ${missing.map(id=>this.definitions.get(id)?.name||this.parcelDefinitions.get(id)?.name||'the previous land').join(' and ')}.`:'';
      out.push({id:'parcel-'+parcel.id,nodeId:null,parcelId:parcel.id,type:'parcel',icon:'parcel',...parcelPad(this.world,parcel),label:parcel.name,description:'Open this adjoining land and its new farm opportunities.',kind:'land',price:parcel.cost,level:unlocked?1:0,maxLevel:1,repeatable:false,blocked:!!missing.length,requirementText,lockedReason:requirementText,unlocked,available:!unlocked&&!missing.length,progress:this.state.activePad==='parcel-'+parcel.id?this.state.padProgress:0});}
    return out;
  }

  buy(id){
    const pad=this.getPads().find(p=>p.id===id);
    if(!pad)return {ok:false,message:'That improvement is not available.'};
    if(pad.blocked)return {ok:false,message:pad.requirementText};
    if(!pad.available)return {ok:false,message:'Already fully upgraded.'};
    if(this.state.coins<pad.price)return {ok:false,message:`${pad.price-this.state.coins} more coins needed.`};
    this.state.coins-=pad.price;let message;
    if(pad.parcelId){this.state.parcels[pad.parcelId]=true;message=`${pad.label} is yours!`;}
    else{const n=this.definitions.get(id),s=this.state.nodes[id];s.unlocked=true;s.level++;
      if(n.type==='basket')this.state.player.capacity=Math.min(100,this.state.player.capacity+8);
      else if(n.type==='boots')this.state.player.speed=Math.min(12,this.state.player.speed+.7);
      else if(n.type==='farmupgrade')this.state.farmLevel++;
      if(n.type==='dairy'&&this._availableGoods().includes('egg'))this._mixedOrderDue=true;
      message=n.type==='basket'?'Bigger basket!':n.type==='boots'?'Faster boots!':n.type==='farmupgrade'?`Farm rank ${this.state.farmLevel}!`:n.type==='helper'?'Your helpers are on the job!':`${n.name} open!`;
    }
    this._refreshUnlocked();
    this.state.padProgress=0;this.state.padHoldProgress=0;this._padHold=0;if(this.state.activePad===id){this._padLatch=id;this._padReloadLatch=false;this.state.padPhase='complete';}
    this._emit({type:'purchase',x:pad.x,z:pad.z,amount:pad.price,text:message});this._updateObjective();
    return {ok:true,message};
  }

  update(dt,input={x:0,z:0}){
    dt=bounded(dt,0,0,.05);if(!dt)return;
    this.state.time+=dt;
    for(const k of Object.keys(this._timers))this._timers[k]-=dt;
    for(const crop of this.state.crops)if(crop.unlocked)crop.growth=Math.min(1,crop.growth+dt/(this.world.settings.growthSeconds*(crop.type==='apple'?1.4:1)));
    const x=bounded(input?.x,0,-1,1),z=bounded(input?.z,0,-1,1);this._movementIntent=Math.hypot(x,z)>.001;
    this._move(this.state.player,x,z,dt,this.state.player.speed);
    this._harvestPlayer();this._transferPlayer();this._machines(dt);this._workers(dt);this._tickBoard();this._customers(dt);this._pads(dt);this._checkMilestones();this._updateObjective();if(this.state.time>=(this._statusAt||0)){this.state.nodeStatuses=this.getNodeStatuses();this._statusAt=this.state.time+.4;}
  }

  _requirementsMet(ids=[]){return ids.every(id=>this.state.nodes[id]?.unlocked&&this.state.nodes[id]?.level>0||this.state.parcels[id]===true);}

  _refreshUnlocked(){
    for(let pass=0;pass<this.world.nodes.length+this.world.parcels.length;pass++){
      let changed=false;
      for(const p of this.world.parcels)if(!this.state.parcels[p.id]&&p.cost===0&&this._requirementsMet(p.requires)){this.state.parcels[p.id]=true;changed=true;}
      for(const n of this.world.nodes){const s=this.state.nodes[n.id],parcel=parcelForNode(this.world,n);if(!s.unlocked&&(!parcel||this.state.parcels[parcel.id])&&(n.cost===0||s.level>0)&&this._requirementsMet(n.requires)){s.unlocked=true;s.level=Math.max(1,s.level);changed=true;}}
      if(!changed)break;
    }
    for(const crop of this.state.crops)crop.unlocked=this.state.nodes[crop.nodeId].unlocked;
    this._cellCache.clear();this._syncWorkers();
    for(const n of this.world.nodes)if(n.type==='market'&&this.state.nodes[n.id].unlocked){
      const count=this.state.customers.filter(c=>c.nodeId===n.id&&c.phase==='queue').length;
      for(let i=count;i<3&&this.state.customers.length<120;i++)this.state.customers.push(this._newCustomer(n,i));
    }
  }

  _syncWorkers(){
    const existing=new Map(this.state.workers.map(w=>[w.id,w])),active=[];
    for(const link of this.world.links){
      const from=this.definitions.get(link.from),to=this.definitions.get(link.to);
      if(!canLink(from,to,this.world)||!this._requirementsMet(link.requires)||!this.state.nodes[from.id].unlocked||!this.state.nodes[to.id].unlocked)continue;
      for(let i=0;i<link.workers&&active.length<60;i++){
        const id=`${link.id}-${i}`;
        if(existing.has(id)){active.push(existing.get(id));continue;}
        const candidate=this._savedWorkers.get(id),old=candidate?.from===link.from&&candidate?.to===link.to?candidate:null;
        const point=this.nearestWalkable(this.ports.get(from.id).output)||this.state.player;
        const worker={id,linkId:link.id,from:from.id,to:to.id,name:['Bea','Pip','Rosa','Finn','Milo','Nell'][active.length%6],role:from.type==='field'?'farmhand':'runner',
          x:bounded(old?.x,point.x,-this.world.width/2+.4,this.world.width/2-.4),z:bounded(old?.z,point.z,-this.world.depth/2+.4,this.world.depth/2-.4),angle:bounded(old?.angle,0,-Math.PI*2,Math.PI*2),bag:bag(old?.bag,8,this.goodKeys).filter(g=>acceptsGoods(this.world,to).includes(g)),capacity:8,moving:false};
        if(!this.isWalkable(worker.x,worker.z))Object.assign(worker,point);
        active.push(worker);this._savedWorkers.delete(id);this._runtime.set(id,{mode:worker.bag.length?'deliver':'gather',timer:0,target:null,path:[],pathKey:'',repath:0,blocked:0});
      }
    }
    this.state.workers=active;
  }

  isWalkable(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>this.world.width/2-.4||Math.abs(z)>this.world.depth/2-.4)return false;
    if(this.world.parcels.some(p=>!this.state.parcels[p.id]&&Math.abs(x-p.x)<p.width/2&&Math.abs(z-p.z)<p.depth/2))return false;
    return !this._solid?.some(o=>this.state.nodes[o.id].unlocked&&contained({x,z},o.bounds));
  }

  nearestWalkable(point){
    if(this.isWalkable(point.x,point.z))return {...point};
    for(let r=1;r<=Math.max(this.world.width,this.world.depth);r++){
      for(let dx=-r;dx<=r;dx++)for(const dz of [-r,r])if(this.isWalkable(Math.round(point.x)+dx,Math.round(point.z)+dz))return {x:Math.round(point.x)+dx,z:Math.round(point.z)+dz};
      for(let dz=-r+1;dz<r;dz++)for(const dx of [-r,r])if(this.isWalkable(Math.round(point.x)+dx,Math.round(point.z)+dz))return {x:Math.round(point.x)+dx,z:Math.round(point.z)+dz};
    }
    return null;
  }

  /** A* on a one-unit grid, preventing diagonal corner cutting. */
  findPath(start,target){
    if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return [];
    target={x:bounded(target.x,0,-this.world.width/2+.5,this.world.width/2-.5),z:bounded(target.z,0,-this.world.depth/2+.5,this.world.depth/2-.5)};
    const endPoint=this.nearestWalkable(target);if(!endPoint)return [];
    let begin={x:Math.round(start.x),z:Math.round(start.z)},end={x:Math.round(endPoint.x),z:Math.round(endPoint.z)};
    const free=(x,z)=>{const key=`${x},${z}`;if(!this._cellCache.has(key))this._cellCache.set(key,this.isWalkable(x,z));return this._cellCache.get(key);};
    if(!free(begin.x,begin.z)){const p=this.nearestWalkable(begin);if(!p)return [];begin={x:Math.round(p.x),z:Math.round(p.z)};}
    if(!free(end.x,end.z)){const p=this.nearestWalkable(end);if(!p)return [];end={x:Math.round(p.x),z:Math.round(p.z)};}
    const key=p=>`${p.x},${p.z}`,heuristic=p=>Math.hypot(p.x-end.x,p.z-end.z),beginKey=key(begin),endKey=key(end);
    const open=[{...begin,g:0,f:heuristic(begin)}],parents=new Map(),score=new Map([[beginKey,0]]),closed=new Set();let result=null,count=0;
    while(open.length&&count++<22000){
      let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
      const at=open.splice(best,1)[0],atKey=key(at);if(closed.has(atKey))continue;
      if(atKey===endKey){result=atKey;break;}closed.add(atKey);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const next={x:at.x+dx,z:at.z+dz},nk=key(next);
        if(closed.has(nk)||!free(next.x,next.z)||dx&&dz&&(!free(at.x+dx,at.z)||!free(at.x,at.z+dz)))continue;
        const g=at.g+(dx&&dz?Math.SQRT2:1);if(g>=(score.get(nk)??Infinity))continue;
        score.set(nk,g);parents.set(nk,atKey);open.push({...next,g,f:g+heuristic(next)});
      }
    }
    if(!result)return [];
    const path=[];while(result!==beginKey){const [x,z]=result.split(',').map(Number);path.push({x,z});result=parents.get(result);if(!result)return [];}
    path.reverse();if(this.isWalkable(endPoint.x,endPoint.z))path.push(endPoint);return path;
  }

  drainEvents(){const result=this._events;this._events=[];return result;}
  _emit(event){if(this._events.length<200)this._events.push(event);}

  serialize(){
    const s=this.state;
    return {version:1,worldId:this.world.id,worldFingerprint:this.fingerprint,time:s.time,coins:s.coins,earned:s.earned,sold:s.sold,harvested:s.harvested,delivered:s.delivered,collected:s.collected,
      player:{x:s.player.x,z:s.player.z,angle:s.player.angle,bag:[...s.player.bag]},
      nodes:Object.fromEntries(Object.entries(s.nodes).map(([id,n])=>[id,{...n,inputs:{...n.inputs},reserves:{...n.reserves},stock:typeof n.stock==='object'?{...n.stock}:n.stock}])),parcels:{...s.parcels},claimedMilestones:[...s.claimedMilestones],milestoneRewards:s.milestoneRewards,
      crops:s.crops.map(c=>({id:c.id,growth:c.growth})),workers:s.workers.map(w=>({id:w.id,from:w.from,to:w.to,x:w.x,z:w.z,angle:w.angle,bag:[...w.bag]})),stats:{...s.stats},soldGoods:{...s.soldGoods},
      ordersCompleted:s.ordersCompleted,mixedOrdersCompleted:s.mixedOrdersCompleted,orderBonuses:s.orderBonuses,
      reputation:s.reputation,ordersFailed:s.ordersFailed,lateFines:s.lateFines,
      customerRelations:structuredClone(s.customerRelations),nextRushAt:s.nextRushAt,rushUntil:s.rushUntil,rushCount:s.rushCount,
      boardOffers:s.boardOffers.map(o=>({...o,items:{...o.items}})),boardSerial:s.boardSerial,boardNextAt:s.boardNextAt,boardServed:s.boardServed,helperFocus:s.helperFocus,helperFocusUntil:s.helperFocusUntil,
      customerSerial:this._serial,orderSerial:this._orderSerial,mixedOrderDue:this._mixedOrderDue,saleTimers:Object.fromEntries(this._saleTimers),
      customers:s.customers.map(c=>({...c,bag:[...c.bag],order:c.order?{...c.order,items:{...c.order.items}}:null}))};
  }

  _move(actor,x,z,dt,speed){
    const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
    const px=actor.x,pz=actor.z,nx=bounded(px+x*dt*speed,px,-this.world.width/2+.4,this.world.width/2-.4),nz=bounded(pz+z*dt*speed,pz,-this.world.depth/2+.4,this.world.depth/2-.4);
    if(this.isWalkable(nx,nz)){actor.x=nx;actor.z=nz;}else{if(this.isWalkable(nx,actor.z))actor.x=nx;if(this.isWalkable(actor.x,nz))actor.z=nz;}
    actor.moving=Math.hypot(actor.x-px,actor.z-pz)>.0001;
    if(actor.moving){const target=Math.atan2(x,z),angle=Math.atan2(Math.sin(target-actor.angle),Math.cos(target-actor.angle));actor.angle+=angle*Math.min(1,dt*15);actor.angle=Math.atan2(Math.sin(actor.angle),Math.cos(actor.angle));}
  }

  _takeCrop(crop,actor){crop.growth=0;actor.bag.push(crop.type);this.state.harvested++;this.state.stats[crop.type]++;this._emit({type:'harvest',x:crop.x,z:crop.z,good:crop.type,amount:1});}
  _harvestPlayer(){
    if(this._timers.harvest>0)return;const p=this.state.player;
    const crop=this.state.crops.find(c=>c.unlocked&&c.growth>=.99999&&distance(p,c)<1.15);if(!crop)return;
    if(p.bag.length>=p.capacity){if(!this._fullNotice)this._emit({type:'toast',text:'Basket full — find a market.'});this._fullNotice=true;return;}
    this._fullNotice=false;this._takeCrop(crop,p);this._timers.harvest=.13;
  }

  _inputStock(node,state,recipe=recipeFor(this.world,node)){
    if(recipe&&legacyFeed(node,recipe))state.inputs[recipe.input]=whole(state.feed,0,0,24);
    return state.inputs;
  }
  _syncFeed(node,state,recipe=recipeFor(this.world,node)){state.feed=recipe&&legacyFeed(node,recipe)?state.inputs[recipe.input]||0:Object.values(state.inputs).reduce((a,b)=>a+b,0);}
  _deposit(actor,node){
    const state=this.state.nodes[node.id],accepted=acceptsGoods(this.world,node),index=actor.bag.findIndex(g=>accepted.includes(g));
    if(index<0||!state.unlocked)return false;const good=actor.bag[index];
    if(node.type==='market'||node.type==='barn'){
      if(state.stock[good]>=100000||node.type==='barn'&&Object.values(state.stock).reduce((a,b)=>a+b,0)>=node.storageCapacity)return false;
      actor.bag.splice(index,1);state.stock[good]++;state.received++;if(node.type==='market')this.state.delivered++;
      this._emit({type:'deposit',...this.ports.get(node.id).input,good,amount:1});return true;
    }
    const recipe=recipeFor(this.world,node),inputs=this._inputStock(node,state,recipe);
    if(recipe&&inputs[good]<Math.max(24,recipe.inputs[good]*3)){
      actor.bag.splice(index,1);inputs[good]++;state.received++;this._syncFeed(node,state,recipe);this._emit({type:'deposit',...this.ports.get(node.id).input,good,amount:1});return true;
    }
    return false;
  }

  _transferPlayer(){
    if(this._timers.transfer>0)return;const player=this.state.player;
    for(const n of this.world.nodes){const s=this.state.nodes[n.id];if(!s.unlocked)continue;const p=this.ports.get(n.id),recipe=recipeFor(this.world,n);
      if(acceptsGoods(this.world,n).length&&distance(player,p.input)<1.3&&this._deposit(player,n)){this._timers.transfer=.14;return;}
      if(recipe&&distance(player,p.output)<1.15&&s.stock>0&&player.bag.length<player.capacity){s.stock--;player.bag.push(recipe.output);this.state.stats[recipe.output]++;this._emit({type:'harvest',...p.output,good:recipe.output,amount:1});this._timers.transfer=.15;return;}
    }
  }

  getStorage(){return this.world.nodes.filter(n=>n.type==='barn'&&this.state.nodes[n.id].unlocked).map(n=>{const s=this.state.nodes[n.id],p=this.ports.get(n.id);return {id:n.id,name:n.name,stock:{...s.stock},capacity:n.storageCapacity,used:Object.values(s.stock).reduce((a,b)=>a+b,0),reserves:{...s.reserves},nearby:Math.min(distance(this.state.player,p.input),distance(this.state.player,p.output))<3.2};});}
  withdrawStorage(id,good,amount=1){
    const n=this.definitions.get(id),s=this.state.nodes[id];if(n?.type!=='barn'||!s?.unlocked||!this.goodKeys.includes(good))return {ok:false,message:'Choose an open storage barn.',amount:0};
    const p=this.ports.get(id);if(Math.min(distance(this.state.player,p.input),distance(this.state.player,p.output))>=3.2)return {ok:false,message:'Walk to the barn to collect its goods.',amount:0};
    const count=Math.min(amount==='all'?100:whole(amount,1,1,100),s.stock[good],this.state.player.capacity-this.state.player.bag.length);
    if(!count)return {ok:false,message:s.stock[good]?'Your basket is full.':'The barn has none of that product.',amount:0};
    s.stock[good]-=count;this.state.player.bag.push(...Array(count).fill(good));this._timers.transfer=1;
    this._emit({type:'harvest',...p.output,good,amount:count});return {ok:true,message:`Collected ${count} ${this.goods[good].label.toLowerCase()}.`,amount:count};
  }
  setStorageReserve(id,good,count){const n=this.definitions.get(id),s=this.state.nodes[id];if(n?.type!=='barn'||!this.goodKeys.includes(good))return {ok:false,message:'Choose a barn and product.'};s.reserves[good]=whole(count,0,0,n.storageCapacity);return {ok:true,message:'Barn reserve saved.'};}

  _bankSale(amount){this.state.coins=Math.min(MONEY_LIMIT,this.state.coins+amount);this.state.earned=Math.min(MONEY_LIMIT,this.state.earned+amount);this.state.collected=Math.min(MONEY_LIMIT,this.state.collected+amount);}
  _machines(dt){
    for(const n of this.world.nodes){const recipe=recipeFor(this.world,n),s=this.state.nodes[n.id];if(!recipe||!s.unlocked)continue;const inputs=this._inputStock(n,s,recipe);
      if(!s.working&&Object.entries(recipe.inputs).every(([good,count])=>inputs[good]>=count)&&s.stock<=32-recipe.yield){
        for(const [good,count]of Object.entries(recipe.inputs))inputs[good]-=count;this._syncFeed(n,s,recipe);s.working=true;s.progress=0;
      }
      if(s.working){s.progress+=dt/recipe.seconds;if(s.progress>=1){s.stock=Math.min(32,s.stock+recipe.yield);s.produced+=recipe.yield;s.working=false;s.progress=0;this._emit({type:'produce',...this.ports.get(n.id).output,good:recipe.output,amount:recipe.yield});}}
    }
  }

  _walkWorker(worker,target,dt,rt){
    if(distance(worker,target)<.48){worker.moving=false;rt.path=[];return true;}
    const tk=`${target.x.toFixed(2)},${target.z.toFixed(2)}`;rt.repath-=dt;
    if(rt.pathKey!==tk||!rt.path.length&&rt.repath<=0||rt.blocked>.8){rt.path=this.findPath(worker,target);rt.pathKey=tk;rt.repath=1;rt.blocked=0;}
    while(rt.path.length&&distance(worker,rt.path[0])<.22)rt.path.shift();
    if(!rt.path.length){worker.moving=false;rt.noPath=true;return false;}rt.noPath=false;
    const next=rt.path[0],d=distance(worker,next),old={x:worker.x,z:worker.z};this._move(worker,(next.x-worker.x)/Math.max(d,.001),(next.z-worker.z)/Math.max(d,.001),Math.min(dt,d/4.2),4.2);
    if(distance(worker,old)<.001)rt.blocked+=dt;else rt.blocked=0;
    return distance(worker,target)<.48;
  }

  _routeGood(link,from,to,worker){
    if(worker?.bag.length)return worker.bag[0];if(link.good)return link.good;
    const produced=producedGood(this.world,from);if(produced)return produced;
    const state=this.state.nodes[from.id],accepted=acceptsGoods(this.world,to);
    return accepted.filter(g=>(state.stock[g]||0)>Math.max(state.reserves[g]||0,link.minStock||0)).sort((a,b)=>this._routeDemand(link,to,b)-this._routeDemand(link,to,a))[0]||accepted[0];
  }
  _routeDemand(link,to,good,excludeWorker){
    if(!good)return 0;const state=this.state.nodes[to.id],recipe=recipeFor(this.world,to);
    const transit=this.state.workers.reduce((sum,w)=>w.to===to.id&&w.id!==excludeWorker?sum+w.bag.filter(g=>g===good).length:sum,0);
    if(recipe){if(link.mode==='demand'&&state.stock>=2&&!this._neededForOrder(recipe.output))return 0;const inputs=this._inputStock(to,state,recipe);return Math.max(0,Math.max(4,(recipe.inputs[good]||0)*3)-(inputs[good]||0)-transit);}
    if(to.type==='barn')return Math.max(0,to.storageCapacity-Object.values(state.stock).reduce((a,b)=>a+b,0)-transit);
    if(to.type==='market'&&link.mode==='demand'&&this.world.settings.customerOrders)return Math.max(0,this.getOrders().filter(o=>o.marketId===to.id&&(!this.world.settings.pressureEnabled||o.status==='active')).reduce((sum,o)=>sum+(o.items[good]||0),0)+this.state.boardOffers.filter(o=>o.status==='active'&&o.marketId===to.id).reduce((sum,o)=>sum+(o.items[good]||0),0)-(state.stock[good]||0)-transit);
    return 100000;
  }
  _neededForOrder(good,seen=new Set()){
    if(seen.has(good))return false;seen.add(good);
    if(this.getOrders().some(o=>(o.missing[good]||0)>0)||this.state.boardOffers.some(o=>o.status==='active'&&(o.items[good]||0)>0))return true;
    return this.world.nodes.some(n=>{const r=recipeFor(this.world,n);return this.state.nodes[n.id].unlocked&&r&&r.inputs[good]&&this._neededForOrder(r.output,new Set(seen));});
  }
  _routePriority(link){const to=this.definitions.get(link.to),from=this.definitions.get(link.from),good=link.good||producedGood(this.world,from);
    return link.priority+(this.world.settings.helperPolicy==='feed-first'&&['coop','dairy'].includes(to?.type)?10:0)+(this.world.settings.helperPolicy==='orders'&&good&&this._neededForOrder(good)?6:0)
      +(this.state.helperFocus&&this.state.time<this.state.helperFocusUntil&&(!this.state.helperFocus||good===this.state.helperFocus||to?.type==='market'&&this._routeGood(link,from,to)===this.state.helperFocus)?15:0);
  }
  setHelperFocus(good){if(good&&!this.goodKeys.includes(good))return {ok:false,message:'Unknown product.'};this.state.helperFocus=good;this.state.helperFocusUntil=good?this.state.time+90:0;this._emit({type:'toast',text:good?`Farmhands prioritising ${this.goods[good].label} for 90 seconds.`:'Helpers returned to their regular routes.'});return {ok:true};}
  getWorkerJobs(){return this.state.workers.map((worker,i)=>{const from=this.definitions.get(worker.from),to=this.definitions.get(worker.to),helper=this.definitions.get((this.world.links.find(l=>l.id===worker.linkId)?.requires||[]).find(id=>this.definitions.get(id)?.type==='helper'));
    const display=(helper?.name||'Farmhand').replace(/^Hire (the )?/i,'');return {id:worker.id,name:display,from:from?.name||'',to:to?.name||'',status:worker.status||'Getting ready',good:worker.bag[0]||producedGood(this.world,from),carrying:worker.bag.length,blocked:this._runtime.get(worker.id)?.noPath===true};});}

  _higherPriorityWaiting(link,good){
    const priority=this._routePriority(link);
    return this.world.links.some(other=>other.id!==link.id&&other.from===link.from&&this._routePriority(other)>priority&&this.state.workers.some(w=>w.linkId===other.id)&&acceptsGoods(this.world,this.definitions.get(other.to)).includes(good)&&this._routeDemand(other,this.definitions.get(other.to),good)>0);
  }
  _workers(dt){
    const links=new Map(this.world.links.map(l=>[l.id,l]));
    const workers=[...this.state.workers].sort((a,b)=>this._routePriority(links.get(b.linkId))-this._routePriority(links.get(a.linkId)));
    for(const worker of workers){
      const rt=this._runtime.get(worker.id),link=links.get(worker.linkId),from=this.definitions.get(worker.from),to=this.definitions.get(worker.to),source=this.state.nodes[worker.from],target=this.state.nodes[worker.to];
      rt.timer-=dt;worker.job=`${from.name} → ${to.name}`;
      if(!source?.unlocked||!target?.unlocked){worker.moving=false;worker.status='Waiting for an unlock';continue;}
      const good=this._routeGood(link,from,to,worker),demand=this._routeDemand(link,to,good,worker.id);
      if(rt.mode==='deliver'||worker.bag.length>=worker.capacity||worker.bag.length&&worker.bag.length>=demand){
        rt.mode='deliver';worker.status=`Delivering ${this.goods[good]?.label.toLowerCase()||'produce'}`;
        if(this._walkWorker(worker,this.ports.get(to.id).input,dt,rt)&&rt.timer<=0){
          if(worker.bag.length){if(this._deposit(worker,to))rt.timer=.18;else worker.status='Destination full';}
          else{rt.mode='gather';rt.target=null;}
        }
        continue;
      }
      if(demand<=0||this._higherPriorityWaiting(link,good)){worker.moving=false;worker.status=demand<=0?'Destination stocked':'Helping the priority route first';continue;}
      worker.status=`Collecting ${this.goods[good]?.label.toLowerCase()||'produce'}`;
      if(['field','orchard'].includes(from.type)){
        let crop=this.state.crops.find(c=>c.id===rt.target&&c.growth>=.99999&&c.unlocked);
        if(!crop){let best=Infinity;for(const c of this.state.crops)if(c.nodeId===from.id&&c.unlocked&&c.growth>=.99999){const d=distance(worker,c);if(d<best){best=d;crop=c;}}rt.target=crop?.id||null;}
        if(!crop){if(worker.bag.length)rt.mode='deliver';else{worker.moving=false;worker.status='Waiting for crops';}continue;}
        if(distance(worker,crop)<.7&&rt.timer<=0){worker.moving=false;this._takeCrop(crop,worker);rt.timer=.26;rt.target=null;}
        else this._walkWorker(worker,crop,dt,rt);
      }else{
        const recipe=recipeFor(this.world,from),available=from.type==='barn'?(source.stock[good]||0)-Math.max(source.reserves[good]||0,link.minStock):recipe?source.stock-link.minStock:0;
        if(available>0){
          if(this._walkWorker(worker,this.ports.get(from.id).output,dt,rt)&&rt.timer<=0){if(from.type==='barn')source.stock[good]--;else source.stock--;worker.bag.push(good);this.state.stats[good]++;rt.timer=.2;this._emit({type:'harvest',...this.ports.get(from.id).output,good,amount:1});if(available<=1)rt.mode='deliver';}
        }else if(worker.bag.length)rt.mode='deliver';else{worker.moving=false;worker.status=from.type==='barn'?'Keeping the barn reserve':'Waiting for produce';}
      }
      if(rt.noPath)worker.status='No walking route';
    }
  }

  // Orders are drawn only from renewable goods this particular farm can make.
  // Merely placing a locked cow pasture never creates a request for milk.
  _availableGoods(){
    const result=new Set();
    for(const n of this.world.nodes)if(this.state.nodes[n.id].unlocked&&['field','orchard'].includes(n.type))result.add(producedGood(this.world,n));
    for(let pass=0;pass<this.goodKeys.length;pass++)for(const n of this.world.nodes){const r=recipeFor(this.world,n);if(r&&this.state.nodes[n.id].unlocked&&Object.keys(r.inputs).every(g=>result.has(g)))result.add(r.output);}
    return this.goodKeys.filter(g=>result.has(g));
  }

  _orderDuration(items,type='standard',stock={}){
    const settings=this.world.settings;
    let recipeBurden=0,units=0;
    const depth=(g,seen=new Set())=>{if(seen.has(g))return 0;seen.add(g);const recipes=Object.values(this.recipes).filter(r=>r.output===g);
      if(!recipes.length)return 0;const best=recipes.map(r=>Math.max(.8,r.seconds)+Math.max(0,...Object.keys(r.inputs).map(k=>depth(k,new Set(seen))))).sort((a,b)=>a-b)[0];return Math.min(75,best);};
    for(const [g,n]of Object.entries(items)){const shortage=Math.max(0,n-(stock[g]||0));units+=shortage;recipeBurden=Math.max(recipeBurden,depth(g)*Math.min(3,Math.ceil(shortage/2)));}
    const extra=Math.min(160,recipeBurden*1.7+Math.max(0,units-4)*3.2);
    return Math.round((urgencySeconds(settings,type)+extra)*(PRESSURE_MULTIPLIER[settings.pressureDifficulty]||1));
  }
  _rushActive(){return this.world.settings.pressureEnabled&&this.world.settings.rushEvery>0&&this.state.time<this.state.rushUntil;}
  _decorateOrder(order,serial,forced='auto'){
    if(!order)return null;
    const settings=this.world.settings,profile=FARM_CLIENTS[serial%FARM_CLIENTS.length],relation=this.state.customerRelations[profile.id],regular=relation.served>=3;
    let urgency='relaxed';
    if(settings.pressureEnabled&&this.state.ordersCompleted>=settings.pressureGraceOrders){
      urgency=forced!=='auto'?forced:serial%5===4&&this.state.ordersCompleted>=6?'urgent':serial%3===0?'relaxed':'standard';
    }
    if(regular){order.items=Object.fromEntries(Object.entries(order.items).map(([g,n])=>[g,Math.min(50,n+1)]));order.base=Object.entries(order.items).reduce((sum,[g,n])=>sum+(this.goods[g]?.value||0)*n,0);}
    const rep=this.state.reputation;
    const multiplier=rep>=90?1.15:rep>=75?1.08:rep<35?.92:1;
    order.bonus=Math.round((order.bonus+(regular?order.base*.1:0))*multiplier);
    order.reward=Math.round(order.base*multiplier)+order.bonus;
    return {...order,urgency,clientId:profile.id,clientName:profile.name,regular,status:urgency==='urgent'?'offered':'waiting',accepted:urgency!=='urgent',deadline:null,duration:this._orderDuration(order.items,urgency),startedAt:null,offeredAt:null,warned:false,redWarned:false,failed:false};
  }
  _newOrder(){
    const available=this._availableGoods();if(!available.length)return null;
    const serial=this._orderSerial++,rank=this.state.farmLevel;
    const templates=this.world.orderTemplates.filter(o=>Object.keys(o.items).every(g=>available.includes(g)));
    if(templates.length){const template=templates[serial%templates.length],items={...template.items},base=Object.entries(items).reduce((sum,[g,n])=>sum+this.goods[g].value*n,0),bonus=template.bonus;return this._decorateOrder({id:`order-${serial}`,templateId:template.id,name:template.name,items,base,bonus,reward:base+bonus,fulfilled:false},serial,template.urgency||'auto');}
    const growth=Math.min(8,Math.floor(Math.sqrt(Math.max(0,rank-1))/2)+(available.length>=4?1:0)),items={};
    if(available.includes('egg')&&available.includes('milk')&&(this._mixedOrderDue||serial%3===0)){
      items.egg=2+growth;items.milk=3+growth;this._mixedOrderDue=false;
    }else{
      const good=available[serial%available.length];
      items[good]=(good==='wheat'?2+serial%3:good==='flour'?1:2)+growth;
      if(available.length>1&&serial%3===1){const second=available[(serial+1)%available.length];items[second]=(second==='flour'?1:2)+growth;}
      if(available.length>3&&rank>=5&&serial%5===0){const third=available[(serial+2)%available.length];if(!items[third])items[third]=1+growth;}
    }
    const base=Object.entries(items).reduce((sum,[g,n])=>sum+this.goods[g].value*n,0);
    // Each improvement raises future order bonuses; an accepted order keeps its
    // quoted price, even across a save, a new upgrade, or a blueprint edit.
    const bonus=Math.max(1,Math.round(base*(.1+.06*Math.max(0,rank-1))));
    return this._decorateOrder({id:`order-${serial}`,items,base,bonus,reward:base+bonus,fulfilled:false},serial);
  }

  _readOrder(raw,allowUnavailable=false){
    if(!raw||typeof raw!=='object'||!/^order-\d+$/.test(raw.id)||!raw.items||typeof raw.items!=='object'||Array.isArray(raw.items))return null;
    const entries=Object.entries(raw.items),available=this._availableGoods();
    if(!entries.length||entries.length>this.goodKeys.length||entries.some(([g,n])=>!this.goodKeys.includes(g)||!Number.isInteger(n)||n<1||n>50||!allowUnavailable&&!available.includes(g)))return null;
    const items=Object.fromEntries(entries),base=whole(raw.base,entries.reduce((sum,[g,n])=>sum+this.goods[g].value*n,0),0,LIMIT);
    const bonus=whole(raw.bonus,Math.max(0,whole(raw.reward,base)-base),0,LIMIT-base);
    this._orderSerial=Math.max(this._orderSerial,whole(Number(raw.id.slice(6)))+1);
    const profile=FARM_CLIENTS.find(p=>p.id===raw.clientId)||FARM_CLIENTS[whole(Number(raw.id.slice(6)))%FARM_CLIENTS.length];
    const urgency=['relaxed','standard','urgent'].includes(raw.urgency)?raw.urgency:'relaxed',duration=urgencySeconds(this.world.settings,urgency);
    // Pre-M007 orders stay as-is and receive a full new timer only on reaching the front.
    return {id:raw.id,...(typeof raw.name==='string'?{name:raw.name.slice(0,50)}:{}),...(typeof raw.templateId==='string'?{templateId:raw.templateId}:{}),items,base,bonus,reward:whole(raw.reward,base+bonus,0,LIMIT),fulfilled:raw.fulfilled===true,failed:raw.failed===true,
      urgency,clientId:profile.id,clientName:profile.name,regular:raw.regular===true,
      status:['offered','waiting','active'].includes(raw.status)?raw.status:'waiting',accepted:raw.accepted===true||urgency!=='urgent',
      startedAt:Number.isFinite(raw.startedAt)?bounded(raw.startedAt):null,deadline:Number.isFinite(raw.deadline)?bounded(raw.deadline):null,duration:bounded(raw.urgency?raw.duration:undefined,this._orderDuration(items,urgency),1,2000),
      offeredAt:Number.isFinite(raw.offeredAt)?bounded(raw.offeredAt):null,warned:raw.warned===true,redWarned:raw.redWarned===true};
  }

  _restoreCustomers(saved){
    const seen=new Set(),orderIds=new Set(),queued=new Map();
    if(Array.isArray(saved.customers))for(const old of saved.customers.slice(0,120)){
      const n=this.definitions.get(old?.nodeId);
      if(!n||n.type!=='market'||!this.state.nodes[n.id].unlocked||!/^customer-\d+$/.test(old.id)||seen.has(old.id)||!['queue','leaving'].includes(old.phase))continue;
      let phase=old.phase,order=this.world.settings.customerOrders?this._readOrder(old.order,phase==='leaving'||old.order?.fulfilled===true):null;
      // A paid order can never return to the sales queue after loading.
      if(order?.fulfilled||order?.failed)phase='leaving';
      if(phase==='queue'&&(queued.get(n.id)||0)>=3)continue;
      if(order&&orderIds.has(order.id))continue;
      if(phase==='queue'&&this.world.settings.customerOrders&&!order)order=this._newOrder();
      if(phase==='leaving'&&order&&!order.failed)order.fulfilled=true;
      if(order)orderIds.add(order.id);seen.add(old.id);
      const index=queued.get(n.id)||0,p=rotatePoint(n,n.width/2+2.5,n.depth/2+index*1.25);
      this.state.customers.push({id:old.id,nodeId:n.id,x:bounded(old.x,p.x,-this.world.width,this.world.width),z:bounded(old.z,p.z,-this.world.depth,this.world.depth),angle:bounded(old.angle,Math.PI/2,-Math.PI*2,Math.PI*2),moving:false,phase,good:this.goodKeys.includes(old.good)?old.good:null,bag:bag(old.bag,2000,this.goodKeys),color:whole(old.color,0,0,5),order});
      this._serial=Math.max(this._serial,whole(Number(old.id.slice(9)))+1);
      if(phase==='queue')queued.set(n.id,index+1);
    }
    for(const n of this.world.nodes)if(n.type==='market'){
      this._saleTimers.set(n.id,bounded(saved.saleTimers?.[n.id],.8,-.8,.8));
      if(this.state.nodes[n.id].unlocked)for(let i=queued.get(n.id)||0;i<3&&this.state.customers.length<120;i++)this.state.customers.push(this._newCustomer(n,i));
    }
  }

  getOrders(){
    if(!this.world.settings.customerOrders)return [];
    return this.state.customers.filter(c=>c.phase==='queue'&&c.order&&!c.order.fulfilled).map(c=>{
      const stock={...this.state.nodes[c.nodeId].stock},items={...c.order.items};
      const missing=Object.fromEntries(Object.entries(items).map(([g,n])=>[g,Math.max(0,n-stock[g])]));
      const o=c.order,active=o.status==='active'&&Number.isFinite(o.deadline),duration=o.duration||urgencySeconds(this.world.settings,o.urgency),left=active?Math.max(0,o.deadline-this.state.time):null;
      const bonus=this._rushActive()?Math.round(o.reward*.15):0;
      return {id:o.id,customerId:c.id,marketId:c.nodeId,marketName:this.definitions.get(c.nodeId).name,items,name:o.name||'Farm order',reward:o.reward+bonus,bonus:o.bonus+bonus,stock,missing,ready:Object.values(missing).every(n=>n===0),
        clientName:o.clientName||'Farm customer',urgency:o.urgency,regular:o.regular,status:o.status,offered:o.status==='offered',active,secondsLeft:left,patience:left==null?1:Math.max(0,Math.min(1,left/duration)),lateFine:Math.round(o.reward*this.world.settings.lateFinePercent/100),reputation:this.state.reputation,rush:this._rushActive(),offerSeconds:o.status==='offered'?Math.max(0,25-(this.state.time-(o.offeredAt??this.state.time))):null};
    });
  }

  _newCustomer(node,index=0){
    const p=rotatePoint(node,node.width/2+2.5,node.depth/2+index*1.25);
    return {id:`customer-${this._serial++}`,nodeId:node.id,...p,angle:Math.PI/2,moving:false,phase:'queue',good:null,bag:[],color:this._serial%6,order:this.world.settings.customerOrders?this._newOrder():null};
  }

  _fulfillOrder(customer,node){
    const order=customer.order,s=this.state.nodes[node.id];
    if(!order||order.fulfilled||!Object.entries(order.items).every(([g,n])=>s.stock[g]>=n))return false;
    // Debit every exact quantity and mark the order paid as one operation.
    // Partial stock waits at the market and never earns a partial payout.
    order.fulfilled=true;customer.phase='leaving';customer.good=Object.keys(order.items)[0];customer.bag=[];
    for(const [good,quantity]of Object.entries(order.items)){
      s.stock[good]-=quantity;s.sold+=quantity;this.state.sold+=quantity;this.state.soldGoods[good]+=quantity;
      customer.bag.push(...Array(quantity).fill(good));
    }
    const rushBonus=this._rushActive()?Math.round(order.reward*.15):0;
    this._bankSale(order.reward+rushBonus);
    this.state.ordersCompleted++;this.state.orderBonuses+=order.bonus+rushBonus;
    const relation=this.state.customerRelations[order.clientId];if(relation)relation.served++;
    if(this.world.settings.pressureEnabled)this.state.reputation=Math.min(100,this.state.reputation+(order.urgency==='urgent'?3:1));
    this._maybeRush();
    if(order.items.egg&&order.items.milk)this.state.mixedOrdersCompleted++;
    this._emit({type:'sell',...this.ports.get(node.id).input,good:customer.good,amount:order.reward+rushBonus,orderId:order.id,items:{...order.items}});
    return true;
  }


  _makeBoardOffer(rush=false){
    if(!this.world.settings.customerOrders||!this.world.settings.boardEnabled)return null;
    const market=this.world.nodes.find(n=>n.type==='market'&&this.state.nodes[n.id]?.unlocked),goods=this._availableGoods();if(!market||!goods.length)return null;
    const serial=this.state.boardSerial++,good=goods[serial%goods.length],second=goods.length>2&&serial%3===0?goods[(serial+2)%goods.length]:null;
    const items={[good]:Math.max(1,Math.min(6,2+serial%3))};if(second&&second!==good)items[second]=1+serial%2;
    const base=Object.entries(items).reduce((s,[g,n])=>s+(this.goods[g]?.value||0)*n,0);
    const relation=this.state.customerRelations[FARM_CLIENTS[serial%FARM_CLIENTS.length].id];
    const minReputation=serial%7===5?75:serial%11===8?88:0;
    const bonus=Math.round(base*(rush?.45:.28)+18+(relation?.served>=3?10:0));
    const offer={id:`board-${serial}`,name:BOARD_NAMES[serial%BOARD_NAMES.length],clientId:FARM_CLIENTS[serial%FARM_CLIENTS.length].id,
      marketId:market.id,items,reward:base+bonus,bonus,minReputation,status:'offered',rush,createdAt:this.state.time,expiresAt:this.state.time+(rush?90:240),
      duration:this._orderDuration(items,rush?'urgent':'standard',this.state.nodes[market.id].stock)+45,startedAt:null,deadline:null,fine:Math.round((base+bonus)*this.world.settings.lateFinePercent/100)};
    this.state.boardOffers.push(offer);this.state.boardOffers=this.state.boardOffers.slice(-18);return offer;
  }
  _seedBoard(){if(!this.world.settings.pressureEnabled||!this.world.settings.boardEnabled)return;
    if(!this.state.boardOffers.some(o=>o.status==='offered'||o.status==='active')){this._makeBoardOffer();this._makeBoardOffer();}
  }
  // A conservative, approximate planning aid, not a promise of delivery time.
  // Only inspect buildings already opened by this player; never advertise
  // locked production as something ready to ship.
  estimateDelivery(items,marketId,windowSeconds=180){
    const market=this.definitions.get(marketId),stored=this.state.nodes[marketId]?.stock||{};
    const portions=Object.entries(items).filter(([good,n])=>this.goodKeys.includes(good)&&n>0);
    if(!market||!portions.length)return {grade:'Unknown',label:'No usable delivery route',seconds:0};
    let seconds=12,hardest=null,blocked=false,available=0;
    for(const [good,quantity]of portions){
      let missing=Math.max(0,quantity-(stored[good]||0));if(!missing)continue;
      const producers=this.world.nodes.filter(n=>this.state.nodes[n.id]?.unlocked&&producedGood(this.world,n)===good);
      const barns=this.world.nodes.filter(n=>n.type==='barn'&&this.state.nodes[n.id]?.unlocked&&(this.state.nodes[n.id].stock?.[good]||0)>(this.state.nodes[n.id].reserves?.[good]||0));
      if(!producers.length&&!barns.length){blocked=true;hardest=good;continue;}
      let best=Infinity;
      for(const n of [...producers,...barns]){
        const state=this.state.nodes[n.id],ready=n.type==='barn'?Math.max(0,(state.stock[good]||0)-(state.reserves[good]||0)):
          ['field','orchard'].includes(n.type)?this.state.crops.filter(c=>c.nodeId===n.id&&c.growth>=.99).length:Number(state.stock)||0;
        const recipe=recipeFor(this.world,n),production=ready>=missing?0:recipe?Math.ceil((missing-ready)/Math.max(1,recipe.yield))*recipe.seconds:Math.max(0,missing-ready)*this.world.settings.growthSeconds/3;
        const travel=2*Math.hypot(n.x-market.x,n.z-market.z)/Math.max(2,this.state.player.speed);
        best=Math.min(best,travel+production+missing*2.4);
      }
      if(!Number.isFinite(best)){blocked=true;hardest=good;continue;}
      available++;seconds+=best;
      if(!hardest||best>seconds*.55)hardest=good;
    }
    const estimate=Math.max(10,Math.ceil(seconds)),ratio=estimate/Math.max(1,windowSeconds);
    const grade=blocked?'Unavailable':ratio>.92?'Very tight':ratio>.65?'Needs planning':'Achievable';
    const label=blocked?`Not ready: ${this.goods[hardest]?.label||hardest} production is unavailable`:
      `Roughly ${Math.ceil(estimate/10)*10}s of farm work · ${grade.toLowerCase()}`;
    return {grade,label,seconds:estimate,missingGoods:available,blocked};
  }

  getNoticeboard(){
    return this.state.boardOffers.filter(o=>['offered','active'].includes(o.status)).map(o=>{
      const market=this.state.nodes[o.marketId],stock=market?.stock||{},missing=Object.fromEntries(Object.entries(o.items).map(([g,n])=>[g,Math.max(0,n-(stock[g]||0))]));
      const left=Math.max(0,(o.status==='active'?o.deadline:o.expiresAt)-this.state.time);
      return {...o,items:{...o.items},missing,stock:{...stock},ready:Object.values(missing).every(v=>v===0),secondsLeft:left,eligible:this.state.reputation>=o.minReputation,advice:this.estimateDelivery(o.items,o.marketId,o.duration),patience:o.status==='active'?Math.min(1,left/o.duration):1};
    });
  }
  respondToBoard(id,accept){const o=this.state.boardOffers.find(o=>o.id===id&&o.status==='offered');
    if(!o)return {ok:false,message:'That contract is no longer available.'};
    if(!accept){o.status='declined';return {ok:true,message:'Contract passed with no penalty.'};}
    if(this.state.reputation<o.minReputation)return {ok:false,message:`Reach ${o.minReputation} reputation to unlock this customer.`};
    if(this.state.boardOffers.filter(x=>x.status==='active').length>=2)return {ok:false,message:'Finish an active contract before taking another.'};
    o.status='active';o.startedAt=this.state.time;o.deadline=this.state.time+o.duration;this._emit({type:'contract',text:`Contract accepted: ${o.name} · ${Math.ceil(o.duration)} seconds.`});return {ok:true,message:'Contract accepted. Take goods to the market.'};
  }
  _tickBoard(){
    if(!this.world.settings.pressureEnabled||!this.world.settings.boardEnabled)return;
    const s=this.state;
    for(const o of s.boardOffers){
      if(o.status==='offered'&&s.time>=o.expiresAt)o.status='expired';
      if(o.status!=='active')continue;
      const store=s.nodes[o.marketId];if(store?.unlocked&&Object.entries(o.items).every(([g,n])=>(store.stock[g]||0)>=n)){
        for(const [g,n]of Object.entries(o.items)){store.stock[g]-=n;store.sold+=n;s.sold+=n;s.soldGoods[g]+=n;}
        o.status='done';s.boardServed++;this._bankSale(o.reward);s.orderBonuses+=o.bonus;s.reputation=Math.min(100,s.reputation+2);
        const relation=s.customerRelations[o.clientId];if(relation)relation.served++;
        this._emit({type:'sell',...this.ports.get(o.marketId).input,good:Object.keys(o.items)[0],amount:o.reward,items:{...o.items},text:`${o.name} delivered · +${o.reward} coins`});continue;
      }
      if(s.time>=o.deadline){o.status='failed';const fine=Math.min(s.coins,o.fine);s.coins-=fine;s.lateFines+=fine;s.ordersFailed++;s.reputation=Math.max(0,s.reputation-4);const relation=s.customerRelations[o.clientId];if(relation)relation.missed++;this._emit({type:'late',text:`${o.name} missed · ${fine} coin fine.`});}
    }
    if(s.boardOffers.filter(o=>o.status==='offered').length<2&&s.time>=s.boardNextAt){this._makeBoardOffer();s.boardNextAt=s.time+45;}
  }

  _maybeRush(){
    const s=this.state,config=this.world.settings;
    if(!config.pressureEnabled||!config.rushEvery||this._rushActive()||s.ordersCompleted<s.nextRushAt)return;
    s.rushUntil=s.time+90;s.rushCount++;s.nextRushAt=s.ordersCompleted+config.rushEvery;
    this._emit({type:'rush',text:'⚡ Rush hour! Two new noticeboard offers, with a bonus for 90 seconds.'});this._makeBoardOffer(true);this._makeBoardOffer(true);
  }
  respondToUrgent(orderId,accept){
    if(!this.world.settings.pressureEnabled)return {ok:false,message:'Customer pressure is disabled.'};
    const c=this.state.customers.find(c=>c.phase==='queue'&&c.order?.id===orderId),o=c?.order;
    if(!c||!o||o.urgency!=='urgent'||o.status!=='offered')return {ok:false,message:'That offer is no longer waiting.'};
    if(this.state.customers.filter(v=>v.nodeId===c.nodeId&&v.phase==='queue')[0]!==c)return {ok:false,message:'That customer is not at the front yet.'};
    if(!accept){o.failed=true;c.phase='leaving';this._emit({type:'toast',text:`${o.clientName} passed on this order. No penalty.`});return {ok:true,message:'Contract declined. No penalty.'};}
    o.accepted=true;o.status='active';o.startedAt=this.state.time;o.deadline=this.state.time+(o.duration||this.world.settings.urgentSeconds);
    this._emit({type:'toast',text:`Urgent contract accepted · ${this.world.settings.urgentSeconds}s to deliver!`});
    return {ok:true,message:'Urgent contract accepted.'};
  }
  _failOrder(customer,node){
    const o=customer.order;if(!o||o.fulfilled||o.failed)return;
    const fine=Math.min(this.state.coins,Math.round(o.reward*this.world.settings.lateFinePercent/100));
    this.state.coins-=fine;this.state.lateFines+=fine;this.state.ordersFailed++;
    this.state.reputation=Math.max(0,this.state.reputation-(o.urgency==='urgent'?5:3));
    const relation=this.state.customerRelations[o.clientId];if(relation)relation.missed++;
    o.failed=true;customer.phase='leaving';customer.mood='angry';
    this._emit({type:'late',text:`${o.clientName} left unhappy · -${fine} coins · reputation ${this.state.reputation}/100`});
  }
  _customers(dt){
    for(const n of this.world.nodes){if(n.type!=='market'||!this.state.nodes[n.id].unlocked)continue;
      const s=this.state.nodes[n.id],queue=this.state.customers.filter(c=>c.nodeId===n.id&&c.phase==='queue');
      queue.forEach((c,i)=>{const p=rotatePoint(n,n.width/2+2.5,n.depth/2+i*1.25);this._moveCustomer(c,p,dt,3.2);});
      this._saleTimers.set(n.id,Math.max(-.8,(this._saleTimers.get(n.id)||0)-dt));
      if(this.world.settings.customerOrders){
        for(const customer of queue)if(!customer.order)customer.order=this._newOrder();
        const first=queue[0],front=rotatePoint(n,n.width/2+2.5,n.depth/2);
        if(first?.order&&distance(first,front)<.3){
          const o=first.order,config=this.world.settings;
          if(config.pressureEnabled){
            if(o.urgency==='urgent'&&!o.accepted){
              o.status='offered';if(o.offeredAt===null)o.offeredAt=this.state.time;
              if(this.state.time-o.offeredAt>25)this.respondToUrgent(o.id,false);
            }else{
              if(o.status!=='active'||o.deadline===null){o.status='active';o.startedAt=this.state.time;o.deadline=this.state.time+(o.duration||urgencySeconds(config,o.urgency));}
              const left=o.deadline-this.state.time,full=o.duration||urgencySeconds(config,o.urgency);
              if(left<full*.5&&!o.warned){o.warned=true;this._emit({type:'toast',text:`${o.clientName} is waiting · ${Math.ceil(left)} seconds left.`});}
              if(left<full*.22&&!o.redWarned){o.redWarned=true;this._emit({type:'toast',text:`Last call from ${o.clientName}!`});}
              first.mood=left<full*.22?'angry':left<full*.5?'impatient':'happy';
            }
          }
          if(first.phase==='queue'&&(config.pressureEnabled?o.status==='active':true)&&this._saleTimers.get(n.id)<=0&&this._fulfillOrder(first,n))this._saleTimers.set(n.id,.8);
          else if(first.phase==='queue'&&config.pressureEnabled&&o.status==='active'&&this.state.time>=o.deadline)this._failOrder(first,n);
        }
      }else{
        const good=[...this.goodKeys].sort((a,b)=>this.goods[b].value-this.goods[a].value).find(g=>s.stock[g]>0);
        if(good&&queue.length&&this._saleTimers.get(n.id)<=0){s.stock[good]--;s.sold++;this.state.sold++;this.state.soldGoods[good]++;this._bankSale(this.goods[good].value);queue[0].phase='leaving';queue[0].good=good;queue[0].bag=[good];this._saleTimers.set(n.id,.8);this._emit({type:'sell',...this.ports.get(n.id).input,good,amount:this.goods[good].value});}
      }
      const pending=this.state.customers.filter(c=>c.nodeId===n.id&&c.phase==='queue').length;
      if(pending<3&&this.state.customers.length<120)this.state.customers.push(this._newCustomer(n,pending+1));
    }
    for(const c of this.state.customers)if(c.phase==='leaving'){const n=this.definitions.get(c.nodeId),p=rotatePoint(n,n.width/2+8,n.depth/2+7);this._moveCustomer(c,p,dt,3.6);if(distance(c,p)<.3)c.phase='gone';}
    this.state.customers=this.state.customers.filter(c=>c.phase!=='gone');
  }
  _moveCustomer(c,p,dt,speed){const d=distance(c,p);c.moving=d>.05;if(c.moving){const amount=Math.min(d,dt*speed),dx=(p.x-c.x)/d,dz=(p.z-c.z)/d;c.x+=dx*amount;c.z+=dz*amount;c.angle=Math.atan2(dx,dz);}}
  _pads(dt){
    const s=this.state,p=s.player,occupied=this.getPads().find(pad=>Math.abs(p.x-pad.x)<PAD_INSIDE&&Math.abs(p.z-pad.z)<PAD_INSIDE);
    const moved=p.moving||this._movementIntent||this._padPosition&&distance(p,this._padPosition)>.002;
    this._padPosition={x:p.x,z:p.z};
    if(!occupied){s.activePad=null;s.padProgress=0;s.padHoldProgress=0;s.padPhase=null;this._padHold=0;this._padLatch=null;this._padReloadLatch=false;return;}
    if(s.activePad!==occupied.id){s.padProgress=0;s.padHoldProgress=0;this._padHold=0;this._padLatch=null;this._padReloadLatch=false;}
    s.activePad=occupied.id;
    if(this._padLatch===occupied.id){s.padProgress=0;s.padHoldProgress=0;s.padPhase=this._padReloadLatch?'reenter':'complete';this._padHold=0;return;}
    if(!occupied.available||s.coins<occupied.price){s.padProgress=0;s.padHoldProgress=0;s.padPhase='blocked';this._padHold=0;return;}
    if(moved){s.padProgress=0;s.padHoldProgress=0;s.padPhase='settle';this._padHold=0;return;}
    const fillTime=Math.min(dt,Math.max(0,this._padHold+dt-PAD_SETTLE));
    this._padHold=Math.min(PAD_SETTLE,this._padHold+dt);s.padHoldProgress=this._padHold/PAD_SETTLE;
    s.padPhase=this._padHold+1e-8<PAD_SETTLE?'settle':'buy';s.padProgress=Math.min(1,s.padProgress+fillTime/PAD_FILL);
    if(s.padProgress>=.999999)this.buy(occupied.id);
  }

  _goodTarget(good,marketId,seen=new Set()){
    if(seen.has(good))return null;seen.add(good);
    const market=this.definitions.get(marketId)||this.world.nodes.find(n=>n.type==='market'&&this.state.nodes[n.id].unlocked);
    if(this.state.player.bag.includes(good)&&market)return this.ports.get(market.id).input;
    const stored=this.world.nodes.find(n=>n.type==='barn'&&this.state.nodes[n.id].unlocked&&this.state.nodes[n.id].stock[good]>0);
    if(stored)return this.ports.get(stored.id).output;
    const source=this.world.nodes.find(n=>producedGood(this.world,n)===good&&this.state.nodes[n.id].unlocked);
    if(!source)return market?this.ports.get(market.id).input:null;
    const recipe=recipeFor(this.world,source),s=this.state.nodes[source.id];
    if(!recipe)return this.state.crops.find(c=>c.nodeId===source.id&&c.growth>=.99)||this.ports.get(source.id).output;
    const inputs=this._inputStock(source,s,recipe);
    if(s.stock||s.working||Object.entries(recipe.inputs).every(([g,n])=>inputs[g]>=n))return this.ports.get(source.id).output;
    const missing=Object.keys(recipe.inputs).filter(g=>inputs[g]<recipe.inputs[g]);
    if(missing.some(g=>this.state.player.bag.includes(g)))return this.ports.get(source.id).input;
    return this._goodTarget(missing[0],marketId,seen);
  }

  _orderTarget(){
    const order=this.getOrders()[0];if(!order)return null;
    const missing=Object.keys(order.items).filter(g=>order.missing[g]>0);
    if(!missing.length)return this.ports.get(order.marketId).input;
    if(missing.some(g=>this.state.player.bag.includes(g)))return this.ports.get(order.marketId).input;
    return this._goodTarget(missing[0],order.marketId);
  }

  getMilestones(){return this.world.milestones.map(m=>{const value=m.kind==='orders'?this.state.ordersCompleted:m.kind==='earned'?this.state.earned:m.kind==='rank'?this.state.farmLevel:m.kind==='sold'?this.state.soldGoods[m.good]||0:this._requirementsMet([m.nodeId])?1:0;return {...m,value,progress:Math.min(1,value/m.target),complete:value>=m.target,claimed:this.state.claimedMilestones.includes(m.id)};});}
  _checkMilestones(){for(const goal of this.getMilestones())if(goal.complete&&!goal.claimed){this.state.claimedMilestones.push(goal.id);if(goal.reward){this._bankSale(goal.reward);this.state.milestoneRewards+=goal.reward;}this._emit({type:'purchase',...this.state.player,amount:goal.reward,text:goal.reward?`${goal.title} · +${goal.reward} coins`:`${goal.title} complete!`});}}
  getNodeStatuses(){
    return this.world.nodes.filter(n=>['field','orchard','coop','dairy','mill','workshop','market','barn'].includes(n.type)).map(n=>{
      const s=this.state.nodes[n.id],r=recipeFor(this.world,n),good=producedGood(this.world,n),workers=this.state.workers.filter(w=>w.to===n.id||w.from===n.id);let status='idle',label='Ready',amount=0,progress=s.progress||0;
      if(!s.unlocked){status='locked';label='Unlock to open';}
      else if(n.type==='barn'){amount=Object.values(s.stock).reduce((a,b)=>a+b,0);status=amount>=n.storageCapacity?'full':amount?'ready':'idle';label=amount>=n.storageCapacity?'Barn full':`${amount} / ${n.storageCapacity} stored`;}
      else if(n.type==='market'){amount=Object.values(s.stock).reduce((a,b)=>a+b,0);const order=this.getOrders().find(o=>o.marketId===n.id);status=order?.ready?'ready':order?'needs-feed':amount?'ready':'idle';label=order?.ready?'Order ready':order?'Waiting for order goods':'Ready to trade';}
      else if(r){const inputs=this._inputStock(n,s,r),missing=Object.keys(r.inputs).filter(g=>inputs[g]<r.inputs[g]);amount=s.stock;status=s.stock>32-r.yield?'full':s.working?'working':s.stock?'ready':missing.length?'needs-feed':'idle';label=status==='full'?'Output full':status==='working'?`Making ${this.goods[r.output].label.toLowerCase()}`:status==='ready'?`${s.stock} ready`:missing.length?`Needs ${missing.map(g=>this.goods[g].label.toLowerCase()).join(' + ')}`:'Ready';}
      else{const crops=this.state.crops.filter(c=>c.nodeId===n.id);amount=crops.filter(c=>c.growth>=.99999).length;progress=crops.length?crops.reduce((sum,c)=>sum+c.growth,0)/crops.length:0;status=amount?'ready':'working';label=amount?`${amount} ready to harvest`:'Growing';}
      if(s.unlocked&&workers.some(w=>this._runtime.get(w.id)?.noPath)){status='blocked';label='Helper route blocked';}
      return {id:n.id,name:n.name,status,label,good,amount,progress,perMinute:this.state.time?Math.round((s.produced||s.received||0)*60/this.state.time*10)/10:0};
    });
  }

  _updateObjective(){
    const customGoal=this.getMilestones().find(m=>!m.complete);
    if(customGoal&&this.world.settings.campaign!=='growing-farm'){this.state.objective={title:customGoal.title,detail:`${customGoal.value} / ${customGoal.target}${customGoal.reward?` · ${customGoal.reward} coin reward`:''}`,progress:customGoal.progress,target:customGoal.kind==='unlock'?this.getPads().find(p=>p.nodeId===customGoal.nodeId||p.parcelId===customGoal.nodeId):this._orderTarget()};return;}
    if(!this.world.settings.customerOrders){this.state.objective={title:'Your farm, your rhythm',detail:'Harvest, deliver and grow your own farm.',progress:0,target:null};return;}
    const s=this.state,field=this.world.nodes.find(n=>n.type==='field'&&s.nodes[n.id].unlocked),pads=new Map(this.getPads().map(p=>[p.id,p])),orderTarget=this._orderTarget();
    const stages=[],add=(title,detail,value,goal,target)=>stages.push({title,detail,progress:Math.min(1,value/goal),target,value,goal});
    const buyStage=(node,title)=>{if(!node)return;const pad=pads.get(node.id);if(!pad||pad.blocked)return;add(title,`${pad.price} coins · stand still inside its golden square to build.`,s.nodes[node.id].level,1,this.ports.get(node.id).pad);};
    if(field)add('Gather your first hay','Walk through the hay patch. Your shoulder stack fills as you harvest.',s.stats.wheat,6,this._goodTarget('wheat'));
    add('Fill your first customer order','Bring the exact goods on the order card to the market. The full payment goes straight into your bank.',s.ordersCompleted,1,orderTarget);
    const coop=this.world.nodes.find(n=>n.type==='coop'),dairy=this.world.nodes.find(n=>n.type==='dairy'),helpers=this.world.nodes.filter(n=>n.type==='helper');
    buyStage(coop,'Give the hens a home');
    if(coop)add('Fresh eggs for your customers','Feed hay at the coop, collect eggs, and complete orders containing 4 eggs in total.',s.soldGoods.egg,4,orderTarget);
    buyStage(dairy,'Welcome your first cows');
    if(dairy)add('Milk from your own cows','Feed hay at the cow pasture. Collect milk and sell 3 through customer orders.',s.soldGoods.milk,3,orderTarget);
    if(coop&&dairy)add('Complete an eggs-and-milk order','Stock every item on a mixed order; the full reward is paid together.',s.mixedOrdersCompleted,1,orderTarget);
    buyStage(helpers[0],'An extra pair of hands');
    buyStage(this.world.nodes.find(n=>n.type==='orchard'),'Plant your apple orchard');
    buyStage(this.world.nodes.find(n=>n.type==='mill'),'Make flour on the farm');
    buyStage(this.world.nodes.find(n=>n.type==='field'&&n.cost>0),'Grow another hay field');
    for(const helper of helpers.slice(1))buyStage(helper,'Give your animals a helping hand');
    const improvement=this.world.nodes.find(n=>n.type==='farmupgrade');buyStage(improvement,'Improve your market');
    const next=stages.find(stage=>stage.progress<1);
    if(next){const {value,goal,...objective}=next;s.objective=objective;return;}
    const expansion=this.getPads().find(p=>p.parcelId&&p.available);if(expansion){s.objective={title:`Open ${expansion.label}`,detail:`${expansion.price} coins · buy new land at its gold square.`,progress:Math.min(1,s.coins/Math.max(1,expansion.price)),target:{x:expansion.x,z:expansion.z}};return;}
    const workshop=this.world.nodes.find(n=>n.type==='workshop'&&!s.nodes[n.id].unlocked&&pads.get(n.id)?.available);if(workshop){const pad=pads.get(workshop.id);s.objective={title:`Open ${workshop.name}`,detail:pad.description,progress:Math.min(1,s.coins/Math.max(1,pad.price)),target:{x:pad.x,z:pad.z}};return;}
    if(customGoal){s.objective={title:customGoal.title,detail:`${customGoal.value} / ${customGoal.target} · ${customGoal.reward} coin reward`,progress:customGoal.progress,target:orderTarget};return;}
    if(improvement){const pad=pads.get(improvement.id);s.objective={title:`Grow to farm rank ${s.farmLevel+1}`,detail:`Keep filling orders. Invest ${pad.price} coins in your market for better future order bonuses.`,progress:Math.min(1,s.coins/Math.max(1,pad.price)),target:this.ports.get(improvement.id).pad};}
    else s.objective={title:'Another happy customer',detail:`${s.ordersCompleted} orders filled. Keep growing, feeding and delivering.`,progress:0,target:orderTarget};
  }
}
