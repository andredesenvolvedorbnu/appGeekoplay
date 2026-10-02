'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { optimizeImageFile } from '@/lib/media-optimize';

type Props = {
  onSelect: (file: File | null) => void;
  onSelectMany?: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
  className?: string;
  cameraFacing?: 'user' | 'environment';
};

async function prepareFiles(files:File[]){
  return Promise.all(files.map(file=>optimizeImageFile(file,{maxWidth:2000,maxHeight:2000,quality:0.86,preserveGif:true})));
}

export function PhotoSourcePicker({onSelect,onSelectMany,multiple=false,accept='image/jpeg,image/png,image/webp',label='Carregar ou tirar uma foto',className='',cameraFacing='environment'}:Props){
  const [open,setOpen]=useState(false);
  const [ready,setReady]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [preparing,setPreparing]=useState(false);
  const galleryRef=useRef<HTMLInputElement>(null);
  const readyTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{setMounted(true);return()=>{if(readyTimerRef.current)clearTimeout(readyTimerRef.current)}},[]);

  function openPicker(){
    if(readyTimerRef.current)clearTimeout(readyTimerRef.current);
    setReady(false);
    setOpen(true);
    readyTimerRef.current=setTimeout(()=>setReady(true),300);
  }

  function closePicker(){
    if(readyTimerRef.current)clearTimeout(readyTimerRef.current);
    readyTimerRef.current=null;
    setReady(false);
    setOpen(false);
  }

  function chooseFromDevice(){
    if(!ready||preparing)return;
    galleryRef.current?.click();
  }

  function openCamera(){
    if(!ready||preparing)return;
    const input=document.createElement('input');
    input.type='file';
    input.accept='image/*';
    input.setAttribute('capture',cameraFacing);
    input.style.position='fixed';
    input.style.left='-9999px';
    input.onchange=async()=>{
      const file=input.files?.[0]||null;
      input.remove();
      if(!file){closePicker();onSelect(null);return}
      setPreparing(true);
      try{
        const prepared=await optimizeImageFile(file,{maxWidth:2000,maxHeight:2000,quality:0.86,preserveGif:true});
        closePicker();
        onSelect(prepared);
      }finally{setPreparing(false)}
    };
    document.body.appendChild(input);
    input.click();
  }

  async function handleGalleryChange(files:File[]){
    if(!files.length){closePicker();onSelect(null);return}
    setPreparing(true);
    try{
      const prepared=await prepareFiles(files);
      closePicker();
      if(multiple&&onSelectMany)onSelectMany(prepared);
      else onSelect(prepared[0]||null);
    }finally{
      setPreparing(false);
      if(galleryRef.current)galleryRef.current.value='';
    }
  }

  const chooser=open&&mounted?createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 p-3 sm:grid sm:place-items-center" onPointerDown={e=>{if(e.target===e.currentTarget&&!preparing)closePicker()}} role="dialog" aria-modal="true" aria-label="Escolher origem da foto">
      <section className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-geek-line bg-geek-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:static sm:w-full sm:max-w-md sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">Escolher foto</h2><p className="mt-1 text-sm text-slate-400">{preparing?'Otimizando imagem para envio...':'Use uma imagem salva no dispositivo ou abra a câmera.'}</p></div><button type="button" disabled={preparing} onClick={closePicker} className="rounded-xl p-2 hover:bg-geek-soft disabled:opacity-50" aria-label="Fechar"><X size={20}/></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={!ready||preparing} onClick={chooseFromDevice} className="flex min-h-20 items-center gap-3 rounded-2xl border border-geek-line bg-geek-soft p-4 text-left hover:border-orange-500/40 disabled:pointer-events-none disabled:opacity-60"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><ImageIcon size={22}/></span><span><b className="block">{multiple?'Escolher fotos':'Escolher foto'}</b><span className="text-xs leading-5 text-slate-500">Galeria, arquivos ou fotos salvas no dispositivo</span></span></button>
          <button type="button" disabled={!ready||preparing} onClick={openCamera} className="flex min-h-20 items-center gap-3 rounded-2xl border border-geek-line bg-geek-soft p-4 text-left hover:border-orange-500/40 disabled:pointer-events-none disabled:opacity-60"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><Camera size={22}/></span><span><b className="block">Abrir câmera</b><span className="text-xs leading-5 text-slate-500">Tirar uma nova foto agora</span></span></button>
        </div>
      </section>
    </div>,document.body
  ):null;

  return <>
    <button type="button" onClick={openPicker} className={className}>{label}</button>
    <input data-photo-source-managed="true" ref={galleryRef} hidden type="file" accept={accept} multiple={multiple} onChange={e=>void handleGalleryChange(Array.from(e.target.files||[]))}/>
    {chooser}
  </>;
}
