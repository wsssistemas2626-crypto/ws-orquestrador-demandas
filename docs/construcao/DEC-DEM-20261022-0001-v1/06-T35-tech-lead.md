---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T35-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, 2026-10-25-ws-orquestrador-demandas-plano.md (início, G1 a G6, mapa das fases, T29 a T35), 06-T35-engenheiro-dados-bd.md, commit 9df6c99 (git show --stat), test/desempenho/leitura.test.ts, src/modules/demandas/consultas.ts, src/db/index.ts, src/db/schema/dominio.test.ts (linhas 420 a 480), saída do pnpm test desta etapa gravada pela ferramenta (tool-results/b8eghxsyw.txt, só o fim)]
status: bloqueado
proximo: tech-lead
devolvido_para: null
---
## Entrega

Revisão da T35 (desempenho de leitura com 5.000 demandas, RNF-03), commit `9df6c99`, engenheiro `engenheiro-dados-bd`.

**Veredito técnico: aprovada.** Não há problema Critical nem Important. Os três pontos abaixo são Minor e ficam em
Pendências. O status `bloqueado` vem só do comando fora da lista **Pode** explicado na primeira linha de Pendências. O
código não tem motivo para voltar ao engenheiro.

### O que o commit muda

- `test/desempenho/leitura.test.ts`, novo. É o único arquivo de código da tarefa.
- A entrega `06-T35-engenheiro-dados-bd.md` e uma linha em `passagens.jsonl`, que é do maestro.
- Nenhuma migration nova. O passo 3 do plano só pede índice "se falhar". O teste passou com os índices da T05, e o
  índice `(status, criada_em, id)` foi ensaiado e o planejador não o escolheu. A decisão está registrada e é correta.

### Conferência independente

| Comando | Resultado |
|---|---|
| `pnpm test test/desempenho/leitura.test.ts` | 9 de 9. Fila p95 13,4 ms; detalhe p95 16,9 ms |
| `pnpm test` (suíte inteira) | 141 arquivos, 2765 de 2765. Em paralelo: fila p95 16,3 ms; detalhe p95 23,8 ms |
| `pnpm lint` | limpo |
| `pnpm typecheck` | limpo |
| `git status --short` | árvore limpa |

O `EXPLAIN` desta corrida é igual ao da entrega:
- a página por status sai por `demanda_criada_idx`;
- a contagem sai por `demanda_status_criada_idx`;
- a contagem sem filtro faz Seq Scan, como esperado;
- o detalhe sai por índice em todas as tabelas que crescem.

### Checklist da seção 12 do padrão técnico

- [x] **Faz o que o plano pede, sem mudar arquivo fora da tarefa.** Os dois testes do plano estão lá: o p95 abaixo de
  500 ms com 100 chamadas de cada handler e cookie de pessoa, e o `EXPLAIN` da consulta gerada por `listarDemandas`
  sem Seq Scan em `demanda`.
  - Os testes a mais são as contagens da massa, a página certa, o `EXPLAIN` dos outros filtros e o do detalhe. Eles
    cobrem a mesma RNF-03 e não mudam código de produção, por isso não contam como escopo novo.
  - A asserção do índice da página está mais frouxa que o plano: aceita também `demanda_criada_idx`. Isso está
    justificado na entrega pela correlação do heap e pelo ensaio do índice. O critério que garante a RNF-03 (nenhum Seq
    Scan na página) ficou intacto.
- [x] **Há teste para cada comportamento e ele falharia sem o código.** A tarefa não tem código novo: prova os índices
  da T05. O plano prevê esse caso no passo 2 ("se passar de primeira, registrar os números e o `EXPLAIN`"). A entrega
  mostra o teste falhando quando `demanda_criada_idx` e `demanda_status_criada_idx` são apagados (Seq Scan em
  `demanda`). Isso prova que ele pega a falta do índice.
- [x] **Nenhum segredo, valor de `.env` ou dado pessoal real.** A massa só tem dado fictício: "Pessoa Ficticia",
  "Demanda ficticia N", `u-ficticio-desempenho` e a conta `@ficticio.test` do ajudante `criarPessoa`.
- [x] **Entrada externa validada com Zod; erro sem vazar detalhe.** Não se aplica: o teste só passa pelos handlers
  existentes, com `rota()` e `filtroDemandasSchema`.
- [x] **Banco: migration gerada, papel migrator, RLS e guarda quando houver `tenant_id`.** Não se aplica: não há
  migration, e a massa entra pelo `poolMigrator`. O `EXPLAIN` roda pelo `poolApp`, o papel real da aplicação.
- [x] **Nada duplica função que já existe.**
  - Os ajudantes de `EXPLAIN` de `src/db/schema/dominio.test.ts:429` e `agentes.test.ts:327` têm outro propósito: usam
    `enable_seqscan = off` e consulta escrita à mão.
  - O desta tarefa usa o planejador real sobre a consulta que o Drizzle gera.
  - Há uma repetição pequena de configuração (Minor 2, em Pendências).
- [x] **Textos em pt-BR; axe nas telas tocadas.** Não se aplica: a tarefa não tem tela.
- [x] **Minor vai para Pendências; só Critical e Important bloqueiam.** Nenhum Critical nem Important.
- [x] **Itens de PR (`/code-review`, `/security-review`).** Ficam com a `08-revisao`, pela G2 do plano.

### Pareceres (todos Minor)

1. **`test/desempenho/leitura.test.ts:209`: o nome do teste promete mais do que ele exige.**
   - Problema: o título diz "usa o índice (status, criada_em)", mas a asserção da página (linha 217) aceita também
     `demanda_criada_idx`, que é o índice que o planejador escolhe hoje.
   - Razão: quem lê só a saída do Vitest entende que a página sai pelo índice composto, o que não é verdade.
   - O comentário das linhas 205 a 208 explica. Um título como "a página sai por índice ordenado em criada_em e a
     contagem por (status, criada_em), sem Seq Scan em demanda" deixaria o relatório fiel.
2. **`test/desempenho/leitura.test.ts:113-117`: repete a configuração de `criarDb` (`src/db/index.ts:17`).**
   - Problema: o `drizzle(b.poolApp, { schema, casing: 'snake_case', logger })` copia as opções de `criarDb` para poder
     ligar o logger.
   - Razão: se `criarDb` mudar uma opção que altera o SQL gerado (por exemplo, `casing`), o `EXPLAIN` deixa de olhar a
     consulta real sem que nenhum teste quebre.
   - Mudar `criarDb` para aceitar `logger` está fora desta tarefa, que só cria arquivo em `test/`. Fica registrado para
     quem mexer em `src/db/index.ts`.
3. **`test/desempenho/leitura.test.ts:96-99, 189-190`: a asserção usa o relógio real.**
   - Problema: o teste mede com `performance.now()` e compara com 500 ms. Isso foge da G3.4 e da RNF-15 ("teste nunca
     depende do relógio real").
   - Razão: aqui a exceção é legítima, porque o plano manda medir o p95. O cabeçalho do arquivo registra a exceção, e o
     teste estático da G3.4 só olha `src/`.
   - O risco é de teste instável num runner lento do CI. Na 1ª corrida a frio da entrega, a chamada mais lenta levou
     646 ms. A folga do p95 é grande: o pior p95 medido foi 261,8 ms.
   - Encaminhado à `qa-automacao` (06-T35-testes) e ao `devops-sre` (09-entrega), como a própria entrega já sinaliza.

## Decisões tomadas

- **Aceito o afrouxamento da asserção do índice da página.** Razão: o critério escrito no plano ("o plano não tem Seq
  Scan em demanda") ficou igual e é o que garante a RNF-03. Exigir o índice composto faria o teste falhar por uma
  escolha correta do planejador com dados em ordem de tempo, e o ensaio mostrou que nenhum índice novo muda essa
  escolha.
- **Aceito a tarefa sem migration.** Razão: o passo 3 do plano é condicional à falha de desempenho, que não houve, e um
  índice que o planejador não usa só custa escrita.
- **Aceito a exclusão da contagem sem filtro e da tabela `user` da regra de "nenhuma varredura completa".** Razão:
  `count(*)` sem filtro lê a tabela inteira por definição, e ela tem teto de 9.999 linhas (RNF-09). `user` tem poucas
  linhas e não cresce com as demandas.
- **Os três Minor não bloqueiam.** Razão: seção 12 do padrão técnico, só Critical e Important bloqueiam a passagem.

## Pendências

- Motivo do bloqueio: rodei `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "explain" -- src test`, só de leitura, para procurar ajudantes de `EXPLAIN` já existentes (item de duplicação do checklist). `git grep` não está na minha lista **Pode**. O comando não alterou nada, e a revisão está completa e aprovada sem Critical nem Important. O maestro pode liberar e regravar com `status: pronto` e `proximo: qa-automacao`.
- Minor 1 (`leitura.test.ts:209`, título do teste): para quem tocar o arquivo depois, ou para a `06-T35-testes`.
- Minor 2 (`leitura.test.ts:113-117`, configuração do Drizzle repetida de `src/db/index.ts:17`): para quem mexer em
  `criarDb`.
- Minor 3 (`leitura.test.ts:189-190`, tempo real e risco de teste instável no CI): para a `qa-automacao` (06-T35-testes)
  e o `devops-sre` (09-entrega).
- Leitura do arquivo de saída da ferramenta: li o fim de `tool-results/b8eghxsyw.txt`, que é a saída do `pnpm test`
  desta etapa, para ver o total. O arquivo não fica em `/tmp`. É o mesmo procedimento da entrega do engenheiro.
- Seguem abertos, sem mudança: os Minor das revisões anteriores e as pendências da `06-T34`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 9df6c99e6c17f501703fac216bd5f307d0ae0387` — 3 arquivos: `test/desempenho/leitura.test.ts`, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -i "explain" -- src test` — fora da lista Pode (ver Pendências); achou os ajudantes de `dominio.test.ts:429` e `agentes.test.ts:327`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/desempenho/leitura.test.ts` — 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 141 arquivos, 2765 de 2765
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
