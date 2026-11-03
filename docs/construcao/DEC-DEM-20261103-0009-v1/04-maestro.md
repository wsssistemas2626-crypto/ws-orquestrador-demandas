---
pedido: DEC-DEM-20261103-0009-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, git diff main...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261103-0009-v1` contra a `main` (`3c8a942`, versão 0.1.7). O código de produção
mudou em `src/` (16 arquivos com os testes); o resto são `package.json` (0.1.8) e as entregas. Nada em `src/db/`,
`drizzle/`, `scripts/`, `e2e/` nem `.github/`; sem migration.

- **M-a (RF-20):** `vistaDoPacotePara`, `vistaDaEspecificacaoPara` e `vistaDoParecerPara` recebem os nomes do
  solicitante da demanda e, para todo ator que não é pessoa, passam por `minimizarValor` todo texto livre: no DEC,
  `demandaTitulo`, `demandaDescricao`, `resumoExecutivo`, `recomendacao`, `opcaoA` e `opcaoB` subcampo a subcampo,
  `decisao.comentarios` e as listas da ESP citada; na ESP, os 15 campos de texto e de lista; no RSK, os 7. As 7 leituras
  e os 3 POST de criação (o 201) passam pela vista do ator. Os utilitários de `src/modules/demandas/consultas.ts`
  passaram a ser exportados e reaproveitados, sem cópia. A pessoa vê o original; o Pedido de Construção lê o banco e
  continua com o original.
- **B-b:** `normalizarErro` (`src/lib/log.ts`) reduz objeto que não é `Error` a `{ classe: 'desconhecido', code? }`,
  com o `code` por `lerCode`. A exceção é o erro que já chega reduzido na forma exata `{ classe, code? }`
  (`erroJaReduzido`, `src/lib/reduzir-erro.ts`), com a classe no formato de identificador: o `instrumentation.ts` já
  entrega `reduzirErro(err)`. Desvio aceito da 02, que reduzia todo objeto a `desconhecido` e quebrava o
  `instrumentation.test.ts`.

Revisões usadas:

- **Código:** li o diff de `src/` e rodei a skill `code-review` em nível baixo sobre o commit da correção (`a4af941`):
  sem achado (toda chamada nova é aguardada, opcionais protegidos, `?? []` na listagem, sem código morto nem cópia).
- **Segurança:** agente `seguranca-aplicacao`, sobre o commit da correção (`a4af941`), com a 01, a 02 e a 03. Ele não
  gravou arquivo. A 04-regressao só acrescentou testes depois desse commit.

Critérios de aceite:

1. Ator agente recebe o texto livre de DEC, ESP e RSK minimizado na leitura, na listagem e no 201 da criação; a pessoa
   recebe o original (`src/app/api/vistas-para-agente.test.ts`, dois atores, cada rota).
2. O Pedido de Construção gerado do DEC continua com o texto original (`src/app/api/pacotes-decisao/pedido.test.ts`).
3. `normalizarErro` reduz objeto que não é `Error` (`src/lib/log.test.ts`).
4. Testes: `pnpm test` 3.918 de 3.918; `pnpm test:e2e` 143 de 143 em três rodadas seguidas; lint e typecheck limpos (04-qa-automacao.md).

### Achados por severidade

**Crítico e Alto:** nenhum.

**Médio**

- **M-1 (risco residual de RF-20)** (`src/modules/demandas/consultas.ts:193,201-213`,
  `src/modules/dados-pessoais/minimizar.ts:36-40`, `seguranca-aplicacao`): só o nome **atual e completo** do
  solicitante é trocado. O `solicitanteNome` pode ser editado, e o DEC guarda cópia do título e da descrição do momento
  da criação, como a ESP e o RSK guardam texto antigo: o nome antigo, ou escrito pela metade ("a Joana pediu…"), sai em
  claro para o agente. Não é regressão: é o limite da regra que já valia para a demanda desde o M-1 do 0008, agora com
  alcance em DEC, ESP e RSK. Vai como risco residual para Fabiano e a `gestao-riscos`. Opções para pedido futuro:
  (a) guardar o nome anterior numa coluna só para minimizar, com o mesmo expurgo; (b) trocar cada parte do nome com 3
  letras ou mais, com custo de falso positivo e parecer.

**Baixo**

- **B-1** (`src/lib/reduzir-erro.ts:6,8,20-26`): `FORMATO_CODE` aceita um CPF ou telefone só de dígitos, e
  `erroJaReduzido` aceita como classe um nome de uma palavra; depende de quem chama o log passar esse valor (bem mais
  estreito que antes, quando o objeto inteiro saía). Sugestão: recusar `code` só de dígitos com 10 ou mais; classe só
  terminada em `Error` ou de lista conhecida.
- **B-2 (fechado)** (`src/app/api/vistas-para-agente.test.ts`): o teste não cobria CNPJ nem `opcaoA`/`quandoEscolher`.
  Corrigido na 04-regressao: CNPJ fictício no `TRECHO` e nos `FRAGMENTOS`, `opcaoA` com `quandoEscolher` e `desvantagens` ausente.
- **B-3** (`src/app/api/demandas/[id]/{especificacoes,pareceres-risco,pacotes-decisao}/route.ts:15-16`): nos 3 POST,
  os nomes são lidos depois de gravar; se essa leitura falhar, o artefato fica gravado e o agente recebe 500 genérico e
  pode repetir, criando versão duplicada. Sem vazamento. Sugestão: ler os nomes antes de chamar o serviço.

Segurança: sem achado crítico ou alto. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- M-1, B-1 e B-3 vão para Pendências: o roteiro só devolve Crítico e Alto. O M-1 é risco residual, não defeito desta
  correção.
- Rodei a revisão de código e a de segurança em paralelo com a 04-regressao, sobre o commit da correção, para caber na
  janela de Fabiano (até as 21h de 03/11). O B-2 foi passado ao `qa-automacao` durante a 04-regressao.
- Liberações nesta cadeia, todas só de leitura, pela regra de 25/10: na 02, um `ls` e um `cat` de `pedido.json`; na
  04-regressao, consultas `git log -G` ao histórico de `src/` (o registro no `passagens.jsonl` diz três; o agente
  declarou cinco ao regravar a entrega).

## Pendências

- Para Fabiano e a `gestao-riscos`: aceitar ou não o M-1 (nome antigo ou parcial do solicitante) como risco residual,
  ou abrir pedido com a opção (a) ou (b).
- Para um pedido futuro: B-1 e B-3.
- Para o `devops-sre` (05) e a `documentacao-tecnica` (06): a 0.1.8 no CHANGELOG e no `deploy.md`. Com o M-a fechado,
  o bloqueio de dado pessoal da primeira publicação sai; o M-1 fica registrado como risco residual.

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (leitura do diff de `src/` e skill `code-review`, nível baixo)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` lê a pasta da sessão)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
