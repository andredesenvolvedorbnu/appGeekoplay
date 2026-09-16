'use client';

import Link from 'next/link';
import { FormEvent,useEffect,useMemo,useState } from 'react';
import { CalendarClock,Gamepad2,Loader2,Lock,Plus,Power,Trash2,UserRound,Users,X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Party={id:string;author_id:string;game:string;platform:string;starts_at:string;seats_needed:number;details:string|null;status:'open'|'closed';created_at:string};
type Member={party_id:string;user_id:string};
type Profile={id:string;display_name:string;username:string|null;avatar_url:string|null;level:number};
const platforms=['PC','PlayStation','Xbox','Nintendo','Mobile','Mesa/RPG','Outro'];

export function PartyFinderClient(){
 const supabase=useMemo(()=>createClient(),[]);
 const [parties,setParties]=useState<Party[]>([]);const [members,setMembers]=useState<Member[]>([]);const [profiles,setProfiles]=useState<Record<string,Profile>>({});
 const [userId,setUserId]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [creating,setCreating]=useState(false);const [busy,setBusy]=useState<string|null>(null);const [message,setMessage]=useState('');
 const [game,setGame]=useState('');const [platform,setPlatform]=useState('PC');const [startsAt,setStartsAt]=useState('');const [seats,setSeats]=useState('2');const [details,setDetails]=useState('');

 async function load(){
  setLoading(true);
  const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
  const [{data:partyRows},{data:memberRows}]=await Promise.all([
   supabase.from('party_finder_posts').select('id,author_id,game,platform,starts_at,seats_needed,details,status,created_at').order('starts_at',{ascending:true}),
   supabase.from('party_finder_members').select('party_id,user_id')
  ]);
  const safeParties=(partyRows||[]) as Party[];const safeMembers=(memberRows||[]) as Member[];setParties(safeParties);setMembers(safeMembers);
  const ids=[...new Set([...safeParties.map(row=>row.author_id),...safeMembers.map(row=>row.user_id)])];
  if(ids.length){const {data}=await supabase.from('profiles').select('id,display_name,username,avatar_url,level').in('id',ids);setProfiles(Object.fromEntries(((data||[]) as Profile[]).map(profile=>[profile.id,profile])))}else setProfiles({});
  setLoading(false);
 }

 useEffect(()=>{void load();const channel=supabase.channel('party-finder-live').on('postgres_changes',{event:'*',schema:'public',table:'party_finder_posts'},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'party_finder_members'},()=>void load()).subscribe();return()=>{void supabase.removeChannel(channel)}},[supabase]);

 async function createParty(event:FormEvent){
  event.preventDefault();setMessage('');
  const date=new Date(startsAt);const needed=Number(seats);
  if(game.trim().length<2||Number.isNaN(date.getTime())||date.getTime()<=Date.now()||needed<1||needed>99){setMessage('Preencha jogo, data futura e quantidade de vagas entre 1 e 99.');return}
  if(!userId){setMessage('Sua sessão expirou. Entre novamente.');return}
  setBusy('create');
  const {error}=await supabase.from('party_finder_posts').insert({author_id:userId,game:game.trim(),platform,starts_at:date.toISOString(),seats_needed:needed,details:details.trim()||null});
  if(error)setMessage('Não foi possível publicar a busca agora.');else{setGame('');setStartsAt('');setSeats('2');setDetails('');setCreating(false);setMessage('Party publicada! A comunidade já pode entrar.');await load()}
  setBusy(null);
 }

 async function toggleMembership(party:Party){
  if(!userId)return;setBusy(party.id);setMessage('');
  const joined=members.some(row=>row.party_id===party.id&&row.user_id===userId);
  const result=joined?await supabase.from('party_finder_members').delete().eq('party_id',party.id).eq('user_id',userId):await supabase.from('party_finder_members').insert({party_id:party.id,user_id:userId});
  if(result.error)setMessage(joined?'Não foi possível sair do grupo.':'As vagas podem ter acabado ou a sessão já foi encerrada.');
  await load();setBusy(null);
 }

 async function toggleStatus(party:Party){setBusy(party.id);const next=party.status==='open'?'closed':'open';const {error}=await supabase.from('party_finder_posts').update({status:next,updated_at:new Date().toISOString()}).eq('id',party.id);if(error)setMessage('Não foi possível alterar a situação desta Party.');await load();setBusy(null)}
 async function remove(party:Party){if(!confirm(`Excluir a Party de ${party.game}?`))return;setBusy(party.id);const {error}=await supabase.from('party_finder_posts').delete().eq('id',party.id);if(error)setMessage('Não foi possível excluir a Party.');await load();setBusy(null)}

 const now=Date.now();
 return <div className="mx-auto max-w-6xl space-y-5 px-3 pb-10 sm:px-4">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-geek-orange">Encontre seu squad</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Party Finder</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Publique quando e onde vai jogar, informe as vagas e reúna sua Party.</p></div><button onClick={()=>setCreating(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 py-3 text-sm font-black"><Plus size={18}/>Criar Party</button></div>
  {message&&<p className="rounded-xl border border-geek-line bg-geek-panel px-4 py-3 text-sm text-slate-300">{message}</p>}
  {loading?<div className="grid place-items-center py-24"><Loader2 className="animate-spin text-geek-orange"/></div>:parties.length===0?<div className="rounded-3xl border border-dashed border-geek-line bg-geek-panel p-12 text-center text-slate-400"><Gamepad2 className="mx-auto mb-3 text-geek-orange" size={38}/><b className="block text-white">Nenhuma Party publicada</b><p className="mt-1 text-sm">Seja a primeira pessoa a chamar a comunidade para jogar.</p></div>:<div className="grid gap-4 lg:grid-cols-2">{parties.map(party=>{
   const partyMembers=members.filter(row=>row.party_id===party.id);const owner=profiles[party.author_id];const joined=partyMembers.some(row=>row.user_id===userId);const ownerView=party.author_id===userId;const expired=new Date(party.starts_at).getTime()<now;const full=partyMembers.length>=party.seats_needed;const closed=party.status==='closed'||expired||full;
   return <article key={party.id} className={`rounded-3xl border bg-geek-panel p-4 sm:p-5 ${closed?'border-geek-line opacity-80':'border-orange-500/25'}`}>
    <div className="flex min-w-0 items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-500/10 text-orange-300"><Gamepad2 size={24}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-geek-soft px-2 py-1 text-[10px] font-bold text-slate-300">{party.platform}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${closed?'bg-slate-500/10 text-slate-400':'bg-emerald-500/10 text-emerald-300'}`}>{expired?'Encerrada':closed?'Fechada':'Aberta'}</span></div><h2 className="mt-2 break-words text-xl font-black">{party.game}</h2></div>{ownerView&&<div className="flex gap-1"><button onClick={()=>void toggleStatus(party)} disabled={busy===party.id||expired} className="rounded-xl p-2 text-slate-300 hover:bg-geek-soft disabled:opacity-40" aria-label={party.status==='open'?'Fechar Party':'Reabrir Party'}>{party.status==='open'?<Lock size={17}/>:<Power size={17}/>}</button><button onClick={()=>void remove(party)} disabled={busy===party.id} className="rounded-xl p-2 text-red-300 hover:bg-red-500/10" aria-label="Excluir Party"><Trash2 size={17}/></button></div>}</div>
    <div className="mt-4 grid gap-2 text-sm text-slate-400"><p className="flex items-center gap-2"><CalendarClock size={16}/>{new Date(party.starts_at).toLocaleString('pt-BR',{dateStyle:'medium',timeStyle:'short'})}</p><p className="flex items-center gap-2"><Users size={16}/>{partyMembers.length} de {party.seats_needed} vaga{party.seats_needed===1?'':'s'} preenchida{partyMembers.length===1?'':'s'}</p></div>
    {party.details&&<p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{party.details}</p>}
    <div className="mt-4 flex flex-wrap items-center gap-2"><Link href={`/perfil/${party.author_id}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-xs"><span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-purple-600">{owner?.avatar_url?<img src={owner.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={13}/>}</span><span className="max-w-32 truncate">{owner?.display_name||'Geek'}</span></Link>{partyMembers.slice(0,5).map(member=>{const profile=profiles[member.user_id];return <Link key={member.user_id} href={`/perfil/${member.user_id}`} title={profile?.display_name||'Participante'} className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border-2 border-geek-panel bg-geek-soft">{profile?.avatar_url?<img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/>:<UserRound size={14}/>}</Link>})}{partyMembers.length>5&&<span className="text-xs text-slate-500">+{partyMembers.length-5}</span>}</div>
    {!ownerView&&!expired&&<button onClick={()=>void toggleMembership(party)} disabled={busy===party.id||(!joined&&closed)} className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-black disabled:opacity-50 ${joined?'border border-red-500/30 bg-red-500/10 text-red-300':'bg-geek-orange text-white'}`}>{busy===party.id?'Aguarde...':joined?'Sair da Party':full?'Party completa':closed?'Party fechada':'Entrar na Party'}</button>}
   </article>})}</div>}
  {creating&&<div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/75 p-3" role="dialog" aria-modal="true" aria-label="Criar Party"><form onSubmit={createParty} className="w-full max-w-xl rounded-3xl border border-geek-line bg-geek-panel p-4 shadow-2xl sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-geek-orange">Novo convite</p><h2 className="text-xl font-black">Criar Party</h2></div><button type="button" onClick={()=>setCreating(false)} className="rounded-xl p-2 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button></div><div className="mt-5 grid gap-4"><label className="grid gap-1 text-sm"><b>Jogo ou atividade</b><input value={game} onChange={e=>setGame(e.target.value)} maxLength={100} placeholder="Ex.: Helldivers 2" className="rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none focus:border-geek-orange"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm"><b>Plataforma</b><select value={platform} onChange={e=>setPlatform(e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none">{platforms.map(item=><option key={item}>{item}</option>)}</select></label><label className="grid gap-1 text-sm"><b>Vagas</b><input type="number" min="1" max="99" value={seats} onChange={e=>setSeats(e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none"/></label></div><label className="grid gap-1 text-sm"><b>Data e horário</b><input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none"/></label><label className="grid gap-1 text-sm"><b>Detalhes <span className="font-normal text-slate-500">(opcional)</span></b><textarea value={details} onChange={e=>setDetails(e.target.value)} maxLength={1000} placeholder="Modo de jogo, nível, comunicação, regras..." className="min-h-28 resize-y rounded-xl border border-geek-line bg-geek-soft p-3 outline-none"/></label></div><button disabled={busy==='create'} className="mt-5 w-full rounded-xl bg-geek-orange px-4 py-3 font-black disabled:opacity-60">{busy==='create'?'Publicando...':'Publicar Party'}</button></form></div>}
 </div>;
}
