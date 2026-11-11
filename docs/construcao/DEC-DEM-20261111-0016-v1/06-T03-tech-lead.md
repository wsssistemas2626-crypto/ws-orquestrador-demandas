---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T03-revisao
agente: tech-lead
leu: [pedido.json, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T03), 01-analista-requisitos.md (RF-01, RF-03, CA-01, CA-03), 06-T03-engenheiro-backend.md, padrao-tecnico.md (seção 12), contrato-passagem.md, diff db63632..997af8c (código e testes da T03), src/modules/acesso/matriz.ts, src/modules/acesso/matriz.test.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/ramos-por-ator.test.ts, src/modules/acesso/ramos-por-ator-qa.test.ts, src/modules/demandas/servico.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, test/matriz-rotas.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T03 (token de integração, matriz fechada por integração e matriz × rotas; IN-01, IN-03, piso do IN-16).
O código da tarefa está nos commits 6fcd12e e 997af8c; o diff revisado é `db63632..997af8c`. **Aprovada.** Nenhum
problema Critical ou Important. Os Minor estão abaixo e em Pendências.

### Conferência

| Item | Resultado |
|---|---|
| Plano da T03 (arquivos, interfaces, passos) | Cumprido. `criarTokenDeIntegracao` e `criarTokenServico` sobre `gravarToken` (D-02, assinatura de hoje mantida); `validarTokenServico` só por lista (G8 #3) em `src/modules/acesso/tokens-servico.ts:48-58`; 23 ações e os cinco pares do RF-03 em `src/modules/acesso/matriz.ts:28-72`; `atoresProibidos` com as integrações no fim (G8 #2) em `matriz.ts:115-123`; `test/integracoes.ts` como no G7 |
| TDD | Entrega mostra as duas rodadas que falharam antes do código, com o teste dos pares exatos (G3.1). A linha de base do piso nasceu verde, como o G3.1 permite |
| G4 (superfícies congeladas e `src/lib/rota.ts`) | `git diff a9fd9b8` vazio, rodado por mim |
| IN-16 / D-17 | Só três arquivos do D-17 mudaram desde a9fd9b8 (`matriz.test.ts`, `matriz-qa.test.ts`, `matriz-rotas.test.ts`). Nenhuma linha com `expect(` saiu sem substituta. Contei com Read o `matriz.test.ts` atual: 47 linhas (44 em a9fd9b8, mais 7, menos 4 trocadas). O `PISO` de 44 está certo |
| G5 e desvios (G3.2) | Os seis desvios explicados trecho a trecho na entrega estão aceitos (razões abaixo) |
| Segredo e dado pessoal | Tokens só gerados em tempo de teste; formato e ausência no banco conferidos por `.test()`, `includes()` e `toBe`, nunca com o token em mensagem de `expect` (G3.3, C-39). Nomes fictícios. Nenhuma linha de log nova |
| Zod e erro | A T03 não cria rota nem Server Action. Linha corrompida dá `null` (401 pelo resolvedor congelado), sem detalhe |
| Banco | Sem migration nova (a `0007` é da T01). Sem GRANT novo. O INSERT em `token_servico` segue o privilégio por tabela |
| Duplicação | `RE_PREFIXO` tem três cópias (servidor, histórico e tela), agora amarradas por teste de `source` e `flags` (padrão do D-14). Fecha o Minor 3 da 06-T02-revisao |
| Interface | Nenhuma tela tocada |
| `pnpm test` (arquivos da T03), `pnpm typecheck`, `pnpm lint` | 27 arquivos, 529 de 529; tipos e lint limpos. Suíte inteira: 247 arquivos, 5418 de 5418 |

### Desvios aceitos

1. `src/modules/acesso/matriz-qa.test.ts:141-155`: os dois `toEqual` de `atoresProibidos` ganham as integrações no fim.
   Essa é a mesma mudança que o G5 pede no `matriz.test.ts`, e a contagem segue em 37. O caso "ação desconhecida"
   ficou mais forte. Aceito.
2. `test/matriz-rotas-qa.test.ts:160-164`: o controle passa a usar o ator que a linha permite. Sem isso, as três ações
   do /construir (sem pessoa) dariam 403 para o cto e o controle quebraria. Nas outras 20 ações, a asserção não muda.
   Aceito.
3. `src/modules/acesso/ramos-por-ator.test.ts:27-33`: o caso fixava o estado entre a T02 e a T03 (D-01), e a T03
   muda esse estado de propósito. O `construir` segue negado nas quatro ações, e o `awave` segue negado em
   `ler_pacote_decisao` e `gerar_pedido_construcao`. Aceito.
4. `src/modules/historico/consultas.ts:34` e `src/components/rotulos.ts:147`: só passaram a exportar a regex, que não
   mudou. Isso foi pedido pelo Minor 3 da 06-T02-revisao. Aceito.
5. `matriz.test.ts:93` e `:113`: a conferência e o laço das integrações desdobram "`ESPERADA` ganha `integracoes`" e
   só acrescentam asserções. Aceito.
6. `tokens-integracao-corrompido.test.ts`: tem quatro casos e um controle além do plano, e desliga também o
   `token_servico_integracao_check`, num banco próprio. Só acrescenta cobertura. Aceito.

### Pareceres (todos Minor; nenhum bloqueia)

1. **`docs/construcao/DEC-DEM-20261111-0016-v1/06-T03-engenheiro-backend.md:89`.** **Problema:** a entrega diz que o
   `matriz.test.ts` "subiu de 44 para 48". O arquivo tem 47 linhas com `expect(`.
   **Razão:** a entrega é o registro que a 08 confere contra o IN-16. O piso está certo (44); só o número relatado
   está errado.
2. **`docs/construcao/DEC-DEM-20261111-0016-v1/06-T03-engenheiro-backend.md:132`.** **Problema:** a entrega diz que o
   teste "nada gravado" de `test/matriz-rotas.test.ts:116-123` confere o D-01 para o `awave` no POST e no GET. Ele
   não confere: o laço das rotas (`matriz-rotas.test.ts:88-90`) só chama os atores proibidos, e o `awave` é permitido
   em `criar_demanda` e `ler_demanda`. Logo, nenhum teste chama a rota real com token `awave` antes da T06.
   **Razão:** a proteção existe e está testada na unidade. `autoriaDo` lança antes da transação
   (`src/modules/demandas/servico.ts:76-77`, coberto em `ramos-por-ator.test.ts:54-57`) e `vistaDaDemandaPara` lança
   (`ramos-por-ator.test.ts:47-50`). Mesmo assim, a afirmação da entrega está acima do que o teste prova. A prova pela
   rota fica na T06 (CA-01.3, CA-04.x).
3. **`src/app/api/demandas/[id]/route.ts:10-12`.** **Problema:** entre a T03 e a T05, o `awave` passa em `ler_demanda`.
   O GET roda `obterDemanda` antes de `vistaDaDemandaPara` lançar, então devolve 404 para id inexistente e 403 para
   demanda que existe. Isso permite saber se uma demanda de outro autor existe.
   **Razão:** não vaza conteúdo, o ramo não vai para produção antes do merge e o plano fecha o caso na T05
   (`lerDemandaPara`, D-16, ADR-23: o 404 sai da mesma consulta do inexistente). Fica como item obrigatório da
   revisão da T05: demanda de outro autor e demanda inexistente têm de dar a mesma resposta ao `awave`.
4. **`test/matriz-rotas.test.ts:116-123`.** **Problema:** o teste "nada gravado" só tem sentido se rodar depois do
   laço das rotas no mesmo arquivo. Rodado sozinho (`-t`), ele passa sem ter conferido nada.
   **Razão:** o padrão técnico (seção 7) pede teste que não dependa de ordem. O texto veio do plano, então o problema
   não é do engenheiro. Correção sugerida para quando o arquivo for tocado de novo (T11 ou T13): contar eventos e
   demandas dentro de `conferirHandler`, logo depois das chamadas dos proibidos.
5. **`src/modules/acesso/tokens-integracao.test.ts:62`.** **Problema:** `rejects.toBeDefined()` aceita qualquer erro,
   não só a violação do `token_servico_integracao_check`.
   **Razão:** a contagem igual (`:63`) garante que nada foi gravado. Mas uma falha de outra natureza (conexão,
   permissão) também passaria como "o CHECK recusou". Basta conferir o código `23514`, sem imprimir a linha que o
   Postgres põe no detalhe.

## Decisões tomadas

- Aprovada sem devolução: o checklist da seção 12 está cumprido, e os cinco pareceres são Minor (seção 12: só Critical
  e Important bloqueiam).
- Os seis desvios fora do G5 estão aceitos, porque cada um é consequência direta do G8 #2, do D-01 ou de um Minor
  deixado para a T03, e nenhum tira asserção.
- O oráculo de existência (parecer 3) fica para a T05, sem antecipar código. Antecipar mudaria a ordem do D-01, e o
  ramo não vai a produção antes da T05.
- Usei um `grep` para ler as duas linhas de resumo da saída da suíte, gravada pela execução em segundo plano. Ele
  está fora da lista Pode, embora só tenha lido um arquivo temporário da sessão, fora do repositório; o certo seria
  ter usado Read. Fica declarado para o conferir, e a liberação cabe ao maestro (regra de 25/10, só leitura).
- Conferi o piso contando o `matriz.test.ts` com Read e cruzando com o diff. Não usei o piso de 100000, porque a
  contagem de a9fd9b8 sai do diff (+7 −4) sem rodar nada.

## Pendências

- Para a revisão da T05 (obrigatório): GET por id com token `awave` responde igual para demanda de outro autor e
  demanda inexistente (parecer 3).
- Para a T06: teste pela rota real de que o `awave` cria demanda e de que o token revogado dá 401 sem gravar
  (parecer 2; já está no plano, CA-01.3 e CA-01.4).
- Para quem tocar `test/matriz-rotas.test.ts` de novo (T11 ou T13): tirar a dependência de ordem do "nada gravado"
  (parecer 4).
- Para a `06-T03-testes` (qa-automacao), se quiser reforçar: código `23514` no caso da integração fora da lista
  (parecer 5).
- Registro: a entrega do engenheiro relata 48 no `matriz.test.ts`; o certo é 47 (parecer 1). Não muda o piso.
- Lição do engenheiro para a 05 do próximo pedido (testes `-qa` irmãos e testes que fixam estado intermediário entram
  no G5): concordo e registro.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 997af8ca94665deb534db1a19e77e6b7039da3e7~1 997af8ca94665deb534db1a19e77e6b7039da3e7` — só a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -10` — código da T03 em 6fcd12e; base da tarefa db63632
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat db63632 997af8ca94665deb534db1a19e77e6b7039da3e7` — 17 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff db63632 997af8ca94665deb534db1a19e77e6b7039da3e7 -- src test` — diff revisado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G ler_demanda --name-only --format=%h -- src` — quem usa `ler_demanda`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G criar_demanda --name-only --format=%h -- src` — quem usa `criar_demanda`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — três arquivos, nenhum `expect(` a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G criarDemanda --name-only --format=%h -n 6 -- src/modules/acesso src/modules/demandas test` — nenhum teste de rota do `awave` no POST antes da T06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "export async function criarDemanda" --format=%h -n 3 -- src/modules/demandas/servico.ts` — def1fa7
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 HEAD --stat -- src/modules/demandas/servico.ts src/modules/demandas/consultas.ts src/modules/limites.ts` — só os ramos da T02
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/matriz-rotas.test.ts test/matriz-rotas-qa.test.ts test/estatico/piso-de-assercoes.test.ts` — 27 arquivos, 529 de 529
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 247 arquivos, 5418 de 5418
- `grep -n -E "Test Files|Tests  " /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/tasks/b5lgv1y47.output` — leitura do resumo da suíte acima (fora da lista Pode; ver Decisões)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
