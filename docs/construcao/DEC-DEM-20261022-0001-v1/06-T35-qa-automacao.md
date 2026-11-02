---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T35-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T35, linhas 3387 a 3413; de passagem, T27 a T29 e T33 a T34 nas linhas 3000 a 3150 e 3330 a 3386), 01-analista-requisitos.md (linhas 380 a 499, com a RNF-03 e a matriz), 06-T35-engenheiro-dados-bd.md, git show 9df6c99 (commit da construção), test/desempenho/leitura.test.ts, test/requisicao.ts, src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/app/api/demandas/[id]/route.ts, src/modules/pacotes-decisao/desatualizado.ts, saída do pnpm test gravada pela ferramenta nesta etapa (tool-results/bm9bcwd07.txt, só o fim)]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T35: desempenho de leitura com 5.000 demandas (RNF-03). O código da tarefa não mudou depois do commit da construção
(`git diff --stat 9df6c99 HEAD` mostra só documentos da pasta do pedido).

### Critério da tarefa → teste que o cobre

Todos ficam em `test/desempenho/leitura.test.ts`.

| Critério | Teste |
|---|---|
| RNF-03: p95 < 500 ms em `GET /demandas` com 5.000 demandas fictícias | `RNF-03: leitura com 5.000 demandas > p95 < 500 ms em GET /api/demandas e GET /api/demandas/:id, 100 chamadas de cada com cookie de pessoa` (engenheiro) |
| RNF-03: p95 < 500 ms em `GET /demandas/:id` com 5.000 demandas fictícias | o mesmo teste (engenheiro) |
| Plano, passo 1: EXPLAIN do filtro por status ordenado por `criada_em`, sem Seq Scan em `demanda` | `plano de execução ... (EXPLAIN) > EXPLAIN do filtro por status ordenado por criada_em usa o índice (status, criada_em), sem Seq Scan em demanda` (engenheiro) |
| A massa é a que o teste diz (5.000 demandas, com ESP, RSK, DEC, decisão e execução) | `RNF-03 ... > a massa tem 5.000 demandas, ...` (engenheiro) |
| As chamadas medidas devolvem a resposta certa sobre o volume (sem isso, o p95 mede pouco) | o bloco novo `as chamadas medidas na RNF-03 devolvem a resposta certa sobre o volume` (qa-automacao, abaixo) |

### Leitura crítica do teste do engenheiro

- **O p95 mede os handlers reais.** O caminho passa por `rota()`, pela sessão do Better Auth com 2FA, pelo Zod e pelo Drizzle,
  sobre o Postgres do Testcontainers. O percentil sai pelo posto mais próximo: `ceil(0,95 × 100) − 1 = 94`, o 95º valor. Conferi
  a conta.
- **O detalhe varia de verdade.** Os ids `50k + 6` dão ESP em todas as 100 chamadas, a v2 em metade, RSK e DEC em um terço e
  o DEC aprovado em um sexto. Conferi a aritmética.
- **O EXPLAIN pega a falta de índice.** A entrega do engenheiro tem a prova com os índices apagados de forma temporária: o
  teste falhou com Seq Scan. Os planos desta etapa são os mesmos da entrega.
- **Ponto fraco achado: a asserção do p95 só olhava o status 200.** Um handler que devolvesse 200 com o corpo errado ou
  vazio passaria com um p95 ótimo. Os testes novos fecham isso: cada um dos 10 filtros medidos e 4 detalhes têm a resposta
  conferida contra um oráculo da massa.
- **Achado Minor: um dos 10 filtros medidos não casa com nenhuma linha.** O filtro
  `?tipo=novo_projeto&linhaServicoProvavel=ia_controle_humano&status=pronta_para_decisao` pede n ≡ 2 (mod 30) e n ≡ 3 (mod 9).
  O sistema não tem solução, porque 3 divide 30 e 2 ≢ 3 (mod 3), e a página volta vazia. Isso não invalida a RNF-03: os
  outros 9 filtros têm linhas, e a consulta vazia também é uma leitura real. O teste novo trava esse total em 0, então quem
  mudar a massa vê o efeito. Vai para Pendências.

### Testes acrescentados (15, só acréscimo no mesmo arquivo)

O bloco novo vai no fim de `test/desempenho/leitura.test.ts` e usa a massa do `beforeAll` que já existe, sem carga nova. Ele
é `describe('as chamadas medidas na RNF-03 devolvem a resposta certa sobre o volume')`.

O oráculo `paginaEsperada()` refaz em TypeScript a regra da massa do SQL e calcula o total e os ids da página esperada.
Os arrays do SQL são 1-based, então a posição `1 + n % k` do SQL vira o índice `n % k` do TypeScript.

1. `fila %s: total e página iguais ao oráculo da massa`. São 10 casos, os mesmos 10 filtros de `FILTROS` que o p95 mede:
   - sem filtro;
   - cada filtro sozinho;
   - as combinações;
   - `limit=100`;
   - `offset=4800`;
   - `limit=50&offset=200`.
2. `página funda (limit=100, offset=4800): as 100 demandas mais antigas depois das 4.800 mais novas, com total 5.000`.
   Confere `total`, `limit`, `offset`, o tamanho da página e as pontas (n = 200 e n = 101).
3. `detalhe de demanda com ESP v1 e v2, RSK v1 e DEC v1 sem decisão: o DEC aparece desatualizado`. Usa n = 4212: ESP em
   ordem decrescente de versão, RSK por agente `risco`, DEC `pendente` com `desatualizado: true`, demanda como rascunho do
   orquestrador e nenhum agente em andamento.
4. `detalhe de demanda com ESP v1, RSK v1, DEC v1 aprovado e execução pendente: DEC atualizado e agente em andamento`. Usa
   n = 4230: DEC `aprovada` com `desatualizado: false` e `agentesEmAndamento` igual a `[{ agente: 'insumo_tecnico', status: 'pendente' }]`.
   O responsável pessoa vem com `nome: null`, porque a conta da massa não existe.
5. `detalhe de demanda sem nenhuma versão (n ímpar) devolve as listas vazias`. Usa n = 4321.
6. `id no formato certo e fora da massa → 404 sobre o volume`.

Os testes novos não usam relógio: os ids saem de `Date.UTC` fixo e da regra da massa. Também não dependem de ordem: só
leem, e nenhum teste do arquivo grava depois do `beforeAll`. Para conferir, rodei o arquivo com `--sequence.shuffle`:
24 de 24.

### Resultado

- `pnpm test test/desempenho/leitura.test.ts`: 24 de 24, sendo 9 do engenheiro e 15 novos. Fila p50 7,4 ms e p95 10,0 ms;
  detalhe p50 11,5 ms e p95 18,7 ms.
- O mesmo arquivo com `--sequence.shuffle` (semente 1793400236877): 24 de 24. Fila p95 11,2 ms; detalhe p95 20,1 ms.
- `pnpm test` (suíte inteira): 141 arquivos e **2780 de 2780**. São os 2765 que já existiam mais os 15 novos. O aviso do
  undici "Using `patch`" segue igual.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `git diff --stat`: só `test/desempenho/leitura.test.ts`, com 104 linhas acrescentadas e nenhuma removida. Nenhum teste
  existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada.

### Classificação de falhas

Nenhuma falha nesta etapa.

## Decisões tomadas

- **Os testes novos ficam no mesmo arquivo, em outro `describe`.** Razão: reaproveitam a massa de 5.000 linhas do `beforeAll`.
  Um arquivo próprio pagaria de novo o banco e a carga, e o tempo da suíte é um padrão do agente.
- **Um oráculo em TypeScript, e não números escritos à mão.** Razão: os 10 filtros saem da mesma regra da massa. Se a massa
  mudar sem o oráculo mudar junto, o teste quebra e mostra a divergência, em vez de passar com o número velho.
- **Nenhuma mudança no teste do engenheiro, nem aquecimento antes da medição.** Razão: um aquecimento faria o p95 medir só
  o regime quente. Isso afrouxa a RNF-03, e o contrato veda afrouxar asserção existente.
- **O total 0 do filtro combinado fica travado no oráculo, sem trocar o filtro.** Razão: trocar o filtro mexe na medição do
  engenheiro. O achado vai como Minor, para o dono da tarefa decidir.

## Pendências

- **Para o `devops-sre` e o `tech-lead` (risco de teste instável, Minor).** O teste do p95 mede tempo real por natureza
  (RNF-03). Nesta etapa ficou entre 10 e 20 ms nas duas corridas do arquivo e passou na suíte inteira em paralelo. A entrega
  do engenheiro registra uma 1ª corrida a frio com p95 de 261,8 ms no detalhe e máximo de 646 ms. A folga para 500 ms é de
  cerca de 2 vezes no pior caso visto. Se falhar no CI, olhe as linhas `T35 lista` e `T35 detalhe` da saída e investigue o
  runner antes de mexer no limite. Subir o limite exige decisão, porque o número vem do requisito.
- **Minor, para o `engenheiro-dados-bd` e o `tech-lead`.** O filtro 8 de `FILTROS`
  (`?tipo=novo_projeto&linhaServicoProvavel=ia_controle_humano&status=pronta_para_decisao`) não casa com nenhuma linha da
  massa e mede uma página vazia. Se quiserem que os 10 filtros meçam páginas com dados, basta trocar `pronta_para_decisao`
  por um status com n ≡ 2 (mod 3), por exemplo `aguardando_informacao` (n % 9 = 2). O oráculo acompanha a troca sem ajuste.
- **Leitura do arquivo de saída da ferramenta.** Li o fim de `tool-results/bm9bcwd07.txt`, a saída do `pnpm test` que a
  ferramenta gravou nesta etapa, para ver o total. O arquivo não fica em `/tmp`. Foi o mesmo procedimento da entrega do
  engenheiro.
- **Ferramentas Grep e Glob indisponíveis nesta sessão.** Achei a T35 no plano e a RNF-03 nos requisitos só com o Read, por
  trechos. Por isso o `leu` cita trechos de outras tarefas lidos de passagem.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 9df6c99e6c17f501703fac216bd5f307d0ae0387` — 3 arquivos, o único de código é `test/desempenho/leitura.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — topo 007707b (06-T35-revisao tech-lead)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 9df6c99 HEAD` — só `06-T35-tech-lead.md` e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/demandas/schemas.ts` — `limit` padrão 20 e máximo 100
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/desempenho/leitura.test.ts` — 24 de 24
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/desempenho/leitura.test.ts --sequence.shuffle --silent=true` — 24 de 24, em ordem embaralhada
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --silent=true --reporter=dot` — 141 arquivos, **2780 de 2780**
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — `test/desempenho/leitura.test.ts`, 104 linhas acrescentadas e 0 removidas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — só `M test/desempenho/leitura.test.ts`

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste. A RNF-03 (lista e detalhe) e o EXPLAIN do plano estão cobertos, e a resposta das chamadas medidas também
- [x] a suíte inteira passa (2780 de 2780)
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real. Só leem, com ids de `Date.UTC` fixo, e passaram com `--sequence.shuffle`. O `performance.now()` do p95 é do teste do engenheiro, por natureza da RNF-03
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`: 104 linhas acrescentadas e 0 removidas)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real. Só os dados fictícios da massa ("Pessoa Ficticia", "Demanda ficticia", `u-ficticio-desempenho`) e o id `DEM-20260101-9999`
