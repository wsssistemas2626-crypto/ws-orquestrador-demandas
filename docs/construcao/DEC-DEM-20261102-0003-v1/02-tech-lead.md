---
pedido: DEC-DEM-20261102-0003-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, DEC-DEM-20261102-0002-v1/02-tech-lead.md, DEC-DEM-20261102-0002-v1/04-maestro.md, e2e/decisao.spec.ts, e2e/parecer-risco-qa.spec.ts, e2e/apoio.ts, playwright.config.ts, vitest.config.ts, scripts/seed-ficticio.ts, package.json, src/modules/demandas/transicoes.ts, src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/consultas.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/components/dados-da-decisao.ts, git diff 30b71b5~1 30b71b5 (test/estatico/projeto.test.ts), .claude/agents/engenheiro-frontend.md, .claude/agents/engenheiro-backend.md]
status: pronto
proximo: engenheiro-frontend
devolvido_para: null
---
## Entrega

### Causa provável

Concordo com a reprodução da 01. São três causas, todas no código de teste. O sistema não tem defeito nelas.

1. **M-01: a preparação confere uma coisa e cria duas** (`e2e/decisao.spec.ts:39-43`). A guarda olha só a lista de
   ESP e, quando ela está vazia, cria a ESP e o RSK juntos. Se a ESP grava e o RSK não (429 do C-36, tempo esgotado), o
   estado "ESP sem RSK" fica no banco. A guarda não o reconhece, e o `POST /pacotes-decisao` responde 400
   (`criar.ts:83-88`) em toda execução seguinte.
2. **B-01: os testes supõem o estado do banco recém-semeado.**
   - O duplo clique (`parecer-risco-qa.spec.ts:177-188`) e a T07 (`:206`, `:224-227`) escrevem `-v1` à mão. O número
     da versão é `max + 1` (`versoes.ts:25-30`), e as telas novas partem da versão mais nova, então o botão vira `-v2`.
     A T07 ainda lê `itens[0]` sem conferir o id, o que é um falso positivo latente.
   - A `decisao.spec.ts` aprova, devolve e arquiva sem conferir o estado de partida. Depois da 1.ª execução, D fica
     `encerrada` e com um DEC aprovado, e DD também tem um DEC aprovado. Na 2.ª execução, a A-02 (`decidir.ts:213`)
     responde 409, e a `decisao_devolvida` não sai de `encerrada` (`transicoes.ts:57`).
   - `demandaDaDupla` (`decisao.spec.ts:51-58`) cria ESP e RSK em toda execução, sem guarda.
   - N-01: o 404 usa `DEC-<D>-v9` fixo, e na 3.ª execução a v9 existe.
   - N-03: `demandaDoSeed` (`apoio.ts:74`) e `idDoDecDeRascunhoDoSeed` (`decisao.spec.ts:76`) leem só a 1.ª página de
     100. A rota aceita `offset` (`demandas/schemas.ts:89-90`; `LIMITE_PAGINA = 100`), mas os buscadores não o usam.
3. **B-02: o comentário de `playwright.config.ts:4` ficou para trás.** Diz que os dados de cada teste são criados pela
   API, mas desde o pedido 0002 há também as demandas do seed.

### Quem corrige

**`engenheiro-frontend`, numa `03-correcao` só.** Todo o trabalho fica em `e2e/`, mais o comentário de
`playwright.config.ts`, o campo `version` do `package.json` e uma linha de `test/estatico/projeto.test.ts`. A
verificação exige `pnpm test:e2e`. Isso tudo está na lista **Pode** do frontend (`e2e/`, `test/`, `*.config.*`,
`package.json`, `pnpm test:e2e`), e `e2e/` e `pnpm test:e2e` estão fora da lista do backend. Nesta triagem,
`scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` não mudam (ver Decisões).

### O que a 03-correcao faz, em ordem, com o teste antes do código

Arquivos: `e2e/preparacao.ts` (novo), `e2e/preparacao.spec.ts` (novo), `e2e/apoio.ts`, `e2e/decisao.spec.ts`,
`e2e/parecer-risco-qa.spec.ts`, `playwright.config.ts` (só o comentário), `package.json` (só `version`) e
`test/estatico/projeto.test.ts` (só a versão). Nenhum arquivo de `src/`, `scripts/`, `.github/`, `e2e/servidor.ts` ou
`Dockerfile` muda.

**Passo 0. Versão 0.1.2.**
- Primeiro o teste. Em `test/estatico/projeto.test.ts`, no `it` da versão (perto da linha 28), troque `0.1.1` por
  `0.1.2` no título e no `expect`. Troque também o comentário: `// 0.1.2: DEC-DEM-20261102-0003-v1 (e2e independente
  de banco recém-semeado, sem mudança de comportamento).` Rode `pnpm test` e registre a falha.
- Depois, em `package.json`, mude `"version": "0.1.1"` para `"0.1.2"`.

**Passo 1. M-01: preparação idempotente, numa função pura testada sem navegador.**
- Crie `e2e/preparacao.ts`, sem importar `@playwright/test`, para a função receber as chamadas e poder ser testada com
  um falso.
  - Escreva `prepararEspERsk(c: { listarEsp(): Promise<unknown[]>; listarRsk(): Promise<unknown[]>; criarEsp():
    Promise<unknown>; criarRsk(): Promise<unknown> }): Promise<void>`.
  - Comece movendo para ela a lógica de hoje, igual a `decisao.spec.ts:39-43` (só a guarda da ESP). A `demanda()` da
    spec passa a chamar a função com `api()`. É só uma refatoração: o comportamento ainda não muda.
- Teste primeiro, em `e2e/preparacao.spec.ts`. É um teste do Playwright sem a fixture `page`, então não abre navegador
  nem chama a API. O falso guarda o estado (quantas ESP e quantos RSK) e conta as chamadas. Os casos:
  1. 0 ESP e 0 RSK: uma criação de ESP e uma de RSK.
  2. 1 ESP e 0 RSK (a falha parcial da M-01): nenhuma criação de ESP e uma de RSK.
  3. 1 ESP e 1 RSK: nenhuma criação.
  4. O falso rejeita a 1.ª criação de RSK. A 1.ª chamada a `prepararEspERsk` rejeita com o mesmo erro (`rejects.toThrow`),
     sem engolir, e o estado fica 1 ESP e 0 RSK. A 2.ª chamada cria só o RSK. A 3.ª não cria nada. No fim, o estado tem
     exatamente 1 ESP e 1 RSK.
- Rode `pnpm test:e2e e2e/preparacao.spec.ts` e registre na entrega a falha dos casos 2 e 4. Depois corrija: a função
  confere a ESP e cria se faltar, e em seguida confere o RSK e cria se faltar. Nessa ordem, porque o RSK cita a ESP mais
  nova.
- Na `decisao.spec.ts`:
  - `demanda()` e `demandaDaDupla()` usam `demandaDoSeed` com `TITULOS_DO_E2E.decisao` e `TITULOS_DO_E2E.duplaAprovacao`.
    Saem a constante `TITULO_DUPLA` (cópia do texto do seed) e a busca própria das linhas 52-54.
  - As duas chamam `prepararEspERsk`, com `listarEsp` e `listarRsk` em `GET /api/demandas/<id>/especificacoes` e
    `GET /api/demandas/<id>/pareceres-risco`.
  - Acrescente um teste logo depois do C-14: "M-01: a preparação da demanda da spec completa o que falta e não cria
    versão a mais". Ele conta as ESP e os RSK de D, chama `demanda()` duas vezes e confere:
    - cada lista ganhou exatamente 1 item, se estava vazia, ou 0, se não estava;
    - as duas terminam com pelo menos 1 item.
  - Reescreva o comentário das linhas 33-36 para dizer que a preparação confere as duas listas.

**Passo 2. N-03: buscadores que percorrem as páginas.**
- Teste primeiro, em `e2e/preparacao.spec.ts`, para `procurarEmPaginas<T>(buscarPagina: (offset: number) =>
  Promise<{ itens: T[]; total: number }>, achar: (x: T) => boolean): Promise<T | undefined>`. Use um falso com 250
  itens em páginas de 100:
  - acha o item 230;
  - devolve `undefined` quando o item não existe;
  - para no `total`, sem página a mais (conte as chamadas: 3).
- Escreva a função em `e2e/preparacao.ts`, com offset de 100 em 100 (`LIMITE_PAGINA`).
- Use-a nos três buscadores, todos com `limit=100&offset=<n>`:
  - `demandaDoSeed` (`apoio.ts:73-78`), que continua lançando `e2e: o seed não tem a demanda "<título>"`;
  - a busca da dupla, que passa a ser a própria `demandaDoSeed`;
  - `idDoDecDeRascunhoDoSeed` (`decisao.spec.ts:75-80`).

**Passo 3. B-01.1 e B-01.2: duplo clique e T07 sem supor `v1`.**
- Teste primeiro, em `e2e/preparacao.spec.ts`, para `proximoId(tipo: 'ESP' | 'RSK' | 'DEC', demandaId: string, ids:
  string[]): string`, que é `<tipo>-<demandaId>-v<maior + 1>`. Os casos:
  - lista vazia dá `v1`;
  - `[v3, v2, v1]` dá `v4`;
  - `[v1, v10, v2]` dá `v11` (o maior pelo número, não pela posição nem pelo texto);
  - id de outra demanda ou de outro tipo lança erro.
- Prova da falha antes de mexer nas specs: rode `pnpm test:e2e e2e/parecer-risco-qa.spec.ts --repeat-each=2` e
  registre na entrega a falha da 2.ª repetição (botão `Gravar RSK-<id>-v1` e `Gravar ESP-<id>-v1` não encontrados).
- No duplo clique (`parecer-risco-qa.spec.ts:152-189`):
  - Antes de agir, leia `antes = (await pareceres(page, d.id)).map((r) => r.id)` e calcule
    `esperado = proximoId('RSK', d.id, antes)`.
  - Use `esperado` no botão (`Gravar ${esperado}`), na URL, no alerta (`${esperado} gravado.`) e no
    `expect(corpo).toContain(esperado)`.
  - Depois de agir, confira `toEqual([esperado, ...antes])`: exatamente uma versão nova, na frente, e as antigas
    iguais e na mesma ordem.
  - O `SENTINELA` passa a ser único por execução, por exemplo
    `` `SENTINELA-RSK-E2E-${randomUUID().slice(0, 8)}` `` com `randomUUID` de `node:crypto`. Assim, o
    `not.toContain(SENTINELA)` confere só o que esta execução digitou, mesmo que a versão de partida já tenha o
    sentinela de uma execução anterior (ponto de atenção do B-01.1 da 01). O `toContain(SENTINELA)` do `postData`
    continua.
- Na T07 (`:191-230`):
  - Faça o mesmo com `GET /api/demandas/<id>/especificacoes` e `proximoId('ESP', ...)`, nos dois botões (`:206` e
    `:224`) e no alerta (`${esperado} gravada.`).
  - Confira a lista com `toEqual([esperado, ...antes])` e leia o `escopoInclui` do item de `id === esperado`, e não de
    `itens[0]`.
  - A conferência do total de demandas fica como está.

**Passo 4. B-01.3, B-01.4, N-01 e A-02: a `decisao.spec.ts` confere o estado antes de agir.**
- Prova da falha antes de mexer: rode `pnpm test:e2e e2e/decisao.spec.ts --repeat-each=2` e registre as falhas da 2.ª
  repetição. Devem cair "nível cto: aprovar A" e "dupla aprovação", com 409 `outro pacote desta demanda já está
  aprovado.`, e o CA-12.4, com status `encerrada` em vez de `em_analise`.
- Escreva na spec um apoio só, `exigeBancoRecemSemeado(condicao: boolean, motivo: string)`:
  - a mensagem é `` `exige banco recém-semeado: ${motivo}` ``;
  - com `process.env.CI`, faz `expect(condicao, mensagem).toBe(true)`. No CI, o banco é sempre novo (Testcontainers),
    e uma pré-condição falsa ali é defeito, que tem de reprovar, e não pular;
  - sem `CI`, faz `test.skip(!condicao, mensagem)`.

  Cada chamada fica no começo do teste, depois do `entrarComo` e das leituras pela API e **antes de qualquer POST**.
  Assim, o teste pulado não gasta versão do C-36 nem deixa estado no banco.
- Leia o estado com `GET /api/demandas/<id>/pacotes-decisao` (a lista traz `statusDecisao` de cada DEC) e com
  `GET /api/demandas/<id>` (`status`). As origens que levam a demanda a `pronta_para_decisao` com um DEC novo, e a
  `em_analise` com a devolução, são `nova`, `em_analise`, `aguardando_informacao` e `pronta_para_decisao`
  (`transicoes.ts:56-57`). Guarde-as numa constante comentada com a referência.
- Pré-condição de cada teste:
  - **"nível cto: aprovar A":** D sem DEC `aprovada` e com status numa das quatro origens. O motivo é
    ``a demanda ${id} já tem DEC aprovado (A-02) ou está ${status}``.
  - **"dupla aprovação":** DD sem DEC `aprovada`. Um DEC que só tem a aprovação do CTO não conta: ele não tem decisão.
  - **"CA-12.4":** D com status numa das quatro origens. Em `encerrada`, a devolução não leva a `em_analise`.
  - **"Arquivar":** D com status numa das quatro origens ou em `encerrada`.
  - **"P1-b" e "C-14":** sem pré-condição, porque só leem a tela.
- Teste novo da A-02, que roda em toda execução, logo depois de "aprovar A": "A-02: com um DEC aprovado na demanda,
  aprovar outro mostra o conflito e o pacote continua pendente".
  - Se D ainda não tem DEC `aprovada` (o teste rodando sozinho, com `--grep`), o teste cria um e o aprova pela tela, com
    o mesmo apoio de "aprovar A". Extraia esse fluxo para uma função, sem duplicar.
  - Depois, crie um DEC novo e tente aprovar a opção A pela tela. O alerta tem de mostrar o 409, com o prefixo
    "Não foi possível concluir: " e o texto de `MENSAGENS_DECISAO.outroAprovado`
    (`outro pacote desta demanda já está aprovado.`). Confira o texto exato no formulário da T11, sem mudar `src/`.
  - No fim, `GET /api/pacotes-decisao/<novo>` dá `statusDecisao: 'pendente'`, e a lista da demanda tem **exatamente
    um** DEC `aprovada`. Essa é a conferência da A-02 (critério 5) nos dois estados de banco.
- N-01, no laço do 404 do "Arquivar" (`:271`): troque `DEC-${demandaId}-v9` por
  `proximoId('DEC', demandaId, <ids da lista lida logo depois de arquivar>)`. Ela não existe nesse momento, porque nada
  é criado entre a leitura e o `goto`.
- Reescreva o comentário do topo (linhas 1-13). Ele passa a dizer:
  - quais testes exigem banco recém-semeado e por quê;
  - que eles pulam com mensagem fora do CI e reprovam no CI;
  - o uso por conta, que continua "cto" 0 demandas pela API.

**Passo 5. B-02: comentário de `playwright.config.ts:4`.**
- Troque a frase da linha 4 por um comentário que cite as duas fontes:
  - o seed fictício (`scripts/seed-ficticio.ts`): as contas de `CONTAS_FICTICIAS`, o DEC de rascunho de agente e as
    demandas de `TITULOS_DO_E2E`, achadas pelo título;
  - a API, pela sessão da página: as demandas e versões que os testes criam.

  Diga também que as demandas do seed acumulam versões e decisões entre execuções contra o mesmo banco, e que o teste
  que precisa de banco recém-semeado diz isso ao ser pulado.
- Pode ocupar mais de uma linha de comentário. Nenhuma linha de configuração muda (`workers`, `retries`,
  `fullyParallel`, `webServer` ficam iguais).

**Passo 6. Comentários de uso por conta.**
- `parecer-risco-qa.spec.ts` (topo): continua "cto" 2 demandas e 9 versões por execução. Acrescente que o duplo clique
  e a T07 criam a versão seguinte à mais nova.
- `preparacao.spec.ts`: "cto" 0 demandas e 0 versões; "administradora" 0 e 0.

**Comandos da 03-correcao** (todos na lista **Pode** do frontend):
- `pnpm test`, `pnpm lint` e `pnpm typecheck`;
- `pnpm test:e2e` inteiro, uma vez;
- `pnpm test:e2e e2e/decisao.spec.ts e2e/parecer-risco-qa.spec.ts e2e/preparacao.spec.ts --repeat-each=3`, com o
  resultado de cada repetição na entrega.

### Proibido, e recusado na revisão como alto

- Mudar qualquer arquivo de `src/`, incluindo `src/modules/limites.ts`, `decidir.ts` e `transicoes.ts`.
- Variável de ambiente, cabeçalho, relógio ou conta que mude o C-36 ou a A-02.
- Apagar demanda ou versão entre specs. Esperar a janela de uma hora.
- Subir `retries`. Mudar `workers` ou `fullyParallel`.
- Desligar ou filtrar regra do axe. Mudar `TAGS_AXE`. Repetir o axe até passar.
- Deixar o teste mais tolerante:
  - `toBeGreaterThanOrEqual` onde o critério é "exatamente uma versão nova";
  - `try/catch` que engole a falha da preparação;
  - `return` silencioso no lugar de `test.skip` com mensagem;
  - `test.skip` sem condição, `test.fixme`, ou pular dentro do CI;
  - trocar o 409 da A-02 por sucesso.
- Ler `.env` ou usar dado pessoal real. Todos os textos novos são fictícios.

### Teste de regressão esperado

- `e2e/preparacao.spec.ts`: os casos de `prepararEspERsk` (ESP sem RSK cria só o RSK; a falha propaga e a chamada
  seguinte completa; nenhuma versão a mais), de `procurarEmPaginas` (item na 3.ª página) e de `proximoId`.
- `decisao.spec.ts`, teste "M-01": a preparação contra o banco cria no máximo uma versão de cada, e nenhuma quando já
  existem.
- `decisao.spec.ts`, teste "A-02": passa em toda execução e confere exatamente um DEC aprovado na demanda.
- Duplo clique e T07: exatamente uma versão nova, `proximoId` da lista de antes, e as antigas na mesma ordem.
- `--repeat-each=3` nas três specs, num banco só:
  - na 1.ª repetição, tudo passa, com 0 pulado;
  - na 2.ª e na 3.ª, tudo passa, e só são pulados "nível cto: aprovar A", "dupla aprovação" e "CA-12.4", cada um com a
    mensagem `exige banco recém-semeado: ...`;
  - na 3.ª, o laço do 404 passa (N-01).

  Conta do C-36 nessa execução: perto de 44 de 60 versões e 6 de 30 demandas da "cto".

### Leitura do critério 4 (N-02 da 01)

O critério 4 vale para as specs do B-01 (`decisao.spec.ts` e `parecer-risco-qa.spec.ts`), rodadas várias vezes contra o
mesmo banco. A forma de verificar é o `--repeat-each=3` acima. Cada repetição de uma spec é uma execução completa dela.
O relatório `list` mostra a ordem, e a `04-regressao` confirma que as cópias de cada arquivo rodaram em sequência.

A suíte **inteira** rodada duas vezes na mesma hora contra o mesmo banco recebe 429 do C-36: a "cto" cria 27 demandas por
execução. É o controle funcionando, e não o B-01. Pular com mensagem todos os testes que criam demanda pela API, ou
afrouxar o C-36, deixaria o teste mais tolerante, e o RSK do pedido veta as duas saídas. Contra a mesma homologação, a
2.ª execução completa só vale com uma hora de intervalo.

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-frontend). O maestro confere de novo no `verificar` da Parada 3 |
| `pnpm test:e2e` verde três vezes seguidas | `04-regressao` (qa-automacao). A `03-correcao` roda a suíte uma vez, mais o `--repeat-each=3` das três specs |
| `CHANGELOG.md` com a versão 0.1.2 | `06-documentacao` (documentacao-tecnica). O campo `version` do `package.json` e o `test/estatico/projeto.test.ts` ficam com a `03-correcao` (passo 0) |
| PR com CI verde | Parada 3 (maestro) |

Para a `04-regressao`:
- `pnpm test:e2e` três vezes seguidas. Cada uma sobe um banco novo e tem de terminar com 0 pulado.
- O `--repeat-each=3` das três specs, com o resultado esperado acima.
- Uma rodada com a falha da M-01 forçada pelo estado, sem commit: crie à mão só a ESP de D pela API, antes da
  `decisao.spec.ts`. A preparação tem de criar só o RSK, e os testes seguintes têm de passar.

Para a `05-entrega`: nada muda em `Dockerfile`, workflows nem `docs/operacao/`. O `docker build` confere que a imagem
sai igual.

## Decisões tomadas

- Liberações do maestro, por delegação de Fabiano (02/11, até 14h de Brasília), para o engenheiro desta 03-correcao: editar `playwright.config.ts` (só o comentário da linha 4), `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts`, e trocar a versão do `package.json` de 0.1.1 para 0.1.2.
- `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` não mudam: a correção não precisa de demanda nova no seed. A liberação fica registrada, mas este plano não a usa.
- Engenheiro-frontend: `e2e/`, `test/`, `*.config.*`, `package.json` e `pnpm test:e2e` já estão na lista Pode dele, e nada do plano está em `scripts/` ou `src/`.
- `test/estatico/projeto.test.ts` muda uma linha: ele confere a versão (`expect(pkg.version)`), e o 0.1.2 sem essa troca deixaria o `pnpm test` vermelho. O arquivo está em `test/`, na lista Pode do frontend, e é o teste que falha antes da troca da versão.
- M-01 fica numa função pura testada por um spec do Playwright sem navegador (`e2e/preparacao.spec.ts`), e não em `scripts/scripts.test.ts`. O teste mora junto do código de e2e, não depende de 429 nem de rede, e não muda o `include` do `vitest.config.ts`.
- `procurarEmPaginas` e `proximoId` entram na mesma função pura testada: são código novo de teste com lógica, e código sem teste não entra.
- Testes da decisão que exigem banco recém-semeado: pulam com mensagem fora do CI e reprovam no CI. No CI, o banco é sempre novo, e um pulo ali esconderia defeito. A variável `CI` já decide o `forbidOnly` em `playwright.config.ts:16`, e aqui ela só deixa o teste mais estrito.
- A pré-condição vem antes de qualquer POST: o teste pulado não gasta versão do C-36 nem muda o banco.
- A A-02 ganha um teste próprio, que roda nos dois estados de banco: o "aprovar A" é pulado nas execuções repetidas, e o critério 5 pede a regra testada.
- O sentinela do duplo clique passa a ser único por execução: a versão de partida de uma 2.ª execução já traz o sentinela da 1.ª, e a conferência tem de ser sobre o que esta execução digitou.
- O "Arquivar" não ganha demanda própria no seed. Pular o CA-12.4 com mensagem nas execuções repetidas é o caminho que a ESP prevê, e mexe menos.
- N-02 é lido assim: o critério 4 vale para as specs do B-01 por `--repeat-each`, e a suíte inteira só se repete com uma hora de intervalo. É a única leitura que não afrouxa o C-36.
- N-04 (DEC criado numa demanda Encerrada, e a tela da devolução diz que ela voltou para Em análise) fica fora deste pedido, que não muda comportamento do sistema.

## Pendências

- Para Fabiano, informativo e sem bloquear: pela leitura do N-02, a suíte inteira contra a mesma homologação só se repete com uma hora de intervalo, por causa do C-36. Rodar duas vezes na mesma hora exigiria mexer no C-36, que o RSK do pedido veta.
- Para o `analista-requisitos`, numa demanda própria, se Fabiano quiser: N-04. A API cria DEC numa demanda Encerrada (`criar.ts` não confere o status), e a devolução depois disso mostra "A demanda voltou para Em análise." sem que o status mude (`transicoes.ts:57`, `dados-da-decisao.ts:126`).
- Minor, para depois: os buscadores de demanda do seed em `e2e/axe-todas.spec.ts` e `e2e/pedido-construcao.spec.ts` podem passar a usar a `demandaDoSeed` com paginação. Não estão no B-01 e não foram lidos nesta triagem.
- Para a `04-regressao`: confirmar no relatório `list` que as cópias do `--repeat-each=3` de cada arquivo rodaram em sequência. Se não rodarem, registrar a ordem observada.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0003-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4` — 3cdf8e5 (01-reproducao) sobre 30b71b5 (main 0.1.1)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 30b71b5~1 30b71b5 --stat` — o 0.1.1 mudou também `test/estatico/projeto.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 30b71b5~1 30b71b5 -- test/estatico/projeto.test.ts` — o teste confere a versão do `package.json`

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
