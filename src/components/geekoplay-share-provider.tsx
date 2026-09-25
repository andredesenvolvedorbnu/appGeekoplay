'use client';

import { useEffect,useMemo,useRef,useState } from 'react';
import { Check,Copy,ExternalLink,Loader2,Repeat2,Share2,X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ShareDataLike={title?:string;text?:string;url?:string};
type PostRow={id:string;author_id:string;content:string|null;image_url:string|null;video_url:string|null;category:string|null;post_type:string;card_data:any;original_post_id:string|null};
type Profile={display_name:string;username:string|null;avatar_url:string|null};

const POST_URL_RE=/\/publicacao\/([0-9a-f-]{36})(?:[/?#]|$)/i;

export function GeekoPlayShareProvider(){
 const supabase=useMemo(()=>createClient(),[]);
 const nativeShareRef=useRef<((data:ShareDataLike)=>Promise<void>)|null>(null);
 const [open,setOpen]=useState(false);
 const [url,setUrl]=useState('');
 const [post,setPost]=useState<PostRow|null>(null);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [note,setNote]=useState('');
 const [loading,setLoading]=useState(false);
 const [sharing,setSharing]=useState(false);
 const [status,setStatus]=useState('');

 async function loadPost(postId:string,shareUrl:string){
  setOpen(true);setLoading(true);setStatus('');setNote('');setUrl(shareUrl);setPost(null);setProfile(null);
  const {data:first}=await supabase.from('posts').select('id,author_id,content,image_url,video_url,category,post_type,card_data,original_post_id').eq('id',postId).maybeSingle();
  if(!first){setStatus('Esta publicação não está mais disponível.');setLoading(false);return}
  const firstPost=first as PostRow;
  let target=firstPost;
  if(firstPost.original_post_id){
   const {data:original}=await supabase.from('posts').select('id,author_id,content,image_url,video_url,category,post_type,card_data,original_post_id').eq('id',firstPost.original_post_id).maybeSingle();
   if(original)target=original as PostRow;
  }
  const {data:author}=await supabase.from('profiles').select('display_name,username,avatar_url').eq('id',target.author_id).maybeSingle();
  setPost(target);setProfile((author||null) as Profile|null);setLoading(false);
 }

 useEffect(()=>{
  if(typeof window==='undefined'||typeof navigator==='undefined')return;
  const existing=typeof navigator.share==='function'?navigator.share.bind(navigator):null;
  nativeShareRef.current=existing as ((data:ShareDataLike)=>Promise<void>)|null;
  const shim=async(data:ShareDataLike)=>{
   const shareUrl=typeof data?.url==='string'?data.url:'';
   const match=shareUrl.match(POST_URL_RE);
   if(match){await loadPost(match[1],shareUrl);return}
   if(existing){await existing(data as ShareData);return}
   if(shareUrl&&navigator.clipboard){await navigator.clipboard.writeText(shareUrl);return}
  };
  try{Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:shim})}catch{return}
  return()=>{
   try{
    if(existing)Object.defineProperty(navigator,'share',{configurable:true,writable:true,value:existing});
    else delete (navigator as Navigator&{share?:unknown}).share;
   }catch{}
  };
 },[supabase]);

 async function shareInside(){
  if(!post||sharing)return;
  setSharing(true);setStatus('');
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setStatus('Entre na sua conta para compartilhar no GeekoPlay.');setSharing(false);return}
  const {data:existing}=await supabase.from('posts').select('id').eq('author_id',user.id).eq('original_post_id',post.id).maybeSingle();
  if(existing){setStatus('Você já compartilhou esta publicação no seu Feed.');setSharing(false);return}
  const cleanNote=note.trim().slice(0,1200);
  if(cleanNote){
   try{
    const response=await fetch('/api/moderation/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contentType:'post',text:cleanNote,category:post.category||null,mediaKind:'none',images:[],parentId:post.id})});
    const result=await response.json();
    if(response.ok&&result?.decision&&result.decision!=='allow'){
     setStatus(result.decision==='review'?'Seu comentário precisa de revisão antes de ser publicado.':'Seu comentário não pôde ser compartilhado pelas Diretrizes da Comunidade.');setSharing(false);return;
    }
   }catch{}
  }
  const encoded=`[[GEEKOPLAY_REPOST:${post.id}]]${cleanNote?`\n${cleanNote}`:''}`;
  const {error}=await supabase.from('posts').insert({author_id:user.id,content:encoded,category:post.category,post_type:'repost',original_post_id:post.id});
  if(error?.code==='23505')setStatus('Você já compartilhou esta publicação no seu Feed.');
  else if(error)setStatus('Não foi possível compartilhar agora. Tente novamente.');
  else{setStatus('Compartilhado no seu Feed!');window.setTimeout(()=>setOpen(false),900)}
  setSharing(false);
 }

 async function copyLink(){
  try{await navigator.clipboard.writeText(url);setStatus('Link copiado.')}catch{setStatus('Não foi possível copiar o link.')}
 }

 async function shareOutside(){
  const nativeShare=nativeShareRef.current;
  if(nativeShare){
   try{await nativeShare({title:'GeekoPlay',text:post?.content?.slice(0,120)||'Veja esta publicação no GeekoPlay',url});setOpen(false)}catch{}
  }else await copyLink();
 }

 if(!open)return null;
 const card=post?.card_data||{};
 const previewImage=post?.image_url||(post?.post_type==='card'?card.photo_url:null)||(post?.post_type==='collection'?card.image_url:null);

 return <div className="fixed inset-0 z-[120] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/70 px-3 py-4 backdrop-blur-sm sm:p-6" onClick={()=>setOpen(false)}>
  <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-geek-line bg-geek-panel shadow-2xl" onClick={event=>event.stopPropagation()}>
   <div className="flex items-center justify-between border-b border-geek-line px-4 py-3">
    <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-300">Compartilhar</p><h2 className="text-lg font-black">Levar para o seu Feed</h2></div>
    <button type="button" onClick={()=>setOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-geek-soft" aria-label="Fechar"><X size={18}/></button>
   </div>
   <div className="max-h-[82dvh] overflow-y-auto p-4">
    {loading?<div className="grid min-h-44 place-items-center text-slate-500"><Loader2 className="animate-spin"/></div>:post?<>
     <div className="overflow-hidden rounded-2xl border border-geek-line bg-[#11151c]">
      <div className="flex items-center gap-3 p-3">
       <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{profile?.avatar_url&&<img src={profile.avatar_url} alt="" className="h-full w-full object-cover object-center"/>}</div>
       <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{profile?.display_name||'Geek'}</p><p className="truncate text-[10px] text-slate-500">{profile?.username?`@${profile.username}`:'Publicação original'}</p></div>
       <Repeat2 size={17} className="text-orange-300"/>
      </div>
      {post.content&&!post.content.startsWith('[[GEEKOPLAY_REPOST:')&&<p className="line-clamp-3 whitespace-pre-wrap break-words px-3 pb-3 text-sm leading-6 text-slate-300">{post.content}</p>}
      {previewImage&&<div className="flex max-h-64 items-center justify-center overflow-hidden bg-black/30"><img src={previewImage} alt="Prévia da publicação" className="block max-h-64 max-w-full object-contain object-center"/></div>}
     </div>
     <label className="mt-4 block"><span className="mb-2 block text-xs font-bold text-slate-300">Quer dizer algo sobre essa publicação? <span className="font-normal text-slate-500">Opcional</span></span><textarea value={note} onChange={event=>setNote(event.target.value)} maxLength={1200} placeholder="Escreva algo antes de compartilhar..." className="min-h-24 w-full resize-y rounded-xl border border-geek-line bg-geek-soft p-3 text-sm outline-none focus:border-orange-500/60"/></label>
     <button type="button" onClick={()=>void shareInside()} disabled={sharing} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-black disabled:opacity-50">{sharing?<Loader2 size={17} className="animate-spin"/>:<Repeat2 size={17}/>}Compartilhar no GeekoPlay</button>
     <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>void copyLink()} className="flex items-center justify-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-xs font-bold"><Copy size={15}/>Copiar link</button><button type="button" onClick={()=>void shareOutside()} className="flex items-center justify-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-xs font-bold"><ExternalLink size={15}/>Compartilhar fora</button></div>
    </>:null}
    {status&&<p className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${status.includes('Compartilhado')||status.includes('copiado')?'border-emerald-500/25 bg-emerald-500/10 text-emerald-300':'border-orange-500/20 bg-orange-500/5 text-orange-200'}`}>{(status.includes('Compartilhado')||status.includes('copiado'))&&<Check size={14}/>} {status}</p>}
   </div>
  </div>
 </div>;
}
