import { Suspense } from 'react';
import { EventsClient } from '@/components/events-client';

export default function Page(){
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-3 py-10 text-sm text-slate-400 sm:px-4">Carregando eventos...</div>}>
      <EventsClient/>
    </Suspense>
  );
}
