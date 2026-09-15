'use client';

import { useEffect,useMemo,useState } from 'react';
import { CalendarDays, Check, Crown, ExternalLink, Info, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Settings={premium_price:number;premium_payment_url:string|null;pro_hides_ads:boolean;premium_duration_days:number;premium_period_label:string};
type Request={id:string;amount:number;status:string;requested_at:string;reviewed_at:string|null;duration_days:number|null;period_label:string|null;starts_at:string|null;expires_at:string|null};
type Profile={is_pro:boolean;pro_expires_at:string|null};

function fmtDate(value:string|null|undefined){return value?new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}):null}

export function PremiumClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [settings,setSettings]=useState<Settings|null>(null);
 const [request,setRequest]=useState<Request|null>(null);
 const [profile,setProfile]=useState<Profile>({is_pro:false,pro_expires_at:null});
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [message,setMessage]=useState('');

 async function load(){
  const {data:{user}}=await supabase.auth.getUser();if(!user)return;
  await supabase.rpc('refresh_my_pro_status');
  const [{data:s},{data:p},{data:r}]=await Promise.all([
   supabase.from('monetization_settings').select('premium_price,premium_payment_url,pro_hides_ads,premium_duration_days,premium_period_label').eq('id','default').single(),
   supabase.from('profiles').select('is_pro,pro_expires_at').eq('id',user.id).single(),
   supabase.from('premium_requests').select('id,amount,status,requested_at,reviewed_at,duration_days,period_label,starts_at,expires_at').eq('user_id',user.id).order('requested_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  setSettings(s as Settings|null);setProfile((p as Profile|null)||{is_pro:false,pro_expires_at:null});setRequest(r as Request|null);setLoading(false)
 }
 useEffect(()=>{void load()},[supabase]);

 async function requestPremium(){
  setWorking(true);setMessage('');
  const {error}=await supabase.rpc('request_premium');
  if(error){setMessage(error.message.includes('PENDING')?'Você já possui uma solicitação Premium em análise.':error.message.includes('ALREADY_PRO')?'Seu perfil já é GeekoPlay PRO.':'Não foi possível criar a solicitação Premium.')}else{setMessage('Solicitação Premium criada. Após o pagamento, o ADM poderá confirmar sua assinatura.');await load()}
  setWorking(false)
 }
 async function cancel(){if(!request)return;setWorking(true);const {error}=await supabase.from('premium_requests').update({status:'cancelled'}).eq('id',request.id).eq('status','pending');setMessage(error?'Não foi possível cancelar a solicitação.':'Solicitação cancelada.');await load();setWorking(false)}

 if(loading)return <div className="grid place-items-center py-24 text-slate-400"><Loader2 className="animate-spin text-geek-orange"/></div>;
 const price=Number(settings?.premium_price||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const period=settings?.premium_period_label||'Mensal';
 const duration=settings?.premium_duration_days||30;
 const status=request?.status;
 const requestDuration=request?.duration_days||duration;
 const requestPeriod=request?.period_label||period;
 const activeUntil=profile.pro_expires_at||request?.expires_at;

 return <div className="mx-auto max-w-5xl px-3 pb-10 sm:px-4">
  <section className="overflow-hidden rounded-3xl border border-yellow-600/35 bg-gradient-to-br from-yellow-500/10 via-geek-panel to-orange-500/5 p-5 sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300"><Crown size={15}/>GEEKOPLAY PRO</div><h1 className="text-3xl font-semibold sm:text-4xl">Mais destaque para sua identidade geek.</h1><p className="mt-3 leading-7 text-slate-300">O Premium é a camada de benefícios do GeekoPlay. Seu perfil recebe selo PRO e fica preparado para vantagens exclusivas da plataforma.</p></div><div className="rounded-2xl border border-yellow-500/25 bg-black/20 p-5 text-center lg:min-w-64"><p className="text-sm text-slate-400">Plano {period}</p><p className="mt-1 text-3xl font-semibold text-yellow-300">{price}</p><p className="mt-1 text-xs text-slate-500">{duration} {duration===1?'dia':'dias'} de acesso PRO</p></div></div></section>

  <section className="mt-5 rounded-2xl border border-orange-500/25 bg-orange-500/5 p-4 sm:p-5"><div className="flex items-start gap-3"><Info size={20} className="mt-0.5 shrink-0 text-geek-orange"/><div><h2 className="font-semibold">Antes de assinar</h2><div className="mt-2 grid gap-2 text-sm leading-6 text-slate-300 sm:grid-cols-2"><p><b className="font-semibold text-white">Duração:</b> esta compra libera {duration} {duration===1?'dia':'dias'} de GeekoPlay PRO.</p><p><b className="font-semibold text-white">Início:</b> o período começa quando o pagamento é confirmado pelo ADM.</p><p><b className="font-semibold text-white">Renovação:</b> não é automática dentro do GeekoPlay. Ao terminar o período, uma nova compra será necessária.</p><p><b className="font-semibold text-white">Pagamento:</b> é feito pelo link definido pelo GeekoPlay; a ativação ocorre após conferência administrativa.</p></div></div></div></section>

  <div className="mt-5 grid gap-4 md:grid-cols-2">
   <section className="rounded-2xl border border-geek-line bg-geek-panel p-5"><h2 className="font-semibold">Benefícios previstos</h2><div className="mt-4 space-y-3 text-sm text-slate-300">{['Selo PRO visível no perfil','Destaque de identidade dentro da comunidade',settings?.pro_hides_ads?'Experiência sem anúncios enquanto a regra estiver ativa':'Benefícios de anúncios conforme configuração da plataforma','Acesso a vantagens e recursos Premium futuros'].map(item=><div key={item} className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-green-400"/><span>{item}</span></div>)}</div></section>
   <section className="rounded-2xl border border-geek-line bg-geek-panel p-5"><h2 className="font-semibold">Sua assinatura</h2>
    {profile.is_pro?<div className="mt-4 rounded-2xl border border-green-500/25 bg-green-500/10 p-4"><div className="flex items-center gap-2 font-semibold text-green-300"><ShieldCheck size={20}/>Você é GeekoPlay PRO</div>{activeUntil?<div className="mt-3 flex items-start gap-2 text-sm text-slate-300"><CalendarDays size={17} className="mt-0.5 shrink-0"/><span>Seu acesso está ativo até <b className="font-semibold text-white">{fmtDate(activeUntil)}</b>.</span></div>:<p className="mt-2 text-sm text-slate-400">Seu perfil está com o benefício ativo.</p>}</div>
    :status==='pending'?<div className="mt-4 space-y-3"><div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4"><p className="font-semibold text-yellow-300">Solicitação em análise</p><p className="mt-1 text-sm text-slate-400">{requestPeriod} · {requestDuration} {requestDuration===1?'dia':'dias'} · {Number(request?.amount||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><p className="mt-2 text-xs leading-5 text-slate-500">O período só começa depois que o ADM confirmar o pagamento.</p></div>{settings?.premium_payment_url&&<a href={settings.premium_payment_url} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-semibold">Ir para pagamento <ExternalLink size={17}/></a>}<button onClick={cancel} disabled={working} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 px-4 py-3 font-semibold text-red-300"><X size={17}/>Cancelar solicitação</button></div>
    :<div className="mt-4"><p className="text-sm leading-6 text-slate-400">Você está escolhendo o plano <b className="font-semibold text-white">{period}</b>, com {duration} {duration===1?'dia':'dias'} de acesso. Leia as condições acima antes de continuar.</p><button onClick={requestPremium} disabled={working} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-semibold disabled:opacity-60"><Sparkles size={17}/>{working?'Criando solicitação...':'Quero ser PRO'}</button></div>}
    {message&&<p className="mt-3 text-sm text-slate-300">{message}</p>}
   </section>
  </div>
 </div>
}
