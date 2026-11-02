---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T20-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T19 a T21), 01-analista-requisitos.md (RF-01 a RF-26), 06-T20-engenheiro-backend.md, 06-T19-qa-automacao.md (cabeçalho), git show 69b5630, src/modules/pacotes-decisao/schemas.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/desatualizado.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/pacotes-decisao/route.ts, src/app/api/pacotes-decisao/[decId]/route.ts, src/modules/pacotes-decisao/criar.test.ts, src/modules/pacotes-decisao/consultas.test.ts, src/app/api/pacotes-decisao/pacotes.test.ts, src/modules/limites.ts, src/db/imutabilidade.test.ts, test/banco.ts, test/deps.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T20, pacote de decisão (DEC) versionado, desatualizado e filtro por status de decisão, sobre o commit
`69b5630`. O código cumpre todos os critérios da tarefa. Os 75 testes do engenheiro passam, têm asserções fortes
(corpo exato do 400, linhas conferidas no banco pelo migrator, eventos por inteiro, sentinelas) e usam só o relógio
fixo. Acrescentei 7 testes para quatro lacunas. Não achei defeito.

### Critérios da tarefa e testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-10.1 sem ESP e sem RSK → 400 `faltando: ["especificacao", "parecer_risco"]` | `criar.test.ts` › "CA-10.1: sem ESP e sem RSK → 400 com faltando…, e nada gravado"; `pacotes.test.ts` › "CA-10.1 pela rota: sem ESP e sem RSK → 400 com faltando, e nada gravado" |
| CA-10.2 só ESP → `faltando: ["parecer_risco"]` | `criar.test.ts` › "CA-10.2: com ESP v1 e sem RSK…"; **novo** `pacotes.test.ts` › "CA-10.2 pela rota: só com a ESP → 400 com faltando: [\"parecer_risco\"], e nada gravado" |
| Só RSK → `faltando: ["especificacao"]` (RN do RF-10) | `criar.test.ts` › "com RSK e sem ESP → faltando: [\"especificacao\"]"; **novo** `pacotes.test.ts` › "pela rota: só com o RSK → 400 com faltando: [\"especificacao\"], e nada gravado" |
| CA-10.3 cita a ESP e o RSK de maior versão e nasce `pendente` | `criar.test.ts` › "CA-10.3: ESP v1, v2 e RSK v1 → cita ESP-…-v2 e RSK-…-v1 e nasce pendente"; **novo** `criar.test.ts` › "CA-10.3, lado do RSK: ESP v1, RSK v1 e v2 → cita RSK-…-v2, com os níveis e o selo de rascunho dele"; **novo** `pacotes.test.ts` › "CA-10.3 pela rota: ESP v1, v2 e RSK v1 → cita ESP-…-v2 e RSK-…-v1, pendente; o RSK v2 depois o deixa desatualizado" |
| CA-10.4 a demanda vai a `pronta_para_decisao` | `criar.test.ts` › "CA-10.4: depois do DEC, a demanda está em pronta_para_decisao, com evento de ator sistema", "de %s também vai a pronta_para_decisao" e "em %s (fora da origem), o DEC é gravado e o status não muda"; `pacotes.test.ts` › "CA-10.4 pela rota…" |
| RF-10 cópia de tipo, título e descrição da demanda | `criar.test.ts` › "RF-10: copia tipo, título e descrição da demanda; a cópia não muda quando a demanda é editada" e o bloco `descricaoDaDemanda` |
| RF-11 / CA-11.1 versão gravada não muda, sem rota de edição | `criar.test.ts` › "RF-11: a versão anterior continua igual depois de uma nova versão"; `pacotes.test.ts` › "CA-11.1: as rotas do DEC só exportam leitura e criação; nenhuma altera versão gravada"; no banco, `src/db/imutabilidade.test.ts` (T05) já recusa UPDATE e DELETE em `pacote_decisao` |
| CA-12.1 ESP v2 → `desatualizado: true` | `consultas.test.ts` › "CA-12.1: DEC v1 que cita ESP v1; criada a ESP v2 → desatualizado: true"; `pacotes.test.ts` › "CA-12.1: DEC v1 que cita ESP v1; criada a ESP v2 → desatualizado: true" |
| RSK v2 também desatualiza (RN do RF-12) | `consultas.test.ts` › "RSK v2 também deixa o DEC desatualizado"; **novo** pela rota no teste CA-10.3 acima |
| CA-23.1 `statusDecisao=aprovada` → só os aprovados, com `desatualizado` | `consultas.test.ts` › "CA-23.1: 2 aprovados e os outros não…"; `pacotes.test.ts` › "CA-23.1: 2 aprovados e 1 pendente…"; **novo** `consultas.test.ts` › "CA-14.1 na lista: só a aprovação do CTO → pendente, com o aprovador visível; nada em aprovada" |
| CA-23.2 `statusDecisao=talvez` → 400 | `consultas.test.ts` › "CA-23.2: statusDecisao=talvez → recusado"; `pacotes.test.ts` › "CA-23.2: statusDecisao=talvez → 400 com o campo, sem o valor recebido" |
| RF-23 `limit` e `offset` como no RF-06 | `consultas.test.ts` › "limit e offset: a página pedida, com o total de todas"; **novos** `consultas.test.ts` › "mesmo instante: a demanda mais nova primeiro e, dentro dela, a versão pelo número (v11 antes de v10 e de v9)" e "páginas de 5 por offset: juntas dão a lista inteira, sem repetir nem pular, com o mesmo total em cada uma" |
| C-11 autoria só do ator | `criar.test.ts` › "C-11: agente consolidacao grava rascunho de agente…"; `pacotes.test.ts` › "C-11: token do agente consolidacao com rascunhoAgente:false…" e "C-11: id, versão, ESP, RSK, status e decisão vindos do corpo são descartados" |
| C-36 limite de 60 artefatos por hora | `criar.test.ts` › "C-36: com 60 artefatos do ator na hora…"; `pacotes.test.ts` › "C-36: com 60 artefatos do ator na hora, o DEC seguinte → 429, e nada gravado" |
| CA-04.3 versões simultâneas | `criar.test.ts` › "CA-04.3: três criações simultâneas → v1 a v3, sem número repetido" |

### Testes acrescentados (7, nos arquivos da tarefa)

- `src/app/api/pacotes-decisao/pacotes.test.ts` (+3): o 400 de CA-10.2 e o do "só RSK" pela rota, com o corpo exato
  (antes, só o caso sem os dois passava pela rota), e CA-10.3 pela rota, seguido do RSK v2 deixando o DEC desatualizado
  no `GET /api/pacotes-decisao/:decId`. Mais o ajudante `espDaRota`.
- `src/modules/pacotes-decisao/criar.test.ts` (+1): o lado do RSK de CA-10.3. O RSK v2 é do agente `risco`, e o teste
  confere `niveisRisco` e `rascunhosCitados` do RSK citado.
- `src/modules/pacotes-decisao/consultas.test.ts` (+3): um bloco novo com banco próprio, montado uma vez e só lido, com
  tudo no mesmo instante do relógio fixo:
  - DEC de nível `cto_e_administradora` com só a aprovação do CTO: aparece em `pendente`, com o aprovador visível, e
    não em `aprovada`. É a base da CA-14.1 na lista.
  - Desempate com o mesmo `criada_em`: primeiro a demanda mais nova, depois a versão pelo número. Com 11 versões, a
    ordem pelo texto poria v9 antes de v11.
  - Paginação por `offset` em páginas de 5: as páginas juntas dão a lista inteira, sem repetir nem pular item.

### Resultado

- T20 isolada: 3 arquivos, 82 de 82. Rodei duas vezes, com o mesmo resultado.
- `pnpm test`: 97 arquivos, 1820 de 1820, nenhum falhou. Antes eram 1813; os 7 a mais são os desta etapa.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: 3 arquivos `*.test.ts`, 118 linhas acrescentadas e nenhuma removida.

## Decisões tomadas

- **Testes novos de lista num bloco com banco próprio.** O banco do bloco RF-23 já tem `total: 5` fixo. Somar DEC
  nele quebraria esse total, e o resultado passaria a depender de qual teste roda primeiro.
- **O bloco novo é montado no `beforeAll` e os testes só leem.** Assim nenhum depende da ordem dos outros.
- **Nenhum teste novo de lista grava decisão no banco compartilhado do teste de rota.** O CA-23.1 da rota confere
  `total: 2` no banco do arquivo, e mais um aprovado ali o deixaria dependente de ordem.
- **Os testes novos de rota gravam ESP e RSK pelos atores `insumo_tecnico` e `risco`**, como os testes do engenheiro.
  O arquivo usa o relógio fixo, que não anda. Com os 3 testes novos, o CTO fica com 22 de 30 demandas no limite por
  hora de C-36, e cada ator com no máximo 21 de 60 artefatos.
- **Não fiz teste de concorrência entre a criação do DEC e uma ESP nova.** O invariante observável ("o DEC cita a ESP
  mais nova, ou aparece desatualizado") vale com ou sem a trava, e o teste não falharia sem ela. A corrida que importa,
  aprovar junto com uma ESP nova, é da T21 (`concorrencia.test.ts`, C-13).
- **A imutabilidade do DEC no banco não ganhou teste aqui.** `src/db/imutabilidade.test.ts` (T05) já recusa, com linha
  existente, UPDATE e DELETE de `pacote_decisao` pelo papel do app, e confere que a linha não mudou.

## Pendências

- Sem pendência que bloqueie.
- Para a `06-T20-decisao` (não bloqueia): o desempate da lista no mesmo instante (demanda mais nova primeiro, depois a
  versão pelo número) agora tem teste. Se a regra de ordem mudar, quem mudar precisa atualizar o teste.
- Já registrado pelo engenheiro, para a T22: um DEC de demanda sem contexto, problema e impacto grava
  `demandaDescricao` vazia, e o pedido desse DEC vai responder 422 no `validarPedido`. O teste "demanda sem contexto,
  problema e impacto → descrição gravada vazia" registra esse comportamento.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 69b5630da3b258c79f5b173ec0cee99e2f64ef70` — 11 arquivos, só criados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 69b5630da3b258c79f5b173ec0cee99e2f64ef70 -- src/app/api/demandas/[id]/pacotes-decisao/route.ts src/app/api/pacotes-decisao/route.ts src/app/api/pacotes-decisao/[decId]/route.ts` — as três rotas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao src/app/api/pacotes-decisao` — antes das mudanças: 75 de 75
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --stat -1 --grep=06-T05-construcao` — localizar `src/db/imutabilidade.test.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao src/app/api/pacotes-decisao` — 82 de 82
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1820 de 1820, 97 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao src/app/api/pacotes-decisao` — de novo, para conferir estabilidade: 82 de 82
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos, 118 inserções, 0 remoções

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
