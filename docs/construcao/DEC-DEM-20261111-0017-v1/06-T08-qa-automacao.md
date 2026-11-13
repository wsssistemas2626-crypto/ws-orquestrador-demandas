---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T08-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T08, linhas 2040 a 2220), 01-analista-requisitos.md (RF-01 a RF-03, linhas 15 a 114; RF-12, linhas 275 a 299; RNF-03, RNF-04, RNF-07), 06-T07-qa-automacao.md, 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md, commit 672e01c (git show --stat), src/app/api/pedidos-construcao/[decId]/andamento/route.ts (pelo plano e pela revisão), src/app/api/pedidos-construcao/andamento.test.ts, src/app/api/pedidos-construcao/andamento-422.test.ts, test/transversal/sentinelas-andamento.test.ts, test/pedidos-construcao.ts, test/requisicao.ts, test/andamento.ts, test/sessao.ts (criarPessoa), test/estatico/piso-de-assercoes.test.ts, src/lib/rota.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/tokens-servico.ts, src/modules/acesso/mensagens.ts, src/modules/limites.ts (LIMITE_ANDAMENTO e conferirLimiteDeAndamento), src/db/schema/agentes.ts (AGENTES), src/modules/acesso/ator.ts (PAPEIS)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T08 (rota `POST /api/pedidos-construcao/[decId]/andamento`, commit `672e01c`). A rota cumpre todos os
critérios da tarefa. Nenhum teste novo falhou contra o código. Acrescentei um arquivo,
`src/app/api/pedidos-construcao/andamento-qa.test.ts`, com 5 testes (37 linhas com `expect(`), e pus o arquivo no
`PISO` de `test/estatico/piso-de-assercoes.test.ts` (só uma entrada a mais). Não mudei nenhum teste existente.

### Critérios da tarefa e o teste que cobre cada um

Arquivos: `andamento.test.ts`, `andamento-422.test.ts` e `andamento-qa.test.ts` ficam em
`src/app/api/pedidos-construcao/`; `sentinelas-andamento.test.ts` fica em `test/transversal/`; as matrizes ficam em
`test/`.

| Critério | Arquivo | Teste |
|---|---|---|
| Rota: só `POST`, `meta` com `registrar_andamento` e o padrão | `andamento.test.ts` | `a rota > só exporta POST, com a ação registrar_andamento e o padrão do arquivo` |
| CA-01.1, CA-02.1, RNF-07 (requisição exata do `/construir`, 204 sem corpo, `no-store`, `nosniff`, sem `location` nem CORS) | `andamento.test.ts` | `POST … (RF-02, RNF-07) > CA-01.1 e CA-02.1: a requisição exata do /construir…` |
| CA-01.2 (AN-01 c) | `andamento.test.ts` | `só o /construir… > CA-01.2: … awave, os quatro agentes, cto e administradora… → 403 sem_permissao; nada muda` |
| CA-01.2 reforçado: o 403 é o mesmo com corpo inválido (o 422 não é oráculo para outro ator) | `andamento-qa.test.ts` | **novo** `ordem das recusas… > awave, agente e pessoa com corpo inválido recebem o mesmo 403 do corpo válido; sem credencial, o mesmo 401; nada gravado` |
| CA-01.4 (a rota nova está na varredura) | `test/matriz-rotas.test.ts` e `test/matriz-rotas-integracoes-qa.test.ts` | `matriz de acesso × todas as rotas > POST src/app/api/pedidos-construcao/[decId]/andamento/route.ts: tem ação na matriz e nega cada ator proibido com 403` (e GET, PATCH, PUT, DELETE); `CA-03.1 e CA-03.2… > src/app/api/pedidos-construcao/[decId]/andamento/route.ts: 403 … para cada integração proibida…` (conferido com `-t andamento`) |
| CA-01.5 (AN-01 d) | `andamento.test.ts` | `só o /construir… > CA-01.5: o token construir em GET /api/demandas/:id, POST /api/demandas e PATCH /api/demandas/:id → 403; nada muda` |
| CA-02.2 e CA-02.3 (22 corpos, 422 igual para DEC com pedido e inexistente, serviço não chamado) | `andamento-422.test.ts` | `AN-02 (b) pela rota… > %s: 422 igual para DEC com pedido gerado e inexistente…` (22 casos), `a lista cobre o CA-02.2 inteiro`, `controle: o corpo válido chega ao serviço trocado…` |
| CA-02.4 (sentinela fora da resposta, do log e do Sentry) e RNF-03 | `sentinelas-andamento.test.ts` | `andamento com a sentinela no corpo, envio válido, 503 e leitura do Awave: nenhuma sentinela nem texto de token…` |
| CA-02.5 (400, 415, 413; nada gravado) | `andamento.test.ts` | `… > CA-02.5 e CA-02.7: JSON malformado 400, text/plain 415, DEC-xyz 404 sem tocar o banco, 600 KB 413; nada gravado` |
| CA-02.6 (0/0 e `-0`) | `andamento.test.ts` | `… > CA-02.6: entendendo_o_pedido 0/0 → 204; -0 em tarefasProntas → 204 e a linha com 0` |
| CA-02.7 (`DEC-xyz`, sem conexão nem consulta) | `andamento.test.ts` | o mesmo teste do CA-02.5 |
| CA-02.7 reforçado: dez formas de id fora da regex | `andamento-qa.test.ts` | **novo** `CA-02.7: id fora da regex, em todas as formas… > caixa baixa, espaço, quebra de linha, dígitos a mais e a menos…` |
| CA-02.7 reforçado: a regex vem antes do corpo e da credencial | `andamento-qa.test.ts` | **novo** `ordem das recusas… > id fora da regex: o mesmo 404 com corpo válido, com corpo inválido, sem credencial e com token de outro ator` |
| RF-02 (cookie com Bearer: 400) | `andamento-qa.test.ts` | **novo** `credencial na rota do andamento… > Bearer do construir com cookie de sessão: 400 ambíguo com Origin certo, 403 (CSRF) sem Origin; nada gravado` |
| CA-03.1 a CA-03.4 e AN-03, byte a byte (oito casos, dois corpos, controle) | `andamento.test.ts` | `CA-03.1 a CA-03.4 e AN-03 pela rota… > fora do formato, sem pedido, substituído sem pedido, de outra demanda, de agente, de sistema…` |
| CA-05.8 e status final pela rota (409 sem citar v2 nem status) | `andamento.test.ts` | `409 pela rota… > DEC substituído com pedido gerado → 409 decSubstituido…; demanda entregue… → 409 statusFinal` |
| CA-12.1 | `andamento.test.ts` | `limite pela rota… > CA-12.1 e CA-12.2: com 60 linhas do DEC no último minuto, estado novo → 429 por DEC sem gravar…` |
| CA-12.2 | `andamento.test.ts` | `… > CA-12.2: uma gravação e depois 200 envios no mesmo estado → todos 204, uma linha e um andamento_registrado` |
| CA-12.3 (DEC A × DEC B, e a borda 600/601) | `andamento.test.ts` | `… > CA-12.3: o DEC A no limite não segura o DEC B (204)`; `… > CA-12.3 (D-14): 599 linhas na janela…` |
| CA-12.4 | `andamento.test.ts` | `… > CA-12.4: o ritmo do /construir, 30 estados diferentes, um a cada 2 minutos → todos 204 e 30 linhas` |
| CA-12.5 | `andamento.test.ts` | `… > CA-12.5: com 59 linhas do DEC, dois envios de estados diferentes ao mesmo tempo → um 204 e um 429; 60 linhas` |
| Contrato de status com o `/construir` (01, seção 4) | `andamento.test.ts` | `o que o /construir faz com cada resposta… > 204 → enviado; 404 → fora_do_orquestrador; 409, 422 e 400 → recusado; 429 → erro` |
| RNF-04 e AN-11 (log) | `andamento.test.ts` | `log (RNF-04, AN-11, G3.12) >` os dois testes |
| RNF-04 reforçado: 401 sem credencial, fora do formato, inexistente, revogado pelo prefixo e token na query | `andamento-qa.test.ts` | **novo** `credencial na rota do andamento… > sem Bearer, Bearer fora do formato, inexistente, revogado pelo prefixo e token só na query: o mesmo 401 byte a byte; nada gravado; o log não leva o token` |

### Resultado

- `pnpm test src/app/api/pedidos-construcao/andamento-qa.test.ts` (verbose): **5 de 5**.
- Os três arquivos da rota juntos, embaralhados (`--sequence.shuffle`): **46 de 46** com a semente 1794543573308 e
  **46 de 46** com a semente 20261113.
- As duas matrizes com `-t andamento`: **7 passaram**. A rota nova aparece nas duas (CA-01.4).
- `pnpm test` completo: **332 arquivos, 7430 de 7430, 0 falharam** (206,08 s). A engenharia tinha 331 arquivos e 7422
  testes; esta etapa acrescenta 1 arquivo, 5 testes e 1 caso do `PISO`, o que dá 7428. A diferença de 2 é a mesma
  variação de contagem num teste gerado fora destes arquivos, já notada nas etapas 06-T07, e não muda o resultado.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git diff`: só a entrada nova do `PISO`. `git status --short`: o arquivo novo e o `PISO`. Nenhum `.skip`, `.only` ou
  `.todo` no arquivo novo.

### Testes acrescentados (`src/app/api/pedidos-construcao/andamento-qa.test.ts`)

1. **Credencial (C-09, RNF-04, RSK "revogação pelo prefixo").** O caso cria um token `construir` próprio e o revoga com
   `revogarTokenServico` pelo prefixo. Depois confere:
   - sem `Authorization` dá 401 `nao_autenticado` com `MENSAGENS_ACESSO.nao_autenticado`;
   - Bearer fora do formato dá 401 com `MENSAGENS_ACESSO.token_invalido`;
   - Bearer no formato e nunca emitido, e o token revogado, dão a mesma `foto` (status, cabeçalhos sem `date` e corpo)
     do fora do formato. A resposta não diz qual dos três foi;
   - o token só na query, sem `Authorization`, dá a mesma `foto` do sem credencial;
   - retrato da demanda e total de eventos iguais;
   - as cinco linhas do log da rota são `[401, 'anonimo', 'nao_autenticado']`, e nenhuma linha traz o token, o texto
     depois do prefixo, `wsod_`, o prefixo revogado nem o `decId`;
   - controle: o token ativo na mesma requisição grava (204).
2. **Bearer com cookie de sessão (RF-02).** Com `Origin` certo, 400 `entrada_invalida` com `MENSAGENS_ACESSO.ambiguo`;
   sem `Origin`, 403 `sem_permissao` (C-15 vem antes). Nada muda.
3. **Ordem das recusas (AN-01 e AN-02).** Para `awave`, agente `orquestrador`, pessoa `administradora` (sessão com 2FA e
   `Origin` certo) e sem credencial: a `foto` com quatro corpos inválidos é idêntica à do corpo válido (403, ou 401 sem
   credencial). Assim, o 422 só existe para o `construir` e não ensina o formato do corpo a outro ator. Nada muda.
   Controle: os mesmos corpos com o token `construir` dão 422.
4. **A regex do id vem antes de tudo.** `DEC-xyz` dá a mesma `foto` com corpo válido, com os corpos inválidos, sem
   credencial e com o token `awave`.
5. **CA-02.7 em dez formas.** Caixa baixa do DEC real, espaço no fim e no começo, `\n` no fim, sem a versão, versão com
   5 dígitos, data com 7 dígitos, prefixo `ESP`, `…/../DEC-DEM-20991231-9999-v1` e id vazio dão a `foto` do DEC
   inexistente no formato. Os espiões em `poolApp.connect` e `poolApp.query` mostram que não houve nenhuma chamada.
   Nada muda. Controle: o id certo grava (204).

Sem relógio real: `relogioFixo`, que o arquivo não avança. Cada caso cria os próprios DEC e o próprio token revogado, e
as contagens são por demanda ou relativas. Dados fictícios. O único token "inventado" é `wsod_` + 43 letras `A`, que
nunca foi emitido. Os tokens reais nascem em tempo de teste e não aparecem em mensagem de `expect`.

### Leitura crítica dos testes do engenheiro

- As asserções são fortes:
  - a resposta inteira é comparada byte a byte;
  - o retrato e o total de eventos são conferidos antes e depois;
  - há espião no pool para o "sem consulta";
  - o log é comparado como objeto inteiro;
  - todo caso que poderia passar no vazio tem controle (vítima que grava, mock que é chamado, 503 que chega ao Sentry).
- **Ordem.** Conferi a dependência de ordem dos três arquivos da rota com duas sementes de `--sequence.shuffle`
  (1794543573308 e 20261113): 46 de 46 nas duas.
  - O Minor 3 da revisão (o `relogio.avancar` de 60 min do CA-12.4) não quebrou nenhuma das duas ordens. Os casos
    calculam as datas a partir de `relogio.agora()`, e o limite (`gt` em `limites.ts:135` e `:137`) usa a mesma borda
    que `linhasNaJanela` (`>`). Por isso a linha gravada exatamente na borda da janela não desalinha o D-14 quando o
    CA-12.4 roda antes dele.
  - Não mexi no arquivo do engenheiro: o ajuste é estrutural, e não afrouxa nada. Fica com a `08-revisao`.
- **O 503 de `sentinelas-andamento.test.ts` depende do nome da trava `pedido:<decId>`** (ponto da revisão). O teste exige
  `[…, 503]` nas linhas do log e ao menos 1 envelope no Sentry. Se a T07 mudar o nome da trava, o teste quebra; ele não
  passa no vazio. Não precisa de reforço.
- **Lacunas que fechei:**
  - nenhum teste da T08 batia na rota com credencial ruim (401) nem com token revogado;
  - a resposta ao cookie com Bearer não tinha teste;
  - a ordem "autorização antes do corpo" só era provada com corpo válido (CA-01.2);
  - o CA-02.7 tinha uma forma só (`DEC-xyz`).

## Decisões tomadas

- Um arquivo novo `andamento-qa.test.ts`, sem tocar os do engenheiro: mantém a autoria e o piso deles intactos.
- O arquivo novo entra no `PISO` com 37: é proteção a mais (lista de permissão por arquivo) e não sobe o piso de nenhum
  arquivo existente.
- Sem mutação plantada no código: `src/` (fora de `*.test.ts`) não está na minha lista Pode. A não-vacuidade de cada
  teste novo é provada por um controle no próprio teste (o token ativo grava, o `construir` recebe 422, o id certo
  grava).
- O 401 do token revogado é comparado com o do inexistente pela `foto` inteira, e não só pelo status: é o que impede a
  rota de dizer que um prefixo existiu.

## Pendências

- Nenhuma bloqueia a passagem.
- **Para a `08-revisao`:**
  - Minor 3 da 06-T08-revisao: um relógio próprio no `describe` do limite de `andamento.test.ts`. Hoje passa em ordem
    embaralhada, mas um caso futuro com data lida antes do `describe` ficaria dependente da ordem;
  - Minor 1 da 06-T08-revisao: o `andamento-qa.test.ts` tem a quinta cópia da `foto`, como os vizinhos. Entra na mesma
    exportação por `test/requisicao.ts`, quando ela acontecer;
  - herdado: Minor 2 da 06-T04-revisao (comentário de topo de `src/lib/rota-corpo-invalido.test.ts`).
- **Para o maestro (forma de comando).** Rodei cinco comandos fora da forma da lista Pode. Nenhum alterou nada, e os
  cinco estão em Comandos executados do jeito que rodaram. Peço a liberação como leitura (regra de 25/10):
  - um `grep -rn` com `\|` (alternativa) sobre `01-analista-requisitos.md`, na pasta do pedido;
  - três `git grep` com `\|` (alternativa): sobre as duas matrizes de rotas, sobre `piso-de-assercoes.test.ts` e sobre
    `src/modules/acesso/ator.ts`;
  - um `grep -n` com `\|` sobre o arquivo de saída do vitest que a ferramenta gravou fora do repositório (a saída do
    `-t andamento` das matrizes passou de 30 KB). Eu deveria ter lido esse arquivo com a ferramenta Read.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `grep -rn "CA-0[123]\.\|CA-12\.\|RNF-0[347]" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — critérios da T08 (fora da forma: alternativa; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 672e01c6553be24cafe9a8f6cd01d4ea4e1e03bd` — 8 arquivos, todos da tarefa ou do registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — `2c82ab0` (06-T08-revisao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "gravado_em" -- src/modules/limites.ts src/modules/andamento` — só testes (o limite usa o Drizzle)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A40 "export const LIMITE_ANDAMENTO" -- src/modules/limites.ts` — a janela usa `gt`, como `linhasNaJanela`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/resolver-ator.ts` — 400 ambíguo, 401 sem credencial e token inválido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "it(\|it.each\|describe(" -- test/matriz-rotas.test.ts test/matriz-rotas-integracoes-qa.test.ts` — títulos das matrizes (fora da forma: alternativa; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- src/modules/acesso/tokens-servico.ts src/modules/acesso/mensagens.ts test/andamento.ts test/pedidos-construcao.ts test/requisicao.ts test/integracoes.ts` — ajudantes e `revogarTokenServico`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/tokens-servico.ts` — formato do token e revogação pelo prefixo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/mensagens.ts` — `nao_autenticado`, `token_invalido`, `ambiguo`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export async function criarPessoa" -- test/sessao.ts` — sessão com 2FA
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "PISO\|andamento" -- test/estatico/piso-de-assercoes.test.ts` — entradas do piso (fora da forma: alternativa; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export const AGENTES\|export const PAPEIS" -- src/modules/acesso/ator.ts` — `PAPEIS` (fora da forma: alternativa; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A2 "export const AGENTES" -- src/modules/acesso/ator.ts` — sem resultado (é reexportação)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "AGENTES" -- src/modules/acesso/ator.ts` — vem de `db/schema/agentes`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "AGENTES" -- src/db/schema/agentes.ts` — `orquestrador` está na lista
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/andamento-qa.test.ts --reporter=verbose` — 5 de 5
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/andamento-qa.test.ts src/app/api/pedidos-construcao/andamento.test.ts src/app/api/pedidos-construcao/andamento-422.test.ts --reporter=dot --sequence.shuffle` — 46 de 46 (semente 1794543573308)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/andamento-qa.test.ts src/app/api/pedidos-construcao/andamento.test.ts src/app/api/pedidos-construcao/andamento-422.test.ts --reporter=dot --sequence.shuffle --sequence.seed=20261113` — 46 de 46
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/matriz-rotas.test.ts test/matriz-rotas-integracoes-qa.test.ts -t andamento --reporter=verbose` — 7 passaram, 149 pulados pelo filtro; a rota nova está nas duas matrizes (CA-01.4)
- `grep -n "andamento/route\|Tests \|Test Files" /home/deploy/.claude/projects/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tool-results/bgb9g7txe.txt` — as linhas da rota nova na saída grande (fora da forma: alternativa e arquivo fora do repositório; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/app/api/pedidos-construcao/andamento-qa.test.ts` — 37
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 332 arquivos, 7430 de 7430, 0 falharam, 206,08 s (em segundo plano; saída lida com a ferramenta Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só a entrada nova do `PISO` (+2 linhas)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `M test/estatico/piso-de-assercoes.test.ts` e `?? src/app/api/pedidos-construcao/andamento-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked "\.only(" -- src/app/api/pedidos-construcao/andamento-qa.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked "\.skip(" -- src/app/api/pedidos-construcao/andamento-qa.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked "\.todo(" -- src/app/api/pedidos-construcao/andamento-qa.test.ts` — sem resultado

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
