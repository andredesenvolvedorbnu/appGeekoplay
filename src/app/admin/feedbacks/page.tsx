import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type Overview={event_id:string;title:string;starts_at:string|null;response_count:number;avg_score:number|null;tourists:number;would_return:number};
type Feedback=Record<string,any>&{id:string;event_id:string;created_at:string;score:number|null;would_return:boolean|null;from_other_city:boolean|null};
type Summary=Record<string,any>&{response_count?:number;avg_score?:number|null;would_return_yes?:number;first_time_yes?:number;tourists?:number;avg_nights?:number|null};

const PAGE_SIZE=50;

export default async function AdminFeedbacksPage({searchParams}:{searchParams:Promise<{event?:string;page?:string}>}){
 const params=await searchParams;
 const supabase=await createClient();
 const {data:overviewRows,error:overviewError}=await supabase.rpc('admin_event_feedback_overview');
 const overview=(overviewRows||[]) as Overview[];
 const selectedId=params.event&&overview.some(e=>e.event_id===params.event)?params.event:overview[0]?.event_id||null;
 const selected=overview.find(e=>e.event_id===selectedId)||null;
 const currentPage=Math.max(1,Number(params.page)||1);
 let summary:Summary={};
 let rows:Feedback[]=[];
 if(selectedId){
  const offset=(currentPage-1)*PAGE_SIZE;
  const [{data:summaryData},{data:feedbackRows}]=await Promise.all([
   supabase.rpc('admin_event_feedback_summary',{target_event:selectedId}),
   supabase.from('event_feedback').select('*').eq('event_id',selectedId).order('created_at',{ascending:false}).range(offset,offset+PAGE_SIZE-1)
  ]);
  summary=(summaryData||{}) as Summary;
  rows=(feedbackRows||[]) as Feedback[];
 }
 const total=Number(summary.response_count||selected?.response_count||0);
 const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));

 return <div className="mx-auto max-w-7xl space-y-6">
  <div><p className="text-sm font-bold text-geek-orange">INTELIGÊNCIA DE EVENTOS</p><h1 className="text-2xl font-black sm:text-3xl">Relatório de eventos</h1><p className="mt-2 text-sm text-slate-400">Escolha um evento para analisar todas as respostas em conjunto. As respostas individuais ficam paginadas para continuar leve mesmo com milhares de participantes.</p></div>

  {overviewError&&<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Não foi possível carregar os relatórios de eventos.</div>}

  <section className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5">
   <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
    <label className="grid min-w-0 flex-1 gap-1 text-sm"><b>Escolher evento</b><select name="event" defaultValue={selectedId||''} className="w-full rounded-xl border border-geek-line bg-geek-soft px-3 py-3 text-white">{overview.length===0?<option value="">Nenhum evento com respostas</option>:overview.map(e=><option key={e.event_id} value={e.event_id}>{e.title} · {e.response_count} resposta{e.response_count===1?'':'s'}</option>)}</select></label>
    <button type="submit" className="rounded-xl bg-geek-orange px-5 py-3 font-black text-white">Ver relatório completo</button>
    {selectedId&&<a href={`/api/admin/event-feedback/${selectedId}/pdf`} className="rounded-xl border border-orange-500/35 bg-orange-500/10 px-5 py-3 text-center font-black text-orange-300">Baixar PDF</a>}
   </form>
  </section>

  {!selected?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400">Ainda não há respostas de pesquisas pós-evento.</div>:<>
   <section className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel">
    <div className="border-b border-geek-line bg-geek-soft p-5"><div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><h2 className="text-xl font-black">{selected.title}</h2>{selected.starts_at&&<p className="mt-1 text-xs text-slate-500">{new Date(selected.starts_at).toLocaleString('pt-BR')}</p>}</div><span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300">{total.toLocaleString('pt-BR')} respostas</span></div></div>
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Respostas" value={total.toLocaleString('pt-BR')}/><Metric label="Nota média" value={summary.avg_score==null?'—':Number(summary.avg_score).toFixed(1)}/><Metric label="Voltariam" value={percent(summary.would_return_yes,total)}/><Metric label="Turistas" value={percent(summary.tourists,total)}/><Metric label="Primeira vez" value={percent(summary.first_time_yes,total)}/><Metric label="Média de noites" value={summary.avg_nights==null?'—':Number(summary.avg_nights).toFixed(1)}/></div>
   </section>

   <section className="space-y-4">
    <div><h2 className="text-lg font-black">Relatório consolidado</h2><p className="mt-1 text-xs text-slate-500">Distribuições calculadas no banco de dados, sem precisar carregar milhares de respostas no navegador.</p></div>
    <div className="grid gap-4 lg:grid-cols-2">
     <Distribution title="Faixa etária" data={summary.age_range} total={total}/>
     <Distribution title="Cidade" data={summary.city} total={total}/>
     <Distribution title="Ocupação" data={summary.occupation} total={total}/>
     <Distribution title="Faixa de renda" data={summary.income_range} total={total}/>
     <Distribution title="Universos / interesses" data={summary.interests} total={total} multi/>
     <Distribution title="Interesse principal" data={summary.main_interest} total={total}/>
     <Distribution title="Gasto geek mensal" data={summary.monthly_geek_spend} total={total}/>
     <Distribution title="Como descobriu o evento" data={summary.discovery_channel} total={total}/>
     <Distribution title="Motivo para participar" data={summary.reason} total={total}/>
     <Distribution title="Veio com" data={summary.came_with} total={total}/>
     <Distribution title="Tempo no evento" data={summary.time_at_event} total={total}/>
     <Distribution title="Áreas visitadas" data={summary.areas_visited} total={total} multi/>
     <Distribution title="Área de maior permanência" data={summary.longest_area} total={total}/>
     <Distribution title="Gasto no evento" data={summary.event_spend} total={total}/>
     <Distribution title="Onde gastou" data={summary.spend_categories} total={total} multi/>
     <Distribution title="Notas de satisfação" data={summary.score} total={total}/>
    </div>
   </section>

   <section className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-black">Respostas individuais</h2><p className="mt-1 text-xs text-slate-500">Mostrando até {PAGE_SIZE} por página. Você pode analisar pessoa por pessoa sem travar o painel.</p></div><p className="text-xs text-slate-500">Página {Math.min(currentPage,totalPages)} de {totalPages}</p></div>
    <div className="grid gap-3">{rows.map(f=><ResponseCard key={f.id} f={f}/>)}</div>
    {totalPages>1&&<div className="flex items-center justify-between gap-3">{currentPage>1?<Link href={`/admin/feedbacks?event=${selectedId}&page=${currentPage-1}`} className="rounded-xl border border-geek-line px-4 py-2 text-sm font-bold">← Anterior</Link>:<span/>}{currentPage<totalPages&&<Link href={`/admin/feedbacks?event=${selectedId}&page=${currentPage+1}`} className="rounded-xl border border-geek-line px-4 py-2 text-sm font-bold">Próxima →</Link>}</div>}
   </section>
  </>}
 </div>;
}

function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-geek-line bg-geek-panel p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>}

function Distribution({title,data,total,multi=false}:{title:string;data:any;total:number;multi?:boolean}){
 const entries=Object.entries((data&&typeof data==='object'?data:{}) as Record<string,number>).sort((a,b)=>Number(b[1])-Number(a[1]));
 const denominator=multi?Math.max(1,entries.reduce((s,[,v])=>s+Number(v),0)):Math.max(1,total);
 return <div className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-black">{title}</h3>{multi&&<span className="text-[10px] text-slate-500">múltipla escolha</span>}</div>{entries.length===0?<p className="mt-4 text-sm text-slate-500">Sem dados.</p>:<div className="mt-4 space-y-3">{entries.slice(0,12).map(([label,count])=>{const pct=(Number(count)/denominator)*100;return <div key={label}><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-300">{label}</span><b>{Number(count).toLocaleString('pt-BR')} · {pct.toFixed(1)}%</b></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-geek-orange" style={{width:`${Math.max(2,pct)}%`}}/></div></div>})}{entries.length>12&&<p className="text-[10px] text-slate-500">+ {entries.length-12} outras respostas no PDF.</p>}</div>}</div>
}

function ResponseCard({f}:{f:Feedback}){return <article className="rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><p className="text-xs text-slate-500">{new Date(f.created_at).toLocaleString('pt-BR')}</p><p className="mt-1 text-sm text-slate-300">{[f.age_range,f.city,f.occupation].filter(Boolean).join(' · ')||'Perfil não informado'}</p></div>{typeof f.score==='number'&&<span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm font-bold text-orange-300">Nota {f.score}/10</span>}</div><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3"><Info label="Interesse principal" value={f.main_interest}/><Info label="Gasto no evento" value={f.event_spend}/><Info label="Descobriu por" value={f.discovery_channel}/><Info label="Tempo no evento" value={f.time_at_event}/><Info label="Área de maior permanência" value={f.longest_area}/><Info label="Veio com" value={f.came_with}/><Info label="Turista" value={f.from_other_city===null?'Não informado':f.from_other_city?`Sim${f.nights?` · ${f.nights} noite(s)`:''}`:'Não'}/><Info label="Voltaria" value={f.would_return===null?'Não informado':f.would_return?'Sim':'Não'}/><Info label="Gasto geek mensal" value={f.monthly_geek_spend}/></div>{Array.isArray(f.interests)&&f.interests.length>0&&<div className="mt-3 flex flex-wrap gap-1.5">{f.interests.map((x:string)=><span key={x} className="rounded-full bg-geek-soft px-2 py-1 text-[10px] text-slate-300">{x}</span>)}</div>}{f.improvement&&<div className="mt-4 rounded-xl bg-geek-soft p-3 text-sm"><span className="text-slate-500">Sugestão:</span> {f.improvement}</div>}</article>}

function Info({label,value}:{label:string;value:any}){return <p><span className="text-slate-500">{label}:</span> {value||'Não informado'}</p>}
function percent(value:any,total:number){const n=Number(value||0);return total?`${n.toLocaleString('pt-BR')} · ${((n/total)*100).toFixed(1)}%`:'0 · 0,0%'}
