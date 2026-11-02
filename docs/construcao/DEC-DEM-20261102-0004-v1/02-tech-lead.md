---
pedido: DEC-DEM-20261102-0004-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, DEC-DEM-20261102-0003-v1/02-tech-lead.md, DEC-DEM-20261102-0003-v1/04-maestro.md, e2e/decisao.spec.ts, e2e/apoio.ts, e2e/preparacao.ts, playwright.config.ts, scripts/seed-ficticio.ts, package.json, test/estatico/projeto.test.ts, src/modules/demandas/transicoes.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/db/schema/decisao.ts, .claude/agents/engenheiro-frontend.md, .claude/agents/qa-automacao.md]
status: pronto
proximo: engenheiro-frontend
devolvido_para: null
---
## Entrega

### Causa provável

Concordo com a reprodução da 01. A causa está só no teste; o sistema segue a regra.

1. **A pré-condição aceita a partida errada.** Em `e2e/decisao.spec.ts:348`, a condição é
   `[...ORIGENS_DO_FLUXO, 'encerrada'].includes(status)`, e o comentário da linha 347 diz que isso é de propósito. Com
   a demanda já `encerrada`, a condição é verdadeira: `exigeBancoRecemSemeado` não pula (sem `CI`) nem reprova (com
   `CI`). Por isso o furo vale também com `CI=1` num banco reaproveitado.
2. **O teste não confere o status antes de arquivar.** Depois do DEC novo (`:349`), ninguém lê o status. De
   `encerrada`, o `dec_criado` e o `decisao_arquivada` não fazem nada (`transicoes.ts:56-58` e `:71`), e o
   `toBe('encerrada')` da linha 354 passa sem transição nenhuma.
3. **O alerta não serve de prova.** "Pacote arquivado. A demanda foi para Encerrada." é texto fixo
   (`dados-da-decisao.ts:127`). Ele aparece sempre que a decisão grava (`decidir.ts:221-222`), com ou sem mudança de
   status.

Efeito colateral a evitar: as conferências de 404 e de sessão (`:356-365`) estão dentro do "Arquivar". Se ele passar a
ser pulado nas execuções repetidas, elas também deixam de rodar, e essas conferências valem em qualquer banco.

### Caminho escolhido: (a), a pré-condição exige `ORIGENS_DO_FLUXO`

- O caminho (b), com demanda própria no seed, não resolve sozinho. Depois da 1.ª execução no banco, essa demanda também
  fica `encerrada`, e fora do CI o pulo com mensagem continua necessário (pendência da 01). Ele só acrescentaria um
  título ao seed e um teste em `scripts/scripts.test.ts`, sem ganho de prova.
- Criar uma demanda pela API a cada execução esbarra no C-36, e este arquivo cria 0 demandas pela API.
- Conclusão: `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` **não mudam**.

### Quem corrige

**`engenheiro-frontend`, numa `03-correcao` só.** A correção fica em `e2e/decisao.spec.ts`. Fora dela, só mudam o
campo `version` do `package.json` e uma linha de `test/estatico/projeto.test.ts`. Para verificar, é preciso rodar
`pnpm test:e2e`. Tudo isso está na lista **Pode** do frontend: `e2e/`, `test/`, `package.json` e `pnpm test:e2e`. O
backend não tem `e2e/` nem `pnpm test:e2e`.

### O que a 03-correcao faz, em ordem, com o teste antes do código

**Arquivos que mudam:**
- `e2e/decisao.spec.ts`;
- `test/estatico/projeto.test.ts` (só a versão);
- `package.json` (só `version`).

**Arquivos que não mudam:** `src/`, `scripts/`, `e2e/apoio.ts`, `e2e/preparacao.ts`, `e2e/preparacao.spec.ts`,
`playwright.config.ts`, `.github/`, `Dockerfile` e `CHANGELOG.md`. O `CHANGELOG.md` fica com a `06-documentacao`.

**Passo 0. Versão 0.1.3**
- Primeiro o teste. Em `test/estatico/projeto.test.ts`, no `it` da versão (linhas 27-30), troque `0.1.2` por `0.1.3`
  no título e no `expect`. Troque também o comentário da linha 27 por:
  `// 0.1.3: DEC-DEM-20261102-0004-v1 (o teste "Arquivar" prova a mudança de status também fora do CI, sem mudança de comportamento).`
- Rode `pnpm test` e registre na entrega a falha (`expected '0.1.2' to be '0.1.3'`).
- Depois, em `package.json`, mude `"version": "0.1.2"` para `"0.1.3"`. Rode `pnpm test` de novo, que tem de ficar
  verde.

**Passo 1. Refatoração: 404 e sessão num teste próprio, sem pré-condição**

Este passo não muda o comportamento.

- Tire do "Arquivar" as linhas 356-365. Ponha-as num teste novo, logo depois dele e no fim do arquivo:
  `'404 para DEC inexistente, id de outro tipo e caminho inválido; sem sessão, a decisão vai para /entrar'`. O título
  não pode ter "Arquivar", para o `--grep "Arquivar"` dos passos seguintes não pegar este teste.
- Corpo do teste novo:
  - `entrarComo(page, 'cto')` e `demandaId = await demandaDoSeed(page, TITULO)`.
  - Antes do laço: `decInexistente = proximoId('DEC', demandaId, (await pacotes(page, demandaId)).map((p) => p.id))`.
    O comentário N-01 continua, porque nada é criado entre a leitura e o `goto`.
  - O laço dos três caminhos fica igual, com o 404 e o `h1` "Página não encontrada".
  - A sessão usa `decId = await idDoDecDeRascunhoDoSeed(page)`, que é o DEC de agente do seed. Ele existe em qualquer
    banco, e o C-14 já depende dele. Depois, `clearCookies`, `goto` e `toHaveURL(/\/entrar\?/)`.
  - Nenhum POST: 0 demanda e 0 versão.
- Mude o título do "Arquivar" para `'Arquivar → "Pacote arquivado. A demanda foi para Encerrada."'`. Sai o
  "; 404 e sem sessão".
- Rode `pnpm test:e2e e2e/decisao.spec.ts --grep "404"` e registre: 1 aprovado.

**Passo 2. Teste que falha: conferir o status antes e depois de arquivar**

- No "Arquivar", logo depois do `novoPacote` (linha 349) e antes do `goto`, acrescente:
  `expect(await statusDa(page, demandaId), `status da demanda ${demandaId} antes de arquivar`).toBe('pronta_para_decisao');`
- Escreva um comentário curto acima dessa linha. O sentido: a partida está em `ORIGENS_DO_FLUXO` (conferida na
  pré-condição), o DEC novo leva a demanda a Pronta para decisão (`dec_criado`), e Pronta para decisão é origem de
  `decisao_arquivada`. O resultado é sempre `pronta_para_decisao`, qualquer que seja a origem.
- Depois do alerta, deixe as duas conferências nesta ordem:
  - `expect((await api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`)).statusDecisao).toBe('arquivada')`. Esta
    é nova: prova que o arquivamento gravou;
  - `expect(await statusDa(page, demandaId), `status da demanda ${demandaId} depois de arquivar`).toBe('encerrada')`.
    É a linha 354, agora com a mensagem.
- Ainda **sem** mexer na pré-condição, rode `pnpm test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2`.
- Registre na entrega: a 1.ª repetição passa, e a 2.ª **falha** em "status da demanda … antes de arquivar"
  (`Expected: "pronta_para_decisao"`, `Received: "encerrada"`). Essa é a reprodução determinística do B-01.

**Passo 3. Correção: a pré-condição só aceita `ORIGENS_DO_FLUXO`**

- Troque a linha 348 por
  `exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), `a demanda ${demandaId} está ${status}, e o arquivamento não prova a mudança para Encerrada`);`
- Troque o comentário da linha 347 por um que diga o seguinte:
  - só a partida de `ORIGENS_DO_FLUXO` prova a mudança, porque é a origem de `decisao_arquivada`;
  - de Encerrada, que é final, arquivar grava a decisão mas não muda o status;
  - o alerta é texto fixo, e por isso o teste confere o status antes e depois.
- `exigeBancoRecemSemeado` **não muda**: o ramo do CI (`expect(...).toBe(true)`) e o de fora dele
  (`test.skip(!condicao, mensagem)`) ficam como estão. Muda só a condição passada.
- Rode de novo `pnpm test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2`. Registre na entrega:
  - 1 aprovado e 1 pulado;
  - a mensagem do pulado, que começa com `exige banco recém-semeado: a demanda DEM-… está encerrada`.

**Passo 4. Comentários**

Reescreva o cabeçalho da `decisao.spec.ts`, linhas 14-23:
- "Arquivar" passa para a lista dos que exigem banco recém-semeado. A razão: só a partida de `ORIGENS_DO_FLUXO` prova a
  mudança para Encerrada (B-01 do DEC-DEM-20261102-0003-v1, corrigido no DEC-DEM-20261102-0004-v1);
- o teste novo de 404 e sessão entra na lista dos que rodam em qualquer banco;
- o uso por conta continua "cto" 0 demandas pela API e "administradora" 0.

Ajuste também as linhas 4-5. Hoje dizem "arquivar, a Encerrada, por último"; passam a dizer que o 404 e a sessão vêm
depois, sem mudar o banco.

**Comandos da 03-correcao** (todos na lista **Pode** do frontend):
- `pnpm test`, `pnpm lint` e `pnpm typecheck`;
- `pnpm test:e2e` inteiro, uma vez, em banco novo: tudo aprovado e 0 pulado;
- `pnpm test:e2e e2e/decisao.spec.ts --repeat-each=3`, com o resultado de cada repetição na entrega (ver "Teste de
  regressão esperado").

### Proibido, e recusado na revisão como alto

- Mudar qualquer arquivo de `src/` ou de `scripts/`, ou mudar `exigeBancoRecemSemeado`.
- Aceitar `encerrada`, ou qualquer status fora de `ORIGENS_DO_FLUXO`, como partida do "Arquivar".
- Tirar a conferência do status antes ou depois, ou trocá-la só pelo alerta.
- Pular sem mensagem:
  - `return` silencioso;
  - `test.skip` sem condição;
  - `test.fixme`;
  - pular dentro do CI.
- Deixar o 404 ou a sessão dentro de um teste com pré-condição, ou apagar alguma dessas conferências.
- Subir `retries`, mudar `workers` ou `fullyParallel`.
- Desligar ou filtrar regra do axe (C-14 e os outros `semViolacoes` ficam iguais).
- Mexer no C-36 ou na A-02: variável, cabeçalho, conta ou relógio.
- Ler `.env` ou usar dado pessoal real.

### Teste de regressão esperado

- **"Arquivar"** (`e2e/decisao.spec.ts`) confere o status em dois pontos:
  - partida em `ORIGENS_DO_FLUXO`, pela pré-condição;
  - `pronta_para_decisao` antes de arquivar;
  - depois de arquivar, `statusDecisao: 'arquivada'` no DEC e `encerrada` na demanda.
- **`--grep "Arquivar" --repeat-each=2`, sem `CI`:**
  - antes do passo 3: 1 aprovado e 1 reprovado em "antes de arquivar";
  - depois do passo 3: 1 aprovado e 1 pulado com `exige banco recém-semeado: …`.
- **Teste novo de 404 e sessão:** passa em toda repetição.
- **`pnpm test:e2e e2e/decisao.spec.ts --repeat-each=3`, num banco só, sem `CI`.** A spec passa a ter 9 testes:
  - na 1.ª repetição, 9 aprovados e 0 pulado;
  - na 2.ª e na 3.ª, 5 aprovados (C-14, M-01, P1-b, A-02 e o de 404 e sessão) e 4 pulados com mensagem ("nível cto:
    aprovar A", "dupla aprovação", "CA-12.4" e "Arquivar");
  - total: 19 aprovados, 8 pulados e 0 falha.
- **Ramo do CI:** com `CI` definido, a mesma condição falsa reprova pelo `expect` de `exigeBancoRecemSemeado`, que
  não muda neste pedido. A prova direta exige rodar o Playwright com `CI=1` na frente, e essa forma não está na lista
  **Pode** do frontend nem do qa-automacao (ver Pendências).

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-frontend). O maestro confere de novo no `verificar` |
| `pnpm test:e2e` verde três vezes seguidas | `04-regressao` (qa-automacao). A `03-correcao` roda a suíte uma vez, mais o `--repeat-each=3` da `decisao.spec.ts` |
| `CHANGELOG.md` com a versão 0.1.3 | `06-documentacao` (documentacao-tecnica). O `version` do `package.json` e o `test/estatico/projeto.test.ts` ficam com a `03-correcao` (passo 0) |
| PR com CI verde | Parada 3 (maestro), depois da `05-entrega` |

**Para a `04-regressao`:**
- `pnpm test:e2e` três vezes seguidas. Cada uma sobe um banco novo e tem de terminar com 0 pulado.
- O `--repeat-each=3` da `decisao.spec.ts`, com o resultado esperado acima.
- O `--grep "Arquivar" --repeat-each=2`, como teste que reproduz o defeito da 01: a 2.ª repetição é pulada com a
  mensagem, e não aprovada.
- Pelo `git diff`: nenhuma asserção afrouxada e nenhum `.skip`, `.only` ou `.todo` novo.

**Para a `05-entrega`:** nada muda em `Dockerfile`, workflows nem `docs/operacao/`. O `docker build` confere que a
imagem sai igual.

## Decisões tomadas

- Liberações do maestro, por delegação de Fabiano (02/11, até 18h de Brasília), para o engenheiro desta 03-correcao: editar `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts` (se o caminho da demanda própria fosse o escolhido) e trocar a versão do `package.json` de 0.1.2 para 0.1.3, com o teste estático de versão. Ficam registradas, sem bloquear.
- Caminho (a): a demanda própria do seed também fica `encerrada` depois da 1.ª execução, então o pulo com mensagem seria necessário do mesmo jeito; (b) só acrescentaria seed e teste sem ganho. A liberação de `scripts/` não é usada.
- Engenheiro-frontend: `e2e/`, `test/`, `package.json` e `pnpm test:e2e` estão na lista Pode dele; nada do plano está em `src/` ou `scripts/`.
- `test/estatico/projeto.test.ts` muda uma linha: ele confere a versão, e é o teste que falha antes da troca do `package.json`.
- O 404 e a sessão saem do "Arquivar" para um teste próprio, sem pré-condição e sem POST: são conferências que valem em qualquer banco, e com o "Arquivar" pulado nas repetições elas deixariam de rodar (pendência da 01).
- A sessão usa o DEC de agente do seed, que existe em qualquer banco e de que o C-14 já depende; o 404 continua com `proximoId` da lista lida no próprio teste (N-01).
- O status "antes" é conferido como `pronta_para_decisao` depois do DEC novo: a partir de qualquer status de `ORIGENS_DO_FLUXO`, o `dec_criado` leva a ele ou o mantém, então o valor é exato e não um intervalo. A partida em si fica conferida pela pré-condição.
- O teste que falha antes da correção é a conferência "antes de arquivar" com a pré-condição velha: ela reprova na 2.ª repetição, sem depender de `CI` nem de banco à mão.
- `statusDecisao: 'arquivada'` entra como conferência a mais: separa "o arquivamento gravou" de "o status mudou", que o alerta fixo mistura.
- A pré-condição não vira função pura em `e2e/preparacao.ts` (item 5, opcional, da 01): a ESP do pedido limita a mudança a `e2e/decisao.spec.ts`, e a condição é uma chamada só, `ORIGENS_DO_FLUXO.includes(status)`, igual à do CA-12.4.
- `exigeBancoRecemSemeado` fica igual: o ramo do CI já reprova a condição falsa, e mexer nele estenderia o pedido aos outros três testes que o usam.

## Pendências

- Para o maestro, na `04-revisao`, opcional e sem bloquear: a prova direta do ramo do CI exige `CI=1 pnpm test:e2e e2e/decisao.spec.ts --grep "Arquivar" --repeat-each=2`, com o esperado de 1 aprovado e 1 reprovado com `exige banco recém-semeado: …`. Essa forma de comando não está na lista Pode do frontend nem do qa-automacao. Sem ela, o ramo fica provado pela leitura: a condição é a mesma que faz o pulo fora do CI, e o código do ramo não muda.
- Para o `analista-requisitos`, numa demanda própria, se Fabiano quiser (já registrado como N-04 no DEC-DEM-20261102-0003-v1): a API aceita criar e arquivar DEC numa demanda Encerrada, e o alerta diz "A demanda foi para Encerrada." mesmo quando ela já estava. Fica fora deste pedido, que não muda comportamento do sistema.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0004-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — 1bf4154 (01-reproducao) sobre b8a8c44 (main 0.1.2)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
