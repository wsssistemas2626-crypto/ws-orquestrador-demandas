---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T10-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 6, 7 e 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G8 e T10), 06-T10-engenheiro-backend.md, 06-T09-tech-lead.md (formato), commit 99ce009568b40ee43df911f6191a2ec589e71006, scripts/seed-integracoes-qa.test.ts (linhas 20 a 169), scripts/seed-andamento.test.ts (linhas 135 a 164), test/estatico/piso-de-assercoes-0018.test.ts, e2e/configurar-2fa.spec.ts (linhas 80 a 154)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T10 (seed fictício com as demandas da vigência; D-15; dados para RF-03, RF-06 e os e2e da T11 a T14),
commit `99ce009`. O commit toca só `scripts/`: `seed-ficticio.ts` (141 linhas no `--stat`), os quatro testes do seed da G5
(`scripts.test.ts`, `seed-andamento.test.ts`, `seed-integracoes.test.ts`, `seed-integracoes-qa.test.ts`), o teste
novo `seed-vigencia.test.ts`, mais a entrega do engenheiro e o `passagens.jsonl`. Nenhum arquivo da G4 (superfícies
congeladas) nem de `src/`, `e2e/`, `drizzle/` ou `docs/` fora da pasta do pedido mudou.

### 1. O desvio: as quatro demandas nascem no começo de `criarDadosDasIntegracoes` (ratificado)

O plano manda chamar `criarDadosDaVigencia(t, deps, pessoas)` "no fim de `criarDadosDasIntegracoes`". O engenheiro
deixou as versões (ESP, RSK, DECs e aprovações) no fim (`scripts/seed-ficticio.ts:632`). As quatro demandas ele criou no
começo da mesma função (`scripts/seed-ficticio.ts:612`, `criarDemandasDaVigencia`, antes das do Awave) e passou os ids
num quarto parâmetro.

Conferi a razão contra os testes do PISO:
- `scripts/seed-andamento.test.ts:150` (PISO 41) e `scripts/seed-integracoes-qa.test.ts:140` (PISO 55) exigem que as oito
  do andamento sejam as **últimas** demandas criadas. `seed-integracoes-qa.test.ts:142` exige que as cinco das
  integrações venham logo antes delas. Com as quatro demandas no fim, as duas asserções de ordem mudariam, e a G5 não
  autoriza mudar asserção de ordem.
- Com tudo (demandas e versões) antes do Awave, os seis DECs da vigência entrariam antes dos DECs dos pedidos e do
  andamento. A ordem dos avisos mudaria, e o teste de falha do aviso de `seed-integracoes.test.ts` perderia o sentido.
- No lugar escolhido, a ordem das demandas fica: 5 (uma de cada tipo), 18 do e2e, **4 da vigência**, 5 das integrações, 8 do
  andamento. As asserções das linhas 140, 142 e 143 de `seed-integracoes-qa.test.ts` e da linha 150 de
  `seed-andamento.test.ts` continuam iguais. Os seis DECs da vigência são os últimos do seed, e por isso a lista de
  `decsNaOrdem` (`seed-integracoes-qa.test.ts:151-158`) só ganha `...DECS_DA_VIGENCIA` no fim.
- O `TOTAL_DEMANDAS_DO_SEED - 17` de `scripts/scripts.test.ts` (terceiro aviso falha dentro de `criarVersoesDoE2E`, antes
  de `criarDadosDasIntegracoes`) fica certo: 5 + 18 = 23 = 40 − 17.

Conclusão: o desvio é o menor que respeita a G3.2 (asserção de ordem não muda). O quarto parâmetro (`ids`) é
consequência dele, e o comentário em `scripts/seed-ficticio.ts` antes de `criarDadosDasIntegracoes` explica o motivo.
**Ratifico.** A observação de estilo P2 abaixo é Minor e não bloqueia.

### 2. Nos testes do seed, só totais e listas mudaram (G5): sim

Li o diff linha a linha nos quatro arquivos:
- `scripts/scripts.test.ts`: `TOTAL_DEMANDAS_DO_SEED` 36 → 40; `todos` 31 → 35; contagem por tabela
  `[TOTAL, 13, 13, 13, 11]` → `[TOTAL, 17, 17, 19, 15]` (+4 ESP, +4 RSK, +6 DEC, +4 aprovações, coerente com o seed);
  DECs 13 → 19; `TOTAL - 13` → `TOTAL - 17`; `pacote_decisao` 13 → 19 e `aprovacao` 11 → 15. A única mudança que não é
  número é a constante `DA_T10_0_4_1`, somada à lista de exclusão do teste "as demandas próprias do e2e … sem versão …
  pela conta sem2fa". As quatro têm versões e são da `configurar2fa`, e as da 0.3.0 e da 0.4.0 saem da lista pelo mesmo
  mecanismo. As asserções do teste (`titulos` 18, `cto` 5, administradora 0) não mudaram. Isso cabe na G5 ("os totais
  crescem com as quatro demandas novas") e o engenheiro explicou trecho a trecho, como pede a G3.2.
- `scripts/seed-andamento.test.ts` e `scripts/seed-integracoes.test.ts`: `toBe(36)` → `toBe(40)` e o título do caso.
- `scripts/seed-integracoes-qa.test.ts`: a constante `DECS_DA_VIGENCIA` foi acrescentada no fim da lista de DECs na
  ordem, e um comentário mudou. Nenhuma asserção de ordem de demanda mudou.
- Contagem de `expect(`: pelo diff, cada linha `-` com `expect(` tem a sua `+` correspondente nos três arquivos que
  mudaram asserção. `seed-integracoes-qa.test.ts` não mudou nenhuma linha com `expect(`. Os números ficam iguais aos do
  PISO de 41108ee (41, 48 e 55), e `test/estatico/piso-de-assercoes*.test.ts` passa.
- A lista de pendentes do `/construir` não mudou: `seed-vigencia.test.ts` confere que ela continua só com a
  `pedidoParaBuscar` e que não nasceu nenhum token.

### 3. Dados só fictícios (G3.3, JUR-2026-002 7.4): sim

Os títulos têm "(fictício)", o solicitante é "Pessoa Ficticia Produto" e as contas são as de `CONTAS_FICTICIAS` (e-mails
`@ficticio.test`). O documento é `DOC-FICTICIO-0018`, e a data vem de `deps.relogio.agora()`, sem `new Date()` (G3.10).
Os contextos são frases genéricas, sem nome, CPF, e-mail ou empresa reais. O seed não grava token. O log do seed continua
só com a quantidade (`seed_ficticio`, `quantidade: 40`), e o caso G3.13 confere que título, id e documento não aparecem
no log.

### 4. Checklist da seção 12 do padrão técnico

- Faz o que o plano pede: quatro títulos em `TITULOS_DO_E2E` com o comentário pedido; `DEMANDAS_DA_VIGENCIA` em
  `TOTAL_DEMANDAS_DO_SEED`; `criarContas` devolve `administradora` e `configurar2fa` sem mudar o que grava;
  ESP/RSK/DEC pela `configurar2fa`, aprovações da "cto" e, na dupla, da "administradora" com documento e data do
  relógio; tudo pelos serviços da API, na transação do seed, com os schemas Zod. O único desvio é o do item 1,
  ratificado acima.
- Teste para cada comportamento, visto falhando: 12 casos (12 de 12 falhando antes, com o trecho
  `expected 36 to be 40`). Os seis passos da T10 estão cobertos (casos 1, 3, 5 a 8, 10), mais o C-36 da
  `configurar2fa` (caso 4), o log (caso 11) e o S-04 sobre o dado do seed (caso 12).
- Sem segredo nem dado pessoal real (item 3).
- Zod: as entradas passam por `criarDemandaSchema`, `criarEspecificacaoSchema`, `criarParecerRiscoSchema`,
  `criarPacoteDecisaoSchema` e `registrarDecisaoSchema`. A tarefa não cria rota, Server Action nem job.
- Banco: sem migration nem tabela.
- Sem duplicação de função: o seed reusa `criarDemanda`, `criarEspecificacao`, `criarParecerRisco`,
  `criarPacoteDecisao`, `registrarDecisao`, `ESP_DO_E2E`, `RSK_DO_E2E` e `DEC_DO_E2E`. Os auxiliares do teste
  (`linhas`, `contar`, `idDaDemanda`) seguem o molde de cada arquivo de seed, como já é no repositório.
- Texto de interface e axe: a tarefa não tem tela.
- `switch` com `never` no nível aprovado (`scripts/seed-ficticio.ts`, em `criarDadosDaVigencia`), conforme a G3.4.
- Conferi que a `configurar2fa` com demandas não afeta o e2e que usa a conta: `e2e/configurar-2fa.spec.ts:134-137` só
  confere a URL, o título "Demandas" e o aviso de 2FA, e nada conta linhas da fila.

### Pareceres

| # | Arquivo:linha | Problema | Razão | Severidade |
|---|---|---|---|---|
| P1 | `scripts/seed-vigencia.test.ts` (o arquivo todo; fora de `test/estatico/piso-de-assercoes.test.ts`) | O teste novo não entrou no `PISO`. | A G5 não lista a T10 entre as tarefas que acrescentam ao piso, e o engenheiro seguiu a G5. Os dois testes equivalentes da 0.3.0 e da 0.4.0 (`seed-integracoes-qa.test.ts` 55, `seed-andamento.test.ts` 41) estão no PISO desde 41108ee. Este também tem guardas de dado e log (caso 11, G3.13; caso 10, nenhum token e pendentes do `/construir` sem mudança). Pelo mesmo critério do D-18 (CV-20), ele é candidato ao piso com 46. | Minor (vai para Pendências) |
| P2 | `scripts/seed-ficticio.ts:612` | `criarDadosDasIntegracoes` passou a criar também as demandas da vigência, e a função ficou com uma responsabilidade que o nome não diz. | Daria a mesma ordem (depois de `criarVersoesDoE2E` e antes do Awave) chamar `criarDemandasDaVigencia` em `criarDemandas`, logo antes de `criarDadosDasIntegracoes`, e `criarDadosDaVigencia` logo depois dela. `criarDadosDasIntegracoes` ficaria sem mudança. O comentário atual explica o desvio, e o comportamento e os testes são os mesmos. | Minor (não pede mudança agora; dívida de legibilidade) |

Nenhum Critical nem Important.

### Verificação desta revisão

- 9 arquivos de teste (os sete do seed, mais `piso-de-assercoes.test.ts` e `piso-de-assercoes-0018.test.ts`): 290 de
  290.
- `pnpm lint` e `pnpm typecheck` limpos.
- O `pnpm test` inteiro não rodou de novo nesta revisão. O engenheiro declarou 382 arquivos e 8281 de 8281, e a
  `06-T10-testes` roda de novo.

## Decisões tomadas

- Desvio do engenheiro (demandas no começo de `criarDadosDasIntegracoes`, versões no fim, `ids` como quarto parâmetro):
  ratificado. É a única colocação dentro da função que o plano nomeia em que nenhuma asserção de ordem do PISO muda
  (G3.2).
- A exclusão `DA_T10_0_4_1` em `scripts/scripts.test.ts` está dentro da G5. Ela é a lista que cresce com as demandas
  novas, as asserções do teste continuam as mesmas, e ela usa o mesmo mecanismo da 0.3.0 e da 0.4.0.
- `seed-vigencia.test.ts` fora do PISO nesta tarefa não bloqueia. A G5 não manda pôr, e é Minor pela seção 12 (P1). Fica
  registrado para a `06-T10-testes` ou a 08.
- `status: pronto`: o checklist da seção 12 está cumprido. P1 e P2 são Minor.

## Pendências

- P1 (Minor), para a `06-T10-testes` (qa-automacao) ou a `08-revisao`: avaliar a entrada de
  `scripts/seed-vigencia.test.ts` no `PISO` com 46 pelo critério CV-20 do D-18, como foi feito com
  `seed-andamento.test.ts` na 0.4.0.
- P2 (Minor, dívida de legibilidade): se alguém voltar a mexer no seed, mover `criarDemandasDaVigencia` e
  `criarDadosDaVigencia` para `criarDemandas`, em volta de `criarDadosDasIntegracoes`. A ordem é a mesma.
- Para o maestro, sem decisão minha: o engenheiro declarou dois `git grep -n -E` com alternativa `|` num comando só.
  Os dois estão na lista de Comandos executados dele.
- Para a T11 a T14 (frontend), repetindo a entrega do engenheiro: o seed tem quatro demandas a mais (três em Pronta para
  decisão e uma em Nova). Os e2e da fila que leem totais pela API devem continuar certos, e quem roda o e2e confirma.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Task 10" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T10" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 99ce009568b40ee43df911f6191a2ec589e71006~1 99ce009568b40ee43df911f6191a2ec589e71006 --stat` — 8 arquivos, só `scripts/` e a pasta do pedido
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 99ce009568b40ee43df911f6191a2ec589e71006 -- scripts/seed-ficticio.ts scripts/scripts.test.ts scripts/seed-andamento.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 99ce009568b40ee43df911f6191a2ec589e71006 -- scripts/seed-vigencia.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "scripts/" -- test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "configurar2fa" -- e2e src test`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-vigencia.test.ts scripts/scripts.test.ts scripts/seed-andamento.test.ts scripts/seed-andamento-qa.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts src/db/sementes.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts --reporter=dot` — 9 arquivos, 290 de 290
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "criarDemandasDaVigencia" -- scripts/seed-ficticio.ts`

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
