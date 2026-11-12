---
pedido: DEC-DEM-20261112-0019-v1
etapa: 04-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, padrao-tecnico.md (início), pedido.json, 02-tech-lead.md, 03-engenheiro-backend.md, 04-maestro.md, src/modules/demandas/confirmacao.ts, src/modules/demandas/confirmar.ts, src/modules/demandas/confirmacao-0019.test.ts, src/modules/acesso/matriz.ts, src/app/api/pacotes-decisao/route.ts, src/app/api/pacotes-decisao/[decId]/route.ts, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/app/api/demandas/route.ts, src/app/api/demandas/visibilidade-agente-0019.test.ts, src/modules/pacotes-decisao/consultas.ts, src/db/transacao.ts, src/db/transacao-prazo.test.ts, src/modules/integracoes/tempo-limite.ts, src/modules/integracoes/tempo-limite.test.ts, src/modules/integracoes/prazo-total-0019.test.ts, src/modules/agentes/executar.ts, src/modules/agentes/execucoes.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/executar-0019.test.ts, src/jobs/batimento.ts, src/modules/versoes.ts, src/db/schema/agentes.ts, src/db/schema/historico.ts, src/db/schema/demandas.ts, src/components/dados-da-confirmacao.ts, src/components/dados-da-confirmacao.test.ts, src/components/dados-da-confirmacao-qa.test.ts, src/modules/historico/consultas.ts (início), test/banco.ts, test/integracoes.ts, test/estatico/sql-raw.test.ts, package.json, playwright.config.ts]
status: pronto
proximo: seguranca-aplicacao
devolvido_para: null
---
## Entrega

Correção dos três altos (A-1, A-2, A-3) e dos quatro médios (M-a, M-b, M-c, M-d) da `04-maestro.md`, cada um com teste
que falhou antes do código e passa depois. Todos os arquivos tocados estão em `src/` (lista **Pode**); conferi antes de
escrever código. Nenhuma asserção de segurança apagada ou afrouxada; nenhum teste da 0.3.0 alterado.

### O que mudou, por achado

| Achado | Arquivos | O que mudou |
|---|---|---|
| A-1 | `src/modules/pacotes-decisao/consultas.ts`, `src/app/api/pacotes-decisao/route.ts`, `src/modules/demandas/confirmacao.ts` | `listarPacotes(db, filtro, op)` ganha `soVisiveisAoAgente`, posto no mesmo `onde` dos itens e do `total`, por `demandaVisivelAoAgente(pacote_decisao.demanda_id)` (novo, em `confirmacao.ts`: `exists` sobre `demanda` com `condicaoVisivelAoAgente()`). Nova `listarPacotesPara(db, filtro, ator)`, no padrão de `listarDemandasPara`: pessoa vê todos; agente e sistema, só os visíveis; integração → `semPermissao` antes de ler; `default` → `atorDesconhecido`. A rota passa a usá-la. |
| A-1 (varredura) | — | Varri as ações que a matriz abre a agente (`listar_demandas`, `ler_demanda`, `ler_especificacao`, `ler_parecer_risco`, `ler_pacote_decisao` e as três `criar_*`) contra todas as rotas de `src/app/api` (achadas por `git log --diff-filter=A` e `git log -S <ação>`). Sobrava só `GET /api/pacotes-decisao`. As outras nove já tinham a regra desde a 03. As telas do painel e as Server Actions são só de pessoa (sessão); `ler_historico`, `ler_texto_bruto`, `registrar_decisao` e `gerar_pedido_construcao` não abrem a agente. |
| A-2 | `src/db/transacao.ts`, `src/modules/integracoes/tempo-limite.ts` | `OpcoesDaTransacao` ganha `abertura`: as instruções do piso, rodadas direto na conexão logo depois do BEGIN. Com prazo, `baixarAteORestante` (a lógica que já existia no Proxy, extraída) roda em seguida, também direto na conexão, e inicializa `p.aplicado` com `min(piso, restante)`. `executarComOrcamento` passa `limitarTempo` como `abertura` e não o chama mais no corpo. Assim nenhum `SET LOCAL` do piso passa pelo Proxy depois do prazo e cobre o restante. Os `SET LOCAL` literais de `limitarTempo` continuam (G3.6 e os testes estáticos de hoje). Sem prazo (pessoa, agente, sistema), o mesmo `limitarTempo` (que não faz nada para eles) roda na abertura, como antes no corpo. |
| A-3 | `src/jobs/batimento.ts`, `src/modules/agentes/execucoes.ts` | `adiadaAteConfirmacao(execucao_agente.id)` (SQL, em `execucoes.ts`): existe o `agente_ignorado` com `motivo = 'sem_confirmacao'` da execução, a marca que o worker já grava ao adiar; sem coluna nem migration. O batimento calcula os agentes não disponíveis (`estadoDoAgente`: desligado ou suspenso pelo teto) e não reenfileira a pendente adiada de um deles. Quando o agente volta, a próxima varredura a reenfileira e o insumo roda uma vez. A pendente comum (não adiada) segue como na 0.3.0. |
| M-a | `src/modules/agentes/executar.ts` | `adiarAteConfirmacao(c, demandaId)` abre a transação com `travarDemanda` (a mesma trava que `confirmarDemanda` pega antes de gravar e reenfileirar) e confere `aguardaConfirmacao` de novo sob ela. Se a confirmação já entrou, devolve `null` e a execução segue (monta a entrada e chama o provedor). Senão, adia como antes. A primeira olhada continua sem trava, então o caso comum não trava nada. Ordem das travas igual nos dois lados: demanda, depois execução. |
| M-b | `src/modules/agentes/execucoes.ts`, `src/modules/agentes/gatilhos.ts` | `reenfileirarPendente` passa a ser um `UPDATE ... RETURNING` (trava a linha como o `FOR UPDATE` de antes) que grava `atualizada_em` com a hora do reenvio; recebe `relogio`, que `dispararOuReenfileirar` repassa. |
| M-c | `src/modules/demandas/confirmacao.ts` | `condicaoVisivelAoAgente()`: `autor_tipo in ('pessoa','agente')` **ou** (`autor_tipo = 'integracao'` **e** existe confirmação de pessoa). Autoria fora da lista nunca é visível, como em `aguardaConfirmacao` (que devolve `true`). Vale para as três regras SQL que a usam: listagem de demandas, listagem de DEC e batimento. |
| M-d | `src/components/dados-da-confirmacao.ts` | `estadoDaConfirmacao` só aceita `demanda_confirmada` com `ator.tipo === 'pessoa'`, a mesma regra de `jaConfirmada` (B-3). |

### Testes criados (4 arquivos, 26 testes) e acrescentados (4 testes)

- `src/app/api/pacotes-decisao/visibilidade-0019.test.ts` (4, rota e tokens reais). DEC gravados por pessoa em três demandas do Awave (confirmada, não confirmada, confirmada). Pelo token `risco`, sem filtro e com `statusDecisao=pendente`: o DEC escondido não está nos itens, o `total` é 2, e nem o id do DEC nem o `demandaId` escondido aparecem no corpo. Também: `limit`/`offset` na borda (inclusive com filtro); `statusDecisao=aprovada` dá 0; a pessoa vê os três sempre; depois da confirmação por pessoa, o agente vê os três e o escondido ocupa o meio da paginação.
- `src/modules/agentes/revisao-0019.test.ts` (6, Postgres, pg-boss e provedor falso):
  - A-3, agente desligado: adiar, confirmar desligado, batimento sem job e execução `pendente`; religar, batimento com 1 job; uma passada dá uma chamada ao provedor, uma ESP e `concluida`, sem `desligado` nem `falha_agente`; depois disso o batimento não manda de novo.
  - A-3, teto 0: o mesmo caminho, com teto 0 no lugar do agente desligado.
  - A-3, regressão: a pendente comum de agente desligado continua sendo reenfileirada pelo batimento.
  - M-a: `vi.mock` parcial de `aguardaConfirmacao`, em que a primeira olhada confirma a demanda e devolve "aguarda". O resultado é `concluida`, uma chamada, uma ESP e nenhum `agente_ignorado`.
  - M-a, controle: sem confirmação, a execução fica adiada.
  - M-b: confirmada 5 min depois do adiamento, `atualizada_em` é a hora da confirmação; com o job pego pelo worker, o batimento seguinte reenfileira 0 e fica um job vivo só.
- `src/modules/demandas/autor-desconhecido-0019.test.ts` (4). Banco próprio do arquivo; o teste tira o CHECK de `autor_tipo` pelo migrator e grava uma demanda de autoria `robo`, sem e com confirmação de pessoa. A regra TS diz "aguarda" e a SQL diz "não visível" nos dois casos. Também: `exigirVisivelPara` dá o 404 do inexistente, e `semEsperaDeConfirmacao` (batimento) trata a execução como em espera.
- `src/components/dados-da-confirmacao-0019.test.ts` (6). `demanda_confirmada` de agente, sistema, integração `awave` e integração nula deixa "aguardando". Em status final, dá "final sem confirmação". A confirmação de outro ator, mais nova ou mais antiga, não toma o lugar da de pessoa.
- `src/modules/integracoes/prazo-total-0019.test.ts` (+4, só acréscimo):
  - A-2, para awave/padrão e construir/entrega: pool de uma conexão segura e relógio monotônico parado; 1 s antes do fim, a conexão é solta, e o tempo-limite em vigor na primeira instrução de quem chama é `{ stmt: 1000, lock: 1000 }`, não o piso.
  - Controle: sem espera, o piso de 5 s e 2 s vale na primeira e na segunda instrução.

### Teste existente alterado (IN-16)

| Teste | Mudança | Base |
|---|---|---|
| `src/modules/agentes/executar-0019.test.ts`, último caso (criado na 03 deste pedido, não é teste da 0.3.0) | Antes exigia que o batimento reenfileirasse a execução adiada logo depois da confirmação com o insumo desligado: era o comportamento que o A-3 aponta como defeito. Agora exige nenhum job enquanto desligado e 1 job depois de religar. | A-3 da `04-maestro.md` |

### Teste antes do código (visto falhando)

Rodada 1, com os testes novos e o alterado, sem nenhum código:

```
 ❯ src/components/dados-da-confirmacao-0019.test.ts (6 tests | 6 failed)
 ❯ src/modules/demandas/autor-desconhecido-0019.test.ts (4 tests | 2 failed)
     × com a confirmação de uma pessoa: aguarda pela regra TS e não é visível pela regra SQL   expected true to be false
     × o batimento trata a execução dessa demanda como em espera (a mesma regra)
 ❯ src/modules/integracoes/prazo-total-0019.test.ts (12 tests | 2 failed)
     × awave (padrao): espera longa pela conexão; ...   expected { stmt: 5000, lock: 2000 } to deeply equal { stmt: 1000, lock: 1000 }
     × construir (entrega): ...                          expected { stmt: 10000, lock: 2000 } to deeply equal { stmt: 1000, lock: 1000 }
 ❯ src/modules/agentes/revisao-0019.test.ts (6 tests | 4 failed)
     × desligado: o batimento não a reenfileira; ...
     × suspenso pelo teto: ...
     × a confirmação entra entre a primeira olhada e o adiamento: ...
     × confirmada minutos depois do adiamento: atualizada_em é a hora da confirmação, ...
 ❯ src/app/api/pacotes-decisao/visibilidade-0019.test.ts
     × sem filtro e com statusDecisao=pendente: ...   + "DEC-DEM-20261112-0002-v1"   (o DEC escondido na lista do agente)
     × limit e offset na borda: ...                   - "total": 2  + "total": 3
 Test Files  6 failed (6)
      Tests  17 failed | 25 passed (42)
```

Os 25 que passaram são controles e regressões que não podem mudar: o piso sem espera, a pendente comum, a pessoa vendo
tudo, a regra TS para autoria desconhecida e o adiamento sem confirmação.

Rodada 2, depois do código, com esses 6 arquivos e os vizinhos (`transacao-prazo`, `tempo-limite`, `confirmacao-0019`,
`dados-da-confirmacao`, `dados-da-confirmacao-qa` e `pacotes`): 146 de 147. A falha era do próprio teste novo do A-3: a
última asserção contava o job que a passada já tinha tratado, porque o teste não o marcava concluído, como o pg-boss
faz. Corrigi o teste com `concluirJobs` antes do último batimento, sem mudar código, e o arquivo deu 6 de 6.

### Resultado final

- `pnpm test` (suíte inteira): **306 de 306 arquivos e 6485 de 6485 testes**, 0 falharam (355 s).
- `pnpm typecheck`: limpo.
- `pnpm lint`: limpo.
- `pnpm test:e2e` (a regra da tela mudou no M-d): **276 passaram, 9 pulados, 0 falharam**, código de saída 0 (18,6 min).
  O `✘` de `e2e/vigia.spec.ts:5` é o controle negativo, que espera reprovar, e entra entre os que passaram.

### Desvios do plano

1. **A-2 pela forma "abertura", e não "esse caminho não chama limitarTempo".** O efeito é o que o maestro pediu: o
   restante é aplicado depois do piso, direto na conexão, e `p.aplicado` começa com `min(piso, restante)`. Mas o
   `limitarTempo` continua sendo o único lugar dos `SET LOCAL` literais. Se ele saísse do caminho, viraria código morto, e
   os testes estáticos dos literais (G3.6) e a origem `session` do `tempo-limite.test.ts` passariam a vigiar nada.
2. **A-3 cobre também o agente suspenso pelo teto.** O worker também encerraria a execução como `ignorada`/`teto` e
   gastaria a chave. A regra é "agente não disponível", a mesma de `filaSeDisponivel`.
3. **A-3 só vale para a execução adiada.** A pendente comum de agente desligado segue reenfileirada e ignorada, como na
   0.3.0 (CA-19.4), com teste de regressão.

## Decisões tomadas

- A-1 com função `…Para` pelo tipo de ator, igual à das demandas, e `listarPacotes` mantida com padrão `false`. Os testes
  de `consultas.test.ts` e `substituicao.test.ts` a chamam com dois argumentos, e a única rota passa pela função nova.
- A-1 com `exists` sobre `demanda`, e não junção, para não mexer na `selecao()` (as subconsultas de `desatualizado` leem
  as tabelas pelo nome). O DEC sem demanda não entra (falha fechada).
- A marca da execução adiada é o evento que o worker já grava (`agente_ignorado`/`sem_confirmacao`, só de inclusão), sem
  migration nem coluna. A busca usa o índice `evento_acao_entidade_idx` (ação, entidade_id).
- Os agentes indisponíveis são calculados em TS antes da varredura e o filtro vai no SQL. Assim o limite de 100 por
  batimento não é ocupado pelas que esperam, e não há fome das outras.
- M-a com a primeira olhada sem trava e a segunda sob a trava: o caso comum, demanda de pessoa, não ganha uma transação a
  mais. Se a confirmação entrou no meio, a execução segue na hora, sem esperar o batimento.
- M-b com `UPDATE ... RETURNING` no lugar do `SELECT ... FOR UPDATE`: trava a mesma linha e grava a hora numa instrução.
- M-c com a regra SQL igual à TS, as duas fechando para autoria desconhecida. O teste tira o CHECK só no banco próprio do
  arquivo, porque o banco de verdade não deixa gravar essa autoria.
- M-d só na regra da tela. A Próxima ação herda o estado da seção (`dados-da-confirmacao-qa`), então não precisou de outra
  mudança.
- A suíte de ponta a ponta rodou a pedido do maestro, porque a regra da tela mudou no M-d. Ela está fora da minha lista
  **Pode**, e o maestro registrou o bloqueio e a liberação. Resultado: 276 testes passaram, 9 foram pulados e nenhum
  falhou.
- Sem rota, tela, migration, GRANT, pacote ou variável de ambiente novos. Nenhuma linha de log nova. Dados de teste
  fictícios, e tokens só gerados em tempo de teste.

## Pendências

- Para o reteste (`seguranca-aplicacao`): três pontos novos.
  - `demandaVisivelAoAgente` e `adiadaAteConfirmacao` são SQL novos, só com valores fixos e colunas.
  - O `abertura` de `comTransacao` roda instruções fora do Proxy do prazo; hoje só os `SET LOCAL` de `limitarTempo`.
  - O `travarDemanda` no adiamento do worker.
- Para o maestro registrar (IN-16): a mudança do último caso de `executar-0019.test.ts`, que é teste deste pedido e não
  da 0.3.0, pela regra do A-3.
- Fora do escopo, só registro: o `agentesEmAndamento` do painel (T-03) pode contar a execução adiada (`pendente`) como
  agente trabalhando enquanto a demanda espera a confirmação. Não conferi, porque não está entre os achados da
  `04-maestro.md`.
- Seção 0.3.1 do `CHANGELOG.md`: `06-documentacao`, pela triagem. Ela deve incluir a listagem de DEC filtrada para
  agente e a espera da execução adiada enquanto o agente está indisponível.
- A ferramenta Grep e a Glob não estavam disponíveis nesta sessão. Li com Read e achei arquivos por `git log
  --diff-filter=A` e `git log -S`.
- O texto do `pedido.json` não traz instrução fora do escopo. Nada a registrar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo antes da correção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo `00f33a7` (04-revisao maestro)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD --stat` — 54 arquivos do ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff main...HEAD -- src/modules/demandas/consultas.ts src/modules/agentes/executar.ts src/modules/agentes/execucoes.ts src/modules/agentes/gatilhos.ts src/jobs/batimento.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmar.ts` — o que a 03 mudou nesses arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- src/app/api` — todas as rotas da API, para a varredura do A-1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S ler_pacote_decisao --name-only --format=%h -- src` — quem usa a ação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S ler_especificacao --name-only --format=%h -- src` — quem usa a ação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S ler_parecer_risco --name-only --format=%h -- src` — quem usa a ação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S listar_demandas --name-only --format=%h -- src` — quem usa a ação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S ler_demanda --name-only --format=%h -- src` — quem usa a ação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- src/db/schema src/modules/agentes src/modules/demandas test` — esquema e ajudantes de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S estadoDaConfirmacao --name-only --format=%h` — testes da regra da tela
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "export type EventoVisivel" --name-only --format=%h` — o tipo do ator no histórico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "listarPacotes(" --name-only --format=%h -- src test scripts` — quem chama a listagem de DEC
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "limitarTempo(" --name-only --format=%h -- src test scripts` — quem chama o piso
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pacotes-decisao/visibilidade-0019.test.ts src/modules/integracoes/prazo-total-0019.test.ts src/modules/agentes/revisao-0019.test.ts src/modules/agentes/executar-0019.test.ts src/modules/demandas/autor-desconhecido-0019.test.ts src/components/dados-da-confirmacao-0019.test.ts` — rodada 1, sem código: 6 arquivos falharam, 17 testes falharam e 25 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pacotes-decisao/visibilidade-0019.test.ts src/modules/integracoes/prazo-total-0019.test.ts src/modules/agentes/revisao-0019.test.ts src/modules/agentes/executar-0019.test.ts src/modules/demandas/autor-desconhecido-0019.test.ts src/components/dados-da-confirmacao-0019.test.ts src/db/transacao-prazo.test.ts src/modules/integracoes/tempo-limite.test.ts src/modules/demandas/confirmacao-0019.test.ts src/components/dados-da-confirmacao.test.ts src/components/dados-da-confirmacao-qa.test.ts src/app/api/pacotes-decisao/pacotes.test.ts` — rodada 2, com código: 146 de 147 (a asserção errada do teste novo do A-3)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/revisao-0019.test.ts` — depois de corrigir o teste: 6 de 6
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 12 alterados e 4 testes novos, todos em `src/`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — suíte inteira: 306 de 306 arquivos, 6485 de 6485 testes, código 0

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa (306 arquivos, 6485 testes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (os sete achados da `04-maestro.md`, todos em `src/`)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (nenhuma rota ou job novo; a listagem de DEC continua com `filtroPacotesSchema`; a integração recebe o `semPermissao` fixo; o agente não vê o DEC escondido nem pelo `total`)
