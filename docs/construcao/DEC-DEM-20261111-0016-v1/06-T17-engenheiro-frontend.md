---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T17-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T16 a T20), 03-ux-ui-design.md (inteiro), 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md, 06-T08-qa-automacao.md, 06-T16-engenheiro-frontend.md, src/components/dados-das-etapas.ts, src/components/dados-das-etapas.test.ts, src/components/rotulos.ts, src/components/dados-da-decisao.ts (linhas 1 a 60), src/app/(painel)/demandas/[id]/detalhe.ts, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/demandas/[id]/CartaoProximaAcao.tsx, src/modules/historico/consultas.ts (linhas 1 a 80), src/modules/demandas/schemas.ts (linhas 1 a 40), src/modules/demandas/transicoes.ts (linhas 1 a 40), test/estatico/dados-das-etapas.test.ts, e2e/apoio.ts (linhas 1 a 30), .prettierrc, a saída do pnpm test e do pnpm test:e2e]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T17: regras de exibição da demanda do Awave, sem tela nova (RF-06 e RF-10 na regra; 03, 5.4, 5.5 e seção 9; D-06,
D-13/P-01). A T18 é quem põe isso na página. Não há componente, token nem cor nova: o selo usa a cor `ambar` que já
existe, e a linha 14 sai pelo `CartaoProximaAcao` de hoje.

### Conferência antes do código

A T17 toca `src/components/dados-da-confirmacao.ts` (novo), `dados-da-confirmacao.test.ts` (novo),
`dados-das-etapas.ts`, `dados-das-etapas.test.ts` (só acrescenta), `rotulos.ts` e
`src/app/(painel)/demandas/[id]/detalhe.ts`. Todos estão em `src/`, dentro da minha lista Pode. Não houve motivo para
devolver ao plano.

### Pendências das entregas 06-T01 a 06-T16 que citam a T17

Achei as entregas com `git log -S T17` e `git log -G T17` na pasta do pedido. Só as três da T08 citam a T17.

| De onde | O que diz | Como ficou |
|---|---|---|
| 06-T08-tech-lead, parecer 3 | `confirmarDemanda` devolve `{ jaConfirmada: false }` com o insumo ligado ou desligado; a tela não deve deduzir da resposta que o agente foi acionado | **Respeitado.** `estadoDaConfirmacao` recebe só origem, status e histórico, e não recebe a resposta da Server Action. Nenhum texto da tela afirma que o agente foi acionado: o de sucesso é "Demanda confirmada.", e a consequência é condicional ("se o agente … estiver ligado"). Um teste confere que os textos fixos não dizem "acionado", "começou" nem "iniciado" |
| 06-T08-engenheiro-backend | o painel lê "confirmada, por quem e quando" pelo evento `demanda_confirmada` do histórico (D-06) | **Feito**: é a regra de `estadoDaConfirmacao` |
| 06-T08-qa-automacao | CA-06.7 (tela) fica com a T17 e a T18 | A regra está aqui; o CA-06.7 na tela fica com a T18 |

A P-01 (botão "Confirmar demanda" sem diálogo, qualquer pessoa com 2FA, consequência escrita acima do botão) está nos
textos: `TEXTOS_CONFIRMACAO.consequencia` é o parágrafo que a T18 liga ao botão por `aria-describedby`. Não há texto de
diálogo, e "Quem age" da linha 14 é "Uma pessoa (CTO ou administradora)".

### Arquivos criados

- `src/components/dados-da-confirmacao.ts`:
  - `TEXTOS_CONFIRMACAO` (congelado), com os textos da 03, seção 9, por inteiro: `aguardando`, `consequencia`,
    `orientacao`, `botao`, `enviando`, `sucesso`, `confirmada(ator, data)`, `depois` e `finalSem(status)`;
  - `EstadoDaConfirmacao` e `estadoDaConfirmacao({ origem, status, historico })`, um `switch` por origem com `never`:
    - pessoa ou agente: `nao_se_aplica`;
    - Awave com `demanda_confirmada`: `confirmada`, com o ator por `rotuloAtor` e a hora do evento. Vale o mais antigo,
      que é o último da lista, porque o histórico chega do mais novo para o mais antigo (`findLast`);
    - Awave sem o evento e em status final: `final_sem_confirmacao`, com o status;
    - nos outros casos: `aguardando`.
  - `STATUS_FINAIS_NA_TELA`, cópia de `STATUS_FINAIS` de `transicoes.ts`, conferida por teste (padrão D-14);
  - o tipo `EventoDaConfirmacao` (`acao`, `ator`, `ocorridoEm`).

  De `src/modules/` só entram tipos, porque a `ConfirmarDemanda.tsx` da T18 é `'use client'`.
- `src/components/dados-da-confirmacao.test.ts`: 25 testes.

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `src/components/dados-das-etapas.ts` | `DadosDasEtapas.aguardaConfirmacaoDoAwave?: boolean`, opcional (ausente vale false). `DestinoDaAcao` de seção aceita `'confirmacao'`. Linha 14 em `proximaAcao`, depois da 2 e antes da 3: "Confirmar a demanda aberta pelo Awave.", detalhe "Até a confirmação, nenhum agente de IA trabalha nela.", quem age `UMA_PESSOA`, link "Ir para a confirmação" para a seção `confirmacao`. A barra de etapas não muda |
| `src/components/rotulos.ts` | `SELO_AGUARDANDO_CONFIRMACAO = { texto: 'Aguardando confirmação', cor: 'ambar', tracejado: false }` |
| `src/app/(painel)/demandas/[id]/detalhe.ts` | `ID_SECAO.confirmacao = 'confirmacao'`, `TEXTOS_DETALHE.secoes.confirmacao = 'Confirmação do Awave'`, `TEXTOS_DETALHE.dados.origem = 'Origem'` |
| `src/components/dados-das-etapas.test.ts` | Só acrescenta, no fim: o `describe` "linha 14", com 9 testes. 65 linhas a mais e nenhuma a menos (`git diff --stat`) |

O `CartaoProximaAcao.tsx` não mudou e continua compilando: ele já usa `ID_SECAO[link.destino.secao]`, e a chave nova
existe. A T18 pode deixá-lo como está.

### Testes

- `dados-da-confirmacao.test.ts` (25): os 5 do plano e mais estes:
  - com mais de uma confirmação, vale a mais antiga;
  - confirmada vale também em status final;
  - só `demanda_confirmada` conta;
  - final sem confirmação nos dois status finais;
  - aguardando em todo status que não é final;
  - pessoa e agente dão `nao_se_aplica` em todo status, mesmo com o evento no histórico;
  - o ator sem papel e a conta que não existe mais;
  - a saída tem só as chaves do estado, e uma sentinela no `depois` do evento não vaza;
  - a entrada congelada não muda;
  - `STATUS_FINAIS_NA_TELA` igual ao do servidor;
  - os nove textos por inteiro e a lista fechada das chaves;
  - nenhum texto diz que o agente foi acionado;
  - o selo;
  - a âncora, o título da seção e "Origem" do `detalhe.ts`, e as âncoras sem repetição.
- `dados-das-etapas.test.ts` (+9):
  - a linha 14 completa com status `nova`;
  - com agente pendente ou em andamento, linha 2;
  - em status final, linha 1;
  - com `aguardando_informacao`, linha 14 antes da 3;
  - a linha 14 vence as linhas 3 a 13 nos 7 status que não são finais, com 6 cenários de versões;
  - sem a marca (ausente ou `false`), as linhas de hoje;
  - dado incoerente ainda lança;
  - a barra de etapas é igual com e sem a marca;
  - CV-09: só as chaves da interface.

### Teste antes do código (visto falhando)

`pnpm --dir … test src/components/dados-da-confirmacao.test.ts src/components/dados-das-etapas.test.ts`, com os testes
escritos e nenhum código:
```
 ❯ src/components/dados-da-confirmacao.test.ts (0 test)
 ❯ src/components/dados-das-etapas.test.ts (160 tests | 3 failed) 78ms
     × status nova, sem agente em andamento: linha 14 com os textos da 03 e o link para a seção confirmacao
     × com aguardando_informacao: linha 14 antes da 3
     × vence as linhas 3 a 13 em todo status que não é final, com qualquer cenário de versões
Error: Cannot find module './dados-da-confirmacao' imported from .../src/components/dados-da-confirmacao.test.ts
AssertionError: expected { linha: 4, …(4) } to deeply equal { linha: 14, …(4) }
 Test Files  2 failed (2)
      Tests  3 failed | 157 passed (160)
```
Os outros 6 testes novos de `dados-das-etapas.test.ts` passaram já nessa rodada. São guardas do que não pode mudar:
linha 2, linha 1, sem a marca, incoerência, barra de etapas e CV-09.

Depois do código, o mesmo comando deu **2 de 2 arquivos e 183 de 183 testes**.

### Resultado

- `pnpm test` (suíte inteira): **285 de 285 arquivos e 6310 de 6310 testes, 0 falharam**, em 148 s.
- Depois de quebrar a chamada da linha 14 em várias linhas (pela `printWidth` 120 do `.prettierrc`, sem mudar a lógica),
  rodei de novo `pnpm test src/components test/estatico`: 63 de 63 arquivos e 1600 de 1600 testes. O
  `test/estatico/dados-das-etapas.test.ts` (CV-09: o módulo só importa valor de `./rotulos` e `./dados-do-pacote`) passa.
- `pnpm test:e2e` (local, build de produção, porta 3101): **268 testes, 259 passaram e 9 pularam, saída 0**, em 10,4 min.
  O `✘` de `e2e/vigia.spec.ts:5` é o controle negativo esperado. Nenhuma tela mudou nesta tarefa: a página ainda não
  passa a marca nem usa a seção, o que fica com a T18. Por isso o axe da T05 continua sem violação, nas duas larguras.
- `pnpm typecheck` e `pnpm lint`: limpos.
- G4: o `git diff --stat a9fd9b8` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio.
- `git status --short`: só os 6 arquivos da tarefa, também depois do build do e2e.

### Desvios do plano

1. **`STATUS_FINAIS_NA_TELA` e o tipo `EventoDaConfirmacao`**, que o plano não nomeia. O primeiro existe porque o arquivo
   vai ao navegador e não pode importar `transicoes.ts` por valor; um teste confere que é igual ao do servidor. O
   segundo é o tipo do parâmetro `historico` que o G7 já descreve, com nome.
2. **Testes além do trecho do plano**, listados acima. Os de `detalhe.ts` ficaram em `dados-da-confirmacao.test.ts`,
   para não abrir um arquivo de teste fora da lista da tarefa.
3. **`TEXTOS_CONFIRMACAO` com `Object.freeze`**: mesmos textos e mesmo tipo de leitura, como o `MENSAGENS_CONFIRMACAO` da
   T08.

## Decisões tomadas

- Confirmada vence status final: a 03 (5.4) só chama de "final sem confirmação" a demanda sem o evento, e a confirmação
  é um fato que já aconteceu.
- O estado não recebe a resposta da Server Action, só o histórico (D-06 e parecer 3 da 06-T08-tech-lead). A tela nunca
  diz que o agente foi acionado: quem mostra isso é a regra de hoje (linha 2 e alerta de agente trabalhando), lida de
  `agentesEmAndamento`.
- A data em `TEXTOS_CONFIRMACAO.confirmada` entra já formatada. O `<time dateTime>` e o `formatarDataHora` ficam com a
  T18, como no resto da T05.
- A marca é testada com `=== true`. Assim, só um `true` explícito liga a linha 14, e a ausência mantém a 0.2.0 sem
  mudança.
- Origem fora da lista cai em `nao_se_aplica` (sem seção). Quem barra a confirmação é o servidor (409 `outraOrigem`); a
  tela não inventa botão para valor desconhecido.
- Uma busca só de leitura no código rodou fora da regra de comando deste pedido; o maestro registrou o bloqueio e a
  liberou.

## Pendências

- Nenhuma bloqueia a T17.
- Para a T18:
  - na página, `aguardaConfirmacaoDoAwave: estado.tipo === 'aguardando'`;
  - o selo `SELO_AGUARDANDO_CONFIRMACAO` só em `aguardando`;
  - a seção só quando `estado.tipo !== 'nao_se_aplica'`;
  - `TEXTOS_CONFIRMACAO.confirmada(estado.ator, formatarDataHora(estado.em))` dentro de `<time dateTime>`;
  - `finalSem(ROTULO_STATUS[estado.status])`;
  - "Origem" com `ROTULO_ORIGEM[origemDoResponsavel(d.responsavel)]` antes de "Criada por";
  - o `CartaoProximaAcao` já resolve `ID_SECAO.confirmacao` sem mudança.
- Glob e Grep não estavam disponíveis nesta sessão. Li com Read e localizei arquivos por `git log -S` e `git log -G`.
- As caixas `- [ ]` da T17 no plano não foram marcadas: a 06 não edita `docs/` (G1).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — HEAD em 422ec6f (06-T16-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S T17 --oneline --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — 05-tech-lead, tarefas.json, as três entregas da T08 e passagens.jsonl
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "T17" --format=%h --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — a mesma lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa antes da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "ID_SECAO" --format=%h --name-only -- src test e2e` — quem usa as âncoras (`CartaoProximaAcao.tsx`, `page.tsx`, testes do detalhe, teste estático)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "TEXTOS_DETALHE" --format=%h --name-only -- src test e2e` — quem usa os textos do detalhe
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "ID_SECAO).toEqual" --format=%h --name-only -- src test e2e` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "secoes).toEqual" --format=%h --name-only -- src test e2e` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "dados).toEqual" --format=%h --name-only -- src test e2e` — só `acoes-pedido.test.ts`, de outro objeto
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S "export function ehStatusFinal" --format=%h --name-only -- src` — `src/modules/demandas/transicoes.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-confirmacao.test.ts src/components/dados-das-etapas.test.ts` — antes do código: 2 arquivos falharam, 3 de 160 testes falharam e o módulo novo não existia
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-confirmacao.test.ts src/components/dados-das-etapas.test.ts` — depois do código: 183 de 183
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — em segundo plano, saída lida com Read: 285 de 285 arquivos, 6310 de 6310 testes, código 0
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts src/lib/rota.ts "drizzle/000[0-6]_*.sql" "drizzle/meta/000[0-6]_snapshot.json"` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 4 alterados e 2 novos, todos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 4 arquivos; `dados-das-etapas.test.ts` com 65 linhas a mais e nenhuma a menos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/dados-das-etapas.ts src/components/rotulos.ts "src/app/(painel)/demandas/[id]/detalhe.ts"` — revisão do diff
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — depois da suíte, a mesma lista
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components test/estatico` — depois da quebra de linha: 63 de 63 arquivos, 1600 de 1600
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano, saída lida com Read: 268 testes, 259 passaram, 9 pulados, saída 0, em 10,4 min
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — depois do e2e, só os 6 arquivos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa (285 de 285 arquivos, 6310 de 6310 testes)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (só "Ana Ficticia", "Bia Ficticia", o prefixo `ficticio` e ids de exemplo; nenhum token)
- [x] só mudaram os arquivos da tarefa (os seis do plano; nenhum outro)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR (seção 9 por inteiro, linha 14 da 5.5, selo, "Confirmação do Awave", "Origem"), e o axe não acusa violação nas telas tocadas (nenhuma tela muda nesta tarefa; o e2e completo, com o axe da T05 nas duas larguras, passou)
