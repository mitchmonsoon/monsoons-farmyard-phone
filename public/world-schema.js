// Farmyard Workshop: portable, validated world definitions. No DOM or storage.
export const WORLD_FORMAT = 'monsoons-farmyard-world';
export const CATALOG = Object.freeze(Object.assign(Object.create(null), {
  field:   { id:'field', label:'Hay field', category:'Growing', width:8, depth:6, cost:0, color:'#e8b94f', icon:'wheat', good:'wheat', accepts:[], solid:false },
  orchard: { id:'orchard', label:'Apple orchard', category:'Growing', width:7, depth:6, cost:160, color:'#db6650', icon:'orchard', good:'apple', accepts:[], solid:false },
  coop:    { id:'coop', label:'Chicken coop', category:'Making', width:4.5, depth:3.5, cost:90, color:'#e7b96f', icon:'coop', good:'egg', accepts:['wheat'], solid:true },
  dairy:   { id:'dairy', label:'Cow pasture', category:'Making', width:6, depth:5, cost:180, color:'#89b6b2', icon:'dairy', good:'milk', accepts:['wheat'], solid:true },
  mill:    { id:'mill', label:'Flour mill', category:'Making', width:4.5, depth:3.5, cost:180, color:'#72a88d', icon:'mill', good:'flour', accepts:['wheat'], solid:true },
  workshop:{ id:'workshop', label:'Farm workshop', category:'Making', width:5, depth:4, cost:240, color:'#e6b26d', icon:'workshop', good:null, accepts:[], solid:true },
  market:  { id:'market', label:'Market stall', category:'Trading', width:6, depth:2.8, cost:0, color:'#d87050', icon:'sell', good:null, accepts:['wheat','egg','milk','flour','apple'], solid:true },
  basket:  { id:'basket', label:'Bigger basket', category:'Upgrades', width:2.4, depth:2.4, cost:50, color:'#ffc434', icon:'basket', good:null, accepts:[], solid:false },
  boots:   { id:'boots', label:'Faster boots', category:'Upgrades', width:2.4, depth:2.4, cost:65, color:'#ffc434', icon:'boots', good:null, accepts:[], solid:false },
  helper:  { id:'helper', label:'Hire helpers', category:'Helpers', width:2.4, depth:2.4, cost:140, color:'#83ad7e', icon:'helper', good:null, accepts:[], solid:false },
  farmupgrade: { id:'farmupgrade', label:'Market improvement', category:'Upgrades', width:2.4, depth:2.4, cost:200, color:'#edbd54', icon:'farmupgrade', good:null, accepts:[], solid:false },
  path:    { id:'path', label:'Path', category:'Scenery', width:4, depth:4, cost:0, color:'#e8cb91', icon:'path', good:null, accepts:[], solid:false },
  barn:    { id:'barn', label:'Storage barn', category:'Trading', width:6, depth:4, cost:0, color:'#bc6748', icon:'storage', good:null, accepts:['wheat','egg','milk','flour','apple','grain','cheese','butter','bread','juice'], solid:true },
  tree:    { id:'tree', label:'Tree', category:'Scenery', width:2, depth:2, cost:0, color:'#68a354', icon:'orchard', good:null, accepts:[], solid:true },
  fence:   { id:'fence', label:'Fence', category:'Scenery', width:4, depth:.35, cost:0, color:'#efdfb4', icon:'fence', good:null, accepts:[], solid:true },
  pond:    { id:'pond', label:'Pond', category:'Scenery', width:6, depth:5, cost:0, color:'#77bcc2', icon:'pond', good:null, accepts:[], solid:true }
}));

let sequence = 0;
const nextId = prefix => `${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}`;
const number = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const name = (value, fallback, length=70) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g,'').trim().slice(0,length) || fallback : fallback;
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value) && !['__proto__','prototype','constructor'].includes(value);
export const GOODS = Object.freeze({wheat:{label:'Hay',value:3,color:'#e9ba4b'},egg:{label:'Eggs',value:7,color:'#fff3d3'},milk:{label:'Milk',value:10,color:'#d9eeeb'},flour:{label:'Flour',value:16,color:'#e8dcc4'},apple:{label:'Apples',value:6,color:'#df6250'},grain:{label:'Grain',value:5,color:'#cf9c43'},cheese:{label:'Cheese',value:28,color:'#f2c94d'},butter:{label:'Butter',value:25,color:'#ffe49a'},bread:{label:'Farm bread',value:48,color:'#bd7e3c'},juice:{label:'Apple juice',value:20,color:'#dfa04c'}});
export const DEFAULT_RECIPES = Object.freeze([
  {id:'coop',name:'Fresh eggs',inputs:{wheat:1},output:'egg',yield:2,seconds:3.5},
  {id:'dairy',name:'Fresh milk',inputs:{wheat:1},output:'milk',yield:2,seconds:4.5},
  {id:'mill',name:'Original flour',inputs:{wheat:2},output:'flour',yield:1,seconds:4.5},
  {id:'grain-mill',name:'Grain flour',inputs:{grain:2},output:'flour',yield:2,seconds:4.5},
  {id:'cheese',name:'Farm cheese',inputs:{milk:2},output:'cheese',yield:1,seconds:5},
  {id:'butter',name:'Fresh butter',inputs:{milk:2},output:'butter',yield:1,seconds:4},
  {id:'bread',name:'Farmhouse loaf',inputs:{flour:1,egg:1,milk:1},output:'bread',yield:1,seconds:6},
  {id:'juice',name:'Pressed apple juice',inputs:{apple:2},output:'juice',yield:1,seconds:4}
]);

export function goodsFor(world){return Object.assign(Object.create(null),GOODS,Object.fromEntries((world?.products||[]).map(p=>[p.id,p])));}
export function recipesFor(world){return Object.assign(Object.create(null),Object.fromEntries(DEFAULT_RECIPES.map(r=>[r.id,r])),Object.fromEntries((world?.recipes||[]).map(r=>[r.id,r])));}
export function recipeFor(world,node){const r=recipesFor(world)[node?.recipeId||node?.type];if(!r||!['coop','dairy','mill','workshop'].includes(node?.type))return null;const input=Object.keys(r.inputs)[0];return {...r,input,needs:r.inputs[input],good:r.output};}
export function producedGood(world,node){if(!node)return null;return ['field','orchard'].includes(node.type)?node.growGood||CATALOG[node.type].good:recipeFor(world,node)?.output||null;}
export function acceptsGoods(world,node){return !node?[]:['market','barn'].includes(node.type)?Object.keys(goodsFor(world)):Object.keys(recipeFor(world,node)?.inputs||{});}
export function parcelForNode(world,node){return (world?.parcels||[]).find(p=>p.id===node?.parcelId)||(world?.parcels||[]).find(p=>Math.abs(node.x-p.x)<=p.width/2&&Math.abs(node.z-p.z)<=p.depth/2)||null;}
export function parcelPad(world,parcel){
  if(Number.isFinite(parcel.padX)&&Number.isFinite(parcel.padZ))return {x:parcel.padX,z:parcel.padZ};
  const start=world?.start||{x:0,z:0},dx=start.x-parcel.x,dz=start.z-parcel.z;
  return Math.abs(dx)/parcel.width>=Math.abs(dz)/parcel.depth?{x:parcel.x+Math.sign(dx||1)*(parcel.width/2+1.4),z:parcel.z}:{x:parcel.x,z:parcel.z+Math.sign(dz||1)*(parcel.depth/2+1.4)};
}
const requirements=(value,label)=>{
  if(value===undefined)return [];
  if(!Array.isArray(value)||value.length>20||value.some(id=>!validId(id)))throw new Error(`${label} has invalid prerequisites.`);
  return [...new Set(value)];
};

export function createNode(type, x=0, z=0) {
  const item = CATALOG[type];
  if (!item) throw new Error('Choose a known farm item.');
  return {id:nextId(type),type,x:number(x,0,-128,128),z:number(z,0,-128,128),rotation:0,width:item.width,depth:item.depth,name:item.label,cost:item.cost,requires:[],...(type==='workshop'?{recipeId:'cheese'}:{}),...(type==='barn'?{storageCapacity:180,reserves:{wheat:10}}:{})};
}

export function rotatePoint(node, x=0, z=0) {
  const a=(node.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return {x:node.x+x*c-z*s,z:node.z+x*s+z*c};
}

export function portsFor(node) {
  const item=CATALOG[node.type],w=node.width||item?.width||2,d=node.depth||item?.depth||2;
  if (['field','orchard'].includes(node.type)) return {input:rotatePoint(node),output:rotatePoint(node),front:rotatePoint(node,0,d/2+1.2),pad:rotatePoint(node,0,d/2+1.2),cash:rotatePoint(node,0,d/2+1.2)};
  if (['basket','boots','helper','farmupgrade'].includes(node.type)) {const p=rotatePoint(node);return {input:p,output:p,front:p,pad:p,cash:p};}
  const front=rotatePoint(node,0,d/2+1.25);
  return {input:rotatePoint(node,node.type==='market'?0:-w*.28,d/2+1.25),output:rotatePoint(node,w*.28,d/2+1.25),front,pad:rotatePoint(node,0,d/2+3.4),cash:rotatePoint(node,w/2+1.5,d/2+1.25)};
}

export function nodeBounds(node, padding=0) {
  const quarter=Math.round((node.rotation||0)/90)%2;
  let w=node.width||CATALOG[node.type]?.width||2,d=node.depth||CATALOG[node.type]?.depth||2;
  if (node.type==='tree') w=d=.75;
  if (quarter) [w,d]=[d,w];
  return {x0:node.x-w/2-padding,x1:node.x+w/2+padding,z0:node.z-d/2-padding,z1:node.z+d/2+padding};
}

export function canLink(from,to,world) {
  if(!from||!to||from.id===to.id)return false;
  const good=producedGood(world,from),accepted=acceptsGoods(world,to);
  return from.type==='barn'?accepted.length>0:!!good&&accepted.includes(good);
}

export function normalizeWorld(raw) {
  if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch{throw new Error('That world file is not valid JSON.');}}
  if(raw?.world&&typeof raw.world==='object')raw=raw.world;
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.nodes))throw new Error('Choose a Farmyard world file.');
  if(raw.format&&raw.format!==WORLD_FORMAT)throw new Error('This file belongs to a different kind of project.');
  if(raw.version!==undefined&&raw.version!==1)throw new Error('This world uses a newer format. Update Farmyard before opening it.');
  if(raw.nodes.length>250)throw new Error('A world can contain up to 250 placed items.');
  const list=(value,label,max)=>{if(value===undefined)return [];if(!Array.isArray(value)||value.length>max)throw new Error(`${label} must be a list with at most ${max} entries.`);return value;};
  const unique=(items,label)=>{const ids=new Set();for(const item of items){if(!validId(item.id)||ids.has(item.id))throw new Error(`${label} need unique valid identities.`);ids.add(item.id);}return items;};
  const products=unique(list(raw.products,'Products',40).map(p=>{if(!p||typeof p!=='object')throw new Error('Choose a valid product.');return {id:p.id,label:name(p.label,'Farm produce',40),value:Math.round(number(p.value,5,1,100000)),color:/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#d1ae68',model:Object.hasOwn(GOODS,p.model)?p.model:Object.hasOwn(GOODS,p.id)?p.id:'wheat'};}),'Products');
  const goods=goodsFor({products}),keys=Object.keys(goods);
  const amounts=(value,label,empty=false,max=50)=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} needs a product list.`);const entries=Object.entries(value).filter(([,v])=>v!==0);if((!empty&&!entries.length)||entries.length>40||entries.some(([k,v])=>!keys.includes(k)||!Number.isInteger(v)||v<1||v>max))throw new Error(`${label} has an unknown product or invalid quantity.`);return Object.fromEntries(entries);};
  const recipes=unique(list(raw.recipes,'Recipes',40).map(r=>{if(!r||typeof r!=='object'||!keys.includes(r.output))throw new Error('A recipe has an unknown output product.');return {id:r.id,name:name(r.name,'Farm recipe',50),inputs:amounts(r.inputs,'Recipe'),output:r.output,yield:Math.round(number(r.yield,1,1,32)),seconds:number(r.seconds,5,.5,300)};}),'Recipes');
  const knownRecipes=recipesFor({recipes});
  const width=number(raw.width,64,32,256),depth=number(raw.depth,48,24,256),ids=new Set();
  const parcels=unique(list(raw.parcels,'Land parcels',64).map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))throw new Error('A land parcel has an invalid position.');return {id:p.id,name:name(p.name,'New farmland'),x:number(p.x,0,-128,128),z:number(p.z,0,-128,128),width:number(p.width,24,8,128),depth:number(p.depth,24,8,128),cost:Math.round(number(p.cost,300,0,1000000)),requires:requirements(p.requires,'Land parcel'),unlocked:p.unlocked===true,...(Number.isFinite(p.padX)&&Number.isFinite(p.padZ)?{padX:p.padX,padZ:p.padZ}:{})};}),'Land parcels');
  const nodes=raw.nodes.map((n,index)=>{
    if(!n||typeof n!=='object'||!CATALOG[n.type])throw new Error(`Item ${index+1} has an unknown type.`);
    if(!Number.isFinite(n.x)||!Number.isFinite(n.z))throw new Error(`Item ${index+1} has an invalid position.`);
    const item=CATALOG[n.type],id=validId(n.id)?n.id:nextId(n.type);
    if(ids.has(id)||parcels.some(p=>p.id===id))throw new Error('Two items have the same identity. Please use a fresh exported world.');
    ids.add(id);
    const rotation=((Math.round(number(n.rotation,0,-36000,36000)/90)*90)%360+360)%360;
    const w=number(n.width,item.width,n.type==='fence'?.25:1,n.type==='path'?80:20),d=number(n.depth,item.depth,n.type==='fence'?.25:1,n.type==='path'?80:20);
    const recipeId=['coop','dairy','mill','workshop'].includes(n.type)?n.recipeId||(n.type==='workshop'?'cheese':n.type):'';
    if(recipeId&&!knownRecipes[recipeId])throw new Error(`${n.name||item.label} has an unknown recipe.`);
    const growGood=['field','orchard'].includes(n.type)?n.growGood||item.good:'';
    if(growGood&&!keys.includes(growGood))throw new Error(`${n.name||item.label} grows an unknown product.`);
    return {id,type:n.type,x:number(n.x,0,-width/2+1,width/2-1),z:number(n.z,0,-depth/2+1,depth/2-1),rotation,width:w,depth:d,name:name(n.name,item.label),cost:Math.round(number(n.cost,item.cost,0,1000000)),requires:requirements(n.requires,n.name||item.label),
      ...(recipeId?{recipeId}:{}),...(growGood?{growGood}:{}),...(n.parcelId?{parcelId:n.parcelId}:{}),...(n.type==='barn'?{storageCapacity:Math.round(number(n.storageCapacity,180,10,5000)),reserves:amounts(n.reserves||{wheat:10},'Barn reserves',true,5000)}:{})};
  });
  const links=unique(list(raw.links,'Delivery routes',100).map((l,index)=>{
    if(!l||typeof l!=='object'||!validId(l.from)||!validId(l.to))throw new Error(`Route ${index+1} has invalid endpoints.`);
    if(l.good&&!keys.includes(l.good))throw new Error(`Route ${index+1} carries an unknown product.`);
    return {id:validId(l.id)?l.id:nextId('route'),from:l.from,to:l.to,workers:Math.round(number(l.workers,1,0,3)),requires:requirements(l.requires,`Route ${index+1}`),good:l.good||'',priority:Math.round(number(l.priority,3,1,5)),minStock:Math.round(number(l.minStock,0,0,5000)),mode:l.mode==='demand'?'demand':'always'};
  }),'Delivery routes');
  const orderTemplates=unique(list(raw.orderTemplates,'Customer orders',40).map(o=>{if(!o||typeof o!=='object')throw new Error('Choose a valid customer order.');return {id:o.id,name:name(o.name,'Farm order',50),items:amounts(o.items,'Customer order'),bonus:Math.round(number(o.bonus,0,0,100000)),urgency:['auto','relaxed','standard','urgent'].includes(o.urgency)?o.urgency:'auto'};}),'Customer orders');
  const milestones=unique(list(raw.milestones,'Milestones',60).map(m=>{if(!m||!['orders','sold','earned','unlock','rank'].includes(m.kind))throw new Error('Choose a valid milestone goal.');if(m.kind==='sold'&&!keys.includes(m.good))throw new Error('A milestone names an unknown product.');return {id:m.id,title:name(m.title,'A new farm goal'),kind:m.kind,target:Math.round(number(m.target,1,1,1000000)),good:m.good||'',nodeId:m.nodeId||'',reward:Math.round(number(m.reward,0,0,100000))};}),'Milestones');
  return {format:WORLD_FORMAT,version:1,id:validId(raw.id)?raw.id:nextId('world'),name:name(raw.name,'My farm'),width,depth,
    start:{x:number(raw.start?.x,0,-width/2+1,width/2-1),z:number(raw.start?.z,3,-depth/2+1,depth/2-1)},
    settings:{startingCoins:Math.floor(number(raw.settings?.startingCoins,60,0,1000000)),capacity:Math.floor(number(raw.settings?.capacity,18,4,100)),moveSpeed:number(raw.settings?.moveSpeed,5.2,2,12),growthSeconds:number(raw.settings?.growthSeconds,8,2,120),customerOrders:raw.settings?.customerOrders===true,pressureEnabled:raw.settings?.pressureEnabled===true||raw.settings?.pressureEnabled!==false&&raw.settings?.campaign==='growing-farm',pressureGraceOrders:Math.round(number(raw.settings?.pressureGraceOrders,3,0,30)),pressureDifficulty:['gentle','normal','busy'].includes(raw.settings?.pressureDifficulty)?raw.settings.pressureDifficulty:'normal',boardEnabled:raw.settings?.boardEnabled!==false,relaxedSeconds:Math.round(number(raw.settings?.relaxedSeconds,180,30,900)),standardSeconds:Math.round(number(raw.settings?.standardSeconds,115,20,600)),urgentSeconds:Math.round(number(raw.settings?.urgentSeconds,75,15,300)),lateFinePercent:Math.round(number(raw.settings?.lateFinePercent,10,0,30)),rushEvery:Math.round(number(raw.settings?.rushEvery,10,0,100)),helperPolicy:['balanced','feed-first','orders'].includes(raw.settings?.helperPolicy)?raw.settings.helperPolicy:'balanced',...(raw.settings?.campaign==='growing-farm'?{campaign:'growing-farm',campaignRevision:Math.round(number(raw.settings?.campaignRevision,1,1,3))}:{})},
    nodes,links,products,recipes,parcels,orderTemplates,milestones,createdAt:name(raw.createdAt,new Date().toISOString(),40),updatedAt:name(raw.updatedAt,new Date().toISOString(),40)};
}

function inside(p,bounds){return p.x>bounds.x0&&p.x<bounds.x1&&p.z>bounds.z0&&p.z<bounds.z1;}

// This editor check assumes every building has been bought. It catches routes
// that would become blocked later, without imposing mandatory path tiles.
function navigationWarnings(world,solid){
  if(!world.nodes.length)return [];
  const bounds=solid.map(n=>nodeBounds(n,n.type==='fence'?.28:.32));
  const walk=p=>Math.abs(p.x)<world.width/2-.4&&Math.abs(p.z)<world.depth/2-.4&&!bounds.some(b=>inside(p,b));
  const clearSegment=(a,b)=>{const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)*5));for(let i=0;i<=steps;i++){const t=i/steps;if(!walk({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false;}return true;};
  const cellsNear=p=>{const out=[];for(let x=Math.floor(p.x)-1;x<=Math.ceil(p.x)+1;x++)for(let z=Math.floor(p.z)-1;z<=Math.ceil(p.z)+1;z++)if(Math.hypot(x-p.x,z-p.z)<1.8&&clearSegment(p,{x,z}))out.push({x,z});return out;};
  const start=cellsNear(world.start)[0];if(!start)return [];
  const cache=new Map(),seen=new Set(),queue=[start],key=p=>`${p.x},${p.z}`;
  const cellFree=p=>{const k=key(p);if(!cache.has(k))cache.set(k,walk(p));return cache.get(k);};
  seen.add(key(start));let index=0;
  while(index<queue.length&&index<Math.max(20000,Math.ceil(world.width*world.depth*1.2))){const at=queue[index++];for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const p={x:at.x+dx,z:at.z+dz},k=key(p);if(!seen.has(k)&&cellFree(p)){seen.add(k);queue.push(p);}}}
  const reachable=p=>cellsNear(p).some(c=>seen.has(key(c))),warnings=[];
  for(const n of world.nodes){
    const p=portsFor(n),stations=['coop','dairy','mill','workshop','market','barn'].includes(n.type)?[p.input,...(n.type==='market'?[]:[p.output])]:[];
    if(n.cost>0)stations.push(p.pad);
    if(stations.some(s=>!reachable(s)))warnings.push(`${n.name} has a station you cannot reach once all buildings are open. Leave a walking gap in fences and scenery.`);
    if(['field','orchard'].includes(n.type)&&solid.some(o=>{const b=nodeBounds(o);return inside(n,b);}))warnings.push(`${n.name} overlaps a solid item. Keep its growing area clear for harvesters.`);
  }
  return warnings;
}

export function validateWorld(raw) {
  const errors=[],warnings=[];let world;
  try{world=normalizeWorld(raw);}catch(error){return {errors:[error.message],warnings};}
  const map=new Map([...world.nodes,...world.parcels].map(n=>[n.id,n]));
  const allStages=[...world.nodes,...world.parcels];
  for(const n of allStages)for(const id of n.requires){if(!map.has(id))errors.push(`${n.name} has a prerequisite referring to a removed item.`);else if(id===n.id)errors.push(`${n.name} cannot require itself.`);}
  const visiting=new Set(),visited=new Set();
  const checkCycle=id=>{if(visiting.has(id))return true;if(visited.has(id))return false;visiting.add(id);const item=map.get(id),deps=[...(item?.requires||[]),...(item?.type&&parcelForNode(world,item)?[parcelForNode(world,item).id]:[])];const cyclic=deps.some(dep=>map.has(dep)&&checkCycle(dep));visiting.delete(id);visited.add(id);return cyclic;};
  if(allStages.some(n=>checkCycle(n.id)))errors.push('The prerequisite chain contains a loop. Each new stage must follow an earlier one.');
  if(!world.nodes.some(n=>['field','orchard'].includes(n.type)))errors.push('Add a hay field or orchard to grow produce.');
  if(!world.nodes.some(n=>n.type==='market'))errors.push('Add a market so your produce can be sold.');
  const growing=world.nodes.filter(n=>['field','orchard'].includes(n.type));
  if(growing.length&&growing.every(n=>n.cost>world.settings.startingCoins))warnings.push('All growing areas cost more than your starting coins. Make one free or increase starting coins.');
  const cropCount=growing.reduce((total,n)=>{const step=n.type==='orchard'?2.3:1.1,cap=n.type==='orchard'?8:16;return total+Math.max(1,Math.min(cap,Math.floor((n.width-.7)/step)))*Math.max(1,Math.min(cap,Math.floor((n.depth-.7)/step)));},0);
  if(cropCount>3000)errors.push('This farm has more than 3,000 crop spots. Use fewer or smaller fields.');
  const solid=world.nodes.filter(n=>CATALOG[n.type].solid);
  if(solid.some(n=>inside(world.start,nodeBounds(n,.3))))errors.push('The player start is inside a solid item. Move the start marker.');
  if(world.parcels.some(p=>!p.unlocked&&p.cost>0&&Math.abs(world.start.x-p.x)<p.width/2&&Math.abs(world.start.z-p.z)<p.depth/2))errors.push('The player start is on locked land. Move it to an open parcel.');
  const inWorld=p=>Math.abs(p.x)<world.width/2-.5&&Math.abs(p.z)<world.depth/2-.5;
  for(const n of world.nodes){
    const b=nodeBounds(n);if(b.x0 < -world.width/2||b.x1 > world.width/2||b.z0 < -world.depth/2||b.z1 > world.depth/2)warnings.push(`${n.name} extends beyond the farm boundary.`);
    const portKinds=['coop','dairy','mill','workshop','market','barn'].includes(n.type)?['input',...(n.type==='market'?[]:['output']),...(n.cost?['pad']:[])]:n.cost?['pad']:[];
    if(n.parcelId&&!world.parcels.some(p=>p.id===n.parcelId))errors.push(`${n.name} belongs to a removed land parcel.`);
    for(const kind of portKinds){
      const p=portsFor(n)[kind];
      if(!inWorld(p))errors.push(`${n.name}: move it inward so its ${kind==='pad'?'gold square':kind+' station'} fits on the farm.`);
      else if(solid.some(other=>other.id!==n.id&&inside(p,nodeBounds(other,.35))))errors.push(`${n.name}: its ${kind==='pad'?'gold square':kind+' station'} is blocked by another item.`);
    }
  }
  const pairs=new Set();
  for(const l of world.links){const a=map.get(l.from),b=map.get(l.to),pair=l.from+'>'+l.to;
    for(const id of l.requires)if(!map.has(id))errors.push('A delivery route requires a removed item. Choose an existing helper pad or building.');
    if(!a||!b)errors.push('A delivery route refers to a removed item. Delete that route.');
    else if(!canLink(a,b,world)||l.good&&!acceptsGoods(world,b).includes(l.good)||l.good&&a.type!=='barn'&&producedGood(world,a)!==l.good)errors.push(`${a.name} cannot supply ${b.name} with the chosen product. Check its recipe and the route's cargo.`);
    else if(pairs.has(pair))warnings.push(`${a.name} already has a route to ${b.name}.`);
    pairs.add(pair);
  }
  for(const p of world.parcels){
    if(Math.abs(p.x)+p.width/2>world.width/2||Math.abs(p.z)+p.depth/2>world.depth/2)errors.push(`${p.name} extends beyond the farm boundary.`);
    const pad=parcelPad(world,p);if(p.cost>0&&!p.unlocked&&(!inWorld(pad)||solid.some(n=>inside(pad,nodeBounds(n,.35)))))errors.push(`${p.name} needs a reachable gold square inside the farm.`);
  }
  const renewable=new Set(world.nodes.filter(n=>['field','orchard'].includes(n.type)).map(n=>producedGood(world,n)));
  for(let pass=0;pass<Object.keys(goodsFor(world)).length;pass++)for(const n of world.nodes){const r=recipeFor(world,n);if(r&&Object.keys(r.inputs).every(g=>renewable.has(g)))renewable.add(r.output);}
  for(const order of world.orderTemplates)if(Object.keys(order.items).some(g=>!renewable.has(g)))errors.push(`${order.name} requests produce this farm cannot make. Add its growing or production chain.`);
  for(const goal of world.milestones)if(goal.kind==='unlock'&&!map.has(goal.nodeId))errors.push(`${goal.title} refers to a removed unlock.`);
  for(const n of world.nodes){const r=recipeFor(world,n);if(r&&!renewable.has(r.output))warnings.push(`${n.name} has no complete ingredient supply chain.`);}
  if(!world.links.length)warnings.push('No helper routes yet. You can still harvest and deliver everything yourself.');
  if(world.links.reduce((n,l)=>n+l.workers,0)>60)errors.push('Use at most 60 helpers in one farm. Reduce the workers assigned to routes.');
  if(world.links.reduce((n,l)=>n+l.workers,0)>50)warnings.push('Many helpers may slow older laptops. Fewer than 40 is recommended.');
  if(!errors.length)warnings.push(...navigationWarnings(world,solid));
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}

export function worldFingerprint(world){
  const text=JSON.stringify({width:world.width,depth:world.depth,start:world.start,settings:world.settings,nodes:world.nodes,links:world.links,products:world.products,recipes:world.recipes,parcels:world.parcels,orderTemplates:world.orderTemplates,milestones:world.milestones});
  let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);
}

export function createWorld(template='starter') {
  if(template==='farm')return growingFarm();
  const world={format:WORLD_FORMAT,version:1,id:nextId('world'),name:template==='blank'?'My new farm':template==='network'?'Golden supply farm':'Monsoons starter farm',width:64,depth:48,start:{x:-4,z:2},settings:{startingCoins:60,capacity:18,moveSpeed:5.2,growthSeconds:8},nodes:[],links:[]};
  if(template==='blank')return normalizeWorld(world);
  const add=(type,x,z,extra={})=>{const node=Object.assign(createNode(type,x,z),extra);world.nodes.push(node);return node;};
  add('path',0,3,{width:43,depth:4});add('path',0,-1,{width:4,depth:34});add('path',-13,1,{width:4,depth:24});add('path',12,2,{width:4,depth:26});
  add('barn',-1,-16);const field=add('field',-11,-7,{width:10,depth:7});const market=add('market',0,8);
  const coop=add('coop',11,-8),mill=add('mill',-13,10),orchard=add('orchard',14,11);
  add('basket',-3,-2);add('boots',-3,-5);add('pond',24,-14);add('tree',-25,-17);add('tree',-24,16);add('tree',25,15);add('tree',23,2);add('tree',-8,-19);
  add('fence',-18,-18,{width:10});add('fence',14,-19,{width:12});add('fence',-24,-8,{width:12,rotation:90});add('fence',-12,20,{width:13});
  const link=(a,b,workers=1)=>world.links.push({id:nextId('route'),from:a.id,to:b.id,workers});
  link(field,market);
  if(template==='network'){
    world.settings.startingCoins=200;
    coop.cost=mill.cost=orchard.cost=0;
    const field2=add('field',-22,4,{width:7,depth:6,name:'Mill hay'});
    link(field,coop);link(field2,mill);link(coop,market);link(mill,market);link(orchard,market);
  }
  return normalizeWorld(world);
}

// A small beginning with room to earn the rest. The same portable nodes and
// routes are used by the builder; no hidden campaign-only machine behaviour.
function growingFarm(){
  const world={format:WORLD_FORMAT,version:1,id:nextId('world'),name:'My growing farm',width:112,depth:104,start:{x:-5,z:2},settings:{startingCoins:20,capacity:14,moveSpeed:5.2,growthSeconds:8,customerOrders:true,pressureEnabled:true,campaign:'growing-farm',campaignRevision:2,helperPolicy:'feed-first'},nodes:[],links:[],parcels:[],milestones:[]};
  const add=(id,type,x,z,extra={})=>{const n={...createNode(type,x,z),id,...extra};world.nodes.push(n);return n;};
  add('farm-main-path','path',0,3,{width:39,depth:3.5});add('farm-cross-path','path',0,-.5,{width:3.5,depth:31});
  const homeBarn=add('farm-barn','barn',-11,-14,{name:'The old red barn',storageCapacity:180,reserves:{wheat:10}});
  const field=add('farm-hay','field',-10,-6,{width:8,depth:6,name:'Hay patch'});
  const market=add('farm-market','market',0,5.5,{name:'Farm market'});
  add('farm-basket','basket',-2,-3);add('farm-boots','boots',-2,-6);
  const coop=add('farm-coop','coop',10,-7,{name:'Chicken coop',cost:90});
  const dairy=add('farm-dairy','dairy',17,1,{name:'Cow pasture',cost:180,requires:[coop.id]});
  const firstHelper=add('farm-helper','helper',-15,-1,{name:'Hire Bea',cost:140,requires:[coop.id]});
  const orchard=add('farm-orchard','orchard',12,12,{width:6,depth:5,name:'Apple orchard',cost:260,requires:[dairy.id]});
  const mill=add('farm-mill','mill',-9,10,{name:'Flour mill',cost:300,requires:[orchard.id]});
  const extra=add('farm-extra-hay','field',-18,6,{width:7,depth:6,name:'Second hay field',cost:220,requires:[dairy.id]});
  const animalTeam=add('farm-animal-team','helper',6,0,{name:'Hire the animal team',cost:300,requires:[dairy.id]});
  add('farm-improvement','farmupgrade',5,13,{name:'Improve the market',cost:200,requires:[dairy.id]});
  add('farm-pond','pond',18,-13,{width:5,depth:4});
  for(const [i,x,z]of[[0,-21,-14],[1,-22,13],[2,21,15],[3,21,-4],[4,-3,-17]])add(`farm-tree-${i}`,'tree',x,z);
  add('farm-back-fence','fence',3,-17,{width:16});add('farm-side-fence','fence',-22,-7,{width:12,rotation:90});add('farm-front-fence','fence',-12,18,{width:15});
  let route=0;
  const link=(a,b,requires)=>world.links.push({id:`farm-route-${++route}`,from:a.id,to:b.id,workers:1,requires});
  link(field,market,[firstHelper.id]);
  link(field,coop,[animalTeam.id]);link(field,dairy,[animalTeam.id]);
  link(coop,market,[animalTeam.id]);link(dairy,market,[animalTeam.id]);
  link(orchard,market,[firstHelper.id]);link(extra,market,[firstHelper.id]);
  link(extra,mill,[animalTeam.id]);link(mill,market,[animalTeam.id]);
  for(const node of world.nodes)node.parcelId='farm-home';
  world.parcels.push({id:'farm-home',name:'Home farm',x:0,z:0,width:48,depth:40,cost:0,unlocked:true,requires:[]},
    {id:'farm-land-dairy',name:'Dairy meadow',x:40,z:0,width:32,depth:40,cost:400,requires:[dairy.id],padX:22.5,padZ:0},
    {id:'farm-land-grain',name:'Golden grain fields',x:0,z:-36,width:48,depth:32,cost:500,requires:[mill.id],padX:0,padZ:-18.5},
    {id:'farm-land-orchard',name:'West orchard',x:-40,z:0,width:32,depth:40,cost:550,requires:[orchard.id],padX:-22.5,padZ:0},
    {id:'farm-land-bakery',name:'Bakery green',x:0,z:36,width:48,depth:32,cost:650,requires:['farm-land-dairy','farm-land-grain'],padX:0,padZ:18.5},
    {id:'farm-land-north-east',name:'High pasture',x:40,z:-36,width:32,depth:32,cost:850,requires:['farm-land-dairy','farm-land-grain'],padX:40,padZ:-18.5},
    {id:'farm-land-north-west',name:'Cider orchard',x:-40,z:-36,width:32,depth:32,cost:950,requires:['farm-land-orchard','farm-land-grain'],padX:-40,padZ:-18.5},
    {id:'farm-land-south-east',name:'Harvest meadow',x:40,z:36,width:32,depth:32,cost:1100,requires:['farm-land-dairy','farm-land-bakery'],padX:40,padZ:18.5},
    {id:'farm-land-south-west',name:'Market garden',x:-40,z:36,width:32,depth:32,cost:1200,requires:['farm-land-orchard','farm-land-bakery'],padX:-40,padZ:18.5});
  const on=(parcel,id,type,x,z,extra={})=>add(id,type,x,z,{parcelId:parcel,requires:[parcel],...extra});
  const supply=(a,b,helper,good='',priority=3)=>world.links.push({id:`farm-route-${++route}`,from:a.id,to:b.id,workers:1,requires:[helper.id],good,priority,minStock:0,mode:'demand'});
  const cheese=on('farm-land-dairy','farm-cheese','workshop',34,-7,{name:'Cheese kitchen',recipeId:'cheese',cost:200});
  const butter=on('farm-land-dairy','farm-butter','workshop',46,-7,{name:'Butter churn',recipeId:'butter',cost:180});
  const cows=on('farm-land-dairy','farm-more-cows','dairy',39,7,{name:'Meadow cows',cost:220});
  const dairyTeam=on('farm-land-dairy','farm-dairy-team','helper',29,13,{name:'Dairy helpers',cost:220});
  on('farm-land-dairy','farm-dairy-barn','barn',49,12,{name:'Dairy store',cost:80,storageCapacity:240,reserves:{milk:4}});
  supply(field,cows,dairyTeam);supply(cows,market,dairyTeam);supply(dairy,cheese,dairyTeam);supply(dairy,butter,dairyTeam);supply(cheese,market,dairyTeam);supply(butter,market,dairyTeam);
  const grain=on('farm-land-grain','farm-grain','field',-10,-34,{name:'Golden grain',growGood:'grain',width:10,depth:8,cost:0});
  const grainMill=on('farm-land-grain','farm-grain-mill','mill',10,-34,{name:'Grain mill',recipeId:'grain-mill',cost:160});
  const grainTeam=on('farm-land-grain','farm-grain-team','helper',0,-24,{name:'Grain helpers',cost:180});
  supply(grain,grainMill,grainTeam);supply(grain,market,grainTeam);supply(grainMill,market,grainTeam);
  const westFruit=on('farm-land-orchard','farm-west-apples','orchard',-43,-8,{name:'West apples',width:10,depth:8,cost:0});
  const press=on('farm-land-orchard','farm-juice','workshop',-34,6,{name:'Apple press',recipeId:'juice',cost:200});
  const fruitTeam=on('farm-land-orchard','farm-fruit-team','helper',-28,-7,{name:'Orchard helpers',cost:180});
  on('farm-land-orchard','farm-fruit-barn','barn',-47,10,{name:'Fruit store',cost:80,storageCapacity:240,reserves:{apple:6}});
  supply(westFruit,press,fruitTeam);supply(westFruit,market,fruitTeam);supply(press,market,fruitTeam);
  const bakery=on('farm-land-bakery','farm-bakery','workshop',6,30,{name:'Farmhouse bakery',recipeId:'bread',cost:240});
  const bakeryTeam=on('farm-land-bakery','farm-bakery-team','helper',13,40,{name:'Bakery helpers',cost:220});
  on('farm-land-bakery','farm-bakery-barn','barn',-13,30,{name:'Bakery store',cost:0,storageCapacity:300,reserves:{flour:4,egg:4,milk:4}});
  supply(grainMill,bakery,bakeryTeam,'flour');supply(coop,bakery,bakeryTeam,'egg');supply(dairy,bakery,bakeryTeam,'milk');supply(bakery,market,bakeryTeam);
  const hillHay=on('farm-land-north-east','farm-hill-hay','field',47,-27,{width:8,depth:6,cost:0});
  const hillCows=on('farm-land-north-east','farm-hill-cows','dairy',36,-39,{name:'High pasture cows',cost:200});
  const hillTeam=on('farm-land-north-east','farm-hill-team','helper',29,-28,{name:'Pasture helpers',cost:220});
  supply(hillHay,hillCows,hillTeam);supply(hillCows,market,hillTeam);
  const northFruit=on('farm-land-north-west','farm-north-apples','orchard',-40,-30,{width:10,depth:8,cost:0});
  const northPress=on('farm-land-north-west','farm-north-press','workshop',-45,-44,{name:'Orchard press',recipeId:'juice',cost:160});
  const northTeam=on('farm-land-north-west','farm-north-team','helper',-28,-42,{name:'North orchard helpers',cost:220});
  supply(northFruit,northPress,northTeam);supply(northFruit,market,northTeam);supply(northPress,market,northTeam);
  const harvestGrain=on('farm-land-south-east','farm-harvest-grain','field',36,31,{growGood:'grain',width:10,depth:8,cost:0});
  const harvestMill=on('farm-land-south-east','farm-harvest-mill','mill',47,43,{recipeId:'grain-mill',cost:160});
  const harvestTeam=on('farm-land-south-east','farm-harvest-team','helper',29,45,{name:'Harvest helpers',cost:220});
  supply(harvestGrain,harvestMill,harvestTeam);supply(harvestGrain,market,harvestTeam);supply(harvestMill,market,harvestTeam);
  const gardenHay=on('farm-land-south-west','farm-garden-hay','field',-43,31,{width:10,depth:8,cost:0});
  const gardenFruit=on('farm-land-south-west','farm-garden-apples','orchard',-30,42,{width:8,depth:6,cost:0});
  const gardenTeam=on('farm-land-south-west','farm-garden-team','helper',-47,45,{name:'Garden helpers',cost:220});
  supply(gardenHay,market,gardenTeam);supply(gardenFruit,market,gardenTeam);
  world.milestones=[{id:'m006-first-land',title:'A whole new meadow',kind:'unlock',nodeId:'farm-land-dairy',target:1,reward:75},
    {id:'m006-cheese',title:'Farmhouse cheesemaker',kind:'sold',good:'cheese',target:6,reward:100},
    {id:'m006-bread',title:'Fresh from the bakery',kind:'sold',good:'bread',target:6,reward:150},
    {id:'m006-juice',title:'Pressed on the farm',kind:'sold',good:'juice',target:10,reward:100},
    {id:'m006-land',title:'Room for every idea',kind:'unlock',nodeId:'farm-land-south-west',target:1,reward:300},
    {id:'m006-orders',title:'A hundred happy customers',kind:'orders',target:100,reward:250}];
  return addOuterRing(normalizeWorld(world));
}

// A second, distant ring gives long-running farms meaningful new land.
// Built from the same world items used by World Builder, with deterministic IDs.
function addOuterRing(world){
  if(world.parcels.some(p=>p.id==='farm-land-far-north'))return world;
  world.width=Math.max(224,world.width);world.depth=Math.max(224,world.depth);
  const locations=[
    ['north','North Ridge',0,-81,'farm-land-grain','grain'],
    ['ne','Wildflower Heights',80,-81,'farm-land-north-east','wheat'],
    ['east','Eastern Farm Shops',80,0,'farm-land-dairy','apple'],
    ['se','Riverbank Gardens',80,81,'farm-land-south-east','wheat'],
    ['south','Lower Mill Valley',0,81,'farm-land-bakery','grain'],
    ['sw','Southern Orchard',-80,81,'farm-land-south-west','apple'],
    ['west','West Country Market',-80,0,'farm-land-orchard','apple'],
    ['nw','Highland Hayfields',-80,-81,'farm-land-north-west','wheat']
  ];
  let counter=1;for(const [suffix,title,x,z,prerequisite,good] of locations){
    const parcelId='farm-land-far-'+suffix,parcel={id:parcelId,name:title,x,z,width:40,depth:40,cost:1800+counter*350,requires:[prerequisite],unlocked:false};
    // The gold pad sits just beyond an existing neighbouring parcel.
    const dx=x>0?1:x<0?-1:0,dz=z>0?1:z<0?-1:0;
    parcel.padX=dx?dx*59:0;parcel.padZ=dz?dz*60:0;
    if(dx&&dz){parcel.padX=dx*57;parcel.padZ=dz*56;}
    world.parcels.push(parcel);
    const add=(id,type,nx,nz,extra={})=>{const n={...createNode(type,nx,nz),id,parcelId,requires:[parcelId],...extra};world.nodes.push(n);return n;};
    add('far-road-'+suffix,'path',x,z,{width:24,depth:3,cost:0});
    const field=add('far-crop-'+suffix,good==='apple'?'orchard':'field',x-8,z-6,{name:title+' crops',growGood:good,cost:0,width:10,depth:8});
    const market=(suffix==='east'||suffix==='west')?add('far-market-'+suffix,'market',x+8,z+9,{name:title+' market',cost:0}):null;
    const helper=add('far-helper-'+suffix,'helper',x-8,z+8,{name:'Hire '+['Nora','Ivy','Fred','Rosie','Jo','Ella','Sam','Pat'][counter-1],cost:350});
    const target=market||world.nodes.find(n=>n.id==='farm-market');
    if(target)world.links.push({id:'far-route-'+suffix,from:field.id,to:target.id,workers:1,requires:[helper.id],good,priority:3,minStock:0,mode:'demand'});
    add('far-tree-'+suffix,'tree',x+15,z-13,{cost:0});counter++;
  }
  world.milestones.push({id:'m008-frontier',title:'Welcome to the outer fields',kind:'unlock',nodeId:'farm-land-far-east',target:1,reward:500},
    {id:'m008-deliveries',title:'The village’s favourite farm',kind:'orders',target:250,reward:1000});
  world.settings.campaignRevision=3;
  return normalizeWorld(world);
}

// The built-in campaign is stored as a portable world. Upgrade its design once,
// preserving every original node/property and letting WorldGame reconcile progress.
export function upgradeGrowingFarm(raw){
  const world=normalizeWorld(raw);if(world.settings.campaign!=='growing-farm'||world.settings.campaignRevision>=3)return {world,changed:false};
  const fresh=growingFarm(),oldNodes=new Map(world.nodes.map(n=>[n.id,n])),newNodes=new Map(fresh.nodes.map(n=>[n.id,n]));
  const nodes=world.nodes.map(n=>({...newNodes.get(n.id),...n,parcelId:n.parcelId||'farm-home'}));
  for(const n of fresh.nodes)if(!oldNodes.has(n.id))nodes.push(n);
  const merge=(old,add)=>[...old,...add.filter(n=>!old.some(v=>v.id===n.id))];
  // Only the pre-parcel M004 worlds need position-based migration. A v2 world
  // contains blueprinted buildings on locked plots, not purchased land.
  const existingParcels=new Map(world.parcels.map(p=>[p.id,p]));
  const parcels=merge(world.parcels,fresh.parcels).map(p=>({...p,unlocked:existingParcels.has(p.id)?existingParcels.get(p.id).unlocked===true:p.unlocked||world.parcels.length===0&&world.nodes.some(n=>Math.abs(n.x)>24||Math.abs(n.z)>20?Math.abs(n.x-p.x)<p.width/2&&Math.abs(n.z-p.z)<p.depth/2:false)}));
  return {changed:true,world:normalizeWorld({...world,width:Math.max(world.width,fresh.width),depth:Math.max(world.depth,fresh.depth),nodes,parcels,links:merge(world.links,fresh.links),milestones:merge(world.milestones,fresh.milestones),settings:{...fresh.settings,...world.settings,campaignRevision:3}})};
}
