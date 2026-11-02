---
pedido: DEC-DEM-20261102-0003-v1
etapa: 03-correcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, e2e/decisao.spec.ts, e2e/parecer-risco-qa.spec.ts, e2e/apoio.ts, e2e/sem-violacoes.spec.ts, playwright.config.ts, package.json, eslint.config.mjs, test/estatico/projeto.test.ts, scripts/seed-ficticio.ts (linhas 120-229), src/modules/demandas/transicoes.ts, src/modules/demandas/schemas.ts (linhas 70-95), src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/limites.ts, src/components/dados-da-decisao.ts, src/components/formulario.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/api/pacotes-decisao/route.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Correção feita como a triagem pediu (passos 0 a 6), com o teste antes do código. Nenhum arquivo de `src/`, `scripts/`,
`.github/`, `e2e/servidor.ts` ou `Dockerfile` mudou. O axe, o C-36, a A-02, `workers`, `retries` e `fullyParallel`
continuam como estavam.

### Arquivos alterados

- `e2e/preparacao.ts` (novo): três funções puras, sem `@playwright/test`.
  - `prepararEspERsk(c)` (M-01): confere a lista de ESP e a de RSK separadamente e cria só o que falta, primeiro a ESP.
    A falha de uma criação não é engolida.
  - `procurarEmPaginas(buscarPagina, achar)` (N-03): `offset` de 100 em 100 até achar o item ou chegar ao `total`.
  - `proximoId(tipo, demandaId, ids)` (B-01): `<tipo>-<demandaId>-v<maior + 1>`, com o maior pelo número. Id de outro
    tipo, de outra demanda ou fora do formato lança erro.
  - `TAMANHO_DA_PAGINA = 100`.
- `e2e/preparacao.spec.ts` (novo): 12 testes do Playwright sem a fixture `page`, com falsos no lugar da API.
  - `prepararEspERsk`, 4 casos: 0/0, 1/0 (a falha parcial da M-01), 1/1, e o RSK que rejeita uma vez (a 1.ª chamada
    rejeita com o mesmo erro, a 2.ª cria só o RSK, a 3.ª não cria nada).
  - `procurarEmPaginas`, 4 casos: o item 230 com offsets `[0, 100, 200]`; o item da 1.ª página com uma busca só; o item
    que não existe dá `undefined` em 3 chamadas; a lista vazia faz 1 chamada.
  - `proximoId`, 4 casos: vazia → v1; `[v3, v2, v1]` → v4; `[v1, v10, v2]` → v11; outra demanda, outro tipo e fora do
    formato lançam erro.
  - Uso por conta: 0 demandas e 0 versões nas duas contas.
- `e2e/apoio.ts`: `demandaDoSeed` percorre as páginas com `procurarEmPaginas` (`limit=100&offset=<n>`) e continua
  lançando `e2e: o seed não tem a demanda "<título>"`.
- `e2e/decisao.spec.ts`:
  - `demanda()` = `demandaDoSeed` + `completarEspERsk`, que chama `prepararEspERsk` sobre `GET /especificacoes` e
    `GET /pareceres-risco`. Saíram `TITULO_DUPLA`, `demandaDaDupla` e o tipo `Demanda`: a dupla usa
    `demandaDoSeed(TITULOS_DO_E2E.duplaAprovacao)` mais `completarEspERsk`.
  - `idDoDecDeRascunhoDoSeed` percorre as páginas de `/api/pacotes-decisao?statusDecisao=pendente`.
  - `exigeBancoRecemSemeado(condicao, motivo)`: a mensagem é `exige banco recém-semeado: <motivo>`. Com `CI`, faz
    `expect(condicao, mensagem).toBe(true)`; sem `CI`, faz `test.skip(!condicao, mensagem)`. A chamada vem sempre depois
    das leituras GET e antes de qualquer POST.
  - `ORIGENS_DO_FLUXO` = `nova`, `em_analise`, `aguardando_informacao` e `pronta_para_decisao`, com referência a
    `transicoes.ts`.
  - Teste novo "M-01" logo depois do C-14: lê os ids de ESP e de RSK, chama `demanda()` duas vezes e confere que a lista
    vazia ganha exatamente a v1 e a lista que já tinha versão fica igual.
  - "nível cto: aprovar A": exige D sem DEC `aprovada` e com status em `ORIGENS_DO_FLUXO`. O fluxo de aprovar pela tela
    virou `aprovarOpcaoA(page)`, usado aqui e na A-02.
  - Teste novo "A-02", logo depois de "aprovar A", que roda em qualquer banco. Se D não tem DEC aprovado, ele aprova um
    pela tela. Depois cria outro DEC, tenta aprovar e confere quatro coisas: o alerta
    `Não foi possível concluir: outro pacote desta demanda já está aprovado.`, o axe (`T11 com o conflito da A-02`), o
    novo DEC `pendente` pela API e a lista de DEC aprovados da demanda igual à de antes, com exatamente um.
  - "dupla aprovação": exige DD sem DEC `aprovada`.
  - "CA-12.4": exige D com status em `ORIGENS_DO_FLUXO`.
  - "Arquivar": exige D com status em `ORIGENS_DO_FLUXO` ou `encerrada`. N-01: o 404 usa
    `proximoId('DEC', demandaId, <ids lidos logo depois de arquivar>)` no lugar de `v9`.
  - O comentário do topo diz quais testes exigem banco recém-semeado, por quê, e que eles pulam fora do CI e reprovam
    no CI. O uso por conta continua "cto" 0 demandas pela API.
- `e2e/parecer-risco-qa.spec.ts`:
  - O duplo clique e a T07 leem a lista antes e calculam `esperado = proximoId(...)`. Esse id vai no botão
    (`Gravar ${esperado}`, `exact: true`), na URL, no alerta e no corpo da Server Action.
  - Depois de agir, os dois conferem `toEqual([esperado, ...antes])`. A T07 lê o `escopoInclui` da versão com
    `id === esperado`.
  - O `SENTINELA` é gerado dentro do teste, com `randomUUID().slice(0, 8)`.
  - O comentário do topo explica o B-01. O uso por conta continua "cto" 2 demandas e 9 versões.
- `playwright.config.ts`: só o comentário do topo. Ele cita as duas fontes de dado (o seed fictício e a API), diz que
  as demandas do seed acumulam versões e decisões entre execuções contra o mesmo banco e que o teste que precisa de banco
  recém-semeado diz isso ao ser pulado. Nenhuma linha de configuração mudou.
- `package.json`: `version` 0.1.1 → 0.1.2.
- `test/estatico/projeto.test.ts`: título, `expect` e comentário da versão passam para 0.1.2.

### Testes vistos falhando antes do código

1. Versão: `pnpm test test/estatico/projeto.test.ts` deu 1 falha, `AssertionError: expected '0.1.1' to be '0.1.2'`
   (10 passaram). Depois da troca no `package.json`, passou.
2. `pnpm test:e2e e2e/preparacao.spec.ts`, com `prepararEspERsk` ainda com a guarda antiga e as outras duas funções
   lançando "ainda não implementada": 9 falharam e 3 passaram.
   - Caso 1/0: `Expected "rsk": 1, Received "rsk": 0` em `expect(f.criadas).toEqual({ esp: 0, rsk: 1 })`.
   - Caso da falha do RSK: o mesmo erro na 2.ª chamada.
   - Os 4 casos de `procurarEmPaginas` e 3 de `proximoId` falharam com o erro "ainda não implementada".
   - Depois da correção: 12 de 12.
3. B-01, antes de mexer nas specs.
   - `pnpm test:e2e e2e/parecer-risco-qa.spec.ts --repeat-each=2`: 12 passaram e 2 falharam, os dois na 2.ª repetição.
     O duplo clique estourou o tempo em `waiting for getByRole('button', { name: 'Gravar RSK-DEM-20261102-0013-v1' })`,
     e a T07 em `waiting for getByRole('button', { name: 'Gravar ESP-DEM-20261102-0014-v1' })`.
   - `pnpm test:e2e e2e/decisao.spec.ts --repeat-each=2`: 9 passaram e 3 falharam, os três na 2.ª repetição. "aprovar
     A" e "dupla aprovação" não acharam o alerta de sucesso (o 409 da A-02). O "CA-12.4" deu
     `Expected: "em_analise" Received: "encerrada"`.

### Resultado depois da correção

- `pnpm test`: 192 arquivos, 3697 de 3697 testes, 0 falha.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm test:e2e e2e/decisao.spec.ts e2e/parecer-risco-qa.spec.ts e2e/preparacao.spec.ts --repeat-each=3`, num banco
  só: 81 testes, 75 passaram, 6 foram pulados e 0 falhou. As cópias rodaram em sequência, arquivo por arquivo, em cada
  repetição.
  - 1.ª repetição (testes 1 a 27): 27 passaram, 0 pulado.
  - 2.ª (28 a 54) e 3.ª (55 a 81): só foram pulados "nível cto: aprovar A", "dupla aprovação" e "CA-12.4", três por
    repetição. M-01, A-02, P1-b, C-14, "Arquivar" (com o 404 da N-01), o duplo clique e a T07 passaram nas três.
- `pnpm test:e2e`, a suíte inteira, três vezes seguidas: código de saída 0 nas três, sem falha. Não li a contagem de
  passados e pulados: o harness mandou a saída para um arquivo em `/tmp`, que o maestro me proibiu de ler. Sem `CI`, cada
  execução sobe um banco novo, e nenhuma pré-condição de banco recém-semeado deveria ficar falsa. A `04-regressao`
  confirma as contagens.

### Desvios do plano

- Os botões `Gravar` usam `exact: true`. Sem isso, `Gravar RSK-<id>-v1` também casaria com `-v10`.
- O `SENTINELA` é gerado dentro do teste, e não no módulo. Com `--repeat-each`, o módulo carrega uma vez só por worker,
  e o sentinela se repetiria entre as cópias.
- Os testes de `procurarEmPaginas` e `proximoId` têm casos além dos do plano: parar na página do item, lista vazia e id
  fora do formato.
- O teste M-01 confere a lista de ids, e não só a contagem. É mais estrito.
- O teste A-02 roda o axe no estado do conflito, uma tela que o plano não listava.

## Decisões tomadas

- `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` não mudaram: a triagem não precisou de demanda nova no seed.
- O 409 da A-02 é conferido pelo texto literal da tela. Importar `MENSAGENS_DECISAO` de `decidir.ts` levaria o drizzle
  e o schema do banco para o processo do teste.
- A pré-condição do "Arquivar" aceita `encerrada`: o arquivamento grava e o status continua no destino esperado.
- `completarEspERsk` recebe o id já lido: assim, quem exige banco recém-semeado lê o estado sem nenhum POST antes.

## Pendências

- Para a `04-regressao`: confirmar a contagem de passados e pulados das três execuções completas (código de saída 0 nas
  três; não li a saída, ver Entrega).
- Para a `04-regressao`: a rodada com a M-01 forçada pelo estado, criando à mão só a ESP de D, como a triagem pede.
- Para a `06-documentacao`: CHANGELOG 0.1.2.

## Comandos executados

- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts` — 1 falhou e 10 passaram (antes da troca da versão)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo construcao/DEC-DEM-20261102-0003-v1
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/preparacao.spec.ts` — 9 falharam e 3 passaram (antes da correção)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco-qa.spec.ts --repeat-each=2` — 12 passaram e 2 falharam (B-01 reproduzido)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --repeat-each=2` — 9 passaram e 3 falharam (B-01 reproduzido)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3697 de 3697
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/preparacao.spec.ts` — 12 de 12
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/parecer-risco-qa.spec.ts e2e/preparacao.spec.ts --repeat-each=3` — 75 passaram, 6 pulados com mensagem e 0 falhou
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 1.ª execução completa, código de saída 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 6 arquivos alterados, mais 2 novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — 5dcc5e8 (02-triagem) no topo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 2.ª execução completa, código de saída 0
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 3.ª execução completa, código de saída 0

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
