---
pedido: DEC-DEM-20261022-0001-v1
etapa: 08-correcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, 08-maestro.md, liberação do maestro (mensagem desta volta), package.json, pnpm-lock.yaml, decidir.ts, decidir-bordas.test.ts, decidir.test.ts, consultas.ts (pacotes-decisao), desatualizado.ts, criar.ts (pacotes-decisao), schemas.ts (pacotes-decisao), gerar.ts, gerar.test.ts, gerar-bordas.test.ts, dados-do-pedido.ts, dados-do-pedido.test.ts, dados-da-decisao.ts, page.tsx (pacotes-decisao/[decId]), FormularioDecisao.tsx, schemas.ts (agentes), executar.ts, executar.test.ts, consolidacao.ts, comum.ts, prompts.test.ts, prompts.bordas.test.ts, bloqueio-verificacao.ts, limites.ts, decisao.ts (db/schema), route.ts (demandas/[id]/pacotes-decisao), log.ts, proxy.ts, proxy.test.ts, next.config.ts, seed-ficticio.ts, scripts.test.ts, projeto.test.ts, playwright.config.ts, e2e/servidor.ts, e2e/decisao.spec.ts, e2e/pedido-construcao.spec.ts, e2e/fila.spec.ts, e2e/fila-qa.spec.ts, e2e/axe-todas.spec.ts, test-results/*/error-context.md (gerados pelas corridas desta etapa)]
status: bloqueado
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

Esta é a segunda volta da 08-correcao. A primeira parte (S-01 e A-01 a A-04) já está commitada. Nesta volta adaptei
`e2e/decisao.spec.ts` e `e2e/pedido-construcao.spec.ts` a A-02 e A-04, como a liberação pediu, e acrescentei ao seed as
demandas próprias desses testes.

Resultado: `pnpm test` passou com 3.694 de 3.694, e `pnpm lint` e `pnpm typecheck` passaram limpos. **A suíte
`pnpm test:e2e` não ficou verde**, por dois motivos, descritos em Pendências:

1. `e2e/axe-todas.spec.ts:275` também espera o DEC de agente do seed como "Só o CTO" (A-04), e esse arquivo não está
   na liberação.
2. Com o Next 16.4.1 da S-01, o `next dev` do e2e às vezes recarrega a página sozinho no meio do teste. Na comparação
   direta com o 16.3.8, a mesma spec passou no 16.3.8 e falhou no 16.4.1.

### O que mudou nesta volta

- `scripts/seed-ficticio.ts`: o seed passa a criar mais cinco demandas fictícias, as `TITULOS_DO_E2E`. Uma é da dupla
  aprovação da `decisao.spec` e quatro são da `pedido-construcao.spec`: três de tipo `novo_projeto` e uma de tipo
  `estudo`.
  - Todas nascem com contexto, sem ESP, RSK nem DEC, em Nova e pela conta cto.
  - `TOTAL_DEMANDAS_DO_SEED` passa a ser 10.
  - `conferirLimite` não mudou, e não há variável nem exceção por conta de teste (regra da `06-T43-revisao`).
- `scripts/scripts.test.ts`:
  - as contagens de "5 demandas" passaram a `TOTAL_DEMANDAS_DO_SEED`, e o teste dos tipos virou `distinct`;
  - teste novo das demandas do e2e: um título por demanda, sem versão, em Nova, pela conta cto, com tipo `estudo` só
    na do Estudo e contexto preenchido.
- `e2e/decisao.spec.ts` (nenhuma asserção removida nem afrouxada):
  - P1-b: a conta cto cria um DEC de pessoa de nível `cto`, e a administradora abre esse DEC;
  - dupla aprovação: usa a demanda própria do seed, com ESP, RSK e DEC criados pela API;
  - o cabeçalho explica a mudança.
- `e2e/pedido-construcao.spec.ts`: cada um dos quatro testes acha a sua demanda pelo título. As asserções não mudaram
  e o cabeçalho C-36 foi atualizado: continua 0 demanda e 12 versões na conta cto.
- `pnpm-lock.yaml` mudou em relação ao commit, por causa da comparação com o Next 16.3.8, que reinstalou as
  dependências. O lockfile commitado ainda deixava o better-auth 1.7.7 e o `eslint-plugin-react-hooks` usando o
  **zod 4.6.5** (a versão vulnerável da S-01) como dependência transitiva. O novo resolve tudo para o zod 4.6.6. Mantive
  o novo; o `package.json` está igual ao commitado.

### Testes vistos falhando antes do código

- O teste novo das demandas do e2e em `scripts/scripts.test.ts` falhou com "Dupla aprovação do pacote (fictício):
  expected '' not to be ''" antes de o contexto entrar no seed. Depois passou com 33 de 33.
- A primeira versão das demandas do seed, sem contexto, fez o `pedido-construcao.spec` falhar no validarPedido com
  "demanda.descricao vazio". Foi esse erro que levou ao teste acima.

### e2e: o que rodou e o resultado

A suíte inteira sempre vai para segundo plano depois de 180 s, mesmo com `timeout` de 600000, e a saída fica em
`/tmp`, que não li. Por isso rodei em grupos, um de cada vez:

| Corrida | Next | Resultado |
|---|---|---|
| suíte inteira | 16.4.1 | código 1, em segundo plano; os testes 1 a 5 de `agentes-teto` falharam ainda na parte visível |
| `agentes-teto` | 16.4.1 | 2 de 7; os outros 5 falharam com recarga da página ("Execution context was destroyed" e "4 × navigated") |
| `agentes-teto` | **16.3.8** | **7 de 7** |
| `agentes-teto` | 16.4.1, com o proxy fora de `/_next/webpack-hmr` | 7 de 7 |
| `decisao` + `pedido-construcao` | 16.4.1 | `decisao` 6 de 6; `pedido-construcao` 2 de 4 ("demanda.descricao vazio", corrigido no seed) |
| `pedido-construcao` | 16.4.1 | 0 de 4, com recarga da página |
| `pedido-construcao` (de novo) | 16.4.1 | **4 de 4** |
| `agentes-teto` + `autenticacao-qa` + `configurar-2fa` | 16.4.1 | **13 de 13** |
| `axe-todas` | 16.4.1 | 11 de 12; o T11 falhou por A-04 (Pendências) |
| `decisao` + `demanda-formularios-qa` + `detalhe-demanda` | 16.4.1 | `decisao` 0 de 6, com recarga da página; foi para segundo plano e saiu com código 1 |

Não rodaram nesta volta, depois das mudanças: `editar-demanda`, `entrar`, `especificacao`, `especificacao-qa`, `fila`,
`fila-qa`, `moldura`, `nova-demanda`, `pacote-decisao`, `parecer-risco`, `parecer-risco-qa`, `seguranca` e
`seguranca-qa`. Também não terminaram à vista `demanda-formularios-qa` e `detalhe-demanda`.

## Decisões tomadas

- As demandas próprias vêm do seed, como a liberação pede (C-36). Elas não gastam o limite de demanda do e2e.
- Na dupla aprovação, a ESP e o RSK são criados pela API (2 versões a mais na conta cto), e não no seed. Assim o DEC
  não cita rascunho de agente nem exige a confirmação de revisão, que mudaria o fluxo que o teste confere. O P1-b soma
  1 versão.
- Testei a hipótese de o proxy (`src/proxy.ts`) atrapalhar a conexão de recarga do `next dev` no 16.4.1. Tirei
  `/_next/webpack-hmr` do matcher, com teste, e o `agentes-teto` passou. Mas duas corridas depois a recarga voltou em
  `pedido-construcao` e `decisao`. Como não resolveu, **desfiz a mudança e o teste dela**: o `proxy.ts` e o
  `proxy.test.ts` estão iguais ao commit, e o C-19 ficou sem alteração.
- Voltei o Next para 16.3.8 só para comparar, com `pnpm install`, e voltei para 16.4.1 em seguida. O `package.json`
  final é o commitado.
- Para ver o resumo do `pnpm test` (o log do pino passa do limite do terminal), li o arquivo de saída que a ferramenta
  gravou em `~/.claude/projects/…/tool-results/`, que não fica em `/tmp`. Para ver por que o e2e falhou, li o
  `error-context.md` de `test-results/`, que as próprias corridas desta etapa criaram.

## Pendências

- Bloqueado: o `pnpm test:e2e` não fica verde por dois motivos fora da minha liberação. (1) `e2e/axe-todas.spec.ts:275` espera "Este pacote exige só a aprovação do CTO." no DEC de agente do seed, que pela A-04 nasce "CTO e administradora". (2) Com o Next 16.4.1, o `next dev` do e2e recarrega a página sozinho de forma intermitente, e com o 16.3.8 a mesma spec passou. Preciso de liberação para `e2e/axe-todas.spec.ts` e de uma decisão do `tech-lead` ou do `devops-sre` sobre o servidor do e2e.
  - **(1) `e2e/axe-todas.spec.ts`, teste T11, linhas 273 a 276.** A spec não grava nada (C-36), então a administradora
    abre o DEC de agente do seed, que agora é de dupla aprovação, e vê o formulário dela. A troca que proponho mantém o
    axe na conta administradora: conferir o que ela vê nesse nível, ou seja, o botão "Registrar decisão" e o nível "CTO
    e administradora" na revisão, no lugar da frase "só a aprovação do CTO". Essa frase já é conferida no P1-b da
    `decisao.spec`. O cabeçalho da spec também cita o DEC de agente do seed.
  - **(2) Recarga intermitente no Next 16.4.1.** A evidência está na tabela da Entrega: a mesma spec passou 7 de 7 no
    16.3.8 e 2 de 7 no 16.4.1, sem nenhuma outra mudança. A falha aparece e some entre corridas iguais, em qualquer
    spec. É o `next dev` mandando a página recarregar (o Playwright registra "N × navigated to" a mesma URL), e não as
    regras desta correção.
  - Caminhos possíveis, e nenhum está na minha lista **Pode**:
    - subir o e2e com `next build` e `next start` em vez de `next dev`, em `e2e/servidor.ts`, o que também fica mais
      perto da homologação;
    - testar outra versão 16.4.x ≥16.4.1 que não tenha o problema;
    - aceitar o e2e só em `next start` no CI da 09.
  - Voltar para 16.3.8 não serve, porque reabre a S-01.
  - Depois da decisão, rodar a suíte inteira até o fim.
- Para o reteste (08-reteste): `pnpm audit --prod --audit-level high` com o lockfile novo. O commitado ainda tinha o zod
  4.6.5 transitivo, ver a Entrega.
- Docs, fora da minha lista **Pode**:
  - RNF-01 e registro do pedido: atualizar a versão do Next, de 16.3.8 para 16.4.1;
  - padrão técnico: atualizar, se ele fixar o 16.3.8, e também as versões do better-auth (1.7.7) e do Zod (4.6.6);
  - `bloqueio-verificacao.ts:5`: o comentário ainda cita "Better Auth 1.7.6".
- Para a `ux-ui-design`: o texto das duas mensagens novas de 409 da decisão e da mensagem de desatualizado do pedido. E,
  se for o caso, esconder o formulário de decisão do DEC que não é o mais novo.

## Comandos executados

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/` — 80 de 80, com as 5 demandas novas no seed
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3.694 de 3.694 (191 arquivos)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 1; foi para segundo plano depois de 180 s; saída em `/tmp`, não lida
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts` — 2 de 7 (Next 16.4.1)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas install` — Next 16.3.8, só para a comparação
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts` — 7 de 7 (Next 16.3.8)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/proxy.test.ts` — o pnpm reinstalou o Next 16.4.1; 1 falhou (teste novo do matcher, vermelho antes da mudança, depois desfeita)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts` — 7 de 7 (Next 16.4.1, com o matcher alterado, depois desfeito)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/pedido-construcao.spec.ts` — 8 de 10
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — vermelho: 1 falhou (contexto vazio)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — verde: 33 de 33
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/pedido-construcao.spec.ts` — 0 de 4 (recarga da página)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/pedido-construcao.spec.ts` — 4 de 4
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts e2e/autenticacao-qa.spec.ts e2e/configurar-2fa.spec.ts` — 13 de 13
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/axe-todas.spec.ts` — 11 de 12
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/demanda-formularios-qa.spec.ts e2e/detalhe-demanda.spec.ts` — `decisao` 0 de 6 (recarga da página); foi para segundo plano e saiu com código 1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff pnpm-lock.yaml`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3.694 de 3.694, depois de desfazer o matcher
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [ ] só mudaram os arquivos da tarefa (os desta volta estão na liberação, mas a e2e ainda precisa de `e2e/axe-todas.spec.ts`, que está fora dela)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
