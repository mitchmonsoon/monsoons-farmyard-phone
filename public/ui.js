const paths={
 leaf:'<path d="M19 4C11 3 4 7 5 13c1 6 10 7 13-1 1-3 1-6 1-8Z"/><path d="m4 21 11-12M8 16l-1-5m5 1 5 1"/>',
 wheat:'<path d="M12 22V3m0 6C7 9 5 6 6 3c4 0 6 2 6 6Zm0 5c-5 0-7-3-6-6 4 0 6 2 6 6Zm0 5c-5 0-7-3-6-6 4 0 6 2 6 6Zm0-10c5 0 7-3 6-6-4 0-6 2-6 6Zm0 5c5 0 7-3 6-6-4 0-6 2-6 6Zm0 5c5 0 7-3 6-6-4 0-6 2-6 6Z"/>',
 coin:'<circle cx="12" cy="12" r="8.5"/><path d="M14.8 8.6c-2.4-1.2-5.7-.5-5.7 1.6 0 2.7 5.8 1 5.8 3.6 0 2.2-3.4 3-5.8 1.6M12 6.5v11"/>',
 egg:'<path d="M19 14c0 4.5-3.1 7-7 7s-7-2.5-7-7S9 3 12 3s7 6.5 7 11Z"/><path d="M8 14c0 2 .9 3.5 2.3 4"/>',
 flour:'<path d="m7 7-1.8-4h13.6L17 7l2.4 12c.2 1.1-.6 2-1.7 2H6.3c-1.1 0-1.9-.9-1.7-2L7 7Zm0 0h10M12 10v7m0-3-2-2m2 4 2-2"/>',
 apple:'<path d="M12 7c-3-3-8-1.8-8 3.8C4 16.5 7 21 10 20c1.3-.5 2.7-.5 4 0 3 1 6-3.5 6-9.2C20 5.2 15 4 12 7Zm0 0c0-3 1.3-4.6 3.5-5M8 10c-1 .5-1.4 1.6-1.1 3"/>',
 bag:'<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M7 6h10l3 15H4L7 6Zm1 7h8m-4-3v7"/>',
 boots:'<path d="M5 3h8v9l6 2.5c1.7.7 2 2.3 2 4.5H5V3Zm0 16v2h16v-2M8 7h5m-5 3h5"/>',
 helper:'<circle cx="12" cy="8" r="4"/><path d="M5 22v-3a7 7 0 0 1 14 0v3M3 7h18M8 4V2h8v2m-8 13v5m8-5v5"/>',
 coop:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7M12 7v3m-2-1h4"/>',
 mill:'<path d="m7 21 2-12h6l2 12H7ZM12 9V6m0 0L4 3l2 5 6-2Zm0 0 8-3-2 5-6-2Zm0 0-7 8 5-1 2-7Zm0 0 7 8-5-1-2-7Z"/>',
 orchard:'<path d="M12 16v6m-4 0h8M8 16c-5 0-6-6-2.5-8 0-6 7-7 9.5-3 6-1 8 7 3.5 9-1.7 2-3.8 2-6.5 2H8Z"/>',
 star:'<path d="m12 2 3 6 6.6 1-4.8 4.7 1.1 6.6-5.9-3.1-5.9 3.1 1.1-6.6L2.4 9 9 8 12 2Z"/>',
 sound:'<path d="m3 9 4 0 5-4v14l-5-4H3V9Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 muted:'<path d="m3 9 4 0 5-4v14l-5-4H3V9Zm13 0 5 6m0-6-5 6"/>',
 pause:'<path d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z"/>',
 play:'<path d="m8 4 12 8-12 8V4Z"/>',
 settings:'<path d="m10 3 4 0 .6 2.2 2 .9 2-.8 2 3.4-1.6 1.6v2.3l1.6 1.5-2 3.5-2-.8-2 .9L14 20h-4l-.6-2.3-2-.9-2 .8-2-3.5L5 12.6v-2.3L3.4 8.7l2-3.4 2 .8 2-.9L10 3Z"/><circle cx="12" cy="11.5" r="3"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 minus:'<path d="M5 12h14"/>',
 check:'<path d="m5 12 4 4 10-10"/>',
 book:'<path d="M12 6c-2-3-7-3-10-2v15c3-1 8-1 10 2 2-3 7-3 10-2V4c-3-1-8-1-10 2Zm0 0v15"/>',
 save:'<path d="M5 3h12l4 4v14H3V3h2Zm2 0v7h10V3M7 21v-7h10v7"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 8.5a3 3 0 0 1 6 .5c0 2-3 2-3 4m0 3v.5"/>',
 mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 alert:'<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.5"/>',
 milk:'<path d="M8 3h8v4l2 3v11H6V10l2-3V3Zm0 4h8M6 13h12M9 3V1h6v2"/>',
 dairy:'<path d="M3 21V9l9-6 9 6v12H3ZM7 21v-8h10v8M4 9h16M10 6h4"/><path d="M10 16h4v5h-4z"/>',
 farmupgrade:'<path d="M3 21V9l9-6 9 6v12M8 21v-7h8v7M12 2v5M9 5l3-3 3 3"/>',
 camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3V7Z"/><circle cx="12" cy="13" r="4"/>',
 up:'<path d="M12 20V4m-6 6 6-6 6 6"/>',down:'<path d="M12 4v16m-6-6 6 6 6-6"/>',
 left:'<path d="M20 12H4m6-6-6 6 6 6"/>',right:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 'rotate-left':'<path d="M5 7a8 8 0 1 1-1 9M5 2v5h5"/>',
 'rotate-right':'<path d="M19 7a8 8 0 1 0 1 9m-1-14v5h-5"/>',
 'tilt-up':'<path d="m5 8 7-6 7 6M12 2v12M3 17l9-3 9 3-9 4-9-4Z"/>',
 'tilt-down':'<path d="m5 4 7 6 7-6M12 1v9M3 17l9-3 9 3-9 4-9-4Z"/>',
 target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
 spawn:'<path d="M5 22V3m0 0h13l-3 4 3 4H5M2 22h6"/>',
 routes:'<circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M7.5 5H15a4 4 0 0 1 0 8H9a4 4 0 0 0 0 6h7.5M12 10l3 3-3 3"/>'
};
Object.assign(paths,{
 barn:'<path d="m3 10 9-7 9 7v11H3V10ZM8 21v-9h8v9M8 12l8 9m0-9-8 9"/>',
 market:'<path d="M3 10V7l2-4h14l2 4v3M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M5 13v8h14v-8M8 21v-6h5v6"/>',
 parcel:'<path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5M12 3v10"/>',
 workshop:'<path d="M3 21V10l6-4v5l6-5v5l6-4v14H3ZM5 16h3m3 0h3m3 0h2M6 8V2h3v4"/>',
 grain:paths.wheat,
 cheese:'<path d="M3 10 15 3l6 7v11H3V10Zm0 0h18"/><circle cx="8" cy="15" r="1.5"/><circle cx="16" cy="17" r="2"/>',
 butter:'<path d="M3 12 8 8h12v10l-5 4H3V12Zm0 0h12v10m0-10 5-4M6 8V4h11v4"/>',
 bread:'<path d="M4 20V11c-4-6 1-10 5-7 3-3 6-3 8 0 4-1 8 4 3 7v9H4ZM8 10l2 5m3-7 2 5"/>',
 juice:'<path d="M6 8h12l-2 14H8L6 8Zm0 5h12M13 8V3l5-2"/>',
 recipe:'<path d="M5 3h14v18H5V3ZM8 7h8M8 11h8M8 15h4M3 6h4M3 10h4M3 14h4M3 18h4"/>',
 blueprint:'<path d="M3 3h18v18H3V3ZM7 7h10v10H7V7Zm5 0v10M7 12h10"/>',
 history:'<path d="M4 7v5h5M4 12a8 8 0 1 1 2 6M12 6v6l4 2"/>'
});
export function icon(name,cls=''){return '<svg class="icon '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.leaf)+'</svg>';}
function escapeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function money(n){return Math.max(0,Math.floor(Number(n)||0)).toLocaleString('en-GB');}
function key(value){return '<kbd class="keycap">'+value+'</kbd>';}

export class FarmUI{
  constructor(actions){
    this.actions=actions;
    this.state=null;this.pads=[];this.paused=true;this.panel=null;this.welcomeVisible=false;this.bookTab='unlock';this.toastTimer=0;this.lastCoins=null;this.lastBookKey='';this.saveText='Progress saves automatically in this browser.';this.saveError=false;
    this.root=document.getElementById('app-ui');
    this.root.innerHTML=[
      '<div class="ui-top-shade"></div><div class="brand"><div class="brand-mark">'+icon('wheat')+'</div><div><div class="brand-kicker">MONSOONS</div><div class="brand-name">Farmyard<span class="brand-version">M006</span></div></div></div>',
      '<button class="objective" id="objective-button" aria-label="Current goal. Open field guide" title="Goal & help"><span class="objective-row">'+icon('star')+'<span class="objective-title" id="objective-title">Harvest wheat</span><span class="objective-help">?</span></span><span class="sr-only" id="objective-detail">Walk through the wheat.</span><span class="objective-track"><span class="objective-fill" id="objective-fill"></span></span></button>',
      '<div class="top-actions" data-ui><div class="coin-wallet" id="coin-wallet" aria-label="Coins"><span class="coin-art">'+icon('coin')+'</span><span class="coin-number" id="coin-count">0</span></div><button class="icon-button" id="sound-button" title="Sound (M)" aria-label="Turn sound on">'+icon('muted')+'</button><button class="icon-button" id="settings-button" title="Settings" aria-label="Open settings">'+icon('settings')+'</button><button class="icon-button" id="pause-button" title="Pause (Esc)" aria-label="Pause game">'+icon('pause')+'</button></div>',
      '<div class="bag" id="bag" aria-label="Carried goods"><div class="bag-main"><span class="bag-symbol">'+icon('bag')+'</span><div class="bag-items">',
      ...['wheat','egg','flour','apple'].map(g=>'<span class="bag-item empty" data-good="'+g+'" title="'+({wheat:'Wheat',egg:'Eggs',flour:'Flour',apple:'Apples'}[g])+'">'+icon(g)+'<span id="bag-'+g+'">0</span></span>'),
      '</div><span class="bag-capacity"><strong id="bag-count">0</strong> / <span id="bag-max">14</span></span></div><div class="bag-track"><div class="bag-fill" id="bag-fill"></div></div></div>',
      '<div class="bottom-actions" data-ui><button class="farmbook-button" id="farmbook-button" title="Open your farm book" aria-label="Open farm book">'+icon('book')+'<span>Farm book</span></button><div class="zoom-controls" role="group" aria-label="Camera zoom"><button class="icon-button" id="zoom-out" title="Zoom out" aria-label="Zoom out">'+icon('minus')+'</button><button class="icon-button" id="zoom-in" title="Zoom in" aria-label="Zoom in">'+icon('plus')+'</button></div></div>',
      '<div class="context-pad hidden" id="context-pad"><div class="context-title" id="context-title"></div><div class="context-detail" id="context-detail"></div><div class="context-track"><div class="context-fill" id="context-fill"></div></div></div>',
      '<div id="joystick" aria-label="Touch movement control"><div id="joystick-knob"></div></div>',
      '<section class="welcome hidden" id="welcome" data-ui aria-label="Welcome to Monsoons Farmyard"><div class="welcome-content"><h1>Let’s grow.</h1><div class="welcome-buttons"><button id="start-button" class="primary-button"><span>Play</span>'+icon('play')+'</button><button id="welcome-help" class="welcome-help" aria-label="How to play">'+icon('help')+'</button></div><div class="welcome-save">'+icon('save')+'<span id="welcome-save-text">Saves automatically</span></div></div></section>',
      '<div class="modal-backdrop hidden" id="modal-backdrop" data-ui><section class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" tabindex="-1"></section></div><div class="toast hidden" id="toast" role="status" aria-live="polite"></div>'
    ].join('');
    this.el={};
    ['objective-button','objective-title','objective-detail','objective-fill','coin-count','coin-wallet','bag','bag-count','bag-max','bag-fill','sound-button','pause-button','context-pad','context-title','context-detail','context-fill','welcome','start-button','welcome-save-text','modal-backdrop','panel','toast'].forEach(id=>this.el[id]=document.getElementById(id));
    document.getElementById('start-button').addEventListener('click',()=>this.start());
    document.getElementById('welcome-help').addEventListener('click',()=>this.openPanel('help'));
    this.el['objective-button'].addEventListener('click',()=>this.openPanel('help'));
    document.getElementById('sound-button').addEventListener('click',()=>this.toggleSound());
    document.getElementById('pause-button').addEventListener('click',()=>this.togglePause());
    document.getElementById('settings-button').addEventListener('click',()=>this.openPanel('settings'));
    document.getElementById('farmbook-button').addEventListener('click',()=>this.openPanel('book'));
    document.getElementById('zoom-in').addEventListener('click',()=>this.actions.zoom(1));
    document.getElementById('zoom-out').addEventListener('click',()=>this.actions.zoom(-1));
    this.el['modal-backdrop'].addEventListener('click',e=>{if(e.target===this.el['modal-backdrop'])this.closePanel();});
    this.el.panel.addEventListener('click',e=>this.panelClick(e));
    this.el.panel.addEventListener('change',async e=>{
      if(e.target.id!=='import-file'||!e.target.files?.[0])return;
      const file=e.target.files[0];e.target.value='';
      try{const imported=await this.actions.importSave(file);if(imported!==false)this.closePanel();}catch(err){this.toast(err.message||'That save could not be opened.','error');}
    });
    this.el.panel.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.closePanel();return;}
      if(e.key!=='Tab')return;
      const controls=[...this.el.panel.querySelectorAll('button:not(:disabled),input:not([hidden]),[tabindex="0"]')].filter(n=>n.offsetParent!==null);
      if(!controls.length)return;
      if(e.shiftKey&&(document.activeElement===controls[0]||document.activeElement===this.el.panel)){e.preventDefault();controls.at(-1).focus();}
      else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0].focus();}
    });
    this.syncSound();
  }
  update(state,pads=[]){
    this.state=state;this.pads=pads;
    const coins=Math.max(0,Math.floor(state.coins||0));
    if(coins!==this.lastCoins){
      this.el['coin-count'].textContent=money(coins);this.el['coin-wallet'].setAttribute('aria-label',money(coins)+' coins');
      if(this.lastCoins!==null&&coins>this.lastCoins){this.el['coin-wallet'].classList.remove('bump');void this.el['coin-wallet'].offsetWidth;this.el['coin-wallet'].classList.add('bump');}
      this.lastCoins=coins;
    }
    const bag=state.player?.bag||[],cap=Math.max(1,state.player?.capacity||14),counts={wheat:0,egg:0,flour:0,apple:0};
    bag.forEach(g=>{if(g in counts)counts[g]++;});
    for(const g in counts){document.getElementById('bag-'+g).textContent=counts[g];this.root.querySelector('[data-good="'+g+'"]').classList.toggle('empty',!counts[g]);}
    this.el['bag-count'].textContent=bag.length;this.el['bag-max'].textContent=cap;this.el['bag-fill'].style.width=Math.min(100,bag.length/cap*100)+'%';this.el.bag.classList.toggle('full',bag.length>=cap);
    this.el.bag.setAttribute('aria-label',bag.length+' of '+cap+' carried: '+counts.wheat+' wheat, '+counts.egg+' eggs, '+counts.flour+' flour, '+counts.apple+' apples');
    const goal=state.objective||{};
    this.el['objective-title'].textContent=goal.title||'Keep growing';this.el['objective-detail'].textContent=goal.detail||'';this.el['objective-fill'].style.width=Math.max(0,Math.min(1,goal.progress||0))*100+'%';
    this.el['objective-button'].setAttribute('aria-label',(goal.title||'Current goal')+'. '+(goal.detail||'')+' Open field guide.');
    const pad=pads.find(p=>p.id===state.activePad&&p.available),context=!!pad&&!this.panel&&!this.welcomeVisible;
    this.el['context-pad'].classList.toggle('hidden',!context);
    if(context){this.el['context-title'].textContent=pad.label;this.el['context-detail'].textContent=state.padPhase==='reenter'?'Step off, then back in to buy':state.padPhase==='complete'?'Bought · step off to buy again':coins>=pad.price?(state.padPhase==='buy'?'Buying · '+money(pad.price)+' coins':'Stand still inside the square'):'Need '+money(Math.max(0,pad.price-coins))+' coins';this.el['context-fill'].style.width=Math.max(0,Math.min(1,state.padProgress||pad.progress||0))*100+'%';}
    if(this.panel==='book'){
      const nextKey=coins+'|'+(state.earned||0)+'|'+(state.sold||0)+'|'+JSON.stringify(pads.map(p=>[p.id,p.available,p.level,p.price,p.unlocked]))+'|'+this.bookTab;
      if(nextKey!==this.lastBookKey){this.renderBookContent();this.lastBookKey=nextKey;}
    }
  }
  showWelcome(hasSave=false){
    this.welcomeVisible=true;this.hasSave=hasSave;this.paused=true;this.root.classList.add('in-welcome');this.el.welcome.classList.remove('hidden');
    this.el['start-button'].querySelector('span').textContent=hasSave?'Continue':'Play';this.el['welcome-save-text'].textContent=hasSave?'Your farm is saved':'Saves automatically';
    this.actions.pause?.();
  }
  start(){this.welcomeVisible=false;this.root.classList.remove('in-welcome');this.el.welcome.classList.add('hidden');this.panel=null;this.el['modal-backdrop'].classList.add('hidden');this.setPaused(false);this.actions.start();}
  setPaused(value){this.paused=!!value;this.el['pause-button'].classList.toggle('active',this.paused&&!this.welcomeVisible);this.el['pause-button'].setAttribute('aria-label',this.paused?'Resume game':'Pause game');this.el['pause-button'].innerHTML=icon(this.paused?'play':'pause');}
  togglePause(){if(this.panel){this.closePanel();return;}if(this.welcomeVisible)return;if(this.paused){this.setPaused(false);this.actions.resume();}else this.openPanel('pause');}
  toggleSound(){this.actions.sound(!this.actions.getSound?.());this.syncSound();if(this.panel==='settings')this.renderPanel();}
  syncSound(){const on=!!this.actions.getSound?.();this.el['sound-button'].innerHTML=icon(on?'sound':'muted');this.el['sound-button'].setAttribute('aria-label',on?'Turn sound off':'Turn sound on');this.el['sound-button'].title=on?'Sound on (M)':'Sound off (M)';}
  openPanel(name){
    this.previousFocus=document.activeElement;this.panel=name;this.setPaused(true);this.actions.pause();this.el['modal-backdrop'].classList.remove('hidden');this.el['modal-backdrop'].classList.toggle('centered',name==='pause'||name==='confirm-reset');this.el.panel.className='panel'+(name==='pause'?' pause-panel':'');this.renderPanel();requestAnimationFrame(()=>this.el.panel.focus());
  }
  closePanel(resume=true){this.panel=null;this.el['modal-backdrop'].classList.add('hidden');if(resume&&!this.welcomeVisible){this.setPaused(false);this.actions.resume();}if(this.previousFocus?.isConnected)this.previousFocus.focus({preventScroll:true});}
  heading(eyebrow,title){return '<div class="panel-heading"><div><div class="panel-eyebrow">'+eyebrow+'</div><h2 id="panel-title">'+title+'</h2></div><button class="icon-button small close-panel" data-action="close" aria-label="Close panel">'+icon('close')+'</button></div>';}
  renderPanel(){
    if(this.panel==='book'){
      this.el.panel.innerHTML=this.heading('UPGRADES','Farm book')+'<p class="panel-intro">Buy here or stand on a gold square.</p><div class="panel-tabs" role="tablist" aria-label="Upgrade categories">'+[['unlock','Build'],['helper','Helpers'],['upgrade','You']].map(([id,title])=>'<button class="panel-tab '+(this.bookTab===id?'active':'')+'" data-tab="'+id+'" role="tab" aria-selected="'+(this.bookTab===id)+'">'+title+'</button>').join('')+'</div><div class="upgrade-list" id="upgrade-list"></div><div class="book-footer"><div class="book-stat"><strong id="book-earned">0</strong><span>Coins earned</span></div><div class="book-stat"><strong id="book-sold">0</strong><span>Goods sold</span></div></div>';this.lastBookKey='';this.renderBookContent();
    }else if(this.panel==='help'){
      this.el.panel.innerHTML=this.heading('HOW TO PLAY','Field guide')+'<p class="help-current"><strong>'+escapeText(this.state?.objective?.title||'Harvest wheat')+'</strong>'+escapeText(this.state?.objective?.detail||'Walk through the golden wheat.')+'</p><div class="help-steps">'+[
        ['Move & zoom','Drag the joystick or tap the ground. Pinch with two fingers or use + / − to zoom. On a keyboard, use WASD or arrows.'],
        ['Harvest','Walk through ripe crops to collect them. Take a full stack to the market.'],
        ['Sell & earn','Drop goods at SELL. Customer payments go straight into your coin total.'],
        ['Upgrade','Stand on a gold square to buy. Its picture shows the upgrade; the number is its price.'],
        ['Make more','Feed wheat to the coop for eggs or the mill for flour. Collect the output and sell it.']
      ].map((s,i)=>'<div class="help-step"><span class="help-number">'+(i+1)+'</span><div class="help-text"><strong>'+s[0]+'</strong><p>'+s[1]+'</p></div></div>').join('')+'</div><div class="help-keyboard"><div>'+key('Esc')+'<span>Pause</span></div><div>'+key('M')+'<span>Sound</span></div><div>'+key('F')+'<span>Full screen</span></div></div><div class="panel-bottom"><button class="primary-button wide-button" data-action="'+(this.welcomeVisible?'start':'close')+'">'+(this.welcomeVisible?'Play':'Continue')+icon('arrow')+'</button></div>';
    }else if(this.panel==='settings'){
      const on=!!this.actions.getSound?.();
      this.el.panel.innerHTML=this.heading('YOUR FARM','Settings')+'<div class="setting-row"><div><strong>Sound</strong><p>Soft harvest, coin and upgrade sounds.</p></div><button class="toggle" data-action="sound" role="switch" aria-checked="'+on+'" aria-label="Farm sound effects"><span></span></button></div><div class="setting-row"><div><strong>Full screen</strong><p>Expand the game where supported.</p></div><button class="icon-button small" data-action="fullscreen" aria-label="Toggle full screen">'+icon('expand')+'</button></div><div class="setting-section-title">BACKUPS</div><div class="backup-buttons"><button class="secondary-button" data-action="export">'+icon('download')+'Save a backup</button><button class="secondary-button" data-action="import">'+icon('upload')+'Load a backup</button><input type="file" id="import-file" accept=".json,application/json" hidden></div><p class="save-note '+(this.saveError?'error':'')+'" id="save-note">'+escapeText(this.saveText)+' Save a backup to move your farm to another browser or computer.</p><button class="secondary-button wide-button" data-action="recovery">Recovery copies</button><div class="setting-section-title">HELP</div><button class="secondary-button wide-button" data-action="help">'+icon('book')+'Field guide</button><button class="danger-text" data-action="reset-confirm">Start a fresh farm…</button><div class="panel-bottom"><button class="primary-button wide-button" data-action="close">Back to the farm'+icon('arrow')+'</button></div>';
    }else if(this.panel==='recovery'){
      const entries=this.actions.getRecovery?.()||[];
      this.el.panel.innerHTML=this.heading('LOCAL COPIES','Recovery')+'<p class="panel-intro">Recent copies of your original farm. Export a backup to keep a portable file.</p><div class="upgrade-list">'+entries.map(e=>'<article class="upgrade-card"><div class="upgrade-body"><strong>'+escapeText(new Date(e.at).toLocaleString('en-GB'))+'</strong><div class="upgrade-description">'+escapeText(e.reason)+' · '+money(e.payload?.farm?.coins)+' coins</div></div><button class="secondary-button" data-recovery="'+escapeText(e.id)+'">Restore</button></article>').join('')+(entries.length?'':'<p>A copy is kept while you play.</p>')+'</div>';
    }else if(this.panel==='confirm-reset'){
      this.el.panel.innerHTML=this.heading('A FRESH BEGINNING','Start over?')+'<div class="confirm-body">This will replace the farm saved in this browser with a brand-new one. Your buildings, helpers, coins and carried goods will be cleared.<br><br>You can save a backup first from Settings.</div><div class="confirm-actions"><button class="primary-button wide-button danger-button" data-action="reset">Start a fresh farm</button><button class="secondary-button wide-button" data-action="settings">Keep my farm</button></div>';
    }else if(this.panel==='pause'){
      this.el.panel.innerHTML='<div class="pause-art">'+icon('pause')+'</div><div class="panel-heading"><div><h2 id="panel-title">Paused</h2></div></div><div class="pause-menu"><button class="primary-button wide-button" data-action="close">Continue'+icon('play')+'</button><button class="secondary-button" data-action="book">'+icon('book')+'Your farm book</button><button class="secondary-button" data-action="settings">'+icon('settings')+'Settings & save backups</button><button class="secondary-button" data-action="help">'+icon('help')+'How to play</button></div>';
    }
  }
  renderBookContent(){
    const list=document.getElementById('upgrade-list');if(!list)return;const coins=this.state?.coins||0,subset=this.pads.filter(p=>p.kind===this.bookTab);
    const iconFor=p=>({coop:'coop',mill:'mill',orchard:'orchard',farmhand:'helper',runner:'helper',basket:'bag',boots:'boots'}[p.id]||(p.kind==='helper'?'helper':p.kind==='upgrade'?'bag':'leaf'));
    list.innerHTML=subset.length?subset.map(p=>{
      const maxed=(!p.available&&p.unlocked)||(p.maxLevel>0&&p.level>=p.maxLevel),canBuy=p.available&&coins>=p.price;
      const level=p.maxLevel>1?'<span class="upgrade-level">'+p.level+'/'+p.maxLevel+'</span>':'';
      const need=!p.available&&!maxed?' Unlock the earlier farm stages first.':!maxed&&coins<p.price?' · '+money(p.price-coins)+' more coins':'';
      return '<article class="upgrade-card"><span class="upgrade-art">'+icon(iconFor(p))+'</span><div class="upgrade-body"><div class="upgrade-title">'+escapeText(p.label)+level+'</div><div class="upgrade-description">'+escapeText(p.description||'A little more room to grow.')+escapeText(need)+'</div></div><button class="upgrade-buy '+(maxed?'done':'')+'" data-buy="'+escapeText(p.id)+'" '+(!canBuy?'disabled ':'')+'aria-label="'+escapeText(maxed?p.label+' already complete':'Buy '+p.label+' for '+money(p.price)+' coins')+'">'+(maxed?icon('check'):(p.available?icon('coin')+money(p.price):'Locked'))+'</button></article>';
    }).join(''):'<div class="upgrade-empty">More possibilities are growing.</div>';
    document.getElementById('book-earned').textContent=money(this.state?.earned||0);document.getElementById('book-sold').textContent=money(this.state?.sold||0);
    this.el.panel.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===this.bookTab);b.setAttribute('aria-selected',String(b.dataset.tab===this.bookTab));});
  }
  panelClick(e){
    const button=e.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.recovery){this.actions.restoreRecovery?.(button.dataset.recovery);return;}
    if(button.dataset.tab){this.bookTab=button.dataset.tab;this.renderBookContent();return;}
    if(button.dataset.buy){const result=this.actions.buy(button.dataset.buy);if(result?.ok)this.toast(result.message||'A little more room to grow!','success');else if(result?.message)this.toast(result.message,'error');this.lastBookKey='';return;}
    switch(button.dataset.action){
      case 'close':this.closePanel();break;
      case 'start':this.start();break;
      case 'sound':this.toggleSound();break;
      case 'book':this.openPanel('book');break;
      case 'help':this.openPanel('help');break;
      case 'settings':this.openPanel('settings');break;
      case 'recovery':this.openPanel('recovery');break;
      case 'fullscreen':this.actions.fullscreen?.();break;
      case 'reset-confirm':this.openPanel('confirm-reset');break;
      case 'reset':this.closePanel(false);this.actions.reset();this.showWelcome(false);break;
      case 'export':this.actions.exportSave();break;
      case 'import':document.getElementById('import-file').click();break;
    }
  }
  toast(text,type='info'){
    if(!text)return;clearTimeout(this.toastTimer);const el=this.el.toast;
    const isError=type==='error'||type==='warning';
    el.className='toast '+(isError?'error':type==='success'?'success':'');el.innerHTML=icon(isError?'alert':type==='success'?'check':'leaf')+'<span>'+escapeText(text)+'</span>';
    this.toastTimer=setTimeout(()=>{el.classList.add('out');this.toastTimer=setTimeout(()=>el.classList.add('hidden'),240);},3500);
  }
  setSaveStatus(text,error=false){this.saveText=text;this.saveError=error;const node=document.getElementById('save-note');if(node){node.textContent=text+' Save a backup to move your farm to another browser or computer.';node.classList.toggle('error',error);}}
}
