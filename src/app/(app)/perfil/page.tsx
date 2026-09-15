import { PinnedRecapCard } from '@/components/pinned-recap-card';
import { ProfileClient } from '@/components/profile-client';
import { XPProgressCard } from '@/components/xp-progress-card';

export default function Page(){
  return <>
    <ProfileClient/>
    <XPProgressCard/>
    <PinnedRecapCard/>
  </>;
}
