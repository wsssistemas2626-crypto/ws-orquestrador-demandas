---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T05-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T05), 01-analista-requisitos.md (RF-02, CA-02.1 a CA-02.5, RNF-09), 04-seguranca-aplicacao.md (SB-08, SB-09, por git grep), 06-T05-engenheiro-backend.md, 06-T05-tech-lead.md, commit d9475df (git show), src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/caminhos-da-criacao.ts, src/modules/pedido-construcao/montar.ts (linhas 60 a 131), src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/entregar.ts (linhas 30 a 54), src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts, test/transversal/sentinelas-nome-da-criacao.test.ts, src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts, src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts (linhas 1 a 112), src/lib/acao-painel.ts, src/modules/demandas/schemas.ts (linhas 1 a 80), src/modules/dados-pessoais/minimizar.ts (linhas 200 a 261), test/pedidos-construcao.ts, test/estatico/piso-de-assercoes.test.ts, saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T05 (D1 com o nome da criação na geração e na entrega), commit `d9475df`. O código passa em todos os
testes, os do engenheiro e os novos. Não há devolução.

**Critério → teste**

| Critério | Teste (arquivo › nome) |
|---|---|
| CA-02.1 | `conferir-nome-da-criacao.test.ts` › "CA-02.1: DEC criado com o nome e a ESP com "Lima" → 422…"; `conferir-nome-da-criacao-qa.test.ts` › "sem troca de nome: com a coluna nula ou vazia, o nome da criação, que ainda é o atual, recusa como na 0.4.0" |
| CA-02.2 e critério 2 do pedido (recusado continua recusado depois de trocar o `solicitanteNome`) | `conferir-nome-da-criacao.test.ts` › "CA-02.2: o solicitante trocado…"; `conferir-nome-da-criacao-qa.test.ts` › "cinco trocas seguidas…", "a opção escolhida com o nome antigo continua recusando depois de trocar o nome duas vezes", "a troca do nome ao mesmo tempo que a geração e a entrega (troca antes / troca depois na fila)…", "o nome em vigor é o da criação do DEC, e não o da criação da demanda…" |
| CA-02.3 | `conferir-nome-da-criacao.test.ts` › "CA-02.3: com um pedido_gerado de pessoa anterior…"; no arquivo novo, todo caso passa por `entregarPedido` e pela rota de entrega (`recusaEmTodosOsCaminhos`) |
| CA-02.4 e SB-09 (c) | `conferir-nome-da-criacao.test.ts` › "DEC sem nome em texto algum: o JSON é o de montarPedido + serializarPedido…" |
| CA-02.5, RNF-09 e SB-09 (d) | `test/transversal/sentinelas-nome-da-criacao.test.ts` › "recusas do D1 pelo nome da criação e pelo atual…"; `conferir-nome-da-criacao-qa.test.ts` › "as recusas do D1 nos cinco caminhos e um 500 controlado sobre a mesma demanda: nenhum dos dois nomes nas saídas, e o Sentry recebeu envelope" |
| SB-08 (a): D1 nunca mais fraco que na 0.4.0 | `conferir-nome-da-criacao-qa.test.ts` › "coluna %s: o nome atual na ESP continua recusando, e a coluna só soma caminhos" (5 casos) e "sem troca de nome…" |
| SB-08 (b) | `gerar.test.ts`, `acoes-pedido.test.ts`, `conferir*.test.ts` e os demais testes do D1, sem mudança (`git diff` só no piso) e verdes na suíte |
| SB-08 (d) | `conferir-nome-da-criacao.test.ts` › os quatro casos do describe "SB-08 (d)"; `conferir-nome-da-criacao-qa.test.ts` › "coluna só a opção não escolhida…" e "a opção escolhida com o nome antigo…" |
| SB-08 (e) | `conferir-nome-da-criacao.test.ts` › os 5 valores ruins no serviço e nas rotas; `conferir-nome-da-criacao-qa.test.ts` › "coluna %j: { ok: false, erro_interno } sem pedido_gerado e sem o valor" (Server Action, 3 casos) |

**Testes acrescentados: `src/modules/pedido-construcao/conferir-nome-da-criacao-qa.test.ts`** (15 testes, 30 linhas com
`expect(`; Postgres real, papel do app, coluna trocada pelo migrator, relógio fixo, uma autora por demanda, nomes
fictícios). Cada caso confere a recusa nos **cinco caminhos** que geram ou entregam o pedido: `gerarPedido`, a rota da
pessoa, a Server Action do painel (`gerarPedidoNoPainel`, que o engenheiro não exercitava), `entregarPedido` e a rota de
entrega do `/construir`. O ajudante `recusaEmTodosOsCaminhos` exige o 422 com a lista `erros` **exata** nos cinco, sem
nenhum nome nas saídas e sem `pedido_gerado` nem `pedido_entregue` novos.
1. **O D1 não fica mais fraco que na 0.4.0.** O DEC nasce com a coluna vazia, e o solicitante passa a ser um nome que
   está na ESP (regra da 0.4.0). Depois, o migrator grava na coluna cada valor válido: nula, vazia, só a opção não
   escolhida, índices que o DEC não tem e outros caminhos sem o da ESP. Em todos, o nome atual continua recusando nos
   cinco caminhos, e a coluna só **soma** caminhos. Isso pega o OU virando E, a coluna substituindo a conferência do nome
   atual e o índice inexistente desligando a conferência. Mais um caso sem troca, com a coluna nula e vazia.
2. **O recusado continua recusado em toda troca.** São cinco trocas seguidas: outro nome, um nome curto que não confere
   nada ("Xu"), só a parte antiga ("Lima"), o nome antigo em maiúsculas e a volta ao nome da criação. Depois de cada uma,
   vem a mesma recusa, com cada caminho uma vez. A coluna não é reescrita por nenhuma troca. O mesmo vale com o nome antigo
   na opção escolhida (B), depois de duas trocas.
3. **Concorrência.** A troca do nome corre junto com a geração e a entrega (`Promise.allSettled`), nas duas ordens. As
   duas recusam pelo mesmo caminho, qualquer que seja a ordem que a trava da demanda dê. Nada é gravado, e o estado final é
   o do CA-02.2.
4. **O nome em vigor é o da criação do DEC.** A demanda nasce com um nome, que é trocado antes do DEC para o nome que
   está na ESP. A coluna marca a ESP, e voltar ao nome original continua recusando.
5. **SB-08 (e) na Server Action.** Com `x`, `__proto__` e `demanda.titulo ` na coluna, o resultado é
   `{ ok: false, erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO }`, sem o valor, sem a mensagem interna e sem
   `pedido_gerado`.
6. **Sentinelas com o Sentry exercitado (parecer 1 da 06-T05-revisao).** Sobre a mesma demanda, com o nome antigo
   "Sentinelaqwx" e o atual "Novaqwk", vêm as recusas nos cinco caminhos e depois um 500 controlado (coluna `x`) pela
   rota, pela Server Action e pela entrega. Os controles provam que as saídas foram exercitadas: o Sentry recebeu ao
   menos um envelope, e o pino tem exatamente as seis chamadas (422, `nao_processavel`, 422, 500, `erro_interno`, 500).
   As duas sentinelas não aparecem nas respostas, nos resultados da Server Action, no pino, no console, no Sentry nem em
   `evento` (antes e depois).

**Piso:** `test/estatico/piso-de-assercoes.test.ts` ganhou só uma entrada,
`'src/modules/pedido-construcao/conferir-nome-da-criacao-qa.test.ts': 30`, com comentário.

**Resultados**
- Arquivo novo sozinho: 15 de 15. Junto com os dois arquivos da T05 e os dois do piso: 5 de 5 arquivos, 198 de 198
  testes. Na suíte inteira, de novo verde. São três execuções verdes, sem instabilidade.
- `pnpm test` (suíte inteira, em segundo plano): **371 de 371 arquivos, 8046 de 8046 testes, 0 falhas** (216 s).
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git diff --stat`: só `test/estatico/piso-de-assercoes.test.ts` (+4 linhas: uma entrada nova e o comentário). Mais o
  arquivo de teste novo e esta entrega. Nenhum teste existente foi apagado, nem recebeu `.skip`, `.only` ou `.todo`, nem
  teve a asserção afrouxada.

## Decisões tomadas

- O arquivo novo é `-qa` em `src/modules/pedido-construcao/`, ao lado do do engenheiro. Assim não mexo em nenhuma
  asserção dos testes da T05, e uso um container só para os seis grupos.
- A prova de "não mais fraco" põe na coluna valores **válidos** que não deveriam liberar nada. Os valores inválidos já
  estão no SB-08 (e). É o caminho por onde uma regressão (OU → E, coluna no lugar do nome atual) passaria sem ser vista.
- Os cinco caminhos estão num ajudante só, com a lista `erros` exata. Uma divergência entre a geração e a entrega, ou
  entre o serviço, a rota e a Server Action, quebra o teste.
- A corrida usa `allSettled` e confere só o que vale em qualquer ordem. Não depende de tempo nem de ordem de agenda, então
  não fica instável.
- O controle do Sentry (parecer 1 da revisão) entrou no arquivo novo, com um 500 controlado, e não no arquivo de
  sentinelas do engenheiro: acrescentar lá mudaria o fluxo que ele já prova.
- Não rodei mutação no código de produção, porque `src/` sem `.test.ts` está fora da minha lista **Pode**. A razão por
  caso: com o código da 0.4.0, as trocas do grupo 2, a concorrência ("troca antes") e o grupo 4 geram o pedido, e o
  teste falha. Se a coluna substituísse o nome atual, os casos "vazia", "só a opção não escolhida" e "índices" do grupo 1
  falhariam. Com o filtro trocado de OU para E, todos os casos do grupo 1 falhariam.

## Pendências

- Nenhuma que impeça a próxima etapa.
- **Um comando fora da forma da regra:** um `git -C … grep --untracked` sobre a saída da suíte em `/tmp`. O git o
  recusou sem ler nada ("outside repository"), e ele está declarado abaixo. A saída foi lida em seguida com a ferramenta
  Read.
- Para a `08-revisao` seguem os pareceres 2 e 3 da 06-T05-revisao e o Minor 3 da T04 (zero à esquerda no índice). O caso
  "índices que o DEC não tem" mostra que um caminho válido que não casa com nenhum texto não libera nada.
- O `pedido.json` não traz instrução fora do pedido.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 24 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T05\|T06" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T05 na linha 1051
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-02\.\|RNF-09" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — critérios
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-08\|SB-09" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — SB-08 e SB-09
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show d9475df46ed45b7047c483cb5ff23c96594fb75b --stat` — 6 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show d9475df46ed45b7047c483cb5ff23c96594fb75b -- src/modules/pedido-construcao/conferir.ts test/estatico/piso-de-assercoes.test.ts` — diff de produção e do piso
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/pedido-construcao src/app/api/pedidos-construcao test` — lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "gerarPedido\|entregarPedido\|conferirEMontarPedido" -- src ":!*.test.ts"` — os cinco caminhos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "solicitanteNome" -- src/modules/demandas/schemas.ts src/modules/demandas/consultas.ts src/modules/demandas/servico.ts` — schema do nome
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export function nomesDoSolicitante" -- src/modules/demandas/consultas.ts` — sem resultado (é const)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "gerarPedidoNoPainel" -- src test` — testes da Server Action
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "nomesDoSolicitante" -- src/modules/demandas/consultas.ts` — linha 293
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -B3 -A14 "export function temNome\|export const temNome" -- src/modules/dados-pessoais/minimizar.ts` — regra do nome
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A40 "export function textosDoPedido" -- src/modules/pedido-construcao/montar.ts` — ordem dos textos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "caminhos_com_nome_na_criacao" -- src test` — imutabilidade já coberta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export type ResultadoAcao\|ok: false\|extras\|erros" -- src/lib/acao-painel.ts` — formato da Server Action
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "entrega" -- src/modules/limites.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function executarComOrcamento\|'entrega'" -- src` — orçamento de tempo, sem limite de taxa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "limit\|429" -- src/lib/rota.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- test/sessao.ts test/requisicao.ts src/lib/sentry.ts src/lib/erros.ts` — ajudantes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/conferir-nome-da-criacao-qa.test.ts --reporter=dot` — 15 de 15
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- src/modules/pedido-construcao/conferir-nome-da-criacao-qa.test.ts` — 30
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/conferir-nome-da-criacao-qa.test.ts src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts test/transversal/sentinelas-nome-da-criacao.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-qa.test.ts --reporter=dot` — 5 de 5 arquivos, 198 de 198
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 371 de 371 arquivos, 8046 de 8046 testes, 0 falhas (216 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só o piso, +4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts` — uma entrada e o comentário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n -e "Date.now" -e "new Date()" -e ".only(" -e ".skip(" -e ".todo(" -- src/modules/pedido-construcao/conferir-nome-da-criacao-qa.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n "Test Files\|Tests \|failed" -- /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/bxdxeswum.output` — recusado pelo git (caminho fora do repositório), nada lido; a saída foi lida pela Read

A saída da suíte foi lida com a ferramenta Read em /tmp.

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
