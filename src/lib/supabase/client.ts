import { createBrowserClient } from '@supabase/ssr';
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
  storage.from=((bucketId:string)=>{
    const bucket=originalFrom(bucketId);
    const originalUpload=bucket.upload.bind(bucket);
    bucket.upload=((path,body,options)=>originalUpload(path,body,{
      ...options,
      ...(isImmutableMediaPath(path)?{cacheControl:IMMUTABLE_MEDIA_CACHE}:{}),
    })) as typeof bucket.upload;
    return bucket;
  }) as typeof storage.from;

  return client;
}
