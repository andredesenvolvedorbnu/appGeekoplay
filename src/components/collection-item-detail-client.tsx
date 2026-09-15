'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ArrowLeft, Loader2, Share2, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Item={id:string;owner_id:string;title:string;image_url:string|null;category:string|null;item_type:string|null;status:string;notes:string|null;created_at:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;level:number;city:string|null};
const statuses=['Tenho','Quero','Troca'];

export function CollectionItemDetailClient({itemId}:{itemId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [item,setItem]=useState<Item|null>(null);
 const [owner,setOwner]=useState<Profile|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');

 async function load(){
  setLoading(true);setMessage('');
  const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
  const {data:i}=await supabase.from('collection_items').select('*').eq('id',itemId).maybeSingle();
  if(!i){setItem(null);setOwner(null);setLoading(false);return}
  const row=i as Item;setItem(row);
  const {data:p}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level,city').eq('id',row.owner_id).maybeSingle();setOwner((p||null) as Profile|null);
  setLoading(false);
 }

 useEffect(()=>{void load()},[itemId,supabase]);

 async function share(){if(!item)return;const url=window.location.href;if(navigator.share){try{await navigator.share({title:item.title,text:`Veja este item da coleção no GeekoPlay: ${item.title}`,url})}catch{}}else{try{await navigator.clipboard.writeText(url);setMessage('Link do item copiado.')}catch{setMessage('Não foi possível copiar o link.')}}}
 async function changeStatus(value:string){if(!item||item.owner_id!==userId)return;setBusy(true);const {error}=await supabase.from('collection_items').update({status:value}).eq('id',item.id);if(error)setMessage('Não foi possível atualizar o item.');await load();setBusy(false)}
 async function remove(){if(!item||item.owner_id!==userId)return;if(!window.confirm('Remover este item da sua coleção?'))return;setBusy(true);const {error}=await supabase.from('collection_items').delete().eq('id',item.id);if(error){setMessage('Não foi possível remover o item.');setBusy(false);return}location.href='/colecao'}

 if(loading)return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-geek-orange"/></div>;
 if(!item)return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-black">Item não encontrado</h1><p className="mt-2 text-sm text-slate-400">Este item pode ter sido removido da coleção.</p><Link href="/colecao" className="mt-5 inline-flex rounded-xl bg-geek-orange px-4 py-2 font-bold">Voltar para Coleção</Link></div>;

 const own=item.owner_id===userId;
 return <div className="mx-auto max-w-5xl space-y-5 px-3 pb-10 sm:px-4">
  <div className="flex items-center justify-between gap-3"><Link href="/colecao" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>Voltar</Link><button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm hover:bg-geek-soft"><Share2 size={16}/>Compartilhar</button></div>
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
   <section className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel"><div className="flex aspect-square items-center justify-center overflow-hidden bg-black/25">{item.image_url?<img src={item.image_url} alt={item.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<span className="text-sm text-slate-500">Sem foto</span>}</div></section>
   <section className="rounded-3xl border border-geek-line bg-geek-panel p-5 sm:p-6"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300">{item.category||'Geek'}</span><span className="rounded-full bg-geek-soft px-2.5 py-1 text-xs text-slate-300">{item.item_type||'Colecionável'}</span><span className="rounded-full bg-geek-soft px-2.5 py-1 text-xs text-slate-300">{item.status}</span></div><h1 className="mt-4 text-2xl font-black sm:text-3xl">{item.title}</h1>{item.notes&&<p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">{item.notes}</p>}<p className="mt-5 text-xs text-slate-500">Adicionado em {new Date(item.created_at).toLocaleDateString('pt-BR')}</p>{own&&<div className="mt-6 rounded-2xl border border-geek-line bg-geek-soft p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Gerenciar item</p><select value={item.status} disabled={busy} onChange={e=>void changeStatus(e.target.value)} className="mt-3 w-full rounded-xl border border-geek-line bg-geek-panel px-3 py-2.5 text-sm">{statuses.map(s=><option key={s}>{s}</option>)}</select><button onClick={remove} disabled={busy} className="mt-2 w-full rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-bold text-red-300 disabled:opacity-50">Remover da coleção</button></div>}{message&&<p className="mt-4 rounded-xl border border-geek-line bg-geek-soft px-4 py-3 text-sm text-slate-300">{message}</p>}</section>
  </div>
  <section className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Coleção de</p>{owner?<Link href={`/perfil/${owner.id}`} className="mt-3 flex max-w-md items-center gap-3 rounded-xl bg-geek-soft p-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{owner.avatar_url?<img src={owner.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={18}/>}</div><div className="min-w-0"><p className="truncate text-sm font-black">{owner.display_name}</p><p className="truncate text-xs text-slate-500">@{owner.username||'geek'} · Nível {owner.level}{owner.city?` · ${owner.city}`:''}</p></div></Link>:<p className="mt-3 text-sm text-slate-500">Perfil indisponível.</p>}</section>
 </div>;
}
