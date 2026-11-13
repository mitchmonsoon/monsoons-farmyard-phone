// Small presentation helpers shared by the Three and illustrated farm views.
// They keep custom products, parcel visibility and selection behaviour aligned.
import * as Schema from './world-schema.js';

export const STATUS_STYLE = Object.freeze({
  'needs-feed': {icon:'feed',fill:'#fff0ce',ink:'#9c7435',border:'#dfbd75'},
  working: {icon:'working',fill:'#e6f3de',ink:'#4f8060',border:'#a6c990'},
  ready: {icon:'ready',fill:'#fff6c6',ink:'#6e873e',border:'#d7c25b'},
  full: {icon:'storage',fill:'#ffe3c3',ink:'#a76a36',border:'#dea46b'},
  blocked: {icon:'blocked',fill:'#f9ddd0',ink:'#a05b42',border:'#d39c7e'},
});

export function goodsForView(world){
  if(Schema.goodsFor)return Schema.goodsFor(world);
  return {...Schema.GOODS,...Object.fromEntries((world?.products||[]).map(p=>[p.id,p]))};
}
export function recipeForView(world,node){
  if(Schema.recipeFor)return Schema.recipeFor(world,node);
  return ({coop:{inputs:{wheat:1},output:'egg'},dairy:{inputs:{wheat:1},output:'milk'},mill:{inputs:{wheat:2},output:'flour'}})[node.type]||null;
}
export function outputForView(world,node){
  return Schema.producedGood?.(world,node)||recipeForView(world,node)?.output||node.growGood||Schema.CATALOG[node.type]?.good||null;
}
export function parcelForView(world,node){
  return Schema.parcelForNode?.(world,node)||(world.parcels||[]).find(p=>p.id===node.parcelId)||null;
}
export function parcelOpen(parcel,state,mode='game'){
  if(mode==='editor')return true;
  const saved=state?.parcels?.[parcel.id];
  return typeof saved==='boolean'?saved:!!(saved?.unlocked??parcel.unlocked);
}
export function parcelPadForView(world,parcel){
  return Schema.parcelPad?.(world,parcel)||{x:parcel.padX??parcel.x,z:parcel.padZ??parcel.z};
}
export function nodeOpen(world,node,state,mode='game'){
  if(mode==='editor')return true;
  const parcel=parcelForView(world,node),ns=state?.nodes?.[node.id];
  return (!parcel||parcelOpen(parcel,state,mode))&&(!ns||ns.unlocked!==false);
}
export const stockCount=stock=>typeof stock==='number'?Math.max(0,stock):Object.values(stock||{}).reduce((n,v)=>n+(Number(v)||0),0);
export function selectedObjects(world,selection){
  const ids=Array.isArray(selection)?selection:[selection];
  return ids.flatMap(id=>{
    if(typeof id!=='string')return [];
    if(id.startsWith('parcel:')){const p=(world.parcels||[]).find(p=>p.id===id.slice(7));return p?[{...p,type:'parcel',rotation:0}]:[];}
    const n=world.nodes.find(n=>n.id===id);return n?[n]:[];
  });
}
export const ghostObjects=ghost=>Array.isArray(ghost)?ghost:ghost?[ghost]:[];
export function nodeStatusMap(state){
  return new Map((state?.nodeStatuses||state?.statuses||[]).map(s=>[s.id,s]));
}
