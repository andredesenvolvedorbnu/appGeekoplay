import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BarChart3,CalendarDays,ClipboardList,Crown,DollarSign,Flag,Gamepad2,Home,Megaphone,Newspaper,ShieldAlert,ShieldCheck,Store,Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const menu=[
 ['Visão geral','/admin',Home],['Usuários','/admin/usuarios',Users],['Benefícios & Embaixadores','/admin/beneficios',Crown],['Eventos','/admin/eventos',CalendarDays],['Feedbacks','/admin/feedbacks',ClipboardList],['Notícias','/admin/noticias',Newspaper],['Anúncios','/admin/anuncios',Megaphone],['Monetização','/admin/monetizacao',DollarSign],['Mercado Geek','/admin/mercado',Store],['Moderação automática','/admin/moderacao',ShieldAlert],['Denúncias','/admin/denuncias',Flag],['Relatórios','/admin/relatorios',BarChart3]
] as const;

export default async function AdminLayout({children}:{children:React.ReactNode}){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');const {data:profile}=await supabase.from('profiles').select('display_name,role,avatar_url').eq('id',user.id).maybeSingle();if(profile?.role!=='admin')redirect('/');
 return <div className="min-h-screen overflow-x-hidden bg-geek-bg text-slate-100">
  <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-geek-line bg-[#0d1015]/95 px-3 backdrop-blur sm:px-6"><Link href="/admin" className="flex min-w-0 items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-geek-orange"><Gamepad2 size={18}/></span><strong className="truncate"><span className="text-geek-orange">Geeko</span>Play <span className="font-medium text-slate-400">ADM</span></strong></Link><div className="ml-auto flex items-center gap-2 text-sm text-slate-300 sm:gap-3"><ShieldCheck size={17} className="text-geek-orange"/><span className="hidden sm:inline">{profile?.display_name||'Administrador'}</span><Link href="/" className="whitespace-nowrap rounded-lg border border-geek-line px-2 py-1.5 text-xs hover:bg-geek-soft sm:px-3 sm:text-sm">Ver aplicativo</Link></div></header>
  <div className="fixed inset-x-0 top-14 z-40 overflow-x-auto border-b border-geek-line bg-[#0d1015] md:hidden"><nav className="flex min-w-max gap-1 px-2 py-2">{menu.map(([label,href,Icon])=><Link key={label} href={href} className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-geek-line bg-geek-panel px-3 py-2 text-xs text-slate-300 hover:border-orange-500/40 hover:text-orange-300"><Icon size={15}/>{label}</Link>)}</nav></div>
  <aside className="fixed bottom-0 left-0 top-14 hidden w-64 overflow-y-auto border-r border-geek-line bg-[#0d1015] p-3 md:block"><p className="px-3 pb-3 pt-2 text-[10px] font-bold tracking-[.2em] text-slate-500">PAINEL ADMINISTRATIVO</p><nav className="space-y-1">{menu.map(([label,href,Icon])=><Link key={label} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-geek-soft hover:text-white"><Icon size={18}/>{label}</Link>)}</nav></aside>
  <main className="px-3 pb-10 pt-32 sm:px-4 md:pb-10 md:pl-72 md:pr-8 md:pt-20">{children}</main>
 </div>;
}
