import { AmbassadorProBadge } from '@/components/ambassador-pro-badge';
import { LogoutButton } from '@/components/logout-button';
import { PinnedRecapCard } from '@/components/pinned-recap-card';
import { ProfileClient } from '@/components/profile-client';
import { ProfileLinks } from '@/components/profile-links';
import { ProfileTabs } from '@/components/profile-tabs';
import { XPProgressCard } from '@/components/xp-progress-card';

export default function Page(){
  return <>
    <ProfileClient/>
    <AmbassadorProBadge/>
    <ProfileLinks editable/>
    <XPProgressCard/>
    <PinnedRecapCard/>
    <ProfileTabs/>
    <div className="mx-auto flex w-full max-w-4xl justify-end px-3 pb-10 sm:px-5"><LogoutButton/></div>
  </>;
}
