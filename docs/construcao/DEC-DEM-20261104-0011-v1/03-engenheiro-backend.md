---
pedido: DEC-DEM-20261104-0011-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 01-qa-funcional.md, 02-tech-lead.md, src/lib/reduzir-erro.ts, src/lib/reduzir-erro.test.ts, src/lib/sentry.ts, src/lib/sentry.test.ts, src/modules/dados-pessoais/minimizar.ts, src/modules/dados-pessoais/minimizar.test.ts, src/components/dados-da-demanda.ts, src/components/dados-da-demanda.test.ts, "src/app/(painel)/demandas/nova/formularios.test.ts (50-130)", "src/app/api/demandas/[id]/especificacoes/route.ts", "src/app/api/demandas/[id]/pareceres-risco/route.ts", "src/app/api/demandas/[id]/pacotes-decisao/route.ts", src/modules/especificacoes/servico.ts, src/modules/pareceres-risco/servico.ts, src/modules/pacotes-decisao/criar.ts, src/modules/versoes.ts, src/modules/demandas/consultas.ts (1-30, 180-308), src/app/api/demandas/nomes-antes-de-gravar.test.ts, src/app/api/demandas/demandas.test.ts (1-90, 380-540), src/modules/agentes/entrada-agente.test.ts, src/app/api/pacotes-decisao/pedido.test.ts (250-360), test/estatico/pacote-sem-extras.test.ts, test/estatico/projeto.test.ts (24-35), test/transversal/sentinelas.test.ts (1-60, 400-450), test/sentinelas.ts, test/requisicao.ts, package.json (1-6)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Os cinco defeitos da 02 corrigidos na ordem pedida (D-4, D-5, D-1, D-2, D-3), cada um com o teste escrito antes e visto
falhando na base. Versão `0.1.10` no `package.json`. Sem migration, sem pacote novo (`pnpm-lock.yaml` não mudou).

### Arquivos alterados (código)

- `src/lib/reduzir-erro.ts` (D-4): `e.name` lido uma vez, numa variável `unknown`; a classe só é usada se for texto e passar em `classeAceita`.
- `src/lib/sentry.ts` (D-5): `jaEnviados.add(e)` foi para depois de `Sentry.captureException`; o `has` continua no começo.
- `src/modules/dados-pessoais/minimizar.ts` (D-1): `PARTICULAS_DO_NOME` (lista fechada da 02) e `partesDoNome` exportadas;
  nome completo sem diferença de caixa nem de acento; depois dos nomes completos, uma regex só com todas as partes, em
  alternância da mais longa para a mais curta, trocando só quando o trecho original começa por maiúscula (conferência no
  callback, fora da flag `i`); busca sobre uma cópia do texto dobrada sem mudar o comprimento (NFC vira letra base, marca
  solta de NFD fica), troca na mesma faixa do original, que não é normalizado; nada trocado dentro de marcador.
  Assinaturas de `minimizar` e `minimizarValor` iguais. Comentário do topo com a ordem nova.
- `src/components/dados-da-demanda.ts` (D-2): `dicaNome` e `avisoMinimizacao` com os textos exatos da 02.
- `src/modules/especificacoes/servico.ts`, `src/modules/pareceres-risco/servico.ts`, `src/modules/pacotes-decisao/criar.ts`
  (D-3): núcleo comum não exportado (`criarComNomes`) que devolve `{ vista, nomes }`, com
  `nomes = nomesDoSolicitante(<linha travada>.solicitanteNome)` dentro da transação; `criarX` de hoje com a mesma
  assinatura e o mesmo retorno; `criarEspecificacaoComNomes`, `criarParecerRiscoComNomes` e `criarPacoteDecisaoComNomes`
  com 4 argumentos, sem `t` nem `extras`, como na Interface da 02.
- `src/app/api/demandas/[id]/{especificacoes,pareceres-risco,pacotes-decisao}/route.ts` (D-3): o POST chama
  `criarXComNomes` e não chama mais `nomesDaDemanda`; os GET não mudaram; comentários atualizados.
- `package.json`: `0.1.10`.

### Testes criados ou mudados

- `src/lib/reduzir-erro.test.ts`: bloco "B-2 do 0010" (7 casos): getter que muda (sai o valor conferido), o mesmo com
  `code`, getter que começa fora da regra, `toString` que muda, array, símbolo e número, e "o name é lido uma vez só".
- `src/lib/sentry.test.ts`: bloco "B-2 do 0010" (título sem o nome fictício, com `toString` que muda e com getter) e
  bloco "B-4 do 0010" (getter de `code` que lança: 1ª chamada lança e não envia, 2ª envia um evento, 3ª não envia de novo).
  O teste do B-a do 0008 continua igual e verde.
- `src/modules/dados-pessoais/minimizar.test.ts`: bloco "M-1 do 0009: cada parte do nome" com os 12 casos da tabela da
  01, os 9 da 02 e 3 bordas (nome em NFD, `Júnior` como sufixo, nome completo em NFD), todos com idempotência; texto em
  NFD fora do nome não normalizado; `PARTICULAS_DO_NOME` exata; 9 casos de `partesDoNome` (inclusive
  `'Ana dos Santos Filho'` → `['Ana', 'Santos']`); vários nomes (completos antes das partes); partes `Nome`/`Removido`/
  `Telefone` sem estragar marcador; tempo (nome de 200 caracteres sobre 100.000 caracteres: 47 ms, limite 1 s).
- `src/app/api/demandas/demandas.test.ts`: caso "M-1 do 0009" (GET da demanda e listagem com token de agente com o
  marcador; a pessoa com o original).
- `src/modules/agentes/entrada-agente.test.ts`: bloco "M-1 do 0009" (`insumo_tecnico` por `demanda:<id>` e `orquestrador`
  por `entrada:<uuid>`, sem `Joana` no conteúdo).
- `src/app/api/pacotes-decisao/pedido.test.ts`: contraprova do CA 3 com `A Joana pediu` (pedido com o original, sem marcador).
- `src/components/dados-da-demanda.test.ts` e `src/app/(painel)/demandas/nova/formularios.test.ts`: frases novas, mais o
  teste de que nenhum dos dois textos tem `não é enviado ao agente` nem `sem o nome do solicitante`.
- `src/app/api/demandas/nomes-antes-de-gravar.test.ts`: o ponto de falha passou a `nomesDoSolicitante` (mesmo `vi.mock`
  de `modules/demandas/consultas`, armado uma vez); `nomesDaDemanda` só observado. "Falha não grava nada" refeito nos 6
  casos (3 POST × pessoa e agente), com o esperado de hoje. Bloco de 404/409/429/400 sem mudança de esperado. "Uma
  leitura por POST" virou: zero chamadas de `nomesDaDemanda` e uma de `nomesDoSolicitante` com `'Fulana Fictícia Teste'`.
  Bloco novo da corrida nos 3 POST: conexão do `poolMigrator` com `begin`, `select ... for update`, `update` de
  `Joana Ficticia Antiga` para `Carla Ficticia Nova`, POST com token de agente, espera em `pg_stat_activity`
  (`wait_event_type = 'Lock'`, prazo de 10 s), `commit`; o 201 sai com `Falar com [nome removido] sobre o relatório.`
- `test/estatico/pacote-sem-extras.test.ts`: a varredura cobre `criarPacoteDecisao` e `criarPacoteDecisaoComNomes`, com o
  mesmo máximo de 4 argumentos e as mesmas regras de referência (caso novo com 5 e 6 argumentos, renomeada, namespace,
  espalhada, variável e `apply`); "enxerga os dois chamadores" aceita a rota com a função nova e a Server Action com a de
  hoje. As regras do B-1 do 0006 não ficaram mais fracas.

### Testes vistos falhando na base (antes do código)

- D-4/D-5: `pnpm --dir <repo> test src/lib/reduzir-erro.test.ts src/lib/sentry.test.ts` — 9 falhas de 74. Trechos:
  `expected { classe: 'Joana Ficticia' } to deeply equal { classe: 'Error' }`; `TypeError: Cannot convert a Symbol value
  to a string ❯ classeAceita src/lib/reduzir-erro.ts:32:23`; `"value":"Joana Ficticia"` no envelope do Sentry; no B-4,
  `expected +0 to be 1` (a 2ª chamada não enviou).
- D-1: `pnpm --dir <repo> test src/modules/dados-pessoais/minimizar.test.ts` — 34 falhas de 104. Trechos:
  `Received: "Pedido de Ana Exemplo Lima"`; `TypeError: partesDoNome is not a function`;
  `Received: "[nome removido] falou com [nome removido]; Exemplo e Rocha assinaram."`.
- D-2: 4 falhas de 40. Trecho: `Received: "O agente recebe só o texto, sem o nome do solicitante, sem a origem ..."` e
  `expected 'Digite o nome. Ele não é enviado ao a…' not to contain 'não é enviado ao agente'`.
- D-3: 11 falhas de 27. Trechos: `expected 201 to be 500` (falha armada não mais na rota);
  `expected [ 'DEM-20261022-0007' ] to deeply equal []` (a rota ainda chamava `nomesDaDemanda`); na corrida,
  `Expected: "Falar com [nome removido] sobre o relatório." Received: "Falar com Carla [nome removido] Nova sobre o
  relatório."` (a vista minimizou com o nome antigo, lido antes da trava); `expected [] to deeply equal
  ArrayContaining{… route.ts }` na guarda estática.

### Esperados existentes que mudaram (arquivo:linha da base, antes → depois, regra)

1. `src/modules/dados-pessoais/minimizar.test.ts:204`: `'[nome removido] assinou; Nome também.'` →
   `'[nome removido] assinou; [nome removido] também.'` — palavra com inicial maiúscula igual a uma parte do nome
   (`nome` de `'nome removido'`). Listado na 02.
2. `src/modules/dados-pessoais/minimizar.test.ts:252`: `'Pedido de Ana Exemplo Lima'` → `'Pedido de Ana [nome removido]
   Lima'` — parte em comum com o nome de outra pessoa. Listado na 02 (título do teste ajustado: "salvo a parte em comum").
3. `src/app/api/demandas/demandas.test.ts:489`: `'Pedido de [nome removido], falar com Bruno Exemplo Rocha'` →
   `'Pedido de [nome removido], falar com Bruno [nome removido] Rocha'` — parte em comum. Listado na 02.
4. `src/app/api/demandas/demandas.test.ts:490`: `'Pedido de Ana Exemplo Lima, falar com [nome removido]'` →
   `'Pedido de Ana [nome removido] Lima, falar com [nome removido]'` — parte em comum. Listado na 02.
5. `test/transversal/sentinelas.test.ts:430`: `toContain(SENTINELAS.texto)` → `toContain('[nome removido]-TEXTO-7f3a')`
   — palavra com inicial maiúscula igual a uma parte do nome: o solicitante é `SENTINELAS.nome`
   (`'Pessoa Ficticia Sentinela'`), e a parte `Sentinela` troca o começo de `SENTINELA-TEXTO-7f3a` (o `-` é borda). A
   fixture não mudou. Para a asserção seguir não vazia, acrescentei que o trecho `-TEXTO-7f3a`, o que de fato chega ao
   provedor, não aparece em nenhuma das saídas (log, console, Sentry, pgboss, execucao_agente).
6. `test/estatico/projeto.test.ts:28-30`: versão `0.1.9` → `0.1.10` (efeito da mudança de versão pedida na 02).

Nenhum outro esperado mudou: `vistas-para-agente.test.ts`, `entrada-agente.test.ts` e os demais com `Maria Ficticia
Teste`, `Pessoa Ficticia` e `Fulana Fictícia Teste` passaram sem ajuste.

### Comandos e resultado final

- `pnpm test`: 4055 testes, 0 falhas, 0 erros (relatório JUnit no scratchpad, linha 2:
  `tests="4055" failures="0" errors="0"`). A saída de tela é cortada pelo volume de log do pino; por isso o relatório foi
  gravado em arquivo pela opção `--outputFile` do próprio vitest, sem redirecionamento do shell.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.

### Desvios do plano, com a razão

1. **D-4, getter que muda (passo 1 da 01).** A 01 esperava `{ classe: 'Error' }`; com a correção da 02 (uma leitura só),
   a leitura única devolve `'TypeError'`, que é o valor conferido, e é ele que sai. O furo era a segunda leitura
   (`'Joana Ficticia'`), que deixou de existir. O teste ficou `{ classe: 'TypeError' }` (e o título do Sentry
   `TypeError`, sem `Joana`), com a garantia de leitura única e o caso inverso (fora da regra na 1ª leitura → `Error`).
   Os passos 2 e 3 (`toString` que muda e array) dão `{ classe: 'Error' }`, como na 01.
2. **D-3, ponto exato da conta dos nomes.** Os nomes saem da linha travada (`atual` em ESP e RSK, `d` no DEC) no fim do
   corpo da transação, depois dos inserts, do status e do aviso, e não logo depois de `travarDemanda`. O valor é o mesmo
   (a trava segura a linha até o commit), e assim o teste "falha não grava nada" prova que a volta leva tudo, inclusive
   o status e o aviso do DEC.
3. **Testes de integração do D-1.** Os casos novos de `demandas.test.ts`, `entrada-agente.test.ts` e `pedido.test.ts`
   foram escritos depois da correção de `minimizar`, que é o único ponto que muda; a falha na base foi mostrada pelos
   unitários de `minimizar.test.ts`, que cobrem as mesmas frases. O de `pedido.test.ts` é contraprova (passa antes e
   depois). No primeiro `pnpm test`, o caso novo de `pedido.test.ts` falhou por fixture minha incompleta
   (`escopoInclui` obrigatório no Zod da ESP); corrigi o teste, não o código.
4. **Arquivos fora da lista da 02:** `test/transversal/sentinelas.test.ts` e `test/estatico/projeto.test.ts`, só pelo
   efeito da regra nova e da versão (itens 5 e 6 acima). Nenhum arquivo fora de `src/`, `test/` e `package.json`.
5. **Prazo no teste da corrida.** A espera em `pg_stat_activity` usa `Date.now()` só como prazo de segurança de 10 s, no
   arquivo de teste (a guarda de relógio vale para `src/`). O resultado não depende do tempo: o teste só segue quando o
   banco mostra o POST em espera de trava.

## Decisões tomadas

- `PARTICULAS_DO_NOME` gravada só em minúscula e sem acento (`junior`, sem `júnior`): a comparação dobra caixa e acento, e o teste confere a lista exata.
- `partesDoNome` corta a ponta que não é letra nem número, mas mantém a marca combinante no fim, para o nome gravado em NFD não perder o acento da última letra.
- Repetição de parte é tirada sem caixa e sem acento (`'Ana Ana ANA'` → `['Ana']`), também entre nomes diferentes, para a alternância não ter ramos iguais.
- A dobra só olha caractere acima de ASCII, e só troca quando o NFD é uma letra BMP mais marcas: o comprimento nunca muda, e Hangul e pares substitutos ficam como estão.
- No teste do D-3, o `vi.mock` arma a falha em `nomesDoSolicitante` (função síncrona, que agora lança), igual ao de hoje, armado uma vez: o teste é o mesmo pelos dois atores.
- A guarda estática ganhou uma lista de duas funções (`FUNCOES`) no lugar de duplicar o verificador, para as regras serem as mesmas nas duas.
- Texto do `CHANGELOG.md` deixado na Pendência 1, como o maestro pediu; o arquivo não foi tocado.

## Pendências

1. Para a `06-documentacao` (`documentacao-tecnica`), texto sugerido para o `CHANGELOG.md`:

   ```markdown
   ## 0.1.10 — 2026-11-04

   Pedido DEC-DEM-20261104-0011-v1 (correção): M-1 da revisão do 0009, dica da tela e baixos B-2, B-3 e B-4 da revisão do 0010.

   ### Corrigido
   - M-1 do 0009 (RF-20): além do nome completo, cada parte do nome do solicitante com 3 letras ou mais vira
     `[nome removido]` no texto que vai ao agente (entrada do worker) e na API de quem não é pessoa, quando no texto
     começa por letra maiúscula. Partículas e sufixos de parentesco (`PARTICULAS_DO_NOME`) ficam. Nome completo e parte
     casam sem diferença de acento nos dois sentidos, também com texto em NFD. A pessoa e o Pedido de Construção
     continuam com o texto original. Risco que sobra, aceito no RSK: o nome escrito todo em minúscula; e falso positivo
     aceito: palavra com maiúscula igual a uma parte do nome ("Dias depois") e parte em comum com o nome de outra pessoa.
   - Dica do campo "Nome do solicitante" e aviso de minimização do modo agente: não prometem mais que o nome nunca chega
     ao agente.
   - B-3 do 0010: o 201 dos POST de ESP, RSK e DEC minimiza com o nome da demanda travada, na mesma transação da
     gravação; uma renomeação no meio não sai em claro.
   - B-2 do 0010: `reduzirErro` lê `name` uma vez e só usa texto que passa em `classeAceita`.
   - B-4 do 0010: `capturarErro` marca o erro como enviado só depois do envio ao Sentry.
   ```

2. Para a `04-regressao` (`qa-automacao`): o maestro conferiu que nada de `e2e/` cita as frases antigas; rodar
   `pnpm test:e2e` três vezes, como na definição de pronto. Casos exploratórios da 01 (itens 1 a 10) já cobertos em
   unidade; o 7 (`Paulo` em `São Paulo`, `Santos` cidade) é falso positivo da mesma família do "Dias depois" e não tem
   teste próprio.
3. Para a `04-revisao` (maestro), registro herdado da 02 (Pendência 2): `lerCode` com getter de `code` que lança ainda
   faz `capturarErro` lançar para quem chama; depois do D-5 o erro não fica mais marcado sem envio (teste do B-4).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --branch` — ramo `construcao/DEC-DEM-20261104-0011-v1`, limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/reduzir-erro.test.ts src/lib/sentry.test.ts` — 9 falhas de 74 (base, D-4 e D-5)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/reduzir-erro.test.ts src/lib/sentry.test.ts` — 75 de 75
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts` — 34 falhas de 104 (base, D-1)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts` — 104 de 104
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/dados-pessoais/minimizar.test.ts -t tempo --reporter=verbose` — 1 passou (47 ms), 103 pulados
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-demanda.test.ts src/app/(painel)/demandas/nova/formularios.test.ts` — não rodou: erro de sintaxe do shell pelos parênteses do caminho
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova/formularios.test.ts"` — 4 falhas de 40 (base, D-2)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/nomes-antes-de-gravar.test.ts test/estatico/pacote-sem-extras.test.ts` — 11 falhas de 27 (base, D-3)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/nomes-antes-de-gravar.test.ts -t "linha travada"` — 10 falhas, 10 pulados (base, D-3, saída curta)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/nomes-antes-de-gravar.test.ts test/estatico/pacote-sem-extras.test.ts` — 27 de 27
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 2 erros (`'c' is possibly 'undefined'` em minimizar.ts), corrigidos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — falhou (o caso novo de pedido.test.ts); saída cortada pelo volume de log
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pacotes-decisao/pedido.test.ts -t "Joana pediu"` — 1 falha (ZodError da fixture do teste novo), 18 pulados
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pacotes-decisao/pedido.test.ts src/modules/agentes/entrada-agente.test.ts src/app/api/demandas/demandas.test.ts` — 129 de 129
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/vitest-03.json` — saiu com falha; o JSON numa linha só ficou grande demais para ler
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/vitest-03.xml` — 2 falhas de 4055
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/vitest-modulos.xml` — passou (saída 0)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test scripts --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/vitest-test.xml` — 2 falhas de 4055 (o filtro `test` casou todos os arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/ scripts/ --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/vitest-raiz.xml` — 2 falhas de 370 (projeto.test.ts, versão; sentinelas.test.ts:430)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/ scripts/ --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/vitest-raiz2.xml` — 1 falha de 370 (sentinelas.test.ts:430)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/transversal/sentinelas.test.ts test/estatico/projeto.test.ts` — 12 de 12
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent --reporter=junit --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/f803aa58-06d4-40d8-998e-0da08e5f62a0/scratchpad/vitest-final.xml` — 4055 testes, 0 falhas, 0 erros
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 23 arquivos modificados, todos em `src/`, `test/` e `package.json`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
