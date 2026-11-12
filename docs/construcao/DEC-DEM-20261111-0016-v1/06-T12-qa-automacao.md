---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T12-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 01-analista-requisitos.md (glossário, RF-01, RF-03, RF-13, RF-14, RF-15, RNF), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T12 e T13, linhas 2040 a 2152), 06-T12-engenheiro-backend.md, 06-T12-tech-lead.md, 06-T11-qa-automacao.md, commit cb40601 (git log --stat; arquivos lidos por inteiro com Read), src/modules/pedido-construcao/receber.ts, src/app/api/pedidos-construcao/[decId]/recebimento/route.ts, src/app/api/pedidos-construcao/recebimento.test.ts, src/app/api/pedidos-construcao/entrega-qa.test.ts, src/app/api/pedidos-construcao/entrega.test.ts (linhas 1 a 45), src/modules/integracoes/tempo-limite.ts, src/lib/rota.ts, src/lib/erros.ts, test/requisicao.ts, vitest.config.ts, estruturaAutonoma/ferramentas/construir/lib/buscar-pedidos.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T12 (commit `cb40601`): a confirmação de recebimento pelo `/construir`. O código passa em todos os critérios
da tarefa. Os 20 testes do engenheiro estão corretos. Fechei o Minor 3 da 06-T12-revisao em `recebimento.test.ts`, que
agora exige ver a espera na trava, e acrescentei um arquivo com 8 testes para as lacunas pela rota que a construção e a
revisão listaram.

### Critérios da tarefa e o teste que cobre cada um

`E` = `src/app/api/pedidos-construcao/recebimento.test.ts` (engenheiro). `Q` =
`src/app/api/pedidos-construcao/recebimento-qa.test.ts` (novo, desta etapa).

| Critério | Arquivo | Teste |
|---|---|---|
| CA-14.1: SHA certo → 204 sem corpo; `pedido_recebido` do `construir` com prefixo, demanda, `antes` nulo e `depois = { sha256 }`; o DEC sai de `pendentes` | E | "CA-14.1: o SHA-256 do corpo entregue → 204 sem corpo; …" |
| CA-14.2: 64 hexadecimais diferentes → 409 `shaDiferente`, sem evento, DEC continua pendente | E | "CA-14.2: 64 hexadecimais diferentes → 409 shaDiferente, …" |
| CA-14.3: repetir o SHA certo → 204 e um só `pedido_recebido` | E | "CA-14.3: repetir com o SHA certo → 204 e um só pedido_recebido; …" |
| CA-14.4: gerado e não entregue → 409 `naoEntregue` | E | "CA-14.4: pedido gerado e ainda não entregue → 409 naoEntregue, sem evento" |
| CA-14.5 e D-04: `abc`, ausente e os outros formatos → 400 com o texto da 03 em `campos`, antes de olhar o DEC | E | "CA-14.5 e D-04: sha256 fora do formato ou ausente → 400 …"; "CA-14.5: chave a mais, corpo que não é objeto ou que não é JSON → 400 …"; "recebimentoSchema aceita só { sha256 } …" |
| RF-14 e IN-10: inexistente, sem `pedido_gerado` e `pedido_gerado` de agente → o mesmo 404, byte a byte | E | "404: DEC inexistente, DEC sem pedido_gerado e DEC com pedido_gerado de agente …" |
| RF-14: substituído, desatualizado e demanda em status final depois da entrega → 204 | E | os três "RF-14: …" |
| IN-11: concorrência, um só evento | E | "IN-11: três recebimentos ao mesmo tempo …"; "IN-11: com a trava do DEC presa por outra transação … o pedido espera …" (reforçado, Minor 3) |
| IN-12: o hash gravado é o do servidor, da entrega que bateu | E | "IN-12: o hash gravado é o da entrega que bateu; …" |
| IN-12: o hash é por DEC; um hash entregue de um DEC não confirma outro | Q | "o SHA-256 entregue de um DEC não confirma outro DEC: 409 shaDiferente, sem evento, e os dois continuam pendentes" |
| Regra "um `pedido_recebido` por hash entregue" (decisões da 06-T12-revisao) | Q | "um pedido_recebido por hash entregue: cada hash confirma uma vez, e repetir qualquer um não grava de novo" |
| IN-14: orçamento `padrao`, 503 com mensagem fixa, sem evento | E | "IN-14: a rota abre a transação com o orçamento padrão; …" |
| G3.10 e RNF-04: log sem `decId`, hash, prefixo e token | E | "G3.10: a linha de log do recebimento não leva decId, hash, token nem prefixo" |
| RNF-08: a requisição do `buscar-pedidos.mjs` (POST, Bearer, `accept`, `content-type: application/json`, `{ sha256 }`, sem `Origin`) | E e Q | todos usam essa forma; conferida contra `buscar-pedidos.mjs`, linhas 131 a 135 |
| CA-03.3 (awave): 403 no serviço e na rota | E | "receberPedido com o awave lança sem_permissao, …"; "a rota responde 403 ao token do awave, sem gravar" |
| CA-03.3 e CA-03.4 (agentes e pessoa) | `test/matriz-rotas.test.ts`, `test/matriz-rotas-qa.test.ts`, `test/matriz-rotas-integracoes-qa.test.ts` | os laços pegam a rota nova sozinhos (7 testes, sem mudança nos arquivos) |
| CA-01.5 nesta rota: `construir` revogado → 401, o outro token `construir` segue | Q | "CA-01.5: token construir revogado → 401 com a mensagem de token inválido, sem gravar; o outro token construir segue confirmando" |
| RF-01: cookie de sessão com Bearer → 400 ambíguo | Q | "RF-01: cookie de sessão junto com o Bearer → 400 ambíguo, sem gravar" |
| RF-09: `http://orquestrador_app` | Q | "RF-09: pela rede interna (http://orquestrador_app), o recebimento responde 204 como pelo domínio e grava um pedido_recebido" |
| C-17: `decId` fora da regex → 404 antes de autenticar e antes do Zod | Q | "C-17: decId fora da regex → 404 com o corpo, byte a byte, do DEC inexistente, antes de autenticar e antes do Zod, sem gravar" |
| C-15 com cookie e sem `Origin` (e `Origin` errada, e sem JSON) | Q | "C-15 com cookie: sem Origin → 403; Origin certa e corpo sem JSON → 415; …" |
| C-15 só com Bearer: corpo declarado só em JSON | Q | "C-15 só com Bearer: o corpo declarado continua só em JSON (…415…); application/json com charset passa" |

### Minor 3 da 06-T12-revisao (`recebimento.test.ts`, teste "IN-11: com a trava do DEC presa …")

- O laço guarda `viuEspera`, e o teste afirma `expect(viuEspera).toBe(true)` antes do `commit`. Se o pedido não chegou
  à trava, o teste falha em vez de passar calado.
- O teste também afirma que o pedido ainda não respondeu antes do `commit` (`terminou === false`, marcado por um
  `.finally` na promessa da resposta).
- A consulta a `pg_locks` agora só conta a espera na chave `pedido:<decId>`: `classid` é a metade alta da chave
  `hashtextextended`, `objid` é a metade baixa e `objsubid` vale 1. Antes, qualquer trava consultiva em espera no
  banco contava, inclusive uma do pg-boss.
- O limite de tentativas subiu de 50 para 250 (de 1 s para 5 s no máximo). O laço sai assim que vê a espera. Agora que
  o limite falha o teste, ele precisa de folga para máquina lenta. O `lock_timeout` de 2 s só conta depois que o pedido
  entra na fila, e o `commit` vem cerca de 20 ms depois disso.
- As outras asserções não mudaram. O teste passou de primeira com o filtro novo, e isso também prova que a chave
  calculada bate com a trava de `receber.ts`. Com a chave errada, `viuEspera` ficaria `false`.

### Testes acrescentados

`src/app/api/pedidos-construcao/recebimento-qa.test.ts` (novo, 8 testes). Usa banco real (Testcontainers), rotas reais
e o token `construir` gerado em tempo de teste. A requisição é a do `buscar-pedidos.mjs`. O relógio é o fixo de
`criarDepsDeTeste`. Cada caso monta o próprio DEC, com autora própria, conta eventos de forma relativa e filtra
`pendentes` pelos próprios DEC. Os dados são fictícios: "Carlos Exemplar", "Pessoa Ficticia …", o prefixo `ficticio`
e `outro.exemplo.test`.

1. C-17: oito `decId` fora da regex, entre eles injeção, caixa baixa, prefixo ESP, `/../`, `%`, vazio e versão com 5
   dígitos. Cada um vai com e sem credencial e com `sha256` certo e `abc`. Todos dão 404 com o corpo do inexistente,
   byte a byte, e nenhum evento é gravado.
2. C-15 com cookie:
   - sem `Origin` → 403;
   - `Origin` de outro domínio → 403;
   - `Origin` certa com `text/plain` → 415 `tipo_nao_suportado`.

   Nenhum evento é gravado, e o DEC continua pendente.
3. C-15 só com Bearer:
   - `text/plain` → 415;
   - corpo em bytes sem `content-type` → 415. A requisição é montada à mão, e o teste confere que o cabeçalho está
     ausente.
   - `application/json; charset=utf-8` → 204 e um evento.
4. RF-01: cookie de sessão junto com o Bearer, com `Origin` e JSON certos → 400 `entrada_invalida` com a mensagem de
   ambíguo, sem evento.
5. CA-01.5: um segundo token `construir`, revogado, recebe 401 `token_invalido` com o SHA certo e com o errado, sem
   evento, e o DEC segue pendente. O primeiro token confirma (204).
6. RF-09: o `Request` vai para `http://orquestrador_app/...` com `Host: orquestrador_app` → 204 sem corpo, um
   `pedido_recebido` do `construir`, e o DEC sai de `pendentes`.
7. O SHA-256 entregue do DEC A, enviado ao DEC B → 409 `shaDiferente`, sem evento. Os dois DEC continuam pendentes.
8. Com duas entregas de hashes diferentes (a real e uma gravada pelo migrator), cada hash confirma uma vez (204). Repetir
   os dois dá 204 sem gravar de novo: há exatamente dois `pedido_recebido`, um por hash, na ordem. Um hash nunca
   entregue continua 409.

### Resultado

- `pnpm test` nos dois arquivos do recebimento: 2 arquivos e **28 de 28** (20 do engenheiro, já com o Minor 3, e 8
  novos), na primeira execução.
- `pnpm test` (suíte inteira): **275 de 275 arquivos e 5792 de 5792 testes**, 0 falharam, em 166 s. Na 06-T12-construcao
  eram 274 arquivos e 5784 testes. O arquivo novo soma 1 arquivo e 8 testes.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git status --short`: `M recebimento.test.ts` e `?? recebimento-qa.test.ts`.
- O `git diff` mostra só o trecho do Minor 3 (linhas 366 a 389): o laço com `viuEspera`, o filtro pela chave do DEC e as
  duas asserções novas. Nenhuma asserção saiu nem ficou mais fraca. Não há `.skip`, `.only` nem `.todo`.

### Leitura crítica dos testes do engenheiro

- **Ordem:** cada caso monta o próprio DEC e conta eventos de forma relativa. Não depende de ordem.
- **Relógio:** o relógio é o fixo de `criarDepsDeTeste`. O IN-14 espera o `lock_timeout` real de 2 s do Postgres, que é
  tempo do banco e não do relógio do app. O laço do IN-11 usa `setTimeout` só como intervalo entre consultas, e a
  decisão vem de `pg_locks`, não do tempo.
- **Prova da trava:** o teste das três chamadas simultâneas sozinho não prova a trava, e o arquivo diz isso. O
  determinístico agora prova: ele falha se o pedido não esperar na chave do DEC.
- **Asserção fraca:** só a do Minor 3, já reforçada.

## Decisões tomadas

- Os testes novos ficaram num arquivo novo (`recebimento-qa.test.ts`), como na 06-T11-testes. Assim
  `recebimento.test.ts` só muda no Minor 3 pedido.
- O filtro de `pg_locks` pela chave do DEC fecha o falso positivo de outra trava consultiva em espera no mesmo banco. O
  pg-boss usa travas consultivas.
- O limite do laço subiu para 5 s: com a asserção nova, 1 s numa máquina lenta daria vermelho falso, e teste instável é
  pior que teste ausente.
- Testei a regra "um `pedido_recebido` por hash entregue" porque a 06-T12-revisao a decidiu explicitamente, como o
  plano escreveu.
- Não testei a entrega depois do recebimento. A regra segue sem decisão para a `08-revisao`, como registraram a
  06-T11 e a 06-T12.
- O caso "sem `content-type`" monta o `Request` à mão com corpo em bytes. Com corpo em texto, o próprio `Request` poria
  `text/plain`, e o teste passaria pelo motivo errado.

## Pendências

- Nenhuma bloqueia a T12.
- Para a T13: o Minor 1 da 06-T12-revisao continua aberto (extrair o preparo do DEC para `test/`). O arquivo
  `recebimento-qa.test.ts` é mais uma cópia de `prepararDec`, como o `entrega-qa.test.ts`. Se a T13 criar o ajudante,
  pode trocar o preparo dos quatro arquivos sem mudar asserção. Também continua aberto o parecer 4 da 06-T03-revisao: o
  "nada gravado" de `test/matriz-rotas.test.ts` depende de ordem. Esta etapa não tocou o arquivo.
- Para a `08-revisao`: continua sem decisão a regra "a entrega depois do recebimento continua 200". O Minor 2 da
  06-T12-revisao (a terceira cópia de `naoEncontrado`) também fica para lá.
- Observação para o `/construir` (fora deste repositório): `RE_DEC` do `buscar-pedidos.mjs` aceita `v\d+`, e o
  servidor aceita `v\d{1,4}`. Um DEC com versão de 5 dígitos daria 404 aqui. Não há impacto prático hoje.
- As caixas da T12 no plano ficam com o maestro (G1).
- Glob e Grep não estavam disponíveis nesta sessão. Li tudo com Read, pelos caminhos citados no plano e nas entregas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat -3` — HEAD em 2265916 (06-T12-revisao); cb40601 criou `receber.ts`, `recebimento/route.ts` e `recebimento.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa no início
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/recebimento.test.ts` — 20 de 20, depois do Minor 3
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/recebimento-qa.test.ts src/app/api/pedidos-construcao/recebimento.test.ts` — 2 arquivos, 28 de 28
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 275 de 275 arquivos, 5792 de 5792 testes, 0 falharam (saída longa lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `M recebimento.test.ts`, `?? recebimento-qa.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff` — só o trecho do Minor 3 no teste IN-11 determinístico

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
