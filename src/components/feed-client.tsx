'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Image as ImageIcon, Gamepad2, CalendarDays, Layers3, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const categories = ['Todos','Anime','Games','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis'];

type Profile = { id:string; display_name:string; username:string|null; avatar_url:string|null; level:number; xp:number };
type Post = { id:string; author_id:string; content:string|null; image_url:string|null; category:string|null; post_type:string; created_at:string };

export function FeedClient() {
  const supabase = useMemo(() => createClient(), []);
  const [userId,setUserId]=useState<string|null>(null);
  const [profiles,setProfiles]=useState<Record<string,Profile>>({});
  const [posts,setPosts]=useState<Post[]>([]);
  const [likes,setLikes]=useState<Record<string,number>>({});
  const [liked,setLiked]=useState<Set<string>>(new Set());
  const [content,setContent]=useState('');
  const [category,setCategory]=useState('Games');
  const [filter,setFilter]=useState('Todos');
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [message,setMessage]=useState('');

  async function reload(){
    setLoading(true);
    const { data:{ user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data:postRows }=await supabase.from('posts').select('id,author_id,content,image_url,category,post_type,created_at').order('created_at',{ascending:false}).limit(50);
    const safePosts=(postRows||[]) as Post[];
    setPosts(safePosts);
    const ids=[...new Set(safePosts.map(p=>p.author_id))];
    if(ids.length){
      const {data:profileRows}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level,xp').in('id',ids);
      const map:Record<string,Profile>={}; (profileRows||[]).forEach((p:any)=>map[p.id]=p); setProfiles(map);
    }
    if(safePosts.length){
      const postIds=safePosts.map(p=>p.id);
      const {data:likeRows}=await supabase.from('likes').select('post_id,user_id').in('post_id',postIds);
      const counts:Record<string,number>={}; const mine=new Set<string>();
      (likeRows||[]).forEach((l:any)=>{counts[l.post_id]=(counts[l.post_id]||0)+1;if(user && l.user_id===user.id)mine.add(l.post_id)});
      setLikes(counts); setLiked(mine);
    }
    setLoading(false);
  }

  useEffect(()=>{reload(); const channel=supabase.channel('feed-live').on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>reload()).subscribe(); return()=>{supabase.removeChannel(channel)};},[]);

  async function createPost(){
    if(!userId || !content.trim()) return;
    setSending(true); setMessage('');
    const {error}=await supabase.from('posts').insert({author_id:userId,content:content.trim(),category,post_type:'post'});
    if(error) setMessage(error.message); else {setContent(''); await reload();}
    setSending(false);
  }

  async function toggleLike(postId:string){
    if(!userId)return;
    if(liked.has(postId)) await supabase.from('likes').delete().eq('user_id',userId).eq('post_id',postId);
    else await supabase.from('likes').insert({user_id:userId,post_id:postId});
    await reload();
  }

  const visible=filter==='Todos'?posts:posts.filter(p=>p.category===filter);

  return <div className="mx-auto max-w-2xl px-3 sm:px-4 space-y-4">
    <section className="rounded-2xl border border-geek-line bg-geek-panel p-4">
      <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="No que você está pensando, geek? 🎮" className="w-full min-h-24 resize-none rounded-xl border border-geek-line bg-geek-soft p-3 outline-none focus:border-geek-orange"/>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs flex items-center gap-2"><ImageIcon size={15}/>Foto/Vídeo</button>
        <button className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs flex items-center gap-2"><Layers3 size={15}/>Meu Card</button>
        <button className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs flex items-center gap-2"><CalendarDays size={15}/>Evento que vou</button>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="ml-auto rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs">{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select>
        <button onClick={createPost} disabled={sending||!content.trim()} className="rounded-xl bg-geek-orange px-4 py-2 text-sm font-bold disabled:opacity-50">{sending?'Publicando...':'Publicar'}</button>
      </div>
      {message && <p className="mt-2 text-xs text-red-400">{message}</p>}
    </section>

    <div className="overflow-x-auto pb-1"><div className="flex gap-2 min-w-max">{categories.map(c=><button key={c} onClick={()=>setFilter(c)} className={`rounded-full px-3 py-2 text-xs border ${filter===c?'bg-geek-orange border-geek-orange text-white':'border-geek-line bg-geek-panel text-slate-300'}`}>{c}</button>)}</div></div>

    {loading ? <div className="py-16 grid place-items-center text-slate-400"><Loader2 className="animate-spin"/></div> : visible.length===0 ? <div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><Gamepad2 className="mx-auto mb-3 text-geek-orange"/>Ainda não há publicações nesta categoria.</div> : visible.map(post=>{
      const author=profiles[post.author_id];
      return <article key={post.id} className="rounded-2xl border border-geek-line bg-geek-panel overflow-hidden">
        <div className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 overflow-hidden">{author?.avatar_url?<img src={author.avatar_url} alt="" className="h-full w-full object-cover"/>:null}</div><div><b className="text-sm">{author?.display_name||'Geek'}</b><p className="text-[11px] text-slate-500">Lv.{author?.level||1} · {new Date(post.created_at).toLocaleString('pt-BR')}</p></div>{post.category&&<span className="ml-auto rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">{post.category}</span>}</div>
        {post.content&&<p className="px-4 pb-4 text-sm leading-6 text-slate-200 whitespace-pre-wrap">{post.content}</p>}
        {post.image_url&&<div className="bg-black/30"><img src={post.image_url} alt="Publicação" className="mx-auto max-h-[620px] max-w-full object-contain"/></div>}
        <div className="border-t border-geek-line px-4 py-3 flex items-center gap-5 text-sm text-slate-400"><button onClick={()=>toggleLike(post.id)} className={`flex items-center gap-2 ${liked.has(post.id)?'text-red-400':''}`}><Heart size={18} fill={liked.has(post.id)?'currentColor':'none'}/>{likes[post.id]||0}</button><button className="flex items-center gap-2"><MessageCircle size={18}/>Comentar</button></div>
      </article>
    })}
  </div>;
}
