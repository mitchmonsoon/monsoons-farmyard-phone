import { icon } from './ui.js';
import { recoveryEntries, captureRecovery, savedLabel } from './save-history.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('en-GB');
const tabs=[['upgrades','Gold squares','star'],['orders','Orders','market'],['board','Noticeboard','target'],['storage','Barn','barn'],['network','Farm flow','routes'],['goals','Milestones','target'],['saves','Saves','save'],['options','Options','settings']];
const statusNames={'needs-feed':'Needs ingredients',working:'Working',ready:'Ready to collect',full:'Storage full',blocked:'Route blocked',idle:'Ready',locked:'Locked'};

export class FarmDesk {
  constructor(play){this.play=play;this.tab='upgrades';}
  open(tab=this.tab){
    const p=this.play;this.tab=tabs.some(t=>t[0]===tab)?tab:'upgrades';p.clear();p.paused=true;p.soundscape?.setActive(false);
    p.container.querySelector('.wp-menu').hidden=true;p.container.querySelector('.wp-help').hidden=true;
    p.container.querySelector('.wp-dialog h2').textContent=this.tab==='upgrades'?'Growing your farm':'Your farm';
    const host=p.container.querySelector('.wp-book');host.hidden=false;
    host.innerHTML=`<nav class="farm-desk-tabs" aria-label="Farm desk">${tabs.map(([id,label,art])=>`<button data-play="desk:${id}" aria-current="${id===this.tab?'page':'false'}">${icon(art)}<span>${label}</span></button>`).join('')}</nav><section class="farm-desk-page">${this.render()}</section>`;
    if(!p.dialog.open)p.dialog.showModal();p.updateSaveStatus();
  }
  goods(items,stock=null){return `<div class="desk-goods">${Object.entries(items||{}).filter(([,n])=>n>0).map(([id,n])=>`<span title="${esc(this.play.goodName(id))}">${icon(this.play.goodIcon(id))}<b>${stock?Math.min(stock[id]||0,n)+'/':''}${amount(n)}</b><small>${esc(this.play.goodName(id))}</small></span>`).join('')}</div>`;}
  render(){
    const p=this.play,s=p.game.state;
    if(this.tab==='upgrades'){
      const goal=s.objective||{},pads=p.game.getPads();
      return `<div class="wp-next-step"><span>FARM RANK ${amount(s.farmLevel||1)}</span><strong>${esc(goal.title||'Your farm, your rhythm')}</strong><p>${esc(goal.detail||'Grow, feed and deliver.')}</p></div><div class="wp-upgrade-list">${pads.map(pad=>{
        const done=!pad.available&&!pad.blocked&&!pad.repeatable&&(pad.maxLevel>0&&pad.level>=pad.maxLevel||pad.unlocked);
        return `<div class="wp-upgrade ${done?'complete':''}"><span class="wp-upgrade-icon">${icon(pad.icon||pad.type)}</span><div><strong>${esc(pad.label)}</strong><small>${esc(done?'Open':pad.requirementText||pad.lockedReason||pad.description||'')}</small></div><button data-play="buy:${esc(pad.id)}" ${pad.available&&s.coins>=pad.price?'':'disabled'} aria-label="${esc(done?pad.label+' open':'Buy '+pad.label+' for '+pad.price+' coins')}">${done?icon('check'):icon('coin')+amount(pad.price)}</button></div>`;
      }).join('')}</div>`;
    }
    if(this.tab==='orders'){
      const orders=p.game.getOrders?.()||[];
      return `<div class="desk-summary"><b>${amount(s.ordersCompleted)} served · ${amount(s.ordersFailed)} missed</b><span>★ ${amount(s.reputation)}/100 reputation · ${amount(s.lateFines)} in fines</span></div>${orders.length?orders.map((o,i)=>`<article class="desk-card"><header><strong>${i===0?'Next customer':`Customer ${i+1}`} · ${esc(o.clientName||'Farm customer')}${o.regular?' ★':''}</strong><span class="desk-reward">${icon('coin')}${amount(o.reward)}</span></header><small>${esc(o.marketName||'Farm market')} · ${esc(o.urgency||'relaxed')} ${o.active?'· '+Math.ceil(o.secondsLeft)+'s left':o.offered?'· awaiting your choice':''}</small>${this.goods(o.items,o.stock)}<p>${o.ready?'Everything is at the stall. Ready when play resumes.':'Deliver the missing goods to this market.'}</p>${o.offered?`<div class="desk-button-row"><button data-play="order:accept:${esc(o.id)}">Accept contract</button><button data-play="order:decline:${esc(o.id)}">Pass without penalty</button></div>`:''}</article>`).join(''):'<p class="desk-empty">Your market sells individual goods. Enable quantity orders in World Builder to create shopping lists.</p>'}`;
    }
    if(this.tab==='board'){
      const offers=p.game.getNoticeboard?.()||[],reputation=s.reputation;
      return `<div class="desk-summary"><b>✦ Village Noticeboard</b><span>${amount(s.boardServed||0)} contracts completed · ★ ${amount(reputation)}/100</span></div>
        <p class="desk-board-intro">Choose extra jobs when your farm is ready. The timer and any late penalty only start after you accept. Deliver the goods to the market; payment goes straight into your bank. Unaccepted offers are free to ignore.</p>
        ${offers.length?offers.map(o=>`<article class="desk-card desk-board-card ${o.rush?'rush':''}">
          <header><strong>${o.rush?'⚡ ':''}${esc(o.name)}</strong><span class="desk-reward">${icon('coin')}${amount(o.reward)}</span></header>
          <small>${o.status==='active'?'ACTIVE CONTRACT · '+Math.ceil(o.secondsLeft)+'s remaining':'AVAILABLE · expires in '+Math.ceil(o.secondsLeft)+'s'} · ${o.minReputation?'★ '+o.minReputation+' needed':'Open to all'}</small>
          ${this.goods(o.items,o.stock)}<p>${o.status==='active'?(o.ready?'Ready! Resume the game to complete the delivery.':'Deliver everything to the market.'):
            'Optional contract. No penalty for passing or allowing it to expire.'}</p>
          <p class="desk-delivery-advice" title="Rough planning estimate based on unlocked buildings, stock, recipes and farm travel"><strong>Delivery Doctor:</strong> ${esc(o.advice?.label||'Plan the route before accepting.')}${o.advice?.blocked?' · Open the needed production first.':''}</p>
          ${o.status==='active'?`<progress max="1" value="${Math.max(0,o.patience)}" aria-label="Contract time remaining"></progress><small>Late fine: ${amount(o.fine)} coins · reputation -4</small>`:
          `<div class="desk-button-row"><button data-play="board:accept:${esc(o.id)}" ${o.eligible?'':'disabled'}>${o.eligible?'Accept contract':'Need more reputation'}</button><button data-play="board:pass:${esc(o.id)}">Pass</button></div>`}
        </article>`).join(''):'<p class="desk-empty">No active notices. New local offers appear while you play.</p>'}
        <p class="desk-footnote">Regular customers return after three successful orders. Good reputation opens special catering contracts and better payouts. Rush hour adds extra offers.</p>`;
    }
    if(this.tab==='storage'){
      const stores=p.game.getStorage?.()||[];
      if(!stores.length)return '<div class="desk-empty">Open a barn to store goods and keep feed reserves. Barns and their capacity are editable in World Builder.</div>';
      return stores.map(store=>`<article class="desk-card"><header><strong>${esc(store.name)}</strong><span>${amount(Object.values(store.stock||{}).reduce((n,v)=>n+v,0))} / ${amount(store.capacity)}</span></header><p>${store.nearby?'You are beside this barn. Choose goods to take.':'Walk to the barn to take goods. Helpers can use its stock.'}</p><div class="desk-stock-table">${Object.keys(p.goods).map(g=>`<div class="desk-stock-row"><span class="desk-product">${icon(p.goodIcon(g))}<strong>${esc(p.goodName(g))}</strong></span><b>${amount(store.stock?.[g])}</b><label>Keep<input type="number" min="0" max="${store.capacity}" value="${store.reserves?.[g]||0}" data-reserve="${esc(store.id)}" data-good="${esc(g)}" aria-label="${esc(p.goodName(g))} reserve at ${esc(store.name)}"></label><button data-play="take:${esc(store.id)}:${esc(g)}:5" ${store.nearby&&(store.stock?.[g]||0)>0&&s.player.bag.length<s.player.capacity?'':'disabled'}>Take 5</button></div>`).join('')}</div></article>`).join('');
    }
    if(this.tab==='network'){
      const statuses=p.game.getNodeStatuses?.()||[],active=statuses.filter(n=>n.status!=='locked');
      return `<div class="desk-summary"><b>${amount(s.workers?.length)} helpers working</b><button data-play="flow-view">${icon('routes')}Show routes</button></div><div class="desk-flow-grid">${active.map(n=>{
        const node=p.world.nodes.find(x=>x.id===n.id),label=statusNames[n.status]||n.label||n.status;
        return `<article class="desk-card flow-${esc(n.status)}"><header><strong>${esc(node?.name||n.name||n.id)}</strong><span class="desk-status-dot"></span></header><p>${esc(label)}</p>${n.good?`<div class="desk-flow-output">${icon(p.goodIcon(n.good))}<b>${amount(n.amount)} ${esc(p.goodName(n.good))}</b></div>`:''}${n.status==='working'?`<progress max="1" value="${Math.max(0,Math.min(1,n.progress||0))}" aria-label="Production progress"></progress>`:''}${n.perMinute?`<small>${Number(n.perMinute).toFixed(1)} produced / min</small>`:''}</article>`;
      }).join('')}</div><section class="desk-helper-hub"><h3>🧑‍🌾 Farmhands and emergency jobs</h3>
        <div class="desk-helper-focus"><span>Priority for the next 90 seconds:</span>${['',...Object.keys(p.goods)].map(g=>`<button data-play="focus:${esc(g||'clear')}" class="${s.helperFocus===g&&s.time<s.helperFocusUntil?'selected':''}">${g?esc(p.goodName(g)):'Normal routes'}</button>`).join('')}</div>
        ${(p.game.getWorkerJobs?.()||[]).map(j=>`<article class="desk-worker"><strong>${esc(j.name)}</strong><span>${esc(j.from)} → ${esc(j.to)}</span><small class="${j.blocked?'blocked':''}">${j.blocked?'⚠ No path · ':''}${esc(j.status)}${j.carrying?' · '+j.carrying+' carried':''}</small></article>`).join('')||'<p>Hire farmhands with golden squares to automate deliveries.</p>'}
        <p class="desk-footnote">Emergency focus boosts matching deliveries. Set permanent routes, reserves and priorities in World Builder.</p></section>`;
    }
    if(this.tab==='goals'){
      const goals=p.game.getMilestones?.()||[];
      return goals.length?goals.map(g=>`<article class="desk-card"><header><strong>${g.complete?icon('check'):icon('target')}${esc(g.title)}</strong>${g.reward?`<span class="desk-reward">${icon('coin')}${amount(g.reward)}</span>`:''}</header><progress max="1" value="${Math.max(0,Math.min(1,g.progress||0))}" aria-label="${esc(g.title)} progress"></progress><small>${g.complete?'Completed'+(g.claimed?' · reward banked':''):amount(g.value)+' / '+amount(g.target)}</small></article>`).join(''):'<div class="desk-empty">Your next farm step is shown above the game. Add your own rewarded milestones in the builder’s Rules section.</div>';
    }
    if(this.tab==='saves'){
      const entries=recoveryEntries(localStorage,p.world.id),date=at=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}).format(at);
      return `<div class="desk-save-state ${p.saveError?'error':''}">${icon(p.saveError?'alert':'check')}<div><strong>${esc(p.saveError||savedLabel(p.lastSavedAt))}</strong><small>Automatic save every 4 seconds on this device.</small></div></div><div class="desk-button-row"><button data-play="export">${icon('download')}Export backup</button><button data-play="import">${icon('upload')}Import backup</button><button data-play="checkpoint">${icon('save')}Keep a recovery copy</button></div><p class="desk-footnote">A backup contains this world and its progress. Import it on your other device to continue there.</p><h3>Recovery copies</h3><div class="desk-recovery-list">${entries.length?entries.map(e=>`<article class="desk-recovery"><div><strong>${esc(date(e.at))}</strong><small>${esc(e.reason)} · ${amount(e.payload.state?.coins)} coins</small></div><button data-play="restore:${esc(e.id)}">Restore</button></article>`).join(''):'<p>No recovery copy yet. Keep one now.</p>'}</div><small class="desk-footnote">Up to five recent copies for this farm, with a small shared storage limit. Export important backups as files.</small>`;
    }
    return `<div class="desk-button-row"><button data-play="shell-home">⌂ Main menu</button><button data-play="shell-feedback">✉ Send feedback</button><button data-play="edit">${icon('settings')}Edit this world</button><button data-play="help">${icon('help')}Controls</button></div><div class="desk-option"><label for="farm-volume">Sound volume</label><input id="farm-volume" type="range" min="0" max="100" value="${Math.round(p.preferences.volume*100)}" data-preference="volume"></div><label class="desk-option"><span>Farm ambience</span><input type="checkbox" data-preference="ambience" ${p.preferences.ambience?'checked':''}></label><label class="desk-option"><span>Production status signs</span><input type="checkbox" data-preference="statusSigns" ${p.preferences.statusSigns?'checked':''}></label><p class="desk-footnote">Gamepad: left stick moves, right stick turns the camera, shoulder buttons zoom, Start pauses, Y opens the farm desk.</p><button class="desk-danger" data-play="restart">Start this farm again…</button>`;
  }
  handle(action){
    const p=this.play;
    if(action.startsWith('desk:')){this.open(action.slice(5));return true;}
    if(action.startsWith('take:')){const [,id,good,n]=action.split(':'),r=p.game.withdrawStorage(id,good,Number(n));p.toast(r.message||'Goods collected.');if(r.ok){p.save();p.updateHUD();}this.open('storage');return true;}
    if(action.startsWith('board:')){const [,decision,id]=action.split(':'),r=p.game.respondToBoard(id,decision==='accept');p.toast(r.message);if(r.ok)p.save();this.open('board');return true;}
    if(action.startsWith('focus:')){const good=action.slice(6)==='clear'?'':action.slice(6),r=p.game.setHelperFocus(good);if(r.ok)p.save();else p.toast(r.message);this.open('network');return true;}
    if(action==='checkpoint'){const r=captureRecovery(localStorage,p.world.id,{world:p.world,state:p.game.serialize()},{force:true,reason:'Kept by you'});p.toast(r.ok?'Recovery copy kept.':r.message);this.open('saves');return true;}
    if(action.startsWith('restore:')){
      const entry=recoveryEntries(localStorage,p.world.id).find(e=>e.id===action.slice(8));
      if(entry&&confirm('Restore this farm and its progress from this copy? Your current farm will be kept as a recovery copy.'))p.restorePackage(entry.payload,'Before restoring');
      return true;
    }
    if(action==='flow-view'){p.routes=true;p.renderer.setRoutesVisible(true);p.container.querySelector('[data-play="routes"]').classList.add('active');p.action('close');return true;}
    return false;
  }
  change(target){
    const p=this.play;
    if(target.dataset.reserve){const r=p.game.setStorageReserve(target.dataset.reserve,target.dataset.good,Number(target.value));if(r?.ok===false)p.toast(r.message);else p.save();this.open('storage');}
    if(target.dataset.preference){const name=target.dataset.preference;p.preferences[name]=name==='volume'?Math.max(0,Math.min(1,Number(target.value)/100)):target.checked;p.persistPreferences();}
  }
}
