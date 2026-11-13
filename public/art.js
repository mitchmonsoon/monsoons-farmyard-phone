import * as THREE from './vendor/three.module.js';
import {drawFarmIcon} from './pad-icons.js';

export const C = {grass:0x78b65a,grassLight:0x91c66c,grassDark:0x4f8e49,soil:0x956644,sand:0xe7c486,cream:0xffedc5,wood:0xa46c42,woodDark:0x6b4735,red:0xd56844,teal:0x3f9d88,gold:0xf6bd33,blue:0x438daa,ink:0x244b3e};
const mats=new Map(), geometries=new Map(), goodsModels=new Map();
const personShadowMaterial=new THREE.MeshBasicMaterial({color:0x2e4f32,transparent:true,opacity:.13,depthWrite:false});
personShadowMaterial.userData.farmShared=true;
export function material(color,options={}) {
  const key=JSON.stringify([color,options]);
  if(!mats.has(key)){const m=new THREE.MeshStandardMaterial({color,roughness:.74,flatShading:false,...options});m.userData.farmShared=true;mats.set(key,m);}
  return mats.get(key);
}
function geo(key,make) {if(!geometries.has(key)){const g=make();g.userData.farmShared=true;geometries.set(key,g);}return geometries.get(key);}
export function mesh(geometry,color,parent,x=0,y=0,z=0,options={}) {
  const obj=new THREE.Mesh(geometry,typeof color==='number'||typeof color==='string'?material(color,options):color);
  obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;if(parent)parent.add(obj);return obj;
}
export function box(parent,w,h,d,color,x=0,y=0,z=0,options={}) {return mesh(geo(`b${w},${h},${d}`,()=>new THREE.BoxGeometry(w,h,d)),color,parent,x,y,z,options);}
// Small bevels catch the sun, while preserving the original exterior dimensions.
export function softBox(parent,w,h,d,color,x=0,y=0,z=0,r=.06,options={}){
  r=Math.min(r,w*.19,h*.19,d*.19);
  const shape=geo(`soft${w},${h},${d},${r}`,()=>{const g=new THREE.ExtrudeGeometry(roundedShape(w-r*2,h-r*2,r),{depth:d-r*2,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:1,curveSegments:3,steps:1});g.translate(0,0,-d/2+r);return g;});
  return mesh(shape,color,parent,x,y,z,options);
}
export function sphere(parent,r,color,x=0,y=0,z=0,sx=1,sy=1,sz=1) {
  const obj=mesh(geo(`s${r}`,()=>new THREE.SphereGeometry(r,r>.5?10:12,r>.5?7:8)),color,parent,x,y,z);obj.scale.set(sx,sy,sz);return obj;
}
export function cylinder(parent,rt,rb,h,color,x=0,y=0,z=0,n=10) {return mesh(geo(`c${rt},${rb},${h},${n}`,()=>new THREE.CylinderGeometry(rt,rb,h,n)),color,parent,x,y,z);}
export function cone(parent,r,h,color,x=0,y=0,z=0,n=7) {return cylinder(parent,0,r,h,color,x,y,z,n);}
export function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);if(parent)parent.add(g);return g;}
export function rod(parent,a,b,r,color){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const m=cylinder(parent,r,r,v.length(),color,...av.clone().add(bv).multiplyScalar(.5).toArray(),6);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
export function roundedShape(w,h,r=.4){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
export function plate(parent,w,d,color,x=0,z=0,y=.025,r=.35,options={}){const m=mesh(geo(`p${w},${d},${r}`,()=>new THREE.ShapeGeometry(roundedShape(w,d,r),4)),color,parent,x,y,z,options);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;}

// Merge only static descendants; articulated arms, wheels, eyes and crops stay
// separate. Shared source geometry/materials remain owned by the art cache.
export function bakeStaticParts(root,excluded=[]){
  const skip=new Set(excluded),buckets=new Map();root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert();
  const vertexMaterial=m=>m.isMeshStandardMaterial&&!m.map&&!m.normalMap&&!m.emissiveMap&&m.emissive.getHex()===0&&!m.wireframe;
  const visit=o=>{if(skip.has(o))return;if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)&&!o.material.transparent){const m=o.material,k=(vertexMaterial(m)?`vertex-${m.roughness}-${m.metalness}-${m.side}-${m.flatShading}`:m.uuid)+'-'+o.castShadow+'-'+o.receiveShadow;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(o);}for(const child of o.children)visit(child);};
  for(const child of root.children)visit(child);
  for(const meshes of buckets.values()){
    if(meshes.length<2)continue;const parts=[],useColors=vertexMaterial(meshes[0].material);let count=0;
    for(const m of meshes){const p=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();p.applyMatrix4(inverse.clone().multiply(m.matrixWorld));parts.push({p,material:m.material});count+=p.attributes.position.count;}
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2),colors=useColors?new Float32Array(count*3):null;let offset=0;
    for(const {p,material:m} of parts){const n=p.attributes.position.count;positions.set(p.attributes.position.array,offset*3);if(p.attributes.normal)normals.set(p.attributes.normal.array,offset*3);if(p.attributes.uv)uvs.set(p.attributes.uv.array,offset*2);if(colors){const prior=m.vertexColors?p.attributes.color:null;for(let i=0;i<n;i++){colors[(offset+i)*3]=(prior?prior.getX(i):1)*m.color.r;colors[(offset+i)*3+1]=(prior?prior.getY(i):1)*m.color.g;colors[(offset+i)*3+2]=(prior?prior.getZ(i):1)*m.color.b;}}offset+=n;p.dispose();}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('normal',new THREE.BufferAttribute(normals,3));g.setAttribute('uv',new THREE.BufferAttribute(uvs,2));g.computeBoundingSphere();
    if(colors)g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const first=meshes[0].material,merged=new THREE.Mesh(g,colors?material(0xffffff,{roughness:first.roughness,metalness:first.metalness,side:first.side,flatShading:first.flatShading,vertexColors:true}):first);merged.castShadow=meshes[0].castShadow;merged.receiveShadow=meshes[0].receiveShadow;root.add(merged);
    for(const m of meshes)m.removeFromParent();
  }
  return root;
}

function windowFrame(parent,x,y,z,w=.65,h=.65){
  softBox(parent,w+.13,h+.13,.10,0xffeac0,x,y,z,.04);box(parent,w,h,.025,0x416f76,x,y,z+.062);
  box(parent,w-.1,.035,.03,0xb9e0cc,x,y+h*.27,z+.08);box(parent,.04,h,.04,0xffe8b5,x,y,z+.09);box(parent,w,.04,.04,0xffe8b5,x,y,z+.09);
}
function roofSeams(parent,w,d,h,y,color){
  for(const side of[-1,1])for(let z=-d/2+.32;z<d/2;z+=.78)rod(parent,[side*.04,y+h+.025,z],[side*w/2,y+.025,z],.022,color);
}

function roundCanvas(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
export function label(text,w=3.2,h=.86,opts={}){
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=180;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,transparent:true});
  const s=new THREE.Sprite(mat);s.scale.set(w,h,1);s.renderOrder=24;s.userData.last='';
  s.userData.setText=(next,overrides={})=>{
    const o={fill:'#fff7df',color:'#254c3e',border:'#e6d6ab',...opts,...overrides};const signature=JSON.stringify([next,o]);if(s.userData.last===signature)return;s.userData.last=signature;
    ctx.clearRect(0,0,640,180);ctx.shadowColor='rgba(30,55,32,.19)';ctx.shadowBlur=12;ctx.shadowOffsetY=8;
    roundCanvas(ctx,8,7,624,157,40);ctx.fillStyle=o.fill;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.lineWidth=4;ctx.strokeStyle=o.border;ctx.stroke();
    const lines=String(next).split('\n');ctx.textAlign='center';ctx.textBaseline='middle';
    if(lines.length>1){ctx.fillStyle=o.color;ctx.font='800 44px system-ui, sans-serif';ctx.fillText(lines[0],320,61,576);ctx.fillStyle=o.subColor||o.color;ctx.font='800 49px system-ui, sans-serif';ctx.fillText(lines[1],320,119,576);}
    else{ctx.fillStyle=o.color;ctx.font='900 53px system-ui, sans-serif';ctx.fillText(lines[0],320,86,576);}
    texture.needsUpdate=true;
  };s.userData.setText(text);return s;
}

// Compact drawn symbols replace the old name-and-instruction billboards.
// Textures repaint only when the displayed count or its state changes.
export function iconBadge(iconId,value='',w=2.0,h=.78,opts={}){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=160;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,transparent:true,toneMapped:false});
  const sprite=new THREE.Sprite(mat);sprite.scale.set(w,h,1);sprite.renderOrder=24;sprite.userData.last='';
  sprite.userData.setText=(next,overrides={})=>{
    const o={fill:'#fff0a0',color:'#66400c',border:'#f7a900',money:false,...opts,...overrides};
    const signature=JSON.stringify([iconId,next,o]);if(sprite.userData.last===signature)return;sprite.userData.last=signature;
    ctx.clearRect(0,0,384,160);ctx.shadowColor='rgba(59,48,10,.22)';ctx.shadowBlur=9;ctx.shadowOffsetY=5;
    roundCanvas(ctx,5,5,374,143,32);ctx.fillStyle=o.fill;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.lineWidth=5;ctx.strokeStyle=o.border;ctx.stroke();
    ctx.save();roundCanvas(ctx,13,12,358,126,26);ctx.clip();const gloss=ctx.createLinearGradient(0,12,0,140);gloss.addColorStop(0,'rgba(255,255,238,.5)');gloss.addColorStop(.43,'rgba(255,255,238,.06)');gloss.addColorStop(1,'rgba(143,86,11,.09)');ctx.fillStyle=gloss;ctx.fillRect(13,12,358,126);ctx.restore();
    drawFarmIcon(ctx,o.icon||iconId,o.compact?192:69,77,o.compact?98:91,o.color);
    if(o.compact){
      if(Number.isFinite(o.progress)){ctx.fillStyle=o.border;roundCanvas(ctx,56,126,272,10,5);ctx.fill();ctx.fillStyle=o.color;roundCanvas(ctx,56,126,Math.max(1,272*Math.max(0,Math.min(1,o.progress))),10,5);ctx.fill();}
    }else if(o.locked){drawFarmIcon(ctx,'lock',252,78,67,o.color);}
    else{
      if(o.money)drawFarmIcon(ctx,'coin',151,79,34,o.color);
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=o.color;ctx.font='900 '+(String(next).length>4?53:69)+'px system-ui, sans-serif';
      ctx.fillText(String(next),o.money?263:247,82,o.money?168:212);
    }
    texture.needsUpdate=true;
  };
  sprite.userData.setText(value);return sprite;
}

export function floorPad(parent,{x,z,price,id,kind}){
  const g=group(parent,x,.01,z),ownedMaterials=[];
  const own=mat=>(ownedMaterials.push(mat),mat);
  const glow=plate(g,3.1,3.1,own(new THREE.MeshBasicMaterial({color:0xffd425,transparent:true,opacity:.2,depthWrite:false,toneMapped:false})),0,0,.018,.45);
  const edge=softBox(g,2.55,.10,2.55,own(new THREE.MeshStandardMaterial({color:0xc48b19,roughness:.35,metalness:.15})),0,.005,0,.04);
  const base=softBox(g,2.31,.075,2.31,own(new THREE.MeshStandardMaterial({color:0xffbd16,emissive:0xffa000,emissiveIntensity:.13,metalness:.3,roughness:.2})),0,.06,0,.034);
  const rim=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(roundedShape(2.24,2.24,.2).getPoints(32).map(p=>new THREE.Vector3(p.x,.108,-p.y))),own(new THREE.LineBasicMaterial({color:0xfffaac,transparent:true,opacity:1,toneMapped:false})));
  g.add(rim);
  const sheen=plate(g,.24,2.05,own(new THREE.MeshBasicMaterial({color:0xfffbd2,transparent:true,opacity:.28,depthWrite:false,toneMapped:false})),0,0,.112,.05);
  const fill=mesh(new THREE.RingGeometry(.8,.94,48,1,Math.PI/2,Math.PI*2),own(new THREE.MeshBasicMaterial({color:0x52a557,side:THREE.DoubleSide,toneMapped:false})),g,0,.12,0);fill.rotation.x=-Math.PI/2;fill.geometry.setDrawRange(0,0);fill.castShadow=false;
  const progressTrack=plate(g,1.94,.25,own(new THREE.MeshBasicMaterial({color:0x8e6415,transparent:true,opacity:.72,toneMapped:false,depthWrite:false})),0,.89,.125,.07);
  const progressGeometry=geo('pad-progress-bar-left',()=>{const shape=new THREE.ShapeGeometry(roundedShape(1.78,.13,.04),3);shape.translate(.89,0,0);return shape;});
  const progressBar=mesh(progressGeometry,own(new THREE.MeshBasicMaterial({color:0xfff8c7,toneMapped:false,depthWrite:false})),g,-.89,.134,.89);progressBar.rotation.x=-Math.PI/2;progressBar.castShadow=false;progressBar.receiveShadow=false;progressBar.scale.x=.001;
  progressTrack.visible=false;progressBar.visible=false;
  const l=iconBadge(id,String(price),2.12,.87,{money:true});l.position.set(0,1.0,0);g.add(l);
  const glints=[];
  for(let i=0;i<3;i++){
    const spark=mesh(geo('pad-glint',()=>new THREE.OctahedronGeometry(.1,0)),own(new THREE.MeshBasicMaterial({color:0xfff7c2,transparent:true,opacity:.9,toneMapped:false})),g);
    spark.castShadow=false;spark.receiveShadow=false;spark.visible=false;glints.push(spark);
  }
  return{g,base,edge,rim,glow,sheen,glints,fill,progressTrack,progressBar,label:l,id,kind,ownedMaterials};
}
export function zone(parent,x,z,txt,color=0x77baad,iconId='sell'){
  const g=group(parent,x,0,z);plate(g,2.1,1.8,color,0,0,.04,.32);
  const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(roundedShape(2.02,1.72,.29).getPoints(24).map(p=>new THREE.Vector3(p.x,.055,-p.y))),new THREE.LineBasicMaterial({color:0xfff9df,transparent:true,opacity:.85}));g.add(border);
  const l=iconBadge(iconId,txt,iconId==='sell'?1.95:1.8,.73,{fill:iconId==='coin'?'#ffdf65':'#f8f4d8',color:'#376044',border:iconId==='coin'?'#f3ae1f':'#a9cc86'});l.position.y=.72;g.add(l);return{g,label:l};
}

export function tree(parent,x,z,scale=1,color=C.grassDark){const g=group(parent,x,0,z);g.scale.setScalar(scale);cylinder(g,.13,.23,1.65,C.wood,0,.82,0,9);rod(g,[0,.75,0],[.48,1.7,0],.08,C.wood);sphere(g,1.08,color,0,2.05,0,1,1.02,.95);sphere(g,.73,0x74ad4f,-.65,1.77,.1);sphere(g,.82,0x8bc760,.5,2.12,-.15);sphere(g,.49,0xa5d778,.15,2.68,-.08,1,.6,.9);return g;}
export function pine(parent,x,z,s=1){const g=group(parent,x,0,z);g.scale.setScalar(s);cylinder(g,.16,.2,1.5,C.wood,0,.75,0,7);cone(g,1.12,1.9,0x4c8856,0,1.5,0);cone(g,.88,1.6,0x5d9d5d,0,2.3,0);cone(g,.59,1.4,0x77b26a,0,2.9,0);return g;}
export function flower(parent,x,z,color=0xffe5a1,s=1){const g=group(parent,x,.03,z);g.scale.setScalar(s);cylinder(g,.022,.025,.3,0x5e9452,0,.15,0,5);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;sphere(g,.085,color,Math.cos(a)*.075,.35,Math.sin(a)*.075,1,.5,1);}sphere(g,.045,0xf3bf45,0,.37,0);return g;}
export function fence(parent,x1,z1,x2,z2){const length=Math.hypot(x2-x1,z2-z1),n=Math.ceil(length/1.2);for(let i=0;i<=n;i++){const t=i/n,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;box(parent,.15,.85,.15,0xf6e4bb,x,.43,z);cone(parent,.13,.17,0xfff0d0,x,.91,z,4);}rod(parent,[x1,.35,z1],[x2,.35,z2],.065,0xebd7aa);rod(parent,[x1,.67,z1],[x2,.67,z2],.065,0xf4e4bc);}

export function roof(parent,w,d,h,color,x=0,y=0,z=0){const geometry=geo(`roof${w},${d},${h}`,()=>{const shape=new THREE.Shape();shape.moveTo(-w/2+.025,0);shape.lineTo(0,h-.025);shape.lineTo(w/2-.025,0);shape.closePath();return new THREE.ExtrudeGeometry(shape,{depth:d-.05,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:1});});return mesh(geometry,color,parent,x,y,z-d/2+.025);}
export function barn(parent){
  const g=group(parent,-1,0,-13);softBox(g,6,3,3.6,0xe8cfa0,0,1.5,0,.08);box(g,5.9,2.7,.08,0xc96743,0,1.5,1.84);
  roof(g,6.7,4.25,1.6,0xb4543f,0,3,0);roofSeams(g,6.7,4.25,1.6,3,0xd78256);softBox(g,6.9,.12,.14,0xf2c18c,0,3,2.14,.04);
  for(let i=-2.7;i<=2.7;i+=.55)box(g,.04,2.8,.06,0xe28c5b,i,1.5,1.9);
  softBox(g,2.35,2.5,.13,0x6d4935,0,1.25,1.95,.035);for(let x of[-1.23,0,1.23])box(g,.09,2.6,.15,0xffebbf,x,1.3,2.03);box(g,2.6,.1,.16,0xffebbf,0,2.6,2.03);
  rod(g,[-1.1,.14,2.05],[1.1,2.45,2.05],.045,0xf1d7a6);rod(g,[1.1,.14,2.05],[-1.1,2.45,2.05],.045,0xf1d7a6);
  for(const x of[-2.15,2.15])windowFrame(g,x,1.88,1.93,.68,.78);
  for(const x of[-.17,.17])sphere(g,.055,0xeac16d,x,1.28,2.14,1,1,.6);
  cylinder(g,.035,.035,1.3,C.wood,0,5.05,0);box(g,1,.05,.07,0xf4d179,0,5.5,0);cone(g,.16,.4,0xf1c45b,.6,5.5,0,3).rotation.z=-Math.PI/2;
  return bakeStaticParts(g);
}

export function market(parent){const g=group(parent,0,0,7);softBox(g,5.1,.9,1.5,0x6caa8e,0,.5,0,.06);softBox(g,5.4,.17,1.8,0xe9bf7d,0,1.03,0,.05);for(let x of[-2.3,2.3])for(let z of[-.65,.65])box(g,.13,2.8,.13,0xffe4ac,x,1.4,z);
  for(let x=-2.3;x<2.4;x+=.47)box(g,.025,.64,.03,0x4e8a72,x,.51,.77);box(g,5.1,.10,.06,0xb8d2a5,0,.17,.8);
  const awning=group(g,0,2.9,0);for(let i=0;i<10;i++){const x=-2.7+i*.6,color=i%2?0xffdfab:0xd96142;const panel=softBox(awning,.59,.12,2.5,color,x,.05,0,.022);panel.rotation.x=.08;const scallop=cylinder(awning,.295,.295,.09,color,x,-.07,1.25,12);scallop.rotation.x=Math.PI/2;scallop.scale.y=.5;}
  box(g,5.7,.18,.15,0x8a5a3a,0,2.87,-1.16);box(g,5.7,.055,.055,0xffefc0,0,2.83,1.31);
  for(let i=-1;i<=1;i++){const crate=crateGoods(['apple','wheat','egg'][i+1],.85);crate.position.set(i*1.35,1.2,0);g.add(crate);}softBox(g,.65,.45,.5,C.teal,1.8,1.42,.35,.08);softBox(g,.5,.35,.08,0x214d40,1.8,1.58,.6,.035);box(g,.29,.055,.025,0xa7d7a8,1.8,1.64,.65);
  return bakeStaticParts(g);
}

export function crateGoods(type='wheat',scale=1,product=null){
  const originalType=type,model=product?.model||type,variant=!!product&&originalType!==model;
  type=['wheat','grain','egg','flour','apple','milk','cheese','butter','bread','juice'].includes(model)?model:'custom';
  const key=type==='custom'||variant?`${originalType}:${model}:${product?.color||'#82ab73'}`:type;
  if(!goodsModels.has(key)){
    const g=new THREE.Group();
    if(type==='wheat'){
      softBox(g,.72,.23,.5,0xe4ad35,0,.115,0,.045);for(const x of[-.19,.19])softBox(g,.075,.255,.52,0xa77831,x,.115,0,.012);
      for(let i=0;i<5;i++)box(g,.018,.012,.44,0xffd975,-.29+i*.145,.237,0);
      for(let i=0;i<3;i++)box(g,.5,.014,.012,0xd0902c,0,.065+i*.055,.253);
    }else if(type==='egg'){
      softBox(g,.72,.11,.52,0xb68c54,0,.055,0,.03);for(let x of[-.22,0,.22])for(let z of[-.13,.13]){sphere(g,.112,0xffefcf,x,.18,z,.87,1.22,.87);sphere(g,.036,0xffffff,x-.025,.235,z+.05,1,.7,.4);}
    }else if(type==='flour'){
      sphere(g,.3,0xf2ddb0,0,.22,0,1.1,.95,.9);softBox(g,.26,.20,.025,0xb88c54,0,.24,.263,.015);box(g,.15,.02,.012,0xffe5ac,0,.24,.282);cylinder(g,.105,.155,.08,0xc3a777,0,.46,0,10);box(g,.22,.018,.035,0x8e6e43,0,.43,.05);
    }else if(type==='apple'){
      softBox(g,.7,.2,.5,0xab7441,0,.1,0,.027);for(const x of[-.32,.32])box(g,.045,.24,.51,0xd49e5f,x,.11,0);
      for(let x of[-.22,0,.22])for(let z of[-.12,.12]){sphere(g,.12,material(0xd94e36,{roughness:.38}),x,.24,z);rod(g,[x,.33,z],[x+.018,.39,z],.014,0x6e6134);sphere(g,.045,0x79a746,x+.045,.36,z,1,.25,.5);}
    }else if(type==='grain'){
      sphere(g,.3,0xccab6f,0,.22,0,1.1,.88,.9);cylinder(g,.19,.22,.06,0x936b3c,0,.43,0,10);
      for(let i=0;i<7;i++){const a=i*2.4;sphere(g,.044,0xf4d375,Math.cos(a)*.13,.46+Math.sin(i)*.012,Math.sin(a)*.13,1,.52,1.3);}
      softBox(g,.24,.19,.026,0x77905a,0,.24,.27,.013);box(g,.025,.14,.018,0xffedbc,0,.24,.292);
    }else if(type==='cheese'){
      cylinder(g,.31,.32,.22,0xf3be44,0,.11,0,16);cylinder(g,.31,.31,.025,0xffdd73,0,.23,0,16);
      for(const [x,z,r]of[[-.13,.07,.045],[.10,.10,.055],[.12,-.13,.035]])cylinder(g,r,r,.004,0xd49a32,x,.245,z,8);
      sphere(g,.045,0xd49a32,-.03,.11,.316,1,1,.14);sphere(g,.035,0xd49a32,.17,.15,.27,1,1,.14);
    }else if(type==='butter'){
      softBox(g,.72,.055,.48,0xf4edce,0,.028,0,.025);softBox(g,.56,.21,.34,0xffd668,0,.16,0,.045);
      box(g,.57,.026,.11,0xfff1ac,0,.265,-.09);softBox(g,.18,.225,.36,0xf7f2d7,-.19,.16,0,.025);box(g,.075,.025,.36,0x77a88a,-.19,.28,0);
    }else if(type==='bread'){
      softBox(g,.72,.07,.49,0x9e6e3f,0,.035,0,.025);sphere(g,.3,0xc87d38,0,.19,0,1.08,.68,.78);sphere(g,.275,0xeeb869,-.015,.235,0,1.06,.49,.77);
      for(const x of[-.14,0,.14])rod(g,[x-.035,.34,-.08],[x+.035,.34,.08],.016,0xffdf9c);
    }else if(type==='juice'){
      softBox(g,.72,.075,.5,0x73a386,0,.035,0,.02);
      for(const x of[-.17,.17]){cylinder(g,.125,.13,.29,0xe8b85c,x,.22,0,12);cylinder(g,.09,.125,.055,0xf5d68d,x,.39,0,12);cylinder(g,.095,.095,.065,0x6c9368,x,.45,0,10);cylinder(g,.132,.132,.10,0xf6e7b4,x,.23,0,12);sphere(g,.045,0xc96741,x,.23,.133,1,1,.15);}
    }else if(type==='milk'){
      softBox(g,.72,.11,.5,0x4b9581,0,.055,0,.025);for(const x of[-.32,.32])softBox(g,.05,.17,.5,0x79b7a0,x,.1,0,.012);
      for(const x of[-.17,.17]){
        cylinder(g,.124,.132,.245,0xf5ecd3,x,.225,0,12);cylinder(g,.134,.134,.035,0x95b8ac,x,.115,0,12);
        cylinder(g,.089,.123,.065,0xd3ded0,x,.38,0,12);cylinder(g,.115,.115,.035,0x4e8e7e,x,.425,0,12);cylinder(g,.035,.045,.025,0x91bbac,x,.455,0,10);
        cylinder(g,.127,.127,.055,0x5c9e8c,x,.22,0,12);
        for(const side of[-1,1]){rod(g,[x+side*.125,.245,0],[x+side*.155,.32,0],.011,0x799c91);rod(g,[x+side*.155,.32,0],[x+side*.105,.35,0],.011,0x799c91);}
        sphere(g,.033,0xfff7e1,x,.225,.129,1,1.2,.13);cone(g,.026,.045,0xfff7e1,x,.26,.13,7);
      }
    }else{softBox(g,.65,.11,.4,0x9d7c4e,0,.055,0,.03);softBox(g,.46,.25,.29,product?.color||0x82ab73,0,.21,0,.05);softBox(g,.19,.11,.018,0xfff1cb,0,.23,.155,.018);}
    if(variant)softBox(g,.18,.085,.025,product.color||0x82ab73,0,.13,.285,.012);
    bakeStaticParts(g);g.traverse(o=>{if(o.geometry)o.geometry.userData.farmShared=true;});goodsModels.set(key,g);
  }
  const result=goodsModels.get(key).clone(true);result.scale.setScalar(scale);return result;
}

// A readable family of craft buildings. Each workshop keeps an articulated
// working part and a physical product sign, instead of relying on a billboard.
export function workshop(parent,good='bread',product={}){
  const g=group(parent),kind=product?.model||good,colour=kind==='juice'?0x9bb366:kind==='cheese'||kind==='butter'?0x7db4a0:0xd6a06f;
  plate(g,5,4,0xb5be8b,0,0,.04,.3);softBox(g,4.4,2.25,3.15,0xf0dcaf,0,1.16,0,.075);box(g,4.42,.13,3.17,colour,0,.34,0);
  roof(g,5.0,3.8,1.05,kind==='juice'?0x6b9366:kind==='cheese'||kind==='butter'?0x4e9382:0xb96e4d,0,2.32,0);roofSeams(g,5.0,3.8,1.05,2.32,0xe8c388);
  for(const x of[-2.13,2.13])softBox(g,.12,2.25,.12,0xffedc3,x,1.18,1.61,.025);
  windowFrame(g,1.3,1.43,1.61,.8,.85);
  const machine=group(g,-.8,0,1.61),moving=group(machine,0,.92,.25),smoke=[];
  if(kind==='bread'){
    softBox(machine,1.65,1.32,.7,0xaf6d48,0,.68,.1,.11);softBox(machine,1.18,.82,.08,0x694633,0,.58,.48,.12);softBox(machine,.94,.47,.025,0xf3ad50,0,.47,.528,.1);
    for(let i=0;i<3;i++)sphere(moving,.12,0xffdc7e,-.3+i*.3,-.46,.29,.65,1.6,.4);
    softBox(g,.63,1.5,.65,0xb57c59,-1.35,3.3,-.5,.04);box(g,.77,.15,.78,0xe3b881,-1.35,4.07,-.5);
    for(let i=0;i<3;i++){const puff=sphere(g,.2,0xfff0ce,-1.35,4.4+i*.3,-.5,1.2,.8,1);puff.material=new THREE.MeshStandardMaterial({color:0xfff5df,transparent:true,opacity:.35,depthWrite:false});puff.castShadow=false;smoke.push(puff);}
  }else if(kind==='juice'){
    for(const x of[-.63,.63])softBox(machine,.16,1.65,.19,0x95663c,x,.82,.13,.025);box(machine,1.6,.19,.3,0xc79558,0,1.66,.13);cylinder(machine,.52,.46,.65,0xb88645,0,.43,.16,12);
    cylinder(moving,.43,.43,.12,0x69533a,0,0,0,12);cylinder(moving,.06,.06,1.1,0xcab582,0,.45,0,8);
    for(let i=0;i<4;i++)sphere(machine,.105,0xd66343,Math.sin(i*2.3)*.27,.8,Math.cos(i*2.3)*.27+.16);
  }else if(kind==='butter'){
    cylinder(machine,.47,.40,1.1,0xc3995c,0,.57,.14,14);for(const y of[.2,.9])cylinder(machine,.48,.48,.08,0x758d78,0,y,.14,14);
    cylinder(moving,.055,.055,1.2,0x805f38,0,.38,0,8);box(moving,.65,.09,.14,0xd5b17b,0,.95,0);
  }else{
    cylinder(machine,.62,.51,.82,0x9cb9a5,0,.46,.17,18);cylinder(machine,.59,.59,.045,0xf4e6bf,0,.89,.17,18);
    rod(moving,[-.42,0,0],[.42,0,0],.055,0x876441);cylinder(moving,.055,.055,.72,0xa88251,0,.15,0,8);softBox(machine,1.45,.12,.6,0xd6b47e,0,.16,.15,.03);
  }
  const display=crateGoods(good,1.15,product);display.position.set(1.21,.12,1.89);g.add(display);
  const sign=iconBadge(['cheese','butter','bread','juice'].includes(kind)?kind:'workshop','',1.0,.72,{fill:'#fff2c9',border:'#d5b16e',color:'#5d7654',compact:true});sign.position.set(.15,3.1,1.15);g.add(sign);
  bakeStaticParts(g,[machine,...smoke,sign]);bakeStaticParts(machine,[moving]);bakeStaticParts(moving);
  return {g,moving,kind,smoke};
}

export function person({color=C.blue,skin=0xeab78a,hat=true,apron=true,scale=1}={}){
  const root=new THREE.Group(),body=group(root);root.scale.setScalar(scale);
  const torso=mesh(geo('person-torso',()=>new THREE.CapsuleGeometry(.29,.36,4,10)),color,body,0,1.01,0);torso.scale.set(1.05,1,.82);
  if(apron){softBox(body,.4,.46,.1,0x386c80,0,1.0,.24,.035);softBox(body,.27,.18,.035,0x6eacb4,0,.92,.31,.02);for(let x of[-.145,.145]){box(body,.055,.38,.055,0x78b8be,x,1.23,.23);sphere(body,.027,0xe7c06e,x,1.13,.287,1,1,.45);}box(body,.19,.016,.012,0xa0ced0,0,.97,.336);}
  const head=group(body,0,1.62,0);sphere(head,.31,skin,0,0,0,1,1.06,.93);sphere(head,.095,skin,0,-.025,.29,1,.78,.9);
  for(const x of[-.295,.295])sphere(head,.073,skin,x,-.01,-.005,.6,.95,.8);
  const eyes=group(head,0,.075,.265);
  for(const x of[-.112,.112]){sphere(eyes,.051,0xfff9e9,x,0,0,.9,1.13,.43);sphere(eyes,.027,0x273a30,x,.003,.022,.9,1.2,.45);sphere(eyes,.009,0xffffff,x-.009,.015,.033,1,1,.6);sphere(head,.05,0xde9278,x*1.6,-.085,.235,1,.55,.3);rod(head,[x-.045,.165,.24],[x+.045,.17,.24],.014,0x74513d);}
  rod(head,[-.055,-.13,.271],[0,-.15,.282],.013,0xa6634d);rod(head,[0,-.15,.282],[.055,-.13,.271],.013,0xa6634d);
  if(hat){cylinder(head,.47,.47,.065,0xe3b760,0,.30,0,18);cylinder(head,.445,.445,.025,0xffdd91,0,.34,0,18);cylinder(head,.27,.32,.24,0xf4d185,0,.42,0,14);cylinder(head,.284,.306,.065,0x94734c,0,.355,0,14);}
  else{sphere(head,.31,0x704c34,0,.17,-.035,1,.61,1);sphere(head,.17,0x815838,-.15,.20,.14,1,.55,.7);}
  const armL=group(body,-.37,1.24,0),armR=group(body,.37,1.24,0);
  for(const [p,sign]of[[armL,-1],[armR,1]]){mesh(geo('person-arm',()=>new THREE.CapsuleGeometry(.085,.32,3,8)),skin,p,0,-.18,0);softBox(p,.18,.21,.2,color,0,-.06,0,.035);sphere(p,.10,skin,0,-.43,.015,1,.9,1);p.rotation.z=sign*.08;}
  const legL=group(body,-.15,.7,0),legR=group(body,.15,.7,0);for(const p of[legL,legR]){mesh(geo('person-leg',()=>new THREE.CapsuleGeometry(.115,.28,3,8)),0x34596b,p,0,-.2,0);softBox(p,.25,.16,.37,0x73503b,0,-.57,.08,.04);box(p,.25,.035,.37,0x4c4030,0,-.645,.08);}
  const bag=group(body,0,1.0,-.34);softBox(bag,.68,.45,.28,0xb5834b,0,.1,-.03,.04);softBox(bag,.72,.08,.32,0xe4b96f,0,.35,-.03,.023);for(const y of[-.02,.11,.23])box(bag,.65,.024,.015,0xd4a260,0,y,-.18);
  const stack=group(bag,0,.4,-.05);const shadow=mesh(geo('person-shadow',()=>new THREE.CircleGeometry(.48,24)),personShadowMaterial,root,0,.035,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=false;
  bakeStaticParts(body,[head,armL,armR,legL,legR,bag]);bakeStaticParts(head,[eyes]);bakeStaticParts(eyes);for(const p of[armL,armR,legL,legR])bakeStaticParts(p);bakeStaticParts(bag,[stack]);
  return{root,body,head,eyes,armL,armR,legL,legR,bag,stack,signature:'',phase:Math.random()*5};
}

export function hen(parent,x,z,scale=1){const g=group(parent,x,.05,z);g.scale.setScalar(scale);sphere(g,.27,0xffefd0,0,.35,0,1,.9,1.25);sphere(g,.18,0xffffff,0,.6,.19);cone(g,.075,.18,0xe6a02e,0,.58,.37,5).rotation.x=Math.PI/2;sphere(g,.08,0xcd4f39,0,.79,.19,1,.7,1);sphere(g,.055,0xd96542,0,.48,.31,.65,1,1);for(let x of[-.08,.08]){cylinder(g,.018,.018,.2,0xbd8954,x,.13,.04,5);sphere(g,.021,0x30382c,x,.64,.34);sphere(g,.007,0xffffff,x-.005,.647,.356);}for(const x of[-.2,.2])sphere(g,.15,0xead7ad,x,.34,0,.35,.7,1.4);const tail=cone(g,.15,.35,0xfff5da,0,.45,-.27,7);tail.rotation.x=-.7;return bakeStaticParts(g);}

// Friendly dairy cows face local +X. The small articulated groups let the
// renderer add head bobs, tail swishes and an occasional step without rebuilding.
export function cow(parent,x=0,z=0,scale=1,phase=0){
  const g=group(parent,x,.015,z);g.scale.setScalar(scale);
  const cream=0xfff0d4,patch=phase>1?0x5b4940:0x344b43;
  sphere(g,.63,cream,0,.98,0,1.25,.72,.73);sphere(g,.44,0xf4dfba,-.47,.95,0,.8,.88,1);
  for(const side of[-1,1]){sphere(g,.27,patch,-.25,1.05,side*.422,1.15,.85,.12);sphere(g,.17,patch,.35,1.15,side*.385,.83,1,.16);}
  sphere(g,.23,patch,-.05,1.41,.05,1.3,.12,.85);sphere(g,.23,0xe7b39a,.1,.59,0,1,.5,.85);
  for(const zz of[-.105,.105])for(const xx of[0,.17])cylinder(g,.025,.035,.09,0xd59b82,xx,.49,zz,7);
  const legs=[];
  for(const xx of[-.47,.45])for(const zz of[-.28,.28]){
    const leg=group(g,xx,.73,zz);cylinder(leg,.075,.085,.58,cream,0,-.27,0,9);softBox(leg,.18,.14,.18,patch,.025,-.59,0,.033);bakeStaticParts(leg);legs.push(leg);
  }
  const head=group(g,.79,1.16,0);sphere(head,.3,cream,0,0,0,.95,1.12,.9);sphere(head,.25,patch,-.03,.1,-.13,.75,.85,.52);
  const muzzle=group(head,.255,-.14,0);sphere(muzzle,.23,0xe7ac93,0,0,0,.95,.63,1.1);sphere(muzzle,.17,0xf4c4a7,.055,.025,0,.84,.54,1.3);
  for(const zz of[-.095,.095])sphere(muzzle,.031,0x9d6b59,.191,.04,zz,.25,.7,1.15);
  for(const side of[-1,1]){
    const ear=group(head,-.11,.11,side*.29);const e=sphere(ear,.14,patch,0,0,0,.82,.36,1.5);e.rotation.x=side*.18;sphere(ear,.1,0xe9bda3,.015,.025,side*.02,.72,.12,1.35);
    const horn=cone(head,.065,.22,0xe0c590,-.055,.34,side*.19,8);horn.rotation.x=side*.32;
    sphere(head,.055,0xfffcdf,.18,.10,side*.16,.55,1.06,.95);sphere(head,.031,0x2f4135,.211,.10,side*.163,.36,1.1,.85);sphere(head,.009,0xffffff,.222,.115,side*.15,.5,1,1);
  }
  const fringe=sphere(head,.16,cream,.045,.255,0,1,.37,1.4);fringe.rotation.z=.1;
  rod(head,[.14,-.28,-.055],[.19,-.29,0],.012,0xa36c57);rod(head,[.19,-.29,0],[.14,-.28,.055],.012,0xa36c57);
  const collar=cylinder(g,.285,.29,.10,0x408c78,.58,1.04,0,12);collar.rotation.z=Math.PI/2;sphere(g,.09,0xf3bd43,.63,.78,0,1,.95,.85);cylinder(g,.045,.06,.065,0xbb8335,.63,.69,0,8);
  const tail=group(g,-.76,1.15,0);rod(tail,[0,0,0],[-.13,-.34,.03],.034,cream);rod(tail,[-.13,-.34,.03],[-.20,-.51,.05],.03,cream);sphere(tail,.085,patch,-.20,-.54,.05,.65,1.3,.7);
  const shadow=mesh(geo('cow-shadow',()=>new THREE.CircleGeometry(.73,20)),personShadowMaterial,g,0,.025,0);shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.35,.64,1);shadow.castShadow=false;shadow.receiveShadow=false;
  bakeStaticParts(head);bakeStaticParts(tail);bakeStaticParts(g,[head,tail,...legs]);
  g.userData.head=head;g.userData.tail=tail;g.userData.legs=legs;g.userData.cowPhase=phase;
  return g;
}

// One 6 × 5 dairy plot: a cream-and-teal shed, two cows and a small paddock.
// It is centred at the origin; world renderers position and rotate the plot.
export function dairy(parent){
  const g=group(parent),cows=[];
  plate(g,6,5,0xb9bd83,0,0,.035,.35);plate(g,2.8,4.5,0x91b76b,1.38,0,.05,.25);
  const shed=group(g,-1.45,0,-.15);
  softBox(shed,2.6,2.3,3.7,0xf0dfb7,0,1.19,0,.065);softBox(shed,2.72,.18,3.82,0x759b83,0,.14,0,.045);
  for(let y=.5;y<2.3;y+=.38){box(shed,2.59,.023,.028,0xd6bd8c,0,y,1.87);box(shed,2.59,.023,.028,0xd6bd8c,0,y,-1.87);}
  for(const xx of[-1.23,1.23])for(const zz of[-1.81,1.81])softBox(shed,.13,2.27,.13,0xffeec7,xx,1.25,zz,.025);
  roof(shed,3.05,4.12,.9,0x448f7c,0,2.38,0);roofSeams(shed,3.05,4.12,.9,2.38,0x78b29b);
  for(const zz of[-2.08,2.08])box(shed,3.12,.12,.12,0xf3dca7,0,2.38,zz);
  softBox(shed,1.13,1.52,.10,0x477968,-.35,.94,1.91,.035);box(shed,1.24,.09,.14,0xffedc3,-.35,1.72,1.94);
  for(const xx of[-.95,.26])box(shed,.08,1.56,.14,0xffedc3,xx,.95,1.94);
  rod(shed,[-.88,.22,1.995],[.19,1.63,1.995],.035,0xc4d7a8);sphere(shed,.04,0xf3cf75,.04,.96,2.015,1,1,.6);
  windowFrame(shed,.85,1.37,1.91,.48,.6);
  const back=group(shed,0,0,-1.91);back.rotation.y=Math.PI;windowFrame(back,0,1.43,.02,.7,.7);
  const side=group(shed,1.32,0,-.65);side.rotation.y=Math.PI/2;windowFrame(side,0,1.48,0,.75,.64);
  softBox(shed,.87,.56,.065,0x367b69,0,2.04,1.96,.04);softBox(shed,.72,.42,.028,0xfff0ca,0,2.04,2.005,.025);
  softBox(shed,.18,.26,.018,0x529987,0,2.03,2.026,.027);box(shed,.10,.06,.022,0x529987,0,2.19,2.026);box(shed,.15,.035,.024,0x387766,0,2.24,2.03);box(shed,.18,.04,.025,0xffefc8,0,2.02,2.039);
  fence(g,.05,-2.25,2.82,-2.25);fence(g,2.82,-2.25,2.82,2.20);fence(g,.05,2.20,2.82,2.20);
  softBox(g,1.65,.32,.52,0x9d7446,1.15,.19,-1.84,.04);softBox(g,1.42,.08,.35,0xdac16e,1.15,.37,-1.84,.028);
  for(const xx of[.68,1.25,1.72]){const hay=crateGoods('wheat',.64);hay.position.set(xx,.36,-1.84);g.add(hay);}
  cylinder(g,.36,.30,.22,0x8ba693,2.23,.15,1.53,14);cylinder(g,.31,.31,.025,0x84c5c5,2.23,.268,1.53,14);
  const a=cow(g,1.03,-.48,.66,.4);a.rotation.y=-.13;cows.push(a);
  const b=cow(g,1.44,1.08,.60,2.8);b.rotation.y=Math.PI+.12;cows.push(b);
  const cans=crateGoods('milk',1.12);cans.position.set(-.55,.12,1.94);g.add(cans);
  bakeStaticParts(g,cows);return {g,cows};
}

export function coop(parent){const g=group(parent,10,0,-7);plate(g,5.3,4.1,0xc6ae71,0,.2,.035,.5);for(let x of[-1.1,1.1])for(let z of[-.75,.75])box(g,.18,.7,.18,C.wood,x,.35,z);softBox(g,2.9,1.8,2.05,0xf1cd80,0,1.55,0,.065);roof(g,3.5,2.65,.9,0xc85c43,0,2.45,0);roofSeams(g,3.5,2.65,.9,2.45,0xe58a5f);
  for(const y of[.85,1.15,1.45,1.75,2.05,2.35])box(g,2.88,.022,.025,0xdab16e,0,y,1.038);
  softBox(g,.85,.9,.12,0x745137,0,1.1,1.08,.04);const ramp=softBox(g,.85,.12,1.7,0xb98a52,0,.59,1.7,.025);ramp.rotation.x=.5;for(let i=0;i<5;i++){const rung=box(g,.9,.06,.08,0xe9bd76,0,.94-i*.15,1.05+i*.3);rung.rotation.x=.5;}
  for(let x of[-.93,.93])windowFrame(g,x,1.85,1.07,.59,.61);
  const hens=[];for(let i=0;i<4;i++)hens.push(hen(g,-1.8+i*.95,1.7+Math.sin(i)*.5,.8));bakeStaticParts(g,hens);return{g,hens};}
export function mill(parent){const g=group(parent,-12,0,10);plate(g,5,3.6,0xa7b78d,0,0,.035,.45);softBox(g,3,2.7,2.2,0x579b83,0,1.4,0,.08);box(g,3.08,.18,2.28,0xd6dfa8,0,1.6,0);roof(g,3.8,2.8,1.1,0xd3914b,0,2.8,0);roofSeams(g,3.8,2.8,1.1,2.8,0xefbc73);
  cylinder(g,.22,.32,1.65,0xa95c42,-.95,3.45,-.2,10);cylinder(g,.34,.36,.13,0xd18b60,-.95,4.22,-.2,10);cone(g,.39,.2,0xf0cc92,-.95,4.32,-.2,10);
  const wheel=group(g,1.85,1.4,.2);mesh(geo('mill-wheel-rim',()=>new THREE.TorusGeometry(.98,.12,7,20)),0x895834,wheel);mesh(geo('mill-wheel-inner',()=>new THREE.TorusGeometry(.78,.045,5,20)),0xdeb371,wheel,0,0,.045);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(wheel,[0,0,0],[Math.cos(a)*1.05,Math.sin(a)*1.05,0],.065,0xe6bb7b);}cylinder(wheel,.20,.20,.25,0xae8453,0,0,0).rotation.x=Math.PI/2;sphere(wheel,.10,0xf0d295,0,0,.15,1,1,.45);bakeStaticParts(wheel);
  softBox(g,1.05,1.05,.08,0x305e51,-.5,.95,1.15,.035);box(g,1.18,.08,.13,0xcee2aa,-.5,1.5,1.18);windowFrame(g,.75,2.13,1.13,.62,.62);
  const sack=crateGoods('flour',1.12);sack.position.set(.72,.12,1.18);g.add(sack);bakeStaticParts(g,[wheel]);return{g,wheel};}
export function blueprint(parent,x,z,w,d,caption){const g=group(parent,x,.04,z);plate(g,w+1,d+1,0x9abd8b,0,0,.02,.5,{transparent:true,opacity:.55,depthWrite:false});const edges=new THREE.EdgesGeometry(new THREE.BoxGeometry(w,2,d));const lines=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:0xf4edba,transparent:true,opacity:.7}));lines.position.y=1;g.add(lines);for(let i=-w/2;i<=w/2;i+=1)box(g,.015,.015,d,0xb8d0a0,i,.03,0);return g;}
