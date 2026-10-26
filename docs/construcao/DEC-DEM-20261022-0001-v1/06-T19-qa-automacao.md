---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T19-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G5 e T18 a T20), 01-analista-requisitos.md (RF-01 a RF-12), 06-T19-engenheiro-backend.md, 06-T19-tech-lead.md, 06-T18-qa-automacao.md, git show 930d924, src/modules/pareceres-risco/schemas.ts, src/modules/pareceres-risco/servico.ts, src/modules/pareceres-risco/consultas.ts, src/modules/pareceres-risco/schemas.test.ts, src/app/api/pareceres-risco/pareceres.test.ts, src/app/api/demandas/[id]/pareceres-risco/route.ts, src/app/api/pareceres-risco/[rskId]/route.ts, src/modules/limites.ts, src/modules/demandas/schemas.ts, src/modules/especificacoes/servico.test.ts, src/db/schema/versoes.ts, src/db/schema/decisao.ts, src/db/imutabilidade.test.ts, test/deps.ts, test/sessao.ts, test/requisicao.ts, test/matriz-rotas.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Verificação da T19, parecer de risco (RSK) versionado, sobre o commit `930d924`. O código cumpre todos os critérios da
tarefa. Nenhum teste falhou contra o código, nenhum teste do engenheiro é instável ou errado e nada volta para a
construção. Acrescentei 20 testes: concorrência com cinco criações, fronteira e janela do limite com ESP, RSK e DEC
somados, limite do agente pelo nome, ordem numérica com dez versões ou mais, isolamento da ESP mais nova por demanda,
recusas pela rota nos campos que faltavam, autoria no sentido contrário, a v1 lida pela rota e os limites exatos do
schema.

### Critérios da tarefa e os testes que os cobrem

| Critério | Arquivo | Teste |
|---|---|---|
| CA-09.1 (primeiro RSK é `RSK-<dem>-v1`) | `src/app/api/pareceres-risco/pareceres.test.ts` | `CA-09.1: primeiro RSK é RSK-<dem>-v1; o seguinte, -v2`, `o RSK não exige ESP: demanda sem especificação aceita o parecer`; **novo:** `a versão do RSK é por demanda e não segue a da ESP: com ESP v1 e v2, o primeiro RSK é v1; em outra demanda, também v1` |
| CA-09.2 (nível `critico` → 400) | `src/modules/pareceres-risco/schemas.test.ts` | `CA-09.2: riscoTecnicoNivel "critico" → 400`, `CA-09.2: nível fora da lista recusado nos três riscos, inclusive com maiúscula ou acento`, `os três níveis são obrigatórios` |
| | `pareceres.test.ts` | `CA-09.2: riscoTecnicoNivel "critico" → 400 com o campo, e nada gravado`, `sem os três níveis → 400 com os três campos, e nada gravado`; **novo:** `CA-09.2 e CA-09.3 pela rota nos campos que faltavam: cada recusa traz só o seu campo, e nenhuma consome versão nem grava evento` (operacional e jurídico, maiúscula, acento, número) |
| CA-09.3 (`preCondicoes` como texto corrido → 400) | `schemas.test.ts` | `CA-09.3: preCondicoes como texto corrido → 400`, `recomendacoesMitigacao como texto corrido → recusado`; **novo:** `%s: item que não é texto (número, nulo, objeto, lista) → recusado` (as duas listas) |
| | `pareceres.test.ts` | `CA-09.3: preCondicoes como texto corrido → 400 com o campo, sem o valor recebido`; **novo:** o mesmo teste de CA-09.2 pela rota, com `recomendacoesMitigacao` em texto e `preCondicoes` como objeto |
| CA-11.1 (só `GET` na versão; conteúdo igual) | `pareceres.test.ts` | `CA-11.1: /api/pareceres-risco/:rskId só exporta GET`, `RF-11: a versão anterior continua igual depois de uma nova versão`; **novo:** `CA-11.1 pela rota: a v1 lida é a mesma antes e depois da v2, com a data do relógio injetado` |
| CA-11.2 para o RSK (o banco recusa `UPDATE`/`DELETE` do app) | `src/db/imutabilidade.test.ts` (T05) | `update parecer_risco set resumo = $1 é recusado com o papel do app`, `parecer_risco: "update parecer_risco set risco_juridico_nivel = 'baixo' where id = $1" é recusado (42501) e a linha fica igual`, e o mesmo com `delete` |
| CA-04.3 (criações simultâneas sem número repetido) | `pareceres.test.ts` | `CA-04.3: duas criações simultâneas pela rota → v1 e v2, as duas 201`; **novo:** `CA-04.3: cinco criações simultâneas, de duas pessoas e do agente risco → v1 a v5, sem erro e sem número repetido` |
| C-11 (autoria só do ator) | `schemas.test.ts` | `C-11: autoria, id e versão do body descartados`; **novo:** `C-11 (G3.9): nenhum campo de autoria, de aprovação ou de decisão chega à saída` |
| | `pareceres.test.ts` | `C-11: token do agente risco com rascunhoAgente:false → rascunho_agente true`, `C-11: id e versão vindos do corpo são descartados`; **novo:** `C-11 pela rota, no sentido contrário: pessoa que manda rascunhoAgente:true e autoria de agente → grava a pessoa, sem rascunho` |
| C-10 (matriz) | `pareceres.test.ts` | `C-10: token do agente consolidacao em POST de RSK → 403 (matriz)`, `C-10: ator sistema e agentes fora da matriz → sem_permissao, e nada gravado` |
| | `test/matriz-rotas.test.ts` | `POST`/`GET src/app/api/demandas/[id]/pareceres-risco/route.ts` e `GET src/app/api/pareceres-risco/[rskId]/route.ts: tem ação na matriz e nega cada ator proibido com 403` (inclui pessoa sem 2FA, CA-01.2) |
| C-36 (limite de artefatos → 429) | `pareceres.test.ts` | `C-36: com 60 artefatos do ator na hora (ESP e RSK somados), o RSK seguinte → 429, e nada gravado`; **novos:** `C-36 na fronteira, com ESP, RSK e DEC somados: com 59 do ator na hora, o 60º é gravado e o 61º → limite_excedido, sem versão nem evento`, `C-36: a janela é de uma hora pelo relógio injetado; com uma hora menos 1 ms conta, com uma hora exata não conta`, `C-36: o limite do agente conta pelo nome do agente, e não pelo token; uma pessoa não é afetada` |
| T-05 (campos do RSK) | `pareceres.test.ts` | `grava todos os campos (T-05) e devolve a vista, com as listas`, `só com os três níveis: textos nulos e listas vazias; texto só de espaços também vira nulo` |
| | `schemas.test.ts` | `aceita baixo, medio e alto, nesta ordem, a mesma lista do banco`; **novos:** `%s: 10.000 caracteres aceitos; 10.001 recusados, só com aquele campo` (os cinco textos), `%s: 50 itens aceitos, 51 recusados; item com 10.000 caracteres aceito, com 10.001 recusado` (as duas listas) |
| Leituras (`listarPareceresRisco`, `obterParecerRisco`) | `pareceres.test.ts` | `lista da mais nova para a mais antiga; agente lê (matriz)`, `200 com a versão, o id do RSK mais novo e o da ESP mais nova da demanda`; **novos:** `com dez versões ou mais, a lista segue o número (v11, v10, …, v1) e versaoMaisNova e especificacaoMaisNova também`, `especificacaoMaisNova só olha a demanda do parecer: a ESP de outra demanda não entra` |

Os testes do engenheiro já cobriam também C-15 (`Origin`), CA-01.3 (401), C-17 (id fora do formato → 404 sem
consulta), C-21 (log), C-30 (evento sem texto livre), G3.8 (rollback na transação de quem chama) e o 404 de demanda e
de versão que não existem.

### Testes acrescentados (20)

| Arquivo | Novos | O que pegam |
|---|---|---|
| `src/app/api/pareceres-risco/pareceres.test.ts`, `describe('bordas (06-T19-testes)')` | 10 | Cinco criações simultâneas com três atores, sem número repetido nem sobrescrita. Fronteira do limite (59 + 1 passa, o seguinte recusa) com ESP, RSK **e DEC** somados, sem consumir versão nem gravar evento. Janela de uma hora exata pelo relógio injetado (1 ms decide). Limite do agente `risco` contado pelo nome, com dois prefixos de token diferentes. Versão por demanda, independente da numeração da ESP. Ordem numérica com 11 versões (`v11` antes de `v10` e de `v2`) e `especificacaoMaisNova` com ESP v10: pegaria uma ordenação ou um `max` pelo texto do id. ESP de outra demanda fora de `especificacaoMaisNova`. Recusas pela rota no nível operacional e jurídico e nas duas listas, cada uma só com o seu campo e sem o valor recebido. Pessoa que manda `rascunhoAgente: true` e autoria de agente. A v1 lida pela rota igual depois da v2, com `criadaEm` do relógio fixo |
| `src/modules/pareceres-risco/schemas.test.ts`, `describe('criarParecerRiscoSchema: bordas (06-T19-testes)')` | 10 | Limite exato de cada um dos cinco textos (10.000 aceito, 10.001 recusado só naquele campo). Limite exato das duas listas (50 itens, item de 10.000). Item de lista que não é texto. Os dez campos de autoria e de decisão da G3.9 fora da saída, que fica só com os três níveis e as duas listas |

### Resultado

- T19 isolada: 2 arquivos, **62 de 62**. Antes dos acréscimos: 42 de 42. Rodei o arquivo da rota de novo, sozinho: 42 de
  42, sem variação.
- `pnpm test`: 94 arquivos, **1720 de 1720**. Antes eram 1700, e os 20 a mais são os desta etapa.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Conferências do critério de pronto

- **Ordem e relógio:**
  - O limite (C-36) conta tudo o que foi criado depois de "agora menos uma hora", sem teto. Uma linha com data mais nova
    que o relógio de quem pergunta também conta.
  - A primeira versão do bloco usava dias depois de `AGORA_TESTE`, com um contador. Assim as 60 versões do agente
    `risco` caíram no futuro do relógio das rotas, e o `CA-11.1 pela rota` recebeu 429. Corrigi antes da entrega, e nada
    disso ficou no código.
  - A versão final usa `usarDia(n)`, com um `n` fixo escrito em cada teste, e não um contador. Todos os dias ficam
    **antes** de `AGORA_TESTE`, e o que o bloco grava fica no passado dos testes do engenheiro.
  - Cada cenário que enche o limite tem pessoa só sua: B na fronteira e C na janela. O teste que enche o limite do agente
    `risco` fica no dia mais antigo (n = 100), onde as versões dele não estão no futuro de nenhum outro teste.
  - Os demais testes ficam bem abaixo dos limites mesmo somando tudo: no máximo cerca de 26 artefatos e 13 demandas da
    pessoa A.
  - Nenhum teste novo lê o relógio real. Todas as datas saem de `relogioFixo`, e as rotas usam o relógio fixo de
    `criarDepsDeTeste`.
  - Os testes do schema não têm estado.
- **`git diff`:**
  - 2 arquivos, 250 inserções e 2 remoções. As duas remoções são linhas de `import` que ganharam nomes: `AGORA_TESTE` e
    o tipo `Ator`.
  - Nenhum teste foi apagado, posto em `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada.
  - O commit `930d924` só criou arquivos e não alterou teste existente.
- **Dados:**
  - só fictícios: "Pessoa Ficticia A" a "D", e-mails `u-rsk-qa-*@exemplo.test`, prefixo de token inventado
    (`Qa7wE2rT`), UUID fictício e as sentinelas de `test/sentinelas.ts`;
  - a conta `wsssistemas2626-crypto` é a conta da empresa já no padrão técnico, e não dado pessoal;
  - nenhum segredo, token literal nem valor de `.env`.

## Decisões tomadas

- **Testes novos nos arquivos do engenheiro, em `describe` próprio** marcado `06-T19-testes`: usam o mesmo banco do
  Testcontainers, sem um segundo container, como na T18.
- **Dias fixos por teste, antes do relógio do arquivo, em vez de contador:** com contador, o dia de cada teste muda
  quando a ordem muda, e o limite sem teto superior faria um teste pesar no outro.
- **Pessoas fictícias gravadas direto na tabela de contas** para os cenários de serviço: não gastam login do Better
  Auth nem entram no limite das contas dos testes de rota.
- **DEC incluído na fronteira do limite:** o teste do engenheiro somava só ESP e RSK, e a regra (C-36) soma os três.
- **11 versões no teste de ordem:** com até 9 versões, ordenar pelo texto do id dá o mesmo resultado que ordenar pelo
  número, e o teste não pegaria a troca.
- **Sem embaralhar a ordem pelo Vitest:** `--sequence.shuffle` não está na minha lista **Pode**. A independência foi
  conferida pela leitura, como descrito acima.

## Pendências

- Observação para a `06-T19-decisao` (não bloqueia):
  - `conferirLimite` (`src/modules/limites.ts:41`) conta `criada_em > agora − 1 h`, sem teto superior.
  - Na produção isso não muda nada: as datas vêm do relógio do próprio processo.
  - Nos testes, quem grava versões com data futura afeta o limite de quem usa um relógio mais antigo, e esta etapa
    esbarrou nisso. Se o tech-lead quiser a janela fechada (`criada_em <= agora`), a mudança é de uma tarefa da
    Fundação, e não da T19.
- Para a T42 (repete o Minor 2 da `06-T19-revisao`): o 400 de nível ausente ou inválido traz "Valor inválido." no
  campo. Os testes novos conferem só o nome do campo, e não o texto, para não fixar o comportamento atual.
- Fora da T19 (repete a observação da `06-T18-testes`): na suíte inteira, duas linhas de log `better_auth` de nível 50
  saem com o horário real, e não com o do relógio fixo. Elas vêm de testes anteriores à T18, e nenhuma asserção depende
  delas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 930d9249db9f0e7c56d1ac56fea800e28668f38c` — 9 arquivos: os 7 da T19, a entrega do engenheiro e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — último commit 2b71475 (06-T19-revisao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo antes dos testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pareceres-risco src/app/api/pareceres-risco` — antes dos acréscimos: 42 de 42
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --stat --grep=06-T05-construcao` — para achar o teste de imutabilidade da T05
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pareceres-risco src/app/api/pareceres-risco` — primeira versão dos acréscimos: 61 de 62; o teste novo `CA-11.1 pela rota` recebeu 429 (dias futuros no limite, corrigido nos testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — no meio da correção: 1 aviso de import sem uso (`beforeEach`), removido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pareceres-risco src/app/api/pareceres-risco` — com os acréscimos: 62 de 62
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1720 de 1720, 94 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 250 inserções, 2 remoções (linhas de import)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 src/app/api/pareceres-risco/pareceres.test.ts` — só imports ampliados e o bloco novo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pareceres-risco/pareceres.test.ts` — segunda rodada: 42 de 42
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois do último ajuste de comentário
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 2 arquivos de teste alterados, nenhum novo

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
