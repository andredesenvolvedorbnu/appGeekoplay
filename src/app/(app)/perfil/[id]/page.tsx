import { ProfileLinks } from '@/components/profile-links';
import { PublicProfileClient } from '@/components/public-profile-client';

export default async function Page({ params }:{ params:Promise<{id:string}> }){
  const { id } = await params;
  return <>
    <PublicProfileClient profileId={id}/>
    <ProfileLinks userId={id}/>
  </>;
}
