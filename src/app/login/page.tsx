'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { traduzirErroAuth } from '@/lib/auth-errors';

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error_description') || params.get('error');
    if (!oauthError) return;

    const decoded = decodeURIComponent(oauthError.replace(/\+/g, ' '));
    const lower = decoded.toLowerCase();

    if (lower.includes('unable to exchange external code') || lower.includes('server_error') || lower.includes('unexpected_failure')) {
      setError('Não foi possível concluir o acesso com o Google. Verifique a configuração do Google e tente novamente.');
    } else if (lower.includes('access_denied')) {
      setError('O acesso com o Google foi cancelado.');
    } else {
      setError(traduzirErroAuth(decoded));
    }

    window.history.replaceState({}, '', '/login');
  }, []);

  async function redirectByRole(userId: string) {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    location.href = data?.role === 'admin' ? '/admin' : '/';
  }

  async function loginEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return setError(traduzirErroAuth(error.message));
    }
    if (!data.user) {
      setLoading(false);
      return setError('Não foi possível identificar sua conta. Tente novamente.');
    }
    await redirectByRole(data.user.id);
  }

  async function loginGoogle() {
    setError('');
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`
      }
    });
    if (error) {
      setGoogleLoading(false);
      setError(traduzirErroAuth(error.message));
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-geek-bg">
      <section className="w-full max-w-md rounded-3xl border border-geek-line bg-geek-panel p-5 sm:p-7 shadow-2xl">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-12 w-12 rounded-2xl bg-geek-orange flex items-center justify-center shrink-0"><Gamepad2 /></div>
          <div><h1 className="text-3xl font-black"><span className="text-geek-orange">Geeko</span>Play</h1><p className="text-sm text-slate-400">A comunidade geek que você merecia.</p></div>
        </div>

        <button onClick={loginGoogle} disabled={googleLoading} className="w-full rounded-xl bg-white text-slate-900 py-3 font-bold mb-5 disabled:opacity-60">
          {googleLoading ? 'Conectando ao Google...' : 'Entrar com Google'}
        </button>
        <div className="text-center text-xs text-slate-500 mb-5">ou entre com seu e-mail</div>

        <form onSubmit={loginEmail} className="space-y-3">
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none focus:border-geek-orange" placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none focus:border-geek-orange" placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          <div className="text-right"><Link href="/esqueci-senha" className="text-xs font-semibold text-geek-orange hover:underline">Esqueci minha senha</Link></div>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-geek-orange py-3 font-black disabled:opacity-60">{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>
        <p className="text-sm text-slate-400 mt-6 text-center">Ainda não tem conta? <Link className="text-geek-orange font-bold" href="/cadastro">Criar conta</Link></p>
      </section>
    </main>
  );
}
