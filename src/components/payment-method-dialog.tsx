'use client';

import { useEffect,useMemo,useState } from 'react';
import { Banknote, CheckCircle2, Copy, CreditCard, Loader2, QrCode, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Props={
  open:boolean;
  kind:'premium'|'boost';
  requestId:string|null;
  amount:number;
  title:string;
  onClose:()=>void;
  onApproved?:()=>void;
};

type PixData={
  qrCode:string|null;
  qrCodeBase64:string|null;
  ticketUrl:string|null;
  paymentId:string|number|null;
};

export function PaymentMethodDialog({open,kind,requestId,amount,title,onClose,onApproved}:Props){
  const supabase=useMemo(()=>createClient(),[]);
  const [working,setWorking]=useState<'pix'|'card'|'boleto'|null>(null);
  const [error,setError]=useState('');
  const [pix,setPix]=useState<PixData|null>(null);
  const [copied,setCopied]=useState(false);
  const [approved,setApproved]=useState(false);
  const [cpf,setCpf]=useState('');

  useEffect(()=>{
    if(!open){setWorking(null);setError('');setPix(null);setCopied(false);setApproved(false);setCpf('')}
  },[open]);

  useEffect(()=>{
    if(!open||!requestId||!pix||approved)return;
    let active=true;
    const table=kind==='premium'?'premium_requests':'boost_requests';
    const timer=setInterval(async()=>{
      const {data}=await supabase.from(table).select('status,payment_status').eq('id',requestId).maybeSingle();
      if(!active||!data)return;
      if(data.status==='approved'||data.payment_status==='approved'){
        setApproved(true);
        clearInterval(timer);
        onApproved?.();
      }
    },3000);
    return()=>{active=false;clearInterval(timer)};
  },[open,requestId,pix,approved,kind,supabase,onApproved]);

  if(!open||!requestId)return null;

  async function pay(method:'pix'|'card'|'boleto'){
    const document=cpf.replace(/\D/g,'');
    if(method==='pix'&&document.length!==11){setError('Informe um CPF válido para gerar o Pix.');return}
    setWorking(method);setError('');
    try{
      const response=await fetch('/api/payments/checkout',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({kind,requestId,method,payerDocument:method==='pix'?document:undefined})
      });
      const data=await response.json();
      if(!response.ok){setError(data.error||'Não foi possível iniciar o pagamento.');return}
      if(data.mode==='pix'){
        setPix({
          qrCode:data.qrCode||null,
          qrCodeBase64:data.qrCodeBase64||null,
          ticketUrl:data.ticketUrl||null,
          paymentId:data.paymentId||null
        });
        return;
      }
      if(data.checkoutUrl){
        window.location.href=data.checkoutUrl;
        return;
      }
      setError('O Mercado Pago não retornou uma forma de pagamento.');
    }catch{
      setError('Não foi possível conectar ao Mercado Pago. Tente novamente.');
    }finally{
      setWorking(null);
    }
  }

  async function copyPix(){
    if(!pix?.qrCode)return;
    try{
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      setTimeout(()=>setCopied(false),1800);
    }catch{
      setError('Não foi possível copiar o código Pix.');
    }
  }

  return <div className="fixed inset-0 z-[160] grid place-items-center overflow-y-auto bg-black/80 p-3" role="dialog" aria-modal="true" aria-label="Escolher forma de pagamento">
    <section className="w-full max-w-xl rounded-3xl border border-geek-line bg-geek-panel p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-geek-orange">Pagamento seguro</p>
          <h2 className="mt-1 text-xl font-black">Como você prefere pagar?</h2>
          <p className="mt-1 text-sm text-slate-400">{title} · {Number(amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-geek-soft" aria-label="Fechar"><X size={19}/></button>
      </div>

      {!pix&&!approved&&<div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4"><QrCode className="text-emerald-300" size={24}/><p className="mt-3 font-black text-white">Pix</p><p className="mt-1 text-xs leading-5 text-slate-400">QR Code e Pix Copia e Cola aqui no GeekoPlay.</p><input value={cpf} onChange={e=>setCpf(e.target.value)} inputMode="numeric" maxLength={14} placeholder="CPF do pagador" className="mt-3 w-full rounded-xl border border-geek-line bg-geek-panel px-3 py-2 text-xs text-white outline-none"/><button onClick={()=>void pay('pix')} disabled={!!working} className="mt-3 w-full rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-200 disabled:opacity-60">{working==='pix'?'Gerando Pix...':'Gerar Pix'}</button></div><button onClick={()=>void pay('card')} disabled={!!working} className="rounded-2xl border border-blue-500/30 bg-blue-500/8 p-4 text-left transition hover:border-blue-400/60 disabled:opacity-60">
          <CreditCard className="text-blue-300" size={24}/>
          <p className="mt-3 font-black text-white">Cartão</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Continue no Mercado Pago para pagar com cartão.</p>
          {working==='card'&&<Loader2 className="mt-3 animate-spin text-blue-300" size={17}/>}
        </button>
        <button onClick={()=>void pay('boleto')} disabled={!!working} className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 text-left transition hover:border-amber-400/60 disabled:opacity-60">
          <Banknote className="text-amber-300" size={24}/>
          <p className="mt-3 font-black text-white">Boleto</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Continue no Mercado Pago para gerar e pagar o boleto.</p>
          {working==='boleto'&&<Loader2 className="mt-3 animate-spin text-amber-300" size={17}/>}
        </button>
      </div>}

      {pix&&!approved&&<div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-center">
        <p className="font-black text-emerald-300">Pix gerado pelo Mercado Pago</p>
        <p className="mt-1 text-xs text-slate-400">Escaneie o QR Code ou copie o código. A ativação acontece automaticamente após a confirmação.</p>
        {pix.qrCodeBase64&&<div className="mx-auto mt-4 w-full max-w-[280px] rounded-2xl bg-white p-3"><img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix do Mercado Pago" className="mx-auto h-auto w-full"/></div>}
        {pix.qrCode&&<button onClick={()=>void copyPix()} className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-geek-orange px-4 py-3 font-black text-white"><Copy size={17}/>{copied?'Código copiado':'Copiar Pix Copia e Cola'}</button>}
        {pix.ticketUrl&&<a href={pix.ticketUrl} target="_blank" rel="noreferrer" className="mx-auto mt-3 block text-sm font-bold text-orange-300 hover:underline">Abrir instruções no Mercado Pago</a>}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500"><Loader2 className="animate-spin" size={14}/>Aguardando confirmação do pagamento...</div>
      </div>}

      {approved&&<div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
        <CheckCircle2 className="mx-auto text-emerald-300" size={34}/>
        <h3 className="mt-3 text-lg font-black text-emerald-200">Pagamento confirmado</h3>
        <p className="mt-1 text-sm text-slate-300">O Mercado Pago confirmou o pagamento e o GeekoPlay já recebeu a atualização.</p>
        <button onClick={onClose} className="mt-4 rounded-xl bg-geek-orange px-5 py-3 font-black">Continuar</button>
      </div>}

      {error&&<p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">Processamento e recebimento feitos pelo Mercado Pago. O GeekoPlay não armazena dados do seu cartão.</p>
    </section>
  </div>;
}
