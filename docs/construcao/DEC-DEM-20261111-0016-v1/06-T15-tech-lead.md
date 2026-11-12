---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T15-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T15, T18 a T20, V-01 e cobertura), 05-tech-lead.md, 06-T14-tech-lead.md (cabeçalho e conferência), 06-T15-engenheiro-backend.md, diff do commit 85d7b94, scripts/seed-ficticio.ts (linhas 255 a 460), scripts/scripts.test.ts (linhas 340 a 580), scripts/seed-integracoes.test.ts, src/modules/limites.ts, src/modules/pedido-construcao/receber.ts, e2e/apoio.ts, e2e/preparacao.ts, e2e/fila-contadores.spec.ts, e2e/fila.spec.ts, e2e/fila-qa.spec.ts, e2e/axe-todas.spec.ts, e2e/decisao.spec.ts (linhas 1 a 140), a saída do pnpm test]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T15: seed fictício com as demandas do Awave e os pedidos para o /construir. Commit
`85d7b945ffd27cca823acc736ebd80e1034d4e53`. Mudaram só os três arquivos da tarefa: `scripts/seed-ficticio.ts`,
`scripts/scripts.test.ts` (pela G5) e `scripts/seed-integracoes.test.ts` (novo). Entraram também a entrega do engenheiro
e o `passagens.jsonl` do maestro. Nada mudou em `src/`, `drizzle/`, `e2e/` ou `test/`.

**Resultado: aprovada. Não há problema Critical nem Important. Aceitei os três desvios do plano. Os quatro achados Minor
estão abaixo e em Pendências.**

### Conferência refeita nesta revisão

| O que | Resultado |
|---|---|
| Arquivos do commit fora de `scripts/` e da pasta do pedido | nenhum (`diff --stat` de `src drizzle e2e test` vazio) |
| G4: superfícies congeladas, `src/lib/rota.ts` e `src/lib/log.ts`, de a9fd9b8 até 85d7b94 | diff vazio |
| `scripts/seed-integracoes.test.ts` e `scripts/scripts.test.ts` | 2 de 2 arquivos, 60 de 60 testes; o log do seed diz `quantidade: 28` |
| `test/estatico` (todos os testes estáticos que importam o seed: `sem-controle-bidi`, `leituras-da-fila`, `dados-das-etapas`, `capturas-qa` e o piso de asserções) | 35 de 35 arquivos, 843 de 843 testes |
| `pnpm typecheck` e `pnpm lint` | limpos |
| `git status --short` | árvore limpa |

Não rodei a suíte inteira. O commit só toca `scripts/`, e todos os importadores do seed estão nas duas rodadas acima.
O engenheiro registrou 281 de 281 arquivos e 6230 de 6230 testes.

### 1. Nenhuma asserção saiu de `scripts/scripts.test.ts`

O diff tem 7 linhas `expect(` removidas e 8 adicionadas. Toda linha removida voltou com outro valor, e há uma nova:

| Linha (depois) | Antes → depois | Leitura |
|---|---|---|
| 370 | `toBe(23)` → `toBe(28)` | contagem |
| 419 | `new Set(titulos)` → `new Set(todos)` | **mais forte**: a unicidade passa a valer para os 23 títulos, e não só para os 18 |
| 464 | — → `expect(todos).toHaveLength(23)` | asserção nova |
| 567 | `[TOTAL, 3, 3, 3, 1]` → `[TOTAL, 5, 5, 5, 3]` | contagem (2 ESP, 2 RSK, 2 DEC e 2 aprovações a mais) |
| 854 | `decIds` 3 → 5 | contagem; as asserções de aviso e job por DEC continuam |
| 1054 | `demandas: TOTAL` → `TOTAL - 5` | contagem (ver Minor 3) |
| 1077 e 1078 | DEC 3 → 5, aprovação 1 → 3 | contagem |

O teste das demandas do e2e (linhas 414 a 469) tira as cinco da T15 de `titulos` por `DA_T15`. As 18 de antes passam
pelas mesmas asserções de antes: título, status, autoria `pessoa` da `sem2fa`, versões e contexto. As cinco novas têm
autoria e versões próprias e são conferidas por igualdade em `seed-integracoes.test.ts`. Por isso o filtro não abre
buraco. `doSeedPor(cto) = 5` continua valendo: a "cto" não é autora de nenhuma das cinco, porque decidir, gerar o pedido e
encerrar não contam como autoria.

### 2. Nenhum dado pessoal real nem token real

- Os títulos novos terminam em "(fictício)". O solicitante dos dois pedidos é "Pessoa Ficticia Produto". Nas três do
  Awave, o solicitante é "Awave", nome do produto e não de pessoa (spec 7.2). Descrição e contexto são inventados. Não
  há e-mail novo nem conta nova.
- Não há token. `AWAVE_DO_SEED` e `CONSTRUIR_DO_SEED` (`scripts/seed-ficticio.ts:347-348`) usam o prefixo `ficticio`,
  que fica fora do formato `wsod_` e não aponta para nenhuma linha de `token_servico`. O teste confere `token_servico`
  vazio, nenhum `wsod_` no log nem nos eventos, e `ficticio` como único prefixo gravado (`seed-integracoes.test.ts:202-210`).
- `sem-controle-bidi.test.ts` passa: os títulos novos não têm caractere de direção.
- Já estavam no seed antes da T15 e não mudaram: "Carla Santos Ficticia" e `wsssistemas2626-crypto/painel-ficticio`.

### 3. Impacto nos e2e que contam demandas

Nenhum e2e de hoje fixa o total de demandas. Todos contam pela própria API ou exigem um piso. Verifiquei estes:

| Onde | O que faz | Com 28 |
|---|---|---|
| `fila-contadores.spec.ts:136` (CA-06.3) | exige mais de 20 | continua verdade |
| `fila-contadores.spec.ts:29-48, 178-190, 262-299` | compara a tela com o total da API | sem impacto |
| `fila-contadores.spec.ts:150-176` (CA-07.1) | lê as 8 primeiras pela API e confere cartão a cartão | no banco novo, as 5 da T15 são as mais novas: 3 do Awave (urgência e linha nulas, como as 18 do e2e) e 2 pedidos. Passa hoje. Ver a pendência da T16 |
| `fila.spec.ts:102-104` (paginação) | cria demandas pela "cto" até passar de 20 | com 28, não cria nenhuma (a "cto" gasta menos do C-36) |
| `fila.spec.ts:33-37` e `axe-todas.spec.ts:141-145` | exigem 0 em `entregue` + `produto_proprio` + `indefinida` | as cinco são `melhoria`: sem impacto |
| `axe-todas.spec.ts:40-54` (`demandaDoSeed` local, sem paginar, `tipo=melhoria&limit=100`) | procura o título na primeira página | o banco novo ganha 5 de melhoria e continua bem abaixo de 100. O risco numa homologação reaproveitada já existia antes da T15 |
| `decisao.spec.ts:115-122` (DEC de rascunho pendente) | procura o pendente de agente | os dois DECs novos são de pessoa e estão aprovados, então não entram na fila de pendentes |
| Limite C-36 e D2 (`src/modules/limites.ts`) | 30 demandas e 60 versões por hora por autor; Awave 10 | `sem2fa` com 20/30 demandas e 9/60 versões; a "cto" não é autora de nada novo; o Awave começa com 3/10 |

### Achados (Minor; não bloqueiam)

1. **`e2e/fila-contadores.spec.ts:4`**: o comentário diz "23 no banco novo". **Problema:** agora são 28. **Razão:** é só
   comentário e nenhuma asserção usa o número, mas engana quem for ajustar a página 2. `e2e/` não está na lista Pode do
   backend, por isso a correção fica com quem tocar o arquivo: T16 ou T20, do `engenheiro-frontend`.
2. **`scripts/seed-ficticio.ts:450` (com `:303`)**: os DECs dos dois pedidos herdam o `resumoExecutivo` de `DEC_DO_E2E`,
   que diz "exige as duas aprovações". O nível, porém, é `cto`. **Problema:** a tela T11 desses dois DECs mostra um texto
   que contradiz o nível. **Razão:** o plano mandou esse spread, e nenhum teste lê o texto. Mesmo assim, a T19 abre a T11
   do `pedidoRecebido` e a 07 vai ver a contradição. Basta um `resumoExecutivo` próprio para os pedidos, que é mudança em
   `scripts/` e cabe ao `engenheiro-backend`. Se a 07 apontar, a 08 corrige.
3. **`scripts/scripts.test.ts:1054`**: o 5 de `TOTAL_DEMANDAS_DO_SEED - 5` está escrito à mão. **Problema:** o número é o
   tamanho de `DEMANDAS_DO_AWAVE + DEMANDAS_DOS_PEDIDOS`, repetido no teste. **Razão:** se as integrações ganharem uma
   demanda, o teste quebra com uma mensagem que não aponta a causa. Exportar a contagem do seed resolve, por exemplo
   `DEMANDAS_DAS_INTEGRACOES`. A contagem está certa hoje.
4. **`scripts/seed-ficticio.ts:326-338`** repete o formato de `:264-282`: `melhoria`, "Pessoa Ficticia Produto",
   `produto` e `sob_medida`. **Problema:** são duas cópias do mesmo molde de demanda do e2e. **Razão:** se uma mudar, a
   outra se afasta sem aviso. Um ajudante `demandaDoE2E(titulo, contexto)` serviria às duas. É pequeno e não bloqueia.

### Desvios do plano (aceitos)

- O teste da falha no meio das integrações é teste de guarda. A mudança da linha 1054 tirou a cobertura de atomicidade
  da parte nova, e este teste a devolve. Ele também prova pela transação que a falha veio depois do dado novo
  (`{ do_awave: 3, gerados: 1 }`).
- O teste com o insumo técnico ligado tem controle positivo. Com os agentes desligados, "nenhuma execução para o Awave"
  passaria sem provar nada.
- `confirmacaoDoPedidoSchema.parse(...)` no lugar do objeto literal: o valor é o mesmo e passa pelo Zod, como os outros
  serviços do seed.

### Checklist da seção 12

- [x] A tarefa faz o que o plano pede: os cinco títulos exatos, a ordem dos atos do passo 3, o prefixo `ficticio` e o
  cabeçalho com o limite 3/10. Os dois testes a mais têm razão escrita. Nenhum arquivo fora da tarefa mudou.
- [x] Há teste para cada comportamento novo: 11 dos 12 testes foram vistos falhando antes do código, e o 12º está
  justificado como teste de guarda.
- [x] Não há segredo, valor de `.env` nem dado pessoal real (item 2).
- [x] Entrada validada com Zod: o seed passa cada entrada pelo schema do serviço. Não há rota nova.
- [x] Banco: não há migration, e o dado vai pelos serviços dentro da transação do seed.
- [x] Duplicação: não há função duplicada. A repetição de molde de dados está no Minor 4.
- [x] Tela: não há tela tocada, e o axe fica com a T16 a T20.
- [x] Os Minor estão em Pendências. Não há Critical nem Important.
- [x] PR: fora desta etapa (`/code-review` e `/security-review` ficam com a 08).

## Decisões tomadas

- Aprovada sem devolver: os quatro achados são Minor e nenhum muda comportamento nem cobertura.
- Aceitei o filtro `DA_T15` no teste das demandas do e2e: as 18 de antes seguem com as mesmas asserções, e as cinco novas
  são conferidas por igualdade exata no arquivo próprio.
- Não rodei a suíte inteira: o commit só toca `scripts/`, e todos os importadores do seed (os dois testes de `scripts/` e
  os 35 arquivos de `test/estatico`) rodaram verdes nesta revisão.
- O impacto nos e2e foi lido no código e não executado, porque `pnpm test:e2e` não está na minha lista Pode. Nenhum
  e2e de hoje fixa o total.

## Pendências

- Nenhuma bloqueia a T15.
- Para a `06-T15-testes` (qa-automacao): os Minor 3 e 4, se quiser cobri-los. Também uma conferência de que o log do seed
  não leva o título de nenhuma demanda das integrações, porque hoje o log só tem `quantidade`.
- Para a T16 (`engenheiro-frontend`):
  - o comentário "23 no banco novo" em `e2e/fila-contadores.spec.ts:4` (Minor 1);
  - o CA-07.1 (`fila-contadores.spec.ts:170`) confere a lista `dt` dos cartões. Quando a T16 puser "Origem" no cartão,
    essa lista muda pela G5. No banco novo, os 8 primeiros cartões já incluem os 3 do Awave, e o teste vai exercitá-los.
- Para a T18: as três do Awave estão em `nova`, `nova` e `encerrada`, sem `demanda_confirmada`. O teste de
  "confirmar" consome a `awaveConfirmar`, e o pulo "exige banco recém-semeado" do plano cobre a repetição.
- Para a T19: Minor 2 (texto do `resumoExecutivo` dos DECs dos pedidos). O DEC do `pedidoRecebido` é o único da
  demanda, então `pacotesDecisao[0]` é ele.
- Para a T20:
  - o Awave começa com 3 das 10 demandas da hora. O CA-09.1 cria 1 e fica em 4. Um teste que conte até o 429 parte de 3,
    e não de 0;
  - o CP-7 do plano já procura o DEC por `includes`, e não exige lista de um item só, o que está certo.
- Para a 09 (V-01): a frase "uma segunda execução lista 0 pendentes" só vale numa homologação recém-semeada, antes de
  qualquer e2e. No banco recém-semeado, `listarPendentes` é exatamente o DEC do `pedidoParaBuscar`
  (`seed-integracoes.test.ts:178`). Pela leitura do engenheiro, o `pedido-construcao.spec` gera pedidos que entram na
  lista de pendentes. Se a V-01 rodar depois do `homologar`, que roda o e2e na mesma homologação, ela deve conferir a
  saída e a ausência do DEC do `pedidoParaBuscar`, e não o total 0. A outra saída é rodar a V-01 numa subida nova.
- Para a `10-documentacao`: o seed da homologação passa a ter 28 demandas, 3 do Awave, 2 pedidos (um a buscar e um
  recebido) e nenhum token.
- Herdada, sem mudança: `chamadasDoAwave` em `test/integracoes.ts` (parecer 1 da 06-T13-revisao), para a T20 ou a 08.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 85d7b945ffd27cca823acc736ebd80e1034d4e53~1 85d7b945ffd27cca823acc736ebd80e1034d4e53` — 5 arquivos: a entrega, o `passagens.jsonl` e os três de `scripts/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 85d7b945ffd27cca823acc736ebd80e1034d4e53~1 85d7b945ffd27cca823acc736ebd80e1034d4e53 -- scripts/scripts.test.ts scripts/seed-ficticio.ts` — 7 linhas `expect(` removidas e 8 adicionadas, todas de contagem, mais uma nova
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- e2e` — lista dos 47 arquivos de `e2e/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S pendentes --format=%h --name-only -- e2e` — `decisao.spec.ts` e `axe-todas.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat=200 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md docs/construcao/DEC-DEM-20261111-0016-v1` — tamanho do plano (2702 linhas) e entregas do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S C-36 --format=%h --name-only -- src` — o limite fica em `src/modules/limites.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S TOTAL_DEMANDAS_DO_SEED --format=%h --name-only -- e2e test src` — nenhum e2e nem teste fora de `scripts/` usa o total
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "23 no banco" --format=%h --name-only -- e2e` — só o comentário de `fila-contadores.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "statusDecisao=aprovada" --format=%h --name-only -- e2e src/app` — nenhum e2e
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "/api/pacotes-decisao?" --format=%h --name-only -- e2e` — só `decisao.spec.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "status=aprovada" --format=%h --name-only -- e2e` — nenhum
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "status=encerrada" --format=%h --name-only -- e2e` — só `fila-contadores.spec.ts`, que só navega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes.test.ts scripts/scripts.test.ts` — 2 de 2 arquivos, 60 de 60 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S seed-ficticio --format=%h --name-only -- test src scripts` — importadores do seed: `scripts/` e quatro de `test/estatico`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico` — 35 de 35 arquivos, 843 de 843 testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 85d7b945ffd27cca823acc736ebd80e1034d4e53 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts src/lib/log.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 85d7b945ffd27cca823acc736ebd80e1034d4e53~1 85d7b945ffd27cca823acc736ebd80e1034d4e53 -- src drizzle e2e test` — vazio

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
