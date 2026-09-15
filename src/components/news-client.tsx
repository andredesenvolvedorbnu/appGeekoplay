'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { Loader2, Newspaper, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type News={id:string;title:string;summary:string|null;image_url:string|null;source_name:string|null;source_url:string;category:string|null;published_at:string|null;created_at:string};
const categories=['Todas','Games','Anime','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis'];

export function NewsClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<News[]>([]);
 const [loading,setLoading]=useState(true);
 const [filter,setFilter]=useState('Todas');
 const [search,setSearch]=useState('');

 useEffect(()=>{(async()=>{const {data}=await supabase.from('news').select('id,title,summary,image_url,source_name,source_url,category,published_at,created_at').eq('active',true).order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(100);setRows((data||[]) as News[]);setLoading(false)})()},[supabase]);

 const visible=rows.filter(n=>{const q=search.trim().toLowerCase();return(filter==='Todas'||n.category===filter)&&(!q||n.title.toLowerCase().includes(q)||(n.summary||'').toLowerCase().includes(q)||(n.source_name||'').toLowerCase().includes(q))});

 return <div className="mx-auto max-w-6xl px-3 pb-10 sm:px-4">
  <div className="mb-5"><h1 className="text-2xl font-black">Notícias</h1><p className="mt-1 text-sm text-slate-400">Cultura pop, geek e games selecionados pela equipe GeekoPlay.</p></div>
  <div className="mb-4 flex items-center gap-2 rounded-xl border border-geek-line bg-geek-panel px-3"><Search size={16} className="text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar notícias" className="w-full bg-transparent py-3 outline-none"/></div>
  <div className="mb-4 overflow-x-auto"><div className="flex min-w-max gap-2">{categories.map(c=><button key={c} onClick={()=>setFilter(c)} className={`rounded-full border px-3 py-2 text-xs ${filter===c?'border-geek-orange bg-geek-orange text-white':'border-geek-line bg-geek-panel text-slate-300'}`}>{c}</button>)}</div></div>

  {loading?<div className="grid place-items-center py-20"><Loader2 className="animate-spin text-geek-orange"/></div>:visible.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><Newspaper className="mx-auto mb-3 text-geek-orange"/>Nenhuma notícia encontrada.</div>:<div className="grid gap-4 md:grid-cols-2">{visible.map(n=><Link href={`/noticias/${n.id}`} key={n.id} className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel text-left transition hover:border-orange-500/40"><div className="flex aspect-[16/8] items-center justify-center overflow-hidden bg-black/20">{n.image_url?<img src={n.image_url} alt={n.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<div className="grid h-full place-items-center text-slate-600"><Newspaper size={38}/></div>}</div><div className="p-4"><div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>{n.source_name||'Fonte externa'}</span>{n.category&&<><span>·</span><span>{n.category}</span></>}{n.published_at&&<><span>·</span><span>{new Date(n.published_at).toLocaleDateString('pt-BR')}</span></>}</div><h2 className="mt-2 text-lg font-black leading-snug">{n.title}</h2>{n.summary&&<p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-400">{n.summary}</p>}<span className="mt-4 inline-flex text-sm font-bold text-geek-orange">Abrir notícia</span></div></Link>)}</div>}
 </div>;
}
