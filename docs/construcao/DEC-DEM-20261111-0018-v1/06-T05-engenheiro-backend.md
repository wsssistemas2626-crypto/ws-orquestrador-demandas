---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T05-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10, T04 e T05), 01-analista-requisitos.md (RF-02, CA-02.1 a CA-02.5, RNF-09), 04-seguranca-aplicacao.md (SB-08, SB-09, por git grep), 2026-11-13-ws-orquestrador-demandas-sobras-design.md (RF-02, SB-08, SB-09, por git grep), 06-T04-tech-lead.md, 06-T04-qa-automacao.md, src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/caminhos-da-criacao.ts, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/gerar.test.ts (preparo e D1 do 0013), src/modules/pacotes-decisao/marcacao-da-criacao.test.ts (linhas 1 a 140), src/modules/pacotes-decisao/marcacao-da-criacao-qa.test.ts, src/modules/pacotes-decisao/schemas.ts (linhas 30 a 59), src/modules/demandas/servico.ts (alterarDemanda e CAMPOS_EDITAVEIS), src/app/api/demandas/[id]/route.ts, src/lib/erros.ts (linhas 40 a 100), src/lib/sentry.ts, src/db/imutabilidade.test.ts (linhas 150 a 220), test/pedidos-construcao.ts, test/transversal/sentinelas-situacao.test.ts, test/transversal/sentinelas.test.ts (linhas 50 a 250), test/sessao.ts (criarPessoa), test/estatico/piso-de-assercoes.test.ts (linhas 95 a 138), saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T05 está feita: o D1 com o nome da criação vale na geração e na entrega (S-03, RF-02; CA-02.1 a CA-02.5; SB-08 a, b,
d, e; SB-09 c, d). `conferirEMontarPedido` recusa um texto quando ele tem o nome atual do solicitante **ou** quando o
caminho dele foi marcado pelo nome que valia na criação do DEC. A marcação vem da coluna `caminhos_com_nome_na_criacao`,
lida com falha fechada e traduzida para os caminhos do pedido. A geração e a entrega chamam a mesma função, então as duas
recusam igual. `gerar.ts`, `entregar.ts` e `montar.ts` não mudaram, e o JSON do pedido também não.

**Arquivos alterados**
- `src/modules/pedido-construcao/conferir.ts`. Só o que a G4 permite:
  - o `select` do `alvo` passa a trazer a coluna;
  - a coluna é lida por `lerCaminhosDaCriacao` logo depois do 404, antes da trava;
  - o filtro do D1 passa a ser `marcados.has(caminho) || temNome(...)`, com `marcados = caminhosDaCriacaoNoPedido(daCriacao, escolhida)`. Com a coluna nula, `marcados` é vazio;
  - o import das duas funções;
  - a frase no passo 4 do comentário do topo, mais os comentários do trecho.
  - O texto de `MENSAGENS_PEDIDO` não mudou, porque é da T11.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo de duas entradas (48 e 10).

**Testes criados**
- `src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts`: 23 testes, 48 linhas com `expect(`. Usa Postgres real, o papel do app, rotas, Server Action e tokens reais. A coluna é trocada pelo migrator.
  - **CA-02.1:** a ESP com "Lima" e o DEC criado com "Joana Ficticia Lima". Resultado: 422 `especificacao.conteudo: nome`, sem `pedido_gerado`. A coluna é `['especificacao.conteudo']`.
  - **CA-02.2:** o solicitante trocado para "Outra Pessoa". Resultado: o mesmo 422, duas vezes seguidas, sem `pedido_gerado`.
  - **CA-02.3:** com um `pedido_gerado` de pessoa gravado pelo migrator, `entregarPedido` com o ator `construir` e a rota de entrega dão 422 pela mesma regra, sem `pedido_entregue`.
  - **Rota de geração:** o mesmo 422 do serviço, sem o nome.
  - **SB-08 (d):**
    - o nome antigo só na opção não escolhida (B com A aprovada, e A com B aprovada): o pedido sai;
    - o nome antigo na opção escolhida (A e B): 422 `decisao.opcaoEscolhida: nome`.
  - **Coluna nula:** com o nome antigo na ESP e o nome trocado, o pedido sai. Com o nome atual na ESP, dá o 422 da 0.4.0.
  - **SB-08 (e):** cinco valores fora do formato: `__proto__`, um caminho com espaço no fim, `x`, um índice de 5 dígitos e `MAXIMO_DE_CAMINHOS + 1` itens.
    - `gerarPedido` e `entregarPedido` lançam um `Error` que não é `ErroDominio`, com a mensagem fixa e sem `issues`. `mapearErro` dá 500 `erro_interno`. Nenhum `pedido_gerado` nem `pedido_entregue` é gravado.
    - Pelas duas rotas, a resposta é 500 com o corpo genérico. Nem o Sentry falso nem as respostas trazem o valor ou a mensagem.
  - **SB-08 (b) e CA-02.4:** para um DEC sem nome em nenhum texto, o JSON é igual byte a byte a `serializarPedido(montarPedido(...))` sobre a vista. Ele não tem `caminhos` e continua igual depois da troca do nome.
  - **Ordem dos erros:** primeiro o C-28. Depois vêm, na ordem de `textosDoPedido`, os caminhos com o nome da criação, com o nome atual ou com os dois. `demanda.titulo` está marcado pelos dois critérios e sai uma vez só.
  - **Os cinco caminhos de criação** que a 06-T04-testes achou (rota de pessoa, rota do agente, Server Action, worker com `extras` e `executarAgente` com o provedor falso): aprovado com A e com o nome trocado, dá 422 com os sete caminhos, na geração e na entrega.
- `test/transversal/sentinelas-nome-da-criacao.test.ts`: 1 teste, 10 linhas com `expect(`.
  - **Fluxo, todo pelas rotas:** o solicitante "Pessoa Sentinelazyx Ficticia" e a ESP com "Sentinelazyx". O solicitante é trocado para "Outra Novazyq Ficticia", que está no RSK. A geração dá 422 e a entrega dá 422, as duas com `especificacao.conteudo` (pelo nome da criação) e `risco.conteudo` (pelo nome atual).
  - **Onde nenhuma das duas sentinelas aparece:** nas respostas das recusas, no pino, no console, no Sentry, em `evento` (`antes::text` e `depois::text`), na coluna e no `pgboss`.
  - **Controles:** as cinco linhas de log das rotas e a coluna gravada.

**Teste visto falhando antes do código**

Comando: `pnpm --dir … test src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts test/transversal/sentinelas-nome-da-criacao.test.ts --reporter=dot`. Resultado: **18 falhas e 6 aprovados de 24**. Trechos:
```
FAIL … CA-02.2: o solicitante trocado para "Outra Pessoa" → o mesmo 422 … Error: era para recusar
FAIL … SB-08 (e) … pelas rotas …: expected [ 200, 200 ] to deeply equal [ 500, 500 ]
FAIL … ordem dos erros …  -     "demanda.descricao: nome",
FAIL test/transversal/sentinelas-nome-da-criacao.test.ts … -  "especificacao.conteudo: nome",
```
Seis testes já passavam antes do código, porque a regra deles é a da 0.4.0, que este pedido não pode enfraquecer. Os testes que exigem o código novo falharam.
- CA-02.1: o nome atual já recusava.
- Dois casos da opção não escolhida.
- Os dois casos da coluna nula.
- O JSON do CA-02.4.

Na primeira rodada, os três caminhos de agente falharam com 409 "só é gerado de pacote aprovado". O DEC do agente pede a dupla aprovação, e o teste aprovava só com a CTO. O teste passou a aprovar também com a administradora, com documento fictício. Depois disso, a falha passou a ser a esperada.

**Depois do código**
- Arquivos novos: 24 de 24.
- `pnpm test` (suíte inteira, em segundo plano): **370 de 370 arquivos, 8028 de 8028 testes, 0 falhas** (203 s).
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4 (superfícies congeladas, contra `41108ee`): **vazio**.

**Desvios do plano**
- O plano pede um teste que cubra as duas sentinelas. Eu criei duas sentinelas, uma para o nome antigo e outra para o atual. O plano só citava "Sentinelazyx". Com duas, a varredura cobre os dois nomes, como manda o SB-09 (d).
- No teste das sentinelas, "nas respostas" quer dizer as respostas das duas recusas do D1 (CA-02.5). As respostas da criação e da alteração da demanda trazem o solicitante, porque esse é o campo delas, e ficaram fora da varredura.
- Entraram casos que o plano não pedia, sem tirar nenhum dos que ele pedia:
  - os cinco caminhos de criação;
  - as duas rotas na falha fechada;
  - a opção escolhida com o nome antigo, em A e em B.

## Decisões tomadas

- A coluna é lida antes de `travarDemanda`, como no plano. A coluna é imutável, porque o app não tem `UPDATE` (T03). Ler antes ou depois da trava dá o mesmo valor, e o valor ruim falha sem tomar a trava.
- `escolhida` ausente vira um conjunto vazio, como no plano. Esse ramo não é alcançável: `montarPedido` já lançou 409 sem decisão aprovada, conferido em `montar.ts:47-50`.
- A prova do Sentry é feita pela rota, porque `gerarPedido` sozinho não chama `capturarErro`. O `mapearErro` sobre o erro do serviço prova o 500 na fonte.
- O teste usa um `user` administradora fictício no banco, como em `gerar.test.ts`. Ele serve para a dupla aprovação do DEC de agente.

## Pendências

- Nenhuma que impeça a próxima etapa.
- Para a `08-revisao` segue o Minor 3 da revisão da T04: `\d{1,4}` aceita zero à esquerda. Na leitura da T05, um caminho como `definicao_de_pronto[01]` passa no formato e só não casa com nenhum caminho de `textosDoPedido`. Ele não recusa nem libera nada a mais, porque o nome atual continua conferido.
- **Dois comandos fora da forma da regra:** os `git grep` com `-A4` e `-A6` depois do texto. O git recusou os dois, sem ler nada, e eles estão declarados abaixo. Em seguida, um deles foi refeito na forma certa (`-n -A6` antes do texto) e o outro arquivo foi lido pela ferramenta Read.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 22 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T05" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T05 na linha 1051
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/pedido-construcao test/transversal test` — lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "nome" -- src/modules/pedido-construcao/gerar.test.ts` — testes do D1 do 0013
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "inserirEventoDoPedido" -- src test` — ajudante em test/pedidos-construcao.ts
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pgboss\|antes::text\|capturarErro\|mapearErro\|rotaPacotes\|import " -- test/transversal/sentinelas.test.ts` — molde das sentinelas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/pacotes-decisao` — lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "update pacote_decisao" -- src test` — o migrator troca a coluna
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- src/lib/erros.ts src/modules/pedido-construcao/gerar.ts` — mapearErro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-02\|SB-08\|SB-09\|RNF-09" -- docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — critérios
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- test/sessao.ts test/deps.ts test/requisicao.ts test/banco.ts src/lib/sentry.ts` — ajudantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "solicitanteNome\|registrarEvento\|antes:\|depois:" -- src/modules/demandas/servico.ts` — evento da troca do nome
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A16 "export function mudancaDeCampo" -- src/modules/historico/registrar.ts` — sem o valor do nome
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export type Ator\|integracao:" -- src/modules/acesso/ator.ts` — AtorIntegracao
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/app/api/pacotes-decisao src/app/api/demandas` — rotas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export const" -- "src/app/api/demandas/[id]/route.ts" "src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts" "src/app/api/pacotes-decisao/[decId]/decisao/route.ts" "src/app/api/demandas/[id]/especificacoes/route.ts" "src/app/api/demandas/[id]/pareceres-risco/route.ts" src/app/api/demandas/route.ts` — métodos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "conferir" -- test/estatico/caminhos-da-criacao-qa.test.ts test/estatico/caminhos-da-criacao.test.ts` — conferir.ts permitido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const OPCOES_DECISAO\|export type OpcaoDecisao" -- src/db/schema/decisao.ts` — tipos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "rascunho" -- src/modules/pacotes-decisao/decidir.ts src/modules/pedido-construcao/montar.ts` — revisouRascunhosDeAgente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "revisouRascunhosDeAgente\|export const registrarDecisaoSchema" -- src/modules/pacotes-decisao/schemas.ts` — schema da decisão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "PATCH = rota" -A4 -- "src/app/api/demandas/[id]/route.ts"` — recusado pelo git (opção depois do texto), nada lido; o arquivo foi lido pela Read
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "nomes" -- src/modules/pacotes-decisao/criar.ts` — nomes do 201
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts test/transversal/sentinelas-nome-da-criacao.test.ts --reporter=dot` — antes do código: 18 falhas, 6 aprovados (24)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts -t "cinco caminhos" --reporter=dot` — 5 falhas; a mensagem do 409 mostrou a dupla aprovação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "administradora" -- src/modules/pedido-construcao/gerar.test.ts` — molde da dupla aprovação
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts test/transversal/sentinelas-nome-da-criacao.test.ts --reporter=dot` — antes do código, com o teste corrigido: 18 falhas, 6 aprovados (24), cada falha pela regra nova
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "function opcaoEscolhida" -A6 -- src/modules/pedido-construcao/montar.ts` — recusado pelo git (opção depois do texto), nada lido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A6 "function opcaoEscolhida" -- src/modules/pedido-construcao/montar.ts` — montarPedido recusa sem opção
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts test/transversal/sentinelas-nome-da-criacao.test.ts --reporter=dot` — depois do código: 24 de 24
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts test/transversal/sentinelas-nome-da-criacao.test.ts` — 48 e 10
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 370 de 370 arquivos, 8028 de 8028 testes, 0 falhas (203 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/modules/pedido-construcao/conferir.ts` — só select, leitura da coluna, filtro do D1, import e comentários
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 2 alterados, 2 testes novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n -e "Date.now" -e "new Date()" -e ".only" -e ".skip" -- src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts test/transversal/sentinelas-nome-da-criacao.test.ts` — só um falso positivo (`readonly`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o mesmo, mais esta entrega

A saída da suíte foi lida com a ferramenta Read em /tmp, sem nenhum comando Bash.

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
