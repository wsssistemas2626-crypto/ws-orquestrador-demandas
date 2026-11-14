---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T04-testes
agente: qa-automacao
leu: [pedido.json (via tarefas e plano), contrato-passagem.md, padrao-tecnico.md (via plano G3), tarefas.json, 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T04), 04-seguranca-aplicacao.md (SB-07, SB-08, SB-09 e ameaças K04 a K07, por git grep), 06-T03-qa-automacao.md, 06-T04-engenheiro-backend.md, 06-T04-tech-lead.md, git show 6a7e426 --stat, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/pedido-construcao/caminhos-da-criacao.ts, src/modules/pedido-construcao/montar.ts, src/modules/pedido-construcao/conferir.ts (linhas 25 a 89), src/modules/dados-pessoais/minimizar.ts (linhas 200 a 263), src/modules/agentes/executar.ts (linhas 1 a 180), src/modules/agentes/execucoes.ts (criarExecucao), src/modules/agentes/executar.test.ts (trechos), src/modules/agentes/nivel-aprovacao.test.ts, src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts, src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.test.ts (linhas 1 a 120), src/modules/demandas/schemas.ts (linhas 20 a 79), src/modules/pareceres-risco/consultas.ts (obterParecerRisco), src/lib/rota.ts (linhas 40 a 69), src/lib/rota-corpo-invalido-qa.test.ts (trecho do ts-expect-error), tsconfig.json, src/modules/pacotes-decisao/marcacao-da-criacao.test.ts, src/modules/pedido-construcao/textos-da-criacao.test.ts, test/estatico/caminhos-da-criacao.test.ts, test/transversal/visibilidade-caminhos-da-criacao.test.ts, test/estatico/piso-de-assercoes.test.ts (linhas 90 a 133), test/requisicao.ts (linhas 1 a 50), test/provedor-falso.ts, saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T04 (marcação do nome em vigor na criação do DEC; S-03, ADR-37; SB-07 a, b, c, e; SB-08 c, f; SB-09 a,
b), commit `6a7e426`. O código passou nos testes do engenheiro e nos testes adversariais desta etapa. Não achei defeito
e não devolvo nada.

O maestro pediu três provas adversariais:
- a marcação nunca fica nula por esquecimento;
- a marcação nunca é gravada sem conferência;
- a coluna não vaza para agente.

Elas estão em dois arquivos novos, e os dois entram no `PISO`. Esta etapa também fecha o primeiro parecer Minor da
revisão: a guarda de `ExtrasDoPacote` e as linhas de `criar.ts` que citam a chave.

**Achado ao ler o código (coberto agora, sem defeito):** existe um quarto e um quinto caminho de criação de DEC, além
dos três que o engenheiro testou.
- A **Server Action** do painel (`src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts`, `gravarPacoteNoPainel`).
- O **worker de verdade** (`executarAgente` → `DESTINOS.consolidacao`, com a saída do modelo passando por
  `SCHEMA_DE_SAIDA`). O "worker com extras" do engenheiro chama `criarPacoteDecisao` direto.

Os dois gravam a coluna calculada. Agora cada um tem teste.

**Critério da tarefa → teste que o cobre**

| Critério | Arquivo | Teste |
|---|---|---|
| SB-07 (b): coluna não nula pelos caminhos de criação | `src/modules/pacotes-decisao/marcacao-da-criacao.test.ts` (engenheiro) | "%s: com o nome na ESP → […]; sem o nome em texto algum → [] (nunca null)" (3 caminhos) |
| SB-07 (b), adversarial: os **cinco** caminhos (rota de pessoa, rota do agente, Server Action, worker com extras, `executarAgente` com provedor falso) | `src/modules/pacotes-decisao/marcacao-da-criacao-qa.test.ts` (novo) | "%s: a coluna é a calculada, e traduzida para A e para B é igual ao que o D1 recusaria na geração"; "%s: sem o nome em texto algum, a coluna é [] (nunca null), e o D1 não recusaria nada" |
| SB-07 (a): chave no corpo descartada, coluna calculada | `marcacao-da-criacao.test.ts` (engenheiro) | "%s com caminhosComNomeNaCriacao: %j no corpo → 201 …"; "a chave no corpo, com um caminho inventado, não chega à coluna" |
| SB-07 (a), adversarial: a chave nas duas grafias, numa grafia parcial (`caminhosComNome`), dentro de `opcaoB` e na **saída do modelo**, pelos cinco caminhos | `marcacao-da-criacao-qa.test.ts` (novo) | os dois `it.each` acima (todo DEC é criado com `CHAVE_NO_CORPO`) |
| SB-07 (c): itens da lista de permissão, sem o nome | `marcacao-da-criacao.test.ts` (engenheiro); `marcacao-da-criacao-qa.test.ts` (novo) | "SB-07 (c): cada item casa a lista de permissão …"; no `it.each` dos cinco caminhos, a regex em cada item e `semNomeNemColuna` no valor |
| "Nunca sem conferência": a coluna, traduzida, é **igual** à conferência do D1, com o DEC, a ESP e o RSK relidos do banco (nome em 7 textos do pedido e em 3 que não vão a ele) | `marcacao-da-criacao-qa.test.ts` (novo) | "%s: a coluna é a calculada, e traduzida para A e para B é igual …" (`oQueOD1Recusaria`, sem nada de `criar.ts`) |
| Marcação sobre a ESP **citada** (M-01), e não sobre a mais nova | `marcacao-da-criacao-qa.test.ts` (novo) | "ESP v1 com o nome e v2 sem: o worker que leu a v1 marca a ESP; a rota de pessoa, que cita a v2, não"; "ESP v1 sem o nome e v2 com: …" |
| Nome em vigor na trava, e não o de quando a ESP foi escrita | `marcacao-da-criacao-qa.test.ts` (novo) | "o solicitante trocado depois da ESP e antes do DEC: marca o que cita o nome novo, e não o antigo" |
| SB-07 (e): corrida com a troca do `solicitanteNome`, duas conexões | `marcacao-da-criacao.test.ts` (engenheiro) | "(i) a troca do nome segura a trava …"; "(ii) a criação segura a trava …" |
| SB-07: insert só em `criar.ts`; chave fora de schema, rota, `'use server'`, job e worker | `test/estatico/caminhos-da-criacao.test.ts` (engenheiro) | "o insert em pacote_decisao só existe em criar.ts"; "nenhum schemas.ts, route.ts, …" |
| SB-07: `ExtrasDoPacote` sem a chave (Minor da revisão) | `test/estatico/caminhos-da-criacao-qa.test.ts` (novo) | "ExtrasDoPacote tem só execucaoAgenteId, especificacaoId e parecerRiscoId, e não cita a chave"; "ExtrasDoPacote só é declarado em criar.ts, e ninguém o estende com &" |
| SB-07: em `criar.ts`, a chave só no import, no tipo e no valor (Minor da revisão) | `caminhos-da-criacao-qa.test.ts` (novo) | "exatamente três linhas citam a chave, e são estas"; "a linha do insert é campo a campo: só ...autoria espalhado, e de extras só o execucaoAgenteId" |
| SB-07: ordem trava → ESP e RSK citados pela transação → textos → nome de `d` → linha → insert; marcação e `textosDaCriacao` só em `criar.ts` | `caminhos-da-criacao-qa.test.ts` (novo) | "trava → ESP e RSK citados → textos (pela transação) → nome da linha travada → linha → insert"; "a marcação só é calculada em criar.ts, e textosDaCriacao só é chamada lá" |
| SB-07: tipo da linha com a coluna obrigatória e não nula | `caminhos-da-criacao-qa.test.ts` (novo) | "sem a coluna e com null não compilam (pnpm typecheck); com a lista, compila" (dois `@ts-expect-error`: se o tipo aceitasse, o `tsc` acusaria a diretiva sem uso) |
| SB-08 (c): igualdade `textosDaCriacao` × `textosDoPedido` | `src/modules/pedido-construcao/textos-da-criacao.test.ts` (engenheiro) | "%s: para A e para B, os mesmos caminhos, na mesma ordem, com os mesmos valores" (5 ESP) |
| SB-08 (f): regex sem flag, com âncoras, sem estado | `textos-da-criacao.test.ts` (engenheiro) | "sem flag g nem y; com âncoras; duas chamadas seguidas dão o mesmo resultado" |
| SB-08 (e), já para a T05: leitura falha fechada, mensagem fixa | `textos-da-criacao.test.ts` (engenheiro) | "fora do formato lança o erro fixo, sem o valor e sem as issues do Zod" |
| SB-09 (a): chaves da 0.4.0 nas leituras a partir da `MATRIZ`, pessoa e quatro agentes | `test/transversal/visibilidade-caminhos-da-criacao.test.ts` (engenheiro); `test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts` (06-T03) | "a partir da MATRIZ: …"; "varre MATRIZ × rotas × quatro agentes …" |
| SB-09 (b): entrada do provedor falso sem a coluna | `visibilidade-caminhos-da-criacao.test.ts` (engenheiro) | "a entrada montada para o provedor falso, nos quatro agentes, não tem a coluna" |
| SB-09 / C-30, adversarial: evento, log e Sentry da criação sem a coluna nem o nome, pelos cinco caminhos | `marcacao-da-criacao-qa.test.ts` (novo) | "%s: o evento pacote_decisao_criado tem só as 5 chaves de hoje, e o log não tem a coluna nem o nome" |
| SB-09, adversarial: o 400 não ecoa a chave nem o nome (pessoa e agente), e nenhum DEC nasce | `marcacao-da-criacao-qa.test.ts` (novo) | "400 da rota (%s) com só a chave da coluna e o nome no corpo …"; "400 de \"faltam itens\" com a chave no corpo …" |
| 201 de pessoa e de agente com as chaves da 0.4.0 | `marcacao-da-criacao.test.ts` (engenheiro) | "o 201 de pessoa tem as chaves de 41108ee …"; "o 201 do agente consolidacao também não tem a coluna" |

**Testes acrescentados**

1. `src/modules/pacotes-decisao/marcacao-da-criacao-qa.test.ts`: 21 testes, 27 linhas `expect(`. Roda com Postgres
   real, papel do app, rotas, tokens, Server Action e `executarAgente` reais, provedor falso e relógio fixo.
   - **Cenário:** o nome "Joana Ficticia Lima" (fictício) aparece em sete textos que vão ao pedido. São eles: título,
     contexto, ESP, comentário do RSK, opção A, critério 1 e item de pronto 0. O nome também aparece em três textos que
     não vão ao pedido: resumo, recomendação e vantagens da opção B.
   - **Chave enviada:** todo DEC é criado com a chave da coluna no corpo ou na saída do modelo, com os valores `[]`,
     `null` e `['x']`, nas duas grafias, inclusive dentro de `opcaoB`.
   - **Coluna:** em cada caminho, a coluna é a lista calculada, nem `null` nem o valor enviado.
   - **Conferência:** traduzida por `caminhosDaCriacaoNoPedido`, a coluna é igual ao que o D1 recusaria com o mesmo nome.
     O valor esperado é calculado sem nada de `criar.ts`: `textosDoPedido` + `temNome` sobre o DEC, a ESP e o RSK
     relidos do banco pelas mesmas leituras de `conferir.ts`, para A e para B.
   - **Casos extras:**
     - a ESP citada pelo worker (v1) contra a mais nova (v2), nos dois sentidos;
     - o nome trocado antes da criação;
     - evento, log e `capturarErro` limpos nos cinco caminhos;
     - os dois tipos de 400 sem eco.
2. `test/estatico/caminhos-da-criacao-qa.test.ts`: 10 testes, 33 linhas `expect(`. São guardas sobre o texto de
   `criar.ts` e do código que roda. Cada regra tem um caso plantado que a reprova: chave em `ExtrasDoPacote`, quarta
   linha com `extras.caminhosComNomeNaCriacao ?? []`, `...entrada` na linha, nome lido antes da trava, ESP lida por
   `deps.db` e valor trocado por `[]`. O tipo da linha é conferido pelo `pnpm typecheck`, com `@ts-expect-error`.
3. `test/estatico/piso-de-assercoes.test.ts`: só acréscimo, os dois arquivos acima (27 e 33).
   - Para conferir a contagem, pus 28 e 34 de propósito. O piso falhou com `expected 27 …` e `expected 33 …`, e os
     valores voltaram a 27 e 33.

**Resultado**

- `pnpm test` (suíte inteira): **368 de 368 arquivos, 8001 de 8001 testes, 0 falhas** (217 s).
- Arquivos novos isolados: 21 de 21 e 10 de 10.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo. Os dois rodaram de novo depois da última mudança no piso.

**Testes existentes (conferidos com `git diff` e `git show 6a7e426 --stat`)**: a T04 só criou arquivos de teste e
acrescentou entradas ao `PISO`. Nesta etapa, a árvore só tem o acréscimo de 5 linhas em `piso-de-assercoes.test.ts` e os
dois arquivos novos. Os seis arquivos da T04 e desta etapa não têm `.skip`, `.only`, `.todo`, `Date.now` nem
`new Date()`. Nenhuma asserção foi afrouxada.

## Decisões tomadas

- A prova de que a marcação não é gravada sem conferência compara a coluna com o D1 recalculado pelo banco. Ela não
  compara com uma lista escrita à mão só. Assim, uma divergência entre o que `criar.ts` lê e o que `conferir.ts` vai
  ler é pega, por exemplo no arredondamento do jsonb, na descrição sem rótulos ou na ESP citada. A lista literal fica
  junto, para o valor exato não depender só da igualdade.
- O nome foi posto também em textos que não vão ao pedido (resumo, recomendação, vantagens). Isso prova que a marcação
  não conta a mais nem a menos que o D1.
- O worker de verdade (`executarAgente`) entrou porque a saída do modelo é outra superfície de entrada (C-25). O caminho
  com `extras` direto não passa por `SCHEMA_DE_SAIDA`.
- A Server Action entrou porque é um caminho de criação que nenhum teste da T04 chamava. A guarda estática do
  engenheiro só prova que ela não cita a chave.
- Os testes não dependem de ordem:
  - cada caso cria a demanda dele, com autora própria (C-36);
  - o agente `consolidacao` é ligado e desligado dentro do caso, num `try/finally`;
  - o log é zerado no `beforeEach` e de novo antes da criação.
- O Minor 2 da revisão (`esperarTrava` conta qualquer espera `Lock`) não foi mexido no teste do engenheiro. A correção
  é opcional, e o resultado do teste não depende dela.

## Pendências

- Nenhuma que impeça a próxima etapa.
- Para a T05: a guarda "a marcação só é calculada em criar.ts" (`caminhosComNomeNaCriacao(` chamada só lá) vai reprovar
  se `conferir.ts` passar a recalcular a marcação. O plano manda a T05 só ler a coluna, com `lerCaminhosDaCriacao` e
  `caminhosDaCriacaoNoPedido`.
- Para a `08-revisao`: segue o Minor 3 da revisão. `\d{1,4}` aceita zero à esquerda, e esse item não corresponde a
  nenhum caminho do pedido.
- Comando com opção a mais: usei `--untracked` em dois `git grep` (contagem e busca nos arquivos novos, ainda não
  rastreados). A regra do maestro cita `git grep -n` e `-c` sem essa opção. Os dois comandos só leram arquivos que eu
  criei nesta etapa, e estão declarados abaixo.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 21 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T04\|^## \|^### " -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T04 na linha 788
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SB-07\|SB-08\|SB-09" -- docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md` — linhas 205 a 207 e a tabela de ameaças
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 6a7e426d0ae181ea86973f3ff7886d9424315743` — 11 arquivos; testes só novos e o piso com +5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "0018\|caminhos\|T0[1-4]" -- test/estatico/piso-de-assercoes.test.ts` — entradas do pedido no PISO
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "criarPacoteDecisao" -- src` — chamadores (saída longa, guardada pelo harness)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A14 "export function temNome" -- src/modules/dados-pessoais/minimizar.ts` — temNome
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A10 "export const nomesDoSolicitante" -- src/modules/demandas/consultas.ts` — null vira lista vazia
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "criarPacoteDecisao" -- src/modules/agentes src/worker src/jobs src/app/api` — executar.ts:121 e a rota
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "criarPacoteDecisao" -- "src/app/(painel)"` — a Server Action novo/acoes.ts
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "consolidacao" -- src/modules/agentes test/provedor-falso.ts` — testes do agente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- test/provedor-falso.ts test/banco.ts test/deps.ts test/requisicao.ts test/sessao.ts` — ajudantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "consolidacao\|executarAgente\|function \|ProvedorFalso\|precoVigente\|configuracaoAgente\|insert(" -- src/modules/agentes/executar.test.ts` — molde da execução
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "solicitanteNome" -- src/modules/demandas/schemas.ts` — obrigatório
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "solicitanteNome\|solicitante_nome" -- src/db/schema` — notNull
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "sistemaAlvo\|repositorioDestino\|export const criarEspecificacaoSchema" -- src/modules/especificacoes/schemas.ts` — formato
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export function valoresDoParecer\|export function valoresDaEspecificacao" -- src/modules/pedido-construcao/conteudo.ts` — campos conferidos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "exemploSaida" -- src/agents/consolidacao.ts` — saída de exemplo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/agents test` — lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "campos\|issues" -- src/lib/rota.ts src/lib/erros.ts` — formato do 400
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "substituirDestinoDoLog\|write(" -- src/lib/log.ts` — destino do log
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Comentario\|resumo" -- src/modules/pareceres-risco/schemas.ts` — campos do RSK
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function criarExecucao\|export async function executarAgente" -- src/modules/agentes` — assinaturas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function obterEspecificacao\|export async function obterParecerRisco\|export async function obterPacoteDecisao\|decisao: {" -- src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts` — assinaturas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export type PacoteDecisaoVista\|opcaoEscolhida\|decididaEm" -- src/modules/pacotes-decisao/consultas.ts` — DecisaoVista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export type ResultadoAcao\|ok: true" -- src/lib/acao-painel.ts` — resultado da Server Action
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "ts-expect-error" -- src test` — dois usos de molde
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "include\|exclude" -- tsconfig.json` — testes no typecheck
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/marcacao-da-criacao-qa.test.ts --reporter=dot` — 21 de 21
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/caminhos-da-criacao-qa.test.ts --reporter=dot` — 10 de 10
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/modules/pacotes-decisao/marcacao-da-criacao-qa.test.ts test/estatico/caminhos-da-criacao-qa.test.ts` — 27 e 33
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 2 falhas de propósito (piso 28 e 34; contagem real 27 e 33)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 368 de 368 arquivos, 8001 de 8001 testes, 0 falhas (217 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só piso-de-assercoes.test.ts (+5)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/piso-de-assercoes.test.ts` — só acréscimo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 1 alterado, 2 testes novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked "\.skip\|\.only\|\.todo\|Date.now\|new Date()" -- src/modules/pacotes-decisao/marcacao-da-criacao-qa.test.ts test/estatico/caminhos-da-criacao-qa.test.ts src/modules/pacotes-decisao/marcacao-da-criacao.test.ts src/modules/pedido-construcao/textos-da-criacao.test.ts test/estatico/caminhos-da-criacao.test.ts test/transversal/visibilidade-caminhos-da-criacao.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o mesmo estado, mais esta entrega
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (de novo, depois do piso)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (de novo, depois do piso)

A saída da suíte foi lida com a ferramenta Read em /tmp, sem comando Bash.

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
