---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T04-construcao
agente: engenheiro-backend
leu: [pedido.json, tarefas.json, padrao-tecnico.md, contrato-passagem.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G9 e T04, T05), 04-seguranca-aplicacao.md (SB-07, SB-08, SB-09), 06-T03-engenheiro-dados-bd.md, 06-T03-qa-automacao.md, 06-T03-tech-lead.md (trecho), src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/criar.test.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/pacotes-decisao/concorrencia.test.ts, src/modules/pedido-construcao/montar.ts, src/modules/pedido-construcao/conteudo.ts, src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/gerar.test.ts (linhas 685 a 1027), src/modules/especificacoes/consultas.ts, src/modules/pareceres-risco/consultas.ts (trechos), src/modules/dados-pessoais/minimizar.ts (linhas 230 a 279), src/modules/demandas/servico.ts (alterarDemanda), src/modules/acesso/matriz.ts, src/app/api/pacotes-decisao/[decId]/route.ts, src/app/api/pacotes-decisao/route.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/demandas/nomes-antes-de-gravar.test.ts, test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts, test/estatico/situacao.test.ts, test/estatico/importacoes.ts, test/estatico/pacote-sem-extras.test.ts, test/estatico/classes-de-erro.test.ts, test/estatico/piso-de-assercoes.test.ts (trecho), test/pedidos-construcao.ts, test/requisicao.ts, test/sessao.ts (trecho), test/deps.ts, test/banco.ts, saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T04 (S-03, ADR-37; SB-07 a, b, c, e; SB-08 c, f; SB-09 a, b; D-04). Todo DEC criado a partir de agora grava
`caminhos_com_nome_na_criacao`. A coluna guarda os caminhos de `textosDaCriacao` cujo texto continha o nome do
solicitante em vigor na criação. O nome vem da linha devolvida por `travarDemanda`, na mesma transação. A gravação vale
pelos três caminhos: rota de pessoa, rota do agente `consolidacao` e worker com `extras`. A coluna nunca fica nula num DEC
novo: sem nome em nenhum texto, ela recebe `[]`. A leitura no D1 (`conferir.ts`) é da T05. Aqui só nascem e são testadas
as funções que ela vai usar (`lerCaminhosDaCriacao`, `caminhosDaCriacaoNoPedido`).

**Arquivos criados**
- `src/modules/pedido-construcao/caminhos-da-criacao.ts`: `RE_CAMINHO_DA_CRIACAO` (âncoras, sem flag),
  `MAXIMO_DE_CAMINHOS` (8 + 2 × `LIMITE_ITENS` = 108), `MENSAGEM_CAMINHOS_INVALIDOS`, `caminhosComNomeNaCriacao`,
  `lerCaminhosDaCriacao` (Zod com `safeParse`; fora do formato lança `Error` com mensagem fixa, sem `issues` e sem o
  valor; `null` volta `null`) e `caminhosDaCriacaoNoPedido`. A forma é a da G7.
- `src/modules/pedido-construcao/textos-da-criacao.test.ts`: 12 testes, 33 linhas `expect(`, unitários.
- `src/modules/pacotes-decisao/marcacao-da-criacao.test.ts`: 13 testes, 18 linhas `expect(`, Postgres real, rotas e
  tokens reais.
- `test/transversal/visibilidade-caminhos-da-criacao.test.ts`: 4 testes, 13 linhas `expect(`.
- `test/estatico/caminhos-da-criacao.test.ts`: 8 testes, 28 linhas `expect(`.

**Arquivos alterados**
- `src/modules/pedido-construcao/conteudo.ts` (D-04): recebe `PARTES_DA_DESCRICAO`, `SEPARADOR_DA_DESCRICAO`
  (exportado), `RE_ROTULO_DA_DESCRICAO` e `descricaoSemRotulos`, com o corpo de antes e o comentário de origem.
- `src/modules/pedido-construcao/montar.ts`: importa `descricaoSemRotulos` de `./conteudo` e não mais de `criar.ts`.
  Ganha a função interna `textosEscritos`, de onde saem `textosDoPedido` (mesma saída de antes) e `textosDaCriacao`
  (as duas opções no lugar de `decisao.opcaoEscolhida`). Ganha também `DadosDaCriacao` e `CAMINHO_DA_OPCAO` (congelado).
- `src/modules/pacotes-decisao/criar.ts`: reexporta `descricaoSemRotulos` e `PARTES_DA_DESCRICAO` (os testes que
  importam de `criar.ts` não mudam). Dentro de `corpo`, depois da conferência do que falta e antes de `proximaVersao`,
  calcula `opcaoA`, `opcaoB`, `demandaDescricao`, `textos` e `nomes`:
  - `textos` sai de `textosDaCriacao`, sobre a ESP e o RSK citados (`obterEspecificacao` e `obterParecerRisco` pela PK,
    sob a trava);
  - `nomes` sai de `nomesDoSolicitante(d.solicitanteNome)`, numa chamada só, a mesma usada no `return` para o 201.

  O insert passa a usar `const linha: typeof pacoteDecisao.$inferInsert & { caminhosComNomeNaCriacao: string[] }`, com
  `caminhosComNomeNaCriacao: caminhosComNomeNaCriacao(textos, nomes)`. Nada mais muda: evento, status e aviso seguem
  iguais.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo, os quatro arquivos novos (33, 18, 13, 28).

**Não mudou**: `src/modules/pacotes-decisao/consultas.ts`, `schemas.ts` e `src/modules/pedido-construcao/conferir.ts`,
como manda o plano. O comando da G4 saiu **vazio**.

**Testes e o que cobrem**
- `textos-da-criacao.test.ts`, SB-08 (c), por **igualdade**. Para A e para B, e para cinco ESP (cheia, sem
  sistema/repositório, listas vazias, listas nulas, 50 + 50 itens), os textos da criação traduzidos são iguais a
  `textosDoPedido` do mesmo DEC aprovado: mesmos caminhos, mesma ordem, mesmos valores. O conjunto de caminhos de
  `caminhosDaCriacaoNoPedido` também é igual ao do pedido. Além disso:
  - a ordem dos caminhos da criação está fixada no teste;
  - todo caminho casa a regex, e o total é exatamente `MAXIMO_DE_CAMINHOS`;
  - `caminhosComNomeNaCriacao` devolve só caminhos, sem valor nem nome;
  - SB-08 (e): `lerCaminhosDaCriacao` lança a mensagem fixa e não traz `issues` para cada valor fora do formato:
    `__proto__`, `'demanda.titulo '`, `x`, índice de 5 dígitos, `decisao.opcaoEscolhida`, texto solto, número,
    `undefined` e 109 itens;
  - SB-08 (f): a regex não tem flag, tem âncoras e dá o mesmo resultado em duas chamadas seguidas.
- `marcacao-da-criacao.test.ts`:
  - SB-07 (b): pelos três caminhos, a ESP com "Lima" (solicitante "Joana Ficticia Lima") grava
    `['especificacao.conteudo']`, e sem o nome grava `[]`. Nenhum DEC fica com `null`.
  - SB-07 (c): cada item casa a lista de permissão e nenhum contém "Joana", "Ficticia", "Lima" nem o texto.
  - SB-07 (a): pela rota de pessoa e pela do agente, a chave no corpo (`[]` e `null`, em camelCase e snake_case) leva a
    **201**, porque `z.object` descarta a chave (C-11), e a coluna fica com o valor calculado. Uma chave com caminho
    inventado também não chega ao banco.
  - SB-07 (e), duas conexões, com a espera da trava vista em `pg_stat_activity`. Caso (i): a troca do nome segura a
    trava, e a marcação fica com o nome novo (`[]`). Caso (ii): a criação segura a trava, e a marcação fica com o nome
    antigo (`['especificacao.conteudo']`); a demanda termina com o nome novo.
  - O 201 de pessoa e o do agente têm as 25 chaves de `41108ee` e nada com `caminhos`. O `depois` de
    `pacote_decisao_criado` tem só as 5 chaves de hoje (C-30).
- `visibilidade-caminhos-da-criacao.test.ts`, SB-09 (a, b). O DEC do cenário nasce pela rota de pessoa e grava três
  caminhos; isso é conferido no banco. A varredura parte da `MATRIZ` (`ler_pacote_decisao`, `ler_demanda`,
  `listar_demandas`) e das rotas do disco, e chama cada rota com a pessoa e com cada agente da linha. Toda resposta é
  200, sem `caminhos` e sem os caminhos gravados. As chaves de cada DEC em `GET /api/pacotes-decisao/:decId`, na
  listagem e nos DEC da demanda são as 25 de `41108ee`, pela pessoa e pelos quatro agentes (no mínimo 15 DEC
  conferidos). A entrada de `montarEntrada` dos quatro agentes também não tem a coluna. Tem o próprio controle do
  detector.
- `test/estatico/caminhos-da-criacao.test.ts`, SB-07, no código que roda (`src` e `scripts`):
  - o insert em `pacote_decisao` (pelo Drizzle ou por SQL) só existe em `criar.ts`;
  - a chave (camelCase ou snake_case) só aparece em `src/db/schema/decisao.ts`, `criar.ts`, `conferir.ts` e
    `caminhos-da-criacao.ts`, e nunca num `schemas.ts`, numa `route.ts`, num arquivo `'use server'`, em `jobs/` ou em
    `worker/`;
  - `criar.ts` tem a linha tipada com a coluna obrigatória, o valor calculado, um insert só, `nomesDoSolicitante`
    chamado uma vez sobre `d.solicitanteNome` (de `travarDemanda`) e `textosDaCriacao`;
  - há casos plantados que reprovam cada regra.

**Teste antes do código (visto falhando)**: rodei os quatro arquivos novos antes do código, com o comando
`pnpm --dir <repo> test src/modules/pedido-construcao/textos-da-criacao.test.ts src/modules/pacotes-decisao/marcacao-da-criacao.test.ts test/estatico/caminhos-da-criacao.test.ts test/transversal/visibilidade-caminhos-da-criacao.test.ts --reporter=dot`:

```
 FAIL  src/modules/pacotes-decisao/marcacao-da-criacao.test.ts
Error: Cannot find module '../pedido-construcao/caminhos-da-criacao' imported from …/marcacao-da-criacao.test.ts
 FAIL  src/modules/pedido-construcao/textos-da-criacao.test.ts
Error: Cannot find module './caminhos-da-criacao' imported from …/textos-da-criacao.test.ts
 FAIL  test/estatico/caminhos-da-criacao.test.ts > … > a chave da coluna só aparece no esquema, em criar.ts, em conferir.ts e em caminhos-da-criacao.ts
AssertionError: expected [ 'src/db/schema/decisao.ts' ] to deeply equal ArrayContaining{…}
 FAIL  test/estatico/caminhos-da-criacao.test.ts > … > o insert usa uma linha tipada com a coluna obrigatória, …
 FAIL  test/estatico/caminhos-da-criacao.test.ts > … > o nome vem só da linha devolvida por travarDemanda, numa chamada só
 FAIL  test/transversal/visibilidade-caminhos-da-criacao.test.ts > … > controle: a criação gravou a coluna do DEC do cenário (não nula, com os três caminhos)
AssertionError: expected [ { c: null } ] to deeply equal [ { c: [ …(3) ] } ]
 Test Files  4 failed (4)
      Tests  4 failed | 8 passed (12)
```

Exceção declarada da G3.1: dois testes de varredura do arquivo de visibilidade e a parte de casos plantados do estático
já passaram antes do código. Os de visibilidade passam porque as vistas já são montadas campo a campo. Os testes que
exigem o código novo falharam: o módulo, a coluna nula, o `criar.ts` sem a marcação e o controle do cenário.

**Depois do código**: os mesmos quatro arquivos, `Test Files 4 passed (4)`, `Tests 39 passed (39)`.

**Suíte, lint e tipos**:
- `pnpm test` inteiro: **366 de 366 arquivos e 7965 de 7965 testes, 0 falhas** (209 s). Os testes do D1 da 0.4.0
  (`gerar*.test.ts`, `pedido*.test.ts`, `acoes-pedido.test.ts`), o `criar.test.ts` e o `nomes-antes-de-gravar.test.ts`
  (que exige uma chamada de `nomesDoSolicitante`) passam sem mudança.
- `pnpm lint` e `pnpm typecheck`: limpos, inclusive depois do último ajuste de forma no teste unitário.

**Desvios do plano**
- `RE_ROTULO_DA_DESCRICAO` foi para `conteudo.ts` **sem exportar**. Ela tem a flag `g`; exportada, um `.test` de fora
  guardaria `lastIndex`. Hoje só o `replace` de `descricaoSemRotulos` a usa. `SEPARADOR_DA_DESCRICAO` é exportado
  porque `descricaoDaDemanda` (em `criar.ts`) o usa.
- `CAMINHO_DA_OPCAO` tem o tipo explícito da G7 (`Readonly<Record<OpcaoDecisao, …>>`) e `Object.freeze`, em vez de
  `as const` só.
- No teste unitário, o nome do caso de `caminhosComNomeNaCriacao` é "Joaquina", e não o "Ficticia" do plano: nenhum
  outro texto do teste chega perto dele. Entraram casos a mais: ESP 50 + 50 na igualdade, `undefined` e
  `decisao.opcaoEscolhida` entre os valores recusados, a ordem dos caminhos fixada e um caso de parte do nome em item de
  lista.
- O caso 3 do plano (SB-07 a) manda também a chave em snake_case e um caso com caminho inventado. A resposta de hoje
  para chave desconhecida é **201 com a chave descartada** (`z.object`, C-11), e está fixada no teste.
- O teste estático varre também `.mjs` e `.js` de `src` e `scripts`, para pegar SQL de insert em `src/vendor`.

## Decisões tomadas

- A marcação é calculada sobre a ESP e o RSK lidos de novo por `obterEspecificacao` e `obterParecerRisco`, e não sobre
  as linhas parciais de `citada` e `maisNova`. Assim os valores passam pelas mesmas funções (`valoresDaEspecificacao`,
  `valoresDoParecer`) que o D1 usa na geração, e a igualdade do SB-08 (c) vale para os dados reais.
- `nomes` é calculado uma vez, antes do insert, e reaproveitado no `return` (o B-3 do 0010 exige uma chamada só). Se
  essa conta falhar, nada é gravado, como antes.
- O teste de concorrência (SB-07 e) dá o mesmo resultado mesmo se a espera da trava não for observada: a ordem das duas
  transações é garantida pela trava da demanda. A espera em `pg_stat_activity` só reforça a prova. O laço tem limite
  de 500 voltas e não usa `Date.now()`.
- O teste de visibilidade da T04 não substitui o `-qa` da 06-T03. O desta tarefa confere as chaves de 41108ee e usa a
  coluna gravada pela criação; o da qa-automacao usa uma sentinela posta pelo migrator.

## Pendências

- Nenhuma que impeça a próxima etapa. A T05 lê a coluna em `conferir.ts` com `lerCaminhosDaCriacao` e
  `caminhosDaCriacaoNoPedido`, que já estão aqui e já têm teste.
- Para a revisão: a criação do DEC passou a fazer as leituras de `obterEspecificacao` (2 consultas) e
  `obterParecerRisco` (3 consultas) dentro da transação. Nenhum teste de prazo nem de limite reclamou.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 19 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### Tarefa T" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T04" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T04 na linha 788
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-07\|SB-08\|SB-09" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — linhas 205 a 207
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "descricaoSemRotulos\|PARTES_DA_DESCRICAO\|SEPARADOR_DA_DESCRICAO\|descricaoDaDemanda" -- src test scripts e2e` — usos em criar, montar, criar.test e gerar.test
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export function temNome\|export const LIMITE_ITENS\|export async function obterEspecificacao\|export async function obterParecerRisco\|export const OPCOES_DECISAO\|export type OpcaoDecisao\|export function nomesDoSolicitante" -- src` — localizações
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^import" -- src/modules/dados-pessoais/minimizar.ts src/modules/demandas/schemas.ts` — sem ciclo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A8 "export function nomesDoSolicitante" -- src/modules/demandas/consultas.ts` — sem resultado (é const)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "nomesDoSolicitante" -- src/modules/demandas/consultas.ts` — linha 293
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/app/api/demandas src/app/api/pacotes-decisao test src/modules/pacotes-decisao src/modules/pedido-construcao` — lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "ler_pacote_decisao\|criar_pacote_decisao\|ler_demanda\|listar_demandas" -- src/modules/acesso/matriz.ts` — linhas da matriz
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "LIMITE_ITENS\|criteriosAceitePreliminares\|definicaoDePronto" -- src/modules/especificacoes/schemas.ts src/modules/demandas/schemas.ts` — listas com no máximo 50
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "criarPacoteDecisao\b\|criarPacoteDecisaoComNomes\|insert(pacoteDecisao)" -- src scripts` — chamadores
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "insert(pacoteDecisao)\|insert into pacote_decisao" -- src scripts` — fora de teste, só criar.ts
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "wait_event_type" -- src test` — molde da espera de trava
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function alterarDemanda\|export async function criarDemanda\|export type DepsComFila\|export function autoriaDo" -- src/modules/demandas/servico.ts` — assinaturas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export type Responsavel \|export type Responsavel=\|export type Opcao \|export type StatusDecisao" -- src` — tipos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "textosDoPedido\|PacoteDecisaoVista = {\|: PacoteDecisaoVista =" -- src test` — fixtures de vista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "const espVista\|const rskVista\|const decVista\|function espVista\|function rskVista\|function decVista" -- src/modules/pedido-construcao/gerar.test.ts` — linhas 691 a 742
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- test/requisicao.ts test/sessao.ts test/deps.ts test/banco.ts test/sentinelas.ts test/provedor-falso.ts` — exportações dos ajudantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const alterarDemandaSchema\|solicitanteNome" -- src/modules/demandas/schemas.ts` — schema de alteração
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "glob\|filter\|Date.now" -- test/estatico/relogio.test.ts` — guarda só em src fora de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "0018\|0.4.1\|T0[1-3]\|caminhos" -- test/estatico/piso-de-assercoes.test.ts` — entradas do pedido no PISO
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/textos-da-criacao.test.ts src/modules/pacotes-decisao/marcacao-da-criacao.test.ts test/estatico/caminhos-da-criacao.test.ts test/transversal/visibilidade-caminhos-da-criacao.test.ts --reporter=dot` — antes do código: 4 arquivos falharam, 4 testes falharam e 8 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/textos-da-criacao.test.ts src/modules/pacotes-decisao/marcacao-da-criacao.test.ts test/estatico/caminhos-da-criacao.test.ts test/transversal/visibilidade-caminhos-da-criacao.test.ts --reporter=dot` — depois do código: 39 de 39
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 4 falhas de propósito (piso 999), com as contagens reais 33, 18, 13 e 28
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "it(\|toBe(\|PISO" -- test/estatico/piso-de-assercoes-qa.test.ts` — independente do PISO
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 366 de 366 arquivos, 7965 de 7965 testes, 0 falhas (209 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts "drizzle/000[0-9]_*.sql" "drizzle/meta/000[0-9]_snapshot.json"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — criar.ts, conteudo.ts, montar.ts e piso-de-assercoes.test.ts
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/modules/pacotes-decisao/criar.ts` — diff lido
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (de novo, depois do último ajuste)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (de novo, depois do último ajuste)

A saída da suíte foi lida com a ferramenta Read em /tmp, sem comando Bash.

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (nenhuma entrada nova; a chave da coluna nunca entra num schema de entrada, e a leitura da coluna falha com mensagem fixa, sem o valor)
