const CACHE_NAME='geekoplay-shell-v2';
const MEDIA_CACHE='geekoplay-media-v2';
const STATIC_ASSETS=['/icon.svg'];
const MAX_MEDIA_ENTRIES=220;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC_ASSETS)).catch(()=>undefined));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  const keep=new Set([CACHE_NAME,MEDIA_CACHE]);
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>!keep.has(key)).map(key=>caches.delete(key)))));
  self.clients.claim();
});

async function trimMediaCache(){
  const cache=await caches.open(MEDIA_CACHE);
  const keys=await cache.keys();
  if(keys.length<=MAX_MEDIA_ENTRIES)return;
  await Promise.all(keys.slice(0,keys.length-MAX_MEDIA_ENTRIES).map(key=>cache.delete(key)));
}

function isPublicSupabaseMedia(url){
  return url.pathname.includes('/storage/v1/object/public/');
}

function isRangeOrVideoRequest(request){
  return Boolean(request.headers.get('range'))||request.destination==='video';
}

async function mediaCacheFirst(request){
  const cache=await caches.open(MEDIA_CACHE);
  // Public Storage URLs use immutable UUID paths. Query strings are commonly
  // cache-busters, so ignore them when matching to avoid downloading the same
  // image again and increasing cached egress.
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
  const response=await fetch(request);
  if(response&&response.ok){
    await cache.put(request,response.clone()).catch(()=>undefined);
    void trimMediaCache();
  }
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  if(isPublicSupabaseMedia(url)){
    // Range/video responses are partial and are not reliable candidates for
    // Cache Storage. Image and other complete media responses use cache-first.
    if(!isRangeOrVideoRequest(request))event.respondWith(mediaCacheFirst(request));
    return;
  }

  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request));
    return;
  }
  if(url.pathname==='/icon.svg'){
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
  }
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{}
  const title=data.title||'GeekoPlay';
  const options={
    body:data.body||'Você tem uma nova notificação.',
    icon:'/icon.svg',
    badge:'/icon.svg',
    tag:data.tag||'geekoplay-notification',
    renotify:false,
    data:{url:data.url||'/notificacoes',notificationId:data.notificationId||null}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/notificacoes',self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if('focus' in client){
        await client.focus();
        if('navigate' in client)await client.navigate(target);
        return;
      }
    }
    if(clients.openWindow)await clients.openWindow(target);
  })());
});
