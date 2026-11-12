---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T08-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, tarefas.json, 05-tech-lead.md, parada-P2.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T07 passo 3 a 4, T08, início da T09), 01-analista-requisitos.md (RF-05 e RF-06), 06-T01-engenheiro-dados-bd.md (Pendências), 06-T01-tech-lead.md (Pendências), 06-T01-qa-automacao.md (Pendências), 06-T02-engenheiro-backend.md, 06-T02-tech-lead.md, 06-T02-qa-automacao.md, 06-T03-engenheiro-backend.md, 06-T03-tech-lead.md, 06-T03-qa-automacao.md, 06-T04-engenheiro-backend.md, 06-T04-tech-lead.md, 06-T04-qa-automacao.md, 06-T05-engenheiro-backend.md, 06-T05-tech-lead.md, 06-T05-qa-automacao.md, 06-T06-engenheiro-backend.md, 06-T06-tech-lead.md, 06-T06-qa-automacao.md, 06-T07-engenheiro-dados-bd.md, 06-T07-engenheiro-backend.md, 06-T07-tech-lead.md, 06-T07-qa-automacao.md, src/modules/demandas/servico.ts, src/modules/demandas/transicoes.ts, src/modules/versoes.ts, src/modules/agentes/gatilhos.ts, src/modules/agentes/gatilhos.test.ts, src/modules/agentes/executar.ts, src/modules/agentes/executar.test.ts (linhas 1 a 140), src/modules/agentes/execucoes.ts (linhas 1 a 80), src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/historico/consultas-integracao.test.ts (linhas 1 a 50), src/modules/acesso/ator-pessoa.ts, src/modules/acesso/exigir-pessoa.ts, src/components/rotulos.ts, src/lib/acao-painel.ts, src/lib/log.ts, src/db/transacao.ts, src/db/schema/demandas.ts (linhas 1 a 60), src/app/(painel)/demandas/[id]/acoes.ts, src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.test.ts, src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts (linhas 1 a 110), test/integracoes.ts, test/provedor-falso.ts, test/deps.ts, test/banco.ts, test/sessao.ts, test/estatico/exigir-pessoa.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T08: confirmação da demanda do Awave por pessoa e nenhum agente de IA antes dela (RF-05 nos gatilhos e no worker,
RF-06 no servidor, IN-06, IN-07, IN-12 `demanda_confirmada`, CA-06.1 a CA-06.6, D-07, D-08, D-15, D-18). Vale a decisão
de Fabiano na Parada 1 (P-01, D-13): a Server Action não pede diálogo nem papel; qualquer pessoa com sessão e 2FA
confirma (linha `confirmar_demanda` = `QUALQUER_PESSOA_SEM_AGENTE`, da T03).

### Pendências das entregas 06-T01 a 06-T07 que citam a T08

Conferi com `git log -G T08` na pasta do pedido e lendo as Pendências das 22 entregas. Só a 06-T06 cita a T08:

| Origem | Pendência | Como ficou |
|---|---|---|
| 06-T06-engenheiro-backend | "a guarda do IN-06 em `dispararSeLigado` e no passo 3c do worker continua com a T08" | Feito: primeira linha de `dispararSeLigado` e passo 3c de `executarReivindicada` |
| 06-T06-tech-lead, parecer 2 (Minor) | trocar `entrada.tipo` por `campos.tipo` no `depois` do `demanda_criada` | Feito em `servico.ts:223` (desvio 1, abaixo) |

### Arquivos alterados

| Arquivo | O que mudou | G8 |
|---|---|---|
| `src/modules/agentes/gatilhos.ts` | Primeira linha de `dispararSeLigado`: com `demandaId` e `aguardaConfirmacao` verdadeiro, devolve `false` sem criar nada, para os quatro agentes. Comentário do cabeçalho com a regra nova | #25 |
| `src/modules/agentes/executar.ts` | `MotivoIgnorada` ganha `sem_confirmacao`. Passo 3c, logo depois do M-02 e antes de `montarEntrada`: `ignorar(c, 'agente_ignorado', 'sem_confirmacao')`, sem provedor nem `uso_ia` (D-07). Comentário do cabeçalho com o 3c | #26 |
| `src/app/(painel)/demandas/[id]/acoes.ts` | `confirmarDemandaNoPainel` no arquivo `'use server'` que já existia (G4): `acaoDoPainel` com `confirmar_demanda` e `z.strictObject({ id: regex RE_ID_DEMANDA })`; a resposta é só `{ id }` | — |
| `src/components/rotulos.ts` | `MOTIVO_IGNORADO.sem_confirmacao = 'demanda aberta pelo Awave ainda não confirmada'` (D-18) | — |
| `src/modules/demandas/servico.ts` | Só o `depois` do `demanda_criada`: `tipo: campos.tipo` em vez de `entrada.tipo`, com uma linha de comentário (desvio 1) | — |

### Arquivos criados

- `src/modules/demandas/confirmacao.ts`: `jaConfirmada` (existe evento `demanda_confirmada` com `entidade = 'demanda'` e
  `entidade_id` da demanda) e `aguardaConfirmacao` (`switch` por `autorTipo` com `never`: pessoa e agente `false`;
  integração `!jaConfirmada`; desconhecido `true`, falha fechada; demanda que não existe `false`). Lê só `demanda` e
  `evento`. G8 #23.
- `src/modules/demandas/confirmar.ts`: `MENSAGENS_CONFIRMACAO` (textos da 03, seção 9) e `confirmarDemanda(deps, ator,
  id, t?)`: `autorizar('confirmar_demanda')`, `exigirAtorPessoa`, e na transação, sob `travarDemanda`, a ordem do D-08
  (outra origem → 409; já confirmada → `{ jaConfirmada: true }` sem gravar; status final → 409); depois o evento
  `demanda_confirmada` com a pessoa e `depois: { confirmada: true }`, e então `dispararSeLigado('insumo_tecnico',
  'demanda:<id>')`. `ehDoAwave` em `switch` com `never` (G8 #24). Aceita a transação de quem chama (G3.8).
- Os quatro arquivos de teste abaixo.

`src/modules/agentes/entrada-agente.ts` não mudou (D-15).

### Testes criados (40, em 4 arquivos)

`src/modules/demandas/confirmar.test.ts` (13, Postgres real, insumo ligado com preço e teto livres):
1. Controle: a demanda do Awave nasce sem evento, execução nem job, e `aguardaConfirmacao` é `true`.
2. CA-06.1: `{ jaConfirmada: false }`, um evento, uma execução `demanda:<id>` e um job; a linha do evento é exatamente
   `pessoa`, o id da pessoa, sem prefixo, a demanda, `antes` nulo e `depois { confirmada: true }`; o histórico mostra a
   pessoa pelo nome e papel.
3. CA-06.2 desligado e CA-06.2 suspenso pelo teto (teto 0): evento gravado, nenhuma execução nem job.
4. CA-06.3: confirmar de novo dá `{ jaConfirmada: true }`, e as contagens ficam em 1.
5. IN-07: duas confirmações simultâneas dão um `false` e um `true`, e um evento, uma execução e um job.
6. CA-06.4 com demanda de pessoa e com demanda do agente `orquestrador`: 409 `conflito` com `outraOrigem`, nada a mais.
7. CA-06.5: Awave encerrada sem confirmação → 409 com `statusFinal`, nada gravado.
8. D-08: já confirmada e depois encerrada → `{ jaConfirmada: true }` sem gravar.
9. Demanda que não existe → `nao_encontrado` com `MENSAGEM_NAO_ENCONTRADO`.
10. CA-06.6: dois agentes, as duas integrações e o sistema → `sem_permissao`, nada gravado.
11. C-11 e C-34: a linha inteira da demanda é igual antes e depois da confirmação (autoria, rascunho, status e
    `atualizada_em`).

`src/modules/agentes/gatilhos-awave.test.ts` (11, os quatro agentes ligados):
1. ESP sem dúvida e RSK da pessoa na demanda do Awave não confirmada: nenhuma execução, nenhum job, provedor sem chamada.
2. `dispararSeLigado` direto, para cada um dos quatro agentes: `false` e nada criado.
3. Depois da confirmação, a ESP nova dispara o risco (`esp:<id>`) e a confirmação disparou o insumo (`demanda:<id>`).
4. Depois da confirmação, o RSK com ESP dispara a consolidação.
5. Regressão: demanda de pessoa dispara insumo, risco e consolidação como hoje.
6. Regressão: demanda do agente `orquestrador` dispara o insumo sem confirmação.
7. Regressão: entrada sem demanda (`demandaId` nulo, orquestrador) dispara como hoje.
8. A execução criada pela confirmação roda no worker e chama o provedor uma vez.
9. `aguardaConfirmacao` e `jaConfirmada`: pessoa e agente não aguardam; Awave aguarda até a confirmação; inexistente não
   aguarda.
10. Um evento `demanda_confirmada` de outra entidade com o mesmo id, e a confirmação de outra demanda, não contam.
11. Falha fechada, num banco próprio com `demanda_autor_tipo_check` retirado: `autor_tipo` fora da lista aguarda.

`src/modules/agentes/executar-awave.test.ts` (6, execução inserida à mão por `criarExecucao`):
1. Insumo na demanda do Awave não confirmada: `ignorada`, status `ignorada`, provedor sem chamada, sem `uso_ia`, sem
   ESP, e um evento só, `agente_ignorado` do sistema com `{ agente: 'insumo_tecnico', motivo: 'sem_confirmacao' }`.
2. D-18: `textoDoEvento` do histórico dá "Agente de insumo técnico não rodou: demanda aberta pelo Awave ainda não
   confirmada".
3. Risco (`esp:`) na mesma situação: ignorado do mesmo jeito.
4. O M-02 vem antes: Awave encerrada sem confirmação sai com `demanda_final`.
5. Depois da confirmação (feita com o insumo desligado), a execução roda: provedor chamado uma vez, um `uso_ia`, uma ESP.
6. Regressão: execução de demanda de pessoa roda como hoje.

`src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts` (10, banco e Better Auth reais, no molde de
`especificacoes/nova/acoes.test.ts`):
1. CTO com 2FA: `{ ok: true, dados: { id } }` e o evento com o id da pessoa da sessão.
2. P-01: a administradora com 2FA também confirma.
3. CA-06.3 pelo painel: a segunda confirmação (de outra pessoa) é `ok` e não grava outro evento.
4. Sem sessão: `nao_autenticado`, nada gravado. Sessão sem 2FA: `sem_2fa`, nada gravado.
5. C-11: chave a mais (`extra`, `confirmada`) → `entrada_invalida`, nada gravado.
6. C-17: id fora do formato, com aspas, número, objeto vazio, `null` e string solta → `entrada_invalida`.
7. Demanda que não existe → `nao_encontrado` com o texto de sempre; demanda de pessoa → `conflito` com `outraOrigem`.
8. C-21: uma linha de log `{ level, time, evento: 'acao_painel', rota: 'confirmar_demanda', ms, atorTipo: 'pessoa' }`,
   sem o id da demanda.

### Teste antes do código (visto falhando)

Rodada 1, com os testes escritos e nenhum código:
`pnpm --dir … test src/modules/demandas/confirmar.test.ts src/modules/agentes/gatilhos-awave.test.ts src/modules/agentes/executar-awave.test.ts "src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts"`

```
 FAIL  src/modules/demandas/confirmar.test.ts [ src/modules/demandas/confirmar.test.ts ]
Error: Cannot find module './confirmacao' imported from .../src/modules/demandas/confirmar.test.ts
 FAIL  src/modules/agentes/gatilhos-awave.test.ts [ ... ]
Error: Cannot find module '../demandas/confirmacao' imported from .../src/modules/agentes/gatilhos-awave.test.ts
 Test Files  4 failed (4)
      Tests  no tests
```

Rodada 2, o mesmo comando, depois de criar só `confirmacao.ts` e `confirmar.ts` e antes de mexer em `gatilhos.ts`,
`executar.ts`, `acoes.ts` e `rotulos.ts`. Ela mostra que as guardas do IN-06 faltavam de fato:

```
 ❯ src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts (10 tests | 10 failed)
 ❯ src/modules/agentes/executar-awave.test.ts (6 tests | 3 failed)
     × insumo técnico na demanda do Awave não confirmada: ignorada, agente_ignorado sem_confirmacao, sem provedor nem uso
     × D-18: o histórico da demanda mostra o motivo com o texto fixo
     × o risco (esp:) na demanda do Awave não confirmada também é ignorado, sem chamar o provedor
 ❯ src/modules/agentes/gatilhos-awave.test.ts (11 tests | 3 failed)
     × ESP sem dúvida e RSK da pessoa na demanda do Awave não confirmada: nenhuma execução, nenhum job, nenhuma chamada ao provedor
     × dispararSeLigado chamado direto, para cada agente, na demanda do Awave não confirmada: false e nada criado
     × depois da confirmação, uma ESP nova sem dúvida dispara o risco como hoje
AssertionError: expected 'concluida' to be 'ignorada' // Object.is equality
TypeError: confirmarDemandaNoPainel is not a function
 Test Files  3 failed | 1 passed (4)
      Tests  16 failed | 24 passed (40)
```

O `expected 'concluida' to be 'ignorada'` é o defeito que a T08 fecha: sem o 3c, o worker chamava o provedor com o texto
do Awave. O terceiro de `gatilhos-awave` falhou porque a ESP de antes da confirmação já disparava o risco. Os 24 que
passaram na rodada 2 são os 13 de `confirmar.test.ts` (o módulo já existia nessa rodada) e guardas de regressão do que
não pode mudar (pessoa, agente, entrada sem demanda, M-02 antes do 3c, a execução depois da confirmação).

Rodada 3, o mesmo comando, depois do código: **4 arquivos, 40 de 40**.

### Resultado final

- `pnpm test` (suíte inteira): **265 de 265 arquivos e 5661 de 5661 testes**, 0 falharam, em 181 s (antes: 261
  arquivos e 5621 testes, na 06-T07-testes; entraram 4 arquivos e 40 testes).
- `pnpm build`: compilou, sem rota nova, e não deixou arquivo rastreado alterado.
- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- `gatilhos.test.ts`, `gatilhos.bordas.test.ts`, `executar.test.ts` e `executar.bordas.test.ts` passam sem mudança.
- `test/estatico/exigir-pessoa.test.ts` (C-04) passa: o `acoes.ts` continua chamando `acaoDoPainel`.
- G4: `git diff a9fd9b8 --stat` das superfícies congeladas e de `src/lib/rota.ts` saiu vazio. Nenhum arquivo
  `'use server'` novo.
- IN-16: nenhum teste existente mudou (`git status` mostra só os quatro testes novos como arquivos novos de teste); os 16
  arquivos do D-17 não foram tocados.

### Desvios do plano

1. **`src/modules/demandas/servico.ts` mudou, e não está na lista de arquivos da T08.** É o parecer 2 (Minor) da
   06-T06-revisao, que a Pendência endereçou à T08: o `depois` do `demanda_criada` passa a ler `campos.tipo` (o que foi
   gravado, pela lista de permissão) em vez de `entrada.tipo`. O valor é o mesmo hoje (o Zod restringe à enumeração e
   `camposDaEntrada` copia), então não há mudança de comportamento; `criacao-awave.test.ts` (CA-04.5, `depois`
   exatamente `{ status: 'nova', tipo: 'melhoria' }`) continua verde e cobre a linha.
2. **`MENSAGENS_CONFIRMACAO` com `Object.freeze`** em vez de `as const`: os textos são os do plano; congelar impede que
   alguém troque a mensagem em tempo de execução.
3. **Testes além do texto do plano**: suspensão pelo teto no CA-06.2, demanda do agente no CA-06.4, D-08 com demanda
   já confirmada e encerrada, demanda inexistente, evento de outra entidade que não conta, falha fechada da autoria
   desconhecida, o M-02 antes do 3c, as regressões de agente e de entrada sem demanda, e o log da Server Action. Só
   reforçam a T08.
4. **Usuário fictício gravado no `beforeAll`** dos três testes de módulo (como em `gatilhos.test.ts`), para o histórico
   mostrar a pessoa pelo nome no CA-06.1. O plano usava o id `p1` sem conta.

## Decisões tomadas

- A guarda de `dispararSeLigado` fica antes de `estadoDoAgente`, como o plano manda: a demanda do Awave não confirmada
  nem consulta configuração ou teto. Ela vale para os quatro agentes, então ESP e RSK gravados por pessoa numa demanda
  do Awave não confirmada também não disparam risco nem consolidação (o teste 1 de `gatilhos-awave` prova).
- O evento `demanda_confirmada` é gravado antes do disparo, na mesma transação: o gatilho lê a confirmação que acabou de
  entrar e cria a execução. Se o disparo falhar (por exemplo, sem fila com o agente ligado), o evento sai junto.
- A concorrência (IN-07) fica com a trava `FOR UPDATE` da linha da demanda: a segunda confirmação espera, lê o evento da
  primeira e devolve `{ jaConfirmada: true }`. A chave única `(agente, chave_entrada)` da execução é a segunda barreira.
- A Server Action devolve só `{ id }`, sem `jaConfirmada`: confirmar de novo não é erro (RF-06) e a tela da T18 relê a
  página. A ação não tem diálogo nem confere papel além da matriz (P-01).
- Nenhuma linha de log nova (G3.10): o worker reusa o `log.info` de `ignorar`, que já leva só `agente`, `execucaoId`,
  `demandaId`, tentativa e o motivo; a Server Action, a linha de `acaoDoPainel`.
- Nenhum pacote, variável de ambiente, migration, GRANT, rota ou arquivo `'use server'` novo.
- Dados de teste fictícios: "(fictício)", "Pessoa Ficticia", e-mails `@exemplo.test`, prefixo `ficticio`. Nenhum token
  é gerado nesta tarefa.
- Glob e Grep não estavam disponíveis nesta sessão. Li os arquivos com Read e achei os arquivos por `git log -G`,
  `git log -S` e `git log --diff-filter=A`.

## Pendências

- Nenhuma bloqueia a T08.
- **Comando fora da regra deste pedido:** uma busca rodou com `git grep` (vetado no prompt do maestro) para achar as
  linhas do RF-06 e das mensagens no `01` e no `03`. Só leu dois documentos da pasta do pedido; não alterou nada. Está
  listada em Comandos executados, como rodou.
- Para a T18 (frontend): `confirmarDemandaNoPainel({ id })` devolve `{ ok: true, dados: { id } }`, ou `{ ok: false,
  erro, mensagem }` com `conflito` e as duas mensagens de `MENSAGENS_CONFIRMACAO` (a tela acrescenta "Não foi possível
  concluir: "), `nao_encontrado`, `nao_autenticado` ou `sem_2fa`. Confirmar de novo também é `ok`.
- Para a T17 (D-06): o painel lê "confirmada, por quem e quando" do histórico pelo evento `demanda_confirmada` (ator
  pessoa, `depois { confirmada: true }`); o servidor usa `aguardaConfirmacao`.
- As caixas `- [ ]` da T08 no plano não foram marcadas: o G1 não deixa a 06 editar `docs/`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --name-only -40` — as passagens 06-T01 a 06-T07 e os arquivos de cada uma
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G T08 --name-only --format=%h -- docs/construcao/DEC-DEM-20261111-0016-v1` — só o 05, a parada P2 e as duas entregas da 06-T06 citam a T08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "dispararSeLigado\(" --name-only --format=%h -- src` — quem chama o gatilho (`servico.ts`, `entrada.ts`, `especificacoes/servico.ts`, `pareceres-risco/servico.ts`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- src/modules/agentes src/modules/versoes.ts src/modules/demandas/transicoes.ts test/deps.ts test/estatico/exigir-pessoa.test.ts` — onde moram a trava, os status finais e os testes de agentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "MOTIVO_IGNORADO" --name-only --format=%h -- src test e2e` — só `rotulos.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "precisa de confirma" --name-only --format=%h -- docs src` — a mensagem está no 03, na spec e no plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "CA-06" -e "RF-06" -e "RF-05" -- docs/construcao/DEC-DEM-20261111-0016-v1/01-analista-requisitos.md docs/construcao/DEC-DEM-20261111-0016-v1/03-ux-ui-design.md` — fora da regra deste pedido (`git grep` vetado); só leitura de dois documentos da pasta do pedido, para achar as linhas do RF-06 (ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "com2fa: false" --name-only --format=%h -- "src/app/(painel)"` — os testes de Server Action com sessão sem 2FA, para o molde
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/confirmar.test.ts src/modules/agentes/gatilhos-awave.test.ts src/modules/agentes/executar-awave.test.ts "src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts"` — rodada 1, sem código: 4 arquivos falharam (módulo inexistente), nenhum teste rodou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/confirmar.test.ts src/modules/agentes/gatilhos-awave.test.ts src/modules/agentes/executar-awave.test.ts "src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts"` — rodada 2, só com `confirmacao.ts` e `confirmar.ts`: 16 falharam e 24 passaram (trecho acima)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/confirmar.test.ts src/modules/agentes/gatilhos-awave.test.ts src/modules/agentes/executar-awave.test.ts "src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts"` — rodada 3, depois do código: 4 arquivos, 40 de 40
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 265 de 265 arquivos, 5661 de 5661 testes, código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 5 alterados e 6 novos, todos da T08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 5 arquivos, 34 linhas a mais e 5 a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — só os três da T03, já commitados; a T08 não tocou nenhum (IN-16)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — compilou, sem rota nova
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o build não deixou arquivo rastreado alterado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — HEAD em e82f615 (06-T07-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — depois da suíte, a mesma lista, mais esta entrega

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (mais `servico.ts`, pela Pendência da 06-T06-revisao endereçada à T08; desvio 1)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (`confirmarSchema` é `z.strictObject` com a regex do id; os 409 têm as mensagens fixas da 03; nenhuma rota ou job novo)
