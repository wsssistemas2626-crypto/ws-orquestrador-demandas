# 09. Referência da API

| Campo | Valor |
|---|---|
| Atualizado em | 03/11/2026 (0.1.5: 409 de demanda em status final) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Fontes no código | `src/app/api/**/route.ts`, `src/lib/rota.ts`, `src/lib/erros.ts`, `src/modules/acesso/matriz.ts` |
| Uso | interno; documento não publicável fora da empresa sem aprovação de Fabiano |

Base: a origem do `BETTER_AUTH_URL`. Toda rota abaixo, menos `/api/auth/*` e `/api/saude`, passa por `rota(...)`
([cap. 02](02-acesso-e-seguranca.md#proteção-das-rotas)).

## Autenticação

- **Pessoa:** cookie de sessão do Better Auth (`wsod.session_token`, ou `__Secure-wsod.session_token` em https), com
  2FA ativo. Em `POST`, `PATCH`, `PUT` e `DELETE`, mande `Origin` igual à do `BETTER_AUTH_URL` e
  `Content-Type: application/json`.
- **Agente:** `Authorization: Bearer wsod_<token>`. Não mande cookie junto.

## Rotas

"Pessoa" é qualquer papel com 2FA; "cto" é só a conta de papel `cto`.

| Método e rota | Quem | Corpo ou query | Resposta |
|---|---|---|---|
| `GET /api/saude` | público | — | 200 `{"status":"ok"}` ou 503 `{"status":"indisponivel"}` |
| `/api/auth/*` | público | Better Auth (login, 2FA) | — |
| `POST /api/demandas` | pessoa, `orquestrador` | `criarDemandaSchema` ([cap. 03](03-demandas.md#rf-03-criar-demanda)) | 201 com a demanda |
| `GET /api/demandas` | pessoa, os 4 agentes | `status`, `tipo`, `linhaServicoProvavel`, `limit`, `offset` | lista e `total` |
| `POST /api/demandas/entrada` | pessoa | `entradaSchema` (`modo: manual` ou `agente`) | 201 `{ demanda }` no modo manual; 202 `{ entradaId }` no modo agente |
| `GET /api/demandas/:id` | pessoa, os 4 agentes | — | demanda com versões e `agentesEmAndamento` |
| `PATCH /api/demandas/:id` | pessoa | `alterarDemandaSchema` (campos e `status`) | demanda |
| `GET /api/demandas/:id/historico` | pessoa | — | eventos |
| `POST /api/demandas/:id/especificacoes` | pessoa, `insumo_tecnico` | `criarEspecificacaoSchema` | 201 com a ESP |
| `GET /api/demandas/:id/especificacoes` | pessoa, os 4 agentes | — | versões |
| `GET /api/especificacoes/:espId` | pessoa, os 4 agentes | — | ESP |
| `POST /api/demandas/:id/pareceres-risco` | pessoa, `risco` | `criarParecerRiscoSchema` | 201 com o RSK |
| `GET /api/demandas/:id/pareceres-risco` | pessoa, os 4 agentes | — | versões |
| `GET /api/pareceres-risco/:rskId` | pessoa, os 4 agentes | — | RSK |
| `POST /api/demandas/:id/pacotes-decisao` | pessoa, `consolidacao` | `criarPacoteDecisaoSchema` | 201 com o DEC |
| `GET /api/demandas/:id/pacotes-decisao` | pessoa, os 4 agentes | — | versões |
| `GET /api/pacotes-decisao` | pessoa, os 4 agentes | `statusDecisao`, `limit`, `offset` | lista |
| `GET /api/pacotes-decisao/:decId` | pessoa, os 4 agentes | — | DEC com `statusDecisao`, `desatualizado`, aprovadores |
| `PATCH /api/pacotes-decisao/:decId/decisao` | pessoa | `registrarDecisaoSchema` ([cap. 04](04-versoes-e-decisao.md#rf-13-decisão)) | DEC e resultado (`aprovada`, `aprovacao_parcial`, `devolvida`, `arquivada`) |
| `POST /api/pacotes-decisao/:decId/pedido-construcao` | pessoa | — | 200, arquivo `<decId>.json` ([cap. 05](05-pedido-de-construcao.md)) |
| `GET /api/agentes` | pessoa | — | os quatro agentes |
| `PATCH /api/agentes/:agente` | cto | `{ "ligado": boolean, "modelo"?: string }` | agente |
| `GET /api/configuracao/teto` | pessoa | — | situação do teto |
| `PUT /api/configuracao/teto` | cto | `{ "tetoMensal": "10,00" }` | situação do teto |

Sem status na coluna Resposta, a rota responde 200. Os testes de cada rota ficam ao lado dela
(`src/app/api/**/*.test.ts`).

## Exemplo: criar demanda com token de agente

```http
POST /api/demandas HTTP/1.1
Authorization: Bearer wsod_<token>
Content-Type: application/json

{ "titulo": "Corrigir importador de pedidos", "tipo": "bug", "solicitanteNome": "Pessoa Ficticia", "urgencia": "alta" }
```

## Exemplo: decisão recusada

```http
PATCH /api/pacotes-decisao/DEC-DEM-20261022-0001-v1/decisao HTTP/1.1
Cookie: wsod.session_token=<sessão>
Origin: <origem do BETTER_AUTH_URL>
Content-Type: application/json

{ "statusDecisao": "aprovada", "opcaoEscolhida": "A" }
```

```json
{ "erro": "conflito", "mensagem": "o pacote está desatualizado e não pode ser aprovado." }
```

## Exemplo: parecer de risco numa demanda encerrada

Vale igual para `POST .../especificacoes` e `POST .../pacotes-decisao`, pela pessoa e pelo token do agente. Nada é
gravado, e nenhum agente, aviso ou job é disparado ([cap. 04](04-versoes-e-decisao.md)).

```http
POST /api/demandas/DEM-20261103-0902/pareceres-risco HTTP/1.1
Authorization: Bearer wsod_<token>
Content-Type: application/json

{ "riscoTecnicoNivel": "baixo", "riscoOperacionalNivel": "baixo", "riscoJuridicoNivel": "baixo" }
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{ "erro": "conflito", "mensagem": "Esta demanda está em status final. Não aceita nova especificação, parecer de risco nem pacote de decisão." }
```

## Erros

Corpo de erro: `{ "erro": <código>, "mensagem": <texto em pt-BR> }`, mais `campos` (lista de `{ campo, mensagem }`),
`faltando` ou `erros` quando couber. Nunca leva mensagem do Postgres, do Drizzle nem o valor recebido.

| Código | Status | Quando |
|---|---|---|
| `entrada_invalida` | 400 | corpo ou query fora do schema; JSON inválido; DEC sem ESP ou RSK (`faltando`); cookie e token juntos |
| `nao_autenticado` | 401 | sem sessão nem token; token inválido ou revogado |
| `sem_permissao` | 403 | fora da matriz; `Origin` diferente; papel errado na decisão |
| `sem_2fa` | 403 | sessão de conta sem 2FA ativo |
| `nao_encontrado` | 404 | id fora do formato (sem consulta) ou inexistente |
| `metodo_nao_permitido` | 405 | método que a rota não tem |
| `conflito` | 409 | já decidido; não é o DEC mais novo; outro DEC aprovado; desatualizado; transição de status recusada; agente desligado; ESP, RSK ou DEC numa demanda `entregue` ou `encerrada` |
| `capacidade_de_ids_esgotada` | 409 | a sequência de ids de demanda passou de 9.999 |
| `corpo_grande` | 413 | corpo acima de 512 KB |
| `tipo_nao_suportado` | 415 | corpo que não é `application/json` |
| `nao_processavel` | 422 | pedido de `estudo`; dado pessoal no pedido; pedido recusado pelo `validarPedido` (`erros`) |
| `limite_excedido` | 429 | 30 demandas ou 60 versões por hora por ator; limite de login |
| `indisponivel` | 503 | serviço indisponível |
| `erro_interno` | 500 | qualquer erro que não é de domínio; mensagem genérica, sem detalhe |
