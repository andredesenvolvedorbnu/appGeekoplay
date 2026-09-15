'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Community={id:string;name:string;cover_url:string|null;category:string|null;description:string|null;created_at:string};
type Member={community_id:string;user_id:string};

export function CommunityCarousel(){
 const supabase=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<Community[]>([]);
 const [counts,setCounts]=useState<Record<string,number>>({});
 const [mine,setMine]=useState<Set<string>>(new Set());
 const [loaded,setLoaded]=useState(false);

 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser();
  const {data}=await supabase.from('communities').select('id,name,cover_url,category,description,created_at').order('created_at',{ascending:false}).limit(16);
  const communities=(data||[]) as Community[];setRows(communities);
  const ids=communities.map(c=>c.id);
  if(ids.length){const {data:m}=await supabase.from('community_members').select('community_id,user_id').in('community_id',ids);const members=(m||[]) as Member[];const nextCounts:Record<string,number>={};const own=new Set<string>();members.forEach(member=>{nextCounts[member.community_id]=(nextCounts[member.community_id]||0)+1;if(user&&member.user_id===user.id)own.add(member.community_id)});setCounts(nextCounts);setMine(own)}
  setLoaded(true);
 })()},[supabase]);

 if(!loaded||!rows.length)return null;
 const ordered=[...rows].sort((a,b)=>Number(mine.has(b.id))-Number(mine.has(a.id))||new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,10);
 const hasMine=ordered.some(c=>mine.has(c.id));

 return <section className="mx-auto mb-4 w-full max-w-2xl px-3 sm:px-4">
  <div className="mb-2 flex items-end justify-between gap-3"><div><h2 className="font-black">{hasMine?'Minhas Comunidades':'Comunidades em destaque'}</h2><p className="text-xs text-slate-500">Encontre seu fandom e participe da conversa.</p></div><Link href="/comunidades" className="text-xs font-bold text-geek-orange">Ver todas</Link></div>
  <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4"><div className="flex min-w-max gap-3">{ordered.map(c=><Link key={c.id} href={`/comunidades/${c.id}`} className="w-44 shrink-0 overflow-hidden rounded-2xl border border-geek-line bg-geek-panel transition hover:border-orange-500/40"><div className="flex aspect-[16/7] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-500/30 via-purple-500/20 to-cyan-500/10">{c.cover_url?<img src={c.cover_url} alt={`Capa de ${c.name}`} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<Users className="text-orange-300/70"/>}</div><div className="p-3"><div className="flex items-start gap-2"><b className="min-w-0 flex-1 truncate text-sm">{c.name}</b>{mine.has(c.id)&&<span className="rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[8px] font-bold text-orange-300">MINHA</span>}</div><p className="mt-1 truncate text-[10px] text-slate-500">{c.category||'Geek'} · {counts[c.id]||0} membro{(counts[c.id]||0)===1?'':'s'}</p></div></Link>)}</div></div>
 </section>;
}
