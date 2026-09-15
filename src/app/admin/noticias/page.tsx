import { createClient } from '@/lib/supabase/server';

export default async function AdminNoticiasPage() {
  const supabase = await createClient();
  const { data: news } = await supabase.from('news').select('id,title,source_name,category,active,published_at,created_at').order('created_at', { ascending: false }).limit(100);
  return <div className="mx-auto max-w-7xl space-y-5"><div><p className="text-sm font-bold text-geek-orange">ADMINISTRAÇÃO</p><h1 className="text-2xl sm:text-3xl font-black">Notícias</h1><p className="mt-2 text-sm text-slate-400">Conteúdos e links publicados no GeekoPlay.</p></div><div className="grid gap-3">{(news||[]).length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-8 text-center text-slate-400">Nenhuma notícia cadastrada ainda.</div>:(news||[]).map(item=><div key={item.id} className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><div className="flex flex-col sm:flex-row sm:justify-between gap-2"><div><b>{item.title}</b><p className="text-xs text-slate-400">{item.source_name || 'Fonte não informada'} · {item.category || 'Sem categoria'}</p></div><span className={`text-xs ${item.active?'text-green-400':'text-slate-500'}`}>{item.active?'Ativa':'Inativa'}</span></div></div>)}</div></div>;
}
