'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { Loader2, Plus, RotateCcw, Search, Store, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PhotoSourcePicker } from '@/components/photo-source-picker';

type Item={id:string;seller_id:string;title:string;description:string|null;image_urls:string[];price:number;category:string|null;item_condition:string|null;city:string|null;state:string|null;whatsapp:string|null;instagram:string|null;status:string;created_at:string};
type MarketForm={title:string;description:string;price:string;category:string;item_condition:string;city:string;state:string;whatsapp:string;instagram:string};
const categories=['Games','Anime','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis','Outros'];
const allowed=['image/jpeg','image/png','image/webp'];
const MAX_FILE=8*1024*1024;
const initialForm:MarketForm={title:'',description:'',price:'',category:'Colecionáveis',item_condition:'Usado - bom estado',city:'',state:'',whatsapp:'',instagram:''};

async function inspectImage(file:File){
 const url=URL.createObjectURL(file);
 try{return await new Promise<{width:number;height:number}>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=reject;image.src=url})}finally{URL.revokeObjectURL(url)}
}

async function cropMarketImage(file:File,zoom:number,x:number,y:number){
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const next=new Image();next.onload=()=>resolve(next);next.onerror=reject;next.src=url});
  const aspect=4/3;
  let cropW=image.naturalWidth;let cropH=cropW/aspect;
  if(cropH>image.naturalHeight){cropH=image.naturalHeight;cropW=cropH*aspect}
  cropW/=zoom;cropH/=zoom;
  const maxX=Math.max(0,image.naturalWidth-cropW);const maxY=Math.max(0,image.naturalHeight-cropH);
  const sx=Math.min(maxX,Math.max(0,maxX/2+(x/100)*(maxX/2)));
  const sy=Math.min(maxY,Math.max(0,maxY/2+(y/100)*(maxY/2)));
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Falha ao preparar a foto.');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,sx,sy,cropW,cropH,0,0,1200,900);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Falha ao processar foto.')),'image/webp',0.9));
  return new File([blob],`mercado-${Date.now()}.webp`,{type:'image/webp'});
 }finally{URL.revokeObjectURL(url)}
}

export function MarketClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [rows,setRows]=useState<Item[]>([]);const [userId,setUserId]=useState<string|null>(null);const [loading,setLoading]=useState(true);
 const [search,setSearch]=useState('');const [categoryFilter,setCategoryFilter]=useState('Todos');const [statusFilter,setStatusFilter]=useState('Todos');const [minPrice,setMinPrice]=useState('');const [maxPrice,setMaxPrice]=useState('');
 const [showForm,setShowForm]=useState(false);const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState<string|null>(null);const [message,setMessage]=useState('');const [photoWarning,setPhotoWarning]=useState('');const [form,setForm]=useState<MarketForm>(initialForm);const [zoom,setZoom]=useState(1);const [offsetX,setOffsetX]=useState(0);const [offsetY,setOffsetY]=useState(0);const [publishing,setPublishing]=useState(false);
 const set=<K extends keyof MarketForm>(key:K,value:MarketForm[K])=>setForm(current=>({...current,[key]:value}));

 async function load(){setLoading(true);const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);const {data}=await supabase.from('market_items').select('*').order('created_at',{ascending:false});setRows((data||[]) as Item[]);setLoading(false)}
 useEffect(()=>{void load()},[supabase]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);

 function clearPhoto(){if(preview)URL.revokeObjectURL(preview);setFile(null);setPreview(null);setPhotoWarning('');setZoom(1);setOffsetX(0);setOffsetY(0)}
 async function chooseFile(next:File|null){
  setMessage('');setPhotoWarning('');if(!next)return;
  if(!allowed.includes(next.type)){setMessage('A foto precisa estar em JPG, PNG ou WEBP.');return}
  if(next.size>MAX_FILE){setMessage('A foto ultrapassa 8 MB. Escolha uma imagem menor para continuar.');return}
  try{
   const size=await inspectImage(next);const warnings:string[]=[];const ratio=size.width/size.height;
   if(Math.max(size.width,size.height)>2000)warnings.push('A foto é maior que 2000 px e será reduzida para até 1200 px sem distorção.');
   if(Math.abs(ratio-(4/3))>0.05)warnings.push('A foto não está em 4:3. Ajuste o enquadramento abaixo antes de publicar.');
   if(preview)URL.revokeObjectURL(preview);setFile(next);setPreview(URL.createObjectURL(next));setZoom(1);setOffsetX(0);setOffsetY(0);setPhotoWarning(warnings.join(' '));
  }catch{setMessage('Não foi possível ler essa foto. Escolha outro arquivo.')}
 }

 async function create(){
  if(!userId||!form.title.trim()||!form.price){setMessage('Preencha título e preço.');return}
  const parsedPrice=Number(String(form.price).replace(/\./g,'').replace(',','.'));
  if(!Number.isFinite(parsedPrice)||parsedPrice<=0){setMessage('Informe um preço válido.');return}
  setPublishing(true);setMessage('');let uploadedPath:string|null=null;
  try{
   let urls:string[]=[];
   if(file){const processed=await cropMarketImage(file,zoom,offsetX,offsetY);uploadedPath=`${userId}/${crypto.randomUUID()}.webp`;const {error}=await supabase.storage.from('market').upload(uploadedPath,processed,{contentType:'image/webp',cacheControl:'3600',upsert:false});if(error)throw error;urls=[supabase.storage.from('market').getPublicUrl(uploadedPath).data.publicUrl]}
   const {error}=await supabase.from('market_items').insert({seller_id:userId,title:form.title.trim(),description:form.description.trim()||null,image_urls:urls,price:parsedPrice,category:form.category,item_condition:form.item_condition,city:form.city.trim()||null,state:form.state.trim()||null,whatsapp:form.whatsapp.trim()||null,instagram:form.instagram.trim()||null,status:'available'});if(error)throw error;
   setForm(initialForm);clearPhoto();setShowForm(false);await load();
  }catch{if(uploadedPath)await supabase.storage.from('market').remove([uploadedPath]);setMessage('Não foi possível publicar o anúncio. Revise os dados e tente novamente.')}finally{setPublishing(false)}
 }
 async function status(id:string,value:string){const {error}=await supabase.from('market_items').update({status:value,updated_at:new Date().toISOString()}).eq('id',id);if(error){setMessage('Não foi possível alterar o status do anúncio.');return}await load()}
 function storagePath(url:string){const marker='/storage/v1/object/public/market/';const index=url.indexOf(marker);if(index<0)return null;try{return decodeURIComponent(url.slice(index+marker.length))}catch{return null}}
 async function remove(id:string){if(!confirm('Excluir este anúncio?'))return;const item=rows.find(row=>row.id===id);const {error}=await supabase.from('market_items').delete().eq('id',id);if(error){setMessage('Não foi possível excluir o anúncio.');return}const paths=(item?.image_urls||[]).map(storagePath).filter((path):path is string=>Boolean(path));if(paths.length)await supabase.storage.from('market').remove(paths);await load()}

 const min=minPrice.trim()?Number(minPrice.replace(',','.')):null;const max=maxPrice.trim()?Number(maxPrice.replace(',','.')):null;
 const visible=rows.filter(item=>{const q=search.trim().toLowerCase();const categoryOk=categoryFilter==='Todos'||item.category===categoryFilter;const statusOk=statusFilter==='Todos'||item.status===statusFilter;const minOk=min===null||!Number.isFinite(min)||Number(item.price)>=min;const maxOk=max===null||!Number.isFinite(max)||Number(item.price)<=max;const textOk=!q||item.title.toLowerCase().includes(q)||(item.description||'').toLowerCase().includes(q)||(item.city||'').toLowerCase().includes(q);return categoryOk&&statusOk&&minOk&&maxOk&&textOk});
 function wa(value:string){const digits=value.replace(/\D/g,'');return digits?`https://wa.me/${digits}`:'#'}

 return <div className="mx-auto max-w-6xl px-3 pb-10 sm:px-4">
  <div className="mb-5 flex flex-wrap items-end gap-3"><div><h1 className="text-2xl font-black">Mercado Geek</h1><p className="mt-1 text-sm text-slate-400">Itens usados, colecionáveis e oportunidades da comunidade.</p></div><button onClick={()=>setShowForm(value=>!value)} className="ml-auto flex items-center gap-2 rounded-xl bg-geek-orange px-4 py-2 text-sm font-bold"><Plus size={17}/>Anunciar item</button></div>

  {showForm&&<section className="mb-5 rounded-2xl border border-geek-line bg-geek-panel p-4"><div className="grid gap-3 sm:grid-cols-2"><input value={form.title} onChange={e=>set('title',e.target.value)} maxLength={100} placeholder="Título do item" className="rounded-xl border border-geek-line bg-geek-soft p-3"/><input inputMode="decimal" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="Preço (ex.: 150,00)" className="rounded-xl border border-geek-line bg-geek-soft p-3"/><select value={form.category} onChange={e=>set('category',e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft p-3">{categories.map(category=><option key={category}>{category}</option>)}</select><select value={form.item_condition} onChange={e=>set('item_condition',e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft p-3"><option>Novo</option><option>Seminovo</option><option>Usado - ótimo estado</option><option>Usado - bom estado</option><option>Usado - com marcas</option></select><input value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Cidade" className="rounded-xl border border-geek-line bg-geek-soft p-3"/><input value={form.state} onChange={e=>set('state',e.target.value.toUpperCase().slice(0,2))} maxLength={2} placeholder="UF" className="rounded-xl border border-geek-line bg-geek-soft p-3"/><input value={form.whatsapp} onChange={e=>set('whatsapp',e.target.value)} placeholder="WhatsApp com DDI/DDD" className="rounded-xl border border-geek-line bg-geek-soft p-3"/><input value={form.instagram} onChange={e=>set('instagram',e.target.value)} placeholder="Instagram" className="rounded-xl border border-geek-line bg-geek-soft p-3"/><textarea value={form.description} onChange={e=>set('description',e.target.value)} maxLength={1500} placeholder="Descrição" className="min-h-24 rounded-xl border border-geek-line bg-geek-soft p-3 sm:col-span-2"/></div>
   <div className="mt-4 flex flex-wrap items-center gap-2"><PhotoSourcePicker onSelect={chooseFile} cameraFacing="environment" label={file?'Trocar foto':'Adicionar foto'} className="rounded-xl border border-geek-line px-3 py-2 text-sm font-bold"/><span className="text-xs text-slate-500">Recomendado: 4:3 · máximo 8 MB</span></div>
   {photoWarning&&<div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">{photoWarning}</div>}
   {preview&&<div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,460px)_1fr]"><div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-geek-line bg-black/30"><img src={preview} alt="Prévia do item" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover object-center" style={{transform:`translate(${offsetX*.18}%,${offsetY*.18}%) scale(${zoom})`,transformOrigin:'center'}}/><button onClick={clearPhoto} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white" aria-label="Remover foto"><X size={16}/></button></div><div className="grid content-center gap-3"><label className="grid gap-1 text-xs">Zoom<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><label className="grid gap-1 text-xs">Mover para os lados<input type="range" min="-50" max="50" value={offsetX} onChange={e=>setOffsetX(Number(e.target.value))}/></label><label className="grid gap-1 text-xs">Mover para cima/baixo<input type="range" min="-50" max="50" value={offsetY} onChange={e=>setOffsetY(Number(e.target.value))}/></label><p className="text-xs leading-5 text-slate-500">A foto final será gerada em 1200 × 900 px. O sistema recorta a área escolhida sem esticar ou achatar a imagem.</p></div></div>}
   {message&&<p className="mt-3 text-sm text-red-400">{message}</p>}<button onClick={create} disabled={publishing} className="mt-4 rounded-xl bg-geek-orange px-5 py-3 font-bold disabled:opacity-50">{publishing?'Publicando...':'Publicar anúncio'}</button>
  </section>}

  <section className="mb-4 rounded-2xl border border-geek-line bg-geek-panel p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto_110px_110px_auto]"><div className="flex min-w-0 items-center gap-2 rounded-xl border border-geek-line bg-geek-soft px-3"><Search size={16} className="shrink-0 text-slate-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar no Mercado Geek" className="w-full min-w-0 bg-transparent py-2.5 outline-none"/></div><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="min-w-0 rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-sm">{['Todos',...categories].map(category=><option key={category}>{category}</option>)}</select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="min-w-0 rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-sm"><option value="Todos">Todos os status</option><option value="available">Disponível</option><option value="reserved">Reservado</option><option value="sold">Vendido</option></select><input inputMode="decimal" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="Preço mín." className="min-w-0 rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-sm"/><input inputMode="decimal" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Preço máx." className="min-w-0 rounded-xl border border-geek-line bg-geek-soft px-3 py-2.5 text-sm"/><button type="button" onClick={()=>{setSearch('');setCategoryFilter('Todos');setStatusFilter('Todos');setMinPrice('');setMaxPrice('')}} className="inline-flex items-center justify-center gap-2 rounded-xl border border-geek-line px-3 py-2.5 text-sm font-bold hover:bg-geek-soft"><RotateCcw size={15}/>Limpar</button></div></section>

  {loading?<div className="grid place-items-center py-20"><Loader2 className="animate-spin text-geek-orange"/></div>:visible.length===0?<div className="rounded-2xl border border-dashed border-geek-line bg-geek-panel p-10 text-center text-slate-400"><Store className="mx-auto mb-3 text-geek-orange"/>Nenhum item encontrado com esses filtros.</div>:<div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">{visible.map(item=><article key={item.id} className={`min-w-0 overflow-hidden rounded-2xl border border-geek-line bg-geek-panel ${item.status==='sold'?'opacity-60':''}`}><Link href={`/mercado/${item.id}`} className="block"><div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-black/20">{item.image_urls?.[0]?<img src={item.image_urls[0]} alt={item.title} className="block h-auto max-h-full w-auto max-w-full object-contain object-center"/>:<Store size={36} className="text-slate-600"/>}<span className={`absolute right-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full px-2 py-1 text-[9px] font-bold sm:text-[10px] ${item.status==='sold'?'bg-red-950/90 text-red-200':item.status==='reserved'?'bg-yellow-950/90 text-yellow-200':'bg-emerald-950/90 text-emerald-200'}`}>{item.status==='sold'?'Vendido':item.status==='reserved'?'Reservado':'Disponível'}</span></div></Link><div className="min-w-0 p-3 sm:p-4"><Link href={`/mercado/${item.id}`} className="block truncate text-sm font-black hover:text-orange-300 sm:text-base">{item.title}</Link><p className="mt-0.5 truncate text-[10px] text-slate-500 sm:text-xs">{item.category||'Geek'} · {item.item_condition||'Condição não informada'}</p><p className="mt-2 truncate text-base font-black text-geek-orange sm:text-xl">{Number(item.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>{item.description&&<p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400 sm:line-clamp-3 sm:text-sm">{item.description}</p>}<p className="mt-2 truncate text-[10px] text-slate-500 sm:text-xs">{[item.city,item.state].filter(Boolean).join(' / ')}</p><Link href={`/mercado/${item.id}`} className="mt-3 block rounded-lg border border-geek-line px-2 py-2 text-center text-[10px] font-bold hover:bg-geek-soft sm:text-sm">Ver detalhes</Link>{item.seller_id===userId?<div className="mt-2 flex min-w-0 gap-1.5"><select value={item.status} onChange={e=>void status(item.id,e.target.value)} aria-label="Status do anúncio" className="min-w-0 flex-1 rounded-lg border border-geek-line bg-geek-soft px-1.5 py-2 text-[10px] sm:px-3 sm:text-sm"><option value="available">Disponível</option><option value="reserved">Reservado</option><option value="sold">Vendido</option></select><button onClick={()=>void remove(item.id)} aria-label="Excluir anúncio" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red-500/30 text-red-300"><Trash2 size={15}/></button></div>:item.status!=='sold'?<div className="mt-2 grid gap-1.5 sm:flex">{item.whatsapp&&<a href={wa(item.whatsapp)} target="_blank" rel="noreferrer" className="truncate rounded-lg bg-geek-orange px-2 py-2 text-center text-[10px] font-bold sm:px-3 sm:text-sm">{item.status==='reserved'?'Reservado · WhatsApp':'WhatsApp'}</a>}{item.instagram&&<a href={`https://instagram.com/${item.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="truncate rounded-lg border border-geek-line px-2 py-2 text-center text-[10px] sm:px-3 sm:text-sm">Instagram</a>}</div>:null}</div></article>)}</div>}
 </div>;
}
