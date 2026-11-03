# 03. Demandas

| Campo | Valor |
|---|---|
| Atualizado em | 03/11/2026 (0.1.5: status final no RF-07) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-03 a RF-07, RF-15, RF-21; RNF-04, RNF-09 |
| Fontes no código | `src/modules/demandas/` (`schemas.ts`, `servico.ts`, `consultas.ts`, `entrada.ts`, `entradas-pendentes.ts`, `texto-recebido.ts`, `gerar-id.ts`, `transicoes.ts`), `src/modules/historico/`, `src/modules/limites.ts` |

## RF-03. Criar demanda

- Pelo painel (`/demandas/nova`) ou por `POST /api/demandas` (pessoa com 2FA ou token do agente `orquestrador`).
- Corpo (`criarDemandaSchema`): `titulo`, `tipo` e `solicitanteNome` obrigatórios; `solicitantePapel`,
  `linhaServicoProvavel`, `urgencia`, `justificativaUrgencia`, `contexto`, `descricaoProblema`, `impactoPercebido` e
  `anexos` opcionais.
- Enumerações:
  - `tipo`: `bug`, `melhoria`, `novo_projeto`, `estudo`, `produto_proprio`;
  - `linhaServicoProvavel`: `sob_medida`, `automacao_integracao`, `ia_controle_humano`, `diagnostico_sustentacao`,
    `indefinida`;
  - `urgencia`: `baixa`, `media`, `alta`.
- Limites (RNF-04): campo de texto até 10.000 caracteres; lista até 50 itens; nome até 200. Anexo é só referência: o
  servidor nunca busca a URL.
- A demanda nasce `nova`. Com o agente `insumo_tecnico` ligado e sem suspensão por teto, a execução dele entra na
  mesma transação ([cap. 06](06-agentes-de-ia.md)).
- Limite por ator: 30 demandas por hora; acima, 429 (`src/modules/limites.ts`).

## RF-04. Ids

- Demanda: `DEM-AAAAMMDD-NNNN`. A data é a civil de São Paulo; o número vem da sequência **global** `demanda_seq`
  (sem reinício diário). A sequência vai até 9.999: o painel avisa a partir de 9.000 demandas, e a 10.000ª responde
  409 `capacidade_de_ids_esgotada` (RNF-09). Número gasto numa transação desfeita não volta: buraco é aceito,
  repetição não.
- ESP, RSK e DEC: `ESP-<id da demanda>-vN`, `RSK-<id da demanda>-vN`, `DEC-<id da demanda>-vN`. A próxima versão é
  calculada sob a trava da linha da demanda (`src/modules/versoes.ts`), então duas gravações ao mesmo tempo não
  repetem número.

## RF-05. Entrada colando o texto

`POST /api/demandas/entrada` ou `/demandas/nova` (só pessoa). O texto colado vai até 100.000 caracteres e é guardado
como chegou, sem `trim`. Dois modos (`entradaSchema`):

| Modo | O que acontece |
|---|---|
| `manual` | A pessoa cola o texto e preenche os campos da demanda. Demanda e texto bruto nascem na mesma transação; o texto vai para `entrada_bruta`, nunca para a demanda |
| `agente` | O texto e o nome do solicitante vão para `entrada_pendente`, e o agente `orquestrador` propõe os campos. A demanda nasce quando ele termina. Com o orquestrador desligado ou suspenso pelo teto, 409 com "O agente orquestrador está desligado. Preencha os campos abaixo." ou "Agentes suspensos pelo teto de gasto. Preencha os campos abaixo." |

- `origem` opcional: `canal` (`email`, `mensagem`, `formulario`, `outro`) e `referencia` (até 500 caracteres).
- Entrada pendente que falhou no agente (ou foi ignorada) fica `falhou`; a fila do painel lista as que aguardam, e a
  pessoa preenche à mão a partir dela (`entradaPendenteId`). A pendente é apagada quando vira demanda.
- **O texto bruto é dado pessoal de terceiro.** Só uma pessoa o lê, no detalhe da demanda (`ler_texto_bruto`), com a
  data em que será apagado. Nenhuma rota da API devolve o texto bruto, e ele não vai para histórico nem log. O expurgo
  está no [cap. 07](07-worker-avisos-retencao.md#rf-24-expurgo-do-texto-bruto).

## RF-06. Consultar e alterar

- `GET /api/demandas`: filtros `status`, `tipo` e `linhaServicoProvavel`; `limit` de 1 a 100 (padrão 20) e `offset`.
  A resposta traz `total`. Chave repetida na query é recusada.
- `GET /api/demandas/:id`: a demanda, as listas de versões de ESP, RSK e DEC (com `statusDecisao` e `desatualizado`
  em cada DEC), as dúvidas da entrada e `agentesEmAndamento` (execuções `pendente` ou `em_andamento`). A autoria
  aparece como `responsavel` (nome da conta ou nome do agente), nunca pelo id interno.
- Nenhuma leitura de demanda traz o texto bruto.
- `PATCH /api/demandas/:id` (só pessoa): altera campos e, com `status`, faz a transição manual. Ausente = não muda;
  `null` limpa campo opcional. Sem nada a mudar, 400 "Nada foi alterado.". Tudo é conferido antes de gravar.
- Limite conhecido (M-06, aberto): o token de agente lê `solicitanteNome`, `anexos` e o nome da conta autora pela API.

## RF-07. Status e transições

Nove status. As transições manuais são só de pessoa, pelo `PATCH`; as automáticas são do ator `sistema`.

| De | Manual para |
|---|---|
| `nova` | `em_analise`, `encerrada` |
| `em_analise` | `aguardando_informacao`, `encerrada` |
| `aguardando_informacao` | `em_analise`, `encerrada` |
| `pronta_para_decisao` | `em_analise`, `aprovada`, `encerrada` |
| `aprovada` | `em_construcao`, `encerrada` |
| `em_construcao` | `entregue`, `devolvida` |
| `devolvida` | `em_construcao`, `em_analise` |
| `entregue`, `encerrada` | nenhuma (status final) |

Regras extras da manual: ir para `aprovada` exige um DEC aprovado e não desatualizado na demanda; tipo `estudo` não
vai para `em_construcao`. Recusa dá 409 com o motivo.

Os status finais são os que não têm transição manual de saída: `entregue` e `encerrada`. A lista sai da própria tabela
de transições (`STATUS_FINAIS` e `ehStatusFinal` em `transicoes.ts`), sem segunda lista em outro módulo. Numa demanda em
status final:

- criar ESP, RSK ou DEC, pela pessoa ou pelo agente, dá 409 com a mensagem fixa (`MENSAGEM_DEMANDA_FINAL`,
  [cap. 04](04-versoes-e-decisao.md));
- a execução de agente que já estava na fila termina `ignorada`, sem chamar o provedor
  ([cap. 06](06-agentes-de-ia.md#rf-16-execução-dos-agentes)).

Decidir um DEC que já existia e gerar o Pedido dele **não** conferem o status da demanda nesta versão (pendência da
0.1.5 no [CHANGELOG](../../CHANGELOG.md)).

| Automática | Quando | De | Para |
|---|---|---|---|
| `duvida_em_aberto` | ESP gravada com dúvida | `nova`, `em_analise`, `pronta_para_decisao` | `aguardando_informacao` |
| `dec_criado` | DEC gravado | `nova`, `em_analise`, `aguardando_informacao` | `pronta_para_decisao` |
| `decisao_devolvida` | DEC devolvido | `nova`, `aguardando_informacao`, `pronta_para_decisao` | `em_analise` |
| `decisao_arquivada` | DEC arquivado | `nova`, `em_analise`, `aguardando_informacao`, `pronta_para_decisao` | `encerrada` |

Fora da origem permitida, a automática não faz nada nem grava evento. **A aprovação do DEC não muda o status**
(P1-d): a tela de decisão lembra de mudar à mão. Os status `aprovada`, `em_construcao`, `entregue` e `devolvida` mudam
à mão nesta versão, porque o andamento do `/construir` não volta para cá.

## RF-15. Dúvida em aberto

- ESP gravada com `duvidasEmAberto` não vazia leva a demanda a `aguardando_informacao` (transição `duvida_em_aberto`).
- As perguntas que o agente orquestrador propõe ao solicitante vão para as dúvidas da entrada da demanda
  (`duvidasEntrada`) e levam ao mesmo status.
- **Nenhuma mensagem sai para o solicitante.** O sistema não tem envio a cliente; o único e-mail é o aviso interno de
  DEC pronto ([cap. 07](07-worker-avisos-retencao.md#rf-25-aviso-por-e-mail)).

## RF-21. Histórico

- Tabela `evento`, só de inclusão: o papel da aplicação não tem `UPDATE` nem `DELETE` nela. Falha ao gravar o evento
  desfaz a transação inteira.
- Cada evento tem ator (`pessoa` com a conta, `agente` com o nome do agente, `sistema`), entidade, ação e data do
  relógio injetado.
- Ações: `demanda_criada`, `status_alterado`, `campo_alterado`, `especificacao_criada`, `parecer_risco_criado`,
  `pacote_decisao_criado`, `aprovacao_registrada`, `decisao_registrada`, `agente_ligado`, `agente_desligado`,
  `teto_alterado`, `suspensao_por_teto`, `agente_ignorado`, `falha_agente`, `pedido_gerado`, `texto_expurgado`,
  `entrada_pendente_expurgada`, `2fa_ativado`, `2fa_desativado`, `conta_criada`, `conta_desativada`, `token_criado`,
  `token_revogado`.
- **Sem dado de terceiro** (C-30): a mudança de campo guarda o valor só de `tipo`, `status`, `solicitantePapel`,
  `linhaServicoProvavel` e `urgencia`. Qualquer outro campo vira `{ "alterado": true }`. Evento de ESP, RSK, DEC e
  pedido leva só ids, números e enumerações.
- Leitura: `GET /api/demandas/:id/historico` e o detalhe da demanda, só pessoa.
- Limite conhecido (B-04, backlog): a `referenciaDocumento` da aprovação da administradora é texto livre e fica no
  evento `aprovacao_registrada`.
