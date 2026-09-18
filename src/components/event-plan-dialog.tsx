'use client';

import { useMemo,useState } from 'react';
import { CalendarHeart, Loader2, MapPin, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function EventPlanDialog({open,userId,onClose,onSaved}:{open:boolean;userId:string|null;onClose:()=>void;onSaved:()=>Promise<void>|void}){
 const supabase=useMemo(()=>createClient(),[]);
 const [title,setTitle]=useState('');
 const [date,setDate]=useState('');
 const [location,setLocation]=useState('');
 const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 if(!open)return null;

 async function save(share:boolean){
  setError('');
  if(!userId){setError('Sua sessão expirou. Entre novamente para continuar.');return}
  if(title.trim().length<2){setError('Digite o nome do evento.');return}
  if(!date){setError('Informe a data e o horário do evento.');return}
  if(location.trim().length<2){setError('Informe o local do evento.');return}
  const parsed=new Date(date);
  if(Number.isNaN(parsed.getTime())){setError('Informe uma data válida.');return}
  setBusy(true);
  let createdPlanId:string|null=null;
  let createdPostId:string|null=null;
  try{
   const cleanTitle=title.trim();const cleanLocation=location.trim();const cleanNote=note.trim();
   const {data:plan,error:planError}=await supabase.from('user_event_plans').insert({user_id:userId,title:cleanTitle,event_date:parsed.toISOString(),location:cleanLocation,note:cleanNote||null}).select('id').single();
   if(planError||!plan)throw planError||new Error('Falha ao salvar evento.');
   createdPlanId=plan.id;
   if(share){
    const cardData={event_plan_id:plan.id,title:cleanTitle,event_date:parsed.toISOString(),location:cleanLocation,note:cleanNote||null};
    const details=[`🎟️ Vou em ${cleanTitle}!`,`📅 ${parsed.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}`,`📍 ${cleanLocation}`,cleanNote||null].filter(Boolean).join('\n');
    const {data:post,error:postError}=await supabase.from('posts').insert({author_id:userId,content:details,category:'Eventos',post_type:'event_plan',card_data:cardData}).select('id').single();
    if(postError||!post)throw postError||new Error('Falha ao compartilhar evento.');
    createdPostId=post.id;
    const {error:linkError}=await supabase.from('user_event_plans').update({shared_post_id:post.id,updated_at:new Date().toISOString()}).eq('id',plan.id).eq('user_id',userId);
    if(linkError)throw linkError;
   }
   setTitle('');setDate('');setLocation('');setNote('');await onSaved();onClose();
  }catch{
   if(createdPostId)await supabase.from('posts').delete().eq('id',createdPostId).eq('author_id',userId);
   if(createdPlanId)await supabase.from('user_event_plans').delete().eq('id',createdPlanId).eq('user_id',userId);
   setError('Não foi possível salvar o evento. Nenhuma cópia incompleta foi mantida; tente novamente.');
  }finally{setBusy(false)}
 }

 return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-3" role="dialog" aria-modal="true">
  <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-geek-line bg-geek-panel shadow-2xl">
   <div className="flex items-center justify-between border-b border-geek-line px-4 py-3"><div><h2 className="flex items-center gap-2 font-black"><CalendarHeart size={19} className="text-geek-orange"/>Evento que vou</h2><p className="mt-0.5 text-xs text-slate-400">Salve no perfil ou compartilhe com a sua rede.</p></div><button onClick={onClose} className="rounded-xl p-2 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button></div>
   <div className="grid gap-3 p-4 sm:p-5"><label className="grid gap-1 text-sm"><span className="font-semibold">Nome do evento</span><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} placeholder="Ex.: CCXP 2027" className="rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none focus:border-geek-orange"/></label><label className="grid gap-1 text-sm"><span className="font-semibold">Data e horário</span><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none focus:border-geek-orange"/></label><label className="grid gap-1 text-sm"><span className="font-semibold">Local</span><div className="flex items-center rounded-xl border border-geek-line bg-geek-soft px-3 focus-within:border-geek-orange"><MapPin size={16} className="shrink-0 text-slate-500"/><input value={location} onChange={e=>setLocation(e.target.value)} maxLength={180} placeholder="Cidade, espaço ou endereço" className="min-w-0 flex-1 bg-transparent px-2 py-3 outline-none"/></div></label><label className="grid gap-1 text-sm"><span className="font-semibold">Nota <span className="font-normal text-slate-500">(opcional)</span></span><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} placeholder="Com quem você vai, o que está mais animado para ver..." className="min-h-24 resize-y rounded-xl border border-geek-line bg-geek-soft p-3 outline-none focus:border-geek-orange"/></label>{error&&<p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}</div>
   <div className="grid gap-2 border-t border-geek-line p-4 sm:grid-cols-2"><button onClick={()=>void save(false)} disabled={busy} className="rounded-xl border border-geek-line px-4 py-3 font-bold disabled:opacity-50">{busy?<Loader2 size={17} className="mx-auto animate-spin"/>:'Salvar no perfil'}</button><button onClick={()=>void save(true)} disabled={busy} className="rounded-xl bg-geek-orange px-4 py-3 font-black disabled:opacity-50">{busy?'Salvando...':'Salvar e compartilhar'}</button></div>
  </div>
 </div>;
}
