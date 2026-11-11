---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T03-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T01 a T03), 01-analista-requisitos.md (RF-01 a RF-17, RNF-01 a RNF-14), 06-T03-engenheiro-frontend.md, 06-T03-tech-lead.md, commit d452a76 (diff do código e dos testes), vitest.config.ts, src/app/globals.css, src/components/Alerta.tsx, AreaTexto.tsx, BlocoJson.tsx, Botao.tsx, CaixaSelecao.tsx, CampoTexto.tsx, DialogoConfirmacao.tsx, Esqueleto.tsx, GrupoOpcoes.tsx, Interruptor.tsx, ListaTextos.tsx, Paginacao.tsx, Selecao.tsx, Tabela.tsx, src/components/componentes.test.ts (cabeçalho), test/estatico/painel-qa.test.ts (linhas 1 a 140)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T03 (tokens da marca, contraste, foco e componentes base), código em d452a76. Todo critério da tarefa tem teste; a
suíte inteira, o lint e o typecheck passam; e2e 154 de 154. Nenhum defeito no código da tarefa.

### Critério da tarefa → teste que cobre

| Critério (plano, T03) | Arquivo | Teste |
|---|---|---|
| CA-01.1 hexadecimal só no `@theme` (e o QR da T02) | `test/estatico/cores-so-por-token.test.ts` | "CA-01.1 …" › "nenhum .ts ou .tsx de src/ tem hexadecimal fora da exceção do QR", "nenhum outro .css de src/ tem hexadecimal, e o globals.css só dentro do @theme", "a regra reprova a forma plantada…" |
| CA-01.1, lado da classe: componente usa só token (G3.5) | `src/components/tokens-em-uso.test.ts` (novo) | "nenhuma classe de cor dos componentes base fica sem token", "a regra reprova nome errado, paleta do Tailwind e branco literal…" |
| CA-01.2 nenhum `style={` em `src/` | `test/estatico/cores-so-por-token.test.ts`; `test/estatico/sem-recurso-externo.test.ts` (T01) | "CA-01.2: nenhum style={ em src/" › "nenhum arquivo de src/ usa style={"; regra `style={` do CV-02 |
| CA-01.3 cada cor do manual com valor exato no `@theme` | `test/estatico/cores-so-por-token.test.ts`; `test/estatico/painel-qa.test.ts` | "CA-01.3 …" › "--color-%s = %s" (13); "token %s = %s, dentro do @theme" (41, com apelidos e raios) |
| RNF-01 texto ≥ 4,5:1 | `test/estatico/contraste-tokens.test.ts`; `src/components/tokens-em-uso.test.ts` | "texto %s sobre %s ≥ 4,5:1" (34 pares da 03, 2.2); e, lido do HTML e do CSS: "Selo %s: texto sobre o próprio fundo ≥ 4,5:1" (10), "Alerta %s: texto e link … ≥ 4,5:1" (4), "Botao %s: texto ≥ 4,5:1 sobre o fundo (e no hover)…" (6), "Botao %s indisponível (aria-disabled)…" (6), "campos: …", "dica e mensagem de erro dos campos…", "Tabela: …", "BlocoJson: …", "Paginacao: …", "texto da página, h1 e link ≥ 4,5:1…" |
| RNF-02 não textual ≥ 3:1 | `test/estatico/contraste-tokens.test.ts`; `src/components/tokens-em-uso.test.ts` | "elemento %s sobre %s ≥ 3:1" (11) e "vetado %s sobre %s fica abaixo de %d" (5); contorno do `Botao`, borda de campo e de erro, "Interruptor: trilho e botão ≥ 3:1…", "GrupoOpcoes cartão: …", "CaixaSelecao: …", "selo tracejado …", anel de foco |
| RNF-04 contorno de foco ≥ 2 px | `test/estatico/painel-qa.test.ts`; `src/components/tokens-em-uso.test.ts` | "foco visível: contorno de 2 px…"; "anel de foco: ≥ 2 px com --cor-foco; no claro ≥ 3:1…; em .superficie-escura ≥ 3:1 no marinho" |
| RNF-11 sem animação com `prefers-reduced-motion` | `src/components/tokens-em-uso.test.ts` | "o bloco de prefers-reduced-motion continua zerando animação e transição" |
| Selos com texto sempre presente | `src/components/componentes.test.ts`; `src/app/(painel)/demandas/fila-qa.test.ts` | "Selo: data-cor, 13 px em peso 700, e o par texto/fundo de cada cor da 03, 2.5" (`>Texto</span>` em cada cor), "Selo é texto…"; "cada status aparece com o seu rótulo e a cor de 2.2" |
| D-01 apelidos até a T16 | `test/estatico/painel-qa.test.ts`; `src/components/tokens-em-uso.test.ts` | "token %s = %s…" (os nove `var()`); "todo --color-* do @theme tem valor hexadecimal, direto ou por apelido…", "todo var(--color-…) do globals.css … aponta para token declarado" |
| D-03 mapas de cor da 03, 2.5 | `src/components/rotulos.test.ts` | "cores dos selos de status, de decisão e de nível (03, 2.5 do pedido 0015)", "decisão, nível e selos especiais" |
| D-15 `data-cor` | `src/components/componentes.test.ts`; `fila-qa.test.ts`; `fila.test.ts` | "Selo: data-cor…"; regex `data-cor="${COR_STATUS[st]}"` |
| Componentes base (variantes do `Botao`, `aria-disabled`, `Cartao`, `GrupoOpcoes` cartão, `Alerta`, `classeDoCampo`) | `src/components/componentes.test.ts` | "variantes sobre-escuro e claro-sobre-escuro", "estado aria-disabled…", "nenhuma variante usa cor da paleta do Tailwind…", "Cartao (03, 2.4 e 2.6)", "variante cartão: …", "Alerta de informação…", "campos com os tokens da 0.2.0…" |
| CV-01 superfícies congeladas | comando G4 | `git diff 198e97d --stat -- …` vazio |
| axe sem violação nas telas tocadas | `e2e/axe-todas.spec.ts` | a suíte da `axe-todas` nas 12 telas, dentro do `pnpm test:e2e` (154 de 154), com a vigia da T01 sem achado |

### Teste acrescentado

`src/components/tokens-em-uso.test.ts`, 46 testes. Os testes da construção conferem a lista de pares da 03, 2.2 e as
classes uma a uma; faltava ligar as duas coisas. Este arquivo lê o próprio código e reprova:

1. classe de cor de componente base que não é token do `@theme` (nome errado o Tailwind ignora sem erro, e a cor some
   da tela sem nenhum teste reprovar; também pega `bg-red-50`, `text-white` e afins nos 16 componentes da tarefa);
2. token sem valor (apelido com alvo ausente ou em ciclo) e `var(--color-…)` do `globals.css` sem token;
3. par texto/fundo ou borda, trilho e anel de foco que o componente **de fato usa** abaixo do mínimo, com a cor tirada
   do HTML renderizado ou do CSS: as 10 cores de selo em uso, os 4 alertas (texto e link), as 6 variantes do `Botao`
   (texto, contorno contra onde ficam, hover e `aria-disabled`), campo e campo com erro, dica e mensagem de erro,
   cabeçalho e corpo da `Tabela`, `Interruptor` ligado e desligado, `GrupoOpcoes` cartão (borda, marcado, rótulo, dica e
   rádio), `CaixaSelecao`, `BlocoJson`, `Paginacao`, texto da página, `h1`, link e o anel de foco no claro e no
   marinho;
4. contorno de foco abaixo de 2 px e a saída do bloco de `prefers-reduced-motion`.

Pares que o código usa e que não estavam na lista da 03, 2.2, agora conferidos e aprovados: link (`acao-escura`) sobre
`atencao-fundo`, `erro-fundo` e `positivo-fundo`; `erro` sobre `superficie` e `nevoa`; `acao` (contorno do primário)
sobre `superficie`. Cada regra tem caso plantado que reprova (nome errado, paleta, ciclo de apelido, par vetado
`linha` sobre `branco`, cor ambígua). Os testes leem arquivos e HTML estático: não dependem de ordem, de relógio nem de
banco.

### Conferência dos testes que já existiam (`git diff 88e0e7e d452a76`)

Nenhum `.skip`, `.only` ou `.todo`; nenhum teste apagado. As mudanças em `painel-qa`, `rotulos.test`, `componentes.test`
e `fila-qa:370` são as do G5; as de `fila.test.ts` (126, 127, 192, 198) e `detalhe-qa.test.ts` (113, 117) trocam só o
seletor de classe do componente que mudou, com a mesma asserção e a mesma contagem. O teste do `Selo` em
`componentes.test` trocou o texto "Pronta para decisão" por "Em análise" junto com a cor `violeta`, coerente com o
D-03 (`em_analise` é violeta); a asserção (classe de texto, de fundo, texto presente, sem tracejado, tracejado no
rascunho) ficou inteira. `piso-de-assercoes.test.ts` passa.

### Resultado

- `pnpm test`: **212 arquivos, 4753 de 4753** (eram 211 e 4707; +1 arquivo, +46 testes)
- `pnpm lint`: limpo
- `pnpm typecheck`: limpo
- `pnpm test:e2e`: **154 de 154** (6,2 min, 1 worker)
- G4 (CV-01): vazio

## Decisões tomadas

- Teste novo em `src/components/` e não em `test/estatico/`: ele renderiza os componentes, como o `componentes.test.ts`.
- Varredura de classe restrita aos 16 componentes que a T03 tocou: as telas ainda usam a paleta do Tailwind até a
  T14–T16, e a T16 já prevê o teste estático que reprova classe antiga e paleta em todo o `src/`.
- Os apelidos D-01 (`text-texto-suave`, `text-perigo`) contam como token válido enquanto existirem no `@theme`; a T16
  os apaga e este teste continua valendo com os nomes novos.
- A fórmula de contraste foi repetida no arquivo novo em vez de importada de `contraste-tokens.test.ts`: importar um
  arquivo de teste rodaria os testes dele duas vezes.
- O contorno do botão é conferido contra onde ele fica (tela e cartão; marinho para as variantes "sobre escuro"),
  pela 03, 2.2, que já lista `acao` sobre `branco` como par não textual.

## Pendências

- Não bloqueia: os três Minor da `06-T03-revisao` seguem com a T13 (cartão indisponível), a T16 (nomes antigos) e a
  T05/T12 (`aria-disabled` fora do primário). O `tokens-em-uso.test.ts` já confere o contraste do `aria-disabled` nas
  seis variantes; a aparência dele sobre o marinho continua para a conferência em tela.
- Para a T16: incluir no teste de fim dos nomes antigos a lista `COMPONENTES_BASE` deste arquivo, ou trocar a
  varredura dele para todo o `src/`, quando a paleta do Tailwind tiver saído das telas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo ada39d8; código da T03 em d452a76
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 88e0e7e ada39d8` — 26 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d452a76~1 d452a76 -- src/app/globals.css src/components/rotulos.ts src/components/Selo.tsx src/components/Botao.tsx src/components/Alerta.tsx src/components/CampoTexto.tsx src/components/GrupoOpcoes.tsx src/components/Cartao.tsx` — lido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d452a76~1 d452a76 -- test "src/app/(painel)" src/components/rotulos.test.ts` — lido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d452a76~1 d452a76 -- src/components/componentes.test.ts src/components/Tabela.tsx src/components/Interruptor.tsx src/components/Paginacao.tsx src/components/CaixaSelecao.tsx src/components/DialogoConfirmacao.tsx src/components/Esqueleto.tsx src/components/BlocoJson.tsx` — lido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/tokens-em-uso.test.ts` — 44 de 45 (a checagem de varredura esperava classe própria no `Selecao`, que herda de `classeDoCampo`; ajustei o teste)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/tokens-em-uso.test.ts` — 45 de 45
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/tokens-em-uso.test.ts` — 46 de 46
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 212 arquivos, 4753 de 4753
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 154 de 154 (6,2 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 88e0e7e d452a76 -- "*.test.ts" e2e` — sem `.skip`, `.only` ou `.todo`; só as trocas de seletor descritas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só `src/components/tokens-em-uso.test.ts` e esta entrega, novos

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
