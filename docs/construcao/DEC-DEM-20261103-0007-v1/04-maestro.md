---
pedido: DEC-DEM-20261103-0007-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, git diff main...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261103-0007-v1` contra a `main` (`e0d5f4c`, versão 0.1.5). O código de produção
mudou em `src/` e `scripts/`; o resto são testes, `package.json` (0.1.6) e as entregas. Nada em `src/db/`, `drizzle/`,
`e2e/` nem `.github/`: os SHAs das actions ficam para a 05-entrega, como a triagem decidiu (D-06), porque `.github/` só
está na lista **Pode** do `devops-sre`.

- **M-05 (C-21):** `src/instrumentation.ts` ganha `onRequestError` (evento `erro_requisicao`, com o modelo da rota, o
  método e o `digest` validados, e o erro reduzido pelo log) e instala no boot `src/lib/console-saneado.ts`, que troca
  `console.error` e `console.warn` por uma linha do log por lista de permissão; `src/modules/acesso/exigir-pessoa.ts`
  embrulha a falha do `getSession` em `ErroLeituraSessao`, com mensagem fixa e sem `cause`.
- **M-06 (C-10, RF-20):** `vistaDaDemandaPara` (`src/modules/demandas/consultas.ts`) monta, para quem não é pessoa, a
  vista chave a chave, sem `solicitanteNome`, anexos e o nome da conta autora; as rotas `GET /api/demandas/[id]` e
  `POST /api/demandas` usam a vista.
- **M-07 (C-37):** o seed recusa (`recusado_producao`) quando o `BETTER_AUTH_URL` validado não está no loopback, antes
  de abrir a transação; `ehLoopback` sai de `src/lib/env.ts`, a mesma lista do cookie Secure.
- **M-08:** `registrarDecisao` e `gerarPedido` travam a demanda e recusam com 409 o status final antes de ler o DEC ou
  gravar qualquer coisa, com a fonte única `ehStatusFinal`.
- **Aviso:** o enviador classifica 408 e 409 do Resend como transitórios.

Revisões usadas:

- **Código:** li o diff inteiro de `src/` e `scripts/` e rodei a skill `code-review` em nível baixo, que não apontou
  nada. A saída da skill parou no meio do trecho de `gerar.ts`; esse trecho eu li inteiro.
- **Segurança:** agente `seguranca-aplicacao`, sobre o diff do commit da correção (`e54d4bd`), com a 01, a 02 e a 03,
  como prevê a seção 3 do `construir.md`. Ele não gravou arquivo. A 04-regressao só acrescentou testes depois desse
  commit (5 arquivos, nenhum de produção). A skill `security-review` não roda aqui: ela lê a pasta da sessão
  (estruturaAutonoma), e não o repositório do pedido.

Critérios de aceite confirmados:

1. M-05: erro não tratado do painel não sai com mensagem, causa ou parâmetro; vai ao log com evento fixo e
   identificador. A segurança não achou caminho que leve o token ao stdout, ao log ou ao Sentry, nem pelos caminhos
   internos do Next 16.4.1.
2. M-06: o token de agente não recebe `solicitanteNome`, anexos nem o nome da conta autora na leitura e na criação de
   demanda; a pessoa recebe tudo.
3. M-07: o seed recusa a URL fora do loopback mesmo com `SEED_FICTICIO=1` e banco vazio; homologação e e2e seguem
   semeando. A segurança tentou `localhost.algo`, `127.0.0.1.nip.io`, `localhost.`, `[::ffff:127.0.0.1]` e
   `127.0.0.1@evil`, e todos são recusados.
4. M-08 e Aviso: recusa sob a trava, sem corrida; 408 e 409 não abrem laço nem duplicata (chave de idempotência fixa,
   linha travada e teto de 3 tentativas).
5. Testes: `pnpm test` 3.879 de 3.879; `pnpm test:e2e` 143 de 143 em três rodadas, com banco novo em cada uma.

### Achados por severidade

**Crítico e Alto:** nenhum.

**Médio**

- **M-1** (`src/modules/demandas/consultas.ts:199-222` e `:225`, `seguranca-aplicacao`, RF-20/LGPD): a vista para o
  agente tira as chaves e o nome do autor, mas devolve `titulo`, `contexto`, `descricaoProblema`,
  `justificativaUrgencia`, `impactoPercebido` e `duvidasEntrada` sem `minimizar`; o `titulo` da listagem
  `GET /api/demandas` também. A entrada do agente troca nome, e-mail, CPF, CNPJ e telefone por marcadores. Com um
  token de agente, nome ou contato escrito no texto livre sai inteiro, e o comentário "o mesmo critério da entrada do
  agente" não é verdade hoje.
- **M-2** (`src/modules/especificacoes/consultas.ts:63`, `src/modules/pacotes-decisao/consultas.ts:148-155`,
  `seguranca-aplicacao` e 02-triagem): as leituras de ESP, RSK e DEC seguem dando ao agente `autor.nome`,
  `aprovadores[].nome`, `referenciaDocumento` e `decididaPor`. A triagem deixou fora do M-06 por não estar no texto
  aprovado; precisa de dono e prazo.
- **M-3** (`src/lib/console-saneado.ts:31-32`, `seguranca-aplicacao`, operacional): o que não é requisição
  (`uncaughtException`, `unhandledRejection`, `onError` do `after()`) perde a pilha e não vai ao Sentry, que roda com
  `defaultIntegrations: false`; aviso só de texto do Next vira `console_erro` sem pista. Não vaza dado; dificulta o
  diagnóstico em produção. Sugestão: chamar `capturarErro` quando o argumento for `Error` sem `digest`.

**Baixo**

- **B-1** (`src/instrumentation.ts:51`): `erro: err` vai cru ao log; com valor que não é `Error`, o `normalizarErro`
  tem `redact` de um nível só. Não é explorável hoje, porque o Next converte antes; `reduzirErro(err)` fecha.
- **B-2**: o Next guarda `console.warn` ao carregar um módulo e o `onError: console.error` do `next-server`,
  possivelmente antes do `register`. São avisos de API dinâmica e erros do `after()`, sem token.
- **B-3**: a guarda do M-07 lê o `BETTER_AUTH_URL`, não o `DATABASE_URL`. Quem trocar só a URL cai ainda na guarda de
  banco com conta e demanda. Defesa em profundidade, aceitável.
- **B-4**: as mensagens novas do M-08 (`demandaFinal` em `decidir.ts` e `gerar.ts`) foram escritas na triagem e pedem
  a revisão da `ux-ui-design`.
- **B-5** (comportamento novo, pela ESP aprovada): gerar de novo o Pedido de um DEC numa demanda `entregue` passa a dar
  409. Antes, o mesmo DEC gerava sempre o mesmo Pedido (CA-22.2) em qualquer status.

Segurança: sem achado crítico ou alto. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- M-1 a M-3 e B-1 a B-5 vão para Pendências: o roteiro só devolve Crítico e Alto. A 0.1.6 é uma melhora estrita sobre
  a 0.1.5 nos quatro médios do pedido 0001 que fecha, e não está em produção.
- O M-1 é de dado pessoal: pela regra, não fica como dívida sem o aceite de Fabiano e da `gestao-riscos`. O maestro
  recomenda corrigi-lo, com o M-2 e o M-3, num pedido 0008 **antes da primeira publicação** (CA-P5-16), e registra isso
  no `pr.md` e no backlog.
- Liberações nesta cadeia: na 03, nove comandos só de leitura (`git show` de pastas, `git grep`, `pnpm exec eslint` e
  `tail` em saída gravada), liberados pelo maestro pela regra de Fabiano de 25/10 e registrados no `passagens.jsonl`.
  Na 04, a `qa-automacao` rodou um `wc -l` e um `date -u` (só leitura) e os declarou em prosa, sem bloqueio
  registrado: é o "regravar sem o comando" que a R1.4 do parecer da `governanca-ia` de 03/11 pede para acabar.

## Pendências

- Para um pedido 0008 antes da primeira publicação: M-1 (minimizar o texto livre na vista do agente e na listagem),
  M-2 (autoria nas leituras de ESP, RSK e DEC) e M-3 (diagnóstico do erro fora de requisição); B-1 junto.
- Para Fabiano e a `gestao-riscos`: o aceite ou não do M-1 como risco até o 0008.
- Para a `ux-ui-design`: B-4. Para quem mexer no fluxo de Pedido: B-5.
- Para o `devops-sre` (05): os 9 `uses:` fixados por SHA e o "SHA pendente" fora dos cabeçalhos, como a 02 detalhou;
  o CI do PR prova.
- Para a `documentacao-tecnica` (06): o CHANGELOG da 0.1.6 e o `deploy.md`.
- Para Fabiano: as pendências da primeira publicação (CA-P5-16).

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (leitura integral e skill `code-review`, nível baixo)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` lê a pasta da sessão)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
