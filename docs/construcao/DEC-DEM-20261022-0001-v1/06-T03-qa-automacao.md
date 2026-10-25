---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T03-testes
agente: qa-automacao
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho e G1 a G6 e T01 a T03), 01-analista-requisitos.md (RF-17 a RF-26 e RNF e matriz), 04-seguranca-aplicacao.md (seções 1 e 2 e C-01 a C-20), 05-tech-lead.md (cabeçalho), 06-T03-engenheiro-backend.md, 06-T03-tech-lead.md, 06-T02-qa-automacao.md, git show 1e20426 (--stat), git show HEAD (--stat), src/lib/erros.ts, src/lib/erros.test.ts, src/lib/corpo.ts, src/lib/corpo.test.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testes da T03 (Mapeador único de erro e leitura de corpo com limite, risco baixo). Cobre C-20, a parte de C-17 que
cabe à T03 (413 e Zod sem `input`) e a RNF-16 nas mensagens de erro. O código testado é o do commit `1e20426`. O
`348a133` só regrava a entrega do engenheiro. Todos os testes novos passaram no código como está, e por isso nada volta
para a construção. Só mudaram os dois arquivos de teste da tarefa. Nenhum arquivo de código, configuração ou
dependência foi alterado.

### Critérios da tarefa e os testes que os cobrem

| # | Critério (plano T03, C-20, C-17, RNF-16) | Arquivo | Testes |
|---|---|---|---|
| 1 | `ErroDominio` vira o status do seu código, com a mensagem pt-BR dele (C-20) | `src/lib/erros.test.ts` | `ErroDominio vira o status do código com mensagem pt-BR`; **novo** `ErroDominio %s sai com o status da tabela e o próprio código no corpo` (13 casos, um por código, que ligam a tabela ao `mapearErro` código a código) |
| 2 | `STATUS_DO_CODIGO` tem os 13 códigos da interface (400 401 403 403 404 405 409 413 415 422 429 409 503) | `src/lib/erros.test.ts` | `cada código tem o status da interface`; **novo** o mesmo `it.each` do item 1 |
| 3 | Qualquer outro erro vira 500 genérico, sem a mensagem do Postgres nem a do Drizzle com os parâmetros (C-20) | `src/lib/erros.test.ts` | `erro do Postgres com sentinela vira 500 genérico sem o sentinela`; `erro do Drizzle com a causa do Postgres e os parâmetros vira 500 genérico`; `valor que não é Error (texto, nulo, objeto) vira 500 genérico`; **novos** `objeto que imita ErroDominio (codigo, mensagem, extras) sem ser instância vira 500 genérico` e `ErroDominio só na causa de outro erro não é desembrulhado: vira 500 genérico` |
| 4 | O corpo leva só `erro`, `mensagem` e os extras da interface (`campos`, `faltando`, `erros`) | `src/lib/erros.test.ts` | `o corpo leva só erro, mensagem e os extras preenchidos`; **novo** `sem extras, o corpo tem só erro e mensagem; com os três, nessa ordem e sem chave a mais` |
| 5 | A resposta nunca leva o `input` de issue do Zod (C-20, C-17) | `src/lib/erros.test.ts` | `ZodError vira 400 com campos em pt-BR e sem o valor recebido`; `ZodError cru, sem passar por deZod, também vira 500 genérico sem o valor`; `formato inválido (e-mail, regex) não ecoa o valor`; `chave vinda do cliente no caminho (registro) não vai para o campo`; `chave desconhecida em objeto estrito não ecoa o nome da chave`; **novos** `com reportInput ligado, a issue carrega o valor, mas ele não chega ao corpo (deZod nem ZodError cru)` e `união sem alternativa válida não ecoa o valor nem as issues internas` |
| 6 | `deZod` devolve `entrada_invalida` com campos e mensagens pt-BR (RNF-16) | `src/lib/erros.test.ts` | `deZod devolve entrada_invalida com mensagem geral pt-BR`; `campo ausente é obrigatório; tipo errado é valor inválido`; `texto e lista acima do limite dizem o limite em pt-BR`; `lista vazia pede ao menos um item; número fora do limite diz fora do limite`; `caminho aninhado vira campo com ponto`; `mensagem custom escrita por nós passa; a padrão em inglês vira Valor inválido`; **novos** `texto abaixo de mínimo maior que 1 e número acima do máximo dizem Valor fora do limite`, `mensagem de superRefine escrita por nós passa, com o caminho dado na issue` e `nenhuma mensagem devolvida é a mensagem padrão do Zod em inglês` |
| 7 | `ErroDominio.message` leva só o código, para o log e a pilha não verem a mensagem pt-BR | `src/lib/erros.test.ts` | `ErroDominio não carrega a mensagem pt-BR no message do Error (o log só vê o código)` |
| 8 | Corpo acima de 512 KiB responde 413 antes do parse (C-17) | `src/lib/corpo.test.ts` | `corpo de 600 KB responde 413 antes do parse (C-17)`; `o limite padrão é 512 KiB`; `corpo com exatamente o limite passa; um byte a mais é 413`; `conta bytes, não caracteres: acentos pesam dois bytes`; **novo** `em vários pedaços, a soma exata do limite passa e um byte a mais é 413` |
| 9 | O limite conta os bytes lidos; o Content-Length só serve para recusar cedo (C-17) | `src/lib/corpo.test.ts` | `Content-Length mentiroso não engana: conta os bytes lidos`; `Content-Length declarado acima do limite responde 413 sem ler o corpo`; `fluxo sem fim para de ser lido ao passar do limite`; **novos** `Content-Length inválido (%j) não decide nada: vale a contagem dos bytes` (3 casos: `abc`, `-1` e vazio) e `ao passar do limite, cancela o fluxo do corpo` |
| 10 | JSON inválido vira `entrada_invalida`; JSON válido devolve o valor | `src/lib/corpo.test.ts` | `JSON inválido vira entrada_invalida`; `JSON válido devolve o objeto`; `corpo ausente ou vazio vira entrada_invalida`; `UTF-8 inválido vira entrada_invalida`; `JSON de valor simples (não objeto) é devolvido como está, para o Zod decidir`; **novos** `texto que não é um JSON só (%j) vira entrada_invalida` (6 casos: só espaços, `undefined`, aspas simples, dois JSON seguidos, vírgula final e caractere nulo) e `junta os pedaços na ordem, mesmo com caractere de dois bytes partido entre eles` |
| 11 | As mensagens de 413 e de JSON inválido são pt-BR, não ecoam o corpo e saem pelo mapeador como 413 e 400 (RNF-16, C-20) | `src/lib/corpo.test.ts` | `as mensagens de 413 e de JSON inválido são pt-BR e não ecoam o corpo`; **novos** `a mensagem de 413 diz o limite usado: em bytes abaixo de 1 KB e em KB com milhar pt-BR` e `o erro de 413 e o de JSON inválido são ErroDominio, para o mapeador nunca cair no 500` |

O teste de integração de C-20 (violação de `CHECK` com sentinela respondendo sem o sentinela, pela rota) e o 413 de
600 KB pela rota são da T11 e da T34, como diz a `06-T03-tech-lead.md`. A T03 não cria rota.

### Testes acrescentados (35)

- `src/lib/erros.test.ts`, 21 casos em dois `describe` novos:
  - `mapearErro: casos de borda (C-20)`, 16 casos: o `it.each` dos 13 códigos, a ordem e a ausência de chave a mais
    no corpo, a imitação de `ErroDominio` sem ser instância e o `ErroDominio` só na `cause`.
  - `deZod: casos de borda (C-20, C-17 Zod sem input, RNF-16)`, 5 casos: `reportInput` ligado, união, mínimo de texto
    maior que 1 com número acima do máximo, `superRefine` e nenhuma mensagem padrão do Zod devolvida.
- `src/lib/corpo.test.ts`, 14 casos num `describe` novo, `lerCorpoJson: fluxo em pedaços, cabeçalho inválido e
  mensagens (C-17)`: junção dos pedaços com caractere partido, limite exato em pedaços, cancelamento do fluxo, 3 casos
  de Content-Length inválido, 6 casos de texto que não é um JSON só, mensagem de 413 com limite em bytes e em KB, e
  erros como `ErroDominio`.

### Resultado

- `pnpm test`: 13 arquivos, 154 testes, 154 passaram e 0 falharam. Eram 119 antes, mais os 35 novos. Rodou duas vezes
  na suíte inteira com o mesmo resultado. Os dois arquivos da tarefa, rodados sozinhos, deram 66 de 66.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Conferência com `git diff`

- `src/lib/erros.test.ts` e `src/lib/corpo.test.ts`: só linhas acrescentadas no fim de cada arquivo (`@@ -189,0` e
  `@@ -118,0`). Nenhum teste apagado, nenhuma asserção mudada, nenhum import mudado e nenhum `.skip`, `.only` ou
  `.todo`.

## Decisões tomadas

- O teste com `reportInput` confere primeiro que a issue do Zod de fato traz o sentinela. Sem essa conferência, o teste
  antigo do ZodError cru passa até sem proteção nenhuma, porque o Zod 4 não guarda o `input` por padrão.
- Um caso por código no `it.each`: o teste da tabela compara só a constante, e este liga cada código ao `mapearErro`.
  Assim, trocar o status de um código quebra um teste com o nome do código.
- Fica fixado que um `ErroDominio` só na `cause` vira 500. É a letra de C-20 ("qualquer outro vira 500"). Se a T11
  quiser desembrulhar, precisa mudar o teste de propósito.
- Os fluxos dos testes novos são `ReadableStream` locais com pedaços fixos, sem rede nem temporizador. Nenhum teste lê
  o relógio real, e cada um monta o próprio `Request`. Por isso a ordem não importa.
- Os valores são as sentinelas de `test/sentinelas.ts`, a origem `127.0.0.1:3101` e textos fictícios. Não há dado
  pessoal real, segredo nem valor de `.env`.

## Pendências

- Nenhuma que segure a passagem.
- Minor, para a T11 (`rota()`): `lerCorpoJson` não confere se o corpo já foi lido. Com `bodyUsed`, o `getReader`
  lança `TypeError`, e o mapeador devolve 500, não 400. Não vaza nada, mas a `rota()` deve ler o corpo uma vez só.
- Continuam valendo os Minors 1 a 4 da `06-T03-tech-lead.md` (T13 e T14 em diante) e o Minor do engenheiro para a T11.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`, antes de começar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 1e20426` — 6 arquivos: os 4 de `src/lib/` da T03, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --oneline HEAD~8..HEAD` — commits da T03: `1e20426`, `38396c1`, `348a133` e `8eba0da`; nenhum mexe em código fora dos 4 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 13 arquivos, 119 de 119, antes dos testes novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat HEAD` — `8eba0da`, revisão do tech-lead
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib/erros.test.ts src/lib/corpo.test.ts` — 2 arquivos, 66 de 66
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 13 arquivos, 154 de 154
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 13 arquivos, 154 de 154, segunda rodada, depois de quebrar uma linha longa do teste de `superRefine`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 2 arquivos, 204 linhas acrescentadas e 0 removidas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0` — só linhas acrescentadas, no fim dos dois arquivos de teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — `src/lib/corpo.test.ts` e `src/lib/erros.test.ts` alterados

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
