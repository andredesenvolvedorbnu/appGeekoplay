'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Image as ImageIcon, LibraryBig, Loader2, Store, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Tab='publicacoes'|'curtidas'|'eventos'|'comunidades'|'colecao'|'mercado'|'sobre';
type Post={id:string;content:string|null;image_url:string|null;video_url:string|null;category:string|null;created_at:string};
type Event={id:string;title:string;cover_url:string|null;starts_at:string;city:string|null;state:string|null};
type Community={id:string;name:string;cover_url:string|null;category:string|null;description:string|null};
type Item={id:string;title:string;image_url:string|null;status:string;category:string|null};
type MarketItem={id:string;title:string;image_urls:string[];price:number;status:string;category:string|null;city:string|null;state:string|null};
type Profile={bio:string|null;city:string|null;favorite_categories:string[]};

const tabs:[string,Tab][]=[['Publicações','publicacoes'],['Curtidas','curtidas'],['Eventos','eventos'],['Comunidades','comunidades'],['Coleção','colecao'],['Mercado','mercado'],['Sobre','sobre']];

export function ProfileTabs(){
  const supabase=useMemo(()=>createClient(),[]);
  const [tab,setTab]=useState<Tab>('publicacoes');
  const [loading,setLoading]=useState(true);
  const [posts,setPosts]=useState<Post[]>([]);
  const [likedPosts,setLikedPosts]=useState<Post[]>([]);
  const [events,setEvents]=useState<Event[]>([]);
  const [communities,setCommunities]=useState<Community[]>([]);
  const [items,setItems]=useState<Item[]>([]);
  const [marketItems,setMarketItems]=useState<MarketItem[]>([]);
  const [profile,setProfile]=useState<Profile|null>(null);

  useEffect(()=>{(async()=>{
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return}
    const [{data:ownPosts},{data:likes},{data:attendance},{data:memberships},{data:collection},{data:market},{data:p}]=await Promise.all([
      supabase.from('posts').select('id,content,image_url,video_url,category,created_at').eq('author_id',user.id).order('created_at',{ascending:false}).limit(50),
      supabase.from('likes').select('post_id').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50),
      supabase.from('event_attendees').select('event_id').eq('user_id',user.id).eq('status','going'),
      supabase.from('community_members').select('community_id').eq('user_id',user.id),
      supabase.from('collection_items').select('id,title,image_url,status,category').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(30),
      supabase.from('market_items').select('id,title,image_urls,price,status,category,city,state').eq('seller_id',user.id).order('created_at',{ascending:false}).limit(30),
      supabase.from('profiles').select('bio,city,favorite_categories').eq('id',user.id).maybeSingle()
    ]);
    setPosts((ownPosts||[]) as Post[]);setItems((collection||[]) as Item[]);setMarketItems((market||[]) as MarketItem[]);setProfile((p||null) as Profile|null);
    const likeIds=(likes||[]).map(x=>x.post_id);if(likeIds.length){const {data}=await supabase.from('posts').select('id,content,image_url,video_url,category,created_at').in('id',likeIds).limit(50);setLikedPosts((data||[]) as Post[])}else setLikedPosts([]);
    const eventIds=(attendance||[]).map(x=>x.event_id);if(eventIds.length){const {data}=await supabase.from('events').select('id,title,cover_url,starts_at,city,state').in('id',eventIds).order('starts_at',{ascending:false});setEvents((data||[]) as Event[])}else setEvents([]);
    const communityIds=(memberships||[]).map(x=>x.community_id);if(communityIds.length){const {data}=await supabase.from('communities').select('id,name,cover_url,category,description').in('id',communityIds);setCommunities((data||[]) as Community[])}else setCommunities([]);
    setLoading(false);
  })()},[supabase]);

  const PostGrid=({rows}:{rows:Post[]})=><div className="grid gap-3 sm:grid-cols-2">{rows.length===0?<Empty text="Nenhuma publicação por aqui ainda."/>:rows.map(post=><article key={post.id} className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel">{post.image_url&&<div className="flex max-h-80 items-center justify-center bg-black/25"><img src={post.image_url} alt="" className="h-auto max-h-80 w-auto max-w-full object-contain object-center"/></div>}{post.video_url&&<div className="flex max-h-80 items-center justify-center bg-black"><video src={post.video_url} controls playsInline preload="metadata" className="max-h-80 max-w-full object-contain object-center"/></div>}<div className="p-4">{post.category&&<span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">{post.category}</span>}{post.content&&<p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-slate-300">{post.content}</p>}</div></article>)}</div>;

  return <section className="mx-auto mt-4 w-full max-w-4xl px-3 pb-8 sm:px-5">
    <div className="overflow-x-auto border-b border-geek-line"><div className="flex min-w-max gap-1">{tabs.map(([label,value])=><button key={value} onClick={()=>setTab(value)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab===value?'border-geek-orange text-orange-300':'border-transparent text-slate-400'}`}>{label}</button>)}</div></div>
    <div className="pt-4">{loading?<div className="grid place-items-center py-16"><Loader2 className="animate-spin text-geek-orange"/></div>:<>
      {tab==='publicacoes'&&<PostGrid rows={posts}/>} 
      {tab==='curtidas'&&<PostGrid rows={likedPosts}/>} 
      {tab==='eventos'&&(events.length===0?<Empty text="Você ainda não confirmou presença em eventos."/>:<div className="grid gap-3 sm:grid-cols-2">{events.map(e=><Link href={`/eventos/${e.id}`} key={e.id} className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel">{e.cover_url?<div className="flex aspect-[16/7] items-center justify-center overflow-hidden bg-black/20"><img src={e.cover_url} alt="" className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/></div>:<div className="grid aspect-[16/7] place-items-center bg-geek-soft"><CalendarDays className="text-geek-orange"/></div>}<div className="p-4"><b>{e.title}</b><p className="mt-1 text-xs text-slate-500">{new Date(e.starts_at).toLocaleDateString('pt-BR')} · {[e.city,e.state].filter(Boolean).join(' / ')||'Local a definir'}</p></div></Link>)}</div>)}
      {tab==='comunidades'&&(communities.length===0?<Empty text="Você ainda não participa de comunidades."/>:<div className="grid gap-3 sm:grid-cols-2">{communities.map(c=><Link href={`/comunidades/${c.id}`} key={c.id} className="flex min-w-0 gap-3 rounded-2xl border border-geek-line bg-geek-panel p-4">{c.cover_url?<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/20"><img src={c.cover_url} alt="" className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/></div>:<div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-geek-soft"><Users className="text-geek-orange"/></div>}<div className="min-w-0"><b className="block truncate">{c.name}</b><p className="text-xs text-orange-300">{c.category||'Comunidade'}</p>{c.description&&<p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.description}</p>}</div></Link>)}</div>)}
      {tab==='colecao'&&(items.length===0?<Empty text="Sua coleção ainda está vazia."/>:<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{items.map(item=><Link href="/colecao" key={item.id} className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel">{item.image_url?<div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-black/20"><img src={item.image_url} alt="" className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/></div>:<div className="grid aspect-[4/5] place-items-center bg-geek-soft"><LibraryBig className="text-geek-orange"/></div>}<div className="p-3"><b className="block truncate text-sm">{item.title}</b><p className="text-[10px] text-slate-500">{item.status} · {item.category||'Geek'}</p></div></Link>)}</div>)}
      {tab==='mercado'&&(marketItems.length===0?<Empty text="Você ainda não anunciou itens no Mercado Geek."/>:<div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">{marketItems.map(item=><Link href={`/mercado/${item.id}`} key={item.id} className={`min-w-0 overflow-hidden rounded-2xl border border-geek-line bg-geek-panel ${item.status==='sold'?'opacity-60':''}`}><div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-black/20">{item.image_urls?.[0]?<img src={item.image_urls[0]} alt="" className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<Store className="text-geek-orange"/>}<span className={`absolute right-1.5 top-1.5 rounded-full px-2 py-1 text-[9px] font-bold ${item.status==='sold'?'bg-red-950/90 text-red-200':item.status==='reserved'?'bg-yellow-950/90 text-yellow-200':'bg-emerald-950/90 text-emerald-200'}`}>{item.status==='sold'?'Vendido':item.status==='reserved'?'Reservado':'Disponível'}</span></div><div className="min-w-0 p-3"><b className="block truncate text-sm">{item.title}</b><p className="mt-1 truncate text-sm font-black text-geek-orange">{Number(item.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><p className="truncate text-[10px] text-slate-500">{item.category||'Geek'}{item.city?` · ${item.city}${item.state?`/${item.state}`:''}`:''}</p></div></Link>)}</div>)}
      {tab==='sobre'&&<div className="rounded-2xl border border-geek-line bg-geek-panel p-5"><h3 className="font-black">Sobre</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{profile?.bio||'Este geek ainda não escreveu uma bio.'}</p>{profile?.city&&<p className="mt-3 text-sm text-slate-400">📍 {profile.city}</p>}{!!profile?.favorite_categories?.length&&<div className="mt-4 flex flex-wrap gap-2">{profile.favorite_categories.map(x=><span key={x} className="rounded-full bg-geek-soft px-3 py-1.5 text-xs">{x}</span>)}</div>}</div>}
    </>}</div>
  </section>;
}

function Empty({text}:{text:string}){return <div className="col-span-full rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-500"><ImageIcon className="mx-auto mb-2 text-geek-orange"/>{text}</div>}
