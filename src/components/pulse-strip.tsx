'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Pulse={id:string;author_id:string;image_url:string;caption:string|null;fandom:string|null;expires_at:string;created_at:string};
type Profile={id:string;display_name:string;avatar_url:string|null};

export function PulseStrip(){
  const supabase=useMemo(()=>createClient(),[]);
  const inputRef=useRef<HTMLInputElement>(null);
  const [userId,setUserId]=useState<string|null>(null);
  const [pulses,setPulses]=useState<Pulse[]>([]);
  const [profiles,setProfiles]=useState<Record<string,Profile>>({});
  const [viewerIndex,setViewerIndex]=useState<number|null>(null);
  const [creating,setCreating]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState<string|null>(null);
  const [caption,setCaption]=useState('');
  const [fandom,setFandom]=useState('');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  async function load(){
    const {data:{user}}=await supabase.auth.getUser(); setUserId(user?.id||null);
    const {data:rows}=await supabase.from('pulses').select('id,author_id,image_url,caption,fandom,expires_at,created_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(50);
    const safe=(rows||[]) as Pulse[]; setPulses(safe);
    const ids=[...new Set(safe.map(p=>p.author_id))];
    if(ids.length){const {data:people}=await supabase.from('profiles').select('id,display_name,avatar_url').in('id',ids);const map:Record<string,Profile>={};(people||[]).forEach((p:Profile)=>map[p.id]=p);setProfiles(map)}
  }

  useEffect(()=>{void load();const channel=supabase.channel('pulses-live').on('postgres_changes',{event:'*',schema:'public',table:'pulses'},()=>{void load()}).subscribe();return()=>{void supabase.removeChannel(channel)}},[supabase]);

  function choose(fileValue:File|null){
    setError('');
    if(!fileValue){setFile(null);if(preview)URL.revokeObjectURL(preview);setPreview(null);return;}
    if(!['image/jpeg','image/png','image/webp'].includes(fileValue.type)){setError('Use uma imagem JPG, PNG ou WEBP.');return;}
    if(fileValue.size>10*1024*1024){setError('A imagem precisa ter no máximo 10 MB.');return;}
    if(preview)URL.revokeObjectURL(preview);setFile(fileValue);setPreview(URL.createObjectURL(fileValue));
  }

  async function save(){
    if(!userId||!file)return;
    setSaving(true);setError('');
    try{
      const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';
      const path=`${userId}/${crypto.randomUUID()}.${ext}`;
      const {error:uploadError}=await supabase.storage.from('pulses').upload(path,file,{contentType:file.type,cacheControl:'3600'});
      if(uploadError)throw uploadError;
      const {data:urlData}=supabase.storage.from('pulses').getPublicUrl(path);
      const {error:insertError}=await supabase.from('pulses').insert({author_id:userId,image_url:urlData.publicUrl,caption:caption.trim()||null,fandom:fandom.trim()||null,expires_at:new Date(Date.now()+24*60*60*1000).toISOString()});
      if(insertError)throw insertError;
      choose(null);setCaption('');setFandom('');setCreating(false);await load();
    }catch{setError('Não foi possível publicar o Pulse. Tente novamente.')}finally{setSaving(false)}
  }

  const groups=Object.values(pulses.reduce((acc,p)=>{(acc[p.author_id] ||= []).push(p);return acc},{} as Record<string,Pulse[]>));
  const flattened=groups.flat();
  const active=viewerIndex!==null?flattened[viewerIndex]:null;
  const author=active?profiles[active.author_id]:null;

  return <>
    <div className="mx-auto max-w-2xl px-3 sm:px-4 mb-4">
      <div className="overflow-x-auto pb-2"><div className="flex gap-3 min-w-max">
        <button onClick={()=>setCreating(true)} className="flex w-20 flex-col items-center gap-2 text-xs text-slate-300"><span className="relative grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-geek-orange bg-geek-panel"><Plus className="text-geek-orange"/></span><span className="max-w-20 truncate">Seu Pulse</span></button>
        {groups.map(group=>{const first=group[0];const p=profiles[first.author_id];const firstIndex=flattened.findIndex(x=>x.id===first.id);return <button key={first.author_id} onClick={()=>setViewerIndex(firstIndex)} className="flex w-20 flex-col items-center gap-2 text-xs text-slate-300"><span className="h-16 w-16 rounded-full p-[2px] bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600"><span className="block h-full w-full rounded-full bg-geek-bg p-[2px]"><span className="block h-full w-full overflow-hidden rounded-full bg-geek-soft">{p?.avatar_url?<img src={p.avatar_url} alt="" className="h-full w-full object-cover object-center"/>:<img src={first.image_url} alt="" className="h-full w-full object-cover object-center"/>}</span></span></span><span className="max-w-20 truncate">{p?.display_name||'Geek'}</span></button>})}
      </div></div>
    </div>

    {creating&&<div className="fixed inset-0 z-[70] bg-black/80 p-3 sm:p-6 grid place-items-center"><div className="w-full max-w-md rounded-3xl border border-geek-line bg-[#171b22] p-4 sm:p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Criar Pulse</h2><p className="text-xs text-slate-400">Imagem vertical recomendada. Duração: 24 horas.</p></div><button onClick={()=>{setCreating(false);choose(null)}} className="rounded-full p-2 hover:bg-geek-soft"><X/></button></div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>choose(e.target.files?.[0]||null)}/>
      <button onClick={()=>inputRef.current?.click()} className="mt-4 w-full overflow-hidden rounded-2xl border border-dashed border-geek-line bg-black/20 aspect-[9/16] max-h-[55vh] flex items-center justify-center">{preview?<img src={preview} alt="Prévia do Pulse" className="h-full w-full object-contain object-center"/>:<div className="text-center text-sm text-slate-400"><Plus className="mx-auto mb-2"/>Escolher imagem</div>}</button>
      <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={220} placeholder="Legenda (opcional)" className="mt-3 w-full rounded-xl border border-geek-line bg-geek-soft px-3 py-3 text-sm outline-none"/>
      <input value={fandom} onChange={e=>setFandom(e.target.value)} maxLength={80} placeholder="Fandom/categoria (opcional)" className="mt-2 w-full rounded-xl border border-geek-line bg-geek-soft px-3 py-3 text-sm outline-none"/>
      {error&&<p className="mt-2 text-xs text-red-400">{error}</p>}
      <button onClick={save} disabled={!file||saving} className="mt-4 w-full rounded-xl bg-geek-orange py-3 font-bold disabled:opacity-50">{saving?<span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin"/>Publicando...</span>:'Publicar Pulse'}</button>
    </div></div>}

    {active&&viewerIndex!==null&&<div className="fixed inset-0 z-[80] bg-black/95 grid place-items-center p-0 sm:p-5"><div className="relative h-full w-full sm:h-[90vh] sm:max-w-md overflow-hidden sm:rounded-3xl bg-black flex items-center justify-center">
      <img src={active.image_url} alt="Pulse" className="max-h-full max-w-full h-auto w-auto object-contain object-center"/>
      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4 pt-5"><div className="h-1 rounded-full bg-white/30 overflow-hidden"><div className="h-full w-full bg-white"/></div><div className="mt-3 flex items-center gap-3"><div className="h-9 w-9 overflow-hidden rounded-full bg-geek-soft">{author?.avatar_url&&<img src={author.avatar_url} alt="" className="h-full w-full object-cover object-center"/>}</div><div><b className="text-sm">{author?.display_name||'Geek'}</b>{active.fandom&&<p className="text-[11px] text-white/70">{active.fandom}</p>}</div><button onClick={()=>setViewerIndex(null)} className="ml-auto rounded-full bg-black/30 p-2"><X size={20}/></button></div></div>
      {active.caption&&<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-8 pt-20 text-center text-sm">{active.caption}</div>}
      <button onClick={()=>setViewerIndex(Math.max(0,viewerIndex-1))} disabled={viewerIndex===0} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 disabled:opacity-20"><ChevronLeft/></button>
      <button onClick={()=>viewerIndex<flattened.length-1?setViewerIndex(viewerIndex+1):setViewerIndex(null)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2"><ChevronRight/></button>
    </div></div>}
  </>;
}
