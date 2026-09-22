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
    if (loading) return;

    setMessage('');
    setIsError(false);
    setLoading(true);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    try {
      setMessage('Criando sua conta...');

      const { data, error: functionError } = await supabase.functions.invoke('register-immediate', {
        body: {
          name: cleanName,
          email: cleanEmail,
          password
        }
      });

      if (functionError) {
        const context = (functionError as { context?: Response }).context;
        let serverMessage = '';

        if (context) {
          try {
            const payload = await context.clone().json() as { error?: string };
            serverMessage = payload?.error || '';
          } catch {}
        }

        throw new Error(serverMessage || functionError.message || 'Não foi possível criar sua conta.');
      }

      if (!data?.ok) {
        throw new Error(data?.error || 'Não foi possível criar sua conta.');
      }

      setMessage('Conta criada! Entrando no GeekoPlay...');

      let signInError: { message?: string } | null = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        signInError = result.error;

        if (!signInError && result.data.session) {
          window.location.replace('/');
          return;
        }

        if (attempt === 0) {
          await new Promise(resolve => window.setTimeout(resolve, 300));
        }
      }

      throw new Error(signInError?.message || 'Sua conta foi criada, mas não foi possível iniciar a sessão automaticamente.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Não foi possível criar sua conta.';
      setIsError(true);

      if (/já possui|already|registered|exists|duplicate/i.test(detail)) {
        setMessage('Este e-mail já possui uma conta no GeekoPlay. Faça login ou recupere sua senha.');
      } else {
        setMessage(traduzirErroAuth(detail));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-geek-bg">
      <section className="w-full max-w-md rounded-3xl border border-geek-line bg-geek-panel p-5 sm:p-7">
        <h1 className="text-3xl font-black mb-2"><span className="text-geek-orange">Geeko</span>Play</h1>
        <p className="text-slate-400 mb-6">Crie sua identidade geek.</p>

        <form onSubmit={signup} className="space-y-3">
          <input
            className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none focus:border-geek-orange"
            placeholder="Seu nome"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
          />
          <input
            className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none focus:border-geek-orange"
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="w-full rounded-xl bg-geek-soft border border-geek-line px-4 py-3 outline-none focus:border-geek-orange"
            placeholder="Senha (mín. 8 caracteres)"
            type="password"
            minLength={8}
            maxLength={128}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button
            disabled={loading}
            className="w-full rounded-xl bg-geek-orange py-3 font-black disabled:opacity-60"
          >
            {loading ? 'Criando e entrando...' : 'Criar conta'}
          </button>
        </form>

        {message && (
          <p className={`text-sm mt-4 ${isError ? 'text-red-400' : 'text-emerald-400'}`} role="status">
            {message}
          </p>
        )}

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          Ao criar a conta, você entra automaticamente no GeekoPlay. Não é necessário confirmar o e-mail para começar.
        </p>

        <p className="text-sm text-slate-400 mt-6 text-center">
          Já tem conta? <Link href="/login" className="text-geek-orange font-bold">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
