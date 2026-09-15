import { createClient } from '@/lib/supabase/server';

export default async function AdminEventosPage() {
  const supabase = await createClient();
  const { data: events } = await supabase.from('events').select('id,title,category,city,state,starts_at,ends_at,created_at').order('starts_at', { ascending: true }).limit(100);
  return <div className="mx-auto max-w-7xl space-y-5"><div><p className="text-sm font-bold text-geek-orange">ADMINISTRAÇÃO</p><h1 className="text-2xl sm:text-3xl font-black">Eventos</h1><p className="mt-2 text-sm text-slate-400">Gerencie os eventos oficiais exibidos aos usuários.</p></div><div className="grid gap-3">{(events||[]).length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-8 text-center text-slate-400">Nenhum evento cadastrado ainda.</div>:(events||[]).map(e=><div key={e.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between"><div><b>{e.title}</b><p className="text-xs text-slate-400">{e.category || 'Sem categoria'} · {[e.city,e.state].filter(Boolean).join(' / ') || 'Local não informado'}</p></div><span className="text-xs text-slate-400">{new Date(e.starts_at).toLocaleString('pt-BR')}</span></div></div>)}</div></div>;
}
