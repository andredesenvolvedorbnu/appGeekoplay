'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Heart, MessageCircle, UserPlus, Mail, CalendarDays, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

type Profile = { id: string; display_name: string; username: string | null; avatar_url: string | null };

const filters = [
  ['Todas', 'all'],
  ['Curtidas', 'like'],
  ['Comentários', 'comment'],
  ['Seguidores', 'follow'],
  ['Mensagens', 'message'],
  ['Eventos', 'event'],
] as const;

function iconFor(type:string){
  if(type==='like') return <Heart size={18}/>;
  if(type==='comment') return <MessageCircle size={18}/>;
  if(type==='follow') return <UserPlus size={18}/>;
  if(type==='message') return <Mail size={18}/>;
  if(type==='event') return <CalendarDays size={18}/>;
  return <Bell size={18}/>;
}

function relativeTime(value:string){
  const diff=Math.max(0,Date.now()-new Date(value).getTime());
  const min=Math.floor(diff/60000);
  if(min<1)return 'agora';
  if(min<60)return `há ${min} min`;
  const h=Math.floor(min/60);
  if(h<24)return `há ${h} h`;
  const d=Math.floor(h/24);
  if(d<7)return `há ${d} d`;
  return new Date(value).toLocaleDateString('pt-BR');
}

export function NotificationsClient(){
  const supabase=useMemo(()=>createClient(),[]);
  const [rows,setRows]=useState<Notification[]>([]);
  const [profiles,setProfiles]=useState<Record<string,Profile>>({});
  const [filter,setFilter]=useState('all');
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setRows([]);setLoading(false);return;}
    const {data}=await supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);
    const safe=(data||[]) as Notification[];
    setRows(safe);
    const ids=[...new Set(safe.map(n=>n.actor_id).filter(Boolean))] as string[];
    if(ids.length){
      const {data:ps}=await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids);
      const map:Record<string,Profile>={};
      (ps||[]).forEach((p:Profile)=>map[p.id]=p);
      setProfiles(map);
    } else setProfiles({});
    setLoading(false);
  }

  useEffect(()=>{
    void load();
    const channel=supabase.channel('notifications-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications'},()=>{void load();})
      .subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[supabase]);

  async function markAllRead(){
    const unread=rows.filter(n=>!n.is_read).map(n=>n.id);
    if(!unread.length)return;
    await supabase.from('notifications').update({is_read:true}).in('id',unread);
    setRows(current=>current.map(n=>({...n,is_read:true})));
  }

  async function markRead(id:string){
    const row=rows.find(n=>n.id===id);
    if(!row || row.is_read)return;
    await supabase.from('notifications').update({is_read:true}).eq('id',id);
    setRows(current=>current.map(n=>n.id===id?{...n,is_read:true}:n));
  }

  const visible=filter==='all'?rows:rows.filter(n=>n.type===filter);
  const unreadCount=rows.filter(n=>!n.is_read).length;

  return <div className="mx-auto max-w-3xl px-3 sm:px-4">
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div><h1 className="text-2xl font-black">Notificações</h1><p className="text-sm text-slate-400 mt-1">Curtidas, comentários, seguidores, mensagens e eventos.</p></div>
      <button onClick={markAllRead} disabled={!unreadCount} className="ml-auto rounded-xl border border-geek-line bg-geek-panel px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-40"><CheckCheck size={17}/>Marcar todas como lidas</button>
    </div>

    <div className="mb-4 overflow-x-auto"><div className="flex min-w-max gap-2">{filters.map(([label,value])=><button key={value} onClick={()=>setFilter(value)} className={`rounded-full border px-3 py-2 text-xs ${filter===value?'border-geek-orange bg-geek-orange text-white':'border-geek-line bg-geek-panel text-slate-300'}`}>{label}</button>)}</div></div>

    {loading?<div className="py-20 grid place-items-center text-slate-400"><Loader2 className="animate-spin"/></div>:visible.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><Bell className="mx-auto mb-3 text-geek-orange"/>Nenhuma notificação por aqui.</div>:<div className="space-y-2">{visible.map(n=>{
      const actor=n.actor_id?profiles[n.actor_id]:null;
      return <button key={n.id} onClick={()=>markRead(n.id)} className={`w-full text-left rounded-2xl border p-4 transition ${n.is_read?'border-geek-line bg-geek-panel':'border-orange-500/40 bg-orange-500/5'}`}>
        <div className="flex gap-3">
          <div className="relative h-11 w-11 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-purple-600 grid place-items-center">
            {actor?.avatar_url?<img src={actor.avatar_url} alt="" className="h-full w-full object-cover"/>:<span className="text-white">{iconFor(n.type)}</span>}
            <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-geek-soft border border-geek-line grid place-items-center text-geek-orange">{iconFor(n.type)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2"><p className="font-bold text-sm">{actor?.display_name?`${actor.display_name} · ${n.title}`:n.title}</p>{!n.is_read&&<span className="ml-auto mt-1 h-2 w-2 shrink-0 rounded-full bg-geek-orange"/>}</div>
            {n.body&&<p className="mt-1 text-sm text-slate-400 break-words">{n.body}</p>}
            <p className="mt-1 text-xs text-slate-500">{relativeTime(n.created_at)}</p>
          </div>
        </div>
      </button>
    })}</div>}
  </div>;
}
