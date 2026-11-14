# Plano de implementação — ws-orquestrador-demandas 0.4.1: sobras da 0.1.13 e da revisão final da 0.4.0

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou
> superpowers:executing-plans para executar este plano tarefa por tarefa. No /construir, cada tarefa é uma passagem
> `06-Tnn-construcao` do engenheiro indicado, seguida de `06-Tnn-revisao` (tech-lead) e `06-Tnn-testes`
> (qa-automacao). O commit é do maestro. Os passos usam caixa (`- [ ]`): o status report diário lê esses checkboxes.

**Objetivo:** fechar as sobras da 0.1.13 (S-02, S-03, S-04, C-27, textos da T11) e os dois baixos da revisão final da
0.4.0 (B-08-1, B-08-2). O `/construir` ganha uma leitura `GET /api/pedidos-construcao/<DEC-id>/situacao` que responde
só `vigente` ou `substituido`; o D1 passa a recusar também pelo nome que valia quando o DEC foi criado (guardado como
caminhos marcados, sem o nome); arquivar o DEC mais novo com um aprovado vigente deixa a demanda em `aprovada` (S1) ou
em `em_analise` (vigente desatualizado, 7.1); o teste C-27 fica estável sem asserção a menos; a T11 ganha três avisos, a
dica e a chegada do Arquivar pelo destino certo; a fila lê uma linha de andamento por demanda; o piso de asserções
passa a cobrir os testes de segurança da 0.3.x e da 0.4.0. Nenhum controle é afrouxado.

**Arquitetura:** o monólito modular de hoje (ADR-01 a ADR-35) com as ADR-36 a ADR-40 do pedido: ação
`ler_situacao_pedido` só do `construir` e serviço só de leitura, sem trava nem evento (ADR-36); coluna
`caminhos_com_nome_na_criacao text[]` em `pacote_decisao`, gravada uma vez na criação (ADR-37); destino do arquivamento
por tabela pura em `demandas/arquivamento.ts`, lida pelo servidor e pela T11 (ADR-38); último andamento por
`crossJoinLateral` a partir de `demanda` (ADR-39); avisos da T11 por função pura mais a leitura `vigenteDaDemanda`
(ADR-40). Uma migration aditiva gerada (`0010`). Nenhum processo, fila, job, pacote ou variável de ambiente novo.

**Stack:** a do `package.json` de hoje (Node 24, pnpm 12.6.0, TypeScript strict, Next 16.4.1, React 19.2.8, Tailwind 4,
Drizzle 0.45.3 + drizzle-kit 0.31.11, Zod 4.6.6, Better Auth 1.7.7, pg-boss 12.34.0, Vitest 5.0.2 + Testcontainers
12.1.0, Playwright 1.63.0 + `@axe-core/playwright` 4.13.0). **Nenhum pacote novo.**

**Fontes:** pedido `DEC-DEM-20261111-0018-v1`; spec aprovada na Parada 1
(`docs/superpowers/specs/2026-11-13-ws-orquestrador-demandas-sobras-design.md`, com as decisões 7.1 e 7.2 e as
divergências da 7.3); entregas `01-analista-requisitos.md` (RF-01 a RF-10, RNF-01 a RNF-12), `02-arquiteto-solucoes.md`
(ADR-36 a ADR-40), `03-ux-ui-design.md` (telas e textos, seção 8) e `04-seguranca-aplicacao.md` (SB-01 a SB-17), na pasta
`docs/construcao/DEC-DEM-20261111-0018-v1/`; `padrao-tecnico.md` da estruturaAutonoma. **Base: `main` em `41108ee`
(0.4.0).** Sai como **0.4.1**.

---

## Restrições globais (valem para toda tarefa)

### G0. Regra de comando do /construir (vale em toda passagem; repita-a no prompt de cada tarefa)

- Para ler e buscar, use as ferramentas Read, Grep e Glob. Pelo Bash, só os comandos da sua lista **Pode** (G1), **um
  por vez**: sem `;`, sem `&&`, sem redirecionamento e sem variável (`$`). Pipe só para `head`, `tail`, `grep` e `wc`.
  A leitura do maestro aceita `\|`, `-e` repetido e aspas como o bash monta (e44299e e 4015b8e), mas não aceita mais
  que isso.
- Caminho só dentro do repositório; `.env` nunca.
- `pnpm test` inteiro passa de 180 s: rode-o em segundo plano (o harness avisa quando termina) e leia a saída com Read.
  Arquivo isolado (`pnpm test <arquivo>`) roda em primeiro plano.
- Declare na entrega, em `## Comandos executados`, cada comando Bash, exato, um por item.

### G1. Quem edita o quê (listas **Pode** dos agentes, conferidas arquivo a arquivo em cada tarefa)

| Engenheiro | Edita | Roda |
|---|---|---|
| `engenheiro-dados-bd` | `src/db/`, `src/modules/`, `drizzle/`, `test/`, `scripts/`, `drizzle.config.ts` | `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm db:generate`, `pnpm drizzle-kit generate --custom --name rls_<tabela>` |
| `engenheiro-backend` | `src/`, `test/`, `scripts/`, `package.json`, `*.config.*` | `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` |
| `engenheiro-frontend` | `src/`, `test/`, `e2e/`, `public/`, `package.json`, `*.config.*` | `pnpm install`, `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm build` |

Consequências que o plano já respeita:
- a migration (`drizzle/`) é do `engenheiro-dados-bd` (T03), gerada, sem custom (02, seção 8; SB-10);
- o `engenheiro-dados-bd` **não** edita `src/app/`, `src/lib/`, `src/components/` nem `e2e/`: a tarefa dele (T03) só
  toca `src/db/`, `drizzle/` e `test/`;
- a T07 é do `engenheiro-backend` (revisão do plano em 14/11, depois da `06-T07-construcao`): a troca da consulta
  obriga a trocar o dublê `dbCom` de `src/app/(painel)/demandas/fila-andamento.test.ts`, e `src/app/` está fora da
  lista do dados-bd;
- o C-27 está em `src/lib/deps-qa.test.ts`, fora da lista do dados-bd: é do `engenheiro-backend` (T08);
- o seed (`scripts/`) é do `engenheiro-backend` (T10); o frontend não edita `scripts/`;
- só o `engenheiro-frontend` escreve em `e2e/` e roda `pnpm test:e2e` (T11 a T14);
- ninguém da 06 escreve em `docs/` nem no `CHANGELOG.md` (G2). A versão `0.4.1` no `package.json` é da T14.

### G2. Fora das tarefas da 06 (cada item tem etapa dona)

| Item | Etapa dona |
|---|---|
| Foco, teclado, leitura e anúncios que o axe não pega nos três avisos, na dica e na chegada (03, seções 4 e 9), à mão | `07-qa-funcional` |
| `/security-review` com foco em matriz, rota de situação (oráculo e escopo), coluna da criação (formato, falha fechada, vistas), arquivamento sob a trava e a correção do C-27; `pnpm audit --prod --audit-level high` sem alta nem crítica; G4 e o piso de asserções de novo; achado crítico ou alto volta ao engenheiro e passa por reteste da `seguranca-aplicacao` | `08-revisao` (maestro) e `08-reteste` |
| `docker build`, CI, homologação (`construir.mjs homologar`, e2e três vezes seguidas contra ela), ensaio de rollback com `alteram_dado = false` e `volta_sem_restaurar = false` **esperado** (02, seção 8; SB-10), RNF-01 (rota de situação, 50 chamadas, p95 ≤ 500 ms) e RNF-05 (fila com 5.000 demandas e 6.000 linhas de andamento, p95 < 500 ms, na `main` e no ramo) — seção "Verificação na homologação", no fim | `09-entrega` (`devops-sre`) |
| `CHANGELOG.md` seção 0.4.1, com a causa do C-27 copiada da entrega da T08 (CA-04.4) e a pendência S-02 a S-04 da 0.1.13 fechada; spec principal (RF-07, RF-13, RF-22) e spec das integrações (rota de situação) (RF-09, CA-09.1); manual caps. 01 (ADR-36 a ADR-40, migration `0010`), 02 (matriz com 25 ações), 03 (RF-07), 04 (substituição, S-02 a S-04, "Limite conhecido": DEC anterior à 0.4.1 confere só o nome atual; `vigente` em status final), 05 (D1 e rota de situação), 08 (T11 com avisos, dica e chegada; T05) e 09 (referência da rota); glossário ("situação do pedido" × "situação da construção" × "em vigor"); `docs/operacao/tokens-de-integracao.md` (SB-17: o token `construir` lê a situação de todo DEC com pedido gerado por pessoa, inclusive substituído e de demanda em status final; a rota é consultiva; o cliente falha fechado; a revogação pelo prefixo continua a resposta a vazamento) | `10-documentacao` (`documentacao-tecnica`) |
| Backup, migration `0010` pelo migrator e deploy; volta só pelo caminho B; aceite formal do risco residual com a `gestao-riscos` (7.2, item 11) | Fabiano, depois do merge |
| A `00-inicio` parar com DEC substituído e o aviso por e-mail, com o cliente falhando fechado (503, rede, tempo esgotado → não inicia) | outra frente (`/construir`), fora deste repositório |

### G3. Código

1. **TDD:** o teste é escrito antes e visto falhando; a entrega mostra o comando e o trecho da falha. Ao fim de cada
   tarefa, `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes, e `pnpm test:e2e` verde nas tarefas do
   `engenheiro-frontend`. Exceções declaradas: o teste de guarda que já nasce verde (ex.: parte do estático da T01 antes
   de a rota existir; varredura de vistas da T04, porque a vista já é montada campo a campo) vai nomeado na entrega, com
   a razão; o teste que falha da tarefa é o que exige o código novo.
2. **Teste que já existe só muda pela lista da G5** (SB-16). Nunca se apaga asserção, nunca se desliga regra do axe,
   nunca se sobe `retries` ou tempo-limite, nunca `bypassCSP`. Mudança fora da G5 vai explicada na entrega, trecho a
   trecho, e a revisão decide; em teste de segurança, ela **devolve** a tarefa ao `05-plano`.
3. **Dados e tokens só fictícios** (JUR-2026-002, 7.4): títulos com "(fictício)", nomes "Pessoa Ficticia …", domínios
   `.test`. Token só gerado em tempo de teste (`tokenDeIntegracao`, `criarTokenDeIntegracao`, `criarTokenServico`),
   nunca em arquivo do repositório, log ou mensagem de `expect`. Prefixo fictício escrito à mão: `ficticio`.
4. **Ramo por tipo de ator é `switch` com `never`** (`atorDesconhecido`); status e estado do vigente também (SB-11).
5. **Lista de permissão, chave a chave**, nunca `...objeto`: o 200 da situação (`{ situacao }`), as linhas da fila
   (`COLUNAS`), o insert do DEC.
6. **SQL:** só Drizzle ou template `sql` com valor por parâmetro; nada de `sql.raw` (teste estático de hoje). Em
   `src/modules/andamento/consultas.ts` não entra o `sql` do `drizzle-orm` (guarda de `test/estatico/andamento.test.ts`).
7. **Prazo total (SB-04, lição da 0019):** `situacao.ts` usa `executarComOrcamento(deps.pool, ator, 'padrao',
   undefined, …)` e **não tem parâmetro `t`**; nenhum `set local`, `set_config`, `comTransacao`, `executarComOrcamento`
   aninhado, `Promise.all` nem trava.
8. **Visibilidade (lição da 0.3.1):** toda leitura nova leva a regra de visibilidade e o **teste de oráculo** na própria
   tarefa: a rota de situação (T02: 404 idêntico byte a byte e 403 sem consulta), `vigenteDaDemanda` na T11 (T12: só
   depois de autorizar e de achar o pacote) e o DEC vigente na T05 (T13: só depois de autorizar `ler_pacote_decisao`).
9. **Piso (IN-16, SB-15):** todo teste de segurança novo entra no `PISO` de `test/estatico/piso-de-assercoes.test.ts`
   **na própria tarefa**, com o número de linhas `expect(` do arquivo no fim dela. Asserção a menos em teste de
   segurança é **Critical**.
10. **Relógio injetado:** `Date.now()` e `new Date()` sem argumento continuam proibidos fora de `relogio.ts`. Teste usa
    `relogioFixo(...)` e `avancar`; o relógio monotônico (`performance.now`) só por `vi.spyOn`, como em
    `prazo-total-0019.test.ts`.
11. **Textos** são os de `03-ux-ui-design.md`, seção 8, por inteiro (repetidos na spec, 4.3); texto que não muda é a
    constante de hoje. Os comentários "para revisão da ux-ui-design" das constantes revistas saem.
12. **e2e (lições 0015 a 0.4.0):** contas dos specs existentes (`entrarComo(page, 'cto' | 'administradora')`); os e2e
    deste pedido **não criam** demanda nem versão: leem as demandas do seed (T10). Playwright fica com `retries: 0` e 30
    s por teste: teste que passar de 24 s na entrega é **dividido**. Spec com credencial no cabeçalho usa
    `test.use({ trace: 'off' })`.
13. **Log:** nenhuma linha nova; a de `rota()` continua só com rota padrão, status, ms, `atorTipo` e `codigoErro`.

### G4. Superfícies congeladas (SB-16) — conferidas pelo tech-lead em toda revisão e na 08

Este comando tem de sair **vazio** em toda revisão de tarefa:

```
git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'
```

Diffs parciais, conferidos lendo o `git diff 41108ee -- <arquivo>`:
- `src/modules/acesso/matriz.ts`: uma linha em `ACOES`, uma em `MATRIZ` e comentários (T01);
- `src/modules/demandas/transicoes.ts`: sai `decisao_arquivada` do tipo `TransicaoAutomatica` e de `AUTOMATICAS`; entra
  `mudarStatusPorArquivamento`; `MANUAIS`, as outras três automáticas, `mudarStatusPeloSistema`,
  `AUTOMATICAS_DO_CONSTRUIR`, `CONTRADIZ_STATUS_FINAL`, `transicaoDoConstruir` e `mudarStatusPeloConstruir` sem linha
  mudada (T06; SB-11);
- `src/modules/pacotes-decisao/decidir.ts`: só o ramo de `devolvida`/`arquivada` em `registrarDecisao` e as importações
  (T06), e o texto de `nivelMenorQueOVigente` (T11);
- `src/modules/pacotes-decisao/substituido.ts`: só o acréscimo de `vigenteDaDemanda` (T06);
- `src/modules/pedido-construcao/conferir.ts`: o `select` do `alvo`, a leitura da coluna e o filtro do D1 (T05), e o
  texto de `MENSAGENS_PEDIDO.substituido` (T11);
- `src/modules/andamento/consultas.ts`: só o corpo de `andamentosDasDemandas` e as importações (T07);
- `drizzle/meta/_journal.json`: só a entrada `0010` acrescentada (T03);
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimos (toda tarefa).

Na revisão de cada tarefa: o comando acima vazio, os diffs parciais acima e a contagem de `expect(` por arquivo do
`PISO` (nenhum abaixo do valor de `41108ee`). De novo na 08.

### G5. Testes existentes que vão mudar (e só nisto)

| Arquivo | Muda | Tarefa |
|---|---|---|
| `src/modules/acesso/matriz.test.ts` | `SO_CONSTRUIR` (linha 31) ganha `'ler_situacao_pedido'`; "24" → "25" no título e no `toBe` (linhas 84 e 85) | T01 |
| `src/modules/acesso/matriz-integracoes.test.ts` | `DO_CONSTRUIR` (linha 15) ganha `'ler_situacao_pedido'`; a lista de pares (linhas 20 a 27) ganha `'ler_situacao_pedido:construir'`; "os seis" → "os sete" e "quatro dele" → "cinco dele" nos títulos | T01 |
| `src/modules/acesso/matriz-integracoes-qa.test.ts` | `DO_CONSTRUIR` (linha 25) ganha `'ler_situacao_pedido'`; títulos "24 ações" → "25", "quatro" → "cinco" (linhas 66, 85, 108, 119); linha 203 `- 6` → `- 7` e o comentário da 202. Nenhuma asserção sai | T01 |
| `src/modules/acesso/matriz-andamento.test.ts` | (a) "os seis" → "os sete", com `'ler_situacao_pedido:construir'` no conjunto; (b) "quatro ações" → "cinco", com `'ler_situacao_pedido'` na lista ordenada (SB-16, par novo aprovado) | T01 |
| `test/estatico/migration-0008.test.ts` | linhas 23 e 24: "a 0008 e a 0009 são as duas últimas" passa a "a 0008 e a 0009 estão nos índices 8 e 9" (`find((e) => e.idx === 9)`), sem `entries[9]` nem a lista inteira fixa; as outras asserções ficam | T03 |
| `src/db/imutabilidade.test.ts` | o `it.each` da linha 32 ganha `['update pacote_decisao set caminhos_com_nome_na_criacao = $1', ['{}']]` (SB-07 d) | T03 |
| `src/modules/demandas/servico.test.ts` | linha 430: a linha `decisao_arquivada` sai do `it.each` de `mudarStatusPeloSistema` (o tipo `TransicaoAutomatica` não a tem mais, ADR-38). **Mudança de forma, não de expectativa:** a mesma expectativa (das quatro origens vai a `encerrada` com evento do ator sistema; fora delas, nada e sem evento) passa a ser a coluna `nenhum` de `src/modules/demandas/arquivamento-status.test.ts` (T06), pelo banco e com as mesmas asserções. A contagem de `expect(` do arquivo não muda. Registrada para a 08 ratificar (Pendências do `05-tech-lead.md`) | T06 |
| teste que espere `encerrada` ao arquivar o mais novo **com** aprovado vigente atualizado (se o `pnpm test` apontar algum além dos novos) | passa a esperar `aprovada` (S1; SB-16, aprovado de antemão). Os que arquivam **sem** vigente não mudam (`decidir.test.ts:440`, `gerar.test.ts:302`) | T06 |
| `src/modules/pacotes-decisao/substituicao.test.ts` | o comentário da linha 146 ("arquivar encerra a demanda") vira "arquivar com vigente leva a Aprovada (0.4.1)"; nenhuma asserção muda (T06). As linhas 387 a 389 passam ao texto novo de `nivelMenorQueOVigente` (T11) | T06, T11 |
| textos alterados da 03 (CA-05.1): `src/components/dados-da-decisao.test.ts:841-844`; `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts:189`; `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts:41` e `:194`; `src/components/dados-do-pedido.test.ts:179`; `src/components/rotulos.test.ts:259-265`; `src/modules/pedido-construcao/gerar-substituido.test.ts:115-116`; `e2e/decisao.spec.ts:297` e `:364`; `e2e/decisao-celular.spec.ts:433`; `e2e/pedido-construcao.spec.ts:51`, `:54` e `:56` | o texto esperado passa ao da 03, seção 8; a regra testada não muda | T11 |
| `e2e/decisao.spec.ts`, teste "Arquivar → …" (linhas 455 a 474) | a demanda passa de `TITULOS_DO_E2E.decisao` para `TITULOS_DO_E2E.arquivarSemVigente` (seed da T10, sem DEC aprovado): na ordem do arquivo, a `decisao` já tem um aprovado vigente desatualizado (testes das linhas 260, 305 e 420), e a regra nova (7.1) a levaria a Em análise. O título, o alerta, as três conferências de status e o axe ficam iguais, e `test/estatico/decisao-e2e.test.ts` (piso 37) não muda | T11 |
| `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` | ganha o `vi.mock('../../../../modules/pacotes-decisao/substituido', …)` com `vigenteDaDemanda` dublê (padrão `null`); a asserção da linha 313 (sem vigente, em Pronta para decisão: "vai para Encerrada") não muda | T12 |
| `src/components/dados-da-decisao.test.ts` | as chamadas de `chegadaNaDecisao` ganham o terceiro argumento `{ statusDaDemanda: 'encerrada', vigente: null }` nos casos de arquivada e `{ statusDaDemanda: 'pronta_para_decisao', vigente: null }` nos outros; nenhuma asserção muda | T12 |
| `e2e/decisao-botoes.spec.ts:285` | só se a demanda do `decDesatualizado` tiver vigente ou estiver fora das origens: a descrição acessível do Arquivar passa ao texto da 4.6 para o estado dela, e a entrega diz qual | T12 |
| `src/app/(painel)/demandas/[id]/detalhe.test.ts` e testes de `dados-das-etapas` com DEC mais novo **arquivado** e um aprovado vigente | a etapa 4 passa a mostrar o vigente, "Aprovada, opção X", feita (decisão 7.2, item 3); o dublê de `obterPacoteDecisao` atende os dois ids; nada mais muda | T13 |
| testes do seed que contam demandas, versões ou eventos (`scripts/scripts.test.ts`, `scripts/seed-*.test.ts`, `src/db/sementes.test.ts`, `TOTAL_DEMANDAS_DO_SEED`, `MENSAGENS_SEED`) | os totais crescem com as quatro demandas novas; a lista de pendentes **não** muda | T10 |
| `src/modules/andamento/consultas.test.ts` | o teste da página em `planos (RNF-01)` ganha "e sem Sort sobre ela" no título e a asserção `expect(sortsSobreAndamento(nos)).toEqual([])`; as duas asserções de hoje (índice no texto, nenhum `Seq Scan`) ficam iguais; o resto são acréscimos (T07, passo 1) | T07 |
| `src/app/(painel)/demandas/fila-andamento.test.ts` | **Só de forma:** o dublê `dbCom` (linhas 193 a 198) e o comentário dele passam a imitar a cadeia nova de `andamentosDasDemandas` (a 1ª chamada de `select` monta a subconsulta `from … where … orderBy … limit … as`; a 2ª é a página `from(demanda) … crossJoinLateral … where`, que devolve as linhas). Nenhuma asserção muda nem sai (linhas 200 a 232), `dbQueFalha` não muda, a contagem de `expect(` do arquivo fica igual à de `41108ee`. `fila-andamento-qa.test.ts` não muda | T07 |
| `test/estatico/projeto.test.ts` | versão 0.4.0 → 0.4.1 | T14 |
| `test/estatico/piso-de-assercoes.test.ts` | `PISO` ganha entradas (só sobe) | T01, T02, T04, T05, T06, T07, T08, T09, T12, T13 |
| `test/matriz-rotas.test.ts`, `test/matriz-rotas-integracoes-qa.test.ts`, `test/transversal/sentinelas.test.ts`, `test/transversal/sentinelas-andamento.test.ts`, `test/estatico/andamento*.test.ts`, `test/estatico/decisao-e2e.test.ts`, `src/db/privilegios.test.ts`, `src/modules/andamento/registrar*.test.ts` | **não mudam**: os dois primeiros cobrem a rota nova sozinhos (SB-01 c, d); as sentinelas da situação e do nome da criação ficam em arquivos novos (D-05) | — |

### G6. Decisões desta etapa

| Id | Decisão | Razão |
|---|---|---|
| D-01 | Base `41108ee` (0.4.0); sai 0.4.1 | Spec 1 e 7.2, item 7 |
| D-02 | Fases na ordem pedida pela 04 (seção 6, item 2): matriz (T01) antes do serviço e da rota (T02, com SB-02 a SB-06 juntos); migration (T03) antes da marcação (T04) e da conferência (T05), seguidas, sem release entre elas; C-27 numa tarefa própria (T08), com a causa escrita antes da correção | SB-01, SB-07 a SB-10, SB-14 |
| D-03 | Risco `alto` no `tarefas.json` para T01, T02 (autorização), T03, T04, T05 (coluna e D1), T06 (arquivamento) e T08 (C-27), como manda a 04 (seção 6, item 3), mesmo onde a regra geral daria `medio` (T03: migration aditiva). O resto é `baixo`: nenhuma outra tarefa cria tabela, rota ou job | Regra da Entrega do tech-lead e 04 |
| D-04 | `descricaoSemRotulos`, `PARTES_DA_DESCRICAO` e o separador passam de `pacotes-decisao/criar.ts` para `pedido-construcao/conteudo.ts`; `criar.ts` os reexporta (os testes que importam de `criar.ts` não mudam) | `criar.ts` passa a importar `textosDaCriacao` de `montar.ts`, e `montar.ts` importava `descricaoSemRotulos` de `criar.ts`: sem a mudança, as duas se importariam em ciclo |
| D-05 | Testes transversais novos em arquivos novos: `test/transversal/sentinelas-situacao.test.ts` (T02) e `test/transversal/sentinelas-nome-da-criacao.test.ts` (T05); `test/transversal/visibilidade-caminhos-da-criacao.test.ts` (T04) | Não tocam as asserções dos de hoje e entram no piso |
| D-06 | Guardas estáticas novas: `test/estatico/situacao.test.ts` (SB-01 f, SB-03 sem trava, SB-04, SB-06; criado na T01, ampliado na T02), `test/estatico/caminhos-da-criacao.test.ts` (SB-07: insert só em `criar.ts`, chave fora dos schemas de entrada; T04), `test/estatico/arquivamento.test.ts` (SB-11: ordem trava → gravarDecisao → vigente → transição; T06) e `test/estatico/vigencia-t11.test.ts` (SB-12; T12). Nenhum importa de outro `*.test.ts` (o Vitest registraria os testes de lá de novo): usam `./importacoes` e o `typescript` como `andamento.test.ts` | Spec 7.4 pede o lugar dos estáticos do SB-01, SB-03 e SB-04 |
| D-07 | Contagem de consultas: no 403, o serviço trocado por um que falha se chamado (`vi.mock`, molde de `andamento-422.test.ts`) prova que nada do DEC é consultado depois de `resolverAtor`; nos três 404 do SB-02 (b), `vi.spyOn(pg.Client.prototype, 'query')` conta as consultas de cada caso, e os três números são iguais | Spec 7.4: o serviço roda em `executarComOrcamento`, cujo `Db` não passa pelo logger do Drizzle da `deps`; o `PoolClient` herda de `pg.Client` |
| D-08 | Fila (ADR-39) com `crossJoinLateral` do Drizzle 0.45.3, sem o template `sql`. Se o `pnpm typecheck` da T07 mostrar que o método não existe na versão instalada, a T07 **volta ao `05-plano`** (não se troca a guarda de `andamento.test.ts` que proíbe o `sql` em `consultas.ts`) | O pacote instalado não é rastreado pelo git: a etapa 05 não pôde ler o `node_modules` pela lista Pode; spec 7.4 |
| D-09 | `orientacaoDoPedido(erros, nivel = 'cto')` e `erroDoPedido(r, nivel = 'cto')`: o nível entra com padrão `cto`, e `SecaoPedido` passa o nível do DEC | Os testes de hoje continuam chamando com um argumento; só o texto da linha 6 muda (G5) |
| D-10 | A dica do Arquivar sai da página como texto pronto, na prop nova `dicaArquivar: string` do `FormularioDecisao` (o id `decisao-consequencia-arquivar` e o `aria-describedby` ficam); `ContextoDoFormulario` não muda | O contexto alimenta validação e envio; a dica é só texto, e a regra (`destinoDoArquivamento`) é do servidor |
| D-11 | `dados-da-decisao.ts` continua sem importar valor de `src/modules/`: a página calcula o destino (`destinoDoArquivamento`) e o estado do vigente e passa os valores prontos às funções puras | O arquivo vai ao navegador (comentário do topo); a regra fica numa fonte só |
| D-12 | Aviso (b): o nível do DEC mais novo pendente vem de `lerPacoteDaPagina(maisNovo.id)`, lido só quando o DEC aberto é o vigente e o mais novo é outro, pendente e não desatualizado | ADR-40 (sem mudar `PacoteResumo`); a leitura já existe e já está autorizada por `ler_pacote_decisao` |
| D-13 | Id do vigente fora de `RE_ID_DEC` na dica ou na chegada: a função lança, e a página mostra a tela de erro de hoje; nos avisos, o aviso não aparece (SB-12) | O CHECK `pacote_decisao_id_check` torna o caso impossível no banco; dado incoerente vira erro, como em `dados-das-etapas.ts` (`conferir`), em vez de texto inventado |
| D-14 | T05: a etapa 4 mostra o vigente só com o DEC mais novo **arquivado** e um vigente na demanda (7.2, item 3), lido pela página com `obterPacoteDecisao` depois de `autorizar(pessoa, 'ler_pacote_decisao')`; a linha 6 da Próxima ação vale com o DEC mais novo arquivado e a demanda em `nova` ou `em_analise` (7.2, item 4) | Com o destino Aprovada, a linha 10 já é a certa (03, 6.2); só os status que hoje caem na linha 13 mudam |
| D-15 | Seed: quatro demandas novas (`vigenciaComPendente`, `vigenciaNivelMenor`, `vigenciaArquivar`, `arquivarSemVigente`) pela conta fictícia `configurar2fa` (papel cto), com as aprovações da "cto" e da "administradora" | Limite C-36: a `sem2fa` já cria 28 demandas no seed (o limite é 30 por hora), e a "cto" e a "administradora" gastam o delas nas specs; a `configurar2fa` não cria nada no e2e |
| D-16 | C-27: a prova das 20 execuções é `pnpm test src/lib src/db` vinte vezes (o arquivo do C-27 junto com ~40 arquivos que criam banco ao mesmo tempo, perto da carga do CI), cada execução um comando declarado, mais as rodadas completas de `pnpm test` da definição de pronto | 7.2, item 10 ("com o paralelismo de workers do CI"); todos os comandos estão na lista Pode |
| D-17 | RNF-05 (fila p95 < 500 ms com 5.000 demandas e 6.000 linhas) é medido na `09-entrega`, na `main` e no ramo, e não vira teste de desempenho novo na suíte; na T07 a prova é o plano (sem `Sort`, uma linha por demanda) | `test/desempenho/leitura.test.ts` já é instável sob carga (lições do 0017); um p95 novo na suíte aumentaria a instabilidade sem provar mais que o plano |
| D-18 | Candidatos ao piso (B-08-2): a T09 acrescenta os da Pendência 7 de 01 e os testes de segurança da 0.4.0 fora do piso, pela lista da T09; a `06-T09-testes` (qa-automacao) confere cada um (CA-08.2) | O critério é o do CV-20 e do D-17 do 0016; a lista foi conferida por `git grep -c` em `41108ee` |

### G7. Nomes que várias tarefas usam

```ts
// src/modules/acesso/matriz.ts (T01): 'ler_situacao_pedido' em ACOES; MATRIZ.ler_situacao_pedido = SO_CONSTRUIR

// src/modules/pedido-construcao/situacao.ts (T02) — só leitura
export const SITUACOES_DO_PEDIDO = ['vigente', 'substituido'] as const;
export type SituacaoDoPedido = (typeof SITUACOES_DO_PEDIDO)[number];
export type DepsSituacao = Pick<Deps, 'pool'>;
export function situacaoDoPedido(deps: DepsSituacao, ator: Ator, decId: string): Promise<SituacaoDoPedido>;

// src/app/api/pedidos-construcao/[decId]/situacao/route.ts (T02): export const GET

// test/pedidos-construcao.ts (T02): chamadasDoConstruir(...).situacao(decId, op?)

// src/db/schema/decisao.ts (T03): pacoteDecisao.caminhosComNomeNaCriacao: text[] | null

// src/modules/pedido-construcao/conteudo.ts (T04, D-04): PARTES_DA_DESCRICAO, SEPARADOR_DA_DESCRICAO, descricaoSemRotulos

// src/modules/pedido-construcao/montar.ts (T04)
export type DadosDaCriacao = { dec: Pick<PacoteDecisaoVista, 'demandaTitulo' | 'demandaDescricao' | 'opcaoA' | 'opcaoB'>; esp: EspecificacaoVista; rsk: ParecerRiscoVista };
export const CAMINHO_DA_OPCAO: Readonly<Record<OpcaoDecisao, 'opcaoA.descricao' | 'opcaoB.descricao'>>;
export function textosDaCriacao(dados: DadosDaCriacao): TextoDoPedido[]; // mesma função interna de textosDoPedido

// src/modules/pedido-construcao/caminhos-da-criacao.ts (T04)
export const RE_CAMINHO_DA_CRIACAO: RegExp; // âncoras, sem flag
export const MAXIMO_DE_CAMINHOS: number; // 8 + 2 * LIMITE_ITENS
export const MENSAGEM_CAMINHOS_INVALIDOS = 'caminhos da criação do DEC fora do formato';
export function caminhosComNomeNaCriacao(textos: readonly TextoDoPedido[], nomes: readonly string[]): string[];
export function lerCaminhosDaCriacao(valor: unknown): readonly string[] | null; // lança Error fixo, sem o valor (T05)
export function caminhosDaCriacaoNoPedido(gravados: readonly string[], escolhida: OpcaoDecisao): ReadonlySet<string>; // T05

// src/modules/demandas/arquivamento.ts (T06) — puro
export const ESTADOS_DO_VIGENTE = ['nenhum', 'atualizado', 'desatualizado'] as const;
export type EstadoDoVigente = (typeof ESTADOS_DO_VIGENTE)[number];
export function estadoDoVigente(v: { desatualizado: boolean } | null): EstadoDoVigente;
export function destinoDoArquivamento(status: Status, estado: EstadoDoVigente): Status | null;

// src/modules/pacotes-decisao/substituido.ts (T06)
export type VigenteDaDemanda = { id: string; nivel: NivelAprovacao; desatualizado: boolean };
export function vigenteDaDemanda(db: Db, demandaId: string): Promise<VigenteDaDemanda | null>;

// src/modules/demandas/transicoes.ts (T06)
export function mudarStatusPorArquivamento(t: Transacao, deps: Pick<Deps, 'relogio'>, demandaId: string, estado: EstadoDoVigente): Promise<Status | null>;

// test/sessoes-do-banco.ts (T08)
export type SessaoDoBanco = { backendType: string | null; usename: string | null; state: string | null };
export function sessoesDoBanco(pool: pg.Pool): Promise<SessaoDoBanco[]>;
export function diagnosticoDasSessoes(s: readonly SessaoDoBanco[]): string; // só backend_type, usename e state

// scripts/seed-ficticio.ts (T10): TITULOS_DO_E2E ganha vigenciaComPendente, vigenciaNivelMenor, vigenciaArquivar, arquivarSemVigente

// src/components/dados-da-decisao.ts (T11, T12)
// TEXTOS_DECISAO ganha: avisoVigente(v), avisoMaisNovoPendente(p), avisoNivelMenor(v), dicaArquivarSemMudanca(rotulo),
// dicaArquivarAprovada(v), dicaArquivarEmAnalise(v), sucesso.arquivadaAprovada(v), sucesso.arquivadaEm(rotulo)
export type ContextoDaVigencia = {
  statusDaDemanda: Status;
  maisNovoId: string | null;
  vigente: { id: string; nivel: NivelAprovacao } | null;
  pendenteMaisNovo: { id: string; nivel: NivelAprovacao; desatualizado: boolean } | null;
};
export type AvisoDeVigencia = { texto: string; link: { rotulo: string; href: string } };
export function avisoDeVigencia(p: Pick<PacoteDecisaoVista, 'id' | 'demandaId' | 'statusDecisao' | 'desatualizado' | 'nivelAprovacaoRequerido'>, c: ContextoDaVigencia): AvisoDeVigencia | null;
export function dicaDoArquivar(destino: Status | null, statusAtual: Status, vigenteId: string | null): string;
export function chegadaNaDecisao(params, p, c: { statusDaDemanda: Status; vigente: { id: string; desatualizado: boolean } | null }): string | null;

// src/components/dados-das-etapas.ts (T13)
// DadosDasEtapas.decVigente?: Pick<PacoteDecisaoVista, 'id' | 'decisao' | 'aprovadores'> | null
export function vigenteDe(d: DadosDasEtapas['demanda']): PacoteResumo | null; // passa a ser exportada
```

### G8. Inventário do SB-11: quem escreve o que o arquivamento lê, e a trava de cada um

O arquivamento lê, sob a trava da demanda e depois de `gravarDecisao`: a linha de `demanda` (`status`), o aprovado
vigente (`pacote_decisao` + `decisao`, maior `versao` aprovada) e o `desatualizado` dele (maior `versao` de
`especificacao_tecnica` e de `parecer_risco` da demanda).

| # | Caminho | Função | Escreve o que o arquivamento lê | Trava | Conferido na |
|---|---|---|---|---|---|
| 1 | `src/modules/pacotes-decisao/decidir.ts` | `registrarDecisao` | `decisao` e `aprovacao` (muda o vigente), e chama #8 | demanda | T06 (SB-11 d, e) |
| 2 | `src/modules/especificacoes/servico.ts` | `criarEspecificacao` | ESP nova (o vigente fica desatualizado) | demanda | T06 (SB-11 d) |
| 3 | `src/modules/pareceres-risco/servico.ts` | `criarParecerRisco` | RSK novo (idem) | demanda | sem mudança |
| 4 | `src/modules/pacotes-decisao/criar.ts` | `criarPacoteDecisao` | DEC novo, pendente | demanda | T04 (SB-07 e) |
| 5 | `src/modules/demandas/servico.ts` | `alterarDemanda` | `demanda.status` (manual) | demanda | T06 (SB-11 e) |
| 6 | `src/modules/demandas/transicoes.ts` | `mudarStatusPeloSistema` | `demanda.status` (automáticas restantes) | demanda (trava de novo na mesma transação) | sem mudança |
| 7 | `src/modules/demandas/transicoes.ts` | `mudarStatusPeloConstruir` | `demanda.status` | a da demanda, já tomada por `registrarAndamento` (pedido → demanda) | sem mudança |
| 8 | `src/modules/demandas/transicoes.ts` | `mudarStatusPorArquivamento` (nova) | `demanda.status` | demanda (trava de novo, já tomada por #1) | T06 |
| 9 | `src/modules/agentes/executar.ts` | execução de agente | versões de agente (por #2, #3, #4) | demanda | sem mudança |
| 10 | `src/modules/demandas/confirmar.ts` | `confirmarDemanda` | só evento | demanda | sem mudança |
| 11 | `scripts/seed-ficticio.ts` | `criarDadosDaVigencia` (nova) | tudo acima, na transação do seed | trava do seed → demanda | T10 |

Nenhum caminho decide o status do arquivamento fora da trava da demanda, nem lê o vigente antes de `gravarDecisao`.

### G9. Leituras novas e a regra de visibilidade de cada uma (lição da 0.3.1)

| Leitura | Quem | Visibilidade | Oráculo | Tarefa |
|---|---|---|---|---|
| `GET /api/pedidos-construcao/[decId]/situacao` | só `construir` (`SO_CONSTRUIR`) | só DEC com `pedido_gerado` de pessoa na demanda do próprio DEC (IN-10, AN-03); sem filtro de status final nem de substituído (por desenho) | 403 antes de consultar o DEC (serviço trocado); três 404 iguais byte a byte, com o mesmo número de consultas; evento de outra demanda → o mesmo 404 | T02 |
| `vigenteDaDemanda` na T11 | pessoa com 2FA | depois de `exigirPessoaNaPagina`, `autorizar(…, 'ler_pacote_decisao')` e de achar o pacote | DEC inexistente → 404 sem chamar a leitura | T12 |
| `lerPacoteDaPagina(maisNovo.id)` na T11 (D-12) | pessoa com 2FA | id só de `d.pacotesDecisao[0]`, já lido com `ler_demanda` | idem | T12 |
| DEC vigente na T05 (`obterPacoteDecisao`) | pessoa com 2FA | id só da vista da demanda; depois de `autorizar(pessoa, 'ler_pacote_decisao')` | demanda inexistente → 404 sem a leitura | T13 |
| `andamentosDasDemandas` (fila) | pessoa | inalterada: só `leituras-da-fila.ts` a chama (AN-09; `IMPORTAM_CONSULTAS` não muda) | — | T07 |

### G10. Cobertura (RF de 01 e SB de 04)

| Item | Tarefas |
|---|---|
| RF-01 | T01, T02 |
| RF-02 | T03, T04, T05 |
| RF-03 | T06 (servidor), T12 (dica e chegada), T13 (T05), T14 (e2e) |
| RF-04 | T08 (causa no CHANGELOG pela `10-documentacao`) |
| RF-05 | T11 (textos alterados), T12 (dica e chegada) |
| RF-06 | T12, T14 |
| RF-07 | T07 |
| RF-08 | T09 (e cada tarefa com teste de segurança novo) |
| RF-09 | `10-documentacao` (G2): nenhum engenheiro da 06 tem `docs/` na lista Pode (G1); os textos que a spec passa a citar são os das T02, T05, T06 e T11 |
| RF-10 | T14 (versão); documentação e CHANGELOG na `10-documentacao` (G2), com a causa do C-27 da entrega da T08 |
| SB-01 | T01 (a, b, e, f), T02 (c pela rota e pelo serviço trocado; `autorizar` no serviço), `test/matriz-rotas*.test.ts` (c, d, sem mudança) |
| SB-02 | T02 |
| SB-03 | T02 |
| SB-04 | T02 |
| SB-05 | T02 |
| SB-06 | T02 (estático e "se e só se"); `10-documentacao` (texto consultivo) |
| SB-07 | T03 (d), T04 (a, b, c, e) |
| SB-08 | T04 (c, f), T05 (a, b, d, e) |
| SB-09 | T04 (a, b), T05 (c, d) |
| SB-10 | T03; `09-entrega` (ensaio) |
| SB-11 | T06 |
| SB-12 | T12 (e axe na T14) |
| SB-13 | T07 |
| SB-14 | T08 |
| SB-15 | T09 e cada tarefa (G3.9) |
| SB-16 | G4 em toda revisão |
| SB-17 | `10-documentacao`; a guarda `test/estatico/docs-sem-token.test.ts` roda em toda tarefa e de novo depois da 10 |

---

## Fase 1 — Situação do pedido (S-02)

### T01. Ação `ler_situacao_pedido` só do `construir` na matriz (SB-01)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (autorização) · **Cobre:** RF-01 (matriz), RNF-07, SB-01 (a, b,
e, f), SB-16 (diff de `matriz.ts`) · **Regra de comando:** G0.

**Arquivos:**
- Modificar: `src/modules/acesso/matriz.ts`; testes da G5 (`matriz.test.ts`, `matriz-integracoes.test.ts`,
  `matriz-integracoes-qa.test.ts`, `matriz-andamento.test.ts`); `test/estatico/piso-de-assercoes.test.ts`
- Criar: `src/modules/acesso/matriz-situacao.test.ts`, `test/estatico/situacao.test.ts`

**Interfaces produzidas:** a ação `ler_situacao_pedido` (G7).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/acesso/matriz-situacao.test.ts — SB-01 e RF-01 (0.4.1): ler_situacao_pedido só do construir, e o
// construir não ganha outra ação. Testes unitários, sem banco.
import { describe, expect, it } from 'vitest';
import { AGENTES, PAPEIS, type Ator, type Integracao } from './ator';
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

describe('SB-01: ler_situacao_pedido', () => {
  it('(a) os pares (ação, integração) montados de MATRIZ são exatamente os seis da 0.4.0 e o novo', () => {
    const pares = new Set(ACOES.flatMap((a) => MATRIZ[a].integracoes.map((i) => `${a}:${i}`)));
    expect(pares).toEqual(
      new Set([
        'criar_demanda:awave',
        'ler_demanda:awave',
        'listar_pedidos_pendentes:construir',
        'entregar_pedido:construir',
        'confirmar_recebimento_pedido:construir',
        'registrar_andamento:construir',
        'ler_situacao_pedido:construir',
      ]),
    );
  });
  it('(b) o construir tem exatamente cinco ações e o awave exatamente duas; a matriz tem 25 ações', () => {
    const de = (i: Integracao) => ACOES.filter((a) => permite(integracao(i), a)).sort();
    expect(de('construir')).toEqual(['confirmar_recebimento_pedido', 'entregar_pedido', 'ler_situacao_pedido', 'listar_pedidos_pendentes', 'registrar_andamento']);
    expect(de('awave')).toEqual(['criar_demanda', 'ler_demanda']);
    expect(ACOES).toHaveLength(25);
  });
  it('a linha é SO_CONSTRUIR (a mesma das outras quatro do /construir): sem pessoa, sem agente, congelada', () => {
    expect(MATRIZ.ler_situacao_pedido).toEqual({ pessoa: null, agentes: [], integracoes: ['construir'] });
    expect(MATRIZ.ler_situacao_pedido).toBe(MATRIZ.registrar_andamento);
    expect(Object.isFrozen(MATRIZ.ler_situacao_pedido.integracoes)).toBe(true);
  });
  it('awave, os quatro agentes (com e sem token), cto, administradora e sistema são negados', () => {
    expect(() => autorizar(integracao('awave'), 'ler_situacao_pedido')).toThrow(SEM_PERMISSAO);
    for (const agente of AGENTES)
      for (const prefixoToken of ['ficticio', null]) expect(() => autorizar({ tipo: 'agente', agente, prefixoToken }, 'ler_situacao_pedido')).toThrow(SEM_PERMISSAO);
    for (const papel of PAPEIS) expect(() => autorizar({ tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel }, 'ler_situacao_pedido')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar({ tipo: 'sistema' }, 'ler_situacao_pedido')).toThrow(SEM_PERMISSAO);
    expect(atoresProibidos('ler_situacao_pedido')).toEqual(atoresProibidos('registrar_andamento'));
  });
  it('(e) integração fora da lista ou com nome parecido é negada; o construir passa', () => {
    for (const i of ['jarvis', 'Construir', 'construir ', '', '__proto__', 'toString']) expect(permite(integracao(i), 'ler_situacao_pedido'), i).toBe(false);
    expect(permite(integracao('construir'), 'ler_situacao_pedido')).toBe(true);
  });
  it('o construir continua negado nas leituras de pessoa e de agente (não ganha outra ação)', () => {
    for (const acao of ['ler_demanda', 'ler_pacote_decisao', 'listar_demandas', 'ler_historico', 'gerar_pedido_construcao'] as const)
      expect(permite(integracao('construir'), acao), acao).toBe(false);
  });
});
```

```ts
// test/estatico/situacao.test.ts — guardas estáticas da leitura de situação (D-06). SB-01 (f): a ação
// `ler_situacao_pedido` só aparece na matriz, na rota nova e no serviço (fora de teste); nenhum arquivo 'use server',
// job ou worker a cita. A T02 acrescenta SB-03 (sem trava), SB-04 (prazo total) e SB-06 (só a rota importa o serviço).
// Cada regra tem um caso plantado que a reprova. Não importa de outro *.test.ts.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

const ROTA = 'src/app/api/pedidos-construcao/[decId]/situacao/route.ts';
const SERVICO = 'src/modules/pedido-construcao/situacao.ts';
const CITAM_A_ACAO: readonly string[] = ['src/modules/acesso/matriz.ts', ROTA, SERVICO];

const quemCita = (arquivos: ReadonlyArray<readonly [string, string]>) => arquivos.filter(([, f]) => f.includes('ler_situacao_pedido')).map(([a]) => a);
const ehServerAction = (f: string) => /^\s*['"]use server['"]/m.test(f);

describe('SB-01 (f): onde a ação ler_situacao_pedido aparece', () => {
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
      if (!f.includes('ler_situacao_pedido')) continue;
      expect(ehServerAction(f), a).toBe(false);
      expect(/^src\/(jobs|worker)\//.test(a), a).toBe(false);
    }
  });
  it('as regras pegam o caso plantado', () => {
    expect(quemCita([['src/app/x/acoes.ts', "'use server';\nautorizar(p, 'ler_situacao_pedido');"]])).toEqual(['src/app/x/acoes.ts']);
    expect(ehServerAction("'use server';\nexport async function f() {}")).toBe(true);
    expect(ehServerAction("export const x = 'use server';")).toBe(false);
  });
});
```

E as mudanças da G5 nos quatro testes da matriz (par novo e contagens).

- [ ] **Passo 2: ver falhar**

Rodar: `pnpm test src/modules/acesso test/estatico/situacao.test.ts`
Esperado: FAIL (`ler_situacao_pedido` não é ação; 24 ações; os testes da G5 já esperam 25).

- [ ] **Passo 3: a matriz**

Em `src/modules/acesso/matriz.ts`, depois de `'registrar_andamento',`:

```ts
  // 0.4.1 (RF-01, SB-01): a situação (vigente ou substituído) do Pedido de Construção, só pelo /construir.
  'ler_situacao_pedido',
```

e, depois de `registrar_andamento: SO_CONSTRUIR,`, a linha `ler_situacao_pedido: SO_CONSTRUIR,`. O comentário das
linhas 38 e 39 passa a dizer "Só sete pares abrem (RF-03 da 0.3.0, RF-01 da 0.4.0 e RF-01 da 0.4.1): awave em
criar_demanda e ler_demanda; construir nas cinco ações dele." Nada mais muda no arquivo (G4).

- [ ] **Passo 4: ver passar** — `pnpm test` (em segundo plano, G0), `pnpm lint`, `pnpm typecheck`. Acrescentar ao `PISO`,
  com o comentário "T01 do DEC-DEM-20261111-0018-v1 (SB-01): contado no fim da tarefa.", as linhas de
  `src/modules/acesso/matriz-situacao.test.ts` e `test/estatico/situacao.test.ts`. Na entrega: G4 vazio e o diff de
  `matriz.ts` (duas linhas e comentários).

### T02. Serviço `situacaoDoPedido` e rota `GET /api/pedidos-construcao/[decId]/situacao` (SB-02 a SB-06)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (rota nova de integração, oráculo) · **Cobre:** RF-01, RNF-02 a
RNF-04, CA-01.1 a CA-01.6, SB-01 (c pelo serviço trocado; `autorizar` no serviço), SB-02, SB-03, SB-04, SB-05, SB-06,
ADR-36 · **Depende de:** T01 · **Regra de comando:** G0.

**Arquivos:**
- Criar: `src/modules/pedido-construcao/situacao.ts`; `src/app/api/pedidos-construcao/[decId]/situacao/route.ts`;
  `src/modules/pedido-construcao/situacao.test.ts` (serviço: CA-01.1 a CA-01.3, divergente, consultas, sem trava,
  prazo); `src/app/api/pedidos-construcao/situacao.test.ts` (rota, contrato, 404 byte a byte, 403, nada gravado, "se e
  só se"); `src/app/api/pedidos-construcao/situacao-403.test.ts` (serviço trocado); `test/transversal/sentinelas-situacao.test.ts`
- Modificar: `test/pedidos-construcao.ts` (a chamada `situacao` em `chamadasDoConstruir`), `test/estatico/situacao.test.ts`
  (SB-03, SB-04, SB-06), `test/estatico/piso-de-assercoes.test.ts`
- Não muda: `test/matriz-rotas.test.ts` e `test/matriz-rotas-integracoes-qa.test.ts` (pegam a rota nova sozinhos: SB-01 c,
  d); `src/modules/pedido-construcao/pendentes.ts`, `src/modules/andamento/registrar.ts` (G4)

**Interfaces produzidas:** `SITUACOES_DO_PEDIDO`, `SituacaoDoPedido`, `DepsSituacao`, `situacaoDoPedido`, `GET` (G7).

- [ ] **Passo 1: escrever os testes que falham**

Em `test/pedidos-construcao.ts`, dentro de `chamadasDoConstruir`, a chamada como o cliente do `/construir` fará (GET,
Bearer, `accept: application/json`, sem `Origin`, sem cookie, sem corpo), importando `* as rotaSituacao from
'../src/app/api/pedidos-construcao/[decId]/situacao/route'`:

```ts
    // T02 do DEC-DEM-20261111-0018-v1: a leitura da situação do pedido (S-02), como o /construir vai chamar.
    situacao: (decId: string, op: Omit<OpChamada, 'corpo'> = {}) =>
      chamarRota(rotaSituacao.GET, {
        caminho: `/api/pedidos-construcao/${encodeURIComponent(decId)}/situacao`,
        params: { decId },
        bearer: credencial(op),
        semOrigin: op.semOrigin ?? true,
        cabecalhos: { accept: 'application/json', ...op.cabecalhos },
      }),
```

`src/modules/pedido-construcao/situacao.test.ts` (Postgres real, papel do app; DEC pelos serviços com
`preparadorDePedidos`; ator `construir` de `atorDeIntegracao('construir')`; relógio fixo; dados fictícios), com estes
casos:

1. **CA-01.1:** DEC aprovado com pedido gerado por pessoa e nenhum aprovado mais novo → `'vigente'`.
2. **CA-01.2:** o mesmo DEC; um v2 `cto_e_administradora` da mesma demanda com **só a primeira** aprovação → ainda
   `'vigente'`; com a segunda → `'substituido'`. E com um v2 `cto` aprovado (uma aprovação) → `'substituido'`.
3. **CA-01.3 e SB-02:** DEC inexistente com id no formato (`DEC-DEM-20991231-9999-v1`), DEC aprovado sem pedido gerado
   (`prepararDec({ gerar: false })`) e DEC cujo único `pedido_gerado` é de agente e outro de sistema (pelo
   `inserirEventoDoPedido`) → cada um rejeita com `{ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO }`.
4. **SB-02 (b), D-07:** os três casos do item 3 fazem o **mesmo número** de consultas: `vi.spyOn(pg.Client.prototype,
   'query')` em volta de cada chamada; os três números são iguais entre si.
5. **SB-02 (c):** `pedido_gerado` de pessoa, inserido pelo migrator, com `demanda_id` de **outra** demanda → o mesmo 404.
6. **SB-02 (d) e Pendência 4 de 01:** DEC substituído → `'substituido'` (não 404); DEC vigente de demanda levada a
   `encerrada` e a `entregue` (pelo migrator) → `'vigente'`.
7. **SB-03 (d), sem trava:** com `travarPedido(tx, decId)` e `travarDemanda(tx, demandaId)` segurados numa transação
   aberta em outra conexão (`comTransacao(b.poolApp, …)` que espera uma promessa do teste), `situacaoDoPedido` resolve
   com `'vigente'` **antes** de o teste soltar as travas (sem 503 e sem esperar o `lock_timeout`).
8. **SB-04 (CA-01.6):** relógio monotônico falso (molde de `registrar-prazo.test.ts`: `vi.spyOn(performance, 'now')`
   somando 1.000 ms a cada chamada) → rejeita com `{ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL }`.
9. **SB-01 no serviço:** chamado direto com `awave`, cada agente, `cto`, `administradora` e `sistema` → `sem_permissao`,
   sem abrir conexão (`vi.spyOn(b.poolApp, 'connect')` não chamado).
10. **nada gravado (CA-01.5, SB-03 c):** em cada caso acima, a contagem de linhas de `evento`, `andamento_construcao`,
    `pacote_decisao` e `decisao` e o `atualizada_em` da demanda são iguais antes e depois.

`src/app/api/pedidos-construcao/situacao.test.ts`, no molde de `andamento.test.ts` (banco, `criarDepsDeTeste`,
`definirDepsParaTeste`, tokens `construir` e `awave` reais, `substituirDestinoDoLog` guardando as linhas, relógio
fixo, a função `foto` de lá):

1. **a rota:** exporta só `GET`; `meta` = `{ acao: 'ler_situacao_pedido', rota: '/api/pedidos-construcao/[decId]/situacao' }`.
2. **CA-01.1 e SB-03 (a, b):** DEC vigente → 200, corpo igual byte a byte a `{"situacao":"vigente"}` (`await r.text()`),
   `cache-control: no-store`, `x-content-type-options: nosniff`, sem `access-control-*`; DEC substituído → 200 e corpo
   `{"situacao":"substituido"}`.
3. **CA-01.3 e SB-02 (a):** a `foto` de DEC inexistente, de DEC sem pedido gerado e de DEC com `pedido_gerado` de agente
   são iguais entre si e iguais à `foto` do 404 de DEC inexistente de `construir.entregar(…)` e de
   `construir.andamento(…, CORPO_CONSTRUINDO)`; o corpo é `{ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO }`.
4. **id fora do formato:** `DEC-xyz` → 404 sem `connect` nem `query` no pool do app (C-17; o molde está em
   `andamento.test.ts`, caso CA-02.5).
5. **CA-01.4:** com um DEC com pedido gerado: token `awave`, os quatro agentes (token de agente), `cto` e
   `administradora` (sessão com 2FA) → 403 `{ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao }`;
   sem credencial → 401.
6. **CA-01.5 e SB-03 (c):** para 200, 403, 404 e 503 (o 503 com o relógio monotônico falso), o retrato das tabelas do
   item 10 do serviço é igual antes e depois.
7. **SB-06 ("se e só se"):** para o estado do CA-01.1 e para o do CA-01.2 (depois da aprovação completa do v2), a rota
   responde `substituido` **se e só se** `construir.andamento(decId, CORPO_CONSTRUINDO)` responde 409 com
   `MENSAGENS_ANDAMENTO.decSubstituido`; no vigente, o andamento responde 204.
8. **log (RNF-04, SB-05):** cada chamada acima deixa uma linha do pino com `evento: 'requisicao'`, `rota` igual ao
   padrão e `atorTipo`; a linha não contém o `decId`, `wsod_` nem o prefixo do token.

`src/app/api/pedidos-construcao/situacao-403.test.ts` (D-07; molde de `andamento-422.test.ts`):

```ts
// SB-01 (c): o 403 sai em rota(), depois de resolverAtor e antes de qualquer consulta ao DEC. O serviço é trocado por
// um que falha se chamado; a resposta 403 é idêntica para um DEC que existe e para um que não existe. Tokens reais.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('../../../modules/pedido-construcao/situacao', () => ({
  situacaoDoPedido: vi.fn(async () => {
    throw new Error('o serviço não pode ser chamado por ator sem permissão');
  }),
}));
// … imports de banco, deps, tokens (awave, quatro agentes), sessão de cto e administradora, chamarRota, a rota e o mock …

it.each(ATORES_PROIBIDOS)('%s: 403 igual para DEC existente e inexistente, sem chamar o serviço', async (_nome, op) => {
  const existe = await foto(await chamarComo(op, DEC_COM_PEDIDO));
  const naoExiste = await foto(await chamarComo(op, 'DEC-DEM-20991231-9999-v1'));
  expect(existe.status).toBe(403);
  expect(naoExiste).toEqual(existe);
  expect(situacaoDoPedido).not.toHaveBeenCalled();
});
```

(`DEC_COM_PEDIDO` é preparado pelo migrator, sem passar pelo serviço trocado.)

`test/transversal/sentinelas-situacao.test.ts` (D-05), com a captura de `test/transversal/sentinelas.test.ts` (pino,
console e transporte falso do Sentry, linhas 60 a 77 de lá): chama a rota com o token `construir` para um DEC vigente,
um substituído, um inexistente e um de outra demanda; força um 5xx com `vi.spyOn(deps.pool, 'connect')
.mockRejectedValueOnce(new Error(\`falha fictícia com ${decId} e relation "evento" does not exist\`))`. No fim: o
`decId`, `wsod_`, o prefixo e o texto do token depois do prefixo não aparecem nas linhas do pino e do console nem nos
envelopes do Sentry; o texto `relation "evento"` não aparece no Sentry.

No fim de `test/estatico/situacao.test.ts`:

```ts
// T02: SB-03 (sem trava), SB-04 (prazo total sem piso por cima) e SB-06 (a situação informa, não autoriza).
const PROIBIDOS_NA_SITUACAO: readonly RegExp[] = [
  /set\s+local/i,
  /set_config/,
  /\bcomTransacao\s*\(/,
  /\bPromise\.all\s*\(/,
  /\btravarPedido\s*\(/,
  /\btravarDemanda\s*\(/,
  /for\s+update/i,
  /pg_advisory/,
];

describe('situacao.ts: só leitura, sem trava e com o prazo total (SB-03, SB-04)', () => {
  it('nenhum SET, transação própria, Promise.all nem trava; executarComOrcamento uma vez, com undefined', () => {
    const f = ler(SERVICO);
    for (const re of PROIBIDOS_NA_SITUACAO) expect(f, String(re)).not.toMatch(re);
    expect(f.match(/executarComOrcamento\(/g)).toHaveLength(1);
    expect(f).toMatch(/executarComOrcamento\(deps\.pool, ator, 'padrao', undefined,/);
    expect(f).not.toMatch(/\bt\?:\s*Transacao/);
    expect(f).toMatch(/autorizar\(ator, 'ler_situacao_pedido'\)/);
  });
  it('as regras pegam o caso plantado', () => {
    expect('await travarPedido(tx, decId);').toMatch(PROIBIDOS_NA_SITUACAO[4]!);
    expect("select 1 from pacote_decisao for update").toMatch(PROIBIDOS_NA_SITUACAO[6]!);
    expect('select pg_advisory_xact_lock(1)').toMatch(PROIBIDOS_NA_SITUACAO[7]!);
  });
});

describe('SB-06: só a rota nova importa o serviço da situação', () => {
  it('no código que roda, quem importa pedido-construcao/situacao é só a route.ts nova', () => {
    const importam = codigoQueRoda.filter((a) => a !== SERVICO && /pedido-construcao\/situacao['"]/.test(ler(a)));
    expect(importam).toEqual([ROTA]);
  });
});
```

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/pedido-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao.test.ts src/app/api/pedidos-construcao/situacao-403.test.ts test/estatico/situacao.test.ts`
  → FAIL (módulo e rota inexistentes).

- [ ] **Passo 3: o serviço e a rota**

```ts
// src/modules/pedido-construcao/situacao.ts — a situação do Pedido de Construção para o /construir (0.4.1, S-02,
// RF-01, ADR-36). Só a integração `construir`, pela matriz, antes de abrir transação (SB-01). Numa transação com o
// orçamento `padrao` e prazo total, sem transação de quem chama, sem SET e sem trava (SB-03, SB-04): a leitura não
// espera uma entrega nem um envio de andamento em curso. Nesta ordem:
//   1. só DEC com pedido gerado por pessoa (pendentes.ts); senão, o 404 de DEC inexistente (SB-02);
//   2. a demanda do DEC tem de ser a do evento (AN-03 da 0.4.0); senão, o mesmo 404;
//   3. `vigente` se o DEC é o aprovado vigente da demanda (aprovadoVigente, a mesma função do 409 decSubstituido do
//      andamento: a rota e o envio nunca divergem, SB-06); senão, `substituido`.
// Não filtra status final nem substituído (Pendência 4 de 01). Sem evento e sem log próprio: a linha de rota() basta.
// A situação informa, não autoriza: nenhum código do Orquestrador a usa para decidir entrega, recebimento ou andamento.
import { eq } from 'drizzle-orm';
import { pacoteDecisao } from '../../db/schema';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { executarComOrcamento } from '../integracoes/tempo-limite';
import { aprovadoVigente } from '../pacotes-decisao/substituido';
import { pedidoGeradoPorPessoa } from './pendentes';

export const SITUACOES_DO_PEDIDO = ['vigente', 'substituido'] as const;
export type SituacaoDoPedido = (typeof SITUACOES_DO_PEDIDO)[number];
export type DepsSituacao = Pick<Deps, 'pool'>;

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

export async function situacaoDoPedido(deps: DepsSituacao, ator: Ator, decId: string): Promise<SituacaoDoPedido> {
  autorizar(ator, 'ler_situacao_pedido');
  return executarComOrcamento(deps.pool, ator, 'padrao', undefined, async ({ tx }) => {
    const gerado = await pedidoGeradoPorPessoa(tx, decId);
    if (!gerado) throw naoEncontrado();
    const [dec] = await tx.select({ demandaId: pacoteDecisao.demandaId }).from(pacoteDecisao).where(eq(pacoteDecisao.id, decId));
    if (!dec || dec.demandaId !== gerado.demandaId) throw naoEncontrado();
    // O valor sai do código, nunca do banco (SB-03).
    return (await aprovadoVigente(tx, dec.demandaId))?.id === decId ? 'vigente' : 'substituido';
  });
}
```

```ts
// GET /api/pedidos-construcao/:decId/situacao → 200 { situacao: 'vigente' | 'substituido' } (RF-01, 0.4.1). Só a
// integração `construir`, pela matriz. O id passa pela regex antes de tudo (C-17). Adaptador fino: autorização, erro,
// nosniff e no-store ficam em rota(). O corpo é montado chave a chave (SB-03).
import { paramId, rota } from '../../../../../lib/rota';
import { situacaoDoPedido } from '../../../../../modules/pedido-construcao/situacao';

export const GET = rota(
  { acao: 'ler_situacao_pedido', rota: '/api/pedidos-construcao/[decId]/situacao', params: paramId.versao('decId', 'DEC') },
  async ({ deps, ator, params }) => {
    const situacao = await situacaoDoPedido(deps, ator, params.decId);
    return { json: { situacao } };
  },
);
```

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano; com `test/matriz-rotas.test.ts` e
  `test/matriz-rotas-integracoes-qa.test.ts` cobrindo a rota nova sem mudança), `pnpm lint`, `pnpm typecheck`. O `PISO`
  ganha os quatro arquivos de teste novos e sobe `test/estatico/situacao.test.ts` para a contagem do fim da tarefa. Na
  entrega: G4 vazio e o tempo de cada arquivo novo.

---

## Fase 2 — D1 com o nome da criação (S-03)

### T03. Coluna `caminhos_com_nome_na_criacao` e migration 0010 (SB-10)

**Engenheiro:** `engenheiro-dados-bd` · **Risco:** alto (migration num banco no ar; 04, seção 6) · **Cobre:** RNF-08,
SB-10, SB-07 (d), ADR-37 (forma) · **Regra de comando:** G0.

**Arquivos:**
- Criar: `drizzle/0010_<gerado>.sql` e `drizzle/meta/0010_snapshot.json` (por `pnpm db:generate`, sem editar);
  `test/estatico/migration-0010.test.ts`; `src/db/schema/caminhos-da-criacao.test.ts`
- Modificar: `src/db/schema/decisao.ts` (uma coluna); `src/db/imutabilidade.test.ts` (G5);
  `test/estatico/migration-0008.test.ts` (G5); `test/estatico/piso-de-assercoes.test.ts`
- Não muda: `drizzle/0000` a `0009` e os snapshots deles; `src/db/privilegios.ts` (G4: o `GRANT SELECT, INSERT` de tabela
  da `0003` já cobre a coluna nova)

- [ ] **Passo 1: escrever os testes que falham**

```ts
// test/estatico/migration-0010.test.ts — SB-10 e RNF-08: uma migration nova, gerada e só aditiva; nenhuma custom, nenhum
// GRANT; as da main não mudam.
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

it('a 0010 é a última e a única nova, e não é custom (nome gerado, sem rls_)', () => {
  expect(diario.entries.map((e) => e.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(diario.entries.find((e) => e.idx === 10)!.tag).toMatch(/^0010_[a-z]+_[a-z_]+$/);
  expect(diario.entries.find((e) => e.idx === 10)!.tag).not.toMatch(/rls_/);
});

it('a 0010 é só o ADD COLUMN anulável e sem padrão', () => {
  expect(comandos(sqlDa(10))).toEqual(['ALTER TABLE "pacote_decisao" ADD COLUMN "caminhos_com_nome_na_criacao" text[];']);
});
```

```ts
// src/db/schema/caminhos-da-criacao.test.ts — SB-07 (d) e SB-10: a coluna nova existe, é anulável e sem padrão, não
// muda as linhas existentes, e o papel do app só inclui (sem UPDATE). Postgres real; dados fictícios.
// (insere demanda, ESP, RSK e DEC pelo migrator com o SQL de src/db/schema/andamento.test.ts, sem a coluna nova)
// Casos:
//   1. information_schema.columns: data_type 'ARRAY', udt_name '_text', is_nullable 'YES', column_default null;
//   2. o DEC inserido sem a coluna fica com null (o DEC anterior à 0.4.1);
//   3. o papel do app inclui um DEC com a coluna ['demanda.titulo'] e com [] (lista vazia);
//   4. `update pacote_decisao set caminhos_com_nome_na_criacao = '{}'` pelo papel do app → 42501, e o retrato da tabela
//      (jsonb_agg de to_jsonb) igual antes e depois;
//   5. pacote_decisao tem 21 colunas: as 20 de 41108ee (contadas em src/db/schema/decisao.ts pela etapa 05) e a nova.
```

E as mudanças da G5 em `src/db/imutabilidade.test.ts` (o caso novo do `it.each`) e em
`test/estatico/migration-0008.test.ts`:

```ts
it('a 0008 e a 0009 estão nos índices 8 e 9 do diário; a 0009 é a custom de nome rls_andamento_construcao', () => {
  expect(diario.entries.find((e) => e.idx === 8)?.tag).toBe('0008_slippery_whirlwind');
  expect(diario.entries.find((e) => e.idx === 9)?.tag).toBe('0009_rls_andamento_construcao');
});
```

- [ ] **Passo 2: ver falhar** — `pnpm test test/estatico/migration-0010.test.ts src/db/schema/caminhos-da-criacao.test.ts src/db/imutabilidade.test.ts`
  → FAIL (diário até 9; coluna inexistente).

- [ ] **Passo 3: o esquema e a migration**

Em `src/db/schema/decisao.ts`, depois de `criadaEm: momento().notNull(),`:

```ts
    // 0.4.1 (S-03, ADR-37, SB-07): os caminhos de textosDaCriacao cujo texto continha o nome do solicitante em vigor na
    // criação, gravados uma vez por criar.ts, sob a trava da demanda. Só nomes de campo de lista fechada, sem o nome nem
    // hash dele (acessória do D5). null = DEC criado antes da 0.4.1, que confere só o nome atual. Nunca sai em vista.
    caminhosComNomeNaCriacao: text().array(),
```

Rodar: `pnpm db:generate` → cria `drizzle/0010_<gerado>.sql`; não editar. Sem migration custom.

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano), `pnpm lint`, `pnpm typecheck`. `PISO`:
  `src/db/schema/caminhos-da-criacao.test.ts` e `test/estatico/migration-0010.test.ts`. Na entrega, em
  `## Decisões tomadas`: a volta é a restauração do backup (caminho B, 02 seção 8); o SQL equivalente, só para registro,
  é `ALTER TABLE "pacote_decisao" DROP COLUMN "caminhos_com_nome_na_criacao";` pelo migrator, e não é usado porque a
  saúde da 0.4.0 fica em 503 com o diário da 0.4.1. `alteram_dado: false` esperado no ensaio.

### T04. Textos da criação e marcação na criação do DEC (SB-07, SB-08 c e f, SB-09 a e b)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (dado pessoal: conferência do nome) · **Cobre:** RF-02 (gravação),
ADR-37, SB-07 (a, b, c, e), SB-08 (c, f), SB-09 (a, b), D-04 · **Depende de:** T03 · **Regra de comando:** G0.

**Arquivos:**
- Criar: `src/modules/pedido-construcao/caminhos-da-criacao.ts`; `src/modules/pedido-construcao/textos-da-criacao.test.ts`
  (igualdade e regex); `src/modules/pacotes-decisao/marcacao-da-criacao.test.ts` (três caminhos, concorrência);
  `test/transversal/visibilidade-caminhos-da-criacao.test.ts`; `test/estatico/caminhos-da-criacao.test.ts`
- Modificar: `src/modules/pedido-construcao/conteudo.ts` (D-04), `src/modules/pedido-construcao/montar.ts`,
  `src/modules/pacotes-decisao/criar.ts`, `test/estatico/piso-de-assercoes.test.ts`
- Não muda: `src/modules/pacotes-decisao/consultas.ts` (G4: a vista é montada campo a campo e não lê a coluna),
  `src/modules/pacotes-decisao/schemas.ts`, `src/modules/pedido-construcao/conferir.ts` (T05)

**Interfaces produzidas:** `DadosDaCriacao`, `CAMINHO_DA_OPCAO`, `textosDaCriacao`, `RE_CAMINHO_DA_CRIACAO`,
`MAXIMO_DE_CAMINHOS`, `MENSAGEM_CAMINHOS_INVALIDOS`, `caminhosComNomeNaCriacao`, `lerCaminhosDaCriacao`,
`caminhosDaCriacaoNoPedido` (G7; as duas últimas usadas na T05, já testadas aqui).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/pedido-construcao/textos-da-criacao.test.ts — SB-08 (c, f): textosDaCriacao e textosDoPedido saem da
// mesma função interna, e a tradução dos caminhos da criação dá **o mesmo conjunto** (igualdade, não subconjunto) de
// caminhos e valores do pedido do mesmo DEC aprovado com cada opção. Testes unitários, sem banco; vistas fictícias.
import { describe, expect, it } from 'vitest';
import { caminhosComNomeNaCriacao, caminhosDaCriacaoNoPedido, lerCaminhosDaCriacao, MAXIMO_DE_CAMINHOS, MENSAGEM_CAMINHOS_INVALIDOS, RE_CAMINHO_DA_CRIACAO } from './caminhos-da-criacao';
import { CAMINHO_DA_OPCAO, textosDaCriacao, textosDoPedido, type TextoDoPedido } from './montar';
// … vistas fictícias de DEC aprovado (PacoteDecisaoVista), ESP (EspecificacaoVista) e RSK (ParecerRiscoVista) …

const aprovadoCom = (dec, opcao: 'A' | 'B') => ({ ...dec, statusDecisao: 'aprovada', decisao: { ...dec.decisao, opcaoEscolhida: opcao } });

// Os textos da criação traduzidos por caminhosDaCriacaoNoPedido, com todos os caminhos marcados: a opção X vira
// decisao.opcaoEscolhida (com o mesmo valor), a outra sai, o resto fica, na ordem da criação.
function traduzidos(textos: readonly TextoDoPedido[], opcao: 'A' | 'B'): TextoDoPedido[] {
  const marcados = caminhosDaCriacaoNoPedido(textos.map((t) => t.caminho), opcao);
  return textos.flatMap((t) =>
    t.caminho === CAMINHO_DA_OPCAO[opcao] ? [{ caminho: 'decisao.opcaoEscolhida', valores: t.valores }] : marcados.has(t.caminho) ? [t] : [],
  );
}

describe('SB-08 (c): igualdade entre textosDaCriacao traduzido e textosDoPedido', () => {
  it.each([
    ['com sistema_alvo e repositório, listas cheias', ESP_CHEIA],
    ['sem sistema_alvo nem repositório', ESP_SEM_OPCIONAIS],
    ['listas vazias', ESP_LISTAS_VAZIAS],
    ['listas nulas', ESP_LISTAS_NULAS],
  ])('%s: para A e para B, os mesmos caminhos, na mesma ordem, com os mesmos valores', (_nome, esp) => {
    for (const opcao of ['A', 'B'] as const) {
      const criacao = textosDaCriacao({ dec: DEC, esp, rsk: RSK });
      expect(traduzidos(criacao, opcao), opcao).toEqual(textosDoPedido({ dec: aprovadoCom(DEC, opcao), esp, rsk: RSK }));
    }
  });
  it('todo caminho de textosDaCriacao casa RE_CAMINHO_DA_CRIACAO; o total cabe em MAXIMO_DE_CAMINHOS', () => {
    const t = textosDaCriacao({ dec: DEC, esp: ESP_COM_50_E_50, rsk: RSK });
    for (const { caminho } of t) expect(RE_CAMINHO_DA_CRIACAO.test(caminho), caminho).toBe(true);
    expect(t.length).toBeLessThanOrEqual(MAXIMO_DE_CAMINHOS);
  });
});

describe('caminhosDaCriacaoNoPedido: só a opção escolhida vira decisao.opcaoEscolhida', () => {
  it('a opção não escolhida some; os outros caminhos ficam', () => {
    expect([...caminhosDaCriacaoNoPedido(['demanda.titulo', 'opcaoA.descricao', 'opcaoB.descricao', 'risco.conteudo'], 'B')].sort()).toEqual(['decisao.opcaoEscolhida', 'demanda.titulo', 'risco.conteudo']);
    expect([...caminhosDaCriacaoNoPedido(['opcaoA.descricao'], 'B')]).toEqual([]);
  });
});

describe('caminhosComNomeNaCriacao', () => {
  it('os caminhos dos textos que contêm o nome, sem o valor; nome nulo ou curto: lista vazia', () => {
    const t = textosDaCriacao({ dec: { ...DEC, opcaoB: { descricao: 'Falar com a Ficticia' } }, esp: ESP_CHEIA, rsk: RSK });
    expect(caminhosComNomeNaCriacao(t, ['Ficticia'])).toEqual(['opcaoB.descricao']);
    expect(caminhosComNomeNaCriacao(t, [])).toEqual([]);
    expect(JSON.stringify(caminhosComNomeNaCriacao(t, ['Ficticia']))).not.toContain('Falar');
  });
});

describe('SB-08 (e, f): lerCaminhosDaCriacao falha fechado; a regex não tem estado', () => {
  it('null fica null; lista válida passa; fora do formato lança o erro fixo, sem o valor', () => {
    expect(lerCaminhosDaCriacao(null)).toBeNull();
    expect(lerCaminhosDaCriacao(['demanda.titulo', 'definicao_de_pronto[3]'])).toEqual(['demanda.titulo', 'definicao_de_pronto[3]']);
    for (const ruim of [['__proto__'], ['demanda.titulo '], ['x'], ['criterios_aceite_preliminares[12345]'], 'demanda.titulo', [1], Array(MAXIMO_DE_CAMINHOS + 1).fill('demanda.titulo')]) {
      const e = (() => {
        try {
          lerCaminhosDaCriacao(ruim);
          return null;
        } catch (x) {
          return x as Error;
        }
      })();
      expect(e?.message, JSON.stringify(ruim).slice(0, 40)).toBe(MENSAGEM_CAMINHOS_INVALIDOS);
      expect(e).not.toHaveProperty('issues');
    }
  });
  it('sem flag g nem y; com âncoras; duas chamadas seguidas dão o mesmo resultado', () => {
    expect(RE_CAMINHO_DA_CRIACAO.flags).toBe('');
    expect(RE_CAMINHO_DA_CRIACAO.source.startsWith('^')).toBe(true);
    expect(RE_CAMINHO_DA_CRIACAO.source.endsWith('$')).toBe(true);
    for (const v of ['demanda.titulo', 'x']) expect(RE_CAMINHO_DA_CRIACAO.test(v)).toBe(RE_CAMINHO_DA_CRIACAO.test(v));
  });
});
```

`src/modules/pacotes-decisao/marcacao-da-criacao.test.ts` (Postgres real; papel do app; relógio fixo; uma autora por
caso, C-36; dados fictícios; a coluna lida pelo migrator):

1. **SB-07 (b), três caminhos:** um DEC pela rota de pessoa (`POST /api/demandas/[id]/pacotes-decisao` com sessão
   `cto`), um pela mesma rota com token do agente `consolidacao` e um pelo caminho do worker (`criarPacoteDecisao(deps,
   consolidacao, demandaId, entrada, t, { especificacaoId, parecerRiscoId })` dentro de `comTransacao`) → as três
   colunas são **não nulas**; numa demanda sem o nome em texto algum, `[]`.
2. **SB-07 (c) e RF-02:** solicitante "Joana Ficticia Lima" e ESP com "Lima" no `situacaoAtual` → a coluna é
   `['especificacao.conteudo']`; cada item casa `RE_CAMINHO_DA_CRIACAO`; nenhum item contém "Lima", "Joana" nem
   "Ficticia".
3. **SB-07 (a):** os corpos da rota de pessoa e da rota do agente com `caminhosComNomeNaCriacao: []` e com `null` →
   a resposta é a de hoje para chave desconhecida (leia qual é, recusa 400 ou descarte, e fixe no teste), e, se o DEC
   for criado, a coluna é a calculada (`['especificacao.conteudo']`), nunca a enviada.
4. **SB-07 (e), duas conexões:** (i) uma transação aberta por `comTransacao(b.poolApp, …)` troca o `solicitanteNome`
   para "Outra Pessoa" com `alterarDemanda(…, t)` e espera o teste; a criação do DEC em paralelo espera a trava; o teste
   solta → a marcação é a do nome **novo** (`[]` para a ESP com "Lima"). (ii) Ao contrário: a criação com `t` segura a
   trava; a troca do nome espera; o teste solta → a marcação é a do nome **antigo** (`['especificacao.conteudo']`).
5. **o 201 da criação** continua igual ao de hoje (as chaves da vista de pessoa não mudam; sem `caminhos…`).

`test/transversal/visibilidade-caminhos-da-criacao.test.ts` (SB-09 a, b; molde de
`test/transversal/visibilidade-andamento.test.ts`): parte de `MATRIZ` e percorre as ações de leitura que alcançam o DEC
(`ler_pacote_decisao`, `ler_demanda`, `listar_demandas`, a listagem de DEC) com pessoa e com os quatro agentes, chamando
as rotas reais; o texto de cada resposta não contém `caminhos` nem `caminhosComNomeNaCriacao`, e as chaves de
`GET /api/pacotes-decisao/:decId` são as de `41108ee` (escreva a lista); a entrada montada para o provedor falso (o
`montarEntrada` do worker da consolidação) também não contém `caminhos`. Exceção da G3.1: nasce verde, porque a vista já
é montada campo a campo; a entrega diz isso.

`test/estatico/caminhos-da-criacao.test.ts` (SB-07): no código que roda, `insert(pacoteDecisao)` só aparece em
`src/modules/pacotes-decisao/criar.ts`; `caminhosComNomeNaCriacao` não aparece em nenhum arquivo de `schemas.ts`, em
`src/app/**/route.ts`, em arquivo `'use server'`, em `src/jobs/` nem em `src/worker/` (só em `src/db/schema/decisao.ts`,
`criar.ts`, `conferir.ts` e `caminhos-da-criacao.ts`); com casos plantados que reprovam.

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/pedido-construcao/textos-da-criacao.test.ts src/modules/pacotes-decisao/marcacao-da-criacao.test.ts test/estatico/caminhos-da-criacao.test.ts`
  → FAIL (módulo `caminhos-da-criacao` e `textosDaCriacao` inexistentes; coluna nula).

- [ ] **Passo 3: o código**

`src/modules/pedido-construcao/conteudo.ts` recebe, sem mudar o corpo, `PARTES_DA_DESCRICAO`, o separador (exportado
como `SEPARADOR_DA_DESCRICAO`), `RE_ROTULO_DA_DESCRICAO` e `descricaoSemRotulos`, com o comentário de origem.
`src/modules/pacotes-decisao/criar.ts` passa a importá-los de lá e reexporta:
`export { descricaoSemRotulos, PARTES_DA_DESCRICAO } from '../pedido-construcao/conteudo';` (D-04).

`src/modules/pedido-construcao/montar.ts` (importa `descricaoSemRotulos` de `./conteudo`, não mais de `criar.ts`):

```ts
// D1 do 0013 e 0.4.1 (SB-08): uma fonte só para os textos escritos por pessoa. textosDoPedido (DEC aprovado) e
// textosDaCriacao (DEC ainda sem decisão: as duas opções no lugar da escolhida) saem desta função, na mesma ordem.
function textosEscritos(
  base: Pick<PacoteDecisaoVista, 'demandaTitulo' | 'demandaDescricao'>,
  esp: EspecificacaoVista,
  rsk: ParecerRiscoVista,
  daDecisao: readonly TextoDoPedido[],
): TextoDoPedido[] {
  const lista = (caminho: string, itens: readonly string[] | null): TextoDoPedido[] =>
    (itens ?? []).map((v, i) => ({ caminho: `${caminho}[${i}]`, valores: [v] }));
  const opcional = (caminho: string, v: string | null): TextoDoPedido[] => (v === null ? [] : [{ caminho, valores: [v] }]);
  return [
    { caminho: 'demanda.titulo', valores: [base.demandaTitulo] },
    { caminho: 'demanda.descricao', valores: [descricaoSemRotulos(base.demandaDescricao)] },
    { caminho: 'especificacao.conteudo', valores: valoresDaEspecificacao(esp) },
    { caminho: 'risco.conteudo', valores: valoresDoParecer(rsk) },
    ...daDecisao,
    ...opcional('sistema_alvo', esp.sistemaAlvo),
    ...opcional('repositorio_destino', esp.repositorioDestino),
    ...lista('criterios_aceite_preliminares', esp.criteriosAceitePreliminares),
    ...lista('definicao_de_pronto', esp.definicaoDePronto),
  ];
}

export function textosDoPedido(dados: DadosDoPedido): TextoDoPedido[] {
  const { dec, esp, rsk } = dados;
  return textosEscritos(dec, esp, rsk, [{ caminho: 'decisao.opcaoEscolhida', valores: [opcaoEscolhida(dec).descricao] }]);
}

// 0.4.1 (S-03, ADR-37): os mesmos textos na criação, com cada opção no caminho dela.
export type DadosDaCriacao = { dec: Pick<PacoteDecisaoVista, 'demandaTitulo' | 'demandaDescricao' | 'opcaoA' | 'opcaoB'>; esp: EspecificacaoVista; rsk: ParecerRiscoVista };
export const CAMINHO_DA_OPCAO = Object.freeze({ A: 'opcaoA.descricao', B: 'opcaoB.descricao' } as const);

export function textosDaCriacao(dados: DadosDaCriacao): TextoDoPedido[] {
  const { dec, esp, rsk } = dados;
  return textosEscritos(
    dec,
    esp,
    rsk,
    OPCOES_DECISAO.map((o) => ({ caminho: CAMINHO_DA_OPCAO[o], valores: [(o === 'A' ? dec.opcaoA : dec.opcaoB).descricao] })),
  );
}
```

```ts
// src/modules/pedido-construcao/caminhos-da-criacao.ts — 0.4.1 (S-03, ADR-37, SB-07, SB-08): os caminhos que o nome do
// solicitante em vigor na criação marcou. Só nomes de campo de uma lista fechada, sem o nome nem o valor. A leitura
// falha fechada: valor fora do formato é erro interno com mensagem fixa (nunca tratado como null nem como lista vazia).
import { z } from 'zod';
import type { OpcaoDecisao } from '../../db/schema/decisao';
import { temNome } from '../dados-pessoais/minimizar';
import { LIMITE_ITENS } from '../demandas/schemas';
import { CAMINHO_DA_OPCAO, type TextoDoPedido } from './montar';

// Âncoras e nenhuma flag: `test` não guarda estado entre chamadas (SB-08 f).
export const RE_CAMINHO_DA_CRIACAO =
  /^(?:demanda\.titulo|demanda\.descricao|especificacao\.conteudo|risco\.conteudo|opcao[AB]\.descricao|sistema_alvo|repositorio_destino|criterios_aceite_preliminares\[\d{1,4}\]|definicao_de_pronto\[\d{1,4}\])$/;
// Quatro textos fixos, as duas opções, os dois opcionais e as duas listas cheias.
export const MAXIMO_DE_CAMINHOS = 8 + 2 * LIMITE_ITENS;
export const MENSAGEM_CAMINHOS_INVALIDOS = 'caminhos da criação do DEC fora do formato';

const caminhosSchema = z.array(z.string().regex(RE_CAMINHO_DA_CRIACAO)).max(MAXIMO_DE_CAMINHOS).nullable();

export function caminhosComNomeNaCriacao(textos: readonly TextoDoPedido[], nomes: readonly string[]): string[] {
  return textos.filter((t) => t.valores.some((v) => temNome(v, nomes))).map((t) => t.caminho);
}

// O erro do Zod traria o valor nas `issues`: sai um Error com mensagem fixa (500 por mapearErro, Sentry reduzido).
export function lerCaminhosDaCriacao(valor: unknown): readonly string[] | null {
  const r = caminhosSchema.safeParse(valor);
  if (!r.success) throw new Error(MENSAGEM_CAMINHOS_INVALIDOS);
  return r.data;
}

// Os caminhos gravados na criação, no vocabulário do pedido: a opção escolhida vira decisao.opcaoEscolhida, e a outra
// sai (a opção não escolhida não recusa o pedido, SB-08 d).
export function caminhosDaCriacaoNoPedido(gravados: readonly string[], escolhida: OpcaoDecisao): ReadonlySet<string> {
  const saida = new Set<string>();
  for (const c of gravados) {
    if (c === CAMINHO_DA_OPCAO[escolhida]) saida.add('decisao.opcaoEscolhida');
    else if (c !== CAMINHO_DA_OPCAO.A && c !== CAMINHO_DA_OPCAO.B) saida.add(c);
  }
  return saida;
}
```

Em `criar.ts`, dentro de `corpo`, depois de `rsk` e antes de `proximaVersao`:

```ts
    // 0.4.1 (S-03, SB-07): a marcação do nome em vigor na criação, sobre os mesmos textos que o D1 confere na geração.
    // O nome é o da linha travada (`d`, a mesma fonte dos `nomes` do 201); a ESP e o RSK citados, lidos pela PK sob a trava.
    const opcaoA = opcaoGravada(entrada.opcaoA);
    const opcaoB = opcaoGravada(entrada.opcaoB);
    const demandaDescricao = descricaoDaDemanda(d);
    const textos = textosDaCriacao({
      dec: { demandaTitulo: d.titulo, demandaDescricao, opcaoA, opcaoB },
      esp: await obterEspecificacao(tx, esp.id),
      rsk: await obterParecerRisco(tx, rsk.id),
    });
    const nomes = nomesDoSolicitante(d.solicitanteNome);
```

e o insert passa a usar uma linha tipada com a coluna obrigatória (SB-07):

```ts
    const linha: typeof pacoteDecisao.$inferInsert & { caminhosComNomeNaCriacao: string[] } = {
      // … os campos de hoje, com demandaDescricao, opcaoA e opcaoB das variáveis acima …
      caminhosComNomeNaCriacao: caminhosComNomeNaCriacao(textos, nomes),
    };
    await tx.insert(pacoteDecisao).values(linha);
```

e o `return` final de `corpo` usa o mesmo `nomes`. Nada mais muda em `criar.ts`.

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano; os testes do D1 da 0.4.0 e do `criar.test.ts` passam sem
  mudança), `pnpm lint`, `pnpm typecheck`. `PISO`: os quatro arquivos novos de teste. Na entrega: G4 vazio.

### T05. D1 com o nome da criação na geração e na entrega (SB-08, SB-09 c e d)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (dado pessoal) · **Cobre:** RF-02, RNF-09, CA-02.1 a CA-02.5,
SB-08 (a, b, d, e), SB-09 (c, d) · **Depende de:** T04 · **Regra de comando:** G0.

**Arquivos:**
- Criar: `src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts`; `test/transversal/sentinelas-nome-da-criacao.test.ts`
- Modificar: `src/modules/pedido-construcao/conferir.ts`; `test/estatico/piso-de-assercoes.test.ts`
- Não muda: `src/modules/pedido-construcao/entregar.ts`, `gerar.ts`, `montar.ts` (o JSON do pedido não muda, CA-02.4)

- [ ] **Passo 1: escrever os testes que falham**

`src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts` (Postgres real; papel do app; DEC pelos serviços;
relógio fixo; uma autora por caso; dados fictícios):

1. **CA-02.1:** solicitante "Joana Ficticia Lima", DEC aprovado criado com esse nome e ESP com "Lima" →
   `gerarPedido` rejeita com `nao_processavel`, `MENSAGENS_PEDIDO.naoPassou` e `extras.erros` contendo
   `'especificacao.conteudo: nome'`; nenhum `pedido_gerado`.
2. **CA-02.2:** o mesmo DEC; `alterarDemanda` troca o `solicitanteNome` para "Outra Pessoa"; gerar de novo → o mesmo
   422, com o mesmo caminho, sem `pedido_gerado` (antes da 0.4.1, passava: é o critério 2 do pedido).
3. **CA-02.3:** o DEC do caso 2 com um `pedido_gerado` de pessoa inserido pelo migrator (`inserirEventoDoPedido`) →
   `entregarPedido` com o ator `construir` rejeita pela mesma regra, sem `pedido_entregue`.
4. **SB-08 (d):** o nome antigo só na **opção não escolhida** (B, com a A aprovada) e o nome trocado depois → o pedido
   sai (200), porque a opção B não vai ao pedido.
5. **coluna nula (opção a da 7.2, item 1):** um DEC com a coluna `null` (posta pelo migrator) e o nome antigo na ESP,
   com o nome trocado → o pedido sai; com o nome atual na ESP → 422 como hoje.
6. **SB-08 (e), falha fechada:** a coluna trocada pelo migrator para `'{__proto__}'`, `'{"demanda.titulo "}'`, `'{x}'`
   e `'{"criterios_aceite_preliminares[12345]"}'` → `gerarPedido` rejeita com erro **não** `ErroDominio`, com
   `mapearErro` dando 500 `erro_interno`; `entregarPedido` idem; nenhum `pedido_gerado` nem `pedido_entregue`; o Sentry
   falso (molde de `test/transversal/sentinelas.test.ts`) não recebe o valor.
7. **SB-08 (b) e CA-02.4:** os testes do D1 e do CA-22.2 de hoje passam sem mudança (`gerar.test.ts`,
   `pedido.test.ts`, `acoes-pedido.test.ts`); um DEC sem nome em texto algum dá o mesmo JSON de `montarPedido` +
   `serializarPedido` sobre a vista, e o JSON não contém `caminhos`.
8. **ordem dos erros:** com e-mail na ESP e o nome da criação no título, `extras.erros` é a lista do C-28 primeiro e
   depois os caminhos com `nome`, na ordem de `textosDoPedido`, sem repetir um caminho marcado pelos dois critérios.

`test/transversal/sentinelas-nome-da-criacao.test.ts` (D-05; SB-09 d, RNF-09, CA-02.5): solicitante com a sentinela
própria `'Pessoa Sentinelazyx Ficticia'`, ESP com "Sentinelazyx"; cria o DEC (rota de pessoa), troca o nome, gera
(422) e tenta a entrega (422). No fim, "Sentinelazyx" não aparece: nas respostas, nas linhas do pino e do console, nos
envelopes do Sentry, em `evento` (`antes::text`, `depois::text`), na coluna `caminhos_com_nome_na_criacao` nem em
nenhuma tabela do esquema `pgboss` (a consulta de `sentinelas.test.ts`).

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts test/transversal/sentinelas-nome-da-criacao.test.ts`
  → FAIL (caso 2 gera o pedido; caso 6 gera o pedido).

- [ ] **Passo 3: o código**

Em `conferir.ts`, o primeiro `select` traz a coluna, lida logo pelo schema:

```ts
  const [alvo] = await tx
    .select({ demandaId: pacoteDecisao.demandaId, caminhosDaCriacao: pacoteDecisao.caminhosComNomeNaCriacao })
    .from(pacoteDecisao)
    .where(eq(pacoteDecisao.id, decId));
  if (!alvo) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  // 0.4.1 (S-03, SB-08): imutável desde a criação; fora do formato é erro interno, nunca null nem lista vazia.
  const daCriacao = lerCaminhosDaCriacao(alvo.caminhosDaCriacao);
```

e o filtro do D1 (passo 4 do comentário do topo, que ganha a frase "ou o caminho marcado pelo nome em vigor na criação
do DEC, gravado a partir da 0.4.1"):

```ts
  const nomes = nomesDoSolicitante(demandaTravada.solicitanteNome);
  // montarPedido já recusou o DEC sem decisão aprovada: aqui a opção existe.
  const escolhida = dec.decisao?.opcaoEscolhida;
  const marcados = daCriacao === null || !escolhida ? new Set<string>() : caminhosDaCriacaoNoPedido(daCriacao, escolhida);
  const comNome = textosDoPedido({ dec, esp, rsk })
    .filter((texto) => marcados.has(texto.caminho) || texto.valores.some((v) => temNome(v, nomes)))
    .map((texto) => `${texto.caminho}: ${TIPO_NOME}`);
```

Nada mais muda em `conferir.ts` nesta tarefa (o texto de `MENSAGENS_PEDIDO.substituido` é da T11).

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano), `pnpm lint`, `pnpm typecheck`. `PISO`: os dois arquivos
  novos. Na entrega: G4 vazio e o diff de `conferir.ts`.

---

## Fase 3 — Arquivamento (S-04)

### T06. Destino do arquivamento pelo aprovado vigente (SB-11)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (regra de status; 04, seção 6) · **Cobre:** RF-03 (servidor),
CA-03.1 a CA-03.5, SB-11, ADR-38, decisão 7.1 · **Regra de comando:** G0.

**Arquivos:**
- Criar: `src/modules/demandas/arquivamento.ts`; `src/modules/demandas/arquivamento.test.ts` (tabela pura);
  `src/modules/demandas/arquivamento-status.test.ts` (pelo banco); `src/modules/pacotes-decisao/arquivar-com-vigente.test.ts`
  (CA-03.1 a CA-03.5, concorrência); `test/estatico/arquivamento.test.ts`
- Modificar: `src/modules/demandas/transicoes.ts`, `src/modules/pacotes-decisao/substituido.ts`,
  `src/modules/pacotes-decisao/decidir.ts`; testes da G5 (`servico.test.ts:430`, comentário de `substituicao.test.ts:146`);
  `test/estatico/piso-de-assercoes.test.ts`

**Interfaces produzidas:** `ESTADOS_DO_VIGENTE`, `EstadoDoVigente`, `estadoDoVigente`, `destinoDoArquivamento`,
`VigenteDaDemanda`, `vigenteDaDemanda`, `mudarStatusPorArquivamento` (G7).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/demandas/arquivamento.test.ts — SB-11 (a) e ADR-38: a tabela do arquivamento, 9 status × 3 estados, com
// o resultado de cada célula. Nenhuma termina em em_construcao, entregue ou devolvida; aprovada só com o vigente
// atualizado. Teste unitário, sem banco.
import { describe, expect, it } from 'vitest';
import { STATUS, type Status } from './schemas';
import { destinoDoArquivamento, estadoDoVigente, ESTADOS_DO_VIGENTE, type EstadoDoVigente } from './arquivamento';

const ESPERADO: Readonly<Record<Status, Readonly<Record<EstadoDoVigente, Status | null>>>> = {
  nova: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: 'em_analise' },
  em_analise: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: null },
  aguardando_informacao: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: 'em_analise' },
  pronta_para_decisao: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: 'em_analise' },
  aprovada: { nenhum: null, atualizado: null, desatualizado: null },
  em_construcao: { nenhum: null, atualizado: null, desatualizado: null },
  devolvida: { nenhum: null, atualizado: null, desatualizado: null },
  entregue: { nenhum: null, atualizado: null, desatualizado: null },
  encerrada: { nenhum: null, atualizado: null, desatualizado: null },
};

describe('destinoDoArquivamento (SB-11 a)', () => {
  it('a tabela cobre os nove status e os três estados', () => {
    expect(Object.keys(ESPERADO).sort()).toEqual([...STATUS].sort());
    expect([...ESTADOS_DO_VIGENTE]).toEqual(['nenhum', 'atualizado', 'desatualizado']);
  });
  it.each(STATUS.flatMap((s) => ESTADOS_DO_VIGENTE.map((e) => [s, e] as const)))('%s com vigente %s', (status, estado) => {
    expect(destinoDoArquivamento(status, estado)).toBe(ESPERADO[status][estado]);
  });
  it('os únicos destinos são encerrada, aprovada, em_analise e null; aprovada só com atualizado', () => {
    const todos = STATUS.flatMap((s) => ESTADOS_DO_VIGENTE.map((e) => [e, destinoDoArquivamento(s, e)] as const));
    expect(new Set(todos.map(([, d]) => d))).toEqual(new Set(['encerrada', 'aprovada', 'em_analise', null]));
    expect(todos.filter(([, d]) => d === 'aprovada').every(([e]) => e === 'atualizado')).toBe(true);
  });
  it('status ou estado fora da lista lança (switch com never)', () => {
    expect(() => destinoDoArquivamento('robo' as Status, 'nenhum')).toThrow();
    expect(() => destinoDoArquivamento('nova', 'meio' as EstadoDoVigente)).toThrow();
  });
  it('estadoDoVigente: null → nenhum; desatualizado → desatualizado; senão atualizado', () => {
    expect(estadoDoVigente(null)).toBe('nenhum');
    expect(estadoDoVigente({ desatualizado: true })).toBe('desatualizado');
    expect(estadoDoVigente({ desatualizado: false })).toBe('atualizado');
  });
});
```

`src/modules/demandas/arquivamento-status.test.ts` (Postgres real; demanda em cada status pelo migrator, molde de
`servico.test.ts` `demandaEm`): para cada um dos nove status e cada estado, `mudarStatusPorArquivamento` numa
`comTransacao` → status final igual à tabela; quando muda, um `status_alterado` com `atorTipo: 'sistema'`, `antes` e
`depois`; quando não muda (destino nulo ou igual), nenhum evento e `atualizada_em` igual. A coluna `nenhum` é a mesma
expectativa da linha que sai de `servico.test.ts:430` (G5).

`src/modules/pacotes-decisao/arquivar-com-vigente.test.ts` (Postgres real; serviços; molde de `substituicao.test.ts`,
`comV1Aprovado` e `novoDec`; relógio fixo, cada teste num dia próprio, C-36):

1. **CA-03.1:** demanda em `pronta_para_decisao`, v1 aprovado e atualizado, v2 pendente; arquivar o v2 → demanda em
   `aprovada`; o histórico tem `status_alterado` de `pronta_para_decisao` para `aprovada` pelo Sistema; e
   `temPacoteAprovadoAtualizado(db, id)` é `true` (o mesmo predicado da transição manual, SB-11).
2. **CA-03.2:** em seguida, `gerarPedido` do v1 sai (200, `pedido_gerado`); `situacaoDoPedido` do v1 é `'vigente'`.
3. **CA-03.3 (outro sentido):** sem DEC aprovado e com o v1 pendente; arquivar o v1 → `encerrada`, como hoje.
4. **CA-03.4:** v1 aprovado, v2 pendente; devolver o v2 → `em_analise`, como hoje.
5. **CA-03.5:** v1 `cto_e_administradora` aprovado e v2 `cto` pendente (aprovação recusada pelo S-01); arquivar o v2 →
   `aprovada`, e o v1 gera.
6. **7.1:** v1 aprovado e desatualizado (ESP nova depois dele), v2 pendente criado depois da ESP (v2 atualizado),
   demanda em `pronta_para_decisao`; arquivar o v2 → `em_analise`. Com a demanda levada antes a `em_analise` pelo
   migrator → continua `em_analise`, sem evento novo.
7. **SB-11 (c):** v1 `cto_e_administradora` com só a primeira aprovação e v2 pendente; arquivar o v2 → `encerrada`.
8. **fora das origens:** v1 aprovado, demanda levada a `aprovada` e v2 pendente; arquivar o v2 → continua `aprovada`,
   sem evento de status.
9. **SB-11 (d), duas conexões, as duas ordens:** (i) `criarEspecificacao(…, t)` numa transação segurada pelo teste; o
   arquivamento do v2 em paralelo espera a trava; o teste solta → `em_analise` (viu o v1 desatualizado). (ii)
   `registrarDecisao(… arquivada …, t)` segurado; a ESP nova espera; o teste solta → `aprovada`, e só depois o v1 fica
   desatualizado. Nunca `aprovada` com o v1 desatualizado no commit do arquivamento.
10. **SB-11 (e):** 50 repetições de `Promise.allSettled([arquivar o v2, alterarDemanda(status → em_analise)])`, com
    a demanda em `pronta_para_decisao` e o v1 atualizado, em demandas próprias (uma autora por repetição, C-36):
    nenhuma rejeita com `40P01`, e a demanda termina em `aprovada` nos dois desfechos possíveis, que são os únicos
    aceitos: (i) a manual confirma antes (`pronta_para_decisao` → `em_analise`) e o arquivamento leva de `em_analise` a
    `aprovada`; (ii) o arquivamento confirma antes (→ `aprovada`) e a manual é recusada com
    `MOTIVOS_TRANSICAO.foraDaTabela` (`aprovada` não vai a `em_analise`).

`test/estatico/arquivamento.test.ts` (SB-11; D-06): em `registrarDecisao` (`funcaoDeclarada` local, como em
`andamento.test.ts`), as chamadas aparecem na ordem `travarDemanda` → `gravarDecisao` → `vigenteDaDemanda` →
`mudarStatusPorArquivamento`; `decisao_arquivada` não aparece mais em `src/` fora de testes; `arquivamento.ts` não
importa `drizzle-orm`, `../../db` nem `../../lib/deps` (só `import type` de `./schemas`); com casos plantados.

- [ ] **Passo 2: ver falhar** — `pnpm test src/modules/demandas/arquivamento.test.ts src/modules/demandas/arquivamento-status.test.ts src/modules/pacotes-decisao/arquivar-com-vigente.test.ts test/estatico/arquivamento.test.ts`
  → FAIL (módulo inexistente; CA-03.1 termina em `encerrada`).

- [ ] **Passo 3: o código**

```ts
// src/modules/demandas/arquivamento.ts — 0.4.1 (S-04, decisão S1 de Fabiano e 7.1; ADR-38): para onde vai a demanda
// quando o DEC mais novo é arquivado, pelo estado do aprovado vigente. A única tabela da regra: o servidor
// (mudarStatusPorArquivamento, sob a trava) e a T11 (dica do Arquivar) leem esta mesma função. Pura: sem banco.
import type { Status } from './schemas';

export const ESTADOS_DO_VIGENTE = ['nenhum', 'atualizado', 'desatualizado'] as const;
export type EstadoDoVigente = (typeof ESTADOS_DO_VIGENTE)[number];

export function estadoDoVigente(v: { desatualizado: boolean } | null): EstadoDoVigente {
  if (v === null) return 'nenhum';
  return v.desatualizado ? 'desatualizado' : 'atualizado';
}

// Sem vigente, encerrada (como até a 0.4.0); com o vigente atualizado, aprovada (S1); desatualizado, em_analise (7.1).
function destinoNasOrigens(estado: EstadoDoVigente): Status {
  switch (estado) {
    case 'nenhum':
      return 'encerrada';
    case 'atualizado':
      return 'aprovada';
    case 'desatualizado':
      return 'em_analise';
    default: {
      const nunca: never = estado;
      throw new Error(`arquivamento: estado desconhecido ${String(nunca)}`);
    }
  }
}

// null: o status não muda (nem evento).
export function destinoDoArquivamento(status: Status, estado: EstadoDoVigente): Status | null {
  switch (status) {
    case 'nova':
    case 'aguardando_informacao':
    case 'pronta_para_decisao':
      return destinoNasOrigens(estado);
    case 'em_analise': {
      // Com o vigente desatualizado, o destino seria o próprio em_analise: nada muda.
      const destino = destinoNasOrigens(estado);
      return destino === 'em_analise' ? null : destino;
    }
    case 'aprovada':
    case 'em_construcao':
    case 'devolvida':
    case 'entregue':
    case 'encerrada':
      return null;
    default: {
      const nunca: never = status;
      throw new Error(`arquivamento: status desconhecido ${String(nunca)}`);
    }
  }
}
```

Em `substituido.ts`, depois de `aprovadoMaisNovo` (importando `expressaoDesatualizado` de `./desatualizado`):

```ts
// 0.4.1 (S-04, ADR-38, ADR-40): o aprovado vigente com o nível e o `desatualizado` dele, ou null. A mesma leitura de
// aprovadoVigente. No arquivamento, lido sob a trava da demanda e depois de gravarDecisao (decidir.ts); na T11, só
// depois de autorizar e de achar o pacote.
export type VigenteDaDemanda = { id: string; nivel: NivelAprovacao; desatualizado: boolean };

export async function vigenteDaDemanda(db: Db, demandaId: string): Promise<VigenteDaDemanda | null> {
  const [linha] = await db
    .select({ id: pacoteDecisao.id, nivel: pacoteDecisao.nivelAprovacaoRequerido, desatualizado: sql<boolean>`${expressaoDesatualizado()}` })
    .from(pacoteDecisao)
    .innerJoin(decisao, eq(decisao.pacoteDecisaoId, pacoteDecisao.id))
    .where(and(eq(pacoteDecisao.demandaId, demandaId), eq(decisao.statusDecisao, 'aprovada')))
    .orderBy(desc(pacoteDecisao.versao))
    .limit(1);
  return linha ?? null;
}
```

Em `transicoes.ts`: `decisao_arquivada` sai do tipo `TransicaoAutomatica` e de `AUTOMATICAS`; o comentário do topo
troca "decisão devolvida ou arquivada" por "decisão devolvida; o arquivamento tem função própria"; e, depois de
`mudarStatusPeloSistema`:

```ts
// 0.4.1 (S-04, ADR-38): o arquivamento do DEC mais novo. O destino é o da tabela de arquivamento.ts, pelo status da
// linha travada e pelo estado do vigente que quem chama leu sob a mesma trava (decidir.ts). Ator sistema; destino nulo
// ou igual ao atual não grava nada.
export async function mudarStatusPorArquivamento(
  t: Transacao,
  deps: Pick<Deps, 'relogio'>,
  demandaId: string,
  estado: EstadoDoVigente,
): Promise<Status | null> {
  const atual = await travarDemanda(t.tx, demandaId);
  const para = destinoDoArquivamento(atual.status, estado);
  if (para === null || para === atual.status) return null;
  await t.tx.update(demanda).set({ status: para, atualizadaEm: deps.relogio.agora() }).where(eq(demanda.id, demandaId));
  await registrarEvento(
    t.tx,
    { ator: { tipo: 'sistema' }, demandaId, entidade: 'demanda', entidadeId: demandaId, acao: 'status_alterado', ...mudancaDeCampo('status', atual.status, para) },
    deps.relogio,
  );
  return para;
}
```

Em `decidir.ts`, no fim de `corpo` (o item 7 do comentário do topo passa a "devolvida: a demanda vai a em_analise pelo
ator sistema; arquivada: o destino de arquivamento.ts pelo vigente lido depois da decisão (0.4.1, S-04)"):

```ts
    await gravarDecisao(c, entrada.statusDecisao, null, textoOuNulo(entrada.comentarios));
    if (entrada.statusDecisao === 'devolvida') await mudarStatusPeloSistema(tr, deps, pacote.demandaId, 'decisao_devolvida');
    // 0.4.1 (S-04): lido depois de gravarDecisao, sob a trava: o DEC arquivado não é aprovado e não conta.
    else await mudarStatusPorArquivamento(tr, deps, pacote.demandaId, estadoDoVigente(await vigenteDaDemanda(tx, pacote.demandaId)));
    return entrada.statusDecisao;
```

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano), `pnpm lint`, `pnpm typecheck`. `PISO`: os quatro arquivos
  novos de teste. Na entrega: G4 vazio, os diffs parciais de `transicoes.ts`, `decidir.ts` e `substituido.ts`, e a
  contagem de `expect(` de `servico.test.ts` igual à de `41108ee` (77).

---

## Fase 4 — Fila (B-08-1)

### T07. Uma linha de andamento por demanda da página, por `crossJoinLateral` (SB-13)

**Engenheiro:** `engenheiro-backend` (era `engenheiro-dados-bd`; ver "Revisão do plano em 14/11" abaixo) · **Risco:**
baixo · **Cobre:** RF-07, CA-07.1 a CA-07.3, SB-13, ADR-39, D-08 · **Regra de comando:** G0.

**Arquivos:**
- Modificar: `src/modules/andamento/consultas.ts` (só `andamentosDasDemandas`), `src/modules/andamento/consultas.test.ts`
  (G5), `test/estatico/piso-de-assercoes.test.ts`, `src/app/(painel)/demandas/fila-andamento.test.ts` (só o dublê
  `dbCom`, G5)
- Não muda: `ultimoAndamento`, `subconsultaDoUltimoAndamento`, `COLUNAS`, `test/estatico/andamento.test.ts` (a guarda de
  só leitura e sem `sql` continua valendo, D-08), `src/app/(painel)/demandas/leituras-da-fila.ts`,
  `src/app/(painel)/demandas/fila-andamento-qa.test.ts`

**Revisão do plano em 14/11 (volta da `06-T07-construcao`).** A primeira passagem (`engenheiro-dados-bd`, commit
`27b117d`) fez os passos 1 a 3 e provou que o `crossJoinLateral` existe no Drizzle instalado (`pnpm typecheck` limpo;
o caso de bloqueio da D-08 não ocorreu): `consultas.test.ts` 17 de 17, `pnpm lint` e `pnpm typecheck` limpos, G4
vazio. O `pnpm test` ficou com 1 falha: `fila-andamento.test.ts:222` (`expected null not to be null`), porque o dublê
`dbCom` imita a cadeia antiga (`selectDistinctOn … from … where … orderBy`); a leitura lança dentro de
`andamentosDaPagina`, que captura e devolve `null`. Não é defeito da consulta. O arquivo está em `src/app/`, fora da
lista do dados-bd, e a tarefa passa ao `engenheiro-backend`, que não refaz os passos 1 a 3: confere que o código de
`27b117d` está no ramo e faz o passo 3b. Aceito o desvio 1 daquela entrega: `sortsSobreAndamento` filtra `Node Type` em
`['Sort', 'Incremental Sort']`, porque no Postgres do teste o `distinct on` vira `Incremental Sort` e o filtro só por
`'Sort'` passava com o código antigo (endurece, não afrouxa).

- [x] **Passo 1: escrever os testes que falham** (feito em `27b117d`)

No `describe('planos (RNF-01)')` de `consultas.test.ts`, o teste da página ganha a asserção do CA-07.2, sem perder as
duas de hoje:

```ts
// CA-07.2 (0.4.1, B-08-1): nenhum nó Sort (nem Incremental Sort) tem andamento_construcao abaixo dele.
const ORDENACOES = ['Sort', 'Incremental Sort'];
const sortsSobreAndamento = (nos: NoDoPlano[]) => nos.filter((n) => ORDENACOES.includes(n['Node Type']) && nosDe(n).some((f) => f['Relation Name'] === 'andamento_construcao'));

  it('a página usa andamento_construcao_demanda_id_idx, sem varrer a tabela e sem Sort sobre ela', async () => {
    const { nos, texto } = await planoDe((db) => andamentosDasDemandas(db, [a.dem, 'DEM-20261112-0003']));
    expect(texto).toContain('andamento_construcao_demanda_id_idx');
    expect(leAndamentoPor(nos).map((n) => n['Node Type'])).not.toContain('Seq Scan');
    expect(sortsSobreAndamento(nos)).toEqual([]);
  });
```

e, no fim do arquivo, com demandas próprias (4001 e 4002), fora das faixas de hoje:

```ts
// CA-07.3 e SB-13 (0.4.1): com 50 linhas por demanda, a página lê no máximo uma linha de andamento por demanda; as
// chaves são as sete de LinhaDeAndamento; id malicioso dá mapa vazio, sem erro de sintaxe.
describe('B-08-1: uma linha por demanda (CA-07.3, SB-13)', () => {
  let x: { dem: string; dec: string };
  let y: { dem: string; dec: string };
  beforeAll(async () => {
    x = await demandaComDec(4001);
    y = await demandaComDec(4002);
    for (const d of [x, y])
      await m(
        `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em)
         select $1, $2, 'construindo', s % 10, 10, 'em_construcao', 'ficticio', $3 from generate_series(1, 50) s`,
        [d.dem, d.dec, QUANDO],
      );
  });
  it('explain analyze: no máximo 2 linhas lidas de andamento_construcao para 2 demandas', async () => {
    const [c] = await consultasGeradas((db) => andamentosDasDemandas(db, [x.dem, y.dem]));
    const r = await m(`explain (analyze, format json) ${c!.sql}`, c!.params);
    type NoAnalisado = NoDoPlano & { 'Actual Rows': number; 'Actual Loops': number };
    const nos = nosDe((r.rows[0]!['QUERY PLAN'] as Array<{ Plan: NoDoPlano }>)[0]!.Plan) as NoAnalisado[];
    const lidas = nos.filter((n) => n['Relation Name'] === 'andamento_construcao').reduce((s, n) => s + n['Actual Rows'] * n['Actual Loops'], 0);
    expect(lidas).toBeLessThanOrEqual(2);
  });
  it('o resultado é a linha de maior id de cada uma, com as sete chaves de LinhaDeAndamento', async () => {
    const mapa = await andamentosDasDemandas(b.db, [x.dem, y.dem]);
    for (const d of [x, y]) {
      expect(Object.keys(mapa.get(d.dem)!).sort()).toEqual(['decId', 'demandaId', 'fase', 'gravadoEm', 'statusConstrucao', 'tarefasProntas', 'tarefasTotal']);
      expect(mapa.get(d.dem)).toMatchObject({ tarefasProntas: 0 }); // s = 50 → 50 % 10
    }
  });
  it('id com aspas e com comando SQL na lista: mapa vazio, nenhum erro', async () => {
    expect(await andamentosDasDemandas(b.db, ["DEM-20261112-4001' or '1'='1", "'); drop table demanda; --"])).toEqual(new Map());
  });
});
```

Os testes de resultado de hoje (empate de `gravado_em`, demanda sem andamento, ids repetidos uma vez só nos parâmetros,
lista vazia sem consulta, uma consulta por chamada) passam sem mudar (CA-07.1).

- [x] **Passo 2: ver falhar** — `pnpm test src/modules/andamento/consultas.test.ts` → FAIL (o `distinct on` tem
  `Incremental Sort` sobre `andamento_construcao` e lê as 50 linhas de cada demanda). Visto em `27b117d`: 2 falharam,
  15 passaram.

- [x] **Passo 3: o código** (feito em `27b117d`)

```ts
// Uma consulta por página da fila (ADR-16): o último de cada demanda pedida; a que não tem andamento fica fora do mapa.
// Lista vazia não consulta. 0.4.1 (B-08-1, ADR-39): a partir de `demanda`, uma junção lateral pega a linha de maior id
// de cada uma pelo índice (demanda_id, id): um Limit sobre Index Scan Backward por demanda, no máximo uma linha lida e
// nenhum Sort. A projeção é COLUNAS, chave a chave (SB-13).
export async function andamentosDasDemandas(db: Db, ids: readonly string[]): Promise<Map<string, LinhaDeAndamento>> {
  const mapa = new Map<string, LinhaDeAndamento>();
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return mapa;
  const u = db.select(COLUNAS).from(a).where(eq(a.demandaId, demanda.id)).orderBy(desc(a.id)).limit(1).as('ultimo');
  const linhas = await db
    .select({
      demandaId: u.demandaId,
      decId: u.decId,
      fase: u.fase,
      tarefasProntas: u.tarefasProntas,
      tarefasTotal: u.tarefasTotal,
      statusConstrucao: u.statusConstrucao,
      gravadoEm: u.gravadoEm,
    })
    .from(demanda)
    .crossJoinLateral(u)
    .where(inArray(demanda.id, unicos));
  for (const l of linhas) mapa.set(l.demandaId, l);
  return mapa;
}
```

(importando `demanda` de `../../db/schema`.) Se o `pnpm typecheck` mostrar que `crossJoinLateral` não existe no Drizzle
0.45.3 instalado, pare e devolva ao `05-plano` (D-08), sem trocar a guarda estática nem usar o template `sql`.

- [ ] **Passo 3b: o dublê da fila (`engenheiro-backend`; mudança só de forma, G5)**

Primeiro, ver falhar no ramo como está: `pnpm test "src/app/(painel)/demandas/fila-andamento.test.ts"` → FAIL em
`fila-andamento.test.ts:222` (`expected null not to be null`), no teste "com linhas: só as que passam em lerAndamento
entram no mapa…". Depois, trocar só o dublê `dbCom` e o comentário acima dele (linhas 193 a 198):

```ts
  // Banco falso que devolve as linhas dadas à consulta da página: a 1ª chamada de select monta a subconsulta lateral
  // (select … from … where … orderBy … limit … as), a 2ª é a página (select … from(demanda) … crossJoinLateral … where).
  const dbCom = (linhas: unknown[]) => {
    const sub = { from: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ as: () => ({}) }) }) }) }) };
    const pagina = { from: () => ({ crossJoinLateral: () => ({ where: async () => linhas }) }) };
    let chamadas = 0;
    return { select: () => (chamadas++ === 0 ? sub : pagina) } as unknown as Db;
  };
```

Não mudam: `dbQueFalha` (o `select` dele lança na primeira chamada, que agora é a da subconsulta: o teste "banco que
falha" continua provando o `null` e o log sem SQL nem ids), as asserções das linhas 200 a 232, os outros `describe` e
`fila-andamento-qa.test.ts`. Nenhuma linha de `src/modules/andamento/consultas.ts` muda para caber no dublê. Se o
dublê acima não bastar (ex.: o Drizzle ler outra propriedade da subconsulta), ajuste só o dublê, pela cadeia que
`andamentosDasDemandas` chama, e diga na entrega o que mudou. Ver passar: o mesmo comando, todos os testes do arquivo.
Na entrega: a contagem `git -C <repo> grep -c "expect(" -- "src/app/(painel)/demandas/fila-andamento.test.ts"` igual
à de `git -C <repo> grep -c "expect(" 41108ee -- "src/app/(painel)/demandas/fila-andamento.test.ts"`.

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano; `test/estatico/andamento.test.ts` sem mudança, e os testes
  da fila só com o dublê do passo 3b), `pnpm lint`, `pnpm typecheck`. `PISO`: `src/modules/andamento/consultas.test.ts`
  com a contagem do fim da tarefa (38 em `27b117d`; passa a provar SB-13). Na entrega: o plano em texto da página (o
  `process.stdout.write` de `planoDe`, rodando `pnpm test src/modules/andamento/consultas.test.ts`), G4 vazio e o
  `git diff --stat` desta passagem só com `src/app/(painel)/demandas/fila-andamento.test.ts`.

---

## Fase 5 — Teste instável e piso

### T08. C-27: estabilizar `src/lib/deps-qa.test.ts` sem asserção a menos (SB-14)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (prova do C-27 do 0001: o app nunca conecta como migrator) ·
**Cobre:** RF-04, RNF-06, CA-04.1 a CA-04.3, SB-14, D-16 · **Regra de comando:** G0.

**Arquivos:**
- Criar: `test/sessoes-do-banco.ts`; `test/sessoes-do-banco.test.ts`
- Modificar: `src/lib/deps-qa.test.ts`; `test/banco.ts` só se a causa estiver lá; `test/estatico/piso-de-assercoes.test.ts`
- Não muda: `src/lib/deps.ts` (se a causa estiver lá, o diff não lê `DATABASE_URL_MIGRATOR` nem o passa a cliente
  algum, e `test/estatico/variaveis.test.ts` passa sem mudança), `vitest.config.ts` (nada de `retry`)

**Correções proibidas (SB-14):** filtrar por `usename`; trocar `toEqual` por `toContain`; tirar o `distinct`; `retry`
no caso, no arquivo ou no `vitest.config.ts`; `it.skip`, `it.fails`, `it.todo` ou condição que pule o caso. As três
asserções do caso ficam (CA-04.2).

- [ ] **Passo 1: ver o teste falhar, com o diagnóstico (antes de qualquer correção; SB-14)**

Crie `test/sessoes-do-banco.ts` só com a leitura e o texto de diagnóstico, e use o diagnóstico **como mensagem** da
asserção de hoje, sem mudar a consulta nem o matcher:

```ts
// test/sessoes-do-banco.ts — C-27 (0.4.1, SB-14): as sessões do banco do teste, para o diagnóstico e para a verificação
// de que o app só conecta como orquestrador_app. O diagnóstico mostra só backend_type, usename e state: nada de query,
// client_addr, application_name nem URL.
import type pg from 'pg';

export type SessaoDoBanco = { backendType: string | null; usename: string | null; state: string | null };

export async function sessoesDoBanco(pool: pg.Pool): Promise<SessaoDoBanco[]> {
  const { rows } = await pool.query<SessaoDoBanco>(
    'select backend_type as "backendType", usename, state from pg_stat_activity where datname = current_database() order by 1, 2, 3',
  );
  return rows;
}

export const diagnosticoDasSessoes = (s: readonly SessaoDoBanco[]): string =>
  `sessões: ${s.map((x) => `${x.backendType ?? '-'}/${x.usename ?? '-'}/${x.state ?? '-'}`).join(', ')}`;
```

```ts
      const diagnostico = diagnosticoDasSessoes(await sessoesDoBanco(d.pool));
      expect(rows.map((r) => r.usename), diagnostico).toEqual(['orquestrador_app']);
```

Rodar `pnpm test src/lib src/db` dez vezes, uma por comando, e `pnpm test` uma vez em segundo plano, lendo a saída com
Read. Escreva na entrega, na seção **Causa**, **antes** de corrigir: quantas execuções falharam, o
diagnóstico de cada falha (o texto acima) e a causa que ele mostra. Hipóteses (02, 3.6), da mais provável para a menos:
(a) processo de fundo do Postgres no banco recém-copiado (`autovacuum worker`), com `usename` nulo; (b) sessão de
cliente ainda em autenticação (`usename` nulo) enquanto o pool ou a fila abrem conexão; (c) sessão saindo. Diga também
se a causa explica a instabilidade conhecida de `scripts/scripts.test.ts` (T33), `test/desempenho/leitura.test.ts`,
`src/app/api/saude/route.test.ts`, `resumo-da-fila` e `minimizar` (só registrar; corrigi-los está fora do pedido).

**Se o diagnóstico mostrar uma sessão `client backend` com outro papel** (por exemplo o do migrator), não é
instabilidade: é o C-27 falhando de verdade. Pare, não corrija o teste, e devolva ao `05-plano` com o diagnóstico (sem
URL nem senha).

Se nenhuma das 11 execuções falhar, a seção **Causa** diz "não reproduzida", com as hipóteses (a) e (b) como causa
provável, e o passo 3 aplica as duas correções aceitas, que não enfraquecem o caso; a `10-documentacao` registra a
causa como provável.

- [ ] **Passo 2: escrever os testes que falham pela falta da verificação corrigida**

```ts
// test/sessoes-do-banco.test.ts — SB-14 (a, b): a verificação do C-27 pega o papel do migrator (prova permanente, CA-04.3),
// ignora processo de fundo do Postgres e espera, por tentativas contadas, a sessão de cliente ainda sem papel. O
// diagnóstico não tem URL nem senha. Banco real.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from './banco';
import { criarPool } from '../src/db';
import { diagnosticoDasSessoes, papeisDasSessoesDeCliente, sessoesDoBanco } from './sessoes-do-banco';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

describe('C-27: a verificação das sessões', () => {
  it('CA-04.3: com uma conexão do migrator no mesmo banco, o papel dele aparece e a lista não é só orquestrador_app', async () => {
    const migrator = criarPool(b.urlMigrator, { max: 1 });
    try {
      await migrator.query('select 1');
      await b.poolApp.query('select 1');
      const papeis = await papeisDasSessoesDeCliente(b.poolApp);
      expect(papeis).not.toEqual(['orquestrador_app']);
      expect(papeis).toContain(new URL(b.urlMigrator).username);
    } finally {
      await migrator.end();
    }
  });
  it('só o app conectado: a lista é exatamente orquestrador_app', async () => {
    await b.poolApp.query('select 1');
    expect(await papeisDasSessoesDeCliente(b.poolApp)).toEqual(['orquestrador_app']);
  });
  it('o diagnóstico não contém as URLs nem as senhas', async () => {
    const texto = diagnosticoDasSessoes(await sessoesDoBanco(b.poolApp));
    for (const url of [b.urlApp, b.urlMigrator]) {
      expect(texto).not.toContain(url);
      expect(texto).not.toContain(decodeURIComponent(new URL(url).password));
    }
  });
});
```

e, em `src/lib/deps-qa.test.ts`, o caso do C-27 passa a chamar `papeisDasSessoesDeCliente(d.pool)` (a consulta
corrigida, com o mesmo `distinct` e o mesmo `toEqual(['orquestrador_app'])`, com o diagnóstico como mensagem); as
outras duas asserções do caso ficam iguais.

Rodar: `pnpm test test/sessoes-do-banco.test.ts src/lib/deps-qa.test.ts` → FAIL (`papeisDasSessoesDeCliente` não
existe).

- [ ] **Passo 3: a correção, pela causa achada**

Em `test/sessoes-do-banco.ts`, a consulta do C-27, com o `distinct` e só sessões de cliente (causa a), e a espera por
tentativas contadas pela sessão de cliente ainda sem papel (causa b). Aplique a parte que a causa pede; com a causa não
reproduzida, as duas:

```ts
// Causa (a): processo de fundo do Postgres não é conexão do app; só `client backend` conta. Causa (b): a sessão de
// cliente que ainda autentica não tem papel: espera por tentativas contadas, sem relógio do teste. Esgotadas, o null
// fica na lista e o toEqual falha (falha fechada). Nunca filtra por usename.
export async function papeisDasSessoesDeCliente(pool: pg.Pool, tentativas = 50): Promise<Array<string | null>> {
  const ler = async () =>
    (await pool.query<{ usename: string | null }>(
      "select distinct usename from pg_stat_activity where datname = current_database() and backend_type = 'client backend' order by 1",
    )).rows.map((r) => r.usename);
  let papeis = await ler();
  for (let i = 1; i < tentativas && papeis.includes(null); i++) {
    await pool.query('select pg_sleep(0.05)');
    papeis = await ler();
  }
  return papeis;
}
```

- [ ] **Passo 4: ver passar e provar** — `pnpm test src/lib/deps-qa.test.ts test/sessoes-do-banco.test.ts`; depois
  `pnpm test src/lib src/db` **vinte vezes seguidas**, uma por comando, cada uma declarada em `## Comandos executados`
  com o resultado do arquivo (`deps-qa.test.ts` passou, CA-04.1); `pnpm test` (segundo plano), `pnpm lint`,
  `pnpm typecheck`. `PISO`: `src/lib/deps-qa.test.ts` com a contagem do fim da tarefa (8 em `41108ee`; não pode
  diminuir) e `test/sessoes-do-banco.test.ts`. Na entrega: o diff de `deps-qa.test.ts` com a contagem de `expect(`
  antes e depois (CA-04.2) e o texto da causa e da correção para o CHANGELOG (CA-04.4, copiado pela `10-documentacao`).

### T09. Piso de asserções: `registrar-qa.test.ts` e os testes de segurança da 0.3.x e da 0.4.0 (B-08-2, SB-15)

**Engenheiro:** `engenheiro-backend` · **Risco:** baixo · **Cobre:** RF-08, CA-08.1 a CA-08.3, SB-15, D-18 ·
**Regra de comando:** G0.

**Arquivos:**
- Modificar: `test/estatico/piso-de-assercoes.test.ts` (só acréscimos)
- Criar: `test/estatico/piso-de-assercoes-0018.test.ts`

- [ ] **Passo 1: escrever o teste que falha**

```ts
// test/estatico/piso-de-assercoes-0018.test.ts — CA-08.3 e SB-15 (0.4.1): o PISO só sobe. Cada entrada de 41108ee
// continua lá, com valor maior ou igual; e as entradas do B-08-2 estão no PISO. O PISO_41108EE é a cópia do PISO de
// 41108ee (git show 41108ee:test/estatico/piso-de-assercoes.test.ts), escrita à mão uma vez.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const PISO_41108EE: Readonly<Record<string, number>> = {
  /* as 84 entradas de 41108ee, copiadas */
};
const DO_B_08_2: readonly string[] = [
  'src/modules/andamento/registrar-qa.test.ts',
  /* … os arquivos da tabela abaixo marcados "entra" … */
];

// As entradas do PISO lidas do fonte (o arquivo não exporta o objeto): 'caminho': número.
const pisoAtual = (): Record<string, number> =>
  Object.fromEntries(
    [...readFileSync(`${raiz}test/estatico/piso-de-assercoes.test.ts`, 'utf8').matchAll(/^\s+'([^']+)': (\d+),$/gm)].map((m) => [m[1]!, Number(m[2])]),
  );

describe('SB-15: o piso só sobe', () => {
  it('nenhuma entrada de 41108ee saiu nem diminuiu', () => {
    const atual = pisoAtual();
    for (const [arquivo, valor] of Object.entries(PISO_41108EE)) expect(atual[arquivo], arquivo).toBeGreaterThanOrEqual(valor);
  });
  it('as entradas do B-08-2 estão no PISO', () => {
    const atual = pisoAtual();
    for (const arquivo of DO_B_08_2) expect(atual[arquivo], arquivo).toBeGreaterThan(0);
  });
});
```

- [ ] **Passo 2: ver falhar** — `pnpm test test/estatico/piso-de-assercoes-0018.test.ts` → FAIL (`registrar-qa.test.ts`
  fora do piso).

- [ ] **Passo 3: as entradas**

Acrescente ao `PISO`, com o comentário "T09 do DEC-DEM-20261111-0018-v1 (B-08-2, SB-15): contado no fim da tarefa;
conferido pela 06-T09-testes.", cada arquivo marcado "entra", com o número de linhas `expect(` dele **recontado** no
fim da tarefa (os números abaixo são os de `41108ee`, por `git grep -c "expect("`):

| Arquivo | `expect(` em 41108ee | Proposta | Razão |
|---|---|---|---|
| `src/modules/andamento/registrar-qa.test.ts` | 69 | entra (CA-08.1) | AN-01 a AN-08 do registro |
| `src/modules/acesso/matriz-integracoes.test.ts` e `-qa` | 8 e 45 | entram | controle de acesso por integração |
| `src/modules/acesso/ramos-por-ator.test.ts` e `-qa` | 30 e 59 | entram | ramo por tipo de ator (IN-02) |
| `src/modules/acesso/tokens-integracao.test.ts`, `-qa` e `-corrompido` | 25, 40 e 3 | entram | autenticação do token |
| `test/matriz-rotas-integracoes-qa.test.ts` | 14 | entra | matriz × rotas pelos tokens |
| `src/app/api/pedidos-construcao/entrega.test.ts` e `entrega-qa` | 81 e 50 | entram | 404 sem oráculo, escopo |
| `src/app/api/pedidos-construcao/recebimento.test.ts` e `recebimento-qa` | 71 e 54 | entram | idem |
| `src/app/api/pedidos-construcao/log-das-integracoes.test.ts` | 31 | entra | sentinela de log |
| `src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts` | 19 | entra | saídas sem dado |
| `src/modules/pedido-construcao/recebimento-0019.test.ts` | 35 | entra | escopo do recebimento |
| `src/app/api/demandas/visibilidade-agente-0019.test.ts` | 40 | entra | visibilidade e 404 sem oráculo |
| `src/app/api/demandas/criacao-awave-0019.test.ts` | 12 | entra | visibilidade do Awave |
| `src/app/api/pacotes-decisao/visibilidade-0019.test.ts` | 16 | entra | visibilidade |
| `src/modules/demandas/confirmacao-0019.test.ts` | 21 | entra | visibilidade (confirmação) |
| `src/modules/demandas/autor-desconhecido-0019.test.ts` | 5 | entra | ator desconhecido negado |
| `src/modules/integracoes/prazo-total-0019.test.ts` | 21 | entra | prazo total |
| `src/modules/limites-integracao.test.ts` e `-qa` | 30 e 23 | entram | limite por integração (como `limites.test.ts`, já no piso) |
| `src/db/schema/integracao.test.ts` e `-qa` | 21 e 32 | entram | privilégio e imutabilidade do token |
| `src/modules/historico/consultas-integracao.test.ts` e `-qa` | 9 e 8 | entram | visibilidade do histórico da integração |
| `test/estatico/trace-e2e.test.ts` | 14 | entra | credencial fora do trace |
| `e2e/integracoes.spec.ts` e `-qa` | 13 e 43 | entram | rotas das integrações no build |
| `src/lib/rota-corpo-invalido.test.ts` | 7 | entra | AN-02, corpo sem eco (o `-qa` já está no piso) |
| `src/modules/andamento/schemas.test.ts` | 11 | entra | AN-02, corpo fechado |
| `src/modules/andamento/regras.test.ts` | 18 | entra | AN-04 e AN-12 |
| `src/modules/demandas/transicoes-construir.test.ts` | 19 | entra | AN-04, transições só do construir |
| `e2e/andamento-construir.spec.ts` | 40 | entra | token, 404 e 422 sem eco no build |
| `test/estatico/migration-0008.test.ts` | 6 (recontar depois da T03) | entra | AN-10, custom só com o GRANT |
| `src/app/(painel)/demandas/fila-andamento.test.ts` e `-qa`, `src/components/dados-das-etapas-andamento.test.ts`, `scripts/seed-andamento*.test.ts`, `e2e/andamento-detalhe.spec.ts`, `e2e/andamento-fila.spec.ts` | — | não entram (proposta) | tela e seed, sem controle de acesso, visibilidade, oráculo, sentinela, prazo nem imutabilidade; a `06-T09-testes` confirma ou inclui |

(`src/lib/deps-qa.test.ts` entra na T08; `consultas.test.ts` na T07.)

- [ ] **Passo 4: ver passar** — `pnpm test test/estatico` e `pnpm test` (segundo plano), `pnpm lint`, `pnpm typecheck`.
  `PISO`: `test/estatico/piso-de-assercoes-0018.test.ts`. Na entrega: a tabela acima com os números recontados (CA-08.2:
  cada candidato no piso ou com a linha de razão).

---

## Fase 6 — Seed

### T10. Seed fictício com as demandas da vigência

**Engenheiro:** `engenheiro-backend` · **Risco:** baixo · **Cobre:** dados para RF-03, RF-06 e o e2e da T14; D-15 ·
**Depende de:** T06 · **Regra de comando:** G0.

**Arquivos:**
- Modificar: `scripts/seed-ficticio.ts`; testes do seed da G5
- Criar: `scripts/seed-vigencia.test.ts`

- [ ] **Passo 1: escrever o teste que falha**

`scripts/seed-vigencia.test.ts` (molde de `scripts/seed-andamento.test.ts`: banco novo, `seedFicticio` com
`SEED_FICTICIO=1` e config em loopback), com estes casos:

1. `TITULOS_DO_E2E` tem `vigenciaComPendente`, `vigenciaNivelMenor`, `vigenciaArquivar` e `arquivarSemVigente`, cada
   uma com "(fictício)", e cada uma existe uma vez, de tipo `melhoria`, criada pela conta `configurar2fa` (D-15).
2. **vigenciaComPendente:** v1 `cto` aprovado na opção A pela "cto"; v2 `cto_e_administradora` pendente, sem aprovação;
   demanda em `pronta_para_decisao`; `vigenteDaDemanda` = v1 atualizado.
3. **vigenciaNivelMenor:** v1 `cto_e_administradora` aprovado na opção A (administradora com documento fictício e
   "cto"); v2 `cto` pendente; demanda em `pronta_para_decisao`.
4. **vigenciaArquivar:** v1 `cto` aprovado; v2 `cto` pendente; demanda em `pronta_para_decisao`.
5. **arquivarSemVigente:** ESP e RSK, nenhum DEC; demanda em `nova` (ou no status que a ESP sem dúvida deixa).
6. Todo DEC novo tem `caminhos_com_nome_na_criacao` não nulo; a lista de pendentes do `/construir` não muda; nenhum
   token nasce.

- [ ] **Passo 2: ver falhar** — `pnpm test scripts/seed-vigencia.test.ts` → FAIL.

- [ ] **Passo 3: o seed**

`criarContas` passa a devolver também `administradora` e `configurar2fa` como `AtorPessoa` (papel da conta), sem mudar
o que grava. Os títulos novos entram em `TITULOS_DO_E2E` com o comentário "0.4.1 (DEC-DEM-20261111-0018-v1, T10)"; as
demandas, numa lista `DEMANDAS_DA_VIGENCIA` (melhoria, `sob_medida`, "Pessoa Ficticia Produto", contexto preenchido) que
entra em `TOTAL_DEMANDAS_DO_SEED`; e uma função `criarDadosDaVigencia(t, deps, pessoas)`, chamada no fim de
`criarDadosDasIntegracoes`, pelos mesmos serviços da API na transação do seed: ESP e RSK (`ESP_DO_E2E`, `RSK_DO_E2E`)
e os DEC (`DEC_DO_E2E` com o nível de cada caso) pela `configurar2fa`; as aprovações pela "cto" e, na dupla, pela
"administradora" com `referenciaDocumento: 'DOC-FICTICIO-0018'` e `dataDocumento` do dia do relógio. Comentário com a
razão do D-15.

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano; os testes do seed da G5 com os totais novos), `pnpm lint`,
  `pnpm typecheck`.

---

## Fase 7 — Painel

### T11. Textos revistos da 03: substituído, 409s, histórico e linha 6 por nível (RF-05)

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-05, CA-05.1 (os textos alterados), D-09 ·
**Depende de:** T05, T06, T10 · **Regra de comando:** G0.

**Arquivos:**
- Modificar: `src/components/dados-da-decisao.ts` (`substituido`, `abrirSubstituto`), `src/components/rotulos.ts`
  (`textoDoEvento` de `pacote_decisao_substituido`; comentário de `SELO_SUBSTITUIDO`), `src/components/dados-do-pedido.ts`
  (`ORIENTACAO.aviso`, `ORIENTACAO.avisoDupla`, `orientacaoDoPedido` e `erroDoPedido` com o nível),
  `src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx` e `page.tsx` (a prop `nivelAprovacaoRequerido` da
  `SecaoPedido`), `src/modules/pedido-construcao/conferir.ts` (`MENSAGENS_PEDIDO.substituido`),
  `src/modules/pacotes-decisao/decidir.ts` (`MENSAGENS_DECISAO.nivelMenorQueOVigente`); os testes de texto da G5;
  `e2e/decisao.spec.ts` (demanda do "Arquivar", G5)
- Criar: `src/components/textos-0018.test.ts`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/components/textos-0018.test.ts — CA-05.1 (0.4.1): cada texto alterado é igual ao da 03, seção 8. Sem id de
// pessoa: os ids são de DEC fictício. Teste unitário.
import { describe, expect, it } from 'vitest';
import { MENSAGENS_DECISAO } from '../modules/pacotes-decisao/decidir';
import { MENSAGENS_PEDIDO } from '../modules/pedido-construcao/conferir';
import { TEXTOS_DECISAO } from './dados-da-decisao';
import { orientacaoDoPedido } from './dados-do-pedido';
import { SELO_SUBSTITUIDO, textoDoEvento } from './rotulos';

const V1 = 'DEC-DEM-20991231-0001-v1';
const V2 = 'DEC-DEM-20991231-0001-v2';

describe('textos alterados da 03, seção 8', () => {
  it('substituído: aviso, link e selo', () => {
    expect(TEXTOS_DECISAO.substituido(V2)).toBe(
      `Este pacote foi substituído por ${V2}, aprovado depois dele, e não gera mais o Pedido de Construção. Se um pedido deste pacote já foi gerado, não o use. O pedido que vale é o de ${V2}.`,
    );
    expect(TEXTOS_DECISAO.abrirSubstituto(V2)).toBe(`Abrir o pacote ${V2}`);
    expect(SELO_SUBSTITUIDO.texto).toBe('Substituído');
  });
  it('409 do substituído e 409 do S-01 (este sem id nem nome)', () => {
    expect(MENSAGENS_PEDIDO.substituido(V2)).toBe(`o pacote foi substituído por ${V2}, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção.`);
    expect(MENSAGENS_DECISAO.nivelMenorQueOVigente).toBe(
      'o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora.',
    );
    expect(MENSAGENS_DECISAO.nivelMenorQueOVigente).not.toMatch(/DEC-DEM-/);
  });
  it('linha 6 da orientação, pelo nível do pacote', () => {
    expect(orientacaoDoPedido(['especificacao.conteudo: e-mail']).at(-1)).toBe(
      'Depois de corrigir, crie um pacote novo e aprove-o. Aprovado, ele substitui este e passa a ser o único que gera o Pedido de Construção.',
    );
    expect(orientacaoDoPedido(['especificacao.conteudo: e-mail'], 'cto_e_administradora').at(-1)).toBe(
      'Depois de corrigir, crie um pacote novo com aprovação do CTO e da administradora e registre as duas aprovações. Com as duas, ele substitui este e passa a ser o único que gera o Pedido de Construção.',
    );
  });
  it('frase do histórico, com e sem o substituto no formato de DEC', () => {
    const ev = (depois: unknown) => textoDoEvento({ acao: 'pacote_decisao_substituido', entidadeId: V1, depois } as Parameters<typeof textoDoEvento>[0]);
    expect(ev({ substituido: V1, substituidoPor: V2 })).toBe(`${V1} foi substituído por ${V2}, aprovado depois dele`);
    expect(ev({ substituido: V1, substituidoPor: 'x' })).toBe(`${V1} foi substituído por um pacote aprovado depois dele`);
  });
});
```

(Ajuste o objeto do evento ao tipo que `textoDoEvento` recebe, como em `rotulos.test.ts:259`.)

E a mudança da G5 no teste "Arquivar → …" de `e2e/decisao.spec.ts` (só a demanda e o comentário).

- [ ] **Passo 2: ver falhar** — `pnpm test src/components/textos-0018.test.ts` → FAIL.

- [ ] **Passo 3: as constantes** — os textos da 03, seção 8, por inteiro; `orientacaoDoPedido(erros, nivel:
  NivelAprovacao = 'cto')` devolve `ORIENTACAO.avisoDupla` no lugar de `ORIENTACAO.aviso` quando o nível é
  `cto_e_administradora`; `erroDoPedido(r, nivel = 'cto')` repassa; `SecaoPedido` recebe `nivelAprovacaoRequerido` e a
  passa a `erroDoPedido`. Os comentários "para revisão da ux-ui-design" dessas constantes saem. Os testes de texto da G5
  passam ao texto novo.

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano), `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e` (com os
  e2e de texto da G5 e o "Arquivar" na demanda nova).

### T12. T11: avisos (a), (b), (c), dica e chegada do Arquivar (RF-03, RF-06, SB-12)

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-03 (tela), RF-05 (dica e chegada), RF-06,
CA-03.6, CA-05.1, CA-06.1 a CA-06.4 (Vitest), SB-12, ADR-40, D-10 a D-13 · **Depende de:** T06, T11 · **Regra de
comando:** G0.

**Arquivos:**
- Modificar: `src/components/dados-da-decisao.ts`, `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`,
  `src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx`; testes da G5 (`pagina.test.ts`,
  `dados-da-decisao.test.ts`, `e2e/decisao-botoes.spec.ts:285` se valer); `test/estatico/piso-de-assercoes.test.ts`
- Criar: `src/components/dados-da-decisao-vigencia.test.ts`; `src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts`;
  `test/estatico/vigencia-t11.test.ts`

**Interfaces produzidas:** os textos novos de `TEXTOS_DECISAO`, `ContextoDaVigencia`, `AvisoDeVigencia`,
`avisoDeVigencia`, `dicaDoArquivar` e a assinatura nova de `chegadaNaDecisao` (G7).

- [ ] **Passo 1: escrever os testes que falham**

`src/components/dados-da-decisao-vigencia.test.ts` (unitário; ids fictícios `DEC-DEM-20991231-0001-v1` e `-v2`):

1. **textos exatos (CA-05.1, CA-06.5):** `avisoVigente(V1)`, `avisoMaisNovoPendente(V2)`, `avisoNivelMenor(V1)`,
   `dicaArquivarSemMudanca('Aprovada')`, `dicaArquivarAprovada(V1)`, `dicaArquivarEmAnalise(V1)`,
   `sucesso.arquivadaAprovada(V1)`, `sucesso.arquivadaEm('Em análise')` iguais aos da 03, seção 8 (e 4.6, 4.7);
   `dicaArquivar` e `sucesso.arquivada` sem mudança.
2. **CA-06.1:** v2 `cto_e_administradora` pendente e mais novo, vigente v1 `cto` → aviso (a) com o texto de `V1` e o
   link `{ rotulo: 'Abrir o pacote V1', href: '/pacotes-decisao/V1' }`; com uma aprovação registrada, o mesmo.
3. **CA-06.2:** o v1 aberto, vigente, com `pendenteMaisNovo` v2 `cto_e_administradora` não desatualizado → aviso (b)
   com o link para o v2.
4. **CA-06.3:** v2 `cto` pendente e mais novo, vigente v1 `cto_e_administradora` → aviso (c), link
   `{ rotulo: 'Criar pacote novo', href: '/demandas/DEM-20991231-0001/pacotes-decisao/novo' }`; o (a) não; no v1 com
   `pendenteMaisNovo` v2 `cto` → nenhum aviso (sem o (b)).
5. **CA-06.4 e filtros da 4.2:** sem vigente; DEC já decidido que não é o vigente; DEC pendente desatualizado;
   pendente que não é o mais novo; demanda em `entregue` e em `encerrada`; `pendenteMaisNovo` desatualizado → `null`.
6. **SB-12 (d):** id do vigente ou do pendente fora de `RE_ID_DEC` (`'x'`, `'DEC-DEM-1-v1<script>'`) → `null`; id da
   demanda fora de `RE_ID_DEMANDA` no caso (c) → `null`.
7. **dica (CA-03.6, 4.6):** `dicaDoArquivar('aprovada', 'pronta_para_decisao', V1)` → linha 2; `('em_analise',
   'pronta_para_decisao', V1)` → linha 3; `('encerrada', …, null)` → `dicaArquivar`; `(null, 'aprovada', V1)` →
   "Arquivar: a demanda continua em Aprovada."; `(null, 'em_analise', V1)` → "… continua em Em análise."; status fora
   de `ROTULO_STATUS` (`'__proto__'`) e `'aprovada'` com id fora do formato → lança (D-13).
8. **chegada (4.7):** com `?aviso=decisao-registrada` e o pacote arquivado: status `encerrada` → `sucesso.arquivada`;
   `aprovada` com vigente atualizado → `sucesso.arquivadaAprovada(V1)`; `aprovada` com vigente desatualizado e
   `em_analise` → `sucesso.arquivadaEm(rótulo)`; o texto nunca vem da URL (um `?aviso=` com texto livre → `null`).
9. **SB-12 (a, b):** nenhum texto novo contém "Pessoa", "Ficticia" nem casa um nome de pessoa da lista de sentinelas.

`src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts` (molde de `pagina.test.ts`, com
`vigenteDaDemanda` dublê):

1. **oráculo (G9):** sessão negada, `autorizar` negado e DEC inexistente (404) → `vigenteDaDemanda` e a leitura do mais
   novo **não são chamados**.
2. **ordem dos alertas (03, 4.2):** com lembrete, substituído e (b) ao mesmo tempo onde valem, a ordem no HTML é
   resultado, lembrete, substituído, (b), (a) ou (c), desatualizado, rascunho; o aviso é `<div>` do `Alerta` `atencao`
   sem `role="alert"`, com o `<p>` em `[overflow-wrap:anywhere]` e o link com `CLASSE_LINK_SOLTO`.
3. **SB-12 (c):** o conjunto de botões e o estado `disabled` do formulário são iguais com e sem cada aviso.
4. **D-12:** o mais novo pendente só é lido quando o aberto é o vigente e o mais novo é outro, pendente e não
   desatualizado.
5. **dica e chegada:** a dica do Arquivar na página é a de `dicaDoArquivar` para o destino lido; a chegada sai do status
   da demanda lido, com o mesmo `?aviso=` de hoje.

`test/estatico/vigencia-t11.test.ts` (SB-12): em `page.tsx`, `vigenteDaDemanda(` aparece depois de
`exigirPessoaNaPagina(`, de `autorizar(pessoa, 'ler_pacote_decisao')` e de `notFound()` do pacote; nenhum
`dangerouslySetInnerHTML` em `page.tsx`, `FormularioDecisao.tsx` e `dados-da-decisao.ts`; `dados-da-decisao.ts` não
importa valor de `src/modules/` (D-11); com casos plantados.

- [ ] **Passo 2: ver falhar** — `pnpm test src/components/dados-da-decisao-vigencia.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts" test/estatico/vigencia-t11.test.ts`
  → FAIL.

- [ ] **Passo 3: o código**

Em `dados-da-decisao.ts` (só `import type` de `src/modules/`, D-11; `ROTULO_STATUS` de `./rotulos`, `RE_ID_DEC` de
`./dados-do-pacote`, `RE_ID_DEMANDA_NA_TELA` de `./dados-das-etapas`):

```ts
// 0.4.1 (RF-06, ADR-40; 03, 4.2): os três avisos da vigência. Só informam: não habilitam nem escondem botão; a regra
// que vale é a do servidor. Só aparecem fora de status final; só citam id que casa RE_ID_DEC (SB-12).
export type ContextoDaVigencia = {
  statusDaDemanda: Status;
  maisNovoId: string | null;
  vigente: { id: string; nivel: NivelAprovacao } | null;
  // só quando o aberto é o vigente e o mais novo é outro, pendente (D-12)
  pendenteMaisNovo: { id: string; nivel: NivelAprovacao; desatualizado: boolean } | null;
};
export type AvisoDeVigencia = { texto: string; link: { rotulo: string; href: string } };

const FINAL: ReadonlySet<Status> = new Set(['entregue', 'encerrada']);
const soCtoSobreDupla = (novo: NivelAprovacao, vigente: NivelAprovacao) => novo === 'cto' && vigente === 'cto_e_administradora';

export function avisoDeVigencia(
  p: Pick<PacoteDecisaoVista, 'id' | 'demandaId' | 'statusDecisao' | 'desatualizado' | 'nivelAprovacaoRequerido'>,
  c: ContextoDaVigencia,
): AvisoDeVigencia | null {
  const t = TEXTOS_DECISAO;
  if (FINAL.has(c.statusDaDemanda)) return null;
  const v = c.vigente;
  // (a) e (c): o aberto é o pendente mais novo, não desatualizado, e há outro DEC em vigor.
  if (p.statusDecisao === 'pendente' && p.id === c.maisNovoId && !p.desatualizado && v && v.id !== p.id && RE_ID_DEC.test(v.id)) {
    if (soCtoSobreDupla(p.nivelAprovacaoRequerido, v.nivel)) {
      if (!RE_ID_DEMANDA_NA_TELA.test(p.demandaId)) return null;
      return { texto: t.avisoNivelMenor(v.id), link: { rotulo: t.criarPacoteNovo, href: `/demandas/${p.demandaId}/pacotes-decisao/novo` } };
    }
    return { texto: t.avisoVigente(v.id), link: { rotulo: t.abrirSubstituto(v.id), href: `/pacotes-decisao/${v.id}` } };
  }
  // (b): o aberto é o vigente, e o mais novo é outro, pendente, não desatualizado e capaz de substituí-lo.
  const n = c.pendenteMaisNovo;
  if (v?.id === p.id && n && n.id !== p.id && !n.desatualizado && !soCtoSobreDupla(n.nivel, p.nivelAprovacaoRequerido) && RE_ID_DEC.test(n.id))
    return { texto: t.avisoMaisNovoPendente(n.id), link: { rotulo: t.abrirSubstituto(n.id), href: `/pacotes-decisao/${n.id}` } };
  return null;
}
```

mais `dicaDoArquivar(destino, statusAtual, vigenteId)` (4.6) e o terceiro argumento de `chegadaNaDecisao` (4.7), pelas
regras do Passo 1, com o rótulo de status por `Object.hasOwn(ROTULO_STATUS, s)`.

Em `page.tsx`, depois de `recebidoEm` (G9; D-12):

```ts
  // 0.4.1 (RF-06, ADR-40): só depois de autorizar e de achar o pacote (SB-12, oráculo).
  const db = (await obterDeps()).db;
  const vigente = await vigenteDaDemanda(db, p.demandaId);
  const maisNovo = d.pacotesDecisao[0] ?? null;
  const pendente =
    vigente?.id === p.id && maisNovo && maisNovo.id !== p.id && maisNovo.statusDecisao === 'pendente' && !maisNovo.desatualizado
      ? await lerPacoteDaPagina(maisNovo.id)
      : null;
  const aviso = avisoDeVigencia(p, {
    statusDaDemanda: d.status,
    maisNovoId: maisNovo?.id ?? null,
    vigente,
    pendenteMaisNovo: pendente && { id: pendente.id, nivel: pendente.nivelAprovacaoRequerido, desatualizado: pendente.desatualizado },
  });
  const dicaArquivar = dicaDoArquivar(destinoDoArquivamento(d.status, estadoDoVigente(vigente)), d.status, vigente?.id ?? null);
```

`chegadaNaDecisao(await searchParams, p, { statusDaDemanda: d.status, vigente })`; o aviso entra entre o alerta do
substituído e o do desatualizado, no molde do aviso do substituído; o `FormularioDecisao` recebe `dicaArquivar` e o
mostra no `<p id={ID_CONSEQUENCIA.arquivada}>` no lugar de `t.dicaArquivar` (D-10). A leitura de `recebidoEm` passa a
usar o mesmo `db`.

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano), `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e`. `PISO`: os
  três arquivos novos. Na entrega: G4 vazio.

### T13. T05: barra de etapas e Próxima ação com o DEC mais novo arquivado (7.2, itens 3 e 4)

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-03 (T05), D-14 · **Depende de:** T06, T12 ·
**Regra de comando:** G0.

**Arquivos:**
- Modificar: `src/components/dados-das-etapas.ts`, `src/app/(painel)/demandas/[id]/page.tsx`; testes da G5;
  `test/estatico/piso-de-assercoes.test.ts`
- Criar: `src/components/dados-das-etapas-arquivamento.test.ts`; `src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts`

- [ ] **Passo 1: escrever os testes que falham**

`src/components/dados-das-etapas-arquivamento.test.ts` (unitário; molde de `dados-das-etapas-andamento.test.ts`):

1. **7.2, item 3:** demanda em `aprovada`, `pacotesDecisao` = [v2 arquivado, v1 aprovado não substituído],
   `decMaisNovo` = v2, `decVigente` = v1 com decisão opção A → a etapa 4 é `{ numero: 4, idVersao: v1, estado:
   'Aprovada, opção A', feita: true }`, a atual é a 5 e a Próxima ação é a linha 10 com o link para o v1.
2. sem `decVigente` (ausente ou `null`) e o v2 arquivado → a etapa 4 de hoje ("Arquivada", não feita).
3. `decVigente` com id diferente de `vigenteDe(d)` → lança (dado incoerente, molde de `conferir`).
4. **7.2, item 4:** v2 arquivado, v1 vigente desatualizado e a demanda em `em_analise` (e em `nova`) → linha 6
   ("Montar o pacote de decisão.", com o link de hoje); em `aprovada` → linha 10 (sem mudança); em `encerrada` → linha 1.
5. as linhas de hoje sem DEC arquivado não mudam (os testes de `dados-das-etapas*.test.ts` passam).

`src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts` (molde de `detalhe.test.ts`, com `obterPacoteDecisao` dublê):
a página lê o DEC vigente **só** com o mais novo arquivado e um vigente na demanda, **depois** de
`autorizar(pessoa, 'ler_pacote_decisao')`; com a demanda inexistente (404) ou a autorização negada, não lê (G9); o HTML
da barra mostra o v1 na etapa 4.

- [ ] **Passo 2: ver falhar** — `pnpm test src/components/dados-das-etapas-arquivamento.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts"`
  → FAIL.

- [ ] **Passo 3: o código** — em `dados-das-etapas.ts`: `decVigente?: Pick<PacoteDecisaoVista, 'id' | 'decisao' |
  'aprovadores'> | null` em `DadosDasEtapas` (só tipo; a guarda de `test/estatico/dados-das-etapas.test.ts` continua
  passando); `vigenteDe` exportada; `conferir` confere o id do `decVigente` contra `vigenteDe(d)`; `opcaoAprovada`
  aceita `Pick<…, 'decisao' | 'aprovadores'>`; a etapa 4 com o v2 arquivado e o `decVigente` presente mostra o vigente;
  a condição da linha 6 ganha `|| (dec.statusDecisao === 'arquivada' && (d.status === 'nova' || d.status ===
  'em_analise'))`. Em `page.tsx`, depois do `Promise.all`:

```ts
  // 0.4.1 (7.2, item 3; D-14): com o DEC mais novo arquivado, o vigente, para a etapa 4. Já autorizado acima
  // (ler_pacote_decisao); o id vem só da vista da demanda.
  const vigenteResumo = vigenteDe(d);
  const decVigente = decMaisNovo?.statusDecisao === 'arquivada' && vigenteResumo ? await obterPacoteDecisao(deps.db, vigenteResumo.id) : null;
```

  e `decVigente` entra em `dadosDasEtapas`.

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano), `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e`. `PISO`:
  `src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts` (visibilidade da leitura nova).

### T14. e2e da vigência na T11 e na T05, e versão 0.4.1

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** CA-06.5, RNF-10, RNF-11 (e2e três vezes), CA-03.1
pelo navegador, RF-10 (versão) · **Depende de:** T10, T12, T13 · **Regra de comando:** G0.

**Arquivos:**
- Criar: `e2e/vigencia.spec.ts`
- Modificar: `package.json` (`"version": "0.4.1"`), `test/estatico/projeto.test.ts` (G5)

- [ ] **Passo 1: os testes que falham**

`test/estatico/projeto.test.ts` espera `0.4.1`. `e2e/vigencia.spec.ts`, com `entrarComo(page, 'cto')`,
`demandaDoSeed`, `api` e `semViolacoesNasDuasLarguras` de `e2e/apoio.ts`; nenhum teste cria demanda nem versão (G3.12):

1. **CA-06.1 e CA-03.6:** a T11 do v2 da `vigenciaComPendente` mostra o texto exato do aviso (a) com o id do v1 e o
   link "Abrir o pacote <v1>" para `/pacotes-decisao/<v1>`; o texto do (c) não aparece; a descrição acessível do botão
   Arquivar é "Arquivar: a demanda vai para Aprovada, e <v1> continua em vigor."; axe nas duas larguras.
2. **CA-06.2:** a T11 do v1 da mesma demanda mostra o (b) com o id e o link do v2; axe nas duas larguras.
3. **CA-06.3:** a T11 do v2 da `vigenciaNivelMenor` mostra o (c) e o link "Criar pacote novo"; o (a) não; a T11 do v1
   não mostra o (b); axe nas duas larguras.
4. **CA-03.1 pelo navegador:** na `vigenciaArquivar`, se o v2 está pendente, arquivar o v2 → o alerta "Pacote arquivado.
   A demanda está em Aprovada, e <v1> continua em vigor."; o status lido pela API é `aprovada`; axe. Se o v2 já está
   arquivado (segunda execução sobre o mesmo banco), o teste confere só o estado final, sem pular. Nos dois casos, a T05
   da demanda mostra a etapa 4 com o v1 e "Aprovada, opção A", e a Próxima ação "Gerar o Pedido de Construção e, quando
   a construção começar, mudar o status para Em construção."; axe.
5. cada aviso: só o link entra no Tab (o `<p>` não é focável), e o nome acessível do link tem o id inteiro.

- [ ] **Passo 2: ver falhar** — `pnpm test test/estatico/projeto.test.ts` e `pnpm test:e2e` → FAIL.

- [ ] **Passo 3:** `package.json` em `0.4.1`; o código do e2e.

- [ ] **Passo 4: ver passar** — `pnpm test` (segundo plano), `pnpm lint`, `pnpm typecheck`; `pnpm test:e2e` verde **três
  vezes seguidas**, com o tempo do teste mais lento de cada arquivo novo na entrega (nenhum acima de 24 s).

---

## Verificação na homologação (para a `09-entrega`; o `devops-sre` monta, Fabiano não precisa agir)

**Ensaio de rollback:** `alteram_dado = false` (a `0010` só acrescenta a coluna) e `volta_sem_restaurar = false`
**esperado** (a saúde da 0.4.0 responde 503 sobre o diário com a `0010`; volta só pelo caminho B; 02, seção 8). Isso
não é falha.

**RNF-01 (rota de situação):** emitir o token `construir` **dentro** da homologação (`scripts/criar-token-servico.ts
--integracao construir`, no contêiner do app), gravado direto num arquivo com permissão 600 numa pasta de `mktemp -d`
fora de qualquer repositório; o valor nunca vai à tela, ao log, a `passagens.jsonl` nem a arquivo rastreado. Com ele,
50 chamadas `GET /api/pedidos-construcao/<DEC>/situacao` ao DEC do pedido gerado do seed (`pedidoParaBuscar`): p95 ≤
500 ms; todas 200 com `{"situacao":"vigente"}`. No fim, revogar o token pelo prefixo e apagar a pasta, também na falha
(`trap`).

**RNF-05 (fila, D-17):** com 5.000 demandas e 6.000 linhas de andamento fictícias (carga pelo migrator, dentro do
contêiner do banco), medir a página da fila (`GET /demandas?status=em_construcao`, sessão fictícia) 50 vezes na versão
da `main` e 50 na do ramo: p95 < 500 ms nas duas, com os dois números na entrega.
