'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroAuth } from '@/lib/auth-errors';

export default function ResetPasswordPage(){
  const supabase=useMemo(()=>createClient(),[]);
  const [ready,setReady]=useState(false);
  const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState(false);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      const {data}=await supabase.auth.getSession();
      if(mounted)setReady(Boolean(data.session));
    })();
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!mounted)return;
      if(event==='PASSWORD_RECOVERY'||session)setReady(Boolean(session));
    });
    return()=>{mounted=false;subscription.unsubscribe()};
  },[supabase]);

  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');
    if(password.length<8){setError('Sua nova senha precisa ter pelo menos 8 caracteres.');return;}
    if(password!==confirmPassword){setError('As senhas não são iguais.');return;}
    setLoading(true);
    const {error}=await supabase.auth.updateUser({password});
    setLoading(false);
    if(error){setError(traduzirErroAuth(error.message));return;}
    setSuccess(true);
  }

  return <main className="min-h-screen flex items-center justify-center bg-geek-bg p-4 sm:p-6">
    <section className="w-full max-w-md rounded-3xl border border-geek-line bg-geek-panel p-5 shadow-2xl sm:p-7">
      <div className="mb-7 flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-geek-orange"><Gamepad2/></div><div><h1 className="text-2xl font-black"><span className="text-geek-orange">Geeko</span>Play</h1><p className="text-sm text-slate-400">Segurança da sua conta.</p></div></div>
      {success?<div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300"><KeyRound size={25}/></div><h2 className="mt-4 text-xl font-black">Senha alterada com sucesso</h2><p className="mt-2 text-sm leading-6 text-slate-400">Sua nova senha já está ativa. Você pode entrar normalmente no GeekoPlay.</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-geek-orange px-5 py-3 font-black">Ir para o login</Link></div>:ready?<><div className="mb-5"><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-orange-500/10 text-geek-orange"><KeyRound size={20}/></div><h2 className="text-xl font-black">Crie uma nova senha</h2><p className="mt-1 text-sm leading-6 text-slate-400">Use pelo menos 8 caracteres e evite reutilizar senhas de outros serviços.</p></div><form onSubmit={submit} className="space-y-3"><input className="w-full rounded-xl border border-geek-line bg-geek-soft px-4 py-3 outline-none focus:border-geek-orange" placeholder="Nova senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password"/><input className="w-full rounded-xl border border-geek-line bg-geek-soft px-4 py-3 outline-none focus:border-geek-orange" placeholder="Repita a nova senha" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required autoComplete="new-password"/>{error&&<p role="alert" className="text-sm text-red-400">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-geek-orange py-3 font-black disabled:opacity-60">{loading?'Salvando...':'Salvar nova senha'}</button></form></>:<div className="text-center"><h2 className="text-xl font-black">Link de recuperação inválido ou expirado</h2><p className="mt-2 text-sm leading-6 text-slate-400">Solicite um novo link de recuperação para continuar.</p><Link href="/esqueci-senha" className="mt-5 inline-flex rounded-xl bg-geek-orange px-5 py-3 font-black">Solicitar novo link</Link></div>}
    </section>
  </main>;
}
