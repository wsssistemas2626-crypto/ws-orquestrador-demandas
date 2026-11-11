---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T01-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7 e T01), 01-analista-requisitos.md, 04-seguranca-aplicacao.md (CV-01 a CV-20), 06-T01-engenheiro-frontend.md, diff da T01 (3bb7ee6..HEAD, código em 2ee046f), e2e/apoio.ts, e2e/vigia.ts, e2e/vigia.spec.ts, e2e/servidor.ts, test/estatico/sem-recurso-externo.test.ts, test/estatico/vigia.test.ts, test/estatico/piso-de-assercoes.test.ts, playwright.config.ts, vitest.config.ts, postcss.config.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T01 (Vigilância) verificada. O código da T01 cumpre os critérios. Encontrei três lacunas de cobertura, que fechei com
testes novos, sem tocar em teste existente nem em código.

### Critérios da tarefa e os testes que os cobrem

| Critério | Teste (arquivo › nome) |
|---|---|
| CV-02, regras com a forma plantada vista reprovando | `test/estatico/sem-recurso-externo.test.ts` › "cada regra reprova a forma plantada", "deixa passar o que é da casa" |
| CV-02, varredura de `src/`, `e2e/`, `test/` e das configurações | `sem-recurso-externo.test.ts` › "a varredura enxerga o código", "nenhum arquivo do repositório tem recurso externo"; **novo** `test/estatico/vigia-qa.test.ts` › "a varredura do CV-02 inclui a configuração do PostCSS" |
| CA-02.3 (Google Fonts fora de `src/`, `public/` e da configuração) | `sem-recurso-externo.test.ts` (src e configs do CV-02); **novo** `vigia-qa.test.ts` › "a regra reprova a forma plantada e deixa passar o que é da casa", "nenhum arquivo de public/ nem de configuração da raiz cita Google Fonts" |
| CV-03, fixture automática herdada por todo spec | `test/estatico/vigia.test.ts` › "todo spec importa test e expect de ./apoio…"; **novo** `vigia-qa.test.ts` › "a fixture é automática e reprova no fim do teste com o coletor não vazio" |
| CV-03, teste negativo (`test.fail()`) | `e2e/vigia.spec.ts` › "CV-03 (negativo): uma folha de estilo de outra origem reprova o teste" |
| CV-03, cada canal anota sozinho: (a) requisição, (b) `securitypolicyviolation`, (c) console | **novo** `e2e/vigia-qa.spec.ts` › "CV-03: a tela do app sozinha não anota nada; a folha de fora é anotada pelos três canais" |
| CV-03, aba aberta por `context.newPage()` vigiada (desvio 3 do engenheiro) | **novo** `e2e/vigia-qa.spec.ts` › "CV-03: a aba aberta no mesmo contexto também é vigiada" |
| CV-03, nenhum spec fora do alcance da vigia (`browser.newContext`, `launch`, `connect`) | **novo** `vigia-qa.test.ts` › "nenhum arquivo de e2e abre contexto ou navegador novo, fora do alcance da vigia" |
| CV-03, sem `bypassCSP` e `retries: 0` | `vigia.test.ts` › "a configuração não desliga a CSP nem sobe retries" |
| CV-03, e2e contra `next start`, nunca `next dev` | **novo** `vigia-qa.test.ts` › "sem BASE_URL, o e2e sobe o build de produção (next build e next start), nunca o next dev" |
| CV-03, funções puras da vigia | `vigia.test.ts` › "origem: http, https e ws…", "o coletor vazio não reprova…"; **novo** `vigia-qa.test.ts` › 4 testes de borda (wss, outra porta ou esquema, porta padrão e maiúsculas, ordem dos problemas) |
| CV-20, piso por arquivo: `test/estatico/*` de 198e97d, os dois e2e de segurança, `src/proxy.test.ts` | `test/estatico/piso-de-assercoes.test.ts` › "%s tem ao menos %i linhas com expect(" (17 arquivos) |
| CV-20, piso por arquivo: **testes de `src/modules/`** | **novo** `test/estatico/piso-de-assercoes-qa.test.ts` › "a lista de src/modules/ tem os 68 testes de 198e97d", "%s tem ao menos %i linhas com expect(" (68 arquivos) |
| CV-20, piso dos estáticos novos da T01 | **novo** `piso-de-assercoes-qa.test.ts` › "%s tem ao menos %i linhas com expect(" (3 arquivos) |
| RNF-07 / CA-02.1 (0 requisição a outra origem em todo e2e) | a fixture em todos os 147 testes e2e: nenhum reprovou pela vigia |
| RNF-08 (CSP sem mudança) | `src/proxy.test.ts` sem diff e verde; `e2e/seguranca.spec.ts` e `seguranca-qa.spec.ts` verdes |
| CV-01 (superfícies congeladas) | `git diff --stat 198e97d HEAD` sem `docs/`: só `e2e/` e 3 arquivos novos em `test/estatico/`, nada em `src/`, `package.json` ou config |

### Lacunas encontradas e fechadas

1. **O teste negativo não separa os canais.** Com `test.fail()`, o `vigia.spec.ts` passa com qualquer falha, até um
   tempo esgotado ou uma navegação quebrada, e não mostra qual canal funcionou. O `vigia-qa.spec.ts` lê o coletor da
   vigia canal por canal com `expect.poll`. Também confere que `/entrar` sozinha não anota nada e que a segunda aba é
   vigiada. Para a própria vigia não reprovar o teste pelo que ele injetou, o coletor só é esvaziado depois que os três
   canais chegam.
2. **O piso do CV-20 não incluía os testes de `src/modules/`.** O CV-20 os cita por nome, e o
   `piso-de-assercoes.test.ts` não os cobre. Os pisos dos 68 arquivos são as contagens de hoje: `src/modules/` está
   sem diff desde 198e97d, então são as de 198e97d. Conferi também os 17 pisos do engenheiro: batem exatamente com a
   contagem atual, nenhum está abaixo dela.
3. **O CA-02.3 incluía `public/` e a configuração em geral; o CV-02 não varria esses lugares.** O teste novo cobre
   `public/` (se existir), `*.config.*`, `tsconfig.json`, `package.json`, `Dockerfile` e `docker-compose*.yml`.

### Vi falhar

- Piso: rodei uma versão temporária do arquivo que comparava cada contagem com `{}`. A falha listou as contagens reais,
  que viraram a tabela.
- Fixture: troquei `{ auto: true }` por `{ auto: false }` em `e2e/apoio.ts` por uma rodada só. `vigia-qa.test.ts`
  reprovou com `expected '…' to match /\{\s*auto:\s*true\s*\}/` e voltei o arquivo ao original (`git status` limpo
  fora dos 3 arquivos novos).
- Regras de CA-02.3: as formas vetadas, montadas por partes, reprovam dentro do próprio teste.

### Testes acrescentados

- `test/estatico/piso-de-assercoes-qa.test.ts`: 72 testes
- `test/estatico/vigia-qa.test.ts`: 10 testes
- `e2e/vigia-qa.spec.ts`: 2 testes

### Resultados

- `pnpm test`: 207 arquivos, **4573 de 4573** (4491 de antes + 82 novos)
- `pnpm test:e2e`: **147 de 147** (6,8 min); `vigia.spec.ts` como falha esperada, a vigia ligada nos outros 146
- `pnpm lint`: limpo
- `pnpm typecheck`: limpo

## Decisões tomadas

- Testes novos em arquivos `-qa`, como no resto do repositório. Assim o arquivo do engenheiro e a tabela do PISO, ligada
  a 198e97d, ficam intactos.
- Nos testes, os endereços e nomes vetados são montados por partes. Os arquivos novos também passam pela varredura do
  `sem-recurso-externo.test.ts`, que reprovaria um literal.
- Não testei o canal de websocket em execução: o `next start` não abre websocket, e um websocket bloqueado pela CSP
  nem sempre gera o evento do Playwright, o que deixaria o teste instável. Esse canal fica coberto só pelo teste de
  unidade de `origemDaUrl` (ws e wss).
- Os testes estáticos novos da fixture leem o texto de `apoio.ts`: dependem da forma do código. É deliberado, porque é
  a guarda barata que roda no `pnpm test`. A prova pelo comportamento continua sendo o e2e.

## Pendências

- Para o tech-lead (Minor, não bloqueia): o canal de websocket da vigia não tem prova em execução (ver Decisões).
- Para a 08 (informação): os pisos de CV-20 agora cobrem 88 arquivos (17 + 68 + 3). A contagem por arquivo da 08 pode
  partir dos dois testes de piso.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 3f54b62
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 3bb7ee6 HEAD -- . ":(exclude)docs"` — 29 arquivos, só `e2e/` e `test/estatico/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 3bb7ee6 HEAD -- e2e ":(exclude)e2e/vigia.spec.ts" ":(exclude)e2e/vigia.ts"` — specs: só a linha de importação; `apoio.ts`: fixture e `testBase.info()`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 198e97d HEAD -- . ":(exclude)docs"` — os mesmos 29 arquivos; nada em `src/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 198e97d -- test/estatico src/modules` — lista dos testes de 198e97d
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-qa.test.ts` — versão temporária, falha esperada com as contagens de `src/modules/`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes-qa.test.ts` — versão temporária, falha esperada com as contagens do PISO do engenheiro (iguais ao piso)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 201 de 201
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/vigia-qa.test.ts` — com `auto: false` plantado: 1 falhou, 9 passaram, como esperado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 3 arquivos novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/vigia-qa.spec.ts e2e/vigia.spec.ts` — 3 de 3 (vigia.spec como falha esperada)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4573 de 4573
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 147 de 147

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
