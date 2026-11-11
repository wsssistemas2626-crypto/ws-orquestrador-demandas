---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T07-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 7 e 12), tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G7, T07), 06-T07-engenheiro-dados-bd.md, commit 179946e, src/modules/demandas/resumo-da-fila.ts, src/modules/demandas/resumo-da-fila.test.ts, test/estatico/leituras-da-fila.test.ts, src/modules/demandas/consultas.ts, src/db/schema/demandas.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T07 (leituras novas da fila, só SELECT), código no commit 179946e. Os commits 21f5c60 e 8e6b04e só mexem
em `passagens.jsonl` e na entrega do engenheiro (`git diff --stat 179946e 8e6b04e`). **Aprovada, sem Critical nem
Important.** Os achados Minor estão em Pendências.

### Checklist da seção 12 do padrão técnico

- [x] **Faz o que o plano pede, nem mais nem menos.** Só os três arquivos da T07 foram criados, e nenhum arquivo que já
  existia mudou. `git diff 198e97d --stat -- src/modules` lista só `resumo-da-fila.ts` e o teste dele (CA-15.2). O diff
  do G4 (CV-01, com os nove `'use server'`) sai vazio. As assinaturas são as do G7. Há um desvio: `etapasDasDemandas`
  usa três `exists` correlacionados no lugar dos três `leftJoin` com `countDistinct`. Aceito. É a alternativa que o
  próprio plano previa (passo 3), continua uma consulta só, sem `sql` e com o mesmo retorno, e não multiplica as linhas
  (ESP × RSK × DEC por demanda). O gatilho que o plano escreveu (mais de 1 s) não aconteceu, mas a troca está
  registrada e justificada na entrega, e a interface não mudou.
- [x] **Há teste para cada comportamento novo, e ele falharia sem o código.** A falha antes do código está registrada
  (módulo inexistente). Os testes cobrem CA-05.1, CA-05.4, filtro por linha, tipo e linha juntos, CA-06.1 (com
  demanda sem nada, o que prova a correlação do `exists`), id inexistente fora do mapa, lista vazia sem consulta,
  injeção como parâmetro, as chaves exatas e a SENTINELA ausente (CV-06), e RNF-09 (4 consultas com 20 e com 100). O
  estático tem um caso plantado para cada regra. Reexecutei: os 2 arquivos passam com 27 de 27, e a suíte passa com
  221 arquivos e 4859 de 4859.
- [x] **Sem segredo, `.env` ou dado pessoal real.** Massa só fictícia ("Pessoa Ficticia", "(fictício)"), sem e-mail e
  sem log de dado.
- [x] **Entrada externa validada; erro sem vazar detalhe.** Não há rota nesta tarefa. O filtro é
  `Pick<FiltroDemandas, …>`, que vem do `filtroDemandasSchema` de quem chama, e os ids entram por `inArray`, como
  parâmetro. O teste confere que o texto do SQL não contém valor de entrada.
- [x] **Banco.** Nenhuma migration, nenhum esquema e nenhum índice novo. O teste roda pelo papel do app (`poolApp`). Não
  há `tenant_id`.
- [x] **Nada duplica função existente.** Há duas repetições pequenas: o tipo `TabelaDeVersoes` (igual ao
  `TabelaVersionada` de `consultas.ts`, que não é exportado) e o `and(tipo, linha)` de `paginaDeDemandas`. As duas são
  forçadas pelo G4, que proíbe alterar linha em arquivo de `src/modules/` que já existia, então não havia como
  exportar nem reaproveitar. Ficam como Minor.
- [x] **Textos em pt-BR; axe.** Não há tela nesta tarefa. Comentários e nomes estão em pt-BR.
- [x] **Minor vai para Pendências.** Feito. Nada que bloqueie.
- [x] **PR (`/code-review`, `/security-review`).** Não é desta etapa: fica com a `08-revisao` (G2 do plano).

`pnpm typecheck` e `pnpm lint` saem limpos.

### Pareceres (todos Minor)

1. `src/modules/demandas/resumo-da-fila.ts:28-31`. **Problema:** o comentário diz que, com `exists`, "cada demanda da
   página é uma busca no índice único" e que "o custo acompanha o tamanho da página, não o do banco". O EXPLAIN que
   reexecutei mostra outra coisa: com 100 ids, as três tabelas de versões são lidas inteiras uma vez (`hashed SubPlan`
   com Seq Scan), e com 20 ids o mesmo vale para RSK e DEC. **Razão:** o comentário é a documentação da decisão. Do
   jeito que está, ele promete um custo que o planejador não garante e engana quem for medir depois. A própria entrega
   descreve certo ("lida no máximo uma vez por consulta"). Ajustar o texto na próxima vez que alguém tocar no arquivo
   (ele é novo depois de 198e97d, então pode ser editado).
2. `src/modules/demandas/resumo-da-fila.test.ts:320-339 e 361-373`. **Problema:** o teste depende da escolha do
   planejador (sem Seq Scan fora de `hashed SubPlan`, `demanda_pkey`) e do relógio real (`performance.now()` com limite
   de 1 s). **Razão:** a seção 7 do padrão diz que teste não depende do relógio real. A folga é grande (7 ms contra
   1.000 ms) e `test/desempenho` já usa o mesmo recurso, por isso não bloqueia. Se ficar instável no runner do CI, a
   correção é afrouxar o tempo ou levar o bloco para `test/desempenho`, e não apagar a asserção.
3. `test/estatico/leituras-da-fila.test.ts:53-54`. **Problema:** o comentário diz que `import()` ou `require()` com
   caminho que não é literal "entra como importação de tudo". Mas a origem crua não casa com `apontaParaOModulo`, e
   esse importador passa sem ser contado. **Razão:** o comentário promete uma cobertura que o código não tem. O risco
   é baixo, porque não existe import dinâmico do módulo. Corrigir com uma de duas saídas: reprovar todo `import()` ou
   `require()` não literal em `src/`, ou ajustar o comentário.
4. `test/estatico/leituras-da-fila.test.ts:18, 24, 72, 87`. **Problema:** o arquivo de teste exporta funções e
   constantes. **Razão:** se a T09 importar este arquivo de outro `*.test.ts`, o Vitest registra os testes duas vezes.
   A T09 deve acrescentar a regra da cadeia **neste mesmo arquivo**, como a pendência do engenheiro já diz.
5. `src/modules/demandas/resumo-da-fila.ts:32` e `:17-21`. **Problema:** repetem `TabelaVersionada` e o filtro de tipo e
   linha de `consultas.ts`. **Razão:** a duplicação foi aceita porque o G4 congela `consultas.ts`. Vai para o registro
   de dívida: unificar quando `src/modules/` deixar de estar congelado.

## Decisões tomadas

- Aceito o `exists` no lugar do `leftJoin`. É a alternativa escrita no próprio plano, mantém uma consulta e o mesmo
  contrato, e evita multiplicar linhas. A justificativa de custo fica corrigida pelo parecer 1.
- Nenhum achado bloqueia. Todos são Minor (comentário, robustez de teste, dívida forçada pelo G4), e a seção 12 manda
  Minor para Pendências.
- `proximo: qa-automacao`, porque a etapa seguinte da tarefa é a `06-T07-testes`.
- Volta 2: o maestro liberou o `git grep` só de leitura que rodei na volta 1 para localizar as seções do plano, fora
  da lista Pode, e pediu que ele saísse de Comandos executados. O parecer não mudou.

## Pendências

- `engenheiro-dados-bd` (Minor, não bloqueia): corrigir o comentário de `resumo-da-fila.ts:28-31` (parecer 1) e o de
  `leituras-da-fila.test.ts:53` ou a regra do import não literal (parecer 3).
- `engenheiro-frontend` (T09): acrescentar a regra da cadeia até a página no mesmo
  `test/estatico/leituras-da-fila.test.ts`, sem importar este arquivo de outro teste (parecer 4).
- `devops-sre` (09): observar no CI se o bloco de EXPLAIN com limite de 1 s fica instável (parecer 2).
- Registro de dívida técnica: `TabelaVersionada` e o filtro tipo/linha repetidos entre `consultas.ts` e
  `resumo-da-fila.ts`. O impacto é baixo e o custo de unificar é menos de 1 h quando o G4 deixar de valer (parecer 5).
- `seguranca-aplicacao` (08): divergência já registrada pelo engenheiro entre o texto do CV-06 ("só `page.tsx`") e o
  D-08 do plano (`leituras-da-fila.ts`). O estático segue o D-08.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 179946e` — 3 arquivos de código novos, mais a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/proxy.ts src/proxy.test.ts next.config.ts src/app/api src/db drizzle src/modules/acesso src/worker src/jobs src/agents src/lib/auth.ts src/lib/auth-cliente.ts src/lib/qr.ts src/lib/log.ts src/lib/erros.ts src/instrumentation.ts pnpm-workspace.yaml "src/app/(painel)/configuracao/agentes/acoes.ts" "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/editar/acoes.ts" "src/app/(painel)/demandas/[id]/especificacoes/nova/acoes.ts" "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts" "src/app/(painel)/demandas/[id]/pareceres-risco/novo/acoes.ts" "src/app/(painel)/demandas/nova/acoes.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.ts" "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"` — vazio (CV-01)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 198e97d --stat -- src/modules` — só `resumo-da-fila.ts` e `resumo-da-fila.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo 8e6b04e
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 179946e 8e6b04e` — só a entrega do engenheiro e `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/resumo-da-fila.test.ts test/estatico/leituras-da-fila.test.ts` — 2 arquivos, 27 de 27
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 221 arquivos, 4859 de 4859

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
