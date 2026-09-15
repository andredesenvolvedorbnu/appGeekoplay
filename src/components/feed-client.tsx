'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, MessageCircle, Image as ImageIcon, Gamepad2, Loader2, Send, X, MoreHorizontal, Share2, Copy, Flag, Rocket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const categories = ['Todos','Anime','Games','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis'];

type Profile = { id:string; display_name:string; username:string|null; avatar_url:string|null; level:number; xp:number };
type Post = { id:string; author_id:string; content:string|null; image_url:string|null; category:string|null; post_type:string; is_boosted:boolean; boosted_until:string|null; created_at:string };
type Comment = { id:string; post_id:string; author_id:string; content:string; created_at:string };

export function FeedClient() {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userId,setUserId]=useState<string|null>(null);
  const [profiles,setProfiles]=useState<Record<string,Profile>>({});
  const [posts,setPosts]=useState<Post[]>([]);
  const [likes,setLikes]=useState<Record<string,number>>({});
  const [liked,setLiked]=useState<Set<string>>(new Set());
  const [commentCounts,setCommentCounts]=useState<Record<string,number>>({});
  const [comments,setComments]=useState<Record<string,Comment[]>>({});
  const [openComments,setOpenComments]=useState<Set<string>>(new Set());
  const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({});
  const [content,setContent]=useState('');
  const [category,setCategory]=useState('Games');
  const [filter,setFilter]=useState('Todos');
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [selectedFile,setSelectedFile]=useState<File|null>(null);
  const [previewUrl,setPreviewUrl]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const [openMenu,setOpenMenu]=useState<string|null>(null);

  async function reload(){
    setLoading(true);
    const { data:{ user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data:postRows }=await supabase.from('posts').select('id,author_id,content,image_url,category,post_type,is_boosted,boosted_until,created_at').order('is_boosted',{ascending:false}).order('created_at',{ascending:false}).limit(50);
    const safePosts=(postRows||[]) as Post[];
    setPosts(safePosts);
    const ids=[...new Set(safePosts.map(p=>p.author_id))];
    if(ids.length){
      const {data:profileRows}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level,xp').in('id',ids);
      const map:Record<string,Profile>={}; (profileRows||[]).forEach((p:Profile)=>map[p.id]=p); setProfiles(map);
    }
    if(safePosts.length){
      const postIds=safePosts.map(p=>p.id);
      const {data:likeRows}=await supabase.from('likes').select('post_id,user_id').in('post_id',postIds);
      const counts:Record<string,number>={}; const mine=new Set<string>();
      (likeRows||[]).forEach((l:{post_id:string;user_id:string})=>{counts[l.post_id]=(counts[l.post_id]||0)+1;if(user && l.user_id===user.id)mine.add(l.post_id)});
      setLikes(counts); setLiked(mine);

      const {data:commentRows}=await supabase.from('comments').select('id,post_id,author_id,content,created_at').in('post_id',postIds).order('created_at',{ascending:true});
      const grouped:Record<string,Comment[]>={}; const cCounts:Record<string,number>={};
      (commentRows||[]).forEach((c:Comment)=>{(grouped[c.post_id] ||= []).push(c); cCounts[c.post_id]=(cCounts[c.post_id]||0)+1;});
      setComments(grouped); setCommentCounts(cCounts);
      const commentAuthorIds=[...new Set((commentRows||[]).map((c:Comment)=>c.author_id))];
      const missing=commentAuthorIds.filter(id=>!ids.includes(id));
      if(missing.length){
        const {data:extraProfiles}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level,xp').in('id',missing);
        setProfiles(current=>{const next={...current}; (extraProfiles||[]).forEach((p:Profile)=>next[p.id]=p); return next;});
      }
    } else {
      setLikes({}); setLiked(new Set()); setComments({}); setCommentCounts({});
    }
    setLoading(false);
  }

  useEffect(()=>{
    void reload();
    const channel=supabase.channel('feed-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>{void reload();})
      .on('postgres_changes',{event:'*',schema:'public',table:'comments'},()=>{void reload();})
      .on('postgres_changes',{event:'*',schema:'public',table:'likes'},()=>{void reload();})
      .subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[supabase]);

  function chooseFile(file:File|null){
    setMessage('');
    if(!file){setSelectedFile(null);setPreviewUrl(null);return;}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage('Envie uma imagem JPG, PNG ou WEBP.');return;}
    if(file.size>10*1024*1024){setMessage('A imagem precisa ter no máximo 10 MB.');return;}
    if(previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadImage(){
    if(!selectedFile || !userId) return null;
    setUploading(true);
    const extension=selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path=`${userId}/${crypto.randomUUID()}.${extension}`;
    const {error}=await supabase.storage.from('posts').upload(path,selectedFile,{contentType:selectedFile.type,cacheControl:'3600',upsert:false});
    if(error){setUploading(false);throw error;}
    const {data}=supabase.storage.from('posts').getPublicUrl(path);
    setUploading(false);
    return data.publicUrl;
  }

  async function createPost(){
    if(!userId || (!content.trim() && !selectedFile)) return;
    setSending(true); setMessage('');
    try{
      const imageUrl=selectedFile ? await uploadImage() : null;
      const {error}=await supabase.from('posts').insert({author_id:userId,content:content.trim()||null,image_url:imageUrl,category,post_type:'post'});
      if(error) setMessage('Não foi possível publicar. Tente novamente.');
      else {
        setContent(''); setSelectedFile(null); setPreviewUrl(null); if(fileInputRef.current) fileInputRef.current.value='';
        await reload();
      }
    } catch{
      setMessage('Não foi possível enviar a imagem. Verifique o arquivo e tente novamente.');
    }
    setSending(false); setUploading(false);
  }

  async function toggleLike(postId:string){
    if(!userId)return;
    if(liked.has(postId)) await supabase.from('likes').delete().eq('user_id',userId).eq('post_id',postId);
    else await supabase.from('likes').insert({user_id:userId,post_id:postId});
    await reload();
  }

  function toggleComments(postId:string){
    setOpenComments(current=>{const next=new Set(current); next.has(postId)?next.delete(postId):next.add(postId); return next;});
  }

  async function sendComment(postId:string){
    const text=(commentDrafts[postId]||'').trim();
    if(!userId || !text)return;
    const {error}=await supabase.from('comments').insert({post_id:postId,author_id:userId,content:text});
    if(error){setMessage('Não foi possível enviar o comentário.');return;}
    setCommentDrafts(current=>({...current,[postId]:''}));
    await reload();
  }

  function postUrl(postId:string){
    if(typeof window==='undefined')return '';
    return `${window.location.origin}/?post=${postId}`;
  }

  async function copyPost(postId:string){
    try{await navigator.clipboard.writeText(postUrl(postId));setMessage('Link da publicação copiado.');}
    catch{setMessage('Não foi possível copiar o link.');}
    setOpenMenu(null);
  }

  async function sharePost(post:Post){
    const url=postUrl(post.id);
    if(navigator.share){
      try{await navigator.share({title:'GeekoPlay',text:post.content?.slice(0,120)||'Veja esta publicação no GeekoPlay',url});}catch{}
    } else await copyPost(post.id);
    setOpenMenu(null);
  }

  async function reportPost(postId:string){
    if(!userId)return;
    const ok=window.confirm('Deseja denunciar esta publicação para análise da equipe GeekoPlay?');
    if(!ok){setOpenMenu(null);return;}
    const {error}=await supabase.from('content_reports').insert({reporter_id:userId,content_type:'post',content_id:postId,reason:'conteúdo denunciado pelo usuário'});
    if(error && error.code==='23505') setMessage('Você já denunciou esta publicação.');
    else if(error) setMessage('Não foi possível enviar a denúncia.');
    else setMessage('Denúncia enviada para análise.');
    setOpenMenu(null);
  }

  const now=Date.now();
  const visible=(filter==='Todos'?posts:posts.filter(p=>p.category===filter)).sort((a,b)=>{
    const aBoost=a.is_boosted && (!a.boosted_until || new Date(a.boosted_until).getTime()>now);
    const bBoost=b.is_boosted && (!b.boosted_until || new Date(b.boosted_until).getTime()>now);
    if(aBoost!==bBoost)return aBoost?-1:1;
    return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
  });

  return <div className="mx-auto max-w-2xl px-3 sm:px-4 space-y-4">
    <section className="rounded-2xl border border-geek-line bg-geek-panel p-4">
      <textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={5000} placeholder="No que você está pensando, geek? 🎮" className="w-full min-h-24 resize-none rounded-xl border border-geek-line bg-geek-soft p-3 outline-none focus:border-geek-orange"/>
      {previewUrl&&<div className="relative mt-3 overflow-hidden rounded-xl border border-geek-line bg-black/30"><button onClick={()=>chooseFile(null)} className="absolute right-2 top-2 z-10 rounded-full bg-black/70 p-1.5 text-white"><X size={16}/></button><img src={previewUrl} alt="Prévia da imagem" className="mx-auto max-h-96 max-w-full object-contain"/></div>}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>chooseFile(e.target.files?.[0]||null)}/>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={()=>fileInputRef.current?.click()} className="rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs flex items-center gap-2"><ImageIcon size={15}/>Foto</button>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="ml-auto rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-xs">{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select>
        <button onClick={createPost} disabled={sending||uploading||(!content.trim()&&!selectedFile)} className="rounded-xl bg-geek-orange px-4 py-2 text-sm font-bold disabled:opacity-50">{uploading?'Enviando foto...':sending?'Publicando...':'Publicar'}</button>
      </div>
      {message && <p className="mt-2 text-xs text-slate-300">{message}</p>}
    </section>

    <div className="overflow-x-auto pb-1"><div className="flex gap-2 min-w-max">{categories.map(c=><button key={c} onClick={()=>setFilter(c)} className={`rounded-full px-3 py-2 text-xs border ${filter===c?'bg-geek-orange border-geek-orange text-white':'border-geek-line bg-geek-panel text-slate-300'}`}>{c}</button>)}</div></div>

    {loading ? <div className="py-16 grid place-items-center text-slate-400"><Loader2 className="animate-spin"/></div> : visible.length===0 ? <div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><Gamepad2 className="mx-auto mb-3 text-geek-orange"/>Ainda não há publicações nesta categoria.</div> : visible.map(post=>{
      const author=profiles[post.author_id];
      const postComments=comments[post.id]||[];
      const boosted=post.is_boosted && (!post.boosted_until || new Date(post.boosted_until).getTime()>Date.now());
      return <article key={post.id} className={`rounded-2xl border bg-geek-panel overflow-visible ${boosted?'border-orange-500/50':'border-geek-line'}`}>
        {boosted&&<div className="border-b border-orange-500/20 bg-orange-500/5 px-4 py-2 text-[11px] font-bold text-orange-300 flex items-center gap-2"><Rocket size={14}/>Publicação impulsionada</div>}
        <div className="p-4 flex items-center gap-3 relative"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 overflow-hidden">{author?.avatar_url?<img src={author.avatar_url} alt="" className="h-full w-full object-cover"/>:null}</div><div><b className="text-sm">{author?.display_name||'Geek'}</b><p className="text-[11px] text-slate-500">Lv.{author?.level||1} · {new Date(post.created_at).toLocaleString('pt-BR')}</p></div>{post.category&&<span className="ml-auto rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-300">{post.category}</span>}
          <button onClick={()=>setOpenMenu(openMenu===post.id?null:post.id)} className="rounded-lg p-2 text-slate-400 hover:bg-geek-soft" aria-label="Mais opções"><MoreHorizontal size={18}/></button>
          {openMenu===post.id&&<div className="absolute right-4 top-14 z-30 w-52 overflow-hidden rounded-xl border border-geek-line bg-[#171b22] shadow-2xl">
            <button onClick={()=>copyPost(post.id)} className="w-full px-4 py-3 text-left text-sm hover:bg-geek-soft flex items-center gap-2"><Copy size={16}/>Copiar link</button>
            <button onClick={()=>sharePost(post)} className="w-full px-4 py-3 text-left text-sm hover:bg-geek-soft flex items-center gap-2"><Share2 size={16}/>Compartilhar</button>
            {post.author_id!==userId&&<button onClick={()=>reportPost(post.id)} className="w-full px-4 py-3 text-left text-sm text-red-300 hover:bg-red-500/10 flex items-center gap-2"><Flag size={16}/>Denunciar publicação</button>}
          </div>}
        </div>
        {post.content&&<p className="px-4 pb-4 text-sm leading-6 text-slate-200 whitespace-pre-wrap">{post.content}</p>}
        {post.image_url&&<div className="bg-black/30 overflow-hidden"><img src={post.image_url} alt="Publicação" className="mx-auto max-h-[620px] max-w-full object-contain"/></div>}
        <div className="border-t border-geek-line px-4 py-3 flex items-center gap-5 text-sm text-slate-400"><button onClick={()=>toggleLike(post.id)} className={`flex items-center gap-2 ${liked.has(post.id)?'text-red-400':''}`}><Heart size={18} fill={liked.has(post.id)?'currentColor':'none'}/>{likes[post.id]||0}</button><button onClick={()=>toggleComments(post.id)} className="flex items-center gap-2"><MessageCircle size={18}/>{commentCounts[post.id]||0} {commentCounts[post.id]===1?'comentário':'comentários'}</button><button onClick={()=>sharePost(post)} className="ml-auto flex items-center gap-2"><Share2 size={18}/><span className="hidden sm:inline">Compartilhar</span></button></div>
        {openComments.has(post.id)&&<div className="border-t border-geek-line bg-black/10 p-4 space-y-3">
          {postComments.length===0?<p className="text-xs text-slate-500">Seja o primeiro a comentar.</p>:postComments.map(comment=>{const commentAuthor=profiles[comment.author_id];return <div key={comment.id} className="flex gap-2"><div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 overflow-hidden">{commentAuthor?.avatar_url?<img src={commentAuthor.avatar_url} alt="" className="h-full w-full object-cover"/>:null}</div><div className="min-w-0 rounded-xl bg-geek-soft px-3 py-2"><div className="text-xs font-bold">{commentAuthor?.display_name||'Geek'}</div><p className="text-sm text-slate-300 whitespace-pre-wrap break-words">{comment.content}</p></div></div>})}
          <div className="flex gap-2 pt-1"><input maxLength={1000} value={commentDrafts[post.id]||''} onChange={e=>setCommentDrafts(current=>({...current,[post.id]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void sendComment(post.id)}}} placeholder="Escreva um comentário..." className="min-w-0 flex-1 rounded-xl border border-geek-line bg-geek-soft px-3 py-2 text-sm outline-none focus:border-geek-orange"/><button onClick={()=>sendComment(post.id)} disabled={!(commentDrafts[post.id]||'').trim()} className="rounded-xl bg-geek-orange px-3 disabled:opacity-50" aria-label="Enviar comentário"><Send size={17}/></button></div>
        </div>}
      </article>
    })}
  </div>;
}
