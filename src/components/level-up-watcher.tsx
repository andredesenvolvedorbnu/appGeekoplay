'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Share2, Sparkles, Trophy, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const levelTitles = ['Novato','Curioso Geek','Explorador','Player 1','Veterano','Especialista','Mestre Geek','Lenda','Ícone Geek','Deus Geek'];

type LevelUp = { level:number; title:string } | null;

export function LevelUpWatcher(){
  const supabase=useMemo(()=>createClient(),[]);
  const [levelUp,setLevelUp]=useState<LevelUp>(null);
  const userId=useRef<string|null>(null);
  const currentLevel=useRef<number|null>(null);

  useEffect(()=>{
    let active=true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user || !active)return;
      userId.current=user.id;
      const {data:profile}=await supabase.from('profiles').select('level').eq('id',user.id).maybeSingle();
      const initial=Math.max(1,Math.min(10,Number(profile?.level||1)));
      currentLevel.current=initial;
      sessionStorage.setItem(`geekoplay-level-${user.id}`,String(initial));

      channel=supabase.channel(`level-up-${user.id}`)
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:`id=eq.${user.id}`},payload=>{
          const next=Math.max(1,Math.min(10,Number((payload.new as {level?:number}).level||1)));
          const previous=currentLevel.current ?? next;
          currentLevel.current=next;
          sessionStorage.setItem(`geekoplay-level-${user.id}`,String(next));
          if(next>previous){
            setLevelUp({level:next,title:levelTitles[next-1]||`Nível ${next}`});
          }
        })
        .subscribe();
    })();

    return()=>{
      active=false;
      if(channel)void supabase.removeChannel(channel);
    };
  },[supabase]);

  async function share(){
    if(!levelUp)return;
    const text=`Subi para o nível ${levelUp.level} (${levelUp.title}) no GeekoPlay! 🎮✨`;
    if(navigator.share){
      try{await navigator.share({title:'GeekoPlay - Level Up!',text});return;}catch{}
    }
    try{await navigator.clipboard.writeText(text);}catch{}
  }

  if(!levelUp)return null;

  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-orange-500/40 bg-geek-panel p-6 text-center shadow-2xl">
      <button onClick={()=>setLevelUp(null)} className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-geek-soft" aria-label="Fechar"><X size={18}/></button>
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-purple-600 shadow-xl"><Trophy size={38} className="text-white"/></div>
      <div className="mt-4 flex items-center justify-center gap-2 text-orange-300"><Sparkles size={17}/><span className="text-xs font-black tracking-[.2em]">LEVEL UP!</span><Sparkles size={17}/></div>
      <h2 className="mt-2 text-3xl font-black">Nível {levelUp.level}</h2>
      <p className="mt-1 text-lg font-bold text-geek-orange">{levelUp.title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">Sua participação na comunidade aumentou seu nível. Continue explorando, publicando e participando dos eventos.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button onClick={share} className="inline-flex items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-bold"><Share2 size={17}/>Compartilhar</button>
        <button onClick={()=>setLevelUp(null)} className="rounded-xl border border-geek-line bg-geek-soft px-4 py-3 font-semibold">Continuar</button>
      </div>
    </div>
  </div>;
}
