'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Loader2, ShieldAlert, Trash2, UserRound, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Report={id:string;reporter_id:string;content_type:string;content_id:string;reason:string;details:string|null;status:string;created_at:string;reviewed_at:string|null;reviewed_by:string|null};
type Post={id:string;author_id:string;content:string|null;image_url:string|null;video_url:string|null;category:string|null;post_type:string;created_at:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;role:string};
type Filter='pending'|'resolved'|'dismissed'|'all';

const statusLabel:Record<string,string>={pending:'Pendente',resolved:'Resolvida',dismissed:'Descartada'};

export function AdminReportsClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<Report[]>([]);
 const [posts,setPosts]=useState<Record<string,Post>>({});
 const [profiles,setProfiles]=useState<Record<string,Profile>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [message,setMessage]=useState('');
 const [filter,setFilter]=useState<Filter>('pending');

 async function load(){
  setLoading(true);setMessage('');
  const {data}=await supabase.from('content_reports').select('*').order('created_at',{ascending:false}).limit(300);
  const reports=(data||[]) as Report[];setRows(reports);

  const postIds=[...new Set(reports.filter(r=>r.content_type==='post').map(r=>r.content_id))];
  const postMap:Record<string,Post>={};
  if(postIds.length){const {data:postRows}=await supabase.from('posts').select('id,author_id,content,image_url,video_url,category,post_type,created_at').in('id',postIds);((postRows||[]) as Post[]).forEach(p=>postMap[p.id]=p)}
  setPosts(postMap);

  const profileIds=[...new Set([...reports.map(r=>r.reporter_id),...Object.values(postMap).map(p=>p.author_id)])];
  const profileMap:Record<string,Profile>={};
  if(profileIds.length){const {data:profileRows}=await supabase.from('profiles').select('id,display_name,username,avatar_url,role').in('id',profileIds);((profileRows||[]) as Profile[]).forEach(p=>profileMap[p.id]=p)}
  setProfiles(profileMap);setLoading(false);
 }

 useEffect(()=>{void load()},[supabase]);

 async function setStatus(id:string,status:'resolved'|'dismissed'){
  setBusy(id);setMessage('');
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from('content_reports').update({status,reviewed_at:new Date().toISOString(),reviewed_by:user?.id||null}).eq('id',id);
  if(error)setMessage('Não foi possível atualizar esta denúncia.');
  await load();setBusy(null);
 }

 async function removeReportedPost(report:Report){
  const post=posts[report.content_id];
  if(!post){setMessage('A publicação denunciada já não existe.');return}
  if(!window.confirm('Excluir permanentemente esta publicação denunciada? Esta ação não pode ser desfeita.'))return;
  setBusy(report.id);setMessage('');
  const {error}=await supabase.from('posts').delete().eq('id',post.id);
  if(error){setMessage('Não foi possível excluir a publicação.');setBusy(null);return}
  const {data:{user}}=await supabase.auth.getUser();
  await supabase.from('content_reports').update({status:'resolved',reviewed_at:new Date().toISOString(),reviewed_by:user?.id||null}).eq('content_type','post').eq('content_id',post.id);
  setMessage('Publicação removida e denúncias relacionadas marcadas como resolvidas.');
  await load();setBusy(null);
 }

 const visible=rows.filter(r=>filter==='all'||r.status===filter);
 const pending=rows.filter(r=>r.status==='pending').length;

 return <div className="mx-auto max-w-7xl space-y-5">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-bold text-geek-orange">MODERAÇÃO</p><h1 className="text-2xl sm:text-3xl font-black">Denúncias</h1><p className="mt-2 text-sm text-slate-400">Analise o conteúdo, identifique autor e denunciante e tome uma ação sem sair do painel.</p></div><div className="rounded-xl border border-geek-line bg-geek-panel px-4 py-3 text-sm"><b className="text-orange-300">{pending}</b> pendente{pending===1?'':'s'}</div></div>

  <div className="flex gap-2 overflow-x-auto pb-1">{([['pending','Pendentes'],['resolved','Resolvidas'],['dismissed','Descartadas'],['all','Todas']] as [Filter,string][]).map(([value,label])=><button key={value} onClick={()=>setFilter(value)} className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm ${filter===value?'border-orange-500/50 bg-orange-500/10 text-orange-300':'border-geek-line bg-geek-panel text-slate-400'}`}>{label}</button>)}</div>

  {message&&<div className="rounded-xl border border-geek-line bg-geek-panel px-4 py-3 text-sm text-slate-300">{message}</div>}

  {loading?<div className="py-20 grid place-items-center"><Loader2 className="animate-spin text-geek-orange"/></div>:visible.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><ShieldAlert className="mx-auto mb-3 text-geek-orange"/>Nenhuma denúncia nesta categoria.</div>:<div className="grid gap-4">{visible.map(r=>{
   const post=posts[r.content_id];const reporter=profiles[r.reporter_id];const author=post?profiles[post.author_id]:null;const working=busy===r.id;
   return <article key={r.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
     <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] uppercase text-orange-300">{r.content_type==='post'?'Publicação':r.content_type}</span><span className={`rounded-full px-2 py-1 text-[10px] ${r.status==='pending'?'bg-yellow-500/10 text-yellow-300':r.status==='resolved'?'bg-emerald-500/10 text-emerald-300':'bg-slate-500/10 text-slate-300'}`}>{statusLabel[r.status]||r.status}</span><span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString('pt-BR')}</span></div>
      <h2 className="mt-3 font-black">Motivo: {r.reason}</h2>{r.details&&<p className="mt-1 text-sm text-slate-400">{r.details}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
       <div className="rounded-xl bg-geek-soft p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Denunciante</p><div className="flex items-center gap-2"><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{reporter?.avatar_url?<img src={reporter.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={16}/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{reporter?.display_name||'Usuário não encontrado'}</p><p className="truncate text-xs text-slate-500">@{reporter?.username||'geek'}</p></div></div></div>
       <div className="rounded-xl bg-geek-soft p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Autor do conteúdo</p>{author?<div className="flex items-center gap-2"><div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{author.avatar_url?<img src={author.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={16}/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{author.display_name}</p><p className="truncate text-xs text-slate-500">@{author.username||'geek'}{author.role==='admin'?' · ADM':''}</p></div></div>:<p className="text-sm text-slate-500">Conteúdo removido ou autor indisponível.</p>}</div>
      </div>

      {r.content_type==='post'&&<div className="mt-4 overflow-hidden rounded-2xl border border-geek-line bg-geek-soft">{post?<><div className="p-4"><div className="flex flex-wrap items-center gap-2">{post.category&&<span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">{post.category}</span>}<span className="text-[10px] text-slate-500">{post.post_type==='card'?'Geek Card':'Publicação'}</span></div>{post.content&&<p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">{post.content}</p>}</div>{post.image_url&&<div className="flex max-h-[420px] items-center justify-center bg-black/30"><img src={post.image_url} alt="Conteúdo denunciado" className="block h-auto max-h-[420px] w-auto max-w-full object-contain"/></div>}{post.video_url&&<div className="flex max-h-[420px] items-center justify-center bg-black"><video src={post.video_url} controls playsInline preload="metadata" className="max-h-[420px] max-w-full object-contain"/></div>}</>:<div className="p-4 text-sm text-slate-500">Esta publicação já foi removida.</div>}</div>}
     </div>

     <div className="flex shrink-0 flex-wrap gap-2 xl:w-52 xl:flex-col">
      {post&&<Link href={`/publicacoes/${post.id}`} target="_blank" className="flex items-center justify-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm hover:bg-geek-soft"><Eye size={16}/>Abrir publicação</Link>}
      {post&&author&&<Link href={`/perfil/${author.id}`} target="_blank" className="flex items-center justify-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm hover:bg-geek-soft"><UserRound size={16}/>Ver autor</Link>}
      {r.status==='pending'&&post&&<button onClick={()=>removeReportedPost(r)} disabled={working} className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-300 disabled:opacity-50"><Trash2 size={16}/>Excluir conteúdo</button>}
      {r.status!=='resolved'&&<button onClick={()=>setStatus(r.id,'resolved')} disabled={working} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300 disabled:opacity-50"><Check size={16}/>Resolver</button>}
      {r.status!=='dismissed'&&<button onClick={()=>setStatus(r.id,'dismissed')} disabled={working} className="flex items-center justify-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm disabled:opacity-50"><XCircle size={16}/>Descartar</button>}
     </div>
    </div>
   </article>})}</div>}
 </div>;
}
