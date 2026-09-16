'use client';

import { useMemo,useState } from 'react';
import { Loader2, Shield, ShieldOff, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AdminUser={id:string;display_name:string;email:string;role:string;level:number;xp:number;is_pro:boolean;created_at:string};

export function AdminUsersClient({initialUsers}:{initialUsers:AdminUser[]}){
 const supabase=useMemo(()=>createClient(),[]);
 const [users,setUsers]=useState(initialUsers);
 const [busyId,setBusyId]=useState<string|null>(null);
 const [message,setMessage]=useState('');
 const protectedEmails=new Set(['andresantos.deco@gmail.com','andresantos.deco2022@gmail.com','ingressoblu@gmail.com','contato.geekoplay@gmail.com']);

 async function refresh(){
  const {data,error}=await supabase.rpc('admin_list_profiles');
  if(error){setMessage('Não foi possível atualizar a lista de usuários.');return}
  setUsers((data||[]) as AdminUser[]);
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
  if(protectedEmails.has(user.email.toLowerCase())){setMessage('Esta conta administrativa é protegida e não pode ser excluída.');return}
  if(!window.confirm(`Excluir permanentemente a conta de ${user.display_name}? Essa ação não pode ser desfeita.`))return;
  setBusyId(user.id);setMessage('');
  const {error}=await supabase.rpc('admin_delete_user',{target_user:user.id});
  if(error)setMessage(error.message.includes('própria')?'Você não pode excluir sua própria conta administrativa.':'Não foi possível excluir este usuário.');
  else{setMessage('Usuário excluído com sucesso.');await refresh()}
  setBusyId(null);
 }

 function Actions({user}:{user:AdminUser}){
  const busy=busyId===user.id;
  return <div className="flex flex-wrap gap-2">{user.role==='admin'?<button onClick={()=>void setRole(user,'user')} disabled={busy||protectedEmails.has(user.email.toLowerCase())} className="inline-flex items-center gap-1 rounded-lg border border-geek-line px-2.5 py-1.5 text-xs disabled:opacity-40"><ShieldOff size={14}/>Tornar usuário</button>:<button onClick={()=>void setRole(user,'admin')} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1.5 text-xs text-orange-200 disabled:opacity-40"><Shield size={14}/>Promover</button>}<button onClick={()=>void remove(user)} disabled={busy||protectedEmails.has(user.email.toLowerCase())} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300 disabled:opacity-40">{busy?<Loader2 size={14} className="animate-spin"/>:<Trash2 size={14}/>}Excluir</button></div>
 }

 return <div className="space-y-4">
  {message&&<div className="rounded-xl border border-geek-line bg-geek-panel px-4 py-3 text-sm text-slate-300">{message}</div>}
  <div className="grid gap-3 md:hidden">{users.map(user=><div key={user.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate">{user.display_name}</b><p className="break-all text-xs text-slate-400">{user.email}</p></div><span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] uppercase text-orange-300">{user.role}</span></div><div className="my-3 flex flex-wrap gap-4 text-xs text-slate-400"><span>Nível {user.level}</span><span>{user.xp} XP</span><span>{user.is_pro?'Premium':'Grátis'}</span></div><Actions user={user}/></div>)}</div>
  <div className="hidden overflow-x-auto rounded-2xl border border-geek-line bg-geek-panel md:block"><table className="w-full text-sm"><thead className="border-b border-geek-line text-left text-slate-400"><tr><th className="p-4">Nome</th><th className="p-4">E-mail</th><th className="p-4">Função</th><th className="p-4">Nível</th><th className="p-4">XP</th><th className="p-4">Plano</th><th className="p-4">Ações</th></tr></thead><tbody>{users.map(user=><tr key={user.id} className="border-b border-geek-line/60 last:border-0"><td className="p-4 font-medium">{user.display_name}</td><td className="p-4 text-slate-400">{user.email}</td><td className="p-4 text-xs uppercase">{user.role}</td><td className="p-4">{user.level}</td><td className="p-4">{user.xp}</td><td className="p-4">{user.is_pro?'Premium':'Grátis'}</td><td className="p-4"><Actions user={user}/></td></tr>)}</tbody></table></div>
 </div>;
}
