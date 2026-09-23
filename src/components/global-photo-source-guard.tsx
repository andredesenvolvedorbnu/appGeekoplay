'use client';

import { useEffect, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

export function GlobalPhotoSourceGuard(){
  const [target,setTarget]=useState<HTMLInputElement|null>(null);

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
    camera.addEventListener('change',()=>{
      try{
        if(camera.files?.length){
          input.files=camera.files;
          input.dispatchEvent(new Event('change',{bubbles:true}));
        }
      }finally{
        camera.remove();
      }
    },{once:true});
    document.body.appendChild(camera);
    camera.click();
  }

  if(!target)return null;
  return <div className="fixed inset-0 z-[250] bg-black/70 p-3 sm:grid sm:place-items-center" onMouseDown={event=>{if(event.target===event.currentTarget)setTarget(null)}} role="dialog" aria-modal="true" aria-label="Escolher origem da foto">
    <section className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-geek-line bg-geek-panel p-4 shadow-2xl sm:static sm:w-full sm:max-w-md sm:rounded-3xl">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">Adicionar foto</h2><p className="mt-1 text-sm text-slate-400">Escolha como deseja adicionar a imagem.</p></div><button type="button" onClick={()=>setTarget(null)} className="rounded-xl p-2 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={chooseDevice} className="flex items-center gap-3 rounded-2xl border border-geek-line bg-geek-soft p-4 text-left hover:border-orange-500/40"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><ImageIcon size={22}/></span><span><b className="block">Escolher do dispositivo</b><span className="text-xs text-slate-500">Galeria ou arquivos do celular/computador</span></span></button>
        <button type="button" onClick={openCamera} className="flex items-center gap-3 rounded-2xl border border-geek-line bg-geek-soft p-4 text-left hover:border-orange-500/40"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><Camera size={22}/></span><span><b className="block">Tirar uma foto</b><span className="text-xs text-slate-500">Abrir a câmera do dispositivo</span></span></button>
      </div>
    </section>
  </div>;
}
