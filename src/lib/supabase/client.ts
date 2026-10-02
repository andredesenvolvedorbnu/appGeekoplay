import { createBrowserClient } from '@supabase/ssr';
import { optimizeImageFile } from '@/lib/media-optimize';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

const IMMUTABLE_MEDIA_CACHE='31536000';

function isImmutableMediaPath(path:string){
  const filename=path.split('/').pop()||'';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]+$/i.test(filename)
    || /^(avatar|cover)-\d+\.[a-z0-9]+$/i.test(filename);
}

export function createClient() {
  const client=createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const storage=client.storage;
  const originalFrom=storage.from.bind(storage);

  // GeekoPlay creates new UUID/timestamp paths instead of overwriting media.
  // Give those immutable files a long browser cache so repeat views do not
  // generate another Storage transfer and cached-egress charge.
  // As a final safety net, every image File is also optimized here before it
  // reaches Storage. This protects upload flows that do not use the dedicated
  // photo picker/cropper without changing existing URLs or media.
  storage.from=((bucketId:string)=>{
    const bucket=originalFrom(bucketId);
    const originalUpload=bucket.upload.bind(bucket);
    bucket.upload=(async(path,body,options)=>{
      let nextBody=body;
      let nextOptions=options;

      if(typeof File!=='undefined'&&body instanceof File&&body.type.startsWith('image/')){
        const optimized=await optimizeImageFile(body,{
          maxWidth:1600,
          maxHeight:1600,
          quality:0.80,
          preserveGif:true,
        });
        nextBody=optimized as typeof body;
        nextOptions={...options,contentType:optimized.type||options?.contentType};
      }

      return originalUpload(path,nextBody,{
        ...nextOptions,
        ...(isImmutableMediaPath(path)?{cacheControl:IMMUTABLE_MEDIA_CACHE}:{}),
      });
    }) as typeof bucket.upload;
    return bucket;
  }) as typeof storage.from;

  return client;
}
