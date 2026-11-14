---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T02-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 5 a 12), 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T02), 04-seguranca-aplicacao.md (SB-02 a SB-06), 06-T01-tech-lead.md, 06-T01-qa-automacao.md (cabeçalho), 06-T02-engenheiro-backend.md, git show c274715, src/modules/pedido-construcao/situacao.ts, src/app/api/pedidos-construcao/[decId]/situacao/route.ts, src/modules/pedido-construcao/situacao.test.ts, src/app/api/pedidos-construcao/situacao.test.ts, src/app/api/pedidos-construcao/situacao-403.test.ts, test/transversal/sentinelas-situacao.test.ts, test/estatico/situacao.test.ts, test/estatico/piso-de-assercoes.test.ts (diff), test/pedidos-construcao.ts (diff), src/modules/integracoes/tempo-limite.ts, src/modules/pedido-construcao/pendentes.ts (pedidoGeradoPorPessoa), test/deps.ts (pool), saída do pnpm test em /tmp]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T02 (serviço `situacaoDoPedido` e rota `GET /api/pedidos-construcao/[decId]/situacao`; RF-01, CA-01.1 a
CA-01.6, SB-01 c, SB-02 a SB-06), commit `c274715`. **Aprovada.** Não há problema Critical nem Important. Os quatro
Minor estão abaixo e em Pendências. O M1 vai para a `06-T02-testes` com instrução.

**O que conferi**

- **Escopo (plano T02, G1 e G4):** o `--stat` do commit tem os dois arquivos de produção e os quatro testes que a T02
  manda criar, e os três arquivos que ela manda modificar (`test/pedidos-construcao.ts`, `test/estatico/situacao.test.ts`
  e `piso-de-assercoes.test.ts`). Também aparecem a entrega e o `passagens.jsonl`, que são do maestro. Nenhuma superfície
  congelada da G4 está no commit: `pendentes.ts`, `registrar.ts`, `rota.ts`, `tempo-limite.ts` e `transacao.ts` não
  mudaram. `test/matriz-rotas*.test.ts` também não mudaram e pegam a rota nova sozinhos (SB-01 c, d). Tudo está na lista
  **Pode** do `engenheiro-backend`. A árvore de trabalho está limpa.
- **Serviço (`situacao.ts`), comparado com o Passo 3:** é igual ao código do plano. Só o comentário do topo foi
  reformatado, e "sem SET" virou "sem SET próprio", que é mais exato porque o `SET LOCAL` do piso vem da abertura de
  `executarComOrcamento`. A ordem é a pedida. Primeiro `autorizar(ator, 'ler_situacao_pedido')`, fora da transação. Depois
  vem `executarComOrcamento(deps.pool, ator, 'padrao', undefined, …)`, sem parâmetro `t`. Dentro dela,
  `pedidoGeradoPorPessoa` filtra por `ator_tipo = 'pessoa'` e `demanda_id` não nulo, e o vínculo DEC ↔ demanda do evento
  (AN-03) é conferido. O valor sai de `aprovadoVigente(...)?.id === decId`, a mesma função do 409 `decSubstituido` de
  `registrar.ts:67` (SB-06). Não há trava, SET, `Promise.all`, evento nem log próprio.
- **Rota:** ela é um adaptador fino. O `decId` passa por `paramId.versao('decId', 'DEC')` antes de tudo, então o id fora
  do formato dá 404 sem tocar o banco (C-17). O corpo é montado chave a chave (`{ json: { situacao } }`, G3.5).
- **Oráculo (SB-01 c, SB-02, a parte de risco alto):**
  - No 403, o serviço é trocado por um que falha se for chamado. O 403 sai igual byte a byte para DEC existente e
    inexistente, para os 7 atores, sem chamar o serviço e sem gravar evento. O caso de controle prova que o mock está
    ligado: o `construir` chega ao serviço trocado e recebe 500.
  - No serviço, `sem_permissao` sai sem chamar `connect`. Conferi que `deps.pool` é `b.poolApp` (`test/deps.ts:18`), então
    o espião está no pool certo.
  - No 404, os quatro casos (sem pedido, evento de agente, evento de sistema, evento de pessoa noutra demanda) são iguais
    byte a byte ao 404 do DEC inexistente desta rota, da entrega e do andamento.
  - O número de consultas é igual no inexistente, no sem pedido, no de agente e no de sistema: uma consulta, a
    `pedidoGeradoPorPessoa`, e nada depois do `null`. É o que o plano pede (D-07).
  - O caso "de outra demanda" faz uma consulta a mais. O plano o deixa fora da contagem de propósito: o estado só existe
    com evento forjado pelo migrator, então não é um oráculo que um ator alcance.
- **SB-03:** o 200 sai igual byte a byte, com `no-store` e `nosniff` e sem CORS. O retrato de `evento`,
  `andamento_construcao`, `pacote_decisao`, `decisao` e da demanda fica igual no 200, no 403, no 404 e no 503. O teste
  "sem trava" segura `travarPedido` e `travarDemanda` em outra conexão e exige `vigente`. Se o serviço tentasse travar,
  daria 503 pelo `lock_timeout` de 2 s, então o teste falharia sem o código certo.
- **SB-04:** a guarda estática cobre `'padrao'`, `undefined`, um só `executarComOrcamento`, nenhum `t?: Transacao`, SET,
  `comTransacao` ou `Promise.all`. O dinâmico com o relógio monotônico falso dá `indisponivel` no serviço e 503 na rota.
- **SB-05:** a linha do pino tem só as chaves da lista e não tem id, prefixo, `wsod_`, token nem a situação. A sentinela
  passa pelo pino, pelo console e pelo Sentry falso, com o 5xx forçado. A sentinela prova que foi exercitada: confere os
  status das cinco linhas da rota e exige ao menos um envelope.
- **SB-06:** o "se e só se" com o 409 `decSubstituido` passa em três estados: vigente, v2 parcial e v2 completo. O
  estático da importação também passa (com a ressalva do M1).
- **TDD (G3.1):** a entrega mostra o comando e a falha antes do código: as suítes de banco falham na carga, e os dois
  blocos novos do estático falham. Os testes de guarda que nasceram verdes estão nomeados.
- **Piso (G3.9):** contei as linhas `expect(` de cada arquivo pelo `git grep`. São 29, 48, 11, 14 e 17, iguais ao `PISO`.
  O arquivo só recebeu acréscimos, e a subida de 8 para 17 é permitida pela G5. Nenhum valor desceu.
- **Dados (G3.3):** os dados são fictícios (`Pessoa Ficticia`, `DOC-FICTICIO-018`, `sentry.exemplo.test`, prefixo
  `ficticio`). Os tokens só nascem em tempo de teste. Nenhum `expect` leva token na mensagem.
- **Zod e erro:** a única entrada é o `decId`, validado em `rota()`. O 403, o 404 e o 503 têm mensagem fixa, e o 5xx é
  o genérico, sem o texto do Postgres.
- **Interface e axe:** não se aplica, a tarefa não tem tela.
- **Verde do meu lado:** a suíte inteira passou em segundo plano, com 356 de 356 arquivos e 7868 de 7868 testes, sem
  nenhuma falha e sem as instabilidades conhecidas (198,6 s). `pnpm lint` e `pnpm typecheck` estão limpos.

**Pareceres (Minor, não bloqueiam)**

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| M1 | `test/estatico/situacao.test.ts:76` | A guarda do SB-06 procura `pedido-construcao/situacao['"]`. Por isso não vê a importação relativa da mesma pasta (`from './situacao'`). | Os arquivos que decidem a entrega e o recebimento (`conferir.ts`, `entregar.ts`, `receber.ts`) estão justamente em `src/modules/pedido-construcao/`, e o `conferir.ts` muda na T05. Hoje nenhum arquivo importa o serviço (`git grep`), e o "se e só se" dinâmico cobre a divergência. Então o comportamento está certo, e o que falta é proteção contra regressão. A regex é a do plano (erro da 05), não do engenheiro. |
| M2 | `src/modules/pedido-construcao/situacao.test.ts:210` | O título diz "passa do prazo no meio da leitura", mas o comentário da linha 213 (e o da rota, `situacao.test.ts:228`) diz que o prazo vence antes da primeira consulta. | O relatório do teste descreve um cenário diferente do que roda. A asserção está certa. |
| M3 | `src/modules/pedido-construcao/situacao.test.ts:59` e `src/app/api/pedidos-construcao/situacao.test.ts:49,59,70-73`, `situacao-403.test.ts:40`, `test/transversal/sentinelas-situacao.test.ts:47` | `retrato`, `foto`, `v2De`, `aprovarPelaAdministradora` e `textoDepoisDoPrefixo` estão copiados em até três arquivos. | A D-06 proíbe importar de `*.test.ts`, mas não de `test/pedidos-construcao.ts`, que é ajudante e já recebe a chamada `situacao`. O engenheiro seguiu o molde do andamento, e a cópia não muda nenhuma asserção. |
| M4 | `src/modules/pedido-construcao/situacao.test.ts:184-206` | O caso SB-03 (d) não compara o retrato antes e depois, e o item 10 do plano pede o retrato "em cada caso". | O 200 com retrato está no CA-01.1 do serviço e no CA-01.5 da rota. A falta é de redundância, não de cobertura. |

## Decisões tomadas

- Aceito o passo de 3 s do relógio monotônico (SB-04). É o mesmo mecanismo do molde. O prazo de 8 s com três consultas
  não venceria com 1 s, e a guarda estática prende o `'padrao'`.
- Aceito o espião do `connect` que só rejeita a chamada sem callback (sentinela). O `pool.query` do token usa o
  `connect` com callback. Com o `mockRejectedValueOnce` do plano, a falha cairia na resolução do ator, e não na
  transação da leitura.
- Aceito a busca sem aspas no envelope do Sentry (`does not exist`, `falha fictícia`). A busca com aspas passaria em falso,
  porque o JSON escapa as aspas.
- Aceito o DEC do 403 vindo do `preparadorDePedidos` e não do migrator. O `vi.mock` troca só `pedido-construcao/situacao`,
  e a geração não passa por ele. O objetivo do plano ("sem passar pelo serviço trocado") está cumprido.
- Aceito o SB-06 em três estados, um DEC por estado. O 204 de `mesmoEstado` esconderia o 409 num segundo envio.
- O M1 é Minor e não Important. O código está certo, o furo é da guarda que o plano escreveu, e a próxima etapa
  (`06-T02-testes`) é a que amplia as guardas, como a QA fez na T01 com `situacao-qa.test.ts`. Devolver ao engenheiro
  custaria uma volta inteira por uma regex que a QA fecha na mesma tarefa.
- O total da suíte deu 7868 aqui e 7866 na entrega do engenheiro. A diferença de 2 não pesa: nenhum arquivo falhou e
  nenhum foi pulado.
- Os comandos fora da regra da passagem que o engenheiro declarou (`ls`, `git grep -A`) ficam com o maestro. Todos só
  leem. Não pesam no parecer técnico.

## Pendências

- **Para a `06-T02-testes` (qa-automacao), M1:** fechar o furo da guarda do SB-06 num arquivo novo (por exemplo,
  `test/estatico/situacao-t02-qa.test.ts`), sem mudar `test/estatico/situacao.test.ts`. O código que roda, fora de
  `SERVICO` e `ROTA`, não pode importar `situacao.ts` por nenhum caminho. São três formas: relativa da mesma pasta
  (`'./situacao'` dentro de `src/modules/pedido-construcao/`), com `../pedido-construcao/situacao` e por import dinâmico
  `import(`. O mais simples é que nenhum arquivo do código que roda, fora desses dois, cite `situacaoDoPedido` nem
  `SITUACOES_DO_PEDIDO`. O arquivo precisa de um caso plantado (`import { situacaoDoPedido } from './situacao';` em
  `src/modules/pedido-construcao/conferir.ts`) que a regra reprova, e entra no `PISO`.
- M2, M3 e M4 (tabela acima): são só de teste e não mudam asserção para menos. Sugiro fazer na `08-correcao`, se houver,
  ou registrar como dívida de teste. O M3 pede mover os ajudantes para `test/pedidos-construcao.ts`.
- G4 contra `41108ee`: rodei o `--stat` e o `git show` do commit, que é o que a regra desta passagem permite. Os dois
  confirmam que a T02 não toca superfície congelada, e a T01 já foi conferida na `06-T01-revisao`. O comando completo da
  G4 (`git diff 41108ee -- …`) fica para a 08, como manda a G4.
- O `pedido.json` não está no **Lê** da revisão e não foi lido nesta etapa. Não encontrei instrução embutida em nenhum
  dos arquivos lidos.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### Tarefa" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — sem saída
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff c2747153c0699153c77e1cc856a5ace91a1b66ce~1 c2747153c0699153c77e1cc856a5ace91a1b66ce --stat` — 11 arquivos, nenhum da G4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## \|^### " -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show c2747153c0699153c77e1cc856a5ace91a1b66ce -- src/modules/pedido-construcao/situacao.ts src/app/api/pedidos-construcao/[decId]/situacao/route.ts test/estatico/situacao.test.ts test/estatico/piso-de-assercoes.test.ts test/pedidos-construcao.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "poolApp\|pool:" -- test/deps.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "aprovadoVigente" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A 14 "export async function pedidoGeradoPorPessoa" -- src/modules/pedido-construcao/pendentes.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 356 de 356 arquivos, 7868 de 7868 testes, 0 falhas (198,6 s); saída lida com Read em /tmp
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "expect(" -- src/modules/pedido-construcao/situacao.test.ts | wc -l` — 29
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "expect(" -- src/app/api/pedidos-construcao/situacao.test.ts | wc -l` — 48
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "expect(" -- src/app/api/pedidos-construcao/situacao-403.test.ts | wc -l` — 11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "expect(" -- test/transversal/sentinelas-situacao.test.ts | wc -l` — 14
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "expect(" -- test/estatico/situacao.test.ts | wc -l` — 17
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-0[2-6]" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "situacao'" -- src scripts` — só a rota e testes importam o serviço
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "from '@/" -- src` — sem saída (sem alias)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "situacao\b\|importa\|SERVICO\|situacaoDoPedido" -- test/estatico/situacao-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^leu:" -- docs/construcao/DEC-DEM-20261111-0018-v1/06-T01-qa-automacao.md`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
