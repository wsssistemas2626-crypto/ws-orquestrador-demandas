---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T19-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 06-T18-engenheiro-backend.md, 06-T18-tech-lead.md, 06-T18-qa-automacao.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T18 a T21), 01-analista-requisitos.md (glossário e RF-08 a RF-14), 03-ux-ui-design.md (T05 a T09), src/db/schema/versoes.ts, src/db/schema/historico.ts, src/modules/especificacoes/servico.ts, src/modules/especificacoes/consultas.ts, src/modules/especificacoes/schemas.ts, src/modules/especificacoes/schemas.test.ts, src/modules/especificacoes/servico.test.ts, src/app/api/especificacoes/especificacoes.test.ts, src/app/api/demandas/[id]/especificacoes/route.ts, src/app/api/especificacoes/[espId]/route.ts, src/modules/demandas/schemas.ts, src/modules/demandas/servico.ts, src/modules/demandas/consultas.ts, src/modules/versoes.ts, src/modules/limites.ts, src/modules/acesso/matriz.ts, src/modules/historico/registrar.ts, src/modules/historico/consultas.ts, src/lib/rota.ts, src/lib/erros.ts, test/matriz-rotas.test.ts, test/requisicao.ts, test/sessao.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T19, parecer de risco (RSK) versionado. Cobre:

- RF-09: CA-09.1 a CA-09.3;
- RF-11: CA-11.1;
- C-10, C-11, C-15, C-17, C-21, C-30 e C-36;
- CA-04.3 pela rota;
- T-05 (os campos do RSK);
- G3.8 (transação de quem chama).

### Arquivos criados (os 7 da lista do plano, nenhum outro)

- `src/modules/pareceres-risco/schemas.ts`:
  - `NIVEIS`, que é a mesma lista de `NIVEIS_RISCO` do esquema do banco (fonte única);
  - `criarParecerRiscoSchema`, igual ao do plano;
  - os tipos `Nivel` e `CriarParecerRisco`.
- `src/modules/pareceres-risco/consultas.ts`:
  - `ParecerRiscoVista`;
  - `listarPareceresRisco(db, demandaId)`, que responde 404 quando a demanda não existe;
  - `obterParecerRisco(db, rskId)`, que devolve `versaoMaisNova` (o RSK de maior versão da demanda) e
    `especificacaoMaisNova` (a ESP de maior versão, ou `null` quando a demanda não tem ESP).
- `src/modules/pareceres-risco/servico.ts`: `criarParecerRisco(deps, ator, demandaId, entrada, t?, extras?)`. A ordem
  é a da ESP, sem a regra de construção e sem o gatilho de status:
  1. `autorizar(ator, 'criar_parecer_risco')`;
  2. `travarDemanda`;
  3. `conferirLimite(..., 'artefato')`;
  4. `proximaVersao`;
  5. insert campo a campo, com a autoria do ator e `rascunho_agente` quando o autor é agente;
  6. evento `parecer_risco_criado`.
- `src/app/api/demandas/[id]/pareceres-risco/route.ts`:
  - `POST` responde 201 com a vista;
  - `GET` responde 200 com `{ itens }`, da versão mais nova para a mais antiga.
- `src/app/api/pareceres-risco/[rskId]/route.ts`: só `GET` (CA-11.1). O id passa por `paramId.versao('rskId', 'RSK')`.
- Testes: `src/modules/pareceres-risco/schemas.test.ts` e `src/app/api/pareceres-risco/pareceres.test.ts`.

As duas rotas usam o `exemplo` padrão de `rota()`. O `rskId` de exemplo já existe em `EXEMPLO_DO_PARAMETRO`. O teste da
matriz (`test/matriz-rotas.test.ts`) passou a cobrir as três rotas novas sem nenhuma mudança nele.

### Testes criados

| Arquivo | Testes | O que prova |
|---|---|---|
| `src/modules/pareceres-risco/schemas.test.ts` | 10 | CA-09.2 (o `critico` do plano e valores fora da lista nos três níveis, inclusive maiúscula, acento, vazio, número e nulo); CA-09.3 (o teste do plano); `recomendacoesMitigacao` como texto; os três níveis obrigatórios; padrões das listas; `NIVEIS` igual à lista do banco; limites de item e de texto; C-11 (autoria, id, versão, demanda e execução descartados) |
| `src/app/api/pareceres-risco/pareceres.test.ts` | 32 | Na rota: CA-09.1; a gravação de todos os campos; texto só de espaços gravado como `null`; RSK sem ESP aceito; CA-09.2 e CA-09.3 com 400, sem o valor recebido; os três níveis ausentes; CA-04.3; C-11 com o token do agente `risco`; id e versão do corpo descartados; C-10 (`consolidacao` e `insumo_tecnico` com 403); C-36 com ESP e RSK somados (429); demanda que fica no status em que está; 404; C-15; 401. No serviço: RF-21 e C-30 com sentinelas; o prefixo do token no evento; `execucaoAgenteId`; C-10 (`sistema` e os três agentes fora da matriz); o rollback na transação de quem chama (G3.8); a vista lida dentro da transação; RF-11 (v1 igual depois da v2). Nas leituras: a ordem da lista e a leitura por agente; lista vazia e 404; `versaoMaisNova` e `especificacaoMaisNova`; id fora do formato com 404 sem nenhuma consulta; CA-11.1 (só `GET` na rota da versão; só `GET` e `POST` na da lista); 401; C-21 no log |

Os seis testes do plano estão presentes, com corpo:

- CA-09.1;
- CA-09.2 (o do plano, no schema, e também pela rota);
- CA-09.3 (o do plano, no schema, e também pela rota);
- CA-11.1;
- C-11 pela rota;
- C-10 pela rota.

### TDD: os testes foram escritos antes e vistos falhando

Comando: `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pareceres-risco src/app/api/pareceres-risco`.
Rodou antes de qualquer código da tarefa. Trecho da saída:

```
 FAIL  src/modules/pareceres-risco/schemas.test.ts [ src/modules/pareceres-risco/schemas.test.ts ]
Error: Cannot find module './schemas' imported from .../src/modules/pareceres-risco/schemas.test.ts
 FAIL  src/app/api/pareceres-risco/pareceres.test.ts [ src/app/api/pareceres-risco/pareceres.test.ts ]
Error: Cannot find module '../../../modules/pareceres-risco/consultas' imported from .../pareceres.test.ts
 Test Files  2 failed (2)
      Tests  no tests
```

### Resultado

- T19 isolada: 2 arquivos, 42 de 42.
- `pnpm test`: 94 arquivos, 1700 de 1700, nenhum falhou.
  - Antes eram 92 arquivos e 1646 testes.
  - Dos 54 testes a mais, 42 são os destes dois arquivos.
  - Os outros 12 vêm dos testes que montam a lista de casos a partir dos arquivos de rota, entre eles a matriz de
    rotas, com um caso por método de cada `route.ts`.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano

1. **`criarParecerRisco` recebe `deps: DepsDemanda`** (`Pick<Deps, 'db' | 'pool' | 'relogio'>`), e não `Deps`. É o
   mesmo desvio da T18, aceito na `06-T18-revisao`: o worker (T27 e T28) chama sem Better Auth nem fila, e quem passa
   um `Deps` inteiro continua compilando.
2. **`GET /api/demandas/:id/pareceres-risco` responde `{ itens: [...] }`** e 404 para demanda inexistente, como a lista
   da ESP (aceito na `06-T18-revisao`).
3. **Os testes do serviço ficaram em `pareceres.test.ts`.** A lista de arquivos do plano não tem `servico.test.ts`.
   Assim os testes usam o mesmo banco do Testcontainers da rota, e nenhum arquivo fora da lista foi criado.

## Decisões tomadas

- **Texto opcional vazio é gravado como `null`.** Um texto só de espaços vira `''` depois do `trim()`. A ESP grava esse
  `''`, e a `06-T18-revisao` apontou o problema (Minor 3): a versão é imutável, e quem lê teria de tratar `''` e `null`
  como iguais. No RSK, `resumo`, os três comentários e `envolverJuridicoOuAdministradoraQuando` vão como `null`. A ESP
  não foi tocada, porque está fora da lista da T19.
- **`NIVEIS` é a mesma lista de `NIVEIS_RISCO`** (`src/db/schema/versoes.ts`). Não é uma lista nova. O schema e o
  `CHECK` do banco não podem divergir, e um teste confere a igualdade.
- **Evento `parecer_risco_criado`** com `entidade: 'parecer_risco'` (o nome da tabela e o prefixo da ação),
  `entidadeId` com o id do RSK e `depois: { versao, rascunhoAgente }`. Pela C-30, comentários e listas não entram:
  podem trazer dado de terceiro.
- **Sem conferência de ESP e sem mudança de status.** O plano diz que o RSK não exige ESP e não tem gatilho de status.
  O teste confere que uma demanda `em_analise` continua `em_analise` e que o histórico só ganha `parecer_risco_criado`.
- **`especificacaoMaisNova` é o id da ESP de maior versão no momento da leitura.** Não guarda vínculo do RSK com uma
  ESP, porque a tabela não tem essa coluna. É o que a tela T08 da 03 mostra ("A especificação mais nova desta demanda é
  a ESP-…").
- **O POST devolve a vista com `versaoMaisNova` e `especificacaoMaisNova`**, como o POST da ESP devolve a vista com
  `versaoMaisNova`. O tipo de retorno do plano (`ParecerRiscoVista`) aceita os campos a mais.
- **As consultas de `obterParecerRisco` rodam em sequência**, e não em paralelo, porque `db` pode ser a transação de
  quem chama, com uma conexão só. É a mesma regra de `obterDemanda`.

## Pendências

- Para a T42 (não bloqueia):
  - Sem nível, o 400 traz "Valor inválido." no campo, e não o texto da 03 para a tela T08 ("Escolha o nível do risco
    técnico.", e o mesmo para o operacional e o jurídico).
  - O motivo: o `mensagemDoIssue` da T03 só repassa a mensagem de issue `custom`, e o `z.enum` gera `invalid_value`.
  - A tela pode validar no cliente, como na Pendência 5 da `06-T18-revisao` para `sistemaAlvo`. Se a 03 exigir o
    texto também do servidor, a mudança é em `src/lib/erros.ts` (T03).
- Para a `06-T19-revisao`: a ESP continua gravando `''` em texto opcional só de espaços (Minor 3 da `06-T18-revisao`).
  O RSK não grava. Se o tech-lead quiser a mesma regra nos dois, a mudança na ESP é de uma correção da 08.
- A T28 acrescenta o disparo do agente de risco na criação da ESP, e não aqui. Nada foi antecipado.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit c228a68 (06-T18-testes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pareceres-risco src/app/api/pareceres-risco` — antes do código: os 2 arquivos falharam (módulos ausentes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pareceres-risco src/app/api/pareceres-risco` — 42 de 42
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1700 de 1700, 94 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 7 arquivos novos, os da lista do plano; nenhum alterado

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
