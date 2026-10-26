---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T15-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 1 a 12), tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T15), 06-T15-engenheiro-backend.md, commit def1fa7, src/modules/demandas/schemas.ts, src/modules/demandas/schemas.test.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/servico.ts, src/modules/demandas/servico.test.ts, src/modules/demandas/consultas.ts, src/modules/demandas/consultas.test.ts, src/modules/limites.ts, src/modules/limites.test.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/historico/registrar.ts, src/modules/versoes.ts, src/modules/acesso/ator.ts, src/lib/erros.ts, src/db/schema/demandas.ts, src/db/schema/versoes.ts, src/db/schema/decisao.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T15 (serviço de demanda), commit `def1fa7`. **Nenhum problema Critical ou Important.** A tarefa passa.
Os achados abaixo são Minor e vão para Pendências (seção 12 do padrão técnico).

### Conferência contra o plano

- **Arquivos:** o commit cria exatamente os 11 arquivos que a T15 lista. Fora deles, só a entrega do engenheiro e a
  linha do maestro em `passagens.jsonl`. Nenhum arquivo existente mudou.
- **Interfaces:** batem com o plano. As diferenças são os desvios 1 a 6 da entrega, julgados abaixo.
- **Regras:**
  - as transições manuais e automáticas são as do plano, sem diferença na tabela;
  - os motivos de CA-07.1, CA-07.2 e CA-07.5 são os do plano, palavra por palavra;
  - `criarDemanda` segue esta ordem: `autorizar`, `conferirLimite`, `proximoIdDemanda`, insert, evento;
  - `alterarDemanda` confere tudo antes do primeiro `UPDATE`.
- **Rodado por mim, no commit `def1fa7`:**
  - `pnpm typecheck` e `pnpm lint` limpos;
  - `pnpm test`: 79 de 79 arquivos e 1297 de 1297 testes.

### Checklist da seção 12

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; nada fora da tarefa mudou | Cumprido. A trava consultiva (desvio 5) passa do plano, mas é o que faz o limite de C-36 valer sob concorrência. Fica aceita |
| Teste para cada comportamento novo, que falharia sem o código | Cumprido. A falha antes do código está na entrega (`Cannot find module` nos 5 arquivos). Os testes de integração afirmam efeito no banco: linha, evento e sequência que não anda. Não afirmam só o retorno. A concorrência é provada com 35 criações simultâneas e com a espera vista em `pg_stat_activity` |
| Sem segredo, `.env` ou dado pessoal real | Cumprido. Nomes "Pessoa Ficticia", domínio `.test` e sentinelas `SENTINELA-*` |
| Entrada externa validada com Zod; erro sem vazar detalhe | Cumprido. Os schemas não têm campo de autoria e não usam `.passthrough()` nem `.loose()`. O teste confere que o erro mapeado não traz o valor recebido. `ErroDominio` sai só com mensagem pt-BR |
| Banco: migration, migrator, RLS e guarda | Não se aplica: a T15 não tem migration. Um teste prova que o papel do app grava só as colunas permitidas pela T05 |
| Nada duplica função que já existe | Cumprido para o que já existia: a T15 reaproveita `travarDemanda`, `proximoIdDemanda`, `registrarEvento`, `mudancaDeCampo` e `autorizar`. Dentro da própria tarefa há uma duplicação pequena (achado M-01) |
| Textos em pt-BR; axe | Textos em pt-BR. O axe não se aplica, porque a T15 não tem tela |
| Minor em Pendências; só Critical e Important bloqueiam | Cumprido. Não há Critical nem Important, e os Minor estão abaixo |
| `/code-review` e `/security-review` no PR | É da `08-revisao`, não desta etapa |

### Desvios declarados pelo engenheiro

1. **`Pick<Deps, ...>` nas dependências.** Aceito. Quem passa `Deps` continua servindo, e a T27 e a T28 chamam o
   serviço sem auth e sem fila.
2. **`null` limpa campo opcional em `alterarDemandaSchema`.** Aceito. Sem isso, a T06 (Editar dados) não teria como
   apagar um valor. Os campos obrigatórios, `anexos` e `status` continuam recusando `null`, e há teste disso.
3. **`DemandaVista` sem `autorTipo` e `autorId`, com `responsavel` no lugar.** Aceito. O plano já define `responsavel`
   e, assim, o id interno da conta não sai da API. Quem usa a vista, da T16 em diante (T40 e T24), deve usar
   `responsavel`.
4. **Insert campo a campo.** Aceito. É mais seguro que `...entrada` para C-11, e há teste disso.
5. **Trava consultiva por ator e tipo.** Aceita. Sem ela, o limite seria ultrapassado por corrida. A chave usa
   `hashtextextended` com parâmetro, sem `sql.raw`. Uma colisão de hash só faria um ator esperar outro.
6. **`desatualizado.ts` sem teste próprio.** Aceito. A cobertura vem de `servico.test.ts` (ESP v2, RSK v2 e DEC de
   outra demanda) e de `consultas.test.ts`.

### Pareceres (todos Minor)

- **M-01:** `src/modules/demandas/servico.ts:44` e `src/modules/limites.ts:29`.
  - **Problema:** a regra que converte ator em autoria (`autorTipo`, `autorId`) existe em duas cópias, as duas com o
    nome `autoriaDo`. `colunasDoAtor`, em `registrar.ts:71`, é uma terceira variante.
  - **Razão:** C-36 só funciona se o limite contar pela mesma autoria que o insert grava. Hoje o teste de C-36 do
    serviço pegaria uma divergência. Mas a T18, a T19 e a T20 vão gravar autoria de ESP, RSK e DEC e, sem uma função
    única, tendem a criar a quarta cópia.
- **M-02:** `src/modules/demandas/consultas.ts:61`.
  - **Problema:** `throw new Error('autoria desconhecida')` fora de `ErroDominio`.
  - **Razão:** G3.6 pede só `ErroDominio` na regra de negócio. Aqui, porém, o caso é de invariante quebrada (linha
    corrompida), e o mapeador já transforma em 500 genérico sem detalhe. O efeito está certo. Só a forma diverge da
    convenção, que pede um comentário ou um erro interno nomeado.
- **M-03:** `src/modules/demandas/schemas.ts:89-90`.
  - **Problema:** `z.coerce.number()` aceita `offset=` (vazio) como 0, e também `limit=0x10` ou `limit=1e1`, como 16 e
    10.
  - **Razão:** não há risco, porque o valor final fica dentro dos limites. Mas a query aceita formas que a 03 não
    prevê. Se a T16 quiser recusar, basta trocar por uma regex de dígitos antes da conversão.
- **M-04:** `src/modules/demandas/transicoes.ts:32` e `src/modules/limites.ts:19-22`.
  - **Problema:** o motivo genérico de transição fora da tabela e os dois textos de 429 não vêm da 03.
  - **Razão:** G3.11 pede os textos da 03 por inteiro. Esses três não existem lá. O engenheiro declarou isso e
    deixou cada um numa constante só.
- **M-05:** `src/modules/pacotes-decisao/desatualizado.ts:9`.
  - **Problema:** a expressão se correlaciona com `pacote_decisao` pelo nome da tabela, sem alias.
  - **Razão:** uma consulta da T20 ou da T21 que dê alias a `pacote_decisao`, ou que a junte duas vezes, quebraria a
    expressão sem aviso de tipo. O engenheiro já registrou isso para a T20.

## Decisões tomadas

- **Status `pronto`:** nenhum achado é Critical ou Important. Os cinco são Minor e ficam com as tarefas que já vão
  tocar o código.
- **Os 6 desvios foram aceitos:** cada um estreita a exposição de dado ou fecha uma corrida, sem mudar o contrato que
  a T16 consome.
- **A janela móvel de uma hora (C-36) foi aceita:** é mais estrita que a hora cheia do relógio e atende o teste do
  plano.
- **A edição de campos em demanda `entregue` ou `encerrada` não virou achado:** o plano não proíbe. Fica como pergunta
  para a `07-qa-funcional`.
- **Validação do commit:** rodei a suíte inteira e não me apoiei só na entrega. Assim, a revisão vale para o commit
  `def1fa7`.

## Pendências

- **T18 (M-01):**
  - extrair a conversão de ator em autoria para uma função única, por exemplo `autoriaDoAtor`, em
    `src/modules/acesso/`;
  - usar essa função em `servico.ts`, `limites.ts` e nos serviços de ESP, RSK e DEC;
  - manter o teste de C-36 do serviço como guarda.
- **T18 a T20:** chamar `conferirLimite(tx, ator, 'artefato', relogio)` dentro da transação e depois de
  `travarDemanda`, como a entrega da T15 descreve, para não abrir caminho a deadlock.
- **T20 (M-05):** se a consulta der alias a `pacote_decisao`, receber a tabela como parâmetro de
  `expressaoDesatualizado`.
- **T16:**
  - estreitar `Ator` para `AtorPessoa` antes de chamar `alterarDemanda`;
  - decidir se `filtroDemandasSchema` recusa número fora do formato decimal (M-03);
  - usar `responsavel` da vista, e não autoria.
- **T28:** depois de `criarDemanda(..., { duvidasEntrada })`, chamar
  `mudarStatusPeloSistema(t, deps, id, 'duvida_em_aberto')` na mesma transação.
- **M-02:** trocar o `Error` cru de `consultas.ts:61` por um erro interno nomeado, ou deixar comentário explícito de
  invariante, na próxima tarefa que tocar `consultas.ts` (T20).
- **`ux-ui-design`, `07-qa-funcional` ou `08-revisao` (M-04):** confirmar ou trocar os dois textos de 429 e o motivo
  genérico de transição. São as constantes `MENSAGEM_LIMITE` e `MOTIVOS_TRANSICAO.foraDaTabela`.
- **`07-qa-funcional`:** decidir se demanda `entregue` ou `encerrada` ainda aceita edição de campos (hoje aceita) e,
  se não aceitar, levar a regra de volta ao plano.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat def1fa7815907f9d3d5b76ae9cbf8a0a3101babf` — 13 arquivos: os 11 da T15, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — HEAD em `def1fa7`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 79 de 79 arquivos, 1297 de 1297 testes

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
