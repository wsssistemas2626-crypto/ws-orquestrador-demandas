---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T16-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T15 a T18), 03-ux-ui-design.md (seções 0 a 5.3, 9, 10, 11, Decisões e Pendências), 06-T07-tech-lead.md, 06-T07-qa-automacao.md, 06-T15-engenheiro-backend.md, 06-T15-tech-lead.md, 06-T15-qa-automacao.md, 06-T07-engenheiro-dados-bd.md (cabeçalho), src/app/(painel)/demandas/fila.tsx, FiltrosFila.tsx, ContadoresDaFila.tsx, CartoesDaFila.tsx, page.tsx, leituras-da-fila.ts, leituras-da-fila.test.ts, fila-a1.test.ts, fila-a1-qa.test.ts (linhas 1 a 60), fila-qa.test.ts (linhas 505 a 529), src/components/rotulos.ts, src/components/dados-da-fila.ts, src/components/Selecao.tsx, src/modules/demandas/schemas.ts, src/modules/demandas/resumo-da-fila.ts, test/estatico/leituras-da-fila.test.ts, e2e/apoio.ts, e2e/fila-contadores.spec.ts, e2e/fila-qa.spec.ts (linhas 1 a 38 e 105 a 128), playwright.config.ts, tsconfig.json, a saída do pnpm test e do pnpm test:e2e]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T16: a fila mostra a origem da demanda na linha e no cartão e ganha o filtro "Origem" (RF-10 na tela, CA-04.7, CA-10.1 a
CA-10.3, CA-10.7, IN-16 com o CV-07 em `origem`; 03, seção 4). Não há componente, token nem cor nova: o filtro é a
`Selecao` de Tipo e Linha, a linha nova da tabela é o texto de apoio de 13 px em `tinta-media` (o mesmo da data sob a
Idade), e o item do cartão usa a etiqueta de hoje (`CLASSE_DA_ETIQUETA`).

### Conferência antes do código

A T16 do plano toca `fila.tsx`, `FiltrosFila.tsx`, `ContadoresDaFila.tsx`, `CartoesDaFila.tsx`, `page.tsx`,
`leituras-da-fila.ts`, `src/components/rotulos.ts` e cria `fila-origem.test.ts` e `e2e/fila-origem.spec.ts`. As
pendências que citam a T16 pedem também `e2e/fila-contadores.spec.ts`. Tudo fica em `src/` e `e2e/`, dentro da minha lista
Pode, e não houve motivo para devolver ao plano.

### Pendências das entregas 06-T01 a 06-T15 que citam a T16

Achei as entregas com `git log -S "T16"` na pasta do pedido: 05-tech-lead, 06-T07 (dados-bd, tech-lead e qa-automacao)
e 06-T15 (backend, tech-lead e qa-automacao).

| De onde | O que diz | Como ficou |
|---|---|---|
| 06-T07-tech-lead (ponto principal) e 06-T07-qa-automacao | `/demandas?origem=awave` já filtra a lista, mas o resto da tela não conhece a origem: os contadores (`leituras-da-fila.ts:14` passa só tipo e linha), `temFiltro`, `legendaDaFila` e `hrefDaFila`, que perde a origem ao paginar. Os quatro pontos, com teste | **Feito.** `contagemOuNada` passa a origem; `temFiltro`, `legendaDaFila` e `hrefDaFila` a conhecem; a paginação a mantém. Cada ponto tem teste em `fila-origem.test.ts` (inclusive o href "Próxima" com `origem=awave&offset=20`) e, no navegador, em `fila-origem.spec.ts` |
| 06-T15-tech-lead, Minor 1 | o comentário "23 no banco novo" de `e2e/fila-contadores.spec.ts:4` | **Feito:** "28 no banco novo, desde a T15" |
| 06-T15-tech-lead | o CA-07.1 (`fila-contadores.spec.ts:170`) confere a lista `dt` do cartão; muda quando a T16 puser "Origem" | **Feito**, trecho a trecho em "Testes existentes que mudaram" |
| 06-T15-qa-automacao | o título que o Awave lê volta com "[nome removido]" | Não é da T16 (vista da API do Awave). A fila do painel mostra o título original para pessoa; segue com a 07 ou a 08 |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `src/components/rotulos.ts` | `ROTULO_ORIGEM` (`pessoa` "Pessoa", `agente` "Agente de IA", `awave` "Awave"), com o tipo `OrigemDaDemanda` importado só como tipo |
| `src/app/(painel)/demandas/fila.tsx` | `TEXTOS_FILA.origem(o)` ("Origem: <rótulo>"); `temFiltro` e `legendaDaFila` com a origem (por último); `hrefDaFila` com a origem depois da linha; `filtroDosContadores` (tipo, linha e origem, campo a campo) e `chaveDosContadores` (a chave do Suspense com a origem); a célula Título com a segunda linha "Origem: …" |
| `src/app/(painel)/demandas/FiltrosFila.tsx` | `Selecao` `id="filtro-origem"` `name="origem"`, rótulo "Origem", opções "Todas", "Pessoa", "Agente de IA", "Awave", entre Tipo e Linha; `CAMPOS` com `origem` depois da linha (ordem do `hrefDaFila`); "Mais filtros" soma tipo, linha e origem |
| `src/app/(painel)/demandas/ContadoresDaFila.tsx` | a origem vai oculta depois de tipo e linha, só com o valor do filtro já validado |
| `src/app/(painel)/demandas/CartoesDaFila.tsx` | `ROTULOS_DO_CARTAO.origem` ("Origem") e o item `col-span-2` depois de Urgência e antes de Linha de serviço |
| `src/app/(painel)/demandas/leituras-da-fila.ts` | `contagemOuNada` passa `origem` a `contarDemandasPorStatus` (o mesmo `condicaoDaOrigem` da página, T07) |
| `src/app/(painel)/demandas/page.tsx` | os contadores e o esqueleto deles recebem `filtroDosContadores(filtro)`; a chave do Suspense é `chaveDosContadores(filtro)`. A guarda (`exigirPessoaNaPagina` e `autorizar`) não mudou de lugar |

### Testes criados

- `src/app/(painel)/demandas/fila-origem.test.ts` (19 testes): os do plano (rótulos, legenda, endereço, `temFiltro` e
  o CV-07 de `lerFiltroDaFila`), mais:
  - a paginação com a origem (função e link "Próxima" renderizado);
  - o vazio com filtro de origem;
  - o seletor no HTML: id, name, rótulo, posição entre Tipo e Linha, as quatro opções e o valor vindo da URL;
  - "Mais filtros" com 1, 2 e 3 ativos (o status não conta);
  - o href de cada contador com a origem;
  - o campo oculto na ordem tipo, linha, origem, e nada oculto com origem inválida;
  - `filtroDosContadores` e `chaveDosContadores`;
  - `contagemOuNada` chamando a contagem com a origem;
  - a linha da tabela com "Origem: …" depois do título e do selo;
  - a ordem dos `dt` do cartão, com Origem em `col-span-2`;
  - CA-04.7: o selo de rascunho fica, e a fila não mostra "Aguardando confirmação".
- `e2e/fila-origem.spec.ts` (5 testes, conta "cto"; não cria demanda nem versão):
  - o filtro Origem = Awave pela tela. Mudar a seleção não aplica nada; depois de Filtrar, o endereço é `?origem=awave`,
    o h2 com a legenda recebe o foco, o aviso dá o total da API, aparecem as linhas "Origem: Awave" e nenhuma de outra
    origem, e "Todas" conta só a origem. O axe roda em 1280 × 720 e em 390 × 844 (CA-10.7);
  - IN-16, com `?origem=%3Cscript%3E` e `?origem=construir`. A tela mostra o alerta de filtro inválido, deixa o seletor em
    "Todas", não põe a origem oculta e não reflete o valor em `href`, `value` nem no HTML do `main`;
  - CA-10.1 e CA-10.2 para as três origens. A lista e o aviso batem com o total da API, e toda linha termina em
    "Origem: <rótulo>". Origem sem demanda cai no estado vazio com filtro;
  - CA-10.3 e F2. Com origem Awave, o contador "Nova" leva a `?status=nova&origem=awave`, com o foco, a legenda e o total
    certos; "Limpar filtros" tira a origem;
  - celular (390 × 844). Origem escolhida em "Mais filtros" e Filtrar dão "Mais filtros (1 ativo)". Os cartões ficam
    com Tipo, Urgência, Origem, Linha de serviço, Etapas e Idade, e "Awave" no item. O seletor tem 44 px de altura, e o
    axe passa com "Mais filtros" aberto.

### Teste antes do código

`pnpm --dir … test "src/app/(painel)/demandas/fila-origem.test.ts"`, antes de qualquer mudança no código:
```
 ❯ src/app/(painel)/demandas/fila-origem.test.ts (19 tests | 18 failed) 57ms
     × rótulos
     × legenda: "origem <rótulo>" por último
     × endereço: origem depois da linha de serviço
     …
AssertionError: expected undefined to deeply equal { pessoa: 'Pessoa', …(2) }
Expected: "/demandas?status=nova&tipo=bug&linhaServicoProvavel=sob_medida&origem=awave"
Received: "/demandas?status=nova&tipo=bug&linhaServicoProvavel=sob_medida"
```
O teste que passou de primeira é guarda: "a fila não mostra Aguardando confirmação" (03, Decisões), que precisa ficar
verdadeiro depois da T16.

O e2e foi visto falhando contra um build com o seletor e a linha "Origem:" desligados de propósito, e o código foi
restaurado logo depois (`git diff` conferido): `pnpm --dir … test:e2e e2e/fila-origem.spec.ts` deu **5 de 5 falharam**,
por `waiting for getByLabel('Origem', { exact: true })` e por `pessoa: Pedido já recebido pelo /construir (fictício)`
(linha sem "Origem: Pessoa").

### Testes existentes que mudaram (fora da G5, trecho a trecho)

A G5 não lista estes arquivos, e nenhum está no piso do D-17. Nenhuma asserção saiu, e duas entraram. Mudaram só os
números ou as listas que a 03, 4.1 itens 1 e 7, faz crescer:

| Arquivo e linha | Antes | Depois | Por quê |
|---|---|---|---|
| `src/app/(painel)/demandas/fila-qa.test.ts:517` | `selected=""` 2 vezes | 3 vezes | a terceira seleção, Origem, também em "Todas" |
| `src/app/(painel)/demandas/fila-qa.test.ts:528` | `name="` 3 vezes | 4 vezes | status oculto, tipo, origem e linha; continua sem `limit` nem `offset` |
| `src/app/(painel)/demandas/fila-a1.test.ts:248` | `dt` Tipo, Urgência, Linha de serviço, Etapas, Idade | com "Origem" depois de Urgência | 03, 4.1 item 7 |
| `e2e/fila-contadores.spec.ts:4` | "23 no banco novo" | "28 no banco novo, desde a T15" | Minor 1 da 06-T15-tech-lead; só comentário |
| `e2e/fila-contadores.spec.ts:171-174` (CA-07.1) | `dt` sem Origem; `dd` 5; etapas no `dd` 3 | `dt` com Origem; `dd` 6; etapas no `dd` 4; **asserção nova**: o `dd` 2 é `ROTULO_ORIGEM[d.origem]` da API | pendência da 06-T15-tech-lead; o tipo `Lista` ganhou `origem` |
| `e2e/fila-qa.spec.ts:120` (sem script) | URL `?status=&tipo=bug&linhaServicoProvavel=` | `?status=&tipo=bug&origem=&linhaServicoProvavel=`, e **asserção nova**: Origem em "Todas" | sem script, o GET comum segue a ordem do DOM, e a 03 põe Origem entre Tipo e Linha (4.1 item 1, e a ordem do Tab na seção 10). O teste continua provando o que diz: "Todos" vai vazio e não vira filtro inválido, agora também para a origem. Com script, o endereço sai na ordem do `hrefDaFila` (status, tipo, linha, origem), como a 03, 4.1 item 2 pede |

### Resultado

- `pnpm test "src/app/(painel)/demandas"`: 20 de 20 arquivos, 424 de 424 testes.
- `pnpm test` (suíte inteira): **283 de 283 arquivos, 6259 de 6259 testes, 0 falharam**. Antes eram 282 e 6239; a
  diferença é este arquivo (19 testes) e uma guarda que varre `docs/`.
- `pnpm test:e2e` (local, build de produção, porta 3101): **263 testes, 254 passaram, 9 pulados (capturas), saída 0**,
  em 10,2 min. O `✘` de `e2e/vigia.spec.ts:5` é o controle negativo esperado e conta entre os que passaram. Os 5 de
  `fila-origem.spec.ts` levaram de 1,1 a 3,5 s cada, longe dos 24 s; `retries` e tempo-limite não mudaram.
- A primeira rodada do e2e completo teve 1 falha, a do GET sem script, que a tabela acima explica. Ela passou na rodada
  final.
- O axe não acusou violação na T03 com origem Awave em 1280 × 720 e 390 × 844, nem com "Mais filtros" aberto em 390 px.
  `axe-todas.spec.ts`, `fila.spec.ts`, `fila-contadores.spec.ts` e `alvo-de-toque.spec.ts` (44 × 44 px na T03 com
  "Mais filtros" aberto, agora com o seletor novo) também passaram.
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4: o `git diff --stat a9fd9b8` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio.

### Desvios do plano

1. **Dois ajudantes exportados de `fila.tsx`, `filtroDosContadores` e `chaveDosContadores`.** O plano não os nomeia. Eles
   tiram de `page.tsx` a montagem do filtro dos contadores (repetida duas vezes) e a chave do Suspense, para as duas
   coisas terem teste unitário. A página é um Server Component que lê o banco e não tem teste de render.
2. **Testes e asserções além dos trechos do plano**, nas duas listas acima. Cobrem CA-10.1 a CA-10.3 no navegador e a
   origem inválida sem marcação (`construir`).
3. **`e2e/fila-qa.spec.ts` mudou**, e o plano não o lista. A razão está na tabela acima.

## Decisões tomadas

- A ordem do DOM fica Tipo, Origem, Linha (03, 4.1 item 1, e a ordem do Tab da seção 10). Não usei `order` de CSS para
  igualar o GET sem script ao `hrefDaFila`, porque a ordem visual ficaria diferente da ordem de foco (WCAG 1.3.2 e 2.4.3).
- `TEXTOS_FILA.origem` monta "Origem: <rótulo>" num nó de texto só. O leitor de tela lê a célula como "…, Rascunho de
  agente, Origem: Awave" (03, seção 10), e o teste acha o texto inteiro.
- O valor oculto e o do href saem só do filtro que passou pelo schema (`z.enum(ORIGENS_DA_DEMANDA)`). Com origem inválida,
  o filtro inteiro cai (regra da 0.1.13): nada oculto, nada no href (CV-07, IN-16).
- O teste de `contagemOuNada` com origem ficou no arquivo novo, e não em `leituras-da-fila.test.ts`. O teste antigo
  ("só tipo e linha de serviço") continua verde sem mudança: o `toHaveBeenCalledExactlyOnceWith` não distingue chave
  ausente de `undefined`. Mexer nele estaria fora da G5.

## Pendências

- Nenhuma bloqueia a T16.
- Para a `06-T16-revisao`: o título do `it` em `leituras-da-fila.test.ts:63` ("a leitura recebe só tipo e linha de
  serviço") ficou incompleto, porque agora a origem também entra. O título não foi mudado (G3.2). Numa volta futura, pode
  ganhar "e origem", sem mudar asserção.
- Para a `07-qa-funcional`: conferir à mão o foco, o anúncio "N demandas encontradas." e a leitura da célula Título com
  "Origem: …" no leitor de tela, e o zoom de 200 % e 400 % da T03 com o seletor novo (03, seção 10).
- Para a T20: o e2e precisa rodar verde três vezes (definição de pronto). Nesta passagem o e2e completo rodou duas vezes,
  e só a segunda passou inteira (a falha da primeira foi corrigida nesta etapa).
- Herdada, sem ação aqui: a vista do Awave devolve o título com "[nome removido]" (06-T15-qa-automacao), dono
  `engenheiro-backend` ou 08.
- As caixas `- [ ]` da T16 no plano não foram marcadas: a 06 não edita `docs/` (G1).
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e localizei arquivos por `git log -S`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -30` — HEAD em 1010243 (06-T15-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "T16" --name-only --format=%h -- docs/construcao/DEC-DEM-20261111-0016-v1` — 05-tech-lead, 06-T07 (três) e 06-T15 (três)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "contagemOuNada" --name-only --format=%h` — `leituras-da-fila.test.ts`, `fila-qa.test.ts` e o teste estático
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "'Urgência', 'Linha de serviço'" --name-only --format=%h -- src e2e test` — `fila-contadores.spec.ts`, `fila-a1.test.ts` e `fila.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "ROTULOS_DO_CARTAO" --name-only --format=%h -- src e2e test` — só `CartoesDaFila.tsx`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-origem.test.ts"` — antes do código: 18 de 19 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas"` — depois do código: 3 falhas nos testes existentes (fila-qa 517 e 527, fila-a1 247), pelas contagens e pela lista que a T16 faz crescer
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-origem.spec.ts` — com o seletor e a linha "Origem:" desligados de propósito: 5 de 5 falharam
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- "src/app/(painel)/demandas/fila.tsx" "src/app/(painel)/demandas/FiltrosFila.tsx"` — o código restaurado
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas"` — 20 de 20 arquivos, 424 de 424
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 283 de 283 arquivos, 6259 de 6259 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts "drizzle/000[0-6]_*.sql" "drizzle/meta/000[0-6]_snapshot.json"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os arquivos da tarefa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano: 263 testes, 253 passaram, 1 falhou (`fila-qa.spec.ts:115`, GET sem script com `origem=`), 9 pulados
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano, depois da correção do `fila-qa.spec.ts`: 263 testes, 254 passaram, 9 pulados, saída 0
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 11 alterados e 2 novos, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 11 arquivos, 102 inserções e 47 remoções

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega; o e2e foi visto falhando com a função desligada)
- [x] `pnpm test` passa (283 de 283 arquivos, 6259 de 6259 testes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (só títulos "(fictício)" e as contas fictícias do seed; nenhum token)
- [x] só mudaram os arquivos da tarefa (os sete do plano, os dois novos e os quatro testes existentes explicados trecho a trecho)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR ("Origem", "Todas", "Pessoa", "Agente de IA", "Awave", "Origem: <rótulo>", "origem <rótulo>" na legenda), e o axe não acusa violação nas telas tocadas (T03 em 1280 × 720 e 390 × 844, com e sem "Mais filtros" aberto)
