---
pedido: DEC-DEM-20261102-0005-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, e2e/decisao.spec.ts, e2e/apoio.ts, e2e/sem-violacoes.spec.ts, playwright.config.ts, test/estatico/projeto.test.ts, test/estatico/varreduras-qa.test.ts, test/estatico/painel-qa.test.ts]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

A correção da 03 está certa e não precisou voltar. Acrescentei um teste de regressão estático para os dois defeitos e
rodei um controle negativo do axe no estado arquivado. Ao fim da etapa, `e2e/decisao.spec.ts` está igual ao commit, e o
único arquivo novo no repositório é `test/estatico/decisao-e2e.test.ts`.

### Critérios do pedido e o teste que cobre cada um

| Critério | Teste que cobre | Resultado |
|---|---|---|
| 1. O "Arquivar" roda `semViolacoes` no estado arquivado, sem regra do axe desligada nem elemento excluído | `e2e/decisao.spec.ts`, `Arquivar → "Pacote arquivado. A demanda foi para Encerrada."` (linha 366, `semViolacoes(page, 'T11 arquivado')`); `test/estatico/decisao-e2e.test.ts`, describe `D-1: o "Arquivar" passa pelo axe na tela arquivada` (chamada única, depois do alerta e das três conferências, sem navegação no meio) e describe `nenhum e2e desliga, filtra ou restringe o axe` | Aprovado nas três rodadas da suíte, sem pulo. O controle negativo reprovou como devia (ver abaixo) |
| 2. Cabeçalho sem linha órfã, com até 120 colunas e com o arquivado entre os estados que têm axe | `test/estatico/decisao-e2e.test.ts`, describe `D-2: cabeçalho de e2e/decisao.spec.ts`: `nenhuma linha passa de 120 caracteres nem fica órfã` e `a frase do axe cita o arquivado e os outros estados decididos` | Aprovado. A largura foi medida por ferramenta: as 28 linhas têm no máximo 120 caracteres, contados por ponto de código em NFC, com o acento valendo 1 |
| 3. A pré-condição e as conferências de status do "Arquivar" continuam iguais às da 0.1.3 | `test/estatico/decisao-e2e.test.ts`, `a pré-condição e as conferências de status da 0.1.3 continuam` e `a spec só pula pela pré-condição, com mensagem, e não tem only, fixme nem todo`; e o `git diff main`, em que o corpo do teste ganha só a linha 366 | Aprovado |
| 4. A suíte e2e passa três vezes seguidas, e a rodada repetida no mesmo banco não tem falha nem pulo sem mensagem | As três rodadas de `pnpm test:e2e` e o `--repeat-each=3` com o reporter JSON | 3 × 143 aprovados, com 0 pulado e 0 falha. Na rodada repetida: 19 aprovados, 8 pulados e 0 falha, e cada pulo traz a mensagem |

### Suíte e2e três vezes seguidas, cada uma com um banco novo do Testcontainers

| Rodada | Aprovados | Pulados | Falhas | Tempo |
|---|---|---|---|---|
| 1 | 143 de 143 | 0 | 0 | 6,0 min |
| 2 | 143 de 143 | 0 | 0 | 5,7 min |
| 3 | 143 de 143 | 0 | 0 | 6,1 min |

Nas três rodadas, o "Arquivar" (`e2e/decisao.spec.ts:348`) aparece aprovado, e não pulado.

### `--repeat-each=3` da `decisao.spec.ts` no mesmo banco, sem `CI`

O reporter JSON mostra o motivo de cada pulo. Isso resolve a pendência da 03, porque o reporter `list` não mostra o
motivo. O resultado foi `expected: 19`, `skipped: 8`, `unexpected: 0` e `flaky: 0`.

- **1.ª repetição:** os 9 testes foram aprovados, entre eles o "Arquivar" com o axe do arquivado.
- **2.ª e 3.ª repetições:** em cada uma, 5 aprovados (C-14, M-01, P1-b, A-02 e o de 404 e sessão) e 4 pulados. Todos os
  pulos têm a anotação `skip` gerada em `e2e/decisao.spec.ts:48`:
  - "nível cto: aprovar A": `exige banco recém-semeado: a demanda DEM-20261102-0012 já tem DEC aprovado (A-02) ou está encerrada`;
  - "dupla aprovação": `exige banco recém-semeado: a demanda DEM-20261102-0006 já tem DEC aprovado (A-02)`;
  - "CA-12.4": `exige banco recém-semeado: a demanda DEM-20261102-0012 está encerrada, e a devolução não a leva a Em análise`;
  - "Arquivar": `exige banco recém-semeado: a demanda DEM-20261102-0012 está encerrada, e o arquivamento não prova a mudança para Encerrada`.

Nenhum teste foi pulado sem mensagem. O axe do arquivado roda só na 1.ª repetição, o que era esperado (caso 3 da 01).

### Controle negativo do `semViolacoes` no estado arquivado (temporário, já desfeito)

1. **Axe.** Acrescentei por um instante, antes de `semViolacoes(page, 'T11 arquivado')`, um `<img>` sem `alt` dentro de
   `<main>` (`page.evaluate`) e rodei `--grep "Arquivar"` num banco novo. O teste reprovou com `Error: axe em T11
   arquivado`, regra `image-alt`, impacto `critical`, alvo `img`, em `e2e/apoio.ts:69`. A chamada nova analisa mesmo a
   tela arquivada e reprova quando há violação. Tirei a linha, e `git status` mostrou `e2e/decisao.spec.ts` sem
   alteração.
2. **Teste estático.** Tirei por um instante a linha 366 (`semViolacoes`), o que deixa o corpo do "Arquivar" igual ao da
   0.1.3. O `pnpm test test/estatico/decisao-e2e.test.ts` reprovou em `chama semViolacoes(page, 'T11 arquivado') uma
   vez, ...` (`expected [ Array(1) ] to have a length of 2 but got 1`). Repus a linha, e `git status` voltou a mostrar
   só o arquivo de teste novo.
3. **Cabeçalho.** O teste `as regras reprovam o cabeçalho da 0.1.3: ...` aplica as mesmas regras às linhas 1 a 11 da
   main (00a924e) e confere a reprovação: `linha 1: 121`, `linha 3: 131`, `linha 6: 121`, `linha 7: órfã (30
   caracteres)`, e a frase do axe sem "arquivado". A órfã tem 30 caracteres, e não 29.

Antes do controle 1, rodei o `--grep "Arquivar"` sem a injeção, porque a edição tinha falhado. Ele saiu com 1 aprovado em
banco novo, e isso serve de controle positivo.

### Teste acrescentado

**Arquivo:** `test/estatico/decisao-e2e.test.ts`, com 14 testes. É só leitura de arquivo: não depende de ordem, de
relógio nem de banco.

- **D-2** (5 testes):
  - extração do cabeçalho;
  - largura de até 120 e nenhuma linha órfã;
  - frase do axe com os estados decididos, o arquivado entre eles;
  - as regras reprovam o cabeçalho da 0.1.3;
  - as regras aceitam fim de parágrafo curto, lista, mudança de recuo e acento decomposto.
- **D-1** (5 testes):
  - extração do corpo do "Arquivar";
  - `semViolacoes(page, 'T11 arquivado')` uma vez só, depois do alerta, do `arquivada` e do `encerrada`;
  - nenhuma navegação ou ação entre o alerta e o axe;
  - pré-condição, conferências, `ORIGENS_DO_FLUXO` e `exigeBancoRecemSemeado` iguais aos da 0.1.3;
  - o único pulo da spec é o `test.skip(!condicao, mensagem)`.
- **Axe em todo `e2e/`** (4 testes):
  - nenhum `disableRules`, `exclude`, `include`, `withRules` ou `options`;
  - só `e2e/apoio.ts` monta o `AxeBuilder`, com `TAGS_AXE` e `toEqual([])`;
  - as regras pegam as formas proibidas e deixam passar `.includes(` de array.

### Conferência pelo `git diff main`

- **`e2e/decisao.spec.ts`:**
  - nas linhas 1 a 28 mudam só linhas que começam com `//`;
  - no corpo do "Arquivar" entra só `await semViolacoes(page, 'T11 arquivado');`, depois do `toBe('encerrada')`;
  - nenhuma asserção foi afrouxada, e não há `.skip`, `.only`, `.todo` ou `.fixme` novo.
- **`e2e/apoio.ts`:** sem mudança.
- **`package.json`:** muda só `version` (0.1.4).
- **`test/estatico/projeto.test.ts`:** muda só o `it` da versão.
- **`src/`:** sem mudança.

### `pnpm test`, `pnpm lint` e `pnpm typecheck`

- `pnpm test`: 3711 de 3711 aprovados, em 193 de 193 arquivos (eram 3697 em 192 antes do teste novo, mais 14).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

## Decisões tomadas

- **Teste estático além dos e2e.** O e2e só prova o D-1 num banco novo, e nada prova o D-2: nenhum comando mede colunas,
  e o lint não pega comentário. Todo defeito corrigido ganha um teste que falharia antes da correção.
- **Regra da órfã.** Reprova a linha com menos de 60 caracteres seguida de continuação do mesmo parágrafo (mesmo recuo).
  Não usei o preenchimento guloso ("a palavra seguinte caberia"): ele reprovaria as linhas 23 e 24, que a triagem
  aceitou ("são" desce com 113 + 4 caracteres). Trocar o texto da triagem não é decisão da regressão.
- **`--reporter=json` no `--repeat-each=3`.** Era o único jeito, dentro de `pnpm test:e2e`, de ver o motivo de cada
  pulo. A saída foi para a tela, sem arquivo nem redirecionamento.
- **Controle negativo pela tela.** Uso um `<img>` sem `alt` injetado por `page.evaluate`, sem mexer em `src/` nem em
  `e2e/apoio.ts`. Ele prova que a chamada nova reprova, e o arquivo voltou ao estado do commit.
- **Sem `docker compose`.** Cada execução do `pnpm test:e2e` sobe o próprio Postgres pelo Testcontainers
  (`playwright.config.ts`, `webServer`), e isso já dá o banco novo de cada rodada.

## Pendências

- Para o maestro, na `04-revisao`: a largura do cabeçalho agora é medida pelo `test/estatico/decisao-e2e.test.ts`, que
  conta caracteres em NFC (até 120 nas 28 linhas). A medição manual pedida na triagem continua possível, mas deixou de
  ser a única prova.
- Fica para a `06-documentacao`, como a triagem definiu: `CHANGELOG.md` com a 0.1.4. O teste novo não muda
  comportamento e pode entrar na mesma linha da versão.
- O teste novo trava o texto da pré-condição do "Arquivar" e as linhas do `semViolacoes` em `e2e/apoio.ts`. Se um pedido
  futuro mudar essas linhas de propósito, o teste tem de ser atualizado junto. É de propósito: mudar esses controles exige
  decisão explícita.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0005-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — 3f427fc no topo, sobre 4d05857, 3bad273, 026ccfc, 5a96a98 e 2bfc680
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main -- e2e test package.json src` — só o cabeçalho, a linha 366, o `version` e o `it` da versão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main --stat` — 3 arquivos de código e os 5 da pasta do pedido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent` — 3697 de 3697, 192 arquivos (antes do teste novo)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada 1: 143 aprovados, 0 pulado, 0 falha
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/` — lista dos testes estáticos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show main:e2e/decisao.spec.ts --format= -s` — cabeçalho da 0.1.3, para a fixture
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/decisao-e2e.test.ts` — 1.ª vez: 13 de 14 (a fixture esperava 29 na órfã, e o certo é 30; corrigi a fixture)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/decisao-e2e.test.ts` — 14 de 14
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, com o teste novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, com o teste novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada 2: 143 aprovados, 0 pulado, 0 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — rodada 3: 143 aprovados, 0 pulado, 0 falha
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --repeat-each=3 --reporter=json` — 19 aprovados, 8 pulados com a mensagem, 0 falha, 0 instável
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --grep "Arquivar"` — sem a injeção (a edição tinha falhado): 1 aprovado, banco novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts --grep "Arquivar"` — com a injeção temporária: 1 falha, `axe em T11 arquivado`, `image-alt`, `critical`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main -- e2e/decisao.spec.ts --stat` — com a linha 366 retirada por um instante, o diff mostrou só o cabeçalho
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/decisao-e2e.test.ts` — com a linha 366 retirada: 1 falha, 13 aprovados (controle do estático)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — com a linha reposta: só `test/estatico/decisao-e2e.test.ts` novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent` — rodada intermediária; não li o resumo e repeti a suíte depois do último ajuste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent` — 3711 de 3711, 193 de 193 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
