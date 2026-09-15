import { SimpleListPage } from '@/components/simple-list-page';
export default function Page(){return <SimpleListPage title="Comunidades" subtitle="Encontre fandoms, grupos e pessoas com os mesmos interesses." table="communities" fields={['name','description','category','visibility']}/>}
