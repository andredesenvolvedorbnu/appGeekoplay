'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ExternalLink, Heart, Loader2, Newspaper, Search, Send, Share2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type News={id:string;title:string;summary:string|null;image_url:string|null;source_name:string|null;source_url:string;category:string|null;published_at:string|null;created_at:string};
const categories=['Todas','Games','Anime','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis'];

export function NewsClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<News[]>([]);
 const [loading,setLoading]=useState(true);
 const [search,setSearch]=useState('');
 const [sheetCategory,setSheetCategory]=useState<string|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [likes,setLikes]=useState<Record<string,number>>({});
 const [liked,setLiked]=useState<Set<string>>(new Set());
 const [message,setMessage]=useState('');
 const [posting,setPosting]=useState<string|null>(null);

 async function load(){
  setLoading(true);
  const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
  const {data}=await supabase.from('news').select('id,title,summary,image_url,source_name,source_url,category,published_at,created_at').eq('active',true).order('published_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(150);
  const safe=(data||[]) as News[];setRows(safe);
  if(safe.length){const {data:likeRows}=await supabase.from('news_likes').select('news_id,user_id').in('news_id',safe.map(n=>n.id));const counts:Record<string,number>={};const mine=new Set<string>();(likeRows||[]).forEach((l:{news_id:string;user_id:string})=>{counts[l.news_id]=(counts[l.news_id]||0)+1;if(user&&l.user_id===user.id)mine.add(l.news_id)});setLikes(counts);setLiked(mine)}else{setLikes({});setLiked(new Set())}
  setLoading(false);
 }

 useEffect(()=>{void load();const channel=supabase.channel('news-live').on('postgres_changes',{event:'*',schema:'public',table:'news'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'news_likes'},()=>void load()).subscribe();return()=>{void supabase.removeChannel(channel)}},[supabase]);

 const searched=rows.filter(n=>{const q=search.trim().toLowerCase();return !q||n.title.toLowerCase().includes(q)||(n.summary||'').toLowerCase().includes(q)||(n.source_name||'').toLowerCase().includes(q)});
 const last24hCutoff=Date.now()-24*60*60*1000;
 const allRows=searched.filter(n=>new Date(n.published_at||n.created_at).getTime()>=last24hCutoff);
 const sheetRows=sheetCategory?searched.filter(n=>n.category===sheetCategory):[];

 async function toggleLike(newsId:string){if(!userId){setMessage('Entre na sua conta para curtir notícias.');return}if(liked.has(newsId))await supabase.from('news_likes').delete().eq('news_id',newsId).eq('user_id',userId);else await supabase.from('news_likes').insert({news_id:newsId,user_id:userId});await load()}
 async function share(n:News){const url=`${window.location.origin}/noticias/${n.id}`;if(navigator.share){try{await navigator.share({title:n.title,text:n.summary||'Veja esta notícia no GeekoPlay.',url})}catch{}}else{try{await navigator.clipboard.writeText(url);setMessage('Link da notícia copiado.')}catch{setMessage('Não foi possível copiar o link.')}}}
 async function postToFeed(n:News){if(!userId){setMessage('Entre na sua conta para compartilhar no feed.');return}setPosting(n.id);setMessage('');const text=[`📰 ${n.title}`,n.summary,n.source_name?`Fonte: ${n.source_name}`:null,n.source_url].filter(Boolean).join('\n\n');const {error}=await supabase.from('posts').insert({author_id:userId,content:text,category:n.category||'Geek',post_type:'news_share',card_data:{news_id:n.id,title:n.title,source_url:n.source_url,source_name:n.source_name}});setPosting(null);setMessage(error?'Não foi possível compartilhar a notícia no feed.':'Notícia compartilhada no seu feed.')}

 function NewsCard({n,fullSummary=false}:{n:News;fullSummary?:boolean}){
  return <article className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel transition hover:border-orange-500/40">
   <Link href={`/noticias/${n.id}`} className="block"><div className="flex aspect-[16/8] items-center justify-center overflow-hidden bg-black/20">{n.image_url?<img src={n.image_url} alt={n.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<div className="grid h-full place-items-center text-slate-600"><Newspaper size={38}/></div>}</div><div className="p-4 pb-2"><div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>{n.source_name||'Fonte externa'}</span>{n.category&&<><span>·</span><span>{n.category}</span></>}{n.published_at&&<><span>·</span><span>{new Date(n.published_at).toLocaleDateString('pt-BR')}</span></>}</div><h2 className="mt-2 text-lg font-black leading-snug">{n.title}</h2>{n.summary&&<p className={`mt-2 text-sm leading-6 text-slate-400 ${fullSummary?'':'line-clamp-4'}`}>{n.summary}</p>}</div></Link>
   <div className="grid grid-cols-4 border-t border-geek-line"><button onClick={()=>void toggleLike(n.id)} className={`flex items-center justify-center gap-1 px-2 py-3 text-xs ${liked.has(n.id)?'text-red-400':'text-slate-400'} hover:bg-geek-soft`} aria-label="Curtir notícia"><Heart size={16} fill={liked.has(n.id)?'currentColor':'none'}/>{likes[n.id]||0}</button><button onClick={()=>void share(n)} className="grid place-items-center px-2 py-3 text-slate-400 hover:bg-geek-soft" aria-label="Compartilhar notícia"><Share2 size={16}/></button><button onClick={()=>void postToFeed(n)} disabled={posting===n.id} className="grid place-items-center px-2 py-3 text-slate-400 hover:bg-geek-soft disabled:opacity-50" aria-label="Postar no feed">{posting===n.id?<Loader2 size={16} className="animate-spin"/>:<Send size={16}/>}</button><a href={n.source_url} target="_blank" rel="noreferrer" className="grid place-items-center px-2 py-3 text-geek-orange hover:bg-geek-soft" aria-label="Abrir fonte original"><ExternalLink size={16}/></a></div>
  </article>
 }

 return <div className="mx-auto max-w-6xl px-3 pb-10 sm:px-4">
  <div className="mb-5"><h1 className="text-2xl font-black">Notícias</h1><p className="mt-1 text-sm text-slate-400">Notícias geek atualizadas automaticamente a cada 4 horas, além da curadoria do GeekoPlay.</p></div>
  {message&&<div className="mb-4 rounded-xl border border-geek-line bg-geek-panel px-4 py-3 text-sm text-slate-300">{message}</div>}
  <div className="mb-4 flex items-center gap-2 rounded-xl border border-geek-line bg-geek-panel px-3"><Search size={16} className="text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar notícias" className="w-full bg-transparent py-3 outline-none"/></div>
  <div className="mb-4 overflow-x-auto"><div className="flex min-w-max gap-2">{categories.map(c=><button key={c} onClick={()=>c==='Todas'?setSheetCategory(null):setSheetCategory(c)} className={`rounded-full border px-3 py-2 text-xs ${(c==='Todas'&&sheetCategory===null)||sheetCategory===c?'border-geek-orange bg-geek-orange text-white':'border-geek-line bg-geek-panel text-slate-300'}`}>{c}</button>)}</div></div>

  {!loading&&sheetCategory===null&&<div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-geek-line bg-geek-panel px-4 py-3"><div><p className="text-sm font-bold">Últimas 24 horas</p><p className="text-xs text-slate-500">Todas as categorias reunidas em ordem cronológica.</p></div><span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300">{allRows.length}</span></div>}

  {loading?<div className="grid place-items-center py-20"><Loader2 className="animate-spin text-geek-orange"/></div>:allRows.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><Newspaper className="mx-auto mb-3 text-geek-orange"/>Nenhuma notícia encontrada nas últimas 24 horas.</div>:<div className="grid gap-4 md:grid-cols-2">{allRows.slice(0,80).map(n=><NewsCard key={n.id} n={n}/>)}</div>}

  {sheetCategory&&<div className="fixed inset-0 z-[110] bg-black/65" onMouseDown={e=>{if(e.target===e.currentTarget)setSheetCategory(null)}}><section className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl border border-geek-line bg-geek-bg shadow-2xl"><div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-700"/><div className="flex items-center justify-between border-b border-geek-line px-4 py-3"><div><h2 className="text-xl font-black">{sheetCategory}</h2><p className="text-xs text-slate-500">{sheetRows.length} notícia{sheetRows.length===1?'':'s'} encontrada{sheetRows.length===1?'':'s'}</p></div><button onClick={()=>setSheetCategory(null)} className="rounded-xl p-2 hover:bg-geek-soft" aria-label="Fechar notícias da categoria"><X size={20}/></button></div><div className="overflow-y-auto p-3 sm:p-5"><div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">{sheetRows.length?sheetRows.map(n=><NewsCard key={n.id} n={n} fullSummary/>):<div className="md:col-span-2 py-16 text-center text-slate-500">Nenhuma notícia desta categoria no momento.</div>}</div></div></section></div>}
 </div>;
}
