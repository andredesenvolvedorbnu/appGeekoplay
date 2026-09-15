'use client';

import { useEffect,useMemo,useState } from 'react';
import { Loader2, MessageSquare, Search, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null};
type Msg={id:string;sender_id:string;recipient_id:string;body:string;read_at:string|null;created_at:string};

export function MessagesClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [userId,setUserId]=useState<string|null>(null);
 const [profiles,setProfiles]=useState<Record<string,Profile>>({});
 const [messages,setMessages]=useState<Msg[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [draft,setDraft]=useState('');
 const [query,setQuery]=useState('');
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState('');

 async function load(){
  setLoading(true);
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setLoading(false);return}
  setUserId(user.id);
  const {data:m}=await supabase.from('messages').select('*').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:true}).limit(500);
  const safe=(m||[]) as Msg[];
  setMessages(safe);
  const ids=[...new Set(safe.flatMap(x=>[x.sender_id,x.recipient_id]).filter(id=>id!==user.id))];
  if(ids.length){
   const {data:p}=await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids);
   const map:Record<string,Profile>={};
   (p||[]).forEach((x:Profile)=>map[x.id]=x);
   setProfiles(map);
  }
  setLoading(false);
 }

 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const text=params.get('texto');
  if(text){setDraft(text.slice(0,5000));setNotice('Conteúdo preparado. Escolha uma pessoa para enviar.');}
 },[]);

 useEffect(()=>{void load();const ch=supabase.channel('messages-live').on('postgres_changes',{event:'*',schema:'public',table:'messages'},()=>void load()).subscribe();return()=>{void supabase.removeChannel(ch)}},[supabase]);
 useEffect(()=>{if(!selected||!userId)return;void supabase.from('messages').update({read_at:new Date().toISOString()}).eq('sender_id',selected).eq('recipient_id',userId).is('read_at',null)},[selected,userId,supabase]);

 async function searchUsers(){
  if(query.trim().length<2){setNotice('Digite pelo menos 2 caracteres para buscar.');return}
  const q=query.trim();
  const {data,error}=await supabase.from('profiles').select('id,display_name,username,avatar_url').neq('id',userId||'00000000-0000-0000-0000-000000000000').or(`display_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`).limit(20);
  if(error){setNotice('Não foi possível buscar usuários agora.');return}
  setProfiles(current=>{const next={...current};(data||[]).forEach((x:Profile)=>next[x.id]=x);return next});
  setNotice((data||[]).length?'':'Nenhum usuário encontrado.');
 }

 async function send(){
  if(!userId||!selected||!draft.trim())return;
  const text=draft.trim().slice(0,5000);
  const {error}=await supabase.from('messages').insert({sender_id:userId,recipient_id:selected,body:text});
  if(error){setNotice('Não foi possível enviar a mensagem. Tente novamente.');return}
  setDraft('');setNotice('Mensagem enviada.');await load();
 }

 const partnerIds=[...new Set(messages.map(m=>m.sender_id===userId?m.recipient_id:m.sender_id).filter(Boolean))];
 const searched=Object.values(profiles).filter(p=>!query.trim()||p.display_name.toLowerCase().includes(query.toLowerCase())||(p.username||'').toLowerCase().includes(query.toLowerCase()));
 const listIds=[...new Set([...partnerIds,...searched.map(p=>p.id)])];
 const convo=selected?messages.filter(m=>(m.sender_id===userId&&m.recipient_id===selected)||(m.sender_id===selected&&m.recipient_id===userId)):[];

 return <div className="mx-auto max-w-6xl px-3 pb-8 sm:px-4">
  <div className="mb-5"><h1 className="text-2xl font-black">Mensagens</h1><p className="mt-1 text-sm text-slate-400">Converse diretamente com outros membros da comunidade.</p>{notice&&<p className="mt-2 text-xs text-orange-300">{notice}</p>}</div>
  <div className="grid h-[calc(100dvh-10rem)] min-h-[520px] max-h-[820px] overflow-hidden rounded-2xl border border-geek-line bg-geek-panel md:grid-cols-[320px_1fr]">
   <aside className={`min-h-0 overflow-y-auto border-r border-geek-line ${selected?'hidden md:block':'block'}`}>
    <div className="sticky top-0 z-10 border-b border-geek-line bg-geek-panel p-3"><div className="flex items-center gap-2 rounded-xl bg-geek-soft px-3"><Search size={16} className="text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void searchUsers()}} placeholder="Buscar nome, @ ou e-mail" className="w-full min-w-0 bg-transparent py-2.5 text-sm outline-none"/><button onClick={searchUsers} className="shrink-0 text-xs font-bold text-geek-orange">Buscar</button></div></div>
    {loading?<div className="grid place-items-center py-10"><Loader2 className="animate-spin"/></div>:listIds.length===0?<div className="p-6 text-center text-sm text-slate-500">Busque alguém para começar uma conversa.</div>:<div className="divide-y divide-geek-line">{listIds.map(id=>{const p=profiles[id];if(!p)return null;const last=[...messages].reverse().find(m=>(m.sender_id===userId&&m.recipient_id===id)||(m.sender_id===id&&m.recipient_id===userId));const unread=messages.filter(m=>m.sender_id===id&&m.recipient_id===userId&&!m.read_at).length;return <button key={id} onClick={()=>setSelected(id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-geek-soft"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{p.avatar_url?<img src={p.avatar_url} alt="" className="h-full w-full object-cover object-center"/>:<span className="text-xs font-black text-white">{p.display_name.slice(0,1).toUpperCase()}</span>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><b className="truncate text-sm">{p.display_name}</b>{unread>0&&<span className="ml-auto rounded-full bg-geek-orange px-2 py-0.5 text-[10px] font-bold text-white">{unread}</span>}</div><p className="truncate text-xs text-slate-500">{last?.body||`@${p.username||'geek'}`}</p></div></button>})}</div>}
   </aside>

   <section className={`${selected?'flex':'hidden md:flex'} min-h-0 flex-col`}>
    {selected&&profiles[selected]?<>
     <header className="flex shrink-0 items-center gap-3 border-b border-geek-line p-3"><button onClick={()=>setSelected(null)} className="shrink-0 text-sm font-bold text-geek-orange md:hidden">Voltar</button><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{profiles[selected].avatar_url?<img src={profiles[selected].avatar_url} alt="" className="h-full w-full object-cover object-center"/>:<span className="text-xs font-black text-white">{profiles[selected].display_name.slice(0,1).toUpperCase()}</span>}</div><div className="min-w-0"><b className="block truncate text-sm">{profiles[selected].display_name}</b><p className="truncate text-xs text-slate-500">@{profiles[selected].username||'geek'}</p></div></header>
     <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">{convo.length===0&&<p className="py-10 text-center text-sm text-slate-500">Comece a conversa.</p>}{convo.map(m=><div key={m.id} className={`flex ${m.sender_id===userId?'justify-end':'justify-start'}`}><div className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm sm:max-w-[75%] ${m.sender_id===userId?'bg-geek-orange text-white':'bg-geek-soft text-slate-200'}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><p className={`mt-1 text-[10px] ${m.sender_id===userId?'text-orange-100':'text-slate-500'}`}>{new Date(m.created_at).toLocaleString('pt-BR')}</p></div></div>)}</div>
     <div className="flex shrink-0 items-end gap-2 border-t border-geek-line p-3"><textarea value={draft} maxLength={5000} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} placeholder="Escreva uma mensagem..." className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-sm outline-none"/><button onClick={send} disabled={!draft.trim()} aria-label="Enviar mensagem" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-geek-orange text-white disabled:opacity-40"><Send size={18}/></button></div>
    </>:<div className="m-auto p-8 text-center text-slate-500"><MessageSquare className="mx-auto mb-3 text-geek-orange"/>Selecione uma conversa ou busque alguém para começar.</div>}
   </section>
  </div>
 </div>;
}
