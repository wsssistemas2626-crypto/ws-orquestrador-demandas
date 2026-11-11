---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T08-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G1 a G7, T07 final, T08, início da T09), 06-T08-engenheiro-backend.md, commit 29eaa9f, src/components/dados-da-fila.ts, src/components/dados-da-fila.test.ts, src/lib/fuso.ts, src/app/(painel)/demandas/fila.tsx, passagens.jsonl]
status: bloqueado
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T08 (regras de exibição da fila, `engenheiro-backend`), commit `29eaa9f`. **Parecer: aprovada, sem
Critical nem Important.** O bloqueio é só do comando (ver Pendências); a revisão em si está completa.

### O que foi conferido

- **Escopo:** o commit cria só `src/components/dados-da-fila.ts` e `src/components/dados-da-fila.test.ts` (mais a
  entrega e o registro do maestro), os dois arquivos da tarefa. Nenhum arquivo existente alterado.
- **Código igual ao do plano** (T08, passo 3), só reformatado e comentado. Assinaturas iguais às do G7
  (`ContadorDaFila`, `contadoresDaFila`, `idadeDaDemanda`, `textoDasEtapas`) e `TEXTOS_CONTADORES`.
- **Testes:** os sete casos do plano, mais um de cor (desvio declarado, só acrescenta asserção sobre o campo `cor` do
  G7, sem mudar regra). Cada teste falharia sem o código; a falha antes do código está na entrega do engenheiro
  (`Cannot find module './dados-da-fila'`).
- **Função pura (G3.7, G3.8, CV-09):** de `src/modules/` só `import type`; os valores vêm de `src/lib/fuso.ts` e
  `./rotulos`. Sem `db`, `autorizar`, `lib/deps` nem Server Action. O agora chega por argumento; o teste usa datas
  fixas, sem relógio real.
- **`idadeDaDemanda`:** `dataIsoSaoPaulo` devolve `AAAA-MM-DD` (conferido em `fuso.ts:47-50`), então a diferença de
  dias em UTC entre as duas datas civis é exata; o caso das 23h30 de 09/11 local dá "1 dia", como o CA-06.2 pede.
- **CV-07 e CV-19:** o `href` sai de `hrefDaFila` (`fila.tsx:67-76`), que só monta `URLSearchParams` com campos do
  filtro já validado por `filtroDemandasSchema`; o status vem de `Object.keys(ROTULO_STATUS)`. O teste confere prefixo
  `/demandas` e `valor` vazio ou do enum.
- **Sem duplicação:** usa `hrefDaFila`, `dataIsoSaoPaulo` e `formatarData` existentes; nenhum `dados-*.ts` de hoje
  calcula idade, contador ou texto de etapas.
- **CV-01 (G4):** o `git diff 198e97d -- …` das superfícies congeladas saiu vazio; `git diff 198e97d --stat --
  src/modules` lista só `resumo-da-fila.ts` e o teste dele (T07); `package.json` tem só as 2 linhas da T02.
- **Verde:** `pnpm test` 222 arquivos e 4877 testes; `pnpm lint` e `pnpm typecheck` limpos; árvore limpa.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture.
- [x] Entrada externa validada com Zod; erro sem vazar detalhe (a T08 não recebe entrada externa; o filtro chega por
      `filtroDemandasSchema`).
- [x] Banco: não se aplica (a T08 não toca banco nem migration).
- [x] Nada duplica função que já existe no repositório.
- [x] Textos de interface em pt-BR; axe: não se aplica (a T08 não cria nem toca tela; a T09 renderiza).
- [x] O que é Minor vai para Pendências; só Critical e Important bloqueiam a passagem.
- [x] No PR: fica com a `08-revisao` (G2); não se aplica à revisão de tarefa.

### Pareceres (todos Minor, não bloqueiam)

1. `src/components/dados-da-fila.test.ts:56` — a lista dos status aceitos está escrita à mão. Razão: se o enum `STATUS`
   de `src/modules/demandas/schemas.ts` ganhar um valor, o teste não acompanha e reprova o status novo, ou, se um
   valor sair, segue aceitando o antigo. Sugestão: `['', ...STATUS]` (valor, num teste, não fere o CV-09). Veio assim
   do plano.
2. `src/components/dados-da-fila.ts:65` — `dias <= 0` dá "Hoje" também para data de criação no futuro (relógio
   adiantado ou dado errado) e não há teste desse caso. Razão: o comportamento é aceitável, mas fica implícito.
   Sugestão para a `qa-automacao`: um caso com `criadaEm` depois de `agora` esperando "Hoje".

## Decisões tomadas

- Aprovar a T08 sem devolução: nenhum Critical ou Important; os dois achados são Minor e vão para Pendências, pela
  seção 12.
- Aceitar o teste a mais de cor: está dentro dos arquivos da tarefa e confere um campo do G7 que a T09 consome.

## Pendências

- Comando fora da lista Pode: `tail` (só leitura), rodado por engano para ler o resumo da saída do `pnpm test` gravada
  pela ferramenta fora do repositório; a leitura cabia no Read. A revisão está completa e o parecer é de aprovação:
  pela regra de Fabiano de 25/10, basta regravar a entrega sem o comando e com `status: pronto`.
- Minor 1 (`dados-da-fila.test.ts:56`): lista de status à mão no teste do CV-07/CV-19; trocar por `['', ...STATUS]`
  quando a `qa-automacao` ou a T09 tocar o arquivo.
- Minor 2 (`dados-da-fila.ts:65`): caso de `criadaEm` no futuro sem teste; sugestão para a `06-T08-testes`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 29eaa9f` — 4 arquivos, 2 de código da T08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 29eaa9f` — diff conferido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261110-0015-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules` — só `resumo-da-fila.ts` e `resumo-da-fila.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- package.json` — 2 inserções (T02)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 4877 de 4877 (222 arquivos)
- `tail -n 12 /home/deploy/.claude/projects/-home-deploy-servidor-projetos-estruturaAutonoma/0a919744-0e04-42d0-bf4b-e75d6acefb82/tool-results/bdgwj8jkw.txt` — fora da lista Pode (ver Pendências); resumo da saída do `pnpm test`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/components/` — lista dos `dados-*.ts`, para a conferência de duplicação

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
