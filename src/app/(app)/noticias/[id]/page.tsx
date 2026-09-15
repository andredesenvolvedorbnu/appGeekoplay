import { NewsDetailClient } from '@/components/news-detail-client';

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <NewsDetailClient newsId={id}/>;
}
