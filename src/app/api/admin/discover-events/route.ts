import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function decodeXml(value:string){return value.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim()}
function pick(block:string,tag:string){const match=block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return match?.[1]?decodeXml(match[1]):''}
function stripHtml(value:string){return value.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}

export async function POST(request:Request){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:'Não autorizado.'},{status:401});
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
 if(profile?.role!=='admin')return NextResponse.json({error:'Acesso restrito ao administrador.'},{status:403});

 const body=await request.json().catch(()=>({}));
 const category=String(body?.category||'').trim();
 const city=String(body?.city||'').trim();
 const term=String(body?.term||'').trim();
 const parts=['evento geek',category,term,city].filter(Boolean);
 const query=parts.join(' ');
 if(!query)return NextResponse.json({error:'Escolha ao menos um nicho ou termo de busca.'},{status:400});

 const url=new URL('https://news.google.com/rss/search');
 url.searchParams.set('q',query);
 url.searchParams.set('hl','pt-BR');
 url.searchParams.set('gl','BR');
 url.searchParams.set('ceid','BR:pt-419');

 try{
  const response=await fetch(url.toString(),{headers:{'User-Agent':'GeekoPlay/1.0'},signal:AbortSignal.timeout(9000),cache:'no-store'});
  if(!response.ok)throw new Error('HTTP');
  const xml=await response.text();
  const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0,18).map(match=>{
   const block=match[1];
   const title=pick(block,'title').replace(/\s+-\s+[^-]+$/,'').trim();
   const link=pick(block,'link');
   const source=pick(block,'source');
   const publishedAt=pick(block,'pubDate');
   const description=stripHtml(pick(block,'description'));
   return {title,link,source,published_at:publishedAt?new Date(publishedAt).toISOString():null,description};
  }).filter(item=>item.title&&item.link);
  return NextResponse.json({query,items});
 }catch{
  return NextResponse.json({error:'Não foi possível consultar eventos agora. Tente novamente em instantes.'},{status:502});
 }
}
