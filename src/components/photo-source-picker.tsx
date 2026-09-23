'use client';

import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

type Props = {
  onSelect: (file: File | null) => void;
  onSelectMany?: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
  className?: string;
  cameraFacing?: 'user' | 'environment';
};

export function PhotoSourcePicker({onSelect,onSelectMany,multiple=false,accept='image/jpeg,image/png,image/webp',label='Carregar ou tirar uma foto',className='',cameraFacing='environment'}:Props){
  const [open,setOpen]=useState(false);
  const galleryRef=useRef<HTMLInputElement>(null);
  const cameraRef=useRef<HTMLInputElement>(null);

  function pick(file:File|null){
    setOpen(false);
    onSelect(file);
    if(galleryRef.current)galleryRef.current.value='';
    if(cameraRef.current)cameraRef.current.value='';
  }

  return <>
    <button type="button" onClick={()=>setOpen(true)} className={className}>{label}</button>
    <input data-photo-source-managed="true" ref={galleryRef} hidden type="file" accept={accept} multiple={multiple} onChange={e=>{const files=Array.from(e.target.files||[]);setOpen(false);if(multiple&&onSelectMany)onSelectMany(files);else onSelect(files[0]||null);if(galleryRef.current)galleryRef.current.value=''}}/>
    <input data-photo-source-managed="true" ref={cameraRef} hidden type="file" accept="image/*" capture={cameraFacing} onChange={e=>pick(e.target.files?.[0]||null)}/>
    {open&&<div className="fixed inset-0 z-[160] bg-black/65 p-3 sm:grid sm:place-items-center" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}} role="dialog" aria-modal="true" aria-label="Escolher origem da foto">
      <section className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-geek-line bg-geek-panel p-4 shadow-2xl sm:static sm:w-full sm:max-w-md sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black">Adicionar foto</h2><p className="mt-1 text-sm text-slate-400">Escolha de onde você quer pegar a imagem.</p></div><button type="button" onClick={()=>setOpen(false)} className="rounded-xl p-2 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={()=>galleryRef.current?.click()} className="flex items-center gap-3 rounded-2xl border border-geek-line bg-geek-soft p-4 text-left hover:border-orange-500/40"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><ImageIcon size={22}/></span><span><b className="block">{multiple?'Carregar fotos':'Carregar foto'}</b><span className="text-xs text-slate-500">{multiple?'Escolher várias da galeria ou arquivos':'Escolher da galeria ou arquivos'}</span></span></button>
          <button type="button" onClick={()=>cameraRef.current?.click()} className="flex items-center gap-3 rounded-2xl border border-geek-line bg-geek-soft p-4 text-left hover:border-orange-500/40"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500/10 text-orange-300"><Camera size={22}/></span><span><b className="block">Tirar uma foto</b><span className="text-xs text-slate-500">Abrir a câmera do dispositivo</span></span></button>
        </div>
      </section>
    </div>}
  </>;
}
