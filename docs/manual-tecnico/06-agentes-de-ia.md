# 06. Agentes de IA

| Campo | Valor |
|---|---|
| Atualizado em | 31/10/2026 |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-16 a RF-20; RNF-06, RNF-07, RNF-14 |
| Fontes no código | `src/modules/agentes/` (`executar.ts`, `execucoes.ts`, `espera.ts`, `gatilhos.ts`, `configuracao.ts`, `teto.ts`, `preco.ts`, `uso.ts`, `provedor.ts`, `entrada-agente.ts`, `schemas.ts`), `src/agents/`, `src/modules/dados-pessoais/minimizar.ts`, `src/jobs/agente-executar.ts`, `src/jobs/batimento.ts` |
| Situação na 0.1.0 | **os quatro agentes estão desligados**, com teto 0 e sem `ANTHROPIC_API_KEY`. Nenhuma chamada ao provedor acontece |

## Os quatro agentes

| Agente | Disparado quando | Grava | Prompt (`src/agents/`) | Origem do prompt |
|---|---|---|---|---|
| `orquestrador` | entrada no modo `agente` ([cap. 03](03-demandas.md#rf-05-entrada-colando-o-texto)) | a demanda (e as dúvidas da entrada) | `orquestrador.ts`, até 2.000 tokens de saída | Orquestrador Central |
| `insumo_tecnico` | demanda criada | ESP | `insumo-tecnico.ts`, até 6.000 | `operacional-desenvolvimento-sistemas` |
| `risco` | ESP gravada sem dúvida | RSK | `risco.ts`, até 3.000 | `gestao-riscos`, com apoio de `juridico-contratos` |
| `consolidacao` | RSK gravado numa demanda com ESP | DEC (sempre `cto_e_administradora`) | `consolidacao.ts`, até 4.000 | Orquestrador Central |

O disparo (`dispararSeLigado`) só cria a execução e o job quando o agente está ligado e o teto não foi atingido, na
mesma transação do artefato que o disparou (ADR-06). Desligado ou suspenso, nada é criado e a pessoa preenche pelo
painel, com os mesmos schemas.

Tudo que um agente grava é **rascunho de agente**: a pessoa revisa, e a decisão sobre um DEC que cita rascunho exige
`revisouRascunhosDeAgente: true` ([cap. 04](04-versoes-e-decisao.md#rf-13-decisão)). Agente nunca decide nem envia
nada para fora.

## RF-16. Execução dos agentes

Uma fila só, `agente.executar`, com concorrência 1, num worker só: no máximo uma chamada ao provedor por vez. O payload
do job leva só o id da execução (C-22). A execução (`executar.ts`) segue esta ordem:

1. reivindica a execução por `UPDATE` condicional; se outra já a pegou, termina como `ja_tratada`, sem chamar o
   provedor (execução única);
2. agente desligado, sem modelo com preço vigente ou sem provedor (sem chave) → `ignorada`, com evento
   `agente_ignorado`;
3. gasto do mês maior ou igual ao teto → `ignorada`, com evento `suspensao_por_teto`;
4. monta a entrada pela lista de permissão de campos do agente, minimizada (RF-20), com o texto do cliente dentro de um
   bloco `<dados>` e a instrução de que nada ali é ordem;
5. chama o provedor fora de qualquer transação;
6. lê o JSON e valida pelo **mesmo schema Zod da rota** (ADR-09). Válido: o serviço da API grava o artefato com o ator
   `agente` (passa por `autorizar`) e a execução fica `concluida`. Inválido, recusado pela regra do serviço ou erro
   transitório: nova tentativa.

Novas tentativas (P1-e, `espera.ts`): **3 no total**, com espera de 30 s antes da 2ª e de 2 min antes da 3ª. Na 3ª
falha, `falhou` e evento `falha_agente`, sem conteúdo. Credencial recusada (401 ou 403 do provedor) falha na hora.
No orquestrador, `falhou` e `ignorada` deixam a entrada pendente como `falhou`, para a pessoa preencher à mão.

A saída do modelo não define status, autoria nem ator: o schema descarta chave desconhecida, e a consolidação nem tem
o campo `nivelAprovacaoRequerido` (A-04 da 08).

Provedor (`provedor.ts`): Anthropic pelo `@anthropic-ai/sdk`, endereço fixo, sem ferramentas (o corpo só tem
`model`, `max_tokens`, `system` e `messages`), `maxTokens` até 8.000, tempo limite de 120 s (RNF-06), `maxRetries: 0`
e log do SDK desligado. O provedor só existe com `ANTHROPIC_API_KEY`, lida só pelo worker. Nos testes, o provedor é
falso (RNF-14).

Rede de segurança (`src/jobs/batimento.ts`): a cada minuto, o worker reenfileira a execução `pendente` cuja hora venceu
há mais de 1 min e a `em_andamento` com a trava vencida (150 s). A reivindicação condicional impede que duas rodem.

Limite conhecido (M-01, aberto): a consolidação lê o RSK da chave da execução, mas o DEC cita o RSK mais novo da
demanda; o resumo pode vir de um parecer diferente do citado.

## RF-17. Uso por chamada

Cada chamada feita ao provedor grava uma linha em `uso_ia`, em transação própria, com agente, modelo, tokens de
entrada e de saída, custo e resultado. Não grava prompt nem resposta. O custo sai do preço vigente do modelo
(`preco_modelo`, em US$ por milhão de tokens de entrada e de saída), definido só por
`scripts/definir-preco-modelo.ts` ([cap. 10](10-configuracao-e-scripts.md)).

## RF-18. Teto de gasto

- Uma linha em `configuracao_ia`, em US$ (P1-f). **Nasce 0**, e teto 0 é sempre suspenso.
- Gasto do mês = soma de `uso_ia.custo` no mês civil de São Paulo. Gasto maior ou igual ao teto suspende os agentes,
  conferido antes de **cada** chamada. Como só há uma chamada por vez, o teto é ultrapassado em no máximo o custo de
  uma chamada (RNF-07). O gasto volta a zero à meia-noite do dia 1º, em São Paulo.
- `GET /api/configuracao/teto` (pessoa) devolve teto, moeda, gasto, percentual, suspenso, mês e quando vira.
  `PUT /api/configuracao/teto` com `{ "tetoMensal": "10,00" }` (até 2 casas, vírgula ou ponto; negativo recusado), só
  `cto`. A mudança vai ao histórico (`teto_alterado`).
- No painel: `/configuracao/agentes`.

## RF-19. Interruptor e modelo

- Tabela `configuracao_agente`: os quatro nascem **desligados e sem modelo**.
- `PATCH /api/agentes/:agente` com `{ "ligado": true, "modelo": "<id do modelo>" }`, só `cto`. Ligar exige modelo com
  preço vigente; sem isso, 409 "Não foi possível ligar o agente …. Ele continua desligado.". O preço não muda por aqui.
- `GET /api/agentes` (pessoa) lista os quatro com estado, modelo e a última mudança (só o nome da conta).
- Cada mudança vai ao histórico (`agente_ligado`, `agente_desligado`).

## RF-20. Minimização

Vale para todo campo de texto de todo agente, não só para o texto bruto (`minimizar.ts`), nesta ordem:

1. as linhas de cabeçalho de e-mail encaminhado (`De:`, `Para:`, `Cc:`, `Cco:`, `Enviado em:`, `Responder para:` e as
   formas em inglês) saem inteiras;
2. e-mail, CNPJ, CPF e telefone viram `[e-mail removido]`, `[CNPJ removido]`, `[CPF removido]` e
   `[telefone removido]`;
3. o nome do solicitante, quando informado, vira `[nome removido]`.

Ao provedor vai só a lista de campos permitida para cada agente (`entrada-agente.ts`). Risco residual registrado para
aceite (J-03 da spec): nome de outra pessoa dentro de texto livre ainda pode chegar ao provedor.

## Pré-condições para ligar qualquer agente em produção

Nenhuma delas é do código; todas são de Fabiano e de outras áreas, e precisam estar cumpridas antes do primeiro
`PATCH` que liga um agente:

1. Chave da API no CNPJ da empresa (CA-E-03) e `ANTHROPIC_API_KEY` só no serviço `worker`.
2. Base legal e transferência internacional (LGPD, art. 33) confirmadas por `juridico-contratos` (J-01).
3. Termos comerciais do provedor com a retenção aplicável e, se possível, retenção zero.
4. Registro da operação de tratamento com `compliance-governanca` (J-02).
5. Aceite formal do risco residual por `gestao-riscos` e Fabiano (J-03): nome em texto livre que chega ao provedor e
   instrução injetada que passe pela revisão humana chega ao `/construir`.
6. Teto mensal e preço do modelo definidos por Fabiano.
