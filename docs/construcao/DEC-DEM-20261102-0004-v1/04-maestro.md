---
pedido: DEC-DEM-20261102-0004-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-frontend.md, 04-qa-automacao.md, git diff b8a8c44...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261102-0004-v1` contra a `main` (`b8a8c44`). No código mudaram 3 arquivos, com
30 inserções e 14 remoções:

- `e2e/decisao.spec.ts`: o teste "Arquivar" e um teste novo de 404 e sessão, separado dele;
- `test/estatico/projeto.test.ts`;
- `package.json`, com a versão de 0.1.2 para 0.1.3.

Nada em `src/`, `scripts/` ou `.github/` mudou.

Revisões usadas:

- **Código:** li o diff inteiro e rodei a skill `code-review` em nível baixo, incluindo a `decisao.spec.ts`. A skill
  não achou nada.
- **Segurança:** a skill `security-review` exige `origin/HEAD`, então usei o agente `seguranca-aplicacao`, como prevê a
  seção 3 do `construir.md`. Ele não gravou arquivo.

Critérios de aceite confirmados:

1. A pré-condição do "Arquivar" (`e2e/decisao.spec.ts:353`) exige partida de `ORIGENS_DO_FLUXO` e não aceita mais
   `encerrada`. Com `CI` definido, a pré-condição falsa reprova o teste em vez de pulá-lo.
2. O teste confere o status antes de arquivar (`pronta_para_decisao`, linha 357) e depois (`encerrada`, linha 363), e
   confere também o `statusDecisao` do pacote, que fica `arquivada` (linha 362). A mudança `decisao_arquivada` fica
   provada.
3. Fora do CI, com a demanda já encerrada, o teste é pulado com a mensagem "exige banco recém-semeado: a demanda … está
   encerrada, e o arquivamento não prova a mudança para Encerrada" (04-regressao).
4. O teste de 404 e sessão manteve todas as conferências: três caminhos com 404 e o redirecionamento para `/entrar`
   sem sessão. Agora usa o DEC de rascunho do seed, roda em qualquer banco e não faz POST.
5. A regra A-02, o C-36 e o axe continuam sem exceção.
6. e2e: 143 de 143 em três rodadas seguidas em banco novo. Com `--repeat-each=3` no mesmo banco, foram 19 aprovados,
   8 pulados com mensagem e nenhuma falha.

### Achados por severidade

**Crítico, Alto e Médio:** nenhum.

**Baixo**

- **B-1** (`e2e/decisao.spec.ts:6-8`, apontado pelo `seguranca-aplicacao`): a quebra de linha do comentário de
  cabeçalho deixou "(08-correcao, A-04: o nível" sozinho numa linha. É só estética: dá para ajustar quando o arquivo
  for mexido de novo.

Observação, que não é achado deste pedido: o cabeçalho diz que o axe roda nos estados pendente, desatualizado, com
erro e decidido, mas o estado "arquivado" não tem `semViolacoes`. Isso já era assim na 0.1.2. Se o time quiser cobrir
esse estado, cabe num pedido próprio.

Segurança: sem achado. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- O B-1 vai para Pendências. É estético, e o roteiro só devolve Crítico e Alto.
- O ramo com `CI` definido, que o 04-regressao não pôde rodar, fica provado na P3: o `homologar` passa `CI: '1'` e o
  CI do PR roda com `CI=true`.

## Pendências

- Para quem mexer na `decisao.spec.ts` da próxima vez: B-1 (comentário de cabeçalho) e, se o time quiser, o axe no
  estado arquivado.
- Para a `documentacao-tecnica` (06): o CHANGELOG da 0.1.3 e o campo "Versão" do `deploy.md`.
- Para Fabiano: continuam as pendências da primeira publicação registradas nos PR #1 a #3.

## Critério de pronto atendido

- [x] escopo conferido com `git diff b8a8c44...HEAD --stat`
- [x] revisão de código feita (leitura integral e skill `code-review`, nível baixo)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` exige `origin/HEAD`)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
