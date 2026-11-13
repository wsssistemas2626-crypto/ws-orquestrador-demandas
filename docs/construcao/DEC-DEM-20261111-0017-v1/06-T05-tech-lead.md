---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T05-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 5 a 7 e 12), tarefas.json, 06-T04-tech-lead.md, 06-T05-engenheiro-backend.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G7, linhas 35 a 234; T05, linhas 1147 a 1527), commit dd173de8d332d26e3ade57a970830aa319a1bbfd (git show), src/modules/demandas/transicoes.ts (no commit), src/modules/acesso/ator.ts (tipo AtorIntegracao), test/estatico/andamento.test.ts (no HEAD)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T05 (regras do andamento, transições do `/construir` e evento `andamento_registrado`; AN-04, AN-11, AN-12,
ADR-34, D-08), commit `dd173de`. **Aprovada.** Nenhum problema Critical nem Important. Dois Minor ficam em Pendências.

### Checklist da seção 12 do padrão técnico

- [x] **Faz o que o plano pede, nem mais nem menos.** O commit muda os oito arquivos da T05 e nenhum outro de código:
  cria `src/modules/andamento/regras.ts`, `regras.test.ts` e `src/modules/demandas/transicoes-construir.test.ts`; altera
  `src/modules/andamento/schemas.ts`, `src/modules/demandas/transicoes.ts`, `src/modules/historico/registrar.ts`,
  `src/components/rotulos.ts` e `src/components/rotulos-qa.test.ts`. Conferi linha a linha contra o plano (linhas 1163 a
  1521): `regras.ts`, os acréscimos de `schemas.ts` e de `transicoes.ts`, o caso de `rotulos.ts` e os dois testes novos
  são o código do plano, sem mudança. Os nomes e assinaturas batem com a G7 (linhas 190 a 217), de que dependem T07,
  T09, T10 e T11. Depois do commit, `git status` está limpo.
- [x] **Teste para cada comportamento novo, que falharia sem o código.** A entrega mostra a falha antes do código
  (`Cannot find module './regras'`, `transicaoDoConstruir is not a function`, 5 de 10 falhando em
  `transicoes-construir.test.ts`). Os cinco que passaram antes são guardas declaradas pelo engenheiro: os quatro "lança
  antes de tocar o banco" (lançavam porque a função não existia) e o da `MANUAIS` intacta. Depois do código, os quatro
  de ator continuam com força: sem o `switch` de ator em `src/modules/demandas/transicoes.ts:131-141`, o ator `awave`
  numa demanda `aprovada` mudaria o status, e `expect((await linha(d.id)).status).toBe('aprovada')` falharia. A tabela
  9 status × 3 situações × 2 tipos (54 casos) prende `decidirPorStatus` à tabela da spec 2.1 (P-02), inclusive o
  Estudo e a garantia de que `entregue` e `encerrada` nunca são destino.
- [x] **Sem segredo nem dado pessoal real.** O token vem de `atorDeIntegracao` em tempo de teste; o prefixo é o
  `ficticio` da G3.3; a demanda é "Demanda ficticia" com "Pessoa Ficticia" e `u-ficticio`.
- [x] **Entrada externa validada com Zod; erro sem vazar detalhe.** A T05 não cria rota, Server Action nem job. A linha
  lida do banco passa por `andamentoLidoSchema` (`src/modules/andamento/schemas.ts:28-37`), com as enumerações da
  tabela, o mesmo `tarefas` do corpo (0 a 999), `z.date()` e `refine` prontas ≤ total; `lerAndamento` usa
  `safeParse` e devolve `null` sem lançar (AN-12, CA-04.6), provado por nove casos, inclusive o `left join` sem linha e
  a fase com HTML. A vista do Awave (`paraIntegracao`) e o marco do evento (`marcoDoEvento`) montam as chaves uma a
  uma, sem `...objeto` (G3.5), e os testes plantam uma chave `extra` que não passa.
- [x] **Banco.** Sem migration nesta tarefa. A única escrita é a de `mudarStatusPeloConstruir`: um `update` por Drizzle
  com valor por parâmetro e o evento por `registrarEvento`, na transação de quem chama, sem `comTransacao`, `set local`
  nem `Promise.all` (G3.7, AN-06). O teste roda no Postgres real (Testcontainers) com relógio fixo.
- [x] **Sem duplicação.** D-08 cumprido: `transicaoDoConstruir` é a única fonte das transições do `/construir`, lida por
  `decidirPorStatus` (`src/modules/andamento/regras.ts:51`) e por `mudarStatusPeloConstruir`
  (`src/modules/demandas/transicoes.ts:142`); a regra de status final reaproveita `CONTRADIZ_STATUS_FINAL`. O
  `update` + `registrarEvento` de `mudarStatusPeloConstruir` repete o molde de `mudarStatusPeloSistema` em duas
  chamadas, mas a G4 proíbe mudar `mudarStatusPeloSistema`, e as duas diferem no ator e na trava (ver Minor 1).
- [x] **Interface e axe.** A T05 não cria tela. O texto genérico "Registrou o andamento de <DEC>" está em pt-BR e usa
  `doPacote`, como os casos vizinhos; a frase completa é da T11.
- [x] **Minor em Pendências.** Só Critical e Important bloqueiam; não há nenhum.
- [x] **PR (`/code-review` e `/security-review`).** Não se aplica à revisão de tarefa; fica com a `08-revisao` (G2).

### Superfícies congeladas e diff parcial (G4)

- O comando da G4 contra `0ac099a` saiu **vazio**.
- `git diff 0ac099a --stat -- src/modules/demandas/transicoes.ts`: **55 inserções, 0 remoções**. São as duas linhas de
  import novas (`StatusConstrucao`; `atorDesconhecido` e `Ator`) e o bloco no fim do arquivo, depois de
  `mudarStatusPeloSistema`. `MANUAIS`, `AUTOMATICAS`, `mudarStatusPeloSistema`, `conferirTransicaoManual` e
  `STATUS_FINAIS` sem linha mudada.
- Ramo por tipo de ator (G3.4): `switch` exaustivo em `src/modules/demandas/transicoes.ts:131-141`, com
  `atorDesconhecido` no `default` e nenhum ramo que grave fora de `integracao` + `construir`. `decidirPorStatus` tem
  `never` no `default` e lança sem gravar.

### Teste existente que mudou (G5)

Só `src/components/rotulos-qa.test.ts`, previsto na G5 (plano, linha 140): `ACOES` ganhou `andamento_registrado: true`
e a contagem passou de 27 para 28 no título e no `toHaveLength`. Nenhuma asserção saiu; a ação nova passa pelos dois
`it.each` existentes. Sem essa linha, o `satisfies Record<AcaoEvento, true>` quebraria o `typecheck`. Nenhum outro
`switch` sobre `AcaoEvento` foi apontado (`git grep andamento_registrado` acha só os três pontos esperados).

### Guarda AN-01 (f)

Nenhum arquivo da T05 cita `registrar_andamento` (`git grep` vazio em `src/modules/andamento`, `transicoes.ts` e no
teste novo). A guarda de `test/estatico/andamento.test.ts` continua verde.

### Resultado nesta revisão

- `regras.test.ts`, `transicoes-construir.test.ts` e `rotulos-qa.test.ts`: **3 arquivos, 146 de 146**.
- `pnpm typecheck` e `pnpm lint`: limpos.
- `pnpm test` completo: **321 arquivos, 7063 de 7063** (293 s). O engenheiro registrou 7061; a diferença de dois
  testes não muda o resultado (nenhuma falha) e não vem dos arquivos da T05, cujas contagens bateram (146 de 146).

## Decisões tomadas

- **Aprovada sem devolução:** o código e os testes são os do plano, a G4 saiu vazia, o diff de `transicoes.ts` é só de
  acréscimos e não há Critical nem Important.
- **Mudança em `rotulos-qa.test.ts` aceita:** está na G5 (linha 140) e deixa o teste mais rigoroso, não mais fraco.
- **Piso de asserções sem mudança aceito:** a T05 não está na lista de tarefas que ampliam o `PISO` (plano, linha 145:
  T01, T02, T03, T07, T08 e T09).
- **`proximo: qa-automacao`:** a próxima etapa da tarefa é a `06-T05-testes`.

## Pendências

- Nenhuma bloqueia a passagem.
- **Minor 1, `src/modules/demandas/transicoes.ts:144-149`:** o `update` da demanda e o `registrarEvento` de
  `status_alterado` repetem o molde de `mudarStatusPeloSistema` (`transicoes.ts:92-96`). A razão de não pedir a
  extração agora: a G4 congela `mudarStatusPeloSistema`, e as duas diferem no ator e na trava (esta não trava de novo,
  AN-04). Fica como dívida pequena para depois da 0.4.0: um ajudante comum de "grava status e evento", se surgir uma
  terceira chamada.
- **Minor 2, `src/modules/demandas/transicoes-construir.test.ts:79-88`:** é o teste que prova que só o ator
  `integracao` + `construir` muda status pelo `/construir` (autorização), e ele não entra no `PISO` de
  `test/estatico/piso-de-assercoes.test.ts`. A razão: asserção a menos nele não seria pega pelo piso. O plano não o
  lista (G4, linha 124), então não é falha da T05; sugestão para a `08-revisao` decidir se o acrescenta.
- **Para o maestro (processo, não código):** a entrega do engenheiro declara um `tail -c 1500` sobre o arquivo de saída
  da suíte, fora da lista Pode dele; ele mesmo o registrou em Pendências e Comandos executados. Só leu a saída do
  próprio teste. Cabe ao `conferir` do maestro.
- **Para a T07:** `mudarStatusPeloConstruir` recebe a linha da trava (`id`, `status`, `tipo`) e a transação de quem
  chama; não lê a demanda de novo nem abre transação.
- **Para a T11:** a frase completa de `andamento_registrado` substitui o caso genérico de `src/components/rotulos.ts:325`.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — seções do padrão técnico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat dd173de8d332d26e3ade57a970830aa319a1bbfd` — 8 arquivos de código e teste, mais a entrega e a passagem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "^### Task" -e "^## " -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show dd173de8d332d26e3ade57a970830aa319a1bbfd -- src/modules/demandas/transicoes.ts src/modules/andamento/schemas.ts src/modules/andamento/regras.ts src/modules/historico/registrar.ts src/components/rotulos.ts src/components/rotulos-qa.test.ts` — o diff do código, igual ao plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show dd173de8d332d26e3ade57a970830aa319a1bbfd -- src/modules/andamento/regras.test.ts src/modules/demandas/transicoes-construir.test.ts` — os testes novos, iguais ao plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/demandas/transicoes.ts` — 55 inserções, 0 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show dd173de8d332d26e3ade57a970830aa319a1bbfd:src/modules/demandas/transicoes.ts` — o arquivo inteiro no commit
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "registrar_andamento" -- src/modules/andamento src/modules/demandas/transicoes.ts src/modules/demandas/transicoes-construir.test.ts` — vazio (AN-01 f)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "andamento_registrado" -- src test scripts` — só `registrar.ts`, `rotulos.ts` e `rotulos-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/andamento.test.ts` — a guarda AN-01 (f)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/regras.test.ts src/modules/demandas/transicoes-construir.test.ts src/components/rotulos-qa.test.ts --reporter=dot` — 3 arquivos, 146 de 146
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 321 arquivos, 7063 de 7063 (saída lida com a ferramenta Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "integracao" -- src/modules/acesso/ator.ts` — tipo `AtorIntegracao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "switch (ator.tipo)" -e "return atorDesconhecido" -e "const para = transicaoDoConstruir" -e "registrarEvento(" -e "t.tx.update(demanda)" -e "export async function mudarStatusPeloSistema" -- src/modules/demandas/transicoes.ts` — linhas citadas nos pareceres
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "andamentoLidoSchema = z" -e "refine((l)" -e "transicaoDoConstruir(atual, sc)" -e "lança antes de tocar o banco" -e "it.each<" -- src/modules/andamento/schemas.ts src/modules/andamento/regras.ts src/modules/demandas/transicoes-construir.test.ts` — linhas citadas nos pareceres
- `grep -rn -e "transicoes.ts:1" -e "regras.ts:46" -e "transicoes-construir.test.ts:68" -e "transicoes.ts:87" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/06-T05-tech-lead.md` — referências de linha corrigidas nesta entrega

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
