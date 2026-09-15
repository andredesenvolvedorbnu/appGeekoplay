'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SimpleListPage({ title, subtitle, table, fields, orderBy='created_at' }:{title:string; subtitle:string; table:string; fields:string[]; orderBy?:string}){
  const supabase=useMemo(()=>createClient(),[]);
  const [rows,setRows]=useState<any[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{let q=supabase.from(table).select('*'); if(orderBy) q=q.order(orderBy,{ascending:false}); const {data}=await q.limit(50); setRows(data||[]); setLoading(false)})()},[table,orderBy,supabase]);
  return <div className="mx-auto max-w-4xl px-3 sm:px-4"><div className="mb-5"><h1 className="text-2xl font-black">{title}</h1><p className="text-sm text-slate-400 mt-1">{subtitle}</p></div>{loading?<div className="py-20 grid place-items-center"><Loader2 className="animate-spin text-geek-orange"/></div>:rows.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400">Ainda não há conteúdo aqui.</div>:<div className="grid gap-3">{rows.map((row:any)=><article key={row.id||JSON.stringify(row)} className="rounded-2xl border border-geek-line bg-geek-panel p-4">{fields.map(f=>row[f]!==null&&row[f]!==undefined?<div key={f} className="mb-1"><span className="text-[10px] uppercase tracking-wider text-slate-500">{f.replaceAll('_',' ')}</span><p className="text-sm text-slate-200 break-words">{Array.isArray(row[f])?row[f].join(', '):String(row[f])}</p></div>:null)}</article>)}</div>}</div>
}
