---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T16-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 1 a 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e mapa das fases e T15 e T16 e T17), 05-tech-lead.md, 06-T15-tech-lead.md, 06-T16-engenheiro-backend.md, commit 90ad586, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/[id]/historico/route.ts, src/app/api/demandas/demandas.test.ts, src/lib/rota.ts, src/modules/acesso/ator.ts, src/modules/acesso/matriz.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/demandas/consultas.ts, src/modules/demandas/servico.ts, src/modules/historico/consultas.ts, test/deps.ts, test/matriz-rotas.test.ts (início)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T16 (rotas de demanda e de histórico), commit `90ad586`. **Nenhum problema Critical ou Important.** A
tarefa passa. Os achados abaixo são Minor e vão para Pendências (seção 12 do padrão técnico).

### Conferência contra o plano

- **Arquivos:** o commit cria exatamente os 4 arquivos que a T16 lista. Fora deles, só a entrega do engenheiro e a
  linha do maestro em `passagens.jsonl`. Nenhum arquivo existente mudou.
- **Contrato:** os 5 métodos batem com o contrato da T16:
  - `POST` e `GET` em `/api/demandas`;
  - `GET` e `PATCH` em `/api/demandas/[id]`;
  - `GET` em `/api/demandas/[id]/historico`.
- **Ações:** as ações (`criar_demanda`, `listar_demandas`, `ler_demanda`, `alterar_demanda`, `ler_historico`) existem
  na matriz.
- **Schemas:** são os da T15, sem schema novo e sem campo de autoria.
- **Regras G3:**
  - toda rota é `rota()` (G3.6);
  - o id passa pela regex de `paramId.demanda` antes de qualquer consulta (G3.10, C-17);
  - a autoria vem só do ator (G3.9, C-11);
  - não há `console.*`, `sql.raw(` nem `new Date()`.
- **`meta.exemplo`:** sai de `exemploDaRota` (`id: 'DEM-20261022-0001'`), que é o que o passo 3 pede.
- **Matriz:** `test/matriz-rotas.test.ts` descobre as rotas por `globSync`, sem mudar o arquivo. Ele passa a cobrir os
  5 métodos (403 por ator negado, 403 sem 2FA, 401, 404 de parâmetro inválido).
- **Rodado por mim, no commit `90ad586`:**
  - `pnpm typecheck` e `pnpm lint` limpos;
  - `pnpm test`: 82 de 82 arquivos e 1377 de 1377 testes.

### Checklist da seção 12

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; nada fora da tarefa mudou | Cumprido. O 404 do histórico de demanda inexistente (desvio 1) não está fixado no plano, mas segue CA-06.3 e o GET por id. Fica aceito. O estreitamento `somentePessoa` (desvio 2) é a pendência da T15 |
| Teste para cada comportamento novo, que falharia sem o código | Cumprido. A falha antes do código está na entrega (`Cannot find module './[id]/historico/route'`). Os 10 casos do passo 1 estão no arquivo, cada um com efeito afirmado no banco (linha, sequência, evento) e não só pelo status. O espião em `poolApp.query` e `poolApp.connect` prova "404 sem consulta" (C-17), porque `deps.pool` é `b.poolApp` (`test/deps.ts:18`) |
| Sem segredo, `.env` ou dado pessoal real | Cumprido. "Pessoa Ficticia", domínio `.test`, `SENTINELAS` e tokens gerados no próprio teste. O teste confere que o token e o prefixo não saem no histórico nem no log |
| Entrada externa validada com Zod; erro sem vazar detalhe | Cumprido. Corpo, query e parâmetro passam pelo Zod em `rota()`. Os testes conferem que o 400 não traz pilha, SQL, nome de tabela, valor recebido nem detalhe do parser |
| Banco: migration, migrator, RLS e guarda | Não se aplica: a T16 não tem migration nem tabela nova |
| Nada duplica função que já existe | Cumprido. As rotas reaproveitam `criarDemanda`, `alterarDemanda`, `obterDemanda`, `listarDemandas`, `listarHistorico`, `paramId` e `MENSAGENS_ACESSO`. `somentePessoa` não tem par no repositório: `exigirPessoa` lê sessão e não estreita um `Ator` já resolvido (ver M-02) |
| Textos em pt-BR; axe | Textos em pt-BR, todos vindos de constantes que já existem. O axe não se aplica, porque a T16 não tem tela |
| Minor em Pendências; só Critical e Important bloqueiam | Cumprido. Não há Critical nem Important, e os Minor estão abaixo |
| `/code-review` e `/security-review` no PR | É da `08-revisao`, não desta etapa |

### Desvios declarados pelo engenheiro

1. **Histórico de demanda inexistente → 404.** Aceito. A tela de detalhe (T40) não precisa distinguir "sem eventos"
   de "não existe", e a resposta é a mesma do GET por id. O custo da conferência está no M-01.
2. **`somentePessoa` local, sem cast.** Aceito. Fecha a pendência da T15 sem `as AtorPessoa`, e o tipo do serviço
   continua exigindo pessoa.
3. **Testes além dos trechos do plano** (C-11 e C-15 pela API, espião, sentinela de `entrada_bruta`, log de C-21).
   Aceito. Cobrem controles que a T16 diz cobrir e não mudam código fora da tarefa.

### Pareceres (todos Minor)

- **M-01:** `src/app/api/demandas/[id]/historico/route.ts:10`.
  - **Problema:** a existência da demanda é conferida com `obterDemanda`. Ela monta a vista inteira (demanda com
    `user`, ESP, RSK e DEC com a expressão de desatualizado), quatro consultas, e a rota descarta o resultado.
  - **Razão:** o efeito está certo, e reaproveitar a função evita duplicação. Mas cada leitura do histórico paga as
    três consultas de versões sem usar nenhuma, e o custo cresce com o número de versões. Se a T35 (desempenho)
    medir o histórico acima do alvo, este é o primeiro ponto: uma `existeDemanda(db, id)` em `consultas.ts` com um
    `select 1`.
- **M-02:** `src/app/api/demandas/[id]/route.ts:13-16`.
  - **Problema:** `somentePessoa` fica no arquivo da rota, e o ramo do 403 não tem teste. Hoje ele não pode ser
    alcançado, porque `rota()` já negou o agente.
  - **Razão:** a T17 (`registrarEntrada(deps, ator: AtorPessoa, ...)`) e a T21 vão precisar do mesmo estreitamento.
    Sem um lugar único, cada rota cria a sua cópia. Mesma linha de raciocínio do M-01 da T15 (`autoriaDo`).
- **M-03:** `src/app/api/demandas/demandas.test.ts:45` (`criarOk`) e `:75`.
  - **Problema:** todas as criações por cookie usam a mesma conta CTO, com o relógio fixo. O engenheiro contou 24 de
    30 no limite de C-36 (janela de uma hora).
  - **Razão:** quem acrescentar seis criações a este arquivo, como a `06-T16-testes` ou uma tarefa futura, recebe
    429 em teste que não tem relação com o limite. A falha vai parecer regressão da rota. Saídas: criar uma pessoa
    por `describe`, ou avançar o relógio entre blocos. Avançar o relógio pede atenção à sessão sem 2FA, que nenhum
    teste daqui usa.
- **M-04:** `src/app/api/demandas/demandas.test.ts:182`.
  - **Problema:** `const c =await` sem espaço.
  - **Razão:** é formatação. O `lint` não roda o Prettier, então passou. Corrigir na próxima vez que o arquivo for
    tocado, ou com `pnpm format`.
- **M-05:** `src/modules/demandas/consultas.ts:20` (`DemandaVista`), lido por `src/app/api/demandas/[id]/route.ts:18`.
  - **Problema:** a decisão T-03 da G4 diz que `GET /api/demandas/:id` devolve `agentesEmAndamento`. Nem a vista da
    T15 nem a rota da T16 trazem esse campo.
  - **Razão:** não é falha da T16. O contrato dela no plano diz só `DemandaVista`, e a execução de agente ainda não
    existe. Mas a T40 (detalhe) depende do campo para mostrar "agente trabalhando". Se nenhuma tarefa da fase Agentes
    de IA o acrescentar, o plano tem um buraco.
- **M-06 (herdado da T15, M-03):** `src/modules/demandas/schemas.ts:89-90`.
  - **Problema:** o engenheiro manteve `z.coerce.number()` em `limit` e `offset`.
  - **Razão:** aceito, porque trocar exigiria editar arquivo da T15, fora desta tarefa, e o valor final fica sempre
    dentro dos limites. O item segue aberto, sem risco.

## Decisões tomadas

- **Status `pronto`:** nenhum achado é Critical ou Important. Os seis são Minor e ficam com as tarefas que já vão
  tocar o código.
- **Os 3 desvios foram aceitos:** o 404 do histórico deixa a API coerente com CA-06.3, e os outros dois fecham
  pendências da T15 ou só acrescentam cobertura.
- **M-05 não vira devolução ao plano agora:** o campo depende de `execucao_agente` com dado, que só a fase Agentes de
  IA produz. Devolver agora travaria a T16 por algo que ela não pode entregar.
- **Validação do commit:** rodei a suíte inteira e não me apoiei só na entrega. Assim, a revisão vale para o commit
  `90ad586`.

## Pendências

- **T17 e T21 (M-02):** levar `somentePessoa` para `src/modules/acesso/`, com nome único (por exemplo
  `exigirAtorPessoa`) e um teste unitário do 403, quando a segunda rota precisar dele. Depois, trocar o uso em
  `[id]/route.ts`.
- **`06-T16-testes` e próximas tarefas que tocarem `demandas.test.ts` (M-03):** não passar de 30 criações pela mesma
  conta. Se for preciso mais, criar outra pessoa por `describe`.
- **T35 (M-01):** incluir `GET /api/demandas/:id/historico` na medição. Se ficar acima do alvo, trocar a conferência
  por `existeDemanda`.
- **T27 e T40 (M-05):** confirmar qual tarefa acrescenta `agentesEmAndamento` à vista do GET por id (T-03). Se
  nenhuma acrescentar, a T40 volta ao `05-plano` antes de começar.
- **Próxima tarefa que tocar `demandas.test.ts` (M-04):** formatação da linha 182.
- **M-06:** segue aberto, como M-03 da T15. Quem tocar `schemas.ts` decide se recusa número fora do formato decimal.
- **Herdados da T15, sem mudança:** M-01 (T18), M-02 e M-05 (T20), M-04 (UX ou revisão).
- **Aviso `[UNDICI-FETCH-patch]` na suíte:** confirmei na minha rodada que ele aparece. O engenheiro atribui o aviso a
  um teste anterior com `patch` em minúsculas, e as rotas novas usam `PATCH`. Não quebra nada e fica para a
  `08-revisao` localizar.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 90ad58631e2552776262d094d64f1b34318f9417` — 6 arquivos: os 4 da T16, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 90ad58631e2552776262d094d64f1b34318f9417 -- src/app/api/demandas/route.ts src/app/api/demandas/[id]/route.ts src/app/api/demandas/[id]/historico/route.ts` — diff das três rotas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — HEAD em `90ad586`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 82 de 82 arquivos, 1377 de 1377 testes

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
