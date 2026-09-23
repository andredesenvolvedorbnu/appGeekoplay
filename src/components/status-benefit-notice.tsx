'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { Crown, Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Notice={id:string;notice_type:string;title:string;body:string;created_at:string};

export function StatusBenefitNotice(){
 const supabase=useMemo(()=>createClient(),[]);
 const [notice,setNotice]=useState<Notice|null>(null);
 useEffect(()=>{void (async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.rpc('get_my_pending_status_notice');const row=((data||[]) as Notice[])[0];if(row)setNotice(row)})()},[supabase]);
 async function dismiss(){if(!notice)return;await supabase.rpc('dismiss_status_notice',{notice_id:notice.id});setNotice(null)}
 if(!notice)return null;
 return <div className="fixed inset-0 z-[190] grid place-items-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-label={notice.title}>
  <section className="w-full max-w-lg rounded-3xl border border-orange-500/30 bg-geek-panel p-5 shadow-2xl sm:p-7">
   <div className="flex items-start justify-between gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/15 text-orange-300">{notice.notice_type==='premium'?<Crown size={24}/>:<Sparkles size={24}/>}</div><button onClick={()=>void dismiss()} className="rounded-xl p-2 text-slate-400 hover:bg-geek-soft" aria-label="Fechar"><X size={19}/></button></div>
   <p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-geek-orange">Novidade na sua conta</p>
   <h2 className="mt-2 text-2xl font-black">{notice.title}</h2>
   <p className="mt-3 leading-6 text-slate-300">{notice.body}</p>
   <p className="mt-3 text-sm font-semibold text-orange-200">Descubra aqui quais são seus benefícios e como usá-los agora.</p>
   <div className="mt-6 grid gap-2 sm:grid-cols-2"><button onClick={()=>void dismiss()} className="rounded-xl border border-geek-line px-4 py-3 font-bold">Ver depois</button><Link href="/beneficios" onClick={()=>void dismiss()} className="rounded-xl bg-geek-orange px-4 py-3 text-center font-black text-white">Ver meus benefícios</Link></div>
  </section>
 </div>;
}
