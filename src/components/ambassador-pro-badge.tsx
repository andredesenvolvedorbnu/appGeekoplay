'use client';

import { useEffect,useMemo,useState } from 'react';
import { Crown,Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function AmbassadorProBadge({userId}:{userId?:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  let active=true;
  (async()=>{
   let target=userId;
   if(!target){const {data:{user}}=await supabase.auth.getUser();target=user?.id}
   if(!target)return;
   const {data}=await supabase.from('profiles').select('is_ambassador,is_pro').eq('id',target).maybeSingle();
   if(active)setVisible(Boolean(data?.is_ambassador&&data?.is_pro));
  })();
  return()=>{active=false};
 },[supabase,userId]);
 if(!visible)return null;
 return <div className="mx-auto mt-3 flex w-full max-w-4xl px-3 sm:px-5">
  <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-yellow-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-[.08em] text-violet-100 shadow-[0_0_24px_rgba(168,85,247,.12)]">
   <Star size={14} className="fill-current text-violet-300"/>
   Embaixador
   <span className="h-3 w-px bg-white/20"/>
   <Crown size={14} className="text-yellow-300"/>
   PRO
  </span>
 </div>;
}
