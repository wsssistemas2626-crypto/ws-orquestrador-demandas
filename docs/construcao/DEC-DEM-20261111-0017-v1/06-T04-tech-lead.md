---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T04-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 6, 7 e 12), 05-tech-lead.md, 06-T03-tech-lead.md, 06-T04-engenheiro-backend.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (T04, linhas 932 a 1146; linhas do PISO), commit 3b39e526cec537b917287bdf109c6600f25d880f (git show), src/lib/rota.ts (no commit), src/lib/erros.ts (no commit), src/lib/rota.test.ts (casos de cookie), src/lib/rota-qa.test.ts (casos de cookie), src/modules/acesso/resolver-ator.ts (casos de cookie)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T04 (corpo fechado do andamento e 422 pelo `rota()` com `corpoInvalido`, AN-02 e ADR-33), commit `3b39e52`.
**Aprovada.** Nenhum problema Critical nem Important. O desvio no caso do cookie está **aceito**. Dois Minor ficam em
Pendências.

### Checklist da seção 12 do padrão técnico

- [x] **Faz o que o plano pede, nem mais nem menos.** O commit muda só os quatro arquivos da T04:
  `src/modules/andamento/schemas.ts` e `schemas.test.ts` (novos), `src/lib/rota-corpo-invalido.test.ts` (novo) e
  `src/lib/rota.ts`. Os dois de `andamento/` são o código do plano linha a linha. Em `rota-corpo-invalido.test.ts`, só o
  caso do cookie difere do plano (desvio abaixo), e a origem veio de `CONFIG_TESTE.urlBase`, como o plano manda na nota
  depois do código. Depois do commit, só `passagens.jsonl` mudou.
- [x] **Teste para cada comportamento novo, que falharia sem o código.** O 422 sem `campos` e sem eco falhou antes do
  código (`expected 400 to be 422`), e o módulo `schemas` não existia (trecho na entrega do engenheiro). Os casos "sem a
  opção" e "com e sem a opção, igual" nascem verdes de propósito: são a guarda de que nada muda fora da opção.
- [x] **Sem segredo nem dado pessoal real.** O token `construir` vem de `tokenDeIntegracao` em tempo de teste. O cookie
  `wsod.session_token=inventado` é um valor fictício, que nunca chega a ser consultado (ver o desvio). A mensagem da
  rota sintética é marcada como fictícia.
- [x] **Entrada externa validada com Zod; erro sem vazar detalhe.** `corpoAndamentoSchema` é `z.strictObject`, com as
  enumerações da tabela (fonte única em `src/db/schema/andamento.ts`), inteiros de 0 a `MAXIMO_DE_TAREFAS` e `refine`
  prontas ≤ total; sem coerção, `passthrough`, `catch` nem `default`. Com a opção, o `rota()` lança
  `ErroDominio('nao_processavel', mensagem)` sem `extras`, e `mapearErro` devolve só `erro` e `mensagem` (422 em
  `STATUS_DO_CODIGO`). A linha de log do `rota()` leva só `codigoErro`; o teste confirma que a sentinela não aparece nem
  na resposta nem no log.
- [x] **Banco.** Sem migration nem consulta nova nesta tarefa.
- [x] **Sem duplicação.** `validarCorpo` delega a `validar` sem a opção. A regex do DEC em `schemas.ts` repete a de
  `rota.ts`, mas o plano a quer assim e um teste prende as duas (`RE_ID_DEC_ANDAMENTO.source === reIdVersao('DEC').source`).
  As listas de fase e status vêm da tabela, sem cópia.
- [x] **Interface e axe.** A T04 não toca tela. As mensagens são as da 03, seção 7, em pt-BR, conferidas por inteiro.
- [x] **Minor em Pendências.** Só Critical e Important bloqueiam; não há nenhum.
- [x] **PR (`/code-review` e `/security-review`).** Não se aplica à revisão de tarefa; fica com a `08-revisao` (G2).

### Nenhuma rota existente muda com `corpoInvalido`

- **Diff de `rota.ts`** (AN-13): três trechos e nada mais. `src/lib/rota.ts:51-53` acrescenta a opção opcional em
  `OpRota`; `src/lib/rota.ts:89-94` acrescenta `validarCorpo`; `src/lib/rota.ts:163` troca `validar(op.corpo, …)` por
  `validarCorpo(op.corpo, …, op.corpoInvalido)`.
- **Sem a opção, o caminho é o mesmo de antes.** A primeira linha de `validarCorpo` é `if (!invalido) return
  validar(schema, valor)`: o mesmo `validar`, o mesmo `deZod` e o mesmo 400 com `campos`. A query continua em `validar`.
  A ordem do `rota()` não mudou: params (404), CSRF (403 e 415), `resolverAtor` (400 de ator ambíguo), `autorizar`, query,
  `lerCorpoJson` (400 de JSON malformado e 413) e só então o Zod do corpo. Por isso a opção só alcança a falha do Zod do
  corpo, e nada antes dela.
- **Ninguém passa a opção ainda.** `git grep corpoInvalido -- src test e2e scripts` acha só `rota.ts`, o teste novo e
  as constantes de `schemas.ts`. Nenhum `route.ts` usa a opção; a rota do andamento é da T08.
- **O tipo** `codigo: 'nao_processavel'` é literal: a opção não consegue trocar o 422 por outro status.
- **Testes do adaptador sem mudança.** `git diff 0ac099a 3b39e52 --stat` de `rota.test.ts`, `rota-qa.test.ts`,
  `erros.ts`, `corpo.ts` e das superfícies congeladas da G4 saiu **vazio**. Nesta revisão, `rota.test.ts`,
  `rota-qa.test.ts`, os dois testes novos e `test/estatico/andamento.test.ts`: 5 arquivos, **109 de 109**.
  `pnpm typecheck` e `pnpm lint` limpos.

### O desvio do caso do cookie: aceito

O plano escreve `cookie: 'qualquer=1'` e espera 400. Esse caso estava errado no plano. `resolverAtor` só acusa ator
ambíguo quando o cookie é o de sessão (`COOKIES_DE_SESSAO`, `src/modules/acesso/resolver-ator.ts:12` e `:30`). Com
`qualquer=1`, a origem certa e o JSON, o CSRF passa, o Bearer do `construir` resolve o ator, `registrar_andamento` é
autorizado e `{"n":1}` é válido: o 204 que o engenheiro viu é o comportamento correto do código.

A troca para `wsod.session_token=inventado` (`src/lib/rota-corpo-invalido.test.ts:64`) cumpre o que o plano pede na nota
depois do código: o 400 de hoje para cookie de sessão com Bearer (`src/lib/rota.test.ts:213-214`, que usa o cookie de
uma sessão real). O valor fictício basta, porque a ambiguidade lança antes de `exigirPessoa` consultar a sessão, e é a
mesma forma de `src/lib/rota.test.ts:137`. O status esperado (400) e a regra "igual com e sem a opção" não mudaram, e o
arquivo é novo desta tarefa, então nenhum teste existente perdeu força.

## Decisões tomadas

- **Aprovada sem devolução:** o código é o do plano, a opção não alcança nenhuma rota de hoje e não há Critical nem
  Important.
- **Desvio aceito:** o caso do plano esperava um 400 que o código correto não dá; o caso novo prova o 400 que o plano
  quis provar, pela mesma forma de `rota.test.ts`, sem credencial real.
- **Piso de asserções sem mudança aceito:** a T04 não está na lista de tarefas que acrescentam arquivo ao `PISO` (plano,
  linha 145: T01, T02, T03, T07, T08 e T09).
- **`proximo: qa-automacao`:** a próxima etapa da tarefa é a `06-T04-testes`.

## Pendências

- Nenhuma bloqueia a passagem.
- **Minor 1, `src/lib/rota-corpo-invalido.test.ts:64-66`:** os quatro casos "com e sem a opção, igual" conferem só o
  status. A razão: no caso do cookie, um 400 vindo de outro ponto do `rota()` também passaria, e o caso existe para
  provar a ambiguidade. A sugestão para a `06-T04-testes` (qa-automacao), em arquivo próprio, é conferir também o `erro`
  (`entrada_invalida` sem `campos` no cookie, `tipo_nao_suportado` no 415, `corpo_grande` no 413) e que a resposta é
  idêntica com e sem a opção.
- **Minor 2, `src/lib/rota-corpo-invalido.test.ts:2`:** o comentário de topo ainda diz "cookie com Bearer", e o caso
  passou a ser "cookie de sessão com Bearer". A razão: o comentário descreve o arquivo e pode induzir a usar qualquer
  cookie de novo. Ajuste de texto, sem efeito no teste; pode ir junto com a T08 ou com a `08-revisao`.
- **Para a T08:** passar `corpo: corpoAndamentoSchema` e `corpoInvalido: CORPO_INVALIDO_ANDAMENTO` no `rota()` da rota do
  andamento, e provar pela rota o 422 idêntico e sem consulta (serviço trocado), como o plano manda.
- **Para a `08-revisao`:** o plano da T04 traz `cookie: 'qualquer=1'` no código do passo 1; quem reler o plano deve
  saber que o caso certo é o do cookie de sessão (decisão acima).
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 3b39e526cec537b917287bdf109c6600f25d880f` — 4 arquivos de código e teste, mais a passagem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^### T0" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seção da T04 no plano (linha 932)
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — seções do padrão técnico
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3b39e526cec537b917287bdf109c6600f25d880f -- src` — o diff da T04
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3b39e526cec537b917287bdf109c6600f25d880f:src/lib/rota.ts` — o adaptador inteiro no commit
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i -e "cookie" -- src/lib/rota.test.ts src/lib/rota-qa.test.ts src/modules/acesso/resolver-ator.ts` — só o cookie de sessão torna o ator ambíguo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "corpoInvalido" -- src test e2e scripts` — nenhum `route.ts` usa a opção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 3b39e526cec537b917287bdf109c6600f25d880f:src/lib/erros.ts` — `nao_processavel` → 422, extras só se vierem
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -A 8 -e "cookie e Bearer juntos" -- src/lib/rota.test.ts` — o 400 de hoje com cookie de sessão
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a 3b39e526cec537b917287bdf109c6600f25d880f --stat -- src/lib/rota.test.ts src/lib/rota-qa.test.ts src/lib/erros.ts src/lib/corpo.ts src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4 e arquivos que não mudam)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/schemas.test.ts src/lib/rota-corpo-invalido.test.ts src/lib/rota.test.ts src/lib/rota-qa.test.ts test/estatico/andamento.test.ts --reporter=dot` — 5 arquivos, 109 de 109
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 3b39e526cec537b917287bdf109c6600f25d880f HEAD --stat` — só `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "PISO" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — a T04 não amplia o piso

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
