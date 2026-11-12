---
pedido: DEC-DEM-20261112-0019-v1
etapa: 06-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, 04-maestro.md, 04-correcao-engenheiro-backend.md, 04-seguranca-aplicacao.md (Pendências), 05-devops-sre.md, DEC-DEM-20261111-0016-v1/10-documentacao-tecnica.md (trecho da spec), src/modules/demandas/confirmacao.ts, src/modules/integracoes/tempo-limite.ts, src/modules/pedido-construcao/receber.ts, src/modules/pedido-construcao/entregar.ts, src/jobs/batimento.ts, src/modules/agentes/executar.ts (cabeçalho e tipos), src/db/transacao.ts (exportações), scripts/criar-token-servico.ts (trechos), src/app/(painel)/demandas/[id]/page.tsx (selo e estado), package.json, README.md, CHANGELOG.md (0.3.0 a 0.1.13), docs/manual-tecnico/README.md e cap. 01 a 06, 08, 09 e 10, docs/operacao/deploy.md (cabeçalho e trechos), docs/operacao/tokens-de-integracao.md, docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md (trechos)]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Documentação da 0.3.1 escrita a partir do código do ramo `construcao/DEC-DEM-20261112-0019-v1`, com as correções da
`03-correcao` e da `04-correcao`. O `package.json` está em `0.3.1`, e a seção `## 0.3.1 — 2026-11-12` existe no
`CHANGELOG.md` (linha 6). Nenhum token real foi escrito: os exemplos usam só `wsod_<token>`.

### Trechos conferidos e o que mudou

Achei os trechos com Grep (`CA-10.6`, `vista mínima`, `aguardaConfirmacao`, `jaConfirmada`, `sem_confirmacao`,
`limitarTempo`, `statement_timeout`, `lock_timeout`, `tempo limite`, `hash`, `sha256`, `trava`, `batimento`,
`criar-token-servico`, `Limitação conhecida`, `0.3.0`). As linhas abaixo são as do arquivo depois da edição.

| Arquivo:linha | O que mudou |
|---|---|
| `CHANGELOG.md:6` | Seção nova **0.3.1**. Ela traz: o que muda para quem usa, o que mudou na API e no código, as verificações e as pendências abertas. A spec das integrações desatualizada entra nas pendências |
| `CHANGELOG.md:226` | Notas da 0.3.0: a 0.3.0 não se publica sozinha e entra pela "Publicação conjunta 0.2.0 → 0.3.1". A seção "Publicação da 0.3.0", que era citada aqui, não existe mais no `deploy.md` |
| `CHANGELOG.md` (0.3.0) | Saiu a subseção **"Limitação conhecida"** (não emitir tokens na 0.3.0), que a 0.3.1 fecha |
| `CHANGELOG.md:354` | Pendência da 0.3.0 "0.3.1 antes dos tokens (limitação conhecida, acima)" virou "Tokens: só com a 0.3.1 no ar", sem apontar para a subseção removida |
| `README.md:5`, `:6` | Versão 0.3.1 e data |
| `README.md:45` | Parágrafo novo da 0.3.1 com quatro pontos: 404 ao agente antes da confirmação; o insumo roda depois da confirmação; o recebimento aceita só a última entrega; prazo total de 8 s e 12 s |
| `README.md:66` | A linha da spec das integrações avisa que a 0.3.1 mudou o que o manual e o CHANGELOG descrevem |
| `docs/manual-tecnico/README.md:5` | Versão do sistema 0.3.1, com o resumo e os links |
| `docs/manual-tecnico/README.md:29` | Parágrafo novo. A spec da 0.3.0 está desatualizada em três pontos, e vale o código: CA-10.6 substituído; RF-14 e ADR-26 pela última entrega; ADR-28 com o prazo total |
| `docs/manual-tecnico/README.md:125`, `:134` | Mapa do pedido 0016: RF-05, com leitura e gravação do agente fechadas, e RF-14, só com a última entrega |
| `docs/manual-tecnico/README.md:161`, `:162`, `:164`, `:165` | Glossário. "Confirmação da demanda do Awave" passa a aceitar só a de pessoa, com 404 ao agente antes dela. Termo novo "Prazo total". "Entrega e recebimento" só com a última entrega. "Vista mínima" vale na demanda do Awave só depois da confirmação |
| `docs/manual-tecnico/01-arquitetura.md:5`, `:49`, `:50` | Data. Módulo `demandas/` com a regra de visibilidade. Módulo `integracoes/` com `PRAZO_TOTAL_MS` e `comTransacao` |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:5`, `:8` | Data e fontes (`src/db/transacao.ts`, `confirmacao.ts`) |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:79-94` | "Tempo limite" reescrito em duas camadas: o piso por instrução, rodado na abertura, e o prazo total de 8 s ou 12 s. O prazo conta a espera por conexão, baixa os tempos por `set_config` e é conferido antes do COMMIT. O 201 do Awave sai de dentro da transação |
| `docs/manual-tecnico/02-acesso-e-seguranca.md:146` | Parágrafo novo na matriz. Para agente e `sistema`, a demanda do Awave não confirmada não existe: 404 nas leituras e na criação, fora das listas. Regra única `exigirVisivelPara`, com falha fechada. Substitui o CA-10.6 |
| `docs/manual-tecnico/03-demandas.md:5` | Data |
| `docs/manual-tecnico/03-demandas.md:62` | `GET /api/demandas`: a demanda não confirmada fica fora dos itens e do `total` para agente e `sistema` |
| `docs/manual-tecnico/03-demandas.md:74` | `GET /api/demandas/:id`: 404 ao agente e ao `sistema` |
| `docs/manual-tecnico/03-demandas.md:154` | Criação pelo Awave. O 503 sai também pelo prazo total. A vista do 201 é lida dentro da transação (M-2), sem duplicata na nova tentativa |
| `docs/manual-tecnico/03-demandas.md:185`, `:190` | Confirmação. Passo 5 com `dispararOuReenfileirar`. Só o evento de ator `pessoa` conta (B-3) |
| `docs/manual-tecnico/03-demandas.md:194-222` | "Nenhum agente de IA antes da confirmação" reescrito com três lugares: a API (M-1, todas as rotas, a ordem antes do status final e do limite, e as listas por SQL), o disparo e o worker. No worker, a execução volta a `pendente` sem gastar a chave e é reenfileirada na confirmação. Risco residual BR-3 |
| `docs/manual-tecnico/04-versoes-e-decisao.md:5`, `:15` | Data. Ordem da criação: trava → recusa da demanda não confirmada (404, só agente e `sistema`) → status final → limite |
| `docs/manual-tecnico/05-pedido-de-construcao.md:5` | Data |
| `docs/manual-tecnico/05-pedido-de-construcao.md:288-302` | Entrega. Orçamento de 10 s por instrução e prazo total de 12 s. Passo 0 novo com `travarPedido`, a mesma trava do recebimento. O passo 3 grava quando o hash difere da última entrega (X → Y → X grava três) |
| `docs/manual-tecnico/05-pedido-de-construcao.md:309-327` | Recebimento. Prazo de 8 s e a mesma trava da entrega, com a leitura dos hashes depois de travar. Tabela: 409 para hash que não é o da **última** entrega e 204 só para ela. Parágrafo do que mudou desde a 0.3.0 |
| `docs/manual-tecnico/05-pedido-de-construcao.md:353` | RF-23: `listarPacotesPara`. Pessoa vê todos. Agente e `sistema` não veem o DEC de demanda não confirmada, nem no `total` (A-1). Integração recebe 403 |
| `docs/manual-tecnico/06-agentes-de-ia.md:5`, `:27` | Data. O token de agente não lê nem grava na demanda não confirmada |
| `docs/manual-tecnico/06-agentes-de-ia.md:47-64` | RF-16. Passo "3a" novo (`demandaDaChave`, falha fechada `entrada_nao_encontrada`). O passo "3c" passou a usar `adiarAteConfirmacao`: confere de novo sob a trava, devolve a `pendente` sem contar a tentativa e responde `aguardando_confirmacao`. A confirmação reenfileira a execução |
| `docs/manual-tecnico/06-agentes-de-ia.md:95-108` | Batimento. Não reenfileira a pendente que espera a confirmação, nem a adiada de agente indisponível (A-3). O O-2 fica registrado |
| `docs/manual-tecnico/08-painel.md:5`, `:256` | Data. `estadoDaConfirmacao` só aceita a confirmação de pessoa (M-d). O selo e a linha 14 da Próxima ação saem do mesmo estado (conferido em `page.tsx:412` e `:451`) |
| `docs/manual-tecnico/09-referencia-api.md:5` | Data |
| `docs/manual-tecnico/09-referencia-api.md:57` | Parágrafo novo sob a tabela de rotas. Para agente, a demanda não confirmada e os artefatos dela dão 404, e ficam fora das listas. Nos `POST`, o 404 vem antes do 409 e do 429 |
| `docs/manual-tecnico/09-referencia-api.md:135`, `:142` | Exemplo do `/construir`: o 409 vale também para o hash de entrega anterior, e o prazo total dá 503 |
| `docs/manual-tecnico/09-referencia-api.md:345`, `:347`, `:353` | Tabela de erros. O 404 cobre a demanda não confirmada para o agente. O 409 do recebimento vale para o hash que não é o da última entrega. O 503 cobre também o prazo total |
| `docs/manual-tecnico/10-configuracao-e-scripts.md:5`, `:48` | Data. `criar-token-servico.ts` sem caminho de sucesso sem emissão (B-2), com a mensagem fixa |
| `docs/operacao/tokens-de-integracao.md:5`, `:6`, `:27-30` | Versão 0.3.1 e data. A "Limitação conhecida da 0.3.0" virou a regra de emitir os tokens só com a 0.3.1 no ar. Na volta para a 0.3.0, desligar a busca e revogar o token `awave`, como na seção 6 do `deploy.md` |
| `docs/operacao/deploy.md:5`, `:10` | Versão 0.3.1, o campo que a `05-devops-sre.md` deixou para esta etapa, e a linha "Atualizado em" |

O `deploy.md` não contradiz o código: a 0.3.1 não muda `Dockerfile`, workflow nem variável (`05-devops-sre.md`). Não há
motivo para devolver à `05-entrega`.

### Links internos

Conferi cada link novo contra o arquivo e o título de destino:
- `03-demandas.md#demanda-aberta-pelo-awave-030`, `#rf-04-ids`;
- `05-pedido-de-construcao.md#recebimento-confirmar_recebimento_pedido`;
- `02-acesso-e-seguranca.md#atores-de-integração-030`;
- `06-agentes-de-ia.md#rf-16-execução-dos-agentes`;
- `08-painel.md#demanda-t05-rf-08-a-rf-10`;
- `09-referencia-api.md#erros`;
- `../../CHANGELOG.md`, `docs/operacao/tokens-de-integracao.md` e `deploy.md`.

Todos existem.

## Decisões tomadas

- Li também `04-maestro.md`, `04-correcao-engenheiro-backend.md` e as Pendências de `04-seguranca-aplicacao.md`, que
  não estão na lista **Lê** da `06`. A correção da revisão mudou comportamento que o manual tem de descrever: a lista
  de DEC filtrada (A-1), o prazo aplicado depois do piso (A-2), a execução adiada que espera o agente voltar (A-3) e a
  confirmação só de pessoa na tela (M-d). Foi só leitura.
- O manual diz 404 na criação de ESP, RSK e DEC, e não o 409 do texto da spec do pedido. O código faz 404, pela decisão
  P3 da triagem. O manual descreve o código (padrão técnico, seção 11), e a diferença está explicada no CHANGELOG.
- A "limitação conhecida" saiu das notas da 0.3.0 e do `tokens-de-integracao.md`, como o maestro pediu. A pendência da
  0.3.0 que apontava para ela foi reescrita, para não deixar referência quebrada.
- Também corrigi, nas notas da 0.3.0, a citação à seção "Publicação da 0.3.0" do `deploy.md`. A `05-entrega` trocou essa
  seção pela "Publicação conjunta 0.2.0 → 0.3.1".
- O prazo total entrou no glossário como termo próprio, porque aparece em quatro capítulos com o mesmo sentido.
- Não escrevi o número de linha do código nos capítulos, só o nome da função. Linha de código muda a cada versão.

## Pendências

- **A spec do sistema não foi editada.** O maestro pediu, mas
  `docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md` não está na minha lista **Pode**
  (`README.md`, `CHANGELOG.md`, `docs/manual-tecnico/`, `docs/operacao/`). Segui o mesmo caminho da 0.1.13: a
  atualização fica com o maestro, na Parada 3, e o manual e o CHANGELOG já registram que vale o código. Trechos e texto
  proposto:
  - `:54` (RF-10): acrescentar "Desde a 0.3.1 (M-1 do 0019), agente e `sistema` não leem nem gravam demanda do Awave
    sem confirmação de pessoa: 404 igual ao da inexistente nas leituras e na criação de ESP, RSK e DEC, fora de
    `GET /api/demandas` e `GET /api/pacotes-decisao`; substitui o CA-10.6";
  - `:58` (RF-14): trocar "409 se não bate" por "409 se não é o hash da última entrega (inclusive um entregue antes)";
  - `:139` (C09) e `:223` (ADR-26): trocar "`pedido_entregue` … só na primeira entrega de cada hash" e "entregue e
    recebido gravados uma vez por hash" por "`pedido_entregue` quando o hash difere do da última entrega; entrega e
    recebimento sob a mesma trava `pedido:<decId>`";
  - `:198`: trocar "hash diferente de todo `pedido_entregue` do DEC" por "hash diferente do da última entrega";
  - `:203-204` e `:225` (ADR-28): acrescentar "prazo total da transação, 8 s (12 s na entrega), contando a espera por
    conexão; os `SET LOCAL` são o piso".
- Para Fabiano e as outras áreas, as pendências estão no `CHANGELOG.md`, seção 0.3.1, "Pendências abertas":
  - antes do merge: segredos de webhook, Auto Deploy, `:v0.2.0` e GHCR;
  - a publicação conjunta e depois os tokens;
  - o risco residual BR-3;
  - as dívidas O-1, códigos 6, 8, 9 e 10 e o O-2;
  - os testes de tempo a observar no CI;
  - os baixos B-4 a B-7 do 0016.
- As capturas do cap. 08 continuam as da 0.2.0. A 0.3.1 não muda tela, fora a regra da seção de confirmação, que não
  aparece em captura.
- O texto do `pedido.json` não traz instrução fora do escopo. Nada a registrar.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (06) o `CHANGELOG.md` tem a entrada da versão do `package.json` (0.3.1), com o que foi corrigido e as pendências abertas
- [x] (06) todo trecho de `README.md` e `docs/manual-tecnico/` que cita a função, o arquivo ou o RF corrigido descreve o código depois da correção (trechos achados com Grep e listados na entrega)
- [x] os links internos apontam para arquivos que existem
