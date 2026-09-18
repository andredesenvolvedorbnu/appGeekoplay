'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Award, Bell, CalendarDays, Compass, Crown, Gamepad2, Home, IdCard, LibraryBig, LogOut, Mail, Menu, MessageSquare, Newspaper, PlusCircle, Rocket, Search, Share2, ShieldCheck, Sparkles, Store, Trophy, UserRound, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdLayer } from '@/components/ad-layer';
import { PioneerDiscoveryPrompt } from '@/components/pioneer-discovery-prompt';

const main = [
  ['Página inicial', '/', Home],
  ['Explorar', '/explorar', Compass],
  ['Eventos', '/eventos', CalendarDays],
  ['Comunidades', '/comunidades', Users],
  ['Party Finder', '/party-finder', Gamepad2],
  ['Cosplay', '/cosplay', Sparkles],
  ['Meu Geek Card', '/meu-card', IdCard],
  ['Conquistas', '/conquistas', Award],
  ['Meu Recap Geek', '/recap', Sparkles],
  ['Mensagens', '/mensagens', MessageSquare],
  ['Notificações', '/notificacoes', Bell],
  ['Notícias', '/noticias', Newspaper],
  ['Minha Coleção', '/colecao', LibraryBig],
  ['Mercado Geek', '/mercado', Store],
  ['Impulsionar', '/impulsionar', Rocket]
] as const;

const interests = ['Games', 'Anime', 'Séries', 'Filmes', 'HQs & Comics', 'Cosplay', 'Tecnologia', 'RPG', 'K-Pop', 'Mangá', 'Colecionáveis'];
const LEVEL_TITLES=['Novato','Curioso Geek','Explorador','Player 1','Veterano','Especialista','Mestre Geek','Lenda','Ícone Geek','Deus Geek'];

type ShellProfile = { display_name:string; bio:string|null; avatar_url:string|null; favorite_categories:string[]; role:'user'|'admin'; is_pro:boolean; level:number };
type UpcomingEvent = { id:string; title:string; cover_url:string|null; starts_at:string; city:string|null; state:string|null; is_online:boolean };

export function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<ShellProfile | null>(null);
  const [query, setQuery] = useState('');
  const [userId,setUserId]=useState<string|null>(null);
  const [unreadCount,setUnreadCount]=useState(0);
  const [unreadMessages,setUnreadMessages]=useState(0);
  const [upcomingEvents,setUpcomingEvents]=useState<UpcomingEvent[]>([]);
  const [mobileMenu,setMobileMenu]=useState(false);
  const [userMenu,setUserMenu]=useState(false);
  const [levelUp,setLevelUp]=useState<number|null>(null);
  const [levelShareMessage,setLevelShareMessage]=useState('');
  const userMenuRef=useRef<HTMLDivElement>(null);
  const currentLevelRef=useRef<number|null>(null);

  async function loadSessionData(){
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [{ data },{count:notificationCount},{count:messageCount},{data:attendanceRows}]=await Promise.all([
      supabase.from('profiles').select('display_name,bio,avatar_url,favorite_categories,role,is_pro,level').eq('id', user.id).single(),
      supabase.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',user.id).eq('is_read',false),
      supabase.from('messages').select('*',{count:'exact',head:true}).eq('recipient_id',user.id).is('read_at',null),
      supabase.from('event_attendees').select('event_id').eq('user_id',user.id).in('status',['going','confirmed'])
    ]);
    if (data) { const next=data as ShellProfile; setProfile(next); if(currentLevelRef.current===null)currentLevelRef.current=Number(next.level||1); }
    setUnreadCount(notificationCount||0);
    setUnreadMessages(messageCount||0);

    const eventIds=(attendanceRows||[]).map(row=>row.event_id).filter(Boolean);
    if(!eventIds.length){setUpcomingEvents([]);return;}
    const {data:eventRows}=await supabase.from('events')
      .select('id,title,cover_url,starts_at,city,state,is_online')
      .in('id',eventIds)
      .gte('starts_at',new Date().toISOString())
      .order('starts_at',{ascending:true})
      .limit(3);
    setUpcomingEvents((eventRows||[]) as UpcomingEvent[]);
  }

  useEffect(() => { void loadSessionData(); }, [supabase, pathname]);

  useEffect(()=>{
    if(!userId)return;
    const channel=supabase.channel(`shell-live-${userId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`user_id=eq.${userId}`},()=>{void loadSessionData()})
      .on('postgres_changes',{event:'*',schema:'public',table:'messages'},payload=>{
        const row=(payload.new||payload.old||{}) as {sender_id?:string;recipient_id?:string};
        if(row.sender_id===userId||row.recipient_id===userId)void loadSessionData();
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'event_attendees',filter:`user_id=eq.${userId}`},()=>{void loadSessionData()})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:`id=eq.${userId}`},payload=>{const nextLevel=Number((payload.new as {level?:number}).level||0);const previous=currentLevelRef.current;if(previous!==null&&nextLevel>previous){setLevelShareMessage('');setLevelUp(nextLevel)}if(nextLevel>0)currentLevelRef.current=nextLevel;void loadSessionData()})
      .subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[supabase,userId]);

  useEffect(()=>{setMobileMenu(false);setUserMenu(false)},[pathname]);
  useEffect(()=>{function close(event:PointerEvent){if(userMenuRef.current&&!userMenuRef.current.contains(event.target as Node))setUserMenu(false)}document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);

  async function logout(){if(userId)sessionStorage.removeItem(`geekoplay-discovery-prompt-${userId}`);await supabase.auth.signOut();window.location.href='/bem-vindo'}
  async function shareLevelUp(){if(!levelUp)return;const title=LEVEL_TITLES[Math.max(0,Math.min(9,levelUp-1))];const text=`Subi para o Nível ${levelUp} · ${title} no GeekoPlay! 🎮🔥`;try{if(navigator.share)await navigator.share({title:'GeekoPlay · Level Up!',text,url:window.location.origin});else{await navigator.clipboard.writeText(`${text} ${window.location.origin}`);setLevelShareMessage('Conquista copiada para compartilhar.')}}catch{setLevelShareMessage('Não foi possível compartilhar agora.') }}

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

  const NavLink=({label,href,Icon,onClick}:{label:string;href:string;Icon:any;onClick?:()=>void})=><Link onClick={onClick} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active(href) ? 'bg-orange-500/12 font-bold text-orange-300' : 'text-slate-300 hover:bg-geek-soft hover:text-white'}`}><Icon size={18}/><span>{label}</span>{label==='Notificações'&&unreadCount>0&&<span className="ml-auto min-w-5 rounded-full bg-geek-orange px-1.5 py-0.5 text-center text-[10px] font-black text-white">{unreadCount>99?'99+':unreadCount}</span>}{label==='Mensagens'&&unreadMessages>0&&<span className="ml-auto min-w-5 rounded-full bg-geek-orange px-1.5 py-0.5 text-center text-[10px] font-black text-white">{unreadMessages>99?'99+':unreadMessages}</span>}</Link>;

  return (
    <div className="min-h-screen overflow-x-hidden bg-geek-bg text-slate-100">
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-geek-line bg-geek-panel/95 px-3 backdrop-blur sm:px-4">
        <Link href="/" className="flex min-w-fit items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-geek-orange"><Gamepad2 size={19}/></span><strong className="text-white"><span className="text-geek-orange">Geeko</span>Play</strong></Link>
        <form onSubmit={submitSearch} className="hidden max-w-md flex-1 items-center gap-2 rounded-xl bg-geek-soft px-3 py-2 text-slate-400 sm:flex"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent outline-none" placeholder="Buscar pessoas, posts e fandoms..."/></form>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {profile?.role === 'admin' && <Link href="/admin" className="hidden items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2 py-1.5 text-xs font-bold text-orange-300 md:flex"><ShieldCheck size={15}/> ADM</Link>}
          <button onClick={()=>setMobileMenu(v=>!v)} className="rounded-lg p-2 text-white hover:bg-geek-soft lg:hidden" aria-label="Abrir menu">{mobileMenu?<X size={18}/>:<Menu size={18}/>}</button>
          <Link href="/mensagens" className="relative rounded-lg p-2 text-white hover:bg-geek-soft" aria-label="Mensagens"><Mail size={18}/>{unreadMessages>0&&<span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-geek-orange px-1 text-[9px] font-black text-white">{unreadMessages>9?'9+':unreadMessages}</span>}</Link>
          <Link href="/notificacoes" className="relative rounded-lg p-2 text-white hover:bg-geek-soft" aria-label="Notificações"><Bell size={18}/>{unreadCount>0&&<span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-geek-orange px-1 text-[9px] font-black text-white">{unreadCount>9?'9+':unreadCount}</span>}</Link>
          <div ref={userMenuRef} className="relative"><button type="button" onClick={()=>setUserMenu(v=>!v)} className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600 text-white" aria-label="Abrir menu do usuário" aria-expanded={userMenu}>{profile?.avatar_url ? <img src={profile.avatar_url} alt="Perfil" className="h-full w-full object-cover object-center"/> : <UserRound size={16}/>}</button>{userMenu&&<div className="absolute right-0 top-11 z-[70] w-48 overflow-hidden rounded-xl border border-geek-line bg-geek-panel shadow-2xl"><Link href="/perfil" onClick={()=>setUserMenu(false)} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-geek-soft"><UserRound size={16}/>Meu perfil</Link><button type="button" onClick={()=>void logout()} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-300 hover:bg-red-500/10"><LogOut size={16}/>Sair da conta</button></div>}</div>
        </div>
      </header>

      {mobileMenu&&<div className="fixed inset-x-0 bottom-16 top-14 z-40 overflow-y-auto border-b border-geek-line bg-geek-panel p-3 lg:hidden"><div className="mx-auto max-w-xl"><form onSubmit={submitSearch} className="mb-3 flex items-center gap-2 rounded-xl bg-geek-soft px-3 py-2 text-slate-400 sm:hidden"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent outline-none" placeholder="Buscar no GeekoPlay..."/></form><nav className="grid gap-1 sm:grid-cols-2">{main.map(([label,href,Icon])=><NavLink key={label} label={label} href={href} Icon={Icon} onClick={()=>setMobileMenu(false)}/>)}</nav>{profile?.role==='admin'&&<Link onClick={()=>setMobileMenu(false)} href="/admin" className="mt-3 flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-3 text-sm font-bold text-orange-300"><ShieldCheck size={18}/>Painel Administrativo</Link>}<Link onClick={()=>setMobileMenu(false)} href="/premium" className="mt-2 flex items-center gap-3 rounded-xl border border-geek-line bg-geek-soft px-3 py-3 text-sm"><Crown size={18} className="text-orange-300"/>{profile?.is_pro?'GeekoPlay PRO':'Conhecer o Premium'}</Link></div></div>}

      <aside className="fixed bottom-0 left-0 top-14 hidden w-64 overflow-y-auto border-r border-geek-line bg-geek-panel p-3 lg:block">
        <nav className="space-y-1">{main.map(([label, href, Icon]) => <NavLink key={label} label={label} href={href} Icon={Icon}/>)}{profile?.role === 'admin' && <Link href="/admin" className="mt-2 flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-sm font-bold text-orange-300"><ShieldCheck size={18}/>Painel Administrativo</Link>}</nav>
        <div className="my-5 border-t border-geek-line"/><p className="mb-2 px-3 text-[10px] font-bold tracking-[.2em] text-slate-500">INTERESSES</p><div className="space-y-1">{interests.map(item => <Link key={item} href={`/explorar?categoria=${encodeURIComponent(item)}`} className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-geek-soft hover:text-white">{item}</Link>)}</div>
        <Link href="/conquistas" className="mt-5 block rounded-2xl border border-yellow-700/50 bg-yellow-500/10 p-4"><Trophy className="mb-2 text-yellow-400" size={20}/><b className="text-sm text-yellow-300">XP e Conquistas</b><p className="mt-1 text-xs text-slate-400">Acompanhe níveis, medalhas e seu progresso.</p></Link>
        <Link href="/premium" className="mt-3 block rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4"><Crown className="mb-2 text-orange-300" size={20}/><b className="text-sm text-orange-200">{profile?.is_pro ? 'Você é GeekoPlay PRO' : 'Seja Premium'}</b><p className="mt-1 text-xs text-slate-400">{profile?.is_pro?'Seu selo PRO está ativo.':'Veja benefícios e solicite sua assinatura.'}</p></Link>
      </aside>

      <main className="min-h-screen pb-20 pt-16 lg:pb-8 lg:pl-64 xl:pr-72"><AdLayer/><PioneerDiscoveryPrompt/>{children}</main>

      <aside className="fixed bottom-0 right-0 top-14 hidden w-72 overflow-y-auto border-l border-geek-line bg-geek-panel p-4 xl:block">
        <div className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="flex items-center justify-between"><b>Sobre mim</b><Link href="/perfil" className="text-xs font-bold text-geek-orange">Editar</Link></div><p className="mt-2 text-sm leading-5 text-slate-400">{profile?.bio || 'Complete seu perfil e mostre seus fandoms para a comunidade.'}</p>{!!profile?.favorite_categories?.length && <div className="mt-3 flex flex-wrap gap-1">{profile.favorite_categories.slice(0,6).map(item=><span key={item} className="rounded-full bg-geek-soft px-2 py-1 text-[10px] text-slate-300">{item}</span>)}</div>}</div>
        <Link href="/recap" className="mt-3 block rounded-2xl border border-geek-line bg-geek-panel p-4 transition hover:border-orange-500/40"><div className="flex items-center gap-2"><Sparkles size={17} className="text-geek-orange"/><b>Meu Recap Geek</b></div><p className="mt-2 text-sm text-slate-400">Reviva sua metade do ano geek quando quiser.</p></Link>
        <div className="mt-3 rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="flex items-center justify-between"><b>Próximos eventos</b><Link href="/eventos" className="text-xs font-bold text-geek-orange">Ver todos</Link></div>{upcomingEvents.length?<div className="mt-3 space-y-3">{upcomingEvents.map(event=><Link key={event.id} href={`/eventos/${event.id}`} className="flex min-w-0 items-center gap-3 rounded-xl p-1 transition hover:bg-geek-soft"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-geek-soft">{event.cover_url?<img src={event.cover_url} alt="" className="h-full w-full object-contain object-center"/>:<CalendarDays size={18} className="text-geek-orange"/>}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{event.title}</p><p className="mt-0.5 text-[11px] text-slate-400">{new Date(event.starts_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} · {event.is_online?'Online':[event.city,event.state].filter(Boolean).join('/')}</p></div></Link>)}</div>:<p className="mt-2 text-sm text-slate-400">Você ainda não confirmou presença em nenhum evento futuro.</p>}</div>
      </aside>

      {levelUp&&<div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Novo nível alcançado"><div className="w-full max-w-sm rounded-3xl border border-orange-500/40 bg-geek-panel p-6 text-center shadow-2xl"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-500/15 text-orange-300"><Trophy size={30}/></div><p className="mt-4 text-xs font-black uppercase tracking-[.2em] text-geek-orange">Level Up!</p><h2 className="mt-2 text-2xl font-black">Nível {levelUp} · {LEVEL_TITLES[Math.max(0,Math.min(9,levelUp-1))]}</h2><p className="mt-2 text-sm leading-6 text-slate-400">Seu progresso no GeekoPlay subiu de nível. Compartilhe essa conquista com a comunidade.</p>{levelShareMessage&&<p className="mt-3 rounded-xl bg-geek-soft px-3 py-2 text-xs text-slate-300">{levelShareMessage}</p>}<div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={()=>setLevelUp(null)} className="rounded-xl border border-geek-line px-4 py-3 text-sm font-bold">Fechar</button><button onClick={()=>void shareLevelUp()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 text-sm font-black text-white"><Share2 size={16}/>Compartilhar</button></div></div></div>}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-geek-line bg-geek-panel lg:hidden">{[['Início','/',Home],['Explorar','/explorar',Compass],['Criar','/criar',PlusCircle],['Alertas','/notificacoes',Bell],[profile?.role === 'admin' ? 'ADM' : 'Perfil',profile?.role === 'admin' ? '/admin' : '/perfil',profile?.role === 'admin' ? ShieldCheck : UserRound]].map(([label, href, Icon]: any)=><Link key={label} href={href} className={`relative flex min-w-14 flex-col items-center gap-1 text-[11px] ${active(href) ? 'text-orange-300' : 'text-slate-400'}`}><Icon size={21}/>{label}{label==='Alertas'&&unreadCount>0&&<span className="absolute right-2 top-0 h-2 w-2 rounded-full bg-geek-orange"/>}</Link>)}</nav>
    </div>
  );
}
