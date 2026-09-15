import { SimpleListPage } from '@/components/simple-list-page';
export default function Page(){return <SimpleListPage title="Mercado Geek" subtitle="Itens usados, colecionáveis e oportunidades dentro da comunidade." table="market_items" fields={['title','description','price','category','item_condition','city','state','status']}/>}
