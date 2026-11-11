---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T17-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 1 a 12), docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G6 e T17), 06-T17-engenheiro-frontend.md, passagens.jsonl (pelo diff do commit), commit e61a556 e a passagem inteira da T17 (diff 2604b9f..e61a556), src/app/api/saude/route-qa.test.ts (diff desde 198e97d), test/estatico/tipografia-h2.test.ts, src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (linhas 770 a 839), as nove PNG de docs/manual-tecnico/capturas/]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T17 (versão 0.2.0 e capturas de tela), sobre a passagem inteira da construção: `5cccea9`, `b1611c2` e
`e61a556`, comparada com `2604b9f` (o fim da 06-T16-testes). O `git show` está fora das regras desta etapa; li o
commit pelo `git diff` do intervalo.

**Resultado: aprovada, sem Critical nem Important.** Ficam três Minor nas Pendências e as três decisões que a construção
deixou para a revisão (seção 2).

### 1. O que conferi

| Ponto | Resultado |
|---|---|
| Escopo (plano, T17) | `package.json` (só `version`), `test/estatico/projeto.test.ts` (G5), `e2e/capturas.spec.ts`, `test/estatico/capturas.test.ts`, nove PNG. A mais: `e2e/capturas.ts` (desvio 1, aceito: mesmo molde de `e2e/vigia.ts`); `page.tsx:253` e `tipografia-h2.test.ts` (Minor 3 da revisão anterior da T16, pedido para antes das capturas); `pagina.test.ts:834` (Minor 1 da volta da T16); `GavetaMenu.tsx` e `casca.spec.ts` (desvio 3, decidido na seção 2.2) |
| CA-17.1 / CV-05 | `git diff 198e97d -- package.json`: só `version` 0.1.13 → 0.2.0 e as duas linhas `@fontsource` 5.3.0 da T02. `pnpm-lock.yaml` só com a T02 |
| CA-17.2 / CV-17 | As nove PNG abertas uma a uma: só textos do seed ("(fictício)", "Pessoa Ficticia …", `DEM-20261111-00nn`, `wsssistemas2626-crypto/painel-ficticio`), sem e-mail, senha, QR, TOTP nem token; a T02 não aparece. Nome com tela e largura |
| CV-17 no código | `podeCapturar` recusa qualquer `CI` definido e todo host fora de `127.0.0.1`/`localhost` (inclusive `0.0.0.0`, `[::1]`, sufixo `.exemplo.test`, loopback só na consulta). O `beforeEach` pula todo teste por ela; o estático trava a forma do `beforeEach`, a ausência de `baseURL:` no spec, a ausência da T02 e das contas sem 2FA, e um `.screenshot(` só. Na homologação (`127.0.0.1`, sem `CI`) as capturas são puladas porque as PNG já existem (D-04) |
| D-04 | `REGRAVAR` vazio no commit (com teste); `deveGravar` testada nos três casos; o spec pula antes de entrar quando a PNG existe |
| C-36 (G3.10) | O spec só lê: usa a `etapasDupla` do seed; a T11 abre na administradora sem registrar nada |
| TDD | Vermelho mostrado na entrega para `capturas.test.ts`, `projeto.test.ts`, `tipografia-h2.test.ts` e para o e2e novo da gaveta ("Fechar menu 179–340"). Cada asserção nova falharia sem o código |
| G3.2 / CV-20 | `projeto.test.ts`: muda o literal, o título e o comentário, mesmo número de `expect(`. `pagina.test.ts:834`: troca a regex local pelo auxiliar `link()`, que acrescenta a exigência de exatamente um link com o texto "Criar pacote novo"; a asserção de classes é a mesma. Nada apagado, nenhum `retries`, tempo-limite ou `test.slow()` |
| G4 (CV-01) | Não sai vazio: só `src/app/api/saude/route-qa.test.ts`, +5 linhas, da 06-T16-testes. Decisão na seção 2.1 |
| `src/modules` | Só `resumo-da-fila.ts` e o teste dele (T07), como o G4 permite. Nenhum `'use server'` novo ou alterado |
| RNF-12 | Três `pnpm test:e2e` seguidos com o código final (A, B, C): 249 passaram, 9 capturas puladas, `retries: 0` |
| Minha rodada | `pnpm test` 5230 de 5230 (233 arquivos, 186 s); `pnpm lint` e `pnpm typecheck` limpos |

### 2. Decisões sobre os pontos deixados para a revisão

**2.1 G4 não vazio (`src/app/api/saude/route-qa.test.ts`): aceito como exceção registrada.** Não peço outra solução.

- O que mudou: em `route-qa.test.ts:75` e `:88`, `await deps.pool.query('select 1');` antes do `GET()` nos dois testes de
  200, mais três linhas de comentário (`:70` a `:72`). `route.ts` e `route.test.ts` não têm diff desde 198e97d.
- Razão: o CV-01 congela a **superfície** (rota, Server Action, proxy, autenticação, banco). Um arquivo de teste não é
  superfície: a rota e o limite de 150 ms dela ficam iguais, e nenhuma asserção saiu ou ficou mais fraca. A linha nova é
  uma pré-condição do ambiente (o pool já conectado, como num app de pé e como o `route.test.ts` já faz), que tira do
  tempo da rota a primeira conexão TCP. Pela G3.2, é o "passo equivalente" que estabiliza o teste sem mexer em tempo.
- Reverter traria de volta a instabilidade do 503 na suíte cheia; mover o teste para fora de `src/app/api` quebraria a
  regra de teste ao lado do código (padrão técnico, seção 2).
- **Como fica o G4 daqui em diante (08 e 08-reteste):** a saída esperada do comando do G4 deixa de ser vazia e passa a ser
  **exatamente** este diff de `route-qa.test.ts`: cinco linhas acrescentadas, nenhuma removida (as duas chamadas
  `deps.pool.query('select 1')` e as três de comentário). Qualquer outra linha nessa saída continua sendo Critical.
- Falha de processo registrada: a 06-T16-testes mexeu num caminho do G4 depois da revisão da T16, e nenhuma revisão o viu
  até agora. A qa-automacao deve citar o G4 na entrega sempre que tocar um caminho dele.

**2.2 Correção de "Fechar menu" em `GavetaMenu.tsx` (arquivo da T05): aceita dentro da T17.**

- Razão: a captura `gaveta-aberta-390.png` é entrega desta tarefa, e mostrava um defeito real da T05 (botão de 179 a 340
  px numa gaveta de 320 px, com rolagem lateral). Commitar a PNG com o defeito ou levá-lo à 08 com `REGRAVAR` seria pior.
  É o mesmo critério que levou o Minor 3 da T16 para antes das capturas.
- O defeito tem teste que falhou antes (`e2e/casca.spec.ts`, teste novo do describe do celular, em 390 e 320 px), e o
  teste mede todo `a` e `button` da gaveta, o que cobre o furo do `casca-qa.spec.ts:158` (`toBeInViewport` aceita o
  botão visível em parte).
- A correção é mínima: `flex-wrap` na linha da marca e `ml-auto` no botão (`GavetaMenu.tsx:125` e `:127`). Texto, ordem
  no DOM, `aria-*`, foco e manipulador não mudaram; `gaveta-qa.test.ts`, `casca`, `casca-qa`, `alvo-de-toque` e o axe da
  gaveta seguem verdes. A PNG final mostra o botão inteiro, na linha de baixo, à direita, como na 03, 3.3.
- O desvio fica registrado nesta revisão; a 07-qa-funcional confere à mão a ordem do Tab da gaveta em 390 e 320 px.

**2.3 Tempo do `e2e/decisao.spec.ts:148` (23,4 s de 30 s): não bloqueia agora; recomendação para a 09-entrega.**

- Não bloqueia: o RNF-12 está cumprido (três rodadas verdes seguidas, sem `retries`), e o teste é da T12/T13, fora
  desta tarefa.
- **Recomendação para a `09-entrega` (devops-sre):** no CI e na homologação, registrar a duração de
  `decisao.spec.ts:148`, `reflow-t15-qa.spec.ts:105` e `axe-todas.spec.ts:395`. Se algum passar de 24 s (80% do limite)
  ou estourar os 30 s, **não** subir `timeout`, `retries` nem usar `test.slow()` (G3.2): devolver ao
  `engenheiro-frontend` para dividir `decisao.spec.ts:148` em dois testes, cortando na parte de 390 px da T13, sem tirar
  asserção, com o `test/estatico/decisao-e2e.test.ts` e o piso de asserções (`piso-de-assercoes.test.ts`) verdes.

### 3. Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede; o que passa do plano são os dois Minor pedidos pela revisão da T16 e o desvio 2.2,
      aceito acima. Nenhum arquivo congelado foi tocado nesta tarefa (o G4 não vazio é da 06-T16-testes, 2.1).
- [x] Há teste para cada comportamento novo, e ele falharia sem o código (vermelho na entrega).
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log, fixture ou PNG.
- [x] Entrada externa validada com Zod: não se aplica (a tarefa não cria rota nem Server Action).
- [x] Banco: não se aplica (sem migration, sem esquema).
- [x] Nada duplica função que já existe no repositório: há uma duplicação em código de teste, classificada como Minor
      (Pendências, M1), que não bloqueia pela regra da própria seção 12.
- [x] Textos em pt-BR; nenhum texto mudou; o axe da gaveta e a `axe-todas` passam nas três rodadas.
- [x] Minor vai para Pendências; não há Critical nem Important.
- [x] `/code-review` e `/security-review` no PR: não se aplicam a esta etapa (ficam com a 08 e o PR).

## Decisões tomadas

- G4 não vazio aceito como exceção registrada, com a saída esperada fixada (2.1): é teste, a rota não mudou e reverter
  traria a instabilidade de volta.
- Correção da gaveta aceita dentro da T17 (2.2): a captura é entrega da tarefa, a mudança é mínima e veio com teste que
  falhou antes.
- Tempo do `decisao.spec.ts:148` vira recomendação para a 09, com limite de 24 s e caminho definido (2.3): o RNF-12 está
  cumprido e o teste não é desta tarefa.
- `e2e/capturas.ts` separado do spec aceito (desvio 1): o estático precisa importar as regras sem carregar o Playwright.
- `podeCapturar` com `ci !== undefined` aceito (desvio 2): é mais estrito que o plano e cumpre o CV-17 ao pé da letra.
- Duplicação de `h3ForaDaEscala` classificada como Minor: é código de teste, no mesmo arquivo, com casos plantados que
  travam o comportamento.

## Pendências

- **M1 (Minor, dívida de teste):** `test/estatico/tipografia-h2.test.ts:60` a `:68`. `h3ForaDaEscala` repete
  `h2ForaDaEscala` (`:21` a `:29`) linha a linha; só muda a regex da tag. Razão: uma mudança na regra de escala (a
  `ETIQUETA`, ou um `h4`) teria de ser feita em dois lugares. Caminho: uma `foraDaEscala(tag, arquivo, fonte)` e as duas
  exportadas como chamadas dela, sem mudar os casos plantados. Para quem tocar o arquivo depois (a 08, se houver correção
  na área); senão, fica no registro de dívida do pedido.
- **M2 (Minor, para a `09-entrega`):** `e2e/decisao.spec.ts:148`, tempo de 11,2 s a 23,4 s na VPS. Seguir a seção 2.3.
- **M3 (Minor, para a `10-documentacao`):** `t01-entrar-1280.png` e `t01-entrar-390.png` mostram o contorno de foco no
  `h1` "Entrar". É o foco programático com que a tela abre, e não defeito; o manual cap. 08 deve dizer isso na legenda,
  para o leitor não tomar o contorno por erro de layout.
- **Para a `08-revisao` e o `08-reteste`:** o G4 tem saída esperada não vazia (2.1). Na conferência do CV-17, saber que
  `wsssistemas2626-crypto/painel-ficticio` (conta da empresa, repositório fictício do seed) aparece nas duas `t11-*`, e
  que o campo de data mostra `mm/dd/yyyy` (formato do Chromium de teste, não texto do app).
- **Para a `06-T17-testes` (qa-automacao):** o teste novo da gaveta e o `capturas.test.ts` são os pontos novos; a
  entrega deve citar o G4 se tocar qualquer caminho dele (2.1).
- **Para a `07-qa-funcional`:** ordem do Tab da gaveta em 390 e 320 px (marca, "Fechar menu", itens, "Sair"), com o botão
  agora na linha de baixo.
- Seguem sem mudança as pendências das revisões anteriores (itens da 08 e da 10 da T16, M2 da 06-T13-tech-lead, dívida de
  `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e `devolver`).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 e61a5562a53c6cfe9d9a1d20db3ea67d0c56a8eb~1 e61a5562a53c6cfe9d9a1d20db3ea67d0c56a8eb` — o commit informado só traz a entrega regravada e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — a T17 em 5cccea9, b1611c2 e e61a556, sobre 2604b9f
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 2604b9f e61a5562a53c6cfe9d9a1d20db3ea67d0c56a8eb` — 21 arquivos, as nove PNG e o código da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 5cccea9 e61a5562a53c6cfe9d9a1d20db3ea67d0c56a8eb` — só a entrega e o `passagens.jsonl` depois do primeiro commit
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 2604b9f e61a5562a53c6cfe9d9a1d20db3ea67d0c56a8eb -- src test e2e package.json` — diff de código e teste lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/app/api` — só `route-qa.test.ts`, +5 linhas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "scripts/seed-ficticio" -- e2e` — vários specs já importam o seed, como o de capturas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "h3" -- src/app/globals.css` — o `globals.css` tem regra de `h3`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — 5230 de 5230, 233 arquivos, 186 s
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — G4: só `src/app/api/saude/route-qa.test.ts`, 5 inserções (seção 2.1)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 198e97d -- src/modules package.json pnpm-lock.yaml` — `resumo-da-fila.*` (T07), `package.json` e o lock da T02
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- package.json` — só `version` e as duas linhas `@fontsource` 5.3.0
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
