import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BarChart3, CalendarDays, Gamepad2, Home, Megaphone, Newspaper, ShieldCheck, Store, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const menu = [
  ['Visão geral', '/admin', Home],
  ['Usuários', '/admin/usuarios', Users],
  ['Eventos', '/admin/eventos', CalendarDays],
  ['Notícias', '/admin/noticias', Newspaper],
  ['Anúncios', '/admin/anuncios', Megaphone],
  ['Mercado Geek', '/admin/mercado', Store],
  ['Relatórios', '/admin/relatorios', BarChart3],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name,role,avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') redirect('/');

  return (
    <div className="min-h-screen bg-geek-bg text-slate-100">
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-geek-line bg-[#0d1015]/95 backdrop-blur flex items-center px-4 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-xl bg-geek-orange grid place-items-center"><Gamepad2 size={18}/></span>
          <strong><span className="text-geek-orange">Geeko</span>Play <span className="text-slate-400 font-medium">ADM</span></strong>
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-300">
          <ShieldCheck size={17} className="text-geek-orange"/>
          <span className="hidden sm:inline">{profile?.display_name || 'Administrador'}</span>
          <Link href="/" className="rounded-lg border border-geek-line px-3 py-1.5 hover:bg-geek-soft">Ver aplicativo</Link>
        </div>
      </header>

      <aside className="hidden md:block fixed left-0 top-14 bottom-0 w-64 border-r border-geek-line bg-[#0d1015] p-3 overflow-y-auto">
        <p className="px-3 pt-2 pb-3 text-[10px] tracking-[.2em] text-slate-500 font-bold">PAINEL ADMINISTRATIVO</p>
        <nav className="space-y-1">
          {menu.map(([label, href, Icon]) => (
            <Link key={label} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-geek-soft">
              <Icon size={18}/>{label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="pt-20 px-4 pb-24 md:pl-72 md:pr-8">{children}</main>

      <nav className="md:hidden fixed z-50 bottom-0 inset-x-0 h-16 border-t border-geek-line bg-[#0d1015] flex items-center justify-around">
        {menu.slice(0,5).map(([label, href, Icon]) => (
          <Link key={label} href={href} className="text-[10px] text-slate-400 flex flex-col items-center gap-1">
            <Icon size={20}/><span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
