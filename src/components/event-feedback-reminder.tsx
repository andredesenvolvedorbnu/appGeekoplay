'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { CalendarCheck2, MessageSquareText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type PendingEvent={id:string;title:string;ends_at:string|null;starts_at:string};

export function EventFeedbackReminder(){
  const supabase=useMemo(()=>createClient(),[]);
  const [pending,setPending]=useState<PendingEvent[]>([]);

  useEffect(()=>{void (async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;

    const {data:attendance}=await supabase.from('event_attendees')
      .select('event_id,status')
      .eq('user_id',user.id)
      .in('status',['going','confirmed']);

    const ids=[...new Set((attendance||[]).map(row=>row.event_id).filter(Boolean))];
    if(!ids.length){setPending([]);return}

    const [{data:events},{data:feedback}]=await Promise.all([
      supabase.from('events')
        .select('id,title,starts_at,ends_at')
        .in('id',ids),
      supabase.from('event_feedback')
        .select('event_id')
        .eq('user_id',user.id)
        .in('event_id',ids)
    ]);

    const answered=new Set((feedback||[]).map(row=>row.event_id));
    const now=Date.now();
    const rows=((events||[]) as PendingEvent[])
      .filter(event=>{
        const end=new Date(event.ends_at||new Date(new Date(event.starts_at).getTime()+24*60*60*1000)).getTime();
        return end<now&&!answered.has(event.id);
      })
      .sort((a,b)=>{
        const aEnd=new Date(a.ends_at||a.starts_at).getTime();
        const bEnd=new Date(b.ends_at||b.starts_at).getTime();
        return bEnd-aEnd;
      });

    setPending(rows);
  })()},[supabase]);

  if(!pending.length)return null;
  const first=pending[0];

  return <section className="mx-auto mb-4 max-w-2xl px-3 sm:px-4">
    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300"><CalendarCheck2 size={19}/></div>
          <div>
            <b className="text-sm">Como foi o evento?</b>
            <p className="mt-1 text-sm font-semibold text-slate-200">{first.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">Você marcou presença neste evento e ele já terminou. Responda uma pesquisa rápida para ajudar a melhorar as próximas experiências.</p>
            {pending.length>1&&<p className="mt-1 text-[11px] text-slate-500">Você ainda tem {pending.length} eventos aguardando avaliação.</p>}
          </div>
        </div>
        <Link href={`/eventos/${first.id}/avaliar`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-white"><MessageSquareText size={16}/>Avaliar evento</Link>
      </div>
    </div>
  </section>;
}
