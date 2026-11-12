---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T11-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, tarefas.json, 01-analista-requisitos.md (glossário, RF-01 a RF-14), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T11, T12 e T13, linhas 1955 a 2152), 06-T11-engenheiro-backend.md, 06-T11-tech-lead.md, 06-T10-qa-automacao.md, commit dc2ba51 (diff --stat de src e test; arquivos lidos por inteiro com Read), src/modules/pedido-construcao/entregar.ts, src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/pendentes-bordas.test.ts, src/app/api/pedidos-construcao/entrega.test.ts, src/app/api/pedidos-construcao/[decId]/entrega/route.ts, src/lib/rota.ts, src/lib/relogio.ts, src/modules/acesso/resolver-ator.ts, src/modules/acesso/mensagens.ts, src/modules/acesso/tokens-integracao-qa.test.ts (linhas 1 a 80), test/requisicao.ts, test/integracoes.ts, test/deps.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T11 (commit `dc2ba51`): a entrega ao `/construir` e a rota de pendentes. O código passa em todos os
critérios da tarefa. Os 20 testes do engenheiro estão corretos e estáveis. Acrescentei um arquivo com 11 testes para as
lacunas pela rota e fechei os dois Minor da 06-T11-revisao em `entrega.test.ts`, sem afrouxar nada.

### Critérios da tarefa e o teste que cobre cada um

`E` = `src/app/api/pedidos-construcao/entrega.test.ts` (engenheiro); `Q` = `src/app/api/pedidos-construcao/entrega-qa.test.ts` (novo, desta etapa).

| Critério | Arquivo | Teste |
|---|---|---|
| RF-12 e CA-12.6: 200 `{ itens: [{ decId }] }`, só `itens`, cada item só `decId`, sem evento | E | "200 com { itens: [{ decId }] }: só a chave itens, cada item só com decId, e a leitura não grava evento" |
| RF-12: ordem do primeiro `pedido_gerado`, não do id | Q | "RF-12: a ordem é a do primeiro pedido_gerado, não a do id" |
| CA-12.1 e IN-10 na lista: sem `pedido_gerado` e com `pedido_gerado` de agente ficam fora | E | "o DEC aprovado sem pedido_gerado não aparece; o gerado por agente (IN-10) também não" |
| Glossário "pendente" pela rota: v2 devolvido com `pedido_gerado` de pessoa fica fora (pendência da 06-T10-testes) | Q | "v2 devolvido com pedido_gerado de pessoa fica fora da lista e a entrega dele dá 409 naoAprovado, sem evento; o v1 aprovado segue e entrega" |
| CA-12.5 pela rota: recebido sobre o DEC tira; sobre a entidade `demanda` não tira (pendência da 06-T10-testes) | Q | "pedido_recebido sobre a entidade demanda não tira o DEC da lista; sobre o DEC, tira (CA-12.5)" |
| P-02: entrega não tira da lista | E | "a entrega não tira o DEC da lista (P-02): só o recebimento tira, e esse é da T12" |
| CA-09.3 e CA-13.1: 200 sem corpo, sem `content-type` e sem `Origin`; cabeçalhos; bytes e SHA-256 da geração | E | "CA-09.3 e CA-13.1: 200 sem corpo e sem Origin, com os cabeçalhos de JSON, e o SHA-256 do corpo é o da geração" |
| RF-09: nada depende de Host nem de esquema (`http://orquestrador_app`) | Q | "RF-09: pela rede interna (http://orquestrador_app), as duas rotas respondem como pelo domínio" |
| RF-09 e C-15 sem afrouxar na entrega sem corpo (análogo do CA-09.4) | Q | "CA-09.4 na entrega sem corpo: cookie e sem Origin → 403; cookie, Origin certa e sem JSON → 415; nenhum evento" |
| RF-13: corpo enviado é ignorado, os bytes são do DEC do caminho | Q | "corpo mandado mesmo assim é ignorado: JSON com outro decId ou texto puro → 200 com os bytes do DEC do caminho" |
| CA-13.6: `validarPedido` do vendor aceita, `pedido` = `decId` | E | "CA-13.6: o validarPedido do /construir aceita o corpo, e `pedido` é o decId" |
| CA-13.5 e IN-12: um `pedido_entregue` do `construir`, prefixo, demanda, `antes` nulo, `depois = { sha256 }`; repetir não grava | E | "CA-13.5 e IN-12: um pedido_entregue do construir, …" |
| P-02: um evento por hash | E | "P-02: um pedido_entregue por hash; …" |
| P-02 sob concorrência: três entregas, um evento | E | "P-02 sob concorrência: três entregas ao mesmo tempo …" (título corrigido, Minor 2) |
| CA-13.2 e IN-10: 404 com o corpo do inexistente, sem `pedido_gerado` ou com o de agente | E | "CA-13.2: sem pedido_gerado → 404 com o corpo, byte a byte, de um DEC que não existe; …" |
| C-17: `decId` fora da regex → 404 igual ao inexistente, antes de autenticar, sem gravar | Q | "C-17: decId fora da regex → 404 com o corpo, byte a byte, do DEC inexistente, antes de autenticar e sem gravar" |
| CA-13.3: substituído, desatualizado, demanda final → 409, sem evento | E | os três "CA-13.3: …" |
| RF-13, conferência "decisão aprovada": DEC devolvido com `pedido_gerado` de pessoa → 409 `naoAprovado` | Q | o mesmo teste do v2 devolvido acima |
| RF-13, conferência "não é estudo" → 422 `estudo`, sem evento | Q | "demanda do tipo estudo, com pedido_gerado de pessoa gravado → 422 estudo, sem evento" |
| CA-13.4: nome do solicitante no título → 422 `demanda.titulo: nome`, sem o valor, sem evento | E | "CA-13.4: o solicitante renomeado …" |
| RF-13, C-28 na entrega: e-mail no título → 422 com caminho e tipo, sem o valor, sem evento | Q | "C-28: e-mail no título copiado no DEC, com pedido_gerado de pessoa gravado → 422 …" |
| IN-14: orçamento `entrega`, 503 com mensagem fixa, sem evento | E | "IN-14: a rota abre a transação com o orçamento da entrega; …" |
| G3.10 e RNF-04: log sem `decId`, hash, prefixo e token | E | "G3.10: a linha de log da entrega e da lista não leva decId, hash, token nem prefixo" |
| CA-03.3 (awave): 403 no serviço e na rota | E | "pendentesPara e entregarPedido com o awave lançam sem_permissao, …"; "as duas rotas respondem 403 ao token do awave, sem gravar" |
| CA-03.3 e CA-03.4 (agentes e pessoa) | `test/matriz-rotas.test.ts`, `test/matriz-rotas-qa.test.ts`, `test/matriz-rotas-integracoes-qa.test.ts` | os laços pegam as duas rotas novas sozinhos (14 testes, sem mudança nos arquivos) |
| CA-01.5 pela rota: `construir` revogado → 401, o outro token `construir` segue valendo | Q | "CA-01.5: token construir revogado → 401 com a mensagem de token inválido nas duas rotas, sem gravar; …" |
| RF-01: cookie de sessão com Bearer → 400 ambíguo nas duas rotas | Q | "RF-01: cookie de sessão junto com o Bearer → 400 ambíguo nas duas rotas, sem gravar" |
| `sha256DoPedido`: hexadecimal minúsculo dos bytes UTF-8 | E | "sha256DoPedido é o SHA-256 em hexadecimal minúsculo dos bytes UTF-8 do texto" (oráculo trocado, Minor 1) |

### Testes acrescentados

`src/app/api/pedidos-construcao/entrega-qa.test.ts` (novo, 11 testes). Banco real (Testcontainers), rotas reais, token
`construir` gerado em tempo de teste, requisição como a do `buscar-pedidos.mjs` (Bearer, `accept`, sem `Origin`). Usa
relógio fixo próprio. Cada caso monta os próprios DEC com uma autora própria, conta eventos de forma relativa e filtra a
lista pelos próprios DEC. Por isso não depende de ordem. Os dados são fictícios: "Carlos Exemplar",
`contato.ficticio@exemplo.test` e prefixo `ficticio` nos eventos do migrator.

1. v2 devolvido com `pedido_gerado` de pessoa: a lista é exatamente `[v1]`, a entrega do v2 dá 409 `naoAprovado` sem
   evento, e o v1 continua entregando os bytes da geração.
2. Recebido sobre a entidade `demanda` não tira o DEC da lista. Recebido sobre o DEC tira (CA-12.5 pela rota).
3. Ordem: o DEC de id maior gera primeiro e o de id menor gera 1 minuto depois. A lista vem `[id maior, id menor]`, o
   que só passa se a ordem for por `pedido_gerado` e não pelo desempate do id.
4. Estudo com `pedido_gerado` de pessoa gravado → 422 `estudo`, sem evento.
5. E-mail no título copiado no DEC → 422 com `demanda.titulo: e-mail`, sem o endereço no corpo, sem evento.
6. C-17: sete `decId` fora da regex (injeção, caixa baixa, prefixo ESP, sem `DEC-`, `/../`, `%`, vazio), com e sem
   credencial → 404 com o corpo, byte a byte, do DEC inexistente, e nenhum evento.
7. C-15 na entrega sem corpo: com cookie e sem `Origin` → 403; com cookie, `Origin` certa e sem JSON → 415.
8. Cookie de sessão junto com o Bearer → 400 `entrada_invalida` com a mensagem de ambíguo, nas duas rotas.
9. Corpo enviado mesmo assim (JSON com outro `decId`, ou `text/plain`) → 200 com os bytes do DEC do caminho.
10. CA-01.5: um segundo token `construir`, depois de revogado, recebe 401 `token_invalido` nas duas rotas, sem
    evento. O primeiro token continua entregando.
11. RF-09: `Request` para `http://orquestrador_app/...` com `Host: orquestrador_app` → 200 nas duas rotas, com os
    bytes da geração.

`src/app/api/pedidos-construcao/entrega.test.ts` (Minor da 06-T11-revisao, sem afrouxar):

- **Minor 1** (linha 197): saiu `sha256DoPedido('ação') === sha('ação')`, que era tautológico. Entraram três
  asserções:
  - o vetor fixo do FIPS 180-2 para `abc`;
  - o SHA-256 dos bytes UTF-8 escritos à mão (`61 c3 a7 c3 a3 6f`), que não passa pela codificação de texto da função;
  - a garantia de que o resultado é diferente do SHA-256 em latin1.

  A asserção ficou mais forte.
- **Minor 2** (linha 283): o título "IN-11 na entrega" passou a "P-02 sob concorrência". O corpo do teste não mudou.

### Resultado

- `pnpm test` nos dois arquivos: 2 arquivos e **31 de 31** (11 novos e 20 do engenheiro), na primeira execução.
- `pnpm test` (suíte inteira): **273 de 273 arquivos e 5757 de 5757 testes**, 0 falharam, em 167 s. Na 06-T11-construcao
  eram 272 arquivos e 5746 testes; o arquivo novo soma 1 arquivo e 11 testes.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git status --short`: `M entrega.test.ts` e `?? entrega-qa.test.ts`. O `git diff` mostra só as duas trocas dos Minor:
  5 linhas a mais e 1 a menos no oráculo, e o título trocado. Nada foi apagado, marcado com `.skip`, `.only` ou
  `.todo`, nem afrouxado.
- O commit `dc2ba51`, em `src/` e `test/`, criou 4 arquivos e mudou 1 linha de `pendentes.ts`. Nenhum teste existente
  mudou.

### Leitura crítica dos testes do engenheiro

- **Ordem:** cada caso monta o próprio DEC e conta eventos de forma relativa. O CA-12.6 percorre a lista inteira, mas
  a asserção vale para qualquer item. Não depende de ordem.
- **Relógio:** o relógio é o fixo de `criarDepsDeTeste`. O teste IN-14 espera o `lock_timeout` real de 2 s do Postgres,
  que é tempo do banco e não do relógio do app. É estável: rodou verde na suíte inteira e no arquivo isolado.
- **Concorrência:** o teste das três entregas falharia se `shasEntregues` fosse lido antes da trava. Está correto.
- **Asserção fraca:** só a do Minor 1, já trocada.

## Decisões tomadas

- Os testes novos ficaram num arquivo novo (`entrega-qa.test.ts`). Assim `entrega.test.ts` só muda nos dois Minor
  pedidos.
- Os casos de estudo, de e-mail e do v2 devolvido gravam o `pedido_gerado` de pessoa pelo migrator. O caminho real
  (`gerarPedido`) recusa esses DEC, e o que se testa é que a entrega refaz a conferência mesmo com o evento gravado.
- O oráculo do Minor 1 usa bytes escritos à mão e um vetor do FIPS 180-2, e não um hash calculado pela própria
  implementação. Assim pega uma troca de codificação feita igual nos dois lados.
- O RF-09 com `http://orquestrador_app` monta o `Request` à mão. `chamarRota` fixa `URL_BASE`, e o teste confere que a
  base é outra, para não passar pelo motivo errado.
- Não testei a entrega depois do `pedido_recebido`. O RF-13 e o RF-14 não dizem o que acontece, e um teste fixaria um
  comportamento que a T12 ou a `08-revisao` podem querer decidir.

## Pendências

- Nenhuma bloqueia a T11.
- Para a T12: a entrega continua 200 depois de um `pedido_recebido` e grava `pedido_entregue` só se o hash for novo. Se a
  T12 ou a `08-revisao` decidirem outra regra, cabe um caso em `entrega-qa.test.ts`.
- Para a T13: continua aberto o parecer 4 da 06-T03-revisao (o "nada gravado" de `test/matriz-rotas.test.ts` depende
  de ordem). Esta etapa não tocou o arquivo.
- As caixas da T11 no plano ficam com o maestro (G1).
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read e achei os arquivos pelos caminhos citados no plano
  e nas entregas, e por `git log -S`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — HEAD em d94e8c5 (06-T11-revisao), dc2ba51 é a construção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h --name-only -S CA-01.5 -- src test` — vazio: nenhum teste citava o CA-01.5
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --format=%h --name-only -S revogarTokenServico -- src test` — os testes que já revogam token, nenhum pelas rotas do /construir
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/entrega-qa.test.ts src/app/api/pedidos-construcao/entrega.test.ts` — 2 arquivos, 31 de 31
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 273 de 273 arquivos, 5757 de 5757 testes, 0 falharam (saída longa lida com Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `M entrega.test.ts`, `?? entrega-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só o oráculo do Minor 1 e o título do Minor 2
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat dc2ba51e413bcbdb2f8e3ea7ca8ed068bbdbc799~1 dc2ba51e413bcbdb2f8e3ea7ca8ed068bbdbc799 -- src test` — 5 arquivos: 4 novos e `pendentes.ts` (+2 −1)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
