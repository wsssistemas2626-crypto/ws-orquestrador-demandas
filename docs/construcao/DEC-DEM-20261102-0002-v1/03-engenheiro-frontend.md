---
pedido: DEC-DEM-20261102-0002-v1
etapa: 03-correcao
agente: engenheiro-frontend
leu: [pedido.json, 01-qa-funcional.md, 02-tech-lead.md, contrato-passagem.md, e2e/apoio.ts, e2e/decisao.spec.ts, e2e/parecer-risco-qa.spec.ts, e2e/agentes-teto.spec.ts, e2e/axe-todas.spec.ts, e2e/fila.spec.ts, e2e/fila-qa.spec.ts, e2e/servidor.ts, playwright.config.ts, scripts/seed-ficticio.ts, scripts/scripts.test.ts, test/estatico/projeto.test.ts, package.json, .gitignore]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Correção dos três testes e2e instáveis, nos quatro passos da `02-tech-lead.md`, sem mudar nada de `src/`, sem desligar
nem filtrar regra do axe e sem tocar no C-36 (`conferirLimite`, variáveis de ambiente, contas, cabeçalhos e
`retries: 0` ficam como estavam).

### Arquivos alterados

- `scripts/seed-ficticio.ts` (liberação desta etapa): três demandas próprias do e2e em `TITULOS_DO_E2E` e
  `DEMANDAS_DO_E2E`, tipo `melhoria`, autoria `sem2fa`, contexto fictício: `decisao` ("Demanda da decisão (fictício)"),
  `rskDuploClique` ("Duplo clique no parecer de risco (fictício)") e `espListaDeTextos` ("Lista de textos da
  especificação (fictício)"). Comentário das specs que usam esses títulos atualizado. `TOTAL_DEMANDAS_DO_SEED` passa de
  11 a 14.
- `e2e/apoio.ts`:
  - `semViolacoes` espera `document.title.trim() !== ''` por até 5 s (`page.waitForFunction`). O resultado vai para
    `temTitulo` (`.then(() => true, () => false)`), sem `catch` vazio. O axe roda **em qualquer caso**, com as mesmas
    `TAGS_AXE`, sem `disableRules`, `exclude` nem filtro, e com o mesmo `expect(violacoes).toEqual([])`. Se o título não
    chegar, a reprovação vem da regra `document-title`, e a mensagem ganha "(a página ficou sem <title> por 5 s)".
  - nova `demandaDoSeed(page, titulo)`: lê `GET /api/demandas?tipo=melhoria&limit=100`, acha pelo título e lança erro
    claro se não achar.
- `e2e/parecer-risco-qa.spec.ts`: o duplo clique (antes linha 146) e a T07 da ESP (antes linha 185) usam
  `demandaDoSeed` com `TITULOS_DO_E2E.rskDuploClique` e `TITULOS_DO_E2E.espListaDeTextos`. A T07 confere pela API que o
  total de demandas é o mesmo antes e depois do teste (critério 3). `criar` fica só no `beforeAll` do describe. O
  comentário do topo passa a "cto" 2 demandas e 9 versões; "administradora" 0 e 0.
- `e2e/decisao.spec.ts`: sem a variável `demandaDaSpec`. `demanda()` usa `demandaDoSeed(page, TITULOS_DO_E2E.decisao)` e
  só cria a ESP e o RSK se `GET /api/demandas/<id>/especificacoes` vier vazio. Com um worker novo, o teste acha a mesma
  demanda e não cria nada. `TITULO` passa a `TITULOS_DO_E2E.decisao`. O comentário do topo diz "cto" 0 demandas pela API.
- `e2e/sem-violacoes.spec.ts` (novo): "cto" em `/configuracao/agentes`, esperando o título antes de cada caso.
  - **corrida:** remove os `<title>`, agenda `document.title = 'Agentes e teto de gasto — WS Orquestrador de Demandas'`
    para 500 ms depois e chama `semViolacoes` na hora. Tem de passar;
  - **controle negativo:** remove os `<title>` sem agendar a volta.
    `await expect(semViolacoes(page, 'T12 sem título')).rejects.toThrow(/document-title/)`;
  - comentário do C-36 no topo: "cto" 0 demandas e 0 versões; "administradora" 0 e 0.
- `package.json`: só o campo `version`, de `0.1.0` para `0.1.1` (liberação desta etapa).
- `test/estatico/projeto.test.ts`: o teste estático conferia `version` igual a `0.1.0`. Passou a conferir `0.1.1`, e o
  título do `it` mudou junto (ver Desvios).

Nada mudou em `src/`, `playwright.config.ts`, `src/modules/limites.ts`, `limites.test.ts` nem
`demandas.bordas.test.ts`. O `git status` mostra só os 8 arquivos acima.

### Testes criados ou alterados

- `scripts/scripts.test.ts`: `TOTAL_DEMANDAS_DO_SEED` igual a 14. `TITULOS_DO_E2E` com 9 títulos, e os três novos com
  o texto exato e tipo `melhoria`. As regras de antes valem para eles também: Nova, autoria `sem2fa`, nenhuma versão e
  contexto não vazio. A "cto" continua com 5 demandas do seed e a "administradora" com 0.
- `e2e/sem-violacoes.spec.ts`: a corrida do título e o controle negativo.
- `e2e/parecer-risco-qa.spec.ts`: o total de demandas igual antes e depois da T07.

### Teste antes do código, visto falhando

1. `pnpm test scripts/scripts.test.ts`, antes de mexer no seed: **2 falharam, 31 passaram (33)**.
   ```
   × seed cria contas com e-mail .test e 2FA ativo, e a demanda de rascunho de agente
   AssertionError: expected 11 to be 14 // Object.is equality
    ❯ scripts/scripts.test.ts:312:36
   × as demandas próprias do e2e: uma por título, de títulos diferentes, sem versão nenhuma, em Nova e pela conta sem2fa
   AssertionError: expected undefined to be 'Demanda da decisão (fictício)' // Object.is equality
    ❯ scripts/scripts.test.ts:375:36
   ```
2. `pnpm test:e2e e2e/sem-violacoes.spec.ts e2e/parecer-risco-qa.spec.ts`, com a spec nova e a conferência do total já
   escritas, e com `apoio.ts` e o `criar(page)` da T07 ainda como estavam: **2 falharam, 7 passaram (9)**.
   ```
   ✘ e2e/parecer-risco-qa.spec.ts:184:1 › T07 da ESP com a correção da Lista de textos ...
     Error: total de demandas antes e depois do teste
     Expected: 17
     Received: 18
   ✘ e2e/sem-violacoes.spec.ts:27:1 › corrida: o <title> chega 500 ms depois do corpo; o axe espera o título e não acusa violação
     Error: axe em T12 com o título atrasado
     + Object { "alvos": Array [ "html" ], "impacto": "serious", "regra": "document-title" }
       at semViolacoes (e2e/apoio.ts:55:41)
   ✓ e2e/sem-violacoes.spec.ts:40:1 › controle negativo: tela sem <title> continua reprovada pela regra document-title
   ```
   A corrida reproduz a falha do CI: mesma regra, mesmo impacto, mesmo alvo. O controle negativo já passava antes da
   correção, e continua passando depois: a regra continua ligada.

### Resultados finais

- `pnpm test`: **3697 de 3697**, 0 falha. O total vem do relatório JUnit da corrida com `--reporter=junit`
  (`<testsuites tests="3697" failures="0" errors="0">`).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `pnpm test:e2e`, a suíte inteira contra o build de produção (`next build` e `next start` do `e2e/servidor.ts`), três
  vezes seguidas, sem mudar código entre elas:
  - corrida 1: exit 0;
  - corrida 2: exit 0;
  - corrida 3: exit 0.

  São 128 testes em 22 arquivos, contados com `pnpm test:e2e --list`: os 126 de antes, mais os 2 da spec nova. Com
  `retries: 0`, exit 0 quer dizer nenhuma falha.

### Uso da conta "cto" no C-36 depois da correção

Tabela da 01, com as mudanças desta etapa:
- 5 do seed;
- 0 da `decisao`, antes 1, e mais 1 a cada worker novo;
- 2 da `detalhe-demanda`;
- 5 da `editar-demanda`;
- 5 da `fila-qa`;
- 5 da `fila`;
- 3 da `nova-demanda`;
- 2 da `parecer-risco-qa`, antes 4.

Total: **27 de 30**, contra 30 de 30 antes. Nenhuma criação de demanda depende mais de estado de módulo. As versões da
"cto" não mudam: cada teste grava as mesmas versões, agora em demandas do seed.

### Desvios do plano

- `test/estatico/projeto.test.ts` não estava na lista de arquivos da triagem. A troca de versão do passo 4 quebrou o
  teste estático `versão 0.1.0, privado, ESM...` (`expected '0.1.1' to be '0.1.0'`, linha 29). Ele passou a conferir
  `0.1.1`. `test/` está na minha lista **Pode**, e sem essa mudança o `pnpm test` não fica verde com a versão liberada.
  Nenhuma outra conferência do teste mudou.

## Decisões tomadas

- `semViolacoes` roda o axe mesmo sem título, depois de esperar 5 s: assim o erro de uma tela sem título diz `document-title`, como pede o critério 2, e não o tempo esgotado.
- A variável `temTitulo` entra na mensagem do `expect`: o resultado da espera fica legível na falha, sem `catch` vazio nem variável sem uso.
- Usei a página `/configuracao/agentes` na spec nova: é uma das duas telas que falharam no CI, e o título dela é estático e já conferido na `agentes-teto.spec.ts:47`.
- A T07 confere o total de demandas pela API, e não por `page.on('request')`: as chamadas de `page.request` não passam pelo evento, como disse a triagem.
- As três demandas novas do seed são de tipo `melhoria` e linha `sob_medida`: `demandaDoSeed` procura entre as de tipo `melhoria`, e nenhuma delas cai no filtro `novo_projeto` + `ia_controle_humano` da `fila-qa`.
- A T07 e o duplo clique continuam esperando `ESP-…-v1` e `RSK-…-v1`: o e2e local sobe banco e seed novos a cada corrida, e a `decisao.spec` (dupla aprovação, A-02) já supunha o mesmo seed limpo.
- Para achar a falha do `pnpm test`, cuja saída passa do limite do terminal, rodei subconjuntos e a corrida com `--reporter=junit` e `--outputFile` em `test-results/`, que está no `.gitignore`. Li o relatório com Read.
- Rodei uma vez `pnpm exec vitest run scripts/scripts.test.ts`, o mesmo `vitest run` do script `test`. Repeti em seguida com `pnpm test scripts/scripts.test.ts`, da lista **Pode**, e é dessa corrida o trecho registrado acima.

## Pendências

- O `CHANGELOG.md` da 0.1.1 é da `06-documentacao`, pela tabela da triagem. Não mexi nele.
- Para a `04-regressao`: os exploratórios da 01. Um é a suíte inteira com uma falha forçada em `decisao.spec.ts`, sem commit: só esse teste falha, sem 429 no fim. O outro é a `parecer-risco-qa.spec.ts` rodada sozinha e depois da suíte inteira, com o mesmo resultado nas duas. Mais a conta de versões da "cto", perto de 45 de 60 pela 01.
- Minor, para depois, como na triagem: `demandaDaDupla` (`decisao.spec.ts`) e os buscadores de demanda do seed nas outras specs podem passar a usar `demandaDoSeed`.
- As três corridas do e2e foram para segundo plano depois de 180 s. Delas tenho só o código de saída (0 nas três), porque a saída completa ficou em `/tmp`, que não li. O total de 128 vem do `--list`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo construcao/DEC-DEM-20261102-0002-v1, limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas exec vitest run scripts/scripts.test.ts` — 2 falharam, 31 passaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — 2 falharam, 31 passaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/sem-violacoes.spec.ts e2e/parecer-risco-qa.spec.ts` — 2 falharam, 7 passaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — exit 1 (saída truncada; era o teste estático da versão)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=test-results/vitest-junit.xml` — 1 falhou de 3697
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts` — 80 de 80
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot src/app` — 705 de 705
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot src/modules` — 1345 de 1345
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=test-results/vitest-junit.xml` — 1 falhou de 3697 (repetição, mesma falha)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --exclude "src/app/**" --exclude "src/modules/**" --exclude "scripts/**"` — 1 falhou, 1566 passaram: test/estatico/projeto.test.ts:29, versão
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=junit --outputFile=test-results/vitest-junit.xml` — 3697 de 3697
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — corrida 1: exit 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 8 arquivos da tarefa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 7 arquivos alterados e 1 novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 128 testes em 22 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — corrida 2: exit 0
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — corrida 3: exit 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 8 arquivos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
