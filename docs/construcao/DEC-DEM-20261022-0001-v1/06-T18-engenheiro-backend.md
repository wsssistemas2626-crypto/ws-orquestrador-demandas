---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T18-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, parada-PF-T18.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T17 a T21), 01-analista-requisitos.md (RF-05 a RF-10), 03-ux-ui-design.md (T04 a T07), estruturaAutonoma/ferramentas/construir/lib/pedido.mjs, src/modules/demandas/servico.ts, src/modules/demandas/schemas.ts, src/modules/demandas/consultas.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/entrada.ts, src/modules/demandas/servico.test.ts, src/modules/versoes.ts, src/modules/limites.ts, src/modules/acesso/matriz.ts, src/modules/historico/registrar.ts, src/modules/historico/registrar.test.ts, src/modules/historico/consultas.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/fila.ts, src/db/schema/versoes.ts, src/db/schema/historico.ts, src/db/schema/operacao.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/[id]/historico/route.ts, src/app/api/demandas/entrada/route.ts, src/app/api/demandas/demandas.test.ts, test/matriz-rotas.test.ts, test/requisicao.ts, test/banco.ts, test/deps.ts, test/sessao.ts, test/sentinelas.ts, test/estatico/varreduras-qa.test.ts, eslint.config.mjs, tsconfig.json, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T18, especificação técnica (ESP) versionada. Cobre RF-08 (CA-08.1 a CA-08.5), RF-11 (CA-11.1), RF-15 (CA-15.1 e
CA-15.2), CA-04.3 pela rota, C-11, C-36 para artefatos, ADR-05 (a cópia do `validarPedido`) e ADR-09 (um schema só para
rota, Server Action e job).

### Arquivos criados

- `src/vendor/construir/pedido.mjs`: cópia byte a byte de `estruturaAutonoma/ferramentas/construir/lib/pedido.mjs`.
  Um teste temporário confirmou a igualdade com `Buffer.compare` e com o SHA-256 da origem (ver Desvios, item 3).
- `src/vendor/construir/pedido.d.mts`: os tipos de `validarPedido`, `DONOS_REPOSITORIO` e `TIPOS_CONSTRUIDOS`, como o
  plano manda.
- `src/vendor/construir/ORIGEM.md`: caminho de origem, data da cópia (26/10/2026) e SHA-256
  `cd014814f3b898bfbb320eadefa3fd28c8efdf5707a733352f441cb83d35f016`.
- `src/vendor/construir/origem.test.ts`: o teste do plano. Falha se `pedido.mjs` for editado.
- `src/vendor/construir/temporario-comparar.test.ts`: fora da lista do plano (ver Desvios, item 3). Confere a cópia
  contra as enumerações do app: tipos construídos = tipos de demanda sem `estudo`; donos = as duas contas do padrão.
- `src/modules/especificacoes/schemas.ts`:
  - `criarEspecificacaoSchema`, igual ao do plano;
  - `validarCamposDeConstrucao(tipo, e)`, que usa `DONOS_REPOSITORIO` e `TIPOS_CONSTRUIDOS` da cópia;
  - `MENSAGENS_CONSTRUCAO`, com os textos de erro da 03, tela T07.
- `src/modules/especificacoes/consultas.ts`: `EspecificacaoVista`, `listarEspecificacoes(db, demandaId)` (404 quando
  a demanda não existe) e `obterEspecificacao(db, espId)`, que devolve `versaoMaisNova` com o id da ESP mais nova.
- `src/modules/especificacoes/servico.ts`: `criarEspecificacao(deps, ator, demandaId, entrada, t?, extras?)`. A ordem é
  a do plano:
  1. `autorizar`;
  2. `travarDemanda`;
  3. `conferirLimite(..., 'artefato')`;
  4. `validarCamposDeConstrucao` com o tipo atual da demanda (400 com `campos`);
  5. `proximaVersao`;
  6. insert campo a campo, com a autoria do ator e `rascunho_agente` de agente;
  7. evento `especificacao_criada`;
  8. com dúvida em aberto, `mudarStatusPeloSistema(..., 'duvida_em_aberto')`.
- `src/app/api/demandas/[id]/especificacoes/route.ts`: `POST` responde 201 com a vista. `GET` responde 200 com
  `{ itens }`, da versão mais nova para a mais antiga.
- `src/app/api/especificacoes/[espId]/route.ts`: só `GET` (CA-11.1). O id passa por `paramId.versao('espId', 'ESP')`.
- Testes: `src/modules/especificacoes/schemas.test.ts`, `src/modules/especificacoes/servico.test.ts` e
  `src/app/api/especificacoes/especificacoes.test.ts`.

As duas rotas usam o `exemplo` padrão de `rota()`, montado a partir do caminho. Ele é válido: `id` e `espId` passam na
regex. O teste da matriz (`test/matriz-rotas.test.ts`) passou a cobrir as três rotas novas sem nenhuma mudança nele:
cada ator proibido recebe 403, quem não tem 2FA recebe 403, quem não tem credencial recebe 401 e parâmetro inválido
recebe 404.

### Arquivos alterados (fora da lista do plano; ver Desvios, itens 1 e 2)

- `src/modules/demandas/consultas.ts`: passam a ser exportados `responsavelDe` e `contaDoAutor`. Só o `export` e um
  comentário mudaram.
- `src/modules/demandas/servico.ts`: passa a ser exportada `autoriaDo`. Só o `export` e um comentário mudaram.

### Testes criados

| Arquivo | Testes | O que prova |
|---|---|---|
| `src/vendor/construir/origem.test.ts` | 1 | SHA-256 da cópia igual ao de ORIGEM.md (ADR-05, C-29) |
| `src/vendor/construir/temporario-comparar.test.ts` | 3 | tipos construídos e donos da cópia batem com o app; `validarPedido` recusa não-objeto e estudo |
| `src/modules/especificacoes/schemas.test.ts` | 16 | CA-08.2 a CA-08.5, C-11, listas, limites, formato do sistema alvo, a ordem e os textos dos quatro campos, os donos, o repositório que não termina com o sistema alvo, o estudo com repositório informado |
| `src/modules/especificacoes/servico.test.ts` | 25 | CA-08.1, a gravação dos campos, CA-08.2 e CA-08.4 no serviço, o tipo atual lido com a trava, C-11, `execucaoAgenteId`, C-10 (agente `risco` e ator `sistema`), 404, RF-21 e C-30 no evento, o prefixo do token, CA-15.1 com as origens permitidas e proibidas, o rollback na transação de quem chama (G3.8), C-36, as consultas |
| `src/app/api/especificacoes/especificacoes.test.ts` | 24 | os 7 do plano (CA-08.1, CA-04.3, CA-11.1, CA-15.1, CA-15.2, C-11 pela rota, C-36 com 429), CA-08.2 a CA-08.5 pela rota, C-10 com 403, 404, C-15, 401, a leitura por agente, id fora do formato com 404 sem nenhuma consulta e C-21 no log |

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/vendor src/modules/especificacoes src/app/api/especificacoes`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/modules/especificacoes/schemas.test.ts
Error: Cannot find module '../../vendor/construir/pedido.mjs' imported from .../schemas.test.ts
 FAIL  src/modules/especificacoes/servico.test.ts
Error: Cannot find module './consultas' imported from .../servico.test.ts
 FAIL  src/app/api/especificacoes/especificacoes.test.ts
Error: Cannot find module './[espId]/route' imported from .../especificacoes.test.ts
 FAIL  src/vendor/construir/origem.test.ts > a cópia do validarPedido tem o SHA-256 registrado em ORIGEM.md
Error: ENOENT: no such file or directory, open 'src/vendor/construir/pedido.mjs'
 Test Files  4 failed (4)
```

Na segunda rodada, com a cópia gravada e antes do `ORIGEM.md`, as duas asserções de igualdade com a origem passaram.
A falha proposital da terceira asserção mostrou o SHA-256:

```
 FAIL  src/vendor/construir/origem.test.ts > ...
Error: ENOENT: no such file or directory, open 'src/vendor/construir/ORIGEM.md'
 FAIL  src/vendor/construir/temporario-comparar.test.ts > cópia igual à origem
Received: "SHA-256 cd014814f3b898bfbb320eadefa3fd28c8efdf5707a733352f441cb83d35f016"
```

### Resultado

- T18 isolada: 5 arquivos, 69 de 69.
- `pnpm test`: 91 arquivos, 1548 de 1548, nenhum falhou. A suíte inclui a matriz de rotas com as três rotas novas e os
  estáticos da T13.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano

1. **`autoriaDo` exportada de `demandas/servico.ts`**, que não está na lista de arquivos da T18. A ESP grava a mesma
   autoria da demanda (C-11), e o checklist proíbe duplicar função. A mudança é só o `export`, e o comportamento da T15
   fica igual. A T19 e a T20 usam a mesma função.
2. **`responsavelDe` e `contaDoAutor` exportadas de `demandas/consultas.ts`**, pelo mesmo motivo: a vista da ESP mostra
   o autor como a vista da demanda (nome da conta ou nome do agente, nunca o id). Só o `export` mudou.
3. **Arquivo a mais: `src/vendor/construir/temporario-comparar.test.ts`.**
   - Para confirmar a cópia byte a byte sem `cp` nem `sha256sum`, que estão fora da minha lista **Pode**, gravei a cópia
     com o Write. Depois rodei um teste temporário que comparava o arquivo com a origem pelo caminho absoluto.
   - O plano conta com essa conferência ("o primeiro valor sai da própria falha do teste"). Mas o `origem.test.ts`
     sozinho não prova que a cópia é igual à origem; prova só que o SHA não mudou depois de registrado.
   - Apagar o arquivo pede `rm`, que também está fora da lista **Pode**. Por isso troquei o conteúdo por um teste
     portátil e útil: as listas da cópia contra as enumerações do app, sem caminho absoluto nem leitura fora do
     repositório.
   - O nome ficou da conferência. Sugestão para a revisão: renomear para `src/vendor/construir/contrato.test.ts`, ou
     apagar se o tech-lead julgar o teste dispensável.
4. **`criarEspecificacao` recebe `deps: DepsDemanda`** (`Pick<Deps, 'db' | 'pool' | 'relogio'>`), e não `Deps`. É o
   mesmo tipo do serviço de demanda. O worker (T27 e T28) chama sem Better Auth nem fila, e quem passa um `Deps`
   inteiro continua compilando.
5. **`GET /api/demandas/:id/especificacoes` responde `{ itens: [...] }`**, e não uma lista solta. Segue a forma do
   histórico (`{ itens }`). Com a demanda inexistente, responde 404, e não lista vazia, como no histórico.

## Decisões tomadas

- **Evento `especificacao_criada`**: `entidade: 'especificacao'`, `entidadeId` com o id da ESP e `depois: { versao,
  rascunhoAgente }`. C-30 proíbe texto livre no histórico, e todo campo da ESP é texto livre ou lista dele.
- **Regra de construção com o tipo da demanda lido sob a trava**, e não com o tipo que o chamador conhece. O tipo pode
  ter mudado pelo PATCH, e a trava fecha essa corrida.
- **Validação de construção depois do limite e antes da versão.** Segue a ordem do plano. Uma recusa não gasta número
  de versão, e o insert não acontece.
- **Mensagens da 03 (T07)**: "Informe o sistema alvo.", "Informe o repositório destino.", "Informe ao menos um critério
  de aceite preliminar.", "Informe ao menos um item da definição de pronto." e "O repositório destino precisa terminar
  com o sistema alvo.".
- **Repositório em outra conta (CA-08.3)**: a 03 não tem texto para esse caso. Usei "A conta do repositório precisa ser
  fabianojp06 ou wsssistemas2626-crypto.", montado a partir de `DONOS_REPOSITORIO`, para acompanhar a cópia.
- **Sem sistema alvo num tipo construído, o repositório não ganha um segundo erro.** O campo do sistema alvo já explica
  o problema.
- **Estudo com repositório informado segue a mesma regra do repositório.** O tipo pode mudar depois; assim, nenhum valor
  fora do formato fica gravado numa versão imutável.
- **Lista vazia conta como ausente** em critérios e definição de pronto. O `validarPedido` usa `listaPreenchida`, que
  pede ao menos um item.
- **`versaoMaisNova` é o id da ESP de maior versão da demanda.** É a forma de `especificacaoMaisNova` da T19.
- **A vista não traz `autorId` nem `execucaoAgenteId`.** Segue a vista da demanda, que mostra a autoria só como
  `autor`.

## Pendências

- Para a `06-T18-revisao`:
  - o nome de `temporario-comparar.test.ts` (Desvios, item 3);
  - as duas exportações em arquivos da T15 (Desvios, itens 1 e 2).
- Para a T22, que vai usar a cópia inteira: `validarPedido` recebe `unknown` e devolve `{ ok, erros }`, e as mensagens
  de `erros` são internas do `/construir`. A T22 decide se as mostra.
- Para a T41: o 400 de `sistemaAlvo` fora do formato chega como "Valor inválido.", e não com o texto do `regex`. O
  `mapearErro` da T03 só repassa mensagem de issue `custom`, e o `regex` gera `invalid_format`. A tela T07 já mostra a
  dica, e o texto exato da 03 pode vir da validação no cliente. Mudar o mapeador é da T03.
- A T28 acrescenta ao serviço o disparo do agente de risco, como o plano prevê. Nada foi antecipado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — último commit baa7773 (PF-T18 fabiano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -3 --stat --format=%h%n%B` — PF-T18 só com `parada-PF-T18.md` e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=---%s -- src test scripts drizzle package.json vitest.config.ts` — arquivos de cada tarefa anterior
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/vendor src/modules/especificacoes src/app/api/especificacoes` — antes do código: 4 arquivos falharam (módulos ausentes, ENOENT)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/vendor` — cópia igual à origem; SHA-256 mostrado pela falha proposital; `ORIGEM.md` ausente
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/vendor src/modules/especificacoes src/app/api/especificacoes` — 69 de 69
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1548 de 1548, 91 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 2 alterados e 13 novos, todos listados na Entrega
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só os `export` em `demandas/consultas.ts` e `demandas/servico.ts`

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
