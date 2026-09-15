'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function CadastroPage() {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${location.origin}/auth/callback`
      }
    });
    setMessage(error ? error.message : 'Conta criada. Confira seu e-mail para confirmar o cadastro.');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-geek-bg">
      <section className="w-full max-w-md rounded-3xl border border-geek-line bg-geek-panel p-7">
        <h1 className="text-3xl font-black mb-2"><span className="text-geek-orange">Geeko</span>Play</h1>
        <p className="text-slate-400 mb-6">Crie sua identidade geek.</p>
        <form onSubmit={signup} className="space-y-3">
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required />
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3" placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3" placeholder="Senha (mín. 8 caracteres)" type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="w-full rounded-xl bg-geek-orange py-3 font-black">Criar conta</button>
        </form>
        {message && <p className="text-sm text-slate-300 mt-4">{message}</p>}
        <p className="text-sm text-slate-400 mt-6 text-center">Já tem conta? <Link href="/login" className="text-geek-orange font-bold">Entrar</Link></p>
      </section>
    </main>
  );
}
