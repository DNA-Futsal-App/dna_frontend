# Paleta de cores — DNA Futsal

A paleta foi extraída do logo oficial e ajustada para contraste, legibilidade e uso consistente em interface digital.

| Token | Hex | Origem e uso |
|---|---:|---|
| Ink | `#020202` | Preto do logo; placares, contraste e textos sobre cores claras |
| Night | `#071112` | Fundo principal, levemente azulado para preservar profundidade |
| Panel | `#0D1A1C` | Cards, menus e superfícies elevadas |
| Ivory | `#ECEFDC` | Branco quente do lettering; texto principal |
| Muted | `#AAB8B3` | Texto secundário e metadados |
| Cyan | `#62E3E8` | Cor primária; ações, seleção e dados importantes |
| Ocean | `#33A6BD` | Apoio do ciano; gráficos, degradês e estados informativos |
| Deep | `#1E7396` | Profundidade visual e fundos de destaque |
| Amber | `#E2AE56` | Destaques esportivos, liderança e artilharia |
| Coral | `#F06A2A` | Energia do logo; alertas, jogos e chamadas pontuais |
| Coral Dark | `#C25A2D` | Variação para degradês e contraste do coral |

## Proporção recomendada

- 70%: Night, Ink e Panel.
- 20%: Ivory, Muted e linhas neutras.
- 7%: Cyan e Ocean.
- 3%: Amber e Coral.

O ciano é a cor de ação principal. Âmbar e coral não devem competir com ele em todos os componentes; funcionam melhor como sinais esportivos, destaques e alertas.

## Contraste

- Texto `Ink` sobre `Cyan` nos botões primários.
- Texto `Ivory` sobre `Night` e `Panel`.
- `Muted` somente para texto secundário em tamanho confortável.
- Nunca usar `Coral` como texto pequeno sobre `Night`; o tom claro de erro usado na interface preserva a leitura.

## Tokens no Tailwind

Os tokens estão declarados em `app/globals.css` com `@theme`, disponíveis como `bg-cyan`, `text-ivory`, `border-line` e demais utilitários.
