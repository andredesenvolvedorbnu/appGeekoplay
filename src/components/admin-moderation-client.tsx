'use client';

import { useEffect,useMemo,useState } from 'react';
import { AlertTriangle,Check,Image as ImageIcon,Loader2,RefreshCcw,ShieldAlert,XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type CaseRow={
 id:string;user_id:string;content_type:string;content_text:string|null;content_category:string|null;
 media_kind:string;decision:string;detected_categories:string[];rule_summary:string|null;model_summary:string|null;
 evidence_preview:string|null;admin_note:string|null;created_at:string;reviewed_at:string|null;
};
type AppealRow={id:string;case_id:string;user_id:string;message:string;status:string;admin_response:string|null;created_at:string};
type Profile={id:string;display_name:string;username:string|null};
type Filter='attention'|'blocked'|'approved'|'rejected'|'all';

const LABELS:Record<string,string>={
 sexual_suggestive:'Sensualidade não explícita',
 sexual_explicit:'Sexual explícito',
 child_safety:'Segurança de menores',
 violence_fictional:'Violência fictícia',
 violence_graphic:'Violência gráfica',
 weapons:'Armas/props',
 threats:'Ameaças',
 abuse_hate:'Abuso/ódio',
 self_harm:'Autolesão',
 dangerous_illicit:'Perigoso/ilícito',
 fraud_spam:'Fraude/spam',
 none:'Sem infração'
};

function statusLabel(value:string){
 if(value==='pending_review')return'Em revisão';
 if(value==='blocked')return'Bloqueado';
 if(value==='approved')return'Aprovado';
 if(value==='rejected')return'Rejeitado';
 return value;
}

export function AdminModerationClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [cases,setCases]=useState<CaseRow[]>([]);
 const [appeals,setAppeals]=useState<AppealRow[]>([]);
 const [profiles,setProfiles]=useState<Record<string,Profile>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [message,setMessage]=useState('');
 const [filter,setFilter]=useState<Filter>('attention');

 async function load(){
  setLoading(true);
  const [{data:caseRows},{data:appealRows}]=await Promise.all([
   supabase.from('moderation_cases').select('*').order('created_at',{ascending:false}).limit(300),
   supabase.from('moderation_appeals').select('*').order('created_at',{ascending:false}).limit(300)
  ]);
  const safeCases=(caseRows||[]) as CaseRow[];
  const safeAppeals=(appealRows||[]) as AppealRow[];
  setCases(safeCases);setAppeals(safeAppeals);
  const ids=[...new Set([...safeCases.map(c=>c.user_id),...safeAppeals.map(a=>a.user_id)])];
  if(ids.length){
   const {data}=await supabase.from('profiles').select('id,display_name,username').in('id',ids);
   const map:Record<string,Profile>={};((data||[]) as Profile[]).forEach(p=>map[p.id]=p);setProfiles(map);
  }else setProfiles({});
  setLoading(false);
 }

 useEffect(()=>{void load();const channel=supabase.channel('admin-moderation-live')
  .on('postgres_changes',{event:'*',schema:'public',table:'moderation_cases'},()=>void load())
  .on('postgres_changes',{event:'*',schema:'public',table:'moderation_appeals'},()=>void load())
  .subscribe();return()=>{void supabase.removeChannel(channel)}},[supabase]);

 async function reviewCase(caseId:string,decision:'approved'|'rejected'){
  const note=window.prompt(decision==='approved'?'Observação da liberação (opcional):':'Motivo da manutenção do bloqueio (opcional):')||'';
  setBusy(caseId);setMessage('');
  const {error}=await supabase.rpc('admin_review_moderation_case',{target_case:caseId,new_decision:decision,review_note:note});
  setMessage(error?'Não foi possível concluir a revisão.':decision==='approved'?'Conteúdo liberado para nova tentativa de publicação.':'Bloqueio mantido.');
  await load();setBusy(null);
 }

 async function reviewAppeal(appeal:AppealRow,status:'accepted'|'rejected'){
  const note=window.prompt(status==='accepted'?'Resposta para o usuário (opcional):':'Explique brevemente por que o bloqueio foi mantido (opcional):')||'';
  setBusy(appeal.id);setMessage('');
  const {error}=await supabase.rpc('admin_review_moderation_appeal',{target_appeal:appeal.id,new_status:status,response_note:note});
  setMessage(error?'Não foi possível revisar a contestação.':status==='accepted'?'Contestação aceita.':'Contestação rejeitada.');
  await load();setBusy(null);
 }

 const appealFor=(caseId:string)=>appeals.find(a=>a.case_id===caseId&&a.status==='pending')||appeals.find(a=>a.case_id===caseId);
 const visible=cases.filter(c=>{
  if(filter==='all')return true;
  if(filter==='attention')return c.decision==='pending_review'||c.decision==='blocked'||Boolean(appeals.find(a=>a.case_id===c.id&&a.status==='pending'));
  return c.decision===filter;
 });
 const attention=cases.filter(c=>c.decision==='pending_review'||c.decision==='blocked'||Boolean(appeals.find(a=>a.case_id===c.id&&a.status==='pending'))).length;

 return <div className="mx-auto max-w-7xl space-y-5">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-bold text-geek-orange">SEGURANÇA AUTOMÁTICA</p><h1 className="text-2xl font-black sm:text-3xl">Moderação de conteúdo</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Casos bloqueados ou retidos antes de aparecerem no GeekoPlay. Cosplay, sensualidade não explícita, armas cenográficas e violência fictícia são tratados com contexto.</p></div><div className="flex items-center gap-2"><span className="rounded-xl border border-geek-line bg-geek-panel px-4 py-3 text-sm"><b className="text-orange-300">{attention}</b> precisam de atenção</span><button onClick={()=>void load()} className="grid h-11 w-11 place-items-center rounded-xl border border-geek-line bg-geek-panel" aria-label="Atualizar"><RefreshCcw size={17}/></button></div></div>
  <div className="flex gap-2 overflow-x-auto pb-1">{([['attention','Atenção'],['blocked','Bloqueados'],['approved','Aprovados'],['rejected','Rejeitados'],['all','Todos']] as [Filter,string][]).map(([value,label])=><button key={value} onClick={()=>setFilter(value)} className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm ${filter===value?'border-orange-500/50 bg-orange-500/10 text-orange-300':'border-geek-line bg-geek-panel text-slate-400'}`}>{label}</button>)}</div>
  {message&&<div className="rounded-xl border border-geek-line bg-geek-panel px-4 py-3 text-sm text-slate-300">{message}</div>}
  {loading?<div className="grid place-items-center py-20"><Loader2 className="animate-spin text-geek-orange"/></div>:visible.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><ShieldAlert className="mx-auto mb-3 text-geek-orange"/>Nenhum caso nesta categoria.</div>:<div className="grid gap-4">{visible.map(row=>{
   const profile=profiles[row.user_id];const appeal=appealFor(row.id);const working=busy===row.id||busy===appeal?.id;
   return <article key={row.id} className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel">
    <div className="p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row"><div className="min-w-0 flex-1">
     <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.decision==='approved'?'bg-emerald-500/10 text-emerald-300':row.decision==='rejected'?'bg-slate-500/10 text-slate-300':'bg-orange-500/10 text-orange-300'}`}>{statusLabel(row.decision)}</span><span className="rounded-full bg-geek-soft px-2 py-1 text-[10px]">{row.content_type==='post'?'Publicação':'Comentário'}</span><span className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString('pt-BR')}</span></div>
     <h2 className="mt-3 font-black">{profile?.display_name||'Usuário'} <span className="font-normal text-slate-500">@{profile?.username||'geek'}</span></h2>
     {row.content_category&&<p className="mt-1 text-xs text-slate-500">Categoria declarada: {row.content_category}</p>}
     {row.content_text&&<div className="mt-3 rounded-xl bg-geek-soft p-3 text-sm leading-6 text-slate-300">{row.content_text}</div>}
     <div className="mt-3 flex flex-wrap gap-1.5">{row.detected_categories.map(cat=><span key={cat} className={`rounded-full border px-2 py-1 text-[10px] font-bold ${['sexual_suggestive','violence_fictional','weapons'].includes(cat)?'border-cyan-500/25 bg-cyan-500/10 text-cyan-200':'border-red-500/25 bg-red-500/10 text-red-200'}`}>{LABELS[cat]||cat}</span>)}</div>
     {row.rule_summary&&<p className="mt-3 text-sm font-semibold text-orange-200">{row.rule_summary}</p>}
     {row.model_summary&&<p className="mt-1 text-xs leading-5 text-slate-500">Análise: {row.model_summary}</p>}
     {appeal&&<div className="mt-4 rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4"><p className="text-xs font-black uppercase tracking-wider text-violet-300">Contestação · {appeal.status}</p><p className="mt-2 text-sm leading-6 text-slate-300">{appeal.message}</p>{appeal.admin_response&&<p className="mt-2 text-xs text-slate-400">Resposta ADM: {appeal.admin_response}</p>}</div>}
    </div>
    {row.evidence_preview?<div className="w-full shrink-0 xl:w-72"><div className="mb-2 flex items-center gap-2 text-xs text-slate-500"><ImageIcon size={14}/>Prévia privada para revisão</div><img src={row.evidence_preview} alt="Prévia do conteúdo sinalizado" className="max-h-80 w-full rounded-2xl border border-geek-line bg-black object-contain"/></div>:row.media_kind!=='none'?<div className="flex min-h-28 w-full shrink-0 items-center justify-center rounded-2xl border border-dashed border-geek-line text-center text-xs text-slate-500 xl:w-72"><span>Prévia não armazenada<br/>por segurança ou limite.</span></div>:null}
    </div></div>
    {(row.decision==='blocked'||row.decision==='pending_review')&&<div className="flex flex-col gap-2 border-t border-geek-line p-3 sm:flex-row sm:justify-end sm:p-4">{appeal?.status==='pending'?<><button disabled={working} onClick={()=>void reviewAppeal(appeal,'rejected')} className="min-h-11 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-bold text-red-300 disabled:opacity-50"><XCircle size={16} className="mr-2 inline"/>Rejeitar contestação</button><button disabled={working} onClick={()=>void reviewAppeal(appeal,'accepted')} className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"><Check size={16} className="mr-2 inline"/>Aceitar contestação</button></>:<><button disabled={working} onClick={()=>void reviewCase(row.id,'rejected')} className="min-h-11 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-bold text-red-300 disabled:opacity-50"><XCircle size={16} className="mr-2 inline"/>Manter bloqueio</button><button disabled={working} onClick={()=>void reviewCase(row.id,'approved')} className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"><Check size={16} className="mr-2 inline"/>Liberar conteúdo</button></>}</div>}
   </article>
  })}</div>}
 </div>;
}
