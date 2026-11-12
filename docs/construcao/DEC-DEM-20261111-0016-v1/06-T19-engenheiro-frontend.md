---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T19-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, fim da T18, T19 e início da T20), 03-ux-ui-design.md (inteiro), 06-T10-engenheiro-dados-bd.md, 06-T10-qa-automacao.md, 06-T12-engenheiro-backend.md, 06-T15-engenheiro-backend.md, 06-T15-tech-lead.md, 06-T15-qa-automacao.md, 06-T18-engenheiro-frontend.md, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, pacote-da-pagina.ts, pagina.test.ts, src/components/dados-da-decisao.ts, dados-do-pedido.ts, dados-do-pedido.test.ts (linhas 1 a 60), Alerta.tsx, src/app/(painel)/demandas/[id]/ConfirmarDemanda.tsx, src/app/(painel)/demandas/ContadoresDaFila.tsx, src/modules/pedido-construcao/pendentes.ts, src/lib/fuso.ts, e2e/apoio.ts, e2e/pedido-construcao.spec.ts (linhas 1 a 150), a saída do pnpm test e do pnpm test:e2e]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T19: a T11 Decisão mostra "Recebido pelo /construir em <data e hora>." e a seção "Pedido de Construção" ganha o texto
novo da 03, 6.2. Cobre RF-15 (CA-15.1, CA-15.2, CA-15.4), RF-16 (CA-16.3) e D-11. Segue a base visual da 0.2.0 e a 03,
sem componente, token nem cor nova: um `<p>` do cabeçalho, o visto SVG que os contadores da T03 já usam (mesmo `path`),
as classes `text-positivo` (a do `Alerta` de sucesso) e `text-tinta`, e o `<time>`.

### Conferência antes do código

A T19 do plano modifica `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`, `src/components/dados-da-decisao.ts` e
`src/components/dados-do-pedido.ts`, e cria `src/components/recebimento.test.ts` e `e2e/recebido-construir.spec.ts`.
Os três testes existentes que precisaram mudar (ver Desvios) também ficam em `src/` e `e2e/`. Tudo está na minha lista
Pode. Não houve motivo para devolver ao plano.

### Pendências das entregas 06-T01 a 06-T18 que citam a T19

Achei as entregas com `git log -S T19` na pasta do pedido: 05-tech-lead, 06-T10 (engenheiro e testes), 06-T12, as três
da 06-T15 e 06-T18-engenheiro (só no `leu`).

| De onde | O que diz | Como ficou |
|---|---|---|
| 06-T10-engenheiro-dados-bd | `recebimentoDoPedido(db, decId)` dá a data de "Recebido pelo /construir em …", ou `null` | **Usado.** A página chama `recebimentoDoPedido(deps.db, p.id)` depois de autorizar `ler_pacote_decisao` e de achar o pacote |
| 06-T10-qa-automacao | RF-15 (T19) coberto no nível da função; a tela fica com a T19 | **Feito:** tela no HTML da página (`pagina.test.ts`) e no navegador (`recebido-construir.spec.ts`) |
| 06-T12-engenheiro-backend | o `pedido_recebido` agora nasce pela rota | Nada a fazer: a T19 só lê o evento |
| 06-T15-engenheiro, 06-T15-tech-lead (Minor 2), 06-T15-qa | os dois DECs dos pedidos do seed herdam o `resumoExecutivo` de `DEC_DO_E2E` ("exige as duas aprovações"), mas o nível é só o CTO; a T19 abre a T11 do `pedidoRecebido` | **Não corrigido aqui:** o texto está em `scripts/seed-ficticio.ts`, fora da minha lista Pode, e é dono o `engenheiro-backend`. Nenhum teste da T19 lê o resumo. Fica em Pendências para a 07 ou a 08 |
| 06-T15-tech-lead | o DEC do `pedidoRecebido` é o único da demanda, então `pacotesDecisao[0]` é ele | **Usado** no e2e, como no plano |

### Arquivos alterados e criados

| Arquivo | O que mudou |
|---|---|
| `src/components/dados-da-decisao.ts` | `TEXTOS_DECISAO.recebido(data)`: "Recebido pelo /construir em <data>." (03, seção 9). `linhaDoRecebimento(recebidoEm)` com a assinatura do G7: `null` sem recebimento; senão `{ texto, iso }`, com a data por `formatarDataHora` |
| `src/components/dados-do-pedido.ts` | `TEXTOS_PEDIDO.texto` com o texto da 03, 6.2, por inteiro |
| `src/app/(painel)/pacotes-decisao/[decId]/page.tsx` | depois de `ler_pacote_decisao`, do pacote e da demanda (os 404 de hoje vêm antes), `recebimentoDoPedido((await obterDeps()).db, p.id)`. Com data, `LinhaDoRecebimento` entra depois de "Repositório destino" e antes de "Cita:": `<p class="flex items-start gap-2 text-tinta">`, visto SVG `aria-hidden` e `focusable="false"` em `text-positivo`, e o texto num `<span>` com a data em `<time dateTime>` (a do fim da frase, por `lastIndexOf`, como na T18). Sem `role`, sem foco. Nenhuma ação nova na matriz |
| `src/components/recebimento.test.ts` (novo) | 4 testes: os 3 do plano e o da virada do dia em UTC (fuso do sistema) |
| `e2e/recebido-construir.spec.ts` (novo) | 2 testes, conta "cto", só leitura, sobre o DEC do `pedidoRecebido` do seed |
| `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` | o dublê de `recebimentoDoPedido` (padrão `null`), o texto novo na linha da seção do pedido e um `describe` T19 com 5 testes (ver Desvios 1) |
| `src/components/dados-do-pedido.test.ts` | o texto novo em `texto` (ver Desvios 2) |
| `e2e/pedido-construcao.spec.ts` | o texto novo no CA-26.3 (ver Desvios 2) |

### Testes

`recebimento.test.ts` (4): CA-15.2 (`null` → `null`); CA-15.1 (texto e ISO, e `TEXTOS_DECISAO.recebido`); a data no
fuso do sistema quando o dia em UTC já virou (01:05Z → 11/11 às 22:05), por igualdade exata; CA-16.3 (o texto exato e
sem "manual").

`pagina.test.ts`, `describe` T19 (5):
- a leitura do recebimento acontece uma vez, com `(DB, DEC)`, depois de `autorizar` e de `obterPacoteDecisao`; as ações
  autorizadas continuam `['ler_pacote_decisao', 'ler_demanda']`; id fora do formato e pacote inexistente dão 404 sem ler;
- CA-15.2: sem recebimento, nenhuma linha, nenhum `text-positivo` e nenhum "aguardando o /construir";
- CA-15.1: o `<p>` inteiro (o texto sem tags é a frase da 03; `<time datetime="2026-11-11T17:32:00.000Z">11/11/2026 às
  14:32</time>.`), o SVG `aria-hidden`, `focusable="false"` e `text-positivo`, o `<p>` em `text-tinta`, sem `role`,
  `tabindex`, link nem botão, e a ordem repositório → recebido → citações → primeiro `h2`, uma vez só;
- CA-15.1, toda situação: substituído, desatualizado, demanda encerrada e demanda entregue. Nos dois primeiros a seção do
  pedido some e a linha fica;
- 03, 6.3: a leitura que falha sobe para a tela de erro.

`e2e/recebido-construir.spec.ts` (2):
- o teste do plano (a linha visível, o `<time>` com `datetime` em `Z`, axe nas duas larguras) e mais: o texto do
  `<time>` no formato, os três `<p>` do cabeçalho na ordem (repositório, recebido, citações), o visto `aria-hidden`, nada
  focável na linha e o texto novo na região "Pedido de Construção" (CA-16.3 no navegador);
- em 390 × 844: a linha visível e na janela, sem rolagem lateral.

### Teste antes do código (visto falhando)

1. `pnpm test` dos três arquivos de teste, sem código:
   ```
    ❯ src/components/recebimento.test.ts (4 tests | 4 failed)
      × CA-15.2: sem pedido_recebido, a linha não existe
    ❯ src/components/dados-do-pedido.test.ts (21 tests | 1 failed)
    ❯ src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (49 tests | 5 failed)
   TypeError: linhaDoRecebimento is not a function
    Test Files  3 failed (3)
         Tests  10 failed | 64 passed (74)
   ```
   O teste T19 "CA-15.2" da página passou sem código: é guarda (nenhuma linha antes de existir a função).
2. O e2e não subia o servidor ("Failed to type check": o build confere os tipos e o teste novo importava uma função
   inexistente). Como na T18, pus só um esboço vazio (`recebido` devolvendo a data, `linhaDoRecebimento` devolvendo
   `null`, sem mexer na página) e rodei de novo:
   ```
     ✘  1 … pedido-construcao.spec.ts:131:1 › CA-26.3 … (texto antigo na seção)
     ✘  6 … recebido-construir.spec.ts:12:1 › T11 com o pedido recebido: a linha no cabeçalho e axe nas duas larguras
     ✘  7 … recebido-construir.spec.ts:36:1 › T11 com o pedido recebido em 390 px …
   Error: expect(locator).toBeVisible() failed — getByText(/^Recebido pelo \/construir em …/) — element(s) not found
     3 failed, 4 passed
   ```

Depois do código: os 6 arquivos de teste da T11 e dos textos, 153 de 153; os dois specs, 7 de 7.

### Resultado

- `pnpm test` (suíte inteira): **289 de 289 arquivos e 6353 de 6353 testes, 0 falharam** (saída lida com Read).
- `pnpm test:e2e` (local, build de produção, porta 3101): **277 testes, 268 passaram e 9 pularam (capturas), saída 0**,
  em 11,1 min. O `✘` de `e2e/vigia.spec.ts:5` é o controle negativo esperado e conta entre os que passaram. Passaram
  também `axe-todas`, `decisao`, `decisao-celular` e `alvo-de-toque`, que leem a T11.
- Tempo dos testes novos: 2,5 s e 0,6 s, longe dos 24 s. `retries` e o tempo-limite não mudaram.
- axe sem violação na T11 com a linha, em 1280 × 720 e 390 × 844 (CA-15.4).
- `pnpm typecheck` e `pnpm lint`: limpos.
- G4: o `git diff --stat a9fd9b8` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio. Nenhum `'use server'`
  novo, nenhuma ação nova na matriz.
- `git status --short`: 6 alterados e 2 novos, todos da tarefa.

### Desvios do plano

1. **`pagina.test.ts` mudou (fora da G5).** A página passa a ler o recebimento pelo banco, e o teste usa um banco dublê
   (`{ dubleDoBanco: true }`): sem o dublê de `recebimentoDoPedido`, todos os 49 testes quebrariam. Entraram o `vi.mock`
   de `modules/pedido-construcao/pendentes`, o `mRecebimento.mockResolvedValue(null)` no `beforeEach` e o `describe` T19.
   A única linha trocada é a do item 2. Nenhuma asserção saiu; o arquivo não está no piso do D-17.
2. **Texto antigo da seção em dois testes (fora da G5).** `dados-do-pedido.test.ts:35` (o `texto` do `toMatchObject`) e
   `e2e/pedido-construcao.spec.ts:142` (o `toContainText` do CA-26.3), como `pagina.test.ts:599`, conferiam por inteiro o
   texto que a 03, 6.2 manda trocar (CA-16.3). Cada um troca só a string pela nova, com um comentário; a asserção e o
   resto do teste ficam (`git diff`: 1 linha removida e a mesma asserção com o texto novo em cada um).
3. **Testes além do trecho do plano:** o da virada do dia em `recebimento.test.ts`, o `describe` T19 da página e as
   asserções a mais e o segundo teste (390 px) do e2e, listados acima.
4. **Leitura depois da demanda**, e não logo depois de autorizar: assim os 404 de hoje (pacote ou demanda que não
   existem) acontecem sem ler o histórico. Continua depois de `ler_pacote_decisao`, como o plano pede.
5. **O componente `LinhaDoRecebimento` fica na própria página** (não é componente do design system, uso único), e a data
   do `<time>` sai do texto por `lastIndexOf`, como `Confirmada` na T18. Assim `linhaDoRecebimento` mantém a assinatura
   do G7.

## Decisões tomadas

- A data é formatada no servidor (Server Component), por `formatarDataHora`, e o ISO vai no `dateTime`: nada é
  formatado no navegador.
- O texto fica num `<span>` dentro do `<p>` flex, para o `gap` do flex não abrir espaço entre a frase e o `<time>`.
- O visto é o mesmo `path` do contador pressionado da T03 (a 03 pede "o visto já usado nos contadores"), com
  `text-positivo`, cor que já existe no `Alerta` de sucesso: nenhum token novo.
- CA-15.2 fica em Vitest (D-11); o e2e só confere o caso positivo, sobre o DEC que o seed já recebeu.
- O `resumoExecutivo` do seed não foi mexido: `scripts/` não está na minha lista Pode.
- Glob e Grep não estavam disponíveis nesta sessão. Li com Read e localizei arquivos por `git log -S` e `git log -L`.

## Pendências

- Nenhuma bloqueia a T19.
- Para a `06-T19-revisao`: conferir os desvios 1 e 2 (três testes existentes fora da G5, só com a troca do texto e o
  dublê novo; nenhuma asserção saiu).
- Para a 07 ou a 08 (`engenheiro-backend`, `scripts/seed-ficticio.ts`): o Minor 2 da 06-T15-revisao segue aberto. A T11
  do `pedidoRecebido` mostra no Resumo executivo "exige as duas aprovações" num DEC de nível "Só o CTO". É texto
  fictício, mas contradiz o nível na tela; um `resumoExecutivo` próprio para os dois pedidos resolve.
- Para a `07-qa-funcional` (G2): à mão, a leitura da linha no leitor de tela (o ícone não deve ser lido) e o zoom de
  200 % e 400 % da T11 com a linha nova.
- Para a `10-documentacao`: o manual que descrever a seção "Pedido de Construção" deve trocar a frase do envio só
  manual pelo texto novo (CA-16.3) e citar a linha "Recebido pelo /construir em …" no cabeçalho da T11.
- As caixas `- [ ]` da T19 no plano não foram marcadas: a 06 não edita `docs/` (G1).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — HEAD em fbd8243 (06-T18-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S T19 --oneline --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — 05, 06-T10 (duas), 06-T12, 06-T15 (três) e 06-T18
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S PaginaDecisao --format=%h --name-only -- src test e2e` — só `pagina.test.ts` renderiza a página
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "pacotes-decisao/[decId]/page" --format=%h --name-only -- src test e2e` — nenhum
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "from './page'" --format=%h --name-only -- "src/app/(painel)/pacotes-decisao"` — só `pagina.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "manual nesta vers" --format=%h --name-only` — o texto antigo em `pagina.test.ts`, `dados-do-pedido.test.ts` e `e2e/pedido-construcao.spec.ts` (e outra frase em `detalhe.ts`, fora da T19)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "Gere o pedido" --format=%h --name-only -- src e2e test scripts` — os mesmos três testes e `dados-do-pedido.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "TEXTOS_PEDIDO.texto" --format=%h --name-only -- src e2e test scripts` — nenhum
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -L "/manual nesta vers/,+3:src/app/(painel)/demandas/[id]/detalhe.ts" --format=%h` — `dicaAprovada`, outro texto, fora da T19
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -L "/Gere o pedido/,+2:e2e/pedido-construcao.spec.ts" --format=%h` — a linha do e2e com o texto antigo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 -L "/pedidoRecebido:/,+1:scripts/seed-ficticio.ts" --format=%h` — o título do seed
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "text-positivo" --format=%h --name-only -- src` — a classe já existe em `Alerta.tsx`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/recebimento.test.ts src/components/dados-do-pedido.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"` — antes do código: 10 falharam, 64 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/recebido-construir.spec.ts e2e/pedido-construcao.spec.ts` — antes do código: o servidor não subiu (o build confere os tipos do teste novo)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/recebido-construir.spec.ts e2e/pedido-construcao.spec.ts` — com o esboço vazio: 3 falharam, 4 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/recebimento.test.ts src/components/dados-do-pedido.test.ts src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao"` — depois do código: 6 de 6 arquivos, 153 de 153
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/recebido-construir.spec.ts e2e/pedido-construcao.spec.ts` — 7 de 7
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 289 de 289 arquivos, 6353 de 6353 testes, código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts "drizzle/000[0-6]_*.sql" "drizzle/meta/000[0-6]_snapshot.json"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 6 alterados e 2 novos, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 6 arquivos, 160 inserções e 4 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/dados-do-pedido.test.ts e2e/pedido-construcao.spec.ts` — só a troca do texto, nenhuma asserção removida
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"` — revisão do diff
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano, saída lida com Read: 277 testes, 268 passaram, 9 pulados, saída 0, em 11,1 min
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — depois do e2e, só os 8 arquivos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa (289 de 289 arquivos, 6353 de 6353 testes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (só as contas e a demanda fictícias do seed e datas fixas; nenhum token gerado)
- [x] só mudaram os arquivos da tarefa (os cinco do plano, mais os três testes existentes que conferiam o texto trocado, explicados nos Desvios)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR (6.1, 6.2 e seção 9), e o axe não acusa violação nas telas tocadas (T11 com o recebimento, em 1280 × 720 e 390 × 844; T11 do pedido em `pedido-construcao.spec.ts`)
