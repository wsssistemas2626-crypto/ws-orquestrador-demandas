---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T16-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 01-analista-requisitos.md (seções 0 a 2, RF-01 a RF-12; CA-04.7 e CA-10.1 a CA-10.7), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G7, T15 e T16), 06-T16-engenheiro-frontend.md, 06-T16-tech-lead.md, 06-T15-qa-automacao.md, diff do commit 3986684 (src, e2e/fila-contadores.spec.ts, e2e/fila-qa.spec.ts), e2e/fila-origem.spec.ts, e2e/fila-qa.spec.ts, e2e/apoio.ts, playwright.config.ts, src/app/(painel)/demandas/fila.tsx (linhas 1 a 80), src/app/(painel)/demandas/FiltrosFila.tsx (linhas 110 a 195), src/components/Paginacao.tsx, src/modules/demandas/schemas.ts, src/lib/log.ts, a saída do pnpm test e do pnpm test:e2e]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T16 (fila: origem na linha e no cartão, filtro "Origem"; RF-10 na tela, CA-04.7, CA-10.1 a CA-10.3, CA-10.7,
IN-16 com o CV-07 em `origem`), sobre o commit `398668466b618cbc8f774a5b44a348946307e5f9`. Nenhum arquivo rastreado
mudou (`git diff --stat` vazio). Entraram dois arquivos de teste novos:
`src/app/(painel)/demandas/fila-origem-qa.test.ts` (16 testes) e `e2e/fila-origem-qa.spec.ts` (5 testes).

### Critérios da tarefa e testes que os cobrem

| Critério | Arquivo | Teste |
|---|---|---|
| CA-10.1: cada linha (tabela e cartões) mostra a origem certa | `src/app/(painel)/demandas/fila-origem.test.ts` (engenheiro) | `tabela: sem coluna nova; a célula Título ganha "Origem: <rótulo>" …` e `cartão: "Origem" em linha inteira, …` |
| | `src/app/(painel)/demandas/fila-origem-qa.test.ts` (novo) | `tabela: a linha de cada id diz "Origem: <rótulo da origem dela>" uma vez só` e `cartões: o dd de "Origem" de cada id é o rótulo da origem dela` (id a id, com seis demandas das três origens intercaladas) |
| | `e2e/fila-origem-qa.spec.ts` (novo) | `CA-10.1 sem filtro: cada linha da primeira página diz a origem que a API dá para o id dela` |
| | `e2e/fila-contadores.spec.ts` (engenheiro, CA-07.1) | o `dd` 2 do cartão é `ROTULO_ORIGEM[d.origem]` da API, em 390 px |
| | `src/app/(painel)/demandas/fila-origem-qa.test.ts` | `a origem vem da autoria (origem), e não do título nem do solicitante: …` |
| CA-10.2: filtro por origem só traz a origem e o total certo | `e2e/fila-origem.spec.ts` (engenheiro) | `CA-10.1 e CA-10.2: por origem, a lista e o total da API, …` e `filtro Origem = Awave: …` |
| CA-10.3: origem combinada com status e com os outros filtros | `e2e/fila-origem.spec.ts` | `CA-10.3 e F2: com origem=awave, o contador "Nova" mantém a origem; …` |
| | `e2e/fila-origem-qa.spec.ts` | `Tipo e Origem juntos por "Filtrar": endereço, foco na legenda, total da API e só linhas com os dois valores` |
| | `src/app/(painel)/demandas/fila-origem-qa.test.ts` | `status, tipo, linha de serviço e origem, nesta ordem, …` |
| RF-10: o filtro se combina com a paginação | `src/app/(painel)/demandas/fila-origem.test.ts` | `a paginação não perde a origem …` |
| | `src/app/(painel)/demandas/fila-origem-qa.test.ts` | `"Anterior" e "Próxima" levam a origem; nenhum link da fila a perde` |
| | `e2e/fila-origem-qa.spec.ts` | `"Próxima" mantém a origem: página 2 com o mesmo filtro e só linhas da origem` |
| CA-10.7 (fila): axe sem violação em computador e celular | `e2e/fila-origem.spec.ts` | `filtro Origem = Awave: …` (1280 × 720 e 390 × 844) e `"Mais filtros (1 ativo)" …` (390 px com "Mais filtros" aberto) |
| CA-04.7: a demanda do Awave aparece na fila com o selo de rascunho e a origem "Awave" | `src/app/(painel)/demandas/fila-origem.test.ts` | `CA-04.7: a do Awave mostra o selo "Rascunho de agente"; …` |
| | `src/app/(painel)/demandas/fila-origem-qa.test.ts` | `CA-04.7: toda demanda do Awave tem o selo "Rascunho de agente" na linha e no cartão; …` |
| | `e2e/fila-origem-qa.spec.ts` | `CA-04.7: a demanda do Awave do seed aparece na fila com o selo de rascunho e "Origem: Awave"` |
| IN-16 / CV-07: origem fora da lista invalida o filtro e não é refletida | `src/app/(painel)/demandas/fila-origem.test.ts` | `origem conta como filtro; valor fora da lista invalida (CV-07)` e `CV-07: a origem vai oculta …` |
| | `src/app/(painel)/demandas/fila-origem-qa.test.ts` | `chave repetida (lista), valor com espaço ou com maiúscula: filtro inválido e sem origem` e `origem inválida derruba também os outros filtros válidos do endereço` |
| | `e2e/fila-origem.spec.ts` | `IN-16: origem injetada na URL não é refletida` |
| Seletor "Origem" (03, 4.1): opções, valor da URL, "Mais filtros" | `src/app/(painel)/demandas/fila-origem.test.ts` | os cinco testes de `FiltrosFila: o seletor "Origem"` |
| | `src/app/(painel)/demandas/fila-origem-qa.test.ts` | `ROTULO_ORIGEM tem exatamente as chaves de ORIGENS_DA_DEMANDA, …`, `nenhuma opção do seletor é de integração que não cria demanda …` e os três testes de `uma opção marcada em cada seleção` |
| Sem script, o GET comum aplica a origem | `e2e/fila-origem-qa.spec.ts` | `sem script › só a Origem escolhida: GET comum, origem lida pelo servidor e levada oculta aos contadores` |
| | `src/app/(painel)/demandas/fila-origem-qa.test.ts` | `GET sem script com só a origem escolhida: …` |
| Contadores contam com a origem (`contagemOuNada`); log sem filtro (CV-08) | `src/app/(painel)/demandas/fila-origem.test.ts` | `a contagem recebe a origem com o tipo e a linha; …` |
| | `src/app/(painel)/demandas/fila-origem-qa.test.ts` | `a contagem que falha devolve null, e o log tem só o evento e o erro reduzido, …` e `para cada origem, a contagem recebe exatamente a origem do filtro` |

### Testes acrescentados

`src/app/(painel)/demandas/fila-origem-qa.test.ts` (16 testes, renderização estática, "agora" fixo):
- **Lista fechada:** as chaves de `ROTULO_ORIGEM` são `ORIGENS_DA_DEMANDA` na mesma ordem, e as opções do seletor são `''`
  mais a enumeração. Nenhuma opção é `construir`, `integracao` ou `sistema`.
- **Minor 2 da 06-T16-tech-lead:** a contagem global de `selected=""` virou conferência por seleção. Cada uma das três
  seleções tem uma única opção marcada, e é a certa: sem filtro, com os três filtros e com cada origem. O teste antigo de
  `fila-qa.test.ts:518` não foi tocado.
- **URL:** o GET sem script (`status=&tipo=&origem=awave&linhaServicoProvavel=`) vale. Chave repetida, espaço antes ou
  depois, maiúscula, `agente_ia` e `null` invalidam. A origem inválida derruba também o tipo e o status válidos.
- **Legenda com os quatro filtros**, em ordem.
- **Paginação:** com `origem=agente` na página 2 de 4, "Anterior" e "Próxima" levam a origem, e nenhum `href` da fila
  a perde.
- **Id a id:** seis demandas intercaladas das três origens. A linha e o cartão de cada id dizem a origem daquela
  demanda. Demanda de pessoa com "Awave" no título mostra "Pessoa". O selo de rascunho aparece em todas as do Awave e
  do agente, e não nas de pessoa.
- **CV-08:** com a contagem falhando, o filtro tipo/linha/origem fica fora do log. A única linha é
  `painel_contadores_falhou` com a rota.

`e2e/fila-origem-qa.spec.ts` (5 testes, conta "cto", não cria demanda nem versão, de 1,3 a 4,7 s cada):
- CA-10.1 sem filtro: cada id da página 1 é conferido contra a origem que a API devolve para ele, com um "Origem:" só
  por linha;
- CA-04.7 com a `awaveAguardando` do seed: título, "Rascunho de agente" e "Origem: Awave" na mesma linha;
- Tipo + Origem por "Filtrar": URL `?tipo=melhoria&origem=awave`, h2 com foco, total da API e só linhas "Melhoria" e
  "Origem: Awave";
- "Próxima" com `origem=pessoa&limit=5`: "Página 2", "Anterior" com a origem e só linhas "Origem: Pessoa";
- sem script, só a Origem escolhida: URL do GET comum, seletor em Awave, sem alerta de filtro inválido. A origem vai
  oculta aos contadores, só com o valor `awave`.

### Resultado

- `pnpm test "src/app/(painel)/demandas/fila-origem-qa.test.ts"`: 1 de 1 arquivo, 16 de 16.
- `pnpm test:e2e e2e/fila-origem-qa.spec.ts`: a primeira rodada deu 4 de 5. O teste "Próxima" lia as linhas vazias do
  esqueleto do Suspense, que tem as mesmas 5 linhas. O erro era do teste: passei a esperar "Página 2" e o "Anterior" da
  página nova. A segunda rodada deu 5 de 5.
- `pnpm test` (suíte inteira): **284 de 284 arquivos, 6277 de 6277 testes**, 0 falharam. Na 06-T16-construcao eram 283
  e 6259. Entraram este arquivo (16 testes) e 2 testes das guardas que varrem `docs/`, que ganhou entregas.
- `pnpm test:e2e` (suíte inteira, local, build de produção, porta 3101): **268 testes: 259 passaram, 9 pulados
  (capturas), saída 0**, em 9,6 min. O `✘` de `e2e/vigia.spec.ts:5` é o controle negativo esperado e conta entre os que
  passaram. Antes eram 263; a diferença são os 5 deste arquivo.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status --short`: só os dois arquivos novos. `git diff --stat`: vazio.

## Decisões tomadas

- **Testes novos em arquivos novos, sem mexer nos do engenheiro.** Nenhuma asserção existente muda (G3.2), e o Minor 2
  da revisão ficou como conferência adicional, mais forte, ao lado da antiga.
- **CA-10.1 conferido id a id, e não por contagem.** A contagem de "Origem: X" passaria com as origens trocadas entre
  linhas; o teste novo liga cada id à sua origem (no HTML e contra a API).
- **No e2e "sem filtro", a origem esperada vem de três consultas `?origem=<o>&limit=100`.** O `workers: 1` e o fato de a
  spec não criar demanda garantem que as 20 da página 1 estão nas 100 mais novas de cada origem. Assim o teste roda
  também contra uma homologação com mais demandas.
- **O e2e espera a página nova pela paginação ("Página 2" e o "Anterior"), e não pela contagem de linhas.** O esqueleto
  do Suspense tem o mesmo número de linhas, e a falha da primeira rodada mostrou isso.
- **Sem dependência de ordem nem do relógio real:** o Vitest monta o HTML em cada teste, com `AGORA` fixo e `mockClear`
  no `beforeEach`. O e2e lê o seed e as contagens da API no próprio teste.

## Pendências

- Nenhuma bloqueia a T16.
- Para a T20: o e2e completo rodou verde uma vez nesta etapa (259 passaram, 9 pulados, saída 0). A definição de pronto
  pede três rodadas seguidas.
- Para a `07-qa-funcional` (herdada da 06-T16): o leitor de tela na célula Título com "Origem: …", o foco e o anúncio
  depois de Filtrar e o zoom de 200 % e 400 % da T03 com o seletor novo.
- Herdada, sem ação aqui: a vista do Awave devolve o título com "[nome removido]" (06-T15-qa-automacao). O dono é o
  `engenheiro-backend` ou a 08. O painel não é afetado: o teste novo confirma que a fila mostra o título original para
  pessoa.
- Minor 1 da 06-T16-tech-lead: o título do `it` em `leituras-da-fila.test.ts:63` segue como está. O caso com a origem
  agora tem dois testes, no `fila-origem.test.ts` e no `fila-origem-qa.test.ts`.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 398668466b618cbc8f774a5b44a348946307e5f9~1 398668466b618cbc8f774a5b44a348946307e5f9` — 15 arquivos do commit da T16
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — HEAD em 27de11f (06-T16-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 398668466b618cbc8f774a5b44a348946307e5f9~1 398668466b618cbc8f774a5b44a348946307e5f9 -- src/app/(painel)/demandas/fila.tsx src/app/(painel)/demandas/FiltrosFila.tsx src/app/(painel)/demandas/ContadoresDaFila.tsx src/app/(painel)/demandas/CartoesDaFila.tsx src/app/(painel)/demandas/page.tsx src/app/(painel)/demandas/leituras-da-fila.ts src/components/rotulos.ts` — não rodou: o shell recusou os parênteses sem aspas (erro de sintaxe, nada executado)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 398668466b618cbc8f774a5b44a348946307e5f9~1 398668466b618cbc8f774a5b44a348946307e5f9 -- src` — diff do código e dos testes de `src/` lido com Read
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 398668466b618cbc8f774a5b44a348946307e5f9~1 398668466b618cbc8f774a5b44a348946307e5f9 -- e2e/fila-contadores.spec.ts e2e/fila-qa.spec.ts` — só números e listas que crescem, e duas asserções a mais
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/fila-origem-qa.test.ts"` — 16 de 16
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-origem-qa.spec.ts` — em segundo plano: 4 de 5; o "Próxima" lia o esqueleto do Suspense (erro do teste, corrigido)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os dois arquivos novos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 284 de 284 arquivos, 6277 de 6277 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/fila-origem-qa.spec.ts` — em segundo plano: 5 de 5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio (nenhum arquivo rastreado mudou)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano: 268 testes, 259 passaram, 9 pulados (capturas), saída 0

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela acima: CA-04.7, CA-10.1, CA-10.2, CA-10.3, CA-10.7, IN-16/CV-07 e a paginação do RF-10)
- [x] a suíte inteira passa (Vitest 284 de 284 arquivos, 6277 de 6277 testes; e2e 259 passaram e 9 pulados, saída 0)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (HTML montado em cada teste, `AGORA` fixo, `mockClear` no `beforeEach`; o e2e lê o seed e a API no próprio teste)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (`git diff --stat` vazio; os testes existentes que a T16 mudou foram conferidos no diff do commit)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (títulos "(fictício)", contas fictícias do seed, nenhum token)
