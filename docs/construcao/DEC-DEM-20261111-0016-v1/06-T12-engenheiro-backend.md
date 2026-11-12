---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T12-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, tarefas.json, 05-tech-lead.md, parada-P2.md, 03-ux-ui-design.md (linhas 1 a 40 e seções 7 a 11), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, fim da T10, T11, T12 e T13), 06-T03-qa-automacao.md, 06-T04-engenheiro-backend.md, 06-T04-tech-lead.md, 06-T10-engenheiro-dados-bd.md, 06-T10-tech-lead.md, 06-T10-qa-automacao.md, 06-T11-engenheiro-backend.md, 06-T11-tech-lead.md, 06-T11-qa-automacao.md, src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/schemas.ts, src/modules/integracoes/tempo-limite.ts, src/modules/historico/registrar.ts, src/modules/limites.ts (linhas 80 a 101), src/modules/demandas/servico.ts (linhas 1 a 40), src/app/api/pedidos-construcao/[decId]/entrega/route.ts, src/app/api/pedidos-construcao/entrega.test.ts, src/lib/rota.ts, src/lib/erros.ts, src/lib/corpo.ts, test/requisicao.ts, test/integracoes.ts, test/matriz-rotas.test.ts, eslint.config.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T12: o `/construir` confirma o recebimento do Pedido de Construção (RF-14, RNF-08 parte 2, IN-11, IN-12, CA-14.1 a
CA-14.5, D-04), como pede o plano.

### Conferência antes de começar

A T12 cria `src/modules/pedido-construcao/receber.ts`, `src/app/api/pedidos-construcao/[decId]/recebimento/route.ts` e
`src/app/api/pedidos-construcao/recebimento.test.ts`. Os três estão em `src/`, dentro da minha lista Pode. A G5 não
manda mudar nenhum teste que já existe nesta tarefa, e nenhum mudou. Não houve motivo para devolver ao plano.

### Pendências das entregas 06-T01 a 06-T11 que citam a T12

A busca foi `git log -G T12` na pasta do pedido. Citam a T12: 06-T03-testes, 06-T04 (construção e revisão), 06-T10 (as
três) e 06-T11 (as três), além do 05, da parada P2 e da 03.

| De onde | O que pede | Como ficou |
|---|---|---|
| 06-T11 (engenheiro e revisão) | importar `RE_SHA256` de `./entregar` ou de `./pendentes`, sem outra regex | **Feito.** `receber.ts` importa de `./pendentes`, a fonte única, e o `recebimentoSchema` usa essa regex |
| 06-T10 (engenheiro) | `shasEntregues` para o 409 (sem entrega ou hash diferente) e `recebidoComSha` para a repetição, sob a trava consultiva por DEC do IN-11 | **Feito**, nessa ordem e dentro da trava `pedido:<decId>` |
| 06-T10-testes | a T12 depende de as leituras rodarem no `tx` de quem chama | **Usado:** as três leituras e o `registrarEvento` rodam no mesmo `tx`, depois da trava |
| 06-T04 (engenheiro e revisão) | rota de integração chama `executarComOrcamento` **sem** `t` de fora, com `'padrao'` fora da entrega | **Feito.** A rota não passa `t`, e o orçamento é `'padrao'`. O teste IN-14 segura a trava do DEC em outra conexão e recebe 503 com `MENSAGEM_INDISPONIVEL` depois do `lock_timeout` de 2 s, sem evento. Isso prova que a rota abre a transação com o orçamento |
| 06-T03-testes | o `route.ts` novo entra sozinho nos laços de `matriz-rotas.test.ts`, `matriz-rotas-qa.test.ts` e `matriz-rotas-integracoes-qa.test.ts` (CA-03.3 e CA-03.4 pela rota real) | **Conferido.** A suíte ganhou 7 testes nesses laços sem mudança nos arquivos (5 métodos no de `matriz-rotas.test.ts`, 1 em cada um dos outros dois), todos verdes |
| 06-T11-testes | a entrega continua 200 depois de um `pedido_recebido` e grava `pedido_entregue` só com hash novo; se a T12 decidir outra regra, cabe um caso | **Não mudei a regra.** O RF-14 não pede que o recebimento feche a entrega. Fica como está, e não há caso novo em `entrega-qa.test.ts` |
| 03, seção 8 | os três textos da API do recebimento | **Feito**, por inteiro, em `MENSAGENS_RECEBIMENTO`, com teste que confere cada texto |

### Arquivos

| Arquivo | O que é |
|---|---|
| `src/modules/pedido-construcao/receber.ts` (novo) | `MENSAGENS_RECEBIMENTO`, `recebimentoSchema` e `receberPedido`, com as assinaturas do G7 |
| `src/app/api/pedidos-construcao/[decId]/recebimento/route.ts` (novo) | `POST` com `{ sha256 }` → 204 sem corpo, ação `confirmar_recebimento_pedido`, `params` pela regex do DEC, corpo pelo `recebimentoSchema` |
| `src/app/api/pedidos-construcao/recebimento.test.ts` (novo) | 20 testes, com banco, rotas e token `construir` reais |

Nenhum arquivo rastreado mudou (`git diff --stat` vazio). `src/lib/rota.ts` não mudou: o `decId` de
`EXEMPLO_DO_PARAMETRO` já serve à rota nova. Sem migration, GRANT, pacote, variável de ambiente nem linha de log nova.

### Como `receberPedido` decide

Na transação do orçamento `padrao`, nesta ordem:

1. `autorizar(ator, 'confirmar_recebimento_pedido')`.
2. Trava consultiva `pg_advisory_xact_lock(hashtextextended('pedido:<decId>', 0))`, com a chave por parâmetro (G3.6).
3. Sem `pedido_gerado` de pessoa: o mesmo 404 de DEC inexistente (IN-10).
4. Sem `pedido_entregue`: 409 `naoEntregue`. Com hash que nenhuma entrega gravou: 409 `shaDiferente`.
5. Já recebido com esse hash: sucesso, sem gravar.
6. Grava `pedido_recebido` com `depois = { sha256 }`, o hash da entrega que bateu (IN-12).

O pedido não é remontado (ADR-26). Por isso o DEC substituído, desatualizado ou com a demanda em status final depois da
entrega ainda confirma (RF-14).

### Testes criados (`recebimento.test.ts`, 20)

As requisições são as do `buscar-pedidos.mjs`: `POST`, Bearer, `accept` e `content-type: application/json`, corpo
`{ "sha256": "<hex>" }`, **sem `Origin`**. Cada caso monta o próprio DEC (gerado por pessoa com `gerarPedido` e entregue
pela rota real), com uma autora própria, e olha só os próprios eventos. O arquivo não depende de ordem. O relógio é
fixo e os dados são fictícios: "Carlos Exemplar", "Pessoa Ficticia …" e o prefixo `ficticio` nos eventos do migrator. O
token é gerado em tempo de teste e não aparece em nenhuma mensagem de `expect`. O SHA-256 esperado é calculado no teste,
sobre o texto que a entrega devolveu.

1. A rota só exporta `POST`, com a ação e o padrão certos.
2. `MENSAGENS_RECEBIMENTO` tem os três textos da 03, seção 8.
3. `recebimentoSchema` aceita só `{ sha256 }` com 64 hexadecimais minúsculos. Recusa ausente, curto, maiúsculo, número,
   65 caracteres, com `\n` no fim, chave a mais, `null` e texto solto.
4. CA-14.1: com o SHA do corpo entregue → 204 sem corpo, `no-store`, `nosniff`, sem CORS. Exatamente um
   `pedido_recebido` com `ator_tipo = 'integracao'`, `ator_id = 'construir'`, o prefixo do token, a demanda,
   `entidade = 'pacote_decisao'`, `antes` nulo e `depois = { sha256 }`. O DEC sai de `GET /pendentes`.
5. CA-14.2: 64 hexadecimais diferentes → 409 `shaDiferente`, sem evento, e o DEC continua pendente.
6. CA-14.3: repetir com o SHA certo → 204 e um só `pedido_recebido`. Um SHA errado depois disso continua 409.
7. CA-14.4: pedido gerado e não entregue → 409 `naoEntregue`, sem evento.
8. CA-14.5 e D-04: `{ sha256: 'abc' }`, `{}`, `'A'.repeat(64)`, `1`, `null` e 65 caracteres → 400 com o corpo inteiro
   `{ erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos: [{ campo: 'sha256',
   mensagem: formato }] }`. Vale para um DEC que não existe (400, e não 404) e para um que existe. Nenhum evento.
9. CA-14.5: chave a mais (mesmo com o SHA certo), lista, `null` e corpo que não é JSON → 400 `entrada_invalida`, sem
   evento.
10. 404: o DEC inexistente, o DEC sem `pedido_gerado` e o DEC com `pedido_gerado` de agente (mesmo com um
    `pedido_entregue` gravado) dão o mesmo corpo, byte a byte. Nenhum evento.
11. a 13. RF-14: DEC substituído, desatualizado (ESP mais nova) e demanda `encerrada` depois da entrega → 204 com o SHA
    certo e um `pedido_recebido`.
14. IN-11: três recebimentos ao mesmo tempo → 204 nos três e um só evento.
15. IN-11, determinístico: outra transação segura a trava do DEC e grava o `pedido_recebido`. O pedido espera na trava
    (o teste confere a espera em `pg_locks`), vê o evento quando a trava sai, responde 204 e não grava outro.
16. IN-12: com um hash entregue antes (gravado pelo migrator), confirmar com ele vale, e o hash gravado é esse.
17. IN-14: com a trava do DEC presa por outra conexão → 503 `{ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL }`,
    sem evento. Depois que a trava sai, o pedido passa.
18. G3.10: as linhas de log do 204 e do 409 não levam `decId`, nenhum dos dois hashes, prefixo nem token. São só as
    linhas de `rota()`, com o padrão da rota e `atorTipo: 'integracao'`.
19. `receberPedido` com o ator `awave` lança `sem_permissao`, sem evento.
20. A rota com o token `awave` → 403 com a mensagem de sem permissão, sem evento.

### Teste antes do código

`pnpm --dir … test src/app/api/pedidos-construcao/recebimento.test.ts`, antes de existir `receber.ts` e a rota:
```
 FAIL  src/app/api/pedidos-construcao/recebimento.test.ts [ src/app/api/pedidos-construcao/recebimento.test.ts ]
Error: Cannot find module '../../../modules/pedido-construcao/receber' imported from .../src/app/api/pedidos-construcao/recebimento.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

Depois do código: 19 de 19, com os testes da primeira versão do arquivo.

### Prova de que os testes da trava pegam a falta dela

Troquei a trava por um `select` sem trava, só para conferir, e rodei o arquivo duas vezes:

- **1ª vez, sem o teste 15:** só o IN-14 falhou (`expected 204 to be 503`). O teste das três chamadas simultâneas passou
  mesmo sem trava, porque as chamadas não chegaram a se cruzar. Por isso escrevi o teste 15, que força a ordem.
- **2ª vez, com o teste 15:** o 15 falhou (`expected [ …(2) ] to have a length of 1 but got 2`) e o IN-14 também. Com a
  trava de volta: 20 de 20.

O teste 14 ficou, com um comentário de que ele sozinho não prova a trava.

### Resultado

- `pnpm test src/app/api/pedidos-construcao/recebimento.test.ts`: **20 de 20**.
- `pnpm test` (suíte inteira): **274 de 274 arquivos e 5784 de 5784 testes**, 0 falharam, em 158 s. Na 06-T11-testes
  eram 273 arquivos e 5757 testes. Entraram 1 arquivo e 20 testes meus, mais os 7 dos laços de matriz × rotas, que
  pegaram a rota nova sozinhos.
- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- `pnpm build`: compilou. `/api/pedidos-construcao/[decId]/recebimento` aparece na lista de rotas, e o build não
  alterou arquivo rastreado.
- G4: o `git diff a9fd9b8 --stat` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio.
- IN-16: nenhum teste existente mudou (`git diff --stat` vazio).

### Desvios do plano

1. **`RE_SHA256` vem de `./pendentes`.** O esboço não dizia de onde, e a 06-T11 pediu fonte única.
2. **Sem o `!` do esboço** (`entregues.find(...)!`). O hash do servidor sai de `find`, e `undefined` dá o 409
   `shaDiferente`. O comportamento é o mesmo, sem asserção de não nulo.
3. **Testes além do plano:**
   - o schema isolado;
   - os textos da 03;
   - os cabeçalhos do 204;
   - o SHA errado depois do recebimento;
   - o `null`, os 65 caracteres e o corpo que não é JSON;
   - o 404 com `pedido_entregue` gravado;
   - o IN-11 determinístico;
   - o IN-12 com hash anterior;
   - o 503 do orçamento;
   - o log;
   - o 403 do `awave` no serviço e na rota.

   Todos só reforçam o IN-10, o IN-11, o IN-12 e o IN-14.

## Decisões tomadas

- A trava é consultiva e por DEC (`pedido:<decId>`), como no esboço, e não `travarDemanda`. O recebimento não remonta o
  pedido e não precisa segurar a linha da demanda. Assim também não disputa a trava com a entrega nem com a edição da
  demanda.
- Um recebimento enquanto uma entrega ainda não foi gravada dá 409 `naoEntregue`. O `/construir` só confirma depois de
  receber o 200 da entrega, e a entrega já terminou nesse ponto.
- Recebimento com outro hash que também foi entregue grava outro `pedido_recebido`, um por hash, como o `recebidoComSha`
  da T10. Fica como o plano escreveu.
- O 400 de formato sai de `rota()` antes da função. Por isso não consulta o DEC e não diz se ele existe.
- **Migration:** nenhuma nesta tarefa. A volta da T12 é apagar os três arquivos novos.

## Pendências

- Nenhuma bloqueia a T12.
- Para a `06-T12-testes`:
  - CA-01.5 pela rota: um token `construir` revogado → 401, o outro token continua valendo;
  - RF-01: cookie de sessão junto com o Bearer → 400;
  - RF-09: `http://orquestrador_app`;
  - C-17: `decId` fora da regex → 404 antes de autenticar;
  - C-15 com cookie e sem `Origin`.

  São os mesmos casos que a 06-T11-testes fez para a entrega. Com corpo declarado, `rota()` exige JSON também sem cookie
  (415).
- Para a T13: os fluxos de sentinela do `/construir` já podem incluir o recebimento com SHA certo (204) e errado (409). O
  parecer 4 da 06-T03-revisao (o "nada gravado" de `test/matriz-rotas.test.ts` depende de ordem) continua aberto. A T12
  não tocou o arquivo.
- Para a T19: o `pedido_recebido` agora nasce pela rota, e `recebimentoDoPedido` (T10) dá a data.
- Para a `08-revisao`: a regra "a entrega depois do recebimento continua 200" (06-T11-testes) segue sem decisão
  explícita. O RF-14 não pede outra.
- As caixas `- [ ]` da T12 no plano não foram marcadas, porque a 06 não edita `docs/` (G1). A marcação fica com o
  maestro.
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e achei as entregas com `git log -G`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — HEAD em 0ab191b (06-T11-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G T12 --format=%h%x20%s --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — 06-T03-testes, 06-T04 (construção e revisão), 06-T10 e 06-T11 (as três de cada), P2, 05 e 03
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/recebimento.test.ts` — antes do código: falhou, `Cannot find module '../../../modules/pedido-construcao/receber'`, nenhum teste rodou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/recebimento.test.ts` — depois do código: 19 de 19
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/recebimento.test.ts` — com a trava retirada, para conferir: 18 de 19, só o IN-14 falhou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/recebimento.test.ts` — com o teste 15 e a trava retirada: 18 de 20, o IN-11 determinístico e o IN-14 falharam
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/recebimento.test.ts` — com a trava de volta: 20 de 20
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 274 de 274 arquivos, 5784 de 5784 testes, 0 falharam (em segundo plano; saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só os três arquivos novos da tarefa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio (nenhum arquivo rastreado mudou)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — compilou, com a rota nova na lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o build não alterou arquivo rastreado; só os três arquivos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o `decId` passa por `paramId.versao` antes de tudo; o corpo passa pelo `recebimentoSchema` estrito antes de qualquer consulta; 400, 404, 409 e 503 têm mensagens fixas, sem o hash nem o id)
