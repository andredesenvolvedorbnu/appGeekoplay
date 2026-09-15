import { createClient } from '@/lib/supabase/server';

type AdminUser={id:string;display_name:string;email:string;role:string;level:number;xp:number;is_pro:boolean;created_at:string};

export default async function AdminUsuariosPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc('admin_list_profiles');
  const users=(data||[]) as AdminUser[];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div><p className="text-sm font-bold text-geek-orange">ADMINISTRAÇÃO</p><h1 className="text-2xl sm:text-3xl font-black">Usuários</h1><p className="mt-2 text-sm text-slate-400">Contas cadastradas no GeekoPlay. E-mails ficam disponíveis somente para administradores.</p></div>
      <div className="grid gap-3 md:hidden">
        {users.map(user => <div key={user.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="flex items-center justify-between gap-3"><div><b>{user.display_name}</b><p className="text-xs text-slate-400 break-all">{user.email}</p></div><span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300 uppercase">{user.role}</span></div><div className="mt-3 flex gap-4 text-xs text-slate-400"><span>Nível {user.level}</span><span>{user.xp} XP</span><span>{user.is_pro ? 'Premium' : 'Grátis'}</span></div></div>)}
      </div>
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-geek-line bg-geek-panel"><table className="w-full text-sm"><thead className="text-left text-slate-400 border-b border-geek-line"><tr><th className="p-4">Nome</th><th className="p-4">E-mail</th><th className="p-4">Função</th><th className="p-4">Nível</th><th className="p-4">XP</th><th className="p-4">Plano</th></tr></thead><tbody>{users.map(user => <tr key={user.id} className="border-b border-geek-line/60 last:border-0"><td className="p-4 font-medium">{user.display_name}</td><td className="p-4 text-slate-400">{user.email}</td><td className="p-4 uppercase text-xs">{user.role}</td><td className="p-4">{user.level}</td><td className="p-4">{user.xp}</td><td className="p-4">{user.is_pro ? 'Premium' : 'Grátis'}</td></tr>)}</tbody></table></div>
    </div>
  );
}
