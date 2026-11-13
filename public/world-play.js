import { WorldGame } from './world-engine.js';
import { WorldRenderer } from './world-renderer.js';
import { bindFarmPointerControls } from './touch-camera.js';
import { normalizeWorld, goodsFor } from './world-schema.js';
import { icon } from './ui.js';
import { mountCameraControls } from './camera-ui.js';
import { FarmDesk } from './farm-desk.js';
import { FarmSoundscape } from './farm-audio.js';
import { loadWorldProgress, saveWorldProgress, saveWorldPackage, captureRecovery, savedLabel } from './save-history.js';

const PREF_KEY='monsoons-farmyard-preferences';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const editable=e=>e.target instanceof Element&&e.target.closest('input,select,textarea,[contenteditable="true"]');

export class WorldPlay {
  constructor(container,world,{onEdit=()=>{},onImportWorld=()=>{}}={}){
    this.container=container;this.world=normalizeWorld(world);this.onEdit=onEdit;this.onImportWorld=onImportWorld;this.active=true;this.paused=false;this.soundOn=true;this.routes=false;this.keys=new Set();this.path=[];this.stick={x:0,y:0};this.events=new AbortController();this.last=performance.now();this.saveAt=0;this.uiAt=0;this.toastAt=0;this.audio=null;this.lastSound=0;this.destroyed=false;this.lastStart=false;
    this.preferences={sound:true,volume:.35,ambience:true,statusSigns:true};try{this.preferences={...this.preferences,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')};}catch{}
    if(!Number.isFinite(this.preferences.volume))this.preferences.volume=.35;
    this.soundOn=this.preferences.sound!==false;this.soundscape=new FarmSoundscape({enabled:this.soundOn,volume:this.preferences.volume,ambience:this.preferences.ambience});
    const loaded=loadWorldProgress(localStorage,world.id);this.saveError=loaded.ok?'':loaded.message;this.lastSavedAt=0;this.lastSaveWarning=0;
    this.game=new WorldGame(this.world,loaded.state);this.goods=goodsFor(this.world);
    container.innerHTML=`<div class="wp-stage" tabindex="-1"></div><div class="wp-hud"><div class="wp-title"><span class="wp-live-dot"></span><strong>${esc(world.name)}</strong></div><div class="wp-wallet"><span class="wp-coin-art" aria-hidden="true">${icon('coin')}</span> <b id="wp-coins">0</b></div><button type="button" data-play="sound" aria-label="Mute sound" title="Sound">${icon('sound')}</button><button type="button" data-play="pause" aria-label="Pause custom farm" title="Pause">${icon('pause')}</button><button type="button" data-play="menu" aria-label="Farm options" title="Farm options">${icon('settings')}</button></div><button type="button" class="wp-objective" data-play="book" title="Your next farm step"><span></span><i></i></button><aside class="wp-order" aria-label="Current customer order" hidden></aside><div class="wp-bottom"><div class="wp-bag" aria-live="off"><span class="wp-bag-art" aria-hidden="true">${icon('bag')}</span><b id="wp-bag">0 / 18</b><small id="wp-goods"></small><div class="wp-bag-track" aria-hidden="true"><i></i></div></div><button class="wp-book-button" type="button" data-play="desk:board" aria-label="Open farm noticeboard">✦<span>Noticeboard</span></button><button class="wp-book-button" type="button" data-play="book" aria-label="Open growing farm book">${icon('book')}<span>Farm book</span></button><div class="wp-controls"><button type="button" data-play="routes" aria-label="Show helper routes" title="Helper routes">${icon('routes')}</button><button type="button" data-play="fit" aria-label="View whole farm" title="Whole farm">${icon('expand')}</button><button type="button" data-play="out" aria-label="Zoom out custom farm">${icon('minus')}</button><button type="button" data-play="in" aria-label="Zoom in custom farm">${icon('plus')}</button></div></div><div class="wp-pad-status" hidden><strong></strong><span></span><div><i></i></div></div><div class="wp-stick" role="group" aria-label="Touch movement"><span></span></div><div class="wp-toast" role="status"></div><div class="wp-paused" hidden><b>Taking a breather.</b><button type="button" data-play="pause">Keep farming</button></div><dialog class="wp-dialog"><div class="wp-dialog-head"><h2>Your farm</h2><button data-play="close" aria-label="Close farm options">×</button></div><div class="wp-book" hidden></div><div class="wp-menu"><button data-play="edit">✎ Edit this world</button><button data-play="export">↓ Export world + progress</button><button data-play="import">↑ Import world + progress</button><button data-play="help">? Controls</button><button data-play="restart">↻ Restart this farm</button></div><p class="wp-help" hidden>Walk with WASD, arrows or a gamepad. Cut hay, feed hens or cows, and collect their produce. Drop goods at SELL to fill customer orders. Payments go straight into your coin total. Customer clocks only count while you play. Urgent contracts start after you accept. Stand on gold squares to unlock more. Camera: right-drag to orbit, Shift-drag or middle-drag to pan, Q/E to turn, R to reset. On touch, two fingers pan, pinch and twist.</p><small class="wp-save-note">Autosaves every 4 seconds on this device.</small></dialog><input class="wp-import" type="file" accept=".json,application/json" hidden>`;
    container.querySelector('.wp-wallet').insertAdjacentHTML('afterend',`<div class="wp-reputation" title="Farm reputation" aria-label="Farm reputation"><span>★</span><b>70</b></div>`);
    container.querySelector('.wp-order').insertAdjacentHTML('afterend',`<div class="wp-rush" hidden>⚡ Rush hour · <b>+15% orders</b> · <span></span></div>`);
    container.querySelector('.wp-hud').insertAdjacentHTML('beforeend',`<button class="wp-save-light" type="button" data-play="desk:saves" aria-label="Save status and recovery">${icon('save')}<span>Autosave</span></button>`);
    container.querySelector('.wp-bottom').insertAdjacentHTML('beforeend',`<button class="wp-near-barn" type="button" data-play="desk:storage" hidden>${icon('barn')}<span>Barn stock</span></button>`);
    this.stage=container.querySelector('.wp-stage');this.renderer=new WorldRenderer(this.stage,{world:this.world,mode:'game'});this.dialog=container.querySelector('dialog');this.desk=new FarmDesk(this);
    const soundButton=container.querySelector('[data-play="sound"]');soundButton.innerHTML=icon(this.soundOn?'sound':'muted');soundButton.setAttribute('aria-label',this.soundOn?'Mute sound':'Enable sound');
    this.camera=mountCameraControls(container,this.renderer,{canInteract:()=>this.active&&!this.dialog.open,onAction:()=>this.clearMovement()});
    container.addEventListener('click',e=>{const b=e.target.closest('[data-play]');if(b)this.action(b.dataset.play);},{signal:this.events.signal});
    container.querySelector('.wp-import').addEventListener('change',e=>this.importSave(e.target.files[0]),{signal:this.events.signal});
    container.addEventListener('change',e=>this.desk.change(e.target),{signal:this.events.signal});
    this.dialog.addEventListener('cancel',()=>{this.paused=false;this.container.querySelector('.wp-paused').hidden=true;this.clear();},{signal:this.events.signal});
    this.bind();this.updateHUD();this.save();if(!loaded.ok)this.toast(loaded.message);else if(this.game.reconciled)this.toast('Your new layout is ready. Existing progress carried over.');
    this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
  }
  bind(){
    const signal=this.events.signal;
    window.addEventListener('keydown',e=>{if(!this.active||editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)&&!this.paused&&!this.dialog.open){e.preventDefault();if(!e.repeat&&!this.pointer?.isCameraGestureActive?.()){this.keys.add(k);this.path=[];this.ensureAudio();}}
      if(e.repeat)return;if(['escape','p'].includes(k)&&!this.dialog.open){e.preventDefault();this.action('pause');}if(k==='m')this.action('sound');if(['+','='].includes(k))this.renderer.setZoom(1);if(['-','_'].includes(k))this.renderer.setZoom(-1);if(k==='f')document.documentElement.requestFullscreen?.().catch(()=>{});if(['q','e','r'].includes(k)&&!this.dialog.open){e.preventDefault();this.clearMovement();if(k==='r')this.renderer.resetCamera();else this.renderer.rotate(k==='q'?-.14:.14);}
    },{signal});
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()),{signal});window.addEventListener('blur',()=>{this.clear();this.save();},{signal});window.addEventListener('pagehide',()=>this.save(),{signal});document.addEventListener('visibilitychange',()=>{this.clear();this.save();},{signal});
    this.pointer=bindFarmPointerControls(this.stage,{canInteract:()=>this.active&&!this.paused&&!this.dialog.open,getZoom:()=>this.renderer.getZoom(),setZoomLevel:z=>this.renderer.setZoomLevel(z),onInteract:()=>this.ensureAudio(),onGestureStart:()=>this.clearMovement(),onGestureEnd:()=>this.clearMovement(),onPan:(x,y)=>this.renderer.pan(x,y),onRotate:a=>this.renderer.rotate(a),onTilt:a=>this.renderer.tilt(a),onTap:(x,y)=>{this.renderer.canvas.focus({preventScroll:true});const p=this.renderer.pointToWorld(x,y);if(!p)return;this.path=this.game.findPath(this.game.state.player,p);if(this.path.length)this.renderer.effect({type:'move',...this.path.at(-1)});else this.toast('There is no walking route to that spot.');}});
    this.stage.addEventListener('wheel',e=>{if(!this.active)return;e.preventDefault();this.renderer.setZoom(e.deltaY<0?.5:-.5);},{passive:false,signal});this.stage.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
    const stick=this.container.querySelector('.wp-stick'),knob=stick.firstElementChild;let pointer=null;
    const move=e=>{if(pointer!==e.pointerId)return;const r=stick.getBoundingClientRect(),radius=r.width*.3;let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,d=Math.hypot(x,y);if(d>radius){x=x/d*radius;y=y/d*radius;}this.stick={x:x/radius,y:y/radius};this.path=[];knob.style.transform=`translate(${x}px,${y}px)`;e.preventDefault();};
    stick.addEventListener('pointerdown',e=>{if(!this.active||this.paused)return;pointer=e.pointerId;stick.setPointerCapture(pointer);this.ensureAudio();move(e);},{signal});stick.addEventListener('pointermove',move,{signal});for(const type of['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(pointer===e.pointerId){pointer=null;this.stick={x:0,y:0};knob.style.transform='';}},{signal});
  }
  clearMovement(){this.keys.clear();this.path=[];this.stick={x:0,y:0};const knob=this.container.querySelector('.wp-stick span');if(knob)knob.style.transform='';}
  clear(){this.clearMovement();this.pointer?.reset();}
  setActive(value){this.active=Boolean(value);this.clear();this.last=performance.now();this.soundscape.setActive(this.active&&!this.paused&&!document.hidden);if(!value)this.save();else this.renderer.resize();}
  action(name){
    if(this.desk.handle(name))return;
    if(name.startsWith('order:')){
      const [,decision,id]=name.split(':'),r=this.game.respondToUrgent(id,decision==='accept');
      if(r.ok){this.toast(r.message);this.save();this.updateHUD();if(this.dialog.open)this.desk.open('orders');}
      else this.toast(r.message);return;
    }
    if(name==='in'||name==='out'){this.renderer.setZoom(name==='in'?1:-1);return;}
    if(name==='fit'){this.clearMovement();this.renderer.fit();return;}
    if(name==='book'){this.desk.open('upgrades');return;}
    if(name.startsWith('buy:')){const result=this.game.buy(name.slice(4));this.toast(result.message);if(result.ok){this.save();this.updateHUD();}this.showBook();return;}
    if(name==='routes'){this.routes=!this.routes;this.renderer.setRoutesVisible(this.routes);this.container.querySelector('[data-play="routes"]').classList.toggle('active',this.routes);return;}
    if(name==='sound'){this.soundOn=!this.soundOn;this.preferences.sound=this.soundOn;this.persistPreferences();const b=this.container.querySelector('[data-play="sound"]');b.innerHTML=icon(this.soundOn?'sound':'muted');b.setAttribute('aria-label',this.soundOn?'Mute sound':'Enable sound');if(this.soundOn)this.ensureAudio();return;}
    if(name==='pause'){this.paused=!this.paused;this.container.querySelector('.wp-paused').hidden=!this.paused;this.clear();this.save();return;}
    if(name==='menu'){this.desk.open('options');return;}
    if(name==='close'){this.dialog.close();this.paused=false;this.container.querySelector('.wp-paused').hidden=true;this.clear();return;}
    if(name==='help'){this.container.querySelector('.wp-help').hidden=!this.container.querySelector('.wp-help').hidden;return;}
    if(name==='edit'){this.save();this.dialog.close();this.paused=false;this.container.querySelector('.wp-paused').hidden=true;this.onEdit(this.world);return;}
    if(name==='export'){this.exportSave();return;}
    if(name==='import'){this.container.querySelector('.wp-import').click();return;}
    if(name==='restart'){
      if(!confirm(`Restart progress in “${this.world.name}”? Its saved layout and your original farm will stay.`))return;
      const kept=captureRecovery(localStorage,this.world.id,{world:this.world,state:this.game.serialize()},{force:true,reason:'Before restarting'});
      if(!kept.ok){this.toast('Export a backup before restarting; a recovery copy could not be kept.');this.desk.open('saves');return;}
      this.game=new WorldGame(this.world);this.renderer.setWorld(this.world);this.renderer.render(0,{...this.game.state,pads:this.game.getPads()});this.renderer.resetCamera();this.save();this.updateHUD();this.action('close');this.toast('Fresh start. Same farm, new adventure.');
    }
  }
  input(){
    if(this.pointer?.isCameraGestureActive?.())return{x:0,z:0};
    let x=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0),y=(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0);
    if(Math.hypot(this.stick.x,this.stick.y)>.08){x=this.stick.x;y=this.stick.y;}
    try{const pad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);if(pad){
      const start=!!pad.buttons[9]?.pressed,desk=!!pad.buttons[3]?.pressed,back=!!pad.buttons[1]?.pressed;
      if(start&&!this.lastStart)this.action(this.dialog.open?'close':'pause');if(desk&&!this.lastDesk&&!this.dialog.open)this.action('book');if(back&&!this.lastBack&&this.dialog.open)this.action('close');
      this.lastStart=start;this.lastDesk=desk;this.lastBack=back;
      if(!this.dialog.open&&!this.paused){if(Math.abs(pad.axes[2]||0)>.2)this.renderer.rotate(pad.axes[2]*.035);if(Math.abs(pad.axes[3]||0)>.2)this.renderer.tilt(pad.axes[3]*.015);
        if(pad.buttons[4]?.pressed)this.renderer.setZoom(-.045);if(pad.buttons[5]?.pressed)this.renderer.setZoom(.045);
        if(Math.hypot(pad.axes[0]||0,pad.axes[1]||0)>.2){x=pad.axes[0];y=pad.axes[1];this.path=[];}}
    }}catch{}
    if(x||y)return this.renderer.direction(x,y);
    const p=this.game.state.player;while(this.path.length&&Math.hypot(this.path[0].x-p.x,this.path[0].z-p.z)<.28)this.path.shift();if(this.path.length){const q=this.path[0],d=Math.hypot(q.x-p.x,q.z-p.z)||1;return{x:(q.x-p.x)/d,z:(q.z-p.z)/d};}
    return{x:0,z:0};
  }
  frame(now){
    if(this.destroyed)return;const dt=Math.min(.2,Math.max(0,(now-this.last)/1000));this.last=now;
    if(this.active&&!document.hidden){let direction=this.input();if(!this.paused&&!this.dialog.open){let left=dt;while(left>.00001){const step=Math.min(.05,left);this.game.update(step,direction);left-=step;if(left>.00001)direction=this.input();}}
      for(const e of this.game.drainEvents()){this.renderer.effect(e);this.playSound(e);if(e.text&&['toast','purchase','contract','late','rush'].includes(e.type))this.toast(e.text);}
      this.renderer.render(Math.min(.05,dt),{...this.game.state,pads:this.game.getPads(),showStatus:this.preferences.statusSigns!==false});if(now>this.uiAt){this.updateHUD();this.uiAt=now+100;}if(now>this.saveAt){this.save();this.saveAt=now+4000;}
    }
    this.soundscape.setActive(this.active&&!document.hidden&&!this.paused&&!this.dialog.open);this.soundscape.tick(now);
    this.raf=requestAnimationFrame(this.frame);
  }
  updateHUD(){
    const s=this.game.state,coins=Math.floor(s.coins),wallet=this.container.querySelector('.wp-wallet');
    if(coins!==this.lastCoins){
      this.container.querySelector('#wp-coins').textContent=coins.toLocaleString();
      wallet.setAttribute('aria-label',coins.toLocaleString()+' coins');
      if(this.lastCoins!==undefined&&coins>this.lastCoins){wallet.classList.remove('bump');void wallet.offsetWidth;wallet.classList.add('bump');}
      this.lastCoins=coins;
    }
    this.container.querySelector('#wp-bag').textContent=`${s.player.bag.length} / ${s.player.capacity}`;
    this.container.querySelector('.wp-bag-track i').style.width=`${Math.min(100,s.player.bag.length/Math.max(1,s.player.capacity)*100)}%`;
    this.container.querySelector('.wp-bag').classList.toggle('full',s.player.bag.length>=s.player.capacity);
    const counts={};for(const g of s.player.bag)counts[g]=(counts[g]||0)+1;
    this.container.querySelector('#wp-goods').textContent=Object.entries(counts).map(([g,n])=>`${this.goodName(g)} ${n}`).join(' · ');
    this.container.querySelector('.wp-bag').setAttribute('aria-label',`${s.player.bag.length} of ${s.player.capacity} carried. `+Object.entries(counts).map(([g,n])=>`${n} ${this.goodName(g)}`).join(', '));
    const objective=this.container.querySelector('.wp-objective'),goal=s.objective||{};
    objective.querySelector('span').textContent=goal.title||'Grow your farm';objective.title=goal.detail||'Your next farm step';objective.querySelector('i').style.width=`${Math.max(0,Math.min(1,goal.progress||0))*100}%`;
    const reputation=this.container.querySelector('.wp-reputation');reputation.hidden=!this.world.settings.pressureEnabled;
    if(this.world.settings.pressureEnabled){reputation.querySelector('b').textContent=s.reputation;reputation.title=`Farm reputation ${s.reputation}/100 · ${s.ordersFailed} late orders · ${s.lateFines} coins in fines`;}
    const rush=this.container.querySelector('.wp-rush'),rushLeft=Math.ceil(s.rushUntil-s.time);rush.hidden=!(this.world.settings.pressureEnabled&&rushLeft>0);
    if(!rush.hidden)rush.querySelector('span').textContent=`${rushLeft}s`;
    const order=this.game.getOrders?.()[0],card=this.container.querySelector('.wp-order');card.hidden=!order;
    if(order){
      const signature=JSON.stringify({...order,secondsLeft:Math.ceil(order.secondsLeft??-1)});
      if(signature!==this.lastOrder){this.lastOrder=signature;
        const clock=order.active?`${Math.floor(Math.ceil(order.secondsLeft)/60)}:${String(Math.ceil(order.secondsLeft)%60).padStart(2,'0')}`:'';
        const urgency=order.urgency==='urgent'?'URGENT':order.urgency==='standard'?'STANDARD':'RELAXED';
        const patience=order.active?`<div class="wp-patience ${order.patience<.22?'red':order.patience<.5?'amber':'green'}"><div class="wp-patience-meta"><span>${urgency} · ${clock}</span><span>${order.patience<.22?'LAST CALL':order.patience<.5?'GETTING IMPATIENT':'Waiting patiently'}</span></div><div class="wp-patience-track"><i style="width:${Math.round(order.patience*100)}%"></i></div><small>Late: ${icon('coin')}${order.lateFine} &amp; reputation</small></div>`:order.offered?`<div class="wp-urgent-offer"><b>Offer closes in ${Math.ceil(order.offerSeconds??25)}s · ${Math.ceil(this.world.settings.urgentSeconds)}s to deliver after accepting</b><div><button type="button" data-play="order:accept:${esc(order.id)}">Accept</button><button type="button" data-play="order:decline:${esc(order.id)}">Pass</button></div><small>No fine if you pass.</small></div>`:'<div class="wp-waiting">Next customer · no timer yet</div>';
        card.innerHTML=`<div class="wp-order-heading"><span>${esc(order.clientName)}${order.regular?' ★':''}</span><b>${icon('coin')}${order.reward}</b></div><div class="wp-order-items">${Object.entries(order.items).map(([g,n])=>`<span class="${(order.stock?.[g]||0)>=n?'ready':''}" title="${esc(this.goodName(g))}" aria-label="${Math.min(order.stock?.[g]||0,n)} of ${n} ${esc(this.goodName(g))} at the market">${icon(this.goodIcon(g))}<b>${Math.min(order.stock?.[g]||0,n)}<small>/${n}</small></b></span>`).join('')}</div>${this.world.settings.pressureEnabled?patience:''}`;
      }
    }
    const active=this.game.getPads().find(p=>p.id===s.activePad),padStatus=this.container.querySelector('.wp-pad-status');padStatus.hidden=!active||(!active.available&&!active.blocked);
    if(active){padStatus.querySelector('strong').textContent=active.label;padStatus.querySelector('span').textContent=s.padPhase==='reenter'?'Step off, then back in to buy':s.padPhase==='complete'?'Bought · step off to buy again':active.blocked?active.requirementText:s.coins<active.price?`${active.price-s.coins} more coins`:s.padPhase==='buy'?`Buying · ${active.price} coins`:'Stand still inside the square';padStatus.querySelector('i').style.width=`${Math.max(0,Math.min(1,s.padProgress||0))*100}%`;}
    this.container.querySelector('.wp-near-barn').hidden=!(this.game.getStorage?.()||[]).some(store=>store.nearby);
    this.updateSaveStatus();this.camera?.sync();
  }
  showBook(){this.desk.open('upgrades');}
  goodName(id){return this.goods[id]?.label||id;}
  goodIcon(id){return this.goods[id]?.model||id;}
  persistPreferences(){try{localStorage.setItem(PREF_KEY,JSON.stringify(this.preferences));}catch{}this.soundscape.setPreferences({enabled:this.preferences.sound!==false,volume:this.preferences.volume,ambience:this.preferences.ambience});}
  updateSaveStatus(){
    const label=this.saveError?'Save needs attention':savedLabel(this.lastSavedAt),button=this.container.querySelector('.wp-save-light');
    button.classList.toggle('error',!!this.saveError);button.title=this.saveError||`${label}. Open saves and recovery.`;button.setAttribute('aria-label',button.title);button.querySelector('span').textContent=label;
    this.container.querySelector('.wp-save-note').textContent=this.saveError||`${label} · every 4 seconds on this device`;
  }
  save(){const r=saveWorldProgress(localStorage,this.world,this.game.serialize());this.saveError=r.ok?'':r.message;if(r.ok)this.lastSavedAt=r.at;else if(Date.now()-this.lastSaveWarning>30000){this.lastSaveWarning=Date.now();this.toast(r.message);}this.updateSaveStatus();return r.ok;}
  exportSave(){const data={format:'monsoons-farmyard-package',version:1,world:this.world,state:this.game.serialize(),savedAt:new Date().toISOString()},url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(this.world.name.replace(/[^a-z0-9-_]/gi,'-')||'Farmyard')+'-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);this.toast('World and progress exported together.');}
  restorePackage(data,reason='Before importing'){
    try{const world=normalizeWorld(data.world);if(data.state?.worldId!==world.id)throw new Error('The progress does not match this world.');const checked=new WorldGame(world,data.state);
      const kept=captureRecovery(localStorage,this.world.id,{world:this.world,state:this.game.serialize()},{force:true,reason});if(!kept.ok)throw new Error('Export your current farm first; its recovery copy could not be kept.');
      if(world.id!==this.world.id){const previous=loadWorldProgress(localStorage,world.id);if(previous.state){let previousWorld=world;try{previousWorld=JSON.parse(localStorage.getItem('monsoons-farmyard-worlds-v1')||'{}').worlds?.find(w=>w.id===world.id)||world;}catch{}const old=captureRecovery(localStorage,world.id,{world:previousWorld,state:previous.state},{force:true,reason});if(!old.ok)throw new Error('The other farm needs an exported backup before replacing its progress.');}}
      const saved=saveWorldPackage(localStorage,world,checked.serialize());if(!saved.ok)throw new Error(saved.message);
      this.skipDestroySave=true;this.dialog.close();this.onImportWorld(world);return true;
    }catch(error){this.skipDestroySave=false;this.toast(error.message||'That backup could not be restored.');return false;}
  }
  async importSave(file){if(!file)return;try{if(file.size>8_000_000)throw new Error('Choose a Farmyard backup smaller than 8 MB.');const data=JSON.parse(await file.text());if(data.format!=='monsoons-farmyard-package'||!data.state)throw new Error('Choose an exported world + progress backup.');this.restorePackage(data);}
    catch(error){this.toast(error.message||'That backup could not be opened.');}finally{const input=this.container.querySelector('.wp-import');if(input)input.value='';}}
  toast(text){const node=this.container.querySelector('.wp-toast');node.textContent=text;node.classList.add('show');clearTimeout(this.toastAt);this.toastAt=setTimeout(()=>node.classList.remove('show'),4000);}
  ensureAudio(){this.soundscape.ensure();}
  playSound(e){this.soundscape.effect(e);}
  destroy(){if(!this.skipDestroySave)this.save();this.destroyed=true;cancelAnimationFrame(this.raf);this.events.abort();this.pointer?.destroy();this.camera?.destroy();this.renderer.destroy();this.soundscape.destroy();clearTimeout(this.toastAt);this.container.replaceChildren();}
}
