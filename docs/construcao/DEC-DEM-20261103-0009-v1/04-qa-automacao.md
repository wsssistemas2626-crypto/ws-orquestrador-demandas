---
pedido: DEC-DEM-20261103-0009-v1
etapa: 04-regressao
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, vitest.config.ts, playwright.config.ts, package.json, src/lib/log.ts, src/lib/reduzir-erro.ts, src/lib/log.test.ts, src/app/api/vistas-para-agente.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/detectores.ts, src/instrumentation.ts, src/lib/console-saneado.ts, src/lib/acao-painel.ts, src/lib/rota.ts, src/lib/fila.ts, src/db/index.ts, src/modules/avisos/aviso-dec.ts, src/jobs/agente-executar.ts, src/jobs/aviso-dec-pronto.ts, src/jobs/expurgo-texto-bruto.ts, src/jobs/batimento.ts, src/worker/iniciar.ts, src/worker/index.ts, src/modules/retencao/expurgar.ts, src/modules/acesso/auth.ts, src/app/api/saude/route.ts, src/app/(painel)/demandas/page.tsx, scripts/lib/saida.ts, commit a4af941]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão do commit a4af941 (03-correcao, engenheiro-backend). Nenhum defeito no código da correção; o que segue é a
cobertura de cada critério, os testes que acrescentei e o resultado.

### Critérios de aceite e testes que os cobrem

| Critério (pedido.json) | Teste |
|---|---|
| Agente recebe o texto livre de DEC, ESP e RSK minimizado na leitura, na listagem e no 201; a pessoa recebe o original | `src/app/api/vistas-para-agente.test.ts`, describe "M-a: texto livre de ESP, RSK e DEC minimizado para quem não é pessoa": "agente: nenhum dos quatro fragmentos sai em nenhuma das sete leituras…", "pessoa: o texto sai original nas sete leituras", "ids, sistema alvo, repositório, níveis, status e nível de aprovação saem iguais para os dois atores", "agente: lista nula segue nula, opcional ausente segue ausente…", "POST de ESP, RSK e DEC: o 201 do agente vem minimizado; o da pessoa, original" e, novo, "fila: cada DEC é minimizado com o nome do solicitante da própria demanda" |
| O Pedido de Construção gerado do DEC continua com o texto original | `src/app/api/pacotes-decisao/pedido.test.ts`, "o pedido de um DEC com o nome do solicitante no texto mantém título, descrição, ESP e RSK originais" |
| `normalizarErro` reduz objeto que não é Error | `src/lib/log.test.ts`: "erro em objeto simples vira { classe: desconhecido }…", "erro em objeto simples com code no formato leva só o code", "erro que já chega reduzido mantém a classe…" e, novo, "erro parecido com Error, lista, objeto vazio, sem protótipo ou com chave herdada vira { classe: desconhecido }" |
| A suíte e2e passa três vezes seguidas | `pnpm test:e2e` três vezes: 143 de 143 em cada uma (5,7 min, 4,9 min e 4,9 min) |

Teste que reproduz o defeito da 01: os testes M-a de `vistas-para-agente.test.ts` (defeito 1) e os dois primeiros de
B-b em `log.test.ts` (defeito 2), vistos falhando na 0.1.7 pela 03. Os que acrescentei também falham na 0.1.7: lá a
vista do agente copiava o texto e `normalizarErro` devolvia o objeto como veio.

### Testes acrescentados ou alterados nesta etapa

1. **B-2 da revisão de segurança (pedido do maestro).** Em `vistas-para-agente.test.ts`:
   - CNPJ fictício `00.000.000/0001-91` entrou no `TRECHO`, no `TRECHO_MINIMO` (`[CNPJ removido]`) e nos `FRAGMENTOS`.
     Vale para todos os campos de ESP, RSK e DEC, para o comentário da decisão e para a demanda do cenário.
   - `opcaoA` do DEC agora tem `descricao`, `vantagens` e `quandoEscolher`, os três com o dado fictício. `desvantagens`
     fica ausente, e `opcaoB` continua sem `vantagens` e `quandoEscolher`.
   - O valor esperado é `OPCAO_A_MINIMA`, com os três subcampos minimizados. As chaves são conferidas como
     `['descricao', 'quandoEscolher', 'vantagens']` no cenário estudo e no 201. Na pessoa, `opcaoA` sai igual a
     `DEC_COM_DADO.opcaoA`, já com `quandoEscolher`.
2. **Fila cruzando demandas** (`vistas-para-agente.test.ts`, "fila: cada DEC é minimizado com o nome do solicitante
   da própria demanda"):
   - duas demandas com solicitantes fictícios diferentes, cada DEC citando o próprio solicitante;
   - no agente, `GET /api/pacotes-decisao` troca os dois nomes; na pessoa, os dois saem originais.
   - Antes, todos os DEC do arquivo com o dado tinham o mesmo solicitante, e um mapa por `demandaId` errado passaria
     despercebido.
3. **Independência de ordem** (`vistas-para-agente.test.ts`, teste do 201):
   - o teste criava ESP, RSK e DEC na demanda `comDado`, que o teste do agente lê esperando exatamente 3 DEC;
   - agora o teste usa uma demanda própria, com o mesmo dado;
   - nenhuma asserção mudou, e o resultado não depende mais da ordem dos testes.
4. **Bordas do B-b** (`log.test.ts`):
   - viram `{ classe: 'desconhecido' }`: objeto com cara de Error que não é Error (`name`, `message`, `stack` e `cause`
     com `code`), lista, `{}`, objeto sem protótipo e objeto com a chave só herdada;
   - nenhum e-mail, CPF ou `TypeError` sai, e o `code` da `cause` de objeto simples não é lido.

`git diff`: só acréscimos e reforços. Nenhum teste foi apagado nem marcado com `.skip`, `.only` ou `.todo`, e
nenhuma asserção foi afrouxada.

### Conferência pedida pela 03: outros pontos que passam `erro` ao log

Achei as chamadas pelo histórico do git (`git log -G`, sem `git grep`) e li os arquivos. Todas passam o valor
capturado no `catch` ou o erro do evento `error`, que na prática é `Error` e continua reduzido por `reduzirErro` como
antes:

| Arquivo | O que passa como `erro` |
|---|---|
| `src/modules/avisos/aviso-dec.ts` | erro do enviador ou de `contarErroInesperado` |
| `src/jobs/agente-executar.ts`, `src/jobs/aviso-dec-pronto.ts`, `src/jobs/expurgo-texto-bruto.ts` | valor do `catch` |
| `src/worker/iniciar.ts`, `src/worker/index.ts` | valor do `catch` |
| `src/lib/fila.ts` | `error` do pg-boss |
| `src/db/index.ts` | `error` do pool |
| `src/app/api/saude/route.ts` | valor do `catch` |
| `src/app/(painel)/demandas/page.tsx` | valor do `catch` |
| `src/modules/acesso/auth.ts`, `src/lib/console-saneado.ts` | só `instanceof Error` |

Pontos que não passam `erro`:
- `src/lib/rota.ts` e `src/lib/acao-painel.ts` não passam `erro`;
- `src/modules/agentes/executar.ts` e `src/modules/retencao/expurgar.ts` não passam `erro`;
- os scripts escrevem o erro pela própria saída (`scripts/lib/saida.ts`, com `reduzirErro`), fora do pino.

O único ponto que passa objeto simples é `src/instrumentation.ts:53` (`reduzirErro(err)`), coberto pelo
`erroJaReduzido` e por `src/instrumentation.test.ts`. Na suíte, só dois testes dependiam do formato antigo: os da
segunda barreira do `redact` em `log.test.ts`. A 03 os passou de `erro` para `instancia`, que está em
`CAMPOS_PERMITIDOS`, e o `[removido]` continua conferido. A mudança não afrouxa o teste.

### Resultado

- `pnpm test`: 3918 de 3918, 0 falhas (3916 da 03 mais os 2 novos), em 380 s.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `pnpm test:e2e`: 143 de 143, três vezes seguidas.

## Decisões tomadas

- Não devolvi à 03: o código cumpre os critérios, e os testes da 03 estavam certos. A única fragilidade era a
  dependência de ordem no teste do 201, que corrigi no próprio teste, sem tocar em asserção.
- Não fixei em teste o caso `Object.create({ classe: 'Error' })`, em que a classe herdada é reconhecida pelo
  `erroJaReduzido`. Só sai um identificador no formato de classe, sem dado; é comportamento incidental, não requisito.
- O e2e rodou antes da suíte unitária, e as mudanças desta etapa só tocam testes unitários (`src/**/*.test.ts`).
  Por isso, como o maestro indicou, rodei a suíte unitária uma vez só, no fim.

## Pendências

- Observação para a revisão: um campo de texto novo nas vistas só fica coberto pelo teste de "nenhum dos fragmentos"
  se o cenário do teste preencher esse campo com o dado fictício. O tipo `Omit<…Vista, …>` obriga quem acrescentar o
  campo a montá-lo na vista mínima, mas não obriga a minimizá-lo. Não bloqueia.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat a4af941bfc4f76b9c535d4169672d5224c1b8113`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show a4af941 -- src/lib src/instrumentation.ts test package.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "erro:" --name-only --format= -- src scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "log\.(error|warn|info)\(" --name-only --format= -- src scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "\.(error|warn|info)\(\{" --name-only --format= -- src scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "erro[,:} ]" --name-only --format= -- src/modules/agentes/executar.ts src/modules/acesso/auth.ts "src/app/(painel)/demandas/page.tsx" scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "log\.(error|warn|info)" -p --format=%h -- src/modules/agentes/executar.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show a4af941 -- src/app/api/vistas-para-agente.test.ts src/app/api/pacotes-decisao/pedido.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:vitest.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show a4af941 -- src/app/api src/modules/demandas/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show a4af941 -- src/modules/pacotes-decisao/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:playwright.config.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/log.test.ts src/app/api/vistas-para-agente.test.ts src/app/api/pacotes-decisao/pedido.test.ts --reporter=dot` — 67 de 67
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 143 de 143 (1ª)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 -- src/app/api/vistas-para-agente.test.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 143 de 143 (2ª)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 143 de 143 (3ª)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --reporter=junit --outputFile.junit=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/qa04.xml` — 3918 de 3918, 0 falhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
