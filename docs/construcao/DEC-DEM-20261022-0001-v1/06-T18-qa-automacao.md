---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T18-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T18), 01-analista-requisitos.md (RF-04 e RF-07 a RF-15), 06-T18-engenheiro-backend.md, git show f1cd287, src/modules/especificacoes/schemas.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/consultas.ts, src/modules/especificacoes/schemas.test.ts, src/modules/especificacoes/servico.test.ts, src/app/api/especificacoes/especificacoes.test.ts, src/app/api/demandas/[id]/especificacoes/route.ts, src/app/api/especificacoes/[espId]/route.ts, src/vendor/construir/pedido.mjs, src/vendor/construir/pedido.d.mts, src/vendor/construir/origem.test.ts, src/vendor/construir/temporario-comparar.test.ts, src/modules/demandas/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/versoes.ts, src/modules/limites.ts, test/deps.ts, test/banco.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T18, especificação técnica (ESP) versionada, sobre o commit `f1cd287`. O código cumpre todos os critérios
da tarefa. Nenhum teste falhou, nenhum teste do engenheiro é instável ou errado e nada volta para a construção. Acrescentei
98 testes: um teste de contrato ESP × `validarPedido` e as bordas de concorrência, limite, imutabilidade e dúvida em
aberto.

### Critérios da tarefa e os testes que os cobrem

| Critério | Arquivo | Teste |
|---|---|---|
| CA-08.1 (v1, depois v2) | `src/app/api/especificacoes/especificacoes.test.ts` | `CA-08.1: primeira ESP é ESP-<dem>-v1; a seguinte, -v2` |
| | `src/modules/especificacoes/servico.test.ts` | `CA-08.1: primeira é ESP-<dem>-v1, a seguinte -v2, com a autoria da pessoa` |
| CA-08.2 (novo_projeto sem repositório → 400 com o campo) | `especificacoes.test.ts` | `CA-08.2: novo_projeto sem repositorioDestino → 400 com o campo, e nada gravado`; **novos:** `CA-08.2: novo_projeto com repositorioDestino só de espaços → 400 com o campo, e nada gravado`, `CA-08.2: bug sem nenhum dos quatro campos → 400 com os quatro, nesta ordem` |
| | `src/modules/especificacoes/schemas.test.ts` | `CA-08.2: novo_projeto sem repositorioDestino → campo repositorioDestino`, `bug sem nenhum dos quatro → os quatro campos, nesta ordem, com as mensagens da 03` |
| | `servico.test.ts` | `CA-08.2 no serviço: novo_projeto sem repositório → entrada_invalida com o campo, e nada gravado` |
| CA-08.3 (repositório em outra conta → 400) | `especificacoes.test.ts` | `CA-08.3: repositório em outra conta → 400 com o campo repositorioDestino`; **novo:** `CA-08.3: o 400 lista o campo com a mensagem da conta, e a versão seguinte válida ainda é a v1` |
| | `schemas.test.ts` | `CA-08.3: repositório em outra conta → recusado`, `repositório que não termina com o sistema alvo → mensagem da 03` |
| | **novo:** `src/modules/especificacoes/contrato-pedido.test.ts` | `<tipo>: outra conta → a ESP aceita se e só se o validarPedido aceita`, e mais 19 casos por tipo construído |
| CA-08.4 (estudo sem os quatro campos → aceito) | `especificacoes.test.ts` | `CA-08.4: estudo sem os quatro campos → 201` |
| | `schemas.test.ts`, `servico.test.ts` | `CA-08.4: estudo sem os quatro campos → aceito`, `CA-08.4 no serviço: estudo sem os quatro campos → gravada` |
| CA-08.5 (escopoInclui como texto corrido → 400) | `especificacoes.test.ts` | `CA-08.5: escopoInclui como texto corrido → 400 com o campo, sem o valor recebido`; **novo:** `CA-08.5: duvidasEmAberto como texto corrido → 400, e o status da demanda não muda` |
| | `schemas.test.ts` | `CA-08.5: escopoInclui como texto corrido → recusado`, `escopoExclui, duvidasEmAberto, criterios e definição como texto corrido → recusados` |
| CA-04.3 (criações simultâneas → v1 e v2, sem erro) | `especificacoes.test.ts` | `CA-04.3: duas criações simultâneas pela rota → v1 e v2, as duas 201` |
| | `servico.test.ts` | **novo:** `CA-04.3: cinco criações simultâneas, de atores diferentes e do mesmo ator → v1 a v5, sem erro e sem número repetido` |
| CA-11.1 (PATCH, PUT e DELETE → 405; conteúdo igual) | `especificacoes.test.ts` | `CA-11.1: PATCH, PUT e DELETE em /api/especificacoes/:espId → 405 e o conteúdo não muda`; **novos:** `CA-11.1: a rota da lista só exporta GET e POST; nenhuma rota da ESP exporta PATCH, PUT ou DELETE`, `CA-11.1: o conteúdo da v1 lido pela rota é o mesmo antes e depois da v2` |
| | `servico.test.ts` | **novo:** `RF-11: a versão anterior continua igual depois de uma nova versão` |
| CA-15.1 (dúvida leva a aguardando_informacao, ator sistema) | `especificacoes.test.ts` | `CA-15.1: ESP com dúvida leva a demanda em_analise a aguardando_informacao, com evento de ator sistema`; **novo:** `CA-15.1 pela rota: ESP sem dúvida não muda o status` |
| | `servico.test.ts` | `CA-15.1: ESP com dúvida leva ...`, `de %s também vai a aguardando_informacao`, `sem dúvida, o status não muda`, `com dúvida, mas em %s (fora da origem permitida), o status não muda`; **novos:** `CA-15.1: com dúvida, numa demanda que já está em aguardando_informacao → fica, sem novo evento de status`, `CA-15.1: dúvida gravada pelo agente insumo_tecnico também leva a aguardando_informacao, com o evento do sistema` |
| CA-15.2 (nenhuma mensagem ao solicitante) | `especificacoes.test.ts` | `CA-15.2: nenhuma mensagem ao solicitante: nenhum job de aviso e nenhum e-mail` |
| C-11 (autoria só do ator) | `especificacoes.test.ts` | `C-11 pela rota: token do insumo_tecnico com rascunhoAgente:false → rascunho_agente true, autor agente`, `C-11: id e versão vindos do corpo são descartados` |
| | `schemas.test.ts`, `servico.test.ts` | `C-11: autoria do body descartada`, `C-11: agente insumo_tecnico grava rascunho de agente, com o nome do agente como autor` |
| C-36 (limite de artefatos → 429) | `especificacoes.test.ts` | `C-36: o 61º artefato do mesmo ator na hora → 429` |
| | `servico.test.ts` | `C-36: com 60 artefatos do ator na última hora, o 61º → limite_excedido, e nada gravado`; **novos:** `C-36 na fronteira: com 59 artefatos do ator na hora, o 60º é gravado e o 61º → limite_excedido`, `C-36: artefato criado há mais de uma hora não conta para o limite` |
| ADR-05 (cópia do `validarPedido`) | `src/vendor/construir/origem.test.ts` | `a cópia do validarPedido tem o SHA-256 registrado em ORIGEM.md` |
| | `src/vendor/construir/temporario-comparar.test.ts` | os 3 testes de `cópia do validarPedido × enumerações do app` |
| | **novo:** `contrato-pedido.test.ts` | `o pedido fictício de base passa inteiro no validarPedido (a filtragem não esconde erro)` e os 80 casos por tipo |
| ADR-09 (um schema para rota, Server Action e job) | `servico.test.ts`, `especificacoes.test.ts` | o serviço recebe a saída de `criarEspecificacaoSchema.parse`, e a rota usa o mesmo schema |

Os testes do engenheiro já cobriam também C-10 (403), C-15 (`Origin`), CA-01.3 (401), C-17 (id fora do formato → 404
sem consulta), C-21 (log) e C-30 (evento sem texto livre). A matriz de `test/matriz-rotas.test.ts` cobre as três rotas
novas sem mudança.

### Testes acrescentados (98)

| Arquivo | Novos | O que pegam |
|---|---|---|
| `src/modules/especificacoes/contrato-pedido.test.ts` (novo) | 84 | Contrato com o /construir. Nos 4 tipos construídos, com 20 combinações dos quatro campos: donos, espaços aparados, outra conta, dono em maiúscula, outro sistema, segmento a mais, barra no fim, sem dono, espaço dentro, ausentes, vazios. Para cada uma, a ESP aceita **se e só se** o `validarPedido` aceita. Também confere que o pedido de base passa inteiro, que os casos têm aceite e recusa, que o valor gravado é o aparado e que um item em branco nas listas é recusado. Se a ESP aceitasse algo que o /construir recusa, o DEC aprovado geraria um pedido inválido (RF-22, T22) |
| `src/modules/especificacoes/servico.test.ts` | 7 | Cinco criações simultâneas, com o mesmo ator e com atores diferentes, sem número repetido e sem sobrescrita. Fronteira do limite: 59 mais 1 passa, o seguinte recusa. Janela de uma hora. Recusa que não consome versão nem grava evento. Dúvida com a demanda já em `aguardando_informacao`, sem evento duplicado. Dúvida gravada por agente. v1 igual depois da v2 |
| `src/app/api/especificacoes/especificacoes.test.ts` | 7 | Rota da lista sem PATCH, PUT nem DELETE. Repositório só com espaços. 400 com os quatro campos em ordem. Mensagem da conta e v1 depois da recusa. `duvidasEmAberto` em texto corrido sem mudar o status. ESP sem dúvida que não muda o status. v1 igual pela rota depois da v2 |

### Resultado

- T18 isolada: 6 arquivos, 167 de 167. Rodei os arquivos novos e alterados de novo: 163 de 163, sem variação.
- `pnpm test`: 92 arquivos, **1646 de 1646**. Antes eram 91 arquivos e 1548 testes; agora há 98 testes e um arquivo a mais.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Conferências do critério de pronto

- **Ordem e relógio:**
  - `servico.test.ts` usa `relogioFixo` e um dia por teste (`beforeEach`), e os testes novos não dependem de qual dia é.
  - `especificacoes.test.ts` usa o relógio fixo de `criarDepsDeTeste`. Cada teste novo cria a própria demanda.
  - O teste mais exigente de limite fica perto de 20 ESPs do CTO por arquivo, abaixo de 60, em qualquer ordem.
  - O teste de contrato não tem estado.
  - A janela do limite é montada a partir de `relogio.agora()`, e não do relógio real.
- **`git diff`:** só inserções, 171 linhas em 2 arquivos, mais o arquivo novo. Nenhum teste foi apagado, posto em `.skip`,
  `.only` ou `.todo`, nem teve a asserção afrouxada. O commit `f1cd287` só criou arquivos de teste; não alterou teste
  existente.
- **Dados:**
  - só fictícios: "Pessoa Ficticia", `meu-sistema`, `outra-conta` e as sentinelas de `test/sentinelas.ts`;
  - as duas contas de `DONOS_REPOSITORIO` são as contas da empresa no GitHub, já no padrão técnico; não são dado pessoal;
  - nenhum segredo, token literal nem valor de `.env`.

## Decisões tomadas

- **Contrato ESP × `validarPedido` como equivalência, e não só implicação.** A ESP aceitar menos que o /construir também é
  defeito: travaria uma demanda válida.
- **Erros filtrados pelos quatro campos no contrato.** O pedido de base passa inteiro, num teste próprio. Assim, a
  filtragem não esconde erro de outro campo.
- **Testes novos nos arquivos do engenheiro, em `describe` próprio** marcado `06-T18-testes`. Assim aproveitam o mesmo
  banco do Testcontainers, sem um segundo container. O contrato ficou em arquivo próprio porque não usa banco.
- **Concorrência com cinco chamadas e `Promise.allSettled`**: mostra a falha de cada chamada e cobre os dois caminhos de
  trava, o do mesmo ator (trava consultiva do limite) e o de atores diferentes (trava da demanda).
- **Sem embaralhar a ordem pelo Vitest.** `--sequence.shuffle` não está na minha lista **Pode**. A independência de ordem
  foi conferida pela leitura dos testes, como descrito acima.

## Pendências

- Para a T28 (não bloqueia):
  - `CA-15.2: nenhuma mensagem ao solicitante...` conta `pgboss.job` e `aviso_email` no banco inteiro do arquivo.
  - Quando o gatilho do agente de risco entrar, com agente ligado em algum teste do arquivo, a contagem precisa filtrar
    pela demanda ou pela fila de aviso. Senão, o teste passa a depender da ordem.
- CA-11.1 (não bloqueia): o 405 do Next é provado pelos métodos exportados, e não por uma requisição a um servidor no ar.
  Se a T46 percorrer as rotas contra a homologação, vale incluir PATCH, PUT e DELETE em `/api/especificacoes/:espId`.
- Fora da T18 (observação): na suíte inteira, duas linhas de log `better_auth` de nível 50 saem com o horário real, e
  não com o do relógio fixo. Elas vêm de testes anteriores à T18, e nenhuma asserção depende disso. Fica para a revisão
  de RNF-15, se o tech-lead julgar relevante.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f1cd287e55b4ca2e260b7acc882ebccd5a78f727` — 17 arquivos da T18
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f1cd287e55b4ca2e260b7acc882ebccd5a78f727 -- src/modules/demandas/consultas.ts src/modules/demandas/servico.ts` — só os `export`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo antes dos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — último commit b465387 (06-T18-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b465387` — só a entrega da revisão e `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/vendor src/modules/especificacoes src/app/api/especificacoes` — antes dos acréscimos: 69 de 69
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/vendor src/modules/especificacoes src/app/api/especificacoes` — com os acréscimos: 167 de 167
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/especificacoes src/app/api/especificacoes` — segunda rodada: 163 de 163
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1646 de 1646, 92 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 171 inserções, 0 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 2 alterados e 1 novo, todos de teste

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
