import { createClient } from '@/lib/supabase/server';
import { Image as ImageIcon, Sparkles, CalendarDays, Heart, MessageCircle, Share2 } from 'lucide-react';

const categories = ['Todos', 'Anime', 'Games', 'HQs & Comics', 'Filmes', 'Séries', 'Cosplay'];

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase.from('posts').select('id,content,image_url,category,created_at,profiles(display_name,avatar_url)').order('created_at', { ascending: false }).limit(20);

  return (
    <div className="mx-auto max-w-2xl px-3 sm:px-5 py-4">
      <section className="rounded-2xl border border-geek-line bg-geek-panel p-4">
        <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-purple-600"/><div className="flex-1 rounded-full bg-geek-soft px-4 py-3 text-sm text-slate-400">No que você está pensando, geek? 🎮</div></div>
        <div className="grid grid-cols-3 mt-4 border-t border-geek-line pt-3 text-sm text-slate-400"><button className="flex justify-center gap-2"><ImageIcon size={17}/>Foto/Vídeo</button><button className="flex justify-center gap-2 text-orange-400"><Sparkles size={17}/>Meu Card</button><button className="flex justify-center gap-2 text-green-400"><CalendarDays size={17}/>Evento</button></div>
      </section>
      <p className="text-xs text-slate-500 mt-4 mb-2">Filtrar posts por categoria ↓</p>
      <div className="flex gap-2 overflow-x-auto pb-2">{categories.map((c,i)=><button key={c} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${i===0?'bg-geek-orange text-white':'bg-geek-soft text-slate-400'}`}>{c}</button>)}</div>
      <div className="space-y-4 mt-3">
        {(posts ?? []).map((post: any) => (
          <article key={post.id} className="rounded-2xl border border-geek-line bg-geek-panel overflow-hidden">
            <div className="p-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-geek-orange"/><div><b>{post.profiles?.display_name || 'Geek'}</b><p className="text-xs text-slate-500">{post.category || 'Geek'}</p></div></div><p className="mt-4 leading-relaxed">{post.content}</p></div>
            {post.image_url && <div className="bg-black/20 flex justify-center"><img src={post.image_url} alt="Publicação" className="max-w-full h-auto object-contain"/></div>}
            <div className="border-t border-geek-line grid grid-cols-3 text-sm text-slate-400"><button className="py-3 flex items-center justify-center gap-2"><Heart size={17}/>Curtir</button><button className="py-3 flex items-center justify-center gap-2"><MessageCircle size={17}/>Comentar</button><button className="py-3 flex items-center justify-center gap-2"><Share2 size={17}/>Compartilhar</button></div>
          </article>
        ))}
        {!posts?.length && <div className="rounded-2xl border border-dashed border-geek-line p-10 text-center text-slate-500">Seu novo feed está pronto. O próximo passo é criar posts e uploads no Supabase.</div>}
      </div>
    </div>
  );
}
