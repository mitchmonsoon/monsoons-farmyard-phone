// Original dairy art shared by the illustrated game and world builder.
// All world-space features use the renderer's current camera projection.
import { drawFarmIcon } from './pad-icons.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function drawMilkGoods(renderer,x,y,count=1,scale=1){
  const r=renderer,c=r.ctx,s=Number.isFinite(scale)?Math.max(.05,scale):1;
  for(let i=0;i<Math.min(12,Math.max(0,count));i++){
    const px=x+Math.sin((r.time||0)*3+i*.14)*.3*s,py=y-i*8.8*s;
    c.fillStyle='#377d6b';c.beginPath();c.roundRect(px-8*s,py-2.5*s,16*s,4.2*s,1.2*s);c.fill();
    for(const offset of[-4,4]){
      const xx=px+offset*s;
      c.fillStyle='#cbd8c9';c.beginPath();c.roundRect(xx-2.5*s,py-9*s,5*s,7.9*s,1.3*s);c.fill();
      c.fillStyle='#fff0d5';c.beginPath();c.roundRect(xx-2.2*s,py-9.1*s,3.8*s,7.6*s,1.1*s);c.fill();
      r.ellipse({x:xx,y:py-9*s},2.3*s,.85*s,'#fff9e3');
      c.fillStyle='#dde6d4';c.fillRect(xx-1.5*s,py-10.5*s,3*s,1.7*s);
      r.ellipse({x:xx,y:py-10.55*s},2*s,.7*s,'#4c907b','#a7cbaf');
      r.ellipse({x:xx,y:py-11.2*s},.65*s,.45*s,'#91bbaa');
      c.fillStyle='#579b85';c.fillRect(xx-2.35*s,py-6.3*s,4.7*s,2.2*s);
      c.fillStyle='#fff1d4';c.beginPath();c.moveTo(xx,py-6*s);c.quadraticCurveTo(xx-1.25*s,py-4.6*s,xx,py-4.5*s);c.quadraticCurveTo(xx+1.25*s,py-4.6*s,xx,py-6*s);c.fill();
      for(const side of[-1,1]){
        r.line({x:xx+side*2.2*s,y:py-8.2*s},{x:xx+side*3.1*s,y:py-7.7*s},'#8ba899',.65*s);
        r.line({x:xx+side*3.1*s,y:py-7.7*s},{x:xx+side*2.6*s,y:py-6.2*s},'#8ba899',.65*s);
      }
      r.line({x:xx-1.3*s,y:py-8.1*s},{x:xx-1.3*s,y:py-6.7*s},'#fffce9',.8*s);
    }
    c.fillStyle='#72af94';c.fillRect(px-8*s,py-1.1*s,16*s,1.7*s);
    for(const xx of[-7,7]){c.fillStyle='#a4c9a8';c.fillRect(px+xx*s,py-3.2*s,1.2*s,4.3*s);}
    r.line({x:px-7*s,y:py+.6*s},{x:px+7*s,y:py+.6*s},'#b4d5b2',.6*s);
  }
}

// phase is a stable animation seed; heading is optional and faces local +X.
export function drawCow(renderer,x,z,phase=0,size=1,heading=0,feeding=false){
  const r=renderer,c=r.ctx,k=r.scale*size;
  if(!Number.isFinite(k)||k<=0||r.visible&&!r.visible(x,z,1.8*size,2*size))return;
  const ca=Math.cos(heading),sa=Math.sin(heading),time=r.time||0;
  const point=(u,v,h)=>r.project(x+(u*ca-v*sa)*size,z+(u*sa+v*ca)*size,h*size);
  const depth=(u,v)=>point(u,v,0).y,cream='#fff0d3',patch=phase>1?'#604c40':'#354d43';
  const bob=Math.sin(time*1.5+phase)*.025-(feeding?.12:0),nearSide=depth(0,.3)>=depth(0,-.3)?1:-1;
  r.shadow(x,z,.95*size,.34*size);
  const parts=[];
  for(const u of[-.47,.45])for(const v of[-.28,.28])parts.push({d:depth(u,v),draw:()=>{
    const step=Math.sin(time*2.2+phase+u*2+v)*.025,a=point(u,v,.77),b=point(u+step,v,.13),hoof=point(u+.025+step,v,.08);
    r.line(a,b,'#d8cba9',Math.max(1,k*.16));r.line({x:a.x-k*.025,y:a.y},b,cream,Math.max(.7,k*.10));
    r.ellipse(hoof,k*.11,k*.075,patch);
  }});
  parts.push({d:depth(-.83,0),draw:()=>{
    const a=point(-.73,0,1.13),b=point(-.91,.04,.73),tip=point(-1.0,.10+Math.sin(time*2+phase)*.10,.57);
    r.line(a,b,cream,Math.max(.7,k*.055));r.line(b,tip,cream,Math.max(.7,k*.045));r.ellipse(tip,k*.065,k*.11,patch);
  }});
  parts.push({d:depth(0,0)+.01,draw:()=>{
    const udder=point(.1,0,.55);r.ellipse(udder,k*.23,k*.11,'#dba58d');
    const a=point(-.43,0,.98),b=point(.43,0,.98);
    r.line({x:a.x,y:a.y+k*.035},{x:b.x,y:b.y+k*.035},'#cbbd96',k*.86);r.line(a,b,cream,k*.83);
    r.line(point(-.43,0,1.10),point(.34,0,1.10),'#fff9e0',k*.55);
    r.ellipse(point(-.27,nearSide*.35,1.03),k*.21,k*.24,patch);r.ellipse(point(.33,nearSide*.32,1.1),k*.14,k*.17,patch);r.ellipse(point(-.07,0,1.38),k*.21,k*.07,patch);
    const collarA=point(.58,-.24,1.12),collarB=point(.58,.24,1.12);r.line(collarA,collarB,'#398d78',Math.max(1,k*.10));
    r.ellipse(point(.64,nearSide*.04,.79),k*.07,k*.09,'#f0bd43','#b98b35');
  }});
  parts.push({d:depth(.93,0),draw:()=>{
    const head=point(.79,0,1.19+bob),muzzle=point(1.04,0,1.04+bob);
    for(const side of[-1,1]){
      const ear=point(.69,side*.38,1.29+bob);r.ellipse(ear,k*.14,k*.07,patch);r.ellipse({x:ear.x,y:ear.y-k*.014},k*.085,k*.035,'#e7b39a');
      r.line(point(.72,side*.18,1.45+bob),point(.64,side*.23,1.64+bob),'#ddc28f',Math.max(1,k*.055));
    }
    r.ellipse({x:head.x,y:head.y+k*.02},k*.29,k*.34,'#d3c6a4');r.ellipse(head,k*.275,k*.33,cream);
    r.ellipse(point(.75,-.14,1.31+bob),k*.15,k*.16,patch);
    for(const side of[-1,1]){
      const eye=point(.94,side*.17,1.32+bob);r.ellipse(eye,k*.052,k*.063,'#fffde7');
      const blink=(time+phase)%7.1<.12;
      if(blink)r.line({x:eye.x-k*.025,y:eye.y},{x:eye.x+k*.025,y:eye.y},'#2d4235',Math.max(.6,k*.025));
      else{r.ellipse(eye,k*.027,k*.038,'#2d4235');r.ellipse({x:eye.x-k*.008,y:eye.y-k*.014},k*.009,k*.012,'#ffffff');}
    }
    r.ellipse(muzzle,k*.235,k*.15,'#dea48c');r.ellipse({x:muzzle.x-k*.02,y:muzzle.y-k*.025},k*.215,k*.13,'#f4c5a6');
    for(const side of[-1,1])r.ellipse(point(1.20,side*.09,1.08+bob),k*.024,k*.033,'#a7725f');
    const smile=point(1.16,0,.98+bob);c.strokeStyle='#bd8b71';c.lineWidth=Math.max(.55,k*.023);c.beginPath();c.arc(smile.x,smile.y,k*.07,.15,Math.PI-.15);c.stroke();
  }});
  parts.sort((a,b)=>a.d-b.d);for(const part of parts)part.draw();
}

export function drawDairy(renderer,node,state={}){
  if(!renderer.withNode){
    const local=Object.create(renderer),a=(node.rotation||0)*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
    local.project=(x,z,y=0)=>renderer.project(node.x+x*ca-z*sa,node.z+x*sa+z*ca,y);
    local.withNode=(_node,draw)=>draw();
    return drawDairy(local,{...node,x:0,z:0,rotation:0},state);
  }
  const r=renderer;
  if(r.visible&&!r.visible(node.x,node.z,Math.max(node.width,node.depth)*.8,4))return;
  const sx=(node.width||6)/6,sz=(node.depth||5)/5,cowSize=clamp(Math.sqrt(sx*sz),.5,1.6);
  const draw=()=>{
    r.ground(0,0,6*sx,5*sz,'#bec08b','#d6cf9d',.055);r.ground(1.38*sx,0,2.8*sx,4.5*sz,'#90b76b',null,.065);
    const parts=[],add=(x,z,fn)=>parts.push({d:r.project(x*sx,z*sz,0).y,fn});
    add(1.44,-2.25,()=>r.fence(.05*sx,-2.25*sz,2.82*sx,-2.25*sz));
    add(2.82,0,()=>r.fence(2.82*sx,-2.25*sz,2.82*sx,2.20*sz));
    add(1.44,2.20,()=>r.fence(.05*sx,2.20*sz,2.82*sx,2.20*sz));
    add(1.15,-1.84,()=>{
      r.box(1.15*sx,-1.84*sz,1.65*sx,.52*sz,.32,'#c2a568','#997343','#795a36',.06);
      for(const x of[.68,1.25,1.72]){const p=r.project(x*sx,-1.84*sz,.43);r.goods(p.x,p.y,'wheat',1,r.scale*.65/21);}
    });
    add(2.23,1.53,()=>{const p=r.project(2.23*sx,1.53*sz,.16);r.ellipse(p,r.scale*.36*sx,r.scale*.20*sz,'#7d9e89');r.ellipse({x:p.x,y:p.y-r.scale*.08},r.scale*.31*sx,r.scale*.14*sz,'#8bcac9','#c8ddbd');});
    add(-1.45,-.15,()=>{
      r.building(-1.45*sx,-.15*sz,2.6*sx,3.7*sz,2.3,'#eeddb3','#4d9780','dairy');
      // The physical milk sign follows the front wall and disappears behind it.
      if(r.project(0,.1,0).y>=r.project(0,-.1,0).y){
        const p=r.project(-1.45*sx,1.76*sz,1.94),c=r.ctx,k=r.scale;
        c.save();c.fillStyle='#367b69';c.beginPath();c.roundRect(p.x-k*.43,p.y-k*.24,k*.86,k*.48,k*.06);c.fill();drawFarmIcon(c,'milk',p.x,p.y,k*.37,'#fff1cc');c.restore();
      }
    });
    const time=r.time||0,ax=(1.03+Math.sin(time*.22+.4)*.09)*sx,az=(-.48+Math.cos(time*.2+.4)*.18)*sz,bx=(1.44+Math.sin(time*.22+2.8)*.09)*sx,bz=(1.08+Math.cos(time*.2+2.8)*.18)*sz;
    add(ax,az,()=>drawCow(r,ax,az,.4,.66*cowSize,.13+Math.sin(time*.19+.4)*.10,state?.working));
    add(bx,bz,()=>drawCow(r,bx,bz,2.8,.60*cowSize,Math.PI-.12+Math.sin(time*.19+2.8)*.10,state?.working));
    add(-.55,1.94,()=>{const p=r.project(-.55*sx,1.94*sz,.2);drawMilkGoods(r,p.x,p.y,1,r.scale/21);});
    parts.sort((a,b)=>a.d-b.d);for(const part of parts)part.fn();
    if(state?.working&&r.scale>14){const at=r.project(-1.5*sx,-.2*sz,3.35);if(Math.sin((r.time||0)*3)>.85)r.sparkle(at.x,at.y,r.scale*.08,'#fff5c8');}
  };
  r.withNode(node,draw);
}
