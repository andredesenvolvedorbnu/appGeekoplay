import { CollectionItemDetailClient } from '@/components/collection-item-detail-client';

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <CollectionItemDetailClient itemId={id}/>;
}
