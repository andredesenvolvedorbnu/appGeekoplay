'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin, Store, UserMinus, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Profile={id:string;display_name:string;username:string|null;bio:string|null;avatar_url:string|null;cover_url:string|null;city:string|null;favorite_categories:string[];level:number;xp:number;is_pro:boolean};
type Post={id:string;content:string|null;image_url:string|null;video_url:string|null;category:string|null;created_at:string};
type MarketItem={id:string;title:string;image_urls:string[];price:number;category:string|null;status:string;city:string|null;state:string|null};

export function PublicProfileClient({profileId}:{profileId:string}){
  const supabase=useMemo(()=>createClient(),[]);
  const [viewerId,setViewerId]=useState<string|null>(null);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [posts,setPosts]=useState<Post[]>([]);
  const [marketItems,setMarketItems]=useState<MarketItem[]>([]);
  const [followers,setFollowers]=useState(0);
  const [followingCount,setFollowingCount]=useState(0);
  const [isFollowing,setIsFollowing]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();setViewerId(user?.id||null);
    const [{data:p},{data:postRows},{data:marketRows},{count:followerCount},{count:followingRows}]=await Promise.all([
      supabase.from('profiles').select('id,display_name,username,bio,avatar_url,cover_url,city,favorite_categories,level,xp,is_pro').eq('id',profileId).maybeSingle(),
      supabase.from('posts').select('id,content,image_url,video_url,category,created_at').eq('author_id',profileId).order('created_at',{ascending:false}).limit(30),
      supabase.from('market_items').select('id,title,image_urls,price,category,status,city,state').eq('seller_id',profileId).order('created_at',{ascending:false}).limit(12),
      supabase.from('follows').select('*',{count:'exact',head:true}).eq('following_id',profileId),
      supabase.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',profileId),
    ]);
    setProfile(p as Profile|null);setPosts((postRows||[]) as Post[]);setMarketItems((marketRows||[]) as MarketItem[]);setFollowers(followerCount||0);setFollowingCount(followingRows||0);
    if(user&&user.id!==profileId){const {data}=await supabase.from('follows').select('follower_id').eq('follower_id',user.id).eq('following_id',profileId).maybeSingle();setIsFollowing(!!data)}
    setLoading(false);
  }

  useEffect(()=>{void load()},[profileId,supabase]);

  async function toggleFollow(){if(!viewerId||viewerId===profileId)return;setBusy(true);if(isFollowing)await supabase.from('follows').delete().eq('follower_id',viewerId).eq('following_id',profileId);else await supabase.from('follows').insert({follower_id:viewerId,following_id:profileId});await load();setBusy(false)}

  if(loading)return <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-geek-orange"/></div>;
  if(!profile)return <div className="mx-auto max-w-3xl px-4 py-10 text-center"><h1 className="text-xl font-bold">Perfil não encontrado</h1><Link href="/explorar" className="mt-4 inline-flex text-geek-orange">Voltar ao Explorar</Link></div>;

  return <div className="mx-auto max-w-4xl space-y-4 px-3 pb-10 sm:px-4">
    <Link href="/explorar" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>Voltar</Link>
    <section className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel">
      <div className="relative flex aspect-[3/1] min-h-[130px] max-h-[260px] items-center justify-center overflow-hidden bg-gradient-to-r from-orange-500/30 via-purple-500/20 to-cyan-500/20">{profile.cover_url&&<img src={profile.cover_url} alt="Capa do perfil" className="absolute inset-0 h-full w-full object-cover object-center"/>}</div>
      <div className="relative -mt-10 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-geek-panel bg-gradient-to-br from-orange-400 to-purple-600">{profile.avatar_url?<img src={profile.avatar_url} alt={`Foto de ${profile.display_name}`} className="h-full w-full object-cover object-center"/>:null}</div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="break-words text-2xl font-black">{profile.display_name}</h1>{profile.is_pro&&<span className="rounded-full bg-yellow-500/15 px-2 py-1 text-[10px] font-bold text-yellow-300">PRO</span>}</div><p className="text-sm text-slate-400">@{profile.username||'geek'} · Nível {profile.level} · {profile.xp} XP</p>{profile.city&&<p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13}/>{profile.city}</p>}</div>
          {viewerId===profile.id?<Link href="/perfil" className="rounded-xl border border-geek-line px-4 py-2 text-sm hover:bg-geek-soft">Editar meu perfil</Link>:<button onClick={toggleFollow} disabled={busy||!viewerId} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${isFollowing?'border border-geek-line bg-geek-soft':'bg-geek-orange text-white'} disabled:opacity-50`}>{isFollowing?<><UserMinus size={16}/>Deixar de seguir</>:<><UserPlus size={16}/>Seguir</>}</button>}
        </div>
        {profile.bio&&<p className="mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-300">{profile.bio}</p>}
        {profile.favorite_categories?.length>0&&<div className="mt-4 flex flex-wrap gap-2">{profile.favorite_categories.map(cat=><span key={cat} className="rounded-full border border-geek-line bg-geek-soft px-3 py-1.5 text-xs text-slate-300">{cat}</span>)}</div>}
        <div className="mt-5 grid max-w-md grid-cols-3 gap-3"><div className="rounded-xl bg-geek-soft p-3 text-center"><b className="block text-lg">{posts.length}</b><span className="text-[11px] text-slate-500">Publicações</span></div><div className="rounded-xl bg-geek-soft p-3 text-center"><b className="block text-lg">{followers}</b><span className="text-[11px] text-slate-500">Seguidores</span></div><div className="rounded-xl bg-geek-soft p-3 text-center"><b className="block text-lg">{followingCount}</b><span className="text-[11px] text-slate-500">Seguindo</span></div></div>
      </div>
    </section>

    <section><h2 className="mb-3 text-lg font-bold">Publicações</h2>{posts.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400">Este geek ainda não publicou nada.</div>:<div className="grid gap-4 sm:grid-cols-2">{posts.map(post=><article key={post.id} className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel">{post.image_url&&<div className="flex max-h-[520px] items-center justify-center bg-black/30"><img src={post.image_url} alt="Publicação" className="block h-auto max-h-[520px] w-auto max-w-full object-contain object-center"/></div>}{post.video_url&&<div className="flex max-h-[520px] items-center justify-center bg-black"><video src={post.video_url} controls playsInline preload="metadata" className="block max-h-[520px] w-full object-contain"/></div>}<div className="p-4">{post.category&&<span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">{post.category}</span>}{post.content&&<p className="mt-2 break-words whitespace-pre-wrap text-sm text-slate-300">{post.content}</p>}</div></article>)}</div>}</section>

    <section><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Mercado Geek</h2><p className="text-xs text-slate-500">Itens anunciados por {profile.display_name}.</p></div>{marketItems.length>0&&<Link href="/mercado" className="text-xs font-bold text-geek-orange">Ver Mercado</Link>}</div>{marketItems.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-8 text-center text-sm text-slate-500"><Store className="mx-auto mb-2 text-geek-orange"/>Nenhum item anunciado.</div>:<div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3">{marketItems.map(item=><Link href="/mercado" key={item.id} className={`min-w-0 overflow-hidden rounded-2xl border border-geek-line bg-geek-panel ${item.status==='sold'?'opacity-60':''}`}><div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-black/20">{item.image_urls?.[0]?<img src={item.image_urls[0]} alt={item.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<Store className="text-slate-600"/>}<span className={`absolute right-1.5 top-1.5 rounded-full px-2 py-1 text-[9px] font-bold ${item.status==='sold'?'bg-red-950/90 text-red-200':item.status==='reserved'?'bg-yellow-950/90 text-yellow-200':'bg-emerald-950/90 text-emerald-200'}`}>{item.status==='sold'?'Vendido':item.status==='reserved'?'Reservado':'Disponível'}</span></div><div className="min-w-0 p-3"><b className="block truncate text-sm">{item.title}</b><p className="mt-1 truncate text-sm font-black text-geek-orange">{Number(item.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p><p className="truncate text-[10px] text-slate-500">{item.category||'Geek'}{item.city?` · ${item.city}${item.state?`/${item.state}`:''}`:''}</p></div></Link>)}</div>}</section>
  </div>;
}
