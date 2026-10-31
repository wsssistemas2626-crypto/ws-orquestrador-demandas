---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T42-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T42, linhas 3763 a 3787), 01-analista-requisitos.md (RF-07 a RF-13, RF-16 a RF-26 e a tabela de RNF), 06-T42-engenheiro-frontend.md, 06-T42-tech-lead.md, 06-T41-qa-automacao.md (formato), git show --stat f0e384b, git show --stat 1c7578c, src/components/{dados-do-parecer.ts,dados-do-parecer.test.ts (até a linha 80),lista-textos.ts,lista-textos.test.ts}, "src/app/(painel)/demandas/[id]/pareceres-risco/novo/{page.tsx,FormularioParecer.tsx,acoes.ts,acoes.test.ts,pagina.test.ts (até a linha 80)}", "src/app/(painel)/pareceres-risco/[rskId]/page.tsx", "src/app/(painel)/demandas/[id]/especificacoes/nova/{FormularioEspecificacao.tsx (linhas 85 a 214),especificacao-qa.test.ts}", src/modules/pareceres-risco/{schemas,servico,consultas}.ts, src/modules/limites.ts, src/app/api/demandas/[id]/pareceres-risco/route.ts, playwright.config.ts, e2e/{parecer-risco.spec,especificacao-qa.spec,apoio}.ts, git show HEAD:src/modules/demandas/schemas.ts, git show HEAD:src/lib/erros.ts, git show HEAD:src/modules/agentes/gatilhos.ts, git show HEAD:src/modules/acesso/matriz.ts, git show HEAD:src/components/dados-da-especificacao.ts, git show HEAD:src/components/GrupoOpcoes.tsx, git show HEAD:src/db/schema/versoes.ts, git show f0e384b (diff de FormularioEspecificacao.tsx, demandas/[id]/page.tsx e ListaTextos.tsx), test-results/.last-run.json (criado pelas corridas do e2e desta etapa), saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/b5h9t656l.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T42: T08 Novo parecer de risco, T10 Ver RSK e a correção do achado 1 da `06-T41-revisao` na Lista de textos. O código e
os testes do engenheiro estão no `f0e384b`; o `1c7578c` só traz a revisão do tech-lead. Não achei falha no código contra
nenhum critério da tarefa.

### Critério da tarefa e teste que o cobre

A T42 cobre RF-09 (painel), RF-11, RF-19 e RNF-11, mais os cinco testes do texto do plano, a correção do achado 1 da
T41 e a pendência que a `06-T42-revisao` mandou para esta etapa (rascunho de agente visto só com dublê).
Legenda: (E) teste do engenheiro, (Q) teste desta etapa. Nomes curtos dos arquivos:
- `rsk.spec` = `e2e/parecer-risco.spec.ts` (E)
- `rsk-qa.spec` = `e2e/parecer-risco-qa.spec.ts` (Q)
- `acoes.test` = `src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.test.ts` (E)
- `rsk-qa` = `src/app/(painel)/demandas/[id]/pareceres-risco/novo/parecer-qa.test.ts` (Q)
- `novo.test` = `src/app/(painel)/demandas/[id]/pareceres-risco/novo/pagina.test.ts` (E)
- `ver.test` = `src/app/(painel)/pareceres-risco/[rskId]/pagina.test.ts` (E)
- `dados.test` = `src/components/dados-do-parecer.test.ts` (E)
- `lista.test` = `src/components/lista-textos.test.ts` (E)
- `lista-qa` = `src/components/lista-textos-qa.test.ts` (Q)

| Critério | Teste |
|---|---|
| Plano: sem ESP, o aviso "Esta demanda ainda não tem especificação técnica…" e a gravação permitida | `rsk.spec` › `sem ESP: aviso…` (E); `acoes.test` › `sem ESP: grava a v1…` (E) |
| Plano: "Escolha o nível do risco técnico." e os outros dois | `rsk.spec` › `erros "Escolha o nível do risco técnico."…` (E); `acoes.test` › `a validação da tela é só conveniência…` (E); `rsk-qa` › `a tela e o servidor concordam (T08)` › `os três níveis sem marcar…` e `só o nível do risco operacional sem marcar…` (Q) |
| Plano e RF-12: "RSK-…-vN gravado." e o aviso do DEC desatualizado | `rsk.spec` › `gravado: "RSK-…-v2 gravado."…` (E); `acoes.test` › `DEC pendente em dia fica desatualizado…` (E); `rsk-qa` › `só o pacote pendente que esta versão desatualizou entra no aviso; o que já estava desatualizado, não` e `conflito: a chegada é o alerta de erro…` (Q) |
| Plano e RF-11: T10 com os níveis em texto, sem editar nem excluir | `rsk.spec` › `T10 do RSK: níveis em texto…` (E); `ver.test` (E); `rsk-qa` › `RF-11: a v2 pelo painel, a partir da v1, não muda a v1; id, versão, autoria, execução e data adulterados na entrada são descartados` (Q) |
| Plano e RNF-11: axe em vazio, com erro, preenchido e T10 | `rsk.spec`: T08 vazia, preenchida, com erro, depois de remover, a partir da v1, em 320 px, T05 depois de gravar, T10 e 404 da T10 (E); `rsk-qa.spec` › `?base= de outra demanda…` (axe na T05 com a chegada da T08) (Q) |
| RF-09 / CA-09.1 pelo painel: `RSK-<demanda>-v1`, depois `-v2` | `acoes.test` (E); `rsk-qa` › `CA-09.1: a mesma entrada válida grava RSK-<demanda>-v1 pela rota e RSK-<demanda>-v2 pelo painel…` (Q) |
| RF-09 / CA-09.2 pelo painel: nível "critico" recusado | `rsk-qa` › `CA-09.2 pela tela: nível adulterado ("critico") passa na tela e o servidor recusa; vira "Escolha o nível do risco técnico."…` e o caso `CA-09.2` da lista de recusas (Q) |
| RF-09 / CA-09.3 pelo painel: `preCondicoes` como texto corrido recusado | `rsk-qa` › `CA-09.3: preCondicoes como texto corrido: a rota responde 400 e a Server Action devolve o mesmo erro…` (Q) |
| RF-19: "nas mesmas rotas e com o mesmo schema" | `rsk-qa` › `RF-09 e RF-19: o painel usa a mesma regra e o mesmo schema da rota` › 11 casos de recusa e 1 gravação (Q) |
| RF-19 pelo painel: agente desligado ou suspenso não enfileira; gatilho igual ao da rota | `rsk-qa` › `com os agentes desligados, o RSK do painel numa demanda com ESP não cria execução nem job`, `consolidação ligada: o RSK do painel a dispara com a chave rsk:<id> e um job só quando a demanda tem ESP` e `consolidação ligada com o teto em zero (suspensa)…` (Q) |
| RNF-04 na tela e no servidor: 10.000 caracteres e 50 itens | `dados.test` (E); `acoes.test` › `item longo demais pela API volta à linha da tela…` (E); `rsk-qa` › 8 casos de `a tela e o servidor concordam (T08)` e `no limite (RNF-04): 10.000 caracteres com espaços em volta passam…` (Q) |
| Conflito de versão (03, T08) | `rsk.spec` › `conflito de versão…` (E); `acoes.test` › `conflito de versão…` (E); `rsk-qa` › `dois envios da mesma tela ao mesmo tempo: v1 e v2, e só o que virou v2 diz que houve conflito` (Q) |
| Duplo envio | `rsk-qa.spec` › `duplo clique em "Gravar": um envio só e um RSK só; a resposta da Server Action não traz o que foi digitado` (Q) |
| `?base=` só da mesma demanda; chegada na T05 sem confiar na URL | `novo.test` (E, dublê); `dados.test` › chegada na T05 (E); `rsk-qa` › `?base= de RSK de outra demanda, que não existe ou de ESP…` (Q, banco real); `rsk-qa.spec` › `?base= de outra demanda… a chegada na T05 não confia na URL` (Q) |
| Pendência da `06-T42-revisao`: rascunho de agente na T08 e na T10 (só visto com dublê) | `novo.test` e `ver.test` (E, dublê); `rsk-qa` › `RSK v1 do agente: a T08 avisa e parte dele; a v2 da pessoa não é rascunho; a T10 da v1 tem o selo, o aviso e o link da v2, e a da v2 não` (Q, gravado pelo ator `risco` no banco real) |
| C-11: autoria só da sessão | `acoes.test` › `sem ESP…` (E); `rsk-qa` › RF-11 e CA-09.1 (Q) |
| C-17: id pela regex antes do banco; 404 | `acoes.test` › `id fora do formato não toca o banco…` (E); `novo.test` e `ver.test` (E); `rsk.spec` › T10 e T08 com status HTTP 404 (E) |
| C-18: conteúdo como texto | `ver.test` (E); `rsk-qa` › rascunho de agente, com `<img onerror>` vindo do agente escapado na T08 e na T10 (Q) |
| C-21: log sem dado digitado | `rsk-qa` › `C-21: uma linha de log por envio, sem nada do que foi digitado nem o id da demanda…` (Q) |
| Achado 1 da T41: erro de item na linha certa depois de remover, na T08 e na T07 | `lista.test` (E, 4 exemplos); `rsk.spec` › `erros… o erro de item fica na linha certa depois de remover` (E, T08); `lista-qa` (Q, 9 testes de propriedade, T08 e T07); `rsk-qa.spec` › `T07 da ESP com a correção da Lista de textos…` (Q, T07 no navegador) |

### Leitura crítica dos testes do engenheiro

- **A tela e o servidor podiam discordar.** A tela tem cópias da regra: os níveis, o limite de texto, o limite de itens e
  as mensagens. O `dados.test` trava as constantes, e o `acoes.test` prova dois casos de recusa. Faltava provar que, para
  os mesmos valores da tela, o servidor recusa o mesmo e o erro volta ao mesmo lugar. O `rsk-qa` faz isso em 8 casos e
  confere também a ordem, que é a do Resumo de erros. Os casos incluem linhas vazias e só com espaços antes do item com
  erro, que é onde o mapa de índices pode errar.
- **"Mesma rota, mesmo schema" (RF-19) e CA-09.2 e CA-09.3 só estavam no schema.** O `rsk-qa` chama
  `POST /api/demandas/:id/pareceres-risco` e a Server Action com as mesmas 11 entradas ruins. Os dois devolvem o mesmo
  `erro`, a mesma `mensagem` e os mesmos `campos`, e a mesma entrada válida grava o mesmo conteúdo pelos dois caminhos.
- **O gatilho da consolidação pelo painel não tinha teste.** O RSK dispara a consolidação quando a demanda tem ESP
  (T28). O `rsk-qa` confere a tabela `execucao_agente` e os jobs do `pgboss.job` em quatro situações:
  - nada com os agentes desligados;
  - nada sem ESP;
  - nada com o teto em zero;
  - com a consolidação ligada e ESP na demanda, um job com a chave `rsk:<id>`.
- **O aviso do DEC desatualizado só era visto com um pacote.** O `rsk-qa` monta um DEC já desatualizado pela ESP v2 e um
  em dia. Só o em dia entra no aviso. A chegada na T05 é montada com a URL que a Server Action devolveu e a demanda lida
  do banco.
- **O conflito só era testado em sequência.** O `rsk-qa` manda dois envios ao mesmo tempo. A trava da demanda os
  serializa em v1 e v2, e só o que virou v2 traz `conflito: true`.
- **O rascunho de agente só era visto com dublê** (pendência da revisão). O `rsk-qa` grava a v1 com o ator `risco` no
  banco real e lê a T08 e a T10 com as leituras reais. Confere o aviso, a partida pela v1 com os níveis marcados, a v2 da
  pessoa sem marca de rascunho, o selo e o aviso só na v1 e o link "Existe uma versão mais nova". Não precisou do seed da
  T33.
- **A correção do achado 1 tinha 4 exemplos.** O `lista-qa` a prova como propriedade, nas 2 listas da T08 e nas 5 da
  T07. Para 340 listas de 1 a 4 linhas (vazia, só espaços, curta e longa), removida cada linha, os erros são exatamente
  os de uma validação nova da lista que ficou. Isso vale para campo, linha, id de foco, rótulo, mensagem e ordem. E o
  objeto só muda quando os erros mudam. A única diferença está documentada no teste: nas listas obrigatórias da ESP,
  remover o último item preenchido não acrescenta "Informe ao menos um…" (o próximo envio valida).
- **A T07 com a correção não tinha e2e.** O `rsk-qa.spec` repete na T07 o caso do achado (erro no item 2, remover o 1).
  O teste confere que o erro, o link do resumo e o foco vão para o novo item 1, e que depois de corrigir a gravação passa.
- **e2e do engenheiro:** os 7 testes preparam pela API e conferem pelo navegador, com axe. Não achei espera fixa nem
  dependência de ordem, e cada teste cria a própria demanda. Faltavam o duplo clique e a URL forjada na T08 e na T05,
  cobertos pelo `rsk-qa.spec`.
- **Nenhuma asserção do engenheiro foi alterada.** Os testes desta etapa estão em três arquivos novos.

### Testes acrescentados (44, em 3 arquivos novos)

| Arquivo | Testes |
|---|---|
| `src/app/(painel)/demandas/[id]/pareceres-risco/novo/parecer-qa.test.ts` | 32, com Testcontainers e Better Auth reais. Tela e servidor concordam: 8 casos, o limite de 10.000 e o CA-09.2 adulterado. Mesma regra da rota: 11 recusas e 1 gravação (CA-09.1). RF-19: desligado, consolidação ligada com e sem ESP, teto em zero. DEC desatualizado e chegada na T05 (2). Concorrência, RF-11 e C-21. Rascunho de agente na T08 e na T10, e `?base=` de outra demanda |
| `src/components/lista-textos-qa.test.ts` | 9, sem banco: a propriedade de `errosDepoisDeRemover` nas 2 listas do RSK e nas 5 da ESP, mais o nome que cada formulário passa igual ao rótulo do Resumo de erros |
| `e2e/parecer-risco-qa.spec.ts` | 3: `?base=` e chegada forjados (6 bases e 9 URLs); duplo clique em "Gravar"; a correção da Lista de textos na T07 |

O relógio é sempre o fixo dos `Deps`, com um dia por teste. Nenhum teste lê `Date.now` nem depende de outro. Os agentes
e o teto voltam ao estado inicial antes de cada teste.

### Resultado

- `pnpm test` (suíte inteira, numa rodada): 178 arquivos e **3.502 de 3.502**. São os 3.461 que já existiam mais os 41
  novos de Vitest.
- `pnpm test "src/app/(painel)/demandas/[id]/pareceres-risco" "src/app/(painel)/pareceres-risco" src/components --sequence.shuffle`:
  324 de 324, duas vezes (sementes 1793425725360 e 1793425740954).
- `pnpm test:e2e e2e/parecer-risco-qa.spec.ts`: 3 de 3.
- `pnpm test:e2e --list`: **81 testes em 14 arquivos**. São os 78 da T42 mais os 3 desta etapa.
- `pnpm test:e2e` inteiro, na segunda corrida: código de saída 0, e o `test-results/.last-run.json` ficou com
  `"status": "passed"` e nenhuma falha. A primeira corrida falhou, e a causa era minha (ver Classificação de falhas).
- `pnpm lint` e `pnpm typecheck`: limpos, também depois da última mudança no e2e.
- `git status --short --untracked-files=all`: só os três arquivos novos e esta entrega. `git diff --stat` vazio: nenhum
  arquivo rastreado mudou.

### Classificação de falhas

Nenhuma falha no código contra critério da T42.

Uma falha veio do meu teste, e não do código. Na primeira corrida do e2e inteiro, o `rsk-qa.spec` entrava com a conta
"administradora". Com isso, 3 testes do `rsk.spec`, que roda depois dele, falharam: `conflito de versão…`, `T10 do RSK…`
e `axe em 320 px…` (lista vista com `--last-failed --list`). O único passo comum aos três é criar uma demanda, e o de
320 px só faz isso. A causa provável é o limite C-36 de 30 demandas por hora por conta: a suíte inteira já usava quase
tudo da "administradora", e as 4 demandas do meu spec passaram do limite. Não li a saída em `/tmp` para ver o 429. Troquei
o meu spec para a conta "cto", e a segunda corrida inteira passou. Criticidade: média, para a estabilidade da suíte (ver
Pendências); nenhuma para o produto.

## Decisões tomadas

- **Três arquivos `-qa` novos, sem editar os testes do engenheiro.** Assim o `git diff` dos arquivos rastreados fica vazio.
- **Banco real em tudo que é contrato.** A tela com o servidor, o painel com a rota, o gatilho da consolidação, o DEC
  desatualizado e o rascunho de agente: só os gravadores e leitores reais provam esses contratos. Os dublês ficam no
  cookie (`next/headers`), no roteador do cliente e no Sentry.
- **A correção do achado 1 é provada como propriedade, contra a validação nova.** O resultado esperado não é escrito à
  mão, e assim cobre qualquer combinação de linhas, e não só as que o engenheiro imaginou.
- **A ordem dos erros entra na comparação entre tela e servidor.** É a ordem do Resumo de erros; o servidor a dá pela
  ordem do schema, que hoje é a da tela.
- **O rascunho de agente vai ao Vitest com o ator `risco`, sem esperar o seed da T33.** A pendência da revisão pedia o
  e2e. O caminho de agente não tem login, e o banco real com as páginas reais prova o mesmo, sem token de serviço no e2e.
- **O e2e novo entra com a conta "cto".** A "administradora" ficou sem folga no limite por conta (C-36).

## Pendências

- **e2e no limite por conta (C-36), para `engenheiro-frontend` na T46 e para `devops-sre`.** A suíte inteira já chega
  perto de 30 demandas por hora na conta "administradora". Bastaram 4 a mais para 3 testes falharem. A "cto" tem folga
  hoje, mas a T43 a T46 vão criar mais demandas. Duas saídas, fora da minha lista Pode:
  - uma conta fictícia a mais no seed (`scripts/seed-ficticio.ts`), uma por spec que cria muito;
  - ou o servidor do e2e subir com um limite maior só no ambiente de teste.

  Sem isso, cada spec novo pode quebrar outro que roda depois dele, e a falha parece do outro.
- **Para a `07-qa-funcional` (G2):** seguem os itens do engenheiro e do tech-lead:
  - o Resumo de erros reanunciado e o foco que passa por ele ao remover um item com erro;
  - os grupos de nível aninhados nos grupos de risco, no leitor de tela;
  - os três "Comentário" com o mesmo nome visível.
- **Ferramentas Grep e Glob indisponíveis nesta sessão.** Li os arquivos com o Read, por trechos, e os módulos com
  `git show HEAD:<arquivo>`.
- **Saída do `pnpm test`.** Passou de 32 KB com o log do pino. Li só o fim do arquivo que a ferramenta gravou
  (`tool-results/b5h9t656l.txt`, fora de `/tmp`).
- **Saída do `pnpm test:e2e` inteiro.** As duas corridas passaram de 180 s e foram para segundo plano. Não li os arquivos
  em `/tmp`. A primeira terminou com código 1, e a lista das falhas veio de `--last-failed --list`. A segunda terminou com
  código 0, conferido também no `test-results/.last-run.json`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f0e384b4f7b140b8cd1773c168ce5099de25e95e` — 19 arquivos, código e testes da T42
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 1c7578c (06-T42-revisao) depois de f0e384b
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 1c7578c` — só a entrega da revisão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo construcao/DEC-DEM-20261022-0001-v1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/schemas.ts` — textoLivre e listaDeTextos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/erros.ts` — mensagens do mapeador de erro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f0e384b4f7b140b8cd1773c168ce5099de25e95e -- "src/app/(painel)/demandas/[id]/especificacoes/nova/FormularioEspecificacao.tsx" "src/app/(painel)/demandas/[id]/page.tsx" src/components/ListaTextos.tsx` — diff da T07, da T05 e da Lista de textos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/agentes/gatilhos.ts` — chave rsk:<id> da consolidação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/matriz.ts` — criar_parecer_risco para pessoa e risco
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/components/dados-da-especificacao.ts` — validação e rótulos da ESP
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/components/GrupoOpcoes.tsx` — id das opções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/schema/versoes.ts` — tabela parecer_risco
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/lista-textos-qa.test.ts` — 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/pareceres-risco/novo/parecer-qa.test.ts"` — 32 de 32
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco-qa.spec.ts` — 3 de 3 (ainda com a conta administradora)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/pareceres-risco" "src/app/(painel)/pareceres-risco" src/components --sequence.shuffle` — 324 de 324, semente 1793425725360
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/pareceres-risco" "src/app/(painel)/pareceres-risco" src/components --sequence.shuffle` — 324 de 324, semente 1793425740954
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 178 arquivos, 3.502 de 3.502, 86,3 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 1 (foi para segundo plano; 3 falhas no parecer-risco.spec.ts, causadas pelo meu spec na conta administradora)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os três arquivos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --last-failed --list` — os 3 testes do parecer-risco.spec.ts (conflito, T10 e 320 px)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- e2e` — specs e2e por commit
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — três arquivos novos e o rascunho desta entrega
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0 com o spec novo na conta cto (foi para segundo plano)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 81 testes em 14 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — três arquivos novos e esta entrega

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste: os cinco testes do plano, RF-09 (CA-09.1, CA-09.2, CA-09.3 pelo painel), RF-11, RF-19 ("mesma rota, mesmo schema", agente desligado, suspenso e gatilho), RNF-04, RNF-11, C-11, C-17, C-18, C-21, o achado 1 da T41 na T08 e na T07 e a pendência do rascunho de agente, na tabela da Entrega
- [x] a suíte inteira passa: 3.502 de 3.502 no Vitest; e2e com código 0, 81 testes, e `.last-run.json` com `passed`
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real: relógio fixo dos `Deps`, um dia por teste, agentes e teto voltam ao estado inicial antes de cada teste; duas corridas com `--sequence.shuffle`; o e2e novo usa a conta cto e não consome o limite da administradora usada pelo spec que roda depois
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada: `git diff --stat` vazio, só três arquivos novos
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real: só "Pessoa Ficticia", textos "(fictício)", `modelo-ficticio-t42`, `SENTINELA-RSK-E2E-7d1e` e os sentinelas de `test/sentinelas.ts`
