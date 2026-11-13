---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T13-construcao
agente: engenheiro-frontend
leu: [pedido.json, tarefas.json, contrato-passagem.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G10, T12, T13 e T14), 03-ux-ui-design.md (seções 0 a 9), 04-seguranca-aplicacao.md (cabeçalho), 06-T10-engenheiro-backend.md (tabela do seed), 06-T11-tech-lead.md (M1), 06-T12-engenheiro-frontend.md, 06-T12-tech-lead.md, src/components/dados-do-andamento.ts, src/components/dados-das-etapas.ts, src/components/dados-das-etapas.test.ts, src/components/rotulos.ts (rótulos do andamento, rotuloAtor, textoDoEvento), src/components/Cartao.tsx, src/components/Alerta.tsx, src/modules/andamento/schemas.ts, src/app/(painel)/demandas/[id]/page.tsx, src/app/(painel)/demandas/[id]/detalhe.ts, src/app/(painel)/demandas/[id]/detalhe.test.ts, src/app/(painel)/demandas/[id]/demanda-da-pagina.ts, src/app/(painel)/demandas/[id]/CartaoProximaAcao.tsx, src/app/(painel)/demandas/[id]/LinkNestaPagina.tsx, test/estatico/dados-das-etapas.test.ts, test/estatico/importacoes.ts, e2e/andamento-fila.spec.ts, e2e/apoio.ts, playwright.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T13 do plano: no detalhe da demanda (T05), a seção "Andamento da construção", o primeiro item de "Nesta página", a linha
15 da Próxima ação e o texto novo de `dicaAprovada`. Cobre RF-07, RF-09, CA-07.1 a CA-07.3, CA-09.1 a CA-09.5, CA-06.5
(tela), AN-12 (seção, CV-02, link) e a 03, seções 5.1 a 5.9. Trata também o **M1 da 06-T11-tech-lead**, que a revisão da
T11 sugeriu para a T13 (quem desenha o `dec.id` na tela).

**Arquivos alterados**

| Arquivo | O que mudou |
|---|---|
| `src/components/dados-das-etapas.ts` | `DadosDasEtapas.andamento?: Pick<AndamentoVista, 'decId' \| 'statusConstrucao'> \| null` (só `import type`, CV-09); `linhaDoStatus(status, vigente, andamento)` e, no caso `em_construcao`, antes da 11, a linha 15 com o código do plano, letra a letra |
| `src/app/(painel)/demandas/[id]/detalhe.ts` | `ID_SECAO.andamento = 'andamento-da-construcao'`, `TEXTOS_DETALHE.secoes.andamento = 'Andamento da construção'`, `dicaAprovada` com o texto da 03, 5.1 item 6 |
| `src/app/(painel)/demandas/[id]/page.tsx` | `andamento: d.andamento` em `dadosDasEtapas`; `secaoDoAndamento(d.andamento, d.pacotesDecisao, formatarDataHora)`; o item em "Nesta página" **primeiro** quando a seção existe; a `Secao` logo depois do `CartaoProximaAcao` no DOM, com `xl:col-start-3 xl:row-start-2`; o Histórico com `xl:row-[3/-1]` com a seção e `xl:row-[2/-1]` sem ela (o `GRADE` não mudou) |
| `src/components/dados-do-andamento.ts` | M1: `decId` só como texto (`typeof … === 'string'`, senão `''`, que cai em "Não informado"); e `conferido` devolve `null` com andamento `undefined` ou que não é objeto (ver desvios) |
| `src/app/(painel)/demandas/[id]/detalhe.test.ts` | G5: a asserção de `dicaAprovada` (linha 571) com o texto novo; a regra testada não mudou |

**Arquivos criados**

- `src/app/(painel)/demandas/[id]/SecaoAndamento.tsx` (Server Component): recebe o `SecaoDoAndamento` da T11 e monta,
  dentro da `Secao` da página, a `dl` em duas colunas (`dt` com `CLASSE_DA_ETIQUETA`; "Pedido de Construção" e "Tarefas
  prontas" na linha toda; o id do DEC em `font-mono [overflow-wrap:anywhere]`, link com a classe `CLASSE_ACAO_DA_VERSAO`
  da página, passada por prop: 44 px abaixo de 768 px e 24 px a partir dele; ou "Não informado"); a barra
  `<progress value max aria-labelledby={ID_TAREFAS_PRONTAS} aria-valuetext>` com as classes da 03, 5.3 e o recurso
  como conteúdo, sem `style=` e sem animação; os alertas `Alerta tipo="atencao"` estáticos; a linha "Última mudança
  informada pelo /construir em `<time dateTime>`." (`text-sm text-tinta`) e a nota (`text-[0.8125rem] text-tinta-media`).
- `src/components/dados-das-etapas-andamento.test.ts` (15 testes): CA-07.1 (linha 15 por inteiro, com o vigente simples
  e com o vigente v2 sobre um v1 substituído); CA-07.2 (`em_construcao`, `cancelado`, `null`, chave ausente, DEC não
  vigente, DEC de outra demanda e sem vigente → linha 11); CA-07.3 (Entregue → linha 1); a 15 só em Em construção (12
  em Devolvida, 10 em Aprovada, 1 em Encerrada); a linha 2 continua vencendo a 15; M1 (objeto com `toString` no formato
  de DEC não vira link nem alerta; número, nulo e indefinido no `decId` → "Não informado"; texto no formato mantém o
  link); andamento ausente ou que não é objeto → sem seção, sem lançar.
- `e2e/andamento-detalhe.spec.ts` (6 testes, conta "cto", só leitura, seed da T10, sem token):
  1. `andamentoConstruindo` em 1280 × 720: "Nesta página" com "Andamento da construção" em primeiro e o foco indo ao
     `h2#andamento-da-construcao` (`tabindex="-1"`); depois da Próxima ação e antes de Dados no DOM; link do DEC desta
     demanda para `/pacotes-decisao/<id>`, em Mono, nome acessível = o id; "Construindo", "Em andamento", "9 de 17
     tarefas"; `progressbar` "Tarefas prontas" que é `PROGRESS`, `value="9"`, `max="17"`, `aria-valuetext="9 de 17
     tarefas"`; "Última mudança informada pelo /construir em …" com `time[datetime$="Z"]`; a nota; nenhum `[style]` nem
     `role="alert"` na seção; no histórico, "Registrou o andamento de <DEC>: Construindo, 9 de 17 tarefas" e o
     `status_alterado` "Antes: Aprovada. Depois: Em construção.", os dois com "/construir (prefixo ficticio)"
     (CA-09.1, CA-06.5);
  2. `andamentoSemPlano`: o texto de total 0 e nenhum `progress` (CA-09.2);
  3. `andamentoCancelado`: Situação "Cancelada", o alerta estático, status "Devolvida pela construção", linha 12 (CA-09.3);
  4. `emConstrucaoSemAndamento`: sem seção nem item em "Nesta página" (o primeiro é "Dados"); linha 11 (CA-09.4, CA-07.2);
  5. `andamentoConcluido`: linha 15 (o que falta, detalhe e quem age), Situação "Concluída" e "Mudar o status" levando o
     foco ao `h2` "Mudar status" (CA-07.1);
  6. axe sem violação com a seção em 1280 × 720 e 390 × 844 (`semViolacoesNasDuasLarguras`) e, em 1280 px, Próxima
     ação, Andamento e Histórico na mesma coluna, um embaixo do outro, sem se cruzar (CA-09.5).
  Tempo (e2e inteiro): o mais lento 4,2 s (axe); sozinhos, o mais lento 4,3 s. Nenhum acima de 24 s.

**Teste antes do código (visto falhando)**

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-andamento.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts" --reporter=dot`
antes do código:

```
 FAIL  src/components/dados-das-etapas-andamento.test.ts > Próxima ação, linha 15 (RF-07; 03, 5.6) > CA-07.1: em Em construção, com o andamento do DEC vigente em construido → ...
AssertionError: expected { linha: 11, …(4) } to deeply equal { linha: 15, …(4) }
 FAIL  ... > M1 da 06-T11-tech-lead: ... > um objeto cujo texto casa o formato de DEC não vira link nem entra no alerta de substituído
AssertionError: expected { …(2) } to be null
 FAIL  src/app/(painel)/demandas/[id]/detalhe.test.ts > MudarStatus.tsx > aprovada: a dica fixa da 03
AssertionError: expected '<div class="flex flex-col gap-4"><div…' to contain 'Quando o /construir começar o Pedido …'
 Test Files  2 failed (2)
      Tests  4 failed | 76 passed (80)
```

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/andamento-detalhe.spec.ts` antes do código:
5 falharam, 1 passou (o 4, "sem andamento", que já vale sem o código):

```
  ✘  1 ... CA-09.1 e CA-06.5: andamentoConstruindo ...   Error: element(s) not found  getByRole('region', { name: 'Andamento da construção' })
  ✘  5 ... CA-07.1: andamentoConcluido ...  Expected substring: "Construção concluída: confira e marque como Entregue."
  5 failed ... 1 passed (2.0m)
```

E o caso novo do andamento ausente (ver desvios), antes da correção em `conferido`: `TypeError: Cannot read properties
of undefined (reading 'fase')`, 1 de 15 falhando.

**Depois do código**

- Os arquivos da tarefa e os vizinhos (`dados-das-etapas-andamento`, `dados-do-andamento`, `detalhe`,
  `formularios-paginas-qa`): 4 arquivos, 146 de 146.
- `pnpm typecheck` e `pnpm lint`: limpos, depois da última mudança.
- `pnpm test` (suíte inteira), primeira volta: 345 de 346 arquivos; 8 falhas, todas em
  `src/app/(painel)/demandas/formularios-paginas-qa.test.ts` (fixture de demanda montada sem a chave `andamento`,
  `undefined`, e `conferido` só tratava `null`). Corrigido no código, sem tocar no teste (ver desvios).
- `pnpm test` (suíte inteira), segunda volta: **346 de 346 arquivos, 7.712 de 7.712 testes**, saída 0, 294,9 s.
- `pnpm test:e2e e2e/andamento-detalhe.spec.ts`: 6 de 6.
- `pnpm test:e2e` (suíte inteira, 295 testes): 284 passaram, 9 pulados (`capturas.spec.ts`, como sempre), 2 falharam:
  `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204`, as seis chaves do Awave contra as sete da T09. A
  troca é da **T14** pela G5 (G1, G5 e T14; mesma pendência da 06-T12, aceita na 06-T12-tech-lead). Nenhum e2e lia o
  texto de `dicaAprovada` nem quebrou com a seção nova.

**Desvios do plano**

1. **`conferido` (dados-do-andamento.ts) passou a tratar andamento ausente.** Fixtures de antes da 0.4.0, montadas sem a
   chave `andamento` (8 testes de `formularios-paginas-qa.test.ts`), chegam à página com `d.andamento === undefined`, e
   `secaoDoAndamento` lançava. Em vez de mudar o teste (fora da G5), a função aceita `undefined` ou valor que não é objeto
   como "sem andamento", o que já é a regra declarada dela ("qualquer valor fora disso vale como sem andamento") e a da
   03, 5.8. Com teste novo que falhou antes. Na `proximaAcao` o mesmo caso já valia (`x.andamento ?? null`).
2. **M1 da 06-T11-tech-lead** em `dados-do-andamento.ts`, arquivo da T11 e fora da lista de arquivos da T13: a revisão
   da T11 o deixou como sugestão para a T13, e o maestro mandou tratar aqui. Uma linha, com teste.
3. **A classe do link do DEC chega por prop** (`classeDoLink={CLASSE_ACAO_DA_VERSAO}`): `page.tsx` não pode exportar
   constante (o Next só aceita as exportações de página), e copiar a string em `SecaoAndamento.tsx` duplicaria o padrão.
4. **CV-02 (`style=`) pela varredura estática:** não achei qual `test/estatico/*` faz a varredura de `style=`. A sessão
   não tem as ferramentas Grep e Glob, e a regra de comando desta etapa proíbe `git grep`, `ls` e `grep` pelo Bash; tentei
   abrir pela Read os nomes prováveis, sem sucesso. No lugar, o e2e confere `[style]` com contagem 0 na seção renderizada,
   e o arquivo não tem `style=` (só classes). Fica para a revisão conferir se a varredura de hoje cobre
   `src/app/**/*.tsx` sozinha (ver Pendências).

## Decisões tomadas

- Linha 15 só com `vigente !== null` e `andamento.decId === vigente.id`: andamento de DEC substituído, de outra demanda ou
  sem vigente cai na 11 (03, 5.6; CA-07.2), e a 15 continua depois da linha 2 e das linhas do DEC pendente.
- `decId` que não é texto vira `''` e mostra "Não informado", como a sugestão do M1; o resto do andamento continua válido
  e a seção aparece (03, 5.2: "fora do formato, Não informado, sem link").
- `ID_TAREFAS_PRONTAS = 'andamento-tarefas-prontas'` fixo: a seção existe no máximo uma vez por página.
- `dl` em `grid-cols-2` em todas as larguras, como a 03, 5.2 pede ("não precisa de uma coluna só no celular"); os valores
  quebram linha.
- No e2e, o link "Nesta página" e o "Mudar o status" são clicados de novo até o foco chegar (o mesmo padrão de
  `abrirGaveta`): antes da hidratação, o clique é só âncora.

## Pendências

- Para a **T14**: `e2e/integracoes.spec.ts:59` e `e2e/integracoes-qa.spec.ts:204` falham desde a T09 (seis chaves
  esperadas, sete recebidas); a troca é da T14 pela G5. Até lá, `pnpm test:e2e` inteiro não fica verde.
- Para a revisão (tech-lead): conferir qual teste de `test/estatico/` faz a varredura de `style=` (CV-02) e se ela pega
  `src/app/(painel)/demandas/[id]/SecaoAndamento.tsx` sozinha; se for por lista, o arquivo entra nela (acréscimo). Não
  consegui localizar o arquivo dentro da regra de comando desta etapa (desvio 4).
- Para a revisão: os dois arquivos fora da lista da T13 (`dados-do-andamento.ts`, desvios 1 e 2) e a G5 em
  `detalhe.test.ts:571`.
- Para a `07-qa-funcional`: com a seção na linha 2 da coluna lateral, a linha 2 da grade cresce até a altura dela a
  partir de 1200 px; a coluna principal pode ganhar um espaço entre Dados e a seção seguinte quando o Andamento é mais
  alto que ela. É o arranjo da 03, 5.1 item 2; vale olhar na tela.
- Li os arquivos de saída das rodadas que o harness mandou para segundo plano (Vitest e e2e inteiros) em
  `/tmp/claude-1000/...` só pela ferramenta Read, no caminho que o harness informou, como a regra desta etapa permite.
  Nenhum comando foi pedido em segundo plano.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-andamento.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts" --reporter=dot` — antes do código: 4 falharam, 76 passaram (esperado)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/andamento-detalhe.spec.ts` — antes do código: 5 falharam, 1 passou (esperado)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-andamento.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts" --reporter=dot` — depois do código: 80 de 80
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/andamento-detalhe.spec.ts` — 6 de 6
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 7.703 passaram, 8 falharam (todas em `formularios-paginas-qa.test.ts`, andamento ausente; corrigido no código)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-andamento.test.ts "src/app/(painel)/demandas/formularios-paginas-qa.test.ts" --reporter=dot` — 8 falharam, 48 passaram (antes da correção)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-andamento.test.ts --reporter=dot` — 1 de 15 falhando (o caso novo, antes da correção)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-andamento.test.ts "src/app/(painel)/demandas/formularios-paginas-qa.test.ts" src/components/dados-do-andamento.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts" --reporter=dot` — 9 falharam (a correção ainda não tinha sido gravada)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-das-etapas-andamento.test.ts "src/app/(painel)/demandas/formularios-paginas-qa.test.ts" src/components/dados-do-andamento.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts" --reporter=dot` — 146 de 146
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 346 de 346 arquivos, 7.712 de 7.712 testes, 294,9 s
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 284 passaram, 9 pulados, 2 falharam (os dois da T14 pela G5)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (Vitest e e2e; comandos e trechos acima)
- [x] `pnpm test` passa (346 de 346 arquivos, 7.712 de 7.712)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real (ids `DEM-20991231-…`, `DEC-DEM-20991231-0001-v1`, prefixo `ficticio` do seed; o e2e não usa token)
- [x] só mudaram os arquivos da tarefa (os do plano, mais `dados-do-andamento.ts` pelo M1 e pelo andamento ausente, explicados nos desvios)
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas (T05 com a seção, em 1280 × 720 e 390 × 844; `axe-todas` T05 verde)
