import { FeedClient } from '@/components/feed-client';
import { PulseStrip } from '@/components/pulse-strip';
import { RecapReminder } from '@/components/recap-reminder';

export default function HomePage(){
  return <>
    <RecapReminder/>
    <PulseStrip/>
    <FeedClient/>
  </>;
}
