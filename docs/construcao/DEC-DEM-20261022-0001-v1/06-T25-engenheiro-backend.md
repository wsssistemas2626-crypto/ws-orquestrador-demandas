---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T25-construcao
agente: engenheiro-backend
leu: [pedido.json, padrao-tecnico.md, contrato-passagem.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, T13 C-27, T23, T24, T25, T27), package.json, tsconfig.json, vitest.config.ts, src/lib/erros.ts, src/modules/agentes/preco.ts, src/modules/agentes/preco.test.ts, test/sentinelas.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

T25: provedor de IA sem ferramentas e fábrica que só existe com a chave (ADR-08, C-24, CA-16.5, RNF-06, RNF-14, C-27).
Primeira tentativa desta etapa.

### Arquivos criados

Nenhum arquivo existente mudou.

- `src/modules/agentes/provedor.ts`. As interfaces do plano, sem mudança de assinatura:
  - os tipos `PedidoAoProvedor`, `RespostaDoProvedor` e `ProvedorIA`;
  - a classe `ErroProvedor(tipo, tokens?)`;
  - a classe `ProvedorAnthropic({ chave, fetch? })`;
  - a fábrica `criarProvedor(env)`;
  - a constante `MAX_TOKENS_TETO = 8000`.

  Há também dois acréscimos, `TEMPO_LIMITE_MS = 120_000` e o tipo `TipoErroProvedor`.
- `src/modules/agentes/provedor.test.ts`: 33 testes, todos sem rede (o `fetch` é falso) e sem chave real.
- `test/provedor-falso.ts`: `ProvedorFalso`, com `respostas` (fila de respostas ou de `Error`) e `chamadas`. Sem
  resposta na fila, ele falha com um erro claro.

### Como o provedor funciona

- **Cliente.** O cliente é `new Anthropic({ apiKey, authToken: null, baseURL: 'https://api.anthropic.com', timeout: 120_000, maxRetries: 0, logLevel: 'off', fetch? })`.
- **Chamada.** A chamada é `messages.create({ model, max_tokens, system, messages: [{ role: 'user', content }] }, { signal })`.
  - O corpo é montado só com essas quatro chaves. Uma chave extra no pedido, como `tools`, não é copiada.
  - A resposta junta os blocos `text` e ignora os demais. O modelo e os tokens vêm da própria resposta.
- **`maxTokens`.** Precisa ser inteiro de 1 a 8.000. Fora disso, o provedor lança `RangeError` antes de chamar.
- **Erros.** Todo erro do SDK vira `ErroProvedor`:
  - 401 e 403 viram `autenticacao`.
  - O resto vira `transitorio`: 429, 5xx, 529, 400, 404, falha de rede, tempo limite e o sinal de quem chama.
  - A mensagem é fixa, em pt-BR. Ela não leva o corpo nem a mensagem do provedor, e o erro não guarda `cause`.
- **Fábrica.** `criarProvedor` recebe o ambiente de quem chama e não lê `process.env`. Chave ausente, vazia ou só com
  espaços dá `null`.
- **C-27.** O nome `ANTHROPIC_API_KEY` aparece só em `provedor.ts`, que a lista do teste estático de variáveis
  permite. Em `test/provedor-falso.ts` ele não aparece.

### Testes criados (33)

| Grupo | Testes |
|---|---|
| Corpo (C-24) | só as quatro chaves, sem `tools`, `tool_choice` nem `mcp_servers`; `max_tokens` ≤ 8.000; uma chave extra no pedido não chega ao corpo |
| Resposta | junta os blocos `text` e ignora o bloco `thinking`; sem bloco de texto, devolve `''` com os tokens |
| Endereço e credencial | vai sempre a `https://api.anthropic.com/v1/messages`, com `x-api-key`, mesmo com `ANTHROPIC_BASE_URL` e `ANTHROPIC_AUTH_TOKEN` definidos (`vi.stubEnv`); não manda `authorization` |
| Log (C-21) | com `ANTHROPIC_LOG=debug`, o SDK não escreve no console |
| `maxTokens` | recusado antes da chamada para 8.001, 0, −1, 1,5 e infinito; 8.000 é aceito |
| Erros | 401 e 403 viram `autenticacao`; 429, 500, 503, 529, 400 e 404 viram `transitorio`, sempre com uma chamada só (`maxRetries` 0); falha de rede vira `transitorio`; o erro não carrega sentinela, corpo nem chave, e não tem `cause` |
| Tempo limite (RNF-06) | com relógio falso do Vitest, a chamada segue pendente aos 119 s e vira `transitorio` aos 120 s, sem nova tentativa; o abort de quem chama vira `transitorio` |
| Fábrica (CA-16.5) | sem chave, com chave `''` ou `'   '`, devolve `null`; com chave, um `ProvedorAnthropic`; a suíte roda sem `ANTHROPIC_API_KEY` |
| `ProvedorFalso` | responde em ordem, lança o erro da fila e registra as chamadas; com a fila vazia, falha |

### TDD: o teste escrito antes, e falhando

A primeira rodada foi com o teste escrito e sem o código:

```
pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test
 FAIL  src/modules/agentes/provedor.test.ts [ src/modules/agentes/provedor.test.ts ]
Error: Cannot find module '../../../test/provedor-falso' imported from .../src/modules/agentes/provedor.test.ts
 Test Files  1 failed | 116 passed (117)
      Tests  2262 passed (2262)
```

O teste de `ANTHROPIC_LOG` entrou depois dessa rodada. Para mostrar que cada endurecimento tem teste que falha sem ele,
tirei de `provedor.ts`, só por uma rodada, as opções `authToken`, `baseURL`, `maxRetries` e `logLevel`. Depois
restaurei as quatro. Com elas fora, 7 testes falharam:

```
 FAIL  ... > C-21: com ANTHROPIC_LOG=debug no ambiente, o SDK não escreve nada no console ...
AssertionError: expected "debug" to not be called at all, but actually been called 3 times
  1st debug call: "[log_…] sending request" { ... "body": { ... "content": "<dados>SENTINELA-TEXTO-7f3a</dados>" ... } }
 FAIL  ... > 429|500|503|529 do provedor vira ErroProvedor transitorio, sem nova tentativa do SDK (maxRetries 0)
AssertionError: expected [ …(3) ] to have a length of 1 but got 3
 FAIL  ... > RNF-06: sem resposta, a chamada é encerrada aos 120 s como transitorio, e não antes
 Test Files  1 failed | 116 passed (117)
      Tests  7 failed | 2288 passed (2295)
```

O sétimo é o teste do endereço fixo. O trecho dele ficou fora do que a saída mostrou.

A rodada também prova o risco: sem `logLevel: 'off'`, o log de depuração do SDK, ligado só pela variável de ambiente,
escreve o corpo com o texto da demanda.

### Resultado final

- `pnpm test`: 117 de 117 arquivos e 2.295 de 2.295 testes passaram, 0 falharam. Eram 2.262 antes, mais os 33 novos.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Desvios do plano

1. **Endereço, credencial e log do SDK fixos** (`baseURL`, `authToken: null`, `logLevel: 'off'`). O plano não os pede.
   Sem eles, o SDK lê três variáveis do ambiente:
   - `ANTHROPIC_BASE_URL`, que mandaria a chave e o texto para outro host;
   - `ANTHROPIC_AUTH_TOKEN`, uma segunda credencial;
   - `ANTHROPIC_LOG`, que poria o corpo no console.

   Os três ficam contra C-21, C-24 e C-27.
2. **403 vira `autenticacao`, e 400 e 404 viram `transitorio`.** O plano só fixa o 401 (`autenticacao`) e o 429 e o 5xx
   (`transitorio`).
   - O 403 é permissão da conta: tentar de novo não resolve.
   - O 400 e o 404 vêm de configuração, como um modelo inexistente. Fazem até 3 tentativas pela T27, sem custo de
     token, e terminam em `falha_agente`.
   - Assim todo erro sai como `ErroProvedor`, e a T27 trata um conjunto fechado.
3. **`maxTokens` menor que 1 ou fracionário também é recusado**, não só acima de 8.000. É o mesmo `RangeError`, antes
   de chamar.
4. **Dois acréscimos exportados:** `TEMPO_LIMITE_MS` e `TipoErroProvedor`. São aditivos e não mudam nenhuma interface
   do plano.

## Decisões tomadas

- **Sem retry no SDK (`maxRetries: 0`).** A nova tentativa é da T27, com as esperas de P1-e. Retry do SDK somaria
  chamadas pagas fora do controle do teto.
- **Mensagem fixa no `ErroProvedor`, sem `cause`.** O corpo de erro do provedor pode ecoar o texto enviado, e o erro
  pode ir ao Sentry pela T27.
- **A cópia do corpo usa só as quatro chaves.** A garantia de C-24 não depende do tipo, que um `as` contornaria.
- **Resposta sem bloco de texto vira `texto: ''`, não erro.** Os tokens chegam à T27, que registra o uso como
  `fora_do_schema` (CA-17.2).
- **A fábrica recebe o ambiente por parâmetro.** O teste chama sem chave, e só o worker passa `process.env`.

## Pendências

- **Para a T27: `ErroProvedor.tokens` fica sempre vazio no `ProvedorAnthropic`.** O erro do SDK não traz `usage`.
  Na falha, o uso é registrado com 0 tokens, e o custo é 0.
- **Para a T27: `RangeError` de `maxTokens` não é `ErroProvedor`.** É erro de programação, e a T26 garante
  `maxTokens` ≤ 8.000 por teste. A T27 deve tratá-lo como falha, sem nova tentativa.
- **Para a T27: a trava de 150 s é maior que o tempo limite de 120 s.** As duas combinam como está no plano
  (ADR-07).
- **Para a 04 e a `08-revisao`, só registro:** o log de depuração do SDK expõe o corpo da chamada. O
  `logLevel: 'off'` e o teste com `ANTHROPIC_LOG=debug` fecham isso aqui. Vale lembrar no `deploy.md` (10) que essa
  variável não tem efeito.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — antes do código: 1 arquivo falhou (`Cannot find module '../../../test/provedor-falso'`), 2.262 de 2.262 testes dos outros arquivos passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 2.295 de 2.295
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — sem `authToken`, `baseURL`, `maxRetries` e `logLevel`, só nesta rodada: 7 falharam e 2.288 passaram
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — com as opções restauradas: 2.295 de 2.295
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — só os 3 arquivos novos da tarefa

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] toda entrada de rota, Server Action e job é validada com Zod, e o erro devolvido não vaza detalhe interno (a tarefa não cria rota, Server Action nem job; o `ErroProvedor` sai com mensagem fixa)
