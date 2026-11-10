---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T02-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7 e T02), 06-T02-engenheiro-frontend.md, commit f6e8b4b (diff de e2e/fontes.spec.ts, package.json, pnpm-lock.yaml, src/app/fontes.ts, src/app/globals.css, src/app/layout.tsx, src/app/layout.test.ts, test/estatico/fontes.test.ts, test/next-font-local.ts, vitest.config.ts), src/app/globals.css]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T02 (Fontes Noto servidas pelo próprio app, `engenheiro-frontend`, risco alto), commit
`f6e8b4b176b9ad49a7f1734ebe75d2943d94af57`. **Aprovada, sem Critical nem Important.** Três pontos Minor, em
Pendências.

### Conferência contra o plano

- `src/app/fontes.ts`: igual ao código do plano (seis caminhos literais, `display: 'swap'` nos dois, as duas
  variáveis, `adjustFontFallback` e `fallback` como no plano). Nenhum `.style` e nenhum `.js` do `@fontsource`.
- `src/app/layout.tsx`: só `className={`${fonteSans.variable} ${fonteMono.variable}`}` no `<html>`, como o plano manda.
- `src/app/globals.css`: `--font-sans` e `--font-mono` saíram do `@theme` e entraram no `@theme inline`, com os valores
  do plano; nada de `url(` nem `@import` com URL. O `html { font-family: var(--font-sans) }` da base continua e o e2e
  prova que o `body` usa a família carregada.
- `test/estatico/fontes.test.ts`: idêntico ao do plano. `e2e/fontes.spec.ts`: igual ao do plano, com o desvio 1 da
  entrega (abaixo) e a T11 implementada.
- `package.json`: só as duas linhas `@fontsource` em `devDependencies`, versão exata 5.3.0 (CV-05, D-13).
  `pnpm-lock.yaml`: só `importers`, `packages` (com `integrity: sha512-…`) e `snapshots` (`{}`) dos dois pacotes.

### Desvios declarados pelo engenheiro (aceitos)

1. **`e2e/fontes.spec.ts`, forma do `src`** (`e2e/fontes.spec.ts:21-25` e `:37-47`): o build grava a URL relativa à
   folha (`../media/…`), e o plano esperava `/_next/static/media/…` literal. A nova conferência exige a forma
   `url(….woff2)`/`local(…)` e, depois de resolver contra o `href` da folha, a **mesma origem** e o caminho
   `/_next/static/media/<arquivo>.woff2`. A garantia do CV-04 é a mesma ou maior: URL absoluta de outra origem e
   `//outra-origem/…` resolvem para outra origem e reprovam. Aceito.
2. **`test/next-font-local.ts` e o alias em `vitest.config.ts`** (`vitest.config.ts:6-10`): fora da lista de arquivos
   da T02, mas dentro da coluna "Edita" do `engenheiro-frontend` em G1 (`test/`, `*.config.*`). Sem ele o
   `src/app/layout.test.ts`, que já existia, quebra na carga (`next/font/local` só existe no compilador do Next). O
   substituto fica em `test/`, não é importado pelo app, e a regex do alias é exata (`^next\/font\/local$`). É o
   mínimo para manter o teste existente vivo sem mexer no layout. Aceito.
3. **`src/app/layout.test.ts:13`**: só o literal da regex do `<html>` mudou (G3.2 permite texto literal, com
   explicação na entrega). Nenhuma asserção apagada; o teste ficou mais forte (prova que as duas variáveis chegam ao
   `<html>`). O piso de asserções da T01 passou. Aceito.
4. **T11 do e2e** (`e2e/fontes.spec.ts:62-68`): o plano deixou só o comentário; a implementação usa GET da API e a
   demanda de tipo bug do seed, sem criar demanda (G3.10, C-36). Aceito.

### Checklist da seção 12 do padrão técnico

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram | Sim. Os dois arquivos a mais (`test/next-font-local.ts`, `vitest.config.ts`) e o literal de `layout.test.ts` são o mínimo para a suíte existente rodar, estão na coluna "Edita" de G1 e estão explicados na entrega. G4 (CV-01): `git diff 198e97d` nas superfícies congeladas saiu **vazio**; `src/modules` sem diff; `package.json` só com as duas linhas; `pnpm-workspace.yaml` sem diff |
| Teste para cada comportamento novo, e ele falharia sem o código | Sim. `fontes.test.ts` foi visto falhando (5 de 5) antes do `pnpm add` e de `fontes.ts`; o e2e foi visto falhando (3 de 3) e a família carregada já passava, o que mostra que as asserções não são vazias; `layout.test.ts` reprova se o layout deixar de pôr as variáveis |
| Nenhum segredo, `.env` ou dado pessoal real | Sim. O e2e usa o seed fictício (título "(fictício)") |
| Entrada externa validada com Zod; erro sem vazar detalhe | Não se aplica: nenhuma rota nem Server Action |
| Banco: migration, migrator, RLS | Não se aplica: sem banco |
| Nada duplica função existente | Sim. `conferirFontes` é nova e só do spec; o substituto de `next/font/local` não existia |
| Textos em pt-BR; axe sem violação nas telas tocadas | Nenhum texto de tela mudou. O engenheiro declara `pnpm test:e2e` 150 de 150 com a `axe-todas` sem violação; o e2e não está na minha lista Pode e fica conferido de novo na `06-T02-testes` |
| Minor vai para Pendências | Sim (três, abaixo) |
| PR: `/code-review` e `/security-review` | Não se aplica nesta etapa: fica com a `08-revisao` (G2) |

### Verificação local

- `pnpm test test/estatico src/app/layout.test.ts`: 21 arquivos, 208 de 208.
- `pnpm test` (suíte inteira): 208 arquivos, 4578 de 4578, código de saída 0.
- `pnpm lint` e `pnpm typecheck`: limpos.

## Decisões tomadas

- Aprovar sem devolver: nenhum achado Critical ou Important; os desvios mantêm ou fortalecem a garantia do plano.
- Aceitar o alias do Vitest em vez de pedir mudança no layout: o layout fica como o plano o escreve e o teste do `lang`
  continua vivo, com o substituto isolado em `test/`.
- Aceitar a conferência do `src` pela URL resolvida contra a folha: é o endereço que o navegador pede, e reprova
  qualquer outra origem, que é o que o CV-04 quer.

## Pendências

- Minor (para a `08-revisao`): `test/estatico/fontes.test.ts:58-60` diz "nenhum arquivo de src/ importa código dos
  pacotes", mas confere só três arquivos (`layout.tsx`, `fontes.ts`, `globals.css`). O código é o do plano, então não
  é desvio do engenheiro; uma varredura de `src/**/*.{ts,tsx,css}` cobriria um import futuro em outro arquivo. Razão:
  o nome do teste promete mais do que ele confere.
- Minor (para a `08-revisao`): `src/app/layout.test.ts:13` fixa o formato de classe do substituto
  (`fonte-teste-<variável>`). Se o substituto mudar, o teste do `lang` quebra por motivo alheio ao `lang`. Aceitável
  agora; registrar se o substituto for reaproveitado em outra tarefa.
- Minor (do engenheiro, para a `10-documentacao`): a soma exata dos seis woff2 não foi impressa; o teste só garante
  ≤ 300 KB. Se o CHANGELOG quiser o número, ele sai do `pnpm build` ou do tamanho dos arquivos no `node_modules`.
- Para a `06-T02-testes`: rodar `pnpm test:e2e` (fora da lista Pode do tech-lead), com atenção ao `e2e/fontes.spec.ts`
  e à `axe-todas`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat f6e8b4b176b9ad49a7f1734ebe75d2943d94af57~1 f6e8b4b176b9ad49a7f1734ebe75d2943d94af57` — 12 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f6e8b4b176b9ad49a7f1734ebe75d2943d94af57~1 f6e8b4b176b9ad49a7f1734ebe75d2943d94af57 -- e2e package.json src test vitest.config.ts` — diff do código
- `grep -n "^### T02\|^### T03\|^## Fase 2" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md` — só leitura, para achar a T02 no plano (Grep não existia na sessão); fora da lista Pode, declarado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff f6e8b4b176b9ad49a7f1734ebe75d2943d94af57~1 f6e8b4b176b9ad49a7f1734ebe75d2943d94af57 -- pnpm-lock.yaml` — só as entradas dos dois pacotes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d f6e8b4b176b9ad49a7f1734ebe75d2943d94af57 -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (G4, CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d f6e8b4b176b9ad49a7f1734ebe75d2943d94af57 --stat -- src/modules package.json` — só `package.json`, 2 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico src/app/layout.test.ts` — 208 de 208
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano: 208 arquivos, 4578 de 4578, saída 0
- `wc -l /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/tasks/bnn7si54h.output` — só leitura, para achar o fim da saída do `pnpm test` (438 linhas); fora da lista Pode, declarado

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
