'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Sparkles, UserPlus, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Person={
  id:string;
  display_name:string;
  username:string|null;
  avatar_url:string|null;
  bio:string|null;
  city:string|null;
  favorite_categories:string[];
  level:number;
  pioneer_number:number|null;
  created_at:string;
};

type CurrentProfile={
  id:string;
  city:string|null;
  favorite_categories:string[];
  pioneer_number:number|null;
  discovery_prompt_views:number;
};

function overlap(a:string[],b:string[]){
  const set=new Set(a.map(v=>v.toLowerCase()));
  return b.filter(v=>set.has(v.toLowerCase()));
}

export function PioneerDiscoveryPrompt(){
  const supabase=useMemo(()=>createClient(),[]);
  const [open,setOpen]=useState(false);
  const [stage,setStage]=useState<'ask'|'people'>('ask');
  const [people,setPeople]=useState<Person[]>([]);
  const [current,setCurrent]=useState<CurrentProfile|null>(null);
  const [following,setFollowing]=useState<Set<string>>(new Set());
  const [busy,setBusy]=useState<string|null>(null);

  useEffect(()=>{
    void (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)return;
      const sessionKey=`geekoplay-discovery-prompt-${user.id}`;
      if(sessionStorage.getItem(sessionKey)==='shown')return;

      const {data:profile}=await supabase.from('profiles')
        .select('id,city,favorite_categories,pioneer_number,discovery_prompt_views')
        .eq('id',user.id).maybeSingle();

      if(!profile||!profile.pioneer_number||profile.pioneer_number>1000||Number(profile.discovery_prompt_views||0)>=2)return;

      sessionStorage.setItem(sessionKey,'shown');
      setCurrent(profile as CurrentProfile);
      setOpen(true);

      // Tracking must never block the onboarding UI. Register it best-effort.
      void supabase.rpc('register_discovery_prompt_view');
    })();
  },[supabase]);

  useEffect(()=>{
    async function openFromShortcut(){
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)return;
      const {data:profile}=await supabase.from('profiles')
        .select('id,city,favorite_categories,pioneer_number,discovery_prompt_views')
        .eq('id',user.id).maybeSingle();
      if(!profile)return;
      setCurrent(profile as CurrentProfile);
      setStage('people');
      setOpen(true);
      setPeople([]);
      window.setTimeout(()=>{void loadPeopleFor(profile as CurrentProfile)},0);
    }
    window.addEventListener('geekoplay-open-discovery',openFromShortcut);
    return()=>window.removeEventListener('geekoplay-open-discovery',openFromShortcut);
  },[supabase]);

  async function loadPeopleFor(profile:CurrentProfile){
    const [{data:rows},{data:follows}]=await Promise.all([
      supabase.from('profiles')
        .select('id,display_name,username,avatar_url,bio,city,favorite_categories,level,pioneer_number,created_at')
        .neq('id',profile.id)
        .order('created_at',{ascending:false})
        .limit(80),
      supabase.from('follows').select('following_id').eq('follower_id',profile.id)
    ]);
    const followed=new Set((follows||[]).map(row=>row.following_id as string));
    setFollowing(followed);
    const now=Date.now();
    const ranked=((rows||[]) as Person[]).sort((a,b)=>{
      const aAgeHours=Math.max(0,(now-new Date(a.created_at).getTime())/36e5);
      const bAgeHours=Math.max(0,(now-new Date(b.created_at).getTime())/36e5);
      const aRecent=aAgeHours<=168?1:0;
      const bRecent=bAgeHours<=168?1:0;
      const aShared=overlap(profile.favorite_categories||[],a.favorite_categories||[]).length;
      const bShared=overlap(profile.favorite_categories||[],b.favorite_categories||[]).length;
      const aCity=!!profile.city&&!!a.city&&profile.city.toLowerCase()===a.city.toLowerCase()?1:0;
      const bCity=!!profile.city&&!!b.city&&profile.city.toLowerCase()===b.city.toLowerCase()?1:0;
      return bRecent-aRecent||new Date(b.created_at).getTime()-new Date(a.created_at).getTime()||bShared-aShared||bCity-aCity||(a.pioneer_number||9999)-(b.pioneer_number||9999);
    });
    setPeople(ranked.slice(0,12));
  }

  async function loadPeople(){
    if(!current)return;
    await loadPeopleFor(current);
  }

  async function accept(){
    setStage('people');
    if(!people.length)await loadPeople();
  }

  async function toggleFollow(personId:string){
    if(!current)return;
    setBusy(personId);
    const isFollowing=following.has(personId);
    if(isFollowing){
      await supabase.from('follows').delete().eq('follower_id',current.id).eq('following_id',personId);
    }else{
      await supabase.from('follows').insert({follower_id:current.id,following_id:personId});
    }
    setFollowing(prev=>{
      const next=new Set(prev);
      isFollowing?next.delete(personId):next.add(personId);
      return next;
    });
    setBusy(null);
  }

  if(!open||!current)return null;

  return <div className="fixed inset-0 z-[130] grid place-items-center overflow-y-auto bg-black/75 p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="Conheça geeks no GeekoPlay">
    {stage==='ask'
      ? <section className="w-full max-w-md rounded-3xl border border-orange-500/30 bg-geek-panel p-6 text-center shadow-2xl sm:p-8">
          <button onClick={()=>setOpen(false)} className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-geek-soft" aria-label="Fechar"><X size={19}/></button>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-500/15 text-orange-300"><Users size={30}/></div>
          <p className="mt-5 text-xs font-black uppercase tracking-[.2em] text-geek-orange">Pioneiro GeekoPlay #{current.pioneer_number}</p>
          <h2 className="mt-2 text-2xl font-black">Quer conhecer alguns geeks?</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">Você está entre os primeiros membros da comunidade. Podemos mostrar perfis com interesses, cidade ou eventos em comum para você já encontrar sua galera.</p>
          <div className="mt-6 grid gap-2">
            <button onClick={()=>void accept()} className="rounded-xl bg-geek-orange px-4 py-3 font-black text-white">Sim, quero conhecer</button>
            <button onClick={()=>setOpen(false)} className="rounded-xl border border-geek-line px-4 py-3 text-sm font-bold text-slate-300">Agora não</button>
          </div>
        </section>
      : <section className="w-full max-w-5xl rounded-3xl border border-geek-line bg-geek-panel shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-geek-line p-4 sm:p-5">
            <div><p className="text-xs font-black uppercase tracking-[.2em] text-geek-orange">Encontre sua galera</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Geeks para conhecer</h2><p className="mt-1 text-sm text-slate-400">Novos membros aparecem primeiro; interesses e cidade ajudam a refinar as sugestões.</p></div>
            <button onClick={()=>setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button>
          </div>
          <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-5">
            {people.length===0
              ? <div className="rounded-2xl border border-dashed border-geek-line p-8 text-center text-sm text-slate-500">Ainda não há outros perfis suficientes para sugerir.</div>
              : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{people.map(person=>{
                  const shared=overlap(current.favorite_categories||[],person.favorite_categories||[]);
                  const sameCity=!!current.city&&!!person.city&&current.city.toLowerCase()===person.city.toLowerCase();
                  const isFollowing=following.has(person.id);
                  const isNew=Date.now()-new Date(person.created_at).getTime()<=7*24*60*60*1000;
                  return <article key={person.id} className="rounded-2xl border border-geek-line bg-geek-soft p-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/perfil/${person.id}`} onClick={()=>setOpen(false)} className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">
                        {person.avatar_url?<img src={person.avatar_url} alt="" className="h-full w-full object-cover object-center"/>:<div className="grid h-full place-items-center text-sm font-black text-white">{person.display_name.slice(0,1).toUpperCase()}</div>}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/perfil/${person.id}`} onClick={()=>setOpen(false)} className="block truncate font-black hover:text-orange-300">{person.display_name}</Link>
                        <p className="truncate text-xs text-slate-500">@{person.username||'geek'} · Nível {person.level}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {isNew&&<span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Novo por aqui</span>}
                          {person.pioneer_number&&<span className="inline-flex rounded-full bg-orange-500/10 px-2 py-1 text-[10px] font-bold text-orange-300">Pioneiro #{person.pioneer_number}</span>}
                        </div>
                      </div>
                    </div>
                    {person.bio&&<p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{person.bio}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {shared.slice(0,3).map(item=><span key={item} className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">{item}</span>)}
                      {sameCity&&<span className="inline-flex items-center gap-1 rounded-full bg-geek-panel px-2 py-1 text-[10px] text-slate-300"><MapPin size={10}/>Mesma cidade</span>}
                      {!shared.length&&!sameCity&&person.favorite_categories?.slice(0,2).map(item=><span key={item} className="rounded-full bg-geek-panel px-2 py-1 text-[10px] text-slate-400">{item}</span>)}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link href={`/perfil/${person.id}`} onClick={()=>setOpen(false)} className="rounded-xl border border-geek-line px-3 py-2 text-center text-xs font-bold">Ver perfil</Link>
                      <button onClick={()=>void toggleFollow(person.id)} disabled={busy===person.id} className={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50 ${isFollowing?'border border-geek-line bg-geek-panel text-slate-300':'bg-geek-orange text-white'}`}><UserPlus size={14}/>{isFollowing?'Seguindo':'Seguir'}</button>
                    </div>
                  </article>
                })}</div>}
          </div>
          <div className="flex flex-col gap-2 border-t border-geek-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 text-xs text-slate-500"><Sparkles size={14}/>Você poderá encontrar mais pessoas a qualquer momento em Explorar.</p>
            <Link href="/explorar" onClick={()=>setOpen(false)} className="rounded-xl border border-geek-line px-4 py-2 text-center text-sm font-bold">Ir para Explorar</Link>
          </div>
        </section>}
  </div>;
}
