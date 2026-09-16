'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Trophy, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const TITLES=['Novato','Curioso Geek','Explorador','Player 1','Veterano','Especialista','Mestre Geek','Lenda','Ícone Geek','Deus Geek'];

type Profile={xp:number;level:number};

export function XPProgressCard(){
  const supabase=useMemo(()=>createClient(),[]);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [userId,setUserId]=useState<string|null>(null);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    setUserId(user.id);
    const {data}=await supabase.from('profiles').select('xp,level').eq('id',user.id).maybeSingle();
    if(data)setProfile({xp:Number(data.xp||0),level:Number(data.level||1)});
  }

  useEffect(()=>{void load()},[supabase]);
  useEffect(()=>{if(!userId)return;const channel=supabase.channel(`xp-profile-${userId}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:`id=eq.${userId}`},()=>void load()).subscribe();return()=>{void supabase.removeChannel(channel)}},[supabase,userId]);

  if(!profile)return null;
  const level=Math.max(1,Math.min(10,profile.level));
  const start=(level-1)*500;
  const end=level>=10?profile.xp:level*500;
  const current=level>=10?500:Math.max(0,profile.xp-start);
  const percent=level>=10?100:Math.min(100,(current/500)*100);

  return <section className="mx-auto mt-4 w-full max-w-4xl px-3 sm:px-5">
    <div className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-yellow-500/10 text-yellow-300"><Trophy size={23}/></div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="font-black">Nível {level} · {TITLES[level-1]}</h2><span className="text-xs text-slate-500">{profile.xp} XP total</span></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-geek-soft"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-500" style={{width:`${percent}%`}}/></div><div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{level>=10?'Nível máximo':`${current} / 500 XP neste nível`}</span><span>{level>=10?'Deus Geek':`${Math.max(0,end-profile.xp)} XP para o próximo`}</span></div></div>
        <Link href="/conquistas#como-ganhar-xp" className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-300 hover:border-orange-500/50"><Zap size={16}/>Como ganhar XP</Link>
      </div>
    </div>
  </section>;
}
