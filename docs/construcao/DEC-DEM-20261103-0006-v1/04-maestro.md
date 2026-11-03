---
pedido: DEC-DEM-20261103-0006-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, git diff main...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261103-0006-v1` contra a `main` (`cf36ec5`, versão 0.1.4). Mudaram 29 arquivos,
com 2.194 inserções e 50 remoções. No código de produção mudaram 8 arquivos:

- `src/modules/demandas/transicoes.ts`: `STATUS_FINAIS`, `ehStatusFinal`, `recusarSeDemandaFinal` e a mensagem fixa,
  todos lidos de `FINAIS`, a fonte única dos status finais (M-02);
- `src/modules/especificacoes/servico.ts`, `src/modules/pareceres-risco/servico.ts` e
  `src/modules/pacotes-decisao/criar.ts`: a recusa 409 (`conflito`) logo depois de `travarDemanda`, antes do limite, de
  insert, evento, gatilho e aviso (M-02); no `criar.ts`, o DEC do worker cita a ESP e o RSK lidos pela entrada, com
  `citada()` filtrando pela demanda (M-01);
- `src/modules/agentes/entrada-agente.ts` e `src/modules/agentes/executar.ts`: a entrada devolve `citados`, que vai só
  para o DEC, nunca para o conteúdo do modelo (M-01); a execução que estava na fila numa demanda em status final fica
  `ignorada` com `demanda_final`, sem chamar o provedor (M-02);
- `src/modules/avisos/aviso-dec.ts` e `src/jobs/aviso-dec-pronto.ts`: o 4xx que não é 429 marca `falhou` na primeira
  vez; o erro inesperado conta tentativa numa transação própria, com `for update`; o 429 e o 5xx seguem tentados (M-03).

Os outros arquivos são testes (17 novos em unidade e integração, 3.811 no total), `package.json` (0.1.5),
`test/estatico/projeto.test.ts` e dois arquivos de `e2e/`. Nada em `src/db/`, `drizzle/`, `scripts/` nem `.github/`:
não há migration.

Revisões usadas:

- **Código:** li o diff inteiro de `src/` e do `e2e/`, e rodei a skill `code-review` em nível baixo, que apontou um
  ponto (B-3 abaixo).
- **Segurança:** agente `seguranca-aplicacao`, com o diff, a 01 e a 02, como prevê a seção 3 do `construir.md`. Ele não
  gravou arquivo. A skill `security-review` não rodou: o `origin/HEAD` agora existe no repositório do pedido (R2.2 do
  parecer da `governanca-ia` de 03/11), mas a skill lê o repositório da pasta da sessão, que é a estruturaAutonoma, e
  não o do pedido.

Critérios de aceite confirmados:

1. M-01: o DEC da consolidação cita a ESP e o RSK que a entrada leu. Com versão mais nova entrando depois, o DEC nasce
   desatualizado e a aprovação dele é barrada pela regra que já existia. Id de outra demanda dá 404 sem gravar.
2. M-02: ESP, RSK e DEC são recusados com 409 em `entregue` e `encerrada`, pela pessoa e pelo agente, sob a trava e
   antes de qualquer efeito; continuam permitidos nos status não finais (testes nos dois lados).
3. M-03: o 4xx definitivo termina `falhou` na primeira tentativa; o erro inesperado soma tentativa e termina `falhou`
   na terceira; 429 e 5xx seguem `pendente` com nova tentativa.
4. e2e: 143 de 143 em três rodadas seguidas, com banco novo em cada uma. As quatro esperas novas em
   `e2e/fila-qa.spec.ts` e `e2e/fila.spec.ts` não tiram nenhuma asserção (o diff do `e2e/` não tem linha removida), e o
   axe e o foco continuam conferidos.
5. A-02, C-11, C-21, C-25, C-36 e o axe continuam sem exceção.

### Achados por severidade

**Crítico, Alto e Médio:** nenhum.

**Baixo**

- **B-1** (`src/modules/pacotes-decisao/criar.ts:81`, `seguranca-aplicacao`): a regra de que `especificacaoId` e
  `parecerRiscoId` só vêm do worker está garantida por comentário e pelo código de hoje (rota e Server Action chamam
  com 4 argumentos). Uma rota futura que repasse o corpo como `extras` não seria barrada por teste; mesmo assim,
  `citada()` filtra pela demanda. Sugestão: teste estático de que nada em `src/app/` passa o 5º ou o 6º argumento.
- **B-2** (`src/modules/avisos/aviso-dec.ts:194`, `seguranca-aplicacao`): erro depois de o e-mail ter saído (falha ao
  gravar `enviado` ou no commit) ainda conta tentativa e tenta de novo. A chave de idempotência `dec-<id>` do Resend
  segura o reenvio, mas, depois de três erros assim, o aviso termina `falhou` com o e-mail entregue. Já acontecia antes;
  não é regressão.
- **B-3** (`src/modules/demandas/transicoes.ts:33`, skill `code-review`): `STATUS_FINAIS` é exportado e usado só nos
  testes; os serviços leem `FINAIS` por `ehStatusFinal`.
- **B-4** (`e2e/fila-qa.spec.ts:28`, `e2e/fila.spec.ts:61`, `seguranca-aplicacao` e maestro): as esperas novas evitam
  uma corrida real da tela. Quem filtra ou pagina antes de o React assumir a lista pode ficar sem o foco no resultado
  (WCAG 2.4.3). O teste não afrouxou nada, mas o defeito de foco é do produto.
- **B-5** (maestro): o motivo novo `demanda_final` não tem rótulo em `src/components/rotulos.ts`. O histórico mostra só
  "Agente X não rodou", como a 03 registrou.
- **B-6** (maestro): três comentários de cabeçalho passam de 120 colunas (`especificacoes/servico.ts:3`,
  `pareceres-risco/servico.ts:3`, `pacotes-decisao/criar.ts:4`). O lint não confere comentário.

Segurança: sem achado crítico, alto ou médio. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- B-1 a B-6 vão para Pendências. São Baixos, e o roteiro só devolve Crítico e Alto.
- O CHANGELOG da 0.1.5, que o `seguranca-aplicacao` notou ausente, é da 06-documentacao na cadeia curta, como nos
  pedidos 0002 a 0005; não é achado.
- Nesta cadeia o maestro liberou, pela regra de Fabiano de 25/10 (só leitura), um `ls -la` na 02 e, na 04, um `find`,
  um `tail` em saída gravada e um `git diff -G`. A 03 registrou em prosa um `cd <repo> && pnpm test` (só teste) que ela
  mesma repetiu na forma permitida. Na 04, de novo, Glob e Grep apareceram indisponíveis ao subagente, a causa que a R1.1
  do parecer da `governanca-ia` de 03/11 aponta.

## Pendências

- Para um pedido seguinte do Orquestrador (Baixos): B-1 (teste estático dos `extras`), B-4 (foco da fila antes da
  hidratação), B-5 (rótulo de `demanda_final`), B-2 e B-3 se o arquivo for mexido, e B-6 numa passada de formatação.
- Para a `documentacao-tecnica` (06): o CHANGELOG da 0.1.5 e o campo "Versão" do `deploy.md`.
- Para o `/construir` (estruturaAutonoma): fazer a `security-review` ler o repositório do pedido, e não a pasta da
  sessão, para a R2.2 do parecer valer de fato.
- Para Fabiano: continuam as pendências da primeira publicação (CA-P5-16).

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (leitura integral e skill `code-review`, nível baixo)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` lê a pasta da sessão)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
