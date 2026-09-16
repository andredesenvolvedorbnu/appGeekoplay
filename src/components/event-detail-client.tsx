'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ArrowLeft, CalendarDays, Check, ExternalLink, Loader2, MapPin, Share2, UserRound, Users, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type EventRow={id:string;title:string;description:string|null;category:string|null;cover_url:string|null;venue_name:string|null;address:string|null;city:string|null;state:string|null;is_online:boolean;external_url:string|null;starts_at:string;ends_at:string|null};
type Attendee={user_id:string;status:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;level:number};

export function EventDetailClient({eventId}:{eventId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [event,setEvent]=useState<EventRow|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [attendees,setAttendees]=useState<Profile[]>([]);
 const [checkedInIds,setCheckedInIds]=useState<Set<string>>(new Set());
 const [attending,setAttending]=useState(false);
 const [feedbackDone,setFeedbackDone]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');

 async function load(){
  setLoading(true);setMessage('');
  const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
  const {data:e}=await supabase.from('events').select('id,title,description,category,cover_url,venue_name,address,city,state,is_online,external_url,starts_at,ends_at').eq('id',eventId).maybeSingle();
  if(!e){setEvent(null);setLoading(false);return}
  setEvent(e as EventRow);
  const {data:a}=await supabase.from('event_attendees').select('user_id,status').eq('event_id',eventId);
  const going=((a||[]) as Attendee[]).filter(x=>x.status==='going'||x.status==='confirmed');
  if(user)setAttending(going.some(x=>x.user_id===user.id));else setAttending(false);
  const ids=[...new Set(going.map(x=>x.user_id))];
  if(ids.length){const {data:p}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level').in('id',ids);setAttendees((p||[]) as Profile[])}else setAttendees([]);
  const {data:checkins}=await supabase.from('event_checkins').select('user_id,checked_in_at').eq('event_id',eventId).gte('checked_in_at',new Date(Date.now()-12*60*60*1000).toISOString());
  setCheckedInIds(new Set((checkins||[]).map((row:{user_id:string})=>row.user_id)));
  if(user){const {data:f}=await supabase.from('event_feedback').select('event_id').eq('event_id',eventId).eq('user_id',user.id).maybeSingle();setFeedbackDone(!!f)}else setFeedbackDone(false);
  setLoading(false);
 }

 useEffect(()=>{void load();const ch=supabase.channel(`event-detail-${eventId}`).on('postgres_changes',{event:'*',schema:'public',table:'event_attendees',filter:`event_id=eq.${eventId}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'event_checkins',filter:`event_id=eq.${eventId}`},()=>void load()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'events',filter:`id=eq.${eventId}`},()=>void load()).subscribe();return()=>{void supabase.removeChannel(ch)}},[eventId,supabase]);

 async function toggleGoing(){
  if(!userId||!event)return;
  setBusy(true);setMessage('');
  if(attending){const {error}=await supabase.from('event_attendees').delete().eq('event_id',event.id).eq('user_id',userId);if(error)setMessage('Não foi possível remover sua presença.')}
  else{const {error}=await supabase.from('event_attendees').upsert({event_id:event.id,user_id:userId,status:'going'});if(error)setMessage('Não foi possível confirmar sua presença.')}
  await load();setBusy(false);
 }

 async function share(){
  if(!event)return;
  const url=window.location.href;
  if(navigator.share){try{await navigator.share({title:event.title,text:'Confira este evento no GeekoPlay',url})}catch{}}
  else{try{await navigator.clipboard.writeText(url);setMessage('Link do evento copiado.')}catch{setMessage('Não foi possível copiar o link.')}}
 }

 async function toggleCheckin(){
  if(!userId||!event)return;setBusy(true);setMessage('');
  const checkedIn=checkedInIds.has(userId);
  const result=checkedIn?await supabase.from('event_checkins').delete().eq('event_id',event.id).eq('user_id',userId):await supabase.from('event_checkins').upsert({event_id:event.id,user_id:userId,checked_in_at:new Date().toISOString()},{onConflict:'event_id,user_id'});
  if(result.error)setMessage(checkedIn?'Não foi possível encerrar seu check-in.':'O check-in só fica disponível para quem confirmou presença e durante o período do evento.');
  else setMessage(checkedIn?'Check-in encerrado.':'Check-in feito! Agora outras pessoas no evento podem encontrar você.');
  await load();setBusy(false);
 }

 if(loading)return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-geek-orange"/></div>;
 if(!event)return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-black">Evento não encontrado</h1><p className="mt-2 text-sm text-slate-400">Este evento pode ter sido removido.</p><Link href="/eventos" className="mt-5 inline-flex rounded-xl bg-geek-orange px-4 py-2 font-bold">Voltar para Eventos</Link></div>;

 const ended=new Date(event.ends_at||event.starts_at).getTime()<Date.now();
 const checkinOpens=new Date(event.starts_at).getTime()-6*60*60*1000;
 const checkinCloses=new Date(event.ends_at||new Date(new Date(event.starts_at).getTime()+24*60*60*1000)).getTime()+6*60*60*1000;
 const checkinOpen=Date.now()>=checkinOpens&&Date.now()<=checkinCloses;
 const checkedIn=userId?checkedInIds.has(userId):false;
 const checkedInPeople=attendees.filter(person=>checkedInIds.has(person.id));
 return <div className="mx-auto max-w-5xl space-y-5 px-3 pb-10 sm:px-4">
  <div className="flex items-center justify-between gap-3"><Link href="/eventos" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>Voltar</Link><button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm hover:bg-geek-soft"><Share2 size={16}/>Compartilhar</button></div>

  <section className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel">
   <div className="flex aspect-[16/7] min-h-[200px] items-center justify-center overflow-hidden bg-geek-soft">{event.cover_url?<img src={event.cover_url} alt={event.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<CalendarDays size={64} className="text-orange-300/40"/>}</div>
   <div className="p-5 sm:p-7"><div className="flex flex-col gap-4 md:flex-row md:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2">{event.category&&<span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300">{event.category}</span>}{ended&&<span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-xs text-slate-400">Encerrado</span>}{checkedIn&&<span className="rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-xs text-fuchsia-300">Você está aqui</span>}</div><h1 className="mt-3 text-2xl font-black sm:text-3xl">{event.title}</h1><div className="mt-4 grid gap-2 text-sm text-slate-400"><div className="flex items-start gap-2"><CalendarDays size={17} className="mt-0.5 shrink-0"/><span>{new Date(event.starts_at).toLocaleString('pt-BR',{dateStyle:'long',timeStyle:'short'})}{event.ends_at?` até ${new Date(event.ends_at).toLocaleString('pt-BR',{dateStyle:'long',timeStyle:'short'})}`:''}</span></div><div className="flex items-start gap-2">{event.is_online?<><Video size={17} className="mt-0.5 shrink-0"/><span>Evento online</span></>:<><MapPin size={17} className="mt-0.5 shrink-0"/><span>{[event.venue_name,event.address,event.city,event.state].filter(Boolean).join(' · ')||'Local a confirmar'}</span></>}</div></div></div><div className="flex flex-wrap gap-2 md:max-w-[280px]">{!ended&&<button onClick={toggleGoing} disabled={busy} className={`flex-1 rounded-xl px-5 py-3 text-sm font-black disabled:opacity-60 ${attending?'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300':'bg-geek-orange text-white'}`}>{busy?'Aguarde...':attending?<span className="inline-flex items-center gap-2"><Check size={17}/>Vou participar</span>:'Confirmar presença'}</button>}{attending&&checkinOpen&&!event.is_online&&<button onClick={toggleCheckin} disabled={busy} className={`flex-1 rounded-xl px-5 py-3 text-sm font-black disabled:opacity-60 ${checkedIn?'border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300':'border border-geek-line bg-geek-soft text-white'}`}><span className="inline-flex items-center gap-2"><MapPin size={17}/>{checkedIn?'Encerrar check-in':'Estou aqui'}</span></button>}{ended&&attending&&!feedbackDone&&<Link href={`/eventos/${event.id}/avaliar`} className="rounded-xl bg-geek-orange px-5 py-3 text-sm font-black">Avaliar evento</Link>}{ended&&feedbackDone&&<span className="rounded-xl border border-geek-line px-4 py-3 text-sm text-emerald-300">Avaliação enviada</span>}{event.external_url&&<a href={event.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-geek-line px-4 py-3 text-sm font-bold"><ExternalLink size={16}/>Site oficial</a>}</div></div>{event.description&&<p className="mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">{event.description}</p>}{message&&<p className="mt-4 rounded-xl border border-geek-line bg-geek-soft px-4 py-3 text-sm text-slate-300">{message}</p>}</div>
  </section>

  {checkedInPeople.length>0&&<section className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><MapPin size={18} className="text-fuchsia-300"/><h2 className="font-black">Quem está aqui agora</h2></div><span className="text-sm text-slate-500">{checkedInPeople.length} pessoa{checkedInPeople.length===1?'':'s'}</span></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{checkedInPeople.map(profile=><Link key={profile.id} href={`/perfil/${profile.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-fuchsia-500/15 bg-geek-panel p-3 hover:border-fuchsia-400/40"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{profile.avatar_url?<img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={17}/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{profile.display_name}</p><p className="truncate text-xs text-slate-500">@{profile.username||'geek'} · Nível {profile.level}</p></div></Link>)}</div></section>}

  <section className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Users size={18} className="text-geek-orange"/><h2 className="font-black">Quem vai</h2></div><span className="text-sm text-slate-500">{attendees.length} pessoa{attendees.length===1?'':'s'}</span></div>{attendees.length===0?<p className="text-sm text-slate-500">Ninguém confirmou presença ainda.</p>:<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{attendees.map(profile=><Link key={profile.id} href={`/perfil/${profile.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-geek-line bg-geek-soft p-3 hover:border-orange-500/30"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{profile.avatar_url?<img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={17}/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{profile.display_name}</p><p className="truncate text-xs text-slate-500">@{profile.username||'geek'} · Nível {profile.level}</p></div></Link>)}</div>}</section>
 </div>;
}
