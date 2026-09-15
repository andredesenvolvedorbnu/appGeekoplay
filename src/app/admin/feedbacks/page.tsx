import { createClient } from '@/lib/supabase/server';

export default async function AdminFeedbacksPage(){
  const supabase=await createClient();
  const [{data:feedbacks},{data:events}]=await Promise.all([
    supabase.from('event_feedback').select('*').order('created_at',{ascending:false}).limit(300),
    supabase.from('events').select('id,title').order('starts_at',{ascending:false})
  ]);
  const eventMap=new Map((events||[]).map((e:any)=>[e.id,e.title]));
  const validScores=(feedbacks||[]).map((f:any)=>f.score).filter((v:any)=>typeof v==='number');
  const avg=validScores.length?(validScores.reduce((a:number,b:number)=>a+b,0)/validScores.length).toFixed(1):'—';
  const tourism=(feedbacks||[]).filter((f:any)=>f.from_other_city===true).length;
  const returnYes=(feedbacks||[]).filter((f:any)=>f.would_return===true).length;
  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-sm font-bold text-geek-orange">INTELIGÊNCIA DE EVENTOS</p><h1 className="text-2xl sm:text-3xl font-black">Feedbacks</h1><p className="mt-2 text-sm text-slate-400">Resultados das pesquisas pós-evento, visíveis somente para administradores.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Respostas',(feedbacks||[]).length],['Nota média',avg],['Vieram de outra cidade',tourism],['Voltariam ao evento',returnYes]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-geek-line bg-geek-panel p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div>
    <div className="grid gap-3">{(feedbacks||[]).length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400">Ainda não há respostas de pesquisas.</div>:(feedbacks||[]).map((f:any)=><article key={f.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><b>{eventMap.get(f.event_id)||'Evento'}</b><p className="text-xs text-slate-500">{new Date(f.created_at).toLocaleString('pt-BR')}</p></div>{typeof f.score==='number'&&<span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm font-bold text-orange-300">Nota {f.score}/10</span>}</div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><p><span className="text-slate-500">Perfil:</span> {[f.age_range,f.city,f.occupation].filter(Boolean).join(' · ')||'Não informado'}</p><p><span className="text-slate-500">Interesse principal:</span> {f.main_interest||'Não informado'}</p><p><span className="text-slate-500">Gasto no evento:</span> {f.event_spend||'Não informado'}</p><p><span className="text-slate-500">Turista:</span> {f.from_other_city===null?'Não informado':f.from_other_city?'Sim':'Não'}{f.from_other_city&&f.nights?` · ${f.nights} noite(s)`:''}</p><p><span className="text-slate-500">Voltaria:</span> {f.would_return===null?'Não informado':f.would_return?'Sim':'Não'}</p><p><span className="text-slate-500">Descobriu por:</span> {f.discovery_channel||'Não informado'}</p></div>{f.improvement&&<div className="mt-4 rounded-xl bg-geek-soft p-3 text-sm"><span className="text-slate-500">Sugestão:</span> {f.improvement}</div>}</article>)}</div>
  </div>;
}
