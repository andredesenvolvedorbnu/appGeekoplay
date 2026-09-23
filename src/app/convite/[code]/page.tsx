import { redirect } from 'next/navigation';

export default async function ConvitePage({params}:{params:Promise<{code:string}>}){
  const {code}=await params;
  const normalized=String(code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,24);
  redirect(normalized?`/cadastro?ref=${encodeURIComponent(normalized)}`:'/cadastro');
}
