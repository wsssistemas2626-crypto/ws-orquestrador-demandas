---
pedido: DEC-DEM-20261102-0005-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, git diff main...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261102-0005-v1` contra a `main` (`00a924e`). No código mudaram 4 arquivos, com
235 inserções e 19 remoções:

- `e2e/decisao.spec.ts`: uma linha de código nova no "Arquivar" (`semViolacoes(page, 'T11 arquivado')`, linha 366) e
  o reflow do comentário de cabeçalho; as outras linhas mudadas começam com `//`;
- `test/estatico/decisao-e2e.test.ts`, novo, da 04-regressao: trava em teste de unidade o axe do arquivado, a
  pré-condição do "Arquivar", o cabeçalho e o axe sem regra desligada em todo o `e2e/`;
- `test/estatico/projeto.test.ts`: o `it` da versão;
- `package.json`: a versão, de 0.1.3 para 0.1.4.

Nada em `src/`, `scripts/` ou `.github/` mudou: o axe não achou violação na tela arquivada.

Revisões usadas:

- **Código:** li o diff inteiro, incluindo o teste estático novo, e rodei a skill `code-review` em nível baixo. A
  skill não achou nada; nesse nível ela não olha arquivo de teste, que é tudo o que este pedido muda, por isso a leitura
  integral.
- **Segurança:** a skill `security-review` exige `origin/HEAD`, então usei o agente `seguranca-aplicacao`, como prevê a
  seção 3 do `construir.md`. Ele não gravou arquivo.
- **Lint:** `pnpm lint` limpo. O `prettier --check` acusa os dois arquivos de teste, mas acusa também 548 arquivos da
  `main` (inclusive a `decisao.spec.ts` da 0.1.3): o Prettier não está no CI nem no `lint`, e isso não é deste pedido.

Critérios de aceite confirmados:

1. O "Arquivar" chama `semViolacoes(page, 'T11 arquivado')` uma vez, depois do alerta e das conferências `arquivada` e
   `encerrada`, sem navegação no meio. `e2e/apoio.ts` não mudou: as cinco tags de `TAGS_AXE`, sem `disableRules`,
   `exclude`, `include` nem `withRules`. O controle negativo da 04 (um `<img>` sem `alt` injetado) reprovou com
   `image-alt`, então o axe novo analisa mesmo a tela arquivada.
2. O cabeçalho não tem linha órfã, a mais longa tem 120 caracteres (conferi também com `awk`) e a frase do axe cita o
   arquivado e os outros estados.
3. A pré-condição (`exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), …)`) e as conferências de status do
   "Arquivar" estão iguais às da 0.1.3.
4. e2e: 143 de 143 em três rodadas seguidas em banco novo, sem teste pulado. Com `--repeat-each=3` no mesmo banco,
   19 aprovados, 8 pulados, todos com a mensagem "exige banco recém-semeado: …", e nenhuma falha.
5. A regra A-02, o C-36 e o axe continuam sem exceção.

### Achados por severidade

**Crítico, Alto e Médio:** nenhum.

**Baixo**

- **B-1** (`test/estatico/decisao-e2e.test.ts:186` e `:193-199`, apontado pelo `seguranca-aplicacao`): a trava "nenhum
  e2e desliga o axe" não pega um `r.violations.filter(...)` posto em `e2e/apoio.ts` antes do `map`, e a varredura
  `e2e/**/*.ts` não olha `.tsx`, `.js` nem `.mjs`. Não é furo deste diff, porque nada foi afrouxado: é um limite do
  teste novo. Dá para ampliar quando o arquivo for mexido.
- **B-2** (`test/estatico/decisao-e2e.test.ts:144-150` e `:196-198`, revisão do maestro): o teste estático confere
  trechos exatos do código de `e2e/decisao.spec.ts` e de `e2e/apoio.ts` (a linha de `ORIGENS_DO_FLUXO`, o `if
  (process.env.CI)`, o `new AxeBuilder`). Uma refatoração legítima desses arquivos vai exigir atualizar o teste junto.
  É o preço da trava, e ela falha alto, não em silêncio. Fica registrado para quem mexer neles.

Segurança: sem achado crítico, alto ou médio. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova; o
teste novo só lê arquivos do próprio repositório e não executa código.

## Decisões tomadas

- B-1 e B-2 vão para Pendências. São Baixos, e o roteiro só devolve Crítico e Alto.
- O `prettier --check` não entra como achado: a `main` já falha nele em 548 arquivos e ele não faz parte do CI.

## Pendências

- Para quem mexer em `test/estatico/decisao-e2e.test.ts` ou em `e2e/apoio.ts`: B-1 (filtro no resultado do axe e
  outras extensões em `e2e/`) e B-2 (trechos exatos conferidos pelo teste estático).
- Para o time, se quiser, num pedido próprio: pôr o Prettier no CI (hoje 548 arquivos fora do formato).
- Para a `documentacao-tecnica` (06): o CHANGELOG da 0.1.4 e o campo "Versão" do `deploy.md`.
- Para Fabiano: continuam as pendências da primeira publicação registradas nos PR #1 a #5.

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (leitura integral e skill `code-review`, nível baixo)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` exige `origin/HEAD`)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
