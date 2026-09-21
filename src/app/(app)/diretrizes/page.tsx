import Link from 'next/link';
import { AlertTriangle,CheckCircle2,ShieldCheck,Swords } from 'lucide-react';

export default function Page(){
 return <div className="mx-auto w-full max-w-4xl px-3 pb-10 sm:px-4">
  <section className="rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/10 via-geek-panel to-purple-500/5 p-4 sm:rounded-3xl sm:p-7">
   <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><ShieldCheck size={22}/></div><div><p className="text-xs font-black uppercase tracking-[.16em] text-geek-orange">GEEKOPLAY</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Diretrizes da Comunidade</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Queremos proteger a comunidade sem descaracterizar cultura geek, cosplay, games, anime, terror, fantasia e ficção.</p></div></div>
  </section>

  <section className="mt-4 grid gap-4 md:grid-cols-2">
   <article className="rounded-2xl border border-emerald-500/20 bg-geek-panel p-4 sm:p-5"><div className="flex items-center gap-2 text-emerald-300"><CheckCircle2 size={19}/><h2 className="font-black">Contextos normalmente permitidos</h2></div><div className="mt-4 space-y-2 text-sm leading-6 text-slate-300"><p>• Cosplay sensual sem nudez sexual explícita.</p><p>• Personagens com decote, barriga, pernas ou outras partes do corpo à mostra.</p><p>• Guerreiros, armaduras, espadas, armas cenográficas e acessórios de cosplay.</p><p>• Lutas fictícias, cenas de games, anime, filmes, HQs e RPG.</p><p>• Maquiagem de terror e sangue estilizado que não seja gore extremo realista.</p><p>• Discussões jornalísticas, educativas ou críticas sobre violência, crime e temas sensíveis.</p></div></article>

   <article className="rounded-2xl border border-red-500/20 bg-geek-panel p-4 sm:p-5"><div className="flex items-center gap-2 text-red-300"><AlertTriangle size={19}/><h2 className="font-black">Conteúdos que podem ser bloqueados</h2></div><div className="mt-4 space-y-2 text-sm leading-6 text-slate-300"><p>• Pornografia ou ato sexual explícito.</p><p>• Sexualização ou exploração envolvendo menores.</p><p>• Gore extremo, mutilação ou tortura gráfica realista.</p><p>• Ameaças reais ou incentivo direto à violência.</p><p>• Discurso de ódio e assédio grave direcionado.</p><p>• Incentivo ou instruções de autolesão.</p><p>• Instruções perigosas ou ilícitas graves.</p><p>• Golpes, fraude, phishing e spam malicioso.</p></div></article>
  </section>

  <section className="mt-4 rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><div className="flex items-start gap-3"><Swords className="mt-0.5 shrink-0 text-cyan-300" size={20}/><div><h2 className="font-black">O contexto faz diferença</h2><p className="mt-2 text-sm leading-6 text-slate-400">Uma espada em um cosplay não é tratada da mesma forma que uma ameaça real. Uma roupa reveladora de personagem não é automaticamente pornografia. Uma batalha de anime não é automaticamente violência gráfica proibida. Quando a análise automática não tiver segurança suficiente, o conteúdo pode ser retido para revisão humana em vez de ser condenado automaticamente.</p></div></div></section>

  <section className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 sm:p-5"><h2 className="font-black">Foi bloqueado por engano?</h2><p className="mt-2 text-sm leading-6 text-slate-300">Use o botão <b>Contestar</b> no aviso de moderação e explique o contexto. Um administrador poderá revisar o caso. Se a contestação for aceita, você recebe uma notificação e pode tentar publicar novamente o mesmo conteúdo.</p></section>

  <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-geek-orange px-4 py-3 text-sm font-black text-white">Voltar ao feed</Link><Link href="/guia#seguranca" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-geek-line px-4 py-3 text-sm font-bold">Abrir Guia GeekoPlay</Link></div>
 </div>;
}
