import { SimpleListPage } from '@/components/simple-list-page';
export default function Page(){return <SimpleListPage title="Notificações" subtitle="Curtidas, comentários, seguidores, mensagens e eventos." table="notifications" fields={['title','body','type','created_at']}/>}
