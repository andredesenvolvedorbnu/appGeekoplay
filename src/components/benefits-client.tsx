'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { BadgeCheck, BarChart3, Crown, Link2, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Benefits={is_pro:boolean;is_ambassador:boolean;level:number;credits_allowance:number;credits_used:number;credits_remaining:number};

export function BenefitsClient(){
 const supabase=useMemo(()=>createClient(),[]);const [b,setB]=useState<Benefits|null>(null);const [loading,setLoading]=useState(true);
 useEffect(()=>{void (async()=>{const {data}=await supabase.rpc('get_my_benefits');setB(((data||[]) as Benefits[])[0]||null);setLoading(false)})()},[supabase]);
 if(loading)return <div className="grid place-items-center py-24 text-slate-400">Carregando benefícios...</div>;
 if(!b)return <div className="rounded-2xl border border-geek-line p-6">Não foi possível carregar seus benefícios.</div>;
 const active=b.is_ambassador||b.is_pro;
 return <div className="mx-auto max-w-5xl px-3 pb-12 sm:px-4">
  <div className="mb-6"><p className="text-sm font-black text-geek-orange">MEUS BENEFÍCIOS</p><h1 className="mt-1 text-3xl font-black">Sua conta no GeekoPlay</h1><p className="mt-2 text-slate-400">Veja o que está ativo e como aproveitar cada vantagem.</p></div>
  <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-geek-line bg-geek-panel p-4"><Crown className="text-orange-300"/><p className="mt-3 text-xs text-slate-500">Status</p><p className="text-xl font-black">{b.is_ambassador?'Embaixador':b.is_pro?'Premium':'Conta gratuita'}</p></div><div className="rounded-2xl border border-geek-line bg-geek-panel p-4"><Sparkles className="text-orange-300"/><p className="mt-3 text-xs text-slate-500">Nível</p><p className="text-xl font-black">Nível {b.level}</p></div><div className="rounded-2xl border border-geek-line bg-geek-panel p-4"><Rocket className="text-orange-300"/><p className="mt-3 text-xs text-slate-500">Créditos este mês</p><p className="text-xl font-black">{b.credits_remaining} de {b.credits_allowance}</p></div></div>
  {active?<div className="mt-6 grid gap-3 md:grid-cols-2">
   <Benefit icon={<BadgeCheck/>} title={b.is_ambassador?'Selo de Embaixador + identidade especial':'Selo Premium no perfil'} text="Seu status ganha destaque visual dentro da comunidade."/>
   <Benefit icon={<Rocket/>} title="Impulsionamentos incluídos" text={b.is_ambassador?'5 créditos mensais. 1 crédito = 1 dia, 2 = 3 dias, 3 = 7 dias.':'2 créditos mensais. 1 crédito = 1 dia e 2 créditos = 3 dias.'}/>
   <Benefit icon={<ShieldCheck/>} title="Experiência sem anúncios" text="Quando a configuração de anúncios para PRO estiver ativa, sua navegação fica sem anúncios."/>
   <Benefit icon={<Link2/>} title="Identidade e links no perfil" text="Use seu perfil para reunir seus canais, projetos e presença na comunidade."/>
   <Benefit icon={<BarChart3/>} title="Recursos de criador em evolução" text="A área Premium será a base para métricas, alcance e ferramentas exclusivas para criadores e parceiros."/>
   <Benefit icon={<Sparkles/>} title="Acesso antecipado" text="Novas vantagens Premium são liberadas primeiro para contas elegíveis."/>
  </div>:<div className="mt-6 rounded-2xl border border-orange-500/25 bg-orange-500/5 p-5"><h2 className="text-xl font-black">Quer liberar vantagens Premium?</h2><p className="mt-2 text-sm text-slate-400">Assine o Premium para receber benefícios mensais e recursos exclusivos.</p><Link href="/premium" className="mt-4 inline-flex rounded-xl bg-geek-orange px-4 py-3 font-black text-white">Conhecer planos</Link></div>}
  <div className="mt-6 flex flex-wrap gap-2"><Link href="/impulsionar" className="rounded-xl bg-geek-orange px-4 py-3 font-black text-white">Usar créditos de impulsionamento</Link><Link href="/perfil" className="rounded-xl border border-geek-line px-4 py-3 font-bold">Ver meu perfil</Link></div>
 </div>;
}

function Benefit({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="text-orange-300">{icon}</div><h3 className="mt-3 font-black">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-400">{text}</p></div>}
