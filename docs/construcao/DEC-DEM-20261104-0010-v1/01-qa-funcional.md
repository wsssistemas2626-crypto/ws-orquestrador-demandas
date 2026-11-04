---
pedido: DEC-DEM-20261104-0010-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, src/lib/reduzir-erro.ts, src/lib/reduzir-erro.test.ts, src/lib/log.ts, src/lib/log.test.ts, src/lib/sentry.ts (grep), src/instrumentation.ts, src/lib/console-saneado.ts, src/lib/rota.ts, "src/app/api/demandas/[id]/especificacoes/route.ts", "src/app/api/demandas/[id]/pareceres-risco/route.ts", "src/app/api/demandas/[id]/pacotes-decisao/route.ts", "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts", src/app/api/saude/route.ts, src/modules/demandas/consultas.ts, src/modules/demandas/transicoes.ts (grep), src/modules/pacotes-decisao/criar.ts, src/modules/agentes/executar.ts, src/components/rotulos.ts, src/components/rotulos-qa.test.ts (grep), src/components/rotulos.test.ts (grep), src/modules/avisos/aviso-dec.test.ts (grep), src/modules/avisos/enviador.test.ts (grep), package.json (grep), test/estatico/ (glob), DEC-DEM-20261103-0006-v1/04-maestro.md, DEC-DEM-20261103-0008-v1/04-maestro.md, DEC-DEM-20261103-0009-v1/04-maestro.md]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Base lida: ramo `construcao/DEC-DEM-20261104-0010-v1`, `package.json` na versão 0.1.8, Next 16.4.1, `@sentry/node`
11.4.0. São cinco defeitos independentes, todos do lado servidor, todos de severidade **baixa** (nenhum expõe dado hoje;
três dependem de um chamador futuro errar). A reprodução abaixo é por leitura do código e por teste a escrever: não rodei
comando (meu agente não tem Bash). Dados de teste todos fictícios.

### D1 — B-1 do 0009: `code` só de dígitos e classe de uma palavra passam pelo filtro do erro

**Arquivo suspeito:** `src/lib/reduzir-erro.ts:6` (`FORMATO_CODE = /^[A-Za-z0-9_]{1,40}$/`), `:8`
(`FORMATO_CLASSE = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/`), `:20-26` (`erroJaReduzido`), `:28-33` (`reduzirErro`).
Afeta também `src/lib/log.ts:59-68` (`normalizarErro`) e `src/lib/sentry.ts:41` (tag do Sentry), que usam as mesmas funções.

**Passos (teste de unidade, sem banco):**

1. `reduzirErro(Object.assign(new Error('x'), { code: '00000000191' }))` (11 dígitos, formato de CPF fictício sem pontos).
2. `reduzirErro(Object.assign(new Error('x'), { code: '11900000000' }))` (11 dígitos, formato de celular fictício).
3. `erroJaReduzido({ classe: 'Joana' })`.
4. `const e = new Error('x'); e.name = 'Joana'; reduzirErro(e)`.
5. `criarLogger(destino).error({ evento: 'falha', erro: { classe: 'Joana', code: '00000000191' } })` e ler a linha.

**Resultado obtido:** (1) `{ classe: 'Error', code: '00000000191' }`; (2) `{ classe: 'Error', code: '11900000000' }`;
(3) `{ classe: 'Joana' }`; (4) `{ classe: 'Joana' }`; (5) a linha do log sai com `"erro":{"classe":"Joana","code":"00000000191"}`.

**Resultado esperado (spec):** `code` só de dígitos com 10 ou mais dígitos é recusado (some do resultado); o `code` de 5
dígitos do Postgres (`23505`, `23514`) e os alfanuméricos (`ECONNREFUSED`, `2200H`, `transitorio`) continuam aceitos.
A classe é `desconhecido` ou um identificador terminado em `Error` ou `Exception`; outra vira `Error` em `reduzirErro` e
não é reconhecida em `erroJaReduzido` (o log devolve `{ classe: 'desconhecido' }`).

**Bordas para o teste:** 9 dígitos (`123456789`, aceito) e 10 dígitos (`1234567890`, recusado); código com dígitos e
letra (`1234567890A`, aceito pelo formato atual: decidir na triagem se fica); `code` na `cause` (`reduzirErro` lê
`cause.code` em `:31`, a regra nova vale também ali); classe `Error` sozinha, `TypeError`, `AggregateError`,
`DrizzleQueryError`, `FooException` (aceitas); `Errorzinho`, `ErrorJoana` (recusadas, não terminam em Error).

**Conflito na spec, para a triagem (ver Pendências):** a regra "termina em Error ou Exception" derruba as classes do
próprio projeto, que começam com `Erro` ou não têm sufixo: `ErroEnvioEmail` (`src/modules/avisos/enviador.ts:35`),
`ErroDominio` (`src/lib/erros.ts:36`), `ErroProvedor` (`src/modules/agentes/provedor.ts:27`), `ErroConfiguracao`
(`src/lib/env.ts:64`), `ErroLeituraSessao` (`src/modules/acesso/exigir-pessoa.ts:21`), `AvisoNaoEnviado`
(`src/modules/avisos/aviso-dec.ts:46`), `ExecucaoPerdida` (`src/modules/agentes/execucoes.ts:29`) e `TempoEsgotado`
(`src/app/api/saude/route.ts:16`). Seis asserções existentes esperam a classe `ErroEnvioEmail` no log e ficariam
vermelhas: `src/lib/log.test.ts:87,93`, `src/modules/avisos/aviso-dec.test.ts:338,396,432` e
`src/modules/avisos/enviador.test.ts:169`. A spec diz ao mesmo tempo que "os testes do log continuam verdes". O
`TempoEsgotado` virar `Error` também apaga, no log do `/api/saude`, a diferença entre tempo esgotado e outra falha.

**Severidade:** baixa. Hoje nenhum chamador passa CPF, telefone ou nome como `code` ou `name`; o defeito é a barreira não
segurar se um chamador futuro fizer isso (C-21).

### D2 — B-3 do 0009: nos 3 POST, falha ao ler os nomes depois de gravar deixa artefato gravado e resposta 500

**Arquivos suspeitos:** `src/app/api/demandas/[id]/especificacoes/route.ts:15-16`,
`src/app/api/demandas/[id]/pareceres-risco/route.ts:15-16`, `src/app/api/demandas/[id]/pacotes-decisao/route.ts:16-17`.
Os três fazem `const v = await criar...(deps, ator, params.id, corpo)` (o serviço faz o commit) e só depois
`await nomesDaDemanda(deps.db, params.id)`.

**Passos (teste de integração com banco de teste e token fictício de agente):**

1. Criar a demanda fictícia `DEM-20261104-9001` (solicitante "Fulana Fictícia Teste"), com ESP e RSK v1 para o caso do DEC.
2. No teste, fazer `nomesDaDemanda` (`src/modules/demandas/consultas.ts:211`) rejeitar uma vez (por `vi.spyOn` ou
   `vi.mock` do módulo, com `new Error('falha simulada')`).
3. `POST /api/demandas/DEM-20261104-9001/especificacoes` com corpo válido e o token de agente `insumo_tecnico`.
4. Contar as linhas de `especificacao_tecnica` da demanda e os eventos `especificacao_criada`.
5. Repetir o POST sem a falha.
6. Repetir 2 a 5 para `pareceres-risco` (agente de risco) e `pacotes-decisao` (agente de consolidação).

**Resultado obtido:** no passo 3, resposta 500 `erro_interno` (`rota()` em `src/lib/rota.ts:155-162`); no passo 4, a
versão v1 está gravada, com evento, e no DEC também a mudança de status para `pronta_para_decisao` e o aviso por e-mail
na fila (`criar.ts:148-150`). No passo 5 nasce a v2: versão duplicada, um segundo aviso de DEC e mais um artefato contado
no limite por ator (C-36).

**Resultado esperado (spec):** `nomesDaDemanda` é lido antes de chamar o serviço; com a falha, 500 e nada gravado (0
linhas, 0 eventos, 0 aviso); a nova tentativa cria a v1. Demanda inexistente continua 404, não 500.

**Verificação do risco do 404:** `nomesDaDemanda` não lança para demanda inexistente: devolve `[]`
(`consultas.ts:199-213`). Ler antes, então, não muda o 404, que continua vindo de `travarDemanda` no serviço. O 409 de
status final, o 429 do limite e o 400 `faltando` do DEC também continuam vindo do serviço. O teste deve conferir os
quatro códigos com a ordem nova.

**Severidade:** baixa. Sem vazamento; efeito é duplicidade de versão e de aviso em falha rara de banco.

### D3 — B-a do 0008: possível duplicação no Sentry do mesmo erro sem `digest`

**Arquivo suspeito:** `src/lib/console-saneado.ts:38` (manda ao Sentry todo `Error` sem `digest` escrito por
`console.error`) e `src/instrumentation.ts:36-56` (`onRequestError` manda ao Sentry todo erro que não é controle do Next,
com ou sem `digest`).

**Passos (para o engenheiro, que tem acesso ao fonte instalado):**

1. No fonte de `node_modules/next` (16.4.1), localizar onde o Next chama `onRequestError` (o gancho de instrumentação) em
   cada caminho: render de página e Server Component, Server Action, route handler e middleware/proxy.
2. Em cada caminho, conferir (a) se o erro recebe `digest` antes de chegar ao gancho e (b) se o mesmo objeto de erro
   também é escrito por `console.error`.
3. Se algum caminho tiver (a) não e (b) sim, reproduzir em teste: um erro sem `digest` passado a `onRequestError` e
   depois a `console.error` com o console saneado instalado e o `capturarErro` espionado.

**Resultado obtido (o que dá para afirmar pelo código do repositório):** a guarda de `console-saneado.ts:38` só pula o
erro com `digest`. Se o Next mandar o mesmo erro sem `digest` aos dois pontos, `capturarErro` é chamado duas vezes (um
evento a mais no Sentry, sem dado). Todas as rotas de API, menos `/api/saude`, passam por `rota()`, que captura o erro e
responde, então não chegam ao `onRequestError`; `/api/saude` também captura o próprio erro (`route.ts:42-45`). Os
caminhos que sobram para conferir são página, Server Component, Server Action e middleware/proxy. **Não conferi o fonte do
Next:** `node_modules` não é rastreado pelo git e fica fora da minha lista Pode.

**Resultado esperado (spec):** a conferência registrada com arquivo e linha do fonte do Next no comentário de
`console-saneado.ts` e na entrega; se a duplicação existir, o segundo envio evitado por marca no objeto de erro (por
exemplo `WeakSet` preenchido em `onRequestError` e consultado no console saneado), com teste. A marca é por objeto, não
por mensagem: dois erros distintos com a mesma mensagem continuam indo os dois.

**Severidade:** baixa (no máximo um evento duplicado, sem dado pessoal).

### D4 — B-1 do 0006: nenhum teste barra rota que passe `extras` a `criarPacoteDecisao`

**Arquivo suspeito:** `src/modules/pacotes-decisao/criar.ts:79-90` (5º argumento `t?: Transacao`, 6º `extras`, com
`especificacaoId` e `parecerRiscoId` que escolhem a ESP e o RSK citados no DEC).

**Passos:**

1. Procurar em `test/estatico/` (12 arquivos) um teste que confira as chamadas de `criarPacoteDecisao` em `src/app/`.
2. Simular a regressão: numa rota fictícia em `src/app/`, chamar `criarPacoteDecisao(deps, ator, params.id, corpo,
   undefined, { especificacaoId: corpo.especificacaoId })` e rodar `pnpm test`.

**Resultado obtido:** (1) não há esse teste; (2) a suíte segue verde, a rota passaria a aceitar a ESP citada vinda do
corpo (C-11, C-25), contida só pelo `citada()` filtrar pela demanda (`criar.ts:70-77`). Hoje os dois chamadores de
produção em `src/app/` passam 4 argumentos: `src/app/api/demandas/[id]/pacotes-decisao/route.ts:16` e
`src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts:20`. O único chamador com `extras` é o worker
(`src/modules/agentes/executar.ts:113`).

**Resultado esperado (spec):** teste estático que falha se algum arquivo de `src/app/` que não é teste chamar
`criarPacoteDecisao` com 5º ou 6º argumento.

**Bordas para o teste:** excluir `*.test.ts` e `*.test.tsx` de `src/app/` (vários testes ali chamam a função, alguns em
várias linhas); chamada quebrada em várias linhas; vírgula dentro de objeto ou de chamada aninhada no 4º argumento (não
contar como argumento a mais); argumento espalhado (`criarPacoteDecisao(...args)`); import renomeado
(`import { criarPacoteDecisao as criar }`). Conferir que o teste fica vermelho com a rota fictícia do passo 2 e verde sem ela.

**Severidade:** baixa (falta de teste de uma regra; sem defeito no código de hoje).

### D5 — B-5 do 0006: `demanda_final` sem rótulo no histórico

**Arquivos suspeitos:** `src/components/rotulos.ts:163-167` (`MOTIVO_IGNORADO` só com `desligado`, `sem_preco` e
`sem_provedor`) e `:221-224` (texto do evento `agente_ignorado`). O motivo nasce em `src/modules/agentes/executar.ts:67` e
`:234`.

**Passos:**

1. Criar demanda fictícia `DEM-20261104-9002`, enfileirar a execução do agente de consolidação e levar a demanda a
   `encerrada` (ou `entregue`) antes de o worker pegar o job.
2. Rodar o worker: a execução fica `ignorada` com o evento `agente_ignorado`, `depois: { agente: 'consolidacao',
   motivo: 'demanda_final' }` (já testado em `src/modules/agentes/executar.test.ts:575`).
3. Abrir o histórico da demanda no painel (ou chamar `textoDoEvento` com esse evento).

**Resultado obtido:** "Agente de consolidação não rodou", sem motivo.

**Resultado esperado (spec):** "Agente de consolidação não rodou: <motivo>", com teste. Observação: os status finais são
`entregue` e `encerrada` (`src/modules/demandas/transicoes.ts:28`); o texto sugerido na spec, "demanda já encerrada",
fica inexato para a demanda `entregue`. Sugestão: "demanda já entregue ou encerrada" (a spec aceita "equivalente").
O teste `src/components/rotulos-qa.test.ts:124` ("os três motivos da T27") deve ganhar o quarto.

**Severidade:** baixa (texto da tela; o pessoa vê que o agente não rodou, sem saber por quê).

### Casos exploratórios sugeridos para a regressão

- D1: o log de `aviso_email_falhou` e o do `/api/saude` com tempo esgotado depois da mudança (classe que sai na linha).
- D2: duas requisições simultâneas ao mesmo POST com a leitura antecipada (não deve mudar a numeração de versão, que
  segue sob a trava da demanda); o `solicitanteNome` editado entre a leitura e a gravação (a vista minimiza com o nome
  lido antes: aceitável, mas registrar).
- D4: estender a mesma barreira a `criarEspecificacao` e `criarParecerRisco`, que também recebem `extras`
  (`execucaoAgenteId`), se a triagem achar que cabe no pedido.
- D5: evento `agente_ignorado` com motivo `teto` (vai como `suspensao_por_teto`, não precisa de rótulo novo) e com motivo
  desconhecido (continua só "não rodou").

## Decisões tomadas

- Usei Read, Grep e Glob, que estavam disponíveis; não rodei comando.
- Não li `node_modules/next`: não é rastreado pelo git, fica fora da minha lista Pode; a conferência do D3 fica com o engenheiro, como a spec prevê.
- Mantive `status: pronto` apesar do conflito do D1: reproduzir não depende dele, e a escolha da regra é da triagem.
- Severidade baixa nos cinco, pelo impacto no usuário: nenhum expõe dado ou trava o fluxo com os chamadores de hoje.

## Pendências

- Para o `tech-lead` (02-triagem), conflito na spec do D1: "classe só terminada em Error ou Exception" contra "os testes do log continuam verdes". `ErroEnvioEmail` e outras 7 classes do projeto viram `Error`, e 6 asserções em 3 arquivos (`log.test.ts:87,93`, `aviso-dec.test.ts:338,396,432`, `enviador.test.ts:169`) ficam vermelhas. Opções: (a) aceitar também uma lista fechada das classes do projeto (a sugestão original do B-1 no 04-maestro do 0009 dizia "ou de lista conhecida"); (b) aceitar também o prefixo `Erro` seguido de maiúscula; (c) seguir a regra estrita e trocar as 6 asserções para `Error`, o que é desvio da spec aprovada e precisa do aceite de Fabiano.
- Para o engenheiro do D3: conferir o fonte de `node_modules/next` 16.4.1 e registrar arquivo e linha.
- Para o engenheiro do D5: confirmar o texto do rótulo, cobrindo `entregue` e `encerrada`.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
