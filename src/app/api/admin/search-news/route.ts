import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Candidate={title:string;source_name:string;source_url:string;published_at:string|null};

const nicheDefaults:Record<string,string>={
  'Games':'games videogames lançamentos consoles',
  'Anime':'anime novidades lançamentos Japão',
  'HQs & Comics':'quadrinhos comics Marvel DC novidades',
  'Filmes':'filmes cinema cultura pop lançamentos',
  'Séries':'séries streaming cultura pop lançamentos',
  'Cosplay':'cosplay concursos eventos cultura geek',
  'Mangá':'mangá lançamentos Japão cultura otaku',
  'K-Pop':'k-pop BTS BLACKPINK idols comeback',
  'RPG':'RPG Dungeons Dragons jogos de mesa novidades',
  'Tecnologia':'tecnologia gadgets inteligência artificial games',
  'Colecionáveis':'colecionáveis action figures cards cultura geek'
};

function decodeXml(value:string){return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]+>/g,'').trim()}
function tag(block:string,name:string){const m=block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return m?.[1]?decodeXml(m[1]):''}

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Não autorizado.'},{status:401});
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(profile?.role!=='admin')return NextResponse.json({error:'Acesso restrito ao administrador.'},{status:403});

  const body=await request.json().catch(()=>({}));
  const category=String(body?.category||'Games').trim();
  const extra=String(body?.query||'').trim().slice(0,180);
  const base=nicheDefaults[category]||category;
  const query=`${base}${extra?` ${extra}`:''} when:7d`;
  const url=`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

  try{
    const response=await fetch(url,{headers:{'User-Agent':'GeekoPlay/1.0','Accept':'application/rss+xml,application/xml,text/xml'},signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(!response.ok)throw new Error('HTTP');
    const xml=(await response.text()).slice(0,1_500_000);
    const blocks=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0,18).map(m=>m[1]);
    const items:Candidate[]=blocks.map(block=>{
      const rawTitle=tag(block,'title');
      const source=tag(block,'source');
      const link=tag(block,'link');
      const pub=tag(block,'pubDate');
      const cleanedTitle=source&&rawTitle.endsWith(` - ${source}`)?rawTitle.slice(0,-(` - ${source}`).length):rawTitle;
      return {title:cleanedTitle.slice(0,500),source_name:source.slice(0,160),source_url:link,published_at:pub?new Date(pub).toISOString():null};
    }).filter(item=>item.title&&item.source_url);
    return NextResponse.json({query,items});
  }catch{
    return NextResponse.json({error:'Não foi possível buscar notícias agora. Tente novamente em alguns instantes.'},{status:502});
  }
}
