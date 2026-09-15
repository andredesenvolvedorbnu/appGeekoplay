'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function loginEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    location.href = '/';
  }

  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-geek-bg">
      <section className="w-full max-w-md rounded-3xl border border-geek-line bg-geek-panel p-7 shadow-2xl">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-12 w-12 rounded-2xl bg-geek-orange flex items-center justify-center"><Gamepad2 /></div>
          <div><h1 className="text-3xl font-black"><span className="text-geek-orange">Geeko</span>Play</h1><p className="text-sm text-slate-400">A comunidade geek que você merecia.</p></div>
        </div>
        <button onClick={loginGoogle} className="w-full rounded-xl bg-white text-slate-900 py-3 font-bold mb-5">Entrar com Google</button>
        <div className="text-center text-xs text-slate-500 mb-5">ou</div>
        <form onSubmit={loginEmail} className="space-y-3">
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none" placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none" placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="w-full rounded-xl bg-geek-orange py-3 font-black">Entrar</button>
        </form>
        <p className="text-sm text-slate-400 mt-6 text-center">Ainda não tem conta? <Link className="text-geek-orange font-bold" href="/cadastro">Criar conta</Link></p>
      </section>
    </main>
  );
}
