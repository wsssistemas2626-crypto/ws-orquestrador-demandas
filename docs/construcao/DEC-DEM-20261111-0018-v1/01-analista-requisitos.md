---
pedido: DEC-DEM-20261111-0018-v1
etapa: 01-requisitos
agente: analista-requisitos
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, insumo 2026-11-11_orquestrador-sobras-0.1.13.md, CHANGELOG.md, package.json, DEC-DEM-20261111-0017-v1/08-maestro.md, docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md, docs/manual-tecnico/04-versoes-e-decisao.md, src/modules/acesso/matriz.ts, src/lib/rota.ts, src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/entregar.ts, src/app/api/pedidos-construcao/pendentes/route.ts, src/app/api/pedidos-construcao/[decId]/andamento/route.ts, src/modules/andamento/registrar.ts, src/modules/andamento/schemas.ts, src/modules/andamento/consultas.ts, src/modules/andamento/consultas.test.ts, src/modules/pacotes-decisao/substituido.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/servico.ts, src/modules/historico/registrar.ts, src/db/schema/decisao.ts, src/components/dados-da-decisao.ts, src/components/dados-das-etapas.ts, src/app/(painel)/pacotes-decisao/[decId]/page.tsx, src/lib/deps-qa.test.ts, test/banco.ts, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: arquiteto-solucoes
devolvido_para: null
---
## Entrega

Base conferida: `main` na 0.4.0 (`package.json` 0.4.0, CHANGELOG 0.4.0 de 13/11). O pedido foi escrito em 11/11, antes
da 0.3.0, da 0.3.1 e da 0.4.0, e recebeu o acréscimo de Fabiano de 13/11 (itens 8 a 10 e dois critérios novos). Versão
de saída: **0.4.1** (ESP: "0.4.1 ou a seguinte livre").

### 1. Situação de cada item contra a `main` 0.4.0

| Item da ESP | Situação na 0.4.0 | Evidência no código | O que este pedido faz |
|---|---|---|---|
| (1) S-02, rota de situação | **Ainda vale. Mudou de forma, porque parte do risco já está coberta.** A 0.3.0 tirou o DEC substituído da lista de pendentes e responde 409 na entrega dele. A 0.4.0 responde 409 `decSubstituido` no envio de andamento. Ainda faltam três coisas: uma **leitura** sem efeito colateral que a `00-inicio` possa chamar antes do primeiro envio; um sinal para o pedido já recebido ou escrito direto; e um sinal enquanto o envio estiver desligado (`andamento_ligado: false` até a P-04). | Não existe `src/app/api/pedidos-construcao/[decId]/situacao`. `pendentes.ts:41` (`expressaoSubstituidoPor() is null`), `conferir.ts:66` e `registrar.ts:67` (`aprovadoVigente(...)?.id !== decId` → 409). Na matriz, `construir` tem 4 ações (`matriz.ts:71-74`). | RF-01 |
| (2) S-03, D1 com o nome da criação | **Ainda vale, sem mudança.** O D1 confere só o nome atual. O DEC não guarda cópia do nome. O histórico grava `campo_alterado` do `solicitanteNome` com o marcador, sem o valor. Por isso o nome em vigor na criação **não pode ser recuperado** para os DEC já criados. | `conferir.ts:78` (`nomesDoSolicitante(demandaTravada.solicitanteNome)`). `pacote_decisao` copia tipo, título e descrição, mas não o solicitante (`decisao.ts:38-42`). `CAMPOS_COM_VALOR` não inclui `solicitanteNome` (`historico/registrar.ts:56`). | RF-02 |
| (3) S-04, arquivar o v2 | **Ainda vale, sem mudança.** `decisao_arquivada` leva a `encerrada` a demanda que está em `nova`, `em_analise`, `aguardando_informacao` ou `pronta_para_decisao`, sem olhar o aprovado vigente. A dica da T11 diz "Arquivar: a demanda vai para Encerrada.", e ela fica errada depois da mudança. | `transicoes.ts:78`, `decidir.ts:249`, `dados-da-decisao.ts:83` (`dicaArquivar`). | RF-03 |
| (4) C-27, teste instável | **Ainda vale.** O caso não mudou desde a 0.1.13, e nenhuma versão registrou correção nem causa. | `src/lib/deps-qa.test.ts:29-46`: `select distinct usename from pg_stat_activity where datname = current_database()` comparado a `['orquestrador_app']` logo depois de `obterDeps()`. | RF-04 |
| (5) Textos da T11 | **Ainda vale.** Os textos de 0.1.13 continuam como "texto da triagem, para revisão da ux-ui-design". Os três avisos não existem na T11. A T05 já mostra, desde a 0.2.0, a "linha 8" da Próxima ação (DEC mais novo pendente sobre aprovado vigente), mas só na T05. **Texto novo por efeito deste pedido:** a dica do Arquivar (RF-03). | `dados-da-decisao.ts:42-45`, `conferir.ts:42-43`, `decidir.ts:52-54`, `rotulos.ts:61` e `:309-313`, `dados-do-pedido.ts:54`. `page.tsx:193-222` só tem lembrete, substituído, desatualizado e rascunho. | RF-05, RF-06 |
| (6) Spec do sistema | **Mudou de forma.** As linhas-resumo do RF-13 e do RF-22 da spec já citam a substituição, o S-01 e o 409 do substituído. Os critérios (A-02 revisto, regra de nível do S-01, CA-22.4 revisto) continuam só no código e no manual. A spec também passa a precisar do que este pedido muda: RF-07 (arquivar), RF-22 (D1) e a rota nova. | `2026-10-25-ws-orquestrador-demandas-design.md:42` e `:51`. A linha 24 diz que os CA estão na `01` do 0001. | RF-09 |
| (7) CHANGELOG, `package.json`, manual 04 e 08 | **Ainda vale.** | `package.json` 0.4.0. | RF-10 |
| (8) B-08-1, leitura da fila | **Novo (13/11), vale.** | `consultas.ts:37-48` (`selectDistinctOn ... orderBy(demandaId, desc(id))`). O teste de plano em `consultas.test.ts:193-197` só proíbe `Seq Scan`. | RF-07 |
| (9) B-08-2, piso de asserções | **Novo (13/11), vale.** Além do `registrar-qa.test.ts`, vários testes de segurança da 0.3.0 e da 0.3.1 também estão fora do PISO (lista na Pendência 7). | `piso-de-assercoes.test.ts:8-93` não tem `registrar-qa.test.ts` nem os arquivos `*-integracao*`, `*-0019*` e `ramos-por-ator*`. | RF-08 |
| (10) Envio do andamento sem git | **Fora deste repositório** (ESP). | — | Fora do escopo |

### 2. Requisitos funcionais

**RF-01 — Situação do Pedido de Construção para o `/construir` (S-02).**
Regra de negócio:
- `GET /api/pedidos-construcao/<DEC-id>/situacao` responde 200 `{ "situacao": "vigente" }` ou
  `{ "situacao": "substituido" }`.
- A rota é só da integração `construir`, por uma ação nova na matriz. O `construir` passa de 4 para 5 ações, e nenhuma
  outra linha muda.
- `vigente`: o DEC é o aprovado vigente da demanda, pela mesma definição do envio de andamento (`aprovadoVigente`,
  maior `versao` com decisão `aprovada`). `substituido`: qualquer outro DEC com pedido gerado. Pedido gerado implica DEC
  aprovado, e decisão é só de inclusão, então os dois valores esgotam os casos.
- Só responde 200 se o DEC tem `pedido_gerado` por pessoa e esse evento é da demanda do próprio DEC (a mesma regra do
  AN-03 da 0.4.0). Em todos os outros casos, o mesmo 404 de DEC inexistente, com corpo idêntico: DEC inexistente, DEC sem
  pedido gerado e pedido escrito direto, sem geração no painel.
- O id fora do formato de DEC dá 404 sem consulta, como já faz o `rota()`.
- A resposta não diz o status da demanda, o id do substituto nem texto algum. Um DEC vigente numa demanda em status final
  responde `vigente` (Pendência 4).

Critérios de aceite:
- CA-01.1. **Dado** um DEC aprovado com pedido gerado por pessoa e nenhum aprovado mais novo na demanda, **quando** o
  token `construir` chama a rota, **então** a resposta é 200 com exatamente `{ "situacao": "vigente" }`, sem outra
  chave.
- CA-01.2. **Dado** o DEC do CA-01.1, **quando** um DEC mais novo da mesma demanda tem a aprovação completa (no nível
  `cto_e_administradora`, a segunda aprovação) e o token `construir` chama a rota de novo, **então** a resposta é 200
  com exatamente `{ "situacao": "substituido" }`. Com só a primeira das duas aprovações, continua `vigente`.
- CA-01.3. **Dado** um DEC inexistente com id no formato, um DEC aprovado sem pedido gerado e um DEC cujo único
  `pedido_gerado` não é de pessoa, **quando** o token `construir` chama a rota para cada um, **então** os três recebem
  404 com status e corpo idênticos entre si e iguais ao 404 das outras rotas do `/construir`.
- CA-01.4. **Dado** um DEC com pedido gerado, **quando** a rota é chamada por pessoa com sessão e 2FA, pelo token de cada
  um dos quatro agentes e pelo token `awave`, **então** todos recebem 403, sem consulta ao DEC. O teste matriz × rotas
  cobre a rota nova com os dois tokens de integração.
- CA-01.5. **Dado** qualquer chamada à rota, **quando** ela termina (200, 403, 404 ou 503), **então** nenhuma linha é
  gravada em `evento`, `andamento_construcao` ou outra tabela, e o log tem só a linha padrão de `rota()`, sem o `decId`
  no campo de rota.
- CA-01.6. **Dado** o prazo total das integrações esgotado (relógio falso), **quando** a rota é chamada, **então** a
  resposta é o 503 `indisponivel` de sempre.

**RF-02 — D1 também com o nome do solicitante em vigor na criação do DEC (S-03).**
Regra de negócio:
- A conferência e montagem do pedido (`conferirEMontarPedido`, usada pela geração e pela entrega) recusa com o 422 de
  hoje, com o caminho e o tipo `nome` e sem o valor, quando um texto escrito por pessoa contém o nome atual do
  solicitante **ou** o nome que estava em vigor quando o DEC foi criado.
- O nome em vigor na criação é o `solicitanteNome` da demanda lido na transação que grava o DEC, sob a trava da demanda.
- Como o nome não é recuperável para os DEC já criados (seção 1), ele precisa ser gravado a partir desta versão. Sem
  migration prevista no RSK; se o arquiteto precisar, aditiva.
- O DEC criado antes desta versão segue a Pendência 2.

Critérios de aceite:
- CA-02.1. **Dado** uma demanda com o solicitante "Pessoa Ficticia" e um DEC aprovado, criado com esse nome, cuja ESP cita
  "Ficticia", **quando** a pessoa gera o pedido, **então** recebe 422 com `nome` no caminho do campo e nada é gravado.
- CA-02.2. **Dado** o DEC do CA-02.1, **quando** a pessoa troca o `solicitanteNome` da demanda para "Outra Pessoa" e gera
  de novo, **então** recebe o mesmo 422, com o mesmo caminho, sem `pedido_gerado`.
- CA-02.3. **Dado** o DEC do CA-02.2, **quando** o `/construir` pede a entrega (se o DEC estiver entre os pendentes por
  um pedido gerado antes), **então** a entrega também é recusada pela mesma regra.
- CA-02.4. **Dado** um DEC sem o nome antigo nem o atual em texto algum, **quando** a pessoa gera o pedido, **então** o
  pedido sai igual byte a byte ao da 0.4.0 para o mesmo DEC (CA-22.2), sem campo novo no JSON.
- CA-02.5. **Dado** qualquer recusa do D1, **quando** se examinam a resposta, o log, o Sentry e o histórico, **então**
  nenhum deles contém o nome antigo nem o atual (teste com sentinela).

**RF-03 — Arquivar o DEC mais novo com um aprovado vigente devolve a demanda a `aprovada` (S-04, decisão S1).**
Regra de negócio:
- Ao gravar a decisão `arquivada` num DEC (pelo A-01, sempre o mais novo da demanda), se a demanda tem um aprovado
  vigente **e atualizado** (o que permite gerar) e está numa das origens de `decisao_arquivada` (`nova`, `em_analise`,
  `aguardando_informacao`, `pronta_para_decisao`), ela vai para **`aprovada`**, e não para `encerrada`.
- A mudança é do ator `sistema`, com o `status_alterado` de sempre.
- Sem aprovado vigente, o comportamento é o de hoje: `encerrada`.
- Com a demanda fora dessas origens, nada muda, como hoje (por exemplo, já em `aprovada` ou em `em_construcao`).
- Devolver não muda: continua levando a `em_analise`.
- O v1 continua gerando o Pedido de Construção.
- Com o vigente desatualizado, vale a Pendência 1.
- A dica da T11 sob o botão Arquivar diz a consequência certa em cada caso, com texto da `ux-ui-design`. O RF-05 trata
  o texto.

Critérios de aceite:
- CA-03.1. **Dado** uma demanda em `pronta_para_decisao`, com o v1 aprovado e atualizado e o v2 pendente, **quando** a
  pessoa arquiva o v2, **então** a demanda fica em `aprovada`, e o histórico mostra o `status_alterado` de
  `pronta_para_decisao` para `aprovada` pelo Sistema.
- CA-03.2. **Dado** o estado final do CA-03.1, **quando** a pessoa gera o pedido do v1, **então** o pedido sai (200) e a
  rota do RF-01 responde `vigente` para o v1.
- CA-03.3. **Dado** uma demanda em `pronta_para_decisao` sem nenhum DEC aprovado e com o v1 pendente, **quando** a pessoa
  arquiva o v1, **então** a demanda fica em `encerrada`, como hoje. Este é o outro sentido pedido no RSK.
- CA-03.4. **Dado** o v1 aprovado e o v2 pendente, com a demanda em `pronta_para_decisao`, **quando** a pessoa devolve
  o v2, **então** a demanda fica em `em_analise`, como hoje.
- CA-03.5. **Dado** o v1 `cto_e_administradora` aprovado e o v2 `cto` pendente (aprovação recusada pelo S-01), **quando**
  a pessoa arquiva o v2, **então** a demanda fica em `aprovada` e o v1 continua gerando.
- CA-03.6. **Dado** a T11 de um DEC pendente numa demanda com aprovado vigente e atualizado, **quando** a tela abre,
  **então** a dica do Arquivar diz que a demanda volta para Aprovada. Sem vigente, a dica de hoje continua.

**RF-04 — Estabilizar o caso C-27 de `src/lib/deps-qa.test.ts`.**
Regra de negócio:
- Achar e registrar a causa da falha intermitente.
- Corrigir sem retirar nem enfraquecer asserção: continua exigindo `['orquestrador_app']` como a única lista de
  `usename` no banco do teste, `config.databaseUrl` igual à URL do app e a URL do migrator ausente da configuração.
- A causa vai para o CHANGELOG.
- Hipóteses a conferir pelo engenheiro, nenhuma confirmada nesta etapa:
  - uma sessão ainda em autenticação, com `usename` nulo, contada pelo `distinct` enquanto a fila ou o pool abrem
    conexões;
  - uma conexão de outra origem no mesmo banco no momento da consulta.

Critérios de aceite:
- CA-04.1. **Dado** o arquivo corrigido, **quando** o caso roda 20 vezes seguidas (forma e lugar na Pendência 5),
  **então** as 20 passam, e a entrega registra cada execução.
- CA-04.2. **Dado** o diff do arquivo, **quando** se contam as linhas com `expect(`, **então** a contagem não diminui, e
  nenhuma das três asserções do caso foi trocada por outra mais fraca (por exemplo, `toContain` no lugar de `toEqual`, ou
  filtro na consulta que esconda outro papel).
- CA-04.3. **Dado** um ambiente em que o código passe a conectar com o papel do migrator, **quando** o caso roda, **então**
  ele falha. É a prova de que a correção não mascara o problema real.
- CA-04.4. **Dado** o CHANGELOG da 0.4.1, **quando** se lê a seção do C-27, **então** ela traz a causa encontrada e a
  correção.

**RF-05 — Textos da T11 e das mensagens revistos pela `ux-ui-design`.**
Regra de negócio:
- A `ux-ui-design` revê e fixa os textos escritos na triagem e na correção da 0.1.13, mais o texto novo deste pedido:
  - o selo "Substituído", o aviso e o link "Abrir <id>" do substituído (`TEXTOS_DECISAO.substituido` e
    `abrirSubstituto`, `SELO_SUBSTITUIDO`);
  - o 409 do substituído (`MENSAGENS_PEDIDO.substituido`);
  - a frase do histórico (`pacote_decisao_substituido`);
  - a linha 6 da orientação do 422 (`dados-do-pedido.ts:54`);
  - o 409 do S-01 (`MENSAGENS_DECISAO.nivelMenorQueOVigente`);
  - a dica do Arquivar com aprovado vigente (RF-03).
- O texto é dela. O código só troca as constantes.
- Os ids continuam só no formato de DEC, e nenhum texto leva nome de pessoa (C-30).

Critérios de aceite:
- CA-05.1. **Dado** a entrega `03-ux-ui-design.md`, **quando** se comparam as constantes do código com ela, **então** cada
  um dos seis textos é igual ao da entrega, e os testes que conferem esses textos usam o texto novo.
- CA-05.2. **Dado** a T11 e a T05 nos estados do substituído, **quando** o axe roda em 1280 × 720 e em 390 × 844,
  **então** não há violação.

**RF-06 — Os três avisos que faltam na T11.**
Regra de negócio: a T11 mostra, só quando a condição vale, e com o texto da `ux-ui-design`:
- **(a)** no DEC **pendente** (sem decisão; inclui o `cto_e_administradora` com uma das duas aprovações) numa demanda
  com aprovado vigente: aprová-lo substitui o vigente, que deixa de gerar o Pedido de Construção. O aviso cita o id do
  vigente.
- **(b)** no DEC **aprovado vigente** quando a demanda tem DEC mais novo pendente: há um pacote mais novo pendente, e
  aprová-lo substitui este. O aviso cita o id do pendente, com link para a T11 dele.
- **(c)** no DEC pendente de nível **`cto`** cujo aprovado vigente é **`cto_e_administradora`**: a aprovação será recusada
  (S-01), e a saída é devolver, arquivar ou criar um pacote com dupla aprovação.

Em (c), não aparece (a). Os avisos só informam: não habilitam nem escondem botão. A regra que vale é a do servidor.

Critérios de aceite:
- CA-06.1. **Dado** o v1 aprovado vigente e o v2 `cto_e_administradora` pendente, **quando** a pessoa abre a T11 do v2,
  **então** o aviso (a) aparece com o id do v1, e o (c) não aparece.
- CA-06.2. **Dado** o mesmo estado, **quando** a pessoa abre a T11 do v1, **então** o aviso (b) aparece com o id e o link
  do v2.
- CA-06.3. **Dado** o v1 `cto_e_administradora` aprovado vigente e o v2 `cto` pendente, **quando** a pessoa abre a T11 do
  v2, **então** o aviso (c) aparece, e o (a) não.
- CA-06.4. **Dado** uma demanda sem aprovado vigente, ou com o DEC aberto já decidido, **quando** a T11 abre, **então**
  nenhum dos três avisos aparece.
- CA-06.5. **Dado** os três estados, **quando** o e2e roda, **então** cada aviso aparece com o texto exato da
  `ux-ui-design` e o axe não tem violação nas duas larguras.

**RF-07 — A fila lê uma linha de andamento por demanda da página (B-08-1).**
Regra de negócio:
- `andamentosDasDemandas` devolve, para cada demanda pedida, a linha de andamento de maior `id`. O resultado é o mesmo
  de hoje, mas a consulta lê no máximo uma linha de `andamento_construcao` por demanda, pelo índice
  `andamento_construcao_demanda_id_idx` (LATERAL com `ORDER BY id DESC LIMIT 1`, ou equivalente).
- Continua uma consulta só por página. A lista vazia não consulta.
- O teste de plano passa a exigir que não haja nó `Sort` com `andamento_construcao` abaixo dele, e mantém as duas
  asserções de hoje (o índice no plano e nenhum `Seq Scan`).

Critérios de aceite:
- CA-07.1. **Dado** demandas com várias linhas de andamento, inclusive com `gravado_em` empatado, **quando** a fila lê a
  página, **então** o mapa traz exatamente a linha de maior `id` de cada uma, igual ao da 0.4.0. Os testes de resultado
  existentes passam sem mudar.
- CA-07.2. **Dado** o plano da consulta gerada pela função (`explain (format json)`), **quando** o teste o percorre,
  **então** ele contém `andamento_construcao_demanda_id_idx`, não contém `Seq Scan` em `andamento_construcao` e não
  contém nó `Sort` sobre `andamento_construcao`.
- CA-07.3. **Dado** uma página com 2 demandas e 50 linhas de andamento por demanda, **quando** se roda
  `explain (analyze, format json)`, **então** as linhas lidas de `andamento_construcao` são no máximo 2.

**RF-08 — `registrar-qa.test.ts` e os testes de segurança no piso de asserções (B-08-2).**
Regra de negócio:
- `src/modules/andamento/registrar-qa.test.ts` entra no `PISO` de `test/estatico/piso-de-assercoes.test.ts` com a
  contagem atual de linhas com `expect(`, e um comentário de origem no padrão do arquivo.
- A `qa-automacao` confere os testes de segurança da 0.3.0, da 0.3.1 e da 0.4.0 que ficaram fora do piso e acrescenta
  os que forem de segurança, cada um com a contagem atual. O critério é o do CV-20 e do D-17: o teste cobre controle de
  acesso, visibilidade, 404 sem oráculo, sentinela de log ou de dado pessoal, prazo total ou imutabilidade.
- O piso só sobe: nenhum valor existente diminui.

Critérios de aceite:
- CA-08.1. **Dado** o `PISO`, **quando** o teste roda, **então** há a entrada de `registrar-qa.test.ts` com valor igual à
  contagem do arquivo nesta versão (hoje, 69 pela revisão do 0017; vale a recontagem).
- CA-08.2. **Dado** a lista de candidatos da Pendência 7, **quando** a `qa-automacao` entrega, **então** cada candidato
  está no `PISO` ou tem uma linha de razão por que não é teste de segurança.
- CA-08.3. **Dado** o diff do `PISO`, **quando** se comparam os valores com os da 0.4.0, **então** nenhum diminuiu e
  nenhuma entrada saiu.

**RF-09 — Spec do sistema atualizada.**
Regra de negócio: a spec `docs/superpowers/specs/2026-10-25-ws-orquestrador-demandas-design.md` passa a trazer, como
critérios escritos e não só na linha-resumo:
- a A-02 revista (a aprovação completa do mais novo substitui o vigente; a primeira aprovação da dupla não substitui) e
  a regra de nível do S-01, no RF-13;
- os CA-22.x revistos (CA-22.4: só o aprovado vigente gera, o substituído dá 409) e o D1 com o nome da criação (RF-02),
  no RF-22;
- a regra do arquivamento com aprovado vigente (RF-03), no RF-07;
- a rota de situação (RF-01) onde a spec lista as rotas do `/construir`. O arquiteto define se é nesta spec ou na
  spec das integrações (`2026-11-11-...-integracoes-design.md`).

Critérios de aceite:
- CA-09.1. **Dado** a spec atualizada, **quando** se procuram RF-07, RF-13 e RF-22, **então** cada um tem os critérios
  acima em Dado/Quando/Então ou em frase verificável, e o texto não contradiz o código nem o manual da 0.4.1.

**RF-10 — Documentação e versão.**
Regra de negócio:
- `package.json` em 0.4.1.
- CHANGELOG 0.4.1 com o que mudou, a causa do C-27, as verificações e as pendências. A pendência S-02 a S-04 da 0.1.13 é
  marcada como fechada, com o limite que sobrar.
- Manual cap. 04: substituição, regra de uso do S-02 revista, S-03 e S-04, e "Limite conhecido".
- Manual cap. 08: T11 com os avisos e a dica.
- Manual cap. 03 (RF-07), 05 (D1 e rota de situação), 09 (referência da rota nova) e 02 (matriz com 25 ações), e o
  `docs/operacao/tokens-de-integracao.md` (o que o token `construir` lê).
- Glossário com "situação do pedido" (Pendência 3).

Critérios de aceite:
- CA-10.1. **Dado** o repositório no fim do pedido, **quando** se lê `package.json`, **então** a versão é 0.4.1, e o teste
  estático de versão passa.
- CA-10.2. **Dado** o manual, **quando** se procura a rota de situação e a regra do arquivamento, **então** ambas estão
  descritas nos capítulos acima, sem texto que ainda diga que arquivar o v2 sempre encerra a demanda.

### 3. Requisitos não funcionais

| ID | Requisito (número) | Como se verifica |
|---|---|---|
| RNF-01 | Rota de situação: p95 ≤ 500 ms em 50 chamadas seguidas na homologação, com o seed fictício | Medida na 09 ou pelo maestro |
| RNF-02 | Rota de situação: prazo total de 8 s (orçamento `padrao` das integrações), com 503 `indisponivel` sem gravar nada | CA-01.6, relógio falso |
| RNF-03 | Rota de situação: corpo de 200 com 1 chave e 2 valores possíveis; 404 com corpo idêntico nos 3 casos do CA-01.3 | Teste de igualdade de bytes |
| RNF-04 | Rota de situação: 0 gravações em banco por chamada; 1 linha de log por requisição (C-21) | CA-01.5 |
| RNF-05 | Fila `/demandas`: p95 < 500 ms (RNF-03 do sistema) com 5.000 demandas e 6.000 linhas de andamento, medido antes e depois do RF-07 | Teste de desempenho ou medição na homologação |
| RNF-06 | C-27: 20 execuções seguidas sem falha; 0 asserção retirada | CA-04.1, CA-04.2 |
| RNF-07 | Matriz: o `construir` com exatamente 5 ações, o `awave` com 2; pessoa e agentes sem mudança | Teste de pares exatos da matriz |
| RNF-08 | Migration: 0 prevista. Se o RF-02 pedir coluna, 1 migration gerada e só aditiva, com o ensaio de rollback aprovado e `alteram_dado` explicado na entrega | Ensaio de rollback |
| RNF-09 | O nome do solicitante (atual ou da criação) aparece 0 vezes em log, Sentry, evento e mensagem de erro | Sentinela, CA-02.5 |
| RNF-10 | Axe com 0 violação na T11 nos estados novos (avisos a, b, c e a dica do Arquivar), em 1280 × 720 e 390 × 844 | e2e |
| RNF-11 | `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes; `pnpm test:e2e` verde em 3 execuções seguidas | Definição de pronto |
| RNF-12 | Textos em pt-BR | Revisão da `ux-ui-design` |

### 4. Fora do escopo

- O lado do `/construir` do S-02: a `00-inicio` parar com DEC substituído e o envio de andamento avisar Fabiano por
  e-mail (ESP, item 1). Por isso, o critério 2 do insumo ("O `/construir` não inicia...; Fabiano recebe um e-mail uma
  vez") não está nos critérios do pedido nem nesta matriz.
- O `/construir` cancelar sozinho uma construção em curso.
- (10) O envio do andamento sem rodar git na pasta dos agentes: ferramenta da estruturaAutonoma, da outra frente.
- A rota de situação dizer o status da demanda, o id do substituto, `encerrada` ou `entregue`, ou qualquer valor além de
  `vigente` e `substituido`.
- Evento no histórico por consulta de situação, e limite de taxa na rota nova. Nenhum dos dois foi pedido, e as
  leituras do `/construir` da 0.3.0 também não têm.
- EXP-01 da 0.4.0: a fila e o Awave esconderem o andamento de DEC substituído. É decisão de produto ainda aberta.
- As dívidas da 0.4.0 que não estão na ESP:
  - o comentário de `leitura.test.ts:244`;
  - os casos sem os dois CHECK;
  - os títulos que dizem "seis chaves" e o `a === null`;
  - a lista de status escrita à mão e a guarda das importações;
  - o ramo morto de `SecaoAndamento.tsx`;
  - a asserção de `andamento-construir.spec.ts:288`.
- Também fora, por não estarem na ESP: a observação de `opcoesDeStatus` e `temPacoteAprovadoAtualizado` da 0.1.13; os
  B-4 a B-7 da 0.3.0; o O-1 a O-3 e os códigos 6 a 10 da 0.3.1; o R-01 a R-11 da 0.2.0; as capturas do cap. 08.
- A instabilidade de tempo conhecida em outros arquivos (`scripts.test.ts` T33, `leitura.test.ts`, `saude/route.test.ts`,
  `resumo-da-fila`, `minimizar`). Só o C-27 está no pedido.
- Deploy, migration em produção, emissão ou troca de token e a P-04.

### 5. Matriz de rastreabilidade

**Critério preliminar do pedido → RF → CA**

| # | Critério preliminar | RF | CA |
|---|---|---|---|
| 1 | Token construir lê `vigente` de DEC com pedido gerado e `substituido` depois que um DEC mais novo é aprovado; sem pedido gerado 404; outro ator 403 | RF-01 | CA-01.1, CA-01.2, CA-01.3, CA-01.4 |
| 2 | DEC recusado pelo D1 continua recusado depois de trocar o `solicitanteNome` | RF-02 | CA-02.1, CA-02.2, CA-02.3 |
| 3 | Com o v1 aprovado e o v2 pendente, arquivar o v2 deixa a demanda em `aprovada` e o v1 gera o pedido | RF-03 | CA-03.1, CA-03.2 (outro sentido: CA-03.3) |
| 4 | O caso C-27 passa 20 vezes seguidas sem asserção retirada | RF-04 | CA-04.1, CA-04.2 |
| 5 | Os três avisos novos aparecem nas telas da T11 com os textos da `ux-ui-design` | RF-06 (texto: RF-05) | CA-06.1 a CA-06.5 |
| 6 | A fila lê uma linha de andamento por demanda da página, provado pelo plano sem Sort sobre `andamento_construcao` | RF-07 | CA-07.2, CA-07.3 (resultado: CA-07.1) |
| 7 | `registrar-qa.test.ts` está no PISO de asserções com a contagem atual | RF-08 | CA-08.1 (conferência: CA-08.2, CA-08.3) |

**Item da ESP → RF**

| Item da ESP | RF |
|---|---|
| (1) S-02 | RF-01 |
| (2) S-03 | RF-02 |
| (3) S-04 | RF-03 |
| (4) C-27 | RF-04 |
| (5) Textos da T11 | RF-05, RF-06 |
| (6) Spec | RF-09 |
| (7) CHANGELOG, `package.json`, manual | RF-10 |
| (8) B-08-1 | RF-07 |
| (9) B-08-2 | RF-08 |
| (10) Envio sem git | Fora do escopo |

**Definição de pronto → RNF/RF:** testes, lint e typecheck → RNF-11; e2e 3× → RNF-11; ensaio de rollback → RNF-08;
manual e spec → RF-09, RF-10; CHANGELOG e versão → RF-10.

### 6. Glossário do pedido

- **Aprovado vigente:** o DEC de maior `versao` da demanda com decisão `aprovada`. É o único que gera o Pedido de
  Construção.
- **Substituído:** DEC com decisão `aprovada` que não é o vigente. O `statusDecisao` dele continua `aprovada`.
- **Situação do pedido (rota nova):** `vigente` ou `substituido`, a vigência do DEC de um Pedido de Construção gerado.
  **Não confundir** com a "situação da construção" da 0.4.0 (Em andamento, Concluída, Cancelada; `statusConstrucao`),
  nem com o status da demanda (Pendência 3).
- **D1:** a conferência do nome do solicitante nos textos escritos por pessoa, na geração e na entrega do pedido (0013).
- **Nome em vigor na criação do DEC:** o `solicitanteNome` da demanda no momento em que o DEC foi gravado.

## Decisões tomadas

- Na rota nova, "vigente" segue a definição do envio de andamento da 0.4.0 (`aprovadoVigente`). Assim, a rota e o 409
  do andamento nunca dão respostas diferentes para o mesmo DEC.
- O 404 da rota nova segue o AN-03 da 0.4.0, que só reconhece o pedido gerado por pessoa na demanda do próprio DEC. O
  pedido escrito direto recebe o mesmo 404, como no andamento (A3).
- A rota nova não grava evento: ela é chamada a cada volta do envio, e um evento por chamada encheria o histórico. O RSK
  limita a rota a um enum sem texto.
- No RF-03, o vigente precisa estar "atualizado" para a demanda voltar a `aprovada`. Isso segue o critério 3 ("e o v1
  gera o pedido") e a regra da transição manual para `aprovada` (`temPacoteAprovadoAtualizado`). O caso do vigente
  desatualizado vai para a Pendência 1, sem inventar outro destino.
- A dica do Arquivar entra no RF-03 e no RF-05: depois da mudança, o texto de hoje ("vai para Encerrada") ficaria falso
  na tela.
- Os capítulos 02, 03, 05 e 09 do manual entraram além do 04 e do 08 pedidos: a rota e a transição nova mudam o que
  eles descrevem. Isso não contradiz a ESP.
- B-08-2 vai além do arquivo nomeado e confere os outros testes de segurança, como pede o item (9). Já foram achados
  candidatos fora do piso (Pendência 7).
- O status é `pronto`: as pendências abaixo têm um padrão provisório que não afrouxa controle, e nenhuma impede a etapa
  02. A 1 e a 2 são para a Parada 1.

## Pendências

1. **Para Fabiano ou `desenvolvimento-produto` (Parada 1), S-04 com o vigente desatualizado.**
   - O caso: o v1 aprovado ficou desatualizado (ESP ou RSK mais nova depois dele), a demanda está numa das origens e a
     pessoa arquiva o v2.
   - Para onde vai a demanda? Ela não pode ir a `aprovada` sem quebrar a regra da transição manual, e o v1 não gera
     (409 desatualizado).
   - Padrão provisório: o de hoje, `encerrada`.
   - Recomendação: `em_analise`, como o Devolver, porque a demanda ainda tem trabalho e não fica num status final.
2. **Para `arquiteto-solucoes` (02) e `seguranca-aplicacao` (04), S-03 nos DEC já criados e a cópia do nome.**
   - O nome em vigor na criação não é recuperável para os DEC anteriores a esta versão: o DEC não o copia, e o histórico
     não guarda o valor.
   - Opções:
     - (a) o DEC sem registro confere só o nome atual, como hoje, com o limite registrado no manual;
     - (b) preencher com o nome atual na migration (o ensaio pode marcar `alteram_dado`).
   - Recomendação: (a).
   - Guardar o nome numa tabela só de inclusão cria mais uma cópia de dado pessoal. A etapa 04 define a base legal, a
     retenção e o expurgo (padrão técnico, §6), ou escolhe uma forma que não guarde o nome em claro.
3. **Para `ux-ui-design` e `documentacao-tecnica`, termo "situação".** A ESP fixa a chave `situacao` na rota nova, e a
   0.4.0 já usa "situação" para a situação da construção. O glossário e os textos de tela precisam separar os dois. A
   chave da API fica como está.
4. **Para `arquiteto-solucoes`, DEC vigente em demanda encerrada ou entregue.** A rota responde `vigente`, porque o enum
   da ESP tem só dois valores. O `/construir` só sabe do status final pelo 409 `statusFinal` do andamento. Registrar o
   limite no manual. Se o produto quiser um terceiro valor, é pedido novo.
5. **Para `tech-lead`, `qa-automacao` e o maestro, prova do C-27.**
   - Definir onde rodam as 20 execuções seguidas (local, CI ou homologação) e com que carga. A falha original foi no CI,
     com a suíte inteira, e 20 execuções isoladas podem não reproduzir a corrida.
   - Sugestão: 20 execuções do arquivo com o mesmo paralelismo de workers do CI, mais as rodadas completas da definição
     de pronto.
   - Se o comando não estiver na lista Pode da etapa, o maestro libera.
6. **Para o Orquestrador, lado do `/construir` do S-02.** A `00-inicio` e o aviso por e-mail ficam com a frente da
   estruturaAutonoma. Eles dependem da rota deste pedido estar no ar e do token `construir` emitido.
7. **Para `qa-automacao`, candidatos ao PISO (B-08-2)**, todos fora dele na 0.4.0. Foram achados por nome e não são uma
   lista fechada:
   - `src/modules/acesso/matriz-integracoes.test.ts` e `-qa`, `ramos-por-ator.test.ts` e `-qa`,
     `tokens-integracao.test.ts`, `-qa` e `-corrompido`;
   - `test/matriz-rotas-integracoes-qa.test.ts`;
   - `src/app/api/pedidos-construcao/entrega.test.ts`, `entrega-qa`, `recebimento.test.ts`, `recebimento-qa`,
     `log-das-integracoes.test.ts` e `saidas-das-integracoes-qa.test.ts`;
   - `src/modules/pedido-construcao/recebimento-0019.test.ts`;
   - `src/app/api/demandas/visibilidade-agente-0019.test.ts`, `criacao-awave-0019.test.ts` e
     `src/app/api/pacotes-decisao/visibilidade-0019.test.ts`;
   - `src/modules/demandas/confirmacao-0019.test.ts` e `autor-desconhecido-0019.test.ts`;
   - `src/modules/integracoes/prazo-total-0019.test.ts`;
   - `src/modules/limites-integracao.test.ts` e `-qa`;
   - `src/db/schema/integracao.test.ts` e `-qa`;
   - `src/modules/historico/consultas-integracao.test.ts` e `-qa`;
   - `test/estatico/trace-e2e.test.ts`;
   - `e2e/integracoes.spec.ts` e `-qa`.
8. **Para `qa-automacao` e `tech-lead`, testes que mudam de sentido (aprovado de antemão pela S1).**
   - Mudam: os testes que esperam `encerrada` ao arquivar o mais novo **com** aprovado vigente atualizado, a dica do
     Arquivar e os pares exatos da matriz (4 → 5 ações do `construir`). Cada um fica registrado como mudança aprovada,
     com a regra nova no lugar.
   - Não mudam: os que arquivam **sem** vigente.
9. Versão: a ESP diz 0.4.1. Uma rota nova poderia pedir 0.5.0 pela convenção de versão; vale a ESP, salvo decisão de
   Fabiano.
10. O texto do `pedido.json` não trouxe nenhuma instrução para fora do escopo. Nada a registrar.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] todo item de `criterios_aceite_preliminares` do pedido aparece na matriz
- [x] todo RF tem ao menos um critério Dado/Quando/Então verificável
- [x] nenhum requisito contradiz a especificação (ESP) ou o parecer de risco (RSK) do pedido
- [x] o que fica fora do escopo está listado
- [x] o texto não tem dado pessoal real, segredo nem valor de `.env`
