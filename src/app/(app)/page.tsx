import { FeedClient } from '@/components/feed-client';
import { PulseStrip } from '@/components/pulse-strip';

export default function HomePage(){
  return <>
    <PulseStrip/>
    <FeedClient/>
  </>;
}
