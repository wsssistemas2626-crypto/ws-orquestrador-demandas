---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T13-testes
agente: qa-automacao
leu: [pedido.json, contrato-passagem.md, docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (G0 a G10 e T13), 01-analista-requisitos.md (RF-03 a RF-06), 06-T13-engenheiro-frontend.md, 06-T13-tech-lead.md, commit e1273559d798b74eedcd665f867126fa2dacc045, src/components/dados-das-etapas.ts, src/app/(painel)/demandas/[id]/page.tsx (linhas 370 a 454), src/app/(painel)/demandas/[id]/demanda-da-pagina.ts, src/modules/acesso/matriz.ts (linhas 25 a 84), src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts, src/components/dados-das-etapas-arquivamento.test.ts, test/estatico/detalhe-dec.test.ts, test/estatico/piso-de-assercoes.test.ts (linhas 250 a 277), src/app/(painel)/demandas/[id]/detalhe-qa.test.ts (linhas 1 a 175), src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts (linhas 1 a 229), src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia-qa.test.ts (linhas 1 a 130), saída do pnpm test em /tmp]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T13 (commit `e1273559`, `engenheiro-frontend`). Parecer: **o código cumpre os critérios da tarefa**. Os
testes adversariais novos não acharam defeito no código. Acharam três brechas na guarda textual do CV-09
(`detalhe-dec.test.ts`), e nenhuma delas é usada pela página de hoje. Elas ficam fechadas por uma guarda nova sobre a
página real. Os três arquivos novos entram no `PISO`.

### Critérios da tarefa e os testes que os cobrem

| Critério (T13 do plano; 7.2, itens 3 e 4; D-14; G9; CV-09) | Teste do engenheiro | Teste novo desta etapa |
|---|---|---|
| 1. Aprovada, v2 arquivado, v1 vigente: etapa 4 do v1, "Aprovada, opção X", feita; atual 5; linha 10 com o link do v1 | `dados-das-etapas-arquivamento.test.ts` > "em Aprovada, v2 arquivado e o v1 vigente lido…"; `detalhe-vigente.test.ts` > "o HTML da barra mostra o v1 na etapa 4…" | `detalhe-vigente-banco-qa.test.ts` > "vigente atualizado (arquivar o v2 → Aprovada)…"; `dados-das-etapas-arquivamento-qa.test.ts` > varredura "aprovada, vigente atualizado, …" |
| 2. Sem `decVigente` (ausente ou `null`): a etapa 4 de hoje | `dados-das-etapas-arquivamento.test.ts` > "sem decVigente (%s) e o v2 arquivado…" | varredura, cenários "sem vigente" (três formas) |
| 3. `decVigente` com id diferente de `vigenteDe(d)`: lança | `dados-das-etapas-arquivamento.test.ts` > "decVigente com id diferente…"; `detalhe-vigente.test.ts` > "vigente lido com outro id…" | `dados-das-etapas-arquivamento-qa.test.ts` > "decVigente com %s → … lançam" (o arquivado, o aprovado substituído, outra demanda, vista sem vigente, id fora do formato), nos nove status |
| 4. Vigente desatualizado em `em_analise`/`nova`: linha 6; em Aprovada: 10; em Encerrada: 1 | `dados-das-etapas-arquivamento.test.ts` > "v2 arquivado e v1 vigente desatualizado, em %s → linha 6…", "o mesmo caso em Aprovada…" | `detalhe-vigente-banco-qa.test.ts` > "vigente desatualizado pelo RSK novo (arquivar o v2 → Em análise)…"; varredura > "o vigente desatualizado não muda a barra nem a Próxima ação…" |
| 5. Sem vigente: linha 6 em `nova`/`em_analise`; 13 em pronta; nos outros, a de hoje | `dados-das-etapas-arquivamento.test.ts` > "sem vigente (só o v1, arquivado)…" (dois testes) | `detalhe-vigente-banco-qa.test.ts` > "sem vigente (v1 de dupla aprovação só com o CTO; arquivar o v2 → Encerrada)…"; varredura |
| 6. G9: lê o vigente só com o mais novo arquivado e um vigente, depois de autorizar, pelo id da vista; 404 e autorização negada não leem | `detalhe-vigente.test.ts` (12 testes) | `detalhe-vigente-banco-qa.test.ts` (6 testes, banco real, ordem das leituras, ids só da própria demanda); `detalhe-vigente-qa.test.ts` > regra 4 |
| 7. CV-09: o id do vigente não vem da URL nem de outra demanda; a leitura não acontece antes de autorizar | `detalhe-dec.test.ts` > "aceita o id de vigenteDe(d) lido depois de autorizar, e só ele" | `detalhe-vigente-qa.test.ts` (7 testes, página real e casos plantados); `detalhe-vigente-banco-qa.test.ts` (id da outra demanda em `?dec`, `?decId`, `?vigente` e `?id`) |
| 8. G5: `linhaEsperada` com "DEC arquivado" em `nova`/`em_analise` → 6 | `dados-das-etapas.test.ts` (varredura do RF-09) | varredura, os nove status |
| 9. `PISO`: `detalhe-vigente.test.ts` 24 e `detalhe-dec.test.ts` 19 | `piso-de-assercoes.test.ts` | os três arquivos novos no `PISO` |

### Testes acrescentados

1. `src/components/dados-das-etapas-arquivamento-qa.test.ts`: 764 testes, 15 linhas com `expect(`. Varre os nove status,
   sete cenários do vigente com o mais novo arquivado (atualizado; desatualizado; sem vigente com o anterior devolvido,
   só o arquivado e o aprovado substituído; dois arquivados sobre o vigente; o v2 vigente que substituiu o v1, com o v3
   arquivado), quatro pedidos (nenhum, do vigente, do arquivado, do v1 substituído) e três andamentos. São 756
   combinações, conferidas contra um oráculo escrito no próprio teste: etapa 4, etapa 5, etapa atual, linha e link. Também
   cobre: o desatualizado não muda nada em relação ao atualizado; `decVigente` incoerente lança em cinco formas, nos nove
   status; com o mais novo pendente, o `decVigente` coerente não muda a etapa 4 nem a linha 8.
2. `src/app/(painel)/demandas/[id]/detalhe-vigente-banco-qa.test.ts`: 6 testes, 50 linhas com `expect(`. Usa banco,
   sessão com 2FA e matriz reais. Os estados vêm dos serviços reais, e `obterPacoteDecisao` é a função real, só contada.
   No mesmo banco existe outra demanda, com o v1 aprovado na opção B, pedido gerado e o v2 arquivado. Casos:
   - vigente atualizado, com o id da outra demanda em `?dec`, `?decId`, `?vigente` e `?id`: lê `[v2, v1]`, nessa ordem;
   - vigente desatualizado pelo RSK novo: Em análise e linha 6;
   - sem vigente (dupla aprovação incompleta): Encerrada, lê só o v2, nenhuma etapa atual e linha 1;
   - pedido do vigente já gerado: etapa 5 "Gerado" e nenhuma etapa atual;
   - v3 arquivado sobre o v2 que substituiu o v1: lê `[v3, v2]` e nunca o v1;
   - a outra demanda, aberta pelo próprio id: lê os DECs dela.

   Em todos os casos, nenhum id da outra demanda é lido nem chega ao HTML.
3. `test/estatico/detalhe-vigente-qa.test.ts`: 7 testes, 28 linhas com `expect(`. É uma guarda nova sobre o `page.tsx`
   real, com casos plantados que reprovam em cada regra:
   - `vigenteDe` é a importada de `components/dados-das-etapas`, sem declaração local, alias ou importação só de tipo
     (fecha o M1 da revisão);
   - `d` é declarada uma só vez, `const`, como `await lerDemandaDaPagina(id)`, sem sombra, reatribuição ou `let`;
   - toda chamada de `obterPacoteDecisao` do arquivo fica no corpo da página e recebe o `.id` de uma `const` única e não
     reatribuída, tirada de `d.pacotesDecisao[0]` ou de `vigenteDe(d)`. São exatamente duas leituras, uma de cada;
   - a leitura do vigente é o ramo verdadeiro de `decMaisNovo?.statusDecisao === 'arquivada' && <vigente>`. Ela vem depois
     do `Promise.all` que lê o mais novo e depois da autorização;
   - a página não importa nenhuma outra leitura de DEC ou de pedido: nada de `lerPacoteDaPagina`, `vigenteDaDemanda` ou
     `import *`.
4. `test/estatico/piso-de-assercoes.test.ts`: só acréscimo no `PISO`, com a contagem do fim da etapa:
   `test/estatico/detalhe-vigente-qa.test.ts` 28, `src/app/(painel)/demandas/[id]/detalhe-vigente-banco-qa.test.ts` 50 e
   `src/components/dados-das-etapas-arquivamento-qa.test.ts` 15.

### Resultados

- `pnpm test` completo, em segundo plano, com a saída lida pelo Read: **396 arquivos, 9274 de 9274, 0 falha** (202 s).
- Os oito arquivos da T13 juntos (os três novos, os dois do engenheiro, `detalhe-dec`, `piso-de-assercoes` e
  `piso-de-assercoes-0018`): 1000 de 1000.
- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- `git diff --stat`: só `test/estatico/piso-de-assercoes.test.ts`, com 6 linhas acrescentadas e nenhuma removida. Os
  três testes novos e esta entrega são arquivos novos. Nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou
  `.todo`, nem afrouxado.
- `pnpm test:e2e`: não rodei. Esta etapa não toca `e2e/`. O e2e da T05 com o mais novo arquivado, e o axe nessa tela, são
  da T14. O do engenheiro, nesta tarefa, deu 290 passaram e 0 falha.

## Decisões tomadas

- Página com banco real, além da de dublês: só o banco prova que o id do vigente vem da vista filtrada pela demanda. Por
  isso há uma outra demanda viva no mesmo banco, com o id dela na URL.
- Guarda estática em arquivo novo, e não mudança no `detalhe-dec.test.ts`: a G3.2 só deixa o teste de segurança
  existente mudar pela G5. O acréscimo cobre o M1 e as brechas abaixo sem tocar asserção de hoje.
- O oráculo da varredura é a regra reescrita no teste, sem importar a função testada nem outro `*.test.ts` (D-06).
- Os três arquivos entram no `PISO`, inclusive a varredura: ela também cobre o `decVigente` incoerente (CV-09).
- O vigente desatualizado mostrar a etapa 4 feita e a etapa 5 atual foi tratado como o comportamento pedido (7.2, item 3,
  e D-14 não condicionam ao desatualizado). Ficou provado pelo teste "o vigente desatualizado não muda…", e a leitura da
  tela vai para Pendências.

## Pendências

- Para a `08-revisao` (ratificar, junto com o M1 da `06-T13-revisao`): conferi lendo o código, sem rodar, que a regra 2
  do `test/estatico/detalhe-dec.test.ts` aceitaria três formas que a página de hoje não usa:
  - (a) `let vigenteResumo = vigenteDe(d);` seguido de reatribuição com um id da URL;
  - (b) `const d` em sombra num bloco interno, com a demanda de outro id;
  - (c) uma leitura `obterPacoteDecisao(deps.db, sp.dec)` numa função auxiliar fora do corpo de `PaginaDemanda`, porque a
    guarda só visita o corpo.

  As três, e as formas do M1, reprovam na guarda nova `test/estatico/detalhe-vigente-qa.test.ts`, que está no `PISO`.
  Não mexi no `detalhe-dec.test.ts` (G3.2).
- Para a `07-qa-funcional` (soma ao M3 da revisão): com o vigente desatualizado e a demanda em Em análise, a barra mostra
  a etapa 4 feita ("Aprovada, opção X") e a etapa 5 ("Ainda não gerado") como atual. Mas o pedido do v1 não pode ser
  gerado (409 desatualizado), e a Próxima ação é a linha 6 ("Montar o pacote de decisão."). Segue a 7.2 e a D-14 como
  estão escritas; vale olhar a leitura da tela.
- Comandos que só leem, para o maestro conferir contra a regra de comando deste prompt:
  - rodei `ls` na pasta do pedido e `git status --short` no repositório, que estão na minha lista **Pode** mas não na
    regra do prompt;
  - algumas buscas com `git grep` levaram alternativa (`\|` ou `-e` repetido), que a minha lista **Pode** manda dividir
    em um comando por alternativa.

  Todos estão em "Comandos executados", do jeito que rodaram. Nenhum alterou nada.
- T14: o e2e e o axe da T05 com o mais novo arquivado e um vigente, nas duas larguras.
- O pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## \|^### " -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show e1273559d798b74eedcd665f867126fa2dacc045 --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T05\|CA-03\|RF-03" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "item 3\|item 4" -- docs/construcao/DEC-DEM-20261111-0018-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show e1273559d798b74eedcd665f867126fa2dacc045 -- src/components/dados-das-etapas.ts "src/app/(painel)/demandas/[id]/page.tsx" test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas.test.ts test/estatico/piso-de-assercoes.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "ler_pacote_decisao\|ler_demanda:\|ler_demanda'" -- src/modules/acesso/matriz.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "pacoteDecisao.demandaId\|substituido" -- src/modules/demandas/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^import\|^const .* = async\|^async function" -- src/modules/demandas/arquivamento-status.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "registrarDecisao" -- test src/modules/pacotes-decisao`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -ln "definirDepsParaTeste" -- "src/app/(painel)"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vi.mock\|definirDepsParaTeste\|PaginaDemanda\|novoBanco\|criarDepsDeTeste\|^import" -- "src/app/(painel)/demandas/[id]/detalhe-qa.test.ts"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^import\|(d)\|(d,\|, d)\|const d \|obterPacoteDecisao\|vigenteDe\|searchParams" -- "src/app/(painel)/demandas/[id]/page.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function criarPessoa\|export function criarPessoa\|usuarioId\|cookie" -- test/sessao.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-arquivamento-qa.test.ts --reporter=dot` — 764 de 764
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/detalhe-vigente-qa.test.ts --reporter=dot` — 1 falha e 6 passaram: a página real reprovou na regra 2, porque `!d` contava como atribuição
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/detalhe-vigente-qa.test.ts --reporter=dot` — com diagnóstico temporário na mensagem: 2 falharam e 5 passaram (achou o `!d`; o diagnóstico saiu depois)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "(d) =>" -e "(d, " -e "{ d }" -e " d =" -e "(d: " -- "src/app/(painel)/demandas/[id]/page.tsx"`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/detalhe-vigente-qa.test.ts --reporter=dot` — com só `++` e `--` contando como atribuição: 7 de 7
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "export async function criarDepsDeTeste\|export function criarDepsDeTeste" -- test/deps.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/detalhe-vigente-banco-qa.test.ts" --reporter=dot` — 6 de 6
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -c "expect(" -- test/estatico/detalhe-vigente-qa.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente-banco-qa.test.ts" src/components/dados-das-etapas-arquivamento-qa.test.ts` — 28, 50 e 15
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico/piso-de-assercoes.test.ts test/estatico/piso-de-assercoes-0018.test.ts test/estatico/detalhe-vigente-qa.test.ts test/estatico/detalhe-dec.test.ts src/components/dados-das-etapas-arquivamento-qa.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente-banco-qa.test.ts" "src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts" src/components/dados-das-etapas-arquivamento.test.ts --reporter=dot` — 1000 de 1000, 8 arquivos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — em segundo plano: 9274 de 9274, 396 arquivos (202 s; saída lida pelo Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `test/estatico/piso-de-assercoes.test.ts`, 6 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep --untracked -n "only(\|skip(\|todo(\|Date.now\|new Date()\|token\|senha\|http" -- test/estatico/detalhe-vigente-qa.test.ts "src/app/(painel)/demandas/[id]/detalhe-vigente-banco-qa.test.ts" src/components/dados-das-etapas-arquivamento-qa.test.ts` — sem saída

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
