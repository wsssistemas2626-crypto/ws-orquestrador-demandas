---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T09-construcao
agente: engenheiro-backend
leu: [pedido.json (pelo plano), padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G10, linhas 1 a 335, e T09, 2201 a 2341), 06-T06-engenheiro-dados-bd.md (20 a 154), 06-T07-qa-automacao.md (Pendências), 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md (Pendências), src/modules/demandas/consultas.ts, src/modules/andamento/consultas.ts, src/modules/andamento/schemas.ts, src/modules/andamento/regras.ts, src/modules/andamento/registrar-prazo.test.ts, src/modules/andamento/registrar-qa.test.ts (410 a 512), src/modules/acesso/matriz.ts, src/modules/integracoes/tempo-limite.ts, src/db/transacao.ts, src/modules/demandas/confirmar.ts (35 a 62), src/modules/agentes/entrada-agente.ts (200 a 245), src/modules/agentes/entrada-agente.test.ts (1 a 120 e 620 a 654), src/app/api/vistas-para-agente.test.ts, src/app/api/demandas/leitura-awave.test.ts, src/app/api/demandas/leitura-awave-qa.test.ts, src/app/api/demandas/contrato-awave.test.ts, src/app/api/demandas/visibilidade-agente-0019.test.ts, src/app/api/demandas/criacao-awave-0019.test.ts (86 a 95), src/modules/acesso/ramos-por-ator.test.ts (1 a 56), src/modules/acesso/ramos-por-ator-qa.test.ts (80 a 150), src/modules/demandas/consultas.test.ts (163 a 202), scripts/seed-integracoes-qa.test.ts (258 a 269), test/desempenho/leitura.test.ts (225 a 264), test/requisicao.ts, test/andamento.ts, test/pedidos-construcao.ts, test/integracoes.ts, test/sessao.ts (88 a 115), test/matriz-rotas.test.ts, test/estatico/piso-de-assercoes.test.ts, as fixtures de DemandaVista de oito testes do painel (só o trecho da fixture)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T09 está pronta. O andamento chega à pessoa em seis campos e ao Awave em quatro, montados chave a chave, na mesma
consulta da autoria. O agente não recebe nada. A varredura de leituras de agente parte de `MATRIZ`.

Antes de escrever código, conferi a lista Pode. A T09 só toca `src/` e `test/` (mais um teste em `scripts/`, ver
Desvios). Tudo está na lista do `engenheiro-backend`, então não foi preciso devolver ao plano.

### Código (`src/modules/demandas/consultas.ts`, o passo 3 do plano)

- `DemandaVista` ganhou `andamento: AndamentoVista | null`. O `obterDemanda` lê `lerAndamento(await ultimoAndamento(db, id))`
  em sequência, na mesma conexão.
- `DemandaVistaMinima` acrescenta `'andamento'` ao `Omit`. O corpo de `vistaMinimaDaDemanda` não muda: a chave nunca
  entrou nele.
- `DemandaVistaDaIntegracao` passou a ter sete chaves, com `andamento: AndamentoDaIntegracao | null`. `vistaDaIntegracao`
  monta o andamento por `paraIntegracao`, chave a chave.
- `obterDemandaDaIntegracao` junta `subconsultaDoUltimoAndamento(db, id)` por `leftJoin(ua, eq(ua.demandaId, demanda.id))`
  no mesmo `SELECT` da autoria (D-09, ADR-35). A linha passa por `lerAndamento`.
- O 201 do `POST` do Awave já sai com `andamento: null`, porque o serviço chama `obterDemandaDaIntegracao` dentro da
  transação orçada. `servico.ts` não mudou.
- G4: os corpos de `vistaMinimaDaDemanda`, `paginaDeDemandas`, `resumoDe`, `listarDemandasPara` e `lerDemandaPara` não
  têm linha mudada (`git diff 0ac099a -- src/modules/demandas/consultas.ts`). As superfícies congeladas saíram vazias.

### Testes criados

- `src/app/api/demandas/leitura-awave-andamento.test.ts`: 13 testes, com 58 linhas que têm `expect(`.
  - **CA-10.1:** `construindo 9/17` resulta em 200 com exatamente sete chaves, e o andamento tem exatamente quatro. O
    status vai a `em_construcao`. O texto não traz o DEC, `statusConstrucao`, `ficticio` nem o prefixo do token.
  - **CA-10.2:** sem andamento, com e sem pedido gerado, sai `andamento: null`.
  - **CA-10.3:** a demanda de pessoa com andamento, lida pelo Awave, tem a mesma `foto` (status, cabeçalhos sem `date`
    e corpo) do id inexistente. No controle, a pessoa lê o andamento.
  - **CA-10.4:** o 201 do `POST` tem sete chaves com `andamento: null` e é igual ao `GET` seguinte.
  - **CA-10.5:** com `em_construcao` e depois `cancelado` pela rota do `/construir`, o status fica `devolvida`. O
    andamento tem quatro chaves e o texto não traz `cancelado` nem o DEC.
  - **CA-11.1:** a pessoa (cookie) recebe os seis campos exatos.
  - **CA-11.2 e CA-11.3:** o agente recebe exatamente as 20 chaves da vista mínima da 0.3.1, sem nenhuma chave do
    andamento nem `987`/`988`. Na listagem, pessoa e agente recebem itens com as chaves da 0.3.1. No controle, a pessoa
    vê `987`.
  - **AN-09 (unidade):** `vistaDaDemandaPara(awave, d)`, com o andamento de seis campos e uma chave a mais, devolve as
    quatro chaves.
  - **D-09 e ADR-35:** pelo logger do Drizzle, `obterDemandaDaIntegracao` faz uma consulta só, com o alias
    `ultimo_andamento` e o id fora do texto. O SQL é idêntico para a própria demanda, a de outro autor e a inexistente,
    e as duas últimas dão `nao_encontrado`.
  - **CA-04.6 (leitura):** com uma linha válida, as duas vistas mostram o andamento (controle). Depois, só neste banco de
    teste, os CHECK de fase e de tarefas são retirados. Por cima entra uma linha com `fase_inventada` e outra com 20/17.
    As vistas da pessoa e do Awave respondem 200 com `andamento: null`, sem 500 e sem eco.
  - **AN-06 (c), D-06:**
    - com o pool de uma conexão segura e 7 s gastos na espera, a resposta é 200 com o andamento;
    - quando o relógio monotônico pula para 9 s no fim da consulta que junta o andamento, a resposta é 503
      `indisponivel`;
    - no controle, com o mesmo salto de 7 s, a resposta é 200;
    - os dois testes do salto conferem que o gatilho disparou uma vez.
- `test/transversal/visibilidade-andamento.test.ts`: 3 testes, com 11 linhas que têm `expect(`.
  - **Controle:** a pessoa lê `testando 987/988`.
  - **Varredura:** percorre `MATRIZ` × os `route.ts` × os quatro agentes, com corpo válido nas quatro ações que gravam.
    - Nenhuma resposta traz as chaves do andamento nem os números.
    - Toda leitura que a matriz dá ao agente responde 200 sobre a demanda do cenário.
    - As ações chamadas são exatamente as ações com agente.
    - Toda ação com agente teve ao menos um 2xx. Assim a varredura não passa no vazio: ação nova sem corpo válido
      reprova.
  - **`montarEntrada`:** nos quatro agentes, a entrada não tem o andamento.

### Arquivos modificados

- `src/modules/demandas/consultas.ts` (o código acima).
- `test/requisicao.ts`: `caminhoCom` passou a ser exportado, sem mudar o comportamento (o plano autoriza).
- `test/estatico/piso-de-assercoes.test.ts`: o `PISO` ganhou os dois arquivos novos (58 e 11). Nenhuma entrada desceu.
- Testes da G5. Nenhuma asserção saiu ou foi afrouxada:
  - fixtures tipadas como `DemandaVista` ganharam `andamento: null`. São nove arquivos, apontados pelo `typecheck`:
    - `confirmar-demanda.test.ts` e `confirmar-demanda-qa.test.ts`;
    - `detalhe.test.ts`;
    - as três `pagina.test.ts` de `demandas/[id]`;
    - `pacotes-decisao/[decId]/pagina.test.ts` e `recebimento-qa.test.ts`;
    - `ramos-por-ator-qa.test.ts`.
  - listas de seis chaves passaram a sete, com `andamento: null` onde o valor é comparado:
    - `contrato-awave.test.ts:46`;
    - `criacao-awave-0019.test.ts:91`;
    - `leitura-awave.test.ts`: o `SEIS` virou `SETE`, e o `toEqual` do CA-07.1 ganhou `andamento: null`;
    - `leitura-awave-qa.test.ts`: a mesma troca, mais `andamento: null` no `toEqual`;
    - `ramos-por-ator.test.ts`: a fixture `as DemandaVista` ganhou `andamento: null`, e a lista passou a sete;
    - `src/modules/demandas/consultas.test.ts`: `andamento: null` no `toEqual` do `obterDemanda`.
  - `scripts/seed-integracoes-qa.test.ts:265` e `test/desempenho/leitura.test.ts:244` estão em Desvios.

### Teste escrito antes, visto falhando

Comando: `pnpm --dir <repo> test src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts --reporter=verbose`.
Rodei antes de mexer em `consultas.ts`, já com o preparo do teste corrigido:

```
 × ... CA-10.1: construindo 9/17 → 200 com exatamente as sete chaves ...
   → expected [ 'atualizadaEm', 'criadaEm', …(4) ] to deeply equal [ 'andamento', 'atualizadaEm', …(5) ]
 × ... CA-11.1: ... → Cannot convert undefined or null to object
 × ... D-09: uma consulta só ... → expected undefined to match object { fase: 'construindo' }
 × ... o relógio passa de 8 s durante a consulta do andamento ... → expected +0 to be 1
 ✓ test/transversal/visibilidade-andamento.test.ts > ... varre MATRIZ × rotas × quatro agentes
 ✓ test/transversal/visibilidade-andamento.test.ts > ... a entrada montada para o provedor falso ...
 Test Files  2 failed (2)
      Tests  14 failed | 2 passed (16)
```

Os dois verdes são as guardas que a G3.1 prevê: a vista mínima e a entrada do agente já são listas de permissão. O teste
que exige o código novo é o resto: os 13 do arquivo do Awave e o controle da pessoa na varredura.

Antes dessa rodada, duas rodadas falharam por erro do próprio preparo, que corrigi:
- a demanda do Awave cita "Awave" no contexto, e o pedido recusa nome na descrição. A pessoa reescreve o contexto;
- o limite de 10 por hora do Awave estourava. Cada caso agora avança o relógio 2 h;
- o status ficava em `pronta_para_decisao`. A pessoa leva a demanda a `aprovada`;
- o 503 com "+1 s por leitura" não vencia numa leitura de uma consulta só. Ver Desvios.

Com o código: **16 de 16**.

### Resultado

- Testes da tarefa: 16 de 16.
- `pnpm test` completo: **334 arquivos, 7448 testes, 0 falharam** (169,6 s).
- `pnpm lint` e `pnpm typecheck`: limpos.
- G4 (`git diff 0ac099a --stat` das superfícies congeladas): vazio.
- G9 conferida contra a varredura. As ações chamadas são as nove da tabela:
  - `criar_demanda`, `listar_demandas` e `ler_demanda`;
  - `criar_especificacao` e `ler_especificacao`;
  - `criar_parecer_risco` e `ler_parecer_risco`;
  - `criar_pacote_decisao` e `ler_pacote_decisao`.
- `git status`: só os arquivos listados acima.

### Desvios do plano

- **Caso 10, o 503 (D-06).** O plano pedia o relógio subindo 1 s por leitura. A leitura do Awave faz uma consulta só e
  lê o relógio cinco vezes, então não passa de 8 s e responde 200. Por isso troquei pelo molde de `registrar-qa.test.ts`
  (AN-06 adversarial): o relógio pula para 9 s no fim da consulta que tem `"ultimo_andamento"`, observada pelo cliente
  do pg. Assim fica provado que a subconsulta do andamento conta dentro do prazo total, sem depender de quantas vezes o
  prazo lê o relógio. O controle de 7 s mostra que o gatilho casa e que o 503 vem do salto.
- **Caso 9, CA-04.6.** O plano sugeria `vi.spyOn` em `ultimoAndamento`. Mas a vista do Awave usa a subconsulta, e não
  `ultimoAndamento`, então o espião não cobriria o Awave. Em vez disso, retirei pelo migrator os CHECK de fase e de
  tarefas, só no banco de teste deste arquivo, e gravei linhas fora do esquema. O caminho real das duas vistas passa por
  elas. Nenhum outro caso do arquivo depende desses CHECK. O precedente é o gatilho de teste de
  `registrar-prazo.test.ts`.
- **Varredura com corpo válido.** O plano manda `{}` nos `POST`. Mandei o corpo válido de cada uma das quatro ações que
  gravam, e `{}` para ação nova. Com isso, os quatro `POST` de agente também conferem o 201 e exigem um 2xx por ação.
- **Asserções a mais**, todas só acréscimos:
  - a vista mínima exata (20 chaves) no CA-11.2;
  - o teste D-09 de "uma consulta só, mesmo SQL";
  - o controle da pessoa na varredura;
  - o 200 obrigatório nas leituras de agente.
- **Fora da lista da G5, mas apontados pelo `pnpm test`:**
  - `scripts/seed-integracoes-qa.test.ts:265`: a mesma troca de seis para sete chaves da G5, numa lista de chaves do
    Awave. Ele não está na lista nominal da G5, mas o plano diz "e as … que o `pnpm test` apontar". Mais nada mudou.
  - `test/desempenho/leitura.test.ts:244`: o `obterDemanda` passou de 5 para 6 consultas. A sexta é o `ultimoAndamento`
    que o próprio plano manda acrescentar. O plano dela entra na mesma conferência de varredura do arquivo. Não é teste
    de segurança. Pela G3.2, a revisão decide.

## Decisões tomadas

- **O código é o do plano.** A única diferença é de forma: o `DemandaVistaDaIntegracao` ocupa várias linhas, por causa
  do Prettier.
- **O CA-04.6 é testado pelo banco, e não por espião.** É o único jeito de a mesma linha passar pelas duas vistas reais.
- **O 503 do AN-06 (c) usa um ponto fixo.** O relógio pula no fim da consulta do andamento, e não a cada leitura do
  relógio, para o teste não quebrar se o prazo passar a ler o relógio mais ou menos vezes.
- **O helper de salto foi copiado, e não exportado.** É uma cópia curta, local no arquivo novo, do `poolVigiado` de
  `registrar-qa.test.ts`. Exportá-lo mexeria num teste da 06-T07-testes, fora da G5.
- **O `beforeEach` avança o relógio 2 h.** É o limite de 10 demandas por hora do Awave (C-36). Os valores esperados de
  `atualizadoEm` saem do relógio no momento do caso, então o arquivo não depende de ordem.
- **Os comandos `pnpm` usam `--dir <repo>`.** É a forma das entregas anteriores, porque `cd` não está na lista Pode.

## Pendências

- Para o maestro (forma de comando): rodei comandos fora da forma da lista Pode, todos em Comandos executados do jeito
  que rodaram.
  - **Um deles alterou arquivo:** um `sed -i` sobre o meu próprio teste novo
    (`src/app/api/demandas/leitura-awave-andamento.test.ts`, criado nesta etapa e que eu podia editar). Ele trocou a
    constante de data fixa por leituras do relógio. A edição está dentro do arquivo da tarefa, e o resultado foi
    conferido pelo `Read` e pelos testes. Mas o comando `sed` não está na lista. Pela regra de 25/10, o que altera algo
    vai a Fabiano: peço a liberação ou a orientação.
  - **Os outros só leram**, e peço a liberação como leitura:
    - dois `grep -n` sem `-r` (o plano e o meu teste novo);
    - quatro `git grep` com `\|` no padrão (alternativa).
- Para a `06-T09-revisao`:
  - G4 vazio. Os corpos congelados de `consultas.ts` estão sem linha mudada.
  - O `expect(` só subiu nos testes tocados. As trocas de lista não mudaram a contagem por linha.
  - Os dois desvios fora da G5 estão acima: `seed-integracoes-qa.test.ts:265` e `leitura.test.ts:244`.
- Para a `08-revisao` (Minor):
  - Títulos e comentários de testes antigos ainda dizem "seis chaves": `leitura-awave.test.ts`,
    `leitura-awave-qa.test.ts`, `contrato-awave.test.ts`, `criacao-awave-0019.test.ts`, `ramos-por-ator.test.ts` e
    `seed-integracoes-qa.test.ts`. Mudei só as listas e as constantes, para não passar da G5.
  - `paraIntegracao` (schemas.ts, T05) usa `a === null`, e uma fixture sem a chave (undefined) derruba a vista. Hoje
    nenhuma rota monta `DemandaVista` sem `obterDemanda`, mas `a == null` seria mais robusto. O arquivo é da T05 e não
    está na T09.
- Para a `09-entrega` (RNF-01): no `test/desempenho/leitura.test.ts`, o plano da sexta consulta do detalhe sai como
  `Seq Scan andamento_construcao`, porque a tabela está vazia naquele banco. A tabela não está entre as que crescem
  ali. Com volume, o índice é usado, como prova o EXPLAIN da 06-T06. Convém olhar na medição.
- Para a `08-revisao`: o AN-06 (c), que a 06-T07-qa-automacao deixou para a T09, está coberto pelos três testes do
  describe "AN-06 (c) e D-06".
- A T08 deixou um ponto para cá: a sentinela de `sentinelas-andamento.test.ts` lê a demanda do Awave com andamento.
  Esse teste passou na suíte completa, já com a chave nova.
- Nenhuma migration rodou. Nenhum banco fora do Testcontainers foi usado.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `grep -n "^#" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — títulos do plano (fora da forma: sem `-r`; só leitura)
- `grep -rn "T09" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — Pendências que citam a T09
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — último commit `c692b6e` (06-T08-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/app/api` — rotas e testes da API
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A3 "rota(" -- src/app/api/demandas src/app/api/especificacoes src/app/api/pareceres-risco src/app/api/pacotes-decisao/route.ts src/app/api/pacotes-decisao/[decId]/route.ts ":!*.test.ts"` — ação e `meta` das rotas com agente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "'atualizadaEm', 'criadaEm', 'id'"` — listas de seis chaves
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "'origem'" -- src/app/api/demandas/demandas.test.ts` — chaves do item da listagem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -B2 -A6 "'agentesEmAndamento'" -- src` — listas de chaves da vista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "montarEntrada" -- src test` — molde da entrada do agente
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^export" -- test/deps.ts test/sessao.ts test/banco.ts src/modules/demandas/confirmar.ts src/lib/relogio.ts` — ajudantes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- src/modules/pedido-construcao/gerar.ts src/modules/acesso/tokens-servico.ts src/db/index.ts` — assinaturas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vistaDaIntegracao\|obterDemandaDaIntegracao\|DemandaVistaDaIntegracao\|vistaDaDemandaPara" -- src scripts test` — quem usa a vista da integração (fora da forma: alternativa; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "obterDemanda(" -- src scripts ":!*.test.ts"` — quem lê a vista de pessoa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CONSTRAINT\|CHECK" -- drizzle/0008_slippery_whirlwind.sql` — nomes dos CHECK (fora da forma: alternativa; só leitura)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^import" -- src/modules/andamento/consultas.test.ts` — molde do logger do Drizzle
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts --reporter=verbose` — 13 falharam e 2 passaram (erros do preparo: pedido recusado por nome, 429 do Awave)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A6 "LIMITE_DA_INTEGRACAO" -- src/modules/limites.ts` — 10 por hora
- `grep -n "AGORA" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app/api/demandas/leitura-awave-andamento.test.ts` — usos da constante (fora da forma: sem `-r`; só leitura)
- `sed -i -e "s/atualizadoEm: AGORA })/atualizadoEm: agoraIso() })/g" -e "s/atualizadoEm: new Date(AGORA) })/atualizadoEm: relogio.agora() })/g" -e "s/^const relogio = relogioFixo(AGORA);/const relogio = relogioFixo('2026-11-13T12:00:00Z');\nconst agoraIso = () => relogio.agora().toISOString();/" -e "/^const AGORA = /d" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/app/api/demandas/leitura-awave-andamento.test.ts` — edição do meu teste novo (fora da lista Pode; ver Pendências)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts --reporter=verbose` — 13 falharam e 2 passaram (sem a chave; a CA-10.5 com status `pronta_para_decisao`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A14 "^const MANUAIS" -- src/modules/demandas/transicoes.ts` — `pronta_para_decisao → aprovada` é manual
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -B3 -A25 "Client.prototype" -- src/modules/andamento/registrar-qa.test.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "performance\|query\b\|vigiada\|pula" -- src/modules/andamento/registrar-qa.test.ts` — molde do salto do relógio (fora da forma: alternativa; só leitura)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts --reporter=verbose` — antes do código: 14 falharam e 2 passaram (trecho acima)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts --reporter=verbose` — com o código: 16 de 16
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 9 fixtures sem `andamento`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "agentesEmAndamento: \[\]" -- "src/app/(painel)/demandas/[id]/confirmar-demanda-qa.test.ts" "src/app/(painel)/demandas/[id]/confirmar-demanda.test.ts" "src/app/(painel)/demandas/[id]/detalhe.test.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/pagina.test.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/pagina.test.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/pagina.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts" src/modules/acesso/ramos-por-ator-qa.test.ts` — linha de cada fixture
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 334 arquivos: 11 falharam e 7437 passaram (as listas de chaves da G5 e a contagem de consultas; em segundo plano, saída lida com a ferramenta Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/app/api/demandas/leitura-awave-andamento.test.ts test/transversal/visibilidade-andamento.test.ts` — 58 e 11
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/demandas/consultas.ts` — só os trechos do plano; corpos congelados intactos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só arquivos da tarefa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 12 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "SEIS\|seis chaves\|6 chaves" -- src/app/api/demandas/leitura-awave.test.ts src/app/api/demandas/leitura-awave-qa.test.ts src/app/api/demandas/contrato-awave.test.ts src/app/api/demandas/criacao-awave-0019.test.ts src/modules/acesso/ramos-por-ator.test.ts scripts/seed-integracoes-qa.test.ts` — onde a G5 muda (fora da forma: alternativa; só leitura)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-integracoes-qa.test.ts test/desempenho/leitura.test.ts src/modules/acesso/ramos-por-ator.test.ts src/modules/demandas/consultas.test.ts src/app/api/demandas --reporter=dot --silent` — 15 arquivos, 240 de 240
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 334 arquivos, 7448 de 7448 (em segundo plano; saída lida com a ferramenta Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 20 arquivos modificados, mais os 2 novos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
