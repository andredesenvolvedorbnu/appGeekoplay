import Link from 'next/link';
import { Activity, CalendarDays, MessageSquare, Newspaper, Store, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await createClient();

  const [profiles, posts, events, news, market, feedbacks] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('news').select('*', { count: 'exact', head: true }),
    supabase.from('market_items').select('*', { count: 'exact', head: true }),
    supabase.from('event_feedback').select('*', { count: 'exact', head: true }),
  ]);

  const cards = [
    ['Usuários', profiles.count ?? 0, Users, '/admin/usuarios'],
    ['Publicações', posts.count ?? 0, Activity, '/'],
    ['Eventos', events.count ?? 0, CalendarDays, '/admin/eventos'],
    ['Notícias', news.count ?? 0, Newspaper, '/admin/noticias'],
    ['Itens no Mercado', market.count ?? 0, Store, '/admin/mercado'],
    ['Feedbacks', feedbacks.count ?? 0, MessageSquare, '/admin/relatorios'],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section>
        <p className="text-sm text-geek-orange font-bold">ADMINISTRAÇÃO</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black">Dashboard GeekoPlay</h1>
        <p className="mt-2 text-sm text-slate-400">Acompanhe e gerencie a plataforma em um ambiente separado do usuário comum.</p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cards.map(([label, value, Icon, href]) => (
          <Link key={label} href={href} className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5 hover:border-orange-500/40 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-2xl sm:text-3xl font-black">{value}</p>
              </div>
              <span className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-orange-500/10 text-geek-orange grid place-items-center shrink-0"><Icon size={19}/></span>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-geek-line bg-geek-panel p-5">
          <h2 className="font-bold">Ações rápidas</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Link href="/admin/eventos" className="rounded-xl bg-geek-soft border border-geek-line px-4 py-3 text-sm hover:border-geek-orange">Gerenciar eventos</Link>
            <Link href="/admin/noticias" className="rounded-xl bg-geek-soft border border-geek-line px-4 py-3 text-sm hover:border-geek-orange">Publicar notícia</Link>
            <Link href="/admin/anuncios" className="rounded-xl bg-geek-soft border border-geek-line px-4 py-3 text-sm hover:border-geek-orange">Gerenciar anúncios</Link>
            <Link href="/admin/usuarios" className="rounded-xl bg-geek-soft border border-geek-line px-4 py-3 text-sm hover:border-geek-orange">Ver usuários</Link>
          </div>
        </div>

        <div className="rounded-2xl border border-geek-line bg-geek-panel p-5">
          <h2 className="font-bold">Estrutura administrativa</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">Esta área é exclusiva para contas com função de administrador. O bloqueio é feito no servidor e no banco, não apenas escondendo botões no navegador.</p>
          <div className="mt-4 rounded-xl border border-green-800/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">Painel administrativo protegido e responsivo.</div>
        </div>
      </section>
    </div>
  );
}
