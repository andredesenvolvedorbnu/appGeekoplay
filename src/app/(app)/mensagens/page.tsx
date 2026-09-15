import { SimpleListPage } from '@/components/simple-list-page';
export default function Page(){return <SimpleListPage title="Mensagens" subtitle="Conversas privadas entre membros da comunidade." table="messages" fields={['body','created_at','read_at']}/>}
