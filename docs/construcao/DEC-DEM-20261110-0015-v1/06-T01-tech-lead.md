---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T01-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7 e T01), 06-T01-engenheiro-frontend.md, git show 2ee046f (código da T01), e2e/apoio.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T01 (fase 1, Vigilância), código no commit `2ee046f`; `8639346` e `57af785` só registram a passagem e
regravam a entrega. **Aprovada.** Nenhum problema Critical ou Important; três Minor, em Pendências.

### O que foi conferido

- **Escopo (G1, G5):** `git diff 198e97d --stat` lista só os arquivos da T01 (5 novos: `e2e/vigia.ts`,
  `e2e/vigia.spec.ts`, `test/estatico/sem-recurso-externo.test.ts`, `test/estatico/vigia.test.ts`,
  `test/estatico/piso-de-assercoes.test.ts`; 24 alterados: `e2e/apoio.ts` e os 23 specs) e os documentos do pedido.
  Nos 23 specs a mudança é só a linha de importação: `test` e `expect` saem de `@playwright/test` e entram no import
  de `./apoio`; os tipos ficam. Nenhuma asserção, título ou passo mudou (conferido spec a spec no `git show`).
- **CV-01 (G4):** o comando do G4 saiu vazio. `git diff 198e97d --stat -- src package.json pnpm-lock.yaml
  playwright.config.ts tsconfig.json eslint.config.mjs vitest.config.ts` também saiu vazio: nada em `src/`, nenhum
  pacote, nenhuma configuração.
- **CV-02:** as nove regras do plano, com a forma plantada de cada uma reprovando, os casos da casa passando e a
  varredura de `src/`, `e2e/`, `test/` e `*.config.*` limpa.
- **CV-03:** fixture automática `vigiaDeOrigemECsp` em `e2e/apoio.ts`, herdada por todo spec (o `vigia.test.ts` reprova
  spec que importe o `test` de `@playwright/test`); `playwright.config.ts` sem `bypassCSP` e com `retries: 0`,
  conferidos por teste. O teste negativo (`e2e/vigia.spec.ts`) vale pelo plano A (`test.fail()`), e a entrega mostra a
  rodada sem `test.fail()` reprovando pelos três canais (requisição a outra origem, console e
  `securitypolicyviolation`), o que prova que a falha vem da vigia e não de tempo esgotado.
- **CV-20 (D-12):** `piso-de-assercoes.test.ts` com os 17 pisos do plano, idênticos; nenhuma linha com `expect(`
  saiu dos specs de segurança (a troca de importação não toca linha com `expect(`).
- **TDD:** a entrega mostra o vermelho antes do código (`vigia.test.ts` sem o módulo e a forma plantada do `@import`
  com a lista do plano), como o passo 2 previa.

### Desvios do plano: os três aceitos

1. `sem-recurso-externo.test.ts:41`, quarto item na forma plantada do `@import` do Google Fonts: correto. A regra
   "endereço absoluto na interface" vale para `src/app/*.css`, e a lista do plano esqueceu esse achado; a expectativa
   ficou mais rígida.
2. `vigia.test.ts:14`, `fontes.exemplo.test` no lugar de `fonts.gstatic.com`: correto. O endereço do Google faria o
   próprio teste cair na regra "Google Fonts" da varredura de `test/**`; o comportamento testado é o mesmo, e o
   domínio `.test` segue o G3.3.
3. `e2e/apoio.ts:31-45`, console, `exposeFunction` e `addInitScript` no contexto, e websocket na página do teste e em
   toda página nova do contexto: correto e melhor que o plano. Cobre a aba aberta por `context.newPage()` na
   `pedido-construcao.spec.ts` sem a `vigiar(context, page)` que o plano previa; a página do teste é vigiada do mesmo
   jeito (o canal `securitypolicyviolation` aparece na saída do teste negativo, então o script e a função exposta
   chegam à página que já existia). Não há registro em dobro: a `page` da fixture já existe quando o
   `context.on('page')` é ligado.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram (três desvios
      justificados e aceitos acima).
- [x] Há teste para cada comportamento novo, e ele falharia sem o código (vermelho mostrado na entrega; o teste
      negativo prova a vigia reprovando).
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real (só `exemplo.test`, `127.0.0.1` e as contas fictícias de
      hoje).
- [x] Entrada externa validada com Zod; erro sem vazar detalhe: não se aplica (a T01 não cria rota, ação nem entrada).
- [x] Banco: não se aplica (nada em `src/db`, `drizzle` ou `src/modules`).
- [x] Nada duplica função que já existe no repositório (`origemDaUrl` é nova; `origem()` de hoje continua sendo a
      usada pelas chamadas de API).
- [x] Textos de interface em pt-BR; axe sem violação nas telas tocadas: nenhuma tela tocada; mensagens do teste em
      pt-BR.
- [x] O que é Minor vai para Pendências; só Critical e Important bloqueiam a passagem.
- [x] No PR (`/code-review`, `/security-review`): não se aplica nesta etapa; é da `08-revisao` (G2).

## Decisões tomadas

- Aprovada sem devolução: nenhum Critical nem Important; os três achados são Minor e não mudam o que o CV-02, o CV-03
  e o CV-20 garantem.
- Plano A do teste negativo aceito: a prova manual sem `test.fail()` está na entrega, e a regressão principal (a vigia
  deixar de reprovar) continua pega, porque o teste passaria e o `test.fail()` o daria como falha.
- O cabeçalho do `preparacao.spec.ts` fica como está nesta tarefa: a T01 só autorizava trocar a importação nos specs
  (G5), e o engenheiro fez certo em não mexer.
- Volta 2: o maestro liberou o `git show` só de leitura do `padrao-tecnico.md` na estruturaAutonoma, feito na volta
  1, e ele saiu de Comandos executados por instrução dele; o parecer não mudou.

## Pendências

- Minor, `e2e/vigia.spec.ts:6` — `test.fail()` aceita qualquer falha, inclusive tempo esgotado em `await violacao`
  (linha 15) ou erro de navegação. Razão: se um dia a CSP deixar de gerar a mensagem no console, o teste passaria por
  tempo esgotado sem provar o canal de CSP (o de requisição a outra origem seguiria funcionando). Não bloqueia: a prova
  manual está na entrega e o plano aceitou o plano A. Caminho, quando uma tarefa futura tocar o arquivo: combinar com o
  plano B (conferir `vigiaDeOrigemECsp` não vazio dentro do teste antes do fim).
- Minor, `e2e/preparacao.spec.ts:1-8` — o cabeçalho diz que os testes "não abrem navegador", o que deixou de ser
  verdade: a fixture automática depende de `page`, e cada um dos 12 testes abre uma página em branco (88 a 275 ms,
  sem navegar). Razão: comentário que contradiz o comportamento engana quem mantém o teste. Corrigir o comentário na
  próxima tarefa do `engenheiro-frontend` que já mexa em `e2e/` (a T02 cria `e2e/fontes.spec.ts`), ou na 08.
- Minor, `e2e/apoio.ts:18` — o comentário da fixture diz "inclusive websocket"; o do plano dizia também "service
  worker". O `context.on('request')` recebe as requisições de service worker no Chromium, então o comportamento está
  certo; só o comentário ficou mais estreito que a cobertura. Mesmo caminho do item anterior.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 2ee046ff02a8ac8293586a83f67db940fa2d4916` — 31 arquivos, os da T01 e a passagem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 2ee046ff02a8ac8293586a83f67db940fa2d4916 -- e2e/apoio.ts e2e/vigia.ts e2e/vigia.spec.ts test/estatico/piso-de-assercoes.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/vigia.test.ts e2e/moldura.spec.ts e2e/preparacao.spec.ts` — código novo e alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 2ee046ff02a8ac8293586a83f67db940fa2d4916 -- e2e/agentes-teto.spec.ts e2e/autenticacao-qa.spec.ts e2e/axe-todas.spec.ts e2e/configurar-2fa.spec.ts e2e/decisao.spec.ts e2e/demanda-formularios-qa.spec.ts e2e/detalhe-demanda.spec.ts e2e/editar-demanda.spec.ts e2e/entrar.spec.ts e2e/especificacao-qa.spec.ts e2e/especificacao.spec.ts e2e/fila-qa.spec.ts e2e/fila.spec.ts e2e/nova-demanda.spec.ts e2e/pacote-decisao.spec.ts e2e/parecer-risco-qa.spec.ts e2e/parecer-risco.spec.ts e2e/pedido-construcao.spec.ts e2e/seguranca-qa.spec.ts e2e/seguranca.spec.ts e2e/sem-violacoes.spec.ts` — só a linha de importação em cada spec
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — topo `57af785`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (G4, CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src package.json pnpm-lock.yaml playwright.config.ts tsconfig.json eslint.config.mjs vitest.config.ts` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat` — só os arquivos da T01 e os documentos do pedido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 17 arquivos, 119 de 119
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 205 arquivos, 4491 de 4491

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
