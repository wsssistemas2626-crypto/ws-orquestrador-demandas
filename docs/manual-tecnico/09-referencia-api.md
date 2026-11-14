# 09. Referência da API

| Campo | Valor |
|---|---|
| Atualizado em | 14/11/2026 (0.4.1: rota `GET /api/pedidos-construcao/:decId/situacao`, com exemplo; 403 nas cinco rotas do `/construir`; textos revistos dos 409 do DEC substituído e do S-01; o status depois de arquivar, no `PATCH .../decisao`; 404 da situação na tabela de erros); 13/11/2026 (0.4.0: rota `POST /api/pedidos-construcao/:decId/andamento`, com exemplo; `andamento` na leitura de pessoa e, como sétima chave, na do Awave; 422, 409 e 429 do andamento na tabela de erros); 12/11/2026 (0.3.1: 404 ao agente na demanda do Awave não confirmada e nos artefatos dela, fora das listas; 409 do recebimento para hash que não é o da última entrega; 503 também pelo prazo total); 12/11/2026 (0.3.0: integrações `awave` e `construir` na autenticação e nas rotas, filtro `origem`, as três rotas de `/api/pedidos-construcao`, exemplos das integrações, 429 do Awave, 409 do recebimento e 503 `indisponivel` das integrações); 10/11/2026 (0.1.13: `substituido` e `substituidoPor` nas leituras de DEC, 409 do DEC substituído no `POST .../pedido-construcao` e 409 do S-01 no `PATCH .../decisao`; saiu o 409 da A-02); 04/11/2026 (0.1.12: corpo com a confirmação e recusa com o nome do solicitante no `POST .../pedido-construcao`); 04/11/2026 (0.1.11: nome grudado em número, `_` ou CamelCase trocado para o agente; 500 `erro_interno` também para erro que lança ao ser lido); 04/11/2026 (0.1.10: partes do nome do solicitante trocadas para o agente e nomes do 201 tirados da demanda travada nos três `POST`); 04/11/2026 (0.1.9: nomes lidos antes de gravar nos três `POST` de criação); 03/11/2026 (0.1.8: texto livre de ESP, RSK e DEC minimizado para o agente, na leitura e no 201; 0.1.7: texto livre minimizado e leituras de ESP, RSK e DEC sem nome de pessoa para o agente; 0.1.6: vista mínima do agente, 409 de decisão e de Pedido em demanda final) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Fontes no código | `src/app/api/**/route.ts` (desde a 0.3.0, também `src/app/api/pedidos-construcao/`; desde a 0.4.1, `src/app/api/pedidos-construcao/[decId]/situacao/route.ts`), `src/lib/rota.ts`, `src/lib/erros.ts`, `src/modules/acesso/matriz.ts`, `src/modules/integracoes/tempo-limite.ts` |
| Uso | interno; documento não publicável fora da empresa sem aprovação de Fabiano |

Base: a origem do `BETTER_AUTH_URL`. Toda rota abaixo, menos `/api/auth/*` e `/api/saude`, passa por `rota(...)`
([cap. 02](02-acesso-e-seguranca.md#proteção-das-rotas)).

## Autenticação

- **Pessoa:** cookie de sessão do Better Auth (`wsod.session_token`, ou `__Secure-wsod.session_token` em https), com
  2FA ativo. Em `POST`, `PATCH`, `PUT` e `DELETE`, mande `Origin` igual à do `BETTER_AUTH_URL` e
  `Content-Type: application/json`.
- **Agente:** `Authorization: Bearer wsod_<token>`. Não mande cookie junto.
- **Integração** (desde a 0.3.0): `Authorization: Bearer wsod_<token>` com o token da integração `awave` ou
  `construir`, sem cookie e sem `Origin` ([cap. 02](02-acesso-e-seguranca.md#atores-de-integração-030)). Token
  revogado, inexistente ou fora do formato: 401 "Token de serviço inválido ou revogado.".

## Rotas

"Pessoa" é qualquer papel com 2FA; "cto" é só a conta de papel `cto`.

| Método e rota | Quem | Corpo ou query | Resposta |
|---|---|---|---|
| `GET /api/saude` | público | — | 200 `{"status":"ok"}` ou 503 `{"status":"indisponivel"}` |
| `/api/auth/*` | público | Better Auth (login, 2FA) | — |
| `POST /api/demandas` | pessoa, `orquestrador`, `awave` (desde a 0.3.0) | `criarDemandaSchema` ([cap. 03](03-demandas.md#rf-03-criar-demanda)) | 201 com a demanda (ao agente, a vista mínima; ao Awave, as seis chaves e, desde a 0.4.0, a sétima, `andamento: null`, [cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030)) |
| `GET /api/demandas` | pessoa, os 4 agentes | `status`, `tipo`, `linhaServicoProvavel`, `origem` (`pessoa`, `agente` ou `awave`, desde a 0.3.0), `limit`, `offset` | lista e `total`; cada item com `origem` desde a 0.3.0 |
| `POST /api/demandas/entrada` | pessoa | `entradaSchema` (`modo: manual` ou `agente`) | 201 `{ demanda }` no modo manual; 202 `{ entradaId }` no modo agente |
| `GET /api/demandas/:id` | pessoa, os 4 agentes, `awave` (só a que ele criou, desde a 0.3.0) | — | demanda com versões e `agentesEmAndamento` e, desde a 0.4.0, `andamento` (seis campos ou `null`); ao agente, a vista mínima, sem `andamento` ([cap. 03](03-demandas.md#rf-06-consultar-e-alterar)); ao Awave, as seis chaves e, desde a 0.4.0, `andamento` com quatro campos ou `null`, e 404 para demanda de outro autor |
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
| `GET /api/pacotes-decisao/:decId` | pessoa, os 4 agentes | — | DEC com `statusDecisao`, `desatualizado`, `substituido` e `substituidoPor` (desde a 0.1.13), aprovadores |
| `PATCH /api/pacotes-decisao/:decId/decisao` | pessoa | `registrarDecisaoSchema` ([cap. 04](04-versoes-e-decisao.md#rf-13-decisão)) | DEC e resultado (`aprovada`, `aprovacao_parcial`, `devolvida`, `arquivada`); desde a 0.4.1, o status da demanda depois de `arquivada` segue o aprovado vigente ([cap. 04](04-versoes-e-decisao.md#arquivar-o-dec-mais-novo-041)) |
| `POST /api/pacotes-decisao/:decId/pedido-construcao` | pessoa | `{ "confirmaSemDadoPessoal": true }` (`confirmacaoDoPedidoSchema`, desde a 0.1.12) | 200, arquivo `<decId>.json` ([cap. 05](05-pedido-de-construcao.md)) |
| `GET /api/agentes` | pessoa | — | os quatro agentes |
| `PATCH /api/agentes/:agente` | cto | `{ "ligado": boolean, "modelo"?: string }` | agente |
| `GET /api/configuracao/teto` | pessoa | — | situação do teto |
| `PUT /api/configuracao/teto` | cto | `{ "tetoMensal": "10,00" }` | situação do teto |
| `GET /api/pedidos-construcao/pendentes` | `construir` (desde a 0.3.0) | — | `{ "itens": [{ "decId": … }] }`, do pedido gerado mais antigo para o mais novo ([cap. 05](05-pedido-de-construcao.md#pendentes-listar_pedidos_pendentes)) |
| `POST /api/pedidos-construcao/:decId/entrega` | `construir` (desde a 0.3.0) | sem corpo e sem `content-type` | o JSON do Pedido de Construção, os mesmos bytes da geração ([cap. 05](05-pedido-de-construcao.md#entrega-entregar_pedido)) |
| `POST /api/pedidos-construcao/:decId/recebimento` | `construir` (desde a 0.3.0) | `{ "sha256": "<64 hexadecimais minúsculos>" }` | 204 sem corpo ([cap. 05](05-pedido-de-construcao.md#recebimento-confirmar_recebimento_pedido)) |
| `POST /api/pedidos-construcao/:decId/andamento` | `construir` (desde a 0.4.0) | exatamente `{ "fase", "tarefasProntas", "tarefasTotal", "status" }` (`corpoAndamentoSchema`) | 204 sem corpo; 404, 409, 422, 429 e 503 ([cap. 05](05-pedido-de-construcao.md#andamento-da-construção-040)) |
| `GET /api/pedidos-construcao/:decId/situacao` | `construir` (desde a 0.4.1) | — | `{ "situacao": "vigente" }` ou `{ "situacao": "substituido" }`; 404 e 503 ([cap. 05](05-pedido-de-construcao.md#situação-do-pedido-041)) |

Desde a 0.3.1, para os quatro agentes, a demanda do Awave que nenhuma pessoa confirmou não existe. Ela e a ESP, o RSK
e o DEC dela respondem o mesmo 404 da demanda inexistente, nas leituras por id, nas três listas de versões e nos três
`POST` de criação. Nos `POST`, o 404 vem antes do 409 de status final e do 429 do limite. `GET /api/demandas` e
`GET /api/pacotes-decisao` não as trazem, nem no `total`. Depois da confirmação por pessoa, a tabela vale como está
([cap. 03](03-demandas.md#demanda-aberta-pelo-awave-030)).

Sem status na coluna Resposta, a rota responde 200. Fora da coluna Quem, 403: a integração `awave` recebe 403 em toda
rota que não é `POST /api/demandas` nem `GET /api/demandas/:id`, e pessoa, agentes e `awave` recebem 403 nas cinco
rotas de `/api/pedidos-construcao` (três desde a 0.3.0, a do andamento desde a 0.4.0 e a da situação desde a 0.4.1). Os testes de cada rota ficam ao lado dela
(`src/app/api/**/*.test.ts`).

## Exemplo: criar demanda com token de agente

```http
POST /api/demandas HTTP/1.1
Authorization: Bearer wsod_<token>
Content-Type: application/json

{ "titulo": "Corrigir importador de pedidos", "tipo": "bug", "solicitanteNome": "Pessoa Ficticia", "urgencia": "alta" }
```

## Exemplo: o Awave cria e lê uma demanda

Desde a 0.3.0. O corpo é o da tool do Awave, sem `Origin`. Pela rede interna do Easypanel, o `Host` é o do serviço
`app` ([docs/operacao/tokens-de-integracao.md](../operacao/tokens-de-integracao.md#token-awave)).

```http
POST /api/demandas HTTP/1.1
Host: orquestrador_app
Authorization: Bearer wsod_<token da integração awave>
Content-Type: application/json

{ "titulo": "Relatório semanal montado à mão (fictício)", "tipo": "melhoria", "solicitanteNome": "Awave", "solicitantePapel": "outro", "descricaoProblema": "O relatório é montado à mão a partir de três planilhas.", "contexto": "Demanda aberta por um agente do Awave, com a aprovação do dono." }
```

Resposta 201, só com as seis chaves da 0.3.0 e, desde a 0.4.0, a sétima, `andamento`, que no 201 é sempre `null`:

```json
{ "id": "DEM-20261112-0042", "titulo": "Relatório semanal montado à mão (fictício)", "tipo": "melhoria", "status": "nova", "criadaEm": "2026-11-12T13:00:00.000Z", "atualizadaEm": "2026-11-12T13:00:00.000Z", "andamento": null }
```

- A 11ª demanda em 60 minutos recebe 429
  `{ "erro": "limite_excedido", "mensagem": "Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde." }`.
- `GET /api/demandas/DEM-20261112-0042` com o mesmo token devolve as mesmas sete chaves. Uma demanda de outro autor
  devolve o mesmo 404 de uma demanda que não existe.
- Quando o `/construir` já informou o andamento da construção da demanda, a sétima chave vem com quatro campos, sem a
  situação da construção nem o DEC:

  ```json
  { "andamento": { "fase": "construindo", "tarefasProntas": 9, "tarefasTotal": 17, "atualizadoEm": "2026-11-13T10:20:00.000Z" } }
  ```
- O título volta minimizado: a palavra "Awave" escrita nele sai "[nome removido]" (QF-0016-01). O exemplo acima não
  a tem.

## Exemplo: o /construir busca um pedido

Desde a 0.3.0, pelo domínio público em https, sem `Origin`:

```http
GET /api/pedidos-construcao/pendentes HTTP/1.1
Authorization: Bearer wsod_<token da integração construir>
```

```json
{ "itens": [{ "decId": "DEC-DEM-20261112-0007-v1" }] }
```

```http
POST /api/pedidos-construcao/DEC-DEM-20261112-0007-v1/entrega HTTP/1.1
Authorization: Bearer wsod_<token da integração construir>
```

A resposta 200 é o arquivo do Pedido de Construção, igual byte a byte ao que a T11 gera
([cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)). Depois de gravar o arquivo, o `/construir` confirma com
o SHA-256 dele:

```http
POST /api/pedidos-construcao/DEC-DEM-20261112-0007-v1/recebimento HTTP/1.1
Authorization: Bearer wsod_<token da integração construir>
Content-Type: application/json

{ "sha256": "<SHA-256 do arquivo, 64 hexadecimais minúsculos>" }
```

Resposta 204. Com outro hash, inclusive o de uma entrega anterior do mesmo DEC (desde a 0.3.1, só o hash da última
entrega confirma):

```json
{ "erro": "conflito", "mensagem": "O SHA-256 enviado não confere com o pedido entregue. Busque o pedido de novo." }
```

Desde a 0.3.1, cada transação das integrações tem prazo total: 8 s, e 12 s na entrega, contando a espera por conexão.
Passou do prazo: 503 `indisponivel` e nada gravado ([Erros](#erros)).

## Exemplo: o /construir informa o andamento

Desde a 0.4.0, pelo domínio público em https, sem `Origin`, só com o token da integração `construir`
([cap. 05](05-pedido-de-construcao.md#andamento-da-construção-040)):

```http
POST /api/pedidos-construcao/DEC-DEM-20261112-0007-v1/andamento HTTP/1.1
Authorization: Bearer wsod_<token da integração construir>
Content-Type: application/json

{ "fase": "construindo", "tarefasProntas": 9, "tarefasTotal": 17, "status": "em_construcao" }
```

Resposta 204, sem corpo. O mesmo corpo de novo responde 204 sem gravar nada. Com uma chave a mais, uma fase fora da
lista ou `tarefasProntas` maior que `tarefasTotal`, a resposta é 422, antes de olhar o DEC:

```json
{ "erro": "nao_processavel", "mensagem": "Andamento fora do formato. Envie só fase, tarefasProntas, tarefasTotal e status, com fase e status da lista e 0 ≤ tarefasProntas ≤ tarefasTotal ≤ 999." }
```

- DEC inexistente, ou sem Pedido de Construção gerado por pessoa no painel: o mesmo 404 nos dois casos.
- DEC substituído por um aprovado mais novo:
  `{ "erro": "conflito", "mensagem": "O pacote deste pedido foi substituído por um aprovado mais novo. O andamento não foi registrado: envie o do pedido novo." }`.
- `em_construcao` ou `cancelado` numa demanda já `entregue`, ou `em_construcao` ou `construido` numa demanda já
  `encerrada`: `{ "erro": "conflito", "mensagem": "A demanda deste pedido já está em um status final e não aceita este andamento. Nada foi registrado." }`.
- A 61ª gravação do mesmo DEC numa hora, ou a 601ª do `/construir`: 429 `limite_excedido`.

## Exemplo: o /construir consulta a situação do pedido

Desde a 0.4.1, pelo domínio público em https, sem `Origin`, só com o token da integração `construir`
([cap. 05](05-pedido-de-construcao.md#situação-do-pedido-041)). Valores fictícios: na demanda `DEM-20261112-0007`, o
v1 foi aprovado e gerado, e depois o v2 foi aprovado.

```http
GET /api/pedidos-construcao/DEC-DEM-20261112-0007-v1/situacao HTTP/1.1
Authorization: Bearer wsod_<token da integração construir>
```

```json
{"situacao":"substituido"}
```

A mesma chamada para o v2, depois de gerado o pedido dele, responde `{"situacao":"vigente"}`. A resposta tem só essa
chave. DEC inexistente, ou sem Pedido de Construção gerado por pessoa no painel, recebe o mesmo 404 nos dois casos:

```json
{ "erro": "nao_encontrado", "mensagem": "Confira o endereço ou o id. A demanda, a versão ou o pacote podem não existir." }
```

A situação só informa. `vigente` não quer dizer que a entrega vai aceitar: o DEC desatualizado e o de demanda em status
final respondem `vigente`, e a entrega os recusa com 409.

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
(`POST .../pedido-construcao`) continua gerado com o texto original. Desde a 0.1.12, ele é recusado quando esse texto
tem o nome do solicitante ([Exemplo: gerar o Pedido de Construção](#exemplo-gerar-o-pedido-de-construção)).

Desde a 0.1.10 (M-1 da revisão do 0009), a troca pega também cada parte do nome do solicitante que, no texto, começa
por maiúscula, nessas leituras, no 201 e na leitura da demanda. Com a solicitante `Joana Ficticia` (fictícia), um
`contexto` gravado como `A Joana pediu o relatório mensal.` sai para o agente como
`A [nome removido] pediu o relatório mensal.`. Desde a 0.1.11, também a parte grudada em número, `_` ou CamelCase:
`A Joana2 e @JoanaFicticia` sai `A [nome removido]2 e @[nome removido][nome removido]`. A regra e o que sobra (parte
em minúscula, nome todo em maiúscula sem separador, parte curta grudada a outra que começa por ela, nome antigo e nome
de outras pessoas) estão no [cap. 06](06-agentes-de-ia.md#rf-20-minimização).

Desde a 0.1.10 (B-3 da revisão do 0010), os nomes do 201 dos três `POST` vêm da linha da demanda travada, na mesma
transação da gravação. Uma renomeação no meio do `POST` não sai em claro. Se essa conta falhar, a resposta é 500
`erro_interno` e nada fica gravado (desde a 0.1.9), então repetir o `POST` cria uma versão só. Os outros códigos não
mudam ([cap. 04](04-versoes-e-decisao.md)).

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

No `POST /api/pacotes-decisao/:decId/pedido-construcao` (com a confirmação, desde a 0.1.12), a mensagem é "a demanda
está em status final; o pacote não gera mais Pedido de Construção.", sem `content-disposition` nem evento
`pedido_gerado`.

## Exemplo: gerar o Pedido de Construção

Desde a 0.1.12 (D3 do 0013), o corpo leva a confirmação de que título, descrição, ESP e parecer de risco não têm dado
pessoal de ninguém ([cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)). Valores fictícios:

```http
POST /api/pacotes-decisao/DEC-DEM-20261103-0901-v1/pedido-construcao HTTP/1.1
Cookie: wsod.session_token=<sessão>
Origin: <origem do BETTER_AUTH_URL>
Content-Type: application/json

{ "confirmaSemDadoPessoal": true }
```

Aceito: 200, com o JSON do pedido e `content-disposition: attachment; filename="DEC-DEM-20261103-0901-v1.json"`.

Sem o campo (`{}`) ou com `false`, a resposta é 422, antes de qualquer consulta, também para DEC que não existe:

```json
{ "erro": "nao_processavel", "mensagem": "Confirme que o título, a descrição, a ESP e o parecer de risco não têm dado pessoal de ninguém. Nada foi entregue." }
```

Com o campo de outro tipo (`"true"`, `1`), JSON inválido ou sem corpo, 400 `entrada_invalida`. Chave a mais é
descartada.

Com a solicitante fictícia `Joana Ficticia`, um título `Pedido da Joana Ficticia` e `contato@exemplo.test` na ESP, a
resposta é um 422 só, com a lista do C-28 primeiro e depois a do nome (D1 do 0013), sem os valores:

```json
{
  "erro": "nao_processavel",
  "mensagem": "O pedido não passou na validação do /construir. Nada foi entregue.",
  "erros": ["especificacao.conteudo: e-mail", "demanda.titulo: nome"]
}
```

Nos dois 422, nada é entregue e nenhum evento é gravado. O 403 do token de agente vem antes da confirmação.

## Exemplo: DEC substituído

Desde a 0.1.13, aprovar o DEC mais novo com outro DEC da demanda já aprovado dá 200, e o anterior passa a ser
substituído ([cap. 04](04-versoes-e-decisao.md#substituição-do-dec-aprovado)). Valores fictícios: na demanda
`DEM-20261110-0901`, o v1 foi aprovado e depois o v2. A leitura do v1, resposta encurtada:

```http
GET /api/pacotes-decisao/DEC-DEM-20261110-0901-v1 HTTP/1.1
Authorization: Bearer wsod_<token>
```

```json
{ "id": "DEC-DEM-20261110-0901-v1", "statusDecisao": "aprovada", "desatualizado": false, "substituido": true, "substituidoPor": "DEC-DEM-20261110-0901-v2" }
```

O v2 tem `"substituido": false` e `"substituidoPor": null`. Os dois campos saem iguais para a pessoa e para o agente.
Gerar o Pedido do v1 (`POST .../DEC-DEM-20261110-0901-v1/pedido-construcao`, com a confirmação) dá 409, sem
`content-disposition` nem evento:

```json
{ "erro": "conflito", "mensagem": "o pacote foi substituído por DEC-DEM-20261110-0901-v2, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção." }
```

Se o v1 tivesse sido aprovado no nível `cto_e_administradora` e o v2 fosse de nível `cto`, a aprovação do v2 pela `cto`
(`PATCH .../DEC-DEM-20261110-0901-v2/decisao`) daria 409, sem gravar nada (S-01):

```json
{ "erro": "conflito", "mensagem": "o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora." }
```

Os dois textos foram revistos pela `ux-ui-design` na 0.4.1.

Se o v2 estivesse pendente e fosse **arquivado**, com o v1 aprovado e atualizado e a demanda em `pronta_para_decisao`, o `PATCH .../DEC-DEM-20261110-0901-v2/decisao`
com `{ "statusDecisao": "arquivada" }` daria 200 e, desde a 0.4.1, a demanda ficaria em `aprovada`, com o v1 ainda
gerando o pedido (até a 0.4.0, ia a `encerrada`; [cap. 04](04-versoes-e-decisao.md#arquivar-o-dec-mais-novo-041)).

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
| `nao_autenticado` | 401 | sem sessão nem token; token de agente ou de integração inválido ou revogado |
| `sem_permissao` | 403 | fora da matriz; `Origin` diferente; papel errado na decisão |
| `sem_2fa` | 403 | sessão de conta sem 2FA ativo |
| `nao_encontrado` | 404 | id fora do formato (sem consulta) ou inexistente; desde a 0.3.1, para agente, também a demanda do Awave não confirmada e a ESP, o RSK e o DEC dela, com o mesmo corpo; desde a 0.4.0, o andamento de DEC sem Pedido de Construção gerado por pessoa, igual ao do DEC inexistente; desde a 0.4.1, a situação do pedido nos mesmos casos |
| `metodo_nao_permitido` | 405 | método que a rota não tem |
| `conflito` | 409 | confirmar demanda que não é do Awave ou em status final (painel, desde a 0.3.0); recebimento de pedido nunca entregue ou com SHA-256 que não confere (desde a 0.3.0; desde a 0.3.1, que não é o da última entrega); já decidido; não é o DEC mais novo; DEC só do CTO sobre um aprovado vigente de dupla aprovação (S-01, desde a 0.1.13; até a 0.1.12, qualquer outro DEC aprovado, A-02); desatualizado; Pedido de DEC substituído (desde a 0.1.13); transição de status recusada; agente desligado; ESP, RSK ou DEC numa demanda `entregue` ou `encerrada`; decidir DEC ou gerar Pedido numa demanda `entregue` ou `encerrada`; desde a 0.4.0, andamento de DEC substituído e andamento que contradiz o status final da demanda |
| `capacidade_de_ids_esgotada` | 409 | a sequência de ids de demanda passou de 9.999 |
| `corpo_grande` | 413 | corpo acima de 512 KB |
| `tipo_nao_suportado` | 415 | corpo que não é `application/json` |
| `nao_processavel` | 422 | pedido de `estudo`; pedido sem a confirmação `confirmaSemDadoPessoal: true` (desde a 0.1.12); dado pessoal no pedido, inclusive o nome do solicitante desde a 0.1.12 (`erros`); pedido recusado pelo `validarPedido` (`erros`); desde a 0.4.0, corpo do andamento fora do formato, sem `campos` e sem eco, antes de qualquer consulta |
| `limite_excedido` | 429 | 30 demandas ou 60 versões por hora por ator; 10 demandas por hora para o Awave (desde a 0.3.0); 60 gravações de andamento por DEC e 600 no total por hora para o `/construir` (desde a 0.4.0); limite de login |
| `indisponivel` | 503 | serviço indisponível; desde a 0.3.0, também a transação de uma integração que passou do tempo limite (desde a 0.3.1, também do prazo total de 8 s, ou 12 s na entrega, contando a espera por conexão), com "O Orquestrador não concluiu o pedido a tempo e nada foi gravado. Tente de novo em alguns minutos." e nada gravado |
| `erro_interno` | 500 | qualquer erro que não é de domínio; mensagem genérica, sem detalhe. Desde a 0.1.11, também o erro que lança ao ser lido (getter ou Proxy), com os cabeçalhos da rota, a linha do log e o evento no Sentry ([cap. 02](02-acesso-e-seguranca.md#proteção-das-rotas)) |
