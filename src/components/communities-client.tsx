'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { Image as ImageIcon, Loader2, Plus, Search, Trophy, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ImageCropper } from '@/components/image-cropper';
import { PhotoSourcePicker } from '@/components/photo-source-picker';

type Community={id:string;owner_id:string;name:string;slug:string;description:string|null;category:string|null;cover_url:string|null;visibility:string;created_at:string};
type MemberRow={community_id:string;user_id:string};
type MemberProfile={id:string;display_name:string;username:string|null;avatar_url:string|null;level:number;xp:number};
const CATEGORIES=['Eventos & Convenções','Games','Anime','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis'];
const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
const MAX_COVER=10*1024*1024;

export function CommunitiesClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<Community[]>([]);
 const [members,setMembers]=useState<Record<string,number>>({});
 const [topMembers,setTopMembers]=useState<Record<string,MemberProfile[]>>({});
 const [mine,setMine]=useState<Set<string>>(new Set());
 const [userId,setUserId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [tab,setTab]=useState<'explorar'|'minhas'>('explorar');
 const [search,setSearch]=useState('');
 const [showCreate,setShowCreate]=useState(false);
 const [name,setName]=useState('');
 const [description,setDescription]=useState('');
 const [category,setCategory]=useState('Games');
 const [visibility,setVisibility]=useState('public');
 const [message,setMessage]=useState('');
 const [creating,setCreating]=useState(false);
 const [coverFile,setCoverFile]=useState<File|null>(null);
 const [coverPreview,setCoverPreview]=useState<string|null>(null);
 const [cropSource,setCropSource]=useState<File|null>(null);

 function resetCover(){if(coverPreview)URL.revokeObjectURL(coverPreview);setCoverFile(null);setCoverPreview(null);setCropSource(null)}
 function chooseCover(file:File|null){setMessage('');if(!file)return;if(!IMAGE_TYPES.includes(file.type)){setMessage('A capa precisa ser JPG, PNG ou WEBP.');return}if(file.size>MAX_COVER){setMessage('A capa precisa ter no máximo 10 MB.');return}setCropSource(file)}
 function confirmCoverCrop(file:File,previewUrl:string){if(coverPreview)URL.revokeObjectURL(coverPreview);setCoverFile(file);setCoverPreview(previewUrl);setCropSource(null)}

 async function load(){
  setLoading(true);
  const {data:{user}}=await supabase.auth.getUser();
  setUserId(user?.id||null);
  const {data}=await supabase.from('communities').select('*').order('created_at',{ascending:false});
  const safe=(data||[]) as Community[];
  setRows(safe);
  const ids=safe.map(x=>x.id);
  if(!ids.length){setMembers({});setMine(new Set());setTopMembers({});setLoading(false);return}
  const {data:m}=await supabase.from('community_members').select('community_id,user_id').in('community_id',ids);
  const memberRows=(m||[]) as MemberRow[];
  const counts:Record<string,number>={};const me=new Set<string>();
  memberRows.forEach(x=>{counts[x.community_id]=(counts[x.community_id]||0)+1;if(user&&x.user_id===user.id)me.add(x.community_id)});
  setMembers(counts);setMine(me);
  const memberIds=[...new Set(memberRows.map(x=>x.user_id))];
  if(memberIds.length){
   const {data:p}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level,xp').in('id',memberIds);
   const profileMap:Record<string,MemberProfile>={};((p||[]) as MemberProfile[]).forEach(profile=>profileMap[profile.id]=profile);
   const grouped:Record<string,MemberProfile[]>={};
   memberRows.forEach(row=>{const profile=profileMap[row.user_id];if(profile)(grouped[row.community_id]||=[]).push(profile)});
   Object.keys(grouped).forEach(id=>grouped[id]=grouped[id].sort((a,b)=>b.xp-a.xp||b.level-a.level).slice(0,3));
   setTopMembers(grouped);
  }else setTopMembers({});
  setLoading(false);
 }

 useEffect(()=>{void load();return()=>{if(coverPreview)URL.revokeObjectURL(coverPreview)}},[supabase]);

 async function join(id:string){
  if(!userId)return;
  setMessage('');
  if(mine.has(id)){const {error}=await supabase.from('community_members').delete().eq('community_id',id).eq('user_id',userId);if(error){setMessage('Não foi possível sair da comunidade.');return}}
  else{const {error}=await supabase.from('community_members').insert({community_id:id,user_id:userId,member_role:'member'});if(error){setMessage('Não foi possível entrar na comunidade.');return}}
  await load();
 }

 async function uploadCover(){
  if(!coverFile||!userId)return null;
  const path=`${userId}/${crypto.randomUUID()}.webp`;
  const {error}=await supabase.storage.from('communities').upload(path,coverFile,{contentType:'image/webp',cacheControl:'3600',upsert:false});
  if(error)throw error;
  return supabase.storage.from('communities').getPublicUrl(path).data.publicUrl;
 }

 async function create(){
  if(!userId||name.trim().length<3){setMessage('Digite um nome com pelo menos 3 caracteres.');return}
  setMessage('');setCreating(true);
  try{
   const coverUrl=await uploadCover();
   const slug=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')+'-'+Date.now().toString().slice(-5);
   const {data,error}=await supabase.from('communities').insert({owner_id:userId,name:name.trim(),slug,description:description.trim()||null,category,visibility,cover_url:coverUrl}).select('id').single();
   if(error)throw error;
   if(data?.id)await supabase.from('community_members').insert({community_id:data.id,user_id:userId,member_role:'owner'});
   setName('');setDescription('');setCategory('Games');setVisibility('public');resetCover();setShowCreate(false);await load();
  }catch{setMessage('Não foi possível criar a comunidade. Verifique os dados e tente novamente.')}finally{setCreating(false)}
 }

 const visible=rows.filter(r=>{if(tab==='minhas'&&!mine.has(r.id)&&r.owner_id!==userId)return false;const q=search.toLowerCase().trim();return !q||r.name.toLowerCase().includes(q)||(r.description||'').toLowerCase().includes(q)||(r.category||'').toLowerCase().includes(q)});

 return <div className="mx-auto max-w-5xl px-3 pb-8 sm:px-4">
  {cropSource&&<ImageCropper file={cropSource} aspect={16/6} title="Ajustar capa da comunidade" outputWidth={1600} onCancel={()=>setCropSource(null)} onConfirm={confirmCoverCrop}/>} 
  <div className="mb-5 flex flex-wrap items-end gap-3"><div><h1 className="text-2xl font-black">Comunidades</h1><p className="mt-1 text-sm text-slate-400">Encontre fandoms e pessoas com os mesmos interesses.</p></div><button onClick={()=>setShowCreate(v=>!v)} className="ml-auto flex items-center gap-2 rounded-xl bg-geek-orange px-4 py-2 text-sm font-bold"><Plus size={17}/>Criar comunidade</button></div>

  {showCreate&&<section className="mb-4 rounded-2xl border border-geek-line bg-geek-panel p-4">
   <div className="grid gap-3 sm:grid-cols-2">
    <input value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="Nome da comunidade" className="rounded-xl border border-geek-line bg-geek-soft p-3"/>
    <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft p-3">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
    <textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={1000} placeholder="Descrição" className="min-h-24 rounded-xl border border-geek-line bg-geek-soft p-3 sm:col-span-2"/>
    <div className="sm:col-span-2">
     <label className="mb-2 block text-xs font-bold text-slate-400">Capa da comunidade</label>
     {coverPreview?<div className="relative flex aspect-[16/6] w-full items-center justify-center overflow-hidden rounded-2xl border border-geek-line bg-black/25"><img src={coverPreview} alt="Prévia da capa" className="h-full w-full object-cover object-center"/><div className="absolute bottom-2 left-2"><PhotoSourcePicker onSelect={chooseCover} cameraFacing="environment" label="Ajustar outra imagem" className="rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-white"/></div><button type="button" onClick={resetCover} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white" aria-label="Remover capa"><X size={16}/></button></div>:<PhotoSourcePicker onSelect={chooseCover} cameraFacing="environment" label={<span className="flex flex-col items-center gap-2"><ImageIcon size={22}/><span>Adicionar capa</span><span className="text-[11px] text-slate-500">Carregue uma imagem ou tire uma foto. Depois você poderá recortar, dar zoom e reposicionar sem deformar.</span></span> as unknown as string} className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-geek-line bg-geek-soft p-6 text-sm text-slate-400 hover:border-orange-500/40"/>}
    </div>
    <select value={visibility} onChange={e=>setVisibility(e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft p-3"><option value="public">Aberta</option><option value="private">Fechada</option></select>
    <button onClick={create} disabled={creating} className="rounded-xl bg-geek-orange px-4 py-3 font-bold disabled:opacity-50">{creating?'Criando...':'Criar'}</button>
   </div>{message&&<p className="mt-3 text-sm text-slate-300">{message}</p>}
  </section>}

  <div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="flex rounded-xl border border-geek-line bg-geek-panel p-1"><button onClick={()=>setTab('explorar')} className={`rounded-lg px-4 py-2 text-sm ${tab==='explorar'?'bg-geek-orange text-white':'text-slate-400'}`}>Explorar</button><button onClick={()=>setTab('minhas')} className={`rounded-lg px-4 py-2 text-sm ${tab==='minhas'?'bg-geek-orange text-white':'text-slate-400'}`}>Minhas</button></div><div className="flex flex-1 items-center gap-2 rounded-xl border border-geek-line bg-geek-panel px-3"><Search size={16} className="text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar comunidades" className="w-full bg-transparent py-2 outline-none"/></div></div>

  {loading?<div className="grid place-items-center py-20"><Loader2 className="animate-spin text-geek-orange"/></div>:visible.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><Users className="mx-auto mb-3 text-geek-orange"/>Nenhuma comunidade encontrada.</div>:<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map(c=>{
   const tops=topMembers[c.id]||[];const isMine=mine.has(c.id);const isOwner=c.owner_id===userId;
   return <article key={c.id} className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel">
    <Link href={`/comunidades/${c.id}`} className="block"><div className="flex aspect-[16/6] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-500/30 via-purple-500/20 to-cyan-500/10">{c.cover_url?<img src={c.cover_url} alt={`Capa de ${c.name}`} className="block h-full w-full object-cover object-center"/>:<span className="flex flex-col items-center gap-2 text-xs text-slate-500"><ImageIcon size={18}/>Sem capa</span>}</div></Link>
    <div className="p-4"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><Link href={`/comunidades/${c.id}`} className="font-black hover:text-orange-300">{c.name}</Link><p className="text-xs text-slate-500">{c.category||'Geek'} · {c.visibility==='public'?'Aberta':'Fechada'}</p></div><span className="flex items-center gap-1 text-xs text-slate-400"><Users size={14}/>{members[c.id]||0}</span></div>
     {c.description&&<p className="mt-3 line-clamp-3 text-sm text-slate-400">{c.description}</p>}
     {tops.length>0&&<div className="mt-4 rounded-xl bg-geek-soft p-3"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Trophy size={14} className="text-amber-400"/>Top membros</div><div className="space-y-2">{tops.map((member,index)=><Link href={`/perfil/${member.id}`} key={member.id} className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-white/5"><div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{member.avatar_url?<img src={member.avatar_url} alt="" className="h-full w-full object-cover object-center"/>:<span className="text-[10px] font-black">{index+1}</span>}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{member.display_name}</p><p className="text-[10px] text-slate-500">Nível {member.level} · {member.xp} XP</p></div></Link>)}</div></div>}
     <div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/comunidades/${c.id}`} className="rounded-xl border border-geek-line px-3 py-2 text-center text-sm font-bold hover:bg-geek-soft">Abrir</Link>{isOwner?<button disabled className="rounded-xl border border-geek-line px-3 py-2 text-sm font-bold text-slate-300 opacity-60">Você é o dono</button>:isMine?<button onClick={()=>join(c.id)} className="rounded-xl border border-geek-line px-3 py-2 text-sm font-bold text-slate-300">Sair</button>:c.visibility==='private'?<Link href={`/comunidades/${c.id}`} className="rounded-xl bg-geek-orange px-3 py-2 text-center text-sm font-bold text-white">Solicitar entrada</Link>:<button onClick={()=>join(c.id)} className="rounded-xl bg-geek-orange px-3 py-2 text-sm font-bold text-white">Entrar</button>}</div>
    </div>
   </article>})}</div>}
 </div>;
}
