---
pedido: DEC-DEM-20261103-0008-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, pedido.json, 01-qa-funcional.md, DEC-DEM-20261103-0007-v1/02-tech-lead.md, src/modules/demandas/consultas.ts (180-253), src/app/api/demandas/route.ts, "src/app/api/especificacoes/[espId]/route.ts", src/modules/agentes/entrada-agente.ts (110-154), src/modules/dados-pessoais/minimizar.ts, src/modules/pacotes-decisao/consultas.ts (95-169), src/lib/console-saneado.ts, src/lib/sentry.ts, src/instrumentation.ts]
status: pronto
proximo: engenheiro-backend
devolvido_para: null
---
## Entrega

### Causa provável

Concordo com a reprodução da 01 nos quatro achados. Conferi o caminho de cada um no código do ramo (main 0.1.6).

1. **M-1 (RF-20, dado pessoal).** `vistaDaDemandaPara` (`src/modules/demandas/consultas.ts:199-223`) corta chaves, mas
   copia cru o texto livre: `titulo` (l. 203), `justificativaUrgencia` (209), `contexto` (210), `descricaoProblema`
   (211), `impactoPercebido` (212) e `duvidasEntrada` (213). O `POST /api/demandas` usa a mesma função
   (`route.ts:12`). O `GET /api/demandas` (`route.ts:15-17`) nem recebe o `ator`, e `listarDemandas`
   (`consultas.ts:225-252`) devolve `titulo` cru e não seleciona `solicitanteNome`. A minimização certa já existe e não é
   usada aqui: `minimizarValor` (`entrada-agente.ts:127-131`), que fica privado no módulo do agente, sobre `minimizar`
   (`dados-pessoais/minimizar.ts:54`).
2. **B-1.** `onRequestError` passa `erro: err` cru (`src/instrumentation.ts:51`). Valor que não é `Error` atravessa o
   `normalizarErro` do log como objeto.
3. **M-2.** As sete rotas de leitura de ESP, RSK e DEC chamam a consulta sem o `ator` (ex.:
   `src/app/api/especificacoes/[espId]/route.ts:8`). A vista leva `autor` por `responsavelDe` com o nome
   (`especificacoes/consultas.ts:63`, `pareceres-risco/consultas.ts:50`, `pacotes-decisao/consultas.ts:148`),
   `aprovadores[].nome` e `referenciaDocumento` (`pacotes-decisao/consultas.ts:115,118`) e `decisao.decididaPor` (`:155`).
4. **M-3.** `saneado` (`src/lib/console-saneado.ts:31-32`) só chama `log[nivel]`; o log reduz o Error a `{ classe, code }`
   e o `redact` tira a pilha. Nada chama `capturarErro`, e o Sentry roda com `defaultIntegrations: false`
   (`src/lib/sentry.ts:14`), sem integração própria para `uncaughtException` e `unhandledRejection`.

### Decisões sobre os pontos que a 01 deixou para a triagem

1. **M-1: uma função só de minimização, sem cópia.** `minimizarValor(v, nomes)` sai de `entrada-agente.ts` e passa a
   ser exportada de `src/modules/dados-pessoais/minimizar.ts` (nome sugerido: `minimizarValor`). `entrada-agente.ts`
   passa a importá-la, sem mudar comportamento (os testes dele seguem verdes, sem ajuste). `nomes` é
   `[solicitanteNome]` quando não é nulo, e `[]` quando é.
2. **M-1: leitura e criação.** Em `vistaDaDemandaPara`, para quem não é pessoa, `titulo`, `justificativaUrgencia`,
   `contexto`, `descricaoProblema`, `impactoPercebido` e cada item de `duvidasEntrada` passam por `minimizarValor` com o
   nome do solicitante da própria demanda (`d.solicitanteNome`). Nulo continua `null`, sem sumir a chave: a vista mínima
   mantém o formato de hoje (difere do `escolher` do agente, que descarta nulo). A pessoa segue com `return d` na l. 200.
3. **M-1: listagem sem mexer no painel.** As páginas do painel podem chamar `listarDemandas` direto; a assinatura dela
   não muda. Entra `listarDemandasPara(db, filtro, ator)` em `consultas.ts`, usada só pelo `GET /api/demandas`, que passa
   a receber `ator` em `rota()`. A consulta é uma só (privada, sem segundo SELECT copiado), com `solicitanteNome` a mais,
   usado só para a troca: **nenhum ator recebe a chave `solicitanteNome` na listagem**, e o item sai com as mesmas chaves
   de hoje. Para a pessoa, `titulo` original; para os outros, `titulo` minimizado com o nome do **seu** solicitante.
4. **M-1: lista de permissão.** Só `ator.tipo === 'pessoa'` recebe o original; `agente` e `sistema` recebem o
   minimizado. Nada de `if (ator.tipo === 'agente')`.
5. **M-2: corte na rota, por função `...Para(ator, vista)` em cada consultas.ts**, como `vistaDaDemandaPara`, para o
   painel não perder o nome:
   - `vistaDaEspecificacaoPara`, `vistaDoParecerPara` e `vistaDoPacotePara`, aplicadas nas sete rotas
     (`especificacoes/[espId]`, `pareceres-risco/[rskId]`, `pacotes-decisao/[decId]`, `pacotes-decisao` (fila),
     `demandas/[id]/especificacoes`, `demandas/[id]/pareceres-risco`, `demandas/[id]/pacotes-decisao`), item a item nas
     listas;
   - pessoa: a vista inteira, como hoje;
   - outro ator: o objeto é montado chave a chave (campo novo não sai sem entrar na lista), com `autor` por
     `responsavelMinimo` (autor pessoa vira `{ tipo: 'pessoa' }`; autor agente igual). `responsavelMinimo` é exportado de
     onde está hoje (`demandas/consultas.ts:187`) ou movido para junto de `responsavelDe`; **uma cópia só**;
   - em `aprovadores[]`, as chaves `nome` e `referenciaDocumento` somem (sem `null`); `papel`, `opcao`, `registradaEm` e
     `dataDocumento` ficam;
   - em `decisao`, a chave `decididaPor` some; `decisao: null` continua `null`.
6. **M-2 não amplia o escopo.** `demandaTitulo`, `demandaDescricao` e `decisao.comentarios` do DEC e o texto livre de ESP
   e RSK continuam como hoje: o texto aprovado da ESP do 0008 não os cita, e ampliar exige aceite de Fabiano. Vão às
   Pendências como achado novo.
7. **M-3: só `console.error` vai ao Sentry.** Em `saneado('error')`, depois da linha do log, se houver Error e ele não
   tiver a chave `digest` (`!('digest' in erro)`), chama `capturarErro(erro, { evento: 'console_erro' })`. Com `digest`
   (inclusive os de controle do Next, `NEXT_REDIRECT...`), não envia: esse já vai pelo `onRequestError`.
   `console.warn` fica só no log: aviso não é falha, e o Next usa o `warn` para avisos de uso, o que encheria o Sentry.
   A spec fala de "erro fora de requisição", que o Node escreve por `console.error`.
8. **M-3: dentro da guarda.** A chamada a `capturarErro` fica dentro do mesmo `try` e da mesma guarda `escrevendo`: falha
   do Sentry não entra em laço, não cai no console original e não derruba quem chamou.
9. **B-1:** `erro: reduzirErro(err)`, importado de `src/lib/reduzir-erro.ts` pelo mesmo `await import` do arquivo.
   `capturarErro(err, ...)` na l. 53 fica como está (ele já reduz).
10. **`engenheiro-backend` sozinho na 03:** tudo está em `src/`, `test/` e `package.json`, na lista **Pode** dele. Sem
    migration: nenhuma coluna nem tabela muda.

### Arquivos (`03-correcao`, engenheiro-backend)

- M-1: `src/modules/dados-pessoais/minimizar.ts` (exportar `minimizarValor`), `src/modules/agentes/entrada-agente.ts`
  (importar, apagar a cópia local), `src/modules/demandas/consultas.ts` (`vistaDaDemandaPara`, `listarDemandasPara`),
  `src/app/api/demandas/route.ts` (GET com `ator`).
- B-1: `src/instrumentation.ts`.
- M-2: `src/modules/especificacoes/consultas.ts`, `src/modules/pareceres-risco/consultas.ts`,
  `src/modules/pacotes-decisao/consultas.ts`, o lugar de `responsavelMinimo`, e as sete rotas do item 5.
- M-3: `src/lib/console-saneado.ts`.
- Versão: `package.json` (0.1.7) e `test/estatico/projeto.test.ts`.
- Os testes ao lado de cada arquivo e os de contrato da API (`src/app/api/demandas/demandas.test.ts` ou
  `demandas.bordas.test.ts`, e os de ESP, RSK e DEC).

### Ordem na `03-correcao`, pelo prazo

Do mais certo ao mais incerto, com o dado pessoal primeiro:

1. **M-1** (leitura, criação, listagem);
2. **B-1** e a **versão 0.1.7**;
3. **M-2** (ESP, depois RSK, depois DEC);
4. **M-3**.

Cada passo começa pelo teste que falha, e `pnpm test` roda no fim de cada passo.

**Saída autorizada para o prazo:** se o **M-2** ou o **M-3** não estiver verde até as **16h50 UTC**, entregue com o que
estiver verde (M-1 e B-1 no mínimo, mais o que fechou) e registre o item que ficou fora como desvio na entrega, com a
causa. Ele volta a registro para Fabiano decidir na P3. **M-1 e B-1 não têm essa saída:** o M-1 é o que bloqueia a
primeira publicação. Se o M-1 não ficar verde até as 16h50 UTC, o pedido não cabe na janela de hoje; registre na entrega
e o maestro decide.

### Proibido, e recusado na revisão como alto

- Minimizar também para a pessoa, ou decidir a vista por lista de negação (`if (ator.tipo === 'agente')`).
- Segunda cópia de `minimizar`, `minimizarValor` ou `responsavelMinimo`.
- Minimizar o item da listagem com o nome de outro solicitante, ou expor a chave `solicitanteNome` na listagem.
- Mudar a assinatura de `listarDemandas`, `obterEspecificacao`, `obterParecerRisco` ou das consultas de DEC usadas pelo
  painel, ou cortar nome na tela da pessoa.
- Vista mínima de ESP, RSK e DEC por spread com remoção (`{ ...v, autor }`): é chave a chave.
- Mandar ao log ou ao Sentry a mensagem, a pilha crua, o `cause`, os `params` ou o texto solto (C-21); `capturarErro`
  fora da guarda `escrevendo`; enviar ao Sentry o Error com `digest`.
- Ligar `defaultIntegrations` ou qualquer integração do Sentry.
- Afrouxar asserção, usar `.skip`, `.only` ou `.todo`; afrouxar C-10, C-21, C-23, A-02, axe ou C-36.
- Criar migration, ou mexer em `src/db/`, `e2e/`, `.github/`, `docs/` ou `CHANGELOG.md`.
- Ler `.env` ou usar dado pessoal real.

### Teste de regressão esperado

Dados fictícios da 01: solicitante `Maria Ficticia Teste`, T =
`Falar com Maria Ficticia Teste, maria.teste@exemplo.invalid, CPF 123.456.789-09, tel (11) 90000-0000`, aprovadora
`Joana Exemplo Silva` com `ATA-FICTICIA-001`, conta `Carlos Exemplo CTO`.

- **M-1**, nos testes de contrato da rota:
  - `GET /api/demandas/:id` com token de agente: os seis campos (e cada item de `duvidasEntrada`) vêm com
    `[nome removido]`, `[e-mail removido]`, `[CPF removido]` e `[telefone removido]`; `JSON.stringify` do corpo não contém
    nenhum dos quatro valores fictícios;
  - com o cookie da pessoa: o texto original, sem marcador;
  - `POST /api/demandas` do `orquestrador`: a mesma regra no 201; o da pessoa, original;
  - `GET /api/demandas` com agente e com pessoa: o `titulo` do item minimizado só para o agente, nenhuma chave
    `solicitanteNome` nos dois; duas demandas de solicitantes diferentes, cada `titulo` com a troca do próprio nome;
  - campo nulo segue `null` para o agente; ator `sistema` recebe o minimizado;
  - os testes de `entrada-agente` seguem verdes sem alteração.
- **B-1**, em `instrumentation.test.ts`: `onRequestError` com objeto simples `{ message, query, params }` (com o e-mail e
  o nome fictícios) grava `erro: { classe: 'desconhecido' }` (o valor que `reduzirErro` devolve), sem `query`, `params` nem
  os valores fictícios na linha.
- **M-2**, nos testes de contrato de ESP, RSK e DEC, nas sete rotas:
  - agente, autoria pessoa: `autor` igual a `{ tipo: 'pessoa' }`; nos `aprovadores[]`, sem as chaves `nome` e
    `referenciaDocumento`; em `decisao`, sem `decididaPor`; o corpo não contém `Carlos Exemplo CTO`,
    `Joana Exemplo Silva` nem `ATA-FICTICIA-001`;
  - agente, autoria agente: `autor` igual a `{ tipo: 'agente', agente }`, como hoje;
  - pessoa: tudo como hoje;
  - DEC sem decisão e sem aprovadores: `decisao: null` e `aprovadores: []` para o agente.
- **M-3**, em `console-saneado.test.ts`, com `iniciarSentry({ dsn: 'https://chave@exemplo.invalid/1', transporte })`
  falso, sem rede:
  - `console.error('falha no after', new TypeError('... maria.teste@exemplo.invalid'))`: uma linha `console_erro` e
    **um** envelope, com título `TypeError` e sem a mensagem, o e-mail nem o texto solto;
  - `console.error` de Error com `digest` (`'abc123'` e `'NEXT_REDIRECT;...'`): a linha do log e **nenhum** envelope;
  - `console.warn` de Error sem `digest`: a linha `console_aviso` e nenhum envelope;
  - `capturarErro` que lança (Sentry falso que falha): `console.error` não lança, não chama o console original e não
    entra em laço;
  - o teste desinstala no fim.
- **`test/estatico/projeto.test.ts`:** versão 0.1.7.

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-backend). O maestro confere de novo no `verificar` |
| `pnpm test:e2e` verde três vezes seguidas | `04-regressao` (qa-automacao) |
| `CHANGELOG.md` com a versão 0.1.7 | `06-documentacao` (documentacao-tecnica). O `version` do `package.json` e o `test/estatico/projeto.test.ts` ficam com a `03-correcao` (passo 2) |
| PR com CI verde | Parada 3 (maestro), depois da `05-entrega` |

**Para a `04-regressao`:** `pnpm test:e2e` três vezes seguidas, cada uma num banco novo, com 0 pulado. Se algum spec ler
pela API com token de agente e esperar texto livre original da demanda, nome de autor, aprovador, `referenciaDocumento`
ou `decididaPor`, ele muda para o contrato novo; registre cada spec ajustado. Spec de tela (pessoa) não muda.

**Para a `05-entrega`:** nada muda no `Dockerfile` nem no `.github/`; o `docker build` confere que a imagem sai com a
0.1.7.

**Para a `06-documentacao`:** a entrada 0.1.7 do `CHANGELOG.md` traz as mudanças de comportamento:
- o ator que não é pessoa recebe o texto livre da demanda minimizado na leitura, na criação e na listagem;
- o ator que não é pessoa não recebe nome de pessoa nem `referenciaDocumento` nas leituras de ESP, RSK e DEC (se o M-2
  não usar a saída autorizada);
- erro sem `digest` escrito por `console.error` vai ao Sentry (se o M-3 não usar a saída autorizada);
- `onRequestError` grava o erro reduzido.

O manual técnico muda junto onde descrever o contrato da API para agente ou o envio ao Sentry.

## Decisões tomadas

- M-1 primeiro e sem saída de prazo: é dado pessoal e bloqueia a primeira publicação (CA-P5-16, CA-P5-20).
- `minimizarValor` vai para `dados-pessoais/minimizar.ts` e é reusado: a regra do agente e a da API ficam uma só, sem duplicação.
- Na vista mínima, nulo segue `null`: mantém o formato da 0.1.6 para o agente (caso exploratório 4 da 01).
- Listagem por `listarDemandasPara`, sem mudar `listarDemandas`: o painel não muda, e a pessoa não ganha a chave `solicitanteNome`.
- Lista de permissão (só pessoa vê o original), pela lição dos filtros que travaram com lista de negação.
- M-2 por funções `...Para(ator, vista)` montadas chave a chave, na rota: o painel da pessoa segue com o nome, e campo novo não vaza.
- `demandaTitulo`, `demandaDescricao`, `decisao.comentarios` e o texto de ESP e RSK ficam fora: não estão no texto aprovado, e ampliar exige Fabiano.
- M-3 só no `console.error`: aviso não é falha, e a spec trata de erro fora de requisição; o `digest` decide o não envio para não duplicar o `onRequestError`.
- `capturarErro` dentro da guarda `escrevendo`: falha do Sentry não entra em laço (caso exploratório 9).
- Saída autorizada às 16h50 UTC para M-2 e M-3: a 04 leva cerca de 55 min (pedido 0006) e a 05, a 06 e a P3 têm de caber até 18h15 UTC.
- `engenheiro-backend` sozinho na 03: tudo em `src/`, `test/` e `package.json`; o `CHANGELOG.md` fica com a 06.

## Pendências

- Para registro à parte (achado novo, fora deste pedido): o DEC devolve ao token de agente `demandaTitulo` e `demandaDescricao` (cópia da demanda, `pacotes-decisao/consultas.ts:141-142`) e `decisao.comentarios` (`:155`) sem minimizar, e o texto livre de ESP e RSK lido pela API também sai sem minimizar. Depois do M-1, o mesmo título sai minimizado na demanda e cru no DEC. Precisa do aceite de Fabiano para entrar.
- Risco que sobra no M-3, para a P3: a prova é de unidade. Não li o código do Next (o git não rastreia), então não confirmei que `uncaughtException`, `unhandledRejection` e `onError` do `after()` passam por `console.error` no runtime do Next 16. Se algum for direto ao `process.stderr`, não chega ao Sentry.
- Se a `03-correcao` usar a saída das 16h50 UTC, o item que ficou fora volta a registro, e Fabiano decide na P3.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
