'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroAuth } from '@/lib/auth-errors';

export default function CadastroPage() {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${location.origin}/auth/callback`
      }
    });

    setLoading(false);

    if (error) {
      setIsError(true);
      setMessage(traduzirErroAuth(error.message));
      return;
    }

    setMessage('Conta criada! Confira seu e-mail para confirmar o cadastro.');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-geek-bg">
      <section className="w-full max-w-md rounded-3xl border border-geek-line bg-geek-panel p-5 sm:p-7">
        <h1 className="text-3xl font-black mb-2"><span className="text-geek-orange">Geeko</span>Play</h1>
        <p className="text-slate-400 mb-6">Crie sua identidade geek.</p>
        <form onSubmit={signup} className="space-y-3">
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none focus:border-geek-orange" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none focus:border-geek-orange" placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none focus:border-geek-orange" placeholder="Senha (mín. 8 caracteres)" type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
          <button disabled={loading} className="w-full rounded-xl bg-geek-orange py-3 font-black disabled:opacity-60">{loading ? 'Criando conta...' : 'Criar conta'}</button>
        </form>
        {message && <p className={`text-sm mt-4 ${isError ? 'text-red-400' : 'text-emerald-400'}`} role="status">{message}</p>}
        <p className="text-sm text-slate-400 mt-6 text-center">Já tem conta? <Link href="/login" className="text-geek-orange font-bold">Entrar</Link></p>
      </section>
    </main>
  );
}
