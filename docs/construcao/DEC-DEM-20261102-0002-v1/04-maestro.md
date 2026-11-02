---
pedido: DEC-DEM-20261102-0002-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, git diff dd8ddee...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisão do ramo `construcao/DEC-DEM-20261102-0002-v1` contra a `main` (`dd8ddee`). No código, o diff tem 8 arquivos,
153 inserções e 29 remoções, todos de teste, seed fictício e versão:

- `e2e/apoio.ts`, `e2e/decisao.spec.ts`, `e2e/parecer-risco-qa.spec.ts` e `e2e/sem-violacoes.spec.ts` (novo);
- `scripts/seed-ficticio.ts` e `scripts/scripts.test.ts`;
- `test/estatico/projeto.test.ts`;
- `package.json`, com a versão de 0.1.0 para 0.1.1.

Nenhum arquivo de `src/`, `.github/`, `playwright.config.ts`, `e2e/servidor.ts` ou `Dockerfile` mudou.

Revisões usadas:

- **Código:** o maestro leu o diff inteiro e rodou a skill `code-review` em nível baixo (diff pequeno, só de teste).
- **Segurança:** a skill `security-review` não roda sem `origin/HEAD`. Como prevê a seção 3 do `construir.md`, o
  agente `seguranca-aplicacao` revisou o mesmo diff e devolveu os achados na resposta, sem gravar arquivo.

Confirmações dos critérios de aceite:

1. O `semViolacoes` (`e2e/apoio.ts:60-69`) espera o `<title>` por até 5 s, mas a espera não decide o resultado. O axe
   roda com as mesmas `TAGS_AXE` e exige zero violação, sem regra desligada nem filtro.
2. O controle negativo de `e2e/sem-violacoes.spec.ts:40-45` mostra que uma tela sem `<title>` continua reprovada pela
   regra `document-title`.
3. O teste da T07 (`parecer-risco-qa.spec.ts:194`) usa uma demanda do seed, não chama `POST /api/demandas` e confere
   que o total de demandas fica igual antes e depois.
4. O C-36 está intacto: `src/modules/limites.ts` e os testes do 429 estão fora do diff. A folga veio só de
   demandas do seed, pela conta `sem2fa` (9 de 30); a `cto` passou de 30 de 30 para 27 de 30.
5. O e2e terminou com código 0 nas três rodadas seguidas da 03, e a 04-regressao confirmou.

### Achados por severidade

**Crítico e Alto:** nenhum.

**Médio**

- **M-01** (`e2e/decisao.spec.ts:39`, pela skill `code-review`): a guarda olha só se a demanda já tem ESP e, se não
  tiver, cria a ESP e o RSK juntos. Se a criação do RSK falhar depois da ESP (um 429 ou tempo esgotado), o próximo
  worker vê a ESP e pula o RSK. A demanda fica sem parecer de risco, e os testes de aprovar e decidir falham até o
  banco ser semeado de novo. Correção: conferir o RSK à parte, em `/pareceres-risco`. É robustez do próprio teste, sem
  efeito no sistema.

**Baixo**

- **B-01** (pelo `seguranca-aplicacao`): o duplo clique, a T07 e a `decisao.spec.ts` só passam com banco recém-semeado.
  Isso vale no CI (Testcontainers) e no `homologar`, que apaga os volumes. Se alguém rodar a suíte duas vezes contra a
  mesma homologação, esses testes falham. A `duplaAprovacao` já dependia disso antes deste pedido.
- **B-02** (pelo `seguranca-aplicacao`): `playwright.config.ts:4` ainda diz que os dados de cada teste são criados
  pela API, o que já não vale para as demandas do seed.

Segurança: sem achado. A correção não afrouxa o axe, não abre exceção ao C-36, não traz dado pessoal real (as 3
demandas novas são fictícias, com a guarda `SEED_FICTICIO` do seed intacta) e não traz segredo nem dependência nova.

## Decisões tomadas

- A M-01 vai para Pendências, e não para uma 04-correcao. É de teste, não do sistema, e pelo roteiro só Crítico e Alto
  voltam ao engenheiro. A suíte passou três vezes seguidas com o código atual.
- A revisão de código ficou no nível baixo porque o diff tem 153 linhas, todas de teste, seed e versão, e o maestro o
  leu por inteiro.

## Pendências

- Para o `qa-automacao`, num pedido seguinte: M-01 (guarda separada para o RSK em `e2e/decisao.spec.ts:39`) e B-01
  (independência do banco recém-semeado nas specs que dependem dele).
- Para a `documentacao-tecnica` (06): B-02, o comentário de `playwright.config.ts:4`, junto com o CHANGELOG da 0.1.1.
- Para Fabiano: continuam os médios M-01 a M-07 do pedido DEC-DEM-20261022-0001-v1 e o médio do reteste, a leitura do
  QR, os SHAs das actions, os segredos e o Easypanel, como o PR #1 registrou.

## Critério de pronto atendido

- [x] escopo conferido com `git diff dd8ddee...HEAD --stat`
- [x] revisão de código feita (leitura integral e skill `code-review`, nível baixo)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` exige `origin/HEAD`)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
