'use client';
import { useEffect,useMemo,useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ProfileClient(){
 const supabase=useMemo(()=>createClient(),[]); const [profile,setProfile]=useState<any>(null); const [bio,setBio]=useState(''); const [city,setCity]=useState(''); const [saving,setSaving]=useState(false);
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser(); if(!user)return; const {data}=await supabase.from('profiles').select('*').eq('id',user.id).single(); setProfile(data); setBio(data?.bio||''); setCity(data?.city||'')})()},[supabase]);
 async function save(){if(!profile)return;setSaving(true);const {data}=await supabase.from('profiles').update({bio,city,updated_at:new Date().toISOString()}).eq('id',profile.id).select().single();setProfile(data);setSaving(false)}
 async function logout(){await supabase.auth.signOut(); location.href='/login'}
 if(!profile)return <div className="mx-auto max-w-3xl px-4 py-12 text-slate-400">Carregando perfil...</div>;
 return <div className="mx-auto max-w-3xl px-3 sm:px-4"><section className="overflow-hidden rounded-3xl border border-geek-line bg-geek-panel"><div className="h-36 bg-gradient-to-r from-orange-500/40 via-purple-500/30 to-cyan-500/20"/><div className="p-5 -mt-10"><div className="h-20 w-20 rounded-full border-4 border-geek-panel bg-gradient-to-br from-orange-400 to-purple-600"/><div className="mt-3 flex flex-wrap items-center gap-3"><div><h1 className="text-2xl font-black">{profile.display_name}</h1><p className="text-sm text-slate-400">@{profile.username||'novo-geek'} · Lv.{profile.level} · {profile.xp} XP</p></div><button onClick={logout} className="ml-auto rounded-xl border border-geek-line px-3 py-2 text-sm">Sair</button></div><div className="mt-6 grid gap-3"><textarea className="min-h-24 rounded-xl border border-geek-line bg-geek-soft p-3" value={bio} onChange={e=>setBio(e.target.value)} placeholder="Conte um pouco sobre você..."/><input className="rounded-xl border border-geek-line bg-geek-soft p-3" value={city} onChange={e=>setCity(e.target.value)} placeholder="Cidade"/><button onClick={save} disabled={saving} className="rounded-xl bg-geek-orange px-4 py-3 font-bold">{saving?'Salvando...':'Salvar perfil'}</button></div></div></section></div>
}
