# Plano de implementação — ws-orquestrador-demandas 0.3.0: atores de integração `awave` e `construir`

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou
> superpowers:executing-plans para executar este plano tarefa por tarefa. No /construir, cada tarefa é uma passagem
> `06-Tnn-construcao` do engenheiro indicado, seguida de `06-Tnn-revisao` (tech-lead) e `06-Tnn-testes`
> (qa-automacao). O commit é do maestro. Os passos usam caixa (`- [ ]`): o status report diário lê esses checkboxes.

**Objetivo:** dar ao Awave e ao `/construir` um acesso próprio e mínimo à API do Orquestrador (0.2.0, no ar), por um
quarto tipo de ator, `integracao`, fora dos agentes de IA. O Awave cria demanda (rascunho, 10 por hora, sem agente de IA
até uma pessoa confirmar) e lê só as que criou, em seis campos. O `/construir` lista os pedidos que uma pessoa gerou,
recebe os mesmos bytes da geração e confirma o recebimento pelo SHA-256. Nenhum controle existente é afrouxado.

**Arquitetura:** o monólito modular de hoje (ADR-01 a ADR-19) com os ADR-20 a ADR-29 do pedido: `Ator` ganha
`integracao` com lista fechada no esquema (`INTEGRACOES`), token na mesma tabela (`agente` anulável, `integracao` nova),
matriz com `Linha.integracoes` (padrão vazio), todo ramo por tipo de ator vira `switch` com `never`, estado
("confirmada", "pendente", "entregue", "recebido") derivado do histórico, e a entrega chama a mesma conferência e
montagem da geração (`conferirEMontarPedido`). Uma migration gerada e aditiva (`0007`). Três rotas novas, uma Server
Action nova (num arquivo `'use server'` que já existe), nenhum processo, fila, job, pacote ou variável de ambiente novo.

**Stack:** a do `package.json` de hoje (Node 24, pnpm 12.6.0, TypeScript strict, Next 16.4.1, React 19.2.8, Tailwind 4,
Drizzle 0.45.3 + drizzle-kit 0.31.11, Zod 4.6.6, Better Auth 1.7.7, pg-boss 12.34.0, Vitest 5.0.2 + Testcontainers
12.1.0, Playwright 1.63.0 + `@axe-core/playwright` 4.13.0), registrada no ADR-29. **Nenhum pacote novo.**

**Fontes:** pedido `DEC-DEM-20261111-0016-v1`; spec aprovada na Parada 1
(`docs/superpowers/specs/2026-11-11-ws-orquestrador-demandas-integracoes-design.md`, com as decisões P-01 a P-04 de
Fabiano de 11/11); entregas `01-analista-requisitos.md` (RF-01 a RF-16, RNF-01 a RNF-10), `02-arquiteto-solucoes.md`
(C01 a C15, ADR-20 a ADR-29), `03-ux-ui-design.md` (telas e textos) e `04-seguranca-aplicacao.md` (IN-01 a IN-18), na
pasta `docs/construcao/DEC-DEM-20261111-0016-v1/`; `padrao-tecnico.md` da estruturaAutonoma. Base: `main` em a9fd9b8
(0.2.0).

---

## Restrições globais (valem para toda tarefa)

### G1. Quem edita o quê

| Engenheiro | Edita | Roda |
|---|---|---|
| `engenheiro-dados-bd` | `src/db/`, `src/modules/`, `drizzle/`, `test/`, `scripts/` | `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm db:generate` |
| `engenheiro-backend` | `src/`, `test/`, `scripts/`, `package.json`, `*.config.*` | `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` |
| `engenheiro-frontend` | `src/`, `test/`, `e2e/`, `package.json`, `*.config.*` | `pnpm install`, `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm build` |

Consequências que o plano já respeita: a migration (`drizzle/`) é do `engenheiro-dados-bd` (T01); só o
`engenheiro-frontend` escreve em `e2e/` e roda `pnpm test:e2e` (T16 a T20); ninguém da 06 escreve em `docs/` nem no
`CHANGELOG.md` (G2).

### G2. Fora das tarefas da 06 (cada item tem etapa dona)

| Item | Etapa dona |
|---|---|
| Foco, teclado, leitura e anúncios que o axe não pega na T03, T05 e T11 (03, seção 10), e os estados da 5.4 da 03 conferidos à mão | `07-qa-funcional` |
| `/security-review` com foco em matriz, vistas por tipo de ator, gatilhos e entrega; `pnpm audit --prod --audit-level high` sem alta nem crítica; G4 e IN-16 de novo; achado crítico ou alto volta ao engenheiro e passa por reteste da `seguranca-aplicacao` | `08-revisao` (maestro) e `08-reteste` |
| `docker build`, CI, homologação (`construir.mjs homologar`), ensaio de rollback com `alteram_dado = false` (IN-17), cenários V-01 e V-02 (seção "Verificação na homologação", no fim), medição dos RNF-01 e RNF-02 na homologação | `09-entrega` (`devops-sre`) |
| `CHANGELOG.md` 0.3.0; manual técnico cap. 01, 02, 03, 05, 08, 09 e 10 (ator de integração e matriz; origem, limite do Awave e confirmação; as três rotas do cap. 05, sem dizer que o pedido é só copiado à mão; referência da API; painel); `docs/operacao/` com emissão, troca e revogação dos tokens `awave` e `construir`, onde cada um mora (IN-18), troca imediata em suspeita e periódica a cada 12 meses (P-04), como achar o prefixo de um token ativo sem exibi-lo, e a linha nova no procedimento de volta (migration `0007`, volta por restauração); registro de que o título de demanda do Awave não deve levar nome de pessoa (spec 7.2) | `10-documentacao` (`documentacao-tecnica`) |
| Deploy com a `0007` no passo separado do ADR-12, backup antes (lembrar o snapshot do hPanel e o risco atual dele: congela a VPS e exige reboot manual); emissão dos tokens de produção; gravação do token do `/construir` em `~/.config/ws-construir/`; `"ligado"` em `pedidos/config/orquestrador.json`; teste ponta a ponta pela rede interna (V01/W16, V02/W17) | Fabiano, depois do merge |

### G3. Código

1. **TDD:** o teste é escrito antes e visto falhando; a entrega mostra o comando e o trecho da falha. Ao fim de cada
   tarefa, `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes, e `pnpm test:e2e` verde nas tarefas do
   `engenheiro-frontend`. Exceções declaradas: o teste de caracterização da T09 e a linha de base do piso na T03 já
   nascem verdes (guardam um refatoramento e uma contagem); o teste que falha da T09 é o da função nova, e o da T03, o
   dos pares exatos. Na T13, os testes de guarda que passarem sem mudança de código vão nomeados na entrega, com a
   razão.
2. **Teste que já existe só muda pela lista de G5** (IN-16). Nunca se apaga asserção, nunca se desliga regra do axe,
   nunca se sobe `retries` ou tempo-limite, nunca `bypassCSP`. Mudança fora de G5 vai explicada na entrega, trecho a
   trecho, e a revisão decide.
3. **Dados e tokens só fictícios** (JUR-2026-002, 7.4): títulos com "(fictício)", nomes "Pessoa Ficticia …", domínios
   `.test`. Token de serviço só gerado em tempo de teste (`criarTokenServico` ou `criarTokenDeIntegracao`), nunca
   escrito em arquivo do repositório, em log ou em mensagem de `expect` (IN-04, C-39). Prefixo fictício de evento
   escrito à mão: `ficticio` (8 caracteres, fora do formato de token).
4. **Ramo por tipo de ator é `switch` com `never`** (ADR-22, IN-02): `default: return atorDesconhecido(ator)` (T02),
   nunca `else` que trate "não é pessoa" como agente. Integração em ação que ela não tem lança `sem_permissao`.
5. **Lista de permissão** em tudo que vem da integração: campos do corpo (IN-05), chaves das vistas (IN-08), `depois`
   dos eventos (IN-12). Montagem chave a chave, nunca `...objeto`.
6. **SQL:** só Drizzle ou template `sql` com valor por parâmetro; `SET LOCAL` como literal constante; nada de
   `sql.raw` (teste estático de hoje). Toda transação que grava aceita a de quem chama (`t?: Transacao`, G3.8 de hoje).
7. **Relógio injetado:** `Date.now()` e `new Date()` sem argumento continuam proibidos fora de `relogio.ts`. Teste usa
   `relogioFixo(...)` e `avancar`.
8. **Textos** são os de `03-ux-ui-design.md`, seções 8 e 9, por inteiro; texto que não muda é a constante de hoje.
   Textos que a 03 não escreveu e este plano fixa: D-03 e D-18.
9. **e2e (lição do 0015):** teste que cria versão (ESP, RSK, DEC) pela API usa a conta "administradora" (a "cto" já usa o
   limite C-36 de 60 versões por hora na suíte); teste novo não cria demanda de pessoa pela API (usa o seed, T15);
   Playwright fica com `retries: 0` e 30 s por teste: teste que passar de 24 s na entrega é dividido. e2e só contra
   `next start` (`e2e/servidor.ts`) ou homologação, porta 3101.
10. **Log:** nenhuma linha nova leva token, prefixo, hash, `sha256`, `decId`, título ou corpo (RNF-04, IN-14). A linha
    por requisição de `rota()` já leva só `atorTipo`.

### G4. Superfícies congeladas (IN-15, IN-17) — conferidas pelo tech-lead em toda revisão e na 08

Este comando tem de sair **vazio** em toda revisão de tarefa:

```
git diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json'
```

E `git diff a9fd9b8 -- src/lib/rota.ts` também sai vazio (o exemplo `decId` de `EXEMPLO_DO_PARAMETRO` já cobre as
rotas novas; se o T13 pedir outro, a mudança fica só nessa constante e vai explicada). Arquivo `'use server'` novo:
nenhum (a Server Action da T08 entra em `src/app/(painel)/demandas/[id]/acoes.ts`, que já existe e já é coberto pelo
teste estático do C-04). Nenhum `GRANT` novo; `token_servico.integracao` fora de `colunasUpdate`.

IN-16 em toda revisão: `git diff a9fd9b8 --stat` dos testes da lista de D-17; asserção a menos em teste de segurança é
**Critical**. O `test/estatico/piso-de-assercoes.test.ts` (T03) torna a contagem automática.

### G5. Testes existentes que vão mudar (e só nisto)

| Arquivo | Muda | Tarefa |
|---|---|---|
| `src/modules/acesso/matriz.test.ts` | 19 → 23 ações; `ESPERADA` ganha `integracoes` e as linhas `confirmar_demanda`, `listar_pedidos_pendentes`, `entregar_pedido`, `confirmar_recebimento_pedido`; os `toEqual` de `atoresProibidos` ganham as integrações proibidas no fim da lista; "leitura … ninguém" passa a esperar as integrações proibidas em cada leitura (não mais `[]`); o laço "cada ator proibido é de fato negado" ganha as integrações | T03 |
| `test/requisicao.ts`, `test/matriz-rotas.test.ts` | `AtorDeTeste` e `Credenciais` com integração; `rotulo`; `atoresPermitidos` com as integrações; `it` novo "nada gravado" | T03 |
| `src/modules/acesso/tokens-servico.test.ts`, `tokens-servico-qa.test.ts` | só se um caso esperar `AtorAgente` para linha com agente fora da lista: passa a esperar `null` (IN-03) | T03 |
| `test/estatico/piso-de-assercoes.test.ts` | `PISO` ganha os arquivos de D-17 (só sobe) | T03 |
| o teste da T02 "vista da demanda para integração lança" | passa a esperar as seis chaves (D-01) | T06 |
| `src/app/api/vistas-para-agente.test.ts` | a chave `origem` entra na lista de chaves esperadas dos itens da listagem para agente (04, seção 6) | T07 |
| testes do seed que contam demandas (`TOTAL_DEMANDAS_DO_SEED`, `MENSAGENS_SEED`) | o total cresce com as cinco demandas novas | T15 |
| `test/estatico/projeto.test.ts` | versão 0.2.0 → 0.3.0 | T20 |

### G6. Decisões desta etapa

| Id | Decisão | Razão |
|---|---|---|
| D-01 | **Ordem sem janela de exposição:** T02 põe o tipo `integracao` e todos os ramos exaustivos antes de qualquer token resolver integração (T03). Até a T06, `vistaDaDemandaPara` com integração **lança** `sem_permissao`; o GET por id da integração passa por consulta própria (autoria no `WHERE`) desde a T05; o POST do Awave só funciona a partir da T06, que troca o lançar pela vista de seis chaves | IN-02 antes da primeira rota que aceita integração (04, 5.5 item 2), e nenhum commit do ramo deixa o Awave ler demanda de outro autor, nem por um intervalo |
| D-02 | `criarTokenServico(t, agente, relogio)` fica com a assinatura de hoje; entra `criarTokenDeIntegracao(t, integracao, relogio)`, as duas sobre um `gravarToken` interno | O 02 propunha `dono`; manter a assinatura evita mexer em ~10 testes de segurança que chamam a função de hoje (IN-16) |
| D-03 | **Mensagem do 503 `indisponivel`** (ADR-28; pendência da 02 que a 03 não escreveu, entregue ao tech-lead): "O Orquestrador não concluiu o pedido a tempo e nada foi gravado. Tente de novo em alguns minutos." | Mensagem fixa (IN-14), sem texto do Postgres, verdadeira (o `ROLLBACK` desfaz tudo) e útil a quem lê: o dono no Awave (que mostra o próprio texto para código fora da lista) e Fabiano no e-mail do `/construir` |
| D-04 | **400 do recebimento (divergência 7.3):** forma da 02 (`entrada_invalida`, "Corrija os campos abaixo para continuar.", `campos`) e texto da 03 em `campos[0].mensagem` ("Informe o sha256 com 64 caracteres hexadecimais minúsculos."), por `z.custom` (o `mapearErro` só repassa mensagem de issue `custom`) | Reconciliação pedida na 7.3; um só formato de 400 na API |
| D-05 | O ator `sistema` continua recebendo a vista mínima nas vistas de demanda, ESP, RSK e DEC (o 02 pedia erro na demanda) | Nenhum caminho entrega vista a `sistema`; mudar o comportamento de um ator que já existe está fora do pedido (RNF-09) |
| D-06 | O painel lê "confirmada, por quem e quando" do histórico que a página já carrega, por função pura (`estadoDaConfirmacao`, T17); o servidor usa `aguardaConfirmacao` (T08) | ADR-17 (a página lê, a função decide) e 03, Pendências; nenhuma consulta nova na página |
| D-07 | **Onde o worker relê a confirmação (pendência da 04):** em `executar.ts`, passo 3c, depois do M-02 e antes de `montarEntrada`, por `aguardaConfirmacao` (lê `demanda` e `evento`, nunca o esquema `pgboss`); sem confirmação, `ignorada` + `agente_ignorado` com motivo `sem_confirmacao`, sem chamar o provedor nem gravar `uso_ia` | Defesa em profundidade do IN-06 com o caminho de "ignorada" que já existe |
| D-08 | Ordem das conferências da confirmação, sob a trava da demanda: outra origem → 409; já confirmada → sucesso sem gravar; status final → 409 | A repetição é idempotente (RF-06) mesmo depois de a demanda fechar; a origem vem primeiro porque nunca muda |
| D-09 | O seed não cria token: os atos do Awave e do `/construir` no seed usam ator de integração com o prefixo fictício `ficticio` | O CHECK do evento exige prefixo; nenhum token nasce num banco semeado (IN-04) |
| D-10 | **Tokens do e2e local:** `e2e/servidor.ts` emite um token `awave` e um `construir` depois do seed e os grava em `tokens.json` com permissão 600, numa pasta de `mkdtemp` fora do repositório cujo caminho vem de `E2E_ARQUIVO_TOKENS` (posto pelo `playwright.config.ts` só sem `BASE_URL`); a pasta é apagada no encerramento. Contra a homologação, os testes de API das integrações pulam com o motivo escrito, e a V-01 e a V-02 da 09 cobrem | O e2e local é o build de produção com o `proxy.ts` de verdade: é onde se prova que Bearer sem `Origin` passa (CA-09.1, CA-09.3) sem token no repositório |
| D-11 | CA-15.2 (sem `pedido_recebido`, a linha não existe) fica em Vitest da função pura `linhaDoRecebimento`; o e2e da T11 confere só o caso positivo | O estado do DEC do seed muda entre execuções contra a mesma homologação |
| D-12 | As leituras do pedido no histórico (`listarPendentes`, `pedidoGeradoPorPessoa`, `shasEntregues`, `recebidoComSha`, `recebimentoDoPedido`) ficam em `src/modules/pedido-construcao/pendentes.ts`, com o `engenheiro-dados-bd` e plano de execução conferido | É a consulta crítica do RNF-02 (200 DEC, 20 mil eventos); o dono do índice ADR-27 confere o uso |
| D-13 | P-01 a P-04 de Fabiano (11/11): botão "Confirmar demanda" sem diálogo, por qualquer pessoa com 2FA; `pedido_entregue` uma vez por hash e DEC com entrega recusada continua em `pendentes`; sem corte por data; troca dos tokens a cada 12 meses (texto da 10) | Decisões da Parada 1 |
| D-14 | `NOME_DA_INTEGRACAO` em `src/modules/acesso/ator.ts` (o servidor grava "Awave" como solicitante) e `NOME_INTEGRACAO` em `src/components/rotulos.ts` (a tela, que só importa tipos dos módulos); um teste confere que são iguais | Padrão D-11 do 0015 (cópia conferida por teste) |
| D-15 | `src/modules/agentes/entrada-agente.ts` não muda: `montarEntrada` não decide por tipo de ator; a guarda do IN-06 fica antes dele (gatilho e passo 3c), e o teste da T08 prova que o provedor não é chamado | O inventário do IN-02 registra o arquivo sem ramo a trocar |
| D-16 | `vistaDaDemandaPara` devolve a vista de seis chaves para integração (o 201 do POST) e o GET por id da integração nunca chama `obterDemanda` (`lerDemandaPara`, T05) | IN-08 e ADR-23: o 404 sai da mesma consulta do inexistente |
| D-17 | Piso de asserções (IN-16) ampliado a: `src/modules/acesso/matriz.test.ts`, `matriz-qa.test.ts`, `resolver-ator.test.ts`, `resolver-ator-qa.test.ts`, `tokens-servico.test.ts`, `tokens-servico-qa.test.ts`, `src/modules/demandas/servico.test.ts` (C-11), `src/modules/historico/registrar.test.ts` (C-30), `src/modules/limites.test.ts` (C-36), `src/db/privilegios.test.ts`, `src/app/api/vistas-para-agente.test.ts`, `test/matriz-rotas.test.ts`, `test/transversal/sentinelas.test.ts`, `test/estatico/sem-controle-bidi.test.ts`, `test/estatico/sem-recurso-externo.test.ts`, `test/estatico/leituras-da-fila.test.ts`. O número de cada um é o de linhas com `expect(` no arquivo em a9fd9b8, contado pelo engenheiro antes de mexer (Read) e conferido pelo tech-lead na revisão | Torna o IN-16 automático em toda tarefa, como o D-12 do 0015 |
| D-18 | Motivo `sem_confirmacao` no histórico: "demanda aberta pelo Awave ainda não confirmada" (`MOTIVO_IGNORADO`) | Texto que a 03 não escreveu; segue o padrão dos motivos de hoje |
| D-19 | Prefixo do token no histórico só para integração e só depois da regex `^[A-Za-z0-9_-]{8}$`, na leitura (`atorVisivel`); agente continua sem prefixo | IN-13 e 04, seção 6 |
| D-20 | A parte verificável do IN-18 vira teste estático (T14): nenhum valor no formato de token em `docs/`, `CHANGELOG.md` e `README.md` | A guarda vale desde a 06 para o texto que a 10 escrever |
| D-21 | RNF-01 pede 20 chamadas na homologação, mas o limite do Awave é 10 por hora: a 09 mede 10 criações e as 10 recusas seguintes (o 429 passa pelo mesmo caminho até a trava), ou duas janelas de 10 | Os dois requisitos do 01 não cabem juntos numa janela só |

### G7. Nomes que várias tarefas usam

```ts
// src/db/schema/acesso.ts (T01)
export const INTEGRACOES = ['awave', 'construir'] as const;
export type Integracao = (typeof INTEGRACOES)[number];
// src/db/schema/demandas.ts (T01)
export const AUTORES_DEMANDA = ['pessoa', 'agente', 'integracao'] as const;
export type AutorDemanda = (typeof AUTORES_DEMANDA)[number];
// src/db/schema/historico.ts (T01)
export type AtorTipo = 'pessoa' | 'agente' | 'sistema' | 'integracao';

// src/modules/acesso/ator.ts (T02)
export { INTEGRACOES, type Integracao } from '../../db/schema/acesso';
export type AtorIntegracao = { tipo: 'integracao'; integracao: Integracao; prefixoToken: string };
export type Ator = AtorPessoa | AtorAgente | AtorSistema | AtorIntegracao;
export const ehIntegracao: (v: unknown) => v is Integracao;
export const NOME_DA_INTEGRACAO: Readonly<Record<Integracao, string>>; // { awave: 'Awave', construir: '/construir' }
export function atorDesconhecido(nunca: never): never;

// src/modules/acesso/tokens-servico.ts (T03)
export function criarTokenDeIntegracao(t: Transacao, integracao: Integracao, relogio: Relogio): Promise<{ token: string; prefixo: string }>;
export function validarTokenServico(db: Db, token: string): Promise<AtorAgente | AtorIntegracao | null>;

// src/modules/acesso/matriz.ts (T02, T03)
type Linha = { pessoa: 'qualquer' | 'cto' | null; agentes: readonly Agente[]; integracoes: readonly Integracao[] };
export function atoresProibidos(acao: Acao): Array<{ tipo: 'agente'; agente: Agente } | { tipo: 'pessoa'; papel: Papel } | { tipo: 'integracao'; integracao: Integracao }>;

// src/modules/limites.ts (T04)
export const MENSAGEM_LIMITE_AWAVE: string;
export function limiteDe(ator: Ator, tipo: TipoLimite): { maximo: number; mensagem: string } | null;

// src/modules/integracoes/tempo-limite.ts (T04)
export type Orcamento = 'padrao' | 'entrega';
export const MENSAGEM_INDISPONIVEL: string; // D-03
export function limitarTempo(tx: Db, ator: Ator, orcamento: Orcamento): Promise<void>;
export function traduzirTempoEsgotado(e: unknown): unknown;
export function executarComOrcamento<T>(pool: pg.Pool, ator: Ator, orcamento: Orcamento, t: Transacao | undefined, corpo: (t: Transacao) => Promise<T>): Promise<T>;

// src/modules/demandas/consultas.ts (T02, T05, T07)
export type Responsavel = { tipo: 'pessoa'; nome: string | null } | { tipo: 'agente'; agente: Agente } | { tipo: 'integracao'; integracao: Integracao };
export type DemandaVistaDaIntegracao = { id: string; titulo: string; tipo: Tipo; status: Status; criadaEm: Date; atualizadaEm: Date };
export function vistaDaIntegracao(d: Pick<DemandaVista, 'id' | 'titulo' | 'tipo' | 'status' | 'solicitanteNome' | 'criadaEm' | 'atualizadaEm'>): DemandaVistaDaIntegracao;
export function obterDemandaDaIntegracao(db: Db, ator: AtorIntegracao, id: string): Promise<DemandaVistaDaIntegracao>;
export function lerDemandaPara(deps: { db: Db; pool: pg.Pool }, ator: Ator, id: string): Promise<DemandaVista | DemandaVistaMinima | DemandaVistaDaIntegracao>;
export function origemDaAutoria(autorTipo: string, autorId: string): OrigemDaDemanda;
export function origemDoResponsavel(r: Responsavel): OrigemDaDemanda;
// src/modules/demandas/schemas.ts (T07)
export const ORIGENS_DA_DEMANDA = ['pessoa', 'agente', 'awave'] as const;
export type OrigemDaDemanda = (typeof ORIGENS_DA_DEMANDA)[number];

// src/modules/demandas/confirmacao.ts e confirmar.ts (T08)
export function jaConfirmada(db: Db, demandaId: string): Promise<boolean>;
export function aguardaConfirmacao(db: Db, demandaId: string): Promise<boolean>;
export const MENSAGENS_CONFIRMACAO: { outraOrigem: string; statusFinal: string };
export function confirmarDemanda(deps: DepsComFila, ator: Ator, id: string, t?: Transacao): Promise<{ jaConfirmada: boolean }>;
// src/app/(painel)/demandas/[id]/acoes.ts (T08)
export async function confirmarDemandaNoPainel(pedido: unknown): Promise<ResultadoAcao<{ id: string }>>;

// src/modules/pedido-construcao/conferir.ts (T09)
export function conferirEMontarPedido(tx: Db, decId: string): Promise<{ dec: PacoteDecisaoVista; json: string }>;
// src/modules/pedido-construcao/pendentes.ts (T10)
export function listarPendentes(db: Db): Promise<Array<{ decId: string }>>;
export function pedidoGeradoPorPessoa(db: Db, decId: string): Promise<{ demandaId: string } | null>;
export function shasEntregues(db: Db, decId: string): Promise<string[]>;
export function recebidoComSha(db: Db, decId: string, sha256: string): Promise<boolean>;
export function recebimentoDoPedido(db: Db, decId: string): Promise<Date | null>;
// src/modules/pedido-construcao/entregar.ts (T11) e receber.ts (T12)
export const RE_SHA256 = /^[0-9a-f]{64}$/;
export function sha256DoPedido(json: string): string;
export function pendentesPara(deps: DepsDemanda, ator: Ator): Promise<Array<{ decId: string }>>;
export function entregarPedido(deps: DepsDemanda, ator: Ator, decId: string, t?: Transacao): Promise<{ json: string; sha256: string }>;
export const MENSAGENS_RECEBIMENTO: { formato: string; naoEntregue: string; shaDiferente: string };
export const recebimentoSchema: z.ZodType<{ sha256: string }>;
export function receberPedido(deps: DepsDemanda, ator: Ator, decId: string, sha256: string, t?: Transacao): Promise<{ jaRecebido: boolean }>;

// src/components (T02, T16, T17, T19)
export const NOME_INTEGRACAO: Readonly<Record<Integracao, string>>;
export const ROTULO_ORIGEM: Readonly<Record<OrigemDaDemanda, string>>;
export const SELO_AGUARDANDO_CONFIRMACAO: SeloFixo;
export type EstadoDaConfirmacao = { tipo: 'nao_se_aplica' } | { tipo: 'aguardando' } | { tipo: 'confirmada'; ator: string; em: Date } | { tipo: 'final_sem_confirmacao'; status: Status };
export function estadoDaConfirmacao(x: { origem: OrigemDaDemanda; status: Status; historico: readonly Pick<EventoVisivel, 'acao' | 'ator' | 'ocorridoEm'>[] }): EstadoDaConfirmacao;
export function linhaDoRecebimento(recebidoEm: Date | null): { texto: string; iso: string } | null;

// test/integracoes.ts (T03, T04)
export const atorDeIntegracao: (integracao: Integracao, prefixoToken?: string) => AtorIntegracao;
export function tokenDeIntegracao(deps: Deps, integracao: Integracao): Promise<string>;
export function inserirDemandaDeIntegracao(b: BancoDeTeste, d: { id: string; titulo?: string; criadaEm: Date; status?: Status; contexto?: string; descricaoProblema?: string }): Promise<void>;
export const CORPO_DO_AWAVE: Readonly<Record<string, string>>;
```

### G8. Inventário do IN-02 (cada linha é conferida na revisão da tarefa indicada)

| # | Caminho | Função | Hoje | Depois | Tarefa |
|---|---|---|---|---|---|
| 1 | `src/modules/acesso/matriz.ts` | `permitido` | `if` pessoa, `if` agente, `false` | `switch` com `integracao` (`ehIntegracao` **e** a linha) e `never` (desconhecido → `false`) | T02 |
| 2 | `src/modules/acesso/matriz.ts` | `atoresProibidos` | agentes e papéis | mais as integrações | T03 |
| 3 | `src/modules/acesso/tokens-servico.ts` | `validarTokenServico` | sempre `AtorAgente` | agente só com `agente ∈ AGENTES` e `integracao` nula; integração só com `integracao ∈ INTEGRACOES` e `agente` nulo; senão `null` | T03 (T01 deixa linha sem agente → `null`) |
| 4 | `src/modules/historico/registrar.ts` | `colunasDoAtor` | `switch` sem `never` | caso `integracao` (`ator_id` = integração, prefixo) e `never` | T02 |
| 5 | `src/modules/demandas/servico.ts` | `autoriaDo` (versões) | agente, pessoa, lança | `switch`: integração e sistema lançam `sem_permissao` | T02 |
| 6 | `src/modules/demandas/servico.ts` | `autoriaDaDemanda` (nova) | — | `switch`: `awave` → `{ integracao, awave }`; `construir` e sistema lançam | T06 |
| 7 | `src/modules/demandas/servico.ts` | `criarDemanda` (campos e disparo) | todo ator: campos do corpo e `dispararSeLigado` | `switch`: integração com a lista do IN-05 e sem disparo; pessoa e agente como hoje | T06 |
| 8 | `src/modules/demandas/consultas.ts` | `responsavelDe` | pessoa, agente da lista, lança | mais `integracao` da lista | T02 |
| 9 | `src/modules/demandas/consultas.ts` | `responsavelMinimo` | ternário pessoa : agente | `switch` com integração | T02 |
| 10 | `src/modules/demandas/consultas.ts` | `vistaDaDemandaPara` | pessoa inteira; resto, mínima | `switch`: pessoa inteira; agente e sistema mínima (D-05); integração lança (T02) e depois seis chaves (T06) | T02, T06 |
| 11 | `src/modules/demandas/consultas.ts` | `listarDemandasPara` | `ehPessoa ? :` | `switch`: integração lança `sem_permissao` | T02 |
| 12 | `src/modules/demandas/consultas.ts` | `lerDemandaPara`, `obterDemandaDaIntegracao` (novas) | — | `switch`: integração pela autoria no `WHERE` | T05 |
| 13 | `src/modules/demandas/consultas.ts` | `origemDaAutoria`, `origemDoResponsavel` (novas) | — | `switch` | T07 |
| 14 | `src/modules/especificacoes/consultas.ts` | `vistaDaEspecificacaoPara` | pessoa : mínima | `switch`: integração lança; sistema mínima (D-05) | T02 |
| 15 | `src/modules/pareceres-risco/consultas.ts` | `vistaDoParecerPara` | idem | idem | T02 |
| 16 | `src/modules/pacotes-decisao/consultas.ts` | `vistaDoPacotePara` | idem | idem | T02 |
| 17 | `src/modules/limites.ts` | `autoriaDo` → `autoriaDoLimite` | pessoa, agente, `null` | `switch`: integração conta; só sistema `null` | T04 |
| 18 | `src/modules/limites.ts` | `limiteDe` (nova) | — | `switch`: integração sem limite definido **lança** | T04 |
| 19 | `src/modules/integracoes/tempo-limite.ts` | `limitarTempo` (nova) | — | `switch`: só integração recebe `SET LOCAL` | T04 |
| 20 | `src/modules/historico/consultas.ts` | `atorVisivel` | pessoa, agente da lista, senão sistema | `switch` por `atorTipo` com `integracao` (nome da lista ou `null`, prefixo pela regex, D-19) | T02 |
| 21 | `src/components/rotulos.ts` | `rotuloAtor` | `if` agente, `if` sistema, pessoa | `switch` com integração (03, 5.6) | T02 |
| 22 | `src/app/(painel)/demandas/[id]/detalhe.ts` | `rotuloResponsavel` | agente : pessoa | `switch` com integração ("Awave") | T02 |
| 23 | `src/modules/demandas/confirmacao.ts` | `aguardaConfirmacao` (nova) | — | `switch` por `autorTipo`; desconhecido → `true` (falha fechada) | T08 |
| 24 | `src/modules/demandas/confirmar.ts` | `ehDoAwave` (nova) | — | `switch` por `autorTipo` | T08 |
| 25 | `src/modules/agentes/gatilhos.ts` | `dispararSeLigado` | não olha a autoria | `aguardaConfirmacao` antes de tudo | T08 |
| 26 | `src/modules/agentes/executar.ts` | `executarReivindicada` | passos 1 a 3b | passo 3c (D-07) | T08 |
| 27 | `src/modules/agentes/entrada-agente.ts` | `montarEntrada` | não decide por tipo de ator | sem mudança (D-15) | — |
| 28 | `src/modules/especificacoes/servico.ts`, `pareceres-risco/servico.ts`, `pacotes-decisao/criar.ts`, `decidir.ts` | `ator.tipo === 'agente'` para rascunho e nível | — | sem mudança: `autoriaDo` (#5) lança para integração antes | — |
| 29 | `src/lib/rota.ts`, `src/lib/acao-painel.ts`, `src/modules/acesso/ator-pessoa.ts` | `atorTipo` do log; só pessoa; `tipo !== 'pessoa'` → 403 | — | sem mudança (G4) | — |

O `typecheck` aponta todo `switch` de `Ator` sem `never` quando o tipo novo entra (T02); o engenheiro trata cada ponto
que ele apontar pelo mesmo padrão e lista os arquivos na entrega, e a revisão confere contra esta tabela.

---

## Fase 1 — Fundação (antes de qualquer rota aceitar integração)

### T01. Esquema e migration 0007 (aditiva)

**Engenheiro:** `engenheiro-dados-bd` · **Risco:** alto (migration num banco no ar, token de serviço) · **Cobre:**
RNF-06, IN-03 (CHECK), IN-05 (CHECK), IN-12 (CHECK), IN-17, ADR-21, ADR-24, ADR-27, CA-11.2

**Arquivos:**
- Modificar: `src/db/schema/acesso.ts`, `src/db/schema/historico.ts`, `src/db/schema/demandas.ts`,
  `src/modules/acesso/tokens-servico.ts` (só o `null` da linha sem agente, para o `typecheck`)
- Criar: `drizzle/0007_<gerado>.sql` e `drizzle/meta/0007_snapshot.json` (por `pnpm db:generate`, sem editar),
  `src/db/schema/integracao.test.ts`, `test/estatico/migration-0007.test.ts`

**Interfaces produzidas:** `INTEGRACOES`, `Integracao`, `AUTORES_DEMANDA`, `AutorDemanda`, `AtorTipo` (G7).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/db/schema/integracao.test.ts — RNF-06, IN-03, IN-05, IN-12, IN-17 e CA-11.2: as regras novas valem no banco.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const hash = (n: number) => n.toString(16).padStart(64, '0');
const token = (agente: string | null, integracao: string | null, n: number) =>
  b.poolApp.query(
    `insert into token_servico (agente, integracao, hash, prefixo, criado_em) values ($1, $2, $3, 'abcd1234', '2026-11-11T12:00:00Z')`,
    [agente, integracao, hash(n)],
  );
const viola = (constraint: string) => expect.objectContaining({ code: '23514', constraint });

describe('token_servico (ADR-21, IN-03)', () => {
  it('aceita token de integração com agente nulo, para awave e construir', async () => {
    await expect(token(null, 'awave', 1)).resolves.toBeDefined();
    await expect(token(null, 'construir', 2)).resolves.toBeDefined();
  });
  it('recusa os dois donos nulos e os dois preenchidos', async () => {
    await expect(token(null, null, 3)).rejects.toEqual(viola('token_servico_dono_check'));
    await expect(token('risco', 'awave', 4)).rejects.toEqual(viola('token_servico_dono_check'));
  });
  it('recusa integração fora da lista', async () => {
    await expect(token(null, 'jarvis', 5)).rejects.toEqual(viola('token_servico_integracao_check'));
  });
  it('IN-17: o papel do app não muda a integração de um token', async () => {
    await expect(b.poolApp.query(`update token_servico set integracao = 'awave' where hash = $1`, [hash(2)])).rejects.toEqual(
      expect.objectContaining({ code: '42501' }),
    );
  });
});

const ev = (atorTipo: string, atorId: string, prefixo: string | null) =>
  b.poolApp.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, entidade, entidade_id, acao) values ('2026-11-11T12:00:00Z', $1, $2, $3, 'demanda', 'DEM-20261111-0001', 'demanda_criada')`,
    [atorTipo, atorId, prefixo],
  );

describe('evento (IN-12)', () => {
  it('aceita ator integracao da lista com prefixo', async () => {
    await expect(ev('integracao', 'awave', 'ficticio')).resolves.toBeDefined();
  });
  it('recusa integração sem prefixo ou fora da lista', async () => {
    await expect(ev('integracao', 'awave', null)).rejects.toEqual(viola('evento_ator_integracao_check'));
    await expect(ev('integracao', 'jarvis', 'ficticio')).rejects.toEqual(viola('evento_ator_integracao_check'));
  });
  it('ADR-27: o índice evento_acao_entidade_idx existe em (acao, entidade_id)', async () => {
    const { rows } = await b.poolMigrator.query(`select indexdef from pg_indexes where indexname = 'evento_acao_entidade_idx'`);
    expect(rows[0]?.indexdef).toMatch(/\(acao, entidade_id\)/);
  });
});

const dem = (id: string, autorTipo: string, autorId: string, rascunho: boolean) =>
  b.poolApp.query(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em) values ($1, 'Título (fictício)', 'melhoria', 'Awave', $2, $3, $4, '2026-11-11T12:00:00Z', '2026-11-11T12:00:00Z')`,
    [id, autorTipo, autorId, rascunho],
  );

describe('demanda (IN-05, ADR-24)', () => {
  it('aceita autoria do awave como rascunho', async () => {
    await expect(dem('DEM-20261111-0001', 'integracao', 'awave', true)).resolves.toBeDefined();
  });
  it('recusa construir como autor e awave sem rascunho', async () => {
    await expect(dem('DEM-20261111-0002', 'integracao', 'construir', true)).rejects.toEqual(viola('demanda_autor_integracao_check'));
    await expect(dem('DEM-20261111-0003', 'integracao', 'awave', false)).rejects.toEqual(viola('demanda_autor_integracao_check'));
  });
  it('as versões continuam só com pessoa e agente', async () => {
    const { rows } = await b.poolMigrator.query(
      `select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'especificacao_tecnica_autor_tipo_check'`,
    );
    expect(rows[0]?.d).not.toMatch(/integracao/);
  });
});

it('CA-11.2: configuracao_agente continua com as quatro linhas', async () => {
  const { rows } = await b.poolMigrator.query(`select agente from configuracao_agente order by agente`);
  expect(rows.map((r) => r.agente)).toEqual(['consolidacao', 'insumo_tecnico', 'orquestrador', 'risco']);
});
```

Confira o nome do CHECK de autoria da ESP no esquema de hoje (`src/db/schema/versoes.ts`) e use o real no último teste.

```ts
// test/estatico/migration-0007.test.ts — RNF-06 e IN-17: uma migration nova, gerada, só aditiva.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const diario = JSON.parse(readFileSync(`${raiz}drizzle/meta/_journal.json`, 'utf8')) as { entries: { idx: number; tag: string }[] };

it('a 0007 é a última e a única nova', () => {
  expect(diario.entries.map((e) => e.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

it('a 0007 não apaga, renomeia, reescreve nem troca tipo de nada', () => {
  const tag = diario.entries.at(-1)!.tag;
  const sql = readFileSync(`${raiz}drizzle/${tag}.sql`, 'utf8');
  for (const proibido of [/\bupdate\s+"/i, /\bdelete\s+from\b/i, /\bdrop\s+column\b/i, /\bdrop\s+table\b/i, /\brename\b/i, /\bset\s+data\s+type\b/i, /\btruncate\b/i, /\bgrant\b/i])
    expect(sql, String(proibido)).not.toMatch(proibido);
  for (const esperado of ['token_servico_dono_check', 'token_servico_integracao_check', 'evento_ator_integracao_check', 'demanda_autor_integracao_check', 'evento_acao_entidade_idx'])
    expect(sql).toContain(esperado);
});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/db/schema/integracao.test.ts test/estatico/migration-0007.test.ts`
  (coluna `integracao` inexistente; diário com 7 entradas).

- [ ] **Passo 3: esquema**

```ts
// src/db/schema/acesso.ts — fonte única da lista de integrações (ADR-20), espelhada nos CHECK.
export const INTEGRACOES = ['awave', 'construir'] as const;
export type Integracao = (typeof INTEGRACOES)[number];

// C-09 e ADR-21: o banco guarda só o SHA-256; o dono é um agente OU uma integração, nunca os dois nem nenhum.
export const tokenServico = pgTable(
  'token_servico',
  {
    id: uuid().primaryKey().defaultRandom(),
    agente: text().$type<Agente>(),
    integracao: text().$type<Integracao>(),
    hash: text().notNull().unique(),
    prefixo: text().notNull(),
    criadoEm: momento().notNull(),
    revogadoEm: momento(),
  },
  () => [
    check('token_servico_agente_check', sql`"agente" in ('orquestrador', 'insumo_tecnico', 'risco', 'consolidacao')`),
    check('token_servico_integracao_check', sql`"integracao" in ('awave', 'construir')`),
    check('token_servico_dono_check', sql`num_nonnulls("agente", "integracao") = 1`),
  ],
);
```

```ts
// src/db/schema/historico.ts
export type AtorTipo = 'pessoa' | 'agente' | 'sistema' | 'integracao';
// ...
check('evento_ator_tipo_check', sql`"ator_tipo" in ('pessoa', 'agente', 'sistema', 'integracao')`),
// IN-12: ato de integração sempre com o nome da lista e o prefixo do token.
check('evento_ator_integracao_check', sql`"ator_tipo" <> 'integracao' or ("ator_id" in ('awave', 'construir') and "ator_token_prefixo" is not null)`),
index('evento_demanda_ocorrido_idx').on(t.demandaId, t.ocorridoEm),
// ADR-27: pendentes, entregue, recebido e confirmada procuram por ação e entidade.
index('evento_acao_entidade_idx').on(t.acao, t.entidadeId),
```

```ts
// src/db/schema/demandas.ts — a demanda tem lista própria; AUTORES_ARTEFATO (ESP, RSK, DEC) não muda.
export const AUTORES_DEMANDA = ['pessoa', 'agente', 'integracao'] as const;
export type AutorDemanda = (typeof AUTORES_DEMANDA)[number];
// ...
autorTipo: text().$type<AutorDemanda>().notNull(),
// ...
check('demanda_autor_tipo_check', sql`"autor_tipo" in ('pessoa', 'agente', 'integracao')`),
// ADR-24 e IN-05: só o awave cria demanda como integração, e sempre como rascunho.
check('demanda_autor_integracao_check', sql`"autor_tipo" <> 'integracao' or ("autor_id" = 'awave' and "rascunho_agente")`),
```

Em `validarTokenServico`, enquanto a T03 não chega: linha com `agente` nulo devolve `null` (401). Nada mais muda ali.

- [ ] **Passo 4: gerar a migration** — `pnpm db:generate`. A `0007` fica como saiu. Na entrega, em `## Decisões
  tomadas`, o SQL de volta (para referência; a volta real é por restauração, ADR-12): `drop index
  evento_acao_entidade_idx`; `drop constraint` dos quatro CHECK novos; `evento_ator_tipo_check` e
  `demanda_autor_tipo_check` de volta à lista de hoje; `drop column integracao`; `alter column agente set not null`
  (só sem linha de integração).

- [ ] **Passo 5: verificar** — `pnpm test`, `pnpm lint`, `pnpm typecheck` verdes; `src/db/privilegios.test.ts` verde
  sem mudança; G4 vazio.

### T02. Tipo de ator `integracao` e ramos exaustivos (IN-02)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (autorização e vistas por ator) · **Cobre:** IN-02 (linhas 1, 4,
5, 8 a 11, 14 a 16, 20 a 22 do G8), IN-13, RF-01 (tipo), RF-15 (textos dos eventos), D-01, D-05, D-14, D-19

**Arquivos:**
- Modificar: `src/modules/acesso/ator.ts`, `src/modules/acesso/matriz.ts` (só `Linha.integracoes` vazio e
  `permitido`), `src/modules/historico/registrar.ts`, `src/modules/historico/consultas.ts`,
  `src/modules/demandas/consultas.ts`, `src/modules/demandas/servico.ts` (`autoriaDo`),
  `src/modules/especificacoes/consultas.ts`, `src/modules/pareceres-risco/consultas.ts`,
  `src/modules/pacotes-decisao/consultas.ts`, `src/components/rotulos.ts`,
  `src/app/(painel)/demandas/[id]/detalhe.ts`, e todo ponto que o `typecheck` apontar (listado na entrega)
- Criar: `src/modules/acesso/ramos-por-ator.test.ts`, `src/components/rotulos-integracao.test.ts`,
  `src/modules/historico/consultas-integracao.test.ts`

**Interfaces produzidas:** `AtorIntegracao`, `Ator`, `ehIntegracao`, `NOME_DA_INTEGRACAO`, `atorDesconhecido`,
`Responsavel`, `ResponsavelMinimo`, `AtorVisivel` com integração, `NOME_INTEGRACAO`, `AcaoEvento` com
`demanda_confirmada`, `pedido_entregue`, `pedido_recebido`.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/acesso/ramos-por-ator.test.ts — IN-02: o tipo novo nunca cai no ramo do agente.
import { describe, expect, it } from 'vitest';
import type { DemandaVista } from '../demandas/consultas';
import { listarDemandasPara, responsavelDe, responsavelMinimo, vistaDaDemandaPara } from '../demandas/consultas';
import { autoriaDo } from '../demandas/servico';
import { vistaDaEspecificacaoPara } from '../especificacoes/consultas';
import { colunasDoAtorParaTeste } from '../historico/registrar';
import { vistaDoPacotePara } from '../pacotes-decisao/consultas';
import { vistaDoParecerPara } from '../pareceres-risco/consultas';
import { NOME_DA_INTEGRACAO, type AtorIntegracao } from './ator';
import { autorizar } from './matriz';

const awave: AtorIntegracao = { tipo: 'integracao', integracao: 'awave', prefixoToken: 'ficticio' };
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });
const demanda = { id: 'DEM-20261111-0001', titulo: 'T (fictício)', solicitanteNome: 'Awave' } as DemandaVista;

describe('IN-02', () => {
  it('integração passa pelo ramo próprio de permitido, e não pelo do agente', () => {
    // Ações que ficam negadas ao awave também depois da T03 (nenhum teste desta tarefa muda lá).
    for (const acao of ['ler_historico', 'ler_especificacao', 'listar_demandas', 'registrar_decisao'] as const)
      expect(() => autorizar(awave, acao), acao).toThrow(SEM_PERMISSAO);
  });
  it('vistas de ESP, RSK e DEC lançam para integração, nunca devolvem a de agente', () => {
    expect(() => vistaDaEspecificacaoPara(awave, {} as never, [])).toThrow(SEM_PERMISSAO);
    expect(() => vistaDoParecerPara(awave, {} as never, [])).toThrow(SEM_PERMISSAO);
    expect(() => vistaDoPacotePara(awave, {} as never, [])).toThrow(SEM_PERMISSAO);
  });
  it('D-01: a vista da demanda para integração lança até a T06', () => {
    expect(() => vistaDaDemandaPara(awave, demanda)).toThrow(SEM_PERMISSAO);
  });
  it('a listagem lança para integração', async () => {
    await expect(listarDemandasPara({} as never, { limit: 20, offset: 0 }, awave)).rejects.toEqual(SEM_PERMISSAO);
  });
  it('a autoria das versões recusa integração', () => {
    expect(() => autoriaDo(awave)).toThrow(SEM_PERMISSAO);
  });
  it('responsável e responsável mínimo de integração', () => {
    expect(responsavelDe('integracao', 'awave', null)).toEqual({ tipo: 'integracao', integracao: 'awave' });
    expect(() => responsavelDe('integracao', 'jarvis', null)).toThrow('autoria desconhecida');
    expect(responsavelMinimo({ tipo: 'integracao', integracao: 'awave' })).toEqual({ tipo: 'integracao', integracao: 'awave' });
  });
  it('colunas do evento de integração: nome e prefixo', () => {
    expect(colunasDoAtorParaTeste(awave)).toEqual({ atorTipo: 'integracao', atorId: 'awave', atorTokenPrefixo: 'ficticio' });
  });
  it('NOME_DA_INTEGRACAO', () => {
    expect(NOME_DA_INTEGRACAO).toEqual({ awave: 'Awave', construir: '/construir' });
  });
});
```

Confira a assinatura real de `vistaDaEspecificacaoPara`, `vistaDoParecerPara` e `vistaDoPacotePara` e ajuste os
argumentos; `colunasDoAtorParaTeste` é `colunasDoAtor` exportada com esse nome (só para teste), sem mudar o uso interno.

```ts
// src/modules/historico/consultas-integracao.test.ts — IN-02 e IN-13: o ato da integração aparece como ela, com o
// prefixo só se casar a regex; nunca como "Sistema".
// Banco real: insere pelo migrator eventos de integração (awave com 'ficticio', construir com 'abc' fora da regex e
// ator_id 'jarvis' com o CHECK desligado só neste banco de teste) e lê por listarHistorico.
// Espera: { tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' }; { tipo: 'integracao', integracao:
// 'construir', prefixo: null }; { tipo: 'integracao', integracao: null, prefixo: null }; e o evento de agente continua
// sem prefixo ({ tipo: 'agente', agente }).
```

```ts
// src/components/rotulos-integracao.test.ts — 03, 5.6: textos do ator e dos eventos novos.
import { describe, expect, it } from 'vitest';
import { NOME_DA_INTEGRACAO } from '../modules/acesso/ator';
import type { EventoVisivel } from '../modules/historico/consultas';
import { NOME_INTEGRACAO, rotuloAtor, textoDoEvento } from './rotulos';

const ev = (acao: EventoVisivel['acao'], entidadeId: string, depois: Record<string, unknown> | null = null): EventoVisivel => ({
  id: 1, ocorridoEm: new Date('2026-11-11T12:00:00Z'), ator: { tipo: 'sistema' }, entidade: 'x', entidadeId, acao, antes: null, depois,
});

describe('rótulos de integração', () => {
  it('D-14: NOME_INTEGRACAO é igual ao do servidor', () => expect(NOME_INTEGRACAO).toEqual(NOME_DA_INTEGRACAO));
  it('ator', () => {
    expect(rotuloAtor({ tipo: 'integracao', integracao: 'awave', prefixo: 'a1b2c3d4' })).toBe('Awave (prefixo a1b2c3d4)');
    expect(rotuloAtor({ tipo: 'integracao', integracao: 'construir', prefixo: null })).toBe('/construir');
    expect(rotuloAtor({ tipo: 'integracao', integracao: null, prefixo: 'a1b2c3d4' })).toBe('Integração');
  });
  it('eventos novos (CA-15.3)', () => {
    const dec = 'DEC-DEM-20261111-0021-v1';
    expect(textoDoEvento(ev('demanda_confirmada', 'DEM-20261111-0021'))).toBe('Confirmou a demanda aberta pelo Awave');
    expect(textoDoEvento(ev('pedido_entregue', dec))).toBe(`Buscou o Pedido de Construção de ${dec}`);
    expect(textoDoEvento(ev('pedido_entregue', 'x'))).toBe('Buscou o Pedido de Construção de um pacote de decisão');
    expect(textoDoEvento(ev('pedido_recebido', dec))).toBe(`Confirmou o recebimento do Pedido de Construção de ${dec}`);
    expect(textoDoEvento(ev('pedido_recebido', 'x'))).toBe('Confirmou o recebimento do Pedido de Construção de um pacote de decisão');
    expect(textoDoEvento(ev('token_criado', 'a1b2c3d4', { integracao: 'awave', prefixo: 'a1b2c3d4' }))).toBe('Criou um token de serviço para o Awave (prefixo a1b2c3d4)');
    expect(textoDoEvento(ev('token_criado', 'x', { integracao: 'construir' }))).toBe('Criou um token de serviço para o /construir');
    expect(textoDoEvento(ev('token_criado', 'x', { agente: 'risco', prefixo: 'a1b2c3d4' }))).toBe('Criou um token de serviço');
    expect(textoDoEvento(ev('token_revogado', 'x', { integracao: 'awave', prefixo: 'a1b2c3d4' }))).toBe('Revogou o token de serviço do Awave (prefixo a1b2c3d4)');
    expect(textoDoEvento(ev('token_revogado', 'x', { prefixo: 'a1b2c3d4' }))).toBe('Revogou o token de serviço de prefixo a1b2c3d4');
    expect(textoDoEvento(ev('token_revogado', 'x', {}))).toBe('Revogou um token de serviço');
  });
  it('nenhum texto novo mostra hash ou sha256', () => {
    const sha = 'f'.repeat(64);
    expect(textoDoEvento(ev('pedido_recebido', 'DEC-DEM-20261111-0021-v1', { sha256: sha }))).not.toContain(sha);
  });
});
```

E em `src/app/(painel)/demandas/[id]/detalhe.test.ts` (arquivo de hoje, só acrescentando um caso):
`rotuloResponsavel({ tipo: 'integracao', integracao: 'awave' })` é `'Awave'`.

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/modules/acesso/ramos-por-ator.test.ts src/components/rotulos-integracao.test.ts src/modules/historico/consultas-integracao.test.ts`.

- [ ] **Passo 3: implementar**

```ts
// src/modules/acesso/ator.ts — integração é o quarto tipo de ator (ADR-20), nunca agente.
import { INTEGRACOES, type Integracao } from '../../db/schema/acesso';
export { INTEGRACOES, type Integracao } from '../../db/schema/acesso';

export type AtorIntegracao = { tipo: 'integracao'; integracao: Integracao; prefixoToken: string };
export type Ator = AtorPessoa | AtorAgente | AtorSistema | AtorIntegracao;

export const ehIntegracao = (v: unknown): v is Integracao => typeof v === 'string' && (INTEGRACOES as readonly string[]).includes(v);

// O que a integração grava como solicitante (RF-04): sem dado pessoal. A tela tem a cópia NOME_INTEGRACAO (D-14).
export const NOME_DA_INTEGRACAO: Readonly<Record<Integracao, string>> = Object.freeze({ awave: 'Awave', construir: '/construir' });

// Fim de todo `switch` por tipo de ator (ADR-22): o tipo novo quebra o typecheck; em execução, falha fechada.
export function atorDesconhecido(nunca: never): never {
  void nunca;
  throw new Error('ator desconhecido');
}
```

```ts
// src/modules/acesso/matriz.ts — `Linha.integracoes` nasce vazia em toda ação (a T03 abre as cinco do RF-03).
type Linha = { readonly pessoa: 'qualquer' | 'cto' | null; readonly agentes: readonly Agente[]; readonly integracoes: readonly Integracao[] };
const linha = (pessoa: Linha['pessoa'], agentes: readonly Agente[], integracoes: readonly Integracao[] = []): Linha =>
  Object.freeze({ pessoa, agentes: Object.freeze([...agentes]), integracoes: Object.freeze([...integracoes]) });

function permitido(ator: Ator, acao: Acao): boolean {
  const l = linhaDa(acao);
  if (!l) return false;
  switch (ator.tipo) {
    case 'pessoa':
      return ehPapel(ator.papel) && pessoaPode(l, ator.papel);
    case 'agente':
      return (AGENTES as readonly string[]).includes(ator.agente) && l.agentes.includes(ator.agente);
    case 'integracao':
      return ehIntegracao(ator.integracao) && l.integracoes.includes(ator.integracao);
    case 'sistema':
      return false;
    default: {
      // Tipo fora da lista (montado à mão): negado, sem lançar.
      const nunca: never = ator;
      void nunca;
      return false;
    }
  }
}
```

```ts
// src/modules/historico/registrar.ts
export type AcaoEvento = /* as de hoje */ | 'demanda_confirmada' | 'pedido_entregue' | 'pedido_recebido';

function colunasDoAtor(ator: Ator): { atorTipo: Ator['tipo']; atorId: string; atorTokenPrefixo: string | null } {
  switch (ator.tipo) {
    case 'pessoa':
      return { atorTipo: 'pessoa', atorId: ator.usuarioId, atorTokenPrefixo: null };
    case 'agente':
      return { atorTipo: 'agente', atorId: ator.agente, atorTokenPrefixo: ator.prefixoToken };
    case 'integracao':
      return { atorTipo: 'integracao', atorId: ator.integracao, atorTokenPrefixo: ator.prefixoToken };
    case 'sistema':
      return { atorTipo: 'sistema', atorId: 'sistema', atorTokenPrefixo: null };
    default:
      return atorDesconhecido(ator);
  }
}
export const colunasDoAtorParaTeste = colunasDoAtor;
```

```ts
// src/modules/demandas/consultas.ts (trechos)
export type Responsavel = { tipo: 'pessoa'; nome: string | null } | { tipo: 'agente'; agente: Agente } | { tipo: 'integracao'; integracao: Integracao };
export type ResponsavelMinimo = { tipo: 'pessoa' } | { tipo: 'agente'; agente: Agente } | { tipo: 'integracao'; integracao: Integracao };

export function responsavelDe(autorTipo: string, autorId: string, nome: string | null): Responsavel {
  switch (autorTipo) {
    case 'pessoa':
      return { tipo: 'pessoa', nome };
    case 'agente':
      if (ehAgente(autorId)) return { tipo: 'agente', agente: autorId };
      break;
    case 'integracao':
      if (ehIntegracao(autorId)) return { tipo: 'integracao', integracao: autorId };
      break;
  }
  // Gravado só a partir de ator resolvido (C-11) e dos CHECK; fora da lista é linha corrompida, e vira 500.
  throw new Error('autoria desconhecida');
}

export function responsavelMinimo(r: Responsavel): ResponsavelMinimo {
  switch (r.tipo) {
    case 'pessoa':
      return { tipo: 'pessoa' };
    case 'agente':
      return { tipo: 'agente', agente: r.agente };
    case 'integracao':
      return { tipo: 'integracao', integracao: r.integracao };
  }
}

const semPermissao = () => new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);

export function vistaDaDemandaPara(ator: Ator, d: DemandaVista): DemandaVista | DemandaVistaMinima {
  switch (ator.tipo) {
    case 'pessoa':
      return d;
    case 'agente':
    case 'sistema': // D-05: o de hoje
      return vistaMinima(d); // o corpo de hoje, extraído sem mudança
    case 'integracao':
      throw semPermissao(); // D-01: a T06 troca pela vista de seis chaves
    default:
      return atorDesconhecido(ator);
  }
}

export async function listarDemandasPara(db: Db, filtro: FiltroDemandas, ator: Ator): Promise<PaginaDeDemandas> {
  switch (ator.tipo) {
    case 'pessoa':
    case 'agente':
    case 'sistema':
      break;
    case 'integracao':
      throw semPermissao(); // a matriz nega listar_demandas a toda integração
    default:
      return atorDesconhecido(ator);
  }
  const { linhas, ...resto } = await paginaDeDemandas(db, filtro);
  const original = ator.tipo === 'pessoa';
  return { itens: linhas.map((l) => resumoDe(l, original ? l.titulo : textoMinimo(l.titulo, nomesDoSolicitante(l.solicitanteNome)))), ...resto };
}
```

As três vistas de ESP, RSK e DEC seguem o mesmo `switch`: pessoa devolve a inteira; agente e sistema, a mínima de hoje;
integração lança `sem_permissao`. `autoriaDo` (servico.ts) vira `switch` em que integração e sistema lançam. Em
`historico/consultas.ts`, `listarHistorico` passa a ler `evento.atorTokenPrefixo` e:

```ts
export type AtorVisivel =
  | { tipo: 'pessoa'; nome: string | null; papel: Papel | null }
  | { tipo: 'agente'; agente: Agente }
  | { tipo: 'integracao'; integracao: Integracao | null; prefixo: string | null }
  | { tipo: 'sistema' };

const RE_PREFIXO = /^[A-Za-z0-9_-]{8}$/;

function atorVisivel(l: { atorTipo: string; atorId: string; prefixo: string | null; nome: string | null; papel: Papel | null }): AtorVisivel {
  switch (l.atorTipo) {
    case 'pessoa':
      return { tipo: 'pessoa', nome: l.nome, papel: l.papel };
    case 'agente':
      return ehAgente(l.atorId) ? { tipo: 'agente', agente: l.atorId } : { tipo: 'sistema' };
    case 'integracao':
      // IN-13 e D-19: só o prefixo da coluna, só se casar a regex; nunca token, hash nem sha256.
      return { tipo: 'integracao', integracao: ehIntegracao(l.atorId) ? l.atorId : null, prefixo: l.prefixo !== null && RE_PREFIXO.test(l.prefixo) ? l.prefixo : null };
    default:
      return { tipo: 'sistema' };
  }
}
```

Em `rotulos.ts`: `NOME_INTEGRACAO`; `rotuloAtor` em `switch` (integração: nome da lista ou "Integração"; com prefixo
válido e integração da lista, "<nome> (prefixo <p>)"); `textoDoEvento` com os casos `demanda_confirmada`,
`pedido_entregue`, `pedido_recebido` (id pela `RE_ID_DEC`) e as variantes de `token_criado` e `token_revogado` da 03,
5.6. `rotuloResponsavel` (detalhe.ts) em `switch`, integração → `NOME_INTEGRACAO[r.integracao]`.

- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; G4 vazio; a entrega lista cada ponto que o
  `typecheck` apontou e o tratamento (G8).

### T03. Token de integração, matriz fechada e matriz × rotas (IN-01, IN-03)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (autenticação e autorização) · **Cobre:** RF-01, RF-03, IN-01
(a, b, c, d), IN-03, IN-16 (piso), CA-01.1, CA-01.2, CA-03.1 a CA-03.6, D-02, D-17

**Arquivos:**
- Modificar: `src/modules/acesso/tokens-servico.ts`, `src/modules/acesso/matriz.ts`, `src/modules/acesso/matriz.test.ts`
  (G5), `test/requisicao.ts`, `test/matriz-rotas.test.ts`, `test/estatico/piso-de-assercoes.test.ts`
- Criar: `src/modules/acesso/matriz-integracoes.test.ts`, `src/modules/acesso/tokens-integracao.test.ts`,
  `src/modules/acesso/tokens-integracao-corrompido.test.ts`, `test/integracoes.ts`

**Interfaces produzidas:** `criarTokenDeIntegracao`, `validarTokenServico` (G7), as quatro ações novas, `atorDeIntegracao`,
`tokenDeIntegracao`.

- [ ] **Passo 1: escrever os testes que falham** — antes de mexer em qualquer arquivo do D-17, conte com Read as linhas
  com `expect(` de cada um e acrescente ao `PISO` de `test/estatico/piso-de-assercoes.test.ts`, com o comentário
  "a9fd9b8, contado na T03" (é a linha de base: esse teste nasce verde). Depois, os testes abaixo.

```ts
// src/modules/acesso/matriz-integracoes.test.ts — IN-01: a matriz é fechada por integração.
import { describe, expect, it } from 'vitest';
import { INTEGRACOES, type Ator, type Integracao } from './ator';
import { ACOES, MATRIZ, atoresProibidos, autorizar, type Acao } from './matriz';

const integracao = (i: Integracao): Ator => ({ tipo: 'integracao', integracao: i, prefixoToken: 'ficticio' });
const permite = (ator: Ator, acao: Acao) => {
  try {
    autorizar(ator, acao);
    return true;
  } catch {
    return false;
  }
};
const DO_CONSTRUIR = ['listar_pedidos_pendentes', 'entregar_pedido', 'confirmar_recebimento_pedido'] as const;

describe('IN-01', () => {
  it('(a) os pares (ação, integração) permitidos são exatamente os cinco do RF-03', () => {
    const pares = ACOES.flatMap((a) => MATRIZ[a].integracoes.map((i) => `${a}:${i}`)).sort();
    expect(pares).toEqual([
      'confirmar_recebimento_pedido:construir',
      'criar_demanda:awave',
      'entregar_pedido:construir',
      'ler_demanda:awave',
      'listar_pedidos_pendentes:construir',
    ]);
  });
  it('autorizar segue os pares, para cada integração em cada ação', () => {
    for (const a of ACOES) for (const i of INTEGRACOES) expect(permite(integracao(i), a), `${i} em ${a}`).toBe(MATRIZ[a].integracoes.includes(i));
  });
  it('(b) atoresProibidos: awave fora de criar e ler demanda, construir fora das três dele', () => {
    for (const a of ACOES) {
      const proibidas = atoresProibidos(a).flatMap((x) => (x.tipo === 'integracao' ? [x.integracao] : []));
      expect(proibidas.includes('awave'), `awave em ${a}`).toBe(a !== 'criar_demanda' && a !== 'ler_demanda');
      expect(proibidas.includes('construir'), `construir em ${a}`).toBe(!(DO_CONSTRUIR as readonly string[]).includes(a));
    }
  });
  it('as três do /construir não têm pessoa nem agente; confirmar_demanda é só de pessoa', () => {
    for (const a of DO_CONSTRUIR) expect(MATRIZ[a]).toMatchObject({ pessoa: null, agentes: [] });
    expect(MATRIZ.confirmar_demanda).toMatchObject({ pessoa: 'qualquer', agentes: [], integracoes: [] });
  });
  it('(d) integração fora da lista é negada em toda ação', () => {
    for (const a of ACOES) expect(permite({ tipo: 'integracao', integracao: 'jarvis' as Integracao, prefixoToken: 'ficticio' }, a), a).toBe(false);
  });
  it('a lista de cada linha é congelada', () => {
    for (const a of ACOES) expect(Object.isFrozen(MATRIZ[a].integracoes), a).toBe(true);
  });
});
```

```ts
// src/modules/acesso/tokens-integracao.test.ts — IN-03, CA-01.1, CA-01.2.
// Banco real: criarTokenDeIntegracao para 'awave' e 'construir' → validarTokenServico devolve
// { tipo: 'integracao', integracao, prefixoToken: prefixo }; o token tem o formato /^wsod_[A-Za-z0-9_-]{43}$/ e o banco
// guarda só o SHA-256 (select hash, prefixo: o texto depois do prefixo não aparece em nenhuma coluna); token de agente
// continua AtorAgente; token revogado → null.
//
// src/modules/acesso/tokens-integracao-corrompido.test.ts — IN-03: linha que não casa com nenhuma lista → null (401).
// Banco próprio deste arquivo: o migrator desliga token_servico_dono_check e token_servico_agente_check, insere o hash
// de três tokens gerados no teste ('wsod_' + randomBytes(32).toString('base64url')): os dois donos nulos; agente
// 'admin'; agente e integração preenchidos. validarTokenServico devolve null para os três.
```

```ts
// test/integracoes.ts — ajudantes dos testes das integrações (tokens só gerados aqui, nunca escritos em arquivo).
import { comTransacao } from '../src/db/transacao';
import type { Deps } from '../src/lib/deps';
import type { AtorIntegracao, Integracao } from '../src/modules/acesso/ator';
import { criarTokenDeIntegracao } from '../src/modules/acesso/tokens-servico';

export const atorDeIntegracao = (integracao: Integracao, prefixoToken = 'ficticio'): AtorIntegracao => ({ tipo: 'integracao', integracao, prefixoToken });

export async function tokenDeIntegracao(deps: Deps, integracao: Integracao): Promise<string> {
  return (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, integracao, deps.relogio))).token;
}
```

Em `test/requisicao.ts`: `AtorDeTeste` ganha `{ tipo: 'integracao'; integracao: Integracao }`; `Credenciais` ganha
`tokensIntegracao: Record<Integracao, string>` (um por integração, em `prepararCredenciais`); `chamarComo` em `switch`
(integração → `bearer: cred.tokensIntegracao[...]`). Em `test/matriz-rotas.test.ts`: `rotulo` com integração;
`atoresPermitidos` inclui `INTEGRACOES`; e, depois do laço das rotas:

```ts
describe('integrações recusadas não gravam nada (CA-03.1, CA-03.2)', () => {
  it('nenhum evento de integração e nenhuma demanda depois de todas as rotas', async () => {
    const { rows } = await b.poolMigrator.query(
      `select (select count(*) from evento where ator_tipo = 'integracao')::int as eventos, (select count(*) from demanda)::int as demandas`,
    );
    expect(rows[0]).toEqual({ eventos: 0, demandas: 0 });
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/modules/acesso test/matriz-rotas.test.ts`.

- [ ] **Passo 3: implementar**

```ts
// src/modules/acesso/tokens-servico.ts (trechos) — D-02.
async function gravarToken(t: Transacao, dono: { agente: Agente; integracao: null } | { agente: null; integracao: Integracao }, relogio: Relogio) {
  const token = PREFIXO_FIXO + randomBytes(32).toString('base64url');
  const prefixo = token.slice(PREFIXO_FIXO.length, PREFIXO_FIXO.length + 8);
  await t.tx.insert(tokenServico).values({ ...dono, hash: hashDoToken(token), prefixo, criadoEm: relogio.agora() });
  return { token, prefixo };
}
export const criarTokenServico = (t: Transacao, agente: Agente, relogio: Relogio) => gravarToken(t, { agente, integracao: null }, relogio);
export const criarTokenDeIntegracao = (t: Transacao, integracao: Integracao, relogio: Relogio) => gravarToken(t, { agente: null, integracao }, relogio);

// IN-03: só lista. Qualquer outra linha (dois nulos, os dois, valor fora da lista) é token inválido (401).
export async function validarTokenServico(db: Db, token: string): Promise<AtorAgente | AtorIntegracao | null> {
  if (typeof token !== 'string' || !RE_TOKEN.test(token)) return null;
  const [l] = await db
    .select({ agente: tokenServico.agente, integracao: tokenServico.integracao, prefixo: tokenServico.prefixo })
    .from(tokenServico)
    .where(and(eq(tokenServico.hash, hashDoToken(token)), isNull(tokenServico.revogadoEm)));
  if (!l) return null;
  if (l.integracao === null && l.agente !== null && (AGENTES as readonly string[]).includes(l.agente)) return { tipo: 'agente', agente: l.agente, prefixoToken: l.prefixo };
  if (l.agente === null && ehIntegracao(l.integracao)) return { tipo: 'integracao', integracao: l.integracao, prefixoToken: l.prefixo };
  return null;
}
```

```ts
// src/modules/acesso/matriz.ts (trechos) — as 23 ações.
export const ACOES = [/* as 19 de hoje */ 'confirmar_demanda', 'listar_pedidos_pendentes', 'entregar_pedido', 'confirmar_recebimento_pedido'] as const;
const SO_CONSTRUIR = linha(null, [], ['construir']);
export const MATRIZ = Object.freeze({
  criar_demanda: linha('qualquer', ['orquestrador'], ['awave']),
  listar_demandas: LEITURA,
  ler_demanda: linha('qualquer', AGENTES, ['awave']), // não usa LEITURA: LEITURA nunca tem integração
  // ... as de hoje ...
  confirmar_demanda: QUALQUER_PESSOA_SEM_AGENTE,
  listar_pedidos_pendentes: SO_CONSTRUIR,
  entregar_pedido: SO_CONSTRUIR,
  confirmar_recebimento_pedido: SO_CONSTRUIR,
});

export function atoresProibidos(acao: Acao) {
  const l = linhaDa(acao);
  const agentes = AGENTES.filter((a) => !l || !l.agentes.includes(a)).map((agente) => ({ tipo: 'agente' as const, agente }));
  const papeis = PAPEIS.filter((papel) => !l || !pessoaPode(l, papel)).map((papel) => ({ tipo: 'pessoa' as const, papel }));
  const integracoes = INTEGRACOES.filter((i) => !l || !l.integracoes.includes(i)).map((integracao) => ({ tipo: 'integracao' as const, integracao }));
  return [...agentes, ...papeis, ...integracoes];
}
```

Depois, as mudanças de `matriz.test.ts` da G5, e só elas.

- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; G4 vazio; o piso não caiu em nenhum arquivo.

### T04. Limite por integração e tempo limite das transações de integração (IN-09, IN-14)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (limite de taxa de credencial externa) · **Cobre:** RF-08 (regra),
IN-09, IN-14 (tempo limite), ADR-24, ADR-28, D-03

**Arquivos:**
- Modificar: `src/modules/limites.ts`, `test/integracoes.ts` (`inserirDemandaDeIntegracao`)
- Criar: `src/modules/integracoes/tempo-limite.ts`, `src/modules/integracoes/tempo-limite.test.ts`,
  `src/modules/limites-integracao.test.ts`

**Interfaces produzidas:** `MENSAGEM_LIMITE_AWAVE`, `limiteDe`, `Orcamento`, `MENSAGEM_INDISPONIVEL`, `limitarTempo`,
`traduzirTempoEsgotado`, `executarComOrcamento`, `inserirDemandaDeIntegracao`.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/limites-integracao.test.ts — IN-09: integração sempre conta; sem limite definido, lança.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comTransacao } from '../db/transacao';
import { relogioFixo } from '../lib/relogio';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { atorDeIntegracao, inserirDemandaDeIntegracao } from '../../test/integracoes';
import { conferirLimite, limiteDe, LIMITE_POR_HORA, MENSAGEM_LIMITE, MENSAGEM_LIMITE_AWAVE } from './limites';

let b: BancoDeTeste;
const relogio = relogioFixo('2026-11-11T12:00:00Z');
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});
const conferir = (ator: Parameters<typeof conferirLimite>[1], tipo: 'demanda' | 'artefato') =>
  comTransacao(b.poolApp, ({ tx }) => conferirLimite(tx, ator, tipo, relogio));

describe('IN-09', () => {
  it('awave: 10 demandas na janela; a mensagem cita o 10 e o Awave', () => {
    expect(limiteDe(atorDeIntegracao('awave'), 'demanda')).toEqual({ maximo: 10, mensagem: MENSAGEM_LIMITE_AWAVE });
    expect(MENSAGEM_LIMITE_AWAVE).toBe('Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde.');
  });
  it('pessoa e agente seguem com 30 e 60', () => {
    const pessoa = { tipo: 'pessoa', usuarioId: 'u1', nome: 'Pessoa Ficticia', papel: 'cto' } as const;
    expect(limiteDe(pessoa, 'demanda')).toEqual({ maximo: LIMITE_POR_HORA.demanda, mensagem: MENSAGEM_LIMITE.demanda });
    expect(limiteDe(pessoa, 'artefato')).toEqual({ maximo: LIMITE_POR_HORA.artefato, mensagem: MENSAGEM_LIMITE.artefato });
  });
  it('integração sem limite definido lança (nunca "sem limite"); só o sistema sai sem contar', async () => {
    await expect(conferir(atorDeIntegracao('construir'), 'demanda')).rejects.toThrow(/sem limite/);
    await expect(conferir(atorDeIntegracao('awave'), 'artefato')).rejects.toThrow(/sem limite/);
    await expect(conferir({ tipo: 'sistema' }, 'demanda')).resolves.toBeUndefined();
  });
  it('a 11ª do awave na janela é 429 com a mensagem do Awave; fora da janela não conta', async () => {
    for (let n = 1; n <= 10; n++)
      await inserirDemandaDeIntegracao(b, { id: `DEM-20261111-${String(n).padStart(4, '0')}`, criadaEm: new Date('2026-11-11T11:30:00Z') });
    await inserirDemandaDeIntegracao(b, { id: 'DEM-20261111-0011', criadaEm: new Date('2026-11-11T10:59:00Z') });
    await expect(conferir(atorDeIntegracao('awave'), 'demanda')).rejects.toEqual(
      expect.objectContaining({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE }),
    );
  });
});
```

```ts
// src/modules/integracoes/tempo-limite.test.ts — ADR-28 e IN-14.
// 1. Com ator de integração, dentro de executarComOrcamento: current_setting('lock_timeout') = '2s' e
//    current_setting('statement_timeout') = '5s' ('10s' no orçamento 'entrega'); com pessoa e agente, '0' e '0'.
// 2. Com a trava consultiva 'limite:demanda:integracao:awave' segura por outra conexão (poolMigrator,
//    pg_advisory_lock(hashtextextended($1, 0))), executarComOrcamento(awave, 'padrao') que pede a mesma trava por
//    pg_advisory_xact_lock rejeita, em ~2 s, com ErroDominio('indisponivel', MENSAGEM_INDISPONIVEL); mapearErro dá
//    503 e o corpo { erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL }, sem texto do Postgres; a transação desfez
//    um INSERT feito antes da trava (insira um evento de integração e confira que não ficou).
// 3. traduzirTempoEsgotado({ code: '57014' }) e ({ code: '55P03' }) viram ErroDominio indisponivel; outro erro e
//    ErroDominio passam iguais.
// 4. Com `t` de quem chama, executarComOrcamento não aplica SET LOCAL (current_setting continua '0').
// 5. Estático: o arquivo não tem `sql.raw` e os dois SET LOCAL são literais (o teste de sql-raw de hoje já cobre o
//    sql.raw; aqui, `expect(fonte).toMatch(/set local lock_timeout = '2s'/)`).
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/modules/limites-integracao.test.ts src/modules/integracoes`.

- [ ] **Passo 3: implementar**

```ts
// src/modules/limites.ts (trechos) — IN-09.
export const MENSAGEM_LIMITE_AWAVE = 'Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde.';
type Limite = { maximo: number; mensagem: string };
// Mudar o número é decisão de Fabiano, por pedido (ADR-24).
const LIMITE_DA_INTEGRACAO: Readonly<Record<Integracao, Partial<Record<TipoLimite, Limite>>>> = Object.freeze({
  awave: { demanda: { maximo: 10, mensagem: MENSAGEM_LIMITE_AWAVE } },
  construir: {},
});

export function limiteDe(ator: Ator, tipo: TipoLimite): Limite | null {
  switch (ator.tipo) {
    case 'pessoa':
    case 'agente':
      return { maximo: LIMITE_POR_HORA[tipo], mensagem: MENSAGEM_LIMITE[tipo] };
    case 'integracao': {
      const l = LIMITE_DA_INTEGRACAO[ator.integracao]?.[tipo];
      if (!l) throw new Error('limite: integração sem limite definido para este tipo');
      return l;
    }
    case 'sistema':
      return null;
    default:
      return atorDesconhecido(ator);
  }
}

function autoriaDoLimite(ator: Exclude<Ator, AtorSistema>): { autorTipo: AutorDemanda; autorId: string } {
  switch (ator.tipo) {
    case 'pessoa':
      return { autorTipo: 'pessoa', autorId: ator.usuarioId };
    case 'agente':
      return { autorTipo: 'agente', autorId: ator.agente };
    case 'integracao':
      return { autorTipo: 'integracao', autorId: ator.integracao };
    default:
      return atorDesconhecido(ator);
  }
}

export async function conferirLimite(tx: Db, ator: Ator, tipo: TipoLimite, relogio: Relogio): Promise<void> {
  const limite = limiteDe(ator, tipo);
  if (limite === null || ator.tipo === 'sistema') return;
  const a = autoriaDoLimite(ator);
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`limite:${tipo}:${a.autorTipo}:${a.autorId}`}, 0))`);
  // ... contagem de hoje ...
  if (total >= limite.maximo) throw new ErroDominio('limite_excedido', limite.mensagem);
}
```

```ts
// src/modules/integracoes/tempo-limite.ts — ADR-28 e IN-14: o servidor desiste antes do cliente (Awave 10 s,
// /construir 15 s) e nada fica gravado. Só para integração e só na transação que o serviço abre.
import type pg from 'pg';
import { sql } from 'drizzle-orm';
import type { Db } from '../../db';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { reduzirErro } from '../../lib/reduzir-erro';
import { atorDesconhecido, type Ator } from '../acesso/ator';

export type Orcamento = 'padrao' | 'entrega';
// D-03.
export const MENSAGEM_INDISPONIVEL = 'O Orquestrador não concluiu o pedido a tempo e nada foi gravado. Tente de novo em alguns minutos.';
// 57014: statement_timeout; 55P03: lock_timeout.
const TEMPO_ESGOTADO: ReadonlySet<string> = new Set(['57014', '55P03']);

export async function limitarTempo(tx: Db, ator: Ator, orcamento: Orcamento): Promise<void> {
  switch (ator.tipo) {
    case 'integracao':
      await tx.execute(sql`set local lock_timeout = '2s'`);
      if (orcamento === 'entrega') await tx.execute(sql`set local statement_timeout = '10s'`);
      else await tx.execute(sql`set local statement_timeout = '5s'`);
      return;
    case 'pessoa':
    case 'agente':
    case 'sistema':
      return;
    default:
      return atorDesconhecido(ator);
  }
}

export function traduzirTempoEsgotado(e: unknown): unknown {
  if (e instanceof ErroDominio) return e;
  const codigo = reduzirErro(e).code;
  return typeof codigo === 'string' && TEMPO_ESGOTADO.has(codigo) ? new ErroDominio('indisponivel', MENSAGEM_INDISPONIVEL) : e;
}

export async function executarComOrcamento<T>(pool: pg.Pool, ator: Ator, orcamento: Orcamento, t: Transacao | undefined, corpo: (t: Transacao) => Promise<T>): Promise<T> {
  if (t) return corpo(t);
  try {
    return await comTransacao(pool, async (tr) => {
      await limitarTempo(tr.tx, ator, orcamento);
      return corpo(tr);
    });
  } catch (e) {
    throw traduzirTempoEsgotado(e);
  }
}
```

Confira o retorno de `reduzirErro` (`src/lib/reduzir-erro.ts`) e use o campo do código como em `gerar-id.ts`.

- [ ] **Passo 4: verificar** — `pnpm test` (os testes de C-36 de hoje, em `limites.test.ts`, verdes sem mudança),
  `pnpm lint`, `pnpm typecheck`; G4 vazio.

---

## Fase 2 — Awave: ler e criar

### T05. Leitura pelo Awave só da própria demanda, em seis chaves (IN-08)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (autorização por objeto, BOLA) · **Cobre:** RF-07, IN-08, ADR-23,
CA-01.1, CA-07.1 a CA-07.4 (07.4 junto da T06), D-16

**Arquivos:**
- Modificar: `src/modules/demandas/consultas.ts`, `src/app/api/demandas/[id]/route.ts`
- Criar: `src/app/api/demandas/leitura-awave.test.ts`

**Interfaces consumidas:** `executarComOrcamento` (T04), `tokenDeIntegracao`, `inserirDemandaDeIntegracao`.
**Produzidas:** `DemandaVistaDaIntegracao`, `vistaDaIntegracao`, `obterDemandaDaIntegracao`, `lerDemandaPara`.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/app/api/demandas/leitura-awave.test.ts — RF-07 e IN-08: o Awave lê só o que criou, em seis chaves, sem oráculo.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemanda from './[id]/route';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { alterarDemanda, criarDemanda } from '../../../modules/demandas/servico';
import { criarDemandaSchema } from '../../../modules/demandas/schemas';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { inserirDemandaDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import { chamarRota } from '../../../../test/requisicao';

let b: BancoDeTeste;
let deps: Deps;
let token: string;
const pessoa = { tipo: 'pessoa', usuarioId: 'p1', nome: 'Pessoa Ficticia', papel: 'cto' } as const;
const SEIS = ['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo'];
const ID_AWAVE = 'DEM-20261022-0901';
let idPessoa: string;
let idAgente: string;

const ler = (id: string) => chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, bearer: token, semOrigin: true });

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'awave');
  await inserirDemandaDeIntegracao(b, {
    id: ID_AWAVE,
    titulo: 'Relatório semanal fictício',
    criadaEm: deps.relogio.agora(),
    contexto: 'SENTINELA-CONTEXTO-9d1e',
    descricaoProblema: 'SENTINELA-DESCRICAO-9d1e',
  });
  const entrada = criarDemandaSchema.parse({ titulo: 'Demanda de pessoa (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' });
  idPessoa = (await criarDemanda(deps, pessoa, entrada)).id;
  idAgente = (await criarDemanda(deps, { tipo: 'agente', agente: 'orquestrador', prefixoToken: null }, entrada)).id;
});
afterAll(async () => {
  definirDepsParaTeste(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('RF-07 e IN-08', () => {
  it('CA-07.1: 200 com exatamente as seis chaves', async () => {
    const r = await ler(ID_AWAVE);
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(Object.keys(corpo).sort()).toEqual(SEIS);
    expect(corpo).toMatchObject({ id: ID_AWAVE, titulo: 'Relatório semanal fictício', tipo: 'melhoria', status: 'nova' });
  });
  it('CA-07.2: demanda de pessoa e de agente dão 404 igual, byte a byte, ao de um id que não existe', async () => {
    const inexistente = await ler('DEM-20261022-9999');
    const esperado = { status: inexistente.status, corpo: await inexistente.text(), tipo: inexistente.headers.get('content-type') };
    expect(esperado.status).toBe(404);
    for (const id of [idPessoa, idAgente]) {
      const r = await ler(id);
      expect({ status: r.status, corpo: await r.text(), tipo: r.headers.get('content-type') }, id).toEqual(esperado);
    }
  });
  it('CA-07.3: vê título e status atuais, e nenhum texto livre, nome ou versão', async () => {
    await alterarDemanda(deps, pessoa, ID_AWAVE, { titulo: 'Relatório semanal revisado (fictício)', status: 'em_analise', solicitanteNome: 'SENTINELA-NOME-9d1e' });
    const texto = await (await ler(ID_AWAVE)).text();
    expect(JSON.parse(texto)).toMatchObject({ titulo: 'Relatório semanal revisado (fictício)', status: 'em_analise' });
    expect(texto).not.toMatch(/SENTINELA/);
  });
  it('M-1: o título sai minimizado pelo solicitante atual', async () => {
    await alterarDemanda(deps, pessoa, ID_AWAVE, { solicitanteNome: 'Maria Ficticia', titulo: 'Relatório para Maria Ficticia (fictício)' });
    expect((await (await ler(ID_AWAVE)).json()).titulo).not.toContain('Maria Ficticia');
  });
});
```

Acrescente o caso da ESP: uma pessoa grava uma ESP na demanda do Awave com `descricaoObjetiva` sentinela, e o corpo
lido pelo Awave não a contém.

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/app/api/demandas/leitura-awave.test.ts` (hoje, 403 da vista).

- [ ] **Passo 3: implementar**

```ts
// src/modules/demandas/consultas.ts (trechos) — ADR-23 e D-16.
export type DemandaVistaDaIntegracao = { id: string; titulo: string; tipo: Tipo; status: Status; criadaEm: Date; atualizadaEm: Date };

// Chave a chave: campo novo da demanda não sai para a integração sem entrar aqui (IN-08). Título pelo M-1.
export const vistaDaIntegracao = (
  d: Pick<DemandaVista, 'id' | 'titulo' | 'tipo' | 'status' | 'solicitanteNome' | 'criadaEm' | 'atualizadaEm'>,
): DemandaVistaDaIntegracao => ({
  id: d.id,
  titulo: textoMinimo(d.titulo, nomesDoSolicitante(d.solicitanteNome)),
  tipo: d.tipo,
  status: d.status,
  criadaEm: d.criadaEm,
  atualizadaEm: d.atualizadaEm,
});

// A autoria no mesmo WHERE do id: demanda de outro autor é o mesmo "não encontrado" de id inexistente.
export async function obterDemandaDaIntegracao(db: Db, ator: AtorIntegracao, id: string): Promise<DemandaVistaDaIntegracao> {
  const [l] = await db
    .select({ id: demanda.id, titulo: demanda.titulo, tipo: demanda.tipo, status: demanda.status, solicitanteNome: demanda.solicitanteNome, criadaEm: demanda.criadaEm, atualizadaEm: demanda.atualizadaEm })
    .from(demanda)
    .where(and(eq(demanda.id, id), eq(demanda.autorTipo, 'integracao'), eq(demanda.autorId, ator.integracao)));
  if (!l) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  return vistaDaIntegracao(l);
}

// A rota decide pelo tipo do ator antes de qualquer leitura; integração nunca passa por obterDemanda.
export async function lerDemandaPara(deps: { db: Db; pool: pg.Pool }, ator: Ator, id: string) {
  switch (ator.tipo) {
    case 'integracao':
      return executarComOrcamento(deps.pool, ator, 'padrao', undefined, ({ tx }) => obterDemandaDaIntegracao(tx, ator, id));
    case 'pessoa':
    case 'agente':
    case 'sistema':
      return vistaDaDemandaPara(ator, await obterDemanda(deps.db, id));
    default:
      return atorDesconhecido(ator);
  }
}
```

```ts
// src/app/api/demandas/[id]/route.ts — o GET passa a lerDemandaPara; o PATCH não muda.
export const GET = rota({ acao: 'ler_demanda', rota: '/api/demandas/[id]', params: paramId.demanda }, async ({ deps, ator, params }) => ({
  json: await lerDemandaPara(deps, ator, params.id),
}));
```

- [ ] **Passo 4: verificar** — `pnpm test` (inclui `vistas-para-agente.test.ts` e `demandas.test.ts` sem mudança),
  `pnpm lint`, `pnpm typecheck`; G4 vazio.

### T06. O Awave cria demanda: autoria, campos, sem disparo, limite e contrato (IN-05)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (credencial externa grava no banco; texto de fora) · **Cobre:**
RF-04, RF-05 (criação), RF-08, RF-09 (Awave), RF-11 (contas), RNF-08 (contrato do Awave), IN-05, IN-06 (criação),
IN-09 (pela rota), IN-12 (`demanda_criada`), IN-14 (503), IN-15 (CA-09.x), CA-01.3, CA-01.4, CA-04.1 a CA-04.6,
CA-05.1, CA-05.2, CA-07.4, CA-08.1 a CA-08.4, CA-09.1, CA-09.2, CA-09.4, CA-10.6, CA-11.1 (API), CA-11.3

**Arquivos:**
- Modificar: `src/modules/demandas/servico.ts`, `src/modules/demandas/consultas.ts` (`vistaDaDemandaPara`, caso
  integração), `src/modules/acesso/ramos-por-ator.test.ts` (G5), `test/integracoes.ts` (`CORPO_DO_AWAVE`)
- Criar: `src/app/api/demandas/criacao-awave.test.ts`, `src/app/api/demandas/contrato-awave.test.ts`

**Interfaces consumidas:** T02 a T05. **Produzidas:** `autoriaDaDemanda`, `CORPO_DO_AWAVE`.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/app/api/demandas/contrato-awave.test.ts — RNF-08: a requisição exata da tool do Awave (0ab8ced) não quebra.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemandas from './route';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, tokenDeIntegracao } from '../../../../test/integracoes';
import { URL_BASE } from '../../../../test/requisicao';

let b: BancoDeTeste;
let deps: Deps;
let token: string;

// Como a tool manda: Bearer, JSON, accept JSON, sem Origin e sem cookie.
function doAwave(op: { base?: string; cookie?: string; bearer?: string } = {}): Request {
  const h: Record<string, string> = { authorization: `Bearer ${op.bearer ?? token}`, 'content-type': 'application/json', accept: 'application/json' };
  if (op.cookie) h.cookie = op.cookie;
  return new Request(`${op.base ?? URL_BASE}/api/demandas`, { method: 'POST', headers: h, body: JSON.stringify(CORPO_DO_AWAVE) });
}
const enviar = (req: Request) => rotaDemandas.POST(req, { params: Promise.resolve({}) });

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'awave');
});
afterAll(async () => {
  definirDepsParaTeste(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('contrato do Awave', () => {
  it('CA-04.1, CA-09.1 e CA-07.4: 201 sem Origin, id DEM, status nova, as seis chaves', async () => {
    const r = await enviar(doAwave());
    expect(r.status).toBe(201);
    const corpo = await r.json();
    expect(corpo.id).toMatch(/^DEM-\d{8}-\d{4}$/);
    expect(corpo.status).toBe('nova');
    expect(Object.keys(corpo).sort()).toEqual(['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
  });
  it('CA-09.2: o mesmo pelo endereço interno http://orquestrador_app', async () => {
    expect((await enviar(doAwave({ base: 'http://orquestrador_app' }))).status).toBe(201);
  });
  it('CA-09.4: com um cookie qualquer e sem Origin, continua 403 (C-15)', async () => {
    expect((await enviar(doAwave({ cookie: 'qualquer=1' }))).status).toBe(403);
  });
  it('CA-01.3: token que não existe → 401 com a mensagem de hoje', async () => {
    const r = await enviar(doAwave({ bearer: `wsod_${'A'.repeat(43)}` }));
    expect(r.status).toBe(401);
    expect((await r.json()).mensagem).toBe(MENSAGENS_ACESSO.token_invalido);
  });
  it('erros no formato { erro, mensagem }, nunca 3xx', async () => {
    const r = await rotaDemandas.POST(
      new Request(`${URL_BASE}/api/demandas`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{"tipo":"outro"}' }),
      { params: Promise.resolve({}) },
    );
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual(expect.objectContaining({ erro: 'entrada_invalida', mensagem: expect.any(String) }));
  });
});
```

`criacao-awave.test.ts`, no mesmo molde (banco próprio, `relogioFixo` com `avancar`, token `awave` real), com um `it`
por critério:

- CA-04.2, CA-04.3, CA-04.4 e IN-05: corpo com `solicitanteNome: 'Maria Ficticia'`, `autorTipo: 'pessoa'`,
  `autorId: 'x'`, `rascunhoAgente: false`, `anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/x' }]`,
  `urgencia: 'alta'`, `justificativaUrgencia`, `impactoPercebido` e `linhaServicoProvavel` com sentinela → 201; no
  banco, `autor_tipo = 'integracao'`, `autor_id = 'awave'`, `rascunho_agente = true`, `solicitante_nome = 'Awave'`,
  `anexos = []`, `duvidas_entrada = []`, os quatro campos nulos, e nenhum sentinela na linha (`row_to_json`).
- CA-04.5 e IN-12: o evento `demanda_criada` tem `ator_tipo = 'integracao'`, `ator_id = 'awave'`, o prefixo do token e
  `depois = { status: 'nova', tipo: 'melhoria' }`; nenhum campo do evento contém o título, a descrição, o contexto
  nem o texto do token depois do prefixo.
- CA-04.6: `tipo` fora da lista e corpo sem `titulo` → 400; `select last_value, is_called from demanda_seq` não muda.
- CA-05.1: com o `insumo_tecnico` ligado e com preço e teto livres (prepare como em
  `src/modules/agentes/gatilhos.test.ts`), o POST do Awave não cria linha em `execucao_agente` com a chave
  `demanda:<id>` nem job novo no pg-boss; CA-05.2: a mesma criação por pessoa cria os dois (regressão).
- CA-08.1 e CA-08.2: 10 POSTs → 201; o 11º → 429 com `MENSAGEM_LIMITE_AWAVE` e `demanda_seq` sem mudar; `avancar` o
  relógio até a primeira sair da janela → 201.
- CA-08.3: com 10 do Awave na janela, uma pessoa cria 30 → todas 201, e a 31ª → 429 com `MENSAGEM_LIMITE.demanda`.
- CA-08.4: com a janela vazia (banco novo neste `describe`), 11 POSTs em `Promise.all` → exatamente dez 201 e um 429.
- IN-14: com a trava `limite:demanda:integracao:awave` segura por outra conexão, o POST responde 503 com
  `MENSAGEM_INDISPONIVEL`, e não há demanda nem evento novos.
- CA-01.3 e CA-01.4: revogar o token do Awave (`revogarTokenServico`) → o POST seguinte é 401 com a mensagem de hoje e
  nada é gravado; um token de agente, o token `construir` e a sessão de uma pessoa continuam aceitos nas ações deles.
- CA-10.6: um agente com token lê a demanda do Awave → 200 com a vista mínima e `responsavel = { tipo: 'integracao',
  integracao: 'awave' }`.
- CA-11.1 (API) e CA-11.3: depois de dez demandas do Awave, `GET /api/agentes` por pessoa lista só os quatro agentes, e
  `uso_ia` e a situação do teto não mudaram.

E em `ramos-por-ator.test.ts` (G5): "a vista da demanda para integração lança" passa a "a vista da demanda para
integração tem as seis chaves".

```ts
// test/integracoes.ts — o corpo da tool do Awave (01, seção 4), com texto fictício.
export const CORPO_DO_AWAVE = Object.freeze({
  titulo: 'Relatório semanal fictício',
  tipo: 'melhoria',
  solicitanteNome: 'Awave',
  solicitantePapel: 'outro',
  descricaoProblema: 'Texto fictício.',
  contexto: 'Demanda aberta pelo agente "jarvis" do Awave, com aprovação do dono em /aprovacoes.',
});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/app/api/demandas/contrato-awave.test.ts src/app/api/demandas/criacao-awave.test.ts`.

- [ ] **Passo 3: implementar**

```ts
// src/modules/demandas/servico.ts (trechos) — ADR-24, IN-05 e IN-06.
export function autoriaDaDemanda(ator: Ator): { autorTipo: AutorDemanda; autorId: string } {
  switch (ator.tipo) {
    case 'pessoa':
    case 'agente':
      return autoriaDo(ator);
    case 'integracao':
      // Só o awave cria demanda (RF-03 e CHECK demanda_autor_integracao_check).
      if (ator.integracao === 'awave') return { autorTipo: 'integracao', autorId: 'awave' };
      throw semPermissao();
    case 'sistema':
      throw semPermissao();
    default:
      return atorDesconhecido(ator);
  }
}

// IN-05: da integração, só cinco campos do corpo; o resto é fixo, seja o que for enviado (sem 400: o contrato não muda).
function camposDaEntrada(ator: Ator, e: CriarDemanda) {
  switch (ator.tipo) {
    case 'integracao':
      return {
        titulo: e.titulo, tipo: e.tipo, solicitanteNome: NOME_DA_INTEGRACAO[ator.integracao], solicitantePapel: e.solicitantePapel ?? null,
        linhaServicoProvavel: null, urgencia: null, justificativaUrgencia: null,
        contexto: e.contexto ?? null, descricaoProblema: e.descricaoProblema ?? null, impactoPercebido: null, anexos: [],
      };
    case 'pessoa':
    case 'agente':
    case 'sistema':
      return { /* os campos de hoje, campo a campo */ };
    default:
      return atorDesconhecido(ator);
  }
}

// IN-06 e D1: só pessoa e agente disparam o insumo técnico ao criar (lista de permissão).
async function dispararAoCriar(tr: Transacao, deps: DepsComFila, ator: Ator, id: string): Promise<void> {
  switch (ator.tipo) {
    case 'pessoa':
    case 'agente':
      await dispararSeLigado(tr, deps, 'insumo_tecnico', `demanda:${id}`, id);
      return;
    case 'integracao':
      return; // a confirmação por pessoa dispara (T08)
    case 'sistema':
      throw semPermissao();
    default:
      return atorDesconhecido(ator);
  }
}
```

`criarDemanda` passa a usar `autoriaDaDemanda`, `camposDaEntrada` (com `duvidasEntrada: []` para integração),
`rascunhoAgente: autoria.autorTipo !== 'pessoa'`, `dispararAoCriar`, e abre a transação por
`executarComOrcamento(deps.pool, ator, 'padrao', t, ...)`. Em `vistaDaDemandaPara`, o caso `integracao` devolve
`vistaDaIntegracao(d)`. A rota `POST /api/demandas` não muda.

- [ ] **Passo 4: verificar** — `pnpm test` (C-11 em `servico.test.ts` e C-36 em `limites.test.ts` sem mudança),
  `pnpm lint`, `pnpm typecheck`; G4 vazio.

### T07. Origem da demanda: leitura, listagem e filtro (RF-10, servidor)

**Engenheiro:** `engenheiro-dados-bd` · **Risco:** baixo · **Cobre:** RF-10 (servidor), CA-10.2 a CA-10.5 (API),
C-17 (enum do filtro)

**Arquivos:**
- Modificar: `src/modules/demandas/schemas.ts`, `src/modules/demandas/consultas.ts`,
  `src/modules/demandas/resumo-da-fila.ts`, `src/app/api/vistas-para-agente.test.ts` (G5)
- Criar: `src/modules/demandas/origem.test.ts`

**Interfaces produzidas:** `ORIGENS_DA_DEMANDA`, `OrigemDaDemanda`, `origemDaAutoria`, `origemDoResponsavel`,
`DemandaResumo.origem`, filtro `origem` em `filtroDemandasSchema`, `paginaDeDemandas` e `contarDemandasPorStatus`.

- [ ] **Passo 1: escrever os testes que falham** — `origem.test.ts`, banco real, com uma demanda de cada origem (pessoa
  por `criarDemanda`, agente `orquestrador` por `criarDemanda`, Awave por `criarDemanda` com `atorDeIntegracao('awave')`):
  - `origemDaAutoria('pessoa', 'u')` → `'pessoa'`; `('agente', 'risco')` → `'agente'`; `('integracao', 'awave')` →
    `'awave'`; `('integracao', 'construir')` e `('outro', 'x')` lançam.
  - `listarDemandas(db, { origem: 'awave', limit: 20, offset: 0 })` traz só a do Awave e `total = 1`; idem para
    `pessoa` e `agente` (CA-10.2); `{ origem: 'awave', status: 'nova' }` aplica os dois (CA-10.3); cada item tem `origem`
    certa.
  - CA-10.4: depois de `alterarDemanda(..., { solicitanteNome: 'Teste Ficticio' })` na do Awave, a origem continua
    `'awave'`.
  - `contarDemandasPorStatus(db, { origem: 'awave' })` conta só a do Awave.
  - CA-10.5: `filtroDemandasSchema.safeParse({ origem: 'outra' }).success === false`; e, pela rota `GET /api/demandas` com
    sessão de pessoa, `?origem=awave` → só a do Awave e `?origem=outra` → 400.
  - Plano de execução: `EXPLAIN` da página com `origem = 'awave'` sobre 5 mil demandas inseridas pelo migrator (como em
    `resumo-da-fila.test.ts`) usa `demanda_autor_criada_idx` ou não lê a tabela inteira; o trecho vai na entrega.

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/modules/demandas/origem.test.ts`.

- [ ] **Passo 3: implementar**

```ts
// src/modules/demandas/schemas.ts
export const ORIGENS_DA_DEMANDA = ['pessoa', 'agente', 'awave'] as const;
export type OrigemDaDemanda = (typeof ORIGENS_DA_DEMANDA)[number];
// em filtroDemandasSchema:
origem: z.enum(ORIGENS_DA_DEMANDA).optional(),
```

```ts
// src/modules/demandas/consultas.ts (trechos) — a origem vem da autoria, nunca do solicitanteNome (RF-10).
export function origemDaAutoria(autorTipo: string, autorId: string): OrigemDaDemanda {
  switch (autorTipo) {
    case 'pessoa':
      return 'pessoa';
    case 'agente':
      return 'agente';
    case 'integracao':
      if (autorId === 'awave') return 'awave';
      break;
  }
  throw new Error('autoria desconhecida');
}
export function origemDoResponsavel(r: Responsavel): OrigemDaDemanda {
  switch (r.tipo) {
    case 'pessoa':
      return 'pessoa';
    case 'agente':
      return 'agente';
    case 'integracao':
      if (r.integracao === 'awave') return 'awave';
      throw new Error('autoria desconhecida');
  }
}
// Filtro por enum já validado: só valores fixos no SQL (C-17).
export function condicaoDaOrigem(o: OrigemDaDemanda): SQL {
  switch (o) {
    case 'pessoa':
      return eq(demanda.autorTipo, 'pessoa');
    case 'agente':
      return eq(demanda.autorTipo, 'agente');
    case 'awave':
      return and(eq(demanda.autorTipo, 'integracao'), eq(demanda.autorId, 'awave'))!;
  }
}
```

`paginaDeDemandas` acrescenta `filtro.origem ? condicaoDaOrigem(filtro.origem) : undefined` ao `where` e lê
`autorTipo` e `autorId`; `resumoDe` monta `origem: origemDaAutoria(l.autorTipo, l.autorId)` (chave a chave, sem
`autorId` no item); `contarDemandasPorStatus` aceita `Pick<FiltroDemandas, 'tipo' | 'linhaServicoProvavel' | 'origem'>`
e aplica a mesma condição.

- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; G4 vazio.

---

## Fase 3 — Confirmação por pessoa e gatilhos

### T08. Confirmação da demanda do Awave e nenhum agente de IA antes dela (IN-06, IN-07)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (decisão que libera texto de fora a um provedor de IA pago) ·
**Cobre:** RF-05 (gatilhos e worker), RF-06 (servidor), IN-06, IN-07, IN-12 (`demanda_confirmada`), CA-06.1 a CA-06.6,
D-07, D-08, D-15, D-18

**Arquivos:**
- Criar: `src/modules/demandas/confirmacao.ts`, `src/modules/demandas/confirmar.ts`,
  `src/modules/demandas/confirmar.test.ts`, `src/modules/agentes/gatilhos-awave.test.ts`,
  `src/modules/agentes/executar-awave.test.ts`, `src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts`
- Modificar: `src/modules/agentes/gatilhos.ts`, `src/modules/agentes/executar.ts`,
  `src/app/(painel)/demandas/[id]/acoes.ts`, `src/components/rotulos.ts` (`MOTIVO_IGNORADO.sem_confirmacao`)

**Interfaces produzidas:** `jaConfirmada`, `aguardaConfirmacao`, `MENSAGENS_CONFIRMACAO`, `confirmarDemanda`,
`confirmarDemandaNoPainel`.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/demandas/confirmar.test.ts — RF-06, IN-06 e IN-07.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao, CORPO_DO_AWAVE } from '../../../test/integracoes';
import { alterarDemanda, criarDemanda } from './servico';
import { criarDemandaSchema } from './schemas';
import { confirmarDemanda, MENSAGENS_CONFIRMACAO } from './confirmar';

let b: BancoDeTeste;
let deps: Deps;
const pessoa = { tipo: 'pessoa', usuarioId: 'p1', nome: 'Pessoa Ficticia', papel: 'administradora' } as const;
const doAwave = () => criarDemanda(deps, atorDeIntegracao('awave'), criarDemandaSchema.parse(CORPO_DO_AWAVE));
const contar = async (id: string) => {
  const { rows } = await b.poolMigrator.query(
    `select (select count(*) from evento where acao = 'demanda_confirmada' and entidade_id = $1)::int as eventos,
            (select count(*) from execucao_agente where chave_entrada = $2)::int as execucoes`,
    [id, `demanda:${id}`],
  );
  return rows[0] as { eventos: number; execucoes: number };
};

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

describe('RF-06', () => {
  beforeEach(async () => {
    /* liga o insumo_tecnico com preço e teto livres, como em src/modules/agentes/gatilhos.test.ts */
  });
  it('CA-06.1: grava demanda_confirmada com a pessoa e dispara o insumo técnico', async () => {
    const { id } = await doAwave();
    expect(await contar(id)).toEqual({ eventos: 0, execucoes: 0 });
    expect(await confirmarDemanda(deps, pessoa, id)).toEqual({ jaConfirmada: false });
    expect(await contar(id)).toEqual({ eventos: 1, execucoes: 1 });
    const { rows } = await b.poolMigrator.query(`select ator_tipo, ator_id, depois from evento where acao = 'demanda_confirmada' and entidade_id = $1`, [id]);
    expect(rows[0]).toEqual({ ator_tipo: 'pessoa', ator_id: 'p1', depois: { confirmada: true } });
  });
  it('CA-06.3: confirmar de novo não grava outro evento nem outra execução', async () => {
    const { id } = await doAwave();
    await confirmarDemanda(deps, pessoa, id);
    expect(await confirmarDemanda(deps, pessoa, id)).toEqual({ jaConfirmada: true });
    expect(await contar(id)).toEqual({ eventos: 1, execucoes: 1 });
  });
  it('IN-07: duas confirmações simultâneas terminam com um evento e uma execução', async () => {
    const { id } = await doAwave();
    await Promise.all([confirmarDemanda(deps, pessoa, id), confirmarDemanda(deps, pessoa, id)]);
    expect(await contar(id)).toEqual({ eventos: 1, execucoes: 1 });
  });
  it('CA-06.4: demanda de pessoa → 409 com a mensagem da 03, nada gravado', async () => {
    const { id } = await criarDemanda(deps, pessoa, criarDemandaSchema.parse({ ...CORPO_DO_AWAVE, solicitanteNome: 'Pessoa Ficticia' }));
    await expect(confirmarDemanda(deps, pessoa, id)).rejects.toEqual(expect.objectContaining({ codigo: 'conflito', mensagem: MENSAGENS_CONFIRMACAO.outraOrigem }));
    expect((await contar(id)).eventos).toBe(0);
  });
  it('CA-06.5: Awave em status final → 409', async () => {
    const { id } = await doAwave();
    // Se a tabela do RF-07 não permitir nova → encerrada, passe por em_analise antes.
    await alterarDemanda(deps, pessoa, id, { status: 'encerrada' });
    await expect(confirmarDemanda(deps, pessoa, id)).rejects.toEqual(expect.objectContaining({ codigo: 'conflito', mensagem: MENSAGENS_CONFIRMACAO.statusFinal }));
  });
  it('CA-06.6: agente, integração e sistema chamando a função direto → 403', async () => {
    const { id } = await doAwave();
    for (const ator of [{ tipo: 'agente', agente: 'orquestrador', prefixoToken: null } as const, atorDeIntegracao('awave'), { tipo: 'sistema' } as const])
      await expect(confirmarDemanda(deps, ator, id)).rejects.toEqual(expect.objectContaining({ codigo: 'sem_permissao' }));
  });
  it('não muda autoria, rascunho nem status (C-11, C-34)', async () => { /* lê a linha antes e depois: iguais, menos nada */ });
});
```

E CA-06.2 (com o agente desligado: o evento é gravado e não há execução nem job).

```ts
// src/modules/agentes/gatilhos-awave.test.ts — IN-06: nenhum agente trabalha na demanda do Awave sem confirmação.
// Com os quatro agentes ligados, preço e teto livres e o provedor falso (test/provedor-falso.ts):
// 1. a pessoa grava uma ESP sem dúvidas e um RSK na demanda do Awave NÃO confirmada → nenhuma execução com chave
//    `esp:<id>` (risco) nem `rsk:<id>` (consolidação), e o provedor falso não recebe chamada;
// 2. a pessoa confirma; depois, uma ESP nova sem dúvidas → execução de `risco` criada como hoje;
// 3. a mesma ESP numa demanda de pessoa dispara como hoje (regressão).
//
// src/modules/agentes/executar-awave.test.ts — IN-06 no worker (D-07): uma execução de insumo_tecnico com chave
// `demanda:<id>` inserida à mão para a demanda do Awave não confirmada → executarAgente devolve 'ignorada', grava
// agente_ignorado com depois { agente: 'insumo_tecnico', motivo: 'sem_confirmacao' }, o provedor falso não é chamado e
// não há linha em uso_ia; o mesmo depois da confirmação → chama o provedor como hoje.
//
// src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts — IN-07 e C-04, no molde dos testes de Server Action de hoje
// (src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.test.ts): sem sessão → erro sem gravar; sessão sem 2FA →
// sem_2fa; chave a mais (`{ id, extra: 1 }`) → entrada_invalida (strictObject); id fora da regex → entrada_invalida;
// pessoa com 2FA → { ok: true, dados: { id } } e o evento gravado.
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/modules/demandas/confirmar.test.ts src/modules/agentes/gatilhos-awave.test.ts src/modules/agentes/executar-awave.test.ts "src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts"`.

- [ ] **Passo 3: implementar**

```ts
// src/modules/demandas/confirmacao.ts — "confirmada" é a existência do evento (ADR-25): sem coluna nem UPDATE.
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { demanda, evento } from '../../db/schema';

export async function jaConfirmada(db: Db, demandaId: string): Promise<boolean> {
  const [l] = await db
    .select({ id: evento.id })
    .from(evento)
    .where(and(eq(evento.acao, 'demanda_confirmada'), eq(evento.entidade, 'demanda'), eq(evento.entidadeId, demandaId)))
    .limit(1);
  return l !== undefined;
}

// IN-06: demanda de integração sem a confirmação de uma pessoa não vai a nenhum agente de IA. Demanda que não existe:
// false (a montagem da entrada segue dando "não encontrado"). Autoria desconhecida: true (falha fechada).
export async function aguardaConfirmacao(db: Db, demandaId: string): Promise<boolean> {
  const [d] = await db.select({ autorTipo: demanda.autorTipo }).from(demanda).where(eq(demanda.id, demandaId));
  if (!d) return false;
  switch (d.autorTipo) {
    case 'pessoa':
    case 'agente':
      return false;
    case 'integracao':
      return !(await jaConfirmada(db, demandaId));
    default: {
      const nunca: never = d.autorTipo;
      void nunca;
      return true;
    }
  }
}
```

```ts
// src/modules/demandas/confirmar.ts — RF-06, D-08 e IN-07.
export const MENSAGENS_CONFIRMACAO = {
  outraOrigem: 'Só demanda aberta pelo Awave precisa de confirmação.',
  statusFinal: 'A demanda está em um status final e não pode mais ser confirmada.',
} as const;

function ehDoAwave(autorTipo: AutorDemanda, autorId: string): boolean {
  switch (autorTipo) {
    case 'pessoa':
    case 'agente':
      return false;
    case 'integracao':
      return autorId === 'awave';
    default: {
      const nunca: never = autorTipo;
      void nunca;
      return false;
    }
  }
}

export async function confirmarDemanda(deps: DepsComFila, ator: Ator, id: string, t?: Transacao): Promise<{ jaConfirmada: boolean }> {
  autorizar(ator, 'confirmar_demanda');
  const pessoa = exigirAtorPessoa(ator);
  const corpo = async (tr: Transacao) => {
    const d = await travarDemanda(tr.tx, id);
    if (!ehDoAwave(d.autorTipo, d.autorId)) throw new ErroDominio('conflito', MENSAGENS_CONFIRMACAO.outraOrigem);
    if (await jaConfirmada(tr.tx, id)) return { jaConfirmada: true };
    if (ehStatusFinal(d.status)) throw new ErroDominio('conflito', MENSAGENS_CONFIRMACAO.statusFinal);
    // Evento antes do disparo, na mesma transação: o gatilho lê a confirmação que acabou de entrar (IN-06).
    await registrarEvento(tr.tx, { ator: pessoa, demandaId: id, entidade: 'demanda', entidadeId: id, acao: 'demanda_confirmada', depois: { confirmada: true } }, deps.relogio);
    await dispararSeLigado(tr, deps, 'insumo_tecnico', `demanda:${id}`, id);
    return { jaConfirmada: false };
  };
  return t ? corpo(t) : comTransacao(deps.pool, corpo);
}
```

```ts
// src/modules/agentes/gatilhos.ts — primeira linha de dispararSeLigado (vale para os quatro agentes).
if (demandaId !== null && (await aguardaConfirmacao(t.tx, demandaId))) return false;
```

```ts
// src/modules/agentes/executar.ts — MotivoIgnorada ganha 'sem_confirmacao'; passo 3c, logo depois do M-02 (D-07).
if (exec.demandaId !== null && (await aguardaConfirmacao(deps.db, exec.demandaId))) return ignorar(c, 'agente_ignorado', 'sem_confirmacao');
```

```ts
// src/app/(painel)/demandas/[id]/acoes.ts — no arquivo 'use server' de hoje (G4: nenhum arquivo novo).
const confirmarSchema = z.strictObject({ id: z.string().regex(RE_ID_DEMANDA) });
const confirmar = acaoDoPainel({ acao: 'confirmar_demanda', entrada: confirmarSchema }, async ({ ator, entrada, deps }): Promise<{ id: string }> => {
  await confirmarDemanda(deps, ator, entrada.id);
  return { id: entrada.id };
});
export async function confirmarDemandaNoPainel(pedido: unknown): Promise<ResultadoAcao<{ id: string }>> {
  return confirmar(pedido);
}
```

Em `rotulos.ts`, `MOTIVO_IGNORADO.sem_confirmacao = 'demanda aberta pelo Awave ainda não confirmada'` (D-18).

- [ ] **Passo 4: verificar** — `pnpm test` (gatilhos e executar de hoje verdes sem mudança), `pnpm lint`,
  `pnpm typecheck`; `test/estatico/exigir-pessoa.test.ts` verde; G4 vazio.

---

## Fase 4 — /construir: pendentes, entrega e recebimento

### T09. Conferência e montagem do pedido extraídas da geração (bytes iguais por construção)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (pedido com conferência de dado pessoal, C-28) · **Cobre:**
RF-13 (base), ADR-26, CA-22.2 (guarda), IN-10 (conferências), pendência da spec 7.2 (SHA antes e depois)

**Arquivos:**
- Criar: `src/modules/pedido-construcao/conferir.ts`, `src/modules/pedido-construcao/conferir.test.ts`,
  `src/modules/pedido-construcao/gerar-bytes.test.ts`
- Modificar: `src/modules/pedido-construcao/gerar.ts`

**Interfaces produzidas:** `conferirEMontarPedido`.

- [ ] **Passo 1: teste de caracterização (nasce verde, G3.1)** — `gerar-bytes.test.ts`, com o DEC aprovado montado como
  em `gerar.test.ts`: o `json` de `gerarPedido` é igual, byte a byte, a `serializarPedido(montarPedido({ dec, esp, rsk }))`
  com o DEC, a ESP e o RSK lidos pelas consultas de hoje; duas gerações do mesmo DEC têm o mesmo SHA-256. Rode e registre
  na entrega o SHA-256 obtido **antes** do refatoramento.

- [ ] **Passo 2: escrever o teste que falha**

```ts
// src/modules/pedido-construcao/conferir.test.ts — ADR-26: a geração e a entrega usam a mesma conferência e montagem.
// 1. conferirEMontarPedido(tx, decId) devolve { dec, json } com json igual ao de gerarPedido para o mesmo DEC.
// 2. Não grava evento (contagem de `evento` igual antes e depois) e não pede a confirmação de dado pessoal.
// 3. As recusas são as da geração, com o mesmo código e a mesma mensagem: DEC inexistente → nao_encontrado; demanda em
//    status final → conflito (MENSAGENS_PEDIDO.demandaFinal); sem decisão aprovada → conflito (naoAprovado);
//    substituído → conflito (substituido(id)); desatualizado → conflito (desatualizado); estudo → nao_processavel
//    (estudo); nome do solicitante no título copiado → nao_processavel com erros ['demanda.titulo: nome'], sem o valor.
```

- [ ] **Passo 3: rodar e ver falhar** — `pnpm test src/modules/pedido-construcao/conferir.test.ts` (módulo inexistente).

- [ ] **Passo 4: implementar** — mova os passos 3 a 7 do comentário de `gerar.ts` para:

```ts
// src/modules/pedido-construcao/conferir.ts — RF-22 passos 3 a 11 do cap. 05: trava da demanda, status final,
// aprovada, substituído, desatualizado, estudo, montagem só com a ESP e o RSK citados, C-28 e nome do solicitante
// atual, validarPedido. Sem autorizar, sem confirmação e sem evento: quem chama faz (gerar.ts e entregar.ts).
export async function conferirEMontarPedido(tx: Db, decId: string): Promise<{ dec: PacoteDecisaoVista; json: string }> {
  // ... o corpo de hoje de `corpo` em gerar.ts, do select do alvo até o validarPedido ...
  return { dec, json: serializarPedido(pedido) };
}
```

`gerarPedido` fica: `autorizar`; confirmação (422 antes do banco); na transação, `conferirEMontarPedido` e o evento
`pedido_gerado` de hoje; devolve `{ nomeArquivo, json }`. `MENSAGENS_PEDIDO` continua exportado de `gerar.ts`.

- [ ] **Passo 5: verificar** — `pnpm test` (`gerar.test.ts`, `gerar-bordas.test.ts`, `gerar-substituido.test.ts`,
  `pedido.test.ts`, `pedido-bordas.test.ts` verdes sem mudança; o SHA-256 da caracterização igual ao do passo 1, citado
  na entrega), `pnpm lint`, `pnpm typecheck`; G4 vazio.

### T10. Leituras do pedido no histórico: pendentes, gerado, entregues, recebido (IN-10, RNF-02)

**Engenheiro:** `engenheiro-dados-bd` · **Risco:** alto (decide o que sai para agentes com Bash) · **Cobre:** RF-12
(consulta), RF-15 (leitura), RNF-02 (plano), IN-10, ADR-27, CA-12.1 a CA-12.5, D-12, P-02, P-03

**Arquivos:**
- Criar: `src/modules/pedido-construcao/pendentes.ts`, `src/modules/pedido-construcao/pendentes.test.ts`

**Interfaces produzidas:** `listarPendentes`, `pedidoGeradoPorPessoa`, `shasEntregues`, `recebidoComSha`,
`recebimentoDoPedido`.

- [ ] **Passo 1: escrever os testes que falham** — `pendentes.test.ts`, banco real, com um DEC aprovado vigente montado
  como em `gerar.test.ts`:
  - CA-12.1: sem `pedido_gerado` → fora de `listarPendentes`.
  - CA-12.2: depois de `gerarPedido` por pessoa → `[{ decId }]`.
  - IN-10: um `pedido_gerado` com ator **agente** (inserido pelo migrator) num outro DEC aprovado → fora da lista, e
    `pedidoGeradoPorPessoa` desse DEC → `null`.
  - CA-12.3: a demanda vai a `entregue` e, em outro DEC, a `encerrada` → fora.
  - CA-12.4: um DEC mais novo da mesma demanda aprovado (substituição) → o antigo sai; uma ESP mais nova (desatualizado)
    → sai.
  - CA-12.5: com `pedido_recebido` (evento de integração `construir` inserido pelo migrator, prefixo `ficticio`) → sai.
  - P-02: o DEC continua na lista quando a entrega seria recusada por nome (a lista não monta o pedido).
  - P-03: pedido gerado "antes" (evento com `ocorrido_em` de outubro) também conta; a ordem é do primeiro
    `pedido_gerado` mais antigo para o mais novo, e depois pelo id.
  - `shasEntregues` devolve só os `depois->>'sha256'` que casam `^[0-9a-f]{64}$`; `recebidoComSha` só com o mesmo DEC e
    o mesmo hash; `recebimentoDoPedido` devolve a data do **primeiro** `pedido_recebido` ou `null`.
  - RNF-02: com 200 DEC e 20 mil eventos inseridos pelo migrator (`generate_series`, como em `resumo-da-fila.test.ts`),
    `EXPLAIN (ANALYZE, FORMAT JSON)` de `listarPendentes` usa `evento_acao_entidade_idx` e roda abaixo de 1 s; o trecho
    do plano vai na entrega.

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/modules/pedido-construcao/pendentes.test.ts`.

- [ ] **Passo 3: implementar**

```ts
// src/modules/pedido-construcao/pendentes.ts — o que o /construir pode buscar (02, 5.3), numa consulta só, e as
// leituras do pedido no histórico. Só leitura: nada aqui grava evento (CA-12.6).
import { and, asc, eq, min, notExists, notInArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

const recebido = alias(evento, 'recebido');
const STATUS_FINAIS = ['entregue', 'encerrada'] as const; // os de ehStatusFinal (transicoes.ts)
const RE_SHA256 = /^[0-9a-f]{64}$/;

export async function listarPendentes(db: Db): Promise<Array<{ decId: string }>> {
  // IN-10: só pedido_gerado de pessoa conta.
  const g = db
    .select({ decId: evento.entidadeId, primeiro: min(evento.ocorridoEm).as('primeiro') })
    .from(evento)
    .where(and(eq(evento.acao, 'pedido_gerado'), eq(evento.entidade, 'pacote_decisao'), eq(evento.atorTipo, 'pessoa')))
    .groupBy(evento.entidadeId)
    .as('g');
  return db
    .select({ decId: pacoteDecisao.id })
    .from(pacoteDecisao)
    .innerJoin(g, eq(g.decId, pacoteDecisao.id))
    .innerJoin(decisao, and(eq(decisao.pacoteDecisaoId, pacoteDecisao.id), eq(decisao.statusDecisao, 'aprovada')))
    .innerJoin(demanda, eq(demanda.id, pacoteDecisao.demandaId))
    .where(
      and(
        notInArray(demanda.status, [...STATUS_FINAIS]),
        sql`${expressaoSubstituidoPor()} is null`,
        sql`not ${expressaoDesatualizado()}`,
        notExists(db.select({ x: sql`1` }).from(recebido).where(and(eq(recebido.acao, 'pedido_recebido'), eq(recebido.entidadeId, pacoteDecisao.id)))),
      ),
    )
    .orderBy(asc(g.primeiro), asc(pacoteDecisao.id));
}
```

As outras quatro funções são consultas a `evento` por `acao`, `entidade = 'pacote_decisao'` e `entidade_id`, com
`limit 1` onde cabe (`pedidoGeradoPorPessoa` exige `ator_tipo = 'pessoa'` e `demanda_id` não nulo).

- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; G4 vazio.

### T11. Entrega ao /construir e rota de pendentes (IN-10, IN-12)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (credencial externa recebe o pedido; rotas novas) · **Cobre:**
RF-12 (rota), RF-13, RF-09 (entrega), RNF-08 (contrato do `/construir`, parte 1), IN-10, IN-12 (`pedido_entregue`),
IN-14 (orçamento `entrega`), CA-09.3, CA-12.6, CA-13.1 a CA-13.6, P-02

**Arquivos:**
- Criar: `src/modules/pedido-construcao/entregar.ts`, `src/app/api/pedidos-construcao/pendentes/route.ts`,
  `src/app/api/pedidos-construcao/[decId]/entrega/route.ts`, `src/app/api/pedidos-construcao/entrega.test.ts`

**Interfaces consumidas:** T04, T09, T10. **Produzidas:** `RE_SHA256`, `sha256DoPedido`, `pendentesPara`, `entregarPedido`.

- [ ] **Passo 1: escrever os testes que falham** — `entrega.test.ts`, banco real, token `construir` real, DEC aprovado
  com pedido gerado por pessoa (`gerarPedido`), requisições como o `buscar-pedidos.mjs` (dfedf16) as faz: Bearer,
  `accept: application/json`, **sem `Origin`**, e na entrega `method: 'POST'` **sem corpo e sem `content-type`**:
  - CA-12.6 e RF-12: `GET /pendentes` → 200, `{ itens: [{ decId }] }`, cada item com só a chave `decId`, nenhuma outra
    chave no corpo, e a tabela `evento` com a mesma contagem antes e depois.
  - CA-09.3 e CA-13.1: `POST /entrega` → 200, `content-type: application/json; charset=utf-8`,
    `x-content-type-options: nosniff`, `cache-control: no-store`; SHA-256 do corpo igual ao do `json` de `gerarPedido` do
    mesmo DEC.
  - CA-13.6: `validarPedido` de `src/vendor/construir/pedido.mjs` (a cópia do `/construir`) aceita o corpo, e
    `pedido` é o `decId`.
  - CA-13.5 e IN-12: há um `pedido_entregue` com `ator_tipo = 'integracao'`, `ator_id = 'construir'`, o prefixo,
    `entidade = 'pacote_decisao'`, `demanda_id` da demanda e `depois = { sha256 }` igual ao SHA-256 calculado no teste;
    `antes` nulo. Entregar de novo devolve os mesmos bytes e **não** grava outro (P-02).
  - CA-13.2: DEC aprovado sem `pedido_gerado` → 404 com o mesmo corpo, byte a byte, de um DEC que não existe; idem com
    `pedido_gerado` de agente inserido pelo migrator (IN-10).
  - CA-13.3: o DEC depois substituído → 409 com `MENSAGENS_PEDIDO.substituido(...)`; desatualizado → 409
    `desatualizado`; demanda em status final → 409 `demandaFinal`. Nenhum evento novo em cada recusa.
  - CA-13.4: a demanda renomeada para um solicitante cujo nome aparece no título copiado no DEC → 422 com
    `erros: ['demanda.titulo: nome']`, sem o valor, e nenhum evento.
  - `pendentesPara` com ator `awave` → 403 (a rota também, pela matriz × rotas da T03).

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/app/api/pedidos-construcao/entrega.test.ts`.

- [ ] **Passo 3: implementar**

```ts
// src/modules/pedido-construcao/entregar.ts — RF-12 e RF-13 (ADR-26).
import { createHash } from 'node:crypto';

export const RE_SHA256 = /^[0-9a-f]{64}$/;
export const sha256DoPedido = (json: string): string => createHash('sha256').update(json, 'utf8').digest('hex');
const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

export async function pendentesPara(deps: DepsDemanda, ator: Ator): Promise<Array<{ decId: string }>> {
  autorizar(ator, 'listar_pedidos_pendentes');
  const itens = await executarComOrcamento(deps.pool, ator, 'padrao', undefined, ({ tx }) => listarPendentes(tx));
  return itens.map((i) => ({ decId: i.decId })); // chave a chave (CA-12.6)
}

export async function entregarPedido(deps: DepsDemanda, ator: Ator, decId: string, t?: Transacao): Promise<{ json: string; sha256: string }> {
  autorizar(ator, 'entregar_pedido');
  return executarComOrcamento(deps.pool, ator, 'entrega', t, async ({ tx }) => {
    // IN-10: só o que uma pessoa gerou; sem isso, o mesmo 404 de DEC inexistente.
    if (!(await pedidoGeradoPorPessoa(tx, decId))) throw naoEncontrado();
    const { dec, json } = await conferirEMontarPedido(tx, decId); // as recusas da geração, sem evento
    const sha256 = sha256DoPedido(json);
    if (!RE_SHA256.test(sha256)) throw new Error('entrega: sha256 fora do formato');
    // ADR-26 e P-02: um pedido_entregue por hash; o hash é sempre o do servidor (IN-12).
    if (!(await shasEntregues(tx, decId)).includes(sha256))
      await registrarEvento(tx, { ator, demandaId: dec.demandaId, entidade: 'pacote_decisao', entidadeId: dec.id, acao: 'pedido_entregue', depois: { sha256 } }, deps.relogio);
    return { json, sha256 };
  });
}
```

```ts
// src/app/api/pedidos-construcao/pendentes/route.ts — GET → 200 { itens: [{ decId }] }; só a integração construir.
export const GET = rota({ acao: 'listar_pedidos_pendentes', rota: '/api/pedidos-construcao/pendentes' }, async ({ deps, ator }) => ({
  json: { itens: await pendentesPara(deps, ator) },
}));

// src/app/api/pedidos-construcao/[decId]/entrega/route.ts — POST sem corpo → 200 com os bytes da geração (CA-22.2).
export const POST = rota(
  { acao: 'entregar_pedido', rota: '/api/pedidos-construcao/[decId]/entrega', params: paramId.versao('decId', 'DEC') },
  async ({ deps, ator, params }) => {
    const { json } = await entregarPedido(deps, ator, params.decId);
    return { texto: json, cabecalhos: { 'content-type': 'application/json; charset=utf-8' } };
  },
);
```

- [ ] **Passo 4: verificar** — `pnpm test` (a matriz × rotas da T03 pega as duas rotas novas sozinha e nega pessoa, os
  quatro agentes e o `awave`: CA-03.3, CA-03.4), `pnpm lint`, `pnpm typecheck`; G4 vazio (`rota.ts` sem diff).

### T12. Confirmação de recebimento pelo /construir (IN-11)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (rota nova de credencial externa) · **Cobre:** RF-14, RNF-08
(contrato do `/construir`, parte 2), IN-11, IN-12 (`pedido_recebido`), CA-14.1 a CA-14.5, D-04

**Arquivos:**
- Criar: `src/modules/pedido-construcao/receber.ts`, `src/app/api/pedidos-construcao/[decId]/recebimento/route.ts`,
  `src/app/api/pedidos-construcao/recebimento.test.ts`

**Interfaces produzidas:** `MENSAGENS_RECEBIMENTO`, `recebimentoSchema`, `receberPedido`.

- [ ] **Passo 1: escrever os testes que falham** — `recebimento.test.ts`, banco real, token `construir`, requisição como
  o `buscar-pedidos.mjs`: `POST`, Bearer, `accept` e `content-type: application/json`, corpo `{ "sha256": "<hex>" }`,
  sem `Origin`:
  - CA-14.1: depois da entrega, o SHA-256 do corpo entregue → 204 sem corpo; `pedido_recebido` com ator `construir`,
    prefixo e `depois = { sha256 }`; o DEC sai de `GET /pendentes`.
  - CA-14.2: 64 hexadecimais diferentes → 409 com `MENSAGENS_RECEBIMENTO.shaDiferente`, sem evento, e o DEC continua
    pendente.
  - CA-14.3: repetir com o SHA certo → 204 e um só `pedido_recebido`.
  - CA-14.4: DEC com pedido gerado e ainda não entregue → 409 com `MENSAGENS_RECEBIMENTO.naoEntregue`.
  - CA-14.5 e D-04: `{ "sha256": "abc" }`, `{}`, `{ "sha256": "A".repeat(64) }` e corpo `{ "sha256": 1 }` → 400
    `entrada_invalida` com `campos: [{ campo: 'sha256', mensagem: 'Informe o sha256 com 64 caracteres hexadecimais
    minúsculos.' }]`, sem consulta ao DEC (um `decId` que não existe dá 400, e não 404); chave a mais → 400.
  - 404: DEC sem `pedido_gerado` ou inexistente → o mesmo corpo de inexistente.
  - RF-14: o DEC substituído, desatualizado ou com a demanda em status final **depois** da entrega → 204 com o SHA certo.
  - IN-11: dois recebimentos simultâneos com o SHA certo → um só `pedido_recebido`.

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/app/api/pedidos-construcao/recebimento.test.ts`.

- [ ] **Passo 3: implementar**

```ts
// src/modules/pedido-construcao/receber.ts — RF-14 (ADR-26: compara com o hash gravado na entrega, não remonta).
export const MENSAGENS_RECEBIMENTO = {
  formato: 'Informe o sha256 com 64 caracteres hexadecimais minúsculos.',
  naoEntregue: 'Este pedido ainda não foi entregue ao /construir. Peça a entrega antes de confirmar o recebimento.',
  shaDiferente: 'O SHA-256 enviado não confere com o pedido entregue. Busque o pedido de novo.',
} as const;

// D-04: issue `custom`, para o mapearErro repassar o texto da 03 em `campos`; ausente também cai aqui.
export const recebimentoSchema = z.strictObject({
  sha256: z.custom<string>((v) => typeof v === 'string' && RE_SHA256.test(v), { message: MENSAGENS_RECEBIMENTO.formato }),
});

export async function receberPedido(deps: DepsDemanda, ator: Ator, decId: string, sha256: string, t?: Transacao): Promise<{ jaRecebido: boolean }> {
  autorizar(ator, 'confirmar_recebimento_pedido');
  return executarComOrcamento(deps.pool, ator, 'padrao', t, async ({ tx }) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`pedido:${decId}`}, 0))`);
    const gerado = await pedidoGeradoPorPessoa(tx, decId);
    if (!gerado) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
    const entregues = await shasEntregues(tx, decId);
    if (entregues.length === 0) throw new ErroDominio('conflito', MENSAGENS_RECEBIMENTO.naoEntregue);
    if (!entregues.includes(sha256)) throw new ErroDominio('conflito', MENSAGENS_RECEBIMENTO.shaDiferente);
    if (await recebidoComSha(tx, decId, sha256)) return { jaRecebido: true };
    // O hash gravado é o do servidor (o da entrega que bateu), nunca o texto do cliente (IN-12).
    const doServidor = entregues.find((s) => s === sha256)!;
    await registrarEvento(tx, { ator, demandaId: gerado.demandaId, entidade: 'pacote_decisao', entidadeId: decId, acao: 'pedido_recebido', depois: { sha256: doServidor } }, deps.relogio);
    return { jaRecebido: false };
  });
}
```

```ts
// src/app/api/pedidos-construcao/[decId]/recebimento/route.ts — POST { sha256 } → 204.
export const POST = rota(
  { acao: 'confirmar_recebimento_pedido', rota: '/api/pedidos-construcao/[decId]/recebimento', params: paramId.versao('decId', 'DEC'), corpo: recebimentoSchema },
  async ({ deps, ator, params, corpo }) => {
    await receberPedido(deps, ator, params.decId, corpo.sha256);
    return { status: 204 };
  },
);
```

- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; G4 vazio.

### T13. Testes transversais das integrações: sentinelas e log (IN-12, IN-14)

**Engenheiro:** `engenheiro-backend` · **Risco:** baixo (só testes) · **Cobre:** IN-12 (transversal), IN-14 (log),
RNF-04, RNF-05, IN-04 (token fora do log e dos eventos)

**Arquivos:**
- Modificar: `test/transversal/sentinelas.test.ts` (só acrescenta), `test/sentinelas.ts` (se precisar de sentinela nova)
- Criar: `src/app/api/pedidos-construcao/log-das-integracoes.test.ts`

- [ ] **Passo 1: escrever os testes que falham**
  - Em `sentinelas.test.ts`, dois fluxos novos com os sentinelas de hoje: (a) Awave: POST com sentinela em `titulo`,
    `descricaoProblema`, `contexto`, `solicitanteNome` e `anexos`; GET da própria demanda; 429 e 400 provocados;
    (b) `/construir`: ESP com texto sentinela (sem e-mail, telefone nem CPF, para a geração passar), DEC aprovado,
    geração por pessoa, pendentes, entrega, recebimento com SHA certo e com SHA errado (409). No fim, as asserções de
    hoje valem também para estes fluxos: nenhum sentinela nas linhas do pino, no console, no Sentry falso, no esquema
    `pgboss` e em `execucao_agente`; e, novo, nenhum sentinela em `evento.antes`/`evento.depois` dos eventos de
    integração, e nenhum texto de token depois do prefixo em log, eventos e `pgboss`.
  - `log-das-integracoes.test.ts`: captura a linha de log (`substituirDestinoDoLog`) do POST do Awave e das três rotas do
    `/construir`; cada uma tem `atorTipo: 'integracao'` e não contém `wsod_`, o prefixo, nenhum `sha256`, nenhum `decId`
    nem o título (RNF-04, IN-14).
- [ ] **Passo 2: rodar** — se algum passar sem mudança de código, a entrega diz qual e por quê (é teste de guarda); se
  falhar, a causa é corrigida no módulo da tarefa dona e citada na entrega.
- [ ] **Passo 3: verificar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; piso do D-17 sem queda.

---

## Fase 5 — Scripts de token e seed fictício

### T14. Emissão, troca e revogação dos tokens de integração pelos scripts (IN-04)

**Engenheiro:** `engenheiro-backend` · **Risco:** alto (emissão de credencial) · **Cobre:** RF-02, IN-04, IN-18 (parte
verificável, D-20), CA-02.1 a CA-02.6

**Arquivos:**
- Modificar: `scripts/criar-token-servico.ts`, `scripts/revogar-token-servico.ts` (só comentário)
- Criar: `scripts/token-integracao.test.ts`, `test/estatico/docs-sem-token.test.ts`

- [ ] **Passo 1: escrever os testes que falham** — `token-integracao.test.ts`, no molde de `scripts/scripts.test.ts`
  (saída falsa, banco real):
  - CA-02.1 e CA-02.2: `executarCriarToken(deps, ['--integracao', 'awave'], saida)` → 0; a saída mostra o prefixo e o
    token uma vez (o token aparece exatamente uma vez no texto); o banco tem uma linha com `integracao = 'awave'`,
    `agente` nulo, o hash e o prefixo; `token_criado` com ator `sistema` e `depois = { integracao: 'awave', prefixo }`.
    Idem `construir`.
  - CA-02.3: `--integracao jarvis`; `--agente risco --integracao awave`; nenhum dos dois; `--token x` → erro de
    argumento e nenhuma linha nem evento.
  - CA-02.4: `executarRevogarToken` com o prefixo → 0, o token passa a 401 em `validarTokenServico`, `token_revogado`
    com o prefixo; de novo → 1 sem evento.
  - CA-02.5: emitir um novo e revogar o antigo → o novo vale e o antigo não.
  - CA-02.6: em todas as execuções, as linhas do log capturado e os eventos gravados não contêm o texto do token
    depois do prefixo.
  - `--agente` continua como hoje (regressão).

```ts
// test/estatico/docs-sem-token.test.ts — IN-18 (D-20) e C-39: nenhum valor de token em documentação.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivos = [...globSync('docs/**/*.md', { cwd: raiz }), 'CHANGELOG.md', 'README.md'];
const TOKEN = /wsod_[A-Za-z0-9_-]{43}/;

it('a varredura enxerga docs/', () => expect(arquivos.length).toBeGreaterThan(5));
it.each(arquivos)('%s não tem valor de token', (a) => expect(readFileSync(`${raiz}${a}`, 'utf8')).not.toMatch(TOKEN));
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test scripts/token-integracao.test.ts test/estatico/docs-sem-token.test.ts`.

- [ ] **Passo 3: implementar**

```ts
// scripts/criar-token-servico.ts (trechos)
//   pnpm tsx scripts/criar-token-servico.ts --agente orquestrador|insumo_tecnico|risco|consolidacao
//   pnpm tsx scripts/criar-token-servico.ts --integracao awave|construir
export const argumentosCriarToken = z
  .strictObject({ agente: z.enum(AGENTES).optional(), integracao: z.enum(INTEGRACOES).optional() })
  .refine((a) => (a.agente === undefined) !== (a.integracao === undefined), { message: 'Informe exatamente um entre --agente e --integracao.' });
```

Na transação: `criarTokenServico` para agente ou `criarTokenDeIntegracao` para integração; `token_criado` com
`{ agente, prefixo }` ou `{ integracao, prefixo }`; o log leva só `{ evento: 'token_criado', atorTipo: 'sistema' }` e o
nome do dono (sem prefixo); a saída diz "Token criado para a integração awave (prefixo …)." e as duas linhas de hoje.
Confira como `lerArgumentos` trata opção ausente e ajuste sem mudar o comportamento de `--agente`.

- [ ] **Passo 4: verificar** — `pnpm test` (`scripts/scripts.test.ts` verde sem mudança), `pnpm lint`, `pnpm typecheck`.

### T15. Seed fictício com demandas do Awave e pedidos para o /construir (IN-17, V-01)

**Engenheiro:** `engenheiro-backend` · **Risco:** baixo (só banco fictício) · **Cobre:** IN-17 (seed), V-01 (dado), D-09,
apoio dos e2e T16 a T20

**Arquivos:**
- Modificar: `scripts/seed-ficticio.ts`, os testes do seed que contam demandas (G5)
- Criar: `scripts/seed-integracoes.test.ts`

- [ ] **Passo 1: escrever os testes que falham** — `seed-integracoes.test.ts`, banco novo, `seedFicticio` com
  `SEED_FICTICIO=1` e `urlBase` em loopback:
  - há três demandas de autoria `integracao`/`awave`, rascunho, solicitante "Awave": `awaveAguardando` e
    `awaveConfirmar` em `nova`, `awaveEncerrada` em `encerrada`; nenhuma tem `demanda_confirmada`;
  - `listarPendentes` traz o DEC de `pedidoParaBuscar` e não o de `pedidoRecebido`; `recebimentoDoPedido` do DEC de
    `pedidoRecebido` é uma data; os eventos `pedido_entregue` e `pedido_recebido` dele têm ator `construir` e prefixo
    `ficticio`;
  - `token_servico` está vazio (D-09) e nenhuma linha do log do seed contém `wsod_`;
  - nenhuma execução de agente foi criada para as demandas do Awave.

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test scripts/seed-integracoes.test.ts`.

- [ ] **Passo 3: implementar** — em `TITULOS_DO_E2E`:

```ts
awaveAguardando: 'Relatório do Awave aguardando confirmação (fictício)',
awaveConfirmar: 'Relatório do Awave para confirmar no e2e (fictício)',
awaveEncerrada: 'Relatório do Awave encerrado sem confirmação (fictício)',
pedidoParaBuscar: 'Pedido para o /construir buscar (fictício)',
pedidoRecebido: 'Pedido já recebido pelo /construir (fictício)',
```

- As três do Awave: `criarDemanda(deps, AWAVE_DO_SEED, criarDemandaSchema.parse({ ...corpo do Awave com o título }), t)`,
  com `const AWAVE_DO_SEED = { tipo: 'integracao', integracao: 'awave', prefixoToken: 'ficticio' } as const`; a
  `awaveEncerrada` vai a `encerrada` por `alterarDemanda` da "cto" (se a tabela do RF-07 não permitir `nova → encerrada`,
  passe por `em_analise`). Tipo `melhoria` (o e2e acha pelo `demandaDoSeed`).
- As duas dos pedidos: demanda da `sem2fa` (como as do e2e), ESP e RSK da `sem2fa` (`ESP_DO_E2E`, `RSK_DO_E2E`), DEC da
  `sem2fa` com `{ ...DEC_DO_E2E, nivelAprovacaoRequerido: 'cto' }`, aprovação da "cto" na opção A, `gerarPedido` da
  "cto" com `{ confirmaSemDadoPessoal: true }`. Na `pedidoRecebido`, depois: `entregarPedido(deps, CONSTRUIR_DO_SEED,
  decId, t)` e `receberPedido(deps, CONSTRUIR_DO_SEED, decId, sha256, t)`, com
  `CONSTRUIR_DO_SEED = { tipo: 'integracao', integracao: 'construir', prefixoToken: 'ficticio' }`. Com `t`, os serviços
  não aplicam o tempo limite (T04).
- O comentário do cabeçalho do seed cita o que entrou e o limite: o Awave fica com 3 das 10 por hora.

- [ ] **Passo 4: verificar** — `pnpm test` (testes do seed com o total novo, G5), `pnpm lint`, `pnpm typecheck`.

---

## Fase 6 — Painel

### T16. Fila: origem na linha e no cartão, filtro "Origem" (RF-10, tela)

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-10 (tela), RF-04 (CA-04.7), IN-16 (CV-07 em
`origem`), CA-10.1 a CA-10.3 (tela), CA-10.7 (fila)

**Arquivos:**
- Modificar: `src/app/(painel)/demandas/fila.tsx`, `FiltrosFila.tsx`, `ContadoresDaFila.tsx`, `CartoesDaFila.tsx`,
  `page.tsx`, `leituras-da-fila.ts`, `src/components/rotulos.ts` (`ROTULO_ORIGEM`)
- Criar: `src/app/(painel)/demandas/fila-origem.test.ts`, `e2e/fila-origem.spec.ts`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/app/(painel)/demandas/fila-origem.test.ts — 03, seção 4.
import { describe, expect, it } from 'vitest';
import { ROTULO_ORIGEM } from '../../../components/rotulos';
import { hrefDaFila, legendaDaFila, lerFiltroDaFila, temFiltro } from './fila';

const base = { limit: 20, offset: 0 } as const;

describe('fila com origem', () => {
  it('rótulos', () => expect(ROTULO_ORIGEM).toEqual({ pessoa: 'Pessoa', agente: 'Agente de IA', awave: 'Awave' }));
  it('legenda: "origem <rótulo>" por último', () => {
    expect(legendaDaFila({ ...base, origem: 'awave' })).toBe('Demandas com origem Awave, da mais nova para a mais antiga');
    expect(legendaDaFila({ ...base, status: 'nova', origem: 'awave' })).toBe('Demandas com status Nova e origem Awave, da mais nova para a mais antiga');
    expect(legendaDaFila({ ...base, status: 'nova', tipo: 'melhoria', origem: 'pessoa' })).toBe(
      'Demandas com status Nova, tipo Melhoria e origem Pessoa, da mais nova para a mais antiga',
    );
  });
  it('endereço: origem depois da linha de serviço', () => {
    expect(hrefDaFila({ ...base, status: 'nova', tipo: 'bug', linhaServicoProvavel: 'sob_medida', origem: 'awave' }, 0)).toBe(
      '/demandas?status=nova&tipo=bug&linhaServicoProvavel=sob_medida&origem=awave',
    );
  });
  it('origem conta como filtro; valor fora da lista invalida (CV-07)', () => {
    expect(temFiltro({ ...base, origem: 'agente' })).toBe(true);
    expect(lerFiltroDaFila({ origem: '<script>' })).toEqual({ filtro: expect.not.objectContaining({ origem: expect.anything() }), invalido: true });
  });
});
```

Acrescente casos para `rotuloMaisFiltros` (soma tipo, linha e origem) e para o `href` de cada contador levar a origem
(`contadoresDaFila` sobre `hrefDaFila`).

```ts
// e2e/fila-origem.spec.ts — RF-10 na tela, CA-10.7 e IN-16. Conta "cto"; não cria demanda nem versão.
import { entrarComo, expect, semViolacoesNasDuasLarguras, test } from './apoio';

test('filtro Origem = Awave: legenda, "Origem: Awave" e axe nas duas larguras', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas');
  await page.getByLabel('Origem').selectOption('awave');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/origem=awave/);
  await expect(page.getByRole('heading', { name: 'Demandas com origem Awave, da mais nova para a mais antiga' })).toBeFocused();
  await expect(page.getByText('Origem: Awave').first()).toBeVisible();
  await expect(page.getByText('Origem: Pessoa')).toHaveCount(0);
  await semViolacoesNasDuasLarguras(page, 'T03 com origem Awave');
});

test('IN-16: origem injetada na URL não é refletida', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas?origem=%3Cscript%3E');
  await expect(page.getByText('Algum filtro do endereço não é válido. Mostrando todas as demandas.')).toBeVisible();
  expect(await page.locator('a[href*="script"], input[value*="script"]').count()).toBe(0);
});
```

Acrescente, no celular (390 × 844): "Mais filtros (1 ativo)" com só a origem escolhida, e o cartão com o item "Origem"
depois de "Urgência".

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test "src/app/(painel)/demandas/fila-origem.test.ts"` e `pnpm test:e2e`.
- [ ] **Passo 3: implementar** — 03, 4.1 itens 1 a 8, com os textos da seção 9: `Selecao` `id="filtro-origem"`
  `name="origem"` entre Tipo e Linha de serviço; `hrefDaFila`, `temFiltro`, `legendaDaFila` e `rotuloMaisFiltros` com a
  origem; contadores com `origem` oculto (só do valor do enum depois do parse, CV-07) e `contagemOuNada` passando a
  origem; a chave do `Suspense` dos contadores leva a origem; na tabela, segunda linha da célula Título "Origem: <rótulo>"
  (13 px, `tinta-media`); no cartão, item `col-span-2` "Origem" depois de Urgência.
- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`; G4 vazio.

### T17. Regras de exibição da demanda do Awave: confirmação, selo e Próxima ação (RF-06, tela)

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-06 (tela, CA-06.7 regra), RF-10 (detalhe,
regra), D-06, 03 5.4 e 5.5

**Arquivos:**
- Criar: `src/components/dados-da-confirmacao.ts`, `src/components/dados-da-confirmacao.test.ts`
- Modificar: `src/components/dados-das-etapas.ts` (linha 14; `DestinoDaAcao` com `'confirmacao'`),
  `src/components/dados-das-etapas.test.ts` (só acrescenta), `src/components/rotulos.ts`
  (`SELO_AGUARDANDO_CONFIRMACAO`), `src/app/(painel)/demandas/[id]/detalhe.ts` (`ID_SECAO.confirmacao`,
  `TEXTOS_DETALHE.secoes.confirmacao`, `TEXTOS_DETALHE.dados.origem`)

**Interfaces produzidas:** `EstadoDaConfirmacao`, `estadoDaConfirmacao`, `TEXTOS_CONFIRMACAO`,
`SELO_AGUARDANDO_CONFIRMACAO`; `DadosDasEtapas.aguardaConfirmacaoDoAwave?: boolean` (opcional: os testes de hoje não
mudam).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/components/dados-da-confirmacao.test.ts — 03, 5.4 e D-06.
import { describe, expect, it } from 'vitest';
import { estadoDaConfirmacao, TEXTOS_CONFIRMACAO } from './dados-da-confirmacao';

const em = new Date('2026-11-11T17:32:00Z');
const confirmou = { acao: 'demanda_confirmada' as const, ocorridoEm: em, ator: { tipo: 'pessoa' as const, nome: 'Ana Ficticia', papel: 'cto' as const } };

describe('estadoDaConfirmacao', () => {
  it('não se aplica a pessoa nem a agente', () => {
    expect(estadoDaConfirmacao({ origem: 'pessoa', status: 'nova', historico: [] })).toEqual({ tipo: 'nao_se_aplica' });
    expect(estadoDaConfirmacao({ origem: 'agente', status: 'nova', historico: [] })).toEqual({ tipo: 'nao_se_aplica' });
  });
  it('Awave sem evento e fora de status final: aguardando', () => {
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'em_analise', historico: [] })).toEqual({ tipo: 'aguardando' });
  });
  it('Awave com o evento: confirmada por quem e quando (o mais antigo, se houver mais de um)', () => {
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico: [confirmou] })).toEqual({ tipo: 'confirmada', ator: 'Ana Ficticia (CTO)', em });
  });
  it('Awave em status final sem confirmação', () => {
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'encerrada', historico: [] })).toEqual({ tipo: 'final_sem_confirmacao', status: 'encerrada' });
  });
  it('textos da 03, seção 9', () => {
    expect(TEXTOS_CONFIRMACAO.botao).toBe('Confirmar demanda');
    expect(TEXTOS_CONFIRMACAO.enviando).toBe('Confirmando…');
    expect(TEXTOS_CONFIRMACAO.sucesso).toBe('Demanda confirmada.');
    expect(TEXTOS_CONFIRMACAO.finalSem('Encerrada')).toBe(
      'Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em Encerrada, um status final: não há confirmação a fazer.',
    );
  });
});
```

Em `dados-das-etapas.test.ts`, só acrescentando: com `aguardaConfirmacaoDoAwave: true`, status `nova` e sem agente em
andamento → linha 14 com "Confirmar a demanda aberta pelo Awave.", detalhe "Até a confirmação, nenhum agente de IA
trabalha nela.", quem age "Uma pessoa (CTO ou administradora)" e link "Ir para a confirmação" com destino
`{ tipo: 'secao', secao: 'confirmacao' }`; com agente em andamento → linha 2 (a 14 vem depois); em status final →
linha 1; com `aguardando_informacao` → linha 14 antes da 3.

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/components/dados-da-confirmacao.test.ts src/components/dados-das-etapas.test.ts`.
- [ ] **Passo 3: implementar** — `estadoDaConfirmacao` (o ator por `rotuloAtor`; o evento mais antigo de
  `demanda_confirmada`, porque o histórico chega do mais novo para o mais antigo); `TEXTOS_CONFIRMACAO` com os textos da
  03, seção 9, por inteiro; em `proximaAcao`, depois da linha 2:
  `if (x.aguardaConfirmacaoDoAwave) return acao(14, 'Confirmar a demanda aberta pelo Awave.', UMA_PESSOA, secao('Ir para a confirmação', 'confirmacao'), 'Até a confirmação, nenhum agente de IA trabalha nela.')`;
  `SELO_AGUARDANDO_CONFIRMACAO = { texto: 'Aguardando confirmação', cor: 'ambar', tracejado: false }`.
- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`.

### T18. Detalhe da demanda: origem, selo, seção "Confirmação do Awave" e botão (RF-06, RF-10, tela)

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-06 (CA-06.7), RF-10 (CA-10.1, CA-10.4 e CA-10.7
no detalhe), RF-15 (histórico com ator de integração na tela), IN-07 (Origin de outro site na Server Action), C-18

**Arquivos:**
- Criar: `src/app/(painel)/demandas/[id]/ConfirmarDemanda.tsx`, `e2e/confirmacao-awave.spec.ts`
- Modificar: `src/app/(painel)/demandas/[id]/page.tsx`, `CartaoProximaAcao.tsx` (`secao: 'confirmacao'` →
  `ID_SECAO.confirmacao`)

- [ ] **Passo 1: escrever os testes que falham**

```ts
// e2e/confirmacao-awave.spec.ts — RF-06 e 03, 5.3 e 5.4. Conta "cto"; não cria demanda nem versão.
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { demandaDoSeed, entrarComo, expect, semViolacoesNasDuasLarguras, test } from './apoio';

test('aguardando: selo, Próxima ação, origem, histórico e axe', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.awaveAguardando);
  await page.goto(`/demandas/${id}`);
  await expect(page.getByText('Aguardando confirmação', { exact: true })).toBeVisible();
  await expect(page.getByText('Confirmar a demanda aberta pelo Awave.')).toBeVisible();
  await page.getByRole('link', { name: 'Ir para a confirmação' }).click();
  await expect(page.getByRole('heading', { name: 'Confirmação do Awave' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Confirmar demanda' })).toHaveAttribute('aria-describedby', 'confirmacao-consequencia');
  const dados = page.locator('dl');
  await expect(dados.getByText('Origem', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Awave \(prefixo ficticio\)$/).first()).toBeVisible();
  await semViolacoesNasDuasLarguras(page, 'T05 Awave aguardando');
});

test('confirmar: "Confirmando…", aviso, foco no h2, quem e quando, sem selo', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.awaveConfirmar);
  await page.goto(`/demandas/${id}`);
  const botao = page.getByRole('button', { name: 'Confirmar demanda' });
  test.skip((await botao.count()) === 0, 'exige banco recém-semeado: a demanda do seed já foi confirmada');
  await botao.click();
  await expect(page.getByRole('status').filter({ hasText: 'Demanda confirmada.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Confirmação do Awave' })).toBeFocused();
  await expect(page.getByText(/^Confirmada por Pessoa Ficticia CTO \(CTO\) em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.$/)).toBeVisible();
  await expect(page.getByText('Aguardando confirmação', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Confirmou a demanda aberta pelo Awave')).toBeVisible();
});

test('encerrada sem confirmação: sem botão, texto do status final', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto(`/demandas/${await demandaDoSeed(page, TITULOS_DO_E2E.awaveEncerrada)}`);
  await expect(page.getByText('Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em Encerrada, um status final: não há confirmação a fazer.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar demanda' })).toHaveCount(0);
});

test('demanda de pessoa: sem seção, sem item em "Nesta página", sem selo', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto(`/demandas/${await demandaDoSeed(page, TITULOS_DO_E2E.etapasSemVersoes)}`);
  await expect(page.getByRole('heading', { name: 'Confirmação do Awave' })).toHaveCount(0);
  await expect(page.getByText('Aguardando confirmação', { exact: true })).toHaveCount(0);
});
```

Acrescente o caso do IN-07 no molde do teste de hoje de Server Action com `Origin` de outro site (C-15) em
`e2e/seguranca.spec.ts`: a ação de confirmar, chamada com outra origem, é recusada e a demanda continua aguardando.

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test:e2e`.
- [ ] **Passo 3: implementar** — na página: `origem = origemDoResponsavel(d.responsavel)`; `estado =
  estadoDaConfirmacao({ origem, status: d.status, historico })`; `aguardaConfirmacaoDoAwave: estado.tipo ===
  'aguardando'` em `DadosDasEtapas`; selo depois do de rascunho só em `aguardando`; "Origem" antes de "Criada por" nos
  Dados (`ROTULO_ORIGEM`); seção `ID_SECAO.confirmacao` depois de Dados (e em "Nesta página") só quando `estado.tipo !==
  'nao_se_aplica'`, com `<section aria-labelledby>` e `h2 tabIndex={-1}`; `GRADE` de `repeat(5,auto)` para
  `repeat(6,auto)`. `ConfirmarDemanda.tsx` (`'use client'`) no molde de `MudarStatus.tsx`: três parágrafos (o segundo
  com `id="confirmacao-consequencia"`), botão primário de 44 px (`max-md:w-full`) com `aria-describedby`, "Confirmando…"
  e desabilitado durante o envio com `aria-busy` na seção, `confirmarDemandaNoPainel({ id })`, sucesso por
  `RegiaoAviso` montada desde o início, `router.refresh()` e foco no `h2`; erro por `Alerta` com foco e o prefixo "Não
  foi possível concluir: " pela `errosDoResultado` de hoje. Nome da pessoa e título só como texto (C-18). Estado
  "confirmada": "Confirmada por <ator> em <time>." e "Desde a confirmação, a demanda segue o fluxo de qualquer outra."
- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm test:e2e` (cada teste abaixo de 24 s), `pnpm lint`, `pnpm typecheck`;
  G4 vazio.

### T19. Decisão: "Recebido pelo /construir em …" e o texto novo da seção do pedido (RF-15, CA-16.3)

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-15 (CA-15.1, CA-15.2, CA-15.4), RF-16
(CA-16.3), D-11

**Arquivos:**
- Modificar: `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`, `src/components/dados-da-decisao.ts`
  (`TEXTOS_DECISAO.recebido`, `linhaDoRecebimento`), `src/components/dados-do-pedido.ts` (`TEXTOS_PEDIDO.texto`)
- Criar: `src/components/recebimento.test.ts`, `e2e/recebido-construir.spec.ts`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/components/recebimento.test.ts — RF-15 (CA-15.1, CA-15.2) e CA-16.3.
import { expect, it } from 'vitest';
import { linhaDoRecebimento, TEXTOS_DECISAO } from './dados-da-decisao';
import { TEXTOS_PEDIDO } from './dados-do-pedido';

it('CA-15.2: sem pedido_recebido, a linha não existe', () => expect(linhaDoRecebimento(null)).toBeNull());
it('CA-15.1: "Recebido pelo /construir em <data e hora>." com o ISO', () => {
  const em = new Date('2026-11-11T17:32:00Z');
  const l = linhaDoRecebimento(em)!;
  expect(l.iso).toBe(em.toISOString());
  expect(l.texto).toMatch(/^Recebido pelo \/construir em 11\/11\/2026 às 14:32\.$/);
  expect(TEXTOS_DECISAO.recebido('11/11/2026 às 14:32')).toBe('Recebido pelo /construir em 11/11/2026 às 14:32.');
});
it('CA-16.3: o texto da seção não diz mais que o envio é só manual', () => {
  expect(TEXTOS_PEDIDO.texto).toBe(
    'Gere o pedido. Com a busca automática do /construir ligada, ele pega o pedido gerado na busca seguinte (a cada 5 minutos), e o recebimento aparece no topo desta página. Com a busca desligada, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma.',
  );
});
```

```ts
// e2e/recebido-construir.spec.ts — CA-15.1 e CA-15.4. Conta "cto"; só leitura.
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, semViolacoesNasDuasLarguras, test } from './apoio';

test('T11 com o pedido recebido: a linha no cabeçalho e axe nas duas larguras', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.pedidoRecebido);
  const d = await api<{ pacotesDecisao: { id: string }[] }>(page, 'GET', `/api/demandas/${id}`);
  await page.goto(`/pacotes-decisao/${d.pacotesDecisao[0]!.id}`);
  const linha = page.getByText(/^Recebido pelo \/construir em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.$/);
  await expect(linha).toBeVisible();
  await expect(linha.locator('time')).toHaveAttribute('datetime', /Z$/);
  await semViolacoesNasDuasLarguras(page, 'T11 com recebimento');
});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test src/components/recebimento.test.ts` e `pnpm test:e2e`.
- [ ] **Passo 3: implementar** — a página lê `recebimentoDoPedido(deps.db, p.id)` (T10) depois de autorizar
  `ler_pacote_decisao` (o que já faz) e põe a linha depois de "Repositório destino": ícone de visto SVG
  `aria-hidden="true"` na cor `positivo`, texto em `tinta` com `<time dateTime>` por `formatarDataHora`; a linha aparece
  em toda situação do DEC; `TEXTOS_PEDIDO.texto` com o texto novo da 03, 6.2.
- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`; G4 vazio.

### T20. e2e das integrações contra o build de produção, tokens do e2e local e versão 0.3.0

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo (infraestrutura de teste; tokens só num banco descartável) ·
**Cobre:** RF-09 (CA-09.1, CA-09.3 pelo `proxy.ts` de verdade), RF-12 a RF-14 (CP-7 ponta a ponta), RF-16 (versão),
IN-04 (tokens do e2e), IN-15 (Bearer sem `Origin` no build), RNF-10 (e2e três vezes), D-10

**Arquivos:**
- Modificar: `e2e/servidor.ts`, `playwright.config.ts`, `package.json` (`version` 0.3.0), `test/estatico/projeto.test.ts`
  (G5)
- Criar: `e2e/integracoes.ts`, `e2e/integracoes.spec.ts`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// e2e/integracoes.ts — os tokens do e2e local (D-10). Sem o arquivo (homologação), devolve null e o teste pula.
import { existsSync, readFileSync } from 'node:fs';

export type TokensDoE2e = { awave: string; construir: string };
export function tokensDoE2e(): TokensDoE2e | null {
  const arquivo = process.env.E2E_ARQUIVO_TOKENS;
  if (!arquivo || !existsSync(arquivo)) return null;
  return JSON.parse(readFileSync(arquivo, 'utf8')) as TokensDoE2e;
}
export const MOTIVO_SEM_TOKENS = 'exige os tokens do e2e local (e2e/servidor.ts); na homologação, a V-01 e a V-02 da 09 cobrem';
```

```ts
// e2e/integracoes.spec.ts — Bearer sem Origin passa pelo build de produção (proxy.ts, CSP); o /construir de ponta a ponta.
import { createHash } from 'node:crypto';
import { request as novoContexto } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, test } from './apoio';
import { MOTIVO_SEM_TOKENS, tokensDoE2e } from './integracoes';

const tokens = tokensDoE2e();

test('CA-09.1: o Awave cria e lê a própria demanda, sem Origin', async ({ baseURL }) => {
  test.skip(tokens === null, MOTIVO_SEM_TOKENS);
  const ctx = await novoContexto.newContext({ baseURL, extraHTTPHeaders: { authorization: `Bearer ${tokens!.awave}`, accept: 'application/json' } });
  const r = await ctx.post('/api/demandas', {
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify({ titulo: 'Relatório do e2e (fictício)', tipo: 'melhoria', solicitanteNome: 'Awave', solicitantePapel: 'outro', descricaoProblema: 'Texto fictício.', contexto: 'Aberta pelo e2e.' }),
    maxRedirects: 0,
  });
  expect(r.status()).toBe(201);
  const { id } = (await r.json()) as { id: string };
  const lida = await ctx.get(`/api/demandas/${id}`);
  expect(Object.keys(await lida.json()).sort()).toEqual(['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
  await ctx.dispose();
});

test('CP-7: pendentes, entrega sem corpo e recebimento pelo SHA-256', async ({ page, baseURL }) => {
  test.skip(tokens === null, MOTIVO_SEM_TOKENS);
  await entrarComo(page, 'cto');
  const dem = await demandaDoSeed(page, TITULOS_DO_E2E.pedidoParaBuscar);
  const decId = (await api<{ pacotesDecisao: { id: string }[] }>(page, 'GET', `/api/demandas/${dem}`)).pacotesDecisao[0]!.id;
  const ctx = await novoContexto.newContext({ baseURL, extraHTTPHeaders: { authorization: `Bearer ${tokens!.construir}`, accept: 'application/json' } });
  const pendentes = async () => ((await (await ctx.get('/api/pedidos-construcao/pendentes')).json()) as { itens: { decId: string }[] }).itens.map((i) => i.decId);
  test.skip(!(await pendentes()).includes(decId), 'exige banco recém-semeado: o pedido do seed já foi recebido');
  const entrega = await ctx.post(`/api/pedidos-construcao/${decId}/entrega`, { maxRedirects: 0 });
  expect(entrega.status()).toBe(200);
  const texto = await entrega.text();
  const sha256 = createHash('sha256').update(texto, 'utf8').digest('hex');
  const errado = await ctx.post(`/api/pedidos-construcao/${decId}/recebimento`, { headers: { 'content-type': 'application/json' }, data: JSON.stringify({ sha256: '0'.repeat(64) }) });
  expect(errado.status()).toBe(409);
  const certo = await ctx.post(`/api/pedidos-construcao/${decId}/recebimento`, { headers: { 'content-type': 'application/json' }, data: JSON.stringify({ sha256 }) });
  expect(certo.status()).toBe(204);
  expect(await pendentes()).not.toContain(decId);
  await ctx.dispose();
});
```

E em `test/estatico/projeto.test.ts`: 0.2.0 → 0.3.0 (G5).

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test:e2e` (sem tokens, os dois pulam; a falha esperada é a do teste
  estático da versão em `pnpm test`).
- [ ] **Passo 3: implementar**
  - `playwright.config.ts`: sem `BASE_URL`, `process.env.E2E_ARQUIVO_TOKENS ??= join(mkdtempSync(join(tmpdir(),
    'ws-orq-e2e-')), 'tokens.json')` (só o processo principal cria a pasta; os workers e o `webServer` herdam a
    variável). Nada muda com `BASE_URL`.
  - `e2e/servidor.ts`, depois do seed: dois `criarTokenDeIntegracao` numa transação do pool do app e
    `writeFileSync(process.env.E2E_ARQUIVO_TOKENS, JSON.stringify({ awave, construir }), { mode: 0o600, flag: 'wx' })`;
    nunca escreve token na saída; em `encerrar`, `rmSync(dirname(arquivo), { recursive: true, force: true })`.
  - `package.json`: `"version": "0.3.0"`.
- [ ] **Passo 4: verificar** — `pnpm test`, `pnpm lint`, `pnpm typecheck` e **`pnpm test:e2e` três vezes seguidas,
  verde** (RNF-10), com a duração do teste mais longo na entrega; nenhum `tokens.json` sobra em `tmpdir()` depois da
  terceira execução; G4 vazio.

---

## Verificação na homologação (montagem para a `09-entrega`)

**V-01 (CP-9, CA-13.6):** subir a homologação do ramo com o `docker-compose.hml.yml` (seed fictício da T15: o DEC de
`pedidoParaBuscar` pendente e o de `pedidoRecebido` já recebido); esperar `GET /api/saude` = 200; emitir **dentro** da
homologação um token `construir` com `pnpm tsx scripts/criar-token-servico.ts --integracao construir` e levá-lo para um
arquivo com permissão 600 numa pasta temporária fora de qualquer repositório, sem que o valor passe pelo terminal, pela
entrega ou pelo log; montar uma pasta temporária de pedidos com `config/orquestrador.json` ligado, no formato que
`estruturaAutonoma/ferramentas/construir/buscar-pedidos.mjs` lê, apontando para `http://127.0.0.1:<HML_PORTA>` e para
o arquivo do token; rodar o `buscar-pedidos.mjs` com `CONSTRUIR_PEDIDOS` nessa pasta. Esperado: sai 0, grava
`<DEC-id>.json` do `pedidoParaBuscar` com os bytes da entrega e situação `gravado`; uma segunda execução lista 0
pendentes. No fim, derrubar com volumes e apagar as pastas temporárias. A entrega da 09 cita os dois resultados.

**V-02 (CP-6 na homologação):** com um token `awave` emitido do mesmo jeito, um `POST /api/demandas` com o corpo do
Awave, Bearer e **sem** `Origin` responde 201 com as seis chaves.

**RNF-01 e RNF-02:** medidos na homologação pela 09 (D-21 para o RNF-01).

---

## Cobertura

### RF → tarefas

| RF | Tarefas |
|---|---|
| RF-01 | T01, T02, T03, T06 (CA-01.3, CA-01.4) |
| RF-02 | T14 |
| RF-03 | T02, T03, T11 (rotas novas na matriz × rotas) |
| RF-04 | T06, T16 (CA-04.7) |
| RF-05 | T06, T08 |
| RF-06 | T08, T17, T18 |
| RF-07 | T05, T06 (CA-07.4) |
| RF-08 | T04, T06 |
| RF-09 | T06, T11, T20 |
| RF-10 | T07, T16, T18 |
| RF-11 | T03 (fora de `AGENTES`), T06 (CA-11.1 API, CA-11.3), T01 (CA-11.2) |
| RF-12 | T10, T11 |
| RF-13 | T09, T11 |
| RF-14 | T10, T12 |
| RF-15 | T02 (textos e ator), T10 (leitura), T18 (histórico na tela), T19 |
| RF-16 | T19 (CA-16.3), T20 (versão); manual, `docs/operacao` e CHANGELOG na `10-documentacao` (G2) |

### Controles da 04 → tarefas

| Controle | Tarefas |
|---|---|
| IN-01 | T02 (`permitido`), T03 (a, b, c, d), T11 (rotas novas pela matriz × rotas) |
| IN-02 | T02, T05, T06, T07, T08 (inventário G8) |
| IN-03 | T01 (CHECK), T03 |
| IN-04 | T14, T13 (token fora de log e eventos), T15 (seed sem token), T20 (tokens do e2e) |
| IN-05 | T01 (CHECK), T06 |
| IN-06 | T06 (criação), T08 (gatilhos e worker) |
| IN-07 | T08, T18 (Origin de outro site) |
| IN-08 | T05, T06 (201 com seis chaves) |
| IN-09 | T04, T06 |
| IN-10 | T09, T10, T11 |
| IN-11 | T12 |
| IN-12 | T01 (CHECK), T06, T08, T11, T12, T13 |
| IN-13 | T02 |
| IN-14 | T04, T06 (503), T13 (log) |
| IN-15 | G4 em toda revisão; T06 (CA-09.1, 09.2, 09.4), T11 (CA-09.3), T20 (build de produção) |
| IN-16 | T03 (piso de D-17), T16 (`origem` refletida) e G5 |
| IN-17 | T01, T15 |
| IN-18 | T14 (D-20, parte verificável); o texto na `10-documentacao` |

### Critérios preliminares do pedido → tarefas

CP-1: T06, T16. CP-2: T03, T05, T06. CP-3: T06, T08. CP-4: T04, T06. CP-5: T03, T06, T14. CP-6: T06, T20, V-02. CP-7:
T10, T11, T12, T19, T20. CP-8: T03, T11. CP-9: T11 (CA-13.6), V-01.
