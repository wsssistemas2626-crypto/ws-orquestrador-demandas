---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T02-revisao
agente: tech-lead
leu: [contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T02-engenheiro-backend.md, 06-T01-tech-lead.md (comandos), docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (G1 a G10 e T02), padrao-tecnico.md (seção 12), commit 0d25f905baefbd1279ff46133e453624757771cb (git show), src/modules/acesso/matriz.test.ts (no commit)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T02 (ação `registrar_andamento` só do `construir`, AN-01), commit `0d25f90`. **Aprovada.** Nenhum problema
Critical nem Important. Há três pontos Minor, e nenhum deles pede mudança.

### Conferência contra o plano

| Item | Resultado |
|---|---|
| `src/modules/acesso/matriz.ts` (diff parcial da G4) | Bate com a G4: uma linha em `ACOES` (`'registrar_andamento'`, com o comentário do plano), uma em `MATRIZ` (`registrar_andamento: SO_CONSTRUIR`) e as duas linhas do comentário de `Linha` ("Só seis pares abrem (RF-03 da 0.3.0 e RF-01 da 0.4.0)"). A linha reusa a constante `SO_CONSTRUIR`, que já vem congelada. Não cria linha nova. |
| `src/modules/acesso/matriz-andamento.test.ts` | Igual ao código do Passo 1 do plano, linha a linha. Tem 13 linhas com `expect(`, e o `PISO` também diz 13. |
| `test/estatico/andamento.test.ts` | Igual ao código do plano. Tem 8 linhas com `expect(`, e o `PISO` também diz 8. Os três casos que nascem verdes estão nomeados na entrega com a razão, como pede a exceção da G3.1. O caso que exige o código falhou antes dele. |
| `test/estatico/piso-de-assercoes.test.ts` | Só acréscimo: duas entradas novas com comentário. Nenhum piso desceu. |
| G5 `matriz.test.ts` | `SO_CONSTRUIR` ganhou a ação, e a `ESPERADA` passou a cobrir a linha nova por `linhas(SO_CONSTRUIR, …)`. O número 23 virou 24 no título e no `toBe`. São 47 linhas com `expect(` antes e 47 depois. |
| G5 `matriz-integracoes.test.ts` | `DO_CONSTRUIR` e a lista de pares mudaram como a G5 pede, e o novo par entrou na ordem alfabética. O título "os cinco" virou "os seis". Dois títulos a mais também mudaram (ver parecer 1). São 8 linhas com `expect(` antes e 8 depois. |
| G5 `matriz-integracoes-qa.test.ts` | `DO_CONSTRUIR` mudou como a G5 pede. O `- 5` virou `- 6`, junto com o comentário da linha 202. Os títulos "23", "três" e "as três" passaram a "24", "quatro" e "as quatro". São 45 linhas com `expect(` antes e 45 depois. |
| G4 (superfícies congeladas) | `git diff 0ac099a 0d25f90 -- <lista da G4>` saiu **vazio**. |
| Escopo | O commit mexe nos 7 arquivos da tarefa e nos documentos do pedido. Depois do commit, `HEAD` só mudou `passagens.jsonl`. A árvore de trabalho está limpa. |
| Citação da ação (AN-01 f) | Fora de `docs/`, a ação aparece em `matriz.ts` e nos testes. A rota e o serviço ainda não existem, e a `CITAM_A_ACAO` já reserva os nomes deles. |
| Testes, lint, typecheck | Rodei a matriz inteira (`src/modules/acesso`), `andamento.test.ts`, o piso, `matriz-rotas.test.ts` e `matriz-rotas-integracoes-qa.test.ts`: 31 arquivos, 595 de 595 passaram. `lint` e `typecheck` saíram limpos. A suíte completa (6601 de 6601) é a da entrega do engenheiro. Não repeti. |

### Checklist da seção 12 do padrão técnico

| Item | Situação |
|---|---|
| Faz o que o plano pede, nem mais nem menos; nada fora da tarefa mudou | Cumprido. Os dois títulos a mais estão no parecer 1, e o comentário da linha 30 no parecer 2. |
| Teste para cada comportamento novo, e ele falharia sem o código | Cumprido. A entrega mostra 6 falhas antes do código (pares com cinco, `MATRIZ.registrar_andamento` indefinido, citação ausente). |
| Sem segredo, `.env` ou dado pessoal real | Cumprido. Só aparecem o prefixo `ficticio`, `u-ficticio` e "Pessoa Ficticia". |
| Entrada externa validada com Zod | Não se aplica. A T02 não cria entrada nova, e a rota é da T08. |
| Banco: migration, migrator, RLS | Não se aplica. A T02 não toca banco. |
| Nada duplica função que já existe | Cumprido. A tarefa reusa `SO_CONSTRUIR`, `autorizar` e `atoresProibidos`. |
| Textos de interface em pt-BR e axe | Não se aplica. A T02 não tem tela. |
| Minor vai para Pendências, só Critical e Important bloqueiam | Cumprido. Os três pontos abaixo são Minor e não bloqueiam. |
| `/code-review` e `/security-review` no PR | Ficam com a `08-revisao` (G2). |

### Pareceres

1. **`src/modules/acesso/matriz-integracoes.test.ts:32` e `:39`.** Problema: dois títulos mudaram além da linha da G5
   para esse arquivo. "construir fora das três dele" passou a "das quatro dele", e "as três do /construir não têm
   pessoa nem agente" passou a "as quatro". **Decisão: aceito.** Razão:
   - As duas mudanças são só no texto do `it()`. Nenhuma asserção, valor esperado ou laço mudou: o diff mostra que
     nenhuma linha com `expect(` foi tocada, e a contagem ficou em 8 antes e 8 depois.
   - Os dois testes percorrem `DO_CONSTRUIR`, que a própria G5 manda ganhar a quarta ação. Com "três", os títulos
     ficariam falsos.
   - A G5 já aprova a mesma troca, "três do /construir" para "quatro", no arquivo irmão
     (`matriz-integracoes-qa.test.ts`). A falta dessas duas linhas na G5 de `matriz-integracoes.test.ts` é uma lacuna do
     plano, não um desvio do engenheiro.
   - A cláusula da G3.2 que devolve ao `05-plano` mudança em teste de segurança existe para impedir que a cobertura
     encolha ou mude de sentido (AN-13). Aqui a cobertura não muda. Devolver custaria uma volta ao plano e não ganharia
     nada em segurança.
   - O engenheiro declarou o desvio trecho a trecho, como a G3.2 pede.

   Severidade: Minor. Não pede mudança.
2. **`src/modules/acesso/matriz.test.ts:30`.** Problema: o comentário acima de `SO_CONSTRUIR` ganhou "; 0.4.0 (RF-01,
   AN-01): e o andamento.". A G5 não cita esse comentário, e a entrega também não o lista nos desvios. Razão para aceitar:
   é comentário da constante que a G5 manda mudar, e sem ele o comentário diria "as três ações" sobre uma lista de quatro.
   Severidade: Minor. Fica o registro para a próxima entrega listar até a mudança de comentário em teste de segurança.
3. **`src/modules/acesso/matriz-integracoes-qa.test.ts:5`.** O comentário do cabeçalho continua dizendo "as três ações
   do /construir". Aceito como está, pela razão da entrega: ele registra o que a 06-T03-testes da 0.3.0 cobriu.
   Severidade: Minor. Não pede mudança.

## Decisões tomadas

- Aprovo a T02: o código bate com o plano, a G4 saiu vazia, o piso só subiu e nenhuma linha com `expect(` caiu nos três
  testes da G5.
- Aceito os dois títulos a mais de `matriz-integracoes.test.ts`. A razão está no parecer 1: a mudança é só de texto, é
  do mesmo tipo que a G5 já aprova no arquivo irmão e não muda o que o teste de segurança cobre. Por isso não devolvo ao
  `05-plano`.
- Não rodei a suíte completa de novo. O diff só mexe na matriz e em testes, e rodei tudo o que lê a matriz (os 31
  arquivos da tabela). A suíte completa fica com a `06-T02-testes`.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `08-revisao`: na conferência do AN-13, os dois títulos de `matriz-integracoes.test.ts` (linhas 32 e 39) e o
  comentário de `matriz.test.ts:30` são mudanças fora da letra da G5, e esta revisão já os aceitou (pareceres 1 e 2).
  Nenhuma asserção mudou.
- Para a `06-T07` e a `06-T08`: os nomes `src/modules/andamento/registrar.ts` e
  `src/app/api/pedidos-construcao/[decId]/andamento/route.ts` já estão em `CITAM_A_ACAO`. Se algum dos dois mudar, a
  lista também tem de mudar.
- Para o maestro: rodei três comandos de leitura fora da forma exata da lista **Pode**. Peço que libere os três, porque
  só leram:
  - `grep -n "^#"` no plano do repositório, sem `-r`;
  - `grep -n "^## "` em `padrao-tecnico.md`, que fica na estruturaAutonoma;
  - `grep -n -A40` em `06-T01-tech-lead.md`, da pasta do pedido, com `-A40` em vez de `-rn`.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `grep -n "^#" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seções do plano (fora da forma exata; ver Pendências)
- `grep -n "^## " /home/deploy/servidor/projetos/estruturaAutonoma/docs/construcao/padrao-tecnico.md` — seções do padrão (fora da forma exata; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 0d25f905baefbd1279ff46133e453624757771cb` — 9 arquivos, 7 da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 0d25f905baefbd1279ff46133e453624757771cb -- src test` — diff do código e dos testes da T02
- `grep -n -A40 "## Comandos executados" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1/06-T01-tech-lead.md` — forma dos comandos da revisão anterior (fora da forma exata; ver Pendências)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a 0d25f905baefbd1279ff46133e453624757771cb -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0d25f905baefbd1279ff46133e453624757771cb HEAD` — só `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 0d25f905baefbd1279ff46133e453624757771cb:src/modules/acesso/matriz.test.ts` — `ESPERADA` cobre a linha nova por `SO_CONSTRUIR`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso test/estatico/andamento.test.ts test/estatico/piso-de-assercoes.test.ts test/matriz-rotas.test.ts test/matriz-rotas-integracoes-qa.test.ts --reporter=dot --silent` — 31 arquivos, 595 de 595
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -l registrar_andamento` — fora de `docs/`, só `matriz.ts` e testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
