---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T13-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12, e 6 e 7), tarefas.json, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G7, linhas 1 a 256, e T11 a T14, linhas 2403 a 2739), 06-T13-engenheiro-frontend.md, 06-T11-tech-lead.md (M1), 06-T12-tech-lead.md, 06-T12-engenheiro-frontend.md, 04-seguranca-aplicacao.md (cabeçalho), 03-ux-ui-design.md (cabeçalho), commit aab5eb9b0a6aff50952fb6f0be70990a5b21cf90 (--stat e show), src/components/dados-do-andamento.ts, src/app/(painel)/demandas/[id]/page.tsx (linhas 95 a 234), src/proxy.ts, next.config.ts, e2e/apoio.ts, test/estatico/importacoes.ts, a saída do pnpm test]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisei a T13 (detalhe: seção "Andamento da construção", linha 15 da Próxima ação e texto de Mudar status), commit
`aab5eb9`. Não há Critical nem Important, então a tarefa passa. Os pareceres abaixo são Minor e ficam em Pendências.

**O que foi conferido**

- **Escopo (plano, T13, linhas 2632 a 2639).** O commit cria `SecaoAndamento.tsx`, `dados-das-etapas-andamento.test.ts` e
  `e2e/andamento-detalhe.spec.ts`. Modifica `dados-das-etapas.ts`, `detalhe.ts`, `page.tsx` e a asserção de
  `dicaAprovada` (G5). São os arquivos da tarefa. Fora da lista ficou só `src/components/dados-do-andamento.ts`, com
  duas mudanças de uma linha cada (veja "M1 da T11" e "Desvios"). `MudarStatus.tsx`, `transicoesManuaisDe` e
  `valoresDoEvento` não mudaram, como o plano pede.
- **G4.** Nenhuma superfície congelada nem arquivo de diff parcial da G4 aparece no `--stat` do commit.
- **G5.** O único teste existente que mudou foi `detalhe.test.ts:571`, com o texto novo de `dicaAprovada` (G5, linha 141
  do plano). A regra testada continua a mesma, e nenhuma asserção saiu. Nenhum `retries`, tempo-limite, regra do axe ou
  `bypassCSP` mudou.
- **Código contra o plano.**
  - A linha 15 (`dados-das-etapas.ts:185-187`) é o trecho do passo 3, letra a letra. Ela fica antes da 11, dentro de
    `em_construcao`, e só vale com `vigente !== null` e `andamento.decId === vigente.id`.
  - `proximaAcao` passa `x.andamento ?? null`. A igualdade estrita impede que um `decId` que não é texto feche com o
    vigente.
  - `dicaAprovada` e os textos da linha 15 batem com o plano e com a 03, 5.1 item 6 e 5.6.
  - `page.tsx` chama `secaoDoAndamento(d.andamento, d.pacotesDecisao, formatarDataHora)`. O item "Andamento da
    construção" entra **primeiro** em "Nesta página" quando a seção existe. A `Secao` vem logo depois do
    `CartaoProximaAcao` com `xl:col-start-3 xl:row-start-2`, e o Histórico usa `xl:row-[3/-1]` com a seção ou
    `xl:row-[2/-1]` sem ela. O `GRADE` não mudou.
- **Link do DEC.** O plano pede "`CLASSE_LINK` e 44 px abaixo de 768 px". `CLASSE_ACAO_DA_VERSAO` (`page.tsx:126`) é
  exatamente isso: `inline-flex min-h-11 min-w-11 … md:min-h-6 md:min-w-6 ${CLASSE_LINK}`. A classe chega por prop, o que
  evita copiar a string, e o Next não deixa `page.tsx` exportar constante. Aceito.
- **`SecaoAndamento.tsx`.**
  - É Server Component e só informa. O único elemento focável é o link do DEC.
  - A `dl` usa `grid-cols-2`, com "Pedido de Construção" e "Tarefas prontas" ocupando a linha toda.
  - A barra é um `<progress>` nativo com `aria-labelledby` apontando para o `dt`, `aria-valuetext` e o recurso como
    conteúdo. As classes da barra são as do plano, sem `style=` e sem animação.
  - Os alertas usam `Alerta tipo="atencao"` estático. A data vai em `<time dateTime>` e a nota em 13 px `tinta-media`.
- **M1 da 06-T11-tech-lead: tratado aqui, não segue para a 08.**
  - O código está em `src/components/dados-do-andamento.ts:45`:
    `const decId = typeof a.decId === 'string' ? a.decId : ''`. Um valor que não é texto vira `''`, falha em `RE_ID_DEC`
    e aparece como "Não informado", sem link e sem alerta de substituído.
  - O teste está em `dados-das-etapas-andamento.test.ts:117-145`: o objeto com `toString` no formato de DEC, número,
    nulo e indefinido, e o texto válido mantendo o link.
  - A entrega mostra esse teste falhando antes do código ("expected { …(2) } to be null").
- **Desvio 1, `conferido` com andamento ausente ou que não é objeto (`dados-do-andamento.ts:36`): aceito.**
  - Os 8 testes de `formularios-paginas-qa.test.ts` montam a vista sem a chave `andamento`, e `secaoDoAndamento`
    lançava `TypeError`.
  - Mudar a fixture seria mexer em teste fora da G5 (G3.2). Tratar `undefined` como "sem andamento" é a regra que a
    própria função já declara (linhas 4 e 5) e a da 03, 5.8.
  - Há teste novo (`dados-das-etapas-andamento.test.ts:138-140`), visto falhando. A mudança só afrouxa a entrada para
    o lado seguro: o resultado é `null`, sem seção e sem selo.
- **Teste antes do código.** A entrega mostra o Vitest falhando (4 de 80: linha 15, M1 e `dicaAprovada`) e o e2e
  falhando (5 de 6; o caso "sem andamento" já valia sem o código, por natureza). Cada comportamento novo tem teste que
  falharia sem o código:
  - CA-07.1 com vigente simples e com v2 sobre v1 substituído;
  - CA-07.2 com andamento em construção, cancelado, `null`, ausente, DEC substituído, DEC de outra demanda e sem
    vigente;
  - CA-07.3, a 15 só em Em construção, e a linha 2 vencendo a 15;
  - CA-09.1 a CA-09.5 e CA-06.5 no e2e.
- **e2e.** Conta "cto", só leitura, demandas do seed da T10, sem token e sem criar nada (G3.11). O teste mais lento
  levou 4,3 s, abaixo de 24 s. O e2e confere ordem no DOM, foco no `h2`, nome acessível e atributos da barra,
  `time[datetime$="Z"]`, nenhum `[style]` nem `role="alert"` na seção, o histórico com o ator `/construir (prefixo
  ficticio)` e o axe nas duas larguras.
- **CV-02 (`style=`).** `SecaoAndamento.tsx` não tem `style=`, só classes. Na execução, a CSP (`src/proxy.ts:16-23`,
  `default-src 'self'` sem `style-src`) recusa estilo em linha. A vigia CV-03 de `e2e/apoio.ts:21-51`, automática em
  todo spec, reprova o teste em qualquer `securitypolicyviolation`. Além disso, o e2e da T13 confere `[style]` com
  contagem 0 na seção. Não localizei o teste estático de `style=` que o plano cita (veja M3).
- **Segurança e dados.** Só aparecem dados fictícios: ids `DEM-20991231-…`, `DEC-DEM-20991231-0001-v1`, "Pessoa Ficticia
  CTO" e o prefixo `ficticio`. Não há token, segredo nem dado pessoal. A seção mostra só valores conferidos de novo
  (AN-12). O id só vira link e texto de alerta quando casa `RE_ID_DEC`.
- **Rodado nesta revisão:**
  - os 6 arquivos da tarefa e vizinhos: 316 de 316 testes (`dados-das-etapas-andamento`, `dados-do-andamento`,
    `dados-das-etapas`, `detalhe`, `formularios-paginas-qa` e `test/estatico/dados-das-etapas`, a guarda CV-09 das
    importações de `dados-das-etapas.ts`, que aceitou o `import type` novo);
  - `lint` e `typecheck`: limpos;
  - a suíte inteira do Vitest: 346 de 346 arquivos e 7.714 de 7.714 testes, em 307 s. Nenhuma falha, nem as
    instáveis sob carga.

## Decisões tomadas

- A tarefa passa sem devolução. Não há Critical nem Important, e os Minor abaixo não mudam comportamento visível nem
  segurança.
- O M1 da T11 está fechado nesta tarefa, com teste visto falhando. Não vai para a 08.
- Aceitei `dados-do-andamento.ts` fora da lista de arquivos da T13. As duas mudanças são de uma linha, cada uma com teste,
  e evitam mexer em teste fora da G5 (G3.2).
- Aceitei a classe do link por prop: o valor é o que o plano pede, e assim a string não fica duplicada.
- As falhas de `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204` não pesam contra a T13. O plano entrega
  a troca de seis para sete chaves à T14 (G1, G5 e T14), como já registrado na 06-T12-tech-lead.

## Pendências

**Pareceres Minor (não bloqueiam)**

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| M1 | `src/app/(painel)/demandas/[id]/SecaoAndamento.tsx:35-42` (o ramo `secao.dec.href ? … : <span>`) | O ramo `<span className="font-mono">` para `dec` com `href: null` nunca roda: `secaoDoAndamento` só devolve `dec` com `href` preenchido ou `dec: null` (`dados-do-andamento.ts:107`). | É código morto que sugere um terceiro estado (id sem link) que a 03, 5.2 não tem ("fora do formato, Não informado, sem link"). Hoje não há efeito na tela. O ideal é estreitar o tipo `SecaoDoAndamento.dec` para `{ id; href: string } \| null` e apagar o ramo, mas o tipo é da T11 e não vale devolver a tarefa por isso. Fica para a 08 decidir. |
| M2 | `src/components/dados-das-etapas-andamento.test.ts:117-145` | Os testes do M1 e do andamento ausente exercitam `secaoDoAndamento` (`dados-do-andamento.ts`), mas ficaram no arquivo de teste de `dados-das-etapas`. | Quem procurar a cobertura de `secaoDoAndamento` em `dados-do-andamento.test.ts` não vai achar esses casos. O lugar natural é ao lado dos outros testes da função. Sugestão ao `qa-automacao` na `06-T13-testes`: mover sem mudar asserção. |
| M3 | plano, T13, linhas 2651 e 2652 (`test/estatico/*` de `style=`) | A entrega não confirmou qual teste estático faz a varredura de `style=` (CV-02) nem se ele cobre `SecaoAndamento.tsx` sozinho. Esta revisão também não localizou o arquivo: a sessão não tem Grep nem Glob, e a regra de comando não permite `git grep` nem `ls`. | O risco está coberto na execução: a CSP recusa estilo em linha, a vigia CV-03 reprova qualquer violação em todo e2e, e o e2e da T13 confere `[style]` = 0 na seção. Falta só a confirmação estática que o plano pede. Para o `qa-automacao` na `06-T13-testes`: localizar o teste e, se a varredura for por lista, acrescentar o arquivo (só acréscimo). |

**Outras**

- **T14.** `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204` (seis chaves esperadas, sete recebidas)
  continuam falhando, e `pnpm test:e2e` inteiro só fica verde depois da T14.
- **G4 acumulado.** A regra de comando desta etapa não permite o `git diff 0ac099a -- <superfícies>` da G4. Conferi só o
  `--stat` deste commit, que não toca nenhuma superfície. A `08-revisao` deve rodar o comando inteiro da G4.
- **`07-qa-funcional`.** A partir de 1200 px, a seção na linha 2 da coluna lateral pode abrir um espaço na coluna
  principal entre Dados e a seção seguinte quando o Andamento é mais alto que Dados. É o arranjo da 03, 5.1 item 2;
  vale olhar na tela, como a entrega já sinalizou.
- **Instabilidade sob carga, que não é da T13:** `scripts/scripts.test.ts` T33, `test/desempenho/leitura.test.ts` (p95),
  `src/app/api/saude/route.test.ts`, `resumo-da-fila` e `minimizar`, já registrada na 06-T11-tech-lead para a 08 e a 09.
- **Leitura do `/tmp`.** A entrega da construção registra que leu os arquivos de saída do harness em
  `/tmp/claude-1000/...` pela Read. Nesta revisão, li o arquivo de saída da suíte inteira do mesmo jeito, só pela Read,
  como a regra do maestro permite.
- **Pedido.** O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair
  do repositório.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff aab5eb9b0a6aff50952fb6f0be70990a5b21cf90~1 aab5eb9b0a6aff50952fb6f0be70990a5b21cf90 --stat` — 10 arquivos, 622 inserções, 9 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show aab5eb9b0a6aff50952fb6f0be70990a5b21cf90` — diff do commit
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-andamento.test.ts src/components/dados-do-andamento.test.ts src/components/dados-das-etapas.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts" "src/app/(painel)/demandas/formularios-paginas-qa.test.ts" test/estatico/dados-das-etapas.test.ts --reporter=dot` — 6 arquivos, 316 de 316
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 346 de 346 arquivos, 7.714 de 7.714 testes, 306,98 s (movido pelo harness para segundo plano após 180 s; saída lida só pela ferramenta Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
  - [x] faz o que o plano pede, nem mais nem menos; fora da lista, só `dados-do-andamento.ts`, com M1 e andamento ausente aceitos acima
  - [x] há teste para cada comportamento novo, e ele falharia sem o código (Vitest e e2e vistos falhando na entrega)
  - [x] nenhum segredo, valor de `.env` ou dado pessoal real (ids, nomes e prefixo fictícios; o e2e não usa token)
  - [x] entrada externa validada com Zod; erro sem vazar detalhe (não se aplica: tela sobre `AndamentoVista` já lido por `lerAndamento` e conferido de novo; valor fora do esquema vira `null` ou "Não informado")
  - [x] banco (não se aplica: nenhuma migration nem consulta nova)
  - [x] nada duplica função existente (`secaoDoAndamento`, `CLASSE_ACAO_DA_VERSAO`, `CLASSE_DA_ETIQUETA`, `Alerta` e `Secao` reaproveitados)
  - [x] textos em pt-BR, os da 03 e do plano letra a letra; axe sem violação na T05 com a seção, em 1280 × 720 e 390 × 844
  - [x] Minor em Pendências; nenhum Critical nem Important
  - [x] item do PR (`/code-review`, `/security-review`): é da `08-revisao`, não desta etapa
