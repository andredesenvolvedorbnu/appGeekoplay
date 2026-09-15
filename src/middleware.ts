import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://telavlbwfkpwnndhhkfu.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_FX9w30JXAq6m8KFExfnPJg_tK60RSpK';
type CookieToSet={name:string;value:string;options?:CookieOptions};

export async function middleware(request:NextRequest){
 let response=NextResponse.next({request});
 const supabase=createServerClient(SUPABASE_URL,SUPABASE_KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll:(cookiesToSet:CookieToSet[])=>{cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
 const {data:{user}}=await supabase.auth.getUser();
 const pathname=request.nextUrl.pathname;
 const publicRoute=pathname==='/bem-vindo'||pathname==='/login'||pathname==='/cadastro'||pathname==='/esqueci-senha'||pathname.startsWith('/auth');

 if(!user&&!publicRoute){const url=request.nextUrl.clone();url.pathname='/bem-vindo';url.search='';return NextResponse.redirect(url)}
 if(user&&(pathname==='/bem-vindo'||pathname==='/login'||pathname==='/cadastro'||pathname==='/esqueci-senha')){
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
  const url=request.nextUrl.clone();url.pathname=profile?.role==='admin'?'/admin':'/';url.search='';return NextResponse.redirect(url);
 }
 return response;
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
