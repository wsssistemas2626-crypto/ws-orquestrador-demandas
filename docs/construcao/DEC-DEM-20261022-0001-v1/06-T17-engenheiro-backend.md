---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T17-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e mapa das fases e T14 a T20), 06-T16-engenheiro-backend.md, 06-T16-tech-lead.md, src/lib/rota.ts, src/lib/erros.ts, src/lib/corpo.ts, src/lib/deps.ts, src/lib/env.ts, src/lib/fila.ts, src/lib/relogio.ts, src/db/schema/demandas.ts, src/db/schema/index.ts, src/db/transacao.ts, src/db/privilegios.ts, src/modules/acesso/matriz.ts, src/modules/acesso/ator.ts, src/modules/acesso/mensagens.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/demandas/schemas.ts, src/modules/demandas/servico.ts, src/modules/demandas/servico.test.ts (início), src/modules/demandas/consultas.ts, src/modules/demandas/gerar-id.ts, src/modules/historico/registrar.ts, src/modules/limites.ts, src/app/api/demandas/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/demandas.test.ts (início), test/requisicao.ts, test/deps.ts, test/banco.ts, test/sessao.ts, test/auth.ts, test/sentinelas.ts, test/matriz-rotas.test.ts, test/matriz-rotas-qa.test.ts, test/estatico/exigir-pessoa.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T17 faz a entrada de demanda colando o texto (modo manual) e a leitura do texto recebido. Ela cobre:

- RF-05: CA-05.1 e CA-05.3;
- RF-06: a vista e o GET da demanda nunca trazem o texto bruto;
- RNF-04: o texto vai até 100.000 caracteres.

### Arquivos

Os 4 do plano, todos novos:

- `src/modules/demandas/entrada.ts`:
  - `origemSchema`, `entradaManualSchema` (`criarDemandaSchema.extend`), `entradaAgenteSchema` e `entradaSchema`
    (`discriminatedUnion` por `modo`);
  - `registrarEntrada`, `LIMITE_TEXTO_BRUTO` e `MENSAGEM_ORQUESTRADOR_DESLIGADO`.
  - No modo manual, a demanda (`criarDemanda(..., t)`) e a linha de `entrada_bruta` (`recebida_em = relogio.agora()`)
    entram na mesma transação.
  - O modo agente responde 409 com a mensagem da tela. `entradaPendenteId` responde 404. As duas coisas valem até a
    T28.
- `src/modules/demandas/texto-recebido.ts`:
  - `TextoRecebido` e `obterTextoRecebido`, com `autorizar('ler_texto_bruto')`;
  - `apagarEmDe(recebidaEm, dias)`, a regra "recebida + prazo", que a T31 pode usar.
- `src/app/api/demandas/entrada/route.ts`: `POST` com `rota({ acao: 'registrar_entrada', corpo: entradaSchema })`.
  Responde 201 `{ demanda }` no modo manual. O ramo do 202 `{ entradaId }` já está escrito para a T28.
- `src/modules/demandas/entrada.test.ts`: 33 testes de integração (Postgres real, Better Auth, token de serviço e
  relógio fixo).

Fora da lista do plano (desvio 1):

- `src/modules/acesso/ator-pessoa.ts` e `src/modules/acesso/ator-pessoa.test.ts` (3 testes).
- Mudou `src/app/api/demandas/[id]/route.ts`, que trocou o `somentePessoa` local por `exigirAtorPessoa`.

Os testes `test/matriz-rotas.test.ts` e `test/matriz-rotas-qa.test.ts` já cobrem a rota nova sem mudança:

- 403 para cada agente;
- 403 sem 2FA;
- 401 sem credencial;
- a ação fixada `registrar_entrada` (RF-02), que já estava na lista da QA.

### Testes criados (`entrada.test.ts`)

- **`entradaSchema`:**
  - RNF-04: 100.000 caracteres passam, 100.001 são recusados no campo `texto`;
  - o modo manual exige título, tipo e solicitante;
  - o modo agente exige texto não vazio e o nome do solicitante;
  - `modo` ausente ou fora da lista é recusado;
  - a origem só aceita canal da lista e referência de até 500 caracteres;
  - `entradaPendenteId` só aceita uuid;
  - C-11: autoria e `recebidaEm` vindos do corpo são descartados, nos dois modos.
- **`registrarEntrada`:**
  - CA-05.1: com o texto fictício colado e os campos preenchidos, a demanda nasce `nova`. O texto, a origem e
    `recebida_em` ficam em `entrada_bruta`. `execucao_agente` e `pgboss.job` (`agente.executar`) ficam com zero linhas.
  - RF-06: a vista devolvida não tem `texto`, `origem` nem sentinela.
  - C-30: o único evento é `demanda_criada`, sem nenhum sentinela.
  - Sem texto, ou só com espaços: nenhuma linha em `entrada_bruta`.
  - Origem sem texto não é gravada. Origem vazia fica nula.
  - O texto é guardado como chegou, sem trim.
  - O rollback da transação de quem chama desfaz a demanda, o texto e o evento juntos.
  - C-36: a 31ª entrada na mesma hora dá `limite_excedido` e não grava nada, nem gasta número da sequência.
  - `entradaPendenteId` dá `nao_encontrado` e não grava nada.
  - O modo agente dá `conflito` com a mensagem da tela, sem entrada pendente nem job.
  - Um agente dá `sem_permissao` e não grava nada.
- **`obterTextoRecebido`:**
  - `guardado` traz texto, origem, `recebidaEm` e `apagarEm` (recebida + 90 dias);
  - o prazo vem de `config.retencaoDias` (o teste usa 7 dias);
  - `sem_texto`;
  - `expurgado` traz só a data, sem texto, origem nem sentinela;
  - demanda inexistente e id fora do formato dão `nao_encontrado`;
  - um agente dá `sem_permissao`.
- **`POST /api/demandas/entrada`:**
  - 201 `{ demanda }` com `no-store`, sem eco do texto;
  - CA-05.3: 400 com `[{ campo: 'texto', mensagem: 'Este campo aceita até 100.000 caracteres.' }]`, sem sentinela.
    Nada é gravado e a sequência não avança;
  - RF-06: o `GET /api/demandas/:id` da demanda criada não traz nenhum sentinela;
  - o modo agente dá 409 `{ erro: 'conflito', mensagem: 'O agente orquestrador está desligado. Preencha os campos abaixo.' }`;
  - `entradaPendenteId` dá 404;
  - o token do orquestrador dá 403;
  - CA-01.3: sem credencial, 401;
  - C-15: `Origin` de outro site dá 403;
  - C-21: uma linha `requisicao` por requisição (201, 400, 409, 403), sem texto, e-mail, nome nem token.

### TDD: teste antes, visto falhando

Os testes foram escritos antes do código. Antes da implementação:

```
 FAIL  src/modules/acesso/ator-pessoa.test.ts [ src/modules/acesso/ator-pessoa.test.ts ]
Error: Cannot find module './ator-pessoa' imported from .../src/modules/acesso/ator-pessoa.test.ts
 FAIL  src/modules/demandas/entrada.test.ts [ src/modules/demandas/entrada.test.ts ]
Error: Cannot find module '../../app/api/demandas/entrada/route' imported from .../src/modules/demandas/entrada.test.ts
 Test Files  2 failed (2)
      Tests  no tests
```

Depois do código:

- os dois arquivos novos passaram com 36 de 36;
- a suíte inteira passou com 85 de 85 arquivos e 1455 de 1455 testes, 0 falhas;
- `pnpm lint` e `pnpm typecheck` saíram limpos;
- `pnpm build` passou, com `/api/demandas/entrada` dinâmica;
- o `typecheck` rodou de novo, limpo, com os tipos que o build gerou.

### Desvios do plano

1. **`exigirAtorPessoa` em `src/modules/acesso/ator-pessoa.ts`, com teste do 403, e troca em `[id]/route.ts`.** A
   pendência M-02 da `06-T16-revisao` pediu isso à T17, porque esta é a segunda rota que estreita `Ator` para
   `AtorPessoa`. O comportamento de `PATCH /api/demandas/[id]` não muda, e os testes da T16 continuam verdes.
2. **`registrarEntrada` aceita `t?: Transacao` no fim.** A assinatura do plano não traz esse parâmetro, mas a G3.8
   pede a transação de quem chama em toda função que grava. O teste de rollback usa esse parâmetro.
3. **`obterTextoRecebido` pede só `{ db, config.retencaoDias }`**, e não `Deps` inteiro. Quem passa `Deps` continua
   compatível, e o worker pode chamar a função sem Better Auth nem fila.
4. **Testes de rota no `entrada.test.ts`.** O plano lista um único arquivo de teste. Os casos de 400, 409, 404, 403,
   401, CSRF e log ficaram nele, ao lado dos de serviço.

## Decisões tomadas

- **O texto é guardado sem trim**, como foi colado. Texto vazio ou só com espaços conta como "sem texto", e a demanda
  nasce sem linha em `entrada_bruta`.
- **Origem sem texto é descartada sem erro.** Sem o texto, a origem não descreve nada, e o `CHECK` da tabela pede texto
  enquanto não há expurgo. Origem sem nenhum campo preenchido fica `null`.
- **O modo agente responde 409 sempre**, sem ler `configuracao_agente`. O plano fixa esse comportamento até a T28, e o
  interruptor é da T23.
- **`obterTextoRecebido` confere o id pela `RE_ID_DEMANDA` antes da consulta** (C-17, G3.10). A regex vem de
  `gerar-id.ts`, sem cópia. A função usa uma consulta só (`demanda` com `left join entrada_bruta`), que distingue
  "demanda não existe" (404) de "sem texto".
- **`apagarEm` = `recebidaEm` + dias × 24 h**, numa função exportada. Assim a T31 usa a mesma regra para o expurgo.
- **Nenhum evento novo no histórico.** O plano não pede evento de entrada nem de leitura do texto, e o
  `demanda_criada` já registra a criação. O evento só leva enumerações (C-30).
- **Relógio avançado um dia por teste.** Com isso, o limite de 30 por hora (C-36, pendência M-03 da T16) não liga um
  teste ao outro. A sessão tem 2FA, então a idade da sessão sem 2FA não entra.

## Pendências

- **T28:** ligar o modo agente. Isso inclui gravar `entrada_pendente`, responder 202 `{ entradaId }`, que a rota já
  devolve se o serviço mandar, e resolver `entradaPendenteId`, que hoje dá 404.
- **T31:** usar `apagarEmDe` (ou a mesma regra) no expurgo. Assim a data que a tela mostra é a mesma em que o expurgo
  apaga.
- **T21 e as próximas rotas só de pessoa:** usar `exigirAtorPessoa` de `src/modules/acesso/ator-pessoa.ts`. Isso fecha
  o M-02 da T16.
- **T40 (detalhe):** a tela lê o texto por `obterTextoRecebido`. Não existe rota GET do texto, porque o plano não pede
  uma.
- **Aviso `[UNDICI-FETCH-patch]` na suíte:** segue como na T16. Vem de um teste anterior e não quebra nada.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -n 40` — arquivos dos últimos 40 commits, para achar o código das T11 a T16
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/entrada.test.ts src/modules/acesso/ator-pessoa.test.ts` — antes do código: 2 arquivos falharam (`Cannot find module`), sem testes rodados
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/demandas/entrada.test.ts src/modules/acesso/ator-pessoa.test.ts` — depois do código: 36 de 36
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 85 de 85 arquivos, 1455 de 1455 testes, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; `/api/demandas/entrada` aparece como dinâmica
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — 1 modificado (`src/app/api/demandas/[id]/route.ts`) e 6 novos (os 4 da T17 e os 2 de `ator-pessoa`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo, com os tipos gerados pelo build

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
