---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T15-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T14 e T15 e G1 a G4), 01-analista-requisitos.md (RF-01 a RF-14 e RF-22 a RF-26 e RNF e matriz), 05-tech-lead.md, 06-T15-engenheiro-backend.md, git show def1fa7, src/modules/demandas/schemas.ts, src/modules/demandas/schemas.test.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/transicoes.test.ts, src/modules/demandas/servico.ts, src/modules/demandas/servico.test.ts, src/modules/demandas/consultas.ts, src/modules/demandas/consultas.test.ts, src/modules/limites.ts, src/modules/limites.test.ts, src/modules/pacotes-decisao/desatualizado.ts, src/lib/erros.ts, src/lib/relogio.ts, src/db/schema/demandas.ts, test/banco.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T15 (serviço de demanda: criar, alterar, consultar e transições de status), sobre o commit
`def1fa7815907f9d3d5b76ae9cbf8a0a3101babf`. O código cumpre todos os critérios da tarefa. Nenhum teste do
engenheiro falhou nem se mostrou instável. Acrescentei 24 testes em 2 arquivos novos, para as bordas que a suíte do
engenheiro não fechava.

### Critério de aceite → teste que cobre

| Critério | Arquivo | Teste |
|---|---|---|
| CA-03.1 (id `DEM-AAAAMMDD-NNNN`, `status: nova`, no serviço) | `src/modules/demandas/servico.test.ts` | `criarDemanda > CA-03.1: pessoa cria com id DEM-AAAAMMDD-NNNN, status nova e evento demanda_criada` |
| CA-03.3 (tipo `outro` ou sem título: lista dos campos, sem valor recebido) | `src/modules/demandas/schemas.test.ts` | `CA-03.3: tipo "outro" e falta de titulo são recusados`; `CA-03.3: o erro mapeado lista os campos com mensagem pt-BR, sem o valor recebido` |
| CA-03.3 (bordas) | `src/modules/demandas/schemas.bordas.test.ts` | `CA-03.3: a resposta lista todos os campos inválidos de uma vez > corpo vazio lista os três obrigatórios...`; `> corpo que não é objeto é recusado sem citar o valor recebido` |
| CA-06.1 (filtro `tipo=bug` devolve as 3; ordem; `limit` e `offset`) | `src/modules/demandas/consultas.test.ts` | `listarDemandas > CA-06.1: 3 bug e 2 melhoria...`; `> filtros de status e linha de serviço...`; `> ordena da mais nova para a mais antiga e respeita limit e offset`; `> offset além do fim...`; `> mesma data de criação: desempata pelo id...` |
| CA-06.2 (`limit=500` recusado) | `src/modules/demandas/schemas.test.ts` e `schemas.bordas.test.ts` | `filtroDemandasSchema > CA-06.2: limit acima de 100 é recusado`; `RNF-04 e CA-06.2: limit 100 passa; 101 não` |
| CA-06.3 (demanda inexistente → 404) | `consultas.test.ts` e `servico.bordas.test.ts` | `obterDemanda > CA-06.3: obterDemanda de id inexistente → nao_encontrado`; `código HTTP das recusas da T15 > CA-06.3: demanda inexistente → 404 com a mensagem padrão, sem o id pedido` |
| CA-06.4 (antes, depois, pessoa e data no histórico) | `servico.test.ts` | `alterarDemanda > CA-06.4: mudar linhaServicoProvavel grava evento com antes, depois, pessoa e data` |
| CA-07.1 (aprovada sem DEC aprovado e atualizado → 409, status não muda) | `transicoes.test.ts`, `servico.test.ts` | `CA-07.1: pronta_para_decisao → aprovada sem DEC aprovado...` (regra e serviço); `CA-07.1: com DEC devolvido também não aprova`; `pronta_para_decisao → aprovada com DEC aprovado e atualizado muda`; `DEC aprovado que ficou desatualizado por ESP ou RSK nova não aprova a demanda`; `DEC aprovado de outra demanda não vale` |
| CA-07.1 (conferido por pacote) | `servico.bordas.test.ts` | `CA-07.1: o DEC aprovado e atualizado é conferido por pacote > DEC v1 aprovado mas desatualizado pela ESP v2, e DEC v2 pendente...`; `> DEC v1 desatualizado e DEC v2 aprovado, que cita a ESP v2...` |
| CA-07.2 (estudo em aprovada → em_construcao → 409) | `transicoes.test.ts`, `servico.test.ts`, `servico.bordas.test.ts` | `CA-07.2: estudo não vai para em_construcao, nem a partir de aprovada nem de devolvida`; `CA-07.2: estudo em aprovada → em_construcao responde 409...`; `CA-07.2: o 409 do estudo sai com o código HTTP certo` |
| CA-07.3 (em_construcao → entregue, com a pessoa no histórico) | `servico.test.ts` | `alterarDemanda > CA-07.3: em_construcao → entregue muda e registra a pessoa` |
| CA-07.4 (agente não muda status → 403) | `servico.test.ts`, `servico.bordas.test.ts` | `CA-07.4 na regra: agente e sistema recebem sem_permissao, e nada muda`; `CA-07.4: agente que tenta mudar o status → 403, sem citar o agente` (o 403 pela rota é da T16, coberto pela matriz da T13) |
| CA-07.5 (entregue não muda → 409) | `transicoes.test.ts`, `servico.test.ts`, `servico.bordas.test.ts` | `CA-07.5: entregue não muda; encerrada também é final`; `CA-07.5: entregue não muda de status, com o motivo da tela`; `CA-07.5: de entregue / de encerrada, nenhum dos outros oito status é aceito, e nada muda` |
| RF-07 (tabela de transições manuais e automáticas) | `transicoes.test.ts`, `servico.test.ts`, `servico.bordas.test.ts` | `transições manuais > %s → %j` (9 casos); `toda transição da tabela passa quando as condições valem`; `transição fora da tabela é recusada com motivo genérico`; `mudarStatusPeloSistema > %s: da origem permitida vai ao destino...` (4 motivos × 9 status); `RF-07: recusa de transição pelo serviço > fora da tabela (nova → aprovada...)`; `> status igual ao atual junto com um campo...`; `RF-07: concorrência de status na mesma demanda` (2 testes) |
| C-11 (autoria só do ator) | `schemas.test.ts`, `servico.test.ts`, `schemas.bordas.test.ts` | `C-11: campos de autoria do body são descartados`; `C-11: criada por token de agente fica rascunho_agente = true...`; `C-11: chave que não é campo da demanda não chega ao banco...`; `C-11: nenhum campo de autoria da G3.9 passa pelos schemas` (2 testes, a lista inteira da G3.9) |
| C-18 (anexo só `http:`/`https:`, até 2.048) | `schemas.test.ts`, `schemas.bordas.test.ts` | `C-18: anexo javascript: é recusado...`; `C-18: outros esquemas e texto que não é link...`; `C-18 e RNF-04 na borda exata > anexo url com 2.048 caracteres passa; com 2.049, não`; `> o limite de 2.048 vale também para o anexo do tipo arquivo`; `> link com espaço nas pontas é aparado e aceito` |
| C-30 (nenhum dado de terceiro no histórico) | `servico.test.ts` | `C-30: o evento de criação não leva o nome do solicitante nem texto livre`; `C-30: mudar solicitanteNome com sentinela não deixa o sentinela em nenhum evento` |
| C-36 (30 demandas e 60 artefatos por hora, 429) | `limites.test.ts`, `servico.test.ts`, `servico.bordas.test.ts` | `C-36: com 29 demandas na hora passa; com 30...`; `C-36: a janela é a última hora...`; `C-36: artefatos de ESP, RSK e DEC somam...`; `C-36: a 31ª demanda do mesmo ator na mesma hora responde 429; outra hora, passa`; `C-36: 35 criações simultâneas do mesmo ator → exatamente 30 gravadas e 5 com 429`; `C-36: a 31ª demanda na hora → 429, sem citar o ator` |
| RNF-04 (texto até 10.000, lista até 50, `limit` até 100) | `schemas.test.ts`, `schemas.bordas.test.ts`, `servico.bordas.test.ts` | `RNF-04: campo de texto até 10.000 e lista até 50 itens`; `RNF-04: título e cada texto livre com 10.000 passam; com 10.001, não...`; `RNF-04: descrição do anexo até 10.000...`; `RNF-04 na alteração...`; `RNF-04 no banco: textos de 10.000 caracteres e 50 anexos com referência de 2.048 voltam sem corte` |

Fora da T15, por tarefa dona: CA-03.2 (formulário do painel) é da T39; o 201, o 400 e o 403 pela rota HTTP são da T16,
e o 403 de cada ator proibido em cada rota é do teste transversal da T13. O limite de 100.000 do texto bruto (RNF-04) é
da T17.

### Testes acrescentados (24)

`src/modules/demandas/schemas.bordas.test.ts` (11, unitários, sem banco):

- os limites exatos: 2.048 e 2.049 no anexo `url` e no `arquivo`; 10.000 e 10.001 em cada um dos cinco textos livres,
  com a mensagem do limite; a descrição do anexo; 50 e 51 anexos na criação e na alteração; `limit` 1, 100 e 101;
- o link aparado nas pontas;
- a lista inteira de campos de autoria da G3.9 (`autorTipo` a `decididaPor`), mais `id`, `status`, datas e
  `duvidasEntrada`, descartada pelos dois schemas;
- o corpo vazio e o corpo que não é objeto (`null`, texto, número, lista), sem eco do valor.

`src/modules/demandas/servico.bordas.test.ts` (13, integração, Postgres real pelo papel do app):

- a CA-07.1 conferida por pacote: o DEC v1 aprovado mas desatualizado não vale, mesmo com o DEC v2 atualizado e
  pendente; o DEC v2 aprovado, que cita a ESP v2, vale;
- a transição fora da tabela (`nova → aprovada` com DEC aprovado) responde 409 com o motivo genérico. O campo enviado
  junto não muda, `atualizadaEm` também não, e não sai evento;
- de `entregue` e de `encerrada`, cada um dos outros oito status responde 409;
- status igual ao atual junto com um campo: só sai o `campo_alterado`;
- concorrência na mesma demanda:
  - `entregue` e `devolvida` ao mesmo tempo: uma passa, a outra recebe 409, e há um só `status_alterado`;
  - duas `nova → em_analise` ao mesmo tempo: uma passa, a outra recebe "Nada foi alterado." (400);
- o código HTTP de cada recusa, por `mapearErro`: 404 sem o id, 403 sem citar o agente, 429 sem citar o ator, 409 e
  400;
- o que o schema aceita volta inteiro do banco: textos de 10.000, nome de 200 e 50 anexos com referência de 2.048.

Os testes novos não dependem de ordem nem do relógio real:

- cada teste de integração usa um dia próprio do `relogioFixo`;
- a concorrência é resolvida por `Promise.allSettled` e pela trava da demanda, sem espera por tempo;
- as asserções valem qualquer que seja a transação que ganha a trava.

### Resultado

| Comando | Resultado |
|---|---|
| `pnpm test` antes dos testes novos | 79 de 79 arquivos, 1297 de 1297 testes |
| `pnpm test` com os testes novos | 81 de 81 arquivos, 1321 de 1321 testes, 0 falhas |
| `pnpm test src/modules/demandas/servico.bordas.test.ts`, segunda rodada | 13 de 13 |
| `pnpm lint` | limpo (0 erros, 0 avisos) |
| `pnpm typecheck` | limpo |

`git diff` vazio: nenhum arquivo rastreado mudou. Os únicos arquivos novos são os dois de teste. O commit da construção
só acrescenta arquivos (13 arquivos, 1.969 inserções, 0 remoções), sem `.skip`, `.only` nem `.todo`.

## Decisões tomadas

- Testes novos em arquivos `*.bordas.test.ts` à parte, sem mexer nos do engenheiro: assim o `git diff` prova que
  nenhuma asserção existente foi afrouxada.
- Os códigos HTTP dos CAs (409, 429, 404, 403, 400) são conferidos por `mapearErro` sobre o erro real do serviço: a T15
  não tem rota, e o mapeador é o mesmo que a `rota()` da T16 usa.
- A regra do estudo pelo tipo que resulta da chamada (decisão do engenheiro) não ganhou teste no sentido inverso
  (estudo virando bug na mesma chamada): a RF-07 não fixa esse caso, e quem decide é o tech-lead.
- A mensagem da enumeração `tipo` ausente não foi fixada no teste (aceita "Campo obrigatório." ou "Valor inválido."). O
  mapeador é da T03 e a lista de campos da CA-03.3 está certa.

## Pendências

- **Menor, mapeador da T03 (sem bloqueio):** `tipo` ausente no corpo sai como "Valor inválido.", e não como "Campo
  obrigatório.". O Zod 4 dá `invalid_value` para a enumeração ausente, e `campoAusente` só olha `invalid_type`. A CA-03.3
  é cumprida, porque o campo aparece na lista. Na tela de nova demanda (T39), um seletor de tipo vazio mostraria "Valor
  inválido.". Confirmar com o `ux-ui-design` ou ajustar `mensagemDoIssue`.
- **Menor, teste do engenheiro (sem bloqueio):** em `src/modules/limites.test.ts`, o teste `a trava por ator dura até o
  fim da transação: a segunda conferência do mesmo ator espera a primeira` consulta o `pg_stat_activity` num laço, mas
  não confere que viu a espera. Se a trava sumisse, ele poderia passar, dependendo do tempo. O efeito da trava continua
  provado por `C-36: 35 criações simultâneas do mesmo ator → exatamente 30 gravadas e 5 com 429`. Sugestão: guardar se
  a espera foi vista e conferir com `expect(...).toBe(true)`.
- **T16:** repetir pela rota o 201 da CA-03.1, o corpo 400 da CA-03.3, o 400 da CA-06.2, o 404 da CA-06.3 e o 403 da
  CA-07.4 (`PATCH /api/demandas/:id` com token de agente).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat def1fa7815907f9d3d5b76ae9cbf8a0a3101babf` — 13 arquivos, só inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes dos testes novos: 79 de 79 arquivos, 1297 de 1297
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/schemas.bordas.test.ts src/modules/demandas/servico.bordas.test.ts` — 23 de 24. A falha era uma expectativa minha: a mensagem do `tipo` ausente (ver Pendências). Ajustei o teste; o código não mudou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/schemas.bordas.test.ts src/modules/demandas/servico.bordas.test.ts` — 24 de 24
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 81 de 81 arquivos, 1321 de 1321, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/servico.bordas.test.ts` — segunda rodada: 13 de 13
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os dois arquivos de teste novos, não rastreados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — vazio

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
