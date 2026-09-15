'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Crown, LogOut, MapPin, Pencil, ShieldCheck, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = ['Anime','Games','HQs & Comics','Filmes','Séries','Cosplay','Mangá','K-Pop','RPG','Tecnologia','Colecionáveis'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg','image/png','image/webp'];

type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  city: string | null;
  favorite_categories: string[];
  role: 'user' | 'admin';
  is_pro: boolean;
  xp: number;
  level: number;
  created_at: string;
};

type EditorKind = 'avatar' | 'cover';

type EditorState = {
  kind: EditorKind;
  file: File;
  preview: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function loadImage(src: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function createCroppedFile(
  source: File,
  kind: EditorKind,
  zoom: number,
  offsetX: number,
  offsetY: number
) {
  const sourceUrl = URL.createObjectURL(source);
  try {
    const image = await loadImage(sourceUrl);
    const aspect = kind === 'avatar' ? 1 : 3;
    const outputWidth = kind === 'avatar' ? 1024 : 1800;
    const outputHeight = kind === 'avatar' ? 1024 : 600;

    let baseCropWidth = image.naturalWidth;
    let baseCropHeight = baseCropWidth / aspect;
    if (baseCropHeight > image.naturalHeight) {
      baseCropHeight = image.naturalHeight;
      baseCropWidth = baseCropHeight * aspect;
    }

    const cropWidth = baseCropWidth / zoom;
    const cropHeight = baseCropHeight / zoom;
    const maxX = Math.max(0, image.naturalWidth - cropWidth);
    const maxY = Math.max(0, image.naturalHeight - cropHeight);
    const centerX = maxX / 2;
    const centerY = maxY / 2;
    const sourceX = clamp(centerX + (offsetX / 100) * centerX, 0, maxX);
    const sourceY = clamp(centerY + (offsetY / 100) * centerY, 0, maxY);

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível preparar a imagem.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Não foi possível processar a imagem.')), 'image/webp', 0.9);
    });
    return new File([blob], `${kind}-${Date.now()}.webp`, { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function ImageEditor({ state, onClose, onConfirm }: {
  state: EditorState;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void>;
}) {
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [working, setWorking] = useState(false);
  const isAvatar = state.kind === 'avatar';

  async function confirm() {
    setWorking(true);
    try {
      const cropped = await createCroppedFile(state.file, state.kind, zoom, x, y);
      await onConfirm(cropped);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-geek-line bg-geek-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-geek-line px-4 py-3 sm:px-5">
          <div>
            <h2 className="font-black">Ajustar {isAvatar ? 'foto do perfil' : 'imagem de capa'}</h2>
            <p className="text-xs text-slate-400">Reposicione e aplique zoom sem deformar a imagem.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-geek-soft" aria-label="Fechar"><X size={20}/></button>
        </div>

        <div className="p-4 sm:p-5">
          <div className={`relative mx-auto overflow-hidden bg-black/40 ${isAvatar ? 'aspect-square max-w-sm rounded-full' : 'aspect-[3/1] w-full rounded-2xl'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.preview}
              alt="Prévia do recorte"
              className="absolute inset-0 h-full w-full select-none object-cover"
              style={{ transform: `translate(${x * 0.22}%, ${y * 0.22}%) scale(${zoom})`, transformOrigin: 'center' }}
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/15"/>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm"><span>Zoom</span><input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label>
            <label className="grid gap-1 text-sm"><span>Horizontal</span><input type="range" min="-50" max="50" step="1" value={x} onChange={e=>setX(Number(e.target.value))}/></label>
            <label className="grid gap-1 text-sm"><span>Vertical</span><input type="range" min="-50" max="50" step="1" value={y} onChange={e=>setY(Number(e.target.value))}/></label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-geek-line p-4 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="rounded-xl border border-geek-line px-4 py-2.5 font-semibold">Cancelar</button>
          <button onClick={confirm} disabled={working} className="rounded-xl bg-geek-orange px-4 py-2.5 font-black disabled:opacity-60">{working ? 'Processando...' : 'Usar esta imagem'}</button>
        </div>
      </div>
    </div>
  );
}

export function ProfileClient() {
  const supabase = useMemo(() => createClient(), []);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error || !data) {
        setError('Não foi possível carregar seu perfil.');
        return;
      }
      const p = data as Profile;
      setProfile(p);
      setDisplayName(p.display_name || '');
      setUsername(p.username || '');
      setBio(p.bio || '');
      setCity(p.city || '');
      setCategories(p.favorite_categories || []);
    })();
  }, [supabase]);

  function openEditor(kind: EditorKind, file?: File) {
    if (!file) return;
    setError('');
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Use uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('A imagem deve ter no máximo 10 MB.');
      return;
    }
    setEditor({ kind, file, preview: URL.createObjectURL(file) });
  }

  async function uploadEditedImage(file: File) {
    if (!profile || !editor) return;
    setUploading(true);
    setError('');
    const bucket = editor.kind === 'avatar' ? 'avatars' : 'covers';
    const path = `${profile.id}/${editor.kind}-${Date.now()}.webp`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: 'image/webp', upsert: false });
    if (uploadError) {
      setError('Não foi possível enviar a imagem. Tente novamente.');
      setUploading(false);
      return;
    }
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    const field = editor.kind === 'avatar' ? 'avatar_url' : 'cover_url';
    const { data, error: updateError } = await supabase.from('profiles').update({ [field]: publicData.publicUrl, updated_at: new Date().toISOString() }).eq('id', profile.id).select().single();
    if (updateError || !data) {
      setError('A imagem foi enviada, mas não foi possível atualizar seu perfil.');
      setUploading(false);
      return;
    }
    URL.revokeObjectURL(editor.preview);
    setProfile(data as Profile);
    setEditor(null);
    setUploading(false);
    setMessage(editor.kind === 'avatar' ? 'Foto do perfil atualizada.' : 'Imagem de capa atualizada.');
  }

  function toggleCategory(category: string) {
    setCategories(current => current.includes(category) ? current.filter(item => item !== category) : [...current, category]);
  }

  async function save() {
    if (!profile) return;
    setError('');
    setMessage('');
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (displayName.trim().length < 2) return setError('Digite um nome com pelo menos 2 caracteres.');
    if (cleanUsername && cleanUsername.length < 3) return setError('O nome de usuário precisa ter pelo menos 3 caracteres.');
    setSaving(true);
    const { data, error } = await supabase.from('profiles').update({
      display_name: displayName.trim(),
      username: cleanUsername || null,
      bio: bio.trim().slice(0, 300),
      city: city.trim().slice(0, 100),
      favorite_categories: categories,
      updated_at: new Date().toISOString()
    }).eq('id', profile.id).select().single();
    setSaving(false);
    if (error) {
      if (error.code === '23505') setError('Esse nome de usuário já está sendo usado. Escolha outro.');
      else setError('Não foi possível salvar o perfil. Tente novamente.');
      return;
    }
    setProfile(data as Profile);
    setUsername((data as Profile).username || '');
    setMessage('Perfil salvo com sucesso.');
  }

  async function logout() {
    await supabase.auth.signOut();
    location.href = '/login';
  }

  if (!profile) return <div className="mx-auto max-w-4xl px-4 py-12 text-slate-400">{error || 'Carregando perfil...'}</div>;

  return (
    <div className="mx-auto w-full max-w-4xl px-3 pb-8 sm:px-5">
      <section className="overflow-hidden rounded-2xl border border-geek-line bg-geek-panel sm:rounded-3xl">
        <div className="group relative aspect-[3/1] min-h-[130px] max-h-[260px] bg-gradient-to-r from-orange-500/35 via-purple-500/25 to-cyan-500/20">
          {profile.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.cover_url} alt="Capa do perfil" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-center text-slate-400"><div><Camera className="mx-auto mb-2"/><span className="text-sm font-semibold">Coloque sua imagem de capa aqui</span></div></div>
          )}
          <button onClick={()=>coverInput.current?.click()} className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-xs font-bold text-white backdrop-blur hover:bg-black/85"><Camera size={16}/> Alterar capa</button>
          <input ref={coverInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>openEditor('cover', e.target.files?.[0])}/>
        </div>

        <div className="relative px-4 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-geek-panel bg-geek-soft sm:h-28 sm:w-28">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Foto do perfil" className="h-full w-full object-cover" />
              ) : (
                <button onClick={()=>avatarInput.current?.click()} className="grid h-full w-full place-items-center text-center text-slate-400"><span><Camera className="mx-auto" size={22}/><span className="mt-1 block text-[10px] font-semibold">Coloque sua foto</span></span></button>
              )}
              <button onClick={()=>avatarInput.current?.click()} className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-geek-orange text-white shadow-lg" aria-label="Alterar foto"><Pencil size={14}/></button>
              <input ref={avatarInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>openEditor('avatar', e.target.files?.[0])}/>
            </div>

            <div className="min-w-0 flex-1 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-black sm:text-3xl">{profile.display_name}</h1>
                {profile.is_pro && <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-xs font-black text-yellow-300"><Crown size={13}/> PRO</span>}
                {profile.role === 'admin' && <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-1 text-xs font-black text-orange-300"><ShieldCheck size={13}/> ADM</span>}
              </div>
              <p className="mt-1 text-sm text-slate-400">@{profile.username || 'defina-seu-usuario'} · Nível {profile.level} · {profile.xp} XP</p>
              {profile.city && <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13}/>{profile.city}</p>}
            </div>

            <button onClick={logout} className="flex items-center justify-center gap-2 rounded-xl border border-geek-line px-3 py-2 text-sm font-semibold hover:bg-geek-soft"><LogOut size={16}/> Sair</button>
          </div>

          {profile.bio && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-300">{profile.bio}</p>}
          {categories.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{categories.map(item=><span key={item} className="rounded-full bg-geek-soft px-2.5 py-1 text-xs text-slate-300">{item}</span>)}</div>}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-geek-line bg-geek-panel p-4 sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-black">Editar perfil</h2><p className="text-sm text-slate-400">Monte sua identidade dentro da comunidade.</p></div>
          <Upload className="text-geek-orange" size={20}/>
        </div>

        {(error || message) && <div className={`mb-4 rounded-xl border px-3 py-2 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{error || message}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm"><span className="font-semibold">Nome</span><input className="rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none focus:border-geek-orange" value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={80}/></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold">Nome de usuário</span><div className="flex rounded-xl border border-geek-line bg-geek-soft focus-within:border-geek-orange"><span className="px-3 py-3 text-slate-500">@</span><input className="min-w-0 flex-1 bg-transparent py-3 pr-3 outline-none" value={username} onChange={e=>setUsername(e.target.value)} maxLength={40} placeholder="seu.usuario"/></div></label>
          <label className="grid gap-1.5 text-sm sm:col-span-2"><span className="font-semibold">Bio</span><textarea className="min-h-28 resize-y rounded-xl border border-geek-line bg-geek-soft p-3 outline-none focus:border-geek-orange" value={bio} onChange={e=>setBio(e.target.value)} maxLength={300} placeholder="Conte um pouco sobre você, seus fandoms e o que você curte..."/><span className="text-right text-xs text-slate-500">{bio.length}/300</span></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold">Cidade</span><input className="rounded-xl border border-geek-line bg-geek-soft px-3 py-3 outline-none focus:border-geek-orange" value={city} onChange={e=>setCity(e.target.value)} maxLength={100} placeholder="Ex.: Blumenau - SC"/></label>
          <div className="grid gap-1.5 text-sm"><span className="font-semibold">E-mail</span><div className="rounded-xl border border-geek-line bg-geek-soft px-3 py-3 text-slate-500">{profile.email}</div></div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold">Interesses</p>
          <p className="mt-1 text-xs text-slate-500">Escolha os temas que mais combinam com você.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map(category => {
              const selected = categories.includes(category);
              return <button key={category} type="button" onClick={()=>toggleCategory(category)} className={`flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-semibold transition ${selected ? 'border-geek-orange bg-geek-orange/15 text-orange-300' : 'border-geek-line bg-geek-soft text-slate-300 hover:border-slate-500'}`}>{selected && <Check size={13}/>} {category}</button>;
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={save} disabled={saving || uploading} className="w-full rounded-xl bg-geek-orange px-5 py-3 font-black disabled:opacity-60 sm:w-auto">{saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      </section>

      {editor && <ImageEditor state={editor} onClose={()=>{URL.revokeObjectURL(editor.preview);setEditor(null)}} onConfirm={uploadEditedImage}/>} 
    </div>
  );
}
