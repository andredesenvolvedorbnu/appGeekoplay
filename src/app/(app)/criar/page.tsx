import Link from 'next/link';
import { Camera, IdCard, MessageSquarePlus, ShoppingBag, Zap } from 'lucide-react';

const actions=[
 {title:'Criar publicação',description:'Publique texto, foto e escolha uma categoria no feed.',href:'/',icon:MessageSquarePlus},
 {title:'Criar meu Geek Card',description:'Monte sua carta com foto, raridade, ATK, DEF, XP e nível.',href:'/meu-card',icon:IdCard},
 {title:'Criar Pulse',description:'Compartilhe uma foto por 24 horas com seu fandom.',href:'/',icon:Zap},
 {title:'Anunciar no Mercado Geek',description:'Cadastre um item usado ou colecionável para negociação.',href:'/mercado',icon:ShoppingBag},
 {title:'Atualizar foto e capa',description:'Edite avatar e capa do seu perfil sem perder proporção.',href:'/perfil',icon:Camera},
];

export default function Page(){return <div className="mx-auto max-w-4xl px-3 sm:px-4 pb-10"><div className="mb-5"><p className="text-sm font-bold text-geek-orange">CRIAR</p><h1 className="text-2xl sm:text-3xl font-black">O que você quer criar?</h1><p className="mt-1 text-sm text-slate-400">Escolha uma ação. Todas levam para uma funcionalidade ativa do GeekoPlay.</p></div><div className="grid gap-3 sm:grid-cols-2">{actions.map(({title,description,href,icon:Icon})=><Link key={title} href={href} className="rounded-2xl border border-geek-line bg-geek-panel p-5 transition hover:border-orange-500/50 hover:bg-geek-soft"><div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><Icon size={22}/></div><h2 className="mt-4 font-black">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{description}</p></Link>)}</div></div>}
