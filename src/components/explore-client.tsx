'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Flame, Heart, Image as ImageIcon, Loader2, MessageCircle, Search, Users, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const categories=['Todos','Anime','Games','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis'];

type Post={id:string;author_id:string;content:string|null;image_url:string|null;video_url:string|null;category:string|null;created_at:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;bio:string|null;favorite_categories:string[]};

type Engagement={likes:number;comments:number};

export function ExploreClient(){
  const supabase=useMemo(()=>createClient(),[]);
  const searchParams=useSearchParams();
  const [posts,setPosts]=useState<Post[]>([]);
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [viewerId,setViewerId]=useState<string|null>(null);
  const [engagement,setEngagement]=useState<Record<string,Engagement>>({});
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('Todos');

  useEffect(()=>{
    const q=searchParams.get('q')||'';
    const c=searchParams.get('categoria')||'Todos';
    setQuery(q);
    setCategory(categories.includes(c)?c:'Todos');
  },[searchParams]);

  useEffect(()=>{(async()=>{
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();setViewerId(user?.id||null);
    const [{data:postRows},{data:profileRows}]=await Promise.all([
      supabase.from('posts').select('id,author_id,content,image_url,video_url,category,created_at').order('created_at',{ascending:false}).limit(120),
      supabase.from('profiles').select('id,display_name,username,avatar_url,bio,favorite_categories').order('created_at',{ascending:false}).limit(150)
    ]);
    const safe=(postRows||[]) as Post[];
    setPosts(safe);
    setProfiles((profileRows||[]) as Profile[]);
    const map:Record<string,Engagement>={};safe.forEach(p=>map[p.id]={likes:0,comments:0});
    if(safe.length){const ids=safe.map(p=>p.id);const [{data:likes},{data:comments}]=await Promise.all([supabase.from('likes').select('post_id').in('post_id',ids),supabase.from('comments').select('post_id').in('post_id',ids)]);(likes||[]).forEach((row:{post_id:string})=>{if(map[row.post_id])map[row.post_id].likes++});(comments||[]).forEach((row:{post_id:string})=>{if(map[row.post_id])map[row.post_id].comments++})}
    setEngagement(map);setLoading(false);
  })()},[supabase]);

  useEffect(()=>{
    const raw=query.trim();
    if(raw.length<2)return;
    const timer=window.setTimeout(()=>{void (async()=>{
      const q=raw.replace(/[%(),]/g,' ').replace(/\s+/g,' ').trim();
      if(q.length<2)return;
      const [{data:people},{data:matchedPosts}]=await Promise.all([
        supabase.from('profiles').select('id,display_name,username,avatar_url,bio,favorite_categories').or(`display_name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`).limit(30),
        supabase.from('posts').select('id,author_id,content,image_url,video_url,category,created_at').or(`content.ilike.%${q}%,category.ilike.%${q}%`).order('created_at',{ascending:false}).limit(60)
      ]);
      const matchedPeople=(people||[]) as Profile[];
      let authorPosts:Post[]=[];
      const authorIds=matchedPeople.map(p=>p.id);
      if(authorIds.length){const {data}=await supabase.from('posts').select('id,author_id,content,image_url,video_url,category,created_at').in('author_id',authorIds).order('created_at',{ascending:false}).limit(60);authorPosts=(data||[]) as Post[]}
      setProfiles(current=>{const map=new Map(current.map(p=>[p.id,p]));matchedPeople.forEach(p=>map.set(p.id,p));return [...map.values()]});
      setPosts(current=>{const map=new Map(current.map(p=>[p.id,p]));[...((matchedPosts||[]) as Post[]),...authorPosts].forEach(p=>map.set(p.id,p));return [...map.values()]});
    })()},250);
    return()=>window.clearTimeout(timer);
  },[query,supabase]);

  const normalized=query.trim().toLowerCase();
  const profileMap=useMemo(()=>{const map:Record<string,Profile>={};profiles.forEach(p=>map[p.id]=p);return map},[profiles]);
  const score=(post:Post)=>{const stats=engagement[post.id]||{likes:0,comments:0};const ageHours=Math.max(1,(Date.now()-new Date(post.created_at).getTime())/36e5);const recency=Math.max(0,72-ageHours)/24;return stats.likes*3+stats.comments*4+recency};

  const filteredPosts=useMemo(()=>posts.filter(p=>{
    const byCategory=category==='Todos'||p.category===category;
    const author=profileMap[p.author_id];
    const bySearch=!normalized||`${p.content||''} ${p.category||''} ${author?.display_name||''} ${author?.username||''}`.toLowerCase().includes(normalized);
    return byCategory&&bySearch;
  }).sort((a,b)=>score(b)-score(a)),[posts,category,normalized,profileMap,engagement]);

  const filteredProfiles=profiles.filter(p=>p.id!==viewerId).filter(p=>{const searchMatch=!normalized||`${p.display_name} ${p.username||''} ${p.bio||''} ${(p.favorite_categories||[]).join(' ')}`.toLowerCase().includes(normalized);const categoryMatch=category==='Todos'||(p.favorite_categories||[]).includes(category);return searchMatch&&categoryMatch}).slice(0,12);

  const trending=useMemo(()=>{
    const values:Record<string,{posts:number;score:number}>={};
    posts.forEach(post=>{if(!post.category)return;const current=values[post.category]||{posts:0,score:0};current.posts++;current.score+=score(post);values[post.category]=current});
    return Object.entries(values).sort((a,b)=>b[1].score-a[1].score||b[1].posts-a[1].posts).slice(0,6);
  },[posts,engagement]);

  if(loading)return <div className="py-20 grid place-items-center text-slate-400"><Loader2 className="animate-spin text-geek-orange"/></div>;

  return <div className="mx-auto max-w-6xl space-y-5 px-3 pb-10 sm:px-4">
    <div><h1 className="text-2xl font-black sm:text-3xl">Explorar</h1><p className="mt-1 text-sm text-slate-400">Descubra pessoas, fandoms e conteúdos em alta.</p></div>

    <div className="rounded-2xl border border-geek-line bg-geek-panel p-3 sm:p-4"><div className="flex items-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3"><Search size={18} className="shrink-0 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar pessoas, posts ou fandoms..." className="w-full bg-transparent py-3 text-sm outline-none"/></div><div className="mt-3 overflow-x-auto pb-1"><div className="flex min-w-max gap-2">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`rounded-full border px-3 py-2 text-xs ${category===c?'border-geek-orange bg-geek-orange text-white':'border-geek-line bg-geek-bg text-slate-300'}`}>{c}</button>)}</div></div></div>

    {filteredProfiles.length>0&&<section><div className="mb-3 flex items-center gap-2"><Users size={18} className="text-geek-orange"/><h2 className="font-bold">{normalized?'Pessoas':'Pessoas para conhecer'}</h2><span className="text-xs text-slate-500">{normalized?'perfis encontrados':'encontre sua galera no GeekoPlay'}</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{filteredProfiles.map(p=><Link href={`/perfil/${p.id}`} key={p.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4 transition hover:border-orange-500/50"><div className="flex items-center gap-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{p.avatar_url?<img src={p.avatar_url} alt="" className="h-full w-full object-cover object-center"/>:<div className="grid h-full place-items-center text-sm font-black text-white">{p.display_name.slice(0,1).toUpperCase()}</div>}</div><div className="min-w-0"><b className="block truncate text-sm">{p.display_name}</b><span className="text-xs text-slate-500">@{p.username||'geek'}</span></div></div>{p.bio&&<p className="mt-3 line-clamp-2 text-xs text-slate-400">{p.bio}</p>}{p.favorite_categories?.length>0&&<div className="mt-3 flex flex-wrap gap-1">{p.favorite_categories.slice(0,3).map(item=><span key={item} className="rounded-full bg-geek-soft px-2 py-1 text-[10px] text-slate-400">{item}</span>)}</div>}</Link>)}</div></section>}

    {trending.length>0&&<section><div className="mb-3 flex items-center gap-2"><Flame size={18} className="text-geek-orange"/><h2 className="font-bold">Trending agora</h2><span className="text-xs text-slate-500">baseado em curtidas, comentários e recência</span></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{trending.map(([name,data],index)=><button key={name} onClick={()=>setCategory(name)} className="rounded-2xl border border-geek-line bg-geek-panel p-4 text-left hover:border-orange-500/50"><div className="flex items-center gap-3"><span className="text-xl font-black text-geek-orange">#{index+1}</span><div><b>{name}</b><p className="text-xs text-slate-500">{data.posts} {data.posts===1?'publicação':'publicações'} em alta</p></div></div></button>)}</div></section>}

    <section><div className="mb-3 flex items-center gap-2"><ImageIcon size={18} className="text-geek-orange"/><h2 className="font-bold">Publicações em destaque</h2><span className="text-xs text-slate-500">{filteredPosts.length}</span></div>{filteredPosts.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400">Nenhuma publicação encontrada.</div>:<div className="columns-1 gap-3 sm:columns-2 lg:columns-3">{filteredPosts.map(post=>{const author=profileMap[post.author_id];const stats=engagement[post.id]||{likes:0,comments:0};return <Link href={`/publicacao/${post.id}`} key={post.id} className="mb-3 block break-inside-avoid overflow-hidden rounded-2xl border border-geek-line bg-geek-panel hover:border-orange-500/40">{post.image_url&&<div className="flex w-full items-center justify-center overflow-hidden bg-black/30"><img src={post.image_url} alt="Publicação" className="block h-auto max-h-[560px] w-full object-contain object-center"/></div>}{post.video_url&&<div className="relative flex min-h-44 items-center justify-center bg-black"><video src={post.video_url} muted playsInline preload="metadata" className="max-h-[560px] max-w-full object-contain"/><span className="absolute right-2 top-2 rounded-full bg-black/70 p-2"><Video size={15}/></span></div>}<div className="p-4">{author&&<div className="mb-3 flex items-center gap-2"><div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{author.avatar_url&&<img src={author.avatar_url} alt="" className="h-full w-full object-cover"/>}</div><div className="min-w-0"><p className="truncate text-xs font-bold">{author.display_name}</p><p className="truncate text-[10px] text-slate-500">@{author.username||'geek'}</p></div></div>}{post.category&&<span className="inline-flex rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">{post.category}</span>}{post.content&&<p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">{post.content}</p>}<div className="mt-3 flex gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Heart size={13}/>{stats.likes}</span><span className="inline-flex items-center gap-1"><MessageCircle size={13}/>{stats.comments}</span></div></div></Link>})}</div>}</section>
  </div>;
}
