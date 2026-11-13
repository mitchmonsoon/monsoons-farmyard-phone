import * as THREE from './vendor/three.module.js';
import {C,material,mesh,box,sphere,cylinder,cone,group,rod,plate,roundedShape,label,floorPad,zone,tree,pine,flower,fence,barn,market,crateGoods,person,hen,coop,mill,blueprint,bakeStaticParts} from './art.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fract=x=>x-Math.floor(x);
const rand=i=>fract(Math.sin(i*127.1+31.7)*43758.5453);
const temp=new THREE.Object3D(),tempColor=new THREE.Color();
const CAMERA_ANGLE=Math.atan2(24,30),CAMERA_ELEVATION=Math.atan2(35,Math.hypot(24,30)),CAMERA_DISTANCE=Math.hypot(24,35,30);
function disposeOwned(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry&&!o.geometry.userData.farmShared)geometries.add(o.geometry);for(const m of(o.material?(Array.isArray(o.material)?o.material:[o.material]):[]))if(!m.userData.farmShared)materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}}

export class FarmRenderer {
  constructor(container,game){
    if(!container)throw new Error('The farm view is missing.');
    this.container=container;this.game=game;this.elapsed=0;this.zoom=1;this.follow=true;this.angle=CAMERA_ANGLE;this.elevation=CAMERA_ELEVATION;this.characters=new Map();this.padViews=new Map();this.effects=[];this.appleViews=new Map();this.lastCropCount=-1;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xadd1c0);this.scene.fog=new THREE.Fog(0xadd1c0,85,155);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.07;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.canvas=this.renderer.domElement;this.canvas.className='farm-canvas';this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Monsoons Farmyard game. Use WASD or arrow keys to walk.');this.canvas.style.cssText='display:block;width:100%;height:100%;outline:none;touch-action:none;';container.appendChild(this.canvas);
    this.camera=new THREE.OrthographicCamera(-25,25,16,-16,.1,180);this.cameraOffset=new THREE.Vector3(24,35,30);this.focus=new THREE.Vector3(-1,0,1);this.camera.position.copy(this.focus).add(this.cameraOffset);this.camera.lookAt(this.focus);
    this.raycaster=new THREE.Raycaster();this.groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.scene.add(new THREE.HemisphereLight(0xfff0cd,0x5d816b,1.65));this.scene.add(new THREE.AmbientLight(0xffeac7,.18));
    const sun=new THREE.DirectionalLight(0xffe7bc,3.0);sun.position.set(-22,39,12);sun.castShadow=true;const shadowSize=(window.innerWidth||1280)<760?1024:2048;sun.shadow.mapSize.set(shadowSize,shadowSize);Object.assign(sun.shadow.camera,{left:-33,right:33,top:32,bottom:-32,near:1,far:100});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;sun.shadow.radius=3;this.scene.add(sun);
    const fill=new THREE.DirectionalLight(0xb3d8ed,.65);fill.position.set(22,15,-15);this.scene.add(fill);
    this.world=new THREE.Group();this.scene.add(this.world);
    this.buildWorld();this.batchStaticScenery();this.buildCrops();this.buildInteractions();
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resize();
  }

  buildWorld(){
    const water=mesh(new THREE.PlaneGeometry(250,250),material(0xadd1c0,{roughness:1}),this.world,0,-1.0,0);water.rotation.x=-Math.PI/2;water.castShadow=false;
    const island=mesh(new THREE.ExtrudeGeometry(roundedShape(43,36,3),{depth:.95,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.28,bevelThickness:.16,curveSegments:5}),C.soil,this.world,0,-.95,0);island.rotation.x=-Math.PI/2;
    plate(this.world,43.1,36.1,C.grass,0,0,.045,3);
    plate(this.world,39,31,0x87bd63,0,0,.051,3);
    // These broad paths leave the whole farm open and easy to read.
    plate(this.world,36,3.8,C.sand,-.5,2.6,.07,1.8);
    plate(this.world,4,26,C.sand,0,-.5,.072,1.7);
    plate(this.world,3.3,12,C.sand,-16,-3.6,.073,1.5);
    plate(this.world,15,3.4,C.sand,10,-3.0,.074,1.4);
    plate(this.world,4.2,8.4,C.sand,-11,6.3,.075,1.4);
    plate(this.world,3.6,8,C.sand,8,6.3,.076,1.3);
    plate(this.world,9,4.4,C.sand,1.4,7.2,.075,1.4);
    plate(this.world,4,8.5,C.sand,4.2,10.5,.074,1.8);
    plate(this.world,10.3,8.5,0x79543b,-10,-6,.08,.5);
    for(let i=0;i<6;i++)plate(this.world,9.7,.86,i%2?0x9b6d43:0x95633e,-10,-9.15+i*1.26,.085,.17);
    for(let x of[-15.2,-4.8])box(this.world,.16,.19,8.5,0xcaa16a,x,.15,-6);
    for(let z of[-10.3,-1.7])box(this.world,10.5,.19,.16,0xcaa16a,-10,.15,z);

    const pebbles=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.13,0),material(0xf3dfb1),55);for(let i=0;i<55;i++){temp.position.set(-17+rand(i)*34,.13,1+rand(i+300)*3.1);temp.rotation.set(rand(i)*2,rand(i+2)*6,0);temp.scale.set(.7+rand(i+7),.4,.5+rand(i+19));temp.updateMatrix();pebbles.setMatrixAt(i,temp.matrix);}pebbles.receiveShadow=true;this.world.add(pebbles);
    const patches=new THREE.InstancedMesh(new THREE.CircleGeometry(.21,5),material(0x78ad55),95);for(let i=0;i<95;i++){const x=-20+rand(i+20)*40,z=-16+rand(i+220)*32;temp.position.set(x,.069,z);temp.rotation.set(-Math.PI/2,0,rand(i+3)*6);temp.scale.set(.5+rand(i)*2,.5+rand(i+9)*1.2,1);temp.updateMatrix();patches.setMatrixAt(i,temp.matrix);}this.world.add(patches);
    barn(this.world);
    fence(this.world,-18.7,-13.1,-6.4,-13.1);fence(this.world,4.8,-14.7,18.4,-14.7);fence(this.world,-20.3,-11.7,-20.3,5);fence(this.world,-18,16,0,16);fence(this.world,14.5,15.8,20.1,15.8);
    for(const[x,z,s]of[[-18,-14,1.1],[-20,12,1.0],[-17.2,14.4,.7],[19,11.4,.92],[19,1.6,.75],[19.8,-3.8,.9],[-5.3,-15.1,.65]])tree(this.world,x,z,s);
    for(const[x,z,s]of[[-20,-6,.85],[18.4,-14.4,.8],[16.1,-16.2,1.1],[-16.4,16.1,.9]])pine(this.world,x,z,s);
    for(let i=0;i<14;i++){const x=-18.8+rand(i+900)*34,z=i%2?-15.6:15.1;if(Math.abs(x)<4)continue;flower(this.world,x,z,[0xffdf85,0xfff2dd,0xf4a4a7][i%3],.9+rand(i+1)*.6);}
    for(let i=0;i<9;i++){const x=-19+rand(i+900)*2,z=7+rand(i+99)*4;sphere(this.world,.32+rand(i)*.3,0x729e58,x,.22,z,1.4,.6,1);}
    this.buildPond();
    // A small wheelbarrow and tucked-away supplies make the farm feel lived in.
    const cart=group(this.world,-17.5,0,-.25);box(cart,1,.4,.65,0x658f86,0,.58,0);rod(cart,[-.45,.4,-.1],[-.65,.7,1.1],.045,C.wood);rod(cart,[.45,.4,-.1],[.65,.7,1.1],.045,C.wood);cylinder(cart,.25,.25,.12,0x665446,0,.27,-.49,12).rotation.z=Math.PI/2;
    const bales=group(this.world,-5.4,0,-11.9);for(let i=0;i<3;i++){const bale=crateGoods('wheat',1.5);bale.position.set(i%2*.95,Math.floor(i/2)*.38,0);bales.add(bale);}
    const mailbox=group(this.world,-3.8,0,12);box(mailbox,.13,1.2,.13,C.wood,0,.6,0);box(mailbox,.6,.4,.8,C.red,0,1.35,0);box(mailbox,.5,.05,.04,C.cream,0,1.35,.42);
    this.market=market(this.world);
    this.coop=coop(this.world);this.coopGhost=blueprint(this.world,10,-7,3.2,2.3,'A home for hens');
    this.mill=mill(this.world);this.millGhost=blueprint(this.world,-12,10,3.8,2.8,'Fresh flour, coming soon');
    this.orchardGhost=group(this.world,11,0,11);plate(this.orchardGhost,7.5,7.0,0xabc980,0,0,.08,.8,{transparent:true,opacity:.7});
  }

  buildPond(){
    this.pond=group(this.world,16,0,-10);const edge=mesh(new THREE.CylinderGeometry(2.35,2.4,.12,20),0xb7bc87,this.pond,0,.05,0);edge.scale.set(1.1,1,1.35);
    const surface=mesh(new THREE.CylinderGeometry(2.12,2.12,.045,32),material(0x74bdc2,{roughness:.24,metalness:.03}),this.pond,0,.135,0);surface.scale.set(1.1,1,1.35);surface.castShadow=false;
    this.ripples=[];for(let i=0;i<3;i++){const r=mesh(new THREE.RingGeometry(.35+i*.45,.37+i*.45,40),new THREE.MeshBasicMaterial({color:0xd8ede0,transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false}),this.pond,0,.163,0);r.rotation.x=-Math.PI/2;this.ripples.push(r);}
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const rock=sphere(this.pond,.33,0xa2ad8f,Math.cos(a)*2.3,.19,Math.sin(a)*2.9,1,.65,.9);}
    for(let i=0;i<6;i++){const x=-1.9+rand(i)*.6,z=1+rand(i+8)*1.4;rod(this.pond,[x,.1,z],[x+.08,.9+rand(i)*.4,z],.025,0x7c9f5c);cylinder(this.pond,.065,.065,.3,0x8d6a3f,x+.08,1+rand(i)*.4,z,5);}
    this.duck=group(this.pond,-.5,.15,.1);sphere(this.duck,.23,0xf7e7b1,0,.16,0,1,.7,1.5);sphere(this.duck,.15,0xf5edcc,0,.37,.22);cone(this.duck,.07,.2,0xe6a54d,0,.34,.4,5).rotation.x=Math.PI/2;
  }

  // Bake the static fences, scenery and buildings into material batches. This
  // leaves all gameplay objects and moving parts independent while substantially
  // reducing draw calls on integrated laptop graphics.
  batchStaticScenery(){
    this.scene.updateMatrixWorld(true);this.staticBatchGeometries=[];
    const excluded=new Set([this.coop.g,this.coopGhost,this.mill.g,this.millGhost,this.orchardGhost,this.pond]);
    const buckets=new Map();
    const visit=o=>{if(excluded.has(o))return;if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)&&!o.material.transparent){const key=o.material.uuid+'-'+o.castShadow+'-'+o.receiveShadow;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);}for(const child of o.children)visit(child);};
    visit(this.world);
    for(const meshes of buckets.values()){
      if(meshes.length<2)continue;const parts=[];let count=0;
      for(const m of meshes){const p=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();p.applyMatrix4(m.matrixWorld);parts.push(p);count+=p.attributes.position.count;}
      const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2),colors=meshes[0].material.vertexColors?new Float32Array(count*3):null;let offset=0;
      for(const p of parts){const n=p.attributes.position.count;positions.set(p.attributes.position.array,offset*3);if(p.attributes.normal)normals.set(p.attributes.normal.array,offset*3);if(p.attributes.uv)uvs.set(p.attributes.uv.array,offset*2);if(colors){if(p.attributes.color)colors.set(p.attributes.color.array,offset*3);else colors.fill(1,offset*3,(offset+n)*3);}offset+=n;p.dispose();}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.computeBoundingSphere();
      if(colors)geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
      const merged=new THREE.Mesh(geometry,meshes[0].material);merged.castShadow=meshes[0].castShadow;merged.receiveShadow=meshes[0].receiveShadow;merged.userData.staticBatch=true;this.world.add(merged);this.staticBatchGeometries.push(geometry);
      for(const m of meshes)m.parent.remove(m);
    }
  }

  buildCrops(){
    const limit=1200;
    this.wheatStems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.023,.033,1,5),material(0xffffff,{roughness:.82}),limit);this.wheatHeads=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,6),material(0xffffff,{roughness:.58}),limit);this.wheatLeaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(.12,.44),material(0xcab14c,{side:THREE.DoubleSide}),limit);
    this.wheatStems.count=this.wheatHeads.count=this.wheatLeaves.count=0;this.wheatHeads.castShadow=true;this.wheatStems.receiveShadow=true;
    this.wheatStems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.wheatHeads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.wheatLeaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.wheatStems.frustumCulled=this.wheatHeads.frustumCulled=this.wheatLeaves.frustumCulled=false;
    this.world.add(this.wheatStems,this.wheatHeads,this.wheatLeaves);
  }

  buildInteractions(){
    this.sellZone=zone(this.world,0,5,'SELL',0x72b8a0,'sell');
    this.coopInput=zone(this.world,7,-6,'0',0xb8ba70,'wheat');this.coopOutput=zone(this.world,12,-5,'0',0xcdb89c,'egg');
    this.millInput=zone(this.world,-14,8,'0',0xb8ba70,'wheat');this.millOutput=zone(this.world,-9,8,'0',0xc5c7aa,'flour');
    this.eggPile=group(this.world,12.7,.13,-5.35);this.flourPile=group(this.world,-8.2,.13,8.3);
    this.target=group(this.world);this.targetRing=mesh(new THREE.RingGeometry(1.12,1.23,48),new THREE.MeshBasicMaterial({color:0xffeaa1,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}),this.target,0,.11,0);this.targetRing.rotation.x=-Math.PI/2;
    this.targetArrow=group(this.target,0,2.7,0);cone(this.targetArrow,.26,.42,0xffde75,0,0,0,4).rotation.z=Math.PI;box(this.targetArrow,.16,.52,.16,0xffe7a3,0,.38,0);
  }

  updateCrops(state){
    const crops=state.crops||[];let k=0;
    for(let c=0;c<crops.length;c++){
      const crop=crops[c];if(crop.type==='apple'){this.updateApple(crop);continue;}
      const growth=clamp(Number(crop.growth)||0,0,1),g=.04+growth*.96;
      for(let j=0;j<6;j++){
        const angle=j*2.399,dist=j?(.16+rand(c*13+j)*.25):0,x=crop.x+Math.cos(angle)*dist,z=crop.z+Math.sin(angle)*dist;
        const wind=Math.sin(this.elapsed*1.5+crop.x*.3+crop.z*.2),lean=(wind*.055+Math.sin(this.elapsed*2.1+j+c*.7)*.018)*g,h=(.82+rand(c*7+j)*.25)*g;
        temp.position.set(x,.1+h/2,z);temp.rotation.set(lean,angle,lean*.7);temp.scale.set(1,h,1);temp.updateMatrix();this.wheatStems.setMatrixAt(k,temp.matrix);
        tempColor.setHex(growth>.72?0xc4a345:0x77a64a);this.wheatStems.setColorAt(k,tempColor);
        temp.position.set(x+lean*h,.12+h,z);temp.rotation.set(.1,angle,lean*2.4);temp.scale.set(.112*g,.245*g,.092*g);temp.updateMatrix();this.wheatHeads.setMatrixAt(k,temp.matrix);tempColor.setHex(growth>.82?(j%3?0xf0c54c:0xffda69):growth>.5?0xc8bc55:0x86b253);this.wheatHeads.setColorAt(k,tempColor);
        temp.position.set(x,.15+h*.6,z);temp.rotation.set(.2,angle,.65);temp.scale.set(g,g,g);temp.updateMatrix();this.wheatLeaves.setMatrixAt(k,temp.matrix);k++;
      }
    }
    for(const m of[this.wheatStems,this.wheatHeads,this.wheatLeaves]){m.count=k;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
    for(const [id,view]of this.appleViews){view.g.visible=crops.some(c=>c.id===id);}
  }

  updateApple(crop){
    let v=this.appleViews.get(crop.id);
    if(!v){const g=tree(this.world,crop.x,crop.z,.78,0x578e43);const apples=[];for(let i=0;i<6;i++){const a=i*2.399;apples.push(sphere(g,.14,material(0xde4c32,{roughness:.34}),Math.cos(a)*.87,1.9+Math.sin(i*1.7)*.55,Math.sin(a)*.87));}v={g,apples};this.appleViews.set(crop.id,v);}
    const growth=clamp(crop.growth||0,0,1);for(const apple of v.apples){apple.visible=growth>.15;apple.scale.setScalar(.2+growth*.8);}v.g.visible=true;
  }

  updateCharacter(id,data,kind='player'){
    let v=this.characters.get(id);
    if(!v){const colours=[0xd69767,0x8e9eba,0x78a994,0xd9b66a,0xbd88a0,0x6f9fa0];v=person({color:kind==='player'?0x628eae:kind==='farmhand'?0x9ba96a:kind==='runner'?0xca8b74:colours[Math.abs(Number(data.color)||id.length)%colours.length],skin:kind==='runner'?0xbb805c:0xedbe94,hat:kind!=='customer',apron:kind!=='customer',scale:kind==='player'?1.1:kind==='customer'?.92:1});this.world.add(v.root);this.characters.set(id,v);if(kind==='customer'){const mood=label('!',.65,.55,{fill:'#fff2cd',border:'#deaa6a'});mood.position.y=3.1;v.root.add(mood);v.moodLabel=mood;mood.visible=false;}if(kind==='farmhand'||kind==='runner'){const name=label(String(data.name||(kind==='farmhand'?'Bea':'Pip')).toUpperCase(),1.3,.38,{fill:'#fff3da',border:'#d2c9aa'});name.position.y=2.55;v.root.add(name);v.nameLabel=name;}}
    v.root.position.set(Number(data.x)||0,.11,Number(data.z)||0);const a=Number(data.angle)||0;let delta=a-v.root.rotation.y;delta=Math.atan2(Math.sin(delta),Math.cos(delta));v.root.rotation.y+=delta*.25;
    const moving=!!data.moving||(kind==='customer'&&data.phase!=='waiting'&&data.phase!=='queue');const stride=Math.sin(this.elapsed*12+v.phase)*(moving?1:0),carrying=Array.isArray(data.bag)&&data.bag.length>0;v.body.position.y=(moving?Math.abs(stride)*.065:Math.sin(this.elapsed*2+v.phase)*.012);v.body.rotation.z=moving?stride*.025:0;v.body.rotation.x=0;v.armL.rotation.x=stride*(carrying?.32:.5)-(carrying?.12:0);v.armR.rotation.x=-stride*(carrying?.32:.5)-(carrying?.12:0);v.legL.rotation.x=-stride*.6;v.legR.rotation.x=stride*.6;v.stack.rotation.z=Math.sin(this.elapsed*(moving?7:2)+v.phase)*(moving?.035:.008);
    if(v.head){v.head.rotation.y=moving?0:Math.sin(this.elapsed*.65+v.phase)*.07;v.head.rotation.z=moving?-stride*.018:Math.sin(this.elapsed*.8+v.phase)*.02;}
    if(v.eyes){const blink=(this.elapsed+v.phase*1.7)%4.8;v.eyes.scale.y=blink<.11?Math.max(.08,Math.abs(blink-.055)/.055):1;}
    const bag=Array.isArray(data.bag)&&data.bag.length?data.bag:kind==='customer'&&data.phase==='leaving'&&data.good?[data.good]:[];const signature=bag.join(',');if(v.signature!==signature){if(kind==='customer'&&bag.length)v.receivedAt=this.elapsed;v.signature=signature;disposeOwned(v.stack);while(v.stack.children.length)v.stack.remove(v.stack.children[0]);const visible=bag.slice(-12);let stackHeight=0;for(let i=0;i<visible.length;i++){const item=crateGoods(visible[i],.88,this.goods?.[visible[i]]);item.position.set(0,stackHeight,0);stackHeight+=['milk','juice'].includes(this.goods?.[visible[i]]?.model||visible[i])?.37:.225;item.rotation.y=(i%2)*.05;v.stack.add(item);}bakeStaticParts(v.stack);}
    const action=clamp(1-(this.elapsed-(v.actionAt??-10))/.42,0,1),reach=Math.sin(action*Math.PI);
    if(action>0){v.armR.rotation.x-=reach*.9;v.armL.rotation.x-=reach*.4;v.body.rotation.x=reach*(v.actionType==='harvest'?.12:-.035);if(v.head)v.head.rotation.x=reach*.12;}else if(v.head)v.head.rotation.x=0;
    if(kind==='customer'&&this.elapsed-(v.receivedAt??-10)<.8){v.armL.rotation.x=-1.1+Math.sin(this.elapsed*17)*.2;v.body.position.y+=Math.max(0,Math.sin((this.elapsed-v.receivedAt)/.8*Math.PI))*.055;}
    if(kind==='customer'&&v.moodLabel){
      const impatient=data.mood==='impatient',angry=data.mood==='angry';v.moodLabel.visible=impatient||angry;
      if(impatient||angry){v.moodLabel.userData.setText(angry?'!':'…',{fill:angry?'#ffd5bf':'#fff0b7',color:angry?'#a23d2a':'#957029',border:angry?'#d87557':'#d6ad51'});v.moodLabel.position.y=3.15+Math.sin(this.elapsed*(angry?8:5))*.08;v.legR.rotation.x+=Math.sin(this.elapsed*(angry?17:9))*(angry?.13:.08);v.armL.rotation.x-=angry?.6:.3;}
    }
    v.bag.visible=kind!=='customer'||bag.length>0;
    if(v.nameLabel)v.nameLabel.visible=Math.hypot(data.x-this.game.state.player.x,data.z-this.game.state.player.z)<4.5;
    return v;
  }

  updatePadViews(state){
    const pads=this.game.getPads()||[],seen=new Set();
    for(const p of pads){seen.add(p.id);let v=this.padViews.get(p.id);if(!v){v=floorPad(this.world,p);this.padViews.set(p.id,v);}const done=!p.available&&(p.unlocked||p.level>=p.maxLevel);v.g.visible=!done;if(done)continue;
      const afford=state.coins>=p.price&&p.available,disabled=!p.available,pulse=.5+.5*Math.sin(this.elapsed*2.4+p.x);
      v.label.userData.setText(String(p.price),{locked:disabled,fill:disabled?'#d9c495':afford?'#ffe778':'#ffe598',color:disabled?'#8c7953':'#654006',border:disabled?'#b49a61':afford?'#fff4ac':'#f5ac12'});
      v.label.position.y=1.0+(afford?Math.sin(this.elapsed*2+p.x)*.055:0);
      v.base.material.color.setHex(disabled?0xaa9054:afford?0xffbf12:0xf5b91d);v.base.material.emissiveIntensity=disabled?0:afford?.25+pulse*.16:.12;
      v.edge.material.color.setHex(disabled?0x86723d:0xce8007);v.rim.material.color.setHex(disabled?0xd7c286:0xfffaac);v.rim.material.opacity=disabled?.55:1;
      v.glow.material.opacity=disabled?.035:afford?.22+pulse*.13:.11;v.glow.scale.setScalar(afford?1+pulse*.035:1);
      v.sheen.visible=!disabled;v.sheen.position.x=Math.sin(this.elapsed*.85+p.x)*.88;v.sheen.material.opacity=afford?.31:.17;
      for(let i=0;i<v.glints.length;i++){const glint=v.glints[i],phase=fract(this.elapsed*.46+i*.34+p.x*.07);glint.visible=!disabled&&(afford||i===0);glint.position.set(Math.sin(i*2.2+p.x)*1.02,.18+phase*.85,Math.cos(i*2.2+p.x)*1.02);glint.scale.setScalar(Math.max(.05,Math.sin(Math.PI*phase))*(afford?1.05:.7));glint.rotation.y=this.elapsed+i;glint.material.opacity=Math.max(0,Math.sin(Math.PI*phase))*.85;}
      const progress=clamp(p.progress||0,0,1),active=state.activePad===p.id;v.fill.geometry.setDrawRange(0,Math.floor(progress*48)*6);if(v.progressTrack)v.progressTrack.visible=active;if(v.progressBar){v.progressBar.visible=active&&progress>0;v.progressBar.scale.x=progress;}v.g.position.set(p.x,.01,p.z);
    }
    for(const[id,v]of this.padViews)if(!seen.has(id))v.g.visible=false;
  }

  updatePile(pile,type,count){const n=Math.min(6,Math.max(0,Math.floor(count)));if(pile.userData.count===n&&pile.userData.good===type)return;pile.userData.count=n;pile.userData.good=type;disposeOwned(pile);while(pile.children.length)pile.remove(pile.children[0]);for(let i=0;i<n;i++){const item=crateGoods(type,.9,this.goods?.[type]);item.position.set(i%2*.5,Math.floor(i/2)*(['milk','juice'].includes(this.goods?.[type]?.model||type)?.38:.24),0);pile.add(item);}bakeStaticParts(pile);}

  updateMachines(state,dt){
    const co=state.machines.coop,mi=state.machines.mill;this.coop.g.visible=!!co.unlocked;this.coopGhost.visible=!co.unlocked;this.mill.g.visible=!!mi.unlocked;this.millGhost.visible=!mi.unlocked;this.orchardGhost.visible=!state.upgrades.orchard;
    this.coopInput.g.visible=this.coopOutput.g.visible=this.eggPile.visible=!!co.unlocked;this.millInput.g.visible=this.millOutput.g.visible=this.flourPile.visible=!!mi.unlocked;
    if(co.unlocked){this.coopInput.label.userData.setText(String(co.feed||0));this.coopOutput.label.userData.setText(String(co.stock||0));this.updatePile(this.eggPile,'egg',co.stock);for(let i=0;i<this.coop.hens.length;i++){const h=this.coop.hens[i];h.rotation.y=Math.sin(this.elapsed*.7+i*2)*.9;h.rotation.x=Math.max(0,Math.sin(this.elapsed*2.3+i*1.8))*.13;}}
    if(mi.unlocked){this.millInput.label.userData.setText(String(mi.feed||0));this.millOutput.label.userData.setText(String(mi.stock||0));this.updatePile(this.flourPile,'flour',mi.stock);this.mill.wheel.rotation.z-=dt*(mi.working||mi.progress>0?2.4:.18);}
  }

  effect(event){
    if(!event||!this.game?.state||!['move','harvest','deposit','cash','sell','purchase','milestone'].includes(event.type))return;const p=this.game.state.player;const x=Number.isFinite(event.x)?event.x:p.x,z=Number.isFinite(event.z)?event.z:p.z;
    // Busy helper networks share a fixed effects budget instead of allowing
    // every crop sale to accumulate another unbounded set of meshes.
    while(this.effects.length>158){const old=this.effects.shift();this.world.remove(old.mesh);disposeOwned(old.mesh);}
    if(event.type==='move'){
      const m=mesh(new THREE.RingGeometry(.3,.37,28),new THREE.MeshBasicMaterial({color:0xfff3c4,transparent:true,opacity:1,depthWrite:false,side:THREE.DoubleSide}),this.world,x,.15,z);m.rotation.x=-Math.PI/2;m.castShadow=false;this.effects.push({kind:'ring',mesh:m,life:0,duration:.65});return;
    }
    const celebration=event.type==='purchase'||event.type==='milestone';const n=celebration?18:event.type==='cash'?6:event.type==='harvest'?3:event.type==='sell'?1:2;
    if(event.type==='harvest'||event.type==='deposit'){
      let actor=null,distance=2.8;for(const view of this.characters.values()){const d=Math.hypot(view.root.position.x-x,view.root.position.z-z);if(d<distance){distance=d;actor=view;}}
      if(actor){actor.actionAt=this.elapsed;actor.actionType=event.type;const at=actor.root.position,from=event.type==='harvest'?new THREE.Vector3(x,.7,z):new THREE.Vector3(at.x,1.6,at.z),to=event.type==='harvest'?new THREE.Vector3(at.x,1.8,at.z):new THREE.Vector3(x,.45,z),item=crateGoods(event.good||'wheat',.55,this.goods?.[event.good]);item.position.copy(from);this.world.add(item);this.effects.push({kind:'produce',mesh:item,from,to,life:0,duration:.38});}
    }
    const colors=celebration?[0xffd25b,0xe58d6a,0xfff0ba,0x82bf9d]:event.type==='harvest'?[0xecc052,0xf2d377]:event.type==='cash'||event.type==='sell'?[0xf5c348,0xffe497]:[0xf6e6bc,0xfdf6dc];
    for(let i=0;i<n;i++){const mat=new THREE.MeshBasicMaterial({color:colors[i%colors.length],transparent:true,depthWrite:false});const geometry=event.type==='cash'||event.type==='sell'?new THREE.CylinderGeometry(.09,.09,.028,8):new THREE.BoxGeometry(celebration?.075:.04,celebration?.075:.14,.055);const m=mesh(geometry,mat,this.world,x,celebration?.5:.9,z);m.castShadow=false;m.receiveShadow=false;const a=Math.random()*Math.PI*2,s=celebration?1.9:1.0;this.effects.push({kind:'particle',mesh:m,v:new THREE.Vector3(Math.cos(a)*s*Math.random(),1.6+Math.random()*1.8,Math.sin(a)*s*Math.random()),life:0,duration:celebration?1.05:.62});}
    if(event.type==='cash'||event.type==='sell'||event.type==='purchase'||event.type==='milestone'){
      const txt=event.type==='cash'||event.type==='sell'?`+${event.amount||0}`:event.type==='purchase'?'✓':'★';const l=label(txt,1.6,.64,{fill:celebration?'#ffe57a':'#fff1ad',color:'#386249',border:'#efb42b'});l.position.set(x,2.8,z);this.world.add(l);this.effects.push({kind:'text',mesh:l,life:0,duration:1.25});
    }
  }

  updateEffects(dt){
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life+=dt;const q=e.life/e.duration;if(q>=1){this.world.remove(e.mesh);disposeOwned(e.mesh);this.effects.splice(i,1);continue;}
      if(e.kind==='particle'){e.v.y-=dt*7;e.mesh.position.addScaledVector(e.v,dt);e.mesh.rotation.x+=dt*4;e.mesh.rotation.z+=dt*5;e.mesh.material.opacity=1-q*q;}
      else if(e.kind==='produce'){e.mesh.position.copy(e.from).lerp(e.to,q);e.mesh.position.y+=Math.sin(q*Math.PI)*.55;e.mesh.rotation.y=q*1.3;e.mesh.scale.setScalar(.55*(1-.25*q));}
      else if(e.kind==='text'){e.mesh.position.y+=dt*.7;e.mesh.material.opacity=Math.min(1,(1-q)*3);}
      else if(e.kind==='ring'){e.mesh.scale.setScalar(1+q*2.5);e.mesh.material.opacity=1-q;}
    }
  }

  render(dt=.016){
    dt=clamp(Number(dt)||.016,0,.05);this.elapsed+=dt;const s=this.game.state;
    if(!s)return;
    this.updateCrops(s);this.updateCharacter('player',s.player,'player');const ids=new Set(['player']);
    for(const w of(s.workers||[])){const id='worker-'+w.id;ids.add(id);this.updateCharacter(id,w,w.role);}
    for(const c of(s.customers||[])){const id='customer-'+c.id;ids.add(id);this.updateCharacter(id,c,'customer');}
    for(const[id,v]of this.characters){if(!ids.has(id)){this.world.remove(v.root);disposeOwned(v.root);this.characters.delete(id);}}
    this.updatePadViews(s);this.updateMachines(s,dt);this.updateEffects(dt);
    const target=s.objective?.target;if(target){this.target.visible=true;this.target.position.set(target.x,0,target.z);this.targetArrow.position.y=2.7+Math.sin(this.elapsed*3)*.18;this.targetRing.scale.setScalar(1+Math.sin(this.elapsed*3)*.06);}else this.target.visible=false;
    if(this.follow){const lerp=1-Math.exp(-dt*5);this.focus.x+=(s.player.x-this.focus.x)*lerp;this.focus.z+=(s.player.z-this.focus.z)*lerp;}this.updateCamera();
    for(let i=0;i<this.ripples.length;i++){const t=(this.elapsed*.18+i*.33)%1;this.ripples[i].scale.setScalar(.7+t*.6);this.ripples[i].material.opacity=.35*(1-t);}
    this.duck.position.x=-.5+Math.sin(this.elapsed*.3)*.3;this.duck.position.z=.1+Math.cos(this.elapsed*.3)*.3;this.duck.rotation.y=this.elapsed*.3;
    this.renderer.render(this.scene,this.camera);
  }

  resize(){
    const r=this.container.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.renderer.setSize(this.width,this.height,false);
    const aspect=this.width/this.height;let h=(aspect<1?29:31)/this.zoom;this.camera.left=-h*aspect/2;this.camera.right=h*aspect/2;this.camera.top=h/2;this.camera.bottom=-h/2;this.camera.updateProjectionMatrix();this.updateCamera();
  }
  updateCamera(){const horizontal=Math.cos(this.elevation)*CAMERA_DISTANCE;this.cameraOffset.set(Math.sin(this.angle)*horizontal,Math.sin(this.elevation)*CAMERA_DISTANCE,Math.cos(this.angle)*horizontal);this.camera.position.copy(this.focus).add(this.cameraOffset);this.camera.lookAt(this.focus);this.camera.updateMatrixWorld();}
  getCameraState(){return{follow:this.follow,angle:this.angle,elevation:this.elevation,zoom:this.zoom,focus:{x:this.focus.x,z:this.focus.z}};}
  rotate(delta){if(Number.isFinite(delta))this.angle=(this.angle+delta)%(Math.PI*2);this.updateCamera();return this.getCameraState();}
  tilt(delta){if(Number.isFinite(delta))this.elevation=clamp(this.elevation+delta,Math.PI*25/180,Math.PI*72/180);this.updateCamera();return this.getCameraState();}
  pan(dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy)||(!dx&&!dy))return this.getCameraState();const units=(this.camera.top-this.camera.bottom)/Math.max(1,this.height),c=Math.cos(this.angle),s=Math.sin(this.angle),down=dy/Math.sin(this.elevation);this.focus.x-=units*(dx*c+down*s);this.focus.z-=units*(-dx*s+down*c);this.follow=false;this.updateCamera();return this.getCameraState();}
  followPlayer(){const p=this.game.state.player;if(p)this.focus.set(p.x,0,p.z);this.follow=true;this.updateCamera();return this.getCameraState();}
  resetCamera(){this.angle=CAMERA_ANGLE;this.elevation=CAMERA_ELEVATION;this.setZoomLevel(1);return this.followPlayer();}
  fit(){const c=Math.abs(Math.cos(this.angle)),s=Math.abs(Math.sin(this.angle)),spanX=c*43+s*36,spanY=(s*43+c*36)*Math.sin(this.elevation),aspect=this.width/this.height,h=aspect<1?29:31;this.follow=false;this.focus.set(0,0,0);this.setZoomLevel(Math.min(h/(spanY+8),h*aspect/(spanX+7)));return this.getCameraState();}
  direction(dx,dy){
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return{x:0,z:0};const length=Math.min(1,Math.hypot(dx,dy)),c=Math.cos(this.angle),s=Math.sin(this.angle),down=dy/Math.sin(this.elevation),x=dx*c+down*s,z=-dx*s+down*c,n=Math.hypot(x,z)||1;return{x:x/n*length,z:z/n*length};
  }
  pointToWorld(clientX,clientY){
    const r=this.canvas.getBoundingClientRect(),hits=[];
    const hitLabel=(sprite,point)=>{
      if(!sprite||!sprite.visible)return;const position=sprite.getWorldPosition(new THREE.Vector3()).project(this.camera);if(position.z<-1||position.z>1)return;
      const size=sprite.getWorldScale(new THREE.Vector3());const cx=r.left+(position.x+1)*r.width/2,cy=r.top+(1-position.y)*r.height/2;
      const halfW=size.x*r.width/(this.camera.right-this.camera.left)/2,halfH=size.y*r.height/(this.camera.top-this.camera.bottom)/2;
      const dx=(clientX-cx)/halfW,dy=(clientY-cy)/halfH;if(Math.abs(dx)<=1&&Math.abs(dy)<=1)hits.push({distance:dx*dx+dy*dy,point});
    };
    for(const p of this.padViews.values())if(p.g.visible)hitLabel(p.label,{x:p.g.position.x,z:p.g.position.z});
    for(const zoneView of[this.sellZone,this.coopInput,this.coopOutput,this.millInput,this.millOutput])if(zoneView.g.visible)hitLabel(zoneView.label,{x:zoneView.g.position.x,z:zoneView.g.position.z});
    if(hits.length){hits.sort((a,b)=>a.distance-b.distance);return hits[0].point;}
    this.raycaster.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),this.camera);const v=new THREE.Vector3();if(!this.raycaster.ray.intersectPlane(this.groundPlane,v))return null;return{x:clamp(v.x,-19.5,19.5),z:clamp(v.z,-15.5,15.5)};
  }
  getZoom(){return this.zoom;}
  setZoomLevel(value){if(!Number.isFinite(value))return this.zoom;this.zoom=clamp(value,.25,2.6);this.resize();return this.zoom;}
  setZoom(delta){return this.setZoomLevel(this.zoom*Math.pow(1.16,Number(delta)||0));}
  destroy(){this.observer?.disconnect();this.renderer.dispose();this.canvas.remove();disposeOwned(this.scene);this.effects=[];this.characters.clear();}
}
