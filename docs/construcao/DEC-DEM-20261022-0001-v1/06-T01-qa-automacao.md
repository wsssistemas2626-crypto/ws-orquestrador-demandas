---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T01-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G6, mapa das fases e T01), 01-analista-requisitos.md (RF-01 a RF-06, RF-16 a RF-26, RNF e matriz), 06-T01-engenheiro-backend.md, 06-T01-tech-lead.md, git show 46f6e24 (--stat), git show aba6bcc (--stat), git show 5f3c9e8 (--stat e --name-only), git show 88d17d5 (--stat), src/lib/relogio.ts, src/lib/relogio.test.ts, src/lib/fuso.ts, src/lib/fuso.test.ts, test/estatico/compose.test.ts, package.json, eslint.config.mjs, vitest.config.ts, docker-compose.dev.yml, next.config.ts, tsconfig.json, src/app/layout.tsx, src/app/page.tsx, .gitignore]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T01 (Esqueleto do projeto, relógio e fuso), sobre o código do commit `aba6bcc` (o `46f6e24` só regrava a
entrega do engenheiro). O código passou em todos os testes novos: nada volta para a construção. Nenhum arquivo de
código, configuração ou dependência foi alterado; só testes.

### Critérios da tarefa e o teste que cobre cada um

A T01 cobre, pelo plano: RNF-01, RNF-02, RNF-15 (relógio), parte de C-35 (dev), parte de C-39 (`packageManager`,
`audit:prod`), a regra `react/no-danger` de C-18, e o fuso que a CA-04.1 usa. Também o `no-console` (G3.7), o layout
e a raiz `/` que a tarefa cria.

| Critério | Arquivo | Teste |
|---|---|---|
| RNF-15: relógio injetado, determinístico, só anda quando mandado | `src/lib/relogio.test.ts` | `relogioFixo devolve o instante dado, como cópia`; `relogioFixo só anda quando mandado` (do engenheiro); `alterar o Date devolvido não muda o relógio`; `avancar aceita valor negativo e acumula`; `relógios fixos são independentes entre si` (novos) |
| RNF-15: `relogioDoSistema` lê a hora do sistema, testado sem o relógio real | `src/lib/relogio.test.ts` | `relogioDoSistema lê a hora do sistema (relógio simulado, sem depender do real)` (novo, `vi.useFakeTimers`) |
| Desvio 4 / parecer 1 da revisão: `relogioFixo` e `definir` recusam data inválida | `src/lib/relogio.test.ts` | `relogioFixo recusa data inválida com RangeError (parecer 1 da 06-T01-revisao)`; `definir com data inválida lança RangeError e mantém o instante anterior` (novos) |
| CA-04.1 (parte do fuso): data da criação em America/Sao_Paulo, não UTC | `src/lib/fuso.test.ts` | `usa a data de São Paulo, não a UTC (CA-04.1)` (do engenheiro); `vira o dia às 03:00 UTC, no limite exato (CA-04.1)`; `virada de ano: 31/12 em São Paulo enquanto já é 01/01 em UTC` (novos) |
| Mês civil de São Paulo (base do teto de gasto, RF-18) | `src/lib/fuso.test.ts` | `início do mês civil de São Paulo`; `vira o ano em dezembro` (do engenheiro); `início do mês é idempotente e o próximo mês é estritamente depois`; `fevereiro de ano bissexto e de ano comum` (novos) |
| Desvio 2: deslocamento do próprio dia 1º, certo com horário de verão | `src/lib/fuso.test.ts` | `com horário de verão, usa o deslocamento do dia 1º do mês alvo (Desvio 2)` (novo; com o código do plano, o caso `2019-02-10 → 2019-03-01T03:00Z` daria `02:00Z`) |
| Formatação pt-BR de data e hora | `src/lib/fuso.test.ts` | `formata em pt-BR` (do engenheiro); `dia e mês com um dígito saem com zero à esquerda`; `meia-noite sai como 00:00, nunca 24:00` (novos) |
| C-35 (dev): banco só em `127.0.0.1` | `test/estatico/compose.test.ts` | `docker-compose.dev.yml só publica porta em 127.0.0.1` (do engenheiro); `docker-compose.dev.yml usa postgres:16-alpine e não abre a rede do host`; `docker-compose.dev.yml não lê .env nem variável de ambiente do host` (novos) |
| RNF-02: porta 3101, nunca 3000 | `test/estatico/projeto.test.ts` | `porta de desenvolvimento 3101 no dev e no start, com PORT opcional (RNF-02)`; `nenhum script usa a porta 3000 do Easypanel (RNF-02)` (novos) |
| C-39 (parte): `packageManager` fixo e `audit:prod`; versão 0.1.0 | `test/estatico/projeto.test.ts` | `versão 0.1.0, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)`; `scripts do padrão técnico (seção 3) e do plano` (novos) |
| RNF-01: stack nas versões do padrão técnico | `test/estatico/projeto.test.ts` | `dependências de produção nas versões exatas do padrão técnico (RNF-01)`; `dependências de desenvolvimento nas versões do padrão técnico (RNF-01)`; `nenhuma dependência de produção fica solta (latest, * ou intervalo aberto) nas fixadas pelo padrão` (novos) |
| `tsconfig` estrito, `next.config` e `.gitignore` do padrão (seção 10) | `test/estatico/projeto.test.ts` | `TypeScript estrito, com índice verificado, JSON e alias @/* para src/*`; `sem cabeçalho X-Powered-By e com pg, pg-boss e pino fora do bundle`; `tem todas as entradas mínimas do padrão técnico (seção 10)`; `libera o .env.example depois de ignorar .env.* (a ordem importa no git)` (novos) |
| C-18: `react/no-danger` é erro | `test/estatico/eslint.test.ts` | `react/no-danger é erro: dangerouslySetInnerHTML não passa (C-18)` (novo, ESLint real sobre trecho em memória) |
| G3.7: `no-console` é erro em `src/` | `test/estatico/eslint.test.ts` | `no-console é erro em src/ (G3.7)` (novo) |
| Controle negativo do lint e pastas ignoradas | `test/estatico/eslint.test.ts` | `código limpo equivalente não tem erro (o teste não passa por qualquer motivo)`; `as pastas geradas ficam fora do lint` (novos) |
| Layout em pt-BR com o título do plano | `src/app/layout.test.ts` | `declara o idioma pt-BR no <html> (RNF-16)`; `tem o título "WS Orquestrador de Demandas"` (novos) |
| Raiz `/` redireciona para `/demandas` | `src/app/page.test.ts` | `redireciona para /demandas` (novo) |

### Testes acrescentados

- Alterados (só acréscimo, nenhuma linha existente mudou): `src/lib/relogio.test.ts` (+6), `src/lib/fuso.test.ts`
  (+7), `test/estatico/compose.test.ts` (+2)
- Criados: `test/estatico/projeto.test.ts` (11), `test/estatico/eslint.test.ts` (4), `src/app/layout.test.ts` (2),
  `src/app/page.test.ts` (1)
- Total: 33 testes novos; a suíte passou de 3 arquivos e 8 testes para 7 arquivos e 41 testes.

### Resultado

- `pnpm test`: 7 arquivos, 41 de 41 passaram, 0 falharam (a rodada anterior, com a versão inicial dos testes novos,
  teve 1 falha, que era asserção minha errada no layout; ver Decisões)
- `pnpm lint`: limpo (`eslint .` sem saída)
- `pnpm typecheck`: limpo (`tsc --noEmit` sem saída)

## Decisões tomadas

- Status `pronto` e `proximo: tech-lead` (`06-T01-decisao`): o código não falhou em nenhum teste e nenhum teste do
  engenheiro está instável ou errado.
- Parecer 1 da revisão (falta de teste do `RangeError`) fechado aqui, como a revisão sugeriu.
- Desvio 2 virou teste com o horário de verão histórico de São Paulo (2018/2019), porque é o único jeito de provar a
  diferença sem esperar o horário de verão voltar; depende do tzdata embutido no Node (ICU completo nos binários
  oficiais).
- `relogioDoSistema` testado com `vi.useFakeTimers` e `afterEach(vi.useRealTimers)`: prova que ele lê a hora do
  sistema sem depender do relógio real nem deixar estado para outro teste.
- C-18 e `no-console` testados rodando o ESLint de verdade com a configuração do projeto, sobre texto em memória
  (`lintText`), com um controle negativo: assim o teste quebra se alguém afrouxar a regra, e não passa por erro de
  parse.
- Asserção do layout ajustada na primeira rodada: o React 19 injeta `<head></head>` no `renderToStaticMarkup`; o
  teste confere o `lang` e o conteúdo do `<body>`, não o HTML inteiro. Era erro meu, não do código.
- Testes estáticos leem os arquivos pelo caminho relativo ao próprio teste (`import.meta.url`), para não depender do
  diretório em que o `pnpm test` roda.
- Parecer 2 (`@types/node ^26`) sem teste: a revisão já registrou como dívida para a próxima tarefa do backend; um
  teste agora devolveria a T01 por um item Minor. Parecer 3 sem teste: o ramo da reserva `+00:00` não roda no Node 24.
- Teste novo não usa `new Date()` sem argumento nem `Date.now()` (G3.4, T13). Dados só fictícios (`SENTINELA-LOG`).

## Pendências

- Parecer 2 (Minor, da revisão): quando a próxima tarefa do backend passar `@types/node` para `^24`, vale acrescentar
  a asserção em `test/estatico/projeto.test.ts` (`dependências de desenvolvimento ...`).
- Parecer 3 (Minor, da revisão): quando `fuso.ts` trocar a reserva `+00:00` por erro, acrescentar o teste do erro
  (hoje o ramo não é alcançável sem simular o `Intl`).
- `test/estatico/eslint.test.ts` carrega o `eslint-config-next`, e é o que mais pesa na suíte (que foi de 0,35 s para
  3 s); fica bem dentro do `testTimeout` de 30 s, mas vale acompanhar no CI.
- RNF-01 tem a parte verificável por teste (versões e scripts); a parte de pastas e papéis do banco segue com a
  revisão do tech-lead e com as tarefas T04 a T07.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — `41ffb1b` no topo; `46f6e24` e `aba6bcc` da T01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 46f6e240dc2e4e51d111ca65321a982239047b00` — 2 arquivos: a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat aba6bcc` — 21 arquivos da T01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%H 88d17d5` — só a entrega 05 e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%H 5f3c9e8` — entrega 05, `tarefas.json` e o plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --name-only --format=%H 5f3c9e8` — caminho do plano
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes dos testes novos: 3 arquivos, 8 de 8
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1 falha de 41 (asserção do layout, minha)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 7 arquivos, 41 de 41
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 3 testes modificados e 4 novos, nada além
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só linhas acrescentadas nos 3 testes existentes

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
