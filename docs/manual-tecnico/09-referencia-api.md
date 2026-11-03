# 09. Referência da API

| Campo | Valor |
|---|---|
| Atualizado em | 03/11/2026 (0.1.8: texto livre de ESP, RSK e DEC minimizado para o agente, na leitura e no 201; 0.1.7: texto livre minimizado e leituras de ESP, RSK e DEC sem nome de pessoa para o agente; 0.1.6: vista mínima do agente, 409 de decisão e de Pedido em demanda final) |
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
| `POST /api/demandas` | pessoa, `orquestrador` | `criarDemandaSchema` ([cap. 03](03-demandas.md#rf-03-criar-demanda)) | 201 com a demanda (ao agente, a vista mínima) |
| `GET /api/demandas` | pessoa, os 4 agentes | `status`, `tipo`, `linhaServicoProvavel`, `limit`, `offset` | lista e `total` |
| `POST /api/demandas/entrada` | pessoa | `entradaSchema` (`modo: manual` ou `agente`) | 201 `{ demanda }` no modo manual; 202 `{ entradaId }` no modo agente |
| `GET /api/demandas/:id` | pessoa, os 4 agentes | — | demanda com versões e `agentesEmAndamento`; ao agente, a vista mínima ([cap. 03](03-demandas.md#rf-06-consultar-e-alterar)) |
| `PATCH /api/demandas/:id` | pessoa | `alterarDemandaSchema` (campos e `status`) | demanda |
| `GET /api/demandas/:id/historico` | pessoa | — | eventos |
| `POST /api/demandas/:id/especificacoes` | pessoa, `insumo_tecnico` | `criarEspecificacaoSchema` | 201 com a ESP (ao agente, a vista mínima) |
| `GET /api/demandas/:id/especificacoes` | pessoa, os 4 agentes | — | versões |
| `GET /api/especificacoes/:espId` | pessoa, os 4 agentes | — | ESP |
| `POST /api/demandas/:id/pareceres-risco` | pessoa, `risco` | `criarParecerRiscoSchema` | 201 com o RSK (ao agente, a vista mínima) |
| `GET /api/demandas/:id/pareceres-risco` | pessoa, os 4 agentes | — | versões |
| `GET /api/pareceres-risco/:rskId` | pessoa, os 4 agentes | — | RSK |
| `POST /api/demandas/:id/pacotes-decisao` | pessoa, `consolidacao` | `criarPacoteDecisaoSchema` | 201 com o DEC (ao agente, a vista mínima) |
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

## Exemplo: ler demanda com token de agente

Desde a 0.1.6, a resposta não tem `solicitanteNome` nem `anexos`, e a autoria de pessoa vem sem o nome da conta. A
pessoa recebe os mesmos campos mais esses. Valores fictícios, resposta encurtada:

```http
GET /api/demandas/DEM-20261103-0901 HTTP/1.1
Authorization: Bearer wsod_<token>
```

```json
{
  "id": "DEM-20261103-0901",
  "titulo": "Pedidos do marketplace duplicados no ERP (fictício)",
  "tipo": "bug",
  "status": "em_analise",
  "responsavel": { "tipo": "pessoa" },
  "especificacoes": [{ "id": "ESP-DEM-20261103-0901-v1", "versao": 1, "autor": { "tipo": "agente", "agente": "insumo_tecnico" }, "rascunhoAgente": true }],
  "pareceresRisco": [],
  "pacotesDecisao": [],
  "agentesEmAndamento": []
}
```

Desde a 0.1.7 (M-1), os campos de texto livre (`titulo`, `contexto`, `descricaoProblema`, `justificativaUrgencia`,
`impactoPercebido` e cada item de `duvidasEntrada`) saem minimizados para o agente, na leitura, no 201 da criação e no
`titulo` da listagem `GET /api/demandas`. Um `contexto` gravado como `Falar com Maria Ficticia Teste,
maria.teste@exemplo.invalid, CPF 123.456.789-09, tel (11) 90000-0000` (fictício), com essa solicitante, sai como
`Falar com [nome removido], [e-mail removido], CPF [CPF removido], tel [telefone removido]`. A pessoa recebe o original.

Desde a 0.1.7 (M-2), nas leituras de ESP, RSK e DEC (as sete rotas `GET` da tabela acima), o agente recebe autor pessoa
como `{ "tipo": "pessoa" }`, cada aprovador só com `papel`, `opcao`, `registradaEm` e `dataDocumento`, e `decisao` sem
`decididaPor`.

Desde a 0.1.8 (M-a), essas sete leituras e o 201 dos três `POST` de criação (`.../especificacoes`,
`.../pareceres-risco` e `.../pacotes-decisao`) passam o texto livre pela mesma minimização da demanda, com o nome do
solicitante da demanda entre os trocados (na lista `GET /api/pacotes-decisao`, o de cada DEC):

- DEC: `demandaTitulo`, `demandaDescricao`, `resumoExecutivo`, `recomendacao`, `opcaoA` e `opcaoB` subcampo a subcampo
  (`descricao`, `vantagens`, `desvantagens`, `quandoEscolher`; subcampo ausente continua ausente),
  `decisao.comentarios` e as listas `criteriosAceitePreliminares` e `definicaoDePronto` da ESP citada;
- ESP: os 15 campos de texto e de lista (descrição, situação atual e desejada, escopo, sistemas, dados, restrições,
  dúvidas, critérios e definição de pronto);
- RSK: `resumo`, os três `risco*Comentario`, `recomendacoesMitigacao`, `preCondicoes` e
  `envolverJuridicoOuAdministradoraQuando`.

Campo nulo continua `null` e lista nula continua nula. Ids, `sistemaAlvo`, `repositorioDestino`, níveis,
`statusDecisao` e datas saem iguais para os dois atores. A pessoa recebe o original, e o Pedido de Construção
(`POST .../pedido-construcao`) continua gerado com o texto original. Limite: só o nome atual e completo do solicitante é
trocado (M-1 da revisão do 0009, risco residual; [CHANGELOG](../../CHANGELOG.md)).

## Exemplo: decidir ou gerar o Pedido numa demanda em status final

Desde a 0.1.6, numa demanda `entregue` ou `encerrada`, o `PATCH .../decisao` e o `POST .../pedido-construcao` da pessoa
respondem 409, sem gravar nada ([cap. 04](04-versoes-e-decisao.md#rf-13-decisão), [cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)):

```http
PATCH /api/pacotes-decisao/DEC-DEM-20261103-0902-v1/decisao HTTP/1.1
Cookie: wsod.session_token=<sessão>
Origin: <origem do BETTER_AUTH_URL>
Content-Type: application/json

{ "statusDecisao": "aprovada", "opcaoEscolhida": "A" }
```

```json
{ "erro": "conflito", "mensagem": "a demanda está em status final; o pacote não pode mais ser decidido." }
```

No `POST /api/pacotes-decisao/:decId/pedido-construcao`, a mensagem é "a demanda está em status final; o pacote não
gera mais Pedido de Construção.", sem `content-disposition` nem evento `pedido_gerado`.

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
| `conflito` | 409 | já decidido; não é o DEC mais novo; outro DEC aprovado; desatualizado; transição de status recusada; agente desligado; ESP, RSK ou DEC numa demanda `entregue` ou `encerrada`; decidir DEC ou gerar Pedido numa demanda `entregue` ou `encerrada` |
| `capacidade_de_ids_esgotada` | 409 | a sequência de ids de demanda passou de 9.999 |
| `corpo_grande` | 413 | corpo acima de 512 KB |
| `tipo_nao_suportado` | 415 | corpo que não é `application/json` |
| `nao_processavel` | 422 | pedido de `estudo`; dado pessoal no pedido; pedido recusado pelo `validarPedido` (`erros`) |
| `limite_excedido` | 429 | 30 demandas ou 60 versões por hora por ator; limite de login |
| `indisponivel` | 503 | serviço indisponível |
| `erro_interno` | 500 | qualquer erro que não é de domínio; mensagem genérica, sem detalhe |
