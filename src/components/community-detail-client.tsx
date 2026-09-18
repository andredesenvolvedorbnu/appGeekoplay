'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ArrowLeft, Check, Clock3, Loader2, MessageSquareText, Send, Share2, Shield, Trash2, Trophy, UserRound, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Community={id:string;owner_id:string;name:string;slug:string;description:string|null;category:string|null;cover_url:string|null;visibility:string;created_at:string};
type Member={community_id:string;user_id:string;member_role:string;joined_at:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;level:number;xp:number};
type JoinRequest={id:string;community_id:string;user_id:string;status:string;created_at:string};
type CommunityPost={id:string;community_id:string;author_id:string;body:string;created_at:string};

export function CommunityDetailClient({communityId}:{communityId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [community,setCommunity]=useState<Community|null>(null);
 const [members,setMembers]=useState<Member[]>([]);
 const [profiles,setProfiles]=useState<Record<string,Profile>>({});
 const [requests,setRequests]=useState<JoinRequest[]>([]);
 const [myRequest,setMyRequest]=useState<JoinRequest|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [wallPosts,setWallPosts]=useState<CommunityPost[]>([]);
 const [wallDraft,setWallDraft]=useState('');
 const [wallBusy,setWallBusy]=useState(false);

 async function load(){
  setLoading(true);
  const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
  const {data:c,error}=await supabase.from('communities').select('*').eq('id',communityId).maybeSingle();
  if(error||!c){setCommunity(null);setMembers([]);setProfiles({});setRequests([]);setMyRequest(null);setLoading(false);return}
  const row=c as Community;setCommunity(row);
  const {data:m}=await supabase.from('community_members').select('community_id,user_id,member_role,joined_at').eq('community_id',communityId).order('joined_at',{ascending:true});
  const memberRows=(m||[]) as Member[];setMembers(memberRows);

  let requestRows:JoinRequest[]=[];
  if(user){const {data:r}=await supabase.from('community_join_requests').select('id,community_id,user_id,status,created_at').eq('community_id',communityId).order('created_at',{ascending:true});requestRows=(r||[]) as JoinRequest[]}
  setRequests(requestRows.filter(r=>r.status==='pending'));
  setMyRequest(user?requestRows.find(r=>r.user_id===user.id&&r.status==='pending')||null:null);

  const {data:wallRows}=await supabase.from('community_posts').select('id,community_id,author_id,body,created_at').eq('community_id',communityId).order('created_at',{ascending:false}).limit(100);
  const safeWall=(wallRows||[]) as CommunityPost[];setWallPosts(safeWall);

  const ids=[...new Set([row.owner_id,...memberRows.map(x=>x.user_id),...requestRows.map(x=>x.user_id),...safeWall.map(x=>x.author_id)])];
  const map:Record<string,Profile>={};
  if(ids.length){const {data:p}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level,xp').in('id',ids);((p||[]) as Profile[]).forEach(profile=>map[profile.id]=profile)}
  setProfiles(map);setLoading(false);
 }

 useEffect(()=>{void load();const channel=supabase.channel(`community-detail-${communityId}`).on('postgres_changes',{event:'*',schema:'public',table:'community_members',filter:`community_id=eq.${communityId}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'community_join_requests',filter:`community_id=eq.${communityId}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'community_posts',filter:`community_id=eq.${communityId}`},()=>void load()).subscribe();return()=>{void supabase.removeChannel(channel)}},[communityId,supabase]);

 const joined=!!userId&&members.some(m=>m.user_id===userId);
 const isOwner=!!community&&community.owner_id===userId;
 const owner=community?profiles[community.owner_id]:null;
 const ranking=members.map(m=>profiles[m.user_id]).filter(Boolean).sort((a,b)=>b.xp-a.xp||b.level-a.level);

 async function toggleMembership(){
  if(!userId||!community||isOwner)return;
  setBusy(true);setMessage('');
  if(joined){const {error}=await supabase.from('community_members').delete().eq('community_id',community.id).eq('user_id',userId);setMessage(error?'Não foi possível sair da comunidade.':'Você saiu da comunidade.')}
  else if(community.visibility==='private'){
   if(myRequest){const {error}=await supabase.from('community_join_requests').delete().eq('id',myRequest.id);setMessage(error?'Não foi possível cancelar a solicitação.':'Solicitação cancelada.')}
   else{const {error}=await supabase.from('community_join_requests').upsert({community_id:community.id,user_id:userId,status:'pending'},{onConflict:'community_id,user_id'});setMessage(error?'Não foi possível enviar sua solicitação.':'Solicitação enviada ao dono da comunidade.')}
  }else{const {error}=await supabase.from('community_members').insert({community_id:community.id,user_id:userId,member_role:'member'});setMessage(error?'Não foi possível entrar na comunidade.':'Você entrou na comunidade.')}
  await load();setBusy(false);
 }

 async function reviewRequest(request:JoinRequest,approve:boolean){
  if(!userId||!community||!isOwner)return;setBusy(true);setMessage('');
  if(approve){const {error:addError}=await supabase.from('community_members').insert({community_id:community.id,user_id:request.user_id,member_role:'member'});if(addError){setMessage('Não foi possível adicionar este membro.');setBusy(false);return}}
  const {error}=await supabase.from('community_join_requests').update({status:approve?'approved':'rejected',reviewed_at:new Date().toISOString(),reviewed_by:userId}).eq('id',request.id);
  setMessage(error?'Não foi possível concluir esta solicitação.':approve?'Membro aprovado e adicionado à comunidade.':'Solicitação recusada.');await load();setBusy(false);
 }

 async function share(){if(!community)return;const url=window.location.href;if(navigator.share){try{await navigator.share({title:community.name,text:`Conheça a comunidade ${community.name} no GeekoPlay.`,url})}catch{}}else{try{await navigator.clipboard.writeText(url);setMessage('Link da comunidade copiado.')}catch{setMessage('Não foi possível copiar o link.')}}}
 async function publishWallPost(){if(!userId||!community||!wallDraft.trim())return;setWallBusy(true);setMessage('');const {error}=await supabase.from('community_posts').insert({community_id:community.id,author_id:userId,body:wallDraft.trim()});if(error)setMessage('Não foi possível publicar no mural. Entre na comunidade para participar.');else{setWallDraft('');setMessage('Publicado no mural da comunidade.')}await load();setWallBusy(false)}
 async function deleteWallPost(post:CommunityPost){if(!userId)return;const {error}=await supabase.from('community_posts').delete().eq('id',post.id);setMessage(error?'Não foi possível excluir esta publicação.':'Publicação removida do mural.');if(!error)await load()}

 if(loading)return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-geek-orange"/></div>;
 if(!community)return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-black">Comunidade não encontrada</h1><p className="mt-2 text-sm text-slate-400">Ela pode ter sido removida ou não estar disponível para sua conta.</p><Link href="/comunidades" className="mt-5 inline-flex rounded-xl bg-geek-orange px-4 py-2 font-bold">Voltar para Comunidades</Link></div>;

 const actionText=isOwner?'Você é o dono':busy?'Aguarde...':joined?'Sair da comunidade':community.visibility==='private'?(myRequest?'Cancelar solicitação':'Solicitar entrada'):'Entrar na comunidade';
 return <div className="mx-auto max-w-5xl space-y-5 px-3 pb-10 sm:px-4">
  <div className="flex items-center justify-between gap-3"><Link href="/comunidades" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>Voltar</Link><button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm hover:bg-geek-soft"><Share2 size={16}/>Compartilhar</button></div>

  <section className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel"><div className="flex aspect-[16/6] min-h-[180px] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-500/30 via-purple-500/20 to-cyan-500/10">{community.cover_url?<img src={community.cover_url} alt={`Capa de ${community.name}`} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<Users size={64} className="text-orange-300/50"/>}</div><div className="p-5 sm:p-7"><div className="flex flex-col gap-4 md:flex-row md:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black sm:text-3xl">{community.name}</h1><span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300">{community.category||'Geek'}</span><span className="inline-flex items-center gap-1 rounded-full bg-geek-soft px-2.5 py-1 text-xs text-slate-400"><Shield size={12}/>{community.visibility==='public'?'Aberta':'Fechada'}</span></div>{community.description&&<p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-300">{community.description}</p>}<div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span>{members.length} membro{members.length===1?'':'s'}</span><span>Criada em {new Date(community.created_at).toLocaleDateString('pt-BR')}</span></div></div><button onClick={toggleMembership} disabled={busy||isOwner} className={`rounded-xl px-5 py-3 text-sm font-black disabled:opacity-60 ${joined||isOwner||myRequest?'border border-geek-line bg-geek-soft text-slate-300':'bg-geek-orange text-white'}`}>{myRequest&&!joined&&!isOwner&&<Clock3 size={15} className="mr-2 inline"/>}{actionText}</button></div>{message&&<p className="mt-4 rounded-xl border border-geek-line bg-geek-soft px-4 py-3 text-sm text-slate-300">{message}</p>}</div></section>

  {isOwner&&requests.length>0&&<section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><Clock3 size={18} className="text-amber-300"/><h2 className="font-black">Solicitações de entrada</h2><span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">{requests.length}</span></div><div className="grid gap-2">{requests.map(request=>{const p=profiles[request.user_id];return <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-geek-line bg-geek-panel p-3 sm:flex-row sm:items-center"><Link href={`/perfil/${request.user_id}`} className="flex min-w-0 flex-1 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{p?.avatar_url?<img src={p.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={17}/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{p?.display_name||'Usuário'}</p><p className="truncate text-xs text-slate-500">@{p?.username||'geek'} · {new Date(request.created_at).toLocaleDateString('pt-BR')}</p></div></Link><div className="flex gap-2"><button onClick={()=>reviewRequest(request,true)} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300"><Check size={15}/>Aprovar</button><button onClick={()=>reviewRequest(request,false)} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300"><X size={15}/>Recusar</button></div></div>})}</div></section>}

  <section className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><MessageSquareText size={18} className="text-geek-orange"/><h2 className="font-black">Mural da comunidade</h2></div>{(joined||isOwner)&&<div className="mb-4 rounded-xl border border-geek-line bg-geek-soft p-3"><textarea value={wallDraft} onChange={e=>setWallDraft(e.target.value)} maxLength={2000} placeholder="Escreva algo para a comunidade..." className="min-h-24 w-full resize-none bg-transparent text-sm outline-none"/><div className="mt-2 flex justify-end"><button onClick={()=>void publishWallPost()} disabled={wallBusy||!wallDraft.trim()} className="inline-flex items-center gap-2 rounded-xl bg-geek-orange px-4 py-2 text-sm font-black disabled:opacity-50">{wallBusy?<Loader2 size={16} className="animate-spin"/>:<Send size={16}/>}Publicar</button></div></div>}{wallPosts.length===0?<p className="text-sm text-slate-500">Ainda não há publicações no mural.</p>:<div className="space-y-3">{wallPosts.map(post=>{const author=profiles[post.author_id];const canDelete=post.author_id===userId||isOwner;return <article key={post.id} className="rounded-xl border border-geek-line bg-geek-soft p-3"><div className="flex items-start gap-3"><Link href={`/perfil/${post.author_id}`} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{author?.avatar_url?<img src={author.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={17}/>}</Link><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Link href={`/perfil/${post.author_id}`} className="truncate text-sm font-bold hover:text-orange-300">{author?.display_name||'Usuário'}</Link><span className="text-[10px] text-slate-500">{new Date(post.created_at).toLocaleString('pt-BR')}</span>{canDelete&&<button onClick={()=>void deleteWallPost(post)} className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Excluir publicação"><Trash2 size={14}/></button>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{post.body}</p></div></div></article>})}</div>}</section>

  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><Users size={18} className="text-geek-orange"/><h2 className="font-black">Membros</h2></div>{ranking.length===0?<p className="text-sm text-slate-500">Nenhum membro encontrado.</p>:<div className="grid gap-2 sm:grid-cols-2">{ranking.map((profile,index)=>{const membership=members.find(m=>m.user_id===profile.id);return <Link key={profile.id} href={`/perfil/${profile.id}`} className="flex items-center gap-3 rounded-xl border border-geek-line bg-geek-soft p-3 hover:border-orange-500/30"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{profile.avatar_url?<img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={18}/>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{profile.display_name}</p>{index<3&&<Trophy size={13} className="shrink-0 text-amber-400"/>}</div><p className="truncate text-xs text-slate-500">@{profile.username||'geek'} · Nível {profile.level} · {profile.xp} XP</p>{membership?.member_role==='owner'&&<p className="mt-1 text-[10px] font-bold uppercase text-orange-300">Dono</p>}</div></Link>})}</div>}</section><aside className="space-y-4"><section className="rounded-2xl border border-geek-line bg-geek-panel p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Criada por</p>{owner?<Link href={`/perfil/${owner.id}`} className="mt-3 flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{owner.avatar_url?<img src={owner.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={18}/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{owner.display_name}</p><p className="truncate text-xs text-slate-500">@{owner.username||'geek'}</p></div></Link>:<p className="mt-3 text-sm text-slate-500">Perfil indisponível.</p>}</section>{ranking.length>0&&<section className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="mb-3 flex items-center gap-2"><Trophy size={16} className="text-amber-400"/><h3 className="font-black">Top membros</h3></div><div className="space-y-2">{ranking.slice(0,5).map((p,index)=><Link href={`/perfil/${p.id}`} key={p.id} className="flex items-center gap-2 rounded-xl bg-geek-soft p-2.5"><span className="w-5 text-center text-xs font-black text-orange-300">{index+1}</span><span className="min-w-0 flex-1 truncate text-sm font-bold">{p.display_name}</span><span className="text-[10px] text-slate-500">{p.xp} XP</span></Link>)}</div></section>}</aside></div>
 </div>;
}
