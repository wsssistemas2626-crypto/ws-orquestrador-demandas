# Notas de versão

Registro do que entra em cada versão do WS Orquestrador de Demandas e do que fica pendente. Dono:
`documentacao-tecnica` (sistema: Fabiano).

## 0.1.4 — 2026-11-02

Correção do pedido `DEC-DEM-20261102-0005-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.3 (`00a924e`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

**Nenhum comportamento do sistema muda.** Mudaram só `e2e/decisao.spec.ts`, a conferência da versão em
`test/estatico/projeto.test.ts`, o campo `version` do `package.json`, e entrou o teste novo
`test/estatico/decisao-e2e.test.ts`. Não mudaram `src/`, `scripts/`, `drizzle/`, `.github/`, `Dockerfile`,
`playwright.config.ts` nem `e2e/apoio.ts`. Não há migration nova nem variável de ambiente nova. O axe não achou
violação na tela arquivada, então a tela não precisou de correção. A imagem só difere da 0.1.3 no `package.json`:
`e2e/` e `test/` não entram nela.

Fecha as duas pendências da revisão da 0.1.3 (seção abaixo): a B-1 estética do cabeçalho da `decisao.spec.ts` e o
estado arquivado sem axe.

### O que mudou

- **O teste "Arquivar" passa pelo axe na tela arquivada** (`e2e/decisao.spec.ts:348`). Depois do alerta "Pacote
  arquivado. A demanda foi para Encerrada." e das conferências `statusDecisao` `arquivada` e status `encerrada`, ele
  chama `semViolacoes(page, 'T11 arquivado')` (`:366`). A chamada é a mesma dos outros estados, sem regra desligada nem
  elemento excluído. A pré-condição (`exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), ...)`) e as
  conferências de status antes e depois de arquivar continuam iguais às da 0.1.3. Com isso, uma violação de
  acessibilidade na tela arquivada passa a reprovar o CI.
- **Comentário do cabeçalho da `decisao.spec.ts`** (`:1-28`): a quebra das linhas foi refeita, sem linha órfã e com no
  máximo 120 caracteres por linha (antes, as linhas 1, 3, 6 e 20 passavam disso, e a linha 7 tinha só "(08-correcao,
  A-04: o nível"). A frase do axe passou a listar todos os estados que têm axe: pendente (com e sem rascunho de agente),
  com erro, com o diálogo aberto, sem formulário, com o conflito da A-02, desatualizado e decidido (aprovado, aprovado
  nas duas contas, devolvido e arquivado). No diff, só mudaram linhas que começam com `//`.
- **Teste novo `test/estatico/decisao-e2e.test.ts`** (14 testes, só leitura de arquivo, sem banco nem relógio). Roda no
  `pnpm test` e confere:
  - que o cabeçalho da `decisao.spec.ts` não tem linha acima de 120 caracteres nem linha órfã, e que a frase do axe cita
    o arquivado;
  - que o "Arquivar" chama `semViolacoes(page, 'T11 arquivado')` uma vez, depois do alerta e das três conferências de
    status, sem navegação no meio, com a pré-condição e as conferências da 0.1.3;
  - que a spec só pula pela pré-condição, com mensagem;
  - que nenhum arquivo `e2e/**/*.ts` usa `disableRules`, `disableOtherRules`, `exclude`, `include`, `withRules` ou
    `options` do axe, e que só `e2e/apoio.ts` monta o `AxeBuilder`, com `TAGS_AXE`.
- **Versão:** o `package.json` passou de 0.1.3 para 0.1.4, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico, e o teste estático do axe no cap. 08 do manual;
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.4 (seção 4) e o rollback da 0.1.4
    (seção 6).

Não houve `.skip`, `.only`, `.fixme` ou `.todo` novo, nem asserção afrouxada. O axe (`semViolacoes` e `TAGS_AXE`), o
C-36 e a A-02 ficaram iguais, e `retries`, `workers` e `fullyParallel` não mudaram.

### Verificações desta versão

- `pnpm test`: 193 arquivos, 3.711 de 3.711, com os 14 testes novos (`04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, sem teste pulado, três vezes seguidas, cada uma com banco
  novo. Nas três, o "Arquivar" aparece aprovado, e não pulado (`04-qa-automacao.md`).
- `e2e/decisao.spec.ts --repeat-each=3` num banco só, sem `CI`: 19 passaram, 8 pulados e nenhuma falha. A 1.ª
  repetição passa os 9 testes, o "Arquivar" com o axe do arquivado incluído; a 2.ª e a 3.ª passam 5 (C-14, M-01, P1-b,
  A-02 e o de 404 e sessão) e pulam 4 ("nível cto: aprovar A", "dupla aprovação", "CA-12.4" e "Arquivar"). O reporter
  JSON mostrou a mensagem `exige banco recém-semeado: ...` em cada pulo.
- Controle negativo do axe, temporário e desfeito: com um `<img>` sem `alt` injetado na tela arquivada, o "Arquivar"
  reprovou com `axe em T11 arquivado`, regra `image-alt`. Sem a linha `semViolacoes` nova, o teste estático reprovou.
- Largura do cabeçalho: a linha mais longa tem 120 caracteres, medida pelo teste estático e conferida com `awk` na
  revisão (`04-maestro.md`).
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico, alto ou médio; dois baixos (abaixo).
- `docker build` local: imagem de 1,74 GB em disco e 425 MB de conteúdo, praticamente igual à 0.1.3, nada publicado
  (`05-devops-sre.md`).
- A homologação (`construir.mjs homologar`), o ensaio de rollback (`construir.mjs ensaiar-rollback`) e o CI do PR ficam
  para a Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), em testes e sem efeito no sistema:

- **B-1 (baixo), para quem mexer em `test/estatico/decisao-e2e.test.ts` ou em `e2e/apoio.ts`.** A trava "nenhum e2e
  desliga o axe" (`test/estatico/decisao-e2e.test.ts:186` e `:193-199`) não pega um `r.violations.filter(...)` posto em
  `e2e/apoio.ts` antes do `map`, e a varredura `e2e/**/*.ts` não olha `.tsx`, `.js` nem `.mjs`. Nada foi afrouxado
  neste pedido: é um limite do teste novo.
- **B-2 (baixo), para quem refatorar `e2e/decisao.spec.ts` ou `e2e/apoio.ts`.** O teste estático
  (`test/estatico/decisao-e2e.test.ts:144-150` e `:196-198`) confere trechos exatos do código desses arquivos (a linha
  de `ORIGENS_DO_FLUXO`, o `if (process.env.CI)`, o `new AxeBuilder`). Uma refatoração legítima reprova o teste e exige
  atualizá-lo junto. É de propósito: mudar esses controles exige decisão explícita.
- **Prettier fora do CI.** O `prettier --check` acusa 548 arquivos da `main`, inclusive os desta versão. O Prettier não
  está no CI nem no `pnpm lint`. Se o time quiser, cabe num pedido próprio.
- Para Fabiano: continuam as pendências da primeira publicação registradas nos PR #1 a #5 (abaixo).

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.4`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.4 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.4, e as mesmas 7 migrations da 0.1.0. A 0.1.4 não traz migration: a seção 5 (backup → migrate → deploy) não se
  aplica a ela.
- **Rollback da 0.1.4** pelo caminho A (só trocar a imagem de `worker` e `app`, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:00a924ec746d731c9c0c9fb9a95bcf4c6d7f3c17` (a `v0.1.3`, merge
  do PR #5). Antes de voltar, confirme a tag em Packages: o `devops-sre` não conferiu o GHCR. Na cadeia curta a volta
  não foi ensaiada: o ensaio é o `ensaiar-rollback` da Parada 3.
- **Conferência do `.env.example` sem grep nesta versão.** Como `src/` não mudou, ela se apoia no diff vazio e na
  conferência com grep da 0.1.2. Nenhuma variável nova.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,74 GB, agora a da 0.1.4) ficou no Docker da VPS. Apagá-la depende
  de confirmação de Fabiano.

Continuam abertas, sem mudança: a N-04 da 0.1.3 (a API aceita criar e arquivar DEC numa demanda Encerrada, e o alerta
diz "A demanda foi para Encerrada." mesmo quando ela já estava), as pendências da 0.1.2 registradas nas outras etapas
(limite do C-36 em execuções repetidas, teste C-13 sensível a CPU, login TOTP em falhas em sequência, buscadores do
seed nas outras specs) e as da 0.1.0 (seções abaixo).

## 0.1.3 — 2026-11-02

Correção do pedido `DEC-DEM-20261102-0004-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.2 (`b8a8c44`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

**Nenhum comportamento do sistema muda.** Mudaram só `e2e/decisao.spec.ts`, a conferência da versão em
`test/estatico/projeto.test.ts` e o campo `version` do `package.json`. Não mudaram `src/`, `scripts/`, `drizzle/`,
`.github/`, `Dockerfile`, `playwright.config.ts`, `e2e/apoio.ts`, `e2e/preparacao.ts` nem a função
`exigeBancoRecemSemeado`. Não há migration nova nem variável de ambiente nova. A imagem só difere da 0.1.2 no
`package.json`: `e2e/` e `test/` não entram nela.

Fecha a B-01 da revisão da 0.1.2 (seção abaixo): o "Arquivar" aceitava a demanda já `encerrada` e passava sem provar a
mudança de status.

### O que mudou

- **O teste "Arquivar" prova a mudança para Encerrada também fora do CI** (`e2e/decisao.spec.ts:346`, título
  `Arquivar → "Pacote arquivado. A demanda foi para Encerrada."`, sem o "; 404 e sem sessão" de antes).
  - A pré-condição (`:353`) aceita só a partida de um status de `ORIGENS_DO_FLUXO` (`nova`, `em_analise`,
    `aguardando_informacao`, `pronta_para_decisao`), a origem da transição `decisao_arquivada`. `encerrada` deixou de ser
    aceita: dela, arquivar grava a decisão mas não muda o status.
  - Com a demanda já `encerrada` e sem a variável `CI`, o teste é pulado com a mensagem
    `exige banco recém-semeado: a demanda <DEM-id> está encerrada, e o arquivamento não prova a mudança para Encerrada`.
    Com `CI` (GitHub Actions e `construir.mjs homologar`), a mesma pré-condição falsa **reprova** o teste.
  - O teste confere o status antes e depois de arquivar: `pronta_para_decisao` depois do DEC novo e antes de arquivar
    (`:357`), `statusDecisao` `arquivada` no DEC (`:362`) e `encerrada` na demanda (`:363`). O alerta "Pacote arquivado.
    A demanda foi para Encerrada." é texto fixo e não serve de prova sozinho.
- **Teste novo de 404 e sessão, separado do "Arquivar"** (`e2e/decisao.spec.ts:367`,
  `404 para DEC inexistente, id de outro tipo e caminho inválido; sem sessão, a decisão vai para /entrar`). As
  conferências que estavam no fim do "Arquivar" (três caminhos com 404 e o redirecionamento para `/entrar` sem sessão)
  foram para ele, sem perder nenhuma. Não tem pré-condição nem POST e roda em qualquer banco, inclusive quando o
  "Arquivar" é pulado numa execução repetida. A sessão usa o DEC de rascunho de agente do seed, e o 404 usa a versão
  seguinte à mais nova, lida no próprio teste.
- **Comentário do cabeçalho da `decisao.spec.ts`:** o "Arquivar" passou para a lista dos testes que exigem banco
  recém-semeado, e o de 404 e sessão foi para a dos que rodam em qualquer banco.
- **Versão:** o `package.json` passou de 0.1.2 para 0.1.3, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico;
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.3 (seção 4) e o rollback da 0.1.3
    (seção 6).

Não houve `.skip`, `.only`, `.fixme` ou `.todo` novo, nem asserção afrouxada. O axe (`semViolacoes`), o C-36 e a A-02
ficaram iguais, e `retries`, `workers` e `fullyParallel` não mudaram.

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (`03-engenheiro-frontend.md` e `04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 143 de 143, sem teste pulado, três vezes seguidas, cada uma com banco
  novo (`04-qa-automacao.md`).
- `e2e/decisao.spec.ts --repeat-each=3` num banco só, sem `CI`: 19 passaram, 8 pulados com a mensagem
  `exige banco recém-semeado: ...` e nenhuma falha. A 1.ª repetição passa os 9 testes; a 2.ª e a 3.ª passam 5 (C-14,
  M-01, P1-b, A-02 e o de 404 e sessão) e pulam 4 ("nível cto: aprovar A", "dupla aprovação", "CA-12.4" e
  "Arquivar").
- Reprodução do defeito, `--grep "Arquivar" --repeat-each=2`: com as conferências novas e a pré-condição antiga, a 2.ª
  repetição falhou em "antes de arquivar" (esperado `pronta_para_decisao`, recebido `encerrada`); com a correção, ela é
  pulada com a mensagem (`03-engenheiro-frontend.md`).
- Revisão de código e de segurança (`04-maestro.md`): nenhum achado crítico, alto ou médio.
- `docker build` local: imagem de 1,73 GB em disco e 425 MB de conteúdo, igual à 0.1.2, nada publicado
  (`05-devops-sre.md`).
- O ramo com `CI` do "Arquivar" foi provado pela leitura: a prova executada fica com o `construir.mjs homologar` (que
  passa `CI`) e com o CI do PR, na Parada 3. A homologação e o ensaio de rollback (`construir.mjs ensaiar-rollback`)
  também ficam para a Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), em testes e sem efeito no sistema:

- **B-1 (baixo, estético), para quem mexer na `decisao.spec.ts` da próxima vez.** No comentário de cabeçalho
  (`e2e/decisao.spec.ts:6-8`), a quebra de linha deixou "(08-correcao, A-04: o nível" sozinho numa linha.
- **Axe no estado "arquivado" (observação, não é achado deste pedido).** O cabeçalho da `decisao.spec.ts` diz que o axe
  roda nos estados pendente, desatualizado, com erro e decidido, mas o estado arquivado não tem `semViolacoes`. Já era
  assim na 0.1.2. Se o time quiser cobrir, cabe num pedido próprio.
- Para Fabiano: continuam as pendências da primeira publicação registradas nos PR #1 a #3 (abaixo).

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.3`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.3 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.3, e as mesmas 7 migrations da 0.1.0. A 0.1.3 não traz migration: a seção 5 (backup → migrate → deploy) não se
  aplica a ela.
- **Rollback da 0.1.3** pelo caminho A (só trocar a imagem de `worker` e `app`, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:b8a8c4457dc0603ffb2fc30418cfe906d6684131` (a `v0.1.2`, merge
  do PR #4). Se essa tag não estiver em Packages, a alternativa com o mesmo código é a do merge do PR #3
  (`01a26a8321a1bd630c6bb1f70a8b68bfa5bd775f`). Antes de voltar, confirme a tag em Packages: o `devops-sre` não
  conferiu o GHCR. Na cadeia curta a volta não foi ensaiada: o ensaio é o `ensaiar-rollback` da Parada 3.
- **Conferência do `.env.example` sem grep nesta versão.** Como `src/` não mudou, ela se apoia no diff vazio e na
  conferência com grep da 0.1.2. Nenhuma variável nova.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB, agora a da 0.1.3) ficou no Docker da VPS. Apagá-la depende
  de confirmação de Fabiano.

Registrada nas outras etapas deste pedido, fora do escopo dele:

- **N-04, observação de produto** (`01-qa-funcional.md`, `02-tech-lead.md`, `04-qa-automacao.md`): a API aceita criar e
  arquivar DEC numa demanda Encerrada, e o alerta diz "A demanda foi para Encerrada." mesmo quando ela já estava. Fica
  para uma demanda própria, se Fabiano quiser, com o `analista-requisitos`.

Continuam abertas, sem mudança, as pendências da 0.1.2 registradas nas outras etapas (limite do C-36 em execuções
repetidas, teste C-13 sensível a CPU, login TOTP em falhas em sequência, buscadores do seed nas outras specs) e as da
0.1.0 (seção abaixo).

## 0.1.2 — 2026-11-02

Correção do pedido `DEC-DEM-20261102-0003-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.1 (`30b71b5`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

**Nenhum comportamento do sistema muda.** Mudaram só os testes e2e, o comentário do topo do `playwright.config.ts`, a
conferência da versão em `test/estatico/projeto.test.ts` e o campo `version` do `package.json`. Não mudaram `src/`,
`scripts/`, `drizzle/`, `.github/`, `Dockerfile`, `e2e/servidor.ts` nem nenhuma linha de configuração do Playwright
(`workers: 1`, `retries: 0`, `fullyParallel: false`, `forbidOnly`, `webServer`). Não há migration nova nem variável de
ambiente nova. A imagem só difere da 0.1.1 no `package.json`: `e2e/`, `test/` e `playwright.config.ts` não entram nela.

Fecha as pendências M-01, B-01 e B-02 de teste registradas na 0.1.1 (seção abaixo).

### O que mudou

- **M-01: a preparação da demanda da `decisao.spec.ts` completa uma falha parcial.** Antes, ela olhava só se a demanda
  tinha ESP e, se não tinha, criava a ESP e o RSK juntos. Se o RSK falhasse depois de a ESP gravar, as execuções
  seguintes pulavam o RSK, e os testes de decisão recebiam 400 `Faltam itens para o pacote.` até um seed novo. Agora a
  função `prepararEspERsk` (`e2e/preparacao.ts`, arquivo novo) confere a lista de ESP e a de RSK separadamente e cria só
  o que falta, primeiro a ESP. A falha de uma criação não é engolida: o teste reprova, e a chamada seguinte completa o
  que ficou faltando, sem versão a mais. A dupla aprovação usa a mesma preparação.
- **B-01: o duplo clique e a T07 não supõem mais `v1`** (`e2e/parecer-risco-qa.spec.ts`). Os dois leem a lista de RSK
  ou de ESP antes de agir e calculam o id esperado com `proximoId` (`e2e/preparacao.ts`): a versão mais nova mais 1, pelo
  número. O id vai no botão `Gravar`, com nome exato (sem isso, `-v1` casaria com `-v10`), na URL, no alerta e no corpo
  da Server Action. Depois de agir, a lista tem de ser exatamente a versão nova na frente e as antigas na mesma ordem. A
  T07 lê o `escopoInclui` da versão de id esperado, e não da primeira da lista. O sentinela do duplo clique passou a ser
  gerado em cada execução.
- **B-01: a `decisao.spec.ts` confere o estado de partida antes de agir.** "nível cto: aprovar A", "dupla aprovação" e
  "CA-12.4" precisam de uma demanda sem DEC aprovado ou num status de onde o fluxo ainda anda (`nova`, `em_analise`,
  `aguardando_informacao`, `pronta_para_decisao`). A conferência roda depois das leituras e antes de qualquer criação:
  - sem a variável `CI`, o teste é pulado com a mensagem `exige banco recém-semeado: <motivo>`;
  - com `CI` (GitHub Actions e `construir.mjs homologar`), a pré-condição falsa **reprova** o teste. Nesses ambientes o
    banco é sempre novo, e a pré-condição falsa ali é defeito.

  O teste pulado não gasta o limite do C-36 nem deixa estado no banco. Não há `return` silencioso, `test.skip` sem
  condição nem exceção à A-02 ou ao C-36.
- **Teste novo da A-02** em `e2e/decisao.spec.ts`, que roda em qualquer banco: com um DEC aprovado na demanda, aprovar
  outro mostra `Não foi possível concluir: outro pacote desta demanda já está aprovado.`, o pacote novo continua
  `pendente` e a demanda tem exatamente um DEC `aprovada`. O axe roda também nesse estado da T11.
- **Teste novo da M-01** em `e2e/decisao.spec.ts`: chama a preparação duas vezes contra o banco e confere que a lista
  vazia ganha só a v1 e a que já tinha versão fica igual.
- **`e2e/preparacao.spec.ts`, arquivo novo:** 12 testes sem navegador e sem API, com falsos, para `prepararEspERsk`
  (inclusive a falha parcial e a falha que se propaga), `procurarEmPaginas` e `proximoId`.
- **Busca no seed com paginação.** `demandaDoSeed` (`e2e/apoio.ts`) e a busca do DEC de rascunho de agente da
  `decisao.spec.ts` percorrem as páginas de 100 com `offset` até achar o item ou chegar ao total. Antes, liam só a
  primeira página.
- **Versão do 404 calculada.** O teste "Arquivar" usava `DEC-<demanda>-v9` como versão inexistente, que passa a existir
  na 3.ª execução contra o mesmo banco. Agora usa a versão seguinte à mais nova, lida logo antes.
- **Comentário do `playwright.config.ts`** (linhas 4-9): descreve as duas fontes de dado do e2e, o seed fictício e a API
  pela sessão da página. Diz também que as demandas do seed acumulam versões e decisões entre execuções contra o mesmo
  banco, e que o teste que precisa de banco recém-semeado diz isso ao ser pulado.
- **Versão:** o `package.json` passou de 0.1.1 para 0.1.2, e `test/estatico/projeto.test.ts` confere a versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico, e no `README.md` o que acontece ao rodar o e2e de novo contra o mesmo
    banco;
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.2 (seção 4) e o rollback da 0.1.2
    (seção 6).

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (`03-engenheiro-frontend.md` e `04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 142 de 142, sem teste pulado, três vezes seguidas, cada uma com banco
  novo (`04-qa-automacao.md`).
- As três specs do achado com `--repeat-each=3` num banco só: 75 passaram, 6 pulados com a mensagem
  `exige banco recém-semeado: ...` (só "aprovar A", "dupla aprovação" e "CA-12.4", na 2.ª e na 3.ª repetição) e nenhuma
  falha.
- Rodada com a M-01 forçada pelo estado (só a ESP gravada, sem o RSK): passou com a correção e falhou com a guarda
  antiga (`04-qa-automacao.md`).
- `docker build` local: imagem de 1,73 GB em disco e 425 MB de conteúdo, igual à 0.1.1, nada publicado
  (`05-devops-sre.md`).
- A homologação (`construir.mjs homologar`) e o ensaio de rollback (`construir.mjs ensaiar-rollback`) ficam para a
  Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), em testes e sem efeito no sistema:

- **B-01 desta revisão (baixo), para o `qa-automacao` num pedido seguinte.** Numa execução repetida, o teste "Arquivar"
  (`e2e/decisao.spec.ts:348`) aceita a demanda que já está `encerrada`. Nesse caso, a conferência de que o status passou
  a `encerrada` passa sem provar a mudança. No CI e no `homologar`, com banco novo, a mudança continua provada.
  Sugestão: no CI, exigir só os status de onde o fluxo anda; fora dele, anotar no teste que a mudança de status não foi
  conferida.
- Para Fabiano: continuam as pendências da primeira publicação registradas nos PR #1 e #2 (abaixo).

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.2`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.2 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.2, e as mesmas 7 migrations da 0.1.0.
- **Rollback da 0.1.2** pelo caminho A (só trocar a imagem, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:30b71b5185cb58d403847b95532e54b5a299e77a` (a `v0.1.1`). Antes
  de voltar, confirme a tag em Packages. Na cadeia curta ele não foi ensaiado: o ensaio é o `ensaiar-rollback` da
  Parada 3.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB, agora a da 0.1.2) ficou no Docker da VPS. Apagá-la depende
  de confirmação de Fabiano.

Registradas nas outras etapas deste pedido, fora do escopo dele:

- **Limite do C-36 em execuções repetidas** (`02-tech-lead.md`, N-02): a suíte e2e **inteira** rodada duas vezes na
  mesma hora contra a mesma homologação recebe 429, porque a conta "cto" cria 27 demandas por execução e o limite é 30
  por hora. É o controle funcionando. Contra a mesma homologação, a 2.ª execução completa só vale com uma hora de
  intervalo.
- **N-04, observação de produto** (`01-qa-funcional.md`, `02-tech-lead.md`): a API cria DEC numa demanda Encerrada, e a
  devolução depois disso mostra "A demanda voltou para Em análise." sem que o status mude. Fica para uma demanda
  própria, se Fabiano quiser, com o `analista-requisitos` (relaciona-se com a M-02 da 0.1.0).
- **Teste C-13 sensível a CPU disputada** (`04-qa-automacao.md`): `src/modules/pacotes-decisao/concorrencia.test.ts:73`
  estourou os 30 s com o `pnpm test` rodando junto do lint e do typecheck, e passou sozinho. Para o `tech-lead` e a
  `qualidade`.
- **Login TOTP em falhas em sequência** (`04-qa-automacao.md`): quando vários testes falham em menos de 1 s, o login da
  conta "cto" na mesma janela do TOTP é recusado (`e2e/apoio.ts:39`), e isso esconde a causa real da falha. Para o
  `tech-lead`, numa demanda própria.
- **Buscadores do seed nas outras specs** (`02-tech-lead.md`, minor): `e2e/axe-todas.spec.ts` e
  `e2e/pedido-construcao.spec.ts` ainda têm busca própria, só na primeira página de 100 (`limit=100`, sem `offset`), e
  podem passar a usar a `demandaDoSeed` de `e2e/apoio.ts`, que pagina.
- **Arquivos de apoio da regressão** (`04-qa-automacao.md`): em `e2e/test-results/`, ignorado pelo git, ficaram o
  reporter auxiliar de contagem e os JSONs das execuções. Não entram em commit; podem ser apagados.

Continuam abertas, sem mudança, as pendências da 0.1.0 (seção abaixo): os médios M-01 a M-07 e o médio novo do
reteste, a leitura do QR com aparelho real, a configuração do pipeline e do Easypanel e as pendências das outras áreas
antes de ligar agente.

## 0.1.1 — 2026-11-02

Correção do pedido `DEC-DEM-20261102-0002-v1` (cadeia curta, tipo bug), sobre a `main` da 0.1.0 (`dd8ddee`). Ainda
não foi publicada: o merge, a publicação e a configuração no Easypanel são de Fabiano.

**Nenhum comportamento do sistema muda.** Mudaram só testes e2e, o seed fictício e a versão. Não mudaram `src/`,
`drizzle/`, `.github/`, `Dockerfile`, `playwright.config.ts` nem `e2e/servidor.ts`. Não há migration nova nem variável de
ambiente nova. A imagem só difere da 0.1.0 no `scripts/seed-ficticio.ts` e no `package.json`.

### O que mudou

- **Três testes e2e instáveis no CI do PR #1** (execução 41249512830, commit `e0f3933`) foram estabilizados, e nenhum
  deles verifica menos do que antes:
  - **`document-title` falso** em "T12 com agente ligado" (`e2e/agentes-teto.spec.ts`) e em "T11 decidido"
    (`e2e/decisao.spec.ts`). Depois de uma Server Action, o Next 16 re-renderiza a página, e o `<title>` chega por
    streaming depois do corpo. O axe rodava nesse intervalo. Agora `semViolacoes` (`e2e/apoio.ts`) espera a página ter
    `<title>` não vazio por até 5 s antes de rodar o axe. Se o título não chegar, o axe roda assim mesmo e reprova pela
    regra `document-title`. As `TAGS_AXE` são as mesmas, e nenhuma regra foi desligada ou filtrada.
  - **429 em "T07 da ESP com a correção da Lista de textos"** (`e2e/parecer-risco-qa.spec.ts`). A conta "cto" fechava a
    suíte com 30 de 30 demandas na hora. Quando um teste da `decisao.spec.ts` falhava, o worker novo do Playwright criava
    a 31ª demanda. Agora a T07, o duplo clique do parecer de risco e a `decisao.spec.ts` usam demandas fictícias do seed,
    pela função nova `demandaDoSeed` (`e2e/apoio.ts`), e não criam demanda pela API. A `decisao.spec.ts` deixou de
    guardar a demanda numa variável do módulo, e um worker novo não cria mais demanda. Com isso, a "cto" fecha a suíte
    com 27 de 30. O limite do C-36 (`conferirLimite`, 30 demandas por hora por ator) não mudou e continua testado em
    `src/modules/limites.test.ts` e `src/app/api/demandas/demandas.bordas.test.ts`.
- **Teste novo `e2e/sem-violacoes.spec.ts`**, em `/configuracao/agentes`, com dois casos:
  - corrida: o `<title>` volta 500 ms depois do corpo. Tem de passar, e antes da correção falhava com `document-title`;
  - controle negativo: uma tela sem `<title>` continua reprovada pela regra `document-title`.
- **Seed fictício** (`scripts/seed-ficticio.ts`): entraram três demandas próprias do e2e, de tipo `melhoria`, em Nova,
  sem versão e criadas pela conta fictícia `sem2fa`:
  - "Demanda da decisão (fictício)";
  - "Duplo clique no parecer de risco (fictício)";
  - "Lista de textos da especificação (fictício)".

  O seed passa de 11 para 14 demandas: 5 da conta `cto` e 9 próprias do e2e (`TITULOS_DO_E2E`). As regras do seed
  continuam as mesmas, inclusive a guarda `SEED_FICTICIO=1` com banco vazio. Os testes estão em `scripts/scripts.test.ts`.
- **Versão:** o `package.json` passou de 0.1.0 para 0.1.1, e o teste estático `test/estatico/projeto.test.ts` confere a
  versão nova.
- **Documentação:**
  - estas notas;
  - a versão no `README.md` e no manual técnico;
  - a verificação do axe no cap. 08 do manual e o seed no cap. 10;
  - em `docs/operacao/deploy.md`: a versão, a primeira publicação com a 0.1.1 (seção 4) e o rollback da 0.1.1 (seção 6).

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (`03-engenheiro-frontend.md` e `04-qa-automacao.md`).
- `pnpm lint` e `pnpm typecheck` limpos.
- `pnpm test:e2e`, contra o build de produção: 128 testes em 22 arquivos, verde três vezes seguidas, sem mudança de
  código entre as corridas. Houve também uma corrida com uma falha forçada e temporária em `decisao.spec.ts`: só o teste
  forçado falhou, e não houve 429 no fim (`04-qa-automacao.md`).
- `docker build` local: imagem de 1,73 GB em disco e 425 MB de conteúdo, nada publicado (`05-devops-sre.md`).
- A homologação (`construir.mjs homologar`) e o ensaio de rollback (`construir.mjs ensaiar-rollback`) ficam para a
  Parada 3.

### Pendências abertas

Da revisão deste pedido (`04-maestro.md`), em testes e sem efeito no sistema:

- **M-01 deste pedido (médio), para o `qa-automacao` num pedido seguinte.** Em `e2e/decisao.spec.ts:39`, a guarda só
  confere se a demanda já tem ESP. Quando não tem, cria a ESP e o RSK juntos. Se o RSK falhar depois de a ESP ser
  gravada, o próximo worker acha a ESP e pula o RSK, e os testes de aprovar e decidir falham até um seed novo.
  Correção: conferir o RSK à parte.
- **B-01:** o duplo clique, a T07 e a `decisao.spec.ts` só passam com banco recém-semeado. Isso vale no CI e no
  `homologar`, que apaga os volumes. Duas corridas contra a mesma homologação fazem esses testes falharem.
- **B-02:** o comentário de `playwright.config.ts:4` ainda diz "Os dados de cada teste são criados pela API", o que já
  não vale para as demandas do seed. O arquivo está fora do que a etapa de documentação edita, então a correção fica
  para quem pode editar o arquivo.
- **Minor da triagem:**
  - `demandaDaDupla` (`e2e/decisao.spec.ts`) e os buscadores de demanda do seed nas outras specs podem passar a usar
    `demandaDoSeed`;
  - `demandaDoSeed` e `demandaDaDupla` procuram só entre as 100 primeiras demandas `melhoria`. Hoje a suíte usa perto de
    70. Se a suíte crescer, a busca deve filtrar pela API.

Da entrega (`05-devops-sre.md`), para Fabiano:

- **Segredos `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.** Ainda não existem no GitHub. Até existirem:
  - todo push na `main` publica a imagem no GHCR (`:<sha>`, `:v0.1.1`, `:latest`) e fica vermelho no passo "Disparar o
    Easypanel", sem deploy;
  - a limpeza das versões antigas do GHCR não roda, e o pacote acumula mais de 2 versões.

  O merge da 0.1.1 cai nesse caso. Antes de qualquer passo, tire um snapshot da VPS no hPanel.
- **Primeira publicação de verdade** pela seção 4 do `docs/operacao/deploy.md`, com a `:latest`, que depois do merge é
  a 0.1.1, e as mesmas 7 migrations da 0.1.0.
- **Rollback da 0.1.1** pelo caminho A (só trocar a imagem, sem restaurar backup), para
  `ghcr.io/wsssistemas2626-crypto/ws-orquestrador-demandas:dd8ddee6d8a30cda8dff0f1a45f0abe30db8f364` (a `v0.1.0`). Na
  cadeia curta ele não foi ensaiado: o ensaio é o `ensaiar-rollback` da Parada 3.
- Continuam de antes, sem mudança neste pedido: as actions por SHA e a imagem de cerca de 1,7 GB por causa do `tsx`
  (seção 10 do `deploy.md`).
- A imagem local `ws-orquestrador-demandas:local` (1,73 GB) ficou no Docker da VPS. Apagá-la depende de confirmação de
  Fabiano.

Continuam abertas, sem mudança, as pendências da 0.1.0 (seção abaixo):

- os médios M-01 a M-07 e o médio novo do reteste;
- a leitura do QR com aparelho real;
- a configuração do pipeline e do Easypanel;
- as pendências das outras áreas antes de ligar agente.

## 0.1.0 — 2026-10-31

Primeira versão, construída pelo `/construir` a partir do pedido `DEC-DEM-20261022-0001-v1` (spec aprovada na
Parada 1 em `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md`). Ainda não foi publicada: o merge
na `main`, o deploy e a configuração no Easypanel são de Fabiano.

### O que entrou

- **Entrada de demanda** pelo painel (colando o texto recebido) e pela API, com id `DEM-AAAAMMDD-NNNN` de sequência
  global. O texto bruto fica em tabela própria, só uma pessoa o lê, e um job diário o expurga depois de 90 dias
  (configurável de 1 a 365).
- **ESP, RSK e DEC em versões imutáveis.** O papel da aplicação só tem `SELECT` e `INSERT` nessas tabelas. DEC sem
  ESP ou sem RSK é recusado com a lista do que falta. DEC com ESP ou RSK mais nova fica marcado como desatualizado e
  não pode ser aprovado.
- **Decisão só por pessoa com 2FA**: aprovar com a opção A ou B, devolver ou arquivar. No nível
  `cto_e_administradora`, a aprovação só vale com as duas aprovações na mesma opção, e a da administradora exige a
  referência ao documento assinado. Só o DEC mais novo da demanda pode ser decidido, e nunca dois aprovados.
- **Pedido de Construção** gerado de DEC aprovado e atualizado, validado pela cópia do `validarPedido` do
  `/construir`, idêntico byte a byte para o mesmo DEC, para baixar e copiar à mão. Tipo `estudo` não gera pedido.
  Pedido com e-mail, telefone ou CPF é recusado.
- **Status da demanda** em nove valores, com tabela fechada de transições; quatro automáticas e o resto manual. Dúvida
  em aberto leva a `aguardando_informacao`, sem mensagem ao solicitante.
- **Histórico** só de inclusão, com pessoa, agente ou sistema, sem texto livre de terceiro.
- **Quatro agentes de IA** (orquestrador, insumo técnico, risco, consolidação) como jobs do pg-boss, com saída
  validada pelo mesmo schema da API, execução única, 3 tentativas, uso e custo por chamada, teto mensal em US$ que
  suspende os agentes e minimização do que vai ao provedor. **Nascem desligados, com teto 0 e sem chave de API.** O
  DEC de agente nasce sempre com dupla aprovação.
- **Aviso por e-mail** (Resend) de DEC pronto, uma vez por DEC, só com ids e link. Sem chave, não envia.
- **Acesso**: login com senha e TOTP obrigatório, sem cadastro público, sessão de 8 h, limite de login por IP e
  bloqueio da verificação por conta; tokens de serviço por agente, só por Bearer, guardados como hash; matriz de
  acesso com teste de acesso negado em toda rota.
- **Painel em pt-BR** com 12 telas, axe sem violação em cada uma.
- **Operação**: `Dockerfile` multiestágio, CI (`lint`, `typecheck`, `test`, `test:e2e`, `pnpm audit --prod
  --audit-level high`, gitleaks, `docker build`), `deploy.yml` para o GHCR e os webhooks do Easypanel (só sem
  migration nova), homologação local por `docker-compose.hml.yml`, `GET /api/saude` que confere a última migration,
  rollback descrito em `docs/operacao/deploy.md`.
- **Documentação**: `README.md`, `docs/manual-tecnico/` (um capítulo por grupo de RF), `docs/operacao/deploy.md` e
  estas notas.

### Correções feitas na revisão (08) antes de fechar a versão

- S-01 (crítico): dependências com vulnerabilidade conhecida. `next` e `eslint-config-next` 16.3.8 → **16.4.1**,
  `better-auth` 1.7.6 → **1.7.7**, `zod` 4.6.5 → **4.6.6**, com `overrides: zod: 4.6.6` no `pnpm-workspace.yaml` para
  o `zod` que vem pelo better-auth. `pnpm audit --prod --audit-level high` termina com código 0.
- A-01 (alto): decidir um DEC que não é o mais novo da demanda dá 409.
- A-02 (alto): aprovar um DEC com outro já aprovado na demanda dá 409.
- A-03 (alto): o pedido de DEC desatualizado dá 409, e a tela esconde a seção.
- A-04 (alto): o nível de aprovação saiu da saída do agente de consolidação; DEC de agente nasce `cto_e_administradora`.
- A-05 (alto): CI criado na etapa 09 (falta só fixar as actions por SHA, abaixo).

### Verificações desta versão

- `pnpm test`: 192 arquivos, 3.697 de 3.697 (08-correcao).
- `pnpm lint` e `pnpm typecheck` limpos.
- Homologação (`construir.mjs homologar`): saúde 200 e e2e com 126 testes passando contra a imagem.
- Ensaio de rollback: primeira publicação, as 7 migrations não alteram dado existente.
- `docker build` local: imagem de 1,74 GB em disco (426 MB comprimidos).

### Pendências abertas para Fabiano

Segurança, nível médio (decidir na Parada 3 se entram numa correção antes do merge ou vão a `gestao-riscos` como
risco residual; o `seguranca-aplicacao` não aceita risco residual sozinho):

- **M-01**: a consolidação lê o RSK da chave da execução, mas o DEC cita o RSK mais novo; o resumo pode vir de outro
  parecer (`src/modules/agentes/entrada-agente.ts`).
- **M-02**: criar ESP, RSK ou DEC não confere o status da demanda; numa demanda `encerrada` ou `entregue`, dispara
  agente, aviso e possível pedido (`src/modules/pacotes-decisao/criar.ts`).
- **M-03**: erro inesperado no envio do aviso gasta as novas tentativas sem somar `aviso_email.tentativas`, e o aviso
  pode ficar `pendente` para sempre; a recusa definitiva do Resend (4xx) é tentada de novo
  (`src/jobs/aviso-dec-pronto.ts`).
- **M-04**: o `no-store` das páginas era conferido só no `next dev`. Resolvido no e2e local, que agora roda contra o
  build de produção, e conferido na homologação com `BASE_URL`; segue na lista para o registro da decisão.
- **M-05**: erro não tratado em página ou layout sai pelo `console` do Next, fora do log por lista de permissão
  (`src/modules/acesso/exigir-pessoa.ts`, `src/app/(painel)/layout.tsx`).
- **M-06**: o token de agente lê `solicitanteNome`, anexos e o nome da conta autora pela API, contornando a
  minimização (`src/modules/demandas/consultas.ts`).
- **M-07**: o seed cria contas com senha e segredo TOTP que estão no git; a guarda é `SEED_FICTICIO=1` com banco vazio.
  Controle operacional: `SEED_FICTICIO` nunca no serviço de produção (`docs/operacao/deploy.md`, seção 7).
- **Médio novo do reteste (08)**: a regra "nunca dois DEC aprovados" junto com a do desatualizado pode deixar a
  demanda sem saída. O v1 é aprovado, entra uma ESP ou um RSK novos, o pedido do v1 dá 409 e o v2 não pode ser
  aprovado. Saídas possíveis: recusar ESP, RSK e DEC novos numa demanda com DEC aprovado (trata também a M-02), ou
  deixar aprovar o mais novo quando o aprovado anterior estiver desatualizado. Decisão de Fabiano ou do `tech-lead`.
- **5 vulnerabilidades moderadas** no `pnpm audit --prod`; o portão é `--audit-level high`, e elas não bloqueiam.

Configuração e pipeline (fora do `/construir`; passo a passo em `docs/operacao/deploy.md`, seções 2 e 10):

- Fixar por SHA completo `actions/checkout@v5` e `actions/setup-node@v5` nos dois workflows, e por digest a imagem
  `ghcr.io/gitleaks/gitleaks:v8.28.0`. Sem isso, o C-39 (A-05) não fecha por inteiro.
- Segredos do GitHub `EASYPANEL_WEBHOOK_APP` e `EASYPANEL_WEBHOOK_WORKER`.
- Credencial de leitura de pacotes (`read:packages`) do GHCR no Easypanel.
- Acesso **Admin** das Actions do repositório ao pacote no GHCR, para a limpeza das versões antigas.
- Variáveis dos serviços `app` e `worker` no Easypanel, só pelo nome, como na seção 3 do `deploy.md`; papel
  `orquestrador_app` criado no banco de produção com senha nova.
- Primeira execução do gitleaks: as senhas fictícias da homologação, do seed e do e2e podem ser acusadas; a triagem é
  do `seguranca-aplicacao`.

Aceite (UAT):

- Ler o QR da tela de 2FA com o Google Authenticator e com o Microsoft Authenticator (cenário U-01 do
  `07-qa-funcional.md`), com aparelho real.

Para outras áreas, antes de ligar qualquer agente em produção (`docs/manual-tecnico/06-agentes-de-ia.md`):

- `juridico-contratos`: confirmar os 90 dias do texto bruto, os 5 anos depois do status final, as bases legais e a
  transferência internacional (J-01).
- `compliance-governanca`: registro da operação de tratamento (J-02).
- `gestao-riscos`, com aceite de Fabiano: risco residual de nome em texto livre que chega ao provedor e de instrução
  injetada que passe pela revisão humana (J-03).
- Fabiano: chave da API no CNPJ (CA-E-03), teto mensal e preço do modelo.

Documentação fora do repositório do sistema ou do código, que esta etapa não edita:

- RNF-01 da spec e do `01-analista-requisitos.md`, a linha de stack do plano e o `padrao-tecnico.md` da
  estruturaAutonoma ainda citam Next 16.3.8, Zod 4.6.5 e Better Auth 1.7.6. O `padrao-tecnico.md` pede ADR para mudar
  de linha do Next (16.3 → 16.4), e a troca foi feita como correção de segurança, sem ADR.
- Comentários e nomes de teste ainda citam "Better Auth 1.7.6" (por exemplo, `src/modules/acesso/bloqueio-verificacao.ts:5`).

Backlog (baixo): B-01 a B-07 do `08-maestro.md`; `gerarPedido` sem a trava da demanda antes de ler `desatualizado`;
imagem de 1,74 GB por levar as dependências de desenvolvimento; textos QF-01 a QF-04 e D-01 a D-06 para a
`ux-ui-design`.

### Fora desta versão

Entrada automática por e-mail ou chat, envio automático do pedido ao `/construir` e retorno de andamento, upload de
anexo, mensagem ao solicitante, cadastro público e recuperação de senha por e-mail, mais de uma empresa na mesma base,
opções C e D na decisão, job de anonimização de 5 anos.
