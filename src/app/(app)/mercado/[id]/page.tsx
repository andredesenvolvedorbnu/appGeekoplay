import { MarketItemDetailClient } from '@/components/market-item-detail-client';

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <MarketItemDetailClient itemId={id}/>;
}
