---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T33-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md (início), 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 e G2, T31 fim a T36), 01-analista-requisitos.md (seção 1 e RF-01 a RF-06), 06-T33-engenheiro-backend.md, commit 5f939ac (git show), scripts/scripts.test.ts, scripts/criar-token-servico.ts, scripts/revogar-token-servico.ts, scripts/definir-preco-modelo.ts, scripts/seed-ficticio.ts, scripts/start-hml.ts, scripts/hml/criar-papeis.sql, scripts/lib/saida.ts, src/modules/acesso/tokens-servico.ts, src/modules/avisos/aviso-dec.ts, src/lib/fila.ts (início), src/lib/fuso.ts, src/db/index.ts, test/sessao.ts, test/deps.ts, test/banco.ts, vitest.config.ts, saída do pnpm test gravada pela ferramenta (tool-results/b7fbovxfm.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T33: scripts de token, preço, seed fictício e subida da homologação. O código passa em todos os
critérios da tarefa, e os 24 testes do engenheiro estão certos e estáveis. Acrescentei 11 testes, para cobrir borda,
falha, concorrência e o `main` dos scripts. Achei um defeito Minor no schema de preço, que não bloqueia (ver
Pendências).

### Critério da tarefa → teste que o cobre

| Critério (plano T33, 01, padrão) | Arquivo | Teste |
|---|---|---|
| Plano: token sai uma vez na saída padrão e nunca no pino; o evento leva o prefixo (RF-02, C-09) | `scripts/scripts.test.ts` | `token sai uma vez na saída padrão e nunca no pino; o evento leva o prefixo` |
| Plano: revogar pelo prefixo grava `token_revogado`, e o token deixa de valer (C-09; CA-02.3 no nível do validador) | `scripts/scripts.test.ts` | `revogar pelo prefixo grava token_revogado e o token deixa de valer`; **novo** `revogar um token não toca nos tokens de outro agente` |
| CA-02.5: o valor do token não aparece em claro na tabela | `scripts/scripts.test.ts` | **novo** `CA-02.5: nenhuma coluna de token_servico guarda o token nem a parte secreta; o hash é o SHA-256 do token` (e a asserção de hash no primeiro teste do token) |
| C-37: nenhum segredo por argumento; agente só um dos quatro | `scripts/scripts.test.ts` | `C-37: --token e --senha não existem; agente só um dos quatro`; `criar com agente fora da lista, chamado direto, não grava nada`; **novo** `C-37: o main de criar token com --token ou --senha recusa antes do banco e não escreve nada na saída` |
| Prefixo fora do formato não chega ao banco | `scripts/scripts.test.ts` | `revogar com prefixo fora do formato é recusado antes do banco` |
| Plano: preço novo vira a vigência mais nova sem apagar a anterior (RF-17, C-26) | `scripts/scripts.test.ts` | `preço novo vira a vigência mais nova sem apagar a anterior`; `dois preços do mesmo modelo no mesmo instante → conflito, e o primeiro fica` |
| Faixa e casas do preço (0 a 999.999,999999, até 6 casas) | `scripts/scripts.test.ts`, `scripts/sonda-preco-qa.test.ts` | `preço negativo, com mais de 6 casas, grande demais ou modelo vazio é recusado sem gravar`; `argumentos: --modelo, …`; **novos** `as bordas da faixa documentada são aceitas: 0, 0,000001 e 999.999,999999`, `todo valor de até 6 casas abaixo de 10.000 é aceito pelo schema e pelos argumentos, com o mesmo número`, `valor com a 7ª casa diferente de zero é recusado em toda a faixa realista` |
| Plano: seed sem `SEED_FICTICIO=1` → recusado; com demanda já existente → recusado | `scripts/scripts.test.ts` | `seed sem SEED_FICTICIO=1 → recusado; com demanda já existente → recusado`; `com conta já existente e nenhuma demanda → recusado (…)` |
| Plano: seed cria contas `.test` com 2FA ativo e a demanda de rascunho de agente (padrão, seção 9; T43) | `scripts/scripts.test.ts` | `seed cria contas com e-mail .test e 2FA ativo, e a demanda de rascunho de agente`; `as contas com 2FA entram com a senha e o código do segredo de CONTAS_FICTICIAS`; `as contas sem 2FA entram com a senha e são levadas a configurar o 2FA` |
| Seed na primeira subida, uma vez só, e por inteiro ou nada | `scripts/scripts.test.ts` | **novos** `duas subidas ao mesmo tempo semeiam uma vez só (trava consultiva), e o aviso do DEC fictício entra com um job`, `falha no meio do seed desfaz tudo: nenhuma conta, 2FA, evento nem demanda fica para trás`, `main do seed: 1 sem SEED_FICTICIO=1, recusa argumento sem ecoar o valor, e 0 quando semeia` |
| C-33: segredo TOTP cifrado no seed; credenciais fictícias | `scripts/scripts.test.ts` | `C-33: o segredo TOTP e os códigos de recuperação ficam cifrados no banco`; `as credenciais fictícias não têm o formato do token de serviço nem e-mail fora do .test` |
| ADR-12: `start:hml` = migrar → seed → app, com o app sem a credencial de DDL | `scripts/scripts.test.ts` | `migra com o migrator, semeia e só então sobe o app, …`; `com a migração de verdade, …`; `migração que falha não semeia nem sobe o app, …`; `sem a URL do migrator ou com a configuração do app inválida, …`; **novos** `start:hml: a migração recebe a URL do migrator, e o app filho só a URL do app`, `package.json: start:hml roda scripts/start-hml.ts pelo tsx` |
| `criar-papeis.sql` sem privilégio a mais (C-34) | `scripts/scripts.test.ts` | `cria só o papel do app, …`; `roda no Postgres e o papel nasce com os atributos certos (…)` |

### Testes acrescentados (11)

Em `scripts/scripts.test.ts`, num `describe` novo no fim do arquivo (`qa-automacao T33: borda, falha e concorrência`),
8 testes. Cada um usa banco próprio (`novoBanco`) e relógio fixo:

- **CA-02.5:** a linha de `token_servico` não tem o token nem os 38 caracteres secretos. O `hash` é o SHA-256 em hex
  do token, e a tabela `evento` inteira também não tem a parte secreta.
- **C-37 pelo `main`:** `executarCriarToken` com `--token`, `--senha`, agente `admin` ou sem argumento recusa com
  `entrada_invalida`. Nada vai à saída, e não há linha em `token_servico` nem evento `token_criado`.
- **Revogar isola o agente:** revogar o token do `risco` não derruba o do `orquestrador`, e só uma linha fica com
  `revogado_em`.
- **Concorrência do seed:** duas chamadas de `seedFicticio` ao mesmo tempo dão `semeado` e `recusado`, e o banco fica
  com 4 contas, 5 demandas, 1 preço e 4 eventos `conta_criada`. Sem a trava consultiva, a segunda chamada bateria no
  `UNIQUE` do e-mail e lançaria erro, em vez de recusar.
- **Aviso do DEC (para a T43):** o mesmo teste confere que o seed deixa o aviso em `aviso_email` (`pendente`) e um
  único job `aviso.dec-pronto`, com payload só `{ decId }` e `singleton_key` igual ao DEC (C-22).
- **Atomicidade do seed:** com o preço de `modelo-ficticio` já gravado no mesmo instante, o seed bate no `UNIQUE`
  depois de criar as contas e lança `conflito`. Ficam zeradas `user`, `account`, `two_factor`, `evento`, `demanda`,
  `aviso_email` e os jobs de aviso. A linha de preço que existia continua lá.
- **`main` do seed:** sem `SEED_FICTICIO=1`, sai com 1 e escreve "Nada foi alterado". Com `--senha <sentinela>`,
  recusa com `entrada_invalida`, sem a sentinela no erro nem na mensagem, e nada vai à saída. Num banco vazio com
  `SEED_FICTICIO=1`, sai com 0 e cria as 5 demandas, e a saída não mostra nenhuma senha.
- **`start:hml`:**
  - `migrar` recebe exatamente a URL do migrator, e nenhum valor do ambiente do app filho é essa URL;
  - sem `SEED_FICTICIO`, a subida segue sem semear;
  - o `package.json` tem `"start:hml": "tsx scripts/start-hml.ts"`.

Em `scripts/sonda-preco-qa.test.ts` (novo), 3 testes sem banco nem relógio, com gerador de semente fixa:

- as bordas `0`, `0.000001` e `999999.999999` são aceitas, e `-0.000001`, `1000000` e `999999.9999999` são recusadas;
- 20.000 valores `x.yyyyyy` abaixo de 10.000 são aceitos pelo schema e pelos argumentos, e `toFixed(6)` devolve o texto
  digitado, que é o que vai ao `numeric(12, 6)`;
- 2.000 valores com a 7ª casa diferente de zero são recusados.

### Resultado

- `pnpm test`: **139 arquivos e 2755 de 2755**, nenhum falhou. Antes eram 2744: entraram 8 testes no arquivo do
  engenheiro e 3 no arquivo novo. O aviso do undici "Using `patch`" é o mesmo de antes.
- `pnpm test scripts/scripts.test.ts scripts/sonda-preco-qa.test.ts`, rodado de novo depois da suíte: 35 de 35. Os
  testes deram o mesmo resultado nas três execuções do arquivo da tarefa.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff` em `scripts/scripts.test.ts`: só acréscimos. A única linha removida é o import de `./seed-ficticio`, que
  ganhou `executarSeed`. Nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve
  asserção afrouxada.

## Decisões tomadas

- **O achado do preço não devolve a tarefa.** Razão: em nenhum caso grava valor errado, porque ele só recusa. Ele só
  aparece a partir de 16.384 dólares por milhão de tokens, fora de qualquer preço real. E o padrão manda Minor para
  Pendências.
- **A varredura de preço fica abaixo de 10.000.** Razão: um teste que falha travaria a suíte por um Minor. A borda de
  999.999,999999 tem teste próprio e passa. O motivo do limite está escrito no cabeçalho do arquivo.
- **Os testes novos de seed e de token usam banco próprio.** Razão: não dependem da ordem dos testes do engenheiro,
  que compartilham o banco dentro de cada `describe`.
- **A concorrência é provada pelo resultado (`semeado` e `recusado`), e não pelo tempo.** Razão: o teste não tem
  `sleep` nem relógio real. Sem a trava, a segunda chamada lança erro em vez de recusar, e o teste falharia.
- **A atomicidade é provocada pelo `UNIQUE (modelo, vigente_desde)` do preço.** Razão: é uma falha real, que acontece
  depois de as contas serem criadas, sem trocar código de produção nem usar mock do banco.
- **Os testes de banco ficaram no arquivo do engenheiro, num `describe` à parte.** Razão: aproveitam os ajudantes
  locais (`saidaDeTeste`, `tokenDaSaida`, `contar`) sem duplicá-los.

## Pendências

- **Minor (`engenheiro-backend`, `scripts/definir-preco-modelo.ts`, `ate6Casas`):** o schema recusa valores válidos
  de até 6 casas a partir de 16.384.
  - Causa: a tolerância absoluta de `1e-6` sobre `n * 1_000_000` fica menor que a imprecisão do ponto flutuante nessa
    faixa.
  - Medido pela sonda: cerca de 2,5% dos valores entre 10.000 e 999.999,999999 são recusados. O menor achado foi
    `16416.881208`, e outro exemplo é `525952.007808`. O argumento `--entradaPorMilhao 16416.881208` passa na regex
    e é recusado pelo `refine`, com "Use no máximo 6 casas decimais."
  - Efeito: só recusa, nunca grava valor errado, e fica fora de qualquer preço real. Diverge da faixa que a entrega
    documenta.
  - Correção sugerida: `const ate6Casas = (n: number) => Number(n.toFixed(6)) === n;`. Junto, ampliar a varredura de
    `scripts/sonda-preco-qa.test.ts` para a faixa toda, até 999.999,999999.
- **Observação, sem ação:** os testes de login com 2FA do engenheiro calculam o TOTP com `relogioDoSistema`, porque o
  Better Auth confere o código pelo `Date` do processo (`test/sessao.ts`). É o mesmo padrão da T08 e da T32. Ficaram
  estáveis nas três execuções, e os testes novos desta etapa não dependem do relógio real.
- **Leitura de arquivo fora do repositório:** a saída do `pnpm test` completo passou de 30 KB, e a ferramenta a gravou
  em `tool-results/b7fbovxfm.txt`, fora de `/tmp`. Li só o fim, para pegar a contagem, como o engenheiro fez na
  entrega dele. Fica registrado para o maestro.
- **Nome do arquivo novo:** `scripts/sonda-preco-qa.test.ts` nasceu como sonda e virou o arquivo da varredura de
  preço. Renomear ou apagar arquivo não está na minha lista Pode. Se o tech-lead preferir outro nome, a troca é
  livre.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 5f939ac19b169704d8647c479316ebfcba433b90` — 11 arquivos, 7 novos do plano, `package.json` e `scripts/criar-usuario.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5f939ac19b169704d8647c479316ebfcba433b90 -- scripts/criar-usuario.ts package.json` — extração de `gravarConta` e o script `start:hml`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts` — 24 de 24, antes dos testes novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/sonda-preco-qa.test.ts` — sonda: falhou de propósito, 489 de 20.000 valores válidos recusados (exemplo 525952.007808)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/sonda-preco-qa.test.ts` — sonda: falhou de propósito, menor valor recusado 16416.881208, nenhum abaixo de 10.000
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/` — 5 arquivos, 79 de 79, com os testes novos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 139 arquivos, **2755 de 2755**
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts scripts/sonda-preco-qa.test.ts` — 35 de 35, segunda execução
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — `scripts/scripts.test.ts` alterado e `scripts/sonda-preco-qa.test.ts` novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `scripts/scripts.test.ts` +173 −1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 scripts/scripts.test.ts` — só acréscimos; o −1 é o import de `./seed-ficticio` com `executarSeed`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
