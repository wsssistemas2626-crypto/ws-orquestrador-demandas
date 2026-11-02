---
pedido: DEC-DEM-20261022-0001-v1
etapa: 01-requisitos
agente: analista-requisitos
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 2026-10-15_orquestrador-demandas_spec-original.md, 2026-10-15_orquestrador-demandas_ajustes.md, 2026-10-15-construcao-autonoma-design.md, pedido.mjs]
status: pronto
proximo: arquiteto-solucoes
devolvido_para: null
---
## Entrega

Requisitos do WS Orquestrador de Demandas, versão 0.1.0. Fontes, em ordem de precedência: ESP-DEM-20261022-0001-v1 e
RSK-DEM-20261022-0001-v1 (no `pedido.json`), `padrao-tecnico.md`, os ajustes de 15/10 e a spec original de 15/10 (os
dois em `pedidos/insumos/` da estruturaAutonoma, citados na descrição da demanda). Onde a spec original diverge dos
ajustes ou do padrão, valem os ajustes e o padrão. "Seção N da spec original" se refere ao arquivo
`2026-10-15_orquestrador-demandas_spec-original.md`; "seção 3.1 do /construir" se refere a
`docs/superpowers/specs/2026-10-15-construcao-autonoma-design.md`.

### 1. Glossário

| Termo | Significado neste sistema |
|---|---|
| Demanda (DEM) | Pedido de trabalho técnico: bug, melhoria, novo_projeto, estudo ou produto_proprio. É mutável, e cada mudança fica no histórico |
| Especificação técnica (ESP) | Versão imutável do detalhamento técnico de uma demanda. `ESP-<demandaId>-vN` |
| Parecer de risco (RSK) | Versão imutável da análise de risco técnico, operacional e jurídico. `RSK-<demandaId>-vN` |
| Pacote de decisão (DEC) | Versão imutável que cita uma ESP e um RSK e descreve as opções A e B para a decisão humana. `DEC-<demandaId>-vN` |
| Rascunho de agente | ESP, RSK, DEC ou campos de demanda gravados por um agente de IA. Uma pessoa revisa antes de a decisão valer (RF-13). A spec original e o RSK chamam isso de "v0"; a numeração gravada começa em v1 |
| DEC desatualizado | DEC cuja demanda já tem uma ESP ou um RSK com número de versão **maior** que o citado no DEC |
| Decisão | Registro humano sobre um DEC: `aprovada`, `devolvida` ou `arquivada`, com a opção escolhida quando aprovada |
| `devolvida` (decisão) | O decisor mandou o DEC de volta para refazer a análise. **Não** é o status `devolvida` da demanda |
| `devolvida` (status da demanda) | A construção devolveu a demanda depois de aprovada (ajustes B.2). Mudado à mão nesta versão |
| Texto bruto | O texto colado na entrada (e-mail, mensagem, formulário) e os metadados de origem. É dado pessoal de terceiro |
| Pessoa | Usuário humano autenticado por sessão do Better Auth com 2FA (TOTP) ativo |
| Agente | Um dos quatro agentes de IA (orquestrador, insumo_tecnico, risco, consolidacao), identificado por token de serviço ou pelo job que o executa |
| Teto de gasto | Valor máximo do custo de IA no mês civil (fuso America/Sao_Paulo), gravado no banco |
| Pedido de Construção | JSON no formato da seção 3.1 do /construir, gerado a partir de um DEC aprovado |

### 2. Requisitos funcionais

Cada RF traz a regra de negócio (RN) e os critérios de aceite (CA). Os critérios usam só dado fictício. Os códigos
HTTP valem para as rotas `src/app/api/...`; o caminho exato das rotas fica com o `arquiteto-solucoes`, mantendo os
recursos da seção 5 da spec original.

#### RF-01. Autenticação de pessoa com 2FA obrigatório

RN: toda rota de pessoa e toda tela do painel, exceto login e configuração do 2FA, exigem sessão do Better Auth com
TOTP ativo e verificado na sessão. Não há cadastro público: a conta é criada por script em `scripts/`. Cada conta tem
um papel: `cto` ou `administradora`.

- CA-01.1. Dado uma pessoa com conta e 2FA ativo, quando ela informa senha e código TOTP válidos, então entra no painel.
- CA-01.2. Dado uma pessoa com senha correta e sem 2FA ativo, quando tenta abrir a fila de demandas ou chamar
  `GET /demandas`, então é levada à configuração do 2FA no painel e a API responde 403.
- CA-01.3. Dado uma requisição sem sessão nem token, quando chama qualquer rota da API exceto a de saúde, então recebe 401.
- CA-01.4. Dado o painel no ar, quando alguém procura uma tela ou rota de cadastro de usuário, então ela não existe (404).

#### RF-02. Token de serviço para agentes e separação de rotas

RN: cada agente tem um token de serviço próprio, guardado só como hash, criado por script e exibido uma única vez. O
token só é aceito nas rotas de agente: criar demanda, ESP, RSK e DEC, e ler demanda, ESP, RSK e DEC. Rotas só de
pessoa: decisão, mudança manual de status da demanda, ligar e desligar agente, teto de gasto, pedido de construção,
expurgo manual (se houver). Sessão de pessoa não substitui token em rota exclusiva de agente, e vice-versa.

- CA-02.1. Dado um token de serviço válido do agente risco, quando chama `PATCH /pacotes-decisao/:id/decisao`, então
  recebe 403 e nada muda no DEC nem no histórico de decisão.
- CA-02.2. Dado um token de serviço válido, quando chama a rota de ligar agente, a de teto, a de status da demanda ou
  a do pedido de construção, então recebe 403 em cada uma.
- CA-02.3. Dado um token inválido ou revogado, quando chama uma rota de agente, então recebe 401.
- CA-02.4. Dado um artefato criado com o token do agente insumo_tecnico, quando se consulta o histórico, então o ator
  aparece como agente `insumo_tecnico`, não como pessoa.
- CA-02.5. Dado o banco após a criação de um token, quando se lê a tabela de tokens, então o valor do token não
  aparece em claro.

#### RF-03. Criar demanda (painel e API)

RN: campos da seção 3.1 e do body de `POST /demandas` da spec original. Obrigatórios: `titulo`, `solicitanteNome`,
`tipo`. Enumerações: `tipo` (bug, melhoria, novo_projeto, estudo, produto_proprio), `solicitantePapel` (operacoes,
financeiro, produto, outro), `linhaServicoProvavel` (sob_medida, automacao_integracao, ia_controle_humano,
diagnostico_sustentacao, indefinida), `urgencia` (baixa, media, alta). `anexos` é lista de referências
`{tipo: url|arquivo, referencia, descricao}`, sem upload de arquivo. O sistema gera `id` e `status = nova`. Entrada
validada por Zod; erro sem detalhe interno.

- CA-03.1. Dado uma pessoa autenticada com 2FA, quando envia `POST /demandas` com título, solicitante e tipo válidos,
  então recebe 201 com `id` no formato `DEM-AAAAMMDD-NNNN` e `status: nova`.
- CA-03.2. Dado uma pessoa autenticada com 2FA no painel, quando preenche o formulário de nova demanda e salva, então a
  demanda aparece na fila com o id gerado.
- CA-03.3. Dado um body com `tipo: "outro"` ou sem `titulo`, quando chama `POST /demandas`, então recebe 400 com a lista
  dos campos inválidos, sem pilha de erro, SQL ou nome de tabela.

#### RF-04. Identificador da demanda

RN: `DEM-<AAAAMMDD>-<NNNN>`. A data é a da criação no fuso America/Sao_Paulo; `NNNN` vem de uma sequência **global**
(não reinicia por dia), com 4 dígitos e zeros à esquerda. O comentário de "sequencial diário" da spec original não
vale. ESP, RSK e DEC usam `<prefixo>-<demandaId>-v<N>`, com N começando em 1 e calculado como o maior da demanda + 1.

- CA-04.1. Dado o relógio injetado em 22/10/2026 23h30 em America/Sao_Paulo e a sequência em 41, quando se cria uma
  demanda, então o id é `DEM-20261022-0042`.
- CA-04.2. Dado uma demanda criada em 22/10 com sequência 7, quando se cria outra em 23/10, então o id termina em `-0008`.
- CA-04.3. Dado duas criações simultâneas de ESP para a mesma demanda, quando as duas terminam, então uma é v1 e a outra
  v2, sem erro de duplicidade para o usuário e sem número repetido.
- CA-04.4. Dado a sequência em 9999, quando se tenta criar a próxima demanda, então a API responde com erro claro e não
  grava id fora do formato (ver RNF-09).

#### RF-05. Entrada de demanda colando o texto

RN: a tela de entrada recebe o texto bruto colado, o nome e o papel do solicitante e, opcionalmente, metadados de
origem (canal, referência). O texto bruto é gravado separado dos campos estruturados, com a data de recebimento.
Com o agente orquestrador ligado, um job propõe os campos da demanda (saída da seção 7.1 da spec original) e a demanda
é criada como rascunho de agente. Com ele desligado, a pessoa preenche os mesmos campos na mesma tela. Texto bruto
acima do limite da RNF-04 é recusado.

- CA-05.1. Dado o agente orquestrador desligado, quando a pessoa cola um texto fictício, preenche título, solicitante e
  tipo e salva, então a demanda é criada com o texto bruto associado e nenhum job de IA é enfileirado.
- CA-05.2. Dado o agente orquestrador ligado e o provedor falso devolvendo uma saída válida, quando a pessoa cola o
  texto e envia, então uma demanda é criada com `responsavel` agente orquestrador e o histórico registra o agente.
- CA-05.3. Dado um texto com mais caracteres que o limite da RNF-04, quando é enviado, então recebe 400 e nada é gravado.

#### RF-06. Consultar e alterar demanda

RN: `GET /demandas` com filtros `status`, `tipo`, `linhaServicoProvavel`, `limit` (padrão 20, máximo 100) e `offset`,
ordenado da mais nova para a mais antiga. `GET /demandas/:id` devolve a demanda com as listas de ESP, RSK e DEC. A
resposta de leitura **não** traz o texto bruto; ele só aparece na tela de detalhe para pessoa. `PATCH /demandas/:id`
altera campos descritivos e status (RF-07); toda alteração vai ao histórico.

- CA-06.1. Dado 3 demandas `bug` e 2 `melhoria`, quando chama `GET /demandas?tipo=bug`, então recebe só as 3 do tipo bug.
- CA-06.2. Dado `limit=500`, quando chama `GET /demandas`, então recebe 400.
- CA-06.3. Dado uma demanda inexistente, quando chama `GET /demandas/DEM-20261022-9999`, então recebe 404.
- CA-06.4. Dado uma pessoa que muda `linhaServicoProvavel` pelo PATCH, quando consulta o histórico, então vê o valor
  antes, o valor depois, a pessoa e a data e hora.

#### RF-07. Status da demanda e transições

RN: status possíveis: `nova`, `em_analise`, `aguardando_informacao`, `pronta_para_decisao`, `encerrada`, `aprovada`,
`em_construcao`, `entregue`, `devolvida`. Transições automáticas (ator `sistema`): ESP ou saída do orquestrador com
dúvida ou pergunta em aberto → `aguardando_informacao` (RF-15); DEC criado → `pronta_para_decisao`; decisão
`devolvida` → `em_analise`; decisão `arquivada` → `encerrada`. Transições manuais, só por pessoa, pelo painel ou por
`PATCH /demandas/:id`:

| De | Para |
|---|---|
| `nova` | `em_analise`, `encerrada` |
| `em_analise` | `aguardando_informacao`, `encerrada` |
| `aguardando_informacao` | `em_analise`, `encerrada` |
| `pronta_para_decisao` | `em_analise`, `aprovada` (só com DEC aprovado e não desatualizado), `encerrada` |
| `aprovada` | `em_construcao` (só se o tipo não for `estudo`), `encerrada` |
| `em_construcao` | `entregue`, `devolvida` |
| `devolvida` | `em_construcao`, `em_analise` |
| `entregue`, `encerrada` | nenhuma (finais) |

- CA-07.1. Dado uma demanda `pronta_para_decisao` sem DEC aprovado, quando a pessoa tenta mudar para `aprovada`, então
  recebe 409 com o motivo e o status não muda.
- CA-07.2. Dado uma demanda `estudo` em `aprovada`, quando a pessoa tenta mudar para `em_construcao`, então recebe 409.
- CA-07.3. Dado uma demanda `em_construcao`, quando a pessoa muda para `entregue` no painel, então o status muda e o
  histórico registra a pessoa.
- CA-07.4. Dado um token de agente, quando tenta mudar o status por PATCH, então recebe 403 (RF-02).
- CA-07.5. Dado uma demanda `entregue`, quando a pessoa tenta qualquer mudança de status, então recebe 409.

#### RF-08. Especificação técnica (ESP) versionada

RN: campos da seção 3.2 da spec original, com `escopoInclui`, `escopoExclui` e `duvidasEmAberto` como **listas** de
textos (JSONB validado por Zod), mais `sistemaAlvo`, `repositorioDestino`, `criteriosAceitePreliminares` (lista) e
`definicaoDePronto` (lista). Esses quatro campos ficam na ESP, e não na demanda, para que o DEC aprovado aponte para
valores imutáveis (RF-22). Para tipo diferente de `estudo`, os quatro são obrigatórios e seguem as regras do
validarPedido: `sistemaAlvo` em minúsculas, números e hífen; `repositorioDestino` = `<dono>/<sistemaAlvo>` com dono
`wsssistemas2626-crypto` ou `fabianojp06`; listas com ao menos um item não vazio. `responsavel` registra a pessoa ou o
agente. Rotas: `POST /demandas/:id/especificacoes`, `GET /demandas/:id/especificacoes`, `GET /especificacoes/:espId`.

- CA-08.1. Dado uma demanda sem ESP, quando se cria uma ESP válida, então ela recebe o id `ESP-<demandaId>-v1`; a
  seguinte recebe `-v2`.
- CA-08.2. Dado uma demanda `novo_projeto`, quando se cria uma ESP sem `repositorioDestino`, então recebe 400 com o campo.
- CA-08.3. Dado `sistemaAlvo: "meu-sistema"` e `repositorioDestino: "outra-conta/meu-sistema"`, quando se cria a ESP,
  então recebe 400.
- CA-08.4. Dado uma demanda `estudo`, quando se cria uma ESP sem os quatro campos de construção, então ela é aceita.
- CA-08.5. Dado `escopoInclui` enviado como texto corrido em vez de lista, quando se cria a ESP, então recebe 400.

#### RF-09. Parecer de risco (RSK) versionado

RN: campos da seção 3.3 da spec original; níveis `baixo`, `medio`, `alto`; `preCondicoes` e `riscos` (os comentários e
recomendações por item) como listas validadas por Zod; `envolverJuridicoOuAdministradoraQuando` substitui o campo que
cita a administradora pelo nome. Rotas: `POST /demandas/:id/pareceres-risco`, `GET /demandas/:id/pareceres-risco`,
`GET /pareceres-risco/:rskId`.

- CA-09.1. Dado uma demanda, quando se cria um RSK válido, então recebe o id `RSK-<demandaId>-v1`.
- CA-09.2. Dado `riscoTecnicoNivel: "critico"`, quando se cria o RSK, então recebe 400.
- CA-09.3. Dado `preCondicoes` como texto corrido, quando se cria o RSK, então recebe 400.

#### RF-10. Pacote de decisão (DEC) versionado

RN: campos da seção 3.4 da spec original. O DEC cita **a ESP e o RSK de maior versão** da demanda no momento da
criação e grava uma cópia de `id`, `tipo`, `titulo` e da descrição da demanda (contexto, problema e impacto) usada no
pedido (RF-22). Sem ESP ou sem RSK: 400 com `faltando: ["especificacao", "parecer_risco"]` (só os que faltam).
`nivelAprovacaoRequerido`: `cto` ou `cto_e_administradora`. Nasce com `statusDecisao = pendente`. Rotas:
`POST /demandas/:id/pacotes-decisao`, `GET /demandas/:id/pacotes-decisao`, `GET /pacotes-decisao/:decId`.

- CA-10.1. Dado uma demanda sem ESP e sem RSK, quando se cria um DEC, então recebe 400 com
  `faltando: ["especificacao", "parecer_risco"]`.
- CA-10.2. Dado uma demanda com ESP v1 e sem RSK, quando se cria um DEC, então recebe 400 com `faltando: ["parecer_risco"]`.
- CA-10.3. Dado ESP v1, v2 e RSK v1, quando se cria um DEC, então ele cita `ESP-…-v2` e `RSK-…-v1` e nasce `pendente`.
- CA-10.4. Dado um DEC criado, quando se consulta a demanda, então ela está em `pronta_para_decisao` (RF-07).

#### RF-11. Imutabilidade das versões

RN: o conteúdo de ESP, RSK e DEC gravado nunca muda; mudança gera nova versão. Não há rota de edição nem de exclusão
desses artefatos. No DEC, só os campos de decisão (RF-13 e RF-14) são preenchidos depois, uma única vez por decisão. A
proteção vale também no banco: o papel da aplicação não consegue alterar o conteúdo de uma versão gravada.

- CA-11.1. Dado uma ESP v1 gravada, quando se chama `PATCH`, `PUT` ou `DELETE` em `/especificacoes/:espId`, então recebe
  405 (ou 404) e o conteúdo continua igual.
- CA-11.2. Dado uma ESP v1 gravada, quando o teste de integração tenta um `UPDATE` do conteúdo com o papel da
  aplicação, então o banco recusa.
- CA-11.3. Dado um DEC com decisão `aprovada` registrada, quando se tenta registrar outra decisão no mesmo DEC, então
  recebe 409.

#### RF-12. DEC desatualizado

RN: um DEC fica desatualizado quando a demanda ganha uma ESP ou um RSK com versão maior que a citada nele. A regra
usa o número da versão, não o relógio. DEC desatualizado aparece marcado na API (`desatualizado: true`) e no painel, e
não pode ser aprovado (pode ser devolvido ou arquivado). Para decidir, cria-se um DEC novo.

- CA-12.1. Dado um DEC v1 que cita ESP v1, quando se cria a ESP v2, então `GET /pacotes-decisao/:id` devolve
  `desatualizado: true`.
- CA-12.2. Dado um DEC desatualizado, quando a pessoa tenta registrar `aprovada`, então recebe 409 e o DEC continua `pendente`.
- CA-12.3. Dado um DEC desatualizado, quando a pessoa registra `devolvida`, então a decisão é aceita.
- CA-12.4. Dado um DEC desatualizado, quando a pessoa abre a tela de decisão, então o aviso de desatualizado aparece e o
  botão de aprovar fica indisponível.

#### RF-13. Registrar decisão

RN: `PATCH /pacotes-decisao/:decId/decisao`, só por pessoa autenticada com 2FA (agente recebe 403, RF-02). Agente nunca
aprova. `statusDecisao`: `aprovada`, `devolvida` ou `arquivada`. `opcaoEscolhida` é obrigatória e aceita só `A` ou
`B` quando `aprovada`, e fica vazia nos outros dois. `comentariosAprovador` é opcional. O aprovador vem da sessão, não
do body (os campos `aprovadorNome` e `aprovadorPapel` da spec original saem). Se a ESP, o RSK ou o DEC citados forem
rascunho de agente, a pessoa confirma no envio que os revisou (`revisouRascunhosDeAgente: true`), e sem isso a
decisão é recusada. Com `aprovada` e nível `cto`, grava `dataAprovacao`.

- CA-13.1. Dado uma pessoa com 2FA e um DEC `pendente` não desatualizado de nível `cto`, quando registra `aprovada` com
  opção `A`, então o DEC fica `aprovada`, com `dataAprovacao` e a pessoa em `aprovadores`.
- CA-13.2. Dado `opcaoEscolhida: "C"`, quando registra a decisão, então recebe 400.
- CA-13.3. Dado `statusDecisao: aprovada` sem `opcaoEscolhida`, quando registra, então recebe 400.
- CA-13.4. Dado um DEC gerado pelo agente consolidacao, quando a pessoa aprova sem `revisouRascunhosDeAgente: true`,
  então recebe 400 e nada é gravado.
- CA-13.5. Dado `aprovadorNome` no body, quando registra a decisão, então o nome gravado é o da sessão, não o do body.

#### RF-14. Dupla aprovação

RN: com `nivelAprovacaoRequerido = cto_e_administradora`, o DEC só passa a `aprovada` depois de duas aprovações
registradas: uma de pessoa com papel `cto` e uma da administradora, as duas com a mesma opção. A aprovação da
administradora exige a referência a um documento externo assinado (identificador e data); o sistema guarda a
referência e não substitui a assinatura. Com uma só aprovação, o DEC fica `pendente` com a aprovação parcial visível.
Opções diferentes entre as duas aprovações: a segunda é recusada.

- CA-14.1. Dado um DEC `cto_e_administradora`, quando só a aprovação do CTO é registrada, então o DEC continua
  `pendente`, sem `dataAprovacao`, e não gera Pedido de Construção.
- CA-14.2. Dado a aprovação do CTO registrada, quando a aprovação da administradora é registrada com a referência ao
  documento, então o DEC fica `aprovada` e `aprovadores` tem as duas entradas.
- CA-14.3. Dado a aprovação da administradora sem referência ao documento externo, quando é enviada, então recebe 400.
- CA-14.4. Dado a aprovação do CTO com opção A, quando a da administradora vem com opção B, então recebe 409.

#### RF-15. Dúvidas em aberto

RN: ESP gravada com `duvidasEmAberto` não vazia, ou saída do agente orquestrador com `perguntasParaSolicitante` não
vazia, leva a demanda a `aguardando_informacao`. O sistema não envia nenhuma mensagem ao solicitante, por nenhum
canal, nesta versão: as perguntas ficam listadas no detalhe da demanda para Fabiano tratar fora do sistema.

- CA-15.1. Dado uma demanda `em_analise`, quando se grava uma ESP com uma dúvida em aberto, então a demanda vai a
  `aguardando_informacao` e o histórico registra a mudança com ator `sistema`.
- CA-15.2. Dado essa mudança, quando se inspeciona o cliente de e-mail falso e as filas, então não há nenhuma mensagem
  ao solicitante.
- CA-15.3. Dado uma demanda `aguardando_informacao`, quando a pessoa abre o detalhe, então vê a lista de dúvidas da ESP
  mais nova.

#### RF-16. Agentes de IA como jobs

RN: os quatro agentes da seção 7 da spec original (orquestrador, insumo_tecnico, risco, consolidacao) rodam como jobs
do pg-boss no processo `worker`. Prompts em `src/agents/`, derivados de `operacional-desenvolvimento-sistemas`
(insumo técnico), `gestao-riscos` com apoio de `juridico-contratos` (risco) e do Orquestrador Central (orquestrador e
consolidação). Disparo, com o agente ligado: orquestrador na entrada por texto (RF-05); insumo_tecnico quando a demanda
é criada; risco quando uma ESP sem dúvida é gravada; consolidacao quando um RSK é gravado e existe ESP. A saída é
validada pelo **mesmo** schema Zod da rota da API correspondente; saída fora do schema não grava nada e o job vai
para nova tentativa (RNF-06). Não há execução duplicada: o mesmo agente, para o mesmo artefato de entrada, roda uma vez
só. O artefato gerado é rascunho de agente. Esgotadas as tentativas, a falha vai ao histórico e a demanda fica para
preenchimento manual.

- CA-16.1. Dado o agente risco ligado e o provedor falso devolvendo JSON válido, quando uma ESP sem dúvida é gravada,
  então um job roda e grava `RSK-…-v1` com `responsavel` agente risco.
- CA-16.2. Dado o provedor falso devolvendo JSON fora do schema na 1ª chamada e válido na 2ª, quando o job roda, então a
  1ª tentativa não grava artefato e a 2ª grava exatamente um.
- CA-16.3. Dado o provedor falso sempre fora do schema, quando as tentativas se esgotam, então nenhum artefato é gravado
  e o histórico registra a falha do agente, sem o conteúdo da resposta.
- CA-16.4. Dado o mesmo job enfileirado duas vezes para a mesma ESP, quando o worker processa, então o provedor falso é
  chamado uma vez e há um único RSK novo.
- CA-16.5. Dado a suíte de testes, quando roda sem nenhuma variável de chave da API de IA definida, então passa, e
  nenhuma chamada de rede ao provedor real acontece.

#### RF-17. Registro de uso por chamada

RN: toda chamada ao provedor de IA grava uma linha de uso: agente, demanda, modelo, tokens de entrada, tokens de saída,
custo calculado por uma tabela de preço por modelo configurável, data e hora, e resultado (sucesso, fora do schema,
erro). Sem o conteúdo do prompt nem da resposta.

- CA-17.1. Dado o provedor falso devolvendo 1.000 tokens de entrada e 200 de saída num modelo com preço configurado,
  quando o job roda, então a linha de uso registra os tokens e o custo calculado pela tabela.
- CA-17.2. Dado uma tentativa fora do schema, quando ela termina, então também gera linha de uso, com resultado `fora_do_schema`.
- CA-17.3. Dado a tabela de uso, quando se inspecionam as colunas, então não há coluna com o texto enviado ou recebido.

#### RF-18. Teto de gasto mensal

RN: o teto é um valor gravado no banco, alterado só por pessoa com papel `cto`, na moeda da cobrança do provedor. O
gasto do mês é a soma dos custos das linhas de uso do mês civil corrente (America/Sao_Paulo). Antes de cada chamada,
se o gasto do mês for maior ou igual ao teto, a chamada não acontece, os agentes ficam suspensos, o job termina sem
artefato e a suspensão vai ao histórico. A suspensão acaba quando o teto sobe acima do gasto ou o mês vira. Valor
inicial do teto: zero, ou seja, nada roda até Fabiano definir o teto.

- CA-18.1. Dado teto 10 e gasto do mês 10, quando um job de agente começa, então o provedor falso não é chamado, nenhum
  artefato é gravado e o histórico registra a suspensão.
- CA-18.2. Dado o relógio injetado no primeiro dia do mês seguinte, quando um job começa, então o gasto do mês é zero e
  a chamada acontece.
- CA-18.3. Dado o sistema recém-instalado, quando um agente é ligado sem teto definido, então nenhum job chama o provedor.
- CA-18.4. Dado um token de agente, quando tenta alterar o teto, então recebe 403.

#### RF-19. Ligar e desligar agentes e operação manual

RN: cada agente tem um interruptor próprio, alterado só por pessoa com papel `cto`, e cada mudança vai ao histórico.
Os quatro nascem **desligados** (a chave da API no CNPJ, CA-E-03, ainda não existe). Agente desligado não enfileira
job; job já na fila de agente desligado termina sem chamar o provedor. Com o agente desligado ou suspenso, a pessoa
preenche os mesmos campos pelo painel, nas mesmas rotas e com o mesmo schema.

- CA-19.1. Dado o sistema recém-instalado, quando se consulta a configuração, então os quatro agentes estão desligados.
- CA-19.2. Dado o agente insumo_tecnico desligado, quando uma demanda é criada, então nenhum job é enfileirado e a
  pessoa consegue gravar a ESP pelo painel.
- CA-19.3. Dado o agente risco ligado, quando a pessoa o desliga no painel, então o histórico registra quem desligou e quando.
- CA-19.4. Dado um job de risco na fila e o agente desligado em seguida, quando o worker processa o job, então o
  provedor falso não é chamado.

#### RF-20. Minimização do que vai ao provedor de IA

RN: ao provedor vai só o necessário para a tarefa do agente. Não vão: nome do solicitante, metadados de origem
(remetente, destinatário, referência da mensagem), anexos. No texto que vai, endereços de e-mail, telefones, CPF e
CNPJ são trocados por marcadores antes do envio. O nome do solicitante é informado pela pessoa na entrada (RF-05), não
extraído pela IA.

- CA-20.1. Dado um texto bruto fictício com `contato@exemplo.test`, `(11) 90000-0000` e um CPF fictício, quando o
  agente orquestrador roda, então o conteúdo recebido pelo provedor falso não contém nenhum dos três.
- CA-20.2. Dado uma demanda com solicitante e anexos, quando o agente insumo_tecnico roda, então o conteúdo recebido
  pelo provedor falso não contém o nome do solicitante nem a referência dos anexos.

#### RF-21. Histórico de eventos

RN: tabela só de inclusão. Cada evento registra data e hora, ator (tipo `pessoa`, `agente` ou `sistema` e o
identificador), entidade e id, ação, e valor antes e depois quando houver. Entram: criação de demanda, mudança de
status e de campo, criação de versão de ESP, RSK e DEC, decisão e cada aprovação, ligar e desligar agente, mudança de
teto, suspensão por teto, falha de agente, geração do pedido de construção e expurgo. O histórico não guarda texto
bruto nem token.

- CA-21.1. Dado um fluxo completo fictício (demanda, ESP, RSK, DEC, aprovação), quando se consulta o histórico da
  demanda, então há um evento para cada passo, com o ator correto.
- CA-21.2. Dado um evento gravado, quando o teste tenta `UPDATE` ou `DELETE` com o papel da aplicação, então o banco recusa.
- CA-21.3. Dado uma demanda com texto bruto, quando se lê todo o histórico, então o texto bruto não aparece.

#### RF-22. Pedido de Construção

RN: um DEC `aprovada` de demanda com tipo diferente de `estudo` gera o Pedido de Construção da seção 3.1 do /construir,
para baixar (`<DEC-id>.json`) e copiar no painel; não há envio automático. Montagem, só com dados imutáveis:

| Campo do pedido | Origem |
|---|---|
| `pedido` | id do DEC |
| `demanda.id`, `tipo`, `titulo`, `descricao` | cópia gravada no DEC (RF-10); `descricao` junta contexto, problema e impacto |
| `especificacao.id`, `conteudo` | ESP citada no DEC; `conteudo` é o texto dos campos em ordem fixa, com rótulos em pt-BR |
| `risco.id`, `nivel`, `conteudo` | RSK citado; `nivel` é o maior dos três níveis (baixo < medio < alto) |
| `decisao.id`, `opcaoEscolhida`, `aprovadoPor`, `aprovadoEm` | DEC; `opcaoEscolhida` = `A: <descrição da opção A>` ou `B: …`; `aprovadoPor` = nomes dos aprovadores; `aprovadoEm` = data da aprovação que completou a decisão, `AAAA-MM-DD` em America/Sao_Paulo |
| `sistema_alvo`, `repositorio_destino`, `criterios_aceite_preliminares`, `definicao_de_pronto` | ESP citada (RF-08) |

O pedido passa pelas mesmas regras do `validarPedido` (`ferramentas/construir/lib/pedido.mjs` da estruturaAutonoma);
falhou, a API responde 422 com a lista de erros e nada é entregue. O mesmo DEC gera sempre o mesmo pedido, byte a
byte (ordem de chaves fixa, sem data de geração). O pedido não leva texto bruto, nome do solicitante nem anexos. Cada
geração vai ao histórico. Rota só de pessoa.

- CA-22.1. Dado um DEC aprovado com ESP e RSK fictícios completos, quando a pessoa gera o pedido, então o JSON passa nas
  regras do validarPedido e `pedido` é igual a `decisao.id`.
- CA-22.2. Dado o mesmo DEC, quando o pedido é gerado duas vezes, inclusive depois de editar o título da demanda, então
  os dois arquivos são idênticos byte a byte.
- CA-22.3. Dado um DEC aprovado de demanda `estudo`, quando a pessoa pede o pedido, então recebe 422 com "demanda do tipo
  estudo não gera Pedido de Construção".
- CA-22.4. Dado um DEC `pendente`, `devolvida` ou com só uma das duas aprovações, quando se pede o pedido, então recebe 409.
- CA-22.5. Dado um RSK com níveis baixo, alto e medio, quando o pedido é gerado, então `risco.nivel` é `alto`.
- CA-22.6. Dado uma demanda com solicitante e texto bruto fictícios, quando o pedido é gerado, então nenhum dos dois
  aparece no JSON.

#### RF-23. Filtro de pacotes por status de decisão

RN: `GET /pacotes-decisao?statusDecisao=<pendente|aprovada|devolvida|arquivada>`, com `limit` e `offset` como em RF-06,
e o campo `desatualizado` em cada item.

- CA-23.1. Dado 2 DEC aprovados e 1 pendente, quando chama `GET /pacotes-decisao?statusDecisao=aprovada`, então recebe só os 2.
- CA-23.2. Dado `statusDecisao=talvez`, quando chama, então recebe 400.

#### RF-24. Expurgo do texto bruto

RN: um job do worker roda ao menos uma vez por dia e apaga o texto bruto e os metadados de origem recebidos há mais
de 90 dias (prazo configurável, a conferir com `juridico-contratos` na Parada 1). Os campos estruturados da demanda
ficam. O expurgo grava a data em que ocorreu e um evento no histórico com ator `sistema`, sem o conteúdo apagado.

- CA-24.1. Dado o relógio injetado e um texto bruto recebido há 91 dias, quando o job de expurgo roda, então o texto e os
  metadados de origem ficam vazios, a data do expurgo é gravada e o histórico registra o evento.
- CA-24.2. Dado um texto bruto recebido há 89 dias, quando o job roda, então ele continua guardado.
- CA-24.3. Dado o prazo configurado em 30 dias e um texto de 31 dias, quando o job roda, então ele é expurgado.
- CA-24.4. Dado um texto já expurgado, quando o job roda de novo, então não há novo evento para ele.

#### RF-25. Aviso por e-mail de pacote pronto para decisão

RN: quando um DEC é criado (`pendente`), o worker envia um e-mail pelo Resend ao endereço configurado por variável de
ambiente, uma única vez por DEC. O e-mail traz só o id do DEC, o id da demanda e o link para a tela de decisão, sem
título, texto bruto ou nome do solicitante. Nos testes, cliente de e-mail falso, sem envio real.

- CA-25.1. Dado um DEC criado, quando o worker processa, então o cliente falso recebe um e-mail com o id do DEC e o link.
- CA-25.2. Dado o mesmo job de aviso enfileirado duas vezes, quando processado, então sai um e-mail só.
- CA-25.3. Dado o e-mail gerado, quando se inspeciona o corpo, então não contém título, texto bruto nem nome do solicitante.

#### RF-26. Painel em pt-BR

RN: telas: login e 2FA; fila de demandas com filtros (status, tipo, linha de serviço); detalhe da demanda com dados,
texto bruto (ou "expurgado em <data>"), dúvidas em aberto, versões de ESP, RSK e DEC (com marca de rascunho de agente e
de desatualizado), histórico e mudança manual de status; entrada de demanda colando o texto (RF-05); tela de decisão
(RF-13, RF-14) com baixar e copiar o Pedido de Construção (RF-22); configuração de agentes e teto (RF-18, RF-19), com o
gasto do mês. Também os formulários de ESP, RSK e DEC para preenchimento manual. Todos os textos em pt-BR.

- CA-26.1. Dado 5 demandas fictícias com status diferentes, quando a pessoa filtra a fila por `aguardando_informacao`,
  então vê só as desse status.
- CA-26.2. Dado uma demanda com ESP v1, v2, RSK v1 e DEC v1 desatualizado, quando a pessoa abre o detalhe, então vê as
  quatro versões, a marca de desatualizado no DEC e o histórico.
- CA-26.3. Dado um DEC aprovado, quando a pessoa clica em baixar na tela de decisão, então recebe `<DEC-id>.json` igual
  à resposta da API (RF-22).
- CA-26.4. Dado cada tela listada acima, quando o teste e2e roda o axe, então não há violação.

### 3. Requisitos não funcionais

| Id | Requisito | Número | Verificação |
|---|---|---|---|
| RNF-01 | Stack, pastas e comandos do `padrao-tecnico.md` (Next 16.3.8, Drizzle com papel migrator e papel da aplicação sem DDL, pg-boss com `pnpm worker`, Better Auth, Zod 4, pino, Vitest + Testcontainers, Playwright + axe) | versões da seção 1 do padrão | revisão do tech-lead |
| RNF-02 | Porta de desenvolvimento | ≥ 3101, nunca 3000; escolhida pelo arquiteto na etapa 02 | `package.json` |
| RNF-03 | Tempo de resposta da API (sem agentes) | p95 < 500 ms em `GET /demandas` e `GET /demandas/:id` com 5.000 demandas fictícias no Postgres de teste | teste de integração |
| RNF-04 | Limites de entrada | texto bruto até 100.000 caracteres; campos de texto até 10.000; listas até 50 itens; `limit` até 100 | Zod + teste |
| RNF-05 | Volume previsto | até 200 demandas por mês e 4 agentes; uma réplica de app e uma de worker | arquitetura |
| RNF-06 | Nova tentativa dos agentes | 3 tentativas por job, intervalo crescente (30 s, 2 min, 10 min); tempo máximo por chamada ao provedor 120 s | teste com relógio injetado |
| RNF-07 | Teto de gasto | valor inicial 0; verificação antes de **cada** chamada; tolerância: a última chamada antes do teto pode ultrapassá-lo em no máximo o custo de uma chamada | teste RF-18 |
| RNF-08 | Retenção | texto bruto e metadados de origem: 90 dias (configurável); expurgo ao menos 1 vez a cada 24 h, e nenhum texto com mais de prazo + 24 h; histórico e uso de IA: sem expurgo nesta versão (não guardam dado pessoal) | teste RF-24 |
| RNF-09 | Capacidade de ids | 9.999 demandas (4 dígitos exigidos pelo validarPedido); ao passar de 9.000, aviso no painel | teste RF-04 |
| RNF-10 | Log e erros | nenhum log (pino) nem evento do Sentry contém texto bruto, e-mail, telefone, token, senha, cookie ou conteúdo de prompt e resposta de IA; erro ao usuário sem pilha, SQL ou nome interno | teste que captura a saída do pino durante um fluxo completo com valores-sentinela fictícios e confere 0 ocorrências |
| RNF-11 | Acessibilidade | 0 violações do axe (WCAG 2.1 A e AA) em cada tela da RF-26 | Playwright + `@axe-core/playwright` |
| RNF-12 | Segurança de acesso | 2FA TOTP obrigatório em 100% das contas; sessão expira em 8 h; até 10 tentativas de login por minuto por IP; token de serviço com 32 bytes aleatórios, guardado só como hash | testes RF-01 e RF-02 |
| RNF-13 | Segredos | chave da API de IA, tokens, Resend e URLs de banco só por variável de ambiente, citadas pelo nome em `.env.example` e `docs/operacao/deploy.md` | revisão e busca no repositório |
| RNF-14 | Testes sem efeito externo | 0 chamadas reais ao provedor de IA e ao Resend durante a construção e no CI; só dado fictício | RF-16 (CA-16.5), RF-25 |
| RNF-15 | Determinismo | o mesmo DEC gera 100% das vezes o mesmo pedido byte a byte; teste não depende do relógio real nem da ordem | RF-22, relógio injetado |
| RNF-16 | Idioma | 100% dos textos de interface e mensagens de erro ao usuário em pt-BR | revisão e e2e |
| RNF-17 | Saúde | rota de saúde sem autenticação, que responde 200 em < 200 ms e não expõe versão de dependência nem configuração | teste de integração |
| RNF-18 | Qualidade de entrega | `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` verdes; `docker build` local passa; CI com os quatro; 0 achado crítico ou alto aberto; `package.json` 0.1.0 | definição de pronto do pedido |

### 4. Fora do escopo (versão 0.1.0)

- Entrada automática por e-mail, chat ou formulário externo: a entrada é pelo painel ou pela API.
- Envio de qualquer mensagem ao solicitante ou a cliente, inclusive as perguntas de dúvida em aberto.
- Envio automático do Pedido de Construção ao /construir e retorno automático de andamento (CA-F-01): o pedido é
  baixado e copiado à mão para `pedidos/` da estruturaAutonoma, e os status `aprovada`, `em_construcao`, `entregue` e
  `devolvida` mudam à mão.
- Upload e armazenamento de arquivo anexo: anexo é só referência.
- Chamada real ao provedor de IA e ao Resend durante a construção; ativação dos agentes em produção (depende da chave
  da API no CNPJ, CA-E-03).
- Cadastro público de usuário, recuperação de senha por e-mail e gestão de usuários pelo painel (contas por script).
- Mais de uma empresa na mesma base (sem `tenant_id` nem RLS por cliente).
- Deploy, criação dos serviços e variáveis no Easypanel, merge na main e migration em produção (ações de Fabiano).
- Integração com Notion ou Slack.
- Opções C e D na decisão.

### 5. Matriz de rastreabilidade (critério preliminar do pedido → RF → critério de aceite)

| # | Critério preliminar do pedido | RF | Critérios de aceite |
|---|---|---|---|
| 1 | Pessoa com 2FA cria demanda pelo painel e pela API e recebe id DEM-AAAAMMDD-NNNN | RF-01, RF-03, RF-04, RF-05 | CA-01.1, CA-01.2, CA-03.1, CA-03.2, CA-04.1, CA-04.2, CA-05.1 |
| 2 | ESP, RSK e DEC em versões, e nenhuma versão gravada muda | RF-08, RF-09, RF-10, RF-11 | CA-08.1, CA-09.1, CA-10.3, CA-11.1, CA-11.2, CA-11.3, CA-04.3 |
| 3 | DEC sem ESP ou RSK responde 400 com a lista do que falta | RF-10 | CA-10.1, CA-10.2 |
| 4 | DEC com ESP ou RSK mais nova aparece desatualizado e não pode ser aprovado | RF-12, RF-23, RF-26 | CA-12.1, CA-12.2, CA-12.3, CA-12.4, CA-26.2 |
| 5 | Só pessoa com 2FA registra decisão; token de agente recebe 403 | RF-01, RF-02, RF-13 | CA-02.1, CA-02.2, CA-01.2, CA-13.1, CA-13.5 |
| 6 | Decisão só A ou B; cto_e_administradora só vale com as duas aprovações | RF-13, RF-14 | CA-13.2, CA-13.3, CA-14.1, CA-14.2, CA-14.3, CA-14.4 |
| 7 | Agente ligado roda como job, saída validada pelo schema Zod da API, registra tokens e custo; fora do schema não grava e vai para nova tentativa | RF-16, RF-17 | CA-16.1, CA-16.2, CA-16.3, CA-16.4, CA-17.1, CA-17.2 |
| 8 | Teto atingido ou agente desligado: nenhuma chamada ao provedor, pessoa preenche pelo painel | RF-18, RF-19 | CA-18.1, CA-18.3, CA-19.2, CA-19.4 |
| 9 | Dúvida em aberto leva a aguardando_informacao, sem mensagem ao solicitante | RF-15, RF-07 | CA-15.1, CA-15.2, CA-15.3 |
| 10 | Toda mudança de status, versão ou decisão no histórico com pessoa ou agente | RF-21, RF-02 | CA-21.1, CA-21.2, CA-02.4, CA-06.4, CA-19.3 |
| 11 | DEC aprovado gera pedido que passa no validarPedido; mesmo DEC, mesmo pedido | RF-22 | CA-22.1, CA-22.2, CA-22.3, CA-22.4, CA-22.5 |
| 12 | Texto bruto com mais de 90 dias expurgado pelo worker, com registro no histórico | RF-24 | CA-24.1, CA-24.2, CA-24.3, CA-24.4 |
| 13 | Nenhum log contém texto bruto, e-mail, token ou senha | RNF-10, RF-20 | teste da RNF-10, CA-20.1, CA-21.3 |
| 14 | Telas do painel passam no axe sem violação | RF-26, RNF-11 | CA-26.4 |

Origem dos RF que não vêm de um critério preliminar: RF-06 e RF-23 (seção 5 da spec original e item 3 da ESP), RF-07
(item 7 da ESP e ajustes B.2), RF-20 (item 8 da ESP e RSK), RF-25 (item 9 da ESP), RF-26 (item 6 da ESP).

## Decisões tomadas

- `sistemaAlvo`, `repositorioDestino`, `criteriosAceitePreliminares` e `definicaoDePronto` ficam na ESP, não na
  demanda: só assim o DEC aprovado aponta para valores imutáveis e o mesmo DEC gera sempre o mesmo pedido.
- O DEC grava uma cópia de id, tipo, título e descrição da demanda, pelo mesmo motivo (a demanda é editável).
- "v0" no RSK e na spec original é lido como "primeira versão, rascunho de agente"; a numeração gravada começa em v1,
  como pedem o critério preliminar 2 e o formato `-vN` do validarPedido.
- A revisão humana do rascunho de agente exigida pelo RSK vira confirmação explícita no registro da decisão
  (`revisouRascunhosDeAgente`), em vez de um fluxo de revisão separado, para não criar tela nem status fora da ESP.
- `risco.nivel` do pedido é o maior dos três níveis do RSK, porque o pedido aceita um nível só.
- `opcaoEscolhida` do pedido leva a letra e a descrição da opção, porque o /construir não tem acesso ao DEC.
- O aprovador vem da sessão; `aprovadorNome` e `aprovadorPapel` saem do body, para que ninguém registre decisão em nome de outro.
- O campo `envolver_juridico_ou_debora_quando` passa a `envolverJuridicoOuAdministradoraQuando`, para não ter nome de pessoa no esquema.
- Decisão registrada é final para aquela versão de DEC; refazer exige DEC novo, coerente com a imutabilidade.
- As transições automáticas de status se limitam às quatro do RF-07; `aprovada`, `em_construcao`, `entregue` e
  `devolvida` ficam manuais, como diz o item 7 da ESP.
- Não sai nenhuma mensagem ao solicitante nesta versão, já que não há canal de saída no escopo; isso cumpre "nenhuma
  pergunta sai sem aprovação de Fabiano" sem criar fluxo de envio.
- Teto inicial zero: com os agentes desligados e sem chave, é o valor que não gera gasto por engano.
- Tela de configuração de agentes e teto acrescentada à lista do item 6 da ESP: sem ela, ligar agente e mudar teto
  exigiriam chamada à API com cookie de sessão.
- Minimização (RF-20) com troca de e-mail, telefone, CPF e CNPJ por marcador e nome do solicitante informado pela
  pessoa: é a forma verificável de "só o necessário vai ao provedor".
- E-mail de aviso só com ids e link, sem título, porque o título pode citar cliente ou pessoa.
- Os números das RNF (tempos, limites, tentativas, sessão) são proposta desta etapa, ajustável pelo arquiteto ou por
  `seguranca-aplicacao` com registro.

## Pendências

- Nenhuma bloqueia a etapa. Itens para a Parada 1 (Fabiano) ou para as etapas 02 e 04:
- Fabiano: quem registra no sistema a aprovação da administradora (ela própria, com conta e 2FA, ou o CTO, informando
  a referência ao documento assinado)? Os requisitos aceitam os dois, sempre com a referência obrigatória.
- Fabiano: a aprovação do DEC deve mudar a demanda para `aprovada` automaticamente? A ESP diz "mudados à mão"; os
  requisitos seguem a ESP.
- Fabiano: valor do teto de gasto mensal e da tabela de preço por modelo (configurados no banco, sem valor no código).
- `juridico-contratos`: confirmar o prazo de 90 dias do texto bruto; dizer se as referências de anexo e os campos
  estruturados extraídos (contexto, problema) também entram no expurgo; e dar o prazo de retenção do histórico.
- `seguranca-aplicacao` (04): ESP e RSK escritos por pessoa ou agente podem citar cliente; o pedido gerado é copiado
  para o git da estruturaAutonoma. Avaliar se o pedido precisa de verificação de dado pessoal antes do download.
- `arquiteto-solucoes` (02): como provar "passa no validarPedido" sem acoplar os repositórios (cópia das regras com os
  mesmos casos de teste, ou teste de contrato contra o `pedido.mjs`); a lista de donos de repositório fica duplicada e
  pode divergir.
- `arquiteto-solucoes` (02): se o worker chama a API com o token de serviço ou os módulos direto; em qualquer caso o
  ator no histórico é o agente (CA-02.4) e a regra de 403 vale na rota.
- `arquiteto-solucoes` (02): a capacidade de 9.999 demandas (RNF-09) vem do formato do validarPedido; aumentar exige
  mudar as duas pontas.
- `ux-ui-design` (03): telas de login e 2FA do Better Auth precisam estar em pt-BR e passar no axe.
- Meta de disponibilidade em produção: definir com `devops-sre` na etapa 09 (ferramenta interna, uma réplica).

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] todo item de `criterios_aceite_preliminares` do pedido aparece na matriz
- [x] todo RF tem ao menos um critério Dado/Quando/Então verificável
- [x] nenhum requisito contradiz a especificação (ESP) ou o parecer de risco (RSK) do pedido
- [x] o que fica fora do escopo está listado
- [x] o texto não tem dado pessoal real, segredo nem valor de `.env`
