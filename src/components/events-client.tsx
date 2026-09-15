'use client';

import { useEffect,useMemo,useRef,useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, Check, Loader2, MapPin, Share2, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type EventRow={id:string;title:string;description:string|null;category:string|null;cover_url:string|null;venue_name:string|null;address:string|null;city:string|null;state:string|null;is_online:boolean;external_url:string|null;starts_at:string;ends_at:string|null};

export function EventsClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const searchParams=useSearchParams();
 const focusedId=searchParams.get('evento');
 const eventRefs=useRef<Record<string,HTMLElement|null>>({});
 const [events,setEvents]=useState<EventRow[]>([]); const [userId,setUserId]=useState<string|null>(null); const [going,setGoing]=useState<Set<string>>(new Set()); const [feedbackDone,setFeedbackDone]=useState<Set<string>>(new Set()); const [loading,setLoading]=useState(true);
 async function load(){
  setLoading(true); const {data:{user}}=await supabase.auth.getUser(); setUserId(user?.id||null);
  const {data}=await supabase.from('events').select('id,title,description,category,cover_url,venue_name,address,city,state,is_online,external_url,starts_at,ends_at').order('starts_at',{ascending:true}); setEvents((data||[]) as EventRow[]);
  if(user){const {data:a}=await supabase.from('event_attendees').select('event_id,status').eq('user_id',user.id); setGoing(new Set((a||[]).filter((x:{status:string})=>x.status==='going'||x.status==='confirmed').map((x:{event_id:string})=>x.event_id))); const {data:f}=await supabase.from('event_feedback').select('event_id').eq('user_id',user.id); setFeedbackDone(new Set((f||[]).map((x:{event_id:string})=>x.event_id)));}
  setLoading(false);
 }
 useEffect(()=>{void load(); const ch=supabase.channel('events-live').on('postgres_changes',{event:'*',schema:'public',table:'events'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'event_attendees'},()=>void load()).subscribe();return()=>{void supabase.removeChannel(ch)}},[supabase]);
 useEffect(()=>{if(loading||!focusedId)return;const target=eventRefs.current[focusedId];if(target)setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'center'}),120)},[loading,focusedId,events]);
 async function toggleGoing(eventId:string){if(!userId)return; if(going.has(eventId)){await supabase.from('event_attendees').delete().eq('event_id',eventId).eq('user_id',userId);}else{await supabase.from('event_attendees').upsert({event_id:eventId,user_id:userId,status:'going'});} await load();}
 async function share(e:EventRow){const url=`${window.location.origin}/eventos/${e.id}`; if(navigator.share){try{await navigator.share({title:e.title,text:'Confira este evento no GeekoPlay',url})}catch{}}else{try{await navigator.clipboard.writeText(url)}catch{}}}
 const now=Date.now();
 return <div className="mx-auto max-w-5xl px-3 pb-8 sm:px-4"><div className="mb-5"><h1 className="text-2xl font-black">Eventos</h1><p className="mt-1 text-sm text-slate-400">Eventos oficiais cadastrados pela equipe GeekoPlay.</p></div>
 {loading?<div className="py-20 grid place-items-center"><Loader2 className="animate-spin text-geek-orange"/></div>:events.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><CalendarDays className="mx-auto mb-3 text-geek-orange"/>Nenhum evento cadastrado no momento.</div>:<div className="grid gap-4 md:grid-cols-2">{events.map(e=>{const ended=new Date(e.ends_at||e.starts_at).getTime()<now; const attending=going.has(e.id);const focused=focusedId===e.id;return <article ref={node=>{eventRefs.current[e.id]=node}} key={e.id} className={`overflow-hidden rounded-2xl border bg-geek-panel transition-all ${focused?'border-orange-400 ring-2 ring-orange-500/20':'border-geek-line'}`}>
  <Link href={`/eventos/${e.id}`} className="block"><div className="aspect-[16/7] bg-geek-soft overflow-hidden flex items-center justify-center">{e.cover_url?<img src={e.cover_url} alt={e.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<div className="h-full grid place-items-center text-slate-600"><CalendarDays size={38}/></div>}</div></Link>
  <div className="p-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{e.category&&<span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">{e.category}</span>}{ended&&<span className="rounded-full bg-slate-500/10 px-2 py-1 text-[10px] text-slate-400">Encerrado</span>}{focused&&<span className="rounded-full bg-orange-500/15 px-2 py-1 text-[10px] font-bold text-orange-300">Evento compartilhado</span>}</div><Link href={`/eventos/${e.id}`} className="mt-2 block text-lg font-black hover:text-orange-300">{e.title}</Link></div><button onClick={()=>share(e)} className="rounded-xl border border-geek-line p-2 text-slate-300" aria-label="Compartilhar"><Share2 size={18}/></button></div>
  <p className="mt-2 text-sm text-slate-400">{new Date(e.starts_at).toLocaleString('pt-BR',{dateStyle:'medium',timeStyle:'short'})}{e.ends_at?` até ${new Date(e.ends_at).toLocaleString('pt-BR',{dateStyle:'medium',timeStyle:'short'})}`:''}</p>
  <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">{e.is_online?<><Video size={16}/>Evento online</>:<><MapPin size={16}/>{[e.venue_name,e.city,e.state].filter(Boolean).join(' · ')||'Local a confirmar'}</>}</div>
  {e.address&&!e.is_online&&<p className="mt-1 text-xs text-slate-500">{e.address}</p>}
  {e.description&&<p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-300">{e.description}</p>}
  <div className="mt-4 flex flex-wrap gap-2"><Link href={`/eventos/${e.id}`} className="rounded-xl border border-geek-line px-4 py-2 text-sm font-bold hover:bg-geek-soft">Ver detalhes</Link>{!ended&&<button onClick={()=>toggleGoing(e.id)} className={`rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 ${attending?'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300':'bg-geek-orange text-white'}`}>{attending?<><Check size={17}/>Vou participar</>:'Confirmar presença'}</button>}{ended&&attending&&!feedbackDone.has(e.id)&&<Link href={`/eventos/${e.id}/avaliar`} className="rounded-xl bg-geek-orange px-4 py-2 text-sm font-bold">Avaliar evento</Link>}{ended&&feedbackDone.has(e.id)&&<span className="rounded-xl border border-geek-line px-4 py-2 text-sm text-emerald-300">Avaliação enviada</span>}{e.external_url&&<a href={e.external_url} target="_blank" rel="noreferrer" className="rounded-xl border border-geek-line px-4 py-2 text-sm">Site do evento</a>}</div>
  </div></article>})}</div>}
 </div>;
}
