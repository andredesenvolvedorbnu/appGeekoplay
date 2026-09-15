'use client';

import { useEffect,useMemo,useRef,useState } from 'react';
import { Check,Crop,Minus,Plus,RotateCcw,X } from 'lucide-react';

type Props={
  file:File;
  aspect:number;
  title?:string;
  outputWidth?:number;
  onCancel:()=>void;
  onConfirm:(file:File,previewUrl:string)=>void;
};

type Size={w:number;h:number};

export function ImageCropper({file,aspect,title='Ajustar imagem',outputWidth=1600,onCancel,onConfirm}:Props){
  const url=useMemo(()=>URL.createObjectURL(file),[file]);
  const imageRef=useRef<HTMLImageElement|null>(null);
  const frameRef=useRef<HTMLDivElement|null>(null);
  const dragRef=useRef<{x:number;y:number;startX:number;startY:number}|null>(null);
  const [zoom,setZoom]=useState(1);
  const [pos,setPos]=useState({x:0,y:0});
  const [saving,setSaving]=useState(false);
  const [natural,setNatural]=useState<Size>({w:0,h:0});
  const [frame,setFrame]=useState<Size>({w:0,h:0});

  useEffect(()=>()=>URL.revokeObjectURL(url),[url]);
  useEffect(()=>{const el=frameRef.current;if(!el)return;const update=()=>setFrame({w:el.clientWidth,h:el.clientHeight});update();const ro=new ResizeObserver(update);ro.observe(el);return()=>ro.disconnect()},[]);

  const base=natural.w&&natural.h&&frame.w&&frame.h?Math.max(frame.w/natural.w,frame.h/natural.h):1;
  const baseW=natural.w*base;const baseH=natural.h*base;

  function reset(){setZoom(1);setPos({x:0,y:0})}
  function pointerDown(e:React.PointerEvent){(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);dragRef.current={x:e.clientX,y:e.clientY,startX:pos.x,startY:pos.y}}
  function pointerMove(e:React.PointerEvent){const d=dragRef.current;if(!d)return;setPos({x:d.startX+(e.clientX-d.x),y:d.startY+(e.clientY-d.y)})}
  function pointerUp(){dragRef.current=null}

  async function confirm(){
    const img=imageRef.current;const box=frameRef.current;if(!img||!box)return;
    setSaving(true);
    try{
      const fw=box.clientWidth;const fh=box.clientHeight;const iw=img.naturalWidth;const ih=img.naturalHeight;
      const fit=Math.max(fw/iw,fh/ih);const scale=fit*zoom;
      const renderedW=iw*scale;const renderedH=ih*scale;
      const left=(fw-renderedW)/2+pos.x;const top=(fh-renderedH)/2+pos.y;
      const sx=Math.max(0,-left/scale);const sy=Math.max(0,-top/scale);
      const sw=Math.min(iw-sx,fw/scale);const sh=Math.min(ih-sy,fh/scale);
      const outW=Math.max(320,outputWidth);const outH=Math.round(outW/aspect);
      const canvas=document.createElement('canvas');canvas.width=outW;canvas.height=outH;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas');
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.fillStyle='#000';ctx.fillRect(0,0,outW,outH);
      const dx=Math.max(0,left/fw*outW);const dy=Math.max(0,top/fh*outH);
      const dw=sw*scale/fw*outW;const dh=sh*scale/fh*outH;
      ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.92));if(!blob)throw new Error('blob');
      const cropped=new File([blob],`${file.name.replace(/\.[^.]+$/,'')}-recorte.webp`,{type:'image/webp'});
      const previewUrl=URL.createObjectURL(cropped);onConfirm(cropped,previewUrl);
    } finally {setSaving(false)}
  }

  return <div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
    <div className="w-full max-w-3xl rounded-3xl border border-geek-line bg-geek-panel p-4 shadow-2xl sm:p-5">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-geek-orange">Editor de imagem</p><h2 className="text-xl font-semibold">{title}</h2></div><button onClick={onCancel} className="rounded-full border border-geek-line p-2" aria-label="Cancelar"><X size={18}/></button></div>
      <p className="mt-2 text-sm text-slate-400">Arraste para escolher a área, use o zoom e confirme. A imagem nunca será esticada ou deformada.</p>
      <div ref={frameRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} className="relative mx-auto mt-4 w-full max-w-2xl cursor-grab touch-none overflow-hidden rounded-2xl border border-orange-500/30 bg-black/50 active:cursor-grabbing" style={{aspectRatio:String(aspect)}}>
        <img ref={imageRef} src={url} alt="Imagem para recorte" draggable={false} onLoad={e=>setNatural({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none" style={{width:baseW||undefined,height:baseH||undefined,transform:`translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${zoom})`}}/>
        <div className="pointer-events-none absolute inset-0 border border-white/40 shadow-[inset_0_0_0_9999px_rgba(0,0,0,.08)]"/>
        <div className="pointer-events-none absolute left-1/3 top-0 h-full border-l border-white/20"/><div className="pointer-events-none absolute left-2/3 top-0 h-full border-l border-white/20"/><div className="pointer-events-none absolute left-0 top-1/3 w-full border-t border-white/20"/><div className="pointer-events-none absolute left-0 top-2/3 w-full border-t border-white/20"/>
      </div>
      <div className="mt-4 flex items-center gap-3"><Minus size={17}/><input className="w-full accent-orange-500" type="range" min="1" max="3" step="0.01" value={zoom} onChange={e=>setZoom(Number(e.target.value))} aria-label="Zoom"/><Plus size={17}/><span className="w-14 text-right text-xs text-slate-400">{Math.round(zoom*100)}%</span></div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><button onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-geek-line px-4 py-2.5 text-sm font-semibold"><RotateCcw size={16}/>Redefinir</button><div className="flex gap-2"><button onClick={onCancel} className="rounded-xl border border-geek-line px-4 py-2.5 text-sm font-semibold">Cancelar</button><button onClick={()=>void confirm()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-geek-orange px-4 py-2.5 text-sm font-semibold disabled:opacity-60">{saving?<Crop className="animate-pulse" size={16}/>:<Check size={16}/>}Confirmar recorte</button></div></div>
    </div>
  </div>;
}
