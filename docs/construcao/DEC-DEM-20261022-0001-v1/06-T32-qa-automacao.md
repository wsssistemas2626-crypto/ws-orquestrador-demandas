---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T32-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 a G4, T31 fim, T32, T33, T34), 01-analista-requisitos.md (glossário, RF-01 a RF-07), 04-seguranca-aplicacao.md (2.1 a 2.8, C-01 a C-40, seção 4 D1 a D12, seções 5 e 6), tarefas.json, 05-tech-lead.md (início), 06-T32-engenheiro-backend.md, 06-T32-tech-lead.md, 06-T31-qa-automacao.md (cabeçalho), commit 9e62fc2 (git show --stat), scripts/criar-usuario.ts, scripts/criar-usuario.test.ts, scripts/desativar-conta.ts, scripts/desativar-conta.test.ts, scripts/lib/argumentos.ts, scripts/lib/saida.ts, src/modules/acesso/exigir-pessoa.ts, src/lib/log.ts, test/sessao.ts, test/sentinelas.ts, test/deps.ts, saída do pnpm test gravada pela ferramenta (tool-results/bh5bpf29m.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T32: scripts de conta (criar usuário e desativar conta), `engenheiro-backend`, commit `9e62fc2`. Cobre RF-01 (conta
por script), C-08, C-37 e T-04 (LGPD D6). O código passa em todos os critérios. Acrescentei 10 testes, que cobrem o
parecer 2 da `06-T32-revisao` (a corrida do `23505`), o fluxo completo da conta do script até o 2FA, o limite de 15 min
de C-08 e o log sem dado pessoal. Os 10 passaram de primeira e duas vezes seguidas.

### Critérios da tarefa e o teste que cobre cada um

| Critério | Arquivo | Teste |
|---|---|---|
| C-08: senha gerada com 20 ou mais caracteres, uma vez na saída, nunca no log | `scripts/criar-usuario.test.ts` | `C-08: senha gerada com 20+ caracteres sai uma vez na saída padrão e nunca no log` (engenheiro) |
| C-08: conta sem 2FA, sessão de no máximo 15 min, só para configurar o 2FA | `scripts/criar-usuario.test.ts` | `a conta criada entra com a senha gerada e é levada a configurar o 2FA` (engenheiro); **`C-08: a sessão sem 2FA da conta do script vale até 15 min, só para configurar o 2FA, e depois deixa de valer`** (novo: aos 14 min `sem_2fa`, aos 16 min `nao_autenticado`) |
| C-37: `--senha` recusado; `SENHA` no ambiente ignorada | `scripts/criar-usuario.test.ts` | `C-37: --senha é recusado, nas duas formas, sem repetir o valor no erro`, `C-37: SENHA no ambiente é ignorada`, `main (rodarScript): --senha sai com 1, sem o valor e sem conta; ...` (engenheiro); **`C-37: argumento com nome fora do padrão aparece como --* no erro, sem o nome nem o valor`** e **`C-37: o valor inválido de um argumento conhecido não aparece no erro`** (novos) |
| C-37: papel só `cto` ou `administradora` | `scripts/criar-usuario.test.ts` | `C-37: papel fora de cto/administradora é recusado`, `entrada fora do schema não grava nada (a função valida de novo)` (engenheiro) |
| RF-01: conta criada por script entra e é levada a configurar o 2FA | `scripts/criar-usuario.test.ts` | `a conta criada entra com a senha gerada e é levada a configurar o 2FA` (engenheiro); **`RF-01: a conta criada pelo script ativa o 2FA com a senha gerada e passa a valer como pessoa`** (novo: login, `two-factor/enable` com a senha gerada, `verify-totp` e `exigirPessoa` devolvendo a pessoa `cto`) |
| RF-01: `main` monta `Deps` de `DATABASE_URL` | `scripts/criar-usuario.test.ts` | os dois `main (rodarScript): ...` (engenheiro) |
| E-mail repetido dá `conflito` (inclusive na corrida, parecer 2 da revisão) | `scripts/criar-usuario.test.ts` | `e-mail que já tem conta → conflito, ...` (engenheiro); **`duas criações do mesmo e-mail ao mesmo tempo → uma conta, um evento, e a recusada sem senha na saída`** (novo) |
| C-21 e C-30: log e evento sem e-mail, nome nem senha | `scripts/criar-usuario.test.ts`, `scripts/desativar-conta.test.ts` | **`C-21: e-mail e nome da conta não vão ao log nem à saída; o evento tem a hora do relógio injetado`** e **`C-21: o log da desativação não leva o e-mail da conta`** (novos); `o erro de banco vira só classe e código na saída de erro (C-21)` (engenheiro) |
| T-04: conta desativada perde as sessões e não entra mais; evento gravado | `scripts/desativar-conta.test.ts` | `T-04: conta desativada perde as sessões e não entra mais; evento gravado` (engenheiro) |
| T-04: desativação idempotente e sem efeito em outra conta | `scripts/desativar-conta.test.ts` | `rodar de novo na mesma conta não grava outro evento e devolve false`, `e-mail sem conta → false, nada muda` (engenheiro); **`duas desativações ao mesmo tempo → uma devolve true, a outra false, e há um evento só`** e **`a outra conta continua entrando com a própria senha depois da desativação`** (novos) |
| T-04 e LGPD D6: e-mail desativado não volta a ser usado | `scripts/desativar-conta.test.ts` | **`e-mail de conta desativada não volta a ser usado: criar de novo dá conflito e não muda nada`** (novo; fixa o comportamento que o engenheiro mandou para a `10-documentacao`) |
| Argumentos do desativar: só `--email`, validado antes do banco | `scripts/desativar-conta.test.ts` | `e-mail fora do formato é recusado antes do banco`, `argumentos: só --email` (engenheiro) |

### Testes acrescentados (10)

- `scripts/criar-usuario.test.ts`, 6 testes:
  - `C-37: argumento com nome fora do padrão aparece como --* no erro, sem o nome nem o valor`;
  - `C-37: o valor inválido de um argumento conhecido não aparece no erro`;
  - `RF-01: a conta criada pelo script ativa o 2FA com a senha gerada e passa a valer como pessoa`;
  - `C-08: a sessão sem 2FA da conta do script vale até 15 min, só para configurar o 2FA, e depois deixa de valer`;
  - `C-21: e-mail e nome da conta não vão ao log nem à saída; o evento tem a hora do relógio injetado`;
  - `duas criações do mesmo e-mail ao mesmo tempo → uma conta, um evento, e a recusada sem senha na saída`.
- `scripts/desativar-conta.test.ts`, 4 testes:
  - `duas desativações ao mesmo tempo → uma devolve true, a outra false, e há um evento só`;
  - `a outra conta continua entrando com a própria senha depois da desativação`;
  - `e-mail de conta desativada não volta a ser usado: criar de novo dá conflito e não muda nada`;
  - `C-21: o log da desativação não leva o e-mail da conta`.

Cada teste usa e-mail próprio (`@exemplo.test` ou as sentinelas de `test/sentinelas.ts`), lê o log só a partir da
própria linha inicial e devolve o destino do log no `finally`. Não depende de ordem. As datas vêm do `relogioFixo`. O
código TOTP do teste de RF-01 é calculado pelo mesmo `Date` que o Better Auth confere, como em `test/sessao.ts`, então o
resultado não depende da hora. Os dois testes de corrida conferem o resultado final (uma conta e um evento; um `true` e
um evento), que é o mesmo seja qual for a ordem em que as transações chegam.

### Resultado

- Os dois arquivos da T32: 28 de 28 (18 do engenheiro e 10 novos), em duas rodadas seguidas.
- `pnpm test`: 137 arquivos, **2720 de 2720** (2710 antes, mais os 10). O aviso do undici "Using `patch`" continua igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff`: só `scripts/criar-usuario.test.ts` (+100, e duas linhas de `import` trocadas para acrescentar nomes) e
  `scripts/desativar-conta.test.ts` (+48). Nenhum teste apagado, nenhum `.skip`, `.only` ou `.todo`, nenhuma asserção
  mudada.

## Decisões tomadas

- **Testes novos dentro dos dois arquivos que já existiam.** Razão: reaproveitam o banco do Testcontainers de cada
  `describe`, sem subir outro contêiner.
- **O teste de 15 min parte da hora da sessão, não do relógio fixo.** Razão: o Better Auth data a sessão pelo `Date`
  do processo. Medir a partir de `session.createdAt` deixa o 14 e o 16 exatos, sem depender da hora real.
- **A corrida confere o resultado, não o caminho.** Razão: se a segunda transação vê a primeira na conferência prévia
  ou bate no `UNIQUE` (`23505`), o resultado certo é o mesmo, `conflito` sem senha na saída. Exigir um dos dois caminhos
  deixaria o teste instável.
- **Sem devolução.** Razão: os 10 testes passaram sem mudar código, e nenhum critério da tarefa ficou sem teste.

## Pendências

- Nenhuma bloqueia a tarefa. Observações para a `06-T32-decisao` (Minor, por leitura do código):
  - `scripts/lib/argumentos.ts:30`: `--__proto__ <valor>` não é recusado, é ignorado em silêncio. A atribuição
    `valores['__proto__'] = '<texto>'` num objeto comum não cria chave, então o `strictObject` não a vê. Não vaza nada nem
    deixa senha entrar, porque o valor é descartado. Caminho, se quiser fechar: `Object.create(null)` ou `Map` em
    `separar`. Não escrevi teste que falha para isso, porque não é critério da tarefa.
  - O `main` de `scripts/desativar-conta.ts` (sai com 0 quando desativou e com 1 quando não achou conta ativa, e as duas
    mensagens) fica dentro do `if (ehExecucaoDireta(...))`, sem função exportada, então nenhum teste o exercita. O
    `rodarScript` em si está coberto. Caminho: exportar a função passada ao `rodarScript` quando a T33 mexer em
    `scripts/`, e eu cubro na `06-T33-testes`.
- O parecer 2 da `06-T32-revisao` (corrida do `23505` sem teste) está coberto pelo teste novo
  `duas criações do mesmo e-mail ao mesmo tempo → ...`.
- Seguem abertos, sem mudança: os pareceres 1, 3 e 4 da `06-T32-revisao`, os Minor das revisões anteriores e o aviso
  do undici "Using `patch`".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 9e62fc2793158389e3d528a4b17a094d4ee04241` — 8 arquivos: os 6 do plano, a entrega e o `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/criar-usuario.test.ts scripts/desativar-conta.test.ts` — 2 arquivos, 28 de 28
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/criar-usuario.test.ts scripts/desativar-conta.test.ts` — segunda rodada, 28 de 28
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 137 arquivos, 2720 de 2720
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só os 2 arquivos de teste alterados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, +148 e -2 (as duas linhas de `import`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 scripts/criar-usuario.test.ts` — as linhas removidas são só os dois `import` acrescidos de nomes

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
