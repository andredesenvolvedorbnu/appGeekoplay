import { Suspense } from 'react';
import { ExploreClient } from '@/components/explore-client';

export default function Page(){
  return <Suspense fallback={<div className="mx-auto max-w-6xl px-3 py-16 text-center text-slate-400 sm:px-4">Carregando Explorar...</div>}><ExploreClient/></Suspense>;
}
