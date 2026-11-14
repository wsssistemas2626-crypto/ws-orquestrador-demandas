---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T13-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G3, G4, G5, G7, G9 e T13), 06-T13-engenheiro-frontend.md, commit e1273559d798b74eedcd665f867126fa2dacc045, src/app/(painel)/demandas/[id]/page.tsx (linhas 380 a 449), src/components/dados-das-etapas.ts (linhas 100 a 253), test/estatico/detalhe-dec.test.ts, saída do pnpm test em /tmp]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T13 (commit `e1273559`, `engenheiro-frontend`). Parecer: **aprovada**. Nenhum problema Critical ou Important;
três Minor, abaixo, vão para Pendências e não bloqueiam a passagem.

### Conferência pedida pelo maestro

1. **CV-09 (`test/estatico/detalhe-dec.test.ts`) só com acréscimos, e no PISO.** O `git diff 41108ee` do arquivo mostra:
   o parágrafo novo no comentário do topo (linhas 7 a 9); o conjunto `doVigente` (linhas 40, 41 e 45), com inicializador
   sem espaços exatamente `vigenteDe(d)`; a regra 2 ampliada (linhas 64 a 67), em que o `.id` de `doVigente` só vale com
   `autorizacao >= 0 && l.getStart() > autorizacao`, e fora disso o achado de hoje com o mesmo texto; e o `it` novo
   (linhas 103 a 114) com os cinco casos plantados da G5, cada um com o resultado exato da tabela (`[]`; `vigenteDe(outra)`
   → `[FORA]`; leitura antes de autorizar → `['obterPacoteDecisao antes de autorizar', FORA]`; sem autorizar →
   `["sem autorizar(...)", FORA]`; outro inicializador → `[FORA]`). A única linha removida é o `if (!certo)` da regra 2,
   trocado pela condição ampliada que a G5 manda: nenhuma linha com `expect(` saiu nem mudou, e as asserções e títulos
   de `params`, `searchParams`, literal, `d.pacotesDecisao[1]` e falta de id estão intactos. Contagem: 19 linhas com
   `expect(` (eram 14), igual ao `PISO` (`'test/estatico/detalhe-dec.test.ts': 19`). Conferido.
2. **Leitura do vigente em `PaginaDemanda`, por `obterPacoteDecisao`, sem contornar o CV-09.** `page.tsx:418-419`:
   `const vigenteResumo = vigenteDe(d);` e `obterPacoteDecisao(deps.db, vigenteResumo.id)`, com o nome de importação
   de hoje, `vigenteDe` importada de `components/dados-das-etapas` (`page.tsx:40`). A leitura vem depois de
   `autorizar(pessoa, 'ler_pacote_decisao')` (`page.tsx:407`), e só acontece com `decMaisNovo?.statusDecisao ===
   'arquivada'`, o que implica `decResumo` presente e, portanto, a autorização feita. O teste do CV-09 sobre a página
   real (`detalhe-dec.test.ts:74-76`) passa. Conferido.
3. **Opção (a) da linha 6 e `linhaEsperada` só nas duas combinações.** `dados-das-etapas.ts:246` ganha
   `|| (dec.statusDecisao === 'arquivada' && (d.status === 'nova' || d.status === 'em_analise'))`, sem condição de
   vigente. No `dados-das-etapas.test.ts`, o `git diff 41108ee` tem só o comentário (linha 635), o 4º parâmetro
   `maisNovoArquivado`, o `if` logo antes do `return 13` e a chamada com `nome === 'DEC arquivado'`. Como o
   `pelasVersoes` de "DEC arquivado" é `null` e os `return` de `entregue`, `encerrada`, `aguardando_informacao`,
   `aprovada`, `em_construcao` e `devolvida` vêm antes, o resultado só muda em `nova` e `em_analise` com "DEC arquivado"
   (13 → 6); `pronta_para_decisao` continua 13. 109 linhas com `expect(` (igual). Conferido.
4. **A barra mostra o vigente como "Aprovada, opção X".** `dados-das-etapas.ts:143-146`: com o mais novo arquivado e o
   `decVigente` presente, a etapa 4 é `{ idVersao: decVigente.id, estado: 'Aprovada, opção ' + opcaoAprovada(decVigente),
   feita: true }`; sem `decVigente`, a de hoje. `conferir` (linha 80 do arquivo) lança `etapas: DEC vigente incoerente`
   quando o id do `decVigente` não é o de `vigenteDe(demanda)`. O `detalhe-vigente.test.ts:193-207` confere no HTML da
   página: etapa 4 com o v1, "Aprovada, opção B", `data-marca="feita"`, a atual é a 5, e nenhum dado de quem aprovou
   (sentinelas) na tela. Conferido.

### Checklist da seção 12 do padrão técnico

- Faz o que o plano pede: os arquivos do commit são os da lista da T13 (dois modificados de código, dois testes da G5,
  o `PISO`, dois testes novos), mais a entrega e o `passagens.jsonl`. `detalhe.test.ts` não mudou, o que a G5 permite
  ("se o `pnpm test` apontar"). Os dois desvios declarados (texto `etapas: DEC vigente incoerente` e `export function`)
  seguem o molde de hoje e a G7.
- Teste para cada comportamento novo, visto falhando: a entrega traz a falha dos dois testes da G5 (3 de 166), do
  unitário (9 de 15) e da página (5 de 12), e nomeia as guardas que nascem verdes (G3.1).
- G9 (visibilidade da leitura nova): o `detalhe-vigente.test.ts` prova que o vigente só é lido com o mais novo arquivado
  e um vigente, depois de autorizar, pelo id da vista e nunca pelo da URL; cinco casos fora da condição leem só o mais
  novo, uma vez; 404 e autorização negada não leem DEC; falha na leitura e vista incoerente rejeitam. Está no `PISO` (24).
- Sem segredo nem dado pessoal real: fixtures com `Pessoa Ficticia`, ids `DEM-2099…`.
- Entrada externa: nenhuma nova (o id vem da vista da demanda). Banco: nada.
- Sem duplicação: `vigenteDe` foi exportada, não copiada; `opcaoAprovada` foi reaproveitada com o tipo alargado.
- Textos: "Aprovada, opção X" e "Montar o pacote de decisão." são as constantes de hoje.
- G4: o comando das superfícies congeladas saiu vazio; o diff do `PISO` desde `41108ee` só tem acréscimos e subidas.

### Resultados desta revisão

- Arquivos da T13 com `detalhe.test.ts`, `piso-de-assercoes.test.ts` e o estático de `dados-das-etapas`: 7 arquivos,
  452 de 452.
- `pnpm test` completo: 393 arquivos, 8492 de 8492, 0 falha (193 s; saída lida pelo Read).
- `pnpm typecheck` e `pnpm lint`: limpos.
- Contagem de `expect(`: `detalhe-vigente.test.ts` 24, `dados-das-etapas-arquivamento.test.ts` 29,
  `dados-das-etapas.test.ts` 109, `detalhe-dec.test.ts` 19.

## Decisões tomadas

- Aprovada sem devolução: as quatro conferências do maestro batem com a G5 e a T13, e o checklist da seção 12 está
  cumprido.
- O `conferir` checar o `decVigente` também quando o mais novo não está arquivado foi aceito: dado incoerente vira erro,
  no molde das outras duas conferências, e a página só passa `decVigente` com o mais novo arquivado.
- A guarda textual de `vigenteDe(d)` (sem conferir de onde `vigenteDe` vem) foi aceita nesta revisão porque é a regra
  que a G5 escreveu; fica como Minor para a 08 ratificar.

## Pendências

- Minor M1 (`test/estatico/detalhe-dec.test.ts:45`): a regra nova reconhece a constante pelo texto `vigenteDe(d)`, sem
  conferir que `vigenteDe` é a importada de `components/dados-das-etapas` nem que `d` é a vista lida por
  `lerDemandaDaPagina`. Razão: uma `vigenteDe` local, definida em `page.tsx`, passaria a guarda. O mesmo vale hoje para
  `d.pacotesDecisao[0]`, e a G5 pediu exatamente esta forma; para a 08 ratificar ou pedir a conferência da importação.
- Minor M2 (`src/app/(painel)/demandas/[id]/page.tsx:419`): a leitura do vigente é um `await` depois do `Promise.all`,
  em série. Razão: só acontece com o mais novo arquivado e um vigente, e precisa do `statusDecisao` do mais novo; o
  custo é uma consulta a mais nesse caso. Sem ação agora.
- Minor M3 (comportamento, para a `qa-funcional`): com o mais novo arquivado, um vigente e a demanda em Nova ou Em
  análise, a barra mostra a etapa 4 feita ("Aprovada, opção X") e a Próxima ação é a linha 6 ("Montar o pacote de
  decisão."). É o que 7.2, itens 3 e 4, e a opção (a) mandam; vale a `07-qa-funcional` olhar a leitura da tela.
- T14: o e2e e o axe da T05 com o mais novo arquivado e um vigente, nas duas larguras, são da T14 (plano).
- O pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do repositório.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff e1273559d798b74eedcd665f867126fa2dacc045~1 e1273559d798b74eedcd665f867126fa2dacc045 --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T13" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show e1273559d798b74eedcd665f867126fa2dacc045 -- src test`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## 12" -- docs` — sem saída (a seção 12 está no `padrao-tecnico.md` da estruturaAutonoma, lido pelo Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "expect(" -- test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts" src/components/dados-das-etapas-arquivamento.test.ts` — 24, 29, 109 e 19
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/lib/rota.ts src/db/transacao.ts src/db/privilegios.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/pedido-construcao/pendentes.ts src/modules/pedido-construcao/entregar.ts src/modules/pedido-construcao/receber.ts src/modules/andamento/registrar.ts src/modules/limites.ts src/modules/pacotes-decisao/consultas.ts src/modules/demandas/consultas.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/agentes/entrada-agente.ts next.config.ts "drizzle/000[0-9]_*.sql" "drizzle/meta/000[0-9]_snapshot.json"` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- test/estatico/piso-de-assercoes.test.ts` — só acréscimos e subidas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- test/estatico/detalhe-dec.test.ts` — só o que a G5 descreve
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 41108ee -- src/components/dados-das-etapas.test.ts` — só o que a G5 descreve
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-arquivamento.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts" test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts" test/estatico/piso-de-assercoes.test.ts test/estatico/dados-das-etapas.test.ts --reporter=dot` — 452 de 452, em 7 arquivos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 8492 de 8492, 393 arquivos (passou a segundo plano depois de 180 s; saída lida pelo Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
