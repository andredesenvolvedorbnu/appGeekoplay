'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function RecapReminder(){
  const supabase=useMemo(()=>createClient(),[]);
  const [visible,setVisible]=useState(false);
  const [period,setPeriod]=useState<{year:number;semester:number}|null>(null);

  useEffect(()=>{
    (async()=>{
      const now=new Date();
      const month=now.getMonth()+1;
      const day=now.getDate();
      const isWindow=(month===6&&day>=20)||(month===12&&day>=20);
      if(!isWindow)return;
      const semester=month===6?1:2;
      const year=now.getFullYear();
      const dismissed=sessionStorage.getItem(`recap-reminder-${year}-${semester}`)==='1';
      if(dismissed)return;
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)return;
      const {data}=await supabase.from('recaps').select('id').eq('user_id',user.id).eq('year',year).eq('semester',semester).maybeSingle();
      if(!data){setPeriod({year,semester});setVisible(true)}
    })();
  },[supabase]);

  if(!visible||!period)return null;

  function close(){sessionStorage.setItem(`recap-reminder-${period.year}-${period.semester}`,'1');setVisible(false)}

  return <div className="mx-auto mb-4 max-w-2xl px-3 sm:px-4">
    <div className="relative overflow-hidden rounded-2xl border border-orange-500/35 bg-gradient-to-r from-orange-500/15 via-purple-500/10 to-cyan-500/10 p-4 sm:p-5">
      <button onClick={close} className="absolute right-2 top-2 rounded-full p-2 text-slate-400 hover:bg-black/10" aria-label="Fechar"><X size={16}/></button>
      <div className="flex items-start gap-3 pr-8"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-geek-orange text-white"><Sparkles size={21}/></div><div><p className="text-xs font-black tracking-[.16em] text-orange-300">RECAP GEEK DISPONÍVEL</p><h2 className="mt-1 font-black">Como foi sua metade do ano geek?</h2><p className="mt-1 text-sm text-slate-400">Reviva fotos, posts, Pulses e eventos do semestre em um álbum animado.</p><Link href={`/recap?ano=${period.year}&semestre=${period.semester}`} className="mt-3 inline-flex rounded-xl bg-geek-orange px-4 py-2 text-sm font-black text-white">Criar meu Recap</Link></div></div>
    </div>
  </div>;
}
