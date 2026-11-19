import { redirect } from 'next/navigation';
import { FeedClient } from '@/components/feed-client';
import { PulseStrip } from '@/components/pulse-strip';
import { RecapReminder } from '@/components/recap-reminder';
import { CommunityCarousel } from '@/components/community-carousel';
import { DiscoverPeopleCta } from '@/components/discover-people-cta';
import { EventFeedbackReminder } from '@/components/event-feedback-reminder';
import { GameSpotlight } from '@/components/game-spotlight';

type HomePageProps={searchParams:Promise<{post?:string|string[]}>};

export default async function HomePage({searchParams}:HomePageProps){
  const query=await searchParams;
  const postId=Array.isArray(query.post)?query.post[0]:query.post;
  if(postId&&/^[0-9a-f-]{36}$/i.test(postId))redirect(`/publicacao/${postId}`);
  return <>
    <EventFeedbackReminder/>
    <RecapReminder/>
    <PulseStrip/>
    <GameSpotlight/>
    <CommunityCarousel/>
    <DiscoverPeopleCta/>
    <FeedClient/>
  </>;
}
