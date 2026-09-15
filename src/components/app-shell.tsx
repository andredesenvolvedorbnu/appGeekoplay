'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CalendarDays, Compass, Gamepad2, Home, IdCard, LibraryBig, Mail, MessageSquare, Newspaper, PlusCircle, Search, ShieldCheck, Store, Trophy, UserRound, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const main = [
  ['Página inicial', '/', Home],
  ['Explorar', '/explorar', Compass],
  ['Eventos', '/eventos', CalendarDays],
  ['Comunidades', '/comunidades', Users],
  ['Meu Geek Card', '/meu-card', IdCard],
  ['Mensagens', '/mensagens', MessageSquare],
  ['Notificações', '/notificacoes', Bell],
  ['Notícias', '/noticias', Newspaper],
  ['Minha Coleção', '/colecao', LibraryBig],
  ['Mercado Geek', '/mercado', Store]
] as const;

const interests = ['Games', 'Anime', 'Séries', 'Filmes', 'HQs & Comics', 'Cosplay', 'Tecnologia', 'RPG', 'K-Pop', 'Mangá', 'Colecionáveis'];

type ShellProfile = {
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  favorite_categories: string[];
  role: 'user' | 'admin';
  is_pro: boolean;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<ShellProfile | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('display_name,bio,avatar_url,favorite_categories,role,is_pro').eq('id', user.id).single();
      if (data) setProfile(data as ShellProfile);
    })();
  }, [supabase, pathname]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    router.push(`/explorar?q=${encodeURIComponent(clean)}`);
  }

  function active(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-geek-bg text-slate-100">
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-geek-line bg-[#0d1015]/95 px-3 backdrop-blur sm:px-4">
        <Link href="/" className="flex min-w-fit items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-geek-orange"><Gamepad2 size={19}/></span>
          <strong><span className="text-geek-orange">Geeko</span>Play</strong>
        </Link>

        <form onSubmit={submitSearch} className="hidden max-w-md flex-1 items-center gap-2 rounded-xl bg-geek-soft px-3 py-2 text-slate-400 sm:flex">
          <Search size={17}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent outline-none" placeholder="Buscar pessoas, posts e fandoms..."/>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {profile?.role === 'admin' && <Link href="/admin" className="hidden items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-1.5 text-xs font-bold text-orange-300 md:flex"><ShieldCheck size={15}/> ADM</Link>}
          <Link href="/mensagens" className="rounded-lg p-2 hover:bg-geek-soft" aria-label="Mensagens"><Mail size={18}/></Link>
          <Link href="/notificacoes" className="rounded-lg p-2 hover:bg-geek-soft" aria-label="Notificações"><Bell size={18}/></Link>
          <Link href="/perfil" className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600" aria-label="Perfil">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="Perfil" className="h-full w-full object-cover object-center"/> : <UserRound size={16}/>} 
          </Link>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-14 hidden w-64 overflow-y-auto border-r border-geek-line bg-[#0d1015] p-3 lg:block">
        <nav className="space-y-1">
          {main.map(([label, href, Icon]) => <Link key={label} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active(href) ? 'bg-orange-500/12 font-bold text-orange-300' : 'text-slate-300 hover:bg-geek-soft hover:text-white'}`}><Icon size={18}/>{label}</Link>)}
          {profile?.role === 'admin' && <Link href="/admin" className="mt-2 flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-sm font-bold text-orange-300"><ShieldCheck size={18}/>Painel Administrativo</Link>}
        </nav>

        <div className="my-5 border-t border-geek-line"/>
        <p className="mb-2 px-3 text-[10px] font-bold tracking-[.2em] text-slate-500">INTERESSES</p>
        <div className="space-y-1">{interests.map(item => <Link key={item} href={`/explorar?categoria=${encodeURIComponent(item)}`} className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-geek-soft hover:text-white">{item}</Link>)}</div>

        <Link href="/perfil" className="mt-5 block rounded-2xl border border-yellow-700/50 bg-yellow-500/10 p-4">
          <Trophy className="mb-2 text-yellow-400" size={20}/>
          <b className="text-sm text-yellow-300">{profile?.is_pro ? 'Você é GeekoPlay PRO' : 'Seja Premium'}</b>
          <p className="mt-1 text-xs text-slate-400">{profile?.is_pro ? 'Seu perfil possui benefícios Premium.' : 'Recursos exclusivos, destaques e vantagens no GeekoPlay.'}</p>
        </Link>
      </aside>

      <main className="min-h-screen pb-20 pt-16 lg:pb-8 lg:pl-64 xl:pr-72">{children}</main>

      <aside className="fixed bottom-0 right-0 top-14 hidden w-72 border-l border-geek-line bg-[#0d1015] p-4 xl:block">
        <div className="rounded-2xl border border-geek-line bg-geek-panel p-4">
          <div className="flex items-center justify-between"><b>Sobre mim</b><Link href="/perfil" className="text-xs font-bold text-geek-orange">Editar</Link></div>
          <p className="mt-2 text-sm leading-5 text-slate-400">{profile?.bio || 'Complete seu perfil e mostre seus fandoms para a comunidade.'}</p>
          {!!profile?.favorite_categories?.length && <div className="mt-3 flex flex-wrap gap-1">{profile.favorite_categories.slice(0,6).map(item=><span key={item} className="rounded-full bg-geek-soft px-2 py-1 text-[10px] text-slate-300">{item}</span>)}</div>}
        </div>
        <div className="mt-3 rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="flex items-center justify-between"><b>Próximos eventos</b><Link href="/eventos" className="text-xs font-bold text-geek-orange">Ver todos</Link></div><p className="mt-2 text-sm text-slate-400">Os eventos que você confirmar aparecerão aqui.</p></div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-geek-line bg-[#0d1015] lg:hidden">
        {[
          ['Início','/',Home],
          ['Explorar','/explorar',Compass],
          ['Criar','/criar',PlusCircle],
          ['Alertas','/notificacoes',Bell],
          [profile?.role === 'admin' ? 'ADM' : 'Perfil',profile?.role === 'admin' ? '/admin' : '/perfil',profile?.role === 'admin' ? ShieldCheck : UserRound]
        ].map(([label, href, Icon]: any)=><Link key={label} href={href} className={`flex min-w-14 flex-col items-center gap-1 text-[11px] ${active(href) ? 'text-orange-300' : 'text-slate-400'}`}><Icon size={21}/>{label}</Link>)}
      </nav>
    </div>
  );
}
