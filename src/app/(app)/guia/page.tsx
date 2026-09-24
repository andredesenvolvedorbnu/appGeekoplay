import { Award,CalendarCheck2 } from 'lucide-react';
import { GuideClient } from '@/components/guide-client';

export default function Page(){
 return <>
  <GuideClient/>
  <section className="mx-auto -mt-5 mb-10 w-full max-w-5xl px-3 sm:px-4">
   <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/10 via-geek-panel to-purple-500/5 p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
     <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-geek-orange"><CalendarCheck2 size={21}/></span>
     <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">Avaliação de eventos também dá XP</h2><span className="inline-flex items-center gap-1 rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-1 text-[11px] font-black text-orange-300"><Award size={13}/>+2 XP</span></div>
      <p className="mt-1 text-sm leading-6 text-slate-400">Depois de participar de um evento elegível, responda <b className="text-slate-200">“Como foi o evento?”</b>. Na primeira avaliação daquele evento, sua conta recebe <b className="text-orange-300">2 XP</b> e você recebe uma notificação confirmando a recompensa.</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">Editar a avaliação depois não concede XP novamente. A recompensa vale uma vez por usuário em cada evento.</p>
     </div>
    </div>
   </div>
  </section>
 </>;
}
