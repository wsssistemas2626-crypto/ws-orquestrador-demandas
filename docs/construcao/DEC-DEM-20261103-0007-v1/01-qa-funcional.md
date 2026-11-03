---
pedido: DEC-DEM-20261103-0007-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [pedido.json, contrato-passagem.md, src/modules/acesso/exigir-pessoa.ts, "src/app/(painel)/layout.tsx", src/app/error.tsx, src/instrumentation.ts, src/instrumentation.test.ts, src/lib/log.ts, src/lib/sentry.ts, src/lib/reduzir-erro.ts, src/lib/rota.ts, src/lib/acao-painel.ts, src/lib/env.ts, src/proxy.ts, src/modules/acesso/auth.ts (trecho do logger), src/modules/acesso/matriz.ts, src/modules/demandas/consultas.ts, src/modules/demandas/servico.ts, src/modules/demandas/transicoes.ts, src/modules/especificacoes/consultas.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pedido-construcao/gerar.ts, src/modules/versoes.ts, src/modules/agentes/entrada-agente.ts (cabeçalho), src/modules/agentes/schemas.ts (trecho), src/modules/avisos/enviador.ts, src/modules/avisos/enviador.test.ts, src/modules/avisos/aviso-dec.ts, "src/app/api/demandas/route.ts", "src/app/api/demandas/[id]/route.ts", scripts/seed-ficticio.ts, scripts/start-hml.ts, scripts/lib/saida.ts, scripts/criar-token-servico.ts (cabeçalho), e2e/servidor.ts, docker-compose.hml.yml, Dockerfile, .github/workflows/ci.yml, .github/workflows/deploy.yml, docs/operacao/deploy.md (trechos), docs/construcao/DEC-DEM-20261022-0001-v1/08-maestro.md (seção Médio)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Reprodução dos seis defeitos do pedido, cada um com ambiente, dado fictício, passos, resultado esperado, resultado
obtido, arquivos suspeitos e severidade. Sem Bash nesta etapa: o resultado obtido vem da leitura do código no ramo
`construcao/DEC-DEM-20261103-0007-v1` (base 0.1.5) e, quando existe, do teste atual que fixa o comportamento errado.
Onde o comportamento depende de biblioteca fora do git (Next, Drizzle), isso está marcado como **hipótese a confirmar
na triagem**.

Ambiente de reprodução comum: homologação local (`docker-compose.hml.yml`, `pnpm start:hml`, app em
`http://127.0.0.1:3200`) ou o servidor do e2e (`e2e/servidor.ts`, `http://127.0.0.1:3101`), ambos com o seed fictício.
Contas: `cto@ficticio.test` e `administradora@ficticio.test` (senha e TOTP do `scripts/seed-ficticio.ts`). Token de
agente: `pnpm tsx scripts/criar-token-servico.ts --agente risco` no banco da homologação (valor fictício, descartado
com o `down -v`).

Severidade geral do pedido: **média** — nenhum item expõe dado a quem está fora da empresa sem outra falha antes, mas
todos ficaram como bloqueio da primeira publicação (CA-P5-16).

---

### D-01 (M-05, C-21) — erro não tratado de página ou layout sai pelo console do Next

**Severidade: média.** Impacto: numa falha de banco durante a leitura da sessão, o token de sessão da pessoa pode
chegar ao log do contêiner (lido no Easypanel), fora da lista de permissão; quem lê o log pode assumir a sessão até
ela expirar. Depende de uma falha de banco no momento do acesso, por isso não é alta.

**Passos:**
1. Subir a homologação e entrar com `cto@ficticio.test` (senha e TOTP do seed). Anotar que o cookie
   `wsod.session_token` existe (não copiar o valor para lugar nenhum).
2. Com a sessão aberta, derrubar o Postgres sem derrubar o app: `docker compose -f docker-compose.hml.yml stop db`
   (ou, em teste, um `auth.api.getSession` falso que lança um erro com `message` contendo
   `token-ficticio-SENTINELA-0001` e `cause` com `code: '57P01'`).
3. Abrir `http://127.0.0.1:3200/demandas` no mesmo navegador.
4. Ler a saída do contêiner do app: `docker compose -f docker-compose.hml.yml logs app`.

**Resultado esperado:** a tela mostra "Não foi possível carregar esta página." (`src/app/error.tsx`); na saída do app,
só linhas JSON do pino com evento fixo (por exemplo `erro_pagina`), `codigoErro`/`erro: { classe, code }` e um
identificador do erro (o `digest` ou outro); nenhuma mensagem, `cause`, SQL nem `params`. No Sentry, o mesmo
`capturarErro` já usado nas rotas.

**Resultado obtido (pelo código):**
- `exigirPessoaNaPagina` (`src/modules/acesso/exigir-pessoa.ts:48`) relança todo erro que não é `ErroDominio`;
  `lerMoldura` (`src/app/(painel)/layout.tsx:35-36`) faz o mesmo. O erro do `auth.api.getSession` sobe sem tratamento.
- `src/instrumentation.ts` só tem `register()`: não há `onRequestError` nem outro ponto que leve erro de página ou layout
  ao `log` ou ao `capturarErro`. O comentário de `src/app/error.tsx:4` ("o registro do erro é do servidor (log e
  Sentry)") não corresponde a nenhum código: hoje ninguém registra.
- O erro chega ao tratamento padrão do Next, que o escreve no stderr do `next start` com mensagem, pilha e `cause`.
  **Hipótese a confirmar na triagem:** o Drizzle 0.45 embrulha a falha em erro cuja mensagem traz a consulta e os
  `params`; na consulta da sessão do Better Auth (adaptador Drizzle), o parâmetro é o token.
- As rotas da API (`src/lib/rota.ts:155-174`) e as Server Actions (`src/lib/acao-painel.ts:37-55`) já capturam e
  reduzem o erro; o logger do Better Auth já está trocado (`auth.ts:128-134`). O furo é só página, layout e, por
  extensão, qualquer Server Component que leia o banco fora desses dois adaptadores (`situacaoDoTeto` e
  `totalDeDemandas` no layout, linhas 38-39, também relançam).

**Arquivos suspeitos:** `src/modules/acesso/exigir-pessoa.ts:44-56`, `src/app/(painel)/layout.tsx:28-41`,
`src/instrumentation.ts`, `src/lib/sentry.ts:40-46`, `src/lib/log.ts`.

**Notas para a triagem:**
- Ponto a provar: até onde sei, o `onRequestError` do Next é um gancho de **notificação** e não impede o Next de
  escrever o erro no console. Se for isso, o gancho sozinho não fecha o M-05: é preciso também que o erro que chega ao
  Next já não tenha mensagem nem `cause` (capturar e relançar um erro saneado, com o mesmo `digest`, em
  `exigirPessoaNaPagina` e no layout) ou outro meio. O teste precisa olhar o **stdout e o stderr reais do processo**
  `next start` (por exemplo, no e2e com um erro provocado), não só a função do gancho isolada.
- O teste pedido pela spec ("parâmetro com token fictício não aparece na saída") deve usar um sentinela que cubra
  `message`, `cause.message`, `stack` e `params`.

---

### D-02 (M-06, C-10, RF-20) — token de agente lê nome do solicitante, anexos e nome da conta autora

**Severidade: média.** Impacto: um token de agente vazado ou um agente mal instruído obtém dado pessoal (nome do
solicitante, nome de quem cadastrou, referências de anexo) que a minimização do RF-20 tira de propósito da entrada do
agente. A matriz só dá leitura, não escrita, e o token é interno.

**Dado de teste:** a demanda "Pedidos do marketplace duplicados no ERP (fictício)" do seed, com
`solicitanteNome: 'Pessoa Ficticia Operacoes'`, autora a conta `Pessoa Ficticia CTO`. Incluir um anexo fictício
`{ tipo: 'url', referencia: 'https://exemplo.test/anexo-ficticio' }` pela tela de edição antes do passo 2.

**Passos:**
1. Gerar um token de agente na homologação: `pnpm tsx scripts/criar-token-servico.ts --agente risco`.
2. `GET http://127.0.0.1:3200/api/demandas/DEM-AAAAMMDD-0001` com `Authorization: Bearer <token-do-passo-1>` e sem
   cookie.
3. Repetir o passo 2 com cookie de `cto@ficticio.test`.
4. Repetir com `GET /api/demandas` (listagem) nos dois atores.

**Resultado esperado:** no ator agente, a resposta não tem `solicitanteNome`, `anexos` nem nome de conta em
`responsavel` (nem nas autorias aninhadas de `especificacoes[]`, `pareceresRisco[]` e `pacotesDecisao[]`, se a
triagem as considerar "nome da conta autora"); na pessoa, tudo como hoje. A listagem segue sem esses campos para os
dois.

**Resultado obtido (pelo código):**
- `ler_demanda` é `LEITURA` (`src/modules/acesso/matriz.ts:37,42`): os quatro agentes podem ler.
- `GET /api/demandas/[id]` (`src/app/api/demandas/[id]/route.ts:9-11`) devolve `obterDemanda` sem olhar o ator.
- `obterDemanda` (`src/modules/demandas/consultas.ts:148-171`) devolve `solicitanteNome` (153), `anexos` (161) e
  `responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' }` (164); as versões aninhadas levam `autor.nome` da conta
  (linhas 92 e 119).
- A listagem (`listarDemandas`, linhas 183-200) **não** expõe esses campos: o `DemandaResumo` só tem id, título, tipo,
  status, urgência, linha de serviço, rascunho e data. Para ela basta um teste de contrato que trave isso.

**Arquivos suspeitos:** `src/modules/demandas/consultas.ts:139-172`, `src/app/api/demandas/[id]/route.ts`.

**Notas para a triagem (fora do texto da spec, mesmo critério):**
- `POST /api/demandas` com token do `orquestrador` (único agente com `criar_demanda`) responde a `DemandaVista` inteira
  (`servico.ts:106`). Hoje só devolve o que o próprio agente mandou, mas, se a vista do agente mudar, a resposta do POST
  deve seguir a mesma regra para não haver dois contratos.
- As leituras próprias de ESP, RSK e DEC também são `LEITURA` e devolvem `autor.nome` da conta
  (`especificacoes/consultas.ts:63`, `pareceres-risco/consultas.ts:50`, `pacotes-decisao/consultas.ts:148`); o DEC
  devolve ainda `aprovadores[].nome` e `decisao.decididaPor` (nome) (`pacotes-decisao/consultas.ts:115,155`). O
  `entrada-agente.ts:3` diz que ao agente "nunca vão ... autoria". Decidir na triagem se entram neste pedido ou vão
  para o backlog com registro.

---

### D-03 (M-07, C-37) — seed fictício roda com a configuração de produção

**Severidade: média.** Impacto: na primeira subida da produção (banco recém-migrado, ainda sem conta nem demanda),
um `SEED_FICTICIO=1` posto por engano no serviço ou num `docker exec` cria em produção quatro contas com senha e
segredo TOTP públicos no git, duas delas com 2FA ativo e papel `cto`/`administradora`. Quem lê o repositório entra
como CTO. Depende de erro de operação, por isso não é alta.

**Passos (em banco descartável que simula a produção):**
1. Subir um Postgres vazio e aplicar as migrations (`pnpm db:migrate` com o migrator, banco fictício).
2. Rodar com a configuração de produção, todos os valores fictícios:
   `NODE_ENV=production BETTER_AUTH_URL=https://orquestrador.exemplo.test BETTER_AUTH_SECRET=<48 caracteres fictícios>
   DATABASE_URL=<banco do passo 1> SEED_FICTICIO=1 pnpm tsx scripts/seed-ficticio.ts`
   (a imagem de produção tem `scripts/` e o `tsx`: `Dockerfile:22-23,46`).
3. Conferir as contas em `user`.

**Resultado esperado:** o seed recusa antes de abrir a transação, com mensagem fixa que cita só nomes de variável
(por exemplo, `BETTER_AUTH_URL` fora do loopback), código de saída 1 e nada gravado. A homologação
(`http://127.0.0.1:3200`), o e2e (`http://127.0.0.1:3101`) e o banco de desenvolvimento em loopback continuam
semeando.

**Resultado obtido (pelo código):** o seed semeia. As guardas de `seedFicticio` (`scripts/seed-ficticio.ts:289-298`)
são só `env.SEED_FICTICIO === '1'` e banco sem demanda e sem conta. `lerConfigApp` aceita o https de produção. Saída:
"Dados fictícios criados: quatro contas @ficticio.test, ..." e código 0. A única outra proteção é documental
(`docs/operacao/deploy.md:73,215`).

**Arquivos suspeitos:** `scripts/seed-ficticio.ts:289-323`.

**Notas para a triagem:**
- O e2e chama `seedFicticio(deps, { SEED_FICTICIO: '1' })` com um `env` que **só tem essa chave**
  (`e2e/servidor.ts:59`); o `BETTER_AUTH_URL` dele está em `deps.config.urlBase`. A homologação passa o ambiente
  inteiro (`scripts/start-hml.ts:59`). Uma guarda que leia `env.BETTER_AUTH_URL` quebra o e2e; a que lê
  `deps.config.urlBase` serve aos três caminhos.
- `config.urlBase` é a `origin` (`env.ts:23`); comparar o `hostname` com a mesma lista `LOOPBACK` de `env.ts:48`
  (exata, sem sufixo: `127.0.0.1.exemplo.test` e `localhost.exemplo.test` têm de ser recusados).
- A mensagem de recusa atual (`MENSAGENS.recusado`, linha 314) diz "exige SEED_FICTICIO=1 e um banco sem nenhuma
  demanda e sem nenhuma conta"; a recusa nova precisa de texto próprio, e o `start-hml.ts:90` imprime "banco já tem
  dados ou SEED_FICTICIO não é 1" para qualquer recusa (ajustar ou aceitar com registro). Na homologação a recusa não
  derruba a subida; decidir se a recusa por configuração de produção deve derrubar.

---

### D-04 (M-08) — DEC pendente de demanda em status final ainda é aprovado e gera Pedido

**Severidade: média.** Impacto: uma demanda que Fabiano encerrou à mão volta a produzir um Pedido de Construção
aprovado, que pode ir ao `/construir` e virar trabalho de engenharia sobre algo que a empresa decidiu não fazer. A
decisão fica no histórico imutável sem ter efeito sobre a demanda.

**Dado de teste:** a demanda "Demanda da decisão (fictício)" do seed, com ESP, RSK e um DEC de nível `cto` criados pela
tela (textos fictícios) — o DEC deixa a demanda em `pronta_para_decisao`.

**Passos (caso A, aprovar):**
1. Com `cto@ficticio.test`, criar ESP, RSK e DEC na demanda; conferir status `pronta_para_decisao`.
2. Na tela da demanda, mudar o status à mão para `encerrada` (transição permitida: `transicoes.ts:20`).
3. Abrir o DEC (`/pacotes-decisao/DEC-...-v1`) e aprovar com a opção A (ou
   `POST /api/pacotes-decisao/DEC-...-v1/decisao` com `{ "statusDecisao": "aprovada", "opcaoEscolhida": "A" }`).

**Passos (caso B, gerar Pedido):**
4. Com o DEC do passo 3 aprovado, `GET /api/pacotes-decisao/DEC-...-v1/pedido-construcao` (ou "Gerar Pedido" na tela).

**Passos (caso C, entregue):** num DEC aprovado com a demanda levada a `aprovada` → `em_construcao` → `entregue`,
repetir o passo 4.

**Passos (caso D, devolver ou arquivar):** repetir os passos 1-3 escolhendo "Devolver" ou "Arquivar".

**Resultado esperado:** passos 3, 4 e D recusados com 409 `conflito` e mensagem fixa, antes de qualquer insert em
`aprovacao`, `decisao` ou `evento_historico` e antes do evento `pedido_gerado`; a demanda segue `encerrada` (ou
`entregue`). A tela mostra "Não foi possível concluir: ..." com a mensagem.

**Resultado obtido (pelo código):**
- `registrarDecisao` (`decidir.ts:201-219`) chama `travarDemanda` (205) e **descarta** a linha devolvida, com o
  status; nenhuma das conferências (211-217) olha o status da demanda. Caso A: grava `aprovacao` e `decisao`
  `aprovada` (163-168) e devolve 200 `aprovada`; a demanda segue `encerrada`.
- Caso D: grava a decisão (221) e `mudarStatusPeloSistema` (222) não faz nada, porque `encerrada` não está na origem de
  `decisao_devolvida` nem de `decisao_arquivada` (`transicoes.ts:75-76,89`): decisão registrada sem efeito, 200.
- `gerarPedido` (`gerar.ts:42-61`) não trava a demanda nem lê o status dela; só olha `statusDecisao`, `desatualizado`
  e `demandaTipo`. Casos B e C: 200 com o JSON e evento `pedido_gerado`.
- A tela do DEC não esconde as ações em demanda final (nenhuma referência a status da demanda em
  `src/app/(painel)/pacotes-decisao/`).

**Arquivos suspeitos:** `src/modules/pacotes-decisao/decidir.ts:201-219`, `src/modules/pedido-construcao/gerar.ts:42-61`,
`src/modules/demandas/transicoes.ts:33-45`.

**Notas para a triagem:**
- `gerarPedido` precisa passar a ler a demanda sob a trava (`travarDemanda`), como pede a spec, para fechar a corrida
  com um encerramento simultâneo.
- `MENSAGEM_DEMANDA_FINAL` (`transicoes.ts:39-40`) fala de "especificação, parecer de risco nem pacote de decisão" e
  começa em maiúscula; os 409 do DEC e do Pedido começam em minúscula porque a tela acrescenta o prefixo
  (`decidir.ts:40`, `gerar.ts:25`). Precisa de mensagem fixa própria para decidir e gerar, e de texto aprovado pela
  `ux-ui-design` se a tela mostrar.
- A ordem importa: a recusa por status final deve vir antes do `jaDecidido` ou depois? Sugestão de teste: DEC já
  decidido em demanda encerrada continua 409 (qualquer das duas mensagens serve, mas o teste deve fixar uma).

---

### D-05 (Aviso) — 408 e 409 do Resend viram `falhou` na primeira tentativa

**Severidade: baixa.** Impacto: o e-mail de "DEC pronto" deixa de sair por uma falha passageira (requisição
concorrente com a mesma Idempotency-Key, ou tempo limite do lado do Resend); o DEC continua na fila do painel, então
Fabiano não perde a decisão, só o aviso.

**Passos:**
1. Teste do enviador com `fetch` falso que responde `409` (e depois `408`) com corpo fictício
   `{ "message": "concurrent idempotent requests (fictício)" }`.
2. Teste de `enviarAviso` com o mesmo `fetch` falso, tentativa 1 de 3.

**Resultado esperado:** `ErroEnvioEmail` tipo `transitorio`; o aviso fica `pendente` com `tentativas: 1` e o job é
tentado de novo (`AvisoNaoEnviado`); na 3ª, `falhou`. 400, 401, 403 e 422 seguem `recusado` e `falhou` na 1ª.

**Resultado obtido:** `classificar` (`enviador.ts:45`) só trata 429 e ≥500 como transitório; 408 e 409 viram
`recusado`, e `enviarAviso` marca `falhou` na hora (`aviso-dec.ts:181-184`). O teste atual **fixa o comportamento
errado**: `enviador.test.ts:125` espera `[409, 'recusado']` — essa linha tem de mudar junto com a correção.

**Arquivos suspeitos:** `src/modules/avisos/enviador.ts:21-22,45`, `src/modules/avisos/enviador.test.ts:118-127`,
`src/modules/avisos/aviso-dec.ts:15,179-180` (comentários).

**Nota para a triagem:** o Resend também usa 409 para a mesma Idempotency-Key com corpo diferente, que não é passageiro.
Com 409 como transitório, esse caso gasta as 3 tentativas e termina `falhou` — limitado e aceitável, mas vale uma linha
no comentário do `classificar`.

---

### D-06 (CI) — actions de terceiros por tag, com "SHA pendente"

**Severidade: média.** Impacto: uma tag `v5` movida por terceiro roda código não revisado no CI e no deploy; no
`deploy.yml` o job `publicar` tem `packages: write` e acesso aos segredos dos webhooks do Easypanel.

**Passos:** ler `.github/workflows/ci.yml` e `.github/workflows/deploy.yml` e listar cada `uses:`.

**Resultado esperado:** todo `uses:` de terceiros na forma `owner/repo@<40 hex> # vX.Y.Z`, com
`actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0` e
`actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5.0.0`; nenhum "SHA pendente"; o CI do PR verde.

**Resultado obtido:**
- `ci.yml`: `actions/checkout@v5 # SHA pendente` nas linhas 30, 51, 71, 87 e 106 (5 vezes);
  `actions/setup-node@v5 # SHA pendente` nas linhas 33, 54 e 74 (3 vezes).
- `deploy.yml`: `actions/checkout@v5 # SHA pendente` na linha 42 (1 vez); não usa `setup-node`.
- Os cabeçalhos dizem que a fixação é pendência: `ci.yml:5-6` e `deploy.yml:12`; e `docs/operacao/deploy.md:248` e
  `:252` também. Esses textos precisam sair ou ser atualizados junto, senão a documentação contradiz o workflow.
- A imagem do gitleaks (`ci.yml:97`) já está por digest; o `workflow_call` local (`deploy.yml:28`) não é de terceiros.

**Arquivos suspeitos:** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `docs/operacao/deploy.md:244-253`.

---

### Casos exploratórios sugeridos para a regressão (04) e para a 07 de quem vier depois

- D-01: erro no layout **e** na página na mesma requisição (duas linhas de log, nenhuma com texto); erro com `cause`
  aninhado em dois níveis; erro cujo `name` é texto livre (o `reduzirErro` troca por `Error`); `redirect()` e
  `notFound()` continuam funcionando (não podem ser capturados como erro).
- D-02: token de cada um dos quatro agentes; demanda criada por agente (`responsavel.tipo = 'agente'`, deve seguir
  igual); pessoa `administradora` vê tudo; demanda sem anexos (o campo some ou vem vazio — o contrato tem de dizer qual).
- D-03: `BETTER_AUTH_URL` em `http://localhost:3101`, `http://[::1]:3101` (passam), `http://127.0.0.1.exemplo.test`,
  `https://localhost.exemplo.test` e `http://10.0.0.5:3101` (recusam); recusa não grava nada nem abre a trava
  consultiva; mensagem sem o valor da URL.
- D-04: demanda encerrada com DEC de nível `cto_e_administradora` com só a aprovação do CTO (a da administradora tem de
  ser recusada); duas abas: uma encerra, a outra aprova ao mesmo tempo (a trava decide, e o resultado não pode ser
  "encerrada com DEC aprovado"); `entregue` também recusa.
- D-05: 408 e 409 nas três tentativas → `falhou` na 3ª com log de erro e Sentry; 410 e 413 seguem `recusado`.

## Decisões tomadas

- Severidade média para D-01 a D-04 e D-06 e baixa para D-05: medidas pelo impacto em quem usa (sessão, dado pessoal,
  integridade da decisão, cadeia de entrega), não pela urgência da publicação.
- Resultado obtido por leitura de código: a etapa não tem Bash; onde um teste existente fixa o comportamento (D-05),
  ele é citado como evidência.
- O comportamento do console do Next e a mensagem do erro do Drizzle ficaram como hipótese marcada: dependem de código
  fora do git, que esta etapa não pode ler.
- Achados vizinhos (POST do orquestrador, autoria nas leituras de ESP/RSK/DEC, mensagem de recusa da homologação)
  ficaram como nota para a triagem, sem ampliar o escopo por conta própria.

## Pendências

- Triagem (`tech-lead`): confirmar se o `onRequestError` impede ou não o log do Next (D-01) e escolher o caminho; decidir
  se a autoria nas leituras próprias de ESP, RSK e DEC entra no M-06 ou vai ao backlog com registro.
- Triagem: confirmar que a guarda do seed lê `deps.config.urlBase`, não `env.BETTER_AUTH_URL` (senão o e2e para).
- `ux-ui-design`: texto da recusa de decisão e de Pedido em demanda final, se a tela o mostrar.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
