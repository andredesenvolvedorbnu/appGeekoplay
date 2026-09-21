import { createClient } from '@/lib/supabase/server';

type Summary=Record<string,any>;

function clean(value:any){
  return String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim();
}
function pdfEscape(value:string){
  return clean(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
}
function wrap(text:string,max=88){
  const words=clean(text).split(' ');
  const lines:string[]=[];
  let line='';
  for(const word of words){
    const next=line?line+' '+word:word;
    if(next.length>max&&line){lines.push(line);line=word}else line=next;
  }
  if(line)lines.push(line);
  return lines.length?lines:[''];
}
function safeFileName(value:string){
  return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'evento';
}
function distributionLines(title:string,data:any,total:number,multi=false){
  const rows=Object.entries((data&&typeof data==='object'?data:{}) as Record<string,number>).sort((a,b)=>Number(b[1])-Number(a[1]));
  const denominator=multi?Math.max(1,rows.reduce((sum,[,count])=>sum+Number(count),0)):Math.max(1,total);
  const lines=[title];
  if(!rows.length)return [...lines,'  Sem dados'];
  for(const [label,count] of rows){
    const pct=(Number(count)/denominator)*100;
    lines.push(`  ${label}: ${Number(count).toLocaleString('pt-BR')} (${pct.toFixed(1)}%)`);
  }
  return lines;
}
function buildPdf(title:string,subtitle:string,sections:{heading?:string;lines:string[]}[]){
  const pageWidth=595;
  const pageHeight=842;
  const margin=48;
  const bottom=54;
  const pages:string[][]=[];
  let current:string[]=[];
  let y=pageHeight-margin;

  function newPage(){
    if(current.length)pages.push(current);
    current=[];
    y=pageHeight-margin;
    current.push(`BT /F1 18 Tf ${margin} ${y} Td (${pdfEscape(title)}) Tj ET`);
    y-=24;
    current.push(`BT /F1 9 Tf ${margin} ${y} Td (${pdfEscape(subtitle)}) Tj ET`);
    y-=24;
  }
  function ensure(height:number){if(y-height<bottom)newPage()}
  function line(text:string,size=10,bold=false,indent=0){
    ensure(size+7);
    const font=bold?'/F2':'/F1';
    current.push(`BT ${font} ${size} Tf ${margin+indent} ${y} Td (${pdfEscape(text)}) Tj ET`);
    y-=size+6;
  }

  newPage();
  for(const section of sections){
    ensure(34);
    if(section.heading){line(section.heading,12,true);y-=3}
    for(const raw of section.lines){
      const isIndented=/^\s{2}/.test(raw);
      for(const piece of wrap(raw.trim(),isIndented?82:88))line(piece,9,false,isIndented?12:0);
    }
    y-=8;
  }
  if(current.length)pages.push(current);

  const objects:Buffer[]=[];
  const add=(s:string)=>{objects.push(Buffer.from(s,'latin1'));return objects.length};
  const catalog=add('');
  const pagesObj=add('');
  const font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds:number[]=[];

  pages.forEach((ops,index)=>{
    const footer=`BT /F1 8 Tf ${pageWidth/2-20} 26 Td (Pagina ${index+1} de ${pages.length}) Tj ET`;
    const stream=Buffer.from(ops.concat(footer).join('\n'),'latin1');
    const contentId=add(`<< /Length ${stream.length} >>\nstream\n${stream.toString('latin1')}\nendstream`);
    const pageId=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[catalog-1]=Buffer.from(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`,'latin1');
  objects[pagesObj-1]=Buffer.from(`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,'latin1');

  const header=Buffer.from('%PDF-1.4\n%âãÏÓ\n','latin1');
  const chunks:Buffer[]=[header];
  const offsets:number[]=[0];
  let offset=header.length;
  objects.forEach((obj,i)=>{
    offsets[i+1]=offset;
    const chunk=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`,'latin1'),obj,Buffer.from('\nendobj\n','latin1')]);
    chunks.push(chunk);offset+=chunk.length;
  });
  const xrefOffset=offset;
  let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=objects.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  xref+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(xref,'latin1'));
  return Buffer.concat(chunks);
}

export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}){
  const {eventId}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return new Response('Não autorizado',{status:401});
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(profile?.role!=='admin')return new Response('Acesso negado',{status:403});

  const [{data:event},{data:summaryData}]=await Promise.all([
    supabase.from('events').select('id,title,starts_at,ends_at,city,state').eq('id',eventId).maybeSingle(),
    supabase.rpc('admin_event_feedback_summary',{target_event:eventId})
  ]);
  if(!event)return new Response('Evento não encontrado',{status:404});
  const summary=(summaryData||{}) as Summary;
  const total=Number(summary.response_count||0);

  const suggestions:string[]=[];
  let from=0;
  const batch=1000;
  while(true){
    const {data}=await supabase.from('event_feedback').select('improvement').eq('event_id',eventId).not('improvement','is',null).order('created_at',{ascending:true}).range(from,from+batch-1);
    const rows=data||[];
    rows.forEach((row:any)=>{const value=clean(row.improvement);if(value)suggestions.push(value)});
    if(rows.length<batch)break;
    from+=batch;
    if(from>50000)break;
  }

  const pct=(value:any)=>total?`${Number(value||0)} (${((Number(value||0)/total)*100).toFixed(1)}%)`:'0 (0.0%)';
  const sections:{heading?:string;lines:string[]}[]=[
    {heading:'Resumo executivo',lines:[
      `Respostas: ${total.toLocaleString('pt-BR')}`,
      `Nota media: ${summary.avg_score==null?'Nao informado':Number(summary.avg_score).toFixed(1)} / 10`,
      `Voltariam ao evento: ${pct(summary.would_return_yes)}`,
      `Primeira vez no evento: ${pct(summary.first_time_yes)}`,
      `Vieram de outra cidade: ${pct(summary.tourists)}`,
      `Media de noites: ${summary.avg_nights==null?'Nao informado':Number(summary.avg_nights).toFixed(1)}`
    ]},
    {heading:'Perfil do publico',lines:[
      ...distributionLines('Faixa etaria',summary.age_range,total),
      ...distributionLines('Cidade',summary.city,total),
      ...distributionLines('Ocupacao',summary.occupation,total),
      ...distributionLines('Faixa de renda',summary.income_range,total)
    ]},
    {heading:'Interesses e consumo geek',lines:[
      ...distributionLines('Universos / interesses',summary.interests,total,true),
      ...distributionLines('Interesse principal',summary.main_interest,total),
      ...distributionLines('Gasto geek mensal',summary.monthly_geek_spend,total)
    ]},
    {heading:'Relacao com o evento',lines:[
      ...distributionLines('Como descobriu',summary.discovery_channel,total),
      ...distributionLines('Motivo para participar',summary.reason,total),
      ...distributionLines('Veio com',summary.came_with,total)
    ]},
    {heading:'Comportamento no evento',lines:[
      ...distributionLines('Tempo no evento',summary.time_at_event,total),
      ...distributionLines('Areas visitadas',summary.areas_visited,total,true),
      ...distributionLines('Area de maior permanencia',summary.longest_area,total)
    ]},
    {heading:'Consumo no evento',lines:[
      ...distributionLines('Gasto no evento',summary.event_spend,total),
      ...distributionLines('Onde gastou',summary.spend_categories,total,true)
    ]},
    {heading:'Satisfacao',lines:[
      ...distributionLines('Notas',summary.score,total)
    ]}
  ];
  if(suggestions.length)sections.push({heading:`Sugestoes abertas (${suggestions.length})`,lines:suggestions.map((s,i)=>`${i+1}. ${s}`)});

  const when=event.starts_at?new Date(event.starts_at).toLocaleString('pt-BR'):'Data não informada';
  const location=[event.city,event.state].filter(Boolean).join('/');
  const subtitle=`${when}${location?` · ${location}`:''} · Gerado em ${new Date().toLocaleString('pt-BR')}`;
  const pdf=buildPdf(`GeekoPlay · Relatorio de evento · ${event.title}`,subtitle,sections);
  const filename=`geekoplay-relatorio-${safeFileName(event.title)}.pdf`;
  return new Response(new Uint8Array(pdf),{
    headers:{
      'Content-Type':'application/pdf',
      'Content-Disposition':`attachment; filename="${filename}"`,
      'Cache-Control':'no-store'
    }
  });
}
