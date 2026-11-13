---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T05-construcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T01-qa-automacao.md, 06-T04-engenheiro-backend.md, 06-T04-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 35 a 334, G1 a G10, e 1147 a 1530, T05), src/modules/demandas/transicoes.ts, src/modules/andamento/schemas.ts, src/modules/historico/registrar.ts, src/components/rotulos.ts (240 a 325), src/components/rotulos-qa.test.ts, test/banco.ts, test/estatico/andamento.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T05 do plano: regras puras do andamento, as duas transições do `/construir` e o evento `andamento_registrado` (AN-04,
AN-11 na forma, AN-12 em `lerAndamento`, ADR-34, D-08). Antes do código, conferi que todos os arquivos da T05 ficam em
`src/`, dentro da minha lista Pode. Das entregas 06-T01 a 06-T04, só a `06-T01-qa-automacao` cita a T05: a parte de
leitura do CA-04.6 (linha fora do esquema vira "sem andamento", sem lançar). Ela está coberta por `lerAndamento` e pelos
nove casos "fora do esquema → null" de `regras.test.ts`.

### Arquivos criados

- `src/modules/andamento/regras.ts`: `EstadoDoAndamento`, `MarcoDoEvento`, `lerAndamento` (nunca lança),
  `mesmoEstado` (cinco campos), `mudancaDeMarco` (fase, statusConstrucao ou decId), `marcoDoEvento` (quatro chaves, uma
  a uma), `DecisaoDoAndamento` e `decidirPorStatus` (switch exaustivo com `never`, sem ramo padrão que grave). É o código
  do plano, sem mudança.
- `src/modules/andamento/regras.test.ts`: o teste do plano, sem mudança. Tem 75 testes, entre eles a tabela 9 × 3 × tipo
  (54 casos), o CA-06.6 (no máximo 7 marcos num ciclo de 20 tarefas) e os nove casos de linha fora do esquema.
- `src/modules/demandas/transicoes-construir.test.ts`: o teste do plano, sem mudança, com 5 testes no Postgres real. Ele
  cobre as duas tabelas congeladas, a regra do Estudo, a `MANUAIS` intacta (CA-05.11), o `status_alterado` do
  `construir` com o prefixo `ficticio`, o caso "sem regra não toca nada" e as recusas de awave, sistema, pessoa e agente.

### Arquivos modificados

- `src/modules/andamento/schemas.ts`: `andamentoLidoSchema`, `AndamentoVista`, `AndamentoDaIntegracao` e
  `paraIntegracao` (quatro chaves, uma a uma). O import ganhou os tipos `FaseAndamento` e `StatusConstrucao`.
- `src/modules/demandas/transicoes.ts`: só acréscimos (G4). Entraram duas linhas de import e, no fim do arquivo,
  `AUTOMATICAS_DO_CONSTRUIR`, `CONTRADIZ_STATUS_FINAL`, `transicaoDoConstruir` e `mudarStatusPeloConstruir`.
- `src/modules/historico/registrar.ts`: `AcaoEvento` ganhou `'andamento_registrado'` no fim, com o comentário do plano.
- `src/components/rotulos.ts`: o caso genérico `andamento_registrado` em `textoDoEvento` ("Registrou o andamento de
  <DEC>"). A frase completa fica para a T11.
- `src/components/rotulos-qa.test.ts`: é o teste de `textoDoEvento` que lista as ações, previsto na G5 (linha 140). O
  objeto `ACOES` ganhou `andamento_registrado: true`. Sem isso, o `satisfies Record<AcaoEvento, true>` quebra o
  `typecheck`. A contagem passou de 27 para 28, no título e no `toHaveLength`. Nenhuma asserção saiu nem ficou mais
  fraca: a ação nova passa pelos dois `it.each` (texto legível com cada ator; nenhum valor livre no texto, C-30).

**Outros `switch` sobre `AcaoEvento` que o `typecheck` apontou:** nenhum além de `textoDoEvento`. O único erro do
`typecheck` depois do código foi o `satisfies` de `rotulos-qa.test.ts`.

### Teste escrito antes, visto falhando

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/regras.test.ts src/modules/demandas/transicoes-construir.test.ts --reporter=dot`,
antes de criar `regras.ts` e de mexer em `transicoes.ts` e `schemas.ts`:

```
 FAIL  src/modules/andamento/regras.test.ts [ src/modules/andamento/regras.test.ts ]
Error: Cannot find module './regras' imported from .../src/modules/andamento/regras.test.ts
 FAIL  src/modules/demandas/transicoes-construir.test.ts > tabelas do construir > exatamente as duas automáticas, e a contradição com status final da spec 2.1
AssertionError: expected undefined to deeply equal { em_construcao: { …(2) }, …(1) }
 FAIL  ... > transicaoDoConstruir: estudo não vai para construção; construido nunca muda
TypeError: transicaoDoConstruir is not a function
 FAIL  ... > mudarStatusPeloConstruir > aprovada + em_construcao → em_construcao, ...
TypeError: mudarStatusPeloConstruir is not a function
 Test Files  2 failed (2)
      Tests  5 failed | 5 passed (10)
```

Os 5 que passaram antes do código são os quatro "lança antes de tocar o banco" e o "MANUAIS não muda". São guardas: os
quatro passavam porque a função ainda não existia, e a `MANUAIS` já existia. O teste que exige o código novo é o resto,
que falhou.

### Resultado

- Os dois testes da tarefa: **80 passaram, 0 falharam**.
- `src/components/rotulos-qa.test.ts`: **66 passaram, 0 falharam**. Antes da troca de 27 para 28, 1 falhou
  (`expected … to have a length of 27 but got 28`).
- `pnpm test` completo: **321 arquivos, 7061 testes passaram, 0 falharam** (402 s).
- `pnpm lint` e `pnpm typecheck`: limpos.

### `git diff 0ac099a -- src/modules/demandas/transicoes.ts`

Tem só linhas `+`: duas de import (`StatusConstrucao`, e `atorDesconhecido` com `Ator`) e o bloco novo no fim, depois
de `mudarStatusPeloSistema`. `MANUAIS`, `AUTOMATICAS`, `mudarStatusPeloSistema`, `conferirTransicaoManual` e
`STATUS_FINAIS` não têm nenhuma linha mudada.

### G4

O `git diff 0ac099a --stat` das superfícies congeladas saiu **vazio**.

### Desvios do plano

- Nenhum no código nem nos testes novos: são os do plano. A única mudança em teste existente é a de
  `rotulos-qa.test.ts` acima, prevista na G5. A troca de 27 para 28 acompanha a ação nova e deixa o teste mais rigoroso,
  não mais fraco.
- **Piso de asserções:** a T05 não está na lista de tarefas que acrescentam arquivo ao `PISO` (G4: T01, T02, T03, T07,
  T08 e T09). Por isso o `test/estatico/piso-de-assercoes.test.ts` não mudou.

## Decisões tomadas

- **Código copiado do plano:** é o contrato da G7, e as tarefas T07, T09, T10 e T11 dependem desses nomes e assinaturas.
- **Imports de `transicoes.ts` em linhas novas:** não editei as linhas de import que já existiam, para o diff parcial
  da G4 continuar só com `+`.
- **`rotulos-qa.test.ts` dentro da T05:** a G5 aponta esse arquivo para a T05. Sem a mudança, o `typecheck` não passa.
- **Comentários sem o nome da ação de matriz:** nenhum arquivo novo cita a ação da matriz, para não disparar a guarda
  AN-01 (f) de `test/estatico/andamento.test.ts`. `andamento_registrado` é o nome do evento, não o da ação.

## Pendências

- Nenhuma bloqueia a passagem.
- **Para o maestro: um comando fora da regra.** Para ler o fim do arquivo de saída da suíte, que rodou em segundo
  plano, rodei `tail -c 1500 <arquivo de saída em /tmp>`. O certo era usar a ferramenta Read. O comando está em
  Comandos executados, do jeito que rodou. Ele só leu o arquivo de saída do próprio teste, não alterou nada e mostrou só
  o resumo (321 arquivos e 7061 testes, todos passaram).
- Para a `06-T05-revisao`: a G4 saiu vazia. O diff parcial de `transicoes.ts` tem só `+`. A mudança em teste existente
  é só a de `rotulos-qa.test.ts` (G5, linha 140).
- Para a T07: o serviço passa a `mudarStatusPeloConstruir` a transação que já tem e a linha devolvida pela trava da
  demanda (`id`, `status`, `tipo`). A função não lê a demanda de novo, não abre transação e não faz SET (AN-06).
- Para a T11: a frase completa de `andamento_registrado` (fase, situação e tarefas) substitui o caso genérico em
  `textoDoEvento`.
- Nenhuma migration rodou, e nada tocou banco fora do Testcontainers.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `grep -n "^#" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano
- `grep -rn "T05" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1 --include=06-*` — só a 06-T01-qa-automacao cita a T05
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — último commit `c2e8e9f` (06-T04-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -- test/integracoes.ts test/banco.ts src/lib/relogio.ts src/modules/acesso/ator.ts src/db/schema/andamento.ts src/modules/demandas/schemas.ts` — assinaturas dos ajudantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "AcaoEvento" -e "pedido_recebido" -- src test scripts` — quem lista as ações
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "doPacote" -e "function textoDoEvento" -e "^import" -- src/components/rotulos.ts` — `doPacote` existe
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "Transacao = " -e "export type Transacao" -e "export async function comTransacao" -e "export function comTransacao" -- src/db/transacao.ts` — tipo `Transacao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "notNull" -e "pgTable" -- src/db/schema/demandas.ts` — colunas obrigatórias da demanda
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "insert into demanda (" -- src test scripts` — forma do insert fictício
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico/andamento.test.ts` — guarda AN-01 (f)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "Object.hasOwn(" -e "\"target\"" -e "\"lib\"" -- src tsconfig.json` — `Object.hasOwn` já é usado (ES2022)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/regras.test.ts src/modules/demandas/transicoes-construir.test.ts --reporter=dot` — antes do código: 2 arquivos falharam, 5 testes falharam e 5 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/regras.test.ts src/modules/demandas/transicoes-construir.test.ts --reporter=dot` — depois do código: 80 de 80
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro: o `satisfies` de `rotulos-qa.test.ts` sem `andamento_registrado`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/rotulos-qa.test.ts --reporter=dot` — 1 falhou (27 → 28) e 65 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/rotulos-qa.test.ts --reporter=dot` — 66 de 66
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 321 arquivos, 7061 de 7061
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/demandas/transicoes.ts` — só linhas `+`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — os 8 arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/rotulos-qa.test.ts src/components/rotulos.ts src/modules/historico/registrar.ts` — só os acréscimos e a troca 27 → 28
- `tail -c 1500 /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/byrvewnem.output` — fora da lista Pode (ver Pendências); resumo da suíte: 321 arquivos, 7061 de 7061

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T05 não cria rota, Server Action nem job; a linha lida do banco passa por `andamentoLidoSchema`, e o que fica fora do esquema vira `null` sem lançar)
