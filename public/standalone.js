import { WorldPlay } from './world-play.js';
import { WorldGame } from './world-engine.js';
import { createWorld, normalizeWorld, upgradeGrowingFarm } from './world-schema.js';
import { loadWorldProgress, saveWorldProgress, captureRecovery } from './save-history.js';

const FARM_ID='monsoons-growing-farm-m004';
const LIBRARY_KEY='monsoons-farmyard-worlds-v1';
const title=document.getElementById('title-screen');
const stage=document.getElementById('world-play');
const launch=document.getElementById('continue-game');
const fresh=document.getElementById('new-game');
const summary=document.getElementById('save-summary');
const dialog=document.getElementById('shell-dialog');
const dialogTitle=document.getElementById('shell-dialog-title');
const dialogBody=document.getElementById('shell-dialog-content');
let game=null,world=null,orientationDismissed=false;
function getWorld(){
  let raw,library={version:1,worlds:[]};
  try{const data=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'{}');if(Array.isArray(data.worlds))library=data;}catch{}
  raw=library.worlds.find(w=>w?.id===FARM_ID);
  if(!raw){raw=createWorld('farm');raw.id=FARM_ID;raw.name='Growing Farm';library.worlds.push(raw);try{localStorage.setItem(LIBRARY_KEY,JSON.stringify(library));}catch{summary.textContent='Saving is unavailable on this device. Export your farm backup after playing.';}return normalizeWorld(raw);}
  try{
    const next=upgradeGrowingFarm(raw);
    if(next.changed){
      const previous=loadWorldProgress(localStorage,FARM_ID);
      if(previous.state){const kept=captureRecovery(localStorage,FARM_ID,{world:raw,state:previous.state},{force:true,reason:'Before standalone upgrade'});if(!kept.ok)throw new Error('Export a recovery backup before upgrading this farm.');}
      library.worlds=library.worlds.map(w=>w.id===FARM_ID?next.world:w);
      localStorage.setItem(LIBRARY_KEY,JSON.stringify(library));return next.world;
    }
  }catch(e){console.warn('Keeping saved farm layout:',e);summary.textContent='This farm was kept unchanged. Check Saves in your Farm book.';}
  return normalizeWorld(raw);
}
function updateSummary(){
  if(!world)return;
  const progress=loadWorldProgress(localStorage,world.id);
  if(progress.state){const s=progress.state;launch.innerHTML='Continue my farm <span>▶</span>';summary.textContent=`Saved on this device · ${Math.max(0,Math.floor(s.coins||0)).toLocaleString()} coins · ${Math.max(0,Math.floor(s.ordersCompleted||0))} orders filled`;}
  else{launch.innerHTML='Start farming <span>▶</span>';summary.textContent=progress.ok?'New farm · automatic saving every 4 seconds':'Save data needs recovery. Open Farm book → Saves when playing.';}
}
function launchGame(newFarm=false){
  try{
    if(!world)world=getWorld();
    const existing=loadWorldProgress(localStorage,world.id);
    if(newFarm&&existing.state){
      if(!confirm('Start a fresh farm on this device? Your current farm will be kept as a recovery copy.'))return;
      const kept=captureRecovery(localStorage,world.id,{world,state:existing.state},{force:true,reason:'Before starting fresh'});
      if(!kept.ok){alert('A recovery copy could not be kept. Export your save from Farm book → Saves before restarting.');return;}
      const starting=new WorldGame(world).serialize();
      const saved=saveWorldProgress(localStorage,world,starting,{checkpoint:false});
      if(!saved.ok){alert(saved.message);return;}
    }
    if(game){game.destroy();game=null;}
    stage.hidden=false;
    game=new WorldPlay(stage,world,{onEdit:()=>{game?.toast('World Builder is available in the desktop studio.');},onImportWorld:imported=>{world=normalizeWorld(imported);stage.hidden=false;game?.destroy();game=new WorldPlay(stage,world);}});
    title.hidden=true;
    stage.querySelector('.wp-stage')?.focus?.({preventScroll:true});
    showPortraitHint();
  }catch(err){console.error('Farmyard could not start',err);stage.hidden=true;title.hidden=false;alert('Farmyard could not load. '+(err?.message||'Please try again.'));}
}
function goHome(){if(game){game.save();game.setActive(false);game.dialog?.close?.();game.destroy();game=null;}stage.hidden=true;title.hidden=false;updateSummary();showPortraitHint();}
function showModal(name,content){dialogTitle.textContent=name;dialogBody.innerHTML=content;if(!dialog.open)dialog.showModal();}
function howToPlay(){showModal('How to play',`<p>Start tiny, then grow a farm that works for you.</p><ol><li><b>Walk</b> into the hay to harvest it. On a phone, move with the left-hand joystick.</li><li><b>Feed</b> your hens and cows, collect eggs and milk, and deliver them to the market.</li><li><b>Earn coins</b> from customer shopping lists. Completed sales bank automatically.</li><li><b>Buy upgrades</b> by standing completely still on a golden square while its bar fills.</li><li><b>Grow</b> into neighbouring plots and hire helpers who take goods around the farm.</li><li><b>Contracts</b> on the Noticeboard are optional. A clock only starts after you accept.</li><li><b>Camera:</b> two fingers to move, pinch to zoom, twist to rotate. Landscape gives the best view.</li></ol><p>Your farm saves on <b>this device</b> every four seconds. Phone and Windows progress do not sync automatically. Export a backup from Farm book → Saves if needed.</p><p><strong>Add to Home Screen:</strong> iPhone Safari → Share → Add to Home Screen. Android Chrome → menu → Add to Home Screen / Install app.</p>`);}
function feedbackText(message){const s=game?.game?.state;return `MONSOONS FARMYARD · M009 FRIEND TEST
How it felt: ${message.trim()||'(write your feedback here)'}
Coins: ${s?.coins??'not started'} | Orders filled: ${s?.ordersCompleted??'not started'} | Missed: ${s?.ordersFailed??'not started'}
Game version: M009 phone test (M008 engine)
Device: ${navigator.userAgent}
Date: ${new Date().toISOString()}
`}
function showFeedback(){showModal('Send playtest feedback',`<p>Tell us what felt fun, what was confusing and anything that got stuck.</p><label for="feedback-note"><b>Your notes</b></label><textarea id="feedback-note" placeholder="I played for 15 minutes. I liked... I got stuck when..."></textarea><div class="feedback-actions"><button type="button" id="share-test">Share feedback</button><button type="button" id="copy-test">Copy report</button></div><p class="feedback-status" id="feedback-status" role="status"></p><small>Nothing is sent automatically. You choose when and where to share this report. It includes the device/browser name and basic in-game counts, but no saved farm data.</small>`);
  dialogBody.querySelector('#share-test').addEventListener('click',()=>shareFeedback(true));dialogBody.querySelector('#copy-test').addEventListener('click',()=>shareFeedback(false));}
async function shareFeedback(useShare){const message=feedbackText(dialogBody.querySelector('#feedback-note')?.value||'');const status=dialogBody.querySelector('#feedback-status');
  if(useShare&&typeof navigator.share==='function'){try{await navigator.share({title:'Monsoons Farmyard feedback',text:message});status.textContent='Feedback handed to your share sheet.';return;}catch(e){if(e?.name==='AbortError'){status.textContent='Sharing cancelled.';return;}}}
  try{await navigator.clipboard.writeText(message);status.textContent='Copied. Paste it into a message to the person who sent the game.';return;}catch{}
  const blob=new Blob([message],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='farmyard-friend-feedback.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);status.textContent='Report downloaded. Share the text file with your friend.';}
function showPortraitHint(){const hint=document.getElementById('portrait-hint');hint.hidden=orientationDismissed||!matchMedia('(orientation: portrait)').matches||window.innerWidth>800;}
try{world=getWorld();updateSummary();}catch(e){console.error(e);summary.textContent='Your farm needs attention: '+String(e.message||e);}
launch.addEventListener('click',()=>launchGame(false));fresh.addEventListener('click',()=>launchGame(true));
document.getElementById('how-to-play').addEventListener('click',howToPlay);
document.getElementById('send-feedback').addEventListener('click',showFeedback);
document.getElementById('close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
stage.addEventListener('click',e=>{const key=e.target.closest('[data-play]')?.dataset.play;if(key==='shell-home'){e.stopPropagation();goHome();}else if(key==='shell-feedback'){e.stopPropagation();showFeedback();}},{capture:true});
document.getElementById('dismiss-portrait').addEventListener('click',()=>{orientationDismissed=true;showPortraitHint();});
window.addEventListener('orientationchange',showPortraitHint);window.addEventListener('resize',showPortraitHint);
window.addEventListener('pagehide',()=>game?.save());
showPortraitHint();
if('serviceWorker' in navigator&&location.protocol==='https:'||'serviceWorker' in navigator&&location.hostname==='localhost')window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Offline install unavailable:',err)));
window.farmyardStandalone={version:'M009',get running(){return Boolean(game)},get build(){return 'M009 standalone / M008 game engine'}};
