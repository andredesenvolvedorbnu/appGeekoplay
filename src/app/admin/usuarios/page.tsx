import { createClient } from '@/lib/supabase/server';
import { AdminUsersClient } from '@/components/admin-users-client';

type AdminUser={id:string;display_name:string;email:string;role:string;level:number;xp:number;is_pro:boolean;created_at:string};

export default async function AdminUsuariosPage() {
  const supabase=await createClient();
  const {data,error}=await supabase.rpc('admin_list_profiles');
  const users=(data||[]) as AdminUser[];

  return <div className="mx-auto max-w-7xl space-y-5">
    <div><p className="text-sm font-bold text-geek-orange">ADMINISTRAÇÃO</p><h1 className="text-2xl font-black sm:text-3xl">Usuários</h1><p className="mt-2 text-sm text-slate-400">Gerencie as contas cadastradas, permissões administrativas e exclusões. E-mails ficam visíveis somente no painel protegido.</p></div>
    {error?<div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Não foi possível carregar os usuários.</div>:<AdminUsersClient initialUsers={users}/>} 
  </div>;
}
