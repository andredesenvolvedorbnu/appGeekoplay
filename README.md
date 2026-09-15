# GeekoPlay

Nova base independente do GeekoPlay, sem dependência do Base44.

## Stack

- Next.js + TypeScript
- Supabase (Postgres, Auth, Storage, Realtime)
- Vercel (deploy)
- Resend (e-mails transacionais)
- GitHub (versionamento)

## Segurança

Nunca commite chaves privadas, `service_role` do Supabase ou API keys do Resend. Use `.env.local` no desenvolvimento e Environment Variables na Vercel.

## Primeira etapa

Esta primeira base cobre:

- autenticação por e-mail/senha e Google;
- layout responsivo inspirado no GeekoPlay atual;
- feed social;
- perfis;
- curtidas, comentários e seguidores no banco;
- estrutura de banco preparada para eventos, comunidades, mensagens, notificações, XP, conquistas, notícias, anúncios, marketplace, pesquisas e Recap Geek.

As próximas etapas serão implementadas incrementalmente, mantendo a arquitetura própria e o banco no Supabase.
