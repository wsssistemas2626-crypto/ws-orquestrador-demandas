---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T02-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, T01, T02 e início da T03), 06-T01-tech-lead.md, 03-ux-ui-design.md (0, 1, 2, 4.4, 5.1 a 5.7, 6.1), src/modules/acesso/ator.ts, src/modules/acesso/matriz.ts, src/modules/acesso/matriz.test.ts, src/modules/acesso/mensagens.ts, src/modules/acesso/tokens-servico.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/modules/historico/consultas.test.ts, src/db/schema/historico.ts, src/modules/demandas/consultas.ts, src/modules/demandas/servico.ts, src/modules/especificacoes/consultas.ts, src/modules/pareceres-risco/consultas.ts, src/modules/pacotes-decisao/consultas.ts, src/components/rotulos.ts, src/components/rotulos-qa.test.ts, src/components/dados-do-pacote.ts (RE_ID_DEC), src/app/(painel)/demandas/[id]/detalhe.ts, src/app/(painel)/demandas/[id]/detalhe.test.ts, src/app/api/demandas/[id]/route.ts, scripts/revogar-token-servico.ts, test/banco.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T02 — tipo de ator `integracao` e ramos exaustivos (IN-02), linhas 1, 4, 5, 8 a 11, 14 a 16 e 20 a 22 do G8.

### Arquivos alterados

| Arquivo | O que mudou | G8 |
|---|---|---|
| `src/modules/acesso/ator.ts` | `INTEGRACOES`/`Integracao` reexportados do esquema; `AtorIntegracao`; `Ator` com o quarto tipo; `ehIntegracao`; `NOME_DA_INTEGRACAO` congelado; `atorDesconhecido(never)` | — |
| `src/modules/acesso/matriz.ts` | `Linha.integracoes` (padrão vazio em toda ação, nenhuma linha abre integração); `permitido` em `switch` com `integracao` (`ehIntegracao` **e** a linha), `sistema` → `false`, `default` com `never` → `false` | #1 |
| `src/modules/historico/registrar.ts` | `AcaoEvento` + `demanda_confirmada`, `pedido_entregue`, `pedido_recebido`; `colunasDoAtor` com caso `integracao` (`ator_id` = integração, prefixo) e `default: atorDesconhecido`; `colunasDoAtorParaTeste` exportada | #4 |
| `src/modules/historico/consultas.ts` | `AtorVisivel` com `{ tipo: 'integracao'; integracao: Integracao \| null; prefixo: string \| null }`; `listarHistorico` lê `ator_token_prefixo`; `atorVisivel` em `switch`: integração da lista com prefixo só se casar `^[A-Za-z0-9_-]{8}$`; integração fora da lista sem nome e sem prefixo; agente continua sem prefixo (C-09) | #20 |
| `src/modules/demandas/consultas.ts` | `Responsavel` e `ResponsavelMinimo` com integração; `responsavelDe` em `switch` (integração só da lista, senão `autoria desconhecida`); `responsavelMinimo` em `switch` com `never`; `semPermissao()` exportado; `vistaDaDemandaPara` em `switch` (pessoa inteira; agente e sistema a mínima de hoje, extraída sem mudança para `vistaMinimaDaDemanda`; integração lança `sem_permissao`, D-01); `listarDemandasPara` lança para integração antes de ler | #8 a #11 |
| `src/modules/demandas/servico.ts` | `autoriaDo` em `switch`: integração e sistema lançam `sem_permissao`, `default: atorDesconhecido` | #5 |
| `src/modules/especificacoes/consultas.ts`, `src/modules/pareceres-risco/consultas.ts`, `src/modules/pacotes-decisao/consultas.ts` | `vista…Para` em `switch`: pessoa inteira; agente e sistema a mínima de hoje (corpo extraído sem mudança); integração lança `sem_permissao` | #14 a #16 |
| `src/components/rotulos.ts` | `NOME_INTEGRACAO` (cópia, D-14); `rotuloAtor` em `switch` (03, 5.6: "<nome> (prefixo <p>)", só o nome sem prefixo válido, "Integração" fora da lista); `textoDoEvento` com `demanda_confirmada`, `pedido_entregue`, `pedido_recebido` (id por `RE_ID_DEC`) e as variantes de `token_criado`/`token_revogado` da 03, 5.6 | #21 |
| `src/app/(painel)/demandas/[id]/detalhe.ts` | `rotuloResponsavel` em `switch`, integração → `NOME_INTEGRACAO[r.integracao]` | #22 |

Pontos que o `typecheck` apontou depois do tipo novo: só `src/components/rotulos-qa.test.ts` (o `satisfies Record<AcaoEvento, true>` feito para quebrar com evento novo sem texto). Nenhum `switch` de produção ficou sem caso; os `if` por tipo de ator fora do G8 foram procurados no histórico (`git log -G`) e são os que o G8 já atribui a outras tarefas (`limites.ts` na T04, `decidir.ts` e afins no #28, `ator-pessoa.ts` congelado) ou a rota GET da demanda, que só chama `vistaDaDemandaPara` (agora lança para integração).

### Testes criados ou alterados

- Novo `src/modules/acesso/ramos-por-ator.test.ts` (14 casos): os do plano, mais: com a matriz da T02 nenhuma ação passa para `awave` nem `construir`; integração fora da lista e tipo desconhecido negados com `sem_permissao`; `autoriaDo` do sistema; `responsavelDe` recusa `integracao`/`risco` e `agente`/`awave`; `colunasDoAtor` de `construir` e de tipo desconhecido (lança); `NOME_DA_INTEGRACAO` congelado; `ehIntegracao` só a lista (inclusive `toString` e `__proto__`); `atorDesconhecido` lança.
- Novo `src/modules/historico/consultas-integracao.test.ts` (6 casos, Postgres real): awave com `ficticio`; construir com `abc` (prefixo nulo); `jarvis` com o CHECK do IN-12 retirado só neste banco (integração nula, prefixo nulo, nada de `jarvis` nem do prefixo na saída); prefixo com `<b>` ou no formato de token não sai; ida e volta por `registrarEvento` com `AtorIntegracao`; agente com prefixo gravado continua sem ele (C-09); tipo desconhecido continua `sistema`.
- Novo `src/components/rotulos-integracao.test.ts` (6 casos): os do plano, mais `/construir` com e sem prefixo, prefixo fora do formato, integração fora da lista ou `toString` nos eventos de token, prefixo no formato de token, e `hash`/`sha256` em `depois` nunca no texto.
- `src/app/(painel)/demandas/[id]/detalhe.test.ts`: um caso acrescentado, como pede o plano (`rotuloResponsavel` de integração é `Awave`).
- `src/components/rotulos-qa.test.ts` (fora do G5, ver Desvios): três chaves novas em `ACOES` e a contagem 24 → 27.

### Teste antes do código (visto falhando)

`pnpm --dir … test src/modules/acesso/ramos-por-ator.test.ts src/components/rotulos-integracao.test.ts src/modules/historico/consultas-integracao.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts"`, antes de qualquer código:

```
 ❯ src/components/rotulos-integracao.test.ts (6 tests | 5 failed)
 ❯ src/modules/acesso/ramos-por-ator.test.ts (14 tests | 9 failed)
 ❯ src/modules/historico/consultas-integracao.test.ts (6 tests | 4 failed)
 ❯ src/app/(painel)/demandas/[id]/detalhe.test.ts (66 tests | 1 failed)
AssertionError: expected 'Não informado' to be 'Awave (prefixo a1b2c3d4)'
AssertionError: expected undefined to be 'Confirmou a demanda aberta pelo Awave'
  - "tipo": "integracao",  + "tipo": "sistema",
Caused by: error: null value in column "ator_tipo" of relation "evento" violates not-null constraint
 Test Files  4 failed (4)
      Tests  19 failed | 73 passed (92)
```

Os que já passavam antes do código: os quatro de `autorizar` e o da ESP/RSK/DEC com `ler_*` (a matriz de hoje já nega quem não é pessoa nem agente; ficam como guarda do ramo novo), `autoriaDo` (o de hoje já lançava no fim), `NOME_INTEGRACAO`/D-14 só falhou por import, e os dois do histórico que provam o que não muda (agente sem prefixo, tipo desconhecido como sistema). O `null value in column "ator_tipo"` mostra o defeito que o `default` fecha: hoje um ator fora da lista chegava ao `insert` com colunas `undefined`.

### Resultado

- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- `pnpm test`: **241 arquivos, 5330 de 5330 passaram**, 0 falharam.
- G4: `git diff a9fd9b8` das superfícies congeladas (com `src/lib/rota.ts`) e dos 16 testes do D-17: vazio.

### Desvios do plano

1. `src/components/rotulos-qa.test.ts` mudou e não está no G5. Razão: o plano manda acrescentar três valores a `AcaoEvento` (interface produzida da T02), e esse teste existe exatamente para quebrar o `typecheck` quando entra evento sem texto. Mudança, trecho a trecho: (a) `ACOES` ganha `demanda_confirmada`, `pedido_entregue`, `pedido_recebido`; (b) o título do `describe` e o `it` dizem 27 em vez de 24, e `toHaveLength(24)` vira `toHaveLength(27)`. Nenhuma asserção saiu; as três ações novas passam a ser cobertas pelos `it.each` de texto legível com cada ator e de C-30 (nenhum valor livre de `antes`/`depois` no texto). Não é teste do D-17.
2. `semPermissao()` ficou exportado de `demandas/consultas.ts` (o plano o mostra local): as vistas de ESP, RSK e DEC usam a mesma recusa, sem uma cópia por arquivo.
3. Testes além do texto do plano nos três arquivos novos (lista acima): reforçam o mesmo comportamento; nenhum pede código fora da T02.

## Decisões tomadas

- `atorVisivel` devolve integração fora da lista com `prefixo: null`, mesmo com prefixo no formato: o plano mostrava o prefixo independente do nome, mas o teste da spec da T02 espera `{ integracao: null, prefixo: null }` para `jarvis`, e a 03 manda mostrar só "Integração"; não expor o que veio de linha corrompida é o lado seguro.
- `rotuloAtor` e os textos de token conferem de novo a regex do prefixo e a lista de integrações (por `hasOwnProperty`, contra `toString`/`__proto__`): o arquivo vai ao navegador e não deve confiar que a leitura já filtrou (03, 5.6: "O prefixo só aparece se casar").
- `token_criado` com integração e sem prefixo válido: "Criou um token de serviço para o <nome>", sem o parêntese (03, 5.6); `token_revogado` só com integração: "Revogou o token de serviço do <nome>" (a 03 não dá o exemplo; segue a regra "sem prefixo válido, sem o parêntese").
- Mudança visível de hoje: o evento `token_revogado` do script grava `{ prefixo }`, então a revogação de token de **agente** passa a ler "Revogou o token de serviço de prefixo <p>" em vez de "Revogou um token de serviço". É o texto da 03, 5.6 ("só com o prefixo"); esses eventos não têm demanda e não aparecem no histórico da T05.
- `rotuloAtor` e `rotuloResponsavel` terminam com `never` e devolvem "Não informado" para tipo montado à mão, em vez de lançar: é tela, e a linha continua legível como a conta que não existe mais.
- Corpos das vistas mínimas extraídos para funções privadas sem mudar uma chave: o `switch` fica legível e o diff do corpo é só indentação/assinatura.
- Três leituras com `git log` rodaram fora da regra de comando deste pedido; o conferir as barrou e o maestro as liberou, porque só leram o histórico (regra de 25/10).

## Pendências

- Nenhuma bloqueia a T02.
- Para a T03: abrir as linhas de `integracoes` na matriz, `atoresProibidos` com integrações e `validarTokenServico` resolvendo `AtorIntegracao` (o Minor 1 da revisão da T01 continua lá).
- Para a T06: trocar o `throw semPermissao()` de `vistaDaDemandaPara` pela vista de seis chaves e o caso do teste "D-01" (G5).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — HEAD em 0d83444 (06-T01-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G token_revogado --name-only --oneline -- src test scripts e2e` — `rotulos.ts`, `rotulos-qa.test.ts`, `revogar-token-servico.ts`, `scripts.test.ts`, `registrar.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G rotuloResponsavel --name-only --oneline -- src test` — `detalhe.ts`, `detalhe.test.ts` e páginas
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/ramos-por-ator.test.ts src/components/rotulos-integracao.test.ts src/modules/historico/consultas-integracao.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts"` — antes do código: 19 de 92 falharam, 73 passaram (trecho acima)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "RE_ID_DEC =" -1 -p --oneline -- src/components/dados-do-pacote.ts` — `RE_ID_DEC` ancorada, sem `g`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 1 erro, em `rotulos-qa.test.ts` (as três ações novas fora do `satisfies`)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/acesso/ramos-por-ator.test.ts src/components/rotulos-integracao.test.ts src/modules/historico/consultas-integracao.test.ts "src/app/(painel)/demandas/[id]/detalhe.test.ts" src/components/rotulos-qa.test.ts` — 5 arquivos, 156 de 156 passaram
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 241 arquivos, 5330 de 5330 passaram, 0 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts src/modules/acesso/matriz.test.ts src/modules/acesso/matriz-qa.test.ts src/modules/acesso/resolver-ator.test.ts src/modules/acesso/resolver-ator-qa.test.ts src/modules/acesso/tokens-servico.test.ts src/modules/acesso/tokens-servico-qa.test.ts src/modules/demandas/servico.test.ts src/modules/historico/registrar.test.ts src/modules/limites.test.ts src/db/privilegios.test.ts src/app/api/vistas-para-agente.test.ts test/matriz-rotas.test.ts test/transversal/sentinelas.test.ts test/estatico/sem-controle-bidi.test.ts test/estatico/sem-recurso-externo.test.ts test/estatico/leituras-da-fila.test.ts` — vazio (G4 e IN-16)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 13 alterados e 3 novos, todos da T02 (lista na Entrega)

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a T02 não cria rota, Server Action nem job; as recusas novas usam a mensagem fixa `sem_permissao`)
