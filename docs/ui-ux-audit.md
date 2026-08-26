# JuHelo — Auditoria UI/UX base

Data da auditoria: 2026-08-26

## Escopo ativo em produção

O `index.html` atual carrega diretamente apenas:

### CSS
- `app-v31.css`
- `modal-ux-v36.css`
- `picker-v40.css`
- CSS inline do skeleton/boot

### JavaScript
- `modal-ux-v36.js`
- `picker-v40.js`
- `boot-v40.js`
- `app-v31.js` carregado pelo boot

Os muitos arquivos `v7`, `v14`, `v18`, `v20`, `v22`, `v29` etc. continuam presentes no repositório, porém não estão sendo carregados pelo `index.html`. Portanto, atualmente eles são dívida técnica/repositório, não uma disputa direta de runtime.

## O que está saudável

- Existe um único renderer principal ativo (`app-v31.js`).
- Existe um único cliente Supabase ativo no app principal.
- Não há scripts antigos de Home/Metas/Caixinhas carregados junto da interface atual.
- O picker atual é próprio do JuHelo e não depende do seletor visual nativo.
- A máscara BRL atual não usa `MutationObserver`.
- Light/dark compartilham as mesmas classes estruturais.

## Problemas encontrados

### 1. Design tokens misturados com regras de tela

`app-v31.css` começa definindo cores, shadows e aliases e, no mesmo arquivo, define Home, Movimentos, Caixinhas, Relatórios, Metas, auth, navbar, modal e Ajustes.

Consequência: mudar a sensação visual global exige editar regras específicas e aumenta risco de inconsistência.

### 2. Não existe escala visual oficial

Hoje aparecem raios como 12, 14, 15, 16, 17, 18, 20, 24, 26, 28 e 30px, além de diferentes alturas e paddings sem uma escala declarada.

Consequência: telas individualmente bonitas, porém com pequenas diferenças que diminuem a sensação de produto premium/coeso.

### 3. Tipografia sem sistema

Pesos entre 500 e 900 e vários tamanhos são usados diretamente nas regras. Não existe hierarquia semântica oficial para display, título, body, caption, label e valores financeiros.

Consequência: títulos e dados competem visualmente em algumas telas.

### 4. Purple e estados semânticos são usados como styling e não somente significado

O roxo aparece como fundo, borda, texto e destaque em vários níveis. Isso cria mais peso visual do que a direção aprovada exige.

Direção: roxo deve ser acento; conteúdo e surfaces permanecem neutros.

### 5. CSS com responsabilidade vazando entre componentes

`picker-v40.css` também contém:
- regra para esconder `Resultado do mês` da Home;
- regra para transformar CTA de página em full width;
- scrollbar global;
- bloqueio de zoom global.

Essas regras não pertencem ao picker e serão movidas para seus donos durante a revisão.

### 6. Modal UX ainda é uma camada separada

`modal-ux-v36.css` usa vários `!important` para corrigir regras existentes do app principal. Isso é aceitável como correção histórica, mas não como arquitetura final.

Objetivo da Etapa 8: incorporar o comportamento final diretamente aos componentes canônicos e remover essa camada.

### 7. Picker intercepta eventos globalmente

O `picker-v40.js` usa captura de `pointerdown` e `stopImmediatePropagation()` nos hosts de selects. Funciona, mas é uma solução que exige cuidado com acessibilidade e futuros componentes.

Objetivo futuro: transformar selects usados pelo JuHelo em triggers explícitos de um componente de dropdown, sem depender de neutralização global do elemento nativo.

### 8. Skeleton possui tokens duplicados no HTML

As cores do skeleton são declaradas inline no `index.html`, separadas do sistema visual.

Objetivo da Etapa 2: skeleton consumir exclusivamente tokens canônicos do Design System e evitar CSS visual inline.

### 9. Boot ainda possui um MutationObserver

`boot-v40.js` observa apenas filhos diretos de `#app` para manter skeleton/watchdog. Ele não redesenha telas e não é a antiga disputa de UI, mas pode ser simplificado quando o loading global for consolidado.

### 10. Arquivos legados permanecem no repositório

Há muitos arquivos antigos não carregados. Não afetam a interface atual, porém aumentam custo de manutenção e risco de serem reintroduzidos por engano.

Objetivo da auditoria final: arquivar/remover os que estiverem comprovadamente mortos.

## Direção aprovada

Hierarquia de produto:
1. dado financeiro;
2. ação;
3. navegação;
4. decoração.

Princípios:
- neutralidade nas surfaces;
- roxo como acento;
- verde/vermelho somente para semântica financeira;
- shadows quase imperceptíveis;
- bordas discretas;
- radius consistente;
- tipografia menos pesada;
- mais whitespace;
- dark mode grafite, não roxo;
- light mode neutro e levemente quente;
- nenhuma tela cria tokens próprios.

## Plano de migração

O arquivo canônico `design-system.css` passa a ser a fonte oficial dos tokens `--jh-*`.

Durante a migração, aliases (`--bg`, `--surface`, `--purple` etc.) apontam para o Design System para manter a interface funcional. Cada etapa seguinte deve migrar seus componentes para `--jh-*` e remover estilos históricos do lugar errado, em vez de adicionar novos overrides versionados.
