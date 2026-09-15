'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2, Newspaper, Share2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type News={id:string;title:string;summary:string|null;image_url:string|null;source_name:string|null;source_url:string;category:string|null;published_at:string|null;created_at:string};

export function NewsDetailClient({newsId}:{newsId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [news,setNews]=useState<News|null>(null);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');

 useEffect(()=>{(async()=>{setLoading(true);const {data}=await supabase.from('news').select('id,title,summary,image_url,source_name,source_url,category,published_at,created_at').eq('id',newsId).eq('active',true).maybeSingle();setNews((data||null) as News|null);setLoading(false)})()},[newsId,supabase]);

 async function share(){if(!news)return;const url=window.location.href;if(navigator.share){try{await navigator.share({title:news.title,text:news.summary?.slice(0,140)||'Confira esta notícia no GeekoPlay.',url})}catch{}}else{try{await navigator.clipboard.writeText(url);setMessage('Link da notícia copiado.')}catch{setMessage('Não foi possível copiar o link.')}}}

 if(loading)return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-geek-orange"/></div>;
 if(!news)return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-black">Notícia não encontrada</h1><p className="mt-2 text-sm text-slate-400">Ela pode ter sido removida ou desativada pela equipe.</p><Link href="/noticias" className="mt-5 inline-flex rounded-xl bg-geek-orange px-4 py-2 font-bold">Voltar para Notícias</Link></div>;

 return <div className="mx-auto max-w-4xl space-y-5 px-3 pb-10 sm:px-4">
  <div className="flex items-center justify-between gap-3"><Link href="/noticias" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>Voltar</Link><button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm hover:bg-geek-soft"><Share2 size={16}/>Compartilhar</button></div>

  <article className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel">
   <div className="flex aspect-[16/8] min-h-[220px] items-center justify-center overflow-hidden bg-black/20">{news.image_url?<img src={news.image_url} alt={news.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<Newspaper size={64} className="text-orange-300/40"/>}</div>
   <div className="p-5 sm:p-8"><div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="font-bold text-orange-300">{news.source_name||'Fonte externa'}</span>{news.category&&<><span>·</span><span>{news.category}</span></>}{news.published_at&&<><span>·</span><span>{new Date(news.published_at).toLocaleDateString('pt-BR',{dateStyle:'long'})}</span></>}</div><h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">{news.title}</h1>{news.summary&&<p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base">{news.summary}</p>}<div className="mt-7 rounded-2xl border border-geek-line bg-geek-soft p-4"><p className="text-sm text-slate-400">O GeekoPlay apresenta um resumo editorial e mantém o crédito da publicação original.</p><a href={news.source_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-geek-orange px-5 py-3 text-sm font-black text-white">Ler matéria completa na fonte <ExternalLink size={17}/></a></div>{message&&<p className="mt-4 text-sm text-slate-300">{message}</p>}</div>
  </article>
 </div>;
}
