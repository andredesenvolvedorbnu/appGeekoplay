'use client';

import { useEffect,useMemo,useState } from 'react';
import { Copy,Gift,Link2,Loader2,Rocket,Search,Shield,ShieldOff,Trash2,Users,X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AdminUser={id:string;display_name:string;email:string;role:string;level:number;xp:number;is_pro:boolean;created_at:string};
type UserPost={id:string;content:string|null;image_url:string|null;post_type:string;card_data:{title?:string}|null;created_at:string;is_boosted:boolean;boosted_until:string|null};
type ReferralSummary={code:string;referral_count:number;xp_earned:number;is_active?:boolean};
type BusyAction='xp'|'referral'|string|null;

const PROTECTED_EMAILS=new Set(['andresantos.deco@gmail.com','andresantos.deco2022@gmail.com','ingressoblu@gmail.com','contato.geekoplay@gmail.com']);

function postTitle(post:UserPost){
 if(post.content?.trim())return post.content.trim();
 if(post.card_data?.title)return `Geek Card: ${post.card_data.title}`;
 if(post.post_type==='event_plan')return 'Publicação de evento';
 return post.image_url?'Publicação com imagem':'Publicação sem texto';
}

function isActiveBoost(post:UserPost){
 return post.is_boosted&&(!post.boosted_until||new Date(post.boosted_until).getTime()>Date.now());
}

function PartnershipDialog({user,onClose,onUserUpdated}:{user:AdminUser;onClose:()=>void;onUserUpdated:(userId:string)=>Promise<void>}){
 const supabase=useMemo(()=>createClient(),[]);
 const [xpAmount,setXpAmount]=useState(100);
 const [posts,setPosts]=useState<UserPost[]>([]);
 const [postDays,setPostDays]=useState<Record<string,number>>({});
 const [loadingPosts,setLoadingPosts]=useState(true);
 const [loadingReferral,setLoadingReferral]=useState(true);
 const [referral,setReferral]=useState<ReferralSummary|null>(null);
 const [busy,setBusy]=useState<BusyAction>(null);
 const [message,setMessage]=useState('');

 useEffect(()=>{
  let active=true;
  async function loadPosts(){
   setLoadingPosts(true);
   const {data,error}=await supabase.from('posts').select('id,content,image_url,post_type,card_data,created_at,is_boosted,boosted_until').eq('author_id',user.id).order('created_at',{ascending:false}).limit(50);
   if(!active)return;
   if(error)setMessage('Não foi possível carregar as publicações deste usuário.');
   else setPosts((data||[]) as UserPost[]);
   setLoadingPosts(false);
  }
  void loadPosts();
  return()=>{active=false};
 },[supabase,user.id]);

 useEffect(()=>{
  let active=true;
  async function loadReferral(){
   setLoadingReferral(true);
   const {data,error}=await supabase.rpc('admin_get_referral_summary',{target_user:user.id});
   if(!active)return;
   if(!error){
    const row=((data||[]) as ReferralSummary[])[0]||null;
    setReferral(row);
   }
   setLoadingReferral(false);
  }
  void loadReferral();
  return()=>{active=false};
 },[supabase,user.id]);

 async function grantXp(){
  const amount=Math.max(1,Math.min(100000,Math.trunc(Number(xpAmount)||0)));
  if(!window.confirm(`Adicionar ${amount.toLocaleString('pt-BR')} XP para ${user.display_name}?`))return;
  setBusy('xp');setMessage('');
  const {data,error}=await supabase.rpc('admin_grant_xp',{target_user:user.id,xp_amount:amount});
  if(error)setMessage('Não foi possível conceder o XP. Confira o valor e tente novamente.');
  else{
   const result=(data as {new_xp:number;new_level:number}[]|null)?.[0];
   setMessage(result?`${amount.toLocaleString('pt-BR')} XP adicionados. Agora ${user.display_name} está no nível ${result.new_level}, com ${result.new_xp.toLocaleString('pt-BR')} XP.`:'XP adicionado com sucesso.');
   await onUserUpdated(user.id);
  }
  setBusy(null);
 }

 async function generateReferral(){
  setBusy('referral');setMessage('');
  const {data,error}=await supabase.rpc('admin_generate_referral_link',{target_user:user.id});
  if(error){
   setMessage('Não foi possível gerar o link de indicação.');
  }else{
   const row=((data||[]) as ReferralSummary[])[0]||null;
   setReferral(row);
   if(row?.code){
    const link=`https://geekoplay.com/convite/${row.code}`;
    try{await navigator.clipboard.writeText(link);setMessage('Link de indicação gerado e copiado. Cada novo cadastro válido rende +2 XP.');}
    catch{setMessage('Link de indicação gerado. Cada novo cadastro válido rende +2 XP.');}
   }
  }
  setBusy(null);
 }

 async function copyReferral(){
  if(!referral?.code)return;
  const link=`https://geekoplay.com/convite/${referral.code}`;
  try{await navigator.clipboard.writeText(link);setMessage('Link de indicação copiado.');}
  catch{setMessage(`Copie o link: ${link}`);}
 }

 async function promotePost(post:UserPost){
  const days=Math.max(1,Math.min(365,Math.trunc(Number(postDays[post.id]||7))));
  if(!window.confirm(`Promover esta publicação de ${user.display_name} por ${days} ${days===1?'dia':'dias'}?`))return;
  setBusy(post.id);setMessage('');
  const {data,error}=await supabase.rpc('admin_promote_post',{target_post:post.id,boost_days:days});
  if(error)setMessage('Não foi possível promover esta publicação.');
  else{
   const result=(data as {post_id:string;active_until:string}[]|null)?.[0];
   setPosts(current=>current.map(item=>item.id===post.id?{...item,is_boosted:true,boosted_until:result?.active_until||item.boosted_until}:item));
   setMessage(`Publicação promovida por ${days} ${days===1?'dia':'dias'}. Nenhuma cobrança ou receita foi criada.`);
  }
  setBusy(null);
 }

 return <div className="fixed inset-0 z-[170] overflow-y-auto bg-black/80 p-3" role="dialog" aria-modal="true" aria-label={`XP e parceria de ${user.display_name}`}>
  <div className="mx-auto my-4 w-full max-w-4xl rounded-3xl border border-geek-line bg-geek-panel p-4 shadow-2xl sm:my-8 sm:p-6">
   <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-geek-orange">Parceria e influenciadores</p><h2 className="mt-1 text-xl font-black sm:text-2xl">{user.display_name}</h2><p className="mt-1 text-sm text-slate-400">Nível {user.level} · {user.xp.toLocaleString('pt-BR')} XP</p></div><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button></div>
   {message&&<div className="mt-4 rounded-xl border border-geek-line bg-geek-soft px-4 py-3 text-sm text-slate-300">{message}</div>}

   <section className="mt-5 rounded-2xl border border-geek-line bg-geek-bg p-4 sm:p-5">
    <div className="flex items-center gap-2"><Link2 className="text-geek-orange" size={20}/><div><h3 className="font-black">Link de indicação</h3><p className="text-xs text-slate-500">O usuário recebe +2 XP por cada pessoa que entrar por este link e concluir um novo cadastro válido.</p></div></div>
    {loadingReferral?<div className="mt-4 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="animate-spin" size={16}/>Carregando indicação...</div>:referral?.code?<div className="mt-4 space-y-3"><div className="flex flex-col gap-2 sm:flex-row"><div className="min-w-0 flex-1 rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-sm text-slate-200 break-all">https://geekoplay.com/convite/{referral.code}</div><button onClick={()=>void copyReferral()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-geek-line px-4 py-2.5 text-sm font-bold"><Copy size={16}/>Copiar</button></div><div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-geek-line bg-geek-soft p-3"><p className="text-xs text-slate-500">Cadastros válidos</p><p className="mt-1 text-xl font-black">{Number(referral.referral_count||0).toLocaleString('pt-BR')}</p></div><div className="rounded-xl border border-geek-line bg-geek-soft p-3"><p className="text-xs text-slate-500">XP gerado por indicação</p><p className="mt-1 text-xl font-black text-geek-orange">+{Number(referral.xp_earned||0).toLocaleString('pt-BR')} XP</p></div></div><button onClick={()=>void generateReferral()} disabled={busy!==null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-sm font-black text-orange-300 disabled:opacity-50">{busy==='referral'?<Loader2 className="animate-spin" size={16}/>:<Link2 size={16}/>}Reativar / confirmar link</button></div>:<button onClick={()=>void generateReferral()} disabled={busy!==null} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-black text-white disabled:opacity-50">{busy==='referral'?<Loader2 className="animate-spin" size={17}/>:<Users size={17}/>}Gerar link de indicação</button>}
   </section>

   <section className="mt-5 rounded-2xl border border-geek-line bg-geek-bg p-4 sm:p-5">
    <div className="flex items-center gap-2"><Gift className="text-geek-orange" size={20}/><div><h3 className="font-black">Conceder XP promocional</h3><p className="text-xs text-slate-500">O valor será somado ao XP atual. O crescimento normal do usuário continua funcionando.</p></div></div>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="grid flex-1 gap-1 text-sm"><b>Quantidade de XP</b><input type="number" min="1" max="100000" step="1" value={xpAmount} onChange={event=>setXpAmount(Number(event.target.value))} className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5"/></label><button onClick={()=>void grantXp()} disabled={busy!==null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-black disabled:opacity-50">{busy==='xp'?<Loader2 className="animate-spin" size={17}/>:<Gift size={17}/>}Adicionar XP</button></div>
   </section>

   <section className="mt-5 rounded-2xl border border-geek-line bg-geek-bg p-4 sm:p-5">
    <div className="flex items-center gap-2"><Rocket className="text-geek-orange" size={20}/><div><h3 className="font-black">Promover publicação como cortesia</h3><p className="text-xs text-slate-500">Escolha uma publicação combinada e o período de destaque. Isso não gera cobrança nem entra na receita.</p></div></div>
    {loadingPosts?<div className="grid place-items-center py-12 text-slate-400"><Loader2 className="animate-spin"/></div>:posts.length===0?<p className="py-10 text-center text-sm text-slate-500">Este usuário ainda não possui publicações.</p>:<div className="mt-4 grid gap-3">{posts.map(post=>{const active=isActiveBoost(post);const days=postDays[post.id]||7;return <article key={post.id} className="rounded-xl border border-geek-line bg-geek-soft p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-slate-200">{postTitle(post)}</p><p className="mt-1 text-xs text-slate-500">{new Date(post.created_at).toLocaleString('pt-BR')} · {post.post_type==='card'?'Geek Card':'Publicação'}</p>{active&&<span className="mt-2 inline-flex rounded-full bg-orange-500/10 px-2 py-1 text-[10px] font-bold text-orange-300">Impulsionada{post.boosted_until?` até ${new Date(post.boosted_until).toLocaleString('pt-BR')}`:''}</span>}</div><div className="flex flex-col gap-2 sm:w-48"><label className="grid gap-1 text-xs text-slate-400">Dias de destaque<input type="number" min="1" max="365" step="1" value={days} onChange={event=>setPostDays(current=>({...current,[post.id]:Math.max(1,Math.min(365,Number(event.target.value)||1))}))} className="rounded-xl border border-geek-line bg-geek-panel px-3 py-2 text-sm text-white"/></label><button onClick={()=>void promotePost(post)} disabled={busy!==null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-300 disabled:opacity-50">{busy===post.id?<Loader2 className="animate-spin" size={15}/>:<Rocket size={15}/>}Promover publicação</button></div></div></article>})}</div>}
   </section>
  </div>
 </div>;
}

function UserActions({user,busy,onSetRole,onRemove,onPartnership}:{user:AdminUser;busy:boolean;onSetRole:(user:AdminUser,role:'user'|'admin')=>void;onRemove:(user:AdminUser)=>void;onPartnership:(user:AdminUser)=>void}){
 const protectedAccount=PROTECTED_EMAILS.has(user.email.toLowerCase());
 return <div className="flex flex-wrap gap-2"><button onClick={()=>onPartnership(user)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-200 disabled:opacity-40"><Gift size={14}/>XP e parceria</button>{user.role==='admin'?<button onClick={()=>onSetRole(user,'user')} disabled={busy||protectedAccount} className="inline-flex items-center gap-1 rounded-lg border border-geek-line px-2.5 py-1.5 text-xs disabled:opacity-40"><ShieldOff size={14}/>Tornar usuário</button>:<button onClick={()=>onSetRole(user,'admin')} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1.5 text-xs text-orange-200 disabled:opacity-40"><Shield size={14}/>Tornar ADM</button>}<button onClick={()=>onRemove(user)} disabled={busy||protectedAccount} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300 disabled:opacity-40">{busy?<Loader2 size={14} className="animate-spin"/>:<Trash2 size={14}/>}Excluir</button></div>;
}

export function AdminUsersClient({initialUsers}:{initialUsers:AdminUser[]}){
 const supabase=useMemo(()=>createClient(),[]);
 const [users,setUsers]=useState(initialUsers);
 const [busyId,setBusyId]=useState<string|null>(null);
 const [message,setMessage]=useState('');
 const [search,setSearch]=useState('');
 const [partnerUser,setPartnerUser]=useState<AdminUser|null>(null);
 const filteredUsers=users.filter(user=>`${user.display_name} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase()));

 async function refresh(){
  const {data,error}=await supabase.rpc('admin_list_profiles');
  if(error){setMessage('Não foi possível atualizar a lista de usuários.');return users}
  const next=(data||[]) as AdminUser[];
  setUsers(next);
  return next;
 }

 async function refreshPartner(userId:string){
  const next=await refresh();
  const updated=next.find(user=>user.id===userId);
  if(updated)setPartnerUser(updated);
 }

 async function setRole(user:AdminUser,role:'user'|'admin'){
  const action=role==='admin'?'promover este usuário a administrador':'remover o acesso administrativo deste usuário';
  if(!window.confirm(`Deseja ${action}?`))return;
  setBusyId(user.id);setMessage('');
  const {error}=await supabase.rpc('admin_set_user_role',{target_user:user.id,new_role:role});
  if(error)setMessage(error.message.includes('próprio')?'Você não pode remover seu próprio acesso administrativo.':'Não foi possível alterar a função deste usuário.');
  else{setMessage(role==='admin'?'Usuário promovido a administrador.':'Usuário alterado para conta comum.');await refresh()}
  setBusyId(null);
 }

 async function remove(user:AdminUser){
  if(PROTECTED_EMAILS.has(user.email.toLowerCase())){setMessage('Esta conta administrativa é protegida e não pode ser excluída.');return}
  if(!window.confirm(`Excluir permanentemente a conta de ${user.display_name}? Essa ação não pode ser desfeita.`))return;
  setBusyId(user.id);setMessage('');
  const {error}=await supabase.rpc('admin_delete_user',{target_user:user.id});
  if(error)setMessage(error.message.includes('própria')?'Você não pode excluir sua própria conta administrativa.':'Não foi possível excluir este usuário.');
  else{setMessage('Usuário excluído com sucesso.');await refresh()}
  setBusyId(null);
 }

 return <div className="space-y-4">
  {message&&<div className="rounded-xl border border-geek-line bg-geek-panel px-4 py-3 text-sm text-slate-300">{message}</div>}
  <label className="flex items-center gap-2 rounded-xl border border-geek-line bg-geek-panel px-3 py-2.5 text-slate-400"><Search size={17}/><span className="sr-only">Buscar usuário</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"/></label>
  <div className="grid gap-3 md:hidden">{filteredUsers.map(user=><div key={user.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate">{user.display_name}</b><p className="break-all text-xs text-slate-400">{user.email}</p></div><span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] uppercase text-orange-300">{user.role}</span></div><div className="my-3 flex flex-wrap gap-4 text-xs text-slate-400"><span>Nível {user.level}</span><span>{user.xp.toLocaleString('pt-BR')} XP</span><span>{user.is_pro?'Premium':'Grátis'}</span></div><UserActions user={user} busy={busyId===user.id} onSetRole={(target,role)=>void setRole(target,role)} onRemove={target=>void remove(target)} onPartnership={setPartnerUser}/></div>)}</div>
  <div className="hidden overflow-x-auto rounded-2xl border border-geek-line bg-geek-panel md:block"><table className="w-full text-sm"><thead className="border-b border-geek-line text-left text-slate-400"><tr><th className="p-4">Nome</th><th className="p-4">E-mail</th><th className="p-4">Função</th><th className="p-4">Nível</th><th className="p-4">XP</th><th className="p-4">Plano</th><th className="p-4">Ações</th></tr></thead><tbody>{filteredUsers.map(user=><tr key={user.id} className="border-b border-geek-line/60 last:border-0"><td className="p-4 font-medium">{user.display_name}</td><td className="p-4 text-slate-400">{user.email}</td><td className="p-4 text-xs uppercase">{user.role}</td><td className="p-4">{user.level}</td><td className="p-4">{user.xp.toLocaleString('pt-BR')}</td><td className="p-4">{user.is_pro?'Premium':'Grátis'}</td><td className="p-4"><UserActions user={user} busy={busyId===user.id} onSetRole={(target,role)=>void setRole(target,role)} onRemove={target=>void remove(target)} onPartnership={setPartnerUser}/></td></tr>)}</tbody></table></div>
  {filteredUsers.length===0&&<div className="rounded-2xl border border-dashed border-geek-line p-8 text-center text-sm text-slate-500">Nenhum usuário encontrado.</div>}
  {partnerUser&&<PartnershipDialog key={partnerUser.id} user={partnerUser} onClose={()=>setPartnerUser(null)} onUserUpdated={refreshPartner}/>}
 </div>;
}
