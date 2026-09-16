import { createClient } from '@/lib/supabase/server';
import { AdminMarketClient } from '@/components/admin-market-client';

export default async function AdminMercadoPage() {
  const supabase = await createClient();
  const { data: items } = await supabase.from('market_items').select('*').order('created_at', { ascending: false }).limit(500);
  const sellerIds=[...new Set((items||[]).map(item=>item.seller_id))];
  const {data:sellers}=sellerIds.length?await supabase.from('profiles').select('id,display_name,username').in('id',sellerIds):{data:[]};
  return <div className="mx-auto max-w-7xl space-y-5"><div><p className="text-sm font-bold text-geek-orange">ADMINISTRAÇÃO</p><h1 className="text-2xl sm:text-3xl font-black">Mercado Geek</h1><p className="mt-2 text-sm text-slate-400">Gerencie os itens anunciados, seus estados e a moderação da vitrine.</p></div><AdminMarketClient initialItems={(items||[]) as never[]} sellers={(sellers||[]) as never[]}/></div>;
}
