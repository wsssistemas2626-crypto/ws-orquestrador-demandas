---
pedido: DEC-DEM-20261102-0003-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, git diff 30b71b5...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261102-0003-v1` contra a `main` (`30b71b5`). No código são 8 arquivos, com 360
inserções e 55 remoções, todos de teste e da configuração de teste:

- `e2e/apoio.ts`, `e2e/decisao.spec.ts` e `e2e/parecer-risco-qa.spec.ts`;
- `e2e/preparacao.ts` e `e2e/preparacao.spec.ts`, os dois novos;
- `playwright.config.ts`, só no comentário;
- `test/estatico/projeto.test.ts`;
- `package.json`, só a versão, de 0.1.1 para 0.1.2.

Nada em `src/`, `scripts/` ou `.github/` mudou.

Revisões usadas:

- **Código:** li as partes centrais do diff (`preparacao.ts`, `apoio.ts`, `playwright.config.ts` e o `exigeBancoRecemSemeado` da `decisao.spec.ts`) e rodei a skill `code-review` em nível baixo. A skill não achou bug.
- **Segurança:** a skill `security-review` exige `origin/HEAD`, então usei o agente `seguranca-aplicacao`, como prevê a seção 3 do `construir.md`. Ele não gravou arquivo.

Critérios de aceite confirmados:

1. `prepararEspERsk` (`e2e/preparacao.ts:15-18`) confere a ESP e o RSK separadamente e cria só o que falta, sem engolir falha. O caso 4 de `e2e/preparacao.spec.ts:62-73` prova que o erro sobe, que a chamada seguinte cria só o RSK e que a terceira não cria nada.
2. O duplo clique, a T07 e o teste M-01 conferem exatamente uma versão nova com `proximoId` e `toEqual([esperado, ...antes])`, sem supor `v1`. `proximoId` recusa um id fora do formato.
3. `exigeBancoRecemSemeado` (`e2e/decisao.spec.ts:40-44`) roda antes de qualquer POST e pula sempre com a mensagem "exige banco recém-semeado: …". Com `CI` definido, a pré-condição falsa reprova o teste em vez de pulá-lo. Isso vale no GitHub Actions e no `construir.mjs homologar`, que passa `CI: '1'`.
4. A regra A-02, o C-36 e o axe continuam sem exceção. Há um teste novo da A-02 que roda em qualquer banco: ele confere um só DEC aprovado e o texto exato do conflito.
5. O comentário de `playwright.config.ts:4-9` descreve as duas fontes de dado do e2e, o seed fictício e a API.
6. e2e: 142 de 142 nas três rodadas seguidas, sem teste pulado. Rodando várias vezes no mesmo banco (`--repeat-each=3`), foram 75 aprovados, 6 pulados com mensagem e nenhuma falha (04-regressao).

### Achados por severidade

**Crítico, Alto e Médio:** nenhum.

**Baixo**

- **B-01** (`e2e/decisao.spec.ts:348` e `:354`, apontado pelo `seguranca-aplicacao`): numa execução repetida, o teste "Arquivar" aceita a demanda que já está `encerrada`. Nesse caso o `toBe('encerrada')` passa sem provar a mudança de status. No CI, com banco novo, a demanda parte de `em_analise` e a mudança fica provada. Sugestão para depois: no CI, exigir só `ORIGENS_DO_FLUXO` como status de partida; fora dele, anotar no teste que a conferência da mudança de status não valeu.

Segurança: sem achado. Nenhum segredo ou dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- A B-01 vai para Pendências. Ela é Baixa e o roteiro só devolve Crítico e Alto. Onde o resultado vale como portão (CI e homologação), a mudança de status continua provada.
- Usei a revisão de código em nível baixo porque o diff é só de teste. A skill não olha os `*.spec.ts` nesse nível, mas li as partes centrais da `decisao.spec.ts` e o `seguranca-aplicacao` leu a spec inteira.

## Pendências

- Para o `qa-automacao`, num pedido seguinte: B-01 (status de partida do "Arquivar" fora do CI).
- Para a `documentacao-tecnica` (06): o CHANGELOG da 0.1.2 e o campo "Versão" do `deploy.md`.
- Para Fabiano: continuam as pendências da primeira publicação registradas nos PR #1 e #2.

## Critério de pronto atendido

- [x] escopo conferido com `git diff 30b71b5...HEAD --stat`
- [x] revisão de código feita (leitura das partes centrais e skill `code-review`, nível baixo)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` exige `origin/HEAD`)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
