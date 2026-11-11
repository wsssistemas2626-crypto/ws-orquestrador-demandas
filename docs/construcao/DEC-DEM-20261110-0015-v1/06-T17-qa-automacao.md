---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T17-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G6, T16, T17 e rastreabilidade), 01-analista-requisitos.md (RF-12 a RF-17, RNF), 05-tech-lead.md, 06-T16-qa-automacao.md, 06-T17-engenheiro-frontend.md, 06-T17-tech-lead.md, construção da T17 pelo diff 2604b9f..e61a556, playwright.config.ts, eslint.config.mjs, e2e/apoio.ts, e2e/servidor.ts, e2e/axe-todas.spec.ts (linhas 1 a 90 e 225 a 290), test/estatico/projeto.test.ts, test/estatico/pacote-sem-extras.test.ts, test/estatico/fontes-qa.test.ts (linhas 1 a 80), test/estatico/piso-de-assercoes-qa.test.ts (linhas 1 a 40), test-results/…/error-context.md da falha da T07 (gerado pela minha rodada)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T17 passa. Cada critério da tarefa tem teste. Acrescentei um teste estático, `test/estatico/capturas-qa.test.ts`
(19 testes), que fecha três furos dos testes da construção (seção 2). Nenhum teste existente mudou.

Resultados com o código final:
- `pnpm test`: 5249 de 5249, 234 arquivos.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm test:e2e`, rodada 2: 249 passaram e 9 foram puladas (as capturas, que já existem).
- `pnpm test:e2e`, rodada 1: **2 falhas intermitentes**, fora da T17 e sem relação com o código dela. Estão
  classificadas na seção 3 e são a primeira linha de Pendências.

### 1. Critérios da T17 e o teste que cobre cada um

| Critério (plano, T17) | Teste | Resultado |
|---|---|---|
| CA-17.1: `package.json` em 0.2.0 | `test/estatico/projeto.test.ts` › "versão 0.2.0, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)" | passa |
| CA-17.2: existem as nove capturas | `test/estatico/capturas-qa.test.ts` › "a pasta do manual tem exatamente as nove capturas da lista, e nenhum outro arquivo" (**novo**) | passa |
| CA-17.2: nome com tela e largura | `test/estatico/capturas.test.ts` › "as nove: T01, T03, T05 e T11 nas duas larguras…"; `capturas-qa.test.ts` › "`<nome>`.png: PNG inteiro, com o tamanho da janela do nome…" (9 testes, **novos**: 1280 × 720 ou 390 × 844 conforme o nome) | passa |
| CA-17.2 e RNF-14: nenhum dado pessoal real | conferência visual das nove PNG, feita pelo engenheiro e pela revisão, e a da 08 (CV-17). Em código: `capturas.test.ts` (sem T02 e sem contas sem 2FA) e `capturas-qa.test.ts` › "e2e/capturas.spec.ts não tem nenhum desvio" (**novo**: só `cto` e `administradora`, só as quatro rotas, nenhuma ação), mais "sem metadado de texto" em cada PNG (**novo**) | passa |
| CV-17: só em loopback, nunca com `CI` | `capturas.test.ts` › describe "CV-17: capturas só em loopback e fora do CI" (6 testes); `capturas-qa.test.ts` › describe "CV-17: podeCapturar nas bordas da URL" (2 testes, **novos**) | passa |
| D-04: grava uma vez, `REGRAVAR` vazio | `capturas.test.ts` › "REGRAVAR fica vazio no commit", "deveGravar: …"; `capturas-qa.test.ts` › "os cinco testes de e2e/capturas.spec.ts começam por arquivoDa" (**novo**) | passa; nas duas rodadas e2e as nove foram puladas e a árvore continuou limpa |
| RNF-12 / CA-16.3: e2e três vezes seguidas | as rodadas A, B e C do engenheiro, com o código final e `retries: 0`. Nesta etapa, 1 rodada com 2 falhas fora da T17 e 1 rodada verde (seção 3) | ver seção 3 |
| CV-01 (G4) | comando do G4 rodado nesta etapa. A saída é **exatamente** a exceção fixada na 06-T17-tech-lead, 2.1: `src/app/api/saude/route-qa.test.ts`, com 5 linhas acrescentadas e nenhuma removida. Esta etapa não tocou nenhum caminho do G4 | conforme |
| CV-01: `src/modules` só com o arquivo novo | `git diff 198e97d --stat -- src/modules`: só `resumo-da-fila.ts` e o teste dele | conforme |
| CV-05: `package.json` só com `version` e as duas linhas da T02 | `git diff 198e97d -- package.json` (conferido); `test/estatico/fontes-qa.test.ts` (RNF-10: nenhuma dependência nova além das duas fontes) | conforme / passa |
| Correção da gaveta (desvio 2.2 aceito na revisão) | `e2e/casca.spec.ts` › "03, 3.3: em 390 e em 320 px, \"Fechar menu\" e todo controle inteiros dentro da gaveta, sem rolagem lateral" | passa nas duas rodadas (5 rodadas no total, contando as do engenheiro) |
| Minor 3 da T16 (`h3`) | `test/estatico/tipografia-h2.test.ts` › describe "03, 2.3 (T17): h3 só com a escala do globals.css" | passa |
| Minor 1 da T16 (`pagina.test.ts`) | `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` › caso do desatualizado, com o auxiliar `link()` | passa |

### 2. Testes acrescentados: `test/estatico/capturas-qa.test.ts` (19 testes)

Três furos nos testes da construção:

1. **No CI, nada conferia que as PNG existem.** No CI o spec das capturas é pulado (CV-17). O `capturas.test.ts` confere
   a lista de nomes, mas não os arquivos. Uma PNG apagada passaria sem ninguém ver, e uma décima PNG também, sem a
   conferência do CV-17. Os testes novos conferem:
   - a pasta tem exatamente as nove;
   - cada uma é um PNG inteiro: assinatura, IHDR primeiro, IEND no fim, nada depois dele;
   - cada uma tem o tamanho da janela do nome;
   - nenhuma tem bloco de metadado de texto (`tEXt`, `zTXt`, `iTXt`, `eXIf`, `tIME`), onde caberia um caminho de
     máquina.

   A leitura do PNG tem casos plantados: assinatura errada, arquivo cortado e bytes depois do IEND reprovam.
2. **"Só lê" (C-36, G3.10) não tinha trava.** A trava nova é uma lista de permissão sobre o texto do spec:
   - contas: `cto` e `administradora`;
   - rotas: `'/entrar'`, `'/demandas'`, `` `/demandas/${id}` `` e `` `/pacotes-decisao/DEC-${id}-v1` ``;
   - auxiliares de `./apoio`: `abrirGaveta`, `demandaDoSeed`, `entrarComo`, `expect` e `test`;
   - módulos importados: só os de hoje;
   - nenhuma ação: clique, preenchimento, teclado, `check`, `api(`, `fetch(`, `.request` e `method:`.

   Casos plantados mostram cada desvio reprovando: conta `produto`, conta por variável, `/configurar-2fa`, rota por
   variável, `api` importado, `node:child_process`, clique em "Aprovar a opção A", `fill`, `press`, `check`, `api` POST,
   `page.request.post` e `fetch`. Um teste de controle confere que a varredura enxerga o spec de hoje (duas contas,
   quatro rotas e os cinco testes pelo nome). Assim, uma leitura quebrada não passa vazia.
3. **"Pula antes de entrar" (D-04) não tinha trava.** Agora todo teste do spec tem `const arquivo = arquivoDa(...)`
   como primeira linha, antes de login ou navegação. Há caso plantado em que o teste entra antes e é acusado.

Também entraram bordas do `podeCapturar`:
- recusa loopback só no usuário da URL (`http://127.0.0.1:3101@exemplo.test/`);
- recusa `127.0.0.2`, `localhost:3101.exemplo.test` e `file://`;
- aceita `LOCALHOST` em maiúsculas, que o `URL` normaliza, mas não com `CI`.

O teste é estático: não depende de ordem, de relógio nem de rede. Os dados são os nomes do seed e domínios `.test`.

### 3. Rodadas e2e desta etapa e as duas falhas intermitentes

| Rodada (sozinha) | Resultado | Duração |
|---|---|---|
| 1 | 247 passaram, **2 falharam**, 9 puladas | 20,9 min |
| 2 | **249 passaram**, 9 puladas | 17,1 min |

Nas duas rodadas, o "✘" da `vigia.spec.ts:5` é o negativo marcado `test.fail()` (CV-03), que conta como passou.

As falhas da rodada 1 são de testes de outras tarefas. As duas telas não foram tocadas pela T17, e nenhuma das duas
falhas passa pelo código que a T17 mudou.

**Falha 1, criticidade média (instabilidade do apoio de teste, não defeito do app).**
`e2e/axe-todas.spec.ts:229` › "T07 Nova versão da ESP: …". Erro: `apiRequestContext.fetch: socket hang up` no
`GET /api/demandas?tipo=bug&limit=100` (linha 241), por `api()` de `e2e/apoio.ts:193`.
- O pedido é o segundo `page.request` do teste. Ele sai depois de duas análises do axe nas duas larguras e de um
  envio de formulário. Até lá, a conexão HTTP aberta pelo primeiro `GET` (linha 231) fica parada vários segundos.
- O `e2e/servidor.ts` sobe `next start` sem `--keepAliveTimeout`, com o padrão de 5 s do Node. Hipótese mais provável:
  corrida da conexão keep-alive. O servidor fecha a conexão parada no mesmo instante em que o cliente do Playwright a
  reaproveita.
- O navegador repete sozinho um pedido idempotente nesse caso, mas o `APIRequestContext` não repete. O D-06 da T16
  dobrou o tempo do axe entre dois `api()` do mesmo teste, o que deixa essa janela mais frequente.
- **Não reproduzi a falha de forma determinística**, então a causa é hipótese, não fato.

**Falha 2, criticidade média (tempo sob carga).** `e2e/axe-todas.spec.ts:267` › "T09 Novo pacote de decisão: …".
Estourou os 30 s (34,1 s) dentro do `AxeBuilder.analyze`, na troca para 390 px.
- Na mesma rodada, a T10 levou 21,2 s, e a rodada inteira levou 20,9 min, contra 13 a 17 min nas outras.
- Leitura: máquina carregada naquela janela. Não consigo conferir a carga com a minha lista Pode.
- Na rodada 2, o mesmo teste levou 10,1 s.

**Por que não corrigi nesta etapa:**
- A correção do apoio de teste exige escolher entre duas mudanças: o `--keepAliveTimeout` do `next start` no
  `e2e/servidor.ts`, ou repetir só o `GET` uma vez, só no "socket hang up", dentro do `api()`.
- As duas mexem no servidor ou no apoio de todos os e2e. As duas também chegam perto do que a G3.2 proíbe
  (`retries`, tempo).
- Sem reproduzir a falha, eu não conseguiria provar que a mudança resolve. Mudança que não se prova é pior do que
  registrar a falha.
- A decisão vai para o tech-lead (Pendências).

## Decisões tomadas

- Teste novo em arquivo próprio (`capturas-qa.test.ts`), sem mexer no `capturas.test.ts` do engenheiro: é o molde dos
  `*-qa.test.ts` deste pedido, e nenhuma asserção existente muda.
- Pasta com **exatamente** as nove: o CV-17 exige conferência de cada PNG, que fica versionada sem expurgo. Uma captura
  nova precisa entrar na lista `CAPTURAS`, e assim aparece na revisão.
- O tamanho da PNG é conferido pela largura do nome: o projeto é `Desktop Chrome`, com `deviceScaleFactor` 1, então a
  PNG tem o tamanho da janela. Um `fullPage: true` ou uma troca de janela muda o tamanho e reprova.
- "Só lê" e D-04 por lista de permissão, e não por lista de proibição: lição registrada do /construir. Um auxiliar ou
  uma rota nova no spec reprova até alguém conferir.
- Não repeti as três rodadas e2e do RNF-12. O engenheiro rodou A, B e C com o mesmo código. Esta etapa só acrescenta
  um teste de unidade, que o Playwright não carrega. Rodei a suíte inteira para conferir.
- Não corrigi as duas falhas intermitentes (seção 3): o teste é de outra tarefa, a causa não está provada, e a
  correção possível toca o apoio de todos os e2e.

## Pendências

- **Para o tech-lead (decisão) e para a `09-entrega`:** duas falhas intermitentes na rodada 1 desta etapa, fora da
  T17. A segunda rodada passou inteira. As falhas:
  - `e2e/axe-todas.spec.ts:229` (T07): "socket hang up" num `GET` de `api()`. Hipótese: keep-alive de 5 s do `next start`
    no `e2e/servidor.ts`;
  - `e2e/axe-todas.spec.ts:267` (T09): 34,1 s, numa rodada de 20,9 min, com a máquina carregada.

  Caminhos para a primeira, a decidir:
  - (a) `next start ... --keepAliveTimeout` maior que o tempo-limite de um teste, só no `e2e/servidor.ts`. Na
    homologação, o comando é outro e o risco continua;
  - (b) no `api()`, repetir uma vez só o `GET`, só no erro de conexão reaproveitada. Não vale para POST e não muda
    asserção.

  Para a segunda, segue a regra da revisão da T16: dividir o teste sem tirar asserção se ele passar de 24 s no CI. No
  CI, registrar as durações de `axe-todas.spec.ts:229` e `:267` junto das três que a 06-T17-tech-lead, 2.3, já
  listou.
- **Para a `08-revisao`:** o `capturas-qa.test.ts` trava a pasta em nove PNG. Se a 08 regravar uma captura pelo
  `REGRAVAR`, o nome não muda e o teste continua valendo. Uma PNG nova exige entrar em `CAPTURAS`.
- **Para a `07-qa-funcional`:** sem mudança. Seguem a ordem do Tab da gaveta em 390 e 320 px (06-T17-tech-lead) e a
  conferência visual das nove PNG.
- Seguem sem mudança: M1 a M3 da 06-T17-tech-lead e os itens da 08 e da `10-documentacao`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo 897232e (06-T17-revisao), e61a556 (construção)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 2604b9f e61a5562a53c6cfe9d9a1d20db3ea67d0c56a8eb` — 21 arquivos da T17 (código, testes, nove PNG, entrega)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 2604b9f e61a5562a53c6cfe9d9a1d20db3ea67d0c56a8eb -- src test e2e package.json` — diff de código e teste lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- test e2e/apoio.ts e2e/casca.spec.ts playwright.config.ts` — lista dos estáticos e apoios
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/capturas-qa.test.ts test/estatico/capturas.test.ts` — 30 de 30 (11 do engenheiro e 19 novos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 5249 de 5249, 234 arquivos, 240 s
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — G4: só a exceção registrada (`route-qa.test.ts`, +5 linhas, nenhuma removida)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules package.json` — `resumo-da-fila.*` e `package.json`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- package.json` — só `version` e as duas linhas `@fontsource` 5.3.0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `test/estatico/capturas-qa.test.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list` — rodada 1: 247 passaram, 2 falharam (`axe-todas.spec.ts:229` e `:267`, seção 3), 9 puladas, 20,9 min
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list` — rodada 2: 249 passaram, 9 puladas, 17,1 min
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `test/estatico/capturas-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado mudou

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa (unidade 5249 de 5249; e2e verde na rodada 2. As 2 falhas intermitentes da rodada 1 são de fora da T17 e estão registradas na seção 3 e em Pendências)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`: nenhum arquivo rastreado mudou)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
