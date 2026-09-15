'use client';

import { useEffect,useMemo,useState } from 'react';
import { AlertTriangle, CalendarClock, Crown, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Profile={id:string;display_name:string;email:string|null;is_pro:boolean;pro_started_at:string|null;pro_expires_at:string|null};
type Plan={id:string;name:string;price:number;duration_days:number;is_active:boolean;last_adjusted_year:number};
type Request={id:string;user_id:string;plan_name:string|null;amount:number;status:string;requested_at:string;expires_at:string|null};
type AlertLog={id:string;user_id:string;alert_key:string;expires_at:string;created_at:string};

function fmtDate(value:string|null){return value?new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—'}
function fmtMoney(value:number){return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function daysLeft(value:string|null){return value?Math.ceil((new Date(value).getTime()-Date.now())/86400000):null}

export function AdminPremiumLifecycle(){
 const supabase=useMemo(()=>createClient(),[]);
 const [profiles,setProfiles]=useState<Profile[]>([]);const [plans,setPlans]=useState<Plan[]>([]);const [requests,setRequests]=useState<Request[]>([]);const [alerts,setAlerts]=useState<AlertLog[]>([]);const [loading,setLoading]=useState(true);const [running,setRunning]=useState(false);const [message,setMessage]=useState('');
 async function load(){setLoading(true);const [{data:p},{data:pl},{data:r},{data:a}]=await Promise.all([
  supabase.from('profiles').select('id,display_name,email,is_pro,pro_started_at,pro_expires_at').order('display_name'),
  supabase.from('premium_plans').select('id,name,price,duration_days,is_active,last_adjusted_year').order('sort_order'),
  supabase.from('premium_requests').select('id,user_id,plan_name,amount,status,requested_at,expires_at').order('requested_at',{ascending:false}).limit(200),
  supabase.from('premium_alert_log').select('id,user_id,alert_key,expires_at,created_at').order('created_at',{ascending:false}).limit(200)
 ]);setProfiles((p||[]) as Profile[]);setPlans((pl||[]) as Plan[]);setRequests((r||[]) as Request[]);setAlerts((a||[]) as AlertLog[]);setLoading(false)}
 useEffect(()=>{void load()},[supabase]);
 async function processNow(){setRunning(true);setMessage('');const {error}=await supabase.rpc('process_premium_lifecycle');setMessage(error?'Não foi possível processar os vencimentos agora.':'Vencimentos e alertas processados.');await load();setRunning(false)}
 if(loading)return <div className="grid place-items-center rounded-2xl border border-geek-line bg-geek-panel py-12"><Loader2 className="animate-spin text-geek-orange"/></div>;
 const active=profiles.filter(p=>p.is_pro);
 const expiring=active.filter(p=>{const d=daysLeft(p.pro_expires_at);return d!==null&&d>=0&&d<=30}).sort((a,b)=>(a.pro_expires_at||'').localeCompare(b.pro_expires_at||''));
 const expired=profiles.filter(p=>!p.is_pro&&p.pro_expires_at&&new Date(p.pro_expires_at).getTime()<=Date.now()).sort((a,b)=>(b.pro_expires_at||'').localeCompare(a.pro_expires_at||'')).slice(0,30);
 const pending=requests.filter(r=>r.status==='pending');
 const people=Object.fromEntries(profiles.map(p=>[p.id,p]));
 const currentYear=new Date().getFullYear();
 return <section className="space-y-4 rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-geek-orange">PRO · CICLO DE ASSINATURAS</p><h2 className="mt-1 text-xl font-semibold">Vencimentos, renovações e reajustes</h2><p className="mt-1 text-sm text-slate-400">Alertas automáticos em ~30 dias, 7 dias, 1 dia e no vencimento. Ao vencer, o status PRO é retirado automaticamente.</p></div><button onClick={()=>void processNow()} disabled={running} className="inline-flex items-center justify-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} className={running?'animate-spin':''}/>Processar agora</button></div>
  {message&&<div className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-sm text-slate-300">{message}</div>}
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[Crown,'PRO ativos',active.length],[AlertTriangle,'Vencem em até 30 dias',expiring.length],[CalendarClock,'Solicitações pendentes',pending.length],[TrendingUp,'Alertas enviados',alerts.length]].map(([Icon,label,value]:any)=><div key={label} className="rounded-2xl border border-geek-line bg-geek-bg p-4"><Icon size={18} className="text-geek-orange"/><p className="mt-2 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>

  <div className="grid gap-4 xl:grid-cols-2">
   <div className="overflow-hidden rounded-2xl border border-geek-line"><div className="border-b border-geek-line bg-geek-soft px-4 py-3"><h3 className="font-semibold">Alertas de vencimento</h3><p className="text-xs text-slate-500">Prioridade para quem está mais perto de perder os benefícios.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="px-4 py-3">Geek</th><th className="px-4 py-3">Vence</th><th className="px-4 py-3">Faltam</th><th className="px-4 py-3">Situação</th></tr></thead><tbody>{expiring.length===0?<tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Nenhum PRO perto do vencimento.</td></tr>:expiring.map(p=>{const d=daysLeft(p.pro_expires_at);return <tr key={p.id} className="border-t border-geek-line"><td className="px-4 py-3"><b className="font-semibold">{p.display_name}</b><div className="text-xs text-slate-500">{p.email||'Sem e-mail'}</div></td><td className="px-4 py-3">{fmtDate(p.pro_expires_at)}</td><td className="px-4 py-3">{d} dias</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${d!==null&&d<=7?'bg-red-500/10 text-red-300':'bg-amber-500/10 text-amber-300'}`}>{d!==null&&d<=1?'Crítico':d!==null&&d<=7?'Urgente':'Atenção'}</span></td></tr>})}</tbody></table></div></div>
   <div className="overflow-hidden rounded-2xl border border-geek-line"><div className="border-b border-geek-line bg-geek-soft px-4 py-3"><h3 className="font-semibold">Planos e reajuste anual</h3><p className="text-xs text-slate-500">Todo 1º de janeiro os planos ativos sobem 10% automaticamente.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="px-4 py-3">Plano</th><th className="px-4 py-3">Atual</th><th className="px-4 py-3">Próximo reajuste</th><th className="px-4 py-3">Ano aplicado</th></tr></thead><tbody>{plans.map(plan=><tr key={plan.id} className="border-t border-geek-line"><td className="px-4 py-3"><b className="font-semibold">{plan.name}</b><div className="text-xs text-slate-500">{plan.duration_days} dias</div></td><td className="px-4 py-3">{fmtMoney(plan.price)}</td><td className="px-4 py-3 text-yellow-300">{fmtMoney(Number(plan.price)*1.10)}</td><td className="px-4 py-3">{plan.last_adjusted_year||currentYear}</td></tr>)}</tbody></table></div></div>
  </div>

  <div className="overflow-hidden rounded-2xl border border-geek-line"><div className="border-b border-geek-line bg-geek-soft px-4 py-3"><h3 className="font-semibold">Histórico recente de vencidos</h3><p className="text-xs text-slate-500">Usuários que já perderam o status PRO e os benefícios vinculados.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="px-4 py-3">Geek</th><th className="px-4 py-3">Expirou em</th><th className="px-4 py-3">Último alerta</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{expired.length===0?<tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Nenhum vencimento registrado.</td></tr>:expired.map(p=>{const last=alerts.find(a=>a.user_id===p.id);return <tr key={p.id} className="border-t border-geek-line"><td className="px-4 py-3"><b className="font-semibold">{p.display_name}</b><div className="text-xs text-slate-500">{p.email||'Sem e-mail'}</div></td><td className="px-4 py-3">{fmtDate(p.pro_expires_at)}</td><td className="px-4 py-3">{last?last.alert_key.replace('expiring_','').replace('expired','Expirou'):'—'}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-500/10 px-2 py-1 text-xs text-slate-400">PRO encerrado</span></td></tr>})}</tbody></table></div></div>
 </section>
}
