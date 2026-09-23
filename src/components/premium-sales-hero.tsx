import { Crown, Rocket, ShieldCheck, Sparkles, BadgeCheck } from 'lucide-react';

export function PremiumSalesHero(){
 return <section className="mb-5 overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-geek-panel to-violet-500/10 p-5 sm:p-8">
  <div className="max-w-4xl">
   <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-200"><Crown size={15}/>GEEKOPLAY PRO</div>
   <h1 className="mt-4 max-w-3xl text-3xl font-black sm:text-5xl">Mais alcance, mais identidade e vantagens que você realmente usa.</h1>
   <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">O Premium não é só um selo. Você recebe benefícios que normalmente seriam pagos separadamente e ganha uma experiência mais completa dentro do GeekoPlay.</p>
   <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Card icon={<Rocket size={20}/>} title="2 créditos por mês" text="Impulsione suas publicações sem pagar por cada destaque."/>
    <Card icon={<BadgeCheck size={20}/>} title="Identidade PRO" text="Selo e presença visual diferenciada dentro da comunidade."/>
    <Card icon={<ShieldCheck size={20}/>} title="Sem anúncios" text="Uma experiência mais limpa enquanto o benefício PRO estiver ativo."/>
    <Card icon={<Sparkles size={20}/>} title="Vantagens primeiro" text="Novos recursos e benefícios chegam primeiro para quem é Premium."/>
   </div>
   <div className="mt-6 rounded-2xl border border-orange-500/20 bg-black/15 p-4 text-sm leading-6 text-slate-300"><b className="text-orange-200">Seu Premium trabalha a seu favor:</b> use 1 crédito para destacar uma publicação por 1 dia ou 2 créditos para ganhar 3 dias de destaque. Depois dos créditos, o impulsionamento pago continua disponível normalmente.</div>
  </div>
 </section>;
}

function Card({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="rounded-2xl border border-geek-line bg-geek-bg/70 p-4"><div className="text-orange-300">{icon}</div><h2 className="mt-3 font-black">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p></div>}
