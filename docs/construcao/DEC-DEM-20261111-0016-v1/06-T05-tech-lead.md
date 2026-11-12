---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T05-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 7 e 12), tarefas.json, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8 e T05), 01-analista-requisitos.md (RF-01, RF-03, RF-07), 04-seguranca-aplicacao.md (C06, IN-08, IN-14), 06-T03-tech-lead.md (parecer 3), 06-T04-tech-lead.md (Pendências), 06-T05-engenheiro-backend.md, commit 0a599b5 (git diff 0a599b5~1 0a599b5), src/modules/demandas/consultas.ts, src/app/api/demandas/leitura-awave.test.ts, test/integracoes.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T05 (o Awave lê só a própria demanda, em seis chaves; RF-07, IN-08, ADR-23, D-16), commit `0a599b5`.
**Aprovada.** Nenhum problema Critical ou Important. Há um Minor, descrito abaixo e repetido em Pendências.

### Conferência obrigatória deixada pela 06-T03-revisao (parecer 3): cumprida

Com token `awave`, o GET por id responde igual para demanda de outro autor e para demanda inexistente. Conferi pelo
código e pelo teste.

- **Código:** `src/modules/demandas/consultas.ts:320-322`. `lerDemandaPara` decide pelo tipo do ator antes de qualquer
  leitura. A integração vai direto para `obterDemandaDaIntegracao` e nunca passa por `obterDemanda`.
  `consultas.ts:308` põe `id`, `autor_tipo = 'integracao'` e `autor_id = ator.integracao` no mesmo `WHERE`.
  `consultas.ts:309` lança, sem linha, o mesmo `ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO)`. Os dois casos
  são uma consulta só, com o mesmo resultado vazio. Não sobra ramo, leitura extra nem diferença no número de consultas
  que permita distinguir um do outro.
- **Teste:** `src/app/api/demandas/leitura-awave.test.ts:157-162` compara status, todos os cabeçalhos e o corpo byte a
  byte de três GETs: a demanda de pessoa, a de agente e o id inexistente. O corpo é
  `{ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO }`. O arquivo também confere:
  - `:164-174`: a linha de log por requisição é igual nos três casos (sem `time` e `ms`);
  - `:151-155`: um controle prova que as duas demandas existem, então o 404 não vem de id errado;
  - o teste do status final confere o mesmo com uma demanda de pessoa encerrada.
  Rodei o arquivo. A saída mostra as três linhas de 404 com `atorTipo: "integracao"` e
  `codigoErro: "nao_encontrado"`, sem prefixo nem nome da integração.

### Checklist da seção 12 do padrão técnico

| Item | Resultado |
|---|---|
| Faz o que o plano pede, nem mais nem menos | Os três arquivos da T05 no plano (`consultas.ts`, `[id]/route.ts`, `leitura-awave.test.ts`), além da entrega e de `passagens.jsonl`. As quatro interfaces do G7 existem com a assinatura do plano (`consultas.ts:279`, `:283`, `:296`, `:315`). O PATCH não mudou. `vistaDaDemandaPara` continua lançando para integração (`consultas.ts:270-271`), como o D-01 exige até a T06 |
| Teste para cada comportamento novo, que falharia sem o código | A entrega mostra 7 de 9 falhando antes do código, com o oráculo 403 contra 404 visível. Os dois testes que passaram antes são guardas declaradas: o controle de existência e o 403 do `construir` |
| Sem segredo nem dado pessoal real | Os tokens são gerados em tempo de teste e nunca entram em mensagem de `expect`. Os nomes são fictícios ("Pessoa Ficticia", "Maria Ficticia"), as sentinelas também (`-9d1e`), e a conta do repositório é a mesma de `vistas-para-agente.test.ts`. Nenhuma linha de log nova (G3.10) |
| Zod e erro sem detalhe | Não há rota nova. O id passa pela regex de `paramId.demanda` em `rota()`, que não mudou (G4). O 404 tem a mensagem fixa. O 57014 e o 55P03 da leitura viram o 503 fixo do D-03, por `executarComOrcamento` |
| Banco | Sem migration, sem GRANT. A leitura usa Drizzle com valor por parâmetro (G3.6) |
| Sem duplicação | Reusa `textoMinimo` e `nomesDoSolicitante` (os mesmos de `vistaMinimaDaDemanda`), `executarComOrcamento` (T04), `atorDesconhecido` (T02) e os ajudantes de `test/integracoes.ts`. A captura de log por `substituirDestinoDoLog` fica no próprio arquivo de teste, como nos outros testes do repositório. Não existe ajudante comum em `test/` para isso |
| pt-BR e axe | Nenhuma tela tocada |

### Inventário do IN-02 (G8)

| # | Função | Conferido |
|---|---|---|
| 12 | `lerDemandaPara` (`consultas.ts:315`), `obterDemandaDaIntegracao` (`consultas.ts:296`) | `switch` com `default: return atorDesconhecido(ator)`. A integração é lida pela autoria no `WHERE`. Pessoa, agente e sistema seguem como antes (`vistaDaDemandaPara(ator, await obterDemanda(...))`) |

### Restrições globais

- **G3.5, lista de permissão:** `vistaDaIntegracao` (`consultas.ts:283-292`) monta a resposta chave a chave, sem
  `...objeto`. O `select` de `obterDemandaDaIntegracao` traz só as sete colunas necessárias, e o título passa pelo M-1.
- **IN-08, sentinelas exigidas pela 04:** os testes cobrem `contexto` e `descricaoProblema` (CA-07.1),
  `solicitanteNome` editado por pessoa (CA-07.3) e a `descricaoObjetiva` de uma ESP (caso da ESP, que também confere a
  ausência do id da ESP).
- **Pendência da 06-T04-revisao:** `executarComOrcamento` é chamado sem `t` de fora e com `'padrao'`
  (`consultas.ts:322`). Está como pedido.
- **G4:** `git diff a9fd9b8` das superfícies congeladas e de `src/lib/rota.ts` saiu vazio (rodei).
- **IN-16 / D-17:** o `--stat` dos 16 arquivos continua mostrando só os três da T03, já revisados. A T05 não tocou
  nenhum.
- **Verificação:**
  - `pnpm test`: 255 arquivos, 5554 de 5554;
  - `pnpm test src/app/api/demandas`: 4 arquivos, 119 de 119;
  - `pnpm typecheck` e `pnpm lint`: limpos.

### Desvios do plano (aceitos)

1. Uma demanda do Awave por teste (`DEM-20261022-0901` a `0906`) em vez do `ID_AWAVE` compartilhado. No plano, o
   CA-07.3 e o M-1 alteravam a mesma demanda que o CA-07.1 lia. O arquivo dependia da ordem, e a seção 7 do padrão
   técnico proíbe isso. Nenhuma asserção do plano saiu.
2. Asserções e testes a mais: os seis valores no CA-07.1, todos os cabeçalhos no CA-07.2, o controle de existência, a
   linha de log, o status final, o 403 do `construir` e o `toContain('(fictício)')` do M-1, que prova que o título não
   saiu vazio. Tudo reforça a T05.

### Parecer (Minor, não bloqueia)

1. **`src/modules/demandas/consultas.ts:322` e `src/app/api/demandas/leitura-awave.test.ts`.**
   - **Problema:** nenhum teste prova que o GET da integração roda sob o orçamento de tempo. Se alguém trocar a linha
     322 por `obterDemandaDaIntegracao(deps.db, ator, id)`, a suíte continua verde, e o GET do Awave perde o
     `lock_timeout` e o 503 fixo.
   - **Razão:** a entrega diz que não dá para provocar o 55P03 na leitura sem mudar o código. Dá. Um
     `LOCK TABLE demanda IN ACCESS EXCLUSIVE MODE` numa transação aberta em `b.poolMigrator` bloqueia até o `SELECT`
     simples. Com o `lock_timeout = '2s'` da integração, o GET deve responder 503 com `MENSAGEM_INDISPONIVEL`.
   - **Por que é Minor:** o IN-14 exige esse teste só para o POST e as três rotas do `/construir`, e o caminho está
     certo no código.
   - **Sugestão para a `06-T05-testes`:** teste pela rota, com a trava segurada, que espera 503 e o corpo fixo.

## Decisões tomadas

- Aprovada sem devolução, porque o checklist da seção 12 está cumprido e o único parecer é Minor (seção 12: só
  Critical e Important bloqueiam).
- A conferência obrigatória do parecer 3 da 06-T03-revisao fica fechada: a igualdade de status, cabeçalhos, corpo e
  linha de log está no código (mesma consulta) e no teste (byte a byte).
- Os dois desvios ficam aceitos, porque tiram a dependência de ordem e só acrescentam asserções.

## Pendências

- Minor 1 (acima): teste do 503 no GET da integração com `LOCK TABLE ... ACCESS EXCLUSIVE` segurado em
  `b.poolMigrator`. Fica como sugestão para a `06-T05-testes` ou para a T13, que cobre o IN-14 de forma transversal.
- Para a T06: trocar o `throw semPermissao()` de `vistaDaDemandaPara` (`consultas.ts:270-271`) por
  `vistaDaIntegracao(d)` e ajustar o caso D-01 de `ramos-por-ator.test.ts` (G5). A T06 também precisa provar o
  CA-07.4: as chaves do 201 são as mesmas do CA-07.1.
- As caixas `- [ ]` dos passos da T05 no plano não foram marcadas, porque o G1 proíbe a 06 de editar `docs/`. A
  marcação fica com o maestro, para o status report.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0a599b57002621f8ad6197af8cfbf70ded7c2c04~1 0a599b57002621f8ad6197af8cfbf70ded7c2c04` — 5 arquivos: os 3 da T05, a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0a599b57002621f8ad6197af8cfbf70ded7c2c04~1 0a599b57002621f8ad6197af8cfbf70ded7c2c04 -- src` — diff do código lido por inteiro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -12` — a T05 é o commit 0a599b5, sobre 86f8585
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — só os três da T03 (IN-16)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/demandas` — 4 arquivos, 119 de 119
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 255 arquivos, 5554 de 5554 (saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G substituirDestinoDoLog --name-only --format=%h -n 15 -- test src` — a captura de log fica em cada arquivo de teste; não há ajudante comum duplicado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "headers.entries" --name-only --format=%h -n 10 -- test src` — só o teste da T05; nenhum ajudante existente de comparação de cabeçalhos

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
