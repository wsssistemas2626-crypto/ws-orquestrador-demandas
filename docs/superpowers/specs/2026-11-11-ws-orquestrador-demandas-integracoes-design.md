# ws-orquestrador-demandas — spec consolidada da 0.3.0: atores de integração `awave` e `construir`

Pedido `DEC-DEM-20261111-0016-v1` (DEM-20261111-0016, `melhoria`, risco **médio**), consolidado em 11/11/2026 a
partir das entregas da pasta `docs/construcao/DEC-DEM-20261111-0016-v1/`: `01-analista-requisitos.md`,
`02-arquiteto-solucoes.md`, `03-ux-ui-design.md` e `04-seguranca-aplicacao.md`, e do `pedido.json`. Esta spec resume
e amarra as quatro; o detalhe (critérios Dado/Quando/Então, wireframes, STRIDE por componente) fica nelas. Cada bloco
cita a origem entre parênteses: (01, RF-03), (02, ADR-20), (03, 5.4), (04, IN-05). Onde duas entregas divergem, a
seção 7.3 diz o que vale ou quem decide.

## 1. Objetivo

Dar a duas integrações internas da empresa um acesso **próprio e mínimo** à API do Orquestrador, sem usar o token de
um agente de IA, que abriria a fila inteira e as misturaria ao interruptor, ao teto e ao uso de IA (pedido.json,
demanda).

- **Parte 1, `awave`**: o Awave abre demanda pela API quando o dono aprova em `/aprovacoes` do Awave, e lê só as
  demandas que ele mesmo criou. O lado do Awave já está pronto (`awave-agents`, commit 0ab8ced) e define o contrato
  (01, seção 4).
- **Parte 2, `construir` (CA-F-01)**: o `/construir` busca sozinho o Pedido de Construção que uma pessoa gerou no
  painel, sem cópia manual. O lado do `/construir` já está pronto e desligado (`buscar-pedidos.mjs`, commit dfedf16)
  (01, seção 4).
- **Opção aprovada no DEC** (Fabiano, como CTO, 11/11/2026): opção A. Tipo de ator novo `integracao` (`awave` e
  `construir`), fora dos agentes de IA; demanda do Awave sem disparo automático do insumo técnico (D1); limite de 10
  demandas por hora para o Awave (D2); CA-F-01 no mesmo pedido; o Awave chama pelo endereço interno
  `http://orquestrador_app` (pedido.json, decisão).
- **O que não muda**: nenhum controle existente é afrouxado (C-09, C-10, C-11, C-15, C-17, C-28, C-30, C-34, C-36,
  A-02, axe); os dois contratos já usados do lado de lá não mudam (pedido.json, risco; 01, RNF-08 e RNF-09).
- **Base e versão**: `main` com a 0.2.0 (a9fd9b8), depois do merge do 0015; sai como 0.3.0 (pedido.json; 01, seção 0).
  Migration só aditiva. Deploy e tokens de produção são ações de Fabiano depois do merge.

**Definição de pronto** (pedido.json): `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes; `pnpm test:e2e` verde três
vezes seguidas; migration aditiva com ensaio de rollback aprovado; manual técnico e `docs/operacao` atualizados
(emissão, troca e revogação dos tokens `awave` e `construir`); CHANGELOG e `package.json` na 0.3.0.

## 2. Requisitos e critérios de aceite

16 requisitos funcionais e 10 não funcionais, com os critérios Dado/Quando/Então em `01-analista-requisitos.md`,
seções 2 e 3. Os ids RF-NN, RNF-NN e CA-NN.n são **deste pedido**; requisito do sistema é citado pelo capítulo do
manual (ex.: "cap. 05, RF-22") (01, seção 0).

### 2.1 Requisitos funcionais

| RF | Resumo | Critérios |
|---|---|---|
| RF-01 | Ator novo `integracao` (`awave`, `construir`), só por `Authorization: Bearer`, com o mesmo formato, geração e hash dos tokens de agente. Revogado, inexistente ou fora do formato: 401 com a mensagem de hoje. Cookie + Bearer continua 400. Integração não está em `AGENTES` | CA-01.1 a CA-01.5 |
| RF-02 | Os scripts de hoje emitem e revogam o token de integração (`--integracao awave\|construir`, exclusivo com `--agente`, `strictObject`). Token aparece uma vez na saída padrão e nunca em log, evento ou erro. Troca = emitir o novo e revogar o antigo pelo prefixo | CA-02.1 a CA-02.6 |
| RF-03 | Matriz com lista fechada por integração: `awave` só `criar_demanda` e `ler_demanda`; `construir` só `listar_pedidos_pendentes`, `entregar_pedido` e `confirmar_recebimento_pedido`. Ação sem lista nega toda integração. Teste transversal e T13 cobrem as integrações | CA-03.1 a CA-03.6 |
| RF-04 | `POST /api/demandas` pelo Awave grava autoria `awave`, `rascunhoAgente = true`, `solicitanteNome = "Awave"` seja qual for o corpo, `status = 'nova'` e o evento `demanda_criada` com ator e prefixo, sem texto livre. 201 com a vista do Awave e `id` `DEM-AAAAMMDD-NNNN`; erros `{ erro, mensagem }`; nunca 3xx | CA-04.1 a CA-04.7 |
| RF-05 | Demanda do Awave nunca cria execução de agente nem job, com o `insumo_tecnico` ligado ou não (D1). Pessoa e agente `orquestrador` disparam como hoje | CA-05.1, CA-05.2 |
| RF-06 | Pessoa com sessão e 2FA, de qualquer papel, confirma a demanda do Awave no detalhe. Só origem Awave, não confirmada, fora de status final (senão 409). Grava `demanda_confirmada` e, na mesma transação, chama o disparo do `insumo_tecnico`. Idempotente. Não muda autoria, rascunho nem status: "confirmada" vem do evento | CA-06.1 a CA-06.7 |
| RF-07 | `GET /api/demandas/:id` pelo Awave só da demanda que ele criou; outra responde 404 igual ao de inexistente. Vista de exatamente seis chaves: `id`, `titulo` (minimizado pelo M-1), `tipo`, `status`, `criadaEm`, `atualizadaEm`. O 201 usa a mesma vista | CA-07.1 a CA-07.4 |
| RF-08 | Awave cria no máximo 10 demandas em 60 minutos (janela móvel); a 11ª é 429 com mensagem que diz "10", antes de gerar id. Pessoa e agente seguem com 30 demandas e 60 artefatos. Sem corrida (trava consultiva do C-36) | CA-08.1 a CA-08.4 |
| RF-09 | Bearer sem cookie continua sem exigir `Origin`, depois da CSP e da vigilância de origem da 0.2.0, também com `Host: orquestrador_app`. A entrega aceita POST sem corpo e sem `content-type`. Cookie sem `Origin` continua 403 | CA-09.1 a CA-09.4 |
| RF-10 | Origem da demanda (Pessoa, Agente de IA, Awave), lida da autoria e nunca do `solicitanteNome`, na fila e no detalhe, com filtro combinável com os de hoje e com a paginação. `GET /api/demandas?origem=pessoa\|agente\|awave` (fora da lista: 400). Vista de pessoa e de agente aceitam autoria de integração sem 500 | CA-10.1 a CA-10.7 |
| RF-11 | Integração fora da tela de agentes, do interruptor, do teto, de `uso_ia`, de `configuracao_agente` e de `GET /api/agentes` | CA-11.1 a CA-11.3 |
| RF-12 | `GET /api/pedidos-construcao/pendentes`, só `construir`: `{ itens: [{ decId }] }` com DEC de pedido gerado por pessoa, ainda aprovado vigente, não desatualizado, demanda fora de status final e sem `pedido_recebido`; do mais antigo para o mais novo; só ids; não grava evento | CA-12.1 a CA-12.6 |
| RF-13 | `POST /api/pedidos-construcao/:decId/entrega`, só `construir`, sem corpo: refaz as conferências 3 a 11 do RF-22 (cap. 05) sem pedir a confirmação de novo; sem `pedido_gerado` → 404 igual a inexistente; aceita → 200 com os bytes da geração (CA-22.2) e evento `pedido_entregue` | CA-13.1 a CA-13.6 |
| RF-14 | `POST /api/pedidos-construcao/:decId/recebimento` com `{ sha256 }` (64 hexadecimais minúsculos): 404 sem pedido gerado; 409 sem entrega anterior; 400 fora do formato; 409 se não bate (sem evento); 204 se bate, com `pedido_recebido`; repetir dá 204 sem novo evento. Substituição ou status final depois da entrega não impedem o 204 | CA-14.1 a CA-14.5 |
| RF-15 | Detalhe do DEC mostra "Recebido pelo /construir em <data e hora>"; histórico com rótulo pt-BR para os seis eventos novos, com o ator de integração e o prefixo, nunca o token | CA-15.1 a CA-15.4 |
| RF-16 | `package.json` 0.3.0, CHANGELOG, manual técnico (acesso, demandas, cap. 05, API, painel) e `docs/operacao/` com emissão, troca e revogação dos dois tokens e onde cada um mora, sem nenhum valor | CA-16.1 a CA-16.3 |

### 2.2 Requisitos não funcionais (os números)

| Id | Requisito | Número (01, seção 3) |
|---|---|---|
| RNF-01 | Tempo do Awave | `POST /api/demandas`: p95 ≤ 1 s e nenhuma acima de 5 s em 20 chamadas na homologação (o Awave corta em 10 s) |
| RNF-02 | Tempo do `/construir` | `pendentes` p95 ≤ 1 s com 200 DEC e 20 mil eventos; `entrega` e `recebimento` p95 ≤ 3 s com pedido de até 512 KB (o cliente corta em 15 s) |
| RNF-03 | Volume | Awave: até 10 demandas por hora; `/construir`: 1 busca a cada 5 min, até 20 pedidos por busca; sem limite de taxa novo nas três rotas |
| RNF-04 | Segredo | 32 bytes aleatórios, só SHA-256 no banco, prefixo de 8 caracteres; token nunca em log, Sentry, evento, erro, resposta ou documentação; a linha de log ganha só o tipo `integracao`, sem prefixo |
| RNF-05 | Histórico sem texto livre (C-30) | eventos novos só com ids, enumerações, booleanos, prefixo e hash hexadecimal; 0 campo de texto livre, conferido por teste |
| RNF-06 | Migration só aditiva | amplia CHECK de `token_servico`, `evento.ator_tipo` e `demanda.autor_tipo`; nenhuma coluna removida, `alteram_dado = false`, nenhuma migration da `main` editada; ensaio de rollback aprovado |
| RNF-07 | Retenção | sem regra nova; token revogado fica no banco; demanda do Awave não cria `entrada_bruta` |
| RNF-08 | Compatibilidade | 0 mudança do lado de lá (tool do Awave 0ab8ced e `buscar-pedidos.mjs` dfedf16); um teste de contrato por integração |
| RNF-09 | Nenhum controle afrouxado | C-09, C-10, C-11, C-15, C-17, C-28, C-30, C-34, C-36, A-02 e axe com os mesmos testes verdes; nenhum teste apagado ou enfraquecido |
| RNF-10 | Qualidade | test, lint e typecheck verdes; e2e verde 3 vezes seguidas; axe sem violação em fila, detalhe da demanda, detalhe do DEC e histórico, em 1280 × 720 e 390 × 844 |

### 2.3 Rastreabilidade dos critérios preliminares

Os nove critérios preliminares do `pedido.json` estão na matriz da seção 6 de `01` (01, seção 6):

| Critério preliminar | RF | Critérios-chave |
|---|---|---|
| CP-1 Token awave cria demanda com 201 e id DEM, rascunho, origem Awave na fila, solicitante Awave, evento com ator e prefixo | RF-01, RF-04, RF-10 | CA-01.1, CA-04.1 a CA-04.7, CA-10.1 |
| CP-2 Token awave recebe 403 fora de criar e ler, 404 em demanda de outro autor; vista de seis campos | RF-03, RF-07 | CA-03.1, CA-03.5, CA-03.6, CA-07.1 a CA-07.4 |
| CP-3 Demanda do awave não cria execução nem job do insumo técnico, mesmo ligado | RF-05, RF-06 | CA-05.1, CA-05.2, CA-06.1 a CA-06.3 |
| CP-4 A 11ª demanda do awave na mesma hora recebe 429; o limite dos outros não muda | RF-08 | CA-08.1 a CA-08.4 |
| CP-5 Token revogado recebe 401 com a mensagem de token inválido, sem afetar os demais | RF-01, RF-02 | CA-01.3 a CA-01.5, CA-02.4, CA-02.5 |
| CP-6 Bearer sem Origin aceito, também pela rede interna | RF-09 | CA-09.1 a CA-09.4 (a chamada real pela rede interna em produção é verificação de Fabiano depois do deploy) |
| CP-7 Pedido gerado por pessoa em pendentes; entrega com os mesmos bytes; recebimento certo tira da lista, errado dá 409 | RF-12 a RF-15 | CA-12.x, CA-13.x, CA-14.x, CA-15.1 |
| CP-8 Token construir recebe 403 fora das três ações; awave, agentes e pessoa recebem 403 nas três rotas | RF-03 | CA-03.2 a CA-03.5 |
| CP-9 `buscar-pedidos.mjs` passa contra a homologação da 0.3.0 com pedido fictício | RF-12 a RF-14, RNF-08 | CA-13.6 e o cenário V-01 |

**V-01** (01, seção 6): homologação no ar com seed fictício (um DEC aprovado vigente com pedido gerado por pessoa) e
token `construir` emitido dentro da homologação pelo script; o `buscar-pedidos.mjs`, com config ligado apontando para
a homologação e arquivo de token 600 em pasta temporária, sai 0, grava `<DEC-id>.json` com os bytes da entrega e, numa
segunda execução, lista 0 pendentes. A montagem fica na etapa 05.

Os itens (1) a (14) da ESP, os critérios do insumo, o RSK e a definição de pronto também estão mapeados (01, seção 6,
cobertura complementar).

## 3. Arquitetura e ADRs

Evolução do monólito modular de hoje (ADR-01 a ADR-19, cap. 01 do manual). As duas integrações **chamam** o
Orquestrador; o Orquestrador não chama ninguém de novo (02, seção 0). Princípios (02, seção 1):

1. **Lista de permissão fechada por integração**: ação nova nasce negada para toda integração; nenhuma regra que
   percorre `AGENTES` a alcança.
2. **Todo ramo por tipo de ator é exaustivo**: `switch` com `never`, para o tipo novo quebrar o `typecheck` em vez de
   cair no ramo "não é pessoa, então é agente".
3. **Estado derivado do histórico**: "confirmada", "pendente", "entregue" e "recebido" saem dos eventos. Nenhuma
   coluna de estado, `UPDATE` ou privilégio novo.
4. **O mesmo código gera e entrega**: os bytes são iguais por construção, não por cópia.

### 3.1 O que muda e o que não muda

| Muda | Não muda |
|---|---|
| Um tipo de ator (`integracao`), quatro ações na matriz, três rotas de API, uma Server Action, uma migration gerada e aditiva, leituras novas no painel (02, seção 0) | Processo, serviço, fila, job, dependência, variável de ambiente e chamada de saída: nenhum novo (02, seção 0) |
| Ramos por tipo de ator viram `switch` exaustivo em vários arquivos (02, ADR-22) | `src/proxy.ts`, `resolver-ator.ts`, `exigir-pessoa.ts`, `auth.ts`; `rota.ts` só em `EXEMPLO_DO_PARAMETRO`, se o T13 pedir (02, C08; 04, IN-15) |
| Geração do pedido refatorada: `conferirEMontarPedido` extraído de `gerar.ts` e usado pela geração e pela entrega (02, ADR-26) | Bytes e códigos do `gerarPedido` de hoje (guarda: teste da CA-22.2 e SHA-256 igual antes e depois) |
| Código de erro novo `indisponivel` (503) para tempo limite nas transações de integração (02, ADR-28) | Comportamento de pessoa e agente; formato do token; mensagem 401; `privilegios.ts` (02, seção 4) |
| Nenhum pacote novo (02, ADR-29) | Stack: valem as versões do `package.json` (Next 16.4.1, `better-auth` 1.7.7, `zod` 4.6.6), registradas no ADR-29 |

Porta de desenvolvimento **3101**, a de hoje, livre em `ss -ltn`; Postgres de desenvolvimento em `127.0.0.1:5434`;
homologação em `127.0.0.1:${HML_PORTA}` (3200 a 3299) (02, seção 8).

### 3.2 Componentes

| Id | Componente | Caminho | Papel (02, seção 2) | RF |
|---|---|---|---|---|
| C01 | Ator e token | `src/db/schema/acesso.ts`, `src/modules/acesso/ator.ts`, `tokens-servico.ts` | `INTEGRACOES = ['awave', 'construir']` com fonte única no esquema; `AtorIntegracao`; `criarTokenServico` com dono agente ou integração; `validarTokenServico` devolve agente, integração ou `null` (401) | RF-01, RF-11 |
| C02 | Scripts de token | `scripts/criar-token-servico.ts`, `revogar-token-servico.ts` | `--agente` ou `--integracao`, exatamente um; `token_criado` com `{ integracao, prefixo }`; revogação pelo prefixo sem mudança de código | RF-02 |
| C03 | Matriz | `src/modules/acesso/matriz.ts` | `Linha.integracoes` (padrão vazio); ações novas `confirmar_demanda` (pessoa), as três do `construir`; `ler_demanda` deixa de usar `LEITURA`; `atoresProibidos` devolve integrações | RF-03, RF-06, RF-11 |
| C04 | Criação de demanda | `src/modules/demandas/servico.ts`, `POST /api/demandas` | `autoriaDaDemanda(ator)` separada de `autoriaDo` (versões); para integração, solicitante "Awave", rascunho, evento com ator de integração, sem `dispararSeLigado`; tempo limite do ADR-28 | RF-04, RF-05 |
| C05 | Confirmação | `src/modules/demandas/confirmar.ts` (novo), `confirmarDemandaNoPainel` em `acoes.ts` | `confirmarDemanda`: autorizar, trava, 409 por origem ou status final, idempotente, evento e `dispararSeLigado` na mesma transação; `confirmacaoDaDemanda` lê quem e quando. Sem rota de API | RF-06 |
| C06 | Leituras de demanda | `src/modules/demandas/consultas.ts`, `GET /api/demandas/:id` | `obterDemandaDaIntegracao` com a autoria no `WHERE`, vista de 6 chaves; `vistaDaDemandaPara` exaustiva; `OrigemDaDemanda`, `origemDaAutoria`, `DemandaResumo.origem`; filtro `origem` em `filtroDemandasSchema`, `paginaDeDemandas` e `contarDemandasPorStatus` | RF-07, RF-10 |
| C07 | Limite por ator | `src/modules/limites.ts` | ramo integração; `limiteDe(ator, tipo)`: `awave` = 10; trava `limite:demanda:integracao:awave` | RF-08 |
| C08 | Adaptador de rota | `src/lib/rota.ts` | sem mudança de regra; log só com `atorTipo` | RF-09 |
| C09 | Entrega ao `/construir` | `src/modules/pedido-construcao/conferir.ts`, `entregar.ts`, `pendentes.ts`, `receber.ts` (novos); três rotas em `src/app/api/pedidos-construcao/` | conferência e montagem compartilhadas; `pedido_entregue` com `{ sha256 }` só na primeira entrega de cada hash; pendentes numa consulta só; recebimento sob trava por DEC | RF-12 a RF-14 |
| C10 | Painel: fila e detalhe | `demandas/page.tsx`, `fila.tsx`, `CartoesDaFila.tsx`, `FiltrosFila.tsx`, `[id]/page.tsx`, `CartaoProximaAcao.tsx`, `dados-das-etapas.ts`, `rotulos.ts` | origem e filtro; estado da confirmação; Próxima ação recebe a confirmação como entrada da função pura | RF-06, RF-10 |
| C11 | Painel: DEC e histórico | `pacotes-decisao/[decId]/page.tsx`, `SecaoPedido.tsx`, `historico/consultas.ts`, `Historico.tsx`, `rotulos.ts` | `recebimentoDoPedido(db, decId)`; `AtorVisivel` com caso integração e prefixo; rótulos dos eventos novos | RF-15 |
| C12 | Histórico (gravação) | `src/modules/historico/registrar.ts` | ações novas; `colunasDoAtor` com caso integração; `depois` só booleano fixo ou `sha256` | RF-04, RF-06, RF-13 a RF-15 |
| C13 | Esquema e migration | `src/db/schema/*.ts`, `drizzle/0007_<gerado>.sql` | seção 3.3 | RNF-06 |
| C14 | Homologação e testes | `scripts/seed-ficticio.ts`, testes de contrato, matriz, T13, e2e | seed com uma demanda do Awave e um DEC com pedido gerado por `gerarPedido`; token da V-01 emitido dentro da homologação | RF-09, RNF-08 |
| C15 | Versão e docs | `package.json`, `CHANGELOG.md`, manual cap. 01, 02, 03, 05, 08, 09, 10, `docs/operacao/` | RF-16 | RF-16 |

Dono de cada componente: o `tech-lead` do pedido até o merge; depois, o sistema (Fabiano) (02, seção 2).

### 3.3 Modelo de dados e migration

Uma migration gerada (`pnpm db:generate`), `drizzle/0007_<gerado>.sql`, sem migration custom (02, seção 4):

| Tabela | Mudança |
|---|---|
| `token_servico` | `agente` passa a anulável; coluna nova `integracao text` anulável; CHECK `token_servico_integracao_check` (`awave`, `construir`); CHECK `token_servico_dono_check` (`num_nonnulls("agente", "integracao") = 1`) |
| `evento` | `evento_ator_tipo_check` aceita `'integracao'`; CHECK novo `evento_ator_integracao_check` (integração exige `ator_id` da lista e prefixo); índice novo `evento_acao_entidade_idx (acao, entidade_id)` (ADR-27) |
| `demanda` | `demanda_autor_tipo_check` aceita `'integracao'`; CHECK novo `demanda_autor_integracao_check` (integração só `awave` e sempre rascunho) |

**Altera dado existente? Não.** Nenhuma linha muda (não há linha de integração antes da 0.3.0), nenhuma coluna sai,
nenhuma migration da `main` é editada: `alteram_dado = false`. A migration afrouxa um `NOT NULL` e acrescenta
coluna, regras e índice. Os `ADD CONSTRAINT` leem as tabelas uma vez e o `CREATE INDEX` segura a escrita em `evento`
enquanto roda (milissegundos no volume de hoje); roda no passo separado do ADR-12, antes do deploy. As tabelas de ESP,
RSK e DEC não aceitam autoria de integração. `privilegios.ts` não muda: `token_servico.integracao` fora de
`colunasUpdate`; o `UPDATE` de `demanda` continua sem `autor_*` e `rascunho_agente` (02, seção 4; 04, IN-17).

A volta da 0.3.0 para a 0.2.0 é por restauração do backup (ADR-12), porque a 0.2.0 lançaria 500 no detalhe de uma
demanda do Awave e trataria token de integração como agente nulo (403) (02, seção 7).

**Eventos novos** (02, seção 4; 04, IN-12):

| `acao` | Ator | Entidade | `depois` |
|---|---|---|---|
| `demanda_criada` (pelo Awave) | integração `awave` + prefixo | `demanda` | `{ status: 'nova', tipo }` |
| `demanda_confirmada` | pessoa | `demanda` | `{ confirmada: true }` |
| `pedido_entregue` | integração `construir` + prefixo | `pacote_decisao` | `{ sha256 }` calculado pelo servidor |
| `pedido_recebido` | integração `construir` + prefixo | `pacote_decisao` | `{ sha256 }` |
| `token_criado` (integração) | sistema | `token_servico` | `{ integracao, prefixo }` |
| `token_revogado` | sistema | `token_servico` | `{ prefixo }` (como hoje) |

`Origem` já é o tipo do canal da entrada bruta; a origem da demanda se chama `OrigemDaDemanda` /
`ORIGENS_DA_DEMANDA` (02, seção 4).

### 3.4 Contratos das rotas

**Awave** (não muda; 01, seção 4; 02, 5.1 e 5.2):

| Rota | Entrada | Respostas |
|---|---|---|
| `POST /api/demandas` | Bearer, JSON `{ titulo, tipo, solicitanteNome: 'Awave', solicitantePapel: 'outro', descricaoProblema, contexto }`, sem `Origin` | 201 vista de 6 chaves; 400 `entrada_invalida`; 401 `nao_autenticado`; 403 `sem_permissao`; 429 `limite_excedido`; 503 `indisponivel` (tempo limite, nada gravado). Nunca 3xx |
| `GET /api/demandas/:id` | Bearer | 200 com exatamente `id`, `titulo`, `tipo`, `status`, `criadaEm`, `atualizadaEm`; 404 `nao_encontrado` igual para outro autor e inexistente |

**`/construir`** (rotas novas; não muda o lado de lá; 02, 5.3):

| Rota | Ação | Entrada | Respostas |
|---|---|---|---|
| `GET /api/pedidos-construcao/pendentes` | `listar_pedidos_pendentes` | — | 200 `{ itens: [{ decId }] }`, do primeiro `pedido_gerado` mais antigo para o mais novo; nenhuma outra chave; sem evento |
| `POST /api/pedidos-construcao/[decId]/entrega` | `entregar_pedido` | sem corpo, sem `content-type` | 200 `application/json; charset=utf-8` com os bytes da geração; 404 (inexistente ou sem `pedido_gerado` por pessoa, mesmo corpo); 409 e 422 com as mensagens do RF-22; recusa sem evento |
| `POST /api/pedidos-construcao/[decId]/recebimento` | `confirmar_recebimento_pedido` | `{ sha256: /^[0-9a-f]{64}$/ }` | 400 (corpo fora, antes de olhar o DEC); 404; 409 (nunca entregue); 409 (hash diferente de todo `pedido_entregue` do DEC, sem evento); 204 (bate; `pedido_recebido` só na primeira vez) |

Pendentes numa consulta só: DEC com decisão aprovada, demanda fora de status final, primeiro `pedido_gerado` por pessoa,
não substituído, não desatualizado e sem `pedido_recebido` (02, 5.3).

**Tempos limite** (02, seção 6; ADR-28): Awave corta em 10 s; servidor com `lock_timeout` 2 s e `statement_timeout`
5 s. `/construir` corta em 15 s; servidor com `statement_timeout` 5 s (10 s na entrega). Estouro → `ROLLBACK` e 503.
Sem chave de idempotência no contrato do Awave: se o 201 se perder depois do `COMMIT`, uma repetição cria outra
demanda, contida por 10/h, rascunho e confirmação (02, seção 6).

**Observabilidade e falha** (02, seção 7): linha de log por requisição com `atorTipo`, sem token, prefixo, hash, título
ou corpo; todo ato de integração tem evento com prefixo, menos a listagem; Sentry só 5xx. Token vazado → revogar pelo
prefixo; entrega quebrada → desligar no `orquestrador.json` e voltar à cópia manual; migration com problema → backup e
volta.

### 3.5 ADRs

| ADR | Decisão | Por quê | Descartadas |
|---|---|---|---|
| **ADR-20** Integração é um quarto tipo de ator | `Ator` = pessoa \| agente \| sistema \| **integracao**; `INTEGRACOES` no esquema, espelhada nos CHECK; nunca em `AGENTES` | Opção A do DEC; fecha a permissão por construção. Integração nova = pedido + migration | Quinto agente (exceções esquecidas, entra na tela de agentes e no teto); tabela de integrações cadastráveis |
| **ADR-21** Token na mesma tabela | `agente` anulável, `integracao` nova, CHECK de exatamente um | Uma busca por hash, uma revogação por prefixo, nenhuma linha tocada | `dono_tipo` + `dono` (migra dado); tabela separada (duas buscas, scripts duplicados) |
| **ADR-22** Matriz com coluna de integrações e ramos exaustivos | `Linha.integracoes` padrão vazio; `permitido` com ramo próprio; todo ponto que decide por `ator.tipo` vira `switch` com `never` | Sem isso o tipo novo cai no ramo do agente e herda a vista mínima de agente | `if/else` com um `if` por lugar; `throw` no começo de cada rota |
| **ADR-23** Leitura do Awave por consulta própria | autoria no `WHERE`, vista chave a chave, decidida antes de qualquer leitura | 404 sai da mesma consulta do inexistente | `obterDemanda` e conferir o autor depois |
| **ADR-24** Autoria travada no banco e limite por integração | `autoriaDaDemanda` separada; CHECK de autoria; `limiteDe` por integração na trava do C-36 | Defesa em profundidade do C-11; mudar o número é decisão por pedido | Limite em configuração no banco |
| **ADR-25** Sem disparo para integração; confirmação por pessoa só no painel | dispara só para pessoa e agente; `confirmar_demanda` só Server Action; "confirmada" = existência do evento | D1; idempotência sob a trava, sem coluna nem `UPDATE` | Confirmar ao mover para `em_analise`; coluna `confirmada_em` (contra C-34); rota de API |
| **ADR-26** Entrega reaproveita a geração; hash no evento | `conferirEMontarPedido` nas duas pontas; pendência por consulta; `pedido_entregue` guarda o `sha256`; entregue e recebido gravados uma vez por hash | Bytes iguais por construção; atende o RF-14 com DEC substituído depois da entrega | Tabela `entrega_pedido`; refazer a montagem no recebimento; webhook de saída |
| **ADR-27** Índice `evento (acao, entidade_id)` | na migration gerada | Quatro leituras novas por ação e entidade; tabela permanente | Sem índice |
| **ADR-28** Tempo limite do servidor abaixo do cliente | `SET LOCAL lock_timeout '2s'` e `statement_timeout` (5 s; 10 s na entrega) só para ator de integração; `57014` e `55P03` → 503 | Não gravar depois de o cliente desistir (duplicata do Awave) | `statement_timeout` no papel do banco; não limitar |
| **ADR-29** Stack sem mudança | nenhum pacote novo; registra o desvio já existente (Next 16.4.1, `better-auth` 1.7.7, `zod` 4.6.6, fechando a vulnerabilidade da S-01) | O padrão técnico pedia ADR e a troca ficou sem | Voltar à 16.3.8 |

## 4. Interface

Detalhe em `03-ux-ui-design.md`. A base visual é a 0.2.0 **sem nenhuma mudança**: casca A, tokens, componentes e pontos
de quebra; nenhum componente, variação ou token novo (03, seções 0 e 2). Texto que não muda é citado pela constante;
texto novo está por inteiro na seção 9 de 03.

### 4.1 O que chega ao painel (03, seção 1)

| Tela | Mudança | RF |
|---|---|---|
| T03 Fila | origem em cada linha e cartão; filtro "Origem" | RF-04 (CA-04.7), RF-10 |
| T05 Demanda | origem nos Dados; selo e seção de confirmação; linha nova na Próxima ação; textos dos eventos novos | RF-06, RF-10, RF-15 |
| T11 Decisão | "Recebido pelo /construir em …" e texto novo da seção "Pedido de Construção" | RF-15, RF-16 |
| T12 Agentes e teto | nada; a integração não aparece | RF-11 |
| Mensagens da API | limite de 10 e recusas novas, lidas pelo dono no Awave e por Fabiano no e-mail do `/construir` | RF-06, RF-08, RF-14 |

Constantes novas em `src/components/rotulos.ts`: `ROTULO_ORIGEM` ("Pessoa", "Agente de IA", "Awave"),
`NOME_INTEGRACAO` ("Awave", "/construir") e `SELO_AGUARDANDO_CONFIRMACAO` (âmbar, sem tracejado). Componente de tela
novo só da T05: `ConfirmarDemanda.tsx`, no molde de `MudarStatus.tsx` (03, seção 2).

### 4.2 T03 Fila (03, seção 4)

- **Filtro "Origem"** entre Tipo e Linha de serviço (`Selecao`, `name="origem"`, opções Todas, Pessoa, Agente de IA,
  Awave); aplica só por "Filtrar"; "Limpar filtros" tira também a origem; no celular, dentro de "Mais filtros", que
  passa a contá-la.
- **URL**: `origem` depois de `linhaServicoProvavel`; valor fora da lista → `TEXTOS_FILA.filtroInvalido`.
- **Contadores**: levam `origem` oculto e o total respeita tipo, linha **e origem** (ver 7.3).
- **Título do resultado**: parte "origem <rótulo>" por último (ex.: "Demandas com status Nova e origem Awave, da mais
  nova para a mais antiga").
- **Tabela**: sem coluna nova; segunda linha na célula Título, "Origem: <rótulo>" (13 px, `tinta-media`), porque a
  tabela já tem 8 colunas. **Cartão**: item "Origem" na linha toda, depois de Urgência.
- A demanda do Awave mostra o selo "Rascunho de agente"; a fila **não** mostra "Aguardando confirmação".
- Estados de hoje; o vazio com filtro usa `TEXTOS_FILA.vazioComFiltro`.

### 4.3 T05 Demanda (03, seção 5)

- **Dados**: "Origem" antes de "Criada por"; "Criada por" de integração é "Awave".
- **Selo** "Aguardando confirmação" no cabeçalho, só com demanda do Awave não confirmada e fora de status final.
- **Seção "Confirmação do Awave"** (só demanda do Awave), depois de Dados, `h2 id="confirmacao"` focável, também em
  "Nesta página". Estados (03, 5.4):

| Estado | O que aparece |
|---|---|
| Aguardando | três parágrafos (não confirmada; o que a confirmação libera ao agente de insumo técnico; "se não deve seguir, use Mudar status e escolha Encerrada") e o botão "Confirmar demanda" |
| Enviando | "Confirmando…", botão desabilitado, seção com `aria-busy` |
| Sucesso | "Demanda confirmada." na região de aviso; foco no `h2` da seção; o selo some |
| Confirmada | "Confirmada por <ator> em <data e hora>." e "Desde a confirmação, a demanda segue o fluxo de qualquer outra." |
| Final sem confirmação | "Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em <status>, um status final: não há confirmação a fazer." |
| Erro 409 / 403 / rede | `Alerta` com foco, prefixo "Não foi possível concluir: " e a mensagem do servidor |
| Demanda de pessoa ou agente | a seção não existe |

- **Sem diálogo de confirmação**: a consequência está escrita acima do botão e ligada por `aria-describedby` (03,
  Decisões).
- **Próxima ação, linha 14** (avaliada depois da linha 2 e antes da 3; número 14 para não renumerar a 0.2.0): "Confirmar
  a demanda aberta pelo Awave.", detalhe "Até a confirmação, nenhum agente de IA trabalha nela.", quem age "Uma pessoa
  (CTO ou administradora)", link "Ir para a confirmação" (03, 5.5).
- A barra de etapas não muda; a grade a partir de 1200 px passa de 5 para 6 linhas na coluna principal (03, 5.1).
- **Histórico** (03, 5.6): ator de integração "<nome> (prefixo <prefixo>)", prefixo só se casar
  `^[A-Za-z0-9_-]{8}$`; integração fora da lista sai "Integração". Textos: "Confirmou a demanda aberta pelo Awave";
  "Buscou o Pedido de Construção de <DEC-id>"; "Confirmou o recebimento do Pedido de Construção de <DEC-id>"; "Criou um
  token de serviço para o <nome> (prefixo …)"; "Revogou o token de serviço do <nome> (prefixo …)". Nenhum mostra token,
  hash ou SHA-256.

### 4.4 T11 Decisão (03, seção 6)

- **"Recebido pelo /construir em <data e hora>."** no **cabeçalho**, depois de "Repositório destino", com ícone de visto
  decorativo e `<time>`. Aparece em toda situação do DEC (substituído, desatualizado, status final), porque é fato
  consumado; sem `pedido_recebido`, a linha não existe. Sem estado "aguardando o /construir": o painel não sabe se a
  busca está ligada.
- **`TEXTOS_PEDIDO.texto`** muda para: "Gere o pedido. Com a busca automática do /construir ligada, ele pega o pedido
  gerado na busca seguinte (a cada 5 minutos), e o recebimento aparece no topo desta página. Com a busca desligada,
  baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma." (CA-16.3).

### 4.5 Mensagens da API (03, seção 8)

| Situação | Código | Mensagem |
|---|---|---|
| Awave passou de 10 na janela | 429 | "Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde." |
| Confirmar demanda que não é do Awave | 409 | "Só demanda aberta pelo Awave precisa de confirmação." |
| Confirmar demanda em status final | 409 | "A demanda está em um status final e não pode mais ser confirmada." |
| Recebimento sem entrega | 409 | "Este pedido ainda não foi entregue ao /construir. Peça a entrega antes de confirmar o recebimento." |
| Recebimento com SHA-256 diferente | 409 | "O SHA-256 enviado não confere com o pedido entregue. Busque o pedido de novo." |
| `sha256` fora do formato | 400 | "Informe o sha256 com 64 caracteres hexadecimais minúsculos." |
| 401, 403, entrega recusada, limite de pessoa | — | as de hoje, sem mudança |

### 4.6 Acessibilidade (03, seção 10)

Tudo o que a 0.2.0 garante continua (um `h1`, foco de 2 px, alvo de 44 px, reflow em 320 px, nada só por cor, axe em
1280 × 720 e 390 × 844). Pontos novos: "Origem" com `label` e aplicação só por "Filtrar" (3.2.2); "Origem: …" visível
(7,5:1); botão "Confirmar demanda" de 44 px com `aria-describedby`, foco no `h2` no sucesso e no alerta no erro;
selo âmbar 5,4:1; nome da pessoa e título só como texto (C-18); a linha da T11 não é focável e a informação está no
texto.

## 5. Ameaças e controles

Modelo de ameaças em `04-seguranca-aplicacao.md`: STRIDE sobre C01 a C15 de 02 e as telas de 03, com OWASP Top 10
(2021), OWASP API Security Top 10 (2023), ASVS 4.0.3 nível 2 e LGPD. Controles com prefixo **IN-**, para não colidir
com C-01 a C-40, A-, S-, M-, B- e CV-01 a CV-20, que continuam valendo e não podem ser afrouxados (04, Entrega).

**Achados da leitura do código** que o desenho de 02 não cobria por inteiro e viraram controle (04, Entrega):

1. `limites.ts`: ator que não é pessoa nem agente sai **sem contar**; a integração ficaria sem limite (IN-09).
2. Gatilhos: ESP escrita à mão por pessoa numa demanda do Awave não confirmada dispara o `risco`, que manda título,
   contexto e descrição ao provedor; o D1 e o texto da 03 ficariam falsos (IN-06).
3. `atorVisivel`: ator que não casa vira "Sistema"; o ato do Awave apareceria como Sistema (IN-02).
4. `vistaDaDemandaPara`: todo ator que não é pessoa recebe a vista de agente, com texto livre, versões e execuções
   (IN-02, IN-08).

Nenhuma devolução às etapas anteriores (04, Decisões).

### 5.1 Fronteiras tocadas (04, seção 1)

**F2** dois tokens de integração (Awave pela rede interna do Easypanel, sem TLS e sem Traefik; `/construir` pelo
domínio público em HTTPS); **F3** texto escrito por agentes do Awave entra direto nos campos estruturados, sem
`entrada_bruta`; **F4** a demanda do Awave só chega ao provedor de IA depois da confirmação; **F5** o pedido deixa de
ser copiado à mão e vai ao git da estruturaAutonoma, onde agentes com Bash o executam (o ponto humano passa a ser só a
geração por pessoa); **F7** migration aditiva.

### 5.2 Ameaças críticas e altas (04, seção 2)

| Componente | Ameaça | Nível | Controle |
|---|---|---|---|
| C01 | Linha de token com os dois donos nulos (ou fora das listas) aceita como ator válido | crítica | IN-03 |
| C01, C03 | Integração resolvida como agente e herdando `LEITURA` (fila inteira, ESP, RSK, DEC); ação nova nascendo aberta; BFLA por afrouxamento da matriz | crítica | IN-01, IN-02, IN-03 |
| C03 | Awave em `listar_demandas`, histórico, ESP, RSK, DEC, texto bruto ou configuração | crítica | IN-01 |
| C04 | Autoria vinda do corpo; `solicitanteNome` usado para fingir pessoa | crítica | C-11, IN-05 |
| C06 | Awave lê demanda de outro autor (BOLA) ou descobre que ela existe | crítica | IN-08 |
| C10 | Página ou Server Action nova sem `exigirPessoa` | crítica | C-04 |
| C01 | `agente` anulável vira "agente nulo" permitido; token em claro em banco, log ou erro | alta | IN-01, IN-03, IN-04, IN-14 |
| C02, C14, C15 | Token impresso no log, em evento, na documentação, no repositório ou na fixture da V-01 | alta | IN-04, IN-18, C-39 |
| C04 | Awave preenche `urgencia`, `linhaServicoProvavel` ou `anexos` com URL (prioridade forjada, phishing no painel) | alta | IN-05 |
| C04, C05, Anthropic | Texto do Awave com injeção de instrução chegando ao modelo sem pessoa no meio, inclusive por ESP ou RSK escritos à mão | alta | IN-06 |
| C04, C07 | Token vazado ou agente em laço esgota a sequência diária; integração sem limite | alta | IN-09 |
| C04, C09 | `construir` cria demanda; Awave, agente ou pessoa nas três rotas novas | alta | IN-01, CHECK de autoria |
| C05 | Confirmação por agente, integração, sessão sem 2FA ou CSRF | alta | IN-07, C-04, C-15 |
| C06 | Awave recebe a vista de agente ou campo novo da vista inteira | alta | IN-02, IN-08 |
| C08 | Cookie + Bearer deixa de dar 400; "conserto" do C-15 para o Awave passar; prefixo ou texto do Postgres no log ou no 503 | alta | IN-14, IN-15 |
| C09 | Entrega de DEC sem `pedido_gerado` por pessoa; dado pessoal (nome renomeado depois) indo para o git sem expurgo | alta | IN-10 |
| C09 | Pedido com instrução injetada chega a agentes com Bash sem a cópia manual | alta | IN-10; risco residual (7.1) |
| C10 | XSS ou caractere de direção no texto do Awave na seção nova | alta | C-18, CV-18 |
| C12 | Evento apagado ou editado; texto livre do Awave ou SHA-256 do cliente no `depois` | alta | C-34, IN-12 |
| C13 | Coluna nova em `colunasUpdate` ou GRANT novo | alta | IN-17 |
| C14 | Teste de segurança enfraquecido para a integração passar | alta | IN-16 |

As médias e baixas (repúdio sem prefixo, recebimento com hash que não é o do servidor, filtro `origem` refletido cru,
prefixo no histórico, token em claro na rede interna, token do `/construir` legível pelo usuário `deploy`) estão nas
tabelas por componente da 04 e são cobertas por IN-11, IN-12, IN-13 e IN-16, ou ficam como risco residual.

### 5.3 Controles exigidos (04, seção 3)

Todos são critério de aceite de alguma tarefa do plano, com teste em Vitest (Testcontainers quando toca o banco) ou
Playwright, sempre com dado e token fictícios.

| Id | Nível | Controle |
|---|---|---|
| IN-01 | crítica | **Matriz fechada por integração**: `Linha.integracoes` padrão vazio; `permitido` exige a integração na lista **e** na linha; teste com o conjunto **exato** de pares permitidos (`criar_demanda:awave`, `ler_demanda:awave` e as três do `construir`); T13 com os dois tokens em toda rota; três rotas novas com agentes, `awave` e pessoa → 403; integração `jarvis` negada em toda ação |
| IN-02 | crítica | **Ramos exaustivos**: todo ponto que decide por `ator.tipo`, `autorTipo` ou `atorTipo` é `switch` com `never` (lista de 14 funções na 04); vistas de ESP, RSK e DEC **lançam** para integração; `atorVisivel` com caso próprio, nunca Sistema |
| IN-03 | alta | **Token resolvido só por lista**: integração só com `integracao ∈ INTEGRACOES` e `agente` nulo; agente só com `agente ∈ AGENTES` e `integracao` nula; outra linha → 401; CHECK no banco |
| IN-04 | alta | **Emissão sem vazar**: `strictObject`, `--token` recusado; token uma vez na saída padrão; `token_criado` só com integração e prefixo; token da V-01 em arquivo temporário 600 fora do repositório, apagado no fim; varredura de segredo do CI passa |
| IN-05 | crítica | **Autoria e campos do Awave por lista de permissão**: só `titulo`, `tipo`, `solicitantePapel`, `descricaoProblema` e `contexto` do corpo; `solicitanteNome = "Awave"`, rascunho, `anexos = []`, `duvidasEntrada = []`, urgência, justificativa, impacto e linha nulos, **sem 400**; CHECK de autoria; `privilegios.ts` sem diff |
| IN-06 | alta | **Nenhum agente de IA em demanda do Awave sem confirmação**: `criarDemanda` dispara só para pessoa e agente; `dispararSeLigado` recusa demanda de integração sem `demanda_confirmada` para **todos** os agentes; o worker confere de novo antes de chamar o provedor; na confirmação, evento antes do disparo, na mesma transação |
| IN-07 | alta | **Confirmação só por pessoa, no servidor**: `'use server'` coberto pelo teste do C-04, `exigirPessoa`, Zod `strictObject`, `autorizar` na action e no serviço; 409 por origem e status final; duas confirmações simultâneas → um evento e uma execução; `Origin` de outro site recusado |
| IN-08 | crítica | **Awave lê só a própria, sem oráculo**: autoria no `WHERE`; 404 igual **byte a byte** ao do inexistente; rota nunca chama `obterDemanda` para integração; sentinelas em contexto, descrição, solicitante editado e ESP não aparecem |
| IN-09 | alta | **Limite por integração, nunca "sem limite"**: `switch` exaustivo; `awave` = 10; integração sem limite definido **lança**; só `sistema` sai sem contar; recusa antes do `nextval` |
| IN-10 | alta | **Entrega só do que uma pessoa gerou**: `pendentes` e `entrega` exigem `pedido_gerado` com ator pessoa; mesmas conferências da geração (passos 3 a 11 do RF-22, com C-28 e nome do solicitante atual); 200 com `nosniff` e `no-store`; `pedido_gerado` de agente inserido à mão não entra em `pendentes` |
| IN-11 | média | **Recebimento confere com o hash do servidor** gravado em `pedido_entregue`, sob trava por DEC |
| IN-12 | alta | **Eventos novos sem texto livre**: `depois` exato por evento; `sha256` sempre calculado pelo servidor e conferido por regex; prefixo em todo evento de integração; teste de sentinelas ampliado ao Awave e ao `/construir` (eventos, log, Sentry falso, esquema `pgboss`) |
| IN-13 | média | **Prefixo no histórico só para pessoa, só da coluna**, conferido pela regex; nunca token, hash ou `sha256`; nunca na vista de agente ou integração, no log, no Sentry ou em e-mail |
| IN-14 | média | **Log e tempo limite sem vazamento**: log só com `atorTipo`; `SET LOCAL` como literal constante (sem `sql.raw`); `57014` e `55P03` → 503 com mensagem fixa e nada gravado |
| IN-15 | alta | **C-15 e C-09 sem afrouxamento**: `git diff a9fd9b8` vazio em `resolver-ator.ts`, `exigir-pessoa.ts`, `auth.ts` e `proxy.ts`; `rota.ts` só em `EXEMPLO_DO_PARAMETRO`; CA-09.1 a CA-09.4 e cookie + Bearer → 400 |
| IN-16 | alta | **Nenhum teste de segurança enfraquecido** (asserções contadas por arquivo) e CV-07 estendido a `origem`; e2e com `?origem=%3Cscript%3E` |
| IN-17 | média | **Migration só aditiva, sem privilégio novo**: uma migration gerada, ensaio de rollback com `alteram_dado = false`, `privilegios.test.ts` verde; seed da homologação com dado de integração |
| IN-18 | média | **Guarda e troca documentadas, sem valor**: token do Awave só no cofre ou nas variáveis do serviço `empresa-ia`; token do `/construir` em `~/.config/ws-construir/` com permissão 600; troca = emitir, trocar no cliente, revogar o antigo; troca imediata em suspeita e periódica (sugestão: 12 meses) |

**Respostas da 04 às pendências dirigidas a ela** (04, seção 6): prefixo no histórico aprovado com as condições do
IN-13; campos fora do contrato descartados sem 400 (IN-05); `origem` na listagem de agentes aprovada (enumeração sem
dado pessoal); `sha256` no `depois` aprovado se calculado pelo servidor; duplicata por 201 perdido com risco residual
**baixo**, que a 04 não aceita sozinha (7.1).

`pnpm audit --prod` em 11/11: 0 alta, 0 crítica, as mesmas 5 moderadas de ferramenta de build e teste (04, Decisões).

### 5.4 Dados pessoais (04, seção 4)

Bases legais, retenção e expurgo seguem a seção 4 do pedido 0001 (D1 a D12), com confirmação de `juridico-contratos`
pendente lá. O pedido cria um caminho novo de entrada (Awave) e um de saída (`/construir`):

| Id | Dado | Cuidado |
|---|---|---|
| D5 ampliado | Dado pessoal incidental no título, descrição e contexto escritos pelo Awave. Retenção: status final + 5 anos. **Não passa por `entrada_bruta`**, então não tem o expurgo de 90 dias do D1 | IN-05, IN-06 (só vai ao provedor depois da confirmação, minimizado pelo C-23), IN-12 |
| D3 (Awave) | `solicitante_nome` = "Awave": o valor do corpo é descartado, não há dado pessoal | IN-05 |
| D8 ampliado | Quem confirmou a demanda do Awave (pessoa da empresa), no evento e na T05; base art. 7º, VI e IX | nome só pela junção com `user` |
| D15 | Título minimizado devolvido ao Awave (fora deste sistema). O M-1 usa o `solicitanteNome`, que é "Awave", então não troca nome de pessoa que alguém ponha no título depois | IN-08; ver 7.2 |
| D16 | Pedido entregue ao `/construir`, permanente no git sem expurgo | C-28 e conferência do nome refeitas na entrega (IN-10) |
| — | Prefixo, nome da integração, SHA-256 do pedido, hash do token: não são dado pessoal | IN-12, IN-13 |
| D9 | Linha de log das rotas novas, sem dado pessoal | IN-14 |

### 5.5 O que o plano (05) precisa conter (04, seção 5)

1. Cada IN-01 a IN-18 como critério de aceite de uma tarefa, com o teste citado no controle.
2. **Ordem**: IN-01, IN-02, IN-03 e IN-09 na fundação, **antes** da primeira rota ou serviço que aceite integração; o
   teste dos pares exatos (IN-01 a) e o T13 com os dois tokens junto com a mudança da matriz; IN-06 na mesma tarefa da
   confirmação (IN-07).
3. **Risco `alto` no `tarefas.json`** para: ator, token e matriz; criação e leitura pelo Awave; confirmação e gatilhos;
   entrega e recebimento; migration.
4. **Inventário do IN-02** escrito no plano, por caminho e função.
5. **Testes transversais**: matriz × todas as rotas × os dois tokens; sentinelas ampliado; 404 idêntico; concorrência do
   limite (CA-08.4) e da confirmação.
6. **IN-15 e IN-16 em toda revisão de tarefa** (`git diff a9fd9b8 -- <lista>` e asserções por arquivo) e de novo na 08.
7. **Na 08**: `/security-review` com foco em matriz, vistas por tipo de ator, gatilhos e entrega; audit sem alta nem
   crítica; achado crítico ou alto volta ao engenheiro e passa por reteste da `seguranca-aplicacao`.
8. **Fora do `/construir`** (Fabiano, depois do merge): emitir os tokens de produção pelo script, guardar cada um no
   lugar do IN-18 e rodar o teste ponta a ponta pela rede interna (V01/W16, V02/W17). Nenhum token de produção passa
   pelo chat, por arquivo do repositório ou por e-mail.

## 6. Fora do escopo

- O Awave alterar, cancelar, comentar ou listar demandas; aviso de volta ao Awave por webhook (01, seção 5).
- Andamento visível para o cliente final (E01): pedido próprio, depois do teste ponta a ponta (01).
- Qualquer mudança no `awave-agents` e no `buscar-pedidos.mjs` (01; RNF-08).
- Ligar os agentes de IA do Orquestrador (01).
- O `construir` ler demanda, ESP, RSK ou DEC, ou gerar pedido; a pessoa continua gerando pelo RF-22 (01).
- Mudar o status da demanda sozinho na entrega ou no recebimento (01).
- Tela para emitir ou revogar token (01).
- Confirmação por pessoa para demanda de outra origem; mudar o disparo do `insumo_tecnico` para pessoa e agente (01).
- Corte por data na lista de pendentes (01, Decisões; ver 7.1).
- Limite de taxa novo nas três rotas do `/construir` (01, RNF-03; 04, Decisões).
- Mostrar o prefixo do token de agente no histórico (só o da integração, 04, seção 6).
- "Aguardando confirmação" na fila e aviso à pessoa quando chega demanda do Awave: sugestão da 03 para outro pedido.
- Rede própria do Easypanel para o Orquestrador e o Awave (04, Pendências; `seguranca-informacao`).
- Atualizar o `padrao-tecnico.md` da estruturaAutonoma (02, ADR-29).
- Deploy, emissão dos tokens de produção, gravação do token do `/construir` em `~/.config/ws-construir/`, troca de
  `"ligado"` em `pedidos/config/orquestrador.json` e o teste ponta a ponta em produção: ações de Fabiano depois do
  merge (01, seção 5; 04, 5.8).

## 7. Pendências

### 7.1 Para Fabiano

| ID | Pendência | Origem | Bloqueia? | Se não decidir agora |
|---|---|---|---|---|
| **P-01** | **Decisão**: forma da confirmação da demanda do Awave. O insumo e a ESP dizem só "a confirmação por pessoa dispara"; o 01 definiu uma ação nova e explícita no detalhe da demanda (botão "Confirmar demanda", sem diálogo, por qualquer pessoa com 2FA). Se a intenção era outra (ex.: confirmar ao mover para `em_analise`), o RF-06 muda antes da etapa 05 | 01 RF-06 e Pendências; 02 ADR-25; 03 5.3 | Não | Vale a ação explícita do RF-06 |
| **P-02** | **Decisão**: `pedido_entregue` gravado uma vez por hash, e DEC com entrega recusada (ex.: 422 por nome do solicitante renomeado) mantido em `pendentes`, com o `/construir` acusando erro por e-mail a cada 5 min até uma pessoa resolver | 02 Decisões e Pendências; 01 Pendências | Não | Vale a regra do 02 |
| **P-03** | **Decisão**: pedidos gerados antes da 0.3.0 entram em `pendentes` na primeira busca (a ESP não tem corte por data). Arquivo antigo igual vira `ja_existia`; arquivo gerado antes da 0.1.12 vira `conflito` por e-mail, a resolver um a um. Corte por data seria mudança de escopo | 01 Pendências; 02 Pendências | Não | Sem corte; Fabiano resolve os conflitos da primeira busca |
| **P-04** | **Aceite formal de risco residual** (com `gestao-riscos`): (a) duplicata de demanda quando o 201 se perde, baixo; (b) token do Awave em claro na rede interna do Easypanel, decidido no DEC, médio; (c) token do `/construir` legível pelo usuário `deploy`, que também roda os agentes com Bash, médio, ligado ao D-F3 ainda não executado; (d) pedido entra na fila do `/construir` sem a cópia manual: o ponto humano passa a ser só a geração (C-14 e C-28), e o risco (b) do 0001 perde uma barreira | 04 Pendências e seção 6; 02 Pendências | Não | Riscos ficam sem aceite registrado |
| — | **Ação depois do merge**: deploy da 0.3.0 com a migration `0007` no passo separado do ADR-12, backup antes; lembrar o snapshot no hPanel e o risco atual dele (congela a VPS e exige reboot manual) | 02 Pendências; pedido.json (risco) | — | Fica na main sem ir para produção |
| — | **Ação depois do deploy**: emitir os tokens `awave` e `construir` de produção pelo script, guardar cada um no lugar do IN-18, ligar `pedidos/config/orquestrador.json` e rodar o teste ponta a ponta pela rede interna (V01/W16, V02/W17) | 01 seção 5; 04 5.8 | — | As integrações ficam sem uso |
| — | **Decisão leve**: periodicidade da troca dos tokens (sugestão da 04: a cada 12 meses), a registrar em `docs/operacao/` | 04 IN-18 | Não | Fica a sugestão de 12 meses |

### 7.2 Para outras áreas, sem bloquear a construção

| Pendência | Dono | Origem |
|---|---|---|
| Confirmar que o texto do Awave (D5 ampliado) fica com retenção de status final + 5 anos, sem o expurgo de 90 dias do texto colado | `juridico-contratos` (Parada 1) | 04 Pendências |
| Pela rede interna do Easypanel qualquer contêiner chega ao app sem o Traefik e pode mandar o próprio `x-real-ip`, contornando o limite de login por IP (C-06); o bloqueio por conta continua. Avaliar rede própria para o Orquestrador e o Awave (existente antes deste pedido) | `seguranca-informacao` | 04 Pendências |
| O M-1 não troca nome de pessoa no título de demanda do Awave (o solicitante é "Awave"); registrar no manual que esse título não deve levar nome de pessoa | `desenvolvimento-produto` / Fabiano | 04 Pendências |
| Sugestão: marcar "Aguardando confirmação" na fila e avisar a pessoa quando chega demanda do Awave | `desenvolvimento-produto` | 03 Pendências |
| Texto da mensagem do 503 `indisponivel` (ADR-28): pedido pela 02 à 03, que rodou em paralelo e não o escreveu; a 04 só exige mensagem fixa | `ux-ui-design` ou `tech-lead` (05) | 02 Pendências; 04 IN-14 |
| Inventário do IN-02 por caminho e função (incluindo `entrada-agente.ts` e as vistas de ESP, RSK e DEC) | `tech-lead` (05) | 02 ADR-22; 04 5.5 |
| Teste que fixa o SHA-256 da geração antes e depois do refatoramento de `gerar.ts` | `tech-lead` (05) | 02 ADR-26 |
| Seed da homologação com uma demanda do Awave e um DEC com pedido gerado por `gerarPedido`; token da V-01 emitido por script dentro da homologação; montagem do cenário V-01 | `tech-lead` (05) | 01 seção 6; 02 C14; 04 IN-04, IN-17 |
| Decidir onde o worker relê a confirmação (IN-06) sem ler o esquema do pg-boss | `tech-lead` (05) | 04 Pendências |
| Escrever IN-01 a IN-18 como critérios, na ordem da 5.5 | `tech-lead` (05) | 04 seção 5 |
| Migration `0007` no passo separado do ADR-12, backup antes, volta por restauração; uma linha nova no procedimento de volta de `docs/operacao/deploy.md` | `devops-sre` (09) | 02 seção 7 e Pendências |
| Atualizar o `padrao-tecnico.md` (Next 16.3.8, Zod 4.6.5, Better Auth 1.7.6) para as versões do ADR-29 | quem cuida do padrão, na estruturaAutonoma | 02 ADR-29 |
| As pendências do 0015 sobre `pnpm audit` sem `--prod` (imagem com `devDependencies`) e as 5 moderadas continuam abertas | `tech-lead` / `devops-sre` | 04 Pendências |

Já respondidas dentro do pedido: forma do token e nome do argumento (01 → 02, `--integracao`, ADR-21); nomes das
ações (01 → 02); comparação do SHA-256 pelo hash gravado em `pedido_entregue` (01 → 02, ADR-26); campos fora do
contrato do Awave (01 e 02 → 04, IN-05); prefixo no histórico (03 → 04, IN-13); `origem` na listagem de agentes e
`sha256` no evento (02 → 04, seção 6); textos de origem, filtro, confirmação, limite e eventos (01 → 03, seção 9);
procedimento de volta com dado do Awave (01 → 02, seção 7, e 04, IN-17).

### 7.3 Divergências entre as entregas

| Ponto | Entregas | Vale |
|---|---|---|
| Contadores da T03 com o filtro de origem | 03 4.1 (item 3) supõe que o total respeite tipo, linha **e origem** e pede à 02 que confirme; 02 C06 já põe o filtro `origem` em `contarDemandasPorStatus` | **Sem divergência**: a 02 atende a suposição da 03 |
| Campos do corpo do Awave fora do contrato (`anexos`, `urgencia`, `justificativaUrgencia`, `impactoPercebido`, `linhaServicoProvavel`) | 01 RF-04 ("demais campos como hoje") e 02 ADR-24 os aceitam; 02 recomenda descartar; 04 IN-05 descarta todos, sem 400 | **04** (lista de permissão de campos; compatível com o CA-04.4) |
| Alcance do "sem disparo" (D1) | 01 RF-05 e 02 C04/ADR-25 bloqueiam só a criação; o worker "segue com a regra de hoje" (02, seção 6); 04 IN-06 bloqueia no `dispararSeLigado` para todos os agentes (ESP e RSK escritos à mão) e no worker | **04**: sem isso o texto de fora chega ao provedor pelo `risco` e o texto da 03 ("nenhum agente de IA trabalha nela") fica falso |
| Quantos `pedido_entregue` por DEC | 01 RF-13: grava o evento em cada entrega aceita; 02 ADR-26: uma vez por hash (repetir não polui o histórico; CA-13.5 continua atendido) | **02**, sujeito à P-02 de Fabiano |
| Mensagem do 429 do Awave | 01 RF-08: "Limite de 10 demandas por hora atingido. Tente de novo mais tarde." (texto final com a 03); 03 seção 8: "Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde." | **03** (o 01 delegou o texto; a frase continua com "10") |
| Origem na tabela da fila | 02 C10: "coluna e rótulo de origem (tabela e cartões)"; 03 4.1: sem coluna nova, segunda linha "Origem: …" na célula Título | **03** (interface; a 02 remete os textos à 03) |
| Lugar de "Recebido pelo /construir em …" | 02 C11: na seção do pedido (`SecaoPedido.tsx`); 03 6.1: no cabeçalho da T11, porque a seção some com DEC substituído ou desatualizado | **03** (atende o CA-15.1 em toda situação do DEC) |
| Numeração das conferências refeitas na entrega | 01 RF-13 e 04 IN-10: passos 3 a 11 do RF-22; 02 C09: "passos 3 a 7 de hoje", com a mesma lista de itens | **01 e 04** (a lista de itens é a mesma; vale a numeração do cap. 05) |
| Forma do erro 400 do recebimento | 02 5.3: 400 do `rota()` por Zod (`entrada_invalida`); 03 seção 8: mensagem "Informe o sha256 com 64 caracteres hexadecimais minúsculos." | **Forma da 02, texto da 03** (a própria 03 registra essa regra); o `tech-lead` reconcilia no plano |
