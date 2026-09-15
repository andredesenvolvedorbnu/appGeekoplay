import { SimpleListPage } from '@/components/simple-list-page';
export default function Page(){return <SimpleListPage title="Explorar" subtitle="Descubra publicações e tendências da comunidade." table="posts" fields={['content','category','post_type','created_at']}/>}
