'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Recap={id:string;year:number;semester:number;media_urls:string[];stats:{posts?:number;photos?:number;events?:number;pulses?:number};is_pinned:boolean};

export function PinnedRecapCard(){
  const supabase=useMemo(()=>createClient(),[]);
  const [recap,setRecap]=useState<Recap|null>(null);

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    const {data}=await supabase.from('recaps').select('id,year,semester,media_urls,stats,is_pinned').eq('user_id',user.id).eq('is_pinned',true).order('year',{ascending:false}).order('semester',{ascending:false}).limit(1).maybeSingle();
    setRecap((data||null) as Recap|null);
  })()},[supabase]);

  if(!recap)return null;
  const media=recap.media_urls||[];
  return <section className="mx-auto mt-4 w-full max-w-4xl px-3 sm:px-5">
    <Link href={`/recap?ano=${recap.year}&semestre=${recap.semester}`} className="block overflow-hidden rounded-2xl border border-orange-500/30 bg-geek-panel transition hover:border-orange-500/60">
      <div className="grid h-28 grid-cols-4 overflow-hidden bg-black/20 sm:h-36">
        {media.slice(0,4).map((url,index)=><div key={url} className="relative min-w-0 overflow-hidden border-r border-black/20 last:border-0"><img src={url} alt={`Recap ${index+1}`} className="h-full w-full object-cover object-center"/></div>)}
        {!media.length&&<div className="col-span-4 grid place-items-center bg-gradient-to-r from-orange-500/20 via-purple-500/15 to-cyan-500/15"><Sparkles size={32} className="text-geek-orange"/></div>}
      </div>
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-geek-orange"><Sparkles size={15}/><span className="text-xs font-black tracking-[.14em]">RECAP FIXADO</span></div><h2 className="mt-1 font-black">Minha metade do ano geek · {recap.semester===1?'1º':'2º'} semestre de {recap.year}</h2></div><div className="sm:ml-auto text-xs text-slate-400">{recap.stats?.photos||0} fotos · {recap.stats?.events||0} eventos · {recap.stats?.posts||0} posts</div></div>
    </Link>
  </section>;
}
