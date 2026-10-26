---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T13-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T10 a T13), 01-analista-requisitos.md (RF-01 e RF-02), 02-arquiteto-solucoes.md (seção 6), 04-seguranca-aplicacao.md (seções 2 e 3), 06-T13-engenheiro-backend.md, git show 53c6491, test/estatico/eslint.test.ts, test/requisicao.ts, test/deps.ts, test/sessao.ts, test/banco.ts, src/lib/rota.ts, src/lib/acao-painel.ts (início), src/modules/acesso/matriz.ts, src/modules/acesso/matriz.test.ts, src/app/page.tsx, drizzle.config.ts, next.config.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T13, que traz os testes estáticos e o teste que percorre a matriz de acesso, sobre o commit `53c6491`. Os
testes do engenheiro estão corretos e estáveis: passaram em duas rodadas seguidas e na suíte inteira. Nenhum deles foi
mudado. Achei seis brechas e fechei cada uma em dois arquivos novos, que só acrescentam conferências:
`test/estatico/varreduras-qa.test.ts` e `test/matriz-rotas-qa.test.ts`.

### Critério da tarefa → teste que cobre

| Critério (plano, "Cobre") | Teste do engenheiro | Teste acrescentado nesta etapa |
|---|---|---|
| C-04 (b), estático | `test/estatico/exigir-pessoa.test.ts`: "todo arquivo com "use server" usa acaoDoPainel ou exigirPessoa", "toda page.tsx do painel chama exigirPessoaNaPagina", "toda route.ts da API usa rota(), exceto auth e saúde" | `varreduras-qa.test.ts` › "C-04 b: nenhum ponto de entrada fica fora das varreduras": Server Action em qualquer pasta de `src/`, `route.ts` só em `src/app/api`, `page.tsx` fora de `(painel)` só entre as públicas, mais o teste das regras |
| C-04 (a), sessão sem 2FA dá 403 em toda rota | `test/matriz-rotas.test.ts`: "`<MÉTODO> <arquivo>`: tem ação na matriz e nega cada ator proibido com 403" (laço sobre as rotas) e o bloco "verificador" | `matriz-rotas-qa.test.ts` › "CA-02.1 e CA-01.3: quem é barrado nunca chega à função, em todos os métodos" (19 testes, um por ação, cada um nos 5 métodos) |
| C-10 e C-12, a matriz percorrida em todas as rotas | `matriz-rotas.test.ts`: laço sobre as rotas; "verificador" › "`<ação>`: handler de rota() passa na conferência…" (19) e "recusa rota cuja função deixa passar quem a matriz nega" | `matriz-rotas-qa.test.ts` › "rotas reais: método sem conferência e ação fixada" e o "verificador das duas conferências acima" (4) |
| C-17, `sql.raw` | `test/estatico/sql-raw.test.ts`: "nenhum sql.raw( em src/" | `varreduras-qa.test.ts` › "C-17: nenhum caminho para o SQL cru do Drizzle" (3) |
| C-17, parâmetro fora do formato dá 404 antes de autenticar | `matriz-rotas.test.ts`: `conferirHandler` e "recusa rota dinâmica declarada sem params…" | o mesmo bloco de 19 do `matriz-rotas-qa`, com o 404 nos 5 métodos e a função sem rodar |
| C-18 (`react/no-danger`) e G3.7 (`no-console`) | `test/estatico/eslint.test.ts`, da 06-T01-testes: "react/no-danger é erro…", "no-console é erro em src/ (G3.7)" | — (o desvio 1 do engenheiro procede: o teste roda o ESLint de verdade, o que vale mais que `calculateConfigForFile`) |
| C-27 | `test/estatico/variaveis.test.ts`: "variáveis de segredo só nos arquivos permitidos" e "a regra recusa os lugares errados…" | `varreduras-qa.test.ts` › "C-27: os nomes das variáveis de segredo também fora de .ts e na raiz" (2) |
| G3.4 | `test/estatico/relogio.test.ts`: "new Date() sem argumento e Date.now() só em src/lib/relogio.ts" | `varreduras-qa.test.ts` › "G3.4: nenhuma outra forma de tirar a hora do processo…" (3) |
| CA-01.3: sem sessão nem token, 401 | `matriz-rotas.test.ts`: `conferirHandler` ("sem credencial"), no verificador só em GET e POST | `matriz-rotas-qa.test.ts`, bloco de 19: 401 nas 19 ações e nos 5 métodos, e a função não roda |
| CA-02.1: token de agente na decisão dá 403 e nada muda | `matriz-rotas.test.ts`: verificador › "registrar_decisao: handler de rota() passa na conferência…" | `matriz-rotas-qa.test.ts` › "CA-02.1: PATCH /api/pacotes-decisao/[decId]/decisao com o token de cada agente responde 403 e não roda a função"; ação fixada em `registrar_decisao` |
| CA-02.2: token de agente em ligar agente, teto, status e pedido dá 403 | `matriz-rotas.test.ts`: verificador, nas ações `alterar_agente`, `alterar_teto`, `alterar_demanda` e `gerar_pedido_construcao` | `matriz-rotas-qa.test.ts` › os quatro testes "CA-02.2: `<MÉTODO> <rota>` com o token de cada agente responde 403 e não roda a função"; as quatro ações fixadas |

### Brechas encontradas e o teste que fecha cada uma

1. **CA-02.1, a parte "nada muda", não estava provada.** O 403 só mostra a resposta. Não mostra que a função da rota
   deixou de rodar. O bloco novo conta as chamadas da função. Para quem a matriz nega, para quem está sem 2FA, para quem
   não tem credencial e para o parâmetro fora do formato, a conta tem de ficar em zero, nos cinco métodos. O verificador
   da T13 só cobria GET e POST, e por isso PATCH, PUT e DELETE entraram aqui. Em cada caso, um controle com a pessoa
   `cto` chega à função.
2. **A ação de cada rota não estava fixada.** Pense numa rota de decisão declarada com `ler_pacote_decisao`.
   `atoresProibidos` dessa ação dá lista vazia, a conferência não espera 403 de ninguém, e o agente aprovaria. O
   `ACAO_FIXADA` prende a ação das rotas que CA-02.1, CA-02.2 e C-10 nomeiam, nos caminhos da seção 6 da 02:
   - decisão;
   - pedido de construção;
   - `PATCH` de agente;
   - `PUT` do teto;
   - mudança da demanda;
   - histórico;
   - entrada.

   Um teste do verificador prova que a rota fraca é recusada.
3. **HEAD e OPTIONS escapavam.** O laço confere só os cinco métodos de `METODOS`. Um `export const OPTIONS` ou
   `HEAD` solto passaria sem nenhuma conferência. Agora quebra o teste.
4. **Ponto de entrada fora das pastas varridas.** Três casos passavam despercebidos:
   - Server Action com `'use server'` fora de `src/app`, por exemplo em `src/modules`;
   - `route.ts` fora de `src/app/api`, que fica fora do estático de `rota()` e do laço da matriz;
   - `page.tsx` fora do grupo `(painel)`.

   Agora, fora de `(painel)`, só passam a raiz (que só redireciona), `entrar` e `configurar-2fa`, em qualquer grupo.
5. **Formas do relógio e do SQL cru que a regex não pegava.** No relógio, `new Date` sem parênteses e `const f =
   Date.now`. No SQL cru, `sql['raw'](…)` e `const { raw } = sql`. Cada regra nova tem a sua prova de que pega a forma
   proibida e deixa passar a permitida.
6. **C-27 fora das extensões `.ts` e `.tsx`.** O `next.config.ts` roda no processo do app e não era varrido.
   Também ficavam de fora os `.mjs`, `.js` e `.mts` de `src/` e `scripts/`. Agora os arquivos de configuração da raiz
   não podem citar nenhum dos três nomes, e os outros tipos de arquivo seguem a mesma lista de permissão.

A varredura nova roda sobre o `src/` de hoje sem nenhum caso, e a suíte inteira continua verde. Nada no código atual
viola as regras ampliadas.

### Testes acrescentados

- `test/estatico/varreduras-qa.test.ts`: 13 testes, em quatro blocos:
  - C-04 b: 5;
  - G3.4: 3;
  - C-17: 3;
  - C-27: 2.
- `test/matriz-rotas-qa.test.ts`: 29 testes:
  - a lista fixada só cita ações que existem: 1;
  - o verificador das conferências novas: 4;
  - as 19 ações nos 5 métodos: 19;
  - CA-02.1 e CA-02.2 com corpo válido: 5.

  O laço sobre as rotas reais ainda não tem caso, porque hoje só existem `auth` e `saude`.

### Resultado

- `pnpm test`: 72 arquivos, 1128 de 1128, nenhuma falha. São os 1086 da construção mais os 42 desta etapa.
- Os arquivos da T13 com os desta etapa rodaram de novo, sozinhos: 10 arquivos, 97 de 97. Não houve diferença entre as
  rodadas.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff`: vazio. Nenhum arquivo rastreado mudou nesta etapa, e só há os dois arquivos novos. No commit `53c6491`,
  nenhum teste foi apagado nem recebeu `.skip`, `.only` ou `.todo`. Em `src/`, só mudaram dois comentários.

## Decisões tomadas

- **Arquivos `-qa` separados, sem tocar nos da T13.** Segue a convenção das etapas de teste anteriores
  (`rota-qa.test.ts`, `matriz-qa.test.ts`). Assim a entrega do engenheiro continua comparável com o plano.
- **A ação fixada vale só quando a rota existe e exporta o método.** Se exigisse a existência, as tarefas T16 a T23
  quebrariam antes de criar as rotas. O risco do caminho diferente fica em Pendências.
- **Nas rotas que misturam leitura e mudança (teto, agente, demanda), só os métodos que mudam estado ficam fixados.**
  O `GET` do teto é `ler_teto` por desenho (02, seção 6).
- **Corpo válido nos casos de CA-02.1 e CA-02.2.** Com corpo `{}`, um 403 poderia esconder uma ordem trocada entre o
  Zod e `autorizar`. Com corpo válido, o controle da pessoa `cto` dá 200, e o 403 só pode vir da matriz.
- **Relógio.** O resultado dos testes novos não depende da hora. Os tokens e as sessões vêm de `prepararCredenciais`,
  e o TOTP segue o `Date` do processo, porque é o que o Better Auth usa (`test/sessao.ts`, da T09). Nenhuma asserção
  compara hora. Também não dependem de ordem: cada teste cria o próprio handler e o próprio contador, e só lê as
  credenciais do `beforeAll`.
- **Sem banco de desenvolvimento.** Tudo rodou no Testcontainers, e o `docker-compose.dev.yml` não subiu.

## Pendências

- **T16 a T23 (qa-automacao de cada uma):** confirmar que o laço sobre as rotas reais passa a ter casos. Confirmar
  também que os caminhos das rotas batem com `ACAO_FIXADA` em `test/matriz-rotas-qa.test.ts`. Uma rota criada num
  caminho diferente do da 02, seção 6, não aciona a fixação e passa calada. Nesse caso, a tarefa ajusta a tabela com o
  tech-lead, sem afrouxar a ação.
- **T37:** `/entrar` e `/configurar-2fa` precisam se chamar `entrar/page.tsx` e `configurar-2fa/page.tsx`, na raiz de
  `src/app` ou num grupo. Outro nome fora de `(painel)` quebra `varreduras-qa.test.ts`, e isso é de propósito.
- **T39 em diante, Minor:** o estático de C-04 (b) confere o arquivo `'use server'` inteiro, e não cada exportação. Um
  arquivo com duas ações, uma em `acaoDoPainel` e outra solta, passaria. Quando houver a primeira Server Action, vale
  conferir por exportação, com o tech-lead escolhendo a forma (por exemplo, toda exportação de arquivo
  `'use server'` como `export const x = acaoDoPainel(`).
- **Minor:** o estático de C-27 procura o nome por texto. Um nome montado em tempo de execução, como
  `process.env['ANTHROPIC_' + 'API_KEY']`, escapa. Fica com a revisão de código da 08.
- **Fora da T13:** o aviso `[UNDICI-FETCH-patch]` na saída da suíte já existia antes desta etapa e não muda nenhum
  resultado. O engenheiro também registrou.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 53c649121dafbbdaa855ea4f82b8cc65717682c9` — 10 arquivos: 5 testes novos, `test/requisicao.ts` e dois comentários em `src/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 53c649121dafbbdaa855ea4f82b8cc65717682c9 -- src test` — o diff da construção; nenhum `.skip`, `.only` ou `.todo` e nenhum teste apagado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h --diff-filter=A -- src scripts drizzle.config.ts next.config.ts` — os arquivos que existem em `src/` e `scripts/`, para conferir as varreduras
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/varreduras-qa.test.ts test/matriz-rotas-qa.test.ts` — 2 arquivos, 42 de 42
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 72 arquivos, 1128 de 1128
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico test/matriz-rotas.test.ts test/matriz-rotas-qa.test.ts` — segunda rodada dos arquivos da T13: 10 arquivos, 97 de 97
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os dois arquivos novos, sem rastreio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — vazio

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
