import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime='nodejs';

type ModerationBody={
  contentType?:'post'|'comment';
  text?:string;
  category?:string|null;
  mediaKind?:'none'|'image'|'video';
  images?:string[];
  parentId?:string|null;
};

type Category=
 |'none'
 |'sexual_suggestive'
 |'sexual_explicit'
 |'child_safety'
 |'violence_fictional'
 |'violence_graphic'
 |'weapons'
 |'threats'
 |'abuse_hate'
 |'self_harm'
 |'dangerous_illicit'
 |'fraud_spam';

type Decision='allow'|'review'|'block';

type ModelDecision={
 decision:Decision;
 categories:Category[];
 summary:string;
 user_reasons:string[];
 confidence:number;
};

const MODEL='openai/gpt-5.6-luna';

const CATEGORY_LABELS:Record<Category,string>={
 none:'Nenhuma infração identificada',
 sexual_suggestive:'Sensualidade não explícita',
 sexual_explicit:'Conteúdo sexual explícito ou pornográfico',
 child_safety:'Risco de segurança envolvendo menores',
 violence_fictional:'Violência fictícia ou estilizada',
 violence_graphic:'Violência gráfica extrema',
 weapons:'Armas ou objetos semelhantes',
 threats:'Ameaça ou incentivo à violência',
 abuse_hate:'Assédio grave ou discurso de ódio',
 self_harm:'Incentivo ou instrução de autolesão',
 dangerous_illicit:'Conteúdo perigoso ou instruções ilícitas',
 fraud_spam:'Possível fraude, golpe ou spam'
};

const BENIGN_CONTEXT=new Set<Category>(['none','sexual_suggestive','violence_fictional','weapons']);
const HARD_BLOCK=new Set<Category>(['sexual_explicit','child_safety','violence_graphic']);

function normalizeImages(images:unknown){
 if(!Array.isArray(images))return[];
 return images.filter((value):value is string=>typeof value==='string'&&/^data:image\/(jpeg|png|webp);base64,/i.test(value)).slice(0,4);
}

function responseText(data:any){
 if(typeof data?.output_text==='string')return data.output_text;
 if(!Array.isArray(data?.output))return '';
 for(const item of data.output){
  if(!Array.isArray(item?.content))continue;
  for(const part of item.content){
   if(part?.type==='output_text'&&typeof part.text==='string')return part.text;
   if(typeof part?.text==='string')return part.text;
  }
 }
 return '';
}

function fallbackDecision(mediaKind:string):ModelDecision{
 return {
  decision:'review',
  categories:[],
  summary:mediaKind==='none'
   ?'A análise automática ficou temporariamente indisponível e o conteúdo foi encaminhado para revisão.'
   :'A mídia não pôde ser validada automaticamente e foi encaminhada para revisão.',
  user_reasons:['Verificação automática indisponível no momento'],
  confidence:0
 };
}

function postProcess(input:ModelDecision):ModelDecision{
 const categories=(Array.isArray(input.categories)?input.categories:[]).filter(Boolean) as Category[];
 if(categories.some(c=>HARD_BLOCK.has(c)))return {...input,decision:'block',categories};
 if(categories.length>0&&categories.every(c=>BENIGN_CONTEXT.has(c))){
  return {
   ...input,
   decision:'allow',
   categories,
   user_reasons:[],
   summary:input.summary||'Conteúdo compatível com contexto geek/cosplay não explícito.'
  };
 }
 return {...input,categories};
}

export async function POST(request:Request){
 try{
  const supabase=await createClient();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)return NextResponse.json({error:'Sessão inválida.'},{status:401});

  const body=await request.json() as ModerationBody;
  const contentType=body.contentType==='comment'?'comment':'post';
  const text=String(body.text||'').trim().slice(0,8000);
  const category=body.category?String(body.category).slice(0,100):null;
  const mediaKind=body.mediaKind==='image'||body.mediaKind==='video'?body.mediaKind:'none';
  const images=normalizeImages(body.images);
  const parentId=body.parentId?String(body.parentId):null;

  if(!text&&mediaKind==='none')return NextResponse.json({decision:'allow'});

  const fingerprint=createHash('sha256')
   .update(JSON.stringify({contentType,text,category,mediaKind,images}))
   .digest('hex');

  const {data:previous}=await supabase
   .from('moderation_cases')
   .select('id,decision,detected_categories,rule_summary')
   .eq('user_id',user.id)
   .eq('content_type',contentType)
   .eq('fingerprint',fingerprint)
   .order('created_at',{ascending:false})
   .limit(1)
   .maybeSingle();

  if(previous?.decision==='approved'){
   return NextResponse.json({decision:'allow',override:true,fingerprint});
  }
  if(previous&&['blocked','pending_review','rejected'].includes(previous.decision)){
   return NextResponse.json({
    decision:previous.decision==='pending_review'?'review':'block',
    caseId:previous.id,
    categories:previous.detected_categories||[],
    reasons:(previous.detected_categories||[]).map((key:string)=>CATEGORY_LABELS[key as Category]||key),
    summary:previous.rule_summary||'Este conteúdo já possui uma decisão de moderação.',
    fingerprint,
    existing:true
   });
  }

  let decision:ModelDecision;
  const token=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;

  if(!token||(mediaKind!=='none'&&images.length===0)){
   decision=fallbackDecision(mediaKind);
  }else{
   const contextText=[
    'Classifique este conteúdo enviado por um usuário do GeekoPlay, uma rede social de cultura geek, games, anime, cosplay, HQs e eventos.',
    '',
    'REGRAS IMPORTANTES DE CONTEXTO:',
    '- NÃO restrinja apenas por armas fictícias, espadas, armaduras, guerreiros, acessórios de cosplay, airsoft/props, cenas de batalha fictícia ou personagens armados.',
    '- NÃO trate sensualidade não explícita como pornografia: decote, barriga, pernas, roupas curtas, beachwear, cosplay sensual, personagem de anime com partes do corpo à mostra e poses não sexuais podem ser permitidos.',
    '- sexual_suggestive sozinho deve ser ALLOW quando não houver nudez genital, ato sexual explícito, foco pornográfico ou exploração.',
    '- violence_fictional e weapons sozinhos devem ser ALLOW quando forem claramente ficção, cosplay, anime, game, filme, HQ ou encenação e não houver gore extremo ou ameaça real.',
    '- Bloqueie pornografia explícita, genitais/anus visíveis com finalidade sexual, ato sexual explícito e exploração sexual.',
    '- Qualquer sexualização ou exploração envolvendo menor deve ser BLOCK.',
    '- Bloqueie gore extremo realista, mutilação explícita, tortura gráfica ou cadáveres gráficos.',
    '- Ameaças reais, incentivo a ferir pessoas, instruções perigosas/ilícitas graves, ódio grave direcionado, incentivo à autolesão e fraude/golpe evidente devem ser bloqueados ou revisados conforme clareza.',
    '- Discussão jornalística, educativa, crítica ou de denúncia sobre violência, crime, fraude ou ódio não é apoio ao ato. Preserve o contexto.',
    '- Vendas normais e anúncios legítimos do Mercado Geek não são fraude.',
    '- Em caso realmente ambíguo, use REVIEW em vez de BLOCK.',
    '',
    'Texto/categoria informados pelo usuário:',
    `Categoria: ${category||'não informada'}`,
    `Texto: ${text||'[sem texto]'}`
   ].join('\n');

   const content:any[]=[{type:'input_text',text:contextText}];
   for(const image of images)content.push({type:'input_image',image_url:image,detail:'low'});

   const gateway=await fetch('https://ai-gateway.vercel.sh/v1/responses',{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({
     model:MODEL,
     input:[{role:'user',content}],
     max_output_tokens:450,
     reasoning:{effort:'minimal'},
     text:{format:{
      type:'json_schema',
      name:'geekoplay_content_moderation',
      strict:true,
      schema:{
       type:'object',
       properties:{
        decision:{type:'string',enum:['allow','review','block']},
        categories:{type:'array',items:{type:'string',enum:['none','sexual_suggestive','sexual_explicit','child_safety','violence_fictional','violence_graphic','weapons','threats','abuse_hate','self_harm','dangerous_illicit','fraud_spam']}},
        summary:{type:'string'},
        user_reasons:{type:'array',items:{type:'string'}},
        confidence:{type:'number',minimum:0,maximum:1}
       },
       required:['decision','categories','summary','user_reasons','confidence'],
       additionalProperties:false
      }
     }}
    }),
    cache:'no-store'
   });

   if(!gateway.ok){
    console.error('Moderation gateway error',gateway.status,await gateway.text());
    decision=fallbackDecision(mediaKind);
   }else{
    const raw=await gateway.json();
    const parsed=JSON.parse(responseText(raw)||'{}') as ModelDecision;
    decision=postProcess(parsed);
   }
  }

  if(decision.decision==='allow'){
   return NextResponse.json({
    decision:'allow',
    categories:decision.categories,
    fingerprint
   });
  }

  const categories=decision.categories||[];
  const publicReasons=(decision.user_reasons?.length?decision.user_reasons:categories.map(c=>CATEGORY_LABELS[c])).filter(Boolean).slice(0,5);
  const childSafety=categories.includes('child_safety');
  const preview=!childSafety&&images[0]&&images[0].length<=450000?images[0]:null;
  const dbDecision=decision.decision==='review'?'pending_review':'blocked';

  const {data:created,error:insertError}=await supabase
   .from('moderation_cases')
   .insert({
    user_id:user.id,
    content_type:contentType,
    parent_id:parentId,
    content_text:text||null,
    content_category:category,
    media_kind:mediaKind,
    fingerprint,
    decision:dbDecision,
    detected_categories:categories,
    rule_summary:publicReasons.join(' · ')||decision.summary,
    model_summary:String(decision.summary||'').slice(0,1200),
    evidence_preview:preview,
    model_name:token?MODEL:'fallback'
   })
   .select('id')
   .single();

  if(insertError){
   console.error('Moderation case insert error',insertError);
   return NextResponse.json({error:'Não foi possível registrar a análise de segurança.'},{status:500});
  }

  return NextResponse.json({
   decision:decision.decision,
   caseId:created.id,
   categories,
   reasons:publicReasons,
   summary:decision.summary,
   fingerprint
  });
 }catch(error){
  console.error('Moderation check error',error);
  return NextResponse.json({error:'Não foi possível verificar este conteúdo.'},{status:500});
 }
}
