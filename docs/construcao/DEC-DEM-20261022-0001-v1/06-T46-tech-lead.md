---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T46-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho, G1, T43 a T46, rastreabilidade), 06-T46-engenheiro-frontend.md, 06-T45-tech-lead.md, git diff --stat 4959704..1b8fbc0, git show --stat 34dd3b1 e e8f333e, e2e/seguranca.spec.ts, e2e/axe-todas.spec.ts, e2e/apoio.ts, src/proxy.ts, src/proxy.test.ts, next.config.ts, eslint.config.mjs, playwright.config.ts, resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/bhooms0sf.txt]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisei a T46 no intervalo `4959704..1b8fbc0`.
- O código e os testes entraram no `34dd3b1`: `e2e/seguranca.spec.ts` (122 linhas) e `e2e/axe-todas.spec.ts` (313
  linhas), mais a entrega e o registro.
- O `e8f333e` só acrescenta uma linha ao `passagens.jsonl`, e o `1b8fbc0` só regrava a entrega.
- Nenhum arquivo que já existia mudou, em `src/` nem em outro lugar.

Não achei nada Critical nem Important. A tarefa passa para a `06-T46-testes`. Os quatro pareceres abaixo são Minor e vão
para Pendências. Depois deles vêm os dois pontos que o engenheiro deixou para mim.

### Portões, rodados nesta revisão

- `pnpm test`: 189 arquivos e 3.674 testes, todos verdes. É o número que a entrega relata.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status --short`: limpo.
- `pnpm test:e2e` não está na minha lista **Pode**. Vale o que a entrega relata: 117 testes em 20 arquivos, código 0,
  `retries: 0` e nenhum 429. A `06-T46-testes` confere a suíte inteira.

### Checklist da seção 12 do padrão técnico

- [x] **A tarefa faz o que o plano pede.** O plano (T46) pede só os dois arquivos criados, e são esses que estão no
  commit.
  - `seguranca.spec.ts` cobre os três testes do plano: C-18, C-19 na página e na API, e C-15 no `OPTIONS`.
  - O teste a mais, o do nonce, e as conferências a mais estão dentro do C-19 e do C-15. Ele confere que o nonce muda,
    que é igual ao de todo `<script>` e que o `x-nonce` forjado não vale. O `POST` de outra origem dá 403.
  - Não cobrem nada fora deles, e por isso aceito.
  - `axe-todas.spec.ts` passa pelas 12 telas, cada uma em três estados ou mais (40 verificações). É o que o CA-26.4 e o
    plano pedem.
  - Há dois desvios do código do plano.
    - O C-18 e o C-19 usam a demanda de Estudo do seed, e não criam demanda. É a regra de 0 demandas da
      `06-T44-revisao`, e é o certo.
    - A página do C-19 vem por `page.goto`. Assim, o teste confere o que chega ao navegador.
- [x] **Há teste para cada comportamento novo, e ele falharia sem o código.** A T46 só tem teste, e eles conferem
  controles que já existem. Por isso o plano pede uma falha provocada, e a entrega mostra três.
  - Tirar o `lang` acusou `html-has-lang` nas 12 telas.
  - O HTML cru no `dd` acusou o C-18.
  - Tirar a CSP com `page.route` acusou o C-19.
  - A volta ao verde está na entrega. A provocação no teste, e não em `src/`, é o ponto 1 de "Pontos do engenheiro".
- [x] **Nenhum segredo nem dado pessoal real.**
  - Só aparecem as contas de `CONTAS_FICTICIAS` do seed, títulos marcados "(fictício)", "Pessoa Ficticia",
    `https://atacante.test` e `NONCE-FORJADO-FICTICIO`.
  - Os IPs saem de `ipFicticio()`, na faixa reservada 198.18.0.0/15.
- [x] **Entrada externa validada com Zod, e erro sem detalhe.** Não se aplica: a tarefa não cria entrada. As specs
  conferem a validação que já existe: formulários vazios e inválidos são recusados, e o `POST` de fora dá 403 com corpo
  `{}`.
- [x] **Banco.** Nenhuma migration, e nenhuma era esperada.
- [x] **Nada duplica função existente.**
  - As specs usam `api`, `entrarComo`, `entrarSoComSenha`, `ipFicticio` e `semViolacoes` de `e2e/apoio.ts`.
  - A busca da demanda do seed por título aparece duas vezes nas specs novas (Minor 2). Não é cópia de função do
    repositório, e por isso não bloqueia.
- [x] **Textos em pt-BR, e o axe sem violação.** Nenhuma tela mudou e nenhum texto novo de interface entrou. O axe das 12
  telas passou sem violação, e nenhuma correção no painel foi preciso.
- [x] **Minor vai para Pendências.** Os quatro pontos estão lá.
- [x] **`/code-review` e `/security-review` no PR.** Não se aplica à revisão por tarefa: ficam com a `08-revisao`.

### Pareceres (todos Minor, nenhum bloqueia)

1. **`e2e/seguranca.spec.ts:86-88`: o teste decide o modo do servidor pela própria resposta.**
   - Problema: a conferência do `Cache-Control` da página afrouxa quando a CSP traz `'unsafe-eval'`. Assim, quem decide
     se o teste é estrito é o mesmo servidor que está sendo testado.
   - Razão: o risco é pequeno, por dois motivos.
     - `src/proxy.test.ts:47-51` prende que a CSP de produção não tem `'unsafe-eval'`.
     - Mesmo com `'unsafe-eval'` na homologação, o `toBe('no-cache, must-revalidate')` exato falharia contra o valor de
       produção do Next.

     Por isso é Minor.
   - O que fazer, numa tarefa futura que já mexa no e2e:
     - tirar o modo de `process.env.BASE_URL`, o mesmo sinal que o `playwright.config.ts` usa;
     - acrescentar `expect(csp).not.toContain("'unsafe-eval'")` quando houver `BASE_URL`.
2. **`e2e/seguranca.spec.ts:25-30` e `e2e/axe-todas.spec.ts:37-42`: a busca da demanda do seed é escrita duas vezes.**
   - Problema: `demandaDeEstudoDoSeed` e `demandaDoSeed` fazem a mesma coisa. Cada uma faz `GET /api/demandas?tipo=…`,
     procura o título do seed e falha se não achar. Os títulos estão copiados de `scripts/seed-ficticio.ts` como texto.
   - Razão: as duas estão em specs, e o teste falha alto se o seed mudar. Não é regra de negócio duplicada, e por isso é
     Minor.
   - O que fazer: numa tarefa futura que já mexa no e2e, levar a busca para `e2e/apoio.ts`. Os títulos passam a ser lidos
     do próprio `DEMANDAS` do seed, como `CONTAS_FICTICIAS` já é.
3. **`e2e/seguranca.spec.ts:87`: o valor exato do `next dev` fica preso no teste.**
   - Problema: `toBe('no-cache, must-revalidate')` quebra se uma correção do Next mudar o cabeçalho do servidor de
     desenvolvimento.
   - Razão: a quebra seria só no e2e local, e avisaria da mudança, o que é desejável. Por isso é Minor.
   - O que fazer: se quebrar numa atualização do Next, quem atualizar troca o valor e registra na entrega. O C-19 não fica
     mais fraco por isso, porque ele vale para o build de produção.
4. **`e2e/apoio.ts:23-27`: o contador de `ipFicticio()` volta a zero quando o processo do Playwright reinicia.**
   - Problema: quando muitos testes falham seguidos, cada falha reinicia o processo e os mesmos IPs se repetem. Aí o
     login passa de 10 por minuto e dá 429. O engenheiro viu isso na execução com o `lang` tirado.
   - Razão: com a suíte verde não acontece. O efeito é só mais ruído na hora de diagnosticar, e por isso é Minor.
   - O que fazer: numa tarefa futura que já mexa em `e2e/apoio.ts`, começar o contador num número que mude a cada
     processo, por exemplo derivado de `process.pid`.

### Pontos que o engenheiro deixou para o tech-lead

1. **A falha de C-18 e C-19 foi provocada no teste, e não em `src/`. Aceito, sem precisar de Fabiano.**
   - O Passo 2 do plano traz o `dangerouslySetInnerHTML` e o cabeçalho tirado do `proxy.ts` como "por exemplo". O que o
     plano exige é mostrar que o teste acusa a falha e depois volta ao verde. As duas provocações no teste mostram isso.
     - No C-18, o HTML cru no `dd` faz falhar o `getByText(ATAQUE, { exact: true })`.
     - No C-19, a resposta sem CSP faz falhar o `toMatch` da CSP.
   - A camada de lint não precisa ser provada de novo nesta tarefa. A regra `react/no-danger: 'error'` está em
     `eslint.config.mjs:11`, e o `pnpm lint` desta revisão passou limpo sobre o painel inteiro.
   - Mexer em `src/` para enfraquecer um controle, mesmo por pouco tempo, é justamente o que a recusa do sistema de
     permissões evita. Não vou pedir autorização para isso.
2. **`Cache-Control` da página no `next dev`, e a prova do C-19 no build de produção. Aceito o tratamento, com uma
   condição para a homologação.**
   - O `src/proxy.ts:35` põe `no-store`, e o teste de unidade prende isso (`src/proxy.test.ts:38-40`). Quem troca o
     cabeçalho é o servidor de desenvolvimento, que não vai para produção. A API exige `no-store` nos dois modos.
   - A prova que falta é do build de produção. Ela vem no `construir.mjs homologar`, que roda a mesma spec com
     `BASE_URL`, e lá a página tem de conter `no-store`. Não muda nada em `src/` agora, e não abro tarefa nova.
   - Condição: se o C-19 falhar na homologação, o PR não sai. A correção vai para o `engenheiro-backend`, dono do
     `proxy.ts` e do `next.config.ts` (T11). Ele faz a página sair com `no-store` no build de produção, e o teste da
     homologação não afrouxa.

### C-36: conferência da regra da `06-T44-revisao`

A regra para a T46 é de 0 demandas novas. Versões novas são permitidas dentro do teto de 60 por conta.

- **A T46 criou 0 demandas.** Li as duas specs inteiras.
  - Nenhum `POST /api/demandas` grava. O único da tarefa é o de C-15, com `Origin` de fora e corpo `{}`, e a resposta
    conferida é 403.
  - A T04 só preenche o formulário e não clica em "Salvar demanda" depois de preencher.
- **A T46 gravou 1 versão, na conta "cto".** É a ESP do caso C-18 (`seguranca.spec.ts:47`). As tentativas de gravar na
  `axe-todas.spec.ts` (T05 a T09, T11 e T12) mandam formulário vazio ou inválido.
  - O teste confere pela API que nada mudou na T05, na T06 e na T12.
  - Na T11, o diálogo fecha com "Voltar", e o pacote continua `pendente`.
- **Totais depois da T46:**

  | Conta | Demandas | Versões |
  |---|---|---|
  | "cto" | 30 de 30 | 36 de 60 |
  | "administradora" | 30 de 30 | 35 de 60 |

- **Nenhum controle foi tocado.** O intervalo não muda `limites.ts`, o seed, o `playwright.config.ts`, variável de
  ambiente nem o relógio.
- **Ordem e estado global.** Os testes rodam com `workers: 1` e `fullyParallel: false`, e a `axe-todas.spec.ts` roda
  antes da `decisao.spec.ts`.
  - O DEC de rascunho do seed fica pendente, e o teste confere isso.
  - O diálogo da T12 é cancelado, e o teste compara `GET /api/agentes` antes e depois.
  - A `seguranca.spec.ts` roda depois da `pedido-construcao.spec.ts` e não supõe que a demanda de Estudo esteja sem
    pacote.

## Decisões tomadas

- **Status `pronto`.** Os quatro pareceres são Minor e não impedem a T46 de fazer o que o plano pede. Pela seção 12, só
  Critical e Important bloqueiam.
- **Aceito a provocação da falha no teste, e não em `src/`.** O plano dá o exemplo de `src/` como "por exemplo". A
  provocação no teste prova o que importa, que o teste acusa a falha, e não enfraquece controle nenhum.
- **Aceito o `Cache-Control` do `next dev` só no e2e local.** O servidor de desenvolvimento não vai para produção, o
  unitário prende o `no-store` do proxy, e a homologação exige `no-store` na página.
- **Falha do C-19 na homologação barra o PR.** O C-19 vale para o que vai para produção, e a homologação é o primeiro
  lugar em que o build de produção é testado de ponta a ponta.

## Pendências

- **`qa-automacao` (`06-T46-testes`): rodar o `pnpm test:e2e` inteiro e registrar o uso por conta.**
  - O total esperado é de 30 de 30 demandas nas duas contas, 36 de 60 versões na "cto" e 35 de 60 na "administradora".
  - Conferir que o DEC de rascunho do seed chega pendente à `decisao.spec.ts`.
  - 429 é falha da tarefa.
- **Maestro e `devops-sre` (`construir.mjs homologar`): o C-19 da página no build de produção.**
  - A `seguranca.spec.ts` com `BASE_URL` tem de passar com `no-store` no `Cache-Control` de `/demandas/[id]`.
  - Se falhar, o PR não sai. A correção vai ao `engenheiro-backend`, em `src/proxy.ts` e `next.config.ts` (T11), e o
    teste não afrouxa.
- **Minor 1 (sinal do modo):** tirar o modo de `BASE_URL` e exigir CSP sem `'unsafe-eval'` na homologação. Fica para
  uma tarefa futura que já mexa no e2e.
- **Minor 2 (busca do seed):** levar a busca da demanda do seed para `e2e/apoio.ts`, lendo os títulos do seed, numa
  tarefa futura que já mexa no e2e.
- **Minor 3 (valor do `next dev`):** se quebrar numa atualização do Next, quem atualizar troca o valor e registra na
  entrega.
- **Minor 4 (`ipFicticio`):** começar o contador num número que mude a cada processo, numa tarefa futura que já mexa em
  `e2e/apoio.ts`.
- **`07-qa-funcional`:** nada novo de foco ou teclado. As telas não mudaram.
- **Para o maestro: li um arquivo de saída fora do repositório.**
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/bhooms0sf.txt`.
  - Li só o resumo final desse arquivo, que a minha própria execução gerou nesta etapa.
  - Não li nada em `/tmp`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4959704..1b8fbc0` — 4 arquivos, 672 inserções (2 specs, a entrega e o registro)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — 1b8fbc0, e8f333e e 34dd3b1 sobre 4959704
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat e8f333e` — só o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%s 34dd3b1` — as 2 specs, a entrega e o registro
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 189 de 189 arquivos, 3.674 de 3.674 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
