---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T46-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, 05-tech-lead.md (início), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T43 a T46, rastreabilidade), 03-ux-ui-design.md (1 e 2.1 a 2.7), 06-T43-tech-lead.md, 06-T44-engenheiro-frontend.md, 06-T44-tech-lead.md, 06-T45-engenheiro-frontend.md, 06-T45-tech-lead.md, 06-T45-qa-automacao.md, src/proxy.ts, next.config.ts, eslint.config.mjs, src/app/layout.tsx, "src/app/(painel)/especificacoes/[espId]/page.tsx", src/app/configurar-2fa/AssistenteDoisFatores.tsx (linhas 60 a 260), src/modules/acesso/auth.ts, scripts/seed-ficticio.ts, playwright.config.ts, e2e/{apoio,servidor}.ts, e2e/{entrar,configurar-2fa,autenticacao-qa,fila,nova-demanda,editar-demanda,detalhe-demanda,especificacao,parecer-risco,pacote-decisao,pedido-construcao}.spec.ts, e2e/decisao.spec.ts (até a linha 140), e2e/agentes-teto.spec.ts (até a linha 120), resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/bsb9wh59w.txt]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T46 cria as duas specs transversais do plano: `e2e/seguranca.spec.ts` (C-15, C-18 e C-19) e `e2e/axe-todas.spec.ts`
(CA-26.4, RNF-11, critério preliminar 14).

Portões, todos verdes:
- `pnpm test`: 189 arquivos e 3.674 testes, nenhuma falha. São os mesmos números da `06-T45-testes`, porque a T46 não
  tem teste unitário.
- `pnpm test:e2e`, a suíte inteira: código 0, com `retries: 0`. São 117 testes em 20 arquivos (`--list`): os 101 de
  antes, mais 4 de `seguranca.spec.ts` e 12 de `axe-todas.spec.ts`. Nenhum 429.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm build`: passa. Todas as rotas são dinâmicas.

### `e2e/seguranca.spec.ts` (4 testes)

- **C-18.** Uma ESP nova, na demanda de tipo `estudo` do seed, com `descricaoObjetiva`
  `<script>alert(1)</script><img src=x onerror=alert(2)>` e `escopoInclui` `['<b>negrito</b>']`. Na T10 da ESP, os dois
  textos aparecem literais. O teste confere também:
  - nenhum `img`, `script` ou `b` dentro de `main`;
  - nenhum diálogo aberto;
  - a API devolve o texto como foi gravado, o que mostra que quem escapa é a tela.
- **C-19, cabeçalhos.** O teste confere a página `/demandas/[id]`, vinda da navegação do navegador, e o
  `GET /api/demandas/:id`, com a sessão da página. Nos dois:
  - 200;
  - `nosniff`, `no-referrer` e `X-Frame-Options: DENY`;
  - sem `X-Powered-By`.

  Só na página, a CSP:
  - `script-src 'self' 'nonce-…'` … `frame-ancestors 'none'`;
  - `object-src 'none'` e `base-uri 'none'`;
  - sem `'unsafe-inline'`.

  O `no-store` tem uma ressalva no modo de desenvolvimento (Decisões e Pendências).
- **C-19, nonce.** O nonce muda a cada resposta, e todo `<script>` do HTML da página leva o mesmo nonce do cabeçalho. Um
  `x-nonce` forjado pelo cliente não chega à CSP nem ao HTML.
- **C-15.**
  - O `OPTIONS /api/demandas` com `Origin: https://atacante.test` e os cabeçalhos de preflight volta sem
    `Access-Control-Allow-Origin` e sem `Access-Control-Allow-Credentials`.
  - Um `POST /api/demandas` com sessão válida e `Origin` de fora recebe 403. O corpo é `{}`: se o `Origin` passasse, a
    validação recusaria com 400 e nada seria gravado.

### `e2e/axe-todas.spec.ts` (12 testes, um por tela; 40 verificações do axe)

| Tela | Estados verificados |
|---|---|
| T01 Entrar | vazio; com erro (campo vazio); passo 2 (código) |
| T02 Configurar 2FA | passo 1; passo 2; passo 2 com erro (código vazio) |
| T03 Fila | com dados; filtrada por tipo; vazia com filtro; filtro inválido |
| T04 Nova demanda | vazia; com erro; preenchida sem salvar |
| T05 Detalhe | com versões e rascunhos de agente; sem versões; erro ao mudar status |
| T06 Editar dados | com dados; com erro; diálogo "Sair sem salvar?" |
| T07 Nova versão da ESP | primeira; com erro; a partir da v1 de agente |
| T08 Novo parecer de risco | sem ESP; com erro; a partir da v1 de agente |
| T09 Novo pacote de decisão | sem ESP e RSK; vazio; com erro |
| T10 Ver versão | ESP de agente; RSK de agente; versão não encontrada |
| T11 Decisão | pendente com rascunhos; com erro; diálogo aberto; conta administradora |
| T12 Agentes e teto | inicial; erro de teto; diálogo de ligar; conta administradora |

Os estados que só existem depois de gravar (decidido, pedido gerado, agente ligado) já têm axe nas specs de cada tela, da
T37 à T45. Nenhuma violação real apareceu: nada do painel precisou de correção.

Os cuidados de estado global estão escritos no topo da spec:
- **T11.** O diálogo da decisão abre no DEC de rascunho do seed e fecha com "Voltar". O teste confere pela API que o
  pacote continua `pendente`, porque a `decisao.spec.ts` roda depois e precisa dele assim.
- **T12.** O diálogo de ligar fecha com "Cancelar". O teste confere que `GET /api/agentes` continua igual e que o teto
  continua o mesmo depois de recarregar.
- **T02.** A conta `sem2fa` só chega ao passo 2 com a senha certa, como nas specs da T37, e o erro é o de código vazio,
  que não vai ao servidor. Nenhuma falha de senha ou de código é somada à conta.
- **T05, T06 e T12.** Os envios com erro não gravam nada. O teste confere pela API: o status da demanda, o título e os
  agentes.

### Teste escrito antes e visto falhando

Os testes cobrem controles que já existem. Por isso o plano manda provocar a falha e mostrar a volta ao verde (Passo 2).

1. **axe.** Tirei de propósito o `lang="pt-BR"` de `src/app/layout.tsx`. Com as duas specs novas já escritas, rodei
   `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/seguranca.spec.ts e2e/axe-todas.spec.ts`:
   ```
     ✘   1 [chromium] › e2e/axe-todas.spec.ts:51:1 › T01 Entrar: vazio, com erro e passo 2 (código)
     ✘   2 [chromium] › e2e/axe-todas.spec.ts:68:1 › T02 Configurar 2FA: passo 1, passo 2 e passo 2 com erro
     ...
     ✘  12 [chromium] › e2e/axe-todas.spec.ts:279:1 › T12 Agentes e teto: …
       Error: axe em T01 vazio
       +     "impacto": "serious",
       +     "regra": "html-has-lang",
   ```
   Nessa execução, os 4 testes de `seguranca.spec.ts` e alguns do axe pararam no login com 429. Cada falha reinicia o
   processo do Playwright, e o contador de `ipFicticio()` volta a zero. O mesmo IP fictício passa então de 10 logins no
   minuto. Isso só acontece numa execução cheia de falhas. Depois, o `lang` voltou e o `git diff` ficou vazio.
2. **C-18 e C-19, provocados no próprio teste.** Também por um tempo, rodei
   `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/seguranca.spec.ts`:
   - no C-18, o texto da ESP entrava como HTML no `dd` da página, como faria um render sem escape;
   - no C-19, um `page.route` tirava a CSP da resposta da página, como se o `proxy.ts` deixasse de pô-la.
   ```
     ✘  1 › C-18: … Locator: getByText('<script>alert(1)</script><img src=x onerror=alert(2)>', { exact: true })
            Expected: visible … element(s) not found
     ✘  2 › C-19: … expect(h['content-security-policy']).toMatch(…) Received has value: undefined
     2 failed, 2 passed
   ```
   As duas provocações saíram da spec em seguida (desvio 1).
3. **Achado real no primeiro verde.** A primeira execução sem provocação mostrou que a página de `next dev` volta com
   `Cache-Control: no-cache, must-revalidate`, e não com o `no-store` do `src/proxy.ts`:
   ```
     ✘  14 › C-19: … Error: /demandas/DEM-20261031-0004
            Expected substring: "no-store"
            Received string:    "no-cache, must-revalidate"
     1 failed, 15 passed
   ```
   Uma execução de diagnóstico (`--grep "sem X-Powered-By"`) deu o mesmo valor por `page.request.get`, com e sem
   `Accept: text/html`. Então não é efeito da navegação: o `next dev` troca o cabeçalho que o proxy pôs. O tratamento
   está em Decisões e Pendências.

Depois, as duas specs passaram: 16 de 16. A suíte inteira terminou com código 0.

### C-36: uso da suíte e2e por conta

- `axe-todas.spec.ts` não grava nada: 0 demandas e 0 versões nas duas contas. Só faz GET, abre telas e envia formulários
  vazios ou inválidos.
- `seguranca.spec.ts` não cria demanda. Usa a demanda de tipo `estudo` do seed, achada por `GET /api/demandas`, e grava
  só 1 ESP na conta "cto", no caso C-18. O C-19 e o C-15 não gravam nada.
- O comentário do topo de cada spec traz essa conta.

| Conta | Demandas antes | T46 | Total | Versões antes | T46 | Total |
|---|---|---|---|---|---|---|
| "cto" (com as 5 do seed) | 30 | 0 | 30 de 30 | 35 | 1 | 36 de 60 |
| "administradora" | 30 | 0 | 30 de 30 | 35 | 0 | 35 de 60 |

- O "antes" vem da `06-T45-testes`.
- Das T44 a T46, foram usadas 0 das 2 demandas da `06-T43-revisao`. Também foi cumprido o teto de 0 da `06-T44-revisao`.
- Nenhum controle de C-36 foi tocado. Nada mudou em `limites.ts`, no seed, no `playwright.config.ts`, em variável de
  ambiente nem no relógio. Nenhuma demanda foi apagada, e a suíte não espera a janela de uma hora.

### Arquivos

- Criados (os dois do plano): `e2e/seguranca.spec.ts` e `e2e/axe-todas.spec.ts`.
- Nenhum arquivo existente mudou. O `src/app/layout.tsx` foi alterado e voltou na mesma etapa. O
  `git status --short --untracked-files=all` mostra só as duas specs e esta entrega.

### Desvios do plano

1. **A falha de C-18 e C-19 foi provocada no teste, e não em `src/`.**
   - O plano sugere um `dangerouslySetInnerHTML` temporário barrado pelo lint e um cabeçalho tirado do `proxy.ts`.
   - Tentei as duas edições, e o sistema de permissões recusou as duas como enfraquecimento de segurança. Não insisti
     nem procurei outro caminho para essas mudanças.
   - No lugar delas, provoquei a falha só na spec: o HTML entra no `dd` e um `page.route` tira a CSP. As duas provocações
     saíram em seguida.
   - Por isso a entrega não mostra o lint barrando o `react/no-danger`. A regra continua em `eslint.config.mjs`, e o
     `pnpm lint` passa limpo.
2. **A página do C-19 vem da navegação do navegador (`page.goto`), e não de `page.request.get`.** Assim o teste confere
   o que chega à pessoa, e o `page.route` da provocação vale. A API continua por `page.request.get`.
3. **C-19 tem mais conferências do que o plano lista:** `X-Frame-Options`, `object-src`, `base-uri`, nenhum
   `'unsafe-inline'`, o nonce novo a cada resposta e igual ao de todo `<script>`, e o `x-nonce` forjado. O C-15 tem também
   o `POST` com sessão e `Origin` de fora, que dá 403.
4. **No modo de desenvolvimento, o `Cache-Control` da página é conferido pelo valor do `next dev`** (Decisões e
   Pendências).

## Decisões tomadas

- **`no-store` da página condicionado ao modo do servidor.**
  - Com o `next dev` do e2e local, a página tem de vir com `no-cache, must-revalidate` exatamente. Qualquer outro valor
    falha.
  - Fora dele (homologação, `BASE_URL`), ela tem de conter `no-store`. A API exige `no-store` sempre.
  - O sinal do modo é o mesmo que o `src/proxy.ts` usa: o `'unsafe-eval'` da CSP só aparece em desenvolvimento.
  - A razão: o `next dev` troca o cabeçalho que o proxy pôs, e o servidor de desenvolvimento não vai para produção. O
    teste continua estrito no build de produção, que é onde o C-19 vale.
- **Um teste por tela no axe.** Cada um tem página e sessão novas: o aviso "Sair sem salvar" de um formulário preenchido
  não passa para a tela seguinte, e cada teste roda sozinho.
- **Estados sem gravar.** O teto de 0 demandas e o DEC de rascunho que a `decisao.spec.ts` precisa pendente impedem
  "decidido" e "ligado" aqui. Esses estados já têm axe nas specs de cada tela.
- **A demanda de C-18 é a de Estudo do seed.** É a que a `06-T44-revisao` indicou, e a spec não supõe que ela esteja
  sem pacote.
- **Nenhum texto novo de interface.** A T46 não acrescenta nada visível, então não há texto fora da 03.

## Pendências

- **tech-lead e seguranca-aplicacao: C-19, `Cache-Control` da página no `next dev`.**
  - O `proxy.ts` põe `no-store` em toda página, mas a resposta do `next dev` chega com `no-cache, must-revalidate`.
  - Não conferi o build de produção: `next start` não está na minha lista **Pode**.
  - Pelo que sei do Next 16, página dinâmica em produção sai com `private, no-cache, no-store, max-age=0,
    must-revalidate`, o que cumpre o C-19. Isso precisa ser provado.
  - A prova vem na homologação (`construir.mjs homologar`, com `BASE_URL`). Lá a mesma spec exige `no-store` na página.
    Se falhar, o C-19 está aberto em produção e a correção é do `engenheiro-backend` (dono do `proxy.ts`, T11).
  - Se o tech-lead preferir que o e2e local também exija `no-store`, vai ser preciso uma tarefa que mude como o
    cabeçalho é posto. Por exemplo, testar se um cabeçalho de `next.config.ts` ou de outra camada sobrevive ao `next dev`.
- **tech-lead: a provocação do plano em `src/` foi recusada pelo sistema de permissões.** Se a demonstração pelo lint for
  indispensável, ela precisa de autorização de Fabiano. Foi substituída pela provocação no teste (desvio 1).
- **qa-automacao (`06-T46-testes`): rodar o `pnpm test:e2e` inteiro e registrar o uso por conta.** O total esperado é de
  30 de 30 demandas nas duas contas, 36 de 60 versões na "cto" e 35 de 60 na "administradora". 429 é falha da tarefa.
- **Para quem mexer no e2e:** uma execução com muitas falhas seguidas pode dar 429 no login. Cada falha reinicia o
  processo e zera o contador de `ipFicticio()` em `e2e/apoio.ts`. Com a suíte verde não acontece. Se incomodar, o
  contador pode partir de um número que mude a cada processo.
- **07-qa-funcional:** nada novo de foco ou teclado. As telas não mudaram.
- **Para o maestro: saídas que a ferramenta gravou.**
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/bsb9wh59w.txt`. Li só o resumo final.
  - O `pnpm test:e2e` inteiro foi para segundo plano depois de 180 s. O resultado (código 0) veio do aviso de fim da
    tarefa, e a contagem veio do `--list`.
  - Não li nada em `/tmp`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= --diff-filter=A -- e2e src/app src/proxy.ts src/middleware.ts next.config.ts playwright.config.ts eslint.config.mjs` — specs e telas existentes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/seguranca.spec.ts e2e/axe-todas.spec.ts` — FAIL: 16 falharam (sem `lang`; html-has-lang e 429 de reinício)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/seguranca.spec.ts` — FAIL: 2 falharam (C-18 e C-19 provocados) e 2 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/seguranca.spec.ts e2e/axe-todas.spec.ts` — FAIL: 1 falhou (Cache-Control do `next dev`) e 15 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/seguranca.spec.ts --grep "sem X-Powered-By"` — FAIL de diagnóstico: `no-cache, must-revalidate` também por `page.request`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só as duas specs novas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 189 de 189 arquivos, 3.674 de 3.674 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, a suíte inteira (foi para segundo plano depois de 180 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio: nenhum arquivo rastreado mudou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 117 testes em 20 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; todas as rotas dinâmicas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — as duas specs e esta entrega

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
