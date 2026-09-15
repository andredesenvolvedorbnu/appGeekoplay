'use client';

import { useEffect,useMemo,useState } from 'react';
import { Check, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Report={id:string;reporter_id:string;content_type:string;content_id:string;reason:string;details:string|null;status:string;created_at:string};

export function AdminReportsClient(){
 const supabase=useMemo(()=>createClient(),[]); const [rows,setRows]=useState<Report[]>([]); const [loading,setLoading]=useState(true);
 async function load(){setLoading(true);const {data}=await supabase.from('content_reports').select('*').order('created_at',{ascending:false}).limit(200);setRows((data||[]) as Report[]);setLoading(false)}
 useEffect(()=>{void load()},[supabase]);
 async function setStatus(id:string,status:string){const {data:{user}}=await supabase.auth.getUser();await supabase.from('content_reports').update({status,reviewed_at:new Date().toISOString(),reviewed_by:user?.id||null}).eq('id',id);await load()}
 return <div className="mx-auto max-w-7xl space-y-5"><div><p className="text-sm font-bold text-geek-orange">MODERAÇÃO</p><h1 className="text-2xl sm:text-3xl font-black">Denúncias</h1><p className="mt-2 text-sm text-slate-400">Fila de conteúdos denunciados pelos usuários. Somente administradores podem revisar.</p></div>{loading?<div className="py-20 grid place-items-center"><Loader2 className="animate-spin text-geek-orange"/></div>:rows.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><ShieldAlert className="mx-auto mb-3 text-geek-orange"/>Nenhuma denúncia recebida.</div>:<div className="grid gap-3">{rows.map(r=><article key={r.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] uppercase text-orange-300">{r.content_type}</span><span className="rounded-full bg-slate-500/10 px-2 py-1 text-[10px] uppercase text-slate-300">{r.status}</span></div><p className="mt-2 text-sm font-bold">{r.reason}</p>{r.details&&<p className="mt-1 text-sm text-slate-400">{r.details}</p>}<p className="mt-2 text-xs text-slate-500">Conteúdo: {r.content_id} · {new Date(r.created_at).toLocaleString('pt-BR')}</p></div><div className="flex gap-2">{r.status!=='resolved'&&<button onClick={()=>setStatus(r.id,'resolved')} className="rounded-xl border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300 flex items-center gap-2"><Check size={16}/>Resolver</button>}{r.status!=='dismissed'&&<button onClick={()=>setStatus(r.id,'dismissed')} className="rounded-xl border border-geek-line px-3 py-2 text-sm flex items-center gap-2"><XCircle size={16}/>Descartar</button>}</div></div></article>)}</div>}</div>;
}
