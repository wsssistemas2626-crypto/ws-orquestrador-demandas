---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T20-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T19-engenheiro-backend.md, 06-T19-tech-lead.md, 06-T19-qa-automacao.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T15 a T21), 01-analista-requisitos.md (glossário e RF-08 a RF-13 e RF-22 e RF-23), src/db/schema/index.ts, src/db/schema/decisao.ts, src/db/schema/versoes.ts, src/modules/pacotes-decisao/desatualizado.ts, src/modules/pareceres-risco/servico.ts, src/modules/pareceres-risco/consultas.ts, src/modules/pareceres-risco/schemas.ts, src/app/api/pareceres-risco/pareceres.test.ts, src/app/api/demandas/[id]/pareceres-risco/route.ts, src/app/api/pareceres-risco/[rskId]/route.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/consultas.ts, src/modules/especificacoes/servico.test.ts, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/demandas/schemas.ts, src/modules/demandas/transicoes.ts, src/modules/versoes.ts, src/modules/limites.ts, src/modules/acesso/matriz.ts, src/modules/historico/registrar.ts, src/lib/rota.ts, src/lib/erros.ts, src/app/api/demandas/route.ts, src/vendor/construir/pedido.mjs, test/matriz-rotas.test.ts, test/requisicao.ts, test/banco.ts, test/deps.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T20, pacote de decisão (DEC) versionado, desatualizado e filtro por status de decisão. Cobre:

- RF-10: CA-10.1 a CA-10.4;
- RF-12: CA-12.1, mais o RSK v2;
- RF-23: CA-23.1 e CA-23.2;
- RF-11: CA-11.1;
- C-10, C-11, C-15, C-17, C-21, C-30 e C-36;
- CA-04.3 no serviço;
- G3.8 (transação de quem chama).

### Arquivos criados (9, os da lista do plano)

- `src/modules/pacotes-decisao/schemas.ts`:
  - `opcaoSchema`, `criarPacoteDecisaoSchema` e `filtroPacotesSchema`, como no plano;
  - `NIVEIS`, que é a lista `NIVEIS_APROVACAO` do esquema do banco;
  - `STATUS_DECISAO_FILTRO`, que é `'pendente'` mais `STATUS_DECISAO` do banco;
  - `limit` e `offset` reaproveitados de `filtroDemandasSchema.shape` (os mesmos da fila, RF-23);
  - os tipos `CriarPacoteDecisao` e `FiltroPacotes`.
- `src/modules/pacotes-decisao/criar.ts`:
  - `MENSAGEM_FALTAM_ITENS` ("Faltam itens para o pacote.");
  - `descricaoDaDemanda(d)`;
  - `criarPacoteDecisao(deps, ator, demandaId, entrada, t?, extras?)`, na ordem do plano:
    1. `autorizar(ator, 'criar_pacote_decisao')`;
    2. `travarDemanda`;
    3. `conferirLimite(..., 'artefato')`;
    4. ESP e RSK de maior versão; sem um deles, 400 com `faltando`, na ordem `especificacao`, `parecer_risco`;
    5. `proximaVersao`;
    6. insert campo a campo, com a cópia de `tipo`, `titulo` e `descricaoDaDemanda(d)`;
    7. evento `pacote_decisao_criado`;
    8. `mudarStatusPeloSistema(..., 'dec_criado')`.
- `src/modules/pacotes-decisao/consultas.ts`:
  - `PacoteDecisaoVista`, `Aprovador` e `DecisaoVista`;
  - `obterPacoteDecisao(db, decId)`;
  - `listarPacotesDaDemanda(db, demandaId)`, que responde 404 quando a demanda não existe;
  - `listarPacotes(db, filtro)`, que devolve `{ itens, total, limit, offset }`;
  - `statusDecisao`, `aprovadores` e `decisao` vêm de `decisao` e `aprovacao`; `desatualizado` usa `expressaoDesatualizado()`
    da T15; `especificacaoCitada` e `niveisRisco` vêm da ESP e do RSK citados.
- `src/app/api/demandas/[id]/pacotes-decisao/route.ts`: `POST` (201) e `GET` (200 `{ itens }`).
- `src/app/api/pacotes-decisao/route.ts`: `GET` com `query: filtroPacotesSchema`.
- `src/app/api/pacotes-decisao/[decId]/route.ts`: só `GET`, com `paramId.versao('decId', 'DEC')`.
- Testes: `criar.test.ts`, `consultas.test.ts` e `src/app/api/pacotes-decisao/pacotes.test.ts`.

As três rotas usam o `exemplo` padrão de `rota()`, e o `decId` de exemplo já existia em `EXEMPLO_DO_PARAMETRO`. O teste
da matriz (`test/matriz-rotas.test.ts`) passou a cobrir as quatro combinações novas de rota e método sem mudança nele.

### Testes criados

| Arquivo | Testes | O que prova |
|---|---|---|
| `src/modules/pacotes-decisao/criar.test.ts` | 29 | `descricaoDaDemanda`: as três partes, só as preenchidas e nenhuma. CA-10.1 (com a mensagem, sem DEC, sem evento, sem mudança de status), CA-10.2, o caso só com RSK e 404. CA-10.3 (cita ESP v2 e RSK v1, nasce pendente, com `especificacaoCitada`, `niveisRisco` e as versões gravadas). Opções, recomendação e nível; v2. Texto opcional só de espaços: nulo na recomendação e fora da opção. A cópia da demanda não muda depois de editar título, tipo e textos. Descrição vazia. CA-10.4 com o evento do ator `sistema`; `em_analise` e `aguardando_informacao` também vão a `pronta_para_decisao`; quatro status fora da origem não mudam. RF-11 (v1 igual depois da v2). C-11 (autoria do corpo descartada, agente `consolidacao` grava rascunho). `execucaoAgenteId`. C-10 (`sistema`, `orquestrador`, `insumo_tecnico` e `risco`). RF-21 e C-30 com sentinelas. Prefixo do token no evento. G3.8 (rollback do DEC, do evento e do status; vista lida na transação). C-36 com ESP, RSK e DEC somados. CA-04.3 com três criações simultâneas |
| `src/modules/pacotes-decisao/consultas.test.ts` | 21 | `filtroPacotesSchema`: CA-23.2, os quatro status, padrões e limites de `limit` e `offset`, chave repetida recusada, chave desconhecida descartada. CA-12.1 (no `obter` e na lista da demanda), RSK v2, DEC v2 atualizado e v1 não, ESP de outra demanda que não conta. `rascunhosCitados` (os três, só o RSK, nenhum). `niveisRisco` e `especificacaoCitada` do RSK e da ESP citados, e não dos mais novos. `aprovadores` em ordem, com a referência ao documento da administradora, e `decisao` com o nome da conta de quem decidiu, sem id de conta. Decisão devolvida. A vista sem `autorId` e sem `execucaoAgenteId`. 404 da versão. A lista da demanda com 11 versões em ordem numérica, só da demanda; vazia e 404. Num banco próprio: CA-23.1 (2 aprovados entre 5, com `desatualizado` verdadeiro num deles), pendente, devolvida, arquivada, sem filtro em ordem, `limit` e `offset` com o total |
| `src/app/api/pacotes-decisao/pacotes.test.ts` | 25 | Pela rota: 201 com a vista e `no-store`; v2; CA-10.4; CA-10.1 com o corpo exato do 400; corpo inválido com os quatro campos e sem o valor recebido; opção como texto; C-11 com o token do `consolidacao`; id, versão, ESP, RSK, status e decisão do corpo descartados; C-10 (`risco` e `insumo_tecnico` com 403); C-36 (429); 404; C-15; 401. A lista da demanda com status e desatualizado, lida por agente; vazia e 404; 401. CA-12.1 pela rota; 404 da versão; id fora do formato com 404 sem consulta nem conexão; CA-11.1 (só `GET` na versão e no filtro, `GET` e `POST` na lista); 401. CA-23.1 pela rota, com os pendentes lidos pelo token do `consolidacao`; CA-23.2 sem o valor recebido; `limit=500` e chave repetida; 401. C-21 no log, sem id, query, sentinela nem token |

Os dez testes do plano estão presentes, com corpo: CA-10.1 a CA-10.4, a cópia da demanda, CA-12.1, o RSK v2, CA-23.1,
CA-23.2 e `rascunhosCitados`.

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao src/app/api/pacotes-decisao`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/modules/pacotes-decisao/consultas.test.ts [ src/modules/pacotes-decisao/consultas.test.ts ]
Error: Cannot find module './consultas' imported from .../src/modules/pacotes-decisao/consultas.test.ts
 FAIL  src/modules/pacotes-decisao/criar.test.ts [ src/modules/pacotes-decisao/criar.test.ts ]
Error: Cannot find module './consultas' imported from .../src/modules/pacotes-decisao/criar.test.ts
 FAIL  src/app/api/pacotes-decisao/pacotes.test.ts [ src/app/api/pacotes-decisao/pacotes.test.ts ]
Error: Cannot find module './[decId]/route' imported from .../src/app/api/pacotes-decisao/pacotes.test.ts
 Test Files  3 failed (3)
      Tests  no tests
```

### Resultado

- T20 isolada: 3 arquivos, 75 de 75.
- `pnpm test`: 97 arquivos, 1813 de 1813, nenhum falhou.
  - Antes eram 94 arquivos e 1720 testes (a contagem da `06-T19-testes`).
  - Dos 93 testes a mais, 75 são os destes três arquivos.
  - Os outros 18 vêm dos testes que montam a lista de casos a partir dos arquivos de rota, entre eles a matriz de
    rotas, com um caso por método de cada `route.ts`.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano

1. **`src/modules/pacotes-decisao/desatualizado.ts` não foi modificado.** O plano o lista em "Modificar", mas a T15 já
   entregou `expressaoDesatualizado()` com as subconsultas sobre `(demanda_id, versao)`, que é o que o passo 3 pede. A
   leitura usa a expressão como está. Para a junção com a ESP e o RSK citados não se confundir com as subconsultas,
   que leem as tabelas pelo nome, `consultas.ts` usa aliases (`esp_citada`, `rsk_citado`).
2. **`criarPacoteDecisao` recebe `deps: DepsDemanda`**, e não `Deps`. É o mesmo desvio aceito na `06-T18-revisao` e na
   `06-T19-revisao`.
3. **`listarPacotesDaDemanda(db, demandaId)` é uma função a mais**, para o `GET /api/demandas/:id/pacotes-decisao`. Ela
   responde `{ itens }`, com 404 para demanda que não existe, como a lista da ESP e a do RSK. O plano só tem
   `listarPacotes`, cujo filtro não tem demanda.
4. **`decisao.decididaPor` é o nome da conta, e não o id gravado em `decidida_por`.** É a regra das outras vistas
   (autoria pelo nome, nunca pelo id interno). O tipo ficou `string | null`, porque o nome é nulo se a conta não existir
   mais, como em `Responsavel`.
5. **Os testes dos schemas ficaram em `criar.test.ts` e `consultas.test.ts`.** A lista do plano não tem
   `schemas.test.ts`.

## Decisões tomadas

- **Texto opcional vazio não é gravado**, pela regra do RSK (Minor 1 da `06-T19-revisao`). A recomendação vazia vira
  `null`. A chave vazia da opção sai do `jsonb`. O ajudante ficou local (`preenchido` em `criar.ts`), porque o lugar
  comum sugerido (`src/modules/demandas/schemas.ts` ou outro módulo, mais a troca no RSK) está fora da lista da T20.
  Também não usei `.transform` no schema, que é o mesmo do agente (ADR-09): uma transformação pode atrapalhar a T26 se
  o schema virar JSON Schema.
- **Evento `pacote_decisao_criado`** com `entidade: 'pacote_decisao'` e `depois: { versao, rascunhoAgente,
  especificacaoId, parecerRiscoId, nivelAprovacaoRequerido }`. São ids, números e enumeração, que a tela do histórico
  pode mostrar. Pela C-30, resumo, opções e recomendação não entram.
- **`aprovadores` em ordem de `registrada_em`**, e pelo papel quando o instante é o mesmo. Assim a ordem não depende do
  plano do banco. `registrada_por` (id da conta) fica fora da vista.
- **`rascunhosCitados` na ordem DEC, ESP e RSK**, que é a do texto do plano. A T21 usa essa lista para exigir
  `revisouRascunhosDeAgente`.
- **`listarPacotes` ordena por `criada_em`, `demanda_id` e `versao`, todos decrescentes**, como a fila de demandas.
  Numa mesma demanda, a versão desempata pelo número, e não pelo texto do id.
- **`total` conta com o mesmo filtro**, pela mesma junção com `decisao`. O status `pendente` é "sem linha em
  `decisao`".
- **Ação `ler_pacote_decisao` no `GET /api/pacotes-decisao`.** A matriz não tem ação de listagem própria para pacotes,
  e a leitura é a mesma (`LEITURA`: pessoa e os quatro agentes).
- **O DEC é aceito em qualquer status da demanda.** O plano não restringe a criação. Fora da origem de `dec_criado`, o
  status não muda e não há evento, e o teste cobre `pronta_para_decisao`, `aprovada`, `em_construcao` e `encerrada`.
- **CA-23.1 com banco próprio no teste de módulo.** A listagem é de todos os pacotes; com o banco do arquivo, os DEC dos
  outros testes entrariam no total. No teste de rota, só o caso de CA-23.1 grava decisão no arquivo, e a lista de
  aprovados é conferida por inteiro.

## Pendências

- Para a T22 (não bloqueia): uma demanda sem contexto, problema e impacto gera um DEC com `demandaDescricao` vazia. O
  `validarPedido` recusa `demanda.descricao vazio`, e o pedido desse DEC responde 422. O teste "descrição gravada vazia"
  registra o comportamento. Se a 01 quiser recusar o DEC já na criação, a regra entra aqui numa correção.
- Para a `06-T20-revisao`, sobre o Minor 1 da `06-T19-revisao`: agora há duas cópias da regra de texto opcional vazio,
  `textoOuNulo` no RSK e `preenchido` no DEC. Juntar as duas num módulo comum, e levar a regra à ESP e à demanda, toca
  arquivos fora da T20. Fica para uma correção da 08.
- Para a T21: `decisao.decididaPor` na vista é o nome da conta (desvio 4). Se a 03 pedir o papel, ele está em
  `aprovadores`, e não em `decisao`.
- A T30 acrescenta o aviso por e-mail na criação do DEC, e não aqui. Nada foi antecipado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat --oneline -12` — último commit 82a9beb (06-T19-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -- docs/construcao/DEC-DEM-20261022-0001-v1/01-analista-requisitos.md` — 93b8293, arquivo rastreado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao src/app/api/pacotes-decisao` — antes do código: os 3 arquivos falharam (módulos ausentes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pacotes-decisao src/app/api/pacotes-decisao` — 75 de 75
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1813 de 1813, 97 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 9 arquivos novos, os da lista do plano; nenhum alterado

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
