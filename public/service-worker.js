const CACHE='monsoons-farmyard-m009-v3';
const ASSETS=[
  "./",
  "./index.html",
  "./standalone.css",
  "./standalone.js",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./studio.css",
  "./camera.css",
  "./farm-desk.css",
  "./art.js",
  "./camera-ui.js",
  "./canvas-renderer.js",
  "./farm-audio.js",
  "./farm-desk.js",
  "./livestock-canvas.js",
  "./pad-icons.js",
  "./renderer.js",
  "./save-history.js",
  "./touch-camera.js",
  "./ui.js",
  "./world-canvas.js",
  "./world-engine.js",
  "./world-play.js",
  "./world-renderer.js",
  "./world-schema.js",
  "./world-visuals.js",
  "./vendor/three.core.js",
  "./vendor/three.module.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('monsoons-farmyard-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));return;}
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));}return response;})));
});
