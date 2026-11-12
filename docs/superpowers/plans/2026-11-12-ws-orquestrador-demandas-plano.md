# Plano de implementação — ws-orquestrador-demandas 0.4.0: andamento do Pedido de Construção registrado pelo `/construir`

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou
> superpowers:executing-plans para executar este plano tarefa por tarefa. No /construir, cada tarefa é uma passagem
> `06-Tnn-construcao` do engenheiro indicado, seguida de `06-Tnn-revisao` (tech-lead) e `06-Tnn-testes`
> (qa-automacao). O commit é do maestro. Os passos usam caixa (`- [ ]`): o status report diário lê esses checkboxes.

**Objetivo:** o `/construir` informa a fase e as tarefas prontas de cada Pedido de Construção gerado no painel, pela
rota nova `POST /api/pedidos-construcao/<DEC-id>/andamento` e o token `construir` da 0.3.0. O Orquestrador guarda o
último andamento, mostra na fila e no detalhe, faz só duas mudanças de status automáticas (`aprovada → em_construcao`,
`em_construcao → devolvida`) e entrega ao Awave uma leitura de quatro campos. `entregue` continua só de pessoa (A1);
evento só na mudança de fase, status ou DEC (A2); pedido escrito direto recebe 404 (A3). Nenhum controle é afrouxado.

**Arquitetura:** o monólito modular de hoje (ADR-01 a ADR-29) com os ADR-30 a ADR-35 do pedido: tabela própria só de
inclusão `andamento_construcao` (o último andamento é a linha de maior `id`), limite contado nas linhas da tabela,
transação `padrao` com travas pedido → demanda → limite, 422 pelo próprio `rota()` (opção `corpoInvalido`), transições
do `construir` em tabela própria em `transicoes.ts`, e o andamento nas vistas por lista de permissão. Duas migrations
aditivas (`0008` gerada, `0009` custom com o `GRANT`). Um módulo novo `src/modules/andamento/`, uma rota nova, nenhum
processo, fila, job, pacote ou variável de ambiente novo.

**Stack:** a do `package.json` de hoje (Node 24, pnpm 12.6.0, TypeScript strict, Next 16.4.1, React 19.2.8, Tailwind 4,
Drizzle 0.45.3 + drizzle-kit 0.31.11, Zod 4.6.6, Better Auth 1.7.7, pg-boss 12.34.0, Vitest 5.0.2 + Testcontainers
12.1.0, Playwright 1.63.0 + `@axe-core/playwright` 4.13.0). **Nenhum pacote novo.**

**Fontes:** pedido `DEC-DEM-20261111-0017-v1`; spec aprovada na Parada 1
(`docs/superpowers/specs/2026-11-12-ws-orquestrador-demandas-andamento-design.md`, com P-01 a P-04 de Fabiano: 409 para
DEC substituído, tabela de contradição da seção 2.1, limites 60 por DEC e 600 por hora, aceite dos riscos residuais;
divergências pela seção 7.3); entregas `01-analista-requisitos.md` (RF-01 a RF-13, RNF-01 a RNF-10),
`02-arquiteto-solucoes.md` (ADR-30 a ADR-35), `03-ux-ui-design.md` (telas e textos) e `04-seguranca-aplicacao.md`
(AN-01 a AN-15), na pasta `docs/construcao/DEC-DEM-20261111-0017-v1/`; `padrao-tecnico.md` da estruturaAutonoma.
**Base: `main` em `0ac099a` (0.3.1).** Sai como **0.4.0**.

---

## Restrições globais (valem para toda tarefa)

### G1. Quem edita o quê (listas **Pode** dos agentes, conferidas arquivo a arquivo em cada tarefa)

| Engenheiro | Edita | Roda |
|---|---|---|
| `engenheiro-dados-bd` | `src/db/`, `src/modules/`, `drizzle/`, `test/`, `scripts/`, `drizzle.config.ts` | `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm db:generate`, `pnpm drizzle-kit generate --custom --name rls_<tabela>` |
| `engenheiro-backend` | `src/`, `test/`, `scripts/`, `package.json`, `*.config.*` | `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` |
| `engenheiro-frontend` | `src/`, `test/`, `e2e/`, `public/`, `package.json`, `*.config.*` | `pnpm install`, `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm build` |

Consequências que o plano já respeita (lição da 0.3.0, T07):
- a migration (`drizzle/`) é do `engenheiro-dados-bd` (T01), e a custom se chama `rls_andamento_construcao` (D-02);
- o `engenheiro-dados-bd` **não** edita `src/app/`, `src/lib/`, `src/components/` nem `e2e/`: as tarefas dele (T01,
  T06) só tocam `src/db/`, `src/modules/`, `drizzle/` e `test/`, testes antigos incluídos;
- o `scripts/` (seed) é do `engenheiro-backend` (T10); o frontend não edita `scripts/`;
- só o `engenheiro-frontend` escreve em `e2e/` e roda `pnpm test:e2e` (T12 a T14), inclusive a troca de seis para sete
  chaves do Awave em `e2e/integracoes.spec.ts` (T14);
- ninguém da 06 escreve em `docs/` nem no `CHANGELOG.md` (G2). A versão `0.4.0` no `package.json` é da T14
  (frontend); **a seção 0.4.0 do `CHANGELOG.md` é do `documentacao-tecnica`, na etapa `10-documentacao`** (D-10).

### G2. Fora das tarefas da 06 (cada item tem etapa dona)

| Item | Etapa dona |
|---|---|
| Foco, teclado, leitura e anúncios que o axe não pega na T03 e na T05 (03, seções 9 e 10), estados da 03 (4.4 e 5.8) à mão | `07-qa-funcional` |
| `/security-review` com foco em matriz, `rota()` com `corpoInvalido`, ordem das travas, prazo total, vistas por tipo de ator e transições; `pnpm audit --prod --audit-level high` sem alta nem crítica; G4 e o piso de asserções de novo; achado crítico ou alto volta ao engenheiro e passa por reteste da `seguranca-aplicacao` | `08-revisao` (maestro) e `08-reteste` |
| `docker build`, CI, homologação (`construir.mjs homologar`, e2e 3 vezes seguidas contra ela), ensaio de rollback com `alteram_dado = false` e `volta_sem_restaurar = false` **esperado** (02, seção 8), cenário V-02 (seção "Verificação na homologação", no fim; AN-15), medição do RNF-01 (50 chamadas, p95 ≤ 1 s, nenhuma acima de 5 s, com 200 DEC e 20 mil eventos) | `09-entrega` (`devops-sre`) |
| `CHANGELOG.md` seção 0.4.0 (rota, selo, detalhe, vista do Awave, migration; CA-13.1); manual técnico caps. 01, 02, 05 (rota, respostas 204/404/409/422/429/503, tabela de transições da spec 2.1, `andamento_registrado`, limite, A3; CA-13.2), 08 e 09; `docs/operacao/deploy.md` (backup, migrator, `worker` e depois `app`, sem snapshot (D5), `andamento_ligado` só depois da saúde em 200, desligado antes da volta, volta só pelo caminho B, conferência da fase na fila em até 2 min; CA-13.3) e `docs/operacao/tokens-de-integracao.md` (o `construir` passou a **escrever**, revogação imediata em suspeita, como achar o que um prefixo gravou sem exibir o token; AN-14) | `10-documentacao` (`documentacao-tecnica`) |
| Backup, migrations `0008` e `0009` pelo migrator, deploy do `worker` e depois do `app`, saúde em 200, só então `"andamento_ligado": true`; conferir a fase na fila em até 2 min; volta só pelo caminho B, com `"andamento_ligado": false` antes; P-04 (aceite de risco com `gestao-riscos`) e P-05 (conferir a tool do Awave com a sétima chave) | Fabiano, depois do merge |

### G3. Código

1. **TDD:** o teste é escrito antes e visto falhando; a entrega mostra o comando e o trecho da falha. Ao fim de cada
   tarefa, `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes, e `pnpm test:e2e` verde nas tarefas do
   `engenheiro-frontend`. Exceções declaradas: os testes de guarda que já nascem verdes (varredura do AN-09 para
   agente na T09, porque a vista mínima já é lista de permissão; partes do teste estático da T02 antes de a rota
   existir) vão nomeados na entrega, com a razão; o teste que falha da tarefa é o que exige o código novo.
2. **Teste que já existe só muda pela lista da G5** (AN-13). Nunca se apaga asserção, nunca se desliga regra do axe,
   nunca se sobe `retries` ou tempo-limite, nunca `bypassCSP`. Mudança fora da G5 vai explicada na entrega, trecho a
   trecho, e a revisão decide; em teste de segurança, ela **devolve** a tarefa ao `05-plano`.
3. **Dados e tokens só fictícios** (JUR-2026-002, 7.4): títulos com "(fictício)", nomes "Pessoa Ficticia …", domínios
   `.test`. Token só gerado em tempo de teste (`tokenDeIntegracao`, `criarTokenServico`), nunca em arquivo do
   repositório, log ou mensagem de `expect`. Prefixo fictício escrito à mão: `ficticio` (8 caracteres, passa no CHECK
   `^[A-Za-z0-9_-]{8}$`, fora do formato de token).
4. **Ramo por tipo de ator é `switch` com `never`** (`atorDesconhecido`), sem ramo padrão que grave ou mude.
5. **Lista de permissão, chave a chave**, nunca `...objeto`: corpo do envio (`z.strictObject`), `depois` e `antes` do
   evento, vista do Awave (quatro chaves), vista de pessoa (seis chaves).
6. **SQL:** só Drizzle ou template `sql` com valor por parâmetro; chave de trava consultiva por parâmetro; nada de
   `sql.raw` (teste estático de hoje). CHECKs da tabela nova escritos como literais, conferidos contra as listas
   `FASES_ANDAMENTO` e `STATUS_CONSTRUCAO` por teste (T01).
7. **Prazo total (AN-06, lição da 0019):** o serviço novo usa `executarComOrcamento(deps.pool, ator, 'padrao',
   undefined, …)` e **não tem parâmetro `t`**; em `src/modules/andamento/**`, `mudarStatusPeloConstruir` e
   `conferirLimiteDeAndamento`: nenhum `set local`, `set_config`, `comTransacao`, `executarComOrcamento` aninhado nem
   `Promise.all` (teste estático da T07). Quem chama `mudarStatusPeloConstruir` passa a transação que já tem.
8. **Visibilidade (lição da 0.3.1):** o andamento entra em **toda** leitura nova pela lista de permissão; a varredura de
   leituras de agente parte de `MATRIZ` (T09), não de lista escrita à mão.
9. **Relógio injetado:** `Date.now()` e `new Date()` sem argumento continuam proibidos fora de `relogio.ts`. Teste usa
   `relogioFixo(...)` e `avancar`; o relógio monotônico (`performance.now`) só por `vi.spyOn`, como em
   `prazo-total-0019.test.ts`.
10. **Textos** são os de `03-ux-ui-design.md`, seções 7 e 8, por inteiro; texto que não muda é a constante de hoje.
11. **e2e (lições 0015 a 0.4.0):** teste que cria versão (ESP, RSK, DEC) pela API usa a conta "administradora"; os
    e2e deste pedido **não criam** demanda nem versão: leem as demandas do seed (T10). Playwright fica com
    `retries: 0` e 30 s por teste: teste que passar de 24 s na entrega é **dividido**. Spec com credencial no cabeçalho
    usa `test.use({ trace: 'off' })` (`test/estatico/trace-e2e.test.ts`). Contra a homologação, os testes com token
    pulam com `MOTIVO_SEM_TOKENS`.
12. **Log:** nenhuma linha nova; a de `rota()` continua só com rota padrão, status, ms, `atorTipo` e `codigoErro` (sem
    `decId`, fase, números, prefixo, `wsod_`).

### G4. Superfícies congeladas (AN-13) — conferidas pelo tech-lead em toda revisão e na 08

Este comando tem de sair **vazio** em toda revisão de tarefa:

```
git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'
```

Diffs parciais, conferidos lendo o `git diff 0ac099a -- <arquivo>`:
- `src/lib/rota.ts`: só a opção `corpoInvalido` em `OpRota` e o ramo dela na validação do corpo (T04);
- `src/modules/demandas/transicoes.ts`: só acréscimos; `MANUAIS`, `AUTOMATICAS`, `mudarStatusPeloSistema`,
  `conferirTransicaoManual` e `STATUS_FINAIS` sem linha mudada (T05);
- `src/modules/limites.ts`: só acréscimos; `TipoLimite`, `LIMITE_POR_HORA`, `MENSAGEM_LIMITE`, `LIMITE_DA_INTEGRACAO`,
  `limiteDe` e `conferirLimite` sem linha mudada (T03);
- `src/modules/acesso/matriz.ts`: uma linha em `ACOES` e uma em `MATRIZ` (mais comentário) (T02);
- `src/modules/demandas/consultas.ts`: os corpos de `vistaMinimaDaDemanda`, `paginaDeDemandas`, `resumoDe`,
  `listarDemandasPara` e `lerDemandaPara` sem linha mudada; muda o tipo `DemandaVistaMinima` (acrescenta `'andamento'`
  ao `Omit`) (T09);
- `src/db/privilegios.ts`: uma linha nova, sem `colunasUpdate` (T01).

Piso de asserções (IN-16, AN-13): `test/estatico/piso-de-assercoes.test.ts` só sobe. Cada tarefa que cria teste de
segurança acrescenta o arquivo novo ao `PISO` com o número de linhas `expect(` dele no fim da tarefa (T01, T02, T03,
T07, T08, T09). Asserção a menos em teste de segurança é **Critical**.

### G5. Testes existentes que vão mudar (e só nisto)

| Arquivo | Muda | Tarefa |
|---|---|---|
| `src/modules/acesso/matriz.test.ts` | 23 → 24 ações (linha 85 e título); `SO_CONSTRUIR` (linha 31) ganha `'registrar_andamento'`, e com isso a `ESPERADA` | T02 |
| `src/modules/acesso/matriz-integracoes.test.ts` | lista de pares (linhas 20 a 26) ganha `'registrar_andamento:construir'` na ordem alfabética; título "os cinco" → "os seis"; `DO_CONSTRUIR` (linha 15) ganha `'registrar_andamento'` | T02 |
| `src/modules/acesso/matriz-integracoes-qa.test.ts` | `DO_CONSTRUIR` (linha 25) ganha `'registrar_andamento'`; linha 203 `- 5` → `- 6` e o comentário da 202; títulos que dizem "23 ações", "três do /construir" e "as três" passam a "24", "quatro" e "as quatro". Nenhuma asserção sai | T02 |
| `test/estatico/migration-0007.test.ts` | "a 0007 é a última" passa a "a 0007 está no índice 7" (`entries[7]`), e a leitura do SQL usa a entrada de `idx` 7, não `at(-1)`. As listas de proibidos e de esperados ficam | T01 |
| `src/db/imutabilidade.test.ts` | o `it.each` da linha 32 ganha três casos: `update andamento_construcao set fase = $1` (`['testando']`), `delete from andamento_construcao`, `truncate andamento_construcao` | T01 |
| teste que fixe a `0007` como última migration (se o `pnpm test` da T01 apontar outro além do de cima) | a mesma troca por índice, e só ela; qualquer outra mudança devolve ao `05-plano` | T01 |
| fixtures tipadas como `DemandaVista` ou `DemandaVistaDaIntegracao` em testes de `src/` (o `typecheck` aponta) | ganham `andamento: null`; nenhuma asserção muda | T09 |
| listas exatas de chaves da vista do Awave: `src/app/api/demandas/contrato-awave.test.ts:46`, e as de `leitura-awave.test.ts`, `leitura-awave-qa.test.ts`, `criacao-awave.test.ts`, `criacao-awave-qa.test.ts`, `criacao-awave-0019.test.ts`, `src/modules/acesso/ramos-por-ator*.test.ts` e `src/modules/demandas/consultas.test.ts` que o `pnpm test` apontar | seis → sete chaves (`'andamento'` na ordem alfabética), com `andamento: null` onde o valor é comparado (aprovado de antemão pelo AN-13) | T09 |
| testes do seed que contam demandas, eventos ou pedidos (`scripts/seed-integracoes*.test.ts`, `scripts/scripts.test.ts`, `src/db/sementes.test.ts`, `TOTAL_DEMANDAS_DO_SEED`, `MENSAGENS_SEED`) | os totais crescem com as oito demandas novas; a lista de pendentes **não** muda (D-11) | T10 |
| teste de `textoDoEvento` que liste as ações (se o `typecheck` ou o teste apontar) | ganha `andamento_registrado` | T05 |
| asserções do texto de `TEXTOS_DETALHE.dicaAprovada` (`src/app/(painel)/demandas/[id]/detalhe*.test.ts` e e2e que o leia) | o texto novo da 03, 5.1 item 6; a regra testada não muda | T13 |
| e2e que lê o texto inteiro da célula Status (4ª coluna) ou do topo do cartão de demanda **em construção** | passa a aceitar a segunda linha do selo; nenhuma outra asserção muda | T12 |
| `e2e/integracoes.spec.ts:59` e a lista equivalente de `e2e/integracoes-qa.spec.ts` | seis → sete chaves | T14 |
| `test/estatico/projeto.test.ts` | versão 0.3.1 → 0.4.0 | T14 |
| `test/estatico/piso-de-assercoes.test.ts` | `PISO` ganha os arquivos novos de segurança (só sobe) | T01, T02, T03, T07, T08, T09 |
| `src/db/privilegios.test.ts`, `test/matriz-rotas.test.ts`, `test/matriz-rotas-integracoes-qa.test.ts`, `test/estatico/leituras-da-fila.test.ts`, `src/modules/limites.test.ts`, `test/transversal/sentinelas.test.ts` | **não mudam**: os três primeiros cobrem a tabela e a rota novas sozinhos; a cadeia da fila nova fica em `test/estatico/andamento.test.ts`; as sentinelas do andamento ficam em arquivo novo (D-05) | — |

### G6. Decisões desta etapa

| Id | Decisão | Razão |
|---|---|---|
| D-01 | Base `0ac099a` (0.3.1); sai 0.4.0 | Spec 7.3: é a `main` atual, nada nela muda o contrato |
| D-02 | Migration custom `drizzle/0009_rls_andamento_construcao.sql` (e não `0009_rls_privilegios_andamento`) | A lista Pode do `engenheiro-dados-bd` só cobre `pnpm drizzle-kit generate --custom --name rls_<tabela>`; o conteúdo é o do 02 (só o `GRANT SELECT, INSERT`) |
| D-03 | `ROTULO_FASE` e `ROTULO_SITUACAO_CONSTRUCAO` em `src/components/rotulos.ts`; `TEXTOS_ANDAMENTO`, `seloDeFase` e `secaoDoAndamento` em `src/components/dados-do-andamento.ts` (novo); `ID_SECAO.andamento` e `TEXTOS_DETALHE.secoes.andamento` em `detalhe.ts` | Spec 7.3 deixa nome e arquivo ao tech-lead; os rótulos ficam com os outros rótulos de enumeração, e os textos da seção, num arquivo de regra pura como `dados-da-confirmacao.ts` |
| D-04 | Testes estáticos do AN-01 (f) e do AN-06, e a cadeia de quem importa `andamento/consultas.ts`, num arquivo só: `test/estatico/andamento.test.ts` (criado na T02, ampliado na T06, T07 e T12) | Spec 7.2 pede o lugar; um arquivo com as guardas do módulo novo, no molde de `leituras-da-fila.test.ts` |
| D-05 | Sentinelas do andamento em arquivo novo, `test/transversal/sentinelas-andamento.test.ts` (T08), com a mesma captura do de hoje (pino, console, Sentry falso, esquema `pgboss`) e mais `andamento_construcao` e `evento` | O AN-11 pede a rota nova nas sentinelas; arquivo novo não toca as 59 asserções do de hoje e entra no piso |
| D-06 | AN-06 (c) na leitura do Awave: com 7 s gastos na espera pela conexão, o GET do Awave responde 200 com o andamento; com o relógio passando de 8 s no meio, 503 `indisponivel` | A leitura não tem `INSERT` onde ler o `current_setting`; o que se prova é que a subconsulta nova roda dentro do mesmo prazo total |
| D-07 | O seed grava o andamento das demandas fictícias direto: `mudarStatusPeloConstruir` com o ator `construir` de prefixo `ficticio` e `insert` em `andamento_construcao`, na transação do seed; não chama `registrarAndamento` | O serviço não aceita transação de quem chama (AN-06); nenhum token nasce num banco semeado (D-09 do 0016) |
| D-08 | Uma fonte só das transições do `construir`: `transicaoDoConstruir` em `transicoes.ts`, lida por `decidirPorStatus` (regras.ts) e por `mudarStatusPeloConstruir` | Evita duas tabelas que divergem (ADR-34) |
| D-09 | A leitura do Awave junta a subconsulta `subconsultaDoUltimoAndamento(db, id)` (T06) na mesma consulta da autoria (`leftJoin`) | ADR-35 e AN-09: o 404 sai da mesma consulta; o plano dela é conferido pelo dono do índice |
| D-10 | `package.json` 0.4.0 na T14 (`engenheiro-frontend`); seção 0.4.0 do `CHANGELOG.md` pelo `documentacao-tecnica` na `10-documentacao` | Ninguém da 06 tem `CHANGELOG.md` na lista Pode |
| D-11 | No seed, as demandas A a F de andamento (T10) têm o pedido entregue e recebido pelo `/construir` do seed | A lista de pendentes (V-01 e e2e CP-7 da 0.3.0) continua só com a `pedidoParaBuscar` |
| D-12 | Risco da T12 (fila) é `medio`: leitura nova de pessoa, atrás da guarda C-04 que já existe e com a cadeia conferida por teste estático | As leituras de pessoa e do Awave com AN-09 ficam `alto` na T09 |
| D-13 | Concorrência (AN-05) com duas transações reais e ordem forçada: uma transação aberta por `comTransacao` que segura a trava da demanda (via `alterarDemanda` ou `registrarDecisao` com `t`) até o teste soltar | Prova a fila pela trava sem depender da sorte do agendador; o `lock_timeout` de 2 s limita a espera |
| D-14 | Limite total (CA-12.3, AN-07): 599 ou 600 linhas gravadas pelo migrator num terceiro DEC, e os envios em dois outros | O limite por DEC só olha o DEC do envio; três DEC bastam |
| D-15 | 422 sem `campos`, só `{ erro: 'nao_processavel', mensagem }`, com a mensagem da 03, seção 7 | AN-02 e CA-02.4: o caminho da chave a mais seria eco |
| D-16 | `lerAndamento` (regras.ts) é a única conversão de linha para `AndamentoVista`; a fila converte em `leituras-da-fila.ts` (servidor), e os componentes recebem só `AndamentoVista` já conferido | AN-12; `src/components/` só importa tipos dos módulos |

### G7. Nomes que várias tarefas usam

```ts
// src/db/schema/andamento.ts (T01)
export const FASES_ANDAMENTO = ['entendendo_o_pedido', 'planejando', 'construindo', 'testando', 'revisando_e_entregando', 'documentando'] as const;
export const STATUS_CONSTRUCAO = ['em_construcao', 'construido', 'cancelado'] as const;
export type FaseAndamento = (typeof FASES_ANDAMENTO)[number];
export type StatusConstrucao = (typeof STATUS_CONSTRUCAO)[number];
export const MAXIMO_DE_TAREFAS = 999;
export const andamentoConstrucao: PgTable; // id, demandaId, decId, fase, tarefasProntas, tarefasTotal, statusConstrucao, atorTokenPrefixo, gravadoEm

// src/modules/acesso/matriz.ts (T02): 'registrar_andamento' em ACOES; MATRIZ.registrar_andamento = SO_CONSTRUIR

// src/modules/limites.ts (T03)
export const LIMITE_ANDAMENTO: Readonly<{ porDec: { maximo: 60; mensagem: string }; total: { maximo: 600; mensagem: string } }>;
export const TRAVA_DO_LIMITE_DE_ANDAMENTO = 'limite:andamento:integracao:construir';
export function conferirLimiteDeAndamento(tx: Db, ator: Ator, decId: string, relogio: Relogio): Promise<void>;

// src/lib/rota.ts (T04)
export type OpRota<P, Q, C> = { /* … */ corpoInvalido?: { codigo: 'nao_processavel'; mensagem: string } };

// src/modules/andamento/schemas.ts (T04, T05)
export const RE_ID_DEC_ANDAMENTO = /^DEC-DEM-\d{8}-\d{4}-v\d{1,4}$/;
export const MENSAGENS_ANDAMENTO: Readonly<{ corpoInvalido: string; decSubstituido: string; statusFinal: string }>;
export const CORPO_INVALIDO_ANDAMENTO: { codigo: 'nao_processavel'; mensagem: string };
export const corpoAndamentoSchema: z.ZodType<CorpoAndamento>;
export type CorpoAndamento = { fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; status: StatusConstrucao };
export const andamentoLidoSchema: z.ZodType<LinhaDeAndamentoValida>; // T05
export type AndamentoVista = { decId: string; fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; statusConstrucao: StatusConstrucao; atualizadoEm: Date }; // T05
export type AndamentoDaIntegracao = { fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; atualizadoEm: Date }; // T05
export function paraIntegracao(a: AndamentoVista | null): AndamentoDaIntegracao | null; // T05, chave a chave

// src/modules/andamento/regras.ts (T05)
export type EstadoDoAndamento = Pick<AndamentoVista, 'decId' | 'fase' | 'tarefasProntas' | 'tarefasTotal' | 'statusConstrucao'>;
export type MarcoDoEvento = { fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; statusConstrucao: StatusConstrucao };
export function lerAndamento(linha: unknown): AndamentoVista | null; // nunca lança
export function mesmoEstado(gravado: EstadoDoAndamento | null, novo: EstadoDoAndamento): boolean; // cinco campos
export function mudancaDeMarco(gravado: EstadoDoAndamento | null, novo: EstadoDoAndamento): boolean; // fase, statusConstrucao ou decId
export function marcoDoEvento(e: EstadoDoAndamento): MarcoDoEvento; // quatro chaves, chave a chave
export type DecisaoDoAndamento = { tipo: 'recusa' } | { tipo: 'grava'; para: Status | null };
export function decidirPorStatus(atual: { status: Status; tipo: Tipo }, sc: StatusConstrucao): DecisaoDoAndamento;

// src/modules/demandas/transicoes.ts (T05)
export const AUTOMATICAS_DO_CONSTRUIR: Readonly<Partial<Record<StatusConstrucao, { de: Status; para: Status }>>>;
export const CONTRADIZ_STATUS_FINAL: Readonly<Record<'entregue' | 'encerrada', readonly StatusConstrucao[]>>;
export function transicaoDoConstruir(atual: { status: Status; tipo: Tipo }, sc: StatusConstrucao): Status | null;
export function mudarStatusPeloConstruir(t: Transacao, deps: Pick<Deps, 'relogio'>, ator: Ator, atual: { id: string; status: Status; tipo: Tipo }, sc: StatusConstrucao): Promise<Status | null>;

// src/modules/historico/registrar.ts (T05): AcaoEvento ganha 'andamento_registrado'

// src/modules/andamento/consultas.ts (T06) — só leitura
export type LinhaDeAndamento = { demandaId: string; decId: string; fase: string; tarefasProntas: number; tarefasTotal: number; statusConstrucao: string; gravadoEm: Date };
export function ultimoAndamento(db: Db, demandaId: string): Promise<LinhaDeAndamento | null>;
export function andamentosDasDemandas(db: Db, ids: readonly string[]): Promise<Map<string, LinhaDeAndamento>>;
export function subconsultaDoUltimoAndamento(db: Db, demandaId: string); // .as('ultimo_andamento'), mesmas colunas

// src/modules/andamento/registrar.ts (T07)
export type DepsAndamento = Pick<Deps, 'pool' | 'relogio'>;
export function registrarAndamento(deps: DepsAndamento, ator: Ator, decId: string, corpo: CorpoAndamento): Promise<void>;

// src/app/api/pedidos-construcao/[decId]/andamento/route.ts (T08): export const POST

// src/modules/demandas/consultas.ts (T09)
// DemandaVista ganha `andamento: AndamentoVista | null`; DemandaVistaDaIntegracao ganha `andamento: AndamentoDaIntegracao | null`
// DemandaVistaMinima = Omit<DemandaVista, … | 'andamento'> & { … } (sem a chave)

// test/andamento.ts (T07): ajudantes de teste
export const CORPO_CONSTRUINDO: CorpoAndamento; // { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' }
export function corpo(c?: Partial<CorpoAndamento>): CorpoAndamento;
export function andamentosDa(b: BancoDeTeste, demandaId: string): Promise<Array<Record<string, unknown>>>;
export function eventosDo(b: BancoDeTeste, entidadeId: string, acao: string): Promise<LinhaEvento[]>;
export function porStatus(b: BancoDeTeste, demandaId: string, status: Status, tipo?: Tipo): Promise<void>; // pelo migrator
export function inserirAndamento(b: BancoDeTeste, a: { demandaId: string; decId: string; fase?: string; prontas?: number; total?: number; status?: string; gravadoEm: Date }): Promise<void>;

// src/components/rotulos.ts e dados-do-andamento.ts (T11)
export const ROTULO_FASE: Readonly<Record<FaseAndamento, string>>;
export const ROTULO_SITUACAO_CONSTRUCAO: Readonly<Record<StatusConstrucao, string>>;
export const TEXTOS_ANDAMENTO: { /* 03, seção 8 */ };
export type SeloDeFase = { visivel: string; leitor: string; cor: 'marinho' | 'positivo' | 'tinta-media' };
export function seloDeFase(status: Status, a: AndamentoVista | null): SeloDeFase | null;
export type SecaoDoAndamento = { /* T11 */ };
export function secaoDoAndamento(a: AndamentoVista | null, pacotes: readonly Pick<PacoteResumo, 'id' | 'substituido'>[], formatar: (d: Date) => string): SecaoDoAndamento | null;

// src/app/(painel)/demandas/leituras-da-fila.ts (T12)
export function andamentosDaPagina(db: Db, ids: readonly string[]): Promise<Map<string, AndamentoVista> | null>; // null = falhou

// src/components/dados-das-etapas.ts (T13): DadosDasEtapas.andamento?: Pick<AndamentoVista, 'decId' | 'statusConstrucao'> | null
```

### G8. Inventário do AN-05: quem escreve o que o registro lê, e a trava de cada um

O registro lê: `evento` (`pedido_gerado`), `pacote_decisao.demanda_id`, a linha de `demanda` (`status`, `tipo`),
`andamento_construcao` (o último e as contagens) e o aprovado vigente (`pacote_decisao` + `decisao`).

| # | Caminho | Função | Escreve o que o registro lê | Trava (ordem) | Conferido na |
|---|---|---|---|---|---|
| 1 | `src/modules/andamento/registrar.ts` | `registrarAndamento` | `andamento_construcao`, `demanda.status` (por #2), `evento` | pedido → demanda → limite | T07 |
| 2 | `src/modules/demandas/transicoes.ts` | `mudarStatusPeloConstruir` (nova) | `demanda.status`, `atualizada_em`, `status_alterado` | nenhuma própria: roda sob a da demanda já tomada por #1 (ou pelo seed) | T05, T07 |
| 3 | `src/modules/demandas/servico.ts` | `alterarDemanda` | `demanda.status`, `demanda.tipo` | demanda | T07 (AN-05 b, d) |
| 4 | `src/modules/demandas/transicoes.ts` | `mudarStatusPeloSistema` | `demanda.status` | demanda | sem mudança |
| 5 | `src/modules/pacotes-decisao/decidir.ts` | `registrarDecisao` | `decisao` (muda o vigente), `pacote_decisao_substituido` | demanda | T07 (AN-05 c) |
| 6 | `src/modules/pacotes-decisao/criar.ts` | `criarPacoteDecisao` | `pacote_decisao` (DEC novo, pendente) | demanda | sem mudança |
| 7 | `src/modules/demandas/confirmar.ts` | `confirmarDemanda` | `demanda_confirmada` | demanda | sem mudança |
| 8 | `src/modules/pedido-construcao/gerar.ts` | `gerarPedido` | `pedido_gerado` | demanda (por `conferirEMontarPedido`) | sem mudança |
| 9 | `src/modules/pedido-construcao/entregar.ts` | `entregarPedido` | `pedido_entregue` | pedido → demanda | sem mudança |
| 10 | `src/modules/pedido-construcao/receber.ts` | `receberPedido` | `pedido_recebido` | pedido | sem mudança |
| 11 | `scripts/seed-ficticio.ts` | `criarDadosDoAndamento` (nova) | tudo acima, numa transação do seed | trava do seed → demanda | T10 |

Nenhum caminho toma a trava da demanda antes da do pedido, nem a do limite antes das outras duas; pessoa, agente e Awave
nunca tomam `limite:andamento:integracao:construir` (AN-08 c).

### G9. Inventário do AN-09: rotas cuja ação tem agente ou integração na matriz, e a vista de cada uma

A fonte é a varredura da T09 (que percorre `MATRIZ` e os `route.ts`); esta tabela é conferida contra ela na revisão.

| Rota | Método | Ação | Agente recebe | Integração recebe | Andamento sai? |
|---|---|---|---|---|---|
| `/api/demandas` | POST | `criar_demanda` | 201: `vistaDaDemandaPara(agente)` = `vistaMinimaDaDemanda` | `awave`: `obterDemandaDaIntegracao` (sete chaves) | agente não; Awave quatro chaves (`null` no 201) |
| `/api/demandas` | GET | `listar_demandas` | `listarDemandasPara` → `resumoDe` | 403 | não (CA-11.3) |
| `/api/demandas/[id]` | GET | `ler_demanda` | `lerDemandaPara` → `vistaMinimaDaDemanda` | `awave`: `obterDemandaDaIntegracao` | agente não; Awave quatro; pessoa seis |
| `/api/demandas/[id]/especificacoes`, `/pareceres-risco`, `/pacotes-decisao` | GET e POST | leituras e criação de ESP, RSK, DEC | vistas mínimas de ESP, RSK e DEC (sem diff) | 403 | não |
| `/api/especificacoes/[espId]`, `/api/pareceres-risco/[rskId]`, `/api/pacotes-decisao/[decId]`, `/api/pacotes-decisao` | GET | `ler_especificacao`, `ler_parecer_risco`, `ler_pacote_decisao` | vistas mínimas (sem diff) | 403 | não |
| `/api/pedidos-construcao/pendentes` | GET | `listar_pedidos_pendentes` | 403 | `construir`: `{ itens: [{ decId }] }` | não |
| `/api/pedidos-construcao/[decId]/entrega` | POST | `entregar_pedido` | 403 | `construir`: o JSON da geração | não |
| `/api/pedidos-construcao/[decId]/recebimento` | POST | `confirmar_recebimento_pedido` | 403 | 204 sem corpo | não |
| `/api/pedidos-construcao/[decId]/andamento` | POST | `registrar_andamento` | 403 | 204 sem corpo | não (escrita) |
| entrada do provedor falso (`montarEntrada`, worker) | — | — | sem diff | — | não |
| painel `/demandas` e `/demandas/[id]` | — | `listar_demandas`, `ler_demanda` | — (só pessoa, C-04) | — | pessoa |

### G10. Cobertura (RF de 01 e AN de 04)

| Item | Tarefas |
|---|---|
| RF-01 | T02, T08 |
| RF-02 | T04, T08 |
| RF-03 | T07, T08 |
| RF-04 | T01, T05, T06, T07 |
| RF-05 | T05, T07, T08 |
| RF-06 | T05, T07, T11 |
| RF-07 | T13 |
| RF-08 | T11, T12 |
| RF-09 | T09 (dado), T11, T13 |
| RF-10 | T09, T14 |
| RF-11 | T09 |
| RF-12 | T03, T08 |
| RF-13 | T14 (versão); documentação na `10-documentacao` (G2) |
| AN-01 | T02 (a, b, d, e, f), T07 (`autorizar` antes da transação), T08 (c, d pelas rotas) |
| AN-02 | T04 (esquema e `rota()`), T08 (422 idêntico e sem consulta, pela rota) |
| AN-03 | T07 (serviço), T08 (três 404 byte a byte) |
| AN-04 | T05 (tabela 9 × 3 × tipo, transições), T07 (CA-05.1 a CA-05.11 com banco) |
| AN-05 | T07 |
| AN-06 | T07 (serviço e teste estático), T09 (leitura do Awave, D-06) |
| AN-07 | T03 (função), T08 (CA-12 pela rota) |
| AN-08 | T07 |
| AN-09 | T09 |
| AN-10 | T01 |
| AN-11 | T05 (forma do evento), T07 (CA-06), T08 (sentinelas e log) |
| AN-12 | T05 (`lerAndamento`), T11 (rótulos e `textoDoEvento`), T12 e T13 (tela, CV-02, axe) |
| AN-13 | G4 em toda revisão; T02, T03, T04, T05, T09 (diffs parciais) |
| AN-14 | `10-documentacao`; a guarda `test/estatico/docs-sem-token.test.ts` (D-20 do 0016) roda em toda tarefa |
| AN-15 | T10 (seed fictício, sem token, com os dois DEC da V-02); `09-entrega` (V-02) |

---

## Fase 1 — Fundação (antes da rota e do serviço)

### T01. Tabela `andamento_construcao`, migrations 0008 e 0009 e privilégio só de inclusão (AN-10)

**Engenheiro:** `engenheiro-dados-bd` · **Risco:** alto (migration num banco no ar) · **Cobre:** RF-04 (forma no banco),
RNF-05, AN-10, ADR-30, CA-04.6 (parte do CHECK)

**Arquivos:**
- Criar: `src/db/schema/andamento.ts`, `drizzle/0008_<gerado>.sql` e `drizzle/meta/0008_snapshot.json` (por
  `pnpm db:generate`, sem editar), `drizzle/0009_rls_andamento_construcao.sql` e `drizzle/meta/0009_snapshot.json` (por
  `pnpm drizzle-kit generate --custom --name rls_andamento_construcao`; só o `.sql` é escrito à mão),
  `src/db/schema/andamento.test.ts`, `test/estatico/migration-0008.test.ts`
- Modificar: `src/db/schema/index.ts` (reexporta `./andamento`), `src/db/privilegios.ts` (uma linha),
  `src/db/imutabilidade.test.ts` (G5), `test/estatico/migration-0007.test.ts` (G5),
  `test/estatico/piso-de-assercoes.test.ts` (`src/db/schema/andamento.test.ts`)
- Não muda: `drizzle/0000` a `0007` e os snapshots deles; `src/db/schema/demandas.ts`, `historico.ts`

**Interfaces produzidas:** `FASES_ANDAMENTO`, `STATUS_CONSTRUCAO`, `FaseAndamento`, `StatusConstrucao`,
`MAXIMO_DE_TAREFAS`, `andamentoConstrucao` (G7).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/db/schema/andamento.test.ts — AN-10, RNF-05, ADR-30, CA-04.6: a forma do andamento vale no banco, e o papel do
// app só lê e inclui. Postgres real; dados fictícios; prefixo fictício `ficticio`.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { FASES_ANDAMENTO, STATUS_CONSTRUCAO } from './andamento';

let b: BancoDeTeste;
const DEM = 'DEM-20261112-0701';
const DEC = `DEC-${DEM}-v1`;
const QUANDO = '2026-11-12T12:00:00Z';
const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);

beforeAll(async () => {
  b = await novoBanco();
  await m(`insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $2, $2)`, [DEM, QUANDO]);
  await m(`insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, escopo_exclui, duvidas_em_aberto, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'x', '[]', '[]', '[]', 'pessoa', 'u-ficticio', false, $3)`, [`ESP-${DEM}-v1`, DEM, QUANDO]);
  await m(`insert into parecer_risco (id, demanda_id, versao, resumo, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'Resumo ficticio', 'baixo', 'baixo', 'baixo', 'pessoa', 'u-ficticio', false, $3)`, [`RSK-${DEM}-v1`, DEM, QUANDO]);
  await m(
    `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
     values ($1, $2, 1, $3, 1, $4, 1, 'melhoria', 'Demanda ficticia', 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"A"}', '{"descricao":"B"}', 'cto', 'pessoa', 'u-ficticio', false, $5)`,
    [DEC, DEM, `ESP-${DEM}-v1`, `RSK-${DEM}-v1`, QUANDO],
  );
});
afterAll(async () => {
  await b.fechar();
});

type Linha = { demanda: string; dec: string; fase: string; prontas: unknown; total: unknown; status: string; prefixo: string };
const VALIDA: Linha = { demanda: DEM, dec: DEC, fase: 'construindo', prontas: 9, total: 17, status: 'em_construcao', prefixo: 'ficticio' };
const inserir = (l: Partial<Linha> = {}) => {
  const x = { ...VALIDA, ...l };
  return b.poolApp.query(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [x.demanda, x.dec, x.fase, x.prontas, x.total, x.status, x.prefixo, QUANDO],
  );
};
const viola = (constraint: string) => expect.objectContaining({ code: '23514', constraint });

describe('andamento_construcao: a forma no banco (AN-10)', () => {
  it('o papel do app inclui a linha válida, e as bordas 0/0 e 999/999', async () => {
    await expect(inserir()).resolves.toBeDefined();
    await expect(inserir({ prontas: 0, total: 0 })).resolves.toBeDefined();
    await expect(inserir({ prontas: 999, total: 999 })).resolves.toBeDefined();
  });
  it.each([
    [{ fase: 'Construindo' }, 'andamento_construcao_fase_check'],
    [{ fase: '' }, 'andamento_construcao_fase_check'],
    [{ status: 'entregue' }, 'andamento_construcao_status_construcao_check'],
    [{ prontas: 10, total: 9 }, 'andamento_construcao_tarefas_check'],
    [{ prontas: -1 }, 'andamento_construcao_tarefas_check'],
    [{ prontas: 0, total: 1000 }, 'andamento_construcao_tarefas_check'],
    [{ prefixo: 'curto' }, 'andamento_construcao_ator_token_prefixo_check'],
    [{ prefixo: 'abc!defg' }, 'andamento_construcao_ator_token_prefixo_check'],
  ] as const)('CHECK recusa %o', async (l, nome) => {
    await expect(inserir(l as Partial<Linha>)).rejects.toEqual(viola(nome));
  });
  it('o CHECK do dec_id recusa id fora do formato (conferido pelo migrator, sem FK no caminho)', async () => {
    const { rows } = await m(`select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'andamento_construcao_dec_id_check'`);
    expect(rows[0]?.d).toContain('^DEC-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$');
  });
  it('FKs para demanda e pacote_decisao, sem ON DELETE CASCADE (23503 com id que não existe)', async () => {
    await expect(inserir({ demanda: 'DEM-20261112-9999' })).rejects.toMatchObject({ code: '23503' });
    await expect(inserir({ dec: 'DEC-DEM-20261112-9999-v1' })).rejects.toMatchObject({ code: '23503' });
    const { rows } = await m(`select confdeltype from pg_constraint where conrelid = 'andamento_construcao'::regclass and contype = 'f'`);
    expect(rows.map((r) => r.confdeltype)).toEqual(['a', 'a']);
  });
  it('fonte única: os CHECKs de fase e de status listam exatamente FASES_ANDAMENTO e STATUS_CONSTRUCAO', async () => {
    const def = async (nome: string) => (await m(`select pg_get_constraintdef(oid) as d from pg_constraint where conname = $1`, [nome])).rows[0]!.d as string;
    const valores = (d: string) => [...d.matchAll(/'([a-z_]+)'::text/g)].map((x) => x[1]).sort();
    expect(valores(await def('andamento_construcao_fase_check'))).toEqual([...FASES_ANDAMENTO].sort());
    expect(valores(await def('andamento_construcao_status_construcao_check'))).toEqual([...STATUS_CONSTRUCAO].sort());
  });
  it('índices (demanda_id, id), (dec_id, gravado_em) e (gravado_em)', async () => {
    const { rows } = await m(`select indexname, indexdef from pg_indexes where tablename = 'andamento_construcao' order by 1`);
    const def = Object.fromEntries(rows.map((r) => [r.indexname, r.indexdef]));
    expect(def.andamento_construcao_demanda_id_idx).toMatch(/\(demanda_id, id\)/);
    expect(def.andamento_construcao_dec_gravado_idx).toMatch(/\(dec_id, gravado_em\)/);
    expect(def.andamento_construcao_gravado_idx).toMatch(/\(gravado_em\)/);
  });
});

describe('andamento_construcao: só de inclusão para o app (AN-10, C-34)', () => {
  const retrato = async () => (await m(`select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb)::text as f from andamento_construcao t`)).rows[0]!.f as string;
  it.each([
    ['update andamento_construcao set fase = $1', ['testando']],
    ['update andamento_construcao set tarefas_prontas = 0', []],
    ['update andamento_construcao set ator_token_prefixo = $1', ['outro123']],
    ['delete from andamento_construcao', []],
    ['truncate andamento_construcao', []],
  ])('"%s" recusado (42501) com linhas gravadas, e nada muda', async (sql, p) => {
    await inserir();
    const antes = await retrato();
    await expect(b.poolApp.query(sql, p)).rejects.toMatchObject({ code: '42501' });
    expect(await retrato()).toBe(antes);
  });
  it('o app não usa a sequência da identidade (nextval recusado), e o INSERT não precisa dela', async () => {
    await expect(b.poolApp.query(`select nextval('andamento_construcao_id_seq')`)).rejects.toMatchObject({ code: '42501' });
  });
  it('nada novo em demanda nem em evento: as colunas são as de 0ac099a', async () => {
    const { rows } = await m(`select table_name, count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name in ('demanda', 'evento') group by 1 order by 1`);
    // Os números de 0ac099a: conte uma vez com Read em src/db/schema/demandas.ts e historico.ts e escreva aqui.
    expect(rows).toEqual([
      { table_name: 'demanda', n: expect.any(Number) },
      { table_name: 'evento', n: 11 },
    ]);
  });
});
```

Troque `expect.any(Number)` da `demanda` pelo número de colunas de `demanda` em `0ac099a` (conte no esquema) antes de
ver o teste falhar; deixar `expect.any` é Important na revisão.

```ts
// test/estatico/migration-0008.test.ts — RNF-05 e AN-10: duas migrations novas, só aditivas; a custom só com o GRANT.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const diario = JSON.parse(readFileSync(`${raiz}drizzle/meta/_journal.json`, 'utf8')) as { entries: { idx: number; tag: string }[] };
const sqlDa = (idx: number) => readFileSync(`${raiz}drizzle/${diario.entries.find((e) => e.idx === idx)!.tag}.sql`, 'utf8');
const comandos = (sql: string) =>
  sql
    .split('--> statement-breakpoint')
    .map((s) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim())
    .filter(Boolean);

it('a 0008 e a 0009 são as duas últimas, e só elas são novas; a 0009 é a custom de nome rls_andamento_construcao', () => {
  expect(diario.entries.map((e) => e.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(diario.entries[9]!.tag).toBe('0009_rls_andamento_construcao');
});

it('a 0008 só cria a tabela, os CHECKs, as FKs sem cascata e os índices', () => {
  const sql = sqlDa(8);
  for (const proibido of [/\bupdate\s+"/i, /\bdelete\s+from\b/i, /\bdrop\b/i, /\brename\b/i, /\bset\s+data\s+type\b/i, /\btruncate\b/i, /\bgrant\b/i, /on delete cascade/i, /alter table "(demanda|evento)"/i])
    expect(sql, String(proibido)).not.toMatch(proibido);
  expect(sql).toContain('CREATE TABLE "andamento_construcao"');
  for (const nome of [
    'andamento_construcao_fase_check',
    'andamento_construcao_status_construcao_check',
    'andamento_construcao_tarefas_check',
    'andamento_construcao_dec_id_check',
    'andamento_construcao_ator_token_prefixo_check',
    'andamento_construcao_demanda_id_idx',
    'andamento_construcao_dec_gravado_idx',
    'andamento_construcao_gravado_idx',
  ])
    expect(sql).toContain(nome);
});

it('a 0009 é só o GRANT SELECT, INSERT na tabela nova: sem sequência, UPDATE nem DELETE', () => {
  expect(comandos(sqlDa(9))).toEqual(['GRANT SELECT, INSERT ON "andamento_construcao" TO orquestrador_app;']);
});
```

E as mudanças da G5: em `src/db/imutabilidade.test.ts`, os três casos novos no `it.each` da linha 32; em
`test/estatico/migration-0007.test.ts`, as duas linhas abaixo no lugar do `at(-1)` e da lista fixa:

```ts
it('a 0007 está no índice 7 do diário', () => {
  expect(diario.entries.find((e) => e.idx === 7)?.tag).toBe('0007_greedy_wendigo');
});
// e, no segundo it: const tag = diario.entries.find((e) => e.idx === 7)!.tag;
```

- [ ] **Passo 2: ver falhar**

Rodar: `pnpm test src/db/schema/andamento.test.ts test/estatico/migration-0008.test.ts src/db/imutabilidade.test.ts`
Esperado: FAIL (`relation "andamento_construcao" does not exist`; diário só até 7; módulo `./andamento` inexistente).

- [ ] **Passo 3: o esquema**

```ts
// src/db/schema/andamento.ts — Andamento do Pedido de Construção informado pelo /construir (0.4.0, ADR-30): uma linha
// por gravação aceita, só de inclusão para o papel do app (AN-10). O último andamento da demanda é a linha de maior
// `id` (o relógio injetado pode empatar). `gravado_em` sem padrão no banco: vem do Relogio (G3.4). As listas abaixo são
// a fonte do Zod; os CHECKs as repetem como literal (sem sql.raw) e o teste confere as duas.
import { sql } from 'drizzle-orm';
import { bigint, check, index, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { momento } from './comum';
import { pacoteDecisao } from './decisao';
import { demanda } from './demandas';

export const FASES_ANDAMENTO = ['entendendo_o_pedido', 'planejando', 'construindo', 'testando', 'revisando_e_entregando', 'documentando'] as const;
export const STATUS_CONSTRUCAO = ['em_construcao', 'construido', 'cancelado'] as const;
export type FaseAndamento = (typeof FASES_ANDAMENTO)[number];
export type StatusConstrucao = (typeof STATUS_CONSTRUCAO)[number];
export const MAXIMO_DE_TAREFAS = 999;

export const andamentoConstrucao = pgTable(
  'andamento_construcao',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    // A demanda do DEC conferida no registro (AN-03), nunca do corpo nem da URL.
    demandaId: text()
      .notNull()
      .references(() => demanda.id),
    decId: text()
      .notNull()
      .references(() => pacoteDecisao.id),
    fase: text().$type<FaseAndamento>().notNull(),
    tarefasProntas: integer().notNull(),
    tarefasTotal: integer().notNull(),
    statusConstrucao: text().$type<StatusConstrucao>().notNull(),
    // Quem gravou cada número, também sem evento (A2): revogação pelo prefixo. Nunca sai em vista, API ou tela.
    atorTokenPrefixo: text().notNull(),
    gravadoEm: momento().notNull(),
  },
  (t) => [
    check('andamento_construcao_fase_check', sql`"fase" in ('entendendo_o_pedido', 'planejando', 'construindo', 'testando', 'revisando_e_entregando', 'documentando')`),
    check('andamento_construcao_status_construcao_check', sql`"status_construcao" in ('em_construcao', 'construido', 'cancelado')`),
    check('andamento_construcao_tarefas_check', sql`"tarefas_prontas" >= 0 and "tarefas_prontas" <= "tarefas_total" and "tarefas_total" <= 999`),
    check('andamento_construcao_dec_id_check', sql`"dec_id" ~ '^DEC-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$'`),
    check('andamento_construcao_ator_token_prefixo_check', sql`"ator_token_prefixo" ~ '^[A-Za-z0-9_-]{8}$'`),
    index('andamento_construcao_demanda_id_idx').on(t.demandaId, t.id),
    index('andamento_construcao_dec_gravado_idx').on(t.decId, t.gravadoEm),
    index('andamento_construcao_gravado_idx').on(t.gravadoEm),
  ],
);
```

`src/db/schema/index.ts`: acrescentar `export * from './andamento';` no fim. `src/db/privilegios.ts`: depois da linha
de `evento`, `{ tabela: 'andamento_construcao', privilegios: ['SELECT', 'INSERT'] },` com o comentário "0.4.0 (AN-10):
só de inclusão; nenhuma coluna em `colunasUpdate`".

- [ ] **Passo 4: gerar as migrations**

Rodar: `pnpm db:generate` → cria `drizzle/0008_<gerado>.sql`; não editar.
Rodar: `pnpm drizzle-kit generate --custom --name rls_andamento_construcao` → cria a `0009` vazia; escrever:

```sql
-- 0.4.0 (AN-10, ADR-30): o papel da aplicação só lê e inclui o andamento do Pedido de Construção. Sem UPDATE, DELETE
-- nem GRANT de sequência (a identidade não pede, como em `evento`). A fonte da regra é src/db/privilegios.ts, conferida
-- por src/db/privilegios.test.ts.
GRANT SELECT, INSERT ON "andamento_construcao" TO orquestrador_app;
```

- [ ] **Passo 5: ver passar e conferir o resto**

Rodar: `pnpm test` → tudo verde (inclusive `privilegios.test.ts`, que passa a exigir a regra nova, e
`migration-0007-dados.test.ts`). `pnpm lint` e `pnpm typecheck` limpos. Acrescentar ao `PISO` a linha
`'src/db/schema/andamento.test.ts': <linhas com expect(>`.

Em `## Decisões tomadas` da entrega: a volta das duas migrations é a restauração do backup (caminho B, 02 seção 8); o
SQL equivalente, só para registro, é `REVOKE SELECT, INSERT ON "andamento_construcao" FROM orquestrador_app; DROP TABLE
"andamento_construcao";` pelo migrator, e não é usado porque a saúde da 0.3.1 fica em 503 com o diário da 0.4.0.

### T02. Ação `registrar_andamento` só do `construir` (AN-01)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (autorização) · **Cobre:** RF-01, CA-01.3, CA-01.6, AN-01 (a, b,
d na matriz, e, f), AN-13 (diff de `matriz.ts`)

**Arquivos:**
- Modificar: `src/modules/acesso/matriz.ts`; testes da G5 (`matriz.test.ts`, `matriz-integracoes.test.ts`,
  `matriz-integracoes-qa.test.ts`); `test/estatico/piso-de-assercoes.test.ts`
- Criar: `src/modules/acesso/matriz-andamento.test.ts`, `test/estatico/andamento.test.ts`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/acesso/matriz-andamento.test.ts — AN-01 e RF-01 (0.4.0): registrar_andamento só do construir, e o
// construir não ganha outra ação. Testes unitários, sem banco.
import { describe, expect, it } from 'vitest';
import { AGENTES, INTEGRACOES, PAPEIS, type Ator, type Integracao } from './ator';
import { ACOES, MATRIZ, atoresProibidos, autorizar, type Acao } from './matriz';

const permite = (ator: Ator, acao: Acao) => {
  try {
    autorizar(ator, acao);
    return true;
  } catch {
    return false;
  }
};
const integracao = (i: string): Ator => ({ tipo: 'integracao', integracao: i as Integracao, prefixoToken: 'ficticio' });
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });

describe('AN-01: registrar_andamento', () => {
  it('(a) os pares (ação, integração) montados de MATRIZ são exatamente os seis', () => {
    const pares = new Set(ACOES.flatMap((a) => MATRIZ[a].integracoes.map((i) => `${a}:${i}`)));
    expect(pares).toEqual(
      new Set([
        'criar_demanda:awave',
        'ler_demanda:awave',
        'listar_pedidos_pendentes:construir',
        'entregar_pedido:construir',
        'confirmar_recebimento_pedido:construir',
        'registrar_andamento:construir',
      ]),
    );
  });
  it('(b) o construir tem exatamente quatro ações e o awave exatamente duas', () => {
    const de = (i: Integracao) => ACOES.filter((a) => permite(integracao(i), a)).sort();
    expect(de('construir')).toEqual(['confirmar_recebimento_pedido', 'entregar_pedido', 'listar_pedidos_pendentes', 'registrar_andamento']);
    expect(de('awave')).toEqual(['criar_demanda', 'ler_demanda']);
  });
  it('a linha é SO_CONSTRUIR: sem pessoa, sem agente, congelada', () => {
    expect(MATRIZ.registrar_andamento).toEqual({ pessoa: null, agentes: [], integracoes: ['construir'] });
    expect(Object.isFrozen(MATRIZ.registrar_andamento.integracoes)).toBe(true);
  });
  it('(d) awave, os quatro agentes (com e sem token), cto, administradora e sistema são negados', () => {
    expect(() => autorizar(integracao('awave'), 'registrar_andamento')).toThrow(SEM_PERMISSAO);
    for (const agente of AGENTES)
      for (const prefixoToken of ['ficticio', null]) expect(() => autorizar({ tipo: 'agente', agente, prefixoToken }, 'registrar_andamento')).toThrow(SEM_PERMISSAO);
    for (const papel of PAPEIS) expect(() => autorizar({ tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel }, 'registrar_andamento')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar({ tipo: 'sistema' }, 'registrar_andamento')).toThrow(SEM_PERMISSAO);
    expect(atoresProibidos('registrar_andamento')).toEqual([
      ...AGENTES.map((agente) => ({ tipo: 'agente', agente })),
      ...PAPEIS.map((papel) => ({ tipo: 'pessoa', papel })),
      { tipo: 'integracao', integracao: 'awave' },
    ]);
  });
  it('(e) integração fora da lista (jarvis, Construir, vazio) é negada; o construir passa', () => {
    for (const i of ['jarvis', 'Construir', 'construir ', '', '__proto__']) expect(permite(integracao(i), 'registrar_andamento'), i).toBe(false);
    expect(permite(integracao('construir'), 'registrar_andamento')).toBe(true);
    expect(INTEGRACOES).toEqual(['awave', 'construir']);
  });
});
```

```ts
// test/estatico/andamento.test.ts — guardas estáticas do módulo de andamento (D-04).
// AN-01 (f): a ação `registrar_andamento` só aparece na matriz, na rota nova e no serviço (fora de teste); nenhum
// arquivo 'use server' nem job a cita. As tarefas seguintes acrescentam aqui o AN-06 (T07) e a cadeia de quem importa
// andamento/consultas.ts (T06, T12). Cada regra tem um caso plantado que a reprova.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
export const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

export const CITAM_A_ACAO: readonly string[] = [
  'src/modules/acesso/matriz.ts',
  'src/app/api/pedidos-construcao/[decId]/andamento/route.ts',
  'src/modules/andamento/registrar.ts',
];

export function quemCita(arquivos: ReadonlyArray<readonly [string, string]>): string[] {
  return arquivos.filter(([, f]) => f.includes('registrar_andamento')).map(([a]) => a);
}
const ehServerAction = (f: string) => /^\s*['"]use server['"]/m.test(f);

describe('AN-01 (f): onde a ação registrar_andamento aparece', () => {
  it('a varredura enxerga o código que roda (falha se o glob quebrar)', () => {
    expect(codigoQueRoda).toEqual(expect.arrayContaining(['src/modules/acesso/matriz.ts', 'src/lib/rota.ts']));
  });
  it('fora de teste, só a matriz, a rota nova e o serviço citam a ação', () => {
    const citam = quemCita(codigoQueRoda.map((a) => [a, ler(a)] as const));
    expect(citam.filter((a) => !CITAM_A_ACAO.includes(a))).toEqual([]);
    expect(citam).toContain('src/modules/acesso/matriz.ts');
  });
  it("nenhum arquivo 'use server', job ou worker cita a ação", () => {
    for (const a of codigoQueRoda) {
      const f = ler(a);
      if (!f.includes('registrar_andamento')) continue;
      expect(ehServerAction(f), a).toBe(false);
      expect(/^src\/(jobs|worker)\//.test(a), a).toBe(false);
    }
  });
  it('as regras pegam o caso plantado', () => {
    expect(quemCita([['src/app/x/acoes.ts', "'use server';\nautorizar(p, 'registrar_andamento');"]])).toEqual(['src/app/x/acoes.ts']);
    expect(ehServerAction("'use server';\nexport async function f() {}")).toBe(true);
    expect(ehServerAction("export const x = 'use server';")).toBe(false);
  });
});
```

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/acesso test/estatico/andamento.test.ts` → FAIL
  (`MATRIZ.registrar_andamento` indefinido; pares com cinco).

- [ ] **Passo 3: a matriz**

Em `src/modules/acesso/matriz.ts`, só duas linhas de código (AN-13):

```ts
  'confirmar_recebimento_pedido',
  // 0.4.0 (RF-01, AN-01): o andamento do Pedido de Construção, só pelo /construir.
  'registrar_andamento',
] as const;
// …
  confirmar_recebimento_pedido: SO_CONSTRUIR,
  registrar_andamento: SO_CONSTRUIR,
});
```

e o comentário de `Linha` passa a dizer "Só seis pares abrem (RF-03 da 0.3.0 e RF-01 da 0.4.0)". Depois, as mudanças
da G5 nos três testes da matriz, e só elas.

- [ ] **Passo 4: ver passar** — `pnpm test` verde (o `test/matriz-rotas.test.ts` ganha o verificador sintético da ação
  sozinho); `pnpm lint`, `pnpm typecheck` limpos. `PISO` ganha `src/modules/acesso/matriz-andamento.test.ts` e
  `test/estatico/andamento.test.ts`. Na entrega, o `git diff 0ac099a -- src/modules/acesso/matriz.ts` e a contagem de
  `expect(` antes e depois dos três testes da G5 (nenhum arquivo com menos).

### T03. Limite de gravações de andamento: 60 por DEC e 600 no total por hora (AN-07)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (controle de abuso de um token de escrita) · **Cobre:** RF-12 (na
função), RNF-02, AN-07, AN-08 (c), ADR-31, CA-12.6 · **Depende de:** T01

**Arquivos:**
- Modificar: `src/modules/limites.ts` (só acréscimos, G4); `test/estatico/piso-de-assercoes.test.ts`
- Criar: `src/modules/limites-andamento.test.ts`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/limites-andamento.test.ts — AN-07 e ADR-31: o limite do andamento conta só o construir, por DEC (60) e no
// total (600), na janela móvel de 60 min pelo Relogio, sob a trava consultiva própria. Postgres real, relógio fixo, DEC
// pelo caminho real (preparadorDePedidos), linhas antigas pelo migrator. Dados fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { criarDepsDeTeste } from '../../test/deps';
import { atorDeIntegracao } from '../../test/integracoes';
import { preparadorDePedidos } from '../../test/pedidos-construcao';
import { comTransacao } from '../db/transacao';
import type { Deps } from '../lib/deps';
import { relogioFixo } from '../lib/relogio';
import type { Ator } from './acesso/ator';
import { conferirLimiteDeAndamento, LIMITE_ANDAMENTO, LIMITE_POR_HORA, TRAVA_DO_LIMITE_DE_ANDAMENTO } from './limites';

const relogio = relogioFixo('2026-11-12T12:00:00Z');
let b: BancoDeTeste;
let deps: Deps;
const p = preparadorDePedidos({ deps: () => deps, rotulo: 'limite-andamento', entregar: async () => new Response(null, { status: 500 }) });
const dec: Record<'x' | 'y' | 'z', { demandaId: string; decId: string }> = {} as never;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  for (const k of ['x', 'y', 'z'] as const) dec[k] = await p.prepararDec({});
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

// `n` linhas do DEC, gravadas `minutosAtras` antes do relógio (pelo migrator: o app não tem como escolher a data).
async function linhas(k: 'x' | 'y' | 'z', n: number, minutosAtras = 1) {
  const quando = new Date(relogio.agora().getTime() - minutosAtras * 60_000).toISOString();
  await b.poolMigrator.query(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em)
     select $1, $2, 'construindo', 0, 1, 'em_construcao', 'ficticio', $3 from generate_series(1, $4)`,
    [dec[k].demandaId, dec[k].decId, quando, n],
  );
}
const limpar = () => b.poolMigrator.query('delete from andamento_construcao');
const conferir = (decId: string, ator: Ator = atorDeIntegracao('construir')) =>
  comTransacao(deps.pool, ({ tx }) => conferirLimiteDeAndamento(tx, ator, decId, relogio));

describe('AN-07: só o construir conta; todo outro ator lança', () => {
  it.each<[string, Ator]>([
    ['awave', atorDeIntegracao('awave')],
    ['integração fora da lista', { tipo: 'integracao', integracao: 'jarvis', prefixoToken: 'ficticio' } as unknown as Ator],
    ['pessoa', { tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'cto' }],
    ['agente', { tipo: 'agente', agente: 'risco', prefixoToken: 'ficticio' }],
    ['sistema', { tipo: 'sistema' }],
  ])('%s lança antes de tomar a trava (AN-08 c)', async (_n, ator) => {
    const segura = await b.poolMigrator.connect();
    try {
      await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', [TRAVA_DO_LIMITE_DE_ANDAMENTO]);
      const inicio = performance.now();
      await expect(conferir(dec.x.decId, ator)).rejects.toThrow();
      expect(performance.now() - inicio).toBeLessThan(1_000);
    } finally {
      await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', [TRAVA_DO_LIMITE_DE_ANDAMENTO]);
      segura.release();
    }
  });
});

describe('AN-07: contagem por DEC e total, na janela', () => {
  it('constantes: 60, 600, a chave literal e as mensagens da 03, seção 7', () => {
    expect(LIMITE_ANDAMENTO).toEqual({
      porDec: { maximo: 60, mensagem: 'Limite de 60 registros de andamento por hora deste pedido atingido. Tente de novo mais tarde.' },
      total: { maximo: 600, mensagem: 'Limite de 600 registros de andamento por hora do /construir atingido. Tente de novo mais tarde.' },
    });
    expect(TRAVA_DO_LIMITE_DE_ANDAMENTO).toBe('limite:andamento:integracao:construir');
  });
  it('59 do DEC passa; 60 dá 429 com a mensagem por DEC; outro DEC passa', async () => {
    await limpar();
    await linhas('x', 59);
    await expect(conferir(dec.x.decId)).resolves.toBeUndefined();
    await linhas('x', 1);
    await expect(conferir(dec.x.decId)).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem });
    await expect(conferir(dec.y.decId)).resolves.toBeUndefined();
  });
  it('janela móvel: as de 61 min atrás não contam', async () => {
    await limpar();
    await linhas('x', 60, 61);
    await expect(conferir(dec.x.decId)).resolves.toBeUndefined();
  });
  it('total: 599 em outro DEC passa; 600 dá 429 com a mensagem total', async () => {
    await limpar();
    await linhas('z', 599);
    await expect(conferir(dec.x.decId)).resolves.toBeUndefined();
    await linhas('z', 1);
    await expect(conferir(dec.x.decId)).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.total.mensagem });
  });
  it('599 no total e duas gravações simultâneas de DEC diferentes (duas conexões): uma passa, a outra 429', async () => {
    await limpar();
    await linhas('z', 599);
    const gravar = (k: 'x' | 'y') =>
      comTransacao(deps.pool, async ({ tx, executor }) => {
        await conferirLimiteDeAndamento(tx, atorDeIntegracao('construir'), dec[k].decId, relogio);
        await executor.executeSql(
          `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, 'testando', 0, 0, 'em_construcao', 'ficticio', $3)`,
          [dec[k].demandaId, dec[k].decId, relogio.agora().toISOString()],
        );
      }).then(
        () => 'gravou',
        (e: { codigo?: string }) => e.codigo,
      );
    expect((await Promise.all([gravar('x'), gravar('y')])).sort()).toEqual(['gravou', 'limite_excedido']);
  });
  it('CA-12.6: os limites de pessoa, agente e Awave não mudam', () => {
    expect(LIMITE_POR_HORA).toEqual({ demanda: 30, artefato: 60 });
  });
});
```

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/limites-andamento.test.ts` → FAIL (exportações inexistentes).

- [ ] **Passo 3: a função** (acréscimo no fim de `src/modules/limites.ts`; importar `andamentoConstrucao` de
  `../db/schema`)

```ts
// 0.4.0 (RF-12, ADR-31, AN-07): limite próprio do /construir para registrar andamento, contado nas linhas de
// andamento_construcao (só gravação conta; o envio no mesmo estado não grava e não chega aqui). Mudar os números é
// decisão de Fabiano, por pedido (ADR-24; P-03 de 12/11/2026). Fora da tabela de limiteDe de propósito: aqui não há
// ramo que saia sem contar (todo ator que não é o construir lança antes da trava, AN-08 c).
export const LIMITE_ANDAMENTO = Object.freeze({
  porDec: Object.freeze({ maximo: 60, mensagem: 'Limite de 60 registros de andamento por hora deste pedido atingido. Tente de novo mais tarde.' }),
  total: Object.freeze({ maximo: 600, mensagem: 'Limite de 600 registros de andamento por hora do /construir atingido. Tente de novo mais tarde.' }),
});

// Uma trava só para as gravações de andamento: o total de 600 só é exato com elas em fila (04, seção 4). Chave literal,
// por parâmetro (G3.6). Última da ordem pedido → demanda → limite (ADR-32).
export const TRAVA_DO_LIMITE_DE_ANDAMENTO = 'limite:andamento:integracao:construir';

const semLimiteDeAndamento = () => new Error('limite: só o /construir registra andamento');

export async function conferirLimiteDeAndamento(tx: Db, ator: Ator, decId: string, relogio: Relogio): Promise<void> {
  switch (ator.tipo) {
    case 'integracao':
      if (ator.integracao !== 'construir') throw semLimiteDeAndamento();
      break;
    case 'pessoa':
    case 'agente':
    case 'sistema':
      throw semLimiteDeAndamento();
    default:
      return atorDesconhecido(ator);
  }
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${TRAVA_DO_LIMITE_DE_ANDAMENTO}, 0))`);
  const desde = new Date(relogio.agora().getTime() - JANELA_MS);
  const [doDec] = await tx
    .select({ n: count() })
    .from(andamentoConstrucao)
    .where(and(eq(andamentoConstrucao.decId, decId), gt(andamentoConstrucao.gravadoEm, desde)));
  if ((doDec?.n ?? 0) >= LIMITE_ANDAMENTO.porDec.maximo) throw new ErroDominio('limite_excedido', LIMITE_ANDAMENTO.porDec.mensagem);
  const [todos] = await tx.select({ n: count() }).from(andamentoConstrucao).where(gt(andamentoConstrucao.gravadoEm, desde));
  if ((todos?.n ?? 0) >= LIMITE_ANDAMENTO.total.maximo) throw new ErroDominio('limite_excedido', LIMITE_ANDAMENTO.total.mensagem);
}
```

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; `PISO` ganha
  `src/modules/limites-andamento.test.ts`; na entrega, o `git diff 0ac099a -- src/modules/limites.ts` (só linhas `+`,
  mais o `import` de `andamentoConstrucao`).

---

## Fase 2 — Registro

### T04. Corpo fechado do andamento e 422 pelo `rota()` com `corpoInvalido` (AN-02)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (adaptador central das rotas) · **Cobre:** RF-02 (formato),
CA-02.2, CA-02.4 (no adaptador), CA-02.6, AN-02, ADR-33, AN-13 (diff de `rota.ts`) · **Depende de:** T01, T02

**Arquivos:**
- Criar: `src/modules/andamento/schemas.ts`, `src/modules/andamento/schemas.test.ts`, `src/lib/rota-corpo-invalido.test.ts`
- Modificar: `src/lib/rota.ts` (só a opção e o ramo dela)
- Não muda: `src/lib/rota.test.ts`, `src/lib/rota-qa.test.ts`, `src/lib/erros.ts`, `src/lib/corpo.ts`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/andamento/schemas.test.ts — AN-02 e CA-02.2: o corpo do andamento é fechado em quatro chaves, enumerações
// e inteiros de 0 a 999, com prontas ≤ total. Sem coerção, sem passthrough, sem padrão. Unitário.
import { describe, expect, it } from 'vitest';
import { FASES_ANDAMENTO, STATUS_CONSTRUCAO } from '../../db/schema/andamento';
import { reIdVersao } from '../../lib/rota';
import { CORPO_INVALIDO_ANDAMENTO, MENSAGENS_ANDAMENTO, RE_ID_DEC_ANDAMENTO, corpoAndamentoSchema } from './schemas';

const VALIDO = { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' };
const aceita = (v: unknown) => corpoAndamentoSchema.safeParse(v).success;
const doJson = (texto: string) => JSON.parse(texto) as unknown;

describe('corpoAndamentoSchema (AN-02)', () => {
  it('aceita o corpo do CA-02.1, 0/0 (CA-02.6), 999/999 e cada fase e status da lista', () => {
    expect(corpoAndamentoSchema.parse(VALIDO)).toEqual(VALIDO);
    expect(aceita({ ...VALIDO, tarefasProntas: 0, tarefasTotal: 0 })).toBe(true);
    expect(aceita({ ...VALIDO, tarefasProntas: 999, tarefasTotal: 999 })).toBe(true);
    for (const fase of FASES_ANDAMENTO) expect(aceita({ ...VALIDO, fase }), fase).toBe(true);
    for (const status of STATUS_CONSTRUCAO) expect(aceita({ ...VALIDO, status }), status).toBe(true);
  });
  it('-0 é aceito e vale 0', () => {
    const r = corpoAndamentoSchema.parse(doJson('{"fase":"planejando","tarefasProntas":-0,"tarefasTotal":0,"status":"em_construcao"}'));
    expect(r.tarefasProntas === 0).toBe(true);
  });
  it.each([
    ['chave a mais', { ...VALIDO, nota: 'x' }],
    ['sem fase', { tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' }],
    ['sem tarefasProntas', { fase: 'construindo', tarefasTotal: 17, status: 'em_construcao' }],
    ['sem tarefasTotal', { fase: 'construindo', tarefasProntas: 9, status: 'em_construcao' }],
    ['sem status', { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17 }],
    ['fase em caixa alta', { ...VALIDO, fase: 'Construindo' }],
    ['fase que é status', { ...VALIDO, fase: 'construido' }],
    ['fase vazia', { ...VALIDO, fase: '' }],
    ['status entregue', { ...VALIDO, status: 'entregue' }],
    ['status encerrada', { ...VALIDO, status: 'encerrada' }],
    ['prontas > total', { ...VALIDO, tarefasProntas: 10, tarefasTotal: 9 }],
    ['negativo', { ...VALIDO, tarefasProntas: -1 }],
    ['fração', { ...VALIDO, tarefasProntas: 1.5 }],
    ['número em texto', { ...VALIDO, tarefasProntas: '9' }],
    ['nulo', { ...VALIDO, tarefasProntas: null }],
    ['booleano', { ...VALIDO, tarefasTotal: true }],
    ['total 1000', { ...VALIDO, tarefasProntas: 0, tarefasTotal: 1000 }],
    ['objeto aninhado na fase', { ...VALIDO, fase: { valor: 'construindo' } }],
    ['lista', []],
    ['nulo no corpo', null],
    ['texto no corpo', 'texto'],
  ])('recusa: %s', (_n, v) => {
    expect(aceita(v)).toBe(false);
  });
  it.each([
    ['__proto__ como chave', '{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao","__proto__":{"x":1}}'],
    ['constructor como chave', '{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao","constructor":1}'],
    ['1e3 em prontas com total 1e2', '{"fase":"construindo","tarefasProntas":1e3,"tarefasTotal":1e2,"status":"em_construcao"}'],
    ['1e400 (Infinity)', '{"fase":"construindo","tarefasProntas":1,"tarefasTotal":1e400,"status":"em_construcao"}'],
  ])('recusa do JSON cru: %s', (_n, texto) => {
    expect(aceita(doJson(texto))).toBe(false);
  });
});

describe('mensagens e constantes (03, seção 7)', () => {
  it('as três mensagens por inteiro', () => {
    expect(MENSAGENS_ANDAMENTO).toEqual({
      corpoInvalido:
        'Andamento fora do formato. Envie só fase, tarefasProntas, tarefasTotal e status, com fase e status da lista e 0 ≤ tarefasProntas ≤ tarefasTotal ≤ 999.',
      decSubstituido: 'O pacote deste pedido foi substituído por um aprovado mais novo. O andamento não foi registrado: envie o do pedido novo.',
      statusFinal: 'A demanda deste pedido já está em um status final e não aceita este andamento. Nada foi registrado.',
    });
    expect(CORPO_INVALIDO_ANDAMENTO).toEqual({ codigo: 'nao_processavel', mensagem: MENSAGENS_ANDAMENTO.corpoInvalido });
  });
  it('o formato do DEC é o mesmo da regex de rota()', () => {
    expect(RE_ID_DEC_ANDAMENTO.source).toBe(reIdVersao('DEC').source);
  });
});
```

```ts
// src/lib/rota-corpo-invalido.test.ts — ADR-33 e AN-02: com `corpoInvalido`, a falha do Zod do corpo vira 422 sem
// `campos`, sem eco; sem a opção, nada muda. O resto de rota() (400 de JSON malformado, 415, 413, cookie com Bearer) é
// igual com e sem a opção. Handlers sintéticos; token `construir` real; o corpo nunca é ecoado nem logado.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { criarDepsDeTeste } from '../../test/deps';
import { tokenDeIntegracao } from '../../test/integracoes';
import { chamarRota } from '../../test/requisicao';
import { definirDepsParaTeste, type Deps } from './deps';
import { substituirDestinoDoLog } from './log';
import { paramId, rota } from './rota';

const SENTINELA = 'SENTINELA-CORPO-4b2f';
const ROTA = '/api/pedidos-construcao/[decId]/andamento';
const corpo = z.strictObject({ n: z.number().int() });
const comOpcao = rota(
  { acao: 'registrar_andamento', rota: ROTA, params: paramId.versao('decId', 'DEC'), corpo, corpoInvalido: { codigo: 'nao_processavel', mensagem: 'Mensagem fixa (fictícia).' } },
  async () => ({ status: 204 }),
);
const semOpcao = rota({ acao: 'registrar_andamento', rota: ROTA, params: paramId.versao('decId', 'DEC'), corpo }, async () => ({ status: 204 }));

let b: BancoDeTeste;
let deps: Deps;
let token: string;
const linhasDoLog: string[] = [];
beforeAll(async () => {
  substituirDestinoDoLog({ write: (l: string) => void linhasDoLog.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'construir');
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

const chamar = (h: typeof comOpcao, c: unknown, extra: { cabecalhos?: Record<string, string>; semContentType?: boolean; cookie?: string } = {}) =>
  chamarRota(h, { metodo: 'POST', caminho: '/api/pedidos-construcao/DEC-DEM-20261112-0001-v1/andamento', params: { decId: 'DEC-DEM-20261112-0001-v1' }, bearer: token, semOrigin: true, corpo: c, ...extra });

describe('corpoInvalido (ADR-33)', () => {
  it('com a opção: corpo fora do schema → 422 só com erro e mensagem, sem campos e sem eco', async () => {
    const r = await chamar(comOpcao, { n: 1, [SENTINELA]: SENTINELA });
    expect(r.status).toBe(422);
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ erro: 'nao_processavel', mensagem: 'Mensagem fixa (fictícia).' });
    expect(texto).not.toContain(SENTINELA);
    expect(linhasDoLog.join('\n')).not.toContain(SENTINELA);
  });
  it('sem a opção: o 400 com campos de hoje', async () => {
    const r = await chamar(semOpcao, { n: 'x' });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ erro: 'entrada_invalida', campos: expect.any(Array) });
  });
  it.each([
    ['JSON malformado → 400', '{"n":', {}, 400],
    ['text/plain → 415', '{"n":1}', { semContentType: true, cabecalhos: { 'content-type': 'text/plain' } }, 415],
    ['corpo acima de 512 KB → 413', JSON.stringify({ n: 1, x: 'a'.repeat(600 * 1024) }), {}, 413],
    ['cookie com Bearer → 400', '{"n":1}', { cookie: 'qualquer=1', cabecalhos: { origin: 'http://localhost:3101' } }, 400],
  ] as const)('com e sem a opção, igual: %s', async (_n, texto, extra, status) => {
    for (const h of [comOpcao, semOpcao]) expect((await chamar(h, texto, extra)).status).toBe(status);
  });
});
```

O caso "cookie com Bearer" usa a origem de `CONFIG_TESTE.urlBase` (importar de `test/auth`) no lugar do literal; o
número esperado (400) é o de hoje para Bearer com cookie: confira em `src/lib/rota.test.ts` e use o mesmo.

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/andamento/schemas.test.ts src/lib/rota-corpo-invalido.test.ts`
  → FAIL (módulo inexistente; `corpoInvalido` não existe em `OpRota`).

- [ ] **Passo 3: o esquema e a opção**

```ts
// src/modules/andamento/schemas.ts — o contrato do andamento (0.4.0; 01, seção 4; 03, seção 7). O corpo é fechado em
// quatro chaves (AN-02): enumerações das listas da tabela (fonte única, src/db/schema/andamento.ts) e inteiros JSON de
// 0 a 999 com prontas ≤ total. Sem coerção, passthrough, catch ou default: o que não está no formato é 422, sem eco.
import { z } from 'zod';
import { FASES_ANDAMENTO, MAXIMO_DE_TAREFAS, STATUS_CONSTRUCAO } from '../../db/schema/andamento';

export const RE_ID_DEC_ANDAMENTO = /^DEC-DEM-\d{8}-\d{4}-v\d{1,4}$/;

// 03, seção 7, por inteiro. O 409 de status final não diz o status; o de DEC substituído não cita o substituto.
export const MENSAGENS_ANDAMENTO = Object.freeze({
  corpoInvalido:
    'Andamento fora do formato. Envie só fase, tarefasProntas, tarefasTotal e status, com fase e status da lista e 0 ≤ tarefasProntas ≤ tarefasTotal ≤ 999.',
  decSubstituido: 'O pacote deste pedido foi substituído por um aprovado mais novo. O andamento não foi registrado: envie o do pedido novo.',
  statusFinal: 'A demanda deste pedido já está em um status final e não aceita este andamento. Nada foi registrado.',
});

export const CORPO_INVALIDO_ANDAMENTO = Object.freeze({ codigo: 'nao_processavel' as const, mensagem: MENSAGENS_ANDAMENTO.corpoInvalido });

const tarefas = z.number().int().min(0).max(MAXIMO_DE_TAREFAS);

export const corpoAndamentoSchema = z
  .strictObject({ fase: z.enum(FASES_ANDAMENTO), tarefasProntas: tarefas, tarefasTotal: tarefas, status: z.enum(STATUS_CONSTRUCAO) })
  .refine((c) => c.tarefasProntas <= c.tarefasTotal);

export type CorpoAndamento = z.infer<typeof corpoAndamentoSchema>;
```

Em `src/lib/rota.ts`, só isto (AN-13):

```ts
export type OpRota<P, Q, C> = {
  // … os campos de hoje …
  // ADR-33 (0.4.0): com a opção, a falha do Zod **do corpo** vira este erro, sem `campos` (o caminho de uma chave a mais
  // seria eco). Sem ela, nada muda. Só a rota do andamento usa.
  corpoInvalido?: { codigo: 'nao_processavel'; mensagem: string };
};

function validarCorpo<C>(schema: ZodType<C>, valor: unknown, invalido: OpRota<unknown, unknown, C>['corpoInvalido']): C {
  if (!invalido) return validar(schema, valor);
  const r = schema.safeParse(valor);
  if (!r.success) throw new ErroDominio(invalido.codigo, invalido.mensagem);
  return r.data;
}
// no handler, a linha do corpo passa a ser:
//   const corpo = (op.corpo ? validarCorpo(op.corpo, await lerCorpoJson(req), op.corpoInvalido) : undefined) as C;
```

- [ ] **Passo 4: ver passar** — `pnpm test` (inclusive `rota.test.ts` e `rota-qa.test.ts` sem mudança), `pnpm lint`,
  `pnpm typecheck`; na entrega, o `git diff 0ac099a -- src/lib/rota.ts`.

### T05. Regras do andamento, transições do `construir` e evento `andamento_registrado` (AN-04, AN-11, AN-12)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (mudança de status automática) · **Cobre:** RF-04 (idempotência e
leitura), RF-05 (tabela), RF-06 (marco e forma do evento), CA-04.6 (unidade), CA-05.10, AN-04, AN-11 (forma), AN-12
(`lerAndamento`), ADR-34, D-08 · **Depende de:** T01, T04

**Arquivos:**
- Criar: `src/modules/andamento/regras.ts`, `src/modules/andamento/regras.test.ts`,
  `src/modules/demandas/transicoes-construir.test.ts`
- Modificar: `src/modules/andamento/schemas.ts` (`andamentoLidoSchema`, `AndamentoVista`, `AndamentoDaIntegracao`,
  `paraIntegracao`), `src/modules/demandas/transicoes.ts` (só acréscimos, G4), `src/modules/historico/registrar.ts`
  (`AcaoEvento`), `src/components/rotulos.ts` (o caso genérico em `textoDoEvento`, para o `typecheck`; a frase completa
  é da T11)

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/andamento/regras.test.ts — AN-04, AN-11, AN-12: as regras puras do registro. Unitário, sem banco.
import { describe, expect, it } from 'vitest';
import type { Status, Tipo } from '../demandas/schemas';
import { decidirPorStatus, lerAndamento, marcoDoEvento, mesmoEstado, mudancaDeMarco, type EstadoDoAndamento } from './regras';
import { paraIntegracao } from './schemas';

const DEC1 = 'DEC-DEM-20261112-0001-v1';
const DEC2 = 'DEC-DEM-20261112-0001-v2';
const E: EstadoDoAndamento = { decId: DEC1, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao' };
const QUANDO = new Date('2026-11-12T12:00:00Z');
const LINHA = { demandaId: 'DEM-20261112-0001', decId: DEC1, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao', gravadoEm: QUANDO };

describe('mesmoEstado e mudancaDeMarco', () => {
  it('mesmo estado só com os cinco campos iguais; cada campo diferente quebra', () => {
    expect(mesmoEstado(E, { ...E })).toBe(true);
    expect(mesmoEstado(null, E)).toBe(false);
    for (const d of [{ decId: DEC2 }, { fase: 'testando' }, { tarefasProntas: 10 }, { tarefasTotal: 18 }, { statusConstrucao: 'construido' }] as const)
      expect(mesmoEstado(E, { ...E, ...d }), JSON.stringify(d)).toBe(false);
  });
  it('marco: o primeiro, ou fase, statusConstrucao ou decId diferente; só os números não (A2)', () => {
    expect(mudancaDeMarco(null, E)).toBe(true);
    expect(mudancaDeMarco(E, { ...E, fase: 'testando' })).toBe(true);
    expect(mudancaDeMarco(E, { ...E, statusConstrucao: 'cancelado' })).toBe(true);
    expect(mudancaDeMarco(E, { ...E, decId: DEC2 })).toBe(true);
    expect(mudancaDeMarco(E, { ...E, tarefasProntas: 10, tarefasTotal: 19 })).toBe(false);
  });
  it('CA-06.6: um ciclo de 20 tarefas (seis fases, prontas de 0 a 20, construido no fim) dá no máximo 7 marcos', () => {
    const seq: EstadoDoAndamento[] = [];
    const s = (fase: EstadoDoAndamento['fase'], p: number, sc: EstadoDoAndamento['statusConstrucao'] = 'em_construcao') =>
      seq.push({ decId: DEC1, fase, tarefasProntas: p, tarefasTotal: 20, statusConstrucao: sc });
    s('entendendo_o_pedido', 0);
    s('planejando', 0);
    for (let p = 0; p <= 20; p++) s('construindo', p);
    s('testando', 20);
    s('revisando_e_entregando', 20);
    s('documentando', 20);
    s('documentando', 20, 'construido');
    let marcos = 0;
    let antes: EstadoDoAndamento | null = null;
    for (const e of seq) {
      if (!mesmoEstado(antes, e) && mudancaDeMarco(antes, e)) marcos++;
      antes = e;
    }
    expect(marcos).toBeLessThanOrEqual(7);
  });
  it('marcoDoEvento monta exatamente as quatro chaves', () => {
    const m = marcoDoEvento({ ...E, extra: 'x' } as unknown as EstadoDoAndamento);
    expect(Object.keys(m).sort()).toEqual(['fase', 'statusConstrucao', 'tarefasProntas', 'tarefasTotal']);
  });
});

const STATUS: readonly Status[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'devolvida', 'entregue', 'encerrada'];
// A tabela da spec, seção 2.1 (P-02 de Fabiano). null = grava sem mudar; 'recusa' = 409.
const ESPERADO: Record<Status, Record<'em_construcao' | 'construido' | 'cancelado', Status | null | 'recusa'>> = {
  nova: { em_construcao: null, construido: null, cancelado: null },
  em_analise: { em_construcao: null, construido: null, cancelado: null },
  aguardando_informacao: { em_construcao: null, construido: null, cancelado: null },
  pronta_para_decisao: { em_construcao: null, construido: null, cancelado: null },
  aprovada: { em_construcao: 'em_construcao', construido: null, cancelado: null },
  em_construcao: { em_construcao: null, construido: null, cancelado: 'devolvida' },
  devolvida: { em_construcao: null, construido: null, cancelado: null },
  entregue: { em_construcao: 'recusa', construido: null, cancelado: 'recusa' },
  encerrada: { em_construcao: 'recusa', construido: 'recusa', cancelado: null },
};

describe('decidirPorStatus (AN-04, CA-05.10): 9 status × 3 × tipo', () => {
  for (const tipo of ['melhoria', 'estudo'] as const satisfies readonly Tipo[])
    for (const status of STATUS)
      for (const sc of ['em_construcao', 'construido', 'cancelado'] as const) {
        it(`${tipo} ${status} + ${sc}`, () => {
          let esperado = ESPERADO[status][sc];
          if (tipo === 'estudo' && esperado === 'em_construcao') esperado = null; // estudo só grava
          const d = decidirPorStatus({ status, tipo }, sc);
          if (esperado === 'recusa') expect(d).toEqual({ tipo: 'recusa' });
          else expect(d).toEqual({ tipo: 'grava', para: esperado });
          if (d.tipo === 'grava') expect(['entregue', 'encerrada']).not.toContain(d.para);
        });
      }
  it('status fora da lista lança, sem gravar', () => {
    expect(() => decidirPorStatus({ status: 'arquivada' as Status, tipo: 'melhoria' }, 'em_construcao')).toThrow();
  });
});

describe('lerAndamento e paraIntegracao (AN-12, CA-04.6)', () => {
  it('linha válida vira a vista de seis campos', () => {
    expect(lerAndamento(LINHA)).toEqual({ decId: DEC1, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao', atualizadoEm: QUANDO });
  });
  it.each([
    ['nulo', null],
    ['fase fora', { ...LINHA, fase: '<img src=x onerror=alert(1)>' }],
    ['status fora', { ...LINHA, statusConstrucao: 'entregue' }],
    ['número em texto', { ...LINHA, tarefasProntas: '9' }],
    ['prontas > total', { ...LINHA, tarefasProntas: 18 }],
    ['acima de 999', { ...LINHA, tarefasProntas: 0, tarefasTotal: 1000 }],
    ['DEC fora do formato', { ...LINHA, decId: 'DEC-x' }],
    ['data que não é Date', { ...LINHA, gravadoEm: '2026-11-12' }],
    ['tudo nulo (left join sem linha)', { decId: null, fase: null, tarefasProntas: null, tarefasTotal: null, statusConstrucao: null, gravadoEm: null }],
  ])('fora do esquema (%s) → null, sem lançar', (_n, l) => {
    expect(lerAndamento(l)).toBeNull();
  });
  it('a vista do Awave tem exatamente quatro chaves, sem decId nem statusConstrucao', () => {
    const v = paraIntegracao({ ...lerAndamento(LINHA)!, extra: 'x' } as never);
    expect(v).toEqual({ fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, atualizadoEm: QUANDO });
    expect(paraIntegracao(null)).toBeNull();
  });
});
```

```ts
// src/modules/demandas/transicoes-construir.test.ts — ADR-34, AN-04 e AN-11: só duas transições do /construir, pelo ator
// integração construir, com status_alterado com ator e prefixo; nunca entregue nem encerrada; MANUAIS intacta. Postgres
// real, relógio fixo, demanda gravada pelo migrator. Dados fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { atorDeIntegracao } from '../../../test/integracoes';
import { comTransacao } from '../../db/transacao';
import { relogioFixo } from '../../lib/relogio';
import type { Ator } from '../acesso/ator';
import { AUTOMATICAS_DO_CONSTRUIR, CONTRADIZ_STATUS_FINAL, mudarStatusPeloConstruir, transicoesManuaisDe, transicaoDoConstruir } from './transicoes';
import type { Status, Tipo } from './schemas';

const relogio = relogioFixo('2026-11-12T12:00:00Z');
let b: BancoDeTeste;
let n = 0;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

async function demandaEm(status: Status, tipo: Tipo = 'melhoria') {
  const id = `DEM-20261112-${String(++n).padStart(4, '0')}`;
  await b.poolMigrator.query(
    `insert into demanda (id, titulo, tipo, status, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', $2, $3, 'Pessoa Ficticia', 'pessoa', 'u-ficticio', '2026-11-12T10:00:00Z', '2026-11-12T10:00:00Z')`,
    [id, tipo, status],
  );
  return { id, status, tipo };
}
const mudar = (ator: Ator, d: { id: string; status: Status; tipo: Tipo }, sc: 'em_construcao' | 'construido' | 'cancelado') =>
  comTransacao(b.poolApp, (t) => mudarStatusPeloConstruir(t, { relogio }, ator, d, sc));
const linha = async (id: string) =>
  (await b.poolMigrator.query(`select status, atualizada_em from demanda where id = $1`, [id])).rows[0] as { status: string; atualizada_em: Date };
const eventos = async (id: string) =>
  (await b.poolMigrator.query(`select ator_tipo, ator_id, ator_token_prefixo, entidade, acao, antes, depois from evento where demanda_id = $1 order by id`, [id])).rows;

describe('tabelas do construir', () => {
  it('exatamente as duas automáticas, e a contradição com status final da spec 2.1', () => {
    expect(AUTOMATICAS_DO_CONSTRUIR).toEqual({ em_construcao: { de: 'aprovada', para: 'em_construcao' }, cancelado: { de: 'em_construcao', para: 'devolvida' } });
    expect(CONTRADIZ_STATUS_FINAL).toEqual({ entregue: ['em_construcao', 'cancelado'], encerrada: ['em_construcao', 'construido'] });
    expect(Object.isFrozen(AUTOMATICAS_DO_CONSTRUIR)).toBe(true);
  });
  it('transicaoDoConstruir: estudo não vai para construção; construido nunca muda', () => {
    expect(transicaoDoConstruir({ status: 'aprovada', tipo: 'melhoria' }, 'em_construcao')).toBe('em_construcao');
    expect(transicaoDoConstruir({ status: 'aprovada', tipo: 'estudo' }, 'em_construcao')).toBeNull();
    expect(transicaoDoConstruir({ status: 'em_construcao', tipo: 'melhoria' }, 'cancelado')).toBe('devolvida');
    expect(transicaoDoConstruir({ status: 'em_construcao', tipo: 'melhoria' }, 'construido')).toBeNull();
  });
  it('CA-05.11: MANUAIS não muda (as opções da devolvida continuam em_construcao e em_analise)', () => {
    expect(transicoesManuaisDe('devolvida')).toEqual(['em_construcao', 'em_analise']);
    expect(transicoesManuaisDe('em_construcao')).toEqual(['entregue', 'devolvida']);
  });
});

describe('mudarStatusPeloConstruir', () => {
  it('aprovada + em_construcao → em_construcao, atualizada_em do relógio e status_alterado do construir com prefixo', async () => {
    const d = await demandaEm('aprovada');
    expect(await mudar(atorDeIntegracao('construir'), d, 'em_construcao')).toBe('em_construcao');
    expect(await linha(d.id)).toEqual({ status: 'em_construcao', atualizada_em: relogio.agora() });
    expect(await eventos(d.id)).toEqual([
      { ator_tipo: 'integracao', ator_id: 'construir', ator_token_prefixo: 'ficticio', entidade: 'demanda', acao: 'status_alterado', antes: { status: 'aprovada' }, depois: { status: 'em_construcao' } },
    ]);
  });
  it('em_construcao + cancelado → devolvida', async () => {
    const d = await demandaEm('em_construcao');
    expect(await mudar(atorDeIntegracao('construir'), d, 'cancelado')).toBe('devolvida');
    expect((await linha(d.id)).status).toBe('devolvida');
  });
  it('sem regra (construido, estudo, outra origem): não toca a demanda nem grava evento', async () => {
    for (const [status, tipo, sc] of [['em_construcao', 'melhoria', 'construido'], ['aprovada', 'estudo', 'em_construcao'], ['devolvida', 'melhoria', 'em_construcao']] as const) {
      const d = await demandaEm(status, tipo);
      const antes = await linha(d.id);
      expect(await mudar(atorDeIntegracao('construir'), d, sc)).toBeNull();
      expect(await linha(d.id)).toEqual(antes);
      expect(await eventos(d.id)).toEqual([]);
    }
  });
  it.each<[string, Ator]>([
    ['awave', atorDeIntegracao('awave')],
    ['sistema', { tipo: 'sistema' }],
    ['pessoa', { tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'cto' }],
    ['agente', { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'ficticio' }],
  ])('%s lança antes de tocar o banco', async (_n, ator) => {
    const d = await demandaEm('aprovada');
    await expect(mudar(ator, d, 'em_construcao')).rejects.toThrow();
    expect((await linha(d.id)).status).toBe('aprovada');
  });
});
```

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/andamento/regras.test.ts src/modules/demandas/transicoes-construir.test.ts`
  → FAIL (módulos e exportações inexistentes).

- [ ] **Passo 3: o código**

Acréscimo em `src/modules/andamento/schemas.ts`:

```ts
// A linha lida do banco passa por aqui antes de qualquer tela ou API (AN-12; CA-04.6): fora do esquema, "sem andamento".
export const andamentoLidoSchema = z
  .object({
    decId: z.string().regex(RE_ID_DEC_ANDAMENTO),
    fase: z.enum(FASES_ANDAMENTO),
    tarefasProntas: tarefas,
    tarefasTotal: tarefas,
    statusConstrucao: z.enum(STATUS_CONSTRUCAO),
    gravadoEm: z.date(),
  })
  .refine((l) => l.tarefasProntas <= l.tarefasTotal);

export type AndamentoVista = { decId: string; fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; statusConstrucao: StatusConstrucao; atualizadoEm: Date };
export type AndamentoDaIntegracao = { fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; atualizadoEm: Date };

// IN-08 e AN-09: o Awave vê quatro chaves, montadas uma a uma; nunca decId, statusConstrucao nem prefixo.
export function paraIntegracao(a: AndamentoVista | null): AndamentoDaIntegracao | null {
  return a === null ? null : { fase: a.fase, tarefasProntas: a.tarefasProntas, tarefasTotal: a.tarefasTotal, atualizadoEm: a.atualizadoEm };
}
```

`src/modules/andamento/regras.ts`:

```ts
// Regras puras do registro do andamento (0.4.0; 01, seções 1 e 5; ADR-34). Sem banco, sem relógio.
import type { FaseAndamento, StatusConstrucao } from '../../db/schema/andamento';
import type { Status, Tipo } from '../demandas/schemas';
import { CONTRADIZ_STATUS_FINAL, transicaoDoConstruir } from '../demandas/transicoes';
import { andamentoLidoSchema, type AndamentoVista } from './schemas';

export type EstadoDoAndamento = Pick<AndamentoVista, 'decId' | 'fase' | 'tarefasProntas' | 'tarefasTotal' | 'statusConstrucao'>;
export type MarcoDoEvento = { fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; statusConstrucao: StatusConstrucao };

// Nunca lança: linha fora do esquema (ou o left join sem linha) é "sem andamento".
export function lerAndamento(linha: unknown): AndamentoVista | null {
  const r = andamentoLidoSchema.safeParse(linha);
  if (!r.success) return null;
  const l = r.data;
  return { decId: l.decId, fase: l.fase, tarefasProntas: l.tarefasProntas, tarefasTotal: l.tarefasTotal, statusConstrucao: l.statusConstrucao, atualizadoEm: l.gravadoEm };
}

// Os cinco campos (AN-04): sem o decId, o primeiro envio de um DEC novo passaria por "mesmo estado".
export function mesmoEstado(g: EstadoDoAndamento | null, n: EstadoDoAndamento): boolean {
  return g !== null && g.decId === n.decId && g.fase === n.fase && g.tarefasProntas === n.tarefasProntas && g.tarefasTotal === n.tarefasTotal && g.statusConstrucao === n.statusConstrucao;
}

// A2: evento só no primeiro andamento ou com fase, statusConstrucao ou DEC diferente.
export function mudancaDeMarco(g: EstadoDoAndamento | null, n: EstadoDoAndamento): boolean {
  return g === null || g.fase !== n.fase || g.statusConstrucao !== n.statusConstrucao || g.decId !== n.decId;
}

// C-30 e AN-11: `antes` e `depois` do evento, chave a chave, só enumeração e inteiro.
export const marcoDoEvento = (e: EstadoDoAndamento): MarcoDoEvento => ({
  fase: e.fase,
  tarefasProntas: e.tarefasProntas,
  tarefasTotal: e.tarefasTotal,
  statusConstrucao: e.statusConstrucao,
});

export type DecisaoDoAndamento = { tipo: 'recusa' } | { tipo: 'grava'; para: Status | null };

// A tabela da spec, seção 2.1 (P-02). Switch exaustivo sobre os nove status, sem ramo padrão que grave (AN-04).
export function decidirPorStatus(atual: { status: Status; tipo: Tipo }, sc: StatusConstrucao): DecisaoDoAndamento {
  switch (atual.status) {
    case 'entregue':
    case 'encerrada':
      return CONTRADIZ_STATUS_FINAL[atual.status].includes(sc) ? { tipo: 'recusa' } : { tipo: 'grava', para: null };
    case 'nova':
    case 'em_analise':
    case 'aguardando_informacao':
    case 'pronta_para_decisao':
    case 'aprovada':
    case 'em_construcao':
    case 'devolvida':
      return { tipo: 'grava', para: transicaoDoConstruir(atual, sc) };
    default: {
      const nunca: never = atual.status;
      throw new Error(`andamento: status desconhecido ${String(nunca)}`);
    }
  }
}
```

Acréscimo no fim de `src/modules/demandas/transicoes.ts` (importar `StatusConstrucao` de
`../../db/schema/andamento` e `atorDesconhecido`, `Ator` de `../acesso/ator`; nada acima muda):

```ts
// 0.4.0 (RF-05, ADR-34, A1): as duas transições do /construir, com origem fixa. `entregue` e `encerrada` nunca são
// destino. Pelo ator integração construir, com o prefixo do token no status_alterado (nunca "Sistema"). D-08: a única
// fonte é esta tabela, lida por decidirPorStatus (andamento/regras.ts) e por mudarStatusPeloConstruir.
export const AUTOMATICAS_DO_CONSTRUIR: Readonly<Partial<Record<StatusConstrucao, Readonly<{ de: Status; para: Status }>>>> = Object.freeze({
  em_construcao: Object.freeze({ de: 'aprovada', para: 'em_construcao' }),
  cancelado: Object.freeze({ de: 'em_construcao', para: 'devolvida' }),
});

// P-02 de Fabiano: entregue aceita construido; encerrada aceita cancelado; o resto é 409.
export const CONTRADIZ_STATUS_FINAL: Readonly<Record<'entregue' | 'encerrada', readonly StatusConstrucao[]>> = Object.freeze({
  entregue: Object.freeze(['em_construcao', 'cancelado'] as const),
  encerrada: Object.freeze(['em_construcao', 'construido'] as const),
});

// O destino, ou null. A demanda do tipo Estudo não vai para construção (a mesma regra da mudança manual).
export function transicaoDoConstruir(atual: { status: Status; tipo: Tipo }, sc: StatusConstrucao): Status | null {
  const regra = Object.hasOwn(AUTOMATICAS_DO_CONSTRUIR, sc) ? AUTOMATICAS_DO_CONSTRUIR[sc] : undefined;
  if (!regra || regra.de !== atual.status) return null;
  if (regra.para === 'em_construcao' && atual.tipo === 'estudo') return null;
  return regra.para;
}

// Só o construir. `atual` é a linha devolvida pela trava da demanda na transação de quem chama (AN-04): nada é lido de
// novo aqui. Sem transação própria nem SET (AN-06).
export async function mudarStatusPeloConstruir(
  t: Transacao,
  deps: Pick<Deps, 'relogio'>,
  ator: Ator,
  atual: { id: string; status: Status; tipo: Tipo },
  sc: StatusConstrucao,
): Promise<Status | null> {
  switch (ator.tipo) {
    case 'integracao':
      if (ator.integracao !== 'construir') throw new Error('transições do /construir: só o construir');
      break;
    case 'pessoa':
    case 'agente':
    case 'sistema':
      throw new Error('transições do /construir: só o construir');
    default:
      return atorDesconhecido(ator);
  }
  const para = transicaoDoConstruir(atual, sc);
  if (para === null) return null;
  await t.tx.update(demanda).set({ status: para, atualizadaEm: deps.relogio.agora() }).where(eq(demanda.id, atual.id));
  await registrarEvento(
    t.tx,
    { ator, demandaId: atual.id, entidade: 'demanda', entidadeId: atual.id, acao: 'status_alterado', ...mudancaDeCampo('status', atual.status, para) },
    deps.relogio,
  );
  return para;
}
```

Em `src/modules/historico/registrar.ts`, `AcaoEvento` ganha, no fim, `// 0.4.0 (RF-06): o /construir informou uma
mudança de fase, de situação ou de pedido; depois só com fase, números e situação (AN-11).` e `| 'andamento_registrado'`.
Em `src/components/rotulos.ts`, o caso genérico (a T11 completa):

```ts
    // 0.4.0 (03, 5.7): a frase genérica; a T11 acrescenta fase, situação e tarefas.
    case 'andamento_registrado':
      return `Registrou o andamento de ${doPacote(e.entidadeId)}`;
```

Todo outro `switch` sobre `AcaoEvento` que o `typecheck` apontar recebe o mesmo caso genérico; liste-os na entrega.

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; na entrega, o
  `git diff 0ac099a -- src/modules/demandas/transicoes.ts` (só linhas `+` fora dos imports).

### T06. Leituras do andamento: o último, por página e a subconsulta do Awave, com plano de execução

**Engenheiro:** `engenheiro-dados-bd` · **Risco:** medio (leitura nova, só `SELECT`) · **Cobre:** RF-04 (o último), RF-08
e RF-10 (base das leituras), ADR-35, D-09, RNF-01 (índice) · **Depende de:** T01

**Arquivos:**
- Criar: `src/modules/andamento/consultas.ts`, `src/modules/andamento/consultas.test.ts`
- Modificar: `test/estatico/andamento.test.ts` (o bloco "consultas só lê" e a cadeia de importação)
- Não muda: nada fora de `src/modules/andamento/` e `test/` (lista Pode do `engenheiro-dados-bd`)

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/andamento/consultas.test.ts — ADR-30 e ADR-35: o último andamento é a linha de maior id (o relógio pode
// empatar); a página lê numa consulta só; a subconsulta do Awave junta na consulta da demanda. Os planos usam
// andamento_construcao_demanda_id_idx. Postgres real; linhas pelo migrator; dados fictícios.
import { desc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { demanda } from '../../db/schema';
import { andamentosDasDemandas, subconsultaDoUltimoAndamento, ultimoAndamento } from './consultas';

let b: BancoDeTeste;
const QUANDO = '2026-11-12T12:00:00Z';
const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);

// Uma demanda com ESP, RSK e DEC v1, pelo migrator (o SQL é o de andamento.test.ts da T01).
async function demandaComDec(n: number): Promise<{ dem: string; dec: string }> {
  const dem = `DEM-20261112-${String(n).padStart(4, '0')}`;
  // … os quatro inserts de src/db/schema/andamento.test.ts, com `dem` …
  return { dem, dec: `DEC-${dem}-v1` };
}
async function andamento(dem: string, dec: string, fase: string, prontas: number, total: number, status = 'em_construcao') {
  await m(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, $3, $4, $5, $6, 'ficticio', $7)`,
    [dem, dec, fase, prontas, total, status, QUANDO],
  );
}

let a: { dem: string; dec: string };
let semAndamento: { dem: string; dec: string };
beforeAll(async () => {
  b = await novoBanco();
  a = await demandaComDec(1);
  semAndamento = await demandaComDec(2);
  // Mesma data nas três: vale a ordem de gravação.
  await andamento(a.dem, a.dec, 'planejando', 0, 0);
  await andamento(a.dem, a.dec, 'construindo', 9, 17);
  await andamento(a.dem, a.dec, 'construindo', 3, 19);
  // Volume do RNF-01 (200 demandas) para o planejador escolher o índice.
  for (let i = 3; i < 203; i++) {
    const x = await demandaComDec(i);
    await andamento(x.dem, x.dec, 'testando', 1, 2);
    await andamento(x.dem, x.dec, 'testando', 2, 2);
  }
  await m('analyze andamento_construcao');
});
afterAll(async () => {
  await b.fechar();
});

describe('ultimoAndamento', () => {
  it('a linha de maior id, com os sete campos', async () => {
    expect(await ultimoAndamento(b.db, a.dem)).toEqual({
      demandaId: a.dem,
      decId: a.dec,
      fase: 'construindo',
      tarefasProntas: 3,
      tarefasTotal: 19,
      statusConstrucao: 'em_construcao',
      gravadoEm: new Date(QUANDO),
    });
  });
  it('sem andamento: null', async () => {
    expect(await ultimoAndamento(b.db, semAndamento.dem)).toBeNull();
  });
});

describe('andamentosDasDemandas', () => {
  it('o último de cada demanda pedida, numa consulta; sem andamento fica fora do mapa; lista vazia não consulta', async () => {
    const mapa = await andamentosDasDemandas(b.db, [a.dem, semAndamento.dem, 'DEM-20261112-0003']);
    expect([...mapa.keys()].sort()).toEqual([a.dem, 'DEM-20261112-0003']);
    expect(mapa.get(a.dem)).toMatchObject({ fase: 'construindo', tarefasProntas: 3 });
    expect(await andamentosDasDemandas(b.db, [])).toEqual(new Map());
  });
});

describe('subconsultaDoUltimoAndamento (D-09)', () => {
  it('junta na consulta da demanda: com andamento, os campos do último; sem, nulos', async () => {
    const ler = async (id: string) => {
      const ua = subconsultaDoUltimoAndamento(b.db, id);
      const [l] = await b.db
        .select({ id: demanda.id, fase: ua.fase, tarefasProntas: ua.tarefasProntas, gravadoEm: ua.gravadoEm })
        .from(demanda)
        .leftJoin(ua, eq(ua.demandaId, demanda.id))
        .where(eq(demanda.id, id));
      return l;
    };
    expect(await ler(a.dem)).toEqual({ id: a.dem, fase: 'construindo', tarefasProntas: 3, gravadoEm: new Date(QUANDO) });
    expect(await ler(semAndamento.dem)).toEqual({ id: semAndamento.dem, fase: null, tarefasProntas: null, gravadoEm: null });
  });
});

describe('planos (RNF-01)', () => {
  const plano = async (sql: string, p: unknown[]) => (await m(`explain ${sql}`, p)).rows.map((r) => r['QUERY PLAN']).join('\n');
  it('o último por demanda e a página usam andamento_construcao_demanda_id_idx', async () => {
    expect(await plano(`select * from andamento_construcao where demanda_id = $1 order by id desc limit 1`, [a.dem])).toContain('andamento_construcao_demanda_id_idx');
    expect(
      await plano(`select distinct on (demanda_id) * from andamento_construcao where demanda_id = any($1) order by demanda_id, id desc`, [[a.dem, 'DEM-20261112-0003']]),
    ).toContain('andamento_construcao_demanda_id_idx');
  });
});
```

Escreva os quatro `insert` de `demandaComDec` por inteiro (os de `src/db/schema/andamento.test.ts`, com `dem` no lugar
da constante). O SQL do `explain` tem de ser o mesmo que o Drizzle gera: copie-o do `.toSQL()` das funções, e cole o
trecho do plano na entrega.

No `test/estatico/andamento.test.ts`, acrescentar:

```ts
// T06 (D-04): andamento/consultas.ts só lê (o mesmo critério de resumo-da-fila.ts: select, sem insert/update/delete/
// execute/transaction/raw), e só estes o importam por valor no código que roda.
const CONSULTAS = 'src/modules/andamento/consultas.ts';
export const IMPORTAM_CONSULTAS: readonly string[] = [
  'src/modules/andamento/registrar.ts', // T07
  'src/modules/demandas/consultas.ts', // T09
  'src/app/(painel)/demandas/leituras-da-fila.ts', // T12
];
describe('andamento/consultas.ts', () => {
  it('só lê', () => {
    const f = ler(CONSULTAS);
    for (const re of [/\binsert\s*\(/, /\bupdate\s*\(/, /\bdelete\s*\(/, /\bexecute\s*\(/, /\btransaction\s*\(/, /\.raw\s*\(/]) expect(f, String(re)).not.toMatch(re);
    expect(f).toMatch(/\.select(DistinctOn)?\s*\(/);
  });
  it('só os importadores da lista o importam por valor', () => {
    const importam = codigoQueRoda.filter((a) => a !== CONSULTAS && importacoesDe(a, ler(a)).some((i) => !i.soTipo && /(^|\/)andamento\/consultas(\.[cm]?[jt]sx?)?$/.test(i.origem)));
    expect(importam.filter((a) => !IMPORTAM_CONSULTAS.includes(a))).toEqual([]);
  });
});
```

(com `import { importacoesDe } from './importacoes';` no topo). O caso plantado das duas regras fica no mesmo `describe`
(um `insert(` plantado reprova; uma importação de `src/app/x.ts` fora da lista reprova).

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/andamento/consultas.test.ts test/estatico/andamento.test.ts` → FAIL.

- [ ] **Passo 3: o código**

```ts
// src/modules/andamento/consultas.ts — leituras do andamento (ADR-30, ADR-35). Só SELECT. O último andamento de uma
// demanda é a linha de maior id. As linhas saem cruas: quem mostra passa cada uma por lerAndamento (regras.ts, AN-12).
import { desc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../../db';
import { andamentoConstrucao as a } from '../../db/schema';

export type LinhaDeAndamento = { demandaId: string; decId: string; fase: string; tarefasProntas: number; tarefasTotal: number; statusConstrucao: string; gravadoEm: Date };

const COLUNAS = {
  demandaId: a.demandaId,
  decId: a.decId,
  fase: a.fase,
  tarefasProntas: a.tarefasProntas,
  tarefasTotal: a.tarefasTotal,
  statusConstrucao: a.statusConstrucao,
  gravadoEm: a.gravadoEm,
};

export async function ultimoAndamento(db: Db, demandaId: string): Promise<LinhaDeAndamento | null> {
  const [l] = await db.select(COLUNAS).from(a).where(eq(a.demandaId, demandaId)).orderBy(desc(a.id)).limit(1);
  return l ?? null;
}

// Uma consulta por página da fila (ADR-16): o último de cada demanda pedida; a que não tem andamento fica fora.
export async function andamentosDasDemandas(db: Db, ids: readonly string[]): Promise<Map<string, LinhaDeAndamento>> {
  const mapa = new Map<string, LinhaDeAndamento>();
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return mapa;
  const linhas = await db.selectDistinctOn([a.demandaId], COLUNAS).from(a).where(inArray(a.demandaId, unicos)).orderBy(a.demandaId, desc(a.id));
  for (const l of linhas) mapa.set(l.demandaId, l);
  return mapa;
}

// D-09: o último andamento da demanda como subconsulta, para a leitura do Awave juntar na mesma consulta da autoria
// (o 404 sai da mesma consulta, sem leitura a mais num caso que no outro).
export function subconsultaDoUltimoAndamento(db: Db, demandaId: string) {
  return db.select(COLUNAS).from(a).where(eq(a.demandaId, demandaId)).orderBy(desc(a.id)).limit(1).as('ultimo_andamento');
}
```

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; o plano na entrega.

### T07. Serviço `registrarAndamento`: 404 sem oráculo, travas, transições, idempotência e prazo total (AN-03 a AN-06, AN-08)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (escrita vinda de fora que muda status) · **Cobre:** RF-03, RF-04,
RF-05, RF-06, RNF-06, CA-03.1 a CA-03.4 (no serviço), CA-04.1 a CA-04.5, CA-05.1 a CA-05.11, CA-06.1 a CA-06.4, AN-01
(`autorizar` antes da transação), AN-03, AN-04, AN-05, AN-06, AN-08, AN-11 (eventos), ADR-32 · **Depende de:** T01 a T06

**Arquivos:**
- Criar: `src/modules/andamento/registrar.ts`; `test/andamento.ts` (ajudantes, G7);
  `src/modules/andamento/registrar.test.ts` (fluxo, tabela, eventos);
  `src/modules/andamento/registrar-concorrencia.test.ts` (AN-05, AN-08);
  `src/modules/andamento/registrar-prazo.test.ts` (AN-06, banco próprio com gatilho de teste)
- Modificar: `test/estatico/andamento.test.ts` (AN-06 estático), `test/estatico/piso-de-assercoes.test.ts`

- [ ] **Passo 1: os ajudantes e os testes que falham**

```ts
// test/andamento.ts — ajudantes dos testes do andamento (T07 em diante). Linhas e status pelo migrator quando o caso
// pede um estado que nenhum caminho do app grava; dados fictícios; prefixo `ficticio`.
import type { CorpoAndamento } from '../src/modules/andamento/schemas';
import type { Status, Tipo } from '../src/modules/demandas/schemas';
import type { BancoDeTeste } from './banco';
import type { LinhaEvento } from './pedidos-construcao';

export const CORPO_CONSTRUINDO: CorpoAndamento = Object.freeze({ fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' });
export const corpo = (c: Partial<CorpoAndamento> = {}): CorpoAndamento => ({ ...CORPO_CONSTRUINDO, ...c });

export const andamentosDa = async (b: BancoDeTeste, demandaId: string) =>
  (await b.poolMigrator.query(`select dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em from andamento_construcao where demanda_id = $1 order by id`, [demandaId])).rows;

export const eventosDo = async (b: BancoDeTeste, entidadeId: string, acao: string) =>
  (await b.poolMigrator.query<LinhaEvento>(`select ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, antes, depois from evento where entidade_id = $1 and acao = $2 order by id`, [entidadeId, acao])).rows;

export async function porStatus(b: BancoDeTeste, demandaId: string, status: Status, tipo?: Tipo): Promise<void> {
  await b.poolMigrator.query(`update demanda set status = $2, tipo = coalesce($3, tipo) where id = $1`, [demandaId, status, tipo ?? null]);
}

export async function inserirAndamento(
  b: BancoDeTeste,
  x: { demandaId: string; decId: string; fase?: string; prontas?: number; total?: number; status?: string; gravadoEm: Date },
): Promise<void> {
  await b.poolMigrator.query(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, $3, $4, $5, $6, 'ficticio', $7)`,
    [x.demandaId, x.decId, x.fase ?? 'construindo', x.prontas ?? 0, x.total ?? 1, x.status ?? 'em_construcao', x.gravadoEm.toISOString()],
  );
}

// O retrato do que o envio pode mudar: andamento, status, atualizada_em e eventos da demanda.
export async function retratoDa(b: BancoDeTeste, demandaId: string) {
  const d = (await b.poolMigrator.query(`select status, atualizada_em from demanda where id = $1`, [demandaId])).rows[0];
  const n = Number((await b.poolMigrator.query(`select count(*) as n from evento where demanda_id = $1`, [demandaId])).rows[0].n);
  return { demanda: d, eventos: n, andamentos: await andamentosDa(b, demandaId) };
}
```

`src/modules/andamento/registrar.test.ts` (banco e relógio próprios; DEC pelo `preparadorDePedidos`, gerado por
pessoa; um DEC por caso; o ator do `construir` com prefixo `ficticio`). Os casos, cada um num `it`, com o retrato antes
e depois:

1. **AN-01:** `awave`, `pessoa` (cto e administradora), cada agente e `sistema` chamando `registrarAndamento` direto →
   `sem_permissao`, com um `deps.pool` falso cujo `connect` lança (prova que nada abre transação).
2. **CA-03.1 a CA-03.4 e AN-03 (no serviço):** DEC inexistente com id no formato; DEC aprovado sem `pedido_gerado`
   (`prepararDec({ gerar: false })`); `pedido_gerado` de `agente` e de `sistema` inseridos pelo migrator
   (`inserirEventoDoPedido`); e `pedido_gerado` de **pessoa** inserido pelo migrator com o `demanda_id` de **outra**
   demanda → `ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO)` igual nos cinco, e o retrato das duas demandas
   igual.
3. **CA-04.1:** demanda sem andamento em `pronta_para_decisao` (`porStatus`), corpo do CA-02.1 com o relógio em T → uma
   linha `{ dec_id, construindo, 9, 17, em_construcao, ficticio, T }`; `demanda.atualizada_em` igual (CA-04.5); um
   `andamento_registrado` com `entidade = 'pacote_decisao'`, `demanda_id` da demanda, `antes: null`, `depois` com as
   quatro chaves (CA-06.1, CA-06.4).
4. **CA-04.2 e CA-05.9:** o mesmo corpo em T + 2 min → nada gravado (retrato igual); depois, com a demanda posta em
   `entregue` pelo migrator, o mesmo corpo → nada gravado e sem 409.
5. **CA-04.3, CA-04.4 e CA-06.3:** `construindo 10/17` em T + 4 min → linha nova com T + 4 min, nenhum evento;
   `construindo 3/19` → aceito, nenhum evento.
6. **CA-06.2:** `testando` → um `andamento_registrado` com `antes` = as quatro chaves do anterior.
7. **CA-05.1:** demanda em `aprovada` (pela pessoa, `alterarDemanda`) + `em_construcao` → status `em_construcao`,
   `atualizada_em` do relógio e dois eventos na ordem `status_alterado` (ator `integracao`/`construir`/`ficticio`,
   `antes: { status: 'aprovada' }`, `depois: { status: 'em_construcao' }`) e `andamento_registrado`.
8. **CA-05.2 e CA-05.3:** em `em_construcao`: `construido` → status igual, sem `status_alterado`; depois `cancelado` →
   `devolvida`, com `status_alterado` do `construir`.
9. **CA-05.4 a CA-05.7 e a tabela inteira (AN-04):** para cada um dos 9 status (posto pelo migrator) × 3
   `statusConstrucao` × tipo `melhoria` e `estudo`, numa demanda nova com DEC vigente e pedido gerado: o resultado
   (grava, grava e muda, ou `conflito` com `MENSAGENS_ANDAMENTO.statusFinal`) é o da tabela de `regras.test.ts` (importe
   a mesma constante, exportada de lá para `test/andamento.ts`), nada gravado na recusa, e nunca `entregue` nem
   `encerrada` como resultado. São 54 casos: reaproveite três demandas por tipo e troque o status pelo migrator entre os
   casos, apagando antes as linhas de andamento delas pelo migrator, para o caso começar sem andamento.
10. **CA-05.8 (AN-04, AN-05):** DEC v1 com pedido gerado e andamento; v2 da mesma demanda criado e aprovado
    (`novoDec`, `aprovar`) → envio novo do v1 → `conflito` com `MENSAGENS_ANDAMENTO.decSubstituido`, retrato igual.
11. **AN-04 (o caso do `decId`):** andamento gravado do v1 e, com o v2 vigente e com pedido gerado, o mesmo corpo pelo v2
    → grava e cria `andamento_registrado` (só o `decId` mudou).
12. **CA-12 (o limite no fluxo):** com 60 linhas do DEC no último minuto (`inserirAndamento`), estado novo →
    `limite_excedido`; o mesmo estado da última linha → nada e sem 429 (o mesmo estado vem antes do limite).
13. **CA-06.6:** o ciclo de 20 tarefas da T05 pelo serviço, avançando 2 min por envio → no máximo 7
    `andamento_registrado`.
14. **AN-11:** em todos os eventos gravados acima, `depois` (e `antes`, quando não nulo) tem só as quatro chaves, valores
    da lista ou inteiros; nenhum evento tem a `demanda_id` nula.

`src/modules/andamento/registrar-concorrencia.test.ts` (D-13; duas transações reais; `soltar` depois de 300 ms):

```ts
// Segura a trava da demanda numa transação de pessoa até o teste soltar; devolve o resultado dela.
function segurando<T>(acao: (t: Transacao) => Promise<T>) {
  let soltar!: () => void;
  const solta = new Promise<void>((r) => (soltar = r));
  const fim = comTransacao(deps.pool, async (t) => {
    const r = await acao(t);
    await solta;
    return r;
  }).then(
    (r) => ({ ok: true as const, r }),
    (e: unknown) => ({ ok: false as const, e }),
  );
  return { soltar, fim };
}
```

Casos (AN-05 e AN-08):
- (a) dois envios iguais do mesmo DEC com `Promise.all` (duas conexões do pool) → uma linha e um `andamento_registrado`;
- (b) demanda em `em_construcao`: pessoa marcando `entregue` dentro de `segurando` + envio `cancelado` → depois de
  soltar: status `entregue` e o envio com `conflito` (`statusFinal`); e o inverso (envio primeiro, sem trava segura;
  depois a pessoa) → `devolvida` e a pessoa com `conflito`; nunca as duas gravadas;
- (c) envio do v1 enquanto `registrarDecisao` aprova o v2 dentro de `segurando` → `conflito` (`decSubstituido`) e
  nenhuma linha nova do v1; e o inverso (envio, depois a decisão) → a linha do v1 existe e um envio novo do v1 dá
  `conflito`;
- (d) demanda em `aprovada`: pessoa trocando o tipo para `estudo` dentro de `segurando` + envio `em_construcao` →
  status continua `aprovada`, linha gravada;
- (e) envios de dois DEC da mesma demanda (v1 e v2, com `Promise.all`) em 50 repetições → nenhum erro `40P01`;
- AN-08 (1): com `TRAVA_DO_LIMITE_DE_ANDAMENTO` segura por `pg_advisory_lock` numa conexão do migrator, envio de estado
  novo → `indisponivel` em menos de 3 s, retrato igual; logo depois, `alterarDemanda` da pessoa na mesma demanda conclui
  em menos de 1 s;
- AN-08 (2): com a trava segura, pessoa muda o status de outra demanda e o `awave` cria demanda (`criarDemanda`), os dois
  em menos de 1 s;
- AN-08 (3): com a trava segura, envio no mesmo estado → resolve sem erro em menos de 1 s.

`src/modules/andamento/registrar-prazo.test.ts` (banco próprio; molde de `prazo-total-0019.test.ts`):

```ts
// Gatilho só deste banco de teste: guarda o statement_timeout e o lock_timeout em vigor no INSERT do andamento.
beforeAll(async () => {
  await b.poolMigrator.query(`create table prazo_visto (stmt text, lock text)`);
  await b.poolMigrator.query(
    `create function registrar_prazo() returns trigger language plpgsql security definer as $$ begin insert into prazo_visto values (current_setting('statement_timeout'), current_setting('lock_timeout')); return new; end $$`,
  );
  await b.poolMigrator.query(`create trigger andamento_prazo before insert on andamento_construcao for each row execute function registrar_prazo()`);
});

it('(a) 7 s gastos na espera pela conexão: no INSERT, statement_timeout e lock_timeout ≤ 1 s, nunca 5 s nem 2 s', async () => {
  const pool = criarPool(b.urlApp, { max: 1 });
  const segura = await pool.connect();
  try {
    let agora = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => agora);
    const pendente = registrarAndamento({ pool, relogio }, construir, decId, corpo());
    agora = 7_000;
    segura.release();
    await pendente;
    const [visto] = (await b.poolMigrator.query(`select stmt, lock from prazo_visto`)).rows;
    expect(emMs(visto.stmt)).toBeLessThanOrEqual(1_000);
    expect(emMs(visto.lock)).toBeLessThanOrEqual(1_000);
  } finally {
    await pool.end();
  }
});

it('(b) o relógio monotônico passa de 8 s no meio: 503 indisponivel e nada gravado', async () => {
  let agora = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => (agora += 1_000));
  const antes = await retratoDa(b, demandaId);
  await expect(registrarAndamento(deps, construir, decId, corpo({ fase: 'testando' }))).rejects.toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
  expect(await retratoDa(b, demandaId)).toEqual(antes);
});
```

(`emMs` copiado de `prazo-total-0019.test.ts`; DEC com pedido gerado e demanda em `pronta_para_decisao` no `beforeAll`.)

No `test/estatico/andamento.test.ts`, o AN-06 estático:

```ts
// AN-06: nenhum SET, transação própria, orçamento aninhado nem Promise.all no corpo do registro; executarComOrcamento
// uma vez só, com `undefined` no lugar da transação; e o mesmo nas duas funções que ele chama em outros arquivos.
import ts from 'typescript';
const PROIBIDOS = [/set\s+local/i, /set_config/, /\bcomTransacao\s*\(/, /\bPromise\.all\s*\(/];
function corpoDaFuncao(arquivo: string, nome: string): string {
  const fonte = ler(arquivo);
  const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true);
  let corpo = '';
  ts.forEachChild(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === nome && n.body) corpo = n.body.getText(sf);
  });
  return corpo;
}
describe('AN-06: prazo total sem piso por cima', () => {
  it('src/modules/andamento/**: nenhum SET, comTransacao nem Promise.all', () => {
    for (const a of codigoQueRoda.filter((x) => x.startsWith('src/modules/andamento/')))
      for (const re of PROIBIDOS) expect(ler(a), `${a} ${re}`).not.toMatch(re);
  });
  it('registrar.ts: executarComOrcamento uma vez, com undefined; sem parâmetro t', () => {
    const f = ler('src/modules/andamento/registrar.ts');
    expect(f.match(/executarComOrcamento\(/g)).toHaveLength(1);
    expect(f).toMatch(/executarComOrcamento\(deps\.pool, ator, 'padrao', undefined,/);
    expect(f).not.toMatch(/\bt\?:\s*Transacao/);
  });
  it.each([
    ['src/modules/demandas/transicoes.ts', 'mudarStatusPeloConstruir'],
    ['src/modules/limites.ts', 'conferirLimiteDeAndamento'],
  ])('%s: %s sem SET, transação própria, orçamento aninhado nem Promise.all', (arquivo, nome) => {
    const corpo = corpoDaFuncao(arquivo, nome);
    expect(corpo.length).toBeGreaterThan(0);
    for (const re of [...PROIBIDOS, /executarComOrcamento\s*\(/]) expect(corpo, String(re)).not.toMatch(re);
  });
  it('a regra pega o caso plantado', () => {
    expect("await tx.execute(sql`set local lock_timeout = '9s'`)").toMatch(PROIBIDOS[0]!);
  });
});
```

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/andamento test/estatico/andamento.test.ts` → FAIL (módulo
  `./registrar` inexistente).

- [ ] **Passo 3: o serviço**

```ts
// src/modules/andamento/registrar.ts — o /construir informa o andamento de um Pedido de Construção (0.4.0; RF-02 a
// RF-06; ADR-30 a ADR-34; AN-01 a AN-08, AN-11). Só a integração `construir`, pela matriz. Numa transação com o
// orçamento `padrao` e prazo total (AN-06): sem transação de quem chama e sem SET no corpo. Nesta ordem (RF-05):
//   1. trava do pedido (`pedido:<decId>`, a da entrega e do recebimento);
//   2. só DEC com pedido gerado por pessoa, na demanda do próprio DEC (AN-03): senão, o mesmo 404 de DEC inexistente,
//      sem travar a demanda nem gravar;
//   3. trava da demanda; tudo o que decide é lido depois dela (ADR-32);
//   4. mesmo estado (os cinco campos): nada, 204 (vem antes dos 409, CA-05.9);
//   5. DEC não vigente: 409 (P-01);
//   6. contradição com status final: 409 (P-02), com status e tipo da linha travada (AN-04);
//   7. limite (60 por DEC, 600 no total), sob a última trava (ADR-31, AN-08);
//   8. a linha nova, com o prefixo do ator resolvido; a transição, se a tabela mandar; o evento, se mudou o marco.
// Nada enfileira job, dispara agente, manda aviso nem grava log (a linha de rota() basta, AN-11).
import { eq } from 'drizzle-orm';
import { andamentoConstrucao, pacoteDecisao } from '../../db/schema';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { atorDesconhecido, type Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { mudarStatusPeloConstruir } from '../demandas/transicoes';
import { registrarEvento } from '../historico/registrar';
import { executarComOrcamento } from '../integracoes/tempo-limite';
import { conferirLimiteDeAndamento } from '../limites';
import { aprovadoVigente } from '../pacotes-decisao/substituido';
import { pedidoGeradoPorPessoa, travarPedido } from '../pedido-construcao/pendentes';
import { travarDemanda } from '../versoes';
import { ultimoAndamento } from './consultas';
import { decidirPorStatus, lerAndamento, marcoDoEvento, mesmoEstado, mudancaDeMarco, type EstadoDoAndamento } from './regras';
import { MENSAGENS_ANDAMENTO, type CorpoAndamento } from './schemas';

export type DepsAndamento = Pick<Deps, 'pool' | 'relogio'>;

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

// O prefixo só do ator resolvido; segunda barreira depois de autorizar (IN-02).
function prefixoDoConstruir(ator: Ator): string {
  switch (ator.tipo) {
    case 'integracao':
      if (ator.integracao === 'construir') return ator.prefixoToken;
      throw new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);
    case 'pessoa':
    case 'agente':
    case 'sistema':
      throw new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);
    default:
      return atorDesconhecido(ator);
  }
}

export async function registrarAndamento(deps: DepsAndamento, ator: Ator, decId: string, corpo: CorpoAndamento): Promise<void> {
  autorizar(ator, 'registrar_andamento');
  const prefixo = prefixoDoConstruir(ator);
  await executarComOrcamento(deps.pool, ator, 'padrao', undefined, async (t) => {
    const { tx } = t;
    await travarPedido(tx, decId);
    const gerado = await pedidoGeradoPorPessoa(tx, decId);
    if (!gerado) throw naoEncontrado();
    const [dec] = await tx.select({ demandaId: pacoteDecisao.demandaId }).from(pacoteDecisao).where(eq(pacoteDecisao.id, decId));
    if (!dec || dec.demandaId !== gerado.demandaId) throw naoEncontrado();
    const linha = await travarDemanda(tx, dec.demandaId);

    const anterior = lerAndamento(await ultimoAndamento(tx, linha.id));
    const novo: EstadoDoAndamento = { decId, fase: corpo.fase, tarefasProntas: corpo.tarefasProntas, tarefasTotal: corpo.tarefasTotal, statusConstrucao: corpo.status };
    if (mesmoEstado(anterior, novo)) return;
    if ((await aprovadoVigente(tx, linha.id))?.id !== decId) throw new ErroDominio('conflito', MENSAGENS_ANDAMENTO.decSubstituido);
    const decisao = decidirPorStatus({ status: linha.status, tipo: linha.tipo }, novo.statusConstrucao);
    if (decisao.tipo === 'recusa') throw new ErroDominio('conflito', MENSAGENS_ANDAMENTO.statusFinal);
    await conferirLimiteDeAndamento(tx, ator, decId, deps.relogio);

    await tx.insert(andamentoConstrucao).values({
      demandaId: linha.id,
      decId,
      fase: novo.fase,
      tarefasProntas: novo.tarefasProntas,
      tarefasTotal: novo.tarefasTotal,
      statusConstrucao: novo.statusConstrucao,
      atorTokenPrefixo: prefixo,
      gravadoEm: deps.relogio.agora(),
    });
    if (decisao.para !== null) await mudarStatusPeloConstruir(t, deps, ator, linha, novo.statusConstrucao);
    if (mudancaDeMarco(anterior, novo))
      await registrarEvento(
        tx,
        {
          ator,
          demandaId: linha.id,
          entidade: 'pacote_decisao',
          entidadeId: decId,
          acao: 'andamento_registrado',
          antes: anterior ? marcoDoEvento(anterior) : null,
          depois: marcoDoEvento(novo),
        },
        deps.relogio,
      );
  });
}
```

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`. `PISO` ganha os três arquivos. Na entrega:
  G4 vazio e o tempo de cada arquivo novo.

### T08. Rota `POST /api/pedidos-construcao/[decId]/andamento`, contrato do `/construir`, limite e sentinelas

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (rota nova de escrita, autorização) · **Cobre:** RF-01 a RF-03 e
RF-12 pela rota, RNF-03, RNF-04, RNF-07, CA-01.1, CA-01.2, CA-01.4, CA-01.5, CA-02.1 a CA-02.7, CA-03.1 a CA-03.4 (byte a
byte), CA-12.1 a CA-12.5, AN-01 (c, d), AN-02 (pela rota), AN-03 (pela rota), AN-07 (pela rota), AN-11 (sentinelas e
log) · **Depende de:** T07

**Arquivos:**
- Criar: `src/app/api/pedidos-construcao/[decId]/andamento/route.ts`;
  `src/app/api/pedidos-construcao/andamento.test.ts` (rota, contrato, 404, 403, limite, log);
  `src/app/api/pedidos-construcao/andamento-422.test.ts` (AN-02 com o serviço trocado por um que falha se chamado);
  `test/transversal/sentinelas-andamento.test.ts` (D-05)
- Modificar: `test/pedidos-construcao.ts` (a chamada `andamento` em `chamadasDoConstruir`, como o `/construir` faz),
  `test/estatico/piso-de-assercoes.test.ts`
- Não muda: `test/matriz-rotas.test.ts` e `test/matriz-rotas-integracoes-qa.test.ts` (pegam a rota nova sozinhos:
  CA-01.4)

- [ ] **Passo 1: escrever os testes que falham**

Em `test/pedidos-construcao.ts`, dentro de `chamadasDoConstruir`, a chamada como `enviarAndamento` de
`ferramentas/construir/lib/andamento.mjs` (aa01e2d) monta: POST, `authorization: Bearer`, `accept: application/json`,
`content-type: application/json`, sem `Origin`, sem cookie, corpo `JSON.stringify(andamento)` com as quatro chaves na
ordem `fase, tarefasProntas, tarefasTotal, status`:

```ts
    andamento: (decId: string, corpo: unknown, op: Omit<OpChamada, 'corpo'> = {}) =>
      chamarRota(rotaAndamento.POST, {
        metodo: 'POST',
        caminho: `/api/pedidos-construcao/${encodeURIComponent(decId)}/andamento`,
        params: { decId },
        bearer: credencial(op),
        semOrigin: op.semOrigin ?? true,
        corpo,
        cabecalhos: { accept: 'application/json', ...op.cabecalhos },
      }),
```

`src/app/api/pedidos-construcao/andamento.test.ts`, no molde de `recebimento.test.ts` (banco, deps, `definirDepsParaTeste`,
token `construir` e `awave` reais, `substituirDestinoDoLog` guardando as linhas, relógio fixo), com estes casos:

1. **a rota:** exporta só `POST`; `meta` = `{ acao: 'registrar_andamento', rota: '/api/pedidos-construcao/[decId]/andamento' }`.
2. **CA-01.1 e CA-02.1 (contrato, RNF-07):** a requisição exata acima, com o corpo
   `{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao"}` num DEC com pedido gerado →
   204, corpo vazio (`await r.text()` igual a `''`), `cache-control: no-store`, `x-content-type-options: nosniff`, sem
   `location`; o mesmo envio de novo → 204.
3. **CA-02.6:** `entendendo_o_pedido 0/0` → 204; `-0` em `tarefasProntas` → 204 e a linha com 0.
4. **CA-02.5 e CA-02.7:** JSON malformado → 400; `content-type: text/plain` → 415; `DEC-xyz` → 404 sem consulta (o
   retrato do banco igual); corpo de 600 KB → 413; nada gravado em nenhum.
5. **CA-03.1 a CA-03.4 e AN-03 (byte a byte):** a resposta inteira (status, cabeçalhos sem `date`, corpo; a função
   `foto` de `visibilidade-agente-0019.test.ts`) de `DEC-DEM-20991231-9999-v1` é igual à do DEC sem `pedido_gerado`, à
   do DEC com `pedido_gerado` de agente e de sistema, e à do DEC com `pedido_gerado` de pessoa apontando outra demanda;
   o corpo é `{ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO }`; o retrato das demandas igual.
6. **CA-05.8 e status final pela rota:** 409 `conflito` com as duas mensagens de `MENSAGENS_ANDAMENTO`.
7. **CA-01.2 (AN-01 c):** com corpo válido num DEC com pedido gerado: token `awave`, os quatro agentes, `cto` e
   `administradora` (sessão com 2FA, `Origin` certo) → 403 `{ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao }`
   e o retrato igual.
8. **CA-01.5 (AN-01 d):** o token `construir` em `GET /api/demandas/:id`, `POST /api/demandas`, `PATCH /api/demandas/:id`
   → 403.
9. **CA-12.1 a CA-12.5 (AN-07 pela rota):** com 60 linhas do DEC no último minuto (`inserirAndamento`), estado novo →
   429 `{ erro: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem }`, nada gravado; uma gravação e depois 200
   envios no mesmo estado → todos 204 (CA-12.2); DEC A no limite e DEC B → 204; 600 linhas num terceiro DEC (D-14) e
   estado novo em outro → 429 total (CA-12.3); 30 envios de estados diferentes, um a cada 2 min (`relogio.avancar`) →
   todos 204 (CA-12.4); 59 linhas e dois envios de estados diferentes ao mesmo tempo (`Promise.all`) → um 204 e um 429
   (CA-12.5).
10. **o que o `/construir` faz com cada resposta (01, seção 4):** 204 → `enviado`; 404 → `fora_do_orquestrador`; 409, 422
    e 400 → `recusado`; 429 → `erro`. Confira só os status que a rota devolve em cada caso acima, numa tabela no teste,
    sem importar o `.mjs` da estruturaAutonoma.
11. **log (RNF-04, AN-11):** a linha do pino de cada chamada acima tem `evento: 'requisicao'`, `rota` igual ao padrão,
    `status` e `atorTipo: 'integracao'`, e não contém o `decId`, o prefixo do token, `wsod_`, `construindo` nem `17`
    fora do campo `ms`/`status` (compare o JSON da linha sem `ms`).

`src/app/api/pedidos-construcao/andamento-422.test.ts`:

```ts
// AN-02 (b): o corpo é conferido antes de qualquer consulta ao DEC. O serviço é trocado por um que falha se chamado, e
// a resposta 422 é idêntica para um DEC que existe e para um que não existe. Token `construir` real (resolverAtor lê o
// token: a única consulta permitida).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('../../../modules/andamento/registrar', () => ({
  registrarAndamento: vi.fn(async () => {
    throw new Error('o serviço não pode ser chamado com corpo inválido');
  }),
}));
// … imports de banco, deps, token, chamadasDoConstruir, MENSAGENS_ANDAMENTO e o mock …

const INVALIDOS: unknown[] = [
  { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao', nota: 'x' },
  { tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' },
  { fase: 'Construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' },
  { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'entregue' },
  { fase: 'construindo', tarefasProntas: 10, tarefasTotal: 9, status: 'em_construcao' },
  { fase: 'construindo', tarefasProntas: 1.5, tarefasTotal: 9, status: 'em_construcao' },
  { fase: 'construindo', tarefasProntas: '9', tarefasTotal: 17, status: 'em_construcao' },
  { fase: 'construindo', tarefasProntas: 0, tarefasTotal: 1000, status: 'em_construcao' },
  [],
  null,
  'texto',
  '{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao","__proto__":{"x":1}}',
  '{"fase":"construindo","tarefasProntas":1,"tarefasTotal":1e400,"status":"em_construcao"}',
];

it.each(INVALIDOS.map((c, i) => [i, c] as const))('corpo %i: 422 igual para DEC existente e inexistente, sem chamar o serviço', async (_i, c) => {
  const corpo = typeof c === 'string' ? c : JSON.stringify(c);
  const a = await foto(await construir.andamento('DEC-DEM-20261112-0001-v1', corpo));
  const z = await foto(await construir.andamento('DEC-DEM-20991231-9999-v1', corpo));
  expect(a.status).toBe(422);
  expect(JSON.parse(a.corpo)).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_ANDAMENTO.corpoInvalido });
  expect(z).toEqual(a);
  expect(registrarAndamento).not.toHaveBeenCalled();
});
```

(`null` como corpo: mande o texto `'null'`, porque `chamarRota` trata `undefined` como "sem corpo".)

`test/transversal/sentinelas-andamento.test.ts` (D-05), com a captura de `test/transversal/sentinelas.test.ts` (pino,
console, transporte falso do Sentry iniciado do mesmo jeito, linhas 60 a 77 de lá): envia pela rota, com o token
`construir`, corpos com uma sentinela própria (`'SENTINELA-ANDAMENTO-7c1e'`) como valor de chave a mais, como nome de
chave a mais, como `fase` e como `status`; envia um corpo válido (204); lê a demanda pelo token `awave` numa demanda do
Awave com andamento gravado (`inserirAndamento`). No fim, a sentinela e o texto do token depois do prefixo não aparecem:
nas linhas do pino e do console, nos envelopes do Sentry, nas respostas, em nenhuma tabela do esquema `pgboss` (a
consulta de `sentinelas.test.ts`), em `andamento_construcao` (`row_to_json` de todas as linhas) nem em `evento`
(`antes::text`, `depois::text`).

- [ ] **Passo 2: ver falhar** — `pnpm test src/app/api/pedidos-construcao test/transversal/sentinelas-andamento.test.ts`
  → FAIL (rota inexistente).

- [ ] **Passo 3: a rota**

```ts
// POST /api/pedidos-construcao/:decId/andamento { fase, tarefasProntas, tarefasTotal, status } → 204 sem corpo (RF-02,
// 0.4.0). O /construir manda o Bearer, o JSON e nenhum Origin. Só a integração `construir`, pela matriz. O id passa pela
// regex antes de tudo (C-17), e o corpo pelo Zod antes de qualquer consulta: fora do formato, 422 sem eco (ADR-33,
// AN-02). Adaptador fino: autorização, erro, nosniff e no-store ficam em rota().
import { paramId, rota } from '../../../../../lib/rota';
import { registrarAndamento } from '../../../../../modules/andamento/registrar';
import { CORPO_INVALIDO_ANDAMENTO, corpoAndamentoSchema } from '../../../../../modules/andamento/schemas';

export const POST = rota(
  {
    acao: 'registrar_andamento',
    rota: '/api/pedidos-construcao/[decId]/andamento',
    params: paramId.versao('decId', 'DEC'),
    corpo: corpoAndamentoSchema,
    corpoInvalido: CORPO_INVALIDO_ANDAMENTO,
  },
  async ({ deps, ator, params, corpo }) => {
    await registrarAndamento(deps, ator, params.decId, corpo);
    return { status: 204 };
  },
);
```

- [ ] **Passo 4: ver passar** — `pnpm test` (com `test/matriz-rotas.test.ts` e `test/matriz-rotas-integracoes-qa.test.ts`
  cobrindo a rota nova sem mudança: CA-01.4), `pnpm lint`, `pnpm typecheck`. `PISO` ganha os três arquivos novos.

---

## Fase 3 — Leituras

### T09. Andamento nas vistas de pessoa e do Awave; varredura das leituras a partir da matriz (AN-09)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (visibilidade por tipo de ator, BOLA e BOPLA) · **Cobre:** RF-09
(dado), RF-10, RF-11, CA-04.6 (leitura sem 500), CA-10.1 a CA-10.5, CA-11.1 a CA-11.3, AN-06 (c, D-06), AN-09, ADR-35,
G9 · **Depende de:** T05, T06, T08

**Arquivos:**
- Modificar: `src/modules/demandas/consultas.ts` (`DemandaVista.andamento`, `obterDemanda`, `DemandaVistaMinima` no
  tipo, `DemandaVistaDaIntegracao`, `vistaDaIntegracao`, `obterDemandaDaIntegracao`); os testes da G5 (sete chaves e
  fixtures com `andamento: null`); `test/estatico/piso-de-assercoes.test.ts`
- Criar: `src/app/api/demandas/leitura-awave-andamento.test.ts`, `test/transversal/visibilidade-andamento.test.ts`
- Não muda (G4): os corpos de `vistaMinimaDaDemanda`, `paginaDeDemandas`, `resumoDe`, `listarDemandasPara`,
  `lerDemandaPara`; as vistas de ESP, RSK e DEC; `entrada-agente.ts`

- [ ] **Passo 1: escrever os testes que falham**

`src/app/api/demandas/leitura-awave-andamento.test.ts` (rotas, tokens e Postgres reais; a demanda do Awave criada pelo
`POST` dele; ESP, RSK e DEC dela pela pessoa, depois da confirmação; andamento pelo `inserirAndamento`):
1. **CA-10.1:** demanda do Awave com `construindo 9/17` → `GET` do Awave 200 com exatamente
   `['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']` e `andamento` com exatamente
   `['atualizadoEm', 'fase', 'tarefasProntas', 'tarefasTotal']` (`atualizadoEm` em ISO).
2. **CA-10.2:** sem andamento → `andamento: null`.
3. **CA-10.3:** demanda de pessoa com andamento, lida pelo Awave → a `foto` igual à do id inexistente.
4. **CA-10.4:** o 201 do `POST` do Awave tem as sete chaves com `andamento: null` e é igual ao `GET` seguinte.
5. **CA-10.5:** demanda do Awave levada a `devolvida` pelo `cancelado` (pela rota de andamento, com o token `construir`) →
   `status: 'devolvida'` e `andamento` sem `statusConstrucao` nem `decId`.
6. **CA-11.1:** a pessoa (cookie) lê a mesma demanda e recebe `andamento` com os seis campos.
7. **CA-11.2 e CA-11.3:** o agente lê com as chaves da vista mínima de hoje (sem `andamento`); os itens de
   `GET /api/demandas` para pessoa e agente têm as chaves da 0.3.1 (a lista exata de `demandas.test.ts`).
8. **unidade (AN-09):** `vistaDaDemandaPara(awave, d)` com `d.andamento` de seis campos (e `d.responsavel` do Awave)
   devolve `andamento` com quatro.
9. **CA-04.6 (leitura):** `lerAndamento` é o único caminho: um `andamento_construcao` não tem como ficar fora do
   esquema (CHECK, T01), então o teste troca `ultimoAndamento` por uma linha fora do esquema com `vi.spyOn` no módulo de
   consultas do andamento e confere `andamento: null` sem 500 na vista de pessoa e na do Awave (se o `spyOn` de ESM não
   pegar, use `vi.mock` parcial do módulo num arquivo à parte).
10. **AN-06 (c), D-06:** com o pool de uma conexão segura e 7 s gastos na espera, o GET do Awave responde 200 com o
    andamento; com o relógio monotônico avançando 1 s por leitura, 503 `indisponivel` (molde de `registrar-prazo.test.ts`,
    chamando `lerDemandaPara({ db, pool }, awave, id)`).

`test/transversal/visibilidade-andamento.test.ts` (AN-09, a lição da listagem de DEC da 0019: parte de `MATRIZ`):

```ts
// AN-09: nenhuma leitura de agente devolve o andamento. Para toda ação com agente na linha da matriz, cada rota dessa
// ação é chamada pelos quatro agentes sobre uma demanda de pessoa com andamento `testando 987/988`; nenhuma resposta tem
// as chaves do andamento nem os números. Toda ação com agente tem ao menos uma rota chamada (a lista sai da matriz).
const CHAVES = ['"andamento"', '"fase"', '"tarefasProntas"', '"tarefasTotal"', '"statusConstrucao"'];
const arquivos = globSync('src/app/api/**/route.ts', { cwd: raiz }).filter((a) => !/^src\/app\/api\/(auth|saude)\//.test(a)).sort();
// beforeAll: banco, deps, tokens dos quatro agentes (criarTokenServico), uma demanda de pessoa com ESP, RSK, DEC
// aprovado e pedido gerado (preparadorDePedidos) e a linha `testando 987/988` (inserirAndamento).
it('varre MATRIZ × rotas × quatro agentes', async () => {
  const acoesComAgente = ACOES.filter((a) => MATRIZ[a].agentes.length > 0);
  const chamadas = new Set<string>();
  for (const arquivo of arquivos)
    for (const metodo of METODOS) {
      const h = ((await import(`${raiz}${arquivo}`)) as Record<string, HandlerRota | undefined>)[metodo];
      if (!h || MATRIZ[h.meta.acao].agentes.length === 0) continue;
      const params = paramsDoCenario(h.meta.rota); // id → demanda, espId/rskId/decId → as versões dela, agente → 'risco'
      for (const agente of AGENTES) {
        const r = await chamarRota(h, { metodo, caminho: caminhoCom(h.meta.rota, params), params, bearer: tokens[agente], semOrigin: true, corpo: metodo === 'GET' ? undefined : {} });
        const texto = await r.text();
        for (const k of CHAVES) expect(texto, `${metodo} ${arquivo} ${agente}`).not.toContain(k);
        expect(texto, `${metodo} ${arquivo} ${agente}`).not.toMatch(/\b98[78]\b/);
      }
      chamadas.add(h.meta.acao);
    }
  expect([...chamadas].sort()).toEqual([...acoesComAgente].sort());
});
it('a entrada montada para o provedor falso, nos quatro agentes, não tem o andamento', async () => {
  // montarEntrada de src/modules/agentes/entrada-agente.ts, chamada como em entrada-agente.test.ts, para a mesma demanda.
});
```

(`caminhoCom` é o de `test/requisicao.ts`: exporte-o de lá, sem mudar o comportamento, ou copie a linha.)

- [ ] **Passo 2: ver falhar** — `pnpm test src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts`
  → FAIL nos casos do Awave e da pessoa (sem a chave). A varredura de agente já passa (lista de permissão de hoje):
  nomeie-a na entrega como guarda (G3.1).

- [ ] **Passo 3: o código** (em `src/modules/demandas/consultas.ts`)

```ts
import { paraIntegracao, type AndamentoDaIntegracao, type AndamentoVista } from '../andamento/schemas';
import { subconsultaDoUltimoAndamento, ultimoAndamento } from '../andamento/consultas';
import { lerAndamento } from '../andamento/regras';

// DemandaVista ganha, depois de agentesEmAndamento:
//   // 0.4.0 (RF-09, RF-11): o último andamento informado pelo /construir, só na vista de pessoa (seis campos).
//   andamento: AndamentoVista | null;
// obterDemanda, depois de agentesEmAndamentoDe, em sequência (a mesma conexão):
//   const andamento = lerAndamento(await ultimoAndamento(db, id));
//   … e `andamento` no objeto devolvido.
// DemandaVistaMinima: Omit<DemandaVista, 'solicitanteNome' | 'anexos' | 'responsavel' | 'especificacoes' | 'pareceresRisco' | 'pacotesDecisao' | 'andamento'> & { … }
//   (o corpo de vistaMinimaDaDemanda não muda: a chave nunca entrou nela).

// IN-08 e AN-09: sete chaves; o andamento em quatro, montado chave a chave (paraIntegracao).
export type DemandaVistaDaIntegracao = { id: string; titulo: string; tipo: Tipo; status: Status; criadaEm: Date; atualizadaEm: Date; andamento: AndamentoDaIntegracao | null };

export const vistaDaIntegracao = (
  d: Pick<DemandaVista, 'id' | 'titulo' | 'tipo' | 'status' | 'solicitanteNome' | 'criadaEm' | 'atualizadaEm' | 'andamento'>,
): DemandaVistaDaIntegracao => ({
  id: d.id,
  titulo: textoMinimo(d.titulo, nomesDoSolicitante(d.solicitanteNome)),
  tipo: d.tipo,
  status: d.status,
  criadaEm: d.criadaEm,
  atualizadaEm: d.atualizadaEm,
  andamento: paraIntegracao(d.andamento),
});

// ADR-23, ADR-35 e D-09: a autoria no mesmo WHERE do id, e o último andamento juntado na mesma consulta. Outro autor e
// id inexistente dão o mesmo 404, da mesma consulta.
export async function obterDemandaDaIntegracao(db: Db, ator: AtorIntegracao, id: string): Promise<DemandaVistaDaIntegracao> {
  const ua = subconsultaDoUltimoAndamento(db, id);
  const [l] = await db
    .select({
      id: demanda.id,
      titulo: demanda.titulo,
      tipo: demanda.tipo,
      status: demanda.status,
      solicitanteNome: demanda.solicitanteNome,
      criadaEm: demanda.criadaEm,
      atualizadaEm: demanda.atualizadaEm,
      andamento: { decId: ua.decId, fase: ua.fase, tarefasProntas: ua.tarefasProntas, tarefasTotal: ua.tarefasTotal, statusConstrucao: ua.statusConstrucao, gravadoEm: ua.gravadoEm },
    })
    .from(demanda)
    .leftJoin(ua, eq(ua.demandaId, demanda.id))
    .where(and(eq(demanda.id, id), eq(demanda.autorTipo, 'integracao'), eq(demanda.autorId, ator.integracao)));
  if (!l) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  return vistaDaIntegracao({ ...l, andamento: lerAndamento(l.andamento) });
}
```

Depois, as mudanças da G5 (sete chaves; fixtures com `andamento: null`), e só elas.

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; na entrega, o
  `git diff 0ac099a -- src/modules/demandas/consultas.ts` com os corpos congelados da G4 sem linha mudada, e a tabela
  G9 conferida contra a varredura (as ações chamadas). `PISO` ganha os dois arquivos novos.

---

## Fase 4 — Seed

### T10. Seed fictício com demandas em construção, andamento e os dois DEC da V-02

**Engenheiro:** `engenheiro-backend` · **Risco:** baixo (só banco de desenvolvimento e de homologação) · **Cobre:** base
dos e2e da T12 a T14, V-02 (P-07 do 01; AN-15 na parte do seed), D-07, D-11 · **Depende de:** T05, T07

**Arquivos:**
- Modificar: `scripts/seed-ficticio.ts`; os testes do seed da G5
- Criar: `scripts/seed-andamento.test.ts`

As oito demandas novas, todas `melhoria`, `sob_medida`, da conta `sem2fa` (C-36: a `sem2fa` fica com 28 de 30 demandas e
33 de 60 versões na primeira hora), com contexto preenchido, títulos em `TITULOS_DO_E2E`:

| Chave | Título | Estado final | Andamento (ator `construir`, prefixo `ficticio`) |
|---|---|---|---|
| `andamentoConstruindo` | "Andamento: construindo (fictício)" | `em_construcao` (pelo construir) | `entendendo_o_pedido 0/0` → `construindo 9/17` |
| `andamentoRevisando` | "Andamento: revisando e entregando (fictício)" | `em_construcao` | `revisando_e_entregando 17/17` |
| `andamentoConcluido` | "Andamento: construção concluída (fictício)" | `em_construcao` | `documentando 12/12 construido` |
| `andamentoCancelado` | "Andamento: construção cancelada (fictício)" | `devolvida` (pelo construir) | `construindo 3/8` → `construindo 3/8 cancelado` |
| `andamentoSemPlano` | "Andamento: sem plano de tarefas (fictício)" | `em_construcao` | `entendendo_o_pedido 0/0` |
| `andamentoParaEnviar` | "Andamento: para o /construir enviar (fictício)" | `aprovada` (pela "cto") | nenhum (V-02 e e2e local) |
| `andamentoSemPedido` | "Andamento: pacote sem pedido gerado (fictício)" | `pronta_para_decisao`, DEC aprovado, **sem** `pedido_gerado` | nenhum (V-02, 404) |
| `emConstrucaoSemAndamento` | "Em construção sem andamento (fictício)" | `em_construcao` (pela "cto") | nenhum (CA-07.2, CA-08.4) |

Para as seis primeiras: ESP, RSK e DEC da `sem2fa`, DEC `cto` aprovado pela "cto" na opção A e Pedido gerado pela
"cto"; depois, `entregarPedido` e `receberPedido` com `CONSTRUIR_DO_SEED` (D-11: fora da lista de pendentes); depois,
`alterarDemanda` da "cto" para `aprovada`. Daí, para A a E, `criarDadosDoAndamento` grava cada passo: `travarDemanda`,
`mudarStatusPeloConstruir(t, deps, CONSTRUIR_DO_SEED, linha, statusConstrucao)`, `insert` em `andamentoConstrucao` com
`atorTokenPrefixo: 'ficticio'` e `gravadoEm: deps.relogio.agora()`, e o `andamento_registrado` por `registrarEvento`
com `antes` e `depois` de `marcoDoEvento`, só quando `mudancaDeMarco` (as mesmas regras do serviço, sem chamá-lo: D-07).
A `andamentoSemPedido`: ESP, RSK, DEC aprovado, sem gerar. A `emConstrucaoSemAndamento`: ESP, RSK, DEC aprovado, e a
"cto" leva a `aprovada` e depois a `em_construcao`.

- [ ] **Passo 1: o teste que falha**

```ts
// scripts/seed-andamento.test.ts — T10: o seed deixa as demandas de andamento no estado da tabela do plano, sem token,
// e a lista de pendentes do /construir igual à da 0.3.0. Postgres real; SEED_FICTICIO=1; banco vazio.
// Para cada chave da tabela: status, número de linhas em andamento_construcao, o último andamento (fase, números,
// situação, prefixo `ficticio`), os eventos `status_alterado` do ator integracao/construir e `andamento_registrado`
// (A: 2; B, C, E: 1; D: 2, e dois status_alterado); a `andamentoParaEnviar` com pedido_gerado de pessoa e sem andamento;
// a `andamentoSemPedido` com DEC aprovado e sem pedido_gerado; `listarPendentes` devolve só o DEC da `pedidoParaBuscar`;
// `token_servico` vazio; nenhum título ou texto com dado que não seja fictício ("(fictício)" em todo título novo).
```

Escreva os `it` acima por inteiro, no molde de `scripts/seed-integracoes.test.ts` (o mesmo preparo de deps e a mesma
chamada de `seedFicticio`).

- [ ] **Passo 2: ver falhar** — `pnpm test scripts/seed-andamento.test.ts` → FAIL (chaves inexistentes).

- [ ] **Passo 3: o seed** — as oito entradas em `TITULOS_DO_E2E` e em `DEMANDAS_DOS_PEDIDOS` (ou num
  `DEMANDAS_DO_ANDAMENTO` novo somado ao `TOTAL_DEMANDAS_DO_SEED`), e `criarDadosDoAndamento(t, deps, pessoas)` chamada
  no fim de `criarDadosDasIntegracoes`. O comentário do topo do arquivo ganha o parágrafo "0.4.0 (DEC-DEM-20261111-0017-v1,
  T10)". Depois, as mudanças da G5 nos testes do seed.

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`.

---

## Fase 5 — Painel

### T11. Rótulos, textos e regras puras do andamento na tela (selo, seção, histórico)

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-06 (texto), RF-08 e RF-09 (regras puras),
CA-06.5, AN-12 (rótulos por `Object.hasOwn`, `textoDoEvento` com valor conferido, link só com `RE_ID_DEC`), D-03 ·
**Depende de:** T05

**Arquivos:**
- Modificar: `src/components/rotulos.ts` (`ROTULO_FASE`, `ROTULO_SITUACAO_CONSTRUCAO`, `textoDoEvento` completo)
- Criar: `src/components/dados-do-andamento.ts`, `src/components/dados-do-andamento.test.ts`,
  `src/components/rotulos-andamento.test.ts`

- [ ] **Passo 1: os testes que falham**

```ts
// src/components/rotulos-andamento.test.ts — 03, seções 5.7 e 8; AN-12.
import { describe, expect, it } from 'vitest';
import type { EventoVisivel } from '../modules/historico/consultas';
import { ROTULO_FASE, ROTULO_SITUACAO_CONSTRUCAO, textoDoEvento } from './rotulos';

const DEC = 'DEC-DEM-20991231-0001-v1';
const ev = (depois: Record<string, unknown> | null, entidadeId = DEC): EventoVisivel => ({
  id: 1,
  ocorridoEm: new Date('2026-11-12T14:32:00Z'),
  ator: { tipo: 'integracao', integracao: 'construir', prefixo: 'a1b2c3d4' },
  entidade: 'pacote_decisao',
  entidadeId,
  acao: 'andamento_registrado',
  antes: null,
  depois,
});
const d = (fase: string, p: unknown, t: unknown, s: string) => ({ fase, tarefasProntas: p, tarefasTotal: t, statusConstrucao: s });

it('rótulos da 03, seção 8', () => {
  expect(ROTULO_FASE).toEqual({
    entendendo_o_pedido: 'Entendendo o pedido',
    planejando: 'Planejando',
    construindo: 'Construindo',
    testando: 'Testando',
    revisando_e_entregando: 'Revisando e entregando',
    documentando: 'Documentando',
  });
  expect(ROTULO_SITUACAO_CONSTRUCAO).toEqual({ em_construcao: 'Em andamento', construido: 'Concluída', cancelado: 'Cancelada' });
});

describe('textoDoEvento(andamento_registrado), 03 5.7', () => {
  it.each([
    [d('construindo', 9, 17, 'em_construcao'), `Registrou o andamento de ${DEC}: Construindo, 9 de 17 tarefas`],
    [d('documentando', 12, 12, 'construido'), `Registrou o fim da construção de ${DEC}: Documentando, 12 de 12 tarefas`],
    [d('construindo', 3, 8, 'cancelado'), `Registrou o cancelamento da construção de ${DEC}: Construindo, 3 de 8 tarefas`],
    [d('entendendo_o_pedido', 0, 0, 'em_construcao'), `Registrou o andamento de ${DEC}: Entendendo o pedido`],
    [d('planejando', 0, 1, 'em_construcao'), `Registrou o andamento de ${DEC}: Planejando, 0 de 1 tarefa`],
    [d('<img src=x onerror=alert(1)>', 1, 2, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', '9', 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', 1.5, 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', 18, 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', 9, 17, 'entregue'), `Registrou o andamento de ${DEC}`],
    [d('__proto__', 9, 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [null, `Registrou o andamento de ${DEC}`],
  ])('%o', (depois, texto) => {
    expect(textoDoEvento(ev(depois))).toBe(texto);
  });
  it('DEC fora do formato: "um pacote de decisão"', () => {
    expect(textoDoEvento(ev(d('construindo', 9, 17, 'em_construcao'), 'DEC-x'))).toBe('Registrou o andamento de um pacote de decisão: Construindo, 9 de 17 tarefas');
  });
});
```

`src/components/dados-do-andamento.test.ts`: `seloDeFase` para cada linha da 03, 4.1 (texto visível, texto do leitor
com o singular de total 1, cor) e `null` em todo status diferente de `em_construcao`, com andamento `null` e com fase
fora da lista (montada à mão); `secaoDoAndamento` com: `construindo 9/17` (link do DEC, fase, situação, barra com valor 9,
máximo 17, `aria-valuetext` "9 de 17 tarefas", recurso "9 de 17"), total 0 (texto da 03 e sem barra), total 1 ("0 de 1
tarefa"), `cancelado` (alerta), pacote do `decId` com `substituido: true` (alerta com o id), `decId` fora de `RE_ID_DEC`
("Não informado" e sem link), a linha da data (`formatar` injetado e `iso`) e a nota; `null` sem andamento.

- [ ] **Passo 2: ver falhar** — `pnpm test src/components` → FAIL.

- [ ] **Passo 3: o código**

```ts
// src/components/rotulos.ts (acréscimos; tipos de ../db/schema/andamento)
// 0.4.0 (03, seção 8): as fases e a situação da construção. A situação não usa os rótulos de status da demanda.
export const ROTULO_FASE: Readonly<Record<FaseAndamento, string>> = Object.freeze({
  entendendo_o_pedido: 'Entendendo o pedido',
  planejando: 'Planejando',
  construindo: 'Construindo',
  testando: 'Testando',
  revisando_e_entregando: 'Revisando e entregando',
  documentando: 'Documentando',
});
export const ROTULO_SITUACAO_CONSTRUCAO: Readonly<Record<StatusConstrucao, string>> = Object.freeze({
  em_construcao: 'Em andamento',
  construido: 'Concluída',
  cancelado: 'Cancelada',
});
const faseNaTela = (v: unknown): string | null => (typeof v === 'string' && Object.hasOwn(ROTULO_FASE, v) ? ROTULO_FASE[v as FaseAndamento] : null);
const tarefaNaTela = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 999 ? v : null);
export const tarefasEmTexto = (p: number, t: number): string => `${p} de ${t} ${t === 1 ? 'tarefa' : 'tarefas'}`;
const INICIO_DO_EVENTO: Readonly<Record<StatusConstrucao, string>> = Object.freeze({
  em_construcao: 'Registrou o andamento de',
  construido: 'Registrou o fim da construção de',
  cancelado: 'Registrou o cancelamento da construção de',
});

// no switch de textoDoEvento, no lugar do caso genérico da T05:
    case 'andamento_registrado': {
      const dec = doPacote(e.entidadeId);
      const fase = faseNaTela(d.fase);
      const p = tarefaNaTela(d.tarefasProntas);
      const t = tarefaNaTela(d.tarefasTotal);
      const sc = typeof d.statusConstrucao === 'string' && Object.hasOwn(INICIO_DO_EVENTO, d.statusConstrucao) ? (d.statusConstrucao as StatusConstrucao) : null;
      if (!fase || !sc || p === null || t === null || p > t) return `Registrou o andamento de ${dec}`;
      return `${INICIO_DO_EVENTO[sc]} ${dec}: ${fase}${t > 0 ? `, ${tarefasEmTexto(p, t)}` : ''}`;
    }
```

```ts
// src/components/dados-do-andamento.ts — regras puras da tela do andamento (0.4.0; 03, seções 4, 5.2, 5.3 e 8; D-03,
// D-16). Recebem só o AndamentoVista já conferido por lerAndamento; rótulo por Object.hasOwn; link só com RE_ID_DEC.
// Só tipos vêm dos módulos (vai ao navegador).
export const TEXTOS_ANDAMENTO = {
  secao: 'Andamento da construção',
  termos: { pedido: 'Pedido de Construção', fase: 'Fase', situacao: 'Situação', tarefas: 'Tarefas prontas' },
  semPlano: 'Nenhuma tarefa contada. O plano de tarefas ainda não foi feito, ou este pedido não tem plano.',
  cancelada: 'A construção deste pedido foi cancelada no /construir.',
  substituido: (decId: string) =>
    `Este andamento é do pedido de ${decId}, cujo pacote foi substituído por um aprovado mais novo. O andamento do pedido novo aparece aqui quando o /construir começar.`,
  ultimaMudanca: 'Última mudança informada pelo /construir em ',
  nota: 'Esta página não se atualiza sozinha. Recarregue para ver o andamento mais novo.',
  erroNaFila: 'Não foi possível ler o andamento da construção. A fila aparece sem a fase das demandas em construção.',
  seloConcluida: 'Construção concluída',
  seloCancelada: 'Construção cancelada',
} as const;

export type SeloDeFase = { visivel: string; leitor: string; cor: 'marinho' | 'positivo' | 'tinta-media' };
export function seloDeFase(status: Status, a: AndamentoVista | null): SeloDeFase | null;
// em_construcao + total > 0: "<Fase> · p/t" / "Andamento: <Fase>, p de t tarefas prontas." (total 1: "tarefa pronta");
// total 0: "<Fase>" / "Andamento: <Fase>."; construido: seloConcluida / "Andamento: construção concluída.", positivo;
// cancelado: seloCancelada / "Andamento: construção cancelada.", tinta-media; marinho no resto.

export type SecaoDoAndamento = {
  dec: { id: string; href: string | null } | null; // null → "Não informado"
  fase: string;
  situacao: string;
  tarefas: { tipo: 'barra'; texto: string; valor: number; maximo: number; valorTexto: string; recurso: string } | { tipo: 'sem_plano'; texto: string };
  alertas: string[]; // cancelada e substituído, nessa ordem
  ultimaMudanca: { data: string; iso: string };
};
export function secaoDoAndamento(a: AndamentoVista | null, pacotes: readonly Pick<PacoteResumo, 'id' | 'substituido'>[], formatar: (d: Date) => string): SecaoDoAndamento | null;
```

Escreva o corpo das duas funções pelas regras dos comentários e da 03; o teste é o critério.

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`.

### T12. Fila: selo de fase na linha e no cartão, leitura por página e estado de erro

**Engenheiro:** `engenheiro-frontend` · **Risco:** medio (D-12) · **Cobre:** RF-08, CA-08.1 a CA-08.5, AN-12 (fila),
03 seção 4 (inclusive 4.4, erro só do andamento), C-04 (cadeia da leitura nova) · **Depende de:** T06, T10, T11

**Arquivos:**
- Modificar: `src/app/(painel)/demandas/leituras-da-fila.ts` (`andamentosDaPagina`), `page.tsx` (lê e passa),
  `fila.tsx` (`ResultadoDaFila` recebe `andamentos`; selo na célula Status; o alerta de erro), `CartoesDaFila.tsx` (o
  pedaço `SeloDaFase`, um só para tabela e cartão); `test/estatico/andamento.test.ts` (a página chama
  `andamentosDaPagina(`); e2e da G5 que leem a célula Status de demanda em construção
- Criar: `src/app/(painel)/demandas/fila-andamento.test.ts`, `e2e/andamento-fila.spec.ts`

- [ ] **Passo 1: os testes que falham**

- `fila-andamento.test.ts` (no molde de `fila.test.ts`, render no servidor): `ResultadoDaFila` com uma demanda em
  `em_construcao` e `construindo 9/17` → a célula Status tem o selo de status e, abaixo, `<span aria-hidden="true">`
  "Construindo · 9/17" e o `sr-only` "Andamento: Construindo, 9 de 17 tarefas prontas."; o cartão, o mesmo; demanda em
  `devolvida` com andamento e em `em_construcao` sem andamento → sem selo; `andamentos: null` → o `Alerta` `atencao` com
  `TEXTOS_ANDAMENTO.erroNaFila` acima do título do resultado e nenhum selo; nenhum `style=` no HTML.
  `andamentosDaPagina` com uma `db` falsa que lança → `null` e uma linha de log `painel_andamento_falhou` sem SQL nem ids;
  com linhas, só as que passam em `lerAndamento` entram no mapa.
- `test/estatico/andamento.test.ts`: `src/app/(painel)/demandas/page.tsx` chama `andamentosDaPagina(` dentro de
  `ListaDaFila` (a guarda de `PaginaDemandas` já é conferida por `leituras-da-fila.test.ts`).
- `e2e/andamento-fila.spec.ts` (conta "cto", só leitura, demandas do seed da T10; cada teste abaixo de 24 s):
  1. 1280 × 720, `/demandas?status=em_construcao`: a linha da `andamentoConstruindo` mostra "Construindo · 9/17" e o
     texto oculto; a da `andamentoConcluido`, "Construção concluída"; a da `andamentoSemPlano`, só "Entendendo o pedido";
     a da `emConstrucaoSemAndamento`, nenhum selo; `/demandas?status=devolvida`: a `andamentoCancelado` sem selo
     (CA-08.1 a CA-08.4);
  2. o mesmo em 390 × 844, no cartão;
  3. 320 px: a `andamentoRevisando` mostra "Revisando e entregando · 17/17" sem rolagem lateral;
  4. axe sem violação com os selos, em 1280 × 720 e 390 × 844 (`semViolacoesNasDuasLarguras`) (CA-08.5).

- [ ] **Passo 2: ver falhar** — `pnpm test "src/app/(painel)/demandas/fila-andamento.test.ts"` e `pnpm test:e2e` → FAIL.

- [ ] **Passo 3: o código**

```ts
// leituras-da-fila.ts (acréscimo)
// 0.4.0 (RF-08; 03, 4.4; ADR-35): o último andamento de cada demanda da página, numa consulta, já conferido por
// lerAndamento (AN-12, D-16). Leitura separada da lista: a falha vira null, a fila aparece sem selo e com o aviso da 03.
// O log não leva ids, SQL nem parâmetro.
export async function andamentosDaPagina(db: Db, ids: readonly string[]): Promise<Map<string, AndamentoVista> | null> {
  try {
    const linhas = await andamentosDasDemandas(db, ids);
    const mapa = new Map<string, AndamentoVista>();
    for (const [id, l] of linhas) {
      const a = lerAndamento(l);
      if (a) mapa.set(id, a);
    }
    return mapa;
  } catch (e) {
    log.error({ evento: 'painel_andamento_falhou', rota: '/demandas', erro: e });
    return null;
  }
}
```

Em `page.tsx`, `ListaDaFila` lê `andamentos` depois das etapas, **fora** do `try` da lista (a falha dele não é o erro da
lista) e passa a `ResultadoDaFila`. O selo: `SeloDaFase({ status, andamento })` em `CartoesDaFila.tsx`, que chama
`seloDeFase` e devolve `null` ou `<span className="flex flex-col"><span aria-hidden="true" className="text-[0.8125rem]
font-semibold text-<cor>">{visivel}</span><span className="sr-only">{leitor}</span></span>`, com a classe de cor por
mapa fixo (`text-marinho`, `text-positivo`, `text-tinta-media`), sem `style=`. Na tabela, a célula Status vira
`<span className="flex flex-col items-start gap-1">` com o `Selo` e o `SeloDaFase`; no cartão, o mesmo bloco à direita,
abaixo do selo de status, quebrando para baixo em 320 px (03, 4.1 item 5).

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` (com as mudanças da G5 nos
  e2e que leem a célula Status, e só elas, listadas na entrega).

### T13. Detalhe: seção "Andamento da construção", Próxima ação linha 15 e texto de Mudar status

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-07, RF-09, CA-07.1 a CA-07.3, CA-09.1 a
CA-09.5, CA-05.11 (tela), AN-12 (seção, CV-02, link), 03 seções 5.1 a 5.9 · **Depende de:** T09, T10, T11

**Arquivos:**
- Criar: `src/app/(painel)/demandas/[id]/SecaoAndamento.tsx`, `src/components/dados-das-etapas-andamento.test.ts`,
  `e2e/andamento-detalhe.spec.ts`
- Modificar: `src/components/dados-das-etapas.ts` (`DadosDasEtapas.andamento?` e a linha 15 dentro de `em_construcao`,
  antes da 11), `src/app/(painel)/demandas/[id]/detalhe.ts` (`ID_SECAO.andamento = 'andamento-da-construcao'`,
  `TEXTOS_DETALHE.secoes.andamento`, `dicaAprovada` novo), `src/app/(painel)/demandas/[id]/page.tsx` (seção, grade,
  "Nesta página", `andamento: d.andamento` em `DadosDasEtapas`); asserções de `dicaAprovada` da G5
- Não muda: `valoresDoEvento` (sem "Antes/Depois" para o evento novo), `MudarStatus.tsx`, `transicoesManuaisDe`

- [ ] **Passo 1: os testes que falham**

- `dados-das-etapas-andamento.test.ts`: com a fixture de demanda `em_construcao` e DEC aprovado vigente dos testes de
  `dados-das-etapas.test.ts`: andamento `construido` do DEC vigente → linha 15 `{ linha: 15, oQueFalta: 'Construção
  concluída: confira e marque como Entregue.', detalhe: 'O /construir não marca Entregue: quem confere a entrega é uma
  pessoa.', quemAge: 'Uma pessoa (CTO ou administradora)', link: { rotulo: 'Mudar o status', destino: { tipo: 'secao',
  secao: 'status' } } }` (CA-07.1); andamento `em_construcao`, `cancelado`, de outro DEC (não vigente) ou ausente →
  linha 11 de hoje (CA-07.2); a mesma demanda em `entregue` → linha 1 (CA-07.3). E, no teste de `detalhe.ts` que hoje
  confere `dicaAprovada`, o texto novo (G5); o e2e não confere esse texto, porque a única demanda do seed em `aprovada`
  (`andamentoParaEnviar`) muda de status no e2e da T14, que roda em paralelo.
- `test/estatico/*` que confere `style=` (CV-02) passa a cobrir `SecaoAndamento.tsx` sozinho, pela varredura de hoje:
  confira e diga na entrega; se a varredura for por lista, acrescente o arquivo nela (acréscimo).
- `e2e/andamento-detalhe.spec.ts` (conta "cto", só leitura, seed da T10; cada teste abaixo de 24 s):
  1. `andamentoConstruindo` em 1280 × 720: "Nesta página" com "Andamento da construção" em primeiro; o `h2` focável
     com `id="andamento-da-construcao"`; depois da Próxima ação e antes de Dados no DOM; link do DEC para
     `/pacotes-decisao/<id>`; "Construindo", "Em andamento", "9 de 17 tarefas"; `progress` com `value="9"`,
     `max="17"`, nome acessível "Tarefas prontas" e `aria-valuetext="9 de 17 tarefas"`; "Última mudança informada pelo
     /construir em …" com `time[datetime$="Z"]`; a nota; o histórico com "Registrou o andamento de DEC-…: Construindo, 9
     de 17 tarefas" e o ator "/construir (prefixo ficticio)"; o `status_alterado` com "Antes: Aprovada. Depois: Em
     construção." e o mesmo ator (CA-09.1, CA-06.5);
  2. `andamentoSemPlano`: o texto de total 0 e nenhum `progress` (CA-09.2);
  3. `andamentoCancelado`: Situação "Cancelada", o alerta, status "Devolvida pela construção", Próxima ação linha 12
     (CA-09.3);
  4. `emConstrucaoSemAndamento`: nenhuma seção nem item em "Nesta página"; Próxima ação linha 11 (CA-09.4, CA-07.2);
  5. `andamentoConcluido`: a linha 15 e o link "Mudar o status" levando o foco ao `h2` "Mudar status" (CA-07.1). A
     marcação de Entregue (CA-07.3) fica no Vitest acima: o e2e não muda o seed;
  6. axe sem violação na T05 com a seção, em 1280 × 720 e 390 × 844, e nada sobreposto na coluna lateral em 1280 px
     (as caixas de Próxima ação, Andamento e Histórico não se cruzam) (CA-09.5).

- [ ] **Passo 2: ver falhar** — `pnpm test src/components/dados-das-etapas-andamento.test.ts` e `pnpm test:e2e` → FAIL.

- [ ] **Passo 3: o código**

`dados-das-etapas.ts`: `DadosDasEtapas` ganha `andamento?: Pick<AndamentoVista, 'decId' | 'statusConstrucao'> | null`
(opcional: ausente vale como sem andamento); `linhaDoStatus(status, vigente, andamento)` e, no caso `em_construcao`,
antes da linha 11:

```ts
      // 0.4.0 (RF-07; 03, 5.6): o número 15 é só identificador. Só com o andamento do DEC vigente em `construido`.
      if (andamento?.statusConstrucao === 'construido' && vigente !== null && andamento.decId === vigente.id)
        return acao(15, 'Construção concluída: confira e marque como Entregue.', UMA_PESSOA, secao(MUDAR_O_STATUS, 'status'), 'O /construir não marca Entregue: quem confere a entrega é uma pessoa.');
```

`detalhe.ts`: `dicaAprovada: 'Quando o /construir começar o Pedido de Construção gerado no painel, a demanda passa
sozinha para Em construção. Entregue é sempre marcado por uma pessoa.'`.

`SecaoAndamento.tsx` (Server Component): recebe `SecaoDoAndamento` (T11) e monta, dentro da `Secao` da página: a `dl` em
duas colunas (`dt` com `CLASSE_DA_ETIQUETA`; "Pedido de Construção" e "Tarefas prontas" na linha toda; o id do DEC em
`font-mono [overflow-wrap:anywhere]`, link com `CLASSE_LINK` e 44 px abaixo de 768 px, ou "Não informado"); a barra
`<progress value max aria-labelledby={<id do dt>} aria-valuetext className="h-2 w-full appearance-none overflow-hidden
rounded-full border-0 bg-linha [&::-webkit-progress-bar]:bg-linha [&::-webkit-progress-value]:bg-acao
[&::-moz-progress-bar]:bg-acao">{recurso}</progress>` (sem `style=`, sem animação); os alertas `Alerta tipo="atencao"`
estáticos; a linha "Última mudança informada pelo /construir em <time dateTime={iso}>{data}</time>." (14 px, `tinta`) e
a nota (13 px, `tinta-media`).

`page.tsx`: `const andamento = secaoDoAndamento(d.andamento, d.pacotesDecisao, formatarDataHora)`; `andamento:
d.andamento` em `dadosDasEtapas`; em `secoes`, `[ID_SECAO.andamento, s.andamento]` **primeiro** quando existe; a seção
logo depois do `CartaoProximaAcao` no DOM, com `className="xl:col-start-3 xl:row-start-2"`; o Histórico com
`xl:row-[3/-1]` quando a seção existe e `xl:row-[2/-1]` sem ela (03, 5.1 item 2; o `GRADE` não muda).

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e`.

### T14. e2e do envio pelo `/construir`, chaves do Awave no e2e e versão 0.4.0

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** CP-1 e CP-5 ponta a ponta no build de produção,
RF-10 (e2e), RF-13 (versão), RNF-09 (e2e três vezes), D-10 · **Depende de:** T08, T09, T12, T13

**Arquivos:**
- Criar: `e2e/andamento-construir.spec.ts`
- Modificar: `package.json` (`"version": "0.4.0"`), `test/estatico/projeto.test.ts` (G5),
  `e2e/integracoes.spec.ts:59` e a lista equivalente de `e2e/integracoes-qa.spec.ts` (G5)

- [ ] **Passo 1: os testes que falham**

`test/estatico/projeto.test.ts` espera `0.4.0`. `e2e/andamento-construir.spec.ts`, com `test.use({ trace: 'off' })` e o
`exigirTokens()` de `e2e/integracoes.spec.ts` (pula na homologação com `MOTIVO_SEM_TOKENS`; falha no e2e local sem o
arquivo de tokens), e o contexto de API sem `Origin`:

1. **CP-1 e CA-05.1 pelo navegador:** a "cto" acha a `andamentoParaEnviar` e o DEC dela; o token `construir` manda
   `{ fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0, status: 'em_construcao' }` → 204; a fila
   (`?status=em_construcao`) mostra o selo "Entendendo o pedido" na linha dela, e o detalhe, a seção. O teste não supõe
   o estado de antes: no segundo `pnpm test:e2e` sobre o mesmo banco, o primeiro envio já é o mesmo estado e responde
   204 do mesmo jeito.
2. **CP-5:** a contagem de eventos do histórico (`GET /api/demandas/:id/historico` como "cto") antes e depois de mandar
   o mesmo corpo de novo → igual, e a data da linha "Última mudança informada …" igual.
3. **CA-02.2 e CA-03.1 pelo build:** corpo com chave a mais → 422 com a mensagem da 03; DEC
   `DEC-DEM-20991231-9999-v1` → 404; o corpo das duas respostas não contém a chave enviada.
4. **CA-10.1 pelo build:** o Awave lê uma demanda dele (a do seed `awaveAguardando`) e a vista tem as sete chaves, com
   `andamento: null`.

E a G5 em `e2e/integracoes.spec.ts:59` (e no `-qa`): `['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo',
'titulo']`.

- [ ] **Passo 2: ver falhar** — `pnpm test test/estatico/projeto.test.ts` e `pnpm test:e2e` → FAIL.

- [ ] **Passo 3:** `package.json` em `0.4.0`; o código do e2e.

- [ ] **Passo 4: ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; `pnpm test:e2e` verde **três vezes
  seguidas**, com o tempo do teste mais lento de cada arquivo novo na entrega (nenhum acima de 24 s).

---

## Verificação na homologação (para a `09-entrega`; o `devops-sre` monta, Fabiano não precisa agir)

**V-02 (CP-9, AN-15):** o `enviar-andamento.mjs` do `/construir` (aa01e2d, sem mudança, RNF-07) contra a homologação
da 0.4.0, com o seed da T10:

1. Subir a homologação (`construir.mjs homologar` ou o `docker-compose.hml.yml`) e ler, como "cto" pela API, os DEC das
   demandas `andamentoParaEnviar` (pedido gerado por pessoa, demanda em `aprovada`) e `andamentoSemPedido` (DEC aprovado
   sem pedido).
2. Emitir o token `construir` **dentro** da homologação com `scripts/criar-token-servico.ts --integracao construir`
   (no contêiner do app), gravá-lo direto num arquivo com permissão 600 numa pasta de `mktemp -d` fora de qualquer
   repositório; o valor nunca vai à tela, ao log, a `passagens.jsonl` nem a arquivo rastreado.
3. Numa segunda pasta temporária: `pedidos/config/orquestrador.json` com `"andamento_ligado": true`, `"url"` da
   homologação (`http://127.0.0.1:<HML_PORTA>`) e `"token_arquivo"` do passo 2; `pedidos/<DEC>.json` para os dois DEC
   (o JSON da geração do `andamentoParaEnviar`, obtido pela própria rota de entrega com o mesmo token, e uma cópia dele
   com o id do outro DEC); e, em `<projetos>/<sistema_alvo>/docs/construcao/<DEC>/passagens.jsonl`, uma linha fictícia
   válida para o `calcularEstado` (a `00-inicio` do maestro, com `inicio` e `fim` de hoje).
4. Rodar `CONSTRUIR_PEDIDOS=<pasta>/pedidos CONSTRUIR_PROJETOS=<pasta>/projetos node ferramentas/construir/enviar-andamento.mjs --estado <pasta>/estado.json`
   na estruturaAutonoma → sai 0; a linha do `andamentoParaEnviar` termina em `enviado (HTTP 204)` e a do outro em
   `fora_do_orquestrador (HTTP 404)`.
5. Conferir pela API, como "cto": a demanda em `em_construcao`, com `andamento` e um `andamento_registrado`.
6. Rodar o passo 4 de novo → `nada mudou`, e nenhum evento novo.
7. Apagar as duas pastas temporárias **também na falha** (`trap`), revogar o token pelo prefixo e conferir
   `git status` limpo nos dois repositórios.

**Ensaio de rollback:** `alteram_dado = false` (as migrations só criam) e `volta_sem_restaurar = false` **esperado** (a
saúde da 0.3.1 responde 503 sobre o diário com `0008` e `0009`; volta só pelo caminho B; 02, seção 8). Isso não é falha.

**RNF-01:** 50 envios `POST .../andamento` com estados diferentes, na homologação com 200 DEC e 20 mil eventos (carga
fictícia pelo migrator, dentro do contêiner do banco): p95 ≤ 1 s e nenhum acima de 5 s.

