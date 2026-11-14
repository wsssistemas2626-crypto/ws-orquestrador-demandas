---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T06-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T06), 04-seguranca-aplicacao.md (SB-11, por git grep), 06-T06-engenheiro-backend.md, commit 9318e10 (git diff), src/modules/demandas/arquivamento.ts, src/modules/demandas/transicoes.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/demandas/arquivamento.test.ts, src/modules/demandas/arquivamento-status.test.ts, src/modules/pacotes-decisao/arquivar-com-vigente.test.ts, test/estatico/arquivamento.test.ts, src/modules/demandas/servico.test.ts (linhas 415 a 474), src/modules/pedido-construcao/gerar.test.ts (linhas 298 a 327), saída do pnpm test em /tmp]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Parecer da T06 (SB-11, risco alto), commit `9318e10`. O ramo está em `3b4e062`, e os dois commits depois de `9318e10`
só mexem em `passagens.jsonl`, então o código revisado é o mesmo que foi testado. **Não há problema Critical nem
Important. A tarefa passa.** Os Minor estão em Pendências.

### SB-11: o arquivamento nunca leva a `aprovada` com o vigente desatualizado ou com aprovação incompleta

- **Tabela fechada.** `src/modules/demandas/arquivamento.ts:31-53`: `destinoDoArquivamento` é um `switch` com `never` nos
  nove status. `destinoNasOrigens` (`:15-28`) é outro `switch` com `never` nos três estados. `aprovada` só sai do caso
  `atualizado` (`:19-20`). `desatualizado` vai a `em_analise` (`:21-22`). De `em_analise` com o vigente desatualizado, o
  resultado é `null`, sem evento (`:37-41`). Os cinco status de fora das origens dão `null`. O código é o do plano, sem
  mudança.
- **Aprovação incompleta não conta.** `vigenteDaDemanda` (`src/modules/pacotes-decisao/substituido.ts:49-58`) só lê DEC
  com linha em `decisao` e `status_decisao = 'aprovada'`. Essa linha só nasce em `fecharAprovacao`. A primeira das duas
  aprovações volta `aprovacao_parcial` antes (`decidir.ts:212`) e não grava `decisao`. O teste SB-11 (c)
  (`arquivar-com-vigente.test.ts:215-223`) confere: `vigenteDaDemanda` dá `null` e a demanda vai a `encerrada`.
- **Mesmo predicado da transição manual.** O `atualizado` vem do aprovado de maior versão sem `expressaoDesatualizado`.
  Quando ele vale, `temPacoteAprovadoAtualizado` (`desatualizado.ts:14-22`) também vale. O contrário (um aprovado antigo
  atualizado com o mais novo desatualizado) não acontece, porque o DEC mais novo cita versões iguais ou maiores. A guarda
  E7 de `substituicao.test.ts:430` cobre isso. O CA-03.1 (`arquivar-com-vigente.test.ts:149`) confere o predicado direto.
  O arquivamento não é atalho para `aprovada`.
- **Vigente desatualizado vai a Em análise (P1, 7.1).** O teste 7.1 (`arquivar-com-vigente.test.ts:195-213`) confere
  `em_analise` vindo de `pronta_para_decisao`, com evento do Sistema. Com a demanda já em `em_analise`, ela continua lá e
  não há evento novo.
- **Ordem sob a trava.** Em `decidir.ts`, a ordem é `travarDemanda` (`:232`) → `gravarDecisao` (`:250`) →
  `vigenteDaDemanda(tx, …)` (`:254`) → `mudarStatusPorArquivamento(tr, …)` (`:255`), tudo na mesma transação `tr`.
  `mudarStatusPorArquivamento` (`transicoes.ts:103-119`) trava de novo, decide pelo status da linha travada e grava pelo
  ator `{ tipo: 'sistema' }`. Destino nulo ou igual ao atual não grava nada. A guarda estática
  `test/estatico/arquivamento.test.ts:59-79` prende a ordem, e cada regra tem um caso plantado que a reprova.
- **Concorrência.** O SB-11 (d) roda nas duas ordens, com espera real na trava por `pg_stat_activity`. Em (i), a ESP
  chega antes e o resultado é `em_analise`. Em (ii), o arquivamento chega antes e o resultado é `aprovada`, com o evento
  de status antes da ESP v2. O SB-11 (e) roda 50 repetições, sem `40P01`, e só aceita os dois desfechos do plano.
- **Superfícies congeladas (G4).** O comando da G4 saiu vazio. Os diffs parciais desde `41108ee` são os da G4:
  - `transicoes.ts`: tipo e `AUTOMATICAS` sem `decisao_arquivada`, a função nova, a importação e o comentário do topo.
    `MANUAIS`, as três automáticas restantes, `mudarStatusPeloSistema` e as funções do `construir` não mudaram.
  - `decidir.ts`: só o ramo de devolvida/arquivada, as importações e o item 7 do comentário.
  - `substituido.ts`: só o acréscimo e a importação.
  - `piso-de-assercoes.test.ts`: só acréscimos (46 linhas a mais e nenhuma a menos desde `41108ee`).

### A linha `decisao_arquivada` no `it.each` de `servico.test.ts`

A linha saiu de `servico.test.ts:430` e nenhuma asserção se perdeu:
- A expectativa da linha antiga está na coluna `nenhum` de `arquivamento-status.test.ts`: das quatro origens vai a
  `encerrada`, com `status_alterado` do ator sistema e `antes` e `depois`; dos outros cinco status, nada muda e não há
  evento.
- A coluna é conferida em dois lugares:
  - `arquivamento-status.test.ts:67-70`: o teste compara a coluna, status a status, com a regra antiga.
  - `arquivamento-status.test.ts:72-94`: o teste roda os nove status pelo banco, com as mesmas asserções do
    `it.each` antigo (`toMatchObject` de `status` e `atualizadaEm`, e o `objectContaining` do evento com
    `atorTipo`, `atorId`, `atorTokenPrefixo`, `antes`, `depois` e `ocorridoEm`). Ganha mais duas: o retorno e o
    `atualizada_em` inalterado quando nada muda.
- As linhas com `expect(` de `servico.test.ts` são 77, o mesmo número de `41108ee`. As de `substituicao.test.ts`
  continuam 113: a G5 só mudou o comentário da linha 146.

### Piso, testes e ferramentas

- `PISO`: as quatro entradas novas (10, 14, 49 e 29) batem com o `git grep -c "expect("` de cada arquivo.
- Os testes da T06 e os vizinhos (`servico`, `substituicao`, `decidir`, `gerar`, `transicoes` e o piso) passaram:
  10 arquivos, 359 de 359.
- `pnpm test` inteiro passou: 375 arquivos, 8113 de 8113, em 240 s. A entrega do engenheiro diz 8112, um teste a menos.
  Como o código não mudou depois de `9318e10`, a diferença não afeta o parecer.
- `pnpm lint` e `pnpm typecheck` saíram limpos.
- TDD: a entrega mostra o comando e o trecho da falha antes do código (19 testes falharam). Os 6 que já passavam antes
  têm razão escrita: os casos plantados, o devolver e o "fora das origens", que a regra antiga já cumpria.

### Desvios do engenheiro, aceitos

1. **Vigente lido numa linha própria em `decidir.ts:254`.** A semântica é a mesma do plano. Do jeito do plano, a guarda
   estática de ordem, que o próprio plano pede, reprovaria o código.
2. **Texto do comentário do topo de `transicoes.ts`.** O sentido é o mesmo. A G4 permite mexer nesse comentário.
3. **SB-11 (e) em 5 lotes de 10.** São as mesmas 50 repetições e as mesmas asserções, e assim nenhum tempo-limite
   precisou subir (G3.2).
4. **Recusa do S-01 conferida no CA-03.5.** É uma asserção a mais, pedida entre parênteses no plano.

## Decisões tomadas

- A T06 passa (`pronto`): todos os itens do checklist da seção 12 estão cumpridos e não há Critical nem Important.
- Os quatro desvios ficam aceitos. Nenhum muda o comportamento, e o primeiro é exigido pela guarda do próprio plano.
- A duplicação em `transicoes.ts` e `substituido.ts` fica como Minor e vai para a dívida técnica. A G4 congela
  `mudarStatusPeloSistema` e `aprovadoVigente`, e a única forma de não duplicar seria mexer neles.
- A mudança no `it.each` de `servico.test.ts` é mudança de forma, sem perda de asserção. Fica ratificada nesta revisão e
  segue para a 08 confirmar, como pede a G5.

## Pendências

- Minor (dívida técnica), `src/modules/demandas/transicoes.ts:112-117`: o `update` e o `registrarEvento` do ator sistema
  repetem `:92-97` (`mudarStatusPeloSistema`). Razão: a G4 congela `mudarStatusPeloSistema`, então extrair um auxiliar
  comum (por exemplo `gravarStatusPeloSistema`) fica para um pedido futuro. Custo: cerca de 1 h com o teste de hoje.
- Minor (dívida técnica), `src/modules/pacotes-decisao/substituido.ts:49-58`: `vigenteDaDemanda` repete a consulta de
  `aprovadoVigente` (`:28-37`) com uma coluna a mais. Razão: a G4 só aceita acréscimo nesse arquivo. Quando ele for
  liberado, `aprovadoVigente` pode delegar a `vigenteDaDemanda`.
- Minor, `src/modules/pedido-construcao/gerar.test.ts:318`: o comentário ainda cita o nome da transição antiga
  (`decisao_arquivada`). O comportamento que ele descreve continua certo, porque o teste arquiva sem vigente. A G5 não
  lista esse arquivo, então ele fica sem mudança nesta tarefa. Quem tocar o arquivo depois troca o nome por
  `mudarStatusPorArquivamento`.
- Para a T11 (fora da T06): os comentários de `e2e/decisao.spec.ts:459` e `:465` citam `decisao_arquivada`. O teste
  muda de demanda na T11 (G5).
- Para a `10-documentacao` (G2): `docs/manual-tecnico/03-demandas.md:270` e `docs/manual-tecnico/04-versoes-e-decisao.md:278`
  ainda descrevem a transição `decisao_arquivada` indo sempre a `encerrada`.
- Para a 08 confirmar (G5): a linha `decisao_arquivada` saiu do `it.each` de `servico.test.ts`, já ratificada acima.
- Registro: um comando desta etapa (o 1º da lista abaixo) passou por engano o caminho absoluto do `padrao-tecnico.md`, que
  fica fora do repositório do sistema. O git recusou e não leu nada; o arquivo foi lido depois com Read.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## 12" -- /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/padrao-tecnico.md` — recusado pelo git (caminho fora do repositório), sem leitura
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 9318e10c7a50b6996f0ff07abbe59453041a635b~1 9318e10c7a50b6996f0ff07abbe59453041a635b --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Task T06" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T06" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 9318e10c7a50b6996f0ff07abbe59453041a635b~1 9318e10c7a50b6996f0ff07abbe59453041a635b -- src/modules/demandas/arquivamento.ts src/modules/demandas/transicoes.ts src/modules/pacotes-decisao/decidir.ts src/modules/pacotes-decisao/substituido.ts src/modules/demandas/servico.test.ts src/modules/pacotes-decisao/substituicao.test.ts test/estatico/piso-de-assercoes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-11" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee 9318e10c7a50b6996f0ff07abbe59453041a635b --stat -- src/modules/demandas/transicoes.ts src/modules/pacotes-decisao/decidir.ts src/modules/pacotes-decisao/substituido.ts src/modules/demandas/servico.test.ts src/modules/pacotes-decisao/substituicao.test.ts test/estatico/piso-de-assercoes.test.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/arquivamento.test.ts src/modules/demandas/arquivamento-status.test.ts src/modules/pacotes-decisao/arquivar-com-vigente.test.ts test/estatico/arquivamento.test.ts src/modules/demandas/servico.test.ts src/modules/pacotes-decisao/substituicao.test.ts src/modules/pacotes-decisao/decidir.test.ts src/modules/pedido-construcao/gerar.test.ts test/estatico/piso-de-assercoes.test.ts src/modules/demandas/transicoes.test.ts --reporter=dot` — 359 de 359 (10 arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 8113 de 8113 (375 arquivos), em segundo plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "temPacoteAprovadoAtualizado" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "decisao_arquivada"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" 41108ee -- src/modules/demandas/servico.test.ts src/modules/pacotes-decisao/substituicao.test.ts` — 77 e 113
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- src/modules/demandas/servico.test.ts src/modules/pacotes-decisao/substituicao.test.ts src/modules/demandas/arquivamento.test.ts src/modules/demandas/arquivamento-status.test.ts src/modules/pacotes-decisao/arquivar-com-vigente.test.ts test/estatico/arquivamento.test.ts` — 77, 113, 10, 14, 49, 29
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 9318e10c7a50b6996f0ff07abbe59453041a635b 3b4e062 --stat` — só `passagens.jsonl`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido:
  - [x] a tarefa faz o que o plano pede, nem mais nem menos; os arquivos são os da T06 e da G5, e a G4 saiu vazia
  - [x] há teste para cada comportamento novo, e ele falharia sem o código (falha mostrada antes do código; casos plantados no estático)
  - [x] não há segredo, valor de `.env` nem dado pessoal real (nomes "Pessoa Ficticia", `DOC-FICTICIO-018`, títulos "(fictício)")
  - [x] nenhuma entrada externa nova; `registrarDecisaoSchema` não mudou; os erros são os de hoje
  - [x] banco: nenhuma migration nem tabela nova
  - [x] nada duplica função que já existe; as duas repetições de trecho que existem são impostas pela G4 e estão em Pendências como Minor
  - [x] nenhuma tela tocada nesta tarefa (os textos e o axe ficam nas T11 a T14)
  - [x] os Minor estão em Pendências; não há Critical nem Important
  - [x] o item do PR (`/code-review` e `/security-review`) é da `08-revisao` (G2), não desta etapa
