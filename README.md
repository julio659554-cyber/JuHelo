# JuHelo

Aplicativo/PWA de finanças do casal.

## Stack atual
- Frontend estático em HTML/CSS/JavaScript
- Supabase para autenticação, banco e RLS
- Cloudflare Pages para publicação
- PWA instalável no celular

## Funcionalidades da V1
- Login e cadastro
- Espaço financeiro compartilhado para duas pessoas
- Controle por mês, sem exigir dia
- Receitas e despesas editáveis
- Gastos fixos com mês inicial e mês final opcional
- Caixinhas com saldo automático
- Depósito em caixinha contado como despesa do mês
- Retirada da caixinha sem duplicar despesa
- Metas em checklist
- Metas ligadas opcionalmente a caixinhas
- Relatório anual de receitas, despesas e saldo
- Navbar inferior flutuante
- Layout responsivo e mobile-first

## Supabase
O frontend está apontado para o projeto Supabase atual do JuHelo usando apenas a Publishable Key.

Para preparar um banco novo, execute no SQL Editor:

`sql/001_initial_schema.sql`

Nunca coloque `service_role`, Secret Key ou senha do banco no frontend.

## Cloudflare Pages
Este projeto não precisa de etapa de build.

Configuração recomendada:
- Framework preset: `None`
- Build command: vazio
- Build output directory: `.`
- Root directory: `/`

## Status
A base funcional da V1 já está no repositório. O próximo passo é executar a migration no Supabase, validar o fluxo real de autenticação/dados e conectar o repositório ao Cloudflare Pages.
