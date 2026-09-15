import Link from 'next/link';
import { Gamepad2, LogIn, UserPlus } from 'lucide-react';

export default function BemVindoPage(){
 return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#090b10] px-4 py-10 text-slate-100">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,.14),transparent_32%),radial-gradient(circle_at_80%_85%,rgba(124,58,237,.12),transparent_32%)]"/>
  <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#11151c]/95 p-6 text-center shadow-2xl sm:p-8">
   <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-950/30"><Gamepad2 size={34}/></div>
   <h1 className="mt-5 text-3xl font-black"><span className="text-orange-400">Geeko</span>Play</h1>
   <p className="mt-2 text-sm leading-6 text-slate-400">A comunidade geek que você merecia.</p>
   <div className="mt-7 grid gap-3">
    <Link href="/login" className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 font-black text-white transition hover:bg-orange-400"><LogIn size={18}/>Fazer login</Link>
    <Link href="/cadastro" className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 font-bold text-slate-100 transition hover:border-orange-500/40 hover:bg-orange-500/5"><UserPlus size={18}/>Criar uma nova conta</Link>
   </div>
   <p className="mt-6 text-xs leading-5 text-slate-600">Entre com sua conta ou crie seu perfil para participar da comunidade.</p>
  </section>
 </main>;
}
