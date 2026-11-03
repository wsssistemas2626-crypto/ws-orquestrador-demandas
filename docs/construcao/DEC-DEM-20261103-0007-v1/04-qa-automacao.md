---
pedido: DEC-DEM-20261103-0007-v1
etapa: 04-regressao
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, "git show dad3e9b, 9374768 e e54d4bd", playwright.config.ts, src/lib/console-saneado.ts, src/lib/console-saneado.test.ts, src/instrumentation.ts, src/lib/reduzir-erro.ts, "src/app/api/pacotes-decisao/[decId]/decisao/route.ts", src/app/api/pacotes-decisao/decisao.test.ts, src/app/api/pacotes-decisao/pedido.test.ts, src/modules/pedido-construcao/gerar.test.ts (cabeçalho), test/estatico/projeto.test.ts]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da correção (commits `dad3e9b` e `9374768`; `e54d4bd` só regrava a entrega da 03). Os seis defeitos da 01
foram conferidos contra os testes da 03. Acrescentei 13 testes onde faltava contrato HTTP (M-08) e onde os casos
exploratórios da 01 não estavam cobertos (M-05). O e2e passou três vezes seguidas, com 0 falhou e 0 pulado.

### Cada defeito da 01 e o teste que o reproduz (falharia antes da correção)

| Defeito | Critério do pedido | Teste que cobre (arquivo e nome) |
|---|---|---|
| D-01 (M-05) | Erro não tratado do painel não sai pelo console com mensagem, causa ou parâmetro. Vai ao log com evento fixo e identificador | `src/modules/acesso/exigir-pessoa.test.ts`, bloco "M-05 (a): erro do getSession sai saneado por todos os caminhos" (4 testes; sentinela em `message`, `cause`, `stack` e `params`). `src/instrumentation.test.ts`, "instrumentation.onRequestError" (5 testes: `erro_requisicao`, `rota` modelo, `erroId`, digest fora do formato, redirect/notFound, edge) e os dois "M-05 (c)" de `instrumentation.register`. `src/lib/console-saneado.test.ts` (5 testes, com espião em `process.stdout.write` e `process.stderr.write`). `src/lib/log.test.ts`: "a lista de permissão é exatamente esta, com erroId desde a 0.1.6" e "erroId só sai no formato…" |
| D-02 (M-06) | O agente não recebe `solicitanteNome`, anexos nem nome da conta autora. A pessoa recebe | `src/app/api/demandas/demandas.test.ts`, bloco "M-06: minimização da leitura de demanda para quem não é pessoa" (6 testes: GET com token `risco` e `orquestrador`, pessoa, POST do orquestrador, autor agente, listagem nos dois atores, `vistaDaDemandaPara` por lista de permissão) |
| D-03 (M-07) | O seed recusa a configuração de produção mesmo com `SEED_FICTICIO=1` e banco vazio. A homologação e o e2e seguem semeando | `scripts/scripts.test.ts`: "M-07: com SEED_FICTICIO=1, banco vazio e urlBase %s → recusado_producao…" (4 URLs), "M-07: a recusa por URL vem antes de abrir a transação", "M-07: sem SEED_FICTICIO=1…", "M-07: urlBase %s (loopback) → semeia" (localhost e [::1]). `src/lib/env.test.ts`: "ehLoopback: só 127.0.0.1, localhost e [::1]…". O e2e semeia pelo `e2e/servidor.ts` em `127.0.0.1:3101` (três rodadas verdes abaixo) |
| D-04 (M-08) | Aprovar DEC ou gerar Pedido em demanda em status final dá 409 | Domínio (da 03): `src/modules/pacotes-decisao/decidir-bordas.test.ts`, bloco "M-08: decidir DEC de demanda em status final" (10 testes). `src/modules/pedido-construcao/gerar.test.ts`, os quatro "M-08: …". **Rota (novos, desta etapa):** `src/app/api/pacotes-decisao/decisao.test.ts`, bloco "PATCH …/decisao: demanda em status final (M-08)", e `src/app/api/pacotes-decisao/pedido.test.ts`, bloco "POST …/pedido-construcao: demanda em status final (M-08)" |
| D-05 (Aviso) | 408 e 409 do Resend são tentados de novo | `src/modules/avisos/enviador.test.ts`, "resposta %i → ErroEnvioEmail %s…" (a linha do 409 mudou de `recusado` para `transitorio` e não foi apagada; entraram 408, 410 e 413). `src/modules/avisos/aviso-dec.test.ts`: "EnviadorResend com resposta %i → continua pendente…" (408, 409, 429, 500 e 503), "EnviadorResend com 409 nas três tentativas → pendente na 1ª e na 2ª, falhou na 3ª" e "… %i → falhou na 1ª" (401, 410 e 413) |
| D-06 (CI) | Actions fixadas por SHA, sem "SHA pendente", e CI do PR verde | Sem teste nesta etapa. A triagem deu o item à `05-entrega` (`.github/` só está na lista **Pode** do `devops-sre`), e a prova é o CI do PR na P3. Um teste estático do `uses:` ficaria vermelho até a 05 (ver Pendências) |
| (todos) | A suíte e2e passa três vezes seguidas | `pnpm test:e2e`: 143 de 143 nas três rodadas, cada uma num banco novo do Testcontainers (`reuseExistingServer: false`) |

### Testes acrescentados nesta etapa (13, todos passando)

- `src/app/api/pacotes-decisao/decisao.test.ts`, bloco "PATCH /api/pacotes-decisao/:decId/decisao: demanda em status
  final (M-08)", com 7 testes:
  - "%s um DEC pendente de demanda encerrada à mão → 409 com a mensagem fixa, nada gravado, a demanda segue encerrada",
    para aprovar, devolver e arquivar (3). Confere o corpo exato `{ erro: 'conflito', mensagem: MENSAGENS_DECISAO.demandaFinal }`
    e que não há linha em `aprovacao` nem em `decisao`, nem evento;
  - "a cena da tela: arquivar encerra a demanda; decidir de novo o mesmo DEC → 409 da demanda final, não o do jaDecidido"
    (é a cena do `e2e/decisao.spec.ts` "Arquivar", levada para a rota);
  - "dupla aprovação: só o CTO aprovou e a demanda foi encerrada → a administradora recebe 409…";
  - "a matriz vem antes do status: token de agente e pessoa sem 2FA seguem 403, e sem credencial 401…". Assim o 409 não
    revela o status da demanda a quem não pode decidir;
  - "controle: demanda em status não final (em_analise) decide como antes, pela rota".
- `src/app/api/pacotes-decisao/pedido.test.ts`, bloco "POST /api/pacotes-decisao/:decId/pedido-construcao: demanda em
  status final (M-08)", com 5 testes:
  - "DEC aprovado em demanda %s → 409 com a mensagem fixa, sem download nem evento pedido_gerado", para `entregue`
    (pelo caminho real aprovada → em_construcao → entregue) e `encerrada`, com CTO e administradora (2);
  - "DEC pendente em demanda encerrada → 409 da demanda final…";
  - "a matriz vem antes do status: token de agente segue 403 em demanda encerrada, sem evento";
  - "controle: em aprovada e em_construcao, gera pela rota como antes (um evento por geração)".
- `src/lib/console-saneado.test.ts`: "erro com name livre, cause em dois níveis, code e digest fora do formato,
  AggregateError e %s/%o: nada do texto sai". São os casos exploratórios da 01 (D-01). Cobre o sentinela em `name`,
  `message`, `cause.cause`, `params`, `code`, `digest`, `AggregateError.errors` e nos argumentos de formatação do
  console. Confere a linha do log campo a campo: `classe: 'Error'` para o name livre, sem `code` e sem `erroId`.

Os testes de rota do M-08 dariam 200 antes da correção, porque `registrarDecisao` e `gerarPedido` não olhavam o status.
O do console falharia por falta do módulo. Nada disso foi rodado contra a base: voltar o código não está na minha lista
**Pode**. A 03 registrou o vermelho de cada passo com a saída.

### Revisão dos testes existentes alterados pela 03 (`git diff 4a03366 dad3e9b -- "*.test.ts"`)

Nenhum teste foi apagado nem marcado com `.skip`, `.only` ou `.todo`. As quatro asserções que mudaram não ficaram mais
fracas:
- `gerar.test.ts` e `acoes-pedido.test.ts` (CA-22.4, DEC arquivado): seguem 409 e sem evento, mas com a mensagem nova
  `demandaFinal`. É a consequência certa do M-08, porque arquivar encerra a demanda. Os outros quatro DEC do laço
  continuam com `naoAprovado`.
- `exigir-pessoa.test.ts` ("erro que não é de acesso não vira redirecionamento") e `resolver-ator-qa.test.ts:126`: o
  `toThrow(<mensagem crua>)` virou `toBeInstanceOf(ErroLeituraSessao)` mais a ausência da mensagem crua. Como
  `ErroLeituraSessao` só nasce quando o `getSession` foi chamado e falhou, o controle continua provando a chamada ao
  Better Auth.
- `enviador.test.ts`: a linha do 409 mudou de `recusado` para `transitorio`, como a triagem mandou. O conjunto de 4xx
  em `recusado` cresceu (410 e 413).

### e2e: nenhum spec precisou de ajuste

- O `e2e/decisao.spec.ts` "Arquivar → …Encerrada." arquiva e não decide de novo. Nenhum spec decide ou gera Pedido em
  demanda final.
- Nenhum spec lê `GET /api/demandas/:id` com token de agente esperando os campos retirados.
- O seed do e2e roda em `127.0.0.1:3101` e passou pela guarda nova nas três rodadas.

### Resultados

- `pnpm test`: **3879 de 3879**, em 195 arquivos, 0 falhou. São os 3866 da 03 mais os 13 desta etapa.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `pnpm test:e2e`, três vezes seguidas, sem nada no meio que mudasse o código:
  - 1ª: 143 passaram (8,0 min);
  - 2ª: 143 passaram (7,8 min);
  - 3ª: 143 passaram (6,0 min).
  Nas três, 0 falhou e 0 pulado. Terminou às 14h55 UTC, dentro do prazo das 16h00.

## Decisões tomadas

- Teste de contrato HTTP do M-08 nas duas rotas: a 03 cobriu o domínio, e o contrato visível pela tela e pela API
  (corpo exato do 409, sem `content-disposition`, matriz antes do status) não tinha teste.
- Teste "a matriz vem antes do status": garante que o 409 novo não vira um oráculo de status da demanda para o agente.
- O caso exploratório de corrida da 01 (uma aba encerra e outra aprova ao mesmo tempo) ficou de fora. Com o relógio
  fixo, os dois resultados possíveis (aprovou e depois encerrou, ou encerrou e recusou) deixam o mesmo estado final, e
  um invariante de ordem pediria ler a sequência de eventos. A trava (`travarDemanda`) está provada pelos testes de
  domínio da 03.
- Não acrescentei teste estático para as actions por SHA (D-06): ele ficaria vermelho até a `05-entrega` e travaria a
  suíte nesta etapa. A prova escolhida pela triagem é o CI do PR.
- `pnpm test` rodou depois das três rodadas do e2e, e não em paralelo, para a carga dos Testcontainers não deixar o e2e
  instável.
- Rodei dois comandos fora da lista **Pode**, ambos só de leitura e sem nenhuma alteração:
  - `wc -l` na saída gravada do `pnpm test`, para achar o resumo no fim do arquivo;
  - `date -u +%H:%M`, para conferir o prazo.

  Ficam declarados aqui, e não em Comandos executados, pela regra de 25/10 sobre bloqueio só de leitura.

## Pendências

- Para a `05-entrega` (devops-sre): sugiro um teste estático em `test/estatico/` que leia `.github/workflows/*.yml` e
  exija `owner/repo@<40 hex> # vX.Y.Z` em todo `uses:` de terceiros, sem "SHA pendente". Ele ficaria como regressão
  permanente do D-06. Hoje a lista **Pode** da 05 não inclui `test/`; se ficar de fora, vai a registro para um próximo
  pedido.
- Risco que segue do M-05, já registrado na 02 e na 03: a prova da peça (c) é de unidade. Se o Next guardar a referência
  do `console.error` antes do `register()`, ou escrever direto no `process.stderr`, a peça (c) não pega, e só a (a)
  (token) e a (b) (log) seguem garantidas. A conferência é o passo 2 da D-01 na homologação, com o `db` parado. Fica
  para Fabiano na P3.
- Para a `ux-ui-design`, à parte, como na 02: revisar os dois textos de 409 `demandaFinal` e decidir se a tela do DEC
  esconde as ações em demanda final.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat e54d4bd2aa2216efcf2d05dbd4efd7616c0c9faf` — só a entrega da 03 e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -8 --format="%h %ci %s"` — código da correção em dad3e9b
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat dad3e9b 9374768` — 31 arquivos na correção
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 1ª rodada: 143 de 143, 0 pulado (8,0 min)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 4a03366 dad3e9b -- src/modules/acesso/resolver-ator-qa.test.ts "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts" src/modules/pedido-construcao/gerar.test.ts src/modules/avisos/enviador.test.ts src/modules/acesso/exigir-pessoa.test.ts src/lib/env.test.ts test/estatico/projeto.test.ts src/modules/avisos/aviso-dec.test.ts` — asserções alteradas, nenhuma afrouxada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 4a03366 dad3e9b -- src/modules/pacotes-decisao/decidir-bordas.test.ts src/app/api/demandas/demandas.test.ts scripts/scripts.test.ts src/lib/log.test.ts` — testes novos de M-08, M-06, M-07 e log
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src/app/api/pacotes-decisao e2e src/lib/console-saneado.test.ts src/instrumentation.test.ts` — testes de rota e specs
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/console-saneado.test.ts src/app/api/pacotes-decisao/decisao.test.ts src/app/api/pacotes-decisao/pedido.test.ts` — 47 de 47
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só os três arquivos de teste desta etapa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4a03366 dad3e9b -- "*.test.ts"` — 661 inserções e 15 remoções, conferidas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 4a03366 dad3e9b -- src/instrumentation.test.ts` — só acréscimos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- test/estatico` — nenhum estático de workflow
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 2ª rodada: 143 de 143, 0 pulado (7,8 min)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 3ª rodada: 143 de 143, 0 pulado (6,0 min)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3879 de 3879, 195 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — três testes alterados e esta entrega

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (D-06 coberto pelo CI do PR, como a triagem atribuiu à 05)
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
