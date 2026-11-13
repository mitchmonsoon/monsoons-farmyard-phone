// Small, portable recovery snapshots. Primary saves keep their existing keys.
export const PROGRESS_KEY = 'monsoons-farmyard-world-progress-v1';
export const RECOVERY_KEY = 'monsoons-farmyard-recovery-v1';
const WORLD_LIBRARY_KEY = 'monsoons-farmyard-worlds-v1';
const MAX_ENTRIES = 24, PER_FARM = 5, MAX_BYTES = 1_500_000;
let sequence = 0;
const clone = value => JSON.parse(JSON.stringify(value));
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const safeSlot = slot => typeof slot === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(slot) && !['__proto__','constructor','prototype'].includes(slot);

export function recoveryEntries(storage, slot) {
  try {
    const entries = JSON.parse(storage.getItem(RECOVERY_KEY) || '[]');
    return Array.isArray(entries) ? entries.filter(e => object(e) && safeSlot(e.slot) && typeof e.id === 'string' && Number.isFinite(e.at) && object(e.payload) && (!slot || e.slot === slot)).sort((a,b) => b.at-a.at) : [];
  } catch { return []; }
}

export function captureRecovery(storage, slot, payload, {now=Date.now(), force=false, reason='Automatic recovery'}={}) {
  if (!safeSlot(slot) || !object(payload)) return {ok:false, message:'This recovery save is not valid.'};
  try {
    const entries = recoveryEntries(storage), previous = entries.find(e => e.slot===slot);
    if (!force && previous && now-previous.at<60_000) return {ok:true, skipped:true};
    const entry = {id:`${now.toString(36)}-${(++sequence).toString(36)}`,slot,at:now,reason:String(reason).slice(0,80),payload:clone(payload)};
    let result = [entry,...entries].filter((e,index,list) => list.slice(0,index).filter(other=>other.slot===e.slot).length<PER_FARM).slice(0,MAX_ENTRIES);
    while(result.length>1 && JSON.stringify(result).length*2>MAX_BYTES) result.pop();
    if(JSON.stringify(result).length*2>MAX_BYTES) return {ok:false,message:'This farm is too large for a recovery copy. Export a backup.'};
    storage.setItem(RECOVERY_KEY,JSON.stringify(result));
    return {ok:true,id:entry.id};
  } catch { return {ok:false,message:'Recovery copies are unavailable. Export a backup from Farm options.'}; }
}

export function loadWorldProgress(storage, id) {
  try {
    const all = JSON.parse(storage.getItem(PROGRESS_KEY) || '{}');
    if (!object(all)) throw new Error('invalid');
    if(Object.hasOwn(all,id)&&(!object(all[id])||all[id].worldId!==id))throw new Error('invalid farm');
    return {ok:true,state:Object.hasOwn(all,id)?all[id]:null};
  } catch { return {ok:false,state:null,message:'Your saved data could not be read. Open Recovery to restore a copy or import a backup.'}; }
}

export function saveWorldProgress(storage, world, state, {now=Date.now(),repair=false,checkpoint=true,forceCheckpoint=false,reason='Automatic recovery'}={}) {
  if(!safeSlot(world?.id)||!object(state)||state.worldId!==world.id) return {ok:false,message:'The farm and progress do not match.'};
  try {
    let all, raw=storage.getItem(PROGRESS_KEY);
    try { all=JSON.parse(raw||'{}');if(!object(all))throw new Error('invalid'); }
    catch {
      if(!repair) return {ok:false,message:'Existing save data needs recovery. It has been kept unchanged.'};
      // Keep the unreadable original before a user-requested recovery/import.
      if(raw)storage.setItem(PROGRESS_KEY+'-unreadable',raw);
      all={};
    }
    if(Object.hasOwn(all,world.id)&&(!object(all[world.id])||all[world.id].worldId!==world.id)){
      if(!repair)return {ok:false,message:'This farm’s saved progress needs recovery. It has been kept unchanged.'};
      if(raw)storage.setItem(PROGRESS_KEY+'-unreadable',raw);
    }
    all[world.id]=clone(state);
    storage.setItem(PROGRESS_KEY,JSON.stringify(all));
    const recovery=checkpoint?captureRecovery(storage,world.id,{world,state},{now,force:forceCheckpoint,reason}):{ok:true,skipped:true};
    return {ok:true,at:now,recovery};
  } catch { return {ok:false,message:'Saving is unavailable or storage is full. Export a backup now.'}; }
}

export function savedLabel(at, now=Date.now()) {
  if(!Number.isFinite(at)||!at)return 'Autosave ready';
  const seconds=Math.max(0,Math.floor((now-at)/1000));
  return seconds<10?'Saved just now':seconds<60?`Saved ${seconds}s ago`:`Saved ${Math.floor(seconds/60)}m ago`;
}

// An imported layout and its progress must either both be kept or both stay old.
export function saveWorldPackage(storage, world, state, {now=Date.now(),repair=true}={}) {
  if(!safeSlot(world?.id)||!object(state)||state.worldId!==world.id)return {ok:false,message:'The farm and progress do not match.'};
  let oldProgress, progressWritten=false;
  try {
    oldProgress=storage.getItem(PROGRESS_KEY);
    const rawLibrary=storage.getItem(WORLD_LIBRARY_KEY);
    let library;
    try {
      library=JSON.parse(rawLibrary||'{"version":1,"worlds":[]}');
      if(!object(library)||!Array.isArray(library.worlds))throw new Error('invalid');
    }catch {
      if(!repair)return {ok:false,message:'Your farm library needs recovery. It has been kept unchanged.'};
      if(rawLibrary)storage.setItem(WORLD_LIBRARY_KEY+'-unreadable',rawLibrary);
      library={version:1,worlds:[]};
    }
    const worlds=library.worlds.filter(w=>w?.id!==world.id);
    worlds.push(clone(world));
    const nextLibrary=JSON.stringify({...library,version:1,worlds});
    const saved=saveWorldProgress(storage,world,state,{now,repair,checkpoint:false});
    if(!saved.ok)return saved;
    progressWritten=true;
    storage.setItem(WORLD_LIBRARY_KEY,nextLibrary);
    return saved;
  }catch {
    if(progressWritten)try {
      if(oldProgress===null)storage.removeItem(PROGRESS_KEY);else storage.setItem(PROGRESS_KEY,oldProgress);
    }catch {return {ok:false,message:'Storage stopped responding. Your previous farm is in Recovery; export it before continuing.'};}
    return {ok:false,message:'The backup could not be saved. Your previous farm and progress have been kept.'};
  }
}
