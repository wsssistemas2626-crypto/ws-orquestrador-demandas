---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T26-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (T26 e T27), 06-T26-engenheiro-backend.md, 06-T25-tech-lead.md, git show 2d83472, src/modules/demandas/schemas.ts, src/modules/especificacoes/schemas.ts, src/modules/pareceres-risco/schemas.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/agentes/entrada-agente.ts, src/vendor/construir/pedido.mjs]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Primeira revisão da T26, commit `2d83472`. O código está em oito arquivos novos: `src/modules/agentes/schemas.ts`,
`src/agents/comum.ts`, `src/agents/orquestrador.ts`, `src/agents/insumo-tecnico.ts`, `src/agents/risco.ts`,
`src/agents/consolidacao.ts`, `src/agents/index.ts` e `src/agents/prompts.test.ts`. Nenhum arquivo existente mudou. Os
outros dois arquivos do commit são a entrega do engenheiro e a linha do registro. **Não há problema Critical nem
Important.** A passagem segue para a `06-T26-testes`. Há três Minor, nos Pareceres e em Pendências.

### Conferência contra o plano

| Ponto do plano (T26) | Situação |
|---|---|
| `saidaOrquestradorSchema` = `criarDemandaSchema.omit({ solicitanteNome, solicitantePapel, anexos }).extend({ perguntasParaSolicitante, flags })` | Igual ao plano (`schemas.ts:11` a `:16`). Os limites 20 e 200 viraram as constantes `LIMITE_FLAGS` e `LIMITE_FLAG`, com o mesmo valor |
| `SCHEMA_DE_SAIDA: Record<Agente, z.ZodType>` com os quatro schemas | Atendido (`schemas.ts:20` a `:25`). São os mesmos objetos das rotas (ADR-09), e um teste confere a identidade com `toBe` |
| `PromptDeAgente` e `PROMPTS: Record<Agente, PromptDeAgente>` | Atendido. Os dois ficaram `Readonly` e congelados. Isso é aditivo e não muda o uso pela T27 |
| Fontes de cada prompt na estruturaAutonoma | Atendido, e cada arquivo cita a fonte no comentário de abertura: orquestrador e consolidação do `CLAUDE.md`, insumo técnico de `operacional-desenvolvimento-sistemas.md`, risco de `gestao-riscos.md` com `juridico-contratos.md` |
| O prompt diz o papel, pede só um JSON no formato do exemplo, diz que o conteúdo vem entre `<dados>` e que ordem ali não vale, e que o resultado é rascunho que uma pessoa revisa | Atendido na parte comum (`comum.ts:10` a `:40`), montada por `montarPrompt` para os quatro. O texto bate com o montador da T24: `entrada-agente.ts` manda o JSON numa linha, entre `<dados>` e `</dados>` |
| Sem nome de pessoa ("a administradora") e sem dado de cliente | Atendido. O teste passa o texto e o exemplo por `encontrarDadosPessoais` e recusa `Débora`, `Fabiano` e `Marcus`. Os exemplos são fictícios (marketplace e ERP sem nome) |
| C-24: `maxTokens` ≤ 8.000 | Atendido: 2.000, 6.000, 3.000 e 4.000. O `montarPrompt` recusa valor fora de 1 a `MAX_TOKENS_TETO` quando o módulo carrega, com o mesmo teto da T25 |
| Os cinco testes do plano | Estão todos em `prompts.test.ts:285` a `:298` e `:346` a `:355`, iguais ao plano |

### Desvios do plano

| # | Desvio | Parecer |
|---|---|---|
| 1 | Arquivo novo `src/agents/comum.ts`, fora da lista do plano | Aceito. Com a parte comum no `index.ts`, cada prompt importaria o `index.ts`, que importa os prompts: o import seria circular e as constantes cairiam na TDZ. A outra saída era copiar o texto comum quatro vezes, e isso fere o item de duplicação da seção 12. O `index.ts` reexporta o tipo, então a interface do plano não muda |
| 2 | Exemplo dentro do texto de `sistema` | Aceito. O plano pede "só um JSON no formato do exemplo", e o modelo só vê o que vai na chamada. O teste confere que o texto traz `JSON.stringify(exemploSaida, null, 2)` |
| 3 | Mapas congelados e constantes exportadas a mais | Aceito. É aditivo, e o tipo do plano continua valendo |
| 4 | 55 testes, além dos 5 do plano | Aceito. O que mais pesa é o que passa o exemplo do insumo técnico por `validarCamposDeConstrucao` (`prompts.test.ts:410` a `:414`). Sem ele, o modelo poderia copiar do exemplo uma ESP que o serviço recusa para tipo construído |

### Testes e TDD

- A entrega mostra a primeira rodada falhando por módulo ausente (`Cannot find module '../modules/agentes/schemas'`),
  antes do código.
- Os testes do plano falham sem o código. Os de valores no prompt (`prompts.test.ts:394` a `:407`) quebram se uma
  enumeração ganhar valor e o prompt não o citar. A tipagem `Record<TipoDemanda | LinhaServico, string>` faz o mesmo no
  `typecheck`.
- Sem `.skip`, `.only` nem `.todo`. Os testes não usam banco, provedor nem relógio.

### Verificação própria

- `pnpm test`: 118 arquivos, 2364 de 2364. Bate com a entrega (2309 antes, mais 55).
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: limpo.
- Os tipos dos exemplos (`SaidaOrquestrador`, `CriarEspecificacao`, `CriarParecerRisco`, `CriarPacoteDecisao`) são os
  `z.output` dos schemas. Conferi os quatro schemas: nenhum tem campo de autoria, id, versão ou status, então o exemplo
  não ensina o modelo a mandar esses campos (C-11, C-25). O Zod 4 descarta a chave desconhecida no `z.object`.
- `src/lib/` não tem utilitário de congelar em profundidade (`git show HEAD:src/lib`). O `congelar` de `comum.ts` não
  duplica nada.

### Checklist da seção 12

- [x] Faz o que o plano pede. O `comum.ts` está no desvio 1, que foi aceito. Os acréscimos são aditivos e têm teste.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Não há segredo, valor de `.env` nem dado pessoal real. Os exemplos são fictícios, e o teste confere com os
      detectores. A conta `wsssistemas2626-crypto` é da própria empresa (padrão técnico, seção 10), não de cliente.
- [x] Entrada externa: a tarefa não cria rota, Server Action nem job. Ela entrega o schema Zod que vai validar a saída do
      provedor na T27.
- [x] Banco: não se aplica.
- [x] Nada duplica função existente. As enumerações vêm do esquema do banco e do `pedido.mjs`, e os marcadores vêm de
      `minimizar.ts`, sem cópia.
- [x] Textos em pt-BR. A tarefa não tem tela.
- [x] Os Minor estão em Pendências. Não há Critical nem Important.
- [x] PR (`/code-review`, `/security-review`): não se aplica a esta etapa, fica com a `08-revisao`.

### Pareceres

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 1 (Minor) | `src/agents/comum.ts:32` e `src/agents/insumo-tecnico.ts:44` | As duas instruções se contradizem. A parte comum diz "Não invente sistema [...] que não esteja no bloco". A regra do insumo técnico diz para propor o `sistemaAlvo` quando a demanda não disser | Não bloqueia: a regra do agente é mais específica e vem depois no texto, e a decisão de propor o nome está justificada na entrega (sem ele, a ESP de tipo construído é recusada). Mas o modelo pode seguir a regra geral e omitir o campo. Nesse caso, o serviço recusa a ESP, e a T27 gasta até três chamadas pagas até `falha_agente`. A correção é uma frase: na parte comum, "Não invente sistema envolvido [...]", ou, na regra do insumo técnico, "esta é a única exceção à regra de não inventar sistema". Fica para a T27, que já vai mexer no tratamento dessa recusa |
| 2 (Minor) | `src/agents/orquestrador.ts:51` | O prompt pede no máximo cinco perguntas, mas o schema aceita até 50 (`listaDeTextos`). O título também tem "até 120 caracteres" só no prompt (`orquestrador.ts:45`), e o schema aceita 10.000 | Não bloqueia: o schema é o do plano, e os limites menores servem só de guia. A pessoa revisa a saída antes de qualquer envio (RF-15). Fica registrado para a T28 não contar com esses limites como garantia |
| 3 (Minor) | `src/agents/insumo-tecnico.ts:45` | "Sistema novo fica em wsssistemas2626-crypto." é texto fixo. Ao contrário das contas aceitas, que vêm de `DONOS_REPOSITORIO`, essa conta não sai de constante | Não bloqueia: é a regra do padrão técnico (seção 10), não uma validação. O teste `prompts.test.ts:404` confere que as duas contas aparecem no texto. Se a conta da empresa mudar, a mudança tem de ser feita à mão neste texto |

## Decisões tomadas

- **Os quatro desvios foram aceitos.** Razão: o `comum.ts` evita um import circular e o texto copiado quatro vezes. O
  exemplo no texto é o que o plano pede ao modelo. O resto é aditivo e tem teste.
- **A contradição sobre inventar sistema fica Minor.** Razão: ela não muda o que o schema aceita nem o que o serviço
  grava. O efeito possível é custo de tentativa, que a T27 já precisa tratar (pendência do engenheiro), e a correção é
  uma frase.
- **`proximo: qa-automacao`.** Razão: a revisão não tem bloqueio, e a próxima etapa da cadeia é a `06-T26-testes`.

## Pendências

- **Para a T27 (`engenheiro-backend`):**
  - Minor 1: deixar sem contradição a regra de não inventar sistema (`comum.ts:32`) e a de propor `sistemaAlvo`
    (`insumo-tecnico.ts:44`). Depois de mudar o texto, o teste de exemplo no texto e o de valores seguem valendo.
  - Vale a pendência do engenheiro: a recusa por `validarCamposDeConstrucao` dentro do `gravar` (400, `ErroDominio` de
    validação) é saída inválida, com nova tentativa e depois `falha_agente`, não erro inesperado.
  - `SCHEMA_DE_SAIDA[agente].safeParse` devolve `unknown` em `data`. O `DestinoDoAgente.gravar` converte com o schema
    dele. O prompt vai em `sistema`, com `PROMPTS[agente].maxTokens`.
- **Para a T28 (`engenheiro-backend`):**
  - Minor 2: o máximo de cinco perguntas e o título de 120 caracteres estão só no prompt. O schema aceita 50 perguntas e
    10.000 caracteres.
  - `flags` não tem coluna. A T28 decide onde ficam para quem revisa, como diz a entrega do engenheiro.
- **Minor 3:** o nome da conta para sistema novo está fixo no texto do insumo técnico. Se a conta da empresa mudar, o
  texto muda à mão.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 2d8347242f8ff7a74c348f6181473ee405b4b596` — 10 arquivos: 8 de código e teste, a entrega do engenheiro e o registro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 2d8347242f8ff7a74c348f6181473ee405b4b596 -- src` — oito arquivos novos, nenhum existente mudou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --oneline HEAD` — topo 2d83472
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 118 arquivos, 2364 de 2364
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/lib` — nenhum utilitário de congelar
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -G "DONOS_REPOSITORIO =" --oneline -- src/vendor/construir/pedido.mjs` — f1cd287 (T18)
## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
