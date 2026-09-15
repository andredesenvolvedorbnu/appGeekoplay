'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Flame, Loader2, Users, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const categories = ['Todos','Anime','Games','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis'];

type Post={id:string;author_id:string;content:string|null;image_url:string|null;category:string|null;created_at:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;bio:string|null;favorite_categories:string[]};

export function ExploreClient(){
  const supabase=useMemo(()=>createClient(),[]);
  const [posts,setPosts]=useState<Post[]>([]);
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('Todos');

  useEffect(()=>{(async()=>{
    const [{data:postRows},{data:profileRows}]=await Promise.all([
      supabase.from('posts').select('id,author_id,content,image_url,category,created_at').order('created_at',{ascending:false}).limit(100),
      supabase.from('profiles').select('id,display_name,username,avatar_url,bio,favorite_categories').order('created_at',{ascending:false}).limit(100)
    ]);
    setPosts((postRows||[]) as Post[]);
    setProfiles((profileRows||[]) as Profile[]);
    setLoading(false);
  })()},[supabase]);

  const normalized=query.trim().toLowerCase();
  const filteredPosts=posts.filter(p=>{
    const byCategory=category==='Todos'||p.category===category;
    const bySearch=!normalized||`${p.content||''} ${p.category||''}`.toLowerCase().includes(normalized);
    return byCategory&&bySearch;
  });
  const filteredProfiles=profiles.filter(p=>!normalized?false:`${p.display_name} ${p.username||''} ${p.bio||''}`.toLowerCase().includes(normalized)).slice(0,8);

  const trending=useMemo(()=>{
    const counts:Record<string,number>={};
    posts.forEach(p=>{if(p.category) counts[p.category]=(counts[p.category]||0)+1});
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  },[posts]);

  if(loading)return <div className="py-20 grid place-items-center text-slate-400"><Loader2 className="animate-spin text-geek-orange"/></div>;

  return <div className="mx-auto max-w-6xl px-3 sm:px-4 space-y-5">
    <div>
      <h1 className="text-2xl sm:text-3xl font-black">Explorar</h1>
      <p className="text-sm text-slate-400 mt-1">Descubra pessoas, fandoms e conteúdos em alta.</p>
    </div>

    <div className="rounded-2xl border border-geek-line bg-geek-panel p-3 sm:p-4">
      <div className="flex items-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3">
        <Search size={18} className="text-slate-500 shrink-0"/>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar pessoas, posts ou fandoms..." className="w-full bg-transparent py-3 outline-none text-sm"/>
      </div>
      <div className="mt-3 overflow-x-auto pb-1"><div className="flex gap-2 min-w-max">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`rounded-full px-3 py-2 text-xs border ${category===c?'bg-geek-orange border-geek-orange text-white':'border-geek-line bg-geek-bg text-slate-300'}`}>{c}</button>)}</div></div>
    </div>

    {filteredProfiles.length>0&&<section>
      <div className="mb-3 flex items-center gap-2"><Users size={18} className="text-geek-orange"/><h2 className="font-bold">Pessoas</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{filteredProfiles.map(p=><Link href={`/perfil/${p.id}`} key={p.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4 hover:border-orange-500/50 transition"><div className="flex items-center gap-3"><div className="h-11 w-11 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-purple-600 shrink-0">{p.avatar_url&&<img src={p.avatar_url} alt="" className="h-full w-full object-cover"/>}</div><div className="min-w-0"><b className="block truncate text-sm">{p.display_name}</b><span className="text-xs text-slate-500">@{p.username||'geek'}</span></div></div>{p.bio&&<p className="mt-3 text-xs text-slate-400 line-clamp-2">{p.bio}</p>}</Link>)}</div>
    </section>}

    {trending.length>0&&<section>
      <div className="mb-3 flex items-center gap-2"><Flame size={18} className="text-geek-orange"/><h2 className="font-bold">Trending agora</h2></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{trending.map(([name,count],index)=><button key={name} onClick={()=>setCategory(name)} className="text-left rounded-2xl border border-geek-line bg-geek-panel p-4 hover:border-orange-500/50"><div className="flex items-center gap-3"><span className="text-xl font-black text-geek-orange">#{index+1}</span><div><b>{name}</b><p className="text-xs text-slate-500">{count} {count===1?'publicação':'publicações'}</p></div></div></button>)}</div>
    </section>}

    <section>
      <div className="mb-3 flex items-center gap-2"><ImageIcon size={18} className="text-geek-orange"/><h2 className="font-bold">Publicações</h2><span className="text-xs text-slate-500">{filteredPosts.length}</span></div>
      {filteredPosts.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400">Nenhuma publicação encontrada.</div>:<div className="columns-1 sm:columns-2 lg:columns-3 gap-3">{filteredPosts.map(post=><article key={post.id} className="mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-geek-line bg-geek-panel">{post.image_url&&<div className="w-full bg-black/30 flex items-center justify-center"><img src={post.image_url} alt="Publicação" className="block h-auto w-full max-h-[560px] object-contain"/></div>}<div className="p-4">{post.category&&<span className="inline-flex rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">{post.category}</span>}{post.content&&<p className="mt-2 text-sm text-slate-300 whitespace-pre-wrap break-words">{post.content}</p>}</div></article>)}</div>}
    </section>
  </div>;
}
