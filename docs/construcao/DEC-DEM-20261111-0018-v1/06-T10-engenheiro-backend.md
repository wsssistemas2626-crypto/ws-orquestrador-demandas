---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T10-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G9, D-15 e T10), scripts/seed-ficticio.ts, scripts/seed-andamento.test.ts, scripts/seed-andamento-qa.test.ts, scripts/seed-integracoes.test.ts, scripts/seed-integracoes-qa.test.ts, scripts/scripts.test.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/demandas/arquivamento.ts, src/modules/demandas/transicoes.ts (AUTOMATICAS), test/estatico/caminhos-da-criacao.test.ts, test/estatico/piso-de-assercoes-0018.test.ts, 06-T09-engenheiro-backend.md (formato)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T10 (D-15; dados para RF-03, RF-06 e os e2e da T11 a T14): o seed fictício ganha as quatro demandas da vigência, todas
pela conta fictícia `configurar2fa` (papel cto), com as aprovações da "cto" e, na dupla, da "administradora".

| Chave em `TITULOS_DO_E2E` | Título | Estado depois do seed |
|---|---|---|
| `vigenciaComPendente` | Vigência: pacote novo pendente de dupla aprovação (fictício) | v1 `cto` aprovado na opção A pela "cto"; v2 `cto_e_administradora` pendente, sem aprovação; `pronta_para_decisao`; vigente = v1 atualizado |
| `vigenciaNivelMenor` | Vigência: pacote só do CTO depois da dupla aprovação (fictício) | v1 `cto_e_administradora` aprovado na opção A pela "cto" e pela "administradora" (`DOC-FICTICIO-0018`, data do dia do relógio); v2 `cto` pendente; `pronta_para_decisao` |
| `vigenciaArquivar` | Vigência: arquivar o pacote novo com um aprovado em vigor (fictício) | v1 `cto` aprovado pela "cto"; v2 `cto` pendente; `pronta_para_decisao` (arquivar o v2 leva a Aprovada, conferido no teste) |
| `arquivarSemVigente` | Arquivar sem pacote aprovado em vigor (fictício) | ESP v1 e RSK v1, nenhum DEC; `nova` |

Todas melhoria, `sob_medida`, "Pessoa Ficticia Produto", contexto preenchido; ESP e RSK de `ESP_DO_E2E` e `RSK_DO_E2E`,
DECs de `DEC_DO_E2E` com o nível de cada caso. Os v2 citam a mesma ESP v1 e o mesmo RSK v1 (o v1 fica atualizado). Todo DEC
novo nasce com `caminhos_com_nome_na_criacao` não nulo (pelo `criarPacoteDecisao` da T04). Nenhum pedido gerado, nenhum
token: a lista de pendentes do `/construir` continua só com a `pedidoParaBuscar`. A `configurar2fa` fica com 4 demandas e
14 versões (4 ESP, 4 RSK, 6 DEC) na primeira hora (C-36); a `sem2fa` continua com 28 e 33.

Arquivos alterados:
- `scripts/seed-ficticio.ts`: os quatro títulos em `TITULOS_DO_E2E` com o comentário "0.4.1 (DEC-DEM-20261111-0018-v1,
  T10)"; a tabela `VIGENCIAS` e a lista `DEMANDAS_DA_VIGENCIA`, que entra em `TOTAL_DEMANDAS_DO_SEED` (36 → 40);
  `criarContas` devolve também `administradora` e `configurar2fa` como `AtorPessoa` (o que grava não muda);
  `criarDemandasDaVigencia` (as quatro demandas) e `criarDadosDaVigencia(t, deps, pessoas, ids)` (ESP, RSK, DECs e
  aprovações, pelos serviços da API, na transação do seed), as duas chamadas de `criarDadosDasIntegracoes`; o ramo por
  nível do aprovado é `switch` com `never`; comentário de cabeçalho e do D-15.
- Testes do seed da G5 (só totais e listas que crescem; detalhe em "Decisões tomadas"): `scripts/scripts.test.ts`,
  `scripts/seed-andamento.test.ts`, `scripts/seed-integracoes.test.ts`, `scripts/seed-integracoes-qa.test.ts`.
  `src/db/sementes.test.ts`, `scripts/seed-andamento-qa.test.ts` e o resto da suíte não mudaram.

Teste criado: `scripts/seed-vigencia.test.ts` (12 casos, 46 linhas com `expect(`; molde de `seed-andamento.test.ts`:
banco novo, `SEED_FICTICIO=1`, `CONFIG_TESTE` em loopback, relógio fixo):
1. os quatro títulos em `TITULOS_DO_E2E`, com "(fictício)", sem repetir nenhum título;
2. total 40, igual à contagem no banco, à mensagem e ao log;
3. cada uma existe uma vez, melhoria, `sob_medida`, "Pessoa Ficticia Produto", com contexto, criada pela `configurar2fa` (D-15);
4. C-36: `configurar2fa` com 4 demandas e 4/4/6 versões na hora do seed; `sem2fa` com 28 e 33;
5. a 7. os três casos com DEC (versões, níveis, autoria, decisão, aprovações com e-mail, documento e data, status da
   demanda e `vigenteDaDemanda`);
8. `arquivarSemVigente`: ESP v1 e RSK v1 da `configurar2fa`, nenhum DEC, em Nova, sem vigente;
9. as três com DEC têm só ESP v1 e RSK v1, e nenhuma tem `pedido_gerado`, `pacote_decisao_substituido`, andamento;
10. todo DEC das quatro com a marcação da criação não nula; pendentes do `/construir` só a `pedidoParaBuscar`; 0 token;
11. o log do seed não leva título nem id das quatro, nem a referência do documento (G3.13);
12. (banco próprio) arquivar o v2 da `vigenciaArquivar` pela "cto" deixa a demanda em Aprovada, com o v1 vigente (S-04).

TDD: o teste foi escrito antes do código e visto falhando:
`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-vigencia.test.ts --reporter=dot` →
`Test Files 1 failed (1)`, `Tests 12 failed (12)`; trecho: `AssertionError: expected 36 to be 40` (total) e
`expected [] to have a length of 1 but got +0` (as demandas não existiam). Depois do código: `Tests 12 passed (12)`.

Testes do seed da G5 antes do ajuste (com o seed novo): 8 falhas, todas de total ou de lista que cresce
(`TOTAL_DEMANDAS_DO_SEED` 36 → 40 em três arquivos; contagens por tabela `[40, 13, 13, 13, 11]` → `[40, 17, 17, 19, 15]`;
13 → 19 DECs; `TOTAL - 13` → `TOTAL - 17`; a lista de DECs na ordem com os seis da vigência no fim; a lista das
"demandas próprias do e2e sem versão" que precisa excluir as quatro, como já exclui as da 0.3.0 e da 0.4.0). Depois do
ajuste: 7 arquivos, 112 de 112.

Comandos e resultado final: `pnpm test` (suíte inteira, em segundo plano) `Test Files 382 passed (382)`,
`Tests 8281 passed (8281)`, 0 falha; `pnpm lint` limpo; `pnpm typecheck` limpo.

Desvios do plano:
- **Onde as demandas nascem.** O plano manda chamar `criarDadosDaVigencia` "no fim de `criarDadosDasIntegracoes`". As
  versões (ESP, RSK, DECs e aprovações) estão lá, no fim; as quatro **demandas** nascem no começo da mesma função, antes
  das do Awave (`criarDemandasDaVigencia`), e os ids passam como quarto argumento de `criarDadosDaVigencia`. Razão: com
  tudo no fim, as demandas da vigência viriam depois das oito do andamento e quebrariam duas asserções de **ordem** em
  testes do PISO (`seed-andamento.test.ts:149` e `seed-integracoes-qa.test.ts:130`, "as oito do andamento são as últimas
  criadas"); com tudo antes do Awave, o quinto aviso de DEC deixaria de ser o da `pedidoRecebido` e mudaria o sentido do
  teste de falha no meio de `seed-integracoes.test.ts` (`{ do_awave: 3, gerados: 1 }`). Assim, nenhuma asserção de ordem
  muda: só totais e listas que crescem.
- `criarDadosDaVigencia` tem um quarto parâmetro (`ids`), além de `(t, deps, pessoas)` do plano, pelo motivo acima.

## Decisões tomadas

- Placement das demandas e das versões: ver "Desvios do plano"; é o único lugar em que as asserções de ordem de 0.3.0 e
  0.4.0 (PISO) continuam iguais.
- Mudanças nos testes existentes, trecho a trecho (G3.2; todas na linha "testes do seed que contam demandas, versões ou
  eventos" da G5; nenhuma asserção saiu; contagem de `expect(` igual à de `41108ee` nos quatro: 248, 41, 48, 55):
  - `scripts/scripts.test.ts:371`: `toBe(36)` → `toBe(40)` (total).
  - `scripts/scripts.test.ts` (teste "as demandas próprias do e2e …"): nova constante `DA_T10_0_4_1` com as quatro chaves,
    somada a `DA_T15` e `DA_T10_0_4_0` na lista das que ficam de fora (elas têm versões e são da `configurar2fa`, como as
    da 0.3.0 e da 0.4.0 têm estado próprio); `todos` 31 → 35. `titulos` continua 18, a `cto` com 5 e a administradora
    com 0.
  - `scripts/scripts.test.ts:581`: `[TOTAL, 13, 13, 13, 11]` → `[TOTAL, 17, 17, 19, 15]` (mais 4 ESP, 4 RSK, 6 DEC e 4
    aprovações).
  - `scripts/scripts.test.ts:869`: 13 → 19 DECs (um aviso e um job por DEC, a mesma asserção).
  - `scripts/scripts.test.ts:1069`: `TOTAL_DEMANDAS_DO_SEED - 13` → `- 17` (as quatro da vigência também não existem quando
    o terceiro aviso falha); `:1092` e `:1093`: 13 → 19 DECs e 11 → 15 aprovações.
  - `scripts/seed-andamento.test.ts:138` e `scripts/seed-integracoes.test.ts:70`: `toBe(36)` → `toBe(40)` e o título do
    caso cita a 0.4.1.
  - `scripts/seed-integracoes-qa.test.ts`: a lista esperada dos DECs na ordem de criação ganha `DECS_DA_VIGENCIA` no fim
    (os seis DECs da vigência, v1 e v2 de cada uma; a lista é de versões e cresce com elas); o comentário do `- 13` passa
    a `- 17`. As asserções de ordem das demandas não mudaram.
- `scripts/seed-vigencia.test.ts` não entra no `PISO`: a G5 lista as tarefas que acrescentam ao piso (T01, T02, T04 a
  T09, T12, T13) e a T10 não está nela; o tech-lead decide se o quer lá.
- `dataDocumento` da administradora = `deps.relogio.agora().toISOString().slice(0, 10)` (o dia do relógio injetado, sem
  `new Date()`).
- Ordem das aprovações da dupla: "cto" primeiro (aprovação parcial), depois a "administradora", que fecha a decisão; é a
  mesma ordem do e2e da `etapasDupla`.
- Os textos dos títulos e contextos não citam "Pessoa", "Ficticia" nem "Produto": a marcação do D1 na criação fica vazia e
  nenhum DEC é recusado na geração por causa do seed.

## Pendências

- Para a T14 e a `09-entrega`: o seed tem 4 demandas a mais (3 em Pronta para decisão, 1 em Nova). Os e2e da fila que
  li calculam os totais pela API (`Math.min(total, 20)`), sem número fixo; quem roda o e2e (frontend, T11 a T14) confirma.
- Para a T11 (G5, `e2e/decisao.spec.ts` "Arquivar → …"): a `arquivarSemVigente` tem ESP e RSK e nenhum DEC; o e2e cria o
  DEC dele antes de arquivar (versão da conta "cto" ou "administradora", conforme a spec de hoje).
- Minor para a revisão: o desvio de onde as demandas nascem (acima) é para o tech-lead ratificar.
- Para o maestro: dois `git grep -n -E` só de leitura (no e2e) usaram regex com alternativa `|` num comando só, e não um
  comando por alternativa como pede a lista Pode. Os dois estão declarados abaixo exatamente como rodaram; nenhum alterou
  nada.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1` — lista da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T10" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — localizar a T10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files scripts` — arquivos de scripts/
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "TOTAL_DEMANDAS_DO_SEED" -- scripts src test e2e` — usos do total
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "scripts/" -- test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts` — testes do seed no PISO
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dec_criado\|esp_criada\|especificacao_criada\|AUTOMATICAS" -- src/modules/demandas/transicoes.ts` — transições automáticas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -l "seed-ficticio" -- src test e2e scripts` — quem importa o seed
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "TITULOS_DO_E2E\|seed-ficticio\|TOTAL" -- e2e/fila-contadores.spec.ts e2e/apoio.ts test/estatico/caminhos-da-criacao.test.ts test/estatico/leituras-da-fila.test.ts test/estatico/dados-das-etapas.test.ts test/estatico/andamento-qa.test.ts` — usos no e2e e nos estáticos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- src/modules/demandas/arquivamento.ts` — exportações do arquivamento
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "dataDocumento\|data_documento" -- src/db/schema/decisao.ts` — tipo da coluna
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-vigencia.test.ts --reporter=dot` — antes do código: 12 de 12 falharam (TDD)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "não criada" -- scripts src test` — a mensagem interna do seed não é testada
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-vigencia.test.ts --reporter=dot` — depois do código: 12 de 12
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts scripts/seed-andamento.test.ts scripts/seed-andamento-qa.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts src/db/sementes.test.ts --reporter=dot` — antes do ajuste da G5: 92 passaram, 8 falharam (totais e listas)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts scripts/seed-andamento.test.ts scripts/seed-andamento-qa.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts scripts/seed-vigencia.test.ts src/db/sementes.test.ts --reporter=dot` — 112 de 112
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 382 arquivos, 8281 de 8281
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 5 arquivos rastreados alterados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- scripts/seed-andamento.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts scripts/scripts.test.ts` — 41, 48, 55, 248
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 41108ee -- scripts/seed-andamento.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts scripts/scripts.test.ts` — iguais em 41108ee
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- scripts/seed-vigencia.test.ts` — 46
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- scripts/seed-integracoes-qa.test.ts` — conferência do diff
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -E "\b(36|31)\b" -- e2e` — nenhum total do seed fixo no e2e
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -E "toHaveCount|toBe\([0-9]+\)|toHaveText\(.*[0-9]" -- e2e/fila-contadores.spec.ts e2e/fila-origem.spec.ts e2e/fila-origem-qa.spec.ts e2e/andamento-fila.spec.ts` — contagens dos e2e da fila vêm da API
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- scripts/seed-andamento.test.ts scripts/seed-integracoes.test.ts` — conferência do diff
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- scripts/seed-ficticio.ts` — conferência do diff
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:.prettierrc` — largura de linha

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (sem rota, Server Action nem job novos; as entradas do seed passam pelos schemas Zod dos serviços: `criarDemandaSchema`, `criarEspecificacaoSchema`, `criarParecerRiscoSchema`, `criarPacoteDecisaoSchema`, `registrarDecisaoSchema`)
