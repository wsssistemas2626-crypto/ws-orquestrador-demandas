---
pedido: DEC-DEM-20261104-0011-v1
etapa: 04-regressao
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, "git show f5b363b (código e testes da correção)", src/modules/dados-pessoais/minimizar.ts, src/modules/agentes/entrada-agente.ts, src/modules/acesso/tokens-servico.ts, src/app/api/demandas/nomes-antes-de-gravar.test.ts, src/app/api/vistas-para-agente.test.ts, src/app/api/demandas/demandas.test.ts, src/modules/agentes/entrada-agente.test.ts, src/app/api/pacotes-decisao/pedido.test.ts, src/modules/dados-pessoais/minimizar.test.ts, test/transversal/sentinelas.test.ts (360-450), e2e/nova-demanda.spec.ts, e2e/demanda-formularios-qa.spec.ts, playwright.config.ts]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Regressão da correção `f5b363b` (0.1.10). A correção passa em tudo. Acrescentei 26 testes, todos com nomes fictícios,
para cobrir o que o maestro pediu: a pessoa e o Pedido de Construção continuam com o texto original, e as palavras
comuns em minúscula iguais a uma parte do nome continuam no texto, agora também nos caminhos de integração (entrada dos
quatro agentes, vistas de ESP, RSK e DEC, GET e POST de demanda, Pedido gravado pelo caminho do agente). Antes eles só
estavam cobertos no teste unitário de `minimizar`. Nenhum teste existente mudou: o `git diff` só tem linhas acrescentadas
(357 inserções, 0 remoções, 5 arquivos `*.test.ts`).

### Cada defeito da 01 e o teste que o reproduz (falha na base `fb675ee`, passa na `f5b363b`)

| Defeito (01) | Teste que reproduz | Arquivo |
|---|---|---|
| D-1, parte do nome sai em claro (unidade) | `M-1 do 0009: cada parte do nome > nome %j, texto %j` (24 casos) e `vários nomes: todos os nomes completos antes das partes...` | `src/modules/dados-pessoais/minimizar.test.ts` (engenheiro; visto falhando na 03: 34 de 104) |
| D-1, API de quem não é pessoa | `M-1 do 0009: "a Joana pediu" sai com o marcador para o agente, e original para a pessoa` | `src/app/api/demandas/demandas.test.ts` (engenheiro) |
| D-1, entrada do worker | `M-1 do 0009: parte do nome do solicitante na entrada do agente > insumo_tecnico: ...` e `> orquestrador: ...` | `src/modules/agentes/entrada-agente.test.ts` (engenheiro) |
| D-1, vistas mínimas de ESP, RSK e DEC (GET e 201) | `M-1 do 0009 (04-regressao do 0011): parte do nome, palavra comum e partícula nas vistas de ESP, RSK e DEC > 201 dos três POST do agente...` e `> agente, nas sete leituras...` | `src/app/api/vistas-para-agente.test.ts` (**novo**, nesta etapa) |
| D-2, dica e aviso | `textos da 03, T04 e T06 > alertas de modo, aviso de minimização e dicas`, `M-1 do 0009 (D-2): nem a dica do nome nem o aviso dizem que o nome nunca chega ao agente`; `formularios.test.ts` (dica e aviso no HTML) | `src/components/dados-da-demanda.test.ts`, `src/app/(painel)/demandas/nova/formularios.test.ts` (engenheiro; 4 falhas na base) |
| D-3, 201 com o nome lido antes da trava | `B-3 do 0010: os nomes do 201 vêm da linha travada > POST de %s pelo agente com renomeação na espera da trava...` (ESP, RSK, DEC); `o POST não chama nomesDaDemanda e chama nomesDoSolicitante uma vez...`; `B-3 do 0009 e do 0010: falha ao tirar os nomes da linha travada não grava nada` (6 casos) | `src/app/api/demandas/nomes-antes-de-gravar.test.ts` (engenheiro; 11 falhas na base) |
| D-4, `name` não string ou que muda | `B-2 do 0010: name que não é texto, ou que muda entre leituras, vira Error` (7 casos) e `B-2 do 0010: o título do Sentry não usa name que muda nem name que não é texto` (2 casos) | `src/lib/reduzir-erro.test.ts`, `src/lib/sentry.test.ts` (engenheiro) |
| D-5, marca antes do envio | `B-4 do 0010: a marca de enviado vem depois do envio > a primeira chamada lança e não envia; a segunda envia um evento só` | `src/lib/sentry.test.ts` (engenheiro) |

### Critérios de aceite do pedido e o teste que cobre cada um

1. **Primeiro nome e sobrenome com inicial maiúscula saem como marcador no worker e na API**: os testes do D-1 acima,
   mais os novos `M-1 do 0009 (04-regressao do 0011): palavra comum em minúscula e partícula ficam na entrada do agente`
   (`insumo_tecnico`, `risco`, `consolidacao` e `orquestrador`, em `entrada-agente.test.ts`), o bloco novo das vistas
   (`vistas-para-agente.test.ts`) e `M-1 do 0009 (04-regressao do 0011): palavra comum em minúscula e partícula ficam`
   (GET da demanda, listagem e 201 do orquestrador, em `demandas.test.ts`).
2. **Partículas e palavras comuns em minúscula ficam**: unidade, nos casos da 01 e da 02 (`30 dias`, `suco de lima`,
   `camisa rosa`, `os campos`, `dos`) e no bloco novo `M-1 do 0009 (04-regressao do 0011): bordas das partes do nome`
   (`minimizar.test.ts`). Integração, nos quatro blocos novos acima: os valores exatos de cada campo para o agente
   (`toBe`/`toMatchObject` com o texto esperado inteiro) e o trecho `os dados dos clientes em 30 dias; camisa rosa e os
   campos do formulário` presente.
3. **A pessoa e o Pedido de Construção continuam com o texto original**:
   - pessoa, demanda: `M-1 do 0009: "a Joana pediu" ...` (engenheiro) e `GET da demanda e listagem: o agente recebe as
     partes trocadas e as palavras comuns; a pessoa, o original` (novo, com os seis campos, `duvidasEntrada`,
     `solicitanteNome` e o título da listagem);
   - pessoa, ESP, RSK e DEC: `pessoa, nas sete leituras: o texto original que o agente mandou, sem marcador` (novo; o
     texto foi gravado pelos agentes nas rotas, cujo 201 sai minimizado, e a pessoa lê o original nas sete leituras);
   - banco: `POST /api/demandas pelo orquestrador: o 201 sai com as partes trocadas e as palavras comuns; o banco guarda o
     original` e `o banco guarda o texto original: a minimização só existe na entrada montada` (novos);
   - Pedido de Construção: `M-1 do 0009: com "A Joana pediu" no texto, o pedido leva o original, sem marcador`
     (engenheiro, artefatos da pessoa) e `M-1 do 0009 (04-regressao do 0011): ESP e RSK gravados pelos agentes nas rotas;
     o 201 vem minimizado e o pedido leva o original` (novo, `pedido.test.ts`: o mesmo texto sai minimizado no 201 do
     agente e original no Pedido, sem nenhum `[nome removido]`).
4. **Dica e aviso não prometem mais do que o sistema faz**: testes do D-2 acima. Nenhum e2e conferia as frases antigas
   (lidos `nova-demanda.spec.ts` e `demanda-formularios-qa.spec.ts`; a suíte e2e passou sem ajuste).
5. **Nomes do 201 da demanda travada; `reduzirErro` ignora `name` que não é texto; erro marcado só depois do envio**:
   testes do D-3, D-4 e D-5 acima.
6. **e2e três vezes seguidas**: 143 de 143 nas três rodadas (5,9 min, 5,1 min e 5,6 min).

### Testes acrescentados nesta etapa (26)

- `src/modules/dados-pessoais/minimizar.test.ts`, bloco `M-1 do 0009 (04-regressao do 0011): bordas das partes do nome`
  (15): nome digitado em minúscula (`joana ficticia`) e em maiúscula (`ANA FICTICIA`) no campo; partícula com maiúscula
  (`Van Der Berg`, `De acordo`, `DOS SANTOS`); pontuação como borda; número e `_` colados não casam; `jOANA` fica;
  nome completo com `\n\t` entre os pedaços; inicial com ponto (`Maria J. Ficticia`); hífen (`Ana-Clara` vira
  `[nome removido]-[nome removido]`); parte que é começo de outra (`Ana`/`Anabela`); NFD com maiúscula acentuada; palavras
  comuns com dois nomes na lista; sem nome não troca nada. Todos com idempotência.
- `src/modules/agentes/entrada-agente.test.ts`, bloco `M-1 do 0009 (04-regressao do 0011): palavra comum em minúscula e
  partícula ficam na entrada do agente` (5): `insumo_tecnico`, `risco`, `consolidacao`, `orquestrador` e o banco com o
  original.
- `src/app/api/vistas-para-agente.test.ts`, bloco `M-1 do 0009 (04-regressao do 0011): parte do nome, palavra comum e
  partícula nas vistas de ESP, RSK e DEC` (3): 201 dos três POST do agente, sete leituras do agente, sete leituras da pessoa.
- `src/app/api/demandas/demandas.test.ts`, bloco `M-1 do 0009 (04-regressao do 0011): palavra comum em minúscula e
  partícula ficam` (2): GET e listagem pelos dois atores; 201 do orquestrador e o banco.
- `src/app/api/pacotes-decisao/pedido.test.ts` (1): o Pedido com ESP e RSK gravados pelos agentes nas rotas.

Esses testes também falhariam na base `fb675ee`: lá só o nome completo era trocado, e nenhum dos textos novos tem o nome
completo. Não rodei os testes na base porque `git checkout` não está na minha lista **Pode**. A falha na base dos testes
do engenheiro está na 03, com o comando e um trecho da saída.

### Resultado

- `pnpm test`: **4081 testes, 0 falhas, 0 erros** (relatório JUnit). São os 4055 da 03 mais os 26 desta etapa.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo (rodados depois da última edição).
- `pnpm test:e2e`: **143 de 143, três vezes seguidas**.

## Decisões tomadas

- Cobri os critérios 2 e 3 também na integração, pelos quatro agentes, pelas sete leituras e pelo Pedido: o maestro pediu
  conferência cuidadosa, e até aqui só o teste unitário segurava a palavra comum em minúscula.
- No bloco das vistas, a busca da parte do nome é por palavra inteira (`(?<!\p{L})Campos(?!\p{L})`): a primeira versão
  acusou `Campos` dentro da chave `dadosCamposCriticos` da ESP, um falso positivo do teste e não um defeito. Os valores
  exatos de cada campo continuam conferidos com `toBe`/`toMatchObject`.
- A verificação de texto das vistas olha só a demanda do bloco (`desta(r)`), e não a fila inteira: os DEC dos outros
  blocos do arquivo deixariam o teste dependente de ordem.
- Cada bloco novo cria os próprios tokens e a própria demanda no `beforeAll`: nenhum depende de outro bloco ter rodado
  antes. Nenhum usa relógio real nem espera de tempo.
- No Pedido pelo caminho do agente, a decisão marca `revisouRascunhosDeAgente: true`, como a regra exige para DEC que cita
  rascunho de agente. É uma exigência do domínio, não um afrouxamento.
- O ajuste do engenheiro em `test/transversal/sentinelas.test.ts:430` foi conferido e não afrouxa nada: a ausência do
  sentinela nas saídas segue nas linhas 408-412 (`contemSentinela`), e a asserção nova (`-TEXTO-7f3a` fora de todas as
  saídas) mantém o teste com conteúdo.
- Não classifiquei como flaky o teste de tempo do engenheiro (`tempo: ... em menos de 1 s`, `performance.now()`): mediu
  47 ms contra um limite de 1 s, e passou nas rodadas. Fica registrado na Pendência 1.

## Pendências

1. Para a `04-revisao` (maestro), só registro, sem bloquear: dois testes do engenheiro olham o relógio real. São
   `minimizar.test.ts` (`tempo: nome de 200 caracteres...`, `performance.now()` < 1 s) e
   `nomes-antes-de-gravar.test.ts` (`esperarTrava`, prazo de segurança de 10 s com `Date.now()`). Os dois têm folga
   grande, e o resultado do segundo não depende do tempo. Numa máquina de CI muito carregada, o primeiro é o candidato a
   ficar instável. Se isso acontecer, aumentar o limite ou mover o teste para `test/desempenho/`.
2. Para a `04-revisao`, comportamento coberto e que vale registrar no CHANGELOG ou no manual: `Ana-Clara` sozinha no texto
   vira `[nome removido]-[nome removido]`, e uma parte em maiúscula dentro de um sentinela (`SENTINELA-TEXTO`) é trocada,
   porque o hífen conta como borda de palavra. Os dois casos seguem a regra da ESP.
3. Herdado da 02 e da 03 (Pendência 2 e 3): um getter de `code` que lança ainda faz `capturarErro` lançar para quem o
   chama. Depois do B-4, o erro deixa de ficar marcado sem ter sido enviado (teste do B-4).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — `f5b363b` no topo do ramo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo `construcao/DEC-DEM-20261104-0011-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f5b363ba11182974c87a129729ae9efda24bbfb1` — 25 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f5b363ba11182974c87a129729ae9efda24bbfb1 -- src/app/api/demandas/demandas.test.ts src/modules/agentes/entrada-agente.test.ts src/app/api/pacotes-decisao/pedido.test.ts` — diff dos testes de integração
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f5b363ba11182974c87a129729ae9efda24bbfb1 -- src/modules/dados-pessoais/minimizar.test.ts` — diff do teste unitário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:e2e/` — lista dos e2e
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api/demandas/` — lista da pasta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show "HEAD:src/app/api/demandas/[id]/"` — lista da pasta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/` — lista da pasta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/transversal/` — lista da pasta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/` — lista da pasta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api/` — lista da pasta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f5b363ba11182974c87a129729ae9efda24bbfb1 -- src/lib/reduzir-erro.ts src/lib/sentry.ts src/components/dados-da-demanda.ts src/modules/especificacoes/servico.ts src/modules/pacotes-decisao/criar.ts src/modules/pareceres-risco/servico.ts` — diff do código
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/acesso/tokens-servico.ts` — vários tokens por agente são aceitos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/qa-04-base.xml` — 4060 testes, 0 falhas (o commit da 03, mais os 5 testes de entrada já gravados durante a rodada)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/agentes/entrada-agente.test.ts src/app/api/vistas-para-agente.test.ts src/app/api/demandas/demandas.test.ts --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/qa-04-novos.xml` — 2 falhas de 135 (falso positivo meu: `Campos` dentro da chave `dadosCamposCriticos`), corrigidas no teste
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/vistas-para-agente.test.ts --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/qa-04-vistas.xml` — 18 de 18
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f5b363ba11182974c87a129729ae9efda24bbfb1 -- src/lib/reduzir-erro.test.ts src/lib/sentry.test.ts src/components/dados-da-demanda.test.ts test/transversal/sentinelas.test.ts test/estatico/projeto.test.ts` — diff dos testes unitários e transversais
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/qa-04-minimizar.xml` — 119 de 119
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pacotes-decisao/pedido.test.ts src/app/api/vistas-para-agente.test.ts src/modules/agentes/entrada-agente.test.ts src/app/api/demandas/demandas.test.ts --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/qa-04-integ.xml` — 1 falha de 155 (o teste novo do Pedido sem `revisouRascunhosDeAgente`), corrigida no teste
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pacotes-decisao/pedido.test.ts -t "04-regressao do 0011" --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/qa-04-pedido.xml` — 1 falha, 19 pulados (lida a causa)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pacotes-decisao/pedido.test.ts --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/qa-04-pedido.xml` — 20 de 20
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/qa-04-final.xml` — 4081 testes, 0 falhas, 0 erros
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f5b363ba11182974c87a129729ae9efda24bbfb1 -- test/estatico/pacote-sem-extras.test.ts src/app/api/demandas/nomes-antes-de-gravar.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts"` — diff dos testes do D-2 e do D-3
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 5 arquivos `*.test.ts`, 357 inserções, 0 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 5 testes (e depois esta entrega)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 143 de 143 (1ª)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 143 de 143 (2ª)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --reporter=dot` — 143 de 143 (3ª)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] (04 regressão) há um teste que reproduz o defeito descrito em `01-qa-funcional.md`
