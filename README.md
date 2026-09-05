# JuHelo

Aplicativo/PWA de finanças do casal.

## Stack atual
- Frontend estático em HTML/CSS/JavaScript
- Supabase para autenticação, banco e RLS
- Cloudflare Pages para publicação
- PWA instalável no celular

## Funcionalidades atuais
- Login e cadastro
- Espaço financeiro compartilhado para duas pessoas
- Código de convite do casal
- Controle por mês, sem exigir dia
- Receitas e despesas editáveis
- Status Pago/Não pago por despesa, sem alterar os totais financeiros
- Alerta de pendências do mês anterior na Home
- Gastos fixos com mês inicial e mês final opcional
- Edição de gasto fixo: só este mês / deste mês em diante / toda a série
- Exclusão de gasto fixo: só este mês / deste mês em diante / toda a série
- Caixinhas com nome, meta, saldo e histórico
- Depósito em caixinha contado como despesa do mês
- Retirada da caixinha sem duplicar despesa
- Metas em checklist
- Metas ligadas opcionalmente a caixinhas
- Conclusão automática de meta financeira ao atingir o valor da caixinha
- Relatório anual de receitas, despesas, saldo e total destinado a caixinhas
- Navbar inferior flutuante
- Layout responsivo e mobile-first
- Service Worker e manifest PWA

## Supabase
O frontend está apontado para o projeto Supabase atual do JuHelo usando apenas a Publishable Key.

Para preparar o banco, execute no SQL Editor, nesta ordem:

1. `sql/001_initial_schema.sql`
2. `sql/002_recurring_goals_rls.sql`

A migration 002 é obrigatória para a V2 porque adiciona os escopos de edição/exclusão de recorrência, conclusão automática de metas e corrige a edição compartilhada de caixinhas.

Nunca coloque `service_role`, Secret Key ou senha do banco no frontend.

## Cloudflare Pages
Este projeto não precisa de etapa de build.

Configuração:
- Framework preset: `None`
- Build command: vazio
- Build output directory: `.`
- Root directory: `/`

Quando o repositório estiver conectado ao Cloudflare Pages, cada push em `main` publica automaticamente uma nova versão.

## Status
Baseline canônico `uiux-22`, com frontend, Supabase e grafo PWA auditados. A migration de status de pagamento `20260905140204_transaction_payment_status` já está aplicada no projeto atual.
