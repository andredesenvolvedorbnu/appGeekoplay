import { createHmac, timingSafeEqual } from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SUPABASE_URL } from '@/lib/supabase/config';

function safeEqualHex(a:string,b:string){
  try{
    const left=Buffer.from(a,'hex');
    const right=Buffer.from(b,'hex');
    return left.length===right.length&&timingSafeEqual(left,right);
  }catch{return false}
}

function verifySignature(request:Request,dataId:string,secret:string){
  const signature=request.headers.get('x-signature')||'';
  const requestId=request.headers.get('x-request-id')||'';
  const parts=Object.fromEntries(signature.split(',').map(part=>part.trim().split('=')));
  const ts=parts.ts;
  const v1=parts.v1;
  if(!ts||!v1)return false;
  const manifest=`id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected=createHmac('sha256',secret).update(manifest).digest('hex');
  return safeEqualHex(expected,v1);
}

export async function POST(request:Request){
  try{
    const accessToken=process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const webhookSecret=process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!accessToken||!webhookSecret||!serviceRole){
      console.error('Mercado Pago webhook env is incomplete');
      return NextResponse.json({error:'Webhook ainda não configurado.'},{status:503});
    }

    const url=new URL(request.url);
    let body:any={};
    try{body=await request.json()}catch{}
    const dataId=String(url.searchParams.get('data.id')||url.searchParams.get('data_id')||body?.data?.id||'');
    const type=String(url.searchParams.get('type')||body?.type||'');
    if(!dataId)return NextResponse.json({ok:true,ignored:true});

    if(!verifySignature(request,dataId,webhookSecret)){
      return NextResponse.json({error:'Assinatura inválida.'},{status:401});
    }

    if(type&&type!=='payment')return NextResponse.json({ok:true,ignored:true});

    const paymentResponse=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,{
      headers:{Authorization:`Bearer ${accessToken}`},
      cache:'no-store'
    });
    const payment=await paymentResponse.json();
    if(!paymentResponse.ok){
      console.error('Mercado Pago payment lookup failed',payment);
      return NextResponse.json({error:'Falha ao validar pagamento.'},{status:502});
    }

    const externalReference=String(payment.external_reference||'');
    const [kind,requestId]=externalReference.split(':');
    if((kind!=='premium'&&kind!=='boost')||!requestId){
      return NextResponse.json({ok:true,ignored:true});
    }

    const supabase=createSupabaseClient(SUPABASE_URL,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
    const table=kind==='premium'?'premium_requests':'boost_requests';
    const {data:requestRow,error:requestError}=await supabase
      .from(table)
      .select('id,user_id,amount,status')
      .eq('id',requestId)
      .maybeSingle();

    if(requestError||!requestRow){
      console.error('Payment request not found',requestError);
      return NextResponse.json({error:'Solicitação não encontrada.'},{status:404});
    }

    const paidAmount=Number(payment.transaction_amount||0);
    const expectedAmount=Number(requestRow.amount||0);
    if(Math.abs(paidAmount-expectedAmount)>0.01){
      console.error('Payment amount mismatch',{requestId,paidAmount,expectedAmount});
      return NextResponse.json({error:'Valor divergente.'},{status:409});
    }

    const paymentStatus=String(payment.status||'unknown');
    const update:any={
      payment_provider:'mercado_pago',
      payment_id:String(payment.id||dataId),
      payment_reference:String(payment.preference_id||payment.id||dataId),
      payment_status:paymentStatus,
      payment_updated_at:new Date().toISOString()
    };

    if(paymentStatus==='approved'&&requestRow.status==='pending')update.status='approved';

    const {error:updateError}=await supabase.from(table).update(update).eq('id',requestId);
    if(updateError){
      console.error('Payment status update failed',updateError);
      return NextResponse.json({error:'Falha ao atualizar solicitação.'},{status:500});
    }

    return NextResponse.json({ok:true,status:paymentStatus});
  }catch(error){
    console.error('Mercado Pago webhook error',error);
    return NextResponse.json({error:'Erro interno do webhook.'},{status:500});
  }
}
