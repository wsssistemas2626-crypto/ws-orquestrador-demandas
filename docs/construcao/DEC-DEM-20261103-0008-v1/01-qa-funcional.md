---
pedido: DEC-DEM-20261103-0008-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [pedido.json, contrato-passagem.md, src/modules/demandas/consultas.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/demandas.test.ts, src/modules/agentes/entrada-agente.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/detectores.ts, src/modules/especificacoes/consultas.ts, src/app/api/especificacoes/[espId]/route.ts, src/modules/pareceres-risco/consultas.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/lib/console-saneado.ts, src/lib/sentry.ts, src/lib/log.ts, src/lib/reduzir-erro.ts, src/instrumentation.ts, docs/construcao/DEC-DEM-20261103-0007-v1/04-maestro.md]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Reprodução dos quatro achados da 04-revisao do pedido 0007 (M-1, M-2, M-3 e B-1) sobre o código atual do ramo
(`main` 0.1.6). O agente não tem Bash: a reprodução é **estática**, feita pela leitura do caminho que a requisição
percorre, e cada "resultado obtido" abaixo é o que o código devolve hoje por esse caminho. Os passos estão escritos para a
`02-triagem` e a `04-regressao` rodarem no harness de API já existente (`src/app/api/demandas/demandas.test.ts`, com
`tokenRisco`, `tokenOrquestrador` e `cookieCto`) ou contra o app local com banco de teste.

### Dados de teste (todos fictícios)

| Campo | Valor |
|---|---|
| Nome do solicitante | `Maria Ficticia Teste` |
| E-mail | `maria.teste@exemplo.invalid` |
| CPF (só formato) | `123.456.789-09` |
| Telefone (só formato) | `(11) 90000-0000` |
| Pessoa aprovadora | `Joana Exemplo Silva`, papel `administradora`, referência `ATA-FICTICIA-001` |
| Conta CTO | `Carlos Exemplo CTO` |

Texto livre padrão (T): `Falar com Maria Ficticia Teste, maria.teste@exemplo.invalid, CPF 123.456.789-09, tel (11) 90000-0000`.

Quem pode ler (pela `MATRIZ` em `src/modules/acesso/matriz.ts`): `listar_demandas`, `ler_demanda`, `ler_especificacao`,
`ler_parecer_risco` e `ler_pacote_decisao` são `LEITURA` = qualquer pessoa **e os quatro agentes**
(`orquestrador`, `insumo_tecnico`, `risco`, `consolidacao`). `criar_demanda` aceita pessoa e `orquestrador`.

---

### Defeito 1 (M-1): texto livre da demanda chega sem minimizar ao token de agente

**Severidade: média.** Impacto: dado pessoal de terceiro (nome, e-mail, CPF, telefone do solicitante) sai pela API para um
ator que, pela RF-20 e pela própria entrada do agente, só deveria receber o texto com marcadores. Não é crítica porque o
token de agente é interno e não há produção no ar; **bloqueia a primeira publicação** (CA-P5-16, CA-P5-20), como a revisão
do 0007 registrou.

**Passos — leitura (GET /api/demandas/:id)**
1. Como `Carlos Exemplo CTO` (cookie de pessoa), criar demanda `POST /api/demandas` com `tipo: bug`,
   `solicitanteNome: "Maria Ficticia Teste"`, e T em `titulo` (cortado ao limite do campo, mantendo o nome e o e-mail),
   `contexto`, `descricaoProblema`, `justificativaUrgencia` (com `urgencia` preenchida), `impactoPercebido` e num item de
   `duvidasEntrada`.
2. `GET /api/demandas/<id>` com `Authorization: Bearer <tokenRisco>`.
3. `GET /api/demandas/<id>` com o cookie da pessoa.

**Passos — criação (POST /api/demandas)**
4. `POST /api/demandas` com `Bearer <tokenOrquestrador>` e o mesmo corpo do passo 1. Ler o corpo do 201.

**Passos — listagem (GET /api/demandas)**
5. `GET /api/demandas?tipo=bug` com `Bearer <tokenRisco>`; localizar o item do passo 1.
6. O mesmo com o cookie da pessoa.

**Resultado esperado**
- Passos 2, 4 e 5 (agente): em `titulo`, `contexto`, `descricaoProblema`, `justificativaUrgencia`, `impactoPercebido`, cada
  item de `duvidasEntrada` e o `titulo` de cada item da listagem, o texto vem como na entrada do agente:
  `Falar com [nome removido], [e-mail removido], CPF [CPF removido], tel [telefone removido]`. Nenhum dos quatro valores
  fictícios aparece em nenhum ponto do corpo.
- Passos 3 e 6 (pessoa): o texto original, sem marcador.

**Resultado obtido (pelo código)**
- Passo 2: `vistaDaDemandaPara` (`src/modules/demandas/consultas.ts:199-223`) copia `titulo` (l. 203),
  `justificativaUrgencia` (209), `contexto` (210), `descricaoProblema` (211), `impactoPercebido` (212) e `duvidasEntrada`
  (213) direto de `obterDemanda`. Só somem `solicitanteNome`, `anexos` e o nome do autor. O agente recebe o nome, o
  e-mail, o CPF e o telefone em texto puro.
- Passo 4: o POST passa pela mesma `vistaDaDemandaPara` (`src/app/api/demandas/route.ts:12`): mesmo vazamento.
- Passo 5: `GET /api/demandas` (`route.ts:15-17`) nem recebe o `ator`; `listarDemandas` (`consultas.ts:225-252`) devolve
  `demanda.titulo` cru para qualquer ator. Também não seleciona `solicitanteNome`, então hoje não haveria nome para trocar.
- Passos 3 e 6: pessoa recebe o original (correto, e deve continuar assim).
- O teste atual (`demandas.test.ts:387-410`) só confere **chaves** e sentinelas fora do texto livre; não pega o vazamento.

**Arquivos suspeitos**
- `src/modules/demandas/consultas.ts` (`vistaDaDemandaPara`, `listarDemandas`)
- `src/app/api/demandas/route.ts` (GET sem `ator`)
- referência do comportamento certo: `src/modules/agentes/entrada-agente.ts:127-141` (`minimizarValor`/`escolher`, com
  `nomes: [solicitanteNome]`) e `src/modules/dados-pessoais/minimizar.ts`

---

### Defeito 2 (M-2): leituras de ESP, RSK e DEC dão ao agente nome de pessoa e referência de documento

**Severidade: média.** Impacto: nome de pessoa da empresa (autora, aprovadora, quem decidiu) e a referência de documento
da aprovação saem para o token de agente, contra o critério já aplicado à vista da demanda na 0.1.6 (autoria de pessoa só
pelo tipo).

**Preparação:** na demanda do Defeito 1, como `Carlos Exemplo CTO`, criar ESP v1 e RSK v1 (autoria pessoa), criar o DEC v1
(autoria pessoa) e registrar aprovação de `Joana Exemplo Silva` com `referenciaDocumento: "ATA-FICTICIA-001"` e a decisão.

**Passos (cada um com `Bearer <tokenRisco>` e, de novo, com o cookie da pessoa)**
1. `GET /api/especificacoes/ESP-<id>-v1`
2. `GET /api/demandas/<id>/especificacoes`
3. `GET /api/pareceres-risco/RSK-<id>-v1`
4. `GET /api/demandas/<id>/pareceres-risco`
5. `GET /api/pacotes-decisao/DEC-<id>-v1`
6. `GET /api/demandas/<id>/pacotes-decisao`
7. `GET /api/pacotes-decisao` (fila)
8. Repetir 1 a 7 com ESP, RSK e DEC de autoria agente (criados por `insumo_tecnico`, `risco` e `consolidacao`).

**Resultado esperado**
- Agente, autoria pessoa: `autor` = `{ "tipo": "pessoa" }`, sem `nome`; em cada `aprovadores[]`, sem `nome` e sem
  `referenciaDocumento`; em `decisao`, sem `decididaPor`. Nenhuma ocorrência de `Carlos Exemplo CTO`, `Joana Exemplo Silva`
  ou `ATA-FICTICIA-001` no corpo.
- Agente, autoria agente (passo 8): `autor` = `{ "tipo": "agente", "agente": "<nome>" }`, igual a hoje.
- Pessoa: tudo como hoje, com nome, aprovadores, referência e `decididaPor`.

**Resultado obtido (pelo código)**
- As sete rotas chamam a consulta sem o `ator` (ex.: `src/app/api/especificacoes/[espId]/route.ts:8`) e devolvem a mesma
  vista para pessoa e agente.
- ESP: `src/modules/especificacoes/consultas.ts:63` monta `autor` por `responsavelDe`, que devolve
  `{ tipo: 'pessoa', nome: 'Carlos Exemplo CTO' }`.
- RSK: `src/modules/pareceres-risco/consultas.ts:50`, o mesmo.
- DEC: `src/modules/pacotes-decisao/consultas.ts:148` (`autor` com nome), `:113-120` (`aprovadores[]` com `nome` e
  `referenciaDocumento`) e `:154-156` (`decisao.decididaPor` com o nome da conta). O agente recebe os três nomes e
  `ATA-FICTICIA-001`.

**Arquivos suspeitos**
- `src/modules/especificacoes/consultas.ts`, `src/modules/pareceres-risco/consultas.ts`,
  `src/modules/pacotes-decisao/consultas.ts`
- as rotas: `src/app/api/especificacoes/[espId]/route.ts`, `src/app/api/pareceres-risco/[rskId]/route.ts`,
  `src/app/api/pacotes-decisao/[decId]/route.ts`, `src/app/api/pacotes-decisao/route.ts`,
  `src/app/api/demandas/[id]/especificacoes/route.ts`, `src/app/api/demandas/[id]/pareceres-risco/route.ts`,
  `src/app/api/demandas/[id]/pacotes-decisao/route.ts`
- atenção: as páginas do painel chamam as mesmas consultas direto (ex.:
  `src/app/(painel)/especificacoes/[espId]/especificacao-da-pagina.ts:19`); o corte por ator tem de ficar na rota (ou
  numa função `...Para(ator, vista)` como `vistaDaDemandaPara`), para a tela da pessoa não perder o nome.

---

### Defeito 3 (M-3): erro fora de requisição perde a pilha e não vai ao Sentry

**Severidade: média.** Impacto operacional, sem vazamento: em produção, falha de `uncaughtException`,
`unhandledRejection` ou `onError` do `after()` vira uma linha `console_erro` só com `{ classe, code }`, sem pilha e sem
evento no Sentry, e o diagnóstico fica impossível.

**Passos (teste de unidade, sem rede)**
1. `iniciarSentry({ dsn: 'https://chave@exemplo.invalid/1', transporte: <transporte falso que guarda os envelopes> })`.
2. `instalarConsoleSaneado()`; trocar a saída do `log` por `substituirDestinoDoLog(<destino em memória>)`.
3. `console.error('falha no after', new TypeError('falha ficticia com maria.teste@exemplo.invalid'))` (Error **sem**
   `digest`).
4. `console.error(Object.assign(new Error('erro de página'), { digest: 'abc123' }))` (Error **com** `digest`).
5. Ler as linhas do log e os envelopes do transporte.

**Resultado esperado**
- Passo 3: uma linha `{ evento: 'console_erro', erro: { classe: 'TypeError' } }` no log e **um** evento no Sentry pelo
  `capturarErro` (título `TypeError`, quadros da pilha, sem a mensagem e sem o e-mail fictício).
- Passo 4: a linha de log com `erroId: 'abc123'` e **nenhum** evento novo no Sentry pelo console (esse já vai pelo
  `onRequestError`).
- O texto solto (`'falha no after'`) não sai em lugar nenhum.

**Resultado obtido (pelo código)**
- Passo 3: `src/lib/console-saneado.ts:31-32` só chama `log.error`; o `log` reduz o Error a `{ classe }` e o `redact`
  tira `*.stack`. Nenhuma chamada a `capturarErro`. O Sentry, com `defaultIntegrations: false`
  (`src/lib/sentry.ts:14`), não tem integração de `uncaughtException`/`unhandledRejection`. Resultado: zero eventos no
  transporte, pilha perdida.
- Passo 4: só a linha de log (correto; deve continuar sem segundo envio).

**Arquivos suspeitos:** `src/lib/console-saneado.ts`; `src/lib/sentry.ts` (`capturarErro`, para reaproveitar).

---

### Defeito 4 (B-1): `onRequestError` passa o erro cru ao log

**Severidade: baixa.** Não explorável hoje (o Next entrega `Error`), mas o contrato do log fica com uma porta: valor que
não é `Error` passa como objeto, só sob o `redact` de um nível.

**Passos**
1. `substituirDestinoDoLog(<destino em memória>)`; `NEXT_RUNTIME=nodejs`.
2. `await onRequestError({ message: 'x', query: 'select ... maria.teste@exemplo.invalid', params: ['Maria Ficticia Teste'] }, { method: 'GET' }, { routePath: '/demandas/[id]' })`.
3. Ler a linha `erro_requisicao`.

**Resultado esperado:** `erro: { classe: 'desconhecido' }`, sem `query` nem `params`.

**Resultado obtido (pelo código):** `src/instrumentation.ts:51` passa `erro: err`; `normalizarErro`
(`src/lib/log.ts:57-61`) deixa passar o objeto simples; o `redact` tira só `erro.message`. A linha sai com
`erro.query` (com o e-mail fictício) e `erro.params` (com o nome fictício).

**Arquivo suspeito:** `src/instrumentation.ts` (trocar por `reduzirErro(err)`, de `src/lib/reduzir-erro.ts`).

---

### Casos exploratórios para a 04-regressao (bordas que a correção pode quebrar)

1. Pessoa nunca recebe marcador: o mesmo teste dos dois atores em leitura, criação e listagem (risco do RSK).
2. Nome do solicitante com menos de 3 letras ou com acento/espaço duplo: segue a regra do `minimizar` (não troca abaixo de 3).
3. Listagem com vários itens de solicitantes diferentes: cada `titulo` usa o nome do **seu** solicitante, não o do vizinho.
4. `justificativaUrgencia`, `contexto` etc. nulos: continuam `null` para o agente (não viram string vazia nem somem).
5. Ator `sistema` recebe a mesma vista minimizada (hoje recebe a vista mínima; `demandas.test.ts:403`).
6. DEC sem decisão (`decisao: null`) e sem aprovadores: a vista mínima não quebra.
7. Conta de autor apagada (`nome` nulo): agente segue recebendo `{ tipo: 'pessoa' }`.
8. M-3: Error com `digest` de controle do Next (`NEXT_REDIRECT...`) no console não vai ao Sentry; `console.warn` com
   Error sem `digest` (decidir se vai; a spec fala do Error no console saneado, sem restringir ao nível).
9. M-3: falha do próprio Sentry dentro do console saneado não entra em laço (a guarda `escrevendo` tem de envolver o
   `capturarErro`) e não derruba quem chamou.

### Observações fora do escopo aprovado (para a triagem decidir; não incluídas nos critérios)

- O DEC copia `demandaTitulo` e `demandaDescricao` da demanda (`pacotes-decisao/consultas.ts:141-142`) e devolve
  `decisao.comentarios` (texto livre de pessoa): pelo mesmo raciocínio do M-1, saem sem minimizar para o agente. A spec do
  0008 não cita esses campos.
- Os campos de texto de ESP e RSK lidos pela API também saem sem `minimizar` para o agente, embora a entrada do agente os
  minimize. Também fora do texto aprovado.

## Decisões tomadas

- Reprodução estática por leitura do código: o `qa-funcional` não tem Bash; os passos ficam prontos para execução na 02 e na 04.
- Severidade média para M-1, M-2 e M-3 e baixa para B-1: mantém a da revisão do 0007, justificada pelo impacto (sem produção no ar, token interno; M-3 sem vazamento).
- Os passos cobrem os dois atores em toda rota de leitura afetada, porque o maior risco do RSK é minimizar também para a pessoa.
- As duas observações fora do escopo ficaram só registradas: ampliar o escopo é decisão da triagem e de Fabiano, não do QA.

## Pendências

- Para a `02-triagem`: decidir se `demandaTitulo`, `demandaDescricao` e `decisao.comentarios` do DEC e o texto de ESP/RSK entram no 0008 ou viram item novo (exige aceite de Fabiano, por ampliar o escopo aprovado).
- Para a `02-triagem`: confirmar se o `console.warn` com Error sem `digest` também vai ao Sentry (caso exploratório 8).
- Os resultados obtidos foram lidos no código, não executados; a `04-regressao` confirma rodando.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
