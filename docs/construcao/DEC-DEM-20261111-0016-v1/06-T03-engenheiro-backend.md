---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T03-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T01, T03), 04-seguranca-aplicacao.md (cabeçalho e C01), 06-T01-tech-lead.md, 06-T02-tech-lead.md, src/modules/acesso/tokens-servico.ts, src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/matriz.test.ts, src/modules/acesso/matriz-qa.test.ts, src/modules/acesso/ramos-por-ator.test.ts, src/modules/acesso/ramos-por-ator-qa.test.ts, src/modules/acesso/tokens-servico.test.ts, src/modules/acesso/tokens-servico-qa.test.ts, src/db/schema/integracao-qa.test.ts, src/db/privilegios.ts, src/modules/demandas/servico.ts (criarDemanda, autoriaDo), src/modules/historico/consultas.ts, src/components/rotulos.ts (trechos), src/lib/rota.ts, test/banco.ts, test/requisicao.ts, test/matriz-rotas.test.ts, test/matriz-rotas-qa.test.ts, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T03: token de integração, matriz fechada por integração e matriz × rotas (IN-01, IN-03). Mais os Minor deixados
para a T03: o Minor 1 da 06-T01-revisao e o Minor 3 da 06-T02-revisao.

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `src/modules/acesso/tokens-servico.ts` | `gravarToken` interno (D-02); `criarTokenServico` com a mesma assinatura de antes; `criarTokenDeIntegracao(t, integracao, relogio)` nova; `validarTokenServico` devolve `AtorAgente \| AtorIntegracao \| null` e só aceita linha que casa com uma lista (G8 #3, IN-03): agente da lista com `integracao` nula, ou integração da lista com `agente` nulo. Qualquer outra linha dá `null` (401). `RE_PREFIXO` exportada |
| `src/modules/acesso/matriz.ts` | 23 ações (mais `confirmar_demanda`, `listar_pedidos_pendentes`, `entregar_pedido`, `confirmar_recebimento_pedido`). Os cinco pares do RF-03: `criar_demanda` e `ler_demanda` (linha própria, sem `LEITURA`) com `['awave']`, e `SO_CONSTRUIR = linha(null, [], ['construir'])` nas três do /construir. `confirmar_demanda` é `QUALQUER_PESSOA_SEM_AGENTE`. `atoresProibidos` acrescenta no fim as integrações negadas (G8 #2); ação desconhecida proíbe todas |
| `src/modules/historico/consultas.ts`, `src/components/rotulos.ts` | Só `export` na `RE_PREFIXO` que já existia, para o teste que amarra as cópias (Minor 3 da 06-T02-revisao) |
| `test/requisicao.ts` | `AtorDeTeste` com integração; `Credenciais.tokensIntegracao` (um por integração, em `prepararCredenciais`); `chamarComo` por `switch` com `atorDesconhecido` |
| `test/matriz-rotas.test.ts` | `rotulo` por `switch` com integração; `atoresPermitidos` com `INTEGRACOES`; `describe` novo "integrações recusadas não gravam nada (CA-03.1, CA-03.2)" depois do laço das rotas |
| `src/modules/acesso/matriz.test.ts` | Mudanças do G5: 19 → 23 ações; `ESPERADA` com `integracoes` e as quatro linhas novas; os `toEqual` de `atoresProibidos` com as integrações no fim; "leitura … ninguém" passa a esperar as integrações fora da linha (`construir` em `ler_demanda`, as duas nas outras); o laço "cada ator proibido é de fato negado" com as integrações |
| `test/estatico/piso-de-assercoes.test.ts` | `PISO` com os 16 arquivos do D-17 (comentário "a9fd9b8, contado na T03") |
| `src/modules/acesso/matriz-qa.test.ts`, `test/matriz-rotas-qa.test.ts`, `src/modules/acesso/ramos-por-ator.test.ts` | Fora do G5. Explicados trecho a trecho em "Desvios" |

### Arquivos criados

- `src/modules/acesso/matriz-integracoes.test.ts`: IN-01 (a), (b), (d), as três ações do /construir sem pessoa nem
  agente, `confirmar_demanda` só de pessoa e as listas congeladas. É o texto do plano.
- `src/modules/acesso/tokens-integracao.test.ts`: banco real. `criarTokenDeIntegracao` para `awave` e `construir`:
  o token tem o formato, 32 bytes e o prefixo; o banco guarda só o SHA-256, com `agente` nulo e a data do relógio. Dois
  tokens nunca são iguais. Em transação desfeita, nada fica gravado. Integração fora da lista é recusada sem gravar.
  `validarTokenServico` devolve `{ tipo: 'integracao', integracao, prefixoToken }`, e o token de agente continua
  `AtorAgente` (CA-01.1). Revogar um token de integração dá `null` só para ele; o outro token do awave, o do construir
  e o de agente continuam valendo (CA-01.2). Também confere que as cópias de `RE_PREFIXO` são iguais (Minor 3).
- `src/modules/acesso/tokens-integracao-corrompido.test.ts`: banco próprio. O migrator desliga
  `token_servico_dono_check`, `token_servico_agente_check` e `token_servico_integracao_check`. Sete linhas
  corrompidas dão `null`: dois nulos; agente `admin`; `risco`+`awave`; `consolidacao`+`construir`; integração `jarvis`;
  nome de agente como integração; nome de integração como agente. O controle no mesmo banco mostra que agente e
  integração da lista resolvem. Cobre o Minor 1 da 06-T01-revisao.
- `test/integracoes.ts`: `atorDeIntegracao` e `tokenDeIntegracao` (G7), como no plano.

### Teste antes do código (visto falhando)

`pnpm test src/modules/acesso test/matriz-rotas.test.ts`, antes de mexer em `tokens-servico.ts` e `matriz.ts`:
5 arquivos falharam, 26 testes falharam, 310 passaram e 106 foram pulados. Os 106 são o `matriz-rotas.test.ts`
inteiro: o `beforeAll` caiu porque `criarTokenDeIntegracao` ainda não existia. Trechos:

```
 ❯ src/modules/acesso/tokens-integracao.test.ts (13 tests | 10 failed)
TypeError: criarTokenDeIntegracao is not a function
 FAIL  ... formato do prefixo do token: uma regra só > a tela e o histórico usam a mesma regex de tokens-servico.ts
TypeError: Cannot read properties of undefined (reading 'source')
 Test Files  5 failed | 20 passed (25)
      Tests  26 failed | 310 passed | 106 skipped (442)
```

Na segunda rodada, `pnpm test src/modules/acesso/matriz-integracoes.test.ts src/modules/acesso/tokens-integracao-corrompido.test.ts src/modules/acesso/matriz.test.ts`, falharam 16 testes, entre eles o dos pares exatos (o "teste que falha" da T03 no G3.1):

```
 FAIL  src/modules/acesso/matriz-integracoes.test.ts > IN-01 > (a) os pares (ação, integração) permitidos são exatamente os cinco do RF-03
AssertionError: expected [] to deeply equal [ …(5) ]
 FAIL  src/modules/acesso/matriz.test.ts > ... as ações são as 23 do plano ...
AssertionError: expected 19 to be 23
 FAIL  src/modules/acesso/tokens-integracao-corrompido.test.ts > IN-03 ... > agente fora da lista: null
+ Received: { "agente": "admin", "prefixoToken": "…", "tipo": "agente" }
 Test Files  3 failed (3)
      Tests  16 failed | 18 passed (34)
```

O IN-03 tinha uma falha real: antes da T03, uma linha com agente `admin`, ou com agente e integração preenchidos,
virava `AtorAgente`.

A linha de base do piso nasce verde (exceção do G3.1). Para contar, os 16 arquivos entraram primeiro com piso
100000, e a falha de cada um mostrou a contagem pela própria `linhasComExpect` (ex.: "expected 44 to be greater than
or equal to 100000"). Antes disso, `git diff a9fd9b8 --stat` dos 16 arquivos saiu vazio, então a contagem de hoje é a
de a9fd9b8. Conferi com Read em `matriz-rotas.test.ts` (17) e `tokens-servico.test.ts` (34). Valores: `matriz` 44,
`matriz-qa` 37, `resolver-ator` 20, `resolver-ator-qa` 17, `tokens-servico` 34, `tokens-servico-qa` 26,
`demandas/servico` 77, `historico/registrar` 12, `limites` 21, `privilegios` 39, `vistas-para-agente` 96,
`matriz-rotas` 17, `sentinelas` 59, `sem-controle-bidi` 7, `sem-recurso-externo` 15, `leituras-da-fila` 34.

### Resultado final

- `pnpm test`: 247 arquivos, 5418 de 5418 testes passaram, 0 falharam.
- `pnpm typecheck` e `pnpm lint`: limpos.
- G4 (`git diff a9fd9b8 --stat` das superfícies congeladas e de `src/lib/rota.ts`): vazio.
- O piso não caiu: nenhuma linha com `expect(` saiu de nenhum arquivo do D-17. `matriz.test.ts` subiu de 44 para 48
  e `matriz-rotas.test.ts` de 17 para 18.

### Desvios do plano (G3.2: mudança fora do G5, trecho a trecho)

1. **`src/modules/acesso/matriz-qa.test.ts`** (está no D-17, não está no G5). Dois `toEqual` de `atoresProibidos`
   esperavam só agentes e papéis e quebram quando as integrações entram no fim da lista, que é o que o G8 #2 pede:
   - "ação desconhecida proíbe todos os agentes e todos os papéis": `todos` ganha
     `...INTEGRACOES.map(...)`, e o nome agora cita as integrações. A falha fechada fica mais forte.
   - "ações só de pessoa proíbem os quatro agentes e nenhum papel": o esperado ganha as duas integrações depois dos
     agentes.
   Mesma quantidade de linhas com `expect(` (37). Nenhuma asserção saiu. Trata-se da mesma mudança que o G5 manda
   fazer no `matriz.test.ts`; faltou citar o irmão `-qa` no G5.
2. **`test/matriz-rotas-qa.test.ts`** (fora do G5 e do D-17). Em cada ação, o controle "pessoa cto chega à função"
   partia do comentário "as ações sem pessoa não existem na matriz". A T03 cria três ações sem pessoa (as do
   /construir), e nelas o cto recebe 403. Agora o controle é o ator que a linha permite: o cto, ou, quando
   `pessoa === null`, a integração da linha. Para as outras 20 ações, a asserção é a mesma (`toBe(200)`, depois
   `chamadas === 1`). Nenhuma linha com `expect(` saiu.
3. **`src/modules/acesso/ramos-por-ator.test.ts`** (teste da T02, fora do G5 e do D-17). O caso "T02: com a matriz
   ainda sem integração em nenhuma linha, nenhuma ação passa" descrevia de propósito o estado entre a T02 e a T03 (D-01).
   Ele passou a "T03: das quatro, o awave passa só em criar_demanda e ler_demanda, e o construir em nenhuma". Para
   `ler_pacote_decisao` e `gerar_pedido_construcao`, o awave continua com `toThrow(SEM_PERMISSAO)`. O construir continua
   negado nas quatro. As linhas com `expect(` passaram de 2 para 3.
4. **`src/modules/historico/consultas.ts` e `src/components/rotulos.ts`** (fora da lista de arquivos da T03). Só o
   `export` da `RE_PREFIXO` que já existia, pedido no Minor 3 da 06-T02-revisao, que foi deixado para a T03. O teste
   compara `source` e `flags` das duas cópias com a de `tokens-servico.ts`, no padrão do D-14. A regex não mudou e
   nenhum comportamento mudou.
5. **`matriz.test.ts`, além do texto do G5:** "cada linha é a da tabela do plano" ganhou a conferência de
   `integracoes`, e "autorizar segue a matriz em cada ação" ganhou o laço das integrações. São desdobramentos de
   "`ESPERADA` ganha `integracoes`". Só acrescentam.
6. **`tokens-integracao-corrompido.test.ts`:** além dos três casos do plano, tem mais quatro casos e o controle, e
   desliga também `token_servico_integracao_check` para poder gravar integração fora da lista. Só acrescenta
   cobertura, num banco próprio do arquivo.

## Decisões tomadas

- `validarTokenServico` só lê `agente` e `integracao` contra as listas (`ehAgente`, `ehIntegracao`), e não pelo
  CHECK do banco. Assim a linha corrompida dá 401 mesmo se um CHECK sumir (defesa em profundidade, IN-03).
- `ler_demanda` virou linha própria (`linha('qualquer', AGENTES, ['awave'])`), e `LEITURA` continua sem integração,
  como manda o plano. As outras leituras (ESP, RSK, DEC e listagem) seguem fechadas à integração.
- A abertura de `criar_demanda` e `ler_demanda` ao awave não expõe nada antes da T05 e da T06 (D-01). Conferi no
  código: no POST, `criarDemanda` chama `autoriaDo`, que lança `sem_permissao` para integração antes de gravar (G8
  #5, T02). No GET por id, `vistaDaDemandaPara` lança para integração (T02). A integração recebe 403 nos dois
  caminhos. O teste "nada gravado" do `matriz-rotas.test.ts` confere que nenhuma demanda e nenhum evento de integração
  ficam no banco.
- O token nunca aparece em mensagem de falha. Em `tokens-integracao.test.ts`, o formato é conferido por
  `RE_FORMATO.test(token)` e a ausência no banco por `includes(...)` com `toBe(false)`, nunca por `toMatch` ou
  `toContain` sobre o token (G3.3, C-39).
- `criarTokenServico` grava `integracao: null` de forma explícita. O INSERT em `token_servico` é por tabela
  (`privilegios.ts`, sem GRANT novo), então nada muda no privilégio.
- Uma busca no plano rodou fora da regra de comando deste pedido. Ela só leu o arquivo, e o maestro a registrou e
  liberou.

## Pendências

- Nenhuma bloqueia a T03.
- Para a 05 do próximo pedido (lição, como a da 06-T02-revisao): teste `-qa` irmão de um teste do G5 (aqui o
  `matriz-qa.test.ts`) e teste que fixa um estado intermediário do plano (aqui o caso "T02:" do
  `ramos-por-ator.test.ts`) também entram no G5.
- O plano tem caixas `- [ ]` dos passos da T03, mas não as marquei: `docs/` fica fora do que a 06 pode editar (G1).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status`: ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only -n 15 --format=%h%x20%s`: commits do pedido até a 06-T02-testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G ACOES --name-only --format=%h -- src test e2e scripts`: arquivos que usam `ACOES`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G atoresProibidos --name-only --format=%h -- src test e2e scripts`: `matriz.ts`, `matriz.test.ts`, `matriz-qa.test.ts`, `matriz-rotas.test.ts`, `matriz-rotas-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G validarTokenServico --name-only --format=%h -- src test e2e scripts`: `tokens-servico*`, `resolver-ator.ts`, `scripts.test.ts`, `integracao-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts`: vazio (contagem de hoje = a9fd9b8)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts`: 16 falharam e 18 passaram, de propósito, com piso 100000 para ler a contagem
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/matriz-rotas.test.ts`: antes do código, 26 falharam, 310 passaram e 106 foram pulados
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/matriz-integracoes.test.ts src/modules/acesso/tokens-integracao-corrompido.test.ts src/modules/acesso/matriz.test.ts`: antes do código, 16 falharam e 18 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 -- src/modules/demandas/servico.ts`: conferência de `autoriaDo` (D-01)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`: limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test`: 6 falharam e 5412 passaram (os irmãos fora do G5, corrigidos depois; ver Desvios 1 a 3)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint`: limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`: só os arquivos da tarefa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/matriz-rotas.test.ts test/matriz-rotas-qa.test.ts test/estatico/piso-de-assercoes.test.ts`: todos passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck`: limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint`: limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test`: 247 arquivos, 5418 de 5418 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts`: vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat`: 11 arquivos alterados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`: 11 alterados e 4 novos, todos da tarefa; a suíte não deixou arquivo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
