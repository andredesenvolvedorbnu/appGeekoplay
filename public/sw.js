const CACHE_NAME='geekoplay-shell-v1';
const STATIC_ASSETS=['/icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC_ASSETS)).catch(()=>undefined));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
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
