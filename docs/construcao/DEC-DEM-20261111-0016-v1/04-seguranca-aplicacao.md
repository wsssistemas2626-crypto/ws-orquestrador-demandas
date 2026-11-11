---
pedido: DEC-DEM-20261111-0016-v1
etapa: 04-ameacas
agente: seguranca-aplicacao
leu: [pedido.json, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, padrao-tecnico.md, contrato-passagem.md, docs/construcao/DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md, docs/construcao/DEC-DEM-20261110-0015-v1/04-seguranca-aplicacao.md, docs/manual-tecnico/02-acesso-e-seguranca.md, src/lib/rota.ts, src/proxy.ts, src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/tokens-servico.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/demandas/schemas.ts, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/limites.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/entrada-agente.ts, src/modules/pedido-construcao/gerar.ts, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/db/schema/acesso.ts, src/db/schema/historico.ts, src/db/privilegios.ts, estruturaAutonoma/ferramentas/construir/lib/buscar-pedidos.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Modelo de ameaças da 0.3.0 do WS Orquestrador de Demandas (atores de integração `awave` e `construir`), sobre os
componentes C01 a C15 da seção 2 de `02-arquiteto-solucoes.md` e as telas de `03-ux-ui-design.md`. Base: `main` em
a9fd9b8 (0.2.0). Referências: OWASP Top 10 (2021: A01, A04, A05, A07, A08, A09), OWASP API Security Top 10 (2023:
API1 BOLA, API2, API4, API5 BFLA), OWASP ASVS 4.0.3 nível 2 (V1, V2.10, V4, V5, V7, V13) e LGPD. Nível = nível da
ameaça **antes** do controle; na dúvida, o mais alto.

Os controles deste pedido usam o prefixo **IN-** para não colidir com C-01 a C-40, A-, S-, M-, B- e CV-01 a CV-20,
que continuam valendo e **não podem ser afrouxados**.

Achados de leitura do código que viraram controle (o desenho de 02 não os cobria por inteiro):

1. `src/modules/limites.ts`, `autoriaDo`: ator que não é pessoa nem agente devolve `null`, e `conferirLimite` **sai sem
   contar**. Sem mudança, a integração ficaria **sem limite nenhum** (IN-09).
2. `src/modules/agentes/gatilhos.ts` e os serviços de ESP e RSK: uma pessoa que escreve a ESP à mão numa demanda do Awave
   ainda não confirmada dispara o `risco` (chave `esp:`), e `entrada-agente.ts` manda `titulo`, `contexto` e
   `descricaoProblema` da demanda ao provedor. O texto de fora chegaria a um modelo sem a confirmação do D1, e o texto da
   03 ("Até uma pessoa confirmar, nenhum agente de IA trabalha nela") ficaria falso (IN-06).
3. `src/modules/historico/consultas.ts`, `atorVisivel`: ator que não casa vira `{ tipo: 'sistema' }`. Sem mudança, o ato
   do Awave apareceria como "Sistema" no histórico (repúdio, IN-02).
4. `src/modules/demandas/consultas.ts`, `vistaDaDemandaPara`: todo ator que não é pessoa recebe a vista mínima **de
   agente**, com `contexto`, `descricaoProblema`, versões e execuções (IN-02, IN-08).

### 1. Fronteiras de confiança tocadas

| # | Fronteira | O que muda neste pedido |
|---|---|---|
| F2 | Cliente de servidor → API | Novo: dois tokens de integração. Awave entra pela rede interna do Easypanel (`http://orquestrador_app`, sem TLS, sem passar pelo Traefik); `/construir` entra pelo domínio público em HTTPS |
| F3 | Texto de fora → sistema | Novo: título, descrição e contexto escritos por agentes do Awave (com aprovação do dono no Awave) entram direto nos campos estruturados da demanda, sem `entrada_bruta` |
| F4 | Sistema → provedor de IA | Muda: a demanda do Awave só pode chegar ao provedor depois da confirmação por pessoa (D1) |
| F5 | App → `/construir` | Muda: o pedido deixa de ser copiado à mão; o `/construir` busca pela API e grava no git da estruturaAutonoma, onde agentes com Bash o executam. O ponto humano passa a ser só a geração por pessoa (RF-22, confirmação C-28) |
| F7 | App → Postgres | Migration aditiva: `token_servico.agente` anulável, coluna `integracao`, CHECKs ampliados |

### 2. STRIDE por componente (seção 2 de 02)

#### C01 Ator e token de serviço (`acesso.ts`, `ator.ts`, `tokens-servico.ts`, `resolver-ator.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Linha de `token_servico` com `agente` e `integracao` nulos (ou valor fora das listas) aceita como ator válido; token de agente lido como integração ou o contrário | crítica | IN-03 |
| T | `agente` anulável faz um token antigo virar "agente nulo" que alguma regra trata como permitido | alta | IN-03, IN-01 (`permitido` exige o valor na lista) |
| R | Ato de integração sem identificar qual token agiu | média | IN-12 (prefixo em todo evento de integração) |
| I | Token em claro no banco, no log ou no erro | alta | C-09 sem mudança; IN-04, IN-14 |
| D | Nenhuma nova (a busca por hash é a de hoje) | baixa | — |
| E | Integração resolvida como `AtorAgente` e herdando a linha `LEITURA` (fila inteira, ESP, RSK, DEC) | crítica | IN-01, IN-02, IN-03 |

#### C02 Scripts de token (`criar-token-servico.ts`, `revogar-token-servico.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Script aceita integração fora da lista ou agente e integração juntos | média | IN-04 (CA-02.3) |
| T | `--token` informado por argumento (token escolhido, fraco, ou no histórico do shell) | média | C-37, IN-04 |
| R | Emissão ou revogação sem evento | média | C-37, IN-04 |
| I | Token impresso pelo pino, gravado em evento ou escrito na documentação de operação | alta | IN-04 |
| D | Revogação por prefixo errado derruba o token de outra integração | baixa | prefixo de 48 bits (colisão desprezível); a saída do script cita o prefixo revogado |
| E | Nenhuma (rodar o script já exige shell no servidor) | baixa | — |

#### C03 Matriz de acesso (`matriz.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Nenhuma própria (vem de C01) | baixa | — |
| T | Ação nova (`confirmar_demanda` e as três do `construir`) nascendo aberta para agente ou integração; `ler_demanda` do awave reaproveitando `LEITURA` | crítica | IN-01 |
| R | Nenhuma | baixa | — |
| I | Awave em `listar_demandas`, histórico, ESP, RSK, DEC, texto bruto ou configuração (vazamento entre origens) | crítica | IN-01 |
| D | Nenhuma | baixa | — |
| E | Afrouxamento acidental da matriz (BFLA): integração permitida em ação fora da tabela de RF-03 | crítica | IN-01 (teste com a lista exata de pares permitidos) |

#### C04 Criação de demanda (`servico.ts`, `POST /api/demandas`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Autoria vinda do corpo (`autorTipo`, `rascunhoAgente`); `solicitanteNome` usado para fingir pessoa | crítica | C-11; IN-05 |
| T | Awave preenche `urgencia`, `linhaServicoProvavel` ou `anexos` com URL (phishing no painel, prioridade forjada), campos que o contrato não usa | alta | IN-05 (lista de permissão de campos) |
| T | Texto do Awave com injeção de instrução indo ao `insumo_tecnico` sem pessoa no meio | alta | IN-06 (D1) |
| R | Demanda do Awave sem o prefixo do token no evento | média | IN-12 |
| I | Nome de pessoa no `solicitanteNome` do corpo gravado na demanda | média | IN-05 (`solicitanteNome = "Awave"`, valor do corpo descartado) |
| D | Token do Awave vazado ou agente do Awave em laço esgota a sequência de 9.999 ids por dia | alta | IN-09 |
| D | Repetição do Awave depois de 201 perdido duplica a demanda (contrato sem chave de idempotência) | baixa | IN-09, rascunho, confirmação; risco residual (Pendências) |
| E | Integração `construir` cria demanda | alta | IN-01; CHECK `demanda_autor_integracao_check` (IN-05) |

#### C05 Confirmação da demanda do Awave (`confirmar.ts`, Server Action)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Confirmação por agente, integração ou sessão sem 2FA | alta | IN-07, C-04 |
| T | Confirmação forjada por outro site (CSRF da Server Action); confirmação de demanda que não é do Awave ou em status final | alta | IN-07, C-15 (`allowedOrigins`) |
| R | Pessoa nega ter liberado o texto ao modelo | média | IN-07 (evento com a pessoa, sessão com 2FA) |
| I | Nenhuma nova (a pessoa já lê a demanda inteira) | baixa | — |
| D | Duas confirmações simultâneas criam duas execuções (custo de IA dobrado) | média | IN-07 (trava da demanda e chave idempotente `demanda:<id>`) |
| E | Agente de IA trabalhando na demanda antes da confirmação por outro gatilho (ESP ou RSK escritos à mão) | alta | IN-06 |

#### C06 Leituras de demanda (`consultas.ts`, `GET /api/demandas/:id`, `GET /api/demandas`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Nenhuma própria | baixa | — |
| T | Filtro `origem` interpolado em SQL | média | C-17 (Zod `enum`, Drizzle `eq`) |
| R | Nenhuma | baixa | — |
| I | Awave lê demanda de outro autor (BOLA) ou descobre que ela existe (404 diferente do inexistente, ou 403) | crítica | IN-08 |
| I | Awave recebe a vista de agente (texto livre, versões, execuções) ou campo novo da vista inteira | alta | IN-02, IN-08 |
| I | `origem` na listagem do agente | baixa | aceito: enumeração sem dado pessoal (seção 6) |
| D | Nenhuma relevante | baixa | — |
| E | Detalhe de demanda do Awave lido por agente lança 500 (`responsavelDe` sem o caso integração) | média | IN-02 (CA-10.6) |

#### C07 Limite por ator (`limites.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| D | Integração cai no `return null` de `autoriaDo` e fica sem limite | alta | IN-09 |
| T | Corrida de 11 requisições simultâneas passa do 10 | média | trava consultiva por ator (C-36); IN-09 (CA-08.4) |
| S, R, I, E | Nenhuma | baixa | — |

#### C08 Adaptador de rota (`rota.ts`, `proxy.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Cookie + Bearer deixando de responder 400 | alta | C-09 sem mudança; IN-15 |
| T | "Conserto" do C-15 para o Awave passar (ex.: dispensar `Origin` também com cookie, ou aceitar corpo sem JSON) | alta | IN-15 |
| R | Linha de log sem tipo de ator para integração | baixa | `atorTipo: 'integracao'` (C-21) |
| I | Nome da integração, prefixo ou token na linha de log; erro 503 do ADR-28 com texto do Postgres | alta | IN-14 |
| D | Requisição presa em trava segura conexão além do tempo do cliente | média | ADR-28 com IN-14 |
| E | Nenhuma nova | baixa | — |

#### C09 Entrega ao `/construir` (`conferir.ts`, `entregar.ts`, `pendentes.ts`, `receber.ts`, três rotas)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Pedido entregue de DEC cujo `pedido_gerado` não foi de pessoa, ou sem `pedido_gerado` | alta | IN-10 |
| T | Pedido com instrução injetada chega a agentes com Bash sem a cópia manual de Fabiano | alta | IN-10 (as conferências da geração refeitas, C-14 e C-28 na geração por pessoa); risco residual (Pendências) |
| T | Recebimento confirmado com hash que não é o do servidor; DEC some de `pendentes` sem ter sido gravado | média | IN-11 |
| R | Entrega ou recebimento sem evento | média | IN-12 |
| I | Dado pessoal no pedido entregue (nome renomeado depois da geração, DEC antigo) indo para o git sem expurgo | alta | IN-10 (C-28 e conferência do nome refeitas na entrega) |
| I | `pendentes` com título, nome ou data | média | IN-10 (só `decId`) |
| D | Token do `construir` vazado chama a entrega em laço (montagem de até ~1 s e trava da demanda por chamada) | média | ADR-28 (`lock_timeout` 2 s), revogação pelo prefixo; sem limite novo (RNF-03 do 01) |
| E | Awave, agente ou pessoa nas três rotas | alta | IN-01 (CA-03.3, CA-03.4) |

#### C10 Painel: fila e detalhe da demanda

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Página ou Server Action nova sem `exigirPessoa` | crítica | C-04 (teste estático de hoje cobre o arquivo novo) |
| T | XSS ou caractere de direção no título e textos do Awave (texto de fora) nos lugares novos (seção de confirmação) | alta | C-18, CV-18 (valem para a seção nova) |
| T | `origem` da URL refletida crua no `href` dos contadores ou no campo oculto | média | CV-07 estendido a `origem` (IN-16) |
| I | Origem lida do `solicitanteNome` (editável) e não da autoria | média | RF-10, IN-02 |
| R, D, E | Nenhuma nova | baixa | — |

#### C11 Painel: DEC e histórico

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| R | Ato do Awave ou do `/construir` mostrado como "Sistema" | média | IN-02 |
| I | Token, hash ou SHA-256 mostrado no histórico; prefixo vindo de outro lugar que não a coluna | média | IN-13 |
| T | Prefixo ou id de DEC fora do formato injetado no texto do evento | baixa | regex na exibição (03, 5.6) e IN-13 |
| S, D, E | Nenhuma | baixa | — |

#### C12 Histórico (gravação, `registrar.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Evento de integração gravado sem prefixo ou com `ator_id` fora da lista | média | IN-12 (CHECK `evento_ator_integracao_check`) |
| T | Evento apagado ou editado | alta | C-34 sem mudança |
| R | Evento novo sem caso em `colunasDoAtor` | média | IN-02 |
| I | Texto livre do Awave (título, descrição, contexto, nome do corpo) ou SHA-256 vindo do cliente no `depois` | alta | IN-12, C-30 |
| D, E | Nenhuma | baixa | — |

#### C13 Esquema e migration (`0007`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Migration que altera dado existente ou edita migration da `main` | média | IN-17 |
| E | Coluna nova entrando em `colunasUpdate` (o app passaria a mudar o dono de um token) ou GRANT novo | alta | IN-17 |
| I | Volta para a 0.2.0 com token de integração ativo: lido como "agente nulo" | baixa | a 0.2.0 nega (`AGENTES.includes(null)` é falso, 403); a volta é por restauração (ADR-12) |
| S, R, D | Nenhuma | baixa | — |

#### C14 Homologação e testes

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| T | Teste de segurança existente apagado ou enfraquecido para a integração passar | alta | IN-16 |
| I | Token da V-01 escrito em arquivo do repositório, fixture ou log do e2e | alta | IN-04 (emitido dentro da homologação, só em memória ou em arquivo temporário fora do repositório, com permissão 600) |
| S, R, D, E | Nenhuma | baixa | — |

#### C15 Versão e documentação

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| I | Token, hash ou valor de `.env` em `docs/operacao/`, manual ou CHANGELOG | alta | IN-04, IN-18, C-39 (varredura de segredo) |
| T | Procedimento de troca sem revogar o antigo | média | IN-18 |
| S, R, D, E | Nenhuma | baixa | — |

#### Integrações (seção 6 de 02)

| Integração | Ameaça | Nível | Controle |
|---|---|---|---|
| Awave → `POST /api/demandas`, `GET /api/demandas/:id` | Token em claro na rede interna do Easypanel (sem TLS); outro contêiner da mesma rede chega ao app sem passar pelo Traefik | média | escopo mínimo (IN-01), 10/h (IN-09), revogação; transporte decidido no DEC (opção A): risco residual (Pendências) |
| `/construir` → três rotas | Token em arquivo do usuário `deploy`, que também roda os agentes do `/construir` com Bash | média | escopo de três ações (IN-01), `lerToken` exige 600; risco residual (Pendências) |
| Orquestrador → Anthropic | Texto do Awave sem confirmação | alta | IN-06 |

### 3. Controles exigidos

Todos são critério de aceite de alguma tarefa do plano. "Teste" é Vitest com Testcontainers quando toca o banco, ou
Playwright contra o build de produção ou a homologação, sempre com dado e token fictícios.

| Id | Nível | Controle (critério verificável) | Cobre |
|---|---|---|---|
| IN-01 | crítica | **Matriz fechada por integração.** `Linha.integracoes` com padrão vazio; `LEITURA` sem integração; `ler_demanda` em linha própria. `permitido` tem ramo `integracao` que exige `INTEGRACOES.includes(ator.integracao)` **e** `linha.integracoes.includes(ator.integracao)`; `sistema` continua negado. `confirmar_demanda` só pessoa (qualquer papel), sem agente nem integração. Testes: (a) teste de unidade que monta, a partir de `MATRIZ`, o conjunto de pares (ação, integração) permitidos e compara com o conjunto exato `{criar_demanda:awave, ler_demanda:awave, listar_pedidos_pendentes:construir, entregar_pedido:construir, confirmar_recebimento_pedido:construir}`; qualquer acréscimo falha; (b) `atoresProibidos` devolve as integrações (CA-03.5) e o teste que percorre as rotas (T13) chama **toda** rota com token `awave` e com token `construir` e espera 403 fora dos pares permitidos, sem gravar nada (CA-03.1, CA-03.2); (c) as três rotas novas com os quatro agentes, com `awave` e com pessoa (Origin correto, JSON) respondem 403 (CA-03.3, CA-03.4); (d) ator montado com integração `jarvis` negado em toda ação de `ACOES` (CA-03.6) | C01 E, C03 T, I e E, C04 E, C09 E |
| IN-02 | crítica | **Ramos exaustivos por tipo de ator.** Todo ponto que decide por `ator.tipo`, `autorTipo` ou `atorTipo` é `switch` terminado em verificação `never`, sem `else`/padrão que trate "não pessoa" como agente: `permitido`, `vistaDaDemandaPara`, `listarDemandasPara`, `vistaDaEspecificacaoPara`, `vistaDoParecerPara`, `vistaDoPacotePara`, `autoriaDo` de `servico.ts`, `autoriaDaDemanda`, `autoriaDo` de `limites.ts`, `responsavelDe`, `responsavelMinimo`, `atorVisivel`, `colunasDoAtor` e `montarEntrada`/`entrada-agente.ts`. Nas vistas de ESP, RSK e DEC (que a integração nunca alcança, IN-01), o caso `integracao` **lança** `sem_permissao`; nunca devolve a vista de agente. `atorVisivel` devolve `{ tipo: 'integracao', integracao, prefixo }` para `ator_id` da lista e um caso próprio para valor fora dela (03: "Integração"), nunca `sistema`. Testes: unidade de cada vista com ator de integração (lança, ou a vista de 6 chaves na demanda); histórico de demanda do Awave mostra o ator Awave, não Sistema; CA-10.6 (agente lê demanda do Awave sem 500). O plano (05) lista o inventário por caminho | C01 E, C06 I e E, C10 I, C11 R, C12 R |
| IN-03 | alta | **Token de integração resolvido só por lista.** Formato, geração (`randomBytes(32)`), hash SHA-256, prefixo e mensagem 401 sem mudança (C-09). `validarTokenServico` devolve `AtorIntegracao` só quando `integracao ∈ INTEGRACOES` e `agente` é nulo; `AtorAgente` só quando `agente ∈ AGENTES` e `integracao` é nula; qualquer outra linha devolve `null` (401). No banco, CHECK `token_servico_dono_check` (`num_nonnulls("agente", "integracao") = 1`) e `token_servico_integracao_check`. Testes: linha com os dois nulos e linha com agente fora da lista, inseridas pelo migrator no teste, respondem 401; INSERT pelo papel do app com os dois preenchidos é recusado pelo CHECK; CA-01.1 a CA-01.5 | C01 S, T e E |
| IN-04 | alta | **Emissão sem vazar o token.** `criar-token-servico.ts` com `strictObject`: exatamente um entre `--agente` e `--integracao awave\|construir`; `--token` recusado (CA-02.3). O token sai uma vez na saída padrão; nunca no pino, em evento, em mensagem de erro, na documentação ou em arquivo do repositório. `token_criado` leva só `{ integracao, prefixo }`. O token da V-01 é emitido dentro da homologação e passado ao `buscar-pedidos.mjs` por arquivo temporário fora do repositório, com permissão 600, apagado no fim. Testes: CA-02.1, CA-02.2, CA-02.6 (o texto depois do prefixo não aparece em log nem evento); a varredura de segredo do CI (C-39) passa no ramo | C02 S, T, R e I, C14 I, C15 I |
| IN-05 | crítica | **Autoria e campos do Awave por lista de permissão.** Para autoria `integracao`/`awave`, o INSERT de `demanda` usa só `titulo`, `tipo`, `solicitantePapel`, `descricaoProblema` e `contexto` do corpo; `solicitanteNome = "Awave"`, `rascunhoAgente = true`, `anexos = []`, `duvidasEntrada = []` e `urgencia`, `justificativaUrgencia`, `impactoPercebido`, `linhaServicoProvavel` nulos, seja o que for enviado, **sem 400** (o contrato do Awave não quebra). CHECK `demanda_autor_integracao_check` (`autor_tipo <> 'integracao' or (autor_id = 'awave' and rascunho_agente)`). `privilegios.ts` sem diff (o UPDATE de `demanda` continua sem `autor_*` e `rascunho_agente`). Testes: CA-04.2 a CA-04.4; POST do `awave` com `anexos: [{ "tipo": "url", "referencia": "https://exemplo.test/x" }]`, `urgencia: "alta"` e `impactoPercebido` com sentinela fictício responde 201 e o banco tem `anexos = []`, os quatro campos nulos e nenhum sentinela; INSERT pelo papel do app com `autor_id = 'construir'` ou com `rascunho_agente = false` para integração viola o CHECK | C04 S, T, I e E |
| IN-06 | alta | **Nenhum agente de IA trabalha em demanda do Awave sem confirmação (D1).** `criarDemanda` dispara só para pessoa e agente (lista de permissão, não "todo mundo menos integração"). Além disso, `dispararSeLigado` (ponto único dos gatilhos) devolve `false` sem criar execução nem job quando o `demandaId` é de demanda com `autor_tipo = 'integracao'` e sem evento `demanda_confirmada`; vale para `insumo_tecnico`, `risco` (ESP escrita por pessoa) e `consolidacao` (RSK escrito por pessoa). A execução no worker confere a mesma condição antes de chamar o provedor e, sem confirmação, encerra sem chamar (sem linha em `uso_ia`). Na confirmação, o evento é gravado antes do `dispararSeLigado`, na mesma transação. Testes: CA-05.1; com os quatro agentes ligados e teto livre, pessoa grava ESP e RSK na demanda do Awave não confirmada e não há execução de `risco` nem de `consolidacao`, e o provedor falso não recebe chamada; depois da confirmação, uma ESP nova dispara o `risco` como hoje; CA-05.2 e CA-06.1 (regressão) | C04 T, C05 E, integração Anthropic |
| IN-07 | alta | **Confirmação só por pessoa, no servidor.** `confirmarDemandaNoPainel` num arquivo `'use server'` coberto pelo teste estático do C-04, com `exigirPessoa`, entrada por Zod (`strictObject({ id: regex de RE_ID_DEMANDA })`) e `autorizar(pessoa, 'confirmar_demanda')` antes de tocar o banco; `confirmarDemanda` chama `autorizar` também (chamada direta por agente, integração ou sistema → 403, CA-06.6). Sob `travarDemanda`: origem diferente de Awave → 409; status final → 409; já confirmada → sucesso sem gravar. Evento `demanda_confirmada` com a pessoa e `depois: { confirmada: true }`. Sem rota de API. Testes: CA-06.1 a CA-06.6; duas confirmações simultâneas (duas conexões) terminam com um evento e uma execução; Server Action chamada com `Origin` de outro site é recusada (C-15, `allowedOrigins`) | C05 S, T, R e D |
| IN-08 | crítica | **Awave lê só a própria demanda, sem oráculo.** `obterDemandaDaIntegracao` põe `id`, `autor_tipo = 'integracao'` e `autor_id = ator.integracao` no mesmo `WHERE`; sem linha, lança o mesmo `nao_encontrado` do inexistente. A rota decide pelo tipo do ator **antes** de qualquer outra leitura e nunca chama `obterDemanda` para integração. Vista montada chave a chave com exatamente `id`, `titulo` (por `textoMinimo`), `tipo`, `status`, `criadaEm`, `atualizadaEm`; o 201 do POST usa a mesma vista. Testes: CA-07.1 a CA-07.4; status e corpo do 404 de demanda de pessoa e de agente iguais, byte a byte, aos de um id que não existe; sentinelas fictícios em `contexto`, `descricaoProblema`, `solicitanteNome` (editado por pessoa) e numa ESP da demanda não aparecem no corpo lido pelo Awave | C06 I |
| IN-09 | alta | **Limite por integração, nunca "sem limite".** `limites.ts` com `switch` exaustivo: pessoa e agente como hoje (30 e 60); `integracao`/`awave` = 10 demandas na janela de 60 min, com a mensagem própria; integração sem limite definido para o tipo **lança** (nunca `return`); só `sistema` sai sem contar. Chave da trava `limite:demanda:integracao:awave`. Recusa antes do `nextval`. Testes: CA-08.1 a CA-08.4; teste de unidade com ator `construir` em `conferirLimite(..., 'demanda')` lança em vez de passar | C04 D, C07 D e T |
| IN-10 | alta | **Entrega só do que uma pessoa gerou, com as conferências refeitas.** `pendentes` e `entrega` exigem evento `pedido_gerado` com `ator_tipo = 'pessoa'` e `entidade = 'pacote_decisao'`; sem ele, 404 igual ao do DEC inexistente. A entrega chama o mesmo `conferirEMontarPedido` da geração (passos 3 a 11 de RF-22: trava, status final, aprovada, substituído, desatualizado, estudo, montagem, C-28 com e-mail, telefone e CPF, nome do solicitante atual e `validarPedido`); recusa não grava evento. Resposta 200 com `content-type: application/json; charset=utf-8`, `nosniff` e `no-store` (de `rota()`), corpo = `serializarPedido`. `pendentes` devolve só `{ itens: [{ decId }] }`. Testes: CA-12.1 a CA-12.6, CA-13.1 a CA-13.4 (inclui o 422 sem o valor); um `pedido_gerado` com ator agente, inserido à mão no teste, não põe o DEC em `pendentes` e a entrega responde 404 | C09 S, T e I |
| IN-11 | média | **Recebimento confere com o hash do servidor.** Corpo por Zod `{ sha256: /^[0-9a-f]{64}$/ }`; o valor é comparado com o `sha256` gravado em `pedido_entregue` do mesmo DEC; sem entrega anterior → 409; diferente → 409 sem evento; igual → 204 e `pedido_recebido` uma vez, sob trava consultiva por DEC. Testes: CA-14.1 a CA-14.5 | C09 T |
| IN-12 | alta | **Eventos novos sem texto livre (C-30, RNF-05).** `depois` exato: `demanda_criada` do Awave `{ status: 'nova', tipo }`; `demanda_confirmada` `{ confirmada: true }`; `pedido_entregue` e `pedido_recebido` `{ sha256 }` com o hash **calculado pelo servidor** sobre os bytes entregues e conferido por `^[0-9a-f]{64}$` antes de gravar; `token_criado` de integração `{ integracao, prefixo }`; `token_revogado` como hoje. Todo evento de integração com `ator_id` da lista e `ator_token_prefixo` preenchido (CHECK `evento_ator_integracao_check`). Testes: o teste transversal de sentinelas (C-21, RNF-10 de hoje) ganha o fluxo do Awave (sentinela em `titulo`, `descricaoProblema`, `contexto`, `solicitanteNome` e `anexos` do corpo) e o do `/construir` (sentinela na ESP do pedido); nenhum evento, linha do pino, envio ao Sentry falso nem tabela do esquema `pgboss` contém sentinela ou o texto do token depois do prefixo; CA-04.5, CA-13.5 | C01 R, C04 R, C09 R, C12 S, R e I |
| IN-13 | média | **Prefixo no histórico só para pessoa, só da coluna.** O rótulo "<nome> (prefixo <prefixo>)" (03, 5.6) é montado só na leitura de pessoa (`ler_historico`: painel e `GET /api/demandas/:id/historico`); o prefixo vem só de `evento.ator_token_prefixo` e só aparece se casar `^[A-Za-z0-9_-]{8}$`; nunca vai à vista de agente ou de integração, à linha de log, ao Sentry nem a e-mail. O histórico nunca mostra token, hash do token nem o `sha256` do pedido. Teste: histórico de demanda do Awave criada com token fictício contém o prefixo e não contém o token inteiro nem a parte depois do prefixo; prefixo fora do formato gravado à mão no teste sai só como "Awave" | C11 I e T |
| IN-14 | média | **Log e tempo limite sem vazamento.** A linha por requisição das rotas tocadas leva só `atorTipo: 'integracao'`, sem nome da integração, prefixo, hash, `decId` ou corpo (RNF-04). `SET LOCAL lock_timeout` e `statement_timeout` (ADR-28) escritos como literal constante no template `sql`, sem valor interpolado e sem `sql.raw` (o teste estático do C-17 continua); `57014` e `55P03` viram 503 `indisponivel` com mensagem fixa pelo `mapearErro`, sem texto do Postgres, e a transação desfaz tudo. Testes: linha de log capturada do POST do Awave e das três rotas sem `wsod_` e sem o prefixo; com `lock_timeout` estourado por uma trava segurada no teste, 503 com mensagem fixa e nenhuma demanda nem evento gravados | C08 I e D |
| IN-15 | alta | **C-15 e C-09 sem afrouxamento.** `git diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts` vazio; em `src/lib/rota.ts`, diff só em `EXEMPLO_DO_PARAMETRO`, se o T13 precisar. Bearer sem cookie e sem `Origin` é aceito; corpo declarado continua só JSON; POST sem corpo e sem `content-type` passa (entrega). Testes: CA-09.1 a CA-09.4 (inclui `Host: orquestrador_app` e cookie qualquer sem `Origin` → 403); cookie de sessão + Bearer → 400 (teste de hoje); o e2e da homologação faz o POST do Awave sem `Origin` | C08 S e T |
| IN-16 | alta | **Nenhum teste de segurança enfraquecido e filtro novo não refletido cru.** Os testes de `matriz`, `resolver-ator`, `tokens-servico`, C-11, C-30, C-36, `privilegios`, `vistas-para-agente`, `e2e/seguranca*.spec.ts` e `test/estatico/*` sem asserção a menos, contada por arquivo; mudança em teste existente só para acrescentar a integração. CV-07 vale para `origem`: o `href` dos contadores e o campo oculto saem só do valor do `enum` depois do parse. E2e: `/demandas?origem=%3Cscript%3E` mostra o alerta de filtro inválido e nenhum `href` nem `input` com o texto injetado | C10 T, C14 T |
| IN-17 | média | **Migration só aditiva e sem privilégio novo.** Uma migration gerada (`pnpm db:generate`), nenhuma da `main` editada; ensaio de rollback com `alteram_dado = false`; `privilegios.ts` e o GRANT sem mudança (`token_servico.integracao` fora de `colunasUpdate`); `privilegios.test.ts` verde. O seed da homologação tem uma demanda do Awave e um DEC com pedido gerado por `gerarPedido`, para o ensaio migrar dado de integração | C13 T e E |
| IN-18 | média | **Guarda e troca dos tokens documentadas, sem valor.** `docs/operacao/` diz: token do Awave só no cofre ou nas variáveis do serviço `empresa-ia` (nunca no repositório do Awave nem neste); token do `/construir` em arquivo de `~/.config/ws-construir/` com permissão 600 (o `lerToken` recusa outra); troca = emitir o novo, trocar no cliente, revogar o antigo pelo prefixo; troca imediata em suspeita de vazamento e troca periódica (sugestão: a cada 12 meses); como achar o prefixo de um token ativo sem exibir o token. Nenhum token, hash ou valor de `.env` no texto (CA-16.2). Conferência na revisão da tarefa de documentação e na 08 | C15 I e T |

### 4. Dados pessoais (LGPD)

Bases legais, retenção e expurgo seguem a seção 4 de `DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md` (D1 a D12),
com confirmação pendente de `juridico-contratos` lá. Este pedido cria um caminho novo de entrada (Awave) e um de
saída (`/construir`); a tabela diz o que muda.

| Id | Dado | Titular | Onde fica | Base legal (proposta) | Retenção | Expurgo | Cuidado deste pedido |
|---|---|---|---|---|---|---|---|
| D5 (ampliado) | Dado pessoal incidental em `titulo`, `descricaoProblema` e `contexto` escritos pelo Awave (ex.: nome de cliente citado pelo dono) | terceiros citados | `demanda` | art. 7º, IX (legítimo interesse: demanda interna da empresa) e V quando for pedido de cliente | igual a D3: status final + 5 anos | anonimização futura (D3/D5 do 0001). **Atenção:** o texto do Awave não passa por `entrada_bruta`, então não tem o expurgo de 90 dias do D1; vai direto para o campo estruturado | IN-05 (sem `anexos`, sem `solicitanteNome` com nome), IN-06 (só vai ao provedor depois da confirmação, minimizado por C-23), IN-12 (nada no histórico) |
| D3 (Awave) | Nome do solicitante | — | `demanda.solicitante_nome` = "Awave" | não há dado pessoal: o valor do corpo é descartado | — | — | IN-05 |
| D8 (ampliado) | Quem confirmou a demanda do Awave | pessoa da empresa | `evento` (`demanda_confirmada`), exibido na T05 | art. 7º, VI e IX (prestação de contas da liberação ao modelo) | igual a D5 | junto com D5 | nome só pela junção com `user`, como hoje |
| D15 | Título minimizado devolvido ao Awave (vista de 6 chaves) | terceiros, se uma pessoa puser nome no título depois | Awave (Supabase, fora deste sistema) | a do D5; o Awave é sistema da própria empresa | a do Awave | fora do controle deste sistema; a vista leva só o título minimizado (M-1: e-mail, telefone, CPF, CNPJ trocados) | IN-08; ver Pendências (o M-1 usa o `solicitanteNome`, que é "Awave", então não troca nome de pessoa) |
| D16 | Pedido de Construção entregue ao `/construir` | terceiros, se algum escapar | `pedidos/<DEC>.json` no git da estruturaAutonoma | a do D5 | permanente no git | não há expurgo no git: por isso C-28 e a conferência do nome são refeitas na entrega (IN-10) | IN-10 |
| — | Prefixo do token, nome da integração, SHA-256 do pedido, hash do token | não é dado pessoal (identifica sistema e conteúdo já conferido) | `evento`, `token_servico` | não se aplica | permanente (eventos só de inclusão) | não se aplica | IN-12, IN-13 |
| D9 | Linha de log das rotas novas | não deve ter dado pessoal | saída do contêiner | — | rotação do Docker | não se aplica | IN-14 |

### 5. O que o plano (05) precisa conter

1. **Cada controle IN-01 a IN-18 como critério de aceite de uma tarefa**, com o teste citado no controle.
2. **Ordem:** IN-01, IN-02, IN-03 e IN-09 na fase de fundação, **antes** da primeira rota ou serviço que aceite ator de
   integração; o teste da lista exata de pares (IN-01 a) e o T13 com os dois tokens entram junto com a mudança da
   matriz. IN-06 entra na mesma tarefa da confirmação (IN-07), não depois.
3. **Risco `alto` no `tarefas.json`** para: ator, token e matriz (IN-01 a IN-03); criação e leitura pelo Awave (IN-05,
   IN-08, IN-09); confirmação e gatilhos (IN-06, IN-07); entrega e recebimento (IN-10 a IN-12); migration (IN-17).
4. **Inventário do IN-02** escrito no plano, por caminho e função, para a revisão de cada tarefa conferir item a item.
5. **Testes transversais obrigatórios:** matriz × todas as rotas × os dois tokens (IN-01); sentinelas ampliado (IN-12);
   404 idêntico (IN-08); concorrência do limite (CA-08.4) e da confirmação (IN-07).
6. **IN-15 e IN-16 em toda revisão de tarefa** (o `tech-lead` anexa o `git diff a9fd9b8 -- <lista>` e a contagem de
   asserções por arquivo), e de novo na 08.
7. **Na 08:** `/security-review` no PR com foco em matriz, vistas por tipo de ator, gatilhos e entrega;
   `pnpm audit --prod --audit-level high` sem alta nem crítica (em 11/11: 0 alta, 0 crítica, as 5 moderadas de antes);
   achado crítico ou alto volta ao engenheiro e passa por reteste deste agente.
8. **Fora do `/construir`** (Fabiano, depois do merge): emitir os tokens de produção pelo script, gravar cada um no seu
   lugar (IN-18) e rodar o teste ponta a ponta pela rede interna (V01/W16, V02/W17). Nenhum token de produção passa pelo
   chat, por arquivo do repositório ou por e-mail.

### 6. Respostas às pendências dirigidas à 04

- **03: prefixo do token no histórico ("Awave (prefixo …)", "/construir (prefixo …)") e C-30 / RNF-04.** De acordo,
  com as condições do IN-13.
  - C-30 protege dado de terceiro e texto livre em `antes`/`depois`. O prefixo não é dado pessoal nem texto livre: é
    identificador técnico de formato fixo (8 caracteres `[A-Za-z0-9_-]`), gravado na coluna `ator_token_prefixo` desde
    a 0.1.0 justamente para auditoria (C-09). Mostrar não grava nada novo.
  - RNF-04 proíbe o **token** em log, Sentry, evento, erro, resposta e documentação, e o prefixo na linha de log. O
    prefixo são 8 dos 43 caracteres aleatórios; sobram 35 (cerca de 210 bits), sem efeito prático na força do token.
    Ele já sai na saída do script e é o que se usa para revogar, e revogar exige shell no servidor: conhecer o prefixo
    não dá poder nenhum.
  - É uma mudança consciente: hoje `listarHistorico` esconde o prefixo do agente ("fica só na coluna para auditoria").
    Mostrar o da integração para pessoa com 2FA não afrouxa controle e ajuda Fabiano a saber qual token revogar.
    Estender ao agente não é preciso neste pedido.
  - Condições: só na leitura de pessoa; só da coluna, conferido pela regex; nunca token, hash nem `sha256`; nunca na
    linha de log (RNF-04 continua).
- **01 e 02: campos do schema comum que o contrato do Awave não usa.** Descartar no serviço, sem 400 (lista de
  permissão do IN-05), como a recomendação do arquiteto. Recusar com 400 contrariaria o CA-04.4 (chave desconhecida
  descartada) e não protege mais que o descarte.
- **02: `origem` nos itens de `GET /api/demandas` para agentes.** Aprovado: enumeração sem dado pessoal, e os agentes
  já leem a fila inteira (C-10). O filtro `origem` entra por Zod `enum` (C-17) e o `href` não reflete valor cru
  (IN-16).
- **02: `sha256` no `depois` de `pedido_entregue` e `pedido_recebido`.** Aprovado: hash de conteúdo já conferido sem
  dado pessoal, irreversível na prática, de formato fixo. Condição: é sempre o hash calculado pelo servidor, conferido
  pela regex antes de gravar (IN-12); o valor mandado pelo cliente só é comparado.
- **02: duplicata quando o 201 se perde depois do `COMMIT`.** Concordo com a análise: com 10 por hora (IN-09),
  rascunho, nenhum agente antes da confirmação (IN-06) e a pessoa vendo a fila, o risco residual é **baixo**. Não aceito
  risco residual sozinho: vai para `gestao-riscos` e Fabiano (Pendências).

## Decisões tomadas

- Nenhuma devolução: as lacunas viraram controles verificáveis que cabem no plano, sem refazer etapa anterior.
- IN-06 estende o "sem disparo" da criação a todo gatilho (ESP e RSK escritos à mão): é o que o D1 quer e o que a 03 promete na tela; sem isso, o texto de fora chega ao provedor pelo `risco` sem confirmação. Fica no ponto único (`dispararSeLigado`) e de novo no worker, porque um gatilho novo no futuro herda a regra.
- IN-09 obriga o ramo de integração em `limites.ts` a lançar quando não há limite definido: hoje o ramo desconhecido sai sem contar, e o erro de esquecer apareceria como ausência de limite, sem nenhum teste vermelho.
- IN-02 obriga `atorVisivel` e as vistas de ESP, RSK e DEC a terem caso próprio para integração: o padrão de hoje ("não é pessoa, então é agente" ou "senão, sistema") daria a vista de agente ao Awave e esconderia quem agiu.
- Campos fora do contrato do Awave descartados e não recusados (IN-05): o contrato não muda, o descarte tira o link de anexo (phishing no painel) e a urgência forjada, e é a mesma regra do `solicitanteNome`.
- 404 do Awave comparado byte a byte com o do inexistente (IN-08): é o teste que impede o oráculo de existência (BOLA) de voltar por uma mensagem diferente.
- Prefixo no histórico aprovado com condições (IN-13): não é segredo nem dado pessoal, já está gravado para auditoria, e ajuda na revogação.
- Sem limite de taxa novo nas três rotas do `/construir`: o RNF-03 do 01 decide assim; o abuso exige o token, que mora no host, e é contido por `lock_timeout`, entrega gravada uma vez por hash e revogação. Nível médio, sem controle novo.
- `pnpm audit --prod` em 11/11: 0 alta, 0 crítica, as mesmas 5 moderadas transitivas de ferramenta de build e teste registradas no 0015 (esbuild, `@vitest/mocker`, glob, minimatch); não bloqueiam pelo padrão técnico.

## Pendências

- Nenhuma bloqueia a etapa. Itens para a Parada 1 e para as etapas seguintes:
- `gestao-riscos` e Fabiano (aceite formal de risco residual, não bloqueia): (a) duplicata de demanda do Awave quando o 201 se perde (baixo); (b) token do Awave em claro na rede interna do Easypanel, decidido no DEC (médio: escopo mínimo, 10/h e revogação contêm o dano); (c) token do `/construir` legível pelo usuário `deploy`, que também roda os agentes do `/construir` com Bash (médio: só lê pedidos que eles já recebem e confirma recebimento; liga-se ao D-F3 ainda não executado); (d) o pedido passa a entrar na fila do `/construir` sem a cópia manual: o ponto humano é a geração por pessoa, com a revisão C-14 e a confirmação C-28 (o risco (b) do 0001, injeção que passe pela revisão humana chegando a agentes com Bash, perde uma barreira).
- `seguranca-informacao` (fora deste pedido, existente antes dele): pela rede interna do Easypanel, qualquer contêiner chega ao app sem o Traefik e pode mandar o próprio `x-real-ip`, o que contorna o limite de login por IP (C-06). O bloqueio por conta (5 falhas em 15 min) continua valendo. Avaliar rede própria do Easypanel para o Orquestrador e o Awave.
- `desenvolvimento-produto` / Fabiano (não bloqueia): o M-1 minimiza o título com o `solicitanteNome` da demanda, que no Awave é "Awave"; se uma pessoa puser nome de cliente no título de uma demanda do Awave, ele volta ao Awave na vista de 6 chaves. O Awave é da empresa, por isso o nível é baixo; registrar no manual que o título de demanda do Awave não deve levar nome de pessoa.
- `juridico-contratos` (Parada 1): confirmar que o texto do Awave (D5 ampliado) fica com retenção de status final + 5 anos, sem o expurgo de 90 dias do texto colado, porque não passa por `entrada_bruta`.
- `tech-lead` (05): inventário do IN-02 por caminho; decidir onde o worker relê a confirmação (IN-06) sem ler o esquema do pg-boss.
- As pendências do 0015 sobre `pnpm audit` sem `--prod` (imagem final com `devDependencies`) e as 5 moderadas continuam abertas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src/lib src/modules src/db scripts docs/manual-tecnico src/proxy.ts` — lista dos arquivos rastreados lidos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- docs/construcao/*/04-seguranca-aplicacao.md docs/operacao src/app/api src/db/schema` — entregas 04 anteriores, rotas e esquema
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas audit --prod` — 5 moderadas, 0 alta, 0 crítica (código de saída 1 pelas moderadas)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — base a9fd9b8 e as passagens 00 a 03

## Critério de pronto atendido

- [x] (04) cada componente de 02 tem as ameaças STRIDE avaliadas
- [x] (04) cada ameaça alta ou crítica tem controle, escrito como critério verificável
- [x] (04) cada dado pessoal tem base legal, retenção e expurgo
