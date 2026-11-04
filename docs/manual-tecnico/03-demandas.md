# 03. Demandas

| Campo | Valor |
|---|---|
| Atualizado em | 04/11/2026 (0.1.12: confirmação sem dado pessoal no evento `pedido_gerado`, no RF-21); 04/11/2026 (0.1.11: nome grudado em número, `_` ou CamelCase e o que sobra do M-1, no RF-06); 04/11/2026 (0.1.10: partes do nome do solicitante trocadas na vista mínima e o que sobra do M-1, no RF-06); 03/11/2026 (0.1.8: utilitários de minimização compartilhados com DEC, ESP e RSK e M-a fechado, no RF-06; 0.1.7: texto livre minimizado na vista mínima e na listagem do agente, no RF-06; 0.1.6: vista mínima do agente no RF-06; decisão e Pedido recusados em status final no RF-07) |
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
  aparece como `responsavel` (nome da conta ou nome do agente), nunca pelo id interno. Isso é o que a pessoa recebe; o
  agente recebe a vista mínima (abaixo).
- Nenhuma leitura de demanda traz o texto bruto.
- `PATCH /api/demandas/:id` (só pessoa): altera campos e, com `status`, faz a transição manual. Ausente = não muda;
  `null` limpa campo opcional. Sem nada a mudar, 400 "Nada foi alterado.". Tudo é conferido antes de gravar.
- **Vista mínima para quem não é pessoa** (`vistaDaDemandaPara` em `consultas.ts`; M-06, desde a 0.1.6). Vale no
  `GET /api/demandas/:id` e na resposta do `POST /api/demandas`. A pessoa recebe a vista inteira. Qualquer outro ator
  (o token de agente) recebe o objeto montado chave a chave, por lista de permissão:
  - sem as chaves `solicitanteNome` e `anexos` (a chave some, não vem `null`);
  - `responsavel` de pessoa vira `{ "tipo": "pessoa" }`, sem o nome da conta; o mesmo no `autor` de cada item de
    `especificacoes`, `pareceresRisco` e `pacotesDecisao`;
  - autor agente fica `{ "tipo": "agente", "agente": "<nome do agente>" }`;
  - desde a 0.1.7 (M-1), `titulo`, `contexto`, `descricaoProblema`, `justificativaUrgencia`, `impactoPercebido` e cada
    item de `duvidasEntrada` passam por `minimizarValor` (`src/modules/dados-pessoais/minimizar.ts`, a mesma regra da
    entrada do agente, [cap. 06](06-agentes-de-ia.md#rf-20-minimização)), com o nome do solicitante entre os trocados:
    nome, e-mail, CPF, CNPJ e telefone viram marcadores como `[nome removido]`. Campo nulo continua `null`;
  - campo novo da vista não chega ao agente sem entrar na lista.

  A listagem `GET /api/demandas` não tem esses campos para nenhum ator. Desde a 0.1.7, ela usa `listarDemandasPara`:
  quem não é pessoa recebe o `titulo` de cada item minimizado com o nome do solicitante daquele item, e nenhum ator
  recebe a chave `solicitanteNome`. O painel segue com `listarDemandas`, sem mudança. Só a pessoa recebe o texto
  original; o ator `sistema` também recebe o minimizado.
- Desde a 0.1.8 (M-a), a cópia do título e da descrição da demanda que o DEC guarda (`demandaTitulo`,
  `demandaDescricao`) e o texto livre de DEC, ESP e RSK também saem minimizados para quem não é pessoa, com o nome do
  solicitante desta demanda entre os trocados ([cap. 09](09-referencia-api.md#exemplo-ler-demanda-com-token-de-agente)).
  Os utilitários (`nomesDoSolicitante`, `textoMinimo`, `textoMinimoOuNulo`, `listaMinima`, `listaMinimaOuNula`,
  `nomesDosSolicitantes`, `nomesDaDemanda`) ficam em `consultas.ts` e são usados pelas três vistas, sem cópia.
- Desde a 0.1.10 (M-1 da revisão do 0009), a minimização troca também cada parte do nome do solicitante que, no texto,
  começa por maiúscula (`A Joana pediu` sai `A [nome removido] pediu`), em todas essas vistas. A regra está no
  [cap. 06](06-agentes-de-ia.md#rf-20-minimização). A pessoa continua recebendo o original.
- Desde a 0.1.11 (B-1 da revisão do 0011), a parte grudada em número, `_` ou CamelCase também é trocada (`Joana2` sai
  `[nome removido]2`, `@JoanaFicticia` sai `@[nome removido][nome removido]`), e o nome completo com `_` entre os
  pedaços vira um marcador só (`Joana_Ficticia`).
- Limite conhecido (pendências da 0.1.11 no [CHANGELOG](../../CHANGELOG.md)):
  - **o que sobra do M-1 da revisão do 0009 (risco residual, não bloqueia):** a troca usa só o `solicitanteNome`
    atual. O nome pode ser editado, e o DEC, a ESP e o RSK guardam o texto do momento da criação. Por isso, o nome
    antigo sai em claro para o token de agente. Também saem em claro a parte escrita toda em minúscula, o nome todo em
    maiúscula sem separador (`JOANAFICTICIA`), a parte curta grudada a outra parte que começa por ela (`AnaBelax`) e o
    nome de outras pessoas. O aceite do risco é de Fabiano e da `gestao-riscos`.

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
  ([cap. 06](06-agentes-de-ia.md#rf-16-execução-dos-agentes));
- decidir um DEC que já existia (aprovar, devolver ou arquivar) e gerar o Pedido dele dão 409, com mensagem fixa
  própria, sem gravar nada (M-08, desde a 0.1.6; [cap. 04](04-versoes-e-decisao.md#rf-13-decisão) e
  [cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)).

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
  pedido leva só ids, números e enumerações. Desde a 0.1.12 (D3 do 0013), o `pedido_gerado` grava também
  `depois: { "confirmaSemDadoPessoal": true }`, um booleano fixo, sem texto, e o histórico mostra "Gerou o Pedido de
  Construção de <DEC-id>, com a confirmação de que o texto não tem dado pessoal"
  ([cap. 05](05-pedido-de-construcao.md#rf-22-gerar-o-pedido)).
- Leitura: `GET /api/demandas/:id/historico` e o detalhe da demanda, só pessoa.
- Limite conhecido (B-04, backlog): a `referenciaDocumento` da aprovação da administradora é texto livre e fica no
  evento `aprovacao_registrada`.
