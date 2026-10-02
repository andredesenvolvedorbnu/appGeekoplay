'use client';

import { useEffect, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { optimizeImageFile } from '@/lib/media-optimize';

async function optimizeFiles(files:File[]){
  return Promise.all(files.map(file=>optimizeImageFile(file,{maxWidth:1600,maxHeight:1600,quality:0.82,preserveGif:true})));
}

function replaceInputFiles(input:HTMLInputElement,files:File[]){
  try{
    if(typeof DataTransfer==='undefined')return false;
    const transfer=new DataTransfer();
    files.forEach(file=>transfer.items.add(file));
    input.files=transfer.files;
    return true;
  }catch{
    return false;
  }
}

export function GlobalPhotoSourceGuard(){
  const [target,setTarget]=useState<HTMLInputElement|null>(null);
  const [preparing,setPreparing]=useState(false);

  useEffect(()=>{
    function intercept(event:MouseEvent){
      const element=event.target;
      if(!(element instanceof HTMLInputElement))return;
      if(element.type!=='file')return;
      if(element.dataset.photoSourceManaged==='true')return;
      if(element.dataset.photoSourceBypass==='true'){
        delete element.dataset.photoSourceBypass;
        return;
      }
      const accept=(element.accept||'').toLowerCase();
      if(!accept.includes('image'))return;
      event.preventDefault();
      event.stopPropagation();
      setTarget(element);
    }
    document.addEventListener('click',intercept,true);
    return()=>document.removeEventListener('click',intercept,true);
  },[]);

  function chooseDevice(){
    const input=target;
    setTarget(null);
    if(!input)return;

    const onChange=async(event:Event)=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      input.removeEventListener('change',onChange,true);
      const files=Array.from(input.files||[]);
      if(!files.length){
        input.dispatchEvent(new Event('change',{bubbles:true}));
        return;
      }
      setPreparing(true);
      try{
        const optimized=await optimizeFiles(files);
        // Some older/mobile browsers may not support constructing DataTransfer.
        // In that case keep the original FileList and continue normally rather
        // than blocking an upload for a real user.
        replaceInputFiles(input,optimized);
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }catch{
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }finally{setPreparing(false)}
    };

    input.addEventListener('change',onChange,true);
    input.dataset.photoSourceBypass='true';
    input.click();
  }

  function openCamera(){
    const input=target;
    setTarget(null);
    if(!input)return;
    const camera=document.createElement('input');
    camera.type='file';
    camera.accept='image/*';
    camera.capture='environment';
    camera.style.position='fixed';
    camera.style.left='-9999px';
    camera.dataset.photoSourceManaged='true';
    camera.addEventListener('change',async()=>{
      try{
        const files=Array.from(camera.files||[]);
        if(files.length){
          setPreparing(true);
          const optimized=await optimizeFiles(files);
          if(!replaceInputFiles(input,optimized)){
            try{input.files=camera.files}catch{}
          }
          input.dispatchEvent(new Event('change',{bubbles:true}));
        }
      }catch{
        try{input.files=camera.files}catch{}
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }finally{
        setPreparing(false);
        camera.remove();
      }
    },{once:true});
    document.body.appendChild(camera);
    camera.click();
  }

  if(!target&&!preparing)return null;
  return <div className="fixed inset-0 z-[250] bg-black/70 p-3 sm:grid sm:place-items-center" onMouseDown={event=>{if(event.target===event.currentTarget&&!preparing)setTarget(null)}} role="dialog" aria-modal="true" aria-label="Escolher origem da foto">
    <section className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-geek-line bg-geek-panel p-4 shadow-2xl sm:static sm:w-full sm:max-w-md sm:rounded-3xl">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">Adicionar foto</h2><p className="mt-1 text-sm text-slate-400">{preparing?'Otimizando imagem para envio...':'Escolha como deseja adicionar a imagem.'}</p></div><button type="button" disabled={preparing} onClick={()=>setTarget(null)} className="rounded-xl p-2 hover:bg-geek-soft disabled:opacity-50" aria-label="Fechar"><X size={20}/></button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" disabled={preparing} onClick={chooseDevice} className="flex items-center gap-3 rounded-2xl border border-geek-line bg-geek-soft p-4 text-left hover:border-orange-500/40 disabled:pointer-events-none disabled:opacity-60"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><ImageIcon size={22}/></span><span><b className="block">Escolher do dispositivo</b><span className="text-xs text-slate-500">Galeria ou arquivos do celular/computador</span></span></button>
        <button type="button" disabled={preparing} onClick={openCamera} className="flex items-center gap-3 rounded-2xl border border-geek-line bg-geek-soft p-4 text-left hover:border-orange-500/40 disabled:pointer-events-none disabled:opacity-60"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><Camera size={22}/></span><span><b className="block">Tirar uma foto</b><span className="text-xs text-slate-500">Abrir a câmera do dispositivo</span></span></button>
      </div>
    </section>
  </div>;
}
