---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T07-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md (pela regra G3 do plano), contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 1 a 335 e T07, 1721 a 2043), 06-T02-engenheiro-backend.md, 06-T02-qa-automacao.md, 06-T02-tech-lead.md, 06-T03-engenheiro-backend.md, 06-T03-qa-automacao.md, 06-T03-tech-lead.md, 06-T05-engenheiro-backend.md, 06-T05-qa-automacao.md, 06-T05-tech-lead.md, 06-T06-engenheiro-dados-bd.md, 06-T06-qa-automacao.md, 06-T06-tech-lead.md (Pendências que citam a T07), src/modules/andamento/regras.ts, src/modules/andamento/schemas.ts, src/modules/andamento/consultas.ts, src/modules/andamento/regras.test.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/receber.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/recebimento-0019.test.ts, src/modules/integracoes/tempo-limite.ts, src/modules/integracoes/prazo-total-0019.test.ts, src/db/transacao.ts, src/modules/versoes.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/decidir.ts (205 a 255), src/modules/demandas/transicoes.ts, src/modules/demandas/transicoes-construir.test.ts, src/modules/demandas/servico.ts (185 a 304), src/modules/demandas/schemas.ts (60 a 90), src/modules/limites.ts, src/modules/historico/registrar.ts (40 em diante), src/modules/acesso/matriz.ts (105 em diante), src/modules/acesso/mensagens.ts, src/lib/erros.ts (1 a 45), src/lib/relogio.ts, drizzle/0008_slippery_whirlwind.sql, drizzle/0009_rls_andamento_construcao.sql, test/banco.ts, test/deps.ts, test/integracoes.ts, test/pedidos-construcao.ts, test/estatico/andamento.test.ts, test/estatico/andamento-qa.test.ts, test/estatico/piso-de-assercoes.test.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Serviço `registrarAndamento` (T07), com os testes de fluxo, concorrência e prazo total, a guarda estática do AN-06 e o
piso de asserções.

Antes de escrever código, conferi a lista Pode: a T07 só toca `src/modules/andamento/`, `test/andamento.ts` e
`test/estatico/`. Tudo está dentro de `src/` e `test/`.

### Arquivos criados

- `src/modules/andamento/registrar.ts` — o serviço, como no plano (passo 3), sem mudança de lógica. Em resumo:
  - `autorizar` e o prefixo do ator são resolvidos antes de abrir a transação (AN-01).
  - A transação é `executarComOrcamento(deps.pool, ator, 'padrao', undefined, …)`, e o serviço não tem parâmetro `t`
    (AN-06).
  - A ordem: trava `pedido:<decId>` por `travarPedido` (a mesma função da entrega e do recebimento) → `pedido_gerado`
    de pessoa → vínculo DEC ↔ demanda (o mesmo 404) → trava da demanda → mesmo estado → DEC vigente (409) → status
    final (409) → limite → `INSERT` → transição → evento.
- `test/andamento.ts` — os ajudantes da G7: `CORPO_CONSTRUINDO`, `corpo`, `andamentosDa`, `eventosDo`, `porStatus`,
  `inserirAndamento` e `retratoDa`. Mais três: `apagarAndamentos` (pelo migrator), `erroDe` e `TABELA_DO_CONSTRUIR` com
  `esperadoDaTabela` e `STATUS_DA_DEMANDA` (ver Desvios).
- `src/modules/andamento/registrar.test.ts` — os 14 casos do plano. São 91 testes, porque o caso 9 se abre em 54 e o
  caso 1 em um teste por ator.
- `src/modules/andamento/registrar-concorrencia.test.ts` — os casos (a) a (e) do AN-05 e os três do AN-08. São 10
  testes, com duas transações reais.
- `src/modules/andamento/registrar-prazo.test.ts` — o AN-06 (a) e (b), num banco próprio com o gatilho de teste.

### Arquivos modificados

- `test/estatico/andamento.test.ts` — só acréscimos (D-04). O bloco "AN-06: prazo total do registro, sem piso por
  cima (T07)" tem 5 testes:
  - nenhum `set local`, `set_config`, `comTransacao(` nem `Promise.all(` no código que roda de `src/modules/andamento/`;
  - `executarComOrcamento(` uma vez só, com `undefined`, e `registrarAndamento` com exatamente os parâmetros
    `deps, ator, decId, corpo`;
  - `mudarStatusPeloConstruir` e `conferirLimiteDeAndamento` sem SET, sem transação própria, sem orçamento aninhado e
    sem `Promise.all`;
  - as travas na ordem pedido → demanda → limite, e `travarPedido` importado de `pendentes` no registro, na entrega e
    no recebimento (a mesma trava);
  - os casos plantados que reprovam cada regra.
- `test/estatico/piso-de-assercoes.test.ts` — o `PISO` ganhou os três arquivos novos (56, 36 e 6 linhas com
  `expect(`). O piso de `test/estatico/andamento.test.ts` subiu de 8 para 43. Nenhuma entrada desceu.

### Teste escrito antes, visto falhando

Comando: `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar.test.ts src/modules/andamento/registrar-concorrencia.test.ts src/modules/andamento/registrar-prazo.test.ts test/estatico/andamento.test.ts --reporter=dot`.
Rodei antes de criar `registrar.ts`:

```
 FAIL  src/modules/andamento/registrar-concorrencia.test.ts [ ... ]
Error: Cannot find module './registrar' imported from .../src/modules/andamento/registrar-concorrencia.test.ts
 FAIL  src/modules/andamento/registrar-prazo.test.ts [ ... ]
Error: Cannot find module './registrar' imported from .../src/modules/andamento/registrar-prazo.test.ts
 FAIL  src/modules/andamento/registrar.test.ts [ ... ]
Error: Cannot find module './registrar' imported from .../src/modules/andamento/registrar.test.ts
 FAIL  test/estatico/andamento.test.ts > AN-06: ... > src/modules/andamento/**: nenhum SET, comTransacao nem Promise.all no código que roda
AssertionError: expected [ …(3) ] to include 'src/modules/andamento/registrar.ts'
 Test Files  4 failed (4)
      Tests  3 failed | 11 passed (14)
```

### Os testes pegam o erro (mutação plantada e desfeita)

Para conferir que os testes pegam erro de verdade, plantei duas mutações em `registrar.ts` e depois as desfiz:

1. tirei o `dec.demandaId !== gerado.demandaId` (o vínculo do AN-03);
2. passei `conferirLimiteDeAndamento` para antes do "mesmo estado".

Rodei os três arquivos e 3 testes falharam:
- AN-03: o envio pela outra demanda gravou, em vez de dar 404;
- AN-08 (3): o mesmo estado esperou a trava do limite e deu 503;
- CA-12: o mesmo estado com 60 linhas deu 429.

Desfiz as duas mutações antes da suíte completa. O `registrar.ts` final é o do plano.

### Resultado

- Testes da tarefa, nos 4 arquivos: **100 passaram, 0 falharam** (22 s; os de banco levam de 3 a 10 s por arquivo).
- `pnpm test` completo: **327 arquivos, 7353 testes passaram, 0 falharam** (247 s).
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4: o `git diff 0ac099a --stat` das superfícies congeladas saiu **vazio**.
- `git status --short`: só os 7 arquivos da tarefa (5 novos e 2 modificados).

### Desvios do plano

- **A tabela 9 × 3 × tipo (caso 9).** O plano pede "importe a mesma constante, exportada de lá [regras.test.ts] para
  `test/andamento.ts`". Isso exigiria mudar `regras.test.ts`, que não está na G5, ou importar um arquivo `.test.ts`, o
  que roda os testes dele de novo. Por isso escrevi a tabela em `test/andamento.ts` (`TABELA_DO_CONSTRUIR`), igual à do
  `regras.test.ts`. Em cada um dos 54 casos, o teste confere o resultado do banco contra a tabela e confere que
  `decidirPorStatus` dá o mesmo resultado. Assim, se uma das três divergir, o teste falha (D-08).
- **"Menos de 1 s" e "menos de 3 s" (AN-08) sem relógio real.** A G3.9 proíbe `performance.now()` direto, e a revisão
  da T03 apontou isso (Minor 2). Então o tempo é provado pelas travas:
  - a pessoa e o Awave rodam numa transação com `lock_timeout = '1s'`; se alguma trava continuasse presa, falhariam
    com 55P03;
  - no caso (1), o envio recebe o 503 do `lock_timeout` de 2 s que `limitarTempo` põe;
  - no caso (3), o envio no mesmo estado resolve sem erro; se tomasse a trava do limite, cairia no mesmo 503.
- **A espera na trava sem sono fixo (D-13).** O plano diz "soltar depois de 300 ms". Em vez disso, `segurando` devolve
  o `pid` da transação segura, e o teste só solta depois de ver o envio na fila atrás dela
  (`pg_blocking_pids`). Assim a ordem fica forçada sem depender do agendador. Se a ação segura falhar antes de tomar a
  trava, o teste falha na hora, em vez de esperar o tempo-limite.
- **Asserções a mais que o plano:**
  - AN-03: além do código e da mensagem, o teste exige que nome, `message`, código, mensagem e `extras` sejam
    idênticos nos cinco casos.
  - Prazo (a): o teste exige que o tempo-limite não seja `0` (desligado).
  - Ciclo de 20 tarefas: o teste confere a sequência exata das 7 fases dos eventos, além do "no máximo 7".
  - AN-11: o teste confere ator, `construir` e prefixo de todo `andamento_registrado`.
- **Os casos 3 a 6 com um DEC cada.** Cada `it` monta o estado anterior que precisa (por exemplo, o primeiro envio antes
  do segundo). Assim nenhum teste depende da ordem dos outros.
- **`apagarAndamentos` em `test/andamento.ts`.** Não está na lista da G7. É o "apagando antes as linhas de andamento
  delas pelo migrator" do caso 9, num ajudante. O papel do app continua sem `DELETE` (AN-10).

## Decisões tomadas

- **Código do serviço igual ao do plano.** Ele já segue as lições das 0.3.x que o maestro lembrou:
  - o 404 não tem oráculo (o mesmo `naoEncontrado()` antes de travar a demanda);
  - a trava é `travarPedido` de `pendentes.ts`;
  - a transação é `executarComOrcamento` com `undefined`;
  - o piso entra na abertura de `comTransacao`, que não muda.
- **Concorrência pelo `pg_blocking_pids`.** É visível para o papel do migrator sem `pg_read_all_stats`, e não confunde
  esperas de outros arquivos de teste no mesmo Postgres, o que um filtro por `pg_locks` de `transactionid` poderia
  fazer.
- **O piso de `andamento.test.ts` subiu para 43.** A G4 diz que o piso só sobe, e a T07 está entre as tarefas que o
  atualizam. Subir protege a guarda do AN-06.
- **Comandos `pnpm` com `--dir <repo>`.** O shell começa na estruturaAutonoma, e `cd` não está na lista Pode. É a forma
  das entregas anteriores deste pedido.

## Pendências

- Nenhuma bloqueia a passagem.
- **Para o maestro (forma de comando):** rodei alguns comandos só de leitura fora da forma exata da lista Pode. Estão
  em Comandos executados do jeito que rodaram. Peço a liberação como leitura (regra de 25/10):
  - um `grep -n` com `\|` no padrão, sobre o plano (arquivo rastreado), sem `-r`;
  - alguns `git grep` com mais de um `-e`, que contam como alternativa;
  - dois `ls` com mais de uma pasta do repositório no mesmo comando.

  Nenhum deles alterou nada.
- **Para a `06-T07-revisao`:**
  - a G4 saiu vazia;
  - em teste existente, mudaram só os dois arquivos que a G5 prevê, os dois só com acréscimos, mais a linha do piso
    que sobe;
  - a contagem de `expect(` está acima.
- **Para a `06-T08` (rota):** o serviço lança `ErroDominio` com `nao_encontrado`, `conflito`, `limite_excedido`,
  `indisponivel` e `sem_permissao`, e o `rota()` já traduz cada um deles. Faltam para a T08:
  - o 404 byte a byte pela rota;
  - o 422 sem consulta;
  - o `IMPORTAM_REGISTRAR` de `andamento-qa.test.ts`, que já lista a rota. O `test/andamento.ts` não é código que roda
    (fica fora de `src/` e `scripts/`), então não entra nessa lista.
- **Para a `06-T10` (seed):** o serviço não aceita a transação de quem chama, como a D-07 previa. O seed grava direto.
- **Para a `08-revisao`:** a guarda estática confere a ordem das travas em relação à trava da demanda, mas não confere
  que o "mesmo estado" vem antes do limite. Essa ordem está provada pelo comportamento (AN-08 (3) e CA-12, conferidos
  pela mutação acima).
- Nenhuma migration rodou, e nada tocou banco fora do Testcontainers.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `grep -n "^##\|^###\|T07" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano e a T07 (fora da forma: alternativa e sem `-r`; só leitura)
- `grep -rn "T07" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — Pendências que citam a T07
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — último commit `5e238a0` (06-T06-testes)
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/andamento /home/deploy/servidor/projetos/ws-orquestrador-demandas/test /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico` — arquivos do módulo e dos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -e "travar" -- src/modules/pedido-construcao/entregar.ts src/modules/versoes.ts src/modules/pacotes-decisao/substituido.ts src/modules/acesso/ator.ts src/modules/acesso/mensagens.ts src/lib/erros.ts src/lib/deps.ts` — assinaturas que o serviço usa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -- src/modules/demandas/transicoes.ts src/modules/limites.ts src/modules/historico/registrar.ts src/modules/acesso/matriz.ts` — assinaturas que o serviço usa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "MENSAGEM_SEM_PERMISSAO" -- src/modules/acesso` — origem da mensagem do 403
- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/demandas /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/integracoes /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/pedido-construcao` — testes vizinhos, para o molde
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export async function" -e "export const alterar" -e "export type DepsDemanda" -- src/modules/demandas/servico.ts src/modules/demandas/schemas.ts src/modules/pacotes-decisao/decidir.ts` — assinaturas de `alterarDemanda` e `registrarDecisao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files drizzle` — migrations 0008 e 0009
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -l "from 'typescript'" -- test src` — quem já importa o `typescript`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CORPO_DO_AWAVE" -- src test` — como os testes criam demanda do Awave
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A1 "atorTipo: 'pessoa'" -- src/modules/pedido-construcao/pendentes-bordas.test.ts src/modules/pedido-construcao/pendentes.test.ts src/app/api/pedidos-construcao` — evento de pessoa forjado pelo migrator
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export type Status" -e "export type Tipo" -- src/modules/demandas/schemas.ts` — tipos exportados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib/relogio.ts` — `relogioFixo` com `avancar`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:vitest.config.ts` — tempo por teste (30 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "andamento_construcao" -e "poolApp" -e "poolMigrator" -- src/db/imutabilidade.test.ts` — a imutabilidade é por privilégio (o migrator pode apagar no teste)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "from 'typescript'" -- test/estatico` — forma do import
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A3 "export type DemandaVistaDaIntegracao" -- src/modules/demandas/consultas.ts` — a vista do Awave tem `id`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export function" -- src/lib/reduzir-erro.ts` — `lerCode` e `reduzirErro`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar.test.ts src/modules/andamento/registrar-concorrencia.test.ts src/modules/andamento/registrar-prazo.test.ts test/estatico/andamento.test.ts --reporter=dot` — antes do serviço: 4 arquivos falharam, 3 de 14 testes (trecho acima)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar.test.ts src/modules/andamento/registrar-concorrencia.test.ts src/modules/andamento/registrar-prazo.test.ts test/estatico/andamento.test.ts --reporter=dot` — com o serviço: 100 de 100
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/registrar.test.ts src/modules/andamento/registrar-concorrencia.test.ts test/estatico/andamento.test.ts --reporter=dot` — com as duas mutações plantadas: 3 falharam, 95 passaram (mutações desfeitas em seguida)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/modules/andamento/registrar.test.ts src/modules/andamento/registrar-concorrencia.test.ts src/modules/andamento/registrar-prazo.test.ts test/estatico/andamento.test.ts` — 56, 36, 6 e 43
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "it(" -- test/estatico/piso-de-assercoes-qa.test.ts` — o teste qa do piso não fixa as entradas novas
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 327 arquivos, 7353 de 7353 (rodou em segundo plano; saída lida com a ferramenta Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 5 arquivos novos e 2 modificados, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `test/estatico/andamento.test.ts` +67, `test/estatico/piso-de-assercoes.test.ts` +6 −1 (a linha do piso que sobe)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
