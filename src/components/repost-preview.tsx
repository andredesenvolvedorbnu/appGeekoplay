'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { Image as ImageIcon, Loader2, Repeat2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type OriginalPost={
 id:string;author_id:string;content:string|null;image_url:string|null;video_url:string|null;category:string|null;post_type:string;card_data:any;created_at:string;
};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null};
type Media={id:string;media_type:'image'|'video';url:string;position:number};

export function RepostPreview({postId}:{postId:string}){
 const supabase=useMemo(()=>createClient(),[]);
 const [post,setPost]=useState<OriginalPost|null>(null);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [media,setMedia]=useState<Media[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{let cancelled=false;(async()=>{
  setLoading(true);
  const {data:postData}=await supabase.from('posts').select('id,author_id,content,image_url,video_url,category,post_type,card_data,created_at').eq('id',postId).maybeSingle();
  if(cancelled)return;
  if(!postData){setPost(null);setLoading(false);return}
  const original=postData as OriginalPost;setPost(original);
  const [{data:profileData},{data:mediaData}]=await Promise.all([
   supabase.from('profiles').select('id,display_name,username,avatar_url').eq('id',original.author_id).maybeSingle(),
   supabase.from('post_media').select('id,media_type,url,position').eq('post_id',original.id).order('position',{ascending:true})
  ]);
  if(cancelled)return;
  setProfile((profileData||null) as Profile|null);setMedia((mediaData||[]) as Media[]);setLoading(false);
 })();return()=>{cancelled=true}},[postId,supabase]);

 if(loading)return <span className="mt-3 flex min-h-24 w-full items-center justify-center rounded-2xl border border-geek-line bg-black/15 text-slate-500"><Loader2 size={18} className="animate-spin"/></span>;
 if(!post)return <span className="mt-3 block rounded-2xl border border-geek-line bg-black/15 p-4 text-xs text-slate-500">A publicação original não está mais disponível.</span>;

 const card=post.card_data||{};
 const fallbackImage=post.post_type==='card'?(card.photo_url||post.image_url):post.post_type==='collection'?(card.image_url||post.image_url):post.image_url;
 const images=media.filter(item=>item.media_type==='image');

 return <span className="mt-3 block overflow-hidden rounded-2xl border border-geek-line bg-[#11151c] shadow-sm">
  <span className="flex items-center gap-2 border-b border-geek-line px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-500"><Repeat2 size={13}/>Publicação original</span>
  <Link href={`/publicacao/${post.id}`} className="block no-underline">
   <span className="flex items-center gap-3 px-3 py-3">
    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{profile?.avatar_url&&<img src={profile.avatar_url} alt="" className="h-full w-full object-cover object-center"/>}</span>
    <span className="min-w-0 flex-1">
     <span className="block truncate text-sm font-black text-slate-100">{profile?.display_name||'Geek'}</span>
     <span className="block truncate text-[10px] text-slate-500">{profile?.username?`@${profile.username} · `:''}{new Date(post.created_at).toLocaleString('pt-BR')}</span>
    </span>
    {post.category&&<span className="shrink-0 rounded-full bg-orange-500/10 px-2 py-1 text-[9px] font-bold text-orange-300">{post.category}</span>}
   </span>
   {post.post_type==='event_plan'&&card.title&&<span className="block px-3 pb-2 text-sm font-black text-orange-200">📅 {card.title}</span>}
   {post.post_type==='collection'&&card.title&&<span className="block px-3 pb-2 text-sm font-black text-orange-200">🎴 {card.title}</span>}
   {post.post_type==='card'&&card.title&&<span className="block px-3 pb-2 text-sm font-black text-orange-200">🃏 {card.title}</span>}
   {post.content&&<span className="block whitespace-pre-wrap break-words px-3 pb-3 text-sm leading-6 text-slate-300">{post.content}</span>}
   {images.length>1?<span className="flex snap-x snap-mandatory overflow-x-auto bg-black/30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{images.map((item,index)=><span key={item.id} className="flex min-w-full snap-center items-center justify-center"><img src={item.url} alt={`Foto ${index+1} da publicação original`} className="block max-h-[520px] max-w-full object-contain object-center"/></span>)}</span>:fallbackImage?<span className="flex w-full items-center justify-center overflow-hidden bg-black/30"><img src={fallbackImage} alt="Mídia da publicação original" className="block h-auto max-h-[520px] w-auto max-w-full object-contain object-center"/></span>:post.video_url?<span className="block bg-black"><video src={post.video_url} controls playsInline preload="metadata" className="block max-h-[520px] w-full object-contain" onClick={event=>event.preventDefault()}/></span>:<span className="hidden"><ImageIcon size={16}/></span>}
  </Link>
 </span>;
}
