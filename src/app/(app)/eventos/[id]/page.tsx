import { EventDetailClient } from '@/components/event-detail-client';
import { EventLocationTracker } from '@/components/event-location-tracker';

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <><EventDetailClient eventId={id}/><EventLocationTracker eventId={id}/></>;
}
