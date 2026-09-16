'use client';

import { useEffect,useMemo,useState } from 'react';
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ProfileLink={id:string;user_id:string;label:string;url:string;position:number};

function normalizeUrl(value:string){
 const trimmed=value.trim();
 if(!trimmed)return'';
 return /^https?:\/\//i.test(trimmed)?trimmed:`https://${trimmed}`;
}

export function ProfileLinks({userId,editable=false}:{userId?:string;editable?:boolean}){
 const supabase=useMemo(()=>createClient(),[]);
 const [resolvedUserId,setResolvedUserId]=useState(userId||'');
 const [links,setLinks]=useState<ProfileLink[]>([]);
 const [label,setLabel]=useState('');
 const [url,setUrl]=useState('');
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');

 async function load(targetId?:string){
  let id=targetId||userId||resolvedUserId;
  if(!id&&editable){const {data:{user}}=await supabase.auth.getUser();id=user?.id||'';if(id)setResolvedUserId(id)}
  if(!id)return;
  const {data}=await supabase.from('profile_links').select('id,user_id,label,url,position').eq('user_id',id).order('position',{ascending:true}).order('created_at',{ascending:true});
  setLinks((data||[]) as ProfileLink[]);
 }

 useEffect(()=>{void load(userId)},[userId,supabase]);

 async function addLink(){
  const cleanLabel=label.trim().slice(0,40);
  const cleanUrl=normalizeUrl(url);
  if(!resolvedUserId||!cleanLabel||!cleanUrl){setMessage('Preencha o nome do link e o endereço.');return}
  try{const parsed=new URL(cleanUrl);if(!['http:','https:'].includes(parsed.protocol))throw new Error()}catch{setMessage('Digite um link válido.');return}
  if(links.length>=5){setMessage('Você pode adicionar até 5 links ao perfil.');return}
  setSaving(true);setMessage('');
  const {error}=await supabase.from('profile_links').insert({user_id:resolvedUserId,label:cleanLabel,url:cleanUrl,position:links.length});
  setSaving(false);
  if(error){setMessage('Não foi possível adicionar o link.');return}
  setLabel('');setUrl('');setMessage('Link adicionado.');await load(resolvedUserId);
 }

 async function removeLink(id:string){
  const {error}=await supabase.from('profile_links').delete().eq('id',id);
  if(error){setMessage('Não foi possível remover o link.');return}
  setMessage('Link removido.');await load(resolvedUserId);
 }

 if(!editable&&links.length===0)return null;
 return <section className="mx-auto mt-4 w-full max-w-4xl px-3 sm:px-5">
  <div className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:rounded-3xl sm:p-5">
   <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-geek-orange"><Link2 size={18}/></div><div><h2 className="font-black">Links</h2><p className="text-xs text-slate-500">Site, portfólio, loja, canal ou qualquer página que você queira destacar.</p></div></div>
   {links.length>0&&<div className="mt-4 flex flex-wrap gap-2">{links.map(link=><div key={link.id} className="flex max-w-full items-center gap-1 rounded-xl border border-geek-line bg-geek-soft"><a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 items-center gap-2 px-3 py-2 text-sm font-semibold hover:text-geek-orange"><span className="truncate">{link.label}</span><ExternalLink size={14} className="shrink-0"/></a>{editable&&<button type="button" onClick={()=>void removeLink(link.id)} className="mr-1 rounded-lg p-2 text-red-300 hover:bg-red-500/10" aria-label={`Remover ${link.label}`}><Trash2 size={14}/></button>}</div>)}</div>}
   {editable&&<div className="mt-4 grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]"><input value={label} onChange={e=>setLabel(e.target.value)} maxLength={40} placeholder="Nome do link" className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 outline-none focus:border-geek-orange"/><input value={url} onChange={e=>setUrl(e.target.value)} maxLength={500} placeholder="Cole seu link aqui" className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 outline-none focus:border-geek-orange"/><button type="button" onClick={()=>void addLink()} disabled={saving||links.length>=5} className="flex items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-2.5 font-black text-white disabled:opacity-50"><Plus size={16}/>{saving?'Adicionando...':'Adicionar link'}</button></div>}
   {editable&&<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{links.length}/5 links</span>{message&&<span>{message}</span>}</div>}
  </div>
 </section>;
}
