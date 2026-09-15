'use client';

import Link from 'next/link';
import { Bell, CalendarDays, Compass, Gamepad2, Home, Mail, MessageSquare, Newspaper, Search, Store, Trophy, Users } from 'lucide-react';

const main = [
  ['Página inicial', '/', Home], ['Explorar', '/explorar', Compass], ['Eventos', '/eventos', CalendarDays], ['Comunidades', '/comunidades', Users], ['Mensagens', '/mensagens', MessageSquare], ['Notificações', '/notificacoes', Bell], ['Notícias', '/noticias', Newspaper], ['Mercado Geek', '/mercado', Store]
] as const;
const interests = ['Games', 'Animes', 'Séries e Filmes', 'Quadrinhos', 'Cosplay', 'Tecnologia', 'RPG', 'K-Pop', 'Mangá', 'Colecionáveis'];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-geek-bg text-slate-100">
      <header className="fixed z-40 inset-x-0 top-0 h-14 border-b border-geek-line bg-[#0d1015]/95 backdrop-blur flex items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 min-w-fit"><span className="h-8 w-8 rounded-xl bg-geek-orange grid place-items-center"><Gamepad2 size={19}/></span><strong><span className="text-geek-orange">Geeko</span>Play</strong></Link>
        <div className="hidden sm:flex max-w-md flex-1 rounded-xl bg-geek-soft px-3 py-2 items-center gap-2 text-slate-400"><Search size={17}/><input className="bg-transparent outline-none w-full" placeholder="Buscar..."/></div>
        <div className="ml-auto flex items-center gap-2"><Mail size={18}/><Bell size={18}/><div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-purple-600"/></div>
      </header>
      <aside className="hidden lg:block fixed left-0 top-14 bottom-0 w-64 border-r border-geek-line bg-[#0d1015] p-3 overflow-y-auto">
        <nav className="space-y-1">{main.map(([label, href, Icon]) => <Link key={label} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-geek-soft"><Icon size={18}/>{label}</Link>)}</nav>
        <div className="border-t border-geek-line my-5"/>
        <p className="px-3 text-[10px] tracking-[.2em] text-slate-500 font-bold mb-2">INTERESSES</p>
        <div className="space-y-1">{interests.map(item => <Link key={item} href={`/explorar?categoria=${encodeURIComponent(item)}`} className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-geek-soft">{item}</Link>)}</div>
        <div className="mt-5 rounded-2xl border border-yellow-700/50 bg-yellow-500/10 p-4"><Trophy className="text-yellow-400 mb-2" size={20}/><b className="text-yellow-300 text-sm">Seja Premium</b><p className="text-xs text-slate-400 mt-1">Recursos exclusivos, destaques e vantagens no GeekoPlay.</p></div>
      </aside>
      <main className="pt-16 pb-20 lg:pb-8 lg:pl-64 xl:pr-72 min-h-screen">{children}</main>
      <aside className="hidden xl:block fixed right-0 top-14 bottom-0 w-72 border-l border-geek-line bg-[#0d1015] p-4"><div className="rounded-2xl border border-geek-line bg-geek-panel p-4"><b>Sobre mim</b><p className="text-sm text-slate-400 mt-2">Complete seu perfil e mostre seus fandoms.</p></div><div className="rounded-2xl border border-geek-line bg-geek-panel p-4 mt-3"><b>Próximos eventos</b><p className="text-sm text-slate-400 mt-2">Eventos confirmados aparecerão aqui.</p></div></aside>
      <nav className="lg:hidden fixed z-50 bottom-0 inset-x-0 h-16 border-t border-geek-line bg-[#0d1015] flex items-center justify-around">{[['Início','/',Home],['Explorar','/explorar',Compass],['Criar','/?criar=1',Gamepad2],['Alertas','/notificacoes',Bell],['Perfil','/perfil',Users]].map(([label, href, Icon]: any)=><Link key={label} href={href} className="text-[11px] text-slate-400 flex flex-col items-center gap-1"><Icon size={21}/>{label}</Link>)}</nav>
    </div>
  );
}
