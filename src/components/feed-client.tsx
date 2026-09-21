'use client';

import Link from 'next/link';
import { useEffect,useMemo,useRef,useState } from 'react';
import { CalendarHeart,Copy,Flag,Gamepad2,Heart,HelpCircle,IdCard,Image as ImageIcon,Loader2,MessageCircle,MoreHorizontal,Pencil,Rocket,Send,Share2,Trash2,Video,X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EventPlanDialog } from '@/components/event-plan-dialog';

const categories=['Todos','Anime','Games','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis','Eventos'];
const IMAGE_TYPES=['image/jpeg','image/png','image/webp','image/gif'];
const VIDEO_TYPES=['video/mp4','video/webm','video/quicktime'];
const MAX_IMAGE=15*1024*1024;
const MAX_VIDEO=50*1024*1024;
const COMMENT_REACTIONS=[
 {key:'gg',label:'GG',emoji:'🎮'},
 {key:'hype',label:'HYPE',emoji:'🔥'},
 {key:'op',label:'OP',emoji:'⚡'},
 {key:'lore',label:'LORE',emoji:'🧠'},
 {key:'aww',label:'AWW',emoji:'🫶'},
 {key:'f',label:'F',emoji:'💀'}
] as const;
type CommentReactionKey=(typeof COMMENT_REACTIONS)[number]['key'];

type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;level:number;xp:number};
type CardData={title?:string;subtitle?:string;rarity?:string;atk?:number;def?:number;description?:string;category?:string;photo_url?:string;event_plan_id?:string;event_date?:string;location?:string;note?:string};
type Post={id:string;author_id:string;content:string|null;image_url:string|null;video_url:string|null;category:string|null;post_type:string;card_data:CardData|null;is_boosted:boolean;boosted_until:string|null;created_at:string};
type Comment={id:string;post_id:string;author_id:string;content:string;created_at:string;updated_at:string};
type CommentReactionRow={comment_id:string;user_id:string;reaction:CommentReactionKey};

function GeekCardPost({post,author}:{post:Post;author?:Profile}){
 const card=post.card_data||{};
 return <div className="px-3 pb-4 sm:px-4"><div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[26px] border-2 border-orange-400/55 bg-gradient-to-b from-[#28202f] to-[#101218] shadow-xl"><div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">{card.rarity||'Raro'}</p><h3 className="truncate font-black">{card.title||author?.display_name||'Geek Card'}</h3></div><IdCard className="shrink-0 text-orange-300" size={20}/></div><div className="mx-3 mt-3 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/35">{(card.photo_url||post.image_url)?<img src={card.photo_url||post.image_url||''} alt="Foto do Geek Card" className="h-full w-full object-cover object-center"/>:<span className="text-xs text-slate-500">Sem foto</span>}</div><div className="p-4"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-orange-500/15 px-2 py-1 text-[10px] text-orange-300">{card.category||post.category||'Geek'}</span><span className="text-xs text-slate-400">Lv.{author?.level||1} · {author?.xp||0} XP</span></div>{card.subtitle&&<p className="mt-3 text-sm font-bold text-orange-100">{card.subtitle}</p>}<p className="mt-2 min-h-10 text-xs leading-5 text-slate-300">{card.description||post.content||'Meu Geek Card no GeekoPlay.'}</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-red-500/10 p-3 text-center"><span className="text-[10px] text-red-300">ATK</span><p className="text-xl font-black">{card.atk??0}</p></div><div className="rounded-xl bg-cyan-500/10 p-3 text-center"><span className="text-[10px] text-cyan-300">DEF</span><p className="text-xl font-black">{card.def??0}</p></div></div><div className="mt-4 border-t border-white/10 pt-3 text-[10px] text-slate-500">@{author?.username||'geek'} · GeekoPlay</div></div></div></div>;
}

function EventPlanPost({post}:{post:Post}){
 const data=post.card_data||{};
 return <div className="px-4 pb-4"><div className="overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/10 via-purple-500/5 to-transparent p-4"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-orange-300"><CalendarHeart size={22}/></div><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-orange-300">Evento que vou</p><h3 className="mt-1 break-words text-lg font-black">{data.title||'Evento'}</h3></div></div>{data.event_date&&<p className="mt-4 text-sm text-slate-300">📅 {new Date(data.event_date).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</p>}{data.location&&<p className="mt-2 break-words text-sm text-slate-300">📍 {data.location}</p>}{data.note&&<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{data.note}</p>}</div></div>;
}


function FeedVideo({src}:{src:string}){
 const videoRef=useRef<HTMLVideoElement>(null);
 const visibleRef=useRef(false);
 const manuallyPausedRef=useRef(false);

 function pauseOtherFeedVideos(){
  document.querySelectorAll<HTMLVideoElement>('video[data-feed-video="true"]').forEach(video=>{
   if(video!==videoRef.current&&!video.paused)video.pause();
  });
 }

 useEffect(()=>{
  const video=videoRef.current;
  if(!video)return;
  video.volume=0.5;
  const observer=new IntersectionObserver(entries=>{
   const entry=entries[0];
   const visible=Boolean(entry?.isIntersecting&&entry.intersectionRatio>=0.65);
   visibleRef.current=visible;
   if(!visible){
    manuallyPausedRef.current=false;
    if(!video.paused)video.pause();
    return;
   }
   if(manuallyPausedRef.current)return;
   video.volume=0.5;
   video.muted=false;
   pauseOtherFeedVideos();
   void video.play().catch(()=>{
    video.muted=true;
    void video.play().catch(()=>{});
   });
  },{threshold:[0,0.25,0.65,1]});
  observer.observe(video);
  return()=>{observer.disconnect();video.pause()};
 },[src]);

 return <video
  ref={videoRef}
  src={src}
  controls
  playsInline
  preload="metadata"
  data-feed-video="true"
  onPlay={()=>{manuallyPausedRef.current=false;pauseOtherFeedVideos()}}
  onPause={()=>{if(visibleRef.current)manuallyPausedRef.current=true}}
  className="block max-h-[720px] max-w-full object-contain object-center"
 />;
}

export function FeedClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const fileInputRef=useRef<HTMLInputElement>(null);
 const [userId,setUserId]=useState<string|null>(null);
 const [profiles,setProfiles]=useState<Record<string,Profile>>({});
 const [posts,setPosts]=useState<Post[]>([]);
 const [likes,setLikes]=useState<Record<string,number>>({});
 const [liked,setLiked]=useState<Set<string>>(new Set());
 const [comments,setComments]=useState<Record<string,Comment[]>>({});
 const [commentCounts,setCommentCounts]=useState<Record<string,number>>({});
 const [openComments,setOpenComments]=useState<Set<string>>(new Set());
 const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({});
 const [commentReactions,setCommentReactions]=useState<Record<string,Record<string,{count:number;mine:boolean}>>>({});
 const [editingCommentId,setEditingCommentId]=useState<string|null>(null);const [editingCommentText,setEditingCommentText]=useState('');const [commentBusy,setCommentBusy]=useState<string|null>(null);
 const [content,setContent]=useState('');const [category,setCategory]=useState('Games');const [filter,setFilter]=useState('Todos');
 const [selectedFile,setSelectedFile]=useState<File|null>(null);const [previewUrl,setPreviewUrl]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);const [sending,setSending]=useState(false);const [uploading,setUploading]=useState(false);const [message,setMessage]=useState('');const [openMenu,setOpenMenu]=useState<string|null>(null);const [eventDialog,setEventDialog]=useState(false);
 const [editingPost,setEditingPost]=useState<Post|null>(null);const [editContent,setEditContent]=useState('');const [editCategory,setEditCategory]=useState('Games');const [editing,setEditing]=useState(false);
 const [isAdmin,setIsAdmin]=useState(false);const [adminBoostPost,setAdminBoostPost]=useState<Post|null>(null);const [adminBoostDays,setAdminBoostDays]=useState(7);const [adminBoosting,setAdminBoosting]=useState(false);

 async function reload(showLoader=true){
  if(showLoader)setLoading(true);
  const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
  if(user){const {data:viewer}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();setIsAdmin(viewer?.role==='admin')}else setIsAdmin(false);
  const postFields='id,author_id,content,image_url,video_url,category,post_type,card_data,is_boosted,boosted_until,created_at';
  const nowIso=new Date().toISOString();
  const [{data:recentRows},{data:boostedRows}]=await Promise.all([
   supabase.from('posts').select(postFields).order('created_at',{ascending:false}).limit(60),
   supabase.from('posts').select(postFields).eq('is_boosted',true).or(`boosted_until.is.null,boosted_until.gt.${nowIso}`).limit(100)
  ]);
  const merged=new Map<string,Post>();([...(recentRows||[]),...(boostedRows||[])] as Post[]).forEach(post=>merged.set(post.id,post));
  const safe=[...merged.values()];setPosts(safe);
  const ids=[...new Set(safe.map(p=>p.author_id))];const profileMap:Record<string,Profile>={};
  if(ids.length){const {data}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level,xp').in('id',ids);(data||[]).forEach((p:Profile)=>profileMap[p.id]=p)}
  if(safe.length){
   const postIds=safe.map(p=>p.id);
   const [{data:likeRows},{data:commentRows}]=await Promise.all([
    supabase.from('likes').select('post_id,user_id').in('post_id',postIds),
    supabase.from('comments').select('id,post_id,author_id,content,created_at,updated_at').in('post_id',postIds).order('created_at',{ascending:true})
   ]);
   const counts:Record<string,number>={};const mine=new Set<string>();
   (likeRows||[]).forEach((l:{post_id:string;user_id:string})=>{counts[l.post_id]=(counts[l.post_id]||0)+1;if(user&&l.user_id===user.id)mine.add(l.post_id)});
   setLikes(counts);setLiked(mine);
   const grouped:Record<string,Comment[]>={};const cCounts:Record<string,number>={};const commentAuthors=new Set<string>();
   ((commentRows||[]) as Comment[]).forEach(c=>{(grouped[c.post_id]||=[]).push(c);cCounts[c.post_id]=(cCounts[c.post_id]||0)+1;commentAuthors.add(c.author_id)});
   const missing=[...commentAuthors].filter(id=>!profileMap[id]);
   if(missing.length){const {data}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level,xp').in('id',missing);(data||[]).forEach((p:Profile)=>profileMap[p.id]=p)}
   const commentIds=((commentRows||[]) as Comment[]).map(c=>c.id);
   let reactionRows:CommentReactionRow[]=[];
   if(commentIds.length){const {data}=await supabase.from('comment_reactions').select('comment_id,user_id,reaction').in('comment_id',commentIds);reactionRows=(data||[]) as CommentReactionRow[]}
   const reactionMap:Record<string,Record<string,{count:number;mine:boolean}>>={};
   reactionRows.forEach(row=>{
    reactionMap[row.comment_id]||={};
    const current=reactionMap[row.comment_id][row.reaction]||{count:0,mine:false};
    current.count+=1;if(user&&row.user_id===user.id)current.mine=true;
    reactionMap[row.comment_id][row.reaction]=current;
   });
   setCommentReactions(reactionMap);setComments(grouped);setCommentCounts(cCounts);
  }else{
   setLikes({});setLiked(new Set());setComments({});setCommentCounts({});setCommentReactions({});
  }
  setProfiles(profileMap);if(showLoader)setLoading(false);
 }

 useEffect(()=>{void reload();const channel=supabase.channel('feed-live-v4').on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>void reload(false)).on('postgres_changes',{event:'*',schema:'public',table:'comments'},()=>void reload(false)).on('postgres_changes',{event:'*',schema:'public',table:'comment_reactions'},()=>void reload(false)).on('postgres_changes',{event:'*',schema:'public',table:'likes'},()=>void reload(false)).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},()=>void reload(false)).subscribe();return()=>{void supabase.removeChannel(channel)}},[supabase]);

 function chooseFile(file:File|null){setMessage('');if(previewUrl){URL.revokeObjectURL(previewUrl);setPreviewUrl(null)}if(!file){setSelectedFile(null);return}const image=IMAGE_TYPES.includes(file.type);const video=VIDEO_TYPES.includes(file.type);if(!image&&!video){setMessage('Envie uma foto JPG, PNG, WEBP ou GIF, ou um vídeo MP4, WEBM ou MOV.');return}if(image&&file.size>MAX_IMAGE){setMessage('A imagem precisa ter no máximo 15 MB.');return}if(video&&file.size>MAX_VIDEO){setMessage('O vídeo precisa ter no máximo 50 MB.');return}setSelectedFile(file);setPreviewUrl(URL.createObjectURL(file))}
 async function uploadMedia(){if(!selectedFile||!userId)return{imageUrl:null,videoUrl:null,path:null};setUploading(true);const ext=selectedFile.name.split('.').pop()?.toLowerCase()||'bin';const path=`${userId}/${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('posts').upload(path,selectedFile,{contentType:selectedFile.type,cacheControl:'3600',upsert:false});if(error)throw error;const {data}=supabase.storage.from('posts').getPublicUrl(path);return VIDEO_TYPES.includes(selectedFile.type)?{imageUrl:null,videoUrl:data.publicUrl,path}:{imageUrl:data.publicUrl,videoUrl:null,path}}
 async function createPost(){
  if(!userId||(!content.trim()&&!selectedFile))return;
  setSending(true);setMessage('');let uploadedPath:string|null=null;
  try{
   const media=selectedFile?await uploadMedia():{imageUrl:null,videoUrl:null,path:null};uploadedPath=media.path;
   const {error}=await supabase.from('posts').insert({author_id:userId,content:content.trim()||null,image_url:media.imageUrl,video_url:media.videoUrl,category,post_type:'post'});
   if(error)throw error;
   setContent('');chooseFile(null);if(fileInputRef.current)fileInputRef.current.value='';await reload();setMessage('Publicação criada com sucesso.');
  }catch(error){
   if(uploadedPath)await supabase.storage.from('posts').remove([uploadedPath]);
   const detail=error&&typeof error==='object'&&'message' in error?String(error.message):'';
   if(/row-level security|permission|jwt/i.test(detail))setMessage('Sua sessão não tem permissão para publicar. Saia da conta, entre novamente e tente de novo.');
   else if(/mime|size|payload|storage/i.test(detail))setMessage('Não foi possível enviar esta mídia. Confira o formato e o tamanho do arquivo.');
   else setMessage('O arquivo foi enviado, mas o post não pôde ser salvo. Nenhuma cópia incompleta foi mantida; tente novamente.');
  }finally{setSending(false);setUploading(false)}
 }
 async function toggleLike(postId:string){if(!userId)return;const wasLiked=liked.has(postId);setLiked(current=>{const next=new Set(current);wasLiked?next.delete(postId):next.add(postId);return next});setLikes(current=>({...current,[postId]:Math.max(0,(current[postId]||0)+(wasLiked?-1:1))}));const {error}=wasLiked?await supabase.from('likes').delete().eq('user_id',userId).eq('post_id',postId):await supabase.from('likes').insert({user_id:userId,post_id:postId});if(error){setLiked(current=>{const next=new Set(current);wasLiked?next.add(postId):next.delete(postId);return next});setLikes(current=>({...current,[postId]:Math.max(0,(current[postId]||0)+(wasLiked?1:-1))}));setMessage('Não foi possível atualizar sua curtida. Tente novamente.')}}
 function toggleComments(postId:string){setOpenComments(current=>{const next=new Set(current);next.has(postId)?next.delete(postId):next.add(postId);return next})}
 async function adminPromotePost(){
  if(!isAdmin||!adminBoostPost)return;
  const days=Math.max(1,Math.min(365,Math.trunc(Number(adminBoostDays)||7)));
  setAdminBoosting(true);setMessage('');
  const {data,error}=await supabase.rpc('admin_promote_post',{target_post:adminBoostPost.id,boost_days:days});
  if(error){setMessage('Não foi possível impulsionar esta publicação como ADM.');setAdminBoosting(false);return}
  const result=(data as {post_id:string;active_until:string}[]|null)?.[0];
  const until=result?.active_until||null;
  setPosts(current=>current.map(post=>post.id===adminBoostPost.id?{...post,is_boosted:true,boosted_until:until||post.boosted_until}:post));
  setMessage('Impulsionamento ADM aplicado por '+days+' '+(days===1?'dia':'dias')+'. Nenhuma cobrança foi criada.');
  setAdminBoostPost(null);setAdminBoostDays(7);setAdminBoosting(false);setOpenMenu(null);
  await reload(false);
 }
 async function sendComment(postId:string){const text=(commentDrafts[postId]||'').trim();if(!userId||!text)return;const {error}=await supabase.from('comments').insert({post_id:postId,author_id:userId,content:text});if(error){setMessage('Não foi possível enviar o comentário.');return}setCommentDrafts(c=>({...c,[postId]:''}));await reload(false)}
 async function toggleCommentReaction(commentId:string,reaction:CommentReactionKey){
  if(!userId)return;
  const key=`${commentId}:${reaction}`;if(commentBusy===key)return;setCommentBusy(key);
  const mine=Boolean(commentReactions[commentId]?.[reaction]?.mine);
  let error:null|{message?:string}=null;
  if(mine){const result=await supabase.from('comment_reactions').delete().eq('comment_id',commentId).eq('user_id',userId).eq('reaction',reaction);error=result.error}
  else{const result=await supabase.from('comment_reactions').insert({comment_id:commentId,user_id:userId,reaction});error=result.error}
  if(error)setMessage('Não foi possível registrar sua reação.');else await reload(false);
  setCommentBusy(null);
 }
 function startCommentEdit(comment:Comment){if(comment.author_id!==userId)return;setEditingCommentId(comment.id);setEditingCommentText(comment.content);setMessage('')}
 async function saveCommentEdit(comment:Comment){
  if(!userId||comment.author_id!==userId)return;const text=editingCommentText.trim();if(!text){setMessage('O comentário não pode ficar vazio.');return}
  setCommentBusy(`edit:${comment.id}`);
  const {error}=await supabase.from('comments').update({content:text,updated_at:new Date().toISOString()}).eq('id',comment.id).eq('author_id',userId);
  if(error)setMessage('Não foi possível editar o comentário.');else{setEditingCommentId(null);setEditingCommentText('');await reload(false)}
  setCommentBusy(null);
 }
 async function deleteComment(comment:Comment){
  if(!userId||comment.author_id!==userId||!window.confirm('Excluir este comentário permanentemente?'))return;
  setCommentBusy(`delete:${comment.id}`);
  const {error}=await supabase.from('comments').delete().eq('id',comment.id).eq('author_id',userId);
  if(error)setMessage('Não foi possível excluir o comentário.');else await reload(false);
  setCommentBusy(null);
 }
 function postUrl(id:string){return typeof window==='undefined'?'':`${window.location.origin}/publicacao/${id}`}
 async function copyPost(id:string){try{await navigator.clipboard.writeText(postUrl(id));setMessage('Link da publicação copiado.')}catch{setMessage('Não foi possível copiar o link.')}setOpenMenu(null)}
 async function sharePost(post:Post){const url=postUrl(post.id);if(navigator.share){try{await navigator.share({title:'GeekoPlay',text:post.post_type==='card'?'Veja este Geek Card no GeekoPlay':post.content?.slice(0,120)||'Veja esta publicação no GeekoPlay',url})}catch{}}else await copyPost(post.id);setOpenMenu(null)}
 async function reportPost(id:string){if(!userId)return;if(!window.confirm('Deseja denunciar esta publicação para análise da equipe GeekoPlay?')){setOpenMenu(null);return}const {error}=await supabase.from('content_reports').insert({reporter_id:userId,content_type:'post',content_id:id,reason:'conteúdo denunciado pelo usuário'});if(error?.code==='23505')setMessage('Você já denunciou esta publicação.');else if(error)setMessage('Não foi possível enviar a denúncia.');else setMessage('Denúncia enviada para análise.');setOpenMenu(null)}
 function startEditing(post:Post){setEditingPost(post);setEditContent(post.content||'');setEditCategory(post.category||'Games');setOpenMenu(null);setMessage('')}
 async function saveEdit(){
  if(!editingPost||editingPost.author_id!==userId)return;
  if(!editContent.trim()&&!editingPost.image_url&&!editingPost.video_url){setMessage('A publicação precisa ter texto ou mídia.');return}
  setEditing(true);const {error}=await supabase.from('posts').update({content:editContent.trim()||null,category:editCategory,updated_at:new Date().toISOString()}).eq('id',editingPost.id).eq('author_id',userId);
  if(error)setMessage('Não foi possível editar a publicação.');else{setEditingPost(null);setMessage('Publicação atualizada.');await reload()}setEditing(false)
 }
 function storagePath(url:string|null){if(!url)return null;const marker='/storage/v1/object/public/posts/';const index=url.indexOf(marker);if(index<0)return null;try{return decodeURIComponent(url.slice(index+marker.length))}catch{return null}}
 async function deletePost(post:Post){
  setOpenMenu(null);if(post.author_id!==userId||!window.confirm('Excluir esta publicação permanentemente?'))return;
  const {error}=await supabase.from('posts').delete().eq('id',post.id).eq('author_id',userId);
  if(error){setMessage('Não foi possível excluir a publicação.');return}
  const paths=[storagePath(post.image_url),storagePath(post.video_url)].filter((path):path is string=>Boolean(path));if(paths.length)await supabase.storage.from('posts').remove(paths);
  setMessage('Publicação excluída.');await reload();
 }

 const visible=(filter==='Todos'?posts:posts.filter(p=>p.category===filter)).slice().sort((a,b)=>{const now=Date.now();const ab=a.is_boosted&&(!a.boosted_until||new Date(a.boosted_until).getTime()>now);const bb=b.is_boosted&&(!b.boosted_until||new Date(b.boosted_until).getTime()>now);if(ab!==bb)return ab?-1:1;return new Date(b.created_at).getTime()-new Date(a.created_at).getTime()});

 return <div className="mx-auto max-w-2xl space-y-4 px-3 sm:px-4">
  <section className="rounded-2xl border border-geek-line bg-geek-panel p-4"><textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={5000} placeholder="No que você está pensando, geek? 🎮" className="min-h-24 w-full resize-none rounded-xl border border-geek-line bg-geek-soft p-3 outline-none focus:border-geek-orange"/>{previewUrl&&<div className="relative mt-3 flex max-h-[560px] min-h-32 items-center justify-center overflow-hidden rounded-xl border border-geek-line bg-black/30"><button onClick={()=>chooseFile(null)} className="absolute right-2 top-2 z-10 rounded-full bg-black/70 p-1.5 text-white"><X size={16}/></button>{selectedFile&&VIDEO_TYPES.includes(selectedFile.type)?<video src={previewUrl} controls playsInline preload="metadata" className="block max-h-[560px] max-w-full object-contain"/>:<img src={previewUrl} alt="Prévia da imagem" className="block h-auto max-h-[560px] w-auto max-w-full object-contain object-center"/>}</div>}<input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" hidden onChange={e=>chooseFile(e.target.files?.[0]||null)}/><div className="mt-3 flex flex-wrap items-center gap-2"><button onClick={()=>fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs">{selectedFile&&VIDEO_TYPES.includes(selectedFile.type)?<Video size={15}/>:<ImageIcon size={15}/>}Foto/Vídeo</button><Link href="/meu-card" className="flex items-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs"><IdCard size={15}/>Meu Card</Link><button onClick={()=>setEventDialog(true)} className="flex items-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs"><CalendarHeart size={15}/>Evento que vou</button><label className="ml-auto flex min-w-[150px] items-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs text-slate-400"><span className="shrink-0 font-semibold text-slate-300">Categoria:</span><select aria-label="Categoria da publicação" value={category} onChange={e=>setCategory(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-geek-panel px-2 py-1 text-xs text-slate-100 outline-none">{categories.slice(1).map(c=><option key={c} className="bg-geek-panel text-slate-100">{c}</option>)}</select></label><button onClick={createPost} disabled={sending||uploading||(!content.trim()&&!selectedFile)} className="rounded-xl bg-geek-orange px-4 py-2 text-sm font-bold disabled:opacity-50">{uploading?'Enviando mídia...':sending?'Publicando...':'Publicar'}</button></div>{selectedFile&&<p className="mt-2 text-[11px] text-slate-500">{VIDEO_TYPES.includes(selectedFile.type)?'Vídeo':'Imagem'} · {(selectedFile.size/1024/1024).toFixed(1)} MB</p>}{message&&<p className="mt-2 text-xs text-slate-300">{message}</p>}</section>
  <div className="overflow-x-auto pb-1"><div className="flex min-w-max gap-2">{categories.map(c=><button key={c} onClick={()=>setFilter(c)} className={`rounded-full border px-3 py-2 text-xs ${filter===c?'border-geek-orange bg-geek-orange text-white':'border-geek-line bg-geek-panel text-slate-300'}`}>{c}</button>)}</div></div>
  {loading?<div className="grid place-items-center py-16 text-slate-400"><Loader2 className="animate-spin"/></div>:visible.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><Gamepad2 className="mx-auto mb-3 text-geek-orange"/>Ainda não há publicações nesta categoria.</div>:visible.map(post=>{const author=profiles[post.author_id];const postComments=comments[post.id]||[];const boosted=post.is_boosted&&(!post.boosted_until||new Date(post.boosted_until).getTime()>Date.now());return <article key={post.id} className={`overflow-visible rounded-2xl border bg-geek-panel ${boosted?'border-orange-500/50':'border-geek-line'}`}>{boosted&&<div className="flex items-center gap-2 border-b border-orange-500/20 bg-orange-500/5 px-4 py-2 text-[11px] font-bold text-orange-300"><Rocket size={14}/>Publicação impulsionada</div>}<div className="relative flex items-center gap-3 p-4"><Link href={`/perfil/${post.author_id}`} className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{author?.avatar_url&&<img src={author.avatar_url} alt="" className="h-full w-full object-cover object-center"/>}</Link><div className="min-w-0"><Link href={`/perfil/${post.author_id}`} className="block truncate text-sm font-bold hover:text-orange-300">{author?.display_name||'Geek'}</Link><p className="text-[11px] text-slate-500">Lv.{author?.level||1} · {new Date(post.created_at).toLocaleString('pt-BR')}</p></div>{post.category&&<span className="ml-auto hidden rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300 sm:inline-flex">{post.category}</span>}<button onClick={()=>setOpenMenu(openMenu===post.id?null:post.id)} className="rounded-lg p-2 text-slate-400 hover:bg-geek-soft" aria-label="Mais opções"><MoreHorizontal size={18}/></button>{openMenu===post.id&&<div className="absolute right-4 top-14 z-30 w-52 overflow-hidden rounded-xl border border-geek-line bg-geek-panel shadow-2xl">{post.author_id===userId&&post.post_type==='post'&&<button onClick={()=>startEditing(post)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-geek-soft"><Pencil size={16}/>Editar publicação</button>}<button onClick={()=>void copyPost(post.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-geek-soft"><Copy size={16}/>Copiar link</button><button onClick={()=>void sharePost(post)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-geek-soft"><Share2 size={16}/>Compartilhar</button>{isAdmin&&<button onClick={()=>{setAdminBoostPost(post);setAdminBoostDays(7);setOpenMenu(null)}} className="flex w-full items-center gap-2 border-t border-geek-line px-4 py-3 text-left text-sm font-bold text-orange-300 hover:bg-orange-500/10"><Rocket size={16}/>{post.is_boosted?'Adicionar dias como ADM':'Impulsionar como ADM'}</button>}{post.author_id===userId?<button onClick={()=>void deletePost(post)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-300 hover:bg-red-500/10"><Trash2 size={16}/>Excluir publicação</button>:<button onClick={()=>void reportPost(post.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-300 hover:bg-red-500/10"><Flag size={16}/>Denunciar publicação</button>}</div>}</div>{post.post_type==='event_plan'?<EventPlanPost post={post}/>:<>{post.content&&post.post_type!=='card'&&<p className="whitespace-pre-wrap break-words px-4 pb-4 text-sm leading-6 text-slate-200">{post.content}</p>}{post.post_type==='card'?<GeekCardPost post={post} author={author}/>:<>{post.image_url&&<div className="flex w-full items-center justify-center overflow-hidden bg-black/30"><img src={post.image_url} alt="Publicação" className="block h-auto max-h-[720px] w-auto max-w-full object-contain object-center"/></div>}{post.video_url&&<div className="flex w-full items-center justify-center overflow-hidden bg-black"><FeedVideo src={post.video_url}/></div>}</>}</>}<div className="grid grid-cols-3 border-t border-geek-line"><button onClick={()=>void toggleLike(post.id)} className={`flex items-center justify-center gap-2 px-2 py-3 text-xs sm:text-sm ${liked.has(post.id)?'text-red-400':'text-slate-400'} hover:bg-geek-soft`}><Heart size={17} fill={liked.has(post.id)?'currentColor':'none'}/>{likes[post.id]||0}</button><button onClick={()=>toggleComments(post.id)} className="flex items-center justify-center gap-2 px-2 py-3 text-xs text-slate-400 hover:bg-geek-soft sm:text-sm"><MessageCircle size={17}/>{commentCounts[post.id]||0}</button><button onClick={()=>void sharePost(post)} className="flex items-center justify-center gap-2 px-2 py-3 text-xs text-slate-400 hover:bg-geek-soft sm:text-sm"><Share2 size={17}/><span className="hidden sm:inline">Compartilhar</span></button></div>{openComments.has(post.id)&&<div className="border-t border-geek-line p-3 sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span>Reaja do jeito GeekoPlay: GG, HYPE, OP, LORE, AWW ou F.</span><Link href="/guia#reacoes" className="inline-flex items-center gap-1 font-bold text-orange-300 hover:text-orange-200"><HelpCircle size={13}/>O que significa?</Link></div><div className="max-h-96 space-y-4 overflow-y-auto">{postComments.length===0?<p className="py-3 text-center text-xs text-slate-500">Seja a primeira pessoa a comentar.</p>:postComments.map(c=>{const cp=profiles[c.author_id];const own=c.author_id===userId;return <div key={c.id} className="flex gap-2"><Link href={`/perfil/${c.author_id}`} className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-geek-soft">{cp?.avatar_url&&<img src={cp.avatar_url} alt="" className="h-full w-full object-cover object-center"/>}</Link><div className="min-w-0 flex-1"><div className="rounded-2xl bg-geek-soft px-3 py-2"><div className="flex items-center gap-2"><Link href={`/perfil/${c.author_id}`} className="min-w-0 flex-1 truncate text-xs font-bold hover:text-orange-300">{cp?.display_name||'Geek'}</Link>{own&&<div className="flex shrink-0 items-center gap-1"><button type="button" onClick={()=>startCommentEdit(c)} className="rounded-lg p-1 text-slate-500 hover:bg-black/20 hover:text-orange-300" aria-label="Editar comentário"><Pencil size={13}/></button><button type="button" onClick={()=>void deleteComment(c)} disabled={commentBusy===`delete:${c.id}`} className="rounded-lg p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50" aria-label="Excluir comentário"><Trash2 size={13}/></button></div>}</div>{editingCommentId===c.id?<div className="mt-2"><textarea value={editingCommentText} onChange={e=>setEditingCommentText(e.target.value)} maxLength={2000} className="min-h-20 w-full resize-y rounded-xl border border-geek-line bg-geek-panel p-2 text-sm outline-none focus:border-geek-orange"/><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={()=>{setEditingCommentId(null);setEditingCommentText('')}} className="rounded-lg border border-geek-line px-2.5 py-1 text-[11px] font-bold">Cancelar</button><button type="button" onClick={()=>void saveCommentEdit(c)} disabled={commentBusy===`edit:${c.id}`} className="rounded-lg bg-geek-orange px-2.5 py-1 text-[11px] font-black disabled:opacity-50">Salvar</button></div></div>:<p className="mt-1 break-words text-sm text-slate-300">{c.content}</p>}</div><div className="mt-1.5 flex flex-wrap gap-1.5">{COMMENT_REACTIONS.map(r=>{const state=commentReactions[c.id]?.[r.key];const active=Boolean(state?.mine);return <button key={r.key} type="button" onClick={()=>void toggleCommentReaction(c.id,r.key)} disabled={commentBusy===`${c.id}:${r.key}`} title={`Reagir com ${r.label}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black transition disabled:opacity-50 ${active?'border-orange-400/60 bg-orange-500/15 text-orange-200':'border-geek-line bg-black/10 text-slate-400 hover:border-orange-500/35 hover:text-slate-200'}`}><span>{r.emoji}</span><span>{r.label}</span>{state?.count?<span className="text-[9px] opacity-80">{state.count}</span>:null}</button>})}</div></div></div>})}</div><div className="mt-3 flex gap-2"><input value={commentDrafts[post.id]||''} onChange={e=>setCommentDrafts(v=>({...v,[post.id]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void sendComment(post.id)}}} maxLength={1000} placeholder="Escreva um comentário..." className="min-w-0 flex-1 rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-sm outline-none"/><button onClick={()=>void sendComment(post.id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-geek-orange text-white"><Send size={16}/></button></div></div>}</article>})}
  {adminBoostPost&&isAdmin&&<div className="fixed inset-0 z-[160] overflow-y-auto bg-black/80 p-3" role="dialog" aria-modal="true" aria-label="Impulsionar publicação como administrador"><section className="mx-auto my-4 w-full max-w-md rounded-3xl border border-orange-500/30 bg-geek-panel p-4 shadow-2xl sm:my-10 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-geek-orange">Impulsionamento ADM</p><h2 className="mt-1 text-xl font-black">Turbinar publicação</h2><p className="mt-1 text-sm leading-5 text-slate-400">Destaque manual sem cobrança e sem gerar receita.</p></div><button type="button" onClick={()=>{if(!adminBoosting)setAdminBoostPost(null)}} disabled={adminBoosting} className="rounded-xl p-2 text-slate-400 hover:bg-geek-soft disabled:opacity-40" aria-label="Fechar"><X size={20}/></button></div><div className="mt-4 rounded-2xl border border-geek-line bg-geek-soft p-3"><p className="line-clamp-3 text-sm text-slate-200">{adminBoostPost.content?.trim()||adminBoostPost.card_data?.title||'Publicação sem texto'}</p>{adminBoostPost.is_boosted&&<p className="mt-2 text-xs font-bold text-orange-300">Já impulsionada{adminBoostPost.boosted_until?' até '+new Date(adminBoostPost.boosted_until).toLocaleString('pt-BR'):''} . Os novos dias serão somados ao período restante.</p>}</div><label className="mt-4 grid gap-2 text-sm"><b>Dias de destaque</b><input type="number" inputMode="numeric" min="1" max="365" step="1" value={adminBoostDays} onChange={e=>setAdminBoostDays(Math.max(1,Math.min(365,Number(e.target.value)||1)))} className="min-h-12 w-full rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-base outline-none focus:border-geek-orange"/><span className="text-xs text-slate-500">Escolha entre 1 e 365 dias.</span></label><div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>setAdminBoostPost(null)} disabled={adminBoosting} className="order-2 min-h-12 rounded-xl border border-geek-line px-4 py-3 text-sm font-bold disabled:opacity-40 sm:order-1">Cancelar</button><button type="button" onClick={()=>void adminPromotePost()} disabled={adminBoosting} className="order-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 text-sm font-black text-white disabled:opacity-60 sm:order-2">{adminBoosting?<Loader2 size={17} className="animate-spin"/>:<Rocket size={17}/>} {adminBoosting?'Impulsionando...':'Impulsionar'}</button></div></section></div>}
  {editingPost&&<div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/75 p-3" role="dialog" aria-modal="true" aria-label="Editar publicação"><section className="w-full max-w-xl rounded-3xl border border-geek-line bg-geek-panel p-4 shadow-2xl sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-geek-orange">Sua publicação</p><h2 className="text-xl font-black">Editar publicação</h2></div><button onClick={()=>setEditingPost(null)} className="rounded-xl p-2 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button></div><textarea value={editContent} onChange={e=>setEditContent(e.target.value)} maxLength={5000} placeholder="Texto da publicação" className="mt-5 min-h-36 w-full resize-y rounded-xl border border-geek-line bg-geek-soft p-3 outline-none focus:border-geek-orange"/><label className="mt-4 grid gap-1 text-sm"><b>Categoria</b><select value={editCategory} onChange={e=>setEditCategory(e.target.value)} className="rounded-xl border border-geek-line bg-geek-panel px-3 py-3 text-slate-100">{categories.slice(1).map(c=><option key={c} className="bg-geek-panel text-slate-100">{c}</option>)}</select></label><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={()=>setEditingPost(null)} className="rounded-xl border border-geek-line px-4 py-3 text-sm font-bold">Cancelar</button><button onClick={()=>void saveEdit()} disabled={editing} className="rounded-xl bg-geek-orange px-4 py-3 text-sm font-black disabled:opacity-60">{editing?'Salvando...':'Salvar alterações'}</button></div></section></div>}
  <EventPlanDialog open={eventDialog} userId={userId} onClose={()=>setEventDialog(false)} onSaved={reload}/>
 </div>;
}
