'use client';

import { useEffect,useState } from 'react';
import { X } from 'lucide-react';

type MediaState={type:'image'|'video';src:string;alt:string};

function isEligibleImage(image:HTMLImageElement){
  if(!image.src)return false;
  if(image.closest('button,input,label,[role="button"],[data-no-media-viewer="true"]'))return false;
  const pathname=window.location.pathname;
  if(pathname.startsWith('/admin'))return false;
  const alt=(image.alt||'').toLowerCase();
  const rect=image.getBoundingClientRect();
  const profileMedia=alt.includes('capa do perfil')||alt.includes('foto do perfil')||alt.startsWith('foto de ');
  const publicationMedia=alt==='publicação'||alt.includes('da publicação')||alt.includes('geek card');
  const detailMedia=(/^\/publicacao\//.test(pathname)||/^\/colecao\/[^/]+/.test(pathname)||/^\/mercado\/[^/]+/.test(pathname))&&rect.width>=150&&rect.height>=100;
  return profileMedia||publicationMedia||detailMedia;
}

function isEligibleVideo(video:HTMLVideoElement){
  if(!video.src)return false;
  if(video.closest('button,input,label,[role="button"],[data-no-media-viewer="true"]'))return false;
  const pathname=window.location.pathname;
  if(pathname.startsWith('/admin'))return false;
  return video.dataset.feedVideo==='true'||/^\/publicacao\//.test(pathname)||Boolean(video.closest('a[href^="/publicacao/"]'));
}

export function GlobalMediaViewer(){
  const [media,setMedia]=useState<MediaState|null>(null);

  useEffect(()=>{
    function onClick(event:MouseEvent){
      const target=event.target;
      if(target instanceof HTMLImageElement&&isEligibleImage(target)){
        event.preventDefault();event.stopPropagation();
        setMedia({type:'image',src:target.currentSrc||target.src,alt:target.alt||'Imagem'});
        return;
      }
      if(target instanceof HTMLVideoElement&&isEligibleVideo(target)){
        const rect=target.getBoundingClientRect();
        const y=event.clientY-rect.top;
        if(rect.height-y<58)return;
        event.preventDefault();event.stopPropagation();
        target.pause();
        setMedia({type:'video',src:target.currentSrc||target.src,alt:'Vídeo'});
      }
    }
    function onKey(event:KeyboardEvent){if(event.key==='Escape')setMedia(null)}
    document.addEventListener('click',onClick,true);
    window.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('click',onClick,true);window.removeEventListener('keydown',onKey)};
  },[]);

  useEffect(()=>{
    if(!media)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous};
  },[media]);

  if(!media)return null;
  return <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label="Visualização de mídia" onMouseDown={event=>{if(event.target===event.currentTarget)setMedia(null)}}>
    <button type="button" onClick={()=>setMedia(null)} className="absolute right-3 top-[max(12px,env(safe-area-inset-top))] z-10 grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur hover:bg-black/90" aria-label="Fechar visualização"><X size={24}/></button>
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl">
      {media.type==='image'?<img src={media.src} alt={media.alt} className="block max-h-full max-w-full select-none object-contain object-center" draggable={false}/>:<video src={media.src} controls autoPlay playsInline preload="metadata" className="block max-h-full max-w-full object-contain object-center"/>}
    </div>
  </div>;
}
