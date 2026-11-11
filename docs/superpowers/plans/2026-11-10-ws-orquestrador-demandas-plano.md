# Plano de implementação — ws-orquestrador-demandas 0.2.0: novo visual do painel

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou
> superpowers:executing-plans para executar este plano tarefa por tarefa. No /construir, cada tarefa é uma passagem
> `06-Tnn-construcao` do engenheiro indicado, seguida de `06-Tnn-revisao` (tech-lead) e `06-Tnn-testes`
> (qa-automacao). O commit é do maestro. Os passos usam caixa (`- [ ]`): o status report diário lê esses checkboxes.

**Objetivo:** dar ao painel do Orquestrador (0.1.13, no ar) a identidade da WS e uma tela de decisão boa no celular,
mexendo **só na camada visual**: casca da proposta A (menu lateral marinho, gaveta no celular), fila com contadores que
filtram e cartões abaixo de 768 px, demanda com barra de etapas e "Próxima ação", decisão por três botões com o arranjo
C2 em 390 px, tokens e fontes Noto servidas pelo próprio app. Nenhuma rota, Server Action, esquema, migration, papel,
permissão ou cabeçalho muda; nenhum controle de segurança é afrouxado.

**Arquitetura:** a mesma da 0.1.13 (monólito modular, Next 16 App Router). Muda a apresentação: tokens no `@theme` de
`src/app/globals.css`, fontes por `next/font/local` sobre `@fontsource` (ADR-13), casca em `src/components/casca/`,
regras de exibição em funções puras `src/components/dados-*.ts` (ADR-17), duas leituras novas só SELECT em
`src/modules/demandas/resumo-da-fila.ts` (ADR-16), T11 com um formulário e três botões de envio (ADR-18), testes nas
duas larguras sem projeto novo do Playwright e com a vigia de origem e CSP em todo e2e (ADR-19).

**Stack:** a do `package.json` de hoje (Node 24, pnpm 12.6.0, TypeScript strict, Next 16.4.1, React 19.2.8, Tailwind
4, Drizzle 0.45.3, Zod 4.6.6, Better Auth 1.7.7, Vitest 5.0.2 + Testcontainers 12.1.0, Playwright 1.63.0 +
`@axe-core/playwright` 4.13.0). Entram só **`@fontsource/noto-sans`** e **`@fontsource/noto-sans-mono`**, em
`devDependencies`, versão exata, pelo comando `pnpm add -D -E @fontsource/noto-sans @fontsource/noto-sans-mono` (ADR-13,
único desvio do padrão técnico).

**Fontes:** pedido `DEC-DEM-20261110-0015-v1`; spec aprovada na Parada 1
(`docs/superpowers/specs/2026-11-10-ws-orquestrador-demandas-novo-visual-design.md`, com a decisão P-01 de Fabiano);
entregas `01-analista-requisitos.md` (RF-01 a RF-17, RNF-01 a RNF-14), `02-arquiteto-solucoes.md` (C01 a C16, ADR-13
a ADR-19), `03-ux-ui-design.md` (telas, tokens e textos) e `04-seguranca-aplicacao.md` (CV-01 a CV-20), na pasta
`docs/construcao/DEC-DEM-20261110-0015-v1/`; `padrao-tecnico.md` da estruturaAutonoma.

---

## Restrições globais (valem para toda tarefa)

### G1. Quem edita o quê

| Engenheiro | Edita | Roda |
|---|---|---|
| `engenheiro-frontend` | `src/`, `test/`, `e2e/`, `public/`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `*.config.*` | `pnpm install`, `pnpm add` (só os dois pacotes `@fontsource` deste plano), `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm build` |
| `engenheiro-backend` | `src/`, `test/`, `scripts/`, `package.json`, `pnpm-lock.yaml`, `*.config.*` | `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` |
| `engenheiro-dados-bd` | `src/modules/`, `test/`, `scripts/` | `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck` |

Consequências que o plano já respeita: só o `engenheiro-frontend` escreve `e2e/` e roda `pnpm test:e2e`; o seed
fictício (`scripts/`) é do `engenheiro-backend` (T06); `public/` **não** é usado (ADR-13: a imagem final não o copia).

### G2. Fora das tarefas da 06 (cada item tem etapa dona)

| Item | Etapa dona |
|---|---|
| Foco, teclado, leitura e anúncios que o axe não pega (03, seção 10; CA-03.2, CA-04.x, CA-12.3 conferidos à mão) | `07-qa-funcional` |
| `/security-review` com foco em CSP, T11 e capturas; `pnpm audit --prod --audit-level high` limpo e, uma vez, `pnpm audit --audit-level high` sem `--prod` (a imagem leva as `devDependencies`) ou a lacuna registrada; diff de `package.json`, `pnpm-lock.yaml` e `pnpm-workspace.yaml` linha a linha (CV-05); cada PNG aberto e conferido contra o `scripts/seed-ficticio.ts` (CV-17); contagem de `expect(` por arquivo (CV-20, CA-16.1); CV-01 de novo | `08-revisao` (maestro) e `08-reteste` |
| `docker build`, CI e homologação (`construir.mjs homologar`), ensaio de rollback | `09-entrega` (`devops-sre`) |
| `CHANGELOG.md` 0.2.0 (o que mudou, o que ficou fora, versões exatas dos dois `@fontsource`, pendências), manual cap. 08 (casca, gaveta, contadores, barra de etapas, Próxima ação com as tabelas do RF-08 e RF-09, T11 nas duas larguras) citando as nove capturas da T17 | `10-documentacao` (`documentacao-tecnica`) |
| UAT da T11 em 390 px num iPhone com Safari (teclado virtual sobre o rodapé, área segura, `<dialog>`, `:has()`) e a publicação da 0.2.0 | Fabiano, depois do PR |

### G3. Código

1. **TDD:** o teste é escrito antes e visto falhando; a entrega mostra o comando e o trecho da falha. Ao fim de cada
   tarefa, `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes, e `pnpm test:e2e` verde nas tarefas do
   `engenheiro-frontend`.
2. **Teste que já existe muda só seletor, texto literal ou o passo de interação equivalente** (CA-16.2, CV-20). Nunca
   se apaga asserção, nunca se desliga regra do axe, nunca se sobe `retries` ou tempo-limite, nunca `bypassCSP`. A
   lista de mudanças previstas em teste existente está em G5; mudança fora dela vai explicada na entrega, trecho a
   trecho.
3. **Dados só fictícios** (JUR-2026-002, 7.4): títulos com "(fictício)", nomes "Pessoa Ficticia …", domínios `.test`.
4. **Nada de fora:** nenhum `style=`, `dangerouslySetInnerHTML`, `<link>`/`<script>` absoluto, `@import` com URL,
   `url(` em CSS, `next/font/google`, Google Fonts nem `.style` do objeto de fonte (CV-02, teste da T01). Ícone, marca de
   etapa, visto e chevron são SVG no JSX com `aria-hidden="true"` ou CSS puro. Trava de rolagem e estado visual por
   classe (`classList`), nunca por `element.style`.
5. **Cor só por token:** hexadecimal só no `@theme` de `globals.css` (e o QR da T02). Componente novo usa os nomes da
   03 (`marinho`, `acao`, `acao-escura`, `tinta`, `tinta-media`, `tinta-suave`, `linha`, `superficie`, `branco`,
   `nevoa`, `erro`…), nunca os nomes de hoje (`texto`, `primaria`, `borda`…), que somem na T16 (D-01).
6. **Responsivo por CSS** (`md:` = 768 px, `xl:` = 1200 px no ponto de quebra do computador da 03): um DOM por tela.
   Exceção: a gaveta (estado aberto/fechado).
7. **Regra de exibição** só em função pura de `src/components/dados-*.ts`, com teste de unidade; regra de negócio
   continua só em `src/modules/`. Componente de exibição não importa `autorizar`, `db`, `lib/deps` nem Server Action.
8. **Relógio injetado:** "Idade" usa `deps.relogio.agora()` lido pela página; `Date.now()` e `new Date()` sem
   argumento continuam proibidos fora de `relogio.ts` (teste estático de hoje).
9. **Textos** são os de `03-ux-ui-design.md`, seção 9, por inteiro; texto que não muda é a constante de hoje.
10. **Limite C-36 do e2e:** a conta "cto" já usa 27 das 30 demandas por hora na suíte (cabeçalho do seed). Teste novo
    **não cria demanda pela API**: usa as demandas do seed criadas na T06. ESP, RSK e DEC pela API são permitidos.
11. **Porta 3101**, a de hoje; e2e só contra `next start` (`e2e/servidor.ts`) ou homologação, nunca `next dev`.

### G4. Superfícies congeladas (CV-01) — conferidas pelo tech-lead em toda revisão e na 08

O comando abaixo tem de sair **vazio** em toda revisão de tarefa:

```
git diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"
```

Os **nove arquivos com `'use server'`** (conferidos em 10/11 com `git grep -l "^'use server'" -- src`):

1. `src/app/(painel)/configuracao/agentes/acoes.ts`
2. `src/app/(painel)/demandas/[id]/acoes.ts`
3. `src/app/(painel)/demandas/[id]/editar/acoes.ts`
4. `src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts`
5. `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts`
6. `src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts`
7. `src/app/(painel)/demandas/nova/acoes.ts`
8. `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts`
9. `src/app/(painel)/pacotes-decisao/[decId]/acoes.ts`

Além disso: `git diff 198e97d --stat -- src/modules` só pode listar `src/modules/demandas/resumo-da-fila.ts` e o
teste dele (CA-15.2); `package.json` só muda em `version` (T17) e nas duas linhas `@fontsource` (T02) (CV-05); nenhum
arquivo `'use server'` novo. Arquivo `'use server'` alterado, ou `src/modules/` com linha alterada em arquivo que já
existia, é **Critical** na revisão.

### G5. Testes existentes que vão mudar (só seletor, texto ou passo equivalente)

| Arquivo | Muda | Tarefa |
|---|---|---|
| todos os `e2e/*.spec.ts` | `import { expect, test } from '@playwright/test'` vira `from './apoio'` (tipos como `Page` podem continuar de `@playwright/test`) | T01 |
| `test/estatico/painel-qa.test.ts` | a tabela de tokens passa a ser a da 03, 2.1 (valores novos, mesmo teste "os tokens são os da 03"); o foco passa a `var(--cor-foco)`; `--radius-campo` 10px | T03 |
| `src/components/rotulos.test.ts`, `src/components/componentes.test.ts` | `CorSelo` e `COR_*` com os nomes da 03, 2.5 (D-03); classes dos componentes | T03 |
| `src/app/(painel)/demandas/fila-qa.test.ts` | a regex `bg-${COR_STATUS[st]}-100` vira `data-cor="${COR_STATUS[st]}"` (D-15) | T03 |
| `src/components/componentes.test.ts`, `componentes-qa.test.ts`, `e2e/moldura.spec.ts` | `CabecalhoPainel` (mesmo nome, agora o `header` da casca): `aria-controls` vira `gaveta-menu`, classes e marcação do menu lateral | T05 |
| `e2e/fila.spec.ts`, `e2e/fila-qa.spec.ts` | o foco vai ao `h2#resultado-da-fila` (antes, `caption`); o filtro de status passa pelo contador (o seletor "Status" sai); coluna "Criada em" vira "Idade" | T09 |
| `e2e/detalhe-demanda.spec.ts` | o histórico deixa de ser tabela e vira lista (`ol`) | T11 |
| `e2e/decisao.spec.ts`, `src/components/dados-da-decisao.test.ts`, `e2e/pedido-construcao.spec.ts` | marcar o rádio "Aprovar"/"Devolver…"/"Arquivar" e clicar "Registrar decisão" vira ativar "Aprovar a opção X", "Devolver" ou "Arquivar"; textos `dicaDevolver`, `referencia`, `dataAssinatura` | T12 |
| `e2e/axe-todas.spec.ts` | `semViolacoes(` vira `semViolacoesNasDuasLarguras(` (cada estado conferido também em 390 × 844, D-06) | T16 |
| `test/estatico/projeto.test.ts` | versão 0.1.13 vira 0.2.0 | T17 |

### G6. Decisões desta etapa

| Id | Decisão | Razão |
|---|---|---|
| D-01 | **Nomes dos tokens (divergência 7.3):** a paleta tem os nomes da 03, 2.1 (`--color-marinho`, `--color-acao`, `--color-acao-escura`, `--color-tinta`…), com o valor exato do manual. Os nomes de hoje (`texto`, `texto-suave`, `fundo`, `fundo-suave`, `borda`, `primaria`, `perigo`, `sucesso`, `atencao-texto`) ficam **só durante a construção**, como apelidos por `var()` para a paleta (T03), e saem na T16, com um teste estático que reprova classe antiga e classe da paleta do Tailwind | O fim é o da 03 (um nome por cor; `primaria` não pode ser ao mesmo tempo preenchimento `acao` e link `acao-escura`, nem `borda` ser campo e divisória); o meio é o do ADR-14 (as telas ainda não migradas continuam certas e com contraste a cada tarefa, sem regressão em 12 telas de uma vez). O apelido `primaria` aponta para `acao-escura` (7,1:1 como texto e como fundo de texto branco) |
| D-02 | **Recolhível (divergência 7.3):** componente `Recolhivel` da 03 (botão com `aria-expanded` e `aria-controls`, só abaixo de 768 px; o bloco fica sempre visível a partir de 768 px, sem botão), não `<details>` | A partir de 768 px o conteúdo tem de estar aberto e sem controle; `<details>` não faz isso só com CSS em todos os navegadores, e a 03 (seção 10) pede `aria-expanded` e `aria-controls`. Continua sem dependência (RNF-10). O resto do ADR-18 (um formulário, três `submit`, arranjo por CSS) fica |
| D-03 | `CorSelo` passa a ter os nomes da 03, 2.5 (`azul`, `violeta`, `ambar`, `petroleo`, `verde`, `marinho`, `verde-cheio`, `laranja`, `cinza`, `vermelho`) e `COR_STATUS`, `COR_DECISAO`, `COR_NIVEL` e os selos fixos seguem a tabela da 03, 2.5 | O 02 delegou os valores de selo à 03 ("os valores finais de estado, selo e foco são da ux-ui-design"); manter as chaves de hoje não dá o mapa da 03 (`amber` seria âmbar em "Aguardando" e petróleo em "Decisão pendente") |
| D-04 | **Capturas (pendência do ADR-19):** `e2e/capturas.spec.ts` (T17) grava cada PNG **só se o arquivo ainda não existe**; as nove nascem no `pnpm test:e2e` da T17 e o maestro as commita nessa passagem. Rodadas seguintes pulam (árvore limpa). Se uma correção da 08 mudar o visual de tela capturada, o engenheiro põe o nome dela em `REGRAVAR` no spec, roda `pnpm test:e2e` e volta `REGRAVAR` a `[]` na mesma passagem | Evita regravar PNG a cada execução (datas do seed) e cabe na lista Pode do `engenheiro-frontend`, que roda `pnpm test:e2e` mas não copia nem apaga arquivo |
| D-05 | O e2e do Enter (CV-10) usa o campo **"Identificador do documento assinado"** (`<input>`); em "Comentários" (`<textarea>`) o Enter é quebra de linha e o teste confere que **nada** é enviado | O controle do CV-10 é "todo envio passa por validação e diálogo"; numa `<textarea>` o Enter não envia formulário, e o teste literal do 04 não teria o que provar |
| D-06 | Axe nas duas larguras **no mesmo estado**: `semViolacoesNasDuasLarguras(page, rotulo)` roda o axe em 1280 × 720, troca para 390 × 844, roda de novo e volta | Repetir os testes da `axe-todas` em outra largura criaria demandas pela API e estouraria o C-36 (G3.10) |
| D-07 | Demandas novas dos e2e vêm do seed fictício (T06), uma por cenário que grava decisão ou precisa de estado fixo | C-36 e independência entre testes (a decisão é imutável e A-02 permite um DEC aprovado por demanda) |
| D-08 | `src/app/(painel)/demandas/leituras-da-fila.ts` (só servidor) embrulha as leituras novas: `contagemOuNada` (com o log `painel_contadores_falhou`) e `etapasDaPagina`. `resumo-da-fila.ts` só é importado por ele, e ele só pela página da T03 | Dá ao CV-08 um teste de unidade sem renderizar página e mantém a cadeia de importação conferível (CV-06) |
| D-09 | A gaveta só monta a navegação **enquanto aberta** | No HTML estático há um só `nav "Principal"` e um só `aria-current`, como o `componentes-qa.test.ts` exige hoje (sem trocar a regra do teste) |
| D-10 | `proximaAcao` devolve o destino como `{ tipo: 'pagina', href }` ou `{ tipo: 'secao', secao: 'duvidas' \| 'status' }`; o componente traduz `secao` para `ID_SECAO` | A função fica sem importar de `src/app/`; o `href` de página é conferível pelo CV-19 |
| D-11 | `dados-das-etapas.ts` declara `RE_ID_DEMANDA_NA_TELA` igual à de `src/modules/demandas/gerar-id.ts`; o teste confere que as duas têm o mesmo `source` | O CV-09 só permite `import type` de `src/modules/`; é o padrão de hoje para mensagens copiadas (`dados-da-decisao.ts`) |
| D-12 | Piso de asserções por arquivo como teste (`test/estatico/piso-de-assercoes.test.ts`), com os números de 198e97d | Torna o CV-20 automático em toda tarefa, não só na 08 |
| D-13 | A versão exata dos dois `@fontsource` é a que o `pnpm add -D -E` resolver na T02; vai para a entrega da T02 e para o CHANGELOG | O tech-lead não tem acesso ao registro; inventar o número seria pior |
| D-14 | **P-01 (Fabiano, Parada 1):** nenhuma opção vem marcada (CV-13), a recomendação aparece em texto antes das opções, sem selo "Recomendada" | Decisão da Parada 1; selo exigiria campo novo no DEC, fora deste pedido |
| D-15 | `Selo` ganha `data-cor={cor}` | Teste de cor deixa de depender de nome de classe |
| D-16 | `RevisaoDoPacote` passa a ter duas partes: a sempre visível (ESP citada com selo, sistema alvo, repositório destino, RSK citado com selo, três níveis, nível de aprovação) e a de detalhe (critérios de aceite e definição de pronto), por `separarRevisao` (pura, em `dados-da-decisao.ts`) | CV-12 estreita a 6.3 da 03: só critérios, definição de pronto e o detalhe das opções podem ficar no recolhível |

### G7. Nomes que várias tarefas usam

```ts
// src/modules/demandas/resumo-da-fila.ts (T07)
export type ContagemPorStatus = { porStatus: Record<Status, number>; todas: number };
export type EtapasNaFila = { esp: boolean; rsk: boolean; dec: boolean };
export async function contarDemandasPorStatus(db: Db, filtro: Pick<FiltroDemandas, 'tipo' | 'linhaServicoProvavel'>): Promise<ContagemPorStatus>;
export async function etapasDasDemandas(db: Db, ids: readonly string[]): Promise<Map<string, EtapasNaFila>>;

// src/components/dados-da-fila.ts (T08)
export type ContadorDaFila = { status: Status | null; rotulo: string; total: number | null; pressionado: boolean; href: string; valor: string; cor: CorSelo | null };
export function contadoresDaFila(c: ContagemPorStatus | null, f: FiltroDemandas, href: (f: FiltroDemandas, offset: number) => string): ContadorDaFila[];
export function idadeDaDemanda(criadaEm: Date, agora: Date): { texto: string; data: string; iso: string };
export function textoDasEtapas(e: EtapasNaFila): string;

// src/components/dados-das-etapas.ts (T10)
export function etapasDaDemanda(x: DadosDasEtapas): EtapaDaDemanda[];
export function proximaAcao(x: DadosDasEtapas): ProximaAcao;

// src/components/dados-da-decisao.ts (T12, T13)
export function envioDaDecisao(v: ValoresDaDecisao, ctx: ContextoDoFormulario, valorDoBotao: string | null | undefined): EnvioDaDecisao;
export function rotuloDoPrincipal(v: Pick<ValoresDaDecisao, 'opcaoEscolhida'>, ctx: Pick<ContextoDoFormulario, 'opcaoFixada' | 'aprovarIndisponivel'>): string;
export function separarRevisao(itens: readonly ItemDaRevisao[]): { sempre: ItemDaRevisao[]; detalhe: ItemDaRevisao[] };

// src/components/Recolhivel.tsx (T09), e2e/apoio.ts (T01, T16)
export function Recolhivel(p: { id: string; rotulo: string; children: ReactNode }): JSX.Element;
export const test; export const expect; // com a vigia de origem e CSP
export async function semViolacoesNasDuasLarguras(page: Page, rotulo: string): Promise<void>;
```

---

## Fase 1 — Vigilância (antes de qualquer troca visual)

### T01. Vigia de origem e CSP em todo e2e, teste estático de recurso externo e piso de asserções

**Engenheiro:** `engenheiro-frontend` · **Risco:** alto (controle de segurança CV-02/CV-03, pedido da 04 como primeira
tarefa) · **Cobre:** CV-02, CV-03, CV-20 (piso automático), RNF-07, RNF-08, RF-16 (CA-02.1, CA-02.3), parte de RF-15

**Arquivos:**
- Criar: `e2e/vigia.ts` (funções puras), `e2e/vigia.spec.ts` (teste negativo),
  `test/estatico/sem-recurso-externo.test.ts`, `test/estatico/vigia.test.ts`, `test/estatico/piso-de-assercoes.test.ts`
- Modificar: `e2e/apoio.ts` (exporta `test` e `expect` com a fixture automática), todos os `e2e/*.spec.ts` (só a linha
  de importação, G5)

**Interfaces produzidas:** `test` e `expect` de `e2e/apoio.ts`; `origemDaUrl`, `problemasDaVigia`, `Coletor` de
`e2e/vigia.ts`.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// test/estatico/sem-recurso-externo.test.ts — CV-02 (04): nada de recurso de outra origem no código.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ESTE = 'test/estatico/sem-recurso-externo.test.ts';

type Regra = { nome: string; arquivos: RegExp; padrao: RegExp };
const REGRAS: readonly Regra[] = [
  { nome: 'Google Fonts', arquivos: /./, padrao: /fonts\.(?:googleapis|gstatic)\.com/i },
  { nome: 'next/font/google', arquivos: /./, padrao: /next\/font\/google/ },
  { nome: '@import com URL', arquivos: /./, padrao: /@import\s+(?:url\(\s*)?['"]?(?:https?:)?\/\//i },
  { nome: '<link> ou <script> absoluto', arquivos: /./, padrao: /<(?:link|script)\b[^>]*\b(?:href|src)\s*=\s*\{?\s*['"`](?:https?:)?\/\//i },
  { nome: 'url( em CSS', arquivos: /^src\/.*\.css$/, padrao: /url\(/i },
  { nome: 'style={', arquivos: /^src\/.*\.tsx$/, padrao: /\bstyle=\{/ },
  { nome: 'dangerouslySetInnerHTML', arquivos: /^src\/.*\.tsx?$/, padrao: /dangerouslySetInnerHTML/ },
  { nome: '.style da fonte', arquivos: /^src\//, padrao: /\b(?:fonteSans|fonteMono)\.style\b/ },
  { nome: 'endereço absoluto na interface', arquivos: /^src\/(?:app|components)\/.*\.(?:tsx?|css)$/, padrao: /https?:\/\/(?!www\.w3\.org\/2000\/svg)[a-z0-9-]+(?:\.[a-z0-9-]+)+/i },
];

export function achados(arquivo: string, fonte: string): string[] {
  return REGRAS.filter((r) => r.arquivos.test(arquivo) && r.padrao.test(fonte)).map((r) => `${arquivo}: ${r.nome}`);
}

const arquivos = [
  ...globSync('src/**/*.{ts,tsx,css}', { cwd: raiz }).filter((a) => !/\.test\.tsx?$/.test(a)),
  ...globSync('e2e/**/*.ts', { cwd: raiz }),
  ...globSync('test/**/*.ts', { cwd: raiz }).filter((a) => a !== ESTE),
  ...globSync('{next,playwright,postcss}.config.*', { cwd: raiz }),
].sort();

describe('CV-02: sem recurso externo', () => {
  it('a varredura enxerga o código (falha se o glob quebrar)', () => {
    expect(arquivos).toEqual(expect.arrayContaining(['src/app/globals.css', 'src/app/layout.tsx', 'e2e/apoio.ts', 'next.config.ts', 'playwright.config.ts']));
  });

  it('cada regra reprova a forma plantada', () => {
    expect(achados('src/app/globals.css', "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans');")).toEqual([
      'src/app/globals.css: Google Fonts',
      'src/app/globals.css: @import com URL',
      'src/app/globals.css: url( em CSS',
    ]);
    expect(achados('src/app/fontes.ts', "import { Noto_Sans } from 'next/font/google';")).toEqual(['src/app/fontes.ts: next/font/google']);
    expect(achados('src/app/layout.tsx', '<link rel="stylesheet" href="https://exemplo.test/x.css" />')).toContain('src/app/layout.tsx: <link> ou <script> absoluto');
    expect(achados('src/app/layout.tsx', '<script src={"//exemplo.test/x.js"} />')).toContain('src/app/layout.tsx: <link> ou <script> absoluto');
    expect(achados('src/app/marca.css', '.m { background: url(data:image/png;base64,AAAA) }')).toEqual(['src/app/marca.css: url( em CSS']);
    expect(achados('src/components/X.tsx', '<div style={{ color: "red" }} />')).toEqual(['src/components/X.tsx: style={']);
    expect(achados('src/components/X.tsx', '<div dangerouslySetInnerHTML={{ __html: t }} />')).toEqual(['src/components/X.tsx: dangerouslySetInnerHTML']);
    expect(achados('src/app/layout.tsx', '<body style={fonteSans.style}>')).toEqual(['src/app/layout.tsx: style={', 'src/app/layout.tsx: .style da fonte']);
    expect(achados('src/components/Marca.tsx', "const logo = 'https://cdn.exemplo.test/logo.svg';")).toEqual(['src/components/Marca.tsx: endereço absoluto na interface']);
  });

  it('deixa passar o que é da casa', () => {
    expect(achados('src/app/globals.css', "@import 'tailwindcss';")).toEqual([]);
    expect(achados('src/components/Icone.tsx', '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" />')).toEqual([]);
    expect(achados('src/components/dados-da-demanda.ts', "'Use um link que comece com http:// ou https://.'")).toEqual([]);
    expect(achados('src/app/layout.tsx', '<html className={`${fonteSans.variable} ${fonteMono.variable}`}>')).toEqual([]);
  });

  it('nenhum arquivo do repositório tem recurso externo', () => {
    expect(arquivos.flatMap((a) => achados(a, readFileSync(`${raiz}${a}`, 'utf8')))).toEqual([]);
  });
});
```

```ts
// test/estatico/vigia.test.ts — CV-03: as funções da vigia e a herança em todo spec.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { origemDaUrl, problemasDaVigia } from '../../e2e/vigia';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const specs = globSync('e2e/**/*.spec.ts', { cwd: raiz }).sort();

describe('vigia de origem e CSP (CV-03)', () => {
  it('origem: http, https e ws do mesmo host são a mesma origem; data, blob e about não têm rede', () => {
    expect(origemDaUrl('http://127.0.0.1:3101/demandas')).toBe('http://127.0.0.1:3101');
    expect(origemDaUrl('ws://127.0.0.1:3101/_next/x')).toBe('http://127.0.0.1:3101');
    expect(origemDaUrl('https://fonts.gstatic.com/s/x.woff2')).toBe('https://fonts.gstatic.com');
    for (const u of ['data:font/woff2;base64,AA', 'blob:http://127.0.0.1:3101/abc', 'about:blank']) expect(origemDaUrl(u)).toBeNull();
  });

  it('o coletor vazio não reprova; com qualquer item, reprova com a URL ou a mensagem', () => {
    expect(problemasDaVigia({ outraOrigem: [], csp: [] })).toEqual([]);
    expect(problemasDaVigia({ outraOrigem: ['https://exemplo.test/x.css'], csp: ['style-src-elem https://exemplo.test/x.css'] })).toEqual([
      'requisição a outra origem: https://exemplo.test/x.css',
      'violação de CSP: style-src-elem https://exemplo.test/x.css',
    ]);
  });

  it('todo spec importa test e expect de ./apoio, nunca o test de @playwright/test', () => {
    expect(specs.length).toBeGreaterThan(20);
    for (const s of specs) {
      const fonte = readFileSync(`${raiz}${s}`, 'utf8');
      expect({ s, deApoio: /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*'\.\/apoio'/.test(fonte) }).toEqual({ s, deApoio: true });
      expect({ s, direto: /import\s*\{[^}]*\b(?<!type\s)test\b[^}]*\}\s*from\s*'@playwright\/test'/.test(fonte) }).toEqual({ s, direto: false });
    }
  });

  it('a configuração não desliga a CSP nem sobe retries', () => {
    const cfg = readFileSync(`${raiz}playwright.config.ts`, 'utf8');
    expect(cfg).not.toMatch(/bypassCSP/);
    expect(cfg).toMatch(/retries:\s*0,/);
  });
});
```

```ts
// test/estatico/piso-de-assercoes.test.ts — CV-20 (04) e D-12: nenhum teste de segurança perde asserção. Piso = linhas
// com "expect(" em 198e97d (git grep -c "expect(" 198e97d, contado pelo tech-lead em 10/11/2026). Só sobe.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const PISO: Readonly<Record<string, number>> = {
  'e2e/seguranca.spec.ts': 28,
  'e2e/seguranca-qa.spec.ts': 38,
  'src/proxy.test.ts': 17,
  'test/estatico/classes-de-erro.test.ts': 4,
  'test/estatico/compose.test.ts': 8,
  'test/estatico/decisao-e2e.test.ts': 37,
  'test/estatico/eslint.test.ts': 5,
  'test/estatico/exigir-pessoa.test.ts': 4,
  'test/estatico/pacote-sem-extras.test.ts': 21,
  'test/estatico/painel-qa.test.ts': 14,
  'test/estatico/preco-so-por-script.test.ts': 5,
  'test/estatico/projeto.test.ts': 27,
  'test/estatico/relogio.test.ts': 5,
  'test/estatico/sql-raw.test.ts': 2,
  'test/estatico/variaveis.test.ts': 8,
  'test/estatico/varreduras-qa.test.ts': 22,
  'test/estatico/worker-agendador.test.ts': 12,
};
export const linhasComExpect = (fonte: string): number => fonte.split('\n').filter((l) => l.includes('expect(')).length;

describe('CV-20: piso de asserções por arquivo', () => {
  it('a contagem é por linha, como o git grep -c', () => {
    expect(linhasComExpect('expect(a).toBe(1);\nconst x = 1;\nexpect(b).toBe(2); expect(c).toBe(3);')).toBe(2);
  });
  it.each(Object.entries(PISO))('%s tem ao menos %i linhas com expect(', (arquivo, piso) => {
    expect(linhasComExpect(readFileSync(`${raiz}${arquivo}`, 'utf8'))).toBeGreaterThanOrEqual(piso);
  });
});
```

```ts
// e2e/vigia.spec.ts — CV-03: a vigia reprova de verdade (teste negativo). Sem ele, uma guarda que nunca reprova daria
// falsa segurança a toda a suíte.
import { test } from './apoio';

test('CV-03 (negativo): uma folha de estilo de outra origem reprova o teste', async ({ page }) => {
  test.fail();
  await page.goto('/entrar');
  const violacao = page.waitForEvent('console', (m) => /Content Security Policy/i.test(m.text()));
  await page.evaluate(() => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://exemplo.test/x.css';
    document.head.append(l);
  });
  await violacao;
});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`; esperado: FAIL em `vigia.test.ts` (módulo `e2e/vigia` não existe;
  specs importam de `@playwright/test`). O `sem-recurso-externo` e o `piso` devem passar já (provam que o código de hoje
  está limpo); a regra plantada é o "visto falhando" do CV-02.
- [ ] **Passo 3: implementar**

```ts
// e2e/vigia.ts — funções puras da vigia (CV-03), sem Playwright, para o teste de unidade.
export type Coletor = { outraOrigem: string[]; csp: string[] };

export function origemDaUrl(url: string): string | null {
  const u = new URL(url);
  if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') return null;
  const protocolo = u.protocol === 'ws:' ? 'http:' : u.protocol === 'wss:' ? 'https:' : u.protocol;
  return `${protocolo}//${u.host}`;
}

export function problemasDaVigia(c: Coletor): string[] {
  return [...c.outraOrigem.map((u) => `requisição a outra origem: ${u}`), ...c.csp.map((m) => `violação de CSP: ${m}`)];
}
```

```ts
// e2e/apoio.ts — acrescentar (o resto do arquivo fica; as linhas de TAGS_AXE, AxeBuilder e expect(violacoes…) não
// mudam: test/estatico/decisao-e2e.test.ts as confere).
import { expect as expectBase, test as testBase } from '@playwright/test';
import { origemDaUrl, problemasDaVigia, type Coletor } from './vigia';

const MENSAGEM_CSP = /Content Security Policy/i;

// CV-03 (04): fixture automática herdada por todo spec. Reprova o teste com requisição a outra origem (inclusive
// websocket e service worker), com evento securitypolicyviolation e com mensagem de CSP no console.
export const test = testBase.extend<{ vigiaDeOrigemECsp: Coletor }>({
  vigiaDeOrigemECsp: [
    async ({ page, context, baseURL }, use) => {
      if (!baseURL) throw new Error('e2e: baseURL ausente no playwright.config.ts');
      const doApp = new URL(baseURL).origin;
      const c: Coletor = { outraOrigem: [], csp: [] };
      const anotar = (url: string) => {
        const o = origemDaUrl(url);
        if (o !== null && o !== doApp) c.outraOrigem.push(url);
      };
      context.on('request', (r) => anotar(r.url()));
      page.on('websocket', (ws) => anotar(ws.url()));
      page.on('console', (m) => {
        if (MENSAGEM_CSP.test(m.text())) c.csp.push(m.text());
      });
      await page.exposeFunction('__vigiaCsp', (texto: string) => {
        c.csp.push(texto);
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => {
          void (window as unknown as { __vigiaCsp: (t: string) => Promise<void> }).__vigiaCsp(`${e.violatedDirective} ${e.blockedURI}`);
        });
      });
      await use(c);
      expectBase(problemasDaVigia(c), 'CV-03: nenhuma requisição a outra origem nem violação de CSP').toEqual([]);
    },
    { auto: true },
  ],
});
export const expect = expectBase;
```

As funções de hoje do `apoio.ts` que usam `test.info()` passam a usar `testBase.info()` (mesmo objeto). Nos specs,
troca só a importação. Spec que abre página em contexto novo (`browser.newContext()`) fica fora da vigia: liste-os na
entrega (hoje não há; se aparecer, a vigia se aplica ao contexto novo do mesmo jeito, por uma função `vigiar(context,
page)` exportada).

**Plano B do teste negativo:** se o erro do `expect` no fim da fixture não contar para o `test.fail()` da versão
1.63.0, o teste negativo passa a chamar a vigia por dentro: `test('…', async ({ page, vigiaDeOrigemECsp }) => { …;
await violacao; expect(problemasDaVigia(vigiaDeOrigemECsp)).not.toEqual([]); vigiaDeOrigemECsp.csp.length = 0; })`,
sem `test.fail()`. A entrega diz qual caminho valeu e mostra a saída.

- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`; esperado: PASS,
  com `e2e/vigia.spec.ts` como "expected to fail" passando.
- [ ] **Passo 5: entrega `06-T01-engenheiro-frontend.md`**

**Critérios de aceite da tarefa:** CV-02 (teste estático com cada forma plantada vista reprovando); CV-03 (fixture
automática em todo spec, sem `bypassCSP`, e2e contra `next start`, teste negativo passando como falha esperada);
CV-20 (piso por arquivo); CV-01 (G4 vazio); suíte e2e inteira verde com a vigia ligada (RNF-07).

---

## Fase 2 — Identidade (fontes, tokens, telas públicas e casca)

### T02. Fontes Noto servidas pelo próprio app

**Engenheiro:** `engenheiro-frontend` · **Risco:** alto (pacote novo na cadeia de suprimento, CSP) · **Cobre:** RF-02
(CA-02.1 a CA-02.3), RNF-06, RNF-10, CV-04, CV-05, ADR-13

**Arquivos:**
- Criar: `src/app/fontes.ts`, `test/estatico/fontes.test.ts`, `e2e/fontes.spec.ts`
- Modificar: `package.json` e `pnpm-lock.yaml` (só pelo comando abaixo), `src/app/layout.tsx`, `src/app/globals.css`
  (bloco `@theme inline` das famílias)

Comando permitido para o pacote (ADR-13, CV-05): **`pnpm add -D -E @fontsource/noto-sans @fontsource/noto-sans-mono`**.
Nenhum outro pacote. Se o comando alterar `pnpm-workspace.yaml`, ou pedir aprovação de script de instalação, pare:
`status: devolvido` para `05-plano`, com a saída em Pendências (o arquivo é congelado e fora da sua lista).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// test/estatico/fontes.test.ts — RNF-06, CV-05 e ADR-13: seis woff2 do @fontsource, ≤ 300 KB, OFL, sem script.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const PACOTES = ['@fontsource/noto-sans', '@fontsource/noto-sans-mono'] as const;
const ARQUIVOS = [
  'node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2',
  'node_modules/@fontsource/noto-sans/files/noto-sans-latin-600-normal.woff2',
  'node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2',
  'node_modules/@fontsource/noto-sans/files/noto-sans-latin-800-normal.woff2',
  'node_modules/@fontsource/noto-sans-mono/files/noto-sans-mono-latin-400-normal.woff2',
  'node_modules/@fontsource/noto-sans-mono/files/noto-sans-mono-latin-600-normal.woff2',
] as const;

describe('fontes (ADR-13, RNF-06, CV-05)', () => {
  it('os seis arquivos existem, têm a assinatura wOF2 e somam até 300 KB', () => {
    let soma = 0;
    for (const a of ARQUIVOS) {
      expect(existsSync(`${raiz}${a}`), a).toBe(true);
      expect(readFileSync(`${raiz}${a}`).subarray(0, 4).toString('latin1'), a).toBe('wOF2');
      soma += statSync(`${raiz}${a}`).size;
    }
    expect(soma).toBeLessThanOrEqual(300 * 1024);
  });

  it('fontes.ts aponta exatamente os seis caminhos, só .woff2, com display swap e as duas variáveis', () => {
    const f = ler('src/app/fontes.ts');
    const caminhos = [...f.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]!.replace(/^(\.\.\/)+/, ''));
    expect(caminhos.sort()).toEqual([...ARQUIVOS].sort());
    expect(f).toMatch(/from 'next\/font\/local'/);
    expect(f.match(/display:\s*'swap'/g)).toHaveLength(2);
    expect(f).toContain("variable: '--font-noto-sans'");
    expect(f).toContain("variable: '--font-noto-sans-mono'");
  });

  it('os dois pacotes: devDependencies com versão exata, licença OFL-1.1, sem script de instalação', () => {
    const pkg = JSON.parse(ler('package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    for (const p of PACOTES) {
      expect(pkg.dependencies[p], p).toBeUndefined();
      expect(pkg.devDependencies[p], p).toMatch(/^\d+\.\d+\.\d+$/);
      const dele = JSON.parse(ler(`node_modules/${p}/package.json`)) as { name: string; license: string; scripts?: Record<string, string> };
      expect(dele.name).toBe(p);
      expect(dele.license).toBe('OFL-1.1');
      for (const s of ['preinstall', 'install', 'postinstall']) expect(dele.scripts?.[s], `${p} ${s}`).toBeUndefined();
    }
  });

  it('o lockfile tem integrity sha512 dos dois pacotes', () => {
    const lock = ler('pnpm-lock.yaml');
    for (const p of PACOTES) expect(lock).toMatch(new RegExp(`'?${p.replace('/', '\\/')}@[\\d.]+'?:\\s*\\n\\s*resolution:\\s*\\{integrity:\\s*sha512-`));
  });

  it('nenhum arquivo de src/ importa código dos pacotes (só o caminho do woff2 em fontes.ts)', () => {
    for (const a of ['src/app/layout.tsx', 'src/app/fontes.ts', 'src/app/globals.css']) expect(ler(a)).not.toMatch(/(?:import|from|@import)\s*['"]@fontsource/);
  });
});
```

```ts
// e2e/fontes.spec.ts — CV-04: família de fato carregada, @font-face só da mesma origem, woff2 com content-type certo.
import type { Page } from '@playwright/test';
import { entrarComo, expect, test } from './apoio';

// O ouvinte entra antes da primeira navegação do teste: o contexto é novo, sem cache, e cada woff2 gera resposta.
async function conferirFontes(page: Page, caminho: string, temMono: boolean) {
  const respostas: { url: string; tipo: string | undefined }[] = [];
  page.on('response', (r) => {
    if (r.url().endsWith('.woff2')) respostas.push({ url: r.url(), tipo: r.headers()['content-type'] });
  });
  await page.goto(caminho);
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const primeira = (ff: string) => ff.split(',')[0]!.trim().replace(/^['"]|['"]$/g, '');
    const mono = document.querySelector('.font-mono');
    const regras: string[] = [];
    for (const folha of [...document.styleSheets]) for (const regra of [...folha.cssRules]) if (regra instanceof CSSFontFaceRule) regras.push(regra.style.getPropertyValue('src'));
    return {
      corpo: primeira(getComputedStyle(document.body).fontFamily),
      mono: mono ? primeira(getComputedStyle(mono).fontFamily) : null,
      carregadas: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^['"]|['"]$/g, '')),
      regras,
    };
  });
  expect(r.carregadas).toContain(r.corpo);
  if (temMono) expect(r.carregadas).toContain(r.mono);
  expect(r.regras.length).toBeGreaterThan(0);
  for (const src of r.regras) for (const parte of src.split(/,\s*(?=url|local)/)) expect(parte.trim()).toMatch(/^(?:url\("?\/_next\/static\/media\/[^")]+\.woff2"?\)(?:\s*format\("woff2"\))?|local\([^)]*\))$/);
  const origem = new URL(page.url()).origin;
  expect(respostas.length).toBeGreaterThan(0);
  for (const x of respostas) expect({ origem: new URL(x.url).origin, tipo: x.tipo }).toEqual({ origem, tipo: 'font/woff2' });
}

test('CV-04 na T01: Noto Sans carregada da mesma origem', async ({ page }) => {
  await conferirFontes(page, '/entrar', false);
});
test('CV-04 na T03: Noto Sans e Noto Sans Mono (ids) carregadas', async ({ page }) => {
  await entrarComo(page, 'cto'); // pela API: não navega
  await conferirFontes(page, '/demandas', true);
});
test('CV-04 na T11: o DEC do seed (o mesmo da axe-todas) com as duas famílias', async ({ page }) => {
  // achar o DEC como a axe-todas acha o de rascunho de agente do seed, sem navegar antes; depois
  // await conferirFontes(page, `/pacotes-decisao/${decId}`, true);
});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`; esperado: FAIL (`fontes.ts` e os pacotes não existem).
- [ ] **Passo 3: implementar** — rodar o `pnpm add` acima e:

```ts
// src/app/fontes.ts — Noto Sans e Noto Sans Mono do próprio app (ADR-13, RF-02). Os caminhos têm de ser literais: o
// next/font só lê valor escrito no código. Subconjunto latin (cobre o pt-BR). Nunca usar `.style` destes objetos (CV-02).
import localFont from 'next/font/local';

export const fonteSans = localFont({
  src: [
    { path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-noto-sans',
  display: 'swap',
  adjustFontFallback: 'Arial',
  fallback: ['system-ui', 'sans-serif'],
});

export const fonteMono = localFont({
  src: [
    { path: '../../node_modules/@fontsource/noto-sans-mono/files/noto-sans-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/noto-sans-mono/files/noto-sans-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-noto-sans-mono',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'monospace'],
});
```

`layout.tsx`: `<html lang="pt-BR" className={`${fonteSans.variable} ${fonteMono.variable}`}>`. `globals.css`: tirar
`--font-sans` e `--font-mono` do `@theme` e declarar, depois dele,
`@theme inline { --font-sans: var(--font-noto-sans), system-ui, sans-serif; --font-mono: var(--font-noto-sans-mono),
ui-monospace, monospace; }`. Mono 600 em ids e etiquetas fica para as telas (T08 em diante).

- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`;
  esperado: PASS e a vigia da T01 sem achado.
- [ ] **Passo 5: entrega `06-T02-engenheiro-frontend.md`** — com as duas versões exatas resolvidas (D-13) e o diff do
  `package.json` (só as duas linhas).

**Critérios de aceite da tarefa:** CV-04; CV-05 (versão exata, escopo `@fontsource` conferido letra a letra, integrity
sha512, sem script, nenhum `.js` dos pacotes importado, `pnpm-workspace.yaml` sem diff); RNF-06; CA-02.1 (vigia);
CA-02.2; CA-02.3; CV-01.

---

### T03. Tokens da marca, contraste, foco e componentes base

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-01 (CA-01.1 a CA-01.3), RNF-01, RNF-02, RNF-04
(contorno), RNF-11, C01, C06, 03 seções 2.1 a 2.6 (componentes que já existem e variações novas), D-01, D-03, D-15

**Arquivos:**
- Criar: `test/estatico/contraste-tokens.test.ts`, `test/estatico/cores-so-por-token.test.ts`
- Modificar: `src/app/globals.css`, `src/components/rotulos.ts` (`CorSelo`, `COR_STATUS`, `COR_DECISAO`, `COR_NIVEL`,
  selos fixos), `src/components/Selo.tsx`, `Botao.tsx` (variantes `sobre-escuro`, `claro-sobre-escuro` e o estado
  `aria-disabled`), `Alerta.tsx` (`informacao` com `nevoa`), `CampoTexto.tsx`, `AreaTexto.tsx`, `Selecao.tsx`,
  `GrupoOpcoes.tsx` (variante `cartao`), `CaixaSelecao.tsx`, `Interruptor.tsx`, `Tabela.tsx`, `Paginacao.tsx`,
  `DialogoConfirmacao.tsx`, `Esqueleto.tsx`, `BlocoJson.tsx`, `ListaTextos.tsx`; criar `src/components/Cartao.tsx`
- Testes que mudam (G5): `test/estatico/painel-qa.test.ts`, `src/components/rotulos.test.ts`,
  `src/components/componentes.test.ts`, `src/app/(painel)/demandas/fila-qa.test.ts`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// test/estatico/contraste-tokens.test.ts — RNF-01 (texto ≥ 4,5:1) e RNF-02 (não textual ≥ 3:1) sobre os tokens do
// @theme. É a fonte final das razões da 03, 2.2 (P-03 da 03): par abaixo do mínimo volta à ux-ui-design, sem trocar
// cor aqui.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../../src/app/globals.css', import.meta.url)), 'utf8');
const TOKENS = Object.fromEntries([...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]));

const canal = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminancia = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
};
export const razao = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};
const cor = (t: string) => {
  const v = TOKENS[t];
  if (!v) throw new Error(`token --color-${t} ausente no @theme`);
  return v;
};

// 03, 2.2: [texto, fundo]
const TEXTO: ReadonlyArray<readonly [string, string]> = [
  ['tinta', 'branco'], ['tinta', 'superficie'], ['tinta', 'nevoa'],
  ['tinta-media', 'branco'], ['tinta-media', 'superficie'], ['tinta-media', 'nevoa'], ['tinta-media', 'selo-cinza-fundo'],
  ['marinho', 'branco'], ['marinho', 'superficie'], ['marinho', 'nevoa'], ['marinho', 'selo-marinho-fundo'],
  ['acao-escura', 'branco'], ['acao-escura', 'superficie'], ['acao-escura', 'nevoa'],
  ['branco', 'acao'], ['branco', 'acao-escura'], ['branco', 'marinho'], ['branco', 'marinho-luz'], ['branco', 'selo-verde'],
  ['texto-claro', 'marinho'], ['texto-claro', 'marinho-luz'], ['texto-claro-apoio', 'marinho'], ['azul-claro', 'marinho'],
  ['erro', 'branco'], ['erro', 'erro-fundo'], ['atencao', 'atencao-fundo'], ['atencao', 'branco'],
  ['positivo', 'positivo-fundo'], ['positivo', 'branco'],
  ['selo-violeta', 'selo-violeta-fundo'], ['selo-petroleo', 'selo-petroleo-fundo'], ['selo-verde', 'selo-verde-fundo'],
  ['selo-verde', 'branco'], ['selo-laranja', 'selo-laranja-fundo'],
];
// 03, 2.2: [elemento, fundo vizinho]
const NAO_TEXTUAL: ReadonlyArray<readonly [string, string]> = [
  ['tinta-suave', 'branco'], ['tinta-suave', 'superficie'], ['acao', 'branco'], ['marinho', 'branco'],
  ['acao-escura', 'branco'], ['acao-escura', 'superficie'], ['acao-escura', 'nevoa'],
  ['branco', 'marinho'], ['branco', 'marinho-luz'], ['azul-claro', 'marinho-luz'], ['azul-claro', 'marinho'],
];
// 03, 2.2: pares vetados — o teste prova que continuam abaixo (e por isso nunca podem ser usados como texto).
const VETADOS: ReadonlyArray<readonly [string, string, number]> = [
  ['acao', 'marinho', 4.5], ['acao', 'tinta', 4.5], ['azul-claro', 'marinho-luz', 4.5], ['tinta-suave', 'superficie', 4.5], ['linha', 'branco', 3],
];

describe('contraste dos tokens (RNF-01, RNF-02)', () => {
  it('a fórmula: preto sobre branco dá 21', () => expect(razao('#000000', '#ffffff')).toBeCloseTo(21, 5));
  it.each(TEXTO)('texto %s sobre %s ≥ 4,5:1', (a, b) => expect(razao(cor(a), cor(b))).toBeGreaterThanOrEqual(4.5));
  it.each(NAO_TEXTUAL)('elemento %s sobre %s ≥ 3:1', (a, b) => expect(razao(cor(a), cor(b))).toBeGreaterThanOrEqual(3));
  it.each(VETADOS)('vetado %s sobre %s fica abaixo de %d', (a, b, minimo) => expect(razao(cor(a), cor(b))).toBeLessThan(minimo));
});
```

```ts
// test/estatico/cores-so-por-token.test.ts — CA-01.1, CA-01.2 e CA-01.3: hexadecimal só no globals.css (e o QR da T02),
// nenhum style={, e cada cor do manual com variável de valor exato.
// (estrutura igual à do sem-recurso-externo: função pura `hexForaDoTema(arquivo, fonte)`, casos plantados e a varredura
// de src/**/*.{ts,tsx} sem testes; exceção nominal: src/app/configurar-2fa/AssistenteDoisFatores.tsx com #ffffff e
// #000000. CA-01.3: marinho #12385f, acao #1a6ae0, acao-escura #1354b4, azul-claro #7db0f5, tinta #0f1620,
// tinta-media #4a5763, superficie #f6f8fa, nevoa #eaf1fd, linha #dfe4ea, branco #ffffff, positivo #0f7a52,
// atencao #8a5a00, erro #b42318.)
```

Mudanças nos testes de hoje (G5): `painel-qa.test.ts` troca a tabela do `it.each` pela lista do `@theme` abaixo (mesmo
teste: "token = valor da 03"), o foco para `outline:\s*2px solid var\(--cor-foco\)` e `--radius-campo` para `10px`;
`rotulos.test.ts` passa a esperar o mapa da 03, 2.5; `componentes.test.ts` troca `'violet'` por `'violeta'`;
`fila-qa.test.ts:370` troca a regex de classe por `data-cor="${COR_STATUS[st]}"[^>]*>${ROTULO_STATUS[st]}</span>`.

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`; esperado: FAIL (tokens ausentes; `painel-qa` e `rotulos.test` com
  os valores novos).
- [ ] **Passo 3: implementar**

```css
/* src/app/globals.css — tokens da 0.2.0 (03, 2.1; manual MKT-2026-005). Único lugar com hexadecimal (RF-01). */
@import 'tailwindcss';

@theme {
  --color-marinho: #12385f;
  --color-marinho-luz: #1f4f86;
  --color-acao: #1a6ae0;
  --color-acao-escura: #1354b4;
  --color-azul-claro: #7db0f5;
  --color-nevoa: #eaf1fd;
  --color-tinta: #0f1620;
  --color-tinta-media: #4a5763;
  --color-tinta-suave: #6b7885;
  --color-linha: #dfe4ea;
  --color-superficie: #f6f8fa;
  --color-branco: #ffffff;
  --color-texto-claro: #dfe6ee;
  --color-texto-claro-apoio: #b9c5d2;
  --color-positivo: #0f7a52;
  --color-positivo-fundo: #e7f4ee;
  --color-atencao: #8a5a00;
  --color-atencao-fundo: #fdf3e0;
  --color-erro: #b42318;
  --color-erro-fundo: #fdecea;
  --color-selo-violeta: #5b3fa0;
  --color-selo-violeta-fundo: #efe9fb;
  --color-selo-petroleo: #0b5d6b;
  --color-selo-petroleo-fundo: #ddf2f5;
  --color-selo-verde: #1d6b3a;
  --color-selo-verde-fundo: #e3f3e8;
  --color-selo-marinho-fundo: #e6edf5;
  --color-selo-laranja: #9a3412;
  --color-selo-laranja-fundo: #fdebdd;
  --color-selo-cinza-fundo: #eceff3;

  /* D-01: nomes de hoje como apelidos, só até a T16. Tela nova não os usa. */
  --color-texto: var(--color-tinta);
  --color-texto-suave: var(--color-tinta-media);
  --color-fundo: var(--color-branco);
  --color-fundo-suave: var(--color-superficie);
  --color-borda: var(--color-tinta-suave);
  --color-primaria: var(--color-acao-escura);
  --color-perigo: var(--color-erro);
  --color-sucesso: var(--color-positivo);
  --color-atencao-texto: var(--color-atencao);

  --radius-campo: 10px;
  --radius-cartao: 16px;
}

@layer base {
  :root {
    --altura-cabecalho: 4.5rem; /* a T05 troca pelos valores da casca */
    --cor-foco: var(--color-acao-escura);
  }
  /* Foco branco dentro de toda superfície marinho (casca, gaveta, Próxima ação): 03, 2.1. */
  .superficie-escura {
    --cor-foco: var(--color-branco);
  }
  html {
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.5;
    color: var(--color-tinta);
    background-color: var(--color-superficie);
    scroll-padding-top: var(--altura-cabecalho);
  }
  h1 { font-size: 1.375rem; line-height: 1.2; font-weight: 800; letter-spacing: -0.02em; color: var(--color-marinho); }
  @media (min-width: 768px) { h1 { font-size: 1.75rem; } }
  h2 { font-size: 1.125rem; line-height: 1.3; font-weight: 700; }
  h3 { font-size: 1rem; line-height: 1.3; font-weight: 600; }
  a { color: var(--color-acao-escura); text-decoration: underline; text-underline-offset: 2px; }
  :focus-visible { outline: 2px solid var(--cor-foco); outline-offset: 2px; }
  /* bloco prefers-reduced-motion de hoje, sem mudança */
}
```

`rotulos.ts` (D-03): `export type CorSelo = 'azul' | 'violeta' | 'ambar' | 'petroleo' | 'verde' | 'marinho' |
'verde-cheio' | 'laranja' | 'cinza' | 'vermelho';` e os mapas da 03, 2.5 (status `nova` azul, `em_analise` violeta,
`aguardando_informacao` ambar, `pronta_para_decisao` petroleo, `aprovada` verde, `em_construcao` marinho, `entregue`
verde-cheio, `devolvida` laranja, `encerrada` cinza; decisão pendente petroleo, aprovada verde, devolvida laranja,
arquivada cinza; nível baixo verde, médio ambar, alto vermelho; rascunho violeta tracejado, desatualizado vermelho,
substituído cinza). Textos de `ROTULO_*` não mudam.

```tsx
// src/components/Selo.tsx — 03, 2.5: texto sempre presente, 13 px, peso 700, pílula; rascunho com borda tracejada.
const CORES: Readonly<Record<CorSelo, string>> = {
  azul: 'bg-nevoa text-acao-escura border-acao-escura',
  violeta: 'bg-selo-violeta-fundo text-selo-violeta border-selo-violeta',
  ambar: 'bg-atencao-fundo text-atencao border-atencao',
  petroleo: 'bg-selo-petroleo-fundo text-selo-petroleo border-selo-petroleo',
  verde: 'bg-selo-verde-fundo text-selo-verde border-selo-verde',
  marinho: 'bg-selo-marinho-fundo text-marinho border-marinho',
  'verde-cheio': 'bg-selo-verde text-branco border-selo-verde',
  laranja: 'bg-selo-laranja-fundo text-selo-laranja border-selo-laranja',
  cinza: 'bg-selo-cinza-fundo text-tinta-media border-tinta-media',
  vermelho: 'bg-erro-fundo text-erro border-erro',
};
export function Selo({ cor, tracejado = false, children }: { cor: CorSelo; tracejado?: boolean; children: ReactNode }) {
  return (
    <span data-cor={cor} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-bold ${CORES[cor]}${tracejado ? ' border border-dashed' : ''}`}>
      {children}
    </span>
  );
}
```

`Botao`: `primario` = `bg-acao text-branco hover:bg-acao-escura`; `secundario` = `border border-tinta-suave
bg-branco text-tinta hover:bg-superficie`; `perigo` = `bg-erro text-branco`; `link` = `text-acao-escura underline`;
`sobre-escuro` = `border border-azul-claro bg-transparent text-branco hover:bg-marinho-luz`; `claro-sobre-escuro` =
`bg-branco text-marinho font-bold`; estado `aria-disabled:` (sem `disabled`) = `aria-disabled:bg-selo-cinza-fundo
aria-disabled:text-tinta-media aria-disabled:border aria-disabled:border-dashed aria-disabled:border-tinta-suave`.
Campos: borda `tinta-suave`, erro `erro`, raio `rounded-campo`, 16 px. `GrupoOpcoes` ganha `variante?: 'lista' |
'cartao'` (cartão clicável inteiro ≥ 44 px, borda `tinta-suave`; marcado `has-[:checked]:border-2
has-[:checked]:border-marinho has-[:checked]:bg-nevoa`), **mantendo** ids, `name` e `aria-*` de hoje. `Cartao` =
`section` com `rounded-cartao border border-linha bg-branco p-4 md:p-6`, sem sombra.

- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`; esperado: PASS
  (o axe de hoje continua sem violação nas 12 telas com os apelidos).
- [ ] **Passo 5: entrega `06-T03-engenheiro-frontend.md`**

**Critérios de aceite da tarefa:** CA-01.1 a CA-01.3; RNF-01 e RNF-02 pelo teste (nenhum par reprovado; se reprovar,
`status: devolvido` para `03-interface`); selos com texto sempre presente; CV-01; nenhum `style=`.

---

### T04. Marca e moldura pública: Entrar, 2FA, sem permissão, erro e 404

**Engenheiro:** `engenheiro-frontend` · **Risco:** alto (telas de autenticação; ameaça crítica C05) · **Cobre:** RF-13
(CA-13.1 a CA-13.3), C03, C05, CV-01 (auth congelado), CV-19 (link da marca)

**Arquivos:**
- Criar: `src/components/marca/MarcaWs.tsx`, `src/components/casca/MolduraPublica.tsx`, `e2e/moldura-publica.spec.ts`
- Modificar: `src/app/entrar/page.tsx` e o formulário da T01, `src/app/configurar-2fa/page.tsx` e
  `AssistenteDoisFatores.tsx` (só classes e a moldura; o QR **sem mudança de cor**), `src/app/sem-permissao/page.tsx`,
  `src/app/error.tsx`, `src/app/not-found.tsx`

**Interfaces produzidas:** `MarcaWs({ variante: 'clara' | 'escura'; compacta?: boolean; comLink?: boolean })` (link
só para a constante `'/demandas'`, nome acessível do próprio texto "WS Orquestrador de Demandas");
`MolduraPublica({ comLinkNaMarca, children })`: `main#conteudo` em `superficie`, conteúdo centralizado até 440 px, a
marca clara acima de um `Cartao`. Só marcação: sem leitura, sem estado (o `painel-qa.test.ts` continua valendo para
sem-permissão, 404 e erro).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// e2e/moldura-publica.spec.ts
import { expect, test } from './apoio';

test('RF-13: T01 com a marca sem link, cartão e o fluxo de hoje', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByText('WS', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'WS Orquestrador de Demandas' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
});
test('RF-13: sem permissão e 404 com a marca como link para /demandas', async ({ page }) => {
  for (const caminho of ['/sem-permissao', '/nao-existe-ficticio']) {
    await page.goto(caminho);
    await expect(page.getByRole('link', { name: 'WS Orquestrador de Demandas' })).toHaveAttribute('href', '/demandas');
  }
});
test('CA-13.2: o QR da T02 continua #ffffff com módulos #000000', async ({ page }) => {
  // entrarSoComSenha(page, 'configurar2fa') como a configurar-2fa.spec; no passo 1:
  // expect(page.locator('svg rect').first()).toHaveAttribute('fill', '#ffffff');
  // expect(page.locator('svg path').first()).toHaveAttribute('fill', '#000000');
});
test('CA-13.3: axe na T01 vazia, com erro e no passo 2, em 1280 × 720 e em 390 × 844', async ({ page }) => {});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test:e2e`; esperado: FAIL (marca ausente).
- [ ] **Passo 3: implementar** — os campos, textos, mensagens, bloqueios e redirecionamentos ficam como estão (CV-01:
  `src/lib/auth.ts`, `src/lib/auth-cliente.ts`, `src/lib/qr.ts`, `src/modules/acesso` sem diff). O `error.tsx`
  continua sem ler `message`, `stack`, `digest` nem `cause`.
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e` (com `entrar.spec.ts`, `configurar-2fa.spec.ts`
  e `autenticacao-qa.spec.ts` só com seletor ou texto mudado), `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T04-engenheiro-frontend.md`**

**Critérios de aceite da tarefa:** CA-13.1 a CA-13.3; CV-01 (auth, acesso e QR congelados); marca sem link em T01 e
T02 (C-40 intacto); `painel-qa.test.ts` verde.

---

### T05. Casca do painel e gaveta

**Engenheiro:** `engenheiro-frontend` · **Risco:** alto (move o "Sair", CV-16) · **Cobre:** RF-03 (CA-03.1 a CA-03.5),
RF-04 (CA-04.1 a CA-04.5), RNF-04, RNF-11, C04, ADR-15, CV-16, CV-19 (marca), D-09

**Arquivos:**
- Criar: `src/components/casca/navegacao.ts` (`LINKS`, `ehPaginaAtual` sem mudança de assinatura),
  `src/components/casca/ItensDoMenu.tsx`, `GavetaMenu.tsx`, `BotaoSair.tsx`, `FocoNaTrocaDeTela.tsx`,
  `src/components/casca/foco.ts` (`proximoIndiceCircular`), `src/components/casca/foco.test.ts`,
  `test/estatico/casca.test.ts`, `e2e/casca.spec.ts`
- Modificar: `src/components/CabecalhoPainel.tsx` passa a ser o `header` da casca (cliente: a marca, o menu lateral, a
  barra do celular e a gaveta), com o mesmo nome exportado e `ehPaginaAtual` reexportado de `casca/navegacao` (a lista
  Pode não apaga arquivo, e os testes de hoje continuam importando o mesmo nome);
  `src/app/(painel)/layout.tsx` (grade menu + conteúdo; `AvisosDaMoldura` acima do `main`; nome e papel por prop
  vindos de `exigirPessoa`, como hoje), `src/app/(painel)/not-found.tsx` (num `Cartao`), `globals.css`
  (`--altura-cabecalho` 64 px abaixo de 768 e 16 px a partir de 768; `html.gaveta-aberta { overflow: hidden }`;
  `dialog#gaveta-menu` 200 ms e `::backdrop` com `color-mix(in srgb, var(--color-tinta) 50%, transparent)`)
- Testes que mudam (G5): `componentes.test.ts`, `componentes-qa.test.ts`, `e2e/moldura.spec.ts`

**Comportamento (03, seção 3; ADR-15):** a partir de 768 px, `header` marinho `superficie-escura` de 248 px (216 px até
1199), fixo na altura da janela, com `MarcaWs` escura (link), `nav aria-label="Principal"` com os três itens (44 px,
ícones SVG `aria-hidden`, ativo com fundo `marinho-luz` + barra `azul-claro` de 4 px + peso 700), a conta
`<Nome> (<Papel>)` e "Sair" (`sobre-escuro`, "Saindo…" enquanto sai). Abaixo de 768 px, o mesmo `header` vira barra de
56 px com "Menu" (`aria-expanded`, `aria-controls="gaveta-menu"`) e a marca compacta; `nav` e conta do `header` ficam
`hidden md:flex`. A gaveta é `<dialog id="gaveta-menu" aria-label="Menu">` com `showModal()`; abre com foco em "Fechar
menu"; Tab e Shift+Tab circulares (`proximoIndiceCircular`); fecham Esc, "Fechar menu", clique no véu
(`e.target === e.currentTarget`) e o item da tela atual (foco volta a "Menu"); item de outra tela navega, fecha sem
devolver o foco e o `FocoNaTrocaDeTela` põe o foco no `h1`; `matchMedia('(min-width: 768px)')` fecha a gaveta e põe
o foco no `main#conteudo`. A navegação dentro da gaveta só é montada enquanto aberta (D-09). "Sair" é a função de hoje
(`authClient().signOut()`, depois `router.replace('/entrar')`), num componente só usado pelo lateral e pela gaveta.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/components/casca/foco.test.ts
import { describe, expect, it } from 'vitest';
import { proximoIndiceCircular } from './foco';

describe('Tab circular da gaveta (ADR-15)', () => {
  it('do último vai ao primeiro; Shift do primeiro vai ao último; no meio, nada a fazer', () => {
    expect(proximoIndiceCircular(4, 5, false)).toBe(0);
    expect(proximoIndiceCircular(0, 5, true)).toBe(4);
    expect(proximoIndiceCircular(2, 5, false)).toBeNull();
    expect(proximoIndiceCircular(-1, 5, false)).toBe(0);
  });
});
```

```ts
// test/estatico/casca.test.ts — CV-16: a casca não decide acesso nem lê sessão no cliente.
// Varre src/components/casca/**/*.{ts,tsx}: nenhum localStorage, sessionStorage, document.cookie, fetch( nem href que
// leve a saída por GET (/api/auth/sign-out); BotaoSair chama authClient().signOut(); o layout do painel passa
// nome e papel de `pessoa` (exigirPessoa) por prop. Casos plantados provam que cada regra reprova.
```

```ts
// e2e/casca.spec.ts
import { entrarComo, expect, semViolacoes, test } from './apoio';

test.describe('computador (1280 × 720)', () => {
  test('CA-03.1: menu lateral com três itens, item atual, conta e Sair em T03, T05, T11 e T12', async ({ page }) => {});
  test('CA-03.2: primeiro Tab no "Pular para o conteúdo"; Enter leva ao main', async ({ page }) => {});
  test('CA-03.4: "Nova demanda" no menu leva o foco ao h1 da T04', async ({ page }) => {});
  test('CA-03.5 e CV-16: Sair pela casca leva a /entrar e o cookie antigo recebe 401 em /api/demandas', async ({ page }) => {});
});

test.describe('celular (390 × 844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('CA-04.1 a CA-04.3: Menu fechado, abre com foco dentro, 20 Tabs não saem, Esc fecha e volta a Menu', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    const menu = page.getByRole('button', { name: 'Menu' });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const gaveta = page.getByRole('dialog', { name: 'Menu' });
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeFocused();
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      expect(await gaveta.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(gaveta).toBeHidden();
    await expect(menu).toBeFocused();
  });
  test('CA-04.4: "Agentes e teto" na gaveta abre a T12, gaveta fechada e foco no h1', async ({ page }) => {});
  test('clique no véu e item da tela atual fecham e devolvem o foco a Menu', async ({ page }) => {});
  test('janela de 390 para 1280 px com a gaveta aberta fecha a gaveta', async ({ page }) => {});
  test('RNF-11: com reducedMotion reduce, a gaveta abre sem transição', async ({ page }) => {});
  test('CV-16: Sair pela gaveta leva a /entrar e o cookie antigo recebe 401', async ({ page }) => {});
  test('CA-04.5: axe com a gaveta aberta', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await page.getByRole('button', { name: 'Menu' }).click();
    await semViolacoes(page, 'gaveta aberta em 390 px');
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`, `pnpm test:e2e`; esperado: FAIL.
- [ ] **Passo 3: implementar** (comportamento acima; um só banner e um só `nav "Principal"` exposto por largura).
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`; esperado: PASS,
  com `moldura.spec.ts` e os avisos da moldura (CA-03.3) como na 0.1.13.
- [ ] **Passo 5: entrega `06-T05-engenheiro-frontend.md`**

**Critérios de aceite da tarefa:** CA-03.1 a CA-03.5; CA-04.1 a CA-04.5; CV-16 (casca e gaveta); CV-19 (marca só para
`/demandas`); RNF-11; CV-01.

---

## Fase 3 — Fila (T03)

### T06. Seed fictício das demandas dos e2e novos

**Engenheiro:** `engenheiro-backend` · **Risco:** baixo · **Cobre:** D-07, G3.10 (C-36), apoio a CV-10, CV-13, CV-18,
CA-08.1, CA-09.1, CA-12.1, CA-12.2

**Arquivos:**
- Modificar: `scripts/seed-ficticio.ts` (`TITULOS_DO_E2E` e `DEMANDAS_DO_E2E`), o teste do seed que já existe em
  `scripts/` (só se ele contar as demandas uma a uma)

Novas chaves de `TITULOS_DO_E2E`, todas com "(fictício)", `solicitanteNome` "Pessoa Ficticia …", tipo `melhoria`,
linha `sob_medida`:

| Chave | Título | O seed cria além da demanda |
|---|---|---|
| `textoDeTerceiro` | `<script>window.__xss=1</script> Pedido ${RLO} com texto de terceiro <img src=x onerror="window.__xss=2"> (fictício)`, com `const RLO = String.fromCodePoint(0x202e)`: o caractere de direção RIGHT-TO-LEFT OVERRIDE (U+202E) vem de código e nunca fica cru no fonte nem neste plano (Trojan Source; `test/estatico/sem-controle-bidi.test.ts`) | nada (o e2e cria ESP, RSK e DEC pela API) |
| `etapasSemVersoes` | `Etapas sem versões (fictício)` | nada |
| `etapasDupla` | `Etapas com uma de duas aprovações (fictício)` | ESP v1, RSK v1 e DEC v1 de pessoa, nível `cto_e_administradora`, com a aprovação do CTO na opção A, pelas funções de serviço de hoje com a conta fictícia "cto" |
| `decisaoOpcaoB` | `Aprovar a opção B (fictício)` | nada |
| `decisaoDevolverComOpcao` | `Devolver com a opção marcada (fictício)` | nada |
| `decisaoCelularCto` | `Decisão no celular, só o CTO (fictício)` | nada |
| `decisaoCelularDupla` | `Decisão no celular, dupla aprovação (fictício)` | nada |
| `decisaoRecomendaB` | `Recomendação do agente cita a opção B (fictício)` | ESP, RSK e um DEC **de agente** (como o seed já cria o DEC de rascunho de agente), com `recomendacao: 'Recomendo a opção B (fictício).'` |

- [ ] **Passo 1: escrever o teste que falha** — no teste do seed de hoje (ou `scripts/seed-e2e.test.ts` novo, com
  Testcontainers como os de `scripts/`): rodar o seed num banco novo e conferir que cada título existe uma vez, que
  `etapasDupla` tem um DEC pendente `cto_e_administradora` com uma aprovação de papel `cto` na opção A, e que
  `decisaoRecomendaB` tem um DEC `rascunho_agente = true` cuja recomendação contém "opção B"; rodar o seed duas vezes
  não duplica nada (idempotência de hoje).
- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`; esperado: FAIL.
- [ ] **Passo 3: implementar** — pelas mesmas funções que o seed já usa; nenhuma regra de `src/modules/` muda.
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T06-engenheiro-backend.md`**

**Critérios de aceite da tarefa:** os oito cenários no seed, idempotente, só dado fictício; `TOTAL_DEMANDAS_DO_SEED`
continua derivado; CV-01.

---

### T07. Leituras novas da fila, só SELECT

**Engenheiro:** `engenheiro-dados-bd` · **Risco:** alto (leitura nova de banco; CV-06) · **Cobre:** RF-05 e RF-06 (dado),
RF-15 (CA-15.2), RNF-09, ADR-16, C07, CV-06

**Arquivos:**
- Criar: `src/modules/demandas/resumo-da-fila.ts`, `src/modules/demandas/resumo-da-fila.test.ts`,
  `test/estatico/leituras-da-fila.test.ts`

**Interfaces produzidas:** G7 (`ContagemPorStatus`, `EtapasNaFila`, `contarDemandasPorStatus`, `etapasDasDemandas`).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/modules/demandas/resumo-da-fila.test.ts — ADR-16, RNF-09 e CV-06 contra o Postgres real, pelo papel do app.
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import * as schema from '../../db/schema';
import { demanda, especificacaoTecnica, pacoteDecisao, parecerRisco, user } from '../../db/schema';
import { idVersao } from '../versoes';
import { listarDemandas } from './consultas';
import { contarDemandasPorStatus, etapasDasDemandas } from './resumo-da-fila';
import { filtroDemandasSchema, STATUS } from './schemas';

const CTO = 'u-resumo-cto';
const SENTINELA = 'SENTINELA-TITULO-RESUMO';
let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values({ id: CTO, name: 'Pessoa Ficticia CTO', email: 'resumo-cto@exemplo.test', papel: 'cto' });
});
afterAll(async () => {
  await b.fechar();
});
// inserir(…) pelo migrator, como em consultas.test.ts (ids DEM-20261110-NNNN, título com a SENTINELA)

describe('contarDemandasPorStatus', () => {
  it('CA-05.1: 3 nova e 2 pronta_para_decisao; status sem demanda vale 0; todas é a soma', async () => {});
  it('CA-05.4: com tipo=bug, conta só bug; o filtro de status é ignorado', async () => {});
  it('com linhaServicoProvavel, conta só a linha', async () => {});
  it('CV-06: o retorno só tem porStatus (as nove chaves) e todas; nenhum título', async () => {
    const r = await contarDemandasPorStatus(b.db, filtroDemandasSchema.parse({}));
    expect(Object.keys(r).sort()).toEqual(['porStatus', 'todas']);
    expect(Object.keys(r.porStatus).sort()).toEqual([...STATUS].sort());
    expect(JSON.stringify(r)).not.toContain(SENTINELA);
  });
});

describe('etapasDasDemandas', () => {
  it('CA-06.1: ESP e RSK sem DEC dá { esp: true, rsk: true, dec: false }; várias versões contam como feita', async () => {});
  it('lista vazia não consulta o banco e devolve mapa vazio', async () => {});
  it('CV-06: cada valor tem só as chaves esp, rsk e dec, booleanas; nenhum título', async () => {});
});

describe('RNF-09: custo fixo da fila', () => {
  it.each([20, 100])('com %i demandas, a carga da página faz 4 consultas (2 de hoje + 2 novas)', async (total) => {
    // popular `total` demandas; db com logger que conta:
    let n = 0;
    const contado = drizzle(b.poolApp, { schema, casing: 'snake_case', logger: { logQuery: () => { n += 1; } } });
    const filtro = filtroDemandasSchema.parse({});
    const lista = await listarDemandas(contado, filtro);
    await contarDemandasPorStatus(contado, filtro);
    await etapasDasDemandas(contado, lista.itens.map((i) => i.id));
    expect(n).toBe(4);
  });
});
```

```ts
// test/estatico/leituras-da-fila.test.ts — CV-06 (parte estática) e CA-15.2.
// 1) resumo-da-fila.ts só usa db.select: não contém insert(, update(, delete(, execute(, .raw(, nem importa `sql` de
//    drizzle-orm; 2) quem importa resumo-da-fila (fora do próprio teste) ⊆ ['src/app/(painel)/demandas/leituras-da-fila.ts']
//    (a T09 acrescenta as regras da cadeia até a página); casos plantados provam cada regra.
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`; esperado: FAIL (módulo não existe).
- [ ] **Passo 3: implementar**

```ts
// src/modules/demandas/resumo-da-fila.ts — ADR-16: duas leituras só SELECT para a T03, chamadas pela página depois de
// exigirPessoaNaPagina e autorizar(pessoa, 'listar_demandas'). Não tocam listarDemandas, DemandaResumo nem a API.
// Devolvem só contagens e booleanos (CV-06): nenhum texto da demanda sai daqui.
import { and, count, countDistinct, eq, inArray } from 'drizzle-orm';
import type { Db } from '../../db';
import { demanda, especificacaoTecnica, pacoteDecisao, parecerRisco } from '../../db/schema';
import { STATUS, type FiltroDemandas, type Status } from './schemas';

export type ContagemPorStatus = { porStatus: Record<Status, number>; todas: number };
export type EtapasNaFila = { esp: boolean; rsk: boolean; dec: boolean };

export async function contarDemandasPorStatus(db: Db, filtro: Pick<FiltroDemandas, 'tipo' | 'linhaServicoProvavel'>): Promise<ContagemPorStatus> {
  const onde = and(
    filtro.tipo ? eq(demanda.tipo, filtro.tipo) : undefined,
    filtro.linhaServicoProvavel ? eq(demanda.linhaServicoProvavel, filtro.linhaServicoProvavel) : undefined,
  );
  const linhas = await db.select({ status: demanda.status, n: count() }).from(demanda).where(onde).groupBy(demanda.status);
  const porStatus = Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>;
  for (const l of linhas) porStatus[l.status] = l.n;
  return { porStatus, todas: linhas.reduce((t, l) => t + l.n, 0) };
}

export async function etapasDasDemandas(db: Db, ids: readonly string[]): Promise<Map<string, EtapasNaFila>> {
  const r = new Map<string, EtapasNaFila>();
  if (ids.length === 0) return r;
  const linhas = await db
    .select({
      id: demanda.id,
      esp: countDistinct(especificacaoTecnica.id),
      rsk: countDistinct(parecerRisco.id),
      dec: countDistinct(pacoteDecisao.id),
    })
    .from(demanda)
    .leftJoin(especificacaoTecnica, eq(especificacaoTecnica.demandaId, demanda.id))
    .leftJoin(parecerRisco, eq(parecerRisco.demandaId, demanda.id))
    .leftJoin(pacoteDecisao, eq(pacoteDecisao.demandaId, demanda.id))
    .where(inArray(demanda.id, [...ids]))
    .groupBy(demanda.id);
  for (const l of linhas) r.set(l.id, { esp: l.esp > 0, rsk: l.rsk > 0, dec: l.dec > 0 });
  return r;
}
```

Se o plano de execução com os três `leftJoin` ficar caro no teste de 100 demandas (mais de 1 s), troque por três
`exists` em `select` com subconsulta do query builder (`exists(db.select(...).from(...).where(...))`), mantendo uma
consulta só e sem `sql` com valor de entrada; registre a troca na entrega.

- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T07-engenheiro-dados-bd.md`** — com `git diff 198e97d --stat -- src/modules` (só o
  arquivo novo e o teste).

**Critérios de aceite da tarefa:** CV-06 (só `db.select`, filtros já validados, ids por `inArray`, lista vazia sem
consulta, retorno só com contagens e booleanos, sentinela ausente); RNF-09 (4 consultas com 20 e com 100); CA-15.2;
CV-01.

---

### T08. Regras de exibição da fila

**Engenheiro:** `engenheiro-backend` · **Risco:** baixo · **Cobre:** RF-05 (CA-05.1, CA-05.3, CA-05.5, CA-05.7 na
regra), RF-06 (CA-06.1 texto, CA-06.2), C08, CV-07 (`href` só do enum), CV-19 (`href` dos contadores)

**Arquivos:**
- Criar: `src/components/dados-da-fila.ts`, `src/components/dados-da-fila.test.ts`

**Interfaces produzidas:** G7 (`ContadorDaFila`, `contadoresDaFila`, `idadeDaDemanda`, `textoDasEtapas`) e
`TEXTOS_CONTADORES`.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/components/dados-da-fila.test.ts
import { describe, expect, it } from 'vitest';
import { hrefDaFila } from '../app/(painel)/demandas/fila';
import { filtroDemandasSchema } from '../modules/demandas/schemas';
import { contadoresDaFila, idadeDaDemanda, textoDasEtapas, TEXTOS_CONTADORES } from './dados-da-fila';

const f = (q: Record<string, string> = {}) => filtroDemandasSchema.parse(q);
const contagem = { porStatus: { nova: 3, em_analise: 5, aguardando_informacao: 2, pronta_para_decisao: 2, aprovada: 1, em_construcao: 4, entregue: 0, devolvida: 0, encerrada: 1 }, todas: 18 };

describe('contadoresDaFila (RF-05)', () => {
  it('CA-05.1: "Todas" e os nove status na ordem de ROTULO_STATUS; sem status na URL, só "Todas" pressionado', () => {
    const c = contadoresDaFila(contagem, f(), hrefDaFila);
    expect(c.map((x) => [x.rotulo, x.total, x.pressionado])).toEqual([
      ['Todas', 18, true], ['Nova', 3, false], ['Em análise', 5, false], ['Aguardando informação', 2, false],
      ['Pronta para decisão', 2, false], ['Aprovada', 1, false], ['Em construção', 4, false], ['Entregue', 0, false],
      ['Devolvida pela construção', 0, false], ['Encerrada', 1, false],
    ]);
  });
  it('CA-05.3: ativar "Em análise" com status=nova, tipo=bug e offset=20 leva a status=em_analise&tipo=bug, sem offset', () => {
    const c = contadoresDaFila(contagem, f({ status: 'nova', tipo: 'bug', offset: '20' }), hrefDaFila);
    expect(c.find((x) => x.status === 'em_analise')!.href).toBe('/demandas?status=em_analise&tipo=bug');
  });
  it('CA-05.5: o contador pressionado tira o status; "Todas" também', () => {
    const c = contadoresDaFila(contagem, f({ status: 'nova', tipo: 'bug' }), hrefDaFila);
    expect(c.find((x) => x.status === 'nova')).toMatchObject({ pressionado: true, href: '/demandas?tipo=bug', valor: '' });
    expect(c[0]).toMatchObject({ pressionado: false, href: '/demandas?tipo=bug', valor: '' });
  });
  it('contagem que falhou: total null em todos, e os href continuam (03, 4.6)', () => {
    const c = contadoresDaFila(null, f(), hrefDaFila);
    expect(c.every((x) => x.total === null)).toBe(true);
    expect(c[1]!.href).toBe('/demandas?status=nova');
  });
  it('CV-07 e CV-19: todo href começa por /demandas e todo valor é vazio ou do enum', () => {
    for (const x of contadoresDaFila(contagem, f({ tipo: 'bug' }), hrefDaFila)) {
      expect(x.href).toMatch(/^\/demandas(\?|$)/);
      expect(['', 'nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'entregue', 'devolvida', 'encerrada']).toContain(x.valor);
    }
  });
  it('texto oculto: " demandas" e " demanda" no singular', () => {
    expect(TEXTOS_CONTADORES.demandas(1)).toBe(' demanda');
    expect(TEXTOS_CONTADORES.demandas(3)).toBe(' demandas');
  });
});

describe('idadeDaDemanda (CA-06.2), em dias de calendário de São Paulo', () => {
  const agora = new Date('2026-11-10T15:00:00Z');
  it.each([
    ['2026-11-10T13:00:00Z', 'Hoje'],
    ['2026-11-09T13:00:00Z', '1 dia'],
    ['2026-11-07T13:00:00Z', '3 dias'],
    ['2026-11-10T02:30:00Z', '1 dia'], // 23h30 de 09/11 em São Paulo
  ])('%s → %s', (criada, texto) => expect(idadeDaDemanda(new Date(criada), agora).texto).toBe(texto));
  it('a data "dd/mm/aaaa" e o ISO para o <time>', () => {
    expect(idadeDaDemanda(new Date('2026-11-07T13:00:00Z'), agora)).toMatchObject({ data: '07/11/2026', iso: '2026-11-07T13:00:00.000Z' });
  });
});

describe('textoDasEtapas (RF-06)', () => {
  it('CA-06.1: "Etapas: ESP feita, RSK feita, DEC por fazer"', () => {
    expect(textoDasEtapas({ esp: true, rsk: true, dec: false })).toBe('Etapas: ESP feita, RSK feita, DEC por fazer');
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`; esperado: FAIL.
- [ ] **Passo 3: implementar**

```ts
// src/components/dados-da-fila.ts — regras de exibição da T03 (C08; 03, seção 4). Puras; só tipos dos módulos.
import { dataIsoSaoPaulo, formatarData } from '../lib/fuso';
import type { ContagemPorStatus, EtapasNaFila } from '../modules/demandas/resumo-da-fila';
import type { FiltroDemandas, Status } from '../modules/demandas/schemas';
import { COR_STATUS, ROTULO_STATUS, type CorSelo } from './rotulos';

export const TEXTOS_CONTADORES = {
  grupo: 'Filtrar por status',
  todas: 'Todas',
  erro: 'Não foi possível contar as demandas por status. Os filtros por status continuam funcionando.',
  demandas: (n: number) => (n === 1 ? ' demanda' : ' demandas'),
} as const;

export type ContadorDaFila = { status: Status | null; rotulo: string; total: number | null; pressionado: boolean; href: string; valor: string; cor: CorSelo | null };

export function contadoresDaFila(c: ContagemPorStatus | null, f: FiltroDemandas, href: (f: FiltroDemandas, offset: number) => string): ContadorDaFila[] {
  const semStatus: FiltroDemandas = { ...f, status: undefined };
  const todas: ContadorDaFila = { status: null, rotulo: TEXTOS_CONTADORES.todas, total: c ? c.todas : null, pressionado: !f.status, href: href(semStatus, 0), valor: '', cor: null };
  const porStatus = (Object.keys(ROTULO_STATUS) as Status[]).map((s): ContadorDaFila => {
    const pressionado = f.status === s;
    return { status: s, rotulo: ROTULO_STATUS[s], total: c ? c.porStatus[s] : null, pressionado, href: href(pressionado ? semStatus : { ...f, status: s }, 0), valor: pressionado ? '' : s, cor: COR_STATUS[s] };
  });
  return [todas, ...porStatus];
}

const DIA_MS = 86_400_000;
export function idadeDaDemanda(criadaEm: Date, agora: Date): { texto: string; data: string; iso: string } {
  const dias = Math.round((Date.parse(dataIsoSaoPaulo(agora)) - Date.parse(dataIsoSaoPaulo(criadaEm))) / DIA_MS);
  const texto = dias <= 0 ? 'Hoje' : dias === 1 ? '1 dia' : `${dias} dias`;
  return { texto, data: formatarData(criadaEm), iso: criadaEm.toISOString() };
}

const marca = (feita: boolean) => (feita ? 'feita' : 'por fazer');
export const textoDasEtapas = (e: EtapasNaFila): string => `Etapas: ESP ${marca(e.esp)}, RSK ${marca(e.rsk)}, DEC ${marca(e.dec)}`;
```

(Se `dataIsoSaoPaulo` não devolver `AAAA-MM-DD`, use a função de `src/lib/fuso.ts` que devolve; não crie outra.)

- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T08-engenheiro-backend.md`**

**Critérios de aceite da tarefa:** os testes acima; função pura sem import de valor de `src/modules/`; CV-07; CV-19;
CV-01.

---

### T09. T03 Fila: contadores, tabela densa, cartões e filtros

**Engenheiro:** `engenheiro-frontend` · **Risco:** alto (reorganiza página com a guarda C-04 e liga a leitura nova,
CV-06) · **Cobre:** RF-05 (CA-05.2, CA-05.6, CA-05.7), RF-06 (CA-06.1, CA-06.3, CA-06.4), RF-07 (CA-07.1 a CA-07.4),
RNF-03, RNF-05, C09, C10, CV-06 (cadeia de importação), CV-07, CV-08, CV-18 (cartão em 390 px), D-02, D-08

**Arquivos:**
- Criar: `src/app/(painel)/demandas/leituras-da-fila.ts`, `leituras-da-fila.test.ts`,
  `src/app/(painel)/demandas/ContadoresDaFila.tsx` (cliente), `CartoesDaFila.tsx`, `src/components/MarcasDeEtapa.tsx`,
  `src/components/Recolhivel.tsx`, `e2e/fila-contadores.spec.ts`
- Modificar: `src/app/(painel)/demandas/page.tsx`, `fila.tsx` (colunas, `h2#resultado-da-fila`, tabela + cartões),
  `FiltrosFila.tsx` (sai o seletor "Status", entra o campo oculto `status` do filtro validado; "Mais filtros" no
  celular), `src/components/Tabela.tsx` (`legendaOculta`: `caption` só para leitor de tela, sem id),
  `test/estatico/leituras-da-fila.test.ts` (acrescenta a cadeia), `e2e/seguranca.spec.ts` (estende o C-18, sem tirar
  asserção)
- Testes que mudam (G5): `e2e/fila.spec.ts`, `e2e/fila-qa.spec.ts`

**Comportamento (03, seção 4):** etiqueta "Fila", `h1` "Demandas", "Nova demanda"; `ContadoresDaFila` num `form`
GET para `/demandas` com `tipo` e `linhaServicoProvavel` ocultos (só do filtro validado) e cada contador
`<button name="status" value={valor} aria-pressed>`; o `onSubmit` lê o `submitter`, chama o `pedirFocoNoResultado` de
hoje e `router.push(href)`; sem script, o GET filtra. Grade 5 colunas (computador), 3 (tablete), pílulas de 44 px no
celular; número em Mono; texto oculto `TEXTOS_CONTADORES.demandas(n)`; pressionado com borda 2 px `acao`, fundo `nevoa`
e visto `aria-hidden`. Contadores em `Suspense` próprio, com chave de `tipo` e `linha`; carregando: `aria-busy` e
rótulos sem número; falha: `contagemOuNada` devolve `null`, os botões ficam sem número e aparece
`TEXTOS_CONTADORES.erro`. Lista: o mesmo `try` de hoje lê `listarDemandas` e depois `etapasDaPagina(ids)`; falha de
qualquer das duas → `ErroDaFila`. A partir de 768 px, a tabela (Id, Título, Tipo, Status, Etapas, Urgência, Linha de
serviço, Idade; `caption` oculta) dentro da região rolável de hoje; abaixo, `ul aria-labelledby="resultado-da-fila"`
de `CartaoDeDemanda` (id-link e selo no topo, `h3` com o título isolado por `<bdi>`, `dl` com Tipo, Urgência, Linha
de serviço, Etapas e Idade). Uma das duas formas fica `hidden` por largura. "Idade" com `<time dateTime>` e
`<span class="sr-only">criada em </span>dd/mm/aaaa`. Agora da página: `deps.relogio.agora()`.

```ts
// src/app/(painel)/demandas/leituras-da-fila.ts — D-08: só a página da T03 importa este arquivo.
import type { Db } from '../../../db';
import { log } from '../../../lib/log';
import { contarDemandasPorStatus, etapasDasDemandas, type ContagemPorStatus } from '../../../modules/demandas/resumo-da-fila';
import type { FiltroDemandas } from '../../../modules/demandas/schemas';

// Número que falta é tolerável; número errado não (02, seção 5). O log não leva filtro, SQL nem parâmetro (CV-08).
export async function contagemOuNada(db: Db, filtro: FiltroDemandas): Promise<ContagemPorStatus | null> {
  try {
    return await contarDemandasPorStatus(db, filtro);
  } catch (e) {
    log.error({ evento: 'painel_contadores_falhou', rota: '/demandas', erro: e });
    return null;
  }
}

export const etapasDaPagina = etapasDasDemandas;
```

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/app/(painel)/demandas/leituras-da-fila.test.ts — CV-08 (molde: src/lib/log.test.ts e substituirDestinoDoLog)
// db falso cujo select lança Error('SENTINELA-SQL-CONTADORES status = $1'): contagemOuNada devolve null, a linha do
// pino tem evento painel_contadores_falhou e rota /demandas, e não contém o sentinela nem o filtro.
```

```ts
// test/estatico/leituras-da-fila.test.ts — acrescentar (CV-06): leituras-da-fila.ts é importado só por
// src/app/(painel)/demandas/page.tsx; resumo-da-fila só por leituras-da-fila.ts; no corpo de PaginaDemandas,
// exigirPessoaNaPagina( vem antes de autorizar(pessoa, 'listar_demandas') e os dois antes do primeiro `return`.
```

```ts
// e2e/fila-contadores.spec.ts
import { api, entrarComo, expect, test } from './apoio';

test('CA-05.2: ativar "Pronta para decisão" filtra, pressiona, foca o resultado e anuncia o total da API', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas');
  const { total } = await api<{ total: number }>(page, 'GET', '/api/demandas?status=pronta_para_decisao');
  const grupo = page.getByRole('group', { name: 'Filtrar por status' });
  await grupo.getByRole('button', { name: /^Pronta para decisão/ }).click();
  await expect(page).toHaveURL(/\/demandas\?status=pronta_para_decisao$/);
  await expect(grupo.getByRole('button', { name: /^Pronta para decisão/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#resultado-da-fila')).toBeFocused();
  await expect(page.getByRole('status')).toHaveText(total === 1 ? '1 demanda encontrada.' : `${total.toLocaleString('pt-BR')} demandas encontradas.`);
});
test('CA-05.3: com status=nova&tipo=bug&offset=20, "Em análise" mantém tipo e tira offset', async ({ page }) => {});
test('CA-05.5: ativar o pressionado tira o status e "Todas" fica pressionado', async ({ page }) => {});
test('CA-05.6: Enter e Espaço num contador filtram como o clique', async ({ page }) => {});
test('CA-05.7 e CV-07: ?status=%3Cscript%3E&tipo=bug mostra o alerta, "Todas" pressionado, nenhum status fora do enum', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas?status=%3Cscript%3E&tipo=bug');
  await expect(page.getByText('Algum filtro do endereço não é válido. Mostrando todas as demandas.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Todas/ })).toHaveAttribute('aria-pressed', 'true');
  for (const v of await page.locator('input[name="status"]').evaluateAll((xs) => xs.map((x) => (x as HTMLInputElement).value))) expect(['', 'nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'entregue', 'devolvida', 'encerrada']).toContain(v);
  expect(await page.content()).not.toContain('%3Cscript%3E');
});
test('CA-06.1: o nome acessível da célula de etapas segue a API (demanda do seed espListaDeTextos)', async ({ page }) => {});
test('CA-06.3: com mais de 20 demandas, "Próxima" leva à página 2 com o foco no resultado', async ({ page }) => {});
test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('CA-07.1: sem tabela visível; lista com um item por demanda, cada um com os oito dados', async ({ page }) => {});
  test('CA-07.2: contador no celular foca o resultado da lista e anuncia o total', async ({ page }) => {});
  test('"Mais filtros (1 ativo)" com tipo=bug; abre com aria-expanded e mostra Tipo, Linha, Filtrar e Limpar', async ({ page }) => {});
  test('RNF-03: contadores, id do cartão, Filtrar e Limpar filtros com ao menos 44 × 44 px', async ({ page }) => {});
});
test('CA-07.3: em 320 px, scrollWidth não passa da largura da janela', async ({ page }) => {});
test('CA-07.4: em 1280 px, a tabela está visível e a lista não está na árvore de acessibilidade', async ({ page }) => {});
```

No `e2e/seguranca.spec.ts`, o C-18 ganha (sem tirar nada): a demanda do seed `textoDeTerceiro` aparece em 390 px no
cartão da T03 com o texto literal (`<script>…` visível como texto), `window.__xss` indefinido e o `<bdi>` em volta do
título (CV-18).

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`, `pnpm test:e2e`; esperado: FAIL.
- [ ] **Passo 3: implementar** (comportamento acima; `Recolhivel` conforme D-02 e G7: botão `md:hidden` com
  `aria-expanded`/`aria-controls`, bloco com `max-md:hidden` enquanto fechado).
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`; esperado: PASS;
  `GET /api/demandas` sem diff (CA-06.4: `src/app/api` congelado em G4).
- [ ] **Passo 5: entrega `06-T09-engenheiro-frontend.md`**

**Critérios de aceite da tarefa:** CA-05.2, CA-05.6, CA-05.7; CA-06.1, CA-06.3, CA-06.4; CA-07.1 a CA-07.4; CV-06
(cadeia), CV-07, CV-08, CV-18 (cartão); um só id de foco nas duas larguras; CV-01.

---

## Fase 4 — Demanda (T05)

### T10. Regras de exibição da demanda: barra de etapas e Próxima ação

**Engenheiro:** `engenheiro-backend` · **Risco:** baixo · **Cobre:** RF-08 (CA-08.4), RF-09 (CA-09.2, CA-09.3,
CA-09.4), ADR-17, C11, CV-09 (parte estática e de saída), CV-19, D-10, D-11

**Arquivos:**
- Criar: `src/components/dados-das-etapas.ts`, `src/components/dados-das-etapas.test.ts`,
  `test/estatico/dados-das-etapas.test.ts`
- Modificar: `src/components/rotulos.ts` (só acrescentar `export` em `ARTEFATO_DO_AGENTE` e `agenteNaFrase`, sem mudar
  valor)

**Interfaces produzidas:**

```ts
export type DadosDasEtapas = {
  demanda: Pick<DemandaVista, 'id' | 'status' | 'especificacoes' | 'pareceresRisco' | 'pacotesDecisao' | 'agentesEmAndamento'>;
  espMaisNova: { id: string; duvidasEmAberto: readonly string[] } | null;
  // o DEC mais novo (d.pacotesDecisao[0]), lido pela página com ler_pacote_decisao; null sem DEC
  decMaisNovo: Pick<PacoteDecisaoVista, 'id' | 'statusDecisao' | 'desatualizado' | 'nivelAprovacaoRequerido' | 'aprovadores' | 'decisao'> | null;
  historico: readonly Pick<EventoVisivel, 'acao' | 'entidadeId'>[];
  temSecaoDeDuvidas: boolean;
};
export type EstadoDaEtapa =
  | 'Registrada' | 'Por fazer' | 'Com dúvidas em aberto' | 'Feita' | 'Feito' | 'Pacote desatualizado'
  | '1 de 2 aprovações' | 'Decisão pendente' | `Aprovada, opção ${OpcaoDecisao}` | 'Devolvida' | 'Arquivada'
  | 'Gerado' | 'Ainda não gerado' | 'Depois da aprovação';
export type EtapaDaDemanda = { numero: 1 | 2 | 3 | 4 | 5; nome: string; idVersao: string | null; estado: EstadoDaEtapa; feita: boolean; atual: boolean };
export type DestinoDaAcao = { tipo: 'pagina'; href: string } | { tipo: 'secao'; secao: 'duvidas' | 'status' };
export type ProximaAcao = { linha: number; oQueFalta: string; detalhe: string | null; quemAge: string; link: { rotulo: string; destino: DestinoDaAcao } | null };
```

**Regras (01 RF-08 e RF-09 para condição e ordem; 03, 5.4 e 5.5 para texto):**
- Etapas: 1 "Demanda" = "Registrada" (feita, id = `demanda.id`); 2 "Especificação" = sem ESP "Por fazer", ESP mais nova
  com `duvidasEmAberto.length > 0` "Com dúvidas em aberto", senão "Feita"; 3 "Parecer de risco" = sem RSK "Por
  fazer", senão "Feito"; 4 "Decisão" = sem DEC "Por fazer"; DEC mais novo `pendente` e `desatualizado` "Pacote
  desatualizado"; `pendente`, `cto_e_administradora` e uma aprovação "1 de 2 aprovações"; `pendente` "Decisão
  pendente"; `aprovada` "Aprovada, opção X" (X de `decisao.opcaoEscolhida`, senão de `aprovadores[0].opcao`; sem
  nenhuma, lança erro: número errado não, 02 seção 5); `devolvida` "Devolvida"; `arquivada` "Arquivada"; 5 "Pedido de
  Construção" = há `pedido_gerado` no histórico com `entidadeId` do aprovado vigente "Gerado" (id = o do vigente);
  há vigente "Ainda não gerado"; senão "Depois da aprovação". Aprovado vigente = primeiro de `demanda.pacotesDecisao`
  (mais novo primeiro) com `statusDecisao === 'aprovada'` e `!substituido`. Feitas: "Registrada", "Feita", "Feito",
  "Aprovada, opção X", "Gerado". Atual: a primeira de 2 a 5 não feita; nenhuma em `entregue` e `encerrada`.
- Próxima ação: as 13 linhas da tabela da spec, seção 4.4, nessa ordem, vale a primeira que casar; textos por inteiro
  da 03, 5.5; linha 2 com `agentesEmAndamento[0]` ("Esperar o ${agenteNaFrase(a)} terminar ${ARTEFATO_DO_AGENTE[a]}.",
  quem age `NOME_AGENTE[a]`); linha 3 com `secao: 'duvidas'` ("Ver as dúvidas em aberto") quando `temSecaoDeDuvidas`,
  senão `secao: 'status'` ("Mudar o status"); linhas 4 a 6 e 7 com `href` `/demandas/${id}/especificacoes/nova`,
  `/demandas/${id}/pareceres-risco/novo` e `/demandas/${id}/pacotes-decisao/novo`; 8 "Abrir a decisão" →
  `/pacotes-decisao/${dec.id}`, quem age pela regra da 03 (nível `cto` "CTO"; dupla sem aprovação "CTO e
  administradora"; dupla com uma, o papel que falta) e o detalhe só com o **papel** de quem aprovou; 9 e 10 "Abrir a
  decisão aprovada" → `/pacotes-decisao/${vigente.id}`; 11 e 12 `secao: 'status'`; 13 "Sem responsável definido", sem
  link. `switch` sobre `Status` com `never` no padrão. Link só com id que casa `RE_ID_DEMANDA_NA_TELA` ou `RE_ID_DEC`
  (de `dados-do-pacote.ts`); sem casar, sem link.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/components/dados-das-etapas.test.ts (trechos; um caso por linha das duas tabelas, CA-08.4 e CA-09.3)
import { describe, expect, it } from 'vitest';
import { RE_ID_DEMANDA } from '../modules/demandas/gerar-id';
import { etapasDaDemanda, proximaAcao, RE_ID_DEMANDA_NA_TELA, type DadosDasEtapas } from './dados-das-etapas';

// base(…) monta DadosDasEtapas com a demanda DEM-20261110-0042 em em_analise, sem versões, histórico vazio.

describe('etapasDaDemanda (RF-08)', () => {
  it('CA-08.1: ESP v2 sem dúvidas, RSK v1, DEC dupla com só o CTO → Registrada, Feita, Feito, 1 de 2 aprovações, Depois da aprovação; atual = 4', () => {});
  it('CA-08.2: sem ESP → etapa 2 "Por fazer", id null, atual', () => {});
  it('CA-08.3: encerrada e entregue não têm atual', () => {});
  it('DEC pendente desatualizado → "Pacote desatualizado"; aprovado → "Aprovada, opção B"; devolvido; arquivado', () => {});
  it('Pedido: Gerado (id do vigente), Ainda não gerado, Depois da aprovação; substituído não é vigente', () => {});
});

describe('proximaAcao (RF-09)', () => {
  it.each([/* 13 linhas, cada uma com o estado mínimo que a faz casar e o resultado esperado da 03, 5.5 */])('linha %i', () => {});
  it('CA-09.1: dupla com a aprovação do CTO → "Decidir entre as opções A e B.", detalhe com o papel, quem age "Administradora", "Abrir a decisão"', () => {});
  it('CA-09.2: aguardando_informacao com agente pendente → linha 2, não 3', () => {});
  it('CV-09: sentinelas em nome do aprovador, referenciaDocumento e comentários da decisão não aparecem na saída', () => {
    // aprovadores: [{ papel: 'cto', nome: 'SENTINELA-NOME', referenciaDocumento: 'SENTINELA-DOC', … }], decisao.comentarios: 'SENTINELA-COMENTARIO'
    // expect(JSON.stringify([proximaAcao(x), etapasDaDemanda(x)])).not.toMatch(/SENTINELA/);
  });
  it('CV-19: todo href de página casa ^/(demandas|pacotes-decisao)/; id fora do formato não gera link', () => {});
  it('D-11: a regex da tela é a de gerar-id.ts', () => expect(RE_ID_DEMANDA_NA_TELA.source).toBe(RE_ID_DEMANDA.source));
});
```

```ts
// test/estatico/dados-das-etapas.test.ts — CV-09 e CA-09.4: dados-das-etapas.ts só tem `import type` de src/modules/
// e não importa acesso, db, lib/deps nem acoes; etapasDaDemanda( e proximaAcao( só são chamadas em arquivos
// src/app/**/page.tsx (fora dos testes). Casos plantados provam cada regra.
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`; esperado: FAIL.
- [ ] **Passo 3: implementar** (regras acima).
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T10-engenheiro-backend.md`**

**Critérios de aceite da tarefa:** CA-08.4; CA-09.2 a CA-09.4; CV-09 (importações e saída sem dado a mais); CV-19;
`rotulos.ts` só com `export` acrescentado; CV-01.

---

### T11. T05 no arranjo A2

**Engenheiro:** `engenheiro-frontend` · **Risco:** alto (acrescenta `autorizar('ler_pacote_decisao')` e uma leitura na
página, CV-09) · **Cobre:** RF-08 (CA-08.1 a CA-08.3 na tela), RF-09 (CA-09.1 na tela), RF-10 (CA-10.1 a CA-10.3), C12,
CV-09 (ordem na página), CV-18 (T05)

**Arquivos:**
- Criar: `src/app/(painel)/demandas/[id]/BarraDeEtapas.tsx`, `CartaoProximaAcao.tsx`,
  `src/components/LinhaDoTempo.tsx`, `e2e/detalhe-a2.spec.ts`, `test/estatico/detalhe-dec.test.ts`
- Modificar: `src/app/(painel)/demandas/[id]/page.tsx`, `Historico.tsx` (passa a usar `LinhaDoTempo`),
  `e2e/seguranca.spec.ts` (estende o C-18)
- Testes que mudam (G5): `e2e/detalhe-demanda.spec.ts`

**Leitura nova na página:** depois das de hoje, com `const decResumo = d.pacotesDecisao[0]`: `if (decResumo)
autorizar(pessoa, 'ler_pacote_decisao')` e, no mesmo `Promise.all`, `decResumo ? obterPacoteDecisao(deps.db,
decResumo.id) : null`. O id **nunca** vem de `params` nem de `searchParams` (CV-09). Falha sobe para a tela de erro de
hoje.

**Arranjo (03, seção 5):** ordem do DOM: trilha (`nav "Trilha"`, "Demandas" / id com `aria-current="page"`),
cabeçalho (id Mono, selos de hoje, "Urgência: <rótulo>" quando informada, `h1` com o título isolado por `<bdi>`,
"Editar dados" e "Mudar status" → `h2` Status pelo `LinkNestaPagina`), "Nesta página", alertas, `BarraDeEtapas`
(`ol aria-label="Etapas da demanda"`, cinco colunas a partir de 1200 px, vertical abaixo; feita = círculo `marinho` com
visto; atual = círculo `acao` com número e anel, `aria-current="step"`; por fazer = círculo tracejado `tinta-suave`),
`CartaoProximaAcao` (`section` `superficie-escura` marinho com `h2` "Próxima ação", o que falta 18 px branco, detalhe,
"Quem age: …", link `claro-sobre-escuro`; destino `secao` vira `LinkNestaPagina` para `ID_SECAO.duvidas` ou
`ID_SECAO.status`), Dados, Dúvidas, Versões, Status, Texto recebido, Histórico (`LinhaDoTempo`: `ol` com **todos** os
eventos, "Do mais novo para o mais antigo.", "Antes: … Depois: …", ator e `<time>`). A partir de 1200 px, grade
`xl:grid-cols-3` com Próxima ação e Histórico na coluna lateral (`xl:col-start-3`), sem mudar a ordem do DOM.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// test/estatico/detalhe-dec.test.ts — CV-09 na página: em src/app/(painel)/demandas/[id]/page.tsx,
// autorizar(pessoa, 'ler_pacote_decisao') aparece antes de obterPacoteDecisao(; o argumento de obterPacoteDecisao é
// derivado de d.pacotesDecisao (nunca params/searchParams); etapasDaDemanda( e proximaAcao( são chamadas aqui.
```

```ts
// e2e/detalhe-a2.spec.ts
import { demandaDoSeed, entrarComo, expect, test } from './apoio';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';

test('CA-08.1 e CA-09.1: etapasDupla → estados da barra, etapa 4 atual e Próxima ação para a administradora', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.etapasDupla);
  await page.goto(`/demandas/${id}`);
  const barra = page.getByRole('list', { name: 'Etapas da demanda' });
  await expect(barra.getByRole('listitem')).toHaveCount(5);
  for (const estado of ['Registrada', 'Feita', 'Feito', '1 de 2 aprovações', 'Depois da aprovação']) await expect(barra).toContainText(estado);
  await expect(barra.locator('[aria-current="step"]')).toContainText('Decisão');
  const cartao = page.getByRole('region', { name: 'Próxima ação' });
  await expect(cartao).toContainText('Decidir entre as opções A e B.');
  await expect(cartao).toContainText('Quem age: Administradora');
  await expect(cartao.getByRole('link', { name: 'Abrir a decisão' })).toHaveAttribute('href', /^\/pacotes-decisao\/DEC-/);
});
test('CA-08.2: etapasSemVersoes → Especificação "Por fazer", "Nenhuma" e atual; Próxima ação linha 4 com link para a T07', async ({ page }) => {});
test('CA-10.1: Dados, Versões, Status, Texto recebido e Histórico em 1280 e em 390 px; cada link de "Nesta página" foca o h2', async ({ page }) => {});
test('CA-10.2: o histórico mostra todos os eventos, em lista, do mais novo para o mais antigo', async ({ page }) => {});
test('"Mudar status" do cabeçalho leva o foco ao h2 Status', async ({ page }) => {});
```

No `e2e/seguranca.spec.ts`, o C-18 ganha a T05 da demanda `textoDeTerceiro`: título, barra e Próxima ação com o texto
literal, `window.__xss` indefinido e o `<bdi>` no `h1` (CV-18).

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`, `pnpm test:e2e`; esperado: FAIL.
- [ ] **Passo 3: implementar.**
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e` (com `detalhe-demanda.spec.ts`, `decisao.spec.ts`
  e `pedido-construcao.spec.ts` só com seletor ou texto mudado, CA-10.3), `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T11-engenheiro-frontend.md`**

**Critérios de aceite da tarefa:** CA-08.1 a CA-08.3; CA-09.1; CA-10.1 a CA-10.3; CV-09; CV-18 (T05); nada da T05 de
hoje some (selos, "Editar dados", "Nesta página", dúvidas, versões e botões nas mesmas condições, Mudar status, Texto
recebido com a data do expurgo, aviso de agente trabalhando); CV-01.

---

## Fase 5 — Decisão (T11)

### T12. T11: um formulário, três botões

**Engenheiro:** `engenheiro-frontend` · **Risco:** alto (decisão com efeito para fora; CV-10 a CV-15) · **Cobre:**
RF-11 (CA-11.1 a CA-11.7), ADR-18, C13, CV-10, CV-11, CV-13, CV-14, CV-15, D-05, D-14

**Arquivos:**
- Modificar: `src/components/dados-da-decisao.ts` (`envioDaDecisao`, `rotuloDoPrincipal`, `ACOES_DA_DECISAO`; textos
  novos e os três alterados), `src/components/dados-da-decisao.test.ts` (casos novos; textos alterados),
  `src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx`, `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`
  (só o que o formulário recebe), `e2e/decisao.spec.ts` (passos equivalentes, G5)
- Criar: `e2e/decisao-botoes.spec.ts`
- **Não muda:** `acoes.ts` e `acoes-pedido.ts` (G4), `valoresDaDecisao`, `validarDecisao`, `entradaDaDecisao`,
  `errosDaApiDecisao`, `textoDoDialogo`, `formularioDaConta`

Textos (03, seção 9): acrescentar `aprovarOpcao: (o: OpcaoDecisao) => \`Aprovar a opção ${o}\``, `devolverCurto:
'Devolver'`, `grupoAcoes: 'Ações da decisão'`; alterar `dicaDevolver` para `'Devolver: a demanda volta para Em
análise.'`, `referencia` para `'Identificador do documento assinado (obrigatório para aprovar)'` e `dataAssinatura`
para `'Data da assinatura (obrigatório para aprovar)'`. `legendaDecisao`, `aprovar` (rótulo de rádio), `devolver`,
`registrar` ficam (ainda usados ou citados; não apagar sem conferir usos).

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/components/dados-da-decisao.test.ts — acrescentar
describe('envioDaDecisao (ADR-18, CV-10, CV-11)', () => {
  const ctx = { opcaoFixada: null, pedeDocumento: false, exigeRevisao: false, aprovarIndisponivel: false };
  const v = { ...valoresDaDecisao(), opcaoEscolhida: 'B' as const };
  it('CV-10: botão com valor fora da lista (ou nulo) não faz nada', () => {
    for (const b of ['x', '', null, undefined, 'pendente']) expect(envioDaDecisao(v, ctx, b)).toEqual({ tipo: 'nada' });
  });
  it('CV-10: o v devolvido é o que vai ao diálogo e à Server Action, com o statusDecisao do botão', () => {
    const r = envioDaDecisao(v, ctx, 'aprovada');
    expect(r).toEqual({ tipo: 'confirmar', v: { ...v, statusDecisao: 'aprovada' } });
    if (r.tipo !== 'confirmar') throw new Error('esperava confirmar');
    expect(textoDoDialogo(r.v, ctx, { especificacaoCitada: { repositorioDestino: 'wsssistemas2626-crypto/ficticio' }, nivelAprovacaoRequerido: 'cto' })[0]).toContain('Aprovar a opção B.');
    expect(entradaDaDecisao(r.v, ctx)).toMatchObject({ statusDecisao: 'aprovada', opcaoEscolhida: 'B' });
  });
  it('CV-11: com o pacote desatualizado, "aprovada" não faz nada; devolver e arquivar seguem', () => {
    const d = { ...ctx, aprovarIndisponivel: true };
    expect(envioDaDecisao(v, d, 'aprovada')).toEqual({ tipo: 'nada' });
    expect(envioDaDecisao(v, d, 'devolvida').tipo).toBe('confirmar');
  });
  it('CA-11.2: aprovar sem opção dá "Escolha a opção A ou a opção B." e não confirma', () => {
    const r = envioDaDecisao(valoresDaDecisao(), ctx, 'aprovada');
    expect(r.tipo).toBe('erros');
    if (r.tipo === 'erros') expect(r.erros.map((e) => e.mensagem)).toEqual(['Escolha a opção A ou a opção B.']);
  });
  it('CA-11.4 e CV-14: com revisão exigida, as três ações pedem a caixa', () => {
    for (const b of ['aprovada', 'devolvida', 'arquivada']) expect(envioDaDecisao(v, { ...ctx, exigeRevisao: true }, b).tipo).toBe('erros');
  });
  it('CA-11.5 e CA-11.6: documento obrigatório só para aprovar; ao devolver não vai na entrada', () => {
    const doc = { ...ctx, pedeDocumento: true, opcaoFixada: { papel: 'cto' as const, opcao: 'A' as const } };
    expect(envioDaDecisao(valoresDaDecisao(), doc, 'aprovada').tipo).toBe('erros');
    const comDoc = { ...valoresDaDecisao(), referenciaDocumento: 'DOC-FICTICIO-1', dataDocumento: '2026-11-10' };
    const r = envioDaDecisao(comDoc, doc, 'devolvida');
    if (r.tipo !== 'confirmar') throw new Error('esperava confirmar');
    expect(entradaDaDecisao(r.v, doc)).not.toHaveProperty('referenciaDocumento');
    expect(entradaDaDecisao(r.v, doc)).not.toHaveProperty('dataDocumento');
  });
});

describe('rotuloDoPrincipal (03, 6.4; CV-13)', () => {
  it('"Aprovar" sem opção; "Aprovar a opção X" com a marcada ou a fixada; "Aprovar" com o pacote desatualizado', () => {
    const ctx = { opcaoFixada: null, aprovarIndisponivel: false };
    expect(rotuloDoPrincipal({ opcaoEscolhida: '' }, ctx)).toBe('Aprovar');
    expect(rotuloDoPrincipal({ opcaoEscolhida: 'B' }, ctx)).toBe('Aprovar a opção B');
    expect(rotuloDoPrincipal({ opcaoEscolhida: '' }, { ...ctx, opcaoFixada: { papel: 'cto', opcao: 'A' } })).toBe('Aprovar a opção A');
    expect(rotuloDoPrincipal({ opcaoEscolhida: 'B' }, { ...ctx, aprovarIndisponivel: true })).toBe('Aprovar');
  });
});
```

```ts
// e2e/decisao-botoes.spec.ts (nas duas larguras quando indicado)
test('CA-11.1 e CV-10: decisaoOpcaoB, nível cto: marcar B e "Aprovar a opção B" → diálogo "Aprovar a opção B." e a API grava B', async ({ page }) => {});
test('CV-10: decisaoDevolverComOpcao: marcar A e "Devolver" → diálogo de devolução; grava devolvida sem opção nem documento', async ({ page }) => {});
test('CV-10 e D-05: administradora num DEC dupla: Enter no identificador abre o diálogo e nada grava sem "Confirmar e registrar"; Enter em Comentários não envia', async ({ page }) => {});
test('CV-11: DEC desatualizado: clique, Enter e Espaço no principal e Enter num campo → zero POST de Server Action; explicação visível; Devolver e Arquivar disponíveis', async ({ page }) => {
  // const posts: string[] = []; page.on('request', (r) => { if (r.method() === 'POST' && new URL(r.url()).pathname === `/pacotes-decisao/${decId}`) posts.push(r.url()); });
  // … expect(posts).toEqual([]);
});
test('CV-13: decisaoRecomendaB: nenhum rádio marcado, sem "Recomendada", principal "Aprovar" (1280 e 390 px)', async ({ page }) => {});
test('CV-15: identificador, data e comentários sem atributo name; o form sem action nem method', async ({ page }) => {});
test('CA-11.3: desatualizado com "Indisponível: pacote desatualizado." visível e ligado por aria-describedby', async ({ page }) => {});
test('foco volta ao botão ativado ao fechar o diálogo com "Voltar"', async ({ page }) => {});
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`, `pnpm test:e2e`; esperado: FAIL.
- [ ] **Passo 3: implementar**

```ts
// src/components/dados-da-decisao.ts — acrescentar
export const ACOES_DA_DECISAO = ['aprovada', 'devolvida', 'arquivada'] as const satisfies readonly StatusDecisaoGravado[];

export type EnvioDaDecisao = { tipo: 'nada' } | { tipo: 'erros'; v: ValoresDaDecisao; erros: ErroDeCampo[] } | { tipo: 'confirmar'; v: ValoresDaDecisao };

// ADR-18 e CV-10: o botão ativado define o statusDecisao uma vez; o mesmo `v` vai ao diálogo e à Server Action. Com o
// pacote desatualizado, "Aprovar" não valida, não abre diálogo e não envia (CV-11); o servidor continua com o 409.
export function envioDaDecisao(valores: ValoresDaDecisao, ctx: ContextoDoFormulario, valorDoBotao: string | null | undefined): EnvioDaDecisao {
  const acao = ACOES_DA_DECISAO.find((a) => a === valorDoBotao);
  if (!acao) return { tipo: 'nada' };
  if (acao === 'aprovada' && ctx.aprovarIndisponivel) return { tipo: 'nada' };
  const v: ValoresDaDecisao = { ...valores, statusDecisao: acao };
  const erros = validarDecisao(v, ctx);
  return erros.length > 0 ? { tipo: 'erros', v, erros } : { tipo: 'confirmar', v };
}

export function rotuloDoPrincipal(v: Pick<ValoresDaDecisao, 'opcaoEscolhida'>, ctx: Pick<ContextoDoFormulario, 'opcaoFixada' | 'aprovarIndisponivel'>): string {
  if (ctx.aprovarIndisponivel) return TEXTOS_DECISAO.aprovar;
  const o = ctx.opcaoFixada?.opcao ?? (v.opcaoEscolhida === '' ? null : v.opcaoEscolhida);
  return o ? TEXTOS_DECISAO.aprovarOpcao(o) : TEXTOS_DECISAO.aprovar;
}
```

```tsx
// FormularioDecisao.tsx — o essencial (o resto: ResumoErros, alerta, aviso de saída, AlertaDeResultado, como hoje)
const [aConfirmar, setAConfirmar] = useState<ValoresDaDecisao | null>(null);

function enviar(ev: FormEvent<HTMLFormElement>) {
  ev.preventDefault();
  if (enviando) return;
  const botao = (ev.nativeEvent as SubmitEvent).submitter;
  const r = envioDaDecisao(valores, contexto, botao instanceof HTMLButtonElement ? botao.value : null);
  if (r.tipo === 'nada') return;
  if (r.tipo === 'erros') {
    setErros({ ...SEM_ERROS, campos: r.erros, porCampo: Object.fromEntries(r.erros.map((c) => [c.campo, c.mensagem])) });
    return;
  }
  setErros(SEM_ERROS);
  if (botao instanceof HTMLButtonElement) botao.focus(); // o diálogo devolve o foco a ele (Safari não foca no clique)
  setAConfirmar(r.v);
}

async function registrar(v: ValoresDaDecisao) {
  // igual ao de hoje, trocando `valores` por `v`: registrarDecisaoNoPainel({ decId, decisao: entradaDaDecisao(v, contexto) })
  // e, no finally, setAConfirmar(null) no lugar de setConfirmando(false)
}

// <form noValidate onSubmit={enviar} aria-busy={enviando}> (sem action nem method; CV-15)
//   opções: se !aprovarIndisponivel, a frase da opção fixada ou GrupoOpcoes variante 'cartao', nenhuma marcada (CV-13)
//   documento (pedeDocumento && !aprovarIndisponivel): CampoTexto sem `obrigatorio` (sem aria-required) e sem `name`
//   AreaTexto Comentários (sem name); CaixaSelecao da revisão com `obrigatorio` (aria-required) quando exigeRevisao
//   <p id="decisao-consequencia-devolver">{t.dicaDevolver}</p> <p id="decisao-consequencia-arquivar">{t.dicaArquivar}</p>
//   <div id="rodape-da-decisao" role="group" aria-label={t.grupoAcoes}>
//     {aprovarIndisponivel ? <p id="decisao-aprovar-indisponivel">{t.dicaAprovarIndisponivel}</p> : null}
//     <Botao id="decisao-aprovar" type="submit" name="acao" value="aprovada" aria-disabled={aprovarIndisponivel || undefined}
//       aria-describedby={aprovarIndisponivel ? 'decisao-aprovar-indisponivel' : undefined} carregando=… textoCarregando={t.registrando}>
//       {rotuloDoPrincipal(valores, contexto)}</Botao>
//     <Botao id="decisao-devolver" type="submit" name="acao" value="devolvida" variante="secundario" aria-describedby="decisao-consequencia-devolver">{t.devolverCurto}</Botao>
//     <Botao id="decisao-arquivar" type="submit" name="acao" value="arquivada" variante="secundario" aria-describedby="decisao-consequencia-arquivar">{t.arquivar}</Botao>
//   </div>
// DialogoConfirmacao aberto={aConfirmar !== null}, texto de textoDoDialogo(aConfirmar, …), onConfirmar={() => aConfirmar && void registrar(aConfirmar)}
```

O botão principal é o **primeiro** `submit` do DOM (o Enter num `<input>` envia por ele). Enviando: os três ficam
desabilitados e o ativado mostra "Registrando…".

- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e` (com `decisao.spec.ts` e
  `pedido-construcao.spec.ts` só com passo equivalente; `test/estatico/decisao-e2e.test.ts` verde), `pnpm lint`,
  `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T12-engenheiro-frontend.md`** — com o diff de `dados-da-decisao.test.ts` explicado trecho a
  trecho (CA-11.7, CV-14: nenhuma asserção de regra trocada).

**Critérios de aceite da tarefa:** CA-11.1 a CA-11.7; CV-10 (unidade e os três e2e); CV-11 (zero POST; servidor com
409 sem diff); CV-13; CV-14; CV-15; C-14 (diálogo com ação, repositório e nível) mantido; CV-01.

---

### T13. T11 no arranjo A (computador) e C2 (celular)

**Engenheiro:** `engenheiro-frontend` · **Risco:** alto (revisão humana C-14 no celular; CV-12) · **Cobre:** RF-12
(CA-12.1 a CA-12.6), RNF-03, RNF-04, CV-11 (A-03 e C-28 nas duas larguras), CV-12, CV-13 (390 px), CV-18 (cabeçalho da
T11), CV-19 ("Voltar para a demanda"), D-02, D-16

**Arquivos:**
- Modificar: `src/app/(painel)/pacotes-decisao/[decId]/page.tsx` (grade, cabeçalho com "Repositório destino",
  "‹ Voltar para a demanda" `md:hidden`, `h1` com `<bdi>`), `RevisaoDoPacote.tsx` (duas partes, D-16),
  `FormularioDecisao.tsx` (classes do rodapé), `src/components/dados-da-decisao.ts` (`separarRevisao`, textos
  `repositorioNaLinha: (r: string | null) => r ? \`Repositório destino: ${r}\` : 'Repositório destino: Não informado'`,
  `voltarParaDemanda: 'Voltar para a demanda'`, `verDetalhes: 'Ver vantagens, desvantagens e a revisão do pacote'`),
  `src/components/DialogoConfirmacao.tsx` (botões empilhados abaixo de 768 px), `globals.css` (rodapé),
  `e2e/seguranca.spec.ts` (estende o C-18), `e2e/decisao.spec.ts` (o teste do C-14 roda também em 390 px, sem tirar
  asserção)
- Criar: `e2e/decisao-celular.spec.ts`

**Arranjo:** ordem do DOM em toda largura: cabeçalho (id, selos, `h1`, linha da demanda/nível/criação, linha
"Repositório destino", citações); alertas de hoje (desatualizado, rascunho citado, substituído, lembrete P1-d);
Aprovações; Resumo executivo; Recomendação (rótulo de hoje); **Revisão, parte sempre visível** (D-16); `Recolhivel`
(`verDetalhes`) com as Opções completas e a parte de detalhe da revisão; Registrar decisão (formulário da T12); Pedido
de Construção (só depois de aprovado, A-03 e C-28 de hoje). A partir de 1200 px: `xl:grid-cols-5`, conteúdo
`xl:col-span-3`, cartão "Registrar decisão" `xl:col-span-2` não fixo, Pedido na linha toda. De 768 a 1199 px: uma
coluna, rodapé no fluxo. Abaixo de 768 px: `#rodape-da-decisao` com `max-md:fixed max-md:inset-x-0 max-md:bottom-0
bg-branco border-t border-linha`, preenchimento `12px 16px calc(12px + env(safe-area-inset-bottom))`, principal 48 px
na largura toda, "Devolver" e "Arquivar" lado a lado com 44 px; e

```css
/* globals.css — 03, 6.3 e ADR-18: nada focado sob o rodapé fixo da T11. */
@media (max-width: 767px) {
  :root:has(#rodape-da-decisao) { --altura-rodape: 124px; scroll-padding-bottom: calc(var(--altura-rodape) + 16px); }
  :root:has(#decisao-aprovar-indisponivel) { --altura-rodape: 150px; }
  main:has(#rodape-da-decisao) { padding-bottom: calc(var(--altura-rodape) + 16px); }
}
```

Plano B (ADR-18), só se o CA-12.3 reprovar no Chromium: um `focusin` no `form` que chama
`alvo.scrollIntoView({ block: 'nearest' })` quando o retângulo do alvo cruza o do rodapé; nada mais muda.

- [ ] **Passo 1: escrever os testes que falham**

```ts
// src/components/dados-da-decisao.test.ts — acrescentar
it('D-16 e CV-12: separarRevisao deixa no detalhe só critérios e definição de pronto, na ordem de hoje', () => {
  const itens = itensDaRevisao(pacoteFicticio); // o pacote fictício que o arquivo já usa
  const { sempre, detalhe } = separarRevisao(itens);
  expect(detalhe.map((i) => i.termo)).toEqual(['Critérios de aceite preliminares', 'Definição de pronto']);
  expect(sempre.map((i) => i.termo)).toEqual(['Especificação técnica citada', 'Sistema alvo', 'Repositório destino', 'Parecer de risco citado', 'Níveis de risco', 'Nível de aprovação']);
});
```

```ts
// e2e/decisao-celular.spec.ts — 390 × 844
import { expect, test } from './apoio';
test.use({ viewport: { width: 390, height: 844 } });

test('CA-12.1 e CA-12.2: administradora em decisaoCelularDupla (CTO aprovou A pela API no início): frase fixada, documento, revisão e rodapé visíveis; aprova e vê "Aprovação da administradora registrada. O pacote está aprovado."', async ({ page }) => {});
test('aprovação do CTO num DEC nível cto (decisaoCelularCto) pelo rodapé', async ({ page }) => {});
test('CV-12: sem abrir nada, sistema alvo, repositório destino, três níveis, nível de aprovação, selos de rascunho e todos os alertas visíveis', async ({ page }) => {});
test('CA-12.3: Tab do primeiro ao último campo: nenhum elemento focado sob o rodapé nem sob a barra', async ({ page }) => {
  // para cada foco: const r = await page.evaluate(() => { const a = document.activeElement!.getBoundingClientRect(); const p = document.getElementById('rodape-da-decisao')!.getBoundingClientRect(); return { baixo: a.bottom, topoRodape: p.top, topo: a.top }; });
  // expect(r.baixo).toBeLessThanOrEqual(r.topoRodape); expect(r.topo).toBeGreaterThanOrEqual(56);
});
test('CA-12.4: rodapé ≤ 160 px; cada botão ≥ 44 × 44', async ({ page }) => {});
test('CA-12.5: DEC já decidido sem rodapé e com "Decisão registrada: …"', async ({ page }) => {});
test('CA-12.6 e CV-11: desatualizado com alerta visível sem abrir nada e principal indisponível com a explicação; pedido escondido (A-03)', async ({ page }) => {});
test('CV-13: decisaoRecomendaB sem rádio marcado e sem "Recomendada" em 390 px', async ({ page }) => {});
test('recolhível: "Ver vantagens…" com aria-expanded e aria-controls; aberto mostra opções completas, critérios e definição', async ({ page }) => {});
```

No `e2e/decisao.spec.ts`, o teste "C-14: revisão visível…" ganha uma segunda rodada em 390 × 844 no mesmo DEC (sem
decidir), sem tirar asserção. No `e2e/seguranca.spec.ts`, o C-18 ganha o cabeçalho da T11 de um DEC criado pela API na
demanda `textoDeTerceiro` (CV-18).

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`, `pnpm test:e2e`; esperado: FAIL.
- [ ] **Passo 3: implementar.**
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T13-engenheiro-frontend.md`** — dizendo se o plano B do foco foi preciso.

**Critérios de aceite da tarefa:** CA-12.1 a CA-12.6; CV-11 (A-03 e aviso do C-28 nas duas larguras); CV-12; CV-13 em
390 px; CV-18 (cabeçalho); CV-19; revisão (C-14) antes do formulário no DOM; diálogo de hoje sem mudança de texto;
CV-01.

---

## Fase 6 — Demais telas e acessibilidade nas duas larguras

### T14. T04, T06, T07 e T08 com cartões e tokens

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-14 (CA-14.1, CA-14.2 para estas telas), C14

**Arquivos:**
- Modificar: as páginas e os formulários de `src/app/(painel)/demandas/nova/`, `demandas/[id]/editar/`,
  `demandas/[id]/especificacoes/nova/`, `demandas/[id]/pareceres-risco/novo/` (só classes, `Cartao` em volta de cada
  `fieldset` ou `section`, largura até 760 px), `src/components/CamposDaDemanda.tsx` se for o caso
- Criar: `e2e/reflow.spec.ts` (esta tarefa cria com T04, T06, T07, T08; a T15 acrescenta as suas)

- [ ] **Passo 1: escrever o teste que falha**

```ts
// e2e/reflow.spec.ts — CA-14.2 e RNF-05: em 390 e 320 px, sem rolagem horizontal fora das regiões de tabela de hoje.
import type { Page } from '@playwright/test';
import { entrarComo, expect, test } from './apoio';

async function semRolagemLateral(page: Page) {
  const r = await page.evaluate(() => ({ largura: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(r.largura).toBeLessThanOrEqual(r.janela);
}
for (const largura of [390, 320]) {
  test.describe(`${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 844 } });
    test('T04 Nova demanda', async ({ page }) => {
      await entrarComo(page, 'cto');
      await page.goto('/demandas/nova');
      await semRolagemLateral(page);
    });
    // T06, T07, T08 com a demanda do seed espListaDeTextos (sem criar demanda, G3.10)
  });
}
// e um teste de estrutura: cada fieldset das quatro telas está dentro de um elemento com a classe do Cartao (rounded-cartao)
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test:e2e`; esperado: FAIL (estrutura sem cartão).
- [ ] **Passo 3: implementar** — nenhum campo, ordem, texto, validação, diálogo ou condição muda.
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e` (os e2e dessas telas só com seletor ou texto
  mudado, CA-14.1), `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T14-engenheiro-frontend.md`**

**Critérios de aceite da tarefa:** CA-14.1 e CA-14.2 para T04, T06, T07, T08; `git diff` das quatro telas só com
classe e marcação de cartão (a revisão compara); CV-01.

---

### T15. T09, T10 e T12 com cartões e tokens

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-14 (CA-14.1, CA-14.2 para estas telas), C14

**Arquivos:**
- Modificar: as páginas e os formulários de `demandas/[id]/pacotes-decisao/novo/`, a T10 (ver versão) e
  `configuracao/agentes/` (cada seção num `Cartao`; tabelas da T12 com a rolagem própria de hoje; `Interruptor` com
  trilho `acao`/`tinta-suave` e o texto do estado de hoje); `e2e/reflow.spec.ts` (acrescenta T09, T10 e T12)

- [ ] **Passo 1: escrever o teste que falha** — acrescentar T09, T10 e T12 ao `e2e/reflow.spec.ts`, com o mesmo teste
  de estrutura de cartão.
- [ ] **Passo 2: rodar e ver falhar** — `pnpm test:e2e`; esperado: FAIL.
- [ ] **Passo 3: implementar** — nenhuma condição muda; o interruptor da T12 continua com a mesma regra de quem liga
  (C-12 decide no servidor; `acoes.ts` da T12 congelado em G4).
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T15-engenheiro-frontend.md`**

**Critérios de aceite da tarefa:** CA-14.1 e CA-14.2 para T09, T10, T12; CV-01.

---

### T16. Axe em T01 a T12 nas duas larguras, alvo de toque e fim dos nomes antigos de token

**Engenheiro:** `engenheiro-frontend` · **Risco:** baixo · **Cobre:** RF-16 (axe nas duas larguras), RNF-03, RNF-05,
RNF-13, RF-01 (fim da transição, D-01), CP-6, D-06

**Arquivos:**
- Modificar: `e2e/apoio.ts` (`semViolacoesNasDuasLarguras`), `e2e/axe-todas.spec.ts` (G5; acrescenta os estados da
  T11 em 390 px que ainda não estiverem cobertos e "Mais filtros" aberto na T03), `src/app/globals.css` (sai o bloco
  dos apelidos), todo arquivo de `src/` que ainda use nome antigo ou classe da paleta do Tailwind
- Criar: `test/estatico/classes-antigas.test.ts`, `e2e/alvo-de-toque.spec.ts`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// test/estatico/classes-antigas.test.ts — D-01 e RF-01: depois da T16, só os nomes da 03 existem.
const ANTIGAS = /\b(?:bg|text|border|ring|outline|accent|decoration|fill|stroke)-(?:texto|texto-suave|fundo|fundo-suave|borda|primaria|perigo|sucesso|atencao-texto)\b/;
const PALETA_TAILWIND = /\b(?:bg|text|border|ring|outline|accent|decoration|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\b(?:bg|text|border)-(?:white|black)\b/;
// varre src/**/*.{ts,tsx} sem testes: nenhum casa ANTIGAS nem PALETA_TAILWIND; globals.css não declara --color-texto,
// --color-primaria, --color-borda…; casos plantados ('text-primaria', 'bg-blue-50', 'text-white') reprovam e
// 'text-acao-escura', 'bg-superficie', 'text-branco' passam.
```

```ts
// e2e/apoio.ts — acrescentar (D-06). O estado da página não muda entre as duas medições: nada é clicado nem criado.
export async function semViolacoesNasDuasLarguras(page: Page, rotulo: string): Promise<void> {
  const antes = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.setViewportSize({ width: 1280, height: 720 });
  await semViolacoes(page, `${rotulo} (1280 × 720)`);
  await page.setViewportSize({ width: 390, height: 844 });
  await semViolacoes(page, `${rotulo} (390 × 844)`);
  await page.setViewportSize(antes);
}
```

```ts
// e2e/alvo-de-toque.spec.ts — RNF-03 em 390 px: todo controle de T03, T05, T11 e da gaveta com ≥ 44 × 44 px (links
// dentro de frase ficam de fora, pela lista de seletores da 03, 2.4).
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`, `pnpm test:e2e`; esperado: FAIL (apelidos e classes antigas ainda
  existem; estados novos do axe).
- [ ] **Passo 3: implementar** — trocar as classes restantes pelo mapa da 03, 2.1 (`texto` → `tinta`, `texto-suave` →
  `tinta-media`, `fundo` → `branco`, `fundo-suave` → `superficie`, `borda` → `tinta-suave`, `primaria` → `acao`
  (preenchimento) ou `acao-escura` (link, foco), `perigo` → `erro`, `sucesso` → `positivo`, `atencao-texto` →
  `atencao`) e tirar os apelidos do `@theme`. Violação do axe se corrige na tela; regra do axe não se desliga.
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`; esperado: PASS.
- [ ] **Passo 5: entrega `06-T16-engenheiro-frontend.md`**

**Critérios de aceite da tarefa:** RNF-13 (zero violação em T01 a T12, nos estados da `axe-todas`, em 1280 × 720 e 390 ×
844, mais a gaveta aberta e a T11 com o recolhível aberto); RNF-03; RNF-05; nenhuma classe antiga; CV-20 (nenhuma
regra do axe desligada; `decisao-e2e.test.ts` verde); CV-01.

---

## Fase 7 — Fechamento

### T17. Versão 0.2.0 e capturas de tela

**Engenheiro:** `engenheiro-frontend` · **Risco:** alto (capturas versionadas no git, sem expurgo; CV-17) · **Cobre:**
RF-17 (CA-17.1, CA-17.2), RNF-12, RNF-14, CV-17, CV-01 (conferência final), D-04

**Arquivos:**
- Modificar: `package.json` (`"version": "0.2.0"`), `test/estatico/projeto.test.ts` (G5)
- Criar: `e2e/capturas.spec.ts`, `test/estatico/capturas.test.ts`
- Gerados pelo `pnpm test:e2e` (uma vez, D-04): `docs/manual-tecnico/capturas/t01-entrar-1280.png`,
  `t01-entrar-390.png`, `t03-fila-1280.png`, `t03-fila-390.png`, `t05-demanda-1280.png`, `t05-demanda-390.png`,
  `t11-decisao-1280.png`, `t11-decisao-390.png`, `gaveta-aberta-390.png`

- [ ] **Passo 1: escrever os testes que falham**

```ts
// e2e/capturas.spec.ts — RF-17 e CV-17. Só em loopback, nunca no CI, só com o seed fictício, sem a T02 (QR e segredo).
import { existsSync, mkdirSync } from 'node:fs';
import { entrarComo, test } from './apoio';

const PASTA = 'docs/manual-tecnico/capturas';
// D-04: nome que deve ser regravado mesmo existindo (uso só na correção da 08; volta a [] na mesma passagem).
const REGRAVAR: readonly string[] = [];

export function podeCapturar(baseURL: string | undefined, ci: string | undefined): boolean {
  if (ci) return false;
  if (!baseURL) return false;
  const host = new URL(baseURL).hostname;
  return host === '127.0.0.1' || host === 'localhost';
}

test.beforeEach(({ baseURL }) => {
  test.skip(!podeCapturar(baseURL, process.env.CI), 'CV-17: capturas só em loopback e fora do CI');
});

async function capturar(page: import('@playwright/test').Page, nome: string) {
  const arquivo = `${PASTA}/${nome}.png`;
  test.skip(existsSync(arquivo) && !REGRAVAR.includes(nome), `${arquivo} já existe (D-04)`);
  mkdirSync(PASTA, { recursive: true });
  await page.screenshot({ path: arquivo, fullPage: false });
}

for (const [largura, altura] of [[1280, 720], [390, 844]] as const) {
  test.describe(`${largura} px`, () => {
    test.use({ viewport: { width: largura, height: altura } });
    test('T01 Entrar', async ({ page }) => {
      await page.goto('/entrar');
      await capturar(page, `t01-entrar-${largura}`);
    });
    test('T03 Fila', async ({ page }) => {
      await entrarComo(page, 'cto');
      await page.goto('/demandas');
      await capturar(page, `t03-fila-${largura}`);
    });
    // T05 (etapasDupla, conta cto) e T11 pendente com o formulário (o DEC de etapasDupla, na conta administradora,
    // que ainda não aprovou), no mesmo molde
  });
}
test.describe('390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('gaveta aberta', async ({ page }) => {});
});
```

```ts
// test/estatico/capturas.test.ts — CV-17: podeCapturar só aceita 127.0.0.1 e localhost e nunca com CI; o spec não
// visita /configurar-2fa; a lista de nomes tem as nove capturas; REGRAVAR está vazio no commit.
```

- [ ] **Passo 2: rodar e ver falhar** — `pnpm test`; esperado: FAIL (`projeto.test.ts` espera 0.2.0; `capturas.test.ts`
  sem o spec).
- [ ] **Passo 3: implementar** — versão 0.2.0; nada mais no `package.json`.
- [ ] **Passo 4: rodar e ver passar** — `pnpm test`, `pnpm lint`, `pnpm typecheck` e **três** `pnpm test:e2e`
  seguidos (RNF-12, sem mexer em `retries` nem tempo-limite); esperado: PASS nas três, e as nove PNG criadas na
  primeira e puladas nas duas seguintes. Abra cada PNG e confira que só há dado do `scripts/seed-ficticio.ts`.
- [ ] **Passo 5: entrega `06-T17-engenheiro-frontend.md`** — com a lista das nove PNG, as três execuções e o comando de
  G4 vazio.

**Critérios de aceite da tarefa:** CA-17.1; CA-17.2 (nove capturas, nome com tela e largura, só seed fictício, sem a
T02); CV-17; RNF-12 (três execuções verdes); CV-01 (G4 vazio e `src/modules` só com o arquivo novo); `package.json`
com diff só em `version` e nas duas linhas da T02 (CV-05).

---

## Rastreabilidade

### RF → tarefa

| RF | Tarefas |
|---|---|
| RF-01 Tokens | T03, T16 |
| RF-02 Fontes | T02 |
| RF-03 Casca | T05 |
| RF-04 Gaveta | T05 |
| RF-05 Contadores | T07, T08, T09 |
| RF-06 Tabela densa | T07, T08, T09 |
| RF-07 Cartões | T09 |
| RF-08 Barra de etapas | T10, T11 |
| RF-09 Próxima ação | T10, T11 |
| RF-10 Detalhe A2 | T11 |
| RF-11 Decisão por botões | T12 |
| RF-12 Decisão C2 | T13 |
| RF-13 Telas públicas | T04 |
| RF-14 Demais telas | T14, T15 |
| RF-15 Superfícies que não mudam | G4 em toda tarefa; T07 (CA-15.2); T17 (conferência final) |
| RF-16 Testes | T01 (vigia, piso), T16 (axe nas duas larguras) e o e2e de cada tarefa |
| RF-17 Versão, capturas (CHANGELOG e manual na `10-documentacao`) | T17 |

### Controle CV → tarefa

| CV | Tarefa | CV | Tarefa |
|---|---|---|---|
| CV-01 | G4 em toda revisão; T17 | CV-11 | T12, T13 |
| CV-02 | T01 | CV-12 | T13 |
| CV-03 | T01 | CV-13 | T12, T13 (seed na T06) |
| CV-04 | T02 | CV-14 | T12 |
| CV-05 | T02 (e 08) | CV-15 | T12 |
| CV-06 | T07, T09 | CV-16 | T05 |
| CV-07 | T08, T09 | CV-17 | T17 (e 08) |
| CV-08 | T09 | CV-18 | T09, T11, T13 (seed na T06) |
| CV-09 | T10, T11 | CV-19 | T10 (e T04, T05, T08, T13) |
| CV-10 | T12 | CV-20 | T01 (piso) e G3.2 em toda revisão |
