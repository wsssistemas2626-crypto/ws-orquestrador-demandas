---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T11-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T11), 06-T11-engenheiro-backend.md, commit dc2ba51 (diff de src/), src/modules/pedido-construcao/conferir.ts, src/app/api/pedidos-construcao/entrega.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T11 (entrega ao `/construir` e rota de pendentes), commit `dc2ba51`. Não há Critical nem Important. A
tarefa passa para a `06-T11-testes`.

### O que foi conferido

| Ponto | Resultado |
|---|---|
| Arquivos da tarefa | Os quatro arquivos novos do plano: `entregar.ts`, `pendentes/route.ts`, `[decId]/entrega/route.ts` e `entrega.test.ts`. Fora da lista mudou só `pendentes.ts:17`: `const RE_SHA256` passou a `export const`, e a regex é a mesma. Foi o que pedi no Minor 1 da 06-T10-revisao. Aceito como desvio declarado: o G7 continua valendo, porque `entregar.ts` exporta `RE_SHA256` |
| Código contra o plano (passo 3 da T11) | `entregar.ts` e as duas rotas seguem o esboço linha a linha. A única diferença é a reexportação acima. `pendentesPara` usa o orçamento `padrao` e não aceita `t`. `entregarPedido` usa o orçamento `entrega`, e as rotas não passam `t` (06-T04) |
| IN-10 | `pedidoGeradoPorPessoa` vem antes da conferência. O DEC sem `pedido_gerado` e o DEC com `pedido_gerado` gravado por agente devolvem o mesmo `ErroDominio('nao_encontrado')` do DEC inexistente. O teste compara os corpos byte a byte e falharia sem a guarda, porque a conferência sozinha daria 200 |
| IN-12 e P-02 | O hash gravado é o do servidor, `{ sha256 }`, com `antes` nulo. Há um evento por hash, e `shasEntregues` é lido depois de `conferirEMontarPedido`, isto é, sob o `travarDemanda` (`conferir.ts:60`). Por isso as três entregas simultâneas gravam um evento só. O teste concorrente falharia sem essa ordem. O DEC recusado (CA-13.4) e o entregue continuam em `pendentes` |
| IN-14 | O teste trava a demanda por outra conexão. A resposta é 503 com `MENSAGEM_INDISPONIVEL` e nenhum evento, e depois que a trava sai a entrega passa. Isso prova que a rota abre a transação com o orçamento de entrega |
| CA-09.3, CA-12.6, CA-13.1 a CA-13.6 | Os casos do passo 1 do plano estão todos no teste, pela rota real, com Bearer e sem `Origin`. Na entrega, o `POST` vai sem corpo e sem `content-type`. Também estão no teste os cabeçalhos `nosniff` e `no-store`, a falta de CORS e de `content-disposition`, os bytes iguais aos de `gerarPedido` e o `validarPedido` do vendor |
| CA-03.3 e CA-03.4 | Só o `construir` acessa: `awave` recebe `sem_permissao` no serviço e 403 nas duas rotas. Os laços de matriz × rotas pegaram as rotas novas sem mudança, com 194 de 194 nos três arquivos |
| G3.3 e dado fictício | O token é gerado em tempo de teste e não aparece em nenhum `expect`. O prefixo escrito à mão é `ficticio` e os nomes são fictícios. Não há segredo, `.env` nem dado real |
| G3.10 e RNF-04 | O serviço não grava log próprio. O teste confere que as duas linhas de `rota()` não levam `decId`, hash, prefixo nem token, e que o `atorTipo` é `integracao` |
| Validação de entrada | `decId` passa por `paramId.versao('decId', 'DEC')` antes de tudo. A entrega não declara corpo e a lista não lê query. 404, 409, 422 e 503 têm mensagem fixa, e o 422 traz só o caminho e o tipo |
| Duplicação | Nada duplicado. A conferência e a montagem são as de `conferir.ts` (T09), as leituras são as de `pendentes.ts` (T10) e a regex tem uma fonte só. O `sha` local do teste é um oráculo independente e é bom que fique separado |
| G4 | O `git diff --stat a9fd9b8 dc2ba51` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio |
| IN-16 | O commit não toca nenhum teste existente, só cria `entrega.test.ts`. Nada no piso do D-17 mudou |
| Banco | Sem migration, GRANT, tabela ou índice nesta tarefa |
| Interface | Esta tarefa não tem tela |

### Pareceres (Minor, não bloqueiam)

1. `src/app/api/pedidos-construcao/entrega.test.ts:197`. **Problema:** `sha256DoPedido('ação')` é comparado com
   `sha('ação')`, e o ajudante usa o mesmo `createHash(...).update(texto, 'utf8')` da função testada. **Razão:** a
   asserção é tautológica e não pegaria uma troca de codificação feita igual nos dois lados. O vetor do texto vazio, na
   linha 196, já cobre o formato. Se alguém tocar o arquivo, a troca é pelo vetor fixo do SHA-256 de um texto com acento.
2. `src/app/api/pedidos-construcao/entrega.test.ts:283`. **Problema:** o título diz "IN-11 na entrega", mas o IN-11 é a
   idempotência do recebimento (T12). O que este caso prova é o P-02 e o IN-12 sob concorrência. **Razão:** o rótulo
   errado atrapalha a rastreabilidade quando a 08 e a 10 procurarem a cobertura do IN-11. Se alguém tocar o arquivo,
   troque por "P-02 sob concorrência".

## Decisões tomadas

- Aceito o desvio 1 (`export` em `pendentes.ts`): a regex fica numa fonte só e `shasEntregues` concorda com a entrega,
  sem import circular e sem mudar comportamento.
- Aceito o `throw new Error` do hash fora do formato. É inalcançável, o plano o prevê e, se acontecer, vira 500
  genérico, que é falha fechada.
- Aceito que `pedidoGeradoPorPessoa` rode antes da trava. O evento `pedido_gerado` nunca é apagado, então não há corrida
  entre a conferência e a trava.
- Os dois pareceres são Minor (seção 12 do padrão). Ficam em Pendências e não exigem nova volta da tarefa.

## Pendências

- Minor 1 e 2 acima, para quem tocar `entrega.test.ts` (a `06-T11-testes` ou a T13).
- Para a `06-T11-testes`: pela rota `GET /pendentes`, ficaram os casos que a 06-T10-qa pediu: o DEC devolvido com
  `pedido_gerado` de pessoa fica fora, e o recebido sobre a entidade `demanda` continua.
- Para a T12: importar `RE_SHA256` de `./entregar` ou de `./pendentes`, sem declarar outra regex.
- Para a T13: continua aberto o parecer 4 da 06-T03-revisao (o "nada gravado" de `test/matriz-rotas.test.ts` depende de
  ordem).
- As caixas da T11 no plano ficam com o maestro (G1).
- Glob e Grep não estavam disponíveis nesta sessão. Li os arquivos com Read e pelos comandos de git da lista abaixo.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat dc2ba51e413bcbdb2f8e3ea7ca8ed068bbdbc799~1 dc2ba51e413bcbdb2f8e3ea7ca8ed068bbdbc799` — 7 arquivos: 4 novos da tarefa, `pendentes.ts` (+2 −1), a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff dc2ba51e413bcbdb2f8e3ea7ca8ed068bbdbc799~1 dc2ba51e413bcbdb2f8e3ea7ca8ed068bbdbc799 -- src` — diff de código lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — HEAD em dc2ba51
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 dc2ba51e413bcbdb2f8e3ea7ca8ed068bbdbc799 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/entrega.test.ts` — 20 de 20
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/matriz-rotas.test.ts test/matriz-rotas-qa.test.ts test/matriz-rotas-integracoes-qa.test.ts` — 194 de 194
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
