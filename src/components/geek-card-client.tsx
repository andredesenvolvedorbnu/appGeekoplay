'use client';

import { useEffect,useMemo,useRef,useState } from 'react';
import { Camera, Loader2, Share2, Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const categories=['Anime','Games','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis'];
const rarities=['Comum','Raro','Épico','Lendário'];
const allowed=['image/jpeg','image/png','image/webp'];

type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;xp:number;level:number};

async function cropToCard(file:File,zoom:number,x:number,y:number){
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url});
  const aspect=3/4;
  let cw=image.naturalWidth; let ch=cw/aspect;
  if(ch>image.naturalHeight){ch=image.naturalHeight;cw=ch*aspect;}
  cw/=zoom; ch/=zoom;
  const maxX=Math.max(0,image.naturalWidth-cw); const maxY=Math.max(0,image.naturalHeight-ch);
  const sx=Math.min(maxX,Math.max(0,maxX/2+(x/100)*(maxX/2)));
  const sy=Math.min(maxY,Math.max(0,maxY/2+(y/100)*(maxY/2)));
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Falha ao preparar imagem.');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,sx,sy,cw,ch,0,0,1200,1600);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao processar imagem.')),'image/webp',0.9));
  return new File([blob],`geek-card-${Date.now()}.webp`,{type:'image/webp'});
 } finally {URL.revokeObjectURL(url)}
}

export function GeekCardClient(){
 const supabase=useMemo(()=>createClient(),[]); const input=useRef<HTMLInputElement>(null);
 const [profile,setProfile]=useState<Profile|null>(null); const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState<string|null>(null);
 const [zoom,setZoom]=useState(1); const [x,setX]=useState(0); const [y,setY]=useState(0);
 const [title,setTitle]=useState(''); const [subtitle,setSubtitle]=useState(''); const [rarity,setRarity]=useState('Raro'); const [atk,setAtk]=useState(70); const [def,setDef]=useState(70); const [description,setDescription]=useState(''); const [category,setCategory]=useState('Games');
 const [sending,setSending]=useState(false); const [message,setMessage]=useState('');
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.from('profiles').select('id,display_name,username,avatar_url,xp,level').eq('id',user.id).single();if(data){setProfile(data as Profile);setTitle(data.display_name)}})()},[supabase]);
 useEffect(()=>{if(!profile)return;const channel=supabase.channel(`card-profile-${profile.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:`id=eq.${profile.id}`},payload=>{const next=payload.new as Partial<Profile>;setProfile(current=>current?{...current,...next}:current)}).subscribe();return()=>{void supabase.removeChannel(channel)}},[profile?.id,supabase]);
 function choose(next:File|null){setMessage('');if(!next)return;if(!allowed.includes(next.type)){setMessage('Use uma imagem JPG, PNG ou WEBP.');return}if(next.size>10*1024*1024){setMessage('A imagem deve ter no máximo 10 MB.');return}if(preview)URL.revokeObjectURL(preview);setFile(next);setPreview(URL.createObjectURL(next));setZoom(1);setX(0);setY(0)}
 async function publish(){if(!profile||!file)return setMessage('Escolha uma foto para o seu Geek Card.');setSending(true);setMessage('');try{const processed=await cropToCard(file,zoom,x,y);const path=`${profile.id}/${crypto.randomUUID()}.webp`;const {error:up}=await supabase.storage.from('geek-cards').upload(path,processed,{contentType:'image/webp',upsert:false});if(up)throw up;const {data:urlData}=supabase.storage.from('geek-cards').getPublicUrl(path);const cardData={title:title.trim()||profile.display_name,subtitle:subtitle.trim(),rarity,atk,def,description:description.trim(),category,photo_url:urlData.publicUrl};const {error}=await supabase.from('posts').insert({author_id:profile.id,content:description.trim()||null,image_url:urlData.publicUrl,category,post_type:'card',card_data:cardData});if(error)throw error;setMessage('Geek Card publicado no feed.');}catch{setMessage('Não foi possível publicar o Geek Card. Tente novamente.')}finally{setSending(false)}}
 async function share(){const text=`Meu Geek Card no GeekoPlay — ${title||profile?.display_name} · Lv.${profile?.level||1} · ${profile?.xp||0} XP`;if(navigator.share){try{await navigator.share({title:'Meu Geek Card',text})}catch{}}else{await navigator.clipboard.writeText(text);setMessage('Texto do Geek Card copiado.')}}
 if(!profile)return <div className="py-20 grid place-items-center text-slate-400"><Loader2 className="animate-spin text-geek-orange"/></div>;
 return <div className="mx-auto max-w-6xl px-3 sm:px-4 pb-10">
  <div className="mb-5"><p className="text-sm font-bold text-geek-orange">IDENTIDADE GEEK</p><h1 className="text-2xl sm:text-3xl font-black">Criar meu Geek Card</h1><p className="mt-1 text-sm text-slate-400">Monte sua carta, publique no feed e mantenha XP e nível sempre atualizados pelo seu perfil.</p></div>
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
   <section className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5 space-y-4">
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Nome do card<input value={title} maxLength={40} onChange={e=>setTitle(e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 outline-none focus:border-geek-orange"/></label><label className="grid gap-1 text-sm">Título / subtítulo<input value={subtitle} maxLength={60} onChange={e=>setSubtitle(e.target.value)} placeholder="Ex.: Mestre dos Games" className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 outline-none focus:border-geek-orange"/></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Categoria<select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5">{categories.map(v=><option key={v}>{v}</option>)}</select></label><label className="grid gap-1 text-sm">Raridade<select value={rarity} onChange={e=>setRarity(e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5">{rarities.map(v=><option key={v}>{v}</option>)}</select></label></div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">ATK <span className="text-slate-500">{atk}</span><input type="range" min="0" max="100" value={atk} onChange={e=>setAtk(Number(e.target.value))}/></label><label className="grid gap-1 text-sm">DEF <span className="text-slate-500">{def}</span><input type="range" min="0" max="100" value={def} onChange={e=>setDef(Number(e.target.value))}/></label></div>
    <label className="grid gap-1 text-sm">Descrição<textarea value={description} maxLength={240} onChange={e=>setDescription(e.target.value)} className="min-h-24 resize-none rounded-xl border border-geek-line bg-geek-soft p-3 outline-none focus:border-geek-orange" placeholder="Conte o que torna seu card único..."/></label>
    <div><div className="flex items-center justify-between"><b className="text-sm">Foto do card</b><button onClick={()=>input.current?.click()} className="rounded-xl border border-geek-line px-3 py-2 text-xs font-bold flex items-center gap-2"><Camera size={15}/>Escolher foto</button></div><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>choose(e.target.files?.[0]||null)}/>
     {preview?<div className="mt-3 grid gap-4 md:grid-cols-[220px_1fr]"><div className="relative mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-2xl bg-black/40"><img src={preview} alt="Prévia" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" style={{transform:`translate(${x*.18}%,${y*.18}%) scale(${zoom})`,transformOrigin:'center'}}/><button onClick={()=>{setFile(null);if(preview)URL.revokeObjectURL(preview);setPreview(null)}} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5"><X size={15}/></button></div><div className="grid content-center gap-3"><label className="grid gap-1 text-xs">Zoom<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><label className="grid gap-1 text-xs">Horizontal<input type="range" min="-50" max="50" value={x} onChange={e=>setX(Number(e.target.value))}/></label><label className="grid gap-1 text-xs">Vertical<input type="range" min="-50" max="50" value={y} onChange={e=>setY(Number(e.target.value))}/></label><p className="text-xs text-slate-500">O recorte final é 3:4. A imagem nunca é esticada ou deformada.</p></div></div>:<button onClick={()=>input.current?.click()} className="mt-3 aspect-[3/1] w-full rounded-2xl border border-dashed border-geek-line bg-geek-soft text-sm text-slate-400">Adicionar foto</button>}
    </div>
    {message&&<p className="text-sm text-slate-300">{message}</p>}
    <div className="flex flex-col gap-2 sm:flex-row"><button onClick={publish} disabled={sending} className="flex-1 rounded-xl bg-geek-orange px-4 py-3 font-black disabled:opacity-60">{sending?'Publicando...':'Publicar Geek Card'}</button><button onClick={share} className="rounded-xl border border-geek-line px-4 py-3 font-bold flex items-center justify-center gap-2"><Share2 size={17}/>Compartilhar nível</button></div>
   </section>
   <aside className="lg:sticky lg:top-20 h-fit">
    <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border-2 border-orange-400/60 bg-gradient-to-b from-[#27202f] to-[#101218] shadow-2xl">
     <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">{rarity}</p><h2 className="font-black truncate max-w-[220px]">{title||profile.display_name}</h2></div><Sparkles className="text-orange-300" size={20}/></div>
     <div className="mx-3 mt-3 aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black/30 flex items-center justify-center">{preview?<img src={preview} alt="Foto do Geek Card" className="h-full w-full object-cover" style={{transform:`translate(${x*.18}%,${y*.18}%) scale(${zoom})`,transformOrigin:'center'}}/>:<div className="text-center text-slate-500"><Camera className="mx-auto mb-2"/><span className="text-xs">Sua foto aparecerá aqui</span></div>}</div>
     <div className="p-4"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-orange-500/15 px-2 py-1 text-[10px] text-orange-300">{category}</span><span className="text-xs text-slate-400">Lv.{profile.level} · {profile.xp} XP</span></div>{subtitle&&<p className="mt-3 text-sm font-bold text-orange-100">{subtitle}</p>}<p className="mt-2 min-h-12 text-xs leading-5 text-slate-300">{description||'Adicione uma descrição para deixar seu Geek Card ainda mais único.'}</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-red-500/10 p-3 text-center"><span className="text-[10px] text-red-300">ATK</span><p className="text-xl font-black">{atk}</p></div><div className="rounded-xl bg-cyan-500/10 p-3 text-center"><span className="text-[10px] text-cyan-300">DEF</span><p className="text-xl font-black">{def}</p></div></div><div className="mt-4 border-t border-white/10 pt-3 text-[10px] text-slate-500">@{profile.username||'geek'} · GeekoPlay</div></div>
    </div>
   </aside>
  </div>
 </div>
}
