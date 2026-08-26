# JuHelo Design System

`design-system.css` é a fonte canônica de identidade visual do produto.

## Filosofia

O JuHelo deve parecer uma fintech premium de uso cotidiano para um casal: leve, clara, delicada e confiável.

A interface não deve parecer decorada. Os dados financeiros são os protagonistas.

## Cores

### Neutros
- `--jh-bg`: fundo principal.
- `--jh-bg-soft`: fundo secundário.
- `--jh-surface`: card/surface principal.
- `--jh-surface-subtle`: controles e superfícies secundárias.
- `--jh-surface-elevated`: dropdown/popover/elevated surface.
- `--jh-text`: texto principal.
- `--jh-text-soft`: texto secundário importante.
- `--jh-muted`: descrição/legenda.
- `--jh-border`: divisores e bordas discretas.
- `--jh-border-strong`: borda de campo/controle quando necessário.

### Marca
O roxo é acento, não fundo dominante:
- `--jh-accent`
- `--jh-accent-strong`
- `--jh-accent-soft`

### Semântica financeira
- receita/sucesso: `--jh-green`, `--jh-green-soft`;
- despesa/erro: `--jh-red`, `--jh-red-soft`;
- atenção: `--jh-warning`, `--jh-warning-soft`.

## Tipografia

Fonte: stack nativa premium baseada em Inter/system.

Escala:
- XS 11
- SM 13
- MD 15
- Base 16
- LG 18
- XL 22
- 2XL 28
- 3XL 36
- Display 44

Pesos oficiais:
- 500 regular;
- 600 medium;
- 700 semibold;
- 800 bold.

Evitar peso 900 na interface final, exceto situações muito pontuais de marca/valor.

## Espaçamento

Escala baseada em 4px:
4 / 8 / 12 / 16 / 20 / 24 / 28 / 32 / 40 / 48.

Não criar paddings novos sem necessidade.

## Radius

10 / 14 / 18 / 22 / 26 / 30 / pill.

Uso recomendado:
- icon container: 14–18;
- input/button: 18;
- card pequeno: 22;
- card principal: 26;
- modal: 30;
- chips: pill.

## Elevação

Sombras são intencionalmente discretas:
- `--jh-shadow-xs`: cards comuns;
- `--jh-shadow-sm`: cards que precisam de leve separação;
- `--jh-shadow-md`: componentes elevados;
- `--jh-shadow-float`: navbar, popover, modal.

Preferir border + contraste de surface antes de aumentar sombra.

## Controles

Alturas oficiais:
- 44px compacto/touch minimum;
- 52px padrão;
- 56px formulário/CTA confortável.

Inputs mobile sempre usam fonte >=16px para evitar zoom automático do Safari.

## Ícones

Tamanhos oficiais:
- 18px pequeno;
- 22px padrão;
- 24px destaque.

Usar traço consistente e ícones lineares. Evitar misturar emoji ou glyphs de fontes com SVG na mesma experiência principal.

## Componentes canônicos

Primitives disponibilizados pelo CSS:
- `.jh-card`
- `.jh-btn`
- `.jh-control`
- `.jh-label`
- `.jh-helper`
- `.jh-popover`
- `.jh-modal`
- `.jh-navbar`
- `.jh-toast`
- `.jh-skeleton`

As telas podem ter componentes compostos próprios, mas devem ser construídos a partir desses tokens/princípios.

## Light mode

- fundo neutro levemente quente;
- cards brancos;
- shadows muito suaves;
- roxo somente em ação/estado ativo;
- verde/vermelho apenas para significado financeiro.

## Dark mode

- fundo grafite quase preto;
- surfaces com pequena diferença de luminância;
- não tingir toda a interface de roxo;
- roxo, verde e vermelho ficam mais luminosos apenas nos acentos;
- bordas usam branco com alpha baixo.

## Movimento

Durações:
- 120ms feedback rápido;
- 180ms transição padrão;
- 260ms transição mais elaborada.

Toda animação deve respeitar `prefers-reduced-motion`.

## Regra de evolução

Não adicionar `vXX-fix.css` para alterar o visual.

Quando uma tela for revisada:
1. migrar seus valores para tokens `--jh-*`;
2. ajustar o componente no stylesheet canônico;
3. remover regra histórica conflitante;
4. testar light/dark/mobile;
5. só então avançar.
