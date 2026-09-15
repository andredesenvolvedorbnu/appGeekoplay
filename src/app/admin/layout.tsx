import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BarChart3, CalendarDays, ClipboardList, DollarSign, Flag, Gamepad2, Home, Megaphone, Newspaper, ShieldCheck, Store, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const menu = [
  ['Visão geral', '/admin', Home],
  ['Usuários', '/admin/usuarios', Users],
  ['Eventos', '/admin/eventos', CalendarDays],
  ['Feedbacks', '/admin/feedbacks', ClipboardList],
  ['Notícias', '/admin/noticias', Newspaper],
  ['Anúncios', '/admin/anuncios', Megaphone],
  ['Monetização', '/admin/monetizacao', DollarSign],
  ['Mercado Geek', '/admin/mercado', Store],
  ['Denúncias', '/admin/denuncias', Flag],
  ['Relatórios', '/admin/relatorios', BarChart3],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('display_name,role,avatar_url').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/');

  return (
    <div className="min-h-screen overflow-x-hidden bg-geek-bg text-slate-100">
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-geek-line bg-[#0d1015]/95 px-3 backdrop-blur sm:px-6">
        <Link href="/admin" className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-geek-orange"><Gamepad2 size={18}/></span><strong><span className="text-geek-orange">Geeko</span>Play <span className="font-medium text-slate-400">ADM</span></strong></Link>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-300 sm:gap-3"><ShieldCheck size={17} className="text-geek-orange"/><span className="hidden sm:inline">{profile?.display_name || 'Administrador'}</span><Link href="/" className="rounded-lg border border-geek-line px-2 py-1.5 text-xs hover:bg-geek-soft sm:px-3 sm:text-sm">Ver aplicativo</Link></div>
      </header>
      <aside className="fixed bottom-0 left-0 top-14 hidden w-64 overflow-y-auto border-r border-geek-line bg-[#0d1015] p-3 md:block"><p className="px-3 pb-3 pt-2 text-[10px] font-bold tracking-[.2em] text-slate-500">PAINEL ADMINISTRATIVO</p><nav className="space-y-1">{menu.map(([label, href, Icon]) => <Link key={label} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-geek-soft"><Icon size={18}/>{label}</Link>)}</nav></aside>
      <main className="px-3 pb-24 pt-20 sm:px-4 md:pl-72 md:pr-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-geek-line bg-[#0d1015] md:hidden">{menu.slice(0,5).map(([label, href, Icon]) => <Link key={label} href={href} className="flex min-w-14 flex-col items-center gap-1 text-[10px] text-slate-400"><Icon size={20}/><span>{label}</span></Link>)}</nav>
    </div>
  );
}
