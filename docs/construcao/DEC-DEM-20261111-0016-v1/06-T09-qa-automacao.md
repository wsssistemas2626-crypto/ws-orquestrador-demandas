---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T09-testes
agente: qa-automacao
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 01-analista-requisitos.md (RF-13, RF-14 e glossário), 04-seguranca-aplicacao.md (C09 e IN-10), docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T09, linhas 1838 a 1897), 06-T09-engenheiro-backend.md, 06-T09-tech-lead.md, commit b4b68ef (diff de gerar.ts), src/modules/pedido-construcao/conferir.ts, src/modules/pedido-construcao/conferir.test.ts, src/modules/pedido-construcao/gerar-bytes.test.ts, src/modules/pedido-construcao/gerar-bordas.test.ts, src/modules/pedido-construcao/montar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/versoes.ts, src/modules/demandas/schemas.ts, src/db/schema/demandas.ts (linhas 1 a 60), src/db/transacao.ts, test/banco.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T09 (commit `b4b68ef`): `conferirEMontarPedido` extraída de `gerarPedido`. O código passa em todos os
critérios. Os testes do engenheiro estão corretos e estáveis. Acrescentei um arquivo, com 8 testes, para cobrir o que a
entrega ao `/construir` (T11) vai usar desta função e que ainda não tinha teste.

### Critérios da tarefa e o teste que cobre cada um

A T09 cobre RF-13 (base), ADR-26, CA-22.2 (guarda), IN-10 (conferências) e a pendência 7.2 da spec (SHA antes e
depois). Os critérios que dependem da rota (CA-13.1 por HTTP, CA-13.2 sem `pedido_gerado`, CA-13.5 evento
`pedido_entregue`, CA-13.6 `buscar-pedidos.mjs`) são da T11 e da T10. Aqui estão cobertos só no nível da função.

| Critério | Arquivo | Teste |
|---|---|---|
| ADR-26: a geração e a entrega usam a mesma função; `{ dec, json }`, com `json` igual ao da geração byte a byte | `conferir.test.ts` | "devolve { dec, json }: o json é o de gerarPedido para o mesmo DEC, byte a byte, e o dec é a vista do DEC" |
| CA-22.2 (guarda): o mesmo DEC dá os mesmos bytes, em outro dia e depois de editar a demanda | `conferir.test.ts` | "a geração antes e a conferência depois dão os mesmos bytes, também em outro dia e depois de editar a demanda (CA-22.2)" |
| CA-22.2 sob concorrência: conferências ao mesmo tempo dão os bytes da geração | `conferir-bordas.test.ts` (novo) | "cinco conferências ao mesmo tempo, cada uma na sua transação, dão os bytes da geração e nenhum evento" |
| Spec 7.2: o SHA-256 antes do refatoramento é igual ao de depois | `gerar-bytes.test.ts` | "duas gerações do mesmo DEC, por pessoas e em dias diferentes, têm o mesmo SHA-256, o gravado antes do refatoramento" (`toMatchInlineSnapshot` `fc020cf0…69d8d`) |
| Caracterização: `gerarPedido` = `serializarPedido(montarPedido(...))` | `gerar-bytes.test.ts` | "o JSON de gerarPedido é igual, byte a byte, a serializarPedido(montarPedido(...)) com as consultas de hoje" |
| RF-13: sem autorizar, sem confirmação, sem evento | `conferir.test.ts` | "não grava evento nenhum e não pede a confirmação de dado pessoal (só a transação e o id)" |
| RF-13 / G7: roda na transação de quem chama; o rollback desfaz | `conferir.test.ts` | "aceita a transação de quem chama: dentro dela devolve o pedido, e nada fica gravado depois do rollback" |
| G7 (para a T11): a trava `FOR UPDATE` da demanda dura até o fim da transação de quem chama | `conferir-bordas.test.ts` (novo) | "depois de devolver o pedido, a linha da demanda continua travada até o fim da transação; depois do commit, fica livre" |
| RF-13 / IN-10: DEC inexistente → `nao_encontrado`, igual à geração | `conferir.test.ts` | "DEC que não existe → nao_encontrado com a mensagem de sempre" |
| RF-13 / CA-13.3: status final → `demandaFinal` | `conferir.test.ts` | "demanda em status final (encerrada) → conflito demandaFinal"; "demanda entregue (pelo caminho real) → conflito demandaFinal" |
| CA-13.3 depois de um pedido já gerado (o caso real da entrega) | `conferir-bordas.test.ts` (novo) | "CA-13.3: a demanda vai a encerrada depois do pedido gerado → conflito demandaFinal" |
| RF-13: sem decisão aprovada → `naoAprovado` | `conferir.test.ts` | "sem decisão aprovada (pendente e devolvida) → conflito naoAprovado" |
| CA-13.3: substituído → `substituido(v2)` | `conferir.test.ts` | "substituído por um aprovado mais novo da demanda → conflito substituido(id do mais novo); o mais novo monta" |
| CA-13.3 substituído depois do pedido gerado | `conferir-bordas.test.ts` (novo) | "CA-13.3: um DEC mais novo aprovado depois do pedido gerado → conflito substituido(v2), e o v2 monta" |
| CA-13.3: desatualizado por ESP mais nova | `conferir.test.ts` | "desatualizado (ESP mais nova que a citada) → conflito desatualizado" |
| CA-13.3: desatualizado por RSK mais novo, depois do pedido gerado | `conferir-bordas.test.ts` (novo) | "CA-13.3: um RSK mais novo depois do pedido gerado → conflito desatualizado" |
| RF-13: estudo → `estudo` | `conferir.test.ts` | "estudo → nao_processavel estudo" |
| RF-13 / D1 do 0013: nome do solicitante no título → `demanda.titulo: nome`, sem o valor | `conferir.test.ts` | "nome do solicitante no título copiado → nao_processavel com erros ["demanda.titulo: nome"], sem o valor" |
| CA-13.4 / IN-10: o nome conferido é o atual. O solicitante é renomeado depois do pedido gerado → 422 sem o valor, nenhum evento, `pedido_gerado` continua 1 | `conferir-bordas.test.ts` (novo) | "CA-13.4: o solicitante passa a ter um nome que está no título copiado no DEC → nao_processavel "demanda.titulo: nome", sem o valor" |
| IN-10 / C-28: e-mail | `conferir.test.ts` | "C-28: e-mail na ESP → nao_processavel com o caminho e o tipo, sem o valor" |
| IN-10 / C-28: telefone e CPF; a ordem é a lista do C-28 primeiro e o nome por último | `conferir-bordas.test.ts` (novo) | "telefone na descrição, CPF na definição de pronto e o nome no título → C-28 primeiro, na ordem do pedido, e o nome por último, sem os valores" |
| RF-13: `validarPedido` recusou → erros dele | `conferir.test.ts` | "validarPedido do /construir recusou → nao_processavel com os erros dele" |
| RF-13: o dado pessoal é conferido antes do `validarPedido` | `conferir-bordas.test.ts` (novo) | "dado pessoal é conferido antes do validarPedido: com os dois problemas, só o dado pessoal volta" |
| Passo 5: `gerar.test.ts`, `gerar-bordas.test.ts`, `gerar-substituido.test.ts`, `pedido.test.ts` e `pedido-bordas.test.ts` verdes sem mudança | suíte inteira | `git diff` vazio nos arquivos rastreados, suíte verde |

Cada recusa em `conferir-bordas.test.ts` passa por `recusaIgualAGeracao`. O helper confere que a conferência e a geração
devolvem o mesmo código, a mesma mensagem e os mesmos `extras`, e que o total de eventos não muda.

### Testes acrescentados

`src/modules/pedido-construcao/conferir-bordas.test.ts` (novo, 8 testes). Usa Postgres real pelo papel do app e relógio
fixo, com cada teste num dia próprio e numa demanda própria. As contagens de evento são relativas, então o arquivo não
depende da ordem dos testes. Os dados são fictícios: "Carlos Exemplar", "Joana Ficticia", `@exemplo.test`,
`SENTINELAS.telefone` e o CPF fictício `123.456.789-09`, que já aparece em `gerar-bordas.test.ts`.

1. **Trava da demanda (G7).** Dentro da transação de quem chama, e depois de `conferirEMontarPedido` devolver o pedido,
   outra conexão tenta `select ... for update nowait` na linha da demanda e recebe `55P03`. Depois do commit, a mesma
   tentativa passa. O teste não depende de tempo, porque `nowait` não espera. Ele falharia se a função abrisse uma
   transação própria, e é disso que a T11 depende para gravar o `pedido_entregue` sob a mesma trava.
2. Cinco conferências ao mesmo tempo, cada uma em sua transação, dão os bytes da geração e nenhum evento.
3. **CA-13.4.** O pedido é gerado com o solicitante "Carlos Exemplar". Depois o solicitante é renomeado para o nome que
   está no título copiado no DEC. A conferência recusa com `['demanda.titulo: nome']`, sem "Joana" nem "Ficticia" na
   saída, e o `pedido_gerado` continua 1.
4. a 6. **CA-13.3 depois de um pedido já gerado:** demanda encerrada, RSK mais novo (até aqui só havia o caso da ESP) e
   DEC substituído. Neste último, o v2 monta e os bytes dele diferem dos do v1.
7. **C-28 com telefone e CPF e o nome:** `['demanda.descricao: telefone', 'definicao_de_pronto[1]: CPF',
   'demanda.titulo: nome']`, nesta ordem. Nenhum sentinela, dígito nem nome aparece na saída.
8. O dado pessoal vem antes do `validarPedido`: com os dois problemas, só volta `['especificacao.conteudo: telefone']`.

### Resultado

- `pnpm test src/modules/pedido-construcao/conferir-bordas.test.ts`: 1 arquivo, **8 de 8**.
- `pnpm test` (suíte inteira): **269 de 269 arquivos e 5690 de 5690 testes**, 0 falharam, em 208 s. A 06-T09 tinha 268
  arquivos e 5682 testes; o arquivo novo soma 1 arquivo e 8 testes.
- `pnpm lint`: limpo. `pnpm typecheck`: limpo.
- `git status --short`: só `?? src/modules/pedido-construcao/conferir-bordas.test.ts`. `git diff --stat`: vazio, ou
  seja, nenhum arquivo rastreado mudou.

### Leitura crítica dos testes do engenheiro

- `gerar-bytes.test.ts`: o SHA-256 gravado é estável. O DEC é montado num banco novo por arquivo, com relógio fixo no
  `beforeAll`. `decididaEm` vem de `deps.relogio.agora()` (`decidir.ts:110`), e o `aprovadoEm` do pedido sai dele, sem
  `now()` do banco. Os ids vêm da sequência de um banco novo. O teste 2 avança o relógio compartilhado, mas o teste 1 não
  depende do relógio, porque o pedido não leva data de geração. A ordem não importa.
- `conferir.test.ts`: cada teste usa um dia e uma demanda próprios, e as contagens de evento são relativas. Não tem
  `.only`, `.skip` nem `.todo`.

## Decisões tomadas

- Os testes novos ficaram num arquivo novo, `conferir-bordas.test.ts`, e não em `conferir.test.ts`. Assim nenhum teste
  existente muda e o `git diff` dos rastreados fica vazio (IN-16).
- A trava é testada com `for update nowait` pelo `poolMigrator`, e não com espera e prazo. É determinístico e não
  depende do relógio real nem da velocidade da máquina.
- Os critérios de rota (CA-13.1 por HTTP, CA-13.2, CA-13.5, CA-13.6) não foram testados aqui. A rota e o evento são da
  T11 e da T10, e esta etapa só testa a função extraída.
- O solicitante padrão do arquivo novo é "Carlos Exemplar", e não "Pessoa Ficticia". A conferência do nome pega partes
  do nome, e "Ficticia" casaria com o título "Pedido da Joana Ficticia" antes da troca, o que estragaria o CA-13.4.

## Pendências

- Nenhuma bloqueia a T09.
- Para a `06-T11-testes`: repetir pela rota `POST /api/pedidos-construcao/:decId/entrega` o CA-13.4 (renomear depois da
  geração → 422 sem o valor) e o CA-13.3 depois do pedido gerado. Nesta etapa os dois estão provados só na função.
- Fica valendo o Minor M2 da revisão (`conferirEMontarPedido.length` é uma guarda fraca). A garantia real está no teste
  da trava e nos testes que chamam a função só com a transação e o id.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat b4b68ef2ed2b84741200899ffbeec6aba7e8bef9~1 b4b68ef2ed2b84741200899ffbeec6aba7e8bef9` — 6 arquivos: os 4 de `src/` da T09, a entrega da 06 e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo `construcao/DEC-DEM-20261111-0016-v1`, árvore limpa
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff b4b68ef2ed2b84741200899ffbeec6aba7e8bef9~1 b4b68ef2ed2b84741200899ffbeec6aba7e8bef9 -- src/modules/pedido-construcao/gerar.ts` — o corpo saiu de `gerar.ts` para `conferir.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -S decididaEm --format=%h -- src/modules/pacotes-decisao/decidir.ts` — `3ebf24a` (para achar a origem da data do pedido)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --diff-filter=A --format=%h --name-only -- src/modules/versoes.ts src/modules/versoes src/db/schema/demandas.ts` — `src/modules/versoes.ts` e `src/db/schema/demandas.ts`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao/conferir-bordas.test.ts` — 1 arquivo, 8 de 8
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 269 de 269 arquivos, 5690 de 5690 testes, 0 falharam (saída longa lida com Read)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — só o arquivo novo `conferir-bordas.test.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — vazio (nenhum arquivo rastreado mudou)

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
