---
pedido: DEC-DEM-20261022-0001-v1
etapa: 02-arquitetura
agente: arquiteto-solucoes
leu: [pedido.json, 01-analista-requisitos.md, padrao-tecnico.md, contrato-passagem.md, passagens.jsonl, 02-arquiteto-solucoes.md (volta 2), pedido.mjs, .gitignore]
status: pronto
proximo: seguranca-aplicacao
devolvido_para: null
---
## Entrega

Arquitetura do WS Orquestrador de Demandas, versão 0.1.0 (volta 3 da etapa 02). Base: requisitos de
`01-analista-requisitos.md` (RF-01 a RF-26, RNF-01 a RNF-18), `padrao-tecnico.md` e o pedido. O repositório hoje só
tem `.gitignore` e `docs/`, sem código anterior a respeitar. Esta volta mantém o desenho da volta 2 sem mudança; só
foram refeitas, sem nenhum comando git, as conferências do repositório e das portas (ver Comandos executados). A spec
original e os ajustes de 15/10 foram lidos na volta 0 e já estão refletidos nos requisitos da etapa 01.

Mudanças em relação à volta 0: uma fila só para os quatro agentes (a volta 0 tinha quatro filas com concorrência 1
cada, o que permitia quatro chamadas simultâneas e furava a tolerância do teto da RNF-07); varredura de execuções
órfãs; aprovação com papel próprio, separado do papel de quem registra; migrations ao subir só na homologação e saúde
que confere as migrations (padrão técnico, seção 9); enviador de e-mail sem chave que não envia.

### 1. Visão da solução

Um monólito modular em Next.js 16 com **dois processos da mesma imagem**: `app` (painel e API) e `worker` (jobs do
pg-boss: agentes de IA, aviso por e-mail, expurgo, batimento). Os dois usam o mesmo Postgres 16, que guarda também a
fila do pg-boss. Toda a regra de negócio fica em `src/modules/<domínio>`. Rota da API, Server Action do painel e job
do worker são adaptadores finos sobre as mesmas funções de módulo, com os mesmos schemas Zod e a mesma política de
acesso.

```mermaid
flowchart LR
  P[Pessoa com 2FA<br/>navegador] -->|sessão Better Auth| APP
  AE[Agente externo<br/>token de serviço] -->|Bearer| APP
  subgraph Imagem única ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas
    APP[app: next start<br/>painel + /api]
    WK[worker: pnpm worker<br/>pg-boss]
  end
  APP --> MOD[src/modules/*]
  WK --> MOD
  MOD --> DB[(Postgres 16<br/>dados + esquema pgboss)]
  APP -->|send na mesma transação| DB
  WK -->|fetch de jobs| DB
  WK -->|timeout 120 s| ANT[API Anthropic<br/>desligada na 0.1.0]
  WK -->|timeout 10 s| RES[Resend]
  APP -. erros sem dado pessoal .-> SEN[Sentry]
  WK -. erros sem dado pessoal .-> SEN
  APP -->|baixar JSON| PC[Pedido de Construção<br/>cópia manual para pedidos/]
```

Fluxo principal (todos os passos gravam evento no histórico):

1. Entrada: a pessoa cola o texto (RF-05) ou chama `POST /api/demandas`. Com o agente orquestrador desligado, a
   pessoa preenche os campos. Ligado, a mesma transação grava a entrada bruta, a execução pendente e o job.
2. Demanda criada → execução `insumo_tecnico` (se ligado) → ESP rascunho de agente. Desligado: a pessoa grava a ESP.
3. ESP sem dúvida → execução `risco` → RSK. ESP com dúvida → `aguardando_informacao`, sem execução.
4. RSK gravado com ESP existente → execução `consolidacao` → DEC `pendente` → demanda `pronta_para_decisao` → aviso
   por e-mail.
5. A pessoa decide no painel (`PATCH /api/pacotes-decisao/:decId/decisao`). DEC aprovado → a pessoa baixa o Pedido de
   Construção e o copia à mão para `pedidos/` da estruturaAutonoma.

### 2. Componentes e responsabilidades

| Componente | Caminho | Responsabilidade | Dono na construção | Como se observa | Plano de falha |
|---|---|---|---|---|---|
| Painel | `src/app/(painel)/` | Telas pt-BR: Server Components leem os módulos, Server Actions chamam os módulos | engenheiro-frontend | e2e + axe; log pino da ação | Erro de módulo vira mensagem pt-BR sem detalhe |
| API | `src/app/api/` | Route handlers: resolve o ator, valida com Zod, chama o módulo, mapeia erro para HTTP | engenheiro-backend | log pino por requisição (método, rota, status, ms, tipo de ator) | `ErroDominio` → 400/403/404/409/422; resto → 500 genérico + Sentry |
| Autenticação e acesso | `src/modules/acesso/` | Better Auth (senha + TOTP, papel `cto` ou `administradora`), tokens de serviço, `resolverAtor`, matriz de acesso | engenheiro-backend | login falho no log, sem senha; teste da matriz | Sem sessão nem token → 401; fora da matriz → 403 |
| Demandas | `src/modules/demandas/` | Criar, ler, filtrar, alterar; gerador de id; máquina de status; entrada bruta | engenheiro-backend | histórico | Sequência esgotada → erro claro (RNF-09) |
| Especificações | `src/modules/especificacoes/` | ESP versionada, regras de construção (RF-08), gatilho de dúvida (RF-15) | engenheiro-backend | histórico | Versão concorrente resolvida por trava (seção 4) |
| Pareceres de risco | `src/modules/pareceres-risco/` | RSK versionado | engenheiro-backend | histórico | idem |
| Pacotes de decisão | `src/modules/pacotes-decisao/` | DEC versionado, `desatualizado`, decisão, dupla aprovação | engenheiro-backend | histórico | Corrida aprovação × ESP nova resolvida pela mesma trava |
| Histórico | `src/modules/historico/` | Gravar e ler eventos, só inclusão | engenheiro-backend | — | Falha ao gravar evento desfaz a transação inteira |
| Agentes de IA | `src/modules/agentes/` e `src/agents/` | Interruptores, teto, preço por modelo, execução idempotente, minimização, provedor de IA, prompts | engenheiro-backend | tabelas `uso_ia` e `execucao_agente`; tela de configuração | Seção 5 e seção 8 |
| Pedido de Construção | `src/modules/pedido-construcao/` | Montar, serializar de forma determinística e validar com o `validarPedido` copiado | engenheiro-backend | evento de geração | Falha de validação → 422 com a lista |
| Avisos | `src/modules/avisos/` | E-mail de DEC pronto, uma vez por DEC | engenheiro-backend | tabela `aviso_email` | Seção 5 |
| Retenção | `src/modules/retencao/` | Expurgo do texto bruto | engenheiro-backend | evento de expurgo; `entrada_bruta.expurgada_em` | Job diário idempotente; falha repete no dia seguinte e vai ao Sentry |
| Worker | `src/worker/index.ts` e `src/jobs/` | Sobe o pg-boss sem criar esquema, registra filas e agendamentos, grava batimento, varre execuções órfãs | engenheiro-backend | `worker_batimento` exibido em `/configuracao` | Processo cai → Easypanel reinicia; a varredura retoma o que ficou no meio |
| Banco | `src/db/`, `drizzle/`, `scripts/migrate.ts` | Esquema Drizzle (inclui as tabelas do Better Auth geradas pelo CLI dele), cliente do papel da aplicação, migrations e privilégios pelo migrator | engenheiro-dados-bd | teste de guarda de privilégios (ADR-03) | Migration só pelo migrator (ADR-12) |
| Utilidades | `src/lib/` | `relogio` injetável, fuso America/Sao_Paulo, `log` (pino com redação), `erros`, adaptador HTTP | engenheiro-backend | — | — |
| Scripts | `scripts/` | `migrate.ts`, `criar-usuario.ts`, `criar-token-servico.ts`, `revogar-token-servico.ts`, `definir-preco-modelo.ts`, `seed-ficticio.ts` | engenheiro-backend | saída no terminal; o token aparece uma vez | `seed-ficticio.ts` só roda com `SEED_FICTICIO=1` e com o banco sem demanda |

### 3. Rastreabilidade RF → componente

| RF | Componente responsável | Peça principal |
|---|---|---|
| RF-01 | Autenticação e acesso | `acesso/auth.ts` (Better Auth + plugin `twoFactor`), `acesso/exigir-pessoa.ts`; páginas `/entrar` e `/configurar-2fa` |
| RF-02 | Autenticação e acesso | `acesso/tokens-servico.ts`, `acesso/matriz.ts` (tabela da seção 6) |
| RF-03 | Demandas + API + Painel | `demandas/schemas.ts` (`criarDemandaSchema`), `demandas/servico.ts` |
| RF-04 | Demandas | `demandas/gerar-id.ts` (sequência `demanda_seq`, relógio injetado); cálculo de versão comum em `src/modules/versoes.ts` |
| RF-05 | Demandas + Agentes + Painel | `demandas/entrada.ts`, tabela `entrada_bruta`, execução do agente orquestrador |
| RF-06 | Demandas + API | `demandas/consultas.ts` |
| RF-07 | Demandas | `demandas/transicoes.ts` (função pura com a tabela do RF-07) |
| RF-08 | Especificações | `especificacoes/schemas.ts`, `especificacoes/servico.ts` |
| RF-09 | Pareceres de risco | `pareceres-risco/schemas.ts`, `pareceres-risco/servico.ts` |
| RF-10 | Pacotes de decisão | `pacotes-decisao/criar.ts` |
| RF-11 | Banco + módulos de versão | privilégio só de `SELECT, INSERT` (ADR-03); rotas sem `PATCH`, `PUT` nem `DELETE` (o Next responde 405) |
| RF-12 | Pacotes de decisão | `pacotes-decisao/desatualizado.ts` (calculado na leitura e conferido sob trava na decisão) |
| RF-13 | Pacotes de decisão | `pacotes-decisao/decidir.ts`, tabelas `aprovacao` e `decisao` |
| RF-14 | Pacotes de decisão | `pacotes-decisao/decidir.ts` (regra de dupla aprovação, seção 4) |
| RF-15 | Especificações + Agentes + Demandas | gatilho em `especificacoes/servico.ts` e na execução do orquestrador; não existe canal de saída ao solicitante |
| RF-16 | Agentes de IA + Worker | `agentes/executar.ts`, `src/jobs/agente-executar.ts`, `src/agents/*.ts` |
| RF-17 | Agentes de IA | `agentes/uso.ts`, tabelas `uso_ia` e `preco_modelo` |
| RF-18 | Agentes de IA | `agentes/teto.ts` |
| RF-19 | Agentes de IA + Painel | `agentes/configuracao.ts`, tela `/configuracao` |
| RF-20 | Agentes de IA | `agentes/minimizar.ts` e um montador de entrada por agente, com lista de permissão de campos |
| RF-21 | Histórico | `historico/registrar.ts`, tabela `evento` |
| RF-22 | Pedido de Construção | `pedido-construcao/montar.ts`, `serializar.ts`, `src/vendor/construir/pedido.mjs` (ADR-05) |
| RF-23 | Pacotes de decisão + API | `pacotes-decisao/consultas.ts` |
| RF-24 | Retenção + Worker | `retencao/expurgar.ts`, agendamento `retencao.expurgo` |
| RF-25 | Avisos + Worker | `avisos/aviso-dec.ts`, fila `aviso.dec-pronto` |
| RF-26 | Painel | `src/app/(painel)/**` (rotas na seção 7) |

### 4. Modelo de dados preliminar

Convenções: nomes em `snake_case` no banco e `camelCase` no TypeScript (Drizzle `casing: 'snake_case'`); datas em
`timestamptz` (UTC), convertidas para America/Sao_Paulo só na borda; enumerações como `text` com `CHECK` gerado pelo
Drizzle, para evitar `ALTER TYPE` em migration futura; listas em `jsonb` validadas pelo mesmo schema Zod da API. O
modelo físico, os índices e as migrations ficam com `engenheiro-dados-bd`.

| Entidade (tabela) | Mutável? | Campos principais | Relações |
|---|---|---|---|
| Better Auth (`user`, `session`, `account`, `verification`, `two_factor`) | sim | esquema do Better Auth + `papel` (`cto` ou `administradora`) em `user` | — |
| `token_servico` | só `revogado_em` | `id`, `agente`, `hash` (SHA-256, único), `prefixo` (8 caracteres para identificar), `criado_em`, `revogado_em` | — |
| `demanda` | sim | campos da seção 3.1 da spec original + `status` (9 valores do RF-07), `autor_tipo`, `autor_id`, `rascunho_agente`, `atualizada_em` | 1:0..1 `entrada_bruta`; 1:N ESP, RSK, DEC, evento |
| `entrada_bruta` | só o expurgo | `demanda_id` (PK e FK), `texto` (nulo após expurgo), `origem` jsonb (canal, referência; nulo após expurgo), `recebida_em`, `expurgada_em` | N:1 demanda |
| `especificacao_tecnica` | **não** | `id` (`ESP-<dem>-vN`), `demanda_id`, `versao` (único com `demanda_id`), campos da seção 3.2 com `escopo_inclui`, `escopo_exclui` e `duvidas_em_aberto` em jsonb, `sistema_alvo`, `repositorio_destino`, `criterios_aceite_preliminares` jsonb, `definicao_de_pronto` jsonb, `autor_tipo`, `autor_id`, `rascunho_agente`, `execucao_agente_id`, `criada_em` | N:1 demanda |
| `parecer_risco` | **não** | `id` (`RSK-<dem>-vN`), `demanda_id`, `versao`, campos da seção 3.3 com `pre_condicoes` e `recomendacoes_mitigacao` em jsonb, `envolver_juridico_ou_administradora_quando`, autor, `rascunho_agente`, `criada_em` | N:1 demanda |
| `pacote_decisao` | **não** | `id` (`DEC-<dem>-vN`), `demanda_id`, `versao`, `especificacao_id` + `especificacao_versao`, `parecer_risco_id` + `parecer_risco_versao`, cópia de `demanda_tipo`, `demanda_titulo` e `demanda_descricao`, campos das opções A e B, `recomendacao_agente_consolidacao`, `nivel_aprovacao_requerido`, autor, `rascunho_agente`, `criada_em` | N:1 demanda, N:1 ESP, N:1 RSK |
| `aprovacao` | **não** | `id`, `pacote_decisao_id`, `papel_aprovacao` (`cto` ou `administradora`), `nome_aprovador` (cópia no momento), `registrada_por` (usuário da sessão), `opcao` (A ou B), `comentario`, `referencia_documento`, `data_documento`, `revisou_rascunhos`, `registrada_em`; único (`pacote_decisao_id`, `papel_aprovacao`) | N:1 DEC |
| `decisao` | **não** | `pacote_decisao_id` (único), `status_decisao` (`aprovada`, `devolvida` ou `arquivada`), `opcao_escolhida`, `comentarios`, `decidida_por`, `decidida_em` (= `dataAprovacao` quando aprovada) | 1:1 DEC |
| `evento` | **não** | `id` bigserial, `ocorrido_em`, `ator_tipo` (`pessoa`, `agente` ou `sistema`), `ator_id`, `demanda_id` (nulo em evento de configuração), `entidade`, `entidade_id`, `acao`, `antes` jsonb, `depois` jsonb | N:1 demanda (opcional) |
| `configuracao_agente` | sim | `agente` (PK; 4 linhas semeadas com `ligado = false`), `ligado`, `modelo`, `atualizado_em`, `atualizado_por` | — |
| `configuracao_ia` | sim (linha única) | `teto_mensal` numeric (inicial 0), `moeda`, `atualizado_em`, `atualizado_por` | — |
| `preco_modelo` | só inclusão de vigência nova | `modelo`, `preco_entrada_por_milhao`, `preco_saida_por_milhao`, `moeda`, `vigente_desde` | — |
| `execucao_agente` | sim (operacional) | `id`, `agente`, `chave_entrada` (único com `agente`), `demanda_id`, `status` (`pendente`, `em_andamento`, `concluida`, `falhou`, `ignorada`), `tentativas`, `proxima_tentativa_em`, `bloqueada_ate`, `artefato_id`, `atualizada_em` | N:1 demanda |
| `uso_ia` | **não** | `id`, `execucao_agente_id`, `agente`, `demanda_id`, `modelo`, `tokens_entrada`, `tokens_saida`, `custo` numeric(12,6), `resultado` (`sucesso`, `fora_do_schema` ou `erro`), `ocorrido_em`. Sem prompt nem resposta | N:1 execução |
| `aviso_email` | só o resultado | `pacote_decisao_id` (único), `status` (`pendente`, `enviado`, `falhou`, `sem_provedor`), `tentativas`, `id_provedor`, `enviado_em` | 1:1 DEC |
| `worker_batimento` | sim | `instancia` (PK, gerada no boot do worker), `visto_em` | — |

Decisões de modelo que sustentam os requisitos:

- **`statusDecisao` e `aprovadores` são derivados**, não colunas do DEC: `pendente` quando não há linha em `decisao`;
  `aprovadores` vem de `aprovacao`. Assim o DEC fica só de inclusão, e "decide uma vez só" (CA-11.3) é a restrição
  única de `decisao.pacote_decisao_id`.
- **`desatualizado`** = `especificacao_versao < max(versao da ESP)` ou `parecer_risco_versao < max(versao do RSK)` da
  demanda, por número de versão (RF-12), calculado na leitura com subconsulta indexada por (`demanda_id`, `versao`).
- **Texto bruto em tabela própria**: nenhuma consulta de demanda o traz por acidente, o expurgo só precisa de
  `UPDATE` em três colunas dessa tabela, e o serializador de log nunca o vê.
- **IDs (RF-04)**: `demanda_seq` com `MAXVALUE 9999 NO CYCLE`; o 10.000º `nextval` falha e vira o erro de domínio
  `capacidade_de_ids_esgotada` (HTTP 409, mensagem pt-BR). A data do id vem do relógio injetado, no fuso de São
  Paulo. Acima de 9.000, o painel mostra aviso (RNF-09). Aumentar a capacidade exige mudar o formato aqui e no
  `validarPedido` do /construir.
- **Versão N (RF-04, CA-04.3)**: criar ESP, RSK ou DEC faz `SELECT … FROM demanda WHERE id = $1 FOR UPDATE`, calcula
  `max(versao) + 1` e insere, tudo numa transação; a restrição única (`demanda_id`, `versao`) é a segunda barreira. A
  mesma trava da linha da demanda serializa "criar ESP ou RSK" contra "registrar decisão", o que fecha a corrida em que
  uma ESP nova chega no meio de uma aprovação.
- **Decisão (RF-13, RF-14)**, sempre sob a trava da demanda e com `desatualizado` recalculado:
  - `devolvida` ou `arquivada`: insere `decisao` direto (aprovação parcial anterior deixa de valer); a demanda vai a
    `em_analise` ou `encerrada` com ator `sistema`.
  - `aprovada` com nível `cto`: insere `aprovacao` (`papel_aprovacao = cto`) e `decisao` na mesma transação.
  - `aprovada` com nível `cto_e_administradora`: a primeira aprovação insere só `aprovacao` e o DEC continua
    `pendente`, com a aprovação parcial visível; a segunda, com a mesma opção, insere `aprovacao` e `decisao`; opção
    diferente → 409. A aprovação com `papel_aprovacao = administradora` exige `referencia_documento` e
    `data_documento` (400 sem eles).
  - `papel_aprovacao` é separado de `registrada_por` para atender às duas respostas possíveis da pendência de
    Fabiano (a administradora registra com conta própria, ou o CTO registra com a referência ao documento). A regra
    fica numa constante de `decidir.ts`, iniciada no modo mais restrito (só a própria administradora registra o
    papel `administradora`) até Fabiano decidir.
  - `revisouRascunhosDeAgente: true` é exigido quando a ESP, o RSK ou o DEC citados têm `rascunho_agente`.
  - A aprovação não muda o status da demanda: `aprovada` é manual nesta versão (item 7 da ESP).

### 5. Integrações externas

| Integração | Uso | Tempo limite | Comportamento de falha | Idempotência | Nos testes e no CI |
|---|---|---|---|---|---|
| API Anthropic (`@anthropic-ai/sdk` 0.131.0) | Os quatro agentes, só no worker | 120 s por chamada (`timeout` do SDK), `maxRetries: 0` no SDK, porque a nova tentativa é nossa (ADR-07) | Erro de rede, 429, 5xx, tempo esgotado ou saída fora do schema: grava `uso_ia` (com tokens quando houver), não grava artefato e agenda a próxima tentativa (30 s, depois 2 min). Esgotadas 3 tentativas: `execucao_agente.status = falhou`, evento `falha_agente` sem conteúdo, demanda fica para preenchimento manual. 401 ou 403 do provedor: falha imediata, sem nova tentativa, com evento e Sentry. A chamada acontece fora de qualquer transação do banco | `execucao_agente` única por (`agente`, `chave_entrada`) + reivindicação condicional (seção 8) | `ProvedorFalso` injetado; sem `ANTHROPIC_API_KEY` a fábrica nunca devolve o provedor real |
| Resend (6.30.0) | Aviso de DEC pronto | 10 s | 3 tentativas (1 min, 5 min); esgotou: `aviso_email.status = falhou`, evento e Sentry. A decisão não depende do e-mail: o DEC já aparece na fila do painel. Sem `RESEND_API_KEY`, a fábrica devolve um enviador que não envia, marca `sem_provedor` e avisa no log de boot | `aviso_email` única por DEC + cabeçalho `Idempotency-Key: dec-<DEC-id>` | `EnviadorFalso` em memória; na homologação, sem chave, nada é enviado |
| Sentry (`@sentry/node`) | Erros do app e do worker | padrão do SDK, envio assíncrono | Falha de envio é ignorada; nunca bloqueia requisição nem job | — | DSN ausente = desligado |
| Pedido de Construção → /construir | Saída manual (RF-22) | — | Não há chamada: a pessoa baixa e copia. O /construir valida de novo na entrada | Mesmo DEC = mesmo arquivo, byte a byte | Teste com o `validarPedido` copiado |

Interna, para registro: Postgres 16. No app, `statement_timeout` de 10 s no papel da aplicação e falha de conexão →
503 genérico; no worker, o pg-boss reconecta sozinho e o job volta à fila.

### 6. API e matriz de acesso

Prefixo `/api`, sem versão no caminho (sistema interno, um consumidor; versionar quando houver consumidor externo).
`P` = pessoa com sessão e 2FA; `P(cto)` = só papel `cto`; `A` = token de serviço de agente.

| Rota | Métodos | Quem | RF |
|---|---|---|---|
| `/api/saude` | GET | público | RNF-17 |
| `/api/auth/[...all]` | Better Auth | público (login) | RF-01 |
| `/api/demandas` | POST, GET | P, A | RF-03, RF-06 |
| `/api/demandas/entrada` | POST (texto bruto) | P | RF-05 |
| `/api/demandas/:id` | GET | P, A | RF-06 |
| `/api/demandas/:id` | PATCH (campos e status) | P | RF-06, RF-07 |
| `/api/demandas/:id/historico` | GET | P | RF-21 |
| `/api/demandas/:id/especificacoes` | POST, GET | P, A | RF-08 |
| `/api/especificacoes/:espId` | GET (outros métodos: 405) | P, A | RF-08, RF-11 |
| `/api/demandas/:id/pareceres-risco` | POST, GET | P, A | RF-09 |
| `/api/pareceres-risco/:rskId` | GET (outros: 405) | P, A | RF-09, RF-11 |
| `/api/demandas/:id/pacotes-decisao` | POST, GET | P, A | RF-10 |
| `/api/pacotes-decisao` | GET `?statusDecisao=` | P, A | RF-23 |
| `/api/pacotes-decisao/:decId` | GET (outros: 405) | P, A | RF-10, RF-12 |
| `/api/pacotes-decisao/:decId/decisao` | PATCH | P | RF-13, RF-14 |
| `/api/pacotes-decisao/:decId/pedido-construcao` | GET (JSON com `Content-Disposition: attachment; filename="<DEC-id>.json"`; grava evento de geração) | P | RF-22 |
| `/api/agentes` e `/api/agentes/:agente` | GET; PATCH (`ligado`, `modelo`) | P; P(cto) | RF-19 |
| `/api/configuracao/teto` | GET; PUT | P; P(cto) | RF-18 |

A matriz é **dado**, em `src/modules/acesso/matriz.ts`: a rota declara a ação (`registrar_decisao`,
`criar_especificacao`…) e `autorizar(ator, acao)` consulta a tabela. O teste de acesso negado percorre a tabela e
chama cada rota com o ator proibido (CA-02.1, CA-02.2, CA-07.4, CA-18.4); rota nova sem linha na matriz quebra o
teste. O worker usa a mesma `autorizar` com o ator do agente, então "agente nunca decide" vale também fora do HTTP.

Formato de erro: `{ "erro": "<código>", "mensagem": "<pt-BR>", "campos"?: [...], "faltando"?: [...] }`, sem pilha,
SQL nem nome de tabela. Rotas com cookie que mudam estado conferem o cabeçalho `Origin` contra `BETTER_AUTH_URL`
(proteção de CSRF; as Server Actions já têm a conferência do próprio Next; detalhe com `seguranca-aplicacao`).

### 7. Painel (rotas do App Router)

`/entrar`, `/configurar-2fa`, `/demandas` (fila com filtros), `/demandas/nova` (entrada colando o texto),
`/demandas/[id]` (detalhe, texto bruto ou "expurgado em <data>", dúvidas, versões, histórico, status manual),
`/demandas/[id]/especificacoes/nova`, `/demandas/[id]/pareceres-risco/nova`, `/demandas/[id]/pacotes-decisao/nova`,
`/pacotes-decisao/[decId]` (decisão, baixar e copiar o pedido), `/configuracao` (agentes, teto, gasto do mês,
batimento do worker). O desenho de cada tela é da etapa 03 (`ux-ui-design`).

### 8. Worker, filas e agendamentos

| Fila (pg-boss) | Disparo | Opções | Handler |
|---|---|---|---|
| `agente.executar` | execução pendente criada (entrada por texto, demanda criada, ESP sem dúvida, RSK com ESP), na mesma transação do artefato (ADR-06) | payload `{ execucaoId }`; `singletonKey = <agente>:<chave_entrada>:t<n>`; `retryLimit: 0`; `expireInSeconds: 180`; `localConcurrency: 1` | `src/jobs/agente-executar.ts` |
| `aviso.dec-pronto` | DEC criado | `singletonKey = <decId>`, `retryLimit: 2` | `src/jobs/aviso-dec-pronto.ts` |
| `retencao.expurgo` | `schedule` diário às 03:00, fuso America/Sao_Paulo | — | `src/jobs/expurgo-texto-bruto.ts` |
| `worker.batimento` | `schedule` a cada minuto | — | grava `worker_batimento` e varre execuções órfãs |

Uma fila só para os quatro agentes, com concorrência 1 e uma réplica de worker: há no máximo uma chamada ao provedor
por vez, o que cumpre a tolerância da RNF-07 (o teto é ultrapassado em no máximo uma chamada) sem trava extra. Com
200 demandas por mês (RNF-05), cerca de 800 chamadas no mês, a fila não acumula.

Execução de agente (`agentes/executar.ts`), em ordem:

1. Reivindica a execução: `UPDATE execucao_agente SET status = 'em_andamento', bloqueada_ate = agora + 150 s,
   tentativas = tentativas + 1 WHERE id = $1 AND (status = 'pendente' OR (status = 'em_andamento' AND bloqueada_ate <
   agora)) RETURNING *`. Nada voltou: outra execução já cuidou dela → termina sem chamar o provedor (CA-16.4).
2. Agente desligado, ou sem modelo com preço vigente → `ignorada`, evento, sem chamada (CA-19.4).
3. Gasto do mês (soma de `uso_ia.custo` no mês civil de São Paulo, pelo relógio injetado) ≥ teto → `ignorada`, evento
   `suspensao_por_teto`, sem chamada (CA-18.1, CA-18.3).
4. Monta a entrada pela lista de permissão de campos do agente e passa o texto por `minimizar` (RF-20).
5. Chama o provedor (120 s), fora de transação. Grava `uso_ia` em transação própria, haja o que houver depois
   (CA-17.2).
6. `JSON.parse` + `safeParse` com o schema da rota correspondente. Válido: numa transação, cria o artefato pelo mesmo
   serviço da API com ator `{ tipo: 'agente', agente }`, marca `concluida` com `artefato_id`, grava os eventos e cria a
   próxima execução com seu job. Inválido: volta a `pendente` com `proxima_tentativa_em` (30 s na 2ª, 2 min na 3ª) e
   novo job com `startAfter` igual; na 3ª falha, `falhou` + evento sem conteúdo (CA-16.3).

Varredura (no `worker.batimento`, a cada minuto): reenfileira execução `pendente` com `proxima_tentativa_em` vencida
há mais de 1 minuto e execução `em_andamento` com `bloqueada_ate` vencida (worker que caiu no meio da chamada). A
reivindicação do passo 1 torna o reenfileiramento repetido inofensivo. Batimento: cada worker grava a sua `instancia`;
`/configuracao` mostra alerta quando o último batimento tem mais de 5 minutos e quando duas instâncias bateram nos
últimos 2 minutos (réplica a mais quebra a tolerância do teto).

### 9. Configuração e ambiente

- **Porta de desenvolvimento: 3101.** O `ss -ltn` desta volta (25/10/2026) mostrou em escuta 22, 53, 80, 443, 2377,
  3000, 7946, 24282 a 24285 e 65529; a 3101 estava livre (também na volta 0, em 22/10). `dev` = `next dev -p 3101`;
  `start` usa `PORT` (padrão 3101).
- Banco de desenvolvimento: `docker-compose.dev.yml` com `postgres:16-alpine` publicado em `127.0.0.1:5434` (livre no
  mesmo `ss -ltn`; fora da 5432 padrão, para não colidir com o banco de desenvolvimento de outro projeto rodando ao
  mesmo tempo). Testes: Testcontainers, porta aleatória.
- Homologação (padrão técnico, seção 9): `docker-compose.hml.yml` com `db` (imagem oficial do Postgres 16,
  `POSTGRES_USER`, `POSTGRES_DB`, healthcheck `pg_isready -h 127.0.0.1`), `app` e `worker`, só com valores fictícios
  escritos no arquivo; um SQL de inicialização no repositório (`scripts/hml/criar-papeis.sql`, senha fictícia) cria o
  papel `orquestrador_app`. O app sobe por `pnpm start:hml` (migrations com o migrator fictício, seed fictício na
  primeira subida, depois `next start`) e só ele é publicado em `127.0.0.1:${HML_PORTA}`. `playwright.config.ts` usa
  `BASE_URL` quando existe e, nesse caso, não sobe `webServer`.
- Variáveis (só nomes; ficam em `.env.example` e em `docs/operacao/deploy.md`): `DATABASE_URL`,
  `DATABASE_URL_MIGRATOR`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ANTHROPIC_API_KEY` (ausente na 0.1.0),
  `RESEND_API_KEY`, `EMAIL_REMETENTE`, `EMAIL_AVISO_DECISAO`, `SENTRY_DSN`, `RETENCAO_TEXTO_BRUTO_DIAS` (padrão 90,
  entre 1 e 3650), `LOG_LEVEL`, `PORT`, `SEED_FICTICIO` (só na homologação).
- Easypanel (ação de Fabiano, fora do /construir): serviços `app` (`pnpm start`), `worker` (`pnpm worker`) e `db`
  (Postgres 16), mesma imagem nos dois primeiros, uma réplica cada. Na produção, migration por `pnpm db:migrate` com o
  papel migrator, como passo separado antes de subir a versão (ADR-12).

### 10. ADRs

#### ADR-01. Monólito modular com dois processos da mesma imagem

- Contexto: API, painel, quatro agentes, aviso e expurgo; 200 demandas por mês; padrão técnico com Next + worker
  pg-boss.
- Opções: (a) Next com API e painel + worker pg-boss, mesma imagem; (b) API separada do painel; (c) serviço por agente.
- Decisão: (a). É o padrão técnico e o caso do NutriDebby.
- Consequência: um build, um deploy, dois serviços no Easypanel. Custo: o worker carrega o código do app inteiro
  (imagem maior que o necessário para ele) e um bug em módulo comum afeta os dois processos. (b) e (c) foram
  descartadas por multiplicar deploy, contrato HTTP interno e observabilidade sem ganho no volume previsto.

#### ADR-02. Worker chama os módulos direto, não a própria API

- Contexto: pendência da etapa 01. Na spec original, os agentes "chamam a mesma API que humanos usam".
- Opções: (a) o worker faz HTTP para o app com token de serviço; (b) o worker chama as funções de `src/modules` com o
  ator do agente e passa pela mesma `autorizar`.
- Decisão: (b). Mesmo schema Zod, mesmo serviço, mesma matriz de acesso, numa transação só com a marcação da execução
  e a próxima execução.
- Consequência: sem token de agente guardado no worker, sem depender de o app estar no ar e sem dupla escrita
  (artefato gravado e execução não marcada). Custo: a regra "agente recebe 403" é provada na rota pelo teste da matriz
  e, no worker, pelo teste de `autorizar`; a garantia não vem do HTTP. O token de serviço continua existindo para
  agente **externo** (por exemplo, uma sessão do Claude Code) que use a API (RF-02).

#### ADR-03. Imutabilidade garantida por privilégio no banco, com tabelas só de inclusão

- Contexto: RF-11 e RF-21 pedem que o banco recuse alteração feita com o papel da aplicação; sistema de um cliente
  só, sem RLS por `tenant_id` (padrão técnico, seção 5).
- Opções: (a) gatilho que bloqueia `UPDATE` e `DELETE`; (b) `GRANT` só de `SELECT, INSERT` ao papel da aplicação nas
  tabelas imutáveis, com a decisão fora do DEC (tabelas `aprovacao` e `decisao`); (c) só regra na aplicação.
- Decisão: (b). Migration custom `privilegios_app` (criada por `drizzle-kit generate --custom`) com `REVOKE ALL` e
  `GRANT` explícito por tabela para o papel `orquestrador_app`; `UPDATE` só nas colunas `texto`, `origem` e
  `expurgada_em` de `entrada_bruta` e nas tabelas mutáveis do modelo; `SELECT` em `drizzle.__drizzle_migrations` para
  a saúde (ADR-12). Um teste de guarda, no molde do `rls-guard.ts` do NutriDebby, lê
  `information_schema.table_privileges` e quebra se uma tabela imutável ganhar `UPDATE` ou `DELETE` ou se uma tabela
  nova ficar sem linha na lista de privilégios.
- Consequência: a recusa vem do Postgres, sem código de gatilho a manter; o DEC não precisa de coluna mutável. Custo:
  toda tabela nova pede uma linha de `GRANT` numa migration custom, e o papel `orquestrador_app` precisa existir em
  cada ambiente (passo do `deploy.md`, do SQL da homologação e do ajudante do Testcontainers). (a) foi descartada por
  esconder a regra em PL/pgSQL; (c) não atende CA-11.2 nem CA-21.2.

#### ADR-04. Esquema do pg-boss criado pelo migrator

- Contexto: o pg-boss cria o próprio esquema ao iniciar, e o papel da aplicação não tem DDL (padrão técnico, seção 5).
- Opções: (a) dar DDL ao papel da aplicação no esquema `pgboss`; (b) `scripts/migrate.ts` instala ou atualiza o
  esquema do pg-boss com o migrator, e app e worker iniciam o pg-boss com a criação de esquema desligada.
- Decisão: (b). O `tech-lead` confere na 12.34.0 a opção que desliga a migração no `start` (`migrate: false`); se ela
  não existir, o `migrate.ts` aplica o SQL de construção que o próprio pg-boss expõe.
- Consequência: nenhum DDL fora do migrator. Custo: atualizar o pg-boss exige rodar `pnpm db:migrate`; esquecer faz o
  worker falhar no boot com erro de versão de esquema (visível e reversível).

#### ADR-05. `validarPedido` copiado sem alteração para o repositório

- Contexto: pendência da etapa 01. O pedido gerado precisa passar nas mesmas regras de
  `ferramentas/construir/lib/pedido.mjs` da estruturaAutonoma, sem acoplar os repositórios.
- Opções: (a) reescrever as regras em TypeScript com os mesmos casos; (b) copiar o `pedido.mjs` sem mudança para
  `src/vendor/construir/pedido.mjs`, com `pedido.d.mts` de tipos e `src/vendor/construir/ORIGEM.md` (caminho, commit e
  SHA-256 da origem); (c) importar da estruturaAutonoma em tempo de execução.
- Decisão: (b). O gerador chama o `validarPedido` copiado antes de responder; falhou, 422 com `erros`. Um teste confere
  que o SHA-256 do arquivo copiado é o registrado no `ORIGEM.md` (pega edição local por engano).
- Consequência: é literalmente a mesma regra, inclusive a lista de donos de repositório e o `ensaio`, que o gerador
  nunca preenche. Custo: a cópia pode envelhecer quando o /construir mudar; o risco é contido porque o /construir
  valida de novo na entrada (o pedido errado é recusado lá, não construído). Atualizar a cópia = substituir o arquivo e
  o `ORIGEM.md`. (a) duplica a regra à mão; (c) acopla o deploy ao servidor da estruturaAutonoma.

#### ADR-06. Enfileirar job na mesma transação que grava o artefato

- Contexto: "sem execução duplicada" e "nada se perde" entre gravar a ESP e disparar o agente de risco.
- Opções: (a) `send` do pg-boss depois do commit; (b) `send` dentro da transação, pelo executor de banco que o
  pg-boss aceita na opção `db`; (c) só a tabela `execucao_agente`, varrida pelo worker.
- Decisão: (b), com a `execucao_agente` (pendente) inserida na mesma transação, e a varredura de (c) como rede de
  segurança (seção 8).
- Consequência: artefato, execução e job nascem juntos ou não nascem, e a latência é a do pg-boss, não a do intervalo
  da varredura. Custo: adaptador fino entre a transação do Drizzle (node-postgres) e o executor do pg-boss, coberto
  por teste de integração. (a) perde o job se o processo cair entre os dois passos; (c) sozinha atrasa cada passo em
  até um minuto.

#### ADR-07. Nova tentativa controlada pela aplicação, não pelo pg-boss

- Contexto: a RNF-06 fixa tentativas e esperas e exige teste com relógio injetado; a espera nativa do pg-boss tem
  variação.
- Opções: (a) `retryLimit` e `retryBackoff` do pg-boss; (b) `retryLimit: 0` e reagendamento explícito com
  `startAfter` calculado pela função pura `esperaAntesDaTentativa(n)`.
- Decisão: (b) na fila de agentes; (a) no aviso por e-mail, onde a espera exata não importa.
- Consequência: número de tentativas e esperas testáveis sem relógio real, com o contador em
  `execucao_agente.tentativas`. Custo: o reagendamento leva `singletonKey` com o número da tentativa, para o pg-boss
  não descartá-lo como duplicado; a garantia de execução única continua sendo a reivindicação do passo 1 da seção 8.

#### ADR-08. Provedor de IA e e-mail atrás de interface injetável

- Contexto: nenhuma chamada real na construção nem no CI (RNF-14); agentes desligados até a chave no CNPJ (CA-E-03).
- Decisão: `ProvedorIA` (`gerar({ modelo, sistema, conteudo, maxTokens, sinal })` → `{ texto, modelo, tokensEntrada,
  tokensSaida }`) com `ProvedorAnthropic` e `ProvedorFalso`; `EnviadorEmail` com `EnviadorResend`, `EnviadorFalso` e
  `EnviadorSemProvedor`. A fábrica só devolve a implementação real com a chave definida; os testes injetam o falso. A
  saída é pedida em JSON e sempre validada por Zod, nunca confiada.
- Consequência: trocar de provedor no futuro é uma implementação nova da interface. Custo: o `ProvedorAnthropic` não é
  exercido na construção; o primeiro uso real acontece quando Fabiano ligar um agente em produção, depois de definir
  chave, modelo, preço e teto.

#### ADR-09. Schema do agente derivado do schema da rota

- Contexto: "mesmo schema Zod da API" (ESP, item 4) e RF-20 (o nome do solicitante não vem da IA).
- Decisão: insumo técnico, risco e consolidação usam exatamente `criarEspecificacaoSchema`, `criarParecerRiscoSchema`
  e `criarPacoteDecisaoSchema`. O orquestrador usa `criarDemandaSchema.omit({ solicitanteNome, solicitantePapel,
  anexos }).extend({ flags })`; os campos omitidos vêm do que a pessoa informou na entrada.
- Consequência: mudar o schema da rota muda o contrato do agente no mesmo commit. Custo: o prompt em `src/agents/`
  precisa acompanhar o schema; um teste confere que o exemplo de saída de cada prompt passa no schema.

#### ADR-10. Acréscimos ao layout do padrão técnico

- Contexto: a seção 2 do padrão não lista `src/agents/` nem `src/vendor/`.
- Decisão: `src/agents/<agente>.ts` (prompts como constantes TypeScript, exigidos pela ESP; `.ts` em vez de `.md` para
  não depender de leitura de arquivo no contêiner) e `src/vendor/construir/` (ADR-05), fora do ESLint.
- Consequência: desvio só de pastas; stack, versões, comandos e entrega seguem o padrão sem mudança.

#### ADR-11. Rede, limite de login e sessão

- Contexto: RNF-12 (10 tentativas de login por minuto por IP, sessão de 8 h) com o app atrás do proxy do Easypanel.
- Decisão: limite do próprio Better Auth em memória (uma réplica de app), com o IP lido de `X-Forwarded-For`
  configurado no Better Auth; `session.expiresIn` de 8 h sem renovação deslizante; 2FA obrigatório conferido em
  `exigirPessoa` (conta sem TOTP ativo → 403 na API e redirecionamento para `/configurar-2fa`).
- Consequência: simples e suficiente para uma réplica. Custo: o contador zera a cada reinício e não serve para mais de
  uma réplica; se o app escalar, o limite passa para armazenamento no banco.

#### ADR-12. Migrations ao subir só na homologação; na produção, passo separado

- Contexto: o padrão técnico (seção 9) pede que, no `docker-compose.hml.yml`, o app aplique as migrations ao subir e
  responda `GET /api/saude` com 200 só com banco conectado e migrations aplicadas; a seção 5 diz que migration roda
  sempre com o migrator, e migration em produção nunca roda dentro do /construir.
- Opções: (a) o app sempre migra no boot, em todo ambiente; (b) `pnpm start:hml` migra e semeia antes do
  `next start`, e o `pnpm start` da produção só sobe o app, com a migration como passo separado.
- Decisão: (b). A saúde faz `SELECT 1` e confere que a última migration do journal empacotado na imagem está em
  `drizzle.__drizzle_migrations`, com tempo limite de 150 ms.
- Consequência: na produção, o app não recebe a URL do migrator, e a ordem backup → migrate → deploy (CA-P7-06) fica
  explícita no `deploy.md`. Custo: a homologação não exercita o passo separado da produção; esquecer o migrate na
  produção deixa a saúde em 503, o que é visível e não corrompe dado. (a) daria credencial de DDL ao processo que
  atende requisições.

### 11. Observabilidade e dados sensíveis

- pino com `redact` de `req.headers.authorization`, `req.headers.cookie`, `*.senha`, `*.token`, `*.texto`,
  `*.origem`, `*.solicitanteNome`, `*.conteudo`; corpo de requisição e resposta de IA **nunca** passam ao logger. Log
  por requisição: método, rota (o padrão, sem id nem query), status, duração, tipo de ator.
- Sentry com `sendDefaultPii: false` e `beforeSend` que remove `request.data`, cookies e cabeçalhos.
- Teste da RNF-10 com valores-sentinela fictícios, capturando a saída do pino num fluxo completo.
- `/api/saude` (ADR-12): 200 `{ "status": "ok" }` ou 503 `{ "status": "indisponivel" }`, sem versão nem configuração.
- Batimento e varredura do worker visíveis em `/configuracao` (seção 8).

## Decisões tomadas

- Monólito modular com app e worker da mesma imagem: é o padrão técnico e o menor custo de operação (ADR-01).
- Worker chama os módulos direto: transação única e mesma política de acesso, sem token no worker (ADR-02).
- Imutabilidade por `GRANT` e decisão em tabelas próprias: a recusa vem do banco e o DEC não tem coluna mutável (ADR-03).
- Esquema do pg-boss pelo migrator: o papel da aplicação continua sem DDL (ADR-04).
- `validarPedido` copiado sem mudança: mesma regra, sem acoplar repositórios, com segunda validação no /construir (ADR-05).
- Job enfileirado na mesma transação do artefato, com varredura de órfãos: nada se perde nem duplica (ADR-06).
- Nova tentativa dos agentes calculada pela aplicação: esperas determinísticas e testáveis (ADR-07).
- Provedor de IA e e-mail por interface injetável: zero chamada real na construção e na homologação (ADR-08).
- Schema do agente derivado do schema da rota: um contrato só (ADR-09).
- Prompts em `.ts` e cópia do validador em `src/vendor/`: únicos desvios de layout, sem desvio de stack (ADR-10).
- Limite de login em memória e sessão fixa de 8 h: suficiente para uma réplica (ADR-11).
- Migrations ao subir só na homologação: a produção não dá credencial de DDL ao app (ADR-12).
- Uma fila só para os quatro agentes, com concorrência 1: é o que de fato limita a uma chamada por vez e cumpre a RNF-07.
- `papel_aprovacao` separado de `registrada_por`: atende às duas respostas possíveis de Fabiano sem mudar o modelo.
- Ligar agente exige modelo com preço cadastrado: sem preço não há como calcular custo nem respeitar o teto.
- Prazo de retenção por variável de ambiente (padrão 90): mudá-lo passa por Fabiano no Easypanel, não por um clique no painel.
- Preço por modelo só por script: ninguém altera custo pelo painel sem rastro.
- API sem versão no caminho: sistema interno com um consumidor; versionar só quando houver consumidor externo.
- Porta 3101 e banco de desenvolvimento em 127.0.0.1:5434: livres no `ss -ltn` desta volta.

## Pendências

- Nenhuma bloqueia a etapa. Itens para a Parada 1 (Fabiano) ou para as etapas seguintes:
- Fabiano / demanda à parte (antes da 06): a lista Pode do arquiteto cita `git status`, `git log` e `git diff`, mas o
  Bash começa na estruturaAutonoma e a forma `git -C <repo>` é recusada pelo conferir. Nesta volta nenhum comando git
  foi rodado; o estado do repositório foi conferido com `ls`.
- `analista-requisitos` / Parada 1: a RNF-06 cita três esperas (30 s, 2 min, 10 min) para três tentativas, que só têm
  duas esperas. Adotei 30 s e 2 min; se a intenção era 3 **novas** tentativas (4 no total), basta acrescentar 10 min à
  função `esperaAntesDaTentativa`, sem mudar a arquitetura.
- `tech-lead` (05): confirmar no pg-boss 12.34.0 a opção que desliga a criação de esquema no `start` (ADR-04), a
  passagem do executor de transação na opção `db` do `send` (ADR-06) e a política de fila compatível com o
  `singletonKey` por tentativa (ADR-07).
- `seguranca-aplicacao` (04): validar a matriz de acesso (seção 6), a proteção de CSRF por `Origin`, a lista de
  `redact` do pino, a minimização (RF-20) e a pendência da etapa 01 sobre dado pessoal em ESP e RSK copiados para o
  pedido.
- `engenheiro-dados-bd` (06): modelo físico, índices (`demanda(status, criada_em)`, `demanda(tipo)`,
  (`demanda_id`, `versao`) nas três tabelas de versão, `uso_ia(ocorrido_em)`, `execucao_agente(status,
  proxima_tentativa_em)`) e a migration `privilegios_app` com o papel `orquestrador_app`.
- `devops-sre` (09): `deploy.md` com os três serviços, a criação dos papéis `orquestrador_app` e migrator no Postgres
  do Easypanel, a ordem backup → migrate → deploy (ADR-12, CA-P7-06), o aviso de uma réplica de worker e o rollback
  (imagem anterior do GHCR; migration sempre aditiva na 0.1.x).
- Fabiano (Parada 1): quem registra a aprovação da administradora (pendência da etapa 01). O modelo aceita os dois
  jeitos; o código nasce no mais restrito (só a própria administradora) até a resposta.
- `controladoria-orcamento` / `finops`: o custo recorrente da 0.1.0 é o Postgres e dois contêineres na VPS atual; a
  IA começa em zero (teto inicial 0) e o Resend cabe no plano já usado. Reavaliar quando os agentes forem ligados.

## Comandos executados

- `ss -ltn` — em escuta 22, 53, 80, 443, 2377, 3000, 7946, 24282 a 24285 e 65529; 3101 e 5434 livres; 3000 ocupada pelo Easypanel
- `ls -la /home/deploy/servidor/projetos/ws-orquestrador-demandas` — repositório só com `.git`, `.gitignore` e `docs/`, sem código
- `ls -la /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261022-0001-v1` — pasta do pedido com `pedido.json`, `01`, `02` (volta 2), `03` e `passagens.jsonl`

## Critério de pronto atendido

- [x] cada RF de 01 tem um componente responsável
- [x] a stack é a do padrão técnico, ou o desvio tem ADR
- [x] cada integração externa tem comportamento de falha e tempo limite
- [x] a porta de desenvolvimento é diferente de 3000 e estava livre em `ss -ltn`
- [x] o texto não tem segredo nem valor de `.env`
