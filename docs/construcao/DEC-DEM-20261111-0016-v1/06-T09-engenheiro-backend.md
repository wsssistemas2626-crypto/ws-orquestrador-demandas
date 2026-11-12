---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T09-construcao
agente: engenheiro-backend
leu: [contrato-passagem.md, pedido.json, tarefas.json, padrao-tecnico.md, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (G1 a G8, fim da T08, T09, início da T10), 06-T08-engenheiro-backend.md, 06-T08-tech-lead.md, 06-T08-qa-automacao.md, src/modules/pedido-construcao/gerar.ts, src/modules/pedido-construcao/gerar.test.ts (linhas 1 a 848), src/modules/pedido-construcao/gerar-substituido.test.ts (linhas 1 a 140), src/db/transacao.ts, test/banco.ts, vitest.config.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T09: a conferência e a montagem do pedido saem da geração para `conferirEMontarPedido` (ADR-26, RF-13 base, CA-22.2
guarda, IN-10 conferências). A geração e a futura entrega (T11) passam a usar a mesma função, então os bytes são iguais
por construção.

### Pendências das entregas 06-T01 a 06-T08 que citam a T09

Busquei com `git log -G T09` na pasta do pedido. Só o 05, a parada P2 e o `tarefas.json` citam a T09. Entre as 06,
apenas a 06-T08-engenheiro-backend menciona a T09, e só no `leu` ("início da T09"), não nas Pendências. Também li as
Pendências da 06-T08 (construção, revisão e testes). **Nenhuma pendência é endereçada à T09.**

### Arquivos

| Arquivo | O que mudou |
|---|---|
| `src/modules/pedido-construcao/conferir.ts` (novo) | `conferirEMontarPedido(tx: Db, decId): Promise<{ dec: PacoteDecisaoVista; json: string }>` com o corpo que estava em `gerar.ts`, do select do alvo até o `validarPedido`, sem mudar a ordem nem as mensagens. A ordem é: trava da demanda, 404, status final, aprovada, substituído, desatualizado, estudo, montagem só com a ESP e o RSK citados, C-28, nome do solicitante atual e `validarPedido`. A função não autoriza, não pede a confirmação e não grava evento. `MENSAGENS_PEDIDO`, `DADOS_PESSOAIS_DO_PEDIDO`, `TIPO_NOME` e `naoPassou` vieram junto |
| `src/modules/pedido-construcao/gerar.ts` | `gerarPedido` faz `autorizar`, depois a confirmação (422 antes do banco). Na transação, chama `conferirEMontarPedido` e grava o `pedido_gerado` de hoje, com os mesmos campos. Devolve `{ nomeArquivo, json }`. `MENSAGENS_PEDIDO` continua exportado de `gerar.ts` por reexportação. O cabeçalho foi atualizado: 93 linhas, 11 a mais e 82 a menos |
| `src/modules/pedido-construcao/gerar-bytes.test.ts` (novo) | Teste de caracterização, 2 testes |
| `src/modules/pedido-construcao/conferir.test.ts` (novo) | O teste da função nova, 14 testes |

Nenhum outro arquivo mudou. Nenhum teste que já existia foi tocado.

### Testes criados

`gerar-bytes.test.ts`: banco real, um DEC fictício aprovado, montado no `beforeAll`. Todos os campos que saem no pedido
estão preenchidos, com acento, aspas e listas de dois itens. Os testes só leem e geram, então a ordem não importa.
1. O `json` de `gerarPedido` é igual, byte a byte, a `serializarPedido(montarPedido({ dec, esp, rsk }))`, com o DEC, a
   ESP e o RSK lidos por `obterPacoteDecisao`, `obterEspecificacao` e `obterParecerRisco`. Passa no `validarPedido`.
2. Duas gerações do mesmo DEC, por pessoas diferentes e com um dia de diferença, dão o mesmo SHA-256 e os mesmos bytes.
   O SHA-256 fica gravado no próprio teste (`toMatchInlineSnapshot`).

`conferir.test.ts`: banco real, relógio fixo, cada teste num dia próprio.
1. Devolve exatamente `{ dec, json }`. O `json` é o de `gerarPedido` para o mesmo DEC, byte a byte. O `dec` é igual a
   `obterPacoteDecisao` do DEC.
2. Geração antes, conferência depois, em outro dia e depois de editar título e tipo da demanda: os mesmos bytes, duas
   vezes (CA-22.2).
3. Não grava evento: o total da tabela `evento` e os eventos do DEC são os mesmos antes e depois de duas chamadas. Não
   pede confirmação: a função recebe só a transação e o id (`length` 2).
4. Aceita a transação de quem chama, e o rollback não deixa nada.
5. a 14. As recusas. Cada uma é conferida contra a de `gerarPedido` para o mesmo DEC: mesmo código, mesma mensagem e
   mesmos `extras`, e nenhum evento gravado.
   - DEC inexistente → `nao_encontrado` com `MENSAGEM_NAO_ENCONTRADO`.
   - Demanda encerrada → `conflito` com `demandaFinal`. Demanda entregue pelo caminho real → `conflito` com `demandaFinal`.
   - DEC pendente e DEC devolvido → `conflito` com `naoAprovado`.
   - Substituído → `conflito` com `substituido(v2)`, e o v2 monta.
   - Desatualizado (ESP mais nova) → `conflito` com `desatualizado`.
   - Estudo → `nao_processavel` com `estudo`.
   - Nome do solicitante no título → `nao_processavel` com `erros: ['demanda.titulo: nome']`, sem "Joana" nem "Ficticia" na
     mensagem, nos extras ou no `message`.
   - C-28, sentinela de e-mail na ESP → `['especificacao.conteudo: e-mail']`, sem a sentinela.
   - `validarPedido` recusou → `['demanda.descricao vazio']`.

### Teste antes do código

Passo 1, caracterização. Ela nasce verde (exceção declarada no G3.1) e rodou **antes** de qualquer mudança em
`gerar.ts`:

`pnpm --dir … test src/modules/pedido-construcao/gerar-bytes.test.ts`
```
  Snapshots  1 written
 Test Files  1 passed (1)
      Tests  2 passed (2)
```
**SHA-256 antes do refatoramento: `fc020cf0ae2e7f9aaa40e51d81fdd8265c170d2168cbb9f525e4daf9afe69d8d`**. Rodei uma
segunda vez, num banco novo e ainda sem refatorar. Passou sem escrever o snapshot de novo, então o valor é estável entre
execuções.

Passos 2 e 3, o teste da função nova falhando:

`pnpm --dir … test src/modules/pedido-construcao/conferir.test.ts`
```
 FAIL  src/modules/pedido-construcao/conferir.test.ts [ src/modules/pedido-construcao/conferir.test.ts ]
Error: Cannot find module './conferir' imported from .../src/modules/pedido-construcao/conferir.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

Passos 4 e 5, depois do código:
- `pnpm test src/modules/pedido-construcao`: **5 de 5 arquivos, 105 de 105 testes**. São `gerar.test.ts`,
  `gerar-bordas.test.ts` e `gerar-substituido.test.ts`, sem mudança, mais os dois novos. A caracterização passou sem
  reescrever o snapshot: **o SHA-256 depois do refatoramento é o mesmo `fc020cf0…69d8d` do passo 1**. Com o snapshot
  inline já gravado, qualquer diferença teria falhado.
- `pnpm test` (suíte inteira): **268 de 268 arquivos e 5682 de 5682 testes**, 0 falharam, em 148 s. Antes eram 266
  arquivos e 5666 testes, na 06-T08-testes. Entraram 2 arquivos e 16 testes. `pedido.test.ts` e `pedido-bordas.test.ts`
  (rotas) estão verdes sem mudança.
- `pnpm typecheck`: limpo. `pnpm lint`: limpo.
- G4: `git diff a9fd9b8 --stat` das superfícies congeladas, com `src/lib/rota.ts`, saiu vazio.
- IN-16: nenhum teste existente mudou. O `git status` mostra só `gerar.ts` alterado e três arquivos novos.

### Desvios do plano

1. **`MENSAGENS_PEDIDO` mora em `conferir.ts`, e `gerar.ts` o reexporta** (`export { MENSAGENS_PEDIDO }`). O plano
   pede que ele "continua exportado de `gerar.ts`", e continua: quem importa de `gerar.ts` não muda. A razão é que a
   conferência lança as mensagens. Se ela importasse de `gerar.ts`, que importa `conferir.ts`, o import seria circular.
2. **O SHA-256 da caracterização fica no teste**, por `toMatchInlineSnapshot`, além de ir nesta entrega. Assim a
   comparação de "antes e depois" do passo 5 é automática, e não depende de alguém copiar o valor. O pedido fictício é
   determinístico: banco novo por arquivo, relógio fixo e o mesmo id de demanda (conferido em duas execuções).
3. **Testes além do texto do plano** em `conferir.test.ts`: demanda entregue, DEC devolvido, C-28, `validarPedido`, a
   transação de quem chama e a comparação de `extras` com a geração. Eles só reforçam a garantia de que a conferência é
   a mesma da geração.

## Decisões tomadas

- O corpo foi movido sem reescrita: a mesma ordem, os mesmos textos e os mesmos comentários. A única mudança no
  comentário do nome diz onde fica a confirmação, em `gerar.ts`. Assim a revisão compara bloco a bloco e os testes de
  hoje passam sem mudança.
- `conferirEMontarPedido` recebe `tx: Db`, como no G7, e não abre transação própria. A trava `FOR UPDATE` da demanda só
  vale dentro da transação de quem chama, e é ali que a T11 grava o `pedido_entregue`.
- A serialização passou a acontecer antes do `registrarEvento` na geração. Antes vinha depois. O resultado é o mesmo: o
  evento não leva o JSON, e a caracterização prova os mesmos bytes.
- As recusas são comparadas com as da geração no próprio teste, não só com as constantes. Se a geração passar a recusar
  diferente da entrega, o teste quebra.
- Nenhuma linha de log, rota, pacote, variável de ambiente, migration ou GRANT nova. Os dados de teste são fictícios:
  "(fictício)", "Pessoa Ficticia", "Joana Ficticia", `@exemplo.test` e as sentinelas de `test/sentinelas.ts`. Nenhum
  token é gerado.
- Glob e Grep não estavam disponíveis nesta sessão. Li com Read e achei os arquivos com `git log -G`, `git log -S` e
  `git log --diff-filter=A`.

## Pendências

- Nenhuma bloqueia a T09.
- Para a T11 (`entregar.ts`): chamar `conferirEMontarPedido(t.tx, decId)` dentro da transação que grava o
  `pedido_entregue`. A função não autoriza nem confere `pedido_gerado` por pessoa. Isso fica antes, com `autorizar` e
  `pedidoGeradoPorPessoa` (T10). O SHA-256 do `json` devolvido é o mesmo da geração.
- As caixas `- [ ]` da T09 no plano não foram marcadas, porque o G1 não deixa a 06 editar `docs/`. A marcação fica com o
  maestro.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -- docs/construcao/DEC-DEM-20261111-0016-v1` — as passagens e as entregas 06-T01 a 06-T08
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G T09 --format=%h --name-only -- docs/construcao/DEC-DEM-20261111-0016-v1` — só o 05, a parada P2, o `tarefas.json` e a 06-T08-engenheiro-backend (no `leu`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --name-only --format=%h -- src/modules/pedido-construcao` — os arquivos do módulo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S toMatchInlineSnapshot --oneline -- src test` — vazio (padrão novo no repositório; desvio 2)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/gerar-bytes.test.ts` — antes do refatoramento: 2 de 2, snapshot escrito com o SHA-256 `fc020cf0…69d8d`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/gerar-bytes.test.ts` — de novo, ainda antes do refatoramento: 2 de 2, sem escrever snapshot (SHA estável)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/conferir.test.ts` — falhou: `Cannot find module './conferir'`, nenhum teste rodou
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao` — depois do código: 5 arquivos, 105 de 105, com o mesmo SHA-256
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 268 de 268 arquivos, 5682 de 5682 testes, 0 falharam (saída longa lida com Read)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff a9fd9b8 --stat -- src/modules/acesso/resolver-ator.ts src/modules/acesso/exigir-pessoa.ts src/modules/acesso/auth.ts src/proxy.ts src/db/privilegios.ts next.config.ts 'drizzle/000[0-6]_*.sql' 'drizzle/meta/000[0-6]_snapshot.json' src/lib/rota.ts` — vazio (G4)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — `gerar.ts` alterado; `conferir.ts`, `conferir.test.ts` e `gerar-bytes.test.ts` novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — só `gerar.ts`, 11 linhas a mais e 82 a menos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega; a caracterização nasce verde, como o G3.1 declara)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (nenhuma rota, Server Action ou job novo; as recusas mantêm as mensagens fixas e os erros só com caminho e tipo, sem o valor)
