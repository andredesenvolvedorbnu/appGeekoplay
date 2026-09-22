'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ArrowLeft, AtSign, Camera, Heart, Loader2, Pencil, Search, Send, Share2, Trash2, UserRound, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ImageCropper } from '@/components/image-cropper';
import { PhotoSourcePicker } from '@/components/photo-source-picker';

type Item={id:string;owner_id:string;title:string;image_url:string|null;category:string|null;item_type:string|null;status:string;notes:string|null;created_at:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;level?:number;city?:string|null};
const statuses=['Tenho','Quero','Troca'];
const types=['Figure','Mangá','Card','Game','HQ','Colecionável','Outro'];

export function CollectionItemDetailClient({itemId}:{itemId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [item,setItem]=useState<Item|null>(null);
 const [owner,setOwner]=useState<Profile|null>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [likeCount,setLikeCount]=useState(0);
 const [liked,setLiked]=useState(false);
 const [likeBusy,setLikeBusy]=useState(false);

 const [tagOpen,setTagOpen]=useState(false);
 const [tagQuery,setTagQuery]=useState('');
 const [tagResults,setTagResults]=useState<Profile[]>([]);
 const [tagBusy,setTagBusy]=useState<string|null>(null);
 const [tagNotice,setTagNotice]=useState('');

 const [editOpen,setEditOpen]=useState(false);
 const [editTitle,setEditTitle]=useState('');
 const [editCategory,setEditCategory]=useState('');
 const [editType,setEditType]=useState('Figure');
 const [editStatus,setEditStatus]=useState('Tenho');
 const [editNotes,setEditNotes]=useState('');
 const [editFile,setEditFile]=useState<File|null>(null);
 const [editPreview,setEditPreview]=useState<string|null>(null);
 const [cropSource,setCropSource]=useState<File|null>(null);
 const [editSaving,setEditSaving]=useState(false);

 async function load(){
  setLoading(true);setMessage('');
  const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
  const {data:i}=await supabase.from('collection_items').select('*').eq('id',itemId).maybeSingle();
  if(!i){setItem(null);setOwner(null);setLoading(false);return}
  const row=i as Item;setItem(row);
  const [{data:p},{count},{data:myLike}]=await Promise.all([
   supabase.from('profiles').select('id,display_name,username,avatar_url,level,city').eq('id',row.owner_id).maybeSingle(),
   supabase.from('collection_item_likes').select('*',{count:'exact',head:true}).eq('item_id',row.id),
   user?supabase.from('collection_item_likes').select('item_id').eq('item_id',row.id).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null})
  ]);
  setOwner((p||null) as Profile|null);
  setLikeCount(count||0);setLiked(Boolean(myLike));
  setLoading(false);
 }

 useEffect(()=>{void load()},[itemId,supabase]);
 useEffect(()=>()=>{if(editPreview)URL.revokeObjectURL(editPreview)},[editPreview]);

 function storagePath(url:string|null){if(!url)return null;const marker='/storage/v1/object/public/collection/';const index=url.indexOf(marker);if(index<0)return null;try{return decodeURIComponent(url.slice(index+marker.length))}catch{return null}}

 async function share(){
  if(!item)return;
  const url=`${window.location.origin}/colecao/${item.id}`;
  if(navigator.share){
   try{await navigator.share({title:item.title,text:`Veja este item da coleção no GeekoPlay: ${item.title}`,url});return}catch{}
  }
  try{await navigator.clipboard.writeText(url);setMessage('Link do item copiado.')}catch{setMessage('Não foi possível copiar o link.')}
 }
 function sendToSomeone(){if(!item)return;location.href=`/mensagens?colecao=${encodeURIComponent(item.id)}`}
 async function toggleLike(){
  if(!item||!userId||likeBusy)return;
  setLikeBusy(true);
  const result=liked
   ?await supabase.from('collection_item_likes').delete().eq('item_id',item.id).eq('user_id',userId)
   :await supabase.from('collection_item_likes').insert({item_id:item.id,user_id:userId});
  if(!result.error){setLiked(!liked);setLikeCount(c=>Math.max(0,c+(liked?-1:1)))}else setMessage('Não foi possível atualizar a curtida.');
  setLikeBusy(false);
 }

 async function searchTagUsers(){
  const q=tagQuery.trim().replace(/[%(),]/g,'');
  if(q.length<2){setTagNotice('Digite pelo menos 2 caracteres.');setTagResults([]);return}
  setTagNotice('');
  const {data,error}=await supabase.from('profiles').select('id,display_name,username,avatar_url').neq('id',userId||'00000000-0000-0000-0000-000000000000').or(`display_name.ilike.%${q}%,username.ilike.%${q}%`).limit(20);
  if(error){setTagNotice('Não foi possível buscar usuários agora.');return}
  setTagResults((data||[]) as Profile[]);
  if(!(data||[]).length)setTagNotice('Nenhum usuário encontrado.');
 }
 async function tagUser(profile:Profile){
  if(!item||!userId||tagBusy)return;
  setTagBusy(profile.id);setTagNotice('');
  const {error}=await supabase.from('collection_mentions').insert({item_id:item.id,actor_id:userId,mentioned_user_id:profile.id});
  setTagBusy(null);
  if(error){
   if(String(error.code)==='23505'){setTagNotice(`Você já marcou ${profile.display_name} neste item.`);return}
   setTagNotice('Não foi possível marcar essa pessoa agora.');
   return;
  }
  setTagNotice(`${profile.display_name} foi marcado(a) e recebeu uma notificação.`);
 }

 function openEdit(){
  if(!item)return;
  setEditTitle(item.title);setEditCategory(item.category||'');setEditType(item.item_type||'Figure');setEditStatus(item.status);setEditNotes(item.notes||'');
  setEditFile(null);setEditPreview(null);setCropSource(null);setEditOpen(true);setMessage('');
 }
 function chooseEditPhoto(f:File|null){
  if(!f)return;
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)){setMessage('Envie uma imagem JPG, PNG ou WEBP.');return}
  if(f.size>10*1024*1024){setMessage('A imagem deve ter no máximo 10 MB.');return}
  setCropSource(f);
 }
 function confirmEditCrop(cropped:File,previewUrl:string){if(editPreview)URL.revokeObjectURL(editPreview);setEditFile(cropped);setEditPreview(previewUrl);setCropSource(null)}
 async function saveEdit(){
  if(!item||item.owner_id!==userId||!editTitle.trim()||editSaving)return;
  setEditSaving(true);setMessage('');
  let newPath:string|null=null;
  let newImage=item.image_url;
  try{
   if(editFile){
    newPath=`${userId}/${crypto.randomUUID()}.webp`;
    const {error:uploadError}=await supabase.storage.from('collection').upload(newPath,editFile,{contentType:'image/webp',cacheControl:'3600'});
    if(uploadError)throw uploadError;
    newImage=supabase.storage.from('collection').getPublicUrl(newPath).data.publicUrl;
   }
   const {error}=await supabase.from('collection_items').update({
    title:editTitle.trim(),category:editCategory.trim()||null,item_type:editType,status:editStatus,notes:editNotes.trim()||null,image_url:newImage
   }).eq('id',item.id).eq('owner_id',userId);
   if(error)throw error;
   if(editFile){
    const oldPath=storagePath(item.image_url);
    if(oldPath)await supabase.storage.from('collection').remove([oldPath]);
   }
   setEditOpen(false);if(editPreview)URL.revokeObjectURL(editPreview);setEditPreview(null);setEditFile(null);await load();setMessage('Item atualizado.');
  }catch{
   if(newPath)await supabase.storage.from('collection').remove([newPath]);
   setMessage('Não foi possível salvar as alterações.');
  }finally{setEditSaving(false)}
 }
 async function remove(){
  if(!item||item.owner_id!==userId)return;
  if(!window.confirm('Remover este item da sua coleção? Esta ação não pode ser desfeita.'))return;
  setBusy(true);
  const oldPath=storagePath(item.image_url);
  const {error}=await supabase.from('collection_items').delete().eq('id',item.id).eq('owner_id',userId);
  if(error){setMessage('Não foi possível remover o item.');setBusy(false);return}
  if(oldPath)await supabase.storage.from('collection').remove([oldPath]);
  location.href='/colecao';
 }

 if(loading)return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-geek-orange"/></div>;
 if(!item)return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><h1 className="text-2xl font-black">Item não encontrado</h1><p className="mt-2 text-sm text-slate-400">Este item pode ter sido removido da coleção.</p><Link href="/colecao" className="mt-5 inline-flex rounded-xl bg-geek-orange px-4 py-2 font-bold">Voltar para Coleção</Link></div>;

 const own=item.owner_id===userId;
 return <div className="mx-auto max-w-5xl space-y-5 px-3 pb-10 sm:px-4">
  {cropSource&&<ImageCropper file={cropSource} aspect={1} title="Ajustar foto do item" outputWidth={1200} onCancel={()=>setCropSource(null)} onConfirm={confirmEditCrop}/>}
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
   <Link href="/colecao" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>Voltar</Link>
   <div className="grid grid-cols-2 gap-2 sm:flex">
    <button onClick={()=>void toggleLike()} disabled={likeBusy} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold sm:text-sm ${liked?'border-red-400/40 bg-red-500/10 text-red-300':'border-geek-line hover:bg-geek-soft'}`}><Heart size={16} fill={liked?'currentColor':'none'}/>{likeCount}</button>
    <button onClick={share} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-xs font-bold hover:bg-geek-soft sm:text-sm"><Share2 size={16}/>Compartilhar</button>
    <button onClick={sendToSomeone} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-xs font-bold hover:bg-geek-soft sm:text-sm"><Send size={16}/>Enviar</button>
    <button onClick={()=>{setTagOpen(true);setTagNotice('')}} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-geek-orange px-3 py-2 text-xs font-black text-white sm:text-sm"><AtSign size={16}/>Marcar</button>
   </div>
  </div>

  <article className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
   <section className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel"><div className="flex aspect-square items-center justify-center overflow-hidden bg-black/25">{item.image_url?<img src={item.image_url} alt={item.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<span className="flex flex-col items-center gap-2 text-sm text-slate-500"><Camera size={24}/>Sem foto</span>}</div></section>
   <section className="rounded-3xl border border-geek-line bg-geek-panel p-5 sm:p-6">
    <div className="flex flex-wrap gap-2"><span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300">{item.category||'Geek'}</span><span className="rounded-full bg-geek-soft px-2.5 py-1 text-xs text-slate-300">{item.item_type||'Colecionável'}</span><span className="rounded-full bg-geek-soft px-2.5 py-1 text-xs text-slate-300">{item.status}</span></div>
    <h1 className="mt-4 break-words text-2xl font-black sm:text-3xl">{item.title}</h1>
    {item.notes&&<p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">{item.notes}</p>}
    <p className="mt-5 text-xs text-slate-500">Adicionado em {new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
    <div className="mt-5 flex items-center gap-2 text-sm text-slate-400"><Heart size={16}/><b className="text-slate-200">{likeCount}</b> {likeCount===1?'curtida':'curtidas'}</div>

    {own&&<div className="mt-6 grid gap-2 sm:grid-cols-2">
     <button onClick={openEdit} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-4 py-2.5 text-sm font-bold hover:border-orange-500/40"><Pencil size={16}/>Editar item</button>
     <button onClick={()=>void remove()} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-bold text-red-300 disabled:opacity-50"><Trash2 size={16}/>Excluir item</button>
    </div>}
    {message&&<p className="mt-4 rounded-xl border border-geek-line bg-geek-soft px-4 py-3 text-sm text-slate-300">{message}</p>}
   </section>
  </article>

  <section className="rounded-2xl border border-geek-line bg-geek-panel p-4 sm:p-5"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Coleção de</p>{owner?<Link href={`/perfil/${owner.id}`} className="mt-3 flex max-w-md items-center gap-3 rounded-xl bg-geek-soft p-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{owner.avatar_url?<img src={owner.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={18}/>}</div><div className="min-w-0"><p className="truncate text-sm font-black">{owner.display_name}</p><p className="truncate text-xs text-slate-500">@{owner.username||'geek'}{typeof owner.level==='number'?` · Nível ${owner.level}`:''}{owner.city?` · ${owner.city}`:''}</p></div></Link>:<p className="mt-3 text-sm text-slate-500">Perfil indisponível.</p>}</section>

  {editOpen&&<div className="fixed inset-0 z-[175] overflow-y-auto bg-black/80 p-3" role="dialog" aria-modal="true" aria-label="Editar item da coleção">
   <section className="mx-auto my-4 w-full max-w-2xl rounded-3xl border border-geek-line bg-geek-panel p-4 shadow-2xl sm:my-8 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-geek-orange">Minha coleção</p><h2 className="text-xl font-black">Editar item</h2></div><button onClick={()=>setEditOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button></div>
    <div className="mt-5 grid gap-5 md:grid-cols-[220px,minmax(0,1fr)]">
     <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-dashed border-geek-line bg-black/20">
       <img src={editPreview||item.image_url||''} alt="" className={`absolute inset-0 h-full w-full object-cover ${(editPreview||item.image_url)?'block':'hidden'}`}/>
       {!(editPreview||item.image_url)&&<div className="absolute inset-0 grid place-items-center text-slate-500"><Camera size={28}/></div>}
       <PhotoSourcePicker onSelect={chooseEditPhoto} label="" className="absolute inset-0 z-10 h-full w-full cursor-pointer bg-transparent text-transparent" cameraFacing="environment"/>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">Clique na imagem para trocar. O recorte mantém a proporção.</p>
     </div>
     <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="Nome do item" className="sm:col-span-2 min-w-0 rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none focus:border-geek-orange"/>
      <input value={editCategory} onChange={e=>setEditCategory(e.target.value)} placeholder="Categoria" className="min-w-0 rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none focus:border-geek-orange"/>
      <select value={editType} onChange={e=>setEditType(e.target.value)} className="min-w-0 rounded-xl border border-geek-line bg-geek-soft px-3 py-3">{types.map(t=><option key={t}>{t}</option>)}</select>
      <select value={editStatus} onChange={e=>setEditStatus(e.target.value)} className="min-w-0 rounded-xl border border-geek-line bg-geek-soft px-3 py-3">{statuses.map(s=><option key={s}>{s}</option>)}</select>
      <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder="Observações (opcional)" className="min-h-28 resize-y rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none focus:border-geek-orange sm:col-span-2"/>
      <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2"><button onClick={()=>setEditOpen(false)} className="order-2 min-h-11 rounded-xl border border-geek-line font-bold sm:order-1">Cancelar</button><button onClick={()=>void saveEdit()} disabled={editSaving||!editTitle.trim()} className="order-1 min-h-11 rounded-xl bg-geek-orange font-black text-white disabled:opacity-50 sm:order-2">{editSaving?'Salvando...':'Salvar alterações'}</button></div>
     </div>
    </div>
   </section>
  </div>}

  {tagOpen&&<div className="fixed inset-0 z-[170] overflow-y-auto bg-black/75 p-3" role="dialog" aria-modal="true" aria-label="Marcar alguém no item">
   <section className="mx-auto my-4 w-full max-w-lg rounded-3xl border border-geek-line bg-geek-panel p-4 shadow-2xl sm:my-10 sm:p-5">
    <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-geek-orange"><AtSign size={20}/></div><div className="min-w-0 flex-1"><h2 className="text-xl font-black">Marcar alguém</h2><p className="mt-1 text-sm leading-5 text-slate-400">A pessoa receberá uma notificação com acesso direto a este item.</p></div><button onClick={()=>setTagOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button></div>
    <div className="mt-4 flex items-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3"><Search size={17} className="shrink-0 text-slate-500"/><input value={tagQuery} onChange={e=>setTagQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void searchTagUsers()}} placeholder="Buscar por nome ou @usuário" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/><button onClick={()=>void searchTagUsers()} className="shrink-0 text-xs font-black text-geek-orange">Buscar</button></div>
    {tagNotice&&<p className="mt-3 rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-xs text-slate-300">{tagNotice}</p>}
    <div className="mt-3 max-h-[50dvh] space-y-2 overflow-y-auto">{tagResults.map(profile=><div key={profile.id} className="flex items-center gap-3 rounded-2xl border border-geek-line bg-geek-soft p-3"><Link href={`/perfil/${profile.id}`} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{profile.avatar_url?<img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={17}/>}</Link><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{profile.display_name}</p><p className="truncate text-xs text-slate-500">@{profile.username||'geek'}</p></div><button onClick={()=>void tagUser(profile)} disabled={tagBusy===profile.id} className="min-h-10 shrink-0 rounded-xl bg-geek-orange px-3 text-xs font-black text-white disabled:opacity-50">{tagBusy===profile.id?'Marcando...':'Marcar'}</button></div>)}</div>
   </section>
  </div>}
 </div>;
}
