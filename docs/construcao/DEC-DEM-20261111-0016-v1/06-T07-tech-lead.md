---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T07-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 05-tech-lead.md, passagens.jsonl, 06-T07-engenheiro-dados-bd.md, 06-T07-engenheiro-backend.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T07, e G5, G6, G7 e cobertura pelo diff 4306728..b925dfe), diff 59ddf37..69f871b de src/ (os 11 arquivos da T07), src/modules/demandas/entrada-qa.test.ts (linhas 1 a 185), src/modules/demandas/entrada.ts (linhas 1 a 80), src/modules/demandas/schemas.ts, src/modules/demandas/consultas.ts (linhas 1 a 20), drizzle/0007_greedy_wendigo.sql, src/app/(painel)/demandas/leituras-da-fila.ts, src/app/(painel)/demandas/page.tsx (linhas 1 a 60), src/app/(painel)/demandas/fila.tsx (linhas 1 a 90)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T07 inteira (origem da demanda no servidor: leitura, listagem, contagem e filtro; RF-10, CA-10.2 a CA-10.5,
C-17, IN-02, IN-16), nas duas passagens:

- `engenheiro-dados-bd` (7c8c206 e 4306728): `schemas.ts`, `consultas.ts`, `resumo-da-fila.ts`, `consultas.test.ts:118`
  e `origem.test.ts` (novo, 21 testes);
- `engenheiro-backend` (b5b347c e 69f871b), depois da volta do plano (D-22, D-23): os passos 3a, 3b e 4, só em testes.

`git diff --stat 59ddf37 69f871b` em `src/` mostra 11 arquivos, todos da lista da T07. Nenhum arquivo de produção de
`src/app/` mudou, e `vistas-para-agente.test.ts`, `test/`, `drizzle/`, `src/db/`, `src/lib/` e `src/modules/acesso/`
ficaram sem diff.

**Resultado: nenhum problema Critical ou Important. A T07 passa.** Os três pontos Minor estão em Pendências.

### A guarda nova de `entrada-qa.test.ts` não é mais fraca que a antiga

Antes (linha 163): `expect(Object.keys(item!)).not.toContain('origem')`.
Agora (linhas 165 e 166):
`expect(Object.keys(item!).sort()).toEqual(['criadaEm', 'id', 'linhaServicoProvavel', 'origem', 'rascunhoAgente', 'status', 'tipo', 'titulo', 'urgencia'])`
e `expect(item!.origem).toBe('pessoa')`.

| Fuga da origem da entrada bruta (`{ canal, referencia }`) para o item da fila | Antiga | Nova |
|---|---|---|
| O objeto inteiro sob a chave `origem` | barra | barra: `toBe` é `Object.is`, e um objeto nunca é a string `'pessoa'` |
| Só o canal, como string, sob `origem` | barra | barra: `CANAIS_ORIGEM` é `email`, `mensagem`, `formulario` e `outro` (`entrada.ts:30`); nenhum vale `'pessoa'`, e o teste grava `canal: 'email'` (`entrada-qa.test.ts:55`) |
| Só a referência, como string, sob `origem` | barra | barra: o valor teria de ser `'pessoa'`, e o teste grava a sentinela de e-mail como referência; o `contemSentinela(corpoLista)` da linha 167 barra também em qualquer chave |
| O mesmo dado sob outro nome (`canal`, `referencia`, `entradaBruta`, `texto`, um `...objeto` espalhado) | **não barra** | barra: a lista é fechada e comparada com `toEqual` depois do `sort()`, então a ordem das chaves não importa |
| A chave `origem` com a string exata `'pessoa'` | barra | deixa passar |

O único caso que a antiga barrava e a nova deixa passar é a última linha. É justamente o comportamento do RF-10: a
enumeração lida da autoria (`origemDaAutoria`), que o 04 aceitou para pessoa e agente (C06, "enumeração sem dado
pessoal"). Esse valor não carrega nada da entrada bruta, pela tabela acima. A guarda nova é, portanto, mais forte em
tudo o que importa para o RF-06 e o CA-21.3.

Conferi também, contra o passo 3b do plano:

- a linha 162 (`not.toContain('texto')`) ficou;
- o `contemSentinela(corpoLista)` ficou igual (era a 164, agora é a 167);
- o bloco do histórico (linhas 169 a 173) e o `it` seguinte não mudaram;
- os títulos de `describe` e `it` não mudaram;
- o código é o do plano, linha a linha, com as duas linhas de comentário do D-22.

A mesma fuga, pela vista de agente, segue coberta pela lista fechada de `demandas.test.ts:394`, que continua com
`toEqual` e com o `contemSentinela` da 391.

### IN-16: nenhuma asserção saiu

No diff 59ddf37..69f871b:

- `entrada-qa.test.ts`: 1 linha `expect(` saiu e 2 entraram (+1), como o plano previa;
- `demandas.test.ts:223` e `:394`: as duas listas exatas foram trocadas no lugar, só com `'origem'` a mais (0);
- `consultas.test.ts:118`: a lista exata foi trocada no lugar, com `'origem'` a mais e uma linha de comentário (0);
- os quatro testes do painel (`fila.test.ts`, `fila-qa.test.ts`, `fila-a1.test.ts`, `fila-a1-qa.test.ts`): só a linha
  `origem: 'pessoa',` no ajudante `demanda`, antes do `...extra`, sem mudar asserção.

Os números batem com a tabela da `06-T07-engenheiro-backend.md` (51 → 52, 200 → 200, 28 → 28).

### Checklist da seção 12 do padrão técnico

- [x] **Faz o que o plano pede, nem mais nem menos.** O código de `consultas.ts`, `schemas.ts` e `resumo-da-fila.ts`
  é o do passo 3 do plano. O único acréscimo é o `default` exaustivo em `origemDoResponsavel` (`atorDesconhecido`) e em
  `condicaoDaOrigem` (`origemDesconhecida`, `never`). Ele segue o G3.4 e o padrão do IN-02, e a volta 3 do plano já o
  registrou. Arquivos fora da tarefa não mudaram.
- [x] **Há teste para cada comportamento novo, e ele falharia sem o código.** `origem.test.ts` foi visto com 18 de 21
  vermelhos antes do código. Os 3 que já passavam são guardas declaradas na entrega do `engenheiro-dados-bd`. O
  vermelho da volta do backend (3 falhas e 4 erros de tipo) está no passo 3a da entrega dele. Cobertura:
  - CA-10.2: cada filtro devolve só a sua, com total 1;
  - CA-10.3: origem e status valem como E, e o total segue o filtro inteiro;
  - CA-10.4: o solicitante editado não muda a origem, nos dois sentidos, na listagem e no detalhe;
  - CA-10.5: pela rota, 200 com o filtro e 400 com o campo `origem` sem ecoar o valor;
  - C-17: o valor vai por parâmetro, e o SQL não tem o literal;
  - IN-02: o filtro não abre a listagem para a integração;
  - o `EXPLAIN` com 5.000 demandas.
- [x] **Nenhum segredo, valor de `.env` ou dado pessoal real.** Os ids são `u-origem-ficticia` e
  `u-ficticio-desempenho`. Os nomes são "Pessoa Ficticia" e "Teste Ficticio". O ator do Awave vem de
  `atorDeIntegracao('awave')`, sem token.
- [x] **Entrada externa validada com Zod; erro sem vazar detalhe.** `origem: z.enum(ORIGENS_DA_DEMANDA).optional()` em
  `filtroDemandasSchema`. Chave repetida, vazia, maiúscula e `%3Cscript%3E` dão 400 sem eco (`origem.test.ts`, bloco
  CA-10.5).
- [x] **Banco.** Não há migration. O filtro do Awave usa o índice que já existia, `demanda_autor_criada_idx`, na
  página, no total e na contagem, sem `Seq Scan`. Reproduzi o mesmo `EXPLAIN` nesta revisão. `origemDaAutoria` lança
  para autoria fora da lista, mas o banco não deixa essa linha existir. `demanda_autor_tipo_check` aceita só `pessoa`,
  `agente` e `integracao`, e `demanda_autor_integracao_check` só aceita `autor_id = 'awave'` na integração (0007,
  linhas 10 e 11). O 500 só aparece com linha corrompida, como em `responsavelDe`.
- [x] **Nada duplica função que já existe.** `condicaoDaOrigem` é uma só, usada pela página e pela contagem
  (`resumo-da-fila.ts` importa de `./consultas`, sem ciclo: `consultas.ts` não importa `resumo-da-fila`).
  `origemDaAutoria` e `responsavelDe` leem a mesma autoria, mas devolvem coisas diferentes (enumeração e nome
  visível), e o plano pede as duas.
- [x] **Textos de interface em pt-BR; axe.** Não se aplica: a T07 não toca tela.
- [x] **Minor vai para Pendências.** Três pontos, abaixo. Nenhum bloqueia.
- [x] **PR.** Não se aplica na 06: o `/code-review` e o `/security-review` são da `08-revisao`.

### Verificação nesta revisão

- `pnpm typecheck`: limpo.
- `pnpm lint`: limpo.
- `entrada-qa.test.ts` e `origem.test.ts`: 33 de 33. O `EXPLAIN` dá a página por `Index Scan` com `Incremental Sort`,
  o total por `Index Only Scan` e a contagem por `Index Scan`, todos em `demanda_autor_criada_idx`.
- `demandas.test.ts`, `consultas.test.ts` e os testes de `src/app/(painel)/demandas/`: 20 arquivos, 462 de 462.
- `pnpm test` (suíte inteira): 260 de 260 arquivos e 5610 de 5610 testes, sem falha. Bate com a entrega do backend.
- G4: o `git diff --stat a9fd9b8 69f871b` de `resolver-ator.ts`, `exigir-pessoa.ts`, `auth.ts`, `proxy.ts`,
  `privilegios.ts`, `next.config.ts` e `src/lib/rota.ts` saiu vazio.

## Decisões tomadas

- A guarda nova de `entrada-qa.test.ts` foi aceita. Ela barra tudo o que a antiga barrava com dado da entrada bruta,
  e também a mesma fuga sob outro nome. O único caso que passa a valer é a enumeração `'pessoa'` do RF-10, que não
  carrega dado de terceiro.
- O `default` exaustivo em `origemDoResponsavel` e `condicaoDaOrigem` foi aceito como desvio do trecho do plano. Ele
  segue o G3.4 e só torna o código mais restrito.
- O teste de `EXPLAIN` exige o índice e a ausência de `Seq Scan` ao mesmo tempo, o que é mais rígido que o plano ("ou").
  Foi aceito porque a massa é fixa, passa por `vacuum analyze` e os três planos atendem hoje. Se ficar instável no CI,
  o caminho é voltar ao "ou" do plano, não desligar o teste.

## Pendências

- Nenhuma bloqueia a passagem.
- Minor, para a T16 (frontend): `lerFiltroDaFila` (`src/app/(painel)/demandas/fila.tsx:50`) usa o
  `filtroDemandasSchema`. Por isso, desde a T07, `/demandas?origem=awave` digitado na URL já filtra a lista do painel.
  O resto da tela ainda não conhece a origem:
  - os contadores: `leituras-da-fila.ts:14` passa só o `tipo` e a `linhaServicoProvavel`;
  - `temFiltro` e `legendaDaFila` (`fila.tsx:56` e `:60`);
  - `hrefDaFila` (`fila.tsx:78`), que perde a origem ao paginar.

  O painel não tem controle de origem antes da T16, então ninguém chega a esse estado pela tela. A T16 deve cobrir os
  quatro pontos, com teste.
- Minor, para a `10-documentacao` ou uma volta futura do IN-16: o título do `describe` em `entrada-qa.test.ts:152`
  ("nenhuma outra leitura traz o texto bruto nem a origem") ficou ambíguo, porque o item agora tem a chave `origem` do
  RF-10. O plano mandou manter os títulos, e a manutenção está certa nesta tarefa. Numa revisão futura, pode virar "nem
  a origem da entrada bruta", sem mudar asserção.
- Minor, sem ação: a linha 162 (`not.toContain('texto')`) ficou redundante com a lista fechada da 165. Ela fica por
  ordem do plano e não enfraquece nada.
- As caixas `- [ ]` da T07 no plano continuam sem marca (a G1 não deixa a 06 editar `docs/`).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — os commits da T07 (7c8c206, b5b347c, 4306728, 69f871b) sobre 59ddf37, com a volta do plano (b925dfe) no meio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 59ddf37 69f871b` — 11 arquivos em `src/`, todos da T07, e as entregas e o plano em `docs/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 59ddf37 69f871b -- src` — o código e os testes da T07 (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 4306728 b925dfe -- docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md` — G5, D-22, D-23 e os passos 3a, 3b e 4 da T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "canal" --name-only --format=%h -- src/modules src/db` — onde mora a lista de canais da entrada bruta (`entrada.ts`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "demanda_autor_integracao_check" --name-only --format=%h -- src drizzle` — o CHECK está na `0007_greedy_wendigo.sql`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 260 de 260 arquivos, 5610 de 5610 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "function lerFiltroDaFila" --format=%h -- "src/app/(painel)/demandas/fila.tsx"` — 5d91af1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 59ddf37 69f871b -- src/modules/acesso src/proxy.ts src/db next.config.ts src/lib drizzle src/app/api/vistas-para-agente.test.ts test` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 69f871b -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts` — vazio (G4)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/entrada-qa.test.ts src/modules/demandas/origem.test.ts` — 33 de 33, com o `EXPLAIN` em `demanda_autor_criada_idx`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/demandas.test.ts src/modules/demandas/consultas.test.ts src/app/(painel)/demandas` — não rodou: erro de sintaxe do shell nos parênteses sem aspas
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/demandas.test.ts src/modules/demandas/consultas.test.ts "src/app/(painel)/demandas"` — 20 arquivos, 462 de 462

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
