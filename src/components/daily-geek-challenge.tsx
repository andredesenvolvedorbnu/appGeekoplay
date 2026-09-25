'use client';

import { useEffect,useMemo,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain,CheckCircle2,Gamepad2,Loader2,Sparkles,Users,X,XCircle,Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type QuizState={eligible:boolean;available:boolean;activeRunId?:string;activeCategory?:string;nextAt?:string|null};
type QuizQuestion={id:string;position:number;question:string;options:string[]};
type QuizAnswer={questionId:string;selectedOption:number;isCorrect:boolean;xpAwarded:number};
type QuizRun={runId:string;category:string;questions:QuizQuestion[];answers:QuizAnswer[]};
type AnswerResult={isCorrect:boolean;correctOption:number;correctAnswer:string;explanation?:string|null;xpAwarded:number;quizXp:number;profileXp:number;completed:boolean;answeredCount:number};
type Phase='idle'|'invite'|'category'|'question'|'feedback'|'result';

const CATEGORIES=[
 ['Games','🎮'],['Anime','🍥'],['Filmes','🎬'],['Séries','📺'],['HQs & Comics','💥'],['RPG','🎲'],['K-Pop','🎤'],['Tecnologia','💻'],['Colecionáveis','🃏']
] as const;

export function DailyGeekChallenge(){
 const supabase=useMemo(()=>createClient(),[]);
 const router=useRouter();
 const [userId,setUserId]=useState<string|null>(null);
 const [quizState,setQuizState]=useState<QuizState|null>(null);
 const [showDiscovery,setShowDiscovery]=useState(false);
 const [quizReady,setQuizReady]=useState(false);
 const [phase,setPhase]=useState<Phase>('idle');
 const [run,setRun]=useState<QuizRun|null>(null);
 const [questionIndex,setQuestionIndex]=useState(0);
 const [selected,setSelected]=useState<number|null>(null);
 const [feedback,setFeedback]=useState<AnswerResult|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const timerRef=useRef<number|null>(null);

 async function refreshState(){
  const {data,error}=await supabase.rpc('get_geek_quiz_state');
  if(error)return null;
  const next=(data||null) as QuizState|null;
  setQuizState(next);
  return next;
 }

 useEffect(()=>{
  let alive=true;
  void (async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!alive||!user)return;
   setUserId(user.id);
   const state=await refreshState();
   if(!state?.eligible)return;

   const discoveryKey=`geekoplay:discovery:${user.id}:session`;
   if(!sessionStorage.getItem(discoveryKey)){
    window.setTimeout(()=>{if(alive)setShowDiscovery(true)},500);
   }

   if(state.available){
    const quizKey=`geekoplay:quiz-invite:${user.id}:session`;
    if(!sessionStorage.getItem(quizKey)){
     timerRef.current=window.setTimeout(()=>{
      sessionStorage.setItem(quizKey,'1');
      if(alive)setQuizReady(true);
     },60000);
    }
   }
  })();
  return()=>{alive=false;if(timerRef.current)window.clearTimeout(timerRef.current)};
 },[supabase]);

 useEffect(()=>{
  if(quizReady&&!showDiscovery&&phase==='idle')setPhase('invite');
 },[quizReady,showDiscovery,phase]);

 function closeDiscovery(){
  if(userId)sessionStorage.setItem(`geekoplay:discovery:${userId}:session`,'1');
  setShowDiscovery(false);
 }
 function discoverGeeks(){
  closeDiscovery();
  router.push('/explorar');
 }

 function closeQuiz(){setPhase('idle');setRun(null);setSelected(null);setFeedback(null);setMessage('')}

 async function startQuiz(category:string){
  setBusy(true);setMessage('');
  const {data,error}=await supabase.rpc('start_geek_quiz',{chosen_category:category});
  if(error){
   const msg=String(error.message||'');
   if(msg.includes('cooldown'))setMessage('Seu desafio de hoje já foi concluído. Um novo quiz libera 24 horas depois.');
   else if(msg.includes('not_eligible'))setMessage('Este desafio está disponível para os 1.000 primeiros geeks cadastrados.');
   else setMessage('Não foi possível iniciar o desafio agora. Tente novamente.');
   setBusy(false);return;
  }
  const next=data as QuizRun;
  setRun(next);
  const answered=new Set((next.answers||[]).map(a=>a.questionId));
  const first=Math.max(0,(next.questions||[]).findIndex(q=>!answered.has(q.id)));
  const earned=(next.answers||[]).reduce((sum,a)=>sum+(a.xpAwarded||0),0);
  if((next.answers||[]).length>=3){
   setFeedback({isCorrect:false,correctOption:0,correctAnswer:'',xpAwarded:0,quizXp:earned,profileXp:0,completed:true,answeredCount:3});
   setPhase('result');
  }else{
   setQuestionIndex(first<0?0:first);setPhase('question');
  }
  setBusy(false);
 }

 async function acceptInvite(){
  if(quizState?.activeRunId&&quizState.activeCategory){await startQuiz(quizState.activeCategory);return}
  setPhase('category');
 }

 async function answer(){
  const q=run?.questions?.[questionIndex];
  if(!run||!q||selected===null||busy)return;
  setBusy(true);setMessage('');
  const {data,error}=await supabase.rpc('answer_geek_quiz',{target_run:run.runId,target_question:q.id,answer_option:selected});
  if(error){
   const msg=String(error.message||'');
   if(msg.includes('already_answered'))setMessage('Essa pergunta já foi respondida.');
   else setMessage('Não foi possível validar sua resposta. Nenhum XP foi prometido ou perdido; tente novamente.');
   setBusy(false);return;
  }
  setFeedback(data as AnswerResult);setPhase('feedback');setBusy(false);
 }

 async function nextQuestion(){
  if(!feedback)return;
  if(feedback.completed){
   setPhase('result');
   await refreshState();
   return;
  }
  setQuestionIndex(i=>Math.min(i+1,2));setSelected(null);setFeedback(null);setPhase('question');
 }

 const q=run?.questions?.[questionIndex];
 const totalBefore=(run?.answers||[]).reduce((sum,a)=>sum+(a.xpAwarded||0),0);
 const earned=feedback?.quizXp??totalBefore;

 return <>
  {showDiscovery&&<Overlay onClose={closeDiscovery}>
   <div className="p-5 sm:p-6">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/15 text-orange-300"><Users size={27}/></div>
    <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[.18em] text-orange-300">Descobrir geeks</p>
    <h2 className="mt-1 text-center text-2xl font-black">Quer conhecer alguns geeks?</h2>
    <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-slate-400">Encontre pessoas, fandoms e interesses que combinam com você dentro do GeekoPlay.</p>
    <div className="mt-6 grid gap-2 sm:grid-cols-2"><button onClick={closeDiscovery} className="order-2 min-h-12 rounded-xl border border-geek-line bg-geek-soft px-4 font-bold text-slate-300 sm:order-1">Agora não</button><button onClick={discoverGeeks} className="order-1 min-h-12 rounded-xl bg-geek-orange px-4 font-black text-white sm:order-2">Quero conhecer</button></div>
   </div>
  </Overlay>}

  {phase!=='idle'&&<Overlay onClose={closeQuiz}>
   {phase==='invite'&&<div className="p-5 sm:p-6">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-purple-500/15 text-purple-300"><Brain size={27}/></div>
    <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[.18em] text-purple-300">Desafio Geek Diário</p>
    <h2 className="mt-1 text-center text-2xl font-black">Quer testar seus conhecimentos geeks?</h2>
    <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-slate-400">São 3 perguntas. Cada acerto vale <b className="text-orange-300">+2 XP</b> de verdade no seu perfil.</p>
    <div className="mt-5 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3 text-center text-xs text-orange-100">🎯 Até <b>6 XP por dia</b> · novo desafio 24h após concluir</div>
    <div className="mt-6 grid gap-2 sm:grid-cols-2"><button onClick={closeQuiz} className="order-2 min-h-12 rounded-xl border border-geek-line bg-geek-soft px-4 font-bold text-slate-300 sm:order-1">Agora não</button><button onClick={()=>void acceptInvite()} disabled={busy} className="order-1 min-h-12 rounded-xl bg-geek-orange px-4 font-black text-white disabled:opacity-50 sm:order-2">{busy?'Carregando...':'Bora jogar'}</button></div>
   </div>}

   {phase==='category'&&<div className="p-5 sm:p-6">
    <p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">Escolha seu universo</p>
    <h2 className="mt-1 text-2xl font-black">Qual tema você encara hoje?</h2>
    <p className="mt-2 text-sm text-slate-400">O GeekoPlay vai montar 3 perguntas para você.</p>
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{CATEGORIES.map(([name,emoji])=><button key={name} disabled={busy} onClick={()=>void startQuiz(name)} className="min-h-20 rounded-2xl border border-geek-line bg-geek-soft p-3 text-left transition hover:border-orange-500/50 hover:bg-orange-500/5 disabled:opacity-50"><span className="text-2xl">{emoji}</span><span className="mt-2 block text-xs font-black">{name}</span></button>)}</div>
    {message&&<Notice>{message}</Notice>}
   </div>}

   {phase==='question'&&q&&<div className="p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">{run?.category}</p><p className="mt-1 text-xs text-slate-500">Pergunta {questionIndex+1} de 3</p></div><div className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-black text-orange-300">+2 XP</div></div>
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-geek-soft"><div className="h-full rounded-full bg-geek-orange transition-all" style={{width:`${((questionIndex+1)/3)*100}%`}}/></div>
    <h2 className="mt-6 text-xl font-black leading-8 sm:text-2xl">{q.question}</h2>
    <div className="mt-5 grid gap-2">{q.options.map((option,index)=><button key={index} onClick={()=>setSelected(index)} className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${selected===index?'border-orange-400 bg-orange-500/12 text-orange-100':'border-geek-line bg-geek-soft text-slate-300 hover:border-slate-500'}`}><span className="mr-2 text-slate-500">{String.fromCharCode(65+index)}.</span>{option}</button>)}</div>
    <button onClick={()=>void answer()} disabled={selected===null||busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-geek-orange px-4 font-black text-white disabled:opacity-40">{busy?<Loader2 size={17} className="animate-spin"/>:<Zap size={17}/>}Responder</button>
    {message&&<Notice>{message}</Notice>}
   </div>}

   {phase==='feedback'&&feedback&&<div className="p-5 text-center sm:p-6">
    <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${feedback.isCorrect?'bg-emerald-500/15 text-emerald-300':'bg-red-500/12 text-red-300'}`}>{feedback.isCorrect?<CheckCircle2 size={34}/>:<XCircle size={34}/>}</div>
    <p className={`mt-4 text-xs font-black uppercase tracking-[.16em] ${feedback.isCorrect?'text-emerald-300':'text-red-300'}`}>{feedback.isCorrect?'GG! Resposta certa':'Quase!'}</p>
    <h2 className="mt-2 text-2xl font-black">{feedback.isCorrect?'+2 XP no seu perfil':`A resposta correta era: ${feedback.correctAnswer}`}</h2>
    {feedback.explanation&&<p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">{feedback.explanation}</p>}
    <div className="mt-5 rounded-2xl border border-geek-line bg-geek-soft p-4"><p className="text-xs text-slate-500">XP conquistado neste desafio</p><p className="mt-1 text-3xl font-black text-orange-300">+{feedback.quizXp} XP</p>{feedback.profileXp>0&&<p className="mt-1 text-xs text-slate-500">Seu perfil agora tem {feedback.profileXp} XP</p>}</div>
    <button onClick={()=>void nextQuestion()} className="mt-5 min-h-12 w-full rounded-xl bg-geek-orange px-4 font-black text-white">{feedback.completed?'Ver resultado':'Continuar'}</button>
   </div>}

   {phase==='result'&&<div className="p-5 text-center sm:p-6">
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-500/15 text-orange-300"><Sparkles size={32}/></div>
    <p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-orange-300">Desafio concluído</p>
    <h2 className="mt-2 text-3xl font-black">GG! +{earned} XP hoje 🎮</h2>
    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">O XP já foi registrado no seu perfil. Volte 24 horas depois para encarar 3 perguntas novas.</p>
    <div className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 text-sm text-purple-100"><Gamepad2 className="mx-auto mb-2 text-purple-300"/>Continue interagindo no GeekoPlay enquanto o próximo desafio não libera.</div>
    <button onClick={closeQuiz} className="mt-5 min-h-12 w-full rounded-xl bg-geek-orange px-4 font-black text-white">Fechar</button>
   </div>}
  </Overlay>}
 </>;
}

function Overlay({children,onClose}:{children:React.ReactNode;onClose:()=>void}){
 return <div className="fixed inset-0 z-[175] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
  <section className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-geek-line bg-geek-panel shadow-2xl">
   <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-slate-400 backdrop-blur hover:text-white" aria-label="Fechar"><X size={18}/></button>
   <div className="max-h-[92dvh] overflow-y-auto">{children}</div>
  </section>
 </div>
}

function Notice({children}:{children:React.ReactNode}){return <p className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-orange-200">{children}</p>}
