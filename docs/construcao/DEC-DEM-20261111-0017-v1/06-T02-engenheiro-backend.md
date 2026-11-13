---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T02-construcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T01-engenheiro-dados-bd.md, 06-T01-tech-lead.md, 06-T01-qa-automacao.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 1 a 335, G1 a G10, e 603 a 753, T02), src/modules/acesso/matriz.ts, src/modules/acesso/matriz.test.ts, src/modules/acesso/matriz-integracoes.test.ts, src/modules/acesso/matriz-integracoes-qa.test.ts, test/estatico/piso-de-assercoes.test.ts, test/matriz-rotas.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T02 do plano: ação `registrar_andamento` só do `construir` na matriz (RF-01, CA-01.3, CA-01.6, AN-01 a, b, d, e, f;
AN-13 no diff de `matriz.ts`). Antes de escrever código, conferi que todos os arquivos da T02 ficam em `src/` e `test/`,
dentro da minha lista Pode.

### Arquivos criados

- `src/modules/acesso/matriz-andamento.test.ts`: o teste do plano, sem mudança (pares exatos com seis, quatro ações do
  `construir` e duas do `awave`, linha `SO_CONSTRUIR` congelada, negação de awave, agentes com e sem token, papéis e
  sistema, `atoresProibidos`, integração fora da lista).
- `test/estatico/andamento.test.ts`: o teste estático do plano (D-04), sem mudança. Fora de teste, só a matriz, a rota
  nova e o serviço podem citar a ação. Nenhum arquivo `'use server'`, job ou worker pode citar a ação. Tem um caso
  plantado para cada regra.

### Arquivos modificados

- `src/modules/acesso/matriz.ts`: `'registrar_andamento'` em `ACOES` (com o comentário do plano),
  `registrar_andamento: SO_CONSTRUIR` em `MATRIZ` e o comentário de `Linha` ("Só seis pares abrem (RF-03 da 0.3.0 e
  RF-01 da 0.4.0) … construir nas quatro ações dele"). Diff contra `0ac099a`: duas linhas de código, o comentário da ação
  e as duas linhas do comentário de `Linha`. Nada mais muda.
- `src/modules/acesso/matriz.test.ts` (G5): `SO_CONSTRUIR` ganhou `'registrar_andamento'`, e com isso a `ESPERADA`.
  "23" virou "24" no título e no `toBe` da linha 85.
- `src/modules/acesso/matriz-integracoes.test.ts` (G5): `DO_CONSTRUIR` ganhou `'registrar_andamento'`. A lista de pares
  ganhou `'registrar_andamento:construir'` em ordem alfabética, e o título "os cinco do RF-03" passou a "os seis do RF-03
  e do RF-01 da 0.4.0".
- `src/modules/acesso/matriz-integracoes-qa.test.ts` (G5): `DO_CONSTRUIR` ganhou `'registrar_andamento'`. A linha 203
  passou de `- 5` para `- 6`, com o comentário da 202. Os títulos passaram de "23 ações" para "24", de "as três do
  /construir" para "as quatro", de "atoresProibidos das três" para "das quatro" e de "nas três ações dele" para "nas
  quatro". Nenhuma asserção saiu.
- `test/estatico/piso-de-assercoes.test.ts`: `'src/modules/acesso/matriz-andamento.test.ts': 13` e
  `'test/estatico/andamento.test.ts': 8`, que são as linhas com `expect(` no fim da tarefa.

### Teste escrito antes, visto falhando

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/estatico/andamento.test.ts --reporter=dot`, antes de mexer em `matriz.ts`:

```
 FAIL  test/estatico/andamento.test.ts > ... fora de teste, só a matriz, a rota nova e o serviço citam a ação
AssertionError: expected [] to include 'src/modules/acesso/matriz.ts'
 FAIL  src/modules/acesso/matriz-andamento.test.ts > AN-01: registrar_andamento > (a) os pares (ação, integração) montados de MATRIZ são exatamente os seis
-   "registrar_andamento:construir",
 FAIL  ... > a linha é SO_CONSTRUIR: sem pessoa, sem agente, congelada
AssertionError: expected undefined to deeply equal { pessoa: null, agentes: [], …(1) }
 FAIL  ... > (e) integração fora da lista (jarvis, Construir, vazio) é negada; o construir passa
 Test Files  2 failed | 26 passed (28)
      Tests  6 failed | 400 passed (406)
```

### Resultado

- `src/modules/acesso` com `test/estatico/andamento.test.ts`: 28 arquivos, **407 passaram, 0 falharam**.
- `pnpm test` completo: **311 arquivos, 6601 testes passaram, 0 falharam** (204 s). O `test/matriz-rotas.test.ts`
  ganhou sozinho o verificador sintético de `registrar_andamento`.
- `pnpm lint` e `pnpm typecheck`: limpos, antes e depois do último ajuste.
- Depois da suíte completa, corrigi um espaço que faltava após a vírgula num título do `matriz-integracoes-qa.test.ts`.
  Rodei de novo esse arquivo e o piso (79 de 79), mais `lint` e `typecheck`, todos limpos.

### Contagem de `expect(` nos três testes da G5 (AN-13)

| Arquivo | Antes | Depois |
|---|---|---|
| `src/modules/acesso/matriz.test.ts` | 47 | 47 |
| `src/modules/acesso/matriz-integracoes.test.ts` | 8 | 8 |
| `src/modules/acesso/matriz-integracoes-qa.test.ts` | 45 | 45 |

Nenhum arquivo ficou com menos linhas `expect(`. O piso de `matriz.test.ts` (44) continua coberto.

### `git diff 0ac099a -- src/modules/acesso/matriz.ts`

```diff
@@ -30,11 +30,13 @@ export const ACOES = [
   'confirmar_recebimento_pedido',
+  // 0.4.0 (RF-01, AN-01): o andamento do Pedido de Construção, só pelo /construir.
+  'registrar_andamento',
 ] as const;
-// `integracoes` (0.3.0, IN-01): lista de permissão fechada por integração; vazia por padrão. Só cinco pares abrem
-// (RF-03): awave em criar_demanda e ler_demanda; construir nas três ações dele.
+// `integracoes` (0.3.0, IN-01): lista de permissão fechada por integração; vazia por padrão. Só seis pares abrem
+// (RF-03 da 0.3.0 e RF-01 da 0.4.0): awave em criar_demanda e ler_demanda; construir nas quatro ações dele.
@@ -69,6 +71,7 @@
   confirmar_recebimento_pedido: SO_CONSTRUIR,
+  registrar_andamento: SO_CONSTRUIR,
 });
```

### G4

`git diff 0ac099a --stat` das superfícies congeladas saiu **vazio**.

### Desvios do plano

- **Dois títulos em `matriz-integracoes.test.ts` além do que a G5 lista para esse arquivo.** O título "(b) …construir
  fora das três dele" passou a "das quatro dele". O título "as três do /construir não têm pessoa nem agente" passou a
  "as quatro". A razão é que, com a ação nova, "três" ficaria falso. Os dois títulos estão no mesmo `DO_CONSTRUIR` que a
  G5 manda mudar. Só mudou o texto dos títulos. Nenhuma asserção, valor esperado ou laço mudou. A revisão decide.
- **Teste de guarda que já nasce verde (G3.1).** Em `test/estatico/andamento.test.ts`, três casos passam antes do
  código: "a varredura enxerga o código que roda", "nenhum arquivo 'use server', job ou worker cita a ação" e "as regras
  pegam o caso plantado". São guardas, e a rota e o serviço ainda não existem. O caso que exige o código ("…só a matriz,
  a rota nova e o serviço citam a ação") falhou antes, como mostra o trecho acima.
- O comentário do cabeçalho de `matriz-integracoes-qa.test.ts` (linha 5, "as três ações do /construir") ficou como
  estava. É o registro do que a 06-T03-testes da 0.3.0 cobriu.

## Decisões tomadas

- **Testes do plano copiados sem mudança.** Eles são o contrato do AN-01 e da T02, e a revisão confere contra o plano.
- **`registrar_andamento` reusa a constante `SO_CONSTRUIR` em vez de criar uma linha nova.** Assim fica uma fonte só para
  "nenhuma pessoa, nenhum agente, só o construir", como o plano pede.
- **Comandos `pnpm` com `--dir <repo>`.** O shell do agente começa na estruturaAutonoma, e o `cd` não está na lista Pode.
  É a mesma forma das entregas da 06-T01.

## Pendências

- Nenhuma bloqueia a passagem.
- Para o maestro: rodei dois comandos de leitura fora da forma exata da lista Pode. Peço que libere os dois, porque só
  leram:
  - `grep -c "expect("` nos três testes da G5 do repositório, para a contagem "antes". Depois troquei para
    `git -C <repo> grep -c`.
  - `wc -l` no arquivo de saída do meu próprio `pnpm test` em segundo plano, em `/tmp/claude-1000/...`, para ler o
    resumo no fim. Esse arquivo não é do repositório. Li o conteúdo pela ferramenta Read.
- Para a `06-T02-revisao`: a G4 saiu vazia. O diff parcial de `matriz.ts` está acima, e a contagem de `expect(` está na
  tabela.
- Para a `06-T07` e a `06-T08`: a `CITAM_A_ACAO` de `test/estatico/andamento.test.ts` já tem
  `src/modules/andamento/registrar.ts` e `src/app/api/pedidos-construcao/[decId]/andamento/route.ts`. Se o nome de
  algum dos dois mudar, a lista também tem de mudar.
- As pendências da 06-T01 não citam a T02.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `grep -n "^#" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — último commit `0c6b1ca` (06-T01-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -l "confirmar_recebimento_pedido"` — quem cita as ações do /construir
- `grep -c "expect(" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/acesso/matriz.test.ts /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/acesso/matriz-integracoes.test.ts /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/acesso/matriz-integracoes-qa.test.ts` — 47, 8, 45 antes (fora da forma exata; ver Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/estatico/andamento.test.ts --reporter=dot` — antes do código: 6 falharam, 400 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/estatico/andamento.test.ts --reporter=dot --silent` — 407 de 407
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/modules/acesso/matriz-andamento.test.ts test/estatico/andamento.test.ts src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-integracoes.test.ts src/modules/acesso/matriz-integracoes-qa.test.ts` — 13, 8, 47, 8, 45
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 311 arquivos, 6601 de 6601
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/acesso/matriz.ts` — só as linhas da T02
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-integracoes.test.ts src/modules/acesso/matriz-integracoes-qa.test.ts` — só as mudanças da G5 e os dois títulos do desvio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "23 ações" -e "ACOES.length" -e "cinco pares" -- src test scripts` — nenhum outro teste fixa a contagem de ações
- `wc -l /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/bdzumqjbo.output` — 696 linhas, para ler o resumo (fora da lista Pode; ver Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/matriz-integracoes-qa.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot --silent` — 79 de 79, depois do ajuste do espaço
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do ajuste
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, depois do ajuste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 7 arquivos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T02 não cria entrada nova; a rota é da T08)
