---
pedido: DEC-DEM-20261102-0002-v1
etapa: 02-triagem
agente: tech-lead
leu: [pedido.json, 01-qa-funcional.md, contrato-passagem.md, e2e/apoio.ts, e2e/parecer-risco-qa.spec.ts, e2e/decisao.spec.ts, scripts/seed-ficticio.ts, scripts/scripts.test.ts, playwright.config.ts, package.json, CHANGELOG.md, DEC-DEM-20261022-0001-v1/06-T43-tech-lead.md, .claude/agents/engenheiro-frontend.md, .claude/agents/engenheiro-backend.md, .claude/agents/documentacao-tecnica.md, .claude/agents/devops-sre.md, .claude/commands/construir.md]
status: pronto
proximo: engenheiro-frontend
devolvido_para: null
---
## Entrega

### Causa provável

Concordo com a reprodução da 01. São duas causas, e a segunda é agravada pela primeira.

1. **`document-title` (falhas 1 e 2).** `semViolacoes` (`e2e/apoio.ts:52-56`) chama o axe na hora. Depois de uma Server
   Action, o Next 16 re-renderiza a página: o corpo novo entra com o `<title>` fora do `document`, e o metadado chega
   depois, por streaming. Os testes esperam o corpo novo (aviso, `aria-checked`, alerta de resultado) e chamam o axe
   nesse intervalo:
   - `agentes-teto.spec.ts:143`, depois do `router.refresh()` de `TabelaAgentes.tsx:74`;
   - `decisao.spec.ts:175`, depois do `router.replace` de `FormularioDecisao.tsx:76-77`.

   O sistema não tem defeito. O título existe e chega: `agentes-teto.spec.ts:47` e `decisao.spec.ts:92` conferem o título
   nessas mesmas rotas.
2. **429 do C-36 (falha 3).** A conta "cto" fecha a suíte limpa com 30 de 30 demandas na hora, sem folga nenhuma. A
   `decisao.spec.ts` guarda a demanda numa variável do módulo (`demandaDaSpec`, linhas 29-38). Quando um teste dela falha,
   o Playwright sobe um worker novo (`retries: 0`), a variável volta a `null` e o próximo `demanda()` cria a 31ª. O
   `parecer-risco-qa.spec.ts:185`, última criação da "cto" na suíte, recebe 429. A falha de origem fica escondida atrás
   de outra, sem relação com ela.

### Quem corrige

**`engenheiro-frontend`, numa `03-correcao` só, com a liberação registrada no `passagens.jsonl`.** Nesta correção ele
pode editar `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts`, só para as demandas fictícias do seed para o e2e e
sem mexer no C-36. Pode também trocar o campo `version` do `package.json` de 0.1.0 para 0.1.1.

- O grosso da correção está em `e2e/`, e a verificação exige `pnpm test:e2e`. Os dois estão na lista **Pode** do
  frontend e fora da do backend. No pedido anterior, o backend precisou de liberação para os dois.
- `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` estão só na lista do backend. Pela regra do C-36 da
  `06-T43-revisao` do DEC-DEM-20261022-0001-v1, `scripts/` é do backend.
- A cadeia curta tem uma `03-correcao` só, com um engenheiro. A liberação menor é dar ao frontend estes dois arquivos.
  São umas 30 linhas de dado fictício e de teste, e o frontend roda o `pnpm test`, que cobre os dois.
- A alternativa é o backend com `e2e/` e `pnpm test:e2e` liberados. É liberação maior, sobre a parte maior do trabalho.

### O que a 03-correcao faz, em ordem, com o teste antes do código

Arquivos: `scripts/seed-ficticio.ts`, `scripts/scripts.test.ts`, `e2e/apoio.ts`, `e2e/sem-violacoes.spec.ts` (novo),
`e2e/parecer-risco-qa.spec.ts`, `e2e/decisao.spec.ts` e `package.json` (só o campo `version`). Nenhum arquivo de `src/`
muda.

**Passo 1. Três demandas próprias no seed (parte da ESP (b) e (c)).**
- Teste primeiro, em `scripts/scripts.test.ts`, no `it` "as demandas próprias do e2e" (linhas 344-376), e veja falhar:
  - `TITULOS_DO_E2E` tem 9 títulos, e não 6 (linha 371);
  - `TOTAL_DEMANDAS_DO_SEED` é 14, e não 11 (linha 312);
  - as três novas têm tipo `melhoria` e as mesmas regras das outras: em Nova, autoria da `sem2fa` e nenhuma versão.
    A "cto" continua com 5 demandas do seed e a "administradora" com 0 (linhas 374-375, sem mudança).
- Depois, em `scripts/seed-ficticio.ts`, acrescente a `TITULOS_DO_E2E` e a `DEMANDAS_DO_E2E`, com `tipo: 'melhoria'` e um
  `contexto` fictício:
  - `decisao: 'Demanda da decisão (fictício)'`. É o mesmo texto do `TITULO` de `decisao.spec.ts:27`, que o teste da linha
    157 confere no `h1`;
  - `rskDuploClique: 'Duplo clique no parecer de risco (fictício)'`;
  - `espListaDeTextos: 'Lista de textos da especificação (fictício)'`.
- Atualize o comentário das linhas 133-137, que lista as specs que procuram esses títulos.

**Passo 2. O axe espera o `<title>` (ESP (a)).**
- Teste primeiro, num arquivo novo, `e2e/sem-violacoes.spec.ts`, com a "cto" em `/configuracao/agentes`. Espere o título
  antes de cada caso.
  - **Corrida:** remova os `<title>` com `page.evaluate(() => document.querySelectorAll('title').forEach((t) => t.remove()))`.
    Agende a volta na página, com `setTimeout(() => { document.title = 'Agentes e teto de gasto — WS Orquestrador de Demandas' }, 500)`,
    e chame `semViolacoes` na hora. Tem de passar. Hoje falha com `document-title`: rode e registre a falha na entrega.
  - **Controle negativo (critério 2 do pedido):** remova os `<title>` sem agendar a volta.
    `await expect(semViolacoes(page, 'sem título')).rejects.toThrow(/document-title/)`. Prova que a regra continua ligada
    e que tela sem título reprova.
  - No topo da spec, o comentário de uso por conta: "cto" 0 demandas e 0 versões; "administradora" 0 e 0.
- Depois, em `e2e/apoio.ts`, `semViolacoes` espera `document.title.trim() !== ''` por até 5 s, com
  `page.waitForFunction`, e roda o axe **em qualquer caso**. Se o título não chegar, o axe roda assim mesmo e reprova pela
  `document-title`. Assim o erro diz a regra, e não o tempo esgotado.
  - Escreva o resultado da espera numa variável (`.then(() => true, () => false)`), com um comentário que explique o
    porquê. Não use um `catch` vazio.
  - O resto da função não muda: as mesmas `TAGS_AXE`, sem `disableRules`, `exclude` nem filtro de violação, e o mesmo
    `expect(violacoes).toEqual([])`.
- `agentes-teto.spec.ts` e as chamadas de axe de `decisao.spec.ts` não mudam: a correção em `apoio.ts` vale para as duas.

**Passo 3. A "cto" com folga no C-36 (ESP (b) e (c)).**
- Em `e2e/apoio.ts`, crie `demandaDoSeed(page, titulo)`. Ela lê `GET /api/demandas?tipo=melhoria&limit=100`, acha a
  demanda pelo título e lança erro claro se não achar, como `demandaDaDupla` (`decisao.spec.ts:44-51`). As specs importam
  os títulos de `TITULOS_DO_E2E`, como `apoio.ts:6` já importa `CONTAS_FICTICIAS`, sem copiar o texto.
- `parecer-risco-qa.spec.ts`:
  - linha 185: troque `criar(page)` por `demandaDoSeed(page, TITULOS_DO_E2E.espListaDeTextos)`;
  - linha 146 (duplo clique): troque por `demandaDoSeed(page, TITULOS_DO_E2E.rskDuploClique)`;
  - no teste da linha 183, prove o critério 3 do pedido: leia o total de demandas pela API antes e depois do teste, e os
    dois têm de ser iguais. Não use `page.on('request')`, porque as chamadas de `page.request` não passam por ele;
  - `criar` continua só no `beforeAll` do describe (2 demandas);
  - atualize o comentário do topo (linhas 9-21): "cto" 2 demandas, e as versões como estão.
- `decisao.spec.ts`:
  - `demanda()` (linhas 31-38) passa a usar `demandaDoSeed(page, TITULOS_DO_E2E.decisao)` e cria a ESP e o RSK só se a
    demanda ainda não tiver ESP (`GET /api/demandas/<id>/especificacoes` vazio);
  - com um worker novo, o teste acha a mesma demanda e não cria nada. O fluxo fica igual ao de uma execução sem falha;
  - `TITULO` (linha 27) passa a ser `TITULOS_DO_E2E.decisao`;
  - atualize o comentário do topo: "cto" 0 demandas pela API.
- Uso da "cto" na suíte limpa, pela tabela da 01: 5 do seed, 2 da `detalhe-demanda`, 5 da `editar-demanda`, 5 da
  `fila-qa`, 5 da `fila`, 3 da `nova-demanda` e 2 da `parecer-risco-qa`. São **27 de 30**, contra 30 de 30 hoje, e
  nenhuma criação depende de estado de módulo. As versões da "cto" não mudam, porque cada teste grava as mesmas
  versões, agora em demandas do seed.

**Passo 4. Versão.** `package.json`: `"version": "0.1.0"` passa a `"0.1.1"`. O `construir.mjs verificar` da Parada 3 exige
versão maior que a da `main` e a seção dela no `CHANGELOG.md`. O `CHANGELOG.md` é da `06-documentacao`.

**Comandos da 03-correcao:** `pnpm test` (inclui `scripts/scripts.test.ts`), `pnpm lint`, `pnpm typecheck` e
`pnpm test:e2e` inteiro, pelo menos uma vez, com o resultado na entrega. Todos estão na lista **Pode** do frontend. A
edição de `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` vale pela liberação desta correção, e só para o que
os passos 1 e 3 pedem.

### Proibido, e recusado na revisão como alto

- Mudar `conferirLimite` ou `src/modules/limites.ts`. Também: variável de ambiente, `NODE_ENV`, `BASE_URL`,
  `SEED_FICTICIO` ou cabeçalho que mude o limite, conta ou desvio de teste, relógio adiantado, apagar demanda entre
  specs ou esperar a janela de uma hora (06-T43-revisao, C-36).
- Desligar ou filtrar regra do axe, mudar `TAGS_AXE` ou repetir o axe até passar (`expect.poll`, laço).
- Subir o `retries` do `playwright.config.ts`. O 0 fica: tentar de novo esconderia a instabilidade em vez de corrigi-la.
- Apagar ou afrouxar teste que confere o 429 (`src/modules/limites.test.ts` e
  `src/app/api/demandas/demandas.bordas.test.ts`).

### Teste de regressão esperado

- `e2e/sem-violacoes.spec.ts`: a corrida do título passa, e a tela sem título reprova com `document-title`.
- `scripts/scripts.test.ts`: as 9 demandas próprias do e2e e o total de 14.
- `parecer-risco-qa.spec.ts:183`: usa a demanda do seed, e o total de demandas fica igual antes e depois.
- A suíte inteira sem 429, mesmo com uma falha em `decisao.spec.ts`.

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-frontend); o maestro confere de novo no `verificar` da Parada 3 |
| `pnpm test:e2e` verde três vezes seguidas | `04-regressao` (qa-automacao). A `03-correcao` roda a suíte uma vez, e o `homologar` da Parada 3 roda mais uma contra a homologação |
| `CHANGELOG.md` com a versão 0.1.1 | `06-documentacao` (documentacao-tecnica); o campo `version` do `package.json` é da `03-correcao` (passo 4) |
| PR com CI verde | Parada 3 (maestro) |

Para a `04-regressao`, os exploratórios da 01:
- rodar a suíte inteira com uma falha forçada em `decisao.spec.ts`, sem fazer commit dela. Só esse teste pode falhar, sem
  429 no fim;
- rodar `parecer-risco-qa.spec.ts` sozinho e depois da suíte inteira. Os dois resultados têm de ser iguais;
- conferir a soma de demandas e versões por conta pelos comentários das specs. A conta da 01 dá perto de 45 de 60
  versões na "cto".

Para a `05-entrega`: nada muda em `Dockerfile`, workflows nem `docs/operacao/`. O `docker build` confere que a imagem
sai igual.

## Decisões tomadas

- Foram lidos, na estruturaAutonoma, o comando /construir e os arquivos dos agentes devops-sre e documentacao-tecnica. A leitura serviu para saber o que o verificar da Parada 3 exige e a quem cabem a versão e o CHANGELOG. Ela foi liberada, e a liberação está registrada no passagens.jsonl.
- Liberação dada pelo maestro, por delegação de Fabiano, e registrada no `passagens.jsonl`: na 03-correcao, o `engenheiro-frontend` pode editar `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` (demandas fictícias do seed para o e2e, sem mexer no C-36) e trocar a versão do `package.json` de 0.1.0 para 0.1.1.
- Engenheiro-frontend, e não backend: a parte maior (`e2e/` e `pnpm test:e2e`) já está na lista Pode dele, e a liberação que falta, `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts`, é a menor.
- A `decisao.spec.ts` também passa para uma demanda do seed, pelo item (c) da ESP: é dela o +1 que causou o 429, e sem estado de módulo o worker novo não cria demanda.
- O duplo clique da `parecer-risco-qa.spec.ts` também sai da API: está no mesmo arquivo, segue o mesmo molde e leva a folga da "cto" de 2 para 3.
- `semViolacoes` espera o título e roda o axe mesmo sem ele: o erro de uma tela sem título continua dizendo `document-title`, como pede o critério 2.
- `package.json` passa a 0.1.1, embora a ESP não liste o arquivo: só muda o campo `version`, o comportamento não muda, e sem isso a Parada 3 reprova no `verificar`.
- Os outros buscadores de demanda do seed (`demandaDaDupla` e os de `axe-todas` e `pedido-construcao`) não passam para o `demandaDoSeed` agora: fica fora do escopo e vai para Pendências como Minor.

## Pendências

- Minor, para depois: `demandaDaDupla` (`decisao.spec.ts:44-51`) e os buscadores de demanda do seed nas outras specs podem passar a usar o `demandaDoSeed` de `apoio.ts`.
- Fora do escopo, como manda a ESP: os médios M-01 a M-07 e o médio do reteste do pedido anterior seguem para decisão de Fabiano.
- Não conferi o log completo da execução 41249512830 (worker novo depois de `decisao.spec.ts:151`). A conta de demandas da 01 fecha com a causa, e a correção do passo 3 vale com ou sem essa confirmação.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo construcao/DEC-DEM-20261102-0002-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — 53462b5 (01-reproducao) sobre dd8ddee (main 0.1.0)

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
