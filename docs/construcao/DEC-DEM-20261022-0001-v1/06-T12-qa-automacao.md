---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T12-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T11 a T13), 01-analista-requisitos.md (RF-01 a RF-22), 04-seguranca-aplicacao.md (seções 1 a 6), 06-T12-engenheiro-backend.md, 06-T12-tech-lead.md, 06-T11-qa-automacao.md (cabeçalho e convenção), commit e98dfcf5d332602f103d1ba024ff82155ae6b7f8, src/modules/historico/registrar.ts, src/modules/historico/registrar.test.ts, src/modules/historico/consultas.ts, src/modules/historico/consultas.test.ts, src/modules/acesso/auth.ts, src/modules/acesso/verificacao.test.ts, src/db/schema/historico.ts, src/db/schema/demandas.ts, src/db/schema/comum.ts, src/db/schema/index.ts, test/banco.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T12 (histórico de eventos sem dado de terceiro), sobre o commit `e98dfcf`. Os 32 testes do engenheiro
cobrem o caminho principal. Acrescentei 6 testes em 2 arquivos novos `*-qa.test.ts`, na convenção da T11. Eles
conferem os critérios pela **leitura** do histórico e comparam a lista de permissão com as colunas reais de `demanda`.
Nenhum arquivo existente mudou. A suíte inteira passa. Nenhum defeito bloqueia a tarefa.

### Critérios da T12 e o teste que cobre cada um

| Critério | Arquivo | Teste |
|---|---|---|
| RF-21, registro: `ator_tipo`, `ator_id` e `ator_token_prefixo` por tipo de ator; data do `Relogio` | `src/modules/historico/consultas.test.ts` | `registrarEvento` › "pessoa: ator_id é o usuarioId, sem prefixo de token, e a data vem do Relogio"; "agente sem token (job do worker) grava prefixo nulo"; "sistema grava ator_id "sistema"; evento sem demanda fica com demanda_id nulo"; "grava antes e depois em jsonb, como recebidos" |
| RF-21, o evento entra na transação de quem chama (G3.8) | `src/modules/historico/consultas.test.ts` | "dentro de uma transação desfeita, o evento não fica (aceita a transação de quem chama)" |
| RF-21, leitura do mais novo para o mais antigo, só da demanda pedida, com desempate | `src/modules/historico/consultas.test.ts` | `listarHistorico` › "RF-21: do mais novo para o mais antigo, com pessoa (nome e papel), agente sem prefixo e sistema"; "só os eventos da demanda pedida"; "eventos no mesmo instante saem do último gravado para o primeiro"; "demanda sem eventos devolve lista vazia" |
| RF-21, nome e papel da pessoa vindos da conta; conta que não existe mais | `src/modules/historico/consultas.test.ts` | "o nome e o papel vêm da conta, e não do que o ator trazia"; "a leitura não traz o id interno da pessoa"; "evento de pessoa cuja conta não existe continua no histórico, com nome e papel nulos" |
| CA-02.4 e C-09: agente gravado com o prefixo; o prefixo não sai na leitura | `src/modules/historico/consultas.test.ts` | "CA-02.4 e C-09: agente grava o nome do agente em ator_id e o prefixo do token em ator_token_prefixo"; "C-09: o prefixo do token fica na coluna, mas não sai na leitura" |
| CA-02.4, com o agente do critério (`insumo_tecnico`), pela leitura | `src/modules/historico/consultas-qa.test.ts` (novo) | "CA-02.4: artefato criado pelo agente insumo_tecnico sai como agente insumo_tecnico, não como pessoa" |
| CA-06.4: enumeração guarda antes e depois | `src/modules/historico/registrar.test.ts` | "CA-06.4: enumeração guarda antes e depois"; "%s, da lista de permissão, guarda o valor" (4 casos); "valor nulo de um campo da lista de permissão fica nulo" |
| CA-06.4, pela leitura: antes, depois, a pessoa e a data e hora | `src/modules/historico/consultas-qa.test.ts` (novo) | "CA-06.4: a mudança de linhaServicoProvavel sai na leitura com antes, depois, a pessoa e a data e hora" |
| C-30: os 7 campos de texto livre gravam só `{ alterado: true }`; lista de permissão, não de negação | `src/modules/historico/registrar.test.ts` | "%s grava só { alterado: true }" (7 casos); "nenhum valor de texto livre chega ao que é gravado"; "CAMPOS_TEXTO_LIVRE lista os sete campos de texto livre"; "campo desconhecido é tratado como texto livre (lista de permissão, não de negação)"; "o nome do campo é conferido exatamente: variação de caixa ou de espaço é texto livre"; "campo da lista de permissão com valor que não é texto vira { alterado: true }" |
| C-30, contra as colunas reais de `demanda`: só as 5 enumerações guardam valor, inclusive para `duvidasEntrada`, `autorId` e qualquer coluna futura | `src/modules/historico/registrar-qa.test.ts` (novo) | "das colunas de demanda, só as cinco enumerações guardam o valor; as outras (inclusive duvidasEntrada e autorId) gravam { alterado: true }"; "todo campo de CAMPOS_TEXTO_LIVRE existe na demanda (a lista não aponta para nome errado)"; "o { alterado: true } devolvido não é compartilhado: mudar um resultado não muda o da chamada seguinte" |
| CA-21.3 (parte da T12) e C-30: demanda com texto bruto em `entrada_bruta` e os 7 campos alterados com sentinelas; nenhum sentinela na leitura nem na coluna de `evento` | `src/modules/historico/consultas-qa.test.ts` (novo) | "CA-21.3 e C-30: demanda com texto bruto e campos de texto livre alterados; nada disso aparece no histórico" |
| C-08, mantido depois da troca no `auth.ts`: ativar e desativar o 2FA gravam evento com ator pessoa e sem segredo | `src/modules/acesso/verificacao.test.ts` (sem edição) | "C-08: ativar 2FA grava evento com ator pessoa e sem segredo"; "C-08: código errado na ativação não grava evento; desativar grava" |

### Testes acrescentados

- `src/modules/historico/consultas-qa.test.ts`: 3 testes de integração, com Postgres real e pelo papel do app. Cada um
  usa banco próprio (`novoBanco`), `truncate evento` antes de cada teste e relógio fixo.
- `src/modules/historico/registrar-qa.test.ts`: 3 testes unitários, sem banco.

O que eles pegam e os testes do engenheiro não pegavam:

- uma enumeração trocada por texto livre na lista de permissão (por exemplo `duvidasEntrada` ou `titulo` em
  `CAMPOS_COM_VALOR`);
- um nome errado em `CAMPOS_TEXTO_LIVRE`;
- o objeto `{ alterado: true }` compartilhado entre chamadas;
- uma leitura do histórico que juntasse `entrada_bruta` ou devolvesse o texto de um campo livre.

### Resultado

- `pnpm test`: 65 de 65 arquivos, 1049 de 1049 testes. Antes desta etapa eram 63 arquivos e 1043 testes; são 6 a mais.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- Estabilidade: `consultas-qa.test.ts` rodou 3 vezes (na suíte, isolado e na suíte de novo), todas verdes. Os testes
  novos não usam `Date.now()` nem `new Date()` sem argumento, nem dependem da ordem: cada arquivo cria o próprio banco,
  e o estado é zerado em `beforeEach`.

## Decisões tomadas

- Testes em arquivos novos `*-qa.test.ts`, sem editar os do engenheiro. É a convenção da `06-T11-testes`, e deixa a
  autoria clara para a revisão. Primeiro acrescentei os testes nos dois arquivos do engenheiro. Depois desfiz a mudança
  à mão, e o `git status` final mostra esses dois arquivos sem modificação.
- O teste de colunas usa `getTableColumns(demanda)`: a lista de permissão é conferida contra o esquema real. Uma coluna
  nova que guarde valor sem ser enumeração quebra o teste.
- Não escrevi teste para o ramo `atorVisivel` → `sistema` com agente desconhecido (Minor 1 da revisão). Um teste agora
  fixaria a atribuição errada que a revisão quer mudar. O caso fica para a tarefa que tornar o ramo explícito.
- Não escrevi teste para o ramo do `auth.ts` em que a pessoa sem papel válido fica sem evento (Minor 3). O ramo é
  inalcançável pelo `CHECK` de `user.papel`, e provocá-lo exigiria tirar o `CHECK` no banco de teste.
- Descartei um teste para `undefined` num campo da lista. Ele fixaria um comportamento incidental (`{ alterado: true }`)
  que nem o plano nem a 04 pedem.

## Pendências

- Nenhuma bloqueia a T12.
- **T15 e T16:** o teste de C-30 pela rota, pedido na 04 (`PATCH` de `solicitanteNome` com sentinela, e nenhuma linha
  de `evento` com o sentinela), continua para quando a rota existir, como diz a `06-T12-revisao`. O
  `registrar-qa.test.ts` cobre a regra de `mudancaDeCampo`, mas não prova que o serviço a usa.
- **CA-21.1 e CA-21.2:** o fluxo completo (demanda, ESP, RSK, DEC, aprovação, um evento por passo e o ator certo) só
  pode ser testado depois da T21. O `UPDATE` e o `DELETE` recusados em `evento` já estão na guarda de privilégios da
  T04.
- **Minor 1 da revisão (`consultas.ts:30`):** quando o ramo `sistema` ficar explícito, entra um teste com `ator_tipo`
  `agente` e um `ator_id` fora de `AGENTES`, gravado pelo migrator.
- **Ruído na saída do `pnpm test`:** linhas `better_auth` de nível 50, com `time` do relógio real, aparecem na saída de
  testes de antes da T12. Elas não falham nem são intermitentes, mas sujam o relatório. Fica para a T34 (sentinelas do
  log) conferir de onde vêm.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat e98dfcf5d332602f103d1ba024ff82155ae6b7f8` — 7 arquivos: os 5 da T12, a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show e98dfcf5d332602f103d1ba024ff82155ae6b7f8 -- src` — diff do código da T12
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — linha de base: 63 de 63 arquivos, 1043 de 1043 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/historico` — 2 de 2 arquivos, 38 de 38 testes (primeira versão, com os testes dentro dos arquivos do engenheiro)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 63 de 63 arquivos, 1049 de 1049 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/historico/consultas.test.ts` — 17 de 17, para conferir a estabilidade
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — os dois arquivos de teste do engenheiro modificados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — +93 −3, só em `*.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0` — só imports trocados e blocos acrescentados; nenhuma asserção mudada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — depois de mover os testes para os `*-qa.test.ts` e desfazer as edições: só os 2 arquivos novos, sem arquivo modificado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 65 de 65 arquivos, 1049 de 1049 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
