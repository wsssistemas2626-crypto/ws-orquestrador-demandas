---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T06-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T05 a T08), scripts/seed-ficticio.ts, scripts/scripts.test.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/schemas.ts, src/modules/pareceres-risco/servico.ts, src/modules/pareceres-risco/schemas.ts, src/modules/demandas/schemas.ts, src/modules/limites.ts, src/db/schema/decisao.ts, src/db/schema/versoes.ts (NIVEIS_RISCO), src/agents/consolidacao.ts, src/agents/insumo-tecnico.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/sem-recurso-externo.test.ts, test/estatico/decisao-e2e.test.ts, e2e/apoio.ts, e2e/preparacao.ts, e2e/decisao.spec.ts (cabeçalho e idDoDecDeRascunhoDoSeed), e2e/axe-todas.spec.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T06, seed fictício das demandas dos e2e novos (D-07, G3.10). Só `scripts/` mudou; nenhum arquivo de `src/`, nenhuma
superfície congelada do G4 e nenhuma regra de `src/modules/`.

### Arquivos alterados

- `scripts/seed-ficticio.ts`
  - `TITULOS_DO_E2E` ganha as oito chaves da tabela da T06: `textoDeTerceiro`, `etapasSemVersoes`, `etapasDupla`,
    `decisaoOpcaoB`, `decisaoDevolverComOpcao`, `decisaoCelularCto`, `decisaoCelularDupla`, `decisaoRecomendaB`. Os
    títulos são os do plano, letra a letra. O U+202E do `textoDeTerceiro` está escrito como `‮` no código.
  - `RECOMENDACAO_DO_E2E = 'Recomendo a opção B (fictício).'` é exportada para o e2e da T13 procurar o texto sem
    copiá-lo.
  - `DEMANDAS_DO_E2E` ganha as oito demandas: tipo `melhoria`, linha `sob_medida`, solicitante `Pessoa Ficticia Produto`,
    papel `produto`, cada uma com contexto, porque a descrição do Pedido sai do contexto. Elas são criadas pela conta
    `sem2fa`, como as dez de antes. `TOTAL_DEMANDAS_DO_SEED` continua derivado e agora vale 23.
  - A função nova `criarVersoesDoE2E` roda na mesma transação do seed, depois das demandas, e usa os serviços de hoje
    (`criarEspecificacao`, `criarParecerRisco`, `criarPacoteDecisao`, `registrarDecisao`). Toda entrada passa pelo
    schema Zod da rota:
    - `etapasDupla` recebe a ESP v1, o RSK v1 e o DEC v1 de pessoa, nível `cto_e_administradora`, mais a aprovação do
      CTO na opção A pela conta `cto`. O DEC fica pendente, com uma de duas aprovações e sem linha em `decisao`.
    - `decisaoRecomendaB` recebe a ESP, o RSK e o DEC de agente (`insumo_tecnico`, `risco`, `consolidacao`), como a
      primeira demanda. O DEC é a saída de exemplo da consolidação com a recomendação trocada por
      `RECOMENDACAO_DO_E2E`, conferida de novo por `criarPacoteDecisaoSchema`, no nível `NIVEL_DO_DEC_DE_AGENTE`.
- `scripts/scripts.test.ts`: é o teste do seed que já existia, e o plano manda mudá-lo porque ele conta as demandas.
  Cada mudança em asserção que já existia está abaixo:
  - linhas 365 a 376: `TOTAL_DEMANDAS_DO_SEED` passou de 15 para 23. A consulta do `comPacote` ganhou
    `where demanda_titulo <> all($1)`, com os títulos do e2e. A asserção continua a mesma (um único DEC fora do e2e, o
    de agente da primeira demanda); os DECs das demandas do e2e têm teste próprio.
  - no teste "as demandas próprias do e2e": as 16 demandas sem versão continuam conferidas como antes (`nova`, 0, 0, 0,
    autora `sem2fa`). `etapasDupla` e `decisaoRecomendaB` passam a ser conferidas como `pronta_para_decisao` com 1, 1
    e 1. Uma asserção nova garante que só essas duas saem da regra. `toHaveLength(10)` passou a 18.
  - no teste "duas subidas ao mesmo tempo" (qa-automacao T33): antes ele esperava um aviso e um job, agora espera três,
    um por DEC, todos pendentes e com payload só `{ decId }` (C-22). A asserção de antes ficou de pé para o DEC de
    agente da primeira demanda, filtrada pelo id dele, e a contagem de DECs (3) foi acrescentada.
  - Nenhuma asserção foi apagada. O arquivo não está na lista do piso de asserções (CV-20).

### Testes criados (em `scripts/scripts.test.ts`, bloco "seed fictício")

1. `T06: os oito títulos dos e2e novos, cada um uma vez, melhoria, sob_medida e só com dado fictício`: confere os oito
   títulos exatos, "(fictício)" em cada um, uma linha por título, tipo, linha, solicitante `Pessoa Ficticia …`,
   contexto preenchido, e que o título com marcação é gravado como veio.
2. `T06: etapasDupla tem ESP v1, RSK v1 e um DEC v1 de pessoa, cto_e_administradora, pendente, com a aprovação do CTO
   na opção A`: uma aprovação só, papel `cto`, opção A, registrada pela conta `cto@ficticio.test`, sem referência a
   documento. Nenhuma decisão gravada e um evento `aprovacao_registrada`.
3. `T06: decisaoRecomendaB tem ESP, RSK e um DEC de agente (rascunho), cuja recomendação cita a opção B`: autoria dos
   três agentes, `rascunho_agente = true`, recomendação igual a `RECOMENDACAO_DO_E2E` e com "opção B", nível
   `cto_e_administradora`, sem aprovação e sem decisão.
4. `T06: rodar o seed de novo não duplica demanda, versão, aprovação nem aviso`: idempotência. Com 23 demandas e 3 de
   cada versão, um segundo `seedFicticio` devolve `recusado`, e as contagens das oito tabelas não mudam.

### Visto falhando antes do código

`pnpm -C <repo> test scripts/scripts.test.ts --reporter=json --outputFile=<scratchpad>/t06-vermelho.json` (relatório
fora do repositório): 45 testes, **7 falharam** e 38 passaram. Trechos:

- `AssertionError: expected 15 to be 23 // Object.is equality` (`scripts.test.ts:368`)
- `AssertionError: expected [ 15, 1, 1, 1, +0 ] to deeply equal [ 15, 3, 3, 3, 1 ]` (idempotência)
- `TypeError: Cannot read properties of undefined (reading 'status')` (`etapasDupla` e `decisaoRecomendaB` não existiam)
- `AssertionError: expected [ 'DEC-DEM-20261022-0001-v1' ] to have a length of 3 but got 1` (avisos e jobs)

### Depois do código

- `scripts/scripts.test.ts`: 45 de 45.
- `pnpm test` (suíte inteira): **218 arquivos, 4824 de 4824 testes**, 0 falhas.
- `pnpm typecheck`: limpo (a primeira rodada acusou o TS2698 no spread de `PROMPTS.consolidacao.exemploSaida`, corrigido
  passando o resultado por `criarPacoteDecisaoSchema.parse`).
- `pnpm lint`: limpo.

### Desvios do plano

- **Autoria das versões da `etapasDupla`:** o plano pede tudo "com a conta fictícia cto". A aprovação é da `cto`, como
  pedido, porque é quem o e2e vê como aprovador, e aprovação não entra no limite C-36. A ESP, o RSK e o DEC de pessoa
  são da `sem2fa` (papel cto), pela mesma razão de as demandas do e2e serem dela: o limite de 60 versões por hora
  (`LIMITE_POR_HORA.artefato`) da conta "cto" fica todo para as specs, que criam ESP, RSK e DEC pela API com ela. A
  regra de negócio não muda: a mesma função, com um ator de papel cto.
- **Texto da ESP, do RSK e do DEC da `etapasDupla`:** o plano não dá o texto, então escrevi um curto e inventado
  (`ESP_DO_E2E`, `RSK_DO_E2E`, `DEC_DO_E2E`, sistema `painel-ficticio`, riscos baixos). A `decisaoRecomendaB` usa as
  saídas de exemplo dos prompts, como a primeira demanda.
- **`RECOMENDACAO_DO_E2E` exportada:** é um nome a mais, que não está no G7. Serve para o e2e da T13 não repetir o
  literal.

## Decisões tomadas

- As versões do e2e são criadas pelos serviços de `src/modules/` na transação do seed, e não por SQL. Assim valem as
  mesmas regras da API: trava, limite, evento, status pelo ator sistema e aviso. Uma falha desfaz o seed inteiro, como
  o teste "falha no meio do seed" já cobre.
- A recomendação trocada é conferida de novo pelo schema do DEC, e não espalhada direto. Toda entrada do seed passa
  pelo Zod.
- O U+202E fica escrito como `‮`, para o caractere invisível de direção não ficar cru no fonte, onde o ESLint e a
  revisão poderiam não enxergá-lo.
- No teste antigo, mudei a consulta (filtrando pelo título ou pelo id) em vez de mudar o número esperado. O que ele
  provava (um DEC de agente fora do e2e, um aviso e um job dele com payload só `{ decId }`) continua provado, e o que
  é novo ganhou asserção própria.

## Pendências

- `engenheiro-frontend` (T09 a T13), sem bloquear: agora o seed tem **dois** DECs de agente pendentes, o da primeira
  demanda e o da `decisaoRecomendaB`. A função `idDoDecDeRascunhoDoSeed` de `e2e/decisao.spec.ts` pega o primeiro DEC
  pendente com `rascunhoAgente` na lista da API. Hoje isso não quebra nada, porque nenhum teste daquela spec registra
  decisão nele e nenhum e2e confere o texto da recomendação de exemplo (conferido com `git log -S`). A
  `axe-todas.spec.ts` usa `DEC-<bug>-v1` direto. Se um e2e novo decidir no DEC achado por essa função, ele pode pegar
  o da `decisaoRecomendaB`, que a T13 precisa pendente. O melhor é procurar pelo título.
- `engenheiro-frontend`: a `etapasDupla` nasce em `pronta_para_decisao`, com a aprovação do CTO já gravada. A conta
  "cto" verá "aprovação do CTO já registrada" na T11 dela, e só a "administradora" consegue completar a decisão.
- Não rodei `pnpm test:e2e` nesta etapa: o comando é do `engenheiro-frontend` (G1). Os e2e que leem as demandas do seed
  rodam na próxima tarefa de tela e na homologação.
- Minor: os testes novos dependem do seed feito no teste "seed cria contas…" do mesmo `describe`, como os testes
  vizinhos de hoje já dependem.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- scripts test/banco.ts test/sessao.ts` — achar o teste do seed
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- src/modules/pacotes-decisao src/modules/especificacoes src/modules/pareceres-risco` — achar os serviços
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — topo c1a8e5c (06-T05-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- src/modules/limites.ts src/modules/limites src/modules/versoes.ts src/modules/demandas/servico.ts src/modules/especificacoes/servico.ts src/modules/pareceres-risco/servico.ts e2e/apoio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -1 -- src/agents`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código; saída truncada pela ferramenta, falhou (exit 1)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t06-vermelho.json` — 7 falharam, 38 passaram (vermelho)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t06-verde.json` — 45 de 45
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t06-suite.json` — exit 0 (rodada antes do ajuste de tipo; repetida abaixo)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — TS2698 em `scripts/seed-ficticio.ts:402`, corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só `scripts/scripts.test.ts` e `scripts/seed-ficticio.ts` modificados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 222 inserções, 15 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "rascunhoAgente" --name-only --format=%h -- e2e` — `e2e/axe-todas.spec.ts`, `e2e/decisao.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "parecer de risco aponta" --name-only --format=%h -- e2e src test` — só `src/agents/consolidacao.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 218 arquivos, 4824 de 4824

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
