'use client';

import { Users } from 'lucide-react';

export function DiscoverPeopleCta(){
  return <section className="mx-auto mb-4 max-w-2xl px-3 sm:px-4">
    <div className="flex flex-col gap-3 rounded-2xl border border-orange-500/25 bg-orange-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><Users size={19}/></div>
        <div><b className="text-sm">Conheça outros geeks</b><p className="mt-1 text-xs leading-5 text-slate-400">Veja pessoas que já estão no GeekoPlay e encontre perfis com interesses em comum.</p></div>
      </div>
      <button type="button" onClick={()=>window.dispatchEvent(new Event('geekoplay-open-discovery'))} className="shrink-0 rounded-xl bg-geek-orange px-4 py-2.5 text-sm font-black text-white">Ver geeks</button>
    </div>
  </section>;
}
