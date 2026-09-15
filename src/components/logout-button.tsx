'use client';

import { useMemo,useState } from 'react';
import { LogOut,Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton(){
 const supabase=useMemo(()=>createClient(),[]);const router=useRouter();const [busy,setBusy]=useState(false);
 async function logout(){setBusy(true);await supabase.auth.signOut();router.replace('/bem-vindo');router.refresh()}
 return <button type="button" onClick={()=>void logout()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/25 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50">{busy?<Loader2 size={16} className="animate-spin"/>:<LogOut size={16}/>}Sair da conta</button>;
}
