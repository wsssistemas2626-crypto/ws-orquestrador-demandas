---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T11-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, tarefas.json, padrao-tecnico.md (pela seção "Na construção" do agente), 05-tech-lead.md, parada-P2.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, fim da T10, T11 e T12), 06-T03-tech-lead.md, 06-T03-qa-automacao.md, 06-T04-engenheiro-backend.md, 06-T04-tech-lead.md, 06-T09-engenheiro-backend.md, 06-T09-tech-lead.md, 06-T09-qa-automacao.md, 06-T10-engenheiro-dados-bd.md, 06-T10-tech-lead.md, 06-T10-qa-automacao.md, src/lib/rota.ts, src/modules/pedido-construcao/pendentes.ts, src/modules/pedido-construcao/pendentes.test.ts (linhas 1 a 140), src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/conferir-bordas.test.ts, src/modules/pedido-construcao/gerar.ts, src/modules/integracoes/tempo-limite.ts, src/modules/historico/registrar.ts, src/modules/demandas/servico.ts (linhas 1 a 75), src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/app/api/pacotes-decisao/pedido.test.ts (linhas 1 a 200), src/app/api/demandas/leitura-awave.test.ts (linhas 1 a 90), test/requisicao.ts, test/integracoes.ts, test/deps.ts, test/matriz-rotas.test.ts, test/matriz-rotas-qa.test.ts, test/matriz-rotas-integracoes-qa.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T11: a entrega ao `/construir` e a rota de pendentes (RF-12 rota, RF-13, RF-09 entrega, RNF-08 parte 1, IN-10, IN-12,
IN-14, CA-09.3, CA-12.6, CA-13.1 a CA-13.6, P-02), como pede o plano.

### Conferência antes de começar

A T11 cria `src/modules/pedido-construcao/entregar.ts`, `src/app/api/pedidos-construcao/pendentes/route.ts`,
`src/app/api/pedidos-construcao/[decId]/entrega/route.ts` e `src/app/api/pedidos-construcao/entrega.test.ts`. Os quatro
estão em `src/`, dentro da minha lista Pode. A G5 não manda mudar nenhum teste existente nesta tarefa, e nenhum mudou.
Não houve motivo para devolver ao plano.

### Pendências das entregas 06-T01 a 06-T10 que citam a T11

A busca foi `git log -G T11` na pasta do pedido. Citam a T11 as entregas da T03 (revisão e testes), da T04 (construção e
revisão), da T09 (as três) e da T10 (as três), além do 05, da parada P2 e da 03.

| De onde | O que pede | Como ficou |
|---|---|---|
| 06-T09 (engenheiro e revisão), 06-T10 (engenheiro) | chamar `pedidoGeradoPorPessoa` antes de `conferirEMontarPedido`, na mesma transação que grava o `pedido_entregue`; gravar só se `shasEntregues` não tiver o hash | **Feito** (`entregar.ts`). `shasEntregues` é lido depois de `conferirEMontarPedido`, isto é, sob a trava da demanda. Assim três entregas ao mesmo tempo gravam um só evento (teste próprio) |
| 06-T04 (engenheiro e revisão) | rota de integração chama `executarComOrcamento` **sem** `t` de fora, com `'entrega'` só na T11 | **Feito.** As rotas não passam `t`. `pendentesPara` usa `'padrao'` e `entregarPedido` usa `'entrega'`. O teste IN-14 trava a demanda por outra conexão e recebe 503 com `MENSAGEM_INDISPONIVEL`, sem evento. Isso prova que a rota abre a transação com o orçamento |
| 06-T10-revisao, Minor 1 | exportar `RE_SHA256` de `pendentes.ts` e reexportar em `entregar.ts` | **Feito** (desvio 1 abaixo). Um teste confere que é o mesmo objeto |
| 06-T03-qa-automacao | os `route.ts` novos entram sozinhos nos laços de `matriz-rotas.test.ts`, `matriz-rotas-qa.test.ts` e `matriz-rotas-integracoes-qa.test.ts` (CA-03.3 e CA-03.4 pela rota real) | **Conferido.** A suíte ganhou 14 testes nesses três arquivos sem mudança neles: 10 no laço de `matriz-rotas.test.ts` (2 arquivos × 5 métodos), 2 em `matriz-rotas-qa.test.ts` e 2 em `matriz-rotas-integracoes-qa.test.ts`, todos verdes |
| 06-T03-revisao, parecer 4 | quem tocar `test/matriz-rotas.test.ts` (T11 ou T13) tira a dependência de ordem do "nada gravado" | **Não se aplicou**: a T11 não precisou tocar o arquivo. A 06-T03-testes já cobre a prova sem ordem em `matriz-rotas-integracoes-qa.test.ts`. Fica com a T13 (Pendências) |
| 06-T09-qa e 06-T10-qa | casos pela rota para a `06-T11-testes` (CA-13.4 e CA-13.3 depois da geração; DEC devolvido e recebido sobre a entidade `demanda`) | CA-13.3 (os três) e CA-13.4 já estão no meu teste, pela rota. O DEC devolvido e o recebido sobre `demanda` ficam para a `06-T11-testes`, como pedido |
| P-02 (Fabiano) | `pedido_entregue` uma vez por hash; DEC com entrega recusada continua em `pendentes` | **Coberto:** um teste por hash (com outro hash já gravado, grava o de agora uma vez); entregar de novo não grava; o CA-13.4 confere que o DEC recusado continua na lista; a entrega bem-sucedida também não tira o DEC da lista |
| P-03 (Fabiano) | pedidos antigos entram na primeira busca, sem corte por data | Já está em `listarPendentes` (T10, com teste de outubro). A T11 não acrescenta filtro de data: `pendentesPara` só repassa a lista |

### Arquivos

| Arquivo | O que é |
|---|---|
| `src/modules/pedido-construcao/entregar.ts` (novo) | `RE_SHA256` (reexportado), `sha256DoPedido`, `pendentesPara`, `entregarPedido`, com as assinaturas do G7 |
| `src/app/api/pedidos-construcao/pendentes/route.ts` (novo) | `GET` → `{ itens: [{ decId }] }`, ação `listar_pedidos_pendentes` |
| `src/app/api/pedidos-construcao/[decId]/entrega/route.ts` (novo) | `POST` sem corpo → os bytes da geração, `content-type: application/json; charset=utf-8`, ação `entregar_pedido`, `params` pela regex do DEC |
| `src/app/api/pedidos-construcao/entrega.test.ts` (novo) | 20 testes, banco, rotas e token `construir` reais |
| `src/modules/pedido-construcao/pendentes.ts` (alterado, 1 linha) | `const RE_SHA256` passa a `export const RE_SHA256`, com um comentário. A regex não mudou (desvio 1) |

Nenhum teste existente foi tocado. `src/lib/rota.ts` não mudou: o `decId` de `EXEMPLO_DO_PARAMETRO` já serve às rotas novas.
Sem migration, GRANT, pacote, variável de ambiente nem linha de log nova.

### Testes criados (`entrega.test.ts`, 20)

As requisições são as do `buscar-pedidos.mjs`: Bearer, `accept: application/json`, **sem `Origin`**, e na entrega
`POST` **sem corpo e sem `content-type`**. Cada caso monta o próprio DEC, com uma autora própria (C-36), e olha só os
próprios eventos. O arquivo não depende de ordem. O relógio é fixo e os dados são fictícios: "Carlos Exemplar", "Joana
Ficticia", "Pessoa Ficticia …", prefixo `ficticio` nos eventos do migrator. O token é gerado em tempo de teste e não
aparece em nenhuma mensagem de `expect`.

1. As duas rotas: só `GET` e só `POST`, com a ação e o padrão certos.
2. `RE_SHA256` de `entregar.ts` é o mesmo objeto de `pendentes.ts`.
3. `sha256DoPedido`: hexadecimal minúsculo dos bytes UTF-8 (vetor do texto vazio e texto com acento).
4. CA-12.6 e RF-12: `GET /pendentes` → 200, só a chave `itens`, cada item só com `decId`, contém o DEC gerado, cabeçalhos
   de JSON, `no-store` e `nosniff`, e a contagem de `evento` não muda.
5. IN-10 na lista: DEC sem `pedido_gerado` e DEC com `pedido_gerado` de agente ficam fora.
6. P-02: a entrega não tira o DEC da lista.
7. CA-09.3 e CA-13.1: `POST /entrega` → 200, `application/json; charset=utf-8`, `nosniff`, `no-store`, sem CORS e sem
   `content-disposition`. O corpo é igual, byte a byte, ao `json` de `gerarPedido`, e o SHA-256 é o mesmo.
8. CA-13.6: `validarPedido` de `src/vendor/construir/pedido.mjs` aceita o corpo, e `pedido` é o `decId`.
9. CA-13.5 e IN-12: exatamente um `pedido_entregue` com `ator_tipo = 'integracao'`, `ator_id = 'construir'`, o prefixo
   do token, `entidade = 'pacote_decisao'`, a `demanda_id`, `antes` nulo e `depois = { sha256 }` igual ao SHA-256 do
   corpo, calculado no teste. A segunda entrega devolve os mesmos bytes e não grava outro evento.
10. P-02, um evento por hash: com um `pedido_entregue` de outro hash já gravado, duas entregas gravam o hash de agora
    uma vez só (`[outro, este]`).
11. Três entregas ao mesmo tempo: 200 nas três, os mesmos bytes e um só `pedido_entregue`.
12. CA-13.2: DEC inexistente → 404. DEC sem `pedido_gerado` e DEC com `pedido_gerado` de agente → 404 com o mesmo corpo,
    byte a byte, do inexistente, e nenhum evento.
13. a 15. CA-13.3 depois da geração: substituído → 409 `substituido(v2)`; ESP mais nova → 409 `desatualizado`; demanda
    `encerrada` → 409 `demandaFinal`. Nenhum evento em cada um.
16. CA-13.4: o solicitante renomeado para o nome que está no título → 422 `{ erro, mensagem: naoPassou, erros:
    ['demanda.titulo: nome'] }`, sem "joana" nem "ficticia" no corpo, sem evento. O DEC continua em `pendentes` (P-02).
17. IN-14: com a linha da demanda travada por outra conexão, a entrega → 503 `{ erro: 'indisponivel', mensagem:
    MENSAGEM_INDISPONIVEL }` depois do `lock_timeout` de 2 s, sem evento. Solta a trava, a entrega passa.
18. G3.10: as linhas de log da entrega e da lista não levam `decId`, hash, prefixo nem token. São só as duas linhas de
    `rota()`, com o padrão da rota e `atorTipo: 'integracao'`.
19. `pendentesPara` e `entregarPedido` com o ator `awave` lançam `sem_permissao`, sem evento.
20. As duas rotas com o token `awave` → 403 com a mensagem de sem permissão, sem evento.

### Teste antes do código

`pnpm --dir … test src/app/api/pedidos-construcao/entrega.test.ts`, antes de existir `entregar.ts` e as rotas:
```
 FAIL  src/app/api/pedidos-construcao/entrega.test.ts [ src/app/api/pedidos-construcao/entrega.test.ts ]
Error: Cannot find module '../../../modules/pedido-construcao/entregar' imported from .../src/app/api/pedidos-construcao/entrega.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

### Resultado

- `pnpm test src/app/api/pedidos-construcao/entrega.test.ts`: **20 de 20**, na primeira execução depois do código.
- `pnpm test` (suíte inteira): **272 de 272 arquivos e 5746 de 5746 testes**, 0 falharam, em 151 s. Na 06-T10-testes
  eram 271 arquivos e 5712 testes. Entraram 1 arquivo e 20 testes meus, mais os 14 dos laços de matriz × rotas, que
  pegaram as duas rotas novas sozinhos.
- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- `pnpm build`: compilou. As rotas `/api/pedidos-construcao/[decId]/entrega` e `/api/pedidos-construcao/pendentes`
  aparecem na lista, e o build não alterou arquivo rastreado.
- G4: o `git diff a9fd9b8 --stat` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio.
- IN-16: nenhum teste existente mudou. `git diff --stat` mostra só `pendentes.ts` (2 linhas a mais, 1 a menos).

### Desvios do plano

1. **`RE_SHA256` mora em `pendentes.ts` e `entregar.ts` o reexporta** (`export { RE_SHA256 }`), em vez de declarar a
   regex de novo como no esboço do passo 3. Foi o que a 06-T10-revisao pediu no Minor 1: um formato de hash só, para que
   `shasEntregues` e a entrega nunca discordem. O caminho inverso daria import circular. O contrato do G7 não muda:
   `entregar.ts` continua exportando `RE_SHA256`. Isso mudou uma linha de um arquivo fora da lista da T11
   (`pendentes.ts`), sem mudança de comportamento.
2. **Testes além do texto do plano:** `sha256DoPedido` com vetor conhecido, a reexportação, a lista sem o DEC de agente
   e sem o não gerado, a entrega que não tira da lista, um evento por hash com outro hash já gravado, as entregas ao
   mesmo tempo, o 503 do orçamento (IN-14), o log (G3.10) e o 403 pela rota ao `awave`. Eles só reforçam o IN-10, o
   IN-12, o IN-14 e o P-02.

## Decisões tomadas

- `shasEntregues` é lido **depois** de `conferirEMontarPedido`, como no esboço, e não antes. A trava `FOR UPDATE` da
  demanda, que a conferência toma, põe em fila as entregas ao mesmo tempo. Assim a leitura dos hashes e a gravação ficam
  na mesma seção crítica, e o P-02 vale também sob concorrência. Não foi preciso trava consultiva própria.
- O 404 sem `pedido_gerado` de pessoa usa o mesmo `ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO)` do DEC
  inexistente. O teste compara os corpos byte a byte, então não há oráculo de existência (IN-10).
- A rota de entrega não declara `corpo`. O `/construir` manda `POST` sem corpo e sem `content-type`, e a `rota()` só
  exige JSON quando há corpo declarado. Um corpo enviado mesmo assim é ignorado e nunca lido.
- O `throw new Error` do hash fora do formato fica como no plano. É inalcançável (o hash sai de `createHash`) e vira 500
  genérico, que é a falha fechada.
- **Migration:** nenhuma nesta tarefa. A volta da T11 é apagar os quatro arquivos novos e devolver o `export` de
  `RE_SHA256` em `pendentes.ts` a `const`.

## Pendências

- Nenhuma bloqueia a T11.
- Para a `06-T11-testes`: os casos que a 06-T10-qa pediu pela rota `GET /pendentes`, isto é, o DEC devolvido com
  `pedido_gerado` de pessoa (fora) e o recebido sobre a entidade `demanda` (continua).
- Para a T12 (`receber.ts`): importar `RE_SHA256` de `./entregar` ou de `./pendentes`, nunca declarar outra regex.
  `shasEntregues` devolve os hashes gravados por esta entrega.
- Para a T13 ou quem tocar `test/matriz-rotas.test.ts`: segue em aberto o parecer 4 da 06-T03-revisao (o "nada gravado"
  depende de ordem). A T11 não tocou o arquivo.
- Para a `09-entrega`: o teste IN-14 confirma o orçamento `entrega` (lock de 2 s). O `statement_timeout` de 10 s da
  entrega só se mede com volume real, junto do RNF-02.
- As caixas `- [ ]` da T11 no plano não foram marcadas, porque a 06 não edita `docs/` (G1). A marcação fica com o
  maestro.
- Glob e Grep não estavam disponíveis nesta sessão. Li com Read e achei os arquivos com `git log` (`-G`, `-S`,
  `--diff-filter=A`, `--name-only`).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, árvore limpa no início
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — HEAD em 2976f8d (06-T10-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --oneline -40 -- docs/construcao/DEC-DEM-20261111-0016-v1` — as entregas 06-T02 a 06-T10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G T11 --format=%h%x20%s --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — T03 (revisão e testes), T04 (construção e revisão), T09 e T10 (as três de cada), 05, P2 e 03
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --format= --name-only -- src/modules/pedido-construcao src/app/api src/lib src/vendor test` — os arquivos dos módulos e dos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -1 --format=%h -S "export type DepsDemanda" -- src/modules/demandas/servico.ts` — def1fa7
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/entrega.test.ts` — antes do código: falhou, `Cannot find module '../../../modules/pedido-construcao/entregar'`, nenhum teste rodou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/app/api/pedidos-construcao/entrega.test.ts` — depois do código: 20 de 20
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 272 de 272 arquivos, 5746 de 5746 testes, 0 falharam (rodado em segundo plano; saída lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `pendentes.ts` alterado; `entregar.ts` e `src/app/api/pedidos-construcao/` novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `pendentes.ts`, 2 linhas a mais e 1 a menos
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — compilou, com as duas rotas novas na lista
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — o build não alterou arquivo rastreado; só os da tarefa e esta entrega

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa (mais uma linha de `pendentes.ts`, pedida pela 06-T10-revisao; desvio 1)
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (o `decId` passa por `paramId.versao` antes de tudo; a entrega não tem corpo e a lista não tem query; 404, 409, 422 e 503 com mensagens fixas, e o 422 só com caminho e tipo, sem o valor)
