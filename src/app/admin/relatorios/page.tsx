import { createClient } from '@/lib/supabase/server';

export default async function AdminRelatoriosPage() {
  const supabase = await createClient();
  const [profiles, feedbacks, ads, adEvents] = await Promise.all([
    supabase.from('profiles').select('is_pro,role'),
    supabase.from('event_feedback').select('score,would_return,created_at'),
    supabase.from('ads').select('id,title,active'),
    supabase.from('ad_events').select('ad_id,event_type'),
  ]);

  const users = profiles.data || [];
  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.is_pro).length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const responses = feedbacks.data || [];
  const scores = responses.map(r => r.score).filter((v): v is number => typeof v === 'number');
  const avgScore = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '—';
  const events = adEvents.data || [];
  const impressions = events.filter(e => e.event_type === 'impression').length;
  const clicks = events.filter(e => e.event_type === 'click').length;
  const ctr = impressions ? ((clicks / impressions) * 100).toFixed(1) : '0.0';

  return <div className="mx-auto max-w-7xl space-y-6"><div><p className="text-sm font-bold text-geek-orange">ADMINISTRAÇÃO</p><h1 className="text-2xl sm:text-3xl font-black">Relatórios</h1><p className="mt-2 text-sm text-slate-400">Indicadores gerais do GeekoPlay.</p></div><section className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Usuários" value={String(totalUsers)}/><Metric label="Premium" value={String(premiumUsers)}/><Metric label="Administradores" value={String(adminUsers)}/><Metric label="Nota média de eventos" value={avgScore}/><Metric label="Respostas de pesquisa" value={String(responses.length)}/><Metric label="Impressões de anúncios" value={String(impressions)}/><Metric label="Cliques em anúncios" value={String(clicks)}/><Metric label="CTR" value={`${ctr}%`}/></section><section className="rounded-2xl border border-geek-line bg-geek-panel p-5"><h2 className="font-bold">Campanhas cadastradas</h2><div className="mt-4 grid gap-2">{(ads.data||[]).length===0?<p className="text-sm text-slate-400">Nenhuma campanha ainda.</p>:(ads.data||[]).map(ad=><div key={ad.id} className="flex items-center justify-between rounded-xl border border-geek-line bg-geek-soft px-4 py-3 text-sm"><span>{ad.title}</span><span className={ad.active?'text-green-400':'text-slate-500'}>{ad.active?'Ativa':'Pausada'}</span></div>)}</div></section></div>;
}

function Metric({ label, value }: { label:string; value:string }) { return <div className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><p className="text-xs sm:text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl sm:text-3xl font-black">{value}</p></div>; }
