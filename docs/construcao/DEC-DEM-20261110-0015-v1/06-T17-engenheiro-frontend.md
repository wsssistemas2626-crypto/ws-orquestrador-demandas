---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T17-construcao
agente: engenheiro-frontend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T14 a T17), 01-analista-requisitos.md (RF-12 a RF-17, RNF), 03-ux-ui-design.md (seções 0 a 11), 04-seguranca-aplicacao.md (seção 2 C13 a C16, seção 3, seção 4), 06-T16-tech-lead.md (volta e a revisão anterior, 8cd67ca, pelo git diff), 06-T16-qa-automacao.md, 06-T16-engenheiro-frontend.md, scripts/seed-ficticio.ts, e2e/apoio.ts, e2e/axe-todas.spec.ts, e2e/casca.spec.ts, e2e/casca-qa.spec.ts (linhas 150 a 189), e2e/detalhe-a2.spec.ts, e2e/decisao-celular.spec.ts (linhas 1 a 80), e2e/decisao-celular-qa.spec.ts, e2e/fila-contadores.spec.ts, e2e/vigia.ts, e2e/servidor.ts (linhas 1 a 40), playwright.config.ts, vitest.config.ts, eslint.config.mjs, .gitignore, package.json, test/estatico/projeto.test.ts, test/estatico/tipografia-h2.test.ts, test/estatico/vigia.test.ts, test/estatico/sem-recurso-externo.test.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/piso-de-assercoes-qa.test.ts, test/estatico/decisao-e2e.test.ts, test/estatico/varreduras-qa.test.ts, src/app/globals.css, src/app/(painel)/demandas/[id]/page.tsx (linhas 225 a 284), src/app/(painel)/demandas/fila.tsx (linhas 150 a 227), src/app/(painel)/pacotes-decisao/[decId]/page.tsx (linhas 155 a 189), src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts (linhas 770 a 847), src/components/dados-da-decisao.ts (linhas 1 a 140), src/components/casca/GavetaMenu.tsx, src/components/casca/gaveta-qa.test.ts, src/components/marca/MarcaWs.tsx]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T17 feita: versão 0.2.0, as nove capturas de tela do manual, o spec e o teste estático delas (CV-17, D-04), o Minor 3
da revisão anterior da T16 (`h3` da T05, antes das capturas) e o Minor 1 da volta da T16 (`pagina.test.ts`). As
capturas mostraram um defeito real na gaveta do menu em 390 px ("Fechar menu" cortado pela borda). Corrigi com teste
antes de fechar as capturas (desvio abaixo). Com o código final: `pnpm test` 5230 de 5230, `pnpm lint` e
`pnpm typecheck` limpos, e `pnpm test:e2e` verde **três vezes seguidas** (RNF-12), cada rodada sozinha.

Há um ponto para a revisão decidir: o comando do G4 (CV-01) **não sai vazio**. O que aparece é
`src/app/api/saude/route-qa.test.ts`, mudado pela `06-T16-testes` (commit 2604b9f), e não por esta tarefa. Ver
"CV-01" abaixo e a primeira linha de Pendências.

### 0. Testes escritos antes e vistos falhando

Primeiro escrevi `test/estatico/capturas.test.ts`, o `h3` em `tipografia-h2.test.ts`, a versão 0.2.0 em
`projeto.test.ts` e o Minor 1 em `pagina.test.ts`, e rodei antes de qualquer código. Resultado: 3 arquivos vermelhos.
O `pagina.test.ts` passou, como devia, porque o Minor 1 só troca a forma da asserção. Trecho:

```
 FAIL  test/estatico/capturas.test.ts
Error: Cannot find module '../../e2e/capturas' imported from …/test/estatico/capturas.test.ts
 FAIL  test/estatico/projeto.test.ts > package.json > versão 0.2.0, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)
AssertionError: expected '0.1.13' to be '0.2.0'
 FAIL  test/estatico/tipografia-h2.test.ts > 03, 2.3 (T17): h3 só com a escala do globals.css > nenhum h3 de src/ sobrescreve tamanho ou peso
+   "src/app/(painel)/demandas/[id]/page.tsx:253: text-lg",
+   "src/app/(painel)/demandas/[id]/page.tsx:253: font-semibold",
 Test Files  3 failed | 1 passed (4)
      Tests  2 failed | 58 passed (60)
```

O e2e novo da gaveta também falhou antes da correção (seção 4). O `e2e/capturas.spec.ts` não tem estado vermelho
próprio, porque é ele que produz as PNG. O que o trava é o teste estático, que estava vermelho acima.

### 1. Versão 0.2.0 (CA-17.1, CV-05)

- `package.json`: `"version": "0.1.13"` virou `"0.2.0"`. Nada mais mudou nele nesta tarefa.
- `test/estatico/projeto.test.ts` (G5): o teste "versão 0.1.13, …" virou "versão 0.2.0, …". Mudaram o literal da versão,
  o título e o comentário. O número de `expect(` é o mesmo.
- `git diff 198e97d -- package.json`: só `version` e as duas linhas `@fontsource` da T02 (`5.3.0`, exatas).

### 2. Capturas (RF-17, CA-17.2, CV-17, D-04)

**Arquivos novos:**

- `e2e/capturas.ts`: regras puras, sem Playwright, para o teste de unidade poder importar:
  - `PASTA_DAS_CAPTURAS` (`docs/manual-tecnico/capturas/`, resolvida a partir do próprio arquivo);
  - `CAPTURAS` (os nove nomes) e o tipo `NomeDaCaptura`;
  - `REGRAVAR` (vazio);
  - `podeCapturar(baseURL, ci)`: só `127.0.0.1` ou `localhost`, e nunca com `CI` definido, com qualquer valor;
  - `deveGravar(nome, existe)`.
- `e2e/capturas.spec.ts`:
  - `beforeEach` pula com `!podeCapturar(baseURL, process.env.CI)`;
  - cada teste pula antes de entrar quando o PNG já existe (D-04);
  - a foto é só da janela (`fullPage: false`), do topo, depois de `document.fonts.ready`, com `animations: 'disabled'`;
  - só lê: não cria demanda nem versão (C-36). A T05 e a T11 usam a `etapasDupla` do seed. A T11 abre na conta
    administradora, que ainda não aprovou e vê o formulário (o estado do CA-12.1), sem registrar nada;
  - não visita `/configurar-2fa` nem usa as contas sem 2FA.
- `test/estatico/capturas.test.ts`, com 11 testes:
  - `podeCapturar` aceita `127.0.0.1` e `localhost` com qualquer porta. Recusa com `CI` (`true`, `1`, `false` e vazio),
    sem baseURL, com endereço inválido, com `0.0.0.0`, com `[::1]`, com `127.0.0.1.exemplo.test`, com
    `localhost.exemplo.test`, com o domínio de produção e com `127.0.0.1` só na consulta;
  - o spec usa o `beforeEach` com `podeCapturar(baseURL, process.env.CI)` e não troca a `baseURL`;
  - o spec não cita a T02 nem as contas sem 2FA;
  - há um `.screenshot(` só, com `path: arquivo, fullPage: false` e o caminho `${PASTA_DAS_CAPTURAS}${nome}.png`;
  - os nove nomes, com tela e largura no nome, e o spec produz cada um;
  - `REGRAVAR` vazio;
  - `deveGravar` grava a que falta, pula a que existe e regrava só a de `REGRAVAR`.

**As nove PNG** (em `docs/manual-tecnico/capturas/`, todas novas):

| Arquivo | Tela e estado | Conta |
|---|---|---|
| `t01-entrar-1280.png` | T01 vazia, foco no `h1` (como a tela abre) | nenhuma |
| `t01-entrar-390.png` | idem em 390 × 844 | nenhuma |
| `t03-fila-1280.png` | T03 com dados, "Todas 23" (as 23 do seed), menu lateral | cto |
| `t03-fila-390.png` | T03 em cartões, pílulas e "Mais filtros" | cto |
| `t05-demanda-1280.png` | T05 da `etapasDupla`: barra de etapas (4 de 5, "1 de 2 aprovações") e Próxima ação | cto |
| `t05-demanda-390.png` | idem em uma coluna | cto |
| `t11-decisao-1280.png` | T11 do DEC da `etapasDupla`: aprovação do CTO registrada, opção fixada, documento | administradora |
| `t11-decisao-390.png` | idem na C2, com o rodapé "Aprovar a opção A", "Devolver" e "Arquivar" | administradora |
| `gaveta-aberta-390.png` | gaveta aberta sobre a T03 | cto |

**Conferência de cada PNG (CV-17), aberta e lida uma a uma:**

- Só aparecem textos do `scripts/seed-ficticio.ts`: os títulos "(fictício)", "Pessoa Ficticia CTO", "Pessoa Ficticia
  Administradora", "Pessoa Ficticia Produto", "Pessoa Ficticia Sem 2FA" (autora das versões da `etapasDupla`), o
  contexto "A mudança gera compromisso com o cliente e já tem a aprovação do CTO.", o resumo e o repositório
  `wsssistemas2626-crypto/painel-ficticio` do `ESP_DO_E2E`, e os ids `DEM-20261111-00nn`.
- Não há e-mail, senha, QR, segredo, código TOTP nem token em nenhuma.
- A fila mostra "Todas 23": é o `TOTAL_DEMANDAS_DO_SEED`. A spec roda antes de qualquer spec que crie demanda pela API
  (ordem alfabética, `workers: 1`). Antes dela, só a `axe-todas` grava algo: ESP, RSK e DEC fictícios na `axeSoCto`,
  que na fila aparecem só como marcas de etapa.
- A data e a hora vêm do relógio da rodada (11/11/2026). Os ids e as datas mudam a cada banco novo, e por isso o D-04
  não regrava.

**Rodadas:** as nove nasceram na rodada 1 (a gaveta foi regravada depois da correção, ver seção 4). Nas rodadas A, B e
C as nove foram puladas ("já existe"), e a árvore continuou com as mesmas nove.

### 3. Minor 3 da revisão anterior da T16: `h3` da T05, antes das capturas

- `src/app/(painel)/demandas/[id]/page.tsx:253`: o `h3` de `ListaDeVersoes` perdeu `text-lg font-semibold` e ficou com
  a escala da 03, 2.3 (16 px / 600), que vem da regra de `h3` do `globals.css`.
- `test/estatico/tipografia-h2.test.ts`: um describe novo, "03, 2.3 (T17): h3 só com a escala do globals.css", com
  `h3ForaDaEscala`. Tem casos plantados: `text-lg font-semibold` e `md:text-xl` reprovam; cor, espaço e `sr-only`
  passam; `h2` fica de fora; a etiqueta Mono em caixa alta é a exceção. A varredura cobre `src/**/*.tsx`. O describe do
  `h2` ficou intacto.

### 4. Defeito achado na captura da gaveta, e a correção (desvio)

A primeira `gaveta-aberta-390.png` mostrou "Fechar menu" cortado pela borda direita da gaveta. A causa: a gaveta tem
320 px, com 288 px úteis. A marca e o botão (`shrink-0`) não cabiam lado a lado, e a linha não quebrava. O botão ia de
179 a 340 px, e o conteúdo ganhava rolagem lateral. O `casca-qa.spec.ts:158` não pegava o defeito, porque o
`toBeInViewport` aceita o botão visível em parte. O desenho da 03, 3.3, põe "Fechar menu" na linha de baixo, à direita.

- **Teste antes:** em `e2e/casca.spec.ts`, no describe do celular, entrou "03, 3.3: em 390 e em 320 px, 'Fechar menu'
  e todo controle inteiros dentro da gaveta, sem rolagem lateral". Ele confere que todo `a` e `button` da gaveta fica
  entre as bordas dela e que o conteúdo não rola de lado, em 390 px (gaveta de 320 px) e em 320 px (gaveta de 272 px).
  Rodado antes da correção, falhou:

```
    Error: 390 px: controles fora da gaveta
    - Array []
    + Array [
    +   "Fechar menu 179–340",
    + ]
  1 failed
```

- **Correção:** `src/components/casca/GavetaMenu.tsx`. A linha da marca ganhou `flex-wrap`, e "Fechar menu" ganhou
  `ml-auto`, que o leva à direita na linha de baixo. Nenhum texto, ordem no DOM, `aria-*`, foco ou manipulador mudou.
  O `gaveta-qa.test.ts` (ordem marca, "Fechar menu", nav, conta e "Sair") continua verde.
- **Depois:** `casca`, `casca-qa`, `alvo-de-toque`, `capturas` e `moldura` deram 32 de 32. As 8 capturas que já
  existiam foram puladas. A `gaveta-aberta-390.png` foi regravada pelo caminho do D-04: `REGRAVAR` recebeu o nome dela
  para essa rodada e voltou a `[]` em seguida. A captura nova mostra o botão inteiro, à direita, abaixo da marca.

### 5. Minor 1 da volta da T16: `pagina.test.ts`

`src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`, no caso do desatualizado, passou a usar o auxiliar `link()`
com `` `/demandas/${ID}/pacotes-decisao/novo` `` e o rótulo "Criar pacote novo" (`TEXTOS_DECISAO.criarPacoteNovo`),
como os outros dois casos. Assim o teste confere que existe exatamente um link, com esse texto. Continua uma linha de
`expect(`, e a asserção das classes é a mesma.

### 6. Três rodadas e2e seguidas (RNF-12, CA-16.3), cada uma sozinha

`playwright.config.ts` sem mudança: `retries: 0`, `workers: 1` e o tempo-limite padrão de 30 s por teste. Não usei
`test.slow()`. Cada rodada rodou sozinha, sem outra suíte, `lint` ou `typecheck` ao mesmo tempo. Em todas, o "✘" da
`vigia.spec.ts:5` é o teste negativo marcado `test.fail()` (CV-03), que conta como passou.

| Rodada | Código | Resultado | Duração | Teste mais longo |
|---|---|---|---|---|
| 1 | antes da correção da gaveta | 257 passaram; as nove PNG criadas | 15,4 min | 16,9 s (`reflow-qa.spec.ts:152`, T06 axe em 1280 px) |
| A | final | **249 passaram, 9 puladas** (as capturas já existiam) | 13,3 min | 16,2 s (`decisao-botoes-qa.spec.ts:86`) |
| B | final | **249 passaram, 9 puladas** | 15,4 min | 18,1 s (`decisao.spec.ts:148`) |
| C | final | **249 passaram, 9 puladas** | 14,2 min | **23,4 s** (`decisao.spec.ts:148`, C-14) |

A, B e C são as três seguidas com o código final (RNF-12). A rodada 1 conta à parte, porque o código mudou depois
dela (seção 4). O teste novo da gaveta passou nas três: 2,2 s, 8,4 s e 2,0 s.

**Tempo (pendência da 06-T16-testes):** a tabela mostra os testes que passaram de 15 s (metade do limite de 30 s) em
pelo menos uma rodada, mais o `decisao-celular-qa.spec.ts:121`, que estava na lista da qa:

| Teste | A | B | C |
|---|---|---|---|
| `decisao.spec.ts:148` (C-14, DEC de agente) | 11,2 s | 18,1 s | **23,4 s** |
| `reflow-t15-qa.spec.ts:105` | 10,7 s | 10,1 s | 18,1 s |
| `axe-todas.spec.ts:395` (T12) | 9,5 s | 17,4 s | 16,1 s |
| `decisao-botoes-qa.spec.ts:86` | 16,2 s | 7,4 s | 3,0 s |
| `decisao-celular-qa.spec.ts:121` | 14,6 s | 12,5 s | 6,3 s |

O `decisao.spec.ts:148` chegou a 78% do limite na rodada C. A 06-T16-testes já o apontava (15,6 s) e não o dividiu,
porque a estrutura dele é vigiada pelo `test/estatico/decisao-e2e.test.ts`. Não mexi nele: está fora desta tarefa, e
dividir esse teste pede cuidado com o estático. Fica como o risco número um para o CI (ver Pendências).

### 7. CV-01 (G4): o comando não sai vazio, por causa de um teste da 06-T16-testes

O comando do G4, rodado como está no plano, lista um arquivo só: `src/app/api/saude/route-qa.test.ts`. O diff são as
duas linhas `await deps.pool.query('select 1');` e um comentário. Esse arquivo é teste, e entrou no commit 2604b9f, da
`06-T16-testes` (a correção da instabilidade do 503). Esta tarefa não o tocou.

- `src/app/api/saude/route.ts` e `route.test.ts` não têm diff desde 198e97d (conferido). Nenhum arquivo `'use server'`,
  `src/proxy.ts`, `src/db`, `drizzle` nem `src/modules/acesso` aparece.
- `git diff 198e97d --stat -- src/modules`: só `resumo-da-fila.ts` e o teste dele (T07), como o G4 permite.
- Não reverti a mudança: o arquivo está fora desta tarefa, e desfazer traria de volta a instabilidade que a
  `06-T16-testes` corrigiu. A decisão é do tech-lead: aceitar a mudança no teste como exceção registrada ao G4, ou pedir
  outra solução à qa.

### Arquivos alterados

- Código: `package.json` (versão), `src/app/(painel)/demandas/[id]/page.tsx` (classe do `h3`) e
  `src/components/casca/GavetaMenu.tsx` (duas classes e um comentário).
- Testes alterados: `test/estatico/projeto.test.ts` (G5), `test/estatico/tipografia-h2.test.ts` (describe novo do
  `h3`), `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` (Minor 1) e `e2e/casca.spec.ts` (teste novo da
  gaveta).
- Arquivos novos: `e2e/capturas.ts`, `e2e/capturas.spec.ts`, `test/estatico/capturas.test.ts` e as nove PNG em
  `docs/manual-tecnico/capturas/`.

### Desvios do plano

1. **`podeCapturar`, `CAPTURAS` e `REGRAVAR` ficaram em `e2e/capturas.ts`, e não no spec.** O teste estático precisa
   importá-los, e importar um spec carrega o `test.beforeEach` do Playwright fora do runner. É o mesmo molde de
   `e2e/vigia.ts` e `vigia.spec.ts`. O D-04 continua igual: o engenheiro da 08 põe o nome em `REGRAVAR`, roda e volta
   a lista a `[]`.
2. **`podeCapturar` recusa qualquer `CI` definido, até vazio ou `false`.** O plano escrevia `if (ci)`. O CV-17 diz
   "pulado quando `CI` existe". A forma mais estrita é a mais segura para captura sem expurgo.
3. **Correção da gaveta (`GavetaMenu.tsx`) e o teste novo em `casca.spec.ts`.** Os dois arquivos são da T05. A captura
   que esta tarefa entrega mostrava o defeito, e corrigir antes de fechar as capturas evita o `REGRAVAR` na 08. É a
   mesma razão da revisão para pedir o Minor 3 antes das capturas. A mudança é de duas classes, com teste que falhou
   antes.

## Decisões tomadas

- Capturas só da janela (`fullPage: false`), como no plano. A T05 e a T11 em página inteira passariam de 3.000 px, e o
  manual precisa da primeira tela.
- A T11 capturada é a da `etapasDupla` na conta administradora: é o estado "pendente com formulário" do CA-12.1, com a
  opção fixada e o documento. Mostra a C2 completa sem gravar nada.
- `animations: 'disabled'` e `document.fonts.ready` antes da foto: a captura não pega a gaveta entrando nem a fonte de
  sistema no lugar da Noto.
- A correção da gaveta segue o desenho da 03, 3.3 (botão na linha de baixo, à direita), e não um botão menor: o alvo
  de 44 px e o texto visível "Fechar menu" continuam.
- O teste novo da gaveta mede todo `a` e `button` dela, e não só o "Fechar menu", para pegar qualquer controle que
  saia da caixa.
- Não reverti o `route-qa.test.ts` da 06-T16-testes: está fora da tarefa, e a decisão sobre o G4 cabe ao tech-lead.
- Registro de erro meu: rodei uma leitura com `git diff -G` e `|` no argumento, para achar o arquivo da gaveta. O
  conferir a barrou, e o maestro a liberou por ser só leitura. Ela não alterou nada.

## Pendências

- **Para a `06-T17-revisao` (tech-lead): o G4 (CV-01) não sai vazio.** O único arquivo listado é
  `src/app/api/saude/route-qa.test.ts`, mudado pela `06-T16-testes` (2604b9f), só no teste: o pool aberto antes do
  `GET`. `route.ts` está sem diff. É preciso decidir entre aceitar a mudança como exceção registrada (o arquivo é
  teste, e a rota não mudou) e pedir à qa outra forma de estabilizar o teste fora de `src/app/api`.
- **Para a `06-T17-revisao` (tech-lead):** o desvio da gaveta (seção 4), em dois arquivos da T05.
- **Tempo dos testes (para a `09-entrega` e o CI, e para o tech-lead decidir se divide antes):** as três rodadas
  passaram, mas o `decisao.spec.ts:148` (C-14) foi de 11,2 s a 23,4 s, ou 78% do limite de 30 s, na mesma VPS. No
  runner `ubuntu-latest`, com menos CPU, ele é o candidato mais provável a estourar. A correção que a regra da revisão
  da T16 prefere é dividir o teste sem tirar asserção (a parte de 390 px da T13 é um corte natural), sempre mantendo o
  que o `decisao-e2e.test.ts` confere. Os outros acima de 15 s estão na tabela da seção 6. Não usei `retries`,
  `timeout` maior nem `test.slow()`.
- **Para a `07-qa-funcional`:** a gaveta em 390 e 320 px, com "Fechar menu" na linha de baixo. Conferir à mão a ordem
  do Tab (marca, "Fechar menu", itens, "Sair"), que não mudou no DOM.
- **Para a `08-revisao` (maestro):** abrir as nove PNG contra o `scripts/seed-ficticio.ts` (CV-17). A conferência desta
  etapa está na seção 2. Na `t11-decisao-*`, o campo de data mostra `mm/dd/yyyy`: é o formato do Chromium de teste, que
  não segue o `locale: 'pt-BR'` no campo de data nativo. Num navegador em português aparece `dd/mm/aaaa`. Não é texto
  do app.
- **Para a `10-documentacao`:** o manual cap. 08 cita as nove capturas pelos nomes da tabela da seção 2.
- Seguem de antes, sem mudança: os itens da 08 e da `10-documentacao` da revisão anterior da T16, o M2 da
  06-T13-tech-lead, a dívida de `opcoesDaDecisao`, `legendaDecisao`, `aprovar` e `devolver`, e o suporte sem script
  depois do pedido.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — topo 2604b9f (06-T16-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -- docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md` — a767f74 (o plano é rastreado)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 95fca9e e5a5659 -- docs/construcao/DEC-DEM-20261110-0015-v1/06-T16-tech-lead.md` — leitura da revisão da volta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -- docs/construcao/DEC-DEM-20261110-0015-v1/06-T16-tech-lead.md` — 95fca9e, e5a5659, 8cd67ca
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U400 e5a5659 8cd67ca -- docs/construcao/DEC-DEM-20261110-0015-v1/06-T16-tech-lead.md` — a revisão anterior da T16, com o Minor 3 (saída em arquivo, lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "Este pacote está desatualizado" -- src` — `dados-da-decisao.ts` e dois testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "etapasDupla" -- src test e2e scripts` — o seed e as specs que usam a demanda
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e vitest.config.ts eslint.config.mjs test/estatico` — a lista de specs e estáticos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- docs/manual-tecnico` — não havia pasta de capturas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- docs/construcao/DEC-DEM-20261110-0015-v1/01-analista-requisitos.md docs/construcao/DEC-DEM-20261110-0015-v1/04-seguranca-aplicacao.md` — tamanho dos dois documentos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -G "encontradas?" -- src` — a região de aviso da fila
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts test/estatico/capturas.test.ts test/estatico/tipografia-h2.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" --reporter=dot --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t17-vermelho.txt` — vermelho: 3 arquivos, 2 testes e a suíte das capturas (antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts test/estatico/capturas.test.ts test/estatico/tipografia-h2.test.ts test/estatico/vigia.test.ts test/estatico/sem-recurso-externo.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" "src/app/(painel)/demandas/[id]" --reporter=dot` — 270 de 270, 16 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — os arquivos da tarefa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t17-suite.txt` — 5230 de 5230, 233 arquivos, 190 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list` — rodada 1, antes da correção da gaveta: 257 de 257 (com o negativo esperado da vigia), 15,4 min; as nove PNG criadas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — **não vazio**: só `src/app/api/saude/route-qa.test.ts` (seção 7)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules package.json pnpm-lock.yaml` — `resumo-da-fila.*` (T07), `package.json` e o lock da T02
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- package.json` — `version` e as duas linhas `@fontsource`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -- src/app/api/saude/route-qa.test.ts` — 2604b9f (06-T16-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/app/api/saude/route.ts src/app/api/saude/route.test.ts` — vazio
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts --grep "03, 3.3" --reporter=line` — vermelho: "Fechar menu 179–340" (antes da correção)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/casca.spec.ts e2e/casca-qa.spec.ts e2e/alvo-de-toque.spec.ts e2e/capturas.spec.ts e2e/moldura.spec.ts --reporter=line` — 32 de 32, 8 capturas puladas e a da gaveta regravada (`REGRAVAR` com ela só nesta rodada)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — os arquivos da tarefa e as nove PNG
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 7 arquivos rastreados, +69 −10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src test/estatico/projeto.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts"` — diff de código lido por inteiro
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=dot` — com o código final: 5230 de 5230, 233 arquivos, 168 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, com o código final
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, com o código final
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list` — rodada A: 249 passaram, 9 capturas puladas, 13,3 min
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list` — rodada B: 249 passaram, 9 capturas puladas, 15,4 min
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=list` — rodada C: 249 passaram, 9 capturas puladas, 14,2 min
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 7 arquivos alterados, 3 novos de código e teste, as nove PNG e esta entrega; nenhum temporário (`test-results/` está no `.gitignore`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 7 arquivos, +69 −10

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (mais os dois da T05 do desvio 3, com a razão acima)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (nenhum texto mudou; a `axe-todas` e o axe da gaveta passam nas três rodadas)
