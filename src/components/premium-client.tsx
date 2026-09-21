'use client';

import { useEffect,useMemo,useState } from 'react';
import { AlertTriangle, CalendarDays, Check, Crown, CreditCard, Info, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PaymentMethodDialog } from '@/components/payment-method-dialog';

type Settings={premium_payment_url:string|null;pro_hides_ads:boolean};
type Plan={id:string;name:string;price:number;duration_days:number;billing_months:number;description:string|null;payment_url:string|null;sort_order:number};
type Benefit={id:string;title:string;description:string|null;sort_order:number};
type PlanBenefit={plan_id:string;benefit_id:string;sort_order:number};
type Request={id:string;amount:number;status:string;requested_at:string;reviewed_at:string|null;duration_days:number|null;period_label:string|null;starts_at:string|null;expires_at:string|null;plan_id:string|null;plan_name:string|null};
type Profile={is_pro:boolean;pro_expires_at:string|null};

function fmtDate(value:string|null|undefined){return value?new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}):null}
function fmtPrice(value:number){return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function daysUntil(value:string|null){if(!value)return null;return Math.ceil((new Date(value).getTime()-Date.now())/86400000)}
function monthsForPlan(plan:Plan){return Math.max(1,Number(plan.billing_months)||Math.round(plan.duration_days/30))}

export function PremiumClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [settings,setSettings]=useState<Settings|null>(null);
 const [plans,setPlans]=useState<Plan[]>([]);
 const [benefits,setBenefits]=useState<Benefit[]>([]);
 const [planBenefits,setPlanBenefits]=useState<PlanBenefit[]>([]);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [request,setRequest]=useState<Request|null>(null);
 const [profile,setProfile]=useState<Profile>({is_pro:false,pro_expires_at:null});
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState(false);
 const [message,setMessage]=useState('');
 const [paymentRequestId,setPaymentRequestId]=useState<string|null>(null);

 async function load(){
  const {data:{user}}=await supabase.auth.getUser();if(!user)return;
  await supabase.rpc('refresh_my_pro_status');
  const [{data:s},{data:planRows},{data:benefitRows},{data:linkRows},{data:p},{data:r}]=await Promise.all([
   supabase.from('monetization_settings').select('premium_payment_url,pro_hides_ads').eq('id','default').single(),
   supabase.from('premium_plans').select('id,name,price,duration_days,billing_months,description,payment_url,sort_order').eq('is_active',true).order('sort_order',{ascending:true}),
   supabase.from('premium_benefits').select('id,title,description,sort_order').eq('is_active',true).order('sort_order',{ascending:true}),
   supabase.from('premium_plan_benefits').select('plan_id,benefit_id,sort_order').order('sort_order',{ascending:true}),
   supabase.from('profiles').select('is_pro,pro_expires_at').eq('id',user.id).single(),
   supabase.from('premium_requests').select('id,amount,status,requested_at,reviewed_at,duration_days,period_label,starts_at,expires_at,plan_id,plan_name').eq('user_id',user.id).order('requested_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  const nextPlans=(planRows||[]) as Plan[];
  setSettings(s as Settings|null);setPlans(nextPlans);setBenefits((benefitRows||[]) as Benefit[]);setPlanBenefits((linkRows||[]) as PlanBenefit[]);setSelectedId(current=>current&&nextPlans.some(p=>p.id===current)?current:nextPlans[0]?.id||null);setProfile((p as Profile|null)||{is_pro:false,pro_expires_at:null});setRequest(r as Request|null);setLoading(false)
 }
 useEffect(()=>{void load()},[supabase]);

 const selected=plans.find(plan=>plan.id===selectedId)||plans[0]||null;
 const pendingPlan=plans.find(plan=>plan.id===request?.plan_id)||null;
 const activeUntil=profile.pro_expires_at||request?.expires_at;
 const remainingDays=daysUntil(activeUntil||null);
 const renewalOpen=profile.is_pro&&remainingDays!==null&&remainingDays<=30;
 const canChoosePlan=(!profile.is_pro||renewalOpen)&&request?.status!=='pending';
 const baselinePlan=[...plans].sort((a,b)=>monthsForPlan(a)-monthsForPlan(b))[0]||null;
 const baselineMonthly=baselinePlan?Number(baselinePlan.price)/monthsForPlan(baselinePlan):0;
 const benefitsFor=(plan:Plan|null)=>{if(!plan)return[];const ids=new Set(planBenefits.filter(link=>link.plan_id===plan.id).map(link=>link.benefit_id));return benefits.filter(b=>ids.has(b.id)).sort((a,b)=>a.sort_order-b.sort_order)};
 const selectedBenefits=benefitsFor(selected);

 function savingsFor(plan:Plan){
  if(!baselinePlan||plan.id===baselinePlan.id||baselineMonthly<=0)return null;
  const months=monthsForPlan(plan);
  const reference=baselineMonthly*months;
  if(reference<=Number(plan.price))return null;
  const amount=reference-Number(plan.price);
  const percent=Math.round((amount/reference)*100);
  return {amount,percent,monthly:Number(plan.price)/months};
 }

 async function startCheckout(requestId:string){
  setWorking(true);setMessage('');
  try{
    const response=await fetch('/api/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'premium',requestId})});
    const data=await response.json();
    if(!response.ok||!data.checkoutUrl){setMessage(data.error||'Não foi possível abrir o pagamento.');return false}
    window.location.href=data.checkoutUrl;
    return true;
  }catch{setMessage('Não foi possível conectar ao Mercado Pago. Tente novamente.');return false}
  finally{setWorking(false)}
 }
 async function requestPremium(){
  if(!selected){setMessage('Nenhum plano PRO está disponível no momento.');return}
  setWorking(true);setMessage('');
  const {data,error}=await supabase.rpc('request_premium',{selected_plan:selected.id});
  if(error){setMessage(error.message.includes('PENDING')?'Você já possui uma solicitação Premium em análise.':error.message.includes('RENEWAL_NOT_OPEN')?'A renovação antecipada abre quando faltarem 30 dias para o vencimento.':error.message.includes('PLAN_NOT_FOUND')?'Este plano não está mais disponível. Escolha outro.':'Não foi possível criar a solicitação Premium.');setWorking(false);return}
  setWorking(false);
  if(data)setPaymentRequestId(String(data));
  else{setMessage('Solicitação criada, mas não foi possível iniciar o checkout.');await load()}
 }
 async function cancel(){if(!request)return;setWorking(true);const {error}=await supabase.from('premium_requests').update({status:'cancelled'}).eq('id',request.id).eq('status','pending');setMessage(error?'Não foi possível cancelar a solicitação.':'Solicitação cancelada.');await load();setWorking(false)}

 if(loading)return <div className="grid place-items-center py-24 text-slate-400"><Loader2 className="animate-spin text-geek-orange"/></div>;
 const status=request?.status;
 const requestDuration=request?.duration_days||pendingPlan?.duration_days||0;
 const requestPeriod=request?.plan_name||request?.period_label||pendingPlan?.name||'PRO';

 return <div className="mx-auto max-w-5xl px-3 pb-10 sm:px-4">
  <section className="overflow-hidden rounded-3xl border border-yellow-600/35 bg-gradient-to-br from-yellow-500/10 via-geek-panel to-orange-500/5 p-5 sm:p-8"><div className="max-w-3xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300"><Crown size={15}/>GEEKOPLAY PRO</div><h1 className="text-3xl font-semibold sm:text-4xl">Mais destaque para sua identidade geek.</h1><p className="mt-3 leading-7 text-slate-300">Quanto mais tempo você escolhe, maior pode ser a economia e maior o pacote de benefícios. Compare os planos antes de continuar.</p></div></section>

  {profile.is_pro&&remainingDays!==null&&remainingDays<=30&&<section className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={20}/><div><h2 className="font-semibold text-amber-200">Seu PRO está perto do vencimento</h2><p className="mt-1 text-sm leading-6 text-slate-300">Faltam aproximadamente <b className="font-semibold text-white">{Math.max(0,remainingDays)} dias</b>. Você já pode renovar agora e o novo período será somado ao final da assinatura atual, sem perder os dias que ainda restam.</p></div></div></section>}

  {canChoosePlan&&<section className="mt-5"><div className="mb-3"><h2 className="text-lg font-semibold">{profile.is_pro?'Renove seu plano':'Escolha seu plano'}</h2><p className="mt-1 text-sm text-slate-400">Planos maiores podem combinar economia maior com mais vantagens PRO.</p></div>{plans.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-8 text-center text-slate-400">Nenhum plano PRO disponível no momento.</div>:<div className="grid gap-3 md:grid-cols-3">{plans.map(plan=>{const active=selected?.id===plan.id;const savings=savingsFor(plan);const months=monthsForPlan(plan);const monthly=Number(plan.price)/months;const planBenefitCount=benefitsFor(plan).length;return <button key={plan.id} type="button" onClick={()=>{setSelectedId(plan.id);setMessage('')}} className={`relative rounded-2xl border p-5 text-left transition ${active?'border-yellow-400 bg-yellow-500/10 shadow-[0_0_0_1px_rgba(250,204,21,.15)]':'border-geek-line bg-geek-panel hover:border-yellow-500/40'}`}><div className="flex items-start justify-between gap-2"><span className="font-semibold text-white">{plan.name}</span><div className="flex flex-col items-end gap-1">{savings&&<span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300">ECONOMIZE {savings.percent}%</span>}{active&&<span className="rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-semibold text-black">SELECIONADO</span>}</div></div><p className="mt-4 text-3xl font-semibold text-yellow-300">{fmtPrice(plan.price)}</p><p className="mt-1 text-xs text-slate-500">{plan.duration_days} dias de acesso PRO</p><p className="mt-2 text-xs text-slate-400">Equivale a cerca de <b className="font-semibold text-white">{fmtPrice(monthly)}/mês</b></p>{savings&&<p className="mt-1 text-xs font-semibold text-emerald-300">Economia aproximada de {fmtPrice(savings.amount)} contra renovações do {baselinePlan?.name}.</p>}<p className="mt-2 text-xs font-semibold text-orange-200">{planBenefitCount} {planBenefitCount===1?'benefício incluído':'benefícios incluídos'}</p>{plan.description&&<p className="mt-3 text-sm leading-5 text-slate-400">{plan.description}</p>}</button>})}</div>}</section>}

  {selected&&canChoosePlan&&<section className="mt-5 rounded-2xl border border-orange-500/25 bg-orange-500/5 p-4 sm:p-5"><div className="flex items-start gap-3"><Info size={20} className="mt-0.5 shrink-0 text-geek-orange"/><div className="w-full"><h2 className="font-semibold">Antes de {profile.is_pro?'renovar':'assinar'} o plano {selected.name}</h2><div className="mt-2 grid gap-2 text-sm leading-6 text-slate-300 sm:grid-cols-2"><p><b className="font-semibold text-white">Valor:</b> {fmtPrice(selected.price)}.</p><p><b className="font-semibold text-white">Duração:</b> {selected.duration_days} dias de GeekoPlay PRO.</p><p><b className="font-semibold text-white">Início:</b> {profile.is_pro?'o novo período começa ao terminar o PRO atual.':'o período começa quando o Mercado Pago confirmar o pagamento.'}</p><p><b className="font-semibold text-white">Renovação:</b> não é automática. Uma nova compra será necessária ao final.</p><p className="sm:col-span-2"><b className="font-semibold text-white">Reajuste:</b> os valores dos planos recebem reajuste anual automático de 10%.</p></div></div></div></section>}

  <div className="mt-5 grid gap-4 md:grid-cols-2">
   <section className="rounded-2xl border border-geek-line bg-geek-panel p-5"><div className="flex items-end justify-between gap-3"><div><h2 className="font-semibold">Benefícios do {selected?.name||'PRO'}</h2><p className="mt-1 text-xs text-slate-500">A lista muda conforme o plano selecionado.</p></div>{selectedBenefits.length>0&&<span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-200">{selectedBenefits.length}</span>}</div><div className="mt-4 space-y-3 text-sm text-slate-300">{selectedBenefits.length?selectedBenefits.map(item=><div key={item.id} className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-green-400"/><div><span>{item.title}</span>{item.description&&<p className="mt-0.5 text-xs text-slate-500">{item.description}</p>}</div></div>):<p className="text-sm text-slate-500">Nenhum benefício específico foi configurado para este plano.</p>}</div></section>
   <section className="rounded-2xl border border-geek-line bg-geek-panel p-5"><h2 className="font-semibold">Sua assinatura</h2>
    {status==='pending'?<div className="mt-4 space-y-3"><div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4"><p className="font-semibold text-yellow-300">Solicitação em análise</p><p className="mt-1 text-sm text-slate-400">Plano {requestPeriod} · {requestDuration} {requestDuration===1?'dia':'dias'} · {fmtPrice(Number(request?.amount||0))}</p><p className="mt-2 text-xs leading-5 text-slate-500">O prazo só começa depois que o Mercado Pago confirmar o pagamento.</p></div><button onClick={()=>request&&setPaymentRequestId(request.id)} disabled={working} className="flex w-full items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-semibold disabled:opacity-60"><CreditCard size={17}/>Escolher forma de pagamento</button><button onClick={cancel} disabled={working} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 px-4 py-3 font-semibold text-red-300"><X size={17}/>Cancelar solicitação</button></div>
    :profile.is_pro?<div className="mt-4"><div className="rounded-2xl border border-green-500/25 bg-green-500/10 p-4"><div className="flex items-center gap-2 font-semibold text-green-300"><ShieldCheck size={20}/>Você é GeekoPlay PRO</div>{activeUntil&&<div className="mt-3 flex items-start gap-2 text-sm text-slate-300"><CalendarDays size={17} className="mt-0.5 shrink-0"/><span>Seu acesso está ativo até <b className="font-semibold text-white">{fmtDate(activeUntil)}</b>.</span></div>}</div>{renewalOpen&&selected&&<button onClick={requestPremium} disabled={working} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-semibold disabled:opacity-60"><Sparkles size={17}/>{working?'Criando renovação...':`Renovar com ${selected.name}`}</button>}</div>
    :<div className="mt-4">{selected?<><div className="rounded-xl border border-geek-line bg-geek-soft p-3"><p className="text-xs text-slate-500">Plano escolhido</p><div className="mt-1 flex items-end justify-between gap-3"><div><p className="font-semibold text-white">{selected.name}</p><p className="text-xs text-slate-400">{selected.duration_days} dias · {selectedBenefits.length} benefícios</p></div><p className="text-xl font-semibold text-yellow-300">{fmtPrice(selected.price)}</p></div></div><button onClick={requestPremium} disabled={working} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-semibold disabled:opacity-60"><Sparkles size={17}/>{working?'Criando solicitação...':`Escolher ${selected.name}`}</button></>:<p className="text-sm text-slate-400">Escolha um plano acima para continuar.</p>}</div>}
    {message&&<p className="mt-3 text-sm text-slate-300">{message}</p>}
   </section>
  </div>
  <PaymentMethodDialog open={Boolean(paymentRequestId)} kind="premium" requestId={paymentRequestId} amount={Number(request?.amount||selected?.price||0)} title={request?.plan_name||selected?.name||'GeekoPlay PRO'} onClose={()=>{setPaymentRequestId(null);void load()}} onApproved={()=>void load()}/>
 </div>
}
