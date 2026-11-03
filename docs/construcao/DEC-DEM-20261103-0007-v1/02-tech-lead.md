---
pedido: DEC-DEM-20261103-0007-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, DEC-DEM-20261103-0006-v1/02-tech-lead.md, .claude/agents/engenheiro-backend.md, .claude/agents/devops-sre.md, src/instrumentation.ts, src/modules/acesso/exigir-pessoa.ts, "src/app/(painel)/layout.tsx", "src/app/(painel)/demandas/page.tsx", "src/app/(painel)/demandas/[id]/page.tsx", "src/app/(painel)/demandas/[id]/demanda-da-pagina.ts", src/app/error.tsx, src/lib/log.ts, src/lib/sentry.ts, src/lib/reduzir-erro.ts, src/lib/rota.ts (trecho), src/lib/acao-painel.ts, src/lib/env.ts, src/modules/demandas/consultas.ts, src/modules/demandas/transicoes.ts, "src/app/api/demandas/route.ts", "src/app/api/demandas/[id]/route.ts", src/modules/pacotes-decisao/decidir.ts, src/modules/pedido-construcao/gerar.ts, src/modules/avisos/enviador.ts (trecho), src/modules/avisos/enviador.test.ts (trecho), scripts/seed-ficticio.ts (trechos), scripts/start-hml.ts (trecho), scripts/lib/saida.ts, e2e/servidor.ts (trecho), e2e/pedido-construcao.spec.ts, docker-compose.hml.yml, .github/workflows/deploy.yml, eslint.config.mjs, test/estatico/eslint.test.ts, test/estatico/varreduras-qa.test.ts (trecho)]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

### Causa provável

Concordo com a reprodução da 01 nos seis defeitos. Conferi cada caminho no código da base (`295d3f2`, sobre a main
`e0d5f4c`, 0.1.5).

1. **D-01 (M-05).** Nenhum código registra o erro de página, layout ou `generateMetadata`:
   - `src/instrumentation.ts` só tem `register()`, sem `onRequestError`;
   - `exigirPessoaNaPagina` (`exigir-pessoa.ts:48`), `lerMoldura` (`layout.tsx:35-36`) e os `metadadosDa*` das páginas
     (por exemplo, `demanda-da-pagina.ts:35`) relançam o erro cru;
   - as páginas leem o banco fora dos adaptadores (`demandas/[id]/page.tsx:287-291`).

   O erro chega cru ao Next, e o Next o escreve no console do processo. No erro do `getSession`, a consulta da sessão
   leva o token como parâmetro. O Drizzle 0.45 embrulha a falha num erro cuja mensagem traz o SQL e os `params`, e o
   erro do pg vai no `cause`. Não li o código do Next nem do Drizzle, porque o git não rastreia esses arquivos. O
   comportamento é o que conheço dessas versões, e o teste do item 1 não depende dele (ver "Decisões").
2. **D-02 (M-06).** `GET /api/demandas/[id]` (`route.ts:9-11`) devolve `obterDemanda` sem olhar o ator. A vista leva
   `solicitanteNome` (`consultas.ts:153`), `anexos` (`:161`), o nome da conta em `responsavel` (`:164`) e o `autor.nome`
   das versões (`:92`, `:119`). O `POST /api/demandas` (`route.ts:9-12`) devolve a mesma vista ao agente `orquestrador`.
   A listagem já não expõe esses campos (`consultas.ts:183-198`).
3. **D-03 (M-07).** `seedFicticio` (`seed-ficticio.ts:289-298`) só confere `SEED_FICTICIO` e o banco vazio. A URL da
   configuração não entra em nenhuma guarda.
4. **D-04 (M-08).** Os dois fluxos ignoram o status da demanda:
   - `registrarDecisao` trava a demanda (`decidir.ts:205`) e descarta a linha devolvida, que tem o status;
   - `gerarPedido` (`gerar.ts:42-61`) nem trava a demanda, e lê o DEC fora da trava.
5. **D-05 (Aviso).** `classificar` (`enviador.ts:45`) só põe 429 e 5xx em `transitorio`. O teste
   `enviador.test.ts:125` fixa o 409 como `recusado`.
6. **D-06 (CI).** As actions estão fixadas por tag (`@v5 # SHA pendente`): 5 checkout e 3 setup-node no `ci.yml`, e 1
   checkout no `deploy.yml`.

### Decisões sobre os pontos que a 01 deixou para a triagem

1. **M-05: três peças, e o token fica coberto na origem.** Hoje o `onRequestError` do Next só notifica: não impede o
   Next de escrever o erro no console. Por isso o gancho sozinho não fecha o M-05.
   - **(a) Origem.** `lerPessoa` (`exigir-pessoa.ts:22`) troca todo erro do `getSession` por um erro saneado de classe
     própria, `ErroLeituraSessao`. Ele tem mensagem fixa, nenhum `cause` e só o `code` validado de `reduzirErro`. Como
     `lerPessoa` é o caminho comum de `exigirPessoa`, `exigirPessoaNaPagina`, `exigirSessaoParaConfigurar2fa`, do layout
     e dos `metadadosDa*`, o token não chega ao Next por nenhum deles, seja qual for o jeito de o Next registrar.
   - **(b) Registro.** `onRequestError` em `src/instrumentation.ts`, só no runtime Node: grava
     `log.error({ evento: 'erro_requisicao', metodo, rota: context.routePath, codigoErro: 'erro_interno', erroId, erro })`
     e chama `capturarErro(err, { evento: 'erro_requisicao' })`.
     - O `rota` é o modelo da rota (`/demandas/[id]`), nunca `request.path`, que traz id e query.
     - O `erroId` é o `digest` do erro, e só entra se casar com `/^[A-Za-z0-9_-]{1,64}$/`.
     - É o identificador que a 2.8 (`error.tsx`) recebe, e casa a linha do log com o evento no Sentry.
   - **(c) Saída do console.** No `register()`, depois de `lerConfigApp` e `iniciarSentry`, `console.error` e
     `console.warn` passam a escrever só pelo `log`:
     - uma linha `{ evento: 'console_erro' | 'console_aviso', erro, erroId }` por chamada;
     - `erro` é o primeiro argumento que for `Error`, reduzido pelo `log`. Texto solto e objeto não saem;
     - fica depois de `lerConfigApp` para que o erro de configuração do boot, que já cita só o nome da variável (C-31),
       continue legível. `console.log` e `console.info` não mudam.

     Isso cobre o que (a) não cobre: a falha de banco nas outras leituras de página, cujo SQL traz id e texto de
     demanda. É a única forma central de cobrir isso. A outra seria embrulhar cada página e cada componente assíncrono.
2. **Campo novo na lista de permissão: `erroId`.** É um identificador com formato validado na origem, sem conteúdo.
   Acrescentar esse campo não afrouxa o C-21. O teste que fixa `CAMPOS_PERMITIDOS` muda junto.
3. **M-06: a projeção fica no domínio e vale para todo ator que não seja pessoa.** A nova função
   `vistaDaDemandaPara(ator, d)` em `consultas.ts` recebe o ator e a vista:
   - para `pessoa`, devolve a vista inteira;
   - para qualquer outro ator (lista de permissão: só pessoa vê tudo), tira as chaves `solicitanteNome` e `anexos`. A
     chave some, sem `null`;
   - troca o `responsavel` de pessoa por `{ tipo: 'pessoa' }`, sem o nome, e faz o mesmo no `autor` de
     `especificacoes[]`, `pareceresRisco[]` e `pacotesDecisao[]`. O autor agente fica igual.

   A função vale no `GET /api/demandas/[id]` e no `POST /api/demandas`: um contrato só para o agente.
4. **Fica fora do M-06, com registro:** a autoria nas leituras próprias de ESP, RSK e DEC (`autor.nome`,
   `aprovadores[].nome`, `decisao.decididaPor`). O texto aprovado da ESP trata da leitura de demanda, e o prazo de hoje
   não comporta três módulos a mais. Vai às Pendências como achado novo.
5. **M-07: a guarda lê `deps.config.urlBase`, não o `env`.** O e2e passa ao seed um `env` só com `SEED_FICTICIO`
   (`e2e/servidor.ts:59`). Os três caminhos (homologação, e2e e script direto por `rodarScript`) montam `config`, e
   `config.urlBase` é a `origin` validada por `lerConfigApp`.
   - O `hostname` tem de estar na lista `LOOPBACK` de `env.ts:48`, por igualdade exata e sem sufixo. A lista é
     exportada por uma função `ehLoopback(hostname)`, sem segunda lista.
   - A guarda vem logo depois do `SEED_FICTICIO` e antes de abrir a transação.
   - O resultado novo é `'recusado_producao'` em `ResultadoSeed`, com a mensagem fixa própria.
   - Na homologação, a recusa não derruba a subida, como as outras recusas. A homologação usa
     `http://127.0.0.1:3200`, então essa recusa nunca acontece nela.
6. **M-08: recusa logo depois da trava, antes de toda outra conferência.**
   - Em `registrarDecisao`, o retorno de `travarDemanda` é guardado. Se `ehStatusFinal(status)`, sai
     `conflito(MENSAGENS_DECISAO.demandaFinal)`, antes de `obterPacoteDecisao` e do `jaDecidido`. Um DEC já decidido numa
     demanda final também recebe essa mensagem, e o teste fixa isso.
   - `gerarPedido` passa a seguir o mesmo padrão de `decidir.ts:203-208`:
     - lê o `demandaId` do DEC (404 se não existe);
     - trava a demanda e recusa por status final;
     - só depois lê o DEC com `obterPacoteDecisao`.

     Assim o `desatualizado` também é lido sob a trava.
   - Fonte dos finais: `ehStatusFinal` de `transicoes.ts`, sem segunda lista.
7. **Textos das duas recusas** (em minúscula, porque a tela acrescenta "Não foi possível concluir: "):
   - `MENSAGENS_DECISAO.demandaFinal = 'a demanda está em status final; o pacote não pode mais ser decidido.'`
   - `MENSAGENS_PEDIDO.demandaFinal = 'a demanda está em status final; o pacote não gera mais Pedido de Construção.'`
   A cadeia curta não tem etapa de interface. Os textos seguem o padrão dos 409 que já existem e ficam marcados para
   revisão da `ux-ui-design` à parte.
8. **Aviso:** `classificar` passa a pôr em `transitorio` o 408, o 409, o 429 e o 5xx. O comentário diz que o 409 de
   corpo diferente com a mesma Idempotency-Key também gasta as 3 tentativas e termina `falhou`. É limitado, e aceito.
9. **CI fica com a `05-entrega`.** `.github/` está na lista **Pode** do `devops-sre`, e não na de nenhum engenheiro.

### Arquivos

**`03-correcao` (engenheiro-backend):**
- M-05:
  - `src/modules/acesso/exigir-pessoa.ts` e um erro novo (`ErroLeituraSessao`, em `src/lib/erros.ts` ou ao lado de
    `exigir-pessoa.ts`);
  - `src/instrumentation.ts`;
  - `src/lib/console-saneado.ts` (novo);
  - `src/lib/log.ts` (`erroId`);
  - o comentário de `src/app/error.tsx:4`, que agora é verdade, só se for preciso citar o caminho.
- M-06: `src/modules/demandas/consultas.ts`, `src/app/api/demandas/[id]/route.ts`, `src/app/api/demandas/route.ts`.
- M-07: `scripts/seed-ficticio.ts`, `scripts/start-hml.ts` (texto da linha 90), `src/lib/env.ts` (exportar `ehLoopback`).
- M-08: `src/modules/pacotes-decisao/decidir.ts`, `src/modules/pedido-construcao/gerar.ts`.
- Aviso: `src/modules/avisos/enviador.ts` (`classificar` e o comentário das linhas 21-22) e os comentários de
  `src/modules/avisos/aviso-dec.ts:15,179-180`.
- Versão: `package.json` (0.1.6) e `test/estatico/projeto.test.ts`.
- Os testes ao lado de cada arquivo.

**`05-entrega` (devops-sre):** `.github/workflows/ci.yml` (8 `uses:` e o cabeçalho das linhas 5-6),
`.github/workflows/deploy.yml` (1 `uses:` e a linha 12) e `docs/operacao/deploy.md:244-253`.

### Ordem na `03-correcao`, pelo prazo

Do mais certo ao mais incerto. Assim o que já está pronto não fica em risco:

0. a versão 0.1.6;
1. o Aviso;
2. o M-08;
3. o M-07;
4. o M-06;
5. o M-05, nas peças (a), (b) e (c), nesta ordem.

Cada passo começa pelo teste que falha, e `pnpm test` roda no fim de cada passo.

**Saída autorizada para o prazo:** se a peça (c) do M-05 não ficar verde até as **15h30 UTC**, entregue com (a) e (b)
e registre (c) como desvio na entrega, com a causa. Assim o token fica coberto, e o resto da saída do console vai a
registro para Fabiano decidir na P3. Nenhum outro item tem essa saída.

### Proibido, e recusado na revisão como alto

- Mandar ao log, ao Sentry ou ao `console` original a mensagem, a pilha, o `cause`, os `params` ou o texto solto de um
  erro (C-21).
- Pôr no log `request.path`, cabeçalho, cookie ou `digest` fora do formato.
- Uma segunda lista de loopback ou de status finais.
- Guarda do seed que leia `env.BETTER_AUTH_URL`, porque quebra o e2e.
- Comparar o loopback por prefixo, sufixo ou `includes`.
- Recusa por status final depois de qualquer insert, evento ou leitura do DEC fora da trava.
- `gerarPedido` sem `travarDemanda`.
- Usar `entrada_invalida` ou `nao_processavel` na recusa por status final.
- Minimização por lista de negação (`if (ator.tipo === 'agente')`): só `pessoa` vê a vista inteira.
- Desligar o `no-console` fora da única linha de `console-saneado.ts` que troca os métodos. Essa linha leva
  `eslint-disable-next-line no-console` com a razão (G3.7).
- Tirar o 429 ou o 5xx de `transitorio`, ou pôr outro 4xx nele além do 408 e do 409.
- Apagar a linha 125 de `enviador.test.ts`: ela muda de `recusado` para `transitorio`, e não some.
- Afrouxar asserção, ou usar `.skip`, `.only` ou `.todo`.
- Criar migration, ou mexer em `src/db/`, `e2e/`, `.github/` ou `docs/`.
- Ler `.env` ou usar dado pessoal real.

### Teste de regressão esperado

Todos usam o sentinela fictício `token-ficticio-SENTINELA-0007`.

- **M-05 (a)**, em `exigir-pessoa.test.ts`. O `getSession` falso lança um erro com o sentinela em `message`, em
  `cause.message` (com `code: '57P01'`), na pilha e num campo `params`.
  - `exigirPessoaNaPagina` rejeita com `ErroLeituraSessao` e `code: '57P01'`, sem o sentinela em `message`, `stack`,
    `JSON.stringify` nem `cause`.
  - O mesmo vale por `exigirPessoa` e por `exigirSessaoParaConfigurar2fa`.
- **M-05 (b)**, em `instrumentation.test.ts`. Com o mesmo erro e `digest: '1234567890'`, `onRequestError` grava uma
  linha só, com `evento: 'erro_requisicao'`, `rota: '/demandas/[id]'`, `erroId: '1234567890'` e
  `erro: { classe, code: '57P01' }`, sem o sentinela, e chama `capturarErro` com o evento.
  - Com `digest` fora do formato, sai sem `erroId`.
  - Fora do runtime Node, não faz nada.
- **M-05 (c)**, em `console-saneado.test.ts`. Depois de instalado, `console.error(erro)`,
  `console.error('texto com o sentinela', erro)` e `console.warn(erro)` gravam só pelo `log`.
  - Com espiões em `process.stdout.write` e `process.stderr.write`, o sentinela não aparece em nenhum dos dois.
  - O teste desinstala no fim.
- **M-06**, nos testes de contrato da rota (`demandas.test.ts` ou `demandas.bordas.test.ts`):
  - `GET /api/demandas/:id` com token de agente: sem as chaves `solicitanteNome` e `anexos`, `responsavel` igual a
    `{ tipo: 'pessoa' }` e nenhum `autor.nome` nas versões;
  - com pessoa, tudo como hoje;
  - o `POST` do `orquestrador`, com a mesma regra;
  - a listagem, nos dois atores, sem essas chaves;
  - a demanda de autor agente segue `{ tipo: 'agente', agente }`.
- **M-07**:
  - recusa com `SEED_FICTICIO=1`, banco vazio e `urlBase` em `https://orquestrador.exemplo.test`,
    `http://127.0.0.1.exemplo.test`, `https://localhost.exemplo.test` e `http://10.0.0.5:3101`. A recusa sai com código 1
    e a mensagem fixa, que cita `BETTER_AUTH_URL` e não a URL, e o banco fica sem nenhuma conta;
  - semeia com `http://127.0.0.1:3101`, `http://localhost:3101` e `http://[::1]:3101`.
- **M-08**:
  - aprovar, devolver e arquivar um DEC pendente em demanda `encerrada` e `entregue` dá 409 com
    `MENSAGENS_DECISAO.demandaFinal`, sem linha em `aprovacao`, `decisao` nem `evento_historico`, e a demanda segue no
    status final;
  - o mesmo para o DEC já decidido;
  - `gerarPedido` de um DEC aprovado em demanda `entregue` e `encerrada` dá 409 com `MENSAGENS_PEDIDO.demandaFinal`, sem
    o evento `pedido_gerado`;
  - nos status não finais, tudo segue como hoje.
- **Aviso**:
  - 408 e 409 resultam em `transitorio`; 400, 401, 403, 410, 413 e 422 seguem `recusado`;
  - `enviarAviso` com 409 fica `pendente`, com `tentativas: 1`, e termina `falhou` na 3.ª.
- **`test/estatico/projeto.test.ts`:** versão 0.1.6.

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-backend). O maestro confere de novo no `verificar` |
| `pnpm test:e2e` verde três vezes seguidas | `04-regressao` (qa-automacao) |
| `CHANGELOG.md` com a versão 0.1.6 | `06-documentacao` (documentacao-tecnica). O `version` do `package.json` e o `test/estatico/projeto.test.ts` ficam com a `03-correcao` (passo 0) |
| PR com CI verde | Parada 3 (maestro), depois da `05-entrega`. É o CI do PR que prova os SHA da `05-entrega` |

**Para a `04-regressao`:**
- Rode `pnpm test:e2e` três vezes seguidas, cada uma num banco novo, com 0 pulado.
- O `e2e/decisao.spec.ts` "Arquivar" deixa a demanda `encerrada`. Decidir de novo nela passa a dar 409 com
  `MENSAGENS_DECISAO.demandaFinal`. Isso é o comportamento novo e certo. Se algum spec montar a cena decidindo ou gerando
  Pedido em demanda final, o ajuste é da cena, com demanda própria, e não da regra. Registre cada spec ajustado.
- Se algum spec ler `GET /api/demandas/:id` com token de agente e esperar `solicitanteNome`, `anexos` ou nome de conta,
  ele muda para o contrato novo.

**Para a `05-entrega`:**
- Fixe as 9 `uses:` como `actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0` e
  `actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5.0.0`, sem trocar a versão maior.
- Tire "SHA pendente" dos `uses:` e dos cabeçalhos (`ci.yml:5-6`, `deploy.yml:12`).
- Atualize `docs/operacao/deploy.md:244-253`, que hoje registra a fixação como pendência.
- Nada muda no `Dockerfile`. O `docker build` confere que a imagem sai com a 0.1.6.

**Para a `06-documentacao`:** a entrada 0.1.6 do `CHANGELOG.md` traz as mudanças de comportamento:
- erro de página e layout vai ao log com `erro_requisicao` e `erroId`, e o console do app não leva mais mensagem de
  erro;
- o agente não recebe nome do solicitante, anexos nem nome de conta na leitura de demanda;
- o seed recusa URL fora do loopback;
- decidir DEC e gerar Pedido em demanda final dá 409;
- 408 e 409 do Resend são tentados de novo;
- as actions estão fixadas por SHA.

O manual técnico muda junto onde descrever o log, o contrato da API para agente ou o seed.

## Decisões tomadas

- M-05 com a peça (a) na origem (`lerPessoa`): é o único ponto por onde o token passa, e protege seja qual for a forma de o Next registrar, que não pude ler.
- M-05 com a peça (c) central no console: é o único jeito de cobrir toda página, layout e componente assíncrono sem embrulhar cada um, e fica depois de `lerConfigApp` para o erro de boot seguir legível.
- O teste do M-05 é de unidade, com espião nas saídas reais do processo, e não um e2e com falha de banco provocada: o e2e não tem injeção de falha, e criá-la não cabe na janela de hoje. O risco que sobra fica nas Pendências.
- `erroId` entra na lista de permissão: identificador com formato validado, sem conteúdo, e é o que casa o log, o Sentry e a tela 2.8.
- A minimização do M-06 é por lista de permissão (só `pessoa` vê tudo), pela lição dos filtros que travaram com lista de negação.
- O M-06 vale também no `POST /api/demandas`, para o agente ter um contrato só.
- A autoria nas leituras de ESP, RSK e DEC fica fora: não está no texto aprovado da ESP e não cabe no prazo. Vai a registro.
- A guarda do seed lê `deps.config.urlBase`: serve aos três caminhos, e a do `env` quebraria o e2e.
- O M-08 recusa logo depois da trava, antes de ler o DEC, e `gerarPedido` passa a travar: fecha a corrida com o encerramento e com uma ESP nova.
- Textos das recusas do M-08 decididos aqui pelo padrão dos 409 existentes, porque a cadeia curta não tem etapa de interface. Ficam marcados para a `ux-ui-design`.
- `engenheiro-backend` sozinho na 03: tudo está em `src/`, `scripts/`, `test/` e `package.json`, na lista **Pode** dele.
- O CI vai à `05-entrega`: `.github/` só está na lista **Pode** do `devops-sre`.
- Todos os itens cabem no prazo. A ordem e o limite das 15h30 UTC para a peça (c) protegem a janela: sobra cerca de 1h para a 04 (o e2e três vezes levou 55 min no pedido 0006) e o tempo da 05, da 06 e da P3 até 17h45.
- Sem migration: nenhuma coluna nem tabela muda.
- As ferramentas Grep e Glob não estão disponíveis nesta sessão. Li tudo pela ferramenta Read e listei arquivos com `git show` e `git diff --name-only`, ambos da minha lista **Pode**.

## Pendências

- Para registro à parte (novo médio, fora deste pedido): as leituras próprias de ESP, RSK e DEC pela API devolvem ao token de agente o nome da conta autora (`especificacoes/consultas.ts:63`, `pareceres-risco/consultas.ts:50`, `pacotes-decisao/consultas.ts:148`), e o DEC devolve também `aprovadores[].nome` e `decisao.decididaPor` (`pacotes-decisao/consultas.ts:115,155`). É o mesmo critério do RF-20, e está fora do texto da ESP.
- Risco que sobra no M-05, para a P3: a prova é de unidade. Se o Next escrever erro de renderização direto no `process.stderr`, sem passar pelo `console`, a peça (c) não pega, e só a (a) segue garantida. Para conferir, basta o passo 2 da D-01 na homologação: parar o `db`, abrir `/demandas` e ler o log do `app`. Esse passo não está na lista **Pode** de nenhuma etapa da cadeia curta.
- Para a `ux-ui-design`, à parte: revisar os dois textos de 409 do M-08 e decidir se a tela do DEC esconde as ações quando a demanda está em status final.
- Se a `03-correcao` usar a saída das 15h30 UTC, a peça (c) do M-05 sai do pedido com registro, e Fabiano decide na P3.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -5 --format="%h %ci %s"` — base 295d3f2 (01-reproducao), 13h53 UTC
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show "HEAD:src/app/(painel)/"` — pastas do painel
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -25 --format="%h %ci %s" a128c86` — tempo de cada etapa do pedido 0006, para o prazo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src/app src/instrumentation.ts src/lib scripts e2e .github` — lista de páginas, adaptadores, scripts e workflows
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- src/modules/demandas src/modules/pacotes-decisao src/modules/pedido-construcao src/modules/avisos src/modules/acesso src/db eslint.config.mjs package.json CHANGELOG.md src/lib/deps.ts` — módulos e testes afetados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/` — estáticos que podem mudar

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
