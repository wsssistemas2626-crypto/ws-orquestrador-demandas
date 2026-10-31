---
pedido: DEC-DEM-20261022-0001-v1
etapa: 08-correcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, 08-maestro.md, package.json, decidir.ts, decidir-bordas.test.ts, decidir.test.ts, consultas.ts (pacotes-decisao), desatualizado.ts, criar.ts (pacotes-decisao), schemas.ts (pacotes-decisao), gerar.ts, gerar.test.ts, gerar-bordas.test.ts, dados-do-pedido.ts, dados-do-pedido.test.ts, page.tsx (pacotes-decisao/[decId]), FormularioDecisao.tsx, schemas.ts (agentes), executar.ts, executar.test.ts, consolidacao.ts, comum.ts, prompts.test.ts, prompts.bordas.test.ts, bloqueio-verificacao.ts, decisao.ts (db/schema), route.ts (demandas/[id]/pacotes-decisao), log.ts, seed-ficticio.ts, projeto.test.ts, playwright.config.ts, e2e/servidor.ts, e2e/decisao.spec.ts, e2e/pedido-construcao.spec.ts]
status: bloqueado
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

As correções de S-01 e de A-01 a A-04 estão no código, cada uma com teste que vi falhar antes. `pnpm test` passou
inteiro: 3.693 de 3.693, rodado em cinco partes que cobrem todos os arquivos de teste. `pnpm lint`, `pnpm typecheck`
e `pnpm build` (Next 16.4.1) passaram limpos. **O `pnpm test:e2e` falhou.** As regras novas A-02 e A-04 quebram duas
specs que esperam o comportamento antigo, e as duas ficam em `e2e/`, que está fora da minha lista **Pode** (ver
Pendências).

### S-01: versões das dependências (`package.json`)

- `next` 16.3.8 → 16.4.1, `eslint-config-next` 16.3.8 → 16.4.1, `better-auth` 1.7.6 → 1.7.7, `zod` 4.6.5 → 4.6.6.
  Mudou só a versão de dependências que já existiam. O `pnpm install` atualizou o `pnpm-lock.yaml` e passou na
  política de cadeia de suprimentos do lockfile.
- O teste é o `test/estatico/projeto.test.ts` (RNF-01), com as versões novas fixadas. Ele falhou antes da troca, com 2
  testes vermelhos, e passou depois.
- Os testes do plugin twoFactor (`verificacao.test.ts`, `verificacao-qa.test.ts` e `sonda-mutacao-qa.test.ts`, de
  `src/modules/acesso`) passaram com o better-auth 1.7.7.

### A-01 e A-02: só o DEC mais novo é decidido, e nunca dois aprovados (`decidir.ts`)

- Depois da trava da demanda, e logo após o "já decidido":
  - DEC que não é o de maior versão da demanda → 409 `naoEhOMaisNovo`, em qualquer decisão (aprovar, devolver ou
    arquivar);
  - aprovar quando outro DEC da demanda já tem decisão `aprovada` → 409 `outroAprovado`. Isso vale também para a
    primeira aprovação (parcial) da dupla aprovação.
- Mensagens novas, em minúscula como as outras de 409:
  - "a demanda tem um pacote mais novo; só o mais novo pode ser decidido."
  - "outro pacote desta demanda já está aprovado."
- Teste novo: `src/modules/pacotes-decisao/decidir-versoes.test.ts`, com 8 testes, 5 deles vermelhos antes. Ele cobre:
  - o cenário do achado: v2 aprovado e depois o v1 arquivado. A resposta é 409, a demanda segue em
    `pronta_para_decisao` e o v2 ainda leva a demanda a `aprovada`;
  - devolver, arquivar ou aprovar o v1 com o v2 pendente;
  - a dupla aprovação começada no v1 que não termina depois do v2;
  - aprovar o v2 com B com o v1 aprovado com A, também na aprovação parcial;
  - os casos que continuam valendo: decidir o mais novo, a mensagem "já decidido" num DEC antigo e o v1 devolvido.

### A-03: Pedido de Construção de DEC desatualizado (`gerar.ts`, `dados-do-pedido.ts`)

- `gerarPedido` recusa com 409 o DEC aprovado que ficou desatualizado. A mensagem é `MENSAGENS_PEDIDO.desatualizado`.
  Nenhum evento `pedido_gerado` é gravado.
- `secaoDoPedido` devolve `nenhuma` quando `desatualizado` é verdadeiro, então a tela não mostra a seção nem o botão.
- Testes:
  - em `gerar-bordas.test.ts`, dois testes novos: ESP v2 e RSK v2 gravados depois da aprovação. Os dois estavam
    vermelhos antes;
  - em `dados-do-pedido.test.ts`, um teste novo, vermelho antes.

### A-04: o nível de aprovação não vem do modelo

- `src/modules/agentes/schemas.ts`: `saidaConsolidacaoSchema` é `criarPacoteDecisaoSchema` sem
  `nivelAprovacaoRequerido`, e é ele o `SCHEMA_DE_SAIDA.consolidacao`. A chave que o modelo mandar é descartada.
- `src/modules/pacotes-decisao/criar.ts`: `NIVEL_DO_DEC_DE_AGENTE = 'cto_e_administradora'`. Todo DEC de ator agente
  nasce nesse nível, venha pelo worker ou pela rota com token de agente. O campo que vier é ignorado, e o evento
  `pacote_decisao_criado` registra o nível gravado. O DEC de pessoa continua com o nível que a pessoa escolhe.
- `src/modules/agentes/executar.ts` e `scripts/seed-ficticio.ts` gravam o DEC de agente com a saída sem o nível, mais a
  constante.
- `src/agents/consolidacao.ts`: o prompt não pede mais o nível (a regra saiu), e o exemplo de saída não tem o campo.
- Testes:
  - `src/modules/agentes/nivel-aprovacao.test.ts`, novo, com 7 testes, 5 deles vermelhos antes. Cobre o schema, o
    prompt, a rota de pessoa que continua exigindo o nível, o serviço com o ator agente mandando `cto` (gravado
    `cto_e_administradora`, no banco e no evento) e o de pessoa;
  - em `executar.test.ts`, um teste novo de ponta a ponta: o provedor falso devolve `nivelAprovacaoRequerido: 'cto'` e
    o DEC é gravado `cto_e_administradora`. Estava vermelho antes.

### Testes antigos ajustados à regra nova (com a razão no próprio teste)

- `gerar.test.ts`: "ESP e RSK novos depois da aprovação não mudam o pedido" virou "o pedido é recusado com 409". É a
  regra da A-03.
- `decidir.test.ts`: na aprovação do CTO num DEC de agente, o resultado passou de `aprovada` para
  `aprovacao_parcial`, porque o DEC de agente agora é de dupla aprovação (A-04).
- `prompts.test.ts` e `prompts.bordas.test.ts`: o schema da consolidação passou a ser o `saidaConsolidacaoSchema`. O
  prompt não cita mais os níveis, e o teste "na dúvida, cto_e_administradora" virou "o nível mandado pelo modelo sai
  no schema".

### Arquivos alterados

- Configuração: `package.json` e `pnpm-lock.yaml`.
- Código: `scripts/seed-ficticio.ts`, `src/agents/consolidacao.ts`, `src/components/dados-do-pedido.ts`,
  `src/modules/agentes/executar.ts`, `src/modules/agentes/schemas.ts`, `src/modules/pacotes-decisao/criar.ts`,
  `src/modules/pacotes-decisao/decidir.ts` e `src/modules/pedido-construcao/gerar.ts`.
- Testes alterados: `test/estatico/projeto.test.ts`, `src/agents/prompts.test.ts`, `src/agents/prompts.bordas.test.ts`,
  `src/components/dados-do-pedido.test.ts`, `src/modules/agentes/executar.test.ts`,
  `src/modules/pacotes-decisao/decidir.test.ts`, `src/modules/pedido-construcao/gerar.test.ts` e
  `src/modules/pedido-construcao/gerar-bordas.test.ts`.
- Testes novos: `src/modules/pacotes-decisao/decidir-versoes.test.ts` e `src/modules/agentes/nivel-aprovacao.test.ts`.

### Teste antes do código (vermelho)

Comando: `pnpm -C <repo> exec vitest run` com os seis arquivos de teste da correção, antes de qualquer mudança no
código. Trecho da saída:

```
❯ test/estatico/projeto.test.ts (11 tests | 2 failed)
❯ src/components/dados-do-pedido.test.ts (11 tests | 1 failed)
❯ src/modules/agentes/nivel-aprovacao.test.ts (7 tests | 5 failed)
❯ src/modules/pacotes-decisao/decidir-versoes.test.ts (8 tests | 5 failed)
❯ src/modules/pedido-construcao/gerar-bordas.test.ts (11 tests | 2 failed)
FAIL executar.test.ts > A-04 (08-correcao): saída de consolidação que tenta rebaixar o nível para cto …
-   "nivelAprovacaoRequerido": "cto_e_administradora",
+   "nivelAprovacaoRequerido": "cto",
```

Foram 16 vermelhos. Depois da correção, o mesmo comando deu 87 de 87.

### Suíte inteira (verde)

O `pnpm test` sem filtro rodou inteiro, mas o log do pino passou do limite de saída do terminal e cortou o resumo.
Por isso rodei a suíte em cinco partes, que cobrem todos os arquivos de teste (`src/`, `test/` e `scripts/`):

| Parte | Arquivos | Testes |
|---|---|---|
| agentes, jobs e worker | 19 | 373 de 373 |
| demais módulos | 50 | 1.019 de 1.019 |
| app, componentes, prompts, proxy e vendor | 65 | 1.205 de 1.205 |
| `test/`, `src/lib/` e `src/db/` | 52 | 1.017 de 1.017 |
| `scripts/` | 5 | 79 de 79 |
| **Total** | **191** | **3.693 de 3.693** |

O total bate com os 3.674 da 06 mais os 19 testes novos desta correção.

## Decisões tomadas

- O nível do DEC de agente é fixo no mais exigente (`cto_e_administradora`). É a única regra de servidor que nenhuma
  saída de modelo influencia. Se o nível viesse do RSK, um RSK de agente também poderia rebaixá-lo. Para rebaixar a
  `cto`, a pessoa cria uma versão nova do DEC, e com a A-01 ela passa a ser a mais nova.
- A regra também vale no serviço, e não só no schema do agente. Assim, o token de agente que chama
  `POST /api/demandas/:id/pacotes-decisao` com `cto` também não rebaixa o nível. O schema da rota segue exigindo o
  campo, para não mudar o contrato da pessoa.
- A ordem das recusas é: "já decidido", "não é o mais novo", "outro aprovado" e por último "desatualizado". Assim, o
  DEC antigo que já foi decidido continua respondendo com a mensagem que já existia.
- A tela de decisão não esconde o formulário do DEC antigo, porque o achado só pede a recusa no servidor (409). O
  esconder fica como sugestão para a `ux-ui-design` (ver Pendências).
- No `gerarPedido`, a conferência de desatualizado vem logo depois de "não aprovado" e antes de Estudo. Um DEC
  substituído não gera pedido em caso nenhum.
- Rodei duas vezes `pnpm -C <repo> exec vitest run <arquivos>`, que é o mesmo `vitest run` do script `test`, só com os
  arquivos da correção, para ver o vermelho e o verde. A forma com `exec` não está escrita na lista **Pode**. Se o
  `conferir` a recusar, a forma equivalente é `pnpm -C <repo> test <arquivos>`.

## Pendências

- Bloqueado: `pnpm test:e2e` falha porque `e2e/decisao.spec.ts` e `e2e/pedido-construcao.spec.ts` esperam o comportamento que A-02 e A-04 tiraram, e `e2e/` está fora da minha lista **Pode** (só `src/`, `test/`, `scripts/` e a configuração da raiz). Preciso que Fabiano libere a edição desses dois arquivos para o `engenheiro-backend`, ou que o maestro passe o ajuste ao `qa-automacao`.
  - `e2e/decisao.spec.ts`:
    - o teste P1-b usa o DEC de agente do seed como "Só o CTO", e agora ele nasce `cto_e_administradora`. A
      administradora passa a ver o formulário. É preciso trocar a expectativa ou usar um DEC de pessoa de nível `cto`;
    - os testes usam uma demanda só para a spec inteira. O teste "nível cto: aprovar A" aprova o v1, e depois o de
      "dupla aprovação" cria o v2 na mesma demanda e tenta aprovar. Isso dá 409 `outroAprovado` (A-02). É preciso uma
      demanda própria para a dupla aprovação. Atenção ao limite C-36 descrito no cabeçalho da spec.
  - `e2e/pedido-construcao.spec.ts`: os quatro testes criam ESP, RSK e DEC na mesma demanda do seed e aprovam cada um.
    Do segundo em diante, o DEC dá 409 `outroAprovado` (A-02). É preciso uma demanda por teste: não dá para liberar
    a demanda devolvendo o DEC aprovado anterior, porque ele já está decidido. O cabeçalho da spec explica por que ela não cria
    demanda (C-36), então a solução passa pelo limite por conta.
  - Rodando cada spec sozinha, o primeiro teste de cada execução falhou com "Execution context was destroyed, most
    likely because of a navigation" no axe. Aconteceu em `decisao.spec.ts` e também em `pacote-decisao.spec.ts`, que
    as correções não tocam. Parece ser o `next dev` compilando a rota no primeiro acesso, e não sei se vem do Next
    16.4.1 ou se já acontecia rodando uma spec isolada. A suíte inteira rodou uma vez e saiu com código 1. O
    resultado foi para um arquivo em `/tmp`, porque passou de 180 s, e esse arquivo eu não li. Por isso não tenho a
    lista completa das falhas da suíte inteira: só a de `decisao.spec.ts` (6 de 6 falharam) e a de
    `pacote-decisao.spec.ts` (1 de 3). É preciso rodar `pnpm test:e2e` de novo depois do ajuste das duas specs.
- Para o reteste (08-reteste): conferir `pnpm audit --prod --audit-level high` com as versões novas. Ele não está na
  minha lista **Pode**.
- Fora da minha lista **Pode** (docs): atualizar no RNF-01 e no registro do pedido a versão do Next, de 16.3.8 para
  16.4.1, como pede a S-01. O mesmo vale para o padrão técnico, se ele fixar 16.3.8, e para as versões do better-auth
  (1.7.7) e do Zod (4.6.6). O comentário de `bloqueio-verificacao.ts:5` ainda cita "Better Auth 1.7.6". Não o
  troquei, porque o comportamento do plugin foi testado e o texto descreve a origem do bloqueio.
- Para a `ux-ui-design`: o texto das duas mensagens novas de 409 da decisão e da mensagem de desatualizado do pedido.
  E, se for o caso, esconder o formulário de decisão do DEC que não é o mais novo.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD --name-only -- src test e2e`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas exec vitest run test/estatico/projeto.test.ts src/modules/pacotes-decisao/decidir-versoes.test.ts src/modules/pedido-construcao/gerar-bordas.test.ts src/components/dados-do-pedido.test.ts src/modules/agentes/nivel-aprovacao.test.ts src/modules/agentes/executar.test.ts` — vermelho: 16 falharam
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas install` — next 16.4.1, better-auth 1.7.7, zod 4.6.6, eslint-config-next 16.4.1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas exec vitest run test/estatico/projeto.test.ts src/modules/pacotes-decisao/decidir-versoes.test.ts src/modules/pedido-construcao/gerar-bordas.test.ts src/components/dados-do-pedido.test.ts src/modules/agentes/nivel-aprovacao.test.ts src/modules/agentes/executar.test.ts` — verde: 87 de 87
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — suíte inteira; resumo cortado pelo limite de saída do terminal
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes src/jobs src/worker` — 373 de 373
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso src/modules/avisos src/modules/dados-pessoais src/modules/demandas src/modules/especificacoes src/modules/historico src/modules/limites src/modules/pacotes-decisao src/modules/pareceres-risco src/modules/pedido-construcao src/modules/retencao src/modules/versoes` — 1ª vez: 2 falharam (testes antigos da regra anterior); 2ª vez: 1.019 de 1.019
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app src/components src/agents src/proxy src/instrumentation src/vendor` — 1ª vez: 5 falharam (testes de prompt da regra anterior); 2ª vez: 1.205 de 1.205
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test src/lib src/db` — o filtro `test` casou com a suíte inteira; resumo cortado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/ src/lib/ src/db/` — 1.017 de 1.017 (rodado duas vezes, a 2ª depois da mudança no seed)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD --name-only -- scripts vitest.config.ts`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/` — 1ª vez: 8 falharam (seed com o schema antigo); 2ª vez: 79 de 79
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — limpo, Next.js 16.4.1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 1; foi para segundo plano depois de 180 s, e a saída ficou em arquivo em `/tmp`, que não li
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts` — 6 de 6 falharam
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/pacote-decisao.spec.ts` — 2 de 3; o primeiro falhou no axe ("Execution context was destroyed")

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [ ] só mudaram os arquivos da tarefa (as mudanças estão todas dentro da tarefa, mas faltam as duas specs de `e2e/`, que estão fora da minha lista **Pode**)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
