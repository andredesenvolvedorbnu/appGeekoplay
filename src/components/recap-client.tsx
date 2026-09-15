'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Image as ImageIcon, Loader2, Pin, Share2, Sparkles, Star, Unpin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type RecapStats={posts:number;photos:number;pulses:number;events:number};
type Recap={id:string;user_id:string;year:number;semester:number;media_urls:string[];stats:RecapStats;is_pinned:boolean;created_at:string};
type PostRow={image_url:string|null;created_at:string};
type PulseRow={image_url:string;created_at:string};
type EventRow={id:string;starts_at:string};

function periodFor(year:number,semester:number){
  const start=semester===1?new Date(Date.UTC(year,0,1)):new Date(Date.UTC(year,6,1));
  const end=semester===1?new Date(Date.UTC(year,6,1)):new Date(Date.UTC(year+1,0,1));
  return {start:start.toISOString(),end:end.toISOString()};
}

function semesterLabel(year:number,semester:number){return `${semester===1?'1º':'2º'} semestre de ${year}`}

export function RecapClient(){
  const supabase=useMemo(()=>createClient(),[]);
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [semester,setSemester]=useState(now.getMonth()<6?1:2);
  const [userId,setUserId]=useState<string|null>(null);
  const [recap,setRecap]=useState<Recap|null>(null);
  const [loading,setLoading]=useState(true);
  const [building,setBuilding]=useState(false);
  const [slide,setSlide]=useState(0);
  const [message,setMessage]=useState('');

  async function load(){
    setLoading(true);setMessage('');
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setLoading(false);return;}
    setUserId(user.id);
    const {data}=await supabase.from('recaps').select('*').eq('user_id',user.id).eq('year',year).eq('semester',semester).maybeSingle();
    setRecap((data||null) as Recap|null);
    setSlide(0);setLoading(false);
  }

  useEffect(()=>{void load()},[year,semester,supabase]);

  useEffect(()=>{
    if(!recap?.media_urls?.length || recap.media_urls.length<2)return;
    const timer=setInterval(()=>setSlide(current=>(current+1)%recap.media_urls.length),4200);
    return()=>clearInterval(timer);
  },[recap]);

  async function build(){
    if(!userId)return;
    setBuilding(true);setMessage('');
    const {start,end}=periodFor(year,semester);
    try{
      const [postsResult,pulsesResult,eventsResult]=await Promise.all([
        supabase.from('posts').select('image_url,created_at').eq('author_id',userId).gte('created_at',start).lt('created_at',end).order('created_at',{ascending:false}),
        supabase.from('pulses').select('image_url,created_at').eq('author_id',userId).gte('created_at',start).lt('created_at',end).order('created_at',{ascending:false}),
        supabase.from('events').select('id,starts_at').gte('starts_at',start).lt('starts_at',end)
      ]);
      const posts=(postsResult.data||[]) as PostRow[];
      const pulses=(pulsesResult.data||[]) as PulseRow[];
      const eventIds=((eventsResult.data||[]) as EventRow[]).map(e=>e.id);
      let eventsCount=0;
      if(eventIds.length){
        const {count}=await supabase.from('event_attendees').select('*',{count:'exact',head:true}).eq('user_id',userId).eq('status','going').in('event_id',eventIds);
        eventsCount=count||0;
      }
      const media=[...posts.map(p=>p.image_url).filter(Boolean) as string[],...pulses.map(p=>p.image_url).filter(Boolean)];
      const unique=[...new Set(media)].slice(0,16);
      const stats:RecapStats={posts:posts.length,photos:unique.length,pulses:pulses.length,events:eventsCount};
      const {data,error}=await supabase.from('recaps').upsert({user_id:userId,year,semester,media_urls:unique,stats,is_pinned:recap?.is_pinned||false},{onConflict:'user_id,year,semester'}).select('*').single();
      if(error)throw error;
      setRecap(data as Recap);setSlide(0);
      setMessage(unique.length?'Seu Recap Geek foi atualizado com sucesso.':'Recap criado. Ainda não há fotos neste semestre, mas suas estatísticas já foram salvas.');
    }catch{setMessage('Não foi possível montar seu Recap Geek agora. Tente novamente.')}finally{setBuilding(false)}
  }

  async function togglePin(){
    if(!recap||!userId)return;
    const next=!recap.is_pinned;
    if(next)await supabase.from('recaps').update({is_pinned:false}).eq('user_id',userId);
    const {data,error}=await supabase.from('recaps').update({is_pinned:next}).eq('id',recap.id).select('*').single();
    if(!error&&data){setRecap(data as Recap);setMessage(next?'Recap fixado no seu perfil.':'Recap removido dos destaques do perfil.')}
  }

  async function postToPulse(){
    if(!recap||!userId||!recap.media_urls.length){setMessage('Seu Recap ainda não possui uma foto para publicar como Pulse.');return;}
    const {error}=await supabase.from('pulses').insert({author_id:userId,image_url:recap.media_urls[0],caption:`Meu Recap Geek — ${semesterLabel(year,semester)} 🎮✨`,fandom:'Recap Geek',expires_at:new Date(Date.now()+24*60*60*1000).toISOString()});
    setMessage(error?'Não foi possível publicar o Recap nos Pulses.':'Recap publicado nos seus Pulses por 24 horas.');
  }

  async function share(){
    if(!recap)return;
    const text=`Meu Recap Geek — ${semesterLabel(year,semester)}: ${recap.stats.posts} posts, ${recap.stats.photos} fotos, ${recap.stats.events} eventos e ${recap.stats.pulses} Pulses. 🎮✨`;
    if(navigator.share){try{await navigator.share({title:'Meu Recap Geek',text});return}catch{}}
    try{await navigator.clipboard.writeText(text);setMessage('Resumo do Recap copiado para a área de transferência.')}catch{setMessage('Não foi possível compartilhar agora.')}
  }

  const media=recap?.media_urls||[];
  const statCards=recap?[['Posts',recap.stats?.posts||0],['Fotos',recap.stats?.photos||0],['Eventos',recap.stats?.events||0],['Pulses',recap.stats?.pulses||0]]:[];

  return <div className="mx-auto max-w-5xl px-3 sm:px-4 space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="flex items-center gap-2 text-geek-orange"><Sparkles size={18}/><span className="text-xs font-black tracking-[.18em]">MEU RECAP GEEK</span></div><h1 className="mt-1 text-2xl sm:text-3xl font-black">Como foi minha metade do ano geek?</h1><p className="mt-1 text-sm text-slate-400">Um álbum com seus posts, Pulses, fotos e eventos do semestre.</p></div>
      <div className="flex gap-2"><select value={semester} onChange={e=>setSemester(Number(e.target.value))} className="rounded-xl border border-geek-line bg-geek-panel px-3 py-2 text-sm"><option value={1}>1º semestre</option><option value={2}>2º semestre</option></select><select value={year} onChange={e=>setYear(Number(e.target.value))} className="rounded-xl border border-geek-line bg-geek-panel px-3 py-2 text-sm">{[now.getFullYear(),now.getFullYear()-1,now.getFullYear()-2].map(y=><option key={y}>{y}</option>)}</select></div>
    </div>

    {loading?<div className="grid place-items-center py-24"><Loader2 className="animate-spin text-geek-orange"/></div>:!recap?<div className="rounded-3xl border border-geek-line bg-geek-panel p-5 sm:p-8"><div className="mx-auto max-w-xl text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-500/10 text-geek-orange"><Star size={30}/></div><h2 className="mt-4 text-xl font-black">Seu {semesterLabel(year,semester)} em um só lugar</h2><p className="mt-2 text-sm leading-6 text-slate-400">O GeekoPlay vai reunir algumas das fotos que você publicou, seus Pulses e os eventos que marcou presença.</p><button onClick={build} disabled={building} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-geek-orange px-5 py-3 font-black disabled:opacity-60">{building?<Loader2 size={17} className="animate-spin"/>:<Sparkles size={17}/>}Criar meu Recap Geek</button></div></div>:<>
      <section className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel">
        <div className="relative aspect-[16/9] min-h-[260px] max-h-[620px] w-full overflow-hidden bg-black">
          {media.length?media.map((url,index)=><img key={url} src={url} alt={`Foto ${index+1} do Recap Geek`} className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-1000 ${index===slide?'opacity-100':'opacity-0'}`} style={index===slide?{animation:'geekoplayKenBurns 4.2s ease-out both'}:undefined}/>):<div className="grid h-full place-items-center text-center text-slate-500"><div><ImageIcon className="mx-auto mb-2" size={34}/><p>Ainda não há fotos publicadas neste semestre.</p></div></div>}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-5 pb-5 pt-20 text-white"><p className="text-xs font-bold text-orange-300">{semesterLabel(year,semester)}</p><h2 className="text-2xl font-black">Minha metade do ano geek</h2></div>
        </div>
        {media.length>1&&<div className="flex gap-1.5 overflow-x-auto p-3">{media.map((url,index)=><button key={url} onClick={()=>setSlide(index)} className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border ${index===slide?'border-geek-orange':'border-geek-line'}`}><img src={url} alt="" className="h-full w-full object-cover object-center"/></button>)}</div>}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{statCards.map(([label,value])=><div key={String(label)} className="rounded-2xl border border-geek-line bg-geek-panel p-4 text-center"><div className="text-2xl font-black text-geek-orange">{value}</div><div className="text-xs text-slate-400">{label}</div></div>)}</div>

      <div className="grid gap-2 sm:grid-cols-4">
        <button onClick={togglePin} className="inline-flex items-center justify-center gap-2 rounded-xl border border-geek-line bg-geek-panel px-4 py-3 font-semibold">{recap.is_pinned?<Unpin size={17}/>:<Pin size={17}/>} {recap.is_pinned?'Desfixar do perfil':'Fixar no perfil'}</button>
        <button onClick={postToPulse} className="inline-flex items-center justify-center gap-2 rounded-xl border border-geek-line bg-geek-panel px-4 py-3 font-semibold"><Sparkles size={17}/>Postar nos Pulses</button>
        <button onClick={share} className="inline-flex items-center justify-center gap-2 rounded-xl border border-geek-line bg-geek-panel px-4 py-3 font-semibold"><Share2 size={17}/>Compartilhar</button>
        <button onClick={build} disabled={building} className="inline-flex items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-black disabled:opacity-60">{building?<Loader2 size={17} className="animate-spin"/>:<Check size={17}/>}Atualizar Recap</button>
      </div>
    </>}
    {message&&<div className="rounded-xl border border-geek-line bg-geek-panel px-4 py-3 text-sm text-slate-300">{message}</div>}
  </div>;
}
