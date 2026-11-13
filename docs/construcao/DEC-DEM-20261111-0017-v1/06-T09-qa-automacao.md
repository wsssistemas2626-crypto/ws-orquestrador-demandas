---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T09-testes
agente: qa-automacao
leu: [pedido.json (pelo plano), padrao-tecnico.md, contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T09, linhas 2195 a 2343), 01-analista-requisitos.md (RF-04 e CA-04.6, linhas 115 a 139; RF-10 e RF-11, linhas 225 a 284), 06-T08-qa-automacao.md, 06-T09-engenheiro-backend.md, 06-T09-tech-lead.md, commit 8f02862 (pelas entregas e pelos arquivos finais), src/app/api/demandas/leitura-awave-andamento.test.ts, test/transversal/visibilidade-andamento.test.ts, src/modules/demandas/consultas.ts, src/modules/andamento/consultas.ts, src/modules/andamento/regras.ts, src/modules/andamento/schemas.ts, src/modules/acesso/ator.ts, src/modules/acesso/mensagens.ts (sem_permissao), drizzle/0008_slippery_whirlwind.sql, src/app/api/demandas/leitura-awave-qa.test.ts (1 a 90), test/andamento.ts, test/integracoes.ts, test/pedidos-construcao.ts, test/banco.ts, test/sessao.ts (criarPessoa), test/estatico/piso-de-assercoes.test.ts, test/estatico/relogio.test.ts, test/estatico/sql-raw.test.ts, test/estatico/varreduras-qa.test.ts (88 a 117), src/modules/demandas/confirmacao.ts (exigirVisivelPara, aguardaConfirmacao), git show 8f02862 (--stat e o diff da G5 em quatro testes)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T09 (andamento nas vistas de pessoa e do Awave e varredura das leituras de agente, commit `8f02862`). O
código cumpre todos os critérios da tarefa. Nenhum teste novo falhou contra o código.

Acrescentei dois arquivos, com 12 testes, e pus os dois no `PISO`:
- `src/app/api/demandas/leitura-andamento-qa.test.ts`: 5 testes, 32 linhas com `expect(`;
- `src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts`: 7 testes (1 + 6 casos), 14 linhas com `expect(`.

Mudei uma linha de um teste do engenheiro, sem afrouxar a asserção (ver Decisões).

### Critérios da tarefa e o teste que cobre cada um

Arquivos: `leitura-awave-andamento.test.ts` (engenheiro), `leitura-andamento-qa.test.ts` e
`leitura-andamento-fora-do-esquema-qa.test.ts` (novos) ficam em `src/app/api/demandas/`; `visibilidade-andamento.test.ts`
fica em `test/transversal/`.

| Critério | Arquivo | Teste |
|---|---|---|
| CA-10.1 (sete chaves exatas; andamento em quatro, exatas) | `leitura-awave-andamento.test.ts` | `RF-10… > CA-10.1: construindo 9/17 → 200 com exatamente as sete chaves, e o andamento com exatamente quatro` |
| CA-10.2 (`andamento: null`) | `leitura-awave-andamento.test.ts` | `RF-10… > CA-10.2: sem andamento, andamento: null (com e sem pedido gerado)` |
| CA-10.2 reforçado: a demanda sem andamento continua `null` com outras demandas com andamento na tabela | `leitura-andamento-qa.test.ts` | **novo** `RF-10 e RF-11… > duas demandas do Awave com andamento e uma sem: cada leitura traz o próprio; o último envio vence, mesmo com números menores` |
| CA-10.3 (404 igual ao inexistente) | `leitura-awave-andamento.test.ts` | `RF-10… > CA-10.3: demanda de pessoa com andamento, lida pelo Awave, responde igual ao id inexistente…`; e `AN-09 e ADR-35… > D-09: uma consulta só, com o mesmo SQL…` |
| CA-10.3 na vista: integração fora da autoria não recebe vista (awave sobre demanda de pessoa; construir sobre a do Awave) | `leitura-andamento-qa.test.ts` | **novo** `AN-09… > integração fora da autoria não recebe vista: o awave com a demanda de pessoa e o construir com a do Awave dão sem_permissao` |
| CA-10.4 (201 com sete chaves e igual ao GET) | `leitura-awave-andamento.test.ts` | `RF-10… > CA-10.4: o 201 do POST do Awave tem as sete chaves…` |
| CA-10.5 (`devolvida`, sem `statusConstrucao`) | `leitura-awave-andamento.test.ts` | `RF-10… > CA-10.5: levada a devolvida pelo cancelado do /construir…` |
| CA-11.1 (seis campos para a pessoa) | `leitura-awave-andamento.test.ts` | `RF-11… > CA-11.1: a pessoa (cookie) lê a mesma demanda do Awave com o andamento em seis campos` |
| CA-11.1 reforçado: a pessoa recebe a vista inteira exata (23 chaves), com `andamento: null` presente sem andamento | `leitura-andamento-qa.test.ts` | **novo** `RF-10 e RF-11… > a pessoa recebe a vista inteira, com a chave andamento presente e null…` |
| CA-11.2 e CA-11.3 (agente sem andamento; itens da listagem da 0.3.1) | `leitura-awave-andamento.test.ts` e `visibilidade-andamento.test.ts` | `RF-11… > CA-11.2 e CA-11.3: o agente lê a vista mínima da 0.3.1…`; `AN-09… > varre MATRIZ × rotas × quatro agentes` |
| AN-09 (lista de permissão por ator) | `leitura-awave-andamento.test.ts` e `visibilidade-andamento.test.ts` | `AN-09 e ADR-35… > vistaDaDemandaPara(awave, d) com o andamento de seis campos…`; a varredura; `… > a entrada montada para o provedor falso, nos quatro agentes, não tem o andamento` |
| AN-09 reforçado: os quatro agentes e o sistema, pela vista e pelo `lerDemandaPara` real | `leitura-andamento-qa.test.ts` | **novo** `AN-09… > os quatro agentes e o sistema recebem a vista mínima exata, sem o andamento…`; **novo** `AN-09… > lerDemandaPara com o sistema e com um agente, sobre o banco real…` |
| ADR-35 e D-09 (a mesma consulta da autoria) | `leitura-awave-andamento.test.ts` | `AN-09 e ADR-35… > D-09: uma consulta só…` |
| RF-04 na leitura: o andamento é o da própria demanda e o último dela (os números podem descer) | `leitura-andamento-qa.test.ts` | **novo** `RF-10 e RF-11… > duas demandas do Awave com andamento e uma sem…` |
| CA-04.6 na leitura (fase inventada; prontas > total) | `leitura-awave-andamento.test.ts` | `CA-04.6 na leitura… > o último andamento fora do esquema…` |
| CA-04.6 reforçado: cada campo do esquema lido, um por vez, e a volta ao válido | `leitura-andamento-fora-do-esquema-qa.test.ts` | **novo** `CA-04.6 na leitura, campo a campo… > $rotulo: Awave e pessoa leem andamento: null (200)…` (seis casos) e `… > as restrições saíram mesmo neste banco…` |
| AN-06 (c) e D-06 (prazo total) | `leitura-awave-andamento.test.ts` | `AN-06 (c) e D-06… >` os três testes |
| G9 (as ações chamadas são as da matriz) | `visibilidade-andamento.test.ts` | `AN-09… > varre MATRIZ × rotas × quatro agentes` |

A fila e o detalhe do CA-04.6 são telas (T12 e T13). Aqui ficam a API de pessoa, a do Awave e a listagem.

### Testes acrescentados

**`leitura-andamento-qa.test.ts`** (5 testes):

1. **Andamento da própria demanda, e o último.**
   - Duas demandas do Awave com pedido (A e B) e uma sem andamento (C).
   - A recebe `construindo 3/5`. Um minuto depois, B recebe `testando 7/8`, e essa vira a linha mais nova da tabela.
   - O Awave lê A com o dela, B com o dela e C com `null`.
   - A recebe `testando 2/19` (replanejamento, números menores). O Awave lê A com o último envio, e B não muda.
   - A pessoa lê as três com o DEC de cada uma, e a vista de A não cita o DEC de B (nem o inverso).
   - Isso pega uma subconsulta do último andamento sem o filtro da demanda (A sairia com `null`, ou com o de B) e uma leitura
     que escolhesse o maior número em vez do último envio.
2. **Vista inteira da pessoa.** Sem andamento (com e sem pedido gerado), as 23 chaves exatas, com `andamento: null`. Com
   andamento, as mesmas 23 chaves e o andamento em seis. Nenhuma chave da pessoa sumiu na 0.4.0.
3. **Lista de permissão por ator (unidade sobre a vista real).**
   - A vista vem de `obterDemanda` sobre uma demanda com `testando 987/988`, e o controle confere os seis campos.
   - A pessoa recebe a vista inteira.
   - Os quatro agentes (`AGENTES`) e o `sistema` recebem as 20 chaves exatas da vista mínima, sem nenhuma chave do
     andamento e sem os números.
   - A T09 só testava o agente pela rota e o `awave` pela unidade. O ator `sistema` não tinha teste.
4. **`lerDemandaPara` com `sistema` e com agente (`consolidacao`), no banco real.** A vista mínima exata, sem o
   andamento. Controle: a pessoa, pelo mesmo caminho, lê os números.
5. **Integração fora da autoria.**
   - `awave` sobre a demanda de pessoa com andamento: `ErroDominio` `sem_permissao`, com a mensagem da casa.
   - `construir` sobre a mesma vista com a autoria do Awave: o mesmo erro.
   - Controle: o `awave` sobre essa vista recebe sete chaves e o andamento em quatro.

**`leitura-andamento-fora-do-esquema-qa.test.ts`** (7 testes):

- **O banco é só deste arquivo.** O `beforeAll` retira os quatro CHECK e a chave estrangeira do DEC. O primeiro teste
  confere em `pg_constraint` que saíram, então nenhum caso passa por uma restrição que recusaria a linha. Os nomes estão
  escritos no teste: se mudarem, o `drop constraint` falha de forma visível. Isso responde ao Minor 3 da 06-T09-revisao
  para os casos novos, porque o isolamento fica explícito no arquivo.
- **Seis casos, um campo fora do esquema por vez:**
  - status da construção fora da lista;
  - DEC fora do formato;
  - fase com outra caixa (`Construindo`, sem coerção);
  - fase com espaço no fim;
  - `tarefasProntas` negativo;
  - `tarefasTotal` 1000.
- **O que cada caso confere:**
  - controle: a linha válida aparece nas duas vistas;
  - com a linha ruim por último, o Awave responde 200, com sete chaves e `andamento: null`, sem eco do valor;
  - a pessoa responde 200 com `andamento: null`, sem eco;
  - a leitura não volta para a válida anterior;
  - a listagem da pessoa responde 200, com a demanda e sem eco;
  - um envio válido depois volta a aparecer nas duas vistas.

Sem relógio real: `relogioFixo`. O primeiro arquivo avança 2 h no `beforeEach`, pelo limite de 10 demandas por hora do
Awave, e 1 min entre envios dentro do caso. As datas esperadas são lidas do relógio no momento do caso. O segundo arquivo
não avança o relógio. Cada caso cria as próprias demandas (ids fixos e distintos no segundo arquivo), e o último
andamento é pela maior `id` da linha (`consultas.ts`), sem empate pelo relógio. Dados fictícios. Os tokens nascem em
tempo de teste e não aparecem em mensagem de `expect`.

### Leitura crítica dos testes do engenheiro

- **As asserções são fortes:**
  - as listas de chaves são exatas (`toEqual` sobre as chaves ordenadas);
  - a `foto` do CA-10.3 é a resposta inteira;
  - o D-09 compara o SQL capturado;
  - a varredura tem quatro amarras contra passar no vazio;
  - o 503 do AN-06 (c) tem controle e conferência do gatilho.
- **Ordem e relógio.** Os casos de `leitura-awave-andamento.test.ts` calculam o `atualizadoEm` esperado a partir de
  `relogio.agora()` depois do `beforeEach`. Por isso não dependem da ordem. O caso do CA-04.6 retira dois CHECK, e
  nenhum caso depois dele depende deles. Na varredura, os `POST` criam versões novas da demanda do cenário, e a
  `montarEntrada` usa os ids guardados no `beforeAll`, então a ordem dos três testes também não importa.
- **Lacunas que fechei:**
  - nenhum teste tinha mais de uma demanda com andamento ao mesmo tempo na leitura;
  - o ator `sistema` não tinha teste da vista;
  - o `construir` lendo a vista do Awave só tinha teste com a fixture sem andamento (`ramos-por-ator.test.ts`); agora
    também com o andamento real;
  - a vista inteira da pessoa não tinha a lista exata de chaves com o andamento;
  - o CA-04.6 cobria só a fase e o "prontas > total", entre seis condições do `andamentoLidoSchema`.
- **Minor 2 da 06-T09-revisao (prefixo do token na mensagem do `expect`): corrigido.** É uma linha de
  `leitura-awave-andamento.test.ts:186`, com o mesmo rigor (ver Decisões).

### Resultado

- `leitura-andamento-qa.test.ts`: **5 de 5**. `leitura-andamento-fora-do-esquema-qa.test.ts`: **7 de 7**.
- Os quatro arquivos da T09 mais o `PISO`: **85 de 85**.
- `pnpm test` completo: **336 arquivos, 7465 de 7465, 0 falharam** (183,56 s).
  - A revisão tinha 334 arquivos e 7449 testes. Esta etapa acrescenta 2 arquivos, 12 testes e 2 casos do `PISO`, o que
    dá 7463.
  - A diferença de 2 é a mesma variação de contagem num teste gerado fora destes arquivos, já notada nas etapas 06-T07 e
    06-T08. Não muda o resultado.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git diff`:
  - a linha 186 de `leitura-awave-andamento.test.ts`, mais um comentário;
  - as duas entradas novas do `PISO`.
- `git status --short`: esses dois arquivos modificados e os dois novos.
- Nenhum `.skip`, `.only` ou `.todo` nos arquivos novos.

## Decisões tomadas

- **Dois arquivos novos, e não testes dentro dos do engenheiro.** Mantém a autoria e o piso deles. O CA-04.6 campo a
  campo fica num arquivo próprio, para os CHECK retirados não alcançarem nenhum outro caso.
- **A linha 186 do engenheiro mudou.** `expect(texto).not.toContain(prefixo)` virou
  `expect(texto.includes(prefixo)).toBe(false)`. A condição é a mesma, mas, se falhar, a mensagem não imprime o prefixo
  do token (G3.3). É teste, do meu escopo, e a contagem de `expect(` do arquivo continua 58.
- **Os dois arquivos novos entram no `PISO` com 32 e 14.** É proteção a mais e não sobe o piso de nenhum arquivo
  existente.
- **Sem mutação plantada no código.** `src/` fora de `*.test.ts` não está na minha lista Pode. A não-vacuidade é provada
  por controles no próprio teste:
  - a linha válida aparece antes da ruim;
  - a pessoa lê os números que o agente não lê;
  - o `awave` autor recebe a vista que o `construir` não recebe;
  - o `pg_constraint` mostra que as restrições saíram.
- **Os testes rodaram só na forma da lista Pode.** Não usei `--sequence.shuffle`. A independência de ordem foi conferida
  pela leitura: cada caso cria os próprios dados e lê as datas do relógio no momento.

## Pendências

- Nenhuma bloqueia a passagem.
- **Para a `08-revisao`:**
  - os Minors da 06-T09-revisao que não são de teste meu continuam lá:
    - o comentário de `test/desempenho/leitura.test.ts:244`;
    - o `drop constraint` sem volta no CA-04.6 de `leitura-awave-andamento.test.ts`. Os casos novos já estão isolados
      no arquivo próprio;
    - os títulos com "seis chaves";
    - o `a === null` de `paraIntegracao`;
  - o CA-04.6 da fila e do detalhe (telas) fica para a T12 e a T13, com a mesma lista de seis casos deste arquivo como
    sugestão.
- **Para a `09-entrega` (RNF-01):** medir o detalhe e a leitura do Awave com `andamento_construcao` povoada, como o
  engenheiro e a revisão já apontaram.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `grep -rn "CA-1[01]\." /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — linhas do RF-10 e do RF-11
- `grep -rn "CA-04.6" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md` — linha do CA-04.6
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — `1cc873e` (06-T09-revisao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/andamento/consultas.ts` — o último é pela maior `id`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/andamento/regras.ts` — `lerAndamento`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "check" -- drizzle/0008_slippery_whirlwind.sql` — nomes dos CHECK
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/andamento/schemas.ts` — `andamentoLidoSchema` e `paraIntegracao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/andamento.ts` — `inserirAndamento`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:drizzle/0008_slippery_whirlwind.sql` — a chave estrangeira do DEC
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/consultas.ts` — as vistas por ator
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/ator.ts` — `AtorSistema` e `AGENTES`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/integracoes.ts` — `inserirDemandaDeIntegracao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "inserirDemandaDeIntegracao(b" -- src test` — uso do ajudante
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/pedidos-construcao.ts` — `preparadorDePedidos`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento" -- test/estatico/piso-de-assercoes.test.ts` — entradas do piso
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/relogio.test.ts` — a varredura do relógio só olha `src/` sem testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/sql-raw.test.ts` — só `sql.raw(`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/banco.ts` — banco próprio por arquivo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A6 "export async function criarPessoa" -- test/sessao.ts` — assinatura
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "sem_permissao" -- src/modules/acesso/mensagens.ts` — mensagem da recusa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-andamento-qa.test.ts --reporter=dot` — 5 de 5
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts --reporter=dot` — 7 de 7
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/app/api/demandas/leitura-andamento-qa.test.ts src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts src/app/api/demandas/leitura-awave-andamento.test.ts` — 32, 14 e 58
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-andamento-qa.test.ts src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 85 de 85
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 336 arquivos, 7465 de 7465 (em segundo plano; saída lida com a ferramenta Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — a linha 186 do teste do engenheiro e as duas entradas do `PISO`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — dois modificados e dois novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked "\.only(" -- src/app/api/demandas/leitura-andamento-qa.test.ts src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked "\.skip(" -- src/app/api/demandas/leitura-andamento-qa.test.ts src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n --untracked "\.todo(" -- src/app/api/demandas/leitura-andamento-qa.test.ts src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 8f028623609dffcd782fa6b38d7248eb36c693f3` — 24 arquivos, todos da tarefa ou do registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 8f028623609dffcd782fa6b38d7248eb36c693f3 -- src/app/api/demandas/leitura-awave-qa.test.ts src/app/api/demandas/leitura-awave.test.ts src/modules/acesso/ramos-por-ator.test.ts test/desempenho/leitura.test.ts` — trocas da G5 sem asserção afrouxada
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — sem commit novo durante a etapa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "exigirVisivelPara" -- src/modules/demandas/confirmacao.ts` — guarda de agente e sistema
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export async function exigirVisivelPara" -- src/modules/demandas/confirmacao.ts` — o sistema passa pela mesma guarda
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "aguardaConfirmacao" -- src/modules/demandas/confirmacao.ts` — onde a guarda decide
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A16 "export async function aguardaConfirmacao" -- src/modules/demandas/confirmacao.ts` — demanda de pessoa não aguarda confirmação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "jaConfirmada" -- src/modules/demandas/confirmacao.ts` — confirmação da demanda de integração
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "globSync" -- test/estatico/varreduras-qa.test.ts` — o que as varreduras estáticas cobrem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "listar(" -- test/estatico/varreduras-qa.test.ts` — padrões das varreduras

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
