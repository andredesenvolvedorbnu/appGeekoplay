# Setup do GeekoPlay

## 1. Supabase

1. Abra o projeto do GeekoPlay no Supabase.
2. Vá em **SQL Editor**.
3. Execute `supabase/migrations/001_initial_schema.sql`.
4. Em **Authentication > Providers**, habilite Email/Password e Google.
5. Em **Authentication > URL Configuration**, adicione:
   - `http://localhost:3000/auth/callback`
   - a URL de produção da Vercel + `/auth/callback`
6. Em **Project Settings > API**, copie somente a URL pública e a `anon`/publishable key para as variáveis do app.
7. Nunca exponha `service_role` no navegador.

## 2. Variáveis locais

Crie `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

Preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` só podem ser usadas no servidor.

## 3. Rodar no VS Code

```bash
git clone https://github.com/andredesenvolvedorbnu/appGeekoplay.git
cd appGeekoplay
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## 4. Vercel

Conecte o projeto Vercel ao repositório `andredesenvolvedorbnu/appGeekoplay` e cadastre as mesmas variáveis em **Environment Variables**. Não coloque segredos no GitHub.

## 5. Resend

Use o Resend somente por rotas/API server-side. Antes de produção, verifique um domínio próprio e configure remetentes como `no-reply@seudominio.com.br`.

## Ordem de construção

### Fase 1 — fundação
- [x] Next.js/TypeScript
- [x] Supabase client/server
- [x] login e cadastro
- [x] Google OAuth preparado
- [x] layout responsivo GeekoPlay
- [x] schema inicial + RLS
- [x] feed inicial

### Fase 2 — social essencial
- [ ] criação de posts e upload
- [ ] curtidas e comentários em tempo real
- [ ] perfil completo, avatar/capa com crop
- [ ] seguir/deixar de seguir
- [ ] busca e Explorar

### Fase 3 — comunidade
- [ ] Comunidades estilo Orkut
- [ ] mensagens diretas realtime
- [ ] notificações realtime
- [ ] Pulses 24h

### Fase 4 — universo geek
- [ ] eventos gerenciados pelo ADM
- [ ] Meu Card / Card Geek
- [ ] XP, níveis, medalhas e conquistas
- [ ] Minha Coleção
- [ ] Recap Geek semestral

### Fase 5 — conteúdo e economia
- [ ] notícias por URL e painel ADM
- [ ] Mercado Geek
- [ ] anúncios e regras de frequência
- [ ] Premium e impulsionamento

### Fase 6 — inteligência e gestão
- [ ] Dashboard ADM completo
- [ ] pesquisas pós-evento
- [ ] relatórios por evento
- [ ] analytics de anúncios
- [ ] relatórios de usuários/PRO/receita

### Fase 7 — produção
- [ ] emails transacionais com Resend
- [ ] testes mobile/tablet/desktop
- [ ] testes de segurança/RLS
- [ ] otimização de imagens
- [ ] SEO/PWA
- [ ] deploy final
