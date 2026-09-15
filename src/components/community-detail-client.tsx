'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Share2, Shield, Trophy, UserRound, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Community={id:string;owner_id:string;name:string;slug:string;description:string|null;category:string|null;cover_url:string|null;visibility:string;created_at:string};
type Member={community_id:string;user_id:string;member_role:string;joined_at:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;level:number;xp:number};

export function CommunityDetailClient({communityId}:{communityId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [community,setCommunity]=useState<Community|null>(null);
 const [members,setMembers]=useState<Member[]>([]);
 const [profiles,setProfiles]=useState<Record<string,Profile>>({});
 const [userId,setUserId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');

 async function load(){
  setLoading(true);setMessage('');
  const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
  const {data:c,error}=await supabase.from('communities').select('*').eq('id',communityId).maybeSingle();
  if(error||!c){setCommunity(null);setMembers([]);setProfiles({});setLoading(false);return}
  const row=c as Community;setCommunity(row);
  const {data:m}=await supabase.from('community_members').select('community_id,user_id,member_role,joined_at').eq('community_id',communityId).order('joined_at',{ascending:true});
  const memberRows=(m||[]) as Member[];setMembers(memberRows);
  const ids=[...new Set([row.owner_id,...memberRows.map(x=>x.user_id)])];
  const map:Record<string,Profile>={};
  if(ids.length){const {data:p}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level,xp').in('id',ids);((p||[]) as Profile[]).forEach(profile=>map[profile.id]=profile)}
  setProfiles(map);setLoading(false);
 }

 useEffect(()=>{void load()},[communityId,supabase]);

 const joined=!!userId&&members.some(m=>m.user_id===userId);
 const owner=community?profiles[community.owner_id]:null;
 const ranking=members.map(m=>profiles[m.user_id]).filter(Boolean).sort((a,b)=>b.xp-a.xp||b.level-a.level);

 async function toggleMembership(){
  if(!userId||!community||community.owner_id===userId)return;
  setBusy(true);setMessage('');
  if(joined){const {error}=await supabase.from('community_members').delete().eq('community_id',community.id).eq('user_id',userId);if(error)setMessage('Não foi possível sair da comunidade.');else setMessage('Você saiu da comunidade.')}
  else{const {error}=await supabase.from('community_members').insert({community_id:community.id,user_id:userId,member_role:'member'});if(error)setMessage(community.visibility==='private'?'Esta comunidade é fechada e não aceita entrada direta.':'Não foi possível entrar na comunidade.');else setMessage('Você entrou na comunidade.')}
  await load();setBusy(false);
 }

 async function share(){
  if(!community)return;
  const url=window.location.href;
  if(navigator.share){try{await navigator.share({title:community.name,text:`Conheça a comunidade ${community.name} no GeekoPlay.`,url})}catch{}}
  else{try{await navigator.clipboard.writeText(url);setMessage('Link da comunidade copiado.')}catch{setMessage('Não foi possível copiar o link.')}}
 }

 if(loading)return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-geek-orange"/></div>;
 if(!community)return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-black">Comunidade não encontrada</h1><p className="mt-2 text-sm text-slate-400">Ela pode ter sido removida ou não estar disponível para sua conta.</p><Link href="/comunidades" className="mt-5 inline-flex rounded-xl bg-geek-orange px-4 py-2 font-bold">Voltar para Comunidades</Link></div>;

 return <div className="mx-auto max-w-5xl space-y-5 px-3 pb-10 sm:px-4">
  <div className="flex items-center justify-between gap-3"><Link href="/comunidades" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>Voltar</Link><button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm hover:bg-geek-soft"><Share2 size={16}/>Compartilhar</button></div>

  <section className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel">
   <div className="flex aspect-[16/6] min-h-[180px] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-500/30 via-purple-500/20 to-cyan-500/10">{community.cover_url?<img src={community.cover_url} alt={`Capa de ${community.name}`} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<Users size={64} className="text-orange-300/50"/>}</div>
   <div className="p-5 sm:p-7"><div className="flex flex-col gap-4 md:flex-row md:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black sm:text-3xl">{community.name}</h1><span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300">{community.category||'Geek'}</span><span className="inline-flex items-center gap-1 rounded-full bg-geek-soft px-2.5 py-1 text-xs text-slate-400"><Shield size={12}/>{community.visibility==='public'?'Aberta':'Fechada'}</span></div>{community.description&&<p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-300">{community.description}</p>}<div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span>{members.length} membro{members.length===1?'':'s'}</span><span>Criada em {new Date(community.created_at).toLocaleDateString('pt-BR')}</span></div></div><button onClick={toggleMembership} disabled={busy||community.owner_id===userId} className={`rounded-xl px-5 py-3 text-sm font-black disabled:opacity-60 ${joined||community.owner_id===userId?'border border-geek-line bg-geek-soft text-slate-300':'bg-geek-orange text-white'}`}>{community.owner_id===userId?'Você é o dono':busy?'Aguarde...':joined?'Sair da comunidade':community.visibility==='private'?'Comunidade fechada':'Entrar na comunidade'}</button></div>{message&&<p className="mt-4 rounded-xl border border-geek-line bg-geek-soft px-4 py-3 text-sm text-slate-300">{message}</p>}</div>
  </section>

  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
   <section className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><Users size={18} className="text-geek-orange"/><h2 className="font-black">Membros</h2></div>{ranking.length===0?<p className="text-sm text-slate-500">Nenhum membro encontrado.</p>:<div className="grid gap-2 sm:grid-cols-2">{ranking.map((profile,index)=>{const membership=members.find(m=>m.user_id===profile.id);return <Link key={profile.id} href={`/perfil/${profile.id}`} className="flex items-center gap-3 rounded-xl border border-geek-line bg-geek-soft p-3 hover:border-orange-500/30"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{profile.avatar_url?<img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={18}/>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{profile.display_name}</p>{index<3&&<Trophy size={13} className="shrink-0 text-amber-400"/>}</div><p className="truncate text-xs text-slate-500">@{profile.username||'geek'} · Nível {profile.level} · {profile.xp} XP</p>{membership?.member_role==='owner'&&<p className="mt-1 text-[10px] font-bold uppercase text-orange-300">Dono</p>}</div></Link>})}</div>}</section>

   <aside className="space-y-4"><section className="rounded-2xl border border-geek-line bg-geek-panel p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Criada por</p>{owner?<Link href={`/perfil/${owner.id}`} className="mt-3 flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{owner.avatar_url?<img src={owner.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={18}/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{owner.display_name}</p><p className="truncate text-xs text-slate-500">@{owner.username||'geek'}</p></div></Link>:<p className="mt-3 text-sm text-slate-500">Perfil indisponível.</p>}</section>{ranking.length>0&&<section className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="mb-3 flex items-center gap-2"><Trophy size={16} className="text-amber-400"/><h3 className="font-black">Top membros</h3></div><div className="space-y-2">{ranking.slice(0,5).map((p,index)=><Link href={`/perfil/${p.id}`} key={p.id} className="flex items-center gap-2 rounded-xl bg-geek-soft p-2.5"><span className="w-5 text-center text-xs font-black text-orange-300">{index+1}</span><span className="min-w-0 flex-1 truncate text-sm font-bold">{p.display_name}</span><span className="text-[10px] text-slate-500">{p.xp} XP</span></Link>)}</div></section>}</aside>
  </div>
 </div>;
}
