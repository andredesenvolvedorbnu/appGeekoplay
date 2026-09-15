import { SimpleListPage } from '@/components/simple-list-page';
export default function Page(){return <SimpleListPage title="Eventos" subtitle="Eventos oficiais cadastrados no GeekoPlay." table="events" fields={['title','category','city','state','starts_at','ends_at']}/>}
