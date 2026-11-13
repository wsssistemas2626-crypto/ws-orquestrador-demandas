---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T10-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md (pelo contrato), contrato-passagem.md, tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T10, linhas 2345 a 2400; D-07, D-11 e a linha da G5, 139 a 162), 01-analista-requisitos.md (7.3 Cenário V-02, linhas 405 a 434; P-07, linha 474), 04-seguranca-aplicacao.md (AN-15, linhas 188 e 212), 06-T10-engenheiro-backend.md, 06-T10-tech-lead.md, commit 84a0b254fa3ef284acb680650da19e8c766a8da8 (--stat e o diff dos três testes da G5), scripts/seed-andamento.test.ts, scripts/seed-ficticio.ts (440 a 680), scripts/seed-integracoes-qa.test.ts, src/modules/andamento/registrar.ts, src/modules/andamento/consultas.ts, src/modules/andamento/registrar-qa.test.ts (1 a 90), src/modules/demandas/consultas.ts (obterDemanda), src/app/api/pedidos-construcao/andamento.test.ts (1 a 140), test/andamento.ts, test/pedidos-construcao.ts (1 a 120), test/estatico/andamento.test.ts (IMPORTAM_CONSULTAS), 06-T09-qa-automacao.md (molde)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T10 (seed fictício com as oito demandas do andamento, commit `84a0b25`). O código cumpre todos os
critérios da tarefa; nenhum teste novo falhou contra o código. Acrescentei um arquivo, `scripts/seed-andamento-qa.test.ts`,
com 5 testes em quatro bancos próprios (Testcontainers), sem mudar nenhum teste existente.

### Critérios da tarefa e o teste que cobre cada um

`seed-andamento.test.ts` é o do engenheiro; `seed-andamento-qa.test.ts` é o novo. Os dois em `scripts/`.

| Critério (T10 do plano, D-07, D-11, V-02/P-07, AN-15, C-36) | Arquivo | Teste |
|---|---|---|
| Os oito títulos do plano, "(fictício)", únicos | `seed-andamento.test.ts` | `os oito títulos novos: os do plano, com "(fictício)", diferentes entre si e dos de antes` |
| Total 36 no banco, na mensagem e no log | `seed-andamento.test.ts` | `o total do seed conta as oito novas: 36 demandas, e a mensagem diz o mesmo número` |
| Molde (melhoria, sob_medida, sem2fa, contexto) e ordem de criação | `seed-andamento.test.ts` | `as oito são as últimas criadas, na ordem da tabela, e têm o molde das do e2e (...)` |
| ESP, RSK e DEC da sem2fa, DEC cto aprovado pela "cto" na opção A, vigente | `seed-andamento.test.ts` | `cada uma tem ESP, RSK e DEC da sem2fa, DEC de nível cto aprovado pela "cto" na opção A e vigente` |
| C-36: sem2fa com 28 de 30 demandas e 33 de 60 versões | `seed-andamento.test.ts` | `C-36: a sem2fa fica com 28 de 30 demandas e 33 de 60 versões na hora do seed` |
| Tabela da T10 por chave: status final, linhas, `andamento_registrado` (A: 2; B, C, E: 1; D: 2), `status_alterado` do construir e da pessoa | `seed-andamento.test.ts` | `%s: status, linhas de andamento, andamento_registrado e mudanças de status como na tabela do plano` (8 casos) |
| D-07: andamento direto pelo ator `construir` prefixo `ficticio`, com as regras do serviço | `seed-andamento.test.ts` + `seed-andamento-qa.test.ts` | o `it.each` acima; e `Minor 1 da revisão: ... > reenviar o último passo de cada uma das cinco não grava nada; só prontas grava sem evento (A2); a fase nova grava o evento com o antes do seed` (o serviço real lê o estado semeado como o mesmo estado e continua a cadeia de `antes`) |
| Pedido gerado, entregue e recebido nas seis; ausente nas outras duas | `seed-andamento.test.ts` | `os seis com pedido: gerado pela "cto", entregue e recebido pelo construir do seed (D-11); ...` |
| D-11: lista de pendentes só com a `pedidoParaBuscar` | `seed-andamento.test.ts` | `D-11: a lista de pendentes do /construir continua só com a pedidoParaBuscar` |
| Totais 7 linhas e 7 eventos | `seed-andamento.test.ts` | `os totais do andamento: 7 linhas e 7 andamento_registrado, ...` |
| AN-15 e D-09: nenhum token, único prefixo `ficticio`, nada de `wsod_` | `seed-andamento.test.ts` | `AN-15 e D-09: nenhum token de serviço; ...` |
| G3.10: log sem título, decId nem fase | `seed-andamento.test.ts` | `G3.10: o log do seed não leva título, decId nem fase das demandas de andamento` |
| V-02 (P-07, 7.3 passos 1 a 3) sobre o banco semeado: `andamentoParaEnviar` 204 e aprovada → em_construcao com um `andamento_registrado`; segundo envio igual sem gravar; `andamentoSemPedido` e `emConstrucaoSemAndamento` (A3) com o mesmo 404 do DEC inexistente, byte a byte | `seed-andamento-qa.test.ts` | `V-02 sobre o banco semeado: ... > para enviar: 204, aprovada → em_construcao pelo construir, um andamento_registrado; o mesmo envio de novo não grava; sem pedido, em construção sem pedido e inexistente: o mesmo 404, sem gravar` |
| Base dos e2e da T12 e T13: detalhe e leitura por página da fila dão o mesmo último andamento; só as cinco entram no mapa | `seed-andamento-qa.test.ts` | `leituras de pessoa ... > o detalhe (obterDemanda) e a leitura por página da fila (andamentosDasDemandas) dão o mesmo último andamento; só as cinco com andamento entram no mapa` |
| Seed repetido não duplica andamento nem evento | `seed-andamento-qa.test.ts` | `leituras de pessoa ... > seed num banco já semeado: recusado, sem gravar andamento, evento nem demanda` |
| As oito (autoria de pessoa) não são lidas pelo Awave | `seed-andamento-qa.test.ts` | `o Awave sobre o banco semeado não lê nenhuma das oito (autoria de pessoa) > GET /api/demandas/:id com o token do awave: 404 igual ao de um id inexistente, para as oito` |
| G5: totais dos testes existentes | `scripts/scripts.test.ts`, `seed-integracoes.test.ts`, `seed-integracoes-qa.test.ts` | conferido no diff do commit: só totais e listas; nenhuma asserção saiu, nenhum `.skip`/`.only`/`.todo` |

### Testes acrescentados

`scripts/seed-andamento-qa.test.ts` (5 testes, 4 `describe`, cada um com banco próprio e relógio fixo `relogioFixo`;
os que gravam são um `it` por banco, então nada depende de ordem). Tokens `construir` e `awave` só nascem em tempo de
teste, por `criarTokenDeIntegracao`/`tokenDeIntegracao`, e nunca vão a mensagem de `expect`.

Prova de que os testes pegam divergência: mudei de propósito, no próprio teste, o último passo esperado da
`andamentoConcluido` de 12/12 para 11/12; dois testes falharam (o detalhe mostrou `tarefasProntas: 12`, e o reenvio
"igual" gravou uma linha nova pelo serviço). Desfeito em seguida; o arquivo final é o de antes da mutação.

### Resultado

- `pnpm test` (suíte inteira): **338 arquivos, 7490 testes passando**, 0 falhas.
- `pnpm test scripts/seed-andamento-qa.test.ts`: 5 de 5.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git status`: só `scripts/seed-andamento-qa.test.ts` novo; `git diff` dos arquivos rastreados vazio.

## Decisões tomadas

- Arquivo `-qa` ao lado do do engenheiro, sem mexer nele: o teste dele cobre a tabela da T10 por inteiro; o meu cobre o
  que ela não toca (o serviço real e a rota real sobre o banco semeado).
- V-02 testado aqui pela rota real e com token real (prefixo diferente de `ficticio`): é o cenário 7.3 sem a
  homologação, e prova que as duas demandas da V-02 saem do seed no estado certo para o `enviar-andamento.mjs`.
- O Minor 1 da revisão (o seed repete o bloco do serviço) ganhou guarda de comportamento: se o seed passar a gravar algo
  que o serviço não lê como o mesmo estado, o reenvio do último passo grava linha e o teste falha.
- Fora do `PISO` de asserções: a G3 só o pede nas T01, T02, T03, T07, T08 e T09.
- Não rodei `pnpm test:e2e`: a T10 não muda tela, e os e2e que dependem do seed (selo, seção, contadores) são da T12 a T14.

## Pendências

- Dois comandos rodados por engano, ambos só de leitura e sem efeito, declarados abaixo: (a) um `git -C <repo> grep` com
  `\|` (alternativa em regex num comando só) sobre o plano, contra a regra do maestro; (b) um `git -C <repo> grep` com
  `-A30` depois do padrão, que o git recusou (erro 128) e foi refeito na forma certa.
- Para a T12 a T14 (já apontado pela revisão): a primeira página da fila passa a ter demandas em `em_construcao` com
  selo, e os comentários "28 no banco novo" de `e2e/fila-contadores.spec.ts` e `e2e/fila-origem-qa.spec.ts` ficam
  desatualizados. A `andamentoParaEnviar` só fica em `aprovada` até o primeiro envio (e2e da T14 ou V-02): e2e que a usem
  em mais de um arquivo precisam de banco novo ou de ordem própria.
- Para a `10-documentacao`: `docs/manual-tecnico/10-configuracao-e-scripts.md` ainda diz 28 demandas no seed.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo ou sair do repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### T10" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md`
- `grep -rn "P-07" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "D-07\|D-11" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — alternativa em regex num comando só (ver Pendências)
- `grep -rn "V-02" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/01-analista-requisitos.md`
- `grep -rn "AN-15" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/04-seguranca-aplicacao.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 84a0b254fa3ef284acb680650da19e8c766a8da8`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -4`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "registrarAndamento(" -- src test scripts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A8 "export function atorDeIntegracao" -- test/integracoes.ts` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A6 "atorDeIntegracao" -- test/integracoes.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "ja_semeado" -- scripts src/db` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/app/api/pedidos-construcao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "export function chamadasDoConstruir" -- test/pedidos-construcao.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function seedFicticio" -A30 -- scripts/seed-ficticio.ts` — erro 128 do git (opção depois do padrão); refeito abaixo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A30 "export async function seedFicticio" -- scripts/seed-ficticio.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "prefixoConstruir =" -- src/app/api/pedidos-construcao/andamento.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "andamento" -- src/modules/demandas/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- src/modules/andamento/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A12 "IMPORTAM_CONSULTAS" -- test/estatico/andamento.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export" -- test/requisicao.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "AndamentoVista =" -- src/modules/andamento/schemas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "params" -- "src/app/api/demandas/[id]/route.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "demanda:" -- src/lib/rota.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "RE_ID_DEMANDA =" -- src`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-andamento-qa.test.ts --reporter=dot` — 5 de 5
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test scripts/seed-andamento-qa.test.ts --reporter=dot` — com a mutação proposital no próprio teste: 2 de 5 falharam (esperado); mutação desfeita
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 7490 de 7490 (338 arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só o arquivo novo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 84a0b254fa3ef284acb680650da19e8c766a8da8 -- scripts/scripts.test.ts scripts/seed-integracoes.test.ts scripts/seed-integracoes-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste (tabela acima)
- [x] a suíte inteira passa (7490 de 7490, 338 arquivos)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real (banco próprio por `describe`, um `it` por banco nos que gravam, `relogioFixo`)
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff` vazio e com o diff da G5 no commit `84a0b25`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real (tokens só em tempo de teste, títulos e contas fictícios)
