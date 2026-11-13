---
pedido: DEC-DEM-20261111-0017-v1
etapa: 06-T03-construcao
agente: engenheiro-backend
leu: [pedido.json, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T01-engenheiro-dados-bd.md, 06-T02-engenheiro-backend.md, docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md (linhas 1 a 340, G1 a G10, e 680 a 942, fim da T02 e T03), src/modules/limites.ts, src/db/schema/andamento.ts, src/db/transacao.ts, test/banco.ts, test/deps.ts, test/pedidos-construcao.ts, test/estatico/piso-de-assercoes.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T03 do plano: limite de gravações de andamento, 60 por DEC e 600 no total por hora, contado só para o `construir`, sob
trava consultiva própria (RF-12 na função, RNF-02, AN-07, AN-08 c, ADR-31, CA-12.6). Antes de escrever código, conferi
que os três arquivos da T03 ficam em `src/` e `test/`, dentro da minha lista Pode. As pendências da 06-T01 e da 06-T02
não citam a T03.

### Arquivos criados

- `src/modules/limites-andamento.test.ts`: o teste do plano, sem mudança. Cobre os cinco atores que não são o
  `construir` (awave, integração fora da lista, pessoa, agente, sistema) lançando em menos de 1 s com a trava
  `limite:andamento:integracao:construir` segura por outra conexão (AN-08 c). Cobre também as constantes e as
  mensagens da 03, seção 7, os 59 do DEC que passam e os 60 que dão `limite_excedido` com a mensagem por DEC, outro DEC
  passando, a janela móvel (61 min atrás não conta), o total 599/600 com a mensagem total, duas gravações simultâneas em
  duas conexões com 599 no total (uma grava, a outra `limite_excedido`) e `LIMITE_POR_HORA` sem mudança (CA-12.6).

### Arquivos modificados

- `src/modules/limites.ts`: só acréscimos no fim (`LIMITE_ANDAMENTO`, `TRAVA_DO_LIMITE_DE_ANDAMENTO`,
  `semLimiteDeAndamento` e `conferirLimiteDeAndamento`, o código do plano), mais `andamentoConstrucao` no `import` de
  `../db/schema`, como o plano manda. `TipoLimite`, `LIMITE_POR_HORA`, `MENSAGEM_LIMITE`, `LIMITE_DA_INTEGRACAO`,
  `limiteDe` e `conferirLimite` ficaram sem linha mudada (G4).
- `test/estatico/piso-de-assercoes.test.ts`: `'src/modules/limites-andamento.test.ts': 12`, que é o número de linhas
  com `expect(` no fim da tarefa, com o comentário da T03.

### Teste escrito antes, visto falhando

`pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-andamento.test.ts --reporter=dot`, antes de mexer em `limites.ts`:

```
 FAIL  src/modules/limites-andamento.test.ts > AN-07: contagem por DEC e total, na janela > constantes: 60, 600, a chave literal e as mensagens da 03, seção 7
AssertionError: expected undefined to deeply equal { porDec: { maximo: 60, …(1) }, …(1) }
 FAIL  ... > 59 do DEC passa; 60 dá 429 com a mensagem por DEC; outro DEC passa
Caused by: TypeError: conferirLimiteDeAndamento is not a function
 FAIL  ... > 599 no total e duas gravações simultâneas de DEC diferentes (duas conexões): uma passa, a outra 429
AssertionError: expected [ undefined, undefined ] to deeply equal [ 'gravou', 'limite_excedido' ]
 Test Files  1 failed (1)
      Tests  5 failed | 6 passed (11)
```

### Resultado

- `limites-andamento.test.ts` com `limites.test.ts`: 2 arquivos, **22 passaram, 0 falharam**.
- `pnpm test` completo: **314 arquivos, 6647 testes passaram, 0 falharam** (224 s).
- `pnpm lint` e `pnpm typecheck`: limpos.

### `git diff 0ac099a -- src/modules/limites.ts`

Uma linha trocada no `import` (`andamentoConstrucao` acrescentado) e 38 linhas `+` no fim do arquivo, com o código do
plano. Nenhuma outra linha mudou.

### G4

`git diff 0ac099a --stat` das superfícies congeladas saiu **vazio**.

### Desvios do plano

- **Casos que já nascem verdes (G3.1).** Os cinco casos "… lança antes de tomar a trava (AN-08 c)" e o "CA-12.6: os
  limites de pessoa, agente e Awave não mudam" passaram antes do código. No CA-12.6, a guarda confere o que já existe.
  Nos cinco de AN-08 c, `conferirLimiteDeAndamento` ainda não existia, e chamar a função inexistente também rejeita em
  menos de 1 s. Com o código, eles passam pelo motivo certo, porque cada ator lança antes do `pg_advisory_xact_lock`. A
  prova de que a trava é tomada vem do caso das duas gravações simultâneas, que falhou antes e agora passa. Os casos
  que exigem o código novo (constantes, por DEC, janela, total e concorrência) falharam antes, como mostra o trecho
  acima.
- Fora isso, nenhum desvio. O teste e a função são os do plano, sem mudança.

## Decisões tomadas

- **Teste e função copiados do plano sem mudança:** eles são o contrato do AN-07 e da T03, e a revisão confere contra o
  plano.
- **`andamentoConstrucao` no `import` existente, e não num segundo `import`:** é o que o plano pede ("importar
  `andamentoConstrucao` de `../db/schema`"). Uma segunda linha de `import` do mesmo módulo cairia no lint de import
  duplicado.
- **Piso em 12:** é a contagem por linha, a mesma regra do `linhasComExpect`, feita com `git grep -c --untracked`.
- **Comandos `pnpm` com `--dir <repo>`:** o shell do agente começa na estruturaAutonoma, e o `cd` não está na lista Pode.
  É a mesma forma da 06-T01 e da 06-T02.

## Pendências

- Nenhuma bloqueia a passagem.
- Para a `06-T03-revisao`: a G4 saiu vazia. O diff parcial de `limites.ts` é só o `import` e os acréscimos no fim.
  `src/modules/limites.test.ts` não mudou e continua com 21 linhas `expect(`, igual ao piso.
- Para a `06-T07` (serviço): `conferirLimiteDeAndamento` não tem `set local`, `set_config`, `comTransacao`,
  `executarComOrcamento` nem `Promise.all` (G3.7). Ela roda na transação de quem chama, depois das travas do pedido e da
  demanda (ADR-32).
- Para a `06-T08` (rota): o `ErroDominio('limite_excedido', …)` é o mesmo código do limite de hoje, e o `rota()` já o
  traduz para 429. O CA-12 pela rota fica com a T08.
- O resumo da suíte completa, que rodou em segundo plano, foi lido do arquivo de saída pela ferramenta Read. Não usei
  `grep` nem `wc` nele.
- Nenhuma migration rodou e nada tocou banco fora do Testcontainers.
- O texto do pedido não trouxe instrução para mudar de tarefa, ler segredo, chamar endereço de fora ou sair do
  repositório.

## Comandos executados

- `ls /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — arquivos da pasta do pedido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T03" -- docs/superpowers/plans/2026-11-12-ws-orquestrador-demandas-plano.md` — seção da T03 no plano
- `grep -rn "T03" /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261111-0017-v1` — nenhuma pendência da 06-T01 nem da 06-T02 cita a T03
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/limites.ts` — o arquivo antes da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -5` — último commit `dee5d3a` (06-T02-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -e "export" -- test/banco.ts test/deps.ts test/integracoes.ts test/pedidos-construcao.ts src/db/transacao.ts src/modules/acesso/ator.ts src/lib/relogio.ts` — assinaturas dos ajudantes
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/pedidos-construcao.ts` — `preparadorDePedidos`
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/banco.ts` — `poolMigrator` com `max: 2`
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/estatico/piso-de-assercoes.test.ts` — o `PISO` de hoje
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/db/schema/andamento.ts` — colunas `decId` e `gravadoEm`
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/db/transacao.ts` — `comTransacao` e `executor`
- `cat /home/deploy/servidor/projetos/ws-orquestrador-demandas/test/deps.ts` — `criarDepsDeTeste` com o relógio
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-andamento.test.ts --reporter=dot` — antes do código: 5 falharam, 6 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c "" -- src/modules/limites.ts` — 101 linhas antes do acréscimo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/limites-andamento.test.ts src/modules/limites.test.ts --reporter=dot` — 22 de 22
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -c --untracked "expect(" -- src/modules/limites-andamento.test.ts src/modules/limites.test.ts` — 12 e 21
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — 314 arquivos, 6647 de 6647
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a -- src/modules/limites.ts` — só o `import` e os acréscimos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 0ac099a --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/modules/acesso/tokens-servico.ts src/proxy.ts src/db/transacao.ts src/modules/integracoes/tempo-limite.ts src/modules/demandas/confirmacao.ts src/modules/agentes/entrada-agente.ts src/modules/especificacoes/consultas.ts src/modules/pareceres-risco/consultas.ts src/modules/pacotes-decisao/consultas.ts next.config.ts drizzle/000[0-7]_*.sql drizzle/meta/000[0-7]_snapshot.json` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os 3 arquivos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T03 não cria entrada nova; a rota é da T08, e a mensagem do 429 é o texto da 03, sem detalhe interno)
