import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CheckoutBody={kind:'premium'|'boost';requestId:string};

export async function POST(request:Request){
  try{
    const token=process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if(!token)return NextResponse.json({error:'Mercado Pago ainda não está configurado.'},{status:503});

    const supabase=await createClient();
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return NextResponse.json({error:'Sessão inválida.'},{status:401});

    const body=await request.json() as Partial<CheckoutBody>;
    const kind=body.kind;
    const requestId=String(body.requestId||'');
    if((kind!=='premium'&&kind!=='boost')||!requestId)return NextResponse.json({error:'Solicitação inválida.'},{status:400});

    let amount=0;
    let title='';
    if(kind==='premium'){
      const {data,rowError}=await (async()=>{const r=await supabase.from('premium_requests').select('id,user_id,amount,status,plan_name,period_label,duration_days').eq('id',requestId).eq('user_id',user.id).maybeSingle();return {data:r.data,rowError:r.error}})();
      if(rowError||!data)return NextResponse.json({error:'Solicitação Premium não encontrada.'},{status:404});
      if(data.status!=='pending')return NextResponse.json({error:'Esta solicitação não está disponível para pagamento.'},{status:409});
      amount=Number(data.amount||0);
      title=`GeekoPlay PRO · ${data.plan_name||data.period_label||`${data.duration_days||30} dias`}`;
    }else{
      const {data,rowError}=await (async()=>{const r=await supabase.from('boost_requests').select('id,user_id,post_id,days,amount,status').eq('id',requestId).eq('user_id',user.id).maybeSingle();return {data:r.data,rowError:r.error}})();
      if(rowError||!data)return NextResponse.json({error:'Solicitação de impulsionamento não encontrada.'},{status:404});
      if(data.status!=='pending')return NextResponse.json({error:'Esta solicitação não está disponível para pagamento.'},{status:409});
      amount=Number(data.amount||0);
      title=`GeekoPlay · Impulsionamento por ${data.days} ${data.days===1?'dia':'dias'}`;
    }

    if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:'Valor de pagamento inválido.'},{status:400});

    const origin='https://geekoplay.com';
    const returnPath=kind==='premium'?'/premium':'/impulsionar';
    const externalReference=`${kind}:${requestId}`;

    const mpResponse=await fetch('https://api.mercadopago.com/checkout/preferences',{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        items:[{id:requestId,title,quantity:1,currency_id:'BRL',unit_price:Number(amount.toFixed(2))}],
        payer:user.email?{email:user.email}:undefined,
        external_reference:externalReference,
        back_urls:{
          success:`${origin}${returnPath}?pagamento=sucesso`,
          pending:`${origin}${returnPath}?pagamento=pendente`,
          failure:`${origin}${returnPath}?pagamento=falhou`
        },
        auto_return:'approved',
        metadata:{kind,request_id:requestId,user_id:user.id},
        notification_url:`${origin}/api/payments/webhook`
      }),
      cache:'no-store'
    });
    const mp=await mpResponse.json();
    if(!mpResponse.ok){
      console.error('Mercado Pago preference error',mp);
      return NextResponse.json({error:'Não foi possível iniciar o checkout do Mercado Pago.'},{status:502});
    }

    const testCredential=/^TEST[-_]/i.test(token);
    const checkoutUrl=testCredential?(mp.sandbox_init_point||mp.init_point):(mp.init_point||mp.sandbox_init_point);
    if(!checkoutUrl)return NextResponse.json({error:'O Mercado Pago não retornou a URL de pagamento.'},{status:502});

    const table=kind==='premium'?'premium_requests':'boost_requests';
    await supabase.from(table).update({payment_reference:String(mp.id||externalReference)}).eq('id',requestId).eq('user_id',user.id);

    return NextResponse.json({checkoutUrl,preferenceId:mp.id,externalReference});
  }catch(error){
    console.error('Checkout error',error);
    return NextResponse.json({error:'Não foi possível iniciar o pagamento.'},{status:500});
  }
}
