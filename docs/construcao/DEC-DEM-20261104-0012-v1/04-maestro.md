---
pedido: DEC-DEM-20261104-0012-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, git diff main...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261104-0012-v1` contra a `main` (`2e621de`, versão 0.1.10). A primeira correção foi o commit
`930b277`; a 04-regressao a devolveu (e-mail colado em outro), e a segunda volta é o commit `e6faf79`. Sem migration; nada em `src/db/`, `drizzle/`, `scripts/`, `e2e/` nem `.github/`.

- **M-a do 0011:** o detector de e-mail (`src/modules/dados-pessoais/detectores.ts:17`) tem início ancorado por
  lookbehind e ficou linear: com 100 mil caracteres, de 1 a 8 ms em todos os casos ruins medidos pela
  `seguranca-aplicacao` (a `main` levava de 130 a 170 ms com 10 mil). O usuário com acento vira um marcador só.
- **B-1 do 0011:** o nome grudado em número, `_` ou CamelCase vira marcador (`Joana2`, `Joana_Ficticia`,
  `JoanaFicticia`); `ANATEL`, `Anabela`, `análise` e `camisa rosa` ficam.
- **B-3 do 0011:** `reduzirErro`, `lerCode`, `erroJaReduzido`, `mapearErro`, `onRequestError` e o console saneado não
  lançam nem com Proxy de armadilhas que lançam; o log sai só com a classe.
- **B-4 do 0011:** a dica e o aviso dizem o limite de 3 letras, as partículas e a parte em minúscula.

Revisões usadas:

- **Código:** li o diff de `src/` e chamei o agente `feature-dev:code-reviewer`. Sem achado de confiança alta.
- **Segurança:** agente `seguranca-aplicacao`, sobre `930b277` (revisão) e depois sobre `e6faf79` (reteste), medindo em
  memória, com sorteio de 300 mil textos contra a `main`. Ele não gravou arquivo no repositório.

Critérios de aceite:

1. Detector de e-mail linear: 100 mil caracteres em poucos milissegundos nos detectores, em `minimizar` e no Pedido de
   Construção (`src/modules/dados-pessoais/detectores.test.ts`, `minimizar.test.ts`).
2. Os e-mails detectados pela `main` continuam detectados, inclusive o colado em outro, e o e-mail com acento no usuário
   vira um marcador só (os 13 testes da 04 e o corpus de equivalência).
3. Nome grudado em número, `_` ou CamelCase vira marcador; `Mariana`, siglas e palavras com `_` ficam (`minimizar.test.ts`).
4. `reduzirErro` e o caminho do log e do Sentry nunca lançam (`src/lib/reduzir-erro.test.ts`, `log.test.ts`,
   `sentry.test.ts`).
5. Aviso e dica com o limite de 3 letras, as partículas e a parte em minúscula (`dados-da-demanda.test.ts`).
6. `pnpm test` 4.288 de 4.288 (46 testes novos da 04), lint e typecheck limpos, e2e 143 de 143 em três execuções
   seguidas (a 3ª, a 4ª e a 5ª da 04; na 2ª, o axe do T11 estourou o tempo de 30 s uma vez, ver Pendências).

### Achados por severidade

**Crítico e Alto:** nenhum.

**Médio:** nenhum aberto.

- **M-1 (fechado na segunda volta)** (`src/modules/dados-pessoais/detectores.ts`, `seguranca-aplicacao` e `qa-automacao`):
  a primeira correção deixava de trocar o e-mail colado logo depois do TLD de outro (`a@b.com_joana@x.com`), que a
  `main` troca. A 04-regressao devolveu à 03 com 13 testes. Na segunda volta, o detector virou uma subclasse de
  `RegExp` que, no `exec`, tenta antes uma cópia sem lookbehind com a flag `y` no fim do casamento anterior. Reteste:
  - os cinco casos e mais 12 amostras dão a saída da `main` ou melhor;
  - cadeias de 100 mil e-mails colados levam de 10 a 89 ms, sem sobrar `@`;
  - 18 casos ruins de 100 mil caracteres levam até 5,7 ms;
  - nenhum texto que a `main` bloqueia no Pedido de Construção deixa de ser bloqueado.

**Baixo**

- **B-1 e B-2 da revisão:** fechados na segunda volta. O aviso diz "dos, das e Júnior", e `quadrosDaPilha` lê `stack`
  uma vez só.
- **B-a** (`detectores.ts:22-23`, reteste): o comentário diz que todo caractere que a regex antiga cobria continua
  coberto. Isso não vale quando dois `@` dividem o domínio e há acento antes do primeiro (`é@b.cc@b.cc`). Nos 2.328
  casos achados num sorteio de 300 mil textos, sobra só `@domínio`, sem usuário: o novo expõe menos que a `main`.
  Sugestão: corrigir o comentário e testar esse caso.
- **I-1** (informativo, reteste): `split`, `new RegExp(detector)` e `test` encadeado não passam pela tentativa extra.
  Nada disso é usado hoje: só `replace` e `search`. Sugestão: dizer no comentário da classe o que é coberto.
- **B-3** (`minimizar.ts:221`, `feature-dev:code-reviewer`): depois de uma parte recusada, a busca não volta à
  alternativa mais curta na mesma posição (`AnaBelax` com `Ana` e `Anabela` fica sem troca). Risco herdado da 02.
- **B-4** (`console-saneado.ts:47`, `feature-dev:code-reviewer`): um Error com `digest: undefined` explícito passa a ir
  ao Sentry. É o desvio 3 da 03, e o Next não produz esse caso.

Segurança: sem achado crítico ou alto. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- O M-1 da revisão era médio, mas era regressão desta correção num controle de privacidade (C-23). A 04-regressao já o
  tinha devolvido à 03 com 13 testes, e eu manteria a devolução mesmo sem ela. Ele fechou na segunda volta, com
  reteste do `seguranca-aplicacao`.
- Na mesma volta entraram o B-1 (texto do aviso) e o B-2 (`stack` lido uma vez), de uma linha cada. B-a, I-1, B-3 e B-4
  vão para Pendências: o roteiro só devolve crítico e alto.
- Rodei a revisão de código e a de segurança em paralelo com a 04-regressao, sobre o commit da correção, para caber na
  janela de Fabiano (até as 15h30 de 04/11).
- Liberação nesta cadeia, só de leitura e pela regra de 25/10: na segunda volta da 03, um `git grep` e um `git show`.

## Pendências

- Para um pedido futuro: B-a (comentário do detector e teste dos dois `@`), I-1 (comentário da classe), B-3 e B-4.
- Para a `qa-automacao`, em pedido futuro: `e2e/axe-todas.spec.ts:273` (T11) estourou 30 s uma vez em cinco execuções
  da 04, com a página já no estado final. Leva de 6 a 7 s quando passa: sensível a carga, como o teste de `/api/saude`
  do 0006.
- Para a `05-entrega` e a `06-documentacao`: a 0.1.11 no `CHANGELOG.md` (texto na Pendência da 03) e no `deploy.md`.

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (leitura do diff de `src/` e agente `feature-dev:code-reviewer`)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` lê a pasta da sessão)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
