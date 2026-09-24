'use client';

import { useEffect,useMemo,useState } from 'react';
import { Copy,ExternalLink,Image as ImageIcon,X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Ad={id:string;title:string;description:string|null;image_url:string|null;cta_label:string|null;cta_url:string|null;ad_type:string;placement:string;audience:string;navigation_interval:number;cooldown_minutes:number;max_impressions_per_user_day:number;display_seconds:number;starts_at:string|null;ends_at:string|null;has_promo_code:boolean;promo_code:string|null;promo_instructions:string|null};
type Settings={pro_hides_ads:boolean;ad_navigation_interval:number;ad_min_interval_minutes:number};
type AdEvent={ad_id:string;created_at:string};
function localDayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

export function AdLayer(){
 const supabase=useMemo(()=>createClient(),[]);const pathname=usePathname();const [ad,setAd]=useState<Ad|null>(null);const [userId,setUserId]=useState<string|null>(null);
 useEffect(()=>{let cancelled=false;(async()=>{
  const {data:{user}}=await supabase.auth.getUser();if(!user||cancelled)return;setUserId(user.id);
  const start=new Date();start.setHours(0,0,0,0);
  const [{data:profile},{data:settingsData},{data:rows},{data:todayEvents,error:eventError}]=await Promise.all([
   supabase.from('profiles').select('is_pro').eq('id',user.id).single(),
   supabase.from('monetization_settings').select('pro_hides_ads,ad_navigation_interval,ad_min_interval_minutes').eq('id','default').single(),
   supabase.from('ads').select('id,title,description,image_url,cta_label,cta_url,ad_type,placement,audience,navigation_interval,cooldown_minutes,max_impressions_per_user_day,display_seconds,starts_at,ends_at,has_promo_code,promo_code,promo_instructions').eq('active',true).order('created_at',{ascending:false}),
   supabase.from('ad_events').select('ad_id,created_at').eq('user_id',user.id).eq('event_type','impression').gte('created_at',start.toISOString())
  ]);
  if(cancelled)return;
  const settings=(settingsData||{pro_hides_ads:true,ad_navigation_interval:3,ad_min_interval_minutes:30}) as Settings;if(profile?.is_pro&&settings.pro_hides_ads){setAd(null);return}
  const counts:Record<string,number>={};((todayEvents||[]) as AdEvent[]).forEach(event=>{counts[event.ad_id]=(counts[event.ad_id]||0)+1});
  const now=Date.now();const nav=Number(localStorage.getItem('geekoplay_ad_nav')||'0')+1;localStorage.setItem('geekoplay_ad_nav',String(nav));if(nav%Math.max(1,settings.ad_navigation_interval)!==0){setAd(null);return}
  const globalLast=Number(localStorage.getItem('geekoplay_ad_global_last')||'0');if(globalLast&&now-globalLast<Math.max(0,settings.ad_min_interval_minutes)*60000){setAd(null);return}
  const eligible=((rows||[]) as Ad[]).filter(a=>{
   if(a.audience==='pro'&&!profile?.is_pro)return false;if(a.audience==='non_pro'&&profile?.is_pro)return false;
   if(a.starts_at&&new Date(a.starts_at).getTime()>now)return false;if(a.ends_at&&new Date(a.ends_at).getTime()<now)return false;
   if(a.placement==='sponsored_feed'&&pathname!=='/')return false;if(nav%Math.max(1,a.navigation_interval)!==0)return false;
   const fallbackKey=`geekoplay_ad_${a.id}_${localDayKey()}_count_fallback`;const dbCount=eventError?null:(counts[a.id]||0);const localCount=Number(localStorage.getItem(fallbackKey)||'0');const count=dbCount??localCount;if(count>=a.max_impressions_per_user_day)return false;
   const last=Number(localStorage.getItem(`geekoplay_ad_${a.id}_last`)||'0');if(last&&now-last<a.cooldown_minutes*60000)return false;return true
  });
  const selected=eligible[0]||null;setAd(selected);
  if(selected){
   if(eventError){const fallbackKey=`geekoplay_ad_${selected.id}_${localDayKey()}_count_fallback`;localStorage.setItem(fallbackKey,String(Number(localStorage.getItem(fallbackKey)||'0')+1))}
   localStorage.setItem(`geekoplay_ad_${selected.id}_last`,String(now));localStorage.setItem('geekoplay_ad_global_last',String(now));
   void supabase.from('ad_events').insert({ad_id:selected.id,user_id:user.id,event_type:'impression'});
  }
 })();return()=>{cancelled=true}},[pathname,supabase]);
 useEffect(()=>{if(!ad?.display_seconds)return;const timer=window.setTimeout(()=>setAd(null),ad.display_seconds*1000);return()=>window.clearTimeout(timer)},[ad?.id,ad?.display_seconds]);
 if(!ad)return null;
 async function click(){if(userId)void supabase.from('ad_events').insert({ad_id:ad!.id,user_id:userId,event_type:'click'});if(ad?.cta_url)window.open(ad.cta_url,'_blank','noopener,noreferrer')}
 async function copyCode(){if(ad?.promo_code){await navigator.clipboard.writeText(ad.promo_code)}}

 const isPopup=ad.placement==='popup';
 const media=<div onClick={()=>{if(ad.cta_url)void click()}} className={`relative flex w-full shrink-0 items-center justify-center overflow-hidden bg-black/40 ${ad.cta_url?'cursor-pointer':''} ${isPopup?'min-h-[200px] max-h-[50dvh] p-2 sm:min-h-[240px] sm:max-h-[54vh]':'aspect-[16/9] sm:aspect-[16/8]'}`}>
   {ad.image_url?<img src={ad.image_url} alt={ad.title} className={isPopup?'block h-auto max-h-[48dvh] w-auto max-w-full object-contain object-center sm:max-h-[52vh]':'block h-full w-full object-contain object-center'}/>:<div className="flex min-h-[200px] w-full flex-col items-center justify-center gap-2 text-slate-500"><ImageIcon size={28}/><span className="text-xs">Imagem do anúncio</span></div>}
   <button onClick={e=>{e.stopPropagation();setAd(null)}} className="absolute right-2 top-2 rounded-full bg-black/75 p-2 text-white shadow backdrop-blur" aria-label="Fechar anúncio"><X size={16}/></button>
 </div>;

 const content=<div className={`mx-auto flex w-full max-w-full flex-col overflow-hidden rounded-2xl border border-orange-500/25 bg-[#171b22] shadow-2xl ${isPopup?'max-h-[90dvh] overflow-y-auto overscroll-contain':''}`}>{media}<div className={`shrink-0 p-4 ${isPopup?'border-t border-white/5':''}`}><p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">Patrocinado</p><h3 className="mt-1 break-words text-lg font-black">{ad.title}</h3>{ad.description&&<p className="mt-2 break-words text-sm leading-6 text-slate-400">{ad.description}</p>}{ad.has_promo_code&&ad.promo_code&&<div className="mt-3 rounded-xl border border-geek-line bg-geek-soft p-3"><p className="text-[10px] uppercase text-slate-500">Código promocional</p><div className="mt-1 flex items-center justify-between gap-3"><b className="truncate text-orange-300">{ad.promo_code}</b><button onClick={()=>void copyCode()} className="flex shrink-0 items-center gap-1 text-xs font-bold"><Copy size={14}/>Copiar</button></div>{ad.promo_instructions&&<p className="mt-1 break-words text-xs text-slate-500">{ad.promo_instructions}</p>}</div>}{ad.cta_url&&<button onClick={()=>void click()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-black">{ad.cta_label||'Saiba mais'}<ExternalLink size={16}/></button>}{ad.display_seconds>0&&<p className="mt-2 text-center text-[10px] text-slate-600">Este anúncio fecha automaticamente.</p>}</div></div>;

 if(ad.placement==='sponsored_feed')return <div className="mx-auto mb-4 w-full max-w-2xl px-3 sm:px-4">{content}</div>;
 if(ad.placement==='footer_banner')return <div className="fixed inset-x-0 bottom-20 z-[70] flex justify-center px-3 lg:bottom-4"><div className="w-full max-w-2xl">{content}</div></div>;
 if(ad.placement==='bottom_sheet')return <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/55 px-3 py-5 sm:p-6" onClick={()=>setAd(null)}><div className="my-auto w-full max-w-xl" onClick={e=>e.stopPropagation()}>{content}</div></div>;
 return <div className="fixed inset-0 z-[80] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/65 p-0" onClick={()=>setAd(null)}><div className="my-auto w-[90vw] max-w-[90vw] sm:w-[90vw] sm:max-w-lg" onClick={e=>e.stopPropagation()}>{content}</div></div>;
}
