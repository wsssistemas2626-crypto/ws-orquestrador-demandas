---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T03-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T01 a T04), 04-seguranca-aplicacao.md (linhas de C-17 e C-20), test/sentinelas.ts, src/lib/reduzir-erro.ts, src/lib/log.test.ts, package.json, tsconfig.json, .prettierrc]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T03 do plano: mapeador único de erro e leitura de corpo JSON com limite (C-20, parte de C-17, RNF-16).

### Arquivos criados (só os quatro da tarefa)

- `src/lib/erros.ts`: `STATUS_DO_CODIGO`, `CodigoErro`, `CampoInvalido`, `CorpoErro`, `ErroDominio`, `deZod`,
  `mapearErro`, com a interface do plano. Exporta também `ExtrasErro` e `MENSAGEM_ERRO_INTERNO`.
- `src/lib/erros.test.ts`: 18 testes.
- `src/lib/corpo.ts`: `lerCorpoJson(req, limiteBytes = 512 KiB)`, mais a constante `LIMITE_CORPO_PADRAO`.
- `src/lib/corpo.test.ts`: 13 testes.

### Testes criados

- `erros.test.ts`: os 3 casos do plano (ErroDominio com status e mensagem pt-BR; erro do Postgres com sentinela vira
  500 genérico sem sentinela nem nome de tabela; ZodError vira 400 com campos pt-BR sem o valor), mais: tabela
  completa de `STATUS_DO_CODIGO`; erro do Drizzle com causa e parâmetros vira 500; ZodError cru, sem `deZod`, vira 500;
  valor que não é Error vira 500; corpo leva só `erro`, `mensagem` e os extras preenchidos (chave estranha nos extras
  fica de fora); `ErroDominio.message` é só o código. Em `deZod`: ausente x tipo errado; limite de texto
  ("Este campo aceita até 10.000 caracteres.") e de lista; lista vazia e número fora do limite; caminho aninhado com
  ponto; mensagem custom nossa passa e a padrão em inglês vira "Valor inválido."; formato de e-mail e regex sem eco do
  valor; chave de registro vinda do cliente vira `*`; chave desconhecida de objeto estrito não ecoa o nome; mensagem
  geral de `entrada_invalida`.
- `corpo.test.ts`: os 4 casos do plano (600 KB dá 413; Content-Length mentiroso não engana; JSON inválido; JSON
  válido), mais: limite padrão 512 KiB; exatamente no limite passa e um byte a mais dá 413; conta bytes e não
  caracteres; Content-Length declarado acima do limite dá 413 sem puxar nenhum pedaço do corpo; fluxo sem fim para de
  ser lido ao passar do limite; corpo ausente ou vazio; UTF-8 inválido; mensagens pt-BR de 413 e de JSON inválido sem
  eco do corpo; JSON de lista ou `null` devolvido como está, para o Zod decidir.

### TDD: falha vista antes do código

`pnpm test` com os dois testes escritos e sem `erros.ts` nem `corpo.ts`:

```
 FAIL  src/lib/corpo.test.ts [ src/lib/corpo.test.ts ]
Error: Cannot find module './erros' imported from .../src/lib/corpo.test.ts
 FAIL  src/lib/erros.test.ts [ src/lib/erros.test.ts ]
Error: Cannot find module './erros' imported from .../src/lib/erros.test.ts
 Test Files  2 failed | 11 passed (13)
      Tests  88 passed (88)
```

Depois do código: `Test Files 13 passed (13)`, `Tests 119 passed (119)` (88 anteriores + 31 novos), 0 falhas.

### Desvios do plano

- `deZod` não depende de `i.input` para saber se o campo está ausente: no Zod 4 a issue final só traz `input` com
  `reportInput`, então `i.input === undefined` seria sempre verdadeiro e todo tipo errado viraria "Campo obrigatório.".
  Usa `input` quando existe e, sem ele, o fim da mensagem padrão (`received undefined`), só para decidir; a mensagem do
  Zod nunca é devolvida. O teste "campo ausente é obrigatório; tipo errado é valor inválido" cobre os dois.
- Mensagem `custom` padrão do Zod em inglês ("Invalid input", de `refine` sem mensagem) vira "Valor inválido." (RNF-16);
  o plano devolvia qualquer mensagem custom.
- O campo do caminho só leva segmento de schema (índice ou identificador); chave de `z.record` vinda do cliente vira
  `*`, porque o caminho pode carregar valor recebido (C-20). O plano fazia `path.join('.')`.
- `mapearErro` copia só `campos`, `faltando` e `erros` dos extras, em vez de espalhar o objeto todo.
- `lerCorpoJson` também recusa cedo pelo Content-Length declarado acima do limite (sem ler o corpo), além de contar os
  bytes lidos; decodifica UTF-8 com `fatal: true` (UTF-8 inválido vira `entrada_invalida`). A mensagem de 413 é montada
  do limite ("512 KB" no padrão).
- Exportações a mais, sem mudar as do plano: `ExtrasErro`, `MENSAGEM_ERRO_INTERNO`, `LIMITE_CORPO_PADRAO`.

## Decisões tomadas

- `ErroDominio.message` é o código, não a mensagem pt-BR: a mensagem pode citar dado da demanda e a pilha leva o `message`.
- `mapearErro` é puro e não loga: o log do 500 fica com `rota()` da T11, que já tem `log` e `reduzirErro`.
- ZodError que chegar cru ao mapeador vira 500, não 400: só `deZod` produz 400, para o `input` nunca escapar por engano.
- Limite de chave segura do caminho igual ao do nome de classe da T02 (identificador de até 64): um formato só.

## Pendências

- Lapso de comando: rodei um `git grep` (só leitura) para achar C-17 e C-20 na 04; não está na minha lista Pode e vai
  declarado em Comandos executados. Não alterou nada; o resto da leitura foi pelo Read.
- Minor para a T11: `rota()` deve chamar `lerCorpoJson` antes do Zod e `deZod` no `safeParse` falho; nas Server
  Actions o limite de 1 MB do Next continua valendo (RNF-04).

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit `a9fb9b8` (06-T02-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n -E "C-20|C-17" -- docs/construcao/DEC-DEM-20261022-0001-v1/04-seguranca-aplicacao.md` — fora da lista Pode (ver Pendências); só leitura
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código: 2 arquivos falharam (módulo `./erros` não encontrado), 88 de 88 dos demais
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 119 de 119, 0 falhas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os 4 arquivos da tarefa, novos

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno
