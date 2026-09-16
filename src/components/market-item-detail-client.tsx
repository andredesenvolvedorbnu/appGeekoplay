'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ArrowLeft, Loader2, MapPin, Share2, Store, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Item={id:string;seller_id:string;title:string;description:string|null;image_urls:string[];price:number;category:string|null;item_condition:string|null;city:string|null;state:string|null;whatsapp:string|null;instagram:string|null;status:string;created_at:string;updated_at:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;city:string|null;level:number;is_pro:boolean};

export function MarketItemDetailClient({itemId}:{itemId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [item,setItem]=useState<Item|null>(null);
 const [seller,setSeller]=useState<Profile|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);

 async function load(){
  setLoading(true);setMessage('');
  const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
  const {data:i}=await supabase.from('market_items').select('*').eq('id',itemId).maybeSingle();
  if(!i){setItem(null);setSeller(null);setLoading(false);return}
  const row=i as Item;setItem(row);
  const {data:p}=await supabase.from('profiles').select('id,display_name,username,avatar_url,city,level,is_pro').eq('id',row.seller_id).maybeSingle();setSeller((p||null) as Profile|null);
  setLoading(false);
 }

 useEffect(()=>{void load();const ch=supabase.channel(`market-item-${itemId}`).on('postgres_changes',{event:'*',schema:'public',table:'market_items',filter:`id=eq.${itemId}`},()=>void load()).subscribe();return()=>{void supabase.removeChannel(ch)}},[itemId,supabase]);

 function wa(value:string){const digits=value.replace(/\D/g,'');return digits?`https://wa.me/${digits}`:'#'}
 async function share(){if(!item)return;const url=window.location.href;if(navigator.share){try{await navigator.share({title:item.title,text:`Veja este item no Mercado Geek por ${Number(item.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.`,url})}catch{}}else{try{await navigator.clipboard.writeText(url);setMessage('Link do anúncio copiado.')}catch{setMessage('Não foi possível copiar o link.')}}}
 async function setStatus(status:string){if(!item||item.seller_id!==userId)return;setBusy(true);const {error}=await supabase.from('market_items').update({status,updated_at:new Date().toISOString()}).eq('id',item.id);if(error)setMessage('Não foi possível atualizar o anúncio.');await load();setBusy(false)}
 function storagePath(url:string){const marker='/storage/v1/object/public/market/';const index=url.indexOf(marker);if(index<0)return null;try{return decodeURIComponent(url.slice(index+marker.length))}catch{return null}}
 async function remove(){if(!item||item.seller_id!==userId)return;if(!window.confirm('Excluir este anúncio permanentemente?'))return;setBusy(true);const {error}=await supabase.from('market_items').delete().eq('id',item.id);if(error){setMessage('Não foi possível excluir o anúncio.');setBusy(false);return}const paths=(item.image_urls||[]).map(storagePath).filter((path):path is string=>Boolean(path));if(paths.length)await supabase.storage.from('market').remove(paths);location.href='/mercado'}

 if(loading)return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-geek-orange"/></div>;
 if(!item)return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-black">Anúncio não encontrado</h1><p className="mt-2 text-sm text-slate-400">Este item pode ter sido removido pelo vendedor ou pela moderação.</p><Link href="/mercado" className="mt-5 inline-flex rounded-xl bg-geek-orange px-4 py-2 font-bold">Voltar ao Mercado Geek</Link></div>;

 const own=item.seller_id===userId;
 const statusText=item.status==='sold'?'Vendido':item.status==='reserved'?'Reservado':'Disponível';
 return <div className="mx-auto max-w-6xl space-y-5 px-3 pb-10 sm:px-4">
  <div className="flex items-center justify-between gap-3"><Link href="/mercado" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>Voltar</Link><button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm hover:bg-geek-soft"><Share2 size={16}/>Compartilhar</button></div>

  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
   <section className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel"><div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-black/25">{item.image_urls?.[0]?<img src={item.image_urls[0]} alt={item.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<Store size={64} className="text-orange-300/40"/>}</div></section>

   <section className="rounded-3xl border border-geek-line bg-geek-panel p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300">{item.category||'Geek'}</span><span className={`rounded-full px-2.5 py-1 text-xs ${item.status==='sold'?'bg-red-500/10 text-red-300':item.status==='reserved'?'bg-yellow-500/10 text-yellow-300':'bg-emerald-500/10 text-emerald-300'}`}>{statusText}</span></div><h1 className="mt-3 text-2xl font-black sm:text-3xl">{item.title}</h1><p className="mt-3 text-3xl font-black text-geek-orange">{Number(item.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><div className="mt-4 space-y-2 text-sm text-slate-400"><p><b className="text-slate-300">Condição:</b> {item.item_condition||'Não informada'}</p>{(item.city||item.state)&&<p className="flex items-center gap-2"><MapPin size={15}/>{[item.city,item.state].filter(Boolean).join(' / ')}</p>}<p className="text-xs text-slate-500">Publicado em {new Date(item.created_at).toLocaleDateString('pt-BR')}</p></div>{item.description&&<p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">{item.description}</p>}

    {!own&&item.status!=='sold'&&<div className="mt-6 flex flex-wrap gap-2">{item.whatsapp&&<a href={wa(item.whatsapp)} target="_blank" rel="noreferrer" className="rounded-xl bg-geek-orange px-5 py-3 text-sm font-black">Falar no WhatsApp</a>}{item.instagram&&<a href={`https://instagram.com/${item.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="rounded-xl border border-geek-line px-5 py-3 text-sm font-bold">Abrir Instagram</a>}</div>}

    {own&&<div className="mt-6 rounded-2xl border border-geek-line bg-geek-soft p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Gerenciar meu anúncio</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>setStatus('available')} disabled={busy||item.status==='available'} className="rounded-xl border border-geek-line px-3 py-2 text-sm disabled:opacity-40">Disponível</button><button onClick={()=>setStatus('reserved')} disabled={busy||item.status==='reserved'} className="rounded-xl border border-yellow-500/30 px-3 py-2 text-sm text-yellow-300 disabled:opacity-40">Reservado</button><button onClick={()=>setStatus('sold')} disabled={busy||item.status==='sold'} className="rounded-xl border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300 disabled:opacity-40">Vendido</button><button onClick={remove} disabled={busy} className="rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-300 disabled:opacity-40">Excluir</button></div></div>}
    {message&&<p className="mt-4 rounded-xl border border-geek-line bg-geek-soft px-4 py-3 text-sm text-slate-300">{message}</p>}
   </section>
  </div>

  <section className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Vendedor</p>{seller?<Link href={`/perfil/${seller.id}`} className="mt-3 flex max-w-md items-center gap-3 rounded-xl bg-geek-soft p-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{seller.avatar_url?<img src={seller.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={19}/>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-black">{seller.display_name}</p>{seller.is_pro&&<span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[9px] font-bold text-yellow-300">PRO</span>}</div><p className="truncate text-xs text-slate-500">@{seller.username||'geek'} · Nível {seller.level}{seller.city?` · ${seller.city}`:''}</p></div></Link>:<p className="mt-3 text-sm text-slate-500">Perfil do vendedor indisponível.</p>}</section>
 </div>;
}
