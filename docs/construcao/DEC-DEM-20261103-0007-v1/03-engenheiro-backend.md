---
pedido: DEC-DEM-20261103-0007-v1
etapa: 03-correcao
agente: engenheiro-backend
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, package.json, test/estatico/projeto.test.ts, test/estatico/eslint.test.ts, eslint.config.mjs, src/modules/avisos/enviador.ts, src/modules/avisos/enviador.test.ts, src/modules/avisos/aviso-dec.ts, src/modules/avisos/aviso-dec.test.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/decidir-bordas.test.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/gerar.test.ts, src/modules/demandas/transicoes.ts, src/modules/versoes.ts, scripts/seed-ficticio.ts, scripts/start-hml.ts, scripts/lib/saida.ts, scripts/scripts.test.ts, src/lib/env.ts, src/lib/env.test.ts (trecho), src/modules/demandas/consultas.ts, "src/app/api/demandas/route.ts", "src/app/api/demandas/[id]/route.ts", src/app/api/demandas/demandas.test.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/exigir-pessoa.test.ts, src/modules/acesso/resolver-ator-qa.test.ts (trechos), "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts (trecho)", src/instrumentation.ts, src/instrumentation.test.ts, src/lib/log.ts, src/lib/log.test.ts, src/lib/reduzir-erro.ts, src/lib/sentry.ts, src/lib/erros.ts, src/app/error.tsx (cabeçalho)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Os seis itens da `03-correcao` estão feitos, na ordem da triagem: versão, Aviso, M-08, M-07, M-06 e M-05 (a), (b) e (c).
A peça (c) do M-05 ficou verde às 14h18 UTC, antes do limite das 15h30, então a saída autorizada pelo prazo não foi
usada. Não há migration e nada mudou em `src/db/`, `e2e/`, `.github/` nem `docs/`, a não ser esta entrega.

### Arquivos alterados

- **Passo 0 (versão):** `package.json` (0.1.6) e `test/estatico/projeto.test.ts`.
- **Aviso:**
  - `src/modules/avisos/enviador.ts`: `classificar` põe 408, 409, 429 e 5xx em `transitorio`, pelo conjunto
    `TRANSITORIOS_4XX`. O comentário registra que o 409 de corpo diferente com a mesma Idempotency-Key gasta as 3
    tentativas.
  - `src/modules/avisos/aviso-dec.ts`: só os comentários das linhas 15 e 179-180.
- **M-08:**
  - `src/modules/pacotes-decisao/decidir.ts`: guarda o retorno de `travarDemanda` e, se `ehStatusFinal`, devolve
    `conflito(MENSAGENS_DECISAO.demandaFinal)` antes de `obterPacoteDecisao` e do `jaDecidido`.
  - `src/modules/pedido-construcao/gerar.ts`: lê o `demandaId` do DEC (404 se não existe), trava a demanda, recusa por
    status final com `MENSAGENS_PEDIDO.demandaFinal` e só depois lê o DEC. Os textos são os da triagem.
- **M-07:**
  - `src/lib/env.ts`: exporta `ehLoopback(hostname)` sobre a lista `LOOPBACK` existente, por igualdade exata. O
    `httpForaDoLoopback` passa a usá-la.
  - `scripts/seed-ficticio.ts`: guarda nova sobre `deps.config.urlBase`, logo depois do `SEED_FICTICIO` e antes da
    transação. Tem o resultado `recusado_producao`, o log `codigoErro: 'url_fora_do_loopback'` sem a URL, e
    `MENSAGENS_SEED` exportado com a mensagem fixa, que cita `BETTER_AUTH_URL`.
  - `scripts/start-hml.ts`: texto próprio para a recusa nova (linha 90). A recusa não derruba a subida.
- **M-06:**
  - `src/modules/demandas/consultas.ts`: `vistaDaDemandaPara(ator, d)`. A pessoa recebe a vista inteira. Para qualquer
    outro ator, a vista é montada chave a chave, como lista de permissão: sem `solicitanteNome` e `anexos`, com
    `responsavel` e `autor` de pessoa iguais a `{ tipo: 'pessoa' }` e o autor agente igual.
  - `src/app/api/demandas/[id]/route.ts` (GET) e `src/app/api/demandas/route.ts` (POST): passam a usar a função.
- **M-05:**
  - (a) `src/modules/acesso/exigir-pessoa.ts`: `ErroLeituraSessao`, com mensagem fixa, sem `cause`, só o `code` de
    `reduzirErro` e o `name` no protótipo. Todo erro do `getSession` vira esse erro no caminho comum de `lerPessoa`.
  - (b) `src/instrumentation.ts`: `onRequestError`, só no runtime Node. Grava
    `{ evento: 'erro_requisicao', metodo, rota: routePath, codigoErro: 'erro_interno', erroId: digest, erro }` e chama
    `capturarErro(err, { evento: 'erro_requisicao' })`. `metodo` e `rota` só entram no formato. O erro de controle do
    Next (`NEXT_REDIRECT`, `NEXT_HTTP_ERROR_FALLBACK`, `NEXT_NOT_FOUND` e afins) fica de fora.
  - (b) `src/lib/log.ts`: `erroId` entra em `CAMPOS_PERMITIDOS`, e o próprio log só o aceita no formato
    `FORMATO_ERRO_ID = /^[A-Za-z0-9_-]{1,64}$/`.
  - (c) `src/lib/console-saneado.ts` (novo): `instalarConsoleSaneado` e `desinstalarConsoleSaneado`.
    - `console.error` e `console.warn` passam a gravar só `{ evento: 'console_erro' | 'console_aviso', erro, erroId }`
      pelo `log`. Texto solto e objeto não saem.
    - Uma trava impede a reentrada, e a falha do log é engolida, sem voltar ao console original.
    - O único `eslint-disable-next-line no-console`, com a razão (G3.7), está na linha que troca os dois métodos.
  - (c) `src/instrumentation.ts`: o `register()` instala o console saneado depois de `lerConfigApp` e `iniciarSentry`.
  - O comentário de `src/app/error.tsx:4` agora é verdadeiro e não precisou mudar.

### Testes criados ou alterados

- `test/estatico/projeto.test.ts`: versão 0.1.6.
- `src/modules/avisos/enviador.test.ts`: 408 e 409 resultam em `transitorio`. A linha do 409 mudou de `recusado` para
  `transitorio` e não foi apagada. Entraram 410 e 413 como `recusado`.
- `src/modules/avisos/aviso-dec.test.ts`: 408 e 409 ficam `pendente` com `tentativas: 1`. Com 409 nas três
  tentativas: pendente, pendente e `falhou`, com os eventos de log. 401, 410 e 413 dão `falhou` na 1ª.
- `src/modules/pacotes-decisao/decidir-bordas.test.ts`, bloco "M-08":
  - aprovar, devolver e arquivar em demanda `encerrada` e `entregue` dão 409 `demandaFinal`, sem linha em `aprovacao`
    nem em `decisao`, sem evento e com o status mantido;
  - um DEC já decidido também dá 409 `demandaFinal`;
  - na dupla aprovação, a aprovação da administradora é recusada depois do encerramento;
  - nos status não finais, tudo segue igual;
  - o texto fixo da mensagem.
- `src/modules/pedido-construcao/gerar.test.ts`:
  - 409 `demandaFinal` em demanda `entregue` (pelo caminho real aprovada, em_construcao, entregue) e `encerrada`,
    sem `pedido_gerado`. Vem antes do estudo e do status do DEC;
  - nos status não finais, gera como antes.
- `scripts/scripts.test.ts`:
  - recusa com as quatro URLs da triagem: código 1, `MENSAGENS_SEED.recusado_producao`, sem o hostname na saída e no
    log, e nenhuma linha em `user`, `demanda`, `preco_modelo` e `evento`;
  - a recusa não abre conexão (espião no `pool.connect`);
  - sem `SEED_FICTICIO`, a recusa de antes;
  - `localhost` e `[::1]` semeiam, e o `127.0.0.1` segue no teste de semeadura que já existia.
- `src/lib/env.test.ts`: `ehLoopback` aceita só os três nomes, sem prefixo nem sufixo.
- `src/app/api/demandas/demandas.test.ts`, bloco "M-06":
  - GET com token `risco` e `orquestrador`: sem as chaves, `responsavel` igual a `{ tipo: 'pessoa' }`, o `autor` das
    três versões igual a `{ tipo: 'pessoa' }`, e nem o nome da conta nem o anexo no corpo;
  - pessoa vê tudo;
  - POST do `orquestrador` com a mesma regra;
  - demanda de autor agente fica `{ tipo: 'agente', agente }`;
  - listagem nos dois atores só com as chaves da fila;
  - unidade de `vistaDaDemandaPara`: o ator `sistema` recebe a vista mínima, e um campo novo não vaza.
- `src/modules/acesso/exigir-pessoa.test.ts`, bloco "M-05 (a)":
  - com o sentinela `token-ficticio-SENTINELA-0007` em `message`, `cause.message` (`code: '57P01'`), `stack` e `params`,
    `exigirPessoaNaPagina`, `exigirPessoa` e `exigirSessaoParaConfigurar2fa` rejeitam com `ErroLeituraSessao` e
    `code: '57P01'`, sem o sentinela em `message`, `stack`, `JSON.stringify` nem `cause`;
  - `code` fora do formato não entra;
  - um valor que não é Error também é saneado.
- `src/instrumentation.test.ts`:
  - "M-05 (b)": uma linha só, com `erro_requisicao`, `rota: '/demandas/[id]'`, `erroId: '1234567890'`,
    `erro: { classe, code: '57P01' }`, sem o sentinela nem o id da demanda, e `capturarErro` com o evento;
  - digest fora do formato sai sem `erroId`;
  - método e rota fora do formato ficam de fora;
  - redirect e notFound não são registrados;
  - fora do runtime Node, nada acontece;
  - "M-05 (c)": o `register()` troca `console.error` e `console.warn`, sem mexer em `console.log`, e com a configuração
    inválida não troca nada.
- `src/lib/log.test.ts`: a lista `CAMPOS_PERMITIDOS` fixada com `erroId`, e o formato do `erroId`.
- `src/lib/console-saneado.test.ts` (novo):
  - os três chamados da triagem gravam só pelo log, com espiões em `process.stdout.write` e `process.stderr.write`, sem
    o sentinela em nenhum dos dois;
  - texto solto e objeto não saem;
  - `log` e `info` não mudam, instalar duas vezes não empilha, e desinstalar devolve os originais;
  - a falha do log não derruba quem chamou.

  O teste desinstala no fim.

### Comandos e resultado

- TDD: cada passo foi visto falhando antes do código. Trechos:
  - versão e Aviso: `Tests 6 failed | 72 passed (78)`, com `expected '0.1.5' to be '0.1.6'` e
    `resposta 409 → ... expected ... "code": "recusado"`;
  - M-08: `Tests 12 failed | 127 passed (139)`, com `"mensagem": "este pacote já tem decisão registrada."` no lugar de
    `demandaFinal`;
  - M-07: `Tests 7 failed | 93 passed (100)`, com `expected 'semeado' to be 'recusado_producao'` e
    `ehLoopback is not a function`;
  - M-06: `Tests 3 failed | 41 passed (44)`, com `expected [ 'id', 'titulo', 'tipo', …(19) ] to not include 'solicitanteNome'`;
  - M-05 (a): `Tests 5 failed | 23 passed (28)`;
  - M-05 (b): `Tests 7 failed | 33 passed (40)`, com `onRequestError is not a function`;
  - M-05 (c): `Cannot find module './console-saneado'`.
- `pnpm test` final: **3866 de 3866**, em 195 arquivos, 0 falhou.
- `pnpm lint` e `pnpm typecheck` limpos.

### Desvios do plano, com a razão

1. **Três testes que já existiam mudaram junto, porque fixavam o comportamento que o pedido corrige.** Nenhuma
   asserção ficou mais fraca: a 1ª e a 2ª passam a esperar a mensagem nova, e a 3ª passa a checar a classe do erro
   saneado e a ausência do sentinela.
   - `gerar.test.ts` (CA-22.4) e `acoes-pedido.test.ts` (CA-22.4): arquivar o DEC encerra a demanda
     (`decisao_arquivada`). Por isso o DEC arquivado passa a receber 409 `demandaFinal`, e não `naoAprovado`. É a regra
     do M-08: a demanda vem antes do status do DEC. Segue 409, sem evento.
   - `exigir-pessoa.test.ts` ("erro que não é de acesso") e `resolver-ator-qa.test.ts:126` (controle do cookie):
     esperavam a mensagem crua do `getSession`. Agora esperam `ErroLeituraSessao`, sem a mensagem original. A
     `ErroLeituraSessao` só nasce quando o Better Auth foi chamado e falhou, então o controle continua provando a
     chamada.
2. **Nos testes de `src/`, o console é chamado por `const terminal = globalThis.console`**, e não por `console.*`. O
   `no-console` vale também para os testes de `src/`, e a triagem proíbe desligá-lo fora da única linha de
   `console-saneado.ts`. É o mesmo objeto `console` do processo.
3. **`erroId` também é validado dentro do `log`**, além de no `onRequestError`. É uma segunda barreira, para nenhum
   outro chamador gravar texto livre nesse campo.
4. **`onRequestError` ignora o erro de controle do Next** (`redirect()` e `notFound()`), pelo prefixo do digest. Não são
   falha, e o caso exploratório da 01 pede que continuem funcionando sem virar registro.

## Decisões tomadas

- A vista mínima do M-06 é montada chave a chave, e não copiada com chaves apagadas: um campo novo da `DemandaVista` não
  chega ao agente por omissão (o teste fixa isso).
- O `name` de `ErroLeituraSessao` fica no protótipo: a instância só tem `code`, e nada além dele aparece no
  `JSON.stringify`.
- A guarda do seed trata URL que não se lê como fora do loopback, e recusa.
- O texto de `MENSAGENS_SEED.recusado_producao` cita os três nomes do loopback e `BETTER_AUTH_URL`, nunca o valor.
- A troca do console fica numa função `trocar` com a única linha desligada do `no-console`, e serve para instalar e
  para desinstalar. Os originais são lidos por desestruturação, que a regra não acusa.
- O `onRequestError` e o `register` carregam `log`, `sentry` e `console-saneado` por `import()` dinâmico, como o
  `register` já fazia, para o edge não carregar o pino.
- Nove comandos só de leitura que esta etapa rodou ficaram fora da lista de comandos abaixo, porque o maestro os liberou
  pela regra de Fabiano de 25/10 sobre bloqueio só de leitura. Foram eles:
  - seis listagens de pasta com `git show` no repositório do pedido;
  - uma busca do `urlBase` com `git grep`;
  - um ESLint direto em quatro arquivos;
  - um `tail` na saída gravada do `pnpm test`.

  Nenhum alterou nada.

## Pendências

- Para a `04-regressao` (qa-automacao): rodar `pnpm test:e2e` três vezes. Spec que monte a cena arquivando ou
  encerrando e depois decidindo ou gerando Pedido na mesma demanda passa a receber 409 `demandaFinal`: o ajuste é da
  cena. Nenhum spec de agente deve esperar `solicitanteNome`, `anexos` ou nome de conta em `GET /api/demandas/:id`.
- O risco do M-05 que a triagem registrou continua: a prova é de unidade. Se o Next escrever o erro de renderização
  direto no `process.stderr`, sem passar pelo `console`, a peça (c) não pega, e só a (a) segue garantida. A conferência
  na homologação, com o `db` parado, fica para Fabiano na P3.
- Fica fora deste pedido, já registrado na 02: a autoria nas leituras próprias de ESP, RSK e DEC.
- Para a `ux-ui-design`, à parte, como na 02: os dois textos de 409 `demandaFinal`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo no início (rodado também no fim: 25 alterados e 2 novos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/projeto.test.ts src/modules/avisos/enviador.test.ts src/modules/avisos/aviso-dec.test.ts` — 6 falharam, 72 passaram (vermelho esperado)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao/decidir-bordas.test.ts src/modules/pedido-construcao/gerar.test.ts src/modules/avisos test/estatico/projeto.test.ts` — 12 falharam (M-08, vermelho esperado), 127 passaram (Aviso e versão verdes)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao src/modules/pedido-construcao` — 1 falhou (CA-22.4 arquivado, desvio 1), 199 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts src/lib/env.test.ts src/modules/pedido-construcao/gerar.test.ts` — 7 falharam (M-07, vermelho esperado), 93 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/scripts.test.ts src/lib/env.test.ts` — 55 de 55
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas/demandas.test.ts` — 3 falharam (M-06, vermelho esperado), 41 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas` — 80 de 80
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/exigir-pessoa.test.ts` — 5 falharam (M-05 a, vermelho esperado), 23 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/exigir-pessoa.test.ts` — 28 de 28
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/instrumentation.test.ts src/lib/log.test.ts` — 7 falharam (M-05 b, vermelho esperado), 33 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/instrumentation.test.ts src/lib/log.test.ts` — 40 de 40
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/console-saneado.test.ts src/instrumentation.test.ts` — o arquivo novo falhou por falta do módulo, e 1 de 12 falhou (M-05 c, vermelho esperado)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/console-saneado.test.ts src/instrumentation.test.ts` — 16 de 16
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 2 falharam (resolver-ator-qa:126 e acoes-pedido CA-22.4, desvio 1), 3864 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/resolver-ator-qa.test.ts "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts"` — 21 de 21
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 3866 de 3866, 195 arquivos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
