'use client';

import { useEffect,useMemo,useRef,useState } from 'react';
import { MapPin,Pause,Play,Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type EventRow={starts_at:string;ends_at:string|null;is_online:boolean};
type Attendee={status:string};

export function EventLocationTracker({eventId}:{eventId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const watchId=useRef<number|null>(null);const lastSaved=useRef(0);
 const [userId,setUserId]=useState<string|null>(null);const [eligible,setEligible]=useState(false);const [tracking,setTracking]=useState(false);const [message,setMessage]=useState('');const [samples,setSamples]=useState(0);
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;setUserId(user.id);const [{data:event},{data:attendee},{count}]=await Promise.all([
  supabase.from('events').select('starts_at,ends_at,is_online').eq('id',eventId).maybeSingle(),
  supabase.from('event_attendees').select('status').eq('event_id',eventId).eq('user_id',user.id).maybeSingle(),
  supabase.from('event_location_samples').select('*',{count:'exact',head:true}).eq('event_id',eventId).eq('user_id',user.id)
 ]);setSamples(count||0);if(!event||event.is_online)return;const e=event as EventRow;const a=attendee as Attendee|null;const now=Date.now(),start=new Date(e.starts_at).getTime()-60*60*1000,end=new Date(e.ends_at||new Date(new Date(e.starts_at).getTime()+24*60*60*1000)).getTime()+60*60*1000;setEligible(Boolean(a&&['going','confirmed'].includes(a.status)&&now>=start&&now<=end))})()},[eventId,supabase]);
 useEffect(()=>()=>{if(watchId.current!==null&&typeof navigator!=='undefined')navigator.geolocation.clearWatch(watchId.current)},[]);
 async function savePosition(position:GeolocationPosition){if(!userId)return;const now=Date.now();if(now-lastSaved.current<30000)return;lastSaved.current=now;const {latitude,longitude,accuracy}=position.coords;if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||accuracy>150)return;const {error}=await supabase.from('event_location_samples').insert({event_id:eventId,user_id:userId,latitude,longitude,accuracy_m:accuracy,recorded_at:new Date(position.timestamp||Date.now()).toISOString()});if(error){setMessage('Não foi possível registrar sua localização agora.');stop();return}setSamples(v=>v+1)}
 function start(){if(!eligible||!userId)return;if(!('geolocation' in navigator)){setMessage('Seu dispositivo não disponibiliza localização.');return}setMessage('');watchId.current=navigator.geolocation.watchPosition(position=>void savePosition(position),()=>{setMessage('Permissão de localização negada ou indisponível.');stop()},{enableHighAccuracy:true,maximumAge:15000,timeout:20000});setTracking(true)}
 function stop(){if(watchId.current!==null){navigator.geolocation.clearWatch(watchId.current);watchId.current=null}setTracking(false)}
 async function clear(){stop();if(!userId||!window.confirm('Apagar seus registros de localização deste evento?'))return;const {error}=await supabase.from('event_location_samples').delete().eq('event_id',eventId).eq('user_id',userId);if(error)setMessage('Não foi possível apagar os registros.');else{setSamples(0);setMessage('Seus registros de localização foram apagados.')}}
 if(!eligible)return null;
 return <section className="mx-auto mt-5 max-w-5xl rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><MapPin size={18} className="text-fuchsia-300"/><h2 className="font-black">Mapa de movimento no evento</h2></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Opcional. Ao ativar, o GeekoPlay registra sua posição aproximadamente a cada 30 segundos durante este evento para estimar áreas de maior permanência. O rastreamento só começa após seu toque e para quando você encerrar ou sair da página.</p><p className="mt-2 text-xs text-slate-500">{samples} registro{samples===1?'':'s'} salvo{samples===1?'':'s'} neste evento.</p>{message&&<p className="mt-2 text-xs text-orange-300">{message}</p>}</div><div className="flex shrink-0 flex-wrap gap-2">{tracking?<button onClick={stop} className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-bold text-fuchsia-200"><Pause size={16}/>Parar</button>:<button onClick={start} className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-black text-white"><Play size={16}/>Ativar localização</button>}{samples>0&&<button onClick={()=>void clear()} className="inline-flex items-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm text-slate-300"><Trash2 size={15}/>Apagar meus dados</button>}</div></div></section>;
}
