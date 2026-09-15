import { createClient } from '@/lib/supabase/server';

export default async function AdminAnunciosPage() {
  const supabase = await createClient();
  const { data: ads } = await supabase.from('ads').select('id,title,ad_type,placement,audience,active,starts_at,ends_at,created_at').order('created_at', { ascending: false }).limit(100);
  return <div className="mx-auto max-w-7xl space-y-5"><div><p className="text-sm font-bold text-geek-orange">ADMINISTRAÇÃO</p><h1 className="text-2xl sm:text-3xl font-black">Anúncios</h1><p className="mt-2 text-sm text-slate-400">Campanhas e espaços patrocinados da plataforma.</p></div><div className="grid gap-3">{(ads||[]).length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-8 text-center text-slate-400">Nenhum anúncio cadastrado ainda.</div>:(ads||[]).map(ad=><div key={ad.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><div className="flex flex-col sm:flex-row sm:justify-between gap-2"><div><b>{ad.title}</b><p className="text-xs text-slate-400">{ad.ad_type} · {ad.placement} · {ad.audience}</p></div><span className={`text-xs ${ad.active?'text-green-400':'text-slate-500'}`}>{ad.active?'Ativo':'Pausado'}</span></div></div>)}</div></div>;
}
