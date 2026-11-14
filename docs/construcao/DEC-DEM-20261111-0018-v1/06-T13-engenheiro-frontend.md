---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T13-construcao
agente: engenheiro-frontend
leu: [pedido.json (pelo prompt do maestro), padrao-tecnico.md (pela G0 a G3 do plano), contrato-passagem.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T13 nova), 05-tech-lead.md, 03-ux-ui-design.md (seção 6), 06-T13-engenheiro-frontend.md (a entrega anterior desta etapa), 06-T12-engenheiro-frontend.md (resultados e comandos), src/components/dados-das-etapas.ts, src/components/dados-das-etapas.test.ts (linhas 1 a 110 e 505 a 682), src/components/dados-das-etapas-andamento.test.ts, src/app/(painel)/demandas/[id]/page.tsx (linhas 1 a 30 e 385 a 444), src/app/(painel)/demandas/[id]/detalhe.test.ts, src/app/(painel)/demandas/[id]/demanda-da-pagina.ts, src/lib/erros.ts (linhas 1 a 45), test/estatico/detalhe-dec.test.ts, test/estatico/dados-das-etapas.test.ts, test/estatico/piso-de-assercoes.test.ts (linhas 245 a 273), test/estatico/piso-de-assercoes-0018.test.ts, saídas do pnpm test e do pnpm test:e2e em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T13 foi feita como a T13 nova do plano e a G5 ajustada na volta de 14/11. A leitura do vigente fica em
`PaginaDemanda`, por `obterPacoteDecisao` com o nome de hoje e com o id de `vigenteDe(d)`. O CV-09 não foi contornado:
o `detalhe-dec.test.ts` mudou só pela linha da G5.

### Arquivos alterados

- `src/components/dados-das-etapas.ts`:
  - `DadosDasEtapas.decVigente?: Pick<PacoteDecisaoVista, 'id' | 'decisao' | 'aprovadores'> | null`. É só tipo, e a
    guarda de `test/estatico/dados-das-etapas.test.ts` continua passando.
  - `vigenteDe` passa a `export function`, no mesmo lugar e com o mesmo corpo (G7).
  - `conferir` lança `etapas: DEC vigente incoerente` quando o `decVigente` veio e o id não é o de `vigenteDe(demanda)`.
  - `opcaoAprovada` aceita `Pick<…, 'decisao' | 'aprovadores'>`.
  - Etapa 4: com o mais novo arquivado e o `decVigente` presente, mostra o vigente (`idVersao` do v1, "Aprovada, opção
    X", feita).
  - A condição da linha 6 ganha `|| (dec.statusDecisao === 'arquivada' && (d.status === 'nova' || d.status === 'em_analise'))`.
- `src/app/(painel)/demandas/[id]/page.tsx`:
  - importa `vigenteDe`;
  - depois do `Promise.all`, entram `const vigenteResumo = vigenteDe(d);` e
    `const decVigente = decMaisNovo?.statusDecisao === 'arquivada' && vigenteResumo ? await obterPacoteDecisao(deps.db, vigenteResumo.id) : null;`,
    como no plano;
  - `decVigente` entra em `dadosDasEtapas`;
  - o comentário do topo ganha um parágrafo da 0.4.1.
- `test/estatico/detalhe-dec.test.ts` (G5, só acréscimo):
  - o comentário do topo ganha a regra nova;
  - entra o conjunto `doVigente`, com as constantes cujo inicializador, sem espaços, é exatamente `vigenteDe(d)`;
  - na regra 2, o `.id` de `doVigente` vale só com `autorizacao >= 0 && l.getStart() > autorizacao`. Fora disso, o
    achado de hoje, com o mesmo texto;
  - entra um `it` novo com os cinco casos plantados da G5, com o resultado exato de cada um;
  - nenhuma linha com `expect(` saiu nem mudou: de 14 para 19.
- `src/components/dados-das-etapas.test.ts` (G5, opção (a)):
  - `linhaEsperada` ganha o 4º parâmetro `maisNovoArquivado`, e a chamada passa `nome === 'DEC arquivado'`;
  - logo antes do `return 13` final, entra `if (maisNovoArquivado && (status === 'nova' || status === 'em_analise')) return 6;`;
  - o comentário ganha uma linha da 0.4.1;
  - continuam 109 linhas com `expect(`.
- `test/estatico/piso-de-assercoes.test.ts`: só acréscimo no `PISO`, com a contagem do fim da tarefa:
  `src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts`: 24 e `test/estatico/detalhe-dec.test.ts`: 19.

`src/app/(painel)/demandas/[id]/detalhe.test.ts` e `dados-das-etapas-andamento.test.ts` não precisaram mudar. Nenhum
caso deles tem o DEC mais novo arquivado e um vigente. Os dois passaram sem mudança.

### Testes criados

- `src/components/dados-das-etapas-arquivamento.test.ts`: 15 testes, 29 linhas com `expect(`. Cobre:
  - `vigenteDe` exportada;
  - item 1 (Aprovada, v2 arquivado e v1 vigente: etapa 4 do v1, "Aprovada, opção A", feita, atual 5, linha 10 com o link
    do v1);
  - a opção pela decisão ou pela 1ª aprovação, e o erro sem opção;
  - item 2 (`decVigente` ausente ou `null`: a etapa 4 de hoje);
  - o mais novo não arquivado ignora o `decVigente`;
  - item 3 (id diferente lança, inclusive com `decVigente` sem vigente na demanda);
  - item 4 (`em_analise` e `nova`: linha 6; Aprovada: 10; Encerrada: 1);
  - item 5 (sem vigente, em `nova` e `em_analise`: linha 6; nos outros status, a linha de hoje: 13 em Pronta para
    decisão, 10, 11, 12, 3 e 1);
  - a linha 2 vencendo a 6;
  - CV-19 na linha 6.
- `src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts`: 12 testes, 24 linhas com `expect(`. É o oráculo da G9:
  - com o v2 arquivado e o v1 vigente, lê o v2 e depois o v1, as duas leituras depois de autorizar `ler_pacote_decisao`,
    e nunca com o id de `?dec=`/`?decId=`;
  - o HTML da barra mostra o v1 na etapa 4 ("Aprovada, opção B", feita), a atual é a 5 e a Próxima ação é a linha 10;
  - em Em análise, a linha 6 com o link de hoje;
  - em cinco casos sem a condição, só o mais novo é lido, uma vez: arquivado sem vigente, aprovado substituído, pendente
    com vigente, aprovado e devolvido com vigente;
  - demanda inexistente: 404, sem leitura de DEC e sem autorizar `ler_pacote_decisao`;
  - autorização negada: rejeita, sem leitura de DEC;
  - falha na leitura do vigente: rejeita;
  - vigente lido com outro id: `etapas: DEC vigente incoerente`;
  - sentinelas do nome, do documento, do comentário e de quem decidiu fora do HTML.

### Teste antes do código (Passo 2)

Os dois testes da G5, com a regra 2 de hoje no `detalhe-dec.test.ts` (a condição nova voltada por um momento só para
ver a falha, e restaurada logo depois):

```
 FAIL  src/components/dados-das-etapas.test.ts > proximaAcao: bordas (06-T10-testes) > nova, DEC arquivado → linha 6
 FAIL  src/components/dados-das-etapas.test.ts > proximaAcao: bordas (06-T10-testes) > em_analise, DEC arquivado → linha 6
AssertionError: expected 13 to be 6 // Object.is equality
 FAIL  test/estatico/detalhe-dec.test.ts > CV-09 (T11): a leitura do DEC mais novo na página da T05 > aceita o id de vigenteDe(d) lido depois de autorizar, e só ele
+   "id do DEC fora de d.pacotesDecisao[0]: vigenteResumo.id",
      Tests  3 failed | 163 passed (166)
```

Com a condição nova restaurada, e antes do código da página, o `detalhe-dec.test.ts` passou com 6 de 6.

`dados-das-etapas-arquivamento.test.ts`: 9 falharam e 6 passaram, de 15.

```
TypeError: vigenteDe is not a function
AssertionError: expected { numero: 4, nome: 'Decisão', …(4) } to deeply equal { numero: 4, nome: 'Decisão', …(4) }
-   "estado": "Aprovada, opção A",   +   "estado": "Arquivada",
AssertionError: expected [Function] to throw an error
AssertionError: expected { linha: 13, …(4) } to deeply equal { linha: 6, …(4) }
```

`detalhe-vigente.test.ts`: 5 falharam e 7 passaram, de 12.

```
AssertionError: expected [ [ { dubleDoBanco: true }, …(1) ] ] to deeply equal [ …(2) ]
AssertionError: expected '<span aria-hidden="true" class="absol…' to contain '>DEC-DEM-20991231-0044-v1</span>'
AssertionError: expected '<section aria-labelledby="proxima-aca…' to contain 'Montar o pacote de decisão.'
AssertionError: promise resolved "'<div class="flex flex-col gap-5"><nav…'" instead of rejecting
```

Guardas que já nascem verdes (G3.1). Elas conferem o que **não** pode mudar, e por isso passam com o código de hoje:

- nos casos plantados novos do `detalhe-dec.test.ts`, os quatro que reprovam;
- no unitário, os 6 que passaram: `decVigente` ausente ou `null`, o mais novo não arquivado, os outros status sem
  vigente, Aprovada e Encerrada, e a linha 2;
- na página, os 7 que passaram: os cinco casos em que só o mais novo é lido, o 404 e a autorização negada.

O teste que falha e que exige o código novo é o de cada arquivo listado acima.

### Resultados

- Os quatro arquivos da T13 depois do código: **193 de 193**.
- `detalhe-vigente`, `detalhe`, `dados-das-etapas-arquivamento` e `dados-das-etapas-andamento`: 104 de 104.
- `src/app/(painel)/demandas/[id]` e `src/components`: 1313 de 1313, em 56 arquivos.
- `test/estatico`: 1264 de 1264, em 53 arquivos.
- `piso-de-assercoes`, `piso-de-assercoes-0018` e `dados-das-etapas` (estático): 197 de 197.
- `pnpm test` completo, em segundo plano: **393 arquivos, 8492 de 8492**, 0 falha (222 s).
- `pnpm typecheck` e `pnpm lint`: limpos.
- `pnpm test:e2e` completo (retries 0, 1 worker): **290 passaram, 9 pulados (`capturas.spec.ts`, como hoje), 0 falha**,
  em 9,7 min, com saída 0.
  - O `✘` do `vigia.spec.ts:5` ("CV-03 (negativo)") é a falha esperada do próprio teste e conta entre os 290.
  - O maior teste levou 7,4 s (`axe-todas.spec.ts:208` e `casca.spec.ts:126`). Nenhum passou de 24 s.
  - Telas da T05 que passaram, com o axe sem violação onde o teste o roda: `axe-todas.spec.ts:185` (T05 Detalhe),
    `detalhe-a2.spec.ts` (barra e Próxima ação), `detalhe-demanda.spec.ts:228` (axe), `andamento-detalhe.spec.ts:157`,
    `confirmacao-awave.spec.ts:19` e `seguranca.spec.ts:98`.
- G4: o `git diff 41108ee -- …` das superfícies congeladas saiu **vazio**.
- `git diff --stat`: só os cinco arquivos acima. Os dois testes novos e esta entrega são arquivos novos.
- Contagem de `expect(`:
  - `dados-das-etapas.test.ts`: 109 (igual);
  - `detalhe-dec.test.ts`: 19 (eram 14);
  - `detalhe-vigente.test.ts`: 24;
  - `dados-das-etapas-arquivamento.test.ts`: 29.

### Desvios do plano

1. A mensagem do erro novo de `conferir` é `etapas: DEC vigente incoerente`. O plano diz só "lança", no molde de
   `conferir`. O texto segue o das duas mensagens de hoje (`etapas: … incoerente`).
2. `vigenteDe` virou `export function` no lugar de hoje, como a G7 escreve, e não `export const`. O corpo é o mesmo.

## Decisões tomadas

- Para ver o caso da forma certa falhar com a regra de hoje, a condição da regra 2 voltou a `if (!certo)` por um
  momento e foi restaurada logo depois. O `it` novo e o `doVigente` foram escritos antes, como manda a G5.
- `conferir` confere o id do `decVigente` mesmo quando o mais novo não está arquivado. Dado incoerente vira erro, como
  o da ESP e o do DEC mais novo, em vez de passar calado.
- Com o `decVigente` ausente ou `null`, a etapa 4 é a de hoje, sem lançar, como pede o item 2. A página só lê o vigente
  com o mais novo arquivado e com um vigente na vista. Fora disso, ela passa `null`.
- O teste da página usa um dublê de `obterPacoteDecisao` que atende os dois ids e lança em id não esperado. Assim, uma
  leitura com id que não veio da vista quebra o teste. Nos casos sem a condição, a prova é a contagem exata de
  chamadas.
- Não mexi em `detalhe.test.ts`. A linha dele na G5 vale "se o `pnpm test` apontar", e o `pnpm test` não apontou.

## Pendências

- Para a `06-T13-revisao`, conferir no `git diff`:
  - que o `detalhe-dec.test.ts` só ganhou o `doVigente`, a condição nova da regra 2, o comentário do topo e o `it` dos
    cinco casos;
  - que nenhuma linha com `expect(` saiu nem mudou;
  - que o `PISO` tem 19 para esse arquivo e 24 para o `detalhe-vigente.test.ts`;
  - que o `dados-das-etapas.test.ts` mudou só em `linhaEsperada`, na chamada dela e no comentário, com 109.
- Para a `08-revisao` ratificar (do `05-tech-lead.md`): a regra 2 do CV-09 ampliada para `vigenteDe(d)` depois de
  autorizar. A guarda é textual: ela confere o nome `vigenteDe` e o argumento `d`, e não de onde a função vem. Na
  página, `vigenteDe` é importada de `components/dados-das-etapas`.
- Para a T14: o e2e de hoje não abre a T05 de uma demanda com o DEC mais novo arquivado e um vigente. O "Arquivar com
  vigente" e o axe nessa tela, nas duas larguras, são da T14 (plano). Nesta tarefa, o axe passou nas telas da T05 que os
  specs de hoje conferem.
- O pedido, recebido pelo prompt do maestro, não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de
  fora ou sair do repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## \|^### " -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "autorizar\|obterPacoteDecisao\|Promise.all\|pacotesDecisao\[0\]\|vigenteDe\|dadosDasEtapas\|decMaisNovo\|^import\|^export\|notFound" -- "src/app/(painel)/demandas/[id]/page.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "PISO\|0018\|T12\|detalhe" -- test/estatico/piso-de-assercoes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio, no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## \|^### " -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "arquivada" -- src/components/dados-das-etapas.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "class ErroDominio\|constructor" -- src/lib/erros.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-arquivamento.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts" test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas.test.ts --reporter=dot` — antes do código, com a regra 2 de hoje: 17 falharam (saída longa; lida arquivo a arquivo nos três comandos seguintes)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas.test.ts --reporter=dot` — 3 falharam e 163 passaram, de 166 (os casos da G5)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/detalhe-dec.test.ts --reporter=dot` — com a condição nova restaurada: 6 de 6
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-arquivamento.test.ts --reporter=dot` — 9 falharam e 6 passaram, de 15
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts" --reporter=dot` — 5 falharam e 7 passaram, de 12
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-arquivamento.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts" test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas.test.ts --reporter=dot` — depois do código: 193 de 193
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts" src/components/dados-das-etapas-arquivamento.test.ts` — 19, 109, 24 e 29
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 8492 de 8492 (393 arquivos)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- test/estatico/detalhe-dec.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/dados-das-etapas.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "test:e2e\|docker compose\|axe" -- docs/construcao/DEC-DEM-20261111-0018-v1/06-T12-engenheiro-frontend.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts 'drizzle/000[0-9]_*.sql' 'drizzle/meta/000[0-9]_snapshot.json'` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — os cinco arquivos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- src/components/dados-das-etapas.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts test/estatico/dados-das-etapas.test.ts --reporter=dot` — 197 de 197
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]" src/components --reporter=dot` — 1313 de 1313 (56 arquivos), com a suíte rodando
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "Acompanhar a demanda\|Sem responsável definido\|>Arquivada<\|'Arquivada'" -- e2e` — sem saída
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo (de novo, com a suíte rodando)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico --reporter=dot` — 1264 de 1264 (53 arquivos), com a suíte rodando
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo (de novo)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -- "src/app/(painel)/demandas/[id]/page.tsx"`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-arquivamento.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts" "src/app/(painel)/demandas/[id]/detalhe.test.ts" src/components/dados-das-etapas-andamento.test.ts --reporter=dot` — 104 de 104
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "webServer\|command\|retries\|timeout\|workers" -- playwright.config.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n "token\|senha\|@\|http" -- src/components/dados-das-etapas-arquivamento.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts"` — sem saída
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "build\|next start\|next dev\|distDir\|spawn" -- e2e/servidor.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n "RESULTADO\|RASCUNHO" -- docs/construcao/DEC-DEM-20261111-0018-v1/06-T13-engenheiro-frontend.md` — sem saída
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — em segundo plano: 290 passaram, 9 pulados, 0 falha (9,7 min); maior teste 7,4 s

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
