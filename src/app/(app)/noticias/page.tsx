import { SimpleListPage } from '@/components/simple-list-page';
export default function Page(){return <SimpleListPage title="Notícias" subtitle="Conteúdo de cultura pop, geek e games selecionado pela plataforma." table="news" fields={['title','summary','source_name','category','published_at']}/>}
