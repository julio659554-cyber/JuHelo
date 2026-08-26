# JuHelo — Auditoria final UI/UX

Data: 2026-08-26
Build: `uiux-10`

## Resultado

A revisão de UI/UX foi concluída em 10 etapas. O frontend ativo deixou de depender da folha visual histórica `app-v31.css` e das camadas versionadas de modal/picker.

## Arquitetura visual ativa

### CSS canônico
- `design-system.css` — tokens, reset e primitives
- `app-shell.css` — estrutura global, safe areas, header, navbar, toast, loading
- `app-ui.css` — Home, Movimentos, Caixinhas, Relatórios e Metas
- `forms.css` — autenticação, Ajustes, modais e formulários
- `picker.css` — popover ancorado para selects
- `interactions.css` — pressed/loading/disabled/toast/motion

### JavaScript auxiliar canônico
- `form-ux.js` — máscara BRL
- `picker.js` — comportamento acessível do seletor
- `boot.js` — boot/skeleton/watchdog sem MutationObserver

### Renderer / lógica financeira
- `app-v31.js` permanece como único renderer e único cliente Supabase ativo. O nome do arquivo é histórico; não existem renderers concorrentes carregados.

## Melhorias concluídas

- Design System único light/dark.
- Dark mode grafite, com roxo apenas como acento.
- Light mode neutro e leve.
- Safe areas iOS/Android padronizadas.
- Navbar mais fina e delicada.
- Toast afastado da região da Dynamic Island/status bar.
- Skeleton sem flash de interface antiga.
- Home com saldo como informação principal e sem “Resultado do mês” redundante.
- Movimentos com lista legível, valores preservados e descrições sem truncamento destrutivo.
- Caixinhas mais compactas, CTA Adicionar principal e ações secundárias lado a lado.
- Relatórios com De/Até, presets e gráfico visualmente mais leve.
- Metas com linguagem de checklist.
- Modais/formulários com 16px mínimo em inputs mobile, scroll do fundo bloqueado e UI consistente.
- Máscara BRL única, sem observer.
- Seletor próprio via popover ancorado; sem modal e sem seletor visual nativo.
- Microinterações, disabled e loading padronizados.
- `prefers-reduced-motion` respeitado.
- CSS legado ativo removido.
- CI atualizado para impedir reintrodução de arquivos/observers legados.

## Auditoria de dados

Resultado da checagem de integridade:
- divergências `transactions` x `monthly_summary`: 0
- divergências `box_movements` x `box_balances`: 0
- recorrências duplicadas: 0
- transactions órfãs: 0
- box movements órfãos: 0
- goals órfãs: 0
- membros de household: 2

Foi realizado teste autenticado com rollback proposital para validar:
- criar movimentação
- editar movimentação
- excluir movimentação
- alternar status de meta
- adicionar valor em Caixinha
- retirar valor de Caixinha

Todos passaram. Após o rollback, 0 registros de auditoria permaneceram no banco.

## Pontos do Supabase fora do escopo visual

Os Advisors ainda reportam itens para uma migration de hardening dedicada:

### Segurança
- `set_updated_at` com `search_path` mutável.
- funções `SECURITY DEFINER` expostas a `anon` e, em alguns casos, `authenticated` além do necessário.
- leaked password protection desativada.

### Performance
- foreign keys sem índices de cobertura.
- RLS com chamadas `auth.*` avaliadas por linha em algumas policies.
- múltiplas policies permissivas para mesma tabela/ação.
- índices duplicados em algumas tabelas.

Esses pontos não foram modificados durante a revisão UI/UX para evitar alteração de segurança/regra financeira sem uma migration isolada e testada.

## Dívida de repositório

Arquivos antigos `v7`, `v14`, `v18`, `v20`, `v22`, `v29`, `v31.css`, `v36`, `v40` etc. ainda podem existir fisicamente no repositório, mas não são carregados pelo `index.html` final. Eles devem ser removidos/arquivados em uma limpeza de repositório separada, após confirmação de deploy estável.

## Gate automático

O workflow `JuHelo Frontend Audit` verifica em `main`:
- sintaxe JS
- ausência do CSS legado no entrypoint
- presença somente dos styles canônicos
- ausência de MutationObserver nos scripts ativos
- um único cliente Supabase
- máscara BRL e picker canônicos
- grafo de cache PWA final
- build marker `uiux-10`
