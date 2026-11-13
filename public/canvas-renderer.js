// A warm, hand-drawn isometric farm for browsers without WebGL.
// It reads the same live simulation as the 3D view and never changes gameplay.
import { drawFarmIcon } from './pad-icons.js';
import { drawMilkGoods } from './livestock-canvas.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const random=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
const C={grass:'#85bc61',grassLight:'#a9d47b',grassDark:'#619947',path:'#e8cf9c',earth:'#805938',cream:'#fff6d9',wood:'#aa794b',dark:'#2d513a',gold:'#f9c740',red:'#d87750',blue:'#5796a1'};
const CAMERA_ANGLE=Math.atan2(.6,.8),CAMERA_ELEVATION=Math.asin(.55);

export class FarmCanvasRenderer{
  constructor(container,game){
    this.container=container;this.game=game;this.time=0;this.zoom=1;this.focus={x:-1,z:1};this.follow=true;this.angle=CAMERA_ANGLE;this.elevation=CAMERA_ELEVATION;this.cameraCentre={x:.52,y:.535};this.effects=[];this.hitRects=[];
    this.canvas=document.createElement('canvas');this.canvas.className='farm-canvas';this.canvas.tabIndex=0;
    this.canvas.setAttribute('aria-label','Monsoons Farmyard game. Use WASD or arrow keys to walk.');
    this.canvas.style.cssText='width:100%;height:100%;display:block;outline:none;touch-action:none;';
    this.ctx=this.canvas.getContext('2d',{alpha:false});if(!this.ctx)throw new Error('Canvas rendering is unavailable.');
    container.appendChild(this.canvas);this.resize();
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);
    this.cropSeedCache=new Map();this.visualSerial=0;this.decorSeeds=Array.from({length:150},(_,i)=>({u:random(i+2),v:random(i+100),r:random(i+700),k:i%5}));
    this.trees=[[-19,-13,1.2],[-20,-7,.9],[-20,2,.75],[-20,12,1.05],[-17,15,.82],[-9,16,.7],[18,13,1.05],[20,7,.86],[20,-1,1],[19,-7,.75],[18,-15,1.1],[-4,-16,.8],[4,-16,1]];
  }
  resize(){
    this.width=Math.max(1,this.container.clientWidth);this.height=Math.max(1,this.container.clientHeight);this.dpr=Math.min(window.devicePixelRatio||1,1.5);
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
    this.compact=this.width<700||(this.height<520&&this.width<1100);
    const portrait=this.width<this.height*.85;
    this.baseScale=this.compact?this.height/(portrait?34:25):Math.min(this.width/51,this.height/37);
    if(this.follow&&this.compact&&!this.hasMobileFocus){this.focus.x=this.game.state.player.x;this.focus.z=this.game.state.player.z;this.hasMobileFocus=true;}
    if(!this.compact)this.hasMobileFocus=false;this.scale=this.baseScale*this.zoom;this.hitRects=[];this.cacheLighting();
  }
  project(x,z,y=0){
    const dx=x-this.focus.x,dz=z-this.focus.z,b=this.cameraBasis();
    return{x:this.width*this.cameraCentre.x+(dx*b.c-dz*b.s)*this.scale,y:this.height*this.cameraCentre.y+(dx*b.s+dz*b.c)*this.scale*b.floor-y*this.scale*b.height};
  }
  cameraBasis(){if(!this._cameraBasis||this._cameraBasis.angle!==this.angle||this._cameraBasis.elevation!==this.elevation)this._cameraBasis={angle:this.angle,elevation:this.elevation,c:Math.cos(this.angle),s:Math.sin(this.angle),floor:Math.sin(this.elevation),height:Math.cos(this.elevation)/Math.cos(CAMERA_ELEVATION)};return this._cameraBasis;}
  direction(sx,sy){
    if(!Number.isFinite(sx)||!Number.isFinite(sy))return{x:0,z:0};
    const length=Math.min(1,Math.hypot(sx,sy)),b=this.cameraBasis(),down=sy/b.floor,x=b.c*sx+b.s*down,z=-b.s*sx+b.c*down,d=Math.hypot(x,z)||1;
    return{x:x/d*length,z:z/d*length};
  }
  pointToWorld(clientX,clientY){
    const rect=this.canvas.getBoundingClientRect(),s=this.scale||this.baseScale*this.zoom;
    const localX=clientX-rect.left,localY=clientY-rect.top;
    const hits=(this.mode==='editor'?[]:this.hitRects).filter(hit=>{
      if(localX<hit.left||localX>hit.right||localY<hit.top||localY>hit.bottom)return false;
      if(!hit.points)return true;
      let sign=0;
      for(let i=0;i<hit.points.length;i++){
        const a=hit.points[i],b=hit.points[(i+1)%hit.points.length],cross=(b.x-a.x)*(localY-a.y)-(b.y-a.y)*(localX-a.x);
        if(Math.abs(cross)<.001)continue;
        const side=Math.sign(cross);if(sign&&side!==sign)return false;sign=side;
      }
      return true;
    });
    if(hits.length){hits.sort((a,b)=>Math.hypot((a.left+a.right)/2-localX,(a.top+a.bottom)/2-localY)-Math.hypot((b.left+b.right)/2-localX,(b.top+b.bottom)/2-localY));return{x:hits[0].x,z:hits[0].z};}
    const basis=this.cameraBasis(),a=(clientX-rect.left-this.width*this.cameraCentre.x)/s,b=(clientY-rect.top-this.height*this.cameraCentre.y)/s/basis.floor;
    return{x:basis.c*a+basis.s*b+this.focus.x,z:-basis.s*a+basis.c*b+this.focus.z};
  }
  getZoom(){return this.zoom;}
  setZoomLevel(value){if(Number.isFinite(value))this.zoom=clamp(value,.25,2.6);this.scale=this.baseScale*this.zoom;this.hitRects=[];return this.zoom;}
  setZoom(delta){return this.setZoomLevel(this.zoom*Math.pow(1.16,Number(delta)||0));}
  getCameraState(){return{follow:this.follow,angle:this.angle,elevation:this.elevation,zoom:this.zoom,focus:{x:this.focus.x,z:this.focus.z}};}
  rotate(delta){if(Number.isFinite(delta))this.angle=(this.angle+delta)%(Math.PI*2);this.hitRects=[];return this.getCameraState();}
  tilt(delta){if(Number.isFinite(delta))this.elevation=clamp(this.elevation+delta,Math.PI*25/180,Math.PI*72/180);this.hitRects=[];return this.getCameraState();}
  pan(dx,dy){
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||(!dx&&!dy))return this.getCameraState();
    const b=this.cameraBasis(),x=-dx/(this.scale||1),z=-dy/(this.scale||1)/b.floor;
    this.focus.x+=b.c*x+b.s*z;this.focus.z+=-b.s*x+b.c*z;this.follow=false;this.hitRects=[];return this.getCameraState();
  }
  followPlayer(){const p=this.game.state.player;if(p){this.focus.x=p.x;this.focus.z=p.z;}this.follow=true;this.hitRects=[];return this.getCameraState();}
  resetCamera(){this.angle=CAMERA_ANGLE;this.elevation=CAMERA_ELEVATION;this.setZoomLevel(1);return this.followPlayer();}
  fit(){const c=Math.abs(Math.cos(this.angle)),s=Math.abs(Math.sin(this.angle)),spanX=c*43+s*36,spanY=(s*43+c*36)*Math.sin(this.elevation);this.focus={x:0,z:0};this.follow=false;this.setZoomLevel(Math.min(this.width*2*Math.min(this.cameraCentre.x,1-this.cameraCentre.x)/(spanX+7),this.height*2*Math.min(this.cameraCentre.y,1-this.cameraCentre.y)/(spanY+8))/this.baseScale);return this.getCameraState();}
  localViewAngle(){return this.angle+(this.localNode?.rotation||0)*Math.PI/180;}
  destroy(){this.observer?.disconnect();this.canvas.remove();this.effects=[];}
  poly(points,fill,stroke=null,line=1){
    const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}
  }
  ground(x,z,w,d,fill,stroke=null,y=.03){
    this.poly([this.project(x-w/2,z-d/2,y),this.project(x+w/2,z-d/2,y),this.project(x+w/2,z+d/2,y),this.project(x-w/2,z+d/2,y)],fill,stroke);
  }
  line(a,b,color,width=1){
    const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
  }
  ellipse(p,rx,ry,fill,stroke=null){
    const c=this.ctx;c.beginPath();c.ellipse(p.x,p.y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}
  }
  shadow(x,z,w=1,d=.35){
    const p=this.project(x+.24,z+.23,.035),k=this.scale;
    this.ellipse(p,w*k*1.12,d*k*1.18,'#29472d13');
    this.ellipse({x:p.x-k*.04,y:p.y-k*.025},w*k*.8,d*k*.76,'#304d3625');
    this.ellipse({x:p.x-k*.1,y:p.y-k*.06},w*k*.48,d*k*.5,'#25423220');
  }
  visible(x,z,r=2,h=0){
    const p=this.project(x,z,h*.5),pad=(r+h*.55)*this.scale+24;
    return p.x>-pad&&p.x<this.width+pad&&p.y>-pad&&p.y<this.height+pad;
  }
  cacheLighting(){
    const c=this.ctx;if(!c)return;
    c.save();c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);
    this.skyGradient=c.createLinearGradient(0,0,this.width*.25,this.height);this.skyGradient.addColorStop(0,'#c8e3d0');this.skyGradient.addColorStop(.55,'#b3d5c3');this.skyGradient.addColorStop(1,'#96c3b4');
    this.finishGradient=c.createRadialGradient(this.width*.3,this.height*.1,0,this.width*.3,this.height*.1,this.width*.9);this.finishGradient.addColorStop(0,'#fff4c80a');this.finishGradient.addColorStop(1,'#ffffff00');
    c.restore();
  }
  drawBackground(){this.ctx.fillStyle=this.skyGradient||'#b7d7c4';this.ctx.fillRect(0,0,this.width,this.height);}
  drawFinish(){this.ctx.fillStyle=this.finishGradient||'#ffffff00';this.ctx.fillRect(0,0,this.width,this.height);}
  grassTexture(width,depth){
    const k=this.scale,c=this.ctx,detail=k>10;
    for(const b of this.decorSeeds||[]){
      const x=(b.u-.5)*(width-1.4),z=(b.v-.5)*(depth-1.4);if(!this.visible(x,z,.6))continue;
      const p=this.project(x,z,.055),r=(.14+b.r*.2)*k;
      this.ellipse(p,r,r*.28,b.k%2?'#b0d78245':'#5c9d4522');
      if(detail&&b.k<2){this.line(p,{x:p.x-r*.25,y:p.y-r*.7},'#6ca54670',Math.max(.7,k*.035));this.line(p,{x:p.x+r*.35,y:p.y-r*.9},'#b7d98880',Math.max(.7,k*.035));}
    }
  }
  fieldBed(x,z,w,d){
    this.ground(x,z,w+.2,d+.2,'#a57643','#d8b274',.075);this.ground(x,z,w-.08,d-.08,'#795437',null,.088);
    for(let at=-d/2+.45,i=0;at<d/2;at+=1.1,i++){
      this.ground(x,z+at,w-.3,.68,i%2?'#997043':'#8e653e',null,.093);
      if(this.scale>14)this.line(this.project(x-w/2+.2,z+at+.31,.096),this.project(x+w/2-.2,z+at+.31,.096),'#bd925240',Math.max(.65,this.scale*.025));
    }
    this.line(this.project(x-w/2,z+d/2,.12),this.project(x+w/2,z+d/2,.12),'#e1b977',Math.max(1,this.scale*.07));
    this.line(this.project(x-w/2,z-d/2,.12),this.project(x-w/2,z+d/2,.12),'#c8985c',Math.max(1,this.scale*.07));
  }
  sparkle(x,y,r,color='#fff9cb'){
    this.poly([{x,y:y-r},{x:x+r*.25,y:y-r*.25},{x:x+r,y},{x:x+r*.25,y:y+r*.25},{x,y:y+r},{x:x-r*.25,y:y+r*.25},{x:x-r,y},{x:x-r*.25,y:y-r*.25}],color);
  }
  coinStack(x,z,amount){
    const p=this.project(x,z,.16),k=this.scale/21,n=Math.min(7,Math.ceil(amount/8));this.shadow(x,z,.56,.23);
    for(let i=0;i<n;i++){const xx=p.x+(i%2?5:-4)*k,yy=p.y-Math.floor(i/2)*3.6*k;this.ellipse({x:xx,y:yy},6*k,2.8*k,'#ad7416');this.ellipse({x:xx,y:yy-2*k},6*k,2.7*k,'#ffd861','#fff0ac');this.line({x:xx-3*k,y:yy-2.9*k},{x:xx+1*k,y:yy-3.4*k},'#fff5bf',Math.max(.6,k));}
    if(n&&Math.sin(this.time*3+x)>.55)this.sparkle(p.x+6*k,p.y-12*k,3.4*k);
  }
  box(x,z,w,d,h,top,front,side,y=0){
    const a=this.project(x-w/2,z-d/2,y+h),b=this.project(x+w/2,z-d/2,y+h),c=this.project(x+w/2,z+d/2,y+h),e=this.project(x-w/2,z+d/2,y+h);
    const aa=this.project(x-w/2,z-d/2,y),bb=this.project(x+w/2,z-d/2,y),cc=this.project(x+w/2,z+d/2,y),ee=this.project(x-w/2,z+d/2,y),angle=this.localViewAngle();
    if(Math.sin(angle)>=0)this.poly([b,bb,cc,c],side);else this.poly([a,aa,ee,e],side);
    if(Math.cos(angle)>=0)this.poly([e,c,cc,ee],front);else this.poly([a,b,bb,aa],front);
    this.poly([a,b,c,e],top);
  }
  label(x,z,text,opts={}){
    const p=this.project(x,z,opts.y??1.3),c=this.ctx,lines=String(text).split('\n'),font=opts.font??11;
    c.font='800 '+font+'px "Trebuchet MS",sans-serif';const w=Math.max(...lines.map(t=>c.measureText(t).width))+18,h=lines.length*(font+3)+10;
    if(opts.hit)this.hitRects.push({left:p.x-w/2-3,right:p.x+w/2+3,top:p.y-h/2-3,bottom:p.y+h/2+3,x,z});
    c.save();c.shadowColor='#284c3020';c.shadowBlur=8;c.shadowOffsetY=3;c.fillStyle=opts.fill||'#fff8e5';c.beginPath();c.roundRect(p.x-w/2,p.y-h/2,w,h,8);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle=opts.border||'#d9caa0';c.lineWidth=1;c.stroke();
    c.textAlign='center';c.textBaseline='middle';lines.forEach((text,i)=>{c.fillStyle=i&&opts.secondary?opts.secondary:opts.color||'#52633d';c.fillText(text,p.x,p.y+(i-(lines.length-1)/2)*(font+3));});c.restore();
  }
  badge(x,z,kind,text='',opts={}){
    const p=this.project(x,z,opts.y??.95),c=this.ctx,size=opts.small?17:21,font=opts.small?11:13;
    if(p.x<-100||p.x>this.width+100||p.y<-70||p.y>this.height+70)return;
    const words=String(text),hasText=words.length>0,extra=opts.coin&&hasText?15:opts.lock?15:0;
    c.font='900 '+font+'px "Trebuchet MS",sans-serif';
    const w=size+(hasText?c.measureText(words).width+7:0)+extra+16,h=opts.small?27:31,left=p.x-w/2,top=p.y-h/2;
    c.save();c.shadowColor=opts.gold?'#aa67084d':'#24432d28';c.shadowBlur=opts.gold?11:7;c.shadowOffsetY=3;
    const fill=c.createLinearGradient(0,top,0,top+h);fill.addColorStop(0,opts.gold?'#fff9cc':opts.fill||'#fffbed');fill.addColorStop(1,opts.gold?'#ffe479':opts.fill||'#f1f3d9');
    c.fillStyle=fill;c.strokeStyle=opts.gold?'#e9ab17':opts.border||'#c0cf9a';c.lineWidth=opts.gold?1.8:1;
    c.beginPath();c.roundRect(left,top,w,h,opts.gold?10:9);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.stroke();
    const colour=opts.color||(opts.gold?'#81500b':'#3e6046');
    drawFarmIcon(c,kind,left+8+size/2,p.y,size,colour);
    let cursor=left+8+size+6;
    if(opts.coin&&hasText){drawFarmIcon(c,'coin',cursor+5,p.y,12,'#ba790d');cursor+=15;}
    if(hasText){c.textAlign='left';c.textBaseline='middle';c.fillStyle=colour;c.fillText(words,cursor,p.y+.5);}
    if(opts.lock)drawFarmIcon(c,'lock',left+w-12,p.y,13,'#817744');
    c.restore();
    const expand=Math.max(3,(40-h)/2);
    this.hitRects.push({left:left-3,right:left+w+3,top:top-expand,bottom:top+h+expand,x,z});
  }
  floorTarget(x,z,w,d,y=.1){
    const points=[this.project(x-w/2,z-d/2,y),this.project(x+w/2,z-d/2,y),this.project(x+w/2,z+d/2,y),this.project(x-w/2,z+d/2,y)];
    this.hitRects.push({left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y)),points,x,z});
    return points;
  }
  ring(x,z,r,color,width=2,progress=1){
    const c=this.ctx,p=this.project(x,z,.07);c.save();c.translate(p.x,p.y);c.scale(1,this.cameraBasis().floor);c.beginPath();c.arc(0,0,r*this.scale,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);c.strokeStyle=color;c.lineWidth=width;c.stroke();c.restore();
  }
  tree(x,z,s=1,apples=0){
    if(!this.visible(x,z,1.8*s,4*s))return;
    this.shadow(x,z,1.18*s,.48*s);const k=this.scale*s,base=this.project(x,z,.03),top=this.project(x,z,2.35*s);
    this.line(base,top,'#725333',k*.22);this.line({x:base.x-k*.035,y:base.y-k*.02},{x:top.x-k*.035,y:top.y},'#b08b58',k*.075);
    this.line(this.project(x,z,1.4*s),this.project(x-.5*s,z,2.18*s),'#8c693e',k*.13);
    const crown=this.project(x+Math.sin(this.time*.75+x)*.035*s,z,2.85*s);
    this.ellipse({x:crown.x+k*.12,y:crown.y+k*.12},k*1.15,k*.95,'#4f883e');
    this.ellipse({x:crown.x-k*.51,y:crown.y+k*.02},k*.78,k*.76,'#669e45');
    this.ellipse({x:crown.x+k*.48,y:crown.y-k*.24},k*.74,k*.79,'#72aa4c');
    this.ellipse({x:crown.x-k*.18,y:crown.y-k*.49},k*.85,k*.75,'#89ba56');
    this.ellipse({x:crown.x-k*.45,y:crown.y-k*.68},k*.47,k*.34,'#a6ce70');
    this.ellipse({x:crown.x+k*.32,y:crown.y-k*.6},k*.3,k*.23,'#9ac962');
    if(k>15){this.ellipse({x:crown.x-k*.76,y:crown.y-k*.12},k*.19,k*.12,'#85b45a');this.ellipse({x:crown.x+k*.51,y:crown.y+k*.27},k*.23,k*.15,'#5f9544');}
    if(apples>.12)for(let i=0;i<6;i++){
      const a=i*2.4,rx=crown.x+Math.cos(a)*k*.72,ry=crown.y+Math.sin(a)*k*.57,sz=(.07+apples*.07)*k;
      this.ellipse({x:rx+sz*.15,y:ry+sz*.35},sz*1.1,sz,'#3d6e3540');this.ellipse({x:rx,y:ry},sz,sz*1.06,'#d8573b');this.ellipse({x:rx-sz*.28,y:ry-sz*.3},sz*.37,sz*.34,'#f58c58');this.line({x:rx,y:ry-sz*.8},{x:rx+sz*.2,y:ry-sz*1.25},'#72502f',Math.max(.7,sz*.18));
    }
  }
  flower(x,z,seed){
    const p=this.project(x,z,.3),c=this.ctx,s=this.scale*.11;
    this.line(this.project(x,z,.03),p,'#6e9553',1.3);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;this.ellipse({x:p.x+Math.cos(a)*s,y:p.y+Math.sin(a)*s},s,s,['#fff3ca','#f0b1a2','#e7cd7b'][seed%3]);}
    this.ellipse(p,s*.6,s*.6,'#ddaf53');
  }
  fence(x1,z1,x2,z2){
    const n=Math.ceil(Math.hypot(x2-x1,z2-z1)/1.35);
    for(const y of[.4,.85])this.line(this.project(x1,z1,y),this.project(x2,z2,y),'#e9dfbe',this.scale*.09);
    for(let i=0;i<=n;i++){
      const x=x1+(x2-x1)*i/n,z=z1+(z2-z1)*i/n;this.box(x,z,.13,.13,1.1,'#fff3d2','#e8d8b2','#d1bf95');
    }
  }
  building(x,z,w,d,h,color,roofColor,kind){
    if(!this.visible(x,z,Math.max(w,d)*.7,h+1.6))return;
    const k=this.scale,c=this.ctx,view=this.localViewAngle(),frontVisible=Math.cos(view)>=0,faceZ=frontVisible?1:-1,faceX=Math.sin(view)>=0?1:-1,frontZ=z+faceZ*(d/2+.025),roofRise=Math.max(.8,Math.min(1.4,w*.2));
    this.shadow(x,z,w*.63,d*.37);this.box(x,z,w+.16,d+.14,.2,'#d4c19a','#9f956d','#888b66');
    this.box(x,z,w,d,h,'#f0d8ae',color,kind==='mill'?'#4d8275':kind==='barn'?'#b56d48':'#c59b62',.14);
    if(k>10){
      for(let at=-w/2+.24;at<w/2;at+=.48)this.line(this.project(x+at,frontZ,.23),this.project(x+at,frontZ,h+.1),kind==='mill'?'#407d6a32':'#8c502b27',Math.max(.6,k*.027));
      for(let yy=.54;yy<h;yy+=.54)this.line(this.project(x+faceX*(w/2+.015),z-d/2,yy),this.project(x+faceX*(w/2+.015),z+d/2,yy),'#583f3020',Math.max(.6,k*.025));
    }
    for(const xx of[x-w/2+.05,x+w/2-.05])this.line(this.project(xx,frontZ,.2),this.project(xx,frontZ,h+.12),'#ffedbf',Math.max(1.2,k*.105));
    this.line(this.project(x-w/2,frontZ,.3),this.project(x+w/2,frontZ,.3),'#f7d89b',Math.max(1,k*.09));
    const a=this.project(x-w/2-.22,z-d/2-.22,h+.13),b=this.project(x+w/2+.22,z-d/2-.22,h+.13),cc=this.project(x+w/2+.22,z+d/2+.22,h+.13),dd=this.project(x-w/2-.22,z+d/2+.22,h+.13),p=this.project(x,z-d/2-.22,h+roofRise+.13),q=this.project(x,z+d/2+.22,h+roofRise+.13);
    const roofLeft=()=>this.poly([a,p,q,dd],roofColor),roofRight=()=>this.poly([p,b,cc,q],kind==='barn'?'#a84c37':kind==='mill'?'#ba7847':'#ad5c43');
    if(faceX>0){roofLeft();roofRight();}else{roofRight();roofLeft();}
    const gableLeft=frontVisible?dd:a,gablePeak=frontVisible?q:p,gableRight=frontVisible?cc:b;
    this.poly([gableLeft,gablePeak,gableRight],kind==='barn'?'#e8be80':'#f2d7a0');
    if(k>11){for(let at=-d/2+.45;at<d/2;at+=.64){const peak=this.project(x,z+at,h+roofRise+.13);this.line(this.project(x-w/2-.2,z+at,h+.15),peak,kind==='mill'?'#efd09b50':'#ffbd8b50',Math.max(.7,k*.03));this.line(peak,this.project(x+w/2+.2,z+at,h+.15),'#813f3238',Math.max(.7,k*.035));}}
    this.line(faceX>0?b:a,faceX>0?cc:dd,kind==='mill'?'#f5d7a3':'#ffbc85',Math.max(1.2,k*.085));this.line(p,q,kind==='mill'?'#ffe1ac':'#ffb68b',Math.max(1.1,k*.075));this.line(gableLeft,gablePeak,'#fff0c7',Math.max(1.3,k*.11));this.line(gablePeak,gableRight,'#f8ddb0',Math.max(1.3,k*.1));
    this.line({x:gableLeft.x,y:gableLeft.y+2},{x:gableRight.x,y:gableRight.y+2},'#7f573c55',Math.max(1.8,k*.13));
    const doorW=w*(kind==='barn'?.36:.24),doorH=h*.72;
    const corners=[this.project(x-doorW/2,frontZ+.03,.18),this.project(x+doorW/2,frontZ+.03,.18),this.project(x+doorW/2,frontZ+.03,doorH),this.project(x-doorW/2,frontZ+.03,doorH)];
    if(frontVisible){this.poly(corners,kind==='mill'?'#315c50':'#69482e','#f7dfb0',Math.max(1,k*.065));if(kind==='barn'){this.line(corners[0],corners[2],'#f2d8a5',Math.max(1,k*.065));this.line(corners[1],corners[3],'#f2d8a5',Math.max(1,k*.065));this.line(this.project(x,frontZ+.04,.2),this.project(x,frontZ+.04,doorH),'#e9c796',Math.max(1,k*.06));}}
    const window=(xx,yy,ww)=>{const zz=frontZ+faceZ*.04,hh=ww*.95,pts=[this.project(xx-ww/2,zz,yy-hh/2),this.project(xx+ww/2,zz,yy-hh/2),this.project(xx+ww/2,zz,yy+hh/2),this.project(xx-ww/2,zz,yy+hh/2)];this.poly(pts,'#4e8d91','#fff0c6',Math.max(1,k*.065));this.line(pts[3],pts[1],'#b6e0c670',Math.max(1,k*.055));this.line(this.project(xx,zz,yy-hh/2),this.project(xx,zz,yy+hh/2),'#f9e2b4',Math.max(.8,k*.045));};
    if(frontVisible){window(x+w*.33,h*.63,Math.min(.64,w*.14));if(kind==='coop')window(x-w*.33,h*.63,Math.min(.64,w*.14));}else window(x,h*.64,Math.min(.75,w*.17));
    if(kind==='barn'){window(x,h+roofRise*.44,.53);const flag=this.project(x,z,h+roofRise+.8);this.line(this.project(x,z,h+roofRise+.13),flag,'#725b3b',Math.max(1,k*.05));this.poly([flag,{x:flag.x+k*.5,y:flag.y+k*.1},{x:flag.x,y:flag.y+k*.27}],'#f0c656');}
    if(kind==='mill'){this.box(x-w*.3,z-d*.12,.45,.5,1.15,'#cd8753','#a86b42','#855239',h+.6);this.box(x-w*.3,z-d*.12,.6,.63,.17,'#efd7aa','#ba885a','#8f6544',h+1.7);}
    if(kind==='coop'&&frontVisible){const zz=z+d/2+.25;this.ground(x,zz+.4,doorW*1.08,1.0,'#b28950','#e5c185',.14);for(let j=0;j<4;j++)this.line(this.project(x-doorW*.5,zz+j*.23,.17),this.project(x+doorW*.5,zz+j*.23,.17),'#e4bc7b',Math.max(1,k*.055));}
  }
  blueprint(x,z,w,d,kind){
    const c=this.ctx;c.save();c.globalAlpha=.57;this.ground(x,z,w+.6,d+.6,'#c9d79a','#ebf0cf');
    c.setLineDash([5,5]);const a=this.project(x-w/2,z-d/2),b=this.project(x+w/2,z-d/2),cc=this.project(x+w/2,z+d/2),dd=this.project(x-w/2,z+d/2);
    this.poly([a,b,cc,dd],null,'#f6f5cf',2);[a,b,cc,dd].forEach((p,i)=>{const corner=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]][i];this.line(p,this.project(x+corner[0],z+corner[1],2),'#edf1d2',1.5);});
    this.ground(x,z,w,d,null,'#eef2d7',2);c.setLineDash([]);c.restore();
  }
  crop(crop,i){
    const {x,z}=crop,type=this.goodCatalog?.[crop.type]?.model||crop.type,g=clamp(crop.growth,0,1);if(!this.visible(x,z,1.25,type==='apple'?3:1.25))return;
    if(type==='apple'){this.tree(x,z,.72,g);return;}
    const key=crop.id||i;let shape=this.cropSeedCache.get(key);if(!shape){shape=Array.from({length:5},(_,j)=>.66+random(i*8+j)*.26);this.cropSeedCache.set(key,shape);}
    const growth=Math.max(.09,g),c=this.ctx,k=this.scale,wave=Math.sin(this.time*1.9+x*.7+z*.5)*.055,stalks=k<10?3:5;
    if(g>.35&&k>13)this.shadow(x,z,.3*g,.12*g);
    for(let j=0;j<stalks;j++){
      const a=j*2.4,dx=Math.cos(a)*.25,dz=Math.sin(a)*.22,h=shape[j]*growth,base=this.project(x+dx,z+dz,.12),head=this.project(x+dx+wave,z+dz,h+.14);
      this.line(base,head,g>.72?'#b58a2b':'#6c963a',Math.max(.8,k*.048));
      const leaf=this.project(x+dx+.2,z+dz,.31*growth);this.line({x:(base.x+head.x)/2,y:(base.y+head.y)/2},leaf,g>.75?'#d7b64d':'#86af46',Math.max(.7,k*.05));
      if(g>.32){
        c.save();c.translate(head.x,head.y);c.rotate(.15+wave);const rx=k*.105*growth,ry=k*.23*growth;
        this.ellipse({x:.5,y:1},rx*1.1,ry,g>.77?'#be8c29':'#659138');this.ellipse({x:0,y:0},rx*(type==='grain'?.8:1),ry,g>.77?(this.goodCatalog?.[crop.type]?.color||'#f5cb4c'):g>.58?'#c5c04f':'#91b34a');
        this.ellipse({x:-rx*.3,y:-ry*.3},rx*.42,ry*.48,g>.77?'#ffe58a':'#c8d270');
        if(k>14)for(let j=-1;j<=1;j++)this.line({x:0,y:j*ry*.6},{x:rx*1.05,y:j*ry*.6-ry*.35},g>.77?'#fff0ad':'#cfdb86',Math.max(.55,k*.024));c.restore();
      }
    }
  }
  goods(x,y,type,n=1,s=1){
    const originalType=type,product=this.goodCatalog?.[type];type=product?.model||type;
    if(type==='milk'){drawMilkGoods(this,x,y,n,s);if(product&&originalType!==type){this.ctx.fillStyle=product.color||'#82ab73';for(let i=0;i<Math.min(n,12);i++)this.ctx.fillRect(x-2*s,y-i*8.8*s-1.2*s,4*s,2.2*s);}return;}
    const c=this.ctx,w=16*s,h=7.8*s;
    for(let i=0;i<Math.min(n,12);i++){
      const px=x+Math.sin(this.time*3+i*.14)*.35*s,py=y-i*h*.8;
      if(type==='wheat'){
        this.poly([{x:px-w/2,y:py-h},{x:px+w/2,y:py-h-2*s},{x:px+w/2+2*s,y:py-1*s},{x:px-w/2+2*s,y:py+1*s}],'#d79e30','#a7762633',.6*s);
        this.poly([{x:px-w/2,y:py-h},{x:px+w/2,y:py-h-2*s},{x:px+w/2-2*s,y:py-h-4*s},{x:px-w/2-2*s,y:py-h-2*s}],'#ffe085');
        this.poly([{x:px+w/2,y:py-h-2*s},{x:px+w/2+2*s,y:py-s},{x:px+w/2-2*s,y:py-2*s},{x:px+w/2-2*s,y:py-h-4*s}],'#bf8627');
        for(const dx of[-4,4]){this.line({x:px+(dx-1.2)*s,y:py-h-3*s},{x:px+(dx+1)*s,y:py+.4*s},'#8e6e36',1.35*s);}
        this.line({x:px-w*.4,y:py-h*.4},{x:px+w*.33,y:py-h*.55},'#f4c85b',.7*s);
      }else if(type==='egg'){
        c.fillStyle='#a27e4e';c.beginPath();c.roundRect(px-w/2,py-h*.45,w,h*.65,1.3*s);c.fill();
        for(let j=0;j<3;j++){const xx=px+(j-1)*w*.27;this.ellipse({x:xx,y:py-h*.69},2.4*s,3.2*s,'#e4d6af');this.ellipse({x:xx-.4*s,y:py-h*.95},1.7*s,1.9*s,'#fff9dd');}
        this.line({x:px-w/2,y:py+h*.1},{x:px+w/2,y:py+h*.1},'#d7b475',1.7*s);
      }else if(type==='apple'){
        c.fillStyle='#95683c';c.beginPath();c.roundRect(px-w/2,py-h*.48,w,h*.7,1*s);c.fill();
        for(let j=0;j<3;j++){const xx=px+(j-1)*w*.27;this.ellipse({x:xx,y:py-h*.65},3*s,2.9*s,'#cf4e35');this.ellipse({x:xx-.6*s,y:py-h*.84},1*s,.9*s,'#fa9a63');this.line({x:xx,y:py-h*.99},{x:xx+.5*s,y:py-h*1.2},'#58733c',.8*s);}
        this.line({x:px-w/2,y:py+h*.04},{x:px+w/2,y:py+h*.04},'#d0a064',1.6*s);
      }else if(type==='cheese'){
        this.ellipse({x:px,y:py-2*s},8*s,4*s,'#d99c32');c.fillStyle='#efbe46';c.fillRect(px-8*s,py-6*s,16*s,4*s);this.ellipse({x:px,y:py-6*s},8*s,3.3*s,'#ffdc74');
        for(const [dx,dy,r]of[[-3,-6,1.1],[3,-5,1.4],[1,-8,.8]])this.ellipse({x:px+dx*s,y:py+dy*s},r*s,r*.55*s,'#dca139');
      }else if(type==='butter'){
        c.fillStyle='#f6eccb';c.beginPath();c.roundRect(px-9*s,py-3*s,18*s,4*s,1.5*s);c.fill();c.fillStyle='#ecc35a';c.beginPath();c.roundRect(px-7*s,py-9*s,14*s,8*s,2*s);c.fill();c.fillStyle='#ffe58a';c.beginPath();c.roundRect(px-7*s,py-10*s,14*s,4*s,1.5*s);c.fill();c.fillStyle='#fff4d5';c.fillRect(px-5*s,py-10*s,4*s,9*s);this.line({x:px-3*s,y:py-9*s},{x:px-3*s,y:py-3*s},'#7eac87',s);
      }else if(type==='bread'){
        this.ellipse({x:px,y:py-2*s},8.6*s,2.5*s,'#95623d');this.ellipse({x:px,y:py-6*s},8*s,5.4*s,'#bd7a38');this.ellipse({x:px-.4*s,y:py-7*s},7.4*s,4.2*s,'#e8b164');
        for(const dx of[-4,0,4])this.line({x:px+(dx-1)*s,y:py-8*s},{x:px+(dx+1)*s,y:py-6*s},'#ffdda0',1.1*s);
      }else if(type==='juice'){
        c.fillStyle='#66956f';c.fillRect(px-8*s,py-2*s,16*s,3*s);
        for(const dx of[-4,4]){c.fillStyle='#dda34b';c.beginPath();c.roundRect(px+(dx-2.5)*s,py-10*s,5*s,9*s,1.2*s);c.fill();c.fillStyle='#f5dfa3';c.fillRect(px+(dx-2.4)*s,py-7*s,4.8*s,3.5*s);c.fillStyle='#76a27a';c.fillRect(px+(dx-1.8)*s,py-12*s,3.6*s,2.5*s);this.ellipse({x:px+dx*s,y:py-5.2*s},1.2*s,1.2*s,'#c86a43');}
      }else if(type==='flour'||type==='grain'){
        c.fillStyle='#bbaa7e';c.beginPath();c.roundRect(px-w*.34,py-h*1.25,w*.68,h*1.53,3*s);c.fill();c.fillStyle='#f9edcc';c.beginPath();c.roundRect(px-w*.29,py-h*1.25,w*.57,h*1.4,3*s);c.fill();this.line({x:px-3*s,y:py-h*1.02},{x:px+3*s,y:py-h*1.02},'#c7a166',1.2*s);
        c.fillStyle=type==='grain'?'#819d62':'#b58b4f';c.fillRect(px-2.8*s,py-h*.7,5.6*s,4.2*s);this.line({x:px,y:py-h*.65},{x:px,y:py-h*.2},'#f8df9b',.7*s);
        if(type==='grain')for(let j=0;j<4;j++)this.ellipse({x:px+((j%2)*3-1.5)*s,y:py-h*1.25-(j>1?1.5:0)*s},1.4*s,.7*s,'#e5c17a');
      }else{
        c.fillStyle='#a47c49';c.beginPath();c.roundRect(px-8*s,py-3*s,16*s,4*s,1.4*s);c.fill();c.fillStyle=product?.color||'#87ad78';c.beginPath();c.roundRect(px-6*s,py-10*s,12*s,9*s,2*s);c.fill();c.fillStyle='#fff1cc';c.fillRect(px-2.5*s,py-7*s,5*s,3*s);
      }
      if(product&&originalType!==type){c.fillStyle=product.color||'#82ab73';c.fillRect(px-2*s,py-1.2*s,4*s,2.2*s);}
    }
  }
  person(p,kind='customer',seed=0){
    if(!this.visible(p.x,p.z,1.5,4.7))return;
    const c=this.ctx,s=this.scale/21*(kind==='player'?1.12:.95),pos=this.project(p.x,p.z,.04),move=p.moving||kind==='customer'&&p.phase==='leaving',stride=move?Math.sin(this.time*12+seed)*3*s:0,bob=move?Math.abs(stride)*.3:Math.sin(this.time*2+seed)*.2*s;
    const bag=Array.isArray(p.bag)?p.bag:p.phase==='leaving'&&p.good?[p.good]:[],carrying=bag.length>0,action=this.actorReactions?.get(p.id||kind),reach=action?Math.sin(clamp(1-(this.time-action.at)/.42,0,1)*Math.PI):0,greeting=kind==='customer'&&p.phase==='leaving'?Math.max(0,1-(this.time+seed)%3):0;
    this.shadow(p.x,p.z,.5,.22);c.save();c.translate(pos.x,pos.y-bob);
    const basis=this.cameraBasis(),colors=['#91ac64','#e39b59','#6398b2','#b47d9b','#5f9e8b'],shirt=kind==='player'?'#6ca5ac':kind==='farmhand'?'#9faf53':kind==='runner'?'#d08e63':colors[Math.abs(seed)%colors.length],skin=kind==='runner'?'#bd835c':seed%4===2?'#d99c72':'#f0bd8b',face=clamp(Math.sin(p.angle||0)*basis.c-Math.cos(p.angle||0)*basis.s,-1,1)*1.5*s;
    if(move&&this.scale>18){c.globalAlpha=.18;this.ellipse({x:-7*s-stride,y:2*s},3.6*s,1.3*s,'#fff2c4');c.globalAlpha=1;}
    this.line({x:-4.2*s,y:-12*s},{x:-4.2*s+stride*.65,y:-2*s},'#365e68',5*s);this.line({x:4.2*s,y:-12*s},{x:4.2*s-stride*.65,y:-2*s},'#48727a',5*s);
    c.fillStyle='#5a4935';for(const [xx,walk]of[[-4.2,stride*.65],[4.2,-stride*.65]]){c.beginPath();c.roundRect((xx-2.2)*s+walk,-2.8*s,6.6*s,4.6*s,1.8*s);c.fill();this.line({x:(xx-1)*s+walk,y:-2.3*s},{x:(xx+2.3)*s+walk,y:-2.3*s},'#a78a5a',.8*s);}
    if(carrying){this.ellipse({x:10*s,y:-18*s},8*s,9*s,'#8d663c');this.ellipse({x:10.5*s,y:-19*s},6.6*s,7.8*s,'#bd9458');}
    c.fillStyle='#315b5f';c.beginPath();c.roundRect(-8.8*s,-28*s,17.6*s,19.2*s,6*s);c.fill();c.fillStyle=shirt;c.beginPath();c.roundRect(-8.2*s,-28*s,16.4*s,17.7*s,5.5*s);c.fill();
    this.ellipse({x:-4.8*s,y:-25.6*s},3*s,1.2*s,'#ffffff24');
    if(kind!=='customer'){
      c.fillStyle=kind==='player'?'#3c7a8b':'#587a5b';c.beginPath();c.roundRect(-5.5*s,-21.8*s,11*s,12.3*s,2.2*s);c.fill();
      for(const xx of[-4.5,4.5]){this.line({x:xx*s,y:-27*s},{x:xx*s,y:-18.7*s},'#e0bd76',2.4*s);this.ellipse({x:xx*s,y:-21*s},1.05*s,1.05*s,'#ffe7a1');}
      c.strokeStyle='#93bec0';c.lineWidth=.7*s;c.strokeRect(-2.9*s,-18.5*s,5.8*s,4.3*s);
    }
    const handY=(carrying?-24:-13)*s-reach*9*s,handX=(carrying?13:10)*s+stride*.55+reach*3*s,leftY=(-13-greeting*20-reach*4)*s;
    this.line({x:-8*s,y:-24*s},{x:-10*s-stride*.55,y:leftY-s},shirt,5.7*s);this.line({x:8*s,y:-24*s},{x:handX,y:handY},shirt,5.7*s);
    this.ellipse({x:-10*s-stride*.55,y:leftY},2.8*s,2.8*s,skin);this.ellipse({x:handX,y:handY+1.1*s},2.8*s,2.8*s,skin);
    c.fillStyle='#b17b51';c.fillRect(-2.6*s,-32*s,5.2*s,5*s);this.ellipse({x:face,y:-35.3*s},8.6*s,9*s,'#b87950');this.ellipse({x:face-.55*s,y:-36.2*s},8.15*s,8.55*s,skin);
    for(const side of[-1,1])this.ellipse({x:face+side*7.7*s,y:-35.2*s},1.9*s,2.5*s,skin);
    this.ellipse({x:face-2.1*s,y:-41*s},6.6*s,3.5*s,kind==='customer'?(seed%2?'#63472f':'#7c552f'):'#aa7b40');
    if(kind!=='customer'){
      this.ellipse({x:0,y:-41.3*s},12.7*s,3.7*s,'#b48c41');this.ellipse({x:-.8*s,y:-42.3*s},12.4*s,3.2*s,'#ffdf8b');c.fillStyle='#d6ad57';c.beginPath();c.roundRect(-7.5*s,-51.1*s,15*s,9.4*s,[5*s,5*s,1.3*s,1.3*s]);c.fill();c.fillStyle='#ffe6a4';c.beginPath();c.roundRect(-7.2*s,-51*s,12*s,8.4*s,[4.8*s,4.8*s,1*s,1*s]);c.fill();this.ellipse({x:-1*s,y:-50*s},5.3*s,1.7*s,'#fff0bd');c.fillStyle='#9b6e35';c.fillRect(-7.3*s,-44.6*s,14.6*s,2*s);this.line({x:-10*s,y:-42*s},{x:-3*s,y:-43.1*s},'#fff1c4',.9*s);
    }
    const blink=(this.time+seed*.71)%6.4<.13;
    for(const xx of[-2.6,2.6]){const eye={x:face+xx*s,y:-35.7*s};if(blink)this.line({x:eye.x-s,y:eye.y},{x:eye.x+s,y:eye.y},'#3b4235',.8*s);else{this.ellipse(eye,1.12*s,1.45*s,'#334337');this.ellipse({x:eye.x-.25*s,y:eye.y-.4*s},.36*s,.4*s,'#fff9de');}}
    this.ellipse({x:face-4.9*s,y:-32.7*s},1.5*s,.75*s,'#e7916a88');this.ellipse({x:face+4.9*s,y:-32.7*s},1.5*s,.75*s,'#e7916a88');this.ellipse({x:face+.5*s,y:-33.2*s},1.3*s,1.1*s,'#db9a6e');
    c.strokeStyle='#9e6048';c.lineWidth=.9*s;c.beginPath();c.arc(face,-32*s,2.4*s,.22,Math.PI-.22);c.stroke();
    if(carrying){c.save();c.rotate(move?Math.sin(this.time*6)*.017:0);let stackHeight=0;for(let i=Math.max(0,bag.length-12);i<bag.length;i++){this.goods(16*s,-25*s-stackHeight,bag[i],1,s);stackHeight+=(['milk','juice'].includes(this.goodCatalog?.[bag[i]]?.model||bag[i])?9.1:6.3)*s;}c.restore();this.ellipse({x:14.4*s,y:-22.5*s},2.9*s,2.5*s,skin);}
    c.restore();if(kind==='player'){this.ring(p.x,p.z,.6,'#315d4145',3);this.ring(p.x,p.z,.58,'#fff4bd',1.6);}
    else if((kind==='farmhand'||kind==='runner')&&this.zoom>.7&&Math.hypot(p.x-this.game.state.player.x,p.z-this.game.state.player.z)<3.5)this.label(p.x,p.z,kind==='farmhand'?'BEA':'PIP',{y:2.9,font:8,fill:'#fff4d5'});
  }
  chicken(x,z,seed){
    if(!this.visible(x,z,.75,1))return;
    const p=this.project(x,z,.14),s=this.scale/21,b=Math.sin(this.time*3+seed)*1.2*s;
    this.shadow(x,z,.29,.12);
    for(const dx of[-2,2])this.line({x:p.x+dx*s,y:p.y},{x:p.x+(dx+1)*s,y:p.y+2.5*s},'#b78136',1.2*s);
    this.ellipse({x:p.x,y:p.y-4*s},6.4*s,4.6*s,'#dec996');this.ellipse({x:p.x-.7*s,y:p.y-5*s},5.8*s,4.1*s,'#fff1cd');this.ellipse({x:p.x-1.7*s,y:p.y-4.1*s},3.1*s,2.2*s,'#e7d7ae');
    this.poly([{x:p.x-4*s,y:p.y-6*s},{x:p.x-8.4*s,y:p.y-9*s},{x:p.x-6*s,y:p.y-2*s}],'#f9edc7');
    this.ellipse({x:p.x+5*s,y:p.y-8*s+b},3.2*s,3.5*s,'#fff9df');this.poly([{x:p.x+7*s,y:p.y-8*s+b},{x:p.x+11*s,y:p.y-7*s+b},{x:p.x+7*s,y:p.y-6*s+b}],'#e6a135');
    this.ellipse({x:p.x+5*s,y:p.y-11.6*s+b},2.3*s,1.8*s,'#d65d43');this.ellipse({x:p.x+6*s,y:p.y-5.2*s+b},1.2*s,1.7*s,'#d56549');this.ellipse({x:p.x+6.1*s,y:p.y-8.7*s+b},.8*s,.9*s,'#344936');this.ellipse({x:p.x+5.9*s,y:p.y-9*s+b},.24*s,.28*s,'#fffbe6');
  }
  market(){
    if(!this.visible(0,7,3.6,3.7))return;
    const c=this.ctx,k=this.scale;this.shadow(0,7,2.9,1.1);this.box(0,7,4.8,1.8,.87,'#edc78a','#73a58a','#4d7c67');
    for(let i=0;i<7;i++)this.line(this.project(-2.1+i*.7,7.92,.12),this.project(-2.1+i*.7,7.92,.82),'#3f745728',Math.max(.6,k*.03));
    this.box(0,7,5.1,1.98,.14,'#f8d79c','#d2a46a','#bb8b53',.86);
    for(const x of[-2.1,2.1]){this.box(x,7.6,.16,.16,2.8,'#fff0c6','#e3bc82','#bb915d');this.line(this.project(x-.035,7.69,.9),this.project(x-.035,7.69,2.78),'#fff3d0',Math.max(.8,k*.04));}
    this.box(0,7.7,5.4,2.4,.15,'#edaa74','#ce6646','#a34e38',2.7);
    for(let i=0;i<8;i++){
      const x=-2.35+i*.67,color=i%2?'#fff0c7':'#e78657';this.ground(x,7.7,.67,2.42,color,null,2.86);
      const a=this.project(x-.335,8.91,2.87),b=this.project(x+.335,8.91,2.87),mid=this.project(x,8.91,2.58);c.fillStyle=color;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.quadraticCurveTo(mid.x,mid.y+k*.06,a.x,a.y);c.fill();
      this.line(this.project(x-.28,6.55,2.875),this.project(x-.28,8.8,2.875),i%2?'#fff9e1':'#ffbb82',Math.max(.7,k*.025));
    }
    this.line(this.project(-2.7,6.5,2.77),this.project(2.7,6.5,2.77),'#94613c',Math.max(1.2,k*.1));
    const sign=this.project(0,7.95,.57);c.save();c.translate(sign.x,sign.y);c.fillStyle='#f5dfa7';c.beginPath();c.roundRect(-k*.55,-k*.18,k*1.1,k*.42,k*.07);c.fill();drawFarmIcon(c,'wheat',0,k*.025,k*.34,'#91723d');c.restore();
    this.box(1.7,6.8,.55,.5,.4,'#3f7b6a','#316857','#275747',1.01);const till=this.project(1.7,7.08,1.3);this.line({x:till.x-k*.13,y:till.y},{x:till.x+k*.1,y:till.y},'#b8d3a1',Math.max(1,k*.055));
    const stock=this.game.state.market.stock;
    const goods=stock.milk>0?['wheat','egg','flour','apple','milk']:['wheat','egg','flour','apple'];goods.forEach((g,i)=>{const xx=(i-(goods.length-1)/2)*(goods.length===5?.81:.95);this.box(xx,6.95,.76,.55,.18,'#c49a63','#ad7e45','#8f6438',.99);const at=this.project(xx,6.95,1.2);if(stock[g]>0)this.goods(at.x,at.y,g,Math.min(3,stock[g]),k/24);});
  }
  wheel(x,z,y){
    if(Math.sin(this.localViewAngle())<0)return;
    const c=this.ctx,p=this.project(x,z,y),r=this.scale*.78;c.save();c.translate(p.x,p.y);c.scale(.78,1);c.rotate(this.time*(this.game.state.machines.mill.working?1.8:.16));c.strokeStyle='#92684a';c.lineWidth=this.scale*.12;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();
    for(let i=0;i<8;i++){const a=i*Math.PI/4;this.line({x:Math.cos(a)*r,y:Math.sin(a)*r},{x:0,y:0},'#b78d60',this.scale*.09);}
    this.ellipse({x:0,y:0},this.scale*.15,this.scale*.15,'#b99260');c.restore();
  }
  pond(x=16,z=-10,w=4.6,d=3.4){
    if(!this.visible(x,z,Math.max(w,d),1.5))return;
    const c=this.ctx,k=this.scale,p=this.project(x,z,.07),rx=w*k*.5,ry=d*k*.5;
    this.shadow(x,z,w*.49,d*.34);this.ellipse(p,rx*1.08,ry*1.06,'#a1a76b');this.ellipse({x:p.x,y:p.y-k*.04},rx,ry,'#d4cd96');this.ellipse({x:p.x,y:p.y-k*.07},rx*.91,ry*.88,'#489a9d');this.ellipse({x:p.x-k*.07,y:p.y-k*.16},rx*.86,ry*.79,'#66b9bd');this.ellipse({x:p.x-rx*.12,y:p.y-ry*.2},rx*.65,ry*.5,'#83cdd0');
    c.save();c.beginPath();c.ellipse(p.x,p.y,rx*.87,ry*.81,0,0,Math.PI*2);c.clip();
    for(let i=0;i<3;i++){const t=(this.time*.18+i*.33)%1;c.globalAlpha=(1-t)*.45;c.strokeStyle='#d9f1d8';c.lineWidth=Math.max(.7,k*.035);c.beginPath();c.ellipse(p.x-rx*.17,p.y-ry*.03,rx*(.22+t*.75),ry*(.12+t*.64),0,0,Math.PI*2);c.stroke();}
    c.globalAlpha=.55;this.line({x:p.x-rx*.45,y:p.y-ry*.38},{x:p.x-rx*.12,y:p.y-ry*.47},'#e1f6de',Math.max(1,k*.065));c.restore();
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9,xx=p.x+Math.cos(a)*rx*.99,yy=p.y+Math.sin(a)*ry*.94,r=k*(.17+random(i+42)*.11);this.ellipse({x:xx,y:yy},r*1.12,r*.68,'#829573');this.ellipse({x:xx-r*.1,y:yy-r*.25},r*.91,r*.5,'#b7bf92');}
    for(let i=0;i<3;i++){const xx=p.x+rx*(.3+i*.15),yy=p.y+ry*(.2-i*.16);this.ellipse({x:xx,y:yy},k*.23,k*.12,'#407f65');this.ellipse({x:xx-k*.02,y:yy-k*.03},k*.21,k*.095,'#9ac76e');}
    const s=k/21,dx=p.x+Math.sin(this.time*.3)*rx*.28,dy=p.y+Math.cos(this.time*.3)*ry*.15;this.ellipse({x:dx,y:dy+3*s},8*s,2.1*s,'#3e8b8b40');this.ellipse({x:dx,y:dy},6.6*s,4*s,'#edce87');this.ellipse({x:dx-s,y:dy-s},5.5*s,3.1*s,'#fff2b9');this.ellipse({x:dx+4.4*s,y:dy-4.3*s},3*s,3.2*s,'#fff6ce');this.poly([{x:dx+6*s,y:dy-4*s},{x:dx+10*s,y:dy-3*s},{x:dx+6*s,y:dy-2*s}],'#e7a13c');this.ellipse({x:dx+5*s,y:dy-4.6*s},.6*s,.7*s,'#3d5140');
    if(k>12)for(let i=0;i<4;i++){const xx=x-w*.43+random(i)*.3,zz=z+d*.35+random(i+5)*.35;this.line(this.project(xx,zz,.05),this.project(xx+.06,zz,.7+random(i)*.35),'#6a9255',Math.max(.8,k*.035));this.line(this.project(xx+.06,zz,.67+random(i)*.35),this.project(xx+.06,zz,.83+random(i)*.35),'#9d7847',Math.max(1.5,k*.075));}
  }
  purchasePad(p){
    if(!p.available&&p.unlocked||!this.visible(p.x,p.z,2,1))return;const afford=p.available&&this.game.state.coins>=p.price;
    const c=this.ctx,points=this.floorTarget(p.x,p.z,2.25,2.25,.16),centre=this.project(p.x,p.z,.17),pulse=.65+Math.sin(this.time*2.7+p.x)*.35;
    c.save();this.shadow(p.x,p.z,1.19,.46);
    if(afford&&this.scale>9){c.shadowColor='#ffcb1c';c.shadowBlur=8+6*pulse;this.ground(p.x,p.z,2.34,2.34,'#ffd02f',null,.1);c.shadowBlur=0;}
    if(p.available){
      this.box(p.x,p.z,2.25,2.25,.12,'#ffd23e','#c88b10','#e3a213',.04);
      const gold=c.createLinearGradient(points[0].x,points[0].y,points[2].x,points[2].y);
      gold.addColorStop(0,afford?'#ffe989':'#ffe167');gold.addColorStop(.45,afford?'#ffd022':'#efbf32');gold.addColorStop(1,afford?'#ffb500':'#dfaa22');
      this.poly(points,gold,'#fff3aa',Math.max(1.5,this.scale*.085));
      this.ground(p.x,p.z,1.96,1.96,null,'#f9e791',.17);
      this.line(points[0],points[1],'#fffbd2',Math.max(1,this.scale*.065));this.line(points[2],points[3],'#bf8317',Math.max(.7,this.scale*.04));
      if(afford){
        c.save();c.beginPath();points.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.clip();
        const span=this.scale*4,slide=((this.time*.25+p.x*.07+p.z*.03)%1+1)%1,shineX=centre.x+(slide-.5)*span*2;
        const sheen=c.createLinearGradient(shineX-span*.3,centre.y-span*.4,shineX+span*.3,centre.y+span*.4);
        sheen.addColorStop(0,'#ffffff00');sheen.addColorStop(.46,'#fff8c900');sheen.addColorStop(.5,'#fffce0bb');sheen.addColorStop(.54,'#fff8c900');sheen.addColorStop(1,'#ffffff00');
        c.fillStyle=sheen;c.fillRect(centre.x-span,centre.y-span,span*2,span*2);c.restore();
        for(let i=0;i<2;i++){
          const wave=Math.sin(this.time*3.5+i*2.9+p.x),corner=points[i?1:3],r=(2+wave)*clamp(this.scale/20,.45,1.3);
          if(wave>.1){this.poly([{x:corner.x,y:corner.y-r*2.1},{x:corner.x+r*.6,y:corner.y-r*.6},{x:corner.x+r*2.1,y:corner.y},{x:corner.x+r*.6,y:corner.y+r*.6},{x:corner.x,y:corner.y+r*2.1},{x:corner.x-r*.6,y:corner.y+r*.6},{x:corner.x-r*2.1,y:corner.y},{x:corner.x-r*.6,y:corner.y-r*.6}],'#fffbd0');}
        }
      }
      drawFarmIcon(c,p.id,centre.x,centre.y,clamp(this.scale*.9,10,27),afford?'#fffde2':'#fff1b8');
    }else{
      this.poly(points,'#c0c08455','#e9c66b',Math.max(1.2,this.scale*.065));
      c.setLineDash([4,4]);this.ground(p.x,p.z,1.97,1.97,null,'#f3dc9d',.17);c.setLineDash([]);
      drawFarmIcon(c,'lock',centre.x,centre.y,clamp(this.scale*.7,9,20),'#9e8546');
    }
    c.restore();
    if(p.progress>0)this.ring(p.x,p.z,1.45,'#fff9cb',4,p.progress);
    if(p.active||this.game.state.activePad===p.id){const progress=clamp(p.progress||0,0,1);this.ground(p.x,p.z+.76,1.78,.25,'#805d21','#fff3b8',.185);if(progress>0)this.ground(p.x-.84+.84*progress,p.z+.76,1.68*progress,.15,'#fff3a0',null,.19);}
  }
  interaction(x,z,w,d,color){this.ground(x,z,w,d,color,'#fff5d6',.1);this.floorTarget(x,z,w,d,.1);}
  groundWorld(){
    const c=this.ctx;this.drawBackground();
    const middle=this.project(0,0,-1);this.ellipse({x:middle.x+this.scale*.5,y:middle.y+this.scale*.5},this.scale*21.5,this.scale*13.7,'#4c795b15');
    this.box(0,0,43,36,.72,'#93bd67','#6f9247','#5e8243',-.78);this.ground(0,0,42.7,35.7,'#b3d47f','#c4dd95',.005);this.ground(0,0,41.5,34.5,'#8dbf62',null,.025);this.grassTexture(41.5,34.5);
    for(const [x,z,w,d]of[[0,2.6,37,3.6],[0,-.5,3.6,26],[-16,-4,3,13],[10,-3,16,3],[-11,7,4,10],[8,8,3.6,10],[1.5,7.3,10,4.2]]){this.ground(x,z,w+.12,d+.12,'#bb9f6c55',null,.035);this.ground(x,z,w,d,C.path,null,.045);}
    this.fieldBed(-10,-6,10.4,8.4);
    for(let i=0;i<38;i++){const p=this.project(-18+random(i)*36,1.2+random(i+23)*2.6,.055);this.ellipse(p,(.06+random(i+3)*.04)*this.scale,.028*this.scale,'#fff2c17a');}
    this.pond();
    this.interaction(0,5,2.2,1.7,'#b5d681');
    for(const p of this.game.getPads())this.purchasePad(p);
    const {coop,mill}=this.game.state.machines;
    for(const m of[coop,mill])if(m.unlocked){this.interaction(m.input.x,m.input.z,1.65,1.6,'#d9bc68');this.interaction(m.output.x,m.output.z,1.7,1.6,'#acd07e');}
    const target=this.game.state.objective?.target;if(target)this.ring(target.x,target.z,1.3+Math.sin(this.time*2)*.08,'#fff2aa',3);
  }
  render(dt=.016){
    dt=clamp(Number(dt)||0,0,.05);this.time+=dt;this.scale=this.baseScale*this.zoom;this.hitRects=[];
    const s=this.game.state,p=s.player,lerp=1-Math.exp(-dt*5);
    if(this.follow){this.focus.x+=(p.x-this.focus.x)*lerp;this.focus.z+=(p.z-this.focus.z)*lerp;}
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.lineCap='round';c.lineJoin='round';this.groundWorld();
    const basis=this.cameraBasis(),draw=[],add=(x,z,fn,bias=0)=>draw.push({depth:x*basis.s+z*basis.c+bias,fn});
    add(-13,-13,()=>this.building(-13,-13,5.2,3.2,2.8,'#db936a','#e28a61','barn'));
    add(-17,-13.8,()=>this.fence(-19,-13.8,-5,-13.8));
    add(14,-15,()=>this.fence(5,-15,20,-15));
    add(-20,-3,()=>this.fence(-20,-12,-20,6));
    add(-9,16,()=>this.fence(-18,16,1,16));
    this.trees.forEach(([x,z,k])=>add(x,z,()=>this.tree(x,z,k)));
    s.crops.forEach((crop,i)=>add(crop.x,crop.z,()=>this.crop(crop,i)));
    for(let i=0;i<24;i++){const x=-19+random(i+31)*38,z=i%2?-16:15.5;if(Math.abs(x)<3)continue;add(x,z,()=>this.flower(x,z,i));}
    add(0,7,()=>this.market());
    const co=s.machines.coop,mi=s.machines.mill;
    add(10,-7,()=>co.unlocked?this.building(10,-7,3.2,2.3,1.65,'#e3be7a','#8fa67b','coop'):this.blueprint(10,-7,3.5,2.7,'HENS, COMING SOON'));
    add(-12,10,()=>{if(mi.unlocked){this.building(-12,10,3.8,2.8,2.3,'#e3c899','#b0b29b','mill');this.wheel(-9.9,10.5,1.1);}else this.blueprint(-12,10,4,3,'FRESH FLOUR');});
    if(!s.upgrades.orchard)add(11,11,()=>this.blueprint(11,11,6.6,6,'THE ORCHARD'));
    if(co.unlocked)for(let i=0;i<4;i++){const x=8.8+i*.75,z=-4.5+Math.sin(this.time*.7+i)*.4;add(x,z,()=>this.chicken(x,z,i));}
    for(const m of[co,mi])if(m.unlocked&&m.stock>0)add(m.output.x,m.output.z,()=>{const out=this.project(m.output.x,m.output.z,.35);this.goods(out.x,out.y,m.good||'flour',Math.min(m.stock,6),this.scale/22);});
    s.customers.forEach((q,i)=>add(q.x,q.z,()=>this.person(q,'customer',Number(q.color)||i)));
    s.workers.forEach((q,i)=>add(q.x,q.z,()=>this.person(q,q.role,i+10)));
    add(p.x,p.z,()=>this.person(p,'player',1),.02);
    draw.sort((a,b)=>a.depth-b.depth).forEach(o=>o.fn());
    this.labels();this.drawEffects(dt);
    this.drawFinish();
  }
  labels(){
    const s=this.game.state,near=(x,z)=>Math.hypot(x-s.player.x,z-s.player.z)<4.5;
    if(this.zoom>=.5||near(0,5))this.badge(0,5,'sell',this.zoom>=.65?'SELL':'',{y:.75,small:true,fill:'#f4f9d9',border:'#93b76d'});
    for(const p of this.game.getPads()){
      if(!p.available&&p.unlocked)continue;
      const close=near(p.x,p.z);if(this.zoom<.45&&!close)continue;
      const afford=p.available&&s.coins>=p.price;
      const priced=p.available&&(this.zoom>=.8||close);
      this.badge(p.x,p.z,p.id,priced?p.price:'',{y:1.15,coin:priced,lock:!p.available,gold:p.available,fill:'#e7dfad',border:'#c0ac63',color:afford?'#684009':p.available?'#946117':'#8d7945',small:this.zoom<.8});
    }
    for(const m of[s.machines.coop,s.machines.mill])if(m.unlocked){
      if(this.zoom>=.6||near(m.input.x,m.input.z))this.badge(m.input.x,m.input.z,'wheat',m.feed,{y:.7,small:true,fill:'#fff2c6',border:'#d3b963'});
      if(this.zoom>=.6||near(m.output.x,m.output.z))this.badge(m.output.x,m.output.z,m.good,m.stock,{y:.95,small:true,fill:'#f2f8da',border:'#a8c77b'});
    }
    const target=s.objective?.target;
    if(target){
      const pp=this.project(target.x,target.z,2.45+Math.sin(this.time*3)*.12);
      this.hitRects.push({left:pp.x-14,right:pp.x+14,top:pp.y-14,bottom:pp.y+10,x:target.x,z:target.z});
      this.poly([{x:pp.x-7,y:pp.y-12},{x:pp.x+7,y:pp.y-12},{x:pp.x+7,y:pp.y-5},{x:pp.x+12,y:pp.y-5},{x:pp.x,y:pp.y+7},{x:pp.x-12,y:pp.y-5},{x:pp.x-7,y:pp.y-5}],'#f2d56d','#fff2b1',2);
    }
  }
  effect(event){
    const p=this.game.state.player,x=Number.isFinite(event.x)?event.x:p.x,z=Number.isFinite(event.z)?event.z:p.z;
    if(event.type==='move'){this.effects.push({type:'ring',x,z,t:0,duration:.7});return;}
    if(!['harvest','deposit','sell','cash','purchase','milestone'].includes(event.type))return;
    if(event.type==='harvest'||event.type==='deposit'){
      this.actorReactions??=new Map();let nearest=null,distance=2.8;for(const [actor,key]of[[p,'player'],...(this.game.state.workers||[]).map(w=>[w,w.id||'runner'])]){const d=Math.hypot(actor.x-x,actor.z-z);if(d<distance){distance=d;nearest=key;}}
      if(nearest)this.actorReactions.set(nearest,{at:this.time,type:event.type});
      for(const[key,value]of this.actorReactions)if(this.time-value.at>2)this.actorReactions.delete(key);
    }
    const big=event.type==='purchase'||event.type==='milestone',cash=event.type==='cash'||event.type==='sell',n=big?24:cash?7:5,serial=++this.visualSerial;
    if(big)this.effects.push({type:'burst',x,z,t:0,duration:.8});
    for(let i=0;i<n;i++){const a=random(serial*29+i)*Math.PI*2,v=big?1.5+random(i+serial)*3:.6+random(i+serial)*1.4;this.effects.push({type:'particle',shape:cash?'coin':big?'spark':'leaf',x,z,y:cash?.5:1.05,vx:Math.cos(a)*v,vz:Math.sin(a)*v,vy:1.8+random(serial+i*9)*3,t:0,duration:big?1.3:.8,size:big?1.2:1,color:(big?['#f5c63b','#f29a65','#a5cf6d','#fff0b0']:cash?['#efb62e','#ffdc6a']:['#e7b840','#fff0a1'])[i%(big?4:2)]});}
    if(event.type==='harvest'||event.type==='deposit')this.effects.push({type:'produce',good:event.good||'wheat',x,z,y:1.2,t:0,duration:.6,deposit:event.type==='deposit'});
    if(event.type==='cash'||event.type==='sell')this.effects.push({type:'text',x,z,y:2.8,t:0,duration:1.6,text:'+'+(event.amount||0)});
    if(this.effects.length>250)this.effects.splice(0,this.effects.length-250);
  }
  drawEffects(dt){
    const c=this.ctx;
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.t+=dt;if(e.t>=e.duration){this.effects.splice(i,1);continue;}c.save();const q=e.t/e.duration;c.globalAlpha=clamp((1-q)*3,0,1);
      if(e.type==='ring')this.ring(e.x,e.z,.3+e.t*.6,'#fff2be',2);
      else if(e.type==='burst'){c.globalAlpha=(1-q)*.65;this.ring(e.x,e.z,.4+q*3,'#ffe78a',Math.max(1,this.scale*.12*(1-q)));}
      else if(e.type==='particle'){
        e.x+=e.vx*dt;e.z+=e.vz*dt;e.y+=e.vy*dt;e.vy-=6*dt;const pp=this.project(e.x,e.z,e.y),size=clamp(this.scale/15,.6,2.2)*e.size;c.translate(pp.x,pp.y);c.rotate(e.t*5);
        if(e.shape==='coin'){this.ellipse({x:0,y:0},size*2.3*(.55+.45*Math.abs(Math.cos(e.t*13))),size*2.6,e.color,'#fff0a9');this.line({x:0,y:-size},{x:0,y:size},'#b78022',size*.5);}
        else if(e.shape==='spark')this.sparkle(0,0,size*2.3,e.color);
        else this.ellipse({x:0,y:0},size*.9,size*2.2,e.color);
      }else if(e.type==='produce'){const pos=this.project(e.x,e.z,e.y+(e.deposit?-q*.5:Math.sin(q*Math.PI)*.7));this.goods(pos.x,pos.y,e.good,1,clamp(this.scale/26,.5,1.8));}
      else{e.y+=dt*.65;this.label(e.x,e.z,e.text,{y:e.y,font:12,fill:'#fff1b8',border:'#dfb94c'});}
      c.restore();
    }
  }
}
