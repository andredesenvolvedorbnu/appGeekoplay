'use client';

import Link from 'next/link';
import { useMemo,useState } from 'react';
import {
  Award,BookOpen,CalendarDays,ChevronDown,Compass,Crown,Gamepad2,
  HelpCircle,IdCard,LibraryBig,MessageCircle,Rocket,Search,ShieldCheck,
  Sparkles,Store,Users,Zap
} from 'lucide-react';

type GuideItem={
  id:string;
  title:string;
  summary:string;
  details:string[];
  keywords:string[];
  href?:string;
  linkLabel?:string;
  icon:any;
};

const items:GuideItem[]=[
  {
    id:'primeiros-passos',
    title:'Primeiros passos',
    summary:'Monte seu perfil, encontre seus fandoms e comece a participar.',
    details:[
      'Complete seu perfil com foto, capa, bio, cidade e interesses para deixar sua identidade geek mais clara.',
      'Use Explorar para encontrar pessoas, publicações e assuntos do seu interesse.',
      'Siga outros geeks para construir sua rede e descobrir mais conteúdo dentro da comunidade.'
    ],
    keywords:['começar','perfil','bio','foto','seguir','explorar','interesses'],
    href:'/perfil',linkLabel:'Ir para meu perfil',icon:Compass
  },
  {
    id:'feed',
    title:'Feed e publicações',
    summary:'Texto, fotos, vídeos, categorias e interações em um só lugar.',
    details:[
      'Você pode publicar texto, foto ou vídeo e escolher a categoria que melhor representa o conteúdo.',
      'Vídeos do feed podem iniciar automaticamente quando entram em destaque na tela. Você continua no controle para pausar e ajustar o volume.',
      'Você pode curtir, comentar, compartilhar e, nas suas próprias publicações, editar ou excluir.'
    ],
    keywords:['feed','post','publicação','foto','vídeo','curtir','compartilhar','editar','excluir'],
    href:'/',linkLabel:'Abrir o feed',icon:Gamepad2
  },
  {
    id:'reacoes',
    title:'Reações nos comentários',
    summary:'GG, HYPE, OP, LORE e F — a linguagem da comunidade.',
    details:[
      '🎮 GG: quando o comentário mandou bem.',
      '🔥 HYPE: para algo que te deixou empolgado.',
      '⚡ OP: quando a resposta foi forte demais, apelona ou simplesmente absurda de boa.',
      '🧠 LORE: quando alguém trouxe contexto, informação ou conhecimento sobre aquele universo.',
      '💀 F: respeito ao momento triste, derrota ou situação digna de um clássico “F”.'
    ],
    keywords:['comentário','reação','gg','hype','op','lore','f','emoji'],
    icon:MessageCircle
  },
  {
    id:'xp',
    title:'XP, níveis e conquistas',
    summary:'Sua participação vira progresso dentro do GeekoPlay.',
    details:[
      'O XP representa sua atividade e evolução dentro da comunidade.',
      'Ao avançar, seu perfil sobe de nível e pode liberar marcos e conquistas.',
      'A área de Conquistas reúne seu progresso para você acompanhar o que já desbloqueou.'
    ],
    keywords:['xp','nível','level','conquista','ranking','progresso','gamificação'],
    href:'/conquistas',linkLabel:'Ver meu progresso',icon:Award
  },
  {
    id:'pioneiros',
    title:'Pioneiros',
    summary:'Uma identificação especial ligada aos primeiros membros do GeekoPlay.',
    details:[
      'O número de Pioneiro aparece no perfil dos usuários que fazem parte dessa fase inicial da comunidade.',
      'Ele funciona como uma marca permanente de quem esteve por aqui no começo da história do GeekoPlay.'
    ],
    keywords:['pioneiro','pioneiros','número','primeiros usuários','selo'],
    icon:Sparkles
  },
  {
    id:'pulses',
    title:'Pulses',
    summary:'Conteúdo rápido para compartilhar momentos sem transformar tudo em publicação permanente.',
    details:[
      'Use Pulses para momentos mais rápidos e espontâneos.',
      'Eles aparecem em destaque no feed e têm uma dinâmica diferente das publicações tradicionais.',
      'Quando quiser guardar sua história geek, o Recap ajuda a revisitar momentos da sua jornada.'
    ],
    keywords:['pulse','pulses','stories','momento','recap'],
    href:'/recap',linkLabel:'Conhecer meu Recap',icon:Zap
  },
  {
    id:'geek-card',
    title:'Geek Card',
    summary:'Seu card personalizado para representar sua identidade dentro da comunidade.',
    details:[
      'Escolha uma foto, nome, raridade, categoria, atributos e descrição.',
      'Depois de criar, você pode publicar o Geek Card no feed, salvar a imagem e compartilhar.',
      'O card usa informações do seu perfil, como nível e XP, para reforçar sua identidade dentro do GeekoPlay.'
    ],
    keywords:['geek card','card','raridade','atk','def','identidade'],
    href:'/meu-card',linkLabel:'Criar meu Geek Card',icon:IdCard
  },
  {
    id:'comunidades',
    title:'Comunidades',
    summary:'Espaços para fandoms, eventos, jogos e assuntos específicos.',
    details:[
      'Entre em comunidades para conversar com pessoas que compartilham o mesmo interesse.',
      'Comunidades podem ter regras e formas de entrada diferentes conforme a configuração de quem criou.',
      'Use a área da comunidade para acompanhar membros e publicações daquele grupo.'
    ],
    keywords:['comunidade','grupo','fandom','membros','privada','pública'],
    href:'/comunidades',linkLabel:'Explorar comunidades',icon:Users
  },
  {
    id:'eventos',
    title:'Eventos',
    summary:'Descubra eventos, confirme presença e conecte sua vida online com encontros reais.',
    details:[
      'Na área de Eventos você encontra informações e pode confirmar quando pretende participar.',
      'O recurso “Evento que vou” permite compartilhar seus planos com a comunidade.',
      'Alguns eventos podem liberar recursos adicionais, como check-in e avaliação pós-evento.'
    ],
    keywords:['evento','eventos','presença','check-in','avaliação','evento que vou'],
    href:'/eventos',linkLabel:'Ver eventos',icon:CalendarDays
  },
  {
    id:'party-finder',
    title:'Party Finder',
    summary:'Encontre gente para jogar junto sem depender da sorte do matchmaking.',
    details:[
      'Crie ou encontre grupos de jogadores informando jogo, plataforma, horário e quantidade de vagas.',
      'Use os detalhes da party para combinar a sessão antes de entrar.',
      'O objetivo é facilitar a formação de grupos dentro da própria comunidade geek.'
    ],
    keywords:['party finder','party','jogar','jogadores','grupo','pc','playstation','xbox','nintendo','rpg'],
    href:'/party-finder',linkLabel:'Encontrar uma party',icon:Gamepad2
  },
  {
    id:'cosplay',
    title:'Cosplay',
    summary:'Uma área para mostrar personagens, registros e participações.',
    details:[
      'Crie seu perfil de cosplay com personagem, fandom, descrição e imagem.',
      'Organize fotos e registros ligados à sua trajetória como cosplayer.',
      'Use o espaço para apresentar seu trabalho para a comunidade.'
    ],
    keywords:['cosplay','cosplayer','personagem','fandom','foto'],
    href:'/cosplay',linkLabel:'Abrir Cosplay',icon:Sparkles
  },
  {
    id:'colecao',
    title:'Minha Coleção',
    summary:'Organize itens e mostre o que faz parte do seu universo geek.',
    details:[
      'Cadastre itens da sua coleção e mantenha seus registros reunidos no GeekoPlay.',
      'Use fotos e informações para deixar cada item fácil de reconhecer.',
      'A coleção complementa seu perfil e ajuda a mostrar seus interesses de forma visual.'
    ],
    keywords:['coleção','colecionáveis','item','itens'],
    href:'/colecao',linkLabel:'Ver minha coleção',icon:LibraryBig
  },
  {
    id:'mercado',
    title:'Mercado Geek',
    summary:'Espaço voltado para itens geek anunciados pela comunidade.',
    details:[
      'Consulte os anúncios disponíveis e veja as informações cadastradas pelo vendedor.',
      'Antes de qualquer negociação, confira com atenção descrição, fotos e condições informadas.',
      'Use as ferramentas de segurança e denúncia caso encontre conteúdo inadequado.'
    ],
    keywords:['mercado','venda','comprar','anúncio','item'],
    href:'/mercado',linkLabel:'Abrir Mercado Geek',icon:Store
  },
  {
    id:'impulsionamento',
    title:'Impulsionamento',
    summary:'Dê mais alcance a uma publicação por um período determinado.',
    details:[
      'O impulsionamento é uma função paga para ampliar a exposição de uma publicação dentro do GeekoPlay.',
      'Você escolhe uma publicação elegível, consulta as opções disponíveis e envia a solicitação.',
      'Publicações impulsionadas continuam identificadas como conteúdo impulsionado no feed.'
    ],
    keywords:['impulsionar','boost','alcance','pago','publicação impulsionada'],
    href:'/impulsionar',linkLabel:'Ver impulsionamento',icon:Rocket
  },
  {
    id:'pro',
    title:'GeekoPlay PRO',
    summary:'Planos com benefícios extras configurados dentro da plataforma.',
    details:[
      'Na página PRO você pode comparar planos, duração, valores e benefícios disponíveis naquele momento.',
      'O pagamento é confirmado pelo fluxo disponibilizado no próprio GeekoPlay.',
      'Os benefícios podem variar por plano, então consulte a página antes de contratar ou renovar.'
    ],
    keywords:['pro','premium','plano','assinatura','benefício','pagamento'],
    href:'/premium',linkLabel:'Conhecer o PRO',icon:Crown
  },
  {
    id:'seguranca',
    title:'Segurança e moderação',
    summary:'Ferramentas para ajudar a manter a comunidade saudável.',
    details:[
      'Você pode denunciar publicações inadequadas para análise da equipe.',
      'Conteúdos e ações administrativas seguem permissões diferentes das contas comuns.',
      'Nunca envie senhas ou dados sensíveis em publicações, comentários ou mensagens.'
    ],
    keywords:['segurança','denunciar','denúncia','moderação','admin','privacidade'],
    icon:ShieldCheck
  }
];

function normalize(value:string){
 return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

export function GuideClient(){
 const [query,setQuery]=useState('');
 const [open,setOpen]=useState<string|null>('primeiros-passos');

 const filtered=useMemo(()=>{
  const q=normalize(query.trim());
  if(!q)return items;
  return items.filter(item=>normalize([item.title,item.summary,...item.details,...item.keywords].join(' ')).includes(q));
 },[query]);

 return <div className="mx-auto w-full max-w-5xl px-3 pb-10 sm:px-4">
  <section className="overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/10 via-geek-panel to-purple-500/5 p-4 sm:rounded-3xl sm:p-7">
   <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
    <div className="max-w-2xl">
     <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300"><HelpCircle size={14}/>GUIA GEEKOPLAY</div>
     <h1 className="mt-3 text-2xl font-black sm:text-3xl">O que você quer entender?</h1>
     <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">Pesquise uma função ou abra os tópicos abaixo. A ideia é explicar rápido e deixar você voltar para a ação.</p>
    </div>
    <div className="w-full md:max-w-sm">
     <label className="flex min-h-12 items-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3 focus-within:border-orange-500/50">
      <Search size={18} className="shrink-0 text-slate-500"/>
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: XP, LORE, Pulses, PRO..." className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-slate-500"/>
      {query&&<button type="button" onClick={()=>setQuery('')} className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-black/15">Limpar</button>}
     </label>
    </div>
   </div>
  </section>

  {!query&&<section className="mt-4 overflow-x-auto pb-1">
   <div className="flex min-w-max gap-2">
    {[
     ['XP e níveis','xp'],['Comentários','reacoes'],['Pulses','pulses'],['Geek Card','geek-card'],
     ['Comunidades','comunidades'],['Eventos','eventos'],['PRO','pro'],['Impulsionar','impulsionamento']
    ].map(([label,id])=><button key={id} type="button" onClick={()=>{setOpen(id);document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'center'})}} className="rounded-full border border-geek-line bg-geek-panel px-3 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-orange-200">{label}</button>)}
   </div>
  </section>}

  <section className="mt-4 grid gap-3 md:grid-cols-2">
   {filtered.map(item=>{
    const Icon=item.icon;
    const expanded=open===item.id||Boolean(query);
    return <article id={item.id} key={item.id} className="scroll-mt-20 self-start overflow-hidden rounded-2xl border border-geek-line bg-geek-panel">
     <button type="button" onClick={()=>setOpen(current=>current===item.id?null:item.id)} className="flex w-full items-start gap-3 p-4 text-left sm:p-5" aria-expanded={expanded}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><Icon size={19}/></span>
      <span className="min-w-0 flex-1">
       <span className="block font-black text-slate-100">{item.title}</span>
       <span className="mt-1 block text-sm leading-5 text-slate-400">{item.summary}</span>
      </span>
      <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-500 transition ${expanded?'rotate-180':''}`}/>
     </button>
     {expanded&&<div className="border-t border-geek-line px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
      <div className="space-y-2">
       {item.details.map((detail,index)=><div key={index} className="flex gap-2 text-sm leading-6 text-slate-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-geek-orange"/><p>{detail}</p></div>)}
      </div>
      {item.href&&<Link href={item.href} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-200 transition hover:bg-orange-500/15 sm:w-auto">{item.linkLabel||'Abrir recurso'} →</Link>}
     </div>}
    </article>
   })}
  </section>

  {filtered.length===0&&<section className="mt-4 rounded-2xl border border-dashed border-geek-line bg-geek-panel p-8 text-center">
   <BookOpen className="mx-auto text-geek-orange" size={28}/>
   <h2 className="mt-3 font-black">Não encontrei esse termo</h2>
   <p className="mt-2 text-sm leading-6 text-slate-400">Tente buscar por outro nome da função, como “XP”, “evento”, “comentário”, “PRO” ou “Geek Card”.</p>
   <button type="button" onClick={()=>setQuery('')} className="mt-4 rounded-xl border border-geek-line px-4 py-2 text-sm font-bold">Ver todos os tópicos</button>
  </section>}

  <section className="mt-4 rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5">
   <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-300"><BookOpen size={19}/></div><div><h2 className="font-black">Ainda ficou com dúvida?</h2><p className="mt-1 text-sm leading-6 text-slate-400">Use este guia como referência sempre que aparecer um recurso novo. O GeekoPlay pode ganhar novas funções e esta área acompanha essas mudanças.</p></div></div>
  </section>
 </div>;
}
