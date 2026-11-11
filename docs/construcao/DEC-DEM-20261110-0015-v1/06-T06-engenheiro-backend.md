---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T06-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T06-tech-lead.md, 06-T06-engenheiro-backend.md (entrega anterior), docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T05 a T08), scripts/seed-ficticio.ts, scripts/scripts.test.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/schemas.ts, src/modules/pareceres-risco/servico.ts, src/modules/pareceres-risco/schemas.ts, src/modules/demandas/schemas.ts, src/modules/limites.ts, src/db/schema/decisao.ts, src/db/schema/versoes.ts (NIVEIS_RISCO), src/agents/consolidacao.ts, src/agents/insumo-tecnico.ts, test/estatico/piso-de-assercoes.test.ts, test/estatico/sem-recurso-externo.test.ts, test/estatico/decisao-e2e.test.ts, vitest.config.ts, e2e/apoio.ts, e2e/preparacao.ts, e2e/decisao.spec.ts (cabeçalho e idDoDecDeRascunhoDoSeed), e2e/axe-todas.spec.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T06, seed fictício das demandas dos e2e novos (D-07, G3.10). **Volta 2**, pelo parecer 1 de `06-T06-tech-lead.md`: o
U+202E (RIGHT-TO-LEFT OVERRIDE) estava **cru** no literal de `scripts/seed-ficticio.ts:162` e de
`scripts/scripts.test.ts:478` (Trojan Source, CVE-2021-42574), e não como sequência de escape, como a volta 1 dizia. O
teste estático novo confirmou a falha nas duas linhas. Agora o caractere vem de código (`String.fromCodePoint(0x202e)`)
e o título que a tela recebe continua com ele. O resto da tarefa não mudou.

### O que mudou nesta volta

- `test/estatico/sem-controle-bidi.test.ts` (novo): varre `src/`, `scripts/`, `test/` e `e2e/` (`.ts`, `.tsx`, `.css`)
  e os `*.config.*` da raiz, e reprova qualquer caractere de U+202A a U+202E e de U+2066 a U+2069, dizendo arquivo,
  linha e código (`scripts/x.ts:2: U+202E`). A classe da regex é montada com `String.fromCodePoint` e `new RegExp`: nem
  o caractere nem a sequência de escape aparecem no arquivo, e ele varre a si mesmo. Cinco testes:
  1. a varredura enxerga o código (falha se o glob quebrar), inclusive os dois arquivos do achado e o próprio teste;
  2. a lista cobre os nove controles, de U+202A a U+202E e de U+2066 a U+2069;
  3. reprova cada controle plantado (texto montado com `String.fromCodePoint`), com arquivo, linha e código;
  4. deixa passar os vizinhos dos intervalos (U+2029, U+202F, U+2065, U+206A) e a forma por código;
  5. nenhum arquivo do repositório tem controle bidirecional cru.
- `scripts/seed-ficticio.ts`:
  - constante local `const RLO = String.fromCodePoint(0x202e);`, com comentário da razão, antes de `TITULOS_DO_E2E`;
  - `textoDeTerceiro` passou a template literal com `${RLO}` no lugar do caractere cru. O texto é o mesmo, letra a
    letra; a chave perde o tipo literal no `as const` e fica `string`, e nenhum consumidor depende do literal
    (`pnpm typecheck` limpo);
  - o comentário da linha 160 cita `criarVersoesDoE2E`, e não `VERSOES_DO_E2E`, que não existe (parecer 1, passo 3).
- `scripts/scripts.test.ts`:
  - linha 478: o título esperado é montado do mesmo jeito, com `${String.fromCodePoint(0x202e)}`; a asserção é a mesma;
  - asserção nova: `expect(TITULOS_DO_E2E.textoDeTerceiro).toContain(String.fromCodePoint(0x202e))`, para o e2e
    continuar recebendo o caractere. O laço logo abaixo, que já existia, confere que o título gravado no banco é igual
    a `TITULOS_DO_E2E.textoDeTerceiro`, portanto **o título no banco continua com o U+202E**.
  - Nenhuma asserção foi apagada.

### Visto falhando antes da correção

`pnpm -C <repo> test test/estatico/sem-controle-bidi.test.ts` com o teste novo e o código ainda sem mudança: 5 testes,
**1 falhou** e 4 passaram. Trecho:

```
FAIL  test/estatico/sem-controle-bidi.test.ts > sem caractere de controle bidirecional cru no fonte > nenhum arquivo do repositório tem controle bidirecional cru
AssertionError: expected [ …(2) ] to deeply equal []
+ [
+   "scripts/scripts.test.ts:478: U+202E",
+   "scripts/seed-ficticio.ts:162: U+202E",
+ ]
```

Confirma o parecer 1: o caractere estava cru exatamente nas duas linhas apontadas, e em nenhum outro arquivo varrido.

### Depois da correção

- `test/estatico/sem-controle-bidi.test.ts` e `scripts/scripts.test.ts`: 2 arquivos, 50 de 50 (5 + 45). No log, o
  `seed_ficticio` `semeado` com `quantidade: 23` e a segunda execução `recusado`.
- `pnpm test` (suíte inteira): **219 arquivos, 4829 de 4829 testes**, 0 falhas.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git status`: modificados `scripts/scripts.test.ts` e `scripts/seed-ficticio.ts`; novo
  `test/estatico/sem-controle-bidi.test.ts`. `git diff --stat`: 8 inserções e 3 remoções nos dois arquivos de
  `scripts/`. Nenhum arquivo temporário no repositório (relatórios JSON ficaram no scratchpad da sessão).

### O que segue da volta 1, sem mudança

- `TITULOS_DO_E2E` com as oito chaves da tabela da T06 (`textoDeTerceiro`, `etapasSemVersoes`, `etapasDupla`,
  `decisaoOpcaoB`, `decisaoDevolverComOpcao`, `decisaoCelularCto`, `decisaoCelularDupla`, `decisaoRecomendaB`);
  `RECOMENDACAO_DO_E2E` exportada; `DEMANDAS_DO_E2E` com as oito demandas (tipo `melhoria`, linha `sob_medida`,
  solicitante `Pessoa Ficticia Produto`, contexto preenchido, conta `sem2fa`); `TOTAL_DEMANDAS_DO_SEED` derivado (23).
- `criarVersoesDoE2E` na mesma transação do seed, pelos serviços de `src/modules/` e com toda entrada pelo schema Zod
  da rota: `etapasDupla` com ESP v1, RSK v1 e DEC v1 de pessoa (`cto_e_administradora`) e a aprovação do CTO na opção
  A pela conta `cto`; `decisaoRecomendaB` com ESP, RSK e DEC de agente, recomendação `RECOMENDACAO_DO_E2E` revalidada
  por `criarPacoteDecisaoSchema.parse`.
- Os quatro testes T06 de `scripts/scripts.test.ts` e as mudanças explicadas nas asserções antigas (contagem 23,
  filtro por título no `comPacote`, `toHaveLength(18)`, três avisos e jobs no teste da T33). Vermelho da volta 1: 7
  falhas de 45; verde: 45 de 45.

### Desvios do plano

- Os da volta 1, aceitos na revisão: autoria `sem2fa` (papel cto) da ESP, do RSK e do DEC da `etapasDupla`, com a
  aprovação pela `cto`; textos curtos inventados para ESP, RSK e DEC dessa demanda; `RECOMENDACAO_DO_E2E` exportada.
- Nesta volta: o teste estático também varre os `*.config.*` da raiz, além das quatro pastas do parecer. Custa nada e
  fecha o mesmo vetor nos arquivos de configuração. `RLO` é constante **local** do seed, não exportada, para não somar
  nome fora do G7; o teste monta o caractere por conta própria.

## Decisões tomadas

- O caractere de direção vem de `String.fromCodePoint(0x202e)`, e não de sequência de escape no literal: a ferramenta
  de edição decodifica a sequência digitada e grava o caractere cru, que foi a causa do achado.
- O teste estático monta a classe da regex por código e se inclui na varredura: assim ele próprio não pode guardar o
  caractere, e um caso plantado prova que a regra reprova.
- A mensagem de falha diz arquivo, linha e código (U+XXXX), e não o caractere, para o relatório não carregar o mesmo
  problema.
- Na entrega, o caractere é citado só como U+202E e o escape como "sequência de escape", sem digitá-los.

## Pendências

- `engenheiro-frontend` (T09 a T13): ao usar `TITULOS_DO_E2E.textoDeTerceiro` nos e2e, importe a constante e nunca
  copie o título; se precisar do caractere à parte, use `String.fromCodePoint(0x202e)`. O teste
  `sem-controle-bidi` varre `e2e/` e reprova o caractere cru.
- `engenheiro-frontend` (T12 e T13), sem bloquear: há dois DECs de agente pendentes no seed. `idDoDecDeRascunhoDoSeed`
  de `e2e/decisao.spec.ts` pode achar o da `decisaoRecomendaB`; o melhor é procurar o DEC pela demanda do seed, pelo
  título.
- `engenheiro-frontend` (T11 a T13): nenhum e2e deve decidir a `etapasDupla`, que nasce em `pronta_para_decisao` com a
  aprovação do CTO já gravada.
- Não rodei `pnpm test:e2e`: o comando é do `engenheiro-frontend` (G1).
- Minor (parecer 3 da revisão): os testes do bloco "seed fictício" dependem do seed feito no primeiro teste do
  `describe`; dívida do bloco, não desta tarefa.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, árvore limpa no início
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/sem-controle-bidi.test.ts --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t06-bidi-vermelho.json` — vermelho: 1 falhou, 4 passaram (relatório truncava a lista)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/sem-controle-bidi.test.ts` — vermelho: 1 falhou, 4 passaram; achados `scripts/scripts.test.ts:478: U+202E` e `scripts/seed-ficticio.ts:162: U+202E`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/sem-controle-bidi.test.ts scripts/scripts.test.ts` — 2 arquivos, 50 de 50
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=json --outputFile=/tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/scratchpad/t06-bidi-suite.json` — exit 0 (relatório grande demais para ler; repetida abaixo)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 219 arquivos, 4829 de 4829
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — `scripts/scripts.test.ts` e `scripts/seed-ficticio.ts` modificados, `test/estatico/sem-controle-bidi.test.ts` novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 8 inserções, 3 remoções

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
