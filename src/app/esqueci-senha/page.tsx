'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Mail, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroAuth } from '@/lib/auth-errors';

const PUBLIC_APP_URL='https://geekoplay.com';

export default function ForgotPasswordPage(){
  const supabase=useMemo(()=>createClient(),[]);
  const [email,setEmail]=useState('');
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setLoading(true);setMessage('');setError('');
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${PUBLIC_APP_URL}/auth/redefinir-senha`});
    setLoading(false);
    if(error){setError(traduzirErroAuth(error.message));return;}
    setMessage('Se existir uma conta com este e-mail, enviaremos as instruções para redefinir sua senha. Verifique também a caixa de spam.');
  }

  return <main className="min-h-screen flex items-center justify-center bg-geek-bg p-4 sm:p-6">
    <section className="w-full max-w-md rounded-3xl border border-geek-line bg-geek-panel p-5 shadow-2xl sm:p-7">
      <div className="mb-7 flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-geek-orange"><Gamepad2/></div><div><h1 className="text-2xl font-black"><span className="text-geek-orange">Geeko</span>Play</h1><p className="text-sm text-slate-400">Recupere o acesso à sua conta.</p></div></div>
      <div className="mb-5"><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-orange-500/10 text-geek-orange"><Mail size={20}/></div><h2 className="text-xl font-black">Esqueci minha senha</h2><p className="mt-1 text-sm leading-6 text-slate-400">Informe o e-mail cadastrado no GeekoPlay. Você receberá um link para criar uma nova senha.</p></div>
      <form onSubmit={submit} className="space-y-3"><input className="w-full rounded-xl border border-geek-line bg-geek-soft px-4 py-3 outline-none focus:border-geek-orange" placeholder="Seu e-mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/>{error&&<p role="alert" className="text-sm text-red-400">{error}</p>}{message&&<p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-sm leading-5 text-emerald-300">{message}</p>}<button disabled={loading} className="w-full rounded-xl bg-geek-orange py-3 font-black disabled:opacity-60">{loading?'Enviando...':'Enviar link de recuperação'}</button></form>
      <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"><ArrowLeft size={16}/>Voltar para o login</Link>
    </section>
  </main>;
}
