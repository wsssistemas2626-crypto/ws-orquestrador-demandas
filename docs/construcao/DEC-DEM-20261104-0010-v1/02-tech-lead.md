---
pedido: DEC-DEM-20261104-0010-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, engenheiro-backend.md (lista Pode), src/lib/reduzir-erro.ts, src/lib/reduzir-erro.test.ts, src/lib/log.ts, src/lib/log.test.ts, src/lib/sentry.ts, src/lib/console-saneado.ts, src/instrumentation.ts, src/instrumentation.test.ts, src/app/api/saude/route.ts, "src/app/api/demandas/[id]/especificacoes/route.ts", "src/app/api/demandas/[id]/pacotes-decisao/route.ts", src/modules/pacotes-decisao/criar.ts, src/components/rotulos.ts, test/estatico/ (árvore)]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

Cinco correções independentes, todas do lado servidor, para **um só engenheiro: `engenheiro-backend`** (a constante do
B-5 fica em `src/components/rotulos.ts`, que está em `src/`, na Pode dele). Sem migration. Nenhuma asserção existente
muda: os testes novos entram ao lado. Ordem sugerida: D1, D5, D4, D3, D2 (do mais isolado ao que precisa de banco).

### D1 — B-1 do 0009: filtro de `code` e de classe (`src/lib/reduzir-erro.ts`)

**Causa:** `FORMATO_CODE` (`:6`) aceita qualquer sequência de dígitos até 40, e `FORMATO_CLASSE` (`:8`) aceita qualquer
identificador; os dois são usados por `lerCode`, `erroJaReduzido` (`:20-26`) e `reduzirErro` (`:28-33`), que alimentam o
log (`src/lib/log.ts:59-68`) e o título do Sentry (`src/lib/sentry.ts:41`).

**Correção (regra escolhida, ver Decisões):**
1. `lerCode`: além de `FORMATO_CODE`, recusa o `code` que contenha **sequência de 10 ou mais dígitos** (`/\d{10}/`).
   Vale também para `cause.code` (já passa por `lerCode` em `:31`). Resultado: `23505`, `23514`, `57P01`, `2200H`,
   `ECONNREFUSED`, `recusado`, `transitorio` e `123456789` (9 dígitos) aceitos; `1234567890`, `00000000191`,
   `11900000000` e `1234567890A` recusados.
2. Nova função exportada `classeAceita(nome: string): boolean`, usada nos dois pontos (`erroJaReduzido` no lugar do teste
   de `:23`; `reduzirErro` no lugar do teste de `:30`). Aceita só:
   - `'desconhecido'`;
   - identificador em `FORMATO_CLASSE` **terminado em `Error` ou `Exception`**, inclusive `Error` sozinho (atenção: a
     regex tem de aceitar o sufixo sem prefixo, por exemplo `/^(?:[A-Za-z_$][A-Za-z0-9_$]{0,54})?(?:Error|Exception)$/`);
   - um nome da lista fechada `CLASSES_DO_PROJETO` (constante exportada, `ReadonlySet<string>`), com os nomes que o
     código do projeto põe em `name`: `ErroEnvioEmail` (`src/modules/avisos/enviador.ts:35`), `ErroDominio`
     (`src/lib/erros.ts:36`), `ErroProvedor` (`src/modules/agentes/provedor.ts:27`), `ErroConfiguracao`
     (`src/lib/env.ts:64`), `ErroLeituraSessao` (`src/modules/acesso/exigir-pessoa.ts:21`), `AvisoNaoEnviado`
     (`src/modules/avisos/aviso-dec.ts:46`), `ExecucaoPerdida` (`src/modules/agentes/execucoes.ts:29`) e
     `TempoEsgotado` (`src/app/api/saude/route.ts:16`). Confira cada um no arquivo; o que não atribuir `name` (sai
     `Error`) não precisa entrar.
   - Fora disso: `reduzirErro` devolve `classe: 'Error'` e `erroJaReduzido` devolve `null` (o log mostra
     `{ classe: 'desconhecido' }`).
3. Atualize o comentário de `:5-8` com a regra e a razão (C-21: nada de texto livre na classe nem número de documento
   no `code`).

**Testes de regressão esperados (escrever antes, ver falhar):**
- `src/lib/reduzir-erro.test.ts`, testes novos: `code` com 10 e 11 dígitos recusado no erro e na `cause`; 9 dígitos
  aceito; `1234567890A` recusado; os códigos aceitos da lista acima seguem aceitos. Classe: `Error`, `TypeError`,
  `AggregateError`, `DrizzleQueryError`, `FooException` e cada nome de `CLASSES_DO_PROJETO` aceitos; `Joana`,
  `ErrorJoana`, `Errorzinho` e `ErroJoana` (prefixo `Erro` fora da lista) viram `Error` em `reduzirErro` e `null` em
  `erroJaReduzido`; `erroJaReduzido({ classe: 'desconhecido' })` reconhecido.
- `src/lib/log.test.ts`, teste novo: `erro: { classe: 'Joana', code: '00000000191' }` sai `{ classe: 'desconhecido' }`
  e a linha não contém `Joana` nem `00000000191`.
- Teste estático novo em `test/estatico/` (por exemplo `classes-de-erro.test.ts`): toda string literal atribuída a
  `name` em arquivo de `src/` que não é teste (`this.name = '...'`, `name = '...'`, `override name = '...'`) passa em
  `classeAceita`. Garante que classe nova do projeto fora do sufixo entre na lista em vez de virar `Error` calada. Siga
  a forma de leitura de arquivos dos estáticos que já existem (por exemplo `sql-raw.test.ts`).
- Ficam verdes, sem alteração: `src/lib/log.test.ts:87,93`, `src/modules/avisos/aviso-dec.test.ts:338,396,432`,
  `src/modules/avisos/enviador.test.ts:169` (`ErroEnvioEmail`) e todo `src/instrumentation.test.ts`.

### D5 — B-5 do 0006: rótulo de `demanda_final` (`src/components/rotulos.ts:163-167`)

**Causa:** `MOTIVO_IGNORADO` não tem a chave `demanda_final`, que nasce em `src/modules/agentes/executar.ts:67` e `:234`.

**Correção:** acrescentar `demanda_final: 'demanda já entregue ou encerrada'` (os status finais são `entregue` e
`encerrada`, `src/modules/demandas/transicoes.ts:28`).

**Teste de regressão:** teste novo em `src/components/rotulos.test.ts` (não alterar o "três motivos" de
`rotulos-qa.test.ts:124`): `textoDoEvento` de `agente_ignorado` com `{ agente: 'consolidacao', motivo: 'demanda_final' }`
devolve `Agente de consolidação não rodou: demanda já entregue ou encerrada` (use `NOME_AGENTE` para o nome exato);
motivo desconhecido continua só "não rodou".

### D4 — B-1 do 0006: teste estático contra `extras` em `src/app/` (`src/modules/pacotes-decisao/criar.ts:83-90`)

**Causa:** a regra de que o 5º (`t`) e o 6º (`extras`, com `especificacaoId` e `parecerRiscoId`) argumentos só vêm do
worker (`criar.ts:79-81`) não tem teste.

**Correção:** só teste, sem mudar código de produção. Arquivo novo em `test/estatico/` (por exemplo
`pacote-sem-extras.test.ts`) com uma função `chamadasComExtras(fonte, arquivo)` que usa a API do compilador do
TypeScript (pacote `typescript`, já devDependency do projeto; confira no `package.json`) para achar as chamadas de
`criarPacoteDecisao`, inclusive por import renomeado, e acusar chamada com mais de 4 argumentos ou com argumento
espalhado (`...args`). Pela AST, quebra de linha e vírgula dentro de objeto ou chamada aninhada não contam.

**Testes:**
- a função, sobre fontes de exemplo em texto no próprio teste: 6 argumentos em uma linha e em várias, import renomeado
  e espalhado são acusados; 4 argumentos com objeto `{ a, b }` e chamada aninhada no 4º não são;
- a varredura: todo `.ts`/`.tsx` de `src/app/` que não termina em `.test.ts`/`.test.tsx` não tem chamada acusada (hoje
  passam: `src/app/api/demandas/[id]/pacotes-decisao/route.ts:16` e
  `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts:20`).
O exemplo em texto substitui a "rota fictícia" do passo 2 da 01: prova que o teste morde sem criar arquivo em `src/app/`.

### D3 — B-a do 0008: duplicação no Sentry do mesmo erro sem `digest` (`src/lib/sentry.ts:40-46`)

**Causa:** `onRequestError` (`src/instrumentation.ts:55`) manda todo erro que não é controle do Next, e o console
saneado (`src/lib/console-saneado.ts:38`) manda todo `Error` sem `digest`. Se o Next entregar o mesmo objeto sem
`digest` aos dois, sai um evento a mais (sem dado).

**Correção (independe do resultado da conferência, ver Decisões):**
1. Conferir no fonte de `node_modules/next` (16.4.1) os caminhos que chamam `onRequestError` (página e Server
   Component, Server Action, route handler, middleware/proxy): o erro tem `digest` ao chegar? o mesmo objeto também vai
   a `console.error`? Registrar arquivo e linha no comentário de `console-saneado.ts:34-38` e na entrega.
2. Em `capturarErro` (`src/lib/sentry.ts`), um `WeakSet<object>` módulo-privado: se `e` é objeto e já está no conjunto,
   retorna sem enviar; senão envia e o acrescenta. Valor que não é objeto não entra no conjunto e é enviado toda vez.
   A marca fica dentro de `capturarErro` para valer nas duas ordens (console antes ou depois do gancho) e para não
   mudar a interface do módulo: `src/instrumentation.test.ts` simula `./lib/sentry` só com `iniciarSentry` e
   `capturarErro`, e um export novo usado pela instrumentação quebraria esse mock.
3. `instrumentation.ts` e a guarda de `digest` de `console-saneado.ts:38` não mudam.

**Teste de regressão (no teste do `sentry.ts`, espiando `Sentry.captureException` ou pelo `transporte` de teste, como
os testes atuais do arquivo fazem):** o mesmo objeto passado duas vezes gera um envio; dois objetos distintos com a mesma
mensagem geram dois; uma string passada duas vezes gera dois. Teste de integração no `console-saneado`: com o console
saneado instalado e o Sentry real em transporte de teste, `capturarErro(e)` seguido de `console.error(e)` (e na ordem
inversa) gera um evento só. Se algum teste existente esperar dois envios do mesmo objeto, não troque a asserção: devolva
para `02-triagem`.

### D2 — B-3 do 0009: ler os nomes antes de gravar nos 3 POST

**Causa:** em `src/app/api/demandas/[id]/especificacoes/route.ts:15-16`,
`src/app/api/demandas/[id]/pareceres-risco/route.ts:15-16` e `src/app/api/demandas/[id]/pacotes-decisao/route.ts:16-17`,
o serviço faz o commit antes de `nomesDaDemanda`; falha nessa leitura deixa o artefato gravado e responde 500.

**Correção:** nos três handlers, `const nomes = await nomesDaDemanda(deps.db, params.id);` antes de
`criar...(deps, ator, params.id, corpo)`, e `vista...Para(ator, v, nomes)` no 201. Os GET não mudam. Nenhum serviço muda.
`nomesDaDemanda` devolve `[]` para demanda inexistente (`src/modules/demandas/consultas.ts:199-213`), então o 404
continua vindo de `travarDemanda` no serviço.

**Teste de regressão (integração, banco de teste, dados fictícios; arquivo novo ao lado das rotas, porque o `vi.mock` vale
para o arquivo inteiro):** `vi.mock` de `modules/demandas/consultas` com `importOriginal`, trocando `nomesDaDemanda` por
uma função que rejeita uma vez (`new Error('falha simulada')`). Para cada um dos 3 POST: com a falha, 500 `erro_interno`
e 0 linhas do artefato, 0 eventos `*_criado` e, no DEC, status inalterado e nenhum aviso na fila; a nova tentativa sem
falha cria a v1 (não a v2). Sem falha: demanda inexistente 404, demanda em status final 409, limite por ator 429 e DEC
sem ESP/RSK 400 com `faltando`, como antes.

### Versão

`package.json` passa a `0.1.9` nesta etapa (o engenheiro tem `package.json` na Pode).

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-backend), conferido de novo na `04-regressao` |
| `pnpm test:e2e` verde três vezes seguidas, e o que for preciso em `e2e/` (critério "a suíte e2e passa três vezes seguidas") | `04-regressao` (qa-automacao) |
| `CHANGELOG.md` com a versão 0.1.9 (e README ou manual técnico, se o que mudou aparecer lá) | `06-documentacao` (documentacao-tecnica) |
| `docker build` e PR com CI verde | `05-entrega` (devops-sre) |
| Versão 0.1.9 no `package.json` | `03-correcao` (engenheiro-backend) |

## Decisões tomadas

- D1, classe: sufixo `Error`/`Exception` **mais lista fechada** `CLASSES_DO_PROJETO`, e não o prefixo `Erro`. A lista atende os dois objetivos da spec: o nome livre (`Joana`, `ErroJoana`) não passa, e `ErroEnvioEmail` segue no log sem trocar as 6 asserções. O prefixo deixaria passar `ErroJoanaSilva`, e a lista não. Ela também guarda `TempoEsgotado`, `AvisoNaoEnviado` e `ExecucaoPerdida`, que o prefixo derrubaria, e assim o diagnóstico do `/api/saude` não se perde. O teste estático das classes mantém a lista em dia.
- D1, code: recusa toda sequência de 10 ou mais dígitos, não só o code feito apenas de dígitos. A regra é mais estreita que a spec e a cumpre: barra CPF ou telefone com prefixo ou sufixo (`1234567890A`, a borda da 01). Não derruba code conhecido (Postgres tem 5 caracteres, Node usa letras). C-21 não afrouxa.
- D3: a marca por objeto fica dentro de `capturarErro` e entra qualquer que seja o resultado da conferência no fonte do Next. Custa pouco, vale nas duas ordens e para versões futuras do Next, e não esconde erro distinto, porque a marca é por objeto e não por mensagem (o risco do RSK). A conferência continua obrigatória e vai registrada, como pede o critério de aceite.
- D4: o teste usa a AST do TypeScript, não regex. A AST trata quebra de linha, vírgula aninhada, espalhamento e import renomeado (bordas da 01). Fica só `criarPacoteDecisao`, como diz a spec. Estender a `criarEspecificacao` e `criarParecerRisco` fica para pedido próprio.
- D5: o texto é "demanda já entregue ou encerrada", porque "já encerrada" seria inexato para `entregue` (a spec aceita equivalente). O teste é novo e não altera o de `rotulos-qa.test.ts:124`.
- Um engenheiro só (`engenheiro-backend`), pela nota do maestro: os cinco itens ficam em `src/` e `test/`, sem interface.

## Pendências

- Para o maestro, antes da 03: a conferência do D3 lê `node_modules/next`, que o git não rastreia e fica fora da Pode do `engenheiro-backend` ("ler os arquivos que o git rastreia"). A leitura não altera nada. Libere no prompt da 03 a leitura (Read e Grep) de `node_modules/next/dist/`, para que o engenheiro não precise parar em `bloqueado`.
- D2, registro e não bloqueio: os nomes passam a ser lidos antes da transação. Se `solicitanteNome` for editado entre a leitura e o commit, a vista do 201 minimiza com o nome lido milissegundos antes. A ordem nova não mexe na questão do M-1 da revisão do 0009 (nome antigo ou parcial), que segue com Fabiano.
- D1: classe de erro nova do projeto, fora do sufixo, tem de entrar em `CLASSES_DO_PROJETO`. Quem avisa é o teste estático. Convém registrar isso como convenção no padrão técnico em pedido próprio.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/` — 12 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/instrumentation.test.ts` — lido para conferir o mock de `./lib/sentry` e as classes esperadas

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
