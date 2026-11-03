---
pedido: DEC-DEM-20261103-0008-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, "git log", "git show 1bc3feb (stat)", "git diff 75a2b0f f730450 (código e testes)", src/app/api/vistas-para-agente.test.ts, src/app/api/demandas/demandas.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/modules/demandas/consultas.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/acesso/ator.ts, playwright.config.ts, package.json, e2e/apoio.ts]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da correção `f730450` (M-1, M-2, M-3 e B-1 da revisão do 0007) no ramo `construcao/DEC-DEM-20261103-0008-v1`.
A correção está certa nos quatro itens; nada volta ao engenheiro. Acrescentei 13 testes que fecham bordas que a 03 não
cobria.

### Critério de aceite → teste que o cobre

| Critério (pedido.json) | Teste |
|---|---|
| Ator agente recebe o texto livre da demanda minimizado na **leitura**; a pessoa recebe o original | `src/app/api/demandas/demandas.test.ts`, bloco `M-1: texto livre da demanda minimizado para quem não é pessoa`: "GET /api/demandas/:id com token de agente: os seis campos minimizados; nada dos quatro valores no corpo" e "GET /api/demandas/:id com a pessoa: o texto original, sem marcador" (03) |
| Idem na **criação** | mesmo bloco: "POST /api/demandas: o 201 do orquestrador sai minimizado; o da pessoa, original" (03) |
| Idem na **listagem** | mesmo bloco: "GET /api/demandas: título minimizado só para o agente, com o nome do próprio solicitante; sem solicitanteNome nos dois" (03) e **"04-regressao: na listagem, o item do agente tem as mesmas chaves e valores do da pessoa, menos o título"** (novo) |
| Idem: nulo segue `null`; ator `sistema` minimizado | mesmo bloco: "campo nulo segue null para o agente, sem sumir a chave" e "vistaDaDemandaPara: o ator sistema recebe o texto minimizado; a pessoa, a mesma vista" (03) |
| Ator agente não recebe nome de pessoa nem `referenciaDocumento` nas leituras de ESP, RSK e DEC; a pessoa recebe | `src/app/api/vistas-para-agente.test.ts`, bloco `M-2: leituras de ESP, RSK e DEC para quem não é pessoa` (4 testes da 03, nas sete rotas) e bloco novo **`M-2 (04-regressao): o agente recebe a vista da pessoa só com os cortes, nada a mais nem a menos`** (5 testes) |
| Error sem `digest` no console saneado vai ao Sentry sem duplicar o que o `onRequestError` manda | `src/lib/console-saneado.test.ts`, bloco `M-3: console.error de Error sem digest vai ao Sentry` (4 testes da 03: um envelope sem mensagem nem texto solto; com `digest`, inclusive `NEXT_REDIRECT`, nenhum envelope; `console.warn` sem envelope; Sentry que lança não entra em laço nem cai no console original) |
| (B-1) `onRequestError` grava o erro reduzido | `src/instrumentation.test.ts`: "B-1 (0008): objeto simples com query e params vira o erro reduzido, sem query, params nem os valores" (03) |
| A suíte e2e passa três vezes seguidas | `pnpm test:e2e` três vezes, cada uma com Postgres novo do Testcontainers (`e2e/servidor.ts`): **143 de 143 nas três, 0 pulado, 0 falho** (6,4 min, 6,2 min, 5,3 min) |

### Teste que reproduz o defeito da `01-qa-funcional.md`

Os quatro defeitos têm teste que falharia antes da correção, com os dados fictícios da 01 (`Maria Ficticia Teste`,
`maria.teste@exemplo.invalid`, `123.456.789-09`, `(11) 90000-0000`, `Joana Exemplo Silva`, `ATA-FICTICIA-001`,
`Carlos Exemplo CTO`). A 03 registrou o vermelho de cada um (M-1: 4 falharam; B-1: 1; M-2: 1; M-3: 2). Os testes que
acrescentei também falham no código da 0.1.6: o de chaves do M-2 compara a vista do agente com a da pessoa já cortada,
e na 0.1.6 o `autor` saía com `nome`.

### Testes acrescentados nesta etapa (13)

1. `src/app/api/vistas-para-agente.test.ts`, bloco `M-2 (04-regressao): …` (5 testes):
   - "autoria pessoa: nas sete rotas, leitura do agente = leitura da pessoa com os cortes do M-2" e o mesmo para
     "autoria agente": a vista do agente é **igual** à da pessoa com só os três cortes (autor de pessoa só pelo tipo,
     aprovador sem `nome` e `referenciaDocumento`, decisão sem `decididaPor`). Prova que a montagem chave a chave não
     perdeu campo que o agente lia na 0.1.6 (`demandaTitulo`, `especificacaoCitada`, `niveisRisco`, `desatualizado`,
     `versaoMaisNova`, `especificacaoMaisNova`…) e que nada sobra. Cobre as sete rotas, item a item nas listas.
   - "lista de permissão: o ator sistema recebe a mesma vista mínima do agente nas três funções".
   - "conta de autor e de quem decidiu sem nome (nulo): o agente segue com { tipo: pessoa } e sem decididaPor"
     (caso exploratório 7 da 01).
   - "a pessoa recebe a própria vista, sem cópia nem corte, nas três funções" (risco do RSK: cortar também para a
     pessoa).
2. `src/app/api/demandas/demandas.test.ts`, bloco M-1 (1 teste): "04-regressao: na listagem, o item do agente tem as
   mesmas chaves e valores do da pessoa, menos o título", incluindo `total`, `limit` e `offset` iguais.
3. `src/modules/dados-pessoais/minimizar.test.ts`, bloco novo `minimizarValor: a regra única da entrada do agente e da
   vista da API (M-1 do 0008)` (7 testes): texto igual a `minimizar` com os nomes; lista aninhada; nulo, número,
   booleano e indefinido intactos; sem nome só os detectores; nome de outro solicitante não troca (caso 3 da 01);
   nome com menos de 3 letras não troca e espaço duplo ou caixa diferente troca (caso 2 da 01); idempotência.

### E2E e contrato novo

Nenhum spec do `e2e/` lê a API com token de agente: todas as chamadas passam pela sessão da página (`e2e/apoio.ts`,
`api()` e `entrarComo()`). Nenhum spec precisou mudar para o contrato novo, e nenhum foi alterado.

### Resultado

- `pnpm test`: **196 arquivos, 3907 de 3907** (3894 da 03 + 13 desta etapa).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `pnpm test:e2e`: **143 de 143, três vezes seguidas**, 0 pulado.

### Conferência com `git diff` (o que mudou nos testes)

- Desta etapa: só acréscimos em três arquivos `*.test.ts` (136 linhas a mais; as 2 removidas são as linhas de import
  trocadas por outras com um nome a mais). Nenhum teste apagado, nenhum `.skip`, `.only` ou `.todo`.
- Da 03 (`75a2b0f..f730450`): a única asserção existente alterada é a de `pareceres.test.ts` (lista de RSK lida pelo
  token `consolidacao`), que passou de `{ tipo: 'pessoa', nome: expect.any(String) }` para `{ tipo: 'pessoa' }`
  exato: ficou mais estrita, e a da pessoa continua com `nome`. `test/estatico/projeto.test.ts` só trocou 0.1.6 por
  0.1.7. O resto da 03 são acréscimos.

## Decisões tomadas

- Os testes de M-2 comparam a vista do agente com a vista da pessoa cortada, em vez de listar chaves: um campo perdido ou sobrando em qualquer das sete rotas aparece no diff, sem manter uma segunda lista de chaves no teste.
- O teste novo de listagem cria a própria demanda com a conta do bloco M-1 (`cookieM1`), para não depender da ordem dos outros testes nem gastar o limite (C-36) da conta `cookieCto`; e compara os itens pelo id, não pela posição.
- O caso de conta sem nome (exploratório 7) foi testado pela função `...Para` com a vista lida da API e o `nome` trocado por `null`: o app não apaga conta, e montar isso no banco mexeria na tabela `user` sem ganho para a regra.
- Não refiz o vermelho do M-3 e do B-1: a 03 mostrou a falha antes do código e os testes estão como a 02 pediu; conferi o diff do teste contra o código.
- As três rodadas do e2e rodaram em série, sem a suíte de unidade em paralelo, para que lentidão de CPU não virasse falha intermitente no resultado.

## Pendências

- Segue da 02 e da 03 (achado novo, fora deste pedido, precisa do aceite de Fabiano): o DEC ainda devolve ao agente `demandaTitulo`, `demandaDescricao` e `decisao.comentarios` sem minimizar, e o texto livre de ESP e RSK também sai cru. O teste novo do M-2 fixa o contrato **atual**; se esse achado entrar num pedido futuro, a função `comOsCortesDoM2` do teste passa a minimizar esses campos também.
- Segue da 02 o risco do M-3 para a P3: a prova é de unidade. Não está confirmado no runtime do Next 16 que `uncaughtException`, `unhandledRejection` e o `onError` do `after()` passam por `console.error`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — f730450 no topo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada 1: 143 de 143, 0 pulado (6,4 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 75a2b0f f7304502b254554e85f92b322e09cd31e06b8768` — 28 arquivos da cadeia
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 75a2b0f f7304502b254554e85f92b322e09cd31e06b8768 -- src/app/api/demandas/demandas.test.ts src/app/api/pareceres-risco/pareceres.test.ts src/instrumentation.test.ts src/lib/console-saneado.test.ts test/estatico/projeto.test.ts` — sem teste apagado, sem `.skip`/`.only`/`.todo`; asserção do pareceres mais estrita
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 1bc3feb` — só o passagens.jsonl
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 75a2b0f f7304502b254554e85f92b322e09cd31e06b8768 -- src/modules src/lib/console-saneado.ts src/instrumentation.ts src/app/api/demandas/route.ts src/app/api/pacotes-decisao/route.ts` — leitura do código corrigido
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/vistas-para-agente.test.ts src/modules/dados-pessoais/minimizar.test.ts src/app/api/demandas/demandas.test.ts` — 127 de 127 em 3 arquivos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada 2: 143 de 143, 0 pulado (6,2 min)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada 3: 143 de 143, 0 pulado (5,3 min)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3907 de 3907 em 196 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 3 arquivos `*.test.ts`, 136 linhas a mais e 2 a menos

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
