import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function decode(value:string){return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function meta(html:string,property:string){const patterns=[new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,'i'),new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`,'i')];for(const p of patterns){const m=html.match(p);if(m?.[1])return decode(m[1].trim())}return null}

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Não autorizado.'},{status:401});
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(profile?.role!=='admin')return NextResponse.json({error:'Acesso restrito ao administrador.'},{status:403});
  const body=await request.json().catch(()=>({}));
  const raw=String(body?.url||'').trim();
  let url:URL; try{url=new URL(raw);if(!['http:','https:'].includes(url.protocol))throw new Error()}catch{return NextResponse.json({error:'Informe uma URL válida.'},{status:400})}
  try{
    const response=await fetch(url.toString(),{headers:{'User-Agent':'Mozilla/5.0 GeekoPlay/1.0'},redirect:'follow',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error();
    const html=(await response.text()).slice(0,800000);
    const title=meta(html,'og:title')||decode((html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]||'').trim())||url.hostname;
    const summary=meta(html,'og:description')||meta(html,'description')||'';
    const image_url=meta(html,'og:image')||'';
    const source_name=meta(html,'og:site_name')||url.hostname.replace(/^www\./,'');
    return NextResponse.json({title,summary,image_url,source_name,source_url:url.toString()});
  }catch{return NextResponse.json({error:'Não foi possível ler automaticamente esse site. Você ainda pode preencher os dados manualmente.'},{status:422})}
}
