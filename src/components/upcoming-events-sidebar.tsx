'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Event={id:string;title:string;cover_url:string|null;starts_at:string;city:string|null;state:string|null};

export function UpcomingEventsSidebar(){
  const supabase=useMemo(()=>createClient(),[]);
  const [events,setEvents]=useState<Event[]>([]);

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const {data:attendance}=await supabase.from('event_attendees').select('event_id').eq('user_id',user.id).eq('status','going');
    const ids=(attendance||[]).map(a=>a.event_id);
    if(!ids.length){setEvents([]);return}
    const {data}=await supabase.from('events').select('id,title,cover_url,starts_at,city,state').in('id',ids).gte('starts_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(3);
    setEvents((data||[]) as Event[]);
  })()},[supabase]);

  return <div className="mt-3 rounded-2xl border border-geek-line bg-geek-panel p-4">
    <div className="flex items-center justify-between"><b>Próximos eventos</b><Link href="/eventos" className="text-xs font-bold text-geek-orange">Ver todos</Link></div>
    {events.length===0?<p className="mt-2 text-sm text-slate-400">Confirme presença em um evento para acompanhar aqui.</p>:<div className="mt-3 space-y-3">{events.map(event=><Link href="/eventos" key={event.id} className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-geek-soft"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-geek-soft">{event.cover_url?<img src={event.cover_url} alt="" className="h-full w-full object-cover object-center"/>:<CalendarDays size={18} className="text-geek-orange"/>}</div><div className="min-w-0"><p className="truncate text-xs font-bold">{event.title}</p><p className="text-[10px] text-slate-500">{new Date(event.starts_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} · {[event.city,event.state].filter(Boolean).join(' / ')||'Local a definir'}</p></div></Link>)}</div>}
  </div>;
}
