---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T06-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 5 a 12), 05-tech-lead.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G3 itens 9 a 12, G4, T06), 06-T06-engenheiro-dados-bd.md, commit f3f964477a5958c12ffb9268ab072247e5311ce4 (src/modules/andamento/consultas.ts, src/modules/andamento/consultas.test.ts, test/estatico/andamento.test.ts), src/db/index.ts, test/estatico/importacoes.ts, test/desempenho/leitura.test.ts (linhas 110 a 116)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T06 (leituras do andamento com plano de execução e guarda estática "consultas só lê"), sobre o commit
`f3f9644`. Nenhum problema Critical ou Important. A tarefa passa para os testes.

### Parecer por item do checklist (padrão técnico, seção 12)

- **Faz o que o plano pede, nem mais nem menos.** O commit mexe só nos três arquivos da T06 (dois criados, um
  modificado), mais a entrega e o `passagens.jsonl` do maestro. `consultas.ts` é o código do passo 3 do plano, linha a
  linha, com os nomes e assinaturas da G7. O `test/estatico/andamento.test.ts` só ganhou linhas (80 `+`, nenhuma `-`),
  e o piso dele segue em 8, como a G4 manda (a T06 não está entre as tarefas que sobem o piso). O G4 saiu vazio.
- **Teste para cada comportamento, e ele falharia sem o código.** A entrega mostra a falha antes do código (módulo
  ausente e o `toContain` do teste estático). Cada função tem teste de resultado e de "uma consulta só"; a lista de
  permissão de colunas é presa pelo `toEqual` dos sete campos; as duas regras estáticas têm casos plantados que
  reprovam (cada escrita, `sql` por nome e por apelido, namespace, e as quatro formas de importação, sem contar
  `import type` nem nome parecido).
- **Sem segredo nem dado pessoal real.** Só ids `DEM-20261112-*`, "Pessoa Ficticia", `u-ficticio` e prefixo
  `ficticio`. O plano impresso na saída do teste só tem esses ids.
- **Entrada externa com Zod.** Não se aplica: a T06 não tem rota nem entrada de fora. Os ids vão sempre como parâmetro,
  e o teste confere que não entram no texto do SQL.
- **Banco.** Sem migration nesta tarefa; os índices são os da T01. As linhas de teste entram pelo migrator, no
  Testcontainers.
- **Nada duplicado.** Ver o parecer 1 (Minor).
- **Textos e axe.** Não se aplica: sem tela.

### Pareceres

1. `src/modules/andamento/consultas.test.ts:51` — **Minor.** O `drizzle(b.poolApp, { schema, casing: 'snake_case',
   logger })` repete a configuração de `criarDb` (`src/db/index.ts`), porque `criarDb` não aceita `logger`. É o mesmo
   molde que já existe em `test/desempenho/leitura.test.ts:110-116`, e agora são duas cópias. Razão: se `criarDb`
   ganhar outra opção (outro `casing`, por exemplo), os dois testes passam a conferir o plano de uma consulta que a
   aplicação não manda. Não bloqueia; fica em Pendências.

### Desvio do volume no teste de plano: aceito

O plano previa 200 demandas com 2 andamentos cada (403 linhas). A construção subiu para 2.000 demandas com ESP, RSK e
DEC, e 200 DEC com 30 andamentos cada (6.000 linhas), gravados em lote com `generate_series`.

Aceito, pelas razões abaixo:

- **O volume do plano não testava o que o RNF-01 pede.** Com 403 linhas a tabela cabe em 5 páginas, e o planejador
  escolhe `Seq Scan` porque é mesmo mais barato. O `toContain` do índice falharia por causa do tamanho da tabela, e não
  por causa da consulta. O erro foi do plano, não do código.
- **O volume novo é realista.** São os 200 DEC do RNF-01, com 30 andamentos cada, metade do limite de 60 por DEC por
  hora (T03). A demanda tem 2.000 linhas, o que faz o `demanda_pkey` aparecer no plano da subconsulta.
- **A asserção ficou mais forte, não mais fraca.** O `toContain` do nome do índice continua, e o teste ainda confere,
  no `explain (format json)`, que nenhum nó lê as tabelas por `Seq Scan`. O `EXPLAIN` roda sobre o SQL que a função
  manda de fato (pelo logger), e não sobre uma cópia que pode ficar velha.
- **Não ficou lento.** Rodei os dois arquivos da tarefa: 18 testes, **11,76 s no total**, já contando a subida do
  Postgres do Testcontainers, a importação e a transformação (os testes em si são 54% disso). O teste mais lento leva
  39 ms, e os três de plano levam de 7 a 8 ms cada. Fica abaixo de 24 s com folga. O `120_000` do `beforeAll` é só um
  teto; o lote leva poucas consultas (cinco `insert ... select` e dois `analyze`), e a entrega registra que ficou mais
  rápido do que o laço de 1.200 `insert` do plano. A suíte completa passou inteira: 324 arquivos, 7252 testes,
  265 s. Os cerca de 12 s deste arquivo, que rodam em paralelo com os outros, não fazem diferença grande nesse total.
- A expectativa da demanda 0003 passou de `2/2` para `30/30`, de acordo com o novo volume. Isso não muda o
  comportamento conferido.

Os outros desvios também foram aceitos: asserções a mais (sem `Seq Scan`, `demanda_pkey`, uma consulta só,
parâmetro fora do SQL); o SQL capturado pelo logger no lugar do `.toSQL()` copiado; e a retirada de `desc` e
`criarDb` do teste, que não eram usados e seriam recusados pelo lint.

## Decisões tomadas

- Aceito o desvio do volume, pelas razões acima.
- O `Incremental Sort` da página fica como está. A ordenação acontece dentro de cada `demanda_id`, já na ordem do
  índice, e são poucas dezenas de linhas por demanda. Um índice `(demanda_id, id desc)` só se justifica se a medição
  do RNF-01 na `09-entrega` apontar a página.
- A cópia da configuração do Drizzle no teste fica como Minor: segue um molde que já existe e não muda o que a
  aplicação faz.

## Pendências

- Nenhuma bloqueia a passagem.
- Minor, para uma tarefa futura de manutenção (fora deste pedido): fazer `criarDb` aceitar um `logger` opcional, ou
  criar um ajudante em `test/`, e usar nos dois testes que capturam o SQL (`src/modules/andamento/consultas.test.ts:51`
  e `test/desempenho/leitura.test.ts:110-116`). Assim não ficam duas cópias da configuração.
- Para a `09-entrega` (RNF-01): conferir o `Incremental Sort` da página na medição. Se ela for o gargalo, o caminho é o
  índice `(demanda_id, id desc)`, numa migration nova.
- Para a `06-T07`, a `06-T09` e a `06-T12`: o `IMPORTAM_CONSULTAS` já lista os três importadores. A T09 deve usar
  `subconsultaDoUltimoAndamento` com `leftJoin` na mesma consulta da autoria, na forma de `lerComSubconsulta` do teste.
- Comando fora da lista Pode, rodado por engano e só de leitura: o `grep -n -A3 "Test Files"` no arquivo de saída da
  suíte em `/tmp`, para ler o resumo. A regra manda ler essa saída pela ferramenta Read, e foi o que fiz em seguida, com
  o mesmo resultado. Não altera nada. Está declarado em Comandos para o maestro liberar como leitura, como manda a regra
  de 25/10.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — entregas da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f3f964477a5958c12ffb9268ab072247e5311ce4` — 3 arquivos da tarefa, mais a entrega e o `passagens.jsonl`
- `grep -n "^## " /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/padrao-tecnico.md` — onde fica a seção 12
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f3f964477a5958c12ffb9268ab072247e5311ce4 -- src/modules/andamento/consultas.ts src/modules/andamento/consultas.test.ts test/estatico/andamento.test.ts` — o diff do código; o estático só tem linhas `+`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/andamento/consultas.test.ts test/estatico/andamento.test.ts --reporter=verbose` — 2 arquivos, 18 de 18, 11,76 s no total; o teste mais lento leva 39 ms; os três planos usam o índice
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/db/index.ts` — `criarDb` sem `logger`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:test/estatico/importacoes.ts` — campos `namespace`, `nomes` e `soTipo` usados pela guarda
- `grep -n "git diff 0ac099a" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — onde fica o comando da G4
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "logger" -- test/desempenho/leitura.test.ts` — o molde que já existe, linhas 110 a 116
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts 'drizzle/000[0-7]_*.sql' 'drizzle/meta/000[0-7]_snapshot.json'` — vazio (G4)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `grep -n "drizzle(b.poolApp" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/andamento/consultas.test.ts` — linha 51
- `grep -n "^export function" /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico/andamento.test.ts` — funções exportadas, no mesmo padrão do `quemCita` da T02
- `grep -n "120_000" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/andamento/consultas.test.ts` — teto do `beforeAll`, linha 108
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 324 arquivos, 7252 de 7252, 265,31 s (passou do limite de 180 s do Bash e terminou em segundo plano)
- `grep -n -A3 "Test Files" /tmp/claude-1000/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/tasks/b70ltoovk.output` — resumo da suíte. Esse comando está fora da lista Pode (ver Pendências). Depois li as mesmas linhas com a ferramenta Read

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
