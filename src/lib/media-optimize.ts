'use client';

export type ImageOptimizeOptions={
  maxWidth?:number;
  maxHeight?:number;
  quality?:number;
  format?:'image/webp'|'image/jpeg';
  preserveGif?:boolean;
  minWidth?:number;
  minHeight?:number;
};

function loadImage(file:File){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível ler a imagem.'))};
    image.src=url;
  });
}

function outputName(file:File,format:string){
  const base=file.name.replace(/\.[^.]+$/,'')||'imagem';
  return `${base}.${format==='image/jpeg'?'jpg':'webp'}`;
}

/**
 * Regra universal de mídia do GeekoPlay para NOVOS uploads.
 * - Não altera arquivos já existentes.
 * - Mantém proporção original.
 * - Nunca aumenta a resolução da origem.
 * - Em caso de falha, retorna o arquivo original para não bloquear o usuário.
 */
export async function optimizeImageFile(file:File,options:ImageOptimizeOptions={}):Promise<File>{
  const {
    maxWidth=1600,
    maxHeight=1600,
    quality=0.82,
    format='image/webp',
    preserveGif=true,
    minWidth=1,
    minHeight=1
  }=options;

  if(!file.type.startsWith('image/'))return file;
  if(preserveGif&&file.type==='image/gif')return file;

  try{
    const image=await loadImage(file);
    const sourceW=image.naturalWidth||image.width;
    const sourceH=image.naturalHeight||image.height;
    if(!sourceW||!sourceH)return file;

    const scale=Math.min(1,maxWidth/sourceW,maxHeight/sourceH);
    const width=Math.max(minWidth,Math.round(sourceW*scale));
    const height=Math.max(minHeight,Math.round(sourceH*scale));
    const canvas=document.createElement('canvas');
    canvas.width=width;
    canvas.height=height;
    const ctx=canvas.getContext('2d');
    if(!ctx)return file;
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(image,0,0,width,height);

    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,format,quality));
    if(!blob)return file;

    // Never replace an already-smaller file with a larger encoded version.
    if(blob.size>=file.size&&file.type!=='image/png')return file;

    return new File([blob],outputName(file,format),{type:format,lastModified:Date.now()});
  }catch{
    return file;
  }
}

export function responsiveImageClass(mode:'cover'|'contain'='cover'){
  return mode==='contain'
    ? 'block h-auto max-h-full w-auto max-w-full object-contain object-center'
    : 'block h-full w-full object-cover object-center';
}
