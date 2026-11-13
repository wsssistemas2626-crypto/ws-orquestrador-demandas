---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T01-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 5 a 12), 05-tech-lead.md, 06-T01-engenheiro-dados-bd.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 1 a 260, G1 a G7, e 333 a 604, T01), commit 608429556de6c416e2b6c7f7095596beb2f2baff (git show, sem os snapshots), src/db/schema/demandas.ts (em 0ac099a), diferença entre drizzle/meta/0008_snapshot.json e 0009_snapshot.json]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T01 (tabela `andamento_construcao`, migrations `0008` e `0009`, privilégio só de inclusão, AN-10), commit
`608429556de6c416e2b6c7f7095596beb2f2baff`. **Aprovada, sem Critical nem Important.** Dois pareceres Minor, abaixo, que
não bloqueiam a passagem.

### Checklist da seção 12 do padrão técnico

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos; nada fora da tarefa mudou | Sim. Os 13 arquivos de código do commit são os da lista "Arquivos" da T01. `git diff 0ac099a 6084295 --stat` só traz, além deles, os documentos do pedido. Depois do commit, só o `passagens.jsonl` mudou. |
| Teste para cada comportamento novo, que falharia sem o código | Sim. A entrega mostra a falha antes do código (módulo `./andamento` inexistente, 42P01 em vez de 42501, diário só até 7). Os CHECKs, as FKs sem cascata, os índices, a fonte única dos CHECKs, a recusa de UPDATE/DELETE/TRUNCATE e do `nextval` e a ausência de coluna nova em `demanda` (19) e `evento` (11) têm teste. |
| Sem segredo, `.env` ou dado pessoal real | Sim. Só "Demanda ficticia", "Pessoa Ficticia", `u-ficticio` e o prefixo `ficticio`. |
| Entrada externa validada com Zod; erro sem vazar detalhe | Não se aplica: a tarefa não tem rota nem entrada externa (o Zod do corpo é da T04). |
| Banco: migration gerada, papel migrator, RLS e guarda com `tenant_id` | Sim. A `0008` é a saída do `db:generate`, sem edição (só `CREATE TABLE`, duas FKs `no action`, três índices). A `0009` foi criada vazia pelo `--custom --name rls_andamento_construcao` (D-02) e só tem o `GRANT SELECT, INSERT`. Os testes aplicam as migrations pelo migrator (Testcontainers). Sem `tenant_id` no sistema, sem RLS a exigir. A volta das duas migrations está nas Decisões da entrega. |
| Nada duplica função existente | Sim. O esquema usa `momento()` de `comum.ts`, e as listas `FASES_ANDAMENTO` e `STATUS_CONSTRUCAO` são novas (G7). A repetição dos valores no CHECK é a do plano (G3.6), presa por teste. |
| Textos em pt-BR; axe nas telas | Não se aplica: sem tela. |
| Minor em Pendências; só Critical e Important bloqueiam | Sim: os dois pareceres abaixo são Minor. |

### Conferências do plano (G4, G5, piso)

- **G4:** `git diff 0ac099a 6084295` das superfícies congeladas, com `drizzle/000[0-7]_*.sql` e os snapshots 0000 a 0007,
  saiu **vazio**. O diff parcial de `src/db/privilegios.ts` tem só a linha nova e o comentário, sem `colunasUpdate`.
- **G5:** `src/db/imutabilidade.test.ts` ganhou os três casos do plano, sem perder asserção. Em
  `test/estatico/migration-0007.test.ts`, "a 0007 é a última" passou a "a 0007 está no índice 7", e o `at(-1)` virou a
  busca por `idx === 7`. As listas de proibidos e de esperados não mudaram, e a contagem de `expect(` do arquivo é a mesma
  (uma por teste). Não há outra mudança em teste existente.
- **Piso:** `src/db/schema/andamento.test.ts: 17` entrou no `PISO`. Contei as linhas com `expect(` no arquivo e deu 17.
- **Contagem da `demanda`:** confere com o esquema em `0ac099a`, que tem 19 colunas. O `expect.any(Number)` saiu, como o
  plano pedia.
- **Desvio declarado:** o comentário de `src/db/schema/andamento.ts:4` diz "(sem SQL cru, C-17)", e não "(sem sql.raw)",
  para não disparar a varredura C-17 de `varreduras-qa.test.ts`. É só texto de comentário, e a varredura continua
  intacta. Aceito.
- **Testes que rodei:** os nove arquivos tocados ou vizinhos passaram, com 160 de 160 testes: `andamento`,
  `migration-0008`, `migration-0007`, `imutabilidade`, `privilegios`, `piso-de-assercoes`, `varreduras-qa`, `sql-raw` e
  `migration-0007-dados`. `typecheck` e `lint` saíram limpos. O `pnpm test` completo (6526 de 6526) é o da entrega do
  engenheiro.

### Pareceres

1. **Minor**, `src/db/schema/andamento.test.ts:66-69`.
   - **Problema:** o teste do `andamento_construcao_dec_id_check` só confere o texto da definição
     (`pg_get_constraintdef`). Nenhum `INSERT` com `dec_id` fora do formato é recusado com 23514 e esse nome de
     constraint.
   - **Razão:** a forma é a do plano, e o texto da regex fica preso. Mesmo assim, o comportamento (recusa) não é exercido.
     No Postgres, o CHECK é avaliado antes da FK, então um `inserir({ dec: 'DEC-x' })` com `viola('andamento_construcao_dec_id_check')`
     provaria a recusa sem depender da FK.
   - **Encaminhamento:** fica como sugestão para a `06-T01-testes` (`qa-automacao`), se quiser acrescentar. Não bloqueia,
     porque o formato do DEC também é validado no corpo (T04) e no serviço (T07).
2. **Minor**, `drizzle/meta/0009_snapshot.json`.
   - **Problema:** comparado com o `0008_snapshot.json`, ele traz 127 linhas mudadas. Tirando `id` e `prevId`, todas são
     só ordem de chaves (`with`/`concurrently`, `tableTo`, `onDelete`/`onUpdate`, `nullsNotDistinct`, `views`). Não muda
     tabela, coluna, restrição nem índice.
   - **Razão:** é saída do `drizzle-kit generate --custom`, sem edição à mão. O padrão (seção 5) proíbe editar o arquivo
     gerado, não aceitar o que a ferramenta grava. Fica só o registro, para ninguém ler a diferença como mudança de
     esquema na `08-revisao` nem no ensaio de rollback.
   - **Encaminhamento:** nenhuma ação.

## Decisões tomadas

- **Aprovar a T01 sem devolver.** O checklist da seção 12 está cumprido, a G4 saiu vazia e a G5 foi seguida à risca. Os
  dois achados são Minor.
- **Aceitar o desvio do comentário de `andamento.ts`.** Ele preserva a varredura C-17 em vez de afrouxá-la, e não mexe em
  teste nem em comportamento.
- **Aceitar `migration-0008.test.ts` fora do `PISO`.** A lista "Modificar" da T01 só pede `andamento.test.ts` no piso, e
  o teste estático é guarda de forma da migration, não teste de segurança de acesso.
- **Rodar só os testes tocados, não o `pnpm test` completo.** A entrega traz a suíte completa verde. Depois do commit da
  T01, nada no código mudou (só o `passagens.jsonl`). Os nove arquivos que rodei cobrem tudo o que a tarefa tocou e as
  varreduras que ela afetou.

## Pendências

- Nenhuma bloqueia a passagem.
- Para o maestro:
  - Rodei um `grep -n` (sem `-r`, com alternativa no padrão) no `padrao-tecnico.md` da estruturaAutonoma, para achar as
    seções. Ficou fora da forma exata da lista Pode. Só leu e não alterou nada. Peço a liberação por leitura.
  - A entrega do engenheiro também declara três comandos de leitura fora da forma exata: dois `grep` sem `-r` e um
    `grep` em `/tmp`. Ele já pediu a liberação.
- Para a `06-T01-testes`: o parecer Minor 1, caso de recusa do `dec_id` fora do formato, é opcional.
- Para a `08-revisao` e o ensaio de rollback da `09-entrega`: o parecer Minor 2. A diferença entre os snapshots 0008 e
  0009 é só a ordem das chaves.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 608429556de6c416e2b6c7f7095596beb2f2baff` — 15 arquivos, 13 de código
- `grep -n "^## \|^### " /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/padrao-tecnico.md` — seções do padrão (fora da forma exata; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "^## " -e "^### " -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 608429556de6c416e2b6c7f7095596beb2f2baff -- drizzle/0008_slippery_whirlwind.sql drizzle/0009_rls_andamento_construcao.sql drizzle/meta/_journal.json src test` — diff do código da T01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a 608429556de6c416e2b6c7f7095596beb2f2baff -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0ac099a 608429556de6c416e2b6c7f7095596beb2f2baff` — só os documentos do pedido e os 13 arquivos da T01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --no-index --stat drizzle/meta/0008_snapshot.json drizzle/meta/0009_snapshot.json` — 127 linhas de cada lado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --no-index --word-diff=plain --stat=200 -U0 drizzle/meta/0008_snapshot.json drizzle/meta/0009_snapshot.json` — só `id`, `prevId` e ordem de chaves
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 0ac099a:src/db/schema/demandas.ts` — 19 colunas em `demanda`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 608429556de6c416e2b6c7f7095596beb2f2baff HEAD` — só `passagens.jsonl`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/db/schema/andamento.test.ts test/estatico/migration-0008.test.ts test/estatico/migration-0007.test.ts src/db/imutabilidade.test.ts src/db/privilegios.test.ts test/estatico/piso-de-assercoes.test.ts test/estatico/varreduras-qa.test.ts test/estatico/sql-raw.test.ts test/migracao/migration-0007-dados.test.ts --reporter=dot` — 9 arquivos, 160 de 160
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `grep -rn "dec_id_check" /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/db/schema/andamento.test.ts` — linha 67

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
