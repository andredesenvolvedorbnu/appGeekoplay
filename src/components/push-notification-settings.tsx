'use client';

import { useEffect,useMemo,useState } from 'react';
import { BellRing, Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Prefs={
  enabled:boolean;messages:boolean;interactions:boolean;follows:boolean;communities:boolean;
  events:boolean;party_finder:boolean;invites:boolean;
};

const defaults:Prefs={
  enabled:true,messages:true,interactions:true,follows:true,communities:true,
  events:true,party_finder:true,invites:true
};

function urlBase64ToUint8Array(base64String:string){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)));
}

export function PushNotificationSettings(){
  const supabase=useMemo(()=>createClient(),[]);
  const [prefs,setPrefs]=useState<Prefs>(defaults);
  const [supported,setSupported]=useState(true);
  const [active,setActive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{void (async()=>{
    const canUse=typeof window!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
    setSupported(canUse);
    if(!canUse){setLoading(false);return}
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setLoading(false);return}
    const {data}=await supabase.from('push_preferences')
      .select('enabled,messages,interactions,follows,communities,events,party_finder,invites')
      .eq('user_id',user.id).maybeSingle();
    if(data)setPrefs(data as Prefs);
    const registration=await navigator.serviceWorker.register('/sw.js');
    const subscription=await registration.pushManager.getSubscription();
    setActive(Boolean(subscription)&&Notification.permission==='granted'&&(data?.enabled??true));
    setLoading(false);
  })()},[supabase]);

  async function enable(){
    if(!supported)return;
    setBusy(true);setMessage('');
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error();
      const permission=await Notification.requestPermission();
      if(permission!=='granted'){setMessage('As notificações não foram autorizadas neste dispositivo.');return}
      const registration=await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const {data:keyData,error:keyError}=await supabase.rpc('get_push_public_key');
      if(keyError||!keyData)throw new Error();
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription){
        subscription=await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:urlBase64ToUint8Array(String(keyData))
        });
      }
      const json=subscription.toJSON();
      if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw new Error();
      const {error:subError}=await supabase.from('push_subscriptions').upsert({
        user_id:user.id,
        endpoint:json.endpoint,
        p256dh:json.keys.p256dh,
        auth:json.keys.auth,
        user_agent:navigator.userAgent,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id,endpoint'});
      if(subError)throw subError;
      const next={...prefs,enabled:true};
      const {error:prefError}=await supabase.from('push_preferences').upsert({
        user_id:user.id,...next,updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(prefError)throw prefError;
      setPrefs(next);setActive(true);setMessage('Notificações fora do app ativadas neste dispositivo.');
    }catch{
      setMessage('Não foi possível ativar as notificações neste dispositivo.');
    }finally{setBusy(false)}
  }

  async function disable(){
    setBusy(true);setMessage('');
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error();
      const registration=await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription=await registration?.pushManager.getSubscription();
      if(subscription){
        await supabase.from('push_subscriptions').delete().eq('user_id',user.id).eq('endpoint',subscription.endpoint);
        await subscription.unsubscribe();
      }
      await supabase.from('push_preferences').upsert({user_id:user.id,...prefs,enabled:false,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      setPrefs(current=>({...current,enabled:false}));setActive(false);setMessage('Notificações fora do app desativadas neste dispositivo.');
    }catch{
      setMessage('Não foi possível desativar as notificações agora.');
    }finally{setBusy(false)}
  }

  async function toggle(key:keyof Omit<Prefs,'enabled'>){
    const next={...prefs,[key]:!prefs[key]};
    setPrefs(next);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const {error}=await supabase.from('push_preferences').upsert({user_id:user.id,...next,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error){setPrefs(prefs);setMessage('Não foi possível salvar essa preferência.')}
  }

  const choices:[keyof Omit<Prefs,'enabled'>,string,string][]=[
    ['messages','Mensagens','Quando alguém enviar uma mensagem direta para você.'],
    ['interactions','Curtidas e comentários','Interações feitas diretamente nas suas publicações.'],
    ['follows','Novos seguidores','Quando alguém começar a seguir seu perfil.'],
    ['communities','Comunidades','Movimentos relevantes em comunidades das quais você participa.'],
    ['events','Eventos em comum','Quando alguém da sua rede também confirmar o mesmo evento.'],
    ['party_finder','Party Finder','Quando alguém entrar na sua Party ou houver uma alteração importante.'],
    ['invites','Convites','Convites direcionados para você.']
  ];

  return <section className="mb-5 rounded-2xl border border-orange-500/20 bg-geek-panel p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><BellRing size={19}/></div>
        <div><h2 className="font-black">Notificações fora do GeekoPlay</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Receba push apenas quando existir uma conexão real com você: mensagem, interação no seu conteúdo, seguidor, comunidade, Party, convite ou evento em comum. Nada de avisos aleatórios sobre qualquer postagem.</p></div>
      </div>
      {!loading&&supported&&(active
        ?<button onClick={()=>void disable()} disabled={busy} className="shrink-0 rounded-xl border border-geek-line px-4 py-2.5 text-sm font-bold disabled:opacity-50">Desativar neste dispositivo</button>
        :<button onClick={()=>void enable()} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy?<Loader2 size={16} className="animate-spin"/>:<BellRing size={16}/>}Ativar notificações</button>)}
    </div>
    {loading?<div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin"/>Verificando este dispositivo...</div>:!supported?<p className="mt-4 rounded-xl border border-geek-line bg-geek-soft p-3 text-sm text-slate-400">Este navegador não disponibiliza Push Notifications para o GeekoPlay neste modo.</p>:<>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{choices.map(([key,title,description])=><label key={key} className="flex cursor-pointer gap-3 rounded-xl border border-geek-line bg-geek-soft p-3"><input type="checkbox" checked={prefs[key]} onChange={()=>void toggle(key)} className="mt-1"/><span><b className="block text-sm">{title}</b><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span></label>)}</div>
      <p className="mt-3 inline-flex items-center gap-2 text-[11px] text-slate-500"><ShieldCheck size={13}/>Essas preferências controlam somente notificações relevantes e relacionadas à sua atividade ou conexões.</p>
    </>}
    {message&&<p className="mt-3 rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-sm text-slate-300">{message}</p>}
  </section>;
}
