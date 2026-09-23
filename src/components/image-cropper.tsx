'use client';

import { useEffect,useMemo,useRef,useState } from 'react';
import { Check,Crop,Minus,Plus,RotateCcw,X } from 'lucide-react';

type Props={
  file:File;
  aspect?:number;
  title?:string;
  outputWidth?:number;
  onCancel:()=>void;
  onConfirm:(file:File,previewUrl:string)=>void;
  onUseOriginal?:()=>void;
};

type Size={w:number;h:number};

export function ImageCropper({file,aspect,title='Ajustar imagem',outputWidth=1600,onCancel,onConfirm,onUseOriginal}:Props){
  const url=useMemo(()=>URL.createObjectURL(file),[file]);
  const imageRef=useRef<HTMLImageElement|null>(null);
  const frameRef=useRef<HTMLDivElement|null>(null);
  const dragRef=useRef<{x:number;y:number;startX:number;startY:number}|null>(null);
  const [zoom,setZoom]=useState(0.8);
  const [pos,setPos]=useState({x:0,y:0});
  const [saving,setSaving]=useState(false);
  const [natural,setNatural]=useState<Size>({w:0,h:0});
  const [frame,setFrame]=useState<Size>({w:0,h:0});
  const effectiveAspect=aspect&&aspect>0?aspect:(natural.w&&natural.h?natural.w/natural.h:1);
  const isPortrait=effectiveAspect<1;

  useEffect(()=>()=>URL.revokeObjectURL(url),[url]);
  useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[]);
  useEffect(()=>{const el=frameRef.current;if(!el)return;const update=()=>setFrame({w:el.clientWidth,h:el.clientHeight});update();const ro=new ResizeObserver(update);ro.observe(el);return()=>ro.disconnect()},[effectiveAspect]);

  const base=natural.w&&natural.h&&frame.w&&frame.h?Math.max(frame.w/natural.w,frame.h/natural.h):1;
  const baseW=natural.w*base;const baseH=natural.h*base;
  const maxPosX=Math.max(0,(baseW*zoom-frame.w)/2);
  const maxPosY=Math.max(0,(baseH*zoom-frame.h)/2);
  const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
  const clampPos=(next:{x:number;y:number})=>({x:clamp(next.x,-maxPosX,maxPosX),y:clamp(next.y,-maxPosY,maxPosY)});

  useEffect(()=>{setPos(current=>clampPos(current))},[zoom,frame.w,frame.h,natural.w,natural.h]);

  function reset(){setZoom(0.8);setPos({x:0,y:0})}
  function pointerDown(e:React.PointerEvent){(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);dragRef.current={x:e.clientX,y:e.clientY,startX:pos.x,startY:pos.y}}
  function pointerMove(e:React.PointerEvent){const d=dragRef.current;if(!d)return;setPos(clampPos({x:d.startX+(e.clientX-d.x),y:d.startY+(e.clientY-d.y)}))}
  function pointerUp(){dragRef.current=null}

  async function confirm(){
    const img=imageRef.current;const box=frameRef.current;if(!img||!box)return;
    setSaving(true);
    try{
      const fw=box.clientWidth;const fh=box.clientHeight;const iw=img.naturalWidth;const ih=img.naturalHeight;
      const fit=Math.max(fw/iw,fh/ih);const scale=fit*zoom;
      const renderedW=iw*scale;const renderedH=ih*scale;
      const safeX=clamp(pos.x,-Math.max(0,(renderedW-fw)/2),Math.max(0,(renderedW-fw)/2));
      const safeY=clamp(pos.y,-Math.max(0,(renderedH-fh)/2),Math.max(0,(renderedH-fh)/2));
      const left=(fw-renderedW)/2+safeX;const top=(fh-renderedH)/2+safeY;
      const outW=Math.max(320,outputWidth);const outH=Math.round(outW/effectiveAspect);
      const canvas=document.createElement('canvas');canvas.width=outW;canvas.height=outH;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas');
      ctx.clearRect(0,0,outW,outH);
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      const outScale=outW/fw;
      ctx.drawImage(img,left*outScale,top*outScale,renderedW*outScale,renderedH*outScale);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.92));if(!blob)throw new Error('blob');
      const cropped=new File([blob],`${file.name.replace(/\.[^.]+$/,'')}-recorte.webp`,{type:'image/webp'});
      const previewUrl=URL.createObjectURL(cropped);onConfirm(cropped,previewUrl);
    } finally {setSaving(false)}
  }

  return <div className="fixed inset-x-0 top-0 z-[120] flex h-screen h-[100dvh] items-center justify-center overflow-hidden bg-black/80 px-2 py-2 sm:px-6 sm:py-6" role="dialog" aria-modal="true" aria-label={title}>
    <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-geek-line bg-geek-panel shadow-2xl sm:w-[80vw] sm:max-w-4xl">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-geek-orange">Editor de imagem</p><h2 className="text-xl font-semibold">{title}</h2></div><button type="button" onClick={onCancel} className="rounded-full border border-geek-line p-2" aria-label="Cancelar"><X size={18}/></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
        <p className="text-xs leading-5 text-slate-400 sm:text-sm">Arraste para reposicionar e use o zoom. Quando a proporção original estiver ativa, a imagem nunca será convertida para outro formato.</p>
        <div ref={frameRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} className={`relative mx-auto mt-3 max-w-full cursor-grab touch-none overflow-hidden rounded-2xl border border-orange-500/30 bg-black/50 active:cursor-grabbing sm:mt-4 ${isPortrait?'':'w-full max-w-2xl'}`} style={{aspectRatio:String(effectiveAspect),width:isPortrait?`min(100%, ${effectiveAspect*58}dvh, ${effectiveAspect*40}rem)`:undefined,maxHeight:'58dvh'}}>
          <img ref={imageRef} src={url} alt="Imagem para recorte" draggable={false} onLoad={e=>setNatural({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none" style={{width:baseW||undefined,height:baseH||undefined,transform:`translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${zoom})`}}/>
          <div className="pointer-events-none absolute inset-0 border border-white/40 shadow-[inset_0_0_0_9999px_rgba(0,0,0,.08)]"/>
          <div className="pointer-events-none absolute left-1/3 top-0 h-full border-l border-white/20"/><div className="pointer-events-none absolute left-2/3 top-0 h-full border-l border-white/20"/><div className="pointer-events-none absolute left-0 top-1/3 w-full border-t border-white/20"/><div className="pointer-events-none absolute left-0 top-2/3 w-full border-t border-white/20"/>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-4"><Minus size={17}/><input className="w-full accent-orange-500" type="range" min="0.5" max="3" step="0.01" value={zoom} onChange={e=>setZoom(Number(e.target.value))} aria-label="Zoom"/><Plus size={17}/><span className="w-14 text-right text-xs text-slate-400">{Math.round(zoom*100)}%</span></div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-geek-line bg-geek-panel px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:pb-5"><button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-geek-line px-4 py-2.5 text-sm font-semibold"><RotateCcw size={16}/>Redefinir</button><div className={`grid gap-2 ${onUseOriginal?'grid-cols-3':'grid-cols-2'}`}><button type="button" onClick={onCancel} className="rounded-xl border border-geek-line px-3 py-2.5 text-sm font-semibold">Cancelar</button>{onUseOriginal&&<button type="button" onClick={onUseOriginal} className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2.5 text-sm font-semibold text-orange-200">Usar original</button>}<button type="button" onClick={()=>void confirm()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-geek-orange px-3 py-2.5 text-sm font-semibold disabled:opacity-60">{saving?<Crop className="animate-pulse" size={16}/>:<Check size={16}/>}Aplicar edição</button></div></div>
    </div>
  </div>;
}
