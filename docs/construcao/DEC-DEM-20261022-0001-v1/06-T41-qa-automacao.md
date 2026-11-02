---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T41-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T41, linhas 3729 a 3760), 01-analista-requisitos.md (RF-08, RF-11, RF-12, RF-15, RF-19, RF-26 e a tabela de RNF), 06-T41-engenheiro-frontend.md, 06-T41-tech-lead.md, 05-tech-lead.md (início), 06-T40-qa-automacao.md (formato), git show --stat 3666be2, src/components/{dados-da-especificacao,lista-textos}.ts, "src/app/(painel)/demandas/[id]/especificacoes/nova/{page.tsx,FormularioEspecificacao.tsx,acoes.ts,acoes.test.ts,pagina.test.ts (início)}", "src/app/(painel)/especificacoes/[espId]/{page.tsx,especificacao-da-pagina.ts,pagina.test.ts (início)}", e2e/{especificacao.spec,demanda-formularios-qa.spec,apoio}.ts, "src/app/(painel)/demandas/[id]/detalhe-qa.test.ts (linhas 1 a 340)", src/modules/especificacoes/{servico,schemas,consultas}.ts, src/modules/versoes.ts, src/modules/agentes/{gatilhos,execucoes (início)}.ts, src/lib/acao-painel.ts, src/app/api/demandas/[id]/especificacoes/route.ts, test/{deps,requisicao,sentinelas}.ts, vitest.config.ts, git show HEAD:src/modules/demandas/schemas.ts, git show HEAD:src/lib/rota.ts, git show HEAD:src/lib/erros.ts, git show HEAD:src/lib/fila.ts, git show HEAD:src/modules/acesso/{ator,matriz}.ts, git show HEAD:src/db/schema/agentes.ts, git show HEAD:test/sessao.ts, saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/bwaelc45u.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T41: Lista de textos, T07 Nova versão da ESP e T10 Ver ESP. O código e os testes do engenheiro estão no `3666be2`; o
`1f5ce9d` só traz a revisão do tech-lead. Não achei falha no código contra nenhum critério da tarefa.

### Critério da tarefa e teste que o cobre

A T41 cobre RF-08 (painel), RF-11 (sem editar nem excluir), RF-15 (diálogo com dúvida), RF-19 (preenchimento manual) e
RNF-11, mais os sete testes do texto do plano e as três pendências que a `06-T41-revisao` mandou para esta etapa.
Legenda: (E) teste do engenheiro, (Q) teste desta etapa. Nomes curtos dos arquivos:
- `esp.spec` = `e2e/especificacao.spec.ts` (E)
- `esp-qa.spec` = `e2e/especificacao-qa.spec.ts` (Q)
- `acoes.test` = `src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.test.ts` (E)
- `esp-qa` = `src/app/(painel)/demandas/[id]/especificacoes/nova/especificacao-qa.test.ts` (Q)
- `nova.test` = `src/app/(painel)/demandas/[id]/especificacoes/nova/pagina.test.ts` (E)
- `ver.test` = `src/app/(painel)/especificacoes/[espId]/pagina.test.ts` (E)
- `dados.test` = `src/components/dados-da-especificacao.test.ts` (E)
- `dados-qa` = `src/components/dados-da-especificacao-qa.test.ts` (Q)
- `lista.test` = `src/components/lista-textos.test.ts` (E)

| Critério | Teste |
|---|---|
| Plano: primeira ESP, "Esta será a primeira…, a v1." e volta à T05 com "ESP-…-v1 gravada." (RF-08, CA-08.1 pelo painel) | `esp.spec` › `primeira ESP…` (E); `acoes.test` › `primeira ESP: grava a v1…` (E) |
| Plano: v2 começa preenchida com a v1, "A v1 continua guardada e não muda." (CA-08.1 a v2; RF-12 no aviso do DEC) | `esp.spec` › `v2 começa preenchida…; o DEC pendente fica desatualizado` (E); `acoes.test` › `DEC pendente em dia fica desatualizado…` (E) |
| Plano: Lista de textos (foco ao adicionar e remover, 50 itens desabilita) | `esp.spec` › `lista de textos…` (E); `lista.test` (E, 10 testes) |
| Plano: repositório destino calculado e erros de construção da API no resumo (CA-08.2, CA-08.3) | `esp.spec` › `repositório destino calculado…` (E); `esp-qa` › `CA-08.3 pelo painel: conta fora da lista (seleção adulterada) passa na tela e o servidor recusa, na "Conta do repositório"…` (Q) |
| RF-08 / CA-08.2, CA-08.3, CA-08.5 pelo painel, com a mesma regra da rota | `esp-qa` › `RF-19: o painel usa a mesma regra e o mesmo schema da rota` › 9 casos `…: a rota responde 400 e a Server Action devolve o mesmo erro, a mesma mensagem e os mesmos campos` (Q) |
| RF-08: validação da tela é só conveniência; tela e servidor no mesmo campo, linha, rótulo e mensagem | `acoes.test` › `a validação da tela é só conveniência…` (E); `esp-qa` › `a tela e o servidor concordam (T07)` › 8 casos `…: o mesmo erro, no mesmo lugar, pela tela e pelo servidor; nada é gravado` (Q) |
| Plano e RF-15: com dúvida, diálogo, "Gravar mesmo assim" e "A demanda foi para Aguardando informação." | `esp.spec` › `com dúvida: diálogo…` (E); `acoes.test` › `com dúvida: a demanda vai a aguardando_informacao (CA-15.1)` (E) |
| RF-15 / CA-15.1 e CA-15.2 pelo painel: ator sistema no histórico, nenhuma mensagem nem job | `esp-qa` › `CA-15.1 e CA-15.2 pelo painel: com dúvida, a demanda vai a Aguardando informação pelo ator sistema; nenhum job (nem de aviso) entra na fila` (Q) |
| RF-19 / CA-19.2: agentes desligados, nada enfileirado, a pessoa grava pelo painel | `esp-qa` › `CA-19.2: com os agentes desligados, criar a demanda não enfileira nada, e a pessoa grava a ESP pelo painel, também sem enfileirar` (Q) |
| RF-19: "nas mesmas rotas e com o mesmo schema" (recusa e gravação iguais às da rota; gatilho do agente igual) | `esp-qa` › os 9 casos de recusa, `a mesma entrada válida grava o mesmo conteúdo pela rota e pelo painel…` e `agente de risco ligado: a ESP do painel sem dúvida o dispara, com a chave esp:<id> e um job; a com dúvida não dispara nada` (Q) |
| Plano e RF-11: T10 somente leitura, sem editar nem excluir; "Criar nova versão a partir desta" | `esp.spec` › `T10: somente leitura…` (E); `ver.test` (E) |
| RF-11 / CA-11.1 pelo painel: a versão nova não muda a anterior; id e versão adulterados descartados; só a ação de gravar existe | `esp-qa` › `RF-11: a v2 pelo painel, a partir da v1, não muda a v1; id, versão e autoria adulterados na entrada são descartados` (Q) |
| Conflito de versão (03, T07) | `esp.spec` › `conflito de versão…` (E); `acoes.test` › `conflito de versão…` (E); `esp-qa` › `dois envios da mesma tela ao mesmo tempo: v1 e v2, e só o que virou v2 diz que houve conflito` (Q) |
| Duplo envio | `esp-qa.spec` › `duplo clique em "Gravar": um envio só e uma ESP só; a resposta da Server Action não traz o que foi digitado` (Q) |
| `?base=` só da mesma demanda; chegada na T05 sem confiar na URL | `nova.test` (E, com dublê); `dados.test` › chegada na T05 (E); `esp-qa.spec` › `?base= de outra demanda, de versão que não existe ou fora do formato…; a chegada na T05 não confia na URL` (Q) |
| Rascunho de agente na T07 e na T10 (Minor do engenheiro: só visto com dublê) | `nova.test` e `ver.test` (E, dublê); `esp-qa` › `ESP v1 do agente de insumo técnico: a T07 avisa e parte dela; a v2 da pessoa não é rascunho; a T10 da v1 tem o selo, o aviso e o link da v2, e a da v2 não` (Q, gravada pelo ator `insumo_tecnico` no banco real) |
| C-11: autoria só da sessão | `acoes.test` › `primeira ESP…` (E); `esp-qa` › RF-11 e `a mesma entrada válida…` (Q) |
| C-17: id pela regex antes do banco; 404 | `acoes.test` › `id fora do formato não toca o banco…` (E); `nova.test` e `ver.test` (E); `esp-qa.spec` › `404 com status HTTP 404, e não 200, na T07 e na T10 que não existem` (Q, pendência da revisão) |
| Achado 3 da revisão: `RE_ID_ESP` igual à regra do servidor | `dados-qa` › 5 testes de `RE_ID_ESP igual à regra de id de ESP do servidor…` (Q), contra `reIdVersao('ESP')` de `rota()` e `RE_ID_VERSAO` de `versoes.ts` |
| C-18: conteúdo como texto | `ver.test` (E); `esp-qa` › rascunho de agente, com `<img onerror>` vindo do agente escapado na T07 e na T10 (Q) |
| C-21: log sem dado digitado | `esp-qa` › `C-21: uma linha de log por envio, sem nada do que foi digitado nem o id da demanda; a resposta também não traz o digitado` (Q) |
| RNF-11: axe sem violação | `esp.spec`: T07 vazia, preenchida, com 50 itens, com erro, com erro da API, com o diálogo, em 320 px, T05 depois de gravar, T10 e 404 da T10 (E); `esp-qa.spec`: 404 da T07 e T05 com a chegada da T07 (Q) |

### Leitura crítica dos testes do engenheiro

- **A tela e o servidor podiam discordar.** A tela tem cópias da regra: o limite de texto, o formato e o tamanho do
  sistema alvo, o limite de itens e as mensagens. O `dados.test` trava as constantes, e o `acoes.test` prova dois casos
  de recusa. Faltava provar que, para os mesmos valores da tela, o servidor recusa o mesmo e o erro volta ao mesmo
  lugar. O `esp-qa` faz isso em 8 casos. Ele confere campo, id de foco, rótulo e mensagem, inclusive com linhas vazias
  descartadas antes do item com erro, que é onde o mapa de índices (`indices`) pode errar.
- **"Mesma rota, mesmo schema" (RF-19) só estava no comentário.** O `esp-qa` chama `POST /api/demandas/:id/especificacoes`
  e a Server Action com as mesmas 9 entradas ruins. Os dois devolvem o mesmo `erro`, a mesma `mensagem` e os mesmos
  `campos`. A mesma entrada válida grava o mesmo conteúdo pelos dois caminhos. A ESP do painel também dispara o agente
  de risco, como a da rota.
- **CA-19.2 e CA-15.2 não tinham teste pelo painel.** O `esp-qa` confere a tabela `execucao_agente` e os jobs do
  `pgboss.job`: nada com os agentes desligados, nada com dúvida, e um job com a chave `esp:<id>` com o agente de risco
  ligado.
- **O conflito só era testado em sequência.** O `esp-qa` manda dois envios ao mesmo tempo. A trava da demanda os
  serializa em v1 e v2, e só o que virou v2 traz `conflito: true`.
- **O rascunho de agente só era visto com dublê** (Minor do engenheiro). O `esp-qa` grava a v1 com o ator
  `insumo_tecnico` no banco real e lê a T07 e a T10 com as leituras reais. O teste confere quatro coisas:
  - o aviso de rascunho e a partida pela v1;
  - a v2 da pessoa sem marca de rascunho;
  - o selo e o aviso só na v1;
  - o link "Existe uma versão mais nova", com `versaoMaisNova` calculado pelo banco.
- **e2e do engenheiro:** os 9 testes preparam pela API e conferem pelo navegador, com axe. Não achei espera fixa nem
  dependência de ordem, e cada teste cria a própria demanda. Faltavam três coisas, cobertas pelo `esp-qa.spec`:
  - o status HTTP do 404, conferido por `response.status()`;
  - a URL forjada no navegador;
  - o duplo clique.
- **Nenhuma asserção do engenheiro foi alterada.** Os testes desta etapa estão em três arquivos novos.

### Testes acrescentados (34, em 3 arquivos novos)

| Arquivo | Testes |
|---|---|
| `src/app/(painel)/demandas/[id]/especificacoes/nova/especificacao-qa.test.ts` | 26, com Testcontainers e Better Auth reais. Tela e servidor concordam: 8 casos e CA-08.3 pela conta adulterada. Mesma regra da rota: 9 recusas e 1 gravação. RF-19 e RF-15: CA-19.2, gatilho do risco e CA-15.1/CA-15.2. Concorrência, RF-11 e C-21. Rascunho de agente na T07 e na T10 |
| `src/components/dados-da-especificacao-qa.test.ts` | 5, sem banco: `RE_ID_ESP` contra `reIdVersao('ESP')` e `RE_ID_VERSAO`, em 4 ids válidos, 28 inválidos e 216 combinações geradas, mais as flags da regex |
| `e2e/especificacao-qa.spec.ts` | 3: 404 com status HTTP na T07 (3 caminhos) e na T10 (6 caminhos), com 200 na que existe; `?base=` e chegada forjados; duplo clique em "Gravar" |

O relógio é sempre o fixo dos `Deps`, com um dia por teste. Nenhum teste lê `Date.now` nem depende de outro. Os
agentes e o teto voltam ao estado inicial antes de cada teste.

### Resultado

- `pnpm test` (suíte inteira, numa rodada): 172 arquivos e **3.407 de 3.407**. São os 3.376 que já existiam mais os 31
  novos de Vitest.
- `pnpm test "src/app/(painel)/demandas/[id]/especificacoes" "src/app/(painel)/especificacoes" src/components --sequence.shuffle`:
  285 de 285, duas vezes (sementes 1793422854663 e 1793422876313).
- `pnpm test:e2e e2e/especificacao-qa.spec.ts`: 3 de 3.
- `pnpm test:e2e --list`: **71 testes em 12 arquivos**. São os 59 da T40, os 9 do engenheiro e os 3 desta etapa.
- `pnpm test:e2e` inteiro: código de saída 0. A saída passou de 180 s, e a ferramenta levou o comando para segundo
  plano. Não li o arquivo em `/tmp`. Até ir para segundo plano, a numeração vista chegou ao 47 sem falha, com os 3 testes
  novos (37 a 39) e os 9 do engenheiro (40 a 47 vistos). O Playwright sai com código diferente de 0 se algum dos 71
  falhar.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status --short --untracked-files=all`: só os três arquivos novos. `git diff --stat` vazio: nenhum arquivo rastreado
  mudou.

### Classificação de falhas

Nenhuma falha no código contra critério da T41. Os únicos erros que apareceram eram meus: um tipo (`autor.nome` em
`Responsavel`), recusado pelo `pnpm typecheck`, e 4 avisos de variável sem uso, do `pnpm lint`. Corrigi os dois no meu
arquivo.

## Decisões tomadas

- **Três arquivos `-qa` novos, sem editar os testes do engenheiro.** Assim o `git diff` dos arquivos rastreados fica vazio.
- **Banco real em tudo que é contrato.** A tela com o servidor, o painel com a rota, o gatilho do agente e o rascunho de
  agente: só os gravadores e leitores reais provam esses contratos. Os dublês ficam no cookie (`next/headers`), no
  roteador do cliente e no Sentry.
- **A comparação entre tela e servidor usa só casos de uma fase.** O servidor valida em duas fases: primeiro o Zod,
  depois a regra de construção. Um caso que misture as duas mostra os erros em duas rodadas quando a tela é contornada.
  Isso é a regra do servidor, e não falha, porque a validação da tela pega tudo antes.
- **Os jobs são conferidos pela diferença na tabela `pgboss.job`.** Contar o antes e o depois mostra que nada entrou na
  fila, inclusive aviso, sem depender do nome de cada fila.
- **O e2e novo tem só 3 testes, cada um com um login.** O e2e é caro, e o engenheiro registrou o 429 do `verify-totp` em
  logins seguidos. O resto ficou no Vitest.

## Pendências

- **429 do `verify-totp` em logins seguidos (pendência da revisão).** Não se repetiu aqui: rodei o e2e novo isolado e a
  suíte inteira, e todos os logins passaram. Sem reprodução, a causa (limite por conta no plugin ou por IP) segue em
  aberto. Junta-se à pendência de C-06 da T09.
- **Para a T42 (`engenheiro-frontend`):** o achado 1 da revisão (erro de item na linha errada depois de remover) não
  tem teste aqui. A correção é da T42, que reusa a Lista de textos; o teste deve vir com ela.
- **Para a `07-qa-funcional`:** seguem os itens G2 do engenheiro e do tech-lead:
  - o foco depois do diálogo, com e sem falha da API;
  - os grupos aninhados no leitor de tela;
  - os cinco "Adicionar item" com o mesmo nome visível.
- **Ferramentas Grep e Glob indisponíveis nesta sessão.** Li os arquivos com o Read, por trechos, e os módulos com
  `git show HEAD:<arquivo>`.
- **Saída do `pnpm test`.** Com o log do pino, ela passou de 32 KB. Li só o fim do arquivo que a ferramenta gravou
  (`tool-results/bwaelc45u.txt`, fora de `/tmp`).
- **Saída do `pnpm test:e2e` inteiro.** O comando passou de 180 s e foi para segundo plano. Valem o código de saída 0 e
  a parte vista até o teste 47. Não li o arquivo em `/tmp`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 3666be297a7e143ef83fbc0e860b3c91320eec45` — 18 arquivos, código e testes da T41
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — 1f5ce9d (06-T41-revisao) depois de 3666be2
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo construcao/DEC-DEM-20261022-0001-v1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- e2e test` — arquivos de e2e e ajudantes de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- src/modules/agentes src/modules/especificacoes src/modules/avisos test/enviador-falso.ts test/sentinelas.ts` — módulos de agentes, ESP e avisos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/schemas.ts` — listaDeTextos e limites
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/rota.ts` — reIdVersao e o adaptador da rota
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/sessao.ts` — criarPessoa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/erros.ts` — mensagens do mapeador de erro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/matriz.ts` — criar_especificacao para pessoa e insumo_tecnico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/ator.ts` — AtorAgente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/fila.ts` — esquema pgboss e nomes das filas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/schema/agentes.ts` — execucao_agente
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/especificacoes/nova/especificacao-qa.test.ts"` — 26 de 26
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-especificacao-qa.test.ts` — 5 de 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/especificacao-qa.spec.ts` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro de tipo no meu arquivo (autor.nome), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 4 avisos de variável sem uso no meu arquivo, corrigidos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/especificacoes" "src/app/(painel)/especificacoes" src/components --sequence.shuffle` — 285 de 285, semente 1793422854663
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/especificacoes" "src/app/(painel)/especificacoes" src/components --sequence.shuffle` — 285 de 285, semente 1793422876313
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 172 arquivos, 3.407 de 3.407, 82,8 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 71 testes em 12 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0 (passou de 180 s e foi para segundo plano; numeração vista até 47, sem falha)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os três arquivos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -2` — HEAD em 1f5ce9d

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste: os sete testes do plano, RF-08 (CA-08.1, CA-08.2, CA-08.3, CA-08.5), RF-11 (CA-11.1 pelo painel), RF-15 (CA-15.1, CA-15.2), RF-19 (CA-19.2 e "mesma rota, mesmo schema"), RNF-11, C-11, C-17, C-18 e C-21, na tabela da Entrega
- [x] a suíte inteira passa: 3.407 de 3.407 no Vitest; e2e com código 0, 71 testes, e 3 de 3 do e2e novo numa corrida isolada
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real: relógio fixo dos `Deps`, um dia por teste, agentes e teto voltam ao estado inicial antes de cada teste; duas corridas com `--sequence.shuffle`
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada: `git diff --stat` vazio, só três arquivos novos
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real: só "Pessoa Ficticia", textos "(fictício)", `modelo-ficticio-t41`, `SENTINELA-ESP-E2E-4b2c` e os sentinelas de `test/sentinelas.ts`
